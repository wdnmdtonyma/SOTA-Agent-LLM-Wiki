---
id: session-v1.processor
title: Stream processor 与 part 生命周期(V1)
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/session/processor.ts, packages/opencode/src/session/retry.ts, packages/opencode/src/session/status.ts, packages/opencode/src/session/message-v2.ts, packages/opencode/src/session/session.ts, packages/opencode/src/session/overflow.ts, packages/opencode/src/session/prompt.ts, packages/opencode/src/session/llm.ts, packages/opencode/src/session/tools.ts, packages/opencode/src/effect/runtime-flags.ts]
symbols: [SessionProcessor, SessionProcessor.create, SessionProcessor.Handle, DOOM_LOOP_THRESHOLD, SessionRetry.policy, SessionStatus]
related: [spine.v1-turn-loop, session-v1.llm-runtime]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> `SessionProcessor` 消费 `LLM.stream(...)` 产出的 `LLMEvent`,把 text/reasoning/tool/step/tool-error 等事件落成或更新 V1 message parts;provider/error paths 则更新 assistant/session error state,并在实验 flag 打开时临时镜像成 V2 `SessionEvent.*`。

## 能回答的问题
- `LLMEvent` 的 `text-start`/`text-delta`/`text-end` 怎样变成 V1 text part?
- tool-call、tool-result、tool-error 怎样更新 V1 tool part?
- doom-loop guard 为什么阈值是 3,它检查什么?
- provider overflow 为什么返回 `"compact"` 而不是普通 retry?
- `experimentalEventSystem` 打开后 processor 写了哪些 V2 dual-write event?

## 职责边界

`SessionProcessor.Handle` 暴露当前 assistant `message`,以及 `updateToolCall`、`completeToolCall` 和 `process(streamInput)` 三个操作;`SessionTools.resolve` 只需要这个 handle 的 message/tool-call 更新能力。[E: packages/opencode/src/session/processor.ts:38][E: packages/opencode/src/session/processor.ts:40][E: packages/opencode/src/session/processor.ts:44][E: packages/opencode/src/session/processor.ts:53][E: packages/opencode/src/session/tools.ts:28]

`ProcessorContext` 是一次 assistant message 的 mutable working set:它跟踪 active tool calls、snapshot、blocked 状态、`needsCompaction`、当前 text part、reasoning map 和当前 V2 assistant message id。[E: packages/opencode/src/session/processor.ts:76][E: packages/opencode/src/session/processor.ts:77][E: packages/opencode/src/session/processor.ts:79][E: packages/opencode/src/session/processor.ts:80][E: packages/opencode/src/session/processor.ts:81][E: packages/opencode/src/session/processor.ts:82][E: packages/opencode/src/session/processor.ts:84][E: packages/opencode/src/session/processor.ts:85]

`SessionProcessor.create` 在 LLM stream 之前捕获 snapshot,再设置 `mirrorAssistant = flags.experimentalEventSystem && !input.assistantMessage.summary`;因此 `summary: true` assistant 不会走 V2 assistant mirror。[E: packages/opencode/src/session/processor.ts:110][E: packages/opencode/src/session/processor.ts:114][E: packages/opencode/src/session/processor.ts:121][E: packages/opencode/src/session/processor.ts:129][E: packages/opencode/src/effect/runtime-flags.ts:48]

## 数据模型

| 结构 | 字段 | 生命周期 |
|---|---|---|
| `ToolCall` | `assistantMessageID`, `partID`, `done`, `inputEnded`, `raw` | `ensureToolCall` 为一个 tool call 创建 pending V1 tool part 与 deferred;tool input delta 累积到 `raw`;settle 后删除。[E: packages/opencode/src/session/processor.ts:66][E: packages/opencode/src/session/processor.ts:71][E: packages/opencode/src/session/processor.ts:72][E: packages/opencode/src/session/processor.ts:73][E: packages/opencode/src/session/processor.ts:138][E: packages/opencode/src/session/processor.ts:140][E: packages/opencode/src/session/processor.ts:326][E: packages/opencode/src/session/processor.ts:333][E: packages/opencode/src/session/processor.ts:336][E: packages/opencode/src/session/processor.ts:338][E: packages/opencode/src/session/processor.ts:447] |
| V1 text part | `type: "text"`, `text`, `time`, optional provider metadata | `text-start` 新建,`text-delta` 追加并发 `updatePartDelta`,`text-end` 触发 plugin transform 后写回。[E: packages/opencode/src/session/processor.ts:759][E: packages/opencode/src/session/processor.ts:771][E: packages/opencode/src/session/processor.ts:784][E: packages/opencode/src/session/processor.ts:797][E: packages/opencode/src/session/processor.ts:806][E: packages/opencode/src/session/processor.ts:810][E: packages/opencode/src/session/processor.ts:836] |
| V1 reasoning part | `type: "reasoning"`, `text`, provider metadata | reasoning start 创建 part,delta 追加,reasoning end 调 `finishReasoning` 写 end time。[E: packages/opencode/src/session/processor.ts:373][E: packages/opencode/src/session/processor.ts:385][E: packages/opencode/src/session/processor.ts:397][E: packages/opencode/src/session/processor.ts:411][E: packages/opencode/src/session/processor.ts:420][E: packages/opencode/src/session/processor.ts:424] |
| V1 step-start/step-finish part | snapshot, finish reason, tokens, cost | `step-start` 写入 pre-step snapshot;`step-finish` 计算 usage、写 finish part、更新 assistant message,并按 snapshot diff 写 patch part。[E: packages/opencode/src/session/processor.ts:676][E: packages/opencode/src/session/processor.ts:684][E: packages/opencode/src/session/processor.ts:693][E: packages/opencode/src/session/processor.ts:696][E: packages/opencode/src/session/processor.ts:719][E: packages/opencode/src/session/processor.ts:729][E: packages/opencode/src/session/processor.ts:731][E: packages/opencode/src/session/processor.ts:733] |
| `SessionStatus.Info` | `idle` / `retry` / `busy` | processor 开 stream 前置 busy;retry policy set callback 写 retry status;non-overflow error path 写 idle;auto-disabled overflow terminal path 也写 idle。[E: packages/opencode/src/session/status.ts:9][E: packages/opencode/src/session/status.ts:14][E: packages/opencode/src/session/status.ts:30][E: packages/opencode/src/session/processor.ts:931][E: packages/opencode/src/session/processor.ts:973][E: packages/opencode/src/session/processor.ts:1014][E: packages/opencode/src/session/processor.ts:957] |

## 控制流

1. `process(streamInput)` 重置 `ctx.needsCompaction`,并根据 config `experimental.continue_loop_on_deny` 计算 `ctx.shouldBreak`;默认 deny/question rejected 会让 blocked 状态停止 loop。[E: packages/opencode/src/session/processor.ts:960][E: packages/opencode/src/session/processor.ts:965][E: packages/opencode/src/session/processor.ts:966][E: packages/opencode/src/session/processor.ts:241][E: packages/opencode/src/session/processor.ts:242][E: packages/opencode/src/session/processor.ts:1031]

2. processor 调 `llm.stream(streamInput)`,对每个 event 执行 `handleEvent`,并用 `Stream.takeUntil(() => ctx.needsCompaction)` 在需要压缩时提前停 drain。[E: packages/opencode/src/session/processor.ts:974][E: packages/opencode/src/session/processor.ts:976][E: packages/opencode/src/session/processor.ts:977][E: packages/opencode/src/session/processor.ts:978][E: packages/opencode/src/session/llm.ts:54]

3. `handleEvent` 的 reasoning path: `reasoning-start` 写 V1 reasoning part,`reasoning-delta` 对 part text 做 delta update,`reasoning-end` 调 `finishReasoning` 结束 part。[E: packages/opencode/src/session/processor.ts:371][E: packages/opencode/src/session/processor.ts:373][E: packages/opencode/src/session/processor.ts:385][E: packages/opencode/src/session/processor.ts:397][E: packages/opencode/src/session/processor.ts:411][E: packages/opencode/src/session/processor.ts:420][E: packages/opencode/src/session/processor.ts:424]

4. `handleEvent` 的 tool input path: `tool-input-start` 禁止 summary assistant 发工具,然后 `ensureToolCall`;`tool-input-delta` 累积 raw JSON/text input;`tool-input-end` 标记 `inputEnded` 并在 mirror 模式下发布 V2 input ended event。[E: packages/opencode/src/session/processor.ts:427][E: packages/opencode/src/session/processor.ts:428][E: packages/opencode/src/session/processor.ts:431][E: packages/opencode/src/session/processor.ts:434][E: packages/opencode/src/session/processor.ts:447][E: packages/opencode/src/session/processor.ts:451][E: packages/opencode/src/session/processor.ts:454][E: packages/opencode/src/session/processor.ts:456][E: packages/opencode/src/session/processor.ts:464]

5. `tool-call` event 会确保 V1 tool part 存在,把 input 写入 `state`,并在 `mirrorAssistant` 模式下发布 `SessionEvent.Tool.Called`。如果 tool part metadata 带 `providerExecuted`,V2 event 的 provider executed 也会置 true。[E: packages/opencode/src/session/processor.ts:468][E: packages/opencode/src/session/processor.ts:472][E: packages/opencode/src/session/processor.ts:473][E: packages/opencode/src/session/processor.ts:488][E: packages/opencode/src/session/processor.ts:490][E: packages/opencode/src/session/processor.ts:496][E: packages/opencode/src/session/processor.ts:503][E: packages/opencode/src/session/processor.ts:514]

6. doom-loop guard 使用常量 `DOOM_LOOP_THRESHOLD = 3`;`tool-call` 后读取当前 assistant message 最近 3 个 parts,只有它们都为同一 tool、非 pending、且 input JSON 相同时,才触发 `permission.ask({ permission: "doom_loop" })`。[E: packages/opencode/src/session/processor.ts:35][E: packages/opencode/src/session/processor.ts:519][E: packages/opencode/src/session/processor.ts:522][E: packages/opencode/src/session/processor.ts:524][E: packages/opencode/src/session/processor.ts:528][E: packages/opencode/src/session/processor.ts:529][E: packages/opencode/src/session/processor.ts:531][E: packages/opencode/src/session/processor.ts:538][E: packages/opencode/src/session/processor.ts:539]

7. `tool-result` error branch在有 matching tool call 时,会在 V2 mirror 模式下发布 `Tool.Failed` 后调用 `failToolCall`;success branch把 result 归一化为 `title/metadata/output/attachments`,normalize image attachment。不能 materialize 的非 data URI attachment 只在 V2 mirror settlement block 内被拒绝;最后 processor 调用 `completeToolCall`,对 matching running V1 tool part 写 completed state。[E: packages/opencode/src/session/processor.ts:549][E: packages/opencode/src/session/processor.ts:551][E: packages/opencode/src/session/processor.ts:552][E: packages/opencode/src/session/processor.ts:554][E: packages/opencode/src/session/processor.ts:556][E: packages/opencode/src/session/processor.ts:569][E: packages/opencode/src/session/processor.ts:572][E: packages/opencode/src/session/processor.ts:573][E: packages/opencode/src/session/processor.ts:595][E: packages/opencode/src/session/processor.ts:609][E: packages/opencode/src/session/processor.ts:614][E: packages/opencode/src/session/processor.ts:631][E: packages/opencode/src/session/processor.ts:645][E: packages/opencode/src/session/processor.ts:212][E: packages/opencode/src/session/processor.ts:213][E: packages/opencode/src/session/processor.ts:214][E: packages/opencode/src/session/processor.ts:217][E: packages/opencode/src/session/processor.ts:223]

8. `tool-error` 在 `mirrorAssistant` 模式下发布 V2 `Tool.Failed`,并调用 `failToolCall` 将 matching running V1 tool part 标成 error。[E: packages/opencode/src/session/processor.ts:649][E: packages/opencode/src/session/processor.ts:652][E: packages/opencode/src/session/processor.ts:654][E: packages/opencode/src/session/processor.ts:669][E: packages/opencode/src/session/processor.ts:229][E: packages/opencode/src/session/processor.ts:231][E: packages/opencode/src/session/processor.ts:232][E: packages/opencode/src/session/processor.ts:235]

9. `step-finish` 先完成所有 reasoning part,用 `Session.getUsage` 计算 cost/tokens,更新 assistant `finish/cost/tokens`,写 `step-finish` part 和 optional patch part,然后后台触发 `SessionSummary.summarize`。[E: packages/opencode/src/session/processor.ts:693][E: packages/opencode/src/session/processor.ts:695][E: packages/opencode/src/session/processor.ts:696][E: packages/opencode/src/session/processor.ts:716][E: packages/opencode/src/session/processor.ts:717][E: packages/opencode/src/session/processor.ts:718][E: packages/opencode/src/session/processor.ts:719][E: packages/opencode/src/session/processor.ts:729][E: packages/opencode/src/session/processor.ts:744]

10. `step-finish` 是 token overflow 的本地检测点:当 assistant 不是 summary 且 `isOverflow({ cfg, tokens, model })` 为 true,processor 设置 `ctx.needsCompaction = true`。[E: packages/opencode/src/session/processor.ts:750][E: packages/opencode/src/session/processor.ts:751][E: packages/opencode/src/session/processor.ts:752][E: packages/opencode/src/session/processor.ts:754][E: packages/opencode/src/session/overflow.ts:28][E: packages/opencode/src/session/overflow.ts:31][E: packages/opencode/src/session/overflow.ts:33]

11. `halt(e)` 把未知异常转成 `MessageV2.fromError`;如果是 `ContextOverflowError`,并且 auto compaction 未被关闭,它不会把 assistant message 置成 terminal error,而是设置 `ctx.needsCompaction = true` 并发布 V1 session error。[E: packages/opencode/src/session/processor.ts:917][E: packages/opencode/src/session/processor.ts:924][E: packages/opencode/src/session/processor.ts:926][E: packages/opencode/src/session/processor.ts:927][E: packages/opencode/src/session/processor.ts:934][E: packages/opencode/src/session/processor.ts:935]

12. 非 overflow error path 会在 mirror 模式下发布 `SessionEvent.Step.Failed`,把 assistant error 写到 `ctx.assistantMessage`,发布 `Session.Event.Error`,并把 session status 置 idle;`cleanup()` 随后持久化更新后的 assistant message。[E: packages/opencode/src/session/processor.ts:913][E: packages/opencode/src/session/processor.ts:914][E: packages/opencode/src/session/processor.ts:938][E: packages/opencode/src/session/processor.ts:941][E: packages/opencode/src/session/processor.ts:952][E: packages/opencode/src/session/processor.ts:953][E: packages/opencode/src/session/processor.ts:957]

13. `Effect.retry(SessionRetry.policy(...))` 只包住非 interrupt-only cause;retry set callback 会先 flush V2 fragments,再可选发布 `SessionEvent.Retried`,最后把 `SessionStatus` 改为 retry,包含 attempt/message/action/next。[E: packages/opencode/src/session/processor.ts:990][E: packages/opencode/src/session/processor.ts:994][E: packages/opencode/src/session/processor.ts:995][E: packages/opencode/src/session/processor.ts:1000][E: packages/opencode/src/session/processor.ts:1001][E: packages/opencode/src/session/processor.ts:1011][E: packages/opencode/src/session/processor.ts:1014]

14. `process` 的最终返回值只有三类:`ctx.needsCompaction` 返回 `"compact"`,blocked 或 assistant error 返回 `"stop"`,否则返回 `"continue"`。[E: packages/opencode/src/session/processor.ts:1030][E: packages/opencode/src/session/processor.ts:1031][E: packages/opencode/src/session/processor.ts:1032]

## retry 策略

`SessionRetry.retryable` 明确排除 `ContextOverflowError`,所以 overflow recovery 走 compaction 而不是普通 retry。[E: packages/opencode/src/session/retry.ts:68][E: packages/opencode/src/session/retry.ts:70] APIError 只有 provider 标记 retryable 或 HTTP 5xx 时才 retry;retryable/5xx APIError body 含 FreeUsageLimitError/GoUsageLimitError 时会产生带 action 的用户可见 retry status。[E: packages/opencode/src/session/retry.ts:71][E: packages/opencode/src/session/retry.ts:75][E: packages/opencode/src/session/retry.ts:76][E: packages/opencode/src/session/retry.ts:89][E: packages/opencode/src/session/retry.ts:110]

`SessionRetry.delay` 优先解析 `retry-after-ms`,再解析 `retry-after` 秒数或 HTTP date;没有 headers 时使用 exponential backoff 且最多 30 秒。[E: packages/opencode/src/session/retry.ts:35][E: packages/opencode/src/session/retry.ts:39][E: packages/opencode/src/session/retry.ts:47][E: packages/opencode/src/session/retry.ts:55][E: packages/opencode/src/session/retry.ts:65]

## V2 dual-write

processor 的 V2 mirror 是临时迁移层:实际 gate 是 `mirrorAssistant = flags.experimentalEventSystem && !input.assistantMessage.summary`,reasoning/tool/step/retry event publish 都复用这个 gate 或由它派生出的 `assistantMessageID`。`experimentalEventSystem` 由 `enabledByExperimental("OPENCODE_EXPERIMENTAL_EVENT_SYSTEM")` 驱动，当 `OPENCODE_EXPERIMENTAL_EVENT_SYSTEM=true` 或 umbrella `OPENCODE_EXPERIMENTAL=true` 时均为 true。[E: packages/opencode/src/session/processor.ts:129][E: packages/opencode/src/session/processor.ts:251][E: packages/opencode/src/session/processor.ts:316][E: packages/opencode/src/session/processor.ts:317][E: packages/opencode/src/session/processor.ts:454][E: packages/opencode/src/session/processor.ts:595][E: packages/opencode/src/session/processor.ts:701][E: packages/opencode/src/session/processor.ts:703][E: packages/opencode/src/session/processor.ts:1000][E: packages/opencode/src/effect/runtime-flags.ts:11][E: packages/opencode/src/effect/runtime-flags.ts:48][I]

mirror 模式下 processor 发布的 V2 event 包括 `Step.Started/Ended/Failed`, `Text.Started/Delta/Ended`, `Reasoning.Started/Delta/Ended`, `Tool.Input.Started/Delta/Ended`, `Tool.Called`, `Tool.Success/Failed`,以及 retry event。[E: packages/opencode/src/session/processor.ts:147][E: packages/opencode/src/session/processor.ts:252][E: packages/opencode/src/session/processor.ts:318][E: packages/opencode/src/session/processor.ts:377][E: packages/opencode/src/session/processor.ts:403][E: packages/opencode/src/session/processor.ts:439][E: packages/opencode/src/session/processor.ts:456][E: packages/opencode/src/session/processor.ts:490][E: packages/opencode/src/session/processor.ts:556][E: packages/opencode/src/session/processor.ts:631][E: packages/opencode/src/session/processor.ts:654][E: packages/opencode/src/session/processor.ts:704][E: packages/opencode/src/session/processor.ts:763][E: packages/opencode/src/session/processor.ts:789][E: packages/opencode/src/session/processor.ts:822][E: packages/opencode/src/session/processor.ts:941][E: packages/opencode/src/session/processor.ts:1001]

## gotcha

- `cleanup()` 等待 active tool calls 最多 250ms,然后把仍未 settle 的 tool part 标成 `"Tool execution aborted"` 并写 `metadata.interrupted = true`;后续 `SessionPrompt.runLoop` 会把这种 orphaned interrupted tool 排除在 pending tool-call 判断之外。[E: packages/opencode/src/session/processor.ts:879][E: packages/opencode/src/session/processor.ts:881][E: packages/opencode/src/session/processor.ts:885][E: packages/opencode/src/session/processor.ts:905][E: packages/opencode/src/session/processor.ts:907][E: packages/opencode/src/session/prompt.ts:80][E: packages/opencode/src/session/prompt.ts:1161]
- `flushV2Fragments()` 会在 retry/halt 前补发未结束的 text/reasoning ended event,避免 V2 mirror 留下 open fragments。[E: packages/opencode/src/session/processor.ts:268][E: packages/opencode/src/session/processor.ts:270][E: packages/opencode/src/session/processor.ts:279][E: packages/opencode/src/session/processor.ts:925][E: packages/opencode/src/session/processor.ts:1011]
- summary assistant 被禁止发工具调用;`tool-input-start` 和 `tool-call` 都会在 `ctx.assistantMessage.summary` 为 true 时抛错。[E: packages/opencode/src/session/processor.ts:427][E: packages/opencode/src/session/processor.ts:429][E: packages/opencode/src/session/processor.ts:468][E: packages/opencode/src/session/processor.ts:470]

## Sources
- packages/opencode/src/session/processor.ts
- packages/opencode/src/session/retry.ts
- packages/opencode/src/session/status.ts
- packages/opencode/src/session/message-v2.ts
- packages/opencode/src/session/session.ts
- packages/opencode/src/session/overflow.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/session/llm.ts
- packages/opencode/src/session/tools.ts
- packages/opencode/src/effect/runtime-flags.ts

## 相关
- [spine.v1-turn-loop](../../spine/v1-turn-loop.md)
- [session-v1.llm-runtime](llm-runtime.md)
