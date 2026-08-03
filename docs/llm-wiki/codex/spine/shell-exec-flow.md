---
id: spine.shell-exec-flow
title: shell exec flow
kind: flow
tier: T0
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/mod.rs, codex-rs/core/src/tools/handlers/shell.rs, codex-rs/core/src/tools/handlers/shell/shell_command.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/tools/handlers/apply_patch.rs, codex-rs/core/src/tools/orchestrator.rs, codex-rs/core/src/tools/runtimes/shell.rs, codex-rs/core/src/tools/runtimes/unified_exec.rs, codex-rs/core/src/unified_exec/process_manager.rs, codex-rs/core/src/unified_exec/process.rs, codex-rs/core/src/tools/events.rs]
symbols: [ShellRuntime, ToolEmitter, SandboxAttempt]
related: [spine.tool-call-anatomy, spine.trace-apply-patch, tool.exec-command, tool.shell-command, subsys.exec-sandbox.overview, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: 7750465934
---

> shell exec flow 是 shell/unified exec handlers 汇入 `run_exec_like` 或 unified exec runtime 后，先处理环境与权限、apply_patch interception、approval/sandbox orchestration；handler 侧 `ToolEmitter` 包住 runtime 执行并发 begin/end events，`ShellRuntime` 负责实际命令执行和 stdout stream。[E: codex-rs/core/src/tools/spec_plan.rs:719][E: codex-rs/core/src/tools/handlers/shell.rs:63][E: codex-rs/core/src/tools/handlers/apply_patch.rs:482][E: codex-rs/core/src/tools/orchestrator.rs:136][E: codex-rs/core/src/tools/runtimes/shell.rs:248][E: codex-rs/core/src/tools/events.rs:95]

## 能回答的问题

- shell tools 在当前 `spec_plan.rs` 中如何门控？
- `shell_command` 如何汇入 `run_exec_like`？
- explicit escalation、apply_patch interception、approval、sandbox 的顺序是什么？
- exec begin/end events 在哪里发？
- UnifiedExec 的 `exec_command` 如何复用 apply_patch interception？

```mermaid
flowchart TD
    SPEC["add_shell_tools"] --> HANDLER["ShellCommandHandler / ExecCommandHandler"]
    HANDLER --> PARAMS["parse args -> ExecParams"]
    PARAMS --> VALIDATE["sandbox_permissions + justification validation"]
    VALIDATE --> ENV["turn environment + canonical PermissionProfile"]
    ENV --> PATCH{"intercept_apply_patch"}
    PATCH -->|patch| APPLY["apply_patch path"]
    PATCH -->|normal| EMIT["ToolEmitter::shell begin"]
    EMIT --> REQ["ShellRequest"]
    REQ --> ORCH["ToolOrchestrator::run"]
    ORCH --> ATTEMPT["materialized SandboxAttempt"]
    ATTEMPT --> RUNTIME["ShellRuntime / UnifiedExecRuntime"]
    RUNTIME --> STDOUT["stdout stream deltas"]
    RUNTIME --> FINISH["ToolEmitter::finish"]
    FINISH --> EVENTS["ExecCommandBegin/End"]
    EVENTS --> MODEL["FunctionToolOutput"]
```

## 端到端步骤

1. `add_shell_tools` 读取 `tool_environment_mode()`；没有 environment 时直接不注册 shell tools。[E: codex-rs/core/src/tools/spec_plan.rs:719][E: codex-rs/core/src/tools/spec_plan.rs:722][E: codex-rs/core/src/tools/spec_plan.rs:723]
2. UnifiedExec 分支注册 `ExecCommandHandler` 和 `WriteStdinHandler`，在单一 local environment 下同时 hidden 注册 legacy `ShellCommandHandler`；Disabled 分支不注册，Default/Local/ShellCommand 分支按 local environment 可用性注册 `ShellCommandHandler`。[E: codex-rs/core/src/tools/spec_plan.rs:737][E: codex-rs/core/src/tools/spec_plan.rs:739][E: codex-rs/core/src/tools/spec_plan.rs:748][E: codex-rs/core/src/tools/spec_plan.rs:750][E: codex-rs/core/src/tools/spec_plan.rs:753][E: codex-rs/core/src/tools/spec_plan.rs:759][E: codex-rs/core/src/tools/spec_plan.rs:760][E: codex-rs/core/src/tools/spec_plan.rs:763][E: codex-rs/core/src/tools/spec_plan.rs:764]
3. `ShellCommandHandler` 要求 `ToolPayload::Function`，解析 arguments、workdir 和 shell command params，触发 implicit skill invocation，然后构造 exec params；共用 validator 还要求 `justification` 必须伴随显式 `sandbox_permissions`。UnifiedExec 也在 process id 分配前执行同一校验。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:182][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:202][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:203][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:211][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:110][E: codex-rs/core/src/tools/handlers/mod.rs:92][E: codex-rs/core/src/tools/handlers/mod.rs:96][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:192][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:233]
4. `ShellCommandHandler` 最后调用 `run_exec_like`，传入 tool name、exec params、cancellation token、hook command、additional permissions、tracker、call id 和 runtime backend。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:225][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:229][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:231][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:238]
5. `ShellCommandHandler` 要求 step context 有 primary environment，否则向模型返回 shell unavailable；`run_exec_like` 随后从传入的 environment 取 filesystem 并处理 permission/env state。[E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:189][E: codex-rs/core/src/tools/handlers/shell/shell_command.rs:190][E: codex-rs/core/src/tools/handlers/shell.rs:63][E: codex-rs/core/src/tools/handlers/shell.rs:80][E: codex-rs/core/src/tools/handlers/shell.rs:82]
6. explicit sandbox override 在非 `OnRequest` 且未预批准时会被拒绝，避免模型在不允许请求升级的模式下要求 escalated permissions。[E: codex-rs/core/src/tools/handlers/shell.rs:125][E: codex-rs/core/src/tools/handlers/shell.rs:127][E: codex-rs/core/src/tools/handlers/shell.rs:129][E: codex-rs/core/src/tools/handlers/shell.rs:135]
7. 普通 shell path 在发 shell begin event 前调用 `intercept_apply_patch`；如果命令被验证为 apply_patch body，会直接返回 patch output，不再走 shell runtime。[E: codex-rs/core/src/tools/handlers/shell.rs:142][E: codex-rs/core/src/tools/handlers/shell.rs:155][E: codex-rs/core/src/tools/handlers/shell.rs:158][E: codex-rs/core/src/tools/handlers/apply_patch.rs:495]
8. UnifiedExec 的 `exec_command` path 在权限归一化后调用同一个 `intercept_apply_patch`；命中后释放 process id 并把 patch output 包成 exec-command tool output。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:316][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:329][E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:330]
9. 非 apply_patch path 创建 `ToolEmitter::shell`，计算 exec approval requirement，组装 `ShellRequest`，再调用 `ToolOrchestrator::run`。[E: codex-rs/core/src/tools/handlers/shell.rs:158][E: codex-rs/core/src/tools/handlers/shell.rs:175][E: codex-rs/core/src/tools/handlers/shell.rs:192][E: codex-rs/core/src/tools/handlers/shell.rs:211][E: codex-rs/core/src/tools/handlers/shell.rs:219]
10. `ShellRequest` 保存 command、turn environment、shell type、cwd、timeout、env、network、sandbox permissions、additional permissions、justification 和 exec approval requirement。[E: codex-rs/core/src/tools/runtimes/shell.rs:55][E: codex-rs/core/src/tools/runtimes/shell.rs:56][E: codex-rs/core/src/tools/runtimes/shell.rs:60][E: codex-rs/core/src/tools/runtimes/shell.rs:65][E: codex-rs/core/src/tools/runtimes/shell.rs:66][E: codex-rs/core/src/tools/runtimes/shell.rs:70][E: codex-rs/core/src/tools/runtimes/shell.rs:71]
11. `ToolOrchestrator::run` 先从 canonical `PermissionProfile` materialize workspace roots 与 runtime permissions，再处理 approval requirement；`Forbidden` 直接 rejected，`NeedsApproval` 走 approval request。随后 `SandboxAttempt` 同时保存 materialized `permissions` 与给 exec-server 继续派生的 base `exec_server_permissions`，选择 first sandbox attempt 并运行 runtime。[E: codex-rs/core/src/tools/orchestrator.rs:154][E: codex-rs/core/src/tools/orchestrator.rs:160][E: codex-rs/core/src/tools/orchestrator.rs:164][E: codex-rs/core/src/tools/orchestrator.rs:197][E: codex-rs/core/src/tools/orchestrator.rs:200][E: codex-rs/core/src/tools/orchestrator.rs:205][E: codex-rs/core/src/tools/orchestrator.rs:242][E: codex-rs/core/src/tools/orchestrator.rs:260][E: codex-rs/core/src/tools/orchestrator.rs:263][E: codex-rs/core/src/tools/orchestrator.rs:264][E: codex-rs/core/src/tools/orchestrator.rs:281]
12. `ShellRuntime` 是 `Sandboxable`，偏好 Auto sandbox 并支持 failure escalation；approval key 由 environment id、canonical command、`PathUri` cwd、sandbox permissions 和 additional permissions 组成。构造 key 时会把 absolute cwd 归一为 `PathUri::from_abs_path`，因此 approval cache identity 不再直接依赖 host-native `PathBuf` serialization。[E: codex-rs/core/src/tools/runtimes/shell.rs:94][E: codex-rs/core/src/tools/runtimes/shell.rs:100][E: codex-rs/core/src/tools/runtimes/shell.rs:117][E: codex-rs/core/src/tools/runtimes/shell.rs:135]
13. `ShellRuntime::run` 选择 shell、计算 sandbox permissions 和 env，必要时准备 zsh-fork path；stdout stream 带 turn sub-id、call id 和 event sender。[E: codex-rs/core/src/tools/runtimes/shell.rs:248][E: codex-rs/core/src/tools/runtimes/shell.rs:254][E: codex-rs/core/src/tools/runtimes/shell.rs:261][E: codex-rs/core/src/tools/runtimes/shell.rs:268][E: codex-rs/core/src/tools/runtimes/shell.rs:108][E: codex-rs/core/src/tools/runtimes/shell.rs:109][E: codex-rs/core/src/tools/runtimes/shell.rs:110][E: codex-rs/core/src/tools/runtimes/shell.rs:111][E: codex-rs/core/src/tools/runtimes/shell.rs:112]
14. `ToolEmitter::finish` 把 runtime output 转成 exec-style terminal event 和 model-facing text；exec begin/end events 分别由 `emit_exec_command_begin` 和 `emit_exec_end` 路径生成。[E: codex-rs/core/src/tools/handlers/shell.rs:242][E: codex-rs/core/src/tools/events.rs:95][E: codex-rs/core/src/tools/events.rs:506][E: codex-rs/core/src/tools/events.rs:484][E: codex-rs/core/src/tools/events.rs:533]
15. remote UnifiedExec 在 Guardian 路由且 proxy 有 controller decider 时设置 review timeout；process manager 只有看到该 timeout 才把 callback 注入 exec-server backend。进程退出后，本地把 executor denial 与启发式判定合并；启发式命中还会记录规范化 filesystem sandbox violation tracing。[E: codex-rs/core/src/tools/runtimes/unified_exec.rs:344][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:345][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:347][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:353][E: codex-rs/core/src/unified_exec/process_manager.rs:1023][E: codex-rs/core/src/unified_exec/process_manager.rs:1026][E: codex-rs/core/src/unified_exec/process_manager.rs:1077][E: codex-rs/core/src/unified_exec/process_manager.rs:1080][E: codex-rs/core/src/unified_exec/process.rs:302][E: codex-rs/core/src/unified_exec/process.rs:306][E: codex-rs/core/src/unified_exec/process.rs:319][E: codex-rs/core/src/unified_exec/process.rs:321]

## 关键决策点

- apply_patch interception 在 shell begin event 之前发生，因此被重路由的 patch 不会表现为普通 shell command lifecycle。[E: codex-rs/core/src/tools/handlers/shell.rs:142][E: codex-rs/core/src/tools/handlers/shell.rs:158]
- approval 先于 sandbox attempt；sandbox failure escalation 是 orchestrator 的第二阶段能力，不是 shell handler 内部自己 retry。[E: codex-rs/core/src/tools/orchestrator.rs:164][E: codex-rs/core/src/tools/orchestrator.rs:242][E: codex-rs/core/src/tools/runtimes/shell.rs:121]
- shell tool 注册当前应以 `spec_plan.rs::add_shell_tools` 为准。[E: codex-rs/core/src/tools/spec_plan.rs:719]

## 深挖入口

- `spine.trace-apply-patch` 走读 direct apply_patch 和 shell interception 的共用 patch runtime。
- `subsys.exec-sandbox.overview` 展开 sandbox selection、platform sandbox 和 filesystem policy。
- `ref.protocol-event-lifecycle` 列出 exec begin/delta/end 事件字段。

## Sources

- codex-rs/core/src/tools/spec_plan.rs
- codex-rs/core/src/tools/handlers/mod.rs
- codex-rs/core/src/tools/handlers/shell.rs
- codex-rs/core/src/tools/handlers/shell/shell_command.rs
- codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs
- codex-rs/core/src/tools/handlers/apply_patch.rs
- codex-rs/core/src/tools/orchestrator.rs
- codex-rs/core/src/tools/runtimes/shell.rs
- codex-rs/core/src/tools/runtimes/unified_exec.rs
- codex-rs/core/src/unified_exec/process_manager.rs
- codex-rs/core/src/unified_exec/process.rs
- codex-rs/core/src/tools/events.rs

## 相关

- [工具调用解剖](tool-call-anatomy.md)
- [trace: apply_patch](trace-apply-patch.md)
- [exec_command 工具](../surface/tools/exec-command.md)
- [shell_command 工具](../surface/tools/shell-command.md)
- [exec sandbox](../subsystems/exec-sandbox/overview.md)
- 索引 id：`ref.protocol-event-lifecycle`
