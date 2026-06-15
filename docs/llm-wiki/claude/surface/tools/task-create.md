---
id: tool.task-create
path: surface/tools/task-create.md
title: TaskCreate
kind: tool
tier: T1
status: verified
source: [tools/TaskCreateTool/TaskCreateTool.ts]
symbols: [TaskCreateTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TaskCreate` 是 Todo V2 task list 的写入工具:它在当前 `getTaskListId()` 下创建 `pending` task,运行 TaskCreated hooks,并在创建成功后把 UI expanded view 切到 `tasks`。[E: tools/TaskCreateTool/constants.ts:1][E: tools/TaskCreateTool/TaskCreateTool.ts:80][E: tools/TaskCreateTool/TaskCreateTool.ts:81][E: tools/TaskCreateTool/TaskCreateTool.ts:93][E: tools/TaskCreateTool/TaskCreateTool.ts:116]

## 能回答的问题

- `TaskCreate` 的字段如何映射到 task 文件?
- `TaskCreate` 为什么只在 Todo V2 可见?
- `TaskCreate` 如何处理 blocking hook error?
- `TaskCreate` 的输出给模型返回什么文本?

## 1 Identity

- Tool name: `TaskCreate`。[E: tools/TaskCreateTool/constants.ts:1]
- `searchHint`: `create a task in the task list`。[E: tools/TaskCreateTool/TaskCreateTool.ts:50]
- `description`: `Create a new task in the task list`。[E: tools/TaskCreateTool/TaskCreateTool.ts:52][E: tools/TaskCreateTool/prompt.ts:3]
- `maxResultSizeChars`: `100_000`。[E: tools/TaskCreateTool/TaskCreateTool.ts:51]
- `userFacingName()`: `TaskCreate`。[E: tools/TaskCreateTool/TaskCreateTool.ts:64]
- 注册与可见性: `getAllBaseTools()` 只在 `isTodoV2Enabled()` 为 true 时加入 `TaskCreateTool`;工具自身 `isEnabled()` 也返回 `isTodoV2Enabled()`。[E: tools.ts:218][E: tools.ts:219][E: tools/TaskCreateTool/TaskCreateTool.ts:68] `isTodoV2Enabled()` 在 `CLAUDE_CODE_ENABLE_TASKS` truthy 时强制启用,否则只在 interactive session 启用。[E: utils/tasks.ts:133][E: utils/tasks.ts:135][E: utils/tasks.ts:138]

## 2 用途定位

`TaskCreate` 用于把当前 coding session 的复杂工作拆成结构化 task; prompt 明确说 3 个以上步骤、计划模式、用户显式要求 todo、用户给出多个任务等场景应主动创建 task。[E: tools/TaskCreateTool/prompt.ts:16][E: tools/TaskCreateTool/prompt.ts:23][E: tools/TaskCreateTool/prompt.ts:25][E: tools/TaskCreateTool/prompt.ts:26][E: tools/TaskCreateTool/prompt.ts:27] 当 `isAgentSwarmsEnabled()` 为 true 时,prompt 会追加 teammate 相关文案,要求 description 足够让另一个 agent 完成任务,并说明新 task 初始无 owner。[E: tools/TaskCreateTool/prompt.ts:6][E: tools/TaskCreateTool/prompt.ts:10][E: tools/TaskCreateTool/prompt.ts:11][E: tools/TaskCreateTool/prompt.ts:12]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `subject` | `string` | 是 | 无 | task 的短标题。[E: tools/TaskCreateTool/TaskCreateTool.ts:20] | zod strict object 要求字段存在且为 string。[E: tools/TaskCreateTool/TaskCreateTool.ts:19][E: tools/TaskCreateTool/TaskCreateTool.ts:20] |
| `description` | `string` | 是 | 无 | task 的详细工作内容。[E: tools/TaskCreateTool/TaskCreateTool.ts:21] | zod strict object 要求字段存在且为 string。[E: tools/TaskCreateTool/TaskCreateTool.ts:19][E: tools/TaskCreateTool/TaskCreateTool.ts:21] |
| `activeForm` | `string` | 否 | `undefined` | in-progress spinner 使用的 present continuous 文案。[E: tools/TaskCreateTool/TaskCreateTool.ts:22][E: tools/TaskCreateTool/TaskCreateTool.ts:26] | optional string。[E: tools/TaskCreateTool/TaskCreateTool.ts:23][E: tools/TaskCreateTool/TaskCreateTool.ts:24] |
| `metadata` | `Record<string, unknown>` | 否 | `undefined` | 附加到 task 的任意 metadata。[E: tools/TaskCreateTool/TaskCreateTool.ts:28][E: tools/TaskCreateTool/TaskCreateTool.ts:31] | optional record, key 为 string, value 为 unknown。[E: tools/TaskCreateTool/TaskCreateTool.ts:29][E: tools/TaskCreateTool/TaskCreateTool.ts:30] |

## 4 输出 & maxResultSizeChars

output schema 只暴露 `task.id` 和 `task.subject`,tool result text 是 `Task #<id> created successfully: <subject>`。[E: tools/TaskCreateTool/TaskCreateTool.ts:36][E: tools/TaskCreateTool/TaskCreateTool.ts:38][E: tools/TaskCreateTool/TaskCreateTool.ts:39][E: tools/TaskCreateTool/TaskCreateTool.ts:40][E: tools/TaskCreateTool/TaskCreateTool.ts:130][E: tools/TaskCreateTool/TaskCreateTool.ts:135] `maxResultSizeChars=100_000` 是声明值。[E: tools/TaskCreateTool/TaskCreateTool.ts:51]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Task V2 工具 schema 可延迟加载。[E: tools/TaskCreateTool/TaskCreateTool.ts:67] |
| `isEnabled()` | `isTodoV2Enabled()` | registry 与 tool 自身都受 Todo V2 gate 控制。[E: tools.ts:218][E: tools/TaskCreateTool/TaskCreateTool.ts:68] |
| `isConcurrencySafe()` | `true` | 创建 task 可并发,源码直接返回 true。[E: tools/TaskCreateTool/TaskCreateTool.ts:71] |
| `isReadOnly()` | 默认 `false` | `TaskCreateTool` 写入 task list,且未覆盖 `buildTool` 的 default `isReadOnly`。[I][E: Tool.ts:760] |
| `isDestructive()` | 默认 `false` | `TaskCreateTool` 没有 destructive flag override;默认返回 false。[I][E: Tool.ts:761] |
| `toAutoClassifierInput` | `subject` | auto classifier 只接收 task subject。[E: tools/TaskCreateTool/TaskCreateTool.ts:74] |

## 6 权限

`TaskCreate` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `validateInput()` 也未在 `TaskCreateTool` 中自定义,字段合法性由 strict zod schema 负责。[I][E: tools/TaskCreateTool/TaskCreateTool.ts:18]

## 7 call() 走读

`call()` 用 `getTaskListId()` 决定 task list,再调用 `createTask(...)` 写入 `subject`、`description`、`activeForm`、`status: "pending"`、`owner: undefined`、空 `blocks`、空 `blockedBy` 和 `metadata`。[E: tools/TaskCreateTool/TaskCreateTool.ts:81][E: tools/TaskCreateTool/TaskCreateTool.ts:82][E: tools/TaskCreateTool/TaskCreateTool.ts:83][E: tools/TaskCreateTool/TaskCreateTool.ts:84][E: tools/TaskCreateTool/TaskCreateTool.ts:85][E: tools/TaskCreateTool/TaskCreateTool.ts:86][E: tools/TaskCreateTool/TaskCreateTool.ts:87][E: tools/TaskCreateTool/TaskCreateTool.ts:88][E: tools/TaskCreateTool/TaskCreateTool.ts:89] `getTaskListId()` 的优先级包括 explicit env、in-process teammate team、process teammate team、leader team name 和 session id。[E: utils/tasks.ts:199][E: utils/tasks.ts:200][E: utils/tasks.ts:205][E: utils/tasks.ts:209]

创建后,`TaskCreate` 执行 `executeTaskCreatedHooks(...)`;如果任意 hook 产生 blocking error,它删除刚创建的 task 并抛出合并后的错误文本。[E: tools/TaskCreateTool/TaskCreateTool.ts:92][E: tools/TaskCreateTool/TaskCreateTool.ts:93][E: tools/TaskCreateTool/TaskCreateTool.ts:104][E: tools/TaskCreateTool/TaskCreateTool.ts:105][E: tools/TaskCreateTool/TaskCreateTool.ts:110][E: tools/TaskCreateTool/TaskCreateTool.ts:111][E: tools/TaskCreateTool/TaskCreateTool.ts:112] 成功时,`setAppState` 会把 `expandedView` 改为 `tasks`,然后返回 created task id 和 subject。[E: tools/TaskCreateTool/TaskCreateTool.ts:116][E: tools/TaskCreateTool/TaskCreateTool.ts:118][E: tools/TaskCreateTool/TaskCreateTool.ts:121][E: tools/TaskCreateTool/TaskCreateTool.ts:124]

## 8 渲染

`renderToolUseMessage()` 返回 `null`,因此工具调用本身不向 transcript 渲染额外 use message。[E: tools/TaskCreateTool/TaskCreateTool.ts:78] `TaskCreate` 没有自定义 `renderToolResultMessage`,模型侧结果由 `mapToolResultToToolResultBlockParam()` 的文本提供。[E: tools/TaskCreateTool/TaskCreateTool.ts:130][E: tools/TaskCreateTool/TaskCreateTool.ts:135]

## 9 设计动机·edge·历史

- TaskCreated hook 是事务式 guard:hook blocking error 会触发 delete,避免留下被 hook 拒绝的 task。[E: tools/TaskCreateTool/TaskCreateTool.ts:110][E: tools/TaskCreateTool/TaskCreateTool.ts:111]
- `TaskCreate` 创建 task 时不设 owner,agent swarms prompt 要求后续用 `TaskUpdate.owner` 分配。[E: tools/TaskCreateTool/TaskCreateTool.ts:86][E: tools/TaskCreateTool/prompt.ts:12]
- Todo V2 task tools 在 non-interactive session 默认不可见,但 `CLAUDE_CODE_ENABLE_TASKS` 可覆盖该行为。[E: utils/tasks.ts:135][E: utils/tasks.ts:138]

## Sources

- `tools/TaskCreateTool/TaskCreateTool.ts`
- `tools/TaskCreateTool/constants.ts`
- `tools/TaskCreateTool/prompt.ts`
- `utils/tasks.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.task-list`
- `tool.task-update`
