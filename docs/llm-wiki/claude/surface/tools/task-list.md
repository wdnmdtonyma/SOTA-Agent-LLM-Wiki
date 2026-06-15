---
id: tool.task-list
path: surface/tools/task-list.md
title: TaskList
kind: tool
tier: T1
status: verified
source: [tools/TaskListTool/TaskListTool.ts]
symbols: [TaskListTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TaskList` 是 Todo V2 task list 的摘要读取工具:它读取当前 task list,过滤 internal metadata task,并把已完成 task 从 `blockedBy` 显示中剔除。[E: tools/TaskListTool/constants.ts:1][E: tools/TaskListTool/TaskListTool.ts:65][E: tools/TaskListTool/TaskListTool.ts:68][E: tools/TaskListTool/TaskListTool.ts:69][E: tools/TaskListTool/TaskListTool.ts:73][E: tools/TaskListTool/TaskListTool.ts:82]

## 能回答的问题

- `TaskList` 的输入为什么是空对象?
- `TaskList` 的摘要输出包含哪些字段?
- `TaskList` 如何处理 internal tasks 和 resolved blockers?
- `TaskList` 在 agent swarms 下的 prompt 如何变化?

## 1 Identity

- Tool name: `TaskList`。[E: tools/TaskListTool/constants.ts:1]
- `searchHint`: `list all tasks`。[E: tools/TaskListTool/TaskListTool.ts:35]
- `description`: `List all tasks in the task list`。[E: tools/TaskListTool/TaskListTool.ts:37][E: tools/TaskListTool/prompt.ts:3]
- `maxResultSizeChars`: `100_000`。[E: tools/TaskListTool/TaskListTool.ts:36]
- `userFacingName()`: `TaskList`。[E: tools/TaskListTool/TaskListTool.ts:49]
- 注册与可见性: `getAllBaseTools()` 只在 `isTodoV2Enabled()` 为 true 时加入 `TaskListTool`;工具自身 `isEnabled()` 同样返回 `isTodoV2Enabled()`。[E: tools.ts:218][E: tools.ts:219][E: tools/TaskListTool/TaskListTool.ts:53] `isTodoV2Enabled()` 在 `CLAUDE_CODE_ENABLE_TASKS` truthy 时强制启用,否则要求 interactive session。[E: utils/tasks.ts:133][E: utils/tasks.ts:135][E: utils/tasks.ts:138]

## 2 用途定位

`TaskList` prompt 用于查看可工作 task、项目进度、blocked tasks 和完成 task 后的新可用工作;agent swarms gate 打开时,prompt 额外加入 teammate workflow,要求 teammate 完成当前 task 后调用 `TaskList`,查找 `pending`、无 owner、空 `blockedBy` 的 task,并按 ID 顺序认领。[E: tools/TaskListTool/prompt.ts:28][E: tools/TaskListTool/prompt.ts:32][E: tools/TaskListTool/prompt.ts:33][E: tools/TaskListTool/prompt.ts:34][E: tools/TaskListTool/prompt.ts:35][E: tools/TaskListTool/prompt.ts:15][E: tools/TaskListTool/prompt.ts:20][E: tools/TaskListTool/prompt.ts:21][E: tools/TaskListTool/prompt.ts:22]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| 无 | `z.strictObject({})` | 否 | 空对象 | `TaskList` 不接受参数。[E: tools/TaskListTool/TaskListTool.ts:13] | strict object 会拒绝未声明字段。[E: tools/TaskListTool/TaskListTool.ts:13] |

## 4 输出 & maxResultSizeChars

output schema 返回 `tasks` 数组,每个 task 包含 `id`、`subject`、`status`、可选 `owner` 和 `blockedBy`。[E: tools/TaskListTool/TaskListTool.ts:16][E: tools/TaskListTool/TaskListTool.ts:18][E: tools/TaskListTool/TaskListTool.ts:20][E: tools/TaskListTool/TaskListTool.ts:21][E: tools/TaskListTool/TaskListTool.ts:22][E: tools/TaskListTool/TaskListTool.ts:23][E: tools/TaskListTool/TaskListTool.ts:24] mapper 在空列表时返回 `No tasks found`;非空时每行格式为 `#id [status] subject`,可追加 owner 与 blocked-by 片段。[E: tools/TaskListTool/TaskListTool.ts:91][E: tools/TaskListTool/TaskListTool.ts:93][E: tools/TaskListTool/TaskListTool.ts:97][E: tools/TaskListTool/TaskListTool.ts:101][E: tools/TaskListTool/TaskListTool.ts:102][E: tools/TaskListTool/TaskListTool.ts:103][E: tools/TaskListTool/TaskListTool.ts:107]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Task V2 工具 schema 可延迟加载。[E: tools/TaskListTool/TaskListTool.ts:52] |
| `isEnabled()` | `isTodoV2Enabled()` | registry 与 tool 自身都受 Todo V2 gate 控制。[E: tools.ts:218][E: tools/TaskListTool/TaskListTool.ts:53] |
| `isConcurrencySafe()` | `true` | 列表读取可并发,源码直接返回 true。[E: tools/TaskListTool/TaskListTool.ts:56] |
| `isReadOnly()` | `true` | `TaskList` 只读取 task list,源码直接返回 true。[E: tools/TaskListTool/TaskListTool.ts:59] |
| `isDestructive()` | 默认 `false` | `TaskListTool` 没有 destructive flag override;默认返回 false。[I][E: Tool.ts:761] |
| `toAutoClassifierInput` | 默认空字符串 | `TaskListTool` 没有自定义 classifier input;`buildTool` default 返回空字符串。[I][E: Tool.ts:767] |

## 6 权限

`TaskList` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `TaskList` 未实现 `validateInput()`,字段合法性由空 strict schema 负责。[I][E: tools/TaskListTool/TaskListTool.ts:13]

## 7 call() 走读

`call()` 获取当前 `taskListId`,执行 `listTasks(taskListId)`,并过滤 `metadata._internal` 为 truthy 的 task。[E: tools/TaskListTool/TaskListTool.ts:65][E: tools/TaskListTool/TaskListTool.ts:66][E: tools/TaskListTool/TaskListTool.ts:68][E: tools/TaskListTool/TaskListTool.ts:69] 它先把 completed task id 收进 `resolvedTaskIds`,再构造摘要 task,其中 `blockedBy` 会过滤掉已经完成的 blocker。[E: tools/TaskListTool/TaskListTool.ts:73][E: tools/TaskListTool/TaskListTool.ts:74][E: tools/TaskListTool/TaskListTool.ts:77][E: tools/TaskListTool/TaskListTool.ts:82] 返回数据只包含摘要字段,不包含 description、blocks 或 metadata。[E: tools/TaskListTool/TaskListTool.ts:77][E: tools/TaskListTool/TaskListTool.ts:78][E: tools/TaskListTool/TaskListTool.ts:79][E: tools/TaskListTool/TaskListTool.ts:80][E: tools/TaskListTool/TaskListTool.ts:81][E: tools/TaskListTool/TaskListTool.ts:82]

## 8 渲染

`renderToolUseMessage()` 返回 `null`,因此调用时不显示额外 use message。[E: tools/TaskListTool/TaskListTool.ts:63] `TaskList` 没有自定义 `renderToolResultMessage`,模型侧 result 文本来自 `mapToolResultToToolResultBlockParam()`。[E: tools/TaskListTool/TaskListTool.ts:91][E: tools/TaskListTool/TaskListTool.ts:113]

## 9 设计动机·edge·历史

- `metadata._internal` task 被过滤,所以内部 task 不进入模型可见摘要。[E: tools/TaskListTool/TaskListTool.ts:68][E: tools/TaskListTool/TaskListTool.ts:69]
- completed blocker 不再显示在 `blockedBy`,因此摘要强调 open blockers,而不是历史依赖。[E: tools/TaskListTool/TaskListTool.ts:73][E: tools/TaskListTool/TaskListTool.ts:82]
- agent swarms prompt 把 `owner` 解释为 agent ID/agent name assignment 入口,并要求 teammate 用 `TaskUpdate` claim task。[E: tools/TaskListTool/prompt.ts:44][E: tools/TaskListTool/prompt.ts:23]

## Sources

- `tools/TaskListTool/TaskListTool.ts`
- `tools/TaskListTool/constants.ts`
- `tools/TaskListTool/prompt.ts`
- `utils/tasks.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.task-get`
- `tool.task-update`
