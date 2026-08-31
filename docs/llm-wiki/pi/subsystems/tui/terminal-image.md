---
id: subsys.tui.terminal-image
title: 终端图像渲染(kitty/iterm2)
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/terminal-image.ts, packages/tui/src/index.ts, packages/tui/test/terminal-image.test.ts, packages/coding-agent/src/core/settings-manager.ts, packages/coding-agent/src/main.ts]
symbols: [renderImage, encodeKitty, encodeITerm2, setCapabilityOverrides, detectCapabilities, getCapabilities]
related: [surface.misc.images, subsys.tui.terminal-capabilities]
evidence: explicit
status: verified
updated: 853a80d26c
---

> `terminal-image` 是 `pi-tui` 的 terminal inline image layer:它检测当前 terminal 是否支持 Kitty graphics protocol 或 iTerm2 inline image,把 base64 image payload 编码成 escape sequence,计算图片占用的 cell rows,并在不支持图片时提供 text fallback。环境变量与 `setCapabilityOverrides()` 可覆盖已检测到的 `hyperlinks` / `images` / `trueColor`。

## 能回答的问题

- `PI_HYPERLINKS` / `PI_IMAGE_PROTOCOL` / `PI_TRUE_COLOR` 与 `setCapabilityOverrides()` 如何覆盖检测结果?
- `renderImage()` 什么时候返回 Kitty sequence、iTerm2 sequence 或 `null`?
- `encodeKitty()` 如何把大 base64 payload 分块并附带 columns/rows/imageId?
- `encodeITerm2()` 生成的 OSC 1337 `File=` sequence 包含哪些参数?
- 图片 pixel dimensions 如何换算成 terminal cell columns/rows?
- TUI 如何识别一行里是否含有 Kitty/iTerm2 image escape sequence?
- `imageFallback()` 和 `hyperlink()` 与终端图像能力有什么边界?

## 职责边界

本节点覆盖 `packages/tui/src/terminal-image.ts` 中的 terminal image rendering primitives: capability detection、Kitty/iTerm2 encoding、image cell sizing、PNG/JPEG/GIF/WebP dimension sniffing、inline render dispatch、OSC 8 hyperlink helper 和 image fallback text。`surface.misc.images` 覆盖 `pi-coding-agent` 怎样把 CLI 或 tool result 的图片带到用户可见面;本节点只描述 `pkg: tui` 中把 base64 image data 显示到 terminal 的底层机制 [I]。

`ImageProtocol` 只允许 `"kitty"`、`"iterm2"` 或 `null`,而 `TerminalCapabilities` 同时携带 `images`、`trueColor`、`hyperlinks` 三个 capability bit [E: packages/tui/src/terminal-image.ts:6] [E: packages/tui/src/terminal-image.ts:9] [E: packages/tui/src/terminal-image.ts:10] [E: packages/tui/src/terminal-image.ts:11]。`ImageRenderOptions` 接受 `maxWidthCells`、`maxHeightCells`、`preserveAspectRatio`、Kitty `imageId` 和 Kitty cursor movement 开关 [E: packages/tui/src/terminal-image.ts:24] [E: packages/tui/src/terminal-image.ts:25] [E: packages/tui/src/terminal-image.ts:26] [E: packages/tui/src/terminal-image.ts:27] [E: packages/tui/src/terminal-image.ts:29] [E: packages/tui/src/terminal-image.ts:31]。

## 关键文件

- `packages/tui/src/terminal-image.ts`: 定义 terminal image protocol detection、Kitty/iTerm2 encoder、dimension parsers、`renderImage()` dispatch、`hyperlink()` 和 `imageFallback()`。

## 数据模型

`cellDimensions` 是模块级缓存,默认 `{ widthPx: 9, heightPx: 18 }`;`getCellDimensions()` 读取它,`setCellDimensions()` 覆盖它,`renderImage()` 会用当前 cell size 把 pixel dimensions 换算成 terminal cells [E: packages/tui/src/terminal-image.ts:38] [E: packages/tui/src/terminal-image.ts:41] [E: packages/tui/src/terminal-image.ts:45] [E: packages/tui/src/terminal-image.ts:626]。这说明图片尺寸计算不是固定字符宽高,而是允许 TUI 在收到 terminal cell-size query 后更新 [I]。

`cachedCapabilities` 是 `getCapabilities()` 的模块级 memoization;`capabilityOverrides` 是独立的 `Partial<TerminalCapabilities>` [E: packages/tui/src/terminal-image.ts:34] [E: packages/tui/src/terminal-image.ts:35]。第一次 `getCapabilities()` 把 `detectCapabilities()` 与 `capabilityOverrides` 合并后写入 cache;`resetCapabilitiesCache()` 清空 cache,`setCapabilities()` 直接替换 cache,`setCapabilityOverrides()` 写入 overrides 并清空 cache [E: packages/tui/src/terminal-image.ts:164] [E: packages/tui/src/terminal-image.ts:175] [E: packages/tui/src/terminal-image.ts:180] [E: packages/tui/src/terminal-image.ts:193]。runtime environment 变化不会自动重新探测,除非显式 reset 或改 overrides [I]。

`KITTY_PREFIX` 是 `ESC _G`, `ITERM2_PREFIX` 是 `ESC ]1337;File=`;`isImageLine(line)` 先检查 line start,再用 `includes()` 检查 sequence 是否出现在行中间 [E: packages/tui/src/terminal-image.ts:197] [E: packages/tui/src/terminal-image.ts:198] [E: packages/tui/src/terminal-image.ts:200] [E: packages/tui/src/terminal-image.ts:202] [E: packages/tui/src/terminal-image.ts:206]。因此它不是按当前 terminal capability 判断,而是按 escape sequence signature 判断一行是否承载 image output [I]。

## 控制流

1. `detectCapabilitiesFromEnvironment@packages/tui/src/terminal-image.ts:69` 读取 `TERM_PROGRAM`、`TERMINAL_EMULATOR`、`TERM`、`COLORTERM`,并把 `COLORTERM=truecolor|24bit` 作为 truecolor hint [E: packages/tui/src/terminal-image.ts:70] [E: packages/tui/src/terminal-image.ts:71] [E: packages/tui/src/terminal-image.ts:72] [E: packages/tui/src/terminal-image.ts:73] [E: packages/tui/src/terminal-image.ts:74]。
2. tmux 或 `TERM=tmux*` 下,检测固定 `images: null`,只保留 truecolor hint,并通过注入的 `tmuxForwardsHyperlink()` 决定 OSC 8 hyperlink 是否可用 [E: packages/tui/src/terminal-image.ts:79] [E: packages/tui/src/terminal-image.ts:80]。`TERM=screen*` 下同样禁用 image protocol,且 `hyperlinks: false` [E: packages/tui/src/terminal-image.ts:84] [E: packages/tui/src/terminal-image.ts:85]。
3. Kitty、Ghostty、WezTerm 和 Warp 被归到 Kitty graphics protocol;对应条件包括 `KITTY_WINDOW_ID`、`TERM_PROGRAM=kitty|ghostty|wezterm|warpterminal`、`TERM` 包含 ghostty、`GHOSTTY_RESOURCES_DIR`、`WEZTERM_PANE`、`WARP_SESSION_ID` 或 `WARP_TERMINAL_SESSION_UUID` [E: packages/tui/src/terminal-image.ts:88] [E: packages/tui/src/terminal-image.ts:89] [E: packages/tui/src/terminal-image.ts:92] [E: packages/tui/src/terminal-image.ts:93] [E: packages/tui/src/terminal-image.ts:96] [E: packages/tui/src/terminal-image.ts:97] [E: packages/tui/src/terminal-image.ts:101] [E: packages/tui/src/terminal-image.ts:102]。
4. iTerm2 由 `ITERM_SESSION_ID` 或 `TERM_PROGRAM=iterm.app` 识别,返回 `images: "iterm2"`;Windows Terminal、VS Code、Alacritty 和 JetBrains terminal 不声明 image protocol,但部分会声明 truecolor/hyperlink 支持 [E: packages/tui/src/terminal-image.ts:105] [E: packages/tui/src/terminal-image.ts:106] [E: packages/tui/src/terminal-image.ts:109] [E: packages/tui/src/terminal-image.ts:110] [E: packages/tui/src/terminal-image.ts:113] [E: packages/tui/src/terminal-image.ts:114] [E: packages/tui/src/terminal-image.ts:117] [E: packages/tui/src/terminal-image.ts:118] [E: packages/tui/src/terminal-image.ts:121] [E: packages/tui/src/terminal-image.ts:122]。
5. 未识别 terminal 走 conservative fallback:`images: null`,`trueColor` 只信 `COLORTERM` hint,`hyperlinks: false` [E: packages/tui/src/terminal-image.ts:136]。
6. `detectCapabilities()` 先跑环境检测,再叠 env override,最后 `getCapabilities()` 再叠 `setCapabilityOverrides()` [E: packages/tui/src/terminal-image.ts:143] [E: packages/tui/src/terminal-image.ts:167]。
7. `renderImage()` 先取 `getCapabilities()`;如果没有 image protocol 直接返回 `null` [E: packages/tui/src/terminal-image.ts:614] [E: packages/tui/src/terminal-image.ts:619] [E: packages/tui/src/terminal-image.ts:621] [E: packages/tui/src/terminal-image.ts:622]。
8. `renderImage()` 用 `options.maxWidthCells ?? 80` 和 `calculateImageCellSize()` 算出 render size;Kitty path 调 `encodeKitty()` 并返回 `{ sequence, columns, rows, imageId? }`,iTerm2 path 调 `encodeITerm2()` 并返回 `{ sequence, columns, rows }` [E: packages/tui/src/terminal-image.ts:614] [E: packages/tui/src/terminal-image.ts:618] [E: packages/tui/src/terminal-image.ts:625] [E: packages/tui/src/terminal-image.ts:626] [E: packages/tui/src/terminal-image.ts:628] [E: packages/tui/src/terminal-image.ts:638] [E: packages/tui/src/terminal-image.ts:644] [E: packages/tui/src/terminal-image.ts:647] [E: packages/tui/src/terminal-image.ts:653]。

## Capability Overrides

TUI 层可用 env 与 API 覆盖自动检测的 `hyperlinks` / `images` / `trueColor`。`detectCapabilities()` 先读 env,`getCapabilities()` 再把 `capabilityOverrides` 铺在检测结果上 [E: packages/tui/src/terminal-image.ts:143] [E: packages/tui/src/terminal-image.ts:167]。

| capability | env | env 取值 | API 字段 |
|---|---|---|---|
| OSC 8 hyperlinks | `PI_HYPERLINKS` | `1` → true,`0` → false;其它(含 `auto`)不覆盖 | `setCapabilityOverrides({ hyperlinks })` |
| inline images | `PI_IMAGE_PROTOCOL` | `kitty` / `iterm2`;`none` 或 `0` → `null`;其它(含 `auto`)不覆盖 | `setCapabilityOverrides({ images })` |
| truecolor | `PI_TRUE_COLOR` | `1` → true,`0` → false;其它(含 `auto`)不覆盖 | `setCapabilityOverrides({ trueColor })` |

env 读取点分别是 `process.env.PI_HYPERLINKS`、`process.env.PI_IMAGE_PROTOCOL`、`process.env.PI_TRUE_COLOR` [E: packages/tui/src/terminal-image.ts:144] [E: packages/tui/src/terminal-image.ts:148] [E: packages/tui/src/terminal-image.ts:155]。API 入口是 `setCapabilityOverrides(overrides: Partial<TerminalCapabilities>)`,读侧是 `detectCapabilities()` 与 `getCapabilities()` [E: packages/tui/src/terminal-image.ts:180] [E: packages/tui/src/terminal-image.ts:143] [E: packages/tui/src/terminal-image.ts:164]。

`parseBooleanCapabilityOverride()` 只认字面量 `"1"` / `"0"` [E: packages/tui/src/terminal-image.ts:139]。`PI_IMAGE_PROTOCOL` 在 `detectCapabilities()` 里 lower-case 后匹配 `kitty`/`iterm2`/`none`/`0` [E: packages/tui/src/terminal-image.ts:148]。

`setCapabilityOverrides(overrides)` 比较 images/trueColor/hyperlinks 三字段,无变化则直接返回;有变化则 `capabilityOverrides = { ...overrides }` 并 `cachedCapabilities = null` [E: packages/tui/src/terminal-image.ts:180] [E: packages/tui/src/terminal-image.ts:188]。传入 `{}` 等于清掉 programmatic override,下次 `getCapabilities()` 只剩 env + 检测 [E: packages/tui/test/terminal-image.test.ts:260]。

`getCapabilities()` 若 `capabilityOverrides.hyperlinks` 已设定,会把该布尔值当作 `tmuxForwardsHyperlink`,从而跳过真实 tmux probe [E: packages/tui/src/terminal-image.ts:166] [E: packages/tui/test/terminal-image.test.ts:269]。env `PI_HYPERLINKS=1` 同样让 `detectCapabilities()` 不再调用 probe [E: packages/tui/src/terminal-image.ts:146]。

precedence:环境检测 → env overlay → programmatic `setCapabilityOverrides()`。后者覆盖前者 [E: packages/tui/src/terminal-image.ts:156] [E: packages/tui/src/terminal-image.ts:167] [E: packages/tui/test/terminal-image.test.ts:257]。

coding-agent 产品层另有 JSON `terminal.hyperlinks` / `terminal.images` / `terminal.trueColor`(`true`/`false`/`"auto"`)。`SettingsManager.getTerminalCapabilityOverrides()` 只把非 `"auto"` 的布尔/`kitty`/`iterm2`/`false` 编进 `Partial<TerminalCapabilities>`,再交给 `setCapabilityOverrides()` [E: packages/coding-agent/src/core/settings-manager.ts:45] [E: packages/coding-agent/src/core/settings-manager.ts:1132] [E: packages/coding-agent/src/main.ts:848]。官方 docs 写 settings 优先于 env,是产品接线,不是 TUI `detectCapabilities()` 自己读 settings [I]。

package root 导出 `setCapabilityOverrides` [E: packages/tui/src/index.ts:113]。

## Kitty encoder

`encodeKitty(base64Data, options)` 使用 `a=T,f=100,q=2` 作为基础参数;`moveCursor === false` 时追加 `C=1`,有 `columns`/`rows`/`imageId` 时追加 `c=`/`r=`/`i=` [E: packages/tui/src/terminal-image.ts:219] [E: packages/tui/src/terminal-image.ts:231] [E: packages/tui/src/terminal-image.ts:233] [E: packages/tui/src/terminal-image.ts:234] [E: packages/tui/src/terminal-image.ts:235] [E: packages/tui/src/terminal-image.ts:236]。这里的 `q=2` 也出现在 delete helper 中,所以该模块统一选择 suppress Kitty protocol replies [E: packages/tui/src/terminal-image.ts:231] [E: packages/tui/src/terminal-image.ts:270] [E: packages/tui/src/terminal-image.ts:278] [I]。

payload 长度不超过 4096 字符时,`encodeKitty()` 直接返回单个 `ESC _G ... ;payload ESC \` sequence [E: packages/tui/src/terminal-image.ts:229] [E: packages/tui/src/terminal-image.ts:238] [E: packages/tui/src/terminal-image.ts:239]。超过 4096 字符时,它按 4096 字符切 chunk:首块带完整 params 和 `m=1`,中间块带 `m=1`,最后块带 `m=0`,最后把 chunks 拼接成一个 string [E: packages/tui/src/terminal-image.ts:242] [E: packages/tui/src/terminal-image.ts:246] [E: packages/tui/src/terminal-image.ts:247] [E: packages/tui/src/terminal-image.ts:248] [E: packages/tui/src/terminal-image.ts:250] [E: packages/tui/src/terminal-image.ts:251] [E: packages/tui/src/terminal-image.ts:253] [E: packages/tui/src/terminal-image.ts:254] [E: packages/tui/src/terminal-image.ts:256] [E: packages/tui/src/terminal-image.ts:262]。

`allocateImageId()` 返回 `[1, 0xfffffffe]` 范围内的随机整数;`deleteKittyImage(imageId)` 删除指定 image，`deleteAllKittyImages()` 删除 placements 并释放 image data，而 `deleteAllKittyPlacements()` 只删除当前 placements、保留已上传数据 [E: packages/tui/src/terminal-image.ts:216] [E: packages/tui/src/terminal-image.ts:270] [E: packages/tui/src/terminal-image.ts:277] [E: packages/tui/src/terminal-image.ts:282] [E: packages/tui/src/terminal-image.ts:283]。`renderImage()` 的 Kitty path 只在 caller 显式传入 `imageId` 时登记 metadata，并把 id 透传/带回；函数内部不调用 `allocateImageId()` [E: packages/tui/src/terminal-image.ts:628] [E: packages/tui/src/terminal-image.ts:629] [E: packages/tui/src/terminal-image.ts:630] [E: packages/tui/src/terminal-image.ts:641] [E: packages/tui/src/terminal-image.ts:644] [I]。

metadata registry 记录 image cell/pixel size 和 transmission generation，并限制为最近 1000 项；`getKittyImagePlacement()` 可从 transmission 重建 placement-only command、记录 transmission/decoded size，`cropKittyImageLine()` 则按隐藏与可见行写入 source `y/h` 和 cell `r` 裁剪参数 [E: packages/tui/src/terminal-image.ts:314] [E: packages/tui/src/terminal-image.ts:319] [E: packages/tui/src/terminal-image.ts:329] [E: packages/tui/src/terminal-image.ts:338] [E: packages/tui/src/terminal-image.ts:341] [E: packages/tui/src/terminal-image.ts:345] [E: packages/tui/src/terminal-image.ts:391] [E: packages/tui/src/terminal-image.ts:415] [E: packages/tui/src/terminal-image.ts:421] [E: packages/tui/src/terminal-image.ts:425] [E: packages/tui/src/terminal-image.ts:431] [E: packages/tui/src/terminal-image.ts:435] [E: packages/tui/src/terminal-image.ts:436]。

## iTerm2 encoder

`encodeITerm2(base64Data, options)` 生成 OSC 1337 `File=` sequence,默认 `inline=1`;`inline: false` 会写 `inline=0` [E: packages/tui/src/terminal-image.ts:286] [E: packages/tui/src/terminal-image.ts:288] [E: packages/tui/src/terminal-image.ts:311]。可选 `width`、`height` 会直接进入参数列表,`name` 会先用 base64 编码后写成 `name=...`,而 `preserveAspectRatio === false` 会追加 `preserveAspectRatio=0` [E: packages/tui/src/terminal-image.ts:301] [E: packages/tui/src/terminal-image.ts:302] [E: packages/tui/src/terminal-image.ts:303] [E: packages/tui/src/terminal-image.ts:304] [E: packages/tui/src/terminal-image.ts:305] [E: packages/tui/src/terminal-image.ts:307] [E: packages/tui/src/terminal-image.ts:308]。

`renderImage()` 的 iTerm2 path 把 calculated `columns` 传给 `width`,把 `height` 固定为 `"auto"`,并把 `preserveAspectRatio` 的默认值设为 `true` [E: packages/tui/src/terminal-image.ts:647] [E: packages/tui/src/terminal-image.ts:648] [E: packages/tui/src/terminal-image.ts:649] [E: packages/tui/src/terminal-image.ts:650] [E: packages/tui/src/terminal-image.ts:651]。因此 `ImageRenderOptions.preserveAspectRatio` 当前只影响 iTerm2 render path,不影响 Kitty path [I]。

## 尺寸计算与 metadata sniffing

`calculateImageCellSize(imageDimensions, maxWidthCells, maxHeightCells, cellDimensions)` 会把 `maxWidthCells` 和 optional `maxHeightCells` floor 到至少 1,把 image pixel width/height 也 clamp 到至少 1,再按 terminal cell pixel dimensions 计算 width scale 与 height scale [E: packages/tui/src/terminal-image.ts:439] [E: packages/tui/src/terminal-image.ts:445] [E: packages/tui/src/terminal-image.ts:446] [E: packages/tui/src/terminal-image.ts:447] [E: packages/tui/src/terminal-image.ts:448] [E: packages/tui/src/terminal-image.ts:450] [E: packages/tui/src/terminal-image.ts:451]。函数取两个 scale 的较小值保持图像不超过约束,用 `Math.ceil` 得到 columns/rows,最后再 clamp 到最大 columns/rows [E: packages/tui/src/terminal-image.ts:452] [E: packages/tui/src/terminal-image.ts:454] [E: packages/tui/src/terminal-image.ts:455] [E: packages/tui/src/terminal-image.ts:456] [E: packages/tui/src/terminal-image.ts:457] [E: packages/tui/src/terminal-image.ts:460] [E: packages/tui/src/terminal-image.ts:461]。

`calculateImageRows()` 是 `calculateImageCellSize()` 的 rows-only wrapper:它传入 target width cells,不传 max height,再返回 `.rows` [E: packages/tui/src/terminal-image.ts:465] [E: packages/tui/src/terminal-image.ts:470]。

dimension sniffing 会先把 base64 转成 Buffer,但不做 raster/pixel decode,而是从 binary header 读取宽高:PNG 验证 magic bytes 后读 offset 16/20 的 big-endian width/height,JPEG 扫描 SOF0-SOF2 marker,GIF 验证 `GIF87a`/`GIF89a` 后读 logical screen width/height,WebP 验证 RIFF/WEBP 后分别处理 `VP8 `、`VP8L`、`VP8X` chunk [E: packages/tui/src/terminal-image.ts:475] [E: packages/tui/src/terminal-image.ts:481] [E: packages/tui/src/terminal-image.ts:485] [E: packages/tui/src/terminal-image.ts:486] [E: packages/tui/src/terminal-image.ts:496] [E: packages/tui/src/terminal-image.ts:515] [E: packages/tui/src/terminal-image.ts:516] [E: packages/tui/src/terminal-image.ts:517] [E: packages/tui/src/terminal-image.ts:539] [E: packages/tui/src/terminal-image.ts:545] [E: packages/tui/src/terminal-image.ts:550] [E: packages/tui/src/terminal-image.ts:551] [E: packages/tui/src/terminal-image.ts:561] [E: packages/tui/src/terminal-image.ts:567] [E: packages/tui/src/terminal-image.ts:568] [E: packages/tui/src/terminal-image.ts:573] [E: packages/tui/src/terminal-image.ts:576] [E: packages/tui/src/terminal-image.ts:577] [E: packages/tui/src/terminal-image.ts:581] [E: packages/tui/src/terminal-image.ts:582] [E: packages/tui/src/terminal-image.ts:583] [E: packages/tui/src/terminal-image.ts:587] [E: packages/tui/src/terminal-image.ts:588] [I]。

`getImageDimensions(base64Data, mimeType)` 只 dispatches `image/png`、`image/jpeg`、`image/gif` 和 `image/webp`;其他 MIME type 返回 `null` [E: packages/tui/src/terminal-image.ts:598] [E: packages/tui/src/terminal-image.ts:599] [E: packages/tui/src/terminal-image.ts:602] [E: packages/tui/src/terminal-image.ts:605] [E: packages/tui/src/terminal-image.ts:608] [E: packages/tui/src/terminal-image.ts:611]。解析函数出错时都 catch 并返回 `null`,所以 dimension sniffing failure 是 soft failure,不是 render-time exception [E: packages/tui/src/terminal-image.ts:490] [E: packages/tui/src/terminal-image.ts:533] [E: packages/tui/src/terminal-image.ts:555] [E: packages/tui/src/terminal-image.ts:594]。

## Fallback 与 hyperlink

`hyperlink(text, url)` 返回 OSC 8 open sequence、visible text、OSC 8 close sequence 的拼接 [E: packages/tui/src/terminal-image.ts:670]。该 helper 本身不检查 `getCapabilities().hyperlinks`;调用方需要根据 capabilities 决定是否使用 OSC 8 或 legacy text URL [I]。

`imageFallback(mimeType, dimensions, filename)` 生成 `[Image: ...]` 文本：home 下绝对路径缩写为 `~/...`；terminal 支持 hyperlink 且 filename 是 absolute path 时，显示文本用 OSC 8 链到完整 `file://` URL。随后加入 `[mimeType]` 与可选 `<widthPx>x<heightPx>` [E: packages/tui/src/terminal-image.ts:674] [E: packages/tui/src/terminal-image.ts:674] [E: packages/tui/src/terminal-image.ts:677] [E: packages/tui/src/terminal-image.ts:687] [E: packages/tui/src/terminal-image.ts:689] [E: packages/tui/src/terminal-image.ts:691] [E: packages/tui/src/terminal-image.ts:692] [E: packages/tui/src/terminal-image.ts:697] [E: packages/tui/src/terminal-image.ts:698] [E: packages/tui/src/terminal-image.ts:699]。relative path / basename 不生成 file hyperlink [E: packages/tui/src/terminal-image.ts:691] [E: packages/tui/src/terminal-image.ts:694]。

## 设计动机与权衡

capability detection 对 tmux/screen 和未知 terminal 采取保守策略:tmux/screen 禁用 image protocol,未知 terminal 禁用 image protocol 和 OSC 8 hyperlink,只信 `COLORTERM` 的 truecolor hint [E: packages/tui/src/terminal-image.ts:79] [E: packages/tui/src/terminal-image.ts:80] [E: packages/tui/src/terminal-image.ts:84] [E: packages/tui/src/terminal-image.ts:85] [E: packages/tui/src/terminal-image.ts:136]。这避免把不可见或不可靠的 terminal escape sequence 当作用户可读内容 [I]。

Kitty encoder 的 chunking 把 base64 payload 拆成 4096 字符段,这是为了符合 Kitty graphics protocol 的 multipart payload pattern,同时保留首段完整 metadata 和末段结束标记 [E: packages/tui/src/terminal-image.ts:229] [E: packages/tui/src/terminal-image.ts:251] [E: packages/tui/src/terminal-image.ts:254] [I]。

dimension sniffing 只读取 header 字段而不进行 raster/pixel decode,使 terminal render path 可以在没有 image decoder dependency 的情况下估算 cell rows [E: packages/tui/src/terminal-image.ts:475] [E: packages/tui/src/terminal-image.ts:485] [E: packages/tui/src/terminal-image.ts:496] [E: packages/tui/src/terminal-image.ts:516] [E: packages/tui/src/terminal-image.ts:539] [E: packages/tui/src/terminal-image.ts:550] [E: packages/tui/src/terminal-image.ts:561] [E: packages/tui/src/terminal-image.ts:576] [I]。

## Gotcha

- `renderImage()` 的签名要求 caller 传入 `ImageDimensions`,cell size calculation 直接使用这个参数;函数签名中没有 `mimeType` 参数 [E: packages/tui/src/terminal-image.ts:616] [E: packages/tui/src/terminal-image.ts:626] [I]。
- `preserveAspectRatio` 在 `ImageRenderOptions` 中存在,但 `renderImage()` 只在 iTerm2 path 传给 `encodeITerm2()`;Kitty path 由 calculated columns/rows 控制显示尺寸 [E: packages/tui/src/terminal-image.ts:638] [E: packages/tui/src/terminal-image.ts:639] [E: packages/tui/src/terminal-image.ts:640] [E: packages/tui/src/terminal-image.ts:648] [E: packages/tui/src/terminal-image.ts:651] [I]。
- `isImageLine()` 只检查 Kitty/iTerm2 escape prefix 是否存在,不会验证 escape sequence 是否完整或 base64 payload 是否有效 [E: packages/tui/src/terminal-image.ts:200] [E: packages/tui/src/terminal-image.ts:202] [E: packages/tui/src/terminal-image.ts:206] [I]。
- `getCapabilities()` cache 会冻结第一次 detection+override 合并结果;测试或环境变化后需要调用 `resetCapabilitiesCache()`、`setCapabilities()` 或 `setCapabilityOverrides()` [E: packages/tui/src/terminal-image.ts:164] [E: packages/tui/src/terminal-image.ts:175] [E: packages/tui/src/terminal-image.ts:180] [E: packages/tui/src/terminal-image.ts:193]。
- TUI env 不把 `auto` 当有效覆盖;`PI_HYPERLINKS=auto` 与未设置等价。coding-agent settings 的 `"auto"` 则是“不要写入 override 对象” [E: packages/tui/src/terminal-image.ts:139] [E: packages/coding-agent/src/core/settings-manager.ts:1138]。
- 强制打开不存在的 image/hyperlink protocol 会写出终端无法理解的 escape;官方 terminal-setup 要求只覆盖完整通路确实支持的能力 [I]。
- `getImageDimensions()` 不处理 BMP,即使更上层可能把 BMP 转换成 PNG 后再进入 TUI;本节点只按 `terminal-image.ts` 的 MIME dispatch 列出 PNG/JPEG/GIF/WebP [E: packages/tui/src/terminal-image.ts:598] [E: packages/tui/src/terminal-image.ts:611] [I]。

## 跨包边界

本节点属于 `pkg: tui`。它向 `surface.misc.images` 提供 terminal display primitive:`renderImage()` 接收已准备好的 base64 image data 和 dimensions,根据 terminal capability 产出 inline image escape sequence 或 `null` [E: packages/tui/src/terminal-image.ts:614] [E: packages/tui/src/terminal-image.ts:615] [E: packages/tui/src/terminal-image.ts:616] [E: packages/tui/src/terminal-image.ts:621] [E: packages/tui/src/terminal-image.ts:644] [E: packages/tui/src/terminal-image.ts:653]。`surface.misc.images` 负责解释图片怎样从 CLI、agent message 或 tool result 进入用户可见面;本节点不覆盖 provider vision capability、image upload、image generation 或 coding-agent settings 的全链路 [I]。

## Sources

- packages/tui/src/terminal-image.ts
- packages/tui/src/index.ts
- packages/tui/test/terminal-image.test.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/main.ts

## 相关

- [surface.misc.images](../../surface/misc/images.md): 图像输入与终端图像的产品可见面,覆盖 CLI `@file`、image settings、agent message image content 与 TUI display 的衔接。
- [subsys.tui.terminal-capabilities](terminal-capabilities.md): Kitty keyboard protocol negotiation;与本节点的 hyperlink/image/truecolor 检测是不同 capability 层。
