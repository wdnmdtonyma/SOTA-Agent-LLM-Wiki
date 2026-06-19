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
updated: 5670360009
---

> exec-server 是 Codex 的 JSON-RPC process server: it accepts either `ws://IP:PORT` or `stdio`, manages process sessions through attach/resume/detach, and uses `codex_utils_pty` for PTY, pipe-stdin, and no-stdin spawn backends.[E: codex-rs/exec-server/src/server/transport.rs:28][E: codex-rs/exec-server/src/server/transport.rs:31][E: codex-rs/exec-server/src/server/transport.rs:59][E: codex-rs/exec-server/src/server/transport.rs:62][E: codex-rs/exec-server/src/server/transport.rs:66][E: codex-rs/exec-server/src/server/transport.rs:80][E: codex-rs/exec-server/src/server/handler.rs:107][E: codex-rs/exec-server/src/local_process.rs:183][E: codex-rs/exec-server/src/local_process.rs:193][E: codex-rs/exec-server/src/local_process.rs:202]

## 能回答的问题

- exec-server connection 如何路由 JSON-RPC requests 与 notifications？
- session attach/resume/detach 的 TTL 语义是什么？
- `exec`、`exec/read`、`exec/write`、`exec/terminate` 在 handler 中怎样进入 process layer？
- `LocalProcess` 怎样保留输出 chunks、发送 notifications、处理 stdin 和 terminate？
- PTY 与 pipe spawn backend 的差异在哪里？

## 职责边界

exec-server 节点覆盖 `codex-rs/exec-server/src/server` 的 JSON-RPC server/session lifecycle、`codex-rs/exec-server/src/local_process.rs` 的 process state machine、以及 `codex-rs/utils/pty/src` 的 PTY/pipe adapter。它不覆盖 shell tool approval，也不覆盖 OS sandbox policy generation；exec-server 接收的 process policy 是调用者已经构造好的执行请求。[I]

## 关键 crate/文件

- `codex-rs/exec-server/src/server/transport.rs`: parses `ws://IP:PORT` and `stdio` listen URLs, then dispatches to WebSocket listener or stdio connection processor.[E: codex-rs/exec-server/src/server/transport.rs:31][E: codex-rs/exec-server/src/server/transport.rs:59][E: codex-rs/exec-server/src/server/transport.rs:62][E: codex-rs/exec-server/src/server/transport.rs:66][E: codex-rs/exec-server/src/server/transport.rs:80][E: codex-rs/exec-server/src/server/transport.rs:84][E: codex-rs/exec-server/src/server/transport.rs:88][E: codex-rs/exec-server/src/server/transport.rs:92]
- `codex-rs/exec-server/src/server/processor.rs`: 读写 JSON-RPC messages、路由 requests/notifications、处理 disconnect 和 shutdown。[E: codex-rs/exec-server/src/server/processor.rs:44][E: codex-rs/exec-server/src/server/processor.rs:76][E: codex-rs/exec-server/src/server/processor.rs:97][E: codex-rs/exec-server/src/server/processor.rs:170]
- `codex-rs/exec-server/src/server/handler.rs`: `ExecServerHandler` 持有 session registry、notification sender、current session、active body stream ids、background-task shutdown/tracker、filesystem handler、initialize requested flag 和 initialized flag，提供 exec/fs/http request methods plus orderly shutdown.[E: codex-rs/exec-server/src/server/handler.rs:61][E: codex-rs/exec-server/src/server/handler.rs:62][E: codex-rs/exec-server/src/server/handler.rs:63][E: codex-rs/exec-server/src/server/handler.rs:64][E: codex-rs/exec-server/src/server/handler.rs:65][E: codex-rs/exec-server/src/server/handler.rs:66][E: codex-rs/exec-server/src/server/handler.rs:67][E: codex-rs/exec-server/src/server/handler.rs:68][E: codex-rs/exec-server/src/server/handler.rs:69][E: codex-rs/exec-server/src/server/handler.rs:70][E: codex-rs/exec-server/src/server/handler.rs:92][E: codex-rs/exec-server/src/server/handler.rs:96]
- `codex-rs/exec-server/src/server/session_registry.rs`: session attach/resume/detach、detached TTL expiration 和 process shutdown。[E: codex-rs/exec-server/src/server/session_registry.rs:16][E: codex-rs/exec-server/src/server/session_registry.rs:74][E: codex-rs/exec-server/src/server/session_registry.rs:120][E: codex-rs/exec-server/src/server/session_registry.rs:135]
- `codex-rs/exec-server/src/local_process.rs`: process map、stream chunks、output retention、stdin write、terminate、exit watch。[E: codex-rs/exec-server/src/local_process.rs:69][E: codex-rs/exec-server/src/local_process.rs:80][E: codex-rs/exec-server/src/local_process.rs:91][E: codex-rs/exec-server/src/local_process.rs:99][E: codex-rs/exec-server/src/local_process.rs:381][E: codex-rs/exec-server/src/local_process.rs:413][E: codex-rs/exec-server/src/local_process.rs:439][E: codex-rs/exec-server/src/local_process.rs:461][E: codex-rs/exec-server/src/local_process.rs:646][E: codex-rs/exec-server/src/local_process.rs:681][E: codex-rs/exec-server/src/local_process.rs:704][E: codex-rs/exec-server/src/local_process.rs:739][E: codex-rs/exec-server/src/local_process.rs:757][E: codex-rs/exec-server/src/local_process.rs:811]
- `codex-rs/utils/pty/src`: portable PTY and pipe process drivers exported to exec-server。[E: codex-rs/utils/pty/src/lib.rs:10][E: codex-rs/utils/pty/src/lib.rs:23][E: codex-rs/utils/pty/src/lib.rs:29]

## 数据模型

- `ExecServerHandler`: connection-local handler state contains `session_registry`, `notifications`, `session`, active body stream ids, background-task shutdown/tracker, `file_system`, `initialize_requested`, and `initialized`.[E: codex-rs/exec-server/src/server/handler.rs:61][E: codex-rs/exec-server/src/server/handler.rs:62][E: codex-rs/exec-server/src/server/handler.rs:63][E: codex-rs/exec-server/src/server/handler.rs:64][E: codex-rs/exec-server/src/server/handler.rs:65][E: codex-rs/exec-server/src/server/handler.rs:66][E: codex-rs/exec-server/src/server/handler.rs:67][E: codex-rs/exec-server/src/server/handler.rs:68][E: codex-rs/exec-server/src/server/handler.rs:69][E: codex-rs/exec-server/src/server/handler.rs:70]
- `SessionRegistry`: 用 `sessions: HashMap<String, SessionEntry>` 存储可 resume 的 detached sessions。[E: codex-rs/exec-server/src/server/session_registry.rs:19][E: codex-rs/exec-server/src/server/session_registry.rs:20]
- `SessionEntry`: 保存 `session_id`、process backend 和 `AttachmentState`；`AttachmentState` 保存 current connection id、detached connection id 和 detached expiration instant。[E: codex-rs/exec-server/src/server/session_registry.rs:23][E: codex-rs/exec-server/src/server/session_registry.rs:24][E: codex-rs/exec-server/src/server/session_registry.rs:25][E: codex-rs/exec-server/src/server/session_registry.rs:26][E: codex-rs/exec-server/src/server/session_registry.rs:29][E: codex-rs/exec-server/src/server/session_registry.rs:30][E: codex-rs/exec-server/src/server/session_registry.rs:31][E: codex-rs/exec-server/src/server/session_registry.rs:32]
- `LocalProcess`: `inner.processes` 是 process id 到 `ProcessEntry` 的 map；`ProcessEntry` 可处于 `Starting` 或 `Running(Box<RunningProcess>)`。[E: codex-rs/exec-server/src/local_process.rs:86][E: codex-rs/exec-server/src/local_process.rs:87][E: codex-rs/exec-server/src/local_process.rs:88][E: codex-rs/exec-server/src/local_process.rs:91][E: codex-rs/exec-server/src/local_process.rs:97][E: codex-rs/exec-server/src/local_process.rs:99]
- `RunningProcess`: 保存 process session、tty/pipe-stdin flags、retained output chunks、retained byte count、next sequence、exit_code、wake channel、event log、output notify、open stream count 和 closed flag。[E: codex-rs/exec-server/src/local_process.rs:69][E: codex-rs/exec-server/src/local_process.rs:70][E: codex-rs/exec-server/src/local_process.rs:71][E: codex-rs/exec-server/src/local_process.rs:72][E: codex-rs/exec-server/src/local_process.rs:73][E: codex-rs/exec-server/src/local_process.rs:74][E: codex-rs/exec-server/src/local_process.rs:75][E: codex-rs/exec-server/src/local_process.rs:76][E: codex-rs/exec-server/src/local_process.rs:77][E: codex-rs/exec-server/src/local_process.rs:78][E: codex-rs/exec-server/src/local_process.rs:79][E: codex-rs/exec-server/src/local_process.rs:80][E: codex-rs/exec-server/src/local_process.rs:81][E: codex-rs/exec-server/src/local_process.rs:82]

## 控制流

1. `run_transport` 解析 listen URL，`ws://` path 启动 WebSocket listener，`stdio` path wraps stdin/stdout into a JSON-RPC connection and runs the same processor.[E: codex-rs/exec-server/src/server/transport.rs:80][E: codex-rs/exec-server/src/server/transport.rs:84][E: codex-rs/exec-server/src/server/transport.rs:86][E: codex-rs/exec-server/src/server/transport.rs:88][E: codex-rs/exec-server/src/server/transport.rs:92][E: codex-rs/exec-server/src/server/transport.rs:107][E: codex-rs/exec-server/src/server/transport.rs:110]
2. `ConnectionProcessor::run_connection` build router，split connection，创建 notification sender 和 `ExecServerHandler`。[E: codex-rs/exec-server/src/server/processor.rs:44][E: codex-rs/exec-server/src/server/processor.rs:48][E: codex-rs/exec-server/src/server/processor.rs:55]
3. outbound task 把 handler notifications serialize 后写入 connection；inbound loop 逐条处理 message，malformed JSON-RPC 返回 invalid request error。[E: codex-rs/exec-server/src/server/processor.rs:61][E: codex-rs/exec-server/src/server/processor.rs:76][E: codex-rs/exec-server/src/server/processor.rs:83]
4. processor 对 request 调用 router route；未知 method 返回 `method_not_found`，client responses/errors 会触发 connection close。[E: codex-rs/exec-server/src/server/processor.rs:97][E: codex-rs/exec-server/src/server/processor.rs:109][E: codex-rs/exec-server/src/server/processor.rs:146]
5. handler 的 `initialize` 只能执行一次；它调用 `SessionRegistry::attach` attach 或 resume session，存储 `SessionHandle`，并返回 `InitializeResponse { session_id }`。客户端随后发送 `initialized` notification 时，`initialized()` 才把 initialized flag 置为 true。[E: codex-rs/exec-server/src/server/handler.rs:75][E: codex-rs/exec-server/src/server/handler.rs:85][E: codex-rs/exec-server/src/server/handler.rs:102][E: codex-rs/exec-server/src/server/handler.rs:107][E: codex-rs/exec-server/src/server/handler.rs:109][E: codex-rs/exec-server/src/server/handler.rs:115]
6. `SessionRegistry::attach` 对 unknown session id 返回 invalid params，对仍有 active connection 的 session 拒绝 attach，对 detached session 更新 notification sender 并 resume；没有 session id 时创建 UUID session。[E: codex-rs/exec-server/src/server/session_registry.rs:74][E: codex-rs/exec-server/src/server/session_registry.rs:84][E: codex-rs/exec-server/src/server/session_registry.rs:89][E: codex-rs/exec-server/src/server/session_registry.rs:93]
7. detach 时 `SessionHandle::detach` 清空 notification sender，并 spawn expiration task；expiration 到期后 registry remove session 并 shutdown process backend。[E: codex-rs/exec-server/src/server/session_registry.rs:245][E: codex-rs/exec-server/src/server/session_registry.rs:250][E: codex-rs/exec-server/src/server/session_registry.rs:253][E: codex-rs/exec-server/src/server/session_registry.rs:254][E: codex-rs/exec-server/src/server/session_registry.rs:120][E: codex-rs/exec-server/src/server/session_registry.rs:121][E: codex-rs/exec-server/src/server/session_registry.rs:131][E: codex-rs/exec-server/src/server/session_registry.rs:135]
8. `LocalProcess::start_process` 拒绝空 argv 和 duplicate process id，根据 `tty`、`pipe_stdin` 选择 PTY、pipe with stdin 或 no-stdin pipe，然后记录 `RunningProcess` 并启动 stdout/stderr/exit watcher tasks。[E: codex-rs/exec-server/src/local_process.rs:152][E: codex-rs/exec-server/src/local_process.rs:157][E: codex-rs/exec-server/src/local_process.rs:160][E: codex-rs/exec-server/src/local_process.rs:168][E: codex-rs/exec-server/src/local_process.rs:180][E: codex-rs/exec-server/src/local_process.rs:183][E: codex-rs/exec-server/src/local_process.rs:193][E: codex-rs/exec-server/src/local_process.rs:202][E: codex-rs/exec-server/src/local_process.rs:244][E: codex-rs/exec-server/src/local_process.rs:259][E: codex-rs/exec-server/src/local_process.rs:263][E: codex-rs/exec-server/src/local_process.rs:290]
9. `exec_read` 按 `after_seq`、`max_bytes`、`wait_ms` 从 retained output chunks 取数据，并返回 `next_seq`、`exited`、`exit_code`、`closed`。[E: codex-rs/exec-server/src/local_process.rs:270][E: codex-rs/exec-server/src/local_process.rs:310][E: codex-rs/exec-server/src/local_process.rs:338]
10. stream watcher 调用 `stream_output` 追加 retained chunks、超过 retention cap 时 eviction、发送 events/notifications；exit watcher 设置 exit_code，发送 exit event，并安排 process retention cleanup。[E: codex-rs/exec-server/src/local_process.rs:646][E: codex-rs/exec-server/src/local_process.rs:653][E: codex-rs/exec-server/src/local_process.rs:663][E: codex-rs/exec-server/src/local_process.rs:676][E: codex-rs/exec-server/src/local_process.rs:683][E: codex-rs/exec-server/src/local_process.rs:697][E: codex-rs/exec-server/src/local_process.rs:704][E: codex-rs/exec-server/src/local_process.rs:716][E: codex-rs/exec-server/src/local_process.rs:720][E: codex-rs/exec-server/src/local_process.rs:739][E: codex-rs/exec-server/src/local_process.rs:757][E: codex-rs/exec-server/src/local_process.rs:811]

## PTY 与 pipe backend

- `spawn_pty_process` 最终走 `pty.rs::spawn_process`；portable PTY path 用 `CommandBuilder` 设置 arg0/cwd/env，使用 `pair.slave.spawn_command` 启动 child，读取 master clone 输出，并把 writer channel 收到的 bytes 写入 master writer。[E: codex-rs/utils/pty/src/pty.rs:101][E: codex-rs/utils/pty/src/pty.rs:153][E: codex-rs/utils/pty/src/pty.rs:152][E: codex-rs/utils/pty/src/pty.rs:157][E: codex-rs/utils/pty/src/pty.rs:161][E: codex-rs/utils/pty/src/pty.rs:172][E: codex-rs/utils/pty/src/pty.rs:191][E: codex-rs/utils/pty/src/pty.rs:196][E: codex-rs/utils/pty/src/pty.rs:199]
- Unix PTY preserving-fds path 使用 `open_unix_pty`、`setsid`、`TIOCSCTTY`、关闭非 preserved fds，并用 `child.wait()` task 回传 exit。[E: codex-rs/utils/pty/src/pty.rs:266][E: codex-rs/utils/pty/src/pty.rs:308][E: codex-rs/utils/pty/src/pty.rs:316][E: codex-rs/utils/pty/src/pty.rs:320][E: codex-rs/utils/pty/src/pty.rs:369][E: codex-rs/utils/pty/src/pty.rs:370]
- pipe backend 会检查 program 非空，设置 arg0/current_dir/env_clear/env/args/stdin/stdout/stderr，Linux 上安装 parent death signal，再 spawn child。[E: codex-rs/utils/pty/src/pipe.rs:103][E: codex-rs/utils/pty/src/pipe.rs:110][E: codex-rs/utils/pty/src/pipe.rs:115][E: codex-rs/utils/pty/src/pipe.rs:131][E: codex-rs/utils/pty/src/pipe.rs:150]
- `ProcessHandle` 暴露 writer、killer、helper tasks、pty handles 和 optional resizer；`Drop` 会 terminate。[E: codex-rs/utils/pty/src/process.rs:77][E: codex-rs/utils/pty/src/process.rs:86][E: codex-rs/utils/pty/src/process.rs:91][E: codex-rs/utils/pty/src/process.rs:223]

## 设计动机与权衡

- session registry allows a WebSocket or stdio JSON-RPC connection to detach and resume briefly, avoiding immediate loss of a running process on transport churn; TTL expiry still shuts down the process backend so detached sessions do not live forever.[I]
- output retention 使用 sequence numbers 和 byte cap，让 `exec/read` 可以在流式 notifications 之外补读历史输出，但不会无限持有 stdout/stderr。[E: codex-rs/exec-server/src/local_process.rs:54][E: codex-rs/exec-server/src/local_process.rs:69][E: codex-rs/exec-server/src/local_process.rs:80][E: codex-rs/exec-server/src/local_process.rs:646][E: codex-rs/exec-server/src/local_process.rs:676]
- PTY 与 pipe backend 共享 `ProcessDriver` abstraction，exec-server 不需要知道底层是 ConPTY、portable PTY 还是 pipe process。[E: codex-rs/utils/pty/src/process.rs:302][E: codex-rs/utils/pty/src/process.rs:313]

## gotcha

- `DETACHED_SESSION_TTL` 在 test cfg 下是 200 ms，在非 test cfg 下是 30 seconds。[E: codex-rs/exec-server/src/server/session_registry.rs:15][E: codex-rs/exec-server/src/server/session_registry.rs:16][E: codex-rs/exec-server/src/server/session_registry.rs:17][E: codex-rs/exec-server/src/server/session_registry.rs:18]
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
