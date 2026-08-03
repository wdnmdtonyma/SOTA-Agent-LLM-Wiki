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
updated: 7750465934
---

app-server client libraries 提供两层客户端：`codex-app-server-client` facade 同时支持 in-process 与 remote endpoints，remote endpoint 可以是 WebSocket URL 或 Unix socket；`app-server-test-client` 既可以 spawn stdio app-server，也可以连接现有 WebSocket server。[E: codex-rs/app-server-client/src/lib.rs:450][E: codex-rs/app-server-client/src/lib.rs:451][E: codex-rs/app-server-client/src/lib.rs:452][E: codex-rs/app-server-client/src/remote.rs:72][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:77][E: codex-rs/app-server-test-client/src/lib.rs:557][E: codex-rs/app-server-test-client/src/lib.rs:558][E: codex-rs/app-server-test-client/src/lib.rs:559] 旧独立调试客户端 crate 不在当前 source tree 中 [I]。

## 能回答的问题

- TUI/exec 这类嵌入客户端如何用 in-process app-server 而不直接碰 core runtime。
- remote endpoint 如何通过 WebSocket URL 或 Unix socket 完成 initialize、发送 request、接收 response/notification/server request。
- event backpressure 下哪些通知必须 lossless，哪些可以 best-effort。
- test client 如何自动处理 command/file approval request。

## 职责边界

- `codex-app-server-client` 是 typed async facade；实际 API 覆盖 runtime startup、typed/raw request 与 notification、server request resolution/rejection、event/backpressure consumption 和 bounded shutdown。[E: codex-rs/app-server-client/src/lib.rs:461][E: codex-rs/app-server-client/src/lib.rs:590][E: codex-rs/app-server-client/src/lib.rs:618][E: codex-rs/app-server-client/src/lib.rs:641][E: codex-rs/app-server-client/src/lib.rs:667][E: codex-rs/app-server-client/src/lib.rs:695][E: codex-rs/app-server-client/src/lib.rs:727][E: codex-rs/app-server-client/src/lib.rs:735][E: codex-rs/app-server-client/src/lib.rs:752][E: codex-rs/app-server-client/src/lib.rs:762]
- remote client transport owns the remote initialize/initialized handshake, JSON-RPC request/response routing, server-request resolution, and notification streaming; remote connections always carry WebSocket frames over either TCP WebSocket URLs or local Unix sockets。[E: codex-rs/app-server-client/src/remote.rs:72][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:77][E: codex-rs/app-server-client/src/remote.rs:165][E: codex-rs/app-server-client/src/remote.rs:169][E: codex-rs/app-server-client/src/remote.rs:178][E: codex-rs/app-server-client/src/remote.rs:194][E: codex-rs/app-server-client/src/remote.rs:204][E: codex-rs/app-server-client/src/remote.rs:226][E: codex-rs/app-server-client/src/remote.rs:260][E: codex-rs/app-server-client/src/remote.rs:271][E: codex-rs/app-server-client/src/remote.rs:287][E: codex-rs/app-server-client/src/remote.rs:594][E: codex-rs/app-server-client/src/remote.rs:797][E: codex-rs/app-server-client/src/remote.rs:933]
- `app-server-test-client` 的 `Endpoint` 在 `SpawnCodex(PathBuf)` 与 `ConnectWs(String)` 之间选择；`--codex-bin` 与 `--url` 互斥，都未传时默认连接 loopback WebSocket。[E: codex-rs/app-server-test-client/src/lib.rs:557][E: codex-rs/app-server-test-client/src/lib.rs:558][E: codex-rs/app-server-test-client/src/lib.rs:559][E: codex-rs/app-server-test-client/src/lib.rs:567][E: codex-rs/app-server-test-client/src/lib.rs:568][E: codex-rs/app-server-test-client/src/lib.rs:569][E: codex-rs/app-server-test-client/src/lib.rs:577]
- stdio endpoint 通过 `codex_bin app-server` 启动 child process 并接管 stdin/stdout；WebSocket endpoint 走 `tungstenite::connect` 连接现有 server。[E: codex-rs/app-server-test-client/src/lib.rs:1614][E: codex-rs/app-server-test-client/src/lib.rs:1617][E: codex-rs/app-server-test-client/src/lib.rs:1618][E: codex-rs/app-server-test-client/src/lib.rs:1647][E: codex-rs/app-server-test-client/src/lib.rs:1648][E: codex-rs/app-server-test-client/src/lib.rs:1649][E: codex-rs/app-server-test-client/src/lib.rs:1650][E: codex-rs/app-server-test-client/src/lib.rs:1651][E: codex-rs/app-server-test-client/src/lib.rs:1652][E: codex-rs/app-server-test-client/src/lib.rs:1686][E: codex-rs/app-server-test-client/src/lib.rs:1690]

## 关键 crate/文件

- `codex-rs/app-server/src/in_process.rs`: embedded runtime, explicit outbound-router shutdown, processor drain and timeout handling。
- `codex-rs/app-server-client/src/lib.rs`: in-process facade, common event model, unified client enum, request typed helpers。
- `codex-rs/app-server-client/src/remote.rs`: remote WebSocket-frame client over TCP WebSocket or local Unix socket。
- `codex-rs/app-server-test-client/src/lib.rs`: manual/E2E CLI harness。

## 数据模型

- `AppServerEvent` 统一表示 `Lagged`, `ServerNotification`, `ServerRequest`, `Disconnected` [E: codex-rs/app-server-client/src/lib.rs:122][E: codex-rs/app-server-client/src/lib.rs:123][E: codex-rs/app-server-client/src/lib.rs:124][E: codex-rs/app-server-client/src/lib.rs:126]。
- `InProcessClientStartArgs` 包含 arg0 dispatch paths、config/loader overrides、cloud config bundle、feedback/log/state DB、environment manager、config warnings、session source、API key env 开关、client identity/capabilities 和 channel capacity。[E: codex-rs/app-server-client/src/lib.rs:298][E: codex-rs/app-server-client/src/lib.rs:300][E: codex-rs/app-server-client/src/lib.rs:302][E: codex-rs/app-server-client/src/lib.rs:304][E: codex-rs/app-server-client/src/lib.rs:306][E: codex-rs/app-server-client/src/lib.rs:310][E: codex-rs/app-server-client/src/lib.rs:312][E: codex-rs/app-server-client/src/lib.rs:314][E: codex-rs/app-server-client/src/lib.rs:316][E: codex-rs/app-server-client/src/lib.rs:318][E: codex-rs/app-server-client/src/lib.rs:320][E: codex-rs/app-server-client/src/lib.rs:322][E: codex-rs/app-server-client/src/lib.rs:324][E: codex-rs/app-server-client/src/lib.rs:326][E: codex-rs/app-server-client/src/lib.rs:328][E: codex-rs/app-server-client/src/lib.rs:330][E: codex-rs/app-server-client/src/lib.rs:332][E: codex-rs/app-server-client/src/lib.rs:334][E: codex-rs/app-server-client/src/lib.rs:336]
- `RemoteAppServerEndpoint` is either `WebSocket { websocket_url, auth_token }` or `UnixSocket { socket_path }`; `RemoteAppServerConnectArgs` stores that endpoint plus client name/version, experimental API flag, notification opt-outs, and channel capacity [E: codex-rs/app-server-client/src/remote.rs:71][E: codex-rs/app-server-client/src/remote.rs:72][E: codex-rs/app-server-client/src/remote.rs:73][E: codex-rs/app-server-client/src/remote.rs:74][E: codex-rs/app-server-client/src/remote.rs:75][E: codex-rs/app-server-client/src/remote.rs:77][E: codex-rs/app-server-client/src/remote.rs:78][E: codex-rs/app-server-client/src/remote.rs:82][E: codex-rs/app-server-client/src/remote.rs:83][E: codex-rs/app-server-client/src/remote.rs:84][E: codex-rs/app-server-client/src/remote.rs:85][E: codex-rs/app-server-client/src/remote.rs:86][E: codex-rs/app-server-client/src/remote.rs:87][E: codex-rs/app-server-client/src/remote.rs:88][E: codex-rs/app-server-client/src/remote.rs:89]。
- `AppServerClient` enum wraps in-process and remote clients behind one API; request, typed request, notify, server-request resolve/reject, next-event, shutdown 和 cloneable request handle 都按 variant dispatch。[E: codex-rs/app-server-client/src/lib.rs:450][E: codex-rs/app-server-client/src/lib.rs:451][E: codex-rs/app-server-client/src/lib.rs:452][E: codex-rs/app-server-client/src/lib.rs:845][E: codex-rs/app-server-client/src/lib.rs:852][E: codex-rs/app-server-client/src/lib.rs:862][E: codex-rs/app-server-client/src/lib.rs:869][E: codex-rs/app-server-client/src/lib.rs:880][E: codex-rs/app-server-client/src/lib.rs:891][E: codex-rs/app-server-client/src/lib.rs:898][E: codex-rs/app-server-client/src/lib.rs:905]

## 控制流

1. in-process client start builds initialize params from caller metadata, converts startup args into `InProcessStartArgs`, calls `codex_app_server::in_process::start`, then creates command and event channels for the facade worker [E: codex-rs/app-server-client/src/lib.rs:370][E: codex-rs/app-server-client/src/lib.rs:409][E: codex-rs/app-server-client/src/lib.rs:482][E: codex-rs/app-server-client/src/lib.rs:487][E: codex-rs/app-server-client/src/lib.rs:488]。
2. in-process worker spawns request commands onto detached tasks, so the worker loop can keep draining runtime events while a request waits for client input [E: codex-rs/app-server-client/src/lib.rs:490][E: codex-rs/app-server-client/src/lib.rs:497][E: codex-rs/app-server-client/src/lib.rs:499][E: codex-rs/app-server-client/src/lib.rs:500][E: codex-rs/app-server-client/src/lib.rs:502][E: codex-rs/app-server-client/src/lib.rs:503]。
3. in-process event forwarding blocks on must-deliver events, uses `try_send` for best-effort events, emits lag markers, and rejects dropped server requests to avoid leaving the server waiting forever [E: codex-rs/app-server-client/src/lib.rs:207][E: codex-rs/app-server-client/src/lib.rs:208][E: codex-rs/app-server-client/src/lib.rs:222][E: codex-rs/app-server-client/src/lib.rs:229][E: codex-rs/app-server-client/src/lib.rs:255][E: codex-rs/app-server-client/src/lib.rs:257]。
4. embedded runtime cannot infer outbound shutdown from channel closure because detached processor work can outlive the main loop; it explicitly signals `run_outbound_router`, then applies bounded waits and aborts stuck processor/router tasks before acknowledging shutdown [E: codex-rs/app-server/src/in_process.rs:386][E: codex-rs/app-server/src/in_process.rs:394][E: codex-rs/app-server/src/in_process.rs:440][E: codex-rs/app-server/src/in_process.rs:748][E: codex-rs/app-server/src/in_process.rs:752][E: codex-rs/app-server/src/in_process.rs:753][E: codex-rs/app-server/src/in_process.rs:760][I]。
4. remote connect branches by endpoint: WebSocket endpoints run URL/auth-token validation and TCP websocket connect; Unix socket endpoints connect to the socket and upgrade using a local WebSocket handshake; both paths then call `connect_with_stream` with shared initialize params。[E: codex-rs/app-server-client/src/remote.rs:164][E: codex-rs/app-server-client/src/remote.rs:165][E: codex-rs/app-server-client/src/remote.rs:167][E: codex-rs/app-server-client/src/remote.rs:168][E: codex-rs/app-server-client/src/remote.rs:174][E: codex-rs/app-server-client/src/remote.rs:175][E: codex-rs/app-server-client/src/remote.rs:178][E: codex-rs/app-server-client/src/remote.rs:179][E: codex-rs/app-server-client/src/remote.rs:180][E: codex-rs/app-server-client/src/remote.rs:681][E: codex-rs/app-server-client/src/remote.rs:691][E: codex-rs/app-server-client/src/remote.rs:717][E: codex-rs/app-server-client/src/remote.rs:744][E: codex-rs/app-server-client/src/remote.rs:756][E: codex-rs/app-server-client/src/remote.rs:772]
5. remote initialize writes `ClientRequest::Initialize`, loops until the matching initialize response or error, buffers notifications/server requests that arrive during initialize, then sends `initialized` notification [E: codex-rs/app-server-client/src/remote.rs:804][E: codex-rs/app-server-client/src/remote.rs:808][E: codex-rs/app-server-client/src/remote.rs:811][E: codex-rs/app-server-client/src/remote.rs:820][E: codex-rs/app-server-client/src/remote.rs:830][E: codex-rs/app-server-client/src/remote.rs:847][E: codex-rs/app-server-client/src/remote.rs:863][E: codex-rs/app-server-client/src/remote.rs:928][E: codex-rs/app-server-client/src/remote.rs:931]。
6. remote worker keeps a pending request map; it rejects duplicate request ids, resolves pending senders on response/error, delivers notifications as `AppServerEvent`, and turns unknown server requests into JSON-RPC method-not-found errors back to the server [E: codex-rs/app-server-client/src/remote.rs:210][E: codex-rs/app-server-client/src/remote.rs:213][E: codex-rs/app-server-client/src/remote.rs:226][E: codex-rs/app-server-client/src/remote.rs:233][E: codex-rs/app-server-client/src/remote.rs:320][E: codex-rs/app-server-client/src/remote.rs:321][E: codex-rs/app-server-client/src/remote.rs:345][E: codex-rs/app-server-client/src/remote.rs:358][E: codex-rs/app-server-client/src/remote.rs:360]。
7. test client initialize sends `ClientRequest::Initialize`, waits for `InitializeResponse`, then sends an `initialized` JSON-RPC notification to complete handshake。[E: codex-rs/app-server-test-client/src/lib.rs:1735][E: codex-rs/app-server-test-client/src/lib.rs:1743][E: codex-rs/app-server-test-client/src/lib.rs:1744][E: codex-rs/app-server-test-client/src/lib.rs:1766][E: codex-rs/app-server-test-client/src/lib.rs:1769][E: codex-rs/app-server-test-client/src/lib.rs:1773]
8. test client 的 login harness 支持 ChatGPT browser/device code 与 Amazon Bedrock API key + region，Bedrock completion 以无 login-id 的 completion 通知匹配；它也新增 logout 并等待 `account/updated`。[E: codex-rs/app-server-test-client/src/lib.rs:1165][E: codex-rs/app-server-test-client/src/lib.rs:1174][E: codex-rs/app-server-test-client/src/lib.rs:1177][E: codex-rs/app-server-test-client/src/lib.rs:1182][E: codex-rs/app-server-test-client/src/lib.rs:1192][E: codex-rs/app-server-test-client/src/lib.rs:1193][E: codex-rs/app-server-test-client/src/lib.rs:1264][E: codex-rs/app-server-test-client/src/lib.rs:1269][E: codex-rs/app-server-test-client/src/lib.rs:1272][E: codex-rs/app-server-test-client/src/lib.rs:1274]

## 设计动机与权衡

- `server_notification_requires_delivery` defines the lossless tier for completion/transcript-critical notifications; comments explain that dropping these corrupts visible assistant output or leaves surfaces waiting for a completion signal。[E: codex-rs/app-server-client/src/lib.rs:141][E: codex-rs/app-server-client/src/lib.rs:144][E: codex-rs/app-server-client/src/lib.rs:146][E: codex-rs/app-server-client/src/lib.rs:148]
- WebSocket remote auth token is allowed only for `wss://` or loopback `ws://`; this avoids sending bearer tokens over non-secure remote websocket URLs [E: codex-rs/app-server-client/src/remote.rs:116][E: codex-rs/app-server-client/src/remote.rs:117][E: codex-rs/app-server-client/src/remote.rs:118][E: codex-rs/app-server-client/src/remote.rs:119][E: codex-rs/app-server-client/src/remote.rs:690][E: codex-rs/app-server-client/src/remote.rs:693][I]。
- in-process shutdown drops the caller-facing event receiver before requesting worker shutdown; comments say this unblocks pending must-deliver event sends so shutdown can reach the runtime instead of timing out [E: codex-rs/app-server-client/src/lib.rs:752][E: codex-rs/app-server-client/src/lib.rs:756][E: codex-rs/app-server-client/src/lib.rs:763][E: codex-rs/app-server-client/src/lib.rs:764]。

## gotcha

- in-process client rejects `ChatgptAuthTokensRefresh` server requests because token refresh is not supported for in-process app-server clients [E: codex-rs/app-server-client/src/lib.rs:546][E: codex-rs/app-server-client/src/lib.rs:547][E: codex-rs/app-server-client/src/lib.rs:550][E: codex-rs/app-server-client/src/lib.rs:554]。
- remote `next_event` returns initialize-time `pending_events` before reading the live event channel, so notifications/server requests received before initialize completed are not lost。[E: codex-rs/app-server-client/src/remote.rs:594][E: codex-rs/app-server-client/src/remote.rs:595][E: codex-rs/app-server-client/src/remote.rs:596][E: codex-rs/app-server-client/src/remote.rs:598][E: codex-rs/app-server-client/src/remote.rs:855][E: codex-rs/app-server-client/src/remote.rs:857][E: codex-rs/app-server-client/src/remote.rs:865]
- test client supports command/file approval plus interactive `ToolRequestUserInput`；command approval 默认 `AlwaysAccept` 但可在指定序号返回 `Cancel`，file approval 始终 `Accept`。[E: codex-rs/app-server-test-client/src/lib.rs:2140][E: codex-rs/app-server-test-client/src/lib.rs:2145][E: codex-rs/app-server-test-client/src/lib.rs:2148][E: codex-rs/app-server-test-client/src/lib.rs:2151][E: codex-rs/app-server-test-client/src/lib.rs:2152][E: codex-rs/app-server-test-client/src/lib.rs:2225][E: codex-rs/app-server-test-client/src/lib.rs:2226][E: codex-rs/app-server-test-client/src/lib.rs:2227][E: codex-rs/app-server-test-client/src/lib.rs:2228][E: codex-rs/app-server-test-client/src/lib.rs:2243][E: codex-rs/app-server-test-client/src/lib.rs:2267][E: codex-rs/app-server-test-client/src/lib.rs:2268][E: codex-rs/app-server-test-client/src/lib.rs:2270]
- test client 把 `account/login/start` 的 `apiKey` 只在 pretty-printed request 副本中替换为 `<redacted>`，原始 JSON-RPC payload 仍发送真实 key；不要用 request logging 泄露 Bedrock credential。[E: codex-rs/app-server-test-client/src/lib.rs:2051][E: codex-rs/app-server-test-client/src/lib.rs:2056][E: codex-rs/app-server-test-client/src/lib.rs:2057][E: codex-rs/app-server-test-client/src/lib.rs:2058][E: codex-rs/app-server-test-client/src/lib.rs:2059][E: codex-rs/app-server-test-client/src/lib.rs:2063][E: codex-rs/app-server-test-client/src/lib.rs:2065]

## Sources

- `codex-rs/app-server/src/in_process.rs`
- `codex-rs/app-server-client/src`
- `codex-rs/app-server-test-client/src`

## 相关

- `subsys.app-server.transport`
- `subsys.app-server.session-management`
- `subsys.tui.architecture`
