---
id: subsys.server.unix-transport
title: Protocol server Unix transport
kind: subsystem
tier: T2
pkg: server
source:
  - packages/server/package.json
  - packages/server/README.md
  - packages/server/src/transports/unix/index.ts
  - packages/server/src/transports/unix/types.ts
  - packages/server/src/transports/unix/preset.ts
  - packages/server/src/transports/unix/listener.ts
  - packages/server/test/unix.test.ts
symbols:
  - createUnixListener
  - createUnixServer
  - UnixListenerOptions
  - UnixServerOptions
related:
  - subsys.server.session-server
  - subsys.client.unix-transport
  - subsys.protocol.cbor-framing
evidence: explicit
status: verified
updated: 086c32e745
---

> `@earendil-works/pi-server/unix` 同时提供 composable `createUnixListener()` 与 one-listener `createUnixServer()` preset；它服务 framed-CBOR session protocol，不是 legacy JSONL `startIpcServer()`。[E: packages/server/package.json:17][E: packages/server/package.json:18][E: packages/server/src/transports/unix/index.ts:1][E: packages/server/src/transports/unix/index.ts:2][E: packages/server/src/transports/unix/preset.ts:7][E: packages/server/src/transports/unix/preset.ts:7]

## 能回答的问题

- Unix preset 如何组合 listener 与 `PiServer`？
- socket path、mode、frame/pending limit、graceful close timeout 默认是什么？
- startup 如何区分 live/stale socket 并避免删除普通文件？
- shutdown 如何避免 unlink 已被其它进程替换的 inode？
- final protocol error 如何排在 pending output 后发送？

## Options 与 preset

`UnixListenerOptions` 要求 path，可选 mode、max pending bytes、graceful close timeout、matching max frame length 与 error observer；默认 socket mode 是 owner-only `0o600`。[E: packages/server/src/transports/unix/types.ts:3][E: packages/server/src/transports/unix/types.ts:4][E: packages/server/src/transports/unix/types.ts:6][E: packages/server/src/transports/unix/types.ts:8][E: packages/server/src/transports/unix/types.ts:8][E: packages/server/src/transports/unix/types.ts:9][E: packages/server/src/transports/unix/types.ts:11][E: packages/server/src/transports/unix/types.ts:11][E: packages/server/src/transports/unix/types.ts:12][E: packages/server/src/transports/unix/listener.ts:11]

`UnixServerOptions` 由 `PiServerOptions` 去掉 `listeners` 后与 listener options 合并，两侧都没有 token field；Unix preset 的 access-control boundary 是 socket path/mode，默认 `0o600`。这满足 core 对 listener 先交付 authorized connection 的 contract，但实现没有额外 peer-credential handshake。[E: packages/server/src/transports/unix/types.ts:15][E: packages/server/src/types.ts:14][E: packages/server/src/types.ts:15][E: packages/server/src/types.ts:19][E: packages/server/src/transports/unix/listener.ts:11][E: packages/server/src/transports/unix/listener.ts:407][E: packages/server/README.md:42][I]

具体实现对每个 accepted socket 直接构造 `UnixByteConnection` 并调用 core acceptor，没有检查 bearer token 或 OS peer credentials；parent directory 创建请求 `0o700`，public socket 再按配置 mode chmod。调用者若把 mode 放宽，授权边界也随之放宽。[E: packages/server/src/transports/unix/listener.ts:67][E: packages/server/src/transports/unix/listener.ts:91][E: packages/server/src/transports/unix/listener.ts:92][E: packages/server/src/transports/unix/listener.ts:108][E: packages/server/src/transports/unix/listener.ts:113][E: packages/server/src/transports/unix/listener.ts:124][I]

`createUnixServer()` 把 listener options 和 core server options 拆开，再构造 tokenless `new PiServer(... listeners:[listener])`；custom max frame 必须同时传给 listener queue validation 与 server codec。[E: packages/server/src/transports/unix/preset.ts:7][E: packages/server/src/transports/unix/preset.ts:8][E: packages/server/src/transports/unix/preset.ts:11][E: packages/server/src/transports/unix/preset.ts:16][E: packages/server/src/transports/unix/preset.ts:17][E: packages/server/src/transports/unix/preset.ts:18][E: packages/server/src/transports/unix/preset.ts:19][E: packages/server/src/transports/unix/preset.ts:20][E: packages/server/src/transports/unix/preset.ts:21]

默认 `maxPendingBytes = maxFrameLength * 4`，且必须至少容纳 `maxFrameLength + 4` 的完整 frame；默认 graceful close timeout 是 5 seconds。[E: packages/server/src/transports/unix/listener.ts:12][E: packages/server/src/transports/unix/listener.ts:411][E: packages/server/src/transports/unix/listener.ts:415][E: packages/server/src/transports/unix/listener.ts:416][E: packages/server/src/transports/unix/listener.ts:417][E: packages/server/src/transports/unix/listener.ts:419]

## Socket ownership lifecycle

listener 不直接 bind public path：它先在同目录计算 deterministic private bind path，创建 parent directory，probe/remove stale public/private sockets，bind private path，再 hard-link 到 public path 并 chmod。[E: packages/server/src/transports/unix/listener.ts:60][E: packages/server/src/transports/unix/listener.ts:65][E: packages/server/src/transports/unix/listener.ts:67][E: packages/server/src/transports/unix/listener.ts:68][E: packages/server/src/transports/unix/listener.ts:69][E: packages/server/src/transports/unix/listener.ts:71][E: packages/server/src/transports/unix/listener.ts:86][E: packages/server/src/transports/unix/listener.ts:88][E: packages/server/src/transports/unix/listener.ts:90][E: packages/server/src/transports/unix/listener.ts:91][E: packages/server/src/transports/unix/listener.ts:92]

stale cleanup 先 `lstat()` 并拒绝 non-socket；active probe connect 成功或 timeout 时视为 live，不 unlink。确认为 stale 后先 rename 到随机 preserved path，再核 dev/inode identity 才删除。[E: packages/server/src/transports/unix/listener.ts:312][E: packages/server/src/transports/unix/listener.ts:315][E: packages/server/src/transports/unix/listener.ts:320][E: packages/server/src/transports/unix/listener.ts:321][E: packages/server/src/transports/unix/listener.ts:323][E: packages/server/src/transports/unix/listener.ts:325][E: packages/server/src/transports/unix/listener.ts:330][E: packages/server/src/transports/unix/listener.ts:331][E: packages/server/src/transports/unix/listener.ts:340]

shutdown 同样核对 public path 的 dev/inode；若 path 已被替换则不删除 replacement。自己的 socket 先 rename 到 preserved path，再确认 identity 后 unlink。[E: packages/server/src/transports/unix/listener.ts:160][E: packages/server/src/transports/unix/listener.ts:161][E: packages/server/src/transports/unix/listener.ts:166][E: packages/server/src/transports/unix/listener.ts:171][E: packages/server/src/transports/unix/listener.ts:173][E: packages/server/src/transports/unix/listener.ts:175][E: packages/server/src/transports/unix/listener.ts:180][E: packages/server/src/transports/unix/listener.ts:181][E: packages/server/src/transports/unix/listener.ts:182]

## Connection send/close

accepted socket 被包装为 `UnixByteConnection`，data/error/close 映射到 server handler；listener close 同时停止 accept、关闭 active connections 并清理 owned socket paths。[E: packages/server/src/transports/unix/listener.ts:108][E: packages/server/src/transports/unix/listener.ts:113][E: packages/server/src/transports/unix/listener.ts:124][E: packages/server/src/transports/unix/listener.ts:125][E: packages/server/src/transports/unix/listener.ts:128][E: packages/server/src/transports/unix/listener.ts:132][E: packages/server/src/transports/unix/listener.ts:139][E: packages/server/src/transports/unix/listener.ts:142][E: packages/server/src/transports/unix/listener.ts:144]

send queue 复制 bytes、按 Promise tail 保序并限制 pending bytes。[E: packages/server/src/transports/unix/listener.ts:225][E: packages/server/src/transports/unix/listener.ts:229][E: packages/server/src/transports/unix/listener.ts:230][E: packages/server/src/transports/unix/listener.ts:233][E: packages/server/src/transports/unix/listener.ts:234][E: packages/server/src/transports/unix/listener.ts:235][E: packages/server/src/transports/unix/listener.ts:239]

`close(finalChunk)` 先进入 closing，等待 write tail settle，再用 `socket.end(finalBytes)` graceful half-close；超时后 destroy。由于 queued write 真正执行时会再次检查 closing，尚未开始的排队 output 可能被拒绝，因此这里不能推导 final chunk 一定排在全部 pending output 之后。[E: packages/server/src/transports/unix/listener.ts:243][E: packages/server/src/transports/unix/listener.ts:249][E: packages/server/src/transports/unix/listener.ts:250][E: packages/server/src/transports/unix/listener.ts:253][E: packages/server/src/transports/unix/listener.ts:254][E: packages/server/src/transports/unix/listener.ts:259][E: packages/server/src/transports/unix/listener.ts:265][E: packages/server/src/transports/unix/listener.ts:266][E: packages/server/src/transports/unix/listener.ts:283][E: packages/server/src/transports/unix/listener.ts:284][E: packages/server/src/transports/unix/listener.ts:285]

## Gotcha

- `mode` 只接受 `0..0o777`；Windows 上 chmod 被跳过，但 listener 没有像 client Unix factory 一样显式拒绝 Windows。[E: packages/server/src/transports/unix/listener.ts:378][E: packages/server/src/transports/unix/listener.ts:379][E: packages/server/src/transports/unix/listener.ts:407][E: packages/server/src/transports/unix/listener.ts:408][I]
- live probe timeout 被保守视为 socket live，优先避免误删可能仍在服务的 endpoint。[E: packages/server/src/transports/unix/listener.ts:373][I]
- Unix listener 的 path/mode 是 filesystem access-control 边界；源码没有跨进程 socket arbitration，也没有从已删除的 legacy JSONL IPC 做自动 migration。[I]
- 这里的“authorized”依赖 filesystem path/mode，而不是 protocol bearer token；若部署环境允许不受信任进程访问 socket，应用必须在 transport/listener 层增加更强的认证。[E: packages/server/README.md:42][E: packages/server/src/transports/unix/listener.ts:407][I]

## Sources

- packages/server/package.json
- packages/server/README.md
- packages/server/src/transports/unix/index.ts
- packages/server/src/transports/unix/types.ts
- packages/server/src/transports/unix/preset.ts
- packages/server/src/transports/unix/listener.ts
- packages/server/test/unix.test.ts

## 相关

- [subsys.server.session-server](session-server.md) - transport-neutral server core。
- [subsys.client.unix-transport](../client/unix-transport.md) - client socket transport。
- [subsys.protocol.cbor-framing](../protocol/cbor-framing.md) - framed-CBOR byte contract。
