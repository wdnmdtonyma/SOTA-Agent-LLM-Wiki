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
  - specs/v2/session.md
symbols:
  - SessionCompaction
  - SessionCompaction.create
  - SessionCompaction.process
  - SessionCompaction.prune
  - SessionCompaction.isOverflow
  - isOverflow
  - usable
  - SessionSummary.computeDiff
  - MessageV2.filterCompacted
related:
  - session-v2.compaction
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 compaction 是 `SessionPrompt.runLoop` 内的历史缩短机制: overflow 或 queued compaction 会写一个 V1 compaction user part，下一轮用 compaction agent 生成 summary assistant，随后由 `MessageV2.filterCompacted` 选择 provider request 的 active history。

## 能回答的问题
- V1 什么时候判定上下文溢出并触发 auto compaction?
- `SessionCompaction.create` 写入的 compaction user part 长什么样?
- `SessionCompaction.process` 怎样选择 head、tail、previous summary 和 replay prompt?
- V1 prune 只清哪些旧 tool output?
- V1 compaction 与 V2 `session-v2.compaction` 的模型表示差异在哪里?

## 职责边界

`SessionCompaction.Interface` 暴露四个操作: `isOverflow`、`prune`、`process`、`create`。[E: packages/opencode/src/session/compaction.ts:130][E: packages/opencode/src/session/compaction.ts:135][E: packages/opencode/src/session/compaction.ts:136][E: packages/opencode/src/session/compaction.ts:143] service tag 是 `@opencode/SessionCompaction`。[E: packages/opencode/src/session/compaction.ts:152]

V1 overflow 判断在 `overflow.ts`: `compaction.auto === false` 或 model context 为 0 时不 overflow；token count 使用 `tokens.total`，否则使用 input+output+cache.read+cache.write；最终比较 `count >= usable(input)`。[E: packages/opencode/src/session/overflow.ts:28][E: packages/opencode/src/session/overflow.ts:29][E: packages/opencode/src/session/overflow.ts:31][E: packages/opencode/src/session/overflow.ts:33]

`usable(input)` 对有 `model.limit.input` 的模型从 input limit 扣掉 reserved；reserved 来自 config `compaction.reserved`，否则取 `min(20_000, ProviderTransform.maxOutputTokens(...))`。没有 input limit 时 usable context 是 context 减 max output tokens。[E: packages/opencode/src/session/overflow.ts:14][E: packages/opencode/src/session/overflow.ts:16][E: packages/opencode/src/session/overflow.ts:17][E: packages/opencode/src/session/overflow.ts:19]

## 数据模型与常量

| 名称 | 值/来源 | 含义 |
|---|---|---|
| `PRUNE_MINIMUM` | `20_000` | 旧 tool output 被估算可释放超过此值才实际标记 compacted。[E: packages/opencode/src/session/compaction.ts:28][E: packages/opencode/src/session/compaction.ts:278] |
| `PRUNE_PROTECT` | `40_000` | prune 从后往前累计 tool output，先保护最近约 40k token。[E: packages/opencode/src/session/compaction.ts:29][E: packages/opencode/src/session/compaction.ts:271] |
| `TOOL_OUTPUT_MAX_CHARS` | `2_000` | summary prompt 构建时 tool output preview 最大字符数。[E: packages/opencode/src/session/compaction.ts:30][E: packages/opencode/src/session/compaction.ts:353] |
| `DEFAULT_TAIL_TURNS` | `2` | 没有 config override 时 select 以最近 2 个 user turns 作为 tail candidate。[E: packages/opencode/src/session/compaction.ts:32][E: packages/opencode/src/session/compaction.ts:193][E: packages/opencode/src/session/compaction.ts:198] |
| `MIN/MAX_PRESERVE_RECENT_TOKENS` | `2_000` / `8_000` | tail budget fallback clamp，默认取 usable context 的 25%。[E: packages/opencode/src/session/compaction.ts:33][E: packages/opencode/src/session/compaction.ts:34][E: packages/opencode/src/session/compaction.ts:83] |
| `CompactionPart` | `type: "compaction"`, `auto`, `overflow`, optional `tail_start_id` | queued compaction 是 V1 user message 的 part；summary 成功后可能写入 retained tail 起点。[E: packages/opencode/src/session/compaction.ts:528][E: packages/opencode/src/session/compaction.ts:532][E: packages/opencode/src/session/compaction.ts:534][E: packages/opencode/src/session/compaction.ts:415][E: packages/opencode/src/session/compaction.ts:418] |

## 控制流

1. provider stream 的 `step-finish` 事件会计算 usage，写 step-finish part，更新 assistant tokens；如果 assistant 不是 summary 且 `isOverflow(...)` 命中，`ctx.needsCompaction = true`。[E: packages/opencode/src/session/processor.ts:433][E: packages/opencode/src/session/processor.ts:436][E: packages/opencode/src/session/processor.ts:444][E: packages/opencode/src/session/processor.ts:476][E: packages/opencode/src/session/processor.ts:477][E: packages/opencode/src/session/processor.ts:479]

2. provider/adapter 抛 context overflow 时，`SessionProcessor.halt` 用 `MessageV2.fromError(...)` parse error。若 `compaction.auto === false` 且 assistant 不是 summary，它把 assistant 置为 terminal error 并设 idle；否则设置 `ctx.needsCompaction = true` 并发布 session error。[E: packages/opencode/src/session/processor.ts:117][E: packages/opencode/src/session/processor.ts:604][E: packages/opencode/src/session/processor.ts:605][E: packages/opencode/src/session/processor.ts:606][E: packages/opencode/src/session/processor.ts:607][E: packages/opencode/src/session/processor.ts:613][E: packages/opencode/src/session/processor.ts:614]

3. `SessionProcessor.process` stream drain 会 `Stream.takeUntil(() => ctx.needsCompaction)`；drain 后若 `ctx.needsCompaction` 为真返回 `"compact"`。[E: packages/opencode/src/session/processor.ts:640][E: packages/opencode/src/session/processor.ts:642][E: packages/opencode/src/session/processor.ts:677]

4. `SessionPrompt.runLoop` 收到 processor result `"compact"` 后调用 `compaction.create({ auto: true, overflow: !handle.message.finish })`，然后继续下一轮。[E: packages/opencode/src/session/prompt.ts:1319][E: packages/opencode/src/session/prompt.ts:1320][E: packages/opencode/src/session/prompt.ts:1325][E: packages/opencode/src/session/prompt.ts:1328]

5. 每轮 run loop 在正常 provider call 之前也会检查 `lastFinished`；如果 finished assistant 不是 summary 且 `compaction.isOverflow(...)` 命中，它创建 auto compaction task 并 continue。[E: packages/opencode/src/session/prompt.ts:1161][E: packages/opencode/src/session/prompt.ts:1163][E: packages/opencode/src/session/prompt.ts:1164][E: packages/opencode/src/session/prompt.ts:1166]

6. `SessionCompaction.create` 写一个新的 user message，再写 `type: "compaction"` part，part 携带 `auto` 和 `overflow`。[E: packages/opencode/src/session/compaction.ts:520][E: packages/opencode/src/session/compaction.ts:522][E: packages/opencode/src/session/compaction.ts:528][E: packages/opencode/src/session/compaction.ts:532][E: packages/opencode/src/session/compaction.ts:533][E: packages/opencode/src/session/compaction.ts:534]

7. 下一轮 `runLoop` pop 到 `task?.type === "compaction"` 时调用 `compaction.process({ messages, parentID: lastUser.id, sessionID, auto, overflow })`，`result === "stop"` 时 break，否则 continue。[E: packages/opencode/src/session/prompt.ts:1149][E: packages/opencode/src/session/prompt.ts:1150][E: packages/opencode/src/session/prompt.ts:1152][E: packages/opencode/src/session/prompt.ts:1157][E: packages/opencode/src/session/prompt.ts:1158]

8. `processCompaction` 要求 parent 是 user message，并读取 parent 上的 compaction part；overflow 模式会向前找最近一个非 compaction user message 作为 replay，同时把待总结 messages 截断到 replay 之前；如果截断后没有更早的 non-compaction user content，就取消 replay 并恢复完整 messages。[E: packages/opencode/src/session/compaction.ts:296][E: packages/opencode/src/session/compaction.ts:298][E: packages/opencode/src/session/compaction.ts:301][E: packages/opencode/src/session/compaction.ts:310][E: packages/opencode/src/session/compaction.ts:315][E: packages/opencode/src/session/compaction.ts:316][E: packages/opencode/src/session/compaction.ts:320][E: packages/opencode/src/session/compaction.ts:323][E: packages/opencode/src/session/compaction.ts:324]

9. compaction agent 选择 agent `"compaction"`；如果 agent 有 model 用 agent model，否则复用 user message model。[E: packages/opencode/src/session/compaction.ts:328][E: packages/opencode/src/session/compaction.ts:330][E: packages/opencode/src/session/compaction.ts:331]

10. `select` 以 configured `tail_turns` 和 `preserve_recent_tokens`/fallback budget 选择需要总结的 head 与可保留的 `tail_start_id`；当最近完整 turns 超预算时，它尝试在一个 turn 内 `splitTurn` 找可保留尾部。[E: packages/opencode/src/session/compaction.ts:193][E: packages/opencode/src/session/compaction.ts:195][E: packages/opencode/src/session/compaction.ts:198][E: packages/opencode/src/session/compaction.ts:220][E: packages/opencode/src/session/compaction.ts:227][E: packages/opencode/src/session/compaction.ts:236][E: packages/opencode/src/session/compaction.ts:237]

11. `processCompaction` 计算 completed compaction history、隐藏已完成 compaction 的 user/assistant pair、读取 previous summary，触发 `experimental.session.compacting` plugin hook，然后用 hook prompt 或 core `buildPrompt({ previousSummary, context })` 作为 summary prompt。[E: packages/opencode/src/session/compaction.ts:334][E: packages/opencode/src/session/compaction.ts:335][E: packages/opencode/src/session/compaction.ts:336][E: packages/opencode/src/session/compaction.ts:343][E: packages/opencode/src/session/compaction.ts:348]

12. summary prompt 的历史输入来自 `MessageV2.toModelMessagesEffect(msgs, model, { stripMedia: true, toolOutputMaxChars: TOOL_OUTPUT_MAX_CHARS })`。[E: packages/opencode/src/session/compaction.ts:351][E: packages/opencode/src/session/compaction.ts:352][E: packages/opencode/src/session/compaction.ts:353]

13. compaction 自身创建 `summary: true` assistant message，并用 `SessionProcessor` 执行一次无工具、无 system 的 model call；输入 messages 是 selected head 的 model messages 加一条 user summary prompt。[E: packages/opencode/src/session/compaction.ts:356][E: packages/opencode/src/session/compaction.ts:364][E: packages/opencode/src/session/compaction.ts:383][E: packages/opencode/src/session/compaction.ts:388][E: packages/opencode/src/session/compaction.ts:392][E: packages/opencode/src/session/compaction.ts:394][E: packages/opencode/src/session/compaction.ts:398]

14. 如果 compaction model call 自己返回 `"compact"`，V1 将 summary assistant 标为 `ContextOverflowError`、finish=`"error"` 并返回 `"stop"`，避免递归压缩。[E: packages/opencode/src/session/compaction.ts:404][E: packages/opencode/src/session/compaction.ts:405][E: packages/opencode/src/session/compaction.ts:410][E: packages/opencode/src/session/compaction.ts:412]

15. compaction 成功且 auto 时，overflow replay 会克隆原始 user prompt；非 replay auto compaction 可能追加 synthetic continue user message，其文本要求模型继续下一步或请求澄清。[E: packages/opencode/src/session/compaction.ts:422][E: packages/opencode/src/session/compaction.ts:423][E: packages/opencode/src/session/compaction.ts:425][E: packages/opencode/src/session/compaction.ts:438][E: packages/opencode/src/session/compaction.ts:473][E: packages/opencode/src/session/compaction.ts:485][E: packages/opencode/src/session/compaction.ts:486][E: packages/opencode/src/session/compaction.ts:495]

16. compaction 成功且 processor result 是 `"continue"` 时发布 `SessionCompactionEvent.Compacted` via `EventV2Bridge`；8b68dc0d7 的 V1 compaction code 不再包含旧节点描述的 `Compaction.Started/Ended` experimental publish path。[E: packages/opencode/src/session/compaction.ts:506][E: packages/opencode/src/session/compaction.ts:508][I]

## active history 过滤

`MessageV2.filterCompacted` 从数据库 stream 中找 completed summary assistant 和 compaction user part；如果 compaction part 有 `tail_start_id`，它把 active model history 重排成 compaction user、summary assistant、retained tail、后续消息。[E: packages/opencode/src/session/message-v2.ts:521][E: packages/opencode/src/session/message-v2.ts:531][E: packages/opencode/src/session/message-v2.ts:541][E: packages/opencode/src/session/message-v2.ts:563][E: packages/opencode/src/session/message-v2.ts:565]

`MessageV2.latest` 用 max message id 找 latest user/assistant/finished；queued tasks 只来自最新 finished assistant 之后的 compaction/subtask parts。[E: packages/opencode/src/session/message-v2.ts:585][E: packages/opencode/src/session/message-v2.ts:591][E: packages/opencode/src/session/message-v2.ts:593][E: packages/opencode/src/session/message-v2.ts:595][E: packages/opencode/src/session/message-v2.ts:598]

## prune 与 diff summary

`SessionCompaction.prune` 只有 config `compaction.prune` 打开才运行；它从最新消息向前扫描，跳过最近两个 user turns，遇到 summary assistant、已 compacted tool output 或 protected `skill` tool 时停止或跳过。[E: packages/opencode/src/session/compaction.ts:243][E: packages/opencode/src/session/compaction.ts:245][E: packages/opencode/src/session/compaction.ts:258][E: packages/opencode/src/session/compaction.ts:261][E: packages/opencode/src/session/compaction.ts:262][E: packages/opencode/src/session/compaction.ts:267][E: packages/opencode/src/session/compaction.ts:268]

实际 prune 不是删除 part，而是在 completed tool part 的 `state.time.compacted` 上写时间戳；`MessageV2.toModelMessagesEffect` 看到该字段会把旧 output 替换成 `[Old tool result content cleared]`。[E: packages/opencode/src/session/compaction.ts:280][E: packages/opencode/src/session/compaction.ts:281][E: packages/opencode/src/session/message-v2.ts:293][E: packages/opencode/src/session/message-v2.ts:294]

`SessionSummary.computeDiff` 与 compaction summary 不是同一个 summary: `computeDiff` 根据 step-start/step-finish snapshot 计算文件 diff；`summarize` 调用它后把 diff 写回 user message summary。[E: packages/opencode/src/session/summary.ts:82][E: packages/opencode/src/session/summary.ts:88][E: packages/opencode/src/session/summary.ts:95][E: packages/opencode/src/session/summary.ts:98][E: packages/opencode/src/session/summary.ts:124][E: packages/opencode/src/session/summary.ts:125][E: packages/opencode/src/session/summary.ts:126]

## V1 与 V2 对照

V1 compaction 的 durable model representation 仍是 V1 message/part history: queued compaction 是 user part，summary 是 assistant message，active history 由 `MessageV2.filterCompacted` 在读模型时重排。[E: packages/opencode/src/session/compaction.ts:520][E: packages/opencode/src/session/compaction.ts:532][E: packages/opencode/src/session/compaction.ts:356][E: packages/opencode/src/session/message-v2.ts:565]

V2 spec 的目标则是保持 full transcript durable，但把 active model representation 替换为一个 checkpoint；completed compaction event 才投影模型可见 checkpoint，失败或中断不会切换历史边界。[E: specs/v2/session.md:111][E: specs/v2/session.md:113] 因此本节点描述的是 V1 当前活跑路径，V2 细节属于 `session-v2.compaction`。

## gotcha

- `SessionCompaction.create` 只创建 queued compaction part，不直接生成 summary；真正 summary generation 发生在下一轮 `runLoop` pop 到 compaction task 后。[E: packages/opencode/src/session/compaction.ts:520][E: packages/opencode/src/session/compaction.ts:528][E: packages/opencode/src/session/compaction.ts:532][E: packages/opencode/src/session/prompt.ts:1149][E: packages/opencode/src/session/prompt.ts:1150]
- compaction summary assistant 禁止 tool call，因为 processor 在 summary assistant 的 `tool-input-start` 和 `tool-call` path 都会抛错。[E: packages/opencode/src/session/processor.ts:313][E: packages/opencode/src/session/processor.ts:315][E: packages/opencode/src/session/processor.ts:329][E: packages/opencode/src/session/processor.ts:331]
- overflow replay 会把 media file part 降级成 text `[Attached mime: filename]`，避免压缩后继续携带过大的 media payload。[E: packages/opencode/src/session/compaction.ts:439][E: packages/opencode/src/session/compaction.ts:440]

## Sources

- `packages/opencode/src/session/compaction.ts`
- `packages/opencode/src/session/overflow.ts`
- `packages/opencode/src/session/summary.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/session/processor.ts`
- `packages/opencode/src/session/message-v2.ts`
- `specs/v2/session.md`

## 相关

- [session-v2.compaction](../session-v2/compaction.md)
