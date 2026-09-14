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
updated: 3abbf9fe2c
---

> `Event` 是 agent 发回客户端的 queue entry,用 `id` 关联 submission,用 `msg: EventMsg` 承载 payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 agent response event enum，当前共 83 个变体，本页收录其中 31 个 streaming 变体。[E: codex-rs/protocol/src/protocol.rs:1339][E: codex-rs/protocol/src/protocol.rs:1343][E: codex-rs/protocol/src/protocol.rs:1357]

## 能回答的问题

- 哪些 `EventMsg` 承载 assistant/user/reasoning 内容?
- TurnItem v2 item stream 与 legacy begin/end events 的边界在哪里?
- shell / unified exec 的 begin/output/interaction/end payload 字段是什么?
- web search、image generation、MCP、dynamic tool 的 request/response events 是哪些?
- patch apply 过程中有哪些 progress event?

## Streaming 分类边界

本节点只覆盖内容片段、item/delta、tool execution、dynamic tool、provider raw item 与 patch apply progress。turn/session lifecycle、approval prompts、guardian lifecycle、auth recovery、collab/subagent orchestration 由 `ref.protocol-event-lifecycle` 或对应子系统节点承接。两页合计覆盖全部 83 个 `EventMsg` 变体。

## 内容与 item stream 事件

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `RealtimeConversationRealtime` | `RealtimeConversationRealtimeEvent` | realtime conversation streaming payload。[E: codex-rs/protocol/src/protocol.rs:1378] | `protocol.rs:1385` |
| 2 | `RealtimeConversationSdp` | `RealtimeConversationSdpEvent` | realtime session description protocol payload。[E: codex-rs/protocol/src/protocol.rs:1384] | `protocol.rs:1391` |
| 3 | `AgentMessage` | `AgentMessageEvent` | assistant text output message。[E: codex-rs/protocol/src/protocol.rs:1424] | `protocol.rs:1430` |
| 4 | `UserMessage` | `UserMessageEvent` | 发送给模型的 user/system input message。[E: codex-rs/protocol/src/protocol.rs:1427] | `protocol.rs:1433` |
| 5 | `AgentReasoning` | `AgentReasoningEvent` | agent reasoning text event。[E: codex-rs/protocol/src/protocol.rs:1430] | `protocol.rs:1436` |
| 6 | `AgentReasoningRawContent` | `AgentReasoningRawContentEvent` | raw reasoning content event。[E: codex-rs/protocol/src/protocol.rs:1433] | `protocol.rs:1439` |
| 7 | `AgentReasoningSectionBreak` | `AgentReasoningSectionBreakEvent` | reasoning summary section boundary。[E: codex-rs/protocol/src/protocol.rs:1436] | `protocol.rs:1442` |
| 8 | `RawResponseItem` | `RawResponseItemEvent` | 原始 Responses API item wrapper,字段是 `item: ResponseItem`。[E: codex-rs/protocol/src/protocol.rs:1538] | `protocol.rs:1544` |
| 9 | `RawResponseCompleted` | `RawResponseCompletedEvent` | 一次 provider response 完整结束。[E: codex-rs/protocol/src/protocol.rs:1539] | `protocol.rs:1545` |
| 10 | `ItemStarted` | `ItemStartedEvent` | v2 turn item start。[E: codex-rs/protocol/src/protocol.rs:1541] | `protocol.rs:1547` |
| 11 | `ItemCompleted` | `ItemCompletedEvent` | v2 turn item completion。[E: codex-rs/protocol/src/protocol.rs:1542] | `protocol.rs:1548` |
| 12 | `AgentMessageContentDelta` | `AgentMessageContentDeltaEvent` | assistant message content delta。[E: codex-rs/protocol/src/protocol.rs:1546] | `protocol.rs:1552` |
| 13 | `PlanDelta` | `PlanDeltaEvent` | plan item delta。[E: codex-rs/protocol/src/protocol.rs:1547] | `protocol.rs:1553` |
| 14 | `ReasoningContentDelta` | `ReasoningContentDeltaEvent` | reasoning summary/content delta。[E: codex-rs/protocol/src/protocol.rs:1548] | `protocol.rs:1554` |
| 15 | `ReasoningRawContentDelta` | `ReasoningRawContentDeltaEvent` | raw reasoning content delta。[E: codex-rs/protocol/src/protocol.rs:1549] | `protocol.rs:1555` |

## Tool execution 与 hosted-tool events

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `McpToolCallBegin` | `McpToolCallBeginEvent` | MCP tool call begin。[E: codex-rs/protocol/src/protocol.rs:1459] | `protocol.rs:1465` |
| 2 | `McpToolCallEnd` | `McpToolCallEndEvent` | MCP tool call end。[E: codex-rs/protocol/src/protocol.rs:1461] | `protocol.rs:1467` |
| 3 | `WebSearchBegin` | `WebSearchBeginEvent` | hosted web search begin。[E: codex-rs/protocol/src/protocol.rs:1463] | `protocol.rs:1469` |
| 4 | `WebSearchEnd` | `WebSearchEndEvent` | web search end。[E: codex-rs/protocol/src/protocol.rs:1465] | `protocol.rs:1471` |
| 5 | `ImageGenerationBegin` | `ImageGenerationBeginEvent` | hosted image generation begin。[E: codex-rs/protocol/src/protocol.rs:1467] | `protocol.rs:1473` |
| 6 | `ImageGenerationEnd` | `ImageGenerationEndEvent` | hosted image generation end。[E: codex-rs/protocol/src/protocol.rs:1469] | `protocol.rs:1475` |
| 7 | `ExecCommandBegin` | `ExecCommandBeginEvent` | command execution begin。[E: codex-rs/protocol/src/protocol.rs:1472] | `protocol.rs:1478` |
| 8 | `ExecCommandOutputDelta` | `ExecCommandOutputDeltaEvent` | command output delta。[E: codex-rs/protocol/src/protocol.rs:1475] | `protocol.rs:1481` |
| 9 | `TerminalInteraction` | `TerminalInteractionEvent` | running command 的 terminal interaction。[E: codex-rs/protocol/src/protocol.rs:1478] | `protocol.rs:1484` |
| 10 | `ExecCommandEnd` | `ExecCommandEndEvent` | command execution end。[E: codex-rs/protocol/src/protocol.rs:1480] | `protocol.rs:1486` |
| 11 | `ViewImageToolCall` | `ViewImageToolCallEvent` | `view_image` tool 附加 local image。[E: codex-rs/protocol/src/protocol.rs:1483] | `protocol.rs:1489` |
| 12 | `DynamicToolCallRequest` | `DynamicToolCallRequest` | dynamic tool call request。[E: codex-rs/protocol/src/protocol.rs:1491] | `protocol.rs:1497` |
| 13 | `DynamicToolCallResponse` | `DynamicToolCallResponseEvent` | dynamic tool call response。[E: codex-rs/protocol/src/protocol.rs:1493] | `protocol.rs:1499` |

## Patch apply progress

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `PatchApplyBegin` | `PatchApplyBeginEvent` | apply code patch 的 begin progress event。[E: codex-rs/protocol/src/protocol.rs:1512] | `protocol.rs:1518` |
| 2 | `PatchApplyUpdated` | `PatchApplyUpdatedEvent` | apply_patch input 生成过程中最新 structured file changes。[E: codex-rs/protocol/src/protocol.rs:1515] | `protocol.rs:1521` |
| 3 | `PatchApplyEnd` | `PatchApplyEndEvent` | patch application finished。[E: codex-rs/protocol/src/protocol.rs:1518] | `protocol.rs:1524` |

## Raw response item boundary

`RawResponseItemEvent` 包装 `ResponseItem`，而 `ResponseItem` 自身是 `serde(tag = "type", rename_all = "snake_case")` enum。[E: codex-rs/protocol/src/protocol.rs:1538][E: codex-rs/protocol/src/models.rs:1000][E: codex-rs/protocol/src/models.rs:1001] `FunctionCall` 仍可带 optional `encrypted_function_args`；可携 metadata 的 response items 复用 `InternalChatMessageMetadataPassthrough`，其中 `executed_tool_calls` 是 warehouse-only，跳过 deserialize/public schema/TS。[E: codex-rs/protocol/src/models.rs:1077][E: codex-rs/protocol/src/models.rs:949][E: codex-rs/protocol/src/models.rs:975]

## 设计动机速记

- v2 item stream (`ItemStarted` / `ItemCompleted` / delta events) 与 legacy hosted/tool begin/end events 并存；兼容转换已集中到 `legacy_events.rs` 的 `HasLegacyEvent`。[E: codex-rs/protocol/src/protocol.rs:1541][E: codex-rs/protocol/src/protocol.rs:1542][E: codex-rs/protocol/src/legacy_events.rs:67]
- command execution 流拆成 begin、output delta、terminal interaction 与 end。[E: codex-rs/protocol/src/protocol.rs:1472][E: codex-rs/protocol/src/protocol.rs:1475][E: codex-rs/protocol/src/protocol.rs:1478][E: codex-rs/protocol/src/protocol.rs:1480]
- dynamic tool request 与 response 是 protocol event,而客户端对 dynamic tool 的 answer 回到 submission side 的 `Op::DynamicToolResponse`。[E: codex-rs/protocol/src/protocol.rs:1491][E: codex-rs/protocol/src/protocol.rs:1493][E: codex-rs/protocol/src/protocol.rs:719]

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
