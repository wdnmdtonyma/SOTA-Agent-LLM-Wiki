---
id: ref.data-model
title: Protocol data model 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/models.rs, codex-rs/protocol/src/user_input.rs, codex-rs/protocol/src/thread_id.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/plan_tool.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ThreadId, UserInput, TextElement, ByteRange, ResponseInputItem, ContentItem, AgentMessageInputContent, ImageDetail, MessagePhase, ResponseItem, BaseInstructions, DynamicToolSpec, DynamicToolCallRequest, DynamicToolResponse, RequestPermissionsArgs, RequestPermissionsResponse, RequestUserInputArgs, RequestUserInputResponse, UpdatePlanArgs, SessionMeta, RolloutItem, TurnContextItem]
related: [ref.protocol-op, ref.protocol-items, ref.key-types, sdk.ts-events-items, sdk.py-inputs-errors]
evidence: explicit
status: verified
updated: 5670360009
---

> 这些 `codex-rs/protocol/src` 文件定义用户输入、Responses input/output item、dynamic tool payload、request tool payload、plan tool payload、session metadata 与 rollout persistence item。[E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/models.rs:806][E: codex-rs/protocol/src/models.rs:919][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/protocol.rs:2877][E: codex-rs/protocol/src/protocol.rs:2952]

## 能回答的问题

- `UserInput` 当前有哪些 variant,rich text span 如何表示?
- Responses API input/output 在 protocol 层用哪些 enum 表示?
- dynamic tool 的 spec、call request、response payload 字段是什么?
- `request_permissions` 与 `request_user_input` 的 args/event/response 类型如何对应?
- rollout 持久化写入哪些 item 类型?

## Identity / input model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ThreadId` | wrapper struct | wraps `Uuid`; `new()` 使用 `Uuid::now_v7()`,serialize 通过 `serializer.collect_str(&self.uuid)` 输出 string。[E: codex-rs/protocol/src/thread_id.rs:13][E: codex-rs/protocol/src/thread_id.rs:20][E: codex-rs/protocol/src/thread_id.rs:65][E: codex-rs/protocol/src/thread_id.rs:70] | `thread_id.rs:13` |
| `UserInput` | non-exhaustive tagged enum | `Text { text, text_elements }`, `Image { image_url, detail? }`, `LocalImage { path, detail? }`, `Skill { name, path }`, `Mention { name, path }`。[E: codex-rs/protocol/src/user_input.rs:12][E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/user_input.rs:51] | `user_input.rs:15` |
| `MAX_USER_INPUT_TEXT_CHARS` | const | conservative cap: `1 << 20` chars per user message text。[E: codex-rs/protocol/src/user_input.rs:8][E: codex-rs/protocol/src/user_input.rs:9] | `user_input.rs:9` |
| `TextElement` | struct | `byte_range: ByteRange`, private optional `placeholder`; `placeholder(text)` falls back to source text slice for that byte range。[E: codex-rs/protocol/src/user_input.rs:55][E: codex-rs/protocol/src/user_input.rs:59][E: codex-rs/protocol/src/user_input.rs:99][E: codex-rs/protocol/src/user_input.rs:102] | `user_input.rs:55` |
| `ByteRange` | struct | UTF-8 text buffer start-inclusive/end-exclusive byte offsets。[E: codex-rs/protocol/src/user_input.rs:107][E: codex-rs/protocol/src/user_input.rs:111] | `user_input.rs:107` |

## Model request / response item model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `ResponseInputItem` | tagged enum | 5 variants: `Message`, `FunctionCallOutput`, `McpToolCallOutput`, `CustomToolCallOutput`, `ToolSearchOutput`。[E: codex-rs/protocol/src/models.rs:804][E: codex-rs/protocol/src/models.rs:806][E: codex-rs/protocol/src/models.rs:840] | `models.rs:806` |
| `ContentItem` | tagged enum | `InputText`, `InputImage { image_url, detail? }`, `OutputText`。[E: codex-rs/protocol/src/models.rs:844][E: codex-rs/protocol/src/models.rs:857] | `models.rs:844` |
| `AgentMessageInputContent` | tagged enum | `InputText` or `EncryptedContent`; helper returns plaintext only when all parts are `InputText`。[E: codex-rs/protocol/src/models.rs:861][E: codex-rs/protocol/src/models.rs:864][E: codex-rs/protocol/src/models.rs:867][E: codex-rs/protocol/src/models.rs:877] | `models.rs:861` |
| `ImageDetail` | enum | `Auto`, `Low`, `High`, `Original`; default constant is `High`。[E: codex-rs/protocol/src/models.rs:882][E: codex-rs/protocol/src/models.rs:887][E: codex-rs/protocol/src/models.rs:889] | `models.rs:882` |
| `MessagePhase` | enum | `Commentary`, `FinalAnswer`; comment says providers do not emit it consistently, so `None` means phase unknown。[E: codex-rs/protocol/src/models.rs:891][E: codex-rs/protocol/src/models.rs:897][E: codex-rs/protocol/src/models.rs:904] | `models.rs:897` |
| `ResponseItem` | tagged enum | 16 variants: `Message`, `AgentMessage`, `Reasoning`, `LocalShellCall`, `FunctionCall`, `ToolSearchCall`, `FunctionCallOutput`, `CustomToolCall`, `CustomToolCallOutput`, `ToolSearchOutput`, `WebSearchCall`, `ImageGenerationCall`, `Compaction`, `CompactionTrigger`, `ContextCompaction`, `Other`。[E: codex-rs/protocol/src/models.rs:919][E: codex-rs/protocol/src/models.rs:920][E: codex-rs/protocol/src/models.rs:1157] | `models.rs:919` |
| `BaseInstructions` | struct | `text: String`; default text comes from `prompts/base_instructions/default.md` include。[E: codex-rs/protocol/src/models.rs:1280][E: codex-rs/protocol/src/models.rs:1285][E: codex-rs/protocol/src/models.rs:1292] | `models.rs:1285` |

## Dynamic tools / request tools

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `DynamicToolSpec` | tagged enum | `Function(DynamicToolFunctionSpec)` or `Namespace(DynamicToolNamespaceSpec)`; namespace tools are `Function(DynamicToolFunctionSpec)` entries。[E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:16][E: codex-rs/protocol/src/dynamic_tools.rs:32][E: codex-rs/protocol/src/dynamic_tools.rs:42] | `dynamic_tools.rs:13` |
| `DynamicToolFunctionSpec` | struct | `name`, `description`, `input_schema`, defaulted `defer_loading`。[E: codex-rs/protocol/src/dynamic_tools.rs:21][E: codex-rs/protocol/src/dynamic_tools.rs:26] | `dynamic_tools.rs:21` |
| `DynamicToolCallRequest` | struct | `call_id`, `turn_id`, defaulted `started_at_ms`, optional `namespace`, `tool`, `arguments`。[E: codex-rs/protocol/src/dynamic_tools.rs:47][E: codex-rs/protocol/src/dynamic_tools.rs:56] | `dynamic_tools.rs:47` |
| `DynamicToolResponse` | struct | `content_items`, `success`; content item variants are `InputText` and `InputImage`。[E: codex-rs/protocol/src/dynamic_tools.rs:60][E: codex-rs/protocol/src/dynamic_tools.rs:63][E: codex-rs/protocol/src/dynamic_tools.rs:68][E: codex-rs/protocol/src/dynamic_tools.rs:73] | `dynamic_tools.rs:60` |
| `RequestPermissionsArgs` | struct | optional `environment_id` / `environmentId` alias, optional `reason`, `permissions`。[E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:62] | `request_permissions.rs:50` |
| `RequestPermissionsResponse` | struct | `permissions`, default `scope: PermissionGrantScope`, default `strict_auto_review`。[E: codex-rs/protocol/src/request_permissions.rs:12][E: codex-rs/protocol/src/request_permissions.rs:16][E: codex-rs/protocol/src/request_permissions.rs:65][E: codex-rs/protocol/src/request_permissions.rs:72] | `request_permissions.rs:65` |
| `RequestUserInputArgs` | struct | `questions`, optional `autoResolutionMs`。[E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:37] | `request_user_input.rs:32` |
| `RequestUserInputQuestion` | struct | `id`, `header`, `question`, `isOther`, `isSecret`, optional `options`。[E: codex-rs/protocol/src/request_user_input.rs:15][E: codex-rs/protocol/src/request_user_input.rs:29] | `request_user_input.rs:15` |
| `RequestUserInputResponse` | struct | `answers: HashMap<String, RequestUserInputAnswer>`, each answer holds `Vec<String>`。[E: codex-rs/protocol/src/request_user_input.rs:40][E: codex-rs/protocol/src/request_user_input.rs:47] | `request_user_input.rs:45` |
| `UpdatePlanArgs` | struct | optional `explanation`, `plan: Vec<PlanItemArg>`; `StepStatus` is `Pending`, `InProgress`, `Completed`。[E: codex-rs/protocol/src/plan_tool.rs:9][E: codex-rs/protocol/src/plan_tool.rs:19][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/plan_tool.rs:28] | `plan_tool.rs:24` |

## Persistence / rollout model

| Symbol | Shape | 字段/变体 | 定义锚 |
|---|---|---|---|
| `SessionMeta` | struct | thread ids, timestamp/cwd/originator/version/source, optional thread source, sub-agent nickname/role/path, model provider, base instructions, dynamic tools, memory mode, multi-agent version。[E: codex-rs/protocol/src/protocol.rs:2871][E: codex-rs/protocol/src/protocol.rs:2877][E: codex-rs/protocol/src/protocol.rs:2916] | `protocol.rs:2877` |
| `SessionMetaLine` | struct | flattened `SessionMeta` plus optional `GitInfo`。[E: codex-rs/protocol/src/protocol.rs:2943][E: codex-rs/protocol/src/protocol.rs:2947] | `protocol.rs:2943` |
| `RolloutItem` | tagged enum | 6 variants: `SessionMeta`, `ResponseItem`, `InterAgentCommunication`, `Compacted`, `TurnContext`, `EventMsg`。[E: codex-rs/protocol/src/protocol.rs:2952][E: codex-rs/protocol/src/protocol.rs:2960] | `protocol.rs:2952` |
| `CompactedItem` | struct | `message`, optional `replacement_history`, optional `window_id`; converts into assistant `ResponseItem::Message`。[E: codex-rs/protocol/src/protocol.rs:2963][E: codex-rs/protocol/src/protocol.rs:2969][E: codex-rs/protocol/src/protocol.rs:2971][E: codex-rs/protocol/src/protocol.rs:2982] | `protocol.rs:2963` |
| `TurnContextItem` | struct | optional `turn_id`, `cwd`, workspace roots, date/timezone, approval/sandbox/permission/network/fs policy, model, comp hash, personality, collaboration mode, multi-agent version, realtime flag, effort, compatibility `summary`。[E: codex-rs/protocol/src/protocol.rs:2991][E: codex-rs/protocol/src/protocol.rs:2996][E: codex-rs/protocol/src/protocol.rs:3034] | `protocol.rs:2996` |
| `TurnContextItem::permission_profile` | method | falls back from legacy sandbox/file-system/network policy fields when explicit `permission_profile` is absent。[E: codex-rs/protocol/src/protocol.rs:3036][E: codex-rs/protocol/src/protocol.rs:3051] | `protocol.rs:3037` |

## 设计动机速记

- `UserInput` is `#[non_exhaustive]`,so consumers should treat future input variants as protocol evolution instead of a closed set。[E: codex-rs/protocol/src/user_input.rs:12][I]
- `ResponseItem` now includes agent-to-agent message and compaction lifecycle variants alongside model/tool output variants。[E: codex-rs/protocol/src/models.rs:937][E: codex-rs/protocol/src/models.rs:1125][E: codex-rs/protocol/src/models.rs:1135][E: codex-rs/protocol/src/models.rs:1144][I]
- `RolloutItem` persists both model/provider items and protocol events; replay/resume can therefore reconstruct state from `SessionMeta`, `TurnContext`, `ResponseItem`, `InterAgentCommunication`, compaction records, and `EventMsg` lines。[E: codex-rs/protocol/src/protocol.rs:2952][E: codex-rs/protocol/src/protocol.rs:2960][I]

## Sources

- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/user_input.rs`
- `codex-rs/protocol/src/thread_id.rs`
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
