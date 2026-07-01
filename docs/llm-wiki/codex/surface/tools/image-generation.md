---
id: tool.image-generation
title: image_generation 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/hosted_spec.rs, codex-rs/tools/src/tool_spec.rs, codex-rs/protocol/src/openai_models.rs, codex-rs/model-provider/src/provider.rs, codex-rs/features/src/lib.rs, codex-rs/core/src/event_mapping.rs, codex-rs/core/src/stream_events_utils.rs, codex-rs/protocol/src/protocol.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/items.rs]
symbols: [ToolSpec::ImageGeneration, create_image_generation_tool, hosted_model_tool_specs, image_generation_tool_enabled, image_generation_runtime_enabled, standalone_image_generation_available, ImageGenerationItem]
related: [spine.extension-system, tool.view-image, tool.web-search, subsys.providers.responses-api, subsys.core.tool-system, subsys.config-auth.auth-flows]
evidence: explicit
status: verified
updated: db887d03e1
---

> `image_generation` 是 hosted Responses image generation tool spec；在非 Responses Lite 路径中，当前 core 只在 OpenAI actor authorization 或 Codex-backend auth、provider capability、模型 image modality 和 feature gate 都满足，且 standalone image extension 不可用时，向模型暴露 `ToolSpec::ImageGeneration { output_format: "png" }`。[E: codex-rs/core/src/tools/spec_plan.rs:294][E: codex-rs/core/src/tools/spec_plan.rs:297][E: codex-rs/core/src/tools/spec_plan.rs:324][E: codex-rs/core/src/tools/spec_plan.rs:326][E: codex-rs/core/src/tools/spec_plan.rs:385][E: codex-rs/core/src/tools/spec_plan.rs:392][E: codex-rs/core/src/tools/spec_plan.rs:393][E: codex-rs/core/src/tools/spec_plan.rs:397][E: codex-rs/core/src/tools/spec_plan.rs:398][E: codex-rs/core/src/tools/spec_plan.rs:402]

## 能回答的问题

- `image_generation` 为什么是 hosted ToolSpec 而不是本地 Function handler？
- `output_format` 为什么固定为 `png`？
- auth、provider、model modality、feature 和 standalone extension 如何共同门控？
- provider 返回的 image generation result 如何保存到本地？
- UI/legacy event 表面携带哪些字段？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `image_generation` | `ToolSpec::ImageGeneration` 使用 serde rename `image_generation`，`ToolSpec::name()` 返回同名字符串。[E: codex-rs/tools/src/tool_spec.rs:28][E: codex-rs/tools/src/tool_spec.rs:61] |
| ToolSpec 类型 | hosted `ToolSpec::ImageGeneration { output_format }` | enum 直接定义该 hosted 变体；创建函数只填 `output_format`。[E: codex-rs/tools/src/tool_spec.rs:28][E: codex-rs/core/src/tools/hosted_spec.rs:14][E: codex-rs/core/src/tools/hosted_spec.rs:16] |
| 本地 handler | 无本地 Function handler | hosted specs 直接并入 model-visible specs；registry 只由 runtime handlers 构造。[E: codex-rs/core/src/tools/spec_plan.rs:253][E: codex-rs/core/src/tools/spec_plan.rs:262][E: codex-rs/core/src/tools/spec_plan.rs:264] [I] |
| response item | `ResponseItem::ImageGenerationCall` | protocol model 定义 `id/status/revised_prompt/result/internal_chat_message_metadata_passthrough` 等字段。[E: codex-rs/protocol/src/models.rs:1125][E: codex-rs/protocol/src/models.rs:1128][E: codex-rs/protocol/src/models.rs:1129][E: codex-rs/protocol/src/models.rs:1132][E: codex-rs/protocol/src/models.rs:1133][E: codex-rs/protocol/src/models.rs:1136] |
| persisted turn item | `ImageGenerationItem` | turn item 保存 `id/status/revised_prompt/result/saved_path`。[E: codex-rs/protocol/src/items.rs:65][E: codex-rs/protocol/src/items.rs:293][E: codex-rs/protocol/src/items.rs:294][E: codex-rs/protocol/src/items.rs:297][E: codex-rs/protocol/src/items.rs:298][E: codex-rs/protocol/src/items.rs:301] |

## 2 注册与门控

Hosted image generation 由 `hosted_model_tool_specs` 添加；Responses Lite 会让该函数提前返回空 vec。[E: codex-rs/core/src/tools/spec_plan.rs:294][E: codex-rs/core/src/tools/spec_plan.rs:297][E: codex-rs/core/src/tools/spec_plan.rs:323][E: codex-rs/core/src/tools/spec_plan.rs:326]

| gate | 要求 | 证据 |
|---|---|---|
| auth | OpenAI actor authorization 或 Codex-backend auth | `image_generation_runtime_enabled` 允许 provider 使用 OpenAI actor authorization；否则要求 provider 需要 OpenAI auth 且当前 auth manager 使用 Codex backend。[E: codex-rs/core/src/tools/spec_plan.rs:389][E: codex-rs/core/src/tools/spec_plan.rs:392][E: codex-rs/core/src/tools/spec_plan.rs:393][E: codex-rs/core/src/tools/spec_plan.rs:397] |
| provider | provider capability 支持 image generation | 同一函数要求 `turn_context.provider.capabilities().image_generation`；provider capabilities 结构体含 `image_generation` 字段。[E: codex-rs/core/src/tools/spec_plan.rs:398][E: codex-rs/model-provider/src/provider.rs:34][E: codex-rs/model-provider/src/provider.rs:36] |
| model modality | 模型 input modalities 包含 `Image` | runtime gate 检查 `model_info.input_modalities.contains(&InputModality::Image)`；`InputModality` enum 定义 `Text/Image`。[E: codex-rs/core/src/tools/spec_plan.rs:399][E: codex-rs/core/src/tools/spec_plan.rs:402][E: codex-rs/protocol/src/openai_models.rs:155][E: codex-rs/protocol/src/openai_models.rs:159] |
| feature | `Feature::ImageGeneration` 开启 | `image_generation_tool_enabled` 在 runtime gate 之外还检查该 feature；feature key 是 `image_generation`，Stable，默认开启。[E: codex-rs/core/src/tools/spec_plan.rs:379][E: codex-rs/core/src/tools/spec_plan.rs:385][E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1164][E: codex-rs/features/src/lib.rs:1165][E: codex-rs/features/src/lib.rs:1166][E: codex-rs/features/src/lib.rs:1167] |
| standalone extension | `image_gen.imagegen` 不可用 | hosted spec 只在 `!standalone_image_generation_available(...)` 时添加；standalone executor 名为 namespace `image_gen`、tool `imagegen`。[E: codex-rs/core/src/tools/spec_plan.rs:324][E: codex-rs/core/src/tools/spec_plan.rs:326][E: codex-rs/core/src/tools/spec_plan.rs:99][E: codex-rs/core/src/tools/spec_plan.rs:100][E: codex-rs/core/src/tools/spec_plan.rs:425][E: codex-rs/core/src/tools/spec_plan.rs:427] |

Standalone image generation 的 model-visible gate 先要求 runtime gate 与 namespace tools 都通过；在这些前置条件满足后，Responses Lite 不再要求 `Feature::ImageGenExt`，非 Responses Lite 则需要该 feature。[E: codex-rs/core/src/tools/spec_plan.rs:406][E: codex-rs/core/src/tools/spec_plan.rs:410][E: codex-rs/core/src/tools/spec_plan.rs:418]
extension tool 发布阶段也会在 standalone image generation 不可见时跳过 `image_gen.imagegen`。[E: codex-rs/core/src/tools/spec_plan.rs:1034][E: codex-rs/core/src/tools/spec_plan.rs:1035][E: codex-rs/core/src/tools/spec_plan.rs:1037]

## 3 Tool Spec 字段

`create_image_generation_tool(output_format)` 只构造 `ToolSpec::ImageGeneration { output_format: output_format.to_string() }`。[E: codex-rs/core/src/tools/hosted_spec.rs:14][E: codex-rs/core/src/tools/hosted_spec.rs:16]
当前唯一调用点固定传入 `"png"`，因此 request-side spec 的格式字段固定为 PNG。[E: codex-rs/core/src/tools/spec_plan.rs:323][E: codex-rs/core/src/tools/spec_plan.rs:326]

| 字段 | 类型 | 当前值 | 证据 |
|---|---|---|---|
| `type` | hosted tool type | `image_generation` | `ToolSpec::ImageGeneration` serde rename 是 `image_generation`。[E: codex-rs/tools/src/tool_spec.rs:28] |
| `output_format` | string | `png` | hosted spec 创建函数从入参复制，计划器调用固定传 `"png"`。[E: codex-rs/core/src/tools/hosted_spec.rs:14][E: codex-rs/core/src/tools/spec_plan.rs:326] |

## 4 Runtime 与持久化

Provider 返回 `ResponseItem::ImageGenerationCall` 后，`parse_turn_item` 要求存在 `id`，并将 `status/revised_prompt/result` 转成 `TurnItem::ImageGeneration`，初始 `saved_path` 为 `None`。[E: codex-rs/core/src/event_mapping.rs:205][E: codex-rs/core/src/event_mapping.rs:213][E: codex-rs/core/src/event_mapping.rs:217]

stream utils 在 finalized turn item 阶段发现 `ImageGeneration` 且 `result` 非空时持久化图片；持久化会先 base64 decode，再在 `codex_home/generated_images/<session_id>/<call_id>.png` 下创建父目录并写文件。[E: codex-rs/core/src/stream_events_utils.rs:581][E: codex-rs/core/src/stream_events_utils.rs:582][E: codex-rs/core/src/stream_events_utils.rs:584][E: codex-rs/core/src/stream_events_utils.rs:39][E: codex-rs/core/src/stream_events_utils.rs:64][E: codex-rs/core/src/stream_events_utils.rs:65][E: codex-rs/core/src/stream_events_utils.rs:66][E: codex-rs/core/src/stream_events_utils.rs:67][E: codex-rs/core/src/stream_events_utils.rs:117][E: codex-rs/core/src/stream_events_utils.rs:123][E: codex-rs/core/src/stream_events_utils.rs:126]

输出路径会 sanitize session id 与 call id，只保留 ASCII 字母数字、`-`、`_`，否则替换成 `_`；保存成功后 `image_item.saved_path = Some(path.clone())`。[E: codex-rs/core/src/stream_events_utils.rs:42][E: codex-rs/core/src/stream_events_utils.rs:47][E: codex-rs/core/src/stream_events_utils.rs:51][E: codex-rs/core/src/stream_events_utils.rs:54][E: codex-rs/core/src/stream_events_utils.rs:130][E: codex-rs/core/src/stream_events_utils.rs:146]

保存成功后，core 还会记录一条 image generation instructions contextual fragment，告诉后续 turn 图片输出目录/路径模板。[E: codex-rs/core/src/stream_events_utils.rs:168][E: codex-rs/core/src/stream_events_utils.rs:173][E: codex-rs/core/src/stream_events_utils.rs:182][E: codex-rs/core/src/stream_events_utils.rs:530][E: codex-rs/core/src/stream_events_utils.rs:541]

## 5 事件表面

`EventMsg` 有 `ImageGenerationBegin` 与 `ImageGenerationEnd` 两个 legacy 事件。[E: codex-rs/protocol/src/protocol.rs:1361][E: codex-rs/protocol/src/protocol.rs:1363]
begin event 从 `TurnItem::ImageGeneration` 取 `id` 作为 `call_id`。[E: codex-rs/protocol/src/protocol.rs:1804][E: codex-rs/protocol/src/protocol.rs:1806]
end event 字段包括 `call_id/status/revised_prompt/result/saved_path`,并由 `ImageGenerationItem::as_legacy_event` 填充。[E: codex-rs/protocol/src/protocol.rs:2488][E: codex-rs/protocol/src/protocol.rs:2489][E: codex-rs/protocol/src/protocol.rs:2492][E: codex-rs/protocol/src/protocol.rs:2493][E: codex-rs/protocol/src/protocol.rs:2496][E: codex-rs/protocol/src/items.rs:662][E: codex-rs/protocol/src/items.rs:663][E: codex-rs/protocol/src/items.rs:664][E: codex-rs/protocol/src/items.rs:665][E: codex-rs/protocol/src/items.rs:666][E: codex-rs/protocol/src/items.rs:667]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/hosted_spec.rs`
- `codex-rs/tools/src/tool_spec.rs`
- `codex-rs/protocol/src/openai_models.rs`
- `codex-rs/model-provider/src/provider.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/core/src/event_mapping.rs`
- `codex-rs/core/src/stream_events_utils.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/items.rs`

## 相关

- [view_image 工具](view-image.md)
- [web_search 工具](web-search.md)
- [Ext 扩展插件系统](../../spine/extension-system.md)
- [Responses API](../../subsystems/providers/responses-api.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
