---
id: subsys.integration.api-gateway
title: API gateway
kind: subsystem
tier: T2
pkg: integration
source:
  - packages/api/gateway/src/index.ts
  - packages/api/gateway/src/types.ts
  - packages/api/gateway/src/client/index.ts
  - packages/api/gateway/package.json
  - packages/api/gateway/tests/gateway.host.spec.ts
  - packages/api/remotes/src/index.ts
  - packages/api/remotes/src/agent-lookup.ts
  - packages/api/remotes/src/remote-events.ts
  - packages/api/remotes/src/client/index.ts
  - packages/api/remotes/package.json
  - packages/api/remotes/tests/agent-lookup.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/typert/protocol/src/index.ts
  - packages/typert/registry/src/service.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - vendor/cordis/src/events.ts
symbols:
  - TypertGateway
  - TypertGatewayError
  - TypertGatewayService
  - apply
  - createApiRemoteAgentResolver
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
updated: 47f943859b
---

> `@deepseek-ai/dsh-api-gateway` 是 Typert Remote 的 **进程内 dispatcher**（`ctx.typertGateway.invoke`）；`@deepseek-ai/dsh-api-remotes` 提供具体 Remote 绑定（Agent / Session lookup 与 Host 事件 allowlist）。两者都不拥有 HTTP 路由表，也不是 `dsh-web-app` 里那行 `id: api-gateway`（那行的 `name` 是 `@deepseek-ai/dsh-host-apiproxy`）。

## 能回答的问题

- `dsh-base` 的 `id: typert-gateway` 和 `dsh-web-app` 的 `id: api-gateway` 分别装的是哪个包？
- `TypertGateway.invoke` 怎样选 strict descriptor / SRC fallback，lookup 失败何时仍是 `TypertLookupFailure`、何时变成 `TypertGatewayError`？
- `dsh-api-remotes` 的 host `apply` 做了什么？谁真正调用 `createApiRemoteAgentResolver` 去 `lookups.configure('agent'|'session')`？
- Gateway 怎样（可选地）挂上 `connection.rpc.intercept('/api', …)`？它是否拥有 transport？
- subagent 会话打到 generic Remote lookup 会得到什么 `code`？

## 职责边界

本页拥有两包：

- `@deepseek-ai/dsh-api-gateway`：Host `TypertGatewayService` 实现 `TypertGateway`，服务键 `typertGateway`，`static inject = ['typert']`，default export 就是这个 Service 类。[E: packages/api/gateway/package.json:2] [E: packages/api/gateway/src/index.ts:90] [E: packages/api/gateway/src/index.ts:91] [E: packages/api/gateway/src/index.ts:100] [E: packages/api/gateway/src/index.ts:685] 它自己不 `webServer.register`：有 `connection` 时只 `rpc.intercept('/api', …)`，correlation 与 envelope 留在 Connection。
- `@deepseek-ai/dsh-api-remotes`：Host 面导出 `createApiRemoteAgentResolver` / 所有权 fence / `API_REMOTE_FORWARDED_EVENTS`；host `apply` 是空函数。[E: packages/api/remotes/package.json:2] [E: packages/api/remotes/src/index.ts:44] [E: packages/api/remotes/src/agent-lookup.ts:121]

**组合真树。** `dsh-base` 挂 `id: typert-gateway` / `name: '@deepseek-ai/dsh-api-gateway'`，并且 `dependencies` 含该包。[E: packages/bundle/base/cordis.patch.yml:36] [E: packages/bundle/base/cordis.patch.yml:37] [E: packages/bundle/base/package.json:62] `dsh-web-app` 另挂 `id: api-remotes` / `name: '@deepseek-ai/dsh-api-remotes'`。[E: packages/bundle/web-app/cordis.patch.yml:165] [E: packages/bundle/web-app/cordis.patch.yml:166] [E: packages/bundle/web-app/package.json:48]

**同名陷阱（整页最容易写错）。** `dsh-web-app` 也有一行 `id: api-gateway`，但 `name` 是 `@deepseek-ai/dsh-host-apiproxy`——那是 **host HTTP / mux 代理**，路由表不在本页。[E: packages/bundle/web-app/cordis.patch.yml:99] [E: packages/bundle/web-app/cordis.patch.yml:100] [E: packages/bundle/web-app/package.json:90] 细节交给 [`subsys.host.apiproxy`](../host/apiproxy.md)（`subsys.host.apiproxy`）。

本页**不**拥有：

- Typert 类型图、`ctx.typert` registry / generator / loader — [`subsys.integration.typert`](typert.md)（`subsys.integration.typert`）。Gateway 只 **读** `local.get` / `hasSeen` / lookups / host contexts。
- `ctx.agents.resume` 合同与 Agent 注册表 — [`subsys.core.agent`](../core/agent.md)（`subsys.core.agent`）。remotes 是 Consumer：cold identity 调 `resume`。
- Connection 的 Fetch / NDJSON / correlation — `dsh-client-connection`。Gateway 只在 `connection` 出现时 `rpc.intercept`。
- shipped preset 行。`typertGateway` 与 remotes lookup 都是 **host 面** 单例，不进 `agent.cordis.yml`，没有 `isolate` remount。默认产品路径仍是 `dsh web` 本地 Web GUI；本仓没有 shipped TUI。

**没有 waterfall。** 两包都不往 `Events.waterfall` 挂 listener。组合失败是 `inject` 等到 `typert`（gateway）或等到 `remote`（remotes 的 client `apply`）。Cordis 全局规则仍是：waterfall 必须调用传入的 `next()` 才会 `cbs.shift()`；不调用就停在本层。[E: vendor/cordis/src/events.ts:238]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/api/gateway/src/index.ts` | Host dispatcher：`TypertGatewayService` / `TypertGatewayError` / `invoke` / RPC 适配 |
| `packages/api/gateway/src/types.ts` | `InvokeRemoteRequest`、`TypertGateway`、`TypertGatewayErrorCode`；`ctx.typertGateway` |
| `packages/api/gateway/src/client/index.ts` | Client `apply`：装 `ctx.remote`，经 Connection 发 `/api` |
| `packages/api/remotes/src/index.ts` | Host 空 `apply`；再导出 resolver 与 allowlist |
| `packages/api/remotes/src/agent-lookup.ts` | `createApiRemoteAgentResolver`：live reuse / cold resume / subagent fence |
| `packages/api/remotes/src/remote-events.ts` | `API_REMOTE_FORWARDED_EVENTS`：可原样转发的 Host 事件名 |
| `packages/api/remotes/src/client/index.ts` | Client `apply`：`$mount` 选定的 generated Remote |
| `packages/api/gateway/tests/gateway.host.spec.ts` | invoke 码、SRC、no-downgrade、`/api` interceptor、lookup 身份保留 |
| `packages/api/remotes/tests/agent-lookup.spec.ts` | session-not-found、resume 去重窗口、`agent-busy`、Host Context |
| `packages/bundle/base/cordis.patch.yml` | 真树：`id: typert-gateway` |
| `packages/bundle/web-app/cordis.patch.yml` | 真树：`id: api-remotes`；以及 **不是本包** 的 `id: api-gateway` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `TypertGateway` | 单方法 `invoke(request): Promise<unknown>`。不假设 carrier，不包 envelope。[E: packages/api/gateway/src/types.ts:39] [E: packages/api/gateway/src/types.ts:46] |
| `InvokeRemoteRequest` | `namespace` + `method` + 恰好匹配 descriptor 的 named `args`；可选 `signal`。[E: packages/api/gateway/src/types.ts:7] |
| `ctx.typertGateway` | Cordis 键，由 `TypertGatewayService` `super(ctx, 'typertGateway')` 提供。[E: packages/api/gateway/src/types.ts:52] [E: packages/api/gateway/src/index.ts:100] |
| `TypertGatewayError` | 派发 / provider / 边界失败。`code` 是稳定枚举；`endpoint` 是 `<namespace>/<method>`；可选 `field`。message **不**嵌入敏感边界值。[E: packages/api/gateway/src/index.ts:44] [E: packages/api/gateway/src/index.ts:66] |
| `TypertGatewayErrorCode` | `ambiguous-endpoint` / `arguments-invalid` / `binding-invalid` / `context-*` / `definition-unavailable` / `input-invalid` / `invocation-unavailable` / `lookup-*` / `method-unavailable` / `provider-mismatch` / `result-invalid` / `service-unavailable` / `signature-invalid`。[E: packages/api/gateway/src/types.ts:19] |
| `TypertLookupFailure` | **不是** Gateway 发明的。protocol 类：`failure` 原样交给当前 boundary adapter。Gateway 必须保留身份，不能压成 infrastructure error。[E: packages/typert/protocol/src/index.ts:25] [E: packages/typert/protocol/src/index.ts:27] |
| `ApiRemoteLookupError` | remotes 的 caller-facing 三码：`agent-busy` / `session-not-found` / `internal`。resolver 在 Typert 路径上把它包进 `TypertLookupFailure`。[E: packages/api/remotes/src/agent-lookup.ts:11] [E: packages/api/remotes/src/agent-lookup.ts:202] |
| `API_REMOTE_FORWARDED_EVENTS` | 11 个 Host cordis 事件名的 allowlist：`agent-preset/selected`、`commands/change`、`credentials/updated`、六条 `cordis/*`（`request-run`、`request-run-resolved`、`dynamic-package`、`dynamic-retract`、`inspect-query`、`inspect-query-resolved`）、`llm/adapters-updated`、`settings/document-updated`。无投影、无改名。转发循环不在本包。[E: packages/api/remotes/src/remote-events.ts:17] [E: packages/api/remotes/src/remote-events.ts:26] [E: packages/api/remotes/src/index.ts:41] |

endpoint 字符串恒为 `` `${namespace}/${method}` ``。[E: packages/api/gateway/src/index.ts:492]

## 控制流

1. Loader 加载 `@deepseek-ai/dsh-api-gateway` 的 **default** `TypertGatewayService`（不是 named `apply`）。`inject` 等到 `typert` 之后构造，提供 `ctx.typertGateway`。[E: packages/api/gateway/src/index.ts:91] [E: packages/api/gateway/src/index.ts:100] [E: packages/api/gateway/src/index.ts:685]

2. 构造期再 `ctx.inject(['connection'], …)`：有 Connection 才 `rpc.intercept('/api', claimsEndpoint, dispatchRpc, { authority: 'trusted-host' })`。[E: packages/api/gateway/src/index.ts:104] [E: packages/api/gateway/src/index.ts:106] [E: packages/api/gateway/src/index.ts:109] 测试钉死 channel 与 authority，fiber dispose 后 handler 卸掉。[E: packages/api/gateway/tests/gateway.host.spec.ts:964] [E: packages/api/gateway/tests/gateway.host.spec.ts:1046] 没有 Connection 时 Gateway 仍可被同进程直接 `invoke`。

3. `claimsEndpoint@packages/api/gateway/src/index.ts` 只认恰好两段且非空的 `namespace/method`。`typert.local.get(endpoint)` 或 `hasSeen(endpoint)` 即认领；否则用缓存的 SRC claims（扫 `ctx.reflect.props` 上带 `typertRemote` 的 live Service）。[E: packages/api/gateway/src/index.ts:116] [E: packages/api/gateway/src/index.ts:117] `internal/service` 把 `srcClaims` 清掉，下次重扫。[E: packages/api/gateway/src/index.ts:101]

4. 进程内入口是 `TypertGatewayService.invoke@packages/api/gateway/src/index.ts`：拼 endpoint → `resolveDescriptor` → `assertExactArguments` → `resolveReceiverContext` → `ctx.get(descriptor.service)` → `validateBinding` → 逐参 `resolveParameter` → 若 descriptor 声明 cancellation 则把 `request.signal`（缺省用永不死的 `NEVER_ABORTED_SIGNAL`）接到末位 → `Reflect.apply`。[E: packages/api/gateway/src/index.ts:145] [E: packages/api/gateway/src/index.ts:146] [E: packages/api/gateway/src/index.ts:161] [E: packages/api/gateway/src/index.ts:174]

5. `resolveDescriptor`：优先 `ctx.typert.local.get(endpoint)` 的 **strict** 生成描述。若 `get` 已空但 `hasSeen` 仍为 true，抛 `definition-unavailable`——**禁止**掉回 SRC。registry 在 `commit` 时把 endpoint 写入 `history`，`withdraw` 只删 live entry，不删 history。[E: packages/api/gateway/src/index.ts:225] [E: packages/api/gateway/src/index.ts:227] [E: packages/api/gateway/src/index.ts:228] [E: packages/typert/registry/src/service.ts:143] [E: packages/typert/registry/src/service.ts:169] 测试：卸掉 strict 定义后再 invoke 同 endpoint，码是 `definition-unavailable`，不会走 SRC 通过去。[E: packages/api/gateway/tests/gateway.host.spec.ts:631] [E: packages/api/gateway/tests/gateway.host.spec.ts:635]

6. 从未出现过的 endpoint 才走 `resolveSrcDescriptor`：扫 live Service 的 `@Remote` marker。0 个候选 → `invocation-unavailable`；多于 1 个 → `ambiguous-endpoint`（message 列出 service key，不静默选一个）。[E: packages/api/gateway/src/index.ts:252] [E: packages/api/gateway/src/index.ts:255] [E: packages/api/gateway/src/index.ts:256] 两份 `namespace: 'shared'` 的 fixture 得到 `firstShared, secondShared`。[E: packages/api/gateway/tests/gateway.host.spec.ts:677] [E: packages/api/gateway/tests/gateway.host.spec.ts:681]

7. `assertExactArguments` 要求 `args` 是 plain object，字段集合等于 descriptor 的 wire 集（context invocation 还要加上 identity wire）。lookup id **不可省略**；SRC 的 json 参数以及 `acceptsUndefined` 的 strict json 参数可以缺席。[E: packages/api/gateway/src/index.ts:591] [E: packages/api/gateway/src/index.ts:611] 多字段 / 少字段 / 数组 args 都是 `arguments-invalid`，且 **不会**进业务方法。[E: packages/api/gateway/tests/gateway.host.spec.ts:720] [E: packages/api/gateway/tests/gateway.host.spec.ts:735]

8. `invocation.kind === 'direct'` 时 receiver Context 就是 Gateway 自己的 `this.ctx`。`kind === 'context'` 则 `typert.contexts.getHost` → decode identity → `provider.resolve`。resolve 抛出的 `TypertLookupFailure` **原样再抛**；其它 throw 变成 `context-failed`；`undefined` 变成 `context-not-found`。[E: packages/api/gateway/src/index.ts:364] [E: packages/api/gateway/src/index.ts:388] [E: packages/api/gateway/src/index.ts:389] [E: packages/api/gateway/src/index.ts:397] 测试：policy rejection 的 `rejects.toBe(rejection)` 是同一实例。[E: packages/api/gateway/tests/gateway.host.spec.ts:556] [E: packages/api/gateway/tests/gateway.host.spec.ts:560]

9. `resolveParameter`：缺席的 json 字段给 `undefined`；在场的值先 `decode`。`source === 'lookup'` 再 `typert.lookups.get(key).resolve`。同样：`TypertLookupFailure` 原样穿过；其它 throw → `lookup-failed`；`undefined` → `lookup-not-found`；provider 不在 → `lookup-unavailable`；wire / typeSymbol 对不上 → `provider-mismatch`。[E: packages/api/gateway/src/index.ts:416] [E: packages/api/gateway/src/index.ts:451] [E: packages/api/gateway/src/index.ts:452] [E: packages/api/gateway/src/index.ts:459] [E: packages/api/gateway/src/index.ts:460]

10. 业务方法一旦开始执行，普通 throw **保留身份**（`throw error`），不会包成 `TypertGatewayError`。[E: packages/api/gateway/src/index.ts:177] 测试用同一 `Error` 实例 `rejects.toBe(failure)`。[E: packages/api/gateway/tests/gateway.host.spec.ts:940] [E: packages/api/gateway/tests/gateway.host.spec.ts:944] 若此时 `request.signal.aborted === true`，改抛内部 `RemoteInvocationCancelled`（carrier 取消赢过业务失败）。[E: packages/api/gateway/src/index.ts:176]

11. 返回值：SRC / 弱 descriptor（`result.mode !== 'strict'`）允许 `undefined` 直接回去（RPC 上就是缺 `value`）。strict 结果必须过 `decode`，失败是 `result-invalid`。[E: packages/api/gateway/src/index.ts:182] [E: packages/api/gateway/src/index.ts:183]

12. Connection 路径走 `invokeRpc`：endpoint 必须两段；payload 必须是 **恰好一个** plain-object 字段 `args`。然后调同一个 `invoke`。[E: packages/api/gateway/src/index.ts:197] [E: packages/api/gateway/src/index.ts:207] [E: packages/api/gateway/src/index.ts:209] `rpcFailure` 把三种 throw 收成 envelope：`RemoteInvocationCancelled` → `{ code: 'cancelled' }`；`TypertLookupFailure` → **`error.failure` 原样**；其余（含 `TypertGatewayError` 与业务 Error）→ `{ code: 'internal', message }`。[E: packages/api/gateway/src/index.ts:472] [E: packages/api/gateway/src/index.ts:478] [E: packages/api/gateway/src/index.ts:479] 测试：lookup 抛出的 `{ code: 'agent-busy', … }` 原样出现在 RPC `error` 上。[E: packages/api/gateway/tests/gateway.host.spec.ts:1063] [E: packages/api/gateway/tests/gateway.host.spec.ts:1070]

13. **remotes 的 host `apply` 不配置 lookup。** `export function apply(): void {}`。[E: packages/api/remotes/src/index.ts:44] 真正装 Agent / Session 策略的是 `createApiRemoteAgentResolver@packages/api/remotes/src/agent-lookup.ts`。shipped 树上的调用方是 `dsh-host-apiproxy`（web-app 那行 **名字叫 api-gateway 的 apiproxy**），不是 `TypertGatewayService`。[E: packages/host/apiproxy/src/api-proxy.ts:1267] [E: packages/host/apiproxy/src/api-proxy.ts:107]

14. resolver 内部：live `ctx.agents.get` 命中则复用（先过 subagent fence）；否则看已 attach 的 session；再否则对每个 `sessionId` 用 `Map` 去重一次 cold resume（`inspectApiRemoteSession` → 可选 `setup` → `ctx.agents.resume`，`finally` 删掉 in-flight Promise）。[E: packages/api/remotes/src/agent-lookup.ts:128] [E: packages/api/remotes/src/agent-lookup.ts:144] [E: packages/api/remotes/src/agent-lookup.ts:162] [E: packages/api/remotes/src/agent-lookup.ts:169] inspect 后没有 `cwd` → `ApiRemoteSessionNotFound` → `{ code: 'session-not-found' }`。[E: packages/api/remotes/src/agent-lookup.ts:107] [E: packages/api/remotes/src/agent-lookup.ts:177] 测试钉死这条映射。[E: packages/api/remotes/tests/agent-lookup.spec.ts:51] [E: packages/api/remotes/tests/agent-lookup.spec.ts:53]

15. `hasApiRemoteSubagentOwner`：`header.origin === 'subagent'`，或存在 `parentSession` 且 live parent `ctx.agents.isOwnedBy(agent.id, parent)`。[E: packages/api/remotes/src/agent-lookup.ts:67] [E: packages/api/remotes/src/agent-lookup.ts:71] fence 的对外码是 `agent-busy`（文案要求走 subagent delivery）。[E: packages/api/remotes/src/agent-lookup.ts:81] Typert 路径上 `resolveAgent` 把该 error 包成 `new TypertLookupFailure(found.error)`。[E: packages/api/remotes/src/agent-lookup.ts:202] Host Context provider 同样走这条：测试 `rejects.toBeInstanceOf(TypertLookupFailure)` 且 `failure.code === 'agent-busy'`。[E: packages/api/remotes/tests/agent-lookup.spec.ts:150] [E: packages/api/remotes/tests/agent-lookup.spec.ts:151]

16. `ctx.inject(['typert'], …)` 之后：`lookups.configure('agent', resolveAgent)`、`lookups.configure('session', … .session)`、`contexts.configureHost('agent', … .ctx)`。这是 `ctx.effect`，fiber 卸掉即撤 resolver。[E: packages/api/remotes/src/agent-lookup.ts:199] [E: packages/api/remotes/src/agent-lookup.ts:205] [E: packages/api/remotes/src/agent-lookup.ts:206] [E: packages/api/remotes/src/agent-lookup.ts:207] registry 侧 `configure` / `configureHost` 也是 `ctx.effect`。[E: packages/typert/registry/src/service.ts:278] [E: packages/typert/registry/src/service.ts:390]

17. Client 半边（`dsh web` 浏览器树，不进 headless）：gateway client `inject = ['typert', 'connection']`，`apply` 装 `ClientRemoteService`（`ctx.remote`）。[E: packages/api/gateway/src/client/index.ts:66] [E: packages/api/gateway/src/client/index.ts:72] remotes client `inject = ['remote']`，`apply` 按序 `$mount` commands / goals / dynamic / plugin-inventory / message-feedback。[E: packages/api/remotes/src/client/index.ts:98] [E: packages/api/remotes/src/client/index.ts:105] [E: packages/api/remotes/src/client/index.ts:109] remotes 的 `dsh.client.inject` 声明依赖 `@deepseek-ai/dsh-api-gateway`。[E: packages/api/remotes/package.json:39] 客户端方法经 `connection.rpc.call('/api', endpoint, { args }, signal)` 回到步骤 12；本页不写 carrier 帧格式。

18. allowlist 的 **值** 在 remotes；把这些事件推进 mux 的是 apiproxy 的 `ctx.on(name, …)` 展开，不是 Gateway。[E: packages/api/remotes/src/remote-events.ts:17] [E: packages/host/apiproxy/src/api-proxy.ts:3620]

## 设计动机

Gateway 把「选哪个 live 方法、参数从哪来、边界是否 JSON-safe」留在进程内，把「怎么把 `{ ok, value | error }` 送过网」留给 Connection。这样 headless / 测试 / 未来第二种 carrier 都能直接 `invoke`，不必假装自己是 HTTP。

lookup 政策失败走 `TypertLookupFailure`，是为了让 **adapter 拥有的码**（remotes 的 `agent-busy` / `session-not-found`）穿过 dispatcher 到达 RPC，而不是被压成一句 `internal`。基础设施失败（provider 消失、schema 不过、SRC 签名无法解析）才用 `TypertGatewayError`。

strict 定义一旦被 registry 见过，就不能在撤回后掉回 SRC：SRC 靠扫 prototype 参数名，精度低于生成描述。`hasSeen` 是这条单向门。

remotes host `apply` 故意为空：Host 组合里谁负责 resume / preset setup，由 **调用 `createApiRemoteAgentResolver` 的包** 决定。web 树上那是 apiproxy（它知道怎样从 session log 重建 preset）。只 overlay `id: api-remotes` 而没有人调用 resolver，Typert `agent` / `session` lookup 不会出现。

subagent 身份被 fence 成 `agent-busy` 而不是 `session-not-found`，避免 generic Remote / 旧 HTTP 入口把孩子会话当成可 resume 的根会话。

## Gotcha

- **`id: api-gateway` ≠ 本包。** `dsh-base` 用 `id: typert-gateway` 装 `@deepseek-ai/dsh-api-gateway`。`dsh-web-app` 的 `id: api-gateway` 装的是 `@deepseek-ai/dsh-host-apiproxy`。按 yml `id` 搜「API gateway」会搜到错误的包。
- **装上 remotes ≠ 配好 lookup。** host `apply` 是空的。必须有人调用 `createApiRemoteAgentResolver`。shipped web 树里那个人是 apiproxy。
- **`invoke` 与 RPC envelope 的失败形状不同。** 进程内 `invoke`：`TypertLookupFailure` / 业务 Error 保持类身份；派发问题是 `TypertGatewayError`。RPC：只有 lookup policy 与 `cancelled` 保留专用 `code`，`TypertGatewayError` 也会变成 `internal`。
- **见过的 strict endpoint 永不 SRC。** 生成描述 unload 之后再打同一 `namespace/method`，得到 `definition-unavailable`，不是「退回 decorator 扫描」。
- **SRC 多 Service 同 endpoint 会 fail-loud。** 两个 `bindTypertRemote(…, { namespace: 'shared' })` 导出同名方法 → `ambiguous-endpoint`。
- **Gateway 不拥有 `/api` 路由。** 它只 `intercept` Connection 已经挂上的共享 channel。没有 `connection` 服务时不会去碰 HTTP。
- **client `apply` 不是 Host dispatcher。** gateway client 提供 `ctx.remote`；remotes client 往上 `$mount`。不要把 `packages/api/gateway/src/client/index.ts` 写成 `ctx.typertGateway`。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-typert-protocol` + `@deepseek-ai/dsh-typert-registry` | `ctx.typert`（`local` / `lookups` / `contexts`）。**host**：`dsh-base` `id: typert`、`id: typert-loader`。本页不占这个键 |
| **Provider（本页 · dispatch）** | `@deepseek-ai/dsh-api-gateway` 的 `TypertGatewayService` | `ctx.typertGateway`。`inject = ['typert']`。**host**：`dsh-base` `id: typert-gateway`。**不在** shipped preset |
| **Provider（本页 · lookup 政策）** | `@deepseek-ai/dsh-api-remotes` 的 `createApiRemoteAgentResolver` | `typert.lookups.configure('agent'\|'session')` + `contexts.configureHost('agent')`。**不是** remotes host `apply` 装的。**host**：`dsh-web-app` `id: api-remotes` 只把包装进树；真正 `configure` 由 apiproxy 调用 resolver |
| **Consumer（同进程 / RPC 适配）** | 本包 `invoke` / `invokeRpc`；可选 `connection.rpc.intercept('/api')` | Connection 出现才挂。authority `trusted-host` |
| **Consumer（web HTTP BFF，对照）** | `@deepseek-ai/dsh-host-apiproxy` | **host**：`dsh-web-app` `id: api-gateway`（`name` 是 apiproxy）。调用 resolver、转发 `API_REMOTE_FORWARDED_EVENTS`。路由表不在本页 |
| **Consumer（浏览器 Remote）** | remotes client `apply` | `inject = ['remote']`；`$mount` 选定 namespace。依赖 gateway client 先提供 `ctx.remote` |

换掉 `dsh-api-gateway` = 换 dispatcher，lookup 政策可以留在 remotes。只 overlay remotes、不让任何人调用 resolver = Typert `agent` / `session` 查找键不存在，Gateway 会在 lookup 步得到 `lookup-unavailable`。

## Sources

- packages/api/gateway/src/index.ts
- packages/api/gateway/src/types.ts
- packages/api/gateway/src/client/index.ts
- packages/api/gateway/package.json
- packages/api/gateway/tests/gateway.host.spec.ts
- packages/api/remotes/src/index.ts
- packages/api/remotes/src/agent-lookup.ts
- packages/api/remotes/src/remote-events.ts
- packages/api/remotes/src/client/index.ts
- packages/api/remotes/package.json
- packages/api/remotes/tests/agent-lookup.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/typert/protocol/src/index.ts
- packages/typert/registry/src/service.ts
- packages/host/apiproxy/src/api-proxy.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角。
- [subsys.integration.typert](typert.md)（`subsys.integration.typert`）：`ctx.typert` 类型图、registry、`hasSeen` / `configure`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`id: typert-gateway` 进每个 profile 的第一层。
- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md)（`subsys.composition.bundle-web-app`）：`id: api-remotes` 与那行 **不是本包** 的 `id: api-gateway`。
- [subsys.host.apiproxy](../host/apiproxy.md)（`subsys.host.apiproxy`）：host HTTP / mux 代理；调用 `createApiRemoteAgentResolver`。
- [subsys.core.agent](../core/agent.md)（`subsys.core.agent`）：`ctx.agents.get` / `resume` / `isOwnedBy`。
