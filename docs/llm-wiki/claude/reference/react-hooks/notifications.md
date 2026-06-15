---
id: rhook.notifications
title: React hooks catalog: notifications
kind: reference
tier: T3
source: [hooks/notifs/useAutoModeUnavailableNotification.ts, hooks/notifs/useCanSwitchToExistingSubscription.tsx, hooks/notifs/useDeprecationWarningNotification.tsx, hooks/notifs/useFastModeNotification.tsx, hooks/notifs/useIDEStatusIndicator.tsx, hooks/notifs/useInstallMessages.tsx, hooks/notifs/useLspInitializationNotification.tsx, hooks/notifs/useMcpConnectivityStatus.tsx, hooks/notifs/useModelMigrationNotifications.tsx, hooks/notifs/useNpmDeprecationNotification.tsx, hooks/notifs/usePluginAutoupdateNotification.tsx, hooks/notifs/usePluginInstallationStatus.tsx, hooks/notifs/useRateLimitWarningNotification.tsx, hooks/notifs/useSettingsErrors.tsx, hooks/notifs/useStartupNotification.ts, hooks/notifs/useTeammateShutdownNotification.ts, hooks/useIssueFlagBanner.ts, hooks/useNotifyAfterTimeout.ts, hooks/useUpdateNotification.ts]
symbols: [useAutoModeUnavailableNotification, useCanSwitchToExistingSubscription, useDeprecationWarningNotification, useFastModeNotification, useIDEStatusIndicator, useInstallMessages, useLspInitializationNotification, useMcpConnectivityStatus, useModelMigrationNotifications, useNpmDeprecationNotification, usePluginAutoupdateNotification, usePluginInstallationStatus, useRateLimitWarningNotification, useSettingsErrors, useStartupNotification, useTeammateLifecycleNotification, useIssueFlagBanner, useNotifyAfterTimeout, useUpdateNotification]
related: [subsys.ui-components, subsys.plugins, subsys.mcp, subsys.lsp]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.notifications` catalog 收录 `hooks/notifs/` 下全部 use* 文件，以及根目录中以 banner、notification 或 timeout notification 为主的 notification hooks；这个 category 边界来自目录位置和导出名的人工归纳 [I]。

## 能回答的问题

- `hooks/notifs/` 下有哪些 notification hooks?
- settings errors、plugin install、MCP connectivity 和 LSP initialization notification 的入口在哪里?
- 根目录中哪些 use* 文件主要服务 notification 或 banner?
- notification 相关 hooks 的关键签名是什么?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useAutoModeUnavailableNotification` | `hooks/notifs/useAutoModeUnavailableNotification.ts` | 在 auto mode 不可用时触发一次性 notification [I]。 | `useAutoModeUnavailableNotification(): void` [E: hooks/notifs/useAutoModeUnavailableNotification.ts:19] |
| `useCanSwitchToExistingSubscription` | `hooks/notifs/useCanSwitchToExistingSubscription.tsx` | 基于 startup notification 机制提示可切换已有 subscription [I]。 | `useCanSwitchToExistingSubscription()` [E: hooks/notifs/useCanSwitchToExistingSubscription.tsx:13] |
| `useDeprecationWarningNotification` | `hooks/notifs/useDeprecationWarningNotification.tsx` | 根据 model 参数展示 deprecation warning notification [I]。 | `useDeprecationWarningNotification(model)` [E: hooks/notifs/useDeprecationWarningNotification.tsx:6] |
| `useFastModeNotification` | `hooks/notifs/useFastModeNotification.tsx` | 处理 fast mode 组织开关、overage rejection 和 cooldown notifications [I]。 | `useFastModeNotification()` [E: hooks/notifs/useFastModeNotification.tsx:12] |
| `useIDEStatusIndicator` | `hooks/notifs/useIDEStatusIndicator.tsx` | 基于 IDE status 和 IDE selection 展示 status notifications [I]。 | `useIDEStatusIndicator(t0)` [E: hooks/notifs/useIDEStatusIndicator.tsx:17] |
| `useInstallMessages` | `hooks/notifs/useInstallMessages.tsx` | 通过 startup notification 输出 install messages [I]。 | `useInstallMessages()` [E: hooks/notifs/useInstallMessages.tsx:3] |
| `useLspInitializationNotification` | `hooks/notifs/useLspInitializationNotification.tsx` | 轮询 LSP initialization 并展示失败 notification [I]。 | `useLspInitializationNotification()` [E: hooks/notifs/useLspInitializationNotification.tsx:22] |
| `useMcpConnectivityStatus` | `hooks/notifs/useMcpConnectivityStatus.tsx` | 根据 MCP client 状态展示 connectivity 或 auth notifications [I]。 | `useMcpConnectivityStatus(t0)` [E: hooks/notifs/useMcpConnectivityStatus.tsx:13] |
| `useModelMigrationNotifications` | `hooks/notifs/useModelMigrationNotifications.tsx` | 为 model migration 写入后的启动阶段展示 notification [I]。 | `useModelMigrationNotifications()` [E: hooks/notifs/useModelMigrationNotifications.tsx:35] |
| `useNpmDeprecationNotification` | `hooks/notifs/useNpmDeprecationNotification.tsx` | 通过 startup notification 展示 npm deprecation 提示 [I]。 | `useNpmDeprecationNotification()` [E: hooks/notifs/useNpmDeprecationNotification.tsx:6] |
| `usePluginAutoupdateNotification` | `hooks/notifs/usePluginAutoupdateNotification.tsx` | 在 plugins auto-updated 后展示 reload 提示 [I]。 | `usePluginAutoupdateNotification()` [E: hooks/notifs/usePluginAutoupdateNotification.tsx:14] |
| `usePluginInstallationStatus` | `hooks/notifs/usePluginInstallationStatus.tsx` | 汇总 failed plugin 或 marketplace installation 并通知用户 [I]。 | `usePluginInstallationStatus()` [E: hooks/notifs/usePluginInstallationStatus.tsx:10] |
| `useRateLimitWarningNotification` | `hooks/notifs/useRateLimitWarningNotification.tsx` | 基于 model 和 limits 状态展示 rate-limit warning notification [I]。 | `useRateLimitWarningNotification(model)` [E: hooks/notifs/useRateLimitWarningNotification.tsx:11] |
| `useSettingsErrors` | `hooks/notifs/useSettingsErrors.tsx` | 读取 settings validation errors 并展示或移除 settings notification [I]。 | `useSettingsErrors()` [E: hooks/notifs/useSettingsErrors.tsx:9] |
| `useStartupNotification` | `hooks/notifs/useStartupNotification.ts` | 把同步或异步 notification producer 包装成 mount-time notification hook [I]。 | `useStartupNotification(...)` [E: hooks/notifs/useStartupNotification.ts:19] |
| `useTeammateLifecycleNotification` | `hooks/notifs/useTeammateShutdownNotification.ts` | 为 in-process teammate spawn 和 shutdown 事件触发聚合 notification [I]。 | `useTeammateLifecycleNotification(): void` [E: hooks/notifs/useTeammateShutdownNotification.ts:54] |
| `useIssueFlagBanner` | `hooks/useIssueFlagBanner.ts` | 根据 session container 与 friction signal 状态控制 issue flag banner [I]。 | `useIssueFlagBanner(...)` [E: hooks/useIssueFlagBanner.ts:92] |
| `useNotifyAfterTimeout` | `hooks/useNotifyAfterTimeout.ts` | 在交互超过阈值后触发 timeout notification 逻辑 [I]。 | `useNotifyAfterTimeout(...)` [E: hooks/useNotifyAfterTimeout.ts:38] |
| `useUpdateNotification` | `hooks/useUpdateNotification.ts` | 根据最新版本与已通知版本决定 update notification [I]。 | `useUpdateNotification(...)` [E: hooks/useUpdateNotification.ts:16] |

## Sources

- `hooks/notifs/useAutoModeUnavailableNotification.ts`
- `hooks/notifs/useCanSwitchToExistingSubscription.tsx`
- `hooks/notifs/useDeprecationWarningNotification.tsx`
- `hooks/notifs/useFastModeNotification.tsx`
- `hooks/notifs/useIDEStatusIndicator.tsx`
- `hooks/notifs/useInstallMessages.tsx`
- `hooks/notifs/useLspInitializationNotification.tsx`
- `hooks/notifs/useMcpConnectivityStatus.tsx`
- `hooks/notifs/useModelMigrationNotifications.tsx`
- `hooks/notifs/useNpmDeprecationNotification.tsx`
- `hooks/notifs/usePluginAutoupdateNotification.tsx`
- `hooks/notifs/usePluginInstallationStatus.tsx`
- `hooks/notifs/useRateLimitWarningNotification.tsx`
- `hooks/notifs/useSettingsErrors.tsx`
- `hooks/notifs/useStartupNotification.ts`
- `hooks/notifs/useTeammateShutdownNotification.ts`
- `hooks/useIssueFlagBanner.ts`
- `hooks/useNotifyAfterTimeout.ts`
- `hooks/useUpdateNotification.ts`

## 相关

- [UI 组件族](../../subsystems/ui-components.md)
- [Plugins](../../subsystems/plugins.md)
- [MCP](../../subsystems/mcp.md)
- [LSP 集成](../../subsystems/lsp.md)
