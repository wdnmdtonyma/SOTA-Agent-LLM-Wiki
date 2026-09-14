#!/usr/bin/env node
// Classify wiki nodes against base..target Codex diff.
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROOT = path.resolve(WIKI, "../../..")
const SRC = path.join(ROOT, "codex")
const BASE = "02a8f038b87ad34d4a1dc5058eda26972ed7aa6c"
const TARGET = "3abbf9fe2c6b6910e9de61f6a0c5bb468f74b5c8"
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
const pathMap = new Map() // old -> new (identity if not renamed)

for (const line of nameStatus.split("\n")) {
  if (!line) continue
  const parts = line.split("\t")
  const status = parts[0]
  if (status.startsWith("A")) {
    added.push(parts[1])
    modified.add(parts[1])
  } else if (status.startsWith("D")) {
    deleted.push(parts[1])
    modified.add(parts[1])
  } else if (status.startsWith("R")) {
    renamed.push({ from: parts[1], to: parts[2], score: status })
    modified.add(parts[1])
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
    const atTarget = existsAtTarget(mapped) || existsAtTarget(s)
    const dir = isDirAtTarget(mapped) || isDirAtTarget(s)
    if (!atTarget && !dir) {
      // directory-style source: if any children exist, treat as dir
      const childHits = dirHits(s)
      if (childHits.length === 0 && !existsAtTarget(s)) {
        missing.push(s)
        continue
      }
    }
    const hits = dir ? dirHits(mapped).concat(dirHits(s)) : []
    const fileHit = modified.has(s) || modified.has(mapped)
    if (fileHit) hits.push(mapped === s ? s : mapped)
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
  })
}

const out = {
  base: BASE,
  target: TARGET,
  target_short: "3abbf9fe2c",
  grades,
  renamed,
  added_count: added.length,
  deleted_count: deleted.length,
  added_src_sample: added.filter((p) => !p.startsWith(".github/") && !p.includes("/schema/")).slice(0, 80),
  deleted_src: deleted,
  added_all: added,
  nodes: results,
}

fs.writeFileSync(path.join(WIKI, "_staging/impact-3abbf9fe2c.json"), JSON.stringify(out, null, 2))
console.log(JSON.stringify(grades, null, 2))
console.log("A-BROKEN:")
for (const n of results.filter((x) => x.grade === "A-BROKEN")) {
  console.log(" ", n.id, "missing:", n.missing.join(", "))
}
console.log("B-HEAVY:")
for (const n of results.filter((x) => x.grade === "B-HEAVY")) {
  console.log(" ", n.id, "churn", n.churn, "hits", n.n_hits)
}
console.log("C-DRIFT", grades["C-DRIFT"], "D-CLEAN", grades["D-CLEAN"])
console.log("renames:")
for (const r of renamed) console.log(" ", r.score, r.from, "->", r.to)
console.log("deleted:")
for (const d of deleted) console.log(" ", d)
