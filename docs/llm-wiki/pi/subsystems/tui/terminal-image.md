---
id: subsys.tui.terminal-image
title: 终端图像渲染(kitty/iterm2)
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/terminal-image.ts]
symbols: [renderImage, encodeKitty, encodeITerm2]
related: [surface.misc.images]
evidence: explicit
status: verified
updated: 8c943640
---

> `terminal-image` 是 `pi-tui` 的 terminal inline image layer:它检测当前 terminal 是否支持 Kitty graphics protocol 或 iTerm2 inline image,把 base64 image payload 编码成 escape sequence,计算图片占用的 cell rows,并在不支持图片时提供 text fallback。

## 能回答的问题

- `renderImage()` 什么时候返回 Kitty sequence、iTerm2 sequence 或 `null`?
- `encodeKitty()` 如何把大 base64 payload 分块并附带 columns/rows/imageId?
- `encodeITerm2()` 生成的 OSC 1337 `File=` sequence 包含哪些参数?
- 图片 pixel dimensions 如何换算成 terminal cell columns/rows?
- TUI 如何识别一行里是否含有 Kitty/iTerm2 image escape sequence?
- `imageFallback()` 和 `hyperlink()` 与终端图像能力有什么边界?

## 职责边界

本节点覆盖 `packages/tui/src/terminal-image.ts` 中的 terminal image rendering primitives: capability detection、Kitty/iTerm2 encoding、image cell sizing、PNG/JPEG/GIF/WebP dimension sniffing、inline render dispatch、OSC 8 hyperlink helper 和 image fallback text。`surface.misc.images` 覆盖 `pi-coding-agent` 怎样把 CLI 或 tool result 的图片带到用户可见面;本节点只描述 `pkg: tui` 中把 base64 image data 显示到 terminal 的底层机制 [I]。

`ImageProtocol` 只允许 `"kitty"`、`"iterm2"` 或 `null`,而 `TerminalCapabilities` 同时携带 `images`、`trueColor`、`hyperlinks` 三个 capability bit [E: packages/tui/src/terminal-image.ts:3] [E: packages/tui/src/terminal-image.ts:6] [E: packages/tui/src/terminal-image.ts:7] [E: packages/tui/src/terminal-image.ts:8]。`ImageRenderOptions` 接受 `maxWidthCells`、`maxHeightCells`、`preserveAspectRatio`、Kitty `imageId` 和 Kitty cursor movement 开关 [E: packages/tui/src/terminal-image.ts:21] [E: packages/tui/src/terminal-image.ts:22] [E: packages/tui/src/terminal-image.ts:23] [E: packages/tui/src/terminal-image.ts:24] [E: packages/tui/src/terminal-image.ts:26] [E: packages/tui/src/terminal-image.ts:28]。

## 关键文件

- `packages/tui/src/terminal-image.ts`: 定义 terminal image protocol detection、Kitty/iTerm2 encoder、dimension parsers、`renderImage()` dispatch、`hyperlink()` 和 `imageFallback()`。

## 数据模型

`cellDimensions` 是模块级缓存,默认 `{ widthPx: 9, heightPx: 18 }`;`getCellDimensions()` 读取它,`setCellDimensions()` 覆盖它,`renderImage()` 会用当前 cell size 把 pixel dimensions 换算成 terminal cells [E: packages/tui/src/terminal-image.ts:34] [E: packages/tui/src/terminal-image.ts:37] [E: packages/tui/src/terminal-image.ts:41] [E: packages/tui/src/terminal-image.ts:444]。这说明图片尺寸计算不是固定字符宽高,而是允许 TUI 在收到 terminal cell-size query 后更新 [I]。

`cachedCapabilities` 是 `getCapabilities()` 的模块级 memoization:第一次调用时运行 `detectCapabilities()`,之后直接返回 cache;`resetCapabilitiesCache()` 清空 cache,`setCapabilities()` 直接替换 cache [E: packages/tui/src/terminal-image.ts:31] [E: packages/tui/src/terminal-image.ts:128] [E: packages/tui/src/terminal-image.ts:129] [E: packages/tui/src/terminal-image.ts:131] [E: packages/tui/src/terminal-image.ts:135] [E: packages/tui/src/terminal-image.ts:140]。这给测试和调用方一个可控入口,也意味着 runtime environment 变化不会自动重新探测,除非显式 reset [I]。

`KITTY_PREFIX` 是 `ESC _G`, `ITERM2_PREFIX` 是 `ESC ]1337;File=`;`isImageLine(line)` 先检查 line start,再用 `includes()` 检查 sequence 是否出现在行中间 [E: packages/tui/src/terminal-image.ts:143] [E: packages/tui/src/terminal-image.ts:144] [E: packages/tui/src/terminal-image.ts:146] [E: packages/tui/src/terminal-image.ts:148] [E: packages/tui/src/terminal-image.ts:152]。因此它不是按当前 terminal capability 判断,而是按 escape sequence signature 判断一行是否承载 image output [I]。

## 控制流

1. `detectCapabilities@packages/tui/src/terminal-image.ts:65` 读取 `TERM_PROGRAM`、`TERMINAL_EMULATOR`、`TERM`、`COLORTERM`,并把 `COLORTERM=truecolor|24bit` 作为 truecolor hint [E: packages/tui/src/terminal-image.ts:65] [E: packages/tui/src/terminal-image.ts:66] [E: packages/tui/src/terminal-image.ts:67] [E: packages/tui/src/terminal-image.ts:68] [E: packages/tui/src/terminal-image.ts:69] [E: packages/tui/src/terminal-image.ts:70]。
2. tmux 或 `TERM=tmux*` 下,`detectCapabilities()` 固定 `images: null`,只保留 truecolor hint,并通过注入的 `tmuxForwardsHyperlink()` 决定 OSC 8 hyperlink 是否可用 [E: packages/tui/src/terminal-image.ts:74] [E: packages/tui/src/terminal-image.ts:75]。`TERM=screen*` 下同样禁用 image protocol,且 `hyperlinks: false` [E: packages/tui/src/terminal-image.ts:79] [E: packages/tui/src/terminal-image.ts:80]。
3. Kitty、Ghostty、WezTerm 和 Warp 被归到 Kitty graphics protocol;对应条件包括 `KITTY_WINDOW_ID`、`TERM_PROGRAM=kitty|ghostty|wezterm|warpterminal`、`TERM` 包含 ghostty、`GHOSTTY_RESOURCES_DIR`、`WEZTERM_PANE`、`WARP_SESSION_ID` 或 `WARP_TERMINAL_SESSION_UUID` [E: packages/tui/src/terminal-image.ts:83] [E: packages/tui/src/terminal-image.ts:84] [E: packages/tui/src/terminal-image.ts:87] [E: packages/tui/src/terminal-image.ts:88] [E: packages/tui/src/terminal-image.ts:91] [E: packages/tui/src/terminal-image.ts:92] [E: packages/tui/src/terminal-image.ts:96] [E: packages/tui/src/terminal-image.ts:97]。
4. iTerm2 由 `ITERM_SESSION_ID` 或 `TERM_PROGRAM=iterm.app` 识别,返回 `images: "iterm2"`;Windows Terminal、VS Code、Alacritty 和 JetBrains terminal 不声明 image protocol,但部分会声明 truecolor/hyperlink 支持 [E: packages/tui/src/terminal-image.ts:100] [E: packages/tui/src/terminal-image.ts:101] [E: packages/tui/src/terminal-image.ts:104] [E: packages/tui/src/terminal-image.ts:105] [E: packages/tui/src/terminal-image.ts:108] [E: packages/tui/src/terminal-image.ts:109] [E: packages/tui/src/terminal-image.ts:112] [E: packages/tui/src/terminal-image.ts:113] [E: packages/tui/src/terminal-image.ts:116] [E: packages/tui/src/terminal-image.ts:117]。
5. 未识别 terminal 走 conservative fallback:`images: null`,`trueColor` 只信 `COLORTERM` hint,`hyperlinks: false` [E: packages/tui/src/terminal-image.ts:124]。
6. `renderImage@packages/tui/src/terminal-image.ts:432` 先取 `getCapabilities()`;如果没有 image protocol 直接返回 `null` [E: packages/tui/src/terminal-image.ts:432] [E: packages/tui/src/terminal-image.ts:437] [E: packages/tui/src/terminal-image.ts:439] [E: packages/tui/src/terminal-image.ts:440]。
7. `renderImage()` 用 `options.maxWidthCells ?? 80` 和 `calculateImageCellSize()` 算出 render size;Kitty path 调 `encodeKitty()` 并返回 `{ sequence, rows, imageId }`,iTerm2 path 调 `encodeITerm2()` 并返回 `{ sequence, rows }` [E: packages/tui/src/terminal-image.ts:443] [E: packages/tui/src/terminal-image.ts:444] [E: packages/tui/src/terminal-image.ts:446] [E: packages/tui/src/terminal-image.ts:447] [E: packages/tui/src/terminal-image.ts:453] [E: packages/tui/src/terminal-image.ts:456] [E: packages/tui/src/terminal-image.ts:457] [E: packages/tui/src/terminal-image.ts:462]。

## Kitty encoder

`encodeKitty(base64Data, options)` 使用 `a=T,f=100,q=2` 作为基础参数;`moveCursor === false` 时追加 `C=1`,有 `columns`/`rows`/`imageId` 时追加 `c=`/`r=`/`i=` [E: packages/tui/src/terminal-image.ts:165] [E: packages/tui/src/terminal-image.ts:177] [E: packages/tui/src/terminal-image.ts:179] [E: packages/tui/src/terminal-image.ts:180] [E: packages/tui/src/terminal-image.ts:181] [E: packages/tui/src/terminal-image.ts:182]。这里的 `q=2` 也出现在 delete helper 中,所以该模块统一选择 suppress Kitty protocol replies [E: packages/tui/src/terminal-image.ts:177] [E: packages/tui/src/terminal-image.ts:216] [E: packages/tui/src/terminal-image.ts:224] [I]。

payload 长度不超过 4096 字符时,`encodeKitty()` 直接返回单个 `ESC _G ... ;payload ESC \` sequence [E: packages/tui/src/terminal-image.ts:175] [E: packages/tui/src/terminal-image.ts:184] [E: packages/tui/src/terminal-image.ts:185]。超过 4096 字符时,它按 4096 字符切 chunk:首块带完整 params 和 `m=1`,中间块带 `m=1`,最后块带 `m=0`,最后把 chunks 拼接成一个 string [E: packages/tui/src/terminal-image.ts:188] [E: packages/tui/src/terminal-image.ts:192] [E: packages/tui/src/terminal-image.ts:193] [E: packages/tui/src/terminal-image.ts:194] [E: packages/tui/src/terminal-image.ts:196] [E: packages/tui/src/terminal-image.ts:197] [E: packages/tui/src/terminal-image.ts:199] [E: packages/tui/src/terminal-image.ts:200] [E: packages/tui/src/terminal-image.ts:202] [E: packages/tui/src/terminal-image.ts:208]。

`allocateImageId()` 返回 `[1, 0xfffffffe]` 范围内的随机整数;`deleteKittyImage(imageId)` 返回包含 `a=d,d=I,i=<id>,q=2` 的 Kitty deletion sequence,`deleteAllKittyImages()` 返回包含 `a=d,d=A,q=2` 的 Kitty deletion sequence [E: packages/tui/src/terminal-image.ts:162] [E: packages/tui/src/terminal-image.ts:216] [E: packages/tui/src/terminal-image.ts:224]。`renderImage()` 的 Kitty path 把 caller 传入的 `imageId` 透传给 Kitty encoder,并在返回对象中原样带回;函数内部不调用 `allocateImageId()` [E: packages/tui/src/terminal-image.ts:450] [E: packages/tui/src/terminal-image.ts:453] [I]。

## iTerm2 encoder

`encodeITerm2(base64Data, options)` 生成 OSC 1337 `File=` sequence,默认 `inline=1`;`inline: false` 会写 `inline=0` [E: packages/tui/src/terminal-image.ts:227] [E: packages/tui/src/terminal-image.ts:237] [E: packages/tui/src/terminal-image.ts:249]。可选 `width`、`height` 会直接进入参数列表,`name` 会先用 base64 编码后写成 `name=...`,而 `preserveAspectRatio === false` 会追加 `preserveAspectRatio=0` [E: packages/tui/src/terminal-image.ts:239] [E: packages/tui/src/terminal-image.ts:240] [E: packages/tui/src/terminal-image.ts:241] [E: packages/tui/src/terminal-image.ts:242] [E: packages/tui/src/terminal-image.ts:243] [E: packages/tui/src/terminal-image.ts:245] [E: packages/tui/src/terminal-image.ts:246]。

`renderImage()` 的 iTerm2 path 把 calculated `columns` 传给 `width`,把 `height` 固定为 `"auto"`,并把 `preserveAspectRatio` 的默认值设为 `true` [E: packages/tui/src/terminal-image.ts:456] [E: packages/tui/src/terminal-image.ts:457] [E: packages/tui/src/terminal-image.ts:458] [E: packages/tui/src/terminal-image.ts:459] [E: packages/tui/src/terminal-image.ts:460]。因此 `ImageRenderOptions.preserveAspectRatio` 当前只影响 iTerm2 render path,不影响 Kitty path [I]。

## 尺寸计算与 metadata sniffing

`calculateImageCellSize(imageDimensions, maxWidthCells, maxHeightCells, cellDimensions)` 会把 `maxWidthCells` 和 optional `maxHeightCells` floor 到至少 1,把 image pixel width/height 也 clamp 到至少 1,再按 terminal cell pixel dimensions 计算 width scale 与 height scale [E: packages/tui/src/terminal-image.ts:257] [E: packages/tui/src/terminal-image.ts:263] [E: packages/tui/src/terminal-image.ts:264] [E: packages/tui/src/terminal-image.ts:265] [E: packages/tui/src/terminal-image.ts:266] [E: packages/tui/src/terminal-image.ts:268] [E: packages/tui/src/terminal-image.ts:269]。函数取两个 scale 的较小值保持图像不超过约束,用 `Math.ceil` 得到 columns/rows,最后再 clamp 到最大 columns/rows [E: packages/tui/src/terminal-image.ts:270] [E: packages/tui/src/terminal-image.ts:272] [E: packages/tui/src/terminal-image.ts:273] [E: packages/tui/src/terminal-image.ts:274] [E: packages/tui/src/terminal-image.ts:275] [E: packages/tui/src/terminal-image.ts:278] [E: packages/tui/src/terminal-image.ts:279]。

`calculateImageRows()` 是 `calculateImageCellSize()` 的 rows-only wrapper:它传入 target width cells,不传 max height,再返回 `.rows` [E: packages/tui/src/terminal-image.ts:283] [E: packages/tui/src/terminal-image.ts:288]。

dimension sniffing 会先把 base64 转成 Buffer,但不做 raster/pixel decode,而是从 binary header 读取宽高:PNG 验证 magic bytes 后读 offset 16/20 的 big-endian width/height,JPEG 扫描 SOF0-SOF2 marker,GIF 验证 `GIF87a`/`GIF89a` 后读 logical screen width/height,WebP 验证 RIFF/WEBP 后分别处理 `VP8 `、`VP8L`、`VP8X` chunk [E: packages/tui/src/terminal-image.ts:293] [E: packages/tui/src/terminal-image.ts:299] [E: packages/tui/src/terminal-image.ts:303] [E: packages/tui/src/terminal-image.ts:304] [E: packages/tui/src/terminal-image.ts:314] [E: packages/tui/src/terminal-image.ts:333] [E: packages/tui/src/terminal-image.ts:334] [E: packages/tui/src/terminal-image.ts:335] [E: packages/tui/src/terminal-image.ts:357] [E: packages/tui/src/terminal-image.ts:363] [E: packages/tui/src/terminal-image.ts:368] [E: packages/tui/src/terminal-image.ts:369] [E: packages/tui/src/terminal-image.ts:379] [E: packages/tui/src/terminal-image.ts:385] [E: packages/tui/src/terminal-image.ts:386] [E: packages/tui/src/terminal-image.ts:391] [E: packages/tui/src/terminal-image.ts:394] [E: packages/tui/src/terminal-image.ts:395] [E: packages/tui/src/terminal-image.ts:399] [E: packages/tui/src/terminal-image.ts:400] [E: packages/tui/src/terminal-image.ts:401] [E: packages/tui/src/terminal-image.ts:405] [E: packages/tui/src/terminal-image.ts:406] [I]。

`getImageDimensions(base64Data, mimeType)` 只 dispatches `image/png`、`image/jpeg`、`image/gif` 和 `image/webp`;其他 MIME type 返回 `null` [E: packages/tui/src/terminal-image.ts:416] [E: packages/tui/src/terminal-image.ts:417] [E: packages/tui/src/terminal-image.ts:420] [E: packages/tui/src/terminal-image.ts:423] [E: packages/tui/src/terminal-image.ts:426] [E: packages/tui/src/terminal-image.ts:429]。解析函数出错时都 catch 并返回 `null`,所以 dimension sniffing failure 是 soft failure,不是 render-time exception [E: packages/tui/src/terminal-image.ts:308] [E: packages/tui/src/terminal-image.ts:351] [E: packages/tui/src/terminal-image.ts:373] [E: packages/tui/src/terminal-image.ts:412]。

## Fallback 与 hyperlink

`hyperlink(text, url)` 返回 OSC 8 open sequence、visible text、OSC 8 close sequence 的拼接 [E: packages/tui/src/terminal-image.ts:479]。该 helper 本身不检查 `getCapabilities().hyperlinks`;调用方需要根据 capabilities 决定是否使用 OSC 8 或 legacy text URL [I]。

`imageFallback(mimeType, dimensions, filename)` 生成 `[Image: ...]` 文本:有 filename 时先加入 filename,总是加入 `[mimeType]`,有 dimensions 时加入无空格的 `<widthPx>x<heightPx>` 尺寸字符串 [E: packages/tui/src/terminal-image.ts:482] [E: packages/tui/src/terminal-image.ts:483] [E: packages/tui/src/terminal-image.ts:484] [E: packages/tui/src/terminal-image.ts:485] [E: packages/tui/src/terminal-image.ts:486] [E: packages/tui/src/terminal-image.ts:487]。这与 `renderImage()` 的 `null` fallback 配套:不支持 image protocol 时上层可以显示可 grep 的文本占位,而不是输出不可见 escape sequence [I]。

## 设计动机与权衡

capability detection 对 tmux/screen 和未知 terminal 采取保守策略:tmux/screen 禁用 image protocol,未知 terminal 禁用 image protocol 和 OSC 8 hyperlink,只信 `COLORTERM` 的 truecolor hint [E: packages/tui/src/terminal-image.ts:74] [E: packages/tui/src/terminal-image.ts:75] [E: packages/tui/src/terminal-image.ts:79] [E: packages/tui/src/terminal-image.ts:80] [E: packages/tui/src/terminal-image.ts:124]。这避免把不可见或不可靠的 terminal escape sequence 当作用户可读内容 [I]。

Kitty encoder 的 chunking 把 base64 payload 拆成 4096 字符段,这是为了符合 Kitty graphics protocol 的 multipart payload pattern,同时保留首段完整 metadata 和末段结束标记 [E: packages/tui/src/terminal-image.ts:175] [E: packages/tui/src/terminal-image.ts:197] [E: packages/tui/src/terminal-image.ts:200] [I]。

dimension sniffing 只读取 header 字段而不进行 raster/pixel decode,使 terminal render path 可以在没有 image decoder dependency 的情况下估算 cell rows [E: packages/tui/src/terminal-image.ts:293] [E: packages/tui/src/terminal-image.ts:303] [E: packages/tui/src/terminal-image.ts:314] [E: packages/tui/src/terminal-image.ts:334] [E: packages/tui/src/terminal-image.ts:357] [E: packages/tui/src/terminal-image.ts:368] [E: packages/tui/src/terminal-image.ts:379] [E: packages/tui/src/terminal-image.ts:394] [I]。

## Gotcha

- `renderImage()` 的签名要求 caller 传入 `ImageDimensions`,cell size calculation 直接使用这个参数;函数签名中没有 `mimeType` 参数 [E: packages/tui/src/terminal-image.ts:434] [E: packages/tui/src/terminal-image.ts:444] [I]。
- `preserveAspectRatio` 在 `ImageRenderOptions` 中存在,但 `renderImage()` 只在 iTerm2 path 传给 `encodeITerm2()`;Kitty path 由 calculated columns/rows 控制显示尺寸 [E: packages/tui/src/terminal-image.ts:447] [E: packages/tui/src/terminal-image.ts:448] [E: packages/tui/src/terminal-image.ts:449] [E: packages/tui/src/terminal-image.ts:457] [E: packages/tui/src/terminal-image.ts:460] [I]。
- `isImageLine()` 只检查 Kitty/iTerm2 escape prefix 是否存在,不会验证 escape sequence 是否完整或 base64 payload 是否有效 [E: packages/tui/src/terminal-image.ts:146] [E: packages/tui/src/terminal-image.ts:148] [E: packages/tui/src/terminal-image.ts:152] [I]。
- `getCapabilities()` cache 会冻结第一次 detection result;测试或环境变化后需要调用 `resetCapabilitiesCache()` 或 `setCapabilities()` [E: packages/tui/src/terminal-image.ts:128] [E: packages/tui/src/terminal-image.ts:129] [E: packages/tui/src/terminal-image.ts:131] [E: packages/tui/src/terminal-image.ts:135] [E: packages/tui/src/terminal-image.ts:140]。
- `getImageDimensions()` 不处理 BMP,即使更上层可能把 BMP 转换成 PNG 后再进入 TUI;本节点只按 `terminal-image.ts` 的 MIME dispatch 列出 PNG/JPEG/GIF/WebP [E: packages/tui/src/terminal-image.ts:416] [E: packages/tui/src/terminal-image.ts:429] [I]。

## 跨包边界

本节点属于 `pkg: tui`。它向 `surface.misc.images` 提供 terminal display primitive:`renderImage()` 接收已准备好的 base64 image data 和 dimensions,根据 terminal capability 产出 inline image escape sequence 或 `null` [E: packages/tui/src/terminal-image.ts:433] [E: packages/tui/src/terminal-image.ts:434] [E: packages/tui/src/terminal-image.ts:439] [E: packages/tui/src/terminal-image.ts:453] [E: packages/tui/src/terminal-image.ts:462]。`surface.misc.images` 负责解释图片怎样从 CLI、agent message 或 tool result 进入用户可见面;本节点不覆盖 provider vision capability、image upload、image generation 或 coding-agent settings 的全链路 [I]。

## Sources

- packages/tui/src/terminal-image.ts

## 相关

- [surface.misc.images](../../surface/misc/images.md): 图像输入与终端图像的产品可见面,覆盖 CLI `@file`、image settings、agent message image content 与 TUI display 的衔接。
