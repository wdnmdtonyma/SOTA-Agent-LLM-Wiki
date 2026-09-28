---
id: tool.wait-for-environment
title: wait_for_environment 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/wait_for_environment.rs, codex-rs/core/src/environment_selection.rs, codex-rs/features/src/lib.rs]
symbols: [WaitForEnvironmentHandler, WaitForEnvironmentToolConfig, WaitForEnvironmentArgs, StartingTurnEnvironment, Feature::DeferredExecutor]
related: [subsys.core.tool-system, subsys.core.tool-router, tool.exec-command, tool.write-stdin]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `wait_for_environment` 让模型等待一个已经在 `<environment_context>` 中标记为 `starting` 的 execution environment。它不会启动新环境；ready 时立即成功，starting 时阻塞到启动完成，未知或失败时返回可供模型继续处理的错误。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:20][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:127][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:148][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:160]

## 注册与 exposure

只有 `Feature::DeferredExecutor` 启用时，`add_core_utility_tools` 才注册 handler；该 feature 当前是 UnderDevelopment 且默认关闭。宿主可在 thread extension data 中提供 `WaitForEnvironmentToolConfig`，否则使用 core 默认描述。[E: codex-rs/core/src/tools/spec_plan.rs:1157][E: codex-rs/core/src/tools/spec_plan.rs:1163][E: codex-rs/core/src/tools/spec_plan.rs:1164][E: codex-rs/features/src/lib.rs:1029][E: codex-rs/features/src/lib.rs:1031][E: codex-rs/features/src/lib.rs:1032]

`add_core_tool_sources` 在 `require_managed_sandbox` 且（thread profile 不是 Managed，或任一 turn environment 不是 Managed）时 early return，跳过 `add_shell_tools` / `add_mcp_resource_tools` / `add_core_utility_tools` / `add_collaboration_tools`；`WaitForEnvironmentHandler` 在 `add_core_utility_tools` 里注册。[E: codex-rs/core/src/tools/spec_plan.rs:1018][E: codex-rs/core/src/tools/spec_plan.rs:1022][E: codex-rs/core/src/tools/spec_plan.rs:1028][E: codex-rs/core/src/tools/spec_plan.rs:1032][E: codex-rs/core/src/tools/spec_plan.rs:1034][E: codex-rs/core/src/tools/spec_plan.rs:1035][E: codex-rs/core/src/tools/spec_plan.rs:1157][E: codex-rs/core/src/tools/spec_plan.rs:1163]

handler 没有覆写 exposure 或 parallel contract（`CoreToolRuntime` 空 impl），因此继承 `Direct` exposure 与 `supports_parallel_tool_calls = false`：模型可直接看到它，等待期间该调用按非并行工具占用 tool gate。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:173][E: codex-rs/tools/src/tool_executor.rs:113][E: codex-rs/tools/src/tool_executor.rs:122]

## Schema

wire name 是 plain `wait_for_environment`，类型是 non-strict Function tool，唯一字段如下：[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:85][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:90]

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `environment_id` | string | 是 | `<environment_context>` 中标为 `starting` 的精确 environment id。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:42][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:98][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:103] |

schema 禁止额外字段，且没有声明 output schema；runtime 成功输出仍是 JSON tool output。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:40][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:98][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:165]

## Host config 与 fallback

host 可定制 tool description 和 `environment_id` description。两段描述合计不得超过 1,024 UTF-8 bytes，完整序列化 spec 还不得超过 1,000 bytes；任一约束不满足会告警并整体回退 core 默认文案，不会部分采用超限配置。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:23][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:24][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:51][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:61][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:68][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:71]

默认描述提醒模型：只等待确实需要其 files/commands/capabilities 的 starting 环境；若 connectors 等现有工具已足够就不要等待；等待可能持续数分钟并阻塞其他工具调用；启动失败后应继续而不是反复等待。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:20][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:22]

## 状态与输出

1. handler 只接受 Function payload，解析并拒绝未知参数。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:117][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:125]
2. id 已在 ready `turn_environments()` 中时不等待，直接返回成功。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:127][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:131]
3. 否则先查 `TurnEnvironmentState::Failed`；命中则返回 truncated startup failure。再在 starting list 中精确匹配 id 并调用 `StartingTurnEnvironment::wait_until_ready()`。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:138][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:146][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:150][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:159][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:160][E: codex-rs/core/src/environment_selection.rs:252]
4. id 既非 ready 也非 starting 时返回 `environment ... is neither ready nor starting`。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:154][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:155]
5. 成功输出固定为 `{"environment_id":"<id>","status":"ready"}`。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:165][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:167]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/wait_for_environment.rs`
- `codex-rs/core/src/environment_selection.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [工具系统机制](../../subsystems/core/tool-system.md)
- [Tool router 与并行执行](../../subsystems/core/tool-router.md)
- [exec_command](exec-command.md)
