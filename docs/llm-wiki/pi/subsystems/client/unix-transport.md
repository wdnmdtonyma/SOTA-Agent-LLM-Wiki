---
id: subsys.client.unix-transport
title: Client Unix-domain socket transport
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/package.json
  - packages/client/src/unix.ts
  - packages/client/test/unix.test.ts
symbols:
  - createUnixTransportFactory
  - UnixTransportOptions
related:
  - subsys.client.remote-session-client
  - subsys.protocol.cbor-framing
  - subsys.server.unix-transport
evidence: explicit
status: verified
updated: c1019d9202
---

> `@earendil-works/pi-client/unix` 是显式 opt-in 的 Node-compatible Unix-domain socket `ByteTransportFactory`；root client 保持 runtime-neutral，Unix subpath 才 import `node:net`。[E: packages/client/package.json:13][E: packages/client/package.json:14][E: packages/client/package.json:15][E: packages/client/src/unix.ts:1][E: packages/client/src/unix.ts:13][E: packages/client/src/unix.ts:13]

## 能回答的问题

- 如何把 `PiClient` 连接到 Unix socket path？
- path 与 pending bytes 有哪些输入限制？
- send order、socket callback 与 drain backpressure 如何组合？
- remote close/error 与 local close 如何只产生一个 terminal signal？
- transport queue limit 与 protocol frame limit 如何配合？

## Factory 与连接

`UnixTransportOptions` 要求 `path`，可选 `maxPendingBytes`；factory 拒绝空 path、超过平台 `sockaddr_un` UTF-8 byte limit 的 path、非正 safe-integer queue limit，以及 Windows。[E: packages/client/src/unix.ts:5][E: packages/client/src/unix.ts:7][E: packages/client/src/unix.ts:8][E: packages/client/src/unix.ts:9][E: packages/client/src/unix.ts:14][E: packages/client/src/unix.ts:15][E: packages/client/src/unix.ts:19][E: packages/client/src/unix.ts:20][E: packages/client/src/unix.ts:22]

默认 `maxPendingBytes` 是 protocol default max frame 的四倍；factory 每次调用 `connectUnixSocket()` 创建 fresh `node:net` connection。[E: packages/client/src/unix.ts:18][E: packages/client/src/unix.ts:23][E: packages/client/src/unix.ts:26][E: packages/client/src/unix.ts:32]

连接前 close/error 会 reject factory Promise；连接后 data 转为 zero-copy `Uint8Array` view，remote end/close 调 `onClose`，error 调 `onError`。[E: packages/client/src/unix.ts:36][E: packages/client/src/unix.ts:40][E: packages/client/src/unix.ts:41][E: packages/client/src/unix.ts:44][E: packages/client/src/unix.ts:47][E: packages/client/src/unix.ts:53][E: packages/client/src/unix.ts:54][E: packages/client/src/unix.ts:56][E: packages/client/src/unix.ts:58][E: packages/client/src/unix.ts:62][E: packages/client/src/unix.ts:63]

## Ordered send 与 backpressure

`UnixByteTransport.send()` 在 enqueue 时验证 type/closed/pending limit，复制 caller bytes，再把 write 串到 `#writeTail`；pending count 在 write settle 后减少。[E: packages/client/src/unix.ts:82][E: packages/client/src/unix.ts:83][E: packages/client/src/unix.ts:86][E: packages/client/src/unix.ts:87][E: packages/client/src/unix.ts:90][E: packages/client/src/unix.ts:91][E: packages/client/src/unix.ts:92][E: packages/client/src/unix.ts:93][E: packages/client/src/unix.ts:96]

单次 write Promise 同时等待 socket write callback；当 `socket.write()` 返回 false 时，还要等待 `drain` 才 resolve。close during write 会 reject。[E: packages/client/src/unix.ts:107][E: packages/client/src/unix.ts:109][E: packages/client/src/unix.ts:115][E: packages/client/src/unix.ts:116][E: packages/client/src/unix.ts:123][E: packages/client/src/unix.ts:136][E: packages/client/src/unix.ts:140][E: packages/client/src/unix.ts:145][E: packages/client/src/unix.ts:148][E: packages/client/src/unix.ts:149]

local `close()` 幂等，先标 closed/terminal 再 destroy socket，因此不会把自己的 close 回送为 remote terminal notification。[E: packages/client/src/unix.ts:100][E: packages/client/src/unix.ts:101][E: packages/client/src/unix.ts:102][E: packages/client/src/unix.ts:103][E: packages/client/src/unix.ts:104]

## Gotcha

- queue limit 统计已经 enqueue 但尚未 settle 的 copied bytes，不包含 kernel/socket 内部不可见 buffer。[E: packages/client/src/unix.ts:73][E: packages/client/src/unix.ts:87][E: packages/client/src/unix.ts:90][E: packages/client/src/unix.ts:94][I]
- client 默认 queue 是 `4 * DEFAULT_MAX_FRAME_LENGTH`；如果自定义 `PiClient.maxFrameLength`，Unix factory 不会自动读取该 client option，caller 应显式匹配 limits。[E: packages/client/src/unix.ts:18][I]
- transport 支持 Bun 的依据是 Node-compatible `node:net` surface 与 package documentation；实现没有 Bun-specific branch。[E: packages/client/src/unix.ts:1][I]

## Sources

- packages/client/package.json
- packages/client/src/unix.ts
- packages/client/test/unix.test.ts

## 相关

- [subsys.client.remote-session-client](remote-session-client.md) - `PiClient` 的 ByteTransport contract。
- [subsys.protocol.cbor-framing](../protocol/cbor-framing.md) - frame size 与 decoder contract。
- [subsys.server.unix-transport](../server/unix-transport.md) - 对端 listener、socket ownership 与 graceful close。
