---
id: ref.protocol-event-streaming
title: Protocol EventMsg 流式内容事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/models.rs]
symbols: [Event, EventMsg, RawResponseItemEvent, ItemStartedEvent, ItemCompletedEvent, AgentMessageContentDeltaEvent, PlanDeltaEvent, ReasoningContentDeltaEvent, ReasoningRawContentDeltaEvent, ExecCommandBeginEvent, ExecCommandEndEvent, DynamicToolCallRequest, DynamicToolCallResponseEvent, PatchApplyBeginEvent, PatchApplyUpdatedEvent, PatchApplyEndEvent, ResponseItem]
related: [spine.tool-call-anatomy, subsys.providers.sse-streaming, ref.protocol-event-lifecycle, ref.protocol-items]
evidence: explicit
status: verified
updated: 5670360009
---

> `Event` 是 agent 发回客户端的 queue entry,用 `id` 关联 submission,用 `msg: EventMsg` 承载 payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 agent response event enum。[E: codex-rs/protocol/src/protocol.rs:1205][E: codex-rs/protocol/src/protocol.rs:1209][E: codex-rs/protocol/src/protocol.rs:1212][E: codex-rs/protocol/src/protocol.rs:1218]

## 能回答的问题

- 哪些 `EventMsg` 承载 assistant/user/reasoning 内容?
- TurnItem v2 item stream 与 legacy begin/end events 的边界在哪里?
- shell / unified exec 的 begin/output/interaction/end payload 字段是什么?
- web search、image generation、MCP、dynamic tool 的 request/response events 是哪些?
- patch apply 过程中有哪些 progress event?

## Streaming 分类边界

本节点只覆盖内容片段、item/delta、tool execution、dynamic tool、provider raw item 与 patch apply progress。turn/session lifecycle、approval prompts、guardian lifecycle、collab/subagent orchestration 由 `ref.protocol-event-lifecycle` 或对应子系统节点承接。[I]

## 内容与 item stream 事件

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `RealtimeConversationRealtime` | `RealtimeConversationRealtimeEvent` | realtime conversation streaming payload。[E: codex-rs/protocol/src/protocol.rs:1232][E: codex-rs/protocol/src/protocol.rs:1233] | `protocol.rs:1233` |
| 2 | `RealtimeConversationSdp` | `RealtimeConversationSdpEvent` | realtime session description protocol payload。[E: codex-rs/protocol/src/protocol.rs:1238][E: codex-rs/protocol/src/protocol.rs:1239] | `protocol.rs:1239` |
| 3 | `AgentMessage` | `AgentMessageEvent` | assistant text output message；payload 含 `message`, optional `phase`, optional `memory_citation`。[E: codex-rs/protocol/src/protocol.rs:1274][E: codex-rs/protocol/src/protocol.rs:1275][E: codex-rs/protocol/src/protocol.rs:2254][E: codex-rs/protocol/src/protocol.rs:2260] | `protocol.rs:1275` |
| 4 | `UserMessage` | `UserMessageEvent` | 发送给模型的 user/system input message,可带 remote/local image 与 text elements。[E: codex-rs/protocol/src/protocol.rs:1277][E: codex-rs/protocol/src/protocol.rs:1278][E: codex-rs/protocol/src/protocol.rs:2263][E: codex-rs/protocol/src/protocol.rs:2288] | `protocol.rs:1278` |
| 5 | `AgentReasoning` | `AgentReasoningEvent` | agent reasoning text event。[E: codex-rs/protocol/src/protocol.rs:1280][E: codex-rs/protocol/src/protocol.rs:1281][E: codex-rs/protocol/src/protocol.rs:2292][E: codex-rs/protocol/src/protocol.rs:2294] | `protocol.rs:1281` |
| 6 | `AgentReasoningRawContent` | `AgentReasoningRawContentEvent` | raw reasoning content event。[E: codex-rs/protocol/src/protocol.rs:1283][E: codex-rs/protocol/src/protocol.rs:1284][E: codex-rs/protocol/src/protocol.rs:2297][E: codex-rs/protocol/src/protocol.rs:2299] | `protocol.rs:1284` |
| 7 | `AgentReasoningSectionBreak` | `AgentReasoningSectionBreakEvent` | reasoning summary section boundary,带 `item_id` 与 `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1286][E: codex-rs/protocol/src/protocol.rs:1287][E: codex-rs/protocol/src/protocol.rs:2302][E: codex-rs/protocol/src/protocol.rs:2308] | `protocol.rs:1287` |
| 8 | `RawResponseItem` | `RawResponseItemEvent` | 原始 Responses API item wrapper,字段是 `item: ResponseItem`。[E: codex-rs/protocol/src/protocol.rs:1380][E: codex-rs/protocol/src/protocol.rs:1740][E: codex-rs/protocol/src/protocol.rs:1742] | `protocol.rs:1380` |
| 9 | `ItemStarted` | `ItemStartedEvent` | v2 turn item start,包含 `thread_id`, `turn_id`, `item`, `started_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1382][E: codex-rs/protocol/src/protocol.rs:1745][E: codex-rs/protocol/src/protocol.rs:1749] | `protocol.rs:1382` |
| 10 | `ItemCompleted` | `ItemCompletedEvent` | v2 turn item completion,包含 `thread_id`, `turn_id`, `item`, `completed_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1383][E: codex-rs/protocol/src/protocol.rs:1772][E: codex-rs/protocol/src/protocol.rs:1780] | `protocol.rs:1383` |
| 11 | `AgentMessageContentDelta` | `AgentMessageContentDeltaEvent` | assistant message content delta,定位到 `thread_id`/`turn_id`/`item_id`。[E: codex-rs/protocol/src/protocol.rs:1387][E: codex-rs/protocol/src/protocol.rs:1804][E: codex-rs/protocol/src/protocol.rs:1809] | `protocol.rs:1387` |
| 12 | `PlanDelta` | `PlanDeltaEvent` | plan item delta。[E: codex-rs/protocol/src/protocol.rs:1388][E: codex-rs/protocol/src/protocol.rs:1818][E: codex-rs/protocol/src/protocol.rs:1823] | `protocol.rs:1388` |
| 13 | `ReasoningContentDelta` | `ReasoningContentDeltaEvent` | reasoning summary/content delta,带 defaulted `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1389][E: codex-rs/protocol/src/protocol.rs:1826][E: codex-rs/protocol/src/protocol.rs:1834] | `protocol.rs:1389` |
| 14 | `ReasoningRawContentDelta` | `ReasoningRawContentDeltaEvent` | raw reasoning content delta,带 defaulted `content_index`。[E: codex-rs/protocol/src/protocol.rs:1390][E: codex-rs/protocol/src/protocol.rs:1843][E: codex-rs/protocol/src/protocol.rs:1850] | `protocol.rs:1390` |

## Tool execution 与 hosted-tool events

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `McpToolCallBegin` | `McpToolCallBeginEvent` | MCP tool call begin,以 `call_id` 配对 end event,并携带 invocation/app/plugin metadata。[E: codex-rs/protocol/src/protocol.rs:1301][E: codex-rs/protocol/src/protocol.rs:2321][E: codex-rs/protocol/src/protocol.rs:2331] | `protocol.rs:1301` |
| 2 | `McpToolCallEnd` | `McpToolCallEndEvent` | MCP tool call end,带 duration 与 `Result<CallToolResult, String>`。[E: codex-rs/protocol/src/protocol.rs:1303][E: codex-rs/protocol/src/protocol.rs:2334][E: codex-rs/protocol/src/protocol.rs:2348] | `protocol.rs:1303` |
| 3 | `WebSearchBegin` | `WebSearchBeginEvent` | hosted web search begin,字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1305][E: codex-rs/protocol/src/protocol.rs:2386][E: codex-rs/protocol/src/protocol.rs:2388] | `protocol.rs:1305` |
| 4 | `WebSearchEnd` | `WebSearchEndEvent` | hosted web search end,带 `call_id`, `query`, `action`。[E: codex-rs/protocol/src/protocol.rs:1307][E: codex-rs/protocol/src/protocol.rs:2391][E: codex-rs/protocol/src/protocol.rs:2395] | `protocol.rs:1307` |
| 5 | `ImageGenerationBegin` | `ImageGenerationBeginEvent` | hosted image generation begin,字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1309][E: codex-rs/protocol/src/protocol.rs:2398][E: codex-rs/protocol/src/protocol.rs:2400] | `protocol.rs:1309` |
| 6 | `ImageGenerationEnd` | `ImageGenerationEndEvent` | hosted image generation end,带 status/result/revised prompt/saved path。[E: codex-rs/protocol/src/protocol.rs:1311][E: codex-rs/protocol/src/protocol.rs:2403][E: codex-rs/protocol/src/protocol.rs:2412] | `protocol.rs:1311` |
| 7 | `ExecCommandBegin` | `ExecCommandBeginEvent` | command execution begin,带 call/process/turn/start time、command、cwd、parsed command、source、interaction input。[E: codex-rs/protocol/src/protocol.rs:1313][E: codex-rs/protocol/src/protocol.rs:1314][E: codex-rs/protocol/src/protocol.rs:3235][E: codex-rs/protocol/src/protocol.rs:3258] | `protocol.rs:1314` |
| 8 | `ExecCommandOutputDelta` | `ExecCommandOutputDeltaEvent` | command output delta,带 `call_id`, stream 和 base64-serialized raw bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1316][E: codex-rs/protocol/src/protocol.rs:1317][E: codex-rs/protocol/src/protocol.rs:3320][E: codex-rs/protocol/src/protocol.rs:3329] | `protocol.rs:1317` |
| 9 | `TerminalInteraction` | `TerminalInteractionEvent` | running command 的 terminal interaction,带 `call_id`, `process_id`, `stdin`。[E: codex-rs/protocol/src/protocol.rs:1319][E: codex-rs/protocol/src/protocol.rs:1320][E: codex-rs/protocol/src/protocol.rs:3334][E: codex-rs/protocol/src/protocol.rs:3341] | `protocol.rs:1320` |
| 10 | `ExecCommandEnd` | `ExecCommandEndEvent` | command execution end,带 stdout/stderr/aggregated output/exit code/duration/formatted output/status。[E: codex-rs/protocol/src/protocol.rs:1322][E: codex-rs/protocol/src/protocol.rs:3261][E: codex-rs/protocol/src/protocol.rs:3300] | `protocol.rs:1322` |
| 11 | `ViewImageToolCall` | `ViewImageToolCallEvent` | `view_image` tool 附加 local image,带 call id 与 path。[E: codex-rs/protocol/src/protocol.rs:1324][E: codex-rs/protocol/src/protocol.rs:1325][E: codex-rs/protocol/src/protocol.rs:3304][E: codex-rs/protocol/src/protocol.rs:3309] | `protocol.rs:1325` |
| 12 | `DynamicToolCallRequest` | `DynamicToolCallRequest` | dynamic tool call request,带 call/turn/start time、namespace、tool、arguments。[E: codex-rs/protocol/src/protocol.rs:1333][E: codex-rs/protocol/src/dynamic_tools.rs:47][E: codex-rs/protocol/src/dynamic_tools.rs:56] | `protocol.rs:1333` |
| 13 | `DynamicToolCallResponse` | `DynamicToolCallResponseEvent` | dynamic tool call response,带 call/turn/completed time、namespace/tool/arguments、content items、success/error 与 duration。[E: codex-rs/protocol/src/protocol.rs:1335][E: codex-rs/protocol/src/protocol.rs:2351][E: codex-rs/protocol/src/protocol.rs:2374] | `protocol.rs:1335` |

## Patch apply progress

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `PatchApplyBegin` | `PatchApplyBeginEvent` | 即将 apply code patch；注释说明它 mirrors `ExecCommandBegin` 以便 UI 显示 progress indicator。[E: codex-rs/protocol/src/protocol.rs:1352][E: codex-rs/protocol/src/protocol.rs:1354][E: codex-rs/protocol/src/protocol.rs:3376][E: codex-rs/protocol/src/protocol.rs:3387] | `protocol.rs:1354` |
| 2 | `PatchApplyUpdated` | `PatchApplyUpdatedEvent` | apply_patch input 生成过程中最新 structured file changes。[E: codex-rs/protocol/src/protocol.rs:1356][E: codex-rs/protocol/src/protocol.rs:1357][E: codex-rs/protocol/src/protocol.rs:3390][E: codex-rs/protocol/src/protocol.rs:3395] | `protocol.rs:1357` |
| 3 | `PatchApplyEnd` | `PatchApplyEndEvent` | patch application finished,带 stdout/stderr/success/changes/status。[E: codex-rs/protocol/src/protocol.rs:1359][E: codex-rs/protocol/src/protocol.rs:1360][E: codex-rs/protocol/src/protocol.rs:3398][E: codex-rs/protocol/src/protocol.rs:3415] | `protocol.rs:1360` |

## Raw response item boundary

`RawResponseItemEvent` 包装 `ResponseItem`,而 `ResponseItem` 自身是 `serde(tag = "type", rename_all = "snake_case")` enum；当前覆盖 message、agent message、reasoning、local shell、function/custom/tool search/web search/image generation、compaction/context compaction 与 fallback `Other` 等 16 个变体。[E: codex-rs/protocol/src/protocol.rs:1740][E: codex-rs/protocol/src/models.rs:919][E: codex-rs/protocol/src/models.rs:920][E: codex-rs/protocol/src/models.rs:937][E: codex-rs/protocol/src/models.rs:949][E: codex-rs/protocol/src/models.rs:963][E: codex-rs/protocol/src/models.rs:977][E: codex-rs/protocol/src/models.rs:995][E: codex-rs/protocol/src/models.rs:1016][E: codex-rs/protocol/src/models.rs:1029][E: codex-rs/protocol/src/models.rs:1048][E: codex-rs/protocol/src/models.rs:1064][E: codex-rs/protocol/src/models.rs:1086][E: codex-rs/protocol/src/models.rs:1110][E: codex-rs/protocol/src/models.rs:1125][E: codex-rs/protocol/src/models.rs:1135][E: codex-rs/protocol/src/models.rs:1144][E: codex-rs/protocol/src/models.rs:1157]

## 设计动机速记

- v2 item stream (`ItemStarted` / `ItemCompleted` / delta events) 与 legacy hosted/tool begin/end events 并存；legacy conversion 在 `HasLegacyEvent` impl 中按 `TurnItem` 类型生成。[E: codex-rs/protocol/src/protocol.rs:1382][E: codex-rs/protocol/src/protocol.rs:1383][E: codex-rs/protocol/src/protocol.rs:1752][E: codex-rs/protocol/src/protocol.rs:1791][I]
- command execution 流拆成 begin、output delta、terminal interaction 与 end,其中 end payload 汇总 stdout/stderr/aggregated output/status,delta payload 保留原始 bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1314][E: codex-rs/protocol/src/protocol.rs:1317][E: codex-rs/protocol/src/protocol.rs:1320][E: codex-rs/protocol/src/protocol.rs:1322][E: codex-rs/protocol/src/protocol.rs:3286][E: codex-rs/protocol/src/protocol.rs:3329][I]
- dynamic tool request 与 response 是 protocol event,而客户端对 dynamic tool 的 answer 回到 submission side 的 `Op::DynamicToolResponse`。[E: codex-rs/protocol/src/protocol.rs:1333][E: codex-rs/protocol/src/protocol.rs:1335][E: codex-rs/protocol/src/protocol.rs:612][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/models.rs`

## 相关

- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md)
- [subsys.providers.sse-streaming](../subsystems/providers/sse-streaming.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.protocol-items](protocol-items.md)
