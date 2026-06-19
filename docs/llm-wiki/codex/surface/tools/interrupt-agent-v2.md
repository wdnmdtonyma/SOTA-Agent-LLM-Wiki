---
id: tool.interrupt-agent-v2
title: interrupt_agent (V2) 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/multi_agents_v2.rs, codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs, codex-rs/core/src/tools/handlers/multi_agents_spec.rs, codex-rs/core/src/tools/spec_plan_tests.rs, codex-rs/tools/src/tool_executor.rs]
symbols: [InterruptAgentHandler, create_interrupt_agent_tool_v2, InterruptAgentArgs, InterruptAgentResult, MultiAgentVersion::V2]
related: [tool.spawn-agent-v2, tool.followup-task, tool.wait-agent-v2, tool.list-agents, spine.trace-subagent]
evidence: explicit
status: verified
updated: 5670360009
---

> `interrupt_agent` 是 MultiAgent V2 工具族的中断工具,用于打断已 spawn 子 agent 的当前 turn,但不关闭该 agent。

## 能回答的问题

- `interrupt_agent` 是否替代了 V2 `close_agent`?
- `interrupt_agent.target` 接受什么?
- `interrupt_agent` 如何防止打断 root 或自己?
- MultiAgent V2 工具族包含哪些工具?

## 1 Identity

`interrupt_agent` 的 handler 类型在 `multi_agents_v2` 中导出为 `InterruptAgentHandler`,具体 handler 的 `tool_name()` 返回 plain `interrupt_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_v2.rs:29] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:7] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:10] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:11]

`spec()` 使用 `create_interrupt_agent_tool_v2()` 生成 V2 function spec。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:14] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:15]

## 2 用途定位

模型描述说 `interrupt_agent` 会 interrupt agent 当前 turn,返回 previous status,并让 agent 继续可接收 messages 和 follow-up tasks。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:318] [E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:320]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---|---|
| `target` | string | 是 | 无 | 要中断的 agent id 或 canonical task name,来源于 `spawn_agent`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:312] [E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:313] [E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:314] [E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:323] |

handler 的 `InterruptAgentArgs` 只有 `target: String`,且 `serde(deny_unknown_fields)` 禁止额外字段。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:100] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:101] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:102]

## 4 输出 schema & 截断

`create_interrupt_agent_tool_v2` 的 output schema 是 `agent_previous_status_output_schema`,说明返回中断请求处理前观察到的 agent status。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:324] [E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:325]

runtime result 是 `InterruptAgentResult { previous_status }`,并可转换为 tool JSON 文本、response item 和 code-mode result。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:88] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:89] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:106] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:107] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:112] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:120] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:124]

## 5 ToolSpec 类型

`create_interrupt_agent_tool_v2` 生成的 raw spec 是 `ToolSpec::Function(ResponsesApiTool)`;注册时如果配置了 MultiAgent V2 namespace,`multi_agent_v2_handler` 会把 function 包进 `ToolSpec::Namespace`。[E: codex-rs/core/src/tools/handlers/multi_agents_spec.rs:318] [E: codex-rs/core/src/tools/spec_plan.rs:1024] [E: codex-rs/core/src/tools/spec_plan.rs:1025] [E: codex-rs/core/src/tools/spec_plan.rs:1029] [E: codex-rs/core/src/tools/spec_plan.rs:1043] [E: codex-rs/core/src/tools/spec_plan.rs:1045]

## 6 注册与门控

`add_collaboration_tools` 只在 `multi_agent_v2_enabled(turn_context)` 分支里加入 `InterruptAgentHandler`;V1 分支注册 `SpawnAgentHandler`/`SendInputHandler`/`ResumeAgentHandler`/`WaitAgentHandler`/`CloseAgentHandler`,不含 `interrupt_agent`。[E: codex-rs/core/src/tools/spec_plan.rs:761] [E: codex-rs/core/src/tools/spec_plan.rs:763] [E: codex-rs/core/src/tools/spec_plan.rs:764] [E: codex-rs/core/src/tools/spec_plan.rs:807] [E: codex-rs/core/src/tools/spec_plan.rs:814] [E: codex-rs/core/src/tools/spec_plan.rs:823] [E: codex-rs/core/src/tools/spec_plan.rs:833] [E: codex-rs/core/src/tools/spec_plan.rs:834] [E: codex-rs/core/src/tools/spec_plan.rs:836] [E: codex-rs/core/src/tools/spec_plan.rs:837]

`spec_plan_tests::multi_agent_feature_selects_one_agent_tool_family` 验证 V2 可见 `interrupt_agent`,同时不可见 V2 `close_agent`;V1 namespace 内仍有 `close_agent`。[E: codex-rs/core/src/tools/spec_plan_tests.rs:1093] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1115] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1154] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1159] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1162]

## 7 parallel-safe

`interrupt_agent` handler 没有覆写 `supports_parallel_tool_calls`;它继承默认 `false`。[E: codex-rs/tools/src/tool_executor.rs:64] [E: codex-rs/tools/src/tool_executor.rs:65]

## 8 handler 走读

handler 从 function arguments 解析 `target`,解析为 agent id,确认 agent 已知,拒绝 root target 和 self target,记录 previous status,调用 `agent_control.interrupt_agent(agent_id)`,然后发出 `SubAgentActivityKind::Interrupted` 事件。[E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:37] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:38] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:39] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:43] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:45] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:48] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:50] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:51] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:54] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:63] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:67] [E: codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs:82]

## 9 设计动机·edge·历史

当前测试证明 V2 工具面包含 `interrupt_agent` 且不包含 `close_agent`,而 V1 namespace 仍包含 `close_agent`;把这理解为 V2 从“关闭 agent”转向“打断当前 turn 但保留 agent”的控制面是迁移判断。[E: codex-rs/core/src/tools/spec_plan_tests.rs:1115] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1159] [E: codex-rs/core/src/tools/spec_plan_tests.rs:1162] [I]

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2.rs
- codex-rs/core/src/tools/handlers/multi_agents_v2/interrupt_agent.rs
- codex-rs/core/src/tools/handlers/multi_agents_spec.rs
- codex-rs/core/src/tools/spec_plan_tests.rs
- codex-rs/tools/src/tool_executor.rs

## 相关

- `tool.spawn-agent-v2`
- `tool.followup-task`
- `tool.wait-agent-v2`
- `tool.list-agents`
- `spine.trace-subagent`
