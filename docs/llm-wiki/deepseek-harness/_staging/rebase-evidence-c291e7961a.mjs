#!/usr/bin/env node
// After fillers: bump remaining updated SHAs and slide [E: path:line] off blank/comment/OOB lines.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.resolve(WIKI, "../../../deepseek-harness")
const SHA = "c291e7961a"
const NODE_DIRS = ["spine", "surface", "subsystems", "reference"]

function walk(dir) {
  const out = []
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (e.name.endsWith(".md")) out.push(full)
  }
  return out
}

function isBadLine(s) {
  const t = s.trim()
  if (t === "") return "blank"
  if (/^(\/\/|\/\*|\*)/.test(t)) return "comment"
  return null
}

function isParenOnly(s) {
  return /^[}\])({,;]+$/.test(s.trim())
}

const cache = new Map()
function srcLines(rel) {
  if (cache.has(rel)) return cache.get(rel)
  const abs = path.join(SRC, rel.replace(/[#].*$/, ""))
  let lines = null
  try {
    if (fs.statSync(abs).isFile()) lines = fs.readFileSync(abs, "utf8").split("\n")
  } catch {}
  cache.set(rel, lines)
  return lines
}

function nearestCode(lines, ln) {
  const n = lines.length
  if (ln < 1) ln = 1
  if (ln > n) ln = n
  const ok = (i) => {
    const s = lines[i - 1] || ""
    return !isBadLine(s) && !isParenOnly(s)
  }
  if (ok(ln)) return ln
  for (let d = 1; d <= 40; d++) {
    if (ln + d <= n && ok(ln + d)) return ln + d
    if (ln - d >= 1 && ok(ln - d)) return ln - d
  }
  for (let d = 1; d <= 80; d++) {
    if (ln + d <= n && !isBadLine(lines[ln + d - 1] || "")) return ln + d
    if (ln - d >= 1 && !isBadLine(lines[ln - d - 1] || "")) return ln - d
  }
  return ln
}

let bumped = 0
let retargeted = 0
let missingE = 0
const missingPaths = []

for (const dir of NODE_DIRS) {
  for (const file of walk(path.join(WIKI, dir))) {
    let text = fs.readFileSync(file, "utf8")
    const orig = text
    if (/^updated:\s+\S+/m.test(text) && !new RegExp(`^updated:\\s+${SHA}\\s*$`, "m").test(text.split("\n---")[0] || "")) {
      text = text.replace(/^updated:\s+\S+/m, `updated: ${SHA}`)
      if (text !== orig) bumped++
    }
    text = text.replace(/\[E:\s*([^\]\s:]+):(\d+)\]/g, (m, p, line) => {
      const lines = srcLines(p)
      if (!lines) {
        missingE++
        missingPaths.push(`${path.relative(WIKI, file)} :: ${p}`)
        return m
      }
      const ln = Number(line)
      if (ln > lines.length || isBadLine(lines[ln - 1] || "") || isParenOnly(lines[ln - 1] || "")) {
        const next = nearestCode(lines, Math.min(ln, lines.length))
        if (next !== ln) {
          retargeted++
          return `[E: ${p}:${next}]`
        }
      }
      return m
    })
    if (text !== orig) fs.writeFileSync(file, text)
  }
}

console.log(`sha-bumped files≈${bumped}  e-retargeted=${retargeted}  e-missing-path=${missingE}`)
for (const x of missingPaths.slice(0, 40)) console.log(" missing", x)
if (missingPaths.length > 40) console.log(` ... ${missingPaths.length - 40} more`)
