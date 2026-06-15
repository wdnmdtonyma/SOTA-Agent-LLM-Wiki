---
id: rhook.config-state
title: React hooks catalog: config-state
kind: reference
tier: T3
source: [hooks/useApiKeyVerification.ts, hooks/useDynamicConfig.ts, hooks/useMainLoopModel.ts, hooks/useMergedClients.ts, hooks/useMergedCommands.ts, hooks/useMergedTools.ts, hooks/useSettings.ts, hooks/useSettingsChange.ts, hooks/useSkillsChange.ts]
symbols: [useApiKeyVerification, useDynamicConfig, useMainLoopModel, mergeClients, useMergedClients, useMergedCommands, useMergedTools, useSettings, useSettingsChange, useSkillsChange]
related: [subsys.config-settings, subsys.command-system, subsys.tool-system, subsys.skills]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.config-state` catalog 收录 settings、dynamic config、main-loop model、merged MCP clients、merged commands、merged tools 和 skills refresh hooks；这个 category 边界来自导出名与 settings/config 依赖的人工归纳 [I]。

## 能回答的问题

- 哪些 hooks 读取或监听 settings 与 dynamic config?
- merged clients、commands、tools 的 hook 入口在哪里?
- API key verification 和 main-loop model 的 hook 签名是什么?
- skills change 相关 hook 属于哪个源码文件?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useApiKeyVerification` | `hooks/useApiKeyVerification.ts` | 管理 API key verification 的状态与错误 [I]。 | `useApiKeyVerification(): ApiKeyVerificationResult` [E: hooks/useApiKeyVerification.ts:24] |
| `useDynamicConfig` | `hooks/useDynamicConfig.ts` | 按 config name 读取动态配置值并提供默认值 fallback [I]。 | `useDynamicConfig<T>(configName, defaultValue): T` [E: hooks/useDynamicConfig.ts:8] |
| `useMainLoopModel` | `hooks/useMainLoopModel.ts` | 返回 main loop 使用的 `ModelName` [I]。 | `useMainLoopModel(): ModelName` [E: hooks/useMainLoopModel.ts:13] |
| `mergeClients`; `useMergedClients` | `hooks/useMergedClients.ts` | 合并 MCP clients 并提供 React hook 入口 [I]。 | `mergeClients(...)` [E: hooks/useMergedClients.ts:5]; `useMergedClients(...)` [E: hooks/useMergedClients.ts:15] |
| `useMergedCommands` | `hooks/useMergedCommands.ts` | 合并 command sources 后返回 commands [I]。 | `useMergedCommands(...)` [E: hooks/useMergedCommands.ts:5] |
| `useMergedTools` | `hooks/useMergedTools.ts` | 合并 base tools 与动态 tool sources [I]。 | `useMergedTools(...)` [E: hooks/useMergedTools.ts:20] |
| `useSettings` | `hooks/useSettings.ts` | 从 app state 暴露 readonly settings [I]。 | `useSettings(): ReadonlySettings` [E: hooks/useSettings.ts:15] |
| `useSettingsChange` | `hooks/useSettingsChange.ts` | 注册 settings change callback [I]。 | `useSettingsChange(...)` [E: hooks/useSettingsChange.ts:7] |
| `useSkillsChange` | `hooks/useSkillsChange.ts` | 注册 skills change callback 并把变更接入 React lifecycle [I]。 | `useSkillsChange(...)` [E: hooks/useSkillsChange.ts:24] |

## Sources

- `hooks/useApiKeyVerification.ts`
- `hooks/useDynamicConfig.ts`
- `hooks/useMainLoopModel.ts`
- `hooks/useMergedClients.ts`
- `hooks/useMergedCommands.ts`
- `hooks/useMergedTools.ts`
- `hooks/useSettings.ts`
- `hooks/useSettingsChange.ts`
- `hooks/useSkillsChange.ts`

## 相关

- [配置与设置](../../subsystems/config-settings.md)
- [命令系统机制](../../subsystems/command-system.md)
- [工具系统机制](../../subsystems/tool-system.md)
- [Skills](../../subsystems/skills.md)
