---
id: tool.task-update
path: surface/tools/task-update.md
title: TaskUpdate
kind: tool
tier: T1
status: verified
source: [tools/TaskUpdateTool/TaskUpdateTool.ts]
symbols: [TaskUpdateTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TaskUpdate` 是 Todo V2 task list 的 mutation 工具:它更新 task 字段、状态、owner、metadata、dependency edges,支持特殊 `status: "deleted"` 删除 task,并在完成 task 时运行 TaskCompleted hooks。[E: tools/TaskUpdateTool/constants.ts:1][E: tools/TaskUpdateTool/TaskUpdateTool.ts:123][E: tools/TaskUpdateTool/TaskUpdateTool.ts:169][E: tools/TaskUpdateTool/TaskUpdateTool.ts:212][E: tools/TaskUpdateTool/TaskUpdateTool.ts:232][E: tools/TaskUpdateTool/TaskUpdateTool.ts:301]

## 能回答的问题

- `TaskUpdate` 支持更新哪些字段?
- `TaskUpdate` 的 `deleted` 为什么不是普通 task status?
- `TaskUpdate` 在 agent swarms 下如何自动设置 owner 和发送 assignment message?
- `TaskUpdate` 的 verification nudge gate 是什么?

## 1 Identity

- Tool name: `TaskUpdate`。[E: tools/TaskUpdateTool/constants.ts:1]
- `searchHint`: `update a task`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:90]
- `description`: `Update a task in the task list`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:92][E: tools/TaskUpdateTool/prompt.ts:1]
- `maxResultSizeChars`: `100_000`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:91]
- `userFacingName()`: `TaskUpdate`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:104]
- 注册与可见性: `getAllBaseTools()` 只在 `isTodoV2Enabled()` 为 true 时加入 `TaskUpdateTool`;工具自身 `isEnabled()` 同样返回 `isTodoV2Enabled()`。[E: tools.ts:218][E: tools.ts:219][E: tools/TaskUpdateTool/TaskUpdateTool.ts:108] `isTodoV2Enabled()` 在 `CLAUDE_CODE_ENABLE_TASKS` truthy 时强制启用,否则要求当前不是 non-interactive session。[E: utils/tasks.ts:133][E: utils/tasks.ts:135][E: utils/tasks.ts:138]

## 2 用途定位

`TaskUpdate` prompt 覆盖三类用途:标记 task resolved、删除 task、更新 task details/dependencies。[E: tools/TaskUpdateTool/prompt.ts:7][E: tools/TaskUpdateTool/prompt.ts:22][E: tools/TaskUpdateTool/prompt.ts:26] prompt 明确要求只有 FULLY accomplished 时才标记 completed,遇到 failing tests、partial implementation、unresolved errors 或找不到依赖时不能标记 completed。[E: tools/TaskUpdateTool/prompt.ts:13][E: tools/TaskUpdateTool/prompt.ts:16][E: tools/TaskUpdateTool/prompt.ts:17][E: tools/TaskUpdateTool/prompt.ts:18][E: tools/TaskUpdateTool/prompt.ts:19][E: tools/TaskUpdateTool/prompt.ts:20]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `taskId` | `string` | 是 | 无 | 要更新的 task ID。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:38] | strict object 要求 string。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:37][E: tools/TaskUpdateTool/TaskUpdateTool.ts:38] |
| `subject` | `string` | 否 | `undefined` | 新 task title。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:39] | optional string。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:39] |
| `description` | `string` | 否 | `undefined` | 新 task description。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:40] | optional string。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:40] |
| `activeForm` | `string` | 否 | `undefined` | in-progress spinner 使用的 present continuous 文案。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:41][E: tools/TaskUpdateTool/TaskUpdateTool.ts:45] | optional string。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:42][E: tools/TaskUpdateTool/TaskUpdateTool.ts:43] |
| `status` | `pending \| in_progress \| completed \| deleted` | 否 | `undefined` | 新状态;`deleted` 是 special action。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:35][E: tools/TaskUpdateTool/TaskUpdateTool.ts:47] | `TaskStatusSchema()` 或 literal `deleted`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:35] |
| `addBlocks` | `string[]` | 否 | `undefined` | 此 task blocks 的 task IDs。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:50][E: tools/TaskUpdateTool/TaskUpdateTool.ts:53] | optional string array。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:51][E: tools/TaskUpdateTool/TaskUpdateTool.ts:52] |
| `addBlockedBy` | `string[]` | 否 | `undefined` | 阻塞此 task 的 task IDs。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:54][E: tools/TaskUpdateTool/TaskUpdateTool.ts:57] | optional string array。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:55][E: tools/TaskUpdateTool/TaskUpdateTool.ts:56] |
| `owner` | `string` | 否 | `undefined` | 新 owner。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:58] | optional string。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:58] |
| `metadata` | `Record<string, unknown>` | 否 | `undefined` | merge 到 task 的 metadata;value 为 null 时删除 key。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:59][E: tools/TaskUpdateTool/TaskUpdateTool.ts:63] | optional record。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:60][E: tools/TaskUpdateTool/TaskUpdateTool.ts:61] |

## 4 输出 & maxResultSizeChars

output schema 包含 `success`、`taskId`、`updatedFields`、可选 `error`、可选 `statusChange`、可选 `verificationNudgeNeeded`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:69][E: tools/TaskUpdateTool/TaskUpdateTool.ts:71][E: tools/TaskUpdateTool/TaskUpdateTool.ts:72][E: tools/TaskUpdateTool/TaskUpdateTool.ts:73][E: tools/TaskUpdateTool/TaskUpdateTool.ts:74][E: tools/TaskUpdateTool/TaskUpdateTool.ts:75][E: tools/TaskUpdateTool/TaskUpdateTool.ts:81] mapper 对 `success:false` 返回普通 `tool_result` content;成功时返回 `Updated task #...` 并可追加 teammate completed reminder 或 verification note。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:373][E: tools/TaskUpdateTool/TaskUpdateTool.ts:377][E: tools/TaskUpdateTool/TaskUpdateTool.ts:379][E: tools/TaskUpdateTool/TaskUpdateTool.ts:380][E: tools/TaskUpdateTool/TaskUpdateTool.ts:384][E: tools/TaskUpdateTool/TaskUpdateTool.ts:388][E: tools/TaskUpdateTool/TaskUpdateTool.ts:396]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Task V2 工具 schema 可延迟加载。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:107] |
| `isEnabled()` | `isTodoV2Enabled()` | registry 与 tool 自身都受 Todo V2 gate 控制。[E: tools.ts:218][E: tools/TaskUpdateTool/TaskUpdateTool.ts:108] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true;具体 task 文件修改由 task utils 负责序列化。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:111][I] |
| `isReadOnly()` | 默认 `false` | `TaskUpdate` 会更新或删除 task,且未覆盖 default `isReadOnly`。[I][E: Tool.ts:760] |
| `isDestructive()` | 默认 `false` | 即使 `status: "deleted"` 会调用 `deleteTask(...)`,tool flag 没有显式设为 destructive,因此使用 default false。[I][E: tools/TaskUpdateTool/TaskUpdateTool.ts:214][E: Tool.ts:761] |
| `toAutoClassifierInput` | `taskId status subject` | classifier input 由 task id 加可选 status、subject 拼成。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:114][E: tools/TaskUpdateTool/TaskUpdateTool.ts:116][E: tools/TaskUpdateTool/TaskUpdateTool.ts:118] |

## 6 权限

`TaskUpdate` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `TaskUpdate` 未实现 `validateInput()`,字段合法性由 strict zod schema 负责。[I][E: tools/TaskUpdateTool/TaskUpdateTool.ts:33]

## 7 call() 走读

`call()` 先取 `taskListId`,把 expanded view 切到 `tasks`,再读取 existing task;不存在时返回 `success:false`、空 `updatedFields` 和 `Task not found`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:137][E: tools/TaskUpdateTool/TaskUpdateTool.ts:140][E: tools/TaskUpdateTool/TaskUpdateTool.ts:142][E: tools/TaskUpdateTool/TaskUpdateTool.ts:146][E: tools/TaskUpdateTool/TaskUpdateTool.ts:147][E: tools/TaskUpdateTool/TaskUpdateTool.ts:150][E: tools/TaskUpdateTool/TaskUpdateTool.ts:153] 对 `subject`、`description`、`activeForm`、`owner` 的更新只有在传入值与 existing value 不同时才加入 `updates` 和 `updatedFields`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:169][E: tools/TaskUpdateTool/TaskUpdateTool.ts:170][E: tools/TaskUpdateTool/TaskUpdateTool.ts:171][E: tools/TaskUpdateTool/TaskUpdateTool.ts:173][E: tools/TaskUpdateTool/TaskUpdateTool.ts:174][E: tools/TaskUpdateTool/TaskUpdateTool.ts:175][E: tools/TaskUpdateTool/TaskUpdateTool.ts:177][E: tools/TaskUpdateTool/TaskUpdateTool.ts:178][E: tools/TaskUpdateTool/TaskUpdateTool.ts:179][E: tools/TaskUpdateTool/TaskUpdateTool.ts:181][E: tools/TaskUpdateTool/TaskUpdateTool.ts:182][E: tools/TaskUpdateTool/TaskUpdateTool.ts:183]

agent swarms gate 打开且 status 为 `in_progress`、未显式 owner、existing task 没 owner 时,`TaskUpdate` 自动把当前 agent name 写为 owner。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:188][E: tools/TaskUpdateTool/TaskUpdateTool.ts:189][E: tools/TaskUpdateTool/TaskUpdateTool.ts:190][E: tools/TaskUpdateTool/TaskUpdateTool.ts:191][E: tools/TaskUpdateTool/TaskUpdateTool.ts:192][E: tools/TaskUpdateTool/TaskUpdateTool.ts:194][E: tools/TaskUpdateTool/TaskUpdateTool.ts:196] metadata merge 会以 existing metadata 为基底,value 为 null 时删除 key,否则覆盖 key。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:200][E: tools/TaskUpdateTool/TaskUpdateTool.ts:201][E: tools/TaskUpdateTool/TaskUpdateTool.ts:203][E: tools/TaskUpdateTool/TaskUpdateTool.ts:206]

`status: "deleted"` 分支调用 `deleteTask(...)` 并立即返回,成功时 `updatedFields` 为 `["deleted"]` 且 `statusChange.to` 为 `deleted`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:212][E: tools/TaskUpdateTool/TaskUpdateTool.ts:215][E: tools/TaskUpdateTool/TaskUpdateTool.ts:218][E: tools/TaskUpdateTool/TaskUpdateTool.ts:220][E: tools/TaskUpdateTool/TaskUpdateTool.ts:222][E: tools/TaskUpdateTool/TaskUpdateTool.ts:223] 普通 status update 在转 completed 时运行 `executeTaskCompletedHooks(...)`;blocking errors 会返回 `success:false` 而不写 status。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:230][E: tools/TaskUpdateTool/TaskUpdateTool.ts:232][E: tools/TaskUpdateTool/TaskUpdateTool.ts:235][E: tools/TaskUpdateTool/TaskUpdateTool.ts:247][E: tools/TaskUpdateTool/TaskUpdateTool.ts:255][E: tools/TaskUpdateTool/TaskUpdateTool.ts:258][E: tools/TaskUpdateTool/TaskUpdateTool.ts:267]

存在 `updates` 时调用 `updateTask(...)`;agent swarms gate 打开且 owner 变化时,`TaskUpdate` 写入目标 owner mailbox 一条 `task_assignment` JSON message。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:272][E: tools/TaskUpdateTool/TaskUpdateTool.ts:273][E: tools/TaskUpdateTool/TaskUpdateTool.ts:277][E: tools/TaskUpdateTool/TaskUpdateTool.ts:280][E: tools/TaskUpdateTool/TaskUpdateTool.ts:288] `addBlocks` 调 `blockTask(taskId, blockId)`,`addBlockedBy` 调 `blockTask(blockerId, taskId)`,并只新增 existing task 未包含的 edges。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:301][E: tools/TaskUpdateTool/TaskUpdateTool.ts:302][E: tools/TaskUpdateTool/TaskUpdateTool.ts:306][E: tools/TaskUpdateTool/TaskUpdateTool.ts:314][E: tools/TaskUpdateTool/TaskUpdateTool.ts:315][E: tools/TaskUpdateTool/TaskUpdateTool.ts:319]

verification nudge 只有在 `feature("VERIFICATION_AGENT")`、GrowthBook `tengu_hive_evidence` true、非 subagent context、刚把 status 更新为 completed 时进入;全部 task 完成、task 数不少于 3 且没有 subject 匹配 `/verif/i` 时设置 `verificationNudgeNeeded = true`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:334][E: tools/TaskUpdateTool/TaskUpdateTool.ts:335][E: tools/TaskUpdateTool/TaskUpdateTool.ts:336][E: tools/TaskUpdateTool/TaskUpdateTool.ts:337][E: tools/TaskUpdateTool/TaskUpdateTool.ts:338][E: tools/TaskUpdateTool/TaskUpdateTool.ts:341][E: tools/TaskUpdateTool/TaskUpdateTool.ts:344][E: tools/TaskUpdateTool/TaskUpdateTool.ts:345][E: tools/TaskUpdateTool/TaskUpdateTool.ts:347]

## 8 渲染

`renderToolUseMessage()` 返回 `null`,因此调用时不显示额外 use message。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:121] `TaskUpdate` 没有自定义 `renderToolResultMessage`,模型侧文本来自 `mapToolResultToToolResultBlockParam()`。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:364][E: tools/TaskUpdateTool/TaskUpdateTool.ts:403]

## 9 设计动机·edge·历史

- `deleted` 不是 `TaskStatusSchema()` 的成员,而是 `TaskUpdateStatusSchema` 额外允许的特殊 action。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:35]
- completed hook failure 不抛异常,而是返回 `success:false` 的 tool result,让模型能读到 hook message 并继续修复。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:255][E: tools/TaskUpdateTool/TaskUpdateTool.ts:261]
- teammate 完成 task 后,mapper 会提示立刻调用 `TaskList` 找下一项或观察被解锁工作。[E: tools/TaskUpdateTool/TaskUpdateTool.ts:388][E: tools/TaskUpdateTool/TaskUpdateTool.ts:390][E: tools/TaskUpdateTool/TaskUpdateTool.ts:393]

## Sources

- `tools/TaskUpdateTool/TaskUpdateTool.ts`
- `tools/TaskUpdateTool/constants.ts`
- `tools/TaskUpdateTool/prompt.ts`
- `utils/tasks.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.task-get`
- `tool.task-list`
