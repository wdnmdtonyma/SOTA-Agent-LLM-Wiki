---
id: tool.team-create
path: surface/tools/team-create.md
title: TeamCreate
kind: tool
tier: T1
status: verified
source: [tools/TeamCreateTool/TeamCreateTool.ts]
symbols: [TeamCreateTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TeamCreate` 是 agent swarms 的 team bootstrap 工具:它创建 team file、重置对应 task list、登记 leader team name,并把当前 session 的 `teamContext` 写进 app state。[E: tools/TeamCreateTool/constants.ts:1][E: tools/TeamCreateTool/TeamCreateTool.ts:177][E: tools/TeamCreateTool/TeamCreateTool.ts:185][E: tools/TeamCreateTool/TeamCreateTool.ts:191][E: tools/TeamCreateTool/TeamCreateTool.ts:194]

## 能回答的问题

- `TeamCreate` 的 `team_name` 冲突时如何处理?
- `TeamCreate` 如何把 team 与 task list 绑定?
- `TeamCreate` 的 agent swarms gate 与 external opt-in 条件是什么?
- `TeamCreate` 为什么 leader 不设置 `CLAUDE_CODE_AGENT_ID`?

## 1 Identity

- Tool name: `TeamCreate`。[E: tools/TeamCreateTool/constants.ts:1]
- `searchHint`: `create a multi-agent swarm team`。[E: tools/TeamCreateTool/TeamCreateTool.ts:76]
- `description`: `Create a new team for coordinating multiple agents`。[E: tools/TeamCreateTool/TeamCreateTool.ts:107][E: tools/TeamCreateTool/TeamCreateTool.ts:108]
- `maxResultSizeChars`: `100_000`。[E: tools/TeamCreateTool/TeamCreateTool.ts:77]
- `userFacingName()`: 空字符串。[E: tools/TeamCreateTool/TeamCreateTool.ts:80][E: tools/TeamCreateTool/TeamCreateTool.ts:81]
- 注册与可见性: `getAllBaseTools()` 只在 `isAgentSwarmsEnabled()` 为 true 时加入 `TeamCreateTool`;工具自身 `isEnabled()` 也返回 `isAgentSwarmsEnabled()`。[E: tools.ts:228][E: tools.ts:229][E: tools/TeamCreateTool/TeamCreateTool.ts:88] ant 用户直接 enabled;external 用户需要 env/CLI opt-in 且 GrowthBook `tengu_amber_flint` killswitch 为 true。[E: utils/agentSwarmsEnabled.ts:24][E: utils/agentSwarmsEnabled.ts:26][E: utils/agentSwarmsEnabled.ts:32][E: utils/agentSwarmsEnabled.ts:39][E: utils/agentSwarmsEnabled.ts:43]

## 2 用途定位

`TeamCreate` prompt 要求在用户显式要求 team/swarm/group of agents,或任务复杂到适合并行 agent 协作时主动使用;同一 prompt 把 Team 与 TaskList 定义为 1:1 correspondence。[E: tools/TeamCreateTool/prompt.ts:7][E: tools/TeamCreateTool/prompt.ts:8][E: tools/TeamCreateTool/prompt.ts:9][E: tools/TeamCreateTool/prompt.ts:10][E: tools/TeamCreateTool/prompt.ts:24] team workflow 中,`TeamCreate` 之后用 Task tools 创建任务、用 Agent tool spawn teammates、用 TaskUpdate 分配 owner、完成后用 SendMessage shutdown。[E: tools/TeamCreateTool/prompt.ts:39][E: tools/TeamCreateTool/prompt.ts:40][E: tools/TeamCreateTool/prompt.ts:41][E: tools/TeamCreateTool/prompt.ts:42][E: tools/TeamCreateTool/prompt.ts:45]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `team_name` | `string` | 是 | 无 | 新 team 的名称。[E: tools/TeamCreateTool/TeamCreateTool.ts:39] | `validateInput()` 要求存在且 trim 后非空。[E: tools/TeamCreateTool/TeamCreateTool.ts:96][E: tools/TeamCreateTool/TeamCreateTool.ts:97][E: tools/TeamCreateTool/TeamCreateTool.ts:100] |
| `description` | `string` | 否 | `undefined` | team description/purpose。[E: tools/TeamCreateTool/TeamCreateTool.ts:40] | optional string。[E: tools/TeamCreateTool/TeamCreateTool.ts:40] |
| `agent_type` | `string` | 否 | `TEAM_LEAD_NAME` | team lead 的 role/type,用于 team file 和 coordination。[E: tools/TeamCreateTool/TeamCreateTool.ts:41][E: tools/TeamCreateTool/TeamCreateTool.ts:45][E: tools/TeamCreateTool/TeamCreateTool.ts:147] | optional string。[E: tools/TeamCreateTool/TeamCreateTool.ts:42][E: tools/TeamCreateTool/TeamCreateTool.ts:43] |

## 4 输出 & maxResultSizeChars

输出类型包含 `team_name`、`team_file_path`、`lead_agent_id`。[E: tools/TeamCreateTool/TeamCreateTool.ts:52][E: tools/TeamCreateTool/TeamCreateTool.ts:53][E: tools/TeamCreateTool/TeamCreateTool.ts:54][E: tools/TeamCreateTool/TeamCreateTool.ts:55] mapper 把 output 用 `jsonStringify(data)` 放进 text content block。[E: tools/TeamCreateTool/TeamCreateTool.ts:115][E: tools/TeamCreateTool/TeamCreateTool.ts:119][E: tools/TeamCreateTool/TeamCreateTool.ts:122] `maxResultSizeChars=100_000` 是声明值。[E: tools/TeamCreateTool/TeamCreateTool.ts:77]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Swarm team creation schema 可延迟加载。[E: tools/TeamCreateTool/TeamCreateTool.ts:78] |
| `isEnabled()` | `isAgentSwarmsEnabled()` | registry 与 tool 自身都受 agent swarms gate 控制。[E: tools.ts:228][E: tools/TeamCreateTool/TeamCreateTool.ts:88] |
| `isReadOnly()` | 默认 `false` | `TeamCreate` 写 team file、task dir 和 app state,且未覆盖 default `isReadOnly`。[I][E: Tool.ts:760] |
| `isConcurrencySafe()` | 默认 `false` | `TeamCreateTool` 没有 concurrency-safe override;默认返回 false。[I][E: Tool.ts:759] |
| `isDestructive()` | 默认 `false` | `TeamCreateTool` 没有 destructive flag override;默认返回 false。[I][E: Tool.ts:761] |
| `toAutoClassifierInput` | `team_name` | auto classifier 只接收 team name。[E: tools/TeamCreateTool/TeamCreateTool.ts:92][E: tools/TeamCreateTool/TeamCreateTool.ts:93] |

## 6 权限

`TeamCreate` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `validateInput()` 只校验 `team_name` 非空,其它约束在 `call()` 中处理。[E: tools/TeamCreateTool/TeamCreateTool.ts:96][E: tools/TeamCreateTool/TeamCreateTool.ts:104]

## 7 call() 走读

`call()` 先读取 app state,如果当前 leader 已有 `teamContext.teamName`,直接抛错要求先用 `TeamDelete` 结束当前 team。[E: tools/TeamCreateTool/TeamCreateTool.ts:128][E: tools/TeamCreateTool/TeamCreateTool.ts:133][E: tools/TeamCreateTool/TeamCreateTool.ts:136][E: tools/TeamCreateTool/TeamCreateTool.ts:138] team name 冲突时,`generateUniqueTeamName(...)` 会在已有 team file 存在时改用 `generateWordSlug()`。[E: tools/TeamCreateTool/TeamCreateTool.ts:64][E: tools/TeamCreateTool/TeamCreateTool.ts:66][E: tools/TeamCreateTool/TeamCreateTool.ts:71][E: tools/TeamCreateTool/TeamCreateTool.ts:143]

随后 `TeamCreate` 用 final team name 生成 deterministic lead agent id,解析当前 main loop model,构造包含 leader member 的 `TeamFile`,写入 team file 并注册 session-end cleanup。[E: tools/TeamCreateTool/TeamCreateTool.ts:146][E: tools/TeamCreateTool/TeamCreateTool.ts:149][E: tools/TeamCreateTool/TeamCreateTool.ts:157][E: tools/TeamCreateTool/TeamCreateTool.ts:161][E: tools/TeamCreateTool/TeamCreateTool.ts:162][E: tools/TeamCreateTool/TeamCreateTool.ts:163][E: tools/TeamCreateTool/TeamCreateTool.ts:177][E: tools/TeamCreateTool/TeamCreateTool.ts:180] 它把 sanitized final team name 作为 task list id,先 reset task list,再 ensure tasks dir,并调用 `setLeaderTeamName(...)` 让 leader 的 `getTaskListId()` 返回 team name。[E: tools/TeamCreateTool/TeamCreateTool.ts:184][E: tools/TeamCreateTool/TeamCreateTool.ts:185][E: tools/TeamCreateTool/TeamCreateTool.ts:186][E: tools/TeamCreateTool/TeamCreateTool.ts:191][E: utils/tasks.ts:31][E: utils/tasks.ts:33]

最后,`TeamCreate` 写入 `appState.teamContext`,包含 teamName、teamFilePath、leadAgentId 和以 leadAgentId 为 key 的 teammate layout entry;它记录 `tengu_team_created` telemetry,并返回 team metadata。[E: tools/TeamCreateTool/TeamCreateTool.ts:194][E: tools/TeamCreateTool/TeamCreateTool.ts:196][E: tools/TeamCreateTool/TeamCreateTool.ts:197][E: tools/TeamCreateTool/TeamCreateTool.ts:198][E: tools/TeamCreateTool/TeamCreateTool.ts:199][E: tools/TeamCreateTool/TeamCreateTool.ts:200][E: tools/TeamCreateTool/TeamCreateTool.ts:201][E: tools/TeamCreateTool/TeamCreateTool.ts:214][E: tools/TeamCreateTool/TeamCreateTool.ts:232][E: tools/TeamCreateTool/TeamCreateTool.ts:233][E: tools/TeamCreateTool/TeamCreateTool.ts:234] 源码没有看到 `TeamCreate` 为 leader 写入 `CLAUDE_CODE_AGENT_ID`;其设计动机来自邻近注释,因此按推断记录。[I]

## 8 渲染

`TeamCreate` 使用 `renderToolUseMessage`。[E: tools/TeamCreateTool/TeamCreateTool.ts:239] UI use message 显示 `create team: <team_name>`。[E: tools/TeamCreateTool/UI.tsx:3][E: tools/TeamCreateTool/UI.tsx:4]

## 9 设计动机·edge·历史

- Team 与 TaskList 在 prompt 中是 1:1,实现中也把 sanitized team name 用作 task list id 并重置该 task list。[E: tools/TeamCreateTool/prompt.ts:24][E: tools/TeamCreateTool/TeamCreateTool.ts:184][E: tools/TeamCreateTool/TeamCreateTool.ts:185]
- team name 冲突不失败,而是生成新的 word slug,避免覆盖已有 team file。[E: tools/TeamCreateTool/TeamCreateTool.ts:64][E: tools/TeamCreateTool/TeamCreateTool.ts:71]
- external 可见性不是只靠 tool registry;`TeamCreateTool.isEnabled()` 也会再次检查 agent swarms gate。[E: tools.ts:228][E: tools/TeamCreateTool/TeamCreateTool.ts:88]

## Sources

- `tools/TeamCreateTool/TeamCreateTool.ts`
- `tools/TeamCreateTool/constants.ts`
- `tools/TeamCreateTool/prompt.ts`
- `tools/TeamCreateTool/UI.tsx`
- `utils/agentSwarmsEnabled.ts`
- `utils/tasks.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.send-message`
- `tool.team-delete`
