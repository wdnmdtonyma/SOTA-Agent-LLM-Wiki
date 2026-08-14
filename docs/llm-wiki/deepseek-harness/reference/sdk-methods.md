---
id: ref.sdk-methods
title: SDK / RPC 方法目录
kind: catalog
tier: T3
pkg: integration
source:
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/client/src/api.ts
  - packages/sdk/client/src/index.ts
  - packages/sdk/client/src/client.ts
  - packages/sdk/client/src/types.ts
  - packages/sdk/server/src/index.ts
  - packages/sdk/server/src/server.ts
  - packages/sdk/server/tests/server.spec.ts
  - python/sdk/src/deepseek_harness/__init__.py
  - python/sdk/src/deepseek_harness/api.py
  - python/sdk/src/deepseek_harness/client.py
symbols:
  - HarnessSdkRequestMap
  - HarnessSdkNotificationMap
  - DeepSeekHarness
  - HarnessSession
  - HarnessClient
related:
  - subsys.integration.sdk-protocol
  - subsys.integration.sdk-client
  - subsys.integration.sdk-server
  - surface.sdk.typescript
  - surface.sdk.python
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-sdk-protocol` 的 wire 合同是 **三请求 + 四通知**；TS `DeepSeekHarness` / `HarnessClient` 与 Python `DeepSeekHarness` / `HarnessClient` 是进程外 Consumer，同表不同签名。`serverInfo.name` 钉死 `deepseek-harness-sdk-runtime`。

## 能回答的问题

- JSON-RPC 客户端→服务器恰好哪三个方法？服务器→客户端恰好哪四个通知？
- `initialize` 的 `serverInfo.name` 稳定值是什么？谁写入？
- TS `DeepSeekHarness.session` / `HarnessClient.prompt` 在 Python 里分别叫什么？
- `HarnessSession.run` 以哪条通知结算？`session/prompt` 的 `messageId` 是不是 turn 结果？
- Python `HarnessClient` 多出来的 `notify` / `next_request` / `respond` 是不是 `HarnessSdkRequestMap` 成员？
- 有没有 `newSession` / `session/cancel`？这是不是 `dsh web` 的默认面？

## 范围与 ground truth

本页是 **方法目录**，不是 T1 SDK 可见面走读。认这四份源：

- Wire 形状只认 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap`。[E: packages/sdk/protocol/src/types.ts:101] [E: packages/sdk/protocol/src/types.ts:93]
- Runtime 分发只认 `HarnessSdkJsonRpcServer.handleRequest` 的三支 `switch`。[E: packages/sdk/server/src/server.ts:192]
- TS 高层认 `packages/sdk/client/src/api.ts` 导出的类方法与函数；低层认 `HarnessClient` / `NotificationSubscription`。[E: packages/sdk/client/src/index.ts:12] [E: packages/sdk/client/src/index.ts:15]
- Python 对等认 `python/sdk/src/deepseek_harness/api.py` 的 `DeepSeekHarness` / `Session`，以及 `client.py` 的 `HarnessClient` / `NotificationSubscription`。包根 `__all__` 导出 `Session`，没有 `HarnessSession`。[E: python/sdk/src/deepseek_harness/__init__.py:7] [E: python/sdk/src/deepseek_harness/__init__.py:9]

官方 README / `docs/**` 只当查漏，不当 `[E]`。ACP 的 `authenticate` / `newSession` / `prompt` / `cancel` 不在本表。默认产品路径仍是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。SDK 客户端跑在 harness **进程外**（host 面的外部 Consumer）；被 spawn 的孩子才有自己的 `profile → bundle → agent preset`。本页不枚举 preset 工具。

## 实例表

### Wire request（`HarnessSdkRequestMap`）

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `initialize` | params `InitializeParams` `{ cwd, provider, model, maxTokens? }` → result `InitializeResult` `{ serverInfo: { name, version } }` | `maxTokens` 可缺；`name` 由 server 写成 `deepseek-harness-sdk-runtime`，`version` 现为 `'0.0.1'` | 进程级握手：记下此后 **SDK 新创建** session 的 cwd / provider / model / 可选正整数 token 帽。server 在缺 adapter 且 provider 为 `deepseek-official` 时才挂 DeepSeek fallback。[E: packages/sdk/protocol/src/types.ts:102] [E: packages/sdk/server/src/server.ts:124] [E: packages/sdk/server/tests/server.spec.ts:128] | 路由一次，避免每 session 再协商；`name` 给异构客户端做身份探测，不是 npm 版本谈判。 | `packages/sdk/protocol/src/types.ts` |
| `session/prompt` | params `SessionPromptParams` `{ sessionId, contentBlocks }` → result `SessionPromptResult` `{ messageId }` | 无字段默认。未知 `sessionId` 在 server 侧懒创建 | 把 `contentBlocks` 原样入队成 user 消息，立刻返回 durable `messageId`。不等 assistant、不等 `turn/end`。[E: packages/sdk/protocol/src/types.ts:103] [E: packages/sdk/server/src/server.ts:142] | 协议没有 `newSession`：调用方自带 id。完成态靠后续通知，所以同一 session 可连续入队 / steer。 | `packages/sdk/protocol/src/types.ts` |
| `shutdown` | params `undefined` → result `Record<string, never>`（空对象 `{}`） | params 类型是 `undefined`；TS 客户端 `request()` 缺省仍发 `{}` | 协议停机。插件在 **写出结果之后** 才 `setImmediate` 去 `flush` + `rootFiber.dispose()` + `exit(0)`。[E: packages/sdk/protocol/src/types.ts:104] [E: packages/sdk/server/src/server.ts:196] [E: packages/sdk/server/src/index.ts:80] | 让客户端先拿到空回执，再拆整棵 runtime。未知第四方法走 `default` 抛错（transport 层成 `-32603`，不是 `-32601`）。[E: packages/sdk/server/src/server.ts:199] | `packages/sdk/protocol/src/types.ts` |

### Wire notification（`HarnessSdkNotificationMap`）

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `session.event` | `SessionEventNotification` `{ sessionId, event: SessionEvent }` | 不过滤来源 | runtime 里每一条 `session/event` 都转发，不限 SDK 创建的 session。[E: packages/sdk/protocol/src/types.ts:94] [E: packages/sdk/server/src/server.ts:73] | 活动窗口由客户端切，不把 assistant / `turn/end` 绑死在某次 prompt 回执上。 | `packages/sdk/protocol/src/types.ts` |
| `session.status` | `SessionStatusNotification` `{ sessionId, status: 'idle' \| 'running' }` | 无第三态 | 来自 `agent/status`。高层 `run()` 看到本 session 的 `idle` 才结算。[E: packages/sdk/protocol/src/types.ts:95] [E: packages/sdk/server/src/server.ts:76] | 协议没有 `session/wait`；idle 是「整 agent 空闲」而不是单条 prompt 的专属完成帧。 | `packages/sdk/protocol/src/types.ts` |
| `subagent.started` | `SubagentStartedNotification` `{ parentSessionId, childSessionId }` | 仅当新 session 带 `header.parentSession` | 来自 `session/created`。客户端据此写 parent map，给 `subscribeSessionTree` 用。[E: packages/sdk/protocol/src/types.ts:96] [E: packages/sdk/server/src/server.ts:85] | 树范围裁剪在客户端，不在协议帧里。 | `packages/sdk/protocol/src/types.ts` |
| `subagent.finished` | `SubagentFinishedNotification` `{ provider, agentId, parentSessionId, childSessionId, status: 'ok' \| 'error', stopReason, lastAssistantMessage? }` | `lastAssistantMessage` 可缺；远程 / 非 `info.local` **不发** | 来自 `subagent/end` 且 `info.local`。`status` 由 stop reason 映射（`completed` → `ok`；`max-tokens` 仅当 Config `maxTokensAsSuccess`）。[E: packages/sdk/protocol/src/types.ts:97] [E: packages/sdk/server/src/server.ts:92] [E: packages/sdk/server/src/server.ts:102] | 远程孩子不走这条通知；`subagent.started` 仍可能因 parent header 发出——两端不对称。 | `packages/sdk/protocol/src/types.ts` |

### TS 高层 `DeepSeekHarness` / `HarnessSession`

包根再导出这两类；`normalizeInput` / `finalResponse` 在 `api.ts` 导出，**不**进 `index.ts`。[E: packages/sdk/client/src/index.ts:12]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `DeepSeekHarness` constructor | `(options: DeepSeekHarnessOptions)` | `provider='deepseek-official'`；`model='deepseek-v4-flash'`；`cwd=resolve(options.cwd ?? launch.cwd ?? process.cwd())`；`maxTokens` 可缺 | 记下 launch spec 与握手路由，立刻 `new HarnessClient(launch)`。相对 cwd 先绝对化，避免孩子再 resolve 一次变成 `worker/worker`。[E: packages/sdk/client/src/api.ts:40] [E: packages/sdk/client/src/api.ts:41] [E: packages/sdk/client/src/api.ts:39] | 高层拥有「一份 runtime 多 session」；wire cwd 必须相对父进程已经定死。 | `packages/sdk/client/src/api.ts` |
| `DeepSeekHarness.client` | getter → `HarnessClient` | 无 | 当前拥有子进程的低层客户端。握手失败会换新实例，不要跨失败的 `start` 缓存这个引用。[E: packages/sdk/client/src/api.ts:51] | 给需要 `subscribe` / 裸 `request` 的调用方开后门。 | `packages/sdk/client/src/api.ts` |
| `DeepSeekHarness.start` | `() => Promise<void>` | 握手 Promise 记在 `initialized` 上，成功后复用 | 懒 `client.start()` + `initialize({ cwd, provider, model, maxTokens? })`。失败则 `initialized=undefined`、`close` 旧客户端；未 `close` 过则换新 `HarnessClient` 以便重试。[E: packages/sdk/client/src/api.ts:62] [E: packages/sdk/client/src/api.ts:66] | `HarnessClient.close` 是永久的，必须换实例才能再 spawn。 | `packages/sdk/client/src/api.ts` |
| `DeepSeekHarness.session` | `(sessionId?: string) => HarnessSession` | 省略 id 则 `session-${randomUUID()去掉横线}` | **不发**任何 wire。runtime 在第一次 `session/prompt` 才建 session。[E: packages/sdk/client/src/api.ts:88] | 调用方可以预选 id；创建成本留在 server。 | `packages/sdk/client/src/api.ts` |
| `HarnessSession` constructor | `(harness: DeepSeekHarness, id: string)` | 无 | 只保存 `harness` 与 wire `id`。[E: packages/sdk/client/src/api.ts:137] | 句柄本身不建 session。 | `packages/sdk/client/src/api.ts` |
| `DeepSeekHarness.run` | `(input: string \| ContentBlock[], options?: RunOptions) => Promise<RunResult>` | `options.sessionId` 省略则每次新 session | 等价 `this.session(options?.sessionId).run(input, options)`。[E: packages/sdk/client/src/api.ts:99] | 一次性「开 session + 跑一轮」的糖。 | `packages/sdk/client/src/api.ts` |
| `DeepSeekHarness.close` | `() => Promise<void>` | 幂等 | 置 `closed=true` 再 `client.close()`。关闭后失败握手不再换新客户端。[E: packages/sdk/client/src/api.ts:107] | 拆卸是终端态，防止 `await using` 后再幽灵重启。 | `packages/sdk/client/src/api.ts` |
| `DeepSeekHarness[Symbol.asyncDispose]` | `() => Promise<void>` | 无 | 转调 `close()`。[E: packages/sdk/client/src/api.ts:116] | 支持 `await using`。 | `packages/sdk/client/src/api.ts` |
| `HarnessSession.run` | `(input: string \| ContentBlock[], options?: Pick<RunOptions, 'onNotification'>) => Promise<RunResult>` | `onNotification` 可缺 | `start()` → `subscribeSessionTree` → `prompt` → 等到本 session 的 `agent/inbox/spliced` 含该 `messageId`，再等到本 session `session.status==='idle'`。`events` 只收根 session 的 `session.event`；`notifications` 收整棵树。[E: packages/sdk/client/src/api.ts:146] [E: packages/sdk/client/src/api.ts:169] [E: packages/sdk/client/src/api.ts:182] | 协议回执不是 turn 结束；客户端自己划 owned activity interval。 | `packages/sdk/client/src/api.ts` |
| `normalizeInput` | `(input: string \| ContentBlock[]) => ContentBlock[]` | 字符串 → `[{ type:'text', text }]` | 把 `run` 的字符串输入收成 wire `contentBlocks`。[E: packages/sdk/client/src/api.ts:202] | 高层收人类字符串，wire 只认块数组。 | `packages/sdk/client/src/api.ts` |
| `finalResponse` | `(events: SessionEvent[]) => string` | 无 assistant/message 则 `''` | 从后往前找最后一条 `assistant/message`，拼接其 text 块。[E: packages/sdk/client/src/api.ts:236] | `RunResult.finalResponse` 的唯一抽取点。 | `packages/sdk/client/src/api.ts` |

### TS 低层 `HarnessClient`

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `HarnessClient` constructor | `(options: HarnessClientOptions)` | 只保存 `options`；不 spawn | `command` 必填。`args` 缺省 `[]`；`env` 缺省继承 `process.env`；`requestTimeoutMs` 缺省无限等。[E: packages/sdk/client/src/client.ts:197] [E: packages/sdk/client/src/types.ts:38] | 进程外自己 spawn，不走 `ctx.subprocess`。 | `packages/sdk/client/src/client.ts` |
| `HarnessClient.start` | `() => void` | 已有活孩子则 return；已 `close` 则抛 `TransportClosedError` | `spawn(command, args ?? [], { cwd, env, stdio: pipe×3 })`，stdout/stdin 交给 `JsonRpcLineTransport`。[E: packages/sdk/client/src/client.ts:203] [E: packages/sdk/client/src/client.ts:206] | 懒启动；`request()` 内部也会调它。 | `packages/sdk/client/src/client.ts` |
| `HarnessClient.initialize` | `(params: InitializeParams) => Promise<InitializeResult>` | 无 | `request('initialize', { ...params })`，校验 `serverInfo.name` / `version` 都是 string。[E: packages/sdk/client/src/client.ts:268] [E: packages/sdk/client/src/client.ts:269] | 客户端不写死 `deepseek-harness-sdk-runtime` 字面量；字面量在 server。 | `packages/sdk/client/src/client.ts` |
| `HarnessClient.prompt` | `(sessionId: string, contentBlocks: ContentBlock[]) => Promise<string>` | 无 | `request('session/prompt', { sessionId, contentBlocks })`，返回 `messageId`。[E: packages/sdk/client/src/client.ts:283] [E: packages/sdk/client/src/client.ts:285] | 低层只入队；观察走 `subscribe*`。 | `packages/sdk/client/src/client.ts` |
| `HarnessClient.request` | `(method: string, params?: object, timeoutMs?: number) => Promise<unknown>` | `params` 缺省发 `{}`；超时用 `requestTimeoutMs` | 通用 JSON-RPC。超时用 `AbortController` 放弃等待，**没有** wire cancel；server 侧工作仍跑到 close。[E: packages/sdk/client/src/client.ts:301] [E: packages/sdk/client/src/client.ts:314] | 三协议方法都走这里；也允许测未知 method。 | `packages/sdk/client/src/client.ts` |
| `HarnessClient.subscribe` | `(filter?: NotificationFilter) => NotificationSubscription` | 省略 filter = 全收 | 客户端扇出。runtime 已死或已 close 时返回的 handle 一生下来就 fail。[E: packages/sdk/client/src/client.ts:342] | 通知是推送，不是请求回执。 | `packages/sdk/client/src/client.ts` |
| `HarnessClient.subscribeSessionTree` | `(sessionId: string) => NotificationSubscription` | 无 | 按 `subagent.started` 谱系把根 + 子孙收进来（`sessionId` / `parentSessionId` / `childSessionId`）。[E: packages/sdk/client/src/client.ts:361] | 与 Python `subscribe_session_notifications` 同一裁剪规则；范围在客户端。 | `packages/sdk/client/src/client.ts` |
| `HarnessClient.close` | `() => Promise<void>` | `shutdownTimeoutMs` 缺省 `1000`；EOF grace `6000`；SIGTERM/KILL grace `3000` | 先尽力 `request('shutdown', undefined, …)`，再 EOF → SIGTERM → SIGKILL 等到进程真退出。幂等。[E: packages/sdk/client/src/client.ts:380] [E: packages/sdk/client/src/client.ts:389] | 协议 shutdown 失败仍走 dispose 阶梯。 | `packages/sdk/client/src/client.ts` |
| `NotificationSubscription.next` | `() => Promise<HarnessNotification>` | 无 | 等下一条匹配通知；runtime 死后先排空队列再 reject；`close()` 后立刻 reject。[E: packages/sdk/client/src/client.ts:107] | `HarnessSession.run` 的主循环。 | `packages/sdk/client/src/client.ts` |
| `NotificationSubscription.tryNext` | `() => HarnessNotification \| undefined` | 空队列 → `undefined` | 非阻塞取一条已入队通知。[E: packages/sdk/client/src/client.ts:120] | Python 对等是 `drain`，不是同名方法。 | `packages/sdk/client/src/client.ts` |
| `NotificationSubscription.close` | `() => void` | 无 | 退订、丢队列、fail 等待者。[E: packages/sdk/client/src/client.ts:125] | 与 runtime 死亡不同：死亡保留已入队项供排空。 | `packages/sdk/client/src/client.ts` |
| `NotificationSubscription[Symbol.asyncIterator]` | `() => AsyncIterator<HarnessNotification>` | 无 | `for await` 调 `next()` 直到拒绝。[E: packages/sdk/client/src/client.ts:170] | Python 没有异步迭代器。 | `packages/sdk/client/src/client.ts` |

### Python 高层 `DeepSeekHarness` / `Session`

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `DeepSeekHarness.__init__` | `(config: DeepSeekHarnessConfig \| None = None, **kwargs)` | `provider="deepseek-official"`；`model="deepseek-v4-flash"`；`shutdown_timeout_seconds=1.0`；`cwd` 缺省 `Path.cwd()` | 不能同时传 `config` 与 kwargs。组装 `HarnessClient(HarnessConfig(…))`，并把 `session_root` / `cordis` / `base_url` / `api_key` 写进子进程 env。[E: python/sdk/src/deepseek_harness/api.py:56] [E: python/sdk/src/deepseek_harness/api.py:22] [E: python/sdk/src/deepseek_harness/api.py:23] | Python 高层比 TS 多一层 Config 糖（`DSH_SESSION_ROOT`、`DEEPSEEK_BASE_URL`）。 | `python/sdk/src/deepseek_harness/api.py` |
| `DeepSeekHarness.__enter__` | `() -> DeepSeekHarness` | 无 | 调 `start()` 后返回 `self`。[E: python/sdk/src/deepseek_harness/api.py:86] | 同步 context manager 入口；TS 对等是 `await using` / `[Symbol.asyncDispose]`。 | `python/sdk/src/deepseek_harness/api.py` |
| `DeepSeekHarness.__exit__` | `(_exc_type, _exc, _tb) -> None` | 无 | 调 `close()`。[E: python/sdk/src/deepseek_harness/api.py:91] | 保证 `with` 结束时收割子进程。 | `python/sdk/src/deepseek_harness/api.py` |
| `DeepSeekHarness.client` | `@property → HarnessClient` | 无 | 返回内部 `_client`。Python **不会**在失败握手后换实例。[E: python/sdk/src/deepseek_harness/api.py:94] | 与 TS getter 同名；生命周期策略不同。 | `python/sdk/src/deepseek_harness/api.py` |
| `DeepSeekHarness.start` | `() -> None` | 已 `_initialized` 则 return | 同步：`client.start()` + `client.initialize(cwd=…, provider=…, model=…, max_tokens=…)`，成功后 `_initialized=True`。[E: python/sdk/src/deepseek_harness/api.py:97] | `initialize` 失败时 **底层** `HarnessClient.initialize` 会 `close()` 再抛。[E: python/sdk/src/deepseek_harness/client.py:135] | `python/sdk/src/deepseek_harness/api.py` |
| `DeepSeekHarness.close` | `() -> None` | 无 | `client.close()` 并把 `_initialized=False`。[E: python/sdk/src/deepseek_harness/api.py:109] | 与 TS 相反：关闭后 `start()` 可以再握手（底层 `_proc is None` 时重新 `Popen`）。 | `python/sdk/src/deepseek_harness/api.py` |
| `DeepSeekHarness.start_session` | `(session_id: str \| None = None) -> Session` | 省略则 `session-{uuid4.hex}` | 先 `start()` 再返回 `Session`。这是 TS `session()` 的对等名。[E: python/sdk/src/deepseek_harness/api.py:113] | 名字带 `start_`，且会先握手；TS `session()` 不握手。 | `python/sdk/src/deepseek_harness/api.py` |
| `DeepSeekHarness.run` | `(input: str \| list[JsonObject], *, session_id=None, on_notification=None) -> RunResult` | 两关键字可缺 | `start_session(session_id).run(...)`。关键字-only，不是 TS 的 `options` 对象。[E: python/sdk/src/deepseek_harness/api.py:117] | 同名不同签名。 | `python/sdk/src/deepseek_harness/api.py` |
| `Session.run` | `(input, *, on_notification=None) -> RunResult` | `on_notification` 可缺 | `subscribe_session_notifications` + `session_prompt(..., notification_subscription=…)`，等到 inbox 回执再等到 `session.status==='idle'`。额外填 `finish_reason`、`session_root`。[E: python/sdk/src/deepseek_harness/api.py:132] [E: python/sdk/src/deepseek_harness/api.py:155] | `RunResult` 字段是 snake_case，且多 `finish_reason`（TS `RunResult` 没有）。 | `python/sdk/src/deepseek_harness/api.py` |

### Python 低层 `HarnessClient`

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `HarnessClient.__init__` | `(config: HarnessConfig \| None = None)` | `HarnessConfig()`；`shutdown_timeout_seconds=1.0` | 同步客户端，不 spawn。[E: python/sdk/src/deepseek_harness/client.py:40] [E: python/sdk/src/deepseek_harness/client.py:34] | 与 TS 一样：配置与进程分开。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.__enter__` | `() -> HarnessClient` | 无 | 调 `start()` 后返回 `self`。[E: python/sdk/src/deepseek_harness/client.py:56] | TS `HarnessClient` 没有 context manager（高层才有 `asyncDispose`）。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.__exit__` | `(_exc_type, _exc, _tb) -> None` | 无 | 调 `close()`。[E: python/sdk/src/deepseek_harness/client.py:61] | 与 `__enter__` 成对收割 `_proc`。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.start` | `() -> None` | 已有 `_proc` 则 return | `Popen(launch_args, text=True, bufsize=1)`。无 `runtime_bin` / `bridge_bin` / override 时走 bundled `resolve_bundled_launch_args`，并可能注入 `DSH_CORDIS_CONFIG`。[E: python/sdk/src/deepseek_harness/client.py:63] [E: python/sdk/src/deepseek_harness/client.py:73] | TS 必须调用方给 `command`；Python 可发现 bundled runtime。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.initialize` | `(*, cwd, provider, model, max_tokens=None) -> InitializeResponse` | `max_tokens` 可缺 | 关键字-only。`cwd` 先 `Path.resolve`；wire 键仍是 camelCase `maxTokens`。**任何** `BaseException` 先 `close()` 再抛。[E: python/sdk/src/deepseek_harness/client.py:117] [E: python/sdk/src/deepseek_harness/client.py:131] [E: python/sdk/src/deepseek_harness/client.py:135] | TS `initialize` 失败不关进程（高层 `start` 才关）。Pydantic 模型里 `serverInfo` / `name` 允许 `None`。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.session_prompt` | `(session_id, content_blocks, *, on_notification=None, notification_subscription=None) -> str` | 两关键字可缺 | 发 `session/prompt`，返回 `messageId`。可在等待回执期间排空 session 树通知。[E: python/sdk/src/deepseek_harness/client.py:138] [E: python/sdk/src/deepseek_harness/client.py:148] | **不是** `prompt`。TS 的观察与入队是分开的两个调用。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.request` | `(method, params, *, response_model, timeout_seconds=None, on_notification=None, notification_filter=None, notification_subscription=None) -> ModelT` | `params` 为 `None` 则 **省略** `params` 键 | 必须给 Pydantic `response_model`。`shutdown` 走 `_ShutdownResponse`。[E: python/sdk/src/deepseek_harness/client.py:157] [E: python/sdk/src/deepseek_harness/client.py:249] | 与 TS `request(): Promise<unknown>` + 缺省 `{}` 不是同一签名。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.notify` | `(method: str, params: JsonObject \| None = None) -> None` | `params` 缺省省略 | 写一条 **无 id** 的 JSON-RPC notification 到 runtime stdin。[E: python/sdk/src/deepseek_harness/client.py:180] | **不是** `HarnessSdkNotificationMap` 成员（那张表是 server→client）。TS `HarnessClient` 无此方法。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.next_notification` | `() -> Notification` | 阻塞 | 取未被任何 subscription 吃掉的全局通知队列。[E: python/sdk/src/deepseek_harness/client.py:186] | TS 没有「无主通知」队列 API。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.subscribe_notifications` | `(notification_filter=None) -> NotificationSubscription` | 省略 = 全收 | TS `subscribe` 的对等。[E: python/sdk/src/deepseek_harness/client.py:192] | 命名是 snake_case 复数。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.subscribe_session_notifications` | `(session_id: str) -> NotificationSubscription` | 无 | TS `subscribeSessionTree` 的对等，同一套 parent map 规则。[E: python/sdk/src/deepseek_harness/client.py:202] | 名字没有 `Tree`，行为是树。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.next_request` | `() -> IncomingRequest` | 阻塞 | 读 **对端发来的、带 id+method** 的帧（server→client request）。[E: python/sdk/src/deepseek_harness/client.py:206] | `HarnessSdkRequestMap` **没有** server 发起的请求。shipped `sdk-jsonrpc-server` 只 `notify` 四条通知。[I] 此方法是通用 JSON-RPC 能力，不是第三条协议 request。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.respond` | `(request_id, result) -> None` | 无 | 给 `next_request` 拿到的 id 写 result 帧。[E: python/sdk/src/deepseek_harness/client.py:212] | 与 `next_request` 配套；协议 map 无对应方法。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.respond_error` | `(request_id, *, code, message, data=None) -> None` | `data` 可缺 | 写 error 帧。[E: python/sdk/src/deepseek_harness/client.py:215] | 同上，通用 RPC，不是 harness wire 方法。 | `python/sdk/src/deepseek_harness/client.py` |
| `HarnessClient.close` | `() -> None` | `shutdown_timeout_seconds` 默认 `1.0` | 尽力 `request("shutdown", None)`，关 stdin，`terminate`，超时则 `kill`。然后 `_proc=None`。[E: python/sdk/src/deepseek_harness/client.py:87] [E: python/sdk/src/deepseek_harness/client.py:92] | 拆卸比 TS 的三档 dispose 阶梯短（无独立 EOF grace 常量）。`_proc=None` 让后续 `start()` 能再拉起。 | `python/sdk/src/deepseek_harness/client.py` |
| `NotificationSubscription.next` | `() -> Notification` | 阻塞 | 同步取下一条。[E: python/sdk/src/deepseek_harness/client.py:531] | TS 的 `next` 是 async。 | `python/sdk/src/deepseek_harness/client.py` |
| `NotificationSubscription.drain` | `(on_notification) -> None` | 无 | `get_nowait` 直到空。[E: python/sdk/src/deepseek_harness/client.py:537] | TS 对等是循环 `tryNext`，没有 `drain` 这个名字。 | `python/sdk/src/deepseek_harness/client.py` |
| `NotificationSubscription.close` | `() -> None` | 幂等 | 从 client 摘掉 subscriber。[E: python/sdk/src/deepseek_harness/client.py:525] | 退订后 `next` 不再从该队列取新通知。 | `python/sdk/src/deepseek_harness/client.py` |
| `NotificationSubscription.__enter__` | `() -> NotificationSubscription` | 无 | 返回 `self`，不额外订阅。[E: python/sdk/src/deepseek_harness/client.py:519] | 让 `with subscribe_*()` 在离开时 `close`。 | `python/sdk/src/deepseek_harness/client.py` |
| `NotificationSubscription.__exit__` | `(_exc_type, _exc, _tb) -> None` | 无 | 调 `close()`。[E: python/sdk/src/deepseek_harness/client.py:523] | TS `NotificationSubscription` 没有 context manager。 | `python/sdk/src/deepseek_harness/client.py` |

## 对照 / 分家 / 装配

**同名不同签名（不要当成一份 API 抄）。**

| TS | Python | 差在哪 |
|---|---|---|
| `DeepSeekHarness.session` | `DeepSeekHarness.start_session` | Python 先握手；TS 不发 wire |
| `HarnessClient.prompt` | `HarnessClient.session_prompt` | Python 可在等待回执时排通知 |
| `subscribe` / `subscribeSessionTree` | `subscribe_notifications` / `subscribe_session_notifications` | 树裁剪规则相同，名字不同 |
| `request(method, params?, timeoutMs?)` | `request(method, params, *, response_model, …)` | TS 缺省发 `{}`；Python `None` 省略键，且强制模型 |
| `RunResult.finalResponse` | `RunResult.final_response` + `finish_reason` + `session_root` | Python 多两个字段 |
| `[Symbol.asyncDispose]` | `__enter__` / `__exit__` | 一个 async，一个 sync |
| `close` 终端 | `close` 后可再 `start` | TS 置 `closed=true`；Python 清 `_initialized` / `_proc` |

`notify` / `next_request` / `respond` / `respond_error` **只存在于 Python 低层**。它们不是 `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` 的键。shipped server 对客户端只 `transport.notify` 那四条。[E: packages/sdk/server/src/server.ts:73]

**`serverInfo.name` 是 wire-stable `deepseek-harness-sdk-runtime`。** 字面量写在 server 返回值，不在 protocol 类型（类型只是 `string`）。单测钉死这个名字。[E: packages/sdk/server/src/server.ts:124] [E: packages/sdk/server/tests/server.spec.ts:128]

**未 `initialize` 就 `session/prompt`。** server 字段初值是 `provider='deepseek-official'`、`model='deepseek-official'`（不是客户端默认的 `deepseek-v4-flash`）。[E: packages/sdk/server/src/server.ts:55] [E: packages/sdk/server/src/server.ts:56]

**不是 ACP，不是 `dsh web`。** 没有 `newSession` / `cancel`。Web 工作台走 host HTTP，不讲这套 stdio JSON-RPC。本目录不进四个 shipped preset。

## Sources

- packages/sdk/protocol/src/types.ts
- packages/sdk/client/src/api.ts
- packages/sdk/client/src/index.ts
- packages/sdk/client/src/client.ts
- packages/sdk/client/src/types.ts
- packages/sdk/server/src/index.ts
- packages/sdk/server/src/server.ts
- packages/sdk/server/tests/server.spec.ts
- python/sdk/src/deepseek_harness/__init__.py
- python/sdk/src/deepseek_harness/api.py
- python/sdk/src/deepseek_harness/client.py

## 相关

- [subsys.integration.sdk-protocol](../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三请求 / 四通知的 wire 形状与 NDJSON transport。
- [subsys.integration.sdk-client](../subsystems/integration/sdk-client.md)（`subsys.integration.sdk-client`）：TS 进程外 spawn 与 EOF→SIGTERM→SIGKILL 拆卸。
- [subsys.integration.sdk-server](../subsystems/integration/sdk-server.md)（`subsys.integration.sdk-server`）：插件 `sdk-jsonrpc-server`；懒创建 session；`shutdown` 后退出进程。
- [surface.sdk.typescript](../surface/sdk/typescript.md)（`surface.sdk.typescript`）：TS SDK 可见面（调用方式，不是本页方法表）。
- [surface.sdk.python](../surface/sdk/python.md)（`surface.sdk.python`）：Python SDK 可见面；与本页同一方法表、不同签名。
