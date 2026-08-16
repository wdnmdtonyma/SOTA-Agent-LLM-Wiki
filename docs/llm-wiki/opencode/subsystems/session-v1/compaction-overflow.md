---
id: session-v1.compaction-overflow
title: V1 压缩/剪枝/溢出
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/session/compaction.ts
  - packages/opencode/src/session/overflow.ts
  - packages/opencode/src/session/summary.ts
  - packages/opencode/src/session/prompt.ts
  - packages/opencode/src/session/processor.ts
  - packages/opencode/src/session/message-v2.ts
  - packages/core/src/session/compaction.ts
  - packages/schema/src/v1/session.ts
  - packages/core/src/v1/config/config.ts
  - specs/v2/session.md
symbols:
  - SessionCompaction
  - SessionCompaction.create
  - SessionCompaction.process
  - SessionCompaction.prune
  - SessionCompaction.isOverflow
  - serialize
  - buildPrompt
  - isOverflow
  - usable
  - SessionSummary.computeDiff
  - MessageV2.filterCompacted
related:
  - session-v2.compaction
evidence: explicit
status: verified
updated: 3fd77ae980
---

> V1 compaction 是 `SessionPrompt.runLoop` 内的历史缩短机制: overflow 或 queued compaction 会写一个 V1 compaction user part，下一轮用 compaction agent 生成 summary assistant。summary prompt 现在把 head history `serialize` 成 orphaned transcript，再复用 V2 `buildPrompt`；随后由 `MessageV2.filterCompacted` 选择 provider request 的 active history。

## 能回答的问题
- V1 什么时候判定上下文溢出并触发 auto compaction?
- `SessionCompaction.create` 写入的 compaction user part 长什么样?
- `SessionCompaction.process` 怎样选择 head、tail、previous summary，并把历史 serialize 进 summary prompt?
- V1 prune 只清哪些旧 tool output?
- V1 compaction 与 V2 `session-v2.compaction` 的模型表示差异在哪里?

## 职责边界

`SessionCompaction.Interface` 暴露四个操作: `isOverflow`、`prune`、`process`、`create`。[E: packages/opencode/src/session/compaction.ts:166][E: packages/opencode/src/session/compaction.ts:170][E: packages/opencode/src/session/compaction.ts:171][E: packages/opencode/src/session/compaction.ts:178] service tag 是 `@opencode/SessionCompaction`。[E: packages/opencode/src/session/compaction.ts:187]

V1 overflow 判断在 `overflow.ts`: `compaction.auto === false` 或 model context 为 0 时不 overflow；token count 使用 `tokens.total`，否则使用 input+output+cache.read+cache.write；最终比较 `count >= usable(input)`。[E: packages/opencode/src/session/overflow.ts:28][E: packages/opencode/src/session/overflow.ts:29][E: packages/opencode/src/session/overflow.ts:31][E: packages/opencode/src/session/overflow.ts:33]

`usable(input)` 对有 `model.limit.input` 的模型从 input limit 扣掉 reserved；reserved 来自 config `compaction.reserved`，否则取 `min(20_000, ProviderTransform.maxOutputTokens(...))`。没有 input limit 时 usable context 是 context 减 max output tokens。[E: packages/opencode/src/session/overflow.ts:14][E: packages/opencode/src/session/overflow.ts:16][E: packages/opencode/src/session/overflow.ts:17][E: packages/opencode/src/session/overflow.ts:19]

## 数据模型与常量

| 名称 | 值/来源 | 含义 |
|---|---|---|
| `PRUNE_MINIMUM` | `20_000` | 旧 tool output 被估算可释放超过此值才实际标记 compacted。[E: packages/opencode/src/session/compaction.ts:28][E: packages/opencode/src/session/compaction.ts:308] |
| `PRUNE_PROTECT` | `40_000` | prune 从后往前累计 tool output，先保护最近约 40k token。[E: packages/opencode/src/session/compaction.ts:29][E: packages/opencode/src/session/compaction.ts:301] |
| `TOOL_OUTPUT_MAX_CHARS` | `2_000` | `serialize()` 里 tool/shell output preview 最大字符数。[E: packages/opencode/src/session/compaction.ts:30][E: packages/opencode/src/session/compaction.ts:52] |
| `MIN/MAX_PRESERVE_RECENT_TOKENS` | `2_000` / `15_000` | tail budget fallback clamp，默认取 usable context 的 25%。[E: packages/opencode/src/session/compaction.ts:32][E: packages/opencode/src/session/compaction.ts:33][E: packages/opencode/src/session/compaction.ts:118] |
| `tail_turns` | config optional | 未配置时 `select` 用全部 non-compaction user turns 作 candidate，只受 token budget 限制；`<= 0` 时不保留 tail。[E: packages/opencode/src/session/compaction.ts:228][E: packages/opencode/src/session/compaction.ts:229][E: packages/opencode/src/session/compaction.ts:233][E: packages/core/src/v1/config/config.ts:157][E: packages/core/src/v1/config/config.ts:159] |
| `CompactionPart` | `type: "compaction"`, `auto`, optional `overflow`, optional `tail_start_id` | queued compaction 是 V1 user message 的 part；summary 成功后可能写入 retained tail 起点。[E: packages/schema/src/v1/session.ts:195][E: packages/schema/src/v1/session.ts:198][E: packages/schema/src/v1/session.ts:199][E: packages/schema/src/v1/session.ts:200][E: packages/opencode/src/session/compaction.ts:461][E: packages/opencode/src/session/compaction.ts:464] |

当前源码已经没有名为 `DEFAULT_TAIL_TURNS` 的常量；默认行为是“只受 preserve-recent token budget 限制”，不再硬编码最近 2 个 user turns。[E: packages/opencode/src/session/compaction.ts:228][E: packages/opencode/src/session/compaction.ts:233][E: packages/core/src/v1/config/config.ts:159]

## 控制流

1. provider stream 的 `step-finish` 事件会计算 usage，写 step-finish part，更新 assistant tokens；如果 assistant 不是 summary 且 `isOverflow(...)` 命中，`ctx.needsCompaction = true`。[E: packages/opencode/src/session/processor.ts:435][E: packages/opencode/src/session/processor.ts:438][E: packages/opencode/src/session/processor.ts:446][E: packages/opencode/src/session/processor.ts:478][E: packages/opencode/src/session/processor.ts:479][E: packages/opencode/src/session/processor.ts:481]

2. provider/adapter 抛 context overflow 时，`SessionProcessor.halt` 用 `MessageV2.fromError(...)` parse error。若 `compaction.auto === false` 且 assistant 不是 summary，它把 assistant 置为 terminal error 并设 idle；否则设置 `ctx.needsCompaction = true` 并发布 session error。[E: packages/opencode/src/session/processor.ts:117][E: packages/opencode/src/session/processor.ts:606][E: packages/opencode/src/session/processor.ts:607][E: packages/opencode/src/session/processor.ts:608][E: packages/opencode/src/session/processor.ts:609][E: packages/opencode/src/session/processor.ts:615][E: packages/opencode/src/session/processor.ts:616]

3. `SessionProcessor.process` stream drain 会 `Stream.takeUntil(() => ctx.needsCompaction)`；drain 后若 `ctx.needsCompaction` 为真返回 `"compact"`。[E: packages/opencode/src/session/processor.ts:642][E: packages/opencode/src/session/processor.ts:644][E: packages/opencode/src/session/processor.ts:679]

4. `SessionPrompt.runLoop` 收到 processor result `"compact"` 后调用 `compaction.create({ auto: true, overflow: !handle.message.finish })`，然后继续下一轮。[E: packages/opencode/src/session/prompt.ts:1320][E: packages/opencode/src/session/prompt.ts:1321][E: packages/opencode/src/session/prompt.ts:1326][E: packages/opencode/src/session/prompt.ts:1329]

5. 每轮 run loop 在正常 provider call 之前也会检查 `lastFinished`；如果 finished assistant 不是 summary 且 `compaction.isOverflow(...)` 命中，它创建 auto compaction task 并 continue。[E: packages/opencode/src/session/prompt.ts:1161][E: packages/opencode/src/session/prompt.ts:1163][E: packages/opencode/src/session/prompt.ts:1164][E: packages/opencode/src/session/prompt.ts:1166]

6. `SessionCompaction.create` 写一个新的 user message，再写 `type: "compaction"` part，part 携带 `auto` 和 `overflow`。[E: packages/opencode/src/session/compaction.ts:566][E: packages/opencode/src/session/compaction.ts:568][E: packages/opencode/src/session/compaction.ts:574][E: packages/opencode/src/session/compaction.ts:578][E: packages/opencode/src/session/compaction.ts:579][E: packages/opencode/src/session/compaction.ts:580]

7. 下一轮 `runLoop` pop 到 `task?.type === "compaction"` 时调用 `compaction.process({ messages, parentID: lastUser.id, sessionID, auto, overflow })`，`result === "stop"` 时 break，否则 continue。[E: packages/opencode/src/session/prompt.ts:1149][E: packages/opencode/src/session/prompt.ts:1150][E: packages/opencode/src/session/prompt.ts:1152][E: packages/opencode/src/session/prompt.ts:1157][E: packages/opencode/src/session/prompt.ts:1158]

8. `processCompaction` 要求 parent 是 user message，并读取 parent 上的 compaction part；overflow 模式会向前找最近一个非 compaction user message 作为 replay，同时把待总结 messages 截断到 replay 之前；如果截断后没有更早的 non-compaction user content，就取消 replay 并恢复完整 messages。[E: packages/opencode/src/session/compaction.ts:326][E: packages/opencode/src/session/compaction.ts:327][E: packages/opencode/src/session/compaction.ts:331][E: packages/opencode/src/session/compaction.ts:340][E: packages/opencode/src/session/compaction.ts:344][E: packages/opencode/src/session/compaction.ts:346][E: packages/opencode/src/session/compaction.ts:350][E: packages/opencode/src/session/compaction.ts:353][E: packages/opencode/src/session/compaction.ts:354]

9. compaction agent 选择 agent `"compaction"`；如果 agent 有 model 用 agent model，否则复用 user message model。[E: packages/opencode/src/session/compaction.ts:358][E: packages/opencode/src/session/compaction.ts:360][E: packages/opencode/src/session/compaction.ts:361]

10. `select` 以 configured `tail_turns`（未配置则用全部 turns）和 `preserve_recent_tokens`/fallback budget 选择需要总结的 head 与可保留的 `tail_start_id`；当最近完整 turns 超预算时，它尝试在一个 turn 内 `splitTurn` 找可保留尾部。[E: packages/opencode/src/session/compaction.ts:228][E: packages/opencode/src/session/compaction.ts:230][E: packages/opencode/src/session/compaction.ts:233][E: packages/opencode/src/session/compaction.ts:250][E: packages/opencode/src/session/compaction.ts:257][E: packages/opencode/src/session/compaction.ts:266][E: packages/opencode/src/session/compaction.ts:267]

11. `processCompaction` 计算 completed compaction history、隐藏已完成 compaction 的 user/assistant pair、读取 previous summary，触发 `experimental.session.compacting` plugin hook，然后用 hook prompt 或 core `buildPrompt({ previousSummary, context })` 作为 summary prompt。[E: packages/opencode/src/session/compaction.ts:364][E: packages/opencode/src/session/compaction.ts:365][E: packages/opencode/src/session/compaction.ts:366][E: packages/opencode/src/session/compaction.ts:373][E: packages/opencode/src/session/compaction.ts:382][E: packages/opencode/src/session/compaction.ts:384]

12. summary 的历史输入不再走 `MessageV2.toModelMessagesEffect`。V1 先 `serialize` selected head 成 orphaned transcript，再交给共享 `buildPrompt`；plugin 若替换了 prompt，才会把 conversation 作为附加 “The following is the conversation history:” 文本拼回去。[E: packages/opencode/src/session/compaction.ts:54][E: packages/opencode/src/session/compaction.ts:380][E: packages/opencode/src/session/compaction.ts:384][E: packages/core/src/session/compaction.ts:160][E: packages/opencode/src/session/compaction.ts:439]

13. compaction 自身创建 `summary: true` assistant message，并用 `SessionProcessor` 执行一次无工具、无 system 的 model call；输入 messages 是**一条** user message，content 为 `nextPrompt`（必要时再附 conversation）。[E: packages/opencode/src/session/compaction.ts:393][E: packages/opencode/src/session/compaction.ts:401][E: packages/opencode/src/session/compaction.ts:420][E: packages/opencode/src/session/compaction.ts:425][E: packages/opencode/src/session/compaction.ts:429][E: packages/opencode/src/session/compaction.ts:431]

14. 如果 compaction model call 自己返回 `"compact"`，V1 将 summary assistant 标为 `ContextOverflowError`、finish=`"error"` 并返回 `"stop"`，避免递归压缩。[E: packages/opencode/src/session/compaction.ts:450][E: packages/opencode/src/session/compaction.ts:451][E: packages/opencode/src/session/compaction.ts:456][E: packages/opencode/src/session/compaction.ts:458]

15. compaction 成功且 auto 时，overflow replay 会克隆原始 user prompt；非 replay auto compaction 可能追加 synthetic continue user message，其文本要求模型继续下一步或请求澄清。[E: packages/opencode/src/session/compaction.ts:468][E: packages/opencode/src/session/compaction.ts:469][E: packages/opencode/src/session/compaction.ts:471][E: packages/opencode/src/session/compaction.ts:485][E: packages/opencode/src/session/compaction.ts:519][E: packages/opencode/src/session/compaction.ts:531][E: packages/opencode/src/session/compaction.ts:497][E: packages/opencode/src/session/compaction.ts:540]

16. compaction layer 从 `EventV2Bridge.Service` 取得 publisher；compaction 成功且 processor result 是 `"continue"` 时发布 `SessionCompactionEvent.Compacted`（本模块的 `Event` alias）via bridge。目标源码的 V1 compaction code 不再包含旧节点描述的 `Compaction.Started/Ended` experimental publish path。[E: packages/opencode/src/session/compaction.ts:20][E: packages/opencode/src/session/compaction.ts:24][E: packages/opencode/src/session/compaction.ts:26][E: packages/opencode/src/session/compaction.ts:200][E: packages/opencode/src/session/compaction.ts:553][E: packages/opencode/src/session/compaction.ts:554][I]

## serialize 与共享 summary prompt

V1 `serialize(message)` 把 user/assistant parts 收成 plain-text transcript: user text + `[Attached mime: filename]`，assistant text/reasoning，以及 bounded tool call/result 或 `[Old tool result content cleared]`。[E: packages/opencode/src/session/compaction.ts:54][E: packages/opencode/src/session/compaction.ts:61][E: packages/opencode/src/session/compaction.ts:68][E: packages/opencode/src/session/compaction.ts:71][E: packages/opencode/src/session/compaction.ts:76][E: packages/opencode/src/session/compaction.ts:81]

这与 V2 `packages/core/src/session/compaction.ts` 的 `serialize` 是同构的 orphaned-history 表示，但 V1 仍读取 V1 `SessionV1.WithParts`，不是 V2 `SessionMessage`。[E: packages/core/src/session/compaction.ts:95][E: packages/core/src/session/compaction.ts:98][E: packages/core/src/session/compaction.ts:103]

`buildPrompt` 从 V2 compaction 模块 import；有 previous summary 时输出 update-anchored instructions + `SUMMARY_TEMPLATE`，否则 create new anchored summary。[E: packages/opencode/src/session/compaction.ts:23][E: packages/core/src/session/compaction.ts:160][E: packages/core/src/session/compaction.ts:163][E: packages/core/src/session/compaction.ts:166][E: packages/core/src/session/compaction.ts:171][E: packages/core/src/session/compaction.ts:172]

`select` 的 token estimate 仍调用 `MessageV2.toModelMessagesEffect`，但这只用于 tail budget，不再作为 summary model request 的消息体。[E: packages/opencode/src/session/compaction.ts:219][E: packages/opencode/src/session/compaction.ts:240]

## active history 过滤

`MessageV2.filterCompacted` 从数据库 stream 中找 completed summary assistant 和 compaction user part；如果 compaction part 有 `tail_start_id`，它把 active model history 重排成 compaction user、summary assistant、retained tail、后续消息。[E: packages/opencode/src/session/message-v2.ts:521][E: packages/opencode/src/session/message-v2.ts:531][E: packages/opencode/src/session/message-v2.ts:541][E: packages/opencode/src/session/message-v2.ts:563][E: packages/opencode/src/session/message-v2.ts:565]

`MessageV2.latest` 不再用 max message id。`filterCompacted` 会重排数组，imported messages 也不保证单调 ID，所以 `latest` 用 `time.created` 比较，`id` 只做 tie-breaker；queued tasks 只来自 latest finished assistant **之后**（同样按 `isAfter`）的 compaction/subtask parts。[E: packages/opencode/src/session/message-v2.ts:582][E: packages/opencode/src/session/message-v2.ts:588][E: packages/opencode/src/session/message-v2.ts:590][E: packages/opencode/src/session/message-v2.ts:593][E: packages/opencode/src/session/message-v2.ts:600][E: packages/opencode/src/session/message-v2.ts:602]

## prune 与 diff summary

`SessionCompaction.prune` 只有 config `compaction.prune` 打开才运行；它从最新消息向前扫描，跳过最近两个 user turns，遇到 summary assistant、已 compacted tool output 或 protected `skill` tool 时停止或跳过。[E: packages/opencode/src/session/compaction.ts:273][E: packages/opencode/src/session/compaction.ts:275][E: packages/opencode/src/session/compaction.ts:288][E: packages/opencode/src/session/compaction.ts:291][E: packages/opencode/src/session/compaction.ts:292][E: packages/opencode/src/session/compaction.ts:297][E: packages/opencode/src/session/compaction.ts:298]

实际 prune 不是删除 part，而是在 completed tool part 的 `state.time.compacted` 上写时间戳；`MessageV2.toModelMessagesEffect` 看到该字段会把旧 output 替换成 `[Old tool result content cleared]`。[E: packages/opencode/src/session/compaction.ts:310][E: packages/opencode/src/session/compaction.ts:311][E: packages/opencode/src/session/message-v2.ts:293][E: packages/opencode/src/session/message-v2.ts:294]

`SessionSummary.computeDiff` 与 compaction summary 不是同一个 summary: `computeDiff` 根据 step-start/step-finish snapshot 计算文件 diff；`summarize` 调用它后把 diff 写回 user message summary。[E: packages/opencode/src/session/summary.ts:82][E: packages/opencode/src/session/summary.ts:88][E: packages/opencode/src/session/summary.ts:95][E: packages/opencode/src/session/summary.ts:98][E: packages/opencode/src/session/summary.ts:124][E: packages/opencode/src/session/summary.ts:125][E: packages/opencode/src/session/summary.ts:126]

## V1 与 V2 对照

V1 compaction 的 durable model representation 仍是 V1 message/part history: queued compaction 是 user part，summary 是 assistant message，active history 由 `MessageV2.filterCompacted` 在读模型时重排。[E: packages/opencode/src/session/compaction.ts:566][E: packages/opencode/src/session/compaction.ts:578][E: packages/opencode/src/session/compaction.ts:393][E: packages/opencode/src/session/message-v2.ts:565]

V1 现在复用 V2 的 `buildPrompt` / `SUMMARY_TEMPLATE`，并且用本地 `serialize` 把 head history 收成 transcript；这只共享 summary 文本结构，不改变 V1 的 message/part 存储，也不等于 SessionV2 已是默认路径。[E: packages/opencode/src/session/compaction.ts:23][E: packages/opencode/src/session/compaction.ts:380][E: packages/core/src/session/compaction.ts:16][E: packages/core/src/session/compaction.ts:160]

V2 spec 的目标则是保持 full transcript durable，但把 active model representation 替换为一个 checkpoint；completed compaction event 才投影模型可见 checkpoint，失败或中断不会切换历史边界。[E: specs/v2/session.md:115][E: specs/v2/session.md:117] 因此本节点描述的是 V1 当前活跑路径，V2 细节属于 `session-v2.compaction`。

## gotcha

- `SessionCompaction.create` 只创建 queued compaction part，不直接生成 summary；真正 summary generation 发生在下一轮 `runLoop` pop 到 compaction task 后。[E: packages/opencode/src/session/compaction.ts:566][E: packages/opencode/src/session/compaction.ts:574][E: packages/opencode/src/session/compaction.ts:578][E: packages/opencode/src/session/prompt.ts:1149][E: packages/opencode/src/session/prompt.ts:1150]
- compaction summary assistant 禁止 tool call，因为 processor 在 summary assistant 的 `tool-input-start` 和 `tool-call` path 都会抛错。[E: packages/opencode/src/session/processor.ts:315][E: packages/opencode/src/session/processor.ts:317][E: packages/opencode/src/session/processor.ts:331][E: packages/opencode/src/session/processor.ts:333]
- overflow replay 会把 media file part 降级成 text `[Attached mime: filename]`，避免压缩后继续携带过大的 media payload。[E: packages/opencode/src/session/compaction.ts:485][E: packages/opencode/src/session/compaction.ts:486]
- auto-continue part 带内部 `metadata.compaction_continue = true`，源码注释标明这不是稳定 plugin contract。[E: packages/opencode/src/session/compaction.ts:540]

## Sources

- `packages/opencode/src/session/compaction.ts`
- `packages/opencode/src/session/overflow.ts`
- `packages/opencode/src/session/summary.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/session/processor.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/core/src/session/compaction.ts`
- `packages/schema/src/v1/session.ts`
- `packages/core/src/v1/config/config.ts`
- `specs/v2/session.md`

## 相关

- [session-v2.compaction](../session-v2/compaction.md)
