---
id: subsys.orchestrator.request-handler
title: 请求处理与桥接
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/handler.ts
  - packages/orchestrator/src/serve.ts
  - packages/orchestrator/src/ipc/server.ts
  - packages/orchestrator/src/ipc/protocol.ts
  - packages/orchestrator/package.json
symbols:
  - handleIpcRequest
  - openRpcStream
  - serve
related:
  - subsys.orchestrator.supervisor
  - subsys.orchestrator.ipc-transport
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.orchestrator.request-handler` 是 experimental orchestrator 的 IPC request facade: `serve()` 启动本地 IPC server, `handleIpcRequest()` 把一次性命令转给 `supervisor`, `openRpcStream()` 把长连接 RPC stream 桥接到 live coding-agent RPC process。

## 能回答的问题

- orchestrator server 进程启动时怎样把 IPC server、request handler 和 RPC stream handler 装配在一起?
- `handleIpcRequest()` 对 `spawn`、`list`、`status`、`stop`、`rpc`、`rpc_stream` 分别调用 supervisor 的哪个入口?
- 一次性 `rpc` 和长连接 `rpc_stream` 的响应形态有什么区别?
- `openRpcStream()` 怎样区分普通 `RpcCommand` 与 `extension_ui_response`?
- server shutdown 时如何关闭 IPC server、supervisor 和 Radius presence?
- 这个 orchestrator request-handler 的稳定性应该怎样标注?

## 职责边界

`serve()` 是进程级 server lifecycle 入口:它创建 socket 目录,把 `handleIpcRequest` 与 `openRpcStream` 合成 `startIpcServer()` 需要的 handler object,再做 restart recovery、Radius presence 启停、signal/error shutdown 和 keep-alive [E: packages/orchestrator/src/serve.ts:9] [E: packages/orchestrator/src/serve.ts:10] [E: packages/orchestrator/src/serve.ts:11] [E: packages/orchestrator/src/serve.ts:12] [E: packages/orchestrator/src/serve.ts:13] [E: packages/orchestrator/src/serve.ts:14] [E: packages/orchestrator/src/serve.ts:19] [E: packages/orchestrator/src/serve.ts:21] [E: packages/orchestrator/src/serve.ts:47] [E: packages/orchestrator/src/serve.ts:48] [E: packages/orchestrator/src/serve.ts:49]。

`handleIpcRequest()` 是一次性 request dispatcher:它按 `request.type` switch,把实例生命周期命令和单次 `rpc` 命令转给 module-level `supervisor`,并把 `InstanceRecord` 投影成 wire-facing `InstanceSummary` [E: packages/orchestrator/src/handler.ts:26] [E: packages/orchestrator/src/handler.ts:29] [E: packages/orchestrator/src/handler.ts:57] [E: packages/orchestrator/src/handler.ts:58]。它不创建 socket、不解析 JSONL、不直接管理 child process;这些分别属于 `subsys.orchestrator.ipc-transport` 和 `subsys.orchestrator.supervisor` [E: packages/orchestrator/src/serve.ts:12] [E: packages/orchestrator/src/ipc/server.ts:46] [E: packages/orchestrator/src/ipc/server.ts:67] [E: packages/orchestrator/src/handler.ts:60] [I]。

`openRpcStream()` 是 stream bridge facade:它要求 `supervisor.openRpcStream()` 返回 live handle,然后把 IPC stream 上收到的 `RpcCommand | RpcExtensionUIResponse` 分流到 `handle.handleRpc()` 或 `handle.handleUiResponse()`;普通 RPC response 会通过传入的 `onResponse` 回写给 IPC transport [E: packages/orchestrator/src/handler.ts:132] [E: packages/orchestrator/src/handler.ts:143] [E: packages/orchestrator/src/handler.ts:149] [E: packages/orchestrator/src/handler.ts:150] [E: packages/orchestrator/src/handler.ts:151] [E: packages/orchestrator/src/handler.ts:154] [E: packages/orchestrator/src/handler.ts:155]。

稳定性上,本包 package description 明确写成 `experimental orchestrator package for pi`;所以本节点把 request-handler 视为 experimental surface,即实现可读但不应假设 wire/API 已稳定 [E: packages/orchestrator/package.json:4] [I]。

## 关键文件

- `packages/orchestrator/src/serve.ts`: `serve()` 把 IPC server handler object 装好,恢复上次实例状态,可选启动 Radius integration,并注册 shutdown handlers [E: packages/orchestrator/src/serve.ts:9] [E: packages/orchestrator/src/serve.ts:12] [E: packages/orchestrator/src/serve.ts:19] [E: packages/orchestrator/src/serve.ts:20] [E: packages/orchestrator/src/serve.ts:39] [E: packages/orchestrator/src/serve.ts:59]。
- `packages/orchestrator/src/handler.ts`: `handleIpcRequest()` 覆盖一次性 request dispatch,`openRpcStream()` 覆盖长连接 stream bridge [E: packages/orchestrator/src/handler.ts:57] [E: packages/orchestrator/src/handler.ts:132]。
- `packages/orchestrator/src/ipc/server.ts`: `startIpcServer()` 是实际 IPC transport,负责 socket data、JSONL parse、`rpc_stream` 升级和 stream close cleanup;本节点只引用它解释 `serve()` 装配后的调用边界 [E: packages/orchestrator/src/ipc/server.ts:46] [E: packages/orchestrator/src/ipc/server.ts:50] [E: packages/orchestrator/src/ipc/server.ts:53] [E: packages/orchestrator/src/ipc/server.ts:67] [E: packages/orchestrator/src/ipc/server.ts:68] [E: packages/orchestrator/src/ipc/server.ts:134]。

## 数据模型

`OrchestratorRequest` 的 request union 包含 `spawn`、`list`、`stop`、`status`、`rpc` 和 `rpc_stream`;其中 `rpc` 携带 `instanceId` 与 `RpcCommand`,而 `rpc_stream` 只携带 `instanceId` 用来升级长连接 [E: packages/orchestrator/src/ipc/protocol.ts:32] [E: packages/orchestrator/src/ipc/protocol.ts:33] [E: packages/orchestrator/src/ipc/protocol.ts:34] [E: packages/orchestrator/src/ipc/protocol.ts:35] [E: packages/orchestrator/src/ipc/protocol.ts:38] [E: packages/orchestrator/src/ipc/protocol.ts:39] [E: packages/orchestrator/src/ipc/protocol.ts:40] [E: packages/orchestrator/src/ipc/protocol.ts:43] [E: packages/orchestrator/src/ipc/protocol.ts:44] [E: packages/orchestrator/src/ipc/protocol.ts:45] [E: packages/orchestrator/src/ipc/protocol.ts:46] [E: packages/orchestrator/src/ipc/protocol.ts:47] [E: packages/orchestrator/src/ipc/protocol.ts:48] [E: packages/orchestrator/src/ipc/protocol.ts:49] [E: packages/orchestrator/src/ipc/protocol.ts:52]。

`InstanceSummary` 是 handler 暴露给 IPC client 的实例摘要,包含 `id`、`status`、`cwd`、`label`、`sessionId`、`sessionFile` 和 `radiusPiId`;`toInstanceSummary()` 从 internal `InstanceRecord` 复制这些字段,没有携带 `createdAt` 或 `lastSeenAt` [E: packages/orchestrator/src/ipc/protocol.ts:54] [E: packages/orchestrator/src/ipc/protocol.ts:55] [E: packages/orchestrator/src/ipc/protocol.ts:56] [E: packages/orchestrator/src/ipc/protocol.ts:57] [E: packages/orchestrator/src/ipc/protocol.ts:58] [E: packages/orchestrator/src/ipc/protocol.ts:59] [E: packages/orchestrator/src/ipc/protocol.ts:60] [E: packages/orchestrator/src/ipc/protocol.ts:61] [E: packages/orchestrator/src/handler.ts:29] [E: packages/orchestrator/src/handler.ts:31] [E: packages/orchestrator/src/handler.ts:32] [E: packages/orchestrator/src/handler.ts:33] [E: packages/orchestrator/src/handler.ts:34] [E: packages/orchestrator/src/handler.ts:35] [E: packages/orchestrator/src/handler.ts:36] [E: packages/orchestrator/src/handler.ts:37]。

`RpcBridgeResponse` 是一次性 `rpc` 的 envelope,`response` 字段装 `RpcResponse`;`RpcReadyResponse` 是 `rpc_stream` 升级前的 ready envelope,成功时可带 `instance` 摘要 [E: packages/orchestrator/src/ipc/protocol.ts:89] [E: packages/orchestrator/src/ipc/protocol.ts:90] [E: packages/orchestrator/src/ipc/protocol.ts:91] [E: packages/orchestrator/src/ipc/protocol.ts:94] [E: packages/orchestrator/src/ipc/protocol.ts:95] [E: packages/orchestrator/src/ipc/protocol.ts:96]。stream 升级后,server-to-client message union 还允许直接发送 `RpcResponse`、`AgentSessionEvent`、`RpcExtensionUIRequest` 和 `ErrorResponse` [E: packages/orchestrator/src/ipc/protocol.ts:116] [E: packages/orchestrator/src/ipc/protocol.ts:118] [E: packages/orchestrator/src/ipc/protocol.ts:119] [E: packages/orchestrator/src/ipc/protocol.ts:120] [E: packages/orchestrator/src/ipc/protocol.ts:121]。

## 控制流

1. `serve@packages/orchestrator/src/serve.ts:9` 调 `getSocketPath()`,确保 socket 目录存在,再把 callable `handleIpcRequest` 和 property `openRpcStream` 通过 `Object.assign()` 传给 `startIpcServer()` [E: packages/orchestrator/src/serve.ts:10] [E: packages/orchestrator/src/serve.ts:11] [E: packages/orchestrator/src/serve.ts:12] [E: packages/orchestrator/src/serve.ts:13] [E: packages/orchestrator/src/serve.ts:14]。
2. `startIpcServer@packages/orchestrator/src/ipc/server.ts:46` 接到 socket data 后按 newline 取一条 request line,调用 `parseRequestLine()`,普通 request 直接 `await handler(request)` 后 `socket.end(encodeMessage(response))` [E: packages/orchestrator/src/ipc/server.ts:53] [E: packages/orchestrator/src/ipc/server.ts:55] [E: packages/orchestrator/src/ipc/server.ts:67] [E: packages/orchestrator/src/ipc/server.ts:138] [E: packages/orchestrator/src/ipc/server.ts:139]。
3. `handleIpcRequest@packages/orchestrator/src/handler.ts:57` 对 `spawn` 调 `supervisor.spawnInstance({ cwd, label })`,成功返回 `spawn_result` 和 `toInstanceSummary(instance)` [E: packages/orchestrator/src/handler.ts:59] [E: packages/orchestrator/src/handler.ts:60] [E: packages/orchestrator/src/handler.ts:61] [E: packages/orchestrator/src/handler.ts:62] [E: packages/orchestrator/src/handler.ts:65] [E: packages/orchestrator/src/handler.ts:67]。
4. `handleIpcRequest@packages/orchestrator/src/handler.ts:57` 对 `list` 调 `supervisor.listInstances().map(toInstanceSummary)`,对 `status` 先 `supervisor.getInstance(instanceId)`,缺失时返回 `unknownInstanceError()` [E: packages/orchestrator/src/handler.ts:71] [E: packages/orchestrator/src/handler.ts:75] [E: packages/orchestrator/src/handler.ts:79] [E: packages/orchestrator/src/handler.ts:80] [E: packages/orchestrator/src/handler.ts:81] [E: packages/orchestrator/src/handler.ts:82]。
5. `handleIpcRequest@packages/orchestrator/src/handler.ts:57` 对 `stop` 调 `supervisor.stopInstance(instanceId)`,缺失时同样返回 `unknownInstanceError()`,成功只回 `stop_result` 和 `instanceId` [E: packages/orchestrator/src/handler.ts:92] [E: packages/orchestrator/src/handler.ts:93] [E: packages/orchestrator/src/handler.ts:94] [E: packages/orchestrator/src/handler.ts:95] [E: packages/orchestrator/src/handler.ts:99] [E: packages/orchestrator/src/handler.ts:101]。
6. `handleIpcRequest@packages/orchestrator/src/handler.ts:57` 对一次性 `rpc` 调 `supervisor.handleRpc(instanceId, command)`,若该调用返回空值则映射为 unknown-instance error,成功包成 `rpc_result` [E: packages/orchestrator/src/handler.ts:105] [E: packages/orchestrator/src/handler.ts:106] [E: packages/orchestrator/src/handler.ts:107] [E: packages/orchestrator/src/handler.ts:108] [E: packages/orchestrator/src/handler.ts:112] [E: packages/orchestrator/src/handler.ts:114]。
7. `handleIpcRequest@packages/orchestrator/src/handler.ts:57` 对 `rpc_stream` 不直接打开 stream,只用 `supervisor.getInstance(instanceId)` 做 readiness check,成功返回 `rpc_ready` 和 instance summary;实际 stream handle 由 IPC transport 随后调用 `handler.openRpcStream()` 获取 [E: packages/orchestrator/src/handler.ts:118] [E: packages/orchestrator/src/handler.ts:119] [E: packages/orchestrator/src/handler.ts:120] [E: packages/orchestrator/src/handler.ts:123] [E: packages/orchestrator/src/handler.ts:124] [E: packages/orchestrator/src/handler.ts:126] [E: packages/orchestrator/src/ipc/server.ts:76]。
8. `startIpcServer@packages/orchestrator/src/ipc/server.ts:46` 对 `rpc_stream` 先调用普通 handler 拿 `rpc_ready`,成功后移除初始 data listeners,调用 `handler.openRpcStream()` 并把 `onResponse`、`onSessionEvent`、`onUiRequest` 都实现成 `socket.write(encodeMessage(...))` [E: packages/orchestrator/src/ipc/server.ts:68] [E: packages/orchestrator/src/ipc/server.ts:69] [E: packages/orchestrator/src/ipc/server.ts:70] [E: packages/orchestrator/src/ipc/server.ts:75] [E: packages/orchestrator/src/ipc/server.ts:76] [E: packages/orchestrator/src/ipc/server.ts:79] [E: packages/orchestrator/src/ipc/server.ts:82] [E: packages/orchestrator/src/ipc/server.ts:85]。
9. `openRpcStream@packages/orchestrator/src/handler.ts:132` 调 `supervisor.openRpcStream(instanceId, onSessionEvent, onUiRequest)`,若没有 live handle 返回 undefined;成功后返回一个 `{ handleRequest, close }` adapter 给 IPC transport [E: packages/orchestrator/src/handler.ts:143] [E: packages/orchestrator/src/handler.ts:144] [E: packages/orchestrator/src/handler.ts:145] [E: packages/orchestrator/src/handler.ts:148] [E: packages/orchestrator/src/handler.ts:149] [E: packages/orchestrator/src/handler.ts:157]。
10. `openRpcStream@packages/orchestrator/src/handler.ts:132` 的 `handleRequest()` 遇到 `extension_ui_response` 时只调用 `handle.handleUiResponse()` 并返回;其它 `RpcCommand` 走 `await handle.handleRpc(request)`,再用 `onResponse(response)` 写回 client [E: packages/orchestrator/src/handler.ts:150] [E: packages/orchestrator/src/handler.ts:151] [E: packages/orchestrator/src/handler.ts:152] [E: packages/orchestrator/src/handler.ts:154] [E: packages/orchestrator/src/handler.ts:155]。
11. `serve@packages/orchestrator/src/serve.ts:9` 启动后调用 `supervisor.recoverAfterRestart()`,Radius enabled 时启动 `radiusPresence.start()`,否则只打印 disabled 提示;如果初始化失败,会关闭 server 并删除 socket path 后重新抛错 [E: packages/orchestrator/src/serve.ts:19] [E: packages/orchestrator/src/serve.ts:20] [E: packages/orchestrator/src/serve.ts:21] [E: packages/orchestrator/src/serve.ts:27] [E: packages/orchestrator/src/serve.ts:29] [E: packages/orchestrator/src/serve.ts:30] [E: packages/orchestrator/src/serve.ts:31] [E: packages/orchestrator/src/serve.ts:34]。
12. `serve@packages/orchestrator/src/serve.ts:9` 的 shutdown path 防重入,然后依次 `server.close()`、`supervisor.shutdown()`、`radiusPresence.stop()`、删除 socket path 并 `process.exit(exitCode)`;`SIGINT`、`SIGTERM`、`uncaughtException` 和 `unhandledRejection` 都进入这个 shutdown path [E: packages/orchestrator/src/serve.ts:39] [E: packages/orchestrator/src/serve.ts:41] [E: packages/orchestrator/src/serve.ts:47] [E: packages/orchestrator/src/serve.ts:48] [E: packages/orchestrator/src/serve.ts:49] [E: packages/orchestrator/src/serve.ts:50] [E: packages/orchestrator/src/serve.ts:56] [E: packages/orchestrator/src/serve.ts:59] [E: packages/orchestrator/src/serve.ts:62] [E: packages/orchestrator/src/serve.ts:65] [E: packages/orchestrator/src/serve.ts:69]。

## 设计动机与权衡

request handler 与 transport 被刻意拆开: `serve()` 只把 callable handler 传给 `startIpcServer()`,而 JSONL framing、socket listener 和 stream socket writes 都在 IPC server 中;这个拆分让 `handleIpcRequest()` 可以只面对 typed `OrchestratorRequest` union [E: packages/orchestrator/src/serve.ts:12] [E: packages/orchestrator/src/ipc/server.ts:67] [E: packages/orchestrator/src/ipc/server.ts:138] [E: packages/orchestrator/src/handler.ts:56] [I]。

`rpc_stream` 被拆成 readiness handshake 与 stream open 两步:普通 handler 先回 `rpc_ready`,IPC server 再调用 `openRpcStream()` 并写出 ready response;这让 unknown instance 在进入长连接模式前就能以普通 `ErrorResponse` 结束 socket [E: packages/orchestrator/src/handler.ts:118] [E: packages/orchestrator/src/handler.ts:123] [E: packages/orchestrator/src/ipc/server.ts:69] [E: packages/orchestrator/src/ipc/server.ts:70] [E: packages/orchestrator/src/ipc/server.ts:71] [E: packages/orchestrator/src/ipc/server.ts:76] [E: packages/orchestrator/src/ipc/server.ts:95] [I]。

`openRpcStream()` 把 UI response 与 RPC command 放在同一个 client-to-server stream 上,但在 bridge 内分流:extension UI answer 不产生 `RpcResponse`,普通 RPC command 才产生 response 并经 `onResponse` 回写 [E: packages/orchestrator/src/handler.ts:139] [E: packages/orchestrator/src/handler.ts:150] [E: packages/orchestrator/src/handler.ts:151] [E: packages/orchestrator/src/handler.ts:154] [E: packages/orchestrator/src/handler.ts:155] [I]。

## Gotcha

- `SpawnRequest` 类型包含 `provider?` 和 `model?`,但 `handleIpcRequest()` 的 `spawn` branch 只把 `cwd` 与 `label` 传给 `supervisor.spawnInstance()`;如果 client 发送 provider/model,此 handler 当前不会消费这两个字段 [E: packages/orchestrator/src/ipc/protocol.ts:14] [E: packages/orchestrator/src/ipc/protocol.ts:15] [E: packages/orchestrator/src/handler.ts:60] [E: packages/orchestrator/src/handler.ts:61] [E: packages/orchestrator/src/handler.ts:62]。
- `handleIpcRequest()` 的 unknown-instance error 文案只说 `Unknown instance: <id>`,无论是 `status`、`stop`、一次性 `rpc` 还是 `rpc_stream` readiness miss 都复用同一个 helper [E: packages/orchestrator/src/handler.ts:41] [E: packages/orchestrator/src/handler.ts:45] [E: packages/orchestrator/src/handler.ts:82] [E: packages/orchestrator/src/handler.ts:95] [E: packages/orchestrator/src/handler.ts:108] [E: packages/orchestrator/src/handler.ts:121]。
- stream close 只调用 adapter 的 `close()`,adapter 再调用 supervisor handle 的 `close()`;这个节点可确认 listener cleanup 入口存在,但具体 live subscriber 与 UI handler 清理由 `subsys.orchestrator.supervisor` 覆盖 [E: packages/orchestrator/src/ipc/server.ts:134] [E: packages/orchestrator/src/handler.ts:157] [E: packages/orchestrator/src/handler.ts:158] [I]。
- `serve()` 通过永不 resolve 的 Promise 保持进程存活,退出依赖 signal 或 fatal error handler 触发 shutdown [E: packages/orchestrator/src/serve.ts:74] [E: packages/orchestrator/src/serve.ts:59] [E: packages/orchestrator/src/serve.ts:65] [E: packages/orchestrator/src/serve.ts:69]。

## 跨包边界

[subsys.orchestrator.supervisor](supervisor.md) 应覆盖 `OrchestratorSupervisor` 如何 spawn/stop live RPC process、持久化 instance record、同步 session metadata、管理 subscribers 和 Radius registration;本节点只说明 request handler 调用 `supervisor.spawnInstance()`、`listInstances()`、`getInstance()`、`stopInstance()`、`handleRpc()`、`openRpcStream()`、`recoverAfterRestart()` 与 `shutdown()` 的位置 [E: packages/orchestrator/src/handler.ts:60] [E: packages/orchestrator/src/handler.ts:75] [E: packages/orchestrator/src/handler.ts:80] [E: packages/orchestrator/src/handler.ts:93] [E: packages/orchestrator/src/handler.ts:106] [E: packages/orchestrator/src/handler.ts:143] [E: packages/orchestrator/src/serve.ts:19] [E: packages/orchestrator/src/serve.ts:48]。

[subsys.orchestrator.ipc-transport](ipc-transport.md) 应覆盖 socket path、stale socket cleanup、JSONL encode/parse、client request helpers 和 stream-mode socket framing;本节点只解释 `serve()` 如何把 request handler object 交给 transport,以及 transport 如何反调 `handleIpcRequest()` / `openRpcStream()` [E: packages/orchestrator/src/serve.ts:12] [E: packages/orchestrator/src/ipc/server.ts:46] [E: packages/orchestrator/src/ipc/server.ts:67] [E: packages/orchestrator/src/ipc/server.ts:76] [E: packages/orchestrator/src/ipc/server.ts:138]。

## Sources

- packages/orchestrator/src/handler.ts
- packages/orchestrator/src/serve.ts
- packages/orchestrator/src/ipc/server.ts
- packages/orchestrator/src/ipc/protocol.ts
- packages/orchestrator/package.json

## 相关

- [subsys.orchestrator.supervisor](supervisor.md): live instance、RPC process 和 Radius lifecycle 的所有权节点。
- [subsys.orchestrator.ipc-transport](ipc-transport.md): Unix socket / JSONL transport 与 stream-mode framing 的所有权节点。
