---
id: subsys.exec-sandbox.shell-escalation
title: Unix shell escalation
kind: subsystem
tier: T2
source: [codex-rs/shell-escalation/src/unix, codex-rs/core/src/tools/runtimes/zsh_fork.rs, codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs, codex-rs/core/src/unified_exec/process.rs]
symbols: [EscalateServer, EscalationSession, EscalationPolicy, EscalationDecision, EscalationExecution, ShellCommandExecutor, run_shell_escalation_execve_wrapper, prepare_unified_exec_zsh_fork, maybe_prepare_unified_exec]
related: [subsys.exec-sandbox.shell-parsing, subsys.exec-sandbox.execpolicy-dsl, subsys.exec-sandbox.arg0-dispatch, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Unix shell escalation 用 patched shell 的 `EXEC_WRAPPER` 拦截 execve，wrapper 通过 `CODEX_ESCALATE_SOCKET` 向 server 请求决策，server 返回 `Run`、`Escalate` 或 `Deny` 并在需要时 server-side spawn 被拦截命令。core 入口已从旧 `try_run_zsh_fork` / `runtimes/shell/unix_escalation.rs` 迁到 `prepare_unified_exec_zsh_fork`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:11][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:14][E: codex-rs/core/src/tools/runtimes/zsh_fork.rs:69]

## 能回答的问题

- `CODEX_ESCALATE_SOCKET` 和 `EXEC_WRAPPER` 各自承载什么？
- wrapper 与 server 的 handshake、per-request stream socket 和 FD passing 是怎样组织的？
- `Run`、`Escalate`、`Deny` 在 server 与 wrapper 侧分别做什么？
- core runtime 怎样把 execpolicy evaluation、approval prompt 和 sandbox permissions 转成 escalation decision？
- escalated exec 怎样重新进入 sandbox transform 或 unsandboxed spawn？

## 职责边界

`codex-rs/shell-escalation/src/unix` 只实现 Unix interception protocol、socket framing、policy trait 和 server/client helper。具体 approval、Guardian、execpolicy fallback、sandbox transform 由 core 的 `zsh_fork/unix_escalation.rs` 实现并作为 `EscalationPolicy`/`ShellCommandExecutor` 注入。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:37][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:411]

## 关键 crate/文件

- `codex-rs/shell-escalation/src/unix/escalate_protocol.rs`: env var constants、request/response/action/decision/execution/envelope structs。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:11][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:18][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:37]
- `codex-rs/shell-escalation/src/unix/escalate_client.rs`: execve wrapper client path，发送 handshake/request，处理 `Run/Escalate/Deny`。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:36][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:40]
- `codex-rs/shell-escalation/src/unix/escalate_server.rs`: session env overlay、datagram accept loop、per-request handler、server-side spawn。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:190][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:265]
- `codex-rs/core/src/tools/runtimes/zsh_fork.rs`: unified-exec 的 zsh-fork 入口 `maybe_prepare_unified_exec`。[E: codex-rs/core/src/tools/runtimes/zsh_fork.rs:20]
- `codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs`: Codex core 的 policy provider 和 command executor。[E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:85][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:411]

## 数据模型

- `EscalateRequest`: wrapper 发送被拦截的 executable `file`、完整 `argv`、`workdir` 和过滤后的 `env`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:18]
- `EscalationDecision`: server policy 的内部 decision，可能是 `Run`、`Escalate(EscalationExecution)` 或 `Deny { reason }`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:37]
- `EscalationExecution`: escalated execution 可以是 `Unsandboxed`、`TurnDefault` 或 explicit `Permissions`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:45]
- `SuperExecMessage`: wrapper 在 `Escalate` 后发送 destination fd numbers，并通过 SCM_RIGHTS control message 附带实际 fds。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:80]
- `EscalateAction`: 发给 wrapper 的 wire action，同样是 `Run` / `Escalate` / `Deny`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:69]

## protocol 控制流

1. `EscalateServer::start_session` 创建 datagram socket pair，把 client endpoint 设为 non-CLOEXEC，导出 `CODEX_ESCALATE_SOCKET=<fd>` 和 `EXEC_WRAPPER=<path>` 环境 overlay。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:190][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:210][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:214]
2. wrapper entrypoint 解析 `file` 和 trailing `argv`，调用 `run_shell_escalation_execve_wrapper`，并以返回 exit code 退出。[E: codex-rs/shell-escalation/src/unix/execve_wrapper.rs:22][E: codex-rs/shell-escalation/src/unix/execve_wrapper.rs:23]
3. wrapper 从 `CODEX_ESCALATE_SOCKET` 读取 inherited datagram fd，创建 per-request stream socket pair，把 server stream endpoint 通过 datagram SCM_RIGHTS 发给 server。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:19][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:40][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:44]
4. wrapper 过滤掉 `CODEX_ESCALATE_SOCKET` 和 `EXEC_WRAPPER`，发送 `EscalateRequest`，再等待 `EscalateResponse`。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:48][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:51]
5. server 的 datagram task 收到 stream fd 后，为每个 request stream spawn handler。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:250]
6. per-request handler 接收 `EscalateRequest`，把 relative file resolve 到 request workdir，调用 policy `determine_action`。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:272][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:282][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:284]
7. `Run` response 会让 wrapper 用 raw `libc::execv` 原地执行 intercepted command。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:294][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:110]
8. `Escalate` response 会让 wrapper 转发 fds；server 调用 `prepare_escalated_exec` 后 spawn child，再把 exit code 返回 wrapper。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:301][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:680]
9. `Deny` response 会让 wrapper 打印 denial reason 并返回 exit code 1。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:373][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:116][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:121]

## core policy 控制流

1. unified-exec runtime 调 `maybe_prepare_unified_exec`；Unix 上再进 `prepare_unified_exec_zsh_fork`。命令必须把配置的 zsh path 作为 `-c`/`-lc` program（可被 wrapper 前缀包围），否则回退普通 spawn。[E: codex-rs/core/src/tools/runtimes/zsh_fork.rs:20][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:85][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:100][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:834][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:838]
2. core 构造 `CoreShellActionProvider`，注入 execpolicy、approval policy、permission profile、sandbox permissions 和 stopwatch。[E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:146][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:162]
3. `determine_action` 调用 `evaluate_intercepted_exec_policy`；`ENABLE_INTERCEPTED_EXEC_POLICY_SHELL_WRAPPER_PARSING` 固定为 `false`。`UseDefault`/`RequireEscalated` 只有在 `unsandboxed_allowed` 允许时才会触发 escalation，`WithAdditionalPermissions` 总是触发 escalation。[E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:408][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:411][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:443]
4. `process_decision` 把 `Decision::Forbidden` 转为 deny；`Decision::Prompt` 会先检查 approval policy 是否允许 prompt，再走 hooks/Guardian/user prompt；`Decision::Allow` 在需要 escalation 时返回 `Escalate`，否则返回 `Run`。[E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:332][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:389]
5. `prepare_escalated_exec` 对 `Unsandboxed` 返回原 command/cwd/arg0，并用 `exec_env_for_sandbox_permissions(..., RequireEscalated)` 派生 env；对 `TurnDefault` 或 explicit permissions 走 `prepare_sandboxed_exec`。[E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:696][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:749]
6. unix_escalation 路径本身**不再**调用 `record_filesystem_sandbox_violation`；进程退出后的 sandbox denial 归因在 unified-exec `process.rs`。[E: codex-rs/core/src/unified_exec/process.rs:326]

## 设计动机与权衡

- datagram socket 只用于传 per-request stream fd；response 在单独 stream socket 上完成，使同一个 inherited fd 可以处理多个并发 exec escalation requests。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:41][I]
- wrapper 的 `Run` path 使用 `libc::execv` 而不是 `std::process::Command`，代码说明这是为了尽量透明，避免 `CommandExt::exec()` 的 signal mask 和 fd 操作副作用。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:110]
- shell-wrapper parsing 默认关闭，core 注释说明 shell wrapper 只能看到 script text，不能看到最终 resolved executable path，所以 path-sensitive rules 依赖后续 authoritative execve interception。[E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:408]

## gotcha

- `EscalationSession::env()` 只返回 wrapper/socket overlay，不是完整 child environment；core executor 只合并 `CODEX_ESCALATE_SOCKET` 和 `EXEC_WRAPPER` 两个变量。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:113][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:635]
- wrapper 转发 `EscalateRequest.env` 时会过滤掉 escalation env vars，避免 server-side escalated child 继承旧 wrapper/socket control vars。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:48]
- `Stopwatch::pause_for` 会在 approval prompt 期间暂停 timeout，避免用户/Guardian 等待时间直接耗尽命令执行 timeout。[E: codex-rs/shell-escalation/src/unix/stopwatch.rs:97][E: codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs:283]

## Sources

- `codex-rs/shell-escalation/src/unix`
- `codex-rs/core/src/tools/runtimes/zsh_fork.rs`
- `codex-rs/core/src/tools/runtimes/zsh_fork/unix_escalation.rs`
- `codex-rs/core/src/unified_exec/process.rs`

## 相关

- `subsys.exec-sandbox.shell-parsing`
- `subsys.exec-sandbox.execpolicy-dsl`
- `subsys.exec-sandbox.arg0-dispatch`
- `spine.shell-exec-flow`
