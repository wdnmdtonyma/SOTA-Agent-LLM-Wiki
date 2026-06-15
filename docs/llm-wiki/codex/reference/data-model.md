---
id: ref.data-model
title: Protocol data model 索引
kind: reference
tier: T3
source: [codex-rs/protocol/src/models.rs, codex-rs/protocol/src/user_input.rs, codex-rs/protocol/src/thread_id.rs, codex-rs/protocol/src/dynamic_tools.rs, codex-rs/protocol/src/request_permissions.rs, codex-rs/protocol/src/request_user_input.rs, codex-rs/protocol/src/plan_tool.rs, codex-rs/protocol/src/protocol.rs]
symbols: [ThreadId, UserInput, TextElement, ByteRange, ResponseInputItem, ContentItem, ImageDetail, MessagePhase, ResponseItem, BaseInstructions, DynamicToolSpec, DynamicToolCallRequest, DynamicToolResponse, RequestPermissionsArgs, RequestPermissionsResponse, RequestUserInputArgs, RequestUserInputResponse, UpdatePlanArgs, SessionMeta, RolloutItem, TurnContextItem]
related: [ref.protocol-op, ref.protocol-items, ref.key-types, sdk.ts-events-items, sdk.py-inputs-errors]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 这些 `codex-rs/protocol/src` 文件定义用户输入、model response input/output item、dynamic tool payload、permission/user-input request payload、plan tool payload、session metadata 与 rollout persistence item。[E: codex-rs/protocol/src/user_input.rs:13][E: codex-rs/protocol/src/models.rs:361][E: codex-rs/protocol/src/models.rs:440][E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/protocol.rs:2802][E: codex-rs/protocol/src/protocol.rs:2863]

## 能回答的问题

- 用户输入 `UserInput` 有哪些 variant,rich text span 如何表示?
- Responses API input/output 在 Codex 协议层用哪些 enum 表示?
- dynamic tool 的 spec、call request、response payload 字段是什么?
- `request_permissions` 与 `request_user_input` 的 tool args/event/response 类型如何对应?
- rollout 持久化写入哪些 item 类型?

## Identity / input model

| Symbol | 签名/变体 | 字段/含义 | 定义处 |
|---|---|---|---|
| `ThreadId` | struct wrapping `Uuid` | `ThreadId::new()` 使用 `Uuid::now_v7()`；serialize 通过 `serializer.collect_str(&self.uuid)` 输出 string。[E: codex-rs/protocol/src/thread_id.rs:13][E: codex-rs/protocol/src/thread_id.rs:14][E: codex-rs/protocol/src/thread_id.rs:18][E: codex-rs/protocol/src/thread_id.rs:20][E: codex-rs/protocol/src/thread_id.rs:70] | `thread_id.rs` |
| `UserInput` | tagged enum | `Text { text, text_elements }`, `Image { image_url }`, `LocalImage { path }`, `Skill { name, path }`, `Mention { name, path }`。[E: codex-rs/protocol/src/user_input.rs:12][E: codex-rs/protocol/src/user_input.rs:13][E: codex-rs/protocol/src/user_input.rs:14][E: codex-rs/protocol/src/user_input.rs:15][E: codex-rs/protocol/src/user_input.rs:20][E: codex-rs/protocol/src/user_input.rs:21][E: codex-rs/protocol/src/user_input.rs:24][E: codex-rs/protocol/src/user_input.rs:28][E: codex-rs/protocol/src/user_input.rs:32][E: codex-rs/protocol/src/user_input.rs:33][E: codex-rs/protocol/src/user_input.rs:39] | `user_input.rs` |
| `MAX_USER_INPUT_TEXT_CHARS` | const | 单条 user message text 的 conservative cap 是 `1 << 20` chars。[E: codex-rs/protocol/src/user_input.rs:7] | `user_input.rs` |
| `TextElement` | struct | `byte_range: ByteRange`, optional private `placeholder`; `placeholder(text)` 会回退到原 text byte range slice。[E: codex-rs/protocol/src/user_input.rs:43][E: codex-rs/protocol/src/user_input.rs:45][E: codex-rs/protocol/src/user_input.rs:47][E: codex-rs/protocol/src/user_input.rs:87][E: codex-rs/protocol/src/user_input.rs:90] | `user_input.rs` |
| `ByteRange` | struct | UTF-8 text buffer 内的 start inclusive / end exclusive byte offsets。[E: codex-rs/protocol/src/user_input.rs:95][E: codex-rs/protocol/src/user_input.rs:96][E: codex-rs/protocol/src/user_input.rs:97][E: codex-rs/protocol/src/user_input.rs:98][E: codex-rs/protocol/src/user_input.rs:99] | `user_input.rs` |

## Model request / response item model

| Symbol | 签名/变体 | 字段/含义 | 定义处 |
|---|---|---|---|
| `ResponseInputItem` | tagged enum | `Message`, `FunctionCallOutput`, `McpToolCallOutput`, `CustomToolCallOutput`, `ToolSearchOutput`；Responses input item enum。[E: codex-rs/protocol/src/models.rs:360][E: codex-rs/protocol/src/models.rs:361][E: codex-rs/protocol/src/models.rs:362][E: codex-rs/protocol/src/models.rs:366][E: codex-rs/protocol/src/models.rs:372][E: codex-rs/protocol/src/models.rs:376][E: codex-rs/protocol/src/models.rs:385] | `models.rs` |
| `ContentItem` | tagged enum | `InputText`, `InputImage`, `OutputText`；`InputImage.detail` 是 optional `ImageDetail`。[E: codex-rs/protocol/src/models.rs:395][E: codex-rs/protocol/src/models.rs:396][E: codex-rs/protocol/src/models.rs:397][E: codex-rs/protocol/src/models.rs:400][E: codex-rs/protocol/src/models.rs:404][E: codex-rs/protocol/src/models.rs:406] | `models.rs` |
| `ImageDetail` | enum | `Auto`, `Low`, `High`, `Original`；`DEFAULT_IMAGE_DETAIL` 是 `High`。[E: codex-rs/protocol/src/models.rs:413][E: codex-rs/protocol/src/models.rs:414][E: codex-rs/protocol/src/models.rs:415][E: codex-rs/protocol/src/models.rs:416][E: codex-rs/protocol/src/models.rs:417][E: codex-rs/protocol/src/models.rs:420] | `models.rs` |
| `MessagePhase` | enum | `Commentary`, `FinalAnswer`；用于区分 mid-turn assistant text 与 terminal answer text。[E: codex-rs/protocol/src/models.rs:424][E: codex-rs/protocol/src/models.rs:426][E: codex-rs/protocol/src/models.rs:427][E: codex-rs/protocol/src/models.rs:428][E: codex-rs/protocol/src/models.rs:429][E: codex-rs/protocol/src/models.rs:434][E: codex-rs/protocol/src/models.rs:435] | `models.rs` |
| `ResponseItem` | tagged enum | 包含 model/harness output: `Message`, `Reasoning`, `LocalShellCall`, `FunctionCall`, `ToolSearchCall`, `FunctionCallOutput`, `CustomToolCall`, `CustomToolCallOutput`, `ToolSearchOutput`, `WebSearchCall`, `ImageGenerationCall`, `GhostSnapshot`, `Compaction`, `Other`。[E: codex-rs/protocol/src/models.rs:439][E: codex-rs/protocol/src/models.rs:440][E: codex-rs/protocol/src/models.rs:441][E: codex-rs/protocol/src/models.rs:458][E: codex-rs/protocol/src/models.rs:469][E: codex-rs/protocol/src/models.rs:479][E: codex-rs/protocol/src/models.rs:493][E: codex-rs/protocol/src/models.rs:510][E: codex-rs/protocol/src/models.rs:516][E: codex-rs/protocol/src/models.rs:531][E: codex-rs/protocol/src/models.rs:540][E: codex-rs/protocol/src/models.rs:555][E: codex-rs/protocol/src/models.rs:575][E: codex-rs/protocol/src/models.rs:584][E: codex-rs/protocol/src/models.rs:588][E: codex-rs/protocol/src/models.rs:592] | `models.rs` |
| `BaseInstructions` | struct | `text: String`; default text 来自 `prompts/base_instructions/default.md` include。[E: codex-rs/protocol/src/models.rs:595][E: codex-rs/protocol/src/models.rs:600][E: codex-rs/protocol/src/models.rs:601][E: codex-rs/protocol/src/models.rs:607] | `models.rs` |

## Event payload model 摘要

| Symbol | 签名/字段 | 含义 | 定义处 |
|---|---|---|---|
| `TurnStartedEvent` | `turn_id`, `started_at?`, `model_context_window?`, `collaboration_mode_kind` | turn lifecycle start payload。[E: codex-rs/protocol/src/protocol.rs:2118][E: codex-rs/protocol/src/protocol.rs:2119][E: codex-rs/protocol/src/protocol.rs:2123][E: codex-rs/protocol/src/protocol.rs:2125][E: codex-rs/protocol/src/protocol.rs:2127] | `protocol.rs` |
| `TurnCompleteEvent` | `turn_id`, `last_agent_message?`, `completed_at?`, `duration_ms?` | turn lifecycle completion payload。[E: codex-rs/protocol/src/protocol.rs:2104][E: codex-rs/protocol/src/protocol.rs:2105][E: codex-rs/protocol/src/protocol.rs:2106][E: codex-rs/protocol/src/protocol.rs:2110][E: codex-rs/protocol/src/protocol.rs:2114] | `protocol.rs` |
| `TokenUsage` | token counters | input/cached/output/reasoning/total token counters are `i64` fields。[E: codex-rs/protocol/src/protocol.rs:2131][E: codex-rs/protocol/src/protocol.rs:2133][E: codex-rs/protocol/src/protocol.rs:2135][E: codex-rs/protocol/src/protocol.rs:2137][E: codex-rs/protocol/src/protocol.rs:2139][E: codex-rs/protocol/src/protocol.rs:2141] | `protocol.rs` |
| `AgentMessageEvent` | `message`, `phase?`, `memory_citation?` | assistant message event payload。[E: codex-rs/protocol/src/protocol.rs:2358][E: codex-rs/protocol/src/protocol.rs:2359][E: codex-rs/protocol/src/protocol.rs:2361][E: codex-rs/protocol/src/protocol.rs:2363] | `protocol.rs` |
| `UserMessageEvent` | `message`, `images?`, `local_images`, `text_elements` | user message event payload；local image paths are kept for UI reattachment, not model-ready URLs。[E: codex-rs/protocol/src/protocol.rs:2367][E: codex-rs/protocol/src/protocol.rs:2368][E: codex-rs/protocol/src/protocol.rs:2373][E: codex-rs/protocol/src/protocol.rs:2374][E: codex-rs/protocol/src/protocol.rs:2375][E: codex-rs/protocol/src/protocol.rs:2376][E: codex-rs/protocol/src/protocol.rs:2378][E: codex-rs/protocol/src/protocol.rs:2381] | `protocol.rs` |
| `McpInvocation` | `server`, `tool`, `arguments?` | MCP tool invocation identity and arguments。[E: codex-rs/protocol/src/protocol.rs:2419][E: codex-rs/protocol/src/protocol.rs:2421][E: codex-rs/protocol/src/protocol.rs:2423][E: codex-rs/protocol/src/protocol.rs:2425] | `protocol.rs` |
| `McpToolCallBeginEvent` / `McpToolCallEndEvent` | `call_id`, `invocation`, `mcp_app_resource_uri?`, duration/result on end | MCP begin/end pairing uses `call_id` and repeats invocation; end event carries duration and result。[E: codex-rs/protocol/src/protocol.rs:2429][E: codex-rs/protocol/src/protocol.rs:2430][E: codex-rs/protocol/src/protocol.rs:2431][E: codex-rs/protocol/src/protocol.rs:2432][E: codex-rs/protocol/src/protocol.rs:2433][E: codex-rs/protocol/src/protocol.rs:2435][E: codex-rs/protocol/src/protocol.rs:2439][E: codex-rs/protocol/src/protocol.rs:2440][E: codex-rs/protocol/src/protocol.rs:2441][E: codex-rs/protocol/src/protocol.rs:2442][E: codex-rs/protocol/src/protocol.rs:2443][E: codex-rs/protocol/src/protocol.rs:2445][E: codex-rs/protocol/src/protocol.rs:2447][E: codex-rs/protocol/src/protocol.rs:2448][E: codex-rs/protocol/src/protocol.rs:2449] | `protocol.rs` |

## Dynamic tools / request tools

| Symbol | 签名/字段 | 含义 | 定义处 |
|---|---|---|---|
| `DynamicToolSpec` | `{ namespace?, name, description, input_schema, defer_loading }` | 描述 dynamic tool spec；`defer_loading` 字段带 `serde(default)`，deserialize fallback 会在缺少 `deferLoading` 时由 `exposeToContext` 推导或回退 false。[E: codex-rs/protocol/src/dynamic_tools.rs:10][E: codex-rs/protocol/src/dynamic_tools.rs:12][E: codex-rs/protocol/src/dynamic_tools.rs:13][E: codex-rs/protocol/src/dynamic_tools.rs:14][E: codex-rs/protocol/src/dynamic_tools.rs:15][E: codex-rs/protocol/src/dynamic_tools.rs:16][E: codex-rs/protocol/src/dynamic_tools.rs:17][E: codex-rs/protocol/src/dynamic_tools.rs:49][E: codex-rs/protocol/src/dynamic_tools.rs:55][E: codex-rs/protocol/src/dynamic_tools.rs:56][E: codex-rs/protocol/src/dynamic_tools.rs:78][E: codex-rs/protocol/src/dynamic_tools.rs:79] | `dynamic_tools.rs` |
| `DynamicToolCallRequest` | `{ call_id, turn_id, namespace?, tool, arguments }` | dynamic tool invocation payload。[E: codex-rs/protocol/src/dynamic_tools.rs:22][E: codex-rs/protocol/src/dynamic_tools.rs:23][E: codex-rs/protocol/src/dynamic_tools.rs:24][E: codex-rs/protocol/src/dynamic_tools.rs:26][E: codex-rs/protocol/src/dynamic_tools.rs:27][E: codex-rs/protocol/src/dynamic_tools.rs:28] | `dynamic_tools.rs` |
| `DynamicToolResponse` | `{ content_items, success }` | dynamic tool output can include text/image content items plus success bool。[E: codex-rs/protocol/src/dynamic_tools.rs:33][E: codex-rs/protocol/src/dynamic_tools.rs:34][E: codex-rs/protocol/src/dynamic_tools.rs:35][E: codex-rs/protocol/src/dynamic_tools.rs:41][E: codex-rs/protocol/src/dynamic_tools.rs:43][E: codex-rs/protocol/src/dynamic_tools.rs:45] | `dynamic_tools.rs` |
| `RequestPermissionsArgs` | `{ reason?, permissions }` | `request_permissions` tool input schema payload。[E: codex-rs/protocol/src/request_permissions.rs:50][E: codex-rs/protocol/src/request_permissions.rs:52][E: codex-rs/protocol/src/request_permissions.rs:53] | `request_permissions.rs` |
| `RequestPermissionsResponse` | `{ permissions, scope }` | `request_permissions` response；`scope` defaults through `PermissionGrantScope::Turn`。[E: codex-rs/protocol/src/request_permissions.rs:10][E: codex-rs/protocol/src/request_permissions.rs:13][E: codex-rs/protocol/src/request_permissions.rs:14][E: codex-rs/protocol/src/request_permissions.rs:57][E: codex-rs/protocol/src/request_permissions.rs:58][E: codex-rs/protocol/src/request_permissions.rs:59][E: codex-rs/protocol/src/request_permissions.rs:60] | `request_permissions.rs` |
| `RequestUserInputArgs` | `{ questions }` | `request_user_input` tool input schema payload。[E: codex-rs/protocol/src/request_user_input.rs:32][E: codex-rs/protocol/src/request_user_input.rs:33] | `request_user_input.rs` |
| `RequestUserInputQuestion` | `{ id, header, question, isOther, isSecret, options? }` | 单个用户问题，支持 "other" 和 secret 标志；Rust 字段 `is_other`/`is_secret` 在 serde/schemars/TS 上分别重命名为 `isOther`/`isSecret`。[E: codex-rs/protocol/src/request_user_input.rs:15][E: codex-rs/protocol/src/request_user_input.rs:16][E: codex-rs/protocol/src/request_user_input.rs:17][E: codex-rs/protocol/src/request_user_input.rs:18][E: codex-rs/protocol/src/request_user_input.rs:19][E: codex-rs/protocol/src/request_user_input.rs:20][E: codex-rs/protocol/src/request_user_input.rs:21][E: codex-rs/protocol/src/request_user_input.rs:22][E: codex-rs/protocol/src/request_user_input.rs:23][E: codex-rs/protocol/src/request_user_input.rs:24][E: codex-rs/protocol/src/request_user_input.rs:25][E: codex-rs/protocol/src/request_user_input.rs:26][E: codex-rs/protocol/src/request_user_input.rs:28] | `request_user_input.rs` |
| `RequestUserInputResponse` | `{ answers: HashMap<String, RequestUserInputAnswer> }` | answer map keyed by `String`；每个 answer 是 `Vec<String>`。[E: codex-rs/protocol/src/request_user_input.rs:42][E: codex-rs/protocol/src/request_user_input.rs:43][E: codex-rs/protocol/src/request_user_input.rs:37][E: codex-rs/protocol/src/request_user_input.rs:38] | `request_user_input.rs` |
| `UpdatePlanArgs` | `{ explanation?, plan: Vec<PlanItemArg> }` | `update_plan` TODO/checklist tool argument model。[E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/plan_tool.rs:25][E: codex-rs/protocol/src/plan_tool.rs:27][E: codex-rs/protocol/src/plan_tool.rs:28] | `plan_tool.rs` |
| `StepStatus` | enum | `Pending`, `InProgress`, `Completed`。[E: codex-rs/protocol/src/plan_tool.rs:9][E: codex-rs/protocol/src/plan_tool.rs:10][E: codex-rs/protocol/src/plan_tool.rs:11][E: codex-rs/protocol/src/plan_tool.rs:12] | `plan_tool.rs` |

## Persistence / rollout model

| Symbol | 签名/字段 | 含义 | 定义处 |
|---|---|---|---|
| `SessionMeta` | struct | `id`, `forked_from_id?`, `timestamp`, `cwd`, `originator`, `cli_version`, `source`, subagent nickname/role/path, `model_provider`, `base_instructions`, `dynamic_tools`, `memory_mode` | session metadata persisted in rollout; default fills empty strings/paths/options and `ThreadId::default()`，后者调用 `ThreadId::new()`。[E: codex-rs/protocol/src/protocol.rs:2802][E: codex-rs/protocol/src/protocol.rs:2803][E: codex-rs/protocol/src/protocol.rs:2805][E: codex-rs/protocol/src/protocol.rs:2806][E: codex-rs/protocol/src/protocol.rs:2807][E: codex-rs/protocol/src/protocol.rs:2808][E: codex-rs/protocol/src/protocol.rs:2809][E: codex-rs/protocol/src/protocol.rs:2811][E: codex-rs/protocol/src/protocol.rs:2814][E: codex-rs/protocol/src/protocol.rs:2817][E: codex-rs/protocol/src/protocol.rs:2820][E: codex-rs/protocol/src/protocol.rs:2821][E: codex-rs/protocol/src/protocol.rs:2825][E: codex-rs/protocol/src/protocol.rs:2827][E: codex-rs/protocol/src/protocol.rs:2829][E: codex-rs/protocol/src/protocol.rs:2835][E: codex-rs/protocol/src/protocol.rs:2836][E: codex-rs/protocol/src/protocol.rs:2837][E: codex-rs/protocol/src/protocol.rs:2838][E: codex-rs/protocol/src/protocol.rs:2839][E: codex-rs/protocol/src/protocol.rs:2840][E: codex-rs/protocol/src/protocol.rs:2841][E: codex-rs/protocol/src/protocol.rs:2842][E: codex-rs/protocol/src/protocol.rs:2843][E: codex-rs/protocol/src/protocol.rs:2844][E: codex-rs/protocol/src/protocol.rs:2845][E: codex-rs/protocol/src/protocol.rs:2846][E: codex-rs/protocol/src/protocol.rs:2847][E: codex-rs/protocol/src/protocol.rs:2848][E: codex-rs/protocol/src/protocol.rs:2863][E: codex-rs/protocol/src/protocol.rs:2864][E: codex-rs/protocol/src/thread_id.rs:53][E: codex-rs/protocol/src/thread_id.rs:55] | `protocol.rs` |
| `SessionMetaLine` | struct | flattened `SessionMeta`, optional `GitInfo` | rollout 的 session metadata line 支持附带 git metadata。[E: codex-rs/protocol/src/protocol.rs:2854][E: codex-rs/protocol/src/protocol.rs:2855][E: codex-rs/protocol/src/protocol.rs:2856][E: codex-rs/protocol/src/protocol.rs:2858] | `protocol.rs` |
| `RolloutItem` | tagged enum | `SessionMeta`, `ResponseItem`, `Compacted`, `TurnContext`, `EventMsg` | rollout persistence 的顶层 item union。[E: codex-rs/protocol/src/protocol.rs:2863][E: codex-rs/protocol/src/protocol.rs:2864][E: codex-rs/protocol/src/protocol.rs:2865][E: codex-rs/protocol/src/protocol.rs:2866][E: codex-rs/protocol/src/protocol.rs:2867][E: codex-rs/protocol/src/protocol.rs:2868] | `protocol.rs` |
| `TurnContextItem` | struct | `turn_id?`, `trace_id?`, `cwd`, `current_date?`, `timezone?`, approval/sandbox policy 等 | 持久化 real user turn 的 model-visible context baseline；注释说明 resume/fork replay 依赖它恢复最新 durable baseline。[E: codex-rs/protocol/src/protocol.rs:2898][E: codex-rs/protocol/src/protocol.rs:2899][E: codex-rs/protocol/src/protocol.rs:2900][E: codex-rs/protocol/src/protocol.rs:2901][E: codex-rs/protocol/src/protocol.rs:2903][E: codex-rs/protocol/src/protocol.rs:2905][E: codex-rs/protocol/src/protocol.rs:2907][E: codex-rs/protocol/src/protocol.rs:2908][E: codex-rs/protocol/src/protocol.rs:2910][E: codex-rs/protocol/src/protocol.rs:2912][E: codex-rs/protocol/src/protocol.rs:2913][E: codex-rs/protocol/src/protocol.rs:2914] | `protocol.rs` |

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
