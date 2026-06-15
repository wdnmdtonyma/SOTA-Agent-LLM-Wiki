---
id: tool.view-image
title: view_image 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/view_image.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/tools/src/tool_config.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/registry.rs, codex-rs/core/src/tools/handlers/view_image.rs]
symbols: [create_view_image_tool, ViewImageToolOptions, ToolHandlerKind::ViewImage, ViewImageHandler, ViewImageOutput]
related: [subsys.core.tool-system, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `view_image` 把本地图片文件读入模型上下文。它是 function tool，输入本地 path，可选 `detail: "original"` 只在模型支持 original image detail 时出现在 schema 中。[E: codex-rs/tools/src/view_image.rs:28][E: codex-rs/tools/src/view_image.rs:34][E: codex-rs/core/src/tools/handlers/view_image.rs:185][E: codex-rs/tools/src/view_image.rs:19]

## 能回答的问题

- `view_image` 的 wire name 与 schema 字段如何由 model capability 变化?
- handler 如何校验模型是否支持 image input?
- `detail: "original"` 与默认 resize-to-fit 的运行时差异是什么?
- 输出为什么是 `input_image` content item，而不是普通文本?
- `view_image` 是否 parallel-safe?

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `view_image`; constructor 使用 `VIEW_IMAGE_TOOL_NAME` 作为 `ResponsesApiTool.name`，protocol 常量值是 `"view_image"`。[E: codex-rs/tools/src/view_image.rs:29][E: codex-rs/protocol/src/models.rs:690] |
| aliases | registry plan 注册 `"view_image"` 到 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:389] |
| ToolHandlerKind | `ToolHandlerKind::ViewImage` 是 registry plan 的 handler kind。[E: codex-rs/tools/src/tool_registry_plan_types.rs:41] |
| concrete handler | `core/src/tools/spec.rs` 把 `ToolHandlerKind::ViewImage` 注册为 `ViewImageHandler`。[E: codex-rs/core/src/tools/spec.rs:284][E: codex-rs/core/src/tools/spec.rs:285] |
| 所属 crate | schema 在 `codex_tools::view_image`; handler 在 `codex_core::tools::handlers::view_image`。[E: codex-rs/tools/src/view_image.rs:14][E: codex-rs/core/src/tools/handlers/view_image.rs:23] |

## 2 用途定位

`view_image` 用于从本地 filesystem path 加载图片，并把图片以 data URL 形式作为 `input_image` 返回给模型。[E: codex-rs/core/src/tools/handlers/view_image.rs:90][E: codex-rs/core/src/tools/handlers/view_image.rs:117][E: codex-rs/core/src/tools/handlers/view_image.rs:150][E: codex-rs/core/src/tools/handlers/view_image.rs:185] 该工具的 schema 描述限制它只应在用户给出 full filepath 且图片没有已经附加在 thread context 时使用。[E: codex-rs/tools/src/view_image.rs:30]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/运行时 |
|---|---|---:|---|---|---|
| `path` | `string` | 是 | 无 | schema 描述为本地图片文件路径。[E: codex-rs/tools/src/view_image.rs:16][E: codex-rs/tools/src/view_image.rs:17] | handler 用 `turn.resolve_path` 解析 path，然后通过 environment filesystem 读取 metadata 与 file bytes。[E: codex-rs/core/src/tools/handlers/view_image.rs:90][E: codex-rs/core/src/tools/handlers/view_image.rs:100][E: codex-rs/core/src/tools/handlers/view_image.rs:117] |
| `detail` | `string` | 否 | default resized behavior | 只有 `ViewImageToolOptions.can_request_original_image_detail` 为 true 时 schema 才插入 `detail` 字段。[E: codex-rs/tools/src/view_image.rs:19][E: codex-rs/tools/src/view_image.rs:21] | handler 只接受省略或 `"original"`；其他字符串返回错误。[E: codex-rs/core/src/tools/handlers/view_image.rs:80][E: codex-rs/core/src/tools/handlers/view_image.rs:85] |

`create_view_image_tool` 的 required 列表只包含 `path`，`additionalProperties` 为 false。[E: codex-rs/tools/src/view_image.rs:34]

## 4 输出

`view_image` 声明了 output schema，object properties 包括 `image_url` 和 `detail`，两者都在 required 列表中，且 `additionalProperties` 为 false。[E: codex-rs/tools/src/view_image.rs:43][E: codex-rs/tools/src/view_image.rs:47][E: codex-rs/tools/src/view_image.rs:52][E: codex-rs/tools/src/view_image.rs:53]

实际 response item 不是普通文本，而是 `FunctionCallOutputContentItem::InputImage { image_url, detail }`，外层 success 为 true。[E: codex-rs/core/src/tools/handlers/view_image.rs:185][E: codex-rs/core/src/tools/handlers/view_image.rs:187][E: codex-rs/core/src/tools/handlers/view_image.rs:191] code-mode nested call 的 `code_mode_result` 则返回 JSON object，字段为 `image_url` 与 `detail`。[E: codex-rs/core/src/tools/handlers/view_image.rs:201][E: codex-rs/core/src/tools/handlers/view_image.rs:203]

## 5 ToolSpec 类型

`view_image` 是 `ToolSpec::Function(ResponsesApiTool)`，因为它用 JSON object 参数描述本地 path 和可选 detail，并声明 output schema。[E: codex-rs/tools/src/view_image.rs:28][E: codex-rs/tools/src/view_image.rs:34][E: codex-rs/tools/src/view_image.rs:35] Function shape 让 handler 可以在运行前拒绝 unsupported payload，只接受 `ToolPayload::Function`。[E: codex-rs/core/src/tools/handlers/view_image.rs:67][E: codex-rs/core/src/tools/handlers/view_image.rs:70]

## 6 注册与门控

`view_image` 只要求 `config.has_environment` 为 true，即所有有 environment 的 turn 都会推入 spec 并注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:381][E: codex-rs/tools/src/tool_registry_plan.rs:382][E: codex-rs/tools/src/tool_registry_plan.rs:389] 但 handler 还会在运行时检查当前 model 的 `input_modalities` 是否包含 `InputModality::Image`，否则返回 `VIEW_IMAGE_UNSUPPORTED_MESSAGE`。[E: codex-rs/core/src/tools/handlers/view_image.rs:25][E: codex-rs/core/src/tools/handlers/view_image.rs:51][E: codex-rs/core/src/tools/handlers/view_image.rs:54]

`detail` 字段由 `config.can_request_original_image_detail` 控制，`ToolsConfig::new` 用 `can_request_original_image_detail(model_info)` 计算该值。[E: codex-rs/tools/src/tool_registry_plan.rs:383][E: codex-rs/tools/src/tool_registry_plan.rs:384][E: codex-rs/tools/src/tool_config.rs:156][E: codex-rs/tools/src/tool_config.rs:225] `ModelInfo` 里有 `supports_image_detail_original` 字段参与这个能力判断。[E: codex-rs/protocol/src/openai_models.rs:276][E: codex-rs/protocol/src/openai_models.rs:277]

## 7 parallel-safe

`view_image` 的 plan-level `supports_parallel_tool_calls` 是 true。[E: codex-rs/tools/src/tool_registry_plan.rs:382][E: codex-rs/tools/src/tool_registry_plan.rs:386] handler 没有覆盖 `is_mutating`，因此使用 trait 默认 false。[E: codex-rs/core/src/tools/registry.rs:53][E: codex-rs/core/src/tools/registry.rs:57] 多个图片读取可以并行，但仍会分别触发 filesystem read 与 image processing。[I]

## 8 handler 走读

1. handler 先检查 model 是否支持 image input，不支持则拒绝。[E: codex-rs/core/src/tools/handlers/view_image.rs:51][E: codex-rs/core/src/tools/handlers/view_image.rs:53]
2. handler 只接受 function payload，并把 JSON arguments 解析成 `ViewImageArgs { path, detail }`。[E: codex-rs/core/src/tools/handlers/view_image.rs:67][E: codex-rs/core/src/tools/handlers/view_image.rs:75]
3. `detail` 只允许缺省或 `"original"`。[E: codex-rs/core/src/tools/handlers/view_image.rs:81][E: codex-rs/core/src/tools/handlers/view_image.rs:82]
4. handler 解析绝对路径，要求 turn environment 存在，并在 remote environment 时构造 sandbox context。[E: codex-rs/core/src/tools/handlers/view_image.rs:90][E: codex-rs/core/src/tools/handlers/view_image.rs:91][E: codex-rs/core/src/tools/handlers/view_image.rs:97][E: codex-rs/core/src/tools/handlers/view_image.rs:98]
5. handler 读取 metadata，要求目标是文件；随后读取 file bytes。[E: codex-rs/core/src/tools/handlers/view_image.rs:100][E: codex-rs/core/src/tools/handlers/view_image.rs:111][E: codex-rs/core/src/tools/handlers/view_image.rs:117]
6. handler 再次用 `can_request_original_image_detail(&turn.model_info)` 判断 original detail 是否真正可用；只有能力允许且用户传入 original 时才用 `PromptImageMode::Original`。[E: codex-rs/core/src/tools/handlers/view_image.rs:129][E: codex-rs/core/src/tools/handlers/view_image.rs:131][E: codex-rs/core/src/tools/handlers/view_image.rs:133]
7. 默认路径使用 `PromptImageMode::ResizeToFit`，返回 detail 使用 `DEFAULT_IMAGE_DETAIL`。[E: codex-rs/core/src/tools/handlers/view_image.rs:135][E: codex-rs/core/src/tools/handlers/view_image.rs:140]
8. 图片处理为 data URL 后，session 发送 `ViewImageToolCall` event，再返回 `ViewImageOutput`。[E: codex-rs/core/src/tools/handlers/view_image.rs:144][E: codex-rs/core/src/tools/handlers/view_image.rs:150][E: codex-rs/core/src/tools/handlers/view_image.rs:155][E: codex-rs/core/src/tools/handlers/view_image.rs:162]

## 9 设计动机·edge·历史

schema-level `detail` 字段和 runtime-level capability check 都存在:前者减少模型看到不支持字段的概率，后者防止 stale/手写 payload 绕过 schema 直接请求 unsupported original detail。[E: codex-rs/tools/src/view_image.rs:19][E: codex-rs/core/src/tools/handlers/view_image.rs:129][I]

`view_image` 选择把图片作为 `input_image` content item 回给模型，而不是文本里放路径，是因为下一轮模型需要直接视觉输入；`log_preview` 仍使用 data URL 字符串，供日志预览使用。[E: codex-rs/core/src/tools/handlers/view_image.rs:176][E: codex-rs/core/src/tools/handlers/view_image.rs:185][I]

## Sources

- `codex-rs/tools/src/view_image.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/registry.rs`
- `codex-rs/core/src/tools/handlers/view_image.rs`

## 相关

- [工具系统](../../subsystems/core/tool-system.md) — ToolSpec 和 handler 注册机制。
- [工具路由](../../subsystems/core/tool-router.md) — function payload 与 response item 的路由层。
