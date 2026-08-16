---
id: subsys.exec-sandbox.exec-server
title: exec-server 与 PTY runtime
kind: subsystem
tier: T2
source: [codex-rs/exec-server-protocol/src/lib.rs, codex-rs/exec-server-protocol/src/protocol.rs, codex-rs/exec-server-protocol/src/network_policy.rs, codex-rs/exec-server/src/server, codex-rs/exec-server/src/server/request_dispatcher.rs, codex-rs/exec-server/src/local_process.rs, codex-rs/exec-server/src/process.rs, codex-rs/exec-server/src/remote_process.rs, codex-rs/exec-server/src/client.rs, codex-rs/exec-server/src/client_recovery.rs, codex-rs/exec-server/src/remote.rs, codex-rs/exec-server/src/remote_file_system.rs, codex-rs/exec-server/src/capability_discovery.rs, codex-rs/exec-server/src/environment.rs, codex-rs/exec-server/src/environment_config.rs, codex-rs/exec-server/src/sandboxed_file_open.rs, codex-rs/exec-server/src/network_policy_decisions.rs, codex-rs/exec-server/src/process_sandbox.rs, codex-rs/exec-server/testing/run_version_skew.sh, codex-rs/exec-server/tests/relay/version_skew.rs, codex-rs/cli/src/main.rs, codex-rs/utils/pty/src, codex-rs/core/src/tools/runtimes/unified_exec.rs, codex-rs/core/src/unified_exec/process_manager.rs, codex-rs/core/src/unified_exec/process.rs]
symbols: [ExecServerHandler, ConnectionProcessor, RequestDispatcher, SessionRegistry, LocalProcess, RunningProcess, RemoteProcess, ExecBackend::start_with_network_policy_decider, NetworkPolicyRequestParams, ExecServerNetworkPolicyDecision, ProcessSandboxType, CapabilityRootDiscoverRequest, run_remote_environment_until_shutdown, spawn_pty_process, spawn_pipe_process, ProcessHandle]
related: [tool.exec-command, tool.write-stdin, subsys.exec-sandbox.overview, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> exec-server 是 Codex 的 JSON-RPC process/file-system server：本地可监听 `ws://IP:PORT` 或 `stdio`，remote mode 则经 registry/Noise relay 暴露 executor；它管理可 attach/resume 的 sessions、PTY/pipe processes、sandboxed filesystem 与 controller-side network callbacks。[E: codex-rs/exec-server/src/server/transport.rs:61][E: codex-rs/exec-server/src/server/transport.rs:67][E: codex-rs/exec-server/src/remote.rs:513][E: codex-rs/exec-server/src/remote.rs:523][E: codex-rs/exec-server/src/local_process.rs:265][E: codex-rs/exec-server/src/local_process.rs:274][E: codex-rs/exec-server/src/server/file_system_handler.rs:39][E: codex-rs/exec-server/src/process.rs:226]

## 能回答的问题

- exec-server connection 如何路由 JSON-RPC requests 与 notifications？
- session attach/resume/detach 的 TTL 语义是什么？
- `exec`、`exec/read`、`exec/write`、`exec/terminate` 在 handler 中怎样进入 process layer？
- `LocalProcess` 怎样保留输出 chunks、发送 notifications、处理 stdin 和 terminate？
- per-process managed network proxy 为什么要存活到所有继承的 output streams 关闭？
- `network/policyRequest` 如何在 exec-server 与 controller 间反向询问 allow/deny/ask？
- PTY 与 pipe spawn backend 的差异在哪里？
- remote exec 怎样把进程生命周期、network review 与父 stdin 绑定？
- capability discovery 和 remote filesystem 怎样保持 sandbox context？

## 职责边界

exec-server 节点覆盖 server/session lifecycle、local/remote process backend、remote filesystem/capability discovery 和 `codex_utils_pty` adapter。它不定义 shell tool approval 或 OS sandbox policy language；controller 只在 remote network callback path 注入 authoritative decider，executor 仍负责 local proxy enforcement。[I]

## 关键 crate/文件

- `codex-rs/exec-server/src/server/transport.rs`: parses `ws://IP:PORT` and `stdio` listen URLs, then dispatches to WebSocket listener or stdio connection processor; both transports now receive `ExecServerTelemetry`.[E: codex-rs/exec-server/src/server/transport.rs:61][E: codex-rs/exec-server/src/server/transport.rs:65][E: codex-rs/exec-server/src/server/transport.rs:67][E: codex-rs/exec-server/src/server/transport.rs:80][E: codex-rs/exec-server/src/server/transport.rs:89][E: codex-rs/exec-server/src/server/transport.rs:91][E: codex-rs/exec-server/src/server/transport.rs:109]
- `codex-rs/exec-server/src/server/processor.rs`: 建立 connection-local handler/outbound pump，并以顺序 inbound loop 保持 initialize/initialized ordering；具体 message dispatch 已委托给 `RequestDispatcher`。[E: codex-rs/exec-server/src/server/processor.rs:78][E: codex-rs/exec-server/src/server/processor.rs:95][E: codex-rs/exec-server/src/server/processor.rs:120][E: codex-rs/exec-server/src/server/processor.rs:131][E: codex-rs/exec-server/src/server/processor.rs:141]
- `codex-rs/exec-server/src/server/request_dispatcher.rs`: 处理 malformed message、notification、reverse response/error 与 request route/telemetry；unknown notification 或 unexpected response id 会关闭 connection。[E: codex-rs/exec-server/src/server/request_dispatcher.rs:24][E: codex-rs/exec-server/src/server/request_dispatcher.rs:52][E: codex-rs/exec-server/src/server/request_dispatcher.rs:69][E: codex-rs/exec-server/src/server/request_dispatcher.rs:92][E: codex-rs/exec-server/src/server/request_dispatcher.rs:110][E: codex-rs/exec-server/src/server/request_dispatcher.rs:125]
- `codex-rs/exec-server/src/server/handler.rs`: `ExecServerHandler` 持有 session registry、notification sender、current session、active body stream ids、background-task shutdown/tracker、filesystem handler、runtime paths、initialize requested flag 和 initialized flag，提供 exec/fs/http request methods plus orderly shutdown.[E: codex-rs/exec-server/src/server/handler.rs:69][E: codex-rs/exec-server/src/server/handler.rs:70][E: codex-rs/exec-server/src/server/handler.rs:71][E: codex-rs/exec-server/src/server/handler.rs:71][E: codex-rs/exec-server/src/server/handler.rs:73][E: codex-rs/exec-server/src/server/handler.rs:74][E: codex-rs/exec-server/src/server/handler.rs:75][E: codex-rs/exec-server/src/server/handler.rs:76][E: codex-rs/exec-server/src/server/handler.rs:75][E: codex-rs/exec-server/src/server/handler.rs:79][E: codex-rs/exec-server/src/server/handler.rs:80]
- `codex-rs/exec-server/src/server/session_registry.rs`: session attach/resume/detach、detached TTL expiration 和 process shutdown。[E: codex-rs/exec-server/src/server/session_registry.rs:18][E: codex-rs/exec-server/src/server/session_registry.rs:20][E: codex-rs/exec-server/src/server/session_registry.rs:63][E: codex-rs/exec-server/src/server/session_registry.rs:85][E: codex-rs/exec-server/src/server/session_registry.rs:95][E: codex-rs/exec-server/src/server/session_registry.rs:132][E: codex-rs/exec-server/src/server/session_registry.rs:147][E: codex-rs/exec-server/src/server/session_registry.rs:258]
- `codex-rs/exec-server/src/local_process.rs`: process map、stream chunks、output retention、idempotent stdin write, terminate, exit watch, telemetry metrics, sandbox-denied detection.[E: codex-rs/exec-server/src/local_process.rs:91][E: codex-rs/exec-server/src/local_process.rs:94][E: codex-rs/exec-server/src/local_process.rs:150][E: codex-rs/exec-server/src/local_process.rs:262][E: codex-rs/exec-server/src/local_process.rs:525][E: codex-rs/exec-server/src/local_process.rs:611][E: codex-rs/exec-server/src/local_process.rs:831][E: codex-rs/exec-server/src/local_process.rs:891][E: codex-rs/exec-server/src/local_process.rs:949]
- `codex-rs/exec-server/src/client.rs` / `remote_process.rs`: controller-side remote session、process events 与 optional network-policy controller；remote backend 将 authoritative decider 传入 client start。[E: codex-rs/exec-server/src/client.rs:878][E: codex-rs/exec-server/src/client.rs:887][E: codex-rs/exec-server/src/remote_process.rs:36][E: codex-rs/exec-server/src/remote_process.rs:59]
- `codex-rs/exec-server/src/remote_file_system.rs` / `capability_discovery.rs`: 保留 `PathUri` 与 sandbox context 的 remote filesystem backend，以及 bounded plugin/skill root discovery。[E: codex-rs/exec-server/src/remote_file_system.rs:45][E: codex-rs/exec-server/src/remote_file_system.rs:155][E: codex-rs/exec-server/src/capability_discovery.rs:50][E: codex-rs/exec-server/src/capability_discovery.rs:63]
- `codex-rs/utils/pty/src`: portable PTY and pipe process drivers exported to exec-server。[E: codex-rs/utils/pty/src/lib.rs:15][E: codex-rs/utils/pty/src/lib.rs:17][E: codex-rs/utils/pty/src/lib.rs:25][E: codex-rs/utils/pty/src/lib.rs:31][E: codex-rs/utils/pty/src/lib.rs:39]

## 数据模型

- `ExecServerHandler`: connection-local handler state contains `session_registry`, `notifications`, `session`, active body stream ids, background-task shutdown/tracker, `file_system`, `runtime_paths`, `initialize_requested`, and `initialized`.[E: codex-rs/exec-server/src/server/handler.rs:69][E: codex-rs/exec-server/src/server/handler.rs:70][E: codex-rs/exec-server/src/server/handler.rs:71][E: codex-rs/exec-server/src/server/handler.rs:71][E: codex-rs/exec-server/src/server/handler.rs:73][E: codex-rs/exec-server/src/server/handler.rs:74][E: codex-rs/exec-server/src/server/handler.rs:75][E: codex-rs/exec-server/src/server/handler.rs:76][E: codex-rs/exec-server/src/server/handler.rs:75][E: codex-rs/exec-server/src/server/handler.rs:79][E: codex-rs/exec-server/src/server/handler.rs:80]
- `SessionRegistry`: 用 `sessions: HashMap<String, SessionEntry>` 存储可 resume 的 detached sessions，`SessionEntry` 保存 `session_id`、process backend 和 `AttachmentState`。[E: codex-rs/exec-server/src/server/session_registry.rs:22][E: codex-rs/exec-server/src/server/session_registry.rs:23][E: codex-rs/exec-server/src/server/session_registry.rs:27][E: codex-rs/exec-server/src/server/session_registry.rs:28][E: codex-rs/exec-server/src/server/session_registry.rs:29][E: codex-rs/exec-server/src/server/session_registry.rs:30]
- `AttachmentState` 保存 current connection id、detached connection id 和 detached expiration instant。[E: codex-rs/exec-server/src/server/session_registry.rs:33][E: codex-rs/exec-server/src/server/session_registry.rs:34][E: codex-rs/exec-server/src/server/session_registry.rs:35][E: codex-rs/exec-server/src/server/session_registry.rs:36]
- `LocalProcess`: `inner.processes` 是 process id 到 `ProcessEntry` 的 map；`ProcessEntry` 可处于 `Starting` 或 `Running(Box<RunningProcess>)`。[E: codex-rs/exec-server/src/local_process.rs:145][E: codex-rs/exec-server/src/local_process.rs:145][E: codex-rs/exec-server/src/local_process.rs:145][E: codex-rs/exec-server/src/local_process.rs:150][E: codex-rs/exec-server/src/local_process.rs:154][E: codex-rs/exec-server/src/local_process.rs:159]
- `RunningProcess` 保存 process session、tty/pipe-stdin flags、accepted stdin write ids、retained output/bytes、sequence/exit/wake/event/open-stream state、metrics、sandbox-denied state，以及与该 process 同生命周期的 optional `NetworkProxyHandle`。[E: codex-rs/exec-server/src/local_process.rs:91][E: codex-rs/exec-server/src/local_process.rs:94][E: codex-rs/exec-server/src/local_process.rs:98][E: codex-rs/exec-server/src/local_process.rs:99][E: codex-rs/exec-server/src/local_process.rs:100][E: codex-rs/exec-server/src/local_process.rs:101][E: codex-rs/exec-server/src/local_process.rs:103][E: codex-rs/exec-server/src/local_process.rs:105][E: codex-rs/exec-server/src/local_process.rs:107][E: codex-rs/exec-server/src/local_process.rs:108][E: codex-rs/exec-server/src/local_process.rs:109]

## 控制流

1. `run_transport` 解析 listen URL，`ws://` path 启动 WebSocket listener，`stdio` path wraps stdin/stdout into a JSON-RPC connection and runs the same processor with telemetry.[E: codex-rs/exec-server/src/server/transport.rs:80][E: codex-rs/exec-server/src/server/transport.rs:89][E: codex-rs/exec-server/src/server/transport.rs:89][E: codex-rs/exec-server/src/server/transport.rs:91][E: codex-rs/exec-server/src/server/transport.rs:109][E: codex-rs/exec-server/src/server/transport.rs:128][E: codex-rs/exec-server/src/server/transport.rs:132]
2. `ConnectionProcessor::run_connection` builds router/handler/outbound pump and creates `RequestDispatcher` with telemetry plus reverse-request state。[E: codex-rs/exec-server/src/server/processor.rs:78][E: codex-rs/exec-server/src/server/processor.rs:87][E: codex-rs/exec-server/src/server/processor.rs:95][E: codex-rs/exec-server/src/server/processor.rs:99][E: codex-rs/exec-server/src/server/processor.rs:106][E: codex-rs/exec-server/src/server/processor.rs:120]
3. inbound loop 仍逐个 await event；malformed/request/notification/response/error 的具体行为由 dispatcher 执行，connection teardown 后 handler shutdown、detach session 并等待 background tasks。[E: codex-rs/exec-server/src/server/processor.rs:131][E: codex-rs/exec-server/src/server/processor.rs:136][E: codex-rs/exec-server/src/server/processor.rs:141][E: codex-rs/exec-server/src/server/processor.rs:154][E: codex-rs/exec-server/src/server/request_dispatcher.rs:52][E: codex-rs/exec-server/src/server/request_dispatcher.rs:69][E: codex-rs/exec-server/src/server/request_dispatcher.rs:92][E: codex-rs/exec-server/src/server/request_dispatcher.rs:125]
4. handler 的 `initialize` 只能执行一次；它调用 `SessionRegistry::attach` attach 或 resume session，存储 `SessionHandle`，并返回 `InitializeResponse { session_id }`。客户端随后发送 `initialized` notification 时，`initialized()` 才把 initialized flag 置为 true。[E: codex-rs/exec-server/src/server/handler.rs:120][E: codex-rs/exec-server/src/server/handler.rs:124][E: codex-rs/exec-server/src/server/handler.rs:130][E: codex-rs/exec-server/src/server/handler.rs:153][E: codex-rs/exec-server/src/server/handler.rs:156][E: codex-rs/exec-server/src/server/handler.rs:158][E: codex-rs/exec-server/src/server/handler.rs:164]
5. `SessionRegistry::attach` 对 unknown session id 返回 invalid request，对仍有 active connection 的 session 拒绝 attach，对 detached session 更新 notification sender 并 resume；没有 session id 时创建 UUID session。[E: codex-rs/exec-server/src/server/session_registry.rs:80][E: codex-rs/exec-server/src/server/session_registry.rs:84][E: codex-rs/exec-server/src/server/session_registry.rs:90][E: codex-rs/exec-server/src/server/session_registry.rs:95][E: codex-rs/exec-server/src/server/session_registry.rs:100][E: codex-rs/exec-server/src/server/session_registry.rs:106]
6. detach 时 `SessionHandle::detach` 清空 notification sender，并 spawn expiration task；expiration 到期后 registry remove session 并 shutdown process backend.[E: codex-rs/exec-server/src/server/session_registry.rs:184][E: codex-rs/exec-server/src/server/session_registry.rs:193][E: codex-rs/exec-server/src/server/session_registry.rs:196][E: codex-rs/exec-server/src/server/session_registry.rs:258][E: codex-rs/exec-server/src/server/session_registry.rs:263][E: codex-rs/exec-server/src/server/session_registry.rs:266][E: codex-rs/exec-server/src/server/session_registry.rs:132][E: codex-rs/exec-server/src/server/session_registry.rs:143][E: codex-rs/exec-server/src/server/session_registry.rs:147]
7. `LocalProcess::start_process` prepares sandboxed exec request, rejects empty argv and duplicate process id, chooses PTY/pipe/no-stdin backend from `tty` and `pipe_stdin`, records `RunningProcess`, and starts stdout/stderr/exit watcher tasks.[E: codex-rs/exec-server/src/local_process.rs:242][E: codex-rs/exec-server/src/local_process.rs:250][E: codex-rs/exec-server/src/local_process.rs:317][E: codex-rs/exec-server/src/local_process.rs:265][E: codex-rs/exec-server/src/local_process.rs:274][E: codex-rs/exec-server/src/local_process.rs:285][E: codex-rs/exec-server/src/local_process.rs:372][E: codex-rs/exec-server/src/local_process.rs:399][E: codex-rs/exec-server/src/local_process.rs:408][E: codex-rs/exec-server/src/local_process.rs:421]
8. `exec_read` filters retained output chunks by `after_seq`, obeys `max_bytes`, optionally waits on `output_notify`, and returns `next_seq` plus exit/closed/sandbox status.[E: codex-rs/exec-server/src/local_process.rs:447][E: codex-rs/exec-server/src/local_process.rs:449][E: codex-rs/exec-server/src/local_process.rs:469][E: codex-rs/exec-server/src/local_process.rs:480][E: codex-rs/exec-server/src/local_process.rs:489][E: codex-rs/exec-server/src/local_process.rs:492][E: codex-rs/exec-server/src/local_process.rs:494][E: codex-rs/exec-server/src/local_process.rs:496][E: codex-rs/exec-server/src/local_process.rs:521]
9. `exec_write` validates `write_id`, distinguishes unknown process, starting process, closed stdin, and accepted writes, and remembers accepted write ids so retries do not duplicate stdin bytes.[E: codex-rs/exec-server/src/local_process.rs:530][E: codex-rs/exec-server/src/local_process.rs:535][E: codex-rs/exec-server/src/local_process.rs:541][E: codex-rs/exec-server/src/local_process.rs:546][E: codex-rs/exec-server/src/local_process.rs:557][E: codex-rs/exec-server/src/local_process.rs:580][E: codex-rs/exec-server/src/local_process.rs:581][E: codex-rs/exec-server/src/local_process.rs:582]
10. stream watcher appends retained chunks, evicts when either 1 MiB bytes or 50,000 chunks is exceeded, then publishes output events/notifications；exit watcher records exit/sandbox-denied state，`maybe_emit_closed` waits for both process exit and all streams before publishing closed and shutting down the process-owned network proxy。[E: codex-rs/exec-server/src/local_process.rs:71][E: codex-rs/exec-server/src/local_process.rs:74][E: codex-rs/exec-server/src/local_process.rs:831][E: codex-rs/exec-server/src/local_process.rs:848][E: codex-rs/exec-server/src/local_process.rs:850][E: codex-rs/exec-server/src/local_process.rs:854][E: codex-rs/exec-server/src/local_process.rs:873][E: codex-rs/exec-server/src/local_process.rs:891][E: codex-rs/exec-server/src/local_process.rs:924][E: codex-rs/exec-server/src/local_process.rs:949][E: codex-rs/exec-server/src/local_process.rs:995][E: codex-rs/exec-server/src/local_process.rs:1002][E: codex-rs/exec-server/src/local_process.rs:1013][E: codex-rs/exec-server/src/local_process.rs:1024]

## Network policy callback

反向 server request `network/policyRequest` 的 params 包含 process id 与 `{protocol, host, port}`；protocol 可为 HTTP、HTTPS CONNECT、SOCKS5 TCP/UDP，response decision 是 `allow`、`deny {reason}` 或 `ask {reason}`。[E: codex-rs/exec-server-protocol/src/network_policy.rs:6][E: codex-rs/exec-server-protocol/src/network_policy.rs:23][E: codex-rs/exec-server-protocol/src/network_policy.rs:28][E: codex-rs/exec-server-protocol/src/network_policy.rs:45]

executor-local `LocalProcess` 只有在 launch config 提供非零 `policy_decision_timeout_ms` 时才安装反向 decider；此时 process id 必须非空且不超过协议上限，decider cancellation 与 process shutdown 绑定。[E: codex-rs/exec-server/src/local_process.rs:262][E: codex-rs/exec-server/src/local_process.rs:303]

remote controller path 只在 approval 路由到 Guardian 且 execution-scoped proxy 能提供 decider 时附 decision timeout；timeout 是 permission hook 最大等待、Guardian review 和额外 margin 之和。Process manager 仅在 timeout 存在时提取 decider，并调用 `start_with_network_policy_decider`。[E: codex-rs/core/src/tools/runtimes/unified_exec.rs:344][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:347][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:351][E: codex-rs/core/src/tools/runtimes/unified_exec.rs:353][E: codex-rs/core/src/unified_exec/process_manager.rs:1023][E: codex-rs/core/src/unified_exec/process_manager.rs:1077][E: codex-rs/core/src/unified_exec/process_manager.rs:1080]

Client 要求 controller decider 与非零 timeout 成对，否则 process start 直接报 protocol error；不支持 remote callback 的 backend 默认也返回 protocol error。[E: codex-rs/exec-server/src/client.rs:878][E: codex-rs/exec-server/src/client.rs:887][E: codex-rs/exec-server/src/client.rs:892][E: codex-rs/exec-server/src/client.rs:896][E: codex-rs/exec-server/src/process.rs:226][E: codex-rs/exec-server/src/process.rs:232]

server-side decider 校验 host，向当前 controller sender 发反向 request，并把 wire decision 转回 network proxy decision。缺少 sender、无效 host、shutdown、timeout、RPC/反序列化错误都 fail closed 为 deny；reason 超长或含 control character 同样 deny。[E: codex-rs/exec-server/src/network_policy_decisions.rs:24][E: codex-rs/exec-server/src/network_policy_decisions.rs:50][E: codex-rs/exec-server/src/network_policy_decisions.rs:65][E: codex-rs/exec-server/src/network_policy_decisions.rs:89]

client recovery loop 负责接收/校验反向 request，并在 admission limit 内调用 controller 的 `NetworkPolicyDecider`。AtCapacity、process cancellation、controller timeout/缺失时能回复 `Deny`，invalid params 能回复 JSON-RPC error；connection cancellation、session 消失/替换或 RPC client drop 时会直接停止而不回复，最终由 server 端 transport timeout/RPC error fail closed。[E: codex-rs/exec-server/src/client_recovery.rs:602][E: codex-rs/exec-server/src/client_recovery.rs:619][E: codex-rs/exec-server/src/client_recovery.rs:633][E: codex-rs/exec-server/src/client_recovery.rs:682][E: codex-rs/exec-server/src/client_recovery.rs:704][E: codex-rs/exec-server/src/client_recovery.rs:718][E: codex-rs/exec-server/src/network_policy_decisions.rs:65][E: codex-rs/exec-server/src/network_policy_decisions.rs:89]

`Ask` 是协议与 policy engine 的第三种决定，但仅凭 exec-server 层不能断言一定弹出 UI；是否提示、自动批准或拒绝由上层 controller 的 decider 决定。[U]

controller 侧 `network_policy.audit` 存在时，client 会把 executor 发回的 network policy decision notification 交给 `network_policy_audit::emit_network_policy_decision`；缺少 session/audit context 或 invalid payload 则忽略。[E: codex-rs/exec-server/src/client.rs:1657][E: codex-rs/exec-server/src/client.rs:1660][E: codex-rs/exec-server/src/client.rs:1661]

`read_environment_config` 在 executor 本地加载 cwd/codex_home 的 config layers，供 remote controller 读取 environment 侧配置快照。[E: codex-rs/exec-server/src/environment_config.rs:22][E: codex-rs/exec-server/src/environment_config.rs:27][E: codex-rs/exec-server/src/environment_config.rs:34][E: codex-rs/exec-server/src/client.rs:764] 沙箱文件打开走 `sandboxed_file_open::open`，通过 fs helper `Open` RPC 返回 platform-sandboxed file handle。[E: codex-rs/exec-server/src/sandboxed_file_open.rs:17][E: codex-rs/exec-server/src/sandboxed_file_open.rs:21][E: codex-rs/exec-server/src/sandboxed_file_system.rs:52]

远程 exec-server 注册要求 ChatGPT 或 API key auth；workload identity 选中时用 `auth_provider_from_auth_manager`，否则用静态 `auth_provider_from_auth`。[E: codex-rs/cli/src/main.rs:1857][E: codex-rs/cli/src/main.rs:1867][E: codex-rs/cli/src/main.rs:1868][E: codex-rs/cli/src/main.rs:1873] Windows 上 `Feature::UnifiedExec` 现在默认 `true`，因此 Windows executor 默认也走 unified exec 路径。[E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:841]

## Remote ownership、compatibility 与 filesystem

remote exec-server 可由 `--exit-on-stdin-close` / `CODEX_EXEC_SERVER_EXIT_ON_STDIN_CLOSE` 绑定父 stdin。EOF 会触发 graceful shutdown sender；shutdown 分支结束/取消 connection `run` future 后，代码仍显式调用 `ConnectionProcessor::shutdown` drain sessions 与 running processes。[E: codex-rs/cli/src/main.rs:595][E: codex-rs/cli/src/main.rs:599][E: codex-rs/cli/src/main.rs:1739][E: codex-rs/cli/src/main.rs:1745][E: codex-rs/exec-server/src/remote.rs:523][E: codex-rs/exec-server/src/remote.rs:544][E: codex-rs/exec-server/src/remote.rs:549][E: codex-rs/exec-server/src/remote.rs:552]

该 owner-lifetime env var 会从 executor child env 删除，避免把 exec-server 自己的父子契约递归传给用户命令。[E: codex-rs/exec-server/src/local_process.rs:641][E: codex-rs/exec-server/src/local_process.rs:651]

`ExecResponse.sandbox_type` 是 optional compatibility field：新 peer 显式报告 none/Seatbelt/Linux/Windows backend，旧 peer 缺字段时 controller 不猜 backend，也就跳过本地 normalized violation attribution。[E: codex-rs/exec-server-protocol/src/protocol.rs:216][E: codex-rs/exec-server-protocol/src/protocol.rs:221][E: codex-rs/exec-server-protocol/src/protocol.rs:225][E: codex-rs/core/src/unified_exec/process.rs:398][E: codex-rs/core/src/unified_exec/process.rs:404]

remote filesystem 只合并同一 `PathUri`、sandbox context 缺省且仍在 flight 的 metadata RPC；完成立即移除，只要 context 存在 request 就永远 fresh。Streaming read 则只在 context 真正需要 platform sandbox 时显式拒绝，因为 stream path 不支持 platform sandbox。[E: codex-rs/exec-server/src/remote_file_system.rs:98][E: codex-rs/exec-server/src/remote_file_system.rs:103][E: codex-rs/exec-server/src/remote_file_system.rs:155][E: codex-rs/exec-server/src/remote_file_system.rs:160][E: codex-rs/exec-server/src/remote_file_system.rs:164][E: codex-rs/exec-server/src/remote_file_system.rs:181]

capability root request 逐 root 携带 optional filesystem sandbox，metadata、walk 与 manifest read 复用同一 context；Windows 需要 sandbox 但 backend disabled 时返回 unavailable。Deferred environment readiness 则可原地发布 validated roots，不替换已有 `Environment`。[E: codex-rs/exec-server-protocol/src/protocol.rs:491][E: codex-rs/exec-server-protocol/src/protocol.rs:496][E: codex-rs/exec-server/src/capability_discovery.rs:63][E: codex-rs/exec-server/src/capability_discovery.rs:79][E: codex-rs/exec-server/src/capability_discovery.rs:89][E: codex-rs/exec-server/src/capability_discovery.rs:101][E: codex-rs/exec-server/src/environment.rs:386][E: codex-rs/exec-server/src/environment.rs:400][E: codex-rs/exec-server/src/environment.rs:420]

protocol 声明最低兼容 Codex `0.145.0`，新增 harness 双向验证 current/released app-server 与 executor over authenticated Noise；该常量由测试脚本读取，不是 runtime handshake gate。[E: codex-rs/exec-server-protocol/src/lib.rs:11][E: codex-rs/exec-server/testing/run_version_skew.sh:6][E: codex-rs/exec-server/testing/run_version_skew.sh:14][E: codex-rs/exec-server/tests/relay/version_skew.rs:49][E: codex-rs/exec-server/tests/relay/version_skew.rs:57]

## PTY 与 pipe backend

- `spawn_pty_process` 最终走 `pty.rs::spawn_process`；portable PTY path 用 `CommandBuilder` 设置 arg0/cwd/env，使用 `pair.slave.spawn_command` 启动 child，读取 master clone 输出，并把 writer channel 收到的 bytes 写入 master writer。[E: codex-rs/utils/pty/src/lib.rs:39][E: codex-rs/utils/pty/src/pty.rs:135][E: codex-rs/utils/pty/src/pty.rs:163][E: codex-rs/utils/pty/src/pty.rs:164][E: codex-rs/utils/pty/src/pty.rs:165][E: codex-rs/utils/pty/src/pty.rs:173][E: codex-rs/utils/pty/src/pty.rs:184][E: codex-rs/utils/pty/src/pty.rs:187]
- Unix PTY preserving-fds path 使用 `spawn_process_preserving_fds` when inherited fds are present; pipe backend checks program non-empty, sets optional Unix arg0/current_dir/env/stdin, installs parent death signal on Linux, and spawns a child.[E: codex-rs/utils/pty/src/pty.rs:144][E: codex-rs/utils/pty/src/pty.rs:145][E: codex-rs/utils/pty/src/pipe.rs:137][E: codex-rs/utils/pty/src/pipe.rs:143][E: codex-rs/utils/pty/src/pipe.rs:146][E: codex-rs/utils/pty/src/pipe.rs:158][E: codex-rs/utils/pty/src/pipe.rs:165][E: codex-rs/utils/pty/src/pipe.rs:173]
- `ProcessHandle`/`SpawnedProcess`/`spawn_from_driver` are exported from `codex_utils_pty`; PTY handles include resizable and Unix opaque master variants.[E: codex-rs/utils/pty/src/lib.rs:21][E: codex-rs/utils/pty/src/lib.rs:25][E: codex-rs/utils/pty/src/lib.rs:31][E: codex-rs/utils/pty/src/process.rs:86][E: codex-rs/utils/pty/src/process.rs:87][E: codex-rs/utils/pty/src/process.rs:89]
- Windows pipe `Interrupt` terminates its JobObject or process；driver-backed processes 仅在 non-TTY 且有 terminator 时把 interrupt 映射为 termination，成功后移除 killer，ConPTY 保持交互式语义。[E: codex-rs/utils/pty/src/pipe.rs:42][E: codex-rs/utils/pty/src/pipe.rs:51][E: codex-rs/utils/pty/src/pipe.rs:70][E: codex-rs/utils/pty/src/process.rs:229][E: codex-rs/utils/pty/src/process.rs:237][E: codex-rs/utils/pty/src/process.rs:364][E: codex-rs/utils/pty/src/process.rs:389]

## 设计动机与权衡

- session registry allows a WebSocket or stdio JSON-RPC connection to detach and resume briefly, avoiding immediate loss of a running process on transport churn; TTL expiry still shuts down the process backend so detached sessions do not live forever.[I]
- output retention 使用 sequence numbers、1 MiB byte cap 和 50,000 chunk cap，让 `exec/read` 可以补读历史输出，同时避免大量微小 chunks 超过共享 JSON value budget。[E: codex-rs/exec-server/src/local_process.rs:71][E: codex-rs/exec-server/src/local_process.rs:74][E: codex-rs/exec-server/src/local_process.rs:94][E: codex-rs/exec-server/src/local_process.rs:98][E: codex-rs/exec-server/src/local_process.rs:469][E: codex-rs/exec-server/src/local_process.rs:854]
- PTY 与 pipe backend 共享 `ProcessDriver`/`ProcessHandle` abstraction，exec-server 不需要知道底层是 ConPTY、portable PTY 还是 pipe process。[E: codex-rs/utils/pty/src/lib.rs:19][E: codex-rs/utils/pty/src/lib.rs:21][E: codex-rs/utils/pty/src/lib.rs:39]

## gotcha

- `DETACHED_SESSION_TTL` 在 test cfg 下是 200 ms，在非 test cfg 下是 30 seconds。[E: codex-rs/exec-server/src/server/session_registry.rs:17][E: codex-rs/exec-server/src/server/session_registry.rs:18][E: codex-rs/exec-server/src/server/session_registry.rs:19][E: codex-rs/exec-server/src/server/session_registry.rs:20]
- `FileSystemHandler::read_file` 返回 base64 编码 bytes；`write_file` 接收 base64 并 decode，decode 失败映射 invalid request。[E: codex-rs/exec-server/src/server/file_system_handler.rs:122][E: codex-rs/exec-server/src/server/file_system_handler.rs:132][E: codex-rs/exec-server/src/server/file_system_handler.rs:136][E: codex-rs/exec-server/src/server/file_system_handler.rs:140][E: codex-rs/exec-server/src/server/file_system_handler.rs:145]
- `FileSystemHandler` now also exposes `walk`, forwarding `FsWalkParams` to the local filesystem implementation.[E: codex-rs/exec-server/src/server/file_system_handler.rs:39][E: codex-rs/exec-server/src/server/file_system_handler.rs:225][E: codex-rs/exec-server/src/server/file_system_handler.rs:229]
- `exec/write` acceptance is idempotent by `write_id`; accepted retry responses are acknowledgements, not proof that the child consumed the bytes synchronously.[E: codex-rs/exec-server/src/local_process.rs:124][E: codex-rs/exec-server/src/local_process.rs:557][E: codex-rs/exec-server/src/local_process.rs:560][E: codex-rs/exec-server/src/local_process.rs:580][E: codex-rs/exec-server/src/local_process.rs:581]

## Sources

- `codex-rs/exec-server/src/server`
- `codex-rs/exec-server/src/server/request_dispatcher.rs`
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
- `codex-rs/exec-server/testing/run_version_skew.sh`
- `codex-rs/exec-server/tests/relay/version_skew.rs`
- `codex-rs/cli/src/main.rs`
- `codex-rs/utils/pty/src`
- `codex-rs/core/src/tools/runtimes/unified_exec.rs`
- `codex-rs/core/src/unified_exec/process_manager.rs`
- `codex-rs/core/src/unified_exec/process.rs`

## 相关

- `tool.exec-command`
- `tool.write-stdin`
- `subsys.exec-sandbox.overview`
- `spine.shell-exec-flow`
