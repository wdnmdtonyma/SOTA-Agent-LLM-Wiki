---
id: subsys.integration.sdk-protocol
title: SDK JSON-RPC 协议
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/sdk/protocol/src/index.ts
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/protocol/src/transport.ts
  - packages/sdk/protocol/package.json
  - packages/sdk/protocol/tests/transport.spec.ts
  - packages/sdk/server/src/server.ts
  - packages/sdk/server/src/index.ts
  - packages/sdk/server/tests/server.spec.ts
  - packages/sdk/client/src/client.ts
  - vendor/cordis/src/events.ts
symbols:
  - HarnessSdkRequestMap
  - HarnessSdkNotificationMap
  - JsonRpcLineTransport
  - InitializeParams
related:
  - spine.overview
  - spine.capability-seams
  - subsys.integration.sdk-server
  - subsys.integration.sdk-client
  - surface.sdk.typescript
  - surface.sdk.python
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-sdk-protocol` 是进程外 SDK runtime 的 **wire 形状 + NDJSON JSON-RPC transport**：类型侧钉死三请求 / 四通知，运行时侧只提供 `JsonRpcLineTransport`。它不拥有子进程、不拥有 agent、不是 `dsh web` 的默认面，也不进 `dsh-base` / shipped preset。

## 能回答的问题

- 客户端→服务器恰好哪三个 JSON-RPC 方法？服务器→客户端恰好哪四个通知？
- `serverInfo.name` 的 wire-stable 值是什么？字面量写在哪一端？
- 未知 `sessionId` 的 `session/prompt` 由谁懒创建 agent+session？本协议有没有 `newSession` / `loadSession`？
- `JsonRpcLineTransport` 怎样区分 request / response / notification？畸形行、缺 handler、handler 抛错各走哪条码？
- 本包是不是 cordis 插件行？和 ACP 的方法表是不是同一套？
- Definition / Provider / Consumer 各落在哪个包？有没有 `ctx.*` 键？

## 职责边界

本包拥有 **方法名表 + 帧编码**。npm 名 `@deepseek-ai/dsh-sdk-protocol`。[E: packages/sdk/protocol/package.json:2] 主入口只 re-export `JsonRpcLineTransport` / `JsonRpcResponseError` 与 `HarnessSdkRequestMap` 一系类型，没有 `apply` / `inject`，也没有 default export。[E: packages/sdk/protocol/src/index.ts:11] [E: packages/sdk/protocol/src/index.ts:14] [E: packages/sdk/protocol/src/index.ts:15] 调用方自备 `Readable` / `Writable`；`close()` 只摘 listener、拒绝 pending，**不** `destroy` 那两根流。[E: packages/sdk/protocol/src/transport.ts:62] [E: packages/sdk/protocol/src/transport.ts:88]

它**不**拥有：

- 进程生命周期、`child_process.spawn`、EOF → SIGTERM → SIGKILL — [`subsys.integration.sdk-client`](sdk-client.md)（`subsys.integration.sdk-client`）。TS 客户端在 harness 进程外自己拉起 runtime。
- `handleRequest` 分发、`agents.create`、stdout 专用于协议帧、`shutdown` 后 `rootFiber.dispose()` + `process.exit(0)` — [`subsys.integration.sdk-server`](sdk-server.md)（`subsys.integration.sdk-server`）。本页只点名「未知 `sessionId` 在 server 侧懒创建」。
- Python `HarnessClient` 实现 — [`surface.sdk.python`](../../surface/sdk/python.md)（`surface.sdk.python`）。Python 与 TS 讲同一份方法表，本页不展开那一端。
- ACP JSON-RPC 方法表（`authenticate` / `newSession` / `prompt` / `cancel`）— [`subsys.integration.acp`](acp.md) 不在本页 `related` 最低集里；不要把 ACP 方法抄进本协议。

**host 面 vs agent-preset 面。** 本包不是 `ctx.*` Definition，也没有 preset `isolate` remount。`dsh-base` / `dsh-web-app` / `dsh-headless` 与四个 shipped preset 都没有本包行；`apps/cli` 也不依赖它。默认产品路径仍是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。真实说话的两端是 example / Python runtime 树里的 `sdk-jsonrpc-server` 与进程外 SDK 客户端。

**没有 waterfall。** 本包不往 `Events.waterfall` 挂 listener。组合失败发生在对端：server 插件 `inject = ['agents']` 等不到服务、或 `handleRequest` 对未知方法抛错。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sdk/protocol/src/types.ts` | `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` 与各 params/result |
| `packages/sdk/protocol/src/transport.ts` | `JsonRpcLineTransport`：NDJSON 帧、pending、abort、`flush` |
| `packages/sdk/protocol/src/index.ts` | 包公共导出面 |
| `packages/sdk/protocol/package.json` | 包名与 `exports`（`.` / `./invariant`） |
| `packages/sdk/protocol/tests/transport.spec.ts` | 双向帧、`-32601` / `-32603`、畸形行、abort、`flush` |
| `packages/sdk/server/src/server.ts` | 方法分发；`serverInfo.name` 字面量；懒创建 session |
| `packages/sdk/server/src/index.ts` | 插件把 stdin/stdout 绑到 `JsonRpcLineTransport` |
| `packages/sdk/client/src/client.ts` | 进程外 Consumer：发三请求、订四通知 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `HarnessSdkRequestMap` | 客户端→服务器恰好三键：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/protocol/src/types.ts:101] [E: packages/sdk/protocol/src/types.ts:102] [E: packages/sdk/protocol/src/types.ts:103] [E: packages/sdk/protocol/src/types.ts:104] |
| `HarnessSdkNotificationMap` | 服务器→客户端恰好四键：`session.event` / `session.status` / `subagent.started` / `subagent.finished`。[E: packages/sdk/protocol/src/types.ts:93] [E: packages/sdk/protocol/src/types.ts:94] [E: packages/sdk/protocol/src/types.ts:95] [E: packages/sdk/protocol/src/types.ts:96] [E: packages/sdk/protocol/src/types.ts:97] |
| `InitializeParams` | 进程级握手：必填 `cwd` / `provider` / `model`，可选正整数 `maxTokens`。这些字段只约束 **此后 SDK 新创建** 的 agent，不是「改已有 session」。[E: packages/sdk/protocol/src/types.ts:16] [E: packages/sdk/protocol/src/types.ts:18] [E: packages/sdk/protocol/src/types.ts:20] [E: packages/sdk/protocol/src/types.ts:22] [E: packages/sdk/protocol/src/types.ts:24] |
| `InitializeResult` | `{ serverInfo: { name, version } }`。`name` 在 types 里只是 `string`；wire-stable 字面量 `deepseek-harness-sdk-runtime` 由 server 写入。[E: packages/sdk/protocol/src/types.ts:30] [E: packages/sdk/server/src/server.ts:124] |
| `SessionPromptParams` | `sessionId` + `contentBlocks`（`ContentBlock[]`，原样当作用户消息）。[E: packages/sdk/protocol/src/types.ts:34] [E: packages/sdk/protocol/src/types.ts:36] [E: packages/sdk/protocol/src/types.ts:38] |
| `SessionPromptResult` | `{ messageId }`：入队回执，不标识后续 assistant / `turn/end`。[E: packages/sdk/protocol/src/types.ts:42] [E: packages/sdk/protocol/src/types.ts:44] |
| `SessionEventNotification` | `sessionId` + 完整 `SessionEvent`。server 对 **runtime 里每一条** `session/event` 都转发，不限 SDK 创建的 session。[E: packages/sdk/protocol/src/types.ts:51] [E: packages/sdk/server/src/server.ts:71] [E: packages/sdk/server/src/server.ts:73] |
| `SessionStatusNotification` | `sessionId` + `'idle' \| 'running'`，来自 `agent/status`。[E: packages/sdk/protocol/src/types.ts:63] [E: packages/sdk/server/src/server.ts:76] |
| `SubagentStartedNotification` | `parentSessionId` / `childSessionId`。仅当新 session 带 `header.parentSession`。[E: packages/sdk/protocol/src/types.ts:67] [E: packages/sdk/server/src/server.ts:80] [E: packages/sdk/server/src/server.ts:85] |
| `SubagentFinishedNotification` | `provider` / `agentId` / 两端 session id / `status`（`ok` \| `error`）/ `stopReason` / 可选 `lastAssistantMessage`。server **只报 `info.local` 的进程内孩子**。[E: packages/sdk/protocol/src/types.ts:75] [E: packages/sdk/server/src/server.ts:92] [E: packages/sdk/server/src/server.ts:102] |
| `JsonRpcLineTransport` | 一行一个 JSON-RPC 2.0 对象，写出时末尾 `\n`。[E: packages/sdk/protocol/src/transport.ts:261] |
| `JsonRpcResponseError` | 对端 error 帧：`code`（缺则 `undefined`）/ `message` / 原样 `data`。[E: packages/sdk/protocol/src/transport.ts:24] |

`shutdown` 在 map 里是 `params: undefined`、`result: Record<string, never>`。[E: packages/sdk/protocol/src/types.ts:104] TS 客户端 `request()` 对缺省 params 发 `{}`，不是省略成员。[E: packages/sdk/client/src/client.ts:314]

## 控制流

1. 两端各自 `new JsonRpcLineTransport(input, output)` 再 `start()`。`start` 幂等：已 started 则直接 return。[E: packages/sdk/protocol/src/transport.ts:76] [E: packages/sdk/protocol/src/transport.ts:77] Server 插件 `apply@packages/sdk/server/src/index.ts` 默认绑 `process.stdin` / `process.stdout`，`onRequest` 交给 `HarnessSdkJsonRpcServer.handleRequest`。[E: packages/sdk/server/src/index.ts:59] [E: packages/sdk/server/src/index.ts:76] [E: packages/sdk/server/src/index.ts:77] TS 客户端 `HarnessClient.start@packages/sdk/client/src/client.ts` 把孩子 `stdout`→input、`stdin`→output，并 `onNotification` 扇出订阅。[E: packages/sdk/client/src/client.ts:257] [E: packages/sdk/client/src/client.ts:258]

2. `JsonRpcLineTransport.request@packages/sdk/protocol/src/transport.ts` 生成 `id = req_${uuid去横线}`，写出 `{ jsonrpc: '2.0', id, method, params }`。[E: packages/sdk/protocol/src/transport.ts:122] [E: packages/sdk/protocol/src/transport.ts:123] `notify` 在 `params === undefined` 时省略 `params` 成员。[E: packages/sdk/protocol/src/transport.ts:159]

3. `handleLine@packages/sdk/protocol/src/transport.ts` 按成员切帧：`id`+`method` → 入站 request；只有 `id` → 入站 response；只有 `method` → notification。[E: packages/sdk/protocol/src/transport.ts:213] [E: packages/sdk/protocol/src/transport.ts:217] [E: packages/sdk/protocol/src/transport.ts:221] `JSON.parse` 失败或非 object 直接丢弃，不回错误帧。[E: packages/sdk/protocol/src/transport.ts:204] [E: packages/sdk/protocol/src/transport.ts:209] 测试钉死 `not json` / 空行 / `null` 不会进入 handler。[E: packages/sdk/protocol/tests/transport.spec.ts:157]

4. 入站 request 无 `onRequest` handler → `-32601` `method not found: ${method}`。[E: packages/sdk/protocol/src/transport.ts:229] [E: packages/sdk/protocol/tests/transport.spec.ts:124] handler throw → `-32603`，message 取 `Error.message` 或 `String(error)`。[E: packages/sdk/protocol/src/transport.ts:236] [E: packages/sdk/protocol/tests/transport.spec.ts:57] 无 notification handler 则 silently drop。[E: packages/sdk/protocol/src/transport.ts:222] 非 object 的 `params`（含数组）收成 `{}`。[E: packages/sdk/protocol/src/transport.ts:273] [E: packages/sdk/protocol/tests/transport.spec.ts:143]

5. 客户端握手：`HarnessClient.initialize@packages/sdk/client/src/client.ts` 发 `initialize`。[E: packages/sdk/client/src/client.ts:269] Server `handleRequest@packages/sdk/server/src/server.ts` 的 `switch` **只认三支**：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/server/src/server.ts:192] [E: packages/sdk/server/src/server.ts:194] [E: packages/sdk/server/src/server.ts:196] `initialize` 返回 `{ serverInfo: { name: 'deepseek-harness-sdk-runtime', version: '0.0.1' } }`。[E: packages/sdk/server/src/server.ts:124] 测试钉死这个 `name`。[E: packages/sdk/server/tests/server.spec.ts:128] 客户端只校验 `name`/`version` 是 string，不在协议包里再写死字面量。[E: packages/sdk/client/src/client.ts:271]

6. 一轮用户输入：`HarnessClient.prompt@packages/sdk/client/src/client.ts` 发 `session/prompt`。[E: packages/sdk/client/src/client.ts:285] Server `prompt` 先 `getOrCreateSession(params.sessionId)`：map 里有就复用，没有就 `ctx.agents.create({ sessionId: SessionId(sessionId), … })`——**未知 id 在 server 侧懒创建**，协议没有 `newSession`。[E: packages/sdk/server/src/server.ts:133] [E: packages/sdk/server/src/server.ts:205] [E: packages/sdk/server/src/server.ts:206] [E: packages/sdk/server/src/server.ts:223] [E: packages/sdk/server/src/server.ts:224] 创建细节（host 面读工具行、无 preset composition）交给 [`subsys.integration.sdk-server`](sdk-server.md)。入队后立刻 `{ messageId: message.id }`，不等 turn。[E: packages/sdk/server/src/server.ts:142]

7. 活动观察走四条通知，不是请求回执。构造 `HarnessSdkJsonRpcServer` 时 `ctx.on('session/event')` → `notify('session.event')`，`agent/status` → `session.status`，带 parent 的 `session/created` → `subagent.started`，`subagent/end` 且 `info.local` → `subagent.finished`。[E: packages/sdk/server/src/server.ts:73] [E: packages/sdk/server/src/server.ts:76] [E: packages/sdk/server/src/server.ts:85] [E: packages/sdk/server/src/server.ts:102] 远程 / 非 local 子 run **不**发 `subagent.finished`。[E: packages/sdk/server/src/server.ts:92]

8. 未知方法：`handleRequest` `default` 抛 `unknown DeepSeek Harness SDK runtime method: …`，测试按这句话断言。[E: packages/sdk/server/src/server.ts:199] [E: packages/sdk/server/tests/server.spec.ts:862] 插件已安装 `onRequest`，所以这条在 transport 层变成 **-32603**，不是 `-32601`。`-32601` 只在对端根本没挂 request handler 时出现。

9. 拆卸：客户端 `close` 先发协议 `shutdown`。[E: packages/sdk/client/src/client.ts:389] Server `shutdown()` 收空对象 `{}`。[E: packages/sdk/server/src/server.ts:180] 插件在 **写出 shutdown 结果之后** 才 `flush` + dispose root（细节在 sdk-server）。`JsonRpcLineTransport.flush` 写空字符串当 barrier，等先前帧的 write callback。[E: packages/sdk/protocol/src/transport.ts:166] [E: packages/sdk/protocol/src/transport.ts:168] `close()` 拒绝 pending，文案 `JSON-RPC transport closed`；input `end` 文案 `JSON-RPC input closed`。[E: packages/sdk/protocol/src/transport.ts:91] [E: packages/sdk/protocol/src/transport.ts:198] [E: packages/sdk/protocol/tests/transport.spec.ts:258]

10. 可选 `AbortSignal`：已 abort 的 signal 让 `request` 立刻 reject，且 **不**登记 pending；中途 abort 则 `pending.delete(id)`，迟到的 response 会被当成无主帧丢掉。[E: packages/sdk/protocol/src/transport.ts:128] [E: packages/sdk/protocol/src/transport.ts:132] [E: packages/sdk/protocol/tests/transport.spec.ts:69] 协议 **没有** cancel / `session/cancel` 方法；超时只放弃等回执，server 侧工作仍跑到 close。

## 设计动机

方法表刻意极小：握手一次路由，之后只 `session/prompt` 入队，活动靠开放的 `session.event` + `session.status` 观察。协议不把 assistant 消息或 `turn/end` 归到某次 prompt——同一 session 上可以再入队，steering 与其它工作都会进同一条 event 流。客户端（TS `run()` / Python 孪生）自己划 activity 窗口；那是 Consumer 的事。

`serverInfo.name` 钉死字符串，让异构客户端用身份探测而不是版本谈判。`version` 现写 `'0.0.1'`，与 npm `0.1.0-rc.5` 不是同一个计数器。

没有 `newSession`：调用方自带 `sessionId`，server 在第一次 `session/prompt` 懒创建。这样 Python / TS / 脚本都可以预先选定 id，不必先做一次分配往返。这与 ACP 的 `newSession` + fresh UUID 是两条缝。

Transport 做成无协议知识的 NDJSON 端点：SDK 方法名只活在 types 与 server `switch` 里。畸形行丢弃，是为了 stdio 上偶发的非帧噪声不把整条管道打进错误风暴。

## Gotcha

- **不是 ACP。** 本表没有 `authenticate` / `newSession` / `cancel` / `loadSession`。ACP 页的方法不要抄到这里。
- **不是默认 `dsh web`。** 包在 monorepo 里 ≠ 进了 bundle。Web 工作台走 host HTTP / Typert，不讲这套 stdio JSON-RPC。
- **`-32601` ≠ 未知 SDK 方法。** 未挂 handler 才 `-32601`；已挂的 `handleRequest` 对第四个方法抛错 → `-32603`。[E: packages/sdk/protocol/src/transport.ts:229] [E: packages/sdk/server/src/server.ts:199]
- **`messageId` 不是 turn 结果。** `session/prompt` 在 `followup` 之后立即返回。完成态看后续 `session.status` 的 `idle`，内容看 `session.event`。
- **`session.event` 不过滤来源。** runtime 里任何 session（含非 SDK map 的 orphan）都会广播。树范围过滤在客户端 `subscribeSessionTree`（sdk-client），不在协议帧里。
- **`subagent.finished` 漏掉远程孩子。** `info.local === false` 直接 return。`subagent.started` 仍可能因 `parentSession` 发出——两端不对称。
- **字面量不在 protocol 包里。** `deepseek-harness-sdk-runtime` 只出现在 types 的注释与 server 返回值。改 server 而不改客户端测试会裂，types 编译不会拦。
- **`shutdown` 类型是 `params: undefined`，TS 客户端仍发 `{}`。** 不要按「线上完全没有 `params` 键」写解析器。
- **没有 wire cancel。** 客户端超时只扔掉 pending；server 继续跑，直到 `shutdown` / 进程被杀。
- **`close()` 不关 fd。** 流所有权在 caller（plugin 的 stdin/stdout，或 `ChildProcess` 的 pipe）。只 `close` transport 不会让孩子看到 EOF。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition（本页）** | `@deepseek-ai/dsh-sdk-protocol` 的 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` + `JsonRpcLineTransport` | **无** `ctx` 键。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / 四个 shipped preset |
| **Provider** | `@deepseek-ai/dsh-sdk-jsonrpc-server` 的 `HarnessSdkJsonRpcServer` | 插件名 `sdk-jsonrpc-server`，`inject = ['agents']`。example / Python runtime 树才挂。细节 [`subsys.integration.sdk-server`](sdk-server.md) |
| **Consumer（TS）** | `@deepseek-ai/dsh-sdk-client` 的 `HarnessClient` | 进程外；`request('initialize' \| 'session/prompt' \| 'shutdown')`。细节 [`subsys.integration.sdk-client`](sdk-client.md) / [`surface.sdk.typescript`](../../surface/sdk/typescript.md) |
| **Consumer（Python）** | `python/sdk` 的 `HarnessClient` | 同一方法表。本页不写实现。[`surface.sdk.python`](../../surface/sdk/python.md) |

换协议 = 同时改 types map、server `switch`、两端客户端。只改一边会在 `handleRequest` 或客户端 `SdkProtocolError` 处 fail-loud。这不是 `ctx.fs` 那种可热替换 provider 的 capability seam：没有 `provide('sdk-protocol')`。

## Sources

- packages/sdk/protocol/src/index.ts
- packages/sdk/protocol/src/types.ts
- packages/sdk/protocol/src/transport.ts
- packages/sdk/protocol/package.json
- packages/sdk/protocol/tests/transport.spec.ts
- packages/sdk/server/src/server.ts
- packages/sdk/server/src/index.ts
- packages/sdk/server/tests/server.spec.ts
- packages/sdk/client/src/client.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset`；默认面是 `dsh web`，不是本协议。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：典型 seam 有 `ctx.*` Definition。本协议是 wire 合同，没有那个键。
- [subsys.integration.sdk-server](sdk-server.md)（`subsys.integration.sdk-server`）：插件 `sdk-jsonrpc-server`；懒创建 session；`shutdown` 后退出进程。
- [subsys.integration.sdk-client](sdk-client.md)（`subsys.integration.sdk-client`）：进程外 `HarnessClient`；spawn 与 dispose 阶梯。
- [surface.sdk.typescript](../../surface/sdk/typescript.md)（`surface.sdk.typescript`）：TS SDK 可见面（`DeepSeekHarness.run` 等）。
- [surface.sdk.python](../../surface/sdk/python.md)（`surface.sdk.python`）：Python 孪生客户端；讲同一份方法表。
