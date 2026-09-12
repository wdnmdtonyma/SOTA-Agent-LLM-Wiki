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
  - packages/sdk/client/src/launch.ts
  - packages/sdk/client/src/index.ts
  - packages/sdk/client/src/types.ts
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
  - resolveDshLaunch
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
updated: c291e7961a
---

> `@deepseek-ai/dsh-sdk-client` 是跑在 **harness 进程外** 的 TypeScript JSON-RPC 客户端库：`HarnessClient` 通过 `resolveDshLaunch` 把选项收成 `process.execPath` + 同版本 `@deepseek-ai/dsh` 的 `--profile`（默认 `sdk`）argv，再 `node:child_process.spawn` 拉起一份完整 runtime，在孩子 stdio 上讲 `@deepseek-ai/dsh-sdk-protocol`。它不登记任何 `ctx.*`，也 **不** 走 `ctx.subprocess`——这是 subprocess 缝对 SDK 托管传输的文档化例外。高层包装是 `DeepSeekHarness` / `HarnessSession`。设计孪生是 `python/sdk` 的 `HarnessClient`（本页不展开 Python）。

## 能回答的问题

- `HarnessClient` 怎么 `spawn` 子 runtime？默认 profile 是什么？为什么不能 `inject` `ctx.subprocess`？
- `close()` 的拆卸阶梯是 EOF → SIGTERM → SIGKILL 吗？Windows 少哪一档？默认 grace 是多少？
- 客户端发出哪三个 JSON-RPC 请求？`session` 树订阅在哪一侧裁剪？有没有 wire 级 prompt cancel？
- `TransportClosedError` / `RequestTimeoutError` / `SdkProtocolError` / `JsonRpcResponseError` 各在哪条路径抛出？
- `dsh-subagent-dsh-sdk` 怎样用本库拉起孩子？`inject` 为什么只有 `subagents`？
- 本库是不是 `dsh web` / shipped bundle 的一部分？孩子走的是 `dsh --profile sdk` 还是裸 `dsh-jsonrpc-agent` 二进制？

## 职责边界

本包装载名是 `@deepseek-ai/dsh-sdk-client`。[E: packages/sdk/client/package.json:2] 包根导出 `DeepSeekHarness` / `HarnessSession`、`HarnessClient` 与三类错误、以及协议包的 `JsonRpcResponseError`。[E: packages/sdk/client/src/index.ts:12] [E: packages/sdk/client/src/index.ts:21] 它拥有：

- **进程与传输所有权。** `HarnessClient.start` 调 `spawn(this.runtime.command, this.runtime.args, { cwd, env: this.runtime.environment(), stdio: ['pipe','pipe','pipe'] })`。[E: packages/sdk/client/src/client.ts:214] [E: packages/sdk/client/src/client.ts:217] 默认 runtime 来自 `resolveDshLaunch`：`command` 是 `process.execPath`，argv 是同版本 dsh + `--profile` + 可选 `--patch`。[E: packages/sdk/client/src/launch.ts:142] [E: packages/sdk/client/src/launch.ts:143]
- **拆卸阶梯。** `disposeRuntimeProcess`：stdin EOF →（POSIX）SIGTERM → SIGKILL，必须等到孩子真的 `exit`。[E: packages/sdk/client/src/dispose.ts:90] [E: packages/sdk/client/src/dispose.ts:94] [E: packages/sdk/client/src/dispose.ts:98]
- **高层 turn API。** `DeepSeekHarness` 懒启动 + 一次 `initialize`；`HarnessSession.run` 等到本 session 的 inbox 回执后再等到 `session.status === 'idle'`。[E: packages/sdk/client/src/api.ts:69] [E: packages/sdk/client/src/api.ts:177] [E: packages/sdk/client/src/api.ts:212]
- **客户端错误面。** `TransportClosedError`（进程没了 / 已 close）、`RequestTimeoutError`（本侧放弃等待）、`SdkProtocolError`（回包缺字段或 `session.event` 畸形）。[E: packages/sdk/client/src/client.ts:39] [E: packages/sdk/client/src/client.ts:48] [E: packages/sdk/client/src/client.ts:60]

它**不**拥有：

- wire 形状与 NDJSON transport 实现 — [`subsys.integration.sdk-protocol`](sdk-protocol.md)（`subsys.integration.sdk-protocol`）。本页只调用 `JsonRpcLineTransport.request` / `onNotification`。
- runtime 进程里的 `sdk-jsonrpc-server`、`shutdown` 之后的 fiber dispose — [`subsys.integration.sdk-server`](sdk-server.md)（`subsys.integration.sdk-server`）。
- `ctx.subagents` Definition、`start` / `startContinuable` 门控、`SdkSubagentProvider` 广告 — [`subsys.orchestration.subagent-dsh-sdk`](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）。本页只写那个 Provider 怎样 `new DeepSeekHarness`。
- `ctx.subprocess`、树级 teardown、`scrubbedParentEnv` 纯函数 — [`subsys.execution.subprocess`](../execution/subprocess.md)（`subsys.execution.subprocess`）。本库 **不** `inject` 该键；凭据擦除是调用方的事。
- Python `HarnessClient` 的 `subprocess.Popen` — [`surface.sdk.python`](../../surface/sdk/python.md)（`surface.sdk.python`）。[I] 两家讲同一份 protocol，实现不共享。
- 模型可见工具 schema。本库不是 `ctx.tools` Consumer。

**不是 Cordis 插件，不进 shipped 树。** 产品宿主入口是 `dsh web` **以及** `dsh --profile sdk|sdk-minimal|acp|headless`（五个 shipped profile：`web` live，其余 startup）。默认 GUI 路径仍是 `dsh web`；本仓没有 shipped TUI。`dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app` 与四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）都不把本库挂成 Cordis 行。[I] 包存在 ≠ 产品默认装。被 spawn 的孩子是另一份完整 harness：默认 `profile: 'sdk'`，叠 `dsh-base` + `dsh-sdk-app`（不是 `sdk-minimal`，后者不叠 base）。那是孩子进程的 host / preset，不是本库。

客户端跑在任何 harness context 之外，runtime 自己的包才拥有事件流不变量。仓库里没有任何 yml 把本包当 Loader 行挂上。[I]

**没有 waterfall，没有 isolate。** 本库不往 `Events.waterfall` 挂 listener，也不 `provide` 服务。父进程若本身是一份 harness（例如 overlay 了 `dsh-subagent-dsh-sdk` 的 host），父 turn 的 `tools/pre-execute` 仍是 waterfall：`Events.waterfall` 把最后一个参数当 innermost `next`，监听器必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层，到不了 tool `execute`。[E: vendor/cordis/src/events.ts:238] 本库不参与那条链。浏览器 client 不执行 `HarnessClient.start`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sdk/client/src/client.ts` | `HarnessClient`：`spawn`、三类 Error、`initialize` / `prompt` / `request` / `subscribe` / `close` |
| `packages/sdk/client/src/launch.ts` | `resolveDshLaunch`：同版本 dsh bin / 源码 tsx 回退、`--profile`、`--patch`、`DSH_HOME` |
| `packages/sdk/client/src/api.ts` | `DeepSeekHarness` / `HarnessSession`：握手 memo、相对 cwd 先 `resolve`、跑到 idle |
| `packages/sdk/client/src/dispose.ts` | `disposeRuntimeProcess`：EOF / SIGTERM / SIGKILL |
| `packages/sdk/client/src/types.ts` | `HarnessClientOptions` / `DeepSeekHarnessOptions` / `RunResult` |
| `packages/sdk/client/src/index.ts` | 包根再导出；`JsonRpcResponseError` 从 protocol 转出 |
| `packages/sdk/client/package.json` | 包名 `@deepseek-ai/dsh-sdk-client`；runtime 依赖 `@deepseek-ai/dsh` |
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
| `HarnessClientOptions` | 无裸 `command`/`args`。`profile` 默认 `'sdk'`。`dshBin` 省略则解析同版本 `@deepseek-ai/dsh`。`patches` 相对路径在 spawn 前 `resolve`。`dshHome` 写入孩子 `DSH_HOME`。`processCwd` 是 **dsh 进程** cwd。`env` 省略则 `process.env` 原样继承；传入对象则整表替换（本库不 scrub）。`initializeTimeoutMs` 默认 `10000`。`requestTimeoutMs` 省略 = 无限等。`shutdownTimeoutMs` 默认 `1000`；`disposeEofGraceMs` 默认 `6000`；`disposeGraceMs` 默认 `3000`。[E: packages/sdk/client/src/types.ts:28] [E: packages/sdk/client/src/launch.ts:132] [E: packages/sdk/client/src/launch.ts:151] [E: packages/sdk/client/src/client.ts:398] [E: packages/sdk/client/src/client.ts:405] |
| `DeepSeekHarnessOptions` | 继承 launch 选项 + 可选 `cwd` / `provider` / `model` / `reasoningEffort` / `maxTokens`。省略时 `provider` 回落 `'deepseek-official'`，`model` 回落 `'deepseek-v4-flash'`；`cwd` 在构造期 `resolve(options.cwd ?? options.processCwd ?? process.cwd())`，避免相对路径在父子两边各 resolve 一次。[E: packages/sdk/client/src/api.ts:41] [E: packages/sdk/client/src/api.ts:42] [E: packages/sdk/client/src/api.ts:43] |
| `HarnessSdkRequestMap` | 客户端→服务器恰好三个：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/protocol/src/types.ts:116] [E: packages/sdk/protocol/src/types.ts:117] [E: packages/sdk/protocol/src/types.ts:118] |
| `HarnessSdkNotificationMap` | 服务器→客户端恰好四个：`session.event` / `session.status` / `subagent.started` / `subagent.finished`。[E: packages/sdk/protocol/src/types.ts:108] [E: packages/sdk/protocol/src/types.ts:109] [E: packages/sdk/protocol/src/types.ts:110] [E: packages/sdk/protocol/src/types.ts:111] |
| `InitializeResult` | 本客户端只检查 `serverInfo.name` / `version` 是 string，**不**钉死 `deepseek-harness-sdk-runtime`（那是 protocol / server 的合同）。[E: packages/sdk/client/src/client.ts:279] |
| `RunResult` | `sessionId` + `finalResponse`（最后一个 `assistant/message` 的 text 拼接）+ 根 session 的 typed `events` + 整棵 session 树的 raw `notifications`。[E: packages/sdk/client/src/api.ts:218] |
| `NotificationSubscription` | `next` / `tryNext` / `close`。运行时死亡：已入队的还能 drain，以后 `next` reject。手动 `close`：队列清空，立刻 `TransportClosedError('notification subscription closed')`。[E: packages/sdk/client/src/client.ts:130] [E: packages/sdk/client/src/client.ts:131] |
| stderr tail | 最多保留最新 `400` 行，拼进 `TransportClosedError` 文案。[E: packages/sdk/client/src/client.ts:29] [E: packages/sdk/client/src/client.ts:448] |

未知 `sessionId` 的 `session/prompt` 由 **server** 懒创建 agent+session。本客户端的 `DeepSeekHarness.session(id?)` 只铸本地字符串（默认 `session-${uuid-without-dashes}`），第一次 `prompt` 才上线。[E: packages/sdk/client/src/api.ts:104] [E: packages/sdk/client/src/client.ts:291]

## 控制流

1. 调用方 `new HarnessClient(options)` 或 `new DeepSeekHarness(options?)`。此时还不 `spawn`。默认构造立刻 `resolveDshLaunch(options)` 并 `new HarnessClient`；`DeepSeekHarness` 把 workspace cwd 收成绝对路径。[E: packages/sdk/client/src/client.ts:204] [E: packages/sdk/client/src/api.ts:36] [E: packages/sdk/client/src/api.ts:41]

2. `resolveDshLaunch@packages/sdk/client/src/launch.ts`：`profile` 默认 `'sdk'`。未给 `dshBin` 时走 `installedDshNodeLaunch`：同版本 `package.json` 对账，有 built bin 则 `nodeArgs: [bin]`；源码 checkout 缺 bin 则 `node --import tsx src/bin.ts` 并塞内部 `sdk-source.cordis.patch.yml`。[E: packages/sdk/client/src/launch.ts:132] [E: packages/sdk/client/src/launch.ts:92] [E: packages/sdk/client/src/launch.ts:105] argv：`[...nodeArgs, '--profile', profile, ...patches.flatMap(p => ['--patch', p])]`。[E: packages/sdk/client/src/launch.ts:143] `environment()` 在 spawn 时才读：`(options.env ?? process.env)` + tsx 环境 + 可选 `DSH_HOME`。[E: packages/sdk/client/src/launch.ts:145]

3. `HarnessClient.start@packages/sdk/client/src/client.ts`：若已经 `close()` 过（`closeTask` 有值）抛 `TransportClosedError('… client is closed')`；若 `child` 仍活着则幂等返回。[E: packages/sdk/client/src/client.ts:212] [E: packages/sdk/client/src/client.ts:213] 否则 `spawn`。stdio 三根都是 pipe：stdout 走 JSON-RPC，stderr 留给本库做诊断 tail，**不是** `inherit`。spawn 失败走 `error`：关掉 transport、fail 所有订阅。`exit` 同样 fail 订阅；全部 stdio `close` 后再 `transport.close()`，避免丢掉 stdout 尾帧。[E: packages/sdk/client/src/client.ts:214] [E: packages/sdk/client/src/client.ts:217] 假 runtime 测试用 `createProcessHarnessClient`，绕过 dsh argv。[E: packages/sdk/client/src/client.ts:470]

4. `request@packages/sdk/client/src/client.ts` 会先 `start()`。孩子已经 `exit` / spawn 失败则等最多 `STREAM_SETTLE_MS = 100` 收齐 stderr，再抛带 exit code + tail 的 `TransportClosedError`，不往已毁的 pipe 里写。[E: packages/sdk/client/src/client.ts:313] [E: packages/sdk/client/src/client.ts:32] 省略 `params` 时线上送 `{}`。[E: packages/sdk/client/src/client.ts:322]

5. 超时是**本侧放弃**，不是 wire cancel。有 `timeoutMs`（或 options 上的 `requestTimeoutMs`）时建 `AbortController`，到期 `abort(new RequestTimeoutError(…))`；`JsonRpcLineTransport.request` 在 abort 时 `pending.delete(id)`，重复对挂住的 method 发有界请求不会堆积 pending。[E: packages/sdk/client/src/client.ts:327] [E: packages/sdk/protocol/src/transport.ts:132] 测试连打三次 50ms 超时后 `transport.pending.size === 0`。[E: packages/sdk/client/tests/sdk-client.spec.ts:343] 服务器侧那次 `session/prompt` 仍会跑到 runtime 被 `close`。`JsonRpcResponseError` 与 `RequestTimeoutError` 原样再抛；其余传输失败改写成带进程上下文的 `TransportClosedError`。[E: packages/sdk/client/src/client.ts:337]

6. `initialize` 用 `runtime.initializeTimeoutMs`（默认 10s）调 `request('initialize', { …params })`，校验 `serverInfo.name/version` 后只回这两个字段。[E: packages/sdk/client/src/client.ts:277] [E: packages/sdk/client/src/launch.ts:12] `prompt` 调 `request('session/prompt', { sessionId, contentBlocks })`，必须拿到 string `messageId`，否则 `SdkProtocolError`。[E: packages/sdk/client/src/client.ts:293] [E: packages/sdk/client/src/client.ts:295] 测试里一次 `request('initialize')` 看到 fake runtime 的 `serverInfo.name === 'deepseek-harness-sdk-runtime'`。[E: packages/sdk/client/tests/sdk-client.spec.ts:459]

7. `subscribe` 给每个通知流一个递增 id。filter 抛错只 fail **这一条**订阅（非 `Error` 会 `new Error(String(error))`），兄弟订阅和 read loop 不受影响。[E: packages/sdk/client/src/client.ts:157] [E: packages/sdk/client/tests/sdk-client.spec.ts:480] `close()` 之后或进程已死后新建的订阅生来就是 failed，`next()` 立刻 reject，不会永久挂起。[E: packages/sdk/client/src/client.ts:355]

8. `subscribeSessionTree(rootId)` 在**客户端**按 `subagent.started` 边建 `sessionParents` 图，再过滤通知：`subagent.started` / `subagent.finished` 看 `parentSessionId` 是否是 root 的后代，或 `childSessionId === root`；其余通知看 `params.sessionId`。[E: packages/sdk/client/src/client.ts:373] [E: packages/sdk/client/src/client.ts:418] 空边、自环（`parentId === childId`）不写入 map。[E: packages/sdk/client/src/client.ts:421] runtime 会广播它 context 里每一个 session；裁剪不在 server。

9. `DeepSeekHarness.start` 把 `start` + `initialize({ cwd, provider, model, reasoningEffort?, maxTokens? })` memo 成 `this.initialized`。握手失败：清 memo、`clientInstance.close()`（`HarnessClient.close` 是永久的）。cleanup **也**失败则抛 `AggregateError([error, cleanupError], 'DeepSeek Harness initialization and cleanup failed')` 并 **保留** 失败客户端，避免再 spawn 一个未证明已退出的进程。[E: packages/sdk/client/src/api.ts:85] [E: packages/sdk/client/src/api.ts:90] [E: packages/sdk/client/tests/sdk-client.spec.ts:232] cleanup 成功且 harness 尚未 `close` 才换一个新的 `createClient()`，再把原错误抛出——下次 `start` 会再 spawn。[E: packages/sdk/client/src/api.ts:90] harness 级 `close()` 先把 `closed = true`，失败后不再换新客户端。[E: packages/sdk/client/src/api.ts:123]

10. `HarnessSession.run`：`await harness.start()`，`normalizeInput`（string → 单块 text；块数组原样），`subscribeSessionTree`，`client.prompt`。在看到本 session 上、`inserted` 里带该 `messageId` 的 `agent/inbox/spliced` 之前，所有通知都丢掉。[E: packages/sdk/client/src/api.ts:199] [E: packages/sdk/client/src/api.ts:206] 回执之后 `collect`：只有根 session 的 `session.event` 进入 typed `events`（`assistant/message` 必须带 kind-tagged content 数组，否则 `SdkProtocolError`）；树里其它通知只进 `notifications` / `onNotification`。直到根 session `session.status === 'idle'` 才返回。[E: packages/sdk/client/src/api.ts:185] [E: packages/sdk/client/src/api.ts:212] `finally` 里 `subscription.close()`。

11. `HarnessClient.close` 幂等：`closeTask ??= performClose()`。[E: packages/sdk/client/src/client.ts:390] 没有 child 直接返回。否则先 `request('shutdown', undefined, shutdownTimeoutMs ?? 1000)`；失败只追加一行 stderr 诊断，**拆卸权威是阶梯**。[E: packages/sdk/client/src/client.ts:398] 然后 `disposeRuntimeProcess`。

12. `disposeRuntimeProcess@packages/sdk/client/src/dispose.ts`：孩子已有 `exitCode` / `signalCode` 则立刻返回，不 EOF、不发信号。[E: packages/sdk/client/src/dispose.ts:88] 否则 `stdin?.end()`，等 `disposeEofGraceMs`；合作退出则停。[E: packages/sdk/client/src/dispose.ts:90] [E: packages/sdk/client/src/dispose.ts:91] `platform !== 'win32'` 才 `kill('SIGTERM')` 再等 `disposeGraceMs`。[E: packages/sdk/client/src/dispose.ts:93] [E: packages/sdk/client/src/dispose.ts:94] 最后 `forceTerminateWithin`（`SIGKILL`，再等一档 `disposeGraceMs`）。Windows 上 Node 把 SIGTERM/SIGKILL 都映射成 `TerminateProcess`，所以跳过中间档；单测 `platform: 'win32'` 时 `kills === ['SIGKILL']`。[E: packages/sdk/client/tests/dispose.spec.ts:163] POSIX 上忽略 EOF 的孩子会落到 SIGTERM（真子进程测 `FAKE_SIGTERM_FILE`）；再 trap SIGTERM 则 `close()` 仍 resolve，靠 SIGKILL 收尸。[E: packages/sdk/client/tests/sdk-client.spec.ts:418] [E: packages/sdk/client/tests/sdk-client.spec.ts:430] grace timer `.unref()`，避免挂住父 event loop。

13. **in-harness Consumer。** `@deepseek-ai/dsh-subagent-dsh-sdk` 插件名 `subagent-dsh-sdk`，`inject = ['subagents']`——故意没有 `subprocess`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:30] [E: packages/subagent/subagent-dsh-sdk/src/index.ts:31] `SdkSubagentProvider.start` 只组 `SdkRunSpec` 再 `return startSdkRun(request, spec)`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:174] `startSdkRun` 经 `internals.createHarness`（默认 `new DeepSeekHarness`）组 `{ dshBin?, profile, patches, dshHome, processCwd: spec.cwd, env: { ...scrubbedParentEnv(), ...spec.env }, …timeouts, cwd, provider, model }`，然后 `harness.start()` / `harness.session(childSessionId).run(prompt)` / `teardown` 里 `harness.close()`。[E: packages/subagent/subagent-dsh-sdk/src/run.ts:239] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:245] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:273] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:307] [E: packages/subagent/subagent-dsh-sdk/src/run.ts:323] 父 namespace 的 `SubagentRun.id` 与孩子 runtime 里的 session id 不是同一个；门控与 `localAgent: undefined` 不在本页。

## 设计动机

`HarnessClient` 必须独占三根 stdio、JSON-RPC pending 表、以及「先协议 `shutdown`、再 EOF 让孩子刷盘、再信号」的安静窗口。若再包一层 `ctx.subprocess.spawn`，两套生命周期会抢 stdin EOF 和退出边。subprocess 缝把 `scrubbedParentEnv` 做成可独立 import 的纯函数，正是给这种 SDK 托管传输用的：本库不 scrub，调用方（`startSdkRun`）自己叠。ACP / Codex / Claude 子进程是普通 CLI stdio，走 `ctx.subprocess`。

公开 API 不再接受任意 `command`/`args`：孩子必须是同版本 `dsh --profile <name>`（默认 `sdk`），才能保证 JSON-RPC server 与 protocol 对齐。测试仍可通过 `createProcessHarnessClient` 注入假 runtime。

协议只有三个请求、没有 `session/cancel`。超时只能扔掉本侧 pending，不能让 runtime 停 turn。要停，就 `close()` 整棵孩子。

`DeepSeekHarness` 把握手与「等到 idle」收成和 Python SDK 同形的 API，让 `dsh-subagent-dsh-sdk` 与外部脚本共用一条 spawn 路径。相对 cwd 必须在**本进程**先 `resolve`：孩子 spawn 的 cwd 是 `processCwd`，孩子内部还会再 resolve 一次 wire `cwd`，相对值会变成 `worker/worker`。

session 树裁剪放在客户端，是因为 runtime 通知它 context 里每一个 session；Python 客户端做同一件事。`subagent.started` 边只在客户端记 parent map，不要求 server 按订阅过滤。

`serverInfo.name` 不在客户端钉死，是为了让假 runtime / 测试替身能回答握手；真 runtime 的名字由 protocol / server 合同保证。

握手失败后必须先证明 cleanup 成功才换新 `HarnessClient`：否则会并排留下一个未收尸的 runtime。cleanup 失败走 `AggregateError`，保留原客户端。

## Gotcha

- **不是 shipped 默认路径。** 不要在 `dsh-base` patch 里找 `id: sdk-client`。`dsh web` 的委托后端是 in-process `spawn`，不经过本库。对外进程入口是调用方 `new DeepSeekHarness` 或 overlay `dsh-subagent-dsh-sdk`。
- **默认孩子是 `dsh --profile sdk`，不是任意 JSON-RPC 二进制。** `sdk-minimal` 必须显式 `profile: 'sdk-minimal'`；那条 shipped 模板不叠 `dsh-base`。
- **`env: undefined` 会把父进程密钥原样带进孩子。** 隔离启动必须自己传表（典型：`{ ...scrubbedParentEnv(), ...explicit }`）。本库不会调用 `scrubbedParentEnv`。
- **没有 wire 级 cancel。** `RequestTimeoutError` 只放弃这一次等待；挂住的 `session/prompt` 在 server 上继续跑，直到 `close()` 走 shutdown + 阶梯。
- **`HarnessClient.close` 永久。** 同一实例不能再 `start()`。握手重试是 `DeepSeekHarness` 换成新的 `HarnessClient`，而且只在 harness 尚未 `close` **且** cleanup 证明进程已退出时发生。
- **握手 + cleanup 双失败是 `AggregateError`。** 此时 `harness.client` 仍是失败那一个，不要再 `start` 叠第二份孩子。[E: packages/sdk/client/src/api.ts:85]
- **相对 launch cwd 会双解析。** 只设 `processCwd: 'worker'` 并把相对字符串送进 `initialize`，孩子会再 resolve 一次。走 `DeepSeekHarness` 才在握手前收成绝对路径。
- **`RunResult.events` 不含后代。** 子 session 的 `assistant/message` 只出现在 `notifications` 里；`finalResponse` 只读根 session。
- **手动 `subscribe().close()` 丢队列；进程死不丢。** 不要用「订阅还在不在」判断孩子是否还活着。
- **客户端不验证 `serverInfo.name`。** 畸形握手（缺 `serverInfo`）才是 `SdkProtocolError`；一个瞎填的 name 能通过 `initialize`。
- **Windows 没有 SIGTERM 档。** 单测必须把 `platform` 注成 `'linux'` / `'win32'`，不要用本机 `process.platform` 推断中间档。
- **`await using DeepSeekHarness` 等于 `close()`。** 离开作用域后再 `run` 是 `TransportClosedError`。[E: packages/sdk/client/src/api.ts:131]
- **同版本硬约束。** `resolveDshBinFromManifests` 在 client 与 `@deepseek-ai/dsh` 的 `version` 不一致时抛错。[E: packages/sdk/client/src/launch.ts:59]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition（wire）** | `@deepseek-ai/dsh-sdk-protocol` 的 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` / `JsonRpcLineTransport` | **无** `ctx.*`。三个请求、四个通知。细节在 [`subsys.integration.sdk-protocol`](sdk-protocol.md) |
| **Provider（runtime 进程内）** | `@deepseek-ai/dsh-sdk-jsonrpc-server` | `inject = ['agents']`。挂在 **孩子** 的 `dsh-sdk-app` / `dsh-sdk-minimal` 组合上，不是本库 |
| **本页（进程外 client）** | `@deepseek-ai/dsh-sdk-client` 的 `HarnessClient` / `DeepSeekHarness` | **不**登记 `ctx.*`。`start` 自己 `child_process.spawn`。不进任何 shipped patch |
| **Consumer（harness 内）** | `@deepseek-ai/dsh-subagent-dsh-sdk` 的 `startSdkRun` | `inject = ['subagents']` only。`new DeepSeekHarness` + `scrubbedParentEnv`。overlay-only，默认 `providerName: dsh-sdk` |
| **Consumer（库调用方）** | 外部 TS / 包内 fake-runtime 测试 | 直接 `new DeepSeekHarness({ profile, patches, … })`。不是 Cordis 行 |
| **对照（走 subprocess 的进程外）** | `dsh-subagent-acp` | `inject` 含 `subprocess`；ACP stdio 不由本库拥有 |
| **subprocess 缝（本库例外）** | `@deepseek-ai/dsh-subprocess` 的 `ctx.subprocess` | 本库不 `inject`、不 `spawn`。调用方可单独 import `scrubbedParentEnv` |

换一条 SDK 传输 = 换 `profile` / `patches` / `dshBin` / `env`（以及孩子 profile 的 bundle 树），不是改 `dsh-base`。本库没有 `registerProvider`，不存在同名覆盖问题。

## Sources

- packages/sdk/client/src/client.ts
- packages/sdk/client/src/api.ts
- packages/sdk/client/src/dispose.ts
- packages/sdk/client/src/launch.ts
- packages/sdk/client/src/index.ts
- packages/sdk/client/src/types.ts
- packages/sdk/client/package.json
- packages/sdk/client/tests/sdk-client.spec.ts
- packages/sdk/client/tests/dispose.spec.ts
- packages/subagent/subagent-dsh-sdk/src/index.ts
- packages/subagent/subagent-dsh-sdk/src/run.ts
- packages/sdk/protocol/src/types.ts
- packages/sdk/protocol/src/transport.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset`；默认 GUI 是 `dsh web`，另有 `dsh --profile sdk|sdk-minimal|acp|headless`。本库不在 shipped Cordis 树上，但默认 spawn 的孩子走 `sdk` profile。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer。本库是 subprocess 缝的 SDK 托管传输例外，不占 `ctx.subprocess`。
- [subsys.integration.sdk-protocol](sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三个请求、四个通知、`JsonRpcLineTransport`；`serverInfo.name` 钉死在协议层。
- [subsys.integration.sdk-server](sdk-server.md)（`subsys.integration.sdk-server`）：孩子进程里的 JSON-RPC server；`shutdown` 回结果后再拆 root fiber。
- [subsys.orchestration.subagent-dsh-sdk](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）：用本客户端拉起子 runtime 的 overlay-only Provider；门控不在本页。
- [surface.sdk.typescript](../../surface/sdk/typescript.md)（`surface.sdk.typescript`）：TS SDK 对外部调用方的可见面（高层 API / 错误类型），不写 spawn 阶梯。
- [surface.sdk.python](../../surface/sdk/python.md)（`surface.sdk.python`）：设计孪生 `HarnessClient`；本页不写 `Popen`。
- [subsys.execution.subprocess](../execution/subprocess.md)（`subsys.execution.subprocess`）：`ctx.subprocess.spawn` 与 `scrubbedParentEnv`。本库不走前者，调用方可 import 后者。
