---
id: subsys.app-server.transport
title: 传输层
kind: subsystem
tier: T2
source:
  - codex-rs/app-server/src/transport
  - codex-rs/stdio-to-uds/src
  - codex-rs/uds/src
symbols:
  - AppServerTransport
  - TransportEvent
  - OutboundConnectionState
  - start_stdio_connection
  - start_websocket_acceptor
related:
  - subsys.app-server.session-management
  - subsys.app-server.client-libs
  - subsys.app-server.message-processor
evidence: explicit
status: verified
updated: 37aadeaa13
---

app-server 传输层把 stdio、WebSocket 和 remote-control 接入 processor-facing `TransportEvent` + bounded channel + `OutgoingEnvelope`；`stdio-to-uds` 是独立的 stdin/stdout 到 Unix domain socket relay，不进入 app-server `TransportEvent`/`OutgoingEnvelope` 路径是从 relay crate 与 app-server transport 类型分离得出的架构推断 [E: codex-rs/app-server/src/transport/mod.rs:27][E: codex-rs/app-server/src/transport/mod.rs:30][E: codex-rs/app-server/src/transport/mod.rs:105][E: codex-rs/app-server/src/transport/mod.rs:370][E: codex-rs/app-server/src/transport/remote_control/client_tracker.rs:146][E: codex-rs/stdio-to-uds/src/lib.rs:12][E: codex-rs/stdio-to-uds/src/lib.rs:26][E: codex-rs/stdio-to-uds/src/lib.rs:42][I]。

## 能回答的问题

- `--listen` 支持哪些 URL，默认 transport 是什么。
- incoming queue 满时 request/response/notification 的行为差异。
- outbound broadcast 为什么只发给 initialized connections。
- WebSocket auth 支持 capability token 与 signed bearer token 的哪些参数。
- `stdio-to-uds` 与 `codex_uds` 如何把 stdio relay 到 Unix domain socket。

## 职责边界

- `AppServerTransport` 只解析/表示 configured listener 类型：`Stdio`、`WebSocket { bind_address }`、`Off` [E: codex-rs/app-server/src/transport/mod.rs:42][E: codex-rs/app-server/src/transport/mod.rs:43][E: codex-rs/app-server/src/transport/mod.rs:44][E: codex-rs/app-server/src/transport/mod.rs:45]。
- `TransportEvent` 是 app-server transport 到 processor 的消息形态：connection opened、connection closed、incoming JSON-RPC message [E: codex-rs/app-server/src/transport/mod.rs:105][E: codex-rs/app-server/src/transport/mod.rs:106][E: codex-rs/app-server/src/transport/mod.rs:112][E: codex-rs/app-server/src/transport/mod.rs:115]。
- transport layer 的主路径 parse `JSONRPCMessage` 并发给 processor；stdio 额外只从首个 initialize request 解析 client name，remote-control 也把 initialize 视为打开 connection 的特殊消息 [E: codex-rs/app-server/src/transport/mod.rs:202][E: codex-rs/app-server/src/transport/mod.rs:208][E: codex-rs/app-server/src/transport/mod.rs:225][E: codex-rs/app-server/src/transport/stdio.rs:53][E: codex-rs/app-server/src/transport/stdio.rs:103][E: codex-rs/app-server/src/transport/stdio.rs:108][E: codex-rs/app-server/src/transport/stdio.rs:111][E: codex-rs/app-server/src/transport/remote_control/client_tracker.rs:98][E: codex-rs/app-server/src/transport/remote_control/client_tracker.rs:158]。
- outbound layer 会按 connection capabilities 过滤通知和 experimental fields；它不调用 domain handler 是基于 outbound filter/route 只处理 `OutgoingMessage` 的边界推断 [E: codex-rs/app-server/src/transport/mod.rs:277][E: codex-rs/app-server/src/transport/mod.rs:346][E: codex-rs/app-server/src/transport/mod.rs:358][E: codex-rs/app-server/src/transport/mod.rs:370][I]。

## 关键 crate/文件

- `codex-rs/app-server/src/transport/mod.rs`: transport types, queueing, serialization, outgoing routing。
- `codex-rs/app-server/src/transport/stdio.rs`: stdin/stdout JSONL connection。
- `codex-rs/app-server/src/transport/websocket.rs`: axum WebSocket listener, health endpoints, inbound/outbound loops。
- `codex-rs/app-server/src/transport/auth.rs`: WebSocket auth CLI settings and authorization。
- `codex-rs/stdio-to-uds/src`: stdio to UDS relay helper。
- `codex-rs/uds/src`: cross-platform async UDS abstraction。

## 数据模型

- `AppServerTransport::DEFAULT_LISTEN_URL` 是 `stdio://`，`from_listen_url` 支持 `stdio://`、`off` 和 `ws://IP:PORT` [E: codex-rs/app-server/src/transport/mod.rs:72][E: codex-rs/app-server/src/transport/mod.rs:75][E: codex-rs/app-server/src/transport/mod.rs:79][E: codex-rs/app-server/src/transport/mod.rs:83][E: codex-rs/app-server/src/transport/mod.rs:84]。
- `ConnectionOrigin` 包含 Stdio、InProcess、WebSocket、RemoteControl；device-key request 只允许 Stdio 或 InProcess [E: codex-rs/app-server/src/transport/mod.rs:122][E: codex-rs/app-server/src/transport/mod.rs:123][E: codex-rs/app-server/src/transport/mod.rs:124][E: codex-rs/app-server/src/transport/mod.rs:125][E: codex-rs/app-server/src/transport/mod.rs:126][E: codex-rs/app-server/src/transport/mod.rs:133]。
- `OutboundConnectionState` 保存 initialized flag、experimental API flag、opted-out notification methods、writer 和可选 disconnect sender [E: codex-rs/app-server/src/transport/mod.rs:160][E: codex-rs/app-server/src/transport/mod.rs:161][E: codex-rs/app-server/src/transport/mod.rs:162][E: codex-rs/app-server/src/transport/mod.rs:163][E: codex-rs/app-server/src/transport/mod.rs:164][E: codex-rs/app-server/src/transport/mod.rs:165]。
- WebSocket auth settings 支持 `CapabilityToken` token file/hash 和 `SignedBearerToken` shared secret/issuer/audience/max clock skew [E: codex-rs/app-server/src/transport/auth.rs:70][E: codex-rs/app-server/src/transport/auth.rs:71][E: codex-rs/app-server/src/transport/auth.rs:74][E: codex-rs/app-server/src/transport/auth.rs:75][E: codex-rs/app-server/src/transport/auth.rs:76][E: codex-rs/app-server/src/transport/auth.rs:77][E: codex-rs/app-server/src/transport/auth.rs:78][E: codex-rs/app-server/src/transport/auth.rs:83][E: codex-rs/app-server/src/transport/auth.rs:84][E: codex-rs/app-server/src/transport/auth.rs:85]。

## 控制流

1. stdio transport 创建 connection id 和 writer channel，发送 `ConnectionOpened { origin: Stdio }`，再启动 stdin reader 和 stdout writer 两个 task [E: codex-rs/app-server/src/transport/stdio.rs:29][E: codex-rs/app-server/src/transport/stdio.rs:30][E: codex-rs/app-server/src/transport/stdio.rs:33][E: codex-rs/app-server/src/transport/stdio.rs:35][E: codex-rs/app-server/src/transport/stdio.rs:43][E: codex-rs/app-server/src/transport/stdio.rs:82]。
2. stdin reader 按 line 读取 JSONL，首个 initialize request 会提取 client name，然后调用 `forward_incoming_message` [E: codex-rs/app-server/src/transport/stdio.rs:50][E: codex-rs/app-server/src/transport/stdio.rs:52][E: codex-rs/app-server/src/transport/stdio.rs:53][E: codex-rs/app-server/src/transport/stdio.rs:57][E: codex-rs/app-server/src/transport/stdio.rs:103][E: codex-rs/app-server/src/transport/stdio.rs:108][E: codex-rs/app-server/src/transport/stdio.rs:111]。
3. WebSocket acceptor 提供 `/readyz`、`/healthz` 和 fallback websocket upgrade，并拒绝带 `Origin` header 的 request [E: codex-rs/app-server/src/transport/websocket.rs:141][E: codex-rs/app-server/src/transport/websocket.rs:142][E: codex-rs/app-server/src/transport/websocket.rs:143][E: codex-rs/app-server/src/transport/websocket.rs:144][E: codex-rs/app-server/src/transport/websocket.rs:145][E: codex-rs/app-server/src/transport/websocket.rs:89][E: codex-rs/app-server/src/transport/websocket.rs:95]。
4. WebSocket upgrade 先 `authorize_upgrade`，成功后创建 connection id 并进入 `run_websocket_connection` [E: codex-rs/app-server/src/transport/websocket.rs:107][E: codex-rs/app-server/src/transport/websocket.rs:115][E: codex-rs/app-server/src/transport/websocket.rs:119]。
5. incoming enqueue 对 queue full 的 request 立即尝试给 writer 发送 overload error；queue full 的非 request event 会 await `transport_event_tx.send(event)` [E: codex-rs/app-server/src/transport/mod.rs:229][E: codex-rs/app-server/src/transport/mod.rs:232][E: codex-rs/app-server/src/transport/mod.rs:236][E: codex-rs/app-server/src/transport/mod.rs:244][E: codex-rs/app-server/src/transport/mod.rs:256]。
6. outbound broadcast 只选择 initialized connection，且会跳过 opt-out notification methods [E: codex-rs/app-server/src/transport/mod.rs:384][E: codex-rs/app-server/src/transport/mod.rs:388][E: codex-rs/app-server/src/transport/mod.rs:389]。
7. outbound router 对带 disconnect sender 的 connection 使用 `try_send`，writer queue full 时断开该 connection；没有 disconnect sender 的 connection 走 await send path；remote-control opened event 会提供 `disconnect_sender: Some(...)` [E: codex-rs/app-server/src/transport/mod.rs:326][E: codex-rs/app-server/src/transport/mod.rs:327][E: codex-rs/app-server/src/transport/mod.rs:329][E: codex-rs/app-server/src/transport/mod.rs:333][E: codex-rs/app-server/src/transport/mod.rs:339][E: codex-rs/app-server/src/transport/remote_control/client_tracker.rs:166]。

## 设计动机与权衡

- incoming request queue 满时返回 overload，而 response/notification 不直接丢弃；“app-server 优先给 request caller 明确反馈，同时保留非 request 消息传递可能”是从 request/non-request full-queue 分支得出的设计推断 [E: codex-rs/app-server/src/transport/mod.rs:232][E: codex-rs/app-server/src/transport/mod.rs:236][E: codex-rs/app-server/src/transport/mod.rs:244][E: codex-rs/app-server/src/transport/mod.rs:256][I]。
- WebSocket auth 当前是 opt-in；非 loopback 且无 auth 会 warn，startup banner 也提示 remote use 前配置 `--ws-auth` [E: codex-rs/app-server/src/transport/auth.rs:266][E: codex-rs/app-server/src/transport/auth.rs:270][E: codex-rs/app-server/src/transport/websocket.rs:69][E: codex-rs/app-server/src/transport/websocket.rs:70]。
- signed bearer token 手动验证 exp/nbf/issuer/audience，并清空 jsonwebtoken 默认 required claims；“允许 app-server 自己定义 clock skew 与 optional issuer/audience”是从 validation 设置和 manual checks 得出的设计推断 [E: codex-rs/app-server/src/transport/auth.rs:318][E: codex-rs/app-server/src/transport/auth.rs:319][E: codex-rs/app-server/src/transport/auth.rs:336][E: codex-rs/app-server/src/transport/auth.rs:340][E: codex-rs/app-server/src/transport/auth.rs:345][E: codex-rs/app-server/src/transport/auth.rs:350][I]。
- UDS helper 在 Unix 上把 socket directory chmod 到 0700，设计注释说明 control socket directory 必须 owner-traversable 且拒绝 group/other access [E: codex-rs/uds/src/lib.rs:128][E: codex-rs/uds/src/lib.rs:130][E: codex-rs/uds/src/lib.rs:132][E: codex-rs/uds/src/lib.rs:133]。

## gotcha

- WebSocket auth 启用时，auth token 只能放在 `Authorization: Bearer` header；`bearer_token_from_headers` 会拒绝缺 header、非 Bearer scheme 或空 token [E: codex-rs/app-server/src/transport/auth.rs:368][E: codex-rs/app-server/src/transport/auth.rs:371][E: codex-rs/app-server/src/transport/auth.rs:378][E: codex-rs/app-server/src/transport/auth.rs:382]。
- binary WebSocket message 被 drop，只有 text message 会进入 JSON-RPC parse [E: codex-rs/app-server/src/transport/websocket.rs:272][E: codex-rs/app-server/src/transport/websocket.rs:273][E: codex-rs/app-server/src/transport/websocket.rs:296][E: codex-rs/app-server/src/transport/websocket.rs:297]。
- `stdio-to-uds` 在 stdin copy 完后 half-close socket writer；NotConnected 被视为可接受 race，其它 shutdown error 才返回错误 [E: codex-rs/stdio-to-uds/src/lib.rs:30][E: codex-rs/stdio-to-uds/src/lib.rs:33][E: codex-rs/stdio-to-uds/src/lib.rs:34][E: codex-rs/stdio-to-uds/src/lib.rs:36]。

## Sources

- `codex-rs/app-server/src/transport`
- `codex-rs/stdio-to-uds/src`
- `codex-rs/uds/src`

## 相关

- `subsys.app-server.session-management`
- `subsys.app-server.client-libs`
- `subsys.app-server.message-processor`
