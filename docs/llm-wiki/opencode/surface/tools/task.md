---
id: tool.task
title: Task 工具(spawn 子 agent,V1)
kind: tool
tier: T1
v: v1
source: [packages/opencode/src/tool/task.ts, packages/opencode/src/tool/task.txt, packages/opencode/src/agent/subagent-permissions.ts, packages/opencode/src/tool/registry.ts, packages/opencode/src/session/prompt.ts, packages/opencode/src/background/job.ts, packages/opencode/src/effect/runtime-flags.ts, packages/opencode/src/tool/tool.ts, packages/core/src/background-job.ts, packages/core/src/tool/builtins.ts]
symbols: [TaskTool, TaskPromptOps, deriveSubagentSessionPermission, BackgroundJob]
related: [agent.builtins, execution.background]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Task 工具是 V1 活跑路径里的子 agent dispatcher：模型调用 wire id `task` 后，V1 在同一 opencode 进程内创建或续接 child session，并用 `SessionPrompt` 继续驱动该 child session。

## 能回答的问题

- `task` 工具为什么只属于 V1，V2 是否已经 port？
- `background` 字段何时出现在 LLM-visible schema？
- `task_id` 如何续接之前的 subagent session？
- 子 agent session 的 permission ruleset 如何从 parent session 与 subagent config 派生？
- foreground 与 background subagent 的 execute() 控制流有什么差异？

## 1 Identity

V1 `TaskTool` 的 wire id 是常量 `id = "task"`，并通过 `Tool.define(id, ...)` 生成工具定义。[E: packages/opencode/src/tool/task.ts:24][E: packages/opencode/src/tool/task.ts:81][E: packages/opencode/src/tool/task.ts:82] `ToolRegistry.layer` 初始化 `TaskTool`，再把 `tool.task` 放进 `builtin` 列表，所以 V1 registry 默认会暴露 task 工具。[E: packages/opencode/src/tool/registry.ts:93][E: packages/opencode/src/tool/registry.ts:228]

Task 是 V1-only 节点。V2 `BuiltInTools.locationLayer` 的静态内建工具列表注册 ApplyPatch/Bash/Edit/Glob/Grep/Question/Read/Skill/TodoWrite/WebFetch/WebSearch/Write，没有注册 task。[E: packages/core/src/tool/builtins.ts:31][E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I]

## 2 用途定位

V1 Task 用来把复杂、多步、可自治的工作交给 subagent；tool prompt 明确要求调用方指定 `subagent_type`，并建议在可能时并发启动多个 agent。[E: packages/opencode/src/tool/task.txt:1][E: packages/opencode/src/tool/task.txt:3][E: packages/opencode/src/tool/task.txt:13] registry 在拼接 model-visible available agents 时过滤 `item.mode !== "primary"`，所以可选列表不是 primary agents。[E: packages/opencode/src/tool/registry.ts:253] 新 task 默认新建 child session；传入 `task_id` 时会尝试把该 id 当作既有 session id 续接，查不到既有 session 时回落到 `sessions.create()`。[E: packages/opencode/src/tool/task.ts:47][E: packages/opencode/src/tool/task.ts:49][E: packages/opencode/src/tool/task.ts:121][E: packages/opencode/src/tool/task.ts:122][E: packages/opencode/src/tool/task.ts:142][E: packages/opencode/src/tool/task.ts:144]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `description` | `string` | 是 | 无 | schema 描述为 3-5 words | task 在 UI/metadata/title 中展示的短描述。[E: packages/opencode/src/tool/task.ts:43][E: packages/opencode/src/tool/task.ts:179][E: packages/opencode/src/tool/task.ts:244] |
| `prompt` | `string` | 是 | 无 | 由 `resolvePromptParts()` 解析为 prompt parts | 给 subagent 的完整任务说明。[E: packages/opencode/src/tool/task.ts:45][E: packages/opencode/src/tool/task.ts:187] |
| `subagent_type` | `string` | 是 | 无 | 必须能被 `Agent.Service.get()` 找到 | 选择哪个 specialized agent。[E: packages/opencode/src/tool/task.ts:46][E: packages/opencode/src/tool/task.ts:116][E: packages/opencode/src/tool/task.ts:118] |
| `task_id` | optional `string` | 否 | 无 | 传入后按 `SessionID.make(task_id)` 查 session，失败则退回新建 | 续接同一个 subagent session。[E: packages/opencode/src/tool/task.ts:47][E: packages/opencode/src/tool/task.ts:121][E: packages/opencode/src/tool/task.ts:122][E: packages/opencode/src/tool/task.ts:142][E: packages/opencode/src/tool/task.ts:144] |
| `command` | optional `string` | 否 | 无 | execute 没有读取该字段的分支约束 [I] | 标记触发 task 的 slash command。[E: packages/opencode/src/tool/task.ts:51] |
| `background` | optional `boolean` | 否 | effective false when not exactly `true` | 只有 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` 开启时才应暴露给模型；`OPENCODE_EXPERIMENTAL=true` 总开关同样使之生效 | true 时异步运行并返回 running 结果。[E: packages/opencode/src/tool/task.ts:56][E: packages/opencode/src/tool/task.ts:58][E: packages/opencode/src/tool/task.ts:97][E: packages/opencode/src/effect/runtime-flags.ts:43][E: packages/opencode/src/effect/runtime-flags.ts:11][E: packages/opencode/src/tool/task.ts:337][E: packages/opencode/src/tool/task.ts:341][E: packages/opencode/src/tool/task.ts:291][E: packages/opencode/src/tool/task.ts:293] |

`background` 的 schema 是一个命名陷阱：TypeScript `Parameters` 总是包含 `background`，但 registry 传给模型的 JSON Schema 在 experimental flag 关闭时改用 `BaseParameters`，所以 LLM-visible schema 不包含 `background`。[E: packages/opencode/src/tool/task.ts:56][E: packages/opencode/src/tool/task.ts:340][E: packages/opencode/src/tool/task.ts:341] `experimentalBackgroundSubagents` 由 `enabledByExperimental("OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS")` 计算，因此 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` 或总开关 `OPENCODE_EXPERIMENTAL=true` 均可启用。[E: packages/opencode/src/effect/runtime-flags.ts:43][E: packages/opencode/src/effect/runtime-flags.ts:11] 如果仍然带 `background: true` 调用且 flag 关闭，execute 会失败并提示需要 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`。[E: packages/opencode/src/tool/task.ts:98][E: packages/opencode/src/tool/task.ts:100]

## 4 输出 & 大小/截断限制

Task 输出是 XML-like `<task id="..." state="...">` 包裹的 text，`state` 只能由调用点传入 `"running" | "completed" | "error"`，错误状态使用 `<task_error>`，其它状态使用 `<task_result>`。[E: packages/opencode/src/tool/task.ts:64][E: packages/opencode/src/tool/task.ts:66][E: packages/opencode/src/tool/task.ts:70][E: packages/opencode/src/tool/task.ts:72][E: packages/opencode/src/tool/task.ts:74] foreground 完成时返回 `state: "completed"` 与 subagent 最后一段 text；background started/updated 返回 `state: "running"` 并在 metadata 放 `background: true` 和 `jobId`。[E: packages/opencode/src/tool/task.ts:199][E: packages/opencode/src/tool/task.ts:319][E: packages/opencode/src/tool/task.ts:247][E: packages/opencode/src/tool/task.ts:248][E: packages/opencode/src/tool/task.ts:279][E: packages/opencode/src/tool/task.ts:280]

Task 本身不实现专用截断[I]；V1 `Tool.define` 包装层会在 result 没有 `metadata.truncated` 时调用 `Truncate.Service.output()` 做通用输出 bounding。[E: packages/opencode/src/tool/tool.ts:131][E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:138][E: packages/opencode/src/tool/tool.ts:141]

## 5 权限

Task 先用 parent turn 的 `ctx.ask` 请求 `permission: "task"`，`patterns` 是 `subagent_type`，`always` 是 `["*"]`；`ctx.extra.bypassAgentCheck` 为 true 时跳过这一步，V1 subtask/command 内部调用会设置该 bypass。[E: packages/opencode/src/tool/task.ts:104][E: packages/opencode/src/tool/task.ts:105][E: packages/opencode/src/tool/task.ts:106][E: packages/opencode/src/tool/task.ts:107][E: packages/opencode/src/tool/task.ts:108][E: packages/opencode/src/session/prompt.ts:315]

child session 的 permission 不是简单复制 parent agent：`deriveSubagentSessionPermission()` 只继承 parent session 的 deny rules 与 `external_directory` rules，再按 subagent 自己的 permission 是否包含 `todowrite`/`task` 决定是否追加默认 deny。[E: packages/opencode/src/agent/subagent-permissions.ts:14][E: packages/opencode/src/agent/subagent-permissions.ts:18][E: packages/opencode/src/agent/subagent-permissions.ts:19][E: packages/opencode/src/agent/subagent-permissions.ts:21][E: packages/opencode/src/agent/subagent-permissions.ts:22][E: packages/opencode/src/agent/subagent-permissions.ts:24][E: packages/opencode/src/agent/subagent-permissions.ts:25] `TaskTool` 还会把 `cfg.experimental?.primary_tools` 逐项转成 child deny rule，防止 subagent 使用 primary-only tools。[E: packages/opencode/src/tool/task.ts:136][E: packages/opencode/src/tool/task.ts:137][E: packages/opencode/src/tool/task.ts:139]

## 6 execute() 走读

1. `TaskTool.execute` 读取 config、runtime flags 和 assistant message；如果当前 tool call 不属于 assistant message，直接失败。[E: packages/opencode/src/tool/task.ts:89][E: packages/opencode/src/tool/task.ts:96][E: packages/opencode/src/tool/task.ts:98][E: packages/opencode/src/tool/task.ts:160][E: packages/opencode/src/tool/task.ts:164]
2. V1 Task 校验 `subagent_type` 存在；没有 `task_id` 时创建 child session，child title 是 `${description} (@${next.name} subagent)`，child agent 是 `next.name`。[E: packages/opencode/src/tool/task.ts:116][E: packages/opencode/src/tool/task.ts:144][E: packages/opencode/src/tool/task.ts:146][E: packages/opencode/src/tool/task.ts:147]
3. child model 优先使用 subagent 自己的 `next.model`，否则继承 parent assistant message 的 `modelID/providerID`。[E: packages/opencode/src/tool/task.ts:167][E: packages/opencode/src/tool/task.ts:168][E: packages/opencode/src/tool/task.ts:169]
4. execute 要求 `ctx.extra.promptOps` 存在；该对象提供 cancel、resolvePromptParts 和 prompt，是 Task 调回 `SessionPrompt` 的桥。[E: packages/opencode/src/tool/task.ts:183][E: packages/opencode/src/tool/task.ts:184][E: packages/opencode/src/session/prompt.ts:128][E: packages/opencode/src/session/prompt.ts:133]
5. `runTask()` 解析 prompt parts 后调用 `ops.prompt()`，目标 session 是 child session，agent 是 subagent，最后返回最后一个 text part 的 text。[E: packages/opencode/src/tool/task.ts:186][E: packages/opencode/src/tool/task.ts:187][E: packages/opencode/src/tool/task.ts:188][E: packages/opencode/src/tool/task.ts:190][E: packages/opencode/src/tool/task.ts:196][E: packages/opencode/src/tool/task.ts:199]
6. 如果已有同 id background job 正在跑，`background.extend()` 会把新 run 排到旧 tail 之后，并返回 “Background task updated”。[E: packages/opencode/src/tool/task.ts:242][E: packages/opencode/src/tool/task.ts:253][E: packages/core/src/background-job.ts:262][E: packages/core/src/background-job.ts:263][E: packages/core/src/background-job.ts:281]
7. 新 job 通过 `background.start()` 注册；`onPromote` 会把 parent tool metadata 改成 background 并启动 completion notification。[E: packages/opencode/src/tool/task.ts:259][E: packages/opencode/src/tool/task.ts:264][E: packages/opencode/src/tool/task.ts:267][E: packages/opencode/src/tool/task.ts:269]
8. foreground 默认等待 `background.wait()` 或 `waitForPromotion()`；如果 job 被 promote 成 background，foreground 调用也返回 running background result。[E: packages/opencode/src/tool/task.ts:310][E: packages/opencode/src/tool/task.ts:311][E: packages/opencode/src/tool/task.ts:313]
9. foreground abort 会触发 child session cancel；Effect interrupt release 阶段还会 cancel background job。[E: packages/opencode/src/tool/task.ts:297][E: packages/opencode/src/tool/task.ts:300][E: packages/opencode/src/tool/task.ts:305][E: packages/opencode/src/tool/task.ts:324][E: packages/opencode/src/tool/task.ts:325]

## 7 V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 注册 | `tool.task` 在 V1 `ToolRegistry` builtin 列表中默认存在。[E: packages/opencode/src/tool/registry.ts:228] | V2 builtins 注册列表没有 task。[E: packages/core/src/tool/builtins.ts:31][E: packages/core/src/tool/builtins.ts:43][I] |
| 执行模型 | 通过 `SessionPrompt` 在 child session 中跑 V1 loop。[E: packages/opencode/src/tool/task.ts:188][E: packages/opencode/src/tool/task.ts:190] | 没有 V2 task leaf。[E: packages/core/src/tool/builtins.ts:31][E: packages/core/src/tool/builtins.ts:43][I] |
| 背景模式 | 可选 experimental；field 只有 flag 开启才暴露给模型。[E: packages/opencode/src/tool/task.ts:337][E: packages/opencode/src/tool/task.ts:341] | 没有 V2 equivalent。[E: packages/core/src/tool/builtins.ts:31][E: packages/core/src/tool/builtins.ts:43][I] |

## 8 设计动机·edge·历史

Task 的设计目标是“用独立 agent 上下文处理复杂多步任务”，而不是替代 Read/Grep 这类精确工具；prompt 明确要求找特定文件、类定义或 2-3 个文件内代码时使用 Read/Glob/Grep。[E: packages/opencode/src/tool/task.txt:5][E: packages/opencode/src/tool/task.txt:6][E: packages/opencode/src/tool/task.txt:7][E: packages/opencode/src/tool/task.txt:8] BackgroundJob 的状态保存在内存 `SynchronizedRef<Map<string, Active>>` 中，V1 legacy layer 又通过 `InstanceState.make(() => CoreBackgroundJob.make)` 保持 instance-scoped，所以 background subagent 不是 durable V2 activity。[E: packages/core/src/background-job.ts:120][E: packages/core/src/background-job.ts:121][E: packages/opencode/src/background/job.ts:21][I]

## Sources

- packages/opencode/src/tool/task.ts
- packages/opencode/src/tool/task.txt
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/agent/subagent-permissions.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/background/job.ts
- packages/opencode/src/effect/runtime-flags.ts
- packages/opencode/src/tool/tool.ts
- packages/core/src/background-job.ts
- packages/core/src/tool/builtins.ts

## 相关

- [内置 agents 目录](../agents/builtins.md)
- [后台 jobs](../../subsystems/execution/background.md)
