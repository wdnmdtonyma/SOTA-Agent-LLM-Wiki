---
id: tool.image-generation
title: image_gen.imagegen 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/extension_tools.rs, codex-rs/ext/image-generation/src/extension.rs, codex-rs/ext/image-generation/src/tool.rs, codex-rs/ext/image-generation/src/backend.rs, codex-rs/ext/items/src/image_generation.rs, codex-rs/tools/src/tool_executor.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/model-provider/src/provider.rs, codex-rs/features/src/lib.rs]
symbols: [ImageGenerationExtension, ImageGenerationTool, ImagegenArgs, imagegen_tool_spec, GeneratedImageOutput, image_generation_runtime_enabled, standalone_image_generation_model_visible]
related: [spine.extension-system, tool.view-image, tool.web-search, subsys.providers.responses-api, subsys.core.tool-system, subsys.config-auth.auth-flows]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> `image_gen.imagegen` 是 image-generation extension 提供的 namespace function tool，既能按 prompt 生成新图，也能用本地路径或 recent conversation images 做编辑。[E: codex-rs/ext/image-generation/src/extension.rs:97][E: codex-rs/ext/image-generation/src/tool.rs:113][E: codex-rs/ext/image-generation/src/tool.rs:254][E: codex-rs/ext/image-generation/src/tool.rs:255][E: codex-rs/ext/image-generation/src/tool.rs:256][E: codex-rs/ext/image-generation/src/tool.rs:270][E: codex-rs/ext/image-generation/src/tool.rs:272][E: codex-rs/ext/image-generation/src/tool.rs:319] 相比基线，旧 hosted `ToolSpec::ImageGeneration` 已从工具计划器移除。[I]

## 能回答的问题

- `image_gen.imagegen` 的 namespace、function schema 和三个输入字段是什么？
- auth、provider capability、image modality、feature 和 namespace capability 如何共同门控？
- generate 与 edit 怎样由 `referenced_image_paths` / `num_last_images_to_include` 选择？
- extension runtime 怎样发 started/completed item、保存 PNG 并返回图片？
- direct tool、code mode 和 legacy event 怎样共享同一次执行结果？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | namespace `image_gen` / function `imagegen` | executor 返回 `ToolName::namespaced(IMAGE_GEN_NAMESPACE, IMAGEGEN_TOOL_NAME)`。[E: codex-rs/ext/image-generation/src/tool.rs:110][E: codex-rs/ext/image-generation/src/tool.rs:113] |
| runtime | `ImageGenerationTool` | extension 的 `ToolContributor` 为可用 thread 构造一个 image tool，core 再用 `ExtensionToolAdapter` 适配成 `CoreToolRuntime`。[E: codex-rs/ext/image-generation/src/extension.rs:83][E: codex-rs/ext/image-generation/src/extension.rs:90][E: codex-rs/ext/image-generation/src/extension.rs:97][E: codex-rs/core/src/tools/handlers/extension_tools.rs:28][E: codex-rs/core/src/tools/handlers/extension_tools.rs:57][E: codex-rs/core/src/tools/handlers/extension_tools.rs:62] |
| ToolSpec | `ToolSpec::Namespace` 内一个 Function | namespace name 是 `image_gen`；function name 是 `imagegen`，`strict=false`，无 output schema。[E: codex-rs/ext/image-generation/src/tool.rs:463][E: codex-rs/ext/image-generation/src/tool.rs:480][E: codex-rs/ext/image-generation/src/tool.rs:483][E: codex-rs/ext/image-generation/src/tool.rs:486][E: codex-rs/ext/image-generation/src/tool.rs:489] |
| exposure | `Direct` | executor 显式返回 `ToolExposure::Direct`；code-mode planner 排除 `DirectModelOnly`、`Hidden` 及 config-excluded tools，再把其余 spec 收进 nested tool set。[E: codex-rs/ext/image-generation/src/tool.rs:122][E: codex-rs/ext/image-generation/src/tool.rs:123][E: codex-rs/core/src/tools/spec_plan.rs:462][E: codex-rs/core/src/tools/spec_plan.rs:463][E: codex-rs/core/src/tools/spec_plan.rs:467][E: codex-rs/core/src/tools/spec_plan.rs:471][E: codex-rs/core/src/tools/spec_plan.rs:475][E: codex-rs/core/src/tools/spec_plan.rs:484] |
| parallel-safe | `false` | `ImageGenerationTool` 未覆写 `supports_parallel_tool_calls`，trait 默认返回 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65] |

## 2 输入 schema

| 字段 | 类型 | 必填 | 约束与用途 | 证据 |
|---|---|---|---|---|
| `prompt` | string | 是 | 生成或编辑说明；成功时也写入 completed item 的 `revised_prompt`。[E: codex-rs/ext/image-generation/src/tool.rs:85][E: codex-rs/ext/image-generation/src/tool.rs:86][E: codex-rs/ext/image-generation/src/tool.rs:207][E: codex-rs/ext/image-generation/src/tool.rs:210] |
| `referenced_image_paths` | absolute path array | 否 | 最多 5 个；从第一个 tool environment 受 sandbox 约束地读取并转成 data URL。[E: codex-rs/ext/image-generation/src/tool.rs:87][E: codex-rs/ext/image-generation/src/tool.rs:88][E: codex-rs/ext/image-generation/src/tool.rs:264][E: codex-rs/ext/image-generation/src/tool.rs:282][E: codex-rs/ext/image-generation/src/tool.rs:427][E: codex-rs/ext/image-generation/src/tool.rs:435][E: codex-rs/ext/image-generation/src/tool.rs:451] |
| `num_last_images_to_include` | integer | 否 | 1–5；从 conversation history 倒序提取最近图片，数量不足即报错。[E: codex-rs/ext/image-generation/src/tool.rs:89][E: codex-rs/ext/image-generation/src/tool.rs:90][E: codex-rs/ext/image-generation/src/tool.rs:293][E: codex-rs/ext/image-generation/src/tool.rs:301][E: codex-rs/ext/image-generation/src/tool.rs:302] |

两个 image-source 字段互斥；两者都省略时创建 generate request，有任一 image source 时创建 edit request。两类请求都固定 `gpt-image-2`、auto background/quality/size。[E: codex-rs/ext/image-generation/src/tool.rs:57][E: codex-rs/ext/image-generation/src/tool.rs:270][E: codex-rs/ext/image-generation/src/tool.rs:272][E: codex-rs/ext/image-generation/src/tool.rs:274][E: codex-rs/ext/image-generation/src/tool.rs:275][E: codex-rs/ext/image-generation/src/tool.rs:277][E: codex-rs/ext/image-generation/src/tool.rs:278][E: codex-rs/ext/image-generation/src/tool.rs:310][E: codex-rs/ext/image-generation/src/tool.rs:319][E: codex-rs/ext/image-generation/src/tool.rs:323]

## 3 注册与门控

extension 在 thread start 和 config change 时缓存 provider/save-root 配置；provider 必须是 OpenAI、要求 OpenAI auth，或使用 OpenAI actor authorization，才贡献 runtime。[E: codex-rs/ext/image-generation/src/extension.rs:39][E: codex-rs/ext/image-generation/src/extension.rs:41][E: codex-rs/ext/image-generation/src/extension.rs:42][E: codex-rs/ext/image-generation/src/extension.rs:43][E: codex-rs/ext/image-generation/src/extension.rs:44][E: codex-rs/ext/image-generation/src/extension.rs:45][E: codex-rs/ext/image-generation/src/extension.rs:52][E: codex-rs/ext/image-generation/src/extension.rs:59][E: codex-rs/ext/image-generation/src/extension.rs:69][E: codex-rs/ext/image-generation/src/extension.rs:76][E: codex-rs/ext/image-generation/src/extension.rs:90][E: codex-rs/ext/image-generation/src/extension.rs:93][E: codex-rs/ext/image-generation/src/extension.rs:97]

core publication 还有更严格的 model-visible gate：

| gate | 要求 | 证据 |
|---|---|---|
| auth | provider 使用 OpenAI actor authorization，或 provider 要求 OpenAI auth 且当前 auth 使用 Codex backend | [E: codex-rs/core/src/tools/spec_plan.rs:367][E: codex-rs/core/src/tools/spec_plan.rs:371][E: codex-rs/core/src/tools/spec_plan.rs:372][E: codex-rs/core/src/tools/spec_plan.rs:376] |
| provider | `capabilities().image_generation` | [E: codex-rs/core/src/tools/spec_plan.rs:377][E: codex-rs/model-provider/src/provider.rs:34][E: codex-rs/model-provider/src/provider.rs:36] |
| model | input modalities 含 `Image` | [E: codex-rs/core/src/tools/spec_plan.rs:379][E: codex-rs/core/src/tools/spec_plan.rs:380][E: codex-rs/core/src/tools/spec_plan.rs:381][E: codex-rs/protocol/src/openai_models.rs:155][E: codex-rs/protocol/src/openai_models.rs:159] |
| namespace | provider 支持 namespace tools | [E: codex-rs/core/src/tools/spec_plan.rs:330][E: codex-rs/core/src/tools/spec_plan.rs:331][E: codex-rs/core/src/tools/spec_plan.rs:385] |
| feature | `Feature::ImageGeneration` 开启 | feature key 是 `image_generation`，Stable，默认开启。[E: codex-rs/core/src/tools/spec_plan.rs:393][E: codex-rs/features/src/lib.rs:1182][E: codex-rs/features/src/lib.rs:1183][E: codex-rs/features/src/lib.rs:1184][E: codex-rs/features/src/lib.rs:1185] |

`append_extension_tool_executors` 对 `image_gen.imagegen` 应用该 gate；未满足就跳过。它还用 reserved names 阻止 extension 覆盖 core/code-mode/tool-search 已注册名称。[E: codex-rs/core/src/tools/spec_plan.rs:969][E: codex-rs/core/src/tools/spec_plan.rs:975][E: codex-rs/core/src/tools/spec_plan.rs:976][E: codex-rs/core/src/tools/spec_plan.rs:979][E: codex-rs/core/src/tools/spec_plan.rs:985][E: codex-rs/core/src/tools/spec_plan.rs:998][E: codex-rs/core/src/tools/spec_plan.rs:999][E: codex-rs/core/src/tools/spec_plan.rs:1001][E: codex-rs/core/src/tools/spec_plan.rs:1003][E: codex-rs/core/src/tools/spec_plan.rs:1004]

## 4 Handler 走读

1. `handle_call` 解析严格 JSON 参数，按路径或 conversation history 构造 generate/edit request。[E: codex-rs/ext/image-generation/src/tool.rs:133][E: codex-rs/ext/image-generation/src/tool.rs:134][E: codex-rs/ext/image-generation/src/tool.rs:135][E: codex-rs/ext/image-generation/src/tool.rs:136]
2. 执行前发布 extension `ImageGenerationItem { status: in_progress }`，并附带 legacy `ImageGenerationBegin`。[E: codex-rs/ext/image-generation/src/tool.rs:138][E: codex-rs/ext/image-generation/src/tool.rs:140][E: codex-rs/ext/image-generation/src/tool.rs:142][E: codex-rs/ext/image-generation/src/tool.rs:147]
3. backend 通过当前 provider/auth 构造 `ImagesClient`，generate/edit 都带 originator header。[E: codex-rs/ext/image-generation/src/backend.rs:27][E: codex-rs/ext/image-generation/src/backend.rs:30][E: codex-rs/ext/image-generation/src/backend.rs:35][E: codex-rs/ext/image-generation/src/backend.rs:38][E: codex-rs/ext/image-generation/src/backend.rs:46][E: codex-rs/ext/image-generation/src/backend.rs:52][E: codex-rs/ext/image-generation/src/backend.rs:58][E: codex-rs/ext/image-generation/src/backend.rs:61][E: codex-rs/ext/image-generation/src/backend.rs:67][E: codex-rs/ext/image-generation/src/backend.rs:70]
4. API 失败时发布 `status: failed` completed item 并把错误响应模型；成功时取第一张 base64 image，保存到可选 save root 后发布 `status: completed` item。[E: codex-rs/ext/image-generation/src/tool.rs:152][E: codex-rs/ext/image-generation/src/tool.rs:153][E: codex-rs/ext/image-generation/src/tool.rs:154][E: codex-rs/ext/image-generation/src/tool.rs:161][E: codex-rs/ext/image-generation/src/tool.rs:162][E: codex-rs/ext/image-generation/src/tool.rs:168][E: codex-rs/ext/image-generation/src/tool.rs:170][E: codex-rs/ext/image-generation/src/tool.rs:176][E: codex-rs/ext/image-generation/src/tool.rs:177][E: codex-rs/ext/image-generation/src/tool.rs:179][E: codex-rs/ext/image-generation/src/tool.rs:182][E: codex-rs/ext/image-generation/src/tool.rs:207][E: codex-rs/ext/image-generation/src/tool.rs:209][E: codex-rs/ext/image-generation/src/tool.rs:215][E: codex-rs/ext/image-generation/src/tool.rs:216]
5. 保存逻辑 base64 decode，并通过 executor filesystem 创建目录、写 PNG；路径由 core 的 `image_generation_artifact_path` 决定。[E: codex-rs/ext/image-generation/src/tool.rs:229][E: codex-rs/ext/image-generation/src/tool.rs:236][E: codex-rs/ext/image-generation/src/tool.rs:239][E: codex-rs/ext/image-generation/src/tool.rs:241][E: codex-rs/ext/image-generation/src/tool.rs:248]

## 5 输出与事件

direct tool output 是 `FunctionCallOutput` content items：第一项为 `data:image/png;base64,...` 的 `InputImage`，保存成功时再附一段 output hint。code-mode result 则是 `{ image_url, output_hint? }`。[E: codex-rs/ext/image-generation/src/tool.rs:512][E: codex-rs/ext/image-generation/src/tool.rs:513][E: codex-rs/ext/image-generation/src/tool.rs:515][E: codex-rs/ext/image-generation/src/tool.rs:517][E: codex-rs/ext/image-generation/src/tool.rs:519][E: codex-rs/ext/image-generation/src/tool.rs:527][E: codex-rs/ext/image-generation/src/tool.rs:528][E: codex-rs/ext/image-generation/src/tool.rs:529][E: codex-rs/ext/image-generation/src/tool.rs:532][E: codex-rs/ext/image-generation/src/tool.rs:533][E: codex-rs/ext/image-generation/src/tool.rs:537]

extension-owned item 是 `ImageGenerationItem { id, status, revised_prompt, result, saved_path }`，core adapter 把它包成 `TurnItem::Extension`，同时转发 extension 自带的 legacy begin/end events。[E: codex-rs/ext/items/src/image_generation.rs:13][E: codex-rs/ext/items/src/image_generation.rs:14][E: codex-rs/ext/items/src/image_generation.rs:15][E: codex-rs/ext/items/src/image_generation.rs:16][E: codex-rs/ext/items/src/image_generation.rs:17][E: codex-rs/ext/items/src/image_generation.rs:20][E: codex-rs/core/src/tools/handlers/extension_tools.rs:90][E: codex-rs/core/src/tools/handlers/extension_tools.rs:94][E: codex-rs/core/src/tools/handlers/extension_tools.rs:95][E: codex-rs/core/src/tools/handlers/extension_tools.rs:96][E: codex-rs/core/src/tools/handlers/extension_tools.rs:105][E: codex-rs/core/src/tools/handlers/extension_tools.rs:109][E: codex-rs/core/src/tools/handlers/extension_tools.rs:110][E: codex-rs/core/src/tools/handlers/extension_tools.rs:111]

## 6 设计变化

当前 image extension 注册 thread lifecycle、config 和 tool contributors；core 的 `add_extension_tools` 只把 contributor 产生的 executor 交给统一 planner，并在 append 阶段对 `image_gen.imagegen` 应用可见性 gate。[E: codex-rs/ext/image-generation/src/extension.rs:111][E: codex-rs/ext/image-generation/src/extension.rs:120][E: codex-rs/ext/image-generation/src/extension.rs:121][E: codex-rs/ext/image-generation/src/extension.rs:122][E: codex-rs/core/src/tools/spec_plan.rs:917][E: codex-rs/core/src/tools/spec_plan.rs:920][E: codex-rs/core/src/tools/spec_plan.rs:998][E: codex-rs/core/src/tools/spec_plan.rs:999]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/extension_tools.rs`
- `codex-rs/ext/image-generation/src/extension.rs`
- `codex-rs/ext/image-generation/src/tool.rs`
- `codex-rs/ext/image-generation/src/backend.rs`
- `codex-rs/ext/items/src/image_generation.rs`
- `codex-rs/tools/src/tool_executor.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [view_image 工具](view-image.md)
- [web_search 工具](web-search.md)
- [Ext 扩展插件系统](../../spine/extension-system.md)
- [Responses API](../../subsystems/providers/responses-api.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
