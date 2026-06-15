---
id: tool.update-plan
title: update_plan 工具
kind: tool
tier: T1
source: [codex-rs/tools/src/plan_tool.rs, codex-rs/tools/src/tool_registry_plan.rs, codex-rs/tools/src/tool_registry_plan_types.rs, codex-rs/core/src/tools/spec.rs, codex-rs/core/src/tools/handlers/plan.rs, codex-rs/core/src/tools/context.rs, codex-rs/protocol/src/plan_tool.rs, codex-rs/protocol/src/protocol.rs]
symbols: [create_update_plan_tool, ToolHandlerKind::Plan, PlanHandler, handle_update_plan, UpdatePlanArgs, EventMsg::PlanUpdate]
related: [spine.tool-call-anatomy, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `update_plan` 是 Codex 暴露给模型的 TODO/checklist 状态更新工具；handler 把结构化 plan 参数发送成 `EventMsg::PlanUpdate(args)`，并且 handler 注释说明该工具有用的部分是输入本身，因为客户端可以读取输入并渲染结构化 plan。[E: codex-rs/core/src/tools/handlers/plan.rs:93][E: codex-rs/core/src/tools/handlers/plan.rs:78]

## 能回答的问题

- `update_plan` 的 wire name、`ToolHandlerKind` 和 handler 是什么？
- `update_plan` 的输入 schema 里哪些字段必填，`status` 有哪些枚举值？
- `update_plan` 为什么没有真实业务输出，客户端如何拿到 plan？
- `update_plan` 什么时候注册，是否支持 parallel tool calls？
- `update_plan` 为什么在 Plan mode 里反而不可用？

## 1 Identity

| 项 | 值 | 证据 |
|---|---|---|
| wire name | `update_plan` | `ResponsesApiTool.name` 固定为 `update_plan`。[E: codex-rs/tools/src/plan_tool.rs:34] |
| aliases | 未看到独立 alias；registry 注册的 handler name 是 `update_plan`。 | `build_tool_registry_plan` 调用 `plan.register_handler("update_plan", ToolHandlerKind::Plan)`。[E: codex-rs/tools/src/tool_registry_plan.rs:219][I] |
| ToolSpec 类型 | `ToolSpec::Function(ResponsesApiTool)` | `create_update_plan_tool` 返回 `ToolSpec::Function`。[E: codex-rs/tools/src/plan_tool.rs:33] |
| ToolHandlerKind | `ToolHandlerKind::Plan` | `ToolHandlerKind` enum 定义 `Plan` 变体。[E: codex-rs/tools/src/tool_registry_plan_types.rs:27] |
| core handler | `PlanHandler` | `core/src/tools/spec.rs` 为 `ToolHandlerKind::Plan` 注册 `plan_handler`。[E: codex-rs/core/src/tools/spec.rs:234] |
| 所属 crate | spec 在 `codex-tools`，执行在 `codex-core`，协议类型在 `codex-protocol`。 | `codex-tools` 暴露 `create_update_plan_tool`，`codex-core` 中 `PlanHandler` 实现 `ToolHandler`，`codex-protocol` 定义 `UpdatePlanArgs`。[E: codex-rs/tools/src/plan_tool.rs:6][E: codex-rs/core/src/tools/handlers/plan.rs:52][E: codex-rs/protocol/src/plan_tool.rs:25] |

## 2 用途定位

`update_plan` 的工具描述明确说它用于更新 task plan、可带 optional explanation、并要求最多一个 step 处于 `in_progress` 状态。[E: codex-rs/tools/src/plan_tool.rs:35][E: codex-rs/tools/src/plan_tool.rs:36][E: codex-rs/tools/src/plan_tool.rs:37]  
`PlanHandler` 的注释说明该工具“有用”的部分是输入本身，因为客户端可以读取并渲染结构化 plan；工具输出本身对模型没有额外语义价值。[E: codex-rs/core/src/tools/handlers/plan.rs:78][E: codex-rs/core/src/tools/handlers/plan.rs:79]  
`handle_update_plan` 把解析出的 `UpdatePlanArgs` 发送为 `EventMsg::PlanUpdate(args)`，因此 plan 可见性来自 Codex event surface。[E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:93][I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验/约束 |
|---|---|---:|---|---|---|
| `explanation` | string | 否 | 无 | 可选说明文本。 | schema 只声明 string，没有把 `explanation` 放进顶层 required。[E: codex-rs/tools/src/plan_tool.rs:18][E: codex-rs/tools/src/plan_tool.rs:44] |
| `plan` | array<object> | 是 | 无 | plan step 列表。 | 顶层 schema 把 `plan` 设为 required。[E: codex-rs/tools/src/plan_tool.rs:42][E: codex-rs/tools/src/plan_tool.rs:44] |
| `plan[].step` | string | 是 | 无 | 单个步骤文本。 | item schema required 包含 `step`。[E: codex-rs/tools/src/plan_tool.rs:8][E: codex-rs/tools/src/plan_tool.rs:25] |
| `plan[].status` | string / `StepStatus` | 是 | 无 | 状态值为 `pending`、`in_progress`、`completed`。 | tool description 写明状态枚举；协议 enum 用 `serde(rename_all = "snake_case")` 序列化 `Pending/InProgress/Completed`。[E: codex-rs/tools/src/plan_tool.rs:11][E: codex-rs/protocol/src/plan_tool.rs:8][E: codex-rs/protocol/src/plan_tool.rs:10] |

`UpdatePlanArgs` 的协议结构是 `explanation: Option<String>` 加 `plan: Vec<PlanItemArg>`，`PlanItemArg` 使用 `#[serde(deny_unknown_fields)]` 拒绝未知字段。[E: codex-rs/protocol/src/plan_tool.rs:27][E: codex-rs/protocol/src/plan_tool.rs:28][E: codex-rs/protocol/src/plan_tool.rs:16]  
工具 schema 顶层和 plan item 都设置 `additionalProperties: false`，通过 `JsonSchema::object(..., Some(false.into()))` 表达。[E: codex-rs/tools/src/plan_tool.rs:26][E: codex-rs/tools/src/plan_tool.rs:45]

## 4 输出 schema & 截断

`ResponsesApiTool.output_schema` 为 `None`，所以 `update_plan` 不向 Responses API 声明结构化 output schema。[E: codex-rs/tools/src/plan_tool.rs:47]  
执行成功时 `PlanToolOutput` 给模型返回文本 `Plan updated`，并把 `FunctionCallOutputPayload.success` 设为 `Some(true)`。[E: codex-rs/core/src/tools/handlers/plan.rs:20][E: codex-rs/core/src/tools/handlers/plan.rs:32][E: codex-rs/core/src/tools/handlers/plan.rs:33]  
`PlanToolOutput.code_mode_result` 返回空 JSON object，因此 code-mode 嵌套调用不会得到 plan 内容本身。[E: codex-rs/core/src/tools/handlers/plan.rs:41][E: codex-rs/core/src/tools/handlers/plan.rs:42]

## 5 ToolSpec 类型

`update_plan` 选择普通 `Function` ToolSpec；模型提交 JSON arguments，core 本地 handler 再解析 `ToolPayload::Function { arguments }` 并发送 plan event。[E: codex-rs/tools/src/plan_tool.rs:33][E: codex-rs/core/src/tools/handlers/plan.rs:63][E: codex-rs/core/src/tools/handlers/plan.rs:93][I]  
`PlanHandler.kind()` 返回 `ToolKind::Function`。[E: codex-rs/core/src/tools/handlers/plan.rs:49]

## 6 注册与门控

`build_tool_registry_plan` 在不包裹额外 `if` gate 的代码路径上 `push_spec(create_update_plan_tool(), false, config.code_mode_enabled)`，随后注册 `ToolHandlerKind::Plan` handler。[E: codex-rs/tools/src/tool_registry_plan.rs:215][E: codex-rs/tools/src/tool_registry_plan.rs:216][E: codex-rs/tools/src/tool_registry_plan.rs:217][E: codex-rs/tools/src/tool_registry_plan.rs:219][I]  
第三个参数 `config.code_mode_enabled` 传入 code-mode augmentation 逻辑；`ToolRegistryPlan::push_spec` 在 `code_mode_enabled` 为 true 时调用 `augment_tool_spec_for_code_mode`，否则原样 push spec。[E: codex-rs/tools/src/tool_registry_plan_types.rs:100][E: codex-rs/tools/src/tool_registry_plan_types.rs:107]  
`update_plan` 的运行时限制来自 handler：当当前 collaboration mode 是 `ModeKind::Plan` 时，`handle_update_plan` 返回给模型错误 `update_plan is a TODO/checklist tool and is not allowed in Plan mode`。[E: codex-rs/core/src/tools/handlers/plan.rs:86][E: codex-rs/core/src/tools/handlers/plan.rs:88]

## 7 parallel-safe

`update_plan` 的 `supports_parallel_tool_calls` 实际值是 `false`，因为 registry plan 在 push spec 时传入 `/*supports_parallel_tool_calls*/ false`。[E: codex-rs/tools/src/tool_registry_plan.rs:216]  
`core/src/tools/spec.rs` 只有在 `ConfiguredToolSpec.supports_parallel_tool_calls` 为 true 时才调用 `push_spec_with_parallel_support(..., true)`；否则调用普通 `builder.push_spec`。[E: codex-rs/core/src/tools/spec.rs:180][E: codex-rs/core/src/tools/spec.rs:185]  
设计动机是 plan 是一个全局可视状态快照，多个 plan 更新并发会制造 UI 状态竞争。[I]

## 8 handler 走读

1. `ToolRegistryPlan` 产出 `ToolHandlerSpec { name: "update_plan", kind: Plan }`。[E: codex-rs/tools/src/tool_registry_plan.rs:219]
2. `build_specs_with_discoverable_tools` 创建共享 `Arc<PlanHandler>`。[E: codex-rs/core/src/tools/spec.rs:150]
3. `core/src/tools/spec.rs` 在匹配 `ToolHandlerKind::Plan` 时把 `PlanHandler` 注册到 `ToolRegistryBuilder`。[E: codex-rs/core/src/tools/spec.rs:233][E: codex-rs/core/src/tools/spec.rs:234]
4. `PlanHandler.handle` 只接受 `ToolPayload::Function { arguments }`，其他 payload 返回 `update_plan handler received unsupported payload`。[E: codex-rs/core/src/tools/handlers/plan.rs:63][E: codex-rs/core/src/tools/handlers/plan.rs:66]
5. `handle_update_plan` 解析 JSON 为 `UpdatePlanArgs`，通过 `session.send_event(turn_context, EventMsg::PlanUpdate(args)).await` 发给客户端。[E: codex-rs/core/src/tools/handlers/plan.rs:91][E: codex-rs/core/src/tools/handlers/plan.rs:93]
6. `EventMsg` enum 明确包含 `PlanUpdate(UpdatePlanArgs)` 变体。[E: codex-rs/protocol/src/protocol.rs:1594]

## 9 设计动机·edge·历史

`update_plan` 是“输入驱动 UI”的工具：handler 注释说明输出本身并不重要，重要的是强制模型形成结构化 plan，并让客户端能读输入渲染 TODO/checklist。[E: codex-rs/core/src/tools/handlers/plan.rs:78][E: codex-rs/core/src/tools/handlers/plan.rs:79]  
Plan mode 禁用 `update_plan` 的 edge case 与工具描述中的 TODO/checklist 定位一致：Plan mode 本身是协作模式，`update_plan` 是 Default mode 下的 checklist surface。[I]  
`status` 约束在工具 schema 里用 string description 表达，而协议反序列化使用 `StepStatus` enum 的 serde snake_case 规则。[E: codex-rs/tools/src/plan_tool.rs:11][E: codex-rs/protocol/src/plan_tool.rs:8][E: codex-rs/protocol/src/plan_tool.rs:10][I]

## Sources

- `codex-rs/tools/src/plan_tool.rs`
- `codex-rs/tools/src/tool_registry_plan.rs`
- `codex-rs/tools/src/tool_registry_plan_types.rs`
- `codex-rs/core/src/tools/spec.rs`
- `codex-rs/core/src/tools/handlers/plan.rs`
- `codex-rs/core/src/tools/context.rs`
- `codex-rs/protocol/src/plan_tool.rs`
- `codex-rs/protocol/src/protocol.rs`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)
- [工具系统机制](../../subsystems/core/tool-system.md)
