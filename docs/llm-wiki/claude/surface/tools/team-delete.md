---
id: tool.team-delete
path: surface/tools/team-delete.md
title: TeamDelete
kind: tool
tier: T1
status: verified
source: [tools/TeamDeleteTool/TeamDeleteTool.ts]
symbols: [TeamDeleteTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TeamDelete` 是 agent swarms 的 cleanup 工具:它在 current team context 下清理 team/task directories、注销 session cleanup、清空 teammate colors 与 leader team name,并从 app state 移除 team context 和 inbox messages。[E: tools/TeamDeleteTool/constants.ts:1][E: tools/TeamDeleteTool/TeamDeleteTool.ts:71][E: tools/TeamDeleteTool/TeamDeleteTool.ts:101][E: tools/TeamDeleteTool/TeamDeleteTool.ts:103][E: tools/TeamDeleteTool/TeamDeleteTool.ts:106][E: tools/TeamDeleteTool/TeamDeleteTool.ts:109][E: tools/TeamDeleteTool/TeamDeleteTool.ts:118]

## 能回答的问题

- `TeamDelete` 什么时候会拒绝 cleanup?
- `TeamDelete` 如何判断 active teammate?
- `TeamDelete` 清理哪些 state 与 disk resource?
- `TeamDelete` 的 agent swarms gate 与可见性条件是什么?

## 1 Identity

- Tool name: `TeamDelete`。[E: tools/TeamDeleteTool/constants.ts:1]
- `searchHint`: `disband a swarm team and clean up`。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:34]
- `description`: `Clean up team and task directories when the swarm is complete`。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:50][E: tools/TeamDeleteTool/TeamDeleteTool.ts:51]
- `maxResultSizeChars`: `100_000`。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:35]
- `userFacingName()`: 空字符串。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:38][E: tools/TeamDeleteTool/TeamDeleteTool.ts:39]
- 注册与可见性: `getAllBaseTools()` 只在 `isAgentSwarmsEnabled()` 为 true 时加入 `TeamDeleteTool`;工具自身 `isEnabled()` 也返回 `isAgentSwarmsEnabled()`。[E: tools.ts:228][E: tools.ts:229][E: tools/TeamDeleteTool/TeamDeleteTool.ts:46] ant 用户直接 enabled;external 用户需要 env/CLI opt-in 且 GrowthBook killswitch 为 true。[E: utils/agentSwarmsEnabled.ts:24][E: utils/agentSwarmsEnabled.ts:26][E: utils/agentSwarmsEnabled.ts:32][E: utils/agentSwarmsEnabled.ts:39][E: utils/agentSwarmsEnabled.ts:43]

## 2 用途定位

`TeamDelete` prompt 把该工具定义为 swarm work 完成后的 cleanup:移除 `~/.claude/teams/{team-name}/`、移除 `~/.claude/tasks/{team-name}/`、清除当前 session team context。[E: tools/TeamDeleteTool/prompt.ts:3][E: tools/TeamDeleteTool/prompt.ts:5][E: tools/TeamDeleteTool/prompt.ts:8][E: tools/TeamDeleteTool/prompt.ts:9][E: tools/TeamDeleteTool/prompt.ts:10] prompt 还说明如果 team 仍有 active members,`TeamDelete` 会失败,需要先 graceful terminate teammates。[E: tools/TeamDeleteTool/prompt.ts:12]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| 无 | `z.strictObject({})` | 否 | 空对象 | team name 从 current session 的 `appState.teamContext` 自动确定。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:21][E: tools/TeamDeleteTool/TeamDeleteTool.ts:73][E: tools/TeamDeleteTool/prompt.ts:14] | strict object 不接受额外字段。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:21] |

## 4 输出 & maxResultSizeChars

输出类型包含 `success`、`message`、可选 `team_name`。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:24][E: tools/TeamDeleteTool/TeamDeleteTool.ts:25][E: tools/TeamDeleteTool/TeamDeleteTool.ts:26][E: tools/TeamDeleteTool/TeamDeleteTool.ts:27] mapper 把 output 用 `jsonStringify(data)` 放入 text content block。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:58][E: tools/TeamDeleteTool/TeamDeleteTool.ts:62][E: tools/TeamDeleteTool/TeamDeleteTool.ts:65] `maxResultSizeChars=100_000` 是声明值。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:35]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Swarm cleanup schema 可延迟加载。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:36] |
| `isEnabled()` | `isAgentSwarmsEnabled()` | registry 与 tool 自身都受 agent swarms gate 控制。[E: tools.ts:228][E: tools/TeamDeleteTool/TeamDeleteTool.ts:46] |
| `isReadOnly()` | 默认 `false` | `TeamDelete` 清理 directories 和 app state,且未覆盖 default `isReadOnly`。[I][E: Tool.ts:760] |
| `isConcurrencySafe()` | 默认 `false` | `TeamDeleteTool` 没有 concurrency-safe override;默认返回 false。[I][E: Tool.ts:759] |
| `isDestructive()` | 默认 `false` | 虽然 cleanup 会删除 team/task directories,tool flag 没有显式设为 destructive,因此使用 default false。[I][E: tools/TeamDeleteTool/TeamDeleteTool.ts:101][E: Tool.ts:761] |
| `toAutoClassifierInput` | 默认空字符串 | `TeamDeleteTool` 没有自定义 classifier input;`buildTool` default 返回空字符串。[I][E: Tool.ts:767] |

## 6 权限

`TeamDelete` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `TeamDelete` 未实现 `validateInput()`,字段合法性由空 strict schema 负责。[I][E: tools/TeamDeleteTool/TeamDeleteTool.ts:21]

## 7 call() 走读

`call()` 从 app state 读取 `teamContext.teamName`;若存在 team name,它读取 team file 并过滤掉 `TEAM_LEAD_NAME`,只统计非 lead members。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:71][E: tools/TeamDeleteTool/TeamDeleteTool.ts:73][E: tools/TeamDeleteTool/TeamDeleteTool.ts:74][E: tools/TeamDeleteTool/TeamDeleteTool.ts:76][E: tools/TeamDeleteTool/TeamDeleteTool.ts:78][E: tools/TeamDeleteTool/TeamDeleteTool.ts:81][E: tools/TeamDeleteTool/TeamDeleteTool.ts:82] active members 定义为 `isActive !== false` 的 non-lead members;存在 active member 时返回 `success:false`,message 要求先用 requestShutdown graceful terminate teammates。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:87][E: tools/TeamDeleteTool/TeamDeleteTool.ts:89][E: tools/TeamDeleteTool/TeamDeleteTool.ts:93][E: tools/TeamDeleteTool/TeamDeleteTool.ts:94]

没有 active blocker 时,`TeamDelete` 调用 `cleanupTeamDirectories(teamName)`,注销 session cleanup,清空 teammate colors,清除 leader team name,并记录 `tengu_team_deleted` telemetry。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:101][E: tools/TeamDeleteTool/TeamDeleteTool.ts:103][E: tools/TeamDeleteTool/TeamDeleteTool.ts:106][E: tools/TeamDeleteTool/TeamDeleteTool.ts:109][E: tools/TeamDeleteTool/TeamDeleteTool.ts:111] `clearLeaderTeamName()` 会把 leaderTeamName 置为 undefined 并 notify task subscribers。[E: utils/tasks.ts:43][E: utils/tasks.ts:45][E: utils/tasks.ts:46]

无论是否有 team name,`TeamDelete` 最后都会把 app state 的 `teamContext` 设为 undefined,并把 inbox messages 清空;返回 message 在有 team name 时说明清理了 directories/worktrees,无 team name 时说明 nothing to clean up。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:118][E: tools/TeamDeleteTool/TeamDeleteTool.ts:120][E: tools/TeamDeleteTool/TeamDeleteTool.ts:121][E: tools/TeamDeleteTool/TeamDeleteTool.ts:122][E: tools/TeamDeleteTool/TeamDeleteTool.ts:126][E: tools/TeamDeleteTool/TeamDeleteTool.ts:129][E: tools/TeamDeleteTool/TeamDeleteTool.ts:131]

## 8 渲染

`TeamDelete` 使用 `renderToolUseMessage` 和 `renderToolResultMessage`。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:137][E: tools/TeamDeleteTool/TeamDeleteTool.ts:138] UI use message 固定为 `cleanup team: current`;result renderer 对标准 cleanup output 返回 null。[E: tools/TeamDeleteTool/UI.tsx:4][E: tools/TeamDeleteTool/UI.tsx:5][E: tools/TeamDeleteTool/UI.tsx:15][E: tools/TeamDeleteTool/UI.tsx:16]

## 9 设计动机·edge·历史

- `TeamDelete` 只把 `TEAM_LEAD_NAME` 排除在 active member 检查外,其它 members 即使存在于 team file 也必须 `isActive === false` 才能 cleanup。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:81][E: tools/TeamDeleteTool/TeamDeleteTool.ts:87]
- cleanup 后会清空 inbox messages,防止旧 team 的 queued messages 泄漏到后续 session/team context。[E: tools/TeamDeleteTool/TeamDeleteTool.ts:121][E: tools/TeamDeleteTool/TeamDeleteTool.ts:122]
- external 可见性同时受 registry gate 和 `TeamDeleteTool.isEnabled()` gate 约束。[E: tools.ts:228][E: tools/TeamDeleteTool/TeamDeleteTool.ts:46]

## Sources

- `tools/TeamDeleteTool/TeamDeleteTool.ts`
- `tools/TeamDeleteTool/constants.ts`
- `tools/TeamDeleteTool/prompt.ts`
- `tools/TeamDeleteTool/UI.tsx`
- `utils/agentSwarmsEnabled.ts`
- `utils/tasks.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.send-message`
- `tool.team-create`
