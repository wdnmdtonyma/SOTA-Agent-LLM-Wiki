#!/usr/bin/env node
// Classify wiki nodes against base..target Pi diff.
// Deleted sources are A-BROKEN even if they appear as D in the diff.
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROOT = path.resolve(WIKI, "../../..")
const SRC = path.join(ROOT, "pi")
const BASE = "ff72faba28d10c86611863d0aaa5d3122f2d8cb0"
const TARGET = "6f7551516b84278eb9da1c340c8e7bc66be1a6ba"
const HEAVY = 2000

function git(args, cwd = SRC) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
}

const index = JSON.parse(fs.readFileSync(path.join(WIKI, "index.json"), "utf8"))
const nodes = index.nodes

const nameStatus = git(["diff", "--name-status", "--find-renames", BASE, TARGET])
const added = []
const deleted = []
const renamed = []
const modified = new Set()
const pathMap = new Map()

for (const line of nameStatus.split("\n")) {
  if (!line) continue
  const parts = line.split("\t")
  const status = parts[0]
  if (status.startsWith("A")) {
    added.push(parts[1])
    modified.add(parts[1])
  } else if (status.startsWith("D")) {
    deleted.push(parts[1])
    // Do NOT add deleted paths to `modified`. A deleted source is missing at
    // target; counting it as a hit would hide A-BROKEN as C-DRIFT.
  } else if (status.startsWith("R")) {
    renamed.push({ from: parts[1], to: parts[2], score: status })
    modified.add(parts[2])
    pathMap.set(parts[1], parts[2])
  } else if (status.startsWith("M") || status.startsWith("C") || status.startsWith("T")) {
    modified.add(parts[1])
  }
}

const numstat = git(["diff", "--numstat", BASE, TARGET])
const churnByPath = new Map()
for (const line of numstat.split("\n")) {
  if (!line) continue
  const [a, d, p] = line.split("\t")
  if (!p) continue
  const add = a === "-" ? 0 : Number(a)
  const del = d === "-" ? 0 : Number(d)
  churnByPath.set(p, { add, del, churn: add + del })
}

function existsAtTarget(p) {
  try {
    git(["cat-file", "-e", `${TARGET}:${p}`])
    return true
  } catch {
    return false
  }
}

function isDirAtTarget(p) {
  try {
    const t = git(["cat-file", "-t", `${TARGET}:${p}`]).trim()
    return t === "tree"
  } catch {
    return false
  }
}

function dirHits(dir) {
  const prefix = dir.endsWith("/") ? dir : dir + "/"
  const hits = []
  for (const p of modified) {
    if (p === dir || p.startsWith(prefix) || p + "/" === prefix) hits.push(p)
  }
  return hits
}

const results = []
const grades = { "A-BROKEN": 0, "B-HEAVY": 0, "C-DRIFT": 0, "D-CLEAN": 0 }

for (const n of nodes) {
  const sources = Array.isArray(n.source) ? n.source : n.source ? [n.source] : []
  const missing = []
  const hitSources = []
  let add = 0
  let del = 0
  const allHits = new Set()

  for (const s of sources) {
    const mapped = pathMap.get(s) || s
    const atTarget = existsAtTarget(mapped)
    const dir = isDirAtTarget(mapped)
    if (!atTarget && !dir) {
      missing.push(s)
      continue
    }
    const hits = dir ? dirHits(mapped) : []
    const fileHit = modified.has(mapped)
    if (fileHit) hits.push(mapped)
    if (hits.length) {
      hitSources.push(s)
      for (const h of hits) allHits.add(h)
    }
  }

  for (const h of allHits) {
    const c = churnByPath.get(h)
    if (c) {
      add += c.add
      del += c.del
    }
  }
  const churn = add + del
  let grade
  if (missing.length) grade = "A-BROKEN"
  else if (churn >= HEAVY) grade = "B-HEAVY"
  else if (hitSources.length) grade = "C-DRIFT"
  else grade = "D-CLEAN"
  grades[grade]++
  results.push({
    id: n.id,
    path: n.path,
    kind: n.kind,
    tier: n.tier,
    grade,
    churn,
    add,
    del,
    n_hits: hitSources.length,
    missing,
    hit_sources: hitSources,
    files: [...allHits].sort(),
  })
}

const out = {
  base: BASE,
  target: TARGET,
  target_short: "6f7551516b",
  grades,
  renamed,
  added_count: added.length,
  deleted_count: deleted.length,
  added: added,
  deleted: deleted,
  nodes: results,
}

fs.writeFileSync(path.join(WIKI, "_staging/impact-6f7551516b.json"), JSON.stringify(out, null, 2))
console.log(JSON.stringify(grades, null, 2))
console.log("A-BROKEN:")
for (const n of results.filter((x) => x.grade === "A-BROKEN")) {
  console.log(" ", n.id, "missing:", n.missing.join(", "))
}
console.log("B-HEAVY:")
for (const n of results.filter((x) => x.grade === "B-HEAVY").sort((a, b) => b.churn - a.churn)) {
  console.log(" ", n.id, "churn", n.churn, "hits", n.n_hits)
}
console.log("C-DRIFT by churn:")
for (const n of results.filter((x) => x.grade === "C-DRIFT").sort((a, b) => b.churn - a.churn)) {
  console.log(" ", n.id, "churn", n.churn, "hits", n.n_hits, "files", n.files.slice(0, 8).join("|"))
}
console.log("C-DRIFT", grades["C-DRIFT"], "D-CLEAN", grades["D-CLEAN"], "nodes", results.length)
console.log("renames:")
for (const r of renamed) console.log(" ", r.score, r.from, "->", r.to)
console.log("deleted:")
for (const d of deleted) console.log(" ", d)
console.log("added interesting (first 80):")
const interestingAdd = added.filter(
  (p) =>
    !p.startsWith("packages/agent/docs/") &&
    !p.startsWith("packages/durable/docs/") &&
    !p.includes("/test/") &&
    !p.endsWith(".md") &&
    !p.includes("CHANGELOG"),
)
for (const d of interestingAdd.slice(0, 80)) console.log(" ", d)
