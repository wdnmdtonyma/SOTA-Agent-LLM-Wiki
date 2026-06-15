---
id: subsys.permissions
path: subsystems/permissions.md
title: 权限系统
kind: subsystem
tier: T2
status: verified
source: [utils/permissions/, types/permissions.ts]
symbols: [PermissionMode, PermissionRule, PermissionDecision, ToolPermissionContext, initialPermissionModeFromCLI, initializeToolPermissionContext, hasPermissionsToUseTool, checkRuleBasedPermissions]
related: [spine.tool-call-anatomy, subsys.hooks-feature]
evidence: explicit
updated: 2026-06-14
---

> 权限系统把 CLI/settings/policy/session rules、permission mode、tool-specific checks、hooks 和 auto classifier 合并成每次 tool use 的 allow/ask/deny decision。

## 能回答的问题

- 外部 permission modes 与内部 auto/bubble mode 的边界是什么?
- allow/deny/ask rules 从哪里进入 `ToolPermissionContext`?
- `hasPermissionsToUseTool()` 的判断顺序如何避免 ask 被 dontAsk/auto/headless 绕过?
- auto mode 如何处理 acceptEdits fast path、safe allowlist、classifier unavailable、PowerShell?
- bypassPermissions 和 auto mode 的 gate 如何在启动时与运行中被关闭?

## 职责边界

权限系统负责构造和更新 `ToolPermissionContext`, 对单次 tool use 产生 `PermissionDecision`, 并在 prompt 不可用或 auto mode 下决定 fallback; 它不执行工具, 也不解析 shell 语义本身。shell 语义和 read-only 校验由 [Shell 与命令解析](shell-parsing.md) 提供, 工具调度由 [Tool call anatomy](../spine/tool-call-anatomy.md) 消费权限结果。[E: types/permissions.ts:427][E: utils/permissions/permissionSetup.ts:689][E: utils/permissions/permissions.ts:473][I]

权限判断是分层的: 启动时合成 mode/rules/context, 工具调用时先看 blanket deny/ask 和 tool-specific check, 最后由 mode 变换 ask decision 或触发 classifier。[E: utils/permissions/permissionSetup.ts:978][E: utils/permissions/permissions.ts:1184][E: utils/permissions/permissions.ts:1215][E: utils/permissions/permissions.ts:1216][E: utils/permissions/permissions.ts:508][E: utils/permissions/permissions.ts:521][E: utils/permissions/permissions.ts:522]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `types/permissions.ts` | 定义 permission modes、rules、updates、decisions、decision reasons、classifier result 和类型版 `ToolPermissionContext`。[E: types/permissions.ts:16][E: types/permissions.ts:28][E: types/permissions.ts:44][E: types/permissions.ts:67][E: types/permissions.ts:174][E: types/permissions.ts:271][E: types/permissions.ts:346][E: types/permissions.ts:427] |
| `utils/permissions/PermissionMode.ts` | mode 的 UI/external 映射、external guard 和 string parser。[E: utils/permissions/PermissionMode.ts:42][E: utils/permissions/PermissionMode.ts:80][E: utils/permissions/PermissionMode.ts:97][E: utils/permissions/PermissionMode.ts:111][E: utils/permissions/PermissionMode.ts:117] |
| `utils/permissions/PermissionUpdate.ts` | 把 permission prompt 的 setMode/addRules update 应用到 context, 并按 destination 判断是否持久化。[E: utils/permissions/PermissionUpdate.ts:55][E: utils/permissions/PermissionUpdate.ts:69][E: utils/permissions/PermissionUpdate.ts:196][E: utils/permissions/PermissionUpdate.ts:208][E: utils/permissions/PermissionUpdate.ts:222] |
| `utils/permissions/permissionSetup.ts` | 从 CLI/settings/policy/disk rules 构造初始 context, 处理 bypass/auto gates 和 dangerous rule stripping。[E: utils/permissions/permissionSetup.ts:689][E: utils/permissions/permissionSetup.ts:932][E: utils/permissions/permissionSetup.ts:946][E: utils/permissions/permissionSetup.ts:971][E: utils/permissions/permissionSetup.ts:978] |
| `utils/permissions/permissions.ts` | runtime permission decision engine, 包含 rule getters、tool permission wrapper、dontAsk/auto 变换和 classifier path。[E: utils/permissions/permissions.ts:122][E: utils/permissions/permissions.ts:213][E: utils/permissions/permissions.ts:287][E: utils/permissions/permissions.ts:473][E: utils/permissions/permissions.ts:521][E: utils/permissions/permissions.ts:522] |
| `utils/permissions/filesystem.ts` | 文件读写权限、安全路径和内部可读/可写 carve-outs。[E: utils/permissions/filesystem.ts:955][E: utils/permissions/filesystem.ts:1030][E: utils/permissions/filesystem.ts:1205][E: utils/permissions/filesystem.ts:1554][E: utils/permissions/filesystem.ts:1704] |

## 数据模型

`EXTERNAL_PERMISSION_MODES` 暴露 `acceptEdits`、`bypassPermissions`、`default`、`dontAsk`、`plan`; 内部 `PermissionMode` 在 external union 上扩展 `auto` 和 `bubble`, 其中 runtime validation set 只有在 `TRANSCRIPT_CLASSIFIER` feature 打开时才包含 `auto`。[E: types/permissions.ts:17][E: types/permissions.ts:18][E: types/permissions.ts:19][E: types/permissions.ts:20][E: types/permissions.ts:21][E: types/permissions.ts:28][E: types/permissions.ts:33][E: types/permissions.ts:35]

`PermissionRule` 由 source、behavior 和 `{toolName, ruleContent?}` 组成; source 可以来自 user/project/local/flag/policy/CLI/command/session。[E: types/permissions.ts:55][E: types/permissions.ts:56][E: types/permissions.ts:57][E: types/permissions.ts:58][E: types/permissions.ts:59][E: types/permissions.ts:60][E: types/permissions.ts:61][E: types/permissions.ts:62][E: types/permissions.ts:67][E: types/permissions.ts:75]

`PermissionDecision` 是 allow、ask、deny union: allow 可携带 updated input 和 feedback/content blocks, ask 可携带 message、suggestions、blocked path、metadata、pending classifier check, deny 必须包含 message 与 decision reason。[E: types/permissions.ts:177][E: types/permissions.ts:178][E: types/permissions.ts:182][E: types/permissions.ts:183][E: types/permissions.ts:203][E: types/permissions.ts:206][E: types/permissions.ts:207][E: types/permissions.ts:208][E: types/permissions.ts:220][E: types/permissions.ts:232][E: types/permissions.ts:233][E: types/permissions.ts:234]

`PermissionDecisionReason` 明确区分 rule、mode、subcommand results、permission prompt tool、hook、async agent、sandbox override、classifier、working dir、safety check 和 other; safety check 还标出是否 classifier-approvable。[E: types/permissions.ts:273][E: types/permissions.ts:277][E: types/permissions.ts:281][E: types/permissions.ts:285][E: types/permissions.ts:290][E: types/permissions.ts:296][E: types/permissions.ts:300][E: types/permissions.ts:304][E: types/permissions.ts:309][E: types/permissions.ts:313][E: types/permissions.ts:319][E: types/permissions.ts:322]

`ToolPermissionContext` 以 mode、additional working dirs、always allow/deny/ask rules、bypass availability、dangerous rules stripping、prompt avoidance、pre-plan mode 等字段承载会话权限状态。[E: types/permissions.ts:428][E: types/permissions.ts:429][E: types/permissions.ts:433][E: types/permissions.ts:434][E: types/permissions.ts:435][E: types/permissions.ts:436][E: types/permissions.ts:437][E: types/permissions.ts:438][E: types/permissions.ts:440]

## 控制流

1. `initialPermissionModeFromCLI()` 按 `--dangerously-skip-permissions`、`--permission-mode`、settings defaultMode 的优先级生成候选 modes, 再过滤被 org gate 或 settings 禁用的 bypass mode, 无可用 mode 时回到 default。[E: utils/permissions/permissionSetup.ts:689][E: utils/permissions/permissionSetup.ts:725][E: utils/permissions/permissionSetup.ts:728][E: utils/permissions/permissionSetup.ts:743][E: utils/permissions/permissionSetup.ts:778][E: utils/permissions/permissionSetup.ts:791][E: utils/permissions/permissionSetup.ts:799]
2. `initializeToolPermissionContext()` 计算 bypass mode 是否可用、读取磁盘 rules、识别 ant 环境中过宽 shell allow rules 和 auto mode dangerous permissions, 然后把 CLI allow/deny rules 与 disk rules 合并进 context。[E: utils/permissions/permissionSetup.ts:939][E: utils/permissions/permissionSetup.ts:946][E: utils/permissions/permissionSetup.ts:954][E: utils/permissions/permissionSetup.ts:955][E: utils/permissions/permissionSetup.ts:956][E: utils/permissions/permissionSetup.ts:971][E: utils/permissions/permissionSetup.ts:978]
3. `applyPermissionUpdate()` 对 `setMode` 直接替换 context mode, 对 `addRules` 根据 behavior 写入 `alwaysAllowRules`、`alwaysDenyRules` 或 `alwaysAskRules`; `applyPermissionUpdates()` 按数组顺序串行应用。[E: utils/permissions/PermissionUpdate.ts:55][E: utils/permissions/PermissionUpdate.ts:66][E: utils/permissions/PermissionUpdate.ts:78][E: utils/permissions/PermissionUpdate.ts:87][E: utils/permissions/PermissionUpdate.ts:89][E: utils/permissions/PermissionUpdate.ts:196]
4. `hasPermissionsToUseTool()` 先调用 inner engine, allow 时重置 auto mode denial tracking; ask 时再应用 dontAsk 或 auto mode 变换。[E: utils/permissions/permissions.ts:473][E: utils/permissions/permissions.ts:480][E: utils/permissions/permissions.ts:486][E: utils/permissions/permissions.ts:496][E: utils/permissions/permissions.ts:497][E: utils/permissions/permissions.ts:505][E: utils/permissions/permissions.ts:521][E: utils/permissions/permissions.ts:522]
5. `checkRuleBasedPermissions()` 的 rule pass 先处理 blanket deny, 再处理 blanket ask, 然后调用 tool 的 `inputSchema.parse()` 与 `tool.checkPermissions()`; tool-specific deny、content ask rule 和 safety check 会直接返回。[E: utils/permissions/permissions.ts:1071][E: utils/permissions/permissions.ts:1079][E: utils/permissions/permissions.ts:1092][E: utils/permissions/permissions.ts:1119][E: utils/permissions/permissions.ts:1120][E: utils/permissions/permissions.ts:1130][E: utils/permissions/permissions.ts:1137][E: utils/permissions/permissions.ts:1148]
6. runtime inner engine 也先查 blanket deny/ask, 再进入 tool-specific permission check, 后续再处理 hook、mode 和 prompt path。[E: utils/permissions/permissions.ts:1158][E: utils/permissions/permissions.ts:1171][E: utils/permissions/permissions.ts:1184][E: utils/permissions/permissions.ts:1216][E: utils/permissions/permissions.ts:1268][E: utils/permissions/permissions.ts:1300][E: utils/permissions/permissions.ts:932][E: utils/permissions/permissions.ts:945]
7. auto mode 只在 `TRANSCRIPT_CLASSIFIER` 且 mode 为 `auto` 或 plan+auto-active 时接管 ask decision; non-classifier-approvable safety check 直接保留 ask, interactive-required tool 也不走 classifier。[E: utils/permissions/permissions.ts:521][E: utils/permissions/permissions.ts:522][E: utils/permissions/permissions.ts:523][E: utils/permissions/permissions.ts:533][E: utils/permissions/permissions.ts:534][E: utils/permissions/permissions.ts:547][E: utils/permissions/permissions.ts:549]
8. auto mode 对 PowerShell 有专门 guard: 若工具名为 PowerShell 且 `POWERSHELL_AUTO_MODE` 未开, headless/no prompt 场景返回 deny, 否则保留 ask 给用户显式批准。[E: utils/permissions/permissions.ts:573][E: utils/permissions/permissions.ts:574][E: utils/permissions/permissions.ts:576][E: utils/permissions/permissions.ts:587][E: utils/permissions/permissions.ts:590]
9. auto mode 在 classifier 前先尝试 acceptEdits fast path, 但跳过 Agent 和 REPL; safe allowlisted tools 也直接 allow, 其它 action 通过 `formatActionForClassifier()` 和 `classifyYoloAction()` 进入 classifier。[E: utils/permissions/permissions.ts:601][E: utils/permissions/permissions.ts:602][E: utils/permissions/permissions.ts:603][E: utils/permissions/permissions.ts:607][E: utils/permissions/permissions.ts:620][E: utils/permissions/permissions.ts:660][E: utils/permissions/permissions.ts:679][E: utils/permissions/permissions.ts:689][E: utils/permissions/permissions.ts:693]
10. classifier blocked 时会处理 transcript too long、unavailable fail-closed/fail-open、denial tracking、denial limit 和最终 deny; classifier not blocked 时返回 allow, reason 标为 `classifier: auto-mode`。[E: utils/permissions/permissions.ts:818][E: utils/permissions/permissions.ts:822][E: utils/permissions/permissions.ts:845][E: utils/permissions/permissions.ts:858][E: utils/permissions/permissions.ts:860][E: utils/permissions/permissions.ts:875][E: utils/permissions/permissions.ts:879][E: utils/permissions/permissions.ts:890][E: utils/permissions/permissions.ts:904][E: utils/permissions/permissions.ts:906][E: utils/permissions/permissions.ts:919][E: utils/permissions/permissions.ts:922][E: utils/permissions/permissions.ts:923]

## 设计动机与权衡

bypassPermissions 不是单一 flag: 初始 mode 选择、可用性字段、异步 gate 检查和 disabled context 都存在, 因为 org policy/settings 可能在启动前后不同时间可用。[E: utils/permissions/permissionSetup.ts:939][E: utils/permissions/permissionSetup.ts:1371][E: utils/permissions/permissionSetup.ts:1393][E: utils/permissions/permissionSetup.ts:1403][E: utils/permissions/permissionSetup.ts:1411][E: utils/permissions/permissionSetup.ts:1419][I]

auto mode 与 plan mode 有耦合: `prepareContextForPlanMode()` 会保存 `prePlanMode`, 并在用户 opt-in 且 gate 允许时让 auto semantics 在 plan mode 中保持活跃, 否则会恢复 dangerous permissions 并退出 auto active 状态。[E: utils/permissions/permissionSetup.ts:1446][E: utils/permissions/permissionSetup.ts:1462][E: utils/permissions/permissionSetup.ts:1468][E: utils/permissions/permissionSetup.ts:1471][E: utils/permissions/permissionSetup.ts:1473][E: utils/permissions/permissionSetup.ts:1476][E: utils/permissions/permissionSetup.ts:1480][E: utils/permissions/permissionSetup.ts:1483][E: utils/permissions/permissionSetup.ts:1484]

权限系统把 `dontAsk` 转换放在 inner result 之后, 这样 tool-specific deny、safety check 和 hook 结果仍能先产生更具体的 reason, ask 才被 dontAsk 统一变成 deny。[E: utils/permissions/permissions.ts:480][E: utils/permissions/permissions.ts:508][E: utils/permissions/permissions.ts:510][I]

## Gotcha

- permission rules 会在 tool visible filtering、runtime rule matching 和 tool-specific permission 中分层出现; blanket deny 影响工具可见性, blanket allow/deny 影响 runtime rule match, content-specific rule 由 tool `checkPermissions()` 返回。[E: tools.ts:262][E: utils/permissions/permissions.ts:275][E: utils/permissions/permissions.ts:280][E: utils/permissions/permissions.ts:287][E: utils/permissions/permissions.ts:1120][E: utils/permissions/permissions.ts:1284][I]
- `supportsPersistence()` 只允许 local/user/project settings destination; session、command、cliArg 等 update 不会被 `persistPermissionUpdate()` 写盘。[E: utils/permissions/PermissionUpdate.ts:208][E: utils/permissions/PermissionUpdate.ts:212][E: utils/permissions/PermissionUpdate.ts:223]
- `createReadRuleSuggestion('/')` 返回 undefined, root directory 不会被建议成 read allow rule。[E: utils/permissions/PermissionUpdate.ts:361][E: utils/permissions/PermissionUpdate.ts:369][E: utils/permissions/PermissionUpdate.ts:370]

## Sources

- `types/permissions.ts`
- `Tool.ts`
- `tools.ts`
- `utils/permissions/PermissionMode.ts`
- `utils/permissions/PermissionUpdate.ts`
- `utils/permissions/permissionSetup.ts`
- `utils/permissions/permissions.ts`
- `utils/permissions/filesystem.ts`

## 相关

- [Tool call anatomy](../spine/tool-call-anatomy.md)
- [工具系统机制](tool-system.md)
- [Shell 与命令解析](shell-parsing.md)
