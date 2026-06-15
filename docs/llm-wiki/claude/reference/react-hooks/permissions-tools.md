---
id: rhook.permissions-tools
title: React hooks catalog: permissions-tools
kind: reference
tier: T3
source: [hooks/useCanUseTool.tsx, hooks/useDeferredHookMessages.ts, hooks/useLogMessages.ts, hooks/useSwarmPermissionPoller.ts]
symbols: [useCanUseTool, useDeferredHookMessages, useLogMessages, registerPermissionCallback, unregisterPermissionCallback, hasPermissionCallback, clearAllPendingCallbacks, processMailboxPermissionResponse, registerSandboxPermissionCallback, hasSandboxPermissionCallback, processSandboxPermissionResponse, useSwarmPermissionPoller]
related: [subsys.permissions, subsys.hooks-feature, subsys.tool-system, subsys.swarm]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.permissions-tools` catalog 收录 tool permission 判断、deferred hook messages、message logging 和 swarm permission polling hooks；这个 category 边界来自 permission/tool/hook-message 导出名的人工归纳 [I]。

## 能回答的问题

- 工具权限判断 hook 在哪个文件?
- deferred hook messages 与 log messages 的 hook 签名是什么?
- swarm permission poller 暴露哪些 callback helper?
- permissions/tools 相关 hooks 覆盖哪些 use* 文件?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useCanUseTool` | `hooks/useCanUseTool.tsx` | 将 tool permission decision 流程封装成可复用 hook [I]。 | `useCanUseTool(setToolUseConfirmQueue, setToolPermissionContext)` [E: hooks/useCanUseTool.tsx:28] |
| `useDeferredHookMessages` | `hooks/useDeferredHookMessages.ts` | 处理需要延迟注入的 hook messages [I]。 | `useDeferredHookMessages(...)` [E: hooks/useDeferredHookMessages.ts:12] |
| `useLogMessages` | `hooks/useLogMessages.ts` | 将 message list 接入 logging side effect [I]。 | `useLogMessages(messages, ignore)` [E: hooks/useLogMessages.ts:19] |
| `useSwarmPermissionPoller` and callback helpers | `hooks/useSwarmPermissionPoller.ts` | 管理 swarm permission response callback 注册、处理和 poller lifecycle [I]。 | `useSwarmPermissionPoller(): void` [E: hooks/useSwarmPermissionPoller.ts:268] |

## Sources

- `hooks/useCanUseTool.tsx`
- `hooks/useDeferredHookMessages.ts`
- `hooks/useLogMessages.ts`
- `hooks/useSwarmPermissionPoller.ts`

## 相关

- [权限系统](../../subsystems/permissions.md)
- [Hooks feature](../../subsystems/hooks-feature.md)
- [工具系统机制](../../subsystems/tool-system.md)
- [多 agent 与 Swarm](../../subsystems/swarm.md)
