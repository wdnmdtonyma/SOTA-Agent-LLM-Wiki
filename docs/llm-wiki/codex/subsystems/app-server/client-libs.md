---
id: subsys.app-server.client-libs
title: App-server 客户端库
kind: subsystem
tier: T2
source:
  - codex-rs/app-server-client/src
  - codex-rs/app-server-test-client/src
  - codex-rs/debug-client/src
symbols:
  - InProcessAppServerClient
  - RemoteAppServerClient
  - AppServerClient
  - CodexClient
  - DebugClient
related:
  - subsys.app-server.transport
  - subsys.app-server.session-management
  - subsys.tui.architecture
evidence: explicit
status: verified
updated: 37aadeaa13
---

app-server client libraries 提供三层客户端：`codex-app-server-client` facade 同时支持 in-process 和 remote WebSocket，`app-server-test-client` 可以 spawn stdio app-server 或连接 WebSocket，`debug-client` 通过 child process stdio 驱动 app-server；这些角色定位来自 crate API 与 launcher 形态 [E: codex-rs/app-server-client/src/lib.rs:459][E: codex-rs/app-server-client/src/lib.rs:460][E: codex-rs/app-server-client/src/lib.rs:461][E: codex-rs/app-server-test-client/src/lib.rs:1430][E: codex-rs/debug-client/src/client.rs:61][E: codex-rs/debug-client/src/client.rs:67][I]。

## 能回答的问题

- TUI/exec 这类嵌入客户端如何用 in-process app-server 而不直接碰 core runtime。
- remote WebSocket client 如何 initialize、发送 request、接收 response/notification/server request。
- event backpressure 下哪些通知必须 lossless，哪些可以 best-effort。
- test-client/debug-client 如何自动处理 approval request。

## 职责边界

- `codex-app-server-client` 是 typed async facade；crate 顶部注释列出 runtime startup、initialize handshake、typed/raw dispatch、server request resolution/rejection、backpressure signaling 和 bounded shutdown [E: codex-rs/app-server-client/src/lib.rs:3][E: codex-rs/app-server-client/src/lib.rs:6][E: codex-rs/app-server-client/src/lib.rs:8][E: codex-rs/app-server-client/src/lib.rs:9][E: codex-rs/app-server-client/src/lib.rs:10][E: codex-rs/app-server-client/src/lib.rs:11]。
- `app-server-test-client` 既可以 spawn `codex app-server` stdio，也可以连接现有 websocket URL [E: codex-rs/app-server-test-client/src/lib.rs:110][E: codex-rs/app-server-test-client/src/lib.rs:115][E: codex-rs/app-server-test-client/src/lib.rs:1430][E: codex-rs/app-server-test-client/src/lib.rs:1450][E: codex-rs/app-server-test-client/src/lib.rs:1492]。
- `debug-client` 通过 child process stdio 跟 app-server 交互；`AppServerClient::spawn` 固定执行 `codex_bin app-server` 并接管 stdin/stdout [E: codex-rs/debug-client/src/client.rs:55][E: codex-rs/debug-client/src/client.rs:61][E: codex-rs/debug-client/src/client.rs:67][E: codex-rs/debug-client/src/client.rs:68][E: codex-rs/debug-client/src/client.rs:69][E: codex-rs/debug-client/src/client.rs:74][E: codex-rs/debug-client/src/client.rs:78]。

## 关键 crate/文件

- `codex-rs/app-server-client/src/lib.rs`: in-process facade, common event model, request typed helpers。
- `codex-rs/app-server-client/src/remote.rs`: WebSocket remote client。
- `codex-rs/app-server-test-client/src/lib.rs`: manual/E2E CLI harness。
- `codex-rs/debug-client/src/client.rs`: synchronous debug client request helpers。
- `codex-rs/debug-client/src/reader.rs`: stdout reader and approval auto-response。
- `codex-rs/debug-client/src/main.rs`: interactive REPL command loop。

## 数据模型

- `AppServerEvent` 统一表示 `Lagged`, `ServerNotification`, `ServerRequest`, `Disconnected` [E: codex-rs/app-server-client/src/lib.rs:135][E: codex-rs/app-server-client/src/lib.rs:136][E: codex-rs/app-server-client/src/lib.rs:137][E: codex-rs/app-server-client/src/lib.rs:138][E: codex-rs/app-server-client/src/lib.rs:139]。
- `InProcessClientStartArgs` 包含 arg0 dispatch paths、config、cli overrides、loader overrides、cloud requirements、feedback、log db、environment manager、config warnings、session source、API key env 开关、client identity、experimental api、opt-out notification methods 和 channel capacity [E: codex-rs/app-server-client/src/lib.rs:325][E: codex-rs/app-server-client/src/lib.rs:327][E: codex-rs/app-server-client/src/lib.rs:329][E: codex-rs/app-server-client/src/lib.rs:331][E: codex-rs/app-server-client/src/lib.rs:333][E: codex-rs/app-server-client/src/lib.rs:335][E: codex-rs/app-server-client/src/lib.rs:337][E: codex-rs/app-server-client/src/lib.rs:339][E: codex-rs/app-server-client/src/lib.rs:341][E: codex-rs/app-server-client/src/lib.rs:343][E: codex-rs/app-server-client/src/lib.rs:345][E: codex-rs/app-server-client/src/lib.rs:347][E: codex-rs/app-server-client/src/lib.rs:349][E: codex-rs/app-server-client/src/lib.rs:351][E: codex-rs/app-server-client/src/lib.rs:353][E: codex-rs/app-server-client/src/lib.rs:355][E: codex-rs/app-server-client/src/lib.rs:357]。
- `RemoteAppServerConnectArgs` 保存 websocket URL、auth token、client name/version、experimental API、opt-out notification methods 和 channel capacity [E: codex-rs/app-server-client/src/remote.rs:61][E: codex-rs/app-server-client/src/remote.rs:62][E: codex-rs/app-server-client/src/remote.rs:63][E: codex-rs/app-server-client/src/remote.rs:64][E: codex-rs/app-server-client/src/remote.rs:65][E: codex-rs/app-server-client/src/remote.rs:66][E: codex-rs/app-server-client/src/remote.rs:67][E: codex-rs/app-server-client/src/remote.rs:68]。
- `AppServerClient` enum 把 in-process 与 remote client 包在统一 API 下，request/notify/resolve/reject/next_event/shutdown 都按 variant dispatch [E: codex-rs/app-server-client/src/lib.rs:459][E: codex-rs/app-server-client/src/lib.rs:460][E: codex-rs/app-server-client/src/lib.rs:461][E: codex-rs/app-server-client/src/lib.rs:841][E: codex-rs/app-server-client/src/lib.rs:842][E: codex-rs/app-server-client/src/lib.rs:858][E: codex-rs/app-server-client/src/lib.rs:859][E: codex-rs/app-server-client/src/lib.rs:865][E: codex-rs/app-server-client/src/lib.rs:870][E: codex-rs/app-server-client/src/lib.rs:876][E: codex-rs/app-server-client/src/lib.rs:881][E: codex-rs/app-server-client/src/lib.rs:887][E: codex-rs/app-server-client/src/lib.rs:888][E: codex-rs/app-server-client/src/lib.rs:894][E: codex-rs/app-server-client/src/lib.rs:895]。

## 控制流

1. in-process client start 把 startup args 转成 `InProcessStartArgs`，调用 `codex_app_server::in_process::start`，再创建 command channel 和 event channel [E: codex-rs/app-server-client/src/lib.rs:382][E: codex-rs/app-server-client/src/lib.rs:470][E: codex-rs/app-server-client/src/lib.rs:473][E: codex-rs/app-server-client/src/lib.rs:475][E: codex-rs/app-server-client/src/lib.rs:476]。
2. in-process worker 对 request command spawn detached task，避免 request 等待 client input 时阻塞 event drain loop [E: codex-rs/app-server-client/src/lib.rs:485][E: codex-rs/app-server-client/src/lib.rs:487][E: codex-rs/app-server-client/src/lib.rs:490][E: codex-rs/app-server-client/src/lib.rs:491]。
3. in-process event forwarding 对必须 delivery 的 transcript/completion notifications 使用 blocking send，对 best-effort event 使用 try_send 并记录 lag；server request 被 drop 时会 reject，避免 server 等待永远不会来的 response [E: codex-rs/app-server-client/src/lib.rs:207][E: codex-rs/app-server-client/src/lib.rs:208][E: codex-rs/app-server-client/src/lib.rs:254][E: codex-rs/app-server-client/src/lib.rs:257][E: codex-rs/app-server-client/src/lib.rs:263][E: codex-rs/app-server-client/src/lib.rs:266][E: codex-rs/app-server-client/src/lib.rs:268][E: codex-rs/app-server-client/src/lib.rs:269]。
4. remote connect 校验 URL 和 auth token safety，连接 websocket，发送 initialize request，等待 initialize response，然后发送 `initialized` notification [E: codex-rs/app-server-client/src/remote.rs:143][E: codex-rs/app-server-client/src/remote.rs:149][E: codex-rs/app-server-client/src/remote.rs:174][E: codex-rs/app-server-client/src/remote.rs:189][E: codex-rs/app-server-client/src/remote.rs:680][E: codex-rs/app-server-client/src/remote.rs:702][E: codex-rs/app-server-client/src/remote.rs:785]。
5. remote worker 保存 pending request map；发送 request 时检查 duplicate request id，收到 response/error 时按 id resolve pending sender [E: codex-rs/app-server-client/src/remote.rs:200][E: codex-rs/app-server-client/src/remote.rs:212][E: codex-rs/app-server-client/src/remote.rs:213][E: codex-rs/app-server-client/src/remote.rs:220][E: codex-rs/app-server-client/src/remote.rs:305][E: codex-rs/app-server-client/src/remote.rs:306][E: codex-rs/app-server-client/src/remote.rs:310][E: codex-rs/app-server-client/src/remote.rs:311]。
6. remote worker 收到 server request 时尝试转成 typed `ServerRequest` 并投递 event；转型失败会写 JSON-RPC error 给 server [E: codex-rs/app-server-client/src/remote.rs:329][E: codex-rs/app-server-client/src/remote.rs:332][E: codex-rs/app-server-client/src/remote.rs:334][E: codex-rs/app-server-client/src/remote.rs:346][E: codex-rs/app-server-client/src/remote.rs:348]。
7. test client initialize 发送 `ClientRequest::Initialize`，等待 initialize response，再发送 `initialized` notification；debug client initialize 也遵循同一 handshake [E: codex-rs/app-server-test-client/src/lib.rs:1547][E: codex-rs/app-server-test-client/src/lib.rs:1567][E: codex-rs/app-server-test-client/src/lib.rs:1570][E: codex-rs/app-server-test-client/src/lib.rs:1574][E: codex-rs/debug-client/src/client.rs:96][E: codex-rs/debug-client/src/client.rs:111][E: codex-rs/debug-client/src/client.rs:112][E: codex-rs/debug-client/src/client.rs:115][E: codex-rs/debug-client/src/client.rs:116]。

## 设计动机与权衡

- `server_notification_requires_delivery` 把 `TurnCompleted`、`ItemCompleted`、assistant/plan/reasoning deltas 定为 lossless tier，因为注释说明丢这些事件会破坏可见 assistant output 或让 UI 永远等 completion [E: codex-rs/app-server-client/src/lib.rs:167][E: codex-rs/app-server-client/src/lib.rs:170][E: codex-rs/app-server-client/src/lib.rs:171][E: codex-rs/app-server-client/src/lib.rs:172][E: codex-rs/app-server-client/src/lib.rs:173][E: codex-rs/app-server-client/src/lib.rs:174][E: codex-rs/app-server-client/src/lib.rs:178][E: codex-rs/app-server-client/src/lib.rs:181][E: codex-rs/app-server-client/src/lib.rs:182][E: codex-rs/app-server-client/src/lib.rs:183][E: codex-rs/app-server-client/src/lib.rs:184][E: codex-rs/app-server-client/src/lib.rs:185][E: codex-rs/app-server-client/src/lib.rs:186]。
- remote auth token 只允许 `wss://` 或 loopback `ws://`；避免 bearer token 通过非安全远程 ws 发送是从该拒绝条件和错误文本得出的推断 [E: codex-rs/app-server-client/src/remote.rs:93][E: codex-rs/app-server-client/src/remote.rs:95][E: codex-rs/app-server-client/src/remote.rs:96][E: codex-rs/app-server-client/src/remote.rs:97][E: codex-rs/app-server-client/src/remote.rs:98][E: codex-rs/app-server-client/src/remote.rs:149][E: codex-rs/app-server-client/src/remote.rs:153][I]。
- in-process shutdown 先 drop event receiver，再请求 worker shutdown，注释说明这是为了 unblock must-deliver event send，避免 worker 卡在 event delivery 而无法关闭 runtime [E: codex-rs/app-server-client/src/lib.rs:749][E: codex-rs/app-server-client/src/lib.rs:750][E: codex-rs/app-server-client/src/lib.rs:751][E: codex-rs/app-server-client/src/lib.rs:752][E: codex-rs/app-server-client/src/lib.rs:753]。

## gotcha

- in-process client 显式拒绝 `ChatgptAuthTokensRefresh` server request，错误消息说明 token refresh 不支持 in-process app-server clients [E: codex-rs/app-server-client/src/lib.rs:534][E: codex-rs/app-server-client/src/lib.rs:535][E: codex-rs/app-server-client/src/lib.rs:538][E: codex-rs/app-server-client/src/lib.rs:542]。
- remote `next_event` 先返回 initialize 期间缓存的 pending events，再读 event channel；initialize 阶段的 notifications/server requests 会先进入 `pending_events` [E: codex-rs/app-server-client/src/remote.rs:189][E: codex-rs/app-server-client/src/remote.rs:595][E: codex-rs/app-server-client/src/remote.rs:598][E: codex-rs/app-server-client/src/remote.rs:711][E: codex-rs/app-server-client/src/remote.rs:713][E: codex-rs/app-server-client/src/remote.rs:716][E: codex-rs/app-server-client/src/remote.rs:721]。
- debug reader 默认不 auto-approve command/file approvals；`--auto-approve` 默认为 false，false 会把 command/file approval decision 设成 `Decline`，true 才设成 `Accept` [E: codex-rs/debug-client/src/main.rs:47][E: codex-rs/debug-client/src/main.rs:48][E: codex-rs/debug-client/src/reader.rs:45][E: codex-rs/debug-client/src/reader.rs:46][E: codex-rs/debug-client/src/reader.rs:48][E: codex-rs/debug-client/src/reader.rs:50][E: codex-rs/debug-client/src/reader.rs:51][E: codex-rs/debug-client/src/reader.rs:53]。

## Sources

- `codex-rs/app-server-client/src`
- `codex-rs/app-server-test-client/src`
- `codex-rs/debug-client/src`

## 相关

- `subsys.app-server.transport`
- `subsys.app-server.session-management`
- `subsys.tui.architecture`
