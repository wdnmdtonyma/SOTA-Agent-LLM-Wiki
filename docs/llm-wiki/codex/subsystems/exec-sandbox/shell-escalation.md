---
id: subsys.exec-sandbox.shell-escalation
title: Unix shell escalation
kind: subsystem
tier: T2
source: [codex-rs/shell-escalation/src/unix, codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs]
symbols: [EscalateServer, EscalationSession, EscalationPolicy, EscalationDecision, EscalationExecution, ShellCommandExecutor, run_shell_escalation_execve_wrapper]
related: [subsys.exec-sandbox.shell-parsing, subsys.exec-sandbox.execpolicy-dsl, subsys.exec-sandbox.arg0-dispatch, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Unix shell escalation 用 patched shell 的 `EXEC_WRAPPER` 拦截 execve，wrapper 通过 `CODEX_ESCALATE_SOCKET` 向 server 请求决策，server 返回 `Run`、`Escalate` 或 `Deny` 并在需要时 server-side spawn 被拦截命令。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:11][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:14][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:37][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:288]

## 能回答的问题

- `CODEX_ESCALATE_SOCKET` 和 `EXEC_WRAPPER` 各自承载什么？
- wrapper 与 server 的 handshake、per-request stream socket 和 FD passing 是怎样组织的？
- `Run`、`Escalate`、`Deny` 在 server 与 wrapper 侧分别做什么？
- core runtime 怎样把 execpolicy evaluation、approval prompt 和 sandbox permissions 转成 escalation decision？
- escalated exec 怎样重新进入 sandbox transform 或 unsandboxed spawn？

## 职责边界

`codex-rs/shell-escalation/src/unix` 只实现 Unix interception protocol、socket framing、policy trait 和 server/client helper。具体 approval、Guardian、execpolicy fallback、sandbox transform 由 core 的 `unix_escalation.rs` 实现并作为 `EscalationPolicy`/`ShellCommandExecutor` 注入。[E: codex-rs/shell-escalation/src/unix/escalation_policy.rs:7][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:35][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:196][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:762]

## 关键 crate/文件

- `codex-rs/shell-escalation/src/unix/escalate_protocol.rs`: env var constants、request/response/action/decision/execution/envelope structs。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:10][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:17][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:31][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:68]
- `codex-rs/shell-escalation/src/unix/socket.rs`: stream/datagram Unix socket framing、SCM_RIGHTS FD passing、async wrappers。[E: codex-rs/shell-escalation/src/unix/socket.rs:19][E: codex-rs/shell-escalation/src/unix/socket.rs:48][E: codex-rs/shell-escalation/src/unix/socket.rs:279][E: codex-rs/shell-escalation/src/unix/socket.rs:366]
- `codex-rs/shell-escalation/src/unix/escalate_client.rs`: execve wrapper client path，发送 handshake/request，处理 `Run/Escalate/Deny`。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:36][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:40][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:63]
- `codex-rs/shell-escalation/src/unix/escalate_server.rs`: session env overlay、datagram accept loop、per-request handler、server-side spawn。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:127][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:185][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:222][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:260]
- `codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs`: Codex core 的 policy provider 和 command executor，把 approval/sandbox/execpolicy 接到 protocol 上。[E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:196][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:578][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:762]

## 数据模型

- `EscalateRequest`: wrapper 发送被拦截的 executable `file`、完整 `argv`、`workdir` 和过滤后的 `env`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:18][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:23][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:25][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:26][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:27]
- `EscalationDecision`: server policy 的内部 decision，可能是 `Run`、`Escalate(EscalationExecution)` 或 `Deny { reason }`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:37][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:38][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:39][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:40]
- `EscalationExecution`: escalated execution 可以是 `Unsandboxed`、`TurnDefault` 或 explicit `Permissions`。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:45][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:47][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:49][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:51]
- `SuperExecMessage`: wrapper 在 `Escalate` 后发送 destination fd numbers，并通过 SCM_RIGHTS control message 附带实际 fds。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:79][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:81][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:81][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:86]
- `PreparedExec`: core executor 返回 server-side spawn 用的 command、cwd、env 和 optional arg0。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:87][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:89][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:90][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:91][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:92]

## protocol 控制流

1. `EscalateServer::start_session` 创建 datagram socket pair，把 client endpoint 设为 non-CLOEXEC，导出 `CODEX_ESCALATE_SOCKET=<fd>` 和 `EXEC_WRAPPER=<path>` 环境 overlay。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:185][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:191][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:195][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:205][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:210]
2. wrapper entrypoint 解析 `file` 和 trailing `argv`，调用 `run_shell_escalation_execve_wrapper`，并以返回 exit code 退出。[E: codex-rs/shell-escalation/src/unix/execve_wrapper.rs:7][E: codex-rs/shell-escalation/src/unix/execve_wrapper.rs:22][E: codex-rs/shell-escalation/src/unix/execve_wrapper.rs:23][E: codex-rs/shell-escalation/src/unix/execve_wrapper.rs:24]
3. wrapper 从 `CODEX_ESCALATE_SOCKET` 读取 inherited datagram fd，创建 per-request stream socket pair，把 server stream endpoint 通过 datagram SCM_RIGHTS 发给 server。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:19][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:40][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:41][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:43]
4. wrapper 过滤掉 `CODEX_ESCALATE_SOCKET` 和 `EXEC_WRAPPER`，发送 `EscalateRequest`，再等待 `EscalateResponse`。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:47][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:51][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:59]
5. server 的 datagram task 收到 exactly one fd 后，为每个 request stream spawn handler。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:229][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:235][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:239][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:244]
6. per-request handler 接收 `EscalateRequest`，把 relative file resolve 到 request workdir，调用 policy `determine_action`。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:267][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:277][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:278]
7. `Run` response 会让 wrapper 用 raw `libc::execv` 原地执行 intercepted command。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:289][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:93][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:109]
8. `Escalate` response 会让 wrapper duplicate stdin/stdout/stderr，发送 destination fd list 和 duplicated fds；server 调用 `prepare_escalated_exec`，spawn child，在 `pre_exec` 中把 received fds `dup2` 到目标 fd，最后把 exit code 返回 wrapper。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:64][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:73][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:81][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:302][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:323][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:340][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:360]
9. `Deny` response 会让 wrapper 打印 denial reason 并返回 exit code 1。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:366][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:116][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:121]

## core policy 控制流

1. `try_run_zsh_fork` 只在配置了 zsh path、feature enabled、用户 shell 是 Zsh 时继续。[E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:103][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:107][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:111]
2. core 构造 `CoreShellActionProvider`，注入 execpolicy、approval policy、sandbox policies、prompt permissions 和 stopwatch。[E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:196][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:202][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:203][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:208]
3. `determine_action` 调用 `evaluate_intercepted_exec_policy`，再判断 decision 是否由 real policy rule 驱动；real policy rule 或 request 本身要求 escalated permissions 时 `needs_escalation` 为 true。[E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:589][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:607][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:609]
4. `process_decision` 把 `Decision::Forbidden` 转为 deny；`Decision::Prompt` 会先检查 approval policy 是否允许 prompt，再走 hooks/Guardian/user prompt；`Decision::Allow` 在需要 escalation 时返回 `Escalate`，否则返回 `Run`。[E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:496][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:497][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:500][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:556]
5. `prepare_escalated_exec` 对 `Unsandboxed` 返回原 command/cwd/env/arg0；对 `TurnDefault` 或 explicit permissions 走 `prepare_sandboxed_exec`，后者再次调用 `SandboxManager::transform`。[E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:829][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:836][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:861][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:897][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:916]

## 设计动机与权衡

- datagram socket 只用于传 per-request stream fd；response 在单独 stream socket 上完成，使同一个 inherited fd 可以处理多个并发 exec escalation requests。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:229][E: codex-rs/shell-escalation/src/unix/escalate_server.rs:244][I]
- wrapper 的 `Run` path 使用 `libc::execv` 而不是 `std::process::Command`，代码说明这是为了尽量透明，避免 `CommandExt::exec()` 的 signal mask 和 fd 操作副作用。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:94][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:109]
- shell-wrapper parsing 默认关闭，core 注释说明 shell wrapper 只能看到 script text，不能看到最终 resolved executable path，所以 path-sensitive rules 依赖后续 authoritative execve interception。[E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:571][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:575]

## gotcha

- `EscalationSession::env()` 只返回 wrapper/socket overlay，不是完整 child environment；core executor 只合并 `CODEX_ESCALATE_SOCKET` 和 `EXEC_WRAPPER` 两个变量。[E: codex-rs/shell-escalation/src/unix/escalate_server.rs:103][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:771][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:774]
- wrapper 转发 `EscalateRequest.env` 时会过滤掉 escalation env vars，避免 server-side escalated child 继承旧 wrapper/socket control vars。[E: codex-rs/shell-escalation/src/unix/escalate_client.rs:47][E: codex-rs/shell-escalation/src/unix/escalate_client.rs:48]
- `Stopwatch::pause_for` 会在 approval prompt 期间暂停 timeout，避免用户/Guardian 等待时间直接耗尽命令执行 timeout。[E: codex-rs/shell-escalation/src/unix/stopwatch.rs:97][E: codex-rs/shell-escalation/src/unix/stopwatch.rs:101][E: codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs:402]

## Sources

- `codex-rs/shell-escalation/src/unix`
- `codex-rs/core/src/tools/runtimes/shell/unix_escalation.rs`

## 相关

- `subsys.exec-sandbox.shell-parsing`
- `subsys.exec-sandbox.execpolicy-dsl`
- `subsys.exec-sandbox.arg0-dispatch`
- `spine.shell-exec-flow`
