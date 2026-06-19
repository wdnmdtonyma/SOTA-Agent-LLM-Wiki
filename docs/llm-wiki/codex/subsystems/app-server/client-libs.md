---
id: subsys.app-server.client-libs
title: App-server 客户端库
kind: subsystem
tier: T2
source:
  - codex-rs/app-server-client/src
  - codex-rs/app-server-test-client/src
symbols:
  - InProcessAppServerClient
  - RemoteAppServerClient
  - RemoteAppServerEndpoint
  - AppServerClient
  - CodexClient
related:
  - subsys.app-server.transport
  - subsys.app-server.session-management
  - subsys.tui.architecture
evidence: explicit
status: verified
updated: 5670360009
---

app-server client libraries 提供两层客户端：`codex-app-server-client` facade 同时支持 in-process 与 remote endpoints，remote endpoint 可以是 WebSocket URL 或 Unix socket；`app-server-test-client` 既可以 spawn stdio app-server，也可以连接现有 WebSocket server [E: codex-rs/app-server-client/src/lib.rs:469][E: codex-rs/app-server-client/src/lib.rs:470][E: codex-rs/app-server-client/src/lib.rs:471][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:74][E: codex-rs/app-server-client/src/remote.rs:78][E: codex-rs/app-server-test-client/src/lib.rs:118][E: codex-rs/app-server-test-client/src/lib.rs:125][E: codex-rs/app-server-test-client/src/lib.rs:1525][E: codex-rs/app-server-test-client/src/lib.rs:1527][E: codex-rs/app-server-test-client/src/lib.rs:1528]。旧独立调试客户端 crate 不在当前 source tree 中 [I]。

## 能回答的问题

- TUI/exec 这类嵌入客户端如何用 in-process app-server 而不直接碰 core runtime。
- remote endpoint 如何通过 WebSocket URL 或 Unix socket 完成 initialize、发送 request、接收 response/notification/server request。
- event backpressure 下哪些通知必须 lossless，哪些可以 best-effort。
- test client 如何自动处理 command/file approval request。

## 职责边界

- `codex-app-server-client` 是 typed async facade；crate 顶部注释列出 runtime startup、initialize handshake、typed/raw dispatch、server request resolution/rejection、backpressure signaling 和 bounded shutdown [E: codex-rs/app-server-client/src/lib.rs:1][E: codex-rs/app-server-client/src/lib.rs:3][E: codex-rs/app-server-client/src/lib.rs:6][E: codex-rs/app-server-client/src/lib.rs:8][E: codex-rs/app-server-client/src/lib.rs:9][E: codex-rs/app-server-client/src/lib.rs:10][E: codex-rs/app-server-client/src/lib.rs:11]。
- remote client transport owns the remote initialize/initialized handshake, JSON-RPC request/response routing, server-request resolution, and notification streaming; remote connections always carry WebSocket frames over either TCP WebSocket URLs or local Unix sockets [E: codex-rs/app-server-client/src/remote.rs:1][E: codex-rs/app-server-client/src/remote.rs:4][E: codex-rs/app-server-client/src/remote.rs:5][E: codex-rs/app-server-client/src/remote.rs:6][E: codex-rs/app-server-client/src/remote.rs:7]。
- `app-server-test-client` 既可以 spawn `codex app-server` stdio，也可以连接现有 websocket URL [E: codex-rs/app-server-test-client/src/lib.rs:118][E: codex-rs/app-server-test-client/src/lib.rs:116][E: codex-rs/app-server-test-client/src/lib.rs:125][E: codex-rs/app-server-test-client/src/lib.rs:1525][E: codex-rs/app-server-test-client/src/lib.rs:1527][E: codex-rs/app-server-test-client/src/lib.rs:1528]。
- `app-server-test-client` 的 stdio endpoint 通过 `codex_bin app-server` 启动 child process 并接管 stdin/stdout；WebSocket endpoint 走 `tungstenite::connect` 连接现有 server [E: codex-rs/app-server-test-client/src/lib.rs:1532][E: codex-rs/app-server-test-client/src/lib.rs:1542][E: codex-rs/app-server-test-client/src/lib.rs:1557][E: codex-rs/app-server-test-client/src/lib.rs:1558][E: codex-rs/app-server-test-client/src/lib.rs:1559][E: codex-rs/app-server-test-client/src/lib.rs:1560][E: codex-rs/app-server-test-client/src/lib.rs:1565][E: codex-rs/app-server-test-client/src/lib.rs:1569][E: codex-rs/app-server-test-client/src/lib.rs:1596][E: codex-rs/app-server-test-client/src/lib.rs:1600]。

## 关键 crate/文件

- `codex-rs/app-server-client/src/lib.rs`: in-process facade, common event model, unified client enum, request typed helpers。
- `codex-rs/app-server-client/src/remote.rs`: remote WebSocket-frame client over TCP WebSocket or local Unix socket。
- `codex-rs/app-server-test-client/src/lib.rs`: manual/E2E CLI harness。

## 数据模型

- `AppServerEvent` 统一表示 `Lagged`, `ServerNotification`, `ServerRequest`, `Disconnected` [E: codex-rs/app-server-client/src/lib.rs:119][E: codex-rs/app-server-client/src/lib.rs:120][E: codex-rs/app-server-client/src/lib.rs:121][E: codex-rs/app-server-client/src/lib.rs:122][E: codex-rs/app-server-client/src/lib.rs:123][E: codex-rs/app-server-client/src/lib.rs:124]。
- `InProcessClientStartArgs` 包含 arg0 dispatch paths、config、cli overrides、loader overrides、cloud config bundle、feedback、log db、environment manager、config warnings、session source、API key env 开关、client identity、experimental api、opt-out notification methods 和 channel capacity [E: codex-rs/app-server-client/src/lib.rs:320][E: codex-rs/app-server-client/src/lib.rs:322][E: codex-rs/app-server-client/src/lib.rs:324][E: codex-rs/app-server-client/src/lib.rs:326][E: codex-rs/app-server-client/src/lib.rs:328][E: codex-rs/app-server-client/src/lib.rs:332][E: codex-rs/app-server-client/src/lib.rs:334][E: codex-rs/app-server-client/src/lib.rs:336][E: codex-rs/app-server-client/src/lib.rs:338][E: codex-rs/app-server-client/src/lib.rs:340][E: codex-rs/app-server-client/src/lib.rs:342][E: codex-rs/app-server-client/src/lib.rs:344][E: codex-rs/app-server-client/src/lib.rs:346][E: codex-rs/app-server-client/src/lib.rs:348][E: codex-rs/app-server-client/src/lib.rs:350][E: codex-rs/app-server-client/src/lib.rs:352][E: codex-rs/app-server-client/src/lib.rs:354][E: codex-rs/app-server-client/src/lib.rs:356]。
- `RemoteAppServerEndpoint` is either `WebSocket { websocket_url, auth_token }` or `UnixSocket { socket_path }`; `RemoteAppServerConnectArgs` stores that endpoint plus client name/version, experimental API flag, notification opt-outs, and channel capacity [E: codex-rs/app-server-client/src/remote.rs:72][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:74][E: codex-rs/app-server-client/src/remote.rs:75][E: codex-rs/app-server-client/src/remote.rs:76][E: codex-rs/app-server-client/src/remote.rs:78][E: codex-rs/app-server-client/src/remote.rs:79][E: codex-rs/app-server-client/src/remote.rs:83][E: codex-rs/app-server-client/src/remote.rs:84][E: codex-rs/app-server-client/src/remote.rs:85][E: codex-rs/app-server-client/src/remote.rs:86][E: codex-rs/app-server-client/src/remote.rs:87][E: codex-rs/app-server-client/src/remote.rs:88][E: codex-rs/app-server-client/src/remote.rs:89][E: codex-rs/app-server-client/src/remote.rs:90]。
- `AppServerClient` enum wraps in-process and remote clients behind one API; request, typed request, notify, server-request resolve/reject, next-event, and shutdown all dispatch by variant [E: codex-rs/app-server-client/src/lib.rs:469][E: codex-rs/app-server-client/src/lib.rs:470][E: codex-rs/app-server-client/src/lib.rs:471][E: codex-rs/app-server-client/src/lib.rs:860][E: codex-rs/app-server-client/src/lib.rs:862][E: codex-rs/app-server-client/src/lib.rs:863][E: codex-rs/app-server-client/src/lib.rs:867][E: codex-rs/app-server-client/src/lib.rs:872][E: codex-rs/app-server-client/src/lib.rs:873][E: codex-rs/app-server-client/src/lib.rs:877][E: codex-rs/app-server-client/src/lib.rs:879][E: codex-rs/app-server-client/src/lib.rs:880][E: codex-rs/app-server-client/src/lib.rs:884][E: codex-rs/app-server-client/src/lib.rs:890][E: codex-rs/app-server-client/src/lib.rs:891][E: codex-rs/app-server-client/src/lib.rs:895][E: codex-rs/app-server-client/src/lib.rs:901][E: codex-rs/app-server-client/src/lib.rs:902][E: codex-rs/app-server-client/src/lib.rs:906][E: codex-rs/app-server-client/src/lib.rs:908][E: codex-rs/app-server-client/src/lib.rs:909][E: codex-rs/app-server-client/src/lib.rs:913][E: codex-rs/app-server-client/src/lib.rs:915][E: codex-rs/app-server-client/src/lib.rs:916]。

## 控制流

1. in-process client start builds initialize params from caller metadata, converts startup args into `InProcessStartArgs`, calls `codex_app_server::in_process::start`, then creates command and event channels for the facade worker [E: codex-rs/app-server-client/src/lib.rs:368][E: codex-rs/app-server-client/src/lib.rs:389][E: codex-rs/app-server-client/src/lib.rs:390][E: codex-rs/app-server-client/src/lib.rs:392][E: codex-rs/app-server-client/src/lib.rs:407][E: codex-rs/app-server-client/src/lib.rs:480][E: codex-rs/app-server-client/src/lib.rs:482][E: codex-rs/app-server-client/src/lib.rs:483][E: codex-rs/app-server-client/src/lib.rs:485][E: codex-rs/app-server-client/src/lib.rs:486]。
2. in-process worker spawns request commands onto detached tasks, so the worker loop can keep draining runtime events while a request waits for client input [E: codex-rs/app-server-client/src/lib.rs:488][E: codex-rs/app-server-client/src/lib.rs:495][E: codex-rs/app-server-client/src/lib.rs:497][E: codex-rs/app-server-client/src/lib.rs:498][E: codex-rs/app-server-client/src/lib.rs:500][E: codex-rs/app-server-client/src/lib.rs:501]。
3. in-process event forwarding blocks on must-deliver events, uses `try_send` for best-effort events, emits lag markers, and rejects dropped server requests to avoid leaving the server waiting forever [E: codex-rs/app-server-client/src/lib.rs:205][E: codex-rs/app-server-client/src/lib.rs:206][E: codex-rs/app-server-client/src/lib.rs:220][E: codex-rs/app-server-client/src/lib.rs:227][E: codex-rs/app-server-client/src/lib.rs:229][E: codex-rs/app-server-client/src/lib.rs:241][E: codex-rs/app-server-client/src/lib.rs:244][E: codex-rs/app-server-client/src/lib.rs:250][E: codex-rs/app-server-client/src/lib.rs:253][E: codex-rs/app-server-client/src/lib.rs:255]。
4. remote connect branches by endpoint: WebSocket endpoints run URL/auth-token validation and TCP websocket connect; Unix socket endpoints connect to the socket and upgrade using a local WebSocket handshake; both paths then call `connect_with_stream` with shared initialize params [E: codex-rs/app-server-client/src/remote.rs:164][E: codex-rs/app-server-client/src/remote.rs:166][E: codex-rs/app-server-client/src/remote.rs:167][E: codex-rs/app-server-client/src/remote.rs:168][E: codex-rs/app-server-client/src/remote.rs:172][E: codex-rs/app-server-client/src/remote.rs:174][E: codex-rs/app-server-client/src/remote.rs:177][E: codex-rs/app-server-client/src/remote.rs:178][E: codex-rs/app-server-client/src/remote.rs:179][E: codex-rs/app-server-client/src/remote.rs:686][E: codex-rs/app-server-client/src/remote.rs:695][E: codex-rs/app-server-client/src/remote.rs:714][E: codex-rs/app-server-client/src/remote.rs:739][E: codex-rs/app-server-client/src/remote.rs:751][E: codex-rs/app-server-client/src/remote.rs:765]。
5. remote initialize writes `ClientRequest::Initialize`, loops until the matching initialize response or error, buffers notifications/server requests that arrive during initialize, then sends `initialized` notification [E: codex-rs/app-server-client/src/remote.rs:792][E: codex-rs/app-server-client/src/remote.rs:801][E: codex-rs/app-server-client/src/remote.rs:805][E: codex-rs/app-server-client/src/remote.rs:808][E: codex-rs/app-server-client/src/remote.rs:817][E: codex-rs/app-server-client/src/remote.rs:827][E: codex-rs/app-server-client/src/remote.rs:844][E: codex-rs/app-server-client/src/remote.rs:850][E: codex-rs/app-server-client/src/remote.rs:860][E: codex-rs/app-server-client/src/remote.rs:924][E: codex-rs/app-server-client/src/remote.rs:927]。
6. remote worker keeps a pending request map; it rejects duplicate request ids, resolves pending senders on response/error, delivers notifications as `AppServerEvent`, and turns unknown server requests into JSON-RPC method-not-found errors back to the server [E: codex-rs/app-server-client/src/remote.rs:211][E: codex-rs/app-server-client/src/remote.rs:214][E: codex-rs/app-server-client/src/remote.rs:225][E: codex-rs/app-server-client/src/remote.rs:227][E: codex-rs/app-server-client/src/remote.rs:234][E: codex-rs/app-server-client/src/remote.rs:321][E: codex-rs/app-server-client/src/remote.rs:322][E: codex-rs/app-server-client/src/remote.rs:326][E: codex-rs/app-server-client/src/remote.rs:331][E: codex-rs/app-server-client/src/remote.rs:343][E: codex-rs/app-server-client/src/remote.rs:346][E: codex-rs/app-server-client/src/remote.rs:357][E: codex-rs/app-server-client/src/remote.rs:359][E: codex-rs/app-server-client/src/remote.rs:361]。
7. test client initialize sends `ClientRequest::Initialize`, waits for `InitializeResponse`, then sends an `initialized` JSON-RPC notification to complete handshake [E: codex-rs/app-server-test-client/src/lib.rs:1645][E: codex-rs/app-server-test-client/src/lib.rs:1653][E: codex-rs/app-server-test-client/src/lib.rs:1654][E: codex-rs/app-server-test-client/src/lib.rs:1656][E: codex-rs/app-server-test-client/src/lib.rs:1675][E: codex-rs/app-server-test-client/src/lib.rs:1677][E: codex-rs/app-server-test-client/src/lib.rs:1678][E: codex-rs/app-server-test-client/src/lib.rs:1682]。

## 设计动机与权衡

- `server_notification_requires_delivery` defines the lossless tier for completion/transcript-critical notifications; comments explain that dropping these corrupts visible assistant output or leaves surfaces waiting for a completion signal [E: codex-rs/app-server-client/src/lib.rs:155][E: codex-rs/app-server-client/src/lib.rs:156][E: codex-rs/app-server-client/src/lib.rs:157][E: codex-rs/app-server-client/src/lib.rs:161][E: codex-rs/app-server-client/src/lib.rs:163][E: codex-rs/app-server-client/src/lib.rs:166][E: codex-rs/app-server-client/src/lib.rs:167][E: codex-rs/app-server-client/src/lib.rs:168][E: codex-rs/app-server-client/src/lib.rs:170][E: codex-rs/app-server-client/src/lib.rs:171][E: codex-rs/app-server-client/src/lib.rs:172][E: codex-rs/app-server-client/src/lib.rs:173]。
- WebSocket remote auth token is allowed only for `wss://` or loopback `ws://`; this avoids sending bearer tokens over non-secure remote websocket URLs [E: codex-rs/app-server-client/src/remote.rs:115][E: codex-rs/app-server-client/src/remote.rs:117][E: codex-rs/app-server-client/src/remote.rs:118][E: codex-rs/app-server-client/src/remote.rs:119][E: codex-rs/app-server-client/src/remote.rs:120][E: codex-rs/app-server-client/src/remote.rs:686][E: codex-rs/app-server-client/src/remote.rs:687][E: codex-rs/app-server-client/src/remote.rs:690][I]。
- in-process shutdown drops the caller-facing event receiver before requesting worker shutdown; comments say this unblocks pending must-deliver event sends so shutdown can reach the runtime instead of timing out [E: codex-rs/app-server-client/src/lib.rs:748][E: codex-rs/app-server-client/src/lib.rs:752][E: codex-rs/app-server-client/src/lib.rs:759][E: codex-rs/app-server-client/src/lib.rs:760][E: codex-rs/app-server-client/src/lib.rs:761][E: codex-rs/app-server-client/src/lib.rs:763]。

## gotcha

- in-process client rejects `ChatgptAuthTokensRefresh` server requests because token refresh is not supported for in-process app-server clients [E: codex-rs/app-server-client/src/lib.rs:544][E: codex-rs/app-server-client/src/lib.rs:545][E: codex-rs/app-server-client/src/lib.rs:548][E: codex-rs/app-server-client/src/lib.rs:552]。
- remote `next_event` returns initialize-time `pending_events` before reading the live event channel, so notifications/server requests received before initialize completed are not lost [E: codex-rs/app-server-client/src/remote.rs:591][E: codex-rs/app-server-client/src/remote.rs:592][E: codex-rs/app-server-client/src/remote.rs:593][E: codex-rs/app-server-client/src/remote.rs:595][E: codex-rs/app-server-client/src/remote.rs:850][E: codex-rs/app-server-client/src/remote.rs:852][E: codex-rs/app-server-client/src/remote.rs:860]。
- test client only supports command/file approval server requests; command approval defaults to `AlwaysAccept` but can return `Cancel` for a configured approval index, while file approval always responds `Accept` [E: codex-rs/app-server-test-client/src/lib.rs:2031][E: codex-rs/app-server-test-client/src/lib.rs:2035][E: codex-rs/app-server-test-client/src/lib.rs:2036][E: codex-rs/app-server-test-client/src/lib.rs:2039][E: codex-rs/app-server-test-client/src/lib.rs:2042][E: codex-rs/app-server-test-client/src/lib.rs:2112][E: codex-rs/app-server-test-client/src/lib.rs:2113][E: codex-rs/app-server-test-client/src/lib.rs:2114][E: codex-rs/app-server-test-client/src/lib.rs:2115][E: codex-rs/app-server-test-client/src/lib.rs:2117][E: codex-rs/app-server-test-client/src/lib.rs:2154][E: codex-rs/app-server-test-client/src/lib.rs:2155]。

## Sources

- `codex-rs/app-server-client/src`
- `codex-rs/app-server-test-client/src`

## 相关

- `subsys.app-server.transport`
- `subsys.app-server.session-management`
- `subsys.tui.architecture`
