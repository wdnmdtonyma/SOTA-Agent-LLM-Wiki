---
id: session-v1.processor
title: Stream processor 与 part 生命周期(V1)
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/session/processor.ts, packages/opencode/src/session/retry.ts, packages/opencode/src/session/status.ts, packages/opencode/src/session/message-v2.ts, packages/opencode/src/session/session.ts, packages/opencode/src/session/overflow.ts, packages/opencode/src/session/prompt.ts, packages/opencode/src/session/llm.ts, packages/opencode/src/session/tools.ts]
symbols: [SessionProcessor, SessionProcessor.create, SessionProcessor.Handle, DOOM_LOOP_THRESHOLD, SessionRetry.policy, SessionStatus]
related: [spine.v1-turn-loop, session-v1.llm-runtime]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `SessionProcessor` 消费 `LLM.stream(...)` 产出的 `LLMEvent`,把 text/reasoning/tool/step/tool-error 等事件落成或更新 V1 message parts;provider/error paths 则更新 assistant/session error state,当前文件已不再包含旧的 V2 mirror dual-write 分支。

## 能回答的问题
- `LLMEvent` 的 `text-start`/`text-delta`/`text-end` 怎样变成 V1 text part?
- tool-call、tool-result、tool-error 怎样更新 V1 tool part?
- doom-loop guard 为什么阈值是 3,它检查什么?
- provider overflow 为什么返回 `"compact"` 而不是普通 retry?
- 当前 processor 是否还发布 V2 dual-write event?

## 职责边界

`SessionProcessor.Handle` 暴露当前 assistant `message`,以及 `updateToolCall`、`completeToolCall` 和 `process(streamInput)` 三个操作;`SessionTools.resolve` 只需要这个 handle 的 message/tool-call 更新能力。[E: packages/opencode/src/session/processor.ts:32][E: packages/opencode/src/session/processor.ts:34][E: packages/opencode/src/session/processor.ts:38][E: packages/opencode/src/session/processor.ts:47][E: packages/opencode/src/session/tools.ts:43]

`ProcessorContext` 是一次 assistant message 的 mutable working set:它跟踪 active tool calls、`shouldBreak`、snapshot、blocked 状态、`needsCompaction`、当前 text part 和 reasoning map;旧版的 V2 assistant message id 字段已经不在当前结构中。[E: packages/opencode/src/session/processor.ts:67][E: packages/opencode/src/session/processor.ts:68][E: packages/opencode/src/session/processor.ts:69][E: packages/opencode/src/session/processor.ts:70][E: packages/opencode/src/session/processor.ts:71][E: packages/opencode/src/session/processor.ts:72][E: packages/opencode/src/session/processor.ts:73][E: packages/opencode/src/session/processor.ts:74]

`SessionProcessor.create` 在 LLM stream 之前捕获 snapshot,构造 `ProcessorContext`,并用本地 `aborted` boolean 辅助 `MessageV2.fromError` 判断 abort shape;当前 `processor.ts` 没有读取 `RuntimeFlags` 或计算 `mirrorAssistant`。[E: packages/opencode/src/session/processor.ts:98][E: packages/opencode/src/session/processor.ts:102][E: packages/opencode/src/session/processor.ts:103][E: packages/opencode/src/session/processor.ts:115][E: packages/opencode/src/session/processor.ts:117]

## 数据模型

| 结构 | 字段 | 生命周期 |
|---|---|---|
| `ToolCall` | `partID`, `messageID`, `sessionID`, `done` | `ensureToolCall` 为一个 tool call 创建 pending V1 tool part 与 deferred;当前 `tool-input-delta`/`tool-input-end` 只确保 part 存在,实际 input 在 `tool-call` event 写入 running state;settle 后删除并 resolve deferred。[E: packages/opencode/src/session/processor.ts:60][E: packages/opencode/src/session/processor.ts:61][E: packages/opencode/src/session/processor.ts:62][E: packages/opencode/src/session/processor.ts:64][E: packages/opencode/src/session/processor.ts:214][E: packages/opencode/src/session/processor.ts:234][E: packages/opencode/src/session/processor.ts:241][E: packages/opencode/src/session/processor.ts:244][E: packages/opencode/src/session/processor.ts:333][E: packages/opencode/src/session/processor.ts:335] |
| V1 text part | `type: "text"`, `text`, `time`, optional provider metadata | `text-start` 新建,`text-delta` 追加并发 `updatePartDelta`,`text-end` 触发 plugin transform 后写回。[E: packages/opencode/src/session/processor.ts:484][E: packages/opencode/src/session/processor.ts:489][E: packages/opencode/src/session/processor.ts:497][E: packages/opencode/src/session/processor.ts:501][E: packages/opencode/src/session/processor.ts:510][E: packages/opencode/src/session/processor.ts:514][E: packages/opencode/src/session/processor.ts:528] |
| V1 reasoning part | `type: "reasoning"`, `text`, provider metadata | reasoning start 创建 part,delta 追加,reasoning end 调 `finishReasoning` 写 end time。[E: packages/opencode/src/session/processor.ts:278][E: packages/opencode/src/session/processor.ts:280][E: packages/opencode/src/session/processor.ts:292][E: packages/opencode/src/session/processor.ts:297][E: packages/opencode/src/session/processor.ts:306][E: packages/opencode/src/session/processor.ts:310] |
| V1 step-start/step-finish part | snapshot, finish reason, tokens, cost | `step-start` 写入 pre-step snapshot;`step-finish` 计算 usage、写 finish part、更新 assistant message,并按 snapshot diff 写 patch part。[E: packages/opencode/src/session/processor.ts:422][E: packages/opencode/src/session/processor.ts:424][E: packages/opencode/src/session/processor.ts:433][E: packages/opencode/src/session/processor.ts:436][E: packages/opencode/src/session/processor.ts:444][E: packages/opencode/src/session/processor.ts:454][E: packages/opencode/src/session/processor.ts:455][E: packages/opencode/src/session/processor.ts:458] |
| `SessionStatus.Info` | `idle` / `retry` / `busy` | processor 开 stream 前置 busy;retry policy set callback 写 retry status;non-overflow error path 写 idle;auto-disabled overflow terminal path也写 idle。[E: packages/opencode/src/session/status.ts:9][E: packages/opencode/src/session/status.ts:14][E: packages/opencode/src/session/status.ts:30][E: packages/opencode/src/session/processor.ts:637][E: packages/opencode/src/session/processor.ts:663][E: packages/opencode/src/session/processor.ts:622][E: packages/opencode/src/session/processor.ts:610] |

## 控制流

1. `process(streamInput)` 重置 `ctx.needsCompaction`,并根据 config `experimental.continue_loop_on_deny` 计算 `ctx.shouldBreak`;默认 deny/question rejected 会让 blocked 状态停止 loop。[E: packages/opencode/src/session/processor.ts:625][E: packages/opencode/src/session/processor.ts:630][E: packages/opencode/src/session/processor.ts:631][E: packages/opencode/src/session/processor.ts:198][E: packages/opencode/src/session/processor.ts:199][E: packages/opencode/src/session/processor.ts:678]

2. processor 调 `llm.stream(streamInput)`,对每个 event 执行 `handleEvent`,并用 `Stream.takeUntil(() => ctx.needsCompaction)` 在需要压缩时提前停 drain。[E: packages/opencode/src/session/processor.ts:638][E: packages/opencode/src/session/processor.ts:640][E: packages/opencode/src/session/processor.ts:641][E: packages/opencode/src/session/processor.ts:642][E: packages/opencode/src/session/llm.ts:55]

3. `handleEvent` 的 reasoning path: `reasoning-start` 写 V1 reasoning part,`reasoning-delta` 对 part text 做 delta update,`reasoning-end` 调 `finishReasoning` 结束 part。[E: packages/opencode/src/session/processor.ts:278][E: packages/opencode/src/session/processor.ts:280][E: packages/opencode/src/session/processor.ts:292][E: packages/opencode/src/session/processor.ts:297][E: packages/opencode/src/session/processor.ts:306][E: packages/opencode/src/session/processor.ts:310]

4. `handleEvent` 的 tool input path: `tool-input-start` 禁止 summary assistant 发工具,然后 `ensureToolCall`;当前 `tool-input-delta` 和 `tool-input-end` 也只确保 tool part 存在,不再维护 `raw`/`inputEnded` 字段。[E: packages/opencode/src/session/processor.ts:313][E: packages/opencode/src/session/processor.ts:314][E: packages/opencode/src/session/processor.ts:317][E: packages/opencode/src/session/processor.ts:320][E: packages/opencode/src/session/processor.ts:321][E: packages/opencode/src/session/processor.ts:324][E: packages/opencode/src/session/processor.ts:325]

5. `tool-call` event 会确保 V1 tool part 存在,把 input 写入 running state,并把 provider metadata 写回 tool part;如果现有 part metadata 带 `providerExecuted`,新 metadata 会保留 `providerExecuted: true`。[E: packages/opencode/src/session/processor.ts:329][E: packages/opencode/src/session/processor.ts:333][E: packages/opencode/src/session/processor.ts:334][E: packages/opencode/src/session/processor.ts:335][E: packages/opencode/src/session/processor.ts:342][E: packages/opencode/src/session/processor.ts:346][E: packages/opencode/src/session/processor.ts:347]

6. doom-loop guard 使用常量 `DOOM_LOOP_THRESHOLD = 3`;`tool-call` 后读取当前 assistant message 最近 3 个 parts,只有它们都为同一 tool、非 pending、且 input JSON 相同时,才触发 `permission.ask({ permission: "doom_loop" })`。[E: packages/opencode/src/session/processor.ts:29][E: packages/opencode/src/session/processor.ts:351][E: packages/opencode/src/session/processor.ts:354][E: packages/opencode/src/session/processor.ts:356][E: packages/opencode/src/session/processor.ts:360][E: packages/opencode/src/session/processor.ts:362][E: packages/opencode/src/session/processor.ts:363][E: packages/opencode/src/session/processor.ts:370][E: packages/opencode/src/session/processor.ts:371]

7. `tool-result` error branch 在有 matching tool call 时调用 `failToolCall`;success branch把 result 归一化为 `title/metadata/output/attachments`,normalize image attachment,并通过 `completeToolCall` 对 matching running V1 tool part 写 completed state。[E: packages/opencode/src/session/processor.ts:381][E: packages/opencode/src/session/processor.ts:382][E: packages/opencode/src/session/processor.ts:384][E: packages/opencode/src/session/processor.ts:385][E: packages/opencode/src/session/processor.ts:388][E: packages/opencode/src/session/processor.ts:389][E: packages/opencode/src/session/processor.ts:401][E: packages/opencode/src/session/processor.ts:410][E: packages/opencode/src/session/processor.ts:160][E: packages/opencode/src/session/processor.ts:171][E: packages/opencode/src/session/processor.ts:174]

8. `tool-error` 调用 `failToolCall` 将 matching running V1 tool part 标成 error;`failToolCall` 还会在 Permission/Question rejected 时按 `ctx.shouldBreak` 设置 blocked。[E: packages/opencode/src/session/processor.ts:414][E: packages/opencode/src/session/processor.ts:415][E: packages/opencode/src/session/processor.ts:186][E: packages/opencode/src/session/processor.ts:189][E: packages/opencode/src/session/processor.ts:192][E: packages/opencode/src/session/processor.ts:198][E: packages/opencode/src/session/processor.ts:199]

9. `step-finish` 先完成所有 reasoning part,用 `Session.getUsage` 计算 cost/tokens,更新 assistant `finish/cost/tokens`,写 `step-finish` part 和 optional patch part,然后后台触发 `SessionSummary.summarize`。[E: packages/opencode/src/session/processor.ts:433][E: packages/opencode/src/session/processor.ts:435][E: packages/opencode/src/session/processor.ts:436][E: packages/opencode/src/session/processor.ts:441][E: packages/opencode/src/session/processor.ts:442][E: packages/opencode/src/session/processor.ts:443][E: packages/opencode/src/session/processor.ts:444][E: packages/opencode/src/session/processor.ts:458][E: packages/opencode/src/session/processor.ts:469]

10. `step-finish` 是 token overflow 的本地检测点:当 assistant 不是 summary 且 `isOverflow({ cfg, tokens, model })` 为 true,processor 设置 `ctx.needsCompaction = true`。[E: packages/opencode/src/session/processor.ts:475][E: packages/opencode/src/session/processor.ts:476][E: packages/opencode/src/session/processor.ts:477][E: packages/opencode/src/session/processor.ts:479][E: packages/opencode/src/session/overflow.ts:28][E: packages/opencode/src/session/overflow.ts:31][E: packages/opencode/src/session/overflow.ts:33]

11. `halt(e)` 把未知异常转成 `MessageV2.fromError`;如果是 `ContextOverflowError`,并且 auto compaction 未被关闭,它不会把 assistant message 置成 terminal error,而是设置 `ctx.needsCompaction = true` 并发布 V1 session error。[E: packages/opencode/src/session/processor.ts:597][E: packages/opencode/src/session/processor.ts:604][E: packages/opencode/src/session/processor.ts:605][E: packages/opencode/src/session/processor.ts:606][E: packages/opencode/src/session/processor.ts:613][E: packages/opencode/src/session/processor.ts:614]

12. 非 overflow error path 把 assistant error 写到 `ctx.assistantMessage`,发布 `Session.Event.Error`,并把 session status 置 idle;`cleanup()` 随后持久化更新后的 assistant message。[E: packages/opencode/src/session/processor.ts:617][E: packages/opencode/src/session/processor.ts:618][E: packages/opencode/src/session/processor.ts:619][E: packages/opencode/src/session/processor.ts:622][E: packages/opencode/src/session/processor.ts:537][E: packages/opencode/src/session/processor.ts:593][E: packages/opencode/src/session/processor.ts:594]

13. `Effect.retry(SessionRetry.policy(...))` 只包住非 interrupt-only cause;retry set callback 把 `SessionStatus` 改为 retry,包含 attempt/message/action/next,当前 processor 不再有 `flushV2Fragments()` 调用。[E: packages/opencode/src/session/processor.ts:654][E: packages/opencode/src/session/processor.ts:655][E: packages/opencode/src/session/processor.ts:658][E: packages/opencode/src/session/processor.ts:659][E: packages/opencode/src/session/processor.ts:662][E: packages/opencode/src/session/processor.ts:663][E: packages/opencode/src/session/processor.ts:664][E: packages/opencode/src/session/processor.ts:668]

14. `process` 的最终返回值只有三类:`ctx.needsCompaction` 返回 `"compact"`,blocked 或 assistant error 返回 `"stop"`,否则返回 `"continue"`。[E: packages/opencode/src/session/processor.ts:677][E: packages/opencode/src/session/processor.ts:678][E: packages/opencode/src/session/processor.ts:679]

## retry 策略

`SessionRetry.retryable` 明确排除 `ContextOverflowError`,所以 overflow recovery 走 compaction 而不是普通 retry。[E: packages/opencode/src/session/retry.ts:68][E: packages/opencode/src/session/retry.ts:70] APIError 只有 provider 标记 retryable 或 HTTP 5xx 时才 retry;retryable/5xx APIError body 含 FreeUsageLimitError/GoUsageLimitError 时会产生带 action 的用户可见 retry status。[E: packages/opencode/src/session/retry.ts:71][E: packages/opencode/src/session/retry.ts:75][E: packages/opencode/src/session/retry.ts:76][E: packages/opencode/src/session/retry.ts:89][E: packages/opencode/src/session/retry.ts:110]

`SessionRetry.delay` 优先解析 `retry-after-ms`,再解析 `retry-after` 秒数或 HTTP date;没有 headers 时使用 exponential backoff 且最多 30 秒。[E: packages/opencode/src/session/retry.ts:35][E: packages/opencode/src/session/retry.ts:39][E: packages/opencode/src/session/retry.ts:47][E: packages/opencode/src/session/retry.ts:55][E: packages/opencode/src/session/retry.ts:65]

## V2 dual-write 移除状态

当前 `processor.ts` 的 import 列表包含 `EventV2Bridge`,但只在 `halt` 中用于发布 legacy `Session.Event.Error`;文件内没有 `SessionEvent.Step.*`、`SessionEvent.Text.*`、`SessionEvent.Tool.*` 或 `SessionEvent.Retried` publish 调用。[E: packages/opencode/src/session/processor.ts:25][E: packages/opencode/src/session/processor.ts:95][E: packages/opencode/src/session/processor.ts:609][E: packages/opencode/src/session/processor.ts:614][E: packages/opencode/src/session/processor.ts:618] 因此旧版 processor-level V2 mirror 可视为已从当前文件移除。[I]

V2 runner 的 durable event projection 另由 `packages/core/src/session/runner/llm.ts` 和 `packages/core/src/session/projector.ts` 负责,不再由 V1 `SessionProcessor` 对 provider stream 做 dual-write。[I]

## gotcha

- `cleanup()` 等待 active tool calls 最多 250ms,然后把仍未 settle 的 tool part 标成 `"Tool execution aborted"` 并写 `metadata.interrupted = true`;后续 `SessionPrompt.runLoop` 会把这种 orphaned interrupted tool 排除在 pending tool-call 判断之外。[E: packages/opencode/src/session/processor.ts:569][E: packages/opencode/src/session/processor.ts:571][E: packages/opencode/src/session/processor.ts:575][E: packages/opencode/src/session/processor.ts:581][E: packages/opencode/src/session/processor.ts:586][E: packages/opencode/src/session/prompt.ts:96][E: packages/opencode/src/session/prompt.ts:1108]
- `cleanup()` 还会补写未结束 text/reasoning part 的 end time,避免 retry/abort 后 V1 part 保持 open 状态;这是当前文件取代旧 `flushV2Fragments()` 叙述的本地清理点。[E: packages/opencode/src/session/processor.ts:553][E: packages/opencode/src/session/processor.ts:555][E: packages/opencode/src/session/processor.ts:560][E: packages/opencode/src/session/processor.ts:564]
- summary assistant 被禁止发工具调用;`tool-input-start` 和 `tool-call` 都会在 `ctx.assistantMessage.summary` 为 true 时抛错。[E: packages/opencode/src/session/processor.ts:313][E: packages/opencode/src/session/processor.ts:315][E: packages/opencode/src/session/processor.ts:329][E: packages/opencode/src/session/processor.ts:331]

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

## 相关
- [spine.v1-turn-loop](../../spine/v1-turn-loop.md)
- [session-v1.llm-runtime](llm-runtime.md)
