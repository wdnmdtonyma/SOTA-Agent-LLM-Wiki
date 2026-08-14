---
id: subsys.integration.sdk-client
title: SDK TS client
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/sdk/client/src/client.ts
  - packages/sdk/client/src/api.ts
  - packages/sdk/client/src/dispose.ts
  - packages/sdk/client/src/index.ts
  - packages/sdk/client/src/types.ts
  - packages/sdk/client/src/invariant.ts
  - packages/sdk/client/package.json
  - packages/sdk/client/tests/sdk-client.spec.ts
  - packages/sdk/client/tests/dispose.spec.ts
  - packages/subagent/subagent-dsh-sdk/src/index.ts
  - packages/subagent/subagent-dsh-sdk/src/run.ts
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/protocol/src/transport.ts
  - vendor/cordis/src/events.ts
symbols:
  - HarnessClient
  - DeepSeekHarness
  - TransportClosedError
  - RequestTimeoutError
  - SdkProtocolError
  - disposeRuntimeProcess
related:
  - spine.overview
  - spine.capability-seams
  - subsys.integration.sdk-protocol
  - subsys.integration.sdk-server
  - subsys.orchestration.subagent-dsh-sdk
  - surface.sdk.typescript
  - surface.sdk.python
  - subsys.execution.subprocess
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-sdk-client` 是跑在 **harness 进程外** 的 TypeScript JSON-RPC 客户端库：`HarnessClient` 自己 `node:child_process.spawn` 拉起一份完整 runtime（通常是 `dsh-jsonrpc-agent`），在孩子 stdio 上讲 `@deepseek-ai/dsh-sdk-protocol`。它不登记任何 `ctx.*`，也 **不** 走 `ctx.subprocess`——这是 subprocess 缝对 SDK 托管传输的文档化例外。高层包装是 `DeepSeekHarness` / `HarnessSession`。设计孪生是 `python/sdk` 的 `HarnessClient`（本页不展开 Python）。

## 能回答的问题

- `HarnessClient` 怎么 `spawn` 子 runtime？为什么不能 `inject` `ctx.subprocess`？
- `close()` 的拆卸阶梯是 EOF → SIGTERM → SIGKILL 吗？Windows 少哪一档？默认 grace 是多少？
- 客户端发出哪三个 JSON-RPC 请求？`session` 树订阅在哪一侧裁剪？有没有 wire 级 prompt cancel？
- `TransportClosedError` / `RequestTimeoutError` / `SdkProtocolError` / `JsonRpcResponseError` 各在哪条路径抛出？
- `dsh-subagent-dsh-sdk` 怎样用本库拉起孩子？`inject` 为什么只有 `subagents`？
- 本库是不是 `dsh web` / shipped bundle 的一部分？

## 职责边界

本包装载名是 `@deepseek-ai/dsh-sdk-client`。[E: packages/sdk/client/package.json:2] 包根只再导出 `DeepSeekHarness` / `HarnessSession`、`HarnessClient` 与三类错误、以及协议包的 `JsonRpcResponseError`。[E: packages/sdk/client/src/index.ts:12] [E: packages/sdk/client/src/index.ts:15] 它拥有：

- **进程与传输所有权。** `HarnessClient.start` 调 `spawn(command, args ?? [], { cwd, env, stdio: ['pipe','pipe','pipe'] })`，把 stdout/stdin 交给 `JsonRpcLineTransport`。[E: packages/sdk/client/src/client.ts:206] [E: packages/sdk/client/src/client.ts:208] [E: packages/sdk/client/src/client.ts:209] [E: packages/sdk/client/src/client.ts:257]
- **拆卸阶梯。** `disposeRuntimeProcess`：stdin EOF →（POSIX）SIGTERM → SIGKILL，必须等到孩子真的 `exit`。[E: packages/sdk/client/src/dispose.ts:90] [E: packages/sdk/client/src/dispose.ts:94] [E: packages/sdk/client/src/dispose.ts:98]
- **高层 turn API。** `DeepSeekHarness` 记一份 launch spec，懒启动 + 一次 `initialize`；`HarnessSession.run` 等到本 session 的 inbox 回执后再等到 `session.status === 'idle'`。[E: packages/sdk/client/src/api.ts:65] [E: packages/sdk/client/src/api.ts:169] [E: packages/sdk/client/src/api.ts:182]
- **客户端错误面。** `TransportClosedError`（进程没了 / 已 close）、`RequestTimeoutError`（本侧放弃等待）、`SdkProtocolError`（回包缺字段或 `session.event` 畸形）。[E: packages/sdk/client/src/client.ts:38] [E: packages/sdk/client/src/client.ts:47] [E: packages/sdk/client/src/client.ts:59]

它**不**拥有：

- wire 形状与 NDJSON transport 实现 — [`subsys.integration.sdk-protocol`](sdk-protocol.md)（`subsys.integration.sdk-protocol`）。本页只调用 `JsonRpcLineTransport.request` / `onNotification`。
- runtime 进程里的 `sdk-jsonrpc-server`、`shutdown` 之后的 `rootFiber.dispose()` / `process.exit(0)` — [`subsys.integration.sdk-server`](sdk-server.md)（`subsys.integration.sdk-server`）。
- `ctx.subagents` Definition、`start` / `startContinuable` 门控、`SdkSubagentProvider` 广告 — [`subsys.orchestration.subagent-dsh-sdk`](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）。本页只写那个 Provider 怎样 `new DeepSeekHarness`。
- `ctx.subprocess`、树级 teardown、`scrubbedParentEnv` 纯函数 — [`subsys.execution.subprocess`](../execution/subprocess.md)（`subsys.execution.subprocess`）。本库 **不** `inject` 该键；凭据擦除是调用方的事。
- Python `HarnessClient` 的 `subprocess.Popen` — [`surface.sdk.python`](../../surface/sdk/python.md)（`surface.sdk.python`）。[I] 两家讲同一份 protocol，实现不共享。
- 模型可见工具 schema。本库不是 `ctx.tools` Consumer。

**不是 Cordis 插件，不进 shipped 树。** 默认产品路径是 `dsh web` 本地 Web GUI，host 面是 `profile → bundle → agent preset`；本仓没有 shipped TUI。`dsh-base` / `dsh-web-app` / `dsh-headless` 的 `cordis.patch.yml` 与 `package.json` dependencies、四个 shipped `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`、以及 `apps/cli/package.json`，都没有 `@deepseek-ai/dsh-sdk-client` 这一行。[I] 包存在 ≠ 产品默认装。被 spawn 的孩子是另一份完整 harness，组合由**孩子自己的** `cordis.yml` 决定（典型挂 `dsh-sdk-jsonrpc-server`），那是孩子进程的 host / preset，不是本库。

唯一带 Cordis `name` / `inject` 的出口是 `./invariant`：`name = 'sdk-client-invariant'`，`inject = ['invariants']`，installer 是空函数——客户端跑在任何 harness context 之外，runtime 自己的包才拥有事件流不变量。[E: packages/sdk/client/src/invariant.ts:13] [E: packages/sdk/client/src/invariant.ts:15] [E: packages/sdk/client/src/invariant.ts:22] 仓库里没有任何 yml 挂这一行。[I]

**没有 waterfall，没有 isolate。** 本库不往 `Events.waterfall` 挂 listener，也不 `provide` 服务。父进程若本身是一份 harness（例如 overlay 了 `dsh-subagent-dsh-sdk` 的 host），父 turn 的 `tools/pre-execute` 仍是 waterfall：`Events.waterfall` 把最后一个参数当 innermost `next`，监听器必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层，到不了 tool `execute`。[E: vendor/cordis/src/events.ts:238] 本库不参与那条链。浏览器 client 不执行 `HarnessClient.start`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sdk/client/src/client.ts` | `HarnessClient`：`spawn`、三类 Error、`initialize` / `prompt` / `request` / `subscribe` / `close` |
| `packages/sdk/client/src/api.ts` | `DeepSeekHarness` / `HarnessSession`：握手 memo、相对 cwd 先 `resolve`、跑到 idle |
| `packages/sdk/client/src/dispose.ts` | `disposeRuntimeProcess`：EOF / SIGTERM / SIGKILL |
| `packages/sdk/client/src/types.ts` | `HarnessClientOptions` / `DeepSeekHarnessOptions` / `RunResult` |
| `packages/sdk/client/src/invariant.ts` | 空 `sdk-client-invariant` companion；仓库零 yml 挂载 |
| `packages/sdk/client/src/index.ts` | 包根再导出；`JsonRpcResponseError` 从 protocol 转出 |
| `packages/sdk/client/package.json` | 包名 `@deepseek-ai/dsh-sdk-client`；`exports` 含 `.` 与 `./invariant` |
| `packages/sdk/client/tests/sdk-client.spec.ts` | 真子进程 + fake runtime：握手、超时、stderr tail、session 树、阶梯 |
| `packages/sdk/client/tests/dispose.spec.ts` | 可脚本 fake child：三档时机与 Windows 跳档 |
| `packages/subagent/subagent-dsh-sdk/src/index.ts` | Consumer 插件：`name` / `inject = ['subagents']` / `startSdkRun` |
| `packages/subagent/subagent-dsh-sdk/src/run.ts` | in-harness Consumer：`new DeepSeekHarness` + `scrubbedParentEnv` |
| `packages/sdk/protocol/src/types.ts` | 三个请求、四个通知的 wire 地图 |
| `packages/sdk/protocol/src/transport.ts` | `JsonRpcLineTransport.request` 的 abort → `pending.delete` |
| `vendor/cordis/src/events.ts` | 全局 waterfall：必须 `next()` 才会 `cbs.shift()` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `HarnessClientOptions` | `command` 必填。`args` 默认 `[]`。`env` 省略则 `process.env` 原样继承；传入对象则**整表替换**（本库不 scrub）。`requestTimeoutMs` 省略 = 无限等。`shutdownTimeoutMs` 默认 `1000`；`disposeEofGraceMs` 默认 `6000`；`disposeGraceMs` 默认 `3000`。[E: packages/sdk/client/src/client.ts:206] [E: packages/sdk/client/src/client.ts:208] [E: packages/sdk/client/src/client.ts:389] [E: packages/sdk/client/src/client.ts:396] [E: packages/sdk/client/src/client.ts:397] |
| `DeepSeekHarnessOptions` | `launch` + 可选 `cwd` / `provider` / `model` / `maxTokens`。省略时 `provider` 回落 `'deepseek-official'`，`model` 回落 `'deepseek-v4-flash'`；`cwd` 在构造期 `resolve(options.cwd ?? launch.cwd ?? process.cwd())`，避免相对路径在父子两边各 resolve 一次。[E: packages/sdk/client/src/api.ts:39] [E: packages/sdk/client/src/api.ts:40] [E: packages/sdk/client/src/api.ts:41] |
| `HarnessSdkRequestMap` | 客户端→服务器恰好三个：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/protocol/src/types.ts:102] [E: packages/sdk/protocol/src/types.ts:103] [E: packages/sdk/protocol/src/types.ts:104] |
| `HarnessSdkNotificationMap` | 服务器→客户端恰好四个：`session.event` / `session.status` / `subagent.started` / `subagent.finished`。[E: packages/sdk/protocol/src/types.ts:94] [E: packages/sdk/protocol/src/types.ts:95] [E: packages/sdk/protocol/src/types.ts:96] [E: packages/sdk/protocol/src/types.ts:97] |
| `InitializeResult` | 本客户端只检查 `serverInfo.name` / `version` 是 string，**不**钉死 `deepseek-harness-sdk-runtime`（那是 protocol / server 的合同）。[E: packages/sdk/client/src/client.ts:271] |
| `RunResult` | `sessionId` + `finalResponse`（最后一个 `assistant/message` 的 text 拼接）+ 根 session 的 typed `events` + 整棵 session 树的 raw `notifications`。[E: packages/sdk/client/src/api.ts:189] |
| `NotificationSubscription` | `next` / `tryNext` / `close`。运行时死亡：已入队的还能 drain，以后 `next` reject。手动 `close`：队列清空，立刻 `TransportClosedError('notification subscription closed')`。[E: packages/sdk/client/src/client.ts:129] [E: packages/sdk/client/src/client.ts:130] |
| stderr tail | 最多保留最新 `400` 行，拼进 `TransportClosedError` 文案。[E: packages/sdk/client/src/client.ts:28] [E: packages/sdk/client/src/client.ts:440] |

未知 `sessionId` 的 `session/prompt` 由 **server** 懒创建 agent+session。本客户端的 `DeepSeekHarness.session(id?)` 只铸本地字符串（默认 `session-${uuid-without-dashes}`），第一次 `prompt` 才上线。[E: packages/sdk/client/src/api.ts:89] [E: packages/sdk/client/src/client.ts:283]

## 控制流

1. 调用方 `new HarnessClient(options)` 或 `new DeepSeekHarness({ launch, …route })`。此时还不 `spawn`。`DeepSeekHarness` 构造器立刻 `new HarnessClient(options.launch)` 并把 workspace cwd 收成绝对路径。[E: packages/sdk/client/src/api.ts:35] [E: packages/sdk/client/src/api.ts:39]

2. `HarnessClient.start@packages/sdk/client/src/client.ts`：若已经 `close()` 过（`closeTask` 有值）抛 `TransportClosedError('… client is closed')`；若 `child` 仍活着则幂等返回。[E: packages/sdk/client/src/client.ts:204] [E: packages/sdk/client/src/client.ts:205] 否则 `spawn`。stdio 三根都是 pipe：stdout 走 JSON-RPC，stderr 留给本库做诊断 tail，**不是** `inherit`。`env` 省略则继承父 `process.env`。[E: packages/sdk/client/src/client.ts:206] [E: packages/sdk/client/src/client.ts:208] [E: packages/sdk/client/src/client.ts:209] spawn 失败走 `error`：关掉 transport、fail 所有订阅。`exit` 同样 fail 订阅；全部 stdio `close` 后再 `transport.close()`，避免丢掉 stdout 尾帧。

3. `request@packages/sdk/client/src/client.ts` 会先 `start()`。孩子已经 `exit` / spawn 失败则等最多 `STREAM_SETTLE_MS = 100` 收齐 stderr，再抛带 exit code + tail 的 `TransportClosedError`，不往已毁的 pipe 里写。[E: packages/sdk/client/src/client.ts:302] [E: packages/sdk/client/src/client.ts:305] [E: packages/sdk/client/src/client.ts:31] 省略 `params` 时线上送 `{}`。[E: packages/sdk/client/src/client.ts:314]

4. 超时是**本侧放弃**，不是 wire cancel。有 `timeoutMs`（或 options 上的 `requestTimeoutMs`）时建 `AbortController`，到期 `abort(new RequestTimeoutError(…))`；`JsonRpcLineTransport.request` 在 abort 时 `pending.delete(id)`，重复对挂住的 method 发有界请求不会堆积 pending。[E: packages/sdk/client/src/client.ts:320] [E: packages/sdk/protocol/src/transport.ts:132] 测试连打三次 50ms 超时后 `transport.pending.size === 0`。[E: packages/sdk/client/tests/sdk-client.spec.ts:267] 服务器侧那次 `session/prompt` 仍会跑到 runtime 被 `close`。`JsonRpcResponseError` 与 `RequestTimeoutError` 原样再抛；其余传输失败改写成带进程上下文的 `TransportClosedError`。[E: packages/sdk/client/src/client.ts:328]

5. `initialize` 调 `request('initialize', { …params })`，校验 `serverInfo.name/version` 后只回这两个字段。[E: packages/sdk/client/src/client.ts:269] `prompt` 调 `request('session/prompt', { sessionId, contentBlocks })`，必须拿到 string `messageId`，否则 `SdkProtocolError`。[E: packages/sdk/client/src/client.ts:285] [E: packages/sdk/client/src/client.ts:287] 测试里一次 `request('initialize')` 看到 fake runtime 的 `serverInfo.name === 'deepseek-harness-sdk-runtime'`。[E: packages/sdk/client/tests/sdk-client.spec.ts:371]

6. `subscribe` 给每个通知流一个递增 id。filter 抛错只 fail **这一条**订阅（非 `Error` 会 `new Error(String(error))`），兄弟订阅和 read loop 不受影响。[E: packages/sdk/client/src/client.ts:156] [E: packages/sdk/client/tests/sdk-client.spec.ts:401] `close()` 之后或进程已死后新建的订阅生来就是 failed，`next()` 立刻 reject，不会永久挂起。[E: packages/sdk/client/src/client.ts:346]

7. `subscribeSessionTree(rootId)` 在**客户端**按 `subagent.started` 边建 `sessionParents` 图，再过滤通知：`subagent.started` / `subagent.finished` 看 `parentSessionId` 是否是 root 的后代，或 `childSessionId === root`；其余通知看 `params.sessionId`。[E: packages/sdk/client/src/client.ts:364] [E: packages/sdk/client/src/client.ts:409] 空边、自环（`parentId === childId`）不写入 map。[E: packages/sdk/client/src/client.ts:412] runtime 会广播它 context 里每一个 session；裁剪不在 server。

8. `DeepSeekHarness.start` 把 `start` + `initialize({ cwd, provider, model, maxTokens? })` memo 成 `this.initialized`。握手失败：清 memo、`clientInstance.close()`（`HarnessClient.close` 是永久的），若 harness 自己还没 `close` 就换一个新的 `HarnessClient(this.launch)`，再把原错误抛出——下次 `start` 会再 spawn。[E: packages/sdk/client/src/api.ts:73] [E: packages/sdk/client/src/api.ts:75] harness 级 `close()` 先把 `closed = true`，失败后不再换新客户端。[E: packages/sdk/client/src/api.ts:108] 测试：第一次握手失败后 `harness.client` 不是原实例；`close()` 之后再 `run` 是 `TransportClosedError`。[E: packages/sdk/client/tests/sdk-client.spec.ts:220] [E: packages/sdk/client/tests/sdk-client.spec.ts:224]

9. `HarnessSession.run`：`await harness.start()`，`normalizeInput`（string → 单块 text；块数组原样），`subscribeSessionTree`，`client.prompt`。在看到本 session 上、`inserted` 里带该 `messageId` 的 `agent/inbox/spliced` 之前，所有通知都丢掉。[E: packages/sdk/client/src/api.ts:176] [E: packages/sdk/client/src/api.ts:203] 回执之后 `collect`：只有根 session 的 `session.event` 进入 typed `events`（`assistant/message` 必须带 kind-tagged content 数组，否则 `SdkProtocolError`）；树里其它通知只进 `notifications` / `onNotification`。直到根 session `session.status === 'idle'` 才返回。[E: packages/sdk/client/src/api.ts:155] [E: packages/sdk/client/src/api.ts:180] `finally` 里 `subscription.close()`。

10. `HarnessClient.close` 幂等：`closeTask ??= performClose()`。[E: packages/sdk/client/src/client.ts:381] 没有 child 直接返回。否则先 `request('shutdown', undefined, shutdownTimeoutMs ?? 1000)`；失败只追加一行 stderr 诊断，**拆卸权威是阶梯**。[E: packages/sdk/client/src/client.ts:389] 然后 `disposeRuntimeProcess`。

11. `disposeRuntimeProcess@packages/sdk/client/src/dispose.ts`：孩子已有 `exitCode` / `signalCode` 则立刻返回，不 EOF、不发信号。[E: packages/sdk/client/src/dispose.ts:88] 否则 `stdin?.end()`，等 `disposeEofGraceMs`；合作退出则停。[E: packages/sdk/client/src/dispose.ts:90] [E: packages/sdk/client/src/dispose.ts:91] `platform !== 'win32'` 才 `kill('SIGTERM')` 再等 `disposeGraceMs`。[E: packages/sdk/client/src/dispose.ts:93] [E: packages/sdk/client/src/dispose.ts:94] 最后 `forceTerminateWithin`（`SIGKILL`，再等一档 `disposeGraceMs`）。Windows 上 Node 把 SIGTERM/SIGKILL 都映射成 `TerminateProcess`，所以跳过中间档；单测 `platform: 'win32'` 时 `kills === ['SIGKILL']`。[E: packages/sdk/client/tests/dispose.spec.ts:163] POSIX 上忽略 EOF 的孩子会落到 SIGTERM（真子进程测 `FAKE_SIGTERM_FILE`）；再 trap SIGTERM 则 `close()` 仍 resolve，靠 SIGKILL 收尸。[E: packages/sdk/client/tests/sdk-client.spec.ts:339] [E: packages/sdk/client/tests/sdk-client.spec.ts:350] grace timer `.unref()`，避免挂住父 event loop。

12. **in-harness Consumer。** `@deepseek-ai/dsh-subagent-dsh-sdk` 插件名 `subagent-dsh-sdk`，`inject = ['subagents']`——故意没有 `subprocess`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:25] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:26] `SdkSubagentProvider.start` 只组 `SdkRunSpec` 再 `return startSdkRun(request, spec)`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:118] `startSdkRun` `new DeepSeekHarness({ launch: { command, args, cwd, env: { ...scrubbedParentEnv(), ...spec.env }, …timeouts }, cwd, provider, model })`，然后 `harness.start()` / `harness.session(childSessionId).run(prompt)` / `teardown: () => harness.close()`。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:118] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:123] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:150] 父 namespace 的 `SubagentRun.id` 与孩子 runtime 里的 session id 不是同一个；门控与 `localAgent: undefined` 不在本页。

## 设计动机

`HarnessClient` 必须独占三根 stdio、JSON-RPC pending 表、以及「先协议 `shutdown`、再 EOF 让孩子刷盘、再信号」的安静窗口。若再包一层 `ctx.subprocess.spawn`，两套生命周期会抢 stdin EOF 和退出边。subprocess 缝把 `scrubbedParentEnv` 做成可独立 import 的纯函数，正是给这种 SDK 托管传输用的：本库不 scrub，调用方（`startSdkRun`）自己叠。ACP / Codex / Claude 子进程是普通 CLI stdio，走 `ctx.subprocess`。

协议只有三个请求、没有 `session/cancel`。超时只能扔掉本侧 pending，不能让 runtime 停 turn。要停，就 `close()` 整棵孩子。

`DeepSeekHarness` 把握手与「等到 idle」收成和 Python SDK 同形的 API，让 `dsh-subagent-dsh-sdk` 与外部脚本共用一条 spawn 路径。相对 cwd 必须在**本进程**先 `resolve`：孩子 spawn 的 cwd 是 launch cwd，孩子内部还会再 resolve 一次 wire `cwd`，相对值会变成 `worker/worker`。

session 树裁剪放在客户端，是因为 runtime 通知它 context 里每一个 session；Python 客户端做同一件事。`subagent.started` 边只在客户端记 parent map，不要求 server 按订阅过滤。

`serverInfo.name` 不在客户端钉死，是为了让假 runtime / 测试替身能回答握手；真 runtime 的名字由 protocol / server 合同保证。

## Gotcha

- **不是 shipped 默认路径。** 不要在 `dsh-base` patch 里找 `id: sdk-client`。`dsh web` 的委托后端是 in-process `spawn`，不经过本库。
- **`env: undefined` 会把父进程密钥原样带进孩子。** 隔离启动必须自己传表（典型：`{ ...scrubbedParentEnv(), ...explicit }`）。本库不会调用 `scrubbedParentEnv`。
- **没有 wire 级 cancel。** `RequestTimeoutError` 只放弃这一次等待；挂住的 `session/prompt` 在 server 上继续跑，直到 `close()` 走 shutdown + 阶梯。
- **`HarnessClient.close` 永久。** 同一实例不能再 `start()`。握手重试是 `DeepSeekHarness` 换成新的 `HarnessClient`，而且只在 harness 尚未 `close` 时发生。
- **相对 launch cwd 会双解析。** 只 `new HarnessClient({ cwd: 'worker' })` 并把相对字符串送进 `initialize`，孩子会再 resolve 一次。走 `DeepSeekHarness` 才在握手前收成绝对路径。
- **`RunResult.events` 不含后代。** 子 session 的 `assistant/message` 只出现在 `notifications` 里；`finalResponse` 只读根 session。
- **手动 `subscribe().close()` 丢队列；进程死不丢。** 不要用「订阅还在不在」判断孩子是否还活着。
- **客户端不验证 `serverInfo.name`。** 畸形握手（缺 `serverInfo`）才是 `SdkProtocolError`；一个瞎填的 name 能通过 `initialize`。
- **Windows 没有 SIGTERM 档。** 单测必须把 `platform` 注成 `'linux'` / `'win32'`，不要用本机 `process.platform` 推断中间档。
- **`await using DeepSeekHarness` 等于 `close()`。** 离开作用域后再 `run` 是 `TransportClosedError`。[E: packages/sdk/client/src/api.ts:116]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition（wire）** | `@deepseek-ai/dsh-sdk-protocol` 的 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` / `JsonRpcLineTransport` | **无** `ctx.*`。三个请求、四个通知。细节在 [`subsys.integration.sdk-protocol`](sdk-protocol.md) |
| **Provider（runtime 进程内）** | `@deepseek-ai/dsh-sdk-jsonrpc-server` | `inject = ['agents']`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset。孩子自己的 `cordis.yml` 挂它 |
| **本页（进程外 client）** | `@deepseek-ai/dsh-sdk-client` 的 `HarnessClient` / `DeepSeekHarness` | **不**登记 `ctx.*`。`HarnessClient.start` 自己 `child_process.spawn`。不进任何 shipped patch |
| **Consumer（harness 内）** | `@deepseek-ai/dsh-subagent-dsh-sdk` 的 `startSdkRun` | `inject = ['subagents']` only。`new DeepSeekHarness` + `scrubbedParentEnv`。overlay-only，默认 `providerName: dsh-sdk` |
| **Consumer（库调用方）** | 外部 TS / `examples/jsonrpc-agent` 测试 | 直接 `new DeepSeekHarness({ launch })`。不是 Cordis 行 |
| **对照（走 subprocess 的进程外）** | `dsh-subagent-acp` | `inject` 含 `subprocess`；ACP stdio 不由本库拥有 |
| **subprocess 缝（本库例外）** | `@deepseek-ai/dsh-subprocess` 的 `ctx.subprocess` | 本库不 `inject`、不 `spawn`。调用方可单独 import `scrubbedParentEnv` |

换一条 SDK 传输 = 换 `HarnessClientOptions.command` / `args` / `env`（以及孩子 `cordis.yml`），不是改 `dsh-base`。本库没有 `registerProvider`，不存在同名覆盖问题。

## Sources

- packages/sdk/client/src/client.ts
- packages/sdk/client/src/api.ts
- packages/sdk/client/src/dispose.ts
- packages/sdk/client/src/index.ts
- packages/sdk/client/src/types.ts
- packages/sdk/client/src/invariant.ts
- packages/sdk/client/package.json
- packages/sdk/client/tests/sdk-client.spec.ts
- packages/sdk/client/tests/dispose.spec.ts
- packages/subagent/subagent-dsh-sdk/src/index.ts
- packages/subagent/subagent-dsh-sdk/src/run.ts
- packages/sdk/protocol/src/types.ts
- packages/sdk/protocol/src/transport.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset`；默认安装是 `dsh web`，不是 TUI。本库不在那条 shipped 树上。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer。本库是 subprocess 缝的 SDK 托管传输例外，不占 `ctx.subprocess`。
- [subsys.integration.sdk-protocol](sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三个请求、四个通知、`JsonRpcLineTransport`；`serverInfo.name` 钉死在协议层。
- [subsys.integration.sdk-server](sdk-server.md)（`subsys.integration.sdk-server`）：孩子进程里的 JSON-RPC server；`shutdown` 回结果后再拆 root fiber。
- [subsys.orchestration.subagent-dsh-sdk](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）：用本客户端拉起子 runtime 的 overlay-only Provider；门控不在本页。
- [surface.sdk.typescript](../../surface/sdk/typescript.md)（`surface.sdk.typescript`）：TS SDK 对外部调用方的可见面（高层 API / 错误类型），不写 spawn 阶梯。
- [surface.sdk.python](../../surface/sdk/python.md)（`surface.sdk.python`）：设计孪生 `HarnessClient`；本页不写 `Popen`。
- [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess.spawn` 与 `scrubbedParentEnv`。本库不走前者，调用方可 import 后者。
