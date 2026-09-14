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
  - packages/server/src/transports/unix/address.ts
  - packages/server/src/transports/unix/listener.ts
  - packages/server/test/unix.test.ts
symbols:
  - createUnixListener
  - createUnixServer
  - getUnixSocketPath
  - UnixListenerOptions
  - UnixServerOptions
related:
  - subsys.server.session-server
  - subsys.client.unix-transport
  - subsys.protocol.cbor-framing
evidence: explicit
status: verified
updated: 71dca871bc
---

> `@earendil-works/pi-server/unix` 同时提供 composable `createUnixListener()`、one-listener `createUnixServer()` 与 `getUnixSocketPath()`。它服务 framed-CBOR version-8 session protocol，不是 legacy JSONL IPC [E: packages/server/package.json:17] [E: packages/server/src/transports/unix/index.ts:2] [E: packages/server/src/transports/unix/preset.ts:12]。

## 能回答的问题

- Unix preset 如何组合 listener 与 `Server`？
- `getUnixSocketPath(serverId, directory)` 生成什么文件名？
- socket path、mode、frame/pending limit、graceful close timeout 默认是什么？
- startup 如何区分 live/stale socket 并避免删除普通文件？
- shutdown 如何避免 unlink 已被其它进程替换的 inode？
- final protocol error 如何在 close 时发送？

## Options 与 preset

`UnixListenerOptions` 要求 path，可选 mode、max pending bytes、graceful close timeout、matching max frame length 与 error observer；默认 socket mode 是 owner-only `0o600` [E: packages/server/src/transports/unix/types.ts:3] [E: packages/server/src/transports/unix/listener.ts:11] [E: packages/server/src/transports/unix/listener.ts:394]。

`UnixServerOptions` 由 `ServerOptions` 去掉 `listeners` 后与 listener options 合并，两侧都没有 token field。Unix preset 的 access-control 边界是 socket path/mode [E: packages/server/src/transports/unix/types.ts:15] [E: packages/server/src/types.ts:5] [E: packages/server/README.md:77]。accepted socket 直接构造 `UnixByteConnection` 并交给 core acceptor，没有 bearer token 或 OS peer-credential 检查；parent directory `mkdir(..., 0o700)`，public socket 再按配置 mode chmod [E: packages/server/src/transports/unix/listener.ts:53] [E: packages/server/src/transports/unix/listener.ts:100] [E: packages/server/src/transports/unix/listener.ts:111]。

`createUnixServer(host, options)` 拆开 listener options 与 core options，再 `new Server(host, { listeners: [listener], serverId, ... })`。custom max frame 必须同时传给 listener queue 与 server codec [E: packages/server/src/transports/unix/preset.ts:8] [E: packages/server/src/transports/unix/preset.ts:25] [E: packages/server/src/transports/unix/preset.ts:22]。

`getUnixSocketPath(serverId, serverDirectory)` 要求 canonical lowercase UUIDv4，返回 `join(directory, `${serverId}.sock`)`，与 client `discoverUnixServers()` 的文件名约定对齐 [E: packages/server/src/transports/unix/address.ts:4] [E: packages/server/src/transports/unix/address.ts:8]。

默认 `maxPendingBytes = maxFrameLength * 4`，且必须至少容纳 `maxFrameLength + 4` 的完整 frame；默认 graceful close timeout 是 5 seconds [E: packages/server/src/transports/unix/listener.ts:12] [E: packages/server/src/transports/unix/listener.ts:402] [E: packages/server/src/transports/unix/listener.ts:403]。

## Socket ownership lifecycle

listener 不直接 bind public path：它先在同目录计算 deterministic `bind-${sha256(path)[:8]}`，创建 parent directory，probe/remove stale public/private sockets，bind private path，再 hard-link 到 public path、chmod，然后 unlink 私有 bind path [E: packages/server/src/transports/unix/listener.ts:52] [E: packages/server/src/transports/unix/listener.ts:72] [E: packages/server/src/transports/unix/listener.ts:77] [E: packages/server/src/transports/unix/listener.ts:79] [E: packages/server/src/transports/unix/listener.ts:294]。

stale cleanup 先 `lstat()` 并拒绝 non-socket；active probe connect 成功或 1s timeout 时视为 live，不 unlink。确认为 stale 后先 rename 到随机 preserved path，再核 dev/inode 才删除 [E: packages/server/src/transports/unix/listener.ts:307] [E: packages/server/src/transports/unix/listener.ts:308] [E: packages/server/src/transports/unix/listener.ts:318] [E: packages/server/src/transports/unix/listener.ts:360]。

shutdown 同样核对 public path 的 dev/inode；若 path 已被替换则不删除 replacement。自己的 socket 先 rename 到 preserved path，再确认 identity 后 unlink [E: packages/server/src/transports/unix/listener.ts:147] [E: packages/server/src/transports/unix/listener.ts:158] [E: packages/server/src/transports/unix/listener.ts:162]。

## Connection send/close

accepted socket 被包装为 `UnixByteConnection`，data/error/close 映射到 server handler；listener close 同时停止 accept、关闭 active connections 并清理 owned socket paths [E: packages/server/src/transports/unix/listener.ts:95] [E: packages/server/src/transports/unix/listener.ts:126]。

send queue 复制 bytes、按 Promise tail 保序并限制 pending bytes [E: packages/server/src/transports/unix/listener.ts:212] [E: packages/server/src/transports/unix/listener.ts:217] [E: packages/server/src/transports/unix/listener.ts:220]。

`close(finalChunk)` 先进入 closing，等待 `writeTail` settle，再用 `socket.end(finalBytes)` graceful half-close；超时后 destroy。`write()` 在 `closing` 时拒绝新 write，因此尚未开始的排队 output 可能被拒绝，不能推导 final chunk 一定排在全部 pending output 之后 [E: packages/server/src/transports/unix/listener.ts:217] [E: packages/server/src/transports/unix/listener.ts:236] [E: packages/server/src/transports/unix/listener.ts:246] [E: packages/server/src/transports/unix/listener.ts:271]。

## Gotcha

- `mode` 只接受 `0..0o777`；Windows 上 chmod 被跳过，但 listener 没有像 client Unix factory 一样显式拒绝 Windows [E: packages/server/src/transports/unix/listener.ts:395] [E: packages/server/src/transports/unix/listener.ts:366] [I]。
- live probe timeout 被保守视为 socket live，优先避免误删可能仍在服务的 endpoint [E: packages/server/src/transports/unix/listener.ts:360] [I]。
- Unix listener 的 path/mode 是 filesystem access-control 边界；源码没有跨进程 socket arbitration，也没有从已删除的 legacy JSONL IPC 做自动 migration [I]。
- 这里的 “authorized” 依赖 filesystem path/mode，而不是 protocol bearer token。若部署允许不受信任进程访问 socket，应用必须在 transport/listener 层增加更强认证 [E: packages/server/README.md:77] [E: packages/server/src/transports/unix/listener.ts:394] [I]。

## Sources

- packages/server/package.json
- packages/server/README.md
- packages/server/src/transports/unix/index.ts
- packages/server/src/transports/unix/types.ts
- packages/server/src/transports/unix/preset.ts
- packages/server/src/transports/unix/address.ts
- packages/server/src/transports/unix/listener.ts
- packages/server/test/unix.test.ts

## 相关

- [subsys.server.session-server](session-server.md) - transport-neutral `Server` core。
- [subsys.client.unix-transport](../client/unix-transport.md) - client socket transport 与 `discoverUnixServers()`。
- [subsys.protocol.cbor-framing](../protocol/cbor-framing.md) - framed-CBOR byte contract。
