---
id: rhook.terminal-layout
title: React hooks catalog: terminal-layout
kind: reference
tier: T3
source: [hooks/useBlink.ts, hooks/useElapsedTime.ts, hooks/useMemoryUsage.ts, hooks/useMinDisplayTime.ts, hooks/useTerminalSize.ts, hooks/useVirtualScroll.ts]
symbols: [useBlink, useElapsedTime, useMemoryUsage, useMinDisplayTime, useTerminalSize, useVirtualScroll]
related: [subsys.ink-runtime, subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.terminal-layout` catalog 收录 terminal rendering、timing display、memory display 和 virtual scrolling 相关 hooks；这个 category 边界来自导出名与 UI/Ink 依赖的人工归纳 [I]。

## 能回答的问题

- 哪些 React hooks 读取 terminal size 或维护 virtual scroll?
- 哪些 hooks 为显示层提供 blink、elapsed time 或 minimum display duration?
- `useMemoryUsage` 与 terminal UI 状态的源码入口在哪里?
- terminal layout 相关 hooks 的关键签名是什么?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useBlink` | `hooks/useBlink.ts` | 为 terminal UI 元素提供 blinking state [I]。 | `useBlink(...)` [E: hooks/useBlink.ts:22] |
| `useElapsedTime` | `hooks/useElapsedTime.ts` | 将 elapsed time 计算封装成 React hook [I]。 | `useElapsedTime(...)` [E: hooks/useElapsedTime.ts:17] |
| `useMemoryUsage` | `hooks/useMemoryUsage.ts` | 返回 memory usage 信息或 `null`，供 UI 显示内存状态 [I]。 | `useMemoryUsage(): MemoryUsageInfo | null` [E: hooks/useMemoryUsage.ts:18] |
| `useMinDisplayTime` | `hooks/useMinDisplayTime.ts` | 让某个 value 至少保持指定 display duration 后再切换 [I]。 | `useMinDisplayTime<T>(value, minMs): T` [E: hooks/useMinDisplayTime.ts:10] |
| `useTerminalSize` | `hooks/useTerminalSize.ts` | 从 terminal 环境读取 size 并返回 `TerminalSize` [I]。 | `useTerminalSize(): TerminalSize` [E: hooks/useTerminalSize.ts:7] |
| `useVirtualScroll` | `hooks/useVirtualScroll.ts` | 为长消息列表提供 virtual scrolling 计算与 imperative scroll helpers [I]。 | `useVirtualScroll(...)` [E: hooks/useVirtualScroll.ts:142] |

## Sources

- `hooks/useBlink.ts`
- `hooks/useElapsedTime.ts`
- `hooks/useMemoryUsage.ts`
- `hooks/useMinDisplayTime.ts`
- `hooks/useTerminalSize.ts`
- `hooks/useVirtualScroll.ts`

## 相关

- [Ink 运行时](../../subsystems/ink-runtime.md)
- [UI 组件族](../../subsystems/ui-components.md)
