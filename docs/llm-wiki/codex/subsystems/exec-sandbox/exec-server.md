---
id: subsys.exec-sandbox.exec-server
title: exec-server 与 PTY runtime
kind: subsystem
tier: T2
source: [codex-rs/exec-server-protocol/src/lib.rs, codex-rs/exec-server-protocol/src/protocol.rs, codex-rs/exec-server-protocol/src/network_policy.rs, codex-rs/exec-server/src/server, codex-rs/exec-server/src/server/request_dispatcher.rs, codex-rs/exec-server/src/server/registry.rs, codex-rs/exec-server/src/local_process.rs, codex-rs/exec-server/src/process.rs, codex-rs/exec-server/src/remote_process.rs, codex-rs/exec-server/src/client.rs, codex-rs/exec-server/src/client_recovery.rs, codex-rs/exec-server/src/remote.rs, codex-rs/exec-server/src/remote_file_system.rs, codex-rs/exec-server/src/capability_discovery.rs, codex-rs/exec-server/src/environment.rs, codex-rs/exec-server/src/environment_config.rs, codex-rs/exec-server/src/sandboxed_file_open.rs, codex-rs/exec-server/src/network_policy_decisions.rs, codex-rs/exec-server/src/process_sandbox.rs, bazel/rules/testing/compat/exec_server_compat_test.rs, MODULE.bazel, codex-rs/exec-server/src/server/file_system_handler.rs, codex-rs/cli/src/main.rs, codex-rs/utils/pty/src, codex-rs/core/src/tools/runtimes/unified_exec.rs, codex-rs/core/src/unified_exec/process_manager.rs, codex-rs/core/src/unified_exec/process.rs, codex-rs/features/src/lib.rs]
symbols: [ExecServerHandler, ConnectionProcessor, RequestDispatcher, SessionRegistry, LocalProcess, RunningProcess, RemoteProcess, ExecBackend::start_with_network_policy_decider, NetworkPolicyRequestParams, ExecServerNetworkPolicyDecision, ProcessSandboxType, CapabilityRootDiscoverRequest, spawn_pty_process, spawn_pipe_process, ProcessHandle]
related: [tool.exec-command, tool.write-stdin, subsys.exec-sandbox.overview, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> exec-server 是 Codex 的 JSON-RPC process/file-system server：本地可监听 `ws://IP:PORT` 或 `stdio`，remote mode 则经 registry/Noise relay 暴露 executor；它管理可 attach/resume 的 sessions、PTY/pipe processes、sandboxed filesystem 与 controller-side network callbacks。version-skew 兼容测试已迁到 Bazel harness，不再使用已删除的 `run_version_skew.sh`。[E: codex-rs/exec-server/src/server/transport.rs:63][E: codex-rs/exec-server/src/server/transport.rs:66][E: codex-rs/exec-server/src/server/transport.rs:70][E: bazel/rules/testing/compat/exec_server_compat_test.rs:48]

## 能回答的问题

- exec-server connection 如何路由 JSON-RPC requests 与 notifications？
- session attach/resume/detach 的 TTL 语义是什么？
- `process/start`、`process/read`、`process/write`、`process/terminate` 在 handler 中怎样进入 process layer？
- `LocalProcess` 怎样保留输出 chunks、发送 notifications、处理 stdin 和 terminate？
- per-process managed network proxy 为什么要存活到所有继承的 output streams 关闭？
- `network/policyRequest` 如何在 exec-server 与 controller 间反向询问 allow/deny/ask？
- PTY 与 pipe spawn backend 的差异在哪里？
- remote exec 怎样把进程生命周期、network review 与父 stdin 绑定？
- capability discovery 和 remote filesystem 怎样保持 sandbox context？

## 职责边界

exec-server 节点覆盖 server/session lifecycle、local/remote process backend、remote filesystem/capability discovery 和 `codex_utils_pty` adapter。它不定义 shell tool approval 或 OS sandbox policy language；controller 只在 remote network callback path 注入 authoritative decider，executor 仍负责 local proxy enforcement。[I]

## 关键 crate/文件

- `codex-rs/exec-server/src/server/transport.rs`: 解析 `ws://IP:PORT` 和 `stdio` listen URL，再分发到 WebSocket listener 或 stdio connection processor。[E: codex-rs/exec-server/src/server/transport.rs:63][E: codex-rs/exec-server/src/server/transport.rs:84]
- `codex-rs/exec-server/src/server/processor.rs`: 建立 connection-local handler/outbound pump，并以 inbound loop 保持 initialize/initialized ordering；具体 message dispatch 委托给 `RequestDispatcher`。[E: codex-rs/exec-server/src/server/processor.rs:102][E: codex-rs/exec-server/src/server/processor.rs:151]
- `codex-rs/exec-server/src/server/request_dispatcher.rs`: 处理 request/notification/reverse response；可按 Inline 或 Concurrent lanes 调度。[E: codex-rs/exec-server/src/server/request_dispatcher.rs:36][E: codex-rs/exec-server/src/server/request_dispatcher.rs:173]
- `codex-rs/exec-server/src/server/handler.rs`: `ExecServerHandler` 持有 session registry、notification sender、current session、active body stream ids、background-task shutdown/tracker、filesystem handler、runtime paths、HTTP client、initialize requested flag 和 initialized flag。[E: codex-rs/exec-server/src/server/handler.rs:76]
- `codex-rs/exec-server/src/server/session_registry.rs`: session attach/resume/detach、detached TTL expiration 和 process shutdown。[E: codex-rs/exec-server/src/server/session_registry.rs:18][E: codex-rs/exec-server/src/server/session_registry.rs:80]
- `codex-rs/exec-server/src/local_process.rs`: process map、stream chunks、output retention、idempotent stdin write、terminate、exit watch、sandbox-denied detection。[E: codex-rs/exec-server/src/local_process.rs:105][E: codex-rs/exec-server/src/local_process.rs:281]
- `codex-rs/utils/pty/src`: portable PTY 和 pipe process drivers。[E: codex-rs/utils/pty/src/lib.rs:17][E: codex-rs/utils/pty/src/lib.rs:41]
- `bazel/rules/testing/compat/exec_server_compat_test.rs`: current/released app-server 与 exec-server 的 Noise version-skew 测试。[E: bazel/rules/testing/compat/exec_server_compat_test.rs:48]

## 数据模型

- `ExecServerHandler`: connection-local handler state 包含 `session_registry`、`notifications`、`session`、active body stream ids、background-task shutdown/tracker、`file_system`、`runtime_paths`、`http_client`、`initialize_requested`、`initialized`。[E: codex-rs/exec-server/src/server/handler.rs:76][E: codex-rs/exec-server/src/server/handler.rs:86]
- `SessionRegistry`: 用 `sessions: HashMap<String, SessionEntry>` 存储可 resume 的 detached sessions。[E: codex-rs/exec-server/src/server/session_registry.rs:22]
- `AttachmentState` 保存 current connection id、detached connection id 和 detached expiration instant。[E: codex-rs/exec-server/src/server/session_registry.rs:33]
- `RunningProcess` 保存 process session、tty/pipe-stdin flags、accepted stdin write ids、retained output/bytes、sequence/exit/wake/event/open-stream state、metrics、sandbox-denied state，以及与该 process 同生命周期的 optional `NetworkProxyHandle`。[E: codex-rs/exec-server/src/local_process.rs:105][E: codex-rs/exec-server/src/local_process.rs:123]
- `ExecResponse.sandbox_type` 是 optional：新 peer 显式报告 none/Seatbelt/Linux/Windows backend，旧 peer 缺字段时 controller 不猜 backend。[E: codex-rs/exec-server-protocol/src/protocol.rs:354]

## 控制流

1. `run_transport` 调用 `parse_listen_url`：`stdio` / `stdio://` 走 stdio connection，`ws://` 走 WebSocket listener。[E: codex-rs/exec-server/src/server/transport.rs:63][E: codex-rs/exec-server/src/server/transport.rs:66][E: codex-rs/exec-server/src/server/transport.rs:70][E: codex-rs/exec-server/src/server/transport.rs:84][E: codex-rs/exec-server/src/server/transport.rs:91]
2. `run_connection` 建立 handler/outbound pump，并创建 `RequestDispatcher`。[E: codex-rs/exec-server/src/server/processor.rs:108][E: codex-rs/exec-server/src/server/processor.rs:151]
3. inbound loop 逐个处理 event；具体 request/notification/response 由 dispatcher 执行。[E: codex-rs/exec-server/src/server/processor.rs:161]
4. handler 的 `initialize` 只能执行一次；它调用 `SessionRegistry::attach` attach 或 resume session，并返回 `InitializeResponse { session_id, environment_info }`。客户端随后发送 `initialized` notification 时，`initialized()` 才把 initialized flag 置为 true。[E: codex-rs/exec-server/src/server/handler.rs:129][E: codex-rs/exec-server/src/server/handler.rs:133][E: codex-rs/exec-server/src/server/handler.rs:164][E: codex-rs/exec-server/src/server/handler.rs:176]
5. `SessionRegistry::attach` 对 unknown session id 返回 invalid request，对仍有 active connection 的 session 拒绝 attach，对 detached session resume；没有 session id 时创建 UUID session。[E: codex-rs/exec-server/src/server/session_registry.rs:84][E: codex-rs/exec-server/src/server/session_registry.rs:90][E: codex-rs/exec-server/src/server/session_registry.rs:100]
6. JSON-RPC `process/start` 路由到 `handler.exec`；它要求 connection 已 initialized，再把 `ExecParams` 交给 session process backend。[E: codex-rs/exec-server-protocol/src/protocol.rs:22][E: codex-rs/exec-server/src/server/registry.rs:73][E: codex-rs/exec-server/src/server/handler.rs:176][E: codex-rs/exec-server/src/server/handler.rs:238]
7. `LocalProcess::start_process` 校验 network policy timeout/process id，准备 sandboxed exec request，再选择 PTY/pipe backend。[E: codex-rs/exec-server/src/local_process.rs:281][E: codex-rs/exec-server/src/local_process.rs:307]
8. output retention 使用 1 MiB byte cap 和 50,000 chunk cap，让 `process/read` 可以补读历史输出，同时避免大量微小 chunks 超过共享 JSON value budget。[E: codex-rs/exec-server/src/local_process.rs:85][E: codex-rs/exec-server/src/local_process.rs:88][E: codex-rs/exec-server-protocol/src/protocol.rs:23]
9. `process/write` acceptance 按 `write_id` 幂等：已接受的 retry 只 acknowledge，不再把同一 stdin bytes 写两次。[E: codex-rs/exec-server-protocol/src/protocol.rs:24][E: codex-rs/exec-server/src/local_process.rs:133][E: codex-rs/exec-server/src/local_process.rs:139]

## Network policy callback

反向 server request `network/policyRequest` 的 params 包含 process id 与 `{protocol, host, port}`；protocol 可为 HTTP、HTTPS CONNECT、SOCKS5 TCP/UDP，response decision 是 `allow`、`deny {reason}` 或 `ask {reason}`。[E: codex-rs/exec-server-protocol/src/network_policy.rs:6][E: codex-rs/exec-server-protocol/src/network_policy.rs:14][E: codex-rs/exec-server-protocol/src/network_policy.rs:65]

executor-local `LocalProcess` 只有在 launch config 提供非零 `policy_decision_timeout_ms` 时才安装反向 decider。[E: codex-rs/exec-server/src/local_process.rs:303][E: codex-rs/exec-server/src/local_process.rs:307]

不支持 remote callback 的 backend 默认返回 protocol error。[E: codex-rs/exec-server/src/process.rs:238][E: codex-rs/exec-server/src/process.rs:244]

`Ask` 是协议与 policy engine 的第三种决定，但仅凭 exec-server 层不能断言一定弹出 UI；是否提示、自动批准或拒绝由上层 controller 的 decider 决定。[U]

## Remote ownership、compatibility 与 filesystem

`ExecResponse.sandbox_type` 是 optional compatibility field：缺字段时 controller 不猜 backend，也就跳过本地 normalized violation attribution。[E: codex-rs/exec-server-protocol/src/protocol.rs:354]

`FileSystemHandler::read_file` 返回 base64 编码 bytes；`write_file` 接收 base64 并 decode，decode 失败映射 invalid request。[E: codex-rs/exec-server/src/server/file_system_handler.rs:178][E: codex-rs/exec-server/src/server/file_system_handler.rs:186]

`FileSystemHandler` 还暴露 `walk`。[E: codex-rs/exec-server/src/server/file_system_handler.rs:287]

Windows 上 `Feature::UnifiedExec` 现在默认 `true`，因此 Windows executor 默认也走 unified exec 路径。[E: codex-rs/features/src/lib.rs:950]

protocol crate **不再**声明 0.145.0 runtime 兼容常量。Bazel 兼容测试 pin 当前拉取 0.145.0 与 0.150.1 两份 released archive。[E: MODULE.bazel:446][E: MODULE.bazel:500][E: bazel/rules/testing/compat/exec_server_compat_test.rs:48]

## PTY 与 pipe backend

- `spawn_pty_process` 从 `codex_utils_pty` 导出，供交互式 PTY 使用。[E: codex-rs/utils/pty/src/lib.rs:41]
- `spawn_pipe_process` 用普通 pipes 做非交互进程。[E: codex-rs/utils/pty/src/lib.rs:17]
- `ProcessHandle` / `SpawnedProcess` / `spawn_from_driver` 是 exec-server 与底层 ConPTY/portable PTY/pipe 之间的适配层。[E: codex-rs/utils/pty/src/lib.rs:23][E: codex-rs/utils/pty/src/lib.rs:27][E: codex-rs/utils/pty/src/lib.rs:33]

## 设计动机与权衡

- session registry 允许 WebSocket 或 stdio JSON-RPC connection 短暂 detach/resume，避免 transport churn 立刻丢掉 running process；TTL expiry 仍会 shutdown process backend。[E: codex-rs/exec-server/src/server/session_registry.rs:18][I]
- output retention 使用 sequence numbers、1 MiB byte cap 和 50,000 chunk cap，让 `process/read` 可以补读历史输出。[E: codex-rs/exec-server/src/local_process.rs:85]
- PTY 与 pipe backend 共享 `ProcessDriver`/`ProcessHandle` abstraction，exec-server 不需要知道底层是 ConPTY、portable PTY 还是 pipe process。[E: codex-rs/utils/pty/src/lib.rs:21]

## gotcha

- `DETACHED_SESSION_TTL` 在 test cfg 下是 200 ms，在非 test cfg 下是 30 seconds。[E: codex-rs/exec-server/src/server/session_registry.rs:18][E: codex-rs/exec-server/src/server/session_registry.rs:20]
- `process/write` acceptance 按 `write_id` 幂等；accepted retry 不是 child 已同步消费这些 bytes 的证明。[E: codex-rs/exec-server/src/local_process.rs:133]
- version-skew 测试依赖 `CODEX_TEST_RELEASED_CODEX` / `CODEX_TEST_CURRENT_CODEX`。缺少 `CODEX_TEST_RELEASED_CODEX` 时测试 skip；若 released 已设置但缺少 `CODEX_TEST_CURRENT_CODEX`，则返回 error 而不是 skip。[E: bazel/rules/testing/compat/exec_server_compat_test.rs:64][E: bazel/rules/testing/compat/exec_server_compat_test.rs:67]

## Sources

- `codex-rs/exec-server/src/server`
- `codex-rs/exec-server/src/server/request_dispatcher.rs`
- `codex-rs/exec-server/src/server/registry.rs`
- `codex-rs/exec-server/src/local_process.rs`
- `codex-rs/exec-server/src/process.rs`
- `codex-rs/exec-server/src/remote_process.rs`
- `codex-rs/exec-server/src/client.rs`
- `codex-rs/exec-server/src/remote.rs`
- `codex-rs/exec-server/src/remote_file_system.rs`
- `codex-rs/exec-server/src/capability_discovery.rs`
- `codex-rs/exec-server/src/environment.rs`
- `codex-rs/exec-server/src/environment_config.rs`
- `codex-rs/exec-server/src/sandboxed_file_open.rs`
- `codex-rs/exec-server-protocol/src/lib.rs`
- `codex-rs/exec-server-protocol/src/protocol.rs`
- `codex-rs/exec-server-protocol/src/network_policy.rs`
- `codex-rs/exec-server/src/network_policy_decisions.rs`
- `codex-rs/exec-server/src/client_recovery.rs`
- `codex-rs/exec-server/src/process_sandbox.rs`
- `bazel/rules/testing/compat/exec_server_compat_test.rs`
- `MODULE.bazel`
- `codex-rs/exec-server/src/server/file_system_handler.rs`
- `codex-rs/cli/src/main.rs`
- `codex-rs/utils/pty/src`
- `codex-rs/core/src/tools/runtimes/unified_exec.rs`
- `codex-rs/core/src/unified_exec/process_manager.rs`
- `codex-rs/core/src/unified_exec/process.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- `tool.exec-command`
- `tool.write-stdin`
- `subsys.exec-sandbox.overview`
- `spine.shell-exec-flow`
