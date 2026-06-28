#!/usr/bin/env node
// L1 机械校验 —— pi 源码 LLM wiki。无外部依赖,跑:node tools/lint.mjs
// 落地 conventions.md 第 5 节规则。errors → exit 1;warnings 不影响退出码。
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const WIKI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.resolve(WIKI, "../../../pi") // pi repo root (源码)
const TIER_DIR = { T0: "spine", T1: "surface", T2: "subsystems", T3: "reference" }
const KINDS = new Set(["flow", "tool", "surface", "subsystem", "reference", "catalog"])
const TIERS = new Set(["T0", "T1", "T2", "T3"])
const PKGS = new Set(["ai", "agent", "coding-agent", "tui", "orchestrator", "cross"])
const EVID = new Set(["explicit", "inferred", "unknown"])
const STATUS = new Set(["planned", "draft", "verified"])
const REQUIRED = ["id", "title", "kind", "tier", "pkg", "status"]
const NODE_DIRS = ["spine", "surface", "subsystems", "reference"]
const SELFCONTAINED_RE = /见上文|如前所述|见 Part|见上节|前面提到|as mentioned|(?<![A-Za-z])above(?![A-Za-z])/

const errors = []
const warns = []
const err = (where, msg) => errors.push(`✗ ${where}: ${msg}`)
const warn = (where, msg) => warns.push(`⚠ ${where}: ${msg}`)

function stripQuotes(s) { return s.replace(/^["']/, "").replace(/["']$/, "") }

// ---- YAML-subset frontmatter parser (scalars / inline [a,b] / block "- " lists) ----
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null
  const end = text.indexOf("\n---", 3)
  if (end === -1) return null
  const lines = text.slice(text.indexOf("\n") + 1, end).split("\n")
  const obj = {}
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][\w]*):\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    let rest = m[2]
    if (rest === "" && i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
      const arr = []
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) { arr.push(stripQuotes(lines[++i].replace(/^\s*-\s+/, "").trim())) }
      obj[key] = arr
    } else if (rest.startsWith("[")) {
      obj[key] = rest.replace(/^\[/, "").replace(/\]$/, "").split(",").map((s) => stripQuotes(s.trim())).filter(Boolean)
    } else {
      obj[key] = stripQuotes(rest)
    }
  }
  return obj
}

function srcExists(p) {
  const clean = p.replace(/[#].*$/, "").trim()
  if (!clean) return true
  try { fs.statSync(path.join(SRC, clean)); return true } catch { return false }
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

// ---- load index.json ----
let idx
try { idx = JSON.parse(fs.readFileSync(path.join(WIKI, "index.json"), "utf8")) }
catch (e) { console.error("✗ index.json 无法解析:", e.message); process.exit(1) }
const nodes = idx.nodes || []
const byId = new Map(nodes.map((n) => [n.id, n]))
const nodePaths = new Set(nodes.map((n) => n.path))

// ===== Rule 1/2: index.json 节点结构 =====
const seenId = new Set()
const seenPath = new Set()
for (const n of nodes) {
  const w = `index:${n.id || "?"}`
  for (const k of REQUIRED) if (n[k] === undefined || n[k] === "") err(w, `缺必填键 ${k}`)
  if (n.kind && !KINDS.has(n.kind)) err(w, `kind 非法: ${n.kind}`)
  if (n.tier && !TIERS.has(n.tier)) err(w, `tier 非法: ${n.tier}`)
  if (n.pkg && !PKGS.has(n.pkg)) err(w, `pkg 非法: ${n.pkg}`)
  if (n.status && !STATUS.has(n.status)) err(w, `status 非法: ${n.status}`)
  if (n.evidence && !EVID.has(n.evidence)) err(w, `evidence 非法: ${n.evidence}`)
  if (n.id) { if (seenId.has(n.id)) err(w, `id 重复`); seenId.add(n.id) }
  if (n.path) { if (seenPath.has(n.path)) err(w, `path 重复: ${n.path}`); seenPath.add(n.path) }
  // id↔path: 文件名 basename === id 最后一段;path 在该 tier 目录下
  if (n.id && n.path) {
    const slug = n.id.split(".").pop()
    const base = path.basename(n.path).replace(/\.md$/, "")
    if (base !== slug) err(w, `id↔path 不一致: 末段 "${slug}" ≠ 文件名 "${base}"`)
    if (n.tier && !n.path.startsWith(TIER_DIR[n.tier] + "/")) err(w, `path 不在 ${TIER_DIR[n.tier]}/ 下: ${n.path}`)
  }
  // Rule 4: related 目标 id 存在
  for (const r of n.related || []) if (!byId.has(r)) err(w, `related 指向不存在的 id: ${r}`)
  // Rule 3 (index 侧): source 路径存在于 pi/
  for (const s of n.source || []) if (!srcExists(s)) err(w, `source 路径不存在于 pi/: ${s}`)
}

// ===== Rule 5: index.json ↔ 文件树 =====
for (const n of nodes) {
  if (n.status && n.status !== "planned") {
    if (!fs.existsSync(path.join(WIKI, n.path))) err(`index:${n.id}`, `status=${n.status} 但文件缺失: ${n.path}`)
  }
}
for (const dir of NODE_DIRS) {
  for (const file of walk(path.join(WIKI, dir))) {
    const rel = path.relative(WIKI, file).split(path.sep).join("/")
    if (!nodePaths.has(rel)) err(`file:${rel}`, `节点文件不在 index.json 中`)
  }
}

// ===== 节点正文校验(仅对已存在的 .md;planned 多数无文件) =====
const SRC_TOKEN = /(?:packages|scripts|\.github|\.pi)\/[^\s`)\]]+|(?:AGENTS|CONTRIBUTING|SECURITY|README)\.md|package(?:-lock)?\.json|biome\.json|tsconfig(?:\.[\w.]+)?\.json|\.npmrc|test\.sh/g
for (const n of nodes) {
  const fp = path.join(WIKI, n.path)
  if (!fs.existsSync(fp)) continue
  const text = fs.readFileSync(fp, "utf8")
  const fm = parseFrontmatter(text)
  const w = `node:${n.path}`
  if (!fm) { err(w, "缺 frontmatter 或格式错误"); continue }
  for (const k of REQUIRED) if (fm[k] === undefined || fm[k] === "") err(w, `frontmatter 缺 ${k}`)
  if (fm.kind && !KINDS.has(fm.kind)) err(w, `kind 非法: ${fm.kind}`)
  if (fm.tier && !TIERS.has(fm.tier)) err(w, `tier 非法: ${fm.tier}`)
  if (fm.pkg && !PKGS.has(fm.pkg)) err(w, `pkg 非法: ${fm.pkg}`)
  if (fm.status && !STATUS.has(fm.status)) err(w, `status 非法: ${fm.status}`)
  if (fm.id && fm.id !== n.id) err(w, `frontmatter id "${fm.id}" ≠ index id "${n.id}"`)
  const body = text.slice(text.indexOf("\n---", 3) + 4)

  // Rule 7: 自包含禁词(warning)
  if (SELFCONTAINED_RE.test(body)) warn(w, `命中自包含禁词(见上文/如前所述/above 等)`)

  // Rule 4(正文): 指向其它节点 .md 的链接必须解析到已知节点 path
  for (const mm of body.matchAll(/\]\(([^)]+?\.md)(?:#[^)]*)?\)/g)) {
    const target = mm[1]
    if (/^https?:\/\//.test(target)) continue
    const resolved = path.relative(WIKI, path.resolve(path.dirname(fp), target)).split(path.sep).join("/")
    if (!nodePaths.has(resolved) && !fs.existsSync(path.join(WIKI, resolved))) err(w, `正文链接无法解析到节点/文件: ${target}`)
  }

  // Rule 3(正文 ## Sources): 路径存在
  const sourcesSec = body.split(/^##\s+Sources/m)[1]
  if (sourcesSec) {
    const sec = sourcesSec.split(/^##\s+/m)[0]
    for (const t of sec.match(SRC_TOKEN) || []) {
      if (t.includes("*")) { // glob(目录/catalog 合法):校验通配前的字面前缀目录存在
        const pre = t.slice(0, t.indexOf("*")).replace(/\/[^/]*$/, "")
        if (pre && !srcExists(pre)) err(w, `## Sources glob 前缀目录不存在: ${t}`)
        continue
      }
      if (!srcExists(t)) err(w, `## Sources 路径不存在: ${t}`)
    }
  }

  // Rule 8/9: 证据(verified 节点)
  const eTags = [...body.matchAll(/\[E:\s*([^\]\s:]+)(?::(\d+))?\]/g)]
  if (fm.status === "verified") {
    if (eTags.length === 0 && fm.evidence !== "unknown") warn(w, `verified 节点正文无任何 [E:] 证据`)
    for (const t of eTags) {
      const p = t[1]
      if (!srcExists(p)) { err(w, `[E:] 路径不存在: ${p}`); continue }
      if (t[2]) {
        const abs = path.join(SRC, p.replace(/[#].*$/, ""))
        try {
          const st = fs.statSync(abs)
          if (st.isFile()) {
            const srcLines = fs.readFileSync(abs, "utf8").split("\n")
            const ln = Number(t[2])
            if (ln > srcLines.length) err(w, `[E: ${p}:${t[2]}] 行号超出文件实际行数(${srcLines.length})`)
            else {
              // 行号精确是本 wiki 卖点:[E:] 不应落在空行/注释/纯括号行(典型漂移)。
              // 空行/注释 = 确定性漂移 → error;纯括号行可能是多行构造的合法锚点 → warn。
              const code = (srcLines[ln - 1] || "").trim()
              if (code === "" || /^(\/\/|\/\*|\*)/.test(code))
                err(w, `[E: ${p}:${t[2]}] 指向空行/注释行(行号漂移): "${code.slice(0, 48)}"`)
              else if (/^[}\])({,;]+$/.test(code))
                warn(w, `[E: ${p}:${t[2]}] 指向纯括号行(疑似行号漂移): "${code.slice(0, 48)}"`)
            }
          }
        } catch {}
      }
    }
  }

  // Rule 10: updated 是合法 pi 短 SHA
  if (fm.updated) {
    try { execSync(`git -C "${SRC}" cat-file -e ${fm.updated}^{commit}`, { stdio: "ignore" }) }
    catch { err(w, `updated 不是合法 pi commit SHA: ${fm.updated}`) }
  }
}

// ===== Rule 6: llms.txt 链接解析 =====
try {
  const llms = fs.readFileSync(path.join(WIKI, "llms.txt"), "utf8")
  for (const mm of llms.matchAll(/\]\(([^)]+)\)/g)) {
    const target = mm[1].replace(/#.*$/, "")
    if (/^https?:\/\//.test(target)) continue
    if (!nodePaths.has(target) && !fs.existsSync(path.join(WIKI, target))) err(`llms.txt`, `链接无法解析: ${target}`)
  }
} catch { err("llms.txt", "无法读取") }

// ===== 输出 =====
for (const w of warns) console.log(w)
for (const e of errors) console.log(e)
console.log(`\n${errors.length} error(s), ${warns.length} warning(s) · ${nodes.length} nodes, ${nodes.filter((n) => n.status !== "planned").length} non-planned`)
process.exit(errors.length ? 1 : 0)
