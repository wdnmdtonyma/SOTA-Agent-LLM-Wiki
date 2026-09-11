---
id: ref.coding-agent.json-events
title: JSON 模式事件流目录
kind: catalog
tier: T3
pkg: coding-agent
batch: surface
source:
  - packages/coding-agent/docs/json.md
  - packages/coding-agent/docs/rpc.md
  - packages/coding-agent/src/modes/json-event.ts
  - packages/coding-agent/src/modes/print-mode.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/coding-agent/src/modes/rpc/rpc-types.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/ai/src/types.ts
  - packages/ai/src/utils/retry.ts
  - packages/coding-agent/test/suite/regressions/7925-toolcall-start-metadata.test.ts
symbols:
  - JsonAgentSessionEvent
  - toJsonEvent
  - AgentSessionEvent
  - AgentEvent
  - AssistantMessageEvent
  - SessionHeader
related:
  - surface.modes.print
  - surface.modes.rpc-protocol
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `ref.coding-agent.json-events` 是 pi-coding-agent 无头 JSONL 输出中的 event catalog:覆盖 `--mode json` 的 `session` header、`AgentSessionEvent` 的每个顶层 `type`,以及 RPC mode 中同一事件流的承载边界。

## 能回答的问题

- `pi --mode json` 第一行为什么可能是 `type: "session"`?
- `AgentSessionEvent` 当前有哪些顶层 JSON event `type`?
- `message_update.assistantMessageEvent` 里可能出现哪些嵌套 assistant stream event?
- `agent_end` 在 coding-agent 层为什么比 core `AgentEvent` 多一个 `willRetry` 字段?
- `queue_update`、compaction、thinking level、auto retry 事件分别由哪里发出?
- RPC stdout 上哪些 JSON record 是 session events,哪些只是 RPC-only record?

## 输出边界

`--mode json` 由 `runPrintMode()` 负责写 stdout:进入 json 模式时先取 `session.sessionManager.getHeader()`,若存在就把 header JSON.stringify 成一行;随后 `session.subscribe()` 收到的每个 event 先经 `toJsonEvent()` 再以 JSON Lines 写出 [E: packages/coding-agent/src/modes/print-mode.ts:108][E: packages/coding-agent/src/modes/print-mode.ts:110][E: packages/coding-agent/src/modes/print-mode.ts:122][E: packages/coding-agent/src/modes/print-mode.ts:125][E: packages/coding-agent/src/modes/json-event.ts:48]. `SessionHeader` 的 discriminator 是 `type: "session"`,字段为 `version?`、`id`、`timestamp`、`cwd` 和可选 `parentSession` [E: packages/coding-agent/src/core/session-manager.ts:32][E: packages/coding-agent/src/core/session-manager.ts:38].

**BREAKING:** stdout 上的 `message_update` 不再携带 cumulative `message` 或 `assistantMessageEvent.partial`。wire 形状是 `JsonAgentSessionEvent`:除 `message_update` 外等于 `AgentSessionEvent`;`message_update` 只保留 top-level `usage` 与去掉 `partial` 的 `assistantMessageEvent` delta [E: packages/coding-agent/src/modes/json-event.ts:6][E: packages/coding-agent/src/modes/json-event.ts:18][E: packages/coding-agent/src/modes/json-event.ts:49][E: packages/coding-agent/src/modes/json-event.ts:36][E: packages/coding-agent/docs/json.md:16][E: packages/coding-agent/docs/json.md:87]。`toolcall_start` 是例外:内部 `AssistantMessageEvent` 仍只有 `contentIndex` + `partial`,但 `toJsonAssistantMessageEvent()` 从 `partial.content[contentIndex]` 抽出 constant-sized `id` 与 `toolName` 写到 wire(#7953) [E: packages/coding-agent/src/modes/json-event.ts:6][E: packages/coding-agent/src/modes/json-event.ts:7][E: packages/coding-agent/src/modes/json-event.ts:23][E: packages/coding-agent/src/modes/json-event.ts:29][E: packages/ai/src/types.ts:557][E: packages/coding-agent/docs/json.md:18][E: packages/coding-agent/docs/json.md:91]。client 必须用 `message_start` 加后续 delta 自行组装 live partial;`message_end.message` 才是权威终态 [E: packages/coding-agent/docs/json.md:87][E: packages/coding-agent/docs/rpc.md:991]。

RPC mode 不是 `--mode json`,但它同样把 `session.subscribe()` 得到的 event 经 `toJsonEvent()` 写到 stdout JSONL;`RpcCommand` 从 stdin 输入,`RpcResponse` 和 events 从 stdout 输出 [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:356][E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20][E: packages/coding-agent/src/modes/rpc/rpc-types.ts:116]. RPC command response 的 `type: "response"` 和 extension UI 子协议不属于 `AgentSessionEvent` catalog;它们由 [surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md) 覆盖 [I].

`AgentSessionEvent` 由 coding-agent 产品层定义:它包含除 core `agent_end` 之外的全部 `AgentEvent`,把 `agent_end` 扩展为带 `willRetry: boolean`,并额外加入 settled、queue、compaction、entry、session info、thinking level、agent/summarization retry 和 direct-bash streaming 事件 [E: packages/coding-agent/src/core/agent-session.ts:144][E: packages/coding-agent/src/core/agent-session.ts:145][E: packages/coding-agent/src/core/agent-session.ts:151][E: packages/coding-agent/src/core/agent-session.ts:185]. core `AgentEvent` 的 lifecycle、turn、message、tool execution union 在 agent 包定义,其字段是这些 session events 的基础 [E: packages/agent/src/types.ts:433][E: packages/agent/src/types.ts:446].

## 顶层 JSONL record catalog

| JSON `type` | 顶层 shape / 字段 | 何时出现 | 输出面 | 证据 |
| --- | --- | --- | --- | --- |
| `session` | `SessionHeader`: `type`, `version?`, `id`, `timestamp`, `cwd`, `parentSession?` | `--mode json` 开始时若当前 `SessionManager` 有 header,先于 session events 写出一行。 | print json prelude,不是 `AgentSessionEvent`。 | [E: packages/coding-agent/src/core/session-manager.ts:32][E: packages/coding-agent/src/core/session-manager.ts:38][E: packages/coding-agent/src/core/session-manager.ts:1305][E: packages/coding-agent/src/modes/print-mode.ts:122][E: packages/coding-agent/src/modes/print-mode.ts:125] |
| `agent_start` | `{ type: "agent_start" }` | 一次 agent run 开始;prompt run 和 continue run 都会先 emit。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:431][E: packages/agent/src/agent-loop.ts:110][E: packages/agent/src/agent-loop.ts:139] |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[]; willRetry: boolean }` | 一次 agent run 结束;core event 携带 `messages`,coding-agent 在转发给 session listeners 时补 `willRetry`。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:433][E: packages/coding-agent/src/core/agent-session.ts:145][E: packages/coding-agent/src/core/agent-session.ts:149][E: packages/coding-agent/src/core/agent-session.ts:666][E: packages/agent/src/agent-loop.ts:217][E: packages/agent/src/agent-loop.ts:253][E: packages/agent/src/agent-loop.ts:272] |
| `agent_settled` | `{ type: "agent_settled" }` | session-level run 完全稳定、不会再自动 retry/compaction/queue continuation 后发出；比低层 `agent_end` 更适合 host 判断流程终止。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:151]; run order [E: packages/coding-agent/src/core/agent-session.ts:1101] [E: packages/coding-agent/src/core/agent-session.ts:1105] [E: packages/coding-agent/src/core/agent-session.ts:1112]; emit [E: packages/coding-agent/src/core/agent-session.ts:628] [E: packages/coding-agent/src/core/agent-session.ts:629]; docs [E: packages/coding-agent/docs/rpc.md:905] [E: packages/coding-agent/docs/rpc.md:910] |
| `turn_start` | `{ type: "turn_start" }` | agent run 内一个 assistant turn 开始;首 turn 在 run 启动后发,后续 turn 在内层 loop 继续时发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:436][E: packages/agent/src/agent-loop.ts:111][E: packages/agent/src/agent-loop.ts:140][E: packages/agent/src/agent-loop.ts:197] |
| `turn_end` | `{ type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }` | 一个 turn 的 assistant message 与该 turn tool results 完成后发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:436][E: packages/agent/src/agent-loop.ts:216][E: packages/agent/src/agent-loop.ts:243] |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | user prompt、queued user message、assistant partial/final message、tool result message 开始时发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:439][E: packages/agent/src/agent-loop.ts:113][E: packages/agent/src/agent-loop.ts:203][E: packages/agent/src/agent-loop.ts:321][E: packages/agent/src/agent-loop.ts:353][E: packages/agent/src/agent-loop.ts:801] |
| `message_update` | wire: `{ type: "message_update"; usage: Usage; assistantMessageEvent: WithoutPartial<AssistantMessageEvent> }`。内部 `AgentSessionEvent` 仍带 cumulative `message`,但 `toJsonEvent()` 只导出 `usage` 与去掉 `partial` 的 delta。 | assistant provider stream 产生 text/thinking/toolcall incremental event 时发。不再发送 cumulative `message` 或 `partial`。 | `JsonAgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/modes/json-event.ts:6][E: packages/coding-agent/src/modes/json-event.ts:48][E: packages/coding-agent/src/modes/json-event.ts:32][E: packages/coding-agent/src/modes/json-event.ts:36][E: packages/coding-agent/docs/json.md:25][E: packages/coding-agent/docs/rpc.md:938] |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | user message、assistant final message、tool result message 完成时发;coding-agent 在该事件上持久化普通 message/custom message。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:441][E: packages/agent/src/agent-loop.ts:114][E: packages/agent/src/agent-loop.ts:204][E: packages/agent/src/agent-loop.ts:355][E: packages/agent/src/agent-loop.ts:368][E: packages/agent/src/agent-loop.ts:802][E: packages/coding-agent/src/core/agent-session.ts:671][E: packages/coding-agent/src/core/agent-session.ts:685] |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }` | tool call 通过 validation/preflight 前,串行与并行执行路径都会先 emit start。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:444][E: packages/agent/src/agent-loop.ts:443][E: packages/agent/src/agent-loop.ts:447][E: packages/agent/src/agent-loop.ts:498][E: packages/agent/src/agent-loop.ts:502] |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }` | tool implementation 调用 update callback 时发;`partialResult` 静态类型是 `any`。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:446][E: packages/agent/src/agent-loop.ts:695][E: packages/agent/src/agent-loop.ts:699] |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean }` | tool call 被 finalize 后发;`isError` 表示最终 tool result 是否错误。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:444][E: packages/agent/src/agent-loop.ts:776][E: packages/agent/src/agent-loop.ts:780] |
| `bash_execution_update` | `{ type: "bash_execution_update"; id?: string; delta: string }` | direct bash helper 每产生一个 output chunk 就发；RPC `bash` path 把 command correlation id 注入 `options.id`，interactive path 不传 id。final response 即使截断也不影响 chunk stream。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:185]; emit [E: packages/coding-agent/src/core/agent-session.ts:3027] [E: packages/coding-agent/src/core/agent-session.ts:3027]; RPC id [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:563] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:580]; interactive call [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6561] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6569]; docs [E: packages/coding-agent/docs/rpc.md:998] [E: packages/coding-agent/docs/rpc.md:1002] |
| `queue_update` | `{ type: "queue_update"; steering: readonly string[]; followUp: readonly string[] }` | steering/follow-up 队列入队、队列消息被 agent loop 消费、或 clearQueue 清空队列时发,并携带两个队列的字符串快照。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:153][E: packages/coding-agent/src/core/agent-session.ts:155][E: packages/coding-agent/src/core/agent-session.ts:593][E: packages/coding-agent/src/core/agent-session.ts:650][E: packages/coding-agent/src/core/agent-session.ts:656][E: packages/coding-agent/src/core/agent-session.ts:1446][E: packages/coding-agent/src/core/agent-session.ts:1463][E: packages/coding-agent/src/core/agent-session.ts:1614] |
| `compaction_start` | `{ type: "compaction_start"; reason: "manual" \| "threshold" \| "overflow" }` | manual compact 或自动 compact 开始时发;`reason` 区分手动、阈值触发和 overflow recovery。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:157][E: packages/coding-agent/src/core/agent-session.ts:1970][E: packages/coding-agent/src/core/agent-session.ts:2290] |
| `entry_appended` | `{ type: "entry_appended"; entry: SessionEntry }` | extension runtime 的 `pi.appendEntry(customType, data)` 成功追加 custom entry 后转发该 entry；普通 message、compaction 或 branch entry append 不由这个事件承诺覆盖。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:158]; extension append [E: packages/coding-agent/src/core/agent-session.ts:2620] [E: packages/coding-agent/src/core/agent-session.ts:2620]; emit [E: packages/coding-agent/src/core/agent-session.ts:2620] |
| `session_info_changed` | `{ type: "session_info_changed"; name: string \| undefined }` | `setSessionName()` 追加 session info 后发,`name` 来自 `sessionManager.getSessionName()`。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:159][E: packages/coding-agent/src/core/agent-session.ts:3116][E: packages/coding-agent/src/core/agent-session.ts:3116] |
| `thinking_level_changed` | `{ type: "thinking_level_changed"; level: ThinkingLevel }` | effective thinking level 与 previous level 不同时持久化 change entry 并发事件。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:160][E: packages/coding-agent/src/core/agent-session.ts:1830][E: packages/coding-agent/src/core/agent-session.ts:1830] |
| `compaction_end` | `{ type: "compaction_end"; reason; result: CompactionResult \| undefined; aborted: boolean; willRetry: boolean; errorMessage?: string }` | manual/auto compaction 结束、取消或失败时发;成功时 `result` 包含 summary、firstKeptEntryId、tokensBefore、estimatedTokensAfter、可选 provider `usage` 和 details。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:162][E: packages/coding-agent/src/core/agent-session.ts:167][E: packages/coding-agent/src/core/agent-session.ts:2074][E: packages/coding-agent/src/core/agent-session.ts:2074][E: packages/coding-agent/src/core/agent-session.ts:2084][E: packages/coding-agent/src/core/agent-session.ts:2089][E: packages/coding-agent/src/core/agent-session.ts:2308][E: packages/coding-agent/src/core/agent-session.ts:2339][E: packages/coding-agent/src/core/agent-session.ts:2400][E: packages/coding-agent/src/core/agent-session.ts:2400][E: packages/coding-agent/src/core/agent-session.ts:2408][E: packages/coding-agent/src/core/agent-session.ts:2433] |
| `auto_retry_start` | `{ type: "auto_retry_start"; attempt: number; maxAttempts: number; delayMs: number; errorMessage: string }` | retryable assistant error 准备自动重试时发,`delayMs` 使用指数退避计算。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:169][E: packages/coding-agent/src/core/agent-session.ts:2934][E: packages/coding-agent/src/core/agent-session.ts:2934] |
| `auto_retry_end` | `{ type: "auto_retry_end"; success: boolean; attempt: number; finalError?: string }` | retry 后收到非 error assistant response、最终失败、或 retry sleep 被取消时发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:170][E: packages/coding-agent/src/core/agent-session.ts:702][E: packages/coding-agent/src/core/agent-session.ts:706][E: packages/coding-agent/src/core/agent-session.ts:1127][E: packages/coding-agent/src/core/agent-session.ts:1132][E: packages/coding-agent/src/core/agent-session.ts:2955][E: packages/coding-agent/src/core/agent-session.ts:2953] |
| `summarization_retry_scheduled` | `{ type; attempt; maxAttempts; delayMs; errorMessage }` | compaction 或 branch-summary 的 transient stream error 已排入 retry delay；底层 callback 在 sleep 前触发。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:171] [E: packages/coding-agent/src/core/agent-session.ts:176]; emit [E: packages/coding-agent/src/core/agent-session.ts:2894] [E: packages/coding-agent/src/core/agent-session.ts:2894]; retry order [E: packages/ai/src/utils/retry.ts:208] [E: packages/ai/src/utils/retry.ts:213] |
| `summarization_retry_attempt_start` | branch summary 为 `{ type; source: "branchSummary" }`；compaction 再带 `reason` | retry delay 结束、下一次 summarization request 即将开始。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:178] [E: packages/coding-agent/src/core/agent-session.ts:180] [E: packages/coding-agent/src/core/agent-session.ts:182]; emit [E: packages/coding-agent/src/core/agent-session.ts:2903] [E: packages/coding-agent/src/core/agent-session.ts:2903]; retry order [E: packages/ai/src/utils/retry.ts:213] [E: packages/ai/src/utils/retry.ts:222] |
| `summarization_retry_finished` | `{ type: "summarization_retry_finished" }` | summarization retry loop 在成功、terminal failure 或 abort 后完成，用于清理 UI/host retry state；仅在至少安排过一次 retry 后触发。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:184]; emit [E: packages/coding-agent/src/core/agent-session.ts:2908] [E: packages/coding-agent/src/core/agent-session.ts:2908]; terminal callbacks [E: packages/ai/src/utils/retry.ts:189] [E: packages/ai/src/utils/retry.ts:195] [E: packages/ai/src/utils/retry.ts:201] [E: packages/ai/src/utils/retry.ts:215] |
| `extension_error` | `{ type: "extension_error"; extensionPath: string; event: string; error: string }` | RPC `bindExtensions()` 的 `onError` callback 写出的 RPC-only JSON record;它出现在 `docs/rpc.md` 的 Events 表,但不在 `AgentSessionEvent` union 中。 | RPC stdout only,not print json session event. | [E: packages/coding-agent/docs/rpc.md:1171][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:348][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:349] |

## `message_update.assistantMessageEvent` 嵌套 catalog

`message_update` 的 `assistantMessageEvent` 字段来自 `AssistantMessageEvent` union,这些 nested event 不会作为顶层 JSONL record 单独写出;stdout 里它们被包在 `message_update` 的 payload 里,并且 `toJsonEvent()` 会删掉每个 delta 上的 `partial` [E: packages/coding-agent/src/modes/json-event.ts:4][E: packages/coding-agent/src/modes/json-event.ts:36][E: packages/coding-agent/docs/rpc.md:961][I].

| nested `assistantMessageEvent.type` | wire 字段/签名(无 `partial`) | 含义 | 证据 |
| --- | --- | --- | --- |
| `start` | `{ type: "start" }` | provider stream 的 assistant partial 开始事件;agent loop 把它转成顶层 `message_start`,不是顶层 `message_update`。内部类型仍带 `partial`。 | [E: packages/ai/src/types.ts:547] |
| `text_start` | `{ type: "text_start"; contentIndex: number }` | assistant text content block 开始。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:965] |
| `text_delta` | `{ type: "text_delta"; contentIndex: number; delta: string }` | assistant text delta。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:966] [E: packages/coding-agent/docs/json.md:81] |
| `text_end` | `{ type: "text_end"; contentIndex: number; content: string }` | assistant text content block 结束。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:967] |
| `thinking_start` | `{ type: "thinking_start"; contentIndex: number }` | assistant thinking content block 开始。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:968] |
| `thinking_delta` | `{ type: "thinking_delta"; contentIndex: number; delta: string }` | assistant thinking delta。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:969] |
| `thinking_end` | `{ type: "thinking_end"; contentIndex: number; content: string }` | assistant thinking content block 结束。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:970] |
| `toolcall_start` | wire: `{ type: "toolcall_start"; contentIndex: number; id: string; toolName: string }`。内部 `AssistantMessageEvent` 只有 `contentIndex` + `partial`;`toJsonAssistantMessageEvent()` 校验 `partial.content[contentIndex].type === "toolCall"` 后写入 `id`/`toolName`(#7953)。 | assistant tool call content block 开始。JSON/RPC stdout 在去掉 `partial` 的同时带上 constant-sized call id 与 tool name,便于 host 在 `toolcall_delta` 到达前关联调用。regression `#7925` 断言 wire 不含 cumulative snapshot 但含 `id`/`toolName`。 | [E: packages/coding-agent/src/modes/json-event.ts:6] [E: packages/coding-agent/src/modes/json-event.ts:7] [E: packages/coding-agent/src/modes/json-event.ts:23] [E: packages/coding-agent/src/modes/json-event.ts:24] [E: packages/coding-agent/src/modes/json-event.ts:29] [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/json.md:18] [E: packages/coding-agent/docs/json.md:91] [E: packages/coding-agent/docs/rpc.md:971] [E: packages/coding-agent/docs/rpc.md:988] [E: packages/coding-agent/docs/rpc.md:994] [E: packages/coding-agent/test/suite/regressions/7925-toolcall-start-metadata.test.ts:32] |
| `toolcall_delta` | `{ type: "toolcall_delta"; contentIndex: number; delta: string }` | assistant tool call arguments/name 的 streaming delta。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:972] |
| `toolcall_end` | `{ type: "toolcall_end"; contentIndex: number; toolCall: ToolCall }` | assistant tool call content block 结束,携带最终 `ToolCall`。 | [E: packages/ai/src/types.ts:546] [E: packages/coding-agent/docs/rpc.md:973] |
| `done` | `{ type: "done"; reason: "stop" \| "length" \| "toolUse" \| "deferred"; message: AssistantMessage }` | provider stream 正常结束;agent loop 取 `response.result()` 后发顶层 `message_end`。 | [E: packages/ai/src/types.ts:546] |
| `error` | `{ type: "error"; reason: "aborted" \| "error"; error: AssistantMessage }` | provider stream 异常/取消结束;agent loop 同样取 final message 后发顶层 `message_end`。 | [E: packages/ai/src/types.ts:562] |

## 跨包关系

[surface.modes.print](../surface/modes/print.md) 说明 `runPrintMode()` 如何进入 text/json 单次模式、绑定 extensions、订阅 session events 并写 raw stdout;本 catalog 只枚举 json/event record 的 payload shape 与来源 [E: packages/coding-agent/src/modes/print-mode.ts:33][E: packages/coding-agent/src/modes/print-mode.ts:108][I].

[surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md) 说明 RPC JSONL framing、command response、extension UI request 和 typed client;本 catalog 只把 RPC 中直接转发的 `AgentSessionEvent` 与 RPC-only `extension_error` 区分出来 [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355][E: packages/coding-agent/src/modes/rpc/rpc-types.ts:116][I].

`reference/agent-events.md` 覆盖可复用 `agent` 包的 `AgentEvent` 静态 union;本节点覆盖 coding-agent 对该 union 的 JSONL surface 化,尤其是 `AgentSessionEvent.agent_end.willRetry` 和 session-owned extra events [E: packages/agent/src/types.ts:431][E: packages/coding-agent/src/core/agent-session.ts:144][I].

retry 事件的归因字段并不对称：`summarization_retry_scheduled` 与 `summarization_retry_finished` 没有 `source` / `reason`；只有 `summarization_retry_attempt_start` 区分 `branchSummary` 与 `compaction`，且 compaction variant 额外带 reason。host 不能仅凭 scheduled/finished 单条 record 判断来源。[E: packages/coding-agent/src/core/agent-session.ts:171] [E: packages/coding-agent/src/core/agent-session.ts:178] [E: packages/coding-agent/src/core/agent-session.ts:180] [E: packages/coding-agent/src/core/agent-session.ts:182] [E: packages/coding-agent/src/core/agent-session.ts:184]

## Sources

- packages/coding-agent/docs/json.md
- packages/coding-agent/docs/rpc.md
- packages/coding-agent/src/modes/json-event.ts
- packages/coding-agent/src/modes/print-mode.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/coding-agent/src/modes/rpc/rpc-types.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/ai/src/types.ts
- packages/ai/src/utils/retry.ts
- packages/coding-agent/test/suite/regressions/7925-toolcall-start-metadata.test.ts

## 相关

- [surface.modes.print](../surface/modes/print.md): print/json 单次模式的启动、session event subscription 和 stdout 写出。
- [surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md): RPC JSONL framing、response/event 区分与 extension UI 子协议。
