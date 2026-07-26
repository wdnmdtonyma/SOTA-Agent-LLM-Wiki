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
updated: 61a44880a8
---

> 这些 `codex-rs/protocol/src` 文件定义用户输入、Responses input/output item、dynamic tool payload、request tool payload、plan tool payload、session metadata 与 rollout persistence item。[E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/models.rs:668][E: codex-rs/protocol/src/models.rs:799][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/protocol.rs:3057][E: codex-rs/protocol/src/protocol.rs:3186]

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
| `ResponseInputItem` | tagged enum | 5 variants: `Message`, `FunctionCallOutput`, `McpToolCallOutput`, `CustomToolCallOutput`, `ToolSearchOutput`。[E: codex-rs/protocol/src/models.rs:668][E: codex-rs/protocol/src/models.rs:669][E: codex-rs/protocol/src/models.rs:676][E: codex-rs/protocol/src/models.rs:682][E: codex-rs/protocol/src/models.rs:686][E: codex-rs/protocol/src/models.rs:695] | `models.rs:673` |
| `ContentItem` | tagged enum | `InputText`、`InputImage { image_url, detail? }`、`InputAudio { audio_url }`、`OutputText`。[E: codex-rs/protocol/src/models.rs:706][E: codex-rs/protocol/src/models.rs:707][E: codex-rs/protocol/src/models.rs:710][E: codex-rs/protocol/src/models.rs:716][E: codex-rs/protocol/src/models.rs:719] | `models.rs:711` |
| `AgentMessageInputContent` | tagged enum | `InputText` or `EncryptedContent`; helper returns plaintext only when all parts are `InputText`。[E: codex-rs/protocol/src/models.rs:726][E: codex-rs/protocol/src/models.rs:727][E: codex-rs/protocol/src/models.rs:728][E: codex-rs/protocol/src/models.rs:732][E: codex-rs/protocol/src/models.rs:736][E: codex-rs/protocol/src/models.rs:737][E: codex-rs/protocol/src/models.rs:742] | `models.rs:731` |
| `ImageDetail` | enum | `Auto`, `Low`, `High`, `Original`; default constant is `High`。[E: codex-rs/protocol/src/models.rs:747][E: codex-rs/protocol/src/models.rs:748][E: codex-rs/protocol/src/models.rs:749][E: codex-rs/protocol/src/models.rs:750][E: codex-rs/protocol/src/models.rs:751][E: codex-rs/protocol/src/models.rs:754] | `models.rs:752` |
| `MessagePhase` | enum | `Commentary`, `FinalAnswer`；`ResponseInputItem::Message.phase` 是 optional。[E: codex-rs/protocol/src/models.rs:674][E: codex-rs/protocol/src/models.rs:762][E: codex-rs/protocol/src/models.rs:767][E: codex-rs/protocol/src/models.rs:769] | `models.rs:767` |
| `ResponseItem` | tagged enum | 17 variants: `AdditionalTools`, `Message`, `AgentMessage`, `Reasoning`, `LocalShellCall`, `FunctionCall`, `ToolSearchCall`, `FunctionCallOutput`, `CustomToolCall`, `CustomToolCallOutput`, `ToolSearchOutput`, `WebSearchCall`, `ImageGenerationCall`, `Compaction`, `CompactionTrigger`, `ContextCompaction`, `Other`。[E: codex-rs/protocol/src/models.rs:799][E: codex-rs/protocol/src/models.rs:802][E: codex-rs/protocol/src/models.rs:808][E: codex-rs/protocol/src/models.rs:1027] | `models.rs:804` |
| `BaseInstructions` | struct | `text: String`; default text comes from `prompts/base_instructions/default.md` include。[E: codex-rs/protocol/src/models.rs:1253][E: codex-rs/protocol/src/models.rs:1258][E: codex-rs/protocol/src/models.rs:1265] | `models.rs:1258` |

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
| `ThreadHistoryMode` | enum | `Legacy`（default）或 `Paginated`。[E: codex-rs/protocol/src/protocol.rs:691][E: codex-rs/protocol/src/protocol.rs:692][E: codex-rs/protocol/src/protocol.rs:693][E: codex-rs/protocol/src/protocol.rs:694] | `protocol.rs:697` |
| `HistoryPosition` | struct | inherited paginated prefix 的 thread id、exclusive end ordinal 与 JSONL byte offset。[E: codex-rs/protocol/src/protocol.rs:3043][E: codex-rs/protocol/src/protocol.rs:3044][E: codex-rs/protocol/src/protocol.rs:3046][E: codex-rs/protocol/src/protocol.rs:3048] | `protocol.rs:3056` |
| `SessionMeta` | struct | thread/session identity、source/agent fields、provider/instructions/tools/capability roots，并记录 `history_mode`、optional inherited `history_base`、subagent 自有 history 起点及 initial context-window identity。[E: codex-rs/protocol/src/protocol.rs:3057][E: codex-rs/protocol/src/protocol.rs:3058][E: codex-rs/protocol/src/protocol.rs:3059][E: codex-rs/protocol/src/protocol.rs:3069][E: codex-rs/protocol/src/protocol.rs:3075][E: codex-rs/protocol/src/protocol.rs:3078][E: codex-rs/protocol/src/protocol.rs:3081][E: codex-rs/protocol/src/protocol.rs:3082][E: codex-rs/protocol/src/protocol.rs:3086][E: codex-rs/protocol/src/protocol.rs:3092][E: codex-rs/protocol/src/protocol.rs:3095][E: codex-rs/protocol/src/protocol.rs:3099][E: codex-rs/protocol/src/protocol.rs:3102][E: codex-rs/protocol/src/protocol.rs:3108][E: codex-rs/protocol/src/protocol.rs:3113] | `protocol.rs:3070` |
| `SessionMetaLine` | struct | flattened `SessionMeta` plus optional `GitInfo`。[E: codex-rs/protocol/src/protocol.rs:3148][E: codex-rs/protocol/src/protocol.rs:3150][E: codex-rs/protocol/src/protocol.rs:3152] | `protocol.rs:3161` |
| `RolloutItem` | tagged enum | 8 variants: `SessionMeta`, `ResponseItem`, `InterAgentCommunication`, `InterAgentCommunicationMetadata`, `Compacted`, `TurnContext`, `WorldState`, `EventMsg`。[E: codex-rs/protocol/src/protocol.rs:3186][E: codex-rs/protocol/src/protocol.rs:3187][E: codex-rs/protocol/src/protocol.rs:3188][E: codex-rs/protocol/src/protocol.rs:3190][E: codex-rs/protocol/src/protocol.rs:3192][E: codex-rs/protocol/src/protocol.rs:3195][E: codex-rs/protocol/src/protocol.rs:3196][E: codex-rs/protocol/src/protocol.rs:3197][E: codex-rs/protocol/src/protocol.rs:3198] | `protocol.rs:3199` |
| `CompactedItem` | struct | `message`, optional `replacement_history`, optional `window_number`, optional `first_window_id`, optional `previous_window_id`, optional `window_id`; converts into assistant `ResponseItem::Message`。[E: codex-rs/protocol/src/protocol.rs:3220][E: codex-rs/protocol/src/protocol.rs:3221][E: codex-rs/protocol/src/protocol.rs:3223][E: codex-rs/protocol/src/protocol.rs:3226][E: codex-rs/protocol/src/protocol.rs:3229][E: codex-rs/protocol/src/protocol.rs:3232][E: codex-rs/protocol/src/protocol.rs:3235][E: codex-rs/protocol/src/protocol.rs:3238][E: codex-rs/protocol/src/protocol.rs:3240][E: codex-rs/protocol/src/protocol.rs:3243][E: codex-rs/protocol/src/protocol.rs:3244] | `protocol.rs:3233` |
| `TurnContextItem` | struct | optional `turn_id`, `cwd`, workspace roots, date/timezone, approval/sandbox/permission/network/fs policy, model, comp hash, personality, collaboration mode, multi-agent version, realtime flag, effort, compatibility `summary`。[E: codex-rs/protocol/src/protocol.rs:3263][E: codex-rs/protocol/src/protocol.rs:3265][E: codex-rs/protocol/src/protocol.rs:3266][E: codex-rs/protocol/src/protocol.rs:3270][E: codex-rs/protocol/src/protocol.rs:3272][E: codex-rs/protocol/src/protocol.rs:3274][E: codex-rs/protocol/src/protocol.rs:3275][E: codex-rs/protocol/src/protocol.rs:3278][E: codex-rs/protocol/src/protocol.rs:3280][E: codex-rs/protocol/src/protocol.rs:3282][E: codex-rs/protocol/src/protocol.rs:3284][E: codex-rs/protocol/src/protocol.rs:3285][E: codex-rs/protocol/src/protocol.rs:3287][E: codex-rs/protocol/src/protocol.rs:3289][E: codex-rs/protocol/src/protocol.rs:3291][E: codex-rs/protocol/src/protocol.rs:3293][E: codex-rs/protocol/src/protocol.rs:3298][E: codex-rs/protocol/src/protocol.rs:3300][E: codex-rs/protocol/src/protocol.rs:3305] | `protocol.rs:3276` |
| `TurnContextItem::permission_profile` | method | falls back from legacy sandbox/file-system/network policy fields when explicit `permission_profile` is absent。[E: codex-rs/protocol/src/protocol.rs:3309][E: codex-rs/protocol/src/protocol.rs:3310][E: codex-rs/protocol/src/protocol.rs:3313][E: codex-rs/protocol/src/protocol.rs:3318][E: codex-rs/protocol/src/protocol.rs:3319][E: codex-rs/protocol/src/protocol.rs:3321] | `protocol.rs:3322` |
| `RolloutLine` | struct | timestamp + optional paginated `ordinal` + flattened `RolloutItem`。[E: codex-rs/protocol/src/protocol.rs:3380][E: codex-rs/protocol/src/protocol.rs:3381][E: codex-rs/protocol/src/protocol.rs:3383][E: codex-rs/protocol/src/protocol.rs:3385] | `protocol.rs:3393` |

## 设计动机速记

- `UserInput` is `#[non_exhaustive]`,so consumers should treat future input variants as protocol evolution instead of a closed set。[E: codex-rs/protocol/src/user_input.rs:12][I]
- `ResponseItem` now includes agent-to-agent messages, additional tool declarations, and compaction lifecycle variants alongside model/tool output variants。[E: codex-rs/protocol/src/models.rs:802][E: codex-rs/protocol/src/models.rs:824][E: codex-rs/protocol/src/models.rs:1004][E: codex-rs/protocol/src/models.rs:1014][E: codex-rs/protocol/src/models.rs:1015][I]
- `RolloutItem` persists model/provider items, protocol events, inter-agent communication metadata, and world-state snapshots; replay/resume can therefore reconstruct state from `SessionMeta`, `TurnContext`, `ResponseItem`, `InterAgentCommunication`, compaction records, `WorldState`, and `EventMsg` lines。[E: codex-rs/protocol/src/protocol.rs:3187][E: codex-rs/protocol/src/protocol.rs:3188][E: codex-rs/protocol/src/protocol.rs:3190][E: codex-rs/protocol/src/protocol.rs:3192][E: codex-rs/protocol/src/protocol.rs:3195][E: codex-rs/protocol/src/protocol.rs:3196][E: codex-rs/protocol/src/protocol.rs:3197][E: codex-rs/protocol/src/protocol.rs:3198][I]

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
