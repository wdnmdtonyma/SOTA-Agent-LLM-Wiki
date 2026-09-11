---
id: subsys.app-server.client-libs
title: App-server 客户端库
kind: subsystem
tier: T2
source:
  - codex-rs/app-server/src/in_process.rs
  - codex-rs/app-server-client/src
  - codex-rs/app-server-test-client/src
symbols:
  - run_outbound_router
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
updated: 02a8f038b8
---

app-server client libraries 提供两层客户端：`codex-app-server-client` facade 同时支持 in-process 与 remote endpoints，remote endpoint 可以是 WebSocket URL 或 Unix socket；`app-server-test-client` 既可以 spawn stdio app-server，也可以连接现有 WebSocket server。[E: codex-rs/app-server-client/src/lib.rs:317][E: codex-rs/app-server-client/src/lib.rs:318][E: codex-rs/app-server-client/src/lib.rs:319][E: codex-rs/app-server-client/src/remote.rs:72][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:77][I] 旧独立调试客户端 crate 不在当前 source tree 中 [I]。

## 能回答的问题

- TUI/exec 这类嵌入客户端如何用 in-process app-server 而不直接碰 core runtime。
- remote endpoint 如何通过 WebSocket URL 或 Unix socket 完成 initialize、发送 request、接收 response/notification/server request。
- event backpressure 下哪些通知必须 lossless，哪些可以 best-effort。
- test client 如何自动处理 command/file approval request。

## 职责边界

- `codex-app-server-client` 是 typed async facade；`AppServerClient` 同时包装 in-process 与 remote 客户端，in-process `request()` 走 command channel，`start()` 把 request 等待放到 detached task 以免阻塞 event drain。[E: codex-rs/app-server-client/src/lib.rs:317][E: codex-rs/app-server-client/src/lib.rs:327][E: codex-rs/app-server-client/src/lib.rs:451][E: codex-rs/app-server-client/src/lib.rs:350]
- remote client transport owns the remote initialize/initialized handshake, JSON-RPC request/response routing, server-request resolution, and notification streaming; remote connections always carry WebSocket frames over either TCP WebSocket URLs or local Unix sockets。[E: codex-rs/app-server-client/src/remote.rs:72][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:77][E: codex-rs/app-server-client/src/remote.rs:178][E: codex-rs/app-server-client/src/remote.rs:202][E: codex-rs/app-server-client/src/remote.rs:210][E: codex-rs/app-server-client/src/remote.rs:193][E: codex-rs/app-server-client/src/remote.rs:246][E: codex-rs/app-server-client/src/remote.rs:268][E: codex-rs/app-server-client/src/remote.rs:300][E: codex-rs/app-server-client/src/remote.rs:312][E: codex-rs/app-server-client/src/remote.rs:328][E: codex-rs/app-server-client/src/remote.rs:633][E: codex-rs/app-server-client/src/remote.rs:841][E: codex-rs/app-server-client/src/remote.rs:982]
- `app-server-test-client` 的 `Endpoint` 在 `SpawnCodex(PathBuf)` 与 `ConnectWs(String)` 之间选择；`--codex-bin` 与 `--url` 互斥，都未传时默认连接 loopback WebSocket。[E: codex-rs/app-server-test-client/src/lib.rs:557][E: codex-rs/app-server-test-client/src/lib.rs:558][E: codex-rs/app-server-test-client/src/lib.rs:559][E: codex-rs/app-server-test-client/src/lib.rs:567][E: codex-rs/app-server-test-client/src/lib.rs:568][E: codex-rs/app-server-test-client/src/lib.rs:569][E: codex-rs/app-server-test-client/src/lib.rs:577]
- stdio endpoint 通过 `codex_bin app-server` 启动 child process 并接管 stdin/stdout；WebSocket endpoint 走 `tungstenite::connect` 连接现有 server。[E: codex-rs/app-server-test-client/src/lib.rs:1616][E: codex-rs/app-server-test-client/src/lib.rs:1619][E: codex-rs/app-server-test-client/src/lib.rs:1620][E: codex-rs/app-server-test-client/src/lib.rs:1649][E: codex-rs/app-server-test-client/src/lib.rs:1650][E: codex-rs/app-server-test-client/src/lib.rs:1651][E: codex-rs/app-server-test-client/src/lib.rs:1652][E: codex-rs/app-server-test-client/src/lib.rs:1653][E: codex-rs/app-server-test-client/src/lib.rs:1654][E: codex-rs/app-server-test-client/src/lib.rs:1688][E: codex-rs/app-server-test-client/src/lib.rs:1692]

## 关键 crate/文件

- `codex-rs/app-server/src/in_process.rs`: embedded runtime, explicit outbound-router shutdown, processor drain and timeout handling。
- `codex-rs/app-server-client/src/lib.rs`: in-process facade, common event model, unified client enum, request typed helpers。
- `codex-rs/app-server-client/src/remote.rs`: remote WebSocket-frame client over TCP WebSocket or local Unix socket。
- `codex-rs/app-server-test-client/src/lib.rs`: manual/E2E CLI harness。

## 数据模型

- `AppServerEvent` 统一表示 `Lagged`, `ServerNotification`, `ServerRequest`, `Disconnected` [E: codex-rs/app-server-client/src/lib.rs:97][E: codex-rs/app-server-client/src/lib.rs:98][E: codex-rs/app-server-client/src/lib.rs:99][E: codex-rs/app-server-client/src/lib.rs:100][E: codex-rs/app-server-client/src/lib.rs:101]。
- `InProcessClientStartArgs` 包含 arg0 dispatch paths、config/loader overrides、cloud config bundle、feedback/log/state DB、environment manager、config warnings、session source、API key env 开关、client identity/capabilities、MCP elicitation 开关和 channel capacity。[E: codex-rs/app-server-client/src/lib.rs:172][E: codex-rs/app-server-client/src/lib.rs:174][E: codex-rs/app-server-client/src/lib.rs:204][E: codex-rs/app-server-client/src/lib.rs:206][E: codex-rs/app-server-client/src/lib.rs:210]
- `RemoteAppServerEndpoint` is either `WebSocket { websocket_url, auth_token }` or `UnixSocket { socket_path }`; `RemoteAppServerConnectArgs` stores that endpoint plus client name/version, experimental API flag, MCP elicitation flag, notification opt-outs, and channel capacity [E: codex-rs/app-server-client/src/remote.rs:72][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:77][E: codex-rs/app-server-client/src/remote.rs:83][E: codex-rs/app-server-client/src/remote.rs:87][E: codex-rs/app-server-client/src/remote.rs:88][E: codex-rs/app-server-client/src/remote.rs:90]。
- `AppServerClient` enum wraps in-process and remote clients behind one API。[E: codex-rs/app-server-client/src/lib.rs:317][E: codex-rs/app-server-client/src/lib.rs:318][E: codex-rs/app-server-client/src/lib.rs:319]

## 控制流

1. in-process client start builds initialize params from caller metadata, converts startup args into `InProcessStartArgs`, calls `codex_app_server::in_process::start`, then creates command and unbounded event channels for the facade worker [E: codex-rs/app-server-client/src/lib.rs:327][E: codex-rs/app-server-client/src/lib.rs:330][E: codex-rs/app-server-client/src/lib.rs:332][E: codex-rs/app-server-client/src/lib.rs:337]。
2. in-process worker spawns request commands onto detached tasks, so the worker loop can keep draining runtime events while a request waits for client input [E: codex-rs/app-server-client/src/lib.rs:345][E: codex-rs/app-server-client/src/lib.rs:350]。
3. facade 把 runtime event 写进 unbounded local queue；embedded runtime 才对 must-deliver notification 用 `send().await`、对其余 notification 用 `try_send` 并在满队列时 drop，server request 入队失败则回写 overload/internal error。[E: codex-rs/app-server-client/src/lib.rs:337][E: codex-rs/app-server-client/src/lib.rs:426][E: codex-rs/app-server/src/in_process.rs:111][E: codex-rs/app-server/src/in_process.rs:693][E: codex-rs/app-server/src/in_process.rs:724][E: codex-rs/app-server/src/in_process.rs:735][E: codex-rs/app-server/src/in_process.rs:740]。
4. embedded runtime cannot infer outbound shutdown from channel closure because detached processor work can outlive the main loop; it explicitly signals `run_outbound_router`, then applies bounded waits and aborts stuck processor/router tasks before acknowledging shutdown [E: codex-rs/app-server/src/in_process.rs:400][E: codex-rs/app-server/src/in_process.rs:410][E: codex-rs/app-server/src/in_process.rs:459][E: codex-rs/app-server/src/in_process.rs:770][E: codex-rs/app-server/src/in_process.rs:775][E: codex-rs/app-server/src/in_process.rs:776][E: codex-rs/app-server/src/in_process.rs:781][I]。
5. remote connect branches by endpoint: WebSocket endpoints run URL/auth-token validation and TCP websocket connect; Unix socket endpoints connect to the socket and upgrade using a local WebSocket handshake; both paths then call `connect_with_stream` with shared initialize params。[E: codex-rs/app-server-client/src/remote.rs:169][E: codex-rs/app-server-client/src/remote.rs:178][E: codex-rs/app-server-client/src/remote.rs:200][E: codex-rs/app-server-client/src/remote.rs:201][E: codex-rs/app-server-client/src/remote.rs:207][E: codex-rs/app-server-client/src/remote.rs:208][E: codex-rs/app-server-client/src/remote.rs:210][E: codex-rs/app-server-client/src/remote.rs:212][E: codex-rs/app-server-client/src/remote.rs:180][E: codex-rs/app-server-client/src/remote.rs:717][E: codex-rs/app-server-client/src/remote.rs:731][E: codex-rs/app-server-client/src/remote.rs:755][E: codex-rs/app-server-client/src/remote.rs:782][E: codex-rs/app-server-client/src/remote.rs:797][E: codex-rs/app-server-client/src/remote.rs:818]
6. remote initialize writes `ClientRequest::Initialize`, loops until the matching initialize response or error, buffers notifications/server requests that arrive during initialize, then sends `initialized` notification [E: codex-rs/app-server-client/src/remote.rs:850][E: codex-rs/app-server-client/src/remote.rs:854][E: codex-rs/app-server-client/src/remote.rs:856][E: codex-rs/app-server-client/src/remote.rs:864][E: codex-rs/app-server-client/src/remote.rs:874][E: codex-rs/app-server-client/src/remote.rs:892][E: codex-rs/app-server-client/src/remote.rs:912][E: codex-rs/app-server-client/src/remote.rs:976][E: codex-rs/app-server-client/src/remote.rs:980]。
7. remote worker keeps a pending request map; it rejects duplicate request ids, resolves pending senders on response/error, delivers notifications as `AppServerEvent`, and turns unknown server requests into JSON-RPC method-not-found errors back to the server [E: codex-rs/app-server-client/src/remote.rs:251][E: codex-rs/app-server-client/src/remote.rs:255][E: codex-rs/app-server-client/src/remote.rs:268][E: codex-rs/app-server-client/src/remote.rs:274][E: codex-rs/app-server-client/src/remote.rs:362][E: codex-rs/app-server-client/src/remote.rs:363][E: codex-rs/app-server-client/src/remote.rs:387][E: codex-rs/app-server-client/src/remote.rs:398][E: codex-rs/app-server-client/src/remote.rs:402]。
8. test client initialize sends `ClientRequest::Initialize`, waits for `InitializeResponse`, then sends an `initialized` JSON-RPC notification to complete handshake。[E: codex-rs/app-server-test-client/src/lib.rs:1737][E: codex-rs/app-server-test-client/src/lib.rs:1745][E: codex-rs/app-server-test-client/src/lib.rs:1746][E: codex-rs/app-server-test-client/src/lib.rs:1764][E: codex-rs/app-server-test-client/src/lib.rs:1772][E: codex-rs/app-server-test-client/src/lib.rs:1774]
9. test client 的 login harness 支持 ChatGPT browser/device code 与 Amazon Bedrock API key + region，Bedrock completion 以无 login-id 的 completion 通知匹配；它也新增 logout 并等待 `account/updated`。[E: codex-rs/app-server-test-client/src/lib.rs:1165][E: codex-rs/app-server-test-client/src/lib.rs:1174][E: codex-rs/app-server-test-client/src/lib.rs:1177][E: codex-rs/app-server-test-client/src/lib.rs:1182][E: codex-rs/app-server-test-client/src/lib.rs:1192][E: codex-rs/app-server-test-client/src/lib.rs:1193][E: codex-rs/app-server-test-client/src/lib.rs:1264][E: codex-rs/app-server-test-client/src/lib.rs:1269][E: codex-rs/app-server-test-client/src/lib.rs:1272][E: codex-rs/app-server-test-client/src/lib.rs:1274]

## 设计动机与权衡

- in-process event consumption 现在用 unbounded local event queue，避免 unread lossless notifications 堵住 request processing。[E: codex-rs/app-server-client/src/lib.rs:337][E: codex-rs/app-server-client/src/lib.rs:426]
- WebSocket remote auth token is allowed only for `wss://` or loopback `ws://`; this avoids sending bearer tokens over non-secure remote websocket URLs [E: codex-rs/app-server-client/src/remote.rs:112][E: codex-rs/app-server-client/src/remote.rs:117][E: codex-rs/app-server-client/src/remote.rs:118][E: codex-rs/app-server-client/src/remote.rs:119][E: codex-rs/app-server-client/src/remote.rs:729][E: codex-rs/app-server-client/src/remote.rs:733][I]。
- in-process shutdown drops the caller-facing event receiver before requesting worker shutdown, so pending event sends cannot block the runtime shutdown path。[E: codex-rs/app-server-client/src/lib.rs:594][E: codex-rs/app-server-client/src/lib.rs:602][E: codex-rs/app-server-client/src/lib.rs:605]

## gotcha

- in-process client rejects `ChatgptAuthTokensRefresh` server requests because token refresh is not supported for in-process app-server clients [E: codex-rs/app-server-client/src/lib.rs:406][E: codex-rs/app-server-client/src/lib.rs:407][E: codex-rs/app-server-client/src/lib.rs:410][E: codex-rs/app-server-client/src/lib.rs:414]。
- remote `next_event` returns initialize-time `pending_events` before reading the live event channel, so notifications/server requests received before initialize completed are not lost。[E: codex-rs/app-server-client/src/remote.rs:633][E: codex-rs/app-server-client/src/remote.rs:636][E: codex-rs/app-server-client/src/remote.rs:637][E: codex-rs/app-server-client/src/remote.rs:638][E: codex-rs/app-server-client/src/remote.rs:902][E: codex-rs/app-server-client/src/remote.rs:906][E: codex-rs/app-server-client/src/remote.rs:914]
- test client supports command/file approval plus interactive `ToolRequestUserInput`；command approval 默认 `AlwaysAccept` 但可在指定序号返回 `Cancel`，file approval 始终 `Accept`。[E: codex-rs/app-server-test-client/src/lib.rs:2140][E: codex-rs/app-server-test-client/src/lib.rs:2147][E: codex-rs/app-server-test-client/src/lib.rs:2149][E: codex-rs/app-server-test-client/src/lib.rs:2152][E: codex-rs/app-server-test-client/src/lib.rs:2154][E: codex-rs/app-server-test-client/src/lib.rs:2226][E: codex-rs/app-server-test-client/src/lib.rs:2229][E: codex-rs/app-server-test-client/src/lib.rs:2230][E: codex-rs/app-server-test-client/src/lib.rs:2231][E: codex-rs/app-server-test-client/src/lib.rs:2244][E: codex-rs/app-server-test-client/src/lib.rs:2268][E: codex-rs/app-server-test-client/src/lib.rs:2271][E: codex-rs/app-server-test-client/src/lib.rs:2272]
- test client 把 `account/login/start` 的 `apiKey` 只在 pretty-printed request 副本中替换为 `<redacted>`，原始 JSON-RPC payload 仍发送真实 key；不要用 request logging 泄露 Bedrock credential。[E: codex-rs/app-server-test-client/src/lib.rs:2054][E: codex-rs/app-server-test-client/src/lib.rs:2059][E: codex-rs/app-server-test-client/src/lib.rs:2061][E: codex-rs/app-server-test-client/src/lib.rs:2062][E: codex-rs/app-server-test-client/src/lib.rs:2068]

## Sources

- `codex-rs/app-server/src/in_process.rs`
- `codex-rs/app-server-client/src`
- `codex-rs/app-server-test-client/src`

## 相关

- `subsys.app-server.transport`
- `subsys.app-server.session-management`
- `subsys.tui.architecture`
