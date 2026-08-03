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
symbols:
  - AgentSessionEvent
  - AgentEvent
  - AssistantMessageEvent
  - SessionHeader
related:
  - surface.modes.print
  - surface.modes.rpc-protocol
evidence: explicit
status: verified
updated: c1019d9202
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

`--mode json` 由 `runPrintMode()` 负责写 stdout:进入 json 模式时先取 `session.sessionManager.getHeader()`,若存在就把 header JSON.stringify 成一行;随后 `session.subscribe()` 收到的每个 event 都以 JSON Lines 写出 [E: packages/coding-agent/src/modes/print-mode.ts:112][E: packages/coding-agent/src/modes/print-mode.ts:113][E: packages/coding-agent/src/modes/print-mode.ts:115][E: packages/coding-agent/src/modes/print-mode.ts:104][E: packages/coding-agent/src/modes/print-mode.ts:106]. `SessionHeader` 的 discriminator 是 `type: "session"`,字段为 `version?`、`id`、`timestamp`、`cwd` 和可选 `parentSession` [E: packages/coding-agent/src/core/session-manager.ts:32][E: packages/coding-agent/src/core/session-manager.ts:38].

RPC mode 不是 `--mode json`,但它也把 `session.subscribe()` 得到的 `AgentSessionEvent` 直接写到 stdout JSONL;`RpcCommand` 从 stdin 输入,`RpcResponse` 和 events 从 stdout 输出 [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20][E: packages/coding-agent/src/modes/rpc/rpc-types.ts:115][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:354][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355]. RPC command response 的 `type: "response"` 和 extension UI 子协议不属于 `AgentSessionEvent` catalog;它们由 [surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md) 覆盖 [I].

`AgentSessionEvent` 由 coding-agent 产品层定义:它包含除 core `agent_end` 之外的全部 `AgentEvent`,把 `agent_end` 扩展为带 `willRetry: boolean`,并额外加入 settled、queue、compaction、entry、session info、thinking level、agent/summarization retry 和 direct-bash streaming 事件 [E: packages/coding-agent/src/core/agent-session.ts:140][E: packages/coding-agent/src/core/agent-session.ts:141][E: packages/coding-agent/src/core/agent-session.ts:147][E: packages/coding-agent/src/core/agent-session.ts:182]. core `AgentEvent` 的 lifecycle、turn、message、tool execution union 在 agent 包定义,其字段是这些 session events 的基础 [E: packages/agent/src/types.ts:422][E: packages/agent/src/types.ts:437].

## 顶层 JSONL record catalog

| JSON `type` | 顶层 shape / 字段 | 何时出现 | 输出面 | 证据 |
| --- | --- | --- | --- | --- |
| `session` | `SessionHeader`: `type`, `version?`, `id`, `timestamp`, `cwd`, `parentSession?` | `--mode json` 开始时若当前 `SessionManager` 有 header,先于 session events 写出一行。 | print json prelude,不是 `AgentSessionEvent`。 | [E: packages/coding-agent/src/core/session-manager.ts:32][E: packages/coding-agent/src/core/session-manager.ts:38][E: packages/coding-agent/src/core/session-manager.ts:1291][E: packages/coding-agent/src/core/session-manager.ts:1293][E: packages/coding-agent/src/modes/print-mode.ts:112][E: packages/coding-agent/src/modes/print-mode.ts:115] |
| `agent_start` | `{ type: "agent_start" }` | 一次 agent run 开始;prompt run 和 continue run 都会先 emit。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:424][E: packages/agent/src/agent-loop.ts:109][E: packages/agent/src/agent-loop.ts:138] |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[]; willRetry: boolean }` | 一次 agent run 结束;core event 携带 `messages`,coding-agent 在转发给 session listeners 时补 `willRetry`。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:425][E: packages/coding-agent/src/core/agent-session.ts:141][E: packages/coding-agent/src/core/agent-session.ts:145][E: packages/coding-agent/src/core/agent-session.ts:627][E: packages/agent/src/agent-loop.ts:198][E: packages/agent/src/agent-loop.ts:255][E: packages/agent/src/agent-loop.ts:274] |
| `agent_settled` | `{ type: "agent_settled" }` | session-level run 完全稳定、不会再自动 retry/compaction/queue continuation 后发出；比低层 `agent_end` 更适合 host 判断流程终止。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:147]; run order [E: packages/coding-agent/src/core/agent-session.ts:1066] [E: packages/coding-agent/src/core/agent-session.ts:1070] [E: packages/coding-agent/src/core/agent-session.ts:1076]; emit [E: packages/coding-agent/src/core/agent-session.ts:586] [E: packages/coding-agent/src/core/agent-session.ts:590]; docs [E: packages/coding-agent/docs/rpc.md:882] [E: packages/coding-agent/docs/rpc.md:887] |
| `turn_start` | `{ type: "turn_start" }` | agent run 内一个 assistant turn 开始;首 turn 在 run 启动后发,后续 turn 在内层 loop 继续时发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:427][E: packages/agent/src/agent-loop.ts:110][E: packages/agent/src/agent-loop.ts:139][E: packages/agent/src/agent-loop.ts:176] |
| `turn_end` | `{ type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }` | 一个 turn 的 assistant message 与该 turn tool results 完成后发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:428][E: packages/agent/src/agent-loop.ts:197][E: packages/agent/src/agent-loop.ts:224] |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | user prompt、queued user message、assistant partial/final message、tool result message 开始时发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:430][E: packages/agent/src/agent-loop.ts:112][E: packages/agent/src/agent-loop.ts:184][E: packages/agent/src/agent-loop.ts:323][E: packages/agent/src/agent-loop.ts:355][E: packages/agent/src/agent-loop.ts:790] |
| `message_update` | `{ type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }` | assistant provider stream 产生 text/thinking/toolcall incremental event 时发,并携带当前 partial assistant message。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:432][E: packages/agent/src/agent-loop.ts:326][E: packages/agent/src/agent-loop.ts:341][E: packages/ai/src/types.ts:502][E: packages/ai/src/types.ts:514] |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | user message、assistant final message、tool result message 完成时发;coding-agent 在该事件上持久化普通 message/custom message。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:433][E: packages/agent/src/agent-loop.ts:113][E: packages/agent/src/agent-loop.ts:185][E: packages/agent/src/agent-loop.ts:357][E: packages/agent/src/agent-loop.ts:370][E: packages/agent/src/agent-loop.ts:791][E: packages/coding-agent/src/core/agent-session.ts:630][E: packages/coding-agent/src/core/agent-session.ts:646] |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }` | tool call 通过 validation/preflight 前,串行与并行执行路径都会先 emit start。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:435][E: packages/agent/src/agent-loop.ts:445][E: packages/agent/src/agent-loop.ts:449][E: packages/agent/src/agent-loop.ts:500][E: packages/agent/src/agent-loop.ts:504] |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }` | tool implementation 调用 update callback 时发;`partialResult` 静态类型是 `any`。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:436][E: packages/agent/src/agent-loop.ts:684][E: packages/agent/src/agent-loop.ts:688] |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean }` | tool call 被 finalize 后发;`isError` 表示最终 tool result 是否错误。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/agent/src/types.ts:437][E: packages/agent/src/agent-loop.ts:765][E: packages/agent/src/agent-loop.ts:769] |
| `bash_execution_update` | `{ type: "bash_execution_update"; id?: string; delta: string }` | direct bash helper 每产生一个 output chunk 就发；RPC `bash` path 把 command correlation id 注入 `options.id`，interactive path 不传 id。final response 即使截断也不影响 chunk stream。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:182]; emit [E: packages/coding-agent/src/core/agent-session.ts:2795] [E: packages/coding-agent/src/core/agent-session.ts:2797]; RPC id [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:558] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:575]; interactive call [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6071] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6079]; docs [E: packages/coding-agent/docs/rpc.md:957] [E: packages/coding-agent/docs/rpc.md:961] |
| `queue_update` | `{ type: "queue_update"; steering: readonly string[]; followUp: readonly string[] }` | steering/follow-up 队列入队、队列消息被 agent loop 消费、或 clearQueue 清空队列时发,并携带两个队列的字符串快照。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:149][E: packages/coding-agent/src/core/agent-session.ts:151][E: packages/coding-agent/src/core/agent-session.ts:560][E: packages/coding-agent/src/core/agent-session.ts:617][E: packages/coding-agent/src/core/agent-session.ts:589][E: packages/coding-agent/src/core/agent-session.ts:617][E: packages/coding-agent/src/core/agent-session.ts:1384][E: packages/coding-agent/src/core/agent-session.ts:1401][E: packages/coding-agent/src/core/agent-session.ts:1527] |
| `compaction_start` | `{ type: "compaction_start"; reason: "manual" \| "threshold" \| "overflow" }` | manual compact 或自动 compact 开始时发;`reason` 区分手动、阈值触发和 overflow recovery。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:153][E: packages/coding-agent/src/core/agent-session.ts:1798][E: packages/coding-agent/src/core/agent-session.ts:2083] |
| `entry_appended` | `{ type: "entry_appended"; entry: SessionEntry }` | extension runtime 的 `pi.appendEntry(customType, data)` 成功追加 custom entry 后转发该 entry；普通 message、compaction 或 branch entry append 不由这个事件承诺覆盖。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:154]; extension append [E: packages/coding-agent/src/core/agent-session.ts:2388] [E: packages/coding-agent/src/core/agent-session.ts:2389]; emit [E: packages/coding-agent/src/core/agent-session.ts:2392] |
| `session_info_changed` | `{ type: "session_info_changed"; name: string \| undefined }` | `setSessionName()` 追加 session info 后发,`name` 来自 `sessionManager.getSessionName()`。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:155][E: packages/coding-agent/src/core/agent-session.ts:2884][E: packages/coding-agent/src/core/agent-session.ts:2887] |
| `thinking_level_changed` | `{ type: "thinking_level_changed"; level: ThinkingLevel }` | effective thinking level 与 previous level 不同时持久化 change entry 并发事件。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:156][E: packages/coding-agent/src/core/agent-session.ts:1690][E: packages/coding-agent/src/core/agent-session.ts:1703] |
| `compaction_end` | `{ type: "compaction_end"; reason; result: CompactionResult \| undefined; aborted: boolean; willRetry: boolean; errorMessage?: string }` | manual/auto compaction 结束、取消或失败时发;成功时 `result` 包含 summary、firstKeptEntryId、tokensBefore、estimatedTokensAfter、可选 provider `usage` 和 details。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:158][E: packages/coding-agent/src/core/agent-session.ts:163][E: packages/coding-agent/src/core/agent-session.ts:1904][E: packages/coding-agent/src/core/agent-session.ts:1909][E: packages/coding-agent/src/core/agent-session.ts:1912][E: packages/coding-agent/src/core/agent-session.ts:1917][E: packages/coding-agent/src/core/agent-session.ts:2102][E: packages/coding-agent/src/core/agent-session.ts:2127][E: packages/coding-agent/src/core/agent-session.ts:2185][E: packages/coding-agent/src/core/agent-session.ts:2190][E: packages/coding-agent/src/core/agent-session.ts:2193][E: packages/coding-agent/src/core/agent-session.ts:2210] |
| `auto_retry_start` | `{ type: "auto_retry_start"; attempt: number; maxAttempts: number; delayMs: number; errorMessage: string }` | retryable assistant error 准备自动重试时发,`delayMs` 使用指数退避计算。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:165][E: packages/coding-agent/src/core/agent-session.ts:2703][E: packages/coding-agent/src/core/agent-session.ts:2687] |
| `auto_retry_end` | `{ type: "auto_retry_end"; success: boolean; attempt: number; finalError?: string }` | retry 后收到非 error assistant response、最终失败、或 retry sleep 被取消时发。 | `AgentSessionEvent` in print json and RPC event stream. | [E: packages/coding-agent/src/core/agent-session.ts:166][E: packages/coding-agent/src/core/agent-session.ts:663][E: packages/coding-agent/src/core/agent-session.ts:667][E: packages/coding-agent/src/core/agent-session.ts:1091][E: packages/coding-agent/src/core/agent-session.ts:1096][E: packages/coding-agent/src/core/agent-session.ts:2725][E: packages/coding-agent/src/core/agent-session.ts:2729] |
| `summarization_retry_scheduled` | `{ type; attempt; maxAttempts; delayMs; errorMessage }` | compaction 或 branch-summary 的 transient stream error 已排入 retry delay；底层 callback 在 sleep 前触发。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:167] [E: packages/coding-agent/src/core/agent-session.ts:172]; emit [E: packages/coding-agent/src/core/agent-session.ts:2663] [E: packages/coding-agent/src/core/agent-session.ts:2668]; retry order [E: packages/ai/src/utils/retry.ts:196] [E: packages/ai/src/utils/retry.ts:201] |
| `summarization_retry_attempt_start` | branch summary 为 `{ type; source: "branchSummary" }`；compaction 再带 `reason` | retry delay 结束、下一次 summarization request 即将开始。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:174] [E: packages/coding-agent/src/core/agent-session.ts:176] [E: packages/coding-agent/src/core/agent-session.ts:178]; emit [E: packages/coding-agent/src/core/agent-session.ts:2672] [E: packages/coding-agent/src/core/agent-session.ts:2674]; retry order [E: packages/ai/src/utils/retry.ts:201] [E: packages/ai/src/utils/retry.ts:209] |
| `summarization_retry_finished` | `{ type: "summarization_retry_finished" }` | summarization retry loop 在成功、terminal failure 或 abort 后完成，用于清理 UI/host retry state；仅在至少安排过一次 retry 后触发。 | `AgentSessionEvent` in print json and RPC event stream. | type [E: packages/coding-agent/src/core/agent-session.ts:180]; emit [E: packages/coding-agent/src/core/agent-session.ts:2677] [E: packages/coding-agent/src/core/agent-session.ts:2678]; terminal callbacks [E: packages/ai/src/utils/retry.ts:177] [E: packages/ai/src/utils/retry.ts:183] [E: packages/ai/src/utils/retry.ts:189] [E: packages/ai/src/utils/retry.ts:203] |
| `extension_error` | `{ type: "extension_error"; extensionPath: string; event: string; error: string }` | RPC `bindExtensions()` 的 `onError` callback 写出的 RPC-only JSON record;它出现在 `docs/rpc.md` 的 Events 表,但不在 `AgentSessionEvent` union 中。 | RPC stdout only,not print json session event. | [E: packages/coding-agent/docs/rpc.md:1130][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:347][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:348] |

## `message_update.assistantMessageEvent` 嵌套 catalog

`message_update` 的 `assistantMessageEvent` 字段来自 `AssistantMessageEvent` union,这些 nested event 不会作为顶层 JSONL record 单独写出;它们被包在 `message_update` 的 payload 里 [E: packages/agent/src/types.ts:432][E: packages/agent/src/agent-loop.ts:338][E: packages/agent/src/agent-loop.ts:341][I].

| nested `assistantMessageEvent.type` | 字段/签名 | 含义 | 证据 |
| --- | --- | --- | --- |
| `start` | `{ type: "start"; partial: AssistantMessage }` | provider stream 的 assistant partial 开始事件;agent loop 把它转成顶层 `message_start`,不是顶层 `message_update`。 | [E: packages/ai/src/types.ts:503][E: packages/agent/src/agent-loop.ts:319][E: packages/agent/src/agent-loop.ts:323] |
| `text_start` | `{ type: "text_start"; contentIndex: number; partial: AssistantMessage }` | assistant text content block 开始。 | [E: packages/ai/src/types.ts:504][E: packages/agent/src/agent-loop.ts:326] |
| `text_delta` | `{ type: "text_delta"; contentIndex: number; delta: string; partial: AssistantMessage }` | assistant text delta。 | [E: packages/ai/src/types.ts:505][E: packages/agent/src/agent-loop.ts:327] |
| `text_end` | `{ type: "text_end"; contentIndex: number; content: string; partial: AssistantMessage }` | assistant text content block 结束。 | [E: packages/ai/src/types.ts:506][E: packages/agent/src/agent-loop.ts:328] |
| `thinking_start` | `{ type: "thinking_start"; contentIndex: number; partial: AssistantMessage }` | assistant thinking content block 开始。 | [E: packages/ai/src/types.ts:507][E: packages/agent/src/agent-loop.ts:329] |
| `thinking_delta` | `{ type: "thinking_delta"; contentIndex: number; delta: string; partial: AssistantMessage }` | assistant thinking delta。 | [E: packages/ai/src/types.ts:508][E: packages/agent/src/agent-loop.ts:330] |
| `thinking_end` | `{ type: "thinking_end"; contentIndex: number; content: string; partial: AssistantMessage }` | assistant thinking content block 结束。 | [E: packages/ai/src/types.ts:509][E: packages/agent/src/agent-loop.ts:331] |
| `toolcall_start` | `{ type: "toolcall_start"; contentIndex: number; partial: AssistantMessage }` | assistant tool call content block 开始。 | [E: packages/ai/src/types.ts:510][E: packages/agent/src/agent-loop.ts:332] |
| `toolcall_delta` | `{ type: "toolcall_delta"; contentIndex: number; delta: string; partial: AssistantMessage }` | assistant tool call arguments/name 的 streaming delta。 | [E: packages/ai/src/types.ts:511][E: packages/agent/src/agent-loop.ts:333] |
| `toolcall_end` | `{ type: "toolcall_end"; contentIndex: number; toolCall: ToolCall; partial: AssistantMessage }` | assistant tool call content block 结束,携带最终 `ToolCall`。 | [E: packages/ai/src/types.ts:512][E: packages/agent/src/agent-loop.ts:334] |
| `done` | `{ type: "done"; reason: "stop" \| "length" \| "toolUse"; message: AssistantMessage }` | provider stream 正常结束;agent loop 取 `response.result()` 后发顶层 `message_end`。 | [E: packages/ai/src/types.ts:513][E: packages/agent/src/agent-loop.ts:346][E: packages/agent/src/agent-loop.ts:357] |
| `error` | `{ type: "error"; reason: "aborted" \| "error"; error: AssistantMessage }` | provider stream 异常/取消结束;agent loop 同样取 final message 后发顶层 `message_end`。 | [E: packages/ai/src/types.ts:514][E: packages/agent/src/agent-loop.ts:347][E: packages/agent/src/agent-loop.ts:357] |

## 跨包关系

[surface.modes.print](../surface/modes/print.md) 说明 `runPrintMode()` 如何进入 text/json 单次模式、绑定 extensions、订阅 session events 并写 raw stdout;本 catalog 只枚举 json/event record 的 payload shape 与来源 [E: packages/coding-agent/src/modes/print-mode.ts:32][E: packages/coding-agent/src/modes/print-mode.ts:104][I].

[surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md) 说明 RPC JSONL framing、command response、extension UI request 和 typed client;本 catalog 只把 RPC 中直接转发的 `AgentSessionEvent` 与 RPC-only `extension_error` 区分出来 [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:354][E: packages/coding-agent/src/modes/rpc/rpc-types.ts:115][I].

`reference/agent-events.md` 覆盖可复用 `agent` 包的 `AgentEvent` 静态 union;本节点覆盖 coding-agent 对该 union 的 JSONL surface 化,尤其是 `AgentSessionEvent.agent_end.willRetry` 和 session-owned extra events [E: packages/agent/src/types.ts:422][E: packages/coding-agent/src/core/agent-session.ts:140][I].

retry 事件的归因字段并不对称：`summarization_retry_scheduled` 与 `summarization_retry_finished` 没有 `source` / `reason`；只有 `summarization_retry_attempt_start` 区分 `branchSummary` 与 `compaction`，且 compaction variant 额外带 reason。host 不能仅凭 scheduled/finished 单条 record 判断来源。[E: packages/coding-agent/src/core/agent-session.ts:167] [E: packages/coding-agent/src/core/agent-session.ts:174] [E: packages/coding-agent/src/core/agent-session.ts:176] [E: packages/coding-agent/src/core/agent-session.ts:178] [E: packages/coding-agent/src/core/agent-session.ts:180]

## Sources

- packages/coding-agent/docs/json.md
- packages/coding-agent/docs/rpc.md
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

## 相关

- [surface.modes.print](../surface/modes/print.md): print/json 单次模式的启动、session event subscription 和 stdout 写出。
- [surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md): RPC JSONL framing、response/event 区分与 extension UI 子协议。
