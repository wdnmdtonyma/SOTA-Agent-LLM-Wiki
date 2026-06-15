---
id: rhook.keybinding-routing
title: React hooks catalog: keybinding-routing
kind: reference
tier: T3
source: [hooks/useBackgroundTaskNavigation.ts, hooks/useCancelRequest.ts, hooks/useCommandKeybindings.tsx, hooks/useExitOnCtrlCD.ts, hooks/useExitOnCtrlCDWithKeybindings.ts, hooks/useGlobalKeybindings.tsx]
symbols: [useBackgroundTaskNavigation, CancelRequestHandler, CommandKeybindingHandlers, useExitOnCtrlCD, useExitOnCtrlCDWithKeybindings, GlobalKeybindingHandlers]
related: [subsys.keybindings, subsys.swarm, subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.keybinding-routing` catalog 收录 keybinding handler components、cancel/interrupt routing、Ctrl-C exit handling 和 background task keyboard navigation；这个 category 边界来自 keybinding、cancel、Ctrl-C 和 keyboard navigation 导出名的人工归纳 [I]。

## 能回答的问题

- 哪些 use* 文件导出 keybinding handler components?
- cancel request 与 Ctrl-C exit hooks 的入口在哪里?
- background task keyboard navigation 的 hook 签名是什么?
- keybinding routing 相关 hooks 覆盖哪些 use* 文件?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useBackgroundTaskNavigation` | `hooks/useBackgroundTaskNavigation.ts` | 处理 background task 和 teammate view 的 keyboard navigation [I]。 | `useBackgroundTaskNavigation(options?)` [E: hooks/useBackgroundTaskNavigation.ts:67] |
| `CancelRequestHandler` | `hooks/useCancelRequest.ts` | 注册 cancel/interrupt keybinding handler component [I]。 | `CancelRequestHandler(props): null` [E: hooks/useCancelRequest.ts:63] |
| `CommandKeybindingHandlers` | `hooks/useCommandKeybindings.tsx` | 注册 command keybinding handler component [I]。 | `CommandKeybindingHandlers(t0)` [E: hooks/useCommandKeybindings.tsx:37] |
| `useExitOnCtrlCD` | `hooks/useExitOnCtrlCD.ts` | 管理 Ctrl-C / Ctrl-D exit state [I]。 | `useExitOnCtrlCD(...)` [E: hooks/useExitOnCtrlCD.ts:45] |
| `useExitOnCtrlCDWithKeybindings` | `hooks/useExitOnCtrlCDWithKeybindings.ts` | 将 exit-on-Ctrl-C/D 逻辑接入 keybinding 系统 [I]。 | `useExitOnCtrlCDWithKeybindings(...)` [E: hooks/useExitOnCtrlCDWithKeybindings.ts:18] |
| `GlobalKeybindingHandlers` | `hooks/useGlobalKeybindings.tsx` | 注册 global keybinding handler component [I]。 | `GlobalKeybindingHandlers(...)` [E: hooks/useGlobalKeybindings.tsx:36] |

## Sources

- `hooks/useBackgroundTaskNavigation.ts`
- `hooks/useCancelRequest.ts`
- `hooks/useCommandKeybindings.tsx`
- `hooks/useExitOnCtrlCD.ts`
- `hooks/useExitOnCtrlCDWithKeybindings.ts`
- `hooks/useGlobalKeybindings.tsx`

## 相关

- [Keybindings](../../subsystems/keybindings.md)
- [多 agent 与 Swarm](../../subsystems/swarm.md)
- [UI 组件族](../../subsystems/ui-components.md)
