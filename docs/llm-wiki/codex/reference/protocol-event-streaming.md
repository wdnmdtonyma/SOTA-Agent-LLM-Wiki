---
id: ref.protocol-event-streaming
title: Protocol EventMsg 流式内容事件索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/legacy_events.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/models/executed_tool_calls.rs]
symbols: [RawResponseItemEvent, RawResponseCompletedEvent, ItemStartedEvent, ItemCompletedEvent, AgentMessageContentDeltaEvent, PlanDeltaEvent, ReasoningContentDeltaEvent, ReasoningRawContentDeltaEvent, ExecCommandBeginEvent, ExecCommandEndEvent, DynamicToolCallResponseEvent, PatchApplyBeginEvent, PatchApplyUpdatedEvent, PatchApplyEndEvent]
related: [spine.tool-call-anatomy, subsys.providers.sse-streaming, ref.protocol-event-lifecycle, ref.protocol-items]
evidence: explicit
status: verified
updated: 7750465934
---

> `Event` 是 agent 发回客户端的 queue entry,用 `id` 关联 submission,用 `msg: EventMsg` 承载 payload；`EventMsg` 是 `serde(tag = "type", rename_all = "snake_case")` 的 agent response event enum。[E: codex-rs/protocol/src/protocol.rs:1270][E: codex-rs/protocol/src/protocol.rs:1274][E: codex-rs/protocol/src/protocol.rs:1288]

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
| 1 | `RealtimeConversationRealtime` | `RealtimeConversationRealtimeEvent` | realtime conversation streaming payload。[E: codex-rs/protocol/src/protocol.rs:1303] | `protocol.rs:1303` |
| 2 | `RealtimeConversationSdp` | `RealtimeConversationSdpEvent` | realtime session description protocol payload。[E: codex-rs/protocol/src/protocol.rs:1309] | `protocol.rs:1309` |
| 3 | `AgentMessage` | `AgentMessageEvent` | assistant text output message；payload 含 `message`, optional `phase`, optional `memory_citation`。[E: codex-rs/protocol/src/protocol.rs:1348][E: codex-rs/protocol/src/protocol.rs:2327][E: codex-rs/protocol/src/protocol.rs:2328][E: codex-rs/protocol/src/protocol.rs:2330][E: codex-rs/protocol/src/protocol.rs:2332] | `protocol.rs:1348` |
| 4 | `UserMessage` | `UserMessageEvent` | 发送给模型的 user/system input message，可带 remote/local image、remote/local audio 与 text elements。[E: codex-rs/protocol/src/protocol.rs:1351][E: codex-rs/protocol/src/protocol.rs:2336][E: codex-rs/protocol/src/protocol.rs:2344][E: codex-rs/protocol/src/protocol.rs:2354][E: codex-rs/protocol/src/protocol.rs:2362][E: codex-rs/protocol/src/protocol.rs:2367][E: codex-rs/protocol/src/protocol.rs:2370] | `protocol.rs:1351` |
| 5 | `AgentReasoning` | `AgentReasoningEvent` | agent reasoning text event。[E: codex-rs/protocol/src/protocol.rs:1354][E: codex-rs/protocol/src/protocol.rs:2394][E: codex-rs/protocol/src/protocol.rs:2395] | `protocol.rs:1354` |
| 6 | `AgentReasoningRawContent` | `AgentReasoningRawContentEvent` | raw reasoning content event。[E: codex-rs/protocol/src/protocol.rs:1357][E: codex-rs/protocol/src/protocol.rs:2399] | `protocol.rs:1357` |
| 7 | `AgentReasoningSectionBreak` | `AgentReasoningSectionBreakEvent` | reasoning summary section boundary,带 `item_id` 与 `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1360][E: codex-rs/protocol/src/protocol.rs:2404][E: codex-rs/protocol/src/protocol.rs:2407][E: codex-rs/protocol/src/protocol.rs:2409] | `protocol.rs:1360` |
| 8 | `RawResponseItem` | `RawResponseItemEvent` | 原始 Responses API item wrapper,字段是 `item: ResponseItem`。[E: codex-rs/protocol/src/protocol.rs:1459][E: codex-rs/protocol/src/protocol.rs:1825][E: codex-rs/protocol/src/protocol.rs:1826] | `protocol.rs:1459` |
| 9 | `RawResponseCompleted` | `RawResponseCompletedEvent` | 一次 provider response 完整结束；payload 带 response id 与 optional token usage,与逐 item 的 raw stream 分开。[E: codex-rs/protocol/src/protocol.rs:1460][E: codex-rs/protocol/src/protocol.rs:1833][E: codex-rs/protocol/src/protocol.rs:1834][E: codex-rs/protocol/src/protocol.rs:1835] | `protocol.rs:1460` |
| 10 | `ItemStarted` | `ItemStartedEvent` | v2 turn item start,包含 `thread_id`, `turn_id`, `item`, `started_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1462][E: codex-rs/protocol/src/protocol.rs:1839][E: codex-rs/protocol/src/protocol.rs:1840][E: codex-rs/protocol/src/protocol.rs:1841][E: codex-rs/protocol/src/protocol.rs:1842][E: codex-rs/protocol/src/protocol.rs:1843] | `protocol.rs:1462` |
| 11 | `ItemCompleted` | `ItemCompletedEvent` | v2 turn item completion,包含 `thread_id`, `turn_id`, `item`, `completed_at_ms`。[E: codex-rs/protocol/src/protocol.rs:1463][E: codex-rs/protocol/src/protocol.rs:1847][E: codex-rs/protocol/src/protocol.rs:1848][E: codex-rs/protocol/src/protocol.rs:1849][E: codex-rs/protocol/src/protocol.rs:1850][E: codex-rs/protocol/src/protocol.rs:1858] | `protocol.rs:1463` |
| 12 | `AgentMessageContentDelta` | `AgentMessageContentDeltaEvent` | assistant message content delta,定位到 `thread_id`/`turn_id`/`item_id`。[E: codex-rs/protocol/src/protocol.rs:1467][E: codex-rs/protocol/src/protocol.rs:1866][E: codex-rs/protocol/src/protocol.rs:1867][E: codex-rs/protocol/src/protocol.rs:1868][E: codex-rs/protocol/src/protocol.rs:1869][E: codex-rs/protocol/src/protocol.rs:1870] | `protocol.rs:1467` |
| 13 | `PlanDelta` | `PlanDeltaEvent` | plan item delta。[E: codex-rs/protocol/src/protocol.rs:1468][E: codex-rs/protocol/src/protocol.rs:1874] | `protocol.rs:1468` |
| 14 | `ReasoningContentDelta` | `ReasoningContentDeltaEvent` | reasoning summary/content delta,带 defaulted `summary_index`。[E: codex-rs/protocol/src/protocol.rs:1469][E: codex-rs/protocol/src/protocol.rs:1882] | `protocol.rs:1469` |
| 15 | `ReasoningRawContentDelta` | `ReasoningRawContentDeltaEvent` | raw reasoning content delta,带 defaulted `content_index`。[E: codex-rs/protocol/src/protocol.rs:1470][E: codex-rs/protocol/src/protocol.rs:1893][E: codex-rs/protocol/src/protocol.rs:1900] | `protocol.rs:1470` |

## Tool execution 与 hosted-tool events

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `McpToolCallBegin` | `McpToolCallBeginEvent` | MCP tool call begin，以 `call_id` 配对 end event，并携带 invocation/app/plugin metadata 与 optional `read_only_hint`；hint 描述所选 tool annotation，不代表执行结果。[E: codex-rs/protocol/src/protocol.rs:1380][E: codex-rs/protocol/src/protocol.rs:2423][E: codex-rs/protocol/src/protocol.rs:2444][E: codex-rs/protocol/src/protocol.rs:2446][E: codex-rs/protocol/src/protocol.rs:2448] | `protocol.rs:1380` |
| 2 | `McpToolCallEnd` | `McpToolCallEndEvent` | MCP tool call end，保留同一个 optional `read_only_hint`，并带 duration 与 `Result<CallToolResult, String>`。[E: codex-rs/protocol/src/protocol.rs:1382][E: codex-rs/protocol/src/protocol.rs:2452][E: codex-rs/protocol/src/protocol.rs:2473][E: codex-rs/protocol/src/protocol.rs:2476][E: codex-rs/protocol/src/protocol.rs:2478][E: codex-rs/protocol/src/protocol.rs:2480] | `protocol.rs:1382` |
| 3 | `WebSearchBegin` | `WebSearchBeginEvent` | hosted web search begin，字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1384][E: codex-rs/protocol/src/protocol.rs:2519][E: codex-rs/protocol/src/protocol.rs:2520] | `protocol.rs:1384` |
| 4 | `WebSearchEnd` | `WebSearchEndEvent` | web search end，带 `call_id`、`query`、`action` 与 optional structured `results`；后者供 standalone web search out-of-band 返回。[E: codex-rs/protocol/src/protocol.rs:1386][E: codex-rs/protocol/src/protocol.rs:2524][E: codex-rs/protocol/src/protocol.rs:2525][E: codex-rs/protocol/src/protocol.rs:2527][E: codex-rs/protocol/src/protocol.rs:2529][E: codex-rs/protocol/src/protocol.rs:2531] | `protocol.rs:1386` |
| 5 | `ImageGenerationBegin` | `ImageGenerationBeginEvent` | hosted image generation begin,字段是 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1388][E: codex-rs/protocol/src/protocol.rs:2535] | `protocol.rs:1388` |
| 6 | `ImageGenerationEnd` | `ImageGenerationEndEvent` | hosted image generation end,带 status/result/revised prompt/saved path。[E: codex-rs/protocol/src/protocol.rs:1390][E: codex-rs/protocol/src/protocol.rs:2540][E: codex-rs/protocol/src/protocol.rs:2549] | `protocol.rs:1390` |
| 7 | `ExecCommandBegin` | `ExecCommandBeginEvent` | command execution begin,带 call/plugin/script/process/turn/start time、command、cwd、parsed command、source、interaction input。[E: codex-rs/protocol/src/protocol.rs:1393][E: codex-rs/protocol/src/protocol.rs:3530][E: codex-rs/protocol/src/protocol.rs:3532][E: codex-rs/protocol/src/protocol.rs:3536][E: codex-rs/protocol/src/protocol.rs:3540][E: codex-rs/protocol/src/protocol.rs:3544][E: codex-rs/protocol/src/protocol.rs:3546][E: codex-rs/protocol/src/protocol.rs:3548][E: codex-rs/protocol/src/protocol.rs:3550][E: codex-rs/protocol/src/protocol.rs:3552][E: codex-rs/protocol/src/protocol.rs:3553][E: codex-rs/protocol/src/protocol.rs:3556][E: codex-rs/protocol/src/protocol.rs:3560] | `protocol.rs:1393` |
| 8 | `ExecCommandOutputDelta` | `ExecCommandOutputDeltaEvent` | command output delta,带 `call_id`, stream 和 base64-serialized raw bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1396][E: codex-rs/protocol/src/protocol.rs:3634][E: codex-rs/protocol/src/protocol.rs:3643] | `protocol.rs:1396` |
| 9 | `TerminalInteraction` | `TerminalInteractionEvent` | running command 的 terminal interaction,带 `call_id`, `process_id`, `stdin`。[E: codex-rs/protocol/src/protocol.rs:1399][E: codex-rs/protocol/src/protocol.rs:3648] | `protocol.rs:1399` |
| 10 | `ExecCommandEnd` | `ExecCommandEndEvent` | command execution end,带 stdout/stderr/aggregated output/exit code/duration/formatted output/status。[E: codex-rs/protocol/src/protocol.rs:1401][E: codex-rs/protocol/src/protocol.rs:3564][E: codex-rs/protocol/src/protocol.rs:3597][E: codex-rs/protocol/src/protocol.rs:3599][E: codex-rs/protocol/src/protocol.rs:3602][E: codex-rs/protocol/src/protocol.rs:3604][E: codex-rs/protocol/src/protocol.rs:3607][E: codex-rs/protocol/src/protocol.rs:3609][E: codex-rs/protocol/src/protocol.rs:3611] | `protocol.rs:1401` |
| 11 | `ViewImageToolCall` | `ViewImageToolCallEvent` | `view_image` tool 附加 local image,带 call id 与 path。[E: codex-rs/protocol/src/protocol.rs:1404][E: codex-rs/protocol/src/protocol.rs:3615] | `protocol.rs:1404` |
| 12 | `DynamicToolCallRequest` | `DynamicToolCallRequest` | dynamic tool call request,带 call/turn/start time、namespace、tool、arguments。[E: codex-rs/protocol/src/protocol.rs:1412][E: codex-rs/protocol/src/dynamic_tools.rs:47] | `protocol.rs:1412` |
| 13 | `DynamicToolCallResponse` | `DynamicToolCallResponseEvent` | dynamic tool call response，带 call/turn/completed time、namespace/tool/arguments、content items、success/error 与 duration。[E: codex-rs/protocol/src/protocol.rs:1414][E: codex-rs/protocol/src/protocol.rs:2484][E: codex-rs/protocol/src/protocol.rs:2486][E: codex-rs/protocol/src/protocol.rs:2506] | `protocol.rs:1414` |

## Patch apply progress

| # | Variant | Payload | 流式含义 | 定义锚 |
|---:|---|---|---|---|
| 1 | `PatchApplyBegin` | `PatchApplyBeginEvent` | apply code patch 的 begin progress event，带 call/turn identity、auto-approval bit 与 structured changes。[E: codex-rs/protocol/src/protocol.rs:1433][E: codex-rs/protocol/src/protocol.rs:3690][E: codex-rs/protocol/src/protocol.rs:3692][E: codex-rs/protocol/src/protocol.rs:3696][E: codex-rs/protocol/src/protocol.rs:3698][E: codex-rs/protocol/src/protocol.rs:3700] | `protocol.rs:1433` |
| 2 | `PatchApplyUpdated` | `PatchApplyUpdatedEvent` | apply_patch input 生成过程中最新 structured file changes。[E: codex-rs/protocol/src/protocol.rs:1436][E: codex-rs/protocol/src/protocol.rs:3704][E: codex-rs/protocol/src/protocol.rs:3706][E: codex-rs/protocol/src/protocol.rs:3708] | `protocol.rs:1436` |
| 3 | `PatchApplyEnd` | `PatchApplyEndEvent` | patch application finished,带 stdout/stderr/success/changes/status。[E: codex-rs/protocol/src/protocol.rs:1439][E: codex-rs/protocol/src/protocol.rs:3712][E: codex-rs/protocol/src/protocol.rs:3729] | `protocol.rs:1439` |

## Raw response item boundary

`RawResponseItemEvent` 包装 `ResponseItem`，而 `ResponseItem` 自身是 `serde(tag = "type", rename_all = "snake_case")` enum；variant 集合仍是 17 个。[E: codex-rs/protocol/src/protocol.rs:1825][E: codex-rs/protocol/src/protocol.rs:1826][E: codex-rs/protocol/src/models.rs:811][E: codex-rs/protocol/src/models.rs:813][E: codex-rs/protocol/src/models.rs:816][E: codex-rs/protocol/src/models.rs:1044] 本轮字段变化集中在两处：`FunctionCall` 增加 optional `encrypted_function_args`；可携 metadata 的 response items 复用 `internal_chat_message_metadata_passthrough`，其中 `executed_tool_calls` 是 warehouse-only，跳过 deserialize/public schema/TS，并受单参数 8 KiB、整请求 32 KiB 上限约束。[E: codex-rs/protocol/src/models.rs:875][E: codex-rs/protocol/src/models.rs:886][E: codex-rs/protocol/src/models.rs:889][E: codex-rs/protocol/src/models.rs:791][E: codex-rs/protocol/src/models.rs:792][E: codex-rs/protocol/src/models.rs:793][E: codex-rs/protocol/src/models.rs:794][E: codex-rs/protocol/src/models/executed_tool_calls.rs:9][E: codex-rs/protocol/src/models/executed_tool_calls.rs:11][I]

## 设计动机速记

- v2 item stream (`ItemStarted` / `ItemCompleted` / delta events) 与 legacy hosted/tool begin/end events 并存；兼容转换已集中到 `legacy_events.rs` 的 `HasLegacyEvent` 与各 item helper 中。[E: codex-rs/protocol/src/protocol.rs:1462][E: codex-rs/protocol/src/protocol.rs:1463][E: codex-rs/protocol/src/legacy_events.rs:67][I]
- command execution 流拆成 begin、output delta、terminal interaction 与 end,其中 end payload 汇总 stdout/stderr/aggregated output/status,delta payload 保留原始 bytes chunk。[E: codex-rs/protocol/src/protocol.rs:1393][E: codex-rs/protocol/src/protocol.rs:1396][E: codex-rs/protocol/src/protocol.rs:1399][E: codex-rs/protocol/src/protocol.rs:1401][E: codex-rs/protocol/src/protocol.rs:3597][E: codex-rs/protocol/src/protocol.rs:3599][E: codex-rs/protocol/src/protocol.rs:3602][E: codex-rs/protocol/src/protocol.rs:3611][E: codex-rs/protocol/src/protocol.rs:3643][I]
- dynamic tool request 与 response 是 protocol event,而客户端对 dynamic tool 的 answer 回到 submission side 的 `Op::DynamicToolResponse`。[E: codex-rs/protocol/src/protocol.rs:1412][E: codex-rs/protocol/src/protocol.rs:1414][E: codex-rs/protocol/src/protocol.rs:637][I]

## Sources

- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/legacy_events.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/models/executed_tool_calls.rs`

## 相关

- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md)
- [subsys.providers.sse-streaming](../subsystems/providers/sse-streaming.md)
- [ref.protocol-event-lifecycle](protocol-event-lifecycle.md)
- [ref.protocol-items](protocol-items.md)
