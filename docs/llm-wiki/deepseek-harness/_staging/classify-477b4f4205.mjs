#!/usr/bin/env node
// Classify wiki nodes against base..target DSH diff.
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROOT = path.resolve(WIKI, "../../..")
const SRC = path.join(ROOT, "deepseek-harness")
const BASE = "c291e7961a515f6d7af9304e7fd1d257929aef26"
const TARGET = "477b4f420553e8a52c2fbccc464d7561b239c443"
const HEAVY = 2000

function git(args, cwd = SRC) {
  return execFileSync("git", ["-c", "diff.renameLimit=10000", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })
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

function pkgJsons(rev) {
  const out = git(["ls-tree", "-r", "--name-only", rev, "--", "packages"])
  return out.split("\n").filter((p) => p.endsWith("/package.json")).sort()
}
const oldPkgs = pkgJsons(BASE)
const nowPkgs = pkgJsons(TARGET)
const oldSet = new Set(oldPkgs)
const nowSet = new Set(nowPkgs)
const addedPkgs = nowPkgs.filter((p) => !oldSet.has(p))
const deletedPkgs = oldPkgs.filter((p) => !nowSet.has(p))

const out = {
  base: BASE,
  target: TARGET,
  target_short: "477b4f4205",
  grades,
  package_inventory: {
    old: oldPkgs.length,
    now: nowPkgs.length,
    added: addedPkgs,
    deleted: deletedPkgs,
  },
  renamed_src: renamed.filter((r) =>
    r.from.startsWith("packages/") || r.from.startsWith("apps/") || r.from.startsWith("vendor/") || r.from.startsWith("python/") || r.from.startsWith("native/")
  ),
  added_count: added.length,
  deleted_count: deleted.length,
  deleted_src: deleted.filter((p) =>
    p.startsWith("packages/") || p.startsWith("apps/") || p.startsWith("vendor/") || p.startsWith("python/") || p.startsWith("native/")
  ),
  nodes: results,
}

fs.writeFileSync(path.join(WIKI, "_staging/impact-477b4f4205.json"), JSON.stringify(out, null, 2))
console.log(JSON.stringify({ grades, pkgs: { old: oldPkgs.length, now: nowPkgs.length, added: addedPkgs.length, deleted: deletedPkgs.length } }, null, 2))
console.log("A-BROKEN:")
for (const n of results.filter((x) => x.grade === "A-BROKEN")) {
  console.log(" ", n.id, "missing:", n.missing.join(", "))
}
console.log("B-HEAVY", grades["B-HEAVY"], "C-DRIFT", grades["C-DRIFT"], "D-CLEAN", grades["D-CLEAN"])
console.log("ADDED PKGS:")
for (const p of addedPkgs) console.log(" +", p)
console.log("DELETED PKGS:")
for (const p of deletedPkgs) console.log(" -", p)
console.log("DELETED SRC (packages/apps/vendor/python/native):", out.deleted_src.length)
for (const d of out.deleted_src.slice(0, 80)) console.log("  D", d)
