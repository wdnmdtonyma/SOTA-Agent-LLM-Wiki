---
id: subsys.client.unix-transport
title: Client Unix-domain socket transport
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/package.json
  - packages/client/README.md
  - packages/client/src/unix.ts
  - packages/client/test/unix.test.ts
  - packages/client/test/unix-transport.test.ts
symbols:
  - createUnixTransportFactory
  - discoverUnixServers
  - UnixTransportOptions
  - UnixServerRoute
related:
  - subsys.client.remote-session-client
  - subsys.protocol.cbor-framing
  - subsys.server.unix-transport
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `@earendil-works/pi-client/unix` 是显式 opt-in 的 Node-compatible Unix-domain socket `ByteTransportFactory`，并提供按 `<serverId>.sock` 探测的 `discoverUnixServers()`。root `Client` 保持 runtime-neutral，Unix subpath 才 import `node:net` [E: packages/client/package.json:13] [E: packages/client/src/unix.ts:2] [E: packages/client/src/unix.ts:88]。

## 能回答的问题

- 如何把 `Client` 连到 Unix socket path？
- path 与 pending bytes 有哪些输入限制？
- `discoverUnixServers()` 如何从目录推出 `serverId` 并验证？
- send order、socket callback 与 drain backpressure 如何组合？
- remote close/error 与 local close 如何只产生一个 terminal signal？

## Factory 与连接

`UnixTransportOptions` 要求 `path`，可选 `maxPendingBytes`。`validateUnixTransportOptions()` 拒绝空 path、非正 safe-integer queue limit，以及 Windows [E: packages/client/src/unix.ts:96] [E: packages/client/src/unix.ts:173] [E: packages/client/src/unix.ts:175] [E: packages/client/src/unix.ts:99] [E: packages/client/test/unix-transport.test.ts:50]。实现没有 sockaddr_un 字节上限检查 [I]。

这个 built-in factory 没有 credential option；它只建立到配置 path 的 Unix socket。`Client` 要求 transport 在 resolve 前已经完成所需认证，因此 Unix deployment 的授权边界是 socket filesystem permissions 或外层 connection policy，不是 protocol hello token [E: packages/client/src/unix.ts:88] [E: packages/client/src/unix.ts:169] [E: packages/client/README.md:54] [I]。

默认 `maxPendingBytes` 是 `DEFAULT_MAX_FRAME_LENGTH * 4`；factory 每次调用 `connectUnixSocket()` 创建 fresh `node:net` connection [E: packages/client/src/unix.ts:95] [E: packages/client/src/unix.ts:169]。连接前 close/error 会 reject factory Promise；连接后 data 转为 zero-copy `Uint8Array` view，remote end/close 调 `onClose`，error 调 `onError` [E: packages/client/src/unix.ts:119] [E: packages/client/src/unix.ts:133] [E: packages/client/src/unix.ts:141]。

## Discovery

`discoverUnixServers({ directory, timeoutMs? })` 读目录里以 `.sock` 结尾且 stem 通过 `isServerId()` 的名字，拼成 `{ serverId, path }` [E: packages/client/src/unix.ts:37] [E: packages/client/src/unix.ts:133] [E: packages/client/src/unix.ts:135]。缺目录（`ENOENT`）返回空数组 [E: packages/client/src/unix.ts:49]。最多 16 路并发 probe；每条先 `lstat` 确认是 socket，再用真实 `Client` handshake 校验 advertised `serverId` [E: packages/client/src/unix.ts:17] [E: packages/client/src/unix.ts:61] [E: packages/client/src/unix.ts:69] [E: packages/client/src/unix.ts:240]。

timeout / `ProtocolValidationError` / 无 cause 的 `DisconnectedError` / `ServerError` code `version` / 常见 socket errno 被当成 stale 或非目标 server 而省略；其它 filesystem/socket 错误 reject 整个 discovery [E: packages/client/src/unix.ts:263] [E: packages/client/src/unix.ts:274] [E: packages/client/src/unix.ts:276]。结果按 `serverId` 排序 [E: packages/client/src/unix.ts:84]。测试锁住：畸形文件、非 socket、filename 与 hello `serverId` 不一致的 endpoint 都被忽略 [E: packages/client/test/unix.test.ts:112]。

默认 probe timeout 1000ms；`timeoutMs` 必须是 `1..2147483647` 的整数 [E: packages/client/src/unix.ts:94] [E: packages/client/src/unix.ts:119] [E: packages/client/src/unix.ts:120]。

## Ordered send 与 backpressure

`UnixByteTransport.send()` 在 enqueue 时验证 type/closed/pending limit，复制 caller bytes，再把 write 串到 `#writeTail`；pending count 在 write settle 后减少 [E: packages/client/src/unix.ts:162] [E: packages/client/src/unix.ts:165] [E: packages/client/src/unix.ts:166] [E: packages/client/src/unix.ts:169] [E: packages/client/src/unix.ts:170]。

单次 write Promise 同时等待 socket write callback；当 `socket.write()` 返回 false 时，还要等待 `drain` 才 resolve。close during write 会 reject [E: packages/client/src/unix.ts:219] [E: packages/client/src/unix.ts:227] [E: packages/client/src/unix.ts:215]。

local `close()` 幂等：先标 closed，再 `#markLocalClose()`（阻止把这次 destroy 回送为 remote `onClose`），然后 `socket.destroy()` [E: packages/client/src/unix.ts:179] [E: packages/client/src/unix.ts:182] [E: packages/client/src/unix.ts:183]。

## Gotcha

- queue limit 统计已经 enqueue 但尚未 settle 的 copied bytes，不包含 kernel/socket 内部不可见 buffer [E: packages/client/src/unix.ts:152] [E: packages/client/src/unix.ts:166] [I]。
- 自定义 `Client.maxFrameLength` 时，Unix factory 不会自动读取该 option；caller 应显式匹配 `maxPendingBytes` [E: packages/client/src/unix.ts:95] [E: packages/client/README.md:72] [I]。
- transport 支持 Bun 的依据是 Node-compatible `node:net` surface 与 package documentation；实现没有 Bun-specific branch [E: packages/client/src/unix.ts:2] [E: packages/client/README.md:48] [I]。
- `createUnixTransportFactory()` 不认证 peer。需要其它认证机制时应提供 custom `ByteTransportFactory` [E: packages/client/src/unix.ts:88] [E: packages/client/README.md:54]。
- discovery 是 read-only probe：它会短连并完成 hello，随后 `dispose()`；不要把它当成 attach [E: packages/client/src/unix.ts:259] [E: packages/client/src/unix.ts:279]。

## Sources

- packages/client/package.json
- packages/client/README.md
- packages/client/src/unix.ts
- packages/client/test/unix.test.ts
- packages/client/test/unix-transport.test.ts

## 相关

- [subsys.client.remote-session-client](remote-session-client.md) - `Client` 的 `ByteTransport` contract 与 `serverId` handshake。
- [subsys.protocol.cbor-framing](../protocol/cbor-framing.md) - frame size 与 decoder contract。
- [subsys.server.unix-transport](../server/unix-transport.md) - 对端 listener、`getUnixSocketPath()` 与 graceful close。
