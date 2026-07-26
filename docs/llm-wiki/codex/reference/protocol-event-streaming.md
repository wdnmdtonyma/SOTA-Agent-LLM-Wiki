---
id: ref.protocol-event-streaming
title: Protocol EventMsg 流式内容事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/legacy_events.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/models.rs]
symbols: [RawResponseItemEvent, RawResponseCompletedEvent, ItemStartedEvent, ItemCompletedEvent, AgentMessageContentDeltaEvent, PlanDeltaEvent, ReasoningContentDeltaEvent, ReasoningRawContentDeltaEvent, ExecCommandBeginEvent, ExecCommandEndEvent, DynamicToolCallResponseEvent, PatchApplyBeginEvent, PatchApplyUpdatedEvent, PatchApplyEndEvent]
related: [spine.tool-call-anatomy, subsys.providers.sse-streaming, ref.protocol-event-lifecycle, ref.protocol-items]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `Event` 是 agent 发回客户端的 queue entry,用 `id` 关联 submission,用 `msg: EventMsg` 承载 payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 agent response event enum。[E: codex-rs/protocol/src/protocol.rs:1261][E: codex-rs/protocol/src/protocol.rs:1265][E: codex-rs/protocol/src/protocol.rs:1279]

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
| 1 | `RealtimeConversationRealtime` | `RealtimeConversationRealtimeEvent` | realtime conversation streaming payload。[E: codex-rs/protocol/src/protocol.rs:1294] | `protocol.rs:1300` |
| 2 | `RealtimeConversationSdp` | `RealtimeConversationSdpEvent` | realtime session description protocol payload。[E: codex-rs/protocol/src/protocol.rs:1300] | `protocol.rs:1306` |
| 3 | `AgentMessage` | `AgentMessageEvent` | assistant text output message；payload 含 `message`, optional `phase`, optional `memory_citation`。[E: codex-rs/protocol/src/protocol.rs:1339][E: codex-rs/protocol/src/protocol.rs:2313][E: codex-rs/protocol/src/protocol.rs:2265] | `protocol.rs:1345` |
| 4 | `UserMessage` | `UserMessageEvent` | 发送给模型的 user/system input message,可带 remote/local image 与 text elements。[E: codex-rs/protocol/src/protocol.rs:1342][E: codex-rs/protocol/src/protocol.rs:2322][E: codex-rs/protocol/src/protocol.rs:2356] | `protocol.rs:1348` |
| 5 | `AgentReasoning` | `AgentReasoningEvent` | agent reasoning text event。[E: codex-rs/protocol/src/protocol.rs:1345][E: codex-rs/protocol/src/protocol.rs:2380][E: codex-rs/protocol/src/protocol.rs:2299] | `protocol.rs:1351` |
| 6 | `AgentReasoningRawContent` | `AgentReasoningRawContentEvent` | raw reasoning content event。[E: codex-rs/protocol/src/protocol.rs:1348][E: codex-rs/protocol/src/protocol.rs:2385] | `protocol.rs:1354` |
| 7 | `AgentReasoningSectionBreak` | `AgentReasoningSectionBreakEvent` | reasoning summary section boundary,带 `item_id` 与 `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1351][E: codex-rs/protocol/src/protocol.rs:2390][E: codex-rs/protocol/src/protocol.rs:2313] | `protocol.rs:1357` |
| 8 | `RawResponseItem` | `RawResponseItemEvent` | 原始 Responses API item wrapper,字段是 `item: ResponseItem`。[E: codex-rs/protocol/src/protocol.rs:1450][E: codex-rs/protocol/src/protocol.rs:1816][E: codex-rs/protocol/src/protocol.rs:1773] | `protocol.rs:1456` |
| 8a | `RawResponseCompleted` | `RawResponseCompletedEvent` | 一次 provider response 完整结束；payload 带 response id 与 optional token usage,与逐 item 的 raw stream 分开。[E: codex-rs/protocol/src/protocol.rs:1451] | `protocol.rs:1457` |
| 9 | `ItemStarted` | `ItemStartedEvent` | v2 turn item start,包含 `thread_id`, `turn_id`, `item`, `started_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1453][E: codex-rs/protocol/src/protocol.rs:1830][E: codex-rs/protocol/src/protocol.rs:1780] | `protocol.rs:1459` |
| 10 | `ItemCompleted` | `ItemCompletedEvent` | v2 turn item completion,包含 `thread_id`, `turn_id`, `item`, `completed_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1454][E: codex-rs/protocol/src/protocol.rs:1838] | `protocol.rs:1460` |
| 11 | `AgentMessageContentDelta` | `AgentMessageContentDeltaEvent` | assistant message content delta,定位到 `thread_id`/`turn_id`/`item_id`。[E: codex-rs/protocol/src/protocol.rs:1458][E: codex-rs/protocol/src/protocol.rs:1857][E: codex-rs/protocol/src/protocol.rs:1803] | `protocol.rs:1464` |
| 12 | `PlanDelta` | `PlanDeltaEvent` | plan item delta。[E: codex-rs/protocol/src/protocol.rs:1459][E: codex-rs/protocol/src/protocol.rs:1865] | `protocol.rs:1465` |
| 13 | `ReasoningContentDelta` | `ReasoningContentDeltaEvent` | reasoning summary/content delta,带 defaulted `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1460][E: codex-rs/protocol/src/protocol.rs:1873] | `protocol.rs:1466` |
| 14 | `ReasoningRawContentDelta` | `ReasoningRawContentDeltaEvent` | raw reasoning content delta,带 defaulted `content_index`。[E: codex-rs/protocol/src/protocol.rs:1461][E: codex-rs/protocol/src/protocol.rs:1884][E: codex-rs/protocol/src/protocol.rs:1891] | `protocol.rs:1467` |

## Tool execution 与 hosted-tool events

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `McpToolCallBegin` | `McpToolCallBeginEvent` | MCP tool call begin,以 `call_id` 配对 end event,并携带 invocation/app/plugin metadata。[E: codex-rs/protocol/src/protocol.rs:1371][E: codex-rs/protocol/src/protocol.rs:2409] | `protocol.rs:1377` |
| 2 | `McpToolCallEnd` | `McpToolCallEndEvent` | MCP tool call end,带 duration 与 `Result<CallToolResult, String>`。[E: codex-rs/protocol/src/protocol.rs:1373][E: codex-rs/protocol/src/protocol.rs:2434] | `protocol.rs:1379` |
| 3 | `WebSearchBegin` | `WebSearchBeginEvent` | hosted web search begin,字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1375][E: codex-rs/protocol/src/protocol.rs:2498][E: codex-rs/protocol/src/protocol.rs:2422] | `protocol.rs:1381` |
| 4 | `WebSearchEnd` | `WebSearchEndEvent` | hosted web search end,带 `call_id`, `query`, `action`。[E: codex-rs/protocol/src/protocol.rs:1377][E: codex-rs/protocol/src/protocol.rs:2503][E: codex-rs/protocol/src/protocol.rs:2426] | `protocol.rs:1383` |
| 5 | `ImageGenerationBegin` | `ImageGenerationBeginEvent` | hosted image generation begin,字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1379][E: codex-rs/protocol/src/protocol.rs:2514] | `protocol.rs:1385` |
| 6 | `ImageGenerationEnd` | `ImageGenerationEndEvent` | hosted image generation end,带 status/result/revised prompt/saved path。[E: codex-rs/protocol/src/protocol.rs:1381][E: codex-rs/protocol/src/protocol.rs:2519][E: codex-rs/protocol/src/protocol.rs:2528] | `protocol.rs:1387` |
| 7 | `ExecCommandBegin` | `ExecCommandBeginEvent` | command execution begin,带 call/process/turn/start time、command、cwd、parsed command、source、interaction input。[E: codex-rs/protocol/src/protocol.rs:1384][E: codex-rs/protocol/src/protocol.rs:3509][E: codex-rs/protocol/src/protocol.rs:3291] | `protocol.rs:1390` |
| 8 | `ExecCommandOutputDelta` | `ExecCommandOutputDeltaEvent` | command output delta,带 `call_id`, stream 和 base64-serialized raw bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1387][E: codex-rs/protocol/src/protocol.rs:3613][E: codex-rs/protocol/src/protocol.rs:3622] | `protocol.rs:1393` |
| 9 | `TerminalInteraction` | `TerminalInteractionEvent` | running command 的 terminal interaction,带 `call_id`, `process_id`, `stdin`。[E: codex-rs/protocol/src/protocol.rs:1390][E: codex-rs/protocol/src/protocol.rs:3627] | `protocol.rs:1396` |
| 10 | `ExecCommandEnd` | `ExecCommandEndEvent` | command execution end,带 stdout/stderr/aggregated output/exit code/duration/formatted output/status。[E: codex-rs/protocol/src/protocol.rs:1392][E: codex-rs/protocol/src/protocol.rs:3543][E: codex-rs/protocol/src/protocol.rs:3590] | `protocol.rs:1398` |
| 11 | `ViewImageToolCall` | `ViewImageToolCallEvent` | `view_image` tool 附加 local image,带 call id 与 path。[E: codex-rs/protocol/src/protocol.rs:1395][E: codex-rs/protocol/src/protocol.rs:3594] | `protocol.rs:1401` |
| 12 | `DynamicToolCallRequest` | `DynamicToolCallRequest` | dynamic tool call request,带 call/turn/start time、namespace、tool、arguments。[E: codex-rs/protocol/src/protocol.rs:1403][E: codex-rs/protocol/src/dynamic_tools.rs:47] | `protocol.rs:1409` |
| 13 | `DynamicToolCallResponse` | `DynamicToolCallResponseEvent` | dynamic tool call response,带 call/turn/completed time、namespace/tool/arguments、content items、success/error 与 duration。[E: codex-rs/protocol/src/protocol.rs:1405][E: codex-rs/protocol/src/protocol.rs:2463][E: codex-rs/protocol/src/protocol.rs:2408] | `protocol.rs:1411` |

## Patch apply progress

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `PatchApplyBegin` | `PatchApplyBeginEvent` | 即将 apply code patch；注释说明它 mirrors `ExecCommandBegin` 以便 UI 显示 progress indicator。[E: codex-rs/protocol/src/protocol.rs:1424][E: codex-rs/protocol/src/protocol.rs:3669][E: codex-rs/protocol/src/protocol.rs:3422] | `protocol.rs:1430` |
| 2 | `PatchApplyUpdated` | `PatchApplyUpdatedEvent` | apply_patch input 生成过程中最新 structured file changes。[E: codex-rs/protocol/src/protocol.rs:1427][E: codex-rs/protocol/src/protocol.rs:3683][E: codex-rs/protocol/src/protocol.rs:3430] | `protocol.rs:1433` |
| 3 | `PatchApplyEnd` | `PatchApplyEndEvent` | patch application finished,带 stdout/stderr/success/changes/status。[E: codex-rs/protocol/src/protocol.rs:1430][E: codex-rs/protocol/src/protocol.rs:3691][E: codex-rs/protocol/src/protocol.rs:3708] | `protocol.rs:1436` |

## Raw response item boundary

`RawResponseItemEvent` 包装 `ResponseItem`,而 `ResponseItem` 自身是 `serde(tag = "type", rename_all = "snake_case")` enum；当前覆盖 additional tools、message、agent message、reasoning、local shell、function/custom/tool search/web search/image generation、compaction/context compaction 与 fallback `Other` 等 17 个变体。[E: codex-rs/protocol/src/protocol.rs:1816][E: codex-rs/protocol/src/models.rs:799][E: codex-rs/protocol/src/models.rs:802][E: codex-rs/protocol/src/models.rs:808][E: codex-rs/protocol/src/models.rs:824][E: codex-rs/protocol/src/models.rs:835][E: codex-rs/protocol/src/models.rs:848][E: codex-rs/protocol/src/models.rs:861][E: codex-rs/protocol/src/models.rs:878][E: codex-rs/protocol/src/models.rs:898][E: codex-rs/protocol/src/models.rs:910][E: codex-rs/protocol/src/models.rs:931][E: codex-rs/protocol/src/models.rs:946][E: codex-rs/protocol/src/models.rs:967][E: codex-rs/protocol/src/models.rs:990][E: codex-rs/protocol/src/models.rs:1004][E: codex-rs/protocol/src/models.rs:1014][E: codex-rs/protocol/src/models.rs:1015][E: codex-rs/protocol/src/models.rs:1027]

## 设计动机速记

- v2 item stream (`ItemStarted` / `ItemCompleted` / delta events) 与 legacy hosted/tool begin/end events 并存；兼容转换已集中到 `legacy_events.rs` 的 `HasLegacyEvent` 与各 item helper 中。[E: codex-rs/protocol/src/protocol.rs:1453][E: codex-rs/protocol/src/protocol.rs:1454][E: codex-rs/protocol/src/legacy_events.rs:67][I]
- command execution 流拆成 begin、output delta、terminal interaction 与 end,其中 end payload 汇总 stdout/stderr/aggregated output/status,delta payload 保留原始 bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1384][E: codex-rs/protocol/src/protocol.rs:1387][E: codex-rs/protocol/src/protocol.rs:1390][E: codex-rs/protocol/src/protocol.rs:1392][E: codex-rs/protocol/src/protocol.rs:3319][E: codex-rs/protocol/src/protocol.rs:3622][I]
- dynamic tool request 与 response 是 protocol event,而客户端对 dynamic tool 的 answer 回到 submission side 的 `Op::DynamicToolResponse`。[E: codex-rs/protocol/src/protocol.rs:1403][E: codex-rs/protocol/src/protocol.rs:1405][E: codex-rs/protocol/src/protocol.rs:628][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/legacy_events.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/models.rs`

## 相关

- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md)
- [subsys.providers.sse-streaming](../subsystems/providers/sse-streaming.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.protocol-items](protocol-items.md)
