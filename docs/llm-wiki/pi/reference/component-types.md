---
id: ref.tui.component-types
title: TUI 组件类型目录(15)
kind: catalog
tier: T3
pkg: tui
source:
  - packages/tui/src/index.ts
  - packages/tui/src/components/box.ts
  - packages/tui/src/components/cancellable-loader.ts
  - packages/tui/src/components/editor.ts
  - packages/tui/src/components/h-stack.ts
  - packages/tui/src/components/image.ts
  - packages/tui/src/components/input.ts
  - packages/tui/src/components/loader.ts
  - packages/tui/src/components/markdown.ts
  - packages/tui/src/components/scroll-view.ts
  - packages/tui/src/components/select-list.ts
  - packages/tui/src/components/settings-list.ts
  - packages/tui/src/components/spacer.ts
  - packages/tui/src/components/text.ts
  - packages/tui/src/components/truncated-text.ts
  - packages/tui/src/components/v-stack.ts
symbols:
  - Box
  - CancellableLoader
  - Editor
  - HStack
  - Image
  - Input
  - Loader
  - Markdown
  - ScrollView
  - SelectList
  - SettingsList
  - Spacer
  - Text
  - TruncatedText
  - VStack
evidence: explicit
status: verified
updated: c1019d9202
related:
  - subsys.tui.component-model
---

> `ref.tui.component-types` 是 `@earendil-works/pi-tui` 的 public concrete component catalog：逐实例列出 package root 导出的 15 个 UI component class、入口、职责和源码证据。

## 能回答的问题

- `packages/tui/src/components/` 当前有哪些可复用 TUI component classes?
- 哪些组件只负责 display rendering,哪些组件还处理 keyboard input?
- 每个 component 的 constructor / options / callbacks 入口是什么?
- `Editor`、`Input`、`SelectList`、`Markdown` 这些核心组件分别承担什么职责?
- `packages/tui/src/index.ts` 对外导出了哪些 component symbols?

## Catalog 口径

本轮 L2 只采信 `packages/tui/src/components/` 和 `packages/tui/src/index.ts`;`Component` / `Focusable` 的 runtime protocol 定义位于 `packages/tui/src/tui.ts`,不在本轮允许证据范围内,因此本节点不把 protocol 语义作为已核 `[E]` 结论 [U]。

`packages/tui/src/index.ts` 是 component public export surface：除原有 12 个组件外，本轮新增导出 `HStack`、`ScrollView` 和 `VStack`。[E: packages/tui/src/index.ts:16] [E: packages/tui/src/index.ts:21] [E: packages/tui/src/index.ts:33] 本 catalog 以 package-root 公开 concrete class 为口径；内部 `Stack` 与 `AltScreenFlashContainer` 不计入 15 个实例。[I]

## 组件实例目录

| 组件名 | 文件 | props / 入口 | 职责 | 关键 evidence |
| --- | --- | --- | --- | --- |
| `Box` | `packages/tui/src/components/box.ts` | `constructor(paddingX = 1, paddingY = 1, bgFn?)`; child API: `addChild`, `removeChild`, `clear`, `setBgFn`; `render(width)` | Container component:按顺序渲染 children,给子内容加水平/垂直 padding,可把整行交给 background function 处理;带 render cache,child 或尺寸变化时失效。 | class 实现 `Component` [E: packages/tui/src/components/box.ts:14];constructor/children API [E: packages/tui/src/components/box.ts:23] [E: packages/tui/src/components/box.ts:29] [E: packages/tui/src/components/box.ts:34] [E: packages/tui/src/components/box.ts:42] [E: packages/tui/src/components/box.ts:47];渲染 children 并应用 padding/background/cache [E: packages/tui/src/components/box.ts:79] [E: packages/tui/src/components/box.ts:85] [E: packages/tui/src/components/box.ts:112] [E: packages/tui/src/components/box.ts:122] [E: packages/tui/src/components/box.ts:127] |
| `CancellableLoader` | `packages/tui/src/components/cancellable-loader.ts` | Extends `Loader`; `signal`, `aborted`, `onAbort?`, `handleInput(data)`, `dispose()` | 可取消 loading indicator:继承 `Loader` 的显示/动画能力,额外持有 `AbortController`,在 cancel keybinding 命中时 abort 并触发 `onAbort`。 | extends `Loader` [E: packages/tui/src/components/cancellable-loader.ts:13];暴露 `signal` / `aborted` [E: packages/tui/src/components/cancellable-loader.ts:20] [E: packages/tui/src/components/cancellable-loader.ts:25];cancel keybinding handling aborts and calls callback [E: packages/tui/src/components/cancellable-loader.ts:29] [E: packages/tui/src/components/cancellable-loader.ts:31] [E: packages/tui/src/components/cancellable-loader.ts:32] [E: packages/tui/src/components/cancellable-loader.ts:33] |
| `Editor` | `packages/tui/src/components/editor.ts` | `constructor(tui, theme, options?: EditorOptions)`; options: `paddingX?`, `autocompleteMaxVisible?`; callbacks: `onSubmit?`, `onChange?`; API: `setAutocompleteProvider`, `addToHistory`, `getText`, `setText`, `handleInput`, `render` | Multi-line focused editor:维护 lines/cursor/scroll/history/undo/kill-ring/paste state,渲染 bordered multiline input,处理 keybindings、paste、autocomplete 和 submit/change callbacks。 | implements `Component, Focusable` [E: packages/tui/src/components/editor.ts:270];state/callbacks/options [E: packages/tui/src/components/editor.ts:271] [E: packages/tui/src/components/editor.ts:341] [E: packages/tui/src/components/editor.ts:342] [E: packages/tui/src/components/editor.ts:345] [E: packages/tui/src/components/editor.ts:349] [E: packages/tui/src/components/editor.ts:351];public API entries [E: packages/tui/src/components/editor.ts:389] [E: packages/tui/src/components/editor.ts:399] [E: packages/tui/src/components/editor.ts:981] [E: packages/tui/src/components/editor.ts:1010];render 计算 wrapping/scroll/autocomplete list [E: packages/tui/src/components/editor.ts:482] [E: packages/tui/src/components/editor.ts:497] [E: packages/tui/src/components/editor.ts:500] [E: packages/tui/src/components/editor.ts:591];keyboard入口 [E: packages/tui/src/components/editor.ts:603];autocomplete request path [E: packages/tui/src/components/editor.ts:2165] [E: packages/tui/src/components/editor.ts:2252] |
| `HStack` | `packages/tui/src/components/h-stack.ts` | `constructor(children?: StackChild[], options?: StackOptions)`; child entries support basis/grow/shrink/min/max/visible | 横向 stack：测量 child intrinsic width，按约束分配列宽，并以 `start/center/end/stretch` 做垂直对齐；也是 fullscreen layout node。 | class/constructor [E: packages/tui/src/components/h-stack.ts:5] [E: packages/tui/src/components/h-stack.ts:8];宽度测量与分配 [E: packages/tui/src/components/h-stack.ts:18] [E: packages/tui/src/components/h-stack.ts:22];按列合成 [E: packages/tui/src/components/h-stack.ts:38] |
| `Image` | `packages/tui/src/components/image.ts` | `constructor(base64Data, mimeType, theme, options?: ImageOptions, dimensions?)`; options: `maxWidthCells?`, `maxHeightCells?`, `filename?`, `imageId?`; API: `getImageId`, `invalidate`, `render` | Terminal image component:根据 terminal image capabilities 渲染 Kitty/iTerm 等图像序列;不可渲染时输出 styled fallback text;按 width 缓存行。 | `ImageOptions` 字段 [E: packages/tui/src/components/image.ts:17];class fields and constructor [E: packages/tui/src/components/image.ts:25] [E: packages/tui/src/components/image.ts:36];capability 分支和 fallback [E: packages/tui/src/components/image.ts:71] [E: packages/tui/src/components/image.ts:74] [E: packages/tui/src/components/image.ts:114] [E: packages/tui/src/components/image.ts:118] |
| `Input` | `packages/tui/src/components/input.ts` | No explicit constructor; public callbacks `onSubmit?`, `onEscape?`; API: `getValue`, `setValue`, `handleInput`, `render` | Single-line focused input:保存 value/cursor,支持横向 scrolling、bracketed paste、UndoStack、KillRing 和 editor-like keybindings;render 时输出 `> ` prompt 与 fake cursor。 | implements `Component, Focusable` [E: packages/tui/src/components/input.ts:19];callbacks and focus flag [E: packages/tui/src/components/input.ts:22] [E: packages/tui/src/components/input.ts:23] [E: packages/tui/src/components/input.ts:26];value API / input entry [E: packages/tui/src/components/input.ts:39] [E: packages/tui/src/components/input.ts:43] [E: packages/tui/src/components/input.ts:48];submit/escape/keybinding handling [E: packages/tui/src/components/input.ts:86] [E: packages/tui/src/components/input.ts:89] [E: packages/tui/src/components/input.ts:101];render prompt/cursor [E: packages/tui/src/components/input.ts:378] [E: packages/tui/src/components/input.ts:380] [E: packages/tui/src/components/input.ts:437] |
| `Loader` | `packages/tui/src/components/loader.ts` | Extends `Text`; `constructor(ui, spinnerColorFn, messageColorFn, message = "Loading...", indicator?)`; API: `start`, `stop`, `setMessage`, `setIndicator`, `render` | Animated loading text:用 frames/interval 更新 spinner frame 和 message,每次 display 更新后请求 TUI rerender;`render` 在 `Text` 输出前加空行。 | `LoaderIndicatorOptions` [E: packages/tui/src/components/loader.ts:4];extends `Text` [E: packages/tui/src/components/loader.ts:17];constructor and default message [E: packages/tui/src/components/loader.ts:28] [E: packages/tui/src/components/loader.ts:32];animation interval/requestRender [E: packages/tui/src/components/loader.ts:72] [E: packages/tui/src/components/loader.ts:83] [E: packages/tui/src/components/loader.ts:89] |
| `Markdown` | `packages/tui/src/components/markdown.ts` | `constructor(text, paddingX, paddingY, theme, defaultTextStyle?, options?)`; options新增同步 `transform(markdown, availableWidth)` | Markdown renderer：transform 在 parser 前接收扣除 padding 后的精确 content width，再进入 `marked` tokenization；render cache 仍按原 text+width 命中。 | options/transform signature [E: packages/tui/src/components/markdown.ts:98] [E: packages/tui/src/components/markdown.ts:104];content width 与 parser 前调用 [E: packages/tui/src/components/markdown.ts:160] [E: packages/tui/src/components/markdown.ts:161] [E: packages/tui/src/components/markdown.ts:177];cache key [E: packages/tui/src/components/markdown.ts:155] |
| `ScrollView` | `packages/tui/src/components/scroll-view.ts` | `constructor(component, options?)`; vertical axis；follow/primary/overscroll/scrollbar；API: `scrollTo`, `scrollBy`, `scrollToStart`, `scrollToEnd`, `setScrollbar` | 单 child 的垂直 viewport：维护 scrollTop/follow-end，返回未消费 delta 供 nested chaining，并支持 hidden/auto/always scrollbar。 | class/options [E: packages/tui/src/components/scroll-view.ts:6] [E: packages/tui/src/components/scroll-view.ts:16] [E: packages/tui/src/components/scroll-view.ts:33];scroll API [E: packages/tui/src/components/scroll-view.ts:113] [E: packages/tui/src/components/scroll-view.ts:124] [E: packages/tui/src/components/scroll-view.ts:137];单 child invariant [E: packages/tui/src/components/scroll-view.ts:174] |
| `SelectList` | `packages/tui/src/components/select-list.ts` | `constructor(items, maxVisible, theme, layout?)`; types: `SelectItem`, `SelectListTheme`, `SelectListLayoutOptions`; callbacks: `onSelect?`, `onCancel?`, `onSelectionChange?`; API: `setFilter`, `setSelectedIndex`, `getSelectedItem`, `handleInput`, `render` | Command/menu style selection list:过滤 prefix match,维护 selectedIndex,可滚动显示 maxVisible 个条目,支持 primary/description 双列布局和 up/down/confirm/cancel keybindings。 | item/theme/layout types [E: packages/tui/src/components/select-list.ts:12] [E: packages/tui/src/components/select-list.ts:18] [E: packages/tui/src/components/select-list.ts:34];constructor/callbacks [E: packages/tui/src/components/select-list.ts:48] [E: packages/tui/src/components/select-list.ts:52];filter/render/scroll [E: packages/tui/src/components/select-list.ts:60] [E: packages/tui/src/components/select-list.ts:74] [E: packages/tui/src/components/select-list.ts:103];input handling [E: packages/tui/src/components/select-list.ts:112] |
| `SettingsList` | `packages/tui/src/components/settings-list.ts` | `constructor(items, maxVisible, theme, onChange, onCancel, options?)`; API: `updateValue`, `handleInput`, `render` | Settings picker：Enter 或搜索关闭/查询为空时的 Space 激活条目；搜索已有 query 时 Space 会进入 search input，从而支持多词查询。 | input entry [E: packages/tui/src/components/settings-list.ts:168];Space gate [E: packages/tui/src/components/settings-list.ts:185] [E: packages/tui/src/components/settings-list.ts:187] [E: packages/tui/src/components/settings-list.ts:189];search forwarding/filter [E: packages/tui/src/components/settings-list.ts:192] [E: packages/tui/src/components/settings-list.ts:193] [E: packages/tui/src/components/settings-list.ts:194] |
| `Spacer` | `packages/tui/src/components/spacer.ts` | `constructor(lines = 1)`; API: `setLines`, `render` | Layout spacer:输出指定数量的 empty lines,不消费 width,用于在 component tree 中制造垂直间距。 | implements `Component` [E: packages/tui/src/components/spacer.ts:6];lines constructor/setter [E: packages/tui/src/components/spacer.ts:9] [E: packages/tui/src/components/spacer.ts:13];render empty lines loop [E: packages/tui/src/components/spacer.ts:21] |
| `Text` | `packages/tui/src/components/text.ts` | `constructor(text = "", paddingX = 1, paddingY = 1, customBgFn?)`; API: `setText`, `setCustomBgFn`, `invalidate`, `render` | Plain multi-line text display:替换 tabs,ANSI-aware wrap,加 padding/background,按 text+width 缓存渲染结果;空文本返回空行数组。 | implements `Component` [E: packages/tui/src/components/text.ts:7];constructor and mutators [E: packages/tui/src/components/text.ts:18] [E: packages/tui/src/components/text.ts:25] [E: packages/tui/src/components/text.ts:32] [E: packages/tui/src/components/text.ts:39];empty/wrap/padding/background/cache [E: packages/tui/src/components/text.ts:57] [E: packages/tui/src/components/text.ts:61] [E: packages/tui/src/components/text.ts:67] [E: packages/tui/src/components/text.ts:79] [E: packages/tui/src/components/text.ts:97] [E: packages/tui/src/components/text.ts:100] |
| `TruncatedText` | `packages/tui/src/components/truncated-text.ts` | `constructor(text, paddingX = 0, paddingY = 0)`; API: `render`, `invalidate` | Single-line clipped text display:只取首行,按 available width truncate,再补 horizontal/vertical padding 到 viewport width。 | implements `Component` [E: packages/tui/src/components/truncated-text.ts:7];constructor [E: packages/tui/src/components/truncated-text.ts:12];first-line + truncate + padding [E: packages/tui/src/components/truncated-text.ts:37] [E: packages/tui/src/components/truncated-text.ts:44] [E: packages/tui/src/components/truncated-text.ts:52] |
| `VStack` | `packages/tui/src/components/v-stack.ts` | `constructor(children?: StackChild[], options?: StackOptions)`; child entries support basis/grow/shrink/min/max/visible | 纵向 stack：direct render 按顺序连接 visible children 并插入 gap；fullscreen layout 额外执行尺寸分配与 clip。 | class/constructor [E: packages/tui/src/components/v-stack.ts:3] [E: packages/tui/src/components/v-stack.ts:6];visible/gap/child render [E: packages/tui/src/components/v-stack.ts:12] [E: packages/tui/src/components/v-stack.ts:16] [E: packages/tui/src/components/v-stack.ts:18] |

## 形态分组

Display/layout components 包括 `Box`、`HStack`、`VStack`、`ScrollView`、`Image`、`Markdown`、`Spacer`、`Text`、`TruncatedText` 和主要靠定时器刷新的 `Loader` [I]。Interactive components 是实现 `handleInput(data)` 或通过 subclass 加入输入处理的组件：`CancellableLoader`、`Editor`、`Input`、`SelectList`、`SettingsList` [E: packages/tui/src/components/cancellable-loader.ts:29] [E: packages/tui/src/components/editor.ts:603] [E: packages/tui/src/components/input.ts:48] [E: packages/tui/src/components/select-list.ts:112] [E: packages/tui/src/components/settings-list.ts:168]。

`Editor` 和 `Input` 都声明实现 `Focusable`,并在 render output 中按 `focused` 状态放置 cursor marker / fake cursor;`Editor` 在 multiline layout line 中插入 `CURSOR_MARKER`,而 `Input` 在当前 grapheme 前插入 marker 并使用 inverse video fake cursor [E: packages/tui/src/components/editor.ts:270] [E: packages/tui/src/components/editor.ts:278] [E: packages/tui/src/components/editor.ts:550] [E: packages/tui/src/components/input.ts:19] [E: packages/tui/src/components/input.ts:26] [E: packages/tui/src/components/input.ts:434]。

## 跨节点关系

`subsys.tui.component-model` 负责解释 component contract 与 runtime；`subsys.tui.layout` 解释 stack/scroll 的 fixed-viewport 语义。本节点只做 15 个 public concrete classes 的逐实例 catalog [I]。

## Sources

- `packages/tui/src/index.ts`
- `packages/tui/src/components/box.ts`
- `packages/tui/src/components/cancellable-loader.ts`
- `packages/tui/src/components/editor.ts`
- `packages/tui/src/components/h-stack.ts`
- `packages/tui/src/components/image.ts`
- `packages/tui/src/components/input.ts`
- `packages/tui/src/components/loader.ts`
- `packages/tui/src/components/markdown.ts`
- `packages/tui/src/components/scroll-view.ts`
- `packages/tui/src/components/select-list.ts`
- `packages/tui/src/components/settings-list.ts`
- `packages/tui/src/components/spacer.ts`
- `packages/tui/src/components/text.ts`
- `packages/tui/src/components/truncated-text.ts`
- `packages/tui/src/components/v-stack.ts`

## 相关

- `subsys.tui.component-model`:解释 `Component` / `Focusable` 如何被 TUI runtime、focus 管线和 diff renderer 使用。
