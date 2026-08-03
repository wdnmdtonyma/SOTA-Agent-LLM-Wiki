---
id: tool.wait-for-environment
title: wait_for_environment 工具
kind: tool
tier: T1
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/wait_for_environment.rs, codex-rs/core/src/environment_selection.rs, codex-rs/core/src/session/session.rs, codex-rs/features/src/lib.rs]
symbols: [WaitForEnvironmentHandler, WaitForEnvironmentToolConfig, WaitForEnvironmentArgs, StartingTurnEnvironment, Feature::DeferredExecutor]
related: [subsys.core.tool-system, subsys.core.tool-router, tool.exec-command, tool.write-stdin]
evidence: explicit
status: verified
updated: 7750465934
---

> `wait_for_environment` 让模型等待一个已经在 `<environment_context>` 中标记为 `starting` 的 execution environment。它不会启动新环境；ready 时立即成功，starting 时阻塞到启动完成，未知或失败时返回可供模型继续处理的错误。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:18][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:123][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:128][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:139]

## 注册与 exposure

只有 `Feature::DeferredExecutor` 启用时，`add_core_utility_tools` 才注册 handler；该 feature 当前是 under-development 且默认关闭。宿主可在 thread extension data 中提供 `WaitForEnvironmentToolConfig`，否则使用 core 默认描述。[E: codex-rs/core/src/tools/spec_plan.rs:801][E: codex-rs/core/src/tools/spec_plan.rs:807][E: codex-rs/features/src/lib.rs:883][E: codex-rs/features/src/lib.rs:886]

handler 没有覆写 exposure 或 parallel contract，因此继承 `Direct` exposure 与 `supports_parallel_tool_calls = false`：模型可直接看到它，等待期间该调用按非并行工具占用 tool gate。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:154][E: codex-rs/tools/src/tool_executor.rs:64][E: codex-rs/tools/src/tool_executor.rs:73]

## Schema

wire name 是 plain `wait_for_environment`，类型是 non-strict Function tool，唯一字段如下：[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:83][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:92]

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `environment_id` | string | 是 | `<environment_context>` 中标为 `starting` 的精确 environment id。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:38][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:41][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:94][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:96] |

schema 禁止额外字段，且没有声明 output schema；runtime 成功输出仍是 JSON tool output。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:39][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:102][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:146]

## Host config 与 fallback

host 可定制 tool description 和 `environment_id` description。两段描述合计不得超过 1,024 UTF-8 bytes，完整序列化 spec 还不得超过 1,000 bytes；任一约束不满足会告警并整体回退 core 默认文案，不会部分采用超限配置。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:22][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:23][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:50][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:60][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:67][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:70]

默认描述提醒模型：只等待确实需要其 files/commands/capabilities 的 starting 环境；若 connectors 等现有工具已足够就不要等待；等待可能持续数分钟并阻塞其他工具调用；启动失败后应继续而不是反复等待。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:19][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:21]

## 状态与输出

1. handler 只接受 Function payload，解析并拒绝未知参数。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:106][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:121]
2. id 已在 ready `turn_environments()` 中时不等待，直接返回成功。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:123][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:127]
3. 否则在 starting list 中精确匹配 id 并等待 `StartingTurnEnvironment::wait_until_ready()`。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:128][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:132][E: codex-rs/core/src/environment_selection.rs:58][E: codex-rs/core/src/environment_selection.rs:74]
4. id 既非 ready 也非 starting 时返回 `environment ... is neither ready nor starting`；启动失败时返回 unavailable，并明确让模型继续而不依赖该环境。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:133][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:134][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:139][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:143]
5. 成功输出固定为 `{"environment_id":"<id>","status":"ready"}`。[E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:146][E: codex-rs/core/src/tools/handlers/wait_for_environment.rs:148]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/wait_for_environment.rs`
- `codex-rs/core/src/environment_selection.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [工具系统机制](../../subsystems/core/tool-system.md)
- [Tool router 与并行执行](../../subsystems/core/tool-router.md)
- [exec_command](exec-command.md)
