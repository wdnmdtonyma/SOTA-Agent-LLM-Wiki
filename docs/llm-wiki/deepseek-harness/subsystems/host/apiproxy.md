---
id: subsys.host.apiproxy
title: API proxy / BFF
kind: subsystem
tier: T2
pkg: host
source:
  - packages/host/apiproxy/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/api/index.ts
  - packages/host/apiproxy/src/api/rpc.ts
  - packages/host/apiproxy/src/api/rpc-map.ts
  - packages/host/apiproxy/src/api/jobs.ts
  - packages/host/apiproxy/src/api/events.ts
  - packages/host/apiproxy/src/fetch/handler.ts
  - packages/host/apiproxy/src/fetch/client.ts
  - packages/host/apiproxy/package.json
  - packages/host/apiproxy/tests/fetch-carrier.spec.ts
  - packages/host/apiproxy/tests/client-handler.spec.ts
  - packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts
  - packages/host/apiproxy/tests/api-proxy-workspace.spec.ts
  - packages/host/apiproxy/tests/api-proxy-blank.spec.ts
  - packages/api/gateway/src/index.ts
  - packages/api/gateway/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/client/connection/src/index.ts
  - packages/client/connection/src/api-path.ts
  - packages/client/connection/src/rpc-host.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent/src/index.ts
symbols:
  - ApiProxy
  - ApiProxyService
  - ctx.apiProxy
  - createApiProxy
  - toFetchHandler
  - RpcMethodMap
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.host.webserver
  - subsys.client.connection
  - subsys.composition.agent-presets
  - subsys.integration.api-gateway
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-host-apiproxy` 是 **host 面**、传输无关的 BFF 合同（`ApiProxy` / `RpcMethodMap`）加上 `ApiProxyService` 的进程级实现（`ctx.apiProxy`）。它**不** `listen`、**不**向 `ctx.webServer` 登记路由；物理 HTTP / WebSocket carrier 是 `client-connection` 的 `/api`。

## 能回答的问题

- `ctx.apiProxy` 由哪个插件 `provide`？`id: api-gateway` 出现在哪份 bundle？`dsh-base` / `dsh-headless` 有没有这行？
- `ApiProxy` 与 `packages/api/gateway` 的 `typertGateway` 是不是同一个服务？谁先吃 `/api`？
- HTTP 状态码 404 / 415 / 400 / 500 和业务错误（`session-not-found` 等）分别落在哪一层？
- `RpcMethodMap` 覆盖哪些 client-request 族？`respond` 和 `api/jobs.ts` 是不是 wire 方法？
- `session.create` 如何分配 `session-<uuid>`、决议 cwd、在 unpublished `setup` 里 `presets.mount`？失败为何整次回滚？
- `session.prompt` 何时 `followup`、何时 `steer`？`events.mux` 怎样把 `session/event` 推回 GUI？冷 resume 的 preset / 模型读 log 还是 header？

## 职责边界

DSH 是 **Cordis 组合运行时**（主线 `profile → bundle → agent preset`；capability seam = Definition / Provider / Consumer；`model-visible ⟺ logged`），不是「又一个 coding agent」。默认安装路径是 `dsh web`；本仓没有 shipped TUI。`--host 0.0.0.0` 的拒绝发生在 `provide('webStartup')` **之前**，由 `web-startup` 处理，**不是**本包。本页守 **host 面** 的 BFF 合同与实现。

本包拥有：

- 浏览器可 import 的合同层 `api/`：`ApiProxy` 域树、四象限消息、`RpcMethodMap`。
- 同构 fetch carrier：`toFetchHandler`（`Request → Response`）与 `AbstractApiClient` / `InProcessApiClient`。
- host 实现 `createApiProxy` 与 Cordis 插件 `ApiProxyService`（`super(ctx, 'apiProxy')`）。[E: packages/host/apiproxy/src/index.ts:97]

明确不拥有：

- `node:http` listen、named route 表、fallback 座：[`subsys.host.webserver`](webserver.md)。
- 把合同绑到 `POST /api/<method>`、信任篱笆、mux/host 的 WebSocket upgrade：[`subsys.client.connection`](../client/connection.md)。本页不列 privileged method 名单。
- Typert Remote 分发（`ctx.typertGateway`、`connection.rpc.intercept`）：[`subsys.integration.api-gateway`](../integration/api-gateway.md)。包名 `@deepseek-ai/dsh-api-gateway` **不是** `ctx.apiProxy`。[E: packages/api/gateway/src/index.ts:100]
- preset 发现 / standing mount / `leakedServices`：[`subsys.composition.agent-presets`](../composition/agent-presets.md)。本包只在 `composeAgent` 里 `resolve` + `mount`。
- `ReactLoopAgent` / `Inbox` / turn-step：agent-preset 面的 loop。本包在 `session.prompt` 里调用 `followup` / `steer` 后结束。
- 浏览器半边：client 不执行模型 turn。

`ApiProxyService.static inject` 是硬依赖，必须如实写出：`agentDefaultModel` / `agents` / `attachments` / `directoryPicker` / `llm` / `sessions` / `subagents` / `sessionQuery` / `tools` / `userQuestions` / `workspaceRegistry`。[E: packages/host/apiproxy/src/index.ts:71] `agentPresets`、`jobs`、`settings`、`credentials`、`sessionPersistence` **不**在 inject 里，实现用 `ctx.get(...)`；缺席时对应 RPC 走 `internal` / 空 roster / 不推 `session/jobs`，而不是 Loader 行 pending。

本页的控制流是 Service + fetch 分发 +（另一包的）Remote intercept。Cordis `Events.waterfall` 必须 `next()`，但 `ApiProxy` 本身不是 waterfall 缝。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/apiproxy/src/index.ts` | `ApiProxyService`：`provide('apiProxy')`、`static inject`、Config |
| `packages/host/apiproxy/src/api/index.ts` | `ApiProxy` 根接口（域字段 + `respond`） |
| `packages/host/apiproxy/src/api/rpc-map.ts` | `RpcMethodMap`：仅 client-request 方法名 |
| `packages/host/apiproxy/src/api/rpc.ts` | 四象限 `ClientRequest` / `ServerResponse` / `ServerRequest` / `ClientResponse`；`RpcReceipt` |
| `packages/host/apiproxy/src/api/jobs.ts` | `JobView` 投影类型；**没有** wire 方法 |
| `packages/host/apiproxy/src/api/events.ts` | `events.mux` / `events.host` 帧，含 `session/jobs` |
| `packages/host/apiproxy/src/api-proxy.ts` | `createApiProxy`：`composeAgent`、`session.create` / `prompt`、mux |
| `packages/host/apiproxy/src/fetch/handler.ts` | `toFetchHandler`：WHATWG 分发与 carrier HTTP 状态 |
| `packages/host/apiproxy/src/fetch/client.ts` | `AbstractApiClient.callUnary`：`POST /api/<method>` |
| `packages/bundle/web-app/cordis.patch.yml` | `id: api-gateway` → `@deepseek-ai/dsh-host-apiproxy` |
| `packages/bundle/base/cordis.patch.yml` | `id: typert-gateway` → `@deepseek-ai/dsh-api-gateway`（另一缝） |
| `packages/bundle/headless/cordis.patch.yml` | 无 apiproxy / 无 webserver 行 |
| `packages/preset/agent-presets/src/index.ts` | `AgentPresets.resolve` / `mount` |
| `packages/preset/agent-presets/src/session.ts` | `resolveSessionPreset`：log 最后一次 selection，否则 header |
| `packages/client/connection/src/index.ts` | `webServer.register` `/api`；`toFetchHandler(ctx.apiProxy)` |
| `packages/api/gateway/src/index.ts` | `TypertGatewayService`：`typertGateway` + `rpc.intercept('/api', …)` |
| `packages/core/agent-loop/src/index.ts` | unpublished `setup` 失败则 `dispose`，不 publish |
| `packages/host/apiproxy/tests/fetch-carrier.spec.ts` | 404 / 400 / 500 / 200 + ServerResponse |
| `packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts` | create 写 header、无 roster、冷读走 log |
| `packages/host/apiproxy/tests/api-proxy-workspace.spec.ts` | workspace 附着、`session-conflict` |
| `packages/host/apiproxy/tests/api-proxy-blank.spec.ts` | `blank` = 尚未出现 `turn/start` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `ApiProxy` | 域树：`sessions` / `subagents` / `host` / `workspace` / `skills` / `agentPresets` / `events` / `goals` / `settings` / `credentials` / `llm` / `downloads` + `respond`。[E: packages/host/apiproxy/src/api/index.ts:22] |
| `RpcMethodMap` | 只登记 **client-request**。key 是 path 段（`POST /api/session.create`）。`respond` 不在 map。[E: packages/host/apiproxy/src/api/rpc-map.ts:24] |
| 四象限 | `ClientRequest` ↔ `ServerResponse`（unary POST）；`ServerRequest` ↔ `ClientResponse`（流上的 approval / question，回答走 `POST /api/respond`）。[E: packages/host/apiproxy/src/api/rpc.ts:151] |
| `RpcResult<T>` | `{ ok: true, value }` 或 `{ ok: false, error }`。业务失败是这个槽，不是 throw。 |
| `RpcReceipt` | `respond` 的 carrier 回执：`accepted` 或 `not-pending` / `bad-response`。不是 `RpcMessage`。 |
| `ApiProxyDefaults` | `defaultModelSelection()` 每次重读；`cwd` 是 create 未带路径时的 Host 工作目录。没有 create-time per-session model override。 |
| `ApiProxyService.Config` | 可选 `nativeOpen`、`sessionExportCompressionLevel`（默认 6）、`coldBlankProbeMaxBytes`（默认 1024）。 |
| `JobView` | jobs 在 mux 帧 `session/jobs` 里推，不是 `RpcMethodMap` 行。[E: packages/host/apiproxy/src/api/events.ts:98] |

`RpcMethodMap` 名字表（不要当字段 schema）：

| 族 | 方法 |
|---|---|
| `session.*` | `list` `search` `create` `history` `models` `selectModel` `rename` `fork` `prompt` `attachment` `updateQueue` `cancel` |
| `subagent.*` | `list` `history` `prompt` `interrupt` |
| `host.*` | `describe` `pickDirectory` `listDirectory` `createDirectory` `openPath` |
| `workspace.*` | `list` `create` `rename` `delete` `insertBefore` `insertSessionBefore` `archiveSession` |
| `skill.*` | `list` |
| `agentPreset.*` | `list` `select` `read` `copy` `openDocument` `remove` |
| `goal.*` | `create` `edit` `pause` `resume` `complete` `clear` |
| `settings.*` | `describe` `openDocument` `update` `replace` `mutate` |
| `credentials.*` | `describe` `set` `unset` |
| `llm.*` | `providers` `models` `discoverModels` |

`UNARY_ROUTES@handler.ts` 用同一套 key 做 compile-lock：map 有行、route 无行则编不过。[E: packages/host/apiproxy/src/fetch/handler.ts:90]

## 控制流

1. **web-app 独有 insert。** `dsh-web-app` 的 `cordis.patch.yml` 写 `id: api-gateway`、`name: '@deepseek-ai/dsh-host-apiproxy'`。[E: packages/bundle/web-app/cordis.patch.yml:99] [E: packages/bundle/web-app/cordis.patch.yml:100] `dsh-base` **没有**这行；它 insert 的是另一包 `id: typert-gateway` / `@deepseek-ai/dsh-api-gateway`。[E: packages/bundle/base/cordis.patch.yml:36] [E: packages/bundle/base/cordis.patch.yml:37] `dsh-headless` 的 `insert` 是 `code-runtime` / `headless-startup` / `headless-runner`，同样没有 apiproxy。[E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] 本仓没有 shipped TUI；默认产品路径是本地 Web GUI。

2. **`ApiProxyService` 立刻 `provide('apiProxy')`。** 构造函数 `super(ctx, 'apiProxy')`，再 `createApiProxy(ctx, { defaultModelSelection: () => ctx.agentDefaultModel.currentSelection(), saveDefaultModelSelection, cwd: process.cwd(), …config })`，把返回的域对象抄到 `this.sessions` 等字段。[E: packages/host/apiproxy/src/index.ts:97] [E: packages/host/apiproxy/src/index.ts:98] Loader `inject` 等的是这张 hard 列表；服务未 provide 则该行 pending。这和 waterfall 必须 `next()` 不是同一条链。

3. **本包不登记 HTTP 路由。** 物理 carrier 是 `client-connection`：`API_PATH = '/api'`，`apply` 里 `ctx.webServer.register` prefix `/api`，handler 在信任检查之后 `toFetchHandler(ctx.get('apiProxy')).fetch(request)`。[E: packages/client/connection/src/api-path.ts:8] [E: packages/client/connection/src/index.ts:173] [E: packages/client/connection/src/index.ts:158] `apiProxy` 缺失时 connection 对该 unary 回 404。[E: packages/client/connection/src/index.ts:157]

4. **同一 `/api` 上 Typert 先 intercept。** `TypertGatewayService` `super(ctx, 'typertGateway')`，再 `connection.rpc.intercept('/api', endpoint => this.claimsEndpoint(endpoint), dispatchRpc, { authority: 'trusted-host' })`。[E: packages/api/gateway/src/index.ts:100] [E: packages/api/gateway/src/index.ts:105] `HostConnectionService.createSharedFetchHandler`：interceptor `matches(endpoint)` 为真走 Typert；否则 fallback 到 `toFetchHandler`。[E: packages/client/connection/src/rpc-host.ts:79] [E: packages/client/connection/src/rpc-host.ts:80] Typert endpoint 形如 `namespace/method`；`session.create` 这种点分名落到 fallback。Typert codec / SRC 细节交给 [`subsys.integration.api-gateway`](../integration/api-gateway.md)。

5. **`toFetchHandler@packages/host/apiproxy/src/fetch/handler.ts` 是纯 WHATWG 分发。** 导出函数包一层 `{ fetch }`。[E: packages/host/apiproxy/src/fetch/handler.ts:243] GET `/api/events.mux` / `/api/events.host` 走 SSE；GET/HEAD `/api/session.export` 走 `downloads.sessionLog`；`POST /api/respond` 调 `api.respond`；其余 `POST /api/<method>` 查 `UNARY_ROUTES`。[E: packages/host/apiproxy/src/fetch/handler.ts:254] [E: packages/host/apiproxy/src/fetch/handler.ts:296] Web 进程里 GET mux/host 被 connection 先回 426，真正的流是 WebSocket upgrade。[E: packages/client/connection/src/index.ts:152] [E: packages/client/connection/src/index.ts:193] SSE 路径留给 `InProcessApiClient` 与测试。

6. **HTTP 状态只表达 carrier。** 未知 path / 非 POST 非 stream → 404。[E: packages/host/apiproxy/src/fetch/handler.ts:274] 非 `application/json`（含浏览器 simple POST 的 `text/plain`）→ 415，impl 不跑。[E: packages/host/apiproxy/src/fetch/handler.ts:285] body 不是 JSON → 400。[E: packages/host/apiproxy/src/fetch/handler.ts:293] impl **throw** → 500。[E: packages/host/apiproxy/src/fetch/handler.ts:190] 业务错误（未知 session、坏 payload、path/method 不一致）一律 `Response.json(ServerResponse)`，默认 200。[E: packages/host/apiproxy/src/fetch/handler.ts:160] 测试钉死：malformed envelope 仍 200 + `bad-request`；impl crash 才 500。[E: packages/host/apiproxy/tests/client-handler.spec.ts:322] [E: packages/host/apiproxy/tests/fetch-carrier.spec.ts:629]

7. **浏览器 unary：`AbstractApiClient.callUnary`。** 铸造 `ClientRequest`（`type: 'client-request'`），`POST /api/${method}`，`content-type: application/json`。[E: packages/host/apiproxy/src/fetch/client.ts:339] [E: packages/host/apiproxy/src/fetch/client.ts:341] 非 2xx 在 client 侧 throw transport；`result.ok === false` 不 throw。[E: packages/host/apiproxy/src/fetch/client.ts:324]

8. **`session.create@createApiProxy`。** `sessionId = payload.sessionId ?? \`session-${randomUUID()}\``。[E: packages/host/apiproxy/src/api-proxy.ts:2168] 若带 `workspaceId` 则 `workspaceRegistry.get`，缺失 → `workspace-not-found`。[E: packages/host/apiproxy/src/api-proxy.ts:2171] cwd = `workspace.path ?? payload.cwd ?? defaults.cwd`（插件默认 `process.cwd()`）。[E: packages/host/apiproxy/src/api-proxy.ts:2180] 然后 `ensureSession(sessionId, cwd, payload.sessionId !== undefined, requestedPreset)`。[E: packages/host/apiproxy/src/api-proxy.ts:2183] 调用方预分配 id 时才去 persistence 查已有身份（幂等 adopt）；新 uuid 走 create。workspace 附着发生在 Agent **已经 publish 之后**：`attachSession` 失败回 `workspace-attach-failed`，会话仍在。[E: packages/host/apiproxy/src/api-proxy.ts:2220] 测试：同一 `sessionId` + 同一 workspace 二次 create 不双开；只传 `cwd` 的会话不进该 workspace；cwd 冲突 → `session-conflict`。[E: packages/host/apiproxy/tests/api-proxy-workspace.spec.ts:372]

9. **`composeAgent`：preset 在 session 存在之前决议。** `ctx.get('agentPresets') === undefined`（headless / 未挂 roster）只返回 `setup: installSelection`，header **不**写 `agentPreset`。[E: packages/host/apiproxy/src/api-proxy.ts:1231] [E: packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts:228] 有 roster 则 `presets.resolve(presetId)`（未点名用 `defaultId` = settings 否则 `config.default`），把 `resolvedId` 放进返回值，真正的 `presets.mount(agentCtx, resolvedId)` 放进 unpublished `setup`。[E: packages/host/apiproxy/src/api-proxy.ts:1240] [E: packages/host/apiproxy/src/api-proxy.ts:1245] [E: packages/preset/agent-presets/src/index.ts:213] [E: packages/preset/agent-presets/src/index.ts:192] 决议必须先于 `sessions.prepare`：header 会快照 `meta`，setup 期间才发现的 id 写不进 header。

10. **`ensureSession` 调 `ctx.agents.create`。** `meta` 带 `cwd` 与（若有）`agentPreset`；`setup` 即 `composition.setup`。[E: packages/host/apiproxy/src/api-proxy.ts:1670] [E: packages/host/apiproxy/src/api-proxy.ts:1675] `AgentPresets.mount` 要求 `agentCtx` 已有 scope key，把该 key parent 到 preset 的 standing mount。[E: packages/preset/agent-presets/src/index.ts:275] `AgentLoop.setupAndPublish` 在 `enter` / `announce` **之前** `await setup(...)`；throw 则 `prepared.dispose()` 再抛出，session / agent 都不 publish。[E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:642] 未知 preset 在 `resolve` 阶段就失败，映射为 `agent-preset-not-found`，不会留下半吊子会话。[E: packages/host/apiproxy/src/api-proxy.ts:398] [E: packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts:171] 点名的 create 成功后 header 记下决议 id。[E: packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts:153]

11. **冷 resume / 通用 `agentFor` 从 log 读 preset。** `createApiRemoteAgentResolver` 的 setup 调 `composeAgent(resolveSessionPreset({ header: meta, events }))`。[E: packages/host/apiproxy/src/api-proxy.ts:1270] `resolveSessionPreset` 从事件尾往头找最后一次 `agent-preset/selected`，找不到才回落 `header.agentPreset`。[E: packages/preset/agent-presets/src/session.ts:51] [E: packages/preset/agent-presets/src/session.ts:53] blank 会话可以 `agentPreset.select`；只信 header 会在重启后用创建时的工具集重放已经换过 preset 的历史。这是 `model-visible ⟺ logged`：模型看见的工具集必须能从 log 重建。

12. **`session.prompt@createApiProxy`。** 先校验可选 `clientTimeZone`（UTC 或 IANA），再 `turnAgentFor`：resume/adopt live `Agent`，读 `selectionFor(agent).current`，`ctx.llm.listProviders()` 里没有该 provider → `model-unavailable`，失败停在 pre-step 之外。[E: packages/host/apiproxy/src/api-proxy.ts:2473] [E: packages/host/apiproxy/src/api-proxy.ts:1857] [E: packages/host/apiproxy/src/api-proxy.ts:1860] 通过后把 `rpcId` 与校验过的 zone 写入 `MessageSource`，`createUserMessage`，`mode === 'steer'` 则 `agent.steer`，否则 `agent.followup`。[E: packages/host/apiproxy/src/api-proxy.ts:2498] [E: packages/host/apiproxy/src/api-proxy.ts:2499] schema 只允许 `'queue' | 'steer'`；Web 第一次普通提问是 `queue` → `followup`。图像入场还要过 `llm.resolveModelInfo` 的 `inputModalities`。

13. **模型选择每次重读，没有 create-time override。** `selectionFor`：进程内 `picked`（`session.selectModel` 写入）> `agent.session.requestHeader()?.config`（log 里最新 request/header）> `defaults.defaultModelSelection()`（live `ctx.agentDefaultModel`）。[E: packages/host/apiproxy/src/api-proxy.ts:1160] [E: packages/host/apiproxy/src/api-proxy.ts:1163] [E: packages/host/apiproxy/src/api-proxy.ts:1164] create payload 没有 per-session model 字段。

14. **`events.mux` 把 log 投影推回 client。** 打开时给每个 attached session 推 subscribe / 队列 / jobs 基线；随后 `ctx.on('session/event', …)` 对每条事件 `queue.push({ type: 'session/event', sessionId, event, view? })`。[E: packages/host/apiproxy/src/api-proxy.ts:3475] [E: packages/host/apiproxy/src/api-proxy.ts:3493] `view` 是当时 presenter 算出的渲染意图，**不**入 log。`ctx.get('jobs')` 存在时另推 `session/jobs`；jobs **没有** unary RPC。GUI 上的用户消息与 assistant 文本来自这条投影，不是 client 本地伪造的模型历史。

15. **`respond` 不是 map 方法。** `POST /api/respond` 吃 `ClientResponse`，按 echoed `rpcId` 先查 pending approvals 再查 pending questions。[E: packages/host/apiproxy/src/api-proxy.ts:3696] 命中则 `accepted: true`；未知 id → `not-pending`；形状不对 → `bad-response`。handler 在 unary 表之外单独分发。[E: packages/host/apiproxy/src/fetch/handler.ts:296]

## 设计动机

- **传输无关的 BFF，而不是「再写一个 HTTP 框架」。** 合同层零 Node 依赖，浏览器与 host 共享同一份 `ApiProxy` / `RpcMethodMap`。换 carrier（in-process SSE、测试里的 `InProcessApiClient(toFetchHandler(api))`、Web 的 `/api` + WS）不必改业务方法。
- **HTTP 状态与业务结果切开。** carrier 故障（路径、媒体类型、JSON、impl crash）用 404/415/400/500；会话不存在、preset 未知、模型不可用永远是 200 + `RpcResult` 的 error 枝。client 可以用一份 schema 吃所有业务失败。
- **多会话 GUI 不能把 agent 面钉在进程根上。** web overlay 把 base 的模型可见 tool 行 `disabled: true`，改由每个 `session.create` 的 unpublished `setup` join 一份 preset。Gateway 仍从 host 解析 `jobs` / `skill` / `workspaceRegistry` 这类跨会话单例。
- **preset 先决议、后 mount。** header 是创建事实；setup 失败必须整次回滚，避免「host 空工具集」被 publish 后第一轮 turn 用错工具。
- **冷路径只信 log。** blank 窗口允许换 preset；`agent-preset/selected` 入 log 之后，resume / fork / `agentFor` 一律 `resolveSessionPreset`。这是 `model-visible ⟺ logged` 在 host BFF 上的落点。
- **Typert 与 ApiProxy 共用 `/api` 前缀、分两套合同。** plugin-inventory 这类 Service Remote 走 `namespace/method` + `typertGateway`；会话/workspace BFF 走点分 `RpcMethodMap`。两包不要画成一个 gateway。

## Gotcha

- yml `id: api-gateway` 加载的是 `@deepseek-ai/dsh-host-apiproxy`。`@deepseek-ai/dsh-api-gateway` 是 base 里的 `typert-gateway`，提供 `typertGateway`，**不是** `ctx.apiProxy`。[E: packages/bundle/web-app/cordis.patch.yml:100] [E: packages/api/gateway/package.json:2]
- `toFetchHandler` **不是** webserver 路由。缺 `client-connection` 时本服务可以存在，但浏览器打不到它。
- Web 的 mux/host 是 WebSocket；直接 GET `/api/events.mux` 在 connection 上是 426。不要把 handler 里的 SSE 当成 GUI 的物理通道。
- `api/jobs.ts` 存在只说明有 `JobView`。`RpcMethodMap` 没有 `job.*`。后台任务靠 `session/jobs` 帧。
- `respond` 在 `ApiProxy` 根上，不在 map，也没有 `UNARY_ROUTES` 行。
- workspace 附着失败时会话已经 publish：回 `workspace-attach-failed`，重试同一 `sessionId` 只补附着。
- `static inject` 含 `directoryPicker`。`host.pickDirectory` 要求 `capability.kind === 'native'`；`listDirectory` / `createDirectory` 要求 `'browse'`；种类不对是 `directory-picker-unavailable`，不是缺服务。[E: packages/host/apiproxy/src/api-proxy.ts:2943]
- 无 `ctx.agentPresets` 时每个会话共享 host 组合（headless 默认）。此时 create 若仍点名 preset，adopt 路径会 `agent-preset-conflict`（「records no agent preset」）。
- `blank` 的定义是 log 里还没有 `turn/start`。`/plan`、command 生命周期、改标题都不清 blank，所以还能 `agentPreset.select`。[E: packages/host/apiproxy/src/api-proxy.ts:508] [E: packages/host/apiproxy/tests/api-proxy-blank.spec.ts:83]
- 本包不实现 `--host` / bind。`WebServer.Config.host` 仍承认 `'0.0.0.0'`；旗标拒绝在 `web-startup`。一条替换整行 `webserver.config` 的 overlay 仍可能绑 all-interfaces。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.apiProxy` | `ApiProxy` + `RpcMethodMap`（`packages/host/apiproxy/src/api/`，浏览器可 import）；服务名 `'apiProxy'` | **web-app** 行 `id: api-gateway` `name: '@deepseek-ai/dsh-host-apiproxy'` → `ApiProxyService`。**base：无此行。headless：无此行。** | `client-connection` 的 `/api` fallback `toFetchHandler`；`AbstractApiClient` / `InProcessApiClient`。无 Provider 则 connection 对 unary 回 404 |
| `ctx.typertGateway` | `@deepseek-ai/dsh-api-gateway` 的 `TypertGateway`（Remote `namespace/method`） | **base** 行 `id: typert-gateway`；web / headless 叠 base 后都带着。**不是** `ctx.apiProxy` | `connection.rpc.intercept('/api', claimsEndpoint, …)`。plugin-inventory 等 Remote 走这里 |
| `ctx.agentPresets` | `AgentPresets` / `resolve` / `mount` / `resolveSessionPreset` | **web-app** 第二段 insert `id: agent-presets` `default: standard`。**base / headless：无此行** | `composeAgent`：有则 `resolve` + unpublished `setup` 里 `mount`；无则只 `installSelection` |
| `ctx.webServer` | `WebServer` / `WebRoute` | **web-app** `id: webserver`（`inject: [webStartup]`，缺省 `127.0.0.1:3080`）。**base / headless：无** | `client-connection` `register` `/api` 与 mux/host upgrade。apiproxy **不** inject `webServer` |
| `ctx.directoryPicker` | discriminated capability（`native.pick` vs `browse.list/createDirectory`） | **web-app** `id: directory-picker` = auto。**base / headless：无** | `host.pickDirectory` / `listDirectory` / `createDirectory`。loopback 特权钉在 connection |
| `ctx.agentDefaultModel` | 进程级默认模型选择 | **base** 挂的 `agent-default-model`（web / headless 继承） | `ApiProxyService` 把 `currentSelection` / `saveSelection` 灌进 `ApiProxyDefaults`；blank 会话读它 |

换掉 web-app 的 `api-gateway` 行：浏览器 `/api/session.*` 404，Typert Remote（若 base 仍在）还能 intercept 自己的 endpoint。删掉 `agent-presets` 行：`composeAgent` 退回 host 全局工具集，create 不再往 header 写 preset。Definition（方法名与四象限信封）不变。

## Sources

- packages/host/apiproxy/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/api/index.ts
- packages/host/apiproxy/src/api/rpc.ts
- packages/host/apiproxy/src/api/rpc-map.ts
- packages/host/apiproxy/src/api/jobs.ts
- packages/host/apiproxy/src/api/events.ts
- packages/host/apiproxy/src/fetch/handler.ts
- packages/host/apiproxy/src/fetch/client.ts
- packages/host/apiproxy/package.json
- packages/host/apiproxy/tests/fetch-carrier.spec.ts
- packages/host/apiproxy/tests/client-handler.spec.ts
- packages/host/apiproxy/tests/api-proxy-agent-preset.spec.ts
- packages/host/apiproxy/tests/api-proxy-workspace.spec.ts
- packages/host/apiproxy/tests/api-proxy-blank.spec.ts
- packages/api/gateway/src/index.ts
- packages/api/gateway/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/session.ts
- packages/client/connection/src/index.ts
- packages/client/connection/src/api-path.ts
- packages/client/connection/src/rpc-host.ts
- packages/core/agent-loop/src/index.ts
- packages/core/agent/src/index.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一次 `session.prompt` 的端到端走读。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面：入口 alias、旗标、`--host 0.0.0.0` 拒在 `webStartup` 之前。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` 真树：`api-gateway` insert、tool 行 disable、`agent-presets`。
- [`subsys.host.webserver`](webserver.md) — `node:http` listen 与 route-registration carrier；本包不登记路由。
- [`subsys.client.connection`](../client/connection.md) — `/api` HTTP + mux/host WebSocket；信任篱笆与 privileged 名单。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — roster、`mount`、`resolveSessionPreset`、`leakedServices`。
- [`subsys.integration.api-gateway`](../integration/api-gateway.md) — `typertGateway` Remote 分发；与 `ctx.apiProxy` 分缝。
