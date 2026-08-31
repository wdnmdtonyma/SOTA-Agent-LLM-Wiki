---
id: ref.data-model
title: Protocol data model 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/models.rs, codex-rs/protocol/src/models/executed_tool_calls.rs, codex-rs/protocol/src/user_input.rs, codex-rs/protocol/src/thread_id.rs, codex-rs/protocol/src/response_item_id.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/plan_tool.rs, codex-rs/protocol/src/protocol.rs, codex-rs/history/src/lib.rs, codex-rs/rollout/src/policy.rs, codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs, codex-rs/app-server/src/request_processors/thread_processor.rs]
symbols: [ThreadId, ResponseItemId, UserInput, TextElement, ByteRange, ResponseInputItem, ContentItem, AgentMessageInputContent, ImageDetail, MessagePhase, ResponseItem, InternalChatMessageMetadataPassthrough, ExecutedToolCall, BaseInstructions, DynamicToolCallRequest, RequestUserInputResponse, ThreadHistoryMode, HistoryPosition, SessionMeta, history::RolloutItem, RolloutLine, TurnContextItem, TurnItemsView]
related: [ref.protocol-op, ref.protocol-items, ref.key-types, subsys.core.turn-metadata, sdk.ts-events-items, sdk.py-inputs-errors]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> 这些 `codex-rs/protocol/src` 文件定义用户输入、Responses input/output item、dynamic tool payload、request tool payload、plan tool payload、session metadata 与 rollout persistence item。[E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/models.rs:815][E: codex-rs/protocol/src/models.rs:975][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/protocol.rs:2997][E: codex-rs/history/src/lib.rs:101]

## 能回答的问题

- `UserInput` 当前有哪些 variant,rich text span 如何表示?
- Responses API input/output 在 protocol 层用哪些 enum 表示?
- dynamic tool 的 spec、call request、response payload 字段是什么?
- `request_permissions` 与 `request_user_input` 的 args/event/response 类型如何对应?
- rollout 持久化写入哪些 item 类型?
- app-server thread/turn payload 如何表达 section、summary view 与 timing？
- warehouse-only attempted-tool metadata 如何限额？

## Identity / input model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ThreadId` | wrapper struct | wraps `Uuid`; `new()` 使用 `Uuid::now_v7()`,serialize 通过 `serializer.collect_str(&self.uuid)` 输出 string。[E: codex-rs/protocol/src/thread_id.rs:16][E: codex-rs/protocol/src/thread_id.rs:17][E: codex-rs/protocol/src/thread_id.rs:25][E: codex-rs/protocol/src/thread_id.rs:66][E: codex-rs/protocol/src/thread_id.rs:72] | `thread_id.rs:16` |
| `ResponseItemId` | transparent string wrapper | 新建 item id 用 explicit prefix + UUIDv7 suffix；`from_server`/deserialization 仍接受 unprefixed legacy id，`is_prefixed()` 可检查新格式。[E: codex-rs/protocol/src/response_item_id.rs:17][E: codex-rs/protocol/src/response_item_id.rs:21][E: codex-rs/protocol/src/response_item_id.rs:25][E: codex-rs/protocol/src/response_item_id.rs:29][E: codex-rs/protocol/src/response_item_id.rs:37][E: codex-rs/protocol/src/response_item_id.rs:38] | `response_item_id.rs:17` |
| `UserInput` | non-exhaustive tagged enum | 7 variants：`Text`、remote/local `Image`、remote/local `Audio`、`Skill`、`Mention`；remote media 携带 URL string，local media 携带 `PathBuf`。[E: codex-rs/protocol/src/user_input.rs:12][E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/user_input.rs:16][E: codex-rs/protocol/src/user_input.rs:26][E: codex-rs/protocol/src/user_input.rs:27][E: codex-rs/protocol/src/user_input.rs:34][E: codex-rs/protocol/src/user_input.rs:35][E: codex-rs/protocol/src/user_input.rs:41][E: codex-rs/protocol/src/user_input.rs:43][E: codex-rs/protocol/src/user_input.rs:46][E: codex-rs/protocol/src/user_input.rs:54] | `user_input.rs:15` |
| `MAX_USER_INPUT_TEXT_CHARS` | const | conservative cap: `1 << 20` chars per user message text。[E: codex-rs/protocol/src/user_input.rs:9] | `user_input.rs:9` |
| `TextElement` | struct | `byte_range: ByteRange`, private optional `placeholder`; `placeholder(text)` falls back to source text slice for that byte range。[E: codex-rs/protocol/src/user_input.rs:58][E: codex-rs/protocol/src/user_input.rs:62][E: codex-rs/protocol/src/user_input.rs:102][E: codex-rs/protocol/src/user_input.rs:105] | `user_input.rs:58` |
| `ByteRange` | struct | `start` / `end` 保存 UTF-8 text buffer byte offsets；用作 Rust `start..end` slice。[E: codex-rs/protocol/src/user_input.rs:110][E: codex-rs/protocol/src/user_input.rs:112][E: codex-rs/protocol/src/user_input.rs:114][E: codex-rs/protocol/src/user_input.rs:105] | `user_input.rs:110` |

## Model request / response item model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ResponseInputItem` | tagged enum | 5 variants: `Message`, `FunctionCallOutput`, `McpToolCallOutput`, `CustomToolCallOutput`, `ToolSearchOutput`。[E: codex-rs/protocol/src/models.rs:815][E: codex-rs/protocol/src/models.rs:816][E: codex-rs/protocol/src/models.rs:823][E: codex-rs/protocol/src/models.rs:829][E: codex-rs/protocol/src/models.rs:833][E: codex-rs/protocol/src/models.rs:842] | `models.rs:815` |
| `ContentItem` | tagged enum | `InputText`、`InputImage { image_url, detail? }`、`InputAudio { audio_url }`、`OutputText`。[E: codex-rs/protocol/src/models.rs:853][E: codex-rs/protocol/src/models.rs:854][E: codex-rs/protocol/src/models.rs:857][E: codex-rs/protocol/src/models.rs:863][E: codex-rs/protocol/src/models.rs:866] | `models.rs:853` |
| `AgentMessageInputContent` | tagged enum | `InputText` or `EncryptedContent`; helper returns plaintext only when all parts are `InputText`。[E: codex-rs/protocol/src/models.rs:873][E: codex-rs/protocol/src/models.rs:874][E: codex-rs/protocol/src/models.rs:875][E: codex-rs/protocol/src/models.rs:879] | `models.rs:873` |
| `ImageDetail` | enum | `Auto`, `Low`, `High`, `Original`; default constant is `High`。[E: codex-rs/protocol/src/models.rs:894][E: codex-rs/protocol/src/models.rs:895][E: codex-rs/protocol/src/models.rs:896][E: codex-rs/protocol/src/models.rs:897][E: codex-rs/protocol/src/models.rs:898][E: codex-rs/protocol/src/models.rs:901] | `models.rs:894` |
| `MessagePhase` | enum | `Commentary`, `FinalAnswer`；`ResponseInputItem::Message.phase` 是 optional。[E: codex-rs/protocol/src/models.rs:821][E: codex-rs/protocol/src/models.rs:909][E: codex-rs/protocol/src/models.rs:914][E: codex-rs/protocol/src/models.rs:916] | `models.rs:909` |
| `InternalChatMessageMetadataPassthrough` | struct | optional `turn_id`、warehouse-only `create_time` / `content_item_kinds` / `cell_id` / `executed_tool_calls` / `tool_calls_complete`。attempted-tool calls skip deserialize/schema/TS, so they are not a public app-server input surface。[E: codex-rs/protocol/src/models.rs:925][E: codex-rs/protocol/src/models.rs:928][E: codex-rs/protocol/src/models.rs:933][E: codex-rs/protocol/src/models.rs:939][E: codex-rs/protocol/src/models.rs:945][E: codex-rs/protocol/src/models.rs:950][E: codex-rs/protocol/src/models.rs:956] | `models.rs:925` |
| `ExecutedToolCall` | struct | tool `name` + raw/truncated arguments；每个 argument 最多 8 KiB，整个 request attempted-tool metadata 最多 32 KiB，normal prompt fairness 分摊，retained history 可优先保留最近 calls。[E: codex-rs/protocol/src/models/executed_tool_calls.rs:9][E: codex-rs/protocol/src/models/executed_tool_calls.rs:11][E: codex-rs/protocol/src/models/executed_tool_calls.rs:297][E: codex-rs/protocol/src/models/executed_tool_calls.rs:298][E: codex-rs/protocol/src/models/executed_tool_calls.rs:300] | `models/executed_tool_calls.rs:297` |
| `ResponseItem` | tagged enum | 17 variants: `AdditionalTools`, `Message`, `AgentMessage`, `Reasoning`, `LocalShellCall`, `FunctionCall`, `ToolSearchCall`, `FunctionCallOutput`, `CustomToolCall`, `CustomToolCallOutput`, `ToolSearchOutput`, `WebSearchCall`, `ImageGenerationCall`, `Compaction`, `CompactionTrigger`, `ContextCompaction`, `Other`。[E: codex-rs/protocol/src/models.rs:975][E: codex-rs/protocol/src/models.rs:978][E: codex-rs/protocol/src/models.rs:984][E: codex-rs/protocol/src/models.rs:1214] | `models.rs:975` |
| `BaseInstructions` | struct | `text: String` plus optional `provenance`; default text comes from `prompts/base_instructions/default.md` include。[E: codex-rs/protocol/src/models.rs:1488][E: codex-rs/protocol/src/models.rs:1504][E: codex-rs/protocol/src/models.rs:1505][E: codex-rs/protocol/src/models.rs:1509] | `models.rs:1504` |

## Dynamic tools / request tools

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `DynamicToolSpec` | tagged enum | `Function(DynamicToolFunctionSpec)` or `Namespace(DynamicToolNamespaceSpec)`; namespace tools are `Function(DynamicToolFunctionSpec)` entries。[E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:15][E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:35][E: codex-rs/protocol/src/dynamic_tools.rs:41][E: codex-rs/protocol/src/dynamic_tools.rs:42] | `dynamic_tools.rs:13` |
| `DynamicToolFunctionSpec` | struct | `name`, `description`, `input_schema`, defaulted `defer_loading`。[E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:26] | `dynamic_tools.rs:21` |
| `DynamicToolCallRequest` | struct | `call_id`, `turn_id`, defaulted `started_at_ms`, optional `namespace`, `tool`, `arguments`。[E: codex-rs/protocol/src/dynamic_tools.rs:47][E: codex-rs/protocol/src/dynamic_tools.rs:48][E: codex-rs/protocol/src/dynamic_tools.rs:49][E: codex-rs/protocol/src/dynamic_tools.rs:50][E: codex-rs/protocol/src/dynamic_tools.rs:51][E: codex-rs/protocol/src/dynamic_tools.rs:53][E: codex-rs/protocol/src/dynamic_tools.rs:54][E: codex-rs/protocol/src/dynamic_tools.rs:55] | `dynamic_tools.rs:47` |
| `DynamicToolResponse` | struct | `content_items`, `success`；content item variants 是 `InputText`、`InputImage`、`InputAudio`。[E: codex-rs/protocol/src/dynamic_tools.rs:60][E: codex-rs/protocol/src/dynamic_tools.rs:61][E: codex-rs/protocol/src/dynamic_tools.rs:62][E: codex-rs/protocol/src/dynamic_tools.rs:68][E: codex-rs/protocol/src/dynamic_tools.rs:70][E: codex-rs/protocol/src/dynamic_tools.rs:72][E: codex-rs/protocol/src/dynamic_tools.rs:74] | `dynamic_tools.rs:60` |
| `RequestPermissionsArgs` | struct | optional `environment_id` / `environmentId` alias, optional `reason`, `permissions`。[E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:53][E: codex-rs/protocol/src/request_permissions.rs:54][E: codex-rs/protocol/src/request_permissions.rs:58][E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/protocol/src/request_permissions.rs:61] | `request_permissions.rs:50` |
| `RequestPermissionsResponse` | struct | `permissions`, default `scope: PermissionGrantScope`, default `strict_auto_review`。[E: codex-rs/protocol/src/request_permissions.rs:12][E: codex-rs/protocol/src/request_permissions.rs:14][E: codex-rs/protocol/src/request_permissions.rs:15][E: codex-rs/protocol/src/request_permissions.rs:65][E: codex-rs/protocol/src/request_permissions.rs:66][E: codex-rs/protocol/src/request_permissions.rs:67][E: codex-rs/protocol/src/request_permissions.rs:68][E: codex-rs/protocol/src/request_permissions.rs:70][E: codex-rs/protocol/src/request_permissions.rs:71] | `request_permissions.rs:65` |
| `RequestUserInputArgs` | protocol struct | `questions`, required `isBlocking`, deprecated optional `autoResolutionMs`；model-facing tool schema has its own `RequestUserInputToolArgs` and exposes only `questions`。[E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:33][E: codex-rs/protocol/src/request_user_input.rs:37][E: codex-rs/protocol/src/request_user_input.rs:39][E: codex-rs/protocol/src/request_user_input.rs:41][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:12][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:13][E: codex-rs/core/src/tools/handlers/request_user_input_spec.rs:75] | `request_user_input.rs:32` |
| `RequestUserInputQuestion` | struct | `id`, `header`, `question`, `isOther`, `isSecret`, optional `options`。[E: codex-rs/protocol/src/request_user_input.rs:15][E: codex-rs/protocol/src/request_user_input.rs:16][E: codex-rs/protocol/src/request_user_input.rs:17][E: codex-rs/protocol/src/request_user_input.rs:18][E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/protocol/src/request_user_input.rs:28] | `request_user_input.rs:15` |
| `RequestUserInputResponse` | struct | `answers: HashMap<String, RequestUserInputAnswer>`, each answer holds `Vec<String>`。[E: codex-rs/protocol/src/request_user_input.rs:45][E: codex-rs/protocol/src/request_user_input.rs:46][E: codex-rs/protocol/src/request_user_input.rs:50][E: codex-rs/protocol/src/request_user_input.rs:51] | `request_user_input.rs:45` |
| `UpdatePlanArgs` | struct | optional `explanation`, `plan: Vec<PlanItemArg>`; `StepStatus` is `Pending`, `InProgress`, `Completed`。[E: codex-rs/protocol/src/plan_tool.rs:9][E: codex-rs/protocol/src/plan_tool.rs:19][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/plan_tool.rs:28] | `plan_tool.rs:24` |

## Persistence / rollout model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ThreadHistoryMode` | enum | `Legacy`（default）或 `Paginated`。[E: codex-rs/protocol/src/protocol.rs:757][E: codex-rs/protocol/src/protocol.rs:759][E: codex-rs/protocol/src/protocol.rs:760] | `protocol.rs:757` |
| `HistoryPosition` | struct | inherited paginated prefix 的 thread id、exclusive end ordinal 与 JSONL byte offset。[E: codex-rs/protocol/src/protocol.rs:2977][E: codex-rs/protocol/src/protocol.rs:2984][E: codex-rs/protocol/src/protocol.rs:2986][E: codex-rs/protocol/src/protocol.rs:2988] | `protocol.rs:2977` |
| `SessionMeta` | struct | thread/session identity、source/agent fields、provider/instructions/tools/capability roots，并记录 `history_mode`、optional inherited `history_base`、subagent 自有 history 起点及 initial context-window identity。[E: codex-rs/protocol/src/protocol.rs:2997] | `protocol.rs:2997` |
| `SessionMetaLine` | struct | flattened `SessionMeta` plus optional `GitInfo`。[E: codex-rs/protocol/src/protocol.rs:3093] | `protocol.rs:3093` |
| `RolloutItem` | tagged enum | 现位于 `history` crate，10 variants: `SessionMeta`, `ResponseItem`, `InterAgentCommunication`, `InterAgentCommunicationMetadata`, `Compacted`, `TurnContext`, `WorldState`, `SecurityRiskScore`, `EventMsg`, `RealtimeItem`。[E: codex-rs/history/src/lib.rs:101][E: codex-rs/history/src/lib.rs:102][E: codex-rs/history/src/lib.rs:103][E: codex-rs/history/src/lib.rs:104][E: codex-rs/history/src/lib.rs:105][E: codex-rs/history/src/lib.rs:108][E: codex-rs/history/src/lib.rs:109][E: codex-rs/history/src/lib.rs:110][E: codex-rs/history/src/lib.rs:111][E: codex-rs/history/src/lib.rs:112][E: codex-rs/history/src/lib.rs:114] | `history/src/lib.rs:101` |
| `CompactedItem` | struct | `message`, optional `replacement_history`, optional `mcp_resource_origins`, optional `window_number`, optional `first_window_id`, optional `previous_window_id`, optional `window_id`。[E: codex-rs/history/src/lib.rs:152][E: codex-rs/history/src/lib.rs:153][E: codex-rs/history/src/lib.rs:154][E: codex-rs/history/src/lib.rs:155][E: codex-rs/history/src/lib.rs:156][E: codex-rs/history/src/lib.rs:157][E: codex-rs/history/src/lib.rs:158][E: codex-rs/history/src/lib.rs:159] | `history/src/lib.rs:152` |
| `TurnContextItem` | struct | optional `turn_id`, `cwd`, workspace roots, date/timezone, approval/sandbox/permission/network/fs policy, model, comp hash, personality, collaboration mode, multi-agent version, realtime flag, optional `cyber_access_program`, effort, compatibility `summary`。[E: codex-rs/protocol/src/protocol.rs:3158][E: codex-rs/protocol/src/protocol.rs:3199][E: codex-rs/protocol/src/protocol.rs:3206] | `protocol.rs:3158` |
| `TurnContextItem::permission_profile` | method | falls back from legacy sandbox/file-system/network policy fields when explicit `permission_profile` is absent。[E: codex-rs/protocol/src/protocol.rs:3210] | `protocol.rs:3210` |
| `RolloutLine` | struct | timestamp + optional paginated `ordinal` + flattened `RolloutItem`。[E: codex-rs/history/src/lib.rs:211][E: codex-rs/history/src/lib.rs:212][E: codex-rs/history/src/lib.rs:214][E: codex-rs/history/src/lib.rs:216] | `history/src/lib.rs:211` |

## App-server thread / turn model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `Thread` | struct | Adds independently persisted optional `section` and `section_entered_at`, plus a `turns` list；`thread/read` only materializes history when `includeTurns=true`。[E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:202][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:220][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:224][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:273][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2814] | `thread_data.rs:202` |
| `Turn` | struct | `items` + `items_view` + status/error and optional `started_at` / `completed_at` / `duration_ms`; paginated summary reads can distinguish summary payload from full hydration。[E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:355][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:359][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:362][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:368][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:371][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:374] | `thread_data.rs:355` |
| `TurnItemsView` | enum | `NotLoaded`, `Summary`, default `Full`; it makes an intentionally empty payload distinguishable from a display-only summary。[E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:380][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:382][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:384][E: codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs:387] | `thread_data.rs:380` |

## 设计动机速记

- `UserInput` is `#[non_exhaustive]`,so consumers should treat future input variants as protocol evolution instead of a closed set。[E: codex-rs/protocol/src/user_input.rs:12][I]
- `ResponseItem` now includes agent-to-agent messages, additional tool declarations, and compaction lifecycle variants alongside model/tool output variants。[E: codex-rs/protocol/src/models.rs:978][E: codex-rs/protocol/src/models.rs:1000][E: codex-rs/protocol/src/models.rs:1191][E: codex-rs/protocol/src/models.rs:1201][E: codex-rs/protocol/src/models.rs:1202]
- `RolloutItem` persists model/provider items, protocol events, inter-agent communication metadata, world-state snapshots, and paginated realtime presentation facts; replay/resume can therefore reconstruct state from `SessionMeta`, `TurnContext`, `ResponseItem`, `InterAgentCommunication`, compaction records, `WorldState`, `EventMsg`, and `RealtimeItem` lines。[E: codex-rs/history/src/lib.rs:101][E: codex-rs/history/src/lib.rs:102][E: codex-rs/history/src/lib.rs:103][E: codex-rs/history/src/lib.rs:104][E: codex-rs/history/src/lib.rs:109][E: codex-rs/history/src/lib.rs:110][E: codex-rs/history/src/lib.rs:112][E: codex-rs/history/src/lib.rs:114][E: codex-rs/rollout/src/policy.rs:16]

## Sources

- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/models/executed_tool_calls.rs`
- `codex-rs/protocol/src/user_input.rs`
- `codex-rs/protocol/src/thread_id.rs`
- `codex-rs/protocol/src/response_item_id.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/request_permissions.rs`
- `codex-rs/protocol/src/request_user_input.rs`
- `codex-rs/protocol/src/plan_tool.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/history/src/lib.rs`
- `codex-rs/rollout/src/policy.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`

## 相关

- [ref.protocol-op](protocol-op.md)
- [ref.protocol-items](protocol-items.md)
- [ref.key-types](key-types.md)
- 索引 id：`subsys.core.turn-metadata`
- [sdk.ts-events-items](../sdk/ts-events-items.md)
- [sdk.py-inputs-errors](../sdk/py-inputs-errors.md)
