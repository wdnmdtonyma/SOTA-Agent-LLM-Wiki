---
id: tool.todo-write
path: surface/tools/todo-write.md
title: TodoWrite
kind: tool
tier: T1
status: verified
source: [tools/TodoWriteTool/TodoWriteTool.ts]
symbols: [TodoWriteTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TodoWrite` 是 session task checklist 工具, 在旧 todo 流程启用时让模型更新 `AppState.todos` 中当前 session 或 agent 的 todo 列表。[E: tools/TodoWriteTool/constants.ts:1][E: tools/TodoWriteTool/TodoWriteTool.ts:31][E: tools/TodoWriteTool/TodoWriteTool.ts:52][E: tools/TodoWriteTool/TodoWriteTool.ts:67][E: tools/TodoWriteTool/TodoWriteTool.ts:88]

## 能回答的问题

- `TodoWrite` 的 todo item 字段和状态枚举是什么?
- `TodoWrite` 为什么在 Todo V2 启用时禁用?
- `TodoWrite` 清空已完成列表和 verification nudge 的条件是什么?

## 1 Identity

- Tool name: `TodoWrite`。[E: tools/TodoWriteTool/constants.ts:1][E: tools/TodoWriteTool/TodoWriteTool.ts:32]
- `tools.ts` 在 base tools 中注册 `TodoWriteTool`。[E: tools.ts:208]
- `searchHint`: `manage the session task checklist`。[E: tools/TodoWriteTool/TodoWriteTool.ts:33]
- `maxResultSizeChars`: `100_000`。[E: tools/TodoWriteTool/TodoWriteTool.ts:34]
- `strict`: `true`。[E: tools/TodoWriteTool/TodoWriteTool.ts:35]
- `shouldDefer`: `true`。[E: tools/TodoWriteTool/TodoWriteTool.ts:51]

## 2 用途定位

`TodoWrite` 的 prompt 要求把复杂多步任务、显式 todo 请求和多任务请求转成结构化 task list, 并要求恰好一个 `in_progress` task。[E: tools/TodoWriteTool/prompt.ts:3][E: tools/TodoWriteTool/prompt.ts:9][E: tools/TodoWriteTool/prompt.ts:11][E: tools/TodoWriteTool/prompt.ts:14][E: tools/TodoWriteTool/prompt.ts:158]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `todos` | `TodoItem[]` | 是 | 无 | 顶层唯一字段, 描述为 updated todo list。[E: tools/TodoWriteTool/TodoWriteTool.ts:14][E: tools/TodoWriteTool/TodoWriteTool.ts:15] |
| `todos[].content` | `string` | 是 | 无 | 不允许空字符串。[E: utils/todo/types.ts:8][E: utils/todo/types.ts:10] |
| `todos[].status` | `pending | in_progress | completed` | 是 | 无 | 状态枚举来自 `TodoStatusSchema`。[E: utils/todo/types.ts:4][E: utils/todo/types.ts:5] |
| `todos[].activeForm` | `string` | 是 | 无 | 不允许空字符串, prompt 要求使用 present continuous form。[E: utils/todo/types.ts:12][E: tools/TodoWriteTool/prompt.ts:151][E: tools/TodoWriteTool/prompt.ts:153] |

## 4 输出 & maxResultSizeChars

输出 schema 包含 `oldTodos`、`newTodos` 和可选 `verificationNudgeNeeded`。[E: tools/TodoWriteTool/TodoWriteTool.ts:22][E: tools/TodoWriteTool/TodoWriteTool.ts:24] `call()` 返回执行前 `oldTodos`、输入中的 `todos` 作为 `newTodos`, 以及 nudge 标记。[E: tools/TodoWriteTool/TodoWriteTool.ts:98][E: tools/TodoWriteTool/TodoWriteTool.ts:100] `mapToolResultToToolResultBlockParam()` 返回固定成功提示, 并在 `verificationNudgeNeeded` 为真时追加 verification agent 提醒。[E: tools/TodoWriteTool/TodoWriteTool.ts:105][E: tools/TodoWriteTool/TodoWriteTool.ts:108][E: tools/TodoWriteTool/TodoWriteTool.ts:112]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isEnabled()` | `!isTodoV2Enabled()` | Todo V2 启用时, `tools.ts` 会注册 TaskCreate/TaskGet/TaskUpdate/TaskList, `TodoWriteTool` 自身返回 disabled。[E: tools/TodoWriteTool/TodoWriteTool.ts:52][E: tools/TodoWriteTool/TodoWriteTool.ts:53][E: tools.ts:218][E: tools.ts:219][E: tools.ts:220] |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/TodoWriteTool/TodoWriteTool.ts:51] |
| `isConcurrencySafe()` | 默认 `false` | 未看到工具自定义该方法[I]; `buildTool` 默认 false。[E: Tool.ts:759] |
| `isReadOnly()` | 默认 `false` | 未看到工具自定义该方法[I]; `buildTool` 默认 false, 且 `call()` 会写 `AppState.todos`。[E: tools/TodoWriteTool/TodoWriteTool.ts:88][E: Tool.ts:760] |
| `checkPermissions()` | 固定 allow | 源码直接返回 `{ behavior: 'allow', updatedInput: input }`。[E: tools/TodoWriteTool/TodoWriteTool.ts:58][E: tools/TodoWriteTool/TodoWriteTool.ts:60] |
| `toAutoClassifierInput()` | `${todos.length} items` | 分类器只看到 todo 数量摘要。[E: tools/TodoWriteTool/TodoWriteTool.ts:55][E: tools/TodoWriteTool/TodoWriteTool.ts:56] |

## 6 权限

`TodoWrite` 不要求用户确认, `checkPermissions()` 总是 allow。[E: tools/TodoWriteTool/TodoWriteTool.ts:58][E: tools/TodoWriteTool/TodoWriteTool.ts:60] 未看到该工具自定义 `validateInput()`[I]; schema 校验由 `inputSchema` 和 `TodoListSchema` 承担。[E: tools/TodoWriteTool/TodoWriteTool.ts:42][E: tools/TodoWriteTool/TodoWriteTool.ts:44][E: utils/todo/types.ts:17]

## 7 call() 走读

`call()` 从 `context.getAppState()` 读取状态, todo key 优先使用 `context.agentId`, 没有 agentId 时使用 `getSessionId()`。[E: tools/TodoWriteTool/TodoWriteTool.ts:66][E: tools/TodoWriteTool/TodoWriteTool.ts:67] 当所有输入 todo 都是 `completed` 时, 写入 `AppState.todos[todoKey]` 的值是空数组; 否则写入输入 todo 列表。[E: tools/TodoWriteTool/TodoWriteTool.ts:69][E: tools/TodoWriteTool/TodoWriteTool.ts:70][E: tools/TodoWriteTool/TodoWriteTool.ts:88][E: tools/TodoWriteTool/TodoWriteTool.ts:94] verification nudge 需要 `VERIFICATION_AGENT` feature、GrowthBook gate、主线程、全部完成、至少 3 个 todo, 且没有 todo content 匹配 `/verif/i`。[E: tools/TodoWriteTool/TodoWriteTool.ts:78][E: tools/TodoWriteTool/TodoWriteTool.ts:83][E: tools/TodoWriteTool/TodoWriteTool.ts:85]

## 8 渲染

`renderToolUseMessage()` 返回 `null`, 所以 tool use 本身不在 transcript 中展示独立消息。[E: tools/TodoWriteTool/TodoWriteTool.ts:62][E: tools/TodoWriteTool/TodoWriteTool.ts:63] 工具结果通过 `mapToolResultToToolResultBlockParam()` 给模型, UI 侧 todo 面板更新来自 `AppState.todos` 写入路径。[E: tools/TodoWriteTool/TodoWriteTool.ts:88][E: tools/TodoWriteTool/TodoWriteTool.ts:104]

## 9 设计动机·edge·历史

- prompt 要求 todo descriptions 同时包含 `content` 和 `activeForm`, 与 `TodoItemSchema` 的两个 string 字段一致。[E: tools/TodoWriteTool/prompt.ts:152][E: tools/TodoWriteTool/prompt.ts:153][E: utils/todo/types.ts:10][E: utils/todo/types.ts:12]
- prompt 要求完成后立即标记, 不批量完成, 且任意时刻恰好一个 `in_progress`。[E: tools/TodoWriteTool/prompt.ts:157][E: tools/TodoWriteTool/prompt.ts:158]
- verification nudge 只在主线程 closing out 3+ item list 且没有 verification task 时触发。[E: tools/TodoWriteTool/TodoWriteTool.ts:80][E: tools/TodoWriteTool/TodoWriteTool.ts:83]

## Sources

- `tools/TodoWriteTool/TodoWriteTool.ts`
- `tools/TodoWriteTool/constants.ts`
- `tools/TodoWriteTool/prompt.ts`
- `utils/todo/types.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.task-create`
- `tool.task-list`
