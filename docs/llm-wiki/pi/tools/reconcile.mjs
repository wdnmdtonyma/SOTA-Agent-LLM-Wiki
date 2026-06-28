#!/usr/bin/env node
// 登记/同步 —— pi 源码 LLM wiki。无外部依赖,跑:node tools/reconcile.mjs
// 1) 各 node .md 的 frontmatter(status/evidence/updated/symbols)同步回 index.json;新节点登记进 index.json。
// 2) _staging/uncertainty-*.md 合并生成 reference/uncertainty.md。
// 不改源文件;只 rewrite index.json(且仅当有变更)。一节点一行,保持稳定 diff。
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const NODE_DIRS = ["spine", "surface", "subsystems", "reference"]
const SYNC_KEYS = ["status", "evidence", "updated", "symbols"]
const NODE_KEY_ORDER = ["id", "title", "kind", "tier", "pkg", "path", "source", "symbols", "related", "evidence", "status", "updated"]

function stripQuotes(s) { return s.replace(/^["']/, "").replace(/["']$/, "") }
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null
  const end = text.indexOf("\n---", 3)
  if (end === -1) return null
  const lines = text.slice(text.indexOf("\n") + 1, end).split("\n")
  const obj = {}
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][\w]*):\s*(.*)$/)
    if (!m) continue
    let rest = m[2]
    if (rest === "" && i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
      const arr = []
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) arr.push(stripQuotes(lines[++i].replace(/^\s*-\s+/, "").trim()))
      obj[m[1]] = arr
    } else if (rest.startsWith("[")) {
      obj[m[1]] = rest.replace(/^\[/, "").replace(/\]$/, "").split(",").map((s) => stripQuotes(s.trim())).filter(Boolean)
    } else obj[m[1]] = stripQuotes(rest)
  }
  return obj
}
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
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b) }
function orderNode(n) {
  const o = {}
  for (const k of NODE_KEY_ORDER) if (n[k] !== undefined) o[k] = n[k]
  for (const k of Object.keys(n)) if (!(k in o)) o[k] = n[k]
  return o
}
function emit(idx) {
  const parts = []
  for (const k of Object.keys(idx)) {
    if (k === "nodes" || k === "groups") {
      const inner = idx[k].map((o) => "    " + JSON.stringify(k === "nodes" ? orderNode(o) : o)).join(",\n")
      parts.push(`  ${JSON.stringify(k)}: [\n${inner}\n  ]`)
    } else parts.push(`  ${JSON.stringify(k)}: ${JSON.stringify(idx[k])}`)
  }
  return "{\n" + parts.join(",\n") + "\n}\n"
}

const idx = JSON.parse(fs.readFileSync(path.join(WIKI, "index.json"), "utf8"))
const byId = new Map(idx.nodes.map((n) => [n.id, n]))
let updated = 0, added = 0
const issues = []

for (const dir of NODE_DIRS) {
  for (const file of walk(path.join(WIKI, dir))) {
    const rel = path.relative(WIKI, file).split(path.sep).join("/")
    const fm = parseFrontmatter(fs.readFileSync(file, "utf8"))
    if (!fm || !fm.id) { issues.push(`无 frontmatter/id: ${rel}`); continue }
    if (fm.path && fm.path !== rel) issues.push(`frontmatter path "${fm.path}" ≠ 实际 ${rel}`)
    const existing = byId.get(fm.id)
    if (existing) {
      let changed = false
      for (const k of SYNC_KEYS) if (fm[k] !== undefined && !eq(existing[k], fm[k])) { existing[k] = fm[k]; changed = true }
      if (changed) updated++
    } else {
      const n = { id: fm.id, title: fm.title || fm.id, kind: fm.kind, tier: fm.tier, pkg: fm.pkg, path: rel,
        source: fm.source || [], symbols: fm.symbols || [], related: fm.related || [],
        evidence: fm.evidence, status: fm.status || "draft", updated: fm.updated }
      idx.nodes.push(n); byId.set(n.id, n); added++
    }
  }
}

// _staging/uncertainty-*.md → reference/uncertainty.md(带 frontmatter,作为 ref.uncertainty 节点)
const stagingDir = path.join(WIKI, "_staging")
const stage = fs.existsSync(stagingDir) ? fs.readdirSync(stagingDir).filter((f) => /^uncertainty-.*\.md$/.test(f)).sort() : []
let uncertaintyWritten = false
if (stage.length) {
  let sha = ""
  try { sha = execSync(`git -C "${path.resolve(WIKI, "../../../pi")}" rev-parse --short HEAD`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() } catch {}
  const fmLines = [
    "---", "id: ref.uncertainty", "title: 不确定项日志([U] 汇总)", "kind: reference", "tier: T3", "pkg: cross",
    "source: []", "symbols: []", "related: []", "evidence: unknown", "status: verified",
    ...(sha ? [`updated: ${sha}`] : []), "---",
  ]
  let out = fmLines.join("\n") + "\n\n# 不确定项日志([U] 汇总)\n\n> 本文件由 tools/reconcile.mjs 从 _staging/uncertainty-*.md 自动合并生成,请勿手改。\n\n"
  for (const f of stage) out += `## ${f.replace(/^uncertainty-/, "").replace(/\.md$/, "")}\n\n${fs.readFileSync(path.join(stagingDir, f), "utf8").trim()}\n\n`
  const dest = path.join(WIKI, "reference", "uncertainty.md")
  if (!fs.existsSync(dest) || fs.readFileSync(dest, "utf8") !== out) { fs.writeFileSync(dest, out); uncertaintyWritten = true }
}

if (updated || added) fs.writeFileSync(path.join(WIKI, "index.json"), emit(idx))

for (const i of issues) console.log(`⚠ ${i}`)
console.log(`reconcile: ${updated} 节点更新, ${added} 新节点登记${uncertaintyWritten ? ", uncertainty.md 已重建" : ""}${stage.length ? ` (合并 ${stage.length} 个 _staging 文件)` : ""}`)
console.log(`index.json 现有 ${idx.nodes.length} 节点 · ${idx.nodes.filter((n) => n.status === "verified").length} verified / ${idx.nodes.filter((n) => n.status === "planned").length} planned`)
