---
id: tool.task-stop
path: surface/tools/task-stop.md
title: TaskStop
kind: tool
tier: T1
status: verified
source: [tools/TaskStopTool/TaskStopTool.ts]
symbols: [TaskStopTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TaskStop` 是停止 running background task 的工具:它接受 `task_id` 或 deprecated `shell_id`,先在 `AppState.tasks` 中验证 task 存在且 status 为 `running`,再调用 `stopTask(...)`。[E: tools/TaskStopTool/prompt.ts:1][E: tools/TaskStopTool/TaskStopTool.ts:12][E: tools/TaskStopTool/TaskStopTool.ts:17][E: tools/TaskStopTool/TaskStopTool.ts:60][E: tools/TaskStopTool/TaskStopTool.ts:82][E: tools/TaskStopTool/TaskStopTool.ts:117]

## 能回答的问题

- `TaskStop` 与 deprecated `KillShell` 的兼容关系是什么?
- `TaskStop` 如何校验 task 是否可停止?
- `TaskStop` 的输出包含哪些 background task 信息?
- `TaskStop` 在 simple/coordinator tool pool 中如何出现?

## 1 Identity

- Tool name: `TaskStop`。[E: tools/TaskStopTool/prompt.ts:1]
- Legacy alias: `KillShell`。[E: tools/TaskStopTool/TaskStopTool.ts:44]
- `searchHint`: `kill a running background task`。[E: tools/TaskStopTool/TaskStopTool.ts:41]
- `description`: `Stop a running background task by ID`。[E: tools/TaskStopTool/TaskStopTool.ts:92][E: tools/TaskStopTool/TaskStopTool.ts:93]
- `maxResultSizeChars`: `100_000`。[E: tools/TaskStopTool/TaskStopTool.ts:45]
- `userFacingName()`: ant 用户返回空字符串,其它用户返回 `Stop Task`。[E: tools/TaskStopTool/TaskStopTool.ts:46]
- 注册与可见性: `TaskStopTool` 是 base tools 固定成员;simple mode 只有在 coordinator mode 也 active 时才额外加入 simple tool set。[E: tools.ts:210][E: tools.ts:271][E: tools.ts:287][E: tools.ts:291][E: tools.ts:295]

## 2 用途定位

`TaskStop` prompt 表明该工具用于按 ID 停止 running background task,典型场景是终止 long-running task。[E: tools/TaskStopTool/prompt.ts:3][E: tools/TaskStopTool/prompt.ts:4][E: tools/TaskStopTool/prompt.ts:5][E: tools/TaskStopTool/prompt.ts:7] `shell_id` 只为 deprecated `KillShell` 兼容保留,新调用应使用 `task_id`。[E: tools/TaskStopTool/TaskStopTool.ts:17]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `task_id` | `string` | 否 | `undefined` | 要停止的 background task ID。[E: tools/TaskStopTool/TaskStopTool.ts:12][E: tools/TaskStopTool/TaskStopTool.ts:15] | `validateInput()` 要求 `task_id ?? shell_id` 存在。[E: tools/TaskStopTool/TaskStopTool.ts:60][E: tools/TaskStopTool/TaskStopTool.ts:62][E: tools/TaskStopTool/TaskStopTool.ts:63] |
| `shell_id` | `string` | 否 | `undefined` | deprecated KillShell 兼容字段。[E: tools/TaskStopTool/TaskStopTool.ts:17] | 与 `task_id` 走同一个 `id = task_id ?? shell_id` 分支。[E: tools/TaskStopTool/TaskStopTool.ts:62] |

## 4 输出 & maxResultSizeChars

output schema 包含 status message、被停止 task id、task type、可选 command。[E: tools/TaskStopTool/TaskStopTool.ts:22][E: tools/TaskStopTool/TaskStopTool.ts:24][E: tools/TaskStopTool/TaskStopTool.ts:25][E: tools/TaskStopTool/TaskStopTool.ts:26][E: tools/TaskStopTool/TaskStopTool.ts:29] `call()` 返回 `Successfully stopped task: <taskId> (<command>)`、`task_id`、`task_type`、`command`;mapper 用 `jsonStringify(output)` 作为 tool_result content。[E: tools/TaskStopTool/TaskStopTool.ts:122][E: tools/TaskStopTool/TaskStopTool.ts:124][E: tools/TaskStopTool/TaskStopTool.ts:125][E: tools/TaskStopTool/TaskStopTool.ts:126][E: tools/TaskStopTool/TaskStopTool.ts:127][E: tools/TaskStopTool/TaskStopTool.ts:98][E: tools/TaskStopTool/TaskStopTool.ts:102]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `aliases` | `["KillShell"]` | 兼容旧 wire name。[E: tools/TaskStopTool/TaskStopTool.ts:44] |
| `shouldDefer` | `true` | Background stop 工具 schema 可延迟加载。[E: tools/TaskStopTool/TaskStopTool.ts:53] |
| `isEnabled()` | 默认 `true` | `TaskStopTool` 未覆盖 `isEnabled`;`buildTool` 默认 true。[I][E: Tool.ts:758] |
| `isConcurrencySafe()` | `true` | 停止不同 task 的操作可并发,源码直接返回 true。[E: tools/TaskStopTool/TaskStopTool.ts:54] |
| `isReadOnly()` | 默认 `false` | `TaskStop` 会改变 background task 状态,且未覆盖 default `isReadOnly`。[I][E: Tool.ts:760] |
| `isDestructive()` | 默认 `false` | `TaskStopTool` 没有 destructive flag override;默认返回 false。[I][E: Tool.ts:761] |
| `toAutoClassifierInput` | `task_id ?? shell_id ?? ""` | classifier input 使用可用 ID。[E: tools/TaskStopTool/TaskStopTool.ts:57][E: tools/TaskStopTool/TaskStopTool.ts:58] |

## 6 权限

`TaskStop` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `validateInput()` 负责本工具的运行前校验:缺 ID 返回 errorCode 1,找不到 task 返回 errorCode 1,task 非 running 返回 errorCode 3。[E: tools/TaskStopTool/TaskStopTool.ts:63][E: tools/TaskStopTool/TaskStopTool.ts:66][E: tools/TaskStopTool/TaskStopTool.ts:74][E: tools/TaskStopTool/TaskStopTool.ts:77][E: tools/TaskStopTool/TaskStopTool.ts:82][E: tools/TaskStopTool/TaskStopTool.ts:85]

## 7 call() 走读

`call()` 再次解析 `id = task_id ?? shell_id`;缺 ID 会抛出 `Missing required parameter: task_id`。[E: tools/TaskStopTool/TaskStopTool.ts:107][E: tools/TaskStopTool/TaskStopTool.ts:112][E: tools/TaskStopTool/TaskStopTool.ts:113][E: tools/TaskStopTool/TaskStopTool.ts:114] 随后它调用 `stopTask(id, { getAppState, setAppState })`,并把 stop result 转成 tool data。[E: tools/TaskStopTool/TaskStopTool.ts:117][E: tools/TaskStopTool/TaskStopTool.ts:118][E: tools/TaskStopTool/TaskStopTool.ts:119][E: tools/TaskStopTool/TaskStopTool.ts:122]

## 8 渲染

`TaskStop` 使用 `renderToolUseMessage` 和 `renderToolResultMessage`。[E: tools/TaskStopTool/TaskStopTool.ts:105][E: tools/TaskStopTool/TaskStopTool.ts:106] UI 的 use message 返回空字符串;非 ant 渲染 result 时会显示 command,非 verbose 模式把 command 限制到 2 行和 160 chars,并追加 `stopped` 后缀。[E: tools/TaskStopTool/UI.tsx:8][E: tools/TaskStopTool/UI.tsx:23][E: tools/TaskStopTool/UI.tsx:28][E: tools/TaskStopTool/UI.tsx:31][E: tools/TaskStopTool/UI.tsx:32][E: tools/TaskStopTool/UI.tsx:33]

## 9 设计动机·edge·历史

- `shell_id` 与 `KillShell` alias 同时存在,说明该工具承接旧 kill-shell 接口兼容。[E: tools/TaskStopTool/TaskStopTool.ts:17][E: tools/TaskStopTool/TaskStopTool.ts:44]
- validation 与 call 都检查 ID,validation 给模型结构化错误,call 保留运行时防御。[E: tools/TaskStopTool/TaskStopTool.ts:63][E: tools/TaskStopTool/TaskStopTool.ts:113]
- 在 `CLAUDE_CODE_SIMPLE` 且 coordinator mode active 时,`TaskStop` 会随 `AgentTool` 和 `SendMessage` 一起保留给 coordinator 使用。[E: tools.ts:271][E: tools.ts:291][E: tools.ts:295]

## Sources

- `tools/TaskStopTool/TaskStopTool.ts`
- `tools/TaskStopTool/prompt.ts`
- `tools/TaskStopTool/UI.tsx`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.task-output`
- `tool.send-message`
