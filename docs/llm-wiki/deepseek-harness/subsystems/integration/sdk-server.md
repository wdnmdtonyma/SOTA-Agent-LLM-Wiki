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
  - examples/jsonrpc-agent/cordis.yml
  - examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml
  - examples/package.json
  - python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml
  - python/sdk-runtime/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/subagent/subagent-dsh-sdk/src/index.ts
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
updated: 47f943859b
---

> `@deepseek-ai/dsh-sdk-jsonrpc-server` 是 **example / SDK-runtime-only** 的 stdio JSON-RPC 服务插件：插件名 `sdk-jsonrpc-server`，`inject = ['agents']`。它把已经 boot 好的 Cordis 树接到 `dsh-sdk-protocol` 的 NDJSON 帧上，**不进** `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset，也不是 `dsh web` 的默认面。

## 能回答的问题

- 本包在不在 shipped bundle / `dsh web` 里？仓库里哪份 yml 才真正挂 `id: sdk-jsonrpc-server`？
- `apply` 怎么占用 `process.stdin` / `process.stdout`？为什么树里不能再挂 stdout logger？
- `session/prompt` 遇到未知 `sessionId` 如何懒创建？走的是 `agents.create` 还是 `resume`？
- `shutdown` 的应答、`flush`、`rootFiber.dispose()`、`process.exit(0)` 谁先谁后？裸 fiber dispose（HMR 卸插件）会不会 exit？
- 为什么必须 named export、禁止 `export default`？Loader `unwrapExports` 会丢掉什么？
- `subagent.finished` 为什么看见 `info.local === false` 就直接 return？

## 职责边界

本包拥有 **runtime 进程里** 的一份 named 插件：`apply` 用 `JsonRpcLineTransport` 绑输入/输出流，构造 `HarnessSdkJsonRpcServer`，再 `transport.onRequest` 把三个 JSON-RPC 方法派进 server。[E: packages/sdk/server/src/index.ts:20] [E: packages/sdk/server/src/index.ts:59] [E: packages/sdk/server/src/index.ts:76] 插件名 `sdk-jsonrpc-server`，`inject = ['agents']`——只等 `ctx.agents`；LLM 缝是 `initialize` 里 `ctx.get('llm')` 的可选读取，不进 `inject`。[E: packages/sdk/server/src/index.ts:22] [E: packages/sdk/server/src/server.ts:238] 包名 `@deepseek-ai/dsh-sdk-jsonrpc-server`。[E: packages/sdk/server/package.json:2] named export，无 default：Loader `unwrapExports` 先取 `exports.default ?? exports`，写成 `export default { apply }` 会丢掉顶上的 `name` / `inject` / `Config`。[E: vendor/loader/src/index.ts:194] [E: packages/sdk/server/tests/plugin-shape.spec.ts:11] [E: packages/sdk/server/tests/plugin-shape.spec.ts:17]

它**不**拥有：

- wire 形状与 NDJSON 分帧 — [`subsys.integration.sdk-protocol`](sdk-protocol.md)（`subsys.integration.sdk-protocol`）。本页只消费 `InitializeParams` / `HarnessSdkRequestMap` / `JsonRpcLineTransport`。
- 进程外 TypeScript 客户端（自己 `child_process.spawn`）— [`subsys.integration.sdk-client`](sdk-client.md)（`subsys.integration.sdk-client`）与 [`surface.sdk.typescript`](../../surface/sdk/typescript.md)（`surface.sdk.typescript`）。
- Python `HarnessClient` — [`surface.sdk.python`](../../surface/sdk/python.md)（`surface.sdk.python`）。
- 父进程里那条「拉起子 DSH runtime」的 Provider — [`subsys.orchestration.subagent-dsh-sdk`](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）。那边 `inject = ['subagents']` only，不经 `ctx.subprocess`。[E: packages/subagent/subagent-dsh-sdk/src/index.ts:26] 孩子进程自己的 `cordis.yml` 才挂本包。[E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml:5] [E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml:6]
- `ctx.agents` Definition、`create` / `resume` / factory — [`subsys.core.agent`](../core/agent.md)（`subsys.core.agent`）。本包是 Consumer：未知 `sessionId` 调 `ctx.agents.create`，从不调 `resume`。[E: packages/sdk/server/src/server.ts:223]
- shipped host 树。`dsh-base` patch 从 `id: timer` 起 insert 共享核，没有 `sdk-jsonrpc-server` 行。[E: packages/bundle/base/cordis.patch.yml:16] `dependencies` 有 `@deepseek-ai/dsh-agent` 与三家 in-process subagent，没有 `@deepseek-ai/dsh-sdk-jsonrpc-server`。[E: packages/bundle/base/package.json:44] [E: packages/bundle/base/package.json:87] [E: packages/bundle/base/package.json:88] [E: packages/bundle/base/package.json:89] 对 `packages/bundle` 与 `apps/cli` 全文检索 `sdk-jsonrpc` / `dsh-sdk-jsonrpc-server` 为零命中。[I] 真实挂载：`examples/jsonrpc-agent/cordis.yml` 与 Python runtime 的 `cordis.yml`。[E: examples/jsonrpc-agent/cordis.yml:4] [E: examples/jsonrpc-agent/cordis.yml:5] [E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:6] [E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:7] workspace 声明分别在 `examples/package.json` 与 `python/sdk-runtime/package.json`。[E: examples/package.json:41] [E: python/sdk-runtime/package.json:43]

**host 面 vs agent-preset 面。** 本插件一旦加载就占整棵 runtime 的 stdout，是 **host 单例**，不是 preset `isolate` remount。`createSession` 调 `ctx.agents.create` 时只带 `sessionId`、`meta.cwd` 与 route `agentOptions`，没有 `agentPreset` / `seed`，因此读的是 host 平面已经挂上的模型可见行。[E: packages/sdk/server/src/server.ts:223] [E: packages/sdk/server/src/server.ts:225] [E: packages/sdk/server/src/server.ts:226] 默认产品路径仍是 `dsh web` 本地 Web GUI；本仓没有 shipped TUI。本包不进那条树。`examples/jsonrpc-agent/cordis.yml` 是一条独立的 unattended 组合，不是 `dsh --profile web` 的 overlay。

**没有 waterfall。** 本包不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `agents`、named export 元数据丢失、或 `initialize` 找不到 adapter。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238] 事件订阅是可逆 `ctx.on`（构造时推进 `disposers`，`performShutdown` 逐个弹出执行）。[E: packages/sdk/server/src/server.ts:71] [E: packages/sdk/server/src/server.ts:163] 服务生命周期是 `ctx.effect(..., 'jsonrpc.serve')`。[E: packages/sdk/server/src/index.ts:85]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sdk/server/src/index.ts` | named export 插件：`name` / `inject` / `Config` / `apply`；stdio 接线与 `shutdown`→exit |
| `packages/sdk/server/src/server.ts` | `HarnessSdkJsonRpcServer`：三方法 dispatch、懒创建 session、通知扇出 |
| `packages/sdk/protocol/src/types.ts` | `HarnessSdkRequestMap`（恰好三个请求）与四条通知 payload |
| `packages/sdk/protocol/src/transport.ts` | `JsonRpcLineTransport`：NDJSON、`onRequest`、空字节 `flush` |
| `packages/sdk/server/package.json` | 包名 `@deepseek-ai/dsh-sdk-jsonrpc-server` |
| `examples/jsonrpc-agent/cordis.yml` | 真实挂载：`id: sdk-jsonrpc-server`；`maxTokensAsSuccess` 默认 true |
| `python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml` | 另一份真实挂载：有本包行、无 `maxTokensAsSuccess`（吃 Schema 默认 false） |
| `packages/bundle/base/cordis.patch.yml` | shipped 核：没有本包行 |
| `packages/sdk/server/tests/plugin-shape.spec.ts` | `'default' in jsonrpc` 为 false；`unwrapExports` 保住 `name`/`inject` |
| `packages/sdk/server/tests/plugin-apply.spec.ts` | 真插件 + 内存 stdio：initialize、prompt 通知、shutdown 先应答再 exit、裸 dispose 不 exit |
| `packages/sdk/server/tests/server.spec.ts` | 懒创建、局外 dispose、adapter fallback、`local` 门、teardown 聚合 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / `inject` | `'sdk-jsonrpc-server'`；`['agents']`。[E: packages/sdk/server/src/index.ts:20] [E: packages/sdk/server/src/index.ts:22] |
| `Config` / `JsonRpcConfig` | Schema 只声明 `maxTokensAsSuccess`，默认 `false`。[E: packages/sdk/server/src/index.ts:37] `input` / `output` / `exit` 只在 TypeScript 接口上，给测试注入；生产是 `process.stdin` / `process.stdout` / `process.exit`。[E: packages/sdk/server/src/index.ts:53] [E: packages/sdk/server/src/index.ts:55] [E: packages/sdk/server/src/index.ts:57] |
| `HarnessSdkJsonRpcServer` | 一座 server 绑一棵 `Context` + 一个 `JsonRpcTransportPeer`。构造时挂四条 `ctx.on`。[E: packages/sdk/server/src/server.ts:53] [E: packages/sdk/server/src/server.ts:71] |
| `HarnessSdkJsonRpcServerOptions` | 目前只有 `maxTokensAsSuccess?: boolean`。 |
| `SessionRecord` | `{ handle: AgentHandle }`。进程内 `Map<string, SessionRecord>`；创建中的 id 另走 `sessionCreations` 去重。 |
| `InitializeParams` | `cwd` / `provider` / `model` 必填；`maxTokens` 可选，必须是正 safe integer。[E: packages/sdk/server/src/server.ts:112] |
| `InitializeResult.serverInfo` | `name` 钉死 `deepseek-harness-sdk-runtime`；`version` 钉死 `'0.0.1'`（不是 `package.json` 的 `0.1.0-rc.5`）。[E: packages/sdk/server/src/server.ts:124] [E: packages/sdk/server/tests/plugin-apply.spec.ts:164] |
| `SessionPromptResult` | `{ messageId }`。只证明 user message 已 `followup`，**不**等待 turn idle。[E: packages/sdk/server/src/server.ts:141] [E: packages/sdk/server/src/server.ts:142] |
| `HarnessSdkRequestMap` | 客户端→服务器恰好三个：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/protocol/src/types.ts:102] [E: packages/sdk/protocol/src/types.ts:103] [E: packages/sdk/protocol/src/types.ts:104] |
| `successStatus` | `completed` → `ok`；`max-tokens` 仅当 `maxTokensAsSuccess === true` 才 `ok`；其余 `error`。[E: packages/sdk/server/src/server.ts:44] [E: packages/sdk/server/src/server.ts:45] |

`examples/jsonrpc-agent/cordis.yml` 把 `maxTokensAsSuccess` 写成「环境变量未设则 `true`」。[E: examples/jsonrpc-agent/cordis.yml:7] Python runtime 那份 yml 不写该键，因此吃插件 Schema 默认 `false`。

## 控制流

1. Loader 用 named export 加载本包。`unwrapExports` 取 `exports.default ?? exports`；若写成 `export default { apply }`，`name` / `inject` / `Config` 会丢，`agents` 等不到。[E: vendor/loader/src/index.ts:194] 测试钉死 `'default' in jsonrpc` 为 false，且 `inject` 等于 `['agents']`。[E: packages/sdk/server/tests/plugin-shape.spec.ts:11] [E: packages/sdk/server/tests/plugin-shape.spec.ts:18]

2. `apply@packages/sdk/server/src/index.ts` 记下 `ctx.root.fiber`，解析 `input`/`output`/`exit`（缺省即进程 stdio 与 `process.exit`），`new JsonRpcLineTransport` + `new HarnessSdkJsonRpcServer`。[E: packages/sdk/server/src/index.ts:51] [E: packages/sdk/server/src/index.ts:59] [E: packages/sdk/server/src/index.ts:60] 生产输出默认 `process.stdout`：协议帧独占这根流，同树再挂 stdout logger 会把日志行和 NDJSON 搅在一起。[E: packages/sdk/server/src/index.ts:55]

3. `transport.onRequest` 一律 `await server.handleRequest(method, params)`，再把 result 交回 transport 写成带 `id` 的响应帧。[E: packages/sdk/server/src/index.ts:77] [E: packages/sdk/protocol/src/transport.ts:234] 未知方法在 server 里 `throw`，transport 捕获后回 `-32603`（不是「没装 handler」的 `-32601`），文案 `unknown DeepSeek Harness SDK runtime method: …`。[E: packages/sdk/server/src/server.ts:199] [E: packages/sdk/server/tests/plugin-apply.spec.ts:288]

4. `handleRequest@packages/sdk/server/src/server.ts` 的 `switch` 只有三支：`initialize` / `session/prompt` / `shutdown`。[E: packages/sdk/server/src/server.ts:192] [E: packages/sdk/server/src/server.ts:194] [E: packages/sdk/server/src/server.ts:196] 没有 ACP 那套 `authenticate` / `newSession` / `cancel`，也没有 `loadSession`。

5. `initialize@packages/sdk/server/src/server.ts`：校验 `maxTokens`，`resolve(params.cwd)` 收成绝对路径，记下 `provider`/`model`。[E: packages/sdk/server/src/server.ts:116] 若 `ctx.get('llm')` 还没有该 `provider`：非 `deepseek-official` 直接抛 `no adapter registered for provider "…"`；`deepseek-official` 则 `ctx.plugin(LlmDeepSeek, {})` 挂一份 fallback，句柄留在 `llmFiber`。[E: packages/sdk/server/src/server.ts:121] [E: packages/sdk/server/src/server.ts:122] 已有 owner 时不重复注册。[E: packages/sdk/server/tests/server.spec.ts:791] 返回的 `serverInfo.name` 恒为 `deepseek-harness-sdk-runtime`。[E: packages/sdk/server/src/server.ts:124] 没有「只能 initialize 一次」的运行时守卫：再调会覆盖这四个字段，已在 `sessions` 里的 `SessionRecord` 不会重建。

6. `prompt@packages/sdk/server/src/server.ts` 先 `getOrCreateSession`。[E: packages/sdk/server/src/server.ts:133] `shuttingDown` 则抛 `SDK server is shutting down`。[E: packages/sdk/server/src/server.ts:204] Map 命中直接复用；创建中的同一 `sessionId` 共用一条 Promise；无论成败都从 `sessionCreations` 删掉以便失败后重试。[E: packages/sdk/server/src/server.ts:205] [E: packages/sdk/server/src/server.ts:206] [E: packages/sdk/server/src/server.ts:208] [E: packages/sdk/server/src/server.ts:209] [E: packages/sdk/server/src/server.ts:213] 未命中则 `createSession`：`ctx.agents.create({ sessionId: SessionId(sessionId), meta: { cwd }, agentOptions: { provider, model, maxTokens? } })`。[E: packages/sdk/server/src/server.ts:223] [E: packages/sdk/server/src/server.ts:224] 客户端给的字符串就是 session id（对比 ACP 子服务器在子进程里 `randomUUID()`）。`SessionPromptParams.sessionId` 只是这条字符串。[E: packages/sdk/protocol/src/types.ts:36]

7. 投递前核对 `ctx.agents.get(rec.handle.agent.id) === rec.handle.agent`。不相等说明 agent-loop-only reload 之类把 registry 里的活体换掉了，server 的 `SessionRecord` 还指着旧句柄——此时抛 `session agent was disposed outside the server: …`，**不**再 `followup`。[E: packages/sdk/server/src/server.ts:137] [E: packages/sdk/server/tests/server.spec.ts:239] 活着则 `createUserMessage({ content: params.contentBlocks, source: { kind: 'user' } })` + `agent.followup(message)`，立刻返回 `{ messageId }`。[E: packages/sdk/server/src/server.ts:140] [E: packages/sdk/server/src/server.ts:141] 同一 session 的重叠 prompt 连续 `followup`，不互相阻塞；不同 session 的 `create` 彼此独立。[E: packages/sdk/server/tests/server.spec.ts:205]

8. 构造期四条 `ctx.on` 把进程内事件打成服务器→客户端通知（无 `id` 的帧）：`session/event` → `session.event`（**所有** session，不限本 Map）；`agent/status` → `session.status`（`idle` / `running`，不解释 turn 成败）；`session/created` 且 `header.parentSession` 有值 → `subagent.started`；`subagent/end` 且 `info.local` → `subagent.finished`。[E: packages/sdk/server/src/server.ts:73] [E: packages/sdk/server/src/server.ts:76] [E: packages/sdk/server/src/server.ts:80] [E: packages/sdk/server/src/server.ts:85] [E: packages/sdk/server/src/server.ts:92] `local === false` 直接 return：id 撞车或仅凭 parent 血统都不能把远程 run 报成本 runtime 的 child。[E: packages/sdk/server/tests/server.spec.ts:420] `lastAssistantMessage` 仅在有值时展开，不发空数组。[E: packages/sdk/server/src/server.ts:100]

9. `shutdown` **先**跑完 `performShutdown`（置 `shuttingDown`、等完 in-flight create、卸 `disposers`、`handle.dispose()` 每个 SDK session、卸 `llmFiber`），把 `{}` 交给 transport 写成响应。[E: packages/sdk/server/src/server.ts:151] [E: packages/sdk/server/src/server.ts:156] 多个 teardown 失败聚成 `AggregateError('SDK server teardown failed')`。[E: packages/sdk/server/tests/server.spec.ts:946] `apply` 看见 `method === 'shutdown'` 后 `setImmediate(disposeAndExit)`：先 `transport.flush()`（往 output 写空字节等回调），再 `rootFiber.dispose()`，最后 `exit(0)`。[E: packages/sdk/server/src/index.ts:78] [E: packages/sdk/server/src/index.ts:69] [E: packages/sdk/server/src/index.ts:70] [E: packages/sdk/server/src/index.ts:71] `exitTask` 与 `shutdownTask` 都只建一次，并发第二条 `shutdown` 也只 exit 一次。[E: packages/sdk/server/tests/plugin-apply.spec.ts:225] 观测顺序：两条响应帧 → 各自 write-complete → 空 flush → `root-disposed` → `exit(0)`。[E: packages/sdk/server/tests/plugin-apply.spec.ts:242] flush 回调失败仍 dispose + exit 一次。

10. `ctx.effect` 的拆除路径只做 `server.shutdown()` + `transport.close()`，**不**调用 `exit`。[E: packages/sdk/server/src/index.ts:88] [E: packages/sdk/server/src/index.ts:89] 测试里卸掉插件 fiber 后，后续 initialize 不再出帧，且 `exits()` 仍为空——HMR 式 unload 停服但不杀进程。[E: packages/sdk/server/tests/plugin-apply.spec.ts:293] [E: packages/sdk/server/tests/plugin-apply.spec.ts:299] EOF / 信号退出归 app bin，不归本插件。

11. **`prompt` 不强制先 `initialize`。** 未握手时 `cwd`/`provider`/`model` 用字段初始值 `process.cwd()` / `'deepseek-official'` / `'deepseek-official'`，且不会走 `initialize` 的 adapter fallback。[E: packages/sdk/server/src/server.ts:54] [E: packages/sdk/server/src/server.ts:55] 生产组合（example / Python runtime）都先握手。

## 设计动机

stdout 专给 NDJSON，是因为客户端按行切帧。任何 console logger / TUI 写同一根流都会破坏 JSON-RPC。所以本包装在独立 runtime 组合里，而不是塞进 `dsh web`（Web GUI 另有自己的 host HTTP / 浏览器面）。

`shutdown` 必须先写出结果再 `flush` 再拆 root：客户端把 `shutdown` 当普通请求等 result；若先 `process.exit`，管道会在响应落盘前断掉。`setImmediate` 把「杀进程」推到当前请求的 write 之后。`exitTask` 合并并发 shutdown，避免双重 dispose / 双重 exit。

`inject` 只有 `agents`：serving 插件不能把 DeepSeek adapter 变成硬依赖。example 与 Python runtime 自己在 yml 里预挂 `llm-deepseek`；`initialize` 的 fallback 只覆盖「组合漏了 official adapter」这一种。别的 provider 缺席必须 fail-loud。

懒创建让客户端自选 `sessionId`（Python / TS SDK、以及 `dsh-subagent-dsh-sdk` 孩子都靠这个）。server 不 `resume`：身份由这次 `create` 钉死。局外 dispose 检测是为了 agent-loop HMR——静默 `followup` 一具已摘册的 agent 会丢 turn。

`subagent.finished` 只报 `info.local`：远程 / 进程外孩子有自己的 runtime 与自己的 JSON-RPC 面，本进程不能把它们的 stopReason 冒充成本地 child session。

named export only：与 ACP / subagent-acp 同一条 Loader 陷阱。测试用真 `Loader.prototype.unwrapExports` 钉 identity。

## Gotcha

- **不是 `dsh web` 的一部分。** 包在 monorepo 里 ≠ 进了 `dsh-base`。默认安装路径仍是本地 Web GUI。要对外讲 SDK 协议，必须 overlay / 使用 example、`python/sdk-runtime` 或自备一份含 `id: sdk-jsonrpc-server` 的 `cordis.yml`。
- **default export 会丢掉 `inject`。** `unwrapExports` 先取 `.default`。[E: vendor/loader/src/index.ts:194] 必须 `export const name` / `export const inject` / `export const Config` / `export function apply`。
- **`serverInfo.version` 不是包版本。** wire 上是 `'0.0.1'`；`packages/sdk/server/package.json` 的 `version` 是 `0.1.0-rc.5`。[E: packages/sdk/server/src/server.ts:124] [E: packages/sdk/server/package.json:4]
- **`maxTokensAsSuccess` 的两个默认值。** 插件 Schema 默认 `false`。[E: packages/sdk/server/src/index.ts:37] `examples/jsonrpc-agent/cordis.yml` 未设环境变量时写成 `true`。[E: examples/jsonrpc-agent/cordis.yml:7] Python runtime 那份 yml 不写该键，保持 `false`。
- **协议 `shutdown` 杀进程；fiber dispose 不杀。** 不要把 HMR unload 和客户端 `shutdown` 当成同一条路径。
- **没有 cancel / session-close / `loadSession`。** 放弃一轮的方式是关子进程（客户端 dispose 阶梯），不是再发一个 JSON-RPC 方法。
- **未知方法是 `-32603`。** handler 已安装，失败算「handler threw」，不是 `-32601 method not found`。
- **`prompt` 的 result 不是 turn 结束。** 要看整轮结束得听后续 `session.status` / `session.event`。
- **`initialize` 可被再调用。** 会改后续 *新* session 的 cwd/route，不会重建已有 `SessionRecord`。
- **孩子 fixture 里的本包行不是父 Provider。** 父侧是 `dsh-subagent-dsh-sdk`；`child.cordis.yml` 才是被 spawn 的 runtime 挂本插件。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition（wire）** | `@deepseek-ai/dsh-sdk-protocol` 的 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` / `JsonRpcLineTransport` | 无 `ctx.*` 键。三个请求、四条通知。细节见 [`subsys.integration.sdk-protocol`](sdk-protocol.md) |
| **Definition（agent）** | `@deepseek-ai/dsh-agent` 的 `AgentRegistry` | `ctx.agents`。**host**：`dsh-base` `id: agent`。本包不占这个键 |
| **Provider（本页）** | `@deepseek-ai/dsh-sdk-jsonrpc-server` 的 `apply` + `HarnessSdkJsonRpcServer` | 插件名 `sdk-jsonrpc-server`，`inject = ['agents']`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset。真实行：`examples/jsonrpc-agent/cordis.yml` 与 `python/sdk-runtime/.../cordis.yml` 的 `id: sdk-jsonrpc-server` |
| **Consumer（进程外客户端）** | `@deepseek-ai/dsh-sdk-client` 的 `HarnessClient`；Python `HarnessClient` | 父进程 spawn 本 runtime，stdio 讲同一份 protocol。见 [`subsys.integration.sdk-client`](sdk-client.md) / [`surface.sdk.typescript`](../../surface/sdk/typescript.md) |
| **Consumer（子 runtime 组合）** | `dsh-subagent-dsh-sdk` 拉起的孩子 `cordis.yml` | 父插件 `inject = ['subagents']` only。孩子必须自己挂本包，否则 spawn 出的进程没有 JSON-RPC 面。[E: examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml:5] |

换 SDK runtime 组合 = 改那份外部 `cordis.yml` 并保留 `id: sdk-jsonrpc-server`，不是改 `dsh-base`。本包不 `provide` 新的 `ctx.*` 服务键。

## Sources

- packages/sdk/server/src/index.ts
- packages/sdk/server/src/server.ts
- packages/sdk/server/package.json
- packages/sdk/server/tests/plugin-apply.spec.ts
- packages/sdk/server/tests/server.spec.ts
- packages/sdk/server/tests/plugin-shape.spec.ts
- packages/sdk/protocol/src/types.ts
- packages/sdk/protocol/src/transport.ts
- examples/jsonrpc-agent/cordis.yml
- examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/child.cordis.yml
- examples/package.json
- python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml
- python/sdk-runtime/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/subagent/subagent-dsh-sdk/src/index.ts
- vendor/loader/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面；默认产品路径是 `dsh web`。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角。
- [subsys.integration.sdk-protocol](sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三个请求、四条通知、`JsonRpcLineTransport`。
- [subsys.integration.sdk-client](sdk-client.md)（`subsys.integration.sdk-client`）：进程外 TS `HarnessClient` 与 dispose 阶梯。
- [subsys.orchestration.subagent-dsh-sdk](../orchestration/subagent-dsh-sdk.md)（`subsys.orchestration.subagent-dsh-sdk`）：父进程 Provider；孩子组合挂本包。
- [surface.sdk.typescript](../../surface/sdk/typescript.md)（`surface.sdk.typescript`）：TS SDK 可见面。
- [surface.sdk.python](../../surface/sdk/python.md)（`surface.sdk.python`）：Python 客户端；默认注入本 runtime 的 `cordis.yml`。
- [subsys.core.agent](../core/agent.md)（`subsys.core.agent`）：`ctx.agents.create` / `get` / `resume`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：shipped 核树；没有本包。
