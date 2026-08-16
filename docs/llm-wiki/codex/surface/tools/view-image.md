---
id: tool.view-image
title: view_image 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/view_image_spec.rs, codex-rs/core/src/tools/handlers/view_image.rs, codex-rs/core/src/tools/router.rs, codex-rs/core/src/image_preparation.rs, codex-rs/tools/src/image_detail.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/features/src/lib.rs]
symbols: [create_view_image_tool, ViewImageToolOptions, ViewImageHandler, ViewImageOutput, can_request_original_image_detail, unified_image_budget_enabled, VIEW_IMAGE_TOOL_NAME]
related: [subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `view_image` 是 Codex 的本地图片读取 function tool：模型传本地 `path`，handler 按选中 environment cwd 读 metadata 和 file bytes，处理成 data URL，并把结果作为 Responses API `input_image` content item 返回给模型。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:42][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:48][E: codex-rs/core/src/tools/handlers/view_image.rs:122][E: codex-rs/core/src/tools/handlers/view_image.rs:156][E: codex-rs/core/src/tools/handlers/view_image.rs:170][E: codex-rs/core/src/tools/handlers/view_image.rs:194][E: codex-rs/core/src/tools/handlers/view_image.rs:230]

## 能回答的问题

- `view_image` 的 wire name、ToolSpec 类型和 schema 字段是什么?
- `detail` 字段何时出现在 schema 中，runtime 又接受哪些值?
- `unified_image_budget` 如何改变 schema、输出和 default detail?
- handler 如何检查模型 image input 能力和 original detail 能力?
- path 如何相对 environment cwd 解析并受 sandbox context 约束?
- Guardian reviewer 为什么也能看到它?
- 输出为什么是 `input_image` content item?
- 它是否支持 parallel tool calls?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `ViewImageHandler::tool_name()` 返回 plain `"view_image"`；schema constructor 使用 `VIEW_IMAGE_TOOL_NAME`，协议常量值也是 `"view_image"`。[E: codex-rs/core/src/tools/handlers/view_image.rs:70][E: codex-rs/core/src/tools/handlers/view_image.rs:71][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:43][E: codex-rs/protocol/src/models.rs:1462] |
| concrete handler | `ViewImageHandler` 保存 `ViewImageToolOptions`；`spec()` 调用 `create_view_image_tool(self.options)`。[E: codex-rs/core/src/tools/handlers/view_image.rs:28][E: codex-rs/core/src/tools/handlers/view_image.rs:29][E: codex-rs/core/src/tools/handlers/view_image.rs:74][E: codex-rs/core/src/tools/handlers/view_image.rs:75] |
| ToolSpec | `create_view_image_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`，并声明 `output_schema: Some(view_image_output_schema(options))`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:16][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:42][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:49] |
| handler exposure | handler 未覆盖 `exposure()`，因此使用 `ToolExecutor` 默认 Direct。[E: codex-rs/core/src/tools/handlers/view_image.rs:69][E: codex-rs/tools/src/tool_executor.rs:113][E: codex-rs/tools/src/tool_executor.rs:114] |

`ViewImageToolOptions` 现在有三个字段：`can_request_original_image_detail`、`unified_image_budget`、`include_environment_id`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:10][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:11][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:12][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:13]

## 2 用途定位

`view_image` 用于图片已经存在于可访问文件系统上、需要视觉检查的场景。它不是简单返回路径或文本摘要，而是把图片编码进 `FunctionCallOutputContentItem::InputImage`，让下一步模型直接接收视觉输入。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:44][E: codex-rs/core/src/tools/handlers/view_image.rs:228][E: codex-rs/core/src/tools/handlers/view_image.rs:230][E: codex-rs/protocol/src/models.rs:1917][E: codex-rs/protocol/src/models.rs:1918][E: codex-rs/protocol/src/models.rs:1921]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `path` | string | 是 | 无 | schema 固定包含 `path`，required 只包含 `path`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:18][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:19][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:48] | handler 将 `path` join 到选中 environment cwd，再通过 environment filesystem 读取 metadata 与 bytes。[E: codex-rs/core/src/tools/handlers/view_image.rs:122][E: codex-rs/core/src/tools/handlers/view_image.rs:145][E: codex-rs/core/src/tools/handlers/view_image.rs:156][E: codex-rs/core/src/tools/handlers/view_image.rs:170] |
| `detail` | enum string | 否 | `high` | 只有 `can_request_original_image_detail && !unified_image_budget` 时 schema 才插入；schema enum 是 `high` 和 `original`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:21][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:23][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:25] | runtime 仍显式接受省略、`high`、`original`，即使 schema 已隐藏该字段；其它字符串报错。unified budget 开启时直接使用 Original。[E: codex-rs/core/src/tools/handlers/view_image.rs:127][E: codex-rs/core/src/tools/handlers/view_image.rs:127][E: codex-rs/core/src/tools/handlers/view_image.rs:129][E: codex-rs/core/src/tools/handlers/view_image.rs:130][E: codex-rs/core/src/tools/handlers/view_image.rs:185][E: codex-rs/core/src/tools/handlers/view_image.rs:186] |
| `environment_id` | string | 否 | primary environment | multiple environment 时 schema 插入 environment id 字段。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:32][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:33][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:35] | handler 解析 optional environment id 并调用 `resolve_tool_environment`；无环境时报 `view_image is unavailable in this session`。[E: codex-rs/core/src/tools/handlers/view_image.rs:123][E: codex-rs/core/src/tools/handlers/view_image.rs:138][E: codex-rs/core/src/tools/handlers/view_image.rs:141] |

`parameters` 关闭 additional properties；`output_schema` 的 object 也关闭 additional properties。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:48][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:63]

## 4 输出

默认 output schema 只有 required `image_url`。`unified_image_budget` 关闭时才追加 required `detail` enum `high` / `original`。[E: codex-rs/core/src/tools/handlers/view_image_spec.rs:54][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:62][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:65][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:67][E: codex-rs/core/src/tools/handlers/view_image_spec.rs:71]

普通 tool response item 是 `FunctionCallOutputBody::ContentItems(vec![InputImage { image_url, detail }])`，外层 success 为 true；code-mode nested result 在 unified budget 下只返回 `{ image_url }`，否则返回 `{ image_url, detail }`。[E: codex-rs/core/src/tools/handlers/view_image.rs:228][E: codex-rs/core/src/tools/handlers/view_image.rs:230][E: codex-rs/core/src/tools/handlers/view_image.rs:232][E: codex-rs/core/src/tools/handlers/view_image.rs:236][E: codex-rs/core/src/tools/handlers/view_image.rs:245][E: codex-rs/core/src/tools/handlers/view_image.rs:247][E: codex-rs/core/src/tools/handlers/view_image.rs:250]

## 5 注册与门控

`add_core_utility_tools` 只在 turn 有 environment 且 `Feature::ViewImage` 开启时注册 `ViewImageHandler`。`Feature::ViewImage` 是 Stable，默认开启。[E: codex-rs/core/src/tools/spec_plan.rs:1116][E: codex-rs/core/src/tools/spec_plan.rs:1118][E: codex-rs/features/src/lib.rs:826][E: codex-rs/features/src/lib.rs:829]

Guardian reviewer 路径也会在 Managed sandbox、有 environment 且 `Feature::ViewImage` 开启时注册同一个 handler；options 同样携带 `include_environment_id` 和 `unified_image_budget`。[E: codex-rs/core/src/tools/spec_plan.rs:896][E: codex-rs/core/src/tools/spec_plan.rs:905][E: codex-rs/core/src/tools/spec_plan.rs:917][E: codex-rs/core/src/tools/spec_plan.rs:918][E: codex-rs/core/src/tools/spec_plan.rs:926]

`include_environment_id` 在 `ToolEnvironmentMode::Multiple` 时为 true。[E: codex-rs/core/src/tools/spec_plan.rs:906][E: codex-rs/core/src/tools/spec_plan.rs:1117][E: codex-rs/core/src/tools/spec_plan.rs:1126]

`unified_image_budget` 来自 `unified_image_budget_enabled`：需要 `Feature::UnifiedImageBudget`，并且模型是 responses lite 或支持 original detail。[E: codex-rs/core/src/image_preparation.rs:44][E: codex-rs/core/src/image_preparation.rs:48][E: codex-rs/core/src/image_preparation.rs:49][E: codex-rs/core/src/tools/spec_plan.rs:1122][E: codex-rs/features/src/lib.rs:1274][E: codex-rs/features/src/lib.rs:1277]

original detail 能力来自 `can_request_original_image_detail(&turn_context.model_info)`，该 helper 当前直接读取 `ModelInfo.supports_image_detail_original`。[E: codex-rs/core/src/tools/spec_plan.rs:1119][E: codex-rs/tools/src/image_detail.rs:6][E: codex-rs/tools/src/image_detail.rs:7][E: codex-rs/protocol/src/openai_models.rs:424]

handler 还有 runtime gate：当前模型的 `input_modalities` 必须包含 `InputModality::Image`，否则直接拒绝。[E: codex-rs/core/src/tools/handlers/view_image.rs:92][E: codex-rs/core/src/tools/handlers/view_image.rs:96][E: codex-rs/core/src/tools/handlers/view_image.rs:98]

## 6 parallel support

`ViewImageHandler::supports_parallel_tool_calls()` 返回 true，因此 router 可把它视为 parallel-safe。[E: codex-rs/core/src/tools/handlers/view_image.rs:78][E: codex-rs/core/src/tools/handlers/view_image.rs:79][E: codex-rs/core/src/tools/router.rs:137][E: codex-rs/core/src/tools/router.rs:139]

## 7 handler 走读

1. handler 先检查模型是否支持 image input；不支持时返回固定 unsupported message。[E: codex-rs/core/src/tools/handlers/view_image.rs:92][E: codex-rs/core/src/tools/handlers/view_image.rs:98]
2. 它只接受 `ToolPayload::Function { arguments }`，然后解析成 `ViewImageArgs { path, environment_id, detail }`。[E: codex-rs/core/src/tools/handlers/view_image.rs:112][E: codex-rs/core/src/tools/handlers/view_image.rs:113][E: codex-rs/core/src/tools/handlers/view_image.rs:121]
3. detail parsing 允许省略、`high` 和 `original`，其它字符串会返回 model-facing error。[E: codex-rs/core/src/tools/handlers/view_image.rs:127][E: codex-rs/core/src/tools/handlers/view_image.rs:129][E: codex-rs/core/src/tools/handlers/view_image.rs:130][E: codex-rs/core/src/tools/handlers/view_image.rs:132]
4. 它选择 environment，将 `path` 相对 environment cwd 解析为 `PathUri`，构造 sandbox context 后读取 metadata；非文件 path 会被拒绝。[E: codex-rs/core/src/tools/handlers/view_image.rs:138][E: codex-rs/core/src/tools/handlers/view_image.rs:145][E: codex-rs/core/src/tools/handlers/view_image.rs:156][E: codex-rs/core/src/tools/handlers/view_image.rs:165]
5. 读取 bytes 后，handler 先用 `image::load_from_memory` 拒绝非图片；再生成 `application/octet-stream` data URL。[E: codex-rs/core/src/tools/handlers/view_image.rs:170][E: codex-rs/core/src/tools/handlers/view_image.rs:180][E: codex-rs/core/src/tools/handlers/view_image.rs:194]
6. default detail 是协议常量 `ImageDetail::High`；unified budget 开启，或 original 能力和请求同时满足时，输出 detail 才是 `ImageDetail::Original`。[E: codex-rs/protocol/src/models.rs:792][E: codex-rs/core/src/tools/handlers/view_image.rs:185][E: codex-rs/core/src/tools/handlers/view_image.rs:187][E: codex-rs/core/src/tools/handlers/view_image.rs:190]
7. handler 发出 `ImageViewItem` 的 started/completed events，然后返回 `ViewImageOutput`。[E: codex-rs/core/src/tools/handlers/view_image.rs:196][E: codex-rs/core/src/tools/handlers/view_image.rs:200][E: codex-rs/core/src/tools/handlers/view_image.rs:201][E: codex-rs/core/src/tools/handlers/view_image.rs:203]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/view_image_spec.rs`
- `codex-rs/core/src/tools/handlers/view_image.rs`
- `codex-rs/core/src/tools/router.rs`
- `codex-rs/core/src/image_preparation.rs`
- `codex-rs/tools/src/image_detail.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [工具系统](../../subsystems/core/tool-system.md) — ToolSpec 与 handler runtime 注册。
- [工具路由](../../subsystems/core/tool-router.md) — function payload、parallel support 和 response item 路由。
