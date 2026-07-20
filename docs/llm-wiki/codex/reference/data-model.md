---
id: ref.data-model
title: Protocol data model 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/models.rs, codex-rs/protocol/src/user_input.rs, codex-rs/protocol/src/thread_id.rs, codex-rs/protocol/src/response_item_id.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/plan_tool.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ThreadId, ResponseItemId, UserInput, TextElement, ByteRange, ResponseInputItem, ContentItem, AgentMessageInputContent, ImageDetail, MessagePhase, ResponseItem, BaseInstructions, DynamicToolCallRequest, RequestUserInputResponse, ThreadHistoryMode, HistoryPosition, SessionMeta, RolloutItem, RolloutLine, TurnContextItem]
related: [ref.protocol-op, ref.protocol-items, ref.key-types, sdk.ts-events-items, sdk.py-inputs-errors]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> 这些 `codex-rs/protocol/src` 文件定义用户输入、Responses input/output item、dynamic tool payload、request tool payload、plan tool payload、session metadata 与 rollout persistence item。[E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/models.rs:673][E: codex-rs/protocol/src/models.rs:804][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/protocol.rs:3070][E: codex-rs/protocol/src/protocol.rs:3199]

## 能回答的问题

- `UserInput` 当前有哪些 variant,rich text span 如何表示?
- Responses API input/output 在 protocol 层用哪些 enum 表示?
- dynamic tool 的 spec、call request、response payload 字段是什么?
- `request_permissions` 与 `request_user_input` 的 args/event/response 类型如何对应?
- rollout 持久化写入哪些 item 类型?

## Identity / input model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ThreadId` | wrapper struct | wraps `Uuid`; `new()` 使用 `Uuid::now_v7()`,serialize 通过 `serializer.collect_str(&self.uuid)` 输出 string。[E: codex-rs/protocol/src/thread_id.rs:16][E: codex-rs/protocol/src/thread_id.rs:17][E: codex-rs/protocol/src/thread_id.rs:23][E: codex-rs/protocol/src/thread_id.rs:69][E: codex-rs/protocol/src/thread_id.rs:73] | `thread_id.rs:16` |
| `ResponseItemId` | transparent string wrapper | 新建 item id 用 explicit prefix + UUIDv7 suffix；`from_server`/deserialization 仍接受 unprefixed legacy id，`is_prefixed()` 可检查新格式。[E: codex-rs/protocol/src/response_item_id.rs:17][E: codex-rs/protocol/src/response_item_id.rs:21][E: codex-rs/protocol/src/response_item_id.rs:25][E: codex-rs/protocol/src/response_item_id.rs:29][E: codex-rs/protocol/src/response_item_id.rs:37][E: codex-rs/protocol/src/response_item_id.rs:38] | `response_item_id.rs:17` |
| `UserInput` | non-exhaustive tagged enum | 7 variants：`Text`、remote/local `Image`、remote/local `Audio`、`Skill`、`Mention`；remote media 携带 URL string，local media 携带 `PathBuf`。[E: codex-rs/protocol/src/user_input.rs:12][E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/user_input.rs:16][E: codex-rs/protocol/src/user_input.rs:26][E: codex-rs/protocol/src/user_input.rs:27][E: codex-rs/protocol/src/user_input.rs:34][E: codex-rs/protocol/src/user_input.rs:35][E: codex-rs/protocol/src/user_input.rs:41][E: codex-rs/protocol/src/user_input.rs:43][E: codex-rs/protocol/src/user_input.rs:46][E: codex-rs/protocol/src/user_input.rs:54] | `user_input.rs:15` |
| `MAX_USER_INPUT_TEXT_CHARS` | const | conservative cap: `1 << 20` chars per user message text。[E: codex-rs/protocol/src/user_input.rs:9] | `user_input.rs:9` |
| `TextElement` | struct | `byte_range: ByteRange`, private optional `placeholder`; `placeholder(text)` falls back to source text slice for that byte range。[E: codex-rs/protocol/src/user_input.rs:58][E: codex-rs/protocol/src/user_input.rs:62][E: codex-rs/protocol/src/user_input.rs:102][E: codex-rs/protocol/src/user_input.rs:105] | `user_input.rs:58` |
| `ByteRange` | struct | `start` / `end` 保存 UTF-8 text buffer byte offsets；用作 Rust `start..end` slice。[E: codex-rs/protocol/src/user_input.rs:110][E: codex-rs/protocol/src/user_input.rs:112][E: codex-rs/protocol/src/user_input.rs:114][E: codex-rs/protocol/src/user_input.rs:105] | `user_input.rs:110` |

## Model request / response item model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ResponseInputItem` | tagged enum | 5 variants: `Message`, `FunctionCallOutput`, `McpToolCallOutput`, `CustomToolCallOutput`, `ToolSearchOutput`。[E: codex-rs/protocol/src/models.rs:673][E: codex-rs/protocol/src/models.rs:674][E: codex-rs/protocol/src/models.rs:681][E: codex-rs/protocol/src/models.rs:687][E: codex-rs/protocol/src/models.rs:691][E: codex-rs/protocol/src/models.rs:700] | `models.rs:673` |
| `ContentItem` | tagged enum | `InputText`、`InputImage { image_url, detail? }`、`InputAudio { audio_url }`、`OutputText`。[E: codex-rs/protocol/src/models.rs:711][E: codex-rs/protocol/src/models.rs:712][E: codex-rs/protocol/src/models.rs:715][E: codex-rs/protocol/src/models.rs:721][E: codex-rs/protocol/src/models.rs:724] | `models.rs:711` |
| `AgentMessageInputContent` | tagged enum | `InputText` or `EncryptedContent`; helper returns plaintext only when all parts are `InputText`。[E: codex-rs/protocol/src/models.rs:731][E: codex-rs/protocol/src/models.rs:732][E: codex-rs/protocol/src/models.rs:733][E: codex-rs/protocol/src/models.rs:737][E: codex-rs/protocol/src/models.rs:741][E: codex-rs/protocol/src/models.rs:742][E: codex-rs/protocol/src/models.rs:747] | `models.rs:731` |
| `ImageDetail` | enum | `Auto`, `Low`, `High`, `Original`; default constant is `High`。[E: codex-rs/protocol/src/models.rs:752][E: codex-rs/protocol/src/models.rs:753][E: codex-rs/protocol/src/models.rs:754][E: codex-rs/protocol/src/models.rs:755][E: codex-rs/protocol/src/models.rs:756][E: codex-rs/protocol/src/models.rs:759] | `models.rs:752` |
| `MessagePhase` | enum | `Commentary`, `FinalAnswer`；`ResponseInputItem::Message.phase` 是 optional。[E: codex-rs/protocol/src/models.rs:679][E: codex-rs/protocol/src/models.rs:767][E: codex-rs/protocol/src/models.rs:772][E: codex-rs/protocol/src/models.rs:774] | `models.rs:767` |
| `ResponseItem` | tagged enum | 17 variants: `AdditionalTools`, `Message`, `AgentMessage`, `Reasoning`, `LocalShellCall`, `FunctionCall`, `ToolSearchCall`, `FunctionCallOutput`, `CustomToolCall`, `CustomToolCallOutput`, `ToolSearchOutput`, `WebSearchCall`, `ImageGenerationCall`, `Compaction`, `CompactionTrigger`, `ContextCompaction`, `Other`。[E: codex-rs/protocol/src/models.rs:804][E: codex-rs/protocol/src/models.rs:807][E: codex-rs/protocol/src/models.rs:813][E: codex-rs/protocol/src/models.rs:1032] | `models.rs:804` |
| `BaseInstructions` | struct | `text: String`; default text comes from `prompts/base_instructions/default.md` include。[E: codex-rs/protocol/src/models.rs:1258][E: codex-rs/protocol/src/models.rs:1263][E: codex-rs/protocol/src/models.rs:1270] | `models.rs:1258` |

## Dynamic tools / request tools

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `DynamicToolSpec` | tagged enum | `Function(DynamicToolFunctionSpec)` or `Namespace(DynamicToolNamespaceSpec)`; namespace tools are `Function(DynamicToolFunctionSpec)` entries。[E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:15][E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:35][E: codex-rs/protocol/src/dynamic_tools.rs:41][E: codex-rs/protocol/src/dynamic_tools.rs:42] | `dynamic_tools.rs:13` |
| `DynamicToolFunctionSpec` | struct | `name`, `description`, `input_schema`, defaulted `defer_loading`。[E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:26] | `dynamic_tools.rs:21` |
| `DynamicToolCallRequest` | struct | `call_id`, `turn_id`, defaulted `started_at_ms`, optional `namespace`, `tool`, `arguments`。[E: codex-rs/protocol/src/dynamic_tools.rs:47][E: codex-rs/protocol/src/dynamic_tools.rs:48][E: codex-rs/protocol/src/dynamic_tools.rs:49][E: codex-rs/protocol/src/dynamic_tools.rs:50][E: codex-rs/protocol/src/dynamic_tools.rs:51][E: codex-rs/protocol/src/dynamic_tools.rs:53][E: codex-rs/protocol/src/dynamic_tools.rs:54][E: codex-rs/protocol/src/dynamic_tools.rs:55] | `dynamic_tools.rs:47` |
| `DynamicToolResponse` | struct | `content_items`, `success`；content item variants 是 `InputText`、`InputImage`、`InputAudio`。[E: codex-rs/protocol/src/dynamic_tools.rs:60][E: codex-rs/protocol/src/dynamic_tools.rs:61][E: codex-rs/protocol/src/dynamic_tools.rs:62][E: codex-rs/protocol/src/dynamic_tools.rs:68][E: codex-rs/protocol/src/dynamic_tools.rs:70][E: codex-rs/protocol/src/dynamic_tools.rs:72][E: codex-rs/protocol/src/dynamic_tools.rs:74] | `dynamic_tools.rs:60` |
| `RequestPermissionsArgs` | struct | optional `environment_id` / `environmentId` alias, optional `reason`, `permissions`。[E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:53][E: codex-rs/protocol/src/request_permissions.rs:54][E: codex-rs/protocol/src/request_permissions.rs:58][E: codex-rs/protocol/src/request_permissions.rs:60][E: codex-rs/protocol/src/request_permissions.rs:61] | `request_permissions.rs:50` |
| `RequestPermissionsResponse` | struct | `permissions`, default `scope: PermissionGrantScope`, default `strict_auto_review`。[E: codex-rs/protocol/src/request_permissions.rs:12][E: codex-rs/protocol/src/request_permissions.rs:14][E: codex-rs/protocol/src/request_permissions.rs:15][E: codex-rs/protocol/src/request_permissions.rs:65][E: codex-rs/protocol/src/request_permissions.rs:66][E: codex-rs/protocol/src/request_permissions.rs:67][E: codex-rs/protocol/src/request_permissions.rs:68][E: codex-rs/protocol/src/request_permissions.rs:70][E: codex-rs/protocol/src/request_permissions.rs:71] | `request_permissions.rs:65` |
| `RequestUserInputArgs` | struct | `questions`, optional `autoResolutionMs`。[E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:33][E: codex-rs/protocol/src/request_user_input.rs:34][E: codex-rs/protocol/src/request_user_input.rs:36] | `request_user_input.rs:32` |
| `RequestUserInputQuestion` | struct | `id`, `header`, `question`, `isOther`, `isSecret`, optional `options`。[E: codex-rs/protocol/src/request_user_input.rs:15][E: codex-rs/protocol/src/request_user_input.rs:16][E: codex-rs/protocol/src/request_user_input.rs:17][E: codex-rs/protocol/src/request_user_input.rs:18][E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/protocol/src/request_user_input.rs:28] | `request_user_input.rs:15` |
| `RequestUserInputResponse` | struct | `answers: HashMap<String, RequestUserInputAnswer>`, each answer holds `Vec<String>`。[E: codex-rs/protocol/src/request_user_input.rs:40][E: codex-rs/protocol/src/request_user_input.rs:41][E: codex-rs/protocol/src/request_user_input.rs:45][E: codex-rs/protocol/src/request_user_input.rs:46] | `request_user_input.rs:45` |
| `UpdatePlanArgs` | struct | optional `explanation`, `plan: Vec<PlanItemArg>`; `StepStatus` is `Pending`, `InProgress`, `Completed`。[E: codex-rs/protocol/src/plan_tool.rs:9][E: codex-rs/protocol/src/plan_tool.rs:19][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/plan_tool.rs:28] | `plan_tool.rs:24` |

## Persistence / rollout model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ThreadHistoryMode` | enum | `Legacy`（default）或 `Paginated`。[E: codex-rs/protocol/src/protocol.rs:697][E: codex-rs/protocol/src/protocol.rs:698][E: codex-rs/protocol/src/protocol.rs:699][E: codex-rs/protocol/src/protocol.rs:700] | `protocol.rs:697` |
| `HistoryPosition` | struct | inherited paginated prefix 的 thread id、exclusive end ordinal 与 JSONL byte offset。[E: codex-rs/protocol/src/protocol.rs:3056][E: codex-rs/protocol/src/protocol.rs:3057][E: codex-rs/protocol/src/protocol.rs:3059][E: codex-rs/protocol/src/protocol.rs:3061] | `protocol.rs:3056` |
| `SessionMeta` | struct | thread/session identity、source/agent fields、provider/instructions/tools/capability roots，并记录 `history_mode`、optional inherited `history_base`、subagent 自有 history 起点及 initial context-window identity。[E: codex-rs/protocol/src/protocol.rs:3070][E: codex-rs/protocol/src/protocol.rs:3071][E: codex-rs/protocol/src/protocol.rs:3072][E: codex-rs/protocol/src/protocol.rs:3082][E: codex-rs/protocol/src/protocol.rs:3088][E: codex-rs/protocol/src/protocol.rs:3091][E: codex-rs/protocol/src/protocol.rs:3094][E: codex-rs/protocol/src/protocol.rs:3095][E: codex-rs/protocol/src/protocol.rs:3099][E: codex-rs/protocol/src/protocol.rs:3105][E: codex-rs/protocol/src/protocol.rs:3108][E: codex-rs/protocol/src/protocol.rs:3112][E: codex-rs/protocol/src/protocol.rs:3115][E: codex-rs/protocol/src/protocol.rs:3121][E: codex-rs/protocol/src/protocol.rs:3126] | `protocol.rs:3070` |
| `SessionMetaLine` | struct | flattened `SessionMeta` plus optional `GitInfo`。[E: codex-rs/protocol/src/protocol.rs:3161][E: codex-rs/protocol/src/protocol.rs:3163][E: codex-rs/protocol/src/protocol.rs:3165] | `protocol.rs:3161` |
| `RolloutItem` | tagged enum | 8 variants: `SessionMeta`, `ResponseItem`, `InterAgentCommunication`, `InterAgentCommunicationMetadata`, `Compacted`, `TurnContext`, `WorldState`, `EventMsg`。[E: codex-rs/protocol/src/protocol.rs:3199][E: codex-rs/protocol/src/protocol.rs:3200][E: codex-rs/protocol/src/protocol.rs:3201][E: codex-rs/protocol/src/protocol.rs:3203][E: codex-rs/protocol/src/protocol.rs:3205][E: codex-rs/protocol/src/protocol.rs:3208][E: codex-rs/protocol/src/protocol.rs:3209][E: codex-rs/protocol/src/protocol.rs:3210][E: codex-rs/protocol/src/protocol.rs:3211] | `protocol.rs:3199` |
| `CompactedItem` | struct | `message`, optional `replacement_history`, optional `window_number`, optional `first_window_id`, optional `previous_window_id`, optional `window_id`; converts into assistant `ResponseItem::Message`。[E: codex-rs/protocol/src/protocol.rs:3233][E: codex-rs/protocol/src/protocol.rs:3234][E: codex-rs/protocol/src/protocol.rs:3236][E: codex-rs/protocol/src/protocol.rs:3239][E: codex-rs/protocol/src/protocol.rs:3242][E: codex-rs/protocol/src/protocol.rs:3245][E: codex-rs/protocol/src/protocol.rs:3248][E: codex-rs/protocol/src/protocol.rs:3251][E: codex-rs/protocol/src/protocol.rs:3253][E: codex-rs/protocol/src/protocol.rs:3256][E: codex-rs/protocol/src/protocol.rs:3257] | `protocol.rs:3233` |
| `TurnContextItem` | struct | optional `turn_id`, `cwd`, workspace roots, date/timezone, approval/sandbox/permission/network/fs policy, model, comp hash, personality, collaboration mode, multi-agent version, realtime flag, effort, compatibility `summary`。[E: codex-rs/protocol/src/protocol.rs:3276][E: codex-rs/protocol/src/protocol.rs:3278][E: codex-rs/protocol/src/protocol.rs:3279][E: codex-rs/protocol/src/protocol.rs:3283][E: codex-rs/protocol/src/protocol.rs:3285][E: codex-rs/protocol/src/protocol.rs:3287][E: codex-rs/protocol/src/protocol.rs:3288][E: codex-rs/protocol/src/protocol.rs:3291][E: codex-rs/protocol/src/protocol.rs:3293][E: codex-rs/protocol/src/protocol.rs:3295][E: codex-rs/protocol/src/protocol.rs:3297][E: codex-rs/protocol/src/protocol.rs:3298][E: codex-rs/protocol/src/protocol.rs:3300][E: codex-rs/protocol/src/protocol.rs:3302][E: codex-rs/protocol/src/protocol.rs:3304][E: codex-rs/protocol/src/protocol.rs:3306][E: codex-rs/protocol/src/protocol.rs:3311][E: codex-rs/protocol/src/protocol.rs:3313][E: codex-rs/protocol/src/protocol.rs:3318] | `protocol.rs:3276` |
| `TurnContextItem::permission_profile` | method | falls back from legacy sandbox/file-system/network policy fields when explicit `permission_profile` is absent。[E: codex-rs/protocol/src/protocol.rs:3322][E: codex-rs/protocol/src/protocol.rs:3323][E: codex-rs/protocol/src/protocol.rs:3326][E: codex-rs/protocol/src/protocol.rs:3331][E: codex-rs/protocol/src/protocol.rs:3332][E: codex-rs/protocol/src/protocol.rs:3334] | `protocol.rs:3322` |
| `RolloutLine` | struct | timestamp + optional paginated `ordinal` + flattened `RolloutItem`。[E: codex-rs/protocol/src/protocol.rs:3393][E: codex-rs/protocol/src/protocol.rs:3394][E: codex-rs/protocol/src/protocol.rs:3396][E: codex-rs/protocol/src/protocol.rs:3398] | `protocol.rs:3393` |

## 设计动机速记

- `UserInput` is `#[non_exhaustive]`,so consumers should treat future input variants as protocol evolution instead of a closed set。[E: codex-rs/protocol/src/user_input.rs:12][I]
- `ResponseItem` now includes agent-to-agent messages, additional tool declarations, and compaction lifecycle variants alongside model/tool output variants。[E: codex-rs/protocol/src/models.rs:807][E: codex-rs/protocol/src/models.rs:829][E: codex-rs/protocol/src/models.rs:1009][E: codex-rs/protocol/src/models.rs:1019][E: codex-rs/protocol/src/models.rs:1020][I]
- `RolloutItem` persists model/provider items, protocol events, inter-agent communication metadata, and world-state snapshots; replay/resume can therefore reconstruct state from `SessionMeta`, `TurnContext`, `ResponseItem`, `InterAgentCommunication`, compaction records, `WorldState`, and `EventMsg` lines。[E: codex-rs/protocol/src/protocol.rs:3200][E: codex-rs/protocol/src/protocol.rs:3201][E: codex-rs/protocol/src/protocol.rs:3203][E: codex-rs/protocol/src/protocol.rs:3205][E: codex-rs/protocol/src/protocol.rs:3208][E: codex-rs/protocol/src/protocol.rs:3209][E: codex-rs/protocol/src/protocol.rs:3210][E: codex-rs/protocol/src/protocol.rs:3211][I]

## Sources

- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/user_input.rs`
- `codex-rs/protocol/src/thread_id.rs`
- `codex-rs/protocol/src/response_item_id.rs`
- `codex-rs/protocol/src/dynamic_tools.rs`
- `codex-rs/protocol/src/request_permissions.rs`
- `codex-rs/protocol/src/request_user_input.rs`
- `codex-rs/protocol/src/plan_tool.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [ref.protocol-op](protocol-op.md)
- [ref.protocol-items](protocol-items.md)
- [ref.key-types](key-types.md)
- [sdk.ts-events-items](../sdk/ts-events-items.md)
- [sdk.py-inputs-errors](../sdk/py-inputs-errors.md)
