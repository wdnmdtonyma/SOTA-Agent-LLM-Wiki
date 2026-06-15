---
id: ui.trust-dialog
title: UI TrustDialog 组件族
kind: subsystem
tier: T2
source: [components/TrustDialog/]
symbols: [TrustDialog, hasHooks, getHooksSources, hasBashPermission, getBashPermissionSources, hasDangerousEnvVars]
related: [subsys.ui-components, subsys.permissions, subsys.config-settings, subsys.mcp]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.trust-dialog` 是访问 workspace 前的 trust gate,把 project MCP、hooks、bash permissions、credential helpers 和 env 风险汇总成一个确认对话框。[I]

## 能回答的问题
- TrustDialog 检查哪些风险入口?
- 用户 accept/reject 后写哪里?
- trust prompt 怎样和 MCP/settings/permission 关联?

## 族干什么
`TrustDialog` 读取 project MCP config 并解构 `servers`;`hasMcpServers` 来自 project server name 数量。[E: components/TrustDialog/TrustDialog.tsx:31][E: components/TrustDialog/TrustDialog.tsx:37][E: components/TrustDialog/TrustDialog.tsx:41][E: components/TrustDialog/TrustDialog.tsx:46] 它还收集 hooks、bash permission、API key helper、AWS/GCP command、OTEL helper 和 dangerous env var sources。[E: components/TrustDialog/TrustDialog.tsx:49][E: components/TrustDialog/TrustDialog.tsx:58][E: components/TrustDialog/TrustDialog.tsx:66][E: components/TrustDialog/TrustDialog.tsx:75][E: components/TrustDialog/TrustDialog.tsx:84][E: components/TrustDialog/TrustDialog.tsx:93][E: components/TrustDialog/TrustDialog.tsx:102] UI 文案说明 Claude Code 可读写执行当前文件夹,并渲染 trust/exit options、footer 和 `PermissionDialog` title。[E: components/TrustDialog/TrustDialog.tsx:209][E: components/TrustDialog/TrustDialog.tsx:228][E: components/TrustDialog/TrustDialog.tsx:231][E: components/TrustDialog/TrustDialog.tsx:240][E: components/TrustDialog/TrustDialog.tsx:248][E: components/TrustDialog/TrustDialog.tsx:257]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `TrustDialog` | `components/TrustDialog/TrustDialog.tsx` | workspace trust confirmation,accept 时记录 analytics,home dir 写 session trust,非 home dir 写 project trust,exit 时 shutdown。[E: components/TrustDialog/TrustDialog.tsx:257][E: components/TrustDialog/TrustDialog.tsx:163][E: components/TrustDialog/TrustDialog.tsx:162][E: components/TrustDialog/TrustDialog.tsx:174][E: components/TrustDialog/TrustDialog.tsx:175][E: components/TrustDialog/TrustDialog.tsx:176][E: components/TrustDialog/TrustDialog.tsx:177][E: components/TrustDialog/TrustDialog.tsx:275][E: components/TrustDialog/TrustDialog.tsx:158][E: components/TrustDialog/TrustDialog.tsx:159] |
| `hasHooks` | `components/TrustDialog/utils.ts` | 判断 status line、file suggestion 或 hooks 是否存在。[E: components/TrustDialog/utils.ts:12][E: components/TrustDialog/utils.ts:15][E: components/TrustDialog/utils.ts:18][E: components/TrustDialog/utils.ts:22] |
| `getHooksSources` | `components/TrustDialog/utils.ts` | 把 project/local hook settings 映射为 `.claude/settings.json` 或 `.claude/settings.local.json`。[E: components/TrustDialog/utils.ts:32][E: components/TrustDialog/utils.ts:34][E: components/TrustDialog/utils.ts:37][E: components/TrustDialog/utils.ts:39][E: components/TrustDialog/utils.ts:42] |
| `hasBashPermission` | `components/TrustDialog/utils.ts` | 检测 allow rule 的 tool name 是否是 `Bash` 或 `Bash(...)`。[E: components/TrustDialog/utils.ts:48][E: components/TrustDialog/utils.ts:49][E: components/TrustDialog/utils.ts:50] |
| `getBashPermissionSources` | `components/TrustDialog/utils.ts` | 把 project/local bash allow rules 映射为 settings source paths。[E: components/TrustDialog/utils.ts:61][E: components/TrustDialog/utils.ts:62][E: components/TrustDialog/utils.ts:63][E: components/TrustDialog/utils.ts:66][E: components/TrustDialog/utils.ts:67][E: components/TrustDialog/utils.ts:68][E: components/TrustDialog/utils.ts:71] |
| `hasDangerousEnvVars` | `components/TrustDialog/utils.ts` | 用 `SAFE_ENV_VARS` 判断 settings env 中是否有非 safe env var。[E: components/TrustDialog/utils.ts:219][E: components/TrustDialog/utils.ts:222][E: components/TrustDialog/utils.ts:223] |

## 巨型组件深挖
`TrustDialog` 的风险聚合跨多个入口:slash commands 和 skills 先通过 `commands?.some(_temp2/_temp4)` 生成 Bash execution flags,再与 settings 来源合并为 `hasAnyBashExecution`。[E: components/TrustDialog/TrustDialog.tsx:111][E: components/TrustDialog/TrustDialog.tsx:120][E: components/TrustDialog/TrustDialog.tsx:127] command helper 本身分别识别 skills/plugin 来源、commands_DEPRECATED 来源,并判断 `allowedTools` 是否包含 Bash tool name/prefix。[E: components/TrustDialog/TrustDialog.tsx:279][E: components/TrustDialog/TrustDialog.tsx:282][E: components/TrustDialog/TrustDialog.tsx:285][E: components/TrustDialog/TrustDialog.tsx:288] accept analytics 同时记录 MCP、hooks、bash execution、credential helper 和 env flags。[E: components/TrustDialog/TrustDialog.tsx:163][E: components/TrustDialog/TrustDialog.tsx:165][E: components/TrustDialog/TrustDialog.tsx:166][E: components/TrustDialog/TrustDialog.tsx:167][E: components/TrustDialog/TrustDialog.tsx:168][E: components/TrustDialog/TrustDialog.tsx:172]

## 与 hooks/AppState 接线
该族主要通过 config/settings/MCP helper 计算 trust facts,没有单行源码能直接证明“没有 AppState 接线”,因此这是代码阅读层面的结论。[I] 已接受 trust 时组件直接 `setTimeout(onDone)` 并返回 `null`;accept 后 home dir 写 session trust,非 home dir 写 current project config 并在 helper 中设置 accepted flag。[E: components/TrustDialog/TrustDialog.tsx:199][E: components/TrustDialog/TrustDialog.tsx:200][E: components/TrustDialog/TrustDialog.tsx:201][E: components/TrustDialog/TrustDialog.tsx:162][E: components/TrustDialog/TrustDialog.tsx:174][E: components/TrustDialog/TrustDialog.tsx:175][E: components/TrustDialog/TrustDialog.tsx:176][E: components/TrustDialog/TrustDialog.tsx:177][E: components/TrustDialog/TrustDialog.tsx:275]

## Sources
- components/TrustDialog/TrustDialog.tsx
- components/TrustDialog/utils.ts

## 相关
- `subsys.permissions` 说明 bash/file/tool permission 的 policy 含义。
- `subsys.mcp` 说明 MCP servers 和 tools 的 runtime 面。
- `subsys.config-settings` 说明 settings source 和 project/local settings。
