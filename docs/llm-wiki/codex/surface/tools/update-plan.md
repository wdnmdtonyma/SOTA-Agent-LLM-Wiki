---
id: tool.update-plan
title: update_plan 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/plan_spec.rs, codex-rs/core/src/tools/handlers/plan.rs, codex-rs/protocol/src/plan_tool.rs, codex-rs/protocol/src/protocol.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [add_core_utility_tools, create_update_plan_tool, PlanHandler, PlanToolOutput, parse_update_plan_arguments, UpdatePlanArgs, EventMsg::PlanUpdate]
related: [spine.tool-call-anatomy, subsys.core.tool-system]
evidence: explicit
status: verified
updated: db887d03e1
---

> `update_plan` 是 Codex 的本地 checklist/TODO 状态更新 function tool。它让模型提交结构化 plan，handler 把参数转成 `EventMsg::PlanUpdate(args)` 发给客户端，并向模型返回固定的 `Plan updated` 成功文本。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:42][E: codex-rs/core/src/tools/handlers/plan_spec.rs:43][E: codex-rs/core/src/tools/handlers/plan.rs:22][E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:92]

## 能回答的问题

- `update_plan` 的 wire name、ToolSpec 类型和 handler 是什么？
- 输入 schema 里哪些字段必填，`status` 有哪些枚举值？
- 成功输出为什么只有固定文本，真实 plan 如何到达客户端？
- 它何时注册，是否支持 parallel tool calls？
- 为什么它在 Plan mode 中不可用？

## 1 Identity

| 项 | 值 |
|---|---|
| wire name | `PlanHandler::tool_name()` 返回 plain `update_plan`；spec 的 `ResponsesApiTool.name` 也是 `update_plan`。[E: codex-rs/core/src/tools/handlers/plan.rs:49][E: codex-rs/core/src/tools/handlers/plan.rs:50][E: codex-rs/core/src/tools/handlers/plan_spec.rs:42][E: codex-rs/core/src/tools/handlers/plan_spec.rs:43] |
| concrete handler | `PlanHandler` 实现 `ToolExecutor<ToolInvocation>`，`spec()` 调用 `create_update_plan_tool()`。[E: codex-rs/core/src/tools/handlers/plan.rs:18][E: codex-rs/core/src/tools/handlers/plan.rs:48][E: codex-rs/core/src/tools/handlers/plan.rs:53][E: codex-rs/core/src/tools/handlers/plan.rs:54] |
| ToolSpec | `create_update_plan_tool` 返回 `ToolSpec::Function(ResponsesApiTool { ... })`，`strict: false`，`output_schema` 为 `None`。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:7][E: codex-rs/core/src/tools/handlers/plan_spec.rs:42][E: codex-rs/core/src/tools/handlers/plan_spec.rs:49][E: codex-rs/core/src/tools/handlers/plan_spec.rs:56] |
| handler exposure | `ToolExecutor` 的默认 `exposure()` 返回 Direct；`PlanHandler` 未见覆盖该方法，因此实际走默认 Direct。[E: codex-rs/tools/src/tool_executor.rs:55][E: codex-rs/tools/src/tool_executor.rs:56][I] |

## 2 用途定位

工具描述说明它用于更新 task plan，可带可选 explanation，并要求最多一个 step 处于 `in_progress`。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:44][E: codex-rs/core/src/tools/handlers/plan_spec.rs:45][E: codex-rs/core/src/tools/handlers/plan_spec.rs:46]

执行层不会把 plan 内容拼进工具输出；`PlanHandler` 解析 arguments 后调用 `session.send_event(turn.as_ref(), EventMsg::PlanUpdate(args)).await`，通过 `EventMsg::PlanUpdate` 暴露给 event surface。[E: codex-rs/core/src/tools/handlers/plan.rs:90][E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:92][E: codex-rs/protocol/src/protocol.rs:1419]

当前源码中，“最多一个 `in_progress`”只出现在工具描述；handler 路径显示它做 JSON 反序列化并发送 event，未见额外 runtime 校验该约束。[E: codex-rs/core/src/tools/handlers/plan.rs:90][E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:92][I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `explanation` | string | 否 | 无 | 可选说明文本。 | schema 将其放入 properties，但顶层 required 只含 `plan`。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:22][E: codex-rs/core/src/tools/handlers/plan_spec.rs:24][E: codex-rs/core/src/tools/handlers/plan_spec.rs:51][E: codex-rs/core/src/tools/handlers/plan_spec.rs:53] |
| `plan` | array<object> | 是 | 无 | plan step 列表。 | 顶层 required 包含 `plan`。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:30][E: codex-rs/core/src/tools/handlers/plan_spec.rs:31][E: codex-rs/core/src/tools/handlers/plan_spec.rs:53] |
| `plan[].step` | string | 是 | 无 | 单个步骤文本。 | item required 包含 `step`。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:10][E: codex-rs/core/src/tools/handlers/plan_spec.rs:11][E: codex-rs/core/src/tools/handlers/plan_spec.rs:34] |
| `plan[].status` | enum string | 是 | 无 | `pending`、`in_progress`、`completed`。 | schema enum 列出三值，item required 包含 `status`；协议 enum 使用 `#[serde(rename_all = "snake_case")]`。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:14][E: codex-rs/core/src/tools/handlers/plan_spec.rs:15][E: codex-rs/core/src/tools/handlers/plan_spec.rs:16][E: codex-rs/core/src/tools/handlers/plan_spec.rs:34][E: codex-rs/protocol/src/plan_tool.rs:9][E: codex-rs/protocol/src/plan_tool.rs:8] |

协议结构是 `UpdatePlanArgs { explanation: Option<String>, plan: Vec<PlanItemArg> }`；`PlanItemArg` 和 `UpdatePlanArgs` 都用 `#[serde(deny_unknown_fields)]` 拒绝未知字段。[E: codex-rs/protocol/src/plan_tool.rs:16][E: codex-rs/protocol/src/plan_tool.rs:17][E: codex-rs/protocol/src/plan_tool.rs:23][E: codex-rs/protocol/src/plan_tool.rs:24][E: codex-rs/protocol/src/plan_tool.rs:27][E: codex-rs/protocol/src/plan_tool.rs:28]

tool schema 的 plan item object 和顶层 parameters object 都关闭 additional properties。[E: codex-rs/core/src/tools/handlers/plan_spec.rs:35][E: codex-rs/core/src/tools/handlers/plan_spec.rs:54]

## 4 输出

`PlanToolOutput` 的 log preview 是 `Plan updated`，success 为 true；response item 是 `FunctionCallOutput`，正文同样是 `Plan updated`，`success` 设为 `Some(true)`。[E: codex-rs/core/src/tools/handlers/plan.rs:22][E: codex-rs/core/src/tools/handlers/plan.rs:24][E: codex-rs/core/src/tools/handlers/plan.rs:26][E: codex-rs/core/src/tools/handlers/plan.rs:30][E: codex-rs/core/src/tools/handlers/plan.rs:34][E: codex-rs/core/src/tools/handlers/plan.rs:35][E: codex-rs/core/src/tools/handlers/plan.rs:37]

code-mode nested result 返回空 JSON object。[E: codex-rs/core/src/tools/handlers/plan.rs:43][E: codex-rs/core/src/tools/handlers/plan.rs:44]

## 5 注册与门控

`build_tool_router` 委托 `build_tool_specs_and_registry`；后者构造 `CoreToolPlanContext` 后调用 `add_tool_sources`，而 `add_tool_sources` 调用 `add_core_utility_tools`；该函数无额外 feature gate 地 `planned_tools.add(PlanHandler)`。[E: codex-rs/core/src/tools/spec_plan.rs:160][E: codex-rs/core/src/tools/spec_plan.rs:165][E: codex-rs/core/src/tools/spec_plan.rs:197][E: codex-rs/core/src/tools/spec_plan.rs:198][E: codex-rs/core/src/tools/spec_plan.rs:613][E: codex-rs/core/src/tools/spec_plan.rs:616][E: codex-rs/core/src/tools/spec_plan.rs:708][E: codex-rs/core/src/tools/spec_plan.rs:713]

runtime gate 在 handler 内：当当前 turn 的 collaboration mode 是 `ModeKind::Plan` 时，handler 返回错误 `update_plan is a TODO/checklist tool and is not allowed in Plan mode`。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/plan.rs:85][E: codex-rs/core/src/tools/handlers/plan.rs:86]

## 6 parallel support

`ToolExecutor` 的默认 `supports_parallel_tool_calls()` 返回 `false`；`PlanHandler` 未见覆盖该方法，因此实际走默认 false。[E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:65][I]

## 7 handler 走读

1. handler 只接受 `ToolPayload::Function { arguments }`；其它 payload 返回 `update_plan handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/plan.rs:75][E: codex-rs/core/src/tools/handlers/plan.rs:76][E: codex-rs/core/src/tools/handlers/plan.rs:77][E: codex-rs/core/src/tools/handlers/plan.rs:78][E: codex-rs/core/src/tools/handlers/plan.rs:79]
2. Plan mode 被拒绝后，handler 通过 `parse_update_plan_arguments` 反序列化 `UpdatePlanArgs`。[E: codex-rs/core/src/tools/handlers/plan.rs:84][E: codex-rs/core/src/tools/handlers/plan.rs:90][E: codex-rs/core/src/tools/handlers/plan.rs:101][E: codex-rs/core/src/tools/handlers/plan.rs:102]
3. 成功解析后发送 `EventMsg::PlanUpdate(args)`，再返回 `PlanToolOutput`。[E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:92][E: codex-rs/core/src/tools/handlers/plan.rs:95]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/plan_spec.rs`
- `codex-rs/core/src/tools/handlers/plan.rs`
- `codex-rs/protocol/src/plan_tool.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/tools/src/tool_executor.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
