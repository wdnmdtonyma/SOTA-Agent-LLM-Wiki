---
id: tool.image-generation
title: image_gen.imagegen 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/extension_tools.rs, codex-rs/core/src/image_preparation.rs, codex-rs/ext/image-generation/src/extension.rs, codex-rs/ext/image-generation/src/tool.rs, codex-rs/ext/image-generation/src/backend.rs, codex-rs/ext/image-generation/src/artifact.rs, codex-rs/ext/items/src/image_generation.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/model-provider/src/provider.rs, codex-rs/features/src/lib.rs]
symbols: [ImageGenerationExtension, ImageGenerationTool, ImagegenArgs, imagegen_tool_spec, GeneratedImageOutput, image_generation_artifact_path, image_generation_output_hint, image_generation_available]
related: [spine.extension-system, tool.view-image, tool.web-search, subsys.providers.responses-api, subsys.core.tool-system, subsys.config-auth.auth-flows]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `image_gen.imagegen` 是 image-generation extension 提供的 namespace function tool，既能按 prompt 生成新图，也能用本地路径或 recent conversation images 做编辑。[E: codex-rs/ext/image-generation/src/extension.rs:97][E: codex-rs/ext/image-generation/src/tool.rs:118][E: codex-rs/ext/image-generation/src/tool.rs:318][E: codex-rs/ext/image-generation/src/tool.rs:320]

## 能回答的问题

- `image_gen.imagegen` 的 namespace、function schema 和三个输入字段是什么？
- auth、provider capability、image modality、feature 和 namespace capability 如何共同门控？
- generate 与 edit 怎样由 `referenced_image_paths` / `num_last_images_to_include` 选择？
- `image_resize_notice` / `unified_image_budget` 会不会改写这个工具的 schema？
- 输出图片如何保存并返回？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | namespace `image_gen` / function `imagegen` | executor 返回 `ToolName::namespaced(IMAGE_GEN_NAMESPACE, IMAGEGEN_TOOL_NAME)`。[E: codex-rs/ext/image-generation/src/tool.rs:118] |
| runtime | `ImageGenerationTool` | extension 的 `ToolContributor` 为可用 thread 构造一个 image tool。[E: codex-rs/ext/image-generation/src/extension.rs:85][E: codex-rs/ext/image-generation/src/extension.rs:97] |
| ToolSpec | `ToolSpec::Namespace` 内一个 Function | namespace name 是 `image_gen`；function name 是 `imagegen`，`strict=false`，无 output schema。[E: codex-rs/ext/image-generation/src/tool.rs:528][E: codex-rs/ext/image-generation/src/tool.rs:532][E: codex-rs/ext/image-generation/src/tool.rs:534][E: codex-rs/ext/image-generation/src/tool.rs:537] |
| exposure | `Direct` | executor 显式返回 `ToolExposure::Direct`。[E: codex-rs/ext/image-generation/src/tool.rs:127][E: codex-rs/ext/image-generation/src/tool.rs:128] |
| parallel-safe | `false` | `ImageGenerationTool` 未覆写 `supports_parallel_tool_calls`，trait 默认返回 false。[E: codex-rs/tools/src/tool_executor.rs:122][E: codex-rs/tools/src/tool_executor.rs:123] |

## 2 输入 schema

| 字段 | 类型 | 必填 | 约束与用途 | 证据 |
|---|---|---|---|---|
| `prompt` | string | 是 | 生成或编辑说明。[E: codex-rs/ext/image-generation/src/tool.rs:89] |
| `referenced_image_paths` | absolute path array | 否 | 最多 5 个。[E: codex-rs/ext/image-generation/src/tool.rs:90][E: codex-rs/ext/image-generation/src/tool.rs:91][E: codex-rs/ext/image-generation/src/tool.rs:313] |
| `num_last_images_to_include` | integer | 否 | 1–5；从 conversation history 倒序提取最近图片。[E: codex-rs/ext/image-generation/src/tool.rs:92][E: codex-rs/ext/image-generation/src/tool.rs:93] |

两个 image-source 字段互斥；两者都省略时创建 generate request，有任一 image source 时创建 edit request。两类请求都固定 `gpt-image-2`、auto background/quality/size。[E: codex-rs/ext/image-generation/src/tool.rs:318][E: codex-rs/ext/image-generation/src/tool.rs:320][E: codex-rs/ext/image-generation/src/tool.rs:323]

## 3 注册与门控

extension 在 thread start 和 config change 时缓存 provider/save-root 配置；`config.available` 为 false 时不贡献 runtime。[E: codex-rs/ext/image-generation/src/extension.rs:90][E: codex-rs/ext/image-generation/src/extension.rs:93][E: codex-rs/ext/image-generation/src/extension.rs:97]

core publication 还有更严格的 model-visible gate：

| gate | 要求 | 证据 |
|---|---|---|
| feature | `Feature::ImageGeneration` 开启；key `image_generation`，Stable，默认开启 | [E: codex-rs/core/src/tools/spec_plan.rs:619][E: codex-rs/features/src/lib.rs:1262][E: codex-rs/features/src/lib.rs:1263][E: codex-rs/features/src/lib.rs:1264][E: codex-rs/features/src/lib.rs:1265] |
| account plan | 当前 auth 的 account plan 不是 `Free` | [E: codex-rs/core/src/tools/spec_plan.rs:629][E: codex-rs/core/src/tools/spec_plan.rs:631] |
| provider | `capabilities().image_generation` 且 `namespace_tools` | [E: codex-rs/core/src/tools/spec_plan.rs:635] |
| model | input modalities 含 `Image` | [E: codex-rs/core/src/tools/spec_plan.rs:642] |
| auth | provider 使用 OpenAI actor authorization，或要求 OpenAI auth 且当前 auth 使用 Codex backend | [E: codex-rs/core/src/tools/spec_plan.rs:648][E: codex-rs/core/src/tools/spec_plan.rs:653] |

`append_extension_tool_executors` 对 `image_gen.imagegen` 应用该 gate；未满足就跳过，通过后包装为 extension adapter 并作为 external runtime 注册。[E: codex-rs/core/src/tools/spec_plan.rs:1287][E: codex-rs/core/src/tools/spec_plan.rs:1288][E: codex-rs/core/src/tools/spec_plan.rs:1292]

`Feature::ImageResizeNotice` 与 `Feature::UnifiedImageBudget` 都不参与 imagegen 的注册或 schema。前者仍是 UnderDevelopment、默认关闭；后者同样默认关闭，并只在模型支持 original detail 或 Responses Lite 时生效。session 级 `prepare_response_items` 会在 FunctionCallOutput 图片被 resize 时注入 `<image_resize_notice>`，因此 imagegen 返回的 `input_image` 仍可能经过统一预算/resize notice，但这不是 imagegen handler 自己实现的。[E: codex-rs/features/src/lib.rs:1268][E: codex-rs/features/src/lib.rs:1271][E: codex-rs/features/src/lib.rs:1274][E: codex-rs/features/src/lib.rs:1277][E: codex-rs/core/src/image_preparation.rs:44][E: codex-rs/core/src/image_preparation.rs:48][E: codex-rs/core/src/image_preparation.rs:123][E: codex-rs/core/src/image_preparation.rs:140]

## 4 Handler 走读

1. `handle_call` 解析严格 JSON 参数，按路径或 conversation history 构造 generate/edit request。[E: codex-rs/ext/image-generation/src/tool.rs:139][E: codex-rs/ext/image-generation/src/tool.rs:141]
2. 执行前发布 extension `ImageGenerationItem { status: in_progress }`，并附带 legacy `ImageGenerationBegin`。[E: codex-rs/ext/image-generation/src/tool.rs:147][E: codex-rs/ext/image-generation/src/tool.rs:154]
3. generate/edit 走 backend；失败时记录 usage-limit failure（`limit_id == "image_gen"`），成功时保存 PNG 并发布 completed item。[E: codex-rs/ext/image-generation/src/tool.rs:160][E: codex-rs/ext/image-generation/src/tool.rs:257][E: codex-rs/ext/image-generation/src/tool.rs:277]
4. artifact 默认路径为 `generated_images/<sanitized-session>/<sanitized-call>.png`。[E: codex-rs/ext/image-generation/src/artifact.rs:5][E: codex-rs/ext/image-generation/src/artifact.rs:31]

## 5 输出与事件

direct tool output 是带 `data:image/png;base64,...` 的 `InputImage`，保存成功时再附一段 output hint。hint 最多 1,024 bytes，明确告诉模型图片已直接展示给用户。[E: codex-rs/ext/image-generation/src/artifact.rs:6][E: codex-rs/ext/image-generation/src/artifact.rs:38][E: codex-rs/ext/image-generation/src/artifact.rs:45]

extension-owned item 是 `ImageGenerationItem { id, status, revised_prompt, result, transparent_background, failure, saved_path }`。[E: codex-rs/ext/items/src/image_generation.rs:28][E: codex-rs/ext/items/src/image_generation.rs:29][E: codex-rs/ext/items/src/image_generation.rs:37][E: codex-rs/ext/items/src/image_generation.rs:40]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/extension_tools.rs`
- `codex-rs/core/src/image_preparation.rs`
- `codex-rs/ext/image-generation/src/extension.rs`
- `codex-rs/ext/image-generation/src/tool.rs`
- `codex-rs/ext/image-generation/src/backend.rs`
- `codex-rs/ext/image-generation/src/artifact.rs`
- `codex-rs/ext/items/src/image_generation.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [Ext 扩展插件系统](../../spine/extension-system.md)
- [view_image 工具](view-image.md)
- [web_search 工具](web-search.md)
- [Responses API](../../subsystems/providers/responses-api.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
