---
id: ui.diff
path: subsystems/ui/diff.md
title: Diff 组件族
kind: subsystem
tier: T2
source: [components/diff/DiffDialog.tsx, components/diff/DiffDetailView.tsx, components/diff/DiffFileList.tsx, components/FileEditToolDiff.tsx, components/FileEditToolUpdatedMessage.tsx, components/FileEditToolUseRejectedMessage.tsx]
symbols: [DiffDialog, DiffDetailView, DiffFileList, FileEditToolDiff, FileEditToolUpdatedMessage, FileEditToolUseRejectedMessage]
related: [subsys.ui-components, subsys.keybindings]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Diff 组件族负责把 git/turn/tool edit 的 diff 数据变成可浏览的终端 UI：它包含全屏 DiffDialog、文件列表、详情面板，以及 file edit tool 的 inline diff preview。[E: components/diff/DiffDialog.tsx:55][E: components/diff/DiffFileList.tsx:14][E: components/diff/DiffDetailView.tsx:25][E: components/FileEditToolDiff.tsx:23]

## 能回答的问题

- DiffDialog 如何在 current git diff 与 turn diffs 间切换？[E: components/diff/DiffDialog.tsx:61][E: components/diff/DiffDialog.tsx:62][E: components/diff/DiffDialog.tsx:75][E: components/diff/DiffDialog.tsx:87]
- 文件列表如何限制可见文件数量并展示 stats？[E: components/diff/DiffFileList.tsx:9][E: components/diff/DiffFileList.tsx:40][E: components/diff/DiffFileList.tsx:190]
- 详情页什么时候渲染 StructuredDiff，什么时候走 untracked/binary/large fallback？[E: components/diff/DiffDetailView.tsx:86][E: components/diff/DiffDetailView.tsx:143][E: components/diff/DiffDetailView.tsx:176][E: components/diff/DiffDetailView.tsx:242]
- 文件编辑工具的 rejected/updated 消息如何展示 diff 或 code preview？[E: components/FileEditToolUpdatedMessage.tsx:88][E: components/FileEditToolUseRejectedMessage.tsx:105][E: components/FileEditToolUseRejectedMessage.tsx:146]

## 族干什么

Diff family 有两个入口。第一个是交互式 `DiffDialog`，它用 `useDiffData` 读取当前 workspace diff，用 `useTurnDiffs(messages)` 提取本轮 turn diffs，并把它们包装成 source selector。[E: components/diff/DiffDialog.tsx:61][E: components/diff/DiffDialog.tsx:62][E: components/diff/DiffDialog.tsx:75] 第二个入口是 tool-result inline preview：`FileEditToolDiff` 为 pending edit 读取文件上下文并生成 patch，`FileEditToolUpdatedMessage` 为 successful update 展示 summary 和 diff，`FileEditToolUseRejectedMessage` 为 rejected write/update 展示 code 或 diff。[E: components/FileEditToolDiff.tsx:26][E: components/FileEditToolDiff.tsx:129][E: components/FileEditToolUpdatedMessage.tsx:36][E: components/FileEditToolUseRejectedMessage.tsx:89][E: components/FileEditToolUseRejectedMessage.tsx:146]

## 成员清单

- `DiffDialog` — `components/diff/DiffDialog.tsx` — 渲染 diff overlay，管理 source/view/selected file state、keyboard navigation、source selector 和 list/detail view。[E: components/diff/DiffDialog.tsx:55][E: components/diff/DiffDialog.tsx:63][E: components/diff/DiffDialog.tsx:221][E: components/diff/DiffDialog.tsx:340]
- `DiffFileList` — `components/diff/DiffFileList.tsx` — 渲染 changed file list、selection marker、truncated path 和 add/remove/binary/large/untracked stats。[E: components/diff/DiffFileList.tsx:14][E: components/diff/DiffFileList.tsx:99][E: components/diff/DiffFileList.tsx:160][E: components/diff/DiffFileList.tsx:215][E: components/diff/DiffFileList.tsx:252]
- `DiffDetailView` — `components/diff/DiffDetailView.tsx` — 渲染单文件 diff detail，包含 header、untracked preview、binary/large warning 和 StructuredDiff hunk list。[E: components/diff/DiffDetailView.tsx:25][E: components/diff/DiffDetailView.tsx:119][E: components/diff/DiffDetailView.tsx:143][E: components/diff/DiffDetailView.tsx:210][E: components/diff/DiffDetailView.tsx:242]
- `FileEditToolDiff` — `components/FileEditToolDiff.tsx` — 为 edit/write tool use 渲染异步加载的 inline diff preview，并用 Suspense fallback 包住 diff frame。[E: components/FileEditToolDiff.tsx:23][E: components/FileEditToolDiff.tsx:36][E: components/FileEditToolDiff.tsx:68]
- `FileEditToolUpdatedMessage` — `components/FileEditToolUpdatedMessage.tsx` — 渲染 edit 成功后的 changed file response、added/removed summary text、preview hint 和 StructuredDiffList。[E: components/FileEditToolUpdatedMessage.tsx:18][E: components/FileEditToolUpdatedMessage.tsx:36][E: components/FileEditToolUpdatedMessage.tsx:45][E: components/FileEditToolUpdatedMessage.tsx:63][E: components/FileEditToolUpdatedMessage.tsx:88]
- `FileEditToolUseRejectedMessage` — `components/FileEditToolUseRejectedMessage.tsx` — 渲染 edit/write 被拒绝后的 message，write 场景用 `HighlightedCode` 展示内容片段，update 场景用 `StructuredDiffList` 展示 patch。[E: components/FileEditToolUseRejectedMessage.tsx:24][E: components/FileEditToolUseRejectedMessage.tsx:105][E: components/FileEditToolUseRejectedMessage.tsx:146]

## 巨型组件深挖

`DiffDialog` 是本族的交互主控。它把 turn diff 转成统一的 `DiffData` shape，再用 `sources` 把 current diff 和 turn diffs 合并为一个 source list。[E: components/diff/DiffDialog.tsx:30][E: components/diff/DiffDialog.tsx:75] 当前 source 决定 `diffData`，当前 selected file 决定 `selectedFile` 和 `selectedFileHunks`。[E: components/diff/DiffDialog.tsx:87][E: components/diff/DiffDialog.tsx:96][E: components/diff/DiffDialog.tsx:101] Dialog 内部注册 overlay，并把 previous/next source、back、view details、previous/next file 等命令接到 keybinding handlers。[E: components/diff/DiffDialog.tsx:144][E: components/diff/DiffDialog.tsx:221][E: components/diff/DiffDialog.tsx:249]

渲染上，`DiffDialog` 根据 view 状态选择 `DiffFileList` 或 `DiffDetailView`，并把 title、subtitle、source selector、cancel shortcut 和 empty states 放进 `Dialog`。[E: components/diff/DiffDialog.tsx:251][E: components/diff/DiffDialog.tsx:263][E: components/diff/DiffDialog.tsx:275][E: components/diff/DiffDialog.tsx:278][E: components/diff/DiffDialog.tsx:340][E: components/diff/DiffDialog.tsx:357] [I] 这说明 DiffDialog 是 orchestration component，真正的行级 diff rendering 被委托给 StructuredDiff family。

## 与 hooks/keybindings/AppState 接线

Diff family 直接使用 hooks 读取数据和终端环境：`DiffDialog` 通过 `useDiffData`、`useTurnDiffs` 聚合 diff source，`DiffDetailView` 和 inline tool messages 通过 `useTerminalSize` 调整宽度。[E: components/diff/DiffDialog.tsx:61][E: components/diff/DiffDialog.tsx:62][E: components/diff/DiffDetailView.tsx:35][E: components/FileEditToolUpdatedMessage.tsx:29] keybindings 只集中在 `DiffDialog`：它在 `DiffDialog` context 注册 navigation handlers，并用 `useShortcutDisplay` 展示 dismiss shortcut。[E: components/diff/DiffDialog.tsx:221][E: components/diff/DiffDialog.tsx:249][E: components/diff/DiffDialog.tsx:275] 本族没有直接 AppState setter；状态主要是 dialog-local view/source/selection state。[E: components/diff/DiffDialog.tsx:63]

## Sources

- `components/diff/DiffDialog.tsx`
- `components/diff/DiffDetailView.tsx`
- `components/diff/DiffFileList.tsx`
- `components/FileEditToolDiff.tsx`
- `components/FileEditToolUpdatedMessage.tsx`
- `components/FileEditToolUseRejectedMessage.tsx`

## 相关

- `subsys.ui-components`
- `subsys.keybindings`
