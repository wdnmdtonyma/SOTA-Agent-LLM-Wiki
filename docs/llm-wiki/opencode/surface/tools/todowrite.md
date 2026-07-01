---
id: tool.todowrite
title: TodoWrite 工具
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/todo.ts, packages/opencode/src/tool/todowrite.txt, packages/opencode/src/session/todo.ts, packages/opencode/src/tool/registry.ts, packages/opencode/src/tool/tool.ts, packages/core/src/tool/todowrite.ts, packages/core/src/session/todo.ts, packages/core/src/tool/tool.ts, packages/core/src/tool/builtins.ts, packages/core/src/tool/registry.ts, packages/schema/src/session-todo.ts]
symbols: [TodoWriteTool, Todo, SessionTodo]
related: [ref.tool-catalog]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> TodoWrite 工具维护当前 session 的结构化 todo list；V1 与 V2 的字段语义基本同构[I]，但 V1 输出 `{ title, output, metadata }`，V2 输出经 output schema encode 的 `{ todos }` structured result。[E: packages/opencode/src/tool/todo.ts:37][E: packages/opencode/src/tool/todo.ts:38][E: packages/opencode/src/tool/todo.ts:39][E: packages/opencode/src/tool/todo.ts:40][E: packages/core/src/tool/todowrite.ts:18][E: packages/core/src/tool/todowrite.ts:19][E: packages/core/src/tool/tool.ts:97][E: packages/core/src/tool/tool.ts:100]

## 能回答的问题

- `todowrite` 的 todo item 字段和状态值是什么？
- V1/V2 是否把 `status`、`priority` 做成 enum？
- TodoWrite 写入后如何持久化顺序？
- V1 `ctx.ask` 与 V2 `permission.assert` 的 action/resources 是什么？
- TodoWrite prompt 规定何时使用、何时跳过？

## V1

### 1 Identity

V1 文件名是 `todo.ts`，但 exported tool 是 `TodoWriteTool`，wire id 是 `"todowrite"`；V1 registry 初始化 `TodoWriteTool` 并把 `tool.todo` 放入 builtin 列表。[E: packages/opencode/src/tool/todo.ts:14][E: packages/opencode/src/tool/todo.ts:15][E: packages/opencode/src/tool/registry.ts:95][E: packages/opencode/src/tool/registry.ts:207][E: packages/opencode/src/tool/registry.ts:229]

### 2 用途定位

V1 TodoWrite prompt 要求在 3+ distinct steps、非平凡多步任务、用户给出多个任务或明确要求 todo list 时主动使用，并要求实时更新状态、剩余工作中最多一个 `in_progress`。[E: packages/opencode/src/tool/todowrite.txt:5][E: packages/opencode/src/tool/todowrite.txt:6][E: packages/opencode/src/tool/todowrite.txt:7][E: packages/opencode/src/tool/todowrite.txt:25][E: packages/opencode/src/tool/todowrite.txt:27]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `todos` | mutable array of todo item | 是 | 无 | 替换当前 session 的完整 todo list | 新 todo list。[E: packages/opencode/src/tool/todo.ts:6][E: packages/opencode/src/tool/todo.ts:7][E: packages/opencode/src/session/todo.ts:29][E: packages/opencode/src/session/todo.ts:33][E: packages/opencode/src/session/todo.ts:38] |
| `todos[].content` | `string` | 是 | 无 | 无额外 schema 约束 | 任务简述。[E: packages/schema/src/session-todo.ts:7][E: packages/schema/src/session-todo.ts:8] |
| `todos[].status` | `string` | 是 | 无 | 描述列出 `pending/in_progress/completed/cancelled`，源码不是 literal enum | 当前状态。[E: packages/schema/src/session-todo.ts:9][E: packages/schema/src/session-todo.ts:10] |
| `todos[].priority` | `string` | 是 | 无 | 描述列出 `high/medium/low`，源码不是 literal enum | 优先级。[E: packages/schema/src/session-todo.ts:12][E: packages/schema/src/session-todo.ts:13] |

### 4 输出 & 大小/截断限制

V1 TodoWrite title 是未完成 todo 数：`params.todos.filter((x) => x.status !== "completed").length`；output 是 todo list 的 pretty JSON，metadata 保存同一份 `todos`。[E: packages/opencode/src/tool/todo.ts:37][E: packages/opencode/src/tool/todo.ts:38][E: packages/opencode/src/tool/todo.ts:39][E: packages/opencode/src/tool/todo.ts:40] TodoWrite 没有专用截断[I]，V1 通用 `Tool.define` wrapper 会处理 output bounding。[E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:138]

### 5 权限

V1 TodoWrite 用 `ctx.ask` 请求 `permission: "todowrite"`，`patterns` 和 `always` 都是 `["*"]`。[E: packages/opencode/src/tool/todo.ts:24][E: packages/opencode/src/tool/todo.ts:25][E: packages/opencode/src/tool/todo.ts:26][E: packages/opencode/src/tool/todo.ts:27]

### 6 execute() 走读

1. V1 execute 先做 todo permission request。[E: packages/opencode/src/tool/todo.ts:24]
2. permission 通过后调用 `Todo.Service.update({ sessionID, todos })`，sessionID 来自 tool context。[E: packages/opencode/src/tool/todo.ts:31][E: packages/opencode/src/tool/todo.ts:32][E: packages/opencode/src/tool/todo.ts:33]
3. V1 `Todo.update()` 在事务里先删除该 session 的所有 `TodoTable` 行，再按 array position insert 新 rows，因此传入顺序就是持久化顺序。[E: packages/opencode/src/session/todo.ts:31][E: packages/opencode/src/session/todo.ts:33][E: packages/opencode/src/session/todo.ts:38][E: packages/opencode/src/session/todo.ts:43][E: packages/opencode/src/session/todo.ts:46]
4. update 完成后发布 `todo.updated` event。[E: packages/schema/src/session-todo.ts:18][E: packages/schema/src/session-todo.ts:19][E: packages/opencode/src/session/todo.ts:50]

## V2

### 1 Identity

V2 `TodoWriteTool` name 常量是 `"todowrite"`，以 `[name]: Tool.make(...)` 注册；`BuiltInTools.node` 把 `TodoWriteTool.node` 放入内建工具依赖列表。[E: packages/core/src/tool/todowrite.ts:12][E: packages/core/src/tool/todowrite.ts:32][E: packages/core/src/tool/todowrite.ts:33][E: packages/core/src/tool/builtins.ts:43]

### 2 用途定位

V2 description 是简短内联字符串：创建并维护当前 coding session 的 structured task list，用于多步工作中追踪进度和保持 todo status 当前。[E: packages/core/src/tool/todowrite.ts:34][E: packages/core/src/tool/todowrite.ts:35]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `todos` | array of `SessionTodo.Info` | 是 | 无 | 替换完整 todo list | 新 todo list。[E: packages/core/src/tool/todowrite.ts:14][E: packages/core/src/tool/todowrite.ts:15][E: packages/core/src/session/todo.ts:32][E: packages/core/src/session/todo.ts:39][E: packages/core/src/session/todo.ts:44] |
| `todos[].content` | `string` | 是 | 无 | 无额外 schema 约束 | 任务简述。[E: packages/schema/src/session-todo.ts:7][E: packages/schema/src/session-todo.ts:8] |
| `todos[].status` | `string` | 是 | 无 | 描述列出 `pending/in_progress/completed/cancelled`，源码不是 literal enum | 当前状态。[E: packages/schema/src/session-todo.ts:9][E: packages/schema/src/session-todo.ts:10] |
| `todos[].priority` | `string` | 是 | 无 | 描述列出 `high/medium/low`，源码不是 literal enum | 优先级。[E: packages/schema/src/session-todo.ts:12][E: packages/schema/src/session-todo.ts:13] |

### 4 输出 & 大小/截断限制

V2 output schema 是 `{ todos: SessionTodo.Info[] }`，`toModelOutput` 是 `JSON.stringify(output.todos, null, 2)`。[E: packages/core/src/tool/todowrite.ts:18][E: packages/core/src/tool/todowrite.ts:19][E: packages/core/src/tool/todowrite.ts:23][E: packages/core/src/tool/todowrite.ts:38] Generic model-output bounding 由 V2 `ToolRegistry` settle 阶段负责。[E: packages/core/src/tool/registry.ts:75][E: packages/core/src/tool/registry.ts:76]

### 5 权限

V2 TodoWrite 用 `PermissionV2.assert` 请求 `action: "todowrite"`，`resources: ["*"]`，`save: ["*"]`，source 携带 message/call id。[E: packages/core/src/tool/todowrite.ts:41][E: packages/core/src/tool/todowrite.ts:42][E: packages/core/src/tool/todowrite.ts:43][E: packages/core/src/tool/todowrite.ts:44][E: packages/core/src/tool/todowrite.ts:47]

### 6 execute() 走读

1. V2 execute 先 assert permission。[E: packages/core/src/tool/todowrite.ts:41]
2. permission 通过后调用 `SessionTodo.update({ sessionID, todos: input.todos })`。[E: packages/core/src/tool/todowrite.ts:49]
3. V2 `SessionTodo.update()` 与 V1 一样先删除该 session 的 todo rows，再按 array position 插入，最后发布 `todo.updated` event。[E: packages/core/src/session/todo.ts:37][E: packages/core/src/session/todo.ts:39][E: packages/core/src/session/todo.ts:44][E: packages/core/src/session/todo.ts:49][E: packages/core/src/session/todo.ts:56]
4. execute 成功返回 `{ todos: input.todos }`；失败映射成 `ToolFailure({ message: "Unable to update todos" })`。[E: packages/core/src/tool/todowrite.ts:50][E: packages/core/src/tool/todowrite.ts:51]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 模块/export identity | `packages/opencode/src/tool/todo.ts` exports `TodoWriteTool`。[E: packages/opencode/src/tool/todo.ts:14] | `packages/core/src/tool/todowrite.ts` re-exports module namespace `TodoWriteTool`。[E: packages/core/src/tool/todowrite.ts:1] |
| 输入字段 | Reuse `Todo.Info` from shared session todo schema，字段是 string，不是 enum。[E: packages/opencode/src/tool/todo.ts:7][E: packages/opencode/src/session/todo.ts:11][E: packages/schema/src/session-todo.ts:8][E: packages/schema/src/session-todo.ts:9][E: packages/schema/src/session-todo.ts:12] | Reuse `SessionTodo.Info`，字段同样是 string，不是 enum。[E: packages/core/src/tool/todowrite.ts:15][E: packages/core/src/session/todo.ts:12][E: packages/schema/src/session-todo.ts:8][E: packages/schema/src/session-todo.ts:9][E: packages/schema/src/session-todo.ts:12] |
| 输出 | V1 result 包含 title、JSON string output、metadata.todos。[E: packages/opencode/src/tool/todo.ts:37][E: packages/opencode/src/tool/todo.ts:38][E: packages/opencode/src/tool/todo.ts:39][E: packages/opencode/src/tool/todo.ts:40] | V2 result 是 structured `{ todos }`，模型 text 由 `toModelOutput` 生成。[E: packages/core/src/tool/todowrite.ts:18][E: packages/core/src/tool/todowrite.ts:19][E: packages/core/src/tool/todowrite.ts:23][E: packages/core/src/tool/todowrite.ts:38][E: packages/core/src/tool/todowrite.ts:50] |
| 权限 | `ctx.ask({ permission: "todowrite" })`。[E: packages/opencode/src/tool/todo.ts:24][E: packages/opencode/src/tool/todo.ts:25] | `permission.assert({ action: "todowrite" })`。[E: packages/core/src/tool/todowrite.ts:41][E: packages/core/src/tool/todowrite.ts:42] |

## 设计动机·edge·历史

Todo item 的状态值和优先级值是 documentation 约定，不是 schema-level enum；这意味着 schema validation 不会拒绝拼错的 status 或 priority，行为正确性依赖模型遵守 `todowrite.txt` 与 UI/调用方约定。[E: packages/schema/src/session-todo.ts:9][E: packages/schema/src/session-todo.ts:12][E: packages/opencode/src/tool/todowrite.txt:19][E: packages/opencode/src/tool/todowrite.txt:20][E: packages/opencode/src/tool/todowrite.txt:21][E: packages/opencode/src/tool/todowrite.txt:22][I]

## Sources

- packages/opencode/src/tool/todo.ts
- packages/opencode/src/tool/todowrite.txt
- packages/opencode/src/session/todo.ts
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/tool/tool.ts
- packages/core/src/tool/todowrite.ts
- packages/core/src/session/todo.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/builtins.ts
- packages/core/src/tool/registry.ts
- packages/schema/src/session-todo.ts

## 相关

- [全工具字段 catalog](../../reference/tool-catalog.md)
