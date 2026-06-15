---
id: ui.shell
path: subsystems/ui/shell.md
title: Shell 输出组件族
kind: subsystem
tier: T2
source: [components/shell/ExpandShellOutputContext.tsx, components/shell/OutputLine.tsx, components/shell/ShellProgressMessage.tsx, components/shell/ShellTimeDisplay.tsx, components/BashModeProgress.tsx, components/messages/UserBashInputMessage.tsx, components/messages/UserBashOutputMessage.tsx, components/messages/UserLocalCommandOutputMessage.tsx]
symbols: [ExpandShellOutputProvider, OutputLine, ShellProgressMessage, ShellTimeDisplay, BashModeProgress, UserBashInputMessage, UserBashOutputMessage, UserLocalCommandOutputMessage]
related: [subsys.ui-components, subsys.shell-parsing]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Shell 输出组件族负责 bash/local command 输入输出在 transcript 中的展示：它包含 shell output 展开上下文、单行 stdout/stderr 渲染、运行中 progress、时间/timeout 展示、bash mode progress，以及 user message 中的 shell 输入输出 renderer。[E: components/shell/ExpandShellOutputContext.tsx:13][E: components/shell/OutputLine.tsx:47][E: components/shell/ShellProgressMessage.tsx:19][E: components/BashModeProgress.tsx:13]

## 能回答的问题

- 最新 bash output 为什么能在 transcript 中全量展开？[E: components/Message.tsx:191][E: components/Message.tsx:222][E: components/shell/ExpandShellOutputContext.tsx:13][E: components/shell/OutputLine.tsx:59]
- shell output 单行如何处理 JSON、URL、truncate、error/warning 颜色？[E: components/shell/OutputLine.tsx:33][E: components/shell/OutputLine.tsx:44][E: components/shell/OutputLine.tsx:73][E: components/shell/OutputLine.tsx:85]
- running shell progress 如何只显示尾部几行并展示耗时？[E: components/shell/ShellProgressMessage.tsx:41][E: components/shell/ShellProgressMessage.tsx:44][E: components/shell/ShellProgressMessage.tsx:83][E: components/shell/ShellProgressMessage.tsx:109]
- local command output 如何落到 Markdown 渲染？[E: components/messages/UserLocalCommandOutputMessage.tsx:22][E: components/messages/UserLocalCommandOutputMessage.tsx:80]

## 族干什么

Shell family 的边界是 shell-like content 的 UI rendering。`UserBashInputMessage` 从 `<bash-input>` tag 提取命令并渲染 `! ` prompt；`UserBashOutputMessage` 从 `<bash-stdout>`、`<bash-stderr>` tag 提取输出并交给 bash result message；`UserLocalCommandOutputMessage` 从 local command XML-like tags 提取 stdout/stderr，并用 Markdown 渲染内容。[E: components/messages/UserBashInputMessage.tsx:20][E: components/messages/UserBashInputMessage.tsx:31][E: components/messages/UserBashOutputMessage.tsx:13][E: components/messages/UserBashOutputMessage.tsx:22][E: components/messages/UserBashOutputMessage.tsx:45][E: components/messages/UserLocalCommandOutputMessage.tsx:22][E: components/messages/UserLocalCommandOutputMessage.tsx:80]

运行中路径由 `BashModeProgress` 和 `ShellProgressMessage` 负责。`BashModeProgress` 先把 input 包成 `<bash-input>` 并复用 `UserBashInputMessage`，再在有 progress 时渲染 `ShellProgressMessage`。[E: components/BashModeProgress.tsx:20][E: components/BashModeProgress.tsx:23][E: components/BashModeProgress.tsx:34] `ShellProgressMessage` 按 verbose 开关决定显示 full output 还是最后 5 行，并在非 verbose 下限制高度。[E: components/shell/ShellProgressMessage.tsx:41][E: components/shell/ShellProgressMessage.tsx:44][E: components/shell/ShellProgressMessage.tsx:83]

## 成员清单

- `ExpandShellOutputProvider` / `useExpandShellOutput` — `components/shell/ExpandShellOutputContext.tsx` — 提供 context，让被包裹的 shell output 以 expanded/full 模式渲染。[E: components/shell/ExpandShellOutputContext.tsx:12][E: components/shell/ExpandShellOutputContext.tsx:13][E: components/shell/ExpandShellOutputContext.tsx:33]
- `OutputLine` — `components/shell/OutputLine.tsx` — 渲染单条 stdout/stderr line，包含 JSON pretty print、URL hyperlink、truncate 和 error/warning coloring。[E: components/shell/OutputLine.tsx:47][E: components/shell/OutputLine.tsx:65][E: components/shell/OutputLine.tsx:66][E: components/shell/OutputLine.tsx:73][E: components/shell/OutputLine.tsx:85]
- `ShellProgressMessage` — `components/shell/ShellProgressMessage.tsx` — 渲染 running shell output、line count status、elapsed time、byte count 和 OffscreenFreeze wrapper。[E: components/shell/ShellProgressMessage.tsx:19][E: components/shell/ShellProgressMessage.tsx:74][E: components/shell/ShellProgressMessage.tsx:109][E: components/shell/ShellProgressMessage.tsx:118][E: components/shell/ShellProgressMessage.tsx:136]
- `ShellTimeDisplay` — `components/shell/ShellTimeDisplay.tsx` — 格式化 elapsed 和 timeout 文本。[E: components/shell/ShellTimeDisplay.tsx:15][E: components/shell/ShellTimeDisplay.tsx:19][E: components/shell/ShellTimeDisplay.tsx:51]
- `BashModeProgress` — `components/BashModeProgress.tsx` — 渲染 bash mode input 和运行中 progress 或 BashTool progress。[E: components/BashModeProgress.tsx:20][E: components/BashModeProgress.tsx:23][E: components/BashModeProgress.tsx:34][E: components/BashModeProgress.tsx:47]
- `UserBashInputMessage` — `components/messages/UserBashInputMessage.tsx` — 渲染用户 bash 输入。[E: components/messages/UserBashInputMessage.tsx:20][E: components/messages/UserBashInputMessage.tsx:31]
- `UserBashOutputMessage` — `components/messages/UserBashOutputMessage.tsx` — 渲染用户 bash stdout/stderr 输出并委托 bash result renderer。[E: components/messages/UserBashOutputMessage.tsx:13][E: components/messages/UserBashOutputMessage.tsx:23][E: components/messages/UserBashOutputMessage.tsx:45]
- `UserLocalCommandOutputMessage` — `components/messages/UserLocalCommandOutputMessage.tsx` — 渲染 local command stdout/stderr，普通内容走 Markdown，cloud launch 内容走专门 layout。[E: components/messages/UserLocalCommandOutputMessage.tsx:22][E: components/messages/UserLocalCommandOutputMessage.tsx:60][E: components/messages/UserLocalCommandOutputMessage.tsx:80]

## 巨型组件深挖

`OutputLine` 是 shell family 的细粒度核心。它先读取 terminal columns，再根据 `verbose` 或 `ExpandShellOutputContext` 判断是否显示 full output。[E: components/shell/OutputLine.tsx:56][E: components/shell/OutputLine.tsx:59][E: components/shell/OutputLine.tsx:61] 内容处理链是：短 JSON 先尝试 parse/stringify pretty print，随后 URL 被转换为 terminal hyperlink；full mode 只去掉 underline ANSI，非 full mode 交给 `renderTruncatedContent` 按终端宽度截断。[E: components/shell/OutputLine.tsx:33][E: components/shell/OutputLine.tsx:65][E: components/shell/OutputLine.tsx:66][E: components/shell/OutputLine.tsx:69][E: components/shell/OutputLine.tsx:73] 最后它根据 `type === "error"` 或 warning 决定颜色，并包进 `MessageResponse`。[E: components/shell/OutputLine.tsx:85][E: components/shell/OutputLine.tsx:95]

Messages family 会为最新 bash output 包一层 `ExpandShellOutputProvider`，使该 output 的 `OutputLine` 可以从 context 读取 expanded 状态。[E: components/Message.tsx:191][E: components/Message.tsx:222][E: components/shell/ExpandShellOutputContext.tsx:13][E: components/shell/OutputLine.tsx:59] [I] 这是一条跨 family 接线：消息调度归 Messages，shell 内容渲染归 Shell。

## 与 hooks/keybindings/AppState 接线

Shell family 直接使用 `useTerminalSize` 调整输出宽度，并使用 `InVirtualListContext` 决定截断策略的一部分输入。[E: components/shell/OutputLine.tsx:56][E: components/shell/OutputLine.tsx:60] 它没有注册 keybindings，也没有直接写 AppState；expanded/full 展示来自 props、verbose 或 `ExpandShellOutputContext`。[E: components/shell/OutputLine.tsx:61][E: components/shell/ExpandShellOutputContext.tsx:13] [I] keybinding 层若要影响 shell 展示，应通过外层 message selection/verbose/expanded 状态间接改变 props 或 provider 包裹。

## Sources

- `components/shell/ExpandShellOutputContext.tsx`
- `components/shell/OutputLine.tsx`
- `components/shell/ShellProgressMessage.tsx`
- `components/shell/ShellTimeDisplay.tsx`
- `components/BashModeProgress.tsx`
- `components/messages/UserBashInputMessage.tsx`
- `components/messages/UserBashOutputMessage.tsx`
- `components/messages/UserLocalCommandOutputMessage.tsx`

## 相关

- `subsys.ui-components`
- `subsys.shell-parsing`
