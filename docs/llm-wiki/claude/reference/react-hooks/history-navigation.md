---
id: rhook.history-navigation
title: React hooks catalog: history-navigation
kind: reference
tier: T3
source: [hooks/useArrowKeyHistory.tsx, hooks/useAssistantHistory.ts, hooks/useDiffData.ts, hooks/useFileHistorySnapshotInit.ts, hooks/useHistorySearch.ts, hooks/useTurnDiffs.ts]
symbols: [useArrowKeyHistory, useAssistantHistory, useDiffData, useFileHistorySnapshotInit, useHistorySearch, useTurnDiffs]
related: [subsys.session-state, subsys.input-vim, subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.history-navigation` catalog 收录 prompt history、assistant history、file history snapshot 和 per-turn diff navigation hooks；这个 category 边界来自文件名和导出类型的人工归纳 [I]。

## 能回答的问题

- 哪些 hooks 负责 arrow-key history 和 search history?
- diff 与 file-history snapshot 相关 hook 的源码入口在哪里?
- `useAssistantHistory` 与 `useTurnDiffs` 的关键签名是什么?
- history navigation 相关 hooks 覆盖哪些 use* 文件?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useArrowKeyHistory` | `hooks/useArrowKeyHistory.tsx` | 将 arrow key navigation 连接到 prompt history entries [I]。 | `useArrowKeyHistory(...)` [E: hooks/useArrowKeyHistory.tsx:63] |
| `useAssistantHistory` | `hooks/useAssistantHistory.ts` | 管理 assistant message history 的 hook 入口 [I]。 | `useAssistantHistory(...)` [E: hooks/useAssistantHistory.ts:72] |
| `useDiffData` | `hooks/useDiffData.ts` | 返回当前 diff data 结构，供 diff UI 消费 [I]。 | `useDiffData(): DiffData` [E: hooks/useDiffData.ts:34] |
| `useFileHistorySnapshotInit` | `hooks/useFileHistorySnapshotInit.ts` | 初始化 file history snapshot state [I]。 | `useFileHistorySnapshotInit(...)` [E: hooks/useFileHistorySnapshotInit.ts:9] |
| `useHistorySearch` | `hooks/useHistorySearch.ts` | 管理 history search 的输入与匹配状态 [I]。 | `useHistorySearch(...)` [E: hooks/useHistorySearch.ts:15] |
| `useTurnDiffs` | `hooks/useTurnDiffs.ts` | 从 message stream 中提取 turn-level file diff 列表 [I]。 | `useTurnDiffs(messages): TurnDiff[]` [E: hooks/useTurnDiffs.ts:100] |

## Sources

- `hooks/useArrowKeyHistory.tsx`
- `hooks/useAssistantHistory.ts`
- `hooks/useDiffData.ts`
- `hooks/useFileHistorySnapshotInit.ts`
- `hooks/useHistorySearch.ts`
- `hooks/useTurnDiffs.ts`

## 相关

- [会话持久化与状态](../../subsystems/session-state.md)
- [文本输入与 Vim](../../subsystems/input-vim.md)
- [UI 组件族](../../subsystems/ui-components.md)
