---
id: ui.prompt-input
path: subsystems/ui/prompt-input.md
title: PromptInput 组件族
kind: subsystem
tier: T2
source: [components/PromptInput/PromptInput.tsx, components/PromptInput/PromptInputFooter.tsx, components/BaseTextInput.tsx, components/TextInput.tsx, components/VimTextInput.tsx, components/SearchBox.tsx, screens/REPL.tsx]
symbols: [PromptInput, PromptInputFooter, BaseTextInput, TextInput, VimTextInput, SearchBox]
related: [subsys.ui-components, subsys.input-vim, subsys.keybindings, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> PromptInput 组件族负责 REPL 底部的 text input surface：它管理输入文本、光标、paste/image paste、history search、typeahead、mode、footer panels、keybindings，并把最终提交路由给 chat 或 agent submit handler。[E: components/PromptInput/PromptInput.tsx:124][E: components/PromptInput/PromptInput.tsx:352][E: components/PromptInput/PromptInput.tsx:984][E: components/PromptInput/PromptInput.tsx:1670]

## 能回答的问题

- PromptInput 如何把普通输入、Vim 输入和底层 BaseTextInput 连接起来？[E: components/PromptInput/PromptInput.tsx:2172][E: components/PromptInput/PromptInput.tsx:2243][E: components/TextInput.tsx:92][E: components/VimTextInput.tsx:101][E: components/VimTextInput.tsx:127]
- pasted text/image、`@file#Lx` mention 和 long paste ref 在哪里处理？[E: components/PromptInput/PromptInput.tsx:1151][E: components/PromptInput/PromptInput.tsx:1201][E: components/PromptInput/PromptInput.tsx:1283]
- chat keybindings 和 AppState mutation 在哪里发生？[E: components/PromptInput/PromptInput.tsx:1643][E: components/PromptInput/PromptInput.tsx:1670][E: components/PromptInput/PromptInput.tsx:2022]
- REPL 如何把 PromptInput 接入主循环？[E: screens/REPL.tsx:4903]

## 族干什么

PromptInput 是 interactive composer。它接收 `messages`、`commands`、`mode`、`pastedContents`、`vimMode`、`onSubmit`、`onAgentSubmit` 等 props，并在内部维护输入值、cursor offset、history search、suggestions、footer selection 和 paste state。[E: components/PromptInput/PromptInput.tsx:124][E: components/PromptInput/PromptInput.tsx:137][E: components/PromptInput/PromptInput.tsx:252][E: components/PromptInput/PromptInput.tsx:352][E: components/PromptInput/PromptInput.tsx:969] 组件通过 `insertTextRef.current` 暴露 imperative insert/setInput 能力，供外层命令或快捷入口把文本写入 prompt。[E: components/PromptInput/PromptInput.tsx:266]

提交路径集中在 `onSubmit`。它会先处理 footer 和 view selection，再接受 suggestion、direct member message、active agent routing，最后把普通输入交给 `props.onSubmit`。[E: components/PromptInput/PromptInput.tsx:984][E: components/PromptInput/PromptInput.tsx:992][E: components/PromptInput/PromptInput.tsx:1007][E: components/PromptInput/PromptInput.tsx:1040][E: components/PromptInput/PromptInput.tsx:1087][E: components/PromptInput/PromptInput.tsx:1099]

## 成员清单

- `PromptInput` — `components/PromptInput/PromptInput.tsx` — 渲染完整 prompt composer，包含 input box、mode indicator、footer、notifications、dialogs 和 keybinding handlers。[E: components/PromptInput/PromptInput.tsx:194][E: components/PromptInput/PromptInput.tsx:2124][E: components/PromptInput/PromptInput.tsx:2243][E: components/PromptInput/PromptInput.tsx:2262][E: components/PromptInput/PromptInput.tsx:2274]
- `PromptInputFooter` — `components/PromptInput/PromptInputFooter.tsx` — 渲染 status line、left side controls、notifications、bridge status、coordinator task panel 和 suggestions/help menu。[E: components/PromptInput/PromptInputFooter.tsx:63][E: components/PromptInput/PromptInputFooter.tsx:130][E: components/PromptInput/PromptInputFooter.tsx:138]
- `TextInput` — `components/TextInput.tsx` — 用 `useTextInput` 把普通输入转换为 `BaseTextInput` 需要的 rendered value、cursor 和 handlers。[E: components/TextInput.tsx:37][E: components/TextInput.tsx:92][E: components/TextInput.tsx:120]
- `VimTextInput` — `components/VimTextInput.tsx` — 用 `useVimInput` 提供 Vim mode 的 input state，并复用 `BaseTextInput` 渲染。[E: components/VimTextInput.tsx:13][E: components/VimTextInput.tsx:101][E: components/VimTextInput.tsx:127]
- `BaseTextInput` — `components/BaseTextInput.tsx` — 负责 Ink 文本行、cursor、placeholder、paste handler、highlight spans 和 command argument hint 的底层渲染。[E: components/BaseTextInput.tsx:22][E: components/BaseTextInput.tsx:54][E: components/BaseTextInput.tsx:76][E: components/BaseTextInput.tsx:105]
- `SearchBox` — `components/SearchBox.tsx` — 归入本族，因为它是终端内 text input pattern 的小型变体，并与 prompt/search 输入体验共享边界。[I]
- `PromptInput` in REPL — `screens/REPL.tsx` — REPL 在底部挂载 PromptInput，并传入 messages、commands、AppState 派生状态和 submit handlers。[E: screens/REPL.tsx:4894][E: screens/REPL.tsx:4903]

## 巨型组件深挖

`PromptInput` 是本批 UI 中最重的 component。它的第一层职责是建模输入 buffer：`input`, `cursorOffset`, `externalInputState`, `insertTextRef`, `useHistorySearch`, `usePromptSuggestion`, `useInputBuffer`, `useMaybeTruncateInput` 都在同一个组件中被组装。[E: components/PromptInput/PromptInput.tsx:137][E: components/PromptInput/PromptInput.tsx:252][E: components/PromptInput/PromptInput.tsx:266][E: components/PromptInput/PromptInput.tsx:352][E: components/PromptInput/PromptInput.tsx:508][E: components/PromptInput/PromptInput.tsx:832][E: components/PromptInput/PromptInput.tsx:842] 第二层职责是把输入转换为 semantic actions：`onChange` 识别 `?`、tabs 和 mode prefixes；`onTextPaste` 处理 ANSI/tabs、long paste ref 与 `!` prefix；`onImagePaste` 存储 image pasted content 并插入 `[Image]` 引用。[E: components/PromptInput/PromptInput.tsx:854][E: components/PromptInput/PromptInput.tsx:1201][E: components/PromptInput/PromptInput.tsx:1220][E: components/PromptInput/PromptInput.tsx:1151][E: components/PromptInput/PromptInput.tsx:1172]

第三层职责是 keyboard control。PromptInput 注册 `chat:submit` context，组装 `chatHandlers`，再通过 `useKeybindings` 连接 Chat context；同时还注册 message actions、fast mode、help dismiss、quick open、global search、history、interrupt 和 footer navigation。[E: components/PromptInput/PromptInput.tsx:1643][E: components/PromptInput/PromptInput.tsx:1660][E: components/PromptInput/PromptInput.tsx:1670][E: components/PromptInput/PromptInput.tsx:1677][E: components/PromptInput/PromptInput.tsx:1683][E: components/PromptInput/PromptInput.tsx:1702][E: components/PromptInput/PromptInput.tsx:1732][E: components/PromptInput/PromptInput.tsx:1742]

## 与 hooks/keybindings/AppState 接线

PromptInput 同时是 hooks、keybindings、AppState 的交汇点。hooks 侧，它使用 history/typeahead/input-buffer/paste/terminal-size 系列 hooks 组合输入体验。[E: components/PromptInput/PromptInput.tsx:352][E: components/PromptInput/PromptInput.tsx:1106][E: components/PromptInput/PromptInput.tsx:832][E: components/PromptInput/PromptInput.tsx:1987] keybindings 侧，它在 Chat context 中绑定 submit/newline/external editor/stash/model/thinking/cycle mode/image paste 等动作。[E: components/PromptInput/PromptInput.tsx:1660][E: components/PromptInput/PromptInput.tsx:1670] AppState 侧，model picker 会写 `mainLoopModel` 和 `mainLoopModelForSession`，thinking selector 会写 `thinkingEnabled`。[E: components/PromptInput/PromptInput.tsx:2022][E: components/PromptInput/PromptInput.tsx:2088] [I] 因此，PromptInput 是 UI 中少数既读取运行态、又直接发起状态 mutation 的 component family。

## Sources

- `components/PromptInput/PromptInput.tsx`
- `components/PromptInput/PromptInputFooter.tsx`
- `components/BaseTextInput.tsx`
- `components/TextInput.tsx`
- `components/VimTextInput.tsx`
- `components/SearchBox.tsx`
- `screens/REPL.tsx`

## 相关

- `subsys.ui-components`
- `subsys.input-vim`
- `subsys.keybindings`
- `subsys.session-state`
