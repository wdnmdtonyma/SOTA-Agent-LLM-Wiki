---
id: ui.highlighted-code
path: subsystems/ui/highlighted-code.md
title: HighlightedCode 组件族
kind: subsystem
tier: T2
source: [components/HighlightedCode.tsx, components/HighlightedCode/Fallback.tsx, components/Markdown.tsx, components/FileEditToolUseRejectedMessage.tsx]
symbols: [HighlightedCode, HighlightedCodeFallback, Markdown, MarkdownWithHighlight]
related: [subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> HighlightedCode 组件族负责代码块和被拒绝 write 内容的 syntax highlighted rendering：它优先使用 color-file runtime，runtime 不可用时回退到 CLI highlighter，设置禁用时走 raw/skip-coloring fallback，并与 Markdown renderer 共享 highlighting capability。[E: components/HighlightedCode.tsx:18][E: components/HighlightedCode.tsx:39][E: components/HighlightedCode.tsx:123][E: components/HighlightedCode/Fallback.tsx:39][E: components/HighlightedCode/Fallback.tsx:58][E: components/Markdown.tsx:102]

## 能回答的问题

- HighlightedCode 何时用 color-file，何时 fallback？[E: components/HighlightedCode.tsx:34][E: components/HighlightedCode.tsx:39][E: components/HighlightedCode.tsx:46][E: components/HighlightedCode.tsx:123]
- 没有显式 width 时它如何测量宽度？[E: components/HighlightedCode.tsx:64][E: components/HighlightedCode.tsx:83]
- fallback highlighter 如何按文件扩展名选 language 并做缓存？[E: components/HighlightedCode/Fallback.tsx:21][E: components/HighlightedCode/Fallback.tsx:78][E: components/HighlightedCode/Fallback.tsx:145]
- Markdown 如何接入 syntax highlighter？[E: components/Markdown.tsx:80][E: components/Markdown.tsx:102][E: components/Markdown.tsx:148]

## 族干什么

HighlightedCode family 渲染 fixed code content，而不是 diff hunk。`HighlightedCode` 读取 theme、settings 和 fullscreen 状态；如果 `syntaxHighlightingDisabled` 为 true，就不创建 color-file runtime。[E: components/HighlightedCode.tsx:27][E: components/HighlightedCode.tsx:31][E: components/HighlightedCode.tsx:34] 如果 runtime 可用，组件用 `ColorFile` 生成 ANSI lines，并按 fullscreen 状态决定 gutter 宽度；如果 lines 不可用，就交给 `HighlightedCodeFallback`。[E: components/HighlightedCode.tsx:51][E: components/HighlightedCode.tsx:91][E: components/HighlightedCode.tsx:106][E: components/HighlightedCode.tsx:123]

本族还覆盖 markdown code highlighting 的 shared path。`Markdown` 在 syntax highlighting 未禁用时通过 Suspense 加载 CLI highlighter，再把 highlighter 传给 `formatToken`。[E: components/Markdown.tsx:92][E: components/Markdown.tsx:102][E: components/Markdown.tsx:148] write rejection message 也归入本族，因为它直接用 `HighlightedCode` 预览被拒绝写入的 code 内容。[E: components/FileEditToolUseRejectedMessage.tsx:89][E: components/FileEditToolUseRejectedMessage.tsx:105]

## 成员清单

- `HighlightedCode` — `components/HighlightedCode.tsx` — 渲染带可选 gutter 的 highlighted code lines，并在 runtime 缺失时调用 fallback。[E: components/HighlightedCode.tsx:18][E: components/HighlightedCode.tsx:91][E: components/HighlightedCode.tsx:143]
- `HighlightedCodeFallback` — `components/HighlightedCode/Fallback.tsx` — 使用 CLI highlighter 渲染 code，按文件扩展名推断 language，并缓存 highlight 结果。[E: components/HighlightedCode/Fallback.tsx:39][E: components/HighlightedCode/Fallback.tsx:78][E: components/HighlightedCode/Fallback.tsx:21]
- `Markdown` highlighter path — `components/Markdown.tsx` — 为 markdown token formatting 提供 optional highlight function，并在 setting 禁用时传入 null。[E: components/Markdown.tsx:80][E: components/Markdown.tsx:102][E: components/Markdown.tsx:148]
- `FileEditToolUseRejectedMessage` write preview — `components/FileEditToolUseRejectedMessage.tsx` — 在 rejected write operation 中把输入内容截断后交给 `HighlightedCode`。[E: components/FileEditToolUseRejectedMessage.tsx:89][E: components/FileEditToolUseRejectedMessage.tsx:105]

## 巨型组件深挖

`HighlightedCode` 的核心是 runtime selection 与 layout measurement。它先使用 `useRef` 保存 DOM-like Ink ref，并在没有 width prop 时通过 effect 读取 `getComputedDimensions()`，把 element width 减 2 后写入 `measuredWidth`。[E: components/HighlightedCode.tsx:27][E: components/HighlightedCode.tsx:64][E: components/HighlightedCode.tsx:83] 宽度确定后，`ColorFile.render(theme, measuredWidth, dim)` 输出 ANSI lines。[E: components/HighlightedCode.tsx:91] 非 fullscreen 时 gutter width 为 0；fullscreen 时才根据 line count 计算 gutter width，并在 `CodeLine` 中用 `sliceAnsi` 把 gutter 和内容列分开渲染。[E: components/HighlightedCode.tsx:106][E: components/HighlightedCode.tsx:110][E: components/HighlightedCode.tsx:143][E: components/HighlightedCode.tsx:155]

fallback 组件先把 tabs 转为空格；如果 `skipColoring` 为 true，直接以 dim/raw ANSI 输出。[E: components/HighlightedCode/Fallback.tsx:50][E: components/HighlightedCode/Fallback.tsx:58] 否则它按 `filePath` 扩展名推断 language，加载 CLI highlighter，优先使用该 language，unsupported language 会退到 markdown。[E: components/HighlightedCode/Fallback.tsx:78][E: components/HighlightedCode/Fallback.tsx:130][E: components/HighlightedCode/Fallback.tsx:145][E: components/HighlightedCode/Fallback.tsx:158]

## 与 hooks/keybindings/AppState 接线

HighlightedCode 不注册 keybindings，不写 AppState；它只读取 `useTheme`、`useSettings` 和 fullscreen 状态，并通过 Suspense/use 加载 highlighter promise。[E: components/HighlightedCode.tsx:29][E: components/HighlightedCode.tsx:30][E: components/HighlightedCode.tsx:31][E: components/Markdown.tsx:102] [I] 因此，本族是 rendering utility family，业务触发来自 Markdown、Diff 或 tool-result message。

## Sources

- `components/HighlightedCode.tsx`
- `components/HighlightedCode/Fallback.tsx`
- `components/Markdown.tsx`
- `components/FileEditToolUseRejectedMessage.tsx`

## 相关

- `subsys.ui-components`
