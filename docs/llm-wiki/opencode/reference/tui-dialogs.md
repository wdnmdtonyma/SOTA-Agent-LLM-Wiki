---
id: ref.tui-dialogs
title: TUI Dialog Catalog
kind: reference
tier: T3
v: na
source:
  - packages/tui/src/component/
  - packages/tui/src/ui/
symbols:
  - Dialog
  - DialogSelect
  - useDialog
related:
  - tui.dialog-kit
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> TUI dialog system 由 `ui/dialog.tsx` 的 modal stack、`ui/dialog-*.tsx` helper 和 `component/dialog-*.tsx` domain dialogs 组成；当前源码还把 command palette 实现为一个 `DialogSelect` wrapper。

## 能回答的问题

- TUI dialog primitive 的 stack、mode 和 close 行为是什么？
- `DialogAlert`、`DialogConfirm`、`DialogPrompt`、`DialogSelect` 分别返回什么？
- 当前有哪些 domain dialog，它们面向哪个数据域？

## UI 原语

`Dialog` overlay 占满 terminal，zIndex 为 3000；backdrop mouseup 会调用 `props.onClose`，但如果 mousedown 时已有 terminal selection，则会清掉 dismiss flag 并跳过关闭 [E: packages/tui/src/ui/dialog.tsx:28] [E: packages/tui/src/ui/dialog.tsx:30] [E: packages/tui/src/ui/dialog.tsx:34] [E: packages/tui/src/ui/dialog.tsx:38] [E: packages/tui/src/ui/dialog.tsx:40] [E: packages/tui/src/ui/dialog.tsx:41] [E: packages/tui/src/ui/dialog.tsx:44]。`Dialog.init()` 持有 dialog stack 和 size store；stack 非空时会 push `modal` mode，Escape 或 Ctrl+C 会关闭最上层 dialog [E: packages/tui/src/ui/dialog.tsx:66] [E: packages/tui/src/ui/dialog.tsx:80] [E: packages/tui/src/ui/dialog.tsx:106] [E: packages/tui/src/ui/dialog.tsx:127] [E: packages/tui/src/ui/dialog.tsx:128] [E: packages/tui/src/ui/dialog.tsx:129]。`replace()` 只在原 stack 为空时 blur 当前 focus；随后会对已有 stack 调用 onClose、重置 size，并把 stack 替换成新 element [E: packages/tui/src/ui/dialog.tsx:147] [E: packages/tui/src/ui/dialog.tsx:148] [E: packages/tui/src/ui/dialog.tsx:150] [E: packages/tui/src/ui/dialog.tsx:153] [E: packages/tui/src/ui/dialog.tsx:155] [E: packages/tui/src/ui/dialog.tsx:156]。`DialogProvider` 只渲染 stack top，`useDialog()` 在 provider 外调用会抛错 [E: packages/tui/src/ui/dialog.tsx:196] [E: packages/tui/src/ui/dialog.tsx:212] [E: packages/tui/src/ui/dialog.tsx:214] [E: packages/tui/src/ui/dialog.tsx:222] [E: packages/tui/src/ui/dialog.tsx:225]。

## Helper Dialogs

| Helper | 输入/输出 | 行为 |
| --- | --- | --- |
| `DialogAlert` | `show()` resolve on confirm/close [E: packages/tui/src/ui/dialog-alert.tsx:59] [E: packages/tui/src/ui/dialog-alert.tsx:62] [E: packages/tui/src/ui/dialog-alert.tsx:63] | 单按钮确认，confirm 后 clear dialog [E: packages/tui/src/ui/dialog-alert.tsx:16] [E: packages/tui/src/ui/dialog-alert.tsx:23] [E: packages/tui/src/ui/dialog-alert.tsx:24]。 |
| `DialogConfirm` | `show()` resolve `true`、`false` 或 `undefined` [E: packages/tui/src/ui/dialog-confirm.tsx:93] [E: packages/tui/src/ui/dialog-confirm.tsx:100] [E: packages/tui/src/ui/dialog-confirm.tsx:101] [E: packages/tui/src/ui/dialog-confirm.tsx:105] | 左右键切换 confirm/cancel，返回后 clear dialog [E: packages/tui/src/ui/dialog-confirm.tsx:22] [E: packages/tui/src/ui/dialog-confirm.tsx:43] [E: packages/tui/src/ui/dialog-confirm.tsx:51] [E: packages/tui/src/ui/dialog-confirm.tsx:35]。 |
| `DialogPrompt` | `show()` resolve string 或 null [E: packages/tui/src/ui/dialog-prompt.tsx:117] [E: packages/tui/src/ui/dialog-prompt.tsx:121] [E: packages/tui/src/ui/dialog-prompt.tsx:123] | Textarea prompt，submit 命令读取 value；busy 时给 textarea 加 `BUSY` trait 并 blur [E: packages/tui/src/ui/dialog-prompt.tsx:33] [E: packages/tui/src/ui/dialog-prompt.tsx:64] [E: packages/tui/src/ui/dialog-prompt.tsx:69]。 |
| `DialogSelect` | option 可带 title、description、details、footer、category、disabled、gutter、margin、onSelect 等字段 [E: packages/tui/src/ui/dialog-select.tsx:56] [E: packages/tui/src/ui/dialog-select.tsx:60] [E: packages/tui/src/ui/dialog-select.tsx:61] [E: packages/tui/src/ui/dialog-select.tsx:62] [E: packages/tui/src/ui/dialog-select.tsx:65] [E: packages/tui/src/ui/dialog-select.tsx:67] [E: packages/tui/src/ui/dialog-select.tsx:69] [E: packages/tui/src/ui/dialog-select.tsx:70] [E: packages/tui/src/ui/dialog-select.tsx:71] | 使用 fuzzysort 对 title 和 category 加权过滤，按 category 分组，并按 terminal 高度限制列表高度 [E: packages/tui/src/ui/dialog-select.tsx:154] [E: packages/tui/src/ui/dialog-select.tsx:165] [E: packages/tui/src/ui/dialog-select.tsx:167] [E: packages/tui/src/ui/dialog-select.tsx:168] [E: packages/tui/src/ui/dialog-select.tsx:186] [E: packages/tui/src/ui/dialog-select.tsx:190] [E: packages/tui/src/ui/dialog-select.tsx:213]。 |
| `DialogExportOptions` | `show()` 返回 filename 和 export options [E: packages/tui/src/ui/dialog-export-options.tsx:187] [E: packages/tui/src/ui/dialog-export-options.tsx:195] [E: packages/tui/src/ui/dialog-export-options.tsx:200] [E: packages/tui/src/ui/dialog-export-options.tsx:210] [E: packages/tui/src/ui/dialog-export-options.tsx:214] | Tab 循环选项，Space toggle boolean，filename textarea submit 后返回 options [E: packages/tui/src/ui/dialog-export-options.tsx:36] [E: packages/tui/src/ui/dialog-export-options.tsx:100] [E: packages/tui/src/ui/dialog-export-options.tsx:105]。 |
| `DialogHelp` | help dialog component [E: packages/tui/src/ui/dialog-help.tsx:6] | 显示 command shortcut，Return/Escape 关闭 [E: packages/tui/src/ui/dialog-help.tsx:9] [E: packages/tui/src/ui/dialog-help.tsx:13] [E: packages/tui/src/ui/dialog-help.tsx:14] [E: packages/tui/src/ui/dialog-help.tsx:30]。 |

## Domain Dialogs

| Dialog | 文件 | 领域 / 主要行为 |
| --- | --- | --- |
| `DialogAgent` | `component/dialog-agent.tsx` | 用 `DialogSelect` 展示 agent 选项，title 为 `Select agent` [E: packages/tui/src/component/dialog-agent.tsx:6] [E: packages/tui/src/component/dialog-agent.tsx:22]。 |
| `CommandPalette` | `component/command-palette.tsx` | 从 keymap 读取 reachable commands，过滤 hidden 和自身命令，选中后 dispatch command [E: packages/tui/src/component/command-palette.tsx:26] [E: packages/tui/src/component/command-palette.tsx:33] [E: packages/tui/src/component/command-palette.tsx:36] [E: packages/tui/src/component/command-palette.tsx:58]。 |
| `DialogConsoleOrg` | `component/dialog-console-org.tsx` | Console org switcher，处理 loading/no orgs 状态并以 `Switch org` 为标题 [E: packages/tui/src/component/dialog-console-org.tsx:24] [E: packages/tui/src/component/dialog-console-org.tsx:51] [E: packages/tui/src/component/dialog-console-org.tsx:61] [E: packages/tui/src/component/dialog-console-org.tsx:118]。 |
| `DialogMcp` | `component/dialog-mcp.tsx` | MCP server selector/toggler，action title 为 toggle MCP，并以 `MCPs` 为标题 [E: packages/tui/src/component/dialog-mcp.tsx:21] [E: packages/tui/src/component/dialog-mcp.tsx:50] [E: packages/tui/src/component/dialog-mcp.tsx:77]。 |
| `DialogModel` | `component/dialog-model.tsx` | Model selector，提供 connect/view all providers 和 favorite action，调用 `sortModelOptions` 排序 [E: packages/tui/src/component/dialog-model.tsx:12] [E: packages/tui/src/component/dialog-model.tsx:103] [E: packages/tui/src/component/dialog-model.tsx:162] [E: packages/tui/src/component/dialog-model.tsx:163] [E: packages/tui/src/component/dialog-model.tsx:169] [E: packages/tui/src/component/dialog-model.tsx:173] [E: packages/tui/src/component/dialog-model.tsx:186]。 |
| `DialogMoveSession` | `component/dialog-move-session.tsx` | Move session flow，支持 reload、delete、new project copy、file changes confirm 和 refresh action [E: packages/tui/src/component/dialog-move-session.tsx:22] [E: packages/tui/src/component/dialog-move-session.tsx:77] [E: packages/tui/src/component/dialog-move-session.tsx:224] [E: packages/tui/src/component/dialog-move-session.tsx:237] [E: packages/tui/src/component/dialog-move-session.tsx:323] [E: packages/tui/src/component/dialog-move-session.tsx:338]。 |
| `DialogProvider` | `component/dialog-provider.tsx` | Provider connect flow，提供 provider options、custom provider prompt、auth method selection、API key/code/auto flows [E: packages/tui/src/component/dialog-provider.tsx:47] [E: packages/tui/src/component/dialog-provider.tsx:160] [E: packages/tui/src/component/dialog-provider.tsx:198] [E: packages/tui/src/component/dialog-provider.tsx:203] [E: packages/tui/src/component/dialog-provider.tsx:324] [E: packages/tui/src/component/dialog-provider.tsx:368] [E: packages/tui/src/component/dialog-provider.tsx:400] [E: packages/tui/src/component/dialog-provider.tsx:460]。 |
| `DialogRetryAction` | `component/dialog-retry-action.tsx` | Retry/action error dialog，支持 link action、dismiss 和 `dontShowAgain` return [E: packages/tui/src/component/dialog-retry-action.tsx:15] [E: packages/tui/src/component/dialog-retry-action.tsx:156] [E: packages/tui/src/component/dialog-retry-action.tsx:157]。 |
| `DialogSessionDeleteFailed` | `component/dialog-session-delete-failed.tsx` | Session delete failure recovery，提供 delete workspace 或 restore to new workspace 选项 [E: packages/tui/src/component/dialog-session-delete-failed.tsx:8] [E: packages/tui/src/component/dialog-session-delete-failed.tsx:24] [E: packages/tui/src/component/dialog-session-delete-failed.tsx:30]。 |
| `DialogSessionList` | `component/dialog-session-list.tsx` | Session list dialog，支持 workspace recovery、quick switch footer、delete/pin/rename actions [E: packages/tui/src/component/dialog-session-list.tsx:45] [E: packages/tui/src/component/dialog-session-list.tsx:101] [E: packages/tui/src/component/dialog-session-list.tsx:292] [E: packages/tui/src/component/dialog-session-list.tsx:299] [E: packages/tui/src/component/dialog-session-list.tsx:348] [E: packages/tui/src/component/dialog-session-list.tsx:355]。 |
| `DialogSessionRename` | `component/dialog-session-rename.tsx` | 使用 `DialogPrompt` 重命名 session，title 为 `Rename Session` [E: packages/tui/src/component/dialog-session-rename.tsx:11] [E: packages/tui/src/component/dialog-session-rename.tsx:19]。 |
| `DialogSkill` | `component/dialog-skill.tsx` | Skill selector，使用 padded skill name 和 `Search skills` placeholder [E: packages/tui/src/component/dialog-skill.tsx:13] [E: packages/tui/src/component/dialog-skill.tsx:40] [E: packages/tui/src/component/dialog-skill.tsx:54]。 |
| `DialogStash` | `component/dialog-stash.tsx` | Prompt stash list，带 delete action，title 为 `Stash` [E: packages/tui/src/component/dialog-stash.tsx:29] [E: packages/tui/src/component/dialog-stash.tsx:57] [E: packages/tui/src/component/dialog-stash.tsx:74]。 |
| `DialogStatus` | `component/dialog-status.tsx` | Status dialog 展示 MCP、LSP、formatter 和 plugin 状态块 [E: packages/tui/src/component/dialog-status.tsx:53] [E: packages/tui/src/component/dialog-status.tsx:96] [E: packages/tui/src/component/dialog-status.tsx:121] [E: packages/tui/src/component/dialog-status.tsx:143]。 |
| `DialogTag` | `component/dialog-tag.tsx` | Autocomplete tag dialog，option title 使用 file path，title 为 `Autocomplete` [E: packages/tui/src/component/dialog-tag.tsx:8] [E: packages/tui/src/component/dialog-tag.tsx:33] [E: packages/tui/src/component/dialog-tag.tsx:39]。 |
| `DialogThemeList` | `component/dialog-theme-list.tsx` | Theme selector，option title 为 theme name，title 为 `Themes` [E: packages/tui/src/component/dialog-theme-list.tsx:6] [E: packages/tui/src/component/dialog-theme-list.tsx:11] [E: packages/tui/src/component/dialog-theme-list.tsx:25]。 |
| `DialogVariant` | `component/dialog-variant.tsx` | Model variant selector，包含 default variant option，title 为 `Select variant` [E: packages/tui/src/component/dialog-variant.tsx:6] [E: packages/tui/src/component/dialog-variant.tsx:34]。 |
| `DialogWorkspaceSelect` / create flow | `component/dialog-workspace-create.tsx` | Workspace/Warp flow，含 recent connected workspaces、Warp reminder、file changes confirm、view all workspaces action [E: packages/tui/src/component/dialog-workspace-create.tsx:35] [E: packages/tui/src/component/dialog-workspace-create.tsx:48] [E: packages/tui/src/component/dialog-workspace-create.tsx:165] [E: packages/tui/src/component/dialog-workspace-create.tsx:236] [E: packages/tui/src/component/dialog-workspace-create.tsx:297]。 |
| `DialogWorkspaceFileChanges` | `component/dialog-workspace-file-changes.tsx` | Workspace file changes dialog，提供 `show()` helper [E: packages/tui/src/component/dialog-workspace-file-changes.tsx:27] [E: packages/tui/src/component/dialog-workspace-file-changes.tsx:139]。 |
| `DialogWorkspaceList` | `component/dialog-workspace-list.tsx` | Workspace list，包含 options/error handling 和 delete action [E: packages/tui/src/component/dialog-workspace-list.tsx:16] [E: packages/tui/src/component/dialog-workspace-list.tsx:106]。 |
| `DialogWorkspaceUnavailable` | `component/dialog-workspace-unavailable.tsx` | Workspace unavailable dialog entry [E: packages/tui/src/component/dialog-workspace-unavailable.tsx:8]。 |

## Sources

- `packages/tui/src/ui/dialog.tsx`
- `packages/tui/src/ui/dialog-alert.tsx`
- `packages/tui/src/ui/dialog-confirm.tsx`
- `packages/tui/src/ui/dialog-prompt.tsx`
- `packages/tui/src/ui/dialog-select.tsx`
- `packages/tui/src/ui/dialog-export-options.tsx`
- `packages/tui/src/ui/dialog-help.tsx`
- `packages/tui/src/component/dialog-*.tsx`
- `packages/tui/src/component/command-palette.tsx`

## 相关

- `tui.dialog-kit`
