---
id: subsys.app-server.session-management
title: 会话管理
kind: subsystem
tier: T2
source:
  - codex-rs/app-server/src/lib.rs
  - codex-rs/app-server/src/message_processor.rs
  - codex-rs/app-server/src/thread_state.rs
  - codex-rs/app-server/src/thread_status.rs
  - codex-rs/app-server/src/outgoing_message.rs
  - codex-rs/app-server/src/codex_message_processor.rs
  - codex-rs/app-server/src/transport/mod.rs
symbols:
  - run_main_with_transport
  - MessageProcessor
  - ConnectionSessionState
  - ThreadStateManager
  - ThreadWatchManager
related:
  - subsys.app-server.message-processor
  - subsys.app-server.transport
  - subsys.app-server.client-libs
evidence: explicit
status: verified
updated: 37aadeaa13
---

app-server 会话管理可按三类职责组织：`lib.rs` 的 transport/processor/outbound loops 管 connection 生命周期，`MessageProcessor` 管 initialize 后的 per-connection session state，`CodexMessageProcessor` 与 `ThreadStateManager`/`ThreadWatchManager` 管 thread subscription、listener 和 loaded/running status [E: codex-rs/app-server/src/lib.rs:592][E: codex-rs/app-server/src/lib.rs:647][E: codex-rs/app-server/src/message_processor.rs:184][E: codex-rs/app-server/src/thread_state.rs:194][E: codex-rs/app-server/src/thread_status.rs:19][I]。

## 能回答的问题

- app-server 进程如何在 stdio single-client 和 websocket multi-client 模式下启动/关闭。
- `initialize` 如何把 client capabilities 写入 connection session，并什么时候将 outbound connection 标记 ready。
- app-server 如何维护 live connections、thread subscriptions、active turn status 和 pending requests。
- 无订阅 thread 如何延迟卸载并发送 `ThreadClosed`。

## 职责边界

- `run_main_with_transport` 创建 transport event channel、outgoing channel、outbound control channel，随后按 transport 启动 stdio、websocket acceptor 或 `Off` no-op，并把 `remote_control_enabled` 传给 `start_remote_control` [E: codex-rs/app-server/src/lib.rs:370][E: codex-rs/app-server/src/lib.rs:372][E: codex-rs/app-server/src/lib.rs:373][E: codex-rs/app-server/src/lib.rs:549][E: codex-rs/app-server/src/lib.rs:557][E: codex-rs/app-server/src/lib.rs:566][E: codex-rs/app-server/src/lib.rs:572][E: codex-rs/app-server/src/lib.rs:580][E: codex-rs/app-server/src/lib.rs:587]。
- outbound router task 负责把 `OutgoingEnvelope` 路由到 connection writer，并处理 opened/closed/disconnect-all control event；“路由到 connection writer”来自该 task 对 `OutboundControlEvent` 与 outgoing envelope 的分支结构 [E: codex-rs/app-server/src/lib.rs:592][E: codex-rs/app-server/src/lib.rs:602][E: codex-rs/app-server/src/lib.rs:621][E: codex-rs/app-server/src/lib.rs:624][E: codex-rs/app-server/src/lib.rs:636][E: codex-rs/app-server/src/lib.rs:640][I]。
- processor task 负责 incoming JSON-RPC message dispatch、connection map、shutdown drain、thread-created auto attach 和 processor cleanup [E: codex-rs/app-server/src/lib.rs:647][E: codex-rs/app-server/src/lib.rs:668][E: codex-rs/app-server/src/lib.rs:689][E: codex-rs/app-server/src/lib.rs:762][E: codex-rs/app-server/src/lib.rs:839][E: codex-rs/app-server/src/lib.rs:871][E: codex-rs/app-server/src/lib.rs:872]。
- `ThreadWatchManager` 派生 loaded/running/waiting status；其 watcher state 保存 runtime facts 和 status watchers，而不是 full transcript。thread turn history 则来自 rollout items 或 active turn builder [E: codex-rs/app-server/src/thread_status.rs:302][E: codex-rs/app-server/src/thread_status.rs:420][E: codex-rs/app-server/src/thread_status.rs:429][E: codex-rs/app-server/src/thread_state.rs:66][E: codex-rs/app-server/src/thread_state.rs:112][E: codex-rs/app-server/src/thread_state.rs:116][E: codex-rs/app-server/src/codex_message_processor.rs:8520][E: codex-rs/app-server/src/codex_message_processor.rs:8530][E: codex-rs/app-server/src/codex_message_processor.rs:8545]。

## 关键 crate/文件

- `codex-rs/app-server/src/lib.rs`: process runtime, transport startup, processor loop, outbound loop, graceful shutdown。
- `codex-rs/app-server/src/message_processor.rs`: per-connection initialize/session state and outer APIs。
- `codex-rs/app-server/src/thread_state.rs`: live connection to thread subscription map and listener state。
- `codex-rs/app-server/src/thread_status.rs`: loaded status and running turn count watchers。
- `codex-rs/app-server/src/outgoing_message.rs`: pending app-server to client requests and request contexts。

## 数据模型

- `ConnectionSessionState` 保存 origin 和 initialized `OnceLock`；initialized state 包含 experimental API flag、opted-out notification methods、client name 和 client version [E: codex-rs/app-server/src/message_processor.rs:184][E: codex-rs/app-server/src/message_processor.rs:186][E: codex-rs/app-server/src/message_processor.rs:187][E: codex-rs/app-server/src/message_processor.rs:191][E: codex-rs/app-server/src/message_processor.rs:192][E: codex-rs/app-server/src/message_processor.rs:193][E: codex-rs/app-server/src/message_processor.rs:194][E: codex-rs/app-server/src/message_processor.rs:195]。
- `ThreadState` 保存 pending interrupts、pending rollback、turn summary、listener cancel sender、raw events flag、listener generation、listener command sender、current turn history 和 weak listener thread [E: codex-rs/app-server/src/thread_state.rs:57][E: codex-rs/app-server/src/thread_state.rs:59][E: codex-rs/app-server/src/thread_state.rs:60][E: codex-rs/app-server/src/thread_state.rs:61][E: codex-rs/app-server/src/thread_state.rs:62][E: codex-rs/app-server/src/thread_state.rs:63][E: codex-rs/app-server/src/thread_state.rs:64][E: codex-rs/app-server/src/thread_state.rs:65][E: codex-rs/app-server/src/thread_state.rs:66][E: codex-rs/app-server/src/thread_state.rs:67]。
- `ThreadStateManagerInner` 保存 live connections、thread entries 和 connection 到 thread ids 的反向索引 [E: codex-rs/app-server/src/thread_state.rs:187][E: codex-rs/app-server/src/thread_state.rs:189][E: codex-rs/app-server/src/thread_state.rs:190][E: codex-rs/app-server/src/thread_state.rs:191]。
- `RuntimeFacts` 保存 is_loaded、running、pending permission requests、pending user input requests、system error，并由 `loaded_thread_status` 映射到 protocol `ThreadStatus` [E: codex-rs/app-server/src/thread_status.rs:420][E: codex-rs/app-server/src/thread_status.rs:422][E: codex-rs/app-server/src/thread_status.rs:423][E: codex-rs/app-server/src/thread_status.rs:424][E: codex-rs/app-server/src/thread_status.rs:425][E: codex-rs/app-server/src/thread_status.rs:426][E: codex-rs/app-server/src/thread_status.rs:429]。
- `OutgoingMessageSender` 保存 pending server request callbacks 和 incoming request contexts，用于 response/error 回调、disconnect cleanup 和 trace propagation [E: codex-rs/app-server/src/outgoing_message.rs:49][E: codex-rs/app-server/src/outgoing_message.rs:71][E: codex-rs/app-server/src/outgoing_message.rs:111][E: codex-rs/app-server/src/outgoing_message.rs:115][E: codex-rs/app-server/src/outgoing_message.rs:119][E: codex-rs/app-server/src/outgoing_message.rs:230][E: codex-rs/app-server/src/outgoing_message.rs:612]。

## 控制流

1. 新 connection 到达时，processor loop 创建 outbound initialized flag、experimental flag、opt-out set，发 `OutboundControlEvent::Opened`，并把 `ConnectionState` 插入 connection map [E: codex-rs/app-server/src/lib.rs:707][E: codex-rs/app-server/src/lib.rs:713][E: codex-rs/app-server/src/lib.rs:714][E: codex-rs/app-server/src/lib.rs:716][E: codex-rs/app-server/src/lib.rs:719][E: codex-rs/app-server/src/lib.rs:736]。
2. incoming request 到达时，processor 调用 `MessageProcessor::process_request`，之后把 session 中的 opt-out methods 和 experimental flag mirror 到 outbound state [E: codex-rs/app-server/src/lib.rs:762][E: codex-rs/app-server/src/lib.rs:772][E: codex-rs/app-server/src/lib.rs:781][E: codex-rs/app-server/src/lib.rs:783][E: codex-rs/app-server/src/lib.rs:798]。
3. 如果 request 使 connection 从未 initialized 变成 initialized，processor 先发送 initialize notifications，再调用 `connection_initialized`，最后把 outbound initialized flag 设为 true [E: codex-rs/app-server/src/lib.rs:802][E: codex-rs/app-server/src/lib.rs:804][E: codex-rs/app-server/src/lib.rs:808][E: codex-rs/app-server/src/lib.rs:811]。
4. initialize handler 验证 client name 是合法 HTTP header value，写入 session `OnceLock`，设置 process-global originator/user-agent suffix，并返回 `InitializeResponse` [E: codex-rs/app-server/src/message_processor.rs:640][E: codex-rs/app-server/src/message_processor.rs:656][E: codex-rs/app-server/src/message_processor.rs:678][E: codex-rs/app-server/src/message_processor.rs:703][E: codex-rs/app-server/src/message_processor.rs:708][E: codex-rs/app-server/src/message_processor.rs:715]。
5. thread-created broadcast receiver 触发时，processor 找出 initialized connections，并调用 `try_attach_thread_listener` 为新 thread auto attach listener [E: codex-rs/app-server/src/lib.rs:839][E: codex-rs/app-server/src/lib.rs:842][E: codex-rs/app-server/src/lib.rs:844][E: codex-rs/app-server/src/lib.rs:849]。
6. connection close 时，processor 移除 connection、通知 outbound loop、调用 `processor.connection_closed`；如果是 stdio single-client 且无连接则退出 [E: codex-rs/app-server/src/lib.rs:540][E: codex-rs/app-server/src/lib.rs:541][E: codex-rs/app-server/src/lib.rs:746][E: codex-rs/app-server/src/lib.rs:747][E: codex-rs/app-server/src/lib.rs:751][E: codex-rs/app-server/src/lib.rs:757][E: codex-rs/app-server/src/lib.rs:758]。
7. graceful signal 在 websocket/multi-client 模式先请求 graceful drain，第二次 signal 强制退出；`ShutdownState::update` 在 forced 或 running turn count 为 0 时 finish，`connection_count` 只参与日志 [E: codex-rs/app-server/src/lib.rs:175][E: codex-rs/app-server/src/lib.rs:184][E: codex-rs/app-server/src/lib.rs:189][E: codex-rs/app-server/src/lib.rs:194][E: codex-rs/app-server/src/lib.rs:197][E: codex-rs/app-server/src/lib.rs:201][E: codex-rs/app-server/src/lib.rs:540][E: codex-rs/app-server/src/lib.rs:542][E: codex-rs/app-server/src/lib.rs:689]。

## 设计动机与权衡

- `lib.rs` 注释明确把 app-server 拆成 processor loop 和 outbound loop 两类任务，outbound loop 独立处理 slow writes；“避免 client 写阻塞 request dispatch”是从这两类任务划分得出的架构推断 [E: codex-rs/app-server/src/lib.rs:112][E: codex-rs/app-server/src/lib.rs:113][E: codex-rs/app-server/src/lib.rs:114][I]。
- websocket JSON-RPC initialize 不在 shared handler 内立即标 outbound ready；注释说明要等 `lib.rs` 把 per-connection initialize notifications 发完，避免过早标记 outbound ready，broadcast 也只发送给 initialized connection [E: codex-rs/app-server/src/message_processor.rs:414][E: codex-rs/app-server/src/message_processor.rs:719][E: codex-rs/app-server/src/transport/mod.rs:384][E: codex-rs/app-server/src/transport/mod.rs:388]。
- `resolve_thread_status` 在有 live in-progress turn 时把 Idle/NotLoaded 纠正为 Active；避免 listener runtime 状态尚未观察到 running event 的竞态导致 UI 误报空闲是从 status correction 后果得出的推断 [E: codex-rs/app-server/src/thread_status.rs:285][E: codex-rs/app-server/src/thread_status.rs:289][E: codex-rs/app-server/src/thread_status.rs:292][I]。
- 无订阅且 inactive 的 thread 通过 `UnloadingState` 延迟卸载，避免刚断开的客户端瞬间重连时重复 cold resume [I]；卸载代码先取消 pending requests、remove thread state、请求 core thread shutdown，只有 `ThreadShutdownResult::Complete` 成功分支会 remove watch state 并发送 `ThreadClosed` [E: codex-rs/app-server/src/codex_message_processor.rs:6074][E: codex-rs/app-server/src/codex_message_processor.rs:6087][E: codex-rs/app-server/src/codex_message_processor.rs:6090][E: codex-rs/app-server/src/codex_message_processor.rs:6093][E: codex-rs/app-server/src/codex_message_processor.rs:6094][E: codex-rs/app-server/src/codex_message_processor.rs:6103][E: codex-rs/app-server/src/codex_message_processor.rs:6110][E: codex-rs/app-server/src/codex_message_processor.rs:6114]。

## gotcha

- device-key requests 只允许 local owner connection；`ConnectionOrigin::allows_device_key_requests` 只对 Stdio 和 InProcess 返回 true [E: codex-rs/app-server/src/transport/mod.rs:129][E: codex-rs/app-server/src/transport/mod.rs:133]。
- duplicate initialize 会返回 `Already initialized`，因为 session initialized 用 `OnceLock` 设置一次 [E: codex-rs/app-server/src/message_processor.rs:606][E: codex-rs/app-server/src/message_processor.rs:612][E: codex-rs/app-server/src/message_processor.rs:656][E: codex-rs/app-server/src/message_processor.rs:667]。
- `ThreadWatchActiveGuard` 在 Drop 中异步 decrement pending approval/user input counters；如果 guard 被泄漏，status 可能保持 waiting flag 是从 Drop/decrement 机制和 waiting flag derivation 得出的推断 [E: codex-rs/app-server/src/thread_status.rs:48][E: codex-rs/app-server/src/thread_status.rs:54][E: codex-rs/app-server/src/thread_status.rs:258][E: codex-rs/app-server/src/thread_status.rs:435][E: codex-rs/app-server/src/thread_status.rs:439][E: codex-rs/app-server/src/thread_status.rs:442][I]。

## Sources

- `codex-rs/app-server/src/lib.rs`
- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/app-server/src/thread_state.rs`
- `codex-rs/app-server/src/thread_status.rs`
- `codex-rs/app-server/src/outgoing_message.rs`
- `codex-rs/app-server/src/codex_message_processor.rs`
- `codex-rs/app-server/src/transport/mod.rs`

## 相关

- `subsys.app-server.message-processor`
- `subsys.app-server.transport`
- `subsys.app-server.client-libs`
