---
id: rhook.input-keyboard
title: React hooks catalog: input-keyboard
kind: reference
tier: T3
source: [hooks/useClipboardImageHint.ts, hooks/useCopyOnSelect.ts, hooks/useDoublePress.ts, hooks/useInputBuffer.ts, hooks/usePasteHandler.ts, hooks/usePromptSuggestion.ts, hooks/useSearchInput.ts, hooks/useTextInput.ts, hooks/useTypeahead.tsx, hooks/useVimInput.ts]
symbols: [useClipboardImageHint, useCopyOnSelect, useSelectionBgColor, useDoublePress, useInputBuffer, usePasteHandler, usePromptSuggestion, useSearchInput, useTextInput, useTypeahead, useVimInput]
related: [subsys.input-vim, subsys.keybindings, subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.input-keyboard` catalog 收录 prompt 输入、粘贴、选择、搜索与 typeahead 相关的 React hooks；这个 category 边界来自文件名、导出名和参数形态的人工归纳 [I]。

## 能回答的问题

- 哪些 React hooks 直接服务 prompt input、paste、clipboard、search input 或 typeahead?
- `useTextInput` 与 `useVimInput` 的源码入口在哪里?
- 哪些输入侧 hooks 返回 buffer、suggestion 或 selection 相关状态?
- 输入 keyboard 相关 hooks 的关键签名是什么?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useClipboardImageHint` | `hooks/useClipboardImageHint.ts` | 为输入框的 clipboard image hint 提供状态与回调入口 [I]。 | `useClipboardImageHint(...)` [E: hooks/useClipboardImageHint.ts:19] |
| `useCopyOnSelect`; `useSelectionBgColor` | `hooks/useCopyOnSelect.ts` | 将 terminal selection 的 copy-on-select 行为和 selection background color 同步封装到两个 hooks [I]。 | `useCopyOnSelect(...)` [E: hooks/useCopyOnSelect.ts:26]; `useSelectionBgColor(selection)` [E: hooks/useCopyOnSelect.ts:93] |
| `useDoublePress` | `hooks/useDoublePress.ts` | 为同一输入动作的 double-press detection 提供可复用 helper [I]。 | `useDoublePress(...)` [E: hooks/useDoublePress.ts:8] |
| `useInputBuffer` | `hooks/useInputBuffer.ts` | 管理 prompt input 的 buffered entries 和提交结果 [I]。 | `useInputBuffer(...)` [E: hooks/useInputBuffer.ts:27] |
| `usePasteHandler` | `hooks/usePasteHandler.ts` | 为 paste event 入口接入 prompt 文本与 pasted content 处理 [I]。 | `usePasteHandler(...)` [E: hooks/usePasteHandler.ts:30] |
| `usePromptSuggestion` | `hooks/usePromptSuggestion.ts` | 根据 prompt 输入上下文产出 suggestion 状态 [I]。 | `usePromptSuggestion(...)` [E: hooks/usePromptSuggestion.ts:15] |
| `useSearchInput` | `hooks/useSearchInput.ts` | 管理搜索输入框的 value、cursor 和事件处理 [I]。 | `useSearchInput(...)` [E: hooks/useSearchInput.ts:84] |
| `useTextInput` | `hooks/useTextInput.ts` | 作为 plain prompt text input 的主 hook，接收 `UseTextInputProps` 并返回输入状态 [I]。 | `useTextInput(...)` [E: hooks/useTextInput.ts:73] |
| `useTypeahead` | `hooks/useTypeahead.tsx` | 为 command、file path 和其他 completion 类型提供 typeahead 状态与 key handlers [I]。 | `useTypeahead(...)` [E: hooks/useTypeahead.tsx:353] |
| `useVimInput` | `hooks/useVimInput.ts` | 将 Vim mode 状态机包装成 prompt input hook [I]。 | `useVimInput(props): VimInputState` [E: hooks/useVimInput.ts:34] |

## Sources

- `hooks/useClipboardImageHint.ts`
- `hooks/useCopyOnSelect.ts`
- `hooks/useDoublePress.ts`
- `hooks/useInputBuffer.ts`
- `hooks/usePasteHandler.ts`
- `hooks/usePromptSuggestion.ts`
- `hooks/useSearchInput.ts`
- `hooks/useTextInput.ts`
- `hooks/useTypeahead.tsx`
- `hooks/useVimInput.ts`

## 相关

- [文本输入与 Vim](../../subsystems/input-vim.md)
- [Keybindings](../../subsystems/keybindings.md)
- [UI 组件族](../../subsystems/ui-components.md)
