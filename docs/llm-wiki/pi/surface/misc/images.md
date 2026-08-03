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
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/utils/image-resize.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/modes/interactive/components/settings-selector.ts
  - packages/coding-agent/src/modes/interactive/components/tool-execution.ts
  - packages/coding-agent/src/modes/print-mode.ts
  - packages/coding-agent/docs/usage.md
  - packages/tui/src/terminal-image.ts
  - packages/tui/src/components/image.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/providers/openrouter-images.ts
  - packages/ai/src/image-models.generated.ts
  - packages/ai/test/openrouter-oauth.test.ts
symbols:
  - processFileArguments
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
updated: 305c014dcc
---

> `surface.misc.images` 描述 pi-coding-agent 的图像可见面: CLI `@file` 和交互输入把本地图片变成用户消息里的 `ImageContent`, settings 决定是否 resize 或 block, TUI 只在终端能力允许时把 image content 渲染成 Kitty/iTerm2 inline graphics。

## 能回答的问题

- `pi @screenshot.png "..."` 怎样把图片送进初始 user message?
- pi 支持哪些本地图片类型,哪些会转换或 resize?
- `terminal.showImages`、`images.autoResize`、`images.blockImages` 分别控制什么?
- TUI 什么时候用 Kitty graphics protocol,什么时候用 iTerm2 inline image,什么时候降级成文字 fallback?
- 这个节点和 `subsys.ai.image-generation`、`ref.ai.image-models` 的边界在哪里?

## 1 Identity

`processFileArguments(fileArgs, options)` 是 CLI `@file` 图像输入的 surface 入口: 它返回 `{ text, images }`,其中 `images` 是 `ImageContent[]`,而 text 仍包含每个文件的 `<file name="...">...</file>` 引用 [E: packages/coding-agent/src/cli/file-processor.ts:13] [E: packages/coding-agent/src/cli/file-processor.ts:15] [E: packages/coding-agent/src/cli/file-processor.ts:24] [E: packages/coding-agent/src/cli/file-processor.ts:86]。

`renderImage(base64Data, imageDimensions, options)` 是 TUI 终端图像渲染的 surface 入口: 它读取 `getCapabilities().images`,在没有 image protocol 时返回 `null`,在 Kitty 或 iTerm2 能力下返回 escape sequence、占用 columns/rows 与可选 image id [E: packages/tui/src/terminal-image.ts:560] [E: packages/tui/src/terminal-image.ts:564] [E: packages/tui/src/terminal-image.ts:565] [E: packages/tui/src/terminal-image.ts:567] [E: packages/tui/src/terminal-image.ts:590] [E: packages/tui/src/terminal-image.ts:599]。

本节点覆盖“用户输入图片”和“终端显示图片”。它不覆盖生成图片的 provider 调用路径;生成图片属于 [subsys.ai.image-generation](../../subsystems/ai/image-generation.md),图像模型清单属于 [ref.ai.image-models](../../reference/image-models.md) [I]。

## 2 CLI `@file` 图像输入

usage 文档把 file arguments 定义为用 `@` 前缀把文件包含进消息,并给出 `pi -p @screenshot.png "What's in this image?"` 的图像示例 [E: packages/coding-agent/docs/usage.md:253] [E: packages/coding-agent/docs/usage.md:255] [E: packages/coding-agent/docs/usage.md:259]。主入口在非 RPC 模式读取 stdin 后调用 `prepareInitialMessage(parsed, settingsManager.getImageAutoResize(), stdinContent)`,并把产出的 `initialMessage`、`initialImages` 传给 interactive 或 print 模式 [E: packages/coding-agent/src/main.ts:820] [E: packages/coding-agent/src/main.ts:821] [E: packages/coding-agent/src/main.ts:828] [E: packages/coding-agent/src/main.ts:830] [E: packages/coding-agent/src/main.ts:872] [E: packages/coding-agent/src/main.ts:877] [E: packages/coding-agent/src/main.ts:904] [E: packages/coding-agent/src/main.ts:908]。

`prepareInitialMessage()` 只在 `parsed.fileArgs.length > 0` 时调用 `processFileArguments()`,并把返回的 `text` 和 `images` 作为 `fileText`、`fileImages` 交给 `buildInitialMessage()` [E: packages/coding-agent/src/main.ts:177] [E: packages/coding-agent/src/main.ts:181] [E: packages/coding-agent/src/main.ts:184] [E: packages/coding-agent/src/main.ts:185]。`buildInitialMessage()` 会拼接 stdin、`@file` text 和第一条 CLI message,并且只有 `fileImages.length > 0` 时才设置 `initialImages` [E: packages/coding-agent/src/cli/initial-message.ts:26] [E: packages/coding-agent/src/cli/initial-message.ts:27] [E: packages/coding-agent/src/cli/initial-message.ts:30] [E: packages/coding-agent/src/cli/initial-message.ts:34] [E: packages/coding-agent/src/cli/initial-message.ts:40] [E: packages/coding-agent/src/cli/initial-message.ts:41]。

`processFileArguments()` 对每个 file arg 先用 `resolveReadPath(fileArg, process.cwd())` 和 `resolve()` 得到 absolute path,不存在时打印错误并 `process.exit(1)`,空文件被跳过 [E: packages/coding-agent/src/cli/file-processor.ts:29] [E: packages/coding-agent/src/cli/file-processor.ts:31] [E: packages/coding-agent/src/cli/file-processor.ts:35] [E: packages/coding-agent/src/cli/file-processor.ts:37] [E: packages/coding-agent/src/cli/file-processor.ts:38] [E: packages/coding-agent/src/cli/file-processor.ts:42] [E: packages/coding-agent/src/cli/file-processor.ts:43] [E: packages/coding-agent/src/cli/file-processor.ts:45]。如果 `detectSupportedImageMimeTypeFromFile()` 返回 image mime,文件内容会经 `processImage()` 生成 `{ type: "image", mimeType, data }` attachment;否则按 UTF-8 文本读入 `<file>` block [E: packages/coding-agent/src/cli/file-processor.ts:48] [E: packages/coding-agent/src/cli/file-processor.ts:52] [E: packages/coding-agent/src/cli/file-processor.ts:53] [E: packages/coding-agent/src/cli/file-processor.ts:60] [E: packages/coding-agent/src/cli/file-processor.ts:61] [E: packages/coding-agent/src/cli/file-processor.ts:62] [E: packages/coding-agent/src/cli/file-processor.ts:63] [E: packages/coding-agent/src/cli/file-processor.ts:65] [E: packages/coding-agent/src/cli/file-processor.ts:76] [E: packages/coding-agent/src/cli/file-processor.ts:77]。

图片文件仍会产生一个 text reference:处理提示存在时写进 `<file name="...">hint</file>`,没有提示时写空 `<file name="..."></file>` [E: packages/coding-agent/src/cli/file-processor.ts:68] [E: packages/coding-agent/src/cli/file-processor.ts:69] [E: packages/coding-agent/src/cli/file-processor.ts:71]。因此模型收到的是一个文本文件引用加一个或多个 image parts,不是把 base64 塞进文本正文 [I]。

## 3 支持格式、转换与 resize

MIME sniffing 读取文件前 4100 bytes,当前显式识别 JPEG、非 animated PNG、GIF、WEBP 和 BMP;animated PNG 因 `isAnimatedPng()` 为 true 会返回 `null`,于是走文本读取分支或读取失败分支,不是作为 inline image 处理 [E: packages/coding-agent/src/utils/mime.ts:3] [E: packages/coding-agent/src/utils/mime.ts:7] [E: packages/coding-agent/src/utils/mime.ts:10] [E: packages/coding-agent/src/utils/mime.ts:11] [E: packages/coding-agent/src/utils/mime.ts:13] [E: packages/coding-agent/src/utils/mime.ts:16] [E: packages/coding-agent/src/utils/mime.ts:19] [E: packages/coding-agent/src/utils/mime.ts:20] [E: packages/coding-agent/src/utils/mime.ts:25] [E: packages/coding-agent/src/utils/mime.ts:28] [E: packages/coding-agent/src/utils/mime.ts:30]。

`processImage()` 把 `autoResizeImages` 默认为 true;PNG、JPEG/JPG、GIF、WEBP 保持为 normalized supported mime,BMP 等其他已 sniff 的格式会尝试 `convertImageBytesToPng()`,转换失败则返回 `[Image omitted: could not be converted to a supported inline image format.]` [E: packages/coding-agent/src/utils/image-process.ts:33] [E: packages/coding-agent/src/utils/image-process.ts:35] [E: packages/coding-agent/src/utils/image-process.ts:37] [E: packages/coding-agent/src/utils/image-process.ts:40] [E: packages/coding-agent/src/utils/image-process.ts:42] [E: packages/coding-agent/src/utils/image-process.ts:49] [E: packages/coding-agent/src/utils/image-process.ts:55] [E: packages/coding-agent/src/utils/image-process.ts:62] [E: packages/coding-agent/src/utils/image-process.ts:77] [E: packages/coding-agent/src/utils/image-process.ts:80] [E: packages/coding-agent/src/utils/image-process.ts:82]。

当 auto resize 开启时,`processImage()` 调 `resizeImage()` 并把 `formatDimensionNote()` 的坐标映射提示加入 hints;resize 失败则省略图片并把错误说明写入 text reference [E: packages/coding-agent/src/utils/image-process.ts:86] [E: packages/coding-agent/src/utils/image-process.ts:87] [E: packages/coding-agent/src/utils/image-process.ts:90] [E: packages/coding-agent/src/utils/image-process.ts:91] [E: packages/coding-agent/src/utils/image-process.ts:95] [E: packages/coding-agent/src/utils/image-process.ts:98] [E: packages/coding-agent/src/utils/image-process.ts:99]。`resizeImage()` 优先通过 worker URL 调用 `resizeImageInWorker()`,worker 路径失败时 fallback 到 in-process resize [E: packages/coding-agent/src/utils/image-resize.ts:85] [E: packages/coding-agent/src/utils/image-resize.ts:91] [E: packages/coding-agent/src/utils/image-resize.ts:92] [E: packages/coding-agent/src/utils/image-resize.ts:105] [E: packages/coding-agent/src/utils/image-resize.ts:106] [E: packages/coding-agent/src/utils/image-resize.ts:108]。

## 4 消息装配与 blockImages 防线

interactive startup 直接调用 `session.prompt(initialMessage, { images: initialImages })`,print/json 模式也用同样的 `{ images: initialImages }` 发送初始 prompt [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:949] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:951] [E: packages/coding-agent/src/modes/print-mode.ts:121] [E: packages/coding-agent/src/modes/print-mode.ts:122]。`AgentSession` 在构造 user message 时先放 `{ type: "text", text: expandedText }`,然后把当前 images 追加到同一个 user content array [E: packages/coding-agent/src/core/agent-session.ts:1219] [E: packages/coding-agent/src/core/agent-session.ts:1220] [E: packages/coding-agent/src/core/agent-session.ts:1221] [E: packages/coding-agent/src/core/agent-session.ts:1224] [E: packages/coding-agent/src/core/agent-session.ts:1225]。

steering 和 follow-up 也能携带 images: `_queueSteer()`、`_queueFollowUp()` 都把 text part 和 optional images 放进 user content,再调用 `agent.steer()` 或 `agent.followUp()` [E: packages/coding-agent/src/core/agent-session.ts:1382] [E: packages/coding-agent/src/core/agent-session.ts:1385] [E: packages/coding-agent/src/core/agent-session.ts:1386] [E: packages/coding-agent/src/core/agent-session.ts:1389] [E: packages/coding-agent/src/core/agent-session.ts:1399] [E: packages/coding-agent/src/core/agent-session.ts:1402] [E: packages/coding-agent/src/core/agent-session.ts:1403] [E: packages/coding-agent/src/core/agent-session.ts:1406]。

`images.blockImages` 是 provider 发送前的防线:SDK wrapper 先 `convertToLlm(messages)`,若 `settingsManager.getBlockImages()` 为 false 就原样返回;若为 true,它把 user/toolResult content array 里的 image part 替换为文本 `"Image reading is disabled."` [E: packages/coding-agent/src/core/sdk.ts:256] [E: packages/coding-agent/src/core/sdk.ts:257] [E: packages/coding-agent/src/core/sdk.ts:259] [E: packages/coding-agent/src/core/sdk.ts:263] [E: packages/coding-agent/src/core/sdk.ts:264] [E: packages/coding-agent/src/core/sdk.ts:267] [E: packages/coding-agent/src/core/sdk.ts:271]。这意味着 blockImages 不阻止 CLI/TUI 先构造 `ImageContent`,而是在 LLM conversion 边界过滤图片 [I]。

## 5 用户设置与显示开关

`TerminalSettings.showImages` 默认 true,只在终端支持图片时有意义;`TerminalSettings.imageWidthCells` 默认 60,是 inline image 的首选 terminal cell 宽度 [E: packages/coding-agent/src/core/settings-manager.ts:38] [E: packages/coding-agent/src/core/settings-manager.ts:39] [E: packages/coding-agent/src/core/settings-manager.ts:40]。settings selector 只有在 `getCapabilities().images` 为真时才展示 `show-images` 和 `image-width-cells`,说明这两个开关控制终端显示,不是控制是否把图片送给模型 [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:643] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:646] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:653] [I]。

`ImageSettings.autoResize` 默认 true,`ImageSettings.blockImages` 默认 false;settings selector 把 auto resize 标注为影响 attached/read images,把 block images 标注为阻止图片发送给 LLM providers [E: packages/coding-agent/src/core/settings-manager.ts:45] [E: packages/coding-agent/src/core/settings-manager.ts:46] [E: packages/coding-agent/src/core/settings-manager.ts:47] [E: packages/coding-agent/src/core/settings-manager.ts:1149] [E: packages/coding-agent/src/core/settings-manager.ts:1150] [E: packages/coding-agent/src/core/settings-manager.ts:1162] [E: packages/coding-agent/src/core/settings-manager.ts:1163] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:662] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:665] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:671] [E: packages/coding-agent/src/modes/interactive/components/settings-selector.ts:675]。

`images.autoResize` 现在也覆盖 tool-result images。`normalizeToolResultImages()` 对每个 image block 调 `processImage()`,默认启用 resize；无法 decode/转换时保留原 block，成功转换或 resize 时写回 image，并把 processing hints 追加为 text block [E: packages/coding-agent/src/utils/tool-result-images.ts:22] [E: packages/coding-agent/src/utils/tool-result-images.ts:30] [E: packages/coding-agent/src/utils/tool-result-images.ts:34] [E: packages/coding-agent/src/utils/tool-result-images.ts:40] [E: packages/coding-agent/src/utils/tool-result-images.ts:41] [E: packages/coding-agent/src/utils/tool-result-images.ts:45] [E: packages/coding-agent/src/utils/tool-result-images.ts:54] [E: packages/coding-agent/src/utils/tool-result-images.ts:56]。没有 image 或没有任何变化时返回原数组 identity,让 caller 避免无意义 result rewrite [E: packages/coding-agent/src/utils/tool-result-images.ts:26] [E: packages/coding-agent/src/utils/tool-result-images.ts:27] [E: packages/coding-agent/src/utils/tool-result-images.ts:49] [E: packages/coding-agent/src/utils/tool-result-images.ts:61]。

AgentSession 的顺序是先发 extension `tool_result` hook，再 normalize hook 产出的最终 content；因此 built-in、SDK/custom tool 与 extension 修改后的图片都共享这条进入 history 前的边界 [E: packages/coding-agent/src/core/agent-session.ts:491] [E: packages/coding-agent/src/core/agent-session.ts:493] [E: packages/coding-agent/src/core/agent-session.ts:504] [E: packages/coding-agent/src/core/agent-session.ts:506] [E: packages/coding-agent/src/core/agent-session.ts:508] [E: packages/coding-agent/src/core/agent-session.ts:516] [E: packages/coding-agent/src/core/agent-session.ts:517]。

## 6 TUI 终端渲染

`detectCapabilities()` 在 tmux 或 screen 下把 `images` 设为 `null`;Kitty、Ghostty、WezTerm、Warp 走 `"kitty"`,iTerm2 走 `"iterm2"`,Windows Terminal、VS Code、Alacritty、JetBrains terminal 和未知终端都不声明 image protocol [E: packages/tui/src/terminal-image.ts:68] [E: packages/tui/src/terminal-image.ts:77] [E: packages/tui/src/terminal-image.ts:78] [E: packages/tui/src/terminal-image.ts:82] [E: packages/tui/src/terminal-image.ts:83] [E: packages/tui/src/terminal-image.ts:86] [E: packages/tui/src/terminal-image.ts:90] [E: packages/tui/src/terminal-image.ts:94] [E: packages/tui/src/terminal-image.ts:99] [E: packages/tui/src/terminal-image.ts:103] [E: packages/tui/src/terminal-image.ts:107] [E: packages/tui/src/terminal-image.ts:111] [E: packages/tui/src/terminal-image.ts:115] [E: packages/tui/src/terminal-image.ts:119] [E: packages/tui/src/terminal-image.ts:127]。

Kitty encoding chunks base64 payloads at 4096 characters and can include columns, rows, imageId and cursor-movement options;delete helpers emit Kitty delete sequences for one image id or all visible images [E: packages/tui/src/terminal-image.ts:168] [E: packages/tui/src/terminal-image.ts:178] [E: packages/tui/src/terminal-image.ts:183] [E: packages/tui/src/terminal-image.ts:184] [E: packages/tui/src/terminal-image.ts:185] [E: packages/tui/src/terminal-image.ts:187] [E: packages/tui/src/terminal-image.ts:195] [E: packages/tui/src/terminal-image.ts:200] [E: packages/tui/src/terminal-image.ts:203] [E: packages/tui/src/terminal-image.ts:205] [E: packages/tui/src/terminal-image.ts:218] [E: packages/tui/src/terminal-image.ts:226]。iTerm2 encoding emits OSC 1337 `File=` with inline flag, optional width/height/name and preserveAspectRatio flag [E: packages/tui/src/terminal-image.ts:235] [E: packages/tui/src/terminal-image.ts:245] [E: packages/tui/src/terminal-image.ts:247] [E: packages/tui/src/terminal-image.ts:248] [E: packages/tui/src/terminal-image.ts:249] [E: packages/tui/src/terminal-image.ts:253] [E: packages/tui/src/terminal-image.ts:257]。

`Image` component 先从 image bytes 解析 dimensions,否则默认 800x600;render 时根据可用 width、配置 maxWidthCells 和 terminal cell dimensions 计算 max height,能渲染就调用 `renderImage()`,否则使用 `imageFallback()` 输出 `[Image: ...]` 文本 [E: packages/tui/src/components/image.ts:25] [E: packages/tui/src/components/image.ts:47] [E: packages/tui/src/components/image.ts:66] [E: packages/tui/src/components/image.ts:67] [E: packages/tui/src/components/image.ts:68] [E: packages/tui/src/components/image.ts:74] [E: packages/tui/src/components/image.ts:78] [E: packages/tui/src/components/image.ts:113] [E: packages/tui/src/components/image.ts:114] [E: packages/tui/src/components/image.ts:118] [E: packages/tui/src/terminal-image.ts:633] [E: packages/tui/src/terminal-image.ts:645]。

fullscreen 使用应用自有 viewport scrolling：Kitty graphics 支持 placement 删除、重放与裁剪，因而可继续显示；iTerm2 inline-image protocol 不能删除/裁剪 placement，所以 fullscreen 中降级为 text placeholder。regular mode 仍使用 terminal scrollback，iTerm2 inline images 继续正常渲染 [E: packages/coding-agent/docs/usage.md:249] [E: packages/coding-agent/docs/usage.md:251]。

tool result image rendering 还受 `showImages` 与 terminal capability 共同门控;当前代码在 Kitty 下跳过非 PNG image mime,这说明 tool result display 与 message input attachment 的支持格式不是同一层能力 [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:331] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:335] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:338] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:339] [I]。

## 7 与 image/model/provider catalog 的边界

文字模型 provider catalog 的 ground truth 是 `builtinProviders()`;当前 `builtinProviders()` 列表包含 `openrouterProvider()` 等文本/streaming provider,与内置 image-generation provider catalog 分开 [E: packages/ai/src/providers/all.ts:88] [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:116] [I]。内置 image-generation provider 的 ground truth 是 `builtinImagesProviders()`,当前只返回 `[openrouterImagesProvider()]` [E: packages/ai/src/providers/all.ts:142] [E: packages/ai/src/providers/all.ts:143]。

image model catalog 的 ground truth 是 `IMAGE_MODELS`,当前顶层有 `openrouter` bucket,每个条目声明 `api: "openrouter-images"`, `provider: "openrouter"`, `input`/`output` 能力和成本字段 [E: packages/ai/src/image-models.generated.ts:6] [E: packages/ai/src/image-models.generated.ts:7] [E: packages/ai/src/image-models.generated.ts:11] [E: packages/ai/src/image-models.generated.ts:12] [E: packages/ai/src/image-models.generated.ts:14] [E: packages/ai/src/image-models.generated.ts:15] [E: packages/ai/src/image-models.generated.ts:16]。`openrouterImagesProvider()` 把 `Object.values(IMAGE_MODELS.openrouter)` 作为 image provider 模型清单,auth 同时支持 `OPENROUTER_API_KEY` 与 lazy OpenRouter OAuth,并使用 `openrouterImagesApi()` adapter [E: packages/ai/src/providers/openrouter-images.ts:7] [E: packages/ai/src/providers/openrouter-images.ts:9] [E: packages/ai/src/providers/openrouter-images.ts:12] [E: packages/ai/src/providers/openrouter-images.ts:13] [E: packages/ai/src/providers/openrouter-images.ts:16] [E: packages/ai/src/providers/openrouter-images.ts:19] [E: packages/ai/src/providers/openrouter-images.ts:20]。text/image provider 共用 `openrouter` id；若 caller 给两个 collection 注入同一 credential store，两边会解析同一 stored OAuth key [E: packages/ai/test/openrouter-oauth.test.ts:36] [E: packages/ai/test/openrouter-oauth.test.ts:38] [E: packages/ai/test/openrouter-oauth.test.ts:45] [E: packages/ai/test/openrouter-oauth.test.ts:47] [E: packages/ai/test/openrouter-oauth.test.ts:50] [E: packages/ai/test/openrouter-oauth.test.ts:51]。

本 surface 的 `ImageContent` 输入图片可以被有 vision/input-image 能力的聊天模型消费,但本节点没有完整枚举哪些 text models 支持 image input;该模型目录属于 [ref.ai.model-catalog](../../reference/model-catalog.md) [U]。同样,OpenRouter image-generation models 的逐项枚举属于 [ref.ai.image-models](../../reference/image-models.md),不是 `surface.misc.images` 的职责 [I]。

## Sources

- packages/coding-agent/src/cli/file-processor.ts
- packages/coding-agent/src/cli/initial-message.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/utils/mime.ts
- packages/coding-agent/src/utils/image-process.ts
- packages/coding-agent/src/utils/tool-result-images.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/utils/image-resize.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/modes/interactive/components/settings-selector.ts
- packages/coding-agent/src/modes/interactive/components/tool-execution.ts
- packages/coding-agent/src/modes/print-mode.ts
- packages/coding-agent/docs/usage.md
- packages/tui/src/terminal-image.ts
- packages/tui/src/components/image.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/providers/openrouter-images.ts
- packages/ai/src/image-models.generated.ts
- packages/ai/test/openrouter-oauth.test.ts

## 相关

- [subsys.tui.terminal-image](../../subsystems/tui/terminal-image.md): TUI Kitty/iTerm2 image protocol、dimension 解析、fallback 和 cleanup 的深入节点。
- [surface.cli.overview](../cli/overview.md): CLI 参数解析、模式选择、`@file` 如何进入启动消息准备。
- [surface.modes.interactive](../modes/interactive.md): interactive mode 如何把 `initialImages` 送入 `AgentSession.prompt()`。
- [surface.modes.print](../modes/print.md): print/json mode 如何发送带图片的初始 prompt。
- [subsys.ai.image-generation](../../subsystems/ai/image-generation.md): 图像生成 provider/model runtime,不等同于用户消息中的图片输入。
- [ref.ai.image-models](../../reference/image-models.md): generated image model catalog 与 OpenRouter image provider 目录。
- [ref.ai.provider-catalog](../../reference/provider-catalog.md): text/streaming provider catalog,与 image provider catalog 分开。
- [ref.ai.model-catalog](../../reference/model-catalog.md): text/chat model metadata catalog,可用于查 vision/input-image 能力。
