---
id: tui.dialog-kit
title: TUI Dialog Kit 与 Toast
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/ui/dialog.tsx, packages/tui/src/ui/toast.tsx]
symbols: [Dialog, DialogProvider, useDialog, DialogSelect, Toast, ToastProvider, useToast]
related: [ref.tui-dialogs, tui.keybindings, tui.feature-plugins]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> Dialog kit 是 TUI 的 modal stack 与 select/prompt/confirm 等通用交互层；Toast 是独立的单条 transient notification store。二者都由 root provider 挂载，插件 API 也复用这些组件。

## 能回答的问题

- Dialog overlay 如何定位、关闭和恢复 focus？
- Modal stack 如何用 keymap mode 隔离快捷键？
- DialogSelect 如何过滤、分组、绑定动作和滚动？
- Toast 的 store、默认时长和渲染位置是什么？
- Plugin API 如何暴露 Dialog/Toast？

## Dialog overlay

`Dialog` 接收 `size?: "medium" | "large" | "xlarge"` 和 `onClose`；width 分别是 60、88、116，但 maxWidth 会限制到 terminal width - 2。[E: packages/tui/src/ui/dialog.tsx:13] [E: packages/tui/src/ui/dialog.tsx:14] [E: packages/tui/src/ui/dialog.tsx:23] [E: packages/tui/src/ui/dialog.tsx:24] [E: packages/tui/src/ui/dialog.tsx:25] [E: packages/tui/src/ui/dialog.tsx:56] overlay 占满 terminal dimensions、absolute zIndex 3000、顶部 padding 为高度 1/4、背景是半透明黑色 RGBA。[E: packages/tui/src/ui/dialog.tsx:40] [E: packages/tui/src/ui/dialog.tsx:41] [E: packages/tui/src/ui/dialog.tsx:43] [E: packages/tui/src/ui/dialog.tsx:44] [E: packages/tui/src/ui/dialog.tsx:45] [E: packages/tui/src/ui/dialog.tsx:48]

overlay mouse down 时如果 renderer 有 selection，会设置 dismiss guard；mouse up 若没有 selection guard 则调用 onClose。panel 内部 mouse up 会 stopPropagation，避免点击 dialog 内容关闭 dialog。[E: packages/tui/src/ui/dialog.tsx:30] [E: packages/tui/src/ui/dialog.tsx:31] [E: packages/tui/src/ui/dialog.tsx:33] [E: packages/tui/src/ui/dialog.tsx:38] [E: packages/tui/src/ui/dialog.tsx:51] [E: packages/tui/src/ui/dialog.tsx:53]

## DialogProvider stack

`init()` 的 store 包含 `stack: { element, onClose? }[]` 和 `size`。[E: packages/tui/src/ui/dialog.tsx:68] [E: packages/tui/src/ui/dialog.tsx:69] [E: packages/tui/src/ui/dialog.tsx:70] [E: packages/tui/src/ui/dialog.tsx:72] stack 非空时 push keymap mode `modal`，确保 modal-specific bindings 生效。[E: packages/tui/src/ui/dialog.tsx:79] [E: packages/tui/src/ui/dialog.tsx:80]

`replace(input, onClose?)` 在打开第一个 dialog 时保存并 blur 当前 focused renderable，调用旧 stack 的 onClose，然后把 stack 替换成单个 element。[E: packages/tui/src/ui/dialog.tsx:147] [E: packages/tui/src/ui/dialog.tsx:148] [E: packages/tui/src/ui/dialog.tsx:149] [E: packages/tui/src/ui/dialog.tsx:150] [E: packages/tui/src/ui/dialog.tsx:152] [E: packages/tui/src/ui/dialog.tsx:153] [E: packages/tui/src/ui/dialog.tsx:156] [E: packages/tui/src/ui/dialog.tsx:158] `clear()` 对 stack 中每个 item 调 onClose，重置 size 和 stack，并 refocus 原 renderable。[E: packages/tui/src/ui/dialog.tsx:136] [E: packages/tui/src/ui/dialog.tsx:138] [E: packages/tui/src/ui/dialog.tsx:139] [E: packages/tui/src/ui/dialog.tsx:142] [E: packages/tui/src/ui/dialog.tsx:143] [E: packages/tui/src/ui/dialog.tsx:145]

Escape 和 ctrl+c bindings 只在 stack 非空且没有 selected text 时启用；它们会清 selection、调用当前 onClose、pop stack，然后 refocus。[E: packages/tui/src/ui/dialog.tsx:102] [E: packages/tui/src/ui/dialog.tsx:103] [E: packages/tui/src/ui/dialog.tsx:106] [E: packages/tui/src/ui/dialog.tsx:111] [E: packages/tui/src/ui/dialog.tsx:114] [E: packages/tui/src/ui/dialog.tsx:115] [E: packages/tui/src/ui/dialog.tsx:116] [E: packages/tui/src/ui/dialog.tsx:120] [E: packages/tui/src/ui/dialog.tsx:125] [E: packages/tui/src/ui/dialog.tsx:128] [E: packages/tui/src/ui/dialog.tsx:129] [E: packages/tui/src/ui/dialog.tsx:130]

DialogProvider 还处理 dialog 期间的 copy selection：右键 copy 行为受 `Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` 控制，普通 mouse up 可 copy selection 并 toast “Copied to clipboard”。[E: packages/tui/src/ui/dialog.tsx:185] [E: packages/tui/src/ui/dialog.tsx:188] [E: packages/tui/src/ui/dialog.tsx:189] [E: packages/tui/src/ui/dialog.tsx:203] [E: packages/tui/src/ui/dialog.tsx:204] [E: packages/tui/src/ui/dialog.tsx:210]

## DialogSelect

`DialogSelectProps` 支持 title/titleView、placeholder/footer、options、flat/ref、onMove/onFilter/onSelect、skipFilter/renderFilter、locked、actions/footerHints/bindings/current。[E: packages/tui/src/ui/dialog-select.tsx:24] [E: packages/tui/src/ui/dialog-select.tsx:25] [E: packages/tui/src/ui/dialog-select.tsx:26] [E: packages/tui/src/ui/dialog-select.tsx:27] [E: packages/tui/src/ui/dialog-select.tsx:28] [E: packages/tui/src/ui/dialog-select.tsx:29] [E: packages/tui/src/ui/dialog-select.tsx:30] [E: packages/tui/src/ui/dialog-select.tsx:31] [E: packages/tui/src/ui/dialog-select.tsx:32] [E: packages/tui/src/ui/dialog-select.tsx:33] [E: packages/tui/src/ui/dialog-select.tsx:34] [E: packages/tui/src/ui/dialog-select.tsx:35] [E: packages/tui/src/ui/dialog-select.tsx:36] [E: packages/tui/src/ui/dialog-select.tsx:37] [E: packages/tui/src/ui/dialog-select.tsx:45] [E: packages/tui/src/ui/dialog-select.tsx:50] [E: packages/tui/src/ui/dialog-select.tsx:51] `DialogSelectOption` 支持 title/value/description/details/footer/category/disabled/bg/gutter/margin/onSelect 等 presentation 字段。[E: packages/tui/src/ui/dialog-select.tsx:55] [E: packages/tui/src/ui/dialog-select.tsx:57] [E: packages/tui/src/ui/dialog-select.tsx:58] [E: packages/tui/src/ui/dialog-select.tsx:59] [E: packages/tui/src/ui/dialog-select.tsx:60] [E: packages/tui/src/ui/dialog-select.tsx:63] [E: packages/tui/src/ui/dialog-select.tsx:65] [E: packages/tui/src/ui/dialog-select.tsx:66] [E: packages/tui/src/ui/dialog-select.tsx:67] [E: packages/tui/src/ui/dialog-select.tsx:68] [E: packages/tui/src/ui/dialog-select.tsx:69]

filter 默认排除 disabled options；有 filter text 时用 fuzzysort 搜 title/category，并让 title score 权重为 2。[E: packages/tui/src/ui/dialog-select.tsx:148] [E: packages/tui/src/ui/dialog-select.tsx:153] [E: packages/tui/src/ui/dialog-select.tsx:159] [E: packages/tui/src/ui/dialog-select.tsx:161] [E: packages/tui/src/ui/dialog-select.tsx:162] grouped 视图按 category group，`flat` 且有 filter 时改成单组；height 是 rows 与 terminal half height - 6 的 min。[E: packages/tui/src/ui/dialog-select.tsx:178] [E: packages/tui/src/ui/dialog-select.tsx:181] [E: packages/tui/src/ui/dialog-select.tsx:184] [E: packages/tui/src/ui/dialog-select.tsx:207]

DialogSelect 注册 `dialog.select.prev/next/page_up/page_down/home/end/submit` commands，并把 visible actions 的 command bindings 也加入同一 binding set；如果有 visible actions，还提供 tab/shift+tab 在 footer actions 间移动 focus。[E: packages/tui/src/ui/dialog-select.tsx:287] [E: packages/tui/src/ui/dialog-select.tsx:293] [E: packages/tui/src/ui/dialog-select.tsx:302] [E: packages/tui/src/ui/dialog-select.tsx:311] [E: packages/tui/src/ui/dialog-select.tsx:320] [E: packages/tui/src/ui/dialog-select.tsx:329] [E: packages/tui/src/ui/dialog-select.tsx:339] [E: packages/tui/src/ui/dialog-select.tsx:349] [E: packages/tui/src/ui/dialog-select.tsx:368] [E: packages/tui/src/ui/dialog-select.tsx:378] [E: packages/tui/src/ui/dialog-select.tsx:382] [E: packages/tui/src/ui/dialog-select.tsx:388]

render 结构包含标题栏和 esc label、可选 filter input、scrollbox list、footer/action hints；option render 支持当前项 marker、gutter、left/right truncation、details、footer 和 mouse select。[E: packages/tui/src/ui/dialog-select.tsx:479] [E: packages/tui/src/ui/dialog-select.tsx:484] [E: packages/tui/src/ui/dialog-select.tsx:488] [E: packages/tui/src/ui/dialog-select.tsx:525] [E: packages/tui/src/ui/dialog-select.tsx:564] [E: packages/tui/src/ui/dialog-select.tsx:566] [E: packages/tui/src/ui/dialog-select.tsx:567] [E: packages/tui/src/ui/dialog-select.tsx:614] [E: packages/tui/src/ui/dialog-select.tsx:633] [E: packages/tui/src/ui/dialog-select.tsx:672] [E: packages/tui/src/ui/dialog-select.tsx:677] [E: packages/tui/src/ui/dialog-select.tsx:679] [E: packages/tui/src/ui/dialog-select.tsx:690] [E: packages/tui/src/ui/dialog-select.tsx:691] [E: packages/tui/src/ui/dialog-select.tsx:694] [E: packages/tui/src/ui/dialog-select.tsx:700]

## Toast

`ToastOptions` 是 `title?`、`message`、`variant: "info" | "success" | "warning" | "error"`、`duration`。[E: packages/tui/src/ui/toast.tsx:8] [E: packages/tui/src/ui/toast.tsx:9] [E: packages/tui/src/ui/toast.tsx:10] [E: packages/tui/src/ui/toast.tsx:11] `Toast()` absolute 定位在 top=2/right=2，maxWidth 为 min(60, terminal width - 6)，背景用 panel，左右边框颜色来自 variant 对应 theme color。[E: packages/tui/src/ui/toast.tsx:24] [E: packages/tui/src/ui/toast.tsx:27] [E: packages/tui/src/ui/toast.tsx:28] [E: packages/tui/src/ui/toast.tsx:29] [E: packages/tui/src/ui/toast.tsx:34] [E: packages/tui/src/ui/toast.tsx:35] [E: packages/tui/src/ui/toast.tsx:36]

Toast store 只保存一个 `currentToast`；`show()` 默认 duration 5000ms，清掉旧 timeout 后设置 unref timeout 自动清空；`error()` 对 Error 显示 message，对未知错误显示 generic text。[E: packages/tui/src/ui/toast.tsx:55] [E: packages/tui/src/ui/toast.tsx:61] [E: packages/tui/src/ui/toast.tsx:62] [E: packages/tui/src/ui/toast.tsx:64] [E: packages/tui/src/ui/toast.tsx:66] [E: packages/tui/src/ui/toast.tsx:67] [E: packages/tui/src/ui/toast.tsx:70] [E: packages/tui/src/ui/toast.tsx:73] [E: packages/tui/src/ui/toast.tsx:77]

## Plugin API

`createTuiApiAdapters` 把 `Dialog`、`DialogAlert`、`DialogConfirm`、`DialogPrompt`、`DialogSelect`、`Prompt`、`toast()` 和 low-level `ui.dialog` stack API 暴露给 plugins。[E: packages/tui/src/plugin/adapters.tsx:207] [E: packages/tui/src/plugin/adapters.tsx:214] [E: packages/tui/src/plugin/adapters.tsx:217] [E: packages/tui/src/plugin/adapters.tsx:220] [E: packages/tui/src/plugin/adapters.tsx:223] [E: packages/tui/src/plugin/adapters.tsx:241] [E: packages/tui/src/plugin/adapters.tsx:256] [E: packages/tui/src/plugin/adapters.tsx:265] [E: packages/tui/src/plugin/adapters.tsx:268] [E: packages/tui/src/plugin/adapters.tsx:271] [E: packages/tui/src/plugin/adapters.tsx:274] [E: packages/tui/src/plugin/adapters.tsx:277] [E: packages/tui/src/plugin/adapters.tsx:280]

## 设计动机与权衡

DialogProvider 只保留单个 stack，但 `replace()` 会清旧 stack 并设置新 root dialog；这使大多数 TUI modal 采用“当前唯一 dialog surface”模型，减少嵌套焦点与 keybinding 冲突。[E: packages/tui/src/ui/dialog.tsx:152] [E: packages/tui/src/ui/dialog.tsx:153] [E: packages/tui/src/ui/dialog.tsx:156] [E: packages/tui/src/ui/dialog.tsx:158] [I] DialogSelect 把 filter/list/actions/footer 放在一个 reusable component 中，使 provider/model/session/plugin manager 等高频选择器共享 fuzzysort、keymap 和 scrolling 逻辑。[E: packages/tui/src/ui/dialog-select.tsx:24] [E: packages/tui/src/ui/dialog-select.tsx:159] [E: packages/tui/src/ui/dialog-select.tsx:287] [E: packages/tui/src/ui/dialog-select.tsx:240] [I]

## Gotcha

- Dialog `replace(input: any)` 的 input 在 store 中作为 `element` 保存；类型没有在此层严格约束。[E: packages/tui/src/ui/dialog.tsx:147] [E: packages/tui/src/ui/dialog.tsx:158] [I]
- Toast 同一时间只显示一条，新的 `show()` 会覆盖旧 toast 并重置 timeout。[E: packages/tui/src/ui/toast.tsx:55] [E: packages/tui/src/ui/toast.tsx:63] [E: packages/tui/src/ui/toast.tsx:64]

## Sources

- `packages/tui/src/ui/dialog.tsx`
- `packages/tui/src/ui/dialog-select.tsx`
- `packages/tui/src/ui/toast.tsx`
- `packages/tui/src/plugin/adapters.tsx`

## 相关

- `ref.tui-dialogs`：dialog variants 与常用 props 细表。
- `tui.keybindings`：modal/dialog select keymap 规则。
- `tui.feature-plugins`：plugin API 如何复用 dialog/toast。
