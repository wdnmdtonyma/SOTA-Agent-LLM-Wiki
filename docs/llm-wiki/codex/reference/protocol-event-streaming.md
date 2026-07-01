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
updated: db887d03e1
---

> `Event` 是 agent 发回客户端的 queue entry,用 `id` 关联 submission,用 `msg: EventMsg` 承载 payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 agent response event enum。[E: codex-rs/protocol/src/protocol.rs:1254][E: codex-rs/protocol/src/protocol.rs:1258][E: codex-rs/protocol/src/protocol.rs:1267]

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
| 1 | `RealtimeConversationRealtime` | `RealtimeConversationRealtimeEvent` | realtime conversation streaming payload。[E: codex-rs/protocol/src/protocol.rs:1282] | `protocol.rs:1233` |
| 2 | `RealtimeConversationSdp` | `RealtimeConversationSdpEvent` | realtime session description protocol payload。[E: codex-rs/protocol/src/protocol.rs:1288] | `protocol.rs:1239` |
| 3 | `AgentMessage` | `AgentMessageEvent` | assistant text output message；payload 含 `message`, optional `phase`, optional `memory_citation`。[E: codex-rs/protocol/src/protocol.rs:1327][E: codex-rs/protocol/src/protocol.rs:2308][E: codex-rs/protocol/src/protocol.rs:2260] | `protocol.rs:1275` |
| 4 | `UserMessage` | `UserMessageEvent` | 发送给模型的 user/system input message,可带 remote/local image 与 text elements。[E: codex-rs/protocol/src/protocol.rs:1330][E: codex-rs/protocol/src/protocol.rs:2317][E: codex-rs/protocol/src/protocol.rs:2342] | `protocol.rs:1278` |
| 5 | `AgentReasoning` | `AgentReasoningEvent` | agent reasoning text event。[E: codex-rs/protocol/src/protocol.rs:1333][E: codex-rs/protocol/src/protocol.rs:2346][E: codex-rs/protocol/src/protocol.rs:2294] | `protocol.rs:1281` |
| 6 | `AgentReasoningRawContent` | `AgentReasoningRawContentEvent` | raw reasoning content event。[E: codex-rs/protocol/src/protocol.rs:1336][E: codex-rs/protocol/src/protocol.rs:2351] | `protocol.rs:1284` |
| 7 | `AgentReasoningSectionBreak` | `AgentReasoningSectionBreakEvent` | reasoning summary section boundary,带 `item_id` 与 `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1339][E: codex-rs/protocol/src/protocol.rs:2356][E: codex-rs/protocol/src/protocol.rs:2308] | `protocol.rs:1287` |
| 8 | `RawResponseItem` | `RawResponseItemEvent` | 原始 Responses API item wrapper,字段是 `item: ResponseItem`。[E: codex-rs/protocol/src/protocol.rs:1432][E: codex-rs/protocol/src/protocol.rs:1785][E: codex-rs/protocol/src/protocol.rs:1742] | `protocol.rs:1380` |
| 9 | `ItemStarted` | `ItemStartedEvent` | v2 turn item start,包含 `thread_id`, `turn_id`, `item`, `started_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1434][E: codex-rs/protocol/src/protocol.rs:1790][E: codex-rs/protocol/src/protocol.rs:1749] | `protocol.rs:1382` |
| 10 | `ItemCompleted` | `ItemCompletedEvent` | v2 turn item completion,包含 `thread_id`, `turn_id`, `item`, `completed_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1435][E: codex-rs/protocol/src/protocol.rs:1817] | `protocol.rs:1383` |
| 11 | `AgentMessageContentDelta` | `AgentMessageContentDeltaEvent` | assistant message content delta,定位到 `thread_id`/`turn_id`/`item_id`。[E: codex-rs/protocol/src/protocol.rs:1439][E: codex-rs/protocol/src/protocol.rs:1849][E: codex-rs/protocol/src/protocol.rs:1809] | `protocol.rs:1387` |
| 12 | `PlanDelta` | `PlanDeltaEvent` | plan item delta。[E: codex-rs/protocol/src/protocol.rs:1440][E: codex-rs/protocol/src/protocol.rs:1863] | `protocol.rs:1388` |
| 13 | `ReasoningContentDelta` | `ReasoningContentDeltaEvent` | reasoning summary/content delta,带 defaulted `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1441][E: codex-rs/protocol/src/protocol.rs:1871] | `protocol.rs:1389` |
| 14 | `ReasoningRawContentDelta` | `ReasoningRawContentDeltaEvent` | raw reasoning content delta,带 defaulted `content_index`。[E: codex-rs/protocol/src/protocol.rs:1442][E: codex-rs/protocol/src/protocol.rs:1888][E: codex-rs/protocol/src/protocol.rs:1895] | `protocol.rs:1390` |

## Tool execution 与 hosted-tool events

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `McpToolCallBegin` | `McpToolCallBeginEvent` | MCP tool call begin,以 `call_id` 配对 end event,并携带 invocation/app/plugin metadata。[E: codex-rs/protocol/src/protocol.rs:1353][E: codex-rs/protocol/src/protocol.rs:2375] | `protocol.rs:1301` |
| 2 | `McpToolCallEnd` | `McpToolCallEndEvent` | MCP tool call end,带 duration 与 `Result<CallToolResult, String>`。[E: codex-rs/protocol/src/protocol.rs:1355][E: codex-rs/protocol/src/protocol.rs:2403] | `protocol.rs:1303` |
| 3 | `WebSearchBegin` | `WebSearchBeginEvent` | hosted web search begin,字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1357][E: codex-rs/protocol/src/protocol.rs:2470][E: codex-rs/protocol/src/protocol.rs:2388] | `protocol.rs:1305` |
| 4 | `WebSearchEnd` | `WebSearchEndEvent` | hosted web search end,带 `call_id`, `query`, `action`。[E: codex-rs/protocol/src/protocol.rs:1359][E: codex-rs/protocol/src/protocol.rs:2475][E: codex-rs/protocol/src/protocol.rs:2395] | `protocol.rs:1307` |
| 5 | `ImageGenerationBegin` | `ImageGenerationBeginEvent` | hosted image generation begin,字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1361][E: codex-rs/protocol/src/protocol.rs:2482] | `protocol.rs:1309` |
| 6 | `ImageGenerationEnd` | `ImageGenerationEndEvent` | hosted image generation end,带 status/result/revised prompt/saved path。[E: codex-rs/protocol/src/protocol.rs:1363][E: codex-rs/protocol/src/protocol.rs:2487][E: codex-rs/protocol/src/protocol.rs:2496] | `protocol.rs:1311` |
| 7 | `ExecCommandBegin` | `ExecCommandBeginEvent` | command execution begin,带 call/process/turn/start time、command、cwd、parsed command、source、interaction input。[E: codex-rs/protocol/src/protocol.rs:1366][E: codex-rs/protocol/src/protocol.rs:3474][E: codex-rs/protocol/src/protocol.rs:3258] | `protocol.rs:1314` |
| 8 | `ExecCommandOutputDelta` | `ExecCommandOutputDeltaEvent` | command output delta,带 `call_id`, stream 和 base64-serialized raw bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1369][E: codex-rs/protocol/src/protocol.rs:3562][E: codex-rs/protocol/src/protocol.rs:3571] | `protocol.rs:1317` |
| 9 | `TerminalInteraction` | `TerminalInteractionEvent` | running command 的 terminal interaction,带 `call_id`, `process_id`, `stdin`。[E: codex-rs/protocol/src/protocol.rs:1372][E: codex-rs/protocol/src/protocol.rs:3576] | `protocol.rs:1320` |
| 10 | `ExecCommandEnd` | `ExecCommandEndEvent` | command execution end,带 stdout/stderr/aggregated output/exit code/duration/formatted output/status。[E: codex-rs/protocol/src/protocol.rs:1374][E: codex-rs/protocol/src/protocol.rs:3500][E: codex-rs/protocol/src/protocol.rs:3539] | `protocol.rs:1322` |
| 11 | `ViewImageToolCall` | `ViewImageToolCallEvent` | `view_image` tool 附加 local image,带 call id 与 path。[E: codex-rs/protocol/src/protocol.rs:1377][E: codex-rs/protocol/src/protocol.rs:3543] | `protocol.rs:1325` |
| 12 | `DynamicToolCallRequest` | `DynamicToolCallRequest` | dynamic tool call request,带 call/turn/start time、namespace、tool、arguments。[E: codex-rs/protocol/src/protocol.rs:1385][E: codex-rs/protocol/src/dynamic_tools.rs:47] | `protocol.rs:1333` |
| 13 | `DynamicToolCallResponse` | `DynamicToolCallResponseEvent` | dynamic tool call response,带 call/turn/completed time、namespace/tool/arguments、content items、success/error 与 duration。[E: codex-rs/protocol/src/protocol.rs:1387][E: codex-rs/protocol/src/protocol.rs:2435][E: codex-rs/protocol/src/protocol.rs:2374] | `protocol.rs:1335` |

## Patch apply progress

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `PatchApplyBegin` | `PatchApplyBeginEvent` | 即将 apply code patch；注释说明它 mirrors `ExecCommandBegin` 以便 UI 显示 progress indicator。[E: codex-rs/protocol/src/protocol.rs:1406][E: codex-rs/protocol/src/protocol.rs:3618][E: codex-rs/protocol/src/protocol.rs:3387] | `protocol.rs:1354` |
| 2 | `PatchApplyUpdated` | `PatchApplyUpdatedEvent` | apply_patch input 生成过程中最新 structured file changes。[E: codex-rs/protocol/src/protocol.rs:1409][E: codex-rs/protocol/src/protocol.rs:3632][E: codex-rs/protocol/src/protocol.rs:3395] | `protocol.rs:1357` |
| 3 | `PatchApplyEnd` | `PatchApplyEndEvent` | patch application finished,带 stdout/stderr/success/changes/status。[E: codex-rs/protocol/src/protocol.rs:1412][E: codex-rs/protocol/src/protocol.rs:3640][E: codex-rs/protocol/src/protocol.rs:3657] | `protocol.rs:1360` |

## Raw response item boundary

`RawResponseItemEvent` 包装 `ResponseItem`,而 `ResponseItem` 自身是 `serde(tag = "type", rename_all = "snake_case")` enum；当前覆盖 additional tools、message、agent message、reasoning、local shell、function/custom/tool search/web search/image generation、compaction/context compaction 与 fallback `Other` 等 17 个变体。[E: codex-rs/protocol/src/protocol.rs:1785][E: codex-rs/protocol/src/models.rs:934][E: codex-rs/protocol/src/models.rs:937][E: codex-rs/protocol/src/models.rs:943][E: codex-rs/protocol/src/models.rs:959][E: codex-rs/protocol/src/models.rs:970][E: codex-rs/protocol/src/models.rs:983][E: codex-rs/protocol/src/models.rs:996][E: codex-rs/protocol/src/models.rs:1013][E: codex-rs/protocol/src/models.rs:1033][E: codex-rs/protocol/src/models.rs:1045][E: codex-rs/protocol/src/models.rs:1066][E: codex-rs/protocol/src/models.rs:1081][E: codex-rs/protocol/src/models.rs:1102][E: codex-rs/protocol/src/models.rs:1125][E: codex-rs/protocol/src/models.rs:1139][E: codex-rs/protocol/src/models.rs:1149][E: codex-rs/protocol/src/models.rs:1150][E: codex-rs/protocol/src/models.rs:1162]

## 设计动机速记

- v2 item stream (`ItemStarted` / `ItemCompleted` / delta events) 与 legacy hosted/tool begin/end events 并存；legacy conversion 在 `HasLegacyEvent` impl 中按 `TurnItem` 类型生成。[E: codex-rs/protocol/src/protocol.rs:1434][E: codex-rs/protocol/src/protocol.rs:1435][E: codex-rs/protocol/src/protocol.rs:1797][E: codex-rs/protocol/src/protocol.rs:1836][I]
- command execution 流拆成 begin、output delta、terminal interaction 与 end,其中 end payload 汇总 stdout/stderr/aggregated output/status,delta payload 保留原始 bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1366][E: codex-rs/protocol/src/protocol.rs:1369][E: codex-rs/protocol/src/protocol.rs:1372][E: codex-rs/protocol/src/protocol.rs:1374][E: codex-rs/protocol/src/protocol.rs:3286][E: codex-rs/protocol/src/protocol.rs:3571][I]
- dynamic tool request 与 response 是 protocol event,而客户端对 dynamic tool 的 answer 回到 submission side 的 `Op::DynamicToolResponse`。[E: codex-rs/protocol/src/protocol.rs:1385][E: codex-rs/protocol/src/protocol.rs:1387][E: codex-rs/protocol/src/protocol.rs:621][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/models.rs`

## 相关

- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md)
- [subsys.providers.sse-streaming](../subsystems/providers/sse-streaming.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.protocol-items](protocol-items.md)
