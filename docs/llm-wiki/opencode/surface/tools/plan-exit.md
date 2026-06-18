---
id: tool.plan-exit
title: Plan-Exit 工具(experimental,V1)
kind: tool
tier: T1
v: v1
source: [packages/opencode/src/tool/plan.ts, packages/opencode/src/tool/plan-exit.txt, packages/opencode/src/tool/registry.ts, packages/opencode/src/effect/runtime-flags.ts, packages/opencode/src/session/session.ts, packages/opencode/src/tool/tool.ts, packages/core/src/tool/builtins.ts]
symbols: [PlanExitTool]
related: [agent.builtins, prompt.system-prompts]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Plan-Exit 工具是 V1 plan mode 的实验性退出工具；它询问用户是否从 plan agent 切到 build agent，并在用户同意后写入一条 build-agent user message，再写入 `synthetic: true` 的 text part。

## 能回答的问题

- `plan_exit` 由哪些 flag/client 条件门控？
- Plan-Exit 的输入 schema 为什么是空对象？
- 用户回答 Yes/No 后分别发生什么？
- Plan-Exit 如何找到 plan file path？
- V2 是否有 `plan_exit` tool？

## 1 Identity

V1 `PlanExitTool` 通过 `Tool.define("plan_exit", ...)` 注册；V1 registry 初始化 `PlanExitTool`，但只有 `flags.experimentalPlanMode && flags.client === "cli"` 时才放入 builtin 列表。[E: packages/opencode/src/tool/plan.ts:15][E: packages/opencode/src/tool/plan.ts:16][E: packages/opencode/src/tool/registry.ts:98][E: packages/opencode/src/tool/registry.ts:214][E: packages/opencode/src/tool/registry.ts:235] `experimentalPlanMode` 来自 `enabledByExperimental("OPENCODE_EXPERIMENTAL_PLAN_MODE")`，因此 `OPENCODE_EXPERIMENTAL_PLAN_MODE=true` 或总开关 `OPENCODE_EXPERIMENTAL=true` 均可启用；`client` 来自 `OPENCODE_CLIENT` 且默认 `"cli"`。[E: packages/opencode/src/effect/runtime-flags.ts:10][E: packages/opencode/src/effect/runtime-flags.ts:11][E: packages/opencode/src/effect/runtime-flags.ts:13][E: packages/opencode/src/effect/runtime-flags.ts:47][E: packages/opencode/src/effect/runtime-flags.ts:55]

V2 没有 Plan-Exit tool。当前 `BuiltInTools.locationLayer` 的注册列表包含 ApplyPatch/Bash/Edit/Glob/Grep/Question/Read/Skill/TodoWrite/WebFetch/WebSearch/Write，没有注册 `plan_exit`。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I]

## 2 用途定位

Plan-Exit prompt 规定：完成 planning phase、plan file 已写完、问题已澄清且计划可实施时调用；如果计划未完成、仍有问题或用户想继续 planning，则不要调用。[E: packages/opencode/src/tool/plan-exit.txt:1][E: packages/opencode/src/tool/plan-exit.txt:6][E: packages/opencode/src/tool/plan-exit.txt:7][E: packages/opencode/src/tool/plan-exit.txt:8][E: packages/opencode/src/tool/plan-exit.txt:11][E: packages/opencode/src/tool/plan-exit.txt:12][E: packages/opencode/src/tool/plan-exit.txt:13]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| 无字段 | `{}` | 否 | 无 | `Schema.Struct({})` | Plan-Exit 不接受模型参数。[E: packages/opencode/src/tool/plan.ts:13][E: packages/opencode/src/tool/plan.ts:24] |

## 4 输出 & 大小/截断限制

用户同意切换后，Plan-Exit 返回 title `"Switching to build agent"`、output `"User approved switching to build agent. Wait for further instructions."`、空 metadata。[E: packages/opencode/src/tool/plan.ts:71][E: packages/opencode/src/tool/plan.ts:72][E: packages/opencode/src/tool/plan.ts:73][E: packages/opencode/src/tool/plan.ts:74] 输出没有专用截断逻辑[I]；V1 通用 `Tool.define` wrapper 仍会处理 output bounding。[E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:141]

## 5 权限

Plan-Exit 不调用 `ctx.ask` permission[I]；它调用 `Question.Service.ask()` 向用户发出 Yes/No confirmation。[E: packages/opencode/src/tool/plan.ts:19][E: packages/opencode/src/tool/plan.ts:30][E: packages/opencode/src/tool/plan.ts:32][E: packages/opencode/src/tool/plan.ts:38][E: packages/opencode/src/tool/plan.ts:39] 因此它的 gating 是 registry flag/client gate，而不是 per-call permission rule。[E: packages/opencode/src/tool/registry.ts:235][I]

## 6 execute() 走读

1. execute 从 `InstanceState.context` 和 `Session.Service.get(ctx.sessionID)` 取得当前 instance/session，并用 `Session.plan(info, instance)` 计算 plan file path。[E: packages/opencode/src/tool/plan.ts:27][E: packages/opencode/src/tool/plan.ts:28][E: packages/opencode/src/tool/plan.ts:29]
2. `Session.plan()` 在 VCS project 中把 plan 放到 `<worktree>/.opencode/plans/<created>-<slug>.md`，非 VCS project 放到 global data plans 目录。[E: packages/opencode/src/session/session.ts:377][E: packages/opencode/src/session/session.ts:378][E: packages/opencode/src/session/session.ts:379][E: packages/opencode/src/session/session.ts:380][E: packages/opencode/src/session/session.ts:381]
3. Plan-Exit 问用户：`Plan at <plan> is complete. Would you like to switch to the build agent and start implementing?`，options 是 Yes/No，custom false。[E: packages/opencode/src/tool/plan.ts:34][E: packages/opencode/src/tool/plan.ts:36][E: packages/opencode/src/tool/plan.ts:38][E: packages/opencode/src/tool/plan.ts:39]
4. 如果第一题回答 `"No"`，execute fail `Question.RejectedError`。[E: packages/opencode/src/tool/plan.ts:46]
5. 如果用户没有拒绝，Plan-Exit 读取 session messages，找最近一条带 model 的 user message；没有则用 provider default model。[E: packages/opencode/src/tool/plan.ts:48][E: packages/opencode/src/tool/plan.ts:49][E: packages/opencode/src/tool/plan.ts:51]
6. Plan-Exit 写入一条 user message：agent 是 `"build"`，model 是上一步选出的 model。[E: packages/opencode/src/tool/plan.ts:53][E: packages/opencode/src/tool/plan.ts:58][E: packages/opencode/src/tool/plan.ts:59][E: packages/opencode/src/tool/plan.ts:61]
7. Plan-Exit 再写入 text part，内容是 `The plan at <plan> has been approved, you can now edit files. Execute the plan`，`synthetic: true`。[E: packages/opencode/src/tool/plan.ts:62][E: packages/opencode/src/tool/plan.ts:67][E: packages/opencode/src/tool/plan.ts:68]

## 7 V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 注册 | 需要 `OPENCODE_EXPERIMENTAL_PLAN_MODE` 或总 experimental，且 `OPENCODE_CLIENT=cli`。[E: packages/opencode/src/effect/runtime-flags.ts:10][E: packages/opencode/src/effect/runtime-flags.ts:13][E: packages/opencode/src/effect/runtime-flags.ts:47][E: packages/opencode/src/tool/registry.ts:235] | V2 shipped built-ins/locationLayer 当前没有注册 plan_exit。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I] |
| 行为 | 通过 Question 确认后切换到 build agent。[E: packages/opencode/src/tool/plan.ts:30][E: packages/opencode/src/tool/plan.ts:58] | shipped built-ins/locationLayer 无 V2 equivalent。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I] |
| 输入 | 空 schema。[E: packages/opencode/src/tool/plan.ts:13] | shipped built-ins/locationLayer 无 V2 equivalent。[E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:33][E: packages/core/src/tool/builtins.ts:34][E: packages/core/src/tool/builtins.ts:35][E: packages/core/src/tool/builtins.ts:36][E: packages/core/src/tool/builtins.ts:37][E: packages/core/src/tool/builtins.ts:38][E: packages/core/src/tool/builtins.ts:39][E: packages/core/src/tool/builtins.ts:40][E: packages/core/src/tool/builtins.ts:41][E: packages/core/src/tool/builtins.ts:42][E: packages/core/src/tool/builtins.ts:43][I] |

## 8 设计动机·edge·历史

Plan-Exit 是 plan agent 到 build agent 的交互式手闸：它不直接修改文件权限，而是经用户确认后向同一个 session 写入 agent 为 `"build"` 的 user message，再写入 `synthetic: true` 的 text part，让后续 V1 loop 以 build agent 继续。[E: packages/opencode/src/tool/plan.ts:34][E: packages/opencode/src/tool/plan.ts:58][E: packages/opencode/src/tool/plan.ts:61][E: packages/opencode/src/tool/plan.ts:67][E: packages/opencode/src/tool/plan.ts:68][I]

## Sources

- packages/opencode/src/tool/plan.ts
- packages/opencode/src/tool/plan-exit.txt
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/effect/runtime-flags.ts
- packages/opencode/src/session/session.ts
- packages/opencode/src/tool/tool.ts
- packages/core/src/tool/builtins.ts

## 相关

- [内置 agents 目录](../agents/builtins.md)
- [System-prompt 选择与 catalog](../prompts/system-prompts.md)
