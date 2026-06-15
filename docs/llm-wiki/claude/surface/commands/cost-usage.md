---
id: cmd.cost-usage
title: Cost and usage command catalog
kind: command
tier: T1
source: [commands.ts, types/command.ts, commands/cost/index.ts, commands/usage/index.ts, commands/stats/index.ts, commands/extra-usage/index.ts, commands/rate-limit-options/index.ts, commands/insights.ts]
symbols: [cost, usage, stats, extraUsage, extraUsageNonInteractive, rateLimitOptions, usageReport]
related: [subsys.command-system, subsys.cost-usage, group.commands]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Cost and usage command catalog 覆盖当前 session 成本、套餐用量、统计报告、extra usage 和 rate-limit 内部入口。

## 能回答的问题

- `/cost`、`/usage`、`/stats` 的 command kind 有何不同？
- `/extra-usage` 为什么有 interactive 和 non-interactive 两个同名 command object？
- `/rate-limit-options` 为什么隐藏？
- `/insights` 为什么在 `commands.ts` 里有 lazy shim？
- `/usage` 的 availability 限制是什么？

## 清单边界

本节点只覆盖 `cmd.cost-usage` 分配的 6 个命令。`PromptCommand` 明确包含 `progressMessage`、`contentLength`、`source` 和 `getPromptForCommand` [E: types/command.ts:27] [E: types/command.ts:28] [E: types/command.ts:32] [E: types/command.ts:53]；`LocalCommand` 通过 `supportsNonInteractive` 和 `load()` 延迟加载实现 [E: types/command.ts:76] [E: types/command.ts:77]。表中 `未声明` 表示当前 command object 没有显式字段，属于局部读源结论 [I]。

## Catalog

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
|---|---|---|---|---|---|
| `/cost` | 未声明 [I] | `local` [E: commands/cost/index.ts:9] | `COMMANDS` builtin entry [E: commands.ts:273]; ant 用户不隐藏，其他 claude.ai subscriber 隐藏 [E: commands/cost/index.ts:14] [E: commands/cost/index.ts:15] [E: commands/cost/index.ts:17] | 未声明 [I] | 显示当前 session 的 total cost 和 duration [E: commands/cost/index.ts:11]。 |
| `/usage` | 未声明 [I] | `local-jsx` [E: commands/usage/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:317]; `availability: ['claude-ai']` [E: commands/usage/index.ts:7] | 未声明 [I] | 显示 plan usage limits [E: commands/usage/index.ts:6]。 |
| `/stats` | 未声明 [I] | `local-jsx` [E: commands/stats/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:301] | 未声明 [I] | 显示 Claude Code usage statistics and activity [E: commands/stats/index.ts:6]。 |
| `/extra-usage` | 未声明 [I] | `local-jsx` interactive variant [E: commands/extra-usage/index.ts:14] + `local` non-interactive variant [E: commands/extra-usage/index.ts:22] | 两个 command objects 都进入 `COMMANDS` [E: commands.ts:314] [E: commands.ts:315]; env disable 或 provisioning 不允许时 helper 返回 false，两个 variant 的 `isEnabled` 都依赖该 helper [E: commands/extra-usage/index.ts:7] [E: commands/extra-usage/index.ts:8] [E: commands/extra-usage/index.ts:10] [E: commands/extra-usage/index.ts:17] [E: commands/extra-usage/index.ts:26] | 未声明 [I] | 配置 limits hit 后继续工作的 extra usage [E: commands/extra-usage/index.ts:16] [E: commands/extra-usage/index.ts:25]。 |
| `/rate-limit-options` | 未声明 [I] | `local-jsx` [E: commands/rate-limit-options/index.ts:5] | `COMMANDS` builtin entry [E: commands.ts:316]; 仅 claude.ai subscriber 启用且 hidden [E: commands/rate-limit-options/index.ts:9] [E: commands/rate-limit-options/index.ts:10] [E: commands/rate-limit-options/index.ts:13] [E: commands/rate-limit-options/index.ts:15] | 未声明 [I] | rate limit reached 时显示选项 [E: commands/rate-limit-options/index.ts:7]。 |
| `/insights` | 未声明 [I] | `prompt` lazy shim [E: commands.ts:191] | `COMMANDS` builtin entry [E: commands.ts:318]; shim 的 `source` 是 `builtin` [E: commands.ts:196] | 任意 args 传给真实 `commands/insights.js` [E: commands.ts:197] [E: commands.ts:198] [E: commands.ts:200] | 生成分析 Claude Code sessions 的 report [E: commands.ts:193]。 |

## 复杂命令深挖

`/insights` 在 `commands.ts` 中以轻量 `usageReport` shim 注册，真实 `commands/insights.js` 只在 `getPromptForCommand` 执行时动态导入 [E: commands.ts:190] [E: commands.ts:197] [E: commands.ts:198]。真实 command 仍是 `prompt`、`name: 'insights'`、`source: 'builtin'` [E: commands/insights.ts:3040] [E: commands/insights.ts:3041] [E: commands/insights.ts:3045]。

`/insights` 的真实执行会过滤 substantive sessions [E: commands/insights.ts:2927]，并把 facet extraction 限制为最多 50 个待提取 sessions [E: commands/insights.ts:2932] [E: commands/insights.ts:2946]。facet extraction 分批并发处理，批大小由 `CONCURRENCY = 50` 控制 [E: commands/insights.ts:2953] [E: commands/insights.ts:2954]，批内用 `Promise.all` 并发执行 [E: commands/insights.ts:2956] [E: commands/insights.ts:2957]，之后 aggregate data、生成 parallel insights、生成 HTML report 并写到 `report.html` [E: commands/insights.ts:2994] [E: commands/insights.ts:2998] [E: commands/insights.ts:3001] [E: commands/insights.ts:3010] [E: commands/insights.ts:3011]。

`/extra-usage` 的同名双实现用于区分交互式和 non-interactive session：interactive variant 要求 `!getIsNonInteractiveSession()` [E: commands/extra-usage/index.ts:17]，non-interactive variant 要求 `getIsNonInteractiveSession()` 且 `supportsNonInteractive: true` [E: commands/extra-usage/index.ts:24] [E: commands/extra-usage/index.ts:26]。

## Sources

- commands.ts
- types/command.ts
- commands/cost/index.ts
- commands/usage/index.ts
- commands/stats/index.ts
- commands/extra-usage/index.ts
- commands/rate-limit-options/index.ts
- commands/insights.ts

## 相关

- [命令系统机制](../../subsystems/command-system.md)
- [成本与用量](../../subsystems/cost-usage.md)
