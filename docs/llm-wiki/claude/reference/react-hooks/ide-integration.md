---
id: rhook.ide-integration
title: React hooks catalog: ide-integration
kind: reference
tier: T3
source: [hooks/useChromeExtensionNotification.tsx, hooks/useDiffInIDE.ts, hooks/useDirectConnect.ts, hooks/useIDEIntegration.tsx, hooks/useIdeAtMentioned.ts, hooks/useIdeConnectionStatus.ts, hooks/useIdeLogging.ts, hooks/useIdeSelection.ts, hooks/useMailboxBridge.ts, hooks/usePromptsFromClaudeInChrome.tsx, hooks/useReplBridge.tsx]
symbols: [useChromeExtensionNotification, useDiffInIDE, computeEditsFromContents, useDirectConnect, useIDEIntegration, useIdeAtMentioned, useIdeConnectionStatus, useIdeLogging, useIdeSelection, useMailboxBridge, usePromptsFromClaudeInChrome, useReplBridge]
related: [subsys.bridge-remote, subsys.lsp, subsys.mcp]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.ide-integration` catalog 收录 IDE、Chrome extension、direct connect、mailbox bridge、REPL bridge 和 IDE diff/selection hooks；这个 category 边界来自 IDE/bridge/Chrome 命名与 MCP client 参数的人工归纳 [I]。

## 能回答的问题

- 哪些 hooks 连接 IDE selection、IDE status 或 IDE logging?
- direct connect、mailbox bridge、REPL bridge 的 hook 入口在哪里?
- Chrome extension 与 Claude-in-Chrome prompt hooks 的关键签名是什么?
- IDE diff 相关 helper 和 hook 在哪个文件?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useChromeExtensionNotification` | `hooks/useChromeExtensionNotification.tsx` | 处理 Chrome extension 相关 notification lifecycle [I]。 | `useChromeExtensionNotification()` [E: hooks/useChromeExtensionNotification.tsx:16] |
| `useDiffInIDE`; `computeEditsFromContents` | `hooks/useDiffInIDE.ts` | 将 diff 数据转换为 IDE 可用编辑并暴露 hook 入口 [I]。 | `useDiffInIDE(...)` [E: hooks/useDiffInIDE.ts:46]; `computeEditsFromContents(...)` [E: hooks/useDiffInIDE.ts:170] |
| `useDirectConnect` | `hooks/useDirectConnect.ts` | 管理 direct-connect session 参数与状态 [I]。 | `useDirectConnect(...)` [E: hooks/useDirectConnect.ts:39] |
| `useIDEIntegration` | `hooks/useIDEIntegration.tsx` | 组装 IDE integration 参数并接入 React lifecycle [I]。 | `useIDEIntegration(t0)` [E: hooks/useIDEIntegration.tsx:15] |
| `useIdeAtMentioned` | `hooks/useIdeAtMentioned.ts` | 解析 prompt 中 IDE at-mention 相关状态 [I]。 | `useIdeAtMentioned(...)` [E: hooks/useIdeAtMentioned.ts:33] |
| `useIdeConnectionStatus` | `hooks/useIdeConnectionStatus.ts` | 从 MCP client connections 派生 IDE connection status [I]。 | `useIdeConnectionStatus(...)` [E: hooks/useIdeConnectionStatus.ts:11] |
| `useIdeLogging` | `hooks/useIdeLogging.ts` | 对 IDE MCP clients 执行 logging side effect [I]。 | `useIdeLogging(mcpClients): void` [E: hooks/useIdeLogging.ts:18] |
| `useIdeSelection` | `hooks/useIdeSelection.ts` | 从 IDE integration 中读取 selection data [I]。 | `useIdeSelection(...)` [E: hooks/useIdeSelection.ts:59] |
| `useMailboxBridge` | `hooks/useMailboxBridge.ts` | 连接 mailbox bridge 与 submit-message 回调 [I]。 | `useMailboxBridge({ isLoading, onSubmitMessage }): void` [E: hooks/useMailboxBridge.ts:9] |
| `usePromptsFromClaudeInChrome` | `hooks/usePromptsFromClaudeInChrome.tsx` | 将 Claude-in-Chrome prompts 接入 MCP clients 与 permission mode [I]。 | `usePromptsFromClaudeInChrome(mcpClients, toolPermissionMode)` [E: hooks/usePromptsFromClaudeInChrome.tsx:31] |
| `useReplBridge` | `hooks/useReplBridge.tsx` | 连接 REPL bridge、messages、abort controller、commands 与 model [I]。 | `useReplBridge(messages, setMessages, abortControllerRef, commands, mainLoopModel)` [E: hooks/useReplBridge.tsx:53] |

## Sources

- `hooks/useChromeExtensionNotification.tsx`
- `hooks/useDiffInIDE.ts`
- `hooks/useDirectConnect.ts`
- `hooks/useIDEIntegration.tsx`
- `hooks/useIdeAtMentioned.ts`
- `hooks/useIdeConnectionStatus.ts`
- `hooks/useIdeLogging.ts`
- `hooks/useIdeSelection.ts`
- `hooks/useMailboxBridge.ts`
- `hooks/usePromptsFromClaudeInChrome.tsx`
- `hooks/useReplBridge.tsx`

## 相关

- [IDE bridge / remote / CCR](../../subsystems/bridge-remote.md)
- [LSP 集成](../../subsystems/lsp.md)
- [MCP](../../subsystems/mcp.md)
