#!/usr/bin/env node
// Reconcile: 把各任务写在 node .md frontmatter 里的真实状态同步回 index.json
// (status/source/symbols/related),登记 group 展开出来的新节点,删掉已展开的 group,
// 并把 _staging/uncertainty-*.md 合并进 reference/uncertainty.md。幂等,可重复跑。
// 用法: node tools/reconcile.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const WIKI = '/Users/bytedance/Mine/Agent/Best/docs/llm-wiki/claude'
const TIER_DIRS = ['spine', 'surface', 'subsystems', 'reference']

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
writeFileSync(join(WIKI, 'reference/uncertainty.md'),
  `---
id: ref.uncertainty
path: reference/uncertainty.md
title: 不确定项日志
kind: reference
tier: T3
source: []
status: draft
updated: 2026-06-14
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
    if (fm.status && fm.status !== 'verified' && rel !== 'reference/uncertainty.md') issues.push(`${rel}: status=${fm.status}`)
  } else {
    const node = { id: fm.id, title: fm.title, kind: fm.kind, tier: fm.tier, path: rel, source: fm.source || [], status: fm.status || 'planned' }
    if (fm.symbols) node.symbols = fm.symbols
    if (fm.related) node.related = fm.related
    index.nodes.push(node); nodeByPath.set(rel, node); added++
  }
}

// 3) 标记已展开的 group(dir 下已有 node 文件);保留在图中,避免 related 边悬空
let droppedGroups = 0 // 实为「已展开」计数
for (const g of index.groups) {
  if (g.dir && index.nodes.some(n => n.path.startsWith(g.dir)) && !g.expanded) { g.expanded = true; droppedGroups++ }
}

index.updated = '2026-06-14'

// 4) 写回(保持一行一节点)
const head = ['wiki', 'version', 'updated', 'consumption', 'source_root', 'tiers', 'evidence_levels', 'status_values']
let out = '{\n'
for (const k of head) out += `  ${JSON.stringify(k)}: ${JSON.stringify(index[k])},\n`
out += '  "nodes": [\n' + index.nodes.map(n => '    ' + JSON.stringify(n)).join(',\n') + '\n  ],\n'
out += '  "groups": [\n' + index.groups.map(g => '    ' + JSON.stringify(g)).join(',\n') + '\n  ]\n}\n'
writeFileSync(join(WIKI, 'index.json'), out)

const counts = {}
for (const n of index.nodes) counts[n.status] = (counts[n.status] || 0) + 1
console.log(`updated ${updated} · added ${added} · dropped groups ${droppedGroups}`)
console.log('node status:', JSON.stringify(counts))
console.log('groups left:', index.groups.map(g => g.id).join(', ') || '(none)')
console.log(issues.length ? `\n⚠ ${issues.length} issue:\n  - ` + issues.join('\n  - ') : '\n✓ no issues')
