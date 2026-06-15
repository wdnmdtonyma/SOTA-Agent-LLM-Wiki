---
id: ui.messages
path: subsystems/ui/messages.md
title: Messages 组件族
kind: subsystem
tier: T2
source: [components/Messages.tsx, components/Message.tsx, components/MessageRow.tsx, components/VirtualMessageList.tsx, components/Markdown.tsx, components/MarkdownTable.tsx, components/MessageResponse.tsx, components/messageActions.tsx, components/MessageSelector.tsx, components/CompactSummary.tsx, components/MessageModel.tsx, components/MessageTimestamp.tsx, components/FallbackToolUseErrorMessage.tsx, components/FallbackToolUseRejectedMessage.tsx, components/NotebookEditToolUseRejectedMessage.tsx, components/ClickableImageRef.tsx, components/CtrlOToExpand.tsx, components/DiagnosticsDisplay.tsx, components/messages/UserTextMessage.tsx, components/messages/, screens/REPL.tsx]
symbols: [Messages, Message, MessageRow, VirtualMessageList, Markdown, StreamingMarkdown, MarkdownTable, MessageSelector, CompactSummary, MessageModel, MessageTimestamp, FallbackToolUseErrorMessage, FallbackToolUseRejectedMessage, NotebookEditToolUseRejectedMessage, ClickableImageRef, CtrlOToExpand, SubAgentProvider, DiagnosticsDisplay]
related: [subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Messages 组件族负责把 conversation transcript 渲染成终端 UI：它先把消息归一化、过滤、分组、折叠，再在 virtualized list 或 flat mapped row list 中逐条交给 MessageRow 和 Message 渲染。[E: components/Messages.tsx:379][E: components/Messages.tsx:517][E: components/Messages.tsx:520][E: components/Messages.tsx:699][E: components/Messages.tsx:701][E: components/MessageRow.tsx:232]

## 能回答的问题

- 一条 assistant/user/system/tool 消息最后由哪个组件渲染？[E: components/Message.tsx:82][E: components/Message.tsx:102][E: components/Message.tsx:374]
- transcript 什么时候走 virtual scroll，什么时候只渲染可见切片？[E: components/Messages.tsx:466][E: components/Messages.tsx:467][E: components/VirtualMessageList.tsx:336]
- Markdown、表格、用户 shell 输出这些散组件应该归到哪个 family？[E: components/Markdown.tsx:78][E: components/MarkdownTable.tsx:72][E: components/messages/UserBashOutputMessage.tsx:45]
- REPL 如何把 Messages 接到主界面？[E: screens/REPL.tsx:4570]

## 族干什么

Messages 是 transcript pipeline。入口组件读取原始消息后先丢弃空消息，再根据 compact、brief、transcript mode、grouping 与 collapse 规则生成 renderable messages。[E: components/Messages.tsx:379][E: components/Messages.tsx:496][E: components/Messages.tsx:514][E: components/Messages.tsx:515][E: components/Messages.tsx:517][E: components/Messages.tsx:520] 当 `scrollRef` 可用且没有禁用 virtual scroll 时，族会启用 virtual scroll；否则用 flat mapped row list 渲染 renderable messages。[E: components/Messages.tsx:466][E: components/Messages.tsx:467][E: components/Messages.tsx:699][E: components/Messages.tsx:701]

`MessageRow` 是每条消息的 layout shell。它判断一条消息是否 grouped、collapsed、transcript mode、static render，并把主体交给 `Message`，再补时间戳、模型名和 streaming 状态。[E: components/MessageRow.tsx:113][E: components/MessageRow.tsx:114][E: components/MessageRow.tsx:153][E: components/MessageRow.tsx:232][E: components/MessageRow.tsx:267][E: components/MessageRow.tsx:296] `Message` 是 type dispatcher：`attachment` 走 `AttachmentMessage`，assistant content 逐 block 走 `AssistantMessageBlock`，user content 逐 block 走 `UserMessage`，grouped/collapsed tool content 走对应折叠组件。[E: components/Message.tsx:83][E: components/Message.tsx:102][E: components/Message.tsx:374][E: components/Message.tsx:320][E: components/Message.tsx:335]

## 成员清单

- `Messages` — `components/Messages.tsx` — 渲染完整 transcript，执行 normalize、filter、group、collapse、virtualization gate 和 terminal progress 汇总。[E: components/Messages.tsx:341][E: components/Messages.tsx:379][E: components/Messages.tsx:520][E: components/Messages.tsx:598]
- `MessageRow` — `components/MessageRow.tsx` — 渲染单行消息容器、metadata、streaming status，并把主体委托给 `Message`。[E: components/MessageRow.tsx:93][E: components/MessageRow.tsx:219][E: components/MessageRow.tsx:232][E: components/MessageRow.tsx:296]
- `Message` — `components/Message.tsx` — 按 message type 和 content block type 选择 assistant/user/system/tool 的具体展示组件。[E: components/Message.tsx:58][E: components/Message.tsx:82][E: components/Message.tsx:454][E: components/Message.tsx:483][E: components/Message.tsx:507]
- `VirtualMessageList` — `components/VirtualMessageList.tsx` — 为长 transcript 提供 measured virtual rows、selection、jump/search 与 sticky prompt text。[E: components/VirtualMessageList.tsx:162][E: components/VirtualMessageList.tsx:336][E: components/VirtualMessageList.tsx:345][E: components/VirtualMessageList.tsx:609]
- `Markdown` / `StreamingMarkdown` — `components/Markdown.tsx` — 渲染 assistant/user 的 markdown text，并用 streaming prefix/suffix 策略稳定渲染增量文本。[E: components/Markdown.tsx:78][E: components/Markdown.tsx:102][E: components/Markdown.tsx:186][E: components/Markdown.tsx:220]
- `MarkdownTable` — `components/MarkdownTable.tsx` — 把 markdown table 按终端宽度计算列宽、必要时切换 vertical format。[E: components/MarkdownTable.tsx:72][E: components/MarkdownTable.tsx:123][E: components/MarkdownTable.tsx:184]
- `messageActions` — `components/messageActions.tsx` — 提供 message action 定义、navigation shape 和 action handlers，供 virtual list 与 overlay 选择逻辑使用。[E: components/messageActions.tsx:158][E: components/messageActions.tsx:198][E: components/messageActions.tsx:217]
- `components/messages/*` — `components/messages/` — 承载具体 user/system/bash/local command 等 message renderer；其中 bash output 归 shell family 维护，但 user text dispatcher 会把 `<bash-stdout>` / `<bash-stderr>` 内容交给 `UserBashOutputMessage`。[E: components/Message.tsx:374][E: components/messages/UserTextMessage.tsx:60][E: components/messages/UserTextMessage.tsx:63][E: components/messages/UserBashOutputMessage.tsx:45]
- `Messages` in REPL — `screens/REPL.tsx` — 主 REPL 在 scrollable 区域挂载 Messages，并传入消息、tool progress、selection、scrollRef 等运行态数据。[E: screens/REPL.tsx:4570]
- `MessageSelector` — `components/MessageSelector.tsx` — restore/rewind checkpoint 选择器 overlay：列出可选历史 user message（最多 7 条可见 `MAX_VISIBLE_MESSAGES`），让用户选择恢复对话 / 恢复代码 / summarize，依赖 `fileHistory` 执行 restore。[E: components/MessageSelector.tsx:46][E: components/MessageSelector.tsx:45][E: components/MessageSelector.tsx:31][E: components/MessageSelector.tsx:55]
- `CompactSummary` — `components/CompactSummary.tsx` — 在 transcript 渲染 compact / summarized-conversation 标记：有 `summarizeMetadata` 时显示 “Summarized conversation” + 条数/方向，否则显示 “Compact summary”，并带 ctrl+o 展开提示。[E: components/CompactSummary.tsx:14][E: components/CompactSummary.tsx:30]
- `MessageModel` — `components/MessageModel.tsx` — transcript 模式下为含文本的 assistant 消息渲染模型名（dim）。[E: components/MessageModel.tsx:10][E: components/MessageModel.tsx:16]
- `MessageTimestamp` — `components/MessageTimestamp.tsx` — transcript 模式下为含文本的 assistant 消息渲染本地化时间戳（HH:MM）。[E: components/MessageTimestamp.tsx:10][E: components/MessageTimestamp.tsx:16][E: components/MessageTimestamp.tsx:24]
- `FallbackToolUseErrorMessage` — `components/FallbackToolUseErrorMessage.tsx` — 工具调用失败时的默认错误渲染器：抽取 `tool_use_error` tag、去掉 sandbox-violation 与 `<error>` tag，超过 `MAX_RENDERED_LINES`(10) 截断并显示 “+N lines (ctrl+o)”。[E: components/FallbackToolUseErrorMessage.tsx:16][E: components/FallbackToolUseErrorMessage.tsx:35][E: components/FallbackToolUseErrorMessage.tsx:11][E: components/FallbackToolUseErrorMessage.tsx:49]
- `FallbackToolUseRejectedMessage` — `components/FallbackToolUseRejectedMessage.tsx` — 工具调用被用户拒绝时的默认渲染器，渲染 `<InterruptedByUser/>`。[E: components/FallbackToolUseRejectedMessage.tsx:5][E: components/FallbackToolUseRejectedMessage.tsx:9]
- `NotebookEditToolUseRejectedMessage` — `components/NotebookEditToolUseRejectedMessage.tsx` — NotebookEdit 被拒绝时的渲染器：显示 “User rejected {replace/insert/delete} cell in {notebook_path}” 并用 HighlightedCode 预览 `new_source`。[E: components/NotebookEditToolUseRejectedMessage.tsx:16][E: components/NotebookEditToolUseRejectedMessage.tsx:27][E: components/NotebookEditToolUseRejectedMessage.tsx:30]
- `ClickableImageRef` — `components/ClickableImageRef.tsx` — 把 `[Image #N]` 引用渲染成可点击 hyperlink（点击用默认查看器打开存储图片）；终端不支持 hyperlink 或图片缺失时回退为样式化文本。[E: components/ClickableImageRef.tsx:23][E: components/ClickableImageRef.tsx:31][E: components/ClickableImageRef.tsx:33]
- `CtrlOToExpand` / `SubAgentProvider` / `ctrlOToExpand()` — `components/CtrlOToExpand.tsx` — transcript “(ctrl+o to expand)” 提示：组件版在 subagent / virtual list 内不显示，`SubAgentProvider` context 抑制 subagent 输出里的重复提示，`ctrlOToExpand()` 是字符串版。[E: components/CtrlOToExpand.tsx:29][E: components/CtrlOToExpand.tsx:14][E: components/CtrlOToExpand.tsx:34][E: components/CtrlOToExpand.tsx:47]
- `DiagnosticsDisplay` — `components/DiagnosticsDisplay.tsx` — 渲染 diagnostics attachment（LSP 诊断）：统计文件数与问题总数，verbose 时逐文件列出，空诊断返回 null。[E: components/DiagnosticsDisplay.tsx:17][E: components/DiagnosticsDisplay.tsx:23][E: components/DiagnosticsDisplay.tsx:34][E: components/DiagnosticsDisplay.tsx:35]

## 巨型组件深挖

`MessagesImpl` 是本族最大组件。它先从 terminal size 和 settings 建立渲染环境，再把 `messages` 归一化为 `normalizedMessages`。[E: components/Messages.tsx:375][E: components/Messages.tsx:379] 随后它扫描最新 bash output 的 UUID，用于后续 shell 输出展开和高亮定位。[E: components/Messages.tsx:421][E: components/Messages.tsx:423][E: components/Messages.tsx:433][E: components/Messages.tsx:434] 核心 transform 在一个 memo 中完成：compact-aware messages、filter/reorder、brief filtering、transcript cap、grouping、collapse hooks summaries、collapse read/search groups 都在同一个数据段落内发生，这让 MessageRow 看到的是已经适合渲染的 message stream。[E: components/Messages.tsx:496][E: components/Messages.tsx:499][E: components/Messages.tsx:514][E: components/Messages.tsx:515][E: components/Messages.tsx:517][E: components/Messages.tsx:520]

在 virtual scroll 路径上，`MessagesImpl` 准备 renderable slice 和 row renderer，并把它们传给 `VirtualMessageList`；真正的测量、visible range、keyboard jump/search 由 `VirtualMessageList` 处理。[E: components/Messages.tsx:532][E: components/Messages.tsx:614][E: components/Messages.tsx:699][E: components/Messages.tsx:700][E: components/VirtualMessageList.tsx:336][E: components/VirtualMessageList.tsx:696] 在非 virtual scroll 路径上，`MessagesImpl` 用 `renderableMessages.flatMap(renderMessageRow)` 渲染 row list。[E: components/Messages.tsx:701]

## 与 hooks/keybindings/AppState 接线

本族直接接 terminal hooks：`MessagesImpl` 通过 `useTerminalSize` 读取终端尺寸，MarkdownTable 也读取终端宽度来决定 table layout。[E: components/Messages.tsx:375][E: components/MarkdownTable.tsx:81] `VirtualMessageList` 接 `useVirtualScroll`，并通过 imperative handle 暴露 jump/search 类操作给外层 overlay 或 message actions。[E: components/VirtualMessageList.tsx:336][E: components/VirtualMessageList.tsx:345][E: components/VirtualMessageList.tsx:696]

Messages 不直接写 AppState；它从 REPL 接收 `disableVirtualScroll`、selection、tool progress、transcript mode 等状态，再把 UI 意图体现在渲染和 row props 中。[E: components/Messages.tsx:207][E: components/Messages.tsx:466][E: screens/REPL.tsx:4570] [I] 因此，Messages family 是 read-mostly presentation layer：它消费 REPL/AppState 派生状态，但状态 mutation 主要留在 REPL、keybinding 或 action 层。

## Sources

- `components/Messages.tsx`
- `components/Message.tsx`
- `components/MessageRow.tsx`
- `components/VirtualMessageList.tsx`
- `components/Markdown.tsx`
- `components/MarkdownTable.tsx`
- `components/MessageResponse.tsx`
- `components/messageActions.tsx`
- `components/MessageSelector.tsx`
- `components/CompactSummary.tsx`
- `components/MessageModel.tsx`
- `components/MessageTimestamp.tsx`
- `components/FallbackToolUseErrorMessage.tsx`
- `components/FallbackToolUseRejectedMessage.tsx`
- `components/NotebookEditToolUseRejectedMessage.tsx`
- `components/ClickableImageRef.tsx`
- `components/CtrlOToExpand.tsx`
- `components/DiagnosticsDisplay.tsx`
- `components/messages/UserTextMessage.tsx`
- `components/messages/`
- `screens/REPL.tsx`

## 相关

- `subsys.ui-components`
