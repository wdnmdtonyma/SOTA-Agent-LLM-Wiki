---
id: subsys.app-server.client-libs
title: App-server 客户端库
kind: subsystem
tier: T2
source: [codex-rs/app-server/src/in_process.rs, codex-rs/app-server-client/src, codex-rs/app-server-test-client/src]
symbols: [run_outbound_router, InProcessAppServerClient, RemoteAppServerClient, RemoteAppServerEndpoint, AppServerClient, app-server-client::CodexClient]
related: [subsys.app-server.transport, subsys.app-server.session-management, subsys.tui.architecture]
evidence: explicit
status: verified
updated: 1cc7e23612
---

app-server client libraries 提供两层客户端：`codex-app-server-client` facade 同时支持 in-process 与 remote endpoints，remote endpoint 可以是 WebSocket URL 或 Unix socket；`app-server-test-client` 既可以 spawn stdio app-server，也可以连接现有 WebSocket server。[E: codex-rs/app-server-client/src/lib.rs:345][E: codex-rs/app-server-client/src/lib.rs:346][E: codex-rs/app-server-client/src/lib.rs:347][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:74][E: codex-rs/app-server-client/src/remote.rs:78][I] 旧独立调试客户端 crate 不在当前 source tree 中 [I]。

## 能回答的问题

- TUI/exec 这类嵌入客户端如何用 in-process app-server 而不直接碰 core runtime。
- remote endpoint 如何通过 WebSocket URL 或 Unix socket 完成 initialize、发送 request、接收 response/notification/server request。
- event backpressure 下哪些通知必须 lossless，哪些可以 best-effort。
- test client 如何自动处理 command/file approval request。

## 职责边界

- `codex-app-server-client` 是 typed async facade；`AppServerClient` 同时包装 in-process 与 remote 客户端，in-process `request()` 走 command channel，`start()` 把 request 等待放到 detached task 以免阻塞 event drain。[E: codex-rs/app-server-client/src/lib.rs:345][E: codex-rs/app-server-client/src/lib.rs:355][E: codex-rs/app-server-client/src/lib.rs:479][E: codex-rs/app-server-client/src/lib.rs:378]
- remote client transport owns the remote initialize/initialized handshake, JSON-RPC request/response routing, server-request resolution, and notification streaming; remote connections always carry WebSocket frames over either TCP WebSocket URLs or local Unix sockets。[E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:74][E: codex-rs/app-server-client/src/remote.rs:78][E: codex-rs/app-server-client/src/remote.rs:180][E: codex-rs/app-server-client/src/remote.rs:204][E: codex-rs/app-server-client/src/remote.rs:212][E: codex-rs/app-server-client/src/remote.rs:195][E: codex-rs/app-server-client/src/remote.rs:248][E: codex-rs/app-server-client/src/remote.rs:270][E: codex-rs/app-server-client/src/remote.rs:302][E: codex-rs/app-server-client/src/remote.rs:314][E: codex-rs/app-server-client/src/remote.rs:330][E: codex-rs/app-server-client/src/remote.rs:622][E: codex-rs/app-server-client/src/remote.rs:817][E: codex-rs/app-server-client/src/remote.rs:958]
- `app-server-test-client` 的 `Endpoint` 在 `SpawnCodex(PathBuf)` 与 `ConnectWs(String)` 之间选择；`--codex-bin` 与 `--url` 互斥，都未传时默认连接 loopback WebSocket。[E: codex-rs/app-server-test-client/src/lib.rs:557][E: codex-rs/app-server-test-client/src/lib.rs:558][E: codex-rs/app-server-test-client/src/lib.rs:559][E: codex-rs/app-server-test-client/src/lib.rs:567][E: codex-rs/app-server-test-client/src/lib.rs:568][E: codex-rs/app-server-test-client/src/lib.rs:569][E: codex-rs/app-server-test-client/src/lib.rs:577]
- stdio endpoint 通过 `codex_bin app-server` 启动 child process 并接管 stdin/stdout；WebSocket endpoint 走 `tungstenite::connect` 连接现有 server。[E: codex-rs/app-server-test-client/src/lib.rs:1616][E: codex-rs/app-server-test-client/src/lib.rs:1619][E: codex-rs/app-server-test-client/src/lib.rs:1620][E: codex-rs/app-server-test-client/src/lib.rs:1649][E: codex-rs/app-server-test-client/src/lib.rs:1650][E: codex-rs/app-server-test-client/src/lib.rs:1651][E: codex-rs/app-server-test-client/src/lib.rs:1652][E: codex-rs/app-server-test-client/src/lib.rs:1653][E: codex-rs/app-server-test-client/src/lib.rs:1654][E: codex-rs/app-server-test-client/src/lib.rs:1688][E: codex-rs/app-server-test-client/src/lib.rs:1692]

## 关键 crate/文件

- `codex-rs/app-server/src/in_process.rs`: embedded runtime, explicit outbound-router shutdown, processor drain and timeout handling。
- `codex-rs/app-server-client/src/lib.rs`: in-process facade, common event model, unified client enum, request typed helpers。
- `codex-rs/app-server-client/src/remote.rs`: remote WebSocket-frame client over TCP WebSocket or local Unix socket。
- `codex-rs/app-server-test-client/src/lib.rs`: manual/E2E CLI harness。

## 数据模型

- `AppServerEvent` 统一表示 `Lagged`, `ServerNotification`, `ServerRequest`, `Disconnected` [E: codex-rs/app-server-client/src/lib.rs:98][E: codex-rs/app-server-client/src/lib.rs:99][E: codex-rs/app-server-client/src/lib.rs:100][E: codex-rs/app-server-client/src/lib.rs:101][E: codex-rs/app-server-client/src/lib.rs:102]。
- `InProcessClientStartArgs` 包含 arg0 dispatch paths、config/loader overrides、cloud config bundle、feedback/log/state DB、environment manager、config warnings、session source、API key env 开关、client identity/capabilities、MCP elicitation 开关和 channel capacity。[E: codex-rs/app-server-client/src/lib.rs:196][E: codex-rs/app-server-client/src/lib.rs:198][E: codex-rs/app-server-client/src/lib.rs:230][E: codex-rs/app-server-client/src/lib.rs:232][E: codex-rs/app-server-client/src/lib.rs:236]
- `RemoteAppServerEndpoint` is either `WebSocket { websocket_url, auth_token }` or `UnixSocket { socket_path }`; `RemoteAppServerConnectArgs` stores that endpoint plus client name/version, experimental API flag, MCP elicitation flag, notification opt-outs, and channel capacity [E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:74][E: codex-rs/app-server-client/src/remote.rs:78][E: codex-rs/app-server-client/src/remote.rs:84][E: codex-rs/app-server-client/src/remote.rs:88][E: codex-rs/app-server-client/src/remote.rs:89][E: codex-rs/app-server-client/src/remote.rs:91]。
- `AppServerClient` enum wraps in-process and remote clients behind one API。[E: codex-rs/app-server-client/src/lib.rs:345][E: codex-rs/app-server-client/src/lib.rs:346][E: codex-rs/app-server-client/src/lib.rs:347]

## 控制流

1. in-process client start builds initialize params from caller metadata, converts startup args into `InProcessStartArgs`, calls `codex_app_server::in_process::start`, then creates command and unbounded event channels for the facade worker [E: codex-rs/app-server-client/src/lib.rs:355][E: codex-rs/app-server-client/src/lib.rs:358][E: codex-rs/app-server-client/src/lib.rs:360][E: codex-rs/app-server-client/src/lib.rs:365]。
2. in-process worker spawns request commands onto detached tasks, so the worker loop can keep draining runtime events while a request waits for client input [E: codex-rs/app-server-client/src/lib.rs:373][E: codex-rs/app-server-client/src/lib.rs:378]。
3. facade 把 runtime event 写进 unbounded local queue；embedded runtime 才对 must-deliver notification 用 `send().await`、对其余 notification 用 `try_send` 并在满队列时 drop，server request 入队失败则回写 overload/internal error。[E: codex-rs/app-server-client/src/lib.rs:365][E: codex-rs/app-server-client/src/lib.rs:454][E: codex-rs/app-server/src/in_process.rs:114][E: codex-rs/app-server/src/in_process.rs:712][E: codex-rs/app-server/src/in_process.rs:743][E: codex-rs/app-server/src/in_process.rs:754][E: codex-rs/app-server/src/in_process.rs:759]。
4. embedded runtime cannot infer outbound shutdown from channel closure because detached processor work can outlive the main loop; it explicitly signals `run_outbound_router`, then applies bounded waits and aborts stuck processor/router tasks before acknowledging shutdown [E: codex-rs/app-server/src/in_process.rs:405][E: codex-rs/app-server/src/in_process.rs:415][E: codex-rs/app-server/src/in_process.rs:487][E: codex-rs/app-server/src/in_process.rs:789][E: codex-rs/app-server/src/in_process.rs:794][E: codex-rs/app-server/src/in_process.rs:795][E: codex-rs/app-server/src/in_process.rs:800][I]。
5. remote connect branches by endpoint: WebSocket endpoints run URL/auth-token validation and TCP websocket connect; Unix socket endpoints connect to the socket and upgrade using a local WebSocket handshake; both paths then call `connect_with_stream` with shared initialize params。[E: codex-rs/app-server-client/src/remote.rs:171][E: codex-rs/app-server-client/src/remote.rs:180][E: codex-rs/app-server-client/src/remote.rs:202][E: codex-rs/app-server-client/src/remote.rs:203][E: codex-rs/app-server-client/src/remote.rs:209][E: codex-rs/app-server-client/src/remote.rs:210][E: codex-rs/app-server-client/src/remote.rs:212][E: codex-rs/app-server-client/src/remote.rs:214][E: codex-rs/app-server-client/src/remote.rs:182][E: codex-rs/app-server-client/src/remote.rs:717][E: codex-rs/app-server-client/src/remote.rs:707][E: codex-rs/app-server-client/src/remote.rs:731][E: codex-rs/app-server-client/src/remote.rs:758][E: codex-rs/app-server-client/src/remote.rs:773][E: codex-rs/app-server-client/src/remote.rs:794]
6. remote initialize writes `ClientRequest::Initialize`, loops until the matching initialize response or error, buffers notifications/server requests that arrive during initialize, then sends `initialized` notification [E: codex-rs/app-server-client/src/remote.rs:826][E: codex-rs/app-server-client/src/remote.rs:830][E: codex-rs/app-server-client/src/remote.rs:832][E: codex-rs/app-server-client/src/remote.rs:840][E: codex-rs/app-server-client/src/remote.rs:850][E: codex-rs/app-server-client/src/remote.rs:868][E: codex-rs/app-server-client/src/remote.rs:888][E: codex-rs/app-server-client/src/remote.rs:952][E: codex-rs/app-server-client/src/remote.rs:956]。
7. remote worker keeps a pending request map; it rejects duplicate request ids, resolves pending senders on response/error, delivers notifications as `AppServerEvent`, and turns unknown server requests into JSON-RPC method-not-found errors back to the server [E: codex-rs/app-server-client/src/remote.rs:253][E: codex-rs/app-server-client/src/remote.rs:257][E: codex-rs/app-server-client/src/remote.rs:270][E: codex-rs/app-server-client/src/remote.rs:276][E: codex-rs/app-server-client/src/remote.rs:364][E: codex-rs/app-server-client/src/remote.rs:365][E: codex-rs/app-server-client/src/remote.rs:389][E: codex-rs/app-server-client/src/remote.rs:400][E: codex-rs/app-server-client/src/remote.rs:404]。
8. test client initialize sends `ClientRequest::Initialize`, waits for `InitializeResponse`, then sends an `initialized` JSON-RPC notification to complete handshake。[E: codex-rs/app-server-test-client/src/lib.rs:1737][E: codex-rs/app-server-test-client/src/lib.rs:1745][E: codex-rs/app-server-test-client/src/lib.rs:1746][E: codex-rs/app-server-test-client/src/lib.rs:1765][E: codex-rs/app-server-test-client/src/lib.rs:1773][E: codex-rs/app-server-test-client/src/lib.rs:1775]
9. test client 的 login harness 支持 ChatGPT browser/device code 与 Amazon Bedrock API key + region，Bedrock completion 以无 login-id 的 completion 通知匹配；它也新增 logout 并等待 `account/updated`。[E: codex-rs/app-server-test-client/src/lib.rs:1165][E: codex-rs/app-server-test-client/src/lib.rs:1174][E: codex-rs/app-server-test-client/src/lib.rs:1177][E: codex-rs/app-server-test-client/src/lib.rs:1182][E: codex-rs/app-server-test-client/src/lib.rs:1192][E: codex-rs/app-server-test-client/src/lib.rs:1193][E: codex-rs/app-server-test-client/src/lib.rs:1264][E: codex-rs/app-server-test-client/src/lib.rs:1269][E: codex-rs/app-server-test-client/src/lib.rs:1272][E: codex-rs/app-server-test-client/src/lib.rs:1274]

## 设计动机与权衡

- in-process event consumption 现在用 unbounded local event queue，避免 unread lossless notifications 堵住 request processing。[E: codex-rs/app-server-client/src/lib.rs:365][E: codex-rs/app-server-client/src/lib.rs:454]
- WebSocket remote auth token is allowed only for `wss://` or loopback `ws://`; this avoids sending bearer tokens over non-secure remote websocket URLs [E: codex-rs/app-server-client/src/remote.rs:114][E: codex-rs/app-server-client/src/remote.rs:119][E: codex-rs/app-server-client/src/remote.rs:120][E: codex-rs/app-server-client/src/remote.rs:121][E: codex-rs/app-server-client/src/remote.rs:705][E: codex-rs/app-server-client/src/remote.rs:709][I]。
- in-process shutdown drops the caller-facing event receiver before requesting worker shutdown, so pending event sends cannot block the runtime shutdown path。[E: codex-rs/app-server-client/src/lib.rs:609][E: codex-rs/app-server-client/src/lib.rs:617][E: codex-rs/app-server-client/src/lib.rs:620]

## gotcha

- in-process client rejects `ChatgptAuthTokensRefresh` server requests because token refresh is not supported for in-process app-server clients [E: codex-rs/app-server-client/src/lib.rs:434][E: codex-rs/app-server-client/src/lib.rs:435][E: codex-rs/app-server-client/src/lib.rs:438][E: codex-rs/app-server-client/src/lib.rs:442]。
- remote `next_event` returns initialize-time `pending_events` before reading the live event channel, so notifications/server requests received before initialize completed are not lost。[E: codex-rs/app-server-client/src/remote.rs:622][E: codex-rs/app-server-client/src/remote.rs:625][E: codex-rs/app-server-client/src/remote.rs:626][E: codex-rs/app-server-client/src/remote.rs:627][E: codex-rs/app-server-client/src/remote.rs:878][E: codex-rs/app-server-client/src/remote.rs:882][E: codex-rs/app-server-client/src/remote.rs:890]
- test client supports command/file approval plus interactive `ToolRequestUserInput`；command approval 默认 `AlwaysAccept` 但可在指定序号返回 `Cancel`，file approval 始终 `Accept`。[E: codex-rs/app-server-test-client/src/lib.rs:2141][E: codex-rs/app-server-test-client/src/lib.rs:2148][E: codex-rs/app-server-test-client/src/lib.rs:2150][E: codex-rs/app-server-test-client/src/lib.rs:2153][E: codex-rs/app-server-test-client/src/lib.rs:2155][E: codex-rs/app-server-test-client/src/lib.rs:2227][E: codex-rs/app-server-test-client/src/lib.rs:2230][E: codex-rs/app-server-test-client/src/lib.rs:2231][E: codex-rs/app-server-test-client/src/lib.rs:2232][E: codex-rs/app-server-test-client/src/lib.rs:2245][E: codex-rs/app-server-test-client/src/lib.rs:2269][E: codex-rs/app-server-test-client/src/lib.rs:2272][E: codex-rs/app-server-test-client/src/lib.rs:2273]
- test client 把 `account/login/start` 的 `apiKey` 只在 pretty-printed request 副本中替换为 `<redacted>`，原始 JSON-RPC payload 仍发送真实 key；不要用 request logging 泄露 Bedrock credential。[E: codex-rs/app-server-test-client/src/lib.rs:2055][E: codex-rs/app-server-test-client/src/lib.rs:2060][E: codex-rs/app-server-test-client/src/lib.rs:2062][E: codex-rs/app-server-test-client/src/lib.rs:2063][E: codex-rs/app-server-test-client/src/lib.rs:2069]

## Sources

- `codex-rs/app-server/src/in_process.rs`
- `codex-rs/app-server-client/src`
- `codex-rs/app-server-test-client/src`

## 相关

- `subsys.app-server.transport`
- `subsys.app-server.session-management`
- `subsys.tui.architecture`
