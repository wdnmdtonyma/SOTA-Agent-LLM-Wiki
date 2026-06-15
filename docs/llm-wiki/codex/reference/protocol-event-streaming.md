---
id: ref.protocol-event-streaming
title: Protocol EventMsg 流式内容事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs]
symbols: [EventMsg]
related: [spine.tool-call-anatomy, subsys.providers.sse-streaming, ref.protocol-event-lifecycle, ref.protocol-items]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `EventMsg` 是 agent response event 的 payload enum；本节点对其中的模型内容 streaming、tool execution streaming、tool-result payload、raw response item、patch streaming 和 delta 类变体做文档分类。[E: codex-rs/protocol/src/protocol.rs:1422][E: codex-rs/protocol/src/protocol.rs:1423][E: codex-rs/protocol/src/protocol.rs:1426][E: codex-rs/protocol/src/protocol.rs:1432][I]

## 能回答的问题

- 哪些 `EventMsg` 会流式传出 assistant text、reasoning、raw reasoning 或 plan delta?
- shell / unified exec 相关 output streaming event 的顺序有哪些?
- web search、image generation、MCP tool call 的 begin/end event 名称是什么?
- patch apply 过程中有哪些 progress event?
- `EventMsg` 中 raw Responses API item 与 Codex-normalized item/delta 的边界是什么?

## Streaming 分类边界

本节点收录 "内容片段、delta、tool execution begin/end/output、provider raw item、patch apply progress" 类 `EventMsg` 变体；session/turn lifecycle、approval prompts、collab orchestration、history/list responses 由 `ref.protocol-event-lifecycle` 收录。[I]

## Streaming / payload EventMsg 变体表

| # | Variant | Payload | 流式含义 | 定义处 |
|---:|---|---|---|---|
| 1 | `RealtimeConversationRealtime` | `RealtimeConversationRealtimeEvent` | realtime conversation streaming payload。[E: codex-rs/protocol/src/protocol.rs:1443][E: codex-rs/protocol/src/protocol.rs:1444] | `EventMsg::RealtimeConversationRealtime` |
| 2 | `AgentMessage` | `AgentMessageEvent` | assistant text output message。[E: codex-rs/protocol/src/protocol.rs:1475][E: codex-rs/protocol/src/protocol.rs:1476] | `EventMsg::AgentMessage` |
| 3 | `UserMessage` | `UserMessageEvent` | 发送给模型的 user/system input message。[E: codex-rs/protocol/src/protocol.rs:1478][E: codex-rs/protocol/src/protocol.rs:1479] | `EventMsg::UserMessage` |
| 4 | `AgentMessageDelta` | `AgentMessageDeltaEvent` | assistant text output delta。[E: codex-rs/protocol/src/protocol.rs:1481][E: codex-rs/protocol/src/protocol.rs:1482] | `EventMsg::AgentMessageDelta` |
| 5 | `AgentReasoning` | `AgentReasoningEvent` | agent reasoning event。[E: codex-rs/protocol/src/protocol.rs:1484][E: codex-rs/protocol/src/protocol.rs:1485] | `EventMsg::AgentReasoning` |
| 6 | `AgentReasoningDelta` | `AgentReasoningDeltaEvent` | agent reasoning delta。[E: codex-rs/protocol/src/protocol.rs:1487][E: codex-rs/protocol/src/protocol.rs:1488] | `EventMsg::AgentReasoningDelta` |
| 7 | `AgentReasoningRawContent` | `AgentReasoningRawContentEvent` | raw chain-of-thought content event。[E: codex-rs/protocol/src/protocol.rs:1490][E: codex-rs/protocol/src/protocol.rs:1491] | `EventMsg::AgentReasoningRawContent` |
| 8 | `AgentReasoningRawContentDelta` | `AgentReasoningRawContentDeltaEvent` | raw reasoning content delta。[E: codex-rs/protocol/src/protocol.rs:1494] | `EventMsg::AgentReasoningRawContentDelta` |
| 9 | `AgentReasoningSectionBreak` | `AgentReasoningSectionBreakEvent` | model 开始新的 reasoning summary section，例如新的 titled block。[E: codex-rs/protocol/src/protocol.rs:1495][E: codex-rs/protocol/src/protocol.rs:1496] | `EventMsg::AgentReasoningSectionBreak` |
| 10 | `McpToolCallBegin` | `McpToolCallBeginEvent` | MCP tool call begin notification。[E: codex-rs/protocol/src/protocol.rs:1510] | `EventMsg::McpToolCallBegin` |
| 11 | `McpToolCallEnd` | `McpToolCallEndEvent` | MCP tool call end notification。[E: codex-rs/protocol/src/protocol.rs:1512] | `EventMsg::McpToolCallEnd` |
| 12 | `WebSearchBegin` | `WebSearchBeginEvent` | web search begin notification。[E: codex-rs/protocol/src/protocol.rs:1514] | `EventMsg::WebSearchBegin` |
| 13 | `WebSearchEnd` | `WebSearchEndEvent` | web search end notification。[E: codex-rs/protocol/src/protocol.rs:1516] | `EventMsg::WebSearchEnd` |
| 14 | `ImageGenerationBegin` | `ImageGenerationBeginEvent` | image generation begin notification。[E: codex-rs/protocol/src/protocol.rs:1518] | `EventMsg::ImageGenerationBegin` |
| 15 | `ImageGenerationEnd` | `ImageGenerationEndEvent` | image generation end notification。[E: codex-rs/protocol/src/protocol.rs:1520] | `EventMsg::ImageGenerationEnd` |
| 16 | `ExecCommandBegin` | `ExecCommandBeginEvent` | server 即将执行 command。[E: codex-rs/protocol/src/protocol.rs:1522][E: codex-rs/protocol/src/protocol.rs:1523] | `EventMsg::ExecCommandBegin` |
| 17 | `ExecCommandOutputDelta` | `ExecCommandOutputDeltaEvent` | running command 的 incremental output chunk。[E: codex-rs/protocol/src/protocol.rs:1525][E: codex-rs/protocol/src/protocol.rs:1526] | `EventMsg::ExecCommandOutputDelta` |
| 18 | `TerminalInteraction` | `TerminalInteractionEvent` | in-progress command 的 terminal interaction。[E: codex-rs/protocol/src/protocol.rs:1528][E: codex-rs/protocol/src/protocol.rs:1529] | `EventMsg::TerminalInteraction` |
| 19 | `ExecCommandEnd` | `ExecCommandEndEvent` | command execution end notification。[E: codex-rs/protocol/src/protocol.rs:1531] | `EventMsg::ExecCommandEnd` |
| 20 | `ViewImageToolCall` | `ViewImageToolCallEvent` | agent 通过 `view_image` tool 附加 local image。[E: codex-rs/protocol/src/protocol.rs:1533][E: codex-rs/protocol/src/protocol.rs:1534] | `EventMsg::ViewImageToolCall` |
| 21 | `DynamicToolCallResponse` | `DynamicToolCallResponseEvent` | dynamic tool call response payload。[E: codex-rs/protocol/src/protocol.rs:1544] | `EventMsg::DynamicToolCallResponse` |
| 22 | `PatchApplyBegin` | `PatchApplyBeginEvent` | agent 即将 apply code patch；注释说明它 mirrors `ExecCommandBegin` 以便 UI 显示 progress。[E: codex-rs/protocol/src/protocol.rs:1567][E: codex-rs/protocol/src/protocol.rs:1568][E: codex-rs/protocol/src/protocol.rs:1569] | `EventMsg::PatchApplyBegin` |
| 23 | `PatchApplyUpdated` | `PatchApplyUpdatedEvent` | `apply_patch` input 生成过程中最新 model-generated structured changes。[E: codex-rs/protocol/src/protocol.rs:1571][E: codex-rs/protocol/src/protocol.rs:1572][E: codex-rs/protocol/src/protocol.rs:3288][E: codex-rs/protocol/src/protocol.rs:3289][E: codex-rs/protocol/src/protocol.rs:3290][E: codex-rs/protocol/src/protocol.rs:3291][E: codex-rs/protocol/src/protocol.rs:3292] | `EventMsg::PatchApplyUpdated` |
| 24 | `PatchApplyEnd` | `PatchApplyEndEvent` | patch application finished。[E: codex-rs/protocol/src/protocol.rs:1574][E: codex-rs/protocol/src/protocol.rs:1575] | `EventMsg::PatchApplyEnd` |
| 25 | `RawResponseItem` | `RawResponseItemEvent` | raw response item event。[E: codex-rs/protocol/src/protocol.rs:1607] | `EventMsg::RawResponseItem` |
| 26 | `AgentMessageContentDelta` | `AgentMessageContentDeltaEvent` | assistant message content delta。[E: codex-rs/protocol/src/protocol.rs:1614] | `EventMsg::AgentMessageContentDelta` |
| 27 | `PlanDelta` | `PlanDeltaEvent` | plan item delta。[E: codex-rs/protocol/src/protocol.rs:1615][E: codex-rs/protocol/src/protocol.rs:1992][E: codex-rs/protocol/src/protocol.rs:1995][E: codex-rs/protocol/src/protocol.rs:1996] | `EventMsg::PlanDelta` |
| 28 | `ReasoningContentDelta` | `ReasoningContentDeltaEvent` | reasoning content delta。[E: codex-rs/protocol/src/protocol.rs:1616] | `EventMsg::ReasoningContentDelta` |
| 29 | `ReasoningRawContentDelta` | `ReasoningRawContentDeltaEvent` | reasoning raw content delta。[E: codex-rs/protocol/src/protocol.rs:1617] | `EventMsg::ReasoningRawContentDelta` |

## 事件流设计动机速记

- `AgentMessage` / `AgentMessageDelta` 与 `AgentMessageContentDelta` 是并存的 assistant message event/delta variants。[E: codex-rs/protocol/src/protocol.rs:1476][E: codex-rs/protocol/src/protocol.rs:1482][E: codex-rs/protocol/src/protocol.rs:1614]
- `ExecCommandBegin`、`ExecCommandOutputDelta`、`TerminalInteraction`、`ExecCommandEnd` 把 command execution 的启动、输出、交互、结束拆成不同 payload；这让 UI 可以一边渲染输出一边保留 command lifecycle 是文档推断。[E: codex-rs/protocol/src/protocol.rs:1522][E: codex-rs/protocol/src/protocol.rs:1525][E: codex-rs/protocol/src/protocol.rs:1528][E: codex-rs/protocol/src/protocol.rs:1531][I]
- `PatchApplyBegin` 注释明确复用 exec progress 的 mental model，`PatchApplyUpdated` 暴露 model-generated structured changes；patch apply 因此具备 progress indicator 与 structured-change preview 的协议基础。[E: codex-rs/protocol/src/protocol.rs:1567][E: codex-rs/protocol/src/protocol.rs:1568][E: codex-rs/protocol/src/protocol.rs:1571][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`

## 相关

- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md)
- [subsys.providers.sse-streaming](../subsystems/providers/sse-streaming.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.protocol-items](protocol-items.md)
