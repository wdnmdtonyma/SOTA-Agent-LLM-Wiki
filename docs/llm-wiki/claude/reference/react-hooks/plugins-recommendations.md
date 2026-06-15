---
id: rhook.plugins-recommendations
title: React hooks catalog: plugins-recommendations
kind: reference
tier: T3
source: [hooks/useClaudeCodeHintRecommendation.tsx, hooks/useLspPluginRecommendation.tsx, hooks/useManagePlugins.ts, hooks/useOfficialMarketplaceNotification.tsx, hooks/usePluginRecommendationBase.tsx]
symbols: [useClaudeCodeHintRecommendation, useLspPluginRecommendation, useManagePlugins, useOfficialMarketplaceNotification, usePluginRecommendationBase]
related: [subsys.plugins, subsys.skills, subsys.lsp]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.plugins-recommendations` catalog 收录 plugin management、plugin marketplace notification、LSP plugin recommendation 和 Claude Code hint recommendation hooks；这个 category 边界来自 plugin/recommendation/marketplace 导出名的人工归纳 [I]。

## 能回答的问题

- plugin management hook 的源码入口在哪里?
- LSP plugin recommendation 和基础 recommendation hook 分别在哪些文件?
- official marketplace notification hook 是否属于 plugin recommendation 相关表?
- Claude Code hint recommendation 的关键签名是什么?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useClaudeCodeHintRecommendation` | `hooks/useClaudeCodeHintRecommendation.tsx` | 生成或展示 Claude Code hint recommendation 状态 [I]。 | `useClaudeCodeHintRecommendation()` [E: hooks/useClaudeCodeHintRecommendation.tsx:24] |
| `useLspPluginRecommendation` | `hooks/useLspPluginRecommendation.tsx` | 管理 LSP plugin recommendation 状态 [I]。 | `useLspPluginRecommendation()` [E: hooks/useLspPluginRecommendation.tsx:41] |
| `useManagePlugins` | `hooks/useManagePlugins.ts` | 为 plugin management UI 或 command 提供 hook 状态和 actions [I]。 | `useManagePlugins(...)` [E: hooks/useManagePlugins.ts:37] |
| `useOfficialMarketplaceNotification` | `hooks/useOfficialMarketplaceNotification.tsx` | 处理 official marketplace 相关提示逻辑 [I]。 | `useOfficialMarketplaceNotification()` [E: hooks/useOfficialMarketplaceNotification.tsx:12] |
| `usePluginRecommendationBase` | `hooks/usePluginRecommendationBase.tsx` | 提供 plugin recommendation 的共享基础状态 [I]。 | `usePluginRecommendationBase()` [E: hooks/usePluginRecommendationBase.tsx:24] |

## Sources

- `hooks/useClaudeCodeHintRecommendation.tsx`
- `hooks/useLspPluginRecommendation.tsx`
- `hooks/useManagePlugins.ts`
- `hooks/useOfficialMarketplaceNotification.tsx`
- `hooks/usePluginRecommendationBase.tsx`

## 相关

- [Plugins](../../subsystems/plugins.md)
- [Skills](../../subsystems/skills.md)
- [LSP 集成](../../subsystems/lsp.md)
