---
id: subsys.tui.terminal-image
title: 终端图像渲染(kitty/iterm2)
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/terminal-image.ts, packages/tui/src/index.ts, packages/tui/src/tui-alt-screen.ts, packages/tui/src/components/image.ts, packages/tui/test/terminal-image.test.ts, packages/coding-agent/src/core/settings-manager.ts, packages/coding-agent/src/main.ts, packages/coding-agent/src/modes/interactive/interactive-mode.ts]
symbols: [renderImage, encodeKitty, encodeITerm2, setCapabilityOverrides, detectCapabilities, getCapabilities, setImageTranscoder]
related: [surface.misc.images, subsys.tui.terminal-capabilities]
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `terminal-image` 是 `pi-tui` 的 terminal inline image layer:它检测当前 terminal 是否支持 Kitty graphics protocol 或 iTerm2 inline image,把 base64 image payload 编码成 escape sequence,计算图片占用的 cell rows,并在不支持图片时提供 text fallback。环境变量与 `setCapabilityOverrides()` 可覆盖已检测到的 `hyperlinks` / `images` / `trueColor`。

## 能回答的问题

- `PI_HYPERLINKS` / `PI_IMAGE_PROTOCOL` / `PI_TRUE_COLOR` 与 `setCapabilityOverrides()` 如何覆盖检测结果?
- `renderImage()` 什么时候返回 Kitty sequence、iTerm2 sequence 或 `null`?
- `encodeKitty()` 如何把大 base64 payload 分块并附带 columns/rows/imageId?
- `encodeITerm2()` 生成的 OSC 1337 `File=` sequence 包含哪些参数?
- 图片 pixel dimensions 如何换算成 terminal cell columns/rows?
- Kitty path 为什么可能比 `Math.ceil` 少一格，以免 cell-aligned distortion?
- WezTerm fullscreen 为什么要把 EL 行清除和 Kitty 绘制拆开?
- TUI 如何识别一行里是否含有 Kitty/iTerm2 image escape sequence?
- `imageFallback()` 和 `hyperlink()` 与终端图像能力有什么边界?

## 职责边界

本节点覆盖 `packages/tui/src/terminal-image.ts` 中的 terminal image rendering primitives: capability detection、Kitty/iTerm2 encoding、image cell sizing、PNG/JPEG/GIF/WebP dimension sniffing、inline render dispatch、OSC 8 hyperlink helper 和 image fallback text。`surface.misc.images` 覆盖 `pi-coding-agent` 怎样把 CLI 或 tool result 的图片带到用户可见面;本节点只描述 `pkg: tui` 中把 base64 image data 显示到 terminal 的底层机制 [I]。

`ImageProtocol` 只允许 `"kitty"`、`"iterm2"` 或 `null`,而 `TerminalCapabilities` 同时携带 `images`、`trueColor`、`hyperlinks` 三个 capability bit [E: packages/tui/src/terminal-image.ts:7] [E: packages/tui/src/terminal-image.ts:10] [E: packages/tui/src/terminal-image.ts:11] [E: packages/tui/src/terminal-image.ts:12]。`ImageRenderOptions` 接受 `maxWidthCells`、`maxHeightCells`、`preserveAspectRatio`、Kitty `imageId` 和 Kitty cursor movement 开关 [E: packages/tui/src/terminal-image.ts:25] [E: packages/tui/src/terminal-image.ts:26] [E: packages/tui/src/terminal-image.ts:27] [E: packages/tui/src/terminal-image.ts:28] [E: packages/tui/src/terminal-image.ts:30] [E: packages/tui/src/terminal-image.ts:32]。

## 关键文件

- `packages/tui/src/terminal-image.ts`: 定义 terminal image protocol detection、Kitty/iTerm2 encoder、dimension parsers、`renderImage()` dispatch、`hyperlink()` 和 `imageFallback()`。

## 数据模型

`cellDimensions` 是模块级缓存,默认 `{ widthPx: 9, heightPx: 18 }`;`getCellDimensions()` 读取它,`setCellDimensions()` 覆盖它,`renderImage()` 会用当前 cell size 把 pixel dimensions 换算成 terminal cells [E: packages/tui/src/terminal-image.ts:39] [E: packages/tui/src/terminal-image.ts:42] [E: packages/tui/src/terminal-image.ts:46] [E: packages/tui/src/terminal-image.ts:648]。这说明图片尺寸计算不是固定字符宽高,而是允许 TUI 在收到 terminal cell-size query 后更新 [I]。

`cachedCapabilities` 是 `getCapabilities()` 的模块级 memoization;`capabilityOverrides` 是独立的 `Partial<TerminalCapabilities>` [E: packages/tui/src/terminal-image.ts:35] [E: packages/tui/src/terminal-image.ts:36]。第一次 `getCapabilities()` 把 `detectCapabilities()` 与 `capabilityOverrides` 合并后写入 cache;`resetCapabilitiesCache()` 清空 cache,`setCapabilities()` 直接替换 cache,`setCapabilityOverrides()` 写入 overrides 并清空 cache [E: packages/tui/src/terminal-image.ts:161] [E: packages/tui/src/terminal-image.ts:176] [E: packages/tui/src/terminal-image.ts:181] [E: packages/tui/src/terminal-image.ts:194]。runtime environment 变化不会自动重新探测,除非显式 reset 或改 overrides [I]。

`KITTY_PREFIX` 是 `ESC _G`, `ITERM2_PREFIX` 是 `ESC ]1337;File=`;`isImageLine(line)` 先检查 line start,再用 `includes()` 检查 sequence 是否出现在行中间 [E: packages/tui/src/terminal-image.ts:198] [E: packages/tui/src/terminal-image.ts:199] [E: packages/tui/src/terminal-image.ts:201] [E: packages/tui/src/terminal-image.ts:203] [E: packages/tui/src/terminal-image.ts:207]。因此它不是按当前 terminal capability 判断,而是按 escape sequence signature 判断一行是否承载 image output [I]。

## 控制流

1. `detectCapabilitiesFromEnvironment@packages/tui/src/terminal-image.ts:69` 读取 `TERM_PROGRAM`、`TERMINAL_EMULATOR`、`TERM`、`COLORTERM`,并把 `COLORTERM=truecolor|24bit` 作为 truecolor hint [E: packages/tui/src/terminal-image.ts:71] [E: packages/tui/src/terminal-image.ts:72] [E: packages/tui/src/terminal-image.ts:73] [E: packages/tui/src/terminal-image.ts:74] [E: packages/tui/src/terminal-image.ts:74]。
2. tmux 或 `TERM=tmux*` 下,检测固定 `images: null`,只保留 truecolor hint,并通过注入的 `tmuxForwardsHyperlink()` 决定 OSC 8 hyperlink 是否可用 [E: packages/tui/src/terminal-image.ts:80] [E: packages/tui/src/terminal-image.ts:81]。`TERM=screen*` 下同样禁用 image protocol,且 `hyperlinks: false` [E: packages/tui/src/terminal-image.ts:85] [E: packages/tui/src/terminal-image.ts:86]。
3. Kitty、Ghostty、WezTerm 和 Warp 被归到 Kitty graphics protocol;对应条件包括 `KITTY_WINDOW_ID`、`TERM_PROGRAM=kitty|ghostty|wezterm|warpterminal`、`TERM` 包含 ghostty、`GHOSTTY_RESOURCES_DIR`、`WEZTERM_PANE`、`WARP_SESSION_ID` 或 `WARP_TERMINAL_SESSION_UUID` [E: packages/tui/src/terminal-image.ts:89] [E: packages/tui/src/terminal-image.ts:90] [E: packages/tui/src/terminal-image.ts:93] [E: packages/tui/src/terminal-image.ts:94] [E: packages/tui/src/terminal-image.ts:97] [E: packages/tui/src/terminal-image.ts:98] [E: packages/tui/src/terminal-image.ts:102] [E: packages/tui/src/terminal-image.ts:103]。
4. iTerm2 由 `ITERM_SESSION_ID` 或 `TERM_PROGRAM=iterm.app` 识别,返回 `images: "iterm2"`;Windows Terminal、VS Code、Alacritty 和 JetBrains terminal 不声明 image protocol,但部分会声明 truecolor/hyperlink 支持 [E: packages/tui/src/terminal-image.ts:106] [E: packages/tui/src/terminal-image.ts:107] [E: packages/tui/src/terminal-image.ts:110] [E: packages/tui/src/terminal-image.ts:111] [E: packages/tui/src/terminal-image.ts:114] [E: packages/tui/src/terminal-image.ts:115] [E: packages/tui/src/terminal-image.ts:114] [E: packages/tui/src/terminal-image.ts:115] [E: packages/tui/src/terminal-image.ts:118] [E: packages/tui/src/terminal-image.ts:119]。
5. 未识别 terminal 走 conservative fallback:`images: null`,`trueColor` 只信 `COLORTERM` hint,`hyperlinks: false` [E: packages/tui/src/terminal-image.ts:133]。
6. `detectCapabilities()` 先跑环境检测,再叠 env override,最后 `getCapabilities()` 再叠 `setCapabilityOverrides()` [E: packages/tui/src/terminal-image.ts:140] [E: packages/tui/src/terminal-image.ts:164]。
7. `renderImage()` 先取 `getCapabilities()`;如果没有 image protocol 直接返回 `null` [E: packages/tui/src/terminal-image.ts:664] [E: packages/tui/src/terminal-image.ts:669] [E: packages/tui/src/terminal-image.ts:671] [E: packages/tui/src/terminal-image.ts:672]。
8. `renderImage()` 用 `options.maxWidthCells ?? 80` 和 `calculateImageCellSize()` 算出 render size;Kitty path 把第五参 `optimizeAspectRatio` 设为 true，iTerm2 path 仍走默认 false，避免缩小 iTerm2 预留格子 [E: packages/tui/src/terminal-image.ts:675] [E: packages/tui/src/terminal-image.ts:682]。Kitty path 调 `encodeKitty()` 并返回 `{ sequence, columns, rows, imageId? }`,iTerm2 path 调 `encodeITerm2()` 并返回 `{ sequence, columns, rows }` [E: packages/tui/src/terminal-image.ts:664] [E: packages/tui/src/terminal-image.ts:685] [E: packages/tui/src/terminal-image.ts:695] [E: packages/tui/src/terminal-image.ts:701] [E: packages/tui/src/terminal-image.ts:704] [E: packages/tui/src/terminal-image.ts:710]。

## Capability Overrides

TUI 层可用 env 与 API 覆盖自动检测的 `hyperlinks` / `images` / `trueColor`。`detectCapabilities()` 先读 env,`getCapabilities()` 再把 `capabilityOverrides` 铺在检测结果上 [E: packages/tui/src/terminal-image.ts:140] [E: packages/tui/src/terminal-image.ts:164]。

| capability | env | env 取值 | API 字段 |
|---|---|---|---|
| OSC 8 hyperlinks | `PI_HYPERLINKS` | `1` → true,`0` → false;其它(含 `auto`)不覆盖 | `setCapabilityOverrides({ hyperlinks })` |
| inline images | `PI_IMAGE_PROTOCOL` | `kitty` / `iterm2`;`none` 或 `0` → `null`;其它(含 `auto`)不覆盖 | `setCapabilityOverrides({ images })` |
| truecolor | `PI_TRUE_COLOR` | `1` → true,`0` → false;其它(含 `auto`)不覆盖 | `setCapabilityOverrides({ trueColor })` |

env 读取点分别是 `process.env.PI_HYPERLINKS`、`process.env.PI_IMAGE_PROTOCOL`、`process.env.PI_TRUE_COLOR` [E: packages/tui/src/terminal-image.ts:141] [E: packages/tui/src/terminal-image.ts:145] [E: packages/tui/src/terminal-image.ts:152]。API 入口是 `setCapabilityOverrides(overrides: Partial<TerminalCapabilities>)`,读侧是 `detectCapabilities()` 与 `getCapabilities()` [E: packages/tui/src/terminal-image.ts:181] [E: packages/tui/src/terminal-image.ts:140] [E: packages/tui/src/terminal-image.ts:161]。

`parseBooleanCapabilityOverride()` 只认字面量 `"1"` / `"0"` [E: packages/tui/src/terminal-image.ts:136]。`PI_IMAGE_PROTOCOL` 在 `detectCapabilities()` 里 lower-case 后匹配 `kitty`/`iterm2`/`none`/`0` [E: packages/tui/src/terminal-image.ts:145]。

`setCapabilityOverrides(overrides)` 比较 images/trueColor/hyperlinks 三字段,无变化则直接返回;有变化则 `capabilityOverrides = { ...overrides }` 并 `cachedCapabilities = null` [E: packages/tui/src/terminal-image.ts:181] [E: packages/tui/src/terminal-image.ts:189]。传入 `{}` 等于清掉 programmatic override,下次 `getCapabilities()` 只剩 env + 检测 [E: packages/tui/test/terminal-image.test.ts:261]。

`getCapabilities()` 若 `capabilityOverrides.hyperlinks` 已设定,会把该布尔值当作 `tmuxForwardsHyperlink`,从而跳过真实 tmux probe [E: packages/tui/src/terminal-image.ts:163] [E: packages/tui/test/terminal-image.test.ts:270]。env `PI_HYPERLINKS=1` 同样让 `detectCapabilities()` 不再调用 probe [E: packages/tui/src/terminal-image.ts:143]。

precedence:环境检测 → env overlay → programmatic `setCapabilityOverrides()`。后者覆盖前者 [E: packages/tui/src/terminal-image.ts:153] [E: packages/tui/src/terminal-image.ts:164] [E: packages/tui/test/terminal-image.test.ts:258]。

coding-agent 产品层另有 JSON `terminal.hyperlinks` / `terminal.images` / `terminal.trueColor`(`true`/`false`/`"auto"`)。`SettingsManager.getTerminalCapabilityOverrides()` 只把非 `"auto"` 的布尔/`kitty`/`iterm2`/`false` 编进 `Partial<TerminalCapabilities>`,再交给 `setCapabilityOverrides()` [E: packages/coding-agent/src/core/settings-manager.ts:62] [E: packages/coding-agent/src/core/settings-manager.ts:1278] [E: packages/coding-agent/src/main.ts:870]。官方 docs 写 settings 优先于 env,是产品接线,不是 TUI `detectCapabilities()` 自己读 settings [I]。

package root 导出 `setCapabilityOverrides` [E: packages/tui/src/index.ts:151]。

## Kitty encoder

`encodeKitty(base64Data, options)` 使用 `a=T,f=100,q=2` 作为基础参数;`moveCursor === false` 时追加 `C=1`,有 `columns`/`rows`/`imageId` 时追加 `c=`/`r=`/`i=` [E: packages/tui/src/terminal-image.ts:220] [E: packages/tui/src/terminal-image.ts:232] [E: packages/tui/src/terminal-image.ts:234] [E: packages/tui/src/terminal-image.ts:235] [E: packages/tui/src/terminal-image.ts:236] [E: packages/tui/src/terminal-image.ts:237]。这里的 `q=2` 也出现在 delete helper 中,所以该模块统一选择 suppress Kitty protocol replies [E: packages/tui/src/terminal-image.ts:232] [E: packages/tui/src/terminal-image.ts:271] [E: packages/tui/src/terminal-image.ts:279] [I]。

payload 长度不超过 4096 字符时,`encodeKitty()` 直接返回单个 `ESC _G ... ;payload ESC \` sequence [E: packages/tui/src/terminal-image.ts:230] [E: packages/tui/src/terminal-image.ts:239] [E: packages/tui/src/terminal-image.ts:240]。超过 4096 字符时,它按 4096 字符切 chunk:首块带完整 params 和 `m=1`,中间块带 `m=1`,最后块带 `m=0`,最后把 chunks 拼接成一个 string [E: packages/tui/src/terminal-image.ts:243] [E: packages/tui/src/terminal-image.ts:247] [E: packages/tui/src/terminal-image.ts:248] [E: packages/tui/src/terminal-image.ts:249] [E: packages/tui/src/terminal-image.ts:251] [E: packages/tui/src/terminal-image.ts:252] [E: packages/tui/src/terminal-image.ts:254] [E: packages/tui/src/terminal-image.ts:255] [E: packages/tui/src/terminal-image.ts:257] [E: packages/tui/src/terminal-image.ts:263]。

`allocateImageId()` 返回 `[1, 0xfffffffe]` 范围内的随机整数;`deleteKittyImage(imageId)` 删除指定 image，`deleteAllKittyImages()` 删除 placements 并释放 image data，而 `deleteAllKittyPlacements()` 只删除当前 placements、保留已上传数据 [E: packages/tui/src/terminal-image.ts:217] [E: packages/tui/src/terminal-image.ts:271] [E: packages/tui/src/terminal-image.ts:278] [E: packages/tui/src/terminal-image.ts:283] [E: packages/tui/src/terminal-image.ts:284]。`renderImage()` 的 Kitty path 只在 caller 显式传入 `imageId` 时登记 metadata，并把 id 透传/带回；函数内部不调用 `allocateImageId()` [E: packages/tui/src/terminal-image.ts:685] [E: packages/tui/src/terminal-image.ts:686] [E: packages/tui/src/terminal-image.ts:687] [E: packages/tui/src/terminal-image.ts:698] [E: packages/tui/src/terminal-image.ts:701] [I]。

metadata registry 记录 image cell/pixel size 和 transmission generation，并限制为最近 1000 项；`getKittyImagePlacement()` 可从 transmission 重建 placement-only command、记录 transmission/decoded size，`cropKittyImageLine()` 则按隐藏与可见行写入 source `y/h` 和 cell `r` 裁剪参数 [E: packages/tui/src/terminal-image.ts:315] [E: packages/tui/src/terminal-image.ts:320] [E: packages/tui/src/terminal-image.ts:330] [E: packages/tui/src/terminal-image.ts:340] [E: packages/tui/src/terminal-image.ts:343] [E: packages/tui/src/terminal-image.ts:347] [E: packages/tui/src/terminal-image.ts:416] [E: packages/tui/src/terminal-image.ts:441] [E: packages/tui/src/terminal-image.ts:448] [E: packages/tui/src/terminal-image.ts:452] [E: packages/tui/src/terminal-image.ts:458] [E: packages/tui/src/terminal-image.ts:462] [E: packages/tui/src/terminal-image.ts:463]。

## iTerm2 encoder

`encodeITerm2(base64Data, options)` 生成 OSC 1337 `File=` sequence：先写 `inline=0|1`，再始终写 `size=${Buffer.byteLength(base64Data, "base64")}`，然后才是可选 `width`/`height`/`name`/`preserveAspectRatio=0`。[E: packages/tui/src/terminal-image.ts:297] [E: packages/tui/src/terminal-image.ts:298] [E: packages/tui/src/terminal-image.ts:299] [E: packages/tui/src/terminal-image.ts:302] [E: packages/tui/src/terminal-image.ts:303] [E: packages/tui/src/terminal-image.ts:304] [E: packages/tui/src/terminal-image.ts:308] [E: packages/tui/src/terminal-image.ts:312]

`renderImage()` 的 iTerm2 path 把 calculated `columns` 传给 `width`,把 `height` 固定为 `"auto"`,并把 `preserveAspectRatio` 的默认值设为 `true` [E: packages/tui/src/terminal-image.ts:704] [E: packages/tui/src/terminal-image.ts:705] [E: packages/tui/src/terminal-image.ts:706] [E: packages/tui/src/terminal-image.ts:707] [E: packages/tui/src/terminal-image.ts:708]。因此 `ImageRenderOptions.preserveAspectRatio` 当前只影响 iTerm2 render path,不影响 Kitty path [I]。

## 尺寸计算与 metadata sniffing

`calculateImageCellSize(imageDimensions, maxWidthCells, maxHeightCells, cellDimensions, optimizeAspectRatio = false)` 会把 `maxWidthCells` 和 optional `maxHeightCells` floor 到至少 1,把 image pixel width/height 也 clamp 到至少 1,再按 terminal cell pixel dimensions 计算 width scale 与 height scale [E: packages/tui/src/terminal-image.ts:475] [E: packages/tui/src/terminal-image.ts:480] [E: packages/tui/src/terminal-image.ts:482] [E: packages/tui/src/terminal-image.ts:487] [E: packages/tui/src/terminal-image.ts:488]。函数取两个 scale 的较小值保持图像不超过约束,用 `Math.ceil` 得到 columns/rows,最后再 clamp 到最大 columns/rows [E: packages/tui/src/terminal-image.ts:489] [E: packages/tui/src/terminal-image.ts:493] [E: packages/tui/src/terminal-image.ts:495]。

`optimizeAspectRatio === false`（iTerm2 与 `calculateImageRows()`）直接返回这组 ceil 尺寸 [E: packages/tui/src/terminal-image.ts:500] [E: packages/tui/src/terminal-image.ts:520]。Kitty path 打开该开关后，在 width-bound 时比较 `ceil(rows)` 与 `ceil(rows)-1` 相对 ideal row 的 distortion（`max(count/ideal, ideal/count)`），取较小者；height-bound 时对 columns 做同样选择 [E: packages/tui/src/terminal-image.ts:466] [E: packages/tui/src/terminal-image.ts:504] [E: packages/tui/src/terminal-image.ts:506] [E: packages/tui/src/terminal-image.ts:508]。`upperCount <= 1` 时不降到 0 [E: packages/tui/src/terminal-image.ts:467]。这是为了减轻 Kitty 把图像拉伸进整数 cell 时的纵横比失真，而不缩小 iTerm2 的 reservation [E: packages/tui/src/terminal-image.ts:682]。

`calculateImageRows()` 是 `calculateImageCellSize()` 的 rows-only wrapper:它传入 target width cells,不传 max height,再返回 `.rows` [E: packages/tui/src/terminal-image.ts:515] [E: packages/tui/src/terminal-image.ts:520]。

dimension sniffing 会先把 base64 转成 Buffer,但不做 raster/pixel decode,而是从 binary header 读取宽高:PNG 验证 magic bytes 后读 offset 16/20 的 big-endian width/height,JPEG 扫描 SOF0-SOF2 marker,GIF 验证 `GIF87a`/`GIF89a` 后读 logical screen width/height,WebP 验证 RIFF/WEBP 后分别处理 `VP8 `、`VP8L`、`VP8X` chunk [E: packages/tui/src/terminal-image.ts:525] [E: packages/tui/src/terminal-image.ts:531] [E: packages/tui/src/terminal-image.ts:535] [E: packages/tui/src/terminal-image.ts:536] [E: packages/tui/src/terminal-image.ts:546] [E: packages/tui/src/terminal-image.ts:565] [E: packages/tui/src/terminal-image.ts:566] [E: packages/tui/src/terminal-image.ts:567] [E: packages/tui/src/terminal-image.ts:589] [E: packages/tui/src/terminal-image.ts:595] [E: packages/tui/src/terminal-image.ts:600] [E: packages/tui/src/terminal-image.ts:601] [E: packages/tui/src/terminal-image.ts:611] [E: packages/tui/src/terminal-image.ts:617] [E: packages/tui/src/terminal-image.ts:618] [E: packages/tui/src/terminal-image.ts:623] [E: packages/tui/src/terminal-image.ts:626] [E: packages/tui/src/terminal-image.ts:627] [E: packages/tui/src/terminal-image.ts:631] [E: packages/tui/src/terminal-image.ts:632] [E: packages/tui/src/terminal-image.ts:633] [E: packages/tui/src/terminal-image.ts:637] [E: packages/tui/src/terminal-image.ts:638] [I]。

`getImageDimensions(base64Data, mimeType)` 只 dispatches `image/png`、`image/jpeg`、`image/gif` 和 `image/webp`;其他 MIME type 返回 `null` [E: packages/tui/src/terminal-image.ts:648] [E: packages/tui/src/terminal-image.ts:649] [E: packages/tui/src/terminal-image.ts:652] [E: packages/tui/src/terminal-image.ts:655] [E: packages/tui/src/terminal-image.ts:658] [E: packages/tui/src/terminal-image.ts:661]。解析函数出错时都 catch 并返回 `null`,所以 dimension sniffing failure 是 soft failure,不是 render-time exception [E: packages/tui/src/terminal-image.ts:540] [E: packages/tui/src/terminal-image.ts:583] [E: packages/tui/src/terminal-image.ts:605] [E: packages/tui/src/terminal-image.ts:644]。

## Kitty 非 PNG 转码

Kitty graphics protocol 只接受 PNG(`f=100`)。`Image` 组件在 `caps.images === "kitty"` 且 mime 不是 `image/png` 时,用 `setImageTranscoder()` 注册的同步 converter 转成 PNG,再把 `getPngDimensions()` 作为 cell 尺寸(EXIF 旋转后可能变)。没有 transcoder 或转换失败则 `data` 为 `null`,走 text fallback。[E: packages/tui/src/components/image.ts:28] [E: packages/tui/src/components/image.ts:106] [E: packages/tui/src/components/image.ts:107] [E: packages/tui/src/components/image.ts:110] [E: packages/tui/src/terminal-image.ts:523] `encodeKitty()` / `renderImage()` 本身不转码,只编码已经是 PNG 的 payload。[E: packages/tui/src/terminal-image.ts:220] [E: packages/tui/test/terminal-image.test.ts:854] coding-agent interactive 在 `init()` 里 `ensurePngTranscoder()`,让 extension 图片也能走这条路径。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:989] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2041]

## Fallback 与 hyperlink

`hyperlink(text, url)` 返回 OSC 8 open sequence、visible text、OSC 8 close sequence 的拼接 [E: packages/tui/src/terminal-image.ts:727]。该 helper 本身不检查 `getCapabilities().hyperlinks`;调用方需要根据 capabilities 决定是否使用 OSC 8 或 legacy text URL [I]。

`imageFallback(mimeType, dimensions, filename)` 生成 `[Image: ...]` 文本：home 下绝对路径缩写为 `~/...`；terminal 支持 hyperlink 且 filename 是 absolute path 时，显示文本用 OSC 8 链到完整 `file://` URL。随后加入 `[mimeType]` 与可选 `<widthPx>x<heightPx>` [E: packages/tui/src/terminal-image.ts:731] [E: packages/tui/src/terminal-image.ts:734] [E: packages/tui/src/terminal-image.ts:744] [E: packages/tui/src/terminal-image.ts:746] [E: packages/tui/src/terminal-image.ts:748] [E: packages/tui/src/terminal-image.ts:754]。relative path / basename 不生成 file hyperlink [E: packages/tui/src/terminal-image.ts:748] [E: packages/tui/src/terminal-image.ts:751]。

## WezTerm fullscreen 行清除

`TuiAltScreen.doRender()` 默认对每个脏行写 `CSI row;1H` + `EL`（`\x1b[2K`）再画内容。[E: packages/tui/src/tui-alt-screen.ts:1760] WezTerm 会在后续 EL 清掉与 Kitty image 相交的 cell。判定是 `WEZTERM_PANE` 或 `TERM_PROGRAM=wezterm`。[E: packages/tui/src/tui-alt-screen.ts:1701] 当 fullscreen + Kitty 且本帧含 image line 时 `drawKittyImagesLast`:先对脏行只发 `\x1b[2K`,再画非 image 行(无 EL),最后才画 image 行,避免后写的 EL 切到 placement。[E: packages/tui/src/tui-alt-screen.ts:1740] [E: packages/tui/src/tui-alt-screen.ts:1745] [E: packages/tui/src/tui-alt-screen.ts:1750] [E: packages/tui/src/tui-alt-screen.ts:1755] WezTerm 还会在 placement 覆盖的 cell 行变脏但 image 锚点行没变时 `imageCellsNeedRedraw`,以免滚动时丢掉仍在屏上的图。[E: packages/tui/src/tui-alt-screen.ts:1702] [E: packages/tui/src/tui-alt-screen.ts:1704] text-only 帧和其它终端仍走 interleaved EL+draw。[E: packages/tui/src/tui-alt-screen.ts:1757] 本行为属于 fullscreen renderer，不在 `encodeKitty()` 里。

## 设计动机与权衡

capability detection 对 tmux/screen 和未知 terminal 采取保守策略:tmux/screen 禁用 image protocol,未知 terminal 禁用 image protocol 和 OSC 8 hyperlink,只信 `COLORTERM` 的 truecolor hint [E: packages/tui/src/terminal-image.ts:80] [E: packages/tui/src/terminal-image.ts:81] [E: packages/tui/src/terminal-image.ts:85] [E: packages/tui/src/terminal-image.ts:86] [E: packages/tui/src/terminal-image.ts:133]。这避免把不可见或不可靠的 terminal escape sequence 当作用户可读内容 [I]。

Kitty encoder 的 chunking 把 base64 payload 拆成 4096 字符段,这是为了符合 Kitty graphics protocol 的 multipart payload pattern,同时保留首段完整 metadata 和末段结束标记 [E: packages/tui/src/terminal-image.ts:230] [E: packages/tui/src/terminal-image.ts:252] [E: packages/tui/src/terminal-image.ts:255] [I]。

dimension sniffing 只读取 header 字段而不进行 raster/pixel decode,使 terminal render path 可以在没有 image decoder dependency 的情况下估算 cell rows [E: packages/tui/src/terminal-image.ts:525] [E: packages/tui/src/terminal-image.ts:535] [E: packages/tui/src/terminal-image.ts:546] [E: packages/tui/src/terminal-image.ts:566] [E: packages/tui/src/terminal-image.ts:589] [E: packages/tui/src/terminal-image.ts:600] [E: packages/tui/src/terminal-image.ts:611] [E: packages/tui/src/terminal-image.ts:626] [I]。

## Gotcha

- `renderImage()` 的签名要求 caller 传入 `ImageDimensions`,cell size calculation 直接使用这个参数;函数签名中没有 `mimeType` 参数 [E: packages/tui/src/terminal-image.ts:666] [E: packages/tui/src/terminal-image.ts:648] [I]。
- `preserveAspectRatio` 在 `ImageRenderOptions` 中存在,但 `renderImage()` 只在 iTerm2 path 传给 `encodeITerm2()`;Kitty path 由 calculated columns/rows 控制显示尺寸，并额外用 distortion 比较可能减一格 [E: packages/tui/src/terminal-image.ts:695] [E: packages/tui/src/terminal-image.ts:682] [E: packages/tui/src/terminal-image.ts:504] [E: packages/tui/src/terminal-image.ts:708] [I]。
- WezTerm 的分阶段 EL/draw 只发生在 fullscreen Kitty 且本帧有 image line 时；main-screen renderer 不走这条路径 [E: packages/tui/src/tui-alt-screen.ts:1740]。
- Kitty 上 JPEG/GIF/WebP/BMP 必须先 `setImageTranscoder`;未注册时 `Image` 显示 text fallback,不是 escape sequence。[E: packages/tui/src/components/image.ts:28] [E: packages/tui/src/components/image.ts:106]
- `isImageLine()` 只检查 Kitty/iTerm2 escape prefix 是否存在,不会验证 escape sequence 是否完整或 base64 payload 是否有效 [E: packages/tui/src/terminal-image.ts:201] [E: packages/tui/src/terminal-image.ts:203] [E: packages/tui/src/terminal-image.ts:207] [I]。
- `getCapabilities()` cache 会冻结第一次 detection+override 合并结果;测试或环境变化后需要调用 `resetCapabilitiesCache()`、`setCapabilities()` 或 `setCapabilityOverrides()` [E: packages/tui/src/terminal-image.ts:161] [E: packages/tui/src/terminal-image.ts:176] [E: packages/tui/src/terminal-image.ts:181] [E: packages/tui/src/terminal-image.ts:194]。
- TUI env 不把 `auto` 当有效覆盖;`PI_HYPERLINKS=auto` 与未设置等价。coding-agent settings 的 `"auto"` 则是“不要写入 override 对象” [E: packages/tui/src/terminal-image.ts:136] [E: packages/coding-agent/src/core/settings-manager.ts:1284]。
- 强制打开不存在的 image/hyperlink protocol 会写出终端无法理解的 escape;官方 terminal-setup 要求只覆盖完整通路确实支持的能力 [I]。
- `getImageDimensions()` 不处理 BMP,即使更上层可能把 BMP 转换成 PNG 后再进入 TUI;本节点只按 `terminal-image.ts` 的 MIME dispatch 列出 PNG/JPEG/GIF/WebP [E: packages/tui/src/terminal-image.ts:648] [E: packages/tui/src/terminal-image.ts:661] [I]。

## 跨包边界

本节点属于 `pkg: tui`。它向 `surface.misc.images` 提供 terminal display primitive:`renderImage()` 接收已准备好的 base64 image data 和 dimensions,根据 terminal capability 产出 inline image escape sequence 或 `null` [E: packages/tui/src/terminal-image.ts:664] [E: packages/tui/src/terminal-image.ts:665] [E: packages/tui/src/terminal-image.ts:666] [E: packages/tui/src/terminal-image.ts:671] [E: packages/tui/src/terminal-image.ts:701] [E: packages/tui/src/terminal-image.ts:710]。`surface.misc.images` 负责解释图片怎样从 CLI、agent message 或 tool result 进入用户可见面;本节点不覆盖 provider vision capability、image upload、image generation 或 coding-agent settings 的全链路 [I]。

## Sources

- packages/tui/src/terminal-image.ts
- packages/tui/src/index.ts
- packages/tui/src/tui-alt-screen.ts
- packages/tui/src/components/image.ts
- packages/tui/test/terminal-image.test.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts

## 相关

- [surface.misc.images](../../surface/misc/images.md): 图像输入与终端图像的产品可见面,覆盖 CLI `@file`、image settings、agent message image content 与 TUI display 的衔接。
- [subsys.tui.terminal-capabilities](terminal-capabilities.md): Kitty keyboard protocol negotiation;与本节点的 hyperlink/image/truecolor 检测是不同 capability 层。
