---
id: integrations.image
title: Image attachment normalization
kind: subsystem
tier: T2
v: shared
status: verified
updated: 92c70c9c3
source:
  - packages/opencode/src/image/image.ts
  - packages/opencode/src/session/prompt.ts
  - packages/opencode/src/session/processor.ts
  - packages/opencode/src/tool/read.ts
  - packages/core/src/image.ts
  - packages/core/src/image/photon.ts
  - packages/core/src/tool/read.ts
  - packages/core/src/v1/config/attachment.ts
  - packages/core/src/config/attachments.ts
symbols:
  - Image.Service
  - Image.normalize
  - ImageV2.Service
  - ImagePhoton.normalize
related:
  - tool.read
evidence: explicit
---

> Image integration 是 V1/V2 共享的 base64 image attachment 归一化机制；两代都用 Photon resize/compress 图片到配置上限，但接入点不同：V1 主要在 prompt/tool-result 处理，V2 已接到 core read tool。

## 能回答的问题

- 图片 base64 最大默认值、最大宽高默认值、auto resize 默认值是什么。
- V1 什么时候 normalize 用户图片，什么时候只是 read tool 返回原始 data URL。
- V2 `core/src/image/photon.ts` 如何选择 PNG/JPEG candidate。
- ResizerUnavailable 时两代如何 fallback。
- attachment config 在 V1/V2 schema 中分别在哪里。

## V1

### 职责

V1 `Image.Service` 定义在 `packages/opencode/src/image/image.ts`，提供单个 `normalize(input: SessionV1.FilePart)` 方法。[E: packages/opencode/src/image/image.ts:53] 它读取 V1 config 的 `attachment.image` 设置，默认约束是 `maxBase64Bytes=5 MiB`、`maxWidth=2000`、`maxHeight=2000`、`autoResize=true`。[E: packages/opencode/src/image/image.ts:10] [E: packages/opencode/src/image/image.ts:11] [E: packages/opencode/src/image/image.ts:12] [E: packages/opencode/src/image/image.ts:13]

V1 read tool 本身会把支持的 image/pdf mime 读成 data URL attachment，但它不在 `read.ts` 内调用 image normalizer。[E: packages/opencode/src/tool/read.ts:303] [E: packages/opencode/src/tool/read.ts:317] [E: packages/opencode/src/tool/read.ts:321] V1 normalize 接入点在 session prompt 输入和 session processor 的 tool-result attachment 处理。[E: packages/opencode/src/session/prompt.ts:994] [E: packages/opencode/src/session/prompt.ts:996] [E: packages/opencode/src/session/processor.ts:573] [E: packages/opencode/src/session/processor.ts:575]

### 数据模型与错误

V1 error 包括 `ResizerUnavailable`、`InvalidDataUrl`、`DecodeError`、`SizeError`。[E: packages/opencode/src/image/image.ts:15] [E: packages/opencode/src/image/image.ts:24] [E: packages/opencode/src/image/image.ts:32] [E: packages/opencode/src/image/image.ts:38] `SizeError` 带 `bytes`、`max`、`width`、`height`、`max_width`、`max_height`，用于说明图片为何仍超限。[E: packages/opencode/src/image/image.ts:39] [E: packages/opencode/src/image/image.ts:44]

V1 config schema 中 `auto_resize` 默认 true，`max_width` 默认 2000，`max_height` 默认 2000，`max_base64_bytes` 默认 5242880。[E: packages/core/src/v1/config/attachment.ts:6] [E: packages/core/src/v1/config/attachment.ts:10] [E: packages/core/src/v1/config/attachment.ts:13] [E: packages/core/src/v1/config/attachment.ts:16]

### Normalize 流程

1. V1 normalizer 懒加载 `@silvia-odwyer/photon-node`，并把 `__OPENCODE_PHOTON_WASM_PATH` 指向 packaged wasm 路径。[E: packages/opencode/src/image/image.ts:5] [E: packages/opencode/src/image/image.ts:66] [E: packages/opencode/src/image/image.ts:69]
2. `normalize` 读取 `config.get().attachment?.image` 并应用默认值。[E: packages/opencode/src/image/image.ts:76] [E: packages/opencode/src/image/image.ts:78] [E: packages/opencode/src/image/image.ts:81]
3. 输入必须是包含 `;base64,` 的 data URL；否则抛 `InvalidDataUrl`。[E: packages/opencode/src/image/image.ts:83]
4. normalizer 从 data URL 切出 base64 payload，用 UTF-8 计算 base64 字符串 byte length，然后用 Photon decode；后续返回和日志里的 MIME 主要来自 input mime 或 candidate mime。[E: packages/opencode/src/image/image.ts:86] [E: packages/opencode/src/image/image.ts:87] [E: packages/opencode/src/image/image.ts:91] [E: packages/opencode/src/image/image.ts:140] [E: packages/opencode/src/image/image.ts:148]
5. 如果宽高和 base64 bytes 都在限制内，直接返回原 input。[E: packages/opencode/src/image/image.ts:96]
6. 如果超限且 `autoResize` 为 false，抛 `SizeError`。[E: packages/opencode/src/image/image.ts:101]
7. 超限时先根据 max width/height 算 scale，再最多生成 32 个候选尺寸；首个候选来自 scale 后尺寸，后续候选按 0.75 递减并去重。[E: packages/opencode/src/image/image.ts:111] [E: packages/opencode/src/image/image.ts:112] [E: packages/opencode/src/image/image.ts:121] [E: packages/opencode/src/image/image.ts:124]
8. resize filter 使用 `SamplingFilter.Lanczos3`，candidate 包含 PNG 和 JPEG qualities 80/85/70/55/40。[E: packages/opencode/src/image/image.ts:126] [E: packages/opencode/src/image/image.ts:131]
9. 第一个 byte length 小于等于上限的 candidate 会被返回，mime 与 data URL 会更新。[E: packages/opencode/src/image/image.ts:138]
10. 如果所有 candidate 都超限，抛 `SizeError`。[E: packages/opencode/src/image/image.ts:153]

### V1 接入点

1. `session/prompt.ts` 在处理 user image file part 时调用 `Image.normalize`；如果 Photon resizer unavailable，会保留原 image part。[E: packages/opencode/src/session/prompt.ts:994] [E: packages/opencode/src/session/prompt.ts:996] [E: packages/opencode/src/session/prompt.ts:998] [E: packages/opencode/src/session/prompt.ts:999]
2. `session/processor.ts` 在 tool result attachment 是 image 时调用 `Image.normalize`，失败时会把 attachment omit 并统计 omitted count。[E: packages/opencode/src/session/processor.ts:573] [E: packages/opencode/src/session/processor.ts:575] [E: packages/opencode/src/session/processor.ts:584] [E: packages/opencode/src/session/processor.ts:591]
3. V1 read tool 支持 image mime 集合，读取后返回 data URL attachment。[E: packages/opencode/src/tool/read.ts:19] [E: packages/opencode/src/tool/read.ts:317] [E: packages/opencode/src/tool/read.ts:321]

## V2

### 职责

V2 `Image.Service` 定义在 `packages/core/src/image.ts`，接口是 `normalize(resource, content)`，其中 resource 是 string，content 是 `FileSystem.Content` 且 encoding 为 base64。[E: packages/core/src/image.ts:35] [E: packages/core/src/image.ts:37] service tag 是 `@opencode/Image`。[E: packages/core/src/image.ts:44]

V2 service 懒加载 adapter `./image/photon`，把 config entries 中的 `attachments.image` 合并成运行时参数，并调用 adapter normalize。[E: packages/core/src/image.ts:50] [E: packages/core/src/image.ts:60] [E: packages/core/src/image.ts:66]

### 数据模型与 config

V2 error 也包含 `ResizerUnavailable`、`DecodeError`、`SizeError`。[E: packages/core/src/image.ts:7] [E: packages/core/src/image.ts:12] [E: packages/core/src/image.ts:20] V2 config `attachments.image` 支持 `auto_resize`、`max_width`、`max_height`、`max_base64_bytes`。[E: packages/core/src/config/attachments.ts:6] [E: packages/core/src/config/attachments.ts:10] [E: packages/core/src/config/attachments.ts:13]

V2 service 默认参数和 V1 一致：auto true、width 2000、height 2000、max 5 MiB。[E: packages/core/src/image.ts:68] [E: packages/core/src/image.ts:71]

### Photon adapter 流程

1. V2 adapter 静态导入 Photon wasm path，并设置全局 `__OPENCODE_PHOTON_WASM_PATH`。[E: packages/core/src/image/photon.ts:2] [E: packages/core/src/image/photon.ts:12]
2. adapter cache Photon import，避免每次 normalize 重新 import。[E: packages/core/src/image/photon.ts:14]
3. adapter decode base64 成 `PhotonImage`，读取 width、height，并用 UTF-8 计算 base64 content 字节数。[E: packages/core/src/image/photon.ts:32] [E: packages/core/src/image/photon.ts:36] [E: packages/core/src/image/photon.ts:38]
4. 未超限时返回原 content 对象；源码没有从 resource 重新推导 MIME。[E: packages/core/src/image/photon.ts:39]
5. 超限且 autoResize false 时抛 `SizeError`。[E: packages/core/src/image/photon.ts:40]
6. 计算 scale 后最多生成 32 个候选尺寸，后续尺寸按 0.75 递减并去重，再用 Lanczos3 resize。[E: packages/core/src/image/photon.ts:50] [E: packages/core/src/image/photon.ts:51] [E: packages/core/src/image/photon.ts:60] [E: packages/core/src/image/photon.ts:63] [E: packages/core/src/image/photon.ts:66]
7. encoders 包含 PNG 和 JPEG qualities 80/85/70/55/40；第一个满足 maxBase64Bytes 的 candidate 返回 content 和 mime。[E: packages/core/src/image/photon.ts:68] [E: packages/core/src/image/photon.ts:74] [E: packages/core/src/image/photon.ts:75]
8. 如果没有 candidate 满足上限，adapter 抛 `SizeError`。[E: packages/core/src/image/photon.ts:81]

### V2 接入点

V2 `core/src/tool/read.ts` 支持 image mime，read file 后如果输出是 base64 image，会调用 `image.normalize(resource, content)`；如果 resizer unavailable，会返回原 content。[E: packages/core/src/tool/read.ts:17] [E: packages/core/src/tool/read.ts:80] [E: packages/core/src/tool/read.ts:83] 非 image binary 会返回 BinaryFileError。[E: packages/core/src/tool/read.ts:85]

## V1 / V2 差异表

| 维度 | V1 | V2 |
| --- | --- | --- |
| service input | `SessionV1.FilePart`，包含 data URL。 | file resource + base64 content。 |
| Photon loading | dynamic import `@silvia-odwyer/photon-node` with wasm path. | adapter file static wasm import + cached dynamic import。 |
| main call site | prompt image parts and tool-result image attachments。 | core read tool image output。 |
| unavailable fallback | prompt input keeps original; processor may omit tool-result attachment。 | read tool keeps original image output。 |
| config path | V1 `attachment.image` schema。 | V2 `attachments.image` config entries。 |

## 设计动机与权衡

两代都把 image normalization 放在 attachment/read boundary，而不是让每个 provider adapter 自行 resize。[I] successful normalize 会降低超限图片的尺寸或体积；但 `ResizerUnavailable` fallback 可能保留原图，不能等同于尺寸检查通过。[I] [E: packages/opencode/src/session/prompt.ts:996] [E: packages/opencode/src/session/prompt.ts:999] [E: packages/core/src/tool/read.ts:80] [E: packages/core/src/tool/read.ts:83]

PNG + 多档 JPEG candidate 是质量/体积折中：先尝试无损 PNG，再尝试多档 JPEG，找到第一个小于等于 max base64 bytes 的候选。[I] 两代源码都有相同 candidate pattern 和 `<=` 上限判断。[E: packages/opencode/src/image/image.ts:131] [E: packages/opencode/src/image/image.ts:135] [E: packages/core/src/image/photon.ts:67] [E: packages/core/src/image/photon.ts:74]

## 易踩坑

- V1 read tool 返回 image data URL attachment，不代表 read tool 已经完成 resize；normalize 在 prompt/processor 层发生。[E: packages/opencode/src/tool/read.ts:317] [E: packages/opencode/src/tool/read.ts:321] [E: packages/opencode/src/session/prompt.ts:994]
- V2 read tool 才直接调用 core image normalizer。[E: packages/core/src/tool/read.ts:80]
- `max_base64_bytes` 限制的是 base64 字符串的 UTF-8 byte length，不是 decoded binary byte length；两代都用 `Buffer.byteLength(..., "utf8"/"utf-8")` 计算。[E: packages/opencode/src/image/image.ts:87] [E: packages/core/src/image/photon.ts:38]
- auto resize 关闭时超限会抛 SizeError，不会尝试压缩。[E: packages/opencode/src/image/image.ts:101] [E: packages/core/src/image/photon.ts:40]
- ResizerUnavailable 在用户输入 image 场景会保留原图，这是一种可用性 fallback，不是尺寸检查通过。[E: packages/opencode/src/session/prompt.ts:996] [E: packages/opencode/src/session/prompt.ts:999]

## Sources

- packages/opencode/src/image/image.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/session/processor.ts
- packages/opencode/src/tool/read.ts
- packages/core/src/image.ts
- packages/core/src/image/photon.ts
- packages/core/src/tool/read.ts
- packages/core/src/v1/config/attachment.ts
- packages/core/src/config/attachments.ts

## 相关

- tool.read
