#!/usr/bin/env node
// Rebase existing [E: path:line] anchors between two pi commits.
// Usage: node tools/rebase-evidence.mjs <base-pi-sha> <target-pi-sha> [wiki-git-ref] [--write]
//
// The current node body can contain newly written target-SHA evidence. To avoid
// remapping those anchors as if they belonged to the base, only citation
// occurrences that also existed in the node at wiki-git-ref are rewritten.
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROOT = path.resolve(WIKI, "../../..")
const SRC = path.join(ROOT, "pi")
const rawArgs = process.argv.slice(2)
const write = rawArgs.includes("--write")
const [base, target, wikiRef = "HEAD"] = rawArgs.filter((arg) => arg !== "--write")
if (!base || !target) {
  console.error("usage: node tools/rebase-evidence.mjs <base-pi-sha> <target-pi-sha> [wiki-git-ref] [--write]")
  process.exit(2)
}

const NODE_DIRS = ["spine", "surface", "subsystems", "reference"]
const CITE_RE = /\[E:\s*([^\]\s:]+)(?::(\d+))?\]/g
const sourceCache = new Map()
const mappingCache = new Map()
const stats = { files: 0, citations: 0, changed: 0, exact: 0, contextual: 0, fuzzy: 0, unresolved: 0 }
const lowConfidence = []

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (e.name.endsWith(".md")) out.push(full)
  }
  return out
}

function git(args, cwd = ROOT) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
}

function oldSourcePath(currentPath) {
  if (currentPath === "packages/ai/src/utils/uuid.ts") return "packages/agent/src/harness/session/uuid.ts"
  return currentPath.replace(/^packages\/server\//, "packages/orchestrator/")
}

function newSourcePath(oldPath) {
  if (oldPath === "packages/agent/src/harness/session/uuid.ts") return "packages/ai/src/utils/uuid.ts"
  return oldPath.replace(/^packages\/orchestrator\//, "packages/server/")
}

function oldWikiPath(rel) {
  return rel.replace(/^subsystems\/server\//, "subsystems/orchestrator/")
}

function loadSource(oldPath) {
  if (sourceCache.has(oldPath)) return sourceCache.get(oldPath)
  const nextPath = newSourcePath(oldPath)
  let oldText
  let newText
  try {
    oldText = git(["show", `${base}:${oldPath}`], SRC)
    newText = git(["show", `${target}:${nextPath}`], SRC)
  } catch {
    const missing = { oldPath, nextPath, oldLines: null, newLines: null }
    sourceCache.set(oldPath, missing)
    return missing
  }
  const loaded = {
    oldPath,
    nextPath,
    oldLines: oldText.split("\n"),
    newLines: newText.split("\n"),
  }
  sourceCache.set(oldPath, loaded)
  return loaded
}

function norm(s) {
  return s.trim().replace(/\s+/g, " ").replace(/[;,]$/, "")
}

function usable(s) {
  const t = s.trim()
  return t !== "" && !/^(\/\/|\/\*|\*)/.test(t)
}

function tokens(s) {
  return new Set(norm(s).match(/[A-Za-z_$][\w$]*|[-+]?\d+(?:\.\d+)?|=>|===|!==/g) || [])
}

function similarity(a, b) {
  const aa = tokens(a)
  const bb = tokens(b)
  if (!aa.size || !bb.size) return 0
  let common = 0
  for (const t of aa) if (bb.has(t)) common++
  return (2 * common) / (aa.size + bb.size)
}

function contextScore(oldLines, newLines, oldIndex, newIndex) {
  let score = 0
  for (let d = -5; d <= 5; d++) {
    if (!d) continue
    const a = oldLines[oldIndex + d]
    const b = newLines[newIndex + d]
    if (a !== undefined && b !== undefined && norm(a) && norm(a) === norm(b)) score += 6 - Math.abs(d)
  }
  return score
}

function uniqueAnchor(lines, value) {
  if (norm(value).length < 8) return null
  const needle = norm(value)
  let found = -1
  for (let i = 0; i < lines.length; i++) {
    if (norm(lines[i]) !== needle) continue
    if (found !== -1) return null
    found = i
  }
  return found === -1 ? null : found
}

function nearestUsable(lines, estimate, oldLine) {
  let best = null
  const start = Math.max(0, estimate - 30)
  const end = Math.min(lines.length - 1, estimate + 30)
  for (let i = start; i <= end; i++) {
    if (!usable(lines[i])) continue
    const semantic = similarity(oldLine, lines[i])
    const positional = 1 - Math.min(1, Math.abs(i - estimate) / 31)
    const score = semantic * 0.8 + positional * 0.2
    if (!best || score > best.score) best = { index: i, score }
  }
  return best
}

function relocate(oldPath, oldLineNumber) {
  const key = `${oldPath}:${oldLineNumber ?? ""}`
  if (mappingCache.has(key)) return mappingCache.get(key)
  const src = loadSource(oldPath)
  if (!src.oldLines || !src.newLines) {
    const result = { path: src.nextPath, line: oldLineNumber, confidence: "unresolved" }
    mappingCache.set(key, result)
    return result
  }
  if (oldLineNumber === undefined) {
    const result = { path: src.nextPath, line: undefined, confidence: "exact" }
    mappingCache.set(key, result)
    return result
  }

  const oldIndex = oldLineNumber - 1
  const oldText = src.oldLines[oldIndex]
  if (oldText === undefined) {
    const result = { path: src.nextPath, line: oldLineNumber, confidence: "unresolved" }
    mappingCache.set(key, result)
    return result
  }

  const exactCandidates = []
  const needle = norm(oldText)
  for (let i = 0; i < src.newLines.length; i++) {
    if (needle && norm(src.newLines[i]) === needle) exactCandidates.push(i)
  }
  if (exactCandidates.length) {
    const ratioEstimate = Math.round((oldIndex / Math.max(1, src.oldLines.length - 1)) * (src.newLines.length - 1))
    exactCandidates.sort((a, b) => {
      const scoreDelta =
        contextScore(src.oldLines, src.newLines, oldIndex, b) -
        contextScore(src.oldLines, src.newLines, oldIndex, a)
      return scoreDelta || Math.abs(a - ratioEstimate) - Math.abs(b - ratioEstimate)
    })
    const result = { path: src.nextPath, line: exactCandidates[0] + 1, confidence: "exact" }
    mappingCache.set(key, result)
    return result
  }

  let before = null
  let after = null
  for (let d = 1; d <= 30 && (before === null || after === null); d++) {
    if (before === null && oldIndex - d >= 0) {
      const targetIndex = uniqueAnchor(src.newLines, src.oldLines[oldIndex - d])
      if (targetIndex !== null) before = { old: oldIndex - d, next: targetIndex }
    }
    if (after === null && oldIndex + d < src.oldLines.length) {
      const targetIndex = uniqueAnchor(src.newLines, src.oldLines[oldIndex + d])
      if (targetIndex !== null) after = { old: oldIndex + d, next: targetIndex }
    }
  }

  let estimate
  if (before && after && before.next <= after.next) {
    const fraction = (oldIndex - before.old) / (after.old - before.old)
    estimate = Math.round(before.next + fraction * (after.next - before.next))
  } else if (before) {
    estimate = before.next + (oldIndex - before.old)
  } else if (after) {
    estimate = after.next - (after.old - oldIndex)
  } else {
    estimate = Math.round((oldIndex / Math.max(1, src.oldLines.length - 1)) * (src.newLines.length - 1))
  }
  estimate = Math.max(0, Math.min(src.newLines.length - 1, estimate))
  const best = nearestUsable(src.newLines, estimate, oldText)
  if (!best) {
    const result = { path: src.nextPath, line: oldLineNumber, confidence: "unresolved" }
    mappingCache.set(key, result)
    return result
  }
  const confidence = before || after ? "contextual" : "fuzzy"
  const result = { path: src.nextPath, line: best.index + 1, confidence, score: best.score }
  mappingCache.set(key, result)
  return result
}

function citationCounts(text) {
  const counts = new Map()
  for (const match of text.matchAll(CITE_RE)) {
    const oldPath = oldSourcePath(match[1])
    const key = `${oldPath}:${match[2] || ""}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

const nodeFiles = NODE_DIRS.flatMap((dir) => walk(path.join(WIKI, dir)))
for (const file of nodeFiles) {
  const rel = path.relative(WIKI, file).split(path.sep).join("/")
  if (rel === "reference/model-catalog.md") continue
  let baselineText
  try {
    baselineText = git(["show", `${wikiRef}:docs/llm-wiki/pi/${oldWikiPath(rel)}`])
  } catch {
    continue // New node: every anchor was written against the target.
  }
  const remaining = citationCounts(baselineText)
  const current = fs.readFileSync(file, "utf8")
  let fileChanged = 0
  const rewritten = current.replace(CITE_RE, (whole, currentPath, lineText) => {
    stats.citations++
    const oldPath = oldSourcePath(currentPath)
    const key = `${oldPath}:${lineText || ""}`
    const left = remaining.get(key) || 0
    if (!left) return whole
    remaining.set(key, left - 1)
    const mapped = relocate(oldPath, lineText === undefined ? undefined : Number(lineText))
    stats[mapped.confidence]++
    if (mapped.confidence === "unresolved") {
      lowConfidence.push(`${rel}: ${whole} -> source unresolved`)
      return whole
    }
    if (mapped.confidence !== "exact") {
      lowConfidence.push(
        `${rel}: ${whole} -> [E: ${mapped.path}:${mapped.line}] (${mapped.confidence}${mapped.score === undefined ? "" : ` ${mapped.score.toFixed(2)}`})`,
      )
    }
    const replacement = `[E: ${mapped.path}${mapped.line === undefined ? "" : `:${mapped.line}`}]`
    if (replacement !== whole) {
      fileChanged++
      stats.changed++
    }
    return replacement
  })
  if (fileChanged) {
    if (write) fs.writeFileSync(file, rewritten)
    stats.files++
  }
}

console.log(JSON.stringify({ mode: write ? "write" : "dry-run", ...stats }, null, 2))
if (lowConfidence.length) {
  console.log(`LOW_CONFIDENCE ${lowConfidence.length}`)
  for (const item of lowConfidence) console.log(item)
}
if (!write) console.log("dry-run only: review LOW_CONFIDENCE candidates, then rerun with --write to apply")
