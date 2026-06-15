---
id: subsys.exec-sandbox.exec-server
title: exec-server 与 PTY runtime
kind: subsystem
tier: T2
source: [codex-rs/exec-server/src/server, codex-rs/exec-server/src/local_process.rs, codex-rs/utils/pty/src]
symbols: [ExecServerHandler, ConnectionProcessor, SessionRegistry, LocalProcess, RunningProcess, spawn_pty_process, spawn_pipe_process, ProcessHandle]
related: [tool.exec-command, tool.write-stdin, subsys.exec-sandbox.overview, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> exec-server 是 Codex 的 JSON-RPC/WebSocket process server:它按 session attach/resume 管理 `LocalProcess`，并通过 `codex_utils_pty` 提供 PTY、pipe stdin、no-stdin 三种 spawn backend。[E: codex-rs/exec-server/src/server/transport.rs:50][E: codex-rs/exec-server/src/server/handler.rs:48][E: codex-rs/exec-server/src/local_process.rs:165]

## 能回答的问题

- exec-server connection 如何路由 JSON-RPC requests 与 notifications？
- session attach/resume/detach 的 TTL 语义是什么？
- `exec`、`exec/read`、`exec/write`、`exec/terminate` 在 handler 中怎样进入 process layer？
- `LocalProcess` 怎样保留输出 chunks、发送 notifications、处理 stdin 和 terminate？
- PTY 与 pipe spawn backend 的差异在哪里？

## 职责边界

exec-server 节点覆盖 `codex-rs/exec-server/src/server` 的 JSON-RPC server/session lifecycle、`codex-rs/exec-server/src/local_process.rs` 的 process state machine、以及 `codex-rs/utils/pty/src` 的 PTY/pipe adapter。它不覆盖 shell tool approval，也不覆盖 OS sandbox policy generation；exec-server 接收的 process policy 是调用者已经构造好的执行请求。[I]

## 关键 crate/文件

- `codex-rs/exec-server/src/server/transport.rs`: 解析 `ws://IP:PORT` listen URL，bind WebSocket listener，accept 后为每个 connection spawn processor。[E: codex-rs/exec-server/src/server/transport.rs:36][E: codex-rs/exec-server/src/server/transport.rs:58][E: codex-rs/exec-server/src/server/transport.rs:86]
- `codex-rs/exec-server/src/server/processor.rs`: 读写 JSON-RPC messages、路由 requests/notifications、处理 disconnect 和 shutdown。[E: codex-rs/exec-server/src/server/processor.rs:44][E: codex-rs/exec-server/src/server/processor.rs:76][E: codex-rs/exec-server/src/server/processor.rs:97][E: codex-rs/exec-server/src/server/processor.rs:170]
- `codex-rs/exec-server/src/server/handler.rs`: `ExecServerHandler` 持有 session registry、notification sender、current session、filesystem handler、initialize requested flag 和 initialized flag，提供 exec 与 fs request methods。[E: codex-rs/exec-server/src/server/handler.rs:39][E: codex-rs/exec-server/src/server/handler.rs:40][E: codex-rs/exec-server/src/server/handler.rs:41][E: codex-rs/exec-server/src/server/handler.rs:42][E: codex-rs/exec-server/src/server/handler.rs:43][E: codex-rs/exec-server/src/server/handler.rs:44][E: codex-rs/exec-server/src/server/handler.rs:45]
- `codex-rs/exec-server/src/server/session_registry.rs`: session attach/resume/detach、detached TTL expiration 和 process shutdown。[E: codex-rs/exec-server/src/server/session_registry.rs:14][E: codex-rs/exec-server/src/server/session_registry.rs:74][E: codex-rs/exec-server/src/server/session_registry.rs:119]
- `codex-rs/exec-server/src/local_process.rs`: process map、stream chunks、output retention、stdin write、terminate、exit watch。[E: codex-rs/exec-server/src/local_process.rs:83][E: codex-rs/exec-server/src/local_process.rs:148][E: codex-rs/exec-server/src/local_process.rs:535][E: codex-rs/exec-server/src/local_process.rs:593]
- `codex-rs/utils/pty/src`: portable PTY and pipe process drivers exported to exec-server。[E: codex-rs/utils/pty/src/lib.rs:10][E: codex-rs/utils/pty/src/lib.rs:23][E: codex-rs/utils/pty/src/lib.rs:29]

## 数据模型

- `ExecServerHandler`: connection-local handler state 包含 `session_registry`、`notifications`、`session`、`file_system`、`initialize_requested`、`initialized` 六个 fields。[E: codex-rs/exec-server/src/server/handler.rs:39][E: codex-rs/exec-server/src/server/handler.rs:40][E: codex-rs/exec-server/src/server/handler.rs:41][E: codex-rs/exec-server/src/server/handler.rs:42][E: codex-rs/exec-server/src/server/handler.rs:43][E: codex-rs/exec-server/src/server/handler.rs:44][E: codex-rs/exec-server/src/server/handler.rs:45]
- `SessionRegistry`: 用 `sessions: HashMap<String, SessionEntry>` 存储可 resume 的 detached sessions。[E: codex-rs/exec-server/src/server/session_registry.rs:19][E: codex-rs/exec-server/src/server/session_registry.rs:20]
- `SessionEntry`: 保存 `session_id`、process backend 和 `AttachmentState`；`AttachmentState` 保存 current connection id、detached connection id 和 detached expiration instant。[E: codex-rs/exec-server/src/server/session_registry.rs:23][E: codex-rs/exec-server/src/server/session_registry.rs:24][E: codex-rs/exec-server/src/server/session_registry.rs:25][E: codex-rs/exec-server/src/server/session_registry.rs:26][E: codex-rs/exec-server/src/server/session_registry.rs:29][E: codex-rs/exec-server/src/server/session_registry.rs:30][E: codex-rs/exec-server/src/server/session_registry.rs:31][E: codex-rs/exec-server/src/server/session_registry.rs:32]
- `LocalProcess`: `inner.processes` 是 process id 到 `RunningProcess` 的 map。[E: codex-rs/exec-server/src/local_process.rs:83][E: codex-rs/exec-server/src/local_process.rs:88]
- `RunningProcess`: 保存 process session、tty/pipe-stdin flags、retained output chunks、retained byte count、next sequence、exit_code、wake channel、event log、output notify、open stream count 和 closed flag。[E: codex-rs/exec-server/src/local_process.rs:63][E: codex-rs/exec-server/src/local_process.rs:64][E: codex-rs/exec-server/src/local_process.rs:65][E: codex-rs/exec-server/src/local_process.rs:66][E: codex-rs/exec-server/src/local_process.rs:67][E: codex-rs/exec-server/src/local_process.rs:68][E: codex-rs/exec-server/src/local_process.rs:69][E: codex-rs/exec-server/src/local_process.rs:70][E: codex-rs/exec-server/src/local_process.rs:71][E: codex-rs/exec-server/src/local_process.rs:72][E: codex-rs/exec-server/src/local_process.rs:73][E: codex-rs/exec-server/src/local_process.rs:74][E: codex-rs/exec-server/src/local_process.rs:75]

## 控制流

1. `run_transport` 解析 listen URL，启动 WebSocket listener，accept loop 为每个 connection 创建 `ConnectionProcessor::run_connection` task。[E: codex-rs/exec-server/src/server/transport.rs:50][E: codex-rs/exec-server/src/server/transport.rs:58][E: codex-rs/exec-server/src/server/transport.rs:86]
2. `ConnectionProcessor::run_connection` build router，split connection，创建 notification sender 和 `ExecServerHandler`。[E: codex-rs/exec-server/src/server/processor.rs:44][E: codex-rs/exec-server/src/server/processor.rs:48][E: codex-rs/exec-server/src/server/processor.rs:55]
3. outbound task 把 handler notifications serialize 后写入 connection；inbound loop 逐条处理 message，malformed JSON-RPC 返回 invalid request error。[E: codex-rs/exec-server/src/server/processor.rs:61][E: codex-rs/exec-server/src/server/processor.rs:76][E: codex-rs/exec-server/src/server/processor.rs:83]
4. processor 对 request 调用 router route；未知 method 返回 `method_not_found`，client responses/errors 会触发 connection close。[E: codex-rs/exec-server/src/server/processor.rs:97][E: codex-rs/exec-server/src/server/processor.rs:109][E: codex-rs/exec-server/src/server/processor.rs:146]
5. handler 的 `initialize` 只能执行一次；它调用 `SessionRegistry::attach` attach 或 resume session，存储 `SessionHandle`，并返回 `InitializeResponse { session_id }`。客户端随后发送 `initialized` notification 时，`initialized()` 才把 initialized flag 置为 true。[E: codex-rs/exec-server/src/server/handler.rs:75][E: codex-rs/exec-server/src/server/handler.rs:85][E: codex-rs/exec-server/src/server/handler.rs:102][E: codex-rs/exec-server/src/server/handler.rs:106][E: codex-rs/exec-server/src/server/handler.rs:109][E: codex-rs/exec-server/src/server/handler.rs:115]
6. `SessionRegistry::attach` 对 unknown session id 返回 invalid params，对仍有 active connection 的 session 拒绝 attach，对 detached session 更新 notification sender 并 resume；没有 session id 时创建 UUID session。[E: codex-rs/exec-server/src/server/session_registry.rs:74][E: codex-rs/exec-server/src/server/session_registry.rs:84][E: codex-rs/exec-server/src/server/session_registry.rs:89][E: codex-rs/exec-server/src/server/session_registry.rs:93]
7. detach 时 `SessionHandle::detach` 清空 notification sender，并 spawn expiration task；expiration 到期后 registry remove session 并 shutdown process backend。[E: codex-rs/exec-server/src/server/session_registry.rs:243][E: codex-rs/exec-server/src/server/session_registry.rs:250][E: codex-rs/exec-server/src/server/session_registry.rs:119][E: codex-rs/exec-server/src/server/session_registry.rs:132]
8. `LocalProcess::start_process` 拒绝空 argv 和 duplicate process id，根据 `tty`、`pipe_stdin` 选择 PTY、pipe with stdin 或 no-stdin pipe，然后记录 `RunningProcess` 并启动 stdout/stderr/exit watcher tasks。[E: codex-rs/exec-server/src/local_process.rs:148][E: codex-rs/exec-server/src/local_process.rs:154][E: codex-rs/exec-server/src/local_process.rs:165][E: codex-rs/exec-server/src/local_process.rs:211][E: codex-rs/exec-server/src/local_process.rs:232]
9. `exec_read` 按 `after_seq`、`max_bytes`、`wait_ms` 从 retained output chunks 取数据，并返回 `next_seq`、`exited`、`exit_code`、`closed`。[E: codex-rs/exec-server/src/local_process.rs:270][E: codex-rs/exec-server/src/local_process.rs:310][E: codex-rs/exec-server/src/local_process.rs:338]
10. stream watcher 调用 `stream_output` 追加 retained chunks、超过 retention cap 时 eviction、发送 events/notifications；exit watcher 设置 exit_code，发送 exit event，并安排 process retention cleanup。[E: codex-rs/exec-server/src/local_process.rs:535][E: codex-rs/exec-server/src/local_process.rs:562][E: codex-rs/exec-server/src/local_process.rs:578][E: codex-rs/exec-server/src/local_process.rs:593][E: codex-rs/exec-server/src/local_process.rs:621]

## PTY 与 pipe backend

- `spawn_pty_process` 最终走 `pty.rs::spawn_process`；portable PTY path 用 `CommandBuilder` 设置 arg0/cwd/env，使用 `pair.slave.spawn_command` 启动 child，读取 master clone 输出，并把 writer channel 收到的 bytes 写入 master writer。[E: codex-rs/utils/pty/src/pty.rs:101][E: codex-rs/utils/pty/src/pty.rs:151][E: codex-rs/utils/pty/src/pty.rs:152][E: codex-rs/utils/pty/src/pty.rs:157][E: codex-rs/utils/pty/src/pty.rs:161][E: codex-rs/utils/pty/src/pty.rs:172][E: codex-rs/utils/pty/src/pty.rs:191][E: codex-rs/utils/pty/src/pty.rs:196][E: codex-rs/utils/pty/src/pty.rs:199]
- Unix PTY preserving-fds path 使用 `open_unix_pty`、`setsid`、`TIOCSCTTY`、关闭非 preserved fds，并用 `child.wait()` task 回传 exit。[E: codex-rs/utils/pty/src/pty.rs:266][E: codex-rs/utils/pty/src/pty.rs:308][E: codex-rs/utils/pty/src/pty.rs:316][E: codex-rs/utils/pty/src/pty.rs:320][E: codex-rs/utils/pty/src/pty.rs:369][E: codex-rs/utils/pty/src/pty.rs:370]
- pipe backend 会检查 program 非空，设置 arg0/current_dir/env_clear/env/args/stdin/stdout/stderr，Linux 上安装 parent death signal，再 spawn child。[E: codex-rs/utils/pty/src/pipe.rs:103][E: codex-rs/utils/pty/src/pipe.rs:110][E: codex-rs/utils/pty/src/pipe.rs:115][E: codex-rs/utils/pty/src/pipe.rs:131][E: codex-rs/utils/pty/src/pipe.rs:150]
- `ProcessHandle` 暴露 writer、killer、helper tasks、pty handles 和 optional resizer；`Drop` 会 terminate。[E: codex-rs/utils/pty/src/process.rs:77][E: codex-rs/utils/pty/src/process.rs:86][E: codex-rs/utils/pty/src/process.rs:91][E: codex-rs/utils/pty/src/process.rs:223]

## 设计动机与权衡

- session registry 允许 WebSocket connection 断开后短时间 resume，避免正在运行的 process 因 transport 抖动立即丢失；TTL 到期后仍会 shutdown，避免 detached session 永久占资源。[I]
- output retention 使用 sequence numbers 和 byte cap，让 `exec/read` 可以在流式 notifications 之外补读历史输出，但不会无限持有 stdout/stderr。[E: codex-rs/exec-server/src/local_process.rs:48][E: codex-rs/exec-server/src/local_process.rs:535][E: codex-rs/exec-server/src/local_process.rs:562]
- PTY 与 pipe backend 共享 `ProcessDriver` abstraction，exec-server 不需要知道底层是 ConPTY、portable PTY 还是 pipe process。[E: codex-rs/utils/pty/src/process.rs:302][E: codex-rs/utils/pty/src/process.rs:313]

## gotcha

- `DETACHED_SESSION_TTL` 在 test cfg 下是 200 ms，在非 test cfg 下是 10 seconds。[E: codex-rs/exec-server/src/server/session_registry.rs:14][E: codex-rs/exec-server/src/server/session_registry.rs:16]
- `FileSystemHandler::read_file` 返回 base64 编码 bytes；`write_file` 接收 base64 并 decode，decode 失败映射 invalid request。[E: codex-rs/exec-server/src/server/file_system_handler.rs:45][E: codex-rs/exec-server/src/server/file_system_handler.rs:55][E: codex-rs/exec-server/src/server/file_system_handler.rs:59][E: codex-rs/exec-server/src/server/file_system_handler.rs:68]
- `exec/write` 会区分 unknown process、starting、stdin closed 和 accepted，不是所有 write 都同步代表 child 已消费输入。[E: codex-rs/exec-server/src/local_process.rs:346][E: codex-rs/exec-server/src/local_process.rs:358][E: codex-rs/exec-server/src/local_process.rs:365][E: codex-rs/exec-server/src/local_process.rs:376]

## Sources

- `codex-rs/exec-server/src/server`
- `codex-rs/exec-server/src/local_process.rs`
- `codex-rs/utils/pty/src`

## 相关

- `tool.exec-command`
- `tool.write-stdin`
- `subsys.exec-sandbox.overview`
- `spine.shell-exec-flow`
