---
id: subsys.app-server.transport
title: 传输层
kind: subsystem
tier: T2
source:
  - codex-rs/app-server-transport/src/outgoing_message.rs
  - codex-rs/app-server-transport/src/transport/mod.rs
  - codex-rs/app-server-transport/src/transport/stdio.rs
  - codex-rs/app-server-transport/src/transport/websocket.rs
  - codex-rs/app-server-transport/src/transport/auth.rs
  - codex-rs/app-server/src/lib.rs
  - codex-rs/app-server/src/transport.rs
  - codex-rs/app-server-protocol/src/protocol/common.rs
  - codex-rs/stdio-to-uds/src/lib.rs
  - codex-rs/uds/src/lib.rs
  - codex-rs/app-server-transport/src/transport/remote_control/host_device.rs
  - codex-rs/app-server-transport/src/transport/remote_control/websocket.rs
symbols:
  - AppServerTransport
  - TransportEvent
  - ConnectionOrigin
  - OutboundConnectionState
  - run_main_with_transport_options
  - start_stdio_connection
  - start_websocket_acceptor
  - start_control_socket_acceptor
  - host_device_kind
related:
  - subsys.app-server.session-management
  - subsys.app-server.client-libs
  - subsys.app-server.message-processor
  - subsys.core.code-mode-runtime
evidence: explicit
status: verified
updated: 9ded177ce7
---

app-server transport implementation moved to `codex-app-server-transport`; `codex-rs/app-server/src/transport.rs` now re-exports transport types/functions and keeps only app-server-local connection/outbound filtering glue. The transport surface feeds processor-facing `TransportEvent` values and writer channels for stdio, Unix socket, WebSocket, and remote-control origins [E: codex-rs/app-server/src/transport.rs:15][E: codex-rs/app-server/src/transport.rs:27][E: codex-rs/app-server/src/transport.rs:31][E: codex-rs/app-server/src/transport.rs:35][E: codex-rs/app-server/src/transport.rs:36][E: codex-rs/app-server-transport/src/transport/mod.rs:75][E: codex-rs/app-server-transport/src/transport/mod.rs:172][E: codex-rs/app-server-transport/src/transport/mod.rs:189]。

这里的 `--listen` 是客户端到 app-server 的 JSON-RPC transport；`app-server --code-mode-host WS_URL` 是 app-server 到远端 Code Mode host 的另一条进程级 transport，二者不可混为同一个 WebSocket listener。[E: codex-rs/cli/src/main.rs:520][E: codex-rs/cli/src/main.rs:528][E: codex-rs/app-server/src/code_mode_host.rs:5][E: codex-rs/app-server/src/code_mode_host.rs:17][I]

## 能回答的问题

- `--listen` 现在支持哪些 URL 形态，以及默认 transport 是什么。
- stdio、Unix socket、WebSocket 如何变成 `TransportEvent`。
- inbound queue 满时 request 与 response/notification 为什么表现不同。
- outbound broadcast、experimental field filtering、slow connection disconnect 在哪里做。
- WebSocket auth 支持 capability token / signed bearer token 的哪些参数。
- remote-control 连接如何识别 host 是 Mac mini。

## 职责边界

- `AppServerTransport` 表示 configured listener：`Stdio`、`UnixSocket { socket_path }`、`WebSocket { bind_address }`、`Off`；`DEFAULT_LISTEN_URL` 是 `stdio://` [E: codex-rs/app-server-transport/src/transport/mod.rs:74][E: codex-rs/app-server-transport/src/transport/mod.rs:75][E: codex-rs/app-server-transport/src/transport/mod.rs:76][E: codex-rs/app-server-transport/src/transport/mod.rs:77][E: codex-rs/app-server-transport/src/transport/mod.rs:78][E: codex-rs/app-server-transport/src/transport/mod.rs:79][E: codex-rs/app-server-transport/src/transport/mod.rs:114]。
- `from_listen_url` accepts `stdio://`, `unix://`, `unix://PATH`, `off`, and `ws://IP:PORT`; unsupported forms produce an error whose message lists those expected schemes [E: codex-rs/app-server-transport/src/transport/mod.rs:92][E: codex-rs/app-server-transport/src/transport/mod.rs:94][E: codex-rs/app-server-transport/src/transport/mod.rs:116][E: codex-rs/app-server-transport/src/transport/mod.rs:121][E: codex-rs/app-server-transport/src/transport/mod.rs:143][E: codex-rs/app-server-transport/src/transport/mod.rs:146][E: codex-rs/app-server-transport/src/transport/mod.rs:150][E: codex-rs/app-server-transport/src/transport/mod.rs:154][E: codex-rs/app-server-transport/src/transport/mod.rs:157]。
- `TransportEvent` carries connection opened/closed and incoming JSON-RPC messages; `ConnectionOrigin` distinguishes Stdio, InProcess, WebSocket, and RemoteControl [E: codex-rs/app-server-transport/src/transport/mod.rs:172][E: codex-rs/app-server-transport/src/transport/mod.rs:173][E: codex-rs/app-server-transport/src/transport/mod.rs:179][E: codex-rs/app-server-transport/src/transport/mod.rs:182][E: codex-rs/app-server-transport/src/transport/mod.rs:188][E: codex-rs/app-server-transport/src/transport/mod.rs:189][E: codex-rs/app-server-transport/src/transport/mod.rs:190][E: codex-rs/app-server-transport/src/transport/mod.rs:191][E: codex-rs/app-server-transport/src/transport/mod.rs:192][E: codex-rs/app-server-transport/src/transport/mod.rs:193]。
- app-server-local `ConnectionState` retains each connection's origin. On close the main loop removes that state, closes the RPC gate, notifies the outbound router, and starts processor cleanup; a stdio close terminates single-client mode, whereas closing other origins does not by itself terminate the process [E: codex-rs/app-server/src/transport.rs:39][E: codex-rs/app-server/src/transport.rs:40][E: codex-rs/app-server/src/lib.rs:1014][E: codex-rs/app-server/src/lib.rs:1018][E: codex-rs/app-server/src/lib.rs:1020][E: codex-rs/app-server/src/lib.rs:1026][E: codex-rs/app-server/src/lib.rs:1033]。
- `stdio-to-uds` is a separate relay helper that copies stdin/stdout to a Unix domain socket; it does not construct app-server `TransportEvent` or `OutgoingEnvelope` values, which is inferred from its direct `UnixStream::connect` and copy loop [E: codex-rs/stdio-to-uds/src/lib.rs:12][E: codex-rs/stdio-to-uds/src/lib.rs:13][E: codex-rs/stdio-to-uds/src/lib.rs:18][E: codex-rs/stdio-to-uds/src/lib.rs:24][E: codex-rs/stdio-to-uds/src/lib.rs:42][I]。

## 关键 crate/文件

- `codex-rs/app-server-transport/src/transport/mod.rs`: transport enum/parser, connection ids, event type, inbound enqueue/backpressure。
- `codex-rs/app-server-transport/src/outgoing_message.rs`: transport-facing outgoing request/response/error 与 server-notification envelope。
- `codex-rs/app-server-transport/src/transport/stdio.rs`: JSONL stdin/stdout transport。
- `codex-rs/app-server-transport/src/transport/websocket.rs`: axum WebSocket listener, health endpoints, websocket inbound/outbound loops。
- `codex-rs/app-server-transport/src/transport/auth.rs`: WebSocket auth policy and bearer/JWT validation。
- `codex-rs/app-server/src/lib.rs`: transport-event consumer, outbound-router control, connection close lifecycle。
- `codex-rs/app-server/src/transport.rs`: app-server outbound filtering/routing and re-export glue。
- `codex-rs/stdio-to-uds/src/lib.rs`, `codex-rs/uds/src/lib.rs`: local UDS relay/helper support。

## 数据模型

- Transport channels use bounded capacity `CHANNEL_CAPACITY = 128`; inbound JSON payloads parse to `JSONRPCMessage` and are wrapped as `TransportEvent::IncomingMessage` [E: codex-rs/app-server-transport/src/transport/mod.rs:25][E: codex-rs/app-server-transport/src/transport/mod.rs:202][E: codex-rs/app-server-transport/src/transport/mod.rs:208][E: codex-rs/app-server-transport/src/transport/mod.rs:210][E: codex-rs/app-server-transport/src/transport/mod.rs:219][E: codex-rs/app-server-transport/src/transport/mod.rs:225]。
- `OutboundConnectionState` lives in app-server local glue and stores initialized/experimental flags, opted-out notification methods, writer channel, and optional disconnect token [E: codex-rs/app-server/src/transport.rs:64][E: codex-rs/app-server/src/transport.rs:65][E: codex-rs/app-server/src/transport.rs:66][E: codex-rs/app-server/src/transport.rs:67][E: codex-rs/app-server/src/transport.rs:68][E: codex-rs/app-server/src/transport.rs:69]。
- `OutgoingMessage::AppServerNotification` 现在承载扁平化的 `ServerNotificationEnvelope`；envelope 除具体 notification 外还带 optional `emitted_at_ms`，当前 server 在 fan-out 前写入该 Unix 毫秒时间，而 optional 形态让客户端仍可解码旧 server 消息。[E: codex-rs/app-server-transport/src/outgoing_message.rs:25][E: codex-rs/app-server-transport/src/outgoing_message.rs:29][E: codex-rs/app-server-protocol/src/protocol/common.rs:1860][E: codex-rs/app-server-protocol/src/protocol/common.rs:1862][E: codex-rs/app-server-protocol/src/protocol/common.rs:1872]
- WebSocket auth settings support capability-token sources (`TokenFile` or `TokenSha256`) and signed bearer-token settings (`shared_secret_file`, optional issuer/audience, max clock skew) [E: codex-rs/app-server-transport/src/transport/auth.rs:65][E: codex-rs/app-server-transport/src/transport/auth.rs:70][E: codex-rs/app-server-transport/src/transport/auth.rs:71][E: codex-rs/app-server-transport/src/transport/auth.rs:74][E: codex-rs/app-server-transport/src/transport/auth.rs:75][E: codex-rs/app-server-transport/src/transport/auth.rs:76][E: codex-rs/app-server-transport/src/transport/auth.rs:77][E: codex-rs/app-server-transport/src/transport/auth.rs:78][E: codex-rs/app-server-transport/src/transport/auth.rs:82][E: codex-rs/app-server-transport/src/transport/auth.rs:83][E: codex-rs/app-server-transport/src/transport/auth.rs:84][E: codex-rs/app-server-transport/src/transport/auth.rs:85]。

## 控制流

1. stdio transport allocates a connection id and writer channel, sends `ConnectionOpened { origin: Stdio }`, then runs a stdin reader task and stdout writer task; the reader extracts the first initialize client name before forwarding each JSON line [E: codex-rs/app-server-transport/src/transport/stdio.rs:24][E: codex-rs/app-server-transport/src/transport/stdio.rs:29][E: codex-rs/app-server-transport/src/transport/stdio.rs:30][E: codex-rs/app-server-transport/src/transport/stdio.rs:32][E: codex-rs/app-server-transport/src/transport/stdio.rs:33][E: codex-rs/app-server-transport/src/transport/stdio.rs:35][E: codex-rs/app-server-transport/src/transport/stdio.rs:43][E: codex-rs/app-server-transport/src/transport/stdio.rs:52][E: codex-rs/app-server-transport/src/transport/stdio.rs:57][E: codex-rs/app-server-transport/src/transport/stdio.rs:82][E: codex-rs/app-server-transport/src/transport/stdio.rs:103][E: codex-rs/app-server-transport/src/transport/stdio.rs:108][E: codex-rs/app-server-transport/src/transport/stdio.rs:111]。
2. WebSocket acceptor rejects requests with an `Origin` header, authorizes upgrades, exposes `/readyz` and `/healthz`, and refuses non-loopback listeners without auth [E: codex-rs/app-server-transport/src/transport/websocket.rs:89][E: codex-rs/app-server-transport/src/transport/websocket.rs:93][E: codex-rs/app-server-transport/src/transport/websocket.rs:105][E: codex-rs/app-server-transport/src/transport/websocket.rs:111][E: codex-rs/app-server-transport/src/transport/websocket.rs:129][E: codex-rs/app-server-transport/src/transport/websocket.rs:135][E: codex-rs/app-server-transport/src/transport/websocket.rs:139][E: codex-rs/app-server-transport/src/transport/websocket.rs:148][E: codex-rs/app-server-transport/src/transport/websocket.rs:149][E: codex-rs/app-server-transport/src/transport/websocket.rs:150]。
3. A WebSocket connection sends `ConnectionOpened { origin: WebSocket, disconnect_sender: Some(...) }`, runs inbound/outbound tasks, and sends `ConnectionClosed` when either side finishes [E: codex-rs/app-server-transport/src/transport/websocket.rs:172][E: codex-rs/app-server-transport/src/transport/websocket.rs:181][E: codex-rs/app-server-transport/src/transport/websocket.rs:187][E: codex-rs/app-server-transport/src/transport/websocket.rs:189][E: codex-rs/app-server-transport/src/transport/websocket.rs:191][E: codex-rs/app-server-transport/src/transport/websocket.rs:200][E: codex-rs/app-server-transport/src/transport/websocket.rs:206][E: codex-rs/app-server-transport/src/transport/websocket.rs:215][E: codex-rs/app-server-transport/src/transport/websocket.rs:226]。
4. inbound enqueue uses `try_send`; when the queue is full for a request, it attempts to send an overload JSON-RPC error to that request's writer, while full non-request events await `transport_event_tx.send(event)` [E: codex-rs/app-server-transport/src/transport/mod.rs:219][E: codex-rs/app-server-transport/src/transport/mod.rs:229][E: codex-rs/app-server-transport/src/transport/mod.rs:232][E: codex-rs/app-server-transport/src/transport/mod.rs:234][E: codex-rs/app-server-transport/src/transport/mod.rs:236][E: codex-rs/app-server-transport/src/transport/mod.rs:244][E: codex-rs/app-server-transport/src/transport/mod.rs:256]。
5. app-server outbound routing sends targeted messages directly and broadcasts only to initialized connections; notifications with experimental reasons or opted-out methods can be skipped per connection [E: codex-rs/app-server/src/transport.rs:100][E: codex-rs/app-server/src/transport.rs:109][E: codex-rs/app-server/src/transport.rs:111][E: codex-rs/app-server/src/transport.rs:116][E: codex-rs/app-server/src/transport.rs:118][E: codex-rs/app-server/src/transport.rs:200][E: codex-rs/app-server/src/transport.rs:205][E: codex-rs/app-server/src/transport.rs:214][E: codex-rs/app-server/src/transport.rs:218]。
6. outbound write to disconnect-capable connections uses `try_send` and disconnects on a full writer queue; non-disconnectable connections await send and disconnect only if the writer closes [E: codex-rs/app-server/src/transport.rs:156][E: codex-rs/app-server/src/transport.rs:157][E: codex-rs/app-server/src/transport.rs:159][E: codex-rs/app-server/src/transport.rs:163][E: codex-rs/app-server/src/transport.rs:165][E: codex-rs/app-server/src/transport.rs:169]。
7. `ConnectionClosed` removes the retained connection state, closes new RPC admission, sends `OutboundControlEvent::Closed`, and runs domain cleanup asynchronously; if the outbound router is gone the server stops, and in single-client mode a closed stdio origin also stops the server [E: codex-rs/app-server/src/lib.rs:1014][E: codex-rs/app-server/src/lib.rs:1018][E: codex-rs/app-server/src/lib.rs:1020][E: codex-rs/app-server/src/lib.rs:1026][E: codex-rs/app-server/src/lib.rs:1033]。

## Remote-control host device

remote-control WebSocket handshake 会附加 `x-codex-host-device-kind` header。macOS 上 `host_device_kind()` 用 2 秒 timeout 调用 `/usr/sbin/system_profiler -detailLevel mini SPHardwareDataType -json`，只在 `SPHardwareDataType[0].machine_name == "Mac mini"` 时返回 `"mac_mini"`；非 macOS 恒为 `None`，识别结果按进程缓存。[E: codex-rs/app-server-transport/src/transport/remote_control/host_device.rs:4][E: codex-rs/app-server-transport/src/transport/remote_control/host_device.rs:6][E: codex-rs/app-server-transport/src/transport/remote_control/host_device.rs:22][E: codex-rs/app-server-transport/src/transport/remote_control/host_device.rs:27][E: codex-rs/app-server-transport/src/transport/remote_control/host_device.rs:32][E: codex-rs/app-server-transport/src/transport/remote_control/host_device.rs:42][E: codex-rs/app-server-transport/src/transport/remote_control/host_device.rs:67][E: codex-rs/app-server-transport/src/transport/remote_control/websocket.rs:1295][E: codex-rs/app-server-transport/src/transport/remote_control/websocket.rs:1298]

这不是新的 client RPC method：它只影响 remote-control 出站 handshake 身份，客户端仍用现有 `remoteControl/*` methods 管理 pairing/status。

## 设计动机与权衡

- inbound overload behavior gives request callers a concrete retryable error while preserving response/notification delivery by awaiting the bounded queue on non-request messages [E: codex-rs/app-server-transport/src/transport/mod.rs:232][E: codex-rs/app-server-transport/src/transport/mod.rs:236][E: codex-rs/app-server-transport/src/transport/mod.rs:244][E: codex-rs/app-server-transport/src/transport/mod.rs:256][I]。
- WebSocket auth is optional only for loopback/local use: non-loopback listener without auth is rejected at startup, and the startup banner notes auth is required for non-localhost listeners [E: codex-rs/app-server-transport/src/transport/auth.rs:266][E: codex-rs/app-server-transport/src/transport/auth.rs:270][E: codex-rs/app-server-transport/src/transport/websocket.rs:70][E: codex-rs/app-server-transport/src/transport/websocket.rs:75][E: codex-rs/app-server-transport/src/transport/websocket.rs:135][E: codex-rs/app-server-transport/src/transport/websocket.rs:139]。
- signed bearer token validation clears jsonwebtoken's default required claims and performs exp/nbf/issuer/audience checks manually, which lets app-server apply its configured clock skew and optional issuer/audience policy [E: codex-rs/app-server-transport/src/transport/auth.rs:318][E: codex-rs/app-server-transport/src/transport/auth.rs:319][E: codex-rs/app-server-transport/src/transport/auth.rs:320][E: codex-rs/app-server-transport/src/transport/auth.rs:321][E: codex-rs/app-server-transport/src/transport/auth.rs:322][E: codex-rs/app-server-transport/src/transport/auth.rs:329][E: codex-rs/app-server-transport/src/transport/auth.rs:335][E: codex-rs/app-server-transport/src/transport/auth.rs:336][E: codex-rs/app-server-transport/src/transport/auth.rs:339][E: codex-rs/app-server-transport/src/transport/auth.rs:344][E: codex-rs/app-server-transport/src/transport/auth.rs:349][I]。
- UDS helper repairs the control socket directory to exact `0700` because the socket is reachable by path and the rendezvous directory must be owner-traversable while denying group/other access [E: codex-rs/uds/src/lib.rs:127][E: codex-rs/uds/src/lib.rs:132][E: codex-rs/uds/src/lib.rs:133]。

## gotcha

- WebSocket auth token is accepted only from `Authorization: Bearer ...`; missing header, malformed header, non-Bearer scheme, or empty token all fail before auth mode checks [E: codex-rs/app-server-transport/src/transport/auth.rs:273][E: codex-rs/app-server-transport/src/transport/auth.rs:281][E: codex-rs/app-server-transport/src/transport/auth.rs:368][E: codex-rs/app-server-transport/src/transport/auth.rs:369][E: codex-rs/app-server-transport/src/transport/auth.rs:375][E: codex-rs/app-server-transport/src/transport/auth.rs:378][E: codex-rs/app-server-transport/src/transport/auth.rs:381]。
- Binary WebSocket messages are logged and dropped; only text messages enter `forward_incoming_message` [E: codex-rs/app-server-transport/src/transport/websocket.rs:349][E: codex-rs/app-server-transport/src/transport/websocket.rs:350][E: codex-rs/app-server-transport/src/transport/websocket.rs:351][E: codex-rs/app-server-transport/src/transport/websocket.rs:374][E: codex-rs/app-server-transport/src/transport/websocket.rs:375]。
- `stdio-to-uds` half-closes socket writer after stdin copy and treats `NotConnected` as an acceptable race; other shutdown errors still fail the relay [E: codex-rs/stdio-to-uds/src/lib.rs:33][E: codex-rs/stdio-to-uds/src/lib.rs:34][E: codex-rs/stdio-to-uds/src/lib.rs:36]。

## Sources

- `codex-rs/app-server-transport/src/transport/mod.rs`
- `codex-rs/app-server-transport/src/outgoing_message.rs`
- `codex-rs/app-server-transport/src/transport/stdio.rs`
- `codex-rs/app-server-transport/src/transport/websocket.rs`
- `codex-rs/app-server-transport/src/transport/auth.rs`
- `codex-rs/app-server/src/lib.rs`
- `codex-rs/app-server/src/transport.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/stdio-to-uds/src/lib.rs`
- `codex-rs/uds/src/lib.rs`
- `codex-rs/app-server-transport/src/transport/remote_control/host_device.rs`
- `codex-rs/app-server-transport/src/transport/remote_control/websocket.rs`

## 相关

- `subsys.app-server.session-management`
- `subsys.app-server.client-libs`
- `subsys.app-server.message-processor`
- [Code Mode runtime](../core/code-mode-runtime.md)
