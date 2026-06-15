#!/usr/bin/env node
// L1 机械 lint —— 实现 conventions.md 第 5 节的结构护栏。
// 用法: node tools/lint.mjs   (在 wiki 根或任意 cwd 都行;路径基于脚本位置)
// 退出码: 有 error → 1;仅 warning → 0。
// 注意: L1 只是结构下限,真正把关是 L2 独立 subagent 逐 claim 证伪。lint 过 ≠ 内容对。

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const WIKI = resolve(HERE, '..')                 // docs/llm-wiki/claude
const SRC = resolve(WIKI, '../../../claude')      // Best/claude  (源仓)
const TIER_DIRS = ['spine', 'surface', 'subsystems', 'reference']
const KINDS = ['tool', 'command', 'hook-event', 'setting', 'subsystem', 'flow', 'reference']
const TIERS = ['T0', 'T1', 'T2', 'T3']
const EVID = ['explicit', 'inferred', 'unknown']
const STATUS = ['planned', 'draft', 'verified']
const NS_DIR = { spine: 'spine/', tool: 'surface/tools/', cmd: 'surface/commands/', hook: 'surface/hooks/', setting: 'surface/settings/', subsys: 'subsystems/', ref: 'reference/' }
const FORBIDDEN = /(见上文|如前所述|见 ?Part|见上节|前面提到|前文所述|如上所述|as mentioned (above|earlier)|mentioned earlier)/

const errors = []
const warns = []
const err = (m) => errors.push(m)
const warn = (m) => warns.push(m)

function walk(dir) {
  const abs = join(WIKI, dir)
  if (!existsSync(abs)) return []
  const out = []
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const rel = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(rel))
    else if (e.name.endsWith('.md')) out.push(rel)
  }
  return out
}

function parseFront(text, file) {
  if (!text.startsWith('---')) { err(`${file}: 缺少 frontmatter`); return null }
  const end = text.indexOf('\n---', 3)
  if (end < 0) { err(`${file}: frontmatter 未闭合`); return null }
  const fm = {}
  for (const line of text.slice(3, end).trim().split('\n')) {
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
    else v = v.replace(/^["']|["']$/g, '')
    fm[m[1]] = v
  }
  return { fm, body: text.slice(end + 4) }
}

const srcExists = (p) => existsSync(join(SRC, p.replace(/:.*$/, '').trim()))
const lineCountCache = new Map()
function srcLineCount(p) {
  if (lineCountCache.has(p)) return lineCountCache.get(p)
  let c = null
  try { if (statSync(join(SRC, p)).isFile()) c = readFileSync(join(SRC, p), 'utf8').split('\n').length } catch {}
  lineCountCache.set(p, c); return c
}

// ---- 载入 index.json ----
let index
try { index = JSON.parse(readFileSync(join(WIKI, 'index.json'), 'utf8')) }
catch (e) { console.error(`index.json 解析失败: ${e.message}`); process.exit(1) }

const nodes = index.nodes || []
const groups = index.groups || []
const allEntries = [...nodes, ...groups]
const idSet = new Set(allEntries.map(e => e.id))
const nodeByPath = new Map(nodes.map(n => [n.path, n]))
const groupDirs = groups.map(g => g.dir).filter(Boolean)

// Rule: index 内部完整性 ----
const seenId = new Set(), seenPath = new Set()
for (const e of allEntries) {
  if (seenId.has(e.id)) err(`index: 重复 id ${e.id}`); seenId.add(e.id)
  if (e.path) { if (seenPath.has(e.path)) err(`index: 重复 path ${e.path}`); seenPath.add(e.path) }
  if (e.kind && !KINDS.includes(e.kind)) err(`index ${e.id}: kind 非法 "${e.kind}"`)
  if (e.tier && !TIERS.includes(e.tier)) err(`index ${e.id}: tier 非法 "${e.tier}"`)
  if (e.status && !STATUS.includes(e.status)) err(`index ${e.id}: status 非法 "${e.status}"`)
  for (const r of e.related || []) if (!idSet.has(r)) err(`index ${e.id}: related 指向未知 id "${r}"`)
  // id↔path 命名空间一致(警告级)
  const ns = e.id.split('.')[0]
  if (e.path && NS_DIR[ns] && !e.path.startsWith(NS_DIR[ns])) warn(`index ${e.id}: path "${e.path}" 与命名空间 ${ns}/ 不一致`)
  // 规划节点的 source 路径存在性(警告:暴露 [推测] 路径)
  for (const s of e.source || []) if (!srcExists(s)) warn(`index ${e.id}: source "${s}" 在 Best/claude/ 不存在(待 Codex 开此节点时核实)`)
}

// Rule: status≠planned 的 index 条目必有文件 ----
for (const n of nodes) {
  if (n.status && n.status !== 'planned' && !existsSync(join(WIKI, n.path)))
    err(`index ${n.id}: status=${n.status} 但文件缺失 ${n.path}`)
}

// ---- 逐个磁盘上的节点文件检查 ----
const files = TIER_DIRS.flatMap(walk)
for (const f of files) {
  const text = readFileSync(join(WIKI, f), 'utf8')
  const parsed = parseFront(text, f)
  if (!parsed) continue
  const { fm, body } = parsed
  // 必须在 index(或属于某 group 目录)
  const inIndex = nodeByPath.has(f)
  const underGroup = groupDirs.some(d => f.startsWith(d))
  if (!inIndex && !underGroup) err(`${f}: 节点文件不在 index.json(且不属任何 group 目录)`)
  else if (!inIndex && underGroup) warn(`${f}: group 展开节点尚未登记进 index.json`)
  // 必填键
  for (const k of ['id', 'title', 'kind', 'tier', 'status']) if (!fm[k]) err(`${f}: frontmatter 缺 ${k}`)
  if (fm.kind && !KINDS.includes(fm.kind)) err(`${f}: kind 非法 "${fm.kind}"`)
  if (fm.tier && !TIERS.includes(fm.tier)) err(`${f}: tier 非法 "${fm.tier}"`)
  if (fm.status && !STATUS.includes(fm.status)) err(`${f}: status 非法 "${fm.status}"`)
  if (fm.evidence && !EVID.includes(fm.evidence)) err(`${f}: evidence 非法 "${fm.evidence}"`)
  // id↔path
  if (fm.id && inIndex && nodeByPath.get(f).id !== fm.id) err(`${f}: frontmatter id "${fm.id}" ≠ index 中该 path 的 id "${nodeByPath.get(f).id}"`)
  // source 存在
  for (const s of fm.source || []) if (!srcExists(s)) err(`${f}: source "${s}" 在 Best/claude/ 不存在`)
  for (const r of fm.related || []) if (!idSet.has(r)) err(`${f}: related 指向未知 id "${r}"`)
  // 自包含:禁跳转措辞
  const fb = body.match(FORBIDDEN); if (fb) err(`${f}: 出现非自包含措辞 "${fb[0]}"(改成显式实体名+链接)`)
  // 证据:verified 节点须有 [E] 与 ## Sources;[E: path] 路径须存在
  if (fm.status === 'verified') {
    if (!/\[E[:\]]/.test(body)) err(`${f}: status=verified 但正文无 [E] 证据标`)
    if (!/##\s*Sources/.test(body)) err(`${f}: status=verified 但缺 ## Sources`)
  }
  for (const m of body.matchAll(/\[E:\s*([^\]]+?)\]/g)) {
    const ref = m[1].trim()
    const lm = ref.match(/^(.*?):(\d+)$/)
    const path = lm ? lm[1] : ref
    if (!existsSync(join(SRC, path))) { err(`${f}: [E: ${ref}] 路径不存在于 Best/claude/`); continue }
    if (lm) { const lc = srcLineCount(path); if (lc != null && Number(lm[2]) > lc) err(`${f}: [E: ${ref}] 行号超出文件范围(${path} 共 ${lc} 行)`) }
  }
}

// ---- llms.txt 链接解析 ----
if (existsSync(join(WIKI, 'llms.txt'))) {
  const llms = readFileSync(join(WIKI, 'llms.txt'), 'utf8')
  for (const m of llms.matchAll(/\]\(([^)]+)\)/g)) {
    const p = m[1]
    if (p.endsWith('.md')) { if (!nodeByPath.has(p) && !groupDirs.some(d => p.startsWith(d))) warn(`llms.txt: 链接 "${p}" 不对应任何 index 节点`) }
    else if (p.endsWith('/')) { if (!groupDirs.includes(p) && !TIER_DIRS.some(t => p.startsWith(t))) warn(`llms.txt: 目录链接 "${p}" 未知`) }
  }
}

// ---- 汇总 ----
const verified = nodes.filter(n => n.status === 'verified').length
console.log(`索引节点 ${nodes.length} · group ${groups.length} · 磁盘节点文件 ${files.length} · verified ${verified}`)
console.log(`SRC = ${SRC}  (存在: ${existsSync(SRC)})`)
if (warns.length) { console.log(`\n⚠ ${warns.length} warning:`); for (const w of warns) console.log('  - ' + w) }
if (errors.length) { console.log(`\n✖ ${errors.length} error:`); for (const e of errors) console.log('  - ' + e) }
else console.log('\n✓ 0 error')
process.exit(errors.length ? 1 : 0)
