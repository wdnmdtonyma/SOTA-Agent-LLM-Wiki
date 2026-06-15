---
id: tool.task-get
path: surface/tools/task-get.md
title: TaskGet
kind: tool
tier: T1
status: verified
source: [tools/TaskGetTool/TaskGetTool.ts]
symbols: [TaskGetTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TaskGet` 是 Todo V2 task list 的单项读取工具:它按 `taskId` 从当前 `getTaskListId()` 读取 task,不存在时返回 `task: null` 而不是抛错。[E: tools/TaskGetTool/constants.ts:1][E: tools/TaskGetTool/TaskGetTool.ts:73][E: tools/TaskGetTool/TaskGetTool.ts:74][E: tools/TaskGetTool/TaskGetTool.ts:76][E: tools/TaskGetTool/TaskGetTool.ts:78]

## 能回答的问题

- `TaskGet` 的输入只需要哪个字段?
- `TaskGet` 返回哪些 task detail?
- `TaskGet` 为什么是 read-only 和 concurrency-safe?
- `TaskGet` 未找到 task 时模型看到什么?

## 1 Identity

- Tool name: `TaskGet`。[E: tools/TaskGetTool/constants.ts:1]
- `searchHint`: `retrieve a task by ID`。[E: tools/TaskGetTool/TaskGetTool.ts:40]
- `description`: `Get a task by ID from the task list`。[E: tools/TaskGetTool/TaskGetTool.ts:42][E: tools/TaskGetTool/prompt.ts:1]
- `maxResultSizeChars`: `100_000`。[E: tools/TaskGetTool/TaskGetTool.ts:41]
- `userFacingName()`: `TaskGet`。[E: tools/TaskGetTool/TaskGetTool.ts:54]
- 注册与可见性: `getAllBaseTools()` 只在 `isTodoV2Enabled()` 为 true 时加入 `TaskGetTool`;工具自身 `isEnabled()` 同样返回 `isTodoV2Enabled()`。[E: tools.ts:218][E: tools.ts:219][E: tools/TaskGetTool/TaskGetTool.ts:58] `isTodoV2Enabled()` 在 `CLAUDE_CODE_ENABLE_TASKS` truthy 时强制启用,否则要求当前不是 non-interactive session。[E: utils/tasks.ts:133][E: utils/tasks.ts:135][E: utils/tasks.ts:138]

## 2 用途定位

`TaskGet` prompt 把用途限定为按 ID 获取完整 task context,尤其是在开始工作前读取 full description、理解 dependencies、接到 assignment 后获取完整 requirements。[E: tools/TaskGetTool/prompt.ts:3][E: tools/TaskGetTool/prompt.ts:7][E: tools/TaskGetTool/prompt.ts:8][E: tools/TaskGetTool/prompt.ts:9]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `taskId` | `string` | 是 | 无 | 要读取的 task ID。[E: tools/TaskGetTool/TaskGetTool.ts:15] | zod strict object 要求该字段为 string。[E: tools/TaskGetTool/TaskGetTool.ts:14][E: tools/TaskGetTool/TaskGetTool.ts:15] |

## 4 输出 & maxResultSizeChars

output schema 返回 `task` nullable object;存在时包含 `id`、`subject`、`description`、`status`、`blocks`、`blockedBy`。[E: tools/TaskGetTool/TaskGetTool.ts:20][E: tools/TaskGetTool/TaskGetTool.ts:22][E: tools/TaskGetTool/TaskGetTool.ts:24][E: tools/TaskGetTool/TaskGetTool.ts:25][E: tools/TaskGetTool/TaskGetTool.ts:26][E: tools/TaskGetTool/TaskGetTool.ts:27][E: tools/TaskGetTool/TaskGetTool.ts:28][E: tools/TaskGetTool/TaskGetTool.ts:29][E: tools/TaskGetTool/TaskGetTool.ts:31] mapper 在 `task: null` 时返回 `Task not found`;存在 task 时输出 `Task #id`、status、description,并按需追加 blocked-by 与 blocks 行。[E: tools/TaskGetTool/TaskGetTool.ts:99][E: tools/TaskGetTool/TaskGetTool.ts:101][E: tools/TaskGetTool/TaskGetTool.ts:105][E: tools/TaskGetTool/TaskGetTool.ts:109][E: tools/TaskGetTool/TaskGetTool.ts:115][E: tools/TaskGetTool/TaskGetTool.ts:118]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Task V2 工具 schema 可延迟加载。[E: tools/TaskGetTool/TaskGetTool.ts:57] |
| `isEnabled()` | `isTodoV2Enabled()` | registry 与 tool 自身都受 Todo V2 gate 控制。[E: tools.ts:218][E: tools/TaskGetTool/TaskGetTool.ts:58] |
| `isConcurrencySafe()` | `true` | 单项读取可并发,源码直接返回 true。[E: tools/TaskGetTool/TaskGetTool.ts:61] |
| `isReadOnly()` | `true` | `TaskGet` 只读取 task state,源码直接返回 true。[E: tools/TaskGetTool/TaskGetTool.ts:64] |
| `isDestructive()` | 默认 `false` | `TaskGetTool` 没有 destructive flag override;默认返回 false。[I][E: Tool.ts:761] |
| `toAutoClassifierInput` | `taskId` | auto classifier 只接收 task id。[E: tools/TaskGetTool/TaskGetTool.ts:67] |

## 6 权限

`TaskGet` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `TaskGet` 未实现 `validateInput()`,字段合法性由 strict zod schema 负责。[I][E: tools/TaskGetTool/TaskGetTool.ts:13]

## 7 call() 走读

`call({ taskId })` 先取 `taskListId`,再执行 `getTask(taskListId, taskId)`。[E: tools/TaskGetTool/TaskGetTool.ts:73][E: tools/TaskGetTool/TaskGetTool.ts:74][E: tools/TaskGetTool/TaskGetTool.ts:76] task 不存在时返回 `data.task = null`;task 存在时只投影 id、subject、description、status、blocks、blockedBy,不会把 metadata 或 owner 放进输出。[E: tools/TaskGetTool/TaskGetTool.ts:78][E: tools/TaskGetTool/TaskGetTool.ts:81][E: tools/TaskGetTool/TaskGetTool.ts:86][E: tools/TaskGetTool/TaskGetTool.ts:89][E: tools/TaskGetTool/TaskGetTool.ts:94]

## 8 渲染

`renderToolUseMessage()` 返回 `null`,因此调用时没有额外 UI 文案。[E: tools/TaskGetTool/TaskGetTool.ts:71] `TaskGet` 没有自定义 `renderToolResultMessage`,模型侧 result 文本来自 `mapToolResultToToolResultBlockParam()`。[E: tools/TaskGetTool/TaskGetTool.ts:99][E: tools/TaskGetTool/TaskGetTool.ts:125]

## 9 设计动机·edge·历史

- `TaskGet` 未找到 task 时返回正常 `tool_result` 文本,方便模型用 "not found" 状态继续决策。[E: tools/TaskGetTool/TaskGetTool.ts:101][E: tools/TaskGetTool/TaskGetTool.ts:105]
- `TaskGet` prompt 要求读取 blockedBy 后确认依赖为空再开始工作,这与 `TaskList` 的摘要视图互补。[E: tools/TaskGetTool/prompt.ts:22][E: tools/TaskGetTool/prompt.ts:23]

## Sources

- `tools/TaskGetTool/TaskGetTool.ts`
- `tools/TaskGetTool/constants.ts`
- `tools/TaskGetTool/prompt.ts`
- `utils/tasks.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.task-list`
- `tool.task-update`
