#!/usr/bin/env node
// Reconcile: 把各并发任务写在 node .md frontmatter 里的真实状态同步回 index.json
// (status/source/symbols/related/title/kind/tier),登记 group 展开出的新节点,标记已展开 group,
// 并把 _staging/uncertainty-*.md 合并进 reference/uncertainty.md。幂等,可重复跑。
// 并发填充模型:codex 各批次只写自己的 .md(frontmatter 带 status)+ _staging/uncertainty-<batch>.md,
// 从不碰 index.json/llms.txt;填完一波后由本脚本统一登记,再跑 lint.mjs。
// 用法: node tools/reconcile.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { execSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const WIKI = resolve(HERE, '..')
const SRC = resolve(WIKI, '../../../codex')
const TIER_DIRS = ['spine', 'surface', 'subsystems', 'reference']

let sha = ''
try { sha = execSync(`git -C ${SRC} rev-parse --short HEAD`, { encoding: 'utf8' }).trim() } catch {}

function parseFront(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end < 0) return null
  const fm = {}
  for (const line of text.slice(3, end).trim().split('\n')) {
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
    else v = v.replace(/^["']|["']$/g, '')
    fm[m[1]] = v
  }
  return fm
}
function walk(dir) {
  const abs = join(WIKI, dir)
  if (!existsSync(abs)) return []
  const out = []
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...walk(rel))
    else if (e.name.endsWith('.md')) out.push(rel)
  }
  return out
}

// 1) 合并 _staging/uncertainty-*.md → reference/uncertainty.md
let uBody = ''
const stagingDir = join(WIKI, '_staging')
if (existsSync(stagingDir)) {
  for (const f of readdirSync(stagingDir).filter(f => /^uncertainty-.*\.md$/.test(f)).sort()) {
    const c = readFileSync(join(stagingDir, f), 'utf8').trim()
    if (c) uBody += `\n## ${f.replace(/\.md$/, '')}\n\n${c}\n`
  }
}
mkdirSync(join(WIKI, 'reference'), { recursive: true })
writeFileSync(join(WIKI, 'reference/uncertainty.md'),
  `---
id: ref.uncertainty
path: reference/uncertainty.md
title: 不确定项日志
kind: reference
tier: T3
source: []
status: verified
updated: ${sha || '0000000'}
evidence: unknown
---

> 全仓 \`[U]\`(待查/待证实)汇总,由各填充任务的 _staging/uncertainty-*.md 合并而来;每次 reconcile 重新生成。
${uBody || '\n(暂无)\n'}`)

// 2) 把 node 文件 frontmatter 同步进 index.json
const index = JSON.parse(readFileSync(join(WIKI, 'index.json'), 'utf8'))
const nodeByPath = new Map(index.nodes.map(n => [n.path, n]))
let updated = 0, added = 0
const issues = []
for (const rel of TIER_DIRS.flatMap(walk)) {
  const fm = parseFront(readFileSync(join(WIKI, rel), 'utf8'))
  if (!fm || !fm.id) { issues.push(`${rel}: 缺 frontmatter/id`); continue }
  if (fm.path && fm.path !== rel) issues.push(`${rel}: frontmatter path=${fm.path} 不一致`)
  const ex = nodeByPath.get(rel)
  if (ex) {
    for (const k of ['status', 'source', 'symbols', 'related', 'title', 'kind', 'tier']) if (fm[k]) ex[k] = fm[k]
    updated++
  } else {
    const node = { id: fm.id, title: fm.title, kind: fm.kind, tier: fm.tier, path: rel, source: fm.source || [], status: fm.status || 'planned' }
    if (fm.symbols) node.symbols = fm.symbols
    if (fm.related) node.related = fm.related
    index.nodes.push(node); nodeByPath.set(rel, node); added++
  }
}

// 3) 标记已展开的 group(dir 下已有 node 文件)
let expandedGroups = 0
for (const g of index.groups) {
  if (g.dir && index.nodes.some(n => n.path.startsWith(g.dir)) && !g.expanded) { g.expanded = true; expandedGroups++ }
}

index.updated = sha || index.updated

// 4) 写回(保持一行一节点;通用保留所有顶层 meta 键)
const head = Object.keys(index).filter(k => k !== 'nodes' && k !== 'groups')
let out = '{\n'
for (const k of head) out += `  ${JSON.stringify(k)}: ${JSON.stringify(index[k])},\n`
out += '  "nodes": [\n' + index.nodes.map(n => '    ' + JSON.stringify(n)).join(',\n') + '\n  ],\n'
out += '  "groups": [\n' + index.groups.map(g => '    ' + JSON.stringify(g)).join(',\n') + '\n  ]\n}\n'
writeFileSync(join(WIKI, 'index.json'), out)

const counts = {}
for (const n of index.nodes) counts[n.status] = (counts[n.status] || 0) + 1
console.log(`git SHA ${sha || '(none)'} · updated ${updated} · added ${added} · expanded groups ${expandedGroups}`)
console.log('node status:', JSON.stringify(counts))
console.log(issues.length ? `\n⚠ ${issues.length} issue:\n  - ` + issues.join('\n  - ') : '\n✓ no issues')
