---
id: ref.agent.compaction-config
title: 压缩配置目录
kind: reference
tier: T3
pkg: agent
source:
  - packages/agent/src/harness/compaction/compaction.ts
symbols:
  - CompactionSettings
  - DEFAULT_COMPACTION_SETTINGS
related:
  - subsys.agent-core.compaction
evidence: explicit
status: verified
updated: 8c943640
---

> `ref.agent.compaction-config` 是 `pi-agent-core` compaction settings 的字段级目录:覆盖 `CompactionSettings` 的三个配置字段、`DEFAULT_COMPACTION_SETTINGS` 的默认值,以及这些字段在 threshold gate、cut point 和 summary token budget 中的直接消费点。

## 能回答的问题

- `CompactionSettings` 当前有哪些字段,字段类型是什么?
- `DEFAULT_COMPACTION_SETTINGS` 默认是否启用 automatic compaction?
- `reserveTokens` 如何影响 `shouldCompact()` 的触发阈值和 summary request 的输出 token 上限?
- `keepRecentTokens` 在准备 compaction 时怎样传给 cut point 选择?
- `CompactionSettings` 没有覆盖哪些 summary 调用参数,例如 `customInstructions`、`signal`、`thinkingLevel`?

## 配置字段目录

| 配置字段 | 类型 | 默认值 | 含义 | 直接消费点 | 源码证据 |
| --- | --- | --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | 控制 automatic compaction gate 是否启用;禁用时 `shouldCompact()` 直接返回 `false`。[E: packages/agent/src/harness/compaction/compaction.ts:103][E: packages/agent/src/harness/compaction/compaction.ts:112][E: packages/agent/src/harness/compaction/compaction.ts:201] | `shouldCompact(contextTokens, contextWindow, settings)` 读取 `settings.enabled` 作为第一层短路条件。[E: packages/agent/src/harness/compaction/compaction.ts:200][E: packages/agent/src/harness/compaction/compaction.ts:201] | `packages/agent/src/harness/compaction/compaction.ts:103` |
| `reserveTokens` | `number` | `16384` | 为 summary prompt/output 留出的 token 预算;threshold gate 用它从 model context window 中扣除预留空间。[E: packages/agent/src/harness/compaction/compaction.ts:105][E: packages/agent/src/harness/compaction/compaction.ts:113][E: packages/agent/src/harness/compaction/compaction.ts:202] | `shouldCompact()` 使用 `contextTokens > contextWindow - settings.reserveTokens`;`compact()` 把 `settings.reserveTokens` 传给普通 summary 和 split-turn prefix summary。[E: packages/agent/src/harness/compaction/compaction.ts:202][E: packages/agent/src/harness/compaction/compaction.ts:662][E: packages/agent/src/harness/compaction/compaction.ts:669][E: packages/agent/src/harness/compaction/compaction.ts:679] | `packages/agent/src/harness/compaction/compaction.ts:105` |
| `keepRecentTokens` | `number` | `20000` | 指定 compaction 后希望保留的 recent-context token 预算;准备阶段把它交给 cut point 搜索。[E: packages/agent/src/harness/compaction/compaction.ts:107][E: packages/agent/src/harness/compaction/compaction.ts:114][E: packages/agent/src/harness/compaction/compaction.ts:573] | `prepareCompaction()` 调用 `findCutPoint(pathEntries, boundaryStart, boundaryEnd, settings.keepRecentTokens)`;`findCutPoint()` 从尾部累计 message token,达到 `keepRecentTokens` 后选择 cut point。[E: packages/agent/src/harness/compaction/compaction.ts:573][E: packages/agent/src/harness/compaction/compaction.ts:333][E: packages/agent/src/harness/compaction/compaction.ts:337][E: packages/agent/src/harness/compaction/compaction.ts:347][E: packages/agent/src/harness/compaction/compaction.ts:350][E: packages/agent/src/harness/compaction/compaction.ts:351][E: packages/agent/src/harness/compaction/compaction.ts:352][E: packages/agent/src/harness/compaction/compaction.ts:353][E: packages/agent/src/harness/compaction/compaction.ts:355] | `packages/agent/src/harness/compaction/compaction.ts:107` |

## 默认常量

| 常量 | 类型 | 字段值 | 语义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `DEFAULT_COMPACTION_SETTINGS` | `CompactionSettings` | `{ enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 }` | harness 的默认 compaction 配置对象;对象声明显式标注为 `CompactionSettings`,因此三个字段必须满足该 interface 的字段集合。[E: packages/agent/src/harness/compaction/compaction.ts:111][E: packages/agent/src/harness/compaction/compaction.ts:112][E: packages/agent/src/harness/compaction/compaction.ts:113][E: packages/agent/src/harness/compaction/compaction.ts:114] | `packages/agent/src/harness/compaction/compaction.ts:111` |

## 字段如何进入控制流

`shouldCompact(contextTokens, contextWindow, settings)` 是 `CompactionSettings` 的 threshold consumer:先读取 `settings.enabled`,再用 `settings.reserveTokens` 计算 `contextWindow - reserveTokens` 的触发线。[E: packages/agent/src/harness/compaction/compaction.ts:200][E: packages/agent/src/harness/compaction/compaction.ts:201][E: packages/agent/src/harness/compaction/compaction.ts:202]

`prepareCompaction(pathEntries, settings)` 是 `keepRecentTokens` 的 preparation consumer:函数入口接收 `CompactionSettings`,随后把 `settings.keepRecentTokens` 传入 `findCutPoint()` 来决定 `firstKeptEntryIndex`。[E: packages/agent/src/harness/compaction/compaction.ts:545][E: packages/agent/src/harness/compaction/compaction.ts:547][E: packages/agent/src/harness/compaction/compaction.ts:573]

`compact(preparation, models, model, customInstructions, signal, thinkingLevel)` 不直接接收 `CompactionSettings`;它从 `CompactionPreparation` 解构 `settings`,再把 `settings.reserveTokens` 传给 `generateSummary()` 或 `generateTurnPrefixSummary()`。[E: packages/agent/src/harness/compaction/compaction.ts:630][E: packages/agent/src/harness/compaction/compaction.ts:638][E: packages/agent/src/harness/compaction/compaction.ts:646][E: packages/agent/src/harness/compaction/compaction.ts:662][E: packages/agent/src/harness/compaction/compaction.ts:669][E: packages/agent/src/harness/compaction/compaction.ts:679]

普通 summary 的 `maxTokens` 是 `Math.min(Math.floor(0.8 * reserveTokens), model.maxTokens > 0 ? model.maxTokens : Number.POSITIVE_INFINITY)`,split-turn prefix summary 的 `maxTokens` 是 `Math.min(Math.floor(0.5 * reserveTokens), model.maxTokens > 0 ? model.maxTokens : Number.POSITIVE_INFINITY)`。[E: packages/agent/src/harness/compaction/compaction.ts:470][E: packages/agent/src/harness/compaction/compaction.ts:471][E: packages/agent/src/harness/compaction/compaction.ts:472][E: packages/agent/src/harness/compaction/compaction.ts:707][E: packages/agent/src/harness/compaction/compaction.ts:708][E: packages/agent/src/harness/compaction/compaction.ts:709]

## 非配置字段边界

`CompactionSettings` 只声明 `enabled`、`reserveTokens`、`keepRecentTokens` 三个字段;`customInstructions`、`signal`、`thinkingLevel` 是 `compact()` / `generateSummary()` 的调用参数,不是 `CompactionSettings` 的字段。[E: packages/agent/src/harness/compaction/compaction.ts:101][E: packages/agent/src/harness/compaction/compaction.ts:103][E: packages/agent/src/harness/compaction/compaction.ts:105][E: packages/agent/src/harness/compaction/compaction.ts:107][E: packages/agent/src/harness/compaction/compaction.ts:460][E: packages/agent/src/harness/compaction/compaction.ts:465][E: packages/agent/src/harness/compaction/compaction.ts:466][E: packages/agent/src/harness/compaction/compaction.ts:468][E: packages/agent/src/harness/compaction/compaction.ts:630][E: packages/agent/src/harness/compaction/compaction.ts:634][E: packages/agent/src/harness/compaction/compaction.ts:635][E: packages/agent/src/harness/compaction/compaction.ts:636]

`thinkingLevel` 只在 model supports reasoning 且值不是 `"off"` 时进入 summary request options;该行为属于 summary call options,不属于 compaction config object。[E: packages/agent/src/harness/compaction/compaction.ts:494][E: packages/agent/src/harness/compaction/compaction.ts:495][E: packages/agent/src/harness/compaction/compaction.ts:496][E: packages/agent/src/harness/compaction/compaction.ts:725][E: packages/agent/src/harness/compaction/compaction.ts:726]

## 关系边界

`subsys.agent-core.compaction` 覆盖 `shouldCompact()`、`prepareCompaction()`、`compact()`、token estimate、cut point 和 split-turn summary 的完整控制流;本节点只作为 `CompactionSettings` 与 `DEFAULT_COMPACTION_SETTINGS` 的字段级 reference。[E: packages/agent/src/harness/compaction/compaction.ts:200][E: packages/agent/src/harness/compaction/compaction.ts:545][E: packages/agent/src/harness/compaction/compaction.ts:630][I]

## Sources

- packages/agent/src/harness/compaction/compaction.ts

## 相关

- [subsys.agent-core.compaction](../subsystems/agent-core/compaction.md): compaction threshold、preparation、summary generation、file metadata 和 split-turn behavior 的完整子系统说明。
