---
id: tool.image-generation
title: image_generation 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/tool_spec.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_config.rs, codex-rs/core/src/session/turn_context.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/protocol/src/protocol.rs, codex-rs/features/src/lib.rs, codex-rs/tools/src/responses_api.rs, codex-rs/core/src/tools/spec.rs]
symbols: [ToolSpec::ImageGeneration, create_image_generation_tool, ToolsConfig::image_gen_tool, image_generation_tool_auth_allowed, supports_image_generation, ImageGenerationBeginEvent, ImageGenerationEndEvent]
related: [tool.view-image, tool.web-search, subsys.providers.responses-api, subsys.core.tool-system, subsys.config-auth.auth-flows]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `image_generation` 是 Codex 暴露给 OpenAI Responses API 的 built-in image generation ToolSpec；Codex 负责按鉴权、feature 与模型 modality 决定是否发送该 spec，并在流式响应完成后把 base64 图片保存到本地 `generated_images` 目录。[E: codex-rs/tools/src/tool_spec.rs:36][E: codex-rs/tools/src/tool_config.rs:159][E: codex-rs/core/src/stream_events_utils.rs:35][E: codex-rs/core/src/stream_events_utils.rs:113][E: codex-rs/core/src/stream_events_utils.rs:121]

## 能回答的问题

- `image_generation` 为什么是 OpenAI built-in ToolSpec，而不是 Codex Function 工具？
- `image_generation` 的 `output_format` 如何被固定为 `png`？
- 鉴权、feature flag 和模型 modality 如何共同决定是否暴露该工具？
- 生成图片如何保存到本地路径，UI 事件携带哪些字段？
- 该工具为什么没有本地 `ToolHandlerKind`？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `image_generation` | `ToolSpec::ImageGeneration` 的 serde rename 是 `image_generation`，`ToolSpec::name()` 对该变体返回 `image_generation`。[E: codex-rs/tools/src/tool_spec.rs:35][E: codex-rs/tools/src/tool_spec.rs:67] |
| aliases | 无本地 alias。 | registry 只 push `create_image_generation_tool("png")`，该 block 没有 `plan.register_handler(...)` 调用。[E: codex-rs/tools/src/tool_registry_plan.rs:375][E: codex-rs/tools/src/tool_registry_plan.rs:378][I] |
| ToolSpec 类型 | `ToolSpec::ImageGeneration { output_format }` built-in | `ToolSpec` enum 直接定义 `ImageGeneration { output_format: String }`。[E: codex-rs/tools/src/tool_spec.rs:35][E: codex-rs/tools/src/tool_spec.rs:36] |
| ToolHandlerKind | 无本地 handler kind | registry image block push spec 后结束，没有注册 handler；Codex 本地 tools build 只遍历 `plan.handlers` 注册 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:373][E: codex-rs/tools/src/tool_registry_plan.rs:378][E: codex-rs/core/src/tools/spec.rs:189][I] |
| core handler | 无 Function handler；流式 response item 被 non-tool 路径处理 | `ResponseItem::ImageGenerationCall` 被 `handle_non_tool_response_item` 接收，而不是 function/custom/tool-search output 路径。[E: codex-rs/core/src/stream_events_utils.rs:360][E: codex-rs/core/src/stream_events_utils.rs:423][E: codex-rs/core/src/stream_events_utils.rs:425] |
| 所属 crate | spec/gate 在 `codex-tools`，鉴权 gate 与保存逻辑在 `codex-core`，事件 contract 在 `codex-protocol`。 | `image_generation_tool_auth_allowed` 在 turn context，保存函数在 stream utils，events 在 protocol。[E: codex-rs/core/src/session/turn_context.rs:7][E: codex-rs/core/src/stream_events_utils.rs:106][E: codex-rs/protocol/src/protocol.rs:2497] |

## 2 用途定位

`image_generation` 用于让 Responses API 模型生成图片；Codex 不把它建成 JSON Function call，而是传递 OpenAI built-in tool spec。[E: codex-rs/tools/src/tool_spec.rs:35][E: codex-rs/tools/src/tool_registry_plan.rs:373][I]  
Codex 对生成结果有本地后处理：当 turn item 是 `ImageGeneration` 时，core 会把结果保存为文件并把 `saved_path` 写回 turn item。[E: codex-rs/core/src/stream_events_utils.rs:376][E: codex-rs/core/src/stream_events_utils.rs:387]  
输出文件路径位于 `codex_home/generated_images/<session_id>/<call_id>.png`，路径构造会 sanitize session id 与 call id。[E: codex-rs/core/src/stream_events_utils.rs:35][E: codex-rs/core/src/stream_events_utils.rs:59][E: codex-rs/core/src/stream_events_utils.rs:62]

## 3 输入 schema 表

`image_generation` 没有 Codex Function-style JSON input schema；Codex 发送给 Responses API 的 tool spec 只有 `type: "image_generation"` 与 `output_format`。[E: codex-rs/tools/src/tool_spec.rs:36][E: codex-rs/tools/src/tool_spec.rs:88]  
以下表格描述 Codex request-side tool spec 字段，而不是本地 handler 参数。

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `output_format` | string | 是 | `png` | 指定 built-in image generation 的输出格式。 | registry 固定调用 `create_image_generation_tool("png")`，函数把入参转成 String。[E: codex-rs/tools/src/tool_registry_plan.rs:375][E: codex-rs/tools/src/tool_spec.rs:89] |

模型是否能看到该 spec 不由输入 schema 决定，而由 `ToolsConfig.image_gen_tool` gate 决定。[E: codex-rs/tools/src/tool_config.rs:216]

## 4 输出 schema & 截断

`image_generation` 没有 Function output schema；protocol 定义 `ImageGenerationBeginEvent { call_id }` 和 `ImageGenerationEndEvent { call_id, status, revised_prompt, result, saved_path }`。[E: codex-rs/protocol/src/protocol.rs:2497][E: codex-rs/protocol/src/protocol.rs:2512]  
`EventMsg` 对应事件名是 `ImageGenerationBegin` 和 `ImageGenerationEnd`。[E: codex-rs/protocol/src/protocol.rs:1518][E: codex-rs/protocol/src/protocol.rs:1520]  
core 保存逻辑把 base64 `result` 解码为 bytes，创建父目录并写入 `.png` 文件。[E: codex-rs/core/src/stream_events_utils.rs:113][E: codex-rs/core/src/stream_events_utils.rs:119][E: codex-rs/core/src/stream_events_utils.rs:121]  
保存成功后，`image_item.saved_path = Some(path)`，并把 image generation instructions 记录进会话历史以告知后续 turn 图片保存位置。[E: codex-rs/core/src/stream_events_utils.rs:387][E: codex-rs/core/src/stream_events_utils.rs:397][E: codex-rs/core/src/stream_events_utils.rs:401]

## 5 ToolSpec 类型

`image_generation` 使用专门的 `ToolSpec::ImageGeneration` 变体，而不是 `ToolSpec::Function(ResponsesApiTool)`。[E: codex-rs/tools/src/tool_spec.rs:24][E: codex-rs/tools/src/tool_spec.rs:36]  
`ToolSpec` enum 以 `#[serde(tag = "type")]` 序列化，因此该变体在请求 JSON 中表现为 built-in tool type。[E: codex-rs/tools/src/tool_spec.rs:21][E: codex-rs/tools/src/tool_spec.rs:35]  
`create_image_generation_tool` 只填 `output_format`，没有 `description/parameters/output_schema` 等 Function tool 字段。[E: codex-rs/tools/src/tool_spec.rs:88][E: codex-rs/tools/src/responses_api.rs:27][E: codex-rs/tools/src/responses_api.rs:37][I]

## 6 注册与门控

`ToolsConfig::new` 只有在 ChatGPT auth 允许、`Feature::ImageGeneration` 开启、模型支持 image generation 时，才把 `image_gen_tool` 设为 true。[E: codex-rs/tools/src/tool_config.rs:159][E: codex-rs/tools/src/tool_config.rs:161]  
鉴权 gate 来自 `image_generation_tool_auth_allowed`，该函数只在 `AuthMode::Chatgpt` 时返回 true。[E: codex-rs/core/src/session/turn_context.rs:7][E: codex-rs/core/src/session/turn_context.rs:10]  
模型能力 gate 是 `supports_image_generation(model_info)`，源码实现为检查 `model_info.input_modalities` 是否包含 `InputModality::Image`。[E: codex-rs/tools/src/tool_config.rs:308][E: codex-rs/tools/src/tool_config.rs:309]  
`InputModality` enum 明确定义 `Text` 和 `Image`，模型 metadata 中的 `input_modalities` 缺省会保守包含两者。[E: codex-rs/protocol/src/openai_models.rs:79][E: codex-rs/protocol/src/openai_models.rs:91]  
`Feature::ImageGeneration` 的 feature key 是 `image_generation`，stage 为 Stable，默认开启。[E: codex-rs/features/src/lib.rs:868][E: codex-rs/features/src/lib.rs:871]  
registry 只有在 `config.image_gen_tool` 为 true 时 push `create_image_generation_tool("png")`。[E: codex-rs/tools/src/tool_registry_plan.rs:373][E: codex-rs/tools/src/tool_registry_plan.rs:375]

## 7 parallel-safe

`image_generation` 的 `supports_parallel_tool_calls` 实际值是 `false`。[E: codex-rs/tools/src/tool_registry_plan.rs:374][E: codex-rs/tools/src/tool_registry_plan.rs:376]  
由于没有本地 Function handler，该值主要影响模型请求中的并行工具调用支持，而不是 Codex 本地 handler 的锁或 mutating 判定。[E: codex-rs/core/src/tools/spec.rs:180][E: codex-rs/core/src/tools/spec.rs:185][I]

## 8 handler 走读

1. turn context 先根据 auth manager 计算 `image_generation_tool_auth_allowed`。[E: codex-rs/core/src/session/turn_context.rs:388][E: codex-rs/core/src/session/turn_context.rs:389]
2. `ToolsConfig::new` 结合 auth gate、`Feature::ImageGeneration` 和模型 image modality 设置 `image_gen_tool`。[E: codex-rs/tools/src/tool_config.rs:159][E: codex-rs/tools/src/tool_config.rs:216]
3. `build_tool_registry_plan` 在 `config.image_gen_tool` 为 true 时 push `ToolSpec::ImageGeneration { output_format: "png" }`。[E: codex-rs/tools/src/tool_registry_plan.rs:373][E: codex-rs/tools/src/tool_registry_plan.rs:375]
4. registry image block 不注册 handler；core 只会为 `plan.handlers` 里的 handler kind 注册本地 handler。[E: codex-rs/tools/src/tool_registry_plan.rs:373][E: codex-rs/tools/src/tool_registry_plan.rs:378][E: codex-rs/core/src/tools/spec.rs:189]
5. provider/model 流式返回 `ResponseItem::ImageGenerationCall` 后，core 把它作为 non-tool response item 解析成 turn item。[E: codex-rs/core/src/stream_events_utils.rs:360][E: codex-rs/core/src/stream_events_utils.rs:361]
6. 如果 turn item 是 `ImageGeneration`，core 调用 `save_image_generation_result` 保存 base64 payload。[E: codex-rs/core/src/stream_events_utils.rs:376][E: codex-rs/core/src/stream_events_utils.rs:378]
7. 保存成功后，core 设置 `saved_path` 并记录一条 contextual user fragment，告知后续模型图片输出目录模板。[E: codex-rs/core/src/stream_events_utils.rs:387][E: codex-rs/core/src/stream_events_utils.rs:397][E: codex-rs/core/src/stream_events_utils.rs:401]

## 9 设计动机·edge·历史

鉴权注释写明 API-key auth 会绕过 Codex backend entitlement/tool normalization，因此调用方必须在暴露 built-in tool 前确认 ChatGPT auth。[E: codex-rs/tools/src/tool_config.rs:157][E: codex-rs/tools/src/tool_config.rs:159]  
把图片保存到 `codex_home/generated_images` 让后续 turn 可以引用本地文件路径，而不是只在模型 response item 中保留 base64 字符串。[E: codex-rs/core/src/stream_events_utils.rs:35][E: codex-rs/core/src/stream_events_utils.rs:387][I]  
保存失败不会把 turn 失败化；源码只记录 warning，继续返回 parsed turn item。[E: codex-rs/core/src/stream_events_utils.rs:413][E: codex-rs/core/src/stream_events_utils.rs:421]  
`output_format` 当前由 registry 固定为 `png`，源码没有暴露用户可配置格式字段。[E: codex-rs/tools/src/tool_registry_plan.rs:375][I]

## Sources

- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_config.rs`
- `codex-rs/core/src/session/turn_context.rs`
- `codex-rs/core/src/stream_events_utils.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/tools/src/responses_api.rs`
- `codex-rs/core/src/tools/spec.rs`

## 相关

- [view_image 工具](view-image.md)
- [web_search 工具](web-search.md)
- [Responses API](../../subsystems/providers/responses-api.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
- [认证流程](../../subsystems/config-auth/auth-flows.md)
