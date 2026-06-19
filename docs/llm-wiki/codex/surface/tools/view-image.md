---
id: tool.view-image
title: view_image 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/view_image_spec.rs, codex-rs/core/src/tools/handlers/view_image.rs, codex-rs/core/src/tools/router.rs, codex-rs/tools/src/image_detail.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/openai_models.rs]
symbols: [add_core_utility_tools, create_view_image_tool, ViewImageToolOptions, ViewImageHandler, ViewImageOutput, can_request_original_image_detail, VIEW_IMAGE_TOOL_NAME, ImageDetail]
related: [subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 5670360009
---

> `view_image` 是 Codex 的本地图片读取 function tool：模型传本地 `path`，handler 按选中 environment cwd 读 metadata 和 file bytes，处理成 data URL，并把结果作为 Responses API `input_image` content item 返回给模型。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:41][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:47][E: codex-rs/core/src/tools/handlers/view_image.rs:121][E: codex-rs/core/src/tools/handlers/view_image.rs:162][E: codex-rs/core/src/tools/handlers/view_image.rs:178][E: codex-rs/core/src/tools/handlers/view_image.rs:224][E: codex-rs/core/src/tools/handlers/view_image.rs:249]

## 能回答的问题

- `view_image` 的 wire name、ToolSpec 类型和 schema 字段是什么?
- `detail` 字段何时出现在 schema 中，runtime 又接受哪些值?
- handler 如何检查模型 image input 能力和 original detail 能力?
- path 如何相对 environment cwd 解析并受 sandbox context 约束?
- 输出为什么是 `input_image` content item?
- 它是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `ViewImageHandler::tool_name()` 返回 plain `"view_image"`；schema constructor 使用 `VIEW_IMAGE_TOOL_NAME`，协议常量值也是 `"view_image"`。[E: codex-rs/core/src/tools/handlers/view_image.rs:70][E: codex-rs/core/src/tools/handlers/view_image.rs:72][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:41][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:42][E: codex-rs/protocol/src/models.rs:1375] |
| concrete handler | `ViewImageHandler` 保存 `ViewImageToolOptions`；`spec()` 调用 `create_view_image_tool(self.options)`。[E: codex-rs/core/src/tools/handlers/view_image.rs:32][E: codex-rs/core/src/tools/handlers/view_image.rs:33][E: codex-rs/core/src/tools/handlers/view_image.rs:47][E: codex-rs/core/src/tools/handlers/view_image.rs:75][E: codex-rs/core/src/tools/handlers/view_image.rs:76] |
| ToolSpec | `create_view_image_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`，并声明 `output_schema: Some(view_image_output_schema())`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:15][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:41][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:48][E: codex-rs/tools/src/tool_spec.rs:17][E: codex-rs/tools/src/tool_spec.rs:19] |
| handler exposure | handler 未覆盖 `exposure()`，因此使用 `ToolExecutor` 默认 Direct。[E: codex-rs/core/src/tools/handlers/view_image.rs:70][E: codex-rs/core/src/tools/handlers/view_image.rs:83][E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:56] |

## 2 用途定位

`view_image` 用于图片已经存在于可访问文件系统上、需要视觉检查的场景。它不是简单返回路径或文本摘要，而是把图片编码进 `FunctionCallOutputContentItem::InputImage`，让下一步模型直接接收视觉输入。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:43][E: codex-rs/core/src/tools/handlers/view_image.rs:247][E: codex-rs/core/src/tools/handlers/view_image.rs:249][E: codex-rs/protocol/src/models.rs:1723][E: codex-rs/protocol/src/models.rs:1729][E: codex-rs/protocol/src/models.rs:1733]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `path` | string | 是 | 无 | schema 固定包含 `path`，required 只包含 `path`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:16][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:18][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:47] | handler 将 `path` join 到选中 environment cwd，再通过 environment filesystem 读取 metadata 与 bytes。[E: codex-rs/core/src/tools/handlers/view_image.rs:121][E: codex-rs/core/src/tools/handlers/view_image.rs:148][E: codex-rs/core/src/tools/handlers/view_image.rs:154][E: codex-rs/core/src/tools/handlers/view_image.rs:162][E: codex-rs/core/src/tools/handlers/view_image.rs:178] |
| `detail` | enum string | 否 | `high` | 只有 `can_request_original_image_detail` 为 true 时 schema 才插入；schema enum 是 `high` 和 `original`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:20][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:23][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:24][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:26] | runtime 显式接受省略、`high`、`original`；其它字符串报错。只有模型能力允许且请求 original 时才保留原图细节。[E: codex-rs/core/src/tools/handlers/view_image.rs:128][E: codex-rs/core/src/tools/handlers/view_image.rs:130][E: codex-rs/core/src/tools/handlers/view_image.rs:131][E: codex-rs/core/src/tools/handlers/view_image.rs:133][E: codex-rs/core/src/tools/handlers/view_image.rs:189][E: codex-rs/core/src/tools/handlers/view_image.rs:191] |
| `environment_id` | string | 否 | primary environment | multiple environment 时 schema 插入 environment id 字段。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:31][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:33][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:35] | handler 解析 optional environment id 并调用 `resolve_tool_environment`；无环境时报 `view_image is unavailable in this session`。[E: codex-rs/core/src/tools/handlers/view_image.rs:57][E: codex-rs/core/src/tools/handlers/view_image.rs:60][E: codex-rs/core/src/tools/handlers/view_image.rs:139][E: codex-rs/core/src/tools/handlers/view_image.rs:143] |

`parameters` 关闭 additional properties；`output_schema` 的 object 也关闭 additional properties。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:47][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:52][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:67]

## 4 输出

schema output 是 object，字段为 `image_url` 和 `detail`，二者都 required；`detail` enum 是 `high` / `original`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:52][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:56][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:60][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:62][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:66]

普通 tool response item 是 `FunctionCallOutputBody::ContentItems(vec![InputImage { image_url, detail }])`，外层 success 为 true；code-mode nested result 则返回 JSON object `{ image_url, detail }`。[E: codex-rs/core/src/tools/handlers/view_image.rs:247][E: codex-rs/core/src/tools/handlers/view_image.rs:249][E: codex-rs/core/src/tools/handlers/view_image.rs:251][E: codex-rs/core/src/tools/handlers/view_image.rs:253][E: codex-rs/core/src/tools/handlers/view_image.rs:255][E: codex-rs/core/src/tools/handlers/view_image.rs:264][E: codex-rs/core/src/tools/handlers/view_image.rs:265]

## 5 注册与门控

`add_core_utility_tools` 在任何有 environment 的 turn 中注册 `ViewImageHandler`，并把 options 设置为当前模型是否可请求 original detail、以及是否需要 `environment_id` 字段。[E: codex-rs/core/src/tools/spec_plan.rs:689][E: codex-rs/core/src/tools/spec_plan.rs:749][E: codex-rs/core/src/tools/spec_plan.rs:750][E: codex-rs/core/src/tools/spec_plan.rs:751][E: codex-rs/core/src/tools/spec_plan.rs:752][E: codex-rs/core/src/tools/spec_plan.rs:755]

original detail 能力来自 `can_request_original_image_detail(&turn_context.model_info)`，该 helper 当前直接读取 `ModelInfo.supports_image_detail_original`。[E: codex-rs/core/src/tools/spec_plan.rs:752][E: codex-rs/core/src/tools/spec_plan.rs:753][E: codex-rs/tools/src/image_detail.rs:6][E: codex-rs/tools/src/image_detail.rs:7][E: codex-rs/protocol/src/openai_models.rs:379][E: codex-rs/protocol/src/openai_models.rs:381]

handler 还有 runtime gate：当前模型的 `input_modalities` 必须包含 `InputModality::Image`，否则直接拒绝。[E: codex-rs/core/src/tools/handlers/view_image.rs:93][E: codex-rs/core/src/tools/handlers/view_image.rs:96][E: codex-rs/core/src/tools/handlers/view_image.rs:97][E: codex-rs/core/src/tools/handlers/view_image.rs:99]

## 6 parallel support

`ViewImageHandler::supports_parallel_tool_calls()` 返回 true，因此 router 可把它视为 parallel-safe。[E: codex-rs/core/src/tools/handlers/view_image.rs:79][E: codex-rs/core/src/tools/handlers/view_image.rs:80][E: codex-rs/core/src/tools/router.rs:100][E: codex-rs/core/src/tools/router.rs:102]

## 7 handler 走读

1. handler 先检查模型是否支持 image input；不支持时返回固定 unsupported message。[E: codex-rs/core/src/tools/handlers/view_image.rs:53][E: codex-rs/core/src/tools/handlers/view_image.rs:93][E: codex-rs/core/src/tools/handlers/view_image.rs:99]
2. 它只接受 `ToolPayload::Function { arguments }`，然后解析成 `ViewImageArgs { path, environment_id, detail }`。[E: codex-rs/core/src/tools/handlers/view_image.rs:112][E: codex-rs/core/src/tools/handlers/view_image.rs:113][E: codex-rs/core/src/tools/handlers/view_image.rs:121]
3. detail parsing 允许省略、`high` 和 `original`；默认 resized path 的显式拼写是 `high`。[E: codex-rs/core/src/tools/handlers/view_image.rs:126][E: codex-rs/core/src/tools/handlers/view_image.rs:128][E: codex-rs/core/src/tools/handlers/view_image.rs:130][E: codex-rs/core/src/tools/handlers/view_image.rs:131]
4. 它选择 environment，要求 cwd host-native，构造 sandbox context 与 `PathUri`，再读取 metadata；非文件 path 会被拒绝。[E: codex-rs/core/src/tools/handlers/view_image.rs:139][E: codex-rs/core/src/tools/handlers/view_image.rs:148][E: codex-rs/core/src/tools/handlers/view_image.rs:155][E: codex-rs/core/src/tools/handlers/view_image.rs:160][E: codex-rs/core/src/tools/handlers/view_image.rs:162][E: codex-rs/core/src/tools/handlers/view_image.rs:172]
5. 读取 bytes 后，如果 `Feature::ResizeAllImages` 开启，返回 octet-stream data URL，让 history insertion path 负责解码/resize；否则按 original/detail 能力选择 `PromptImageMode::Original` 或 `ResizeToFit`。[E: codex-rs/core/src/tools/handlers/view_image.rs:178][E: codex-rs/core/src/tools/handlers/view_image.rs:198][E: codex-rs/core/src/tools/handlers/view_image.rs:200][E: codex-rs/core/src/tools/handlers/view_image.rs:202][E: codex-rs/core/src/tools/handlers/view_image.rs:205][E: codex-rs/core/src/tools/handlers/view_image.rs:207]
6. default detail 是协议常量 `ImageDetail::High`；只有 original 能力和请求同时满足时，输出 detail 才是 `ImageDetail::Original`。[E: codex-rs/protocol/src/models.rs:882][E: codex-rs/protocol/src/models.rs:886][E: codex-rs/protocol/src/models.rs:889][E: codex-rs/core/src/tools/handlers/view_image.rs:189][E: codex-rs/core/src/tools/handlers/view_image.rs:192][E: codex-rs/core/src/tools/handlers/view_image.rs:195]
7. handler 发出 `ImageViewItem` 的 started/completed events，然后返回 `ViewImageOutput`。[E: codex-rs/core/src/tools/handlers/view_image.rs:217][E: codex-rs/core/src/tools/handlers/view_image.rs:221][E: codex-rs/core/src/tools/handlers/view_image.rs:222][E: codex-rs/core/src/tools/handlers/view_image.rs:224]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/view_image_spec.rs`
- `codex-rs/core/src/tools/handlers/view_image.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/tools/src/image_detail.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/openai_models.rs`

## 相关

- [工具系统](../../subsystems/core/tool-system.md) — ToolSpec 与 handler runtime 注册。
- [工具路由](../../subsystems/core/tool-router.md) — function payload、parallel support 和 response item 路由。
