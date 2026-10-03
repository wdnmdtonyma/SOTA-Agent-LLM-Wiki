---
id: ref.agent.compaction-config
title: 压缩配置目录
kind: reference
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/compaction/compaction.ts
symbols:
  - CompactionSettings
  - DEFAULT_COMPACTION_SETTINGS
related:
  - subsys.agent-core.compaction
  - spine.compaction-flow
  - subsys.coding-agent.agent-session
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.agent.compaction-config` 是 **pi-coding-agent** compaction settings 的字段级目录：覆盖 `packages/coding-agent/src/core/compaction/compaction.ts` 里 `CompactionSettings` 的三个配置字段、`DEFAULT_COMPACTION_SETTINGS` 的默认值，以及这些字段在 threshold gate、cut point 和 summary token budget 中的直接消费点。这是 compaction 纯函数消费的三字段对象，**不是** `settings.json` 里带 `modelOverrides` 的产品配置 interface，也不是 durable `DEFAULT_COMPACTION_POLICY`。

## 能回答的问题

- `CompactionSettings` 当前有哪些字段，字段类型是什么？
- `DEFAULT_COMPACTION_SETTINGS` 默认是否启用 automatic compaction？
- `reserveTokens` 如何影响 `shouldCompact()` 的触发阈值和 summary request 的输出 token 上限？
- `keepRecentTokens` 在准备 compaction 时怎样传给 cut point 选择？
- `CompactionSettings` 没有覆盖哪些 summary 调用参数，例如 `customInstructions`、`signal`、`thinkingLevel`？

## 配置字段目录

| 配置字段 | 类型 | 默认值 | 含义 | 直接消费点 | 源码证据 |
| --- | --- | --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | 控制 automatic compaction gate 是否启用；禁用时 `shouldCompact()` 直接返回 `false`。[E: packages/coding-agent/src/core/compaction/compaction.ts:121] [E: packages/coding-agent/src/core/compaction/compaction.ts:127] [E: packages/coding-agent/src/core/compaction/compaction.ts:268] | `shouldCompact(contextTokens, contextWindow, settings)` 读取 `settings.enabled` 作为第一层短路条件。[E: packages/coding-agent/src/core/compaction/compaction.ts:267] [E: packages/coding-agent/src/core/compaction/compaction.ts:268] | `packages/coding-agent/src/core/compaction/compaction.ts:121` |
| `reserveTokens` | `number` | `16384` | 为 summary prompt/output 留出的 token 预算；threshold gate 用它从 model context window 中扣除预留空间。[E: packages/coding-agent/src/core/compaction/compaction.ts:122] [E: packages/coding-agent/src/core/compaction/compaction.ts:128] [E: packages/coding-agent/src/core/compaction/compaction.ts:269] | `shouldCompact()` 使用 `contextTokens > contextWindow - settings.reserveTokens`；`compact()` 把 `settings.reserveTokens` 传给普通 summary 和 split-turn prefix summary。[E: packages/coding-agent/src/core/compaction/compaction.ts:269] [E: packages/coding-agent/src/core/compaction/compaction.ts:1001] [E: packages/coding-agent/src/core/compaction/compaction.ts:1041] | `packages/coding-agent/src/core/compaction/compaction.ts:122` |
| `keepRecentTokens` | `number` | `20000` | 指定 compaction 后希望保留的 recent-context token 预算；准备阶段把它交给 cut point 搜索。[E: packages/coding-agent/src/core/compaction/compaction.ts:123] [E: packages/coding-agent/src/core/compaction/compaction.ts:129] [E: packages/coding-agent/src/core/compaction/compaction.ts:898] | `prepareCompaction()` 调用 `findProjectedCutPoint(..., settings.keepRecentTokens)`；该函数从尾部累计 projected message token，达到 `keepRecentTokens` 后选择 cut point。[E: packages/coding-agent/src/core/compaction/compaction.ts:898] [E: packages/coding-agent/src/core/compaction/compaction.ts:802] [E: packages/coding-agent/src/core/compaction/compaction.ts:824] | `packages/coding-agent/src/core/compaction/compaction.ts:123` |

## 默认常量

| 常量 | 类型 | 字段值 | 语义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `DEFAULT_COMPACTION_SETTINGS` | `CompactionSettings` | `{ enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 }` | coding-agent compaction 纯函数的默认配置对象；对象声明显式标注为 `CompactionSettings`，因此三个字段必须满足该 interface 的字段集合。[E: packages/coding-agent/src/core/compaction/compaction.ts:126] [E: packages/coding-agent/src/core/compaction/compaction.ts:127] [E: packages/coding-agent/src/core/compaction/compaction.ts:128] [E: packages/coding-agent/src/core/compaction/compaction.ts:129] | `packages/coding-agent/src/core/compaction/compaction.ts:126` |

## 字段如何进入控制流

`shouldCompact(contextTokens, contextWindow, settings)` 是 `CompactionSettings` 的 threshold consumer：先读取 `settings.enabled`，再用 `settings.reserveTokens` 计算 `contextWindow - reserveTokens` 的触发线。[E: packages/coding-agent/src/core/compaction/compaction.ts:267] [E: packages/coding-agent/src/core/compaction/compaction.ts:268] [E: packages/coding-agent/src/core/compaction/compaction.ts:269]

`prepareCompaction(pathEntries, settings)` 是 `keepRecentTokens` 的 preparation consumer：函数入口接收 `CompactionSettings`，随后把 `settings.keepRecentTokens` 传入 `findProjectedCutPoint(projectedEntries, boundaryStart, boundaryEnd, settings.keepRecentTokens)` 来决定 `firstKeptEntryIndex`。[E: packages/coding-agent/src/core/compaction/compaction.ts:872] [E: packages/coding-agent/src/core/compaction/compaction.ts:874] [E: packages/coding-agent/src/core/compaction/compaction.ts:898]

`compact(preparation, model, apiKey, ...)` 不直接接收 `CompactionSettings`；它从 `CompactionPreparation` 解构 `settings`，再把 `settings.reserveTokens` 传给 `generateSummaryWithUsage()` 或 `generateTurnPrefixSummary()`。`signal` 是 `compact()` 的可选位置参数，不是 settings 字段。[E: packages/coding-agent/src/core/compaction/compaction.ts:965] [E: packages/coding-agent/src/core/compaction/compaction.ts:987] [E: packages/coding-agent/src/core/compaction/compaction.ts:1001] [E: packages/coding-agent/src/core/compaction/compaction.ts:1020] [E: packages/coding-agent/src/core/compaction/compaction.ts:1041]

普通 summary 的 `maxTokens` 是 `Math.min(Math.floor(0.8 * reserveTokens), model.maxTokens > 0 ? model.maxTokens : Number.POSITIVE_INFINITY)`，split-turn prefix summary 的 `maxTokens` 是 `Math.min(Math.floor(0.5 * reserveTokens), model.maxTokens > 0 ? model.maxTokens : Number.POSITIVE_INFINITY)`。[E: packages/coding-agent/src/core/compaction/compaction.ts:712] [E: packages/coding-agent/src/core/compaction/compaction.ts:713] [E: packages/coding-agent/src/core/compaction/compaction.ts:1090] [E: packages/coding-agent/src/core/compaction/compaction.ts:1091]

## 非配置字段边界

`CompactionSettings` 只声明 `enabled`、`reserveTokens`、`keepRecentTokens` 三个字段；`customInstructions`、`thinkingLevel`、`retry`、`callbacks`、`signal`、`streamFn`、`sessionId` 是 `compact()` / `generateSummaryWithUsage()` 的调用参数，不是 `CompactionSettings` 的字段。[E: packages/coding-agent/src/core/compaction/compaction.ts:120] [E: packages/coding-agent/src/core/compaction/compaction.ts:965]

`thinkingLevel` 只在 model supports reasoning 且值不是 `"off"` 时进入 summary request options；该行为属于 summary call options，不属于 compaction config object。[E: packages/coding-agent/src/core/compaction/compaction.ts:606] [E: packages/coding-agent/src/core/compaction/compaction.ts:607]

## 关系边界

[subsys.agent-core.compaction](../subsystems/agent-core/compaction.md) 覆盖 `shouldCompact()`、`prepareCompaction()`、`compact()`、token estimate、cut point 和 split-turn summary 的完整控制流；本节点只作为 `CompactionSettings` 与 `DEFAULT_COMPACTION_SETTINGS` 的字段级 reference。[E: packages/coding-agent/src/core/compaction/compaction.ts:267] [E: packages/coding-agent/src/core/compaction/compaction.ts:872] [E: packages/coding-agent/src/core/compaction/compaction.ts:965]

产品层 `settings.json` 另有一个可选字段的 `CompactionSettings`（含 `modelOverrides`，key 为 `"provider/modelId"`）。`SettingsManager.getCompactionSettings(model)` 按 override → ordinary → `DEFAULT_COMPACTION_TOKEN_SETTINGS` 解析 `reserveTokens` / `keepRecentTokens`，再与 `getCompactionEnabled()` 合成这里的三字段对象。不要把 `modelOverrides` 写成本节点 `CompactionSettings` 的第四个字段。[I]

durable Harness 的 compaction policy（`reserveTokens` / `keepRecentTokens` / `backgroundTokens`）在 [subsys.durable.harness](../subsystems/durable/harness.md)，与本目录函数无关。[I]

## Sources

- packages/coding-agent/src/core/compaction/compaction.ts

## 相关

- [subsys.agent-core.compaction](../subsystems/agent-core/compaction.md) - compaction threshold、preparation、summary generation、file metadata 和 split-turn behavior 的完整子系统说明。
- [spine.compaction-flow](../spine/compaction-flow.md) - 产品层谁把 settings 传进这三个函数。
- [subsys.coding-agent.agent-session](../subsystems/coding-agent/agent-session.md) - `getCompactionSettings(model)` 的调用点。
