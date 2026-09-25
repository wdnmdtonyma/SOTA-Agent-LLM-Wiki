---
id: surface.misc.images
title: 图像输入与终端图像
kind: surface
tier: T1
pkg: coding-agent
source:
 - packages/coding-agent/src/cli/file-processor.ts
 - packages/coding-agent/src/cli/initial-message.ts
 - packages/coding-agent/src/main.ts
 - packages/coding-agent/src/utils/mime.ts
 - packages/coding-agent/src/utils/image-process.ts
 - packages/coding-agent/src/utils/tool-result-images.ts
 - packages/coding-agent/src/utils/image-resize-core.ts
 - packages/coding-agent/src/utils/clipboard-image.ts
 - packages/coding-agent/src/core/agent-session.ts
 - packages/coding-agent/src/core/sdk.ts
 - packages/coding-agent/src/core/settings-manager.ts
 - packages/coding-agent/src/core/model-config.ts
 - packages/coding-agent/src/core/tools/read.ts
 - packages/coding-agent/src/modes/interactive/interactive-mode.ts
 - packages/coding-agent/src/modes/interactive/components/settings-selector.ts
 - packages/coding-agent/src/modes/interactive/components/tool-execution.ts
 - packages/coding-agent/src/modes/print-mode.ts
 - packages/coding-agent/test/clipboard-image.test.ts
 - packages/tui/src/terminal-image.ts
 - packages/tui/src/components/image.ts
 - packages/tui/native/linux/src/linux-platform-x11.c
 - packages/ai/src/types.ts
 - packages/ai/src/models.ts
 - packages/ai/src/providers/all.ts
 - packages/ai/src/providers/openrouter.ts
 - packages/ai/scripts/generate-models.ts
 - packages/ai/test/images-models.test.ts
symbols:
 - processFileArguments
 - processImage
 - readClipboardImage
 - ModelImageInputLimits
 - renderImage
related:
 - subsys.tui.terminal-image
 - surface.cli.overview
 - surface.modes.interactive
 - surface.modes.print
 - subsys.ai.image-generation
 - ref.ai.image-models
 - ref.ai.provider-catalog
 - ref.ai.model-catalog
evidence: explicit
status: verified
updated: ff72faba28
---

> `surface.misc.images` 描述 pi-coding-agent 的图像可见面：CLI `@file`、剪贴板与 tool result 把本地图片变成 user/tool `ImageContent`；`inputLimits.images.resize` 决定写入 history 前怎么压图；TUI 在终端能力允许时渲染 Kitty/iTerm2。输入图像与生成图像都走统一 `Models`，但生成调用本身属于 [subsys.ai.image-generation](../../subsystems/ai/image-generation.md)。

## 能回答的问题

- `pi @screenshot.png "..."` 怎样把图片送进初始 user message?
- pi 支持哪些本地图片类型，哪些会转换或 resize?
- `inputLimits.images.resize` 与 `images.autoResize` / `images.blockImages` / `terminal.showImages` 分别控制什么?
- X11 剪贴板为什么只读取已广告的 image target，避免把文本误判成图?
- 输入图像与 OpenRouter 图像生成怎样共用统一 `Models`，未限定 type 的读取为什么仍是 chat-only?

## 1 Identity

`processFileArguments(fileArgs, options)` 是 CLI `@file` 图像输入的 surface 入口：返回 `{ text, images }`，`images` 是 `ImageContent[]`，text 仍含每个文件的 `<file name="...">` 引用 [E: packages/coding-agent/src/cli/file-processor.ts:25] [E: packages/coding-agent/src/cli/file-processor.ts:26] [E: packages/coding-agent/src/cli/file-processor.ts:27] [E: packages/coding-agent/src/cli/file-processor.ts:87]。

`renderImage(base64Data, imageDimensions, options)` 是 TUI 终端图像渲染入口：读 `getCapabilities().images`，没有 image protocol 时返回 `null` [E: packages/tui/src/terminal-image.ts:638] [E: packages/tui/src/terminal-image.ts:643] [E: packages/tui/src/terminal-image.ts:645]。

`Models.generateImages()` 是生成图像的 runtime 入口，与输入图像共用 `ImageContent` / `ImageModel` 类型，但不走 CLI `@file` 装配 [E: packages/ai/src/models.ts:340] [E: packages/ai/src/types.ts:404]。本节点不展开 OpenRouter wire；生成管线见 [subsys.ai.image-generation](../../subsystems/ai/image-generation.md)，模型结构见 [ref.ai.image-models](../../reference/image-models.md) [I]。

## 2 CLI `@file` 图像输入

主入口在非 RPC 模式调用 `prepareInitialMessage(parsed, stdinContent)`，把 `initialMessage` / `initialImages` 交给 interactive 或 print 模式 [E: packages/coding-agent/src/main.ts:887]。`prepareInitialMessage()` 只在 `parsed.fileArgs.length > 0` 时调用 `processFileArguments`，并且传 `{ autoResizeImages: false }`，把 resize 留给 `AgentSession._normalizePromptImages`（此时已有 request model 的 `inputLimits`）[E: packages/coding-agent/src/main.ts:218] [E: packages/coding-agent/src/main.ts:222] [E: packages/coding-agent/src/core/agent-session.ts:1586]。

`buildInitialMessage()` 拼接 stdin、`@file` text 和第一条 CLI message；只有 `fileImages.length > 0` 才设置 `initialImages` [E: packages/coding-agent/src/cli/initial-message.ts:26] [E: packages/coding-agent/src/cli/initial-message.ts:40] [E: packages/coding-agent/src/cli/initial-message.ts:41]。

`processFileArguments()` 对每个 file arg 用 `resolveReadPath` + `resolve()` 得绝对路径，不存在则 `process.exit(1)`，空文件跳过 [E: packages/coding-agent/src/cli/file-processor.ts:32] [E: packages/coding-agent/src/cli/file-processor.ts:38] [E: packages/coding-agent/src/cli/file-processor.ts:39] [E: packages/coding-agent/src/cli/file-processor.ts:44]。`detectSupportedImageMimeTypeFromFile()` 命中则 `processImage()` 生成 `{ type: "image", mimeType, data }`；否则按 UTF-8 读进 `<file>` block [E: packages/coding-agent/src/cli/file-processor.ts:49] [E: packages/coding-agent/src/cli/file-processor.ts:54] [E: packages/coding-agent/src/cli/file-processor.ts:61] [E: packages/coding-agent/src/cli/file-processor.ts:77]。图片仍写一个 text reference：有 processing hints 就放进 `<file>`，否则空 tag [E: packages/coding-agent/src/cli/file-processor.ts:69] [E: packages/coding-agent/src/cli/file-processor.ts:72]。

interactive startup 调 `session.prompt(initialMessage, { images: initialImages })`，print 模式同样 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:1166] [E: packages/coding-agent/src/modes/print-mode.ts:132]。`AgentSession` 在构造 user message 前走 `_normalizePromptImages()`，再把 text part 与 images 放进同一个 user content array [E: packages/coding-agent/src/core/agent-session.ts:1717] [E: packages/coding-agent/src/core/agent-session.ts:1721] [E: packages/coding-agent/src/core/agent-session.ts:1722]。

## 3 支持格式、转换与 `inputLimits.images.resize`

MIME sniff 读文件前 4100 bytes，识别 JPEG、非 animated PNG、GIF、WEBP、BMP；animated PNG 因 `isAnimatedPng()` 返回 `null`，不当 inline image [E: packages/coding-agent/src/utils/mime.ts:3] [E: packages/coding-agent/src/utils/mime.ts:6] [E: packages/coding-agent/src/utils/mime.ts:10] [E: packages/coding-agent/src/utils/mime.ts:11] [E: packages/coding-agent/src/utils/mime.ts:13] [E: packages/coding-agent/src/utils/mime.ts:16] [E: packages/coding-agent/src/utils/mime.ts:19]。

`processImage()` 默认 `autoResizeImages = true` [E: packages/coding-agent/src/utils/image-process.ts:77]。PNG/JPEG/GIF/WEBP 保持 normalized mime；其它已 sniff 格式尝试转 PNG，失败则 `[Image omitted: could not be converted to a supported inline image format.]` [E: packages/coding-agent/src/utils/image-process.ts:33] [E: packages/coding-agent/src/utils/image-process.ts:35] [E: packages/coding-agent/src/utils/image-process.ts:43] [E: packages/coding-agent/src/utils/image-process.ts:55] [E: packages/coding-agent/src/utils/image-process.ts:80] [E: packages/coding-agent/src/utils/image-process.ts:82]。auto resize 开启时把 `options.resizeOptions` 传给 `resizeImage()` [E: packages/coding-agent/src/utils/image-process.ts:86] [E: packages/coding-agent/src/utils/image-process.ts:87]。

`ModelImageResizeOptions` 字段是 `maxWidth` / `maxHeight` / `maxBytes`（base64 payload）/ `jpegQuality` [E: packages/ai/src/types.ts:1038] [E: packages/ai/src/types.ts:1039] [E: packages/ai/src/types.ts:1040] [E: packages/ai/src/types.ts:1042] [E: packages/ai/src/types.ts:1043]。coding-agent in-process 默认 2000×2000、4.5 MiB、jpeg 80 [E: packages/coding-agent/src/utils/image-resize-core.ts:24] [E: packages/coding-agent/src/utils/image-resize-core.ts:25] [E: packages/coding-agent/src/utils/image-resize-core.ts:26] [E: packages/coding-agent/src/utils/image-resize-core.ts:27] [E: packages/coding-agent/src/utils/image-resize-core.ts:28]。生成器 `DEFAULT_IMAGE_RESIZE` 用同一组数字写进 catalog `inputLimits.images.resize`；provider 可收紧，未知 provider 仍保留这组 cache-safe 默认 [E: packages/ai/scripts/generate-models.ts:406] [E: packages/ai/scripts/generate-models.ts:407] [E: packages/ai/scripts/generate-models.ts:408] [E: packages/ai/scripts/generate-models.ts:409] [E: packages/ai/scripts/generate-models.ts:410] [E: packages/ai/scripts/generate-models.ts:994]。`models.json` 的 `ModelInputLimitsSchema` 同样暴露 `images.resize` [E: packages/coding-agent/src/core/model-config.ts:143] [E: packages/coding-agent/src/core/model-config.ts:151] [E: packages/coding-agent/src/core/model-config.ts:153]。

写入 history 的三条路径都把 `this.model?.inputLimits?.images?.resize`（或 read tool 的 fallback）传给 `processImage`：

| 路径 | 调用点 | 证据 |
| --- | --- | --- |
| user prompt / CLI 初始图 | `AgentSession._normalizePromptImages` | [E: packages/coding-agent/src/core/agent-session.ts:1586] [E: packages/coding-agent/src/core/agent-session.ts:1588] |
| `read` tool 读到的图 | `processImage(..., resizeOptions: ctx?.model?.inputLimits?.images?.resize ?? fallbackResizeOptions)` | [E: packages/coding-agent/src/core/tools/read.ts:115] [E: packages/coding-agent/src/core/tools/read.ts:117] |
| tool-result 图 | `afterToolCall` → `normalizeToolResultImages` | [E: packages/coding-agent/src/core/agent-session.ts:571] [E: packages/coding-agent/src/core/agent-session.ts:572] |

`afterToolCall` 先跑 extension `tool_result` hook，再用 hook 产出（或原始）content 调用 `normalizeToolResultImages()`，因此 hook 注入的图也会被压 [E: packages/coding-agent/src/core/agent-session.ts:556] [E: packages/coding-agent/src/core/agent-session.ts:569] [E: packages/coding-agent/src/core/agent-session.ts:572]。decode/转换失败时 **保留原 image block**（与 `read` 省略不同），成功时把 hints 追加为 text block；没有任何变化则返回原数组 identity [E: packages/coding-agent/src/utils/tool-result-images.ts:28] [E: packages/coding-agent/src/utils/tool-result-images.ts:50] [E: packages/coding-agent/src/utils/tool-result-images.ts:66]。

`images.autoResize`（settings，默认 true）是总开关；为 false 时 `processImage` 不调用 `resizeImage`，catalog resize profile 也不会应用 [E: packages/coding-agent/src/core/settings-manager.ts:62] [E: packages/coding-agent/src/core/settings-manager.ts:63] [E: packages/coding-agent/src/core/settings-manager.ts:1306] [E: packages/coding-agent/src/utils/image-process.ts:77] [E: packages/coding-agent/src/utils/image-process.ts:86]。settings selector 把 auto-resize 描述为把大图压到 2000×2000，把 block images 描述为阻止送给 LLM providers [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:750] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:760]。

## 4 blockImages 与显示开关

`images.blockImages` 默认 false。SDK wrapper `convertToLlm` 之后若 `getBlockImages()` 为 true，就把 user/toolResult content 里的 image part 替换成 `"Image reading is disabled."` [E: packages/coding-agent/src/core/settings-manager.ts:64] [E: packages/coding-agent/src/core/settings-manager.ts:1319] [E: packages/coding-agent/src/core/sdk.ts:271] [E: packages/coding-agent/src/core/sdk.ts:283]。它不阻止 CLI/TUI 先构造 `ImageContent`，只在 LLM conversion 边界过滤 [I]。

`TerminalSettings.showImages` 默认 true，只在终端支持图片时有意义；`imageWidthCells` 默认 60 [E: packages/coding-agent/src/core/settings-manager.ts:53] [E: packages/coding-agent/src/core/settings-manager.ts:54]。settings selector 仅当 `getCapabilities().images` 为真才展示这两个开关 [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:728] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:731]。

## 5 X11 clipboard 广告目标

`readClipboardImage()` 在 Linux 上：Termux 直接返回 null。Wayland 或 WSL 先 `wl-paste`；只有该调用返回 `undefined`（命令失败/不可用）才再走 `xclip -selection clipboard -t TARGETS -o`。WSL 在仍无图（`!image`）时再试 PowerShell。最后仅当结果仍是 `undefined` 才 native clipboard [E: packages/coding-agent/src/utils/clipboard-image.ts:207] [E: packages/coding-agent/src/utils/clipboard-image.ts:213] [E: packages/coding-agent/src/utils/clipboard-image.ts:215] [E: packages/coding-agent/src/utils/clipboard-image.ts:218] [E: packages/coding-agent/src/utils/clipboard-image.ts:220] [E: packages/coding-agent/src/utils/clipboard-image.ts:221]。

xclip 路径：TARGETS 失败（command 返回 `undefined`）立刻放弃，不探测 `image/png` 等未广告类型；TARGETS 成功后只对 `selectPreferredImageMimeType` 命中的那个 type 再 `-t <mime> -o` [E: packages/coding-agent/src/utils/clipboard-image.ts:172] [E: packages/coding-agent/src/utils/clipboard-image.ts:177] [E: packages/coding-agent/src/utils/clipboard-image.ts:184] [E: packages/coding-agent/src/utils/clipboard-image.ts:185] [E: packages/coding-agent/src/utils/clipboard-image.ts:187]。JS 侧优先序是 png / jpeg / webp / gif [E: packages/coding-agent/src/utils/clipboard-image.ts:17]。单测覆盖 #9786：TARGETS 失败不二次探测；TARGETS 只广告 `image/png` 时不会去读别的 type [E: packages/coding-agent/test/clipboard-image.test.ts:47] [E: packages/coding-agent/test/clipboard-image.test.ts:54] [E: packages/coding-agent/test/clipboard-image.test.ts:62] [E: packages/coding-agent/test/clipboard-image.test.ts:70]。

native X11（`linux-platform-x11.c`）先 intern `TARGETS`，再把 owner 广告的 atom 与 `image_types`（png/jpeg/webp/gif/bmp/tiff）求交；只有交集里的 preferred target 才会 `ConvertSelection` [E: packages/tui/native/linux/src/linux-platform-x11.c:15] [E: packages/tui/native/linux/src/linux-platform-x11.c:16] [E: packages/tui/native/linux/src/linux-platform-x11.c:200] [E: packages/tui/native/linux/src/linux-platform-x11.c:209] [E: packages/tui/native/linux/src/linux-platform-x11.c:219] [E: packages/tui/native/linux/src/linux-platform-x11.c:224]。文本路径在 TARGETS 被拒绝（`type == XCB_NONE`）时可以回退 `UTF8_STRING`；**图像路径没有这个回退**，避免 owner 接受未广告 image target 时把文本当图读 [E: packages/tui/native/linux/src/linux-platform-x11.c:236] [E: packages/tui/native/linux/src/linux-platform-x11.c:238] [E: packages/tui/native/linux/src/linux-platform-x11.c:240]。

## 6 TUI 终端渲染

`detectCapabilitiesFromEnvironment()`：tmux/screen 的 `images` 为 `null`；Kitty/Ghostty/WezTerm/Warp 走 `"kitty"`；iTerm2 走 `"iterm2"`；Windows Terminal / Alacritty / VS Code / Zed / JetBrains 不声明 image protocol [E: packages/tui/src/terminal-image.ts:80] [E: packages/tui/src/terminal-image.ts:85] [E: packages/tui/src/terminal-image.ts:89] [E: packages/tui/src/terminal-image.ts:93] [E: packages/tui/src/terminal-image.ts:97] [E: packages/tui/src/terminal-image.ts:102] [E: packages/tui/src/terminal-image.ts:106] [E: packages/tui/src/terminal-image.ts:110] [E: packages/tui/src/terminal-image.ts:114]。

`Image` component 从 bytes 解析 dimensions，否则默认 800×600；能渲染就 `renderImage()`，否则 `imageFallback()` [E: packages/tui/src/components/image.ts:25] [E: packages/tui/src/components/image.ts:47] [E: packages/tui/src/components/image.ts:114]。tool result 显示还受 `showImages` 与 capability 门控；Kitty 下跳过非 PNG mime [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:389] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:395]。协议细节归 [subsys.tui.terminal-image](../../subsystems/tui/terminal-image.md)。

## 7 统一 Models：输入图像 vs 生成图像

输入图像是 user/tool `ImageContent`，由有 `input` 含 `"image"` 的 **chat** 模型消费。生成图像是 `type: "image"` 的 `ImageModel`，走 `Models.generateImages()` / `ModelRuntime.generateImages()` [E: packages/ai/src/types.ts:1111] [E: packages/ai/src/models.ts:340]。二者共享 `openrouter` provider 与同一套 credential：OpenRouter 把 `OPENROUTER_IMAGE_MODELS` 和 chat catalog 放进同一个 `createProvider({ models, images: { "openrouter-images": openrouterImagesApi() } })` [E: packages/ai/src/providers/openrouter.ts:23] [E: packages/ai/src/providers/openrouter.ts:25] [E: packages/ai/src/providers/openrouter.ts:32]。

未限定 type 的读取仍 chat-only。`getBuiltinModels` / `Models.getModel` / 模型选择器看到的是 chat 行；图像行要用 `getBuiltinImageModel` / `getModelsOfType("image")` [E: packages/ai/src/providers/all.ts:104] [E: packages/ai/src/models.ts:471] [E: packages/ai/test/images-models.test.ts:374] [E: packages/ai/test/images-models.test.ts:380]。同一 upstream id 可分行，例如 `google/gemini-3-pro-image` 的 chat `api` 是 `openai-completions`，image `api` 是 `openrouter-images` [E: packages/ai/test/images-models.test.ts:400] [E: packages/ai/test/images-models.test.ts:403]。

已删除、不要再 cite：`ImagesModels`、`builtinImagesProviders`、`packages/ai/src/images-models.ts`、`image-models.generated.ts`、`providers/openrouter-images.ts` [I]。逐模型 catalog 归 [ref.ai.image-models](../../reference/image-models.md)；哪些 chat 模型声明 `input` 含 image 归 [ref.ai.model-catalog](../../reference/model-catalog.md) [I]。

## Sources

- packages/coding-agent/src/cli/file-processor.ts
- packages/coding-agent/src/cli/initial-message.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/utils/mime.ts
- packages/coding-agent/src/utils/image-process.ts
- packages/coding-agent/src/utils/tool-result-images.ts
- packages/coding-agent/src/utils/image-resize-core.ts
- packages/coding-agent/src/utils/clipboard-image.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/model-config.ts
- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/modes/interactive/components/settings-selector.ts
- packages/coding-agent/src/modes/interactive/components/tool-execution.ts
- packages/coding-agent/src/modes/print-mode.ts
- packages/coding-agent/test/clipboard-image.test.ts
- packages/tui/src/terminal-image.ts
- packages/tui/src/components/image.ts
- packages/tui/native/linux/src/linux-platform-x11.c
- packages/ai/src/types.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/test/images-models.test.ts

## 相关

- [subsys.tui.terminal-image](../../subsystems/tui/terminal-image.md): Kitty/iTerm2 protocol、dimension 解析、fallback。
- [surface.cli.overview](../cli/overview.md): CLI 参数与 `@file` 如何进入启动消息。
- [surface.modes.interactive](../modes/interactive.md): interactive 把 `initialImages` 送入 `AgentSession.prompt()`。
- [surface.modes.print](../modes/print.md): print/json 发送带图片的初始 prompt。
- [subsys.ai.image-generation](../../subsystems/ai/image-generation.md): `Models.generateImages()`，不是用户消息里的输入图。
- [ref.ai.image-models](../../reference/image-models.md): `IMAGE_MODELS` 结构 catalog。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): builtin provider 清单；图像不再有独立 ImagesProviders 数组。
- [ref.ai.model-catalog](../../reference/model-catalog.md): chat catalog，可查 `input` 是否含 image。
