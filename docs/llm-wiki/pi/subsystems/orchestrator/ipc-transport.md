---
id: subsys.orchestrator.ipc-transport
title: IPC 传输层(Unix socket)
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/ipc/server.ts
  - packages/orchestrator/src/ipc/client.ts
  - packages/orchestrator/src/ipc/protocol.ts
  - packages/orchestrator/src/config.ts
  - packages/orchestrator/README.md
  - packages/orchestrator/package.json
symbols:
  - startIpcServer
  - sendIpcRequest
related:
  - subsys.orchestrator.message-protocol
  - subsys.orchestrator.request-handler
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.orchestrator.ipc-transport` 是 pi orchestrator 的本机 IPC transport: `startIpcServer()` 用 `getSocketPath()` 得到的 `orchestrator.sock` path 调用 `server.listen(socketPath)`, 并按 newline-delimited JSON 读取请求; `sendIpcRequest()` 连接同一路径, 写入一次 encoded request, 等待第一行响应; orchestrator 包整体仍标为 experimental, CLI/API/行为尚不稳定 [E: packages/orchestrator/src/ipc/server.ts:47] [E: packages/orchestrator/src/ipc/server.ts:55] [E: packages/orchestrator/src/ipc/server.ts:60] [E: packages/orchestrator/src/ipc/server.ts:153] [E: packages/orchestrator/src/config.ts:68] [E: packages/orchestrator/src/ipc/client.ts:6] [E: packages/orchestrator/src/ipc/client.ts:9] [E: packages/orchestrator/src/ipc/client.ts:19] [E: packages/orchestrator/src/ipc/client.ts:24] [E: packages/orchestrator/README.md:3] [I]。

## 能回答的问题

- orchestrator IPC 使用什么 socket path, 是否走 TCP host/port?
- `sendIpcRequest()` 与 `startIpcServer()` 的一问一答 framing 是什么?
- `rpc_stream` 为什么不是普通 request/response, server 如何把连接升级成长期流?
- server 遇到 JSON parse、handler throw、unknown instance 或 stale socket 时怎么报错?
- client 在连接错误、响应 parse 失败、socket 提前关闭时怎么 reject?
- 这个 IPC transport 的稳定性级别是什么?

## 职责边界

`startIpcServer(handler)` 在本文件中处理 socket lifecycle、newline framing、transport-level error response, 并把已解析的 `OrchestratorRequest` 交给 `IpcRequestHandler`; 具体 spawn/list/stop/status/rpc 业务语义属于 [subsys.orchestrator.request-handler](request-handler.md), 因为 handler overload 覆盖这些 request type 并另暴露 `openRpcStream()` [E: packages/orchestrator/src/ipc/server.ts:25] [E: packages/orchestrator/src/ipc/server.ts:32] [E: packages/orchestrator/src/ipc/server.ts:33] [E: packages/orchestrator/src/ipc/server.ts:67] [E: packages/orchestrator/src/ipc/server.ts:138] [E: packages/orchestrator/src/ipc/server.ts:146] [I]。

`sendIpcRequest(request)` 是 one-shot client helper: 它连接 socket path, 在 `"connect"` 后写入 encoded request, 收到第一行非空响应后 parse 并 resolve, 随后 cleanup listeners 并 `socket.end()` [E: packages/orchestrator/src/ipc/client.ts:6] [E: packages/orchestrator/src/ipc/client.ts:9] [E: packages/orchestrator/src/ipc/client.ts:18] [E: packages/orchestrator/src/ipc/client.ts:19] [E: packages/orchestrator/src/ipc/client.ts:24] [E: packages/orchestrator/src/ipc/client.ts:29] [E: packages/orchestrator/src/ipc/client.ts:35] [E: packages/orchestrator/src/ipc/client.ts:36] [E: packages/orchestrator/src/ipc/client.ts:14] [E: packages/orchestrator/src/ipc/client.ts:15]。

IPC message shape 与 `encodeMessage()`/`parseRequestLine()`/`parseResponseLine()` 的协议类型属于 [subsys.orchestrator.message-protocol](message-protocol.md); 本节点只解释这些 protocol helpers 怎样被 socket transport 使用 [E: packages/orchestrator/src/ipc/protocol.ts:130] [E: packages/orchestrator/src/ipc/protocol.ts:134] [E: packages/orchestrator/src/ipc/protocol.ts:139] [I]。

## 关键文件

- `packages/orchestrator/src/ipc/server.ts`: `IpcRequestHandler` contract、`startIpcServer()`、stale socket removal 和 live socket probe 的权威实现 [E: packages/orchestrator/src/ipc/server.ts:25] [E: packages/orchestrator/src/ipc/server.ts:46] [E: packages/orchestrator/src/ipc/server.ts:162] [E: packages/orchestrator/src/ipc/server.ts:175]。
- `packages/orchestrator/src/ipc/client.ts`: `sendIpcRequest()` 的权威实现, 覆盖 connect/write/read/parse/reject lifecycle [E: packages/orchestrator/src/ipc/client.ts:5] [E: packages/orchestrator/src/ipc/client.ts:18] [E: packages/orchestrator/src/ipc/client.ts:22] [E: packages/orchestrator/src/ipc/client.ts:45] [E: packages/orchestrator/src/ipc/client.ts:54]。
- `packages/orchestrator/src/ipc/protocol.ts`: transport framing 的 shared codec, `encodeMessage()` 把任意 protocol message JSON.stringify 后追加 `\n`, parse helpers 只 JSON.parse 并 TypeScript cast [E: packages/orchestrator/src/ipc/protocol.ts:122] [E: packages/orchestrator/src/ipc/protocol.ts:130] [E: packages/orchestrator/src/ipc/protocol.ts:131] [E: packages/orchestrator/src/ipc/protocol.ts:134] [E: packages/orchestrator/src/ipc/protocol.ts:135] [E: packages/orchestrator/src/ipc/protocol.ts:139] [E: packages/orchestrator/src/ipc/protocol.ts:140]。
- `packages/orchestrator/src/config.ts`: `getSocketPath()` 返回 orchestrator dir 下的 `orchestrator.sock`, orchestrator dir 默认来自 `PI_CONFIG_DIR` 或 home 下 `.pi/orchestrator`, 可被 `PI_ORCHESTRATOR_DIR` 覆盖 [E: packages/orchestrator/src/config.ts:45] [E: packages/orchestrator/src/config.ts:46] [E: packages/orchestrator/src/config.ts:47] [E: packages/orchestrator/src/config.ts:51] [E: packages/orchestrator/src/config.ts:52] [E: packages/orchestrator/src/config.ts:67] [E: packages/orchestrator/src/config.ts:68]。
- `packages/orchestrator/README.md` 与 `packages/orchestrator/package.json`: orchestrator 包自述为 experimental, package description 也写作 experimental orchestrator package [E: packages/orchestrator/README.md:3] [E: packages/orchestrator/package.json:4]。

## 数据模型

`IpcRequestHandler` 是 transport 与业务层的边界 interface: 对 `SpawnRequest`、`ListRequest`、`StopRequest`、`StatusRequest`、`RpcRequest`、`RpcStreamRequest` 分别声明 overload, 返回对应 response 或 `ErrorResponse`; 同一个 interface 还要求 `openRpcStream(instanceId, onResponse, onSessionEvent, onUiRequest)` 返回可处理后续 stream request 的 handle 或 `undefined` [E: packages/orchestrator/src/ipc/server.ts:25] [E: packages/orchestrator/src/ipc/server.ts:26] [E: packages/orchestrator/src/ipc/server.ts:27] [E: packages/orchestrator/src/ipc/server.ts:28] [E: packages/orchestrator/src/ipc/server.ts:29] [E: packages/orchestrator/src/ipc/server.ts:30] [E: packages/orchestrator/src/ipc/server.ts:31] [E: packages/orchestrator/src/ipc/server.ts:33] [E: packages/orchestrator/src/ipc/server.ts:40] [E: packages/orchestrator/src/ipc/server.ts:41] [E: packages/orchestrator/src/ipc/server.ts:43]。

普通 request/response 的 wire frame 是一行 JSON: server 侧累计 `buffer`, 找到第一个 `\n` 后取 `buffer.slice(0, newlineIndex).trim()`, client 侧同样累计 response buffer 并以第一行非空内容调用 `parseResponseLine()` [E: packages/orchestrator/src/ipc/server.ts:51] [E: packages/orchestrator/src/ipc/server.ts:54] [E: packages/orchestrator/src/ipc/server.ts:55] [E: packages/orchestrator/src/ipc/server.ts:60] [E: packages/orchestrator/src/ipc/client.ts:10] [E: packages/orchestrator/src/ipc/client.ts:23] [E: packages/orchestrator/src/ipc/client.ts:24] [E: packages/orchestrator/src/ipc/client.ts:29] [E: packages/orchestrator/src/ipc/client.ts:30] [E: packages/orchestrator/src/ipc/client.ts:36]。

`rpc_stream` 使用同一个 newline JSON codec, 但连接不会在 first response 后结束: server 写入 `rpc_ready`, 然后继续在同一 socket 上循环读取多行 client JSON 并把 coding-agent RPC responses、session events 和 extension UI requests 写回同一 socket [E: packages/orchestrator/src/ipc/server.ts:68] [E: packages/orchestrator/src/ipc/server.ts:95] [E: packages/orchestrator/src/ipc/server.ts:97] [E: packages/orchestrator/src/ipc/server.ts:99] [E: packages/orchestrator/src/ipc/server.ts:104] [E: packages/orchestrator/src/ipc/server.ts:112] [E: packages/orchestrator/src/ipc/server.ts:79] [E: packages/orchestrator/src/ipc/server.ts:82] [E: packages/orchestrator/src/ipc/server.ts:85] [I]。

## 控制流

1. `startIpcServer@packages/orchestrator/src/ipc/server.ts:46` 先通过 `getSocketPath()` 取得 socket path, 再调用 `removeStaleSocketIfNeeded(socketPath)` 清理非 live 的旧 socket 文件 [E: packages/orchestrator/src/ipc/server.ts:47] [E: packages/orchestrator/src/ipc/server.ts:48]。
2. `removeStaleSocketIfNeeded@packages/orchestrator/src/ipc/server.ts:162` 若 path 不存在直接返回; 若 `isSocketLive()` 能连上, 抛出 `orchestrator is already running: <path>`; 若不是 live socket, 用 `unlinkSync(socketPath)` 删除 stale 文件 [E: packages/orchestrator/src/ipc/server.ts:163] [E: packages/orchestrator/src/ipc/server.ts:167] [E: packages/orchestrator/src/ipc/server.ts:168] [E: packages/orchestrator/src/ipc/server.ts:169] [E: packages/orchestrator/src/ipc/server.ts:172]。
3. `isSocketLive@packages/orchestrator/src/ipc/server.ts:175` 用 `createConnection(socketPath)` 探测, `"connect"` 判定 live; `ECONNREFUSED`、`ENOENT`、`EPIPE`、`ECONNRESET` 判定非 live; 其它 error reject 给 caller [E: packages/orchestrator/src/ipc/server.ts:177] [E: packages/orchestrator/src/ipc/server.ts:190] [E: packages/orchestrator/src/ipc/server.ts:191] [E: packages/orchestrator/src/ipc/server.ts:192] [E: packages/orchestrator/src/ipc/server.ts:193] [E: packages/orchestrator/src/ipc/server.ts:196] [E: packages/orchestrator/src/ipc/server.ts:197] [E: packages/orchestrator/src/ipc/server.ts:206]。
4. `createServer@packages/orchestrator/src/ipc/server.ts:50` 为每个 client socket 维护独立 `buffer`, `server.listen(socketPath)` 成功后 resolve `Promise<Server>`; 这里传入 path string 而不是 host/port, 因此是 Node IPC socket path 监听, 在当前配置下 path 以 `orchestrator.sock` 结尾 [E: packages/orchestrator/src/ipc/server.ts:50] [E: packages/orchestrator/src/ipc/server.ts:51] [E: packages/orchestrator/src/ipc/server.ts:151] [E: packages/orchestrator/src/ipc/server.ts:153] [E: packages/orchestrator/src/ipc/server.ts:155] [E: packages/orchestrator/src/config.ts:67] [E: packages/orchestrator/src/config.ts:68] [I]。
5. 普通请求路径: server 收到第一行非空 JSON 后调用 `parseRequestLine(line)`, 非 `rpc_stream` 时 `await handler(request)`, 再 `socket.end(encodeMessage(response))`; 这是一连接一次 response 的 transport path [E: packages/orchestrator/src/ipc/server.ts:67] [E: packages/orchestrator/src/ipc/server.ts:68] [E: packages/orchestrator/src/ipc/server.ts:138] [E: packages/orchestrator/src/ipc/server.ts:139] [I]。
6. 普通错误路径: request parse 或 handler throw 会被 outer `catch` 包成 `{ type: "error", ok: false, error: message }` 并通过 `socket.end(encodeMessage(response))` 返回; 这个路径不区分 parse error 和业务 handler error [E: packages/orchestrator/src/ipc/server.ts:140] [E: packages/orchestrator/src/ipc/server.ts:141] [E: packages/orchestrator/src/ipc/server.ts:142] [E: packages/orchestrator/src/ipc/server.ts:143] [E: packages/orchestrator/src/ipc/server.ts:144] [E: packages/orchestrator/src/ipc/server.ts:146] [I]。
7. `rpc_stream` handshake: server 先把 `RpcStreamRequest` 交给 handler, 如果 response 不是 ok 的 `rpc_ready` 或缺 instance, 直接 `socket.end(encodeMessage(response))`; 只有 ready 后才移除旧 `"data"` listeners 并调用 `handler.openRpcStream()` [E: packages/orchestrator/src/ipc/server.ts:68] [E: packages/orchestrator/src/ipc/server.ts:69] [E: packages/orchestrator/src/ipc/server.ts:70] [E: packages/orchestrator/src/ipc/server.ts:71] [E: packages/orchestrator/src/ipc/server.ts:75] [E: packages/orchestrator/src/ipc/server.ts:76]。
8. `rpc_stream` callback wiring: `openRpcStream()` 的三个 callback 分别把 `RpcResponse`、`AgentSessionEvent`、`RpcExtensionUIRequest` 用 `socket.write(encodeMessage(...))` 推回 client; 如果 `openRpcStream()` 返回 `undefined`, server 写回 `Unknown instance: <id>` error 并结束 socket [E: packages/orchestrator/src/ipc/server.ts:76] [E: packages/orchestrator/src/ipc/server.ts:79] [E: packages/orchestrator/src/ipc/server.ts:82] [E: packages/orchestrator/src/ipc/server.ts:85] [E: packages/orchestrator/src/ipc/server.ts:88] [E: packages/orchestrator/src/ipc/server.ts:89] [E: packages/orchestrator/src/ipc/server.ts:90]。
9. `rpc_stream` inbound loop: server 写出 ready response 后, 用 `rpcRequestQueue = rpcRequestQueue.then(...)` 串行处理每一行后续 client JSON; `JSON.parse(rpcLine)` 或 `rpcStream.handleRequest()` throw 会写回 error frame, queue 自身 reject 也会写回 error frame [E: packages/orchestrator/src/ipc/server.ts:95] [E: packages/orchestrator/src/ipc/server.ts:96] [E: packages/orchestrator/src/ipc/server.ts:99] [E: packages/orchestrator/src/ipc/server.ts:104] [E: packages/orchestrator/src/ipc/server.ts:109] [E: packages/orchestrator/src/ipc/server.ts:112] [E: packages/orchestrator/src/ipc/server.ts:113] [E: packages/orchestrator/src/ipc/server.ts:114] [E: packages/orchestrator/src/ipc/server.ts:123] [E: packages/orchestrator/src/ipc/server.ts:124]。
10. `rpc_stream` close path: server 在 socket `"close"` 时调用 `rpcStream.close()`, 所以 stream handle 的 cleanup 由 transport close 触发 [E: packages/orchestrator/src/ipc/server.ts:134]。
11. `sendIpcRequest@packages/orchestrator/src/ipc/client.ts:5` 创建 socket, 写 request, 收到第一行时把 `settled = true`, resolve parse result 并 cleanup; parse error 走 reject 并 cleanup [E: packages/orchestrator/src/ipc/client.ts:8] [E: packages/orchestrator/src/ipc/client.ts:9] [E: packages/orchestrator/src/ipc/client.ts:18] [E: packages/orchestrator/src/ipc/client.ts:19] [E: packages/orchestrator/src/ipc/client.ts:34] [E: packages/orchestrator/src/ipc/client.ts:35] [E: packages/orchestrator/src/ipc/client.ts:36] [E: packages/orchestrator/src/ipc/client.ts:38] [E: packages/orchestrator/src/ipc/client.ts:40]。
12. `sendIpcRequest` client error path: socket `"error"` 在未 settled 时 reject 原 error; socket `"end"` 在未 settled 时 reject `Orchestrator socket closed before a response was received: <socketPath>`; settled 后重复 error/end 被忽略 [E: packages/orchestrator/src/ipc/client.ts:45] [E: packages/orchestrator/src/ipc/client.ts:46] [E: packages/orchestrator/src/ipc/client.ts:49] [E: packages/orchestrator/src/ipc/client.ts:50] [E: packages/orchestrator/src/ipc/client.ts:54] [E: packages/orchestrator/src/ipc/client.ts:55] [E: packages/orchestrator/src/ipc/client.ts:58] [E: packages/orchestrator/src/ipc/client.ts:59]。

## 设计动机与权衡

Transport framing 在源码中呈现为 newline-delimited JSON, 不是 length-prefix binary framing: `encodeMessage()` 固定追加 `\n`, server/client 都用 `buffer.indexOf("\n")` 找 frame 边界; payload 中的换行由 JSON.stringify 转义, 接收端也没有独立的最大 frame 长度限制 [E: packages/orchestrator/src/ipc/protocol.ts:130] [E: packages/orchestrator/src/ipc/protocol.ts:131] [E: packages/orchestrator/src/ipc/server.ts:55] [E: packages/orchestrator/src/ipc/client.ts:24] [I]。

普通 request path 关闭 socket, `rpc_stream` path 保留 socket: list/status/stop/spawn 等非 stream request 走短连接控制命令, `rpc_stream` 走长期双向 stream; 两者复用同一个 socket path 与 codec, 但 lifecycle 和 error handling 明显不同 [E: packages/orchestrator/src/ipc/server.ts:68] [E: packages/orchestrator/src/ipc/server.ts:95] [E: packages/orchestrator/src/ipc/server.ts:97] [E: packages/orchestrator/src/ipc/server.ts:134] [E: packages/orchestrator/src/ipc/server.ts:138] [E: packages/orchestrator/src/ipc/server.ts:139] [I]。

`rpcRequestQueue` 串行化后续 stream inbound messages, 避免同一 `rpcStream.handleRequest()` handle 被多个 socket data frames 并发调用; 这个顺序保证来自 Promise chain 结构, 不是来自 Node socket 本身的 backpressure API [E: packages/orchestrator/src/ipc/server.ts:96] [E: packages/orchestrator/src/ipc/server.ts:109] [E: packages/orchestrator/src/ipc/server.ts:110] [E: packages/orchestrator/src/ipc/server.ts:112] [I]。

Stale socket cleanup 先 probe 再 unlink, 说明 server startup 更偏向避免误删 live orchestrator socket: live probe 成功会抛 `already running`, 只有拒连/不存在/pipe reset 这类非 live 状态才删除 path [E: packages/orchestrator/src/ipc/server.ts:167] [E: packages/orchestrator/src/ipc/server.ts:168] [E: packages/orchestrator/src/ipc/server.ts:169] [E: packages/orchestrator/src/ipc/server.ts:172] [I]。

## Gotcha

- Orchestrator 包是 experimental: README 明确说 CLI、API 和 behavior 尚不稳定, package description 也标 experimental; 本节点不能把 IPC path、message shape 或 error 文本描述成长期兼容承诺 [E: packages/orchestrator/README.md:3] [E: packages/orchestrator/package.json:4] [I]。
- `parseRequestLine()` 和 `parseResponseLine()` 只是 `JSON.parse()` 后 TypeScript cast, 没有 runtime schema validation; request/response shape 的正确性主要来自调用方与 TypeScript 类型, 不是 transport 层校验 [E: packages/orchestrator/src/ipc/protocol.ts:134] [E: packages/orchestrator/src/ipc/protocol.ts:135] [E: packages/orchestrator/src/ipc/protocol.ts:139] [E: packages/orchestrator/src/ipc/protocol.ts:140] [I]。
- `sendIpcRequest()` 没有 timeout 参数、AbortSignal 或 retry 逻辑; 如果 peer 连接后既不返回 response 也不断开, 这个 helper 本身没有超时退出机制 [E: packages/orchestrator/src/ipc/client.ts:5] [E: packages/orchestrator/src/ipc/client.ts:8] [E: packages/orchestrator/src/ipc/client.ts:45] [E: packages/orchestrator/src/ipc/client.ts:54] [I]。
- 普通 server path 只消费第一行 request 后结束 socket; 如果 client 在同一连接里发送多行普通 request, transport 没有把它们当 batch 处理 [E: packages/orchestrator/src/ipc/server.ts:55] [E: packages/orchestrator/src/ipc/server.ts:60] [E: packages/orchestrator/src/ipc/server.ts:138] [E: packages/orchestrator/src/ipc/server.ts:139] [I]。
- `socket.write()` 的返回值没有被检查, `rpc_stream` outbound callback 没有显式 drain/backpressure handling; 大量 event/response burst 的背压行为依赖 Node socket 默认机制 [E: packages/orchestrator/src/ipc/server.ts:79] [E: packages/orchestrator/src/ipc/server.ts:82] [E: packages/orchestrator/src/ipc/server.ts:85] [I]。
- Socket path 来自 user config dir 下的 `orchestrator.sock`; 源码没有在 `getSocketPath()` 中处理 Windows named-pipe path 形式, 因此本节点按 Unix-style socket path 描述当前实现, 不推断 native Windows IPC 支持状态 [E: packages/orchestrator/src/config.ts:67] [E: packages/orchestrator/src/config.ts:68] [I]。

## 跨包边界

[subsys.orchestrator.message-protocol](message-protocol.md) 是 IPC/RPC 消息协议节点: 它应权威覆盖 `OrchestratorRequest`、`OrchestratorResponse`、`RpcClientMessage`、`RpcServerMessage` 和 `encodeMessage()`/parse helpers; 本节点只说明 transport 怎样发送与接收这些 message [E: packages/orchestrator/src/ipc/protocol.ts:52] [E: packages/orchestrator/src/ipc/protocol.ts:114] [E: packages/orchestrator/src/ipc/protocol.ts:115] [E: packages/orchestrator/src/ipc/protocol.ts:116] [E: packages/orchestrator/src/ipc/protocol.ts:130]。

[subsys.orchestrator.request-handler](request-handler.md) 是请求处理与桥接节点: 它应解释 `handleIpcRequest` 和 `openRpcStream` 怎样把 IPC request 接到 supervisor 与 pi-coding-agent RPC; 本节点只把 `handler(request)` 和 `handler.openRpcStream()` 当作 transport callback 调用 [E: packages/orchestrator/src/ipc/server.ts:69] [E: packages/orchestrator/src/ipc/server.ts:76] [E: packages/orchestrator/src/ipc/server.ts:112]。

`@earendil-works/pi-coding-agent` 是 cross-package type dependency: transport callbacks 的 stream payload 类型来自 coding-agent 的 `AgentSessionEvent`、`RpcResponse` 和 `RpcExtensionUIRequest`, 但这些 payload 的业务语义不在 orchestrator IPC transport 节点展开 [E: packages/orchestrator/src/ipc/server.ts:3] [E: packages/orchestrator/src/ipc/server.ts:35] [E: packages/orchestrator/src/ipc/server.ts:36] [E: packages/orchestrator/src/ipc/server.ts:37] [I]。

## Sources

- packages/orchestrator/src/ipc/server.ts
- packages/orchestrator/src/ipc/client.ts
- packages/orchestrator/src/ipc/protocol.ts
- packages/orchestrator/src/config.ts
- packages/orchestrator/README.md
- packages/orchestrator/package.json

## 相关

- [subsys.orchestrator.message-protocol](message-protocol.md): IPC/RPC message type、newline JSON codec 和 parse helper 的协议权威节点。
- [subsys.orchestrator.request-handler](request-handler.md): IPC request dispatch、supervisor bridge 与 `openRpcStream` 业务处理节点。
