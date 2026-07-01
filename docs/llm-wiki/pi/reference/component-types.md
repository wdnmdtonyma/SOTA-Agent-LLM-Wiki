---
id: ref.tui.component-types
title: TUI 组件类型目录(12)
kind: catalog
tier: T3
pkg: tui
source:
  - packages/tui/src/index.ts
  - packages/tui/src/components/box.ts
  - packages/tui/src/components/cancellable-loader.ts
  - packages/tui/src/components/editor.ts
  - packages/tui/src/components/image.ts
  - packages/tui/src/components/input.ts
  - packages/tui/src/components/loader.ts
  - packages/tui/src/components/markdown.ts
  - packages/tui/src/components/select-list.ts
  - packages/tui/src/components/settings-list.ts
  - packages/tui/src/components/spacer.ts
  - packages/tui/src/components/text.ts
  - packages/tui/src/components/truncated-text.ts
symbols:
  - Box
  - CancellableLoader
  - Editor
  - Image
  - Input
  - Loader
  - Markdown
  - SelectList
  - SettingsList
  - Spacer
  - Text
  - TruncatedText
evidence: explicit
status: verified
updated: 8c943640
related:
  - subsys.tui.component-model
---

> `ref.tui.component-types` 是 `@earendil-works/pi-tui` 的 component catalog:逐实例列出 `packages/tui/src/components/` 下 12 个 UI component class 的 public entry、props/options、职责和源码证据。

## 能回答的问题

- `packages/tui/src/components/` 当前有哪些可复用 TUI component classes?
- 哪些组件只负责 display rendering,哪些组件还处理 keyboard input?
- 每个 component 的 constructor / options / callbacks 入口是什么?
- `Editor`、`Input`、`SelectList`、`Markdown` 这些核心组件分别承担什么职责?
- `packages/tui/src/index.ts` 对外导出了哪些 component symbols?

## Catalog 口径

本轮 L2 只采信 `packages/tui/src/components/` 和 `packages/tui/src/index.ts`;`Component` / `Focusable` 的 runtime protocol 定义位于 `packages/tui/src/tui.ts`,不在本轮允许证据范围内,因此本节点不把 protocol 语义作为已核 `[E]` 结论 [U]。

`packages/tui/src/index.ts` 是 component public export surface:它导出 `Box`、`CancellableLoader`、`Editor`、`Image`、`Input`、`Loader`、`Markdown`、`SelectList`、`SettingsList`、`Spacer`、`Text` 和 `TruncatedText` [E: packages/tui/src/index.ts:12] [E: packages/tui/src/index.ts:13] [E: packages/tui/src/index.ts:14] [E: packages/tui/src/index.ts:15] [E: packages/tui/src/index.ts:16] [E: packages/tui/src/index.ts:17] [E: packages/tui/src/index.ts:18] [E: packages/tui/src/index.ts:21] [E: packages/tui/src/index.ts:26] [E: packages/tui/src/index.ts:27] [E: packages/tui/src/index.ts:28] [E: packages/tui/src/index.ts:29]。本 catalog 以 `packages/tui/src/components/` 目录实际 12 个文件为实例清单,逐个映射到下表 12 个 class [I]。

## 组件实例目录

| 组件名 | 文件 | props / 入口 | 职责 | 关键 evidence |
| --- | --- | --- | --- | --- |
| `Box` | `packages/tui/src/components/box.ts` | `constructor(paddingX = 1, paddingY = 1, bgFn?)`; child API: `addChild`, `removeChild`, `clear`, `setBgFn`; `render(width)` | Container component:按顺序渲染 children,给子内容加水平/垂直 padding,可把整行交给 background function 处理;带 render cache,child 或尺寸变化时失效。 | class 实现 `Component` [E: packages/tui/src/components/box.ts:14];constructor/children API [E: packages/tui/src/components/box.ts:23] [E: packages/tui/src/components/box.ts:29] [E: packages/tui/src/components/box.ts:34] [E: packages/tui/src/components/box.ts:42] [E: packages/tui/src/components/box.ts:47];渲染 children 并应用 padding/background/cache [E: packages/tui/src/components/box.ts:79] [E: packages/tui/src/components/box.ts:85] [E: packages/tui/src/components/box.ts:112] [E: packages/tui/src/components/box.ts:122] [E: packages/tui/src/components/box.ts:127] |
| `CancellableLoader` | `packages/tui/src/components/cancellable-loader.ts` | Extends `Loader`; `signal`, `aborted`, `onAbort?`, `handleInput(data)`, `dispose()` | 可取消 loading indicator:继承 `Loader` 的显示/动画能力,额外持有 `AbortController`,在 cancel keybinding 命中时 abort 并触发 `onAbort`。 | extends `Loader` [E: packages/tui/src/components/cancellable-loader.ts:13];暴露 `signal` / `aborted` [E: packages/tui/src/components/cancellable-loader.ts:20] [E: packages/tui/src/components/cancellable-loader.ts:25];cancel keybinding handling aborts and calls callback [E: packages/tui/src/components/cancellable-loader.ts:29] [E: packages/tui/src/components/cancellable-loader.ts:31] [E: packages/tui/src/components/cancellable-loader.ts:32] [E: packages/tui/src/components/cancellable-loader.ts:33] |
| `Editor` | `packages/tui/src/components/editor.ts` | `constructor(tui, theme, options?: EditorOptions)`; options: `paddingX?`, `autocompleteMaxVisible?`; callbacks: `onSubmit?`, `onChange?`; API: `setAutocompleteProvider`, `addToHistory`, `getText`, `setText`, `handleInput`, `render` | Multi-line focused editor:维护 lines/cursor/scroll/history/undo/kill-ring/paste state,渲染 bordered multiline input,处理 keybindings、paste、autocomplete 和 submit/change callbacks。 | implements `Component, Focusable` [E: packages/tui/src/components/editor.ts:252];state/callbacks/options [E: packages/tui/src/components/editor.ts:253] [E: packages/tui/src/components/editor.ts:323] [E: packages/tui/src/components/editor.ts:324] [E: packages/tui/src/components/editor.ts:327] [E: packages/tui/src/components/editor.ts:331] [E: packages/tui/src/components/editor.ts:333];public API entries [E: packages/tui/src/components/editor.ts:371] [E: packages/tui/src/components/editor.ts:381] [E: packages/tui/src/components/editor.ts:969] [E: packages/tui/src/components/editor.ts:998];render 计算 wrapping/scroll/autocomplete list [E: packages/tui/src/components/editor.ts:464] [E: packages/tui/src/components/editor.ts:479] [E: packages/tui/src/components/editor.ts:482] [E: packages/tui/src/components/editor.ts:579];keyboard入口 [E: packages/tui/src/components/editor.ts:591];autocomplete request path [E: packages/tui/src/components/editor.ts:2121] [E: packages/tui/src/components/editor.ts:2208] |
| `Image` | `packages/tui/src/components/image.ts` | `constructor(base64Data, mimeType, theme, options?: ImageOptions, dimensions?)`; options: `maxWidthCells?`, `maxHeightCells?`, `filename?`, `imageId?`; API: `getImageId`, `invalidate`, `render` | Terminal image component:根据 terminal image capabilities 渲染 Kitty/iTerm 等图像序列;不可渲染时输出 styled fallback text;按 width 缓存行。 | `ImageOptions` 字段 [E: packages/tui/src/components/image.ts:16];class fields and constructor [E: packages/tui/src/components/image.ts:24] [E: packages/tui/src/components/image.ts:35];capability 分支和 fallback [E: packages/tui/src/components/image.ts:70] [E: packages/tui/src/components/image.ts:73] [E: packages/tui/src/components/image.ts:113] [E: packages/tui/src/components/image.ts:117] |
| `Input` | `packages/tui/src/components/input.ts` | No explicit constructor; public callbacks `onSubmit?`, `onEscape?`; API: `getValue`, `setValue`, `handleInput`, `render` | Single-line focused input:保存 value/cursor,支持横向 scrolling、bracketed paste、UndoStack、KillRing 和 editor-like keybindings;render 时输出 `> ` prompt 与 fake cursor。 | implements `Component, Focusable` [E: packages/tui/src/components/input.ts:19];callbacks and focus flag [E: packages/tui/src/components/input.ts:22] [E: packages/tui/src/components/input.ts:23] [E: packages/tui/src/components/input.ts:26];value API / input entry [E: packages/tui/src/components/input.ts:39] [E: packages/tui/src/components/input.ts:43] [E: packages/tui/src/components/input.ts:48];submit/escape/keybinding handling [E: packages/tui/src/components/input.ts:86] [E: packages/tui/src/components/input.ts:89] [E: packages/tui/src/components/input.ts:101];render prompt/cursor [E: packages/tui/src/components/input.ts:378] [E: packages/tui/src/components/input.ts:380] [E: packages/tui/src/components/input.ts:437] |
| `Loader` | `packages/tui/src/components/loader.ts` | Extends `Text`; `constructor(ui, spinnerColorFn, messageColorFn, message = "Loading...", indicator?)`; API: `start`, `stop`, `setMessage`, `setIndicator`, `render` | Animated loading text:用 frames/interval 更新 spinner frame 和 message,每次 display 更新后请求 TUI rerender;`render` 在 `Text` 输出前加空行。 | `LoaderIndicatorOptions` [E: packages/tui/src/components/loader.ts:4];extends `Text` [E: packages/tui/src/components/loader.ts:17];constructor and default message [E: packages/tui/src/components/loader.ts:28] [E: packages/tui/src/components/loader.ts:32];animation interval/requestRender [E: packages/tui/src/components/loader.ts:72] [E: packages/tui/src/components/loader.ts:83] [E: packages/tui/src/components/loader.ts:89] |
| `Markdown` | `packages/tui/src/components/markdown.ts` | `constructor(text, paddingX, paddingY, theme, defaultTextStyle?, options?)`; options: `preserveOrderedListMarkers?`, `preserveBackslashEscapes?`; API: `setText`, `invalidate`, `render` | Markdown renderer:用 `marked` tokenization,按 theme 渲染 heading/link/code/list/table/blockquote 等 terminal text,支持 default text style、padding/background、ANSI-aware wrapping 和缓存。 | theme/options interfaces [E: packages/tui/src/components/markdown.ts:78] [E: packages/tui/src/components/markdown.ts:98];constructor [E: packages/tui/src/components/markdown.ts:124];lexer/token render/wrap/cache [E: packages/tui/src/components/markdown.ts:174] [E: packages/tui/src/components/markdown.ts:183] [E: packages/tui/src/components/markdown.ts:195] [E: packages/tui/src/components/markdown.ts:237];table rendering path [E: packages/tui/src/components/markdown.ts:685] |
| `SelectList` | `packages/tui/src/components/select-list.ts` | `constructor(items, maxVisible, theme, layout?)`; types: `SelectItem`, `SelectListTheme`, `SelectListLayoutOptions`; callbacks: `onSelect?`, `onCancel?`, `onSelectionChange?`; API: `setFilter`, `setSelectedIndex`, `getSelectedItem`, `handleInput`, `render` | Command/menu style selection list:过滤 prefix match,维护 selectedIndex,可滚动显示 maxVisible 个条目,支持 primary/description 双列布局和 up/down/confirm/cancel keybindings。 | item/theme/layout types [E: packages/tui/src/components/select-list.ts:12] [E: packages/tui/src/components/select-list.ts:18] [E: packages/tui/src/components/select-list.ts:34];constructor/callbacks [E: packages/tui/src/components/select-list.ts:48] [E: packages/tui/src/components/select-list.ts:52];filter/render/scroll [E: packages/tui/src/components/select-list.ts:60] [E: packages/tui/src/components/select-list.ts:74] [E: packages/tui/src/components/select-list.ts:103];input handling [E: packages/tui/src/components/select-list.ts:112] |
| `SettingsList` | `packages/tui/src/components/settings-list.ts` | `constructor(items, maxVisible, theme, onChange, onCancel, options?)`; types: `SettingItem`, `SettingsListTheme`, `SettingsListOptions`; API: `updateValue`, `handleInput`, `render` | Settings picker component:显示 setting label/currentValue,支持可选 fuzzy search、滚动、description、Enter/Space cycle values,也可打开每项自定义 submenu component。 | setting item shape [E: packages/tui/src/components/settings-list.ts:7];options/search Input [E: packages/tui/src/components/settings-list.ts:30] [E: packages/tui/src/components/settings-list.ts:63] [E: packages/tui/src/components/settings-list.ts:65];render main/submenu [E: packages/tui/src/components/settings-list.ts:81] [E: packages/tui/src/components/settings-list.ts:84] [E: packages/tui/src/components/settings-list.ts:90];input/filter/change/submenu activation [E: packages/tui/src/components/settings-list.ts:168] [E: packages/tui/src/components/settings-list.ts:194] [E: packages/tui/src/components/settings-list.ts:199] [E: packages/tui/src/components/settings-list.ts:203] [E: packages/tui/src/components/settings-list.ts:219] [E: packages/tui/src/components/settings-list.ts:232] |
| `Spacer` | `packages/tui/src/components/spacer.ts` | `constructor(lines = 1)`; API: `setLines`, `render` | Layout spacer:输出指定数量的 empty lines,不消费 width,用于在 component tree 中制造垂直间距。 | implements `Component` [E: packages/tui/src/components/spacer.ts:6];lines constructor/setter [E: packages/tui/src/components/spacer.ts:9] [E: packages/tui/src/components/spacer.ts:13];render empty lines loop [E: packages/tui/src/components/spacer.ts:21] |
| `Text` | `packages/tui/src/components/text.ts` | `constructor(text = "", paddingX = 1, paddingY = 1, customBgFn?)`; API: `setText`, `setCustomBgFn`, `invalidate`, `render` | Plain multi-line text display:替换 tabs,ANSI-aware wrap,加 padding/background,按 text+width 缓存渲染结果;空文本返回空行数组。 | implements `Component` [E: packages/tui/src/components/text.ts:7];constructor and mutators [E: packages/tui/src/components/text.ts:18] [E: packages/tui/src/components/text.ts:25] [E: packages/tui/src/components/text.ts:32] [E: packages/tui/src/components/text.ts:39];empty/wrap/padding/background/cache [E: packages/tui/src/components/text.ts:57] [E: packages/tui/src/components/text.ts:61] [E: packages/tui/src/components/text.ts:67] [E: packages/tui/src/components/text.ts:79] [E: packages/tui/src/components/text.ts:97] [E: packages/tui/src/components/text.ts:100] |
| `TruncatedText` | `packages/tui/src/components/truncated-text.ts` | `constructor(text, paddingX = 0, paddingY = 0)`; API: `render`, `invalidate` | Single-line clipped text display:只取首行,按 available width truncate,再补 horizontal/vertical padding 到 viewport width。 | implements `Component` [E: packages/tui/src/components/truncated-text.ts:7];constructor [E: packages/tui/src/components/truncated-text.ts:12];first-line + truncate + padding [E: packages/tui/src/components/truncated-text.ts:37] [E: packages/tui/src/components/truncated-text.ts:44] [E: packages/tui/src/components/truncated-text.ts:52] |

## 形态分组

Display-only components 是只依赖 `render(width)` 输出 terminal lines 的组件: `Box`、`Image`、`Markdown`、`Spacer`、`Text`、`TruncatedText`,以及作为 `Text` 子类但主要靠定时器刷新 display 的 `Loader` [I]。Interactive components 是实现 `handleInput(data)` 或通过 subclass 加入输入处理的组件: `CancellableLoader`、`Editor`、`Input`、`SelectList`、`SettingsList` [E: packages/tui/src/components/cancellable-loader.ts:29] [E: packages/tui/src/components/editor.ts:591] [E: packages/tui/src/components/input.ts:48] [E: packages/tui/src/components/select-list.ts:112] [E: packages/tui/src/components/settings-list.ts:168]。

`Editor` 和 `Input` 都声明实现 `Focusable`,并在 render output 中按 `focused` 状态放置 cursor marker / fake cursor;`Editor` 在 multiline layout line 中插入 `CURSOR_MARKER`,而 `Input` 在当前 grapheme 前插入 marker 并使用 inverse video fake cursor [E: packages/tui/src/components/editor.ts:252] [E: packages/tui/src/components/editor.ts:260] [E: packages/tui/src/components/editor.ts:537] [E: packages/tui/src/components/input.ts:19] [E: packages/tui/src/components/input.ts:26] [E: packages/tui/src/components/input.ts:434]。

## 跨节点关系

`subsys.tui.component-model` 负责解释 component tree、focus、overlay、diff rendering 与 `Component` 生命周期;本节点只做 12 个 concrete component classes 的 catalog,并把每个实例的 constructor/options/callback/render/input 入口列全 [I]。

## Sources

- `packages/tui/src/index.ts`
- `packages/tui/src/components/box.ts`
- `packages/tui/src/components/cancellable-loader.ts`
- `packages/tui/src/components/editor.ts`
- `packages/tui/src/components/image.ts`
- `packages/tui/src/components/input.ts`
- `packages/tui/src/components/loader.ts`
- `packages/tui/src/components/markdown.ts`
- `packages/tui/src/components/select-list.ts`
- `packages/tui/src/components/settings-list.ts`
- `packages/tui/src/components/spacer.ts`
- `packages/tui/src/components/text.ts`
- `packages/tui/src/components/truncated-text.ts`

## 相关

- `subsys.tui.component-model`:解释 `Component` / `Focusable` 如何被 TUI runtime、focus 管线和 diff renderer 使用。
