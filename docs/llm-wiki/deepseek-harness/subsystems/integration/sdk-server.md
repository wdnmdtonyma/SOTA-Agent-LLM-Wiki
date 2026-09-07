---
id: subsys.integration.sdk-server
title: SDK server 插件
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/sdk/server/src/index.ts
  - packages/sdk/server/src/server.ts
  - packages/sdk/server/package.json
  - packages/sdk/server/tests/plugin-apply.spec.ts
  - packages/sdk/server/tests/server.spec.ts
  - packages/sdk/server/tests/plugin-shape.spec.ts
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/protocol/src/transport.ts
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/boot/app-boot/src/profile.ts
  - packages/subagent/subagent-dsh-sdk/src/index.ts
  - python/sdk-runtime/package.json
  - snapshots/sdk/subagent-dsh-sdk-dynamic-route/cordis.yml
  - vendor/loader/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - apply
  - name
  - inject
  - HarnessSdkJsonRpcServer
related:
  - spine.overview
  - spine.capability-seams
  - subsys.integration.sdk-protocol
  - subsys.integration.sdk-client
  - subsys.orchestration.subagent-dsh-sdk
  - surface.sdk.typescript
  - surface.sdk.python
  - subsys.core.agent
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-sdk-jsonrpc-server` 是 stdio JSON-RPC 服务插件：插件名 `sdk-jsonrpc-server`，源码 `inject = ['agents']`。它把已经 boot 好的 Cordis 树接到 `dsh-sdk-protocol` 的 NDJSON 帧上。Shipped 入口是 `dsh --profile sdk`（叠 `dsh-base` + `dsh-sdk-app`）与 `dsh --profile sdk-minimal`（只叠 `dsh-sdk-minimal`）；**不进** `dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-acp-app`、也不进四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`），也不是 `dsh web` 的默认面。

## 能回答的问题

- 本包在不在 shipped bundle / `dsh web` 里？哪份 yml 真正挂 `id: sdk-jsonrpc-server`？
- `apply` 怎么占用 `process.stdin` / `process.stdout`？为什么树里不能再挂 stdout logger？
- `session/prompt` 遇到未知 `sessionId` 如何懒创建？走的是 `agents.create` 还是 `resume`？
- `shutdown` 的应答、`flush`、`rootFiber.dispose()`、`process.exit(0)` 谁先谁后？裸 fiber dispose（HMR 卸插件）会不会 exit？
- 为什么必须 named export、禁止 `export default`？Loader `unwrapExports` 会丢掉什么？
- `subagent.finished` 为什么看见 `info.local === false` 就直接 return？
- `initialize` 为什么要 `await ctx.get('loader')?.await()`？bundle 行额外 `inject: [sdkAppStartup, loader]` 干什么？

## 职责边界

本包拥有 **runtime 进程里** 的一份 named 插件：`apply` 用 `JsonRpcLineTransport` 绑输入/输出流，构造 `HarnessSdkJsonRpcServer`，再 `transport.onRequest` 把三个 JSON-RPC 方法派进 server。[E: packages/sdk/server/src/index.ts:20] [E: packages/sdk/server/src/index.ts:59] [E: packages/sdk/server/src/index.ts:76] 插件名 `sdk-jsonrpc-server`，源码 `inject = ['agents']`——只硬等 `ctx.agents`；LLM 缝是 `initialize` 里 `ctx.get('llm')` 的可选读取，不进源码 `inject`。[E: packages/sdk/server/src/index.ts:22] [E: packages/sdk/server/src/server.ts:295] 包名 `@deepseek-ai/dsh-sdk-jsonrpc-server`，版本 `0.1.2-alpha.2`。[E: packages/sdk/server/package.json:2] [E: packages/sdk/server/package.json:4] named export，无 default：Loader `unwrapExports` 先取 `exports.default ?? exports`，写成 `export default { apply }` 会丢掉顶上的 `name` / `inject` / `Config`。[E: vendor/loader/src/index.ts:194] [E: packages/sdk/server/tests/plugin-shape.spec.ts:11] [E: packages/sdk/server/tests/plugin-shape.spec.ts:17]

它**不**拥有：

- wire 形状与 NDJSON 分帧 — [`subsys.integration.sdk-protocol`](sdk-protocol.md)（`subsys.integration.sdk-protocol`）。本页只消费 `InitializeParams` / `HarnessSdkRequestMap` / `JsonRpcLineTransport`。
- 进程外 TypeScript 客户端（自己 `child_process.spawn`）— [`subsys.integration.sdk-client`](sdk-client.md)（`subsys.integration.sdk-client`）与 [`surface.sdk.typescript`](../../surface/sdk/typescript.md)（`surface.sdk.typescript`）。
- Python `HarnessClient` — [`surface.sdk.python`](../../surface/sdk/python.md)（`surface.sdk.python`）。Python wheel 的闭包声明本包为依赖，但**没有**检入的默认 `cordis.yml`；运行时走同一套 `dsh --profile`。[E: python/sdk-runtime/package.json:48]
- 父进程里那条「拉起子 DSH runtime」的 Provider — [`subsys.orchestration.subagent-dsh-sdk`](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）。那边 `inject = ['subagents']` only，不经 `ctx.subprocess`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:31] 默认孩子 profile 是 `sdk`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:82] 父侧 patch 常把本包行 `disabled: true`，避免父进程也占 stdout；孩子进程用 shipped `sdk` / `sdk-minimal` 自己挂本包。[E: snapshots/sdk/subagent-dsh-sdk-dynamic-route/cordis.yml:12] [E: snapshots/sdk/subagent-dsh-sdk-dynamic-route/cordis.yml:14]
- `ctx.agents` Definition、`create` / `resume` / factory — [`subsys.core.agent`](../core/agent.md)（`subsys.core.agent`）。本包是 Consumer：未知 `sessionId` 调 `ctx.agents.create`，从不调 `resume`。[E: packages/sdk/server/src/server.ts:279]
- `dsh-base` 核树。`dsh-base` patch 从 `id: timer` 起 insert 共享核，没有 `sdk-jsonrpc-server` 行。[E: packages/bundle/base/cordis.patch.yml:16] `dependencies` 有 `@deepseek-ai/dsh-agent`，没有 `@deepseek-ai/dsh-sdk-jsonrpc-server`。[E: packages/bundle/base/package.json:44]

**真实挂载（shipped）。** `PROFILE_TEMPLATES` 里 `sdk` 叠 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-sdk-app`；`sdk-minimal` **只**叠 `@deepseek-ai/dsh-sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:150] [E: packages/boot/app-boot/src/profile.ts:154] [E: packages/boot/app-boot/src/profile.ts:155] `dsh-sdk-app` overlay insert：`sdk-app-startup` + `sdk-jsonrpc-server`，后者 **yml `inject: [sdkAppStartup, loader]`**（在源码 `['agents']` 之上再等启动服务与 Loader），`maxTokensAsSuccess` 环境变量未设则为 `true`。[E: packages/bundle/sdk-app/cordis.patch.yml:12] [E: packages/bundle/sdk-app/cordis.patch.yml:17] [E: packages/bundle/sdk-app/cordis.patch.yml:19] [E: packages/bundle/sdk-app/cordis.patch.yml:21] 包依赖声明本包。[E: packages/bundle/sdk-app/package.json:43] `sdk-minimal` 完整 insert 同样有 `id: sdk-jsonrpc-server`，但 `maxTokensAsSuccess: false`。[E: packages/bundle/sdk-minimal/cordis.patch.yml:11] [E: packages/bundle/sdk-minimal/cordis.patch.yml:15] [E: packages/bundle/sdk-minimal/package.json:50] `sdkAppStartup` 由 `@deepseek-ai/dsh-sdk-app` 在 parse 成功后 `provide`，help 路径不挂 transport。[E: packages/bundle/sdk-app/src/index.ts:20] [E: packages/bundle/sdk-app/src/index.ts:59]

**host 面 vs agent-preset 面。** 本插件一旦加载就占整棵 runtime 的 stdout，是 **host 单例**，不是 preset `isolate` remount。`createSession` 调 `ctx.agents.create` 时只带 `sessionId`、`meta.cwd` 与 route `agentOptions`，没有 `agentPreset` / `seed`，因此读的是 host 平面已经挂上的模型可见行。[E: packages/sdk/server/src/server.ts:279] [E: packages/sdk/server/src/server.ts:281] [E: packages/sdk/server/src/server.ts:282] 五个 shipped profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；`dsh web` 仍是 Web GUI 别名，SDK 面走 `dsh --profile sdk|sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:137]

**没有 waterfall。** 本包不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `agents`（以及 bundle 行上的 `sdkAppStartup` / `loader`）、named export 元数据丢失、或 `initialize` 找不到 adapter。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238] 事件订阅是可逆 `ctx.on`（构造时推进 `disposers`，`performShutdown` 逐个弹出执行）。[E: packages/sdk/server/src/server.ts:95] [E: packages/sdk/server/src/server.ts:219] 服务生命周期是 `ctx.effect(..., 'jsonrpc.serve')`。[E: packages/sdk/server/src/index.ts:101]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sdk/server/src/index.ts` | named export 插件：`name` / `inject` / `Config` / `apply`；stdio 接线、`initialize` 等 Loader、`shutdown`→exit |
| `packages/sdk/server/src/server.ts` | `HarnessSdkJsonRpcServer`：三方法 dispatch、握手门、懒创建 session、通知扇出、图片 admission |
| `packages/sdk/protocol/src/types.ts` | `HarnessSdkRequestMap`（恰好三个请求）与四条通知 payload |
| `packages/sdk/protocol/src/transport.ts` | `JsonRpcLineTransport`：NDJSON、`onRequest`、空字节 `flush` |
| `packages/sdk/server/package.json` | 包名 `@deepseek-ai/dsh-sdk-jsonrpc-server` |
| `packages/bundle/sdk-app/cordis.patch.yml` | shipped `sdk` overlay：`id: sdk-jsonrpc-server` |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | shipped `sdk-minimal` 完整树：同一 id |
| `packages/bundle/base/cordis.patch.yml` | shipped 核：没有本包行 |
| `packages/sdk/server/tests/plugin-shape.spec.ts` | `'default' in jsonrpc` 为 false；`unwrapExports` 保住 `name`/`inject` |
| `packages/sdk/server/tests/plugin-apply.spec.ts` | 真插件 + 内存 stdio：initialize、Loader 就绪、prompt 通知、shutdown 先应答再 exit、裸 dispose 不 exit |
| `packages/sdk/server/tests/server.spec.ts` | 懒创建、局外 dispose、adapter fallback、`local` 门、teardown 聚合 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / `inject` | `'sdk-jsonrpc-server'`；源码 `['agents']`。[E: packages/sdk/server/src/index.ts:20] [E: packages/sdk/server/src/index.ts:22] bundle yml 再叠 `sdkAppStartup`、`loader`。[E: packages/bundle/sdk-app/cordis.patch.yml:19] |
| `Config` / `JsonRpcConfig` | Schema 只声明 `maxTokensAsSuccess`，默认 `false`。[E: packages/sdk/server/src/index.ts:37] `input` / `output` / `exit` 只在 TypeScript 接口上，给测试注入；生产是 `process.stdin` / `process.stdout` / `process.exit`。[E: packages/sdk/server/src/index.ts:53] [E: packages/sdk/server/src/index.ts:55] [E: packages/sdk/server/src/index.ts:57] |
| `HarnessSdkJsonRpcServer` | 一座 server 绑一棵 `Context` + 一个 `JsonRpcTransportPeer`。构造时挂四条 `ctx.on`。[E: packages/sdk/server/src/server.ts:89] [E: packages/sdk/server/src/server.ts:95] |
| `HarnessSdkJsonRpcServerOptions` | 目前只有 `maxTokensAsSuccess?: boolean`。[E: packages/sdk/server/src/server.ts:60] |
| `SessionRecord` | `{ handle: AgentHandle }`。进程内 `Map<string, SessionRecord>`；创建中的 id 另走 `sessionCreations` 去重。[E: packages/sdk/server/src/server.ts:31] [E: packages/sdk/server/src/server.ts:82] |
| `InitializeParams` | `cwd` / `provider` / `model` 必填；`reasoningEffort` 可选非空字符串；`maxTokens` 可选正 safe integer。[E: packages/sdk/protocol/src/types.ts:16] [E: packages/sdk/server/src/server.ts:141] |
| `InitializeResult.serverInfo` | `name` 钉死 `deepseek-harness-sdk-runtime`；`version` 钉死 `'0.0.1'`（不是 `package.json` 的 `0.1.2-alpha.2`）。[E: packages/sdk/server/src/server.ts:168] [E: packages/sdk/server/tests/plugin-apply.spec.ts:183] |
| `SessionPromptResult` | `{ messageId }`。只证明 user message 已 `followup`，**不**等待 turn idle。[E: packages/sdk/server/src/server.ts:191] [E: packages/sdk/server/src/server.ts:192] |
| `HarnessSdkRequestMap` | 客户端→服务器恰好三个：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/protocol/src/types.ts:116] [E: packages/sdk/protocol/src/types.ts:117] [E: packages/sdk/protocol/src/types.ts:118] |
| `successStatus` | `completed` → `ok`；`max-tokens` 仅当 `maxTokensAsSuccess === true` 才 `ok`；其余 `error`。[E: packages/sdk/server/src/server.ts:66] [E: packages/sdk/server/src/server.ts:67] |

`dsh-sdk-app` 把 `maxTokensAsSuccess` 写成「环境变量未设则 `true`」。[E: packages/bundle/sdk-app/cordis.patch.yml:21] `sdk-minimal` 写死 `false`，与插件 Schema 默认一致。[E: packages/bundle/sdk-minimal/cordis.patch.yml:15]

## 控制流

1. Loader 用 named export 加载本包。`unwrapExports` 取 `exports.default ?? exports`；若写成 `export default { apply }`，`name` / `inject` / `Config` 会丢，`agents` 等不到。[E: vendor/loader/src/index.ts:194] 测试钉死 `'default' in jsonrpc` 为 false，且 `inject` 等于 `['agents']`。[E: packages/sdk/server/tests/plugin-shape.spec.ts:11] [E: packages/sdk/server/tests/plugin-shape.spec.ts:18]

2. `apply@packages/sdk/server/src/index.ts` 记下 `ctx.root.fiber`，解析 `input`/`output`/`exit`（缺省即进程 stdio 与 `process.exit`），`new JsonRpcLineTransport` + `new HarnessSdkJsonRpcServer`。[E: packages/sdk/server/src/index.ts:51] [E: packages/sdk/server/src/index.ts:59] [E: packages/sdk/server/src/index.ts:60] 生产输出默认 `process.stdout`：协议帧独占这根流，同树再挂 stdout logger 会把日志行和 NDJSON 搅在一起。[E: packages/sdk/server/src/index.ts:55]

3. `transport.onRequest`：若 `method === 'initialize'`，先 `await ctx.get('loader')?.await()`，等当前 Loader 树（含异步 sibling 条目）settle，再 `await server.handleRequest`。[E: packages/sdk/server/src/index.ts:84] [E: packages/sdk/server/src/index.ts:85] [E: packages/sdk/server/src/index.ts:87] 无 Loader 的手建 context 立即可用。result 交回 transport 写成带 `id` 的响应帧。[E: packages/sdk/protocol/src/transport.ts:234] 未知方法在 server 里 `throw`，transport 捕获后回 `-32603`（不是「没装 handler」的 `-32601`），文案 `unknown DeepSeek Harness SDK runtime method: …`。[E: packages/sdk/server/src/server.ts:255] [E: packages/sdk/server/tests/plugin-apply.spec.ts:363]

4. `handleRequest@packages/sdk/server/src/server.ts` 的 `switch` 只有三支：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/server/src/server.ts:248] [E: packages/sdk/server/src/server.ts:250] [E: packages/sdk/server/src/server.ts:252] 没有 ACP 那套 `authenticate` / `newSession` / `cancel`，也没有 `loadSession`。

5. `initialize@packages/sdk/server/src/server.ts`：校验 `reasoningEffort` 与 `maxTokens`，`resolve(params.cwd)` 收成绝对路径，记下 `provider`/`model`/`reasoningEffort`。[E: packages/sdk/server/src/server.ts:144] 若 `hasAdapterFor(provider)` 为假：非 `deepseek-official` 直接抛 `no adapter registered for provider "…"`；`deepseek-official` 则 `ctx.plugin(LlmDeepSeek, {})` 挂一份 fallback，句柄留在 `llmFiber`。[E: packages/sdk/server/src/server.ts:151] [E: packages/sdk/server/src/server.ts:152] 随后 `llm.resolveCallConfig` 校验 route。[E: packages/sdk/server/src/server.ts:156] 已有 owner 时不重复注册。[E: packages/sdk/server/tests/server.spec.ts:888] 返回的 `serverInfo.name` 恒为 `deepseek-harness-sdk-runtime`。[E: packages/sdk/server/src/server.ts:168] 置 `initialized = true`。[E: packages/sdk/server/src/server.ts:167] 类注释写 reinitialization unsupported；实现仍会覆盖这几个字段，已在 `sessions` 里的 `SessionRecord` 不会重建。

6. `prompt@packages/sdk/server/src/server.ts` **必须先握手**：`!this.initialized` 抛 `SDK server is not initialized`。[E: packages/sdk/server/src/server.ts:177] 再 `getOrCreateSession`。`shuttingDown` 则抛 `SDK server is shutting down`。[E: packages/sdk/server/src/server.ts:260] Map 命中直接复用；创建中的同一 `sessionId` 共用一条 Promise；无论成败都从 `sessionCreations` 删掉以便失败后重试。[E: packages/sdk/server/src/server.ts:261] [E: packages/sdk/server/src/server.ts:264] [E: packages/sdk/server/src/server.ts:268] 未命中则 `createSession`：`ctx.agents.create({ sessionId, meta: { cwd }, agentOptions: { provider, model, reasoningEffort?, maxTokens? } })`。[E: packages/sdk/server/src/server.ts:279] [E: packages/sdk/server/src/server.ts:280] 客户端给的字符串就是 session id。`SessionPromptParams.sessionId` 只是这条字符串。[E: packages/sdk/protocol/src/types.ts:38]

7. 投递前 `assertLiveAgent`：`ctx.agents.get(rec.handle.agent.id) === rec.handle.agent`。不相等说明 agent-loop-only reload 之类把 registry 里的活体换掉了，server 的 `SessionRecord` 还指着旧句柄——此时抛 `session agent was disposed outside the server: …`，**不**再 `followup`。[E: packages/sdk/server/src/server.ts:196] [E: packages/sdk/server/tests/server.spec.ts:317] 含 image 块时先 `admitEncodedImages`（无 `ctx.attachments` 则抛 `SDK image prompt requires an attachment store`），跨异步边界后再 assert 一次。[E: packages/sdk/server/src/server.ts:43] [E: packages/sdk/server/src/server.ts:186] 活着则 `createUserMessage({ content, source: { kind: 'user' } })` + `agent.followup(message)`，立刻返回 `{ messageId }`。[E: packages/sdk/server/src/server.ts:187] [E: packages/sdk/server/src/server.ts:191] 同一 session 的重叠 prompt 连续 `followup`，不互相阻塞；不同 session 的 `create` 彼此独立。[E: packages/sdk/server/tests/server.spec.ts:186]

8. 构造期四条 `ctx.on` 把进程内事件打成服务器→客户端通知（无 `id` 的帧）：`session/event` → `session.event`（**所有** session，不限本 Map）；`agent/status` → `session.status`（`idle` / `running`，不解释 turn 成败）；`session/created` 且 `header.parentSession` 有值 → `subagent.started`；`subagent/end` 且 `info.local` → `subagent.finished`。[E: packages/sdk/server/src/server.ts:95] [E: packages/sdk/server/src/server.ts:99] [E: packages/sdk/server/src/server.ts:104] [E: packages/sdk/server/src/server.ts:116] `!info.local` 直接 return：id 撞车或仅凭 parent 血统都不能把远程 run 报成本 runtime 的 child。[E: packages/sdk/server/tests/server.spec.ts:502] `lastAssistantMessage` 仅在有值时展开，不发空数组。[E: packages/sdk/server/src/server.ts:124]

9. `shutdown` **先**跑完 `performShutdown`（置 `shuttingDown`、等完 in-flight create、卸 `disposers`、`handle.dispose()` 每个 SDK session、卸 `llmFiber`），把 `{}` 交给 transport 写成响应。[E: packages/sdk/server/src/server.ts:207] [E: packages/sdk/server/src/server.ts:212] 多个 teardown 失败聚成 `AggregateError('SDK server teardown failed')`。[E: packages/sdk/server/src/server.ts:235] [E: packages/sdk/server/tests/server.spec.ts:1173] `apply` 看见 `method === 'shutdown'` 后 `setImmediate(disposeAndExit)`：先 `transport.flush()`（往 output 写空字节等回调），再 `rootFiber.dispose()`，最后 `exit(0)`。[E: packages/sdk/server/src/index.ts:88] [E: packages/sdk/server/src/index.ts:69] [E: packages/sdk/server/src/index.ts:70] [E: packages/sdk/server/src/index.ts:71] [E: packages/sdk/protocol/src/transport.ts:166] `exitTask` 与 `shutdownTask` 都只建一次，并发第二条 `shutdown` 也只 exit 一次。[E: packages/sdk/server/tests/plugin-apply.spec.ts:289] 观测顺序：两条响应帧 → 各自 write-complete → 空 flush → `root-disposed` → `exit(0)`。[E: packages/sdk/server/tests/plugin-apply.spec.ts:315] flush 回调失败仍 dispose + exit 一次。[E: packages/sdk/server/tests/plugin-apply.spec.ts:332]

10. `ctx.effect` 的拆除路径只做 `server.shutdown()` + `transport.close()`，**不**调用 `exit`。[E: packages/sdk/server/src/index.ts:98] [E: packages/sdk/server/src/index.ts:99] 测试里卸掉插件 fiber 后，后续 initialize 不再出帧，且 `exits()` 仍为空——HMR 式 unload 停服但不杀进程。[E: packages/sdk/server/tests/plugin-apply.spec.ts:354] [E: packages/sdk/server/tests/plugin-apply.spec.ts:373] EOF / 信号退出归 app bin（`exitOnStdinEnd`），不归本插件。[E: packages/bundle/sdk-app/src/index.ts:58]

## 设计动机

stdout 专给 NDJSON，是因为客户端按行切帧。任何 console logger / TUI 写同一根流都会破坏 JSON-RPC。所以本包装在 `sdk` / `sdk-minimal` 组合里，而不是塞进 `dsh web`（Web GUI 另有自己的 host HTTP / 浏览器面）。

`shutdown` 必须先写出结果再 `flush` 再拆 root：客户端把 `shutdown` 当普通请求等 result；若先 `process.exit`，管道会在响应落盘前断掉。`setImmediate` 把「杀进程」推到当前请求的 write 之后。`exitTask` 合并并发 shutdown，避免双重 dispose / 双重 exit。

`inject` 源码只有 `agents`：serving 插件不能把 DeepSeek adapter 变成硬依赖。`sdk` / `sdk-minimal` 自己在 patch 里预挂 `llm-deepseek`；`initialize` 的 fallback 只覆盖「组合漏了 official adapter」这一种。别的 provider 缺席必须 fail-loud。bundle 再叠 `sdkAppStartup`，避免 `-h` 也占 stdio。

`initialize` 等 Loader：MCP 等 sibling 可能还在异步发现工具；握手是对外就绪边界。

懒创建让客户端自选 `sessionId`（Python / TS SDK、以及 `dsh-subagent-dsh-sdk` 孩子都靠这个）。server 不 `resume`：身份由这次 `create` 钉死。局外 dispose 检测是为了 agent-loop HMR——静默 `followup` 一具已摘册的 agent 会丢 turn。`prompt` 现在强制握手，避免未配置 route 就用字段初值悄悄建 session。

`subagent.finished` 只报 `info.local`：远程 / 进程外孩子有自己的 runtime 与自己的 JSON-RPC 面，本进程不能把它们的 stopReason 冒充成本地 child session。

named export only：与 ACP / subagent-acp 同一条 Loader 陷阱。测试用真 `Loader.prototype.unwrapExports` 钉 identity。

## Gotcha

- **不是 `dsh web` 的一部分。** 默认 Web GUI 不挂本包。对外讲 SDK 协议用 `dsh --profile sdk` 或 `dsh --profile sdk-minimal`（或自备 overlay 含 `id: sdk-jsonrpc-server`）。五个 shipped profile 里只有这两条叠本包。
- **default export 会丢掉 `inject`。** `unwrapExports` 先取 `.default`。[E: vendor/loader/src/index.ts:194] 必须 `export const name` / `export const inject` / `export const Config` / `export function apply`。
- **`serverInfo.version` 不是包版本。** wire 上是 `'0.0.1'`；`packages/sdk/server/package.json` 的 `version` 是 `0.1.2-alpha.2`。[E: packages/sdk/server/src/server.ts:168] [E: packages/sdk/server/package.json:4]
- **`maxTokensAsSuccess` 的两个 shipped 默认。** 插件 Schema 默认 `false`。[E: packages/sdk/server/src/index.ts:37] `dsh-sdk-app` 未设 `DSH_MAX_TOKENS_AS_SUCCESS` 时写成 `true`。[E: packages/bundle/sdk-app/cordis.patch.yml:21] `sdk-minimal` 写死 `false`。
- **协议 `shutdown` 杀进程；fiber dispose 不杀。** 不要把 HMR unload 和客户端 `shutdown` 当成同一条路径。
- **没有 cancel / session-close / `loadSession`。** 放弃一轮的方式是关子进程（客户端 dispose 阶梯），不是再发一个 JSON-RPC 方法。
- **未知方法是 `-32603`。** handler 已安装，失败算「handler threw」，不是 `-32601 method not found`。
- **`prompt` 的 result 不是 turn 结束。** 要看整轮结束得听后续 `session.status` / `session.event`。
- **`prompt` 必须先 `initialize`。** 未握手抛 `SDK server is not initialized`，不再用 `process.cwd()` / `'deepseek-official'` 静默建 session。[E: packages/sdk/server/src/server.ts:177] 字段初值仍是 `process.cwd()` / `'deepseek-official'` / `'deepseek-official'`，只服务握手之后的 `createSession`。[E: packages/sdk/server/src/server.ts:76] [E: packages/sdk/server/src/server.ts:77]
- **孩子 runtime 不是父 Provider。** 父侧是 `dsh-subagent-dsh-sdk`；孩子用 profile `sdk`（或配置的 profile）自己挂本插件。父 patch 常 `disabled: true` 本包行，以免抢 stdout。
- **Python runtime 没有独立 `cordis.yml`。** 闭包里带本包，执行路径是 `dsh` 的 shipped profile。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition（wire）** | `@deepseek-ai/dsh-sdk-protocol` 的 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` / `JsonRpcLineTransport` | 无 `ctx.*` 键。三个请求、四条通知。细节见 [`subsys.integration.sdk-protocol`](sdk-protocol.md) |
| **Definition（agent）** | `@deepseek-ai/dsh-agent` 的 `AgentRegistry` | `ctx.agents`。**host**：`dsh-base` `id: agent`。本包不占这个键 |
| **Provider（本页）** | `@deepseek-ai/dsh-sdk-jsonrpc-server` 的 `apply` + `HarnessSdkJsonRpcServer` | 插件名 `sdk-jsonrpc-server`，源码 `inject = ['agents']`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-acp-app` / shipped preset。真实行：`packages/bundle/sdk-app/cordis.patch.yml` 与 `packages/bundle/sdk-minimal/cordis.patch.yml` 的 `id: sdk-jsonrpc-server` |
| **Consumer（进程外客户端）** | `@deepseek-ai/dsh-sdk-client` 的 `HarnessClient`；Python `HarnessClient` | 父进程 spawn 本 runtime，stdio 讲同一份 protocol。见 [`subsys.integration.sdk-client`](sdk-client.md) / [`surface.sdk.typescript`](../../surface/sdk/typescript.md) |
| **Consumer（子 runtime 组合）** | `dsh-subagent-dsh-sdk` 拉起的孩子 profile | 父插件 `inject = ['subagents']` only。孩子必须自己挂本包（默认 profile `sdk`），否则 spawn 出的进程没有 JSON-RPC 面。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:82] |

换 SDK runtime 组合 = 改 `--profile` / overlay 并保留 `id: sdk-jsonrpc-server`，不是改 `dsh-base`。本包不 `provide` 新的 `ctx.*` 服务键。`sdk-app-startup` 才 `provide('sdkAppStartup')`。[E: packages/bundle/sdk-app/src/index.ts:59]

## Sources

- packages/sdk/server/src/index.ts
- packages/sdk/server/src/server.ts
- packages/sdk/server/package.json
- packages/sdk/server/tests/plugin-apply.spec.ts
- packages/sdk/server/tests/server.spec.ts
- packages/sdk/server/tests/plugin-shape.spec.ts
- packages/sdk/protocol/src/types.ts
- packages/sdk/protocol/src/transport.ts
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-app/package.json
- packages/bundle/sdk-app/src/index.ts
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/sdk-minimal/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/boot/app-boot/src/profile.ts
- packages/subagent/subagent-dsh-sdk/src/index.ts
- python/sdk-runtime/package.json
- snapshots/sdk/subagent-dsh-sdk-dynamic-route/cordis.yml
- vendor/loader/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面；默认 GUI 是 `dsh web`，SDK 是 `dsh --profile sdk|sdk-minimal`。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角。
- [subsys.integration.sdk-protocol](sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三个请求、四条通知、`JsonRpcLineTransport`。
- [subsys.integration.sdk-client](sdk-client.md)（`subsys.integration.sdk-client`）：进程外 TS `HarnessClient` 与 dispose 阶梯。
- [subsys.orchestration.subagent-dsh-sdk](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）：父进程 Provider；孩子组合挂本包。
- [surface.sdk.typescript](../../surface/sdk/typescript.md)（`surface.sdk.typescript`）：TS SDK 可见面。
- [surface.sdk.python](../../surface/sdk/python.md)（`surface.sdk.python`）：Python 客户端；wheel 闭包含本包，执行走 `dsh` profile。
- [subsys.core.agent](../core/agent.md)（`subsys.core.agent`）：`ctx.agents.create` / `get` / `resume`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：shipped 核树；没有本包。
