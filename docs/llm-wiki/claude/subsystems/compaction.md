---
id: subsys.compaction
path: subsystems/compaction.md
title: 压缩家族
kind: subsystem
tier: T2
status: verified
source: [services/compact/]
symbols: [autoCompactIfNeeded, shouldAutoCompact, compactConversation, buildPostCompactMessages, microcompactMessages, trySessionMemoryCompaction, runPostCompactCleanup]
related: [spine.context-compaction]
evidence: explicit
updated: 2026-06-14
---

> 压缩家族负责在上下文压力出现前后减少 conversation payload: auto compact 触发整段 summary, microcompact 清理旧 tool results, session memory compact 用持久会话记忆替代完整历史。

## 能回答的问题

- auto compact 的阈值如何从 context window 和 output token reserve 算出?
- `autoCompactIfNeeded()` 为什么先尝试 session memory compaction?
- `compactConversation()` 生成 summary 后如何重建 post-compact messages?
- cached microcompact 为什么不改本地 messages, 而是排队 cache edits?
- compaction 后哪些 cache/state 会被清理?

## 职责边界

压缩家族只负责判断是否需要压缩、生成压缩结果、重建压缩后的 messages、清理与 compaction 失效的缓存; query loop 何时调用它、如何把结果 yield 给用户, 属于 [Context and compaction](../spine/context-and-compaction.md) 和 [Agent loop](../spine/agent-loop.md) 的端到端流程。[E: services/compact/autoCompact.ts:241][E: services/compact/compact.ts:387][E: services/compact/microCompact.ts:253][E: services/compact/sessionMemoryCompact.ts:514][I]

压缩路径有三类: proactive auto compact、manual/legacy full compact、microcompact。microcompact 只缩 tool result payload 或 API cache edits, full compact 会插入 compact boundary 和 summary messages。[E: services/compact/autoCompact.ts:241][E: services/compact/compact.ts:330][E: services/compact/microCompact.ts:267][E: services/compact/microCompact.ts:388]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `services/compact/autoCompact.ts` | 计算 effective context window、threshold、warning state, 并决定 auto compact/session memory compact/full compact 是否执行。[E: services/compact/autoCompact.ts:33][E: services/compact/autoCompact.ts:72][E: services/compact/autoCompact.ts:147][E: services/compact/autoCompact.ts:160][E: services/compact/autoCompact.ts:241] |
| `services/compact/compact.ts` | full compact 主流程: hooks、summary request、PTL retry、attachments、boundary、summary messages、metrics、post hooks。[E: services/compact/compact.ts:387][E: services/compact/compact.ts:413][E: services/compact/compact.ts:451][E: services/compact/compact.ts:598][E: services/compact/compact.ts:650][E: services/compact/compact.ts:723] |
| `services/compact/microCompact.ts` | time-based microcompact 和 cached microcompact 状态, 包括 pending/pinned cache edits。[E: services/compact/microCompact.ts:41][E: services/compact/microCompact.ts:88][E: services/compact/microCompact.ts:111][E: services/compact/microCompact.ts:253][E: services/compact/microCompact.ts:422] |
| `services/compact/sessionMemoryCompact.ts` | session memory compaction gate、保留消息选择、post-compact message 构造和 threshold 检查。[E: services/compact/sessionMemoryCompact.ts:403][E: services/compact/sessionMemoryCompact.ts:514][E: services/compact/sessionMemoryCompact.ts:571][E: services/compact/sessionMemoryCompact.ts:591][E: services/compact/sessionMemoryCompact.ts:607] |
| `services/compact/postCompactCleanup.ts` | compaction 后清理 microcompact、context collapse、memory cache、system prompt sections、classifier approvals、session message cache 等状态。[E: services/compact/postCompactCleanup.ts:31][E: services/compact/postCompactCleanup.ts:41][E: services/compact/postCompactCleanup.ts:59][E: services/compact/postCompactCleanup.ts:62][E: services/compact/postCompactCleanup.ts:76] |

## 数据模型

`AutoCompactTrackingState` 记录本轮是否已经 compacted、turn counter、turn id 和连续失败次数; 连续失败达到 `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3` 后, auto compact circuit breaker 会停止继续尝试。[E: services/compact/autoCompact.ts:52][E: services/compact/autoCompact.ts:53][E: services/compact/autoCompact.ts:55][E: services/compact/autoCompact.ts:59][E: services/compact/autoCompact.ts:70][E: services/compact/autoCompact.ts:262]

effective context window 等于模型 context window 减去 summary 预留 output tokens; `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 可以把 context window 上限降到更小正整数, auto threshold 再减 `AUTOCOMPACT_BUFFER_TOKENS`。[E: services/compact/autoCompact.ts:33][E: services/compact/autoCompact.ts:34][E: services/compact/autoCompact.ts:40][E: services/compact/autoCompact.ts:48][E: services/compact/autoCompact.ts:72][E: services/compact/autoCompact.ts:76]

`CompactionResult` 包含 boundary marker、summary messages、attachments、hook results、可选 kept messages、display text、pre/post/true post token counts 和 usage; `buildPostCompactMessages()` 固定顺序为 boundary、summary、kept messages、attachments、hook results。[E: services/compact/compact.ts:300][E: services/compact/compact.ts:301][E: services/compact/compact.ts:302][E: services/compact/compact.ts:303][E: services/compact/compact.ts:304][E: services/compact/compact.ts:305][E: services/compact/compact.ts:306][E: services/compact/compact.ts:307][E: services/compact/compact.ts:308][E: services/compact/compact.ts:309][E: services/compact/compact.ts:332][E: services/compact/compact.ts:333][E: services/compact/compact.ts:334][E: services/compact/compact.ts:335][E: services/compact/compact.ts:336]

`RecompactionInfo` 把 auto compact threshold、query source、previous compact turn id、turns since previous compact 等诊断字段传入 full compact telemetry。[E: services/compact/compact.ts:318][E: services/compact/compact.ts:319][E: services/compact/compact.ts:320][E: services/compact/compact.ts:321][E: services/compact/compact.ts:322][E: services/compact/autoCompact.ts:280][E: services/compact/autoCompact.ts:281][E: services/compact/autoCompact.ts:282][E: services/compact/autoCompact.ts:283][E: services/compact/autoCompact.ts:284]

microcompact 的 compactable tool set 包含 Read、shell、Grep、Glob、WebSearch、WebFetch、Edit、Write; cached microcompact 通过 pending cache edits 和 pinned cache edits 与 API request layer 交接。[E: services/compact/microCompact.ts:42][E: services/compact/microCompact.ts:43][E: services/compact/microCompact.ts:44][E: services/compact/microCompact.ts:45][E: services/compact/microCompact.ts:46][E: services/compact/microCompact.ts:47][E: services/compact/microCompact.ts:48][E: services/compact/microCompact.ts:49][E: services/compact/microCompact.ts:88][E: services/compact/microCompact.ts:100][E: services/compact/microCompact.ts:111]

## 控制流

1. `isAutoCompactEnabled()` 受 `DISABLE_COMPACT`、`DISABLE_AUTO_COMPACT` 和 global config `autoCompactEnabled` 控制; `shouldAutoCompact()` 还会避开 session memory/compact query source、context collapse 等递归或冲突场景。[E: services/compact/autoCompact.ts:147][E: services/compact/autoCompact.ts:148][E: services/compact/autoCompact.ts:152][E: services/compact/autoCompact.ts:156][E: services/compact/autoCompact.ts:171][E: services/compact/autoCompact.ts:185][E: services/compact/autoCompact.ts:215]
2. `shouldAutoCompact()` 用 `tokenCountWithEstimation(messages) - snipTokensFreed` 计算 token count, 通过 `calculateTokenWarningState()` 判断是否超过 auto compact threshold。[E: services/compact/autoCompact.ts:225][E: services/compact/autoCompact.ts:226][E: services/compact/autoCompact.ts:233][E: services/compact/autoCompact.ts:238]
3. `autoCompactIfNeeded()` 先检查全局 disable 和 circuit breaker, 再调用 `shouldAutoCompact()`; 不需要压缩时返回 `{wasCompacted:false}`。[E: services/compact/autoCompact.ts:253][E: services/compact/autoCompact.ts:262][E: services/compact/autoCompact.ts:267][E: services/compact/autoCompact.ts:275]
4. auto compact 触发后先构造 `RecompactionInfo`, 然后尝试 `trySessionMemoryCompaction()`; session memory 成功时会 reset last summarized id、run cleanup、通知 prompt cache break detector, 并返回 session memory result。[E: services/compact/autoCompact.ts:279][E: services/compact/autoCompact.ts:288][E: services/compact/autoCompact.ts:293][E: services/compact/autoCompact.ts:296][E: services/compact/autoCompact.ts:297][E: services/compact/autoCompact.ts:303]
5. session memory 不可用时, auto compact 调用 `compactConversation()`; full compact 成功后也会 reset last summarized id 和 cleanup, 失败时递增 consecutive failures 并可能触发 circuit breaker。[E: services/compact/autoCompact.ts:312][E: services/compact/autoCompact.ts:325][E: services/compact/autoCompact.ts:326][E: services/compact/autoCompact.ts:334][E: services/compact/autoCompact.ts:341][E: services/compact/autoCompact.ts:343]
6. `compactConversation()` 先拒绝空 messages, 记录 pre compact token count, 执行 PreCompact hooks, 设置 compact progress, 构造 compact prompt 并请求 summary; prompt-too-long response 会触发截断旧消息后重试。[E: services/compact/compact.ts:397][E: services/compact/compact.ts:401][E: services/compact/compact.ts:413][E: services/compact/compact.ts:427][E: services/compact/compact.ts:440][E: services/compact/compact.ts:451][E: services/compact/compact.ts:460][E: services/compact/compact.ts:465]
7. full compact 收到 summary 后保存并清空 read file state、清空 loaded nested memory paths, 并生成 post-compact file/agent/plan/skill/deferred-tool/agent-list/MCP instructions attachments。[E: services/compact/compact.ts:518][E: services/compact/compact.ts:521][E: services/compact/compact.ts:522][E: services/compact/compact.ts:532][E: services/compact/compact.ts:545][E: services/compact/compact.ts:558][E: services/compact/compact.ts:567][E: services/compact/compact.ts:575][E: services/compact/compact.ts:578]
8. full compact 随后执行 SessionStart hooks, 创建 compact boundary, 保存 pre-compact discovered tools 到 boundary metadata, 构造 summary message, 记录 metrics, 通知 cache break detector, 执行 PostCompact hooks 并返回 `CompactionResult`。[E: services/compact/compact.ts:592][E: services/compact/compact.ts:598][E: services/compact/compact.ts:606][E: services/compact/compact.ts:614][E: services/compact/compact.ts:650][E: services/compact/compact.ts:699][E: services/compact/compact.ts:723][E: services/compact/compact.ts:395]
9. `microcompactMessages()` 先尝试 time-based trigger; 若 gap 超过阈值, 它会保留最近 N 个 compactable tool results、把更旧结果 content 改成 cleared marker、reset cached state 并返回新 messages。[E: services/compact/microCompact.ts:253][E: services/compact/microCompact.ts:267][E: services/compact/microCompact.ts:422][E: services/compact/microCompact.ts:461][E: services/compact/microCompact.ts:477][E: services/compact/microCompact.ts:483][E: services/compact/microCompact.ts:517]
10. 若 time-based path 没触发且 cached microcompact feature/model/main-thread 条件满足, cached path 注册 tool results、计算要删除的 tool ids、创建 pending cache edits, 但返回的 `messages` 本体保持不变。[E: services/compact/microCompact.ts:276][E: services/compact/microCompact.ts:280][E: services/compact/microCompact.ts:284][E: services/compact/microCompact.ts:313][E: services/compact/microCompact.ts:332][E: services/compact/microCompact.ts:336][E: services/compact/microCompact.ts:386]
11. `trySessionMemoryCompaction()` 只有 `shouldUseSessionMemoryCompaction()` 允许、session memory 存在且非空时继续; 它根据 last summarized message 计算保留区间, 过滤旧 compact boundary, 运行 startup hooks, 用 session memory 创建 compact result, 并在 auto threshold 超限时返回 null 让 full compact 接手。[E: services/compact/sessionMemoryCompact.ts:403][E: services/compact/sessionMemoryCompact.ts:519][E: services/compact/sessionMemoryCompact.ts:533][E: services/compact/sessionMemoryCompact.ts:540][E: services/compact/sessionMemoryCompact.ts:548][E: services/compact/sessionMemoryCompact.ts:571][E: services/compact/sessionMemoryCompact.ts:579][E: services/compact/sessionMemoryCompact.ts:584][E: services/compact/sessionMemoryCompact.ts:591][E: services/compact/sessionMemoryCompact.ts:607]
12. `runPostCompactCleanup()` 总是 reset microcompact state, 只在 main-thread compact 时 reset context collapse 和 memory file cache, 并清理 system prompt sections、classifier approvals、speculative checks、beta tracing 和 session messages cache。[E: services/compact/postCompactCleanup.ts:31][E: services/compact/postCompactCleanup.ts:36][E: services/compact/postCompactCleanup.ts:41][E: services/compact/postCompactCleanup.ts:42][E: services/compact/postCompactCleanup.ts:51][E: services/compact/postCompactCleanup.ts:62][E: services/compact/postCompactCleanup.ts:63][E: services/compact/postCompactCleanup.ts:64][E: services/compact/postCompactCleanup.ts:70][E: services/compact/postCompactCleanup.ts:76]

## 设计动机与权衡

auto compact 保留 20k 以内的 output token reserve 后再计算阈值, 是为了 summary 请求本身留出输出空间; 这让用户可用 context window 看起来更小, 但降低 compact request 再次超限的风险。[E: services/compact/autoCompact.ts:30][E: services/compact/autoCompact.ts:35][E: services/compact/autoCompact.ts:36][E: services/compact/autoCompact.ts:48][I]

auto compact 优先尝试 session memory, 因为 session memory compaction 可以复用已经提取的会话记忆并保留较短尾部; 如果 post compact token count 仍超过 threshold, 它会返回 null, 由 full compact 兜底。[E: services/compact/autoCompact.ts:288][E: services/compact/sessionMemoryCompact.ts:600][E: services/compact/sessionMemoryCompact.ts:607][E: services/compact/sessionMemoryCompact.ts:613][I]

cached microcompact 不修改 local messages, 而是把 deletion 作为 cache edits 排到 API layer, 这是为了减少 prompt cache invalidation; time-based microcompact 则在 cache 可能已经冷掉时直接改本地 messages。[E: services/compact/microCompact.ts:338][E: services/compact/microCompact.ts:386][E: services/compact/microCompact.ts:483][E: services/compact/microCompact.ts:529][I]

## Gotcha

- `buildPostCompactMessages()` 是所有 compaction result 的 ordering contract;新增 compaction path 时应返回 `CompactionResult`, 而不是手写 post-compact message 顺序。[E: services/compact/compact.ts:332][E: services/compact/compact.ts:333][E: services/compact/compact.ts:334][E: services/compact/compact.ts:335][E: services/compact/compact.ts:336]
- `runPostCompactCleanup()` 主要清理 microcompact、system prompt、classifier、beta tracing 和 session message cache; invoked skills 的 post-compact 恢复依赖 full compact 创建 skill attachment, 不是 cleanup 的显式重置动作。[E: services/compact/postCompactCleanup.ts:31][E: services/compact/postCompactCleanup.ts:62][E: services/compact/postCompactCleanup.ts:70][E: services/compact/compact.ts:558][I]
- time-based microcompact 把 keepRecent floor 到 1;配置成 0 不会清空所有 tool results。[E: services/compact/microCompact.ts:461]

## Sources

- `services/compact/autoCompact.ts`
- `services/compact/compact.ts`
- `services/compact/microCompact.ts`
- `services/compact/sessionMemoryCompact.ts`
- `services/compact/postCompactCleanup.ts`

## 相关

- [Context and compaction](../spine/context-and-compaction.md)
- [Agent loop](../spine/agent-loop.md)
- [模型与 API 层](model-api.md)
