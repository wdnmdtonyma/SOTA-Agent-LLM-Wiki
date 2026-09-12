---
id: subsys.integration.api-gateway
title: API gateway
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/api/gateway/src/index.ts
  - packages/api/gateway/src/types.ts
  - packages/api/gateway/src/stream-protocol.ts
  - packages/api/gateway/src/client/index.ts
  - packages/api/gateway/package.json
  - packages/api/gateway/tests/gateway.host.spec.ts
  - packages/api/remotes/src/index.ts
  - packages/api/remotes/src/remote-events.ts
  - packages/api/remotes/src/client/index.ts
  - packages/api/remotes/package.json
  - packages/api/session-controller/src/index.ts
  - packages/api/session-controller/src/agent.ts
  - packages/api/session-controller/package.json
  - packages/api/session-controller/tests/agent.host.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/typert/protocol/src/remote-error.ts
  - packages/typert/registry/src/service.ts
  - vendor/cordis/src/events.ts
symbols:
  - TypertGateway
  - TypertGatewayError
  - TypertGatewayService
  - API_REMOTE_FORWARDED_EVENTS
  - ApiSessionAgentController
related:
  - spine.overview
  - spine.capability-seams
  - subsys.integration.typert
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.host.apiproxy
  - subsys.core.agent
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-api-gateway` 是 Typert Remote 的 **进程内 dispatcher**（`ctx.typertGateway.invoke` / `stream`），并可选地挂 Connection `/api` 拦截与 WebSocket mux。`@deepseek-ai/dsh-api-remotes` 是 **BFF 装配**：Host 把 allowlist 事件源注册进 Gateway；Client 把选定 generated Remote `$mount` 到 `ctx.remote`。Agent / Session lookup 不在 remotes，而在 `@deepseek-ai/dsh-api-session-controller` 的 `ApiSessionAgentController`。已删除的 `packages/host/apiproxy` 不是本页 source。

## 能回答的问题

- `dsh-base` 的 `id: typert-gateway` 和 `dsh-web-app` 的 `id: api-remotes` 分别装的是哪个包？现在还有没有 yml 行 `id: api-gateway`？
- `TypertGateway.invoke` 怎样选 strict descriptor / SRC fallback，lookup 失败何时仍是 `RemoteError`、何时变成 `TypertGatewayError`？
- 谁调用 `typert.lookups.configure('agent'|'session')`？remotes 的 host `apply` 做什么？
- Gateway 怎样（可选地）挂上 `connection.rpc.intercept('/api', …)` 和 `/api/remote.mux`？它是否拥有 HTTP 路由表？
- subagent 会话打到 generic Session lookup 会得到什么 `code`？

## 职责边界

本页拥有两包，并对照第三包的 lookup 政策（权威细节在 [`subsys.host.apiproxy`](../host/apiproxy.md) / session-controller）：

- `@deepseek-ai/dsh-api-gateway`：Host `TypertGatewayService` 实现 `TypertGateway`，服务键 `typertGateway`，`static inject = ['typert']`，default export 就是这个 Service 类。[E: packages/api/gateway/package.json:2] [E: packages/api/gateway/src/index.ts:169] [E: packages/api/gateway/src/index.ts:170] [E: packages/api/gateway/src/index.ts:193] [E: packages/api/gateway/src/index.ts:1204] 它自己不 `webServer.register` 静态文件：有 `connection` 时 `rpc.intercept('/api', …)`；同时有 `connection` 与 `webServer` 时 `registerUpgrade` 挂 `REMOTE_STREAM_MUX_PATH`。[E: packages/api/gateway/src/index.ts:199] [E: packages/api/gateway/src/index.ts:205] [E: packages/api/gateway/src/index.ts:223]
- `@deepseek-ai/dsh-api-remotes`：Host `inject = ['typertGateway']`，`apply` 把 `registerRemoteEvents(remoteEventSource, { home: homedir() })` 做成 effect。[E: packages/api/remotes/package.json:2] [E: packages/api/remotes/src/index.ts:36] [E: packages/api/remotes/src/index.ts:39] [E: packages/api/remotes/src/index.ts:41] 不再导出 `createApiRemoteAgentResolver`（该文件已删除）。

**组合真树。** `dsh-base` 挂 `id: typert-gateway` / `name: '@deepseek-ai/dsh-api-gateway'`，并且 `dependencies` 含该包。[E: packages/bundle/base/cordis.patch.yml:45] [E: packages/bundle/base/cordis.patch.yml:46] [E: packages/bundle/base/package.json:64] 叠 `dsh-base` 的 shipped profile（`web` / `headless` / `sdk` / `acp`）因此都有 dispatcher；`sdk-minimal` 不叠 base，本页不声称它装了 gateway。`dsh-web-app` 挂 `id: api-remotes` / `name: '@deepseek-ai/dsh-api-remotes'`，以及 `id: session-controller`。[E: packages/bundle/web-app/cordis.patch.yml:188] [E: packages/bundle/web-app/cordis.patch.yml:188] [E: packages/bundle/web-app/cordis.patch.yml:101] [E: packages/bundle/web-app/package.json:52]

**同名陷阱已退役。** 当前 `dsh-web-app` **没有** `id: api-gateway` 行；旧 `@deepseek-ai/dsh-host-apiproxy` 包已删除。浏览器 HTTP 入口是 `dsh-client-connection` + `dsh-host-webserver` + 三个 `packages/api/*-controller`（见 [`subsys.host.apiproxy`](../host/apiproxy.md)）。

本页**不**拥有：

- Typert 类型图、`ctx.typert` registry / generator / loader — [`subsys.integration.typert`](typert.md)（`subsys.integration.typert`）。Gateway 只 **读** `local.get` / `hasSeen` / lookups / host contexts。
- `ctx.agents.resume` 合同与 Agent 注册表 — [`subsys.core.agent`](../core/agent.md)（`subsys.core.agent`）。session-controller 是 Consumer：cold identity 调 `resume`。
- Connection 的 Fetch / NDJSON / correlation — `dsh-client-connection`。Gateway 只在 `connection` 出现时 `rpc.intercept`。
- shipped agent preset 行。`typertGateway` 是 **host 面** 单例，不进 `agent.cordis.yml`，没有 `isolate` remount。宿主入口包括 `dsh --profile web` 以及 `dsh --profile headless|sdk|sdk-minimal|acp`；本仓没有 shipped TUI。

**没有 waterfall listener 挂在两包的业务事件图上。** remotes 的 `ctx.on` 是 **转发** allowlist 事件（含 `mode: 'waterfall'` 的 approval / user-questions），不是往 `Events.waterfall` 自己注册一层。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:242] remotes 在 `mode === 'waterfall'` 时若没有 carrier subject 会 `return next()`。[E: packages/api/remotes/src/index.ts:62]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/api/gateway/src/index.ts` | Host dispatcher：`TypertGatewayService` / `TypertGatewayError` / `invoke` / `stream` / RPC 与 mux |
| `packages/api/gateway/src/types.ts` | `InvokeRemoteRequest`、`TypertGateway`、`TypertGatewayErrorCode`；`ctx.typertGateway` |
| `packages/api/gateway/src/stream-protocol.ts` | `$events` / `$events/result` / `/api/remote.mux` |
| `packages/api/gateway/src/client/index.ts` | Client `apply`：装 `ctx.remote`，经 Connection 发 `/api` |
| `packages/api/remotes/src/index.ts` | Host `apply`：注册 forwarded event source |
| `packages/api/remotes/src/remote-events.ts` | `API_REMOTE_FORWARDED_EVENTS` |
| `packages/api/remotes/src/client/index.ts` | Client `apply`：`$mount` 选定的 generated Remote |
| `packages/api/session-controller/src/agent.ts` | `ApiSessionAgentController`：`lookups.configure('agent'|'session')` + Host Context |
| `packages/api/gateway/tests/gateway.host.spec.ts` | invoke 码、SRC、no-downgrade、`/api` interceptor、lookup 身份保留 |
| `packages/bundle/base/cordis.patch.yml` | 真树：`id: typert-gateway` |
| `packages/bundle/web-app/cordis.patch.yml` | 真树：`id: api-remotes`、`id: session-controller` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `TypertGateway` | `invoke`、`stream`、`wireStream`、`registerRemoteEvents`。不假设 carrier，unary `invoke` **不做** output decode。[E: packages/api/gateway/src/types.ts:123] [E: packages/api/gateway/src/types.ts:144] [E: packages/api/gateway/src/index.ts:298] |
| `InvokeRemoteRequest` | `namespace` + `method` + 恰好匹配 descriptor 的 named `args`；可选 `signal`。[E: packages/api/gateway/src/types.ts:10] [E: packages/api/gateway/src/types.ts:16] |
| `ctx.typertGateway` | Cordis 键，由 `TypertGatewayService` `super(ctx, 'typertGateway')` 提供。[E: packages/api/gateway/src/types.ts:157] [E: packages/api/gateway/src/index.ts:193] |
| `TypertGatewayError` | 派发 / provider / 边界失败。继承 `RemoteError<TypertGatewayErrorCode>`。`code` 全部带 `gateway/` 前缀；`endpoint` 是 `<namespace>/<method>`；可选 `field`。message **不**嵌入敏感边界值。[E: packages/api/gateway/src/index.ts:133] [E: packages/api/gateway/src/index.ts:154] |
| `TypertGatewayErrorCode` | `gateway/ambiguous-endpoint` / `arguments-invalid` / `binding-invalid` / `context-*` / `definition-unavailable` / `input-invalid` / `invocation-unavailable` / `lookup-*` / `method-unavailable` / `provider-mismatch` / `result-invalid` / `service-unavailable` / `signature-invalid`。[E: packages/api/gateway/src/types.ts:103] |
| `RemoteError` | **不是** Gateway 发明的。protocol 类：`isDSHRemoteError` 结构标记；Gateway 用 `remoteErrorOf` 原样交给当前 boundary adapter，不能压成 infrastructure error。[E: packages/typert/protocol/src/remote-error.ts:12] [E: packages/typert/protocol/src/remote-error.ts:40] [E: packages/api/gateway/src/index.ts:791] |
| `ApiSessionAgentError` | session-controller 的 caller-facing 三码：`session/not-found` / `session/agent-busy` / `gateway/internal`。[E: packages/api/session-controller/src/agent.ts:61] lookup 路径上 `resolveAgent` 失败则 `throw found.error`（已是 `RemoteError`）。[E: packages/api/session-controller/src/agent.ts:144] |
| `API_REMOTE_FORWARDED_EVENTS` | Host 事件 allowlist，每项 `{ event, mode: 'emit' \| 'waterfall' }`。含 `agent-preset/selected`、`approval/request`（waterfall）、五条 `api-session/*`、`commands/change`、`credentials/reference-updated`、六条 `cordis/*`、`llm/adapters-updated`、`settings/document-updated`、`user-questions/request`（waterfall）。无投影、无改名。Host 转发循环 **就在 remotes `apply`**。[E: packages/api/remotes/src/remote-events.ts:16] [E: packages/api/remotes/src/index.ts:50] |

endpoint 字符串恒为 `` `${namespace}/${method}` ``。[E: packages/api/gateway/src/index.ts:1012] 内部流名 `$events` / `$events/result` 与 mux 路径 `/api/remote.mux` 在 stream-protocol。[E: packages/api/gateway/src/stream-protocol.ts:6] [E: packages/api/gateway/src/stream-protocol.ts:9] [E: packages/api/gateway/src/stream-protocol.ts:12]

## 控制流

1. Loader 加载 `@deepseek-ai/dsh-api-gateway` 的 **default** `TypertGatewayService`（不是 named `apply`）。`inject` 等到 `typert` 之后构造，提供 `ctx.typertGateway`。[E: packages/api/gateway/src/index.ts:170] [E: packages/api/gateway/src/index.ts:193] [E: packages/api/gateway/src/index.ts:1204]

2. 构造期再 `ctx.inject(['connection'], …)`：有 Connection 才 `rpc.intercept('/api', claimsEndpoint, dispatchRpc)`（当前调用 **没有** `authority` 参数）。[E: packages/api/gateway/src/index.ts:198] [E: packages/api/gateway/src/index.ts:199] 测试钉死 channel `/api`，fiber dispose 后 handler 卸掉。[E: packages/api/gateway/tests/gateway.host.spec.ts:983] [E: packages/api/gateway/tests/gateway.host.spec.ts:1065] 没有 Connection 时 Gateway 仍可被同进程直接 `invoke`。另 `ctx.inject(['connection', 'webServer'], …)` 注册 WebSocket upgrade。[E: packages/api/gateway/src/index.ts:205] [E: packages/api/gateway/src/index.ts:213]

3. `claimsEndpoint@packages/api/gateway/src/index.ts`：`$events/result` 始终认领；否则只认恰好两段且非空的 `namespace/method`。`typert.local.get(endpoint)` 或 `hasSeen(endpoint)` 即认领；否则用缓存的 SRC claims（扫 `ctx.reflect.props` 上带 `typertRemote` 的 live Service）。[E: packages/api/gateway/src/index.ts:266] [E: packages/api/gateway/src/index.ts:270] `internal/service` 把 `srcClaims` 清掉，下次重扫。[E: packages/api/gateway/src/index.ts:195]

4. 进程内 unary 入口是 `TypertGatewayService.invoke@packages/api/gateway/src/index.ts`：`prepareInvocation` → 若 `descriptor.mode === 'stream'` 抛 `gateway/signature-invalid` → `Reflect.apply`。[E: packages/api/gateway/src/index.ts:298] [E: packages/api/gateway/src/index.ts:300] [E: packages/api/gateway/src/index.ts:309] `prepareInvocation`：拼 endpoint → `resolveDescriptor` → `assertExactArguments` → `resolveReceiverContext` → `ctx.get(descriptor.service)` → `validateBinding` → 逐参 `resolveParameter` → 若 descriptor 声明 cancellation 则把 `request.signal`（缺省用永不死的 `NEVER_ABORTED_SIGNAL`）接到末位。[E: packages/api/gateway/src/index.ts:598] [E: packages/api/gateway/src/index.ts:613]

5. `resolveDescriptor`：优先 `ctx.typert.local.get(endpoint)` 的 **strict** 生成描述。若 `get` 已空但 `hasSeen` 仍为 true，抛 `gateway/definition-unavailable`——**禁止**掉回 SRC。registry 在 `commit` 时把 endpoint 写入 `history`，`withdraw` 只删 live entry，不删 history。[E: packages/api/gateway/src/index.ts:627] [E: packages/api/gateway/src/index.ts:629] [E: packages/api/gateway/src/index.ts:631] [E: packages/typert/registry/src/service.ts:143] [E: packages/typert/registry/src/service.ts:169] 测试：卸掉 strict 定义后再 invoke 同 endpoint，码是 `gateway/definition-unavailable`。[E: packages/api/gateway/tests/gateway.host.spec.ts:653] [E: packages/api/gateway/tests/gateway.host.spec.ts:657]

6. 从未出现过的 endpoint 才走 `resolveSrcDescriptor`：扫 live Service 的 `@Remote` marker。0 个候选 → `gateway/invocation-unavailable`；多于 1 个 → `gateway/ambiguous-endpoint`（message 列出 service key，不静默选一个）。[E: packages/api/gateway/src/index.ts:654] [E: packages/api/gateway/src/index.ts:657] [E: packages/api/gateway/src/index.ts:661] 两份 `namespace: 'shared'` 的 fixture 得到 `firstShared, secondShared`。[E: packages/api/gateway/tests/gateway.host.spec.ts:704]

7. `assertExactArguments` 要求 `args` 是 plain object，字段集合等于 descriptor 的 wire 集（context invocation 还要加上 identity wire）。lookup id **不可省略**；SRC 的 json 参数以及 `acceptsUndefined` 的 strict json 参数可以缺席。[E: packages/api/gateway/src/index.ts:1107] [E: packages/api/gateway/src/index.ts:1123] 多字段 / 少字段都是 `gateway/arguments-invalid`，且 **不会**进业务方法。[E: packages/api/gateway/tests/gateway.host.spec.ts:746]

8. `invocation.kind === 'direct'` 时 receiver Context 就是 Gateway 自己的 `this.ctx`。`kind === 'context'` 则 `typert.contexts.getHost` → decode identity → `provider.resolve`。resolve 抛出的 `RemoteError`（`remoteErrorOf` 命中）**原样再抛**；其它 throw 变成 `gateway/context-failed`；`undefined` 变成 `gateway/context-not-found`。[E: packages/api/gateway/src/index.ts:767] [E: packages/api/gateway/src/index.ts:791] [E: packages/api/gateway/src/index.ts:792] [E: packages/api/gateway/src/index.ts:800] 测试：policy rejection 的 `rejects.toBe(rejection)` 是同一实例。[E: packages/api/gateway/tests/gateway.host.spec.ts:578] [E: packages/api/gateway/tests/gateway.host.spec.ts:582]

9. `resolveParameter`：缺席的 json 字段给 `undefined`；在场的值先 `decode`。`source === 'lookup'` 再 `typert.lookups.get(key).resolve`。同样：`RemoteError` 原样穿过；其它 throw → `gateway/lookup-failed`；`undefined` → `gateway/lookup-not-found`；provider 不在 → `gateway/lookup-unavailable`；wire / typeSymbol 对不上 → `gateway/provider-mismatch`。[E: packages/api/gateway/src/index.ts:819] [E: packages/api/gateway/src/index.ts:854] [E: packages/api/gateway/src/index.ts:855] [E: packages/api/gateway/src/index.ts:863] [E: packages/api/gateway/src/index.ts:834]

10. 业务方法一旦开始执行，普通 throw **保留身份**（`throw error`），不会包成 `TypertGatewayError`。[E: packages/api/gateway/src/index.ts:312] 若此时 `request.signal.aborted === true`，改抛 `RemoteError<'gateway/cancelled'>`（carrier 取消赢过业务失败）。[E: packages/api/gateway/src/index.ts:311] [E: packages/api/gateway/src/index.ts:989]

11. unary `invoke` **直接返回** `Reflect.apply` 的值，不做 strict result decode。stream 方法必须走 `stream()`；非 iterable 是 `gateway/result-invalid`。[E: packages/api/gateway/src/index.ts:309] [E: packages/api/gateway/src/index.ts:321] [E: packages/api/gateway/src/index.ts:338]

12. Connection 路径走 `invokeRpc`：endpoint 必须两段；payload 必须是 **恰好一个** plain-object 字段 `args`。然后调同一个 `invoke`。[E: packages/api/gateway/src/index.ts:936] [E: packages/api/gateway/src/index.ts:942] [E: packages/api/gateway/src/index.ts:587] `rpcFailure`：`remoteErrorOf` 命中则 `{ code: remote.code, message, details }` 原样上 wire（含 `TypertGatewayError` 与 `session/agent-busy`）；否则 `{ code: 'gateway/internal', message }`。[E: packages/api/gateway/src/index.ts:993] [E: packages/api/gateway/src/index.ts:996] [E: packages/api/gateway/src/index.ts:1001] 测试：lookup 抛出的 `{ code: 'session/agent-busy', … }` 原样出现在 RPC `error` 上。[E: packages/api/gateway/tests/gateway.host.spec.ts:1129] [E: packages/api/gateway/tests/gateway.host.spec.ts:1142] 已 abort 的业务失败变成 `gateway/cancelled`。[E: packages/api/gateway/tests/gateway.host.spec.ts:1058]

13. **Agent / Session lookup 由 session-controller 配置，不是 remotes。** `SessionController` 构造时 `new ApiSessionAgentController(ctx)`。[E: packages/api/session-controller/src/index.ts:120] [E: packages/api/session-controller/src/index.ts:122] `ApiSessionAgentController` 构造函数直接 `lookups.configure('agent'| 'session')` 与 `contexts.configureHost('agent', …)`。[E: packages/api/session-controller/src/agent.ts:143] [E: packages/api/session-controller/src/agent.ts:148] [E: packages/api/session-controller/src/agent.ts:153] registry 侧 `configure` / `configureHost` 是 `ctx.effect`。[E: packages/typert/registry/src/service.ts:278] [E: packages/typert/registry/src/service.ts:390]

14. resolver 内部：live `ctx.agents.get` 命中则复用（先过 subagent fence）；否则看已 attach 的 session；再否则对每个 `sessionId` 用 `Map` 去重一次 cold resume（`finally` 删掉 in-flight Promise）。[E: packages/api/session-controller/src/agent.ts:183] [E: packages/api/session-controller/src/agent.ts:184] [E: packages/api/session-controller/src/agent.ts:189] [E: packages/api/session-controller/src/agent.ts:191] inspect 后没有 `cwd` → `ApiSessionNotFound` → `{ code: 'session/not-found' }`。[E: packages/api/session-controller/src/agent.ts:122] [E: packages/api/session-controller/src/agent.ts:199] 测试钉死这条映射。[E: packages/api/session-controller/tests/agent.host.spec.ts:213] [E: packages/api/session-controller/tests/agent.host.spec.ts:213]

15. `hasApiSessionSubagentOwner`：`header.origin === 'subagent'`，或存在 `parentSession` 且 live parent `ctx.agents.isOwnedBy(agent.id, parent)`。[E: packages/api/session-controller/src/agent.ts:84] [E: packages/api/session-controller/src/agent.ts:88] fence 的对外码是 `session/agent-busy`（文案要求走 subagent delivery）。[E: packages/api/session-controller/src/agent.ts:97] [E: packages/api/session-controller/src/agent.ts:98] lookup 配置把 `found.error` 直接 throw。[E: packages/api/session-controller/src/agent.ts:144] 测试 `error: { code: 'session/agent-busy' }`。[E: packages/api/session-controller/tests/agent.host.spec.ts:201] [E: packages/api/session-controller/tests/agent.host.spec.ts:202]

16. remotes Host `apply` **只**注册事件源，不配 lookup。[E: packages/api/remotes/src/index.ts:39] `emit` 模式 `ctx.on` 后 `queue.push`；`waterfall` 模式把 Host listener 桥成 `TypertRemoteEventInvocation`，Gateway 再经 `$events` 流发给 Client。[E: packages/api/remotes/src/index.ts:52] [E: packages/api/remotes/src/index.ts:67] 第二份 `registerRemoteEvents` 抛错。[E: packages/api/gateway/src/index.ts:243]

17. Client 半边（`dsh web` 浏览器树，不进 headless）：gateway client `inject = ['typert', 'connection']`，`apply` 装 `ClientRemoteService`（`ctx.remote`）。[E: packages/api/gateway/src/client/index.ts:133] [E: packages/api/gateway/src/client/index.ts:139] remotes client `inject = ['remote']`，`apply` 按序 `$mount` agent-presets / commands / settings-controller / goals / llm / dynamic / plugin-inventory / message-feedback / session-references / subagents / session / workspace。[E: packages/api/remotes/src/client/index.ts:143] [E: packages/api/remotes/src/client/index.ts:151] remotes 的 `dsh.client.inject` 声明依赖 `@deepseek-ai/dsh-api-gateway`。[E: packages/api/remotes/package.json:38] 客户端 unary 经 Connection RPC 回到步骤 12；本页不写 carrier 帧格式。

## 设计动机

Gateway 把「选哪个 live 方法、参数从哪来、边界是否 JSON-safe」留在进程内，把「怎么把 `{ ok, value | error }` 送过网」留给 Connection。这样 headless / 测试 / 第二种 carrier 都能直接 `invoke`，不必假装自己是 HTTP。流方法另走 Gateway 拥有的 WebSocket mux。

lookup 政策失败走 `RemoteError`（`session/agent-busy` / `session/not-found`），是为了让 **adapter 拥有的码**穿过 dispatcher 到达 RPC，而不是被压成一句 `gateway/internal`。基础设施失败（provider 消失、schema 不过、SRC 签名无法解析）才用 `TypertGatewayError`（本身也是 `RemoteError`，RPC 上保留 `gateway/*` code）。

strict 定义一旦被 registry 见过，就不能在撤回后掉回 SRC：SRC 靠扫 prototype 参数名，精度低于生成描述。`hasSeen` 是这条单向门。

remotes 故意不配 lookup：Host 组合里谁负责 resume / preset setup，由 **调用 `lookups.configure` 的包**决定。web 树上那是 session-controller（它知道怎样从 session query 重建 Agent）。只 overlay `id: api-remotes` 而没有 session-controller，Typert `agent` / `session` lookup 不会出现。

subagent 身份被 fence 成 `session/agent-busy` 而不是 `session/not-found`，避免 generic Remote 入口把孩子会话当成可 resume 的根会话。

## Gotcha

- **`id: typert-gateway` 才是本包。** `dsh-base` 用它装 `@deepseek-ai/dsh-api-gateway`。不要再按 yml `id: api-gateway` 搜本包——那一行已随 apiproxy 删除。
- **装上 remotes ≠ 配好 lookup。** remotes host `apply` 只注册事件源。必须有人 `lookups.configure`。shipped web 树里那个人是 `dsh-api-session-controller`。
- **`invoke` 与 RPC envelope 的失败形状。** 进程内：`RemoteError` / 业务 Error 保持类身份；派发问题是 `TypertGatewayError`（也是 `RemoteError`）。RPC：凡 `remoteErrorOf` 命中的（含 `TypertGatewayError`）都带自己的 `code`；非 RemoteError 才是 `gateway/internal`。
- **见过的 strict endpoint 永不 SRC。** 生成描述 unload 之后再打同一 `namespace/method`，得到 `gateway/definition-unavailable`。
- **SRC 多 Service 同 endpoint 会 fail-loud。** 两个 `bindTypertRemote(…, { namespace: 'shared' })` 导出同名方法 → `gateway/ambiguous-endpoint`。
- **Gateway 不拥有通用 HTTP 路由表。** 它只 `intercept` Connection 已经挂上的共享 channel `/api`，并占用一个 upgrade 路径 `/api/remote.mux`。没有 `connection` 时不会去碰 HTTP。
- **client `apply` 不是 Host dispatcher。** gateway client 提供 `ctx.remote`；remotes client 往上 `$mount`。不要把 `packages/api/gateway/src/client/index.ts` 写成 `ctx.typertGateway`。
- **错误码带 `gateway/` 与 `session/` 前缀。** 旧 wiki 的裸 `agent-busy` / `definition-unavailable` 已过时。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-typert-protocol` + `@deepseek-ai/dsh-typert-registry` | `ctx.typert`（`local` / `lookups` / `contexts`）。**host**：`dsh-base` `id: typert`、`id: typert-loader`。本页不占这个键 |
| **Provider（本页 · dispatch）** | `@deepseek-ai/dsh-api-gateway` 的 `TypertGatewayService` | `ctx.typertGateway`。`inject = ['typert']`。**host**：`dsh-base` `id: typert-gateway`。**不在** shipped preset |
| **Provider（lookup 政策）** | `@deepseek-ai/dsh-api-session-controller` 的 `ApiSessionAgentController` | `typert.lookups.configure('agent'\|'session')` + `contexts.configureHost('agent')`。**host**：`dsh-web-app` `id: session-controller` |
| **Provider（本页 · 事件源）** | `@deepseek-ai/dsh-api-remotes` host `apply` | `typertGateway.registerRemoteEvents`。**host**：`dsh-web-app` `id: api-remotes` |
| **Consumer（同进程 / RPC 适配）** | 本包 `invoke` / `invokeRpc` / `stream`；可选 `connection.rpc.intercept('/api')` + `webServer.registerUpgrade` | Connection / webServer 出现才挂 |
| **Consumer（Host HTTP 控制器，对照）** | 三个 `packages/api/*-controller` + `dsh-host-webserver` | 见 [`subsys.host.apiproxy`](../host/apiproxy.md)。路由表不在本页 |
| **Consumer（浏览器 Remote）** | remotes client `apply` | `inject = ['remote']`；`$mount` 选定 namespace。依赖 gateway client 先提供 `ctx.remote` |

换掉 `dsh-api-gateway` = 换 dispatcher，lookup 政策可以留在 session-controller。只 overlay remotes、不装 session-controller = Typert `agent` / `session` 查找键不存在，Gateway 会在 lookup 步得到 `gateway/lookup-unavailable`。

## Sources

- packages/api/gateway/src/index.ts
- packages/api/gateway/src/types.ts
- packages/api/gateway/src/stream-protocol.ts
- packages/api/gateway/src/client/index.ts
- packages/api/gateway/package.json
- packages/api/gateway/tests/gateway.host.spec.ts
- packages/api/remotes/src/index.ts
- packages/api/remotes/src/remote-events.ts
- packages/api/remotes/src/client/index.ts
- packages/api/remotes/package.json
- packages/api/session-controller/src/index.ts
- packages/api/session-controller/src/agent.ts
- packages/api/session-controller/package.json
- packages/api/session-controller/tests/agent.host.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/typert/protocol/src/remote-error.ts
- packages/typert/registry/src/service.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角。
- [subsys.integration.typert](typert.md)（`subsys.integration.typert`）：`ctx.typert` 类型图、registry、`hasSeen` / `configure`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`id: typert-gateway` 进叠 base 的 profile 第一层。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）：`id: api-remotes` 与 `id: session-controller`。
- [subsys.host.apiproxy](../host/apiproxy.md)（`subsys.host.apiproxy`）：Host HTTP API（三个 controller + webserver）；session-controller 配置 lookup。
- [subsys.core.agent](../core/agent.md)（`subsys.core.agent`）：`ctx.agents.get` / `resume` / `isOwnedBy`。
