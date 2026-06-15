---
id: rhook.async-queue-tasks
title: React hooks catalog: async-queue-tasks
kind: reference
tier: T3
source: [hooks/useCommandQueue.ts, hooks/useInboxPoller.ts, hooks/usePrStatus.ts, hooks/useQueueProcessor.ts, hooks/useRemoteSession.ts, hooks/useSSHSession.ts, hooks/useScheduledTasks.ts, hooks/useSessionBackgrounding.ts, hooks/useSwarmInitialization.ts, hooks/useTaskListWatcher.ts, hooks/useTasksV2.ts, hooks/useTeammateViewAutoExit.ts, hooks/useTeleportResume.tsx]
symbols: [useCommandQueue, useInboxPoller, usePrStatus, useQueueProcessor, useRemoteSession, useSSHSession, useScheduledTasks, useSessionBackgrounding, useSwarmInitialization, useTaskListWatcher, useTasksV2, useTasksV2WithCollapseEffect, useTeammateViewAutoExit, useTeleportResume]
related: [subsys.session-state, subsys.swarm, subsys.bridge-remote]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.async-queue-tasks` catalog 收录 command queue、polling、remote/SSH sessions、scheduled tasks、backgrounding、swarm initialization 和 task list hooks；这个 category 边界来自异步队列、poller 和 task/session 命名的人工归纳 [I]。

## 能回答的问题

- 哪些 hooks 处理 command queue 或 queue processor?
- remote session、SSH session、scheduled tasks 的 hook 入口在哪里?
- task list、TasksV2、swarm initialization 属于哪些 use* 文件?
- backgrounding 与 teammate auto-exit 的关键签名是什么?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useCommandQueue` | `hooks/useCommandQueue.ts` | 暴露当前 queued commands 的 readonly 列表 [I]。 | `useCommandQueue(): readonly QueuedCommand[]` [E: hooks/useCommandQueue.ts:13] |
| `useInboxPoller` | `hooks/useInboxPoller.ts` | 管理 inbox polling 输入参数与 lifecycle [I]。 | `useInboxPoller(...)` [E: hooks/useInboxPoller.ts:126] |
| `usePrStatus` | `hooks/usePrStatus.ts` | 轮询 PR review status 并返回 `PrStatusState` [I]。 | `usePrStatus(isLoading, enabled): PrStatusState` [E: hooks/usePrStatus.ts:35] |
| `useQueueProcessor` | `hooks/useQueueProcessor.ts` | 处理 queued commands 的消费与调度 [I]。 | `useQueueProcessor(...)` [E: hooks/useQueueProcessor.ts:28] |
| `useRemoteSession` | `hooks/useRemoteSession.ts` | 管理 remote session lifecycle 和输入参数 [I]。 | `useRemoteSession(...)` [E: hooks/useRemoteSession.ts:76] |
| `useSSHSession` | `hooks/useSSHSession.ts` | 管理 SSH session lifecycle 和输入参数 [I]。 | `useSSHSession(...)` [E: hooks/useSSHSession.ts:48] |
| `useScheduledTasks` | `hooks/useScheduledTasks.ts` | 将 scheduled tasks 接入 React lifecycle [I]。 | `useScheduledTasks(...)` [E: hooks/useScheduledTasks.ts:40] |
| `useSessionBackgrounding` | `hooks/useSessionBackgrounding.ts` | 管理 foreground/background session 切换与消息同步 [I]。 | `useSessionBackgrounding(...)` [E: hooks/useSessionBackgrounding.ts:27] |
| `useSwarmInitialization` | `hooks/useSwarmInitialization.ts` | 初始化 swarm teammate hooks 与 team context [I]。 | `useSwarmInitialization(...)` [E: hooks/useSwarmInitialization.ts:30] |
| `useTaskListWatcher` | `hooks/useTaskListWatcher.ts` | 监听 task list 变化并触发传入处理器 [I]。 | `useTaskListWatcher(...)` [E: hooks/useTaskListWatcher.ts:34] |
| `useTasksV2`; `useTasksV2WithCollapseEffect` | `hooks/useTasksV2.ts` | 暴露 TasksV2 列表，并提供带 collapse effect 的变体 [I]。 | `useTasksV2(): Task[] | undefined` [E: hooks/useTasksV2.ts:218]; `useTasksV2WithCollapseEffect(): Task[] | undefined` [E: hooks/useTasksV2.ts:236] |
| `useTeammateViewAutoExit` | `hooks/useTeammateViewAutoExit.ts` | 在 teammate view 状态变化时执行自动退出逻辑 [I]。 | `useTeammateViewAutoExit(): void` [E: hooks/useTeammateViewAutoExit.ts:11] |
| `useTeleportResume` | `hooks/useTeleportResume.tsx` | 管理 teleport resume 来源与错误状态 [I]。 | `useTeleportResume(source)` [E: hooks/useTeleportResume.tsx:15] |

## Sources

- `hooks/useCommandQueue.ts`
- `hooks/useInboxPoller.ts`
- `hooks/usePrStatus.ts`
- `hooks/useQueueProcessor.ts`
- `hooks/useRemoteSession.ts`
- `hooks/useSSHSession.ts`
- `hooks/useScheduledTasks.ts`
- `hooks/useSessionBackgrounding.ts`
- `hooks/useSwarmInitialization.ts`
- `hooks/useTaskListWatcher.ts`
- `hooks/useTasksV2.ts`
- `hooks/useTeammateViewAutoExit.ts`
- `hooks/useTeleportResume.tsx`

## 相关

- [会话持久化与状态](../../subsystems/session-state.md)
- [多 agent 与 Swarm](../../subsystems/swarm.md)
- [IDE bridge / remote / CCR](../../subsystems/bridge-remote.md)
