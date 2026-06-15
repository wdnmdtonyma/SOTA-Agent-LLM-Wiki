---
id: tool.task-output
path: surface/tools/task-output.md
title: TaskOutput
kind: tool
tier: T1
status: verified
source: [tools/TaskOutputTool/TaskOutputTool.tsx]
symbols: [TaskOutputTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`TaskOutput` 是读取 background task output/logs 的兼容工具,但源码 description 和 prompt 都标记为 deprecated,建议直接用 `Read` 读取 background task 返回的 output file path。[E: tools/TaskOutputTool/constants.ts:1][E: tools/TaskOutputTool/TaskOutputTool.tsx:157][E: tools/TaskOutputTool/TaskOutputTool.tsx:158][E: tools/TaskOutputTool/TaskOutputTool.tsx:172][E: tools/TaskOutputTool/TaskOutputTool.tsx:173]

## 能回答的问题

- `TaskOutput` 的 `block` 和 `timeout` 如何控制轮询?
- `TaskOutput` 如何从 shell task、local agent task、remote agent task 取输出?
- `TaskOutput` 为什么被标成 deprecated?
- `TaskOutput` 的 render 分支如何区分 task type?

## 1 Identity

- Tool name: `TaskOutput`。[E: tools/TaskOutputTool/constants.ts:1]
- `searchHint`: `read output/logs from a background task`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:146]
- `description`: `[Deprecated] - prefer Read on the task output file path`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:157][E: tools/TaskOutputTool/TaskOutputTool.tsx:158]
- `maxResultSizeChars`: `100_000`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:147]
- Aliases: `AgentOutputTool` 和 `BashOutputTool`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:150]
- 注册与可见性: `TaskOutputTool` 是 base tools 固定成员;当前 dumped source 的 `isEnabled()` 返回 `"external" !== "ant"`,因此在 external artifact 中为 true。[E: tools.ts:196][E: tools/TaskOutputTool/TaskOutputTool.tsx:163][E: tools/TaskOutputTool/TaskOutputTool.tsx:164]

## 2 用途定位

`TaskOutput` prompt 仍描述了旧用途:用 `task_id` 读取 running 或 completed task 的 output 与 status,支持 background shells、async agents、remote sessions,默认 blocking 等待完成。[E: tools/TaskOutputTool/TaskOutputTool.tsx:175][E: tools/TaskOutputTool/TaskOutputTool.tsx:176][E: tools/TaskOutputTool/TaskOutputTool.tsx:177][E: tools/TaskOutputTool/TaskOutputTool.tsx:178][E: tools/TaskOutputTool/TaskOutputTool.tsx:181] 同一 prompt 第一行明确要求优先 `Read` output file path,所以 `TaskOutput` 应被视为兼容路径。[E: tools/TaskOutputTool/TaskOutputTool.tsx:172][E: tools/TaskOutputTool/TaskOutputTool.tsx:173]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `task_id` | `string` | 是 | 无 | 要读取 output 的 task ID。[E: tools/TaskOutputTool/TaskOutputTool.tsx:31] | `validateInput()` 要求非空并存在于 `AppState.tasks`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:183][E: tools/TaskOutputTool/TaskOutputTool.tsx:188][E: tools/TaskOutputTool/TaskOutputTool.tsx:196] |
| `block` | semantic boolean | 否 | `true` | 是否等待 task completion。[E: tools/TaskOutputTool/TaskOutputTool.tsx:32] | schema 使用 `semanticBoolean(z.boolean().default(true))`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:32] |
| `timeout` | `number` | 否 | `30000` | blocking wait 的最大毫秒数。[E: tools/TaskOutputTool/TaskOutputTool.tsx:33] | min 0, max 600000。[E: tools/TaskOutputTool/TaskOutputTool.tsx:33] |

## 4 输出 & maxResultSizeChars

输出包含 `retrieval_status: "success" | "timeout" | "not_ready"` 和 nullable `task`; task output 包含 `task_id`、`task_type`、`status`、`description`、`output`,并可包含 `exitCode`、`error`、`prompt`、`result`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:40][E: tools/TaskOutputTool/TaskOutputTool.tsx:41][E: tools/TaskOutputTool/TaskOutputTool.tsx:42][E: tools/TaskOutputTool/TaskOutputTool.tsx:43][E: tools/TaskOutputTool/TaskOutputTool.tsx:44][E: tools/TaskOutputTool/TaskOutputTool.tsx:45][E: tools/TaskOutputTool/TaskOutputTool.tsx:46][E: tools/TaskOutputTool/TaskOutputTool.tsx:48][E: tools/TaskOutputTool/TaskOutputTool.tsx:49][E: tools/TaskOutputTool/TaskOutputTool.tsx:52][E: tools/TaskOutputTool/TaskOutputTool.tsx:53] mapper 生成 XML-like text:先写 retrieval status,再按 task 字段追加 task id、type、status、exit code、formatted output 和 error。[E: tools/TaskOutputTool/TaskOutputTool.tsx:283][E: tools/TaskOutputTool/TaskOutputTool.tsx:285][E: tools/TaskOutputTool/TaskOutputTool.tsx:287][E: tools/TaskOutputTool/TaskOutputTool.tsx:288][E: tools/TaskOutputTool/TaskOutputTool.tsx:289][E: tools/TaskOutputTool/TaskOutputTool.tsx:290][E: tools/TaskOutputTool/TaskOutputTool.tsx:293][E: tools/TaskOutputTool/TaskOutputTool.tsx:299]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Deprecated task-output schema 可延迟加载。[E: tools/TaskOutputTool/TaskOutputTool.tsx:148] |
| `isEnabled()` | external artifact 为 `true` | 当前 source 中返回 `"external" !== "ant"`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:163][E: tools/TaskOutputTool/TaskOutputTool.tsx:164] |
| `isReadOnly()` | `true` | `TaskOutput` 读取 task output,源码直接返回 true。[E: tools/TaskOutputTool/TaskOutputTool.tsx:166] |
| `isConcurrencySafe()` | 等同 `isReadOnly()` | 源码返回 `this.isReadOnly?.(_input) ?? false`,在本工具中为 true。[E: tools/TaskOutputTool/TaskOutputTool.tsx:160][E: tools/TaskOutputTool/TaskOutputTool.tsx:161][E: tools/TaskOutputTool/TaskOutputTool.tsx:166] |
| `isDestructive()` | 默认 `false` | `TaskOutputTool` 没有 destructive flag override;默认返回 false。[I][E: Tool.ts:761] |
| `toAutoClassifierInput` | `task_id` | auto classifier 只接收 task id。[E: tools/TaskOutputTool/TaskOutputTool.tsx:169][E: tools/TaskOutputTool/TaskOutputTool.tsx:170] |

## 6 权限

`TaskOutput` 未实现 tool-specific `checkPermissions()`;作为 `buildTool(...)` 结果,缺省权限函数返回 `behavior: "allow"` 和原始 `updatedInput`。[I][E: Tool.ts:762][E: Tool.ts:766] `validateInput()` 检查 `task_id` 是否存在于 `AppState.tasks`;缺 `task_id` 返回 errorCode 1,找不到 task 返回 errorCode 2。[E: tools/TaskOutputTool/TaskOutputTool.tsx:188][E: tools/TaskOutputTool/TaskOutputTool.tsx:191][E: tools/TaskOutputTool/TaskOutputTool.tsx:195][E: tools/TaskOutputTool/TaskOutputTool.tsx:200]

## 7 call() 走读

`getTaskOutputData()` 对 `local_bash` 优先读取 in-memory `shellCommand.taskOutput` 的 stdout/stderr,没有 taskOutput object 时退回 disk output;其它 task type 直接读取 disk output。[E: tools/TaskOutputTool/TaskOutputTool.tsx:60][E: tools/TaskOutputTool/TaskOutputTool.tsx:62][E: tools/TaskOutputTool/TaskOutputTool.tsx:64][E: tools/TaskOutputTool/TaskOutputTool.tsx:66][E: tools/TaskOutputTool/TaskOutputTool.tsx:67][E: tools/TaskOutputTool/TaskOutputTool.tsx:70][E: tools/TaskOutputTool/TaskOutputTool.tsx:73] `local_bash` 输出追加 exitCode;`local_agent` 优先使用 in-memory final assistant text 而不是 JSONL transcript;`remote_agent` 把 command 放入 prompt 字段。[E: tools/TaskOutputTool/TaskOutputTool.tsx:84][E: tools/TaskOutputTool/TaskOutputTool.tsx:88][E: tools/TaskOutputTool/TaskOutputTool.tsx:91][E: tools/TaskOutputTool/TaskOutputTool.tsx:98][E: tools/TaskOutputTool/TaskOutputTool.tsx:102][E: tools/TaskOutputTool/TaskOutputTool.tsx:107][E: tools/TaskOutputTool/TaskOutputTool.tsx:111]

`waitForTaskCompletion()` 每 100ms 轮询 `AppState.tasks`,遇到 abort signal 抛 `AbortError`,task 不存在返回 null,task status 不是 `running` 或 `pending` 时返回 task,timeout 后返回当前 state。[E: tools/TaskOutputTool/TaskOutputTool.tsx:118][E: tools/TaskOutputTool/TaskOutputTool.tsx:122][E: tools/TaskOutputTool/TaskOutputTool.tsx:124][E: tools/TaskOutputTool/TaskOutputTool.tsx:128][E: tools/TaskOutputTool/TaskOutputTool.tsx:129][E: tools/TaskOutputTool/TaskOutputTool.tsx:132][E: tools/TaskOutputTool/TaskOutputTool.tsx:137][E: tools/TaskOutputTool/TaskOutputTool.tsx:141]

`call()` 在 `block=false` 时不等待:若 task 已完成或非 pending/running,它先把 task 标记为 `notified: true` 再返回 success;若 task 仍 running/pending,返回 `not_ready` 和当前 output snapshot。[E: tools/TaskOutputTool/TaskOutputTool.tsx:219][E: tools/TaskOutputTool/TaskOutputTool.tsx:221][E: tools/TaskOutputTool/TaskOutputTool.tsx:223][E: tools/TaskOutputTool/TaskOutputTool.tsx:229][E: tools/TaskOutputTool/TaskOutputTool.tsx:234][E: tools/TaskOutputTool/TaskOutputTool.tsx:236] `block=true` 时先发 `waiting_for_task` progress,等待 completion;完成后标记 notified 并返回 success,timeout 或 task 仍 running/pending 时返回 `timeout`。[E: tools/TaskOutputTool/TaskOutputTool.tsx:244][E: tools/TaskOutputTool/TaskOutputTool.tsx:247][E: tools/TaskOutputTool/TaskOutputTool.tsx:253][E: tools/TaskOutputTool/TaskOutputTool.tsx:257][E: tools/TaskOutputTool/TaskOutputTool.tsx:262][E: tools/TaskOutputTool/TaskOutputTool.tsx:272][E: tools/TaskOutputTool/TaskOutputTool.tsx:278]

## 8 渲染

`TaskOutput` 使用 use message、tag、progress、result、rejected 和 error renderers。[E: tools/TaskOutputTool/TaskOutputTool.tsx:309][E: tools/TaskOutputTool/TaskOutputTool.tsx:318][E: tools/TaskOutputTool/TaskOutputTool.tsx:324][E: tools/TaskOutputTool/TaskOutputTool.tsx:338][E: tools/TaskOutputTool/TaskOutputTool.tsx:344][E: tools/TaskOutputTool/TaskOutputTool.tsx:347] use message 在 `block=false` 时显示 `non-blocking`,tag 显示 task id,progress 显示 waiting for task 和 esc hint。[E: tools/TaskOutputTool/TaskOutputTool.tsx:309][E: tools/TaskOutputTool/TaskOutputTool.tsx:314][E: tools/TaskOutputTool/TaskOutputTool.tsx:322][E: tools/TaskOutputTool/TaskOutputTool.tsx:330][E: tools/TaskOutputTool/TaskOutputTool.tsx:333]

result renderer 对 `local_bash` 复用 `BashToolResultMessage`;对 `local_agent` success verbose 显示 prompt/result/error,non-verbose 显示 expand shortcut;timeout/not_ready 显示 still running;对 `remote_agent` 显示 description/status 和可展开 output;其它 task type 显示 description/status 与最多 500 chars output。[E: tools/TaskOutputTool/TaskOutputTool.tsx:384][E: tools/TaskOutputTool/TaskOutputTool.tsx:403][E: tools/TaskOutputTool/TaskOutputTool.tsx:412][E: tools/TaskOutputTool/TaskOutputTool.tsx:415][E: tools/TaskOutputTool/TaskOutputTool.tsx:427][E: tools/TaskOutputTool/TaskOutputTool.tsx:436][E: tools/TaskOutputTool/TaskOutputTool.tsx:477][E: tools/TaskOutputTool/TaskOutputTool.tsx:485][E: tools/TaskOutputTool/TaskOutputTool.tsx:514][E: tools/TaskOutputTool/TaskOutputTool.tsx:526][E: tools/TaskOutputTool/TaskOutputTool.tsx:557][E: tools/TaskOutputTool/TaskOutputTool.tsx:566]

## 9 设计动机·edge·历史

- `local_agent` output 优先取 final assistant text,因为 disk output 是完整 JSONL transcript,不只是 subagent answer。[E: tools/TaskOutputTool/TaskOutputTool.tsx:91][E: tools/TaskOutputTool/TaskOutputTool.tsx:98][E: tools/TaskOutputTool/TaskOutputTool.tsx:102]
- `TaskOutput` 会把已读 completed task 标记为 notified。[E: tools/TaskOutputTool/TaskOutputTool.tsx:223][E: tools/TaskOutputTool/TaskOutputTool.tsx:272]
- deprecation 文案出现于 description 和 prompt,并明确指向 `Read` output file path。[E: tools/TaskOutputTool/TaskOutputTool.tsx:158][E: tools/TaskOutputTool/TaskOutputTool.tsx:173]

## Sources

- `tools/TaskOutputTool/TaskOutputTool.tsx`
- `tools/TaskOutputTool/constants.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.task-stop`
- `tool.read`
