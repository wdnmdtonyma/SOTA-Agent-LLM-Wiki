---
id: subsys.host.plugin-inventory
title: plugin inventory
kind: subsystem
tier: T2
pkg: host
source:
  - packages/host/plugin-inventory/src/index.ts
  - packages/host/plugin-inventory/src/types.ts
  - packages/host/plugin-inventory/src/invariant.ts
  - packages/host/plugin-inventory/package.json
  - packages/host/plugin-inventory/tests/inventory.spec.ts
  - packages/host/plugin-inventory/tests/invariant.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/typert/protocol/src/index.ts
  - packages/api/gateway/src/index.ts
  - packages/api/remotes/src/index.ts
  - packages/api/remotes/src/client/index.ts
  - packages/client/ui-settings-plugin-inventory/src/client/index.ts
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/fiber.ts
  - vendor/loader/src/config/entry.ts
  - vendor/loader/src/config/tree.ts
symbols:
  - PluginInventoryGateway
  - ctx.pluginInventory
  - PluginInventorySnapshot
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - surface.profiles.web
  - subsys.composition.bundle-web-app
  - subsys.client.modules
  - subsys.integration.api-gateway
  - subsys.host.apiproxy
  - subsys.client.connection
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-host-plugin-inventory` 的 `PluginInventoryGateway` 是 **host 面**只读 Typert Remote：把当前 Cordis Loader 的**非 group**行投影成 `PluginInventorySnapshot`。`@Remote('list')` 每次都直接遍历 `ctx.loader.entries()`，没有第二份 cache；它不注册 HTTP 路由，也不进 `ctx.apiProxy` 的 RPC 表。

## 能回答的问题

- `pluginInventory/list` 是谁 `provide` 的？服务键是什么？有没有 `declare module` 把 `ctx.pluginInventory` 并进 Cordis `Context`？
- 每次 `list()` 读哪里？为什么没有 cache？`entry.options.group` 为什么整行跳过？
- `fiberPhase` 的字符串有哪些？`FiberState.DISPOSED` 和「没有 fiber」各变成什么？
- `enabled` 是不是只看本行 `disabled`？祖先 group 被关掉时这一行会出现吗？
- `dsh-base` / `dsh-headless` 有没有 `id: plugin-inventory`？谁是 trusted client Consumer？
- 这条 Remote 走 `ctx.typertGateway` 还是 `ctx.apiProxy`？和 `cordis-host-runner` 的 `inventory` 是不是同一个方法？

## 职责边界

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`；capability seam 是 Definition / Provider / Consumer。`model-visible ⟺ logged` 管的是会话工具与 log，**不**管这份 inventory：它不是模型可见工具，也不写 session log。默认安装路径是 `dsh web`（本地 Web GUI）；本仓没有 shipped TUI。launcher 在 `provide('webStartup')` **之前**拒绝 `--host 0.0.0.0`，所以默认 composition 不会 listen all-interfaces。 [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/bundle/web-app/src/startup.ts:75]

本包拥有：

- 进程级 Service / Remote：`PluginInventoryGateway extends TypertRemoteService`，`super(ctx, 'pluginInventory')`，`static inject = ['loader']`。 [E: packages/host/plugin-inventory/src/index.ts:43] [E: packages/host/plugin-inventory/src/index.ts:44] [E: packages/host/plugin-inventory/src/index.ts:47]
- 点时刻投影合同：`PluginInventorySnapshot` / `PluginInventoryEntry` / `PluginFiberPhase` / branded `PluginEntryId`。 [E: packages/host/plugin-inventory/src/types.ts:26]
- 空 invariant companion（`install` 是 no-op）：Loader 已经是唯一生命周期真源，companion 只按包名占位。 [E: packages/host/plugin-inventory/src/invariant.ts:15]

本包**不**拥有：

- Loader 树本身、`Entry.disabled` 的祖先折叠、`FiberState` 枚举（`vendor/loader` / `vendor/cordis`）。本包只读 `ctx.loader.entries()`。 [E: packages/host/plugin-inventory/src/index.ts:59]
- HTTP listen / 路由登记（[`subsys.host.webserver`](webserver.md)）。本包不 `register` 任何 path。
- 传输无关 BFF 合同 `ctx.apiProxy` 与 `session.*` RPC（[`subsys.host.apiproxy`](apiproxy.md)）。`pluginInventory/list` **不**在那张 `RpcMethodMap` 里。
- Typert 分发、codec、`/api` intercept 的权威实现（[`subsys.integration.api-gateway`](../integration/api-gateway.md)）。本页只点名 `TypertGatewayService` 如何 **claim** `pluginInventory/list`。
- 浏览器模块图 / `__DSH_BOOT__`（[`subsys.client.modules`](../client/modules.md)）和 `/api` 信任篱笆（[`subsys.client.connection`](../client/connection.md)）。
- Settings 插件清单 UI 的槽位、筛选、文案。Consumer 是 trusted client 的 `ui-settings-plugin-inventory`；本页不写那页 UI。
- 每会话 **agent-preset 面**的 tools / persona / isolate。inventory 是进程级 host 投影，换 preset 不会换这份清单的权威来源。

**三面切开。** host 面一次 boot 一份 `pluginInventory`；client 面经 generated `./remote` 调 `list()`，不执行模型 turn；agent-preset 面不出现在这条 Remote 上。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/plugin-inventory/src/index.ts` | `PluginInventoryGateway`、`FIBER_PHASE`、`@Remote('list')`、无 cache 的遍历 |
| `packages/host/plugin-inventory/src/types.ts` | `PluginInventorySnapshot` 与四字段 `PluginInventoryEntry` |
| `packages/host/plugin-inventory/src/invariant.ts` | 空 installer，占 `@deepseek-ai/dsh-host-plugin-inventory` |
| `packages/host/plugin-inventory/tests/inventory.spec.ts` | 单方法 `list`、跳过 group、disable/remove 立刻反映 |
| `packages/host/plugin-inventory/tests/invariant.spec.ts` | companion 可重复挂上 |
| `packages/host/plugin-inventory/package.json` | 导出 `.` / `./types` / `./typert` / `./remote`；生成物不进 `src/` |
| `packages/bundle/web-app/cordis.patch.yml` | 唯一 shipped `id: plugin-inventory`；同树还有 `api-remotes` 与 `ui-settings-plugin-inventory` |
| `packages/bundle/base/cordis.patch.yml` | 有 `typert-gateway`，**无** `plugin-inventory` |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 code-runtime / headless-startup / headless-runner |
| `packages/typert/protocol/src/index.ts` | `TypertRemoteService` / `Remote` / `remoteMethods` |
| `packages/api/gateway/src/index.ts` | `ctx.typertGateway` 按 `typertRemote` 发现并 dispatch |
| `packages/api/remotes/src/client/index.ts` | client 半边 `$mount(pluginInventoryRemote)` |
| `packages/client/ui-settings-plugin-inventory/src/client/index.ts` | trusted Consumer：`ctx.remote.pluginInventory.list()` |
| `vendor/loader/src/config/tree.ts` | `entries()` 先本树再嵌套 subtree |
| `vendor/loader/src/config/entry.ts` | `options.group`、有效 `disabled`、dispose 时清掉 `fiber` |
| `vendor/cordis/src/fiber.ts` | `FiberState` 含 `DISPOSED` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `PluginInventoryGateway` | 默认导出的 class plugin。Cordis 服务名 / Typert namespace 都是字面量 `'pluginInventory'`。没有 `Config` schema。 |
| `ctx.pluginInventory` | **服务键**，不是一份 `Context` interface merge。实现用 `super(ctx, 'pluginInventory')` → `ctx.reflect.provide`；测试用 `ctx.get('pluginInventory')`。 [E: vendor/cordis/src/service.ts:57] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:29] |
| `PluginInventorySnapshot` | `{ entries }`。`entries` 是 Loader 遍历顺序下的非 group 行。 |
| `PluginInventoryEntry` | 四字段：`entryId`（`PluginEntryId` brand）、`moduleName`（`entry.options.name`）、`enabled`（`!entry.disabled`）、`fiberPhase`。 |
| `PluginFiberPhase` | `'pending' \| 'loading' \| 'active' \| 'failed' \| 'unloading' \| null`。类型里**没有** `'disposed'`。 [E: packages/host/plugin-inventory/src/types.ts:7] |
| `FIBER_PHASE` | `FiberState` → 投影。`PENDING/LOADING/ACTIVE/FAILED/UNLOADING` 映射字符串；**`DISPOSED → null`**。 [E: packages/host/plugin-inventory/src/index.ts:38] |
| `typertRemote` | `{ service, serviceKey: 'pluginInventory', namespace: 'pluginInventory' }`。Gateway source-mode 发现靠这个字段，不是靠生成 catalog。 [E: packages/host/plugin-inventory/tests/inventory.spec.ts:37] |

`enabled` 是 `!entry.disabled`。`Entry.disabled` 走 `_disabled`：先 `disabledOf` 本行 options，再沿 `parent.ctx.fiber.entry` 对祖先 options 做同样的 `disabledOf`（`!!js` 先对 loader context 求值）。祖先折叠读的是祖先 options 上的 raw `disabled`，不是祖先的 `disabled` getter——group 自身 getter 恒为 `false`。inventory **根本不投影 group**。 [E: packages/host/plugin-inventory/src/index.ts:64] [E: vendor/loader/src/config/entry.ts:90] [E: vendor/loader/src/config/entry.ts:91] [E: vendor/loader/src/config/entry.ts:94] [E: vendor/loader/src/config/entry.ts:105]

## 控制流

1. **web profile 叠上本行。** `PROFILE_TEMPLATES.web@packages/boot/app-boot/src/profile.ts` 是 `dsh-base` 然后 `dsh-web-app`。`dsh-web-app` 第一段 `insert` 写 `id: plugin-inventory`、`name: '@deepseek-ai/dsh-host-plugin-inventory'`，并把该包装进 web-app `package.json` 依赖。`dsh-base` 的 insert 从 `timer` 起枚举共享行，字面量里没有 `plugin-inventory`；`dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/bundle/web-app/cordis.patch.yml:94] [E: packages/bundle/web-app/cordis.patch.yml:95] [E: packages/bundle/web-app/package.json:94] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **同树放下分发与 Consumer 行，但它们不是本包。** web-app 另 insert `id: api-remotes`（`@deepseek-ai/dsh-api-remotes`）和 `id: ui-settings-plugin-inventory`。base 已经有 `id: typert-gateway`（`@deepseek-ai/dsh-api-gateway`，`ctx.typertGateway`）。web-app 的 `id: api-gateway` 是 `@deepseek-ai/dsh-host-apiproxy`（`ctx.apiProxy`），**不**承载 `pluginInventory/list`。 [E: packages/bundle/web-app/cordis.patch.yml:99] [E: packages/bundle/web-app/cordis.patch.yml:100] [E: packages/bundle/web-app/cordis.patch.yml:165] [E: packages/bundle/web-app/cordis.patch.yml:195] [E: packages/bundle/base/cordis.patch.yml:36] [E: packages/bundle/base/cordis.patch.yml:37]

3. **Loader 激活 class plugin。** `PluginInventoryGateway.static inject = ['loader']`，树里已有 `ctx.loader` 后构造跑起来。构造只做 `super(ctx, 'pluginInventory')`：`TypertRemoteService` 先 `Service` `provide` 服务键，再 `bindTypertRemote(this, this.name)`，得到可被 Gateway 扫到的 `typertRemote`。本包**没有** `apply` 函数、没有 `listen`、没有 `register` 路由。 [E: packages/typert/protocol/src/index.ts:158] [E: packages/typert/protocol/src/index.ts:159]

4. **装饰器钉死唯一 direct 方法。** `@Remote('list')` 把 public `list` 标成 `{ kind: 'direct' }`，export 名就是 `'list'`。`remoteMethods(inventory)` 的期望是恰好一项 `{ method: 'list', invocation: { kind: 'direct' } }`。没有 `@RemoteScope`，没有第二方法。 [E: packages/host/plugin-inventory/src/index.ts:56] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:41]

5. **`typertGateway` claim `/api` 上的 `pluginInventory/list`。** `TypertGatewayService@packages/api/gateway/src/index.ts` `provide('typertGateway')`，并 `connection.rpc.intercept('/api', claimsEndpoint, dispatchRpc, { authority: 'trusted-host' })`。source-mode 下 `collectSrcClaims` 扫 `ctx.reflect.props` 里的 service，读 `typertRemote.namespace` 与 `remoteMethods`，拼 `namespace/method`。`endpointOf` 就是 `` `${namespace}/${method}` ``，因此本服务的 endpoint 是 `pluginInventory/list`。分发细节（strict 定义 vs SRC fallback、参数校验、取消）交给 [`subsys.integration.api-gateway`](../integration/api-gateway.md)，本页不展开 codec。 [E: packages/api/gateway/src/index.ts:105] [E: packages/api/gateway/src/index.ts:109] [E: packages/api/gateway/src/index.ts:132] [E: packages/api/gateway/src/index.ts:492]

6. **client 半边挂 generated Remote，再注入 Settings 页。** `@deepseek-ai/dsh-api-remotes` 的 **host** `apply()` 是空函数；选中的 contribution 只在 client 环境 `$mount`。client `apply` 把 `pluginInventoryRemote`（包的 `./remote` 导出）放进 `commandsRemote / goalsRemote / dynamicRemote / pluginInventoryRemote / messageFeedbackRemote` 这一列。`ui-settings-plugin-inventory` 的 `inject = ['slots', 'locale', 'remote', 'remote.pluginInventory']`，真正拉数是 `ctx.remote.pluginInventory.list()`，失败则抛 `pluginInventory.list failed: …`。模块表如何把 `dsh.client` 行扫进 `window.__DSH_BOOT__` 见 [`subsys.client.modules`](../client/modules.md)。 [E: packages/api/remotes/src/index.ts:44] [E: packages/api/remotes/src/client/index.ts:109] [E: packages/client/ui-settings-plugin-inventory/src/client/index.ts:23] [E: packages/client/ui-settings-plugin-inventory/src/client/index.ts:31]

7. **`list()` 每次从 Loader 现读。** `list@packages/host/plugin-inventory/src/index.ts` 新建本地数组，`for (const entry of this.ctx.loader.entries())`：`entry.options.group` 为真则 `continue`；否则 push `{ entryId, moduleName, enabled, fiberPhase }`，最后 `{ entries }`。类上没有 snapshot 实例字段，模块里也没有 `Map`，也不订阅 `loader/*` 事件来维护影子表。测试标题就是 `without a second cache`：`loader.update(..., { disabled: true })` 与 `loader.remove` 之后下一次 `list()` 立刻变。 [E: packages/host/plugin-inventory/src/index.ts:60] [E: packages/host/plugin-inventory/src/index.ts:65] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:78]

8. **`fiberPhase` 两条路都可能是 `null`。** 无 root Fiber（`entry.fiber === undefined`）直接 `null`。有 fiber 则查 `FIBER_PHASE[entry.fiber.state]`：`DISPOSED` 的值是 `null`，其它五态是小写字符串。Loader `_dispose` 先把 `this.fiber = undefined` 再 `fiber.dispose()`，所以 disable / remove 之后的下一次 `list()` 通常走「无 fiber」分支，而不是读到仍挂着的 `DISPOSED` fiber。两条路的对外值相同。 [E: packages/host/plugin-inventory/src/index.ts:65] [E: vendor/loader/src/config/entry.ts:132] [E: vendor/cordis/src/fiber.ts:152]

9. **group 与 disabled 夹具钉死投影规则。** 测试创建 active / pending / disabled 三条普通行，再 `create({ name: 'cordis:active', group: true })`；`snapshot.entries` 长度仍是 3，group 不出现。disabled 且从未启动的行是 `enabled: false, fiberPhase: null`。pending 行因 `inject: ['neverReady']` 停在 `'pending'`。`EntryTree.entries()` 先 `yield` 本树 `store` 再递归 subtree。这不是 Cordis 事件瀑布：`list` 是普通同步方法，没有 `next()`。 [E: packages/host/plugin-inventory/tests/inventory.spec.ts:53] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:56] [E: vendor/loader/src/config/tree.ts:28]

10. **`--host 0.0.0.0` 与本行无关，但决定 GUI 能不能起来。** 拒绝发生在 `web-startup` 的 `program.error`，**不会** `provide('webStartup')`；依赖它的 `webserver` 不 listen，进程走 `appExit`。本包 `inject` 的是 `loader` 不是 `webStartup`，不参与 bind。把 all-interfaces 写进 `WebServer.Config` overlay 是另一条组合缝，不是 inventory 的 schema。 [E: packages/bundle/web-app/src/startup.ts:69]

## 设计动机

Loader 已经用内部 plugin/status 事件维护 `Entry.fiber` 与 `Fiber.state`。再做一份 inventory cache 就是第二份生命周期真源，HMR / disable / isolate 一动就要对拍。`list()` 选择现读，用空 invariant 把这句话钉死：没有「投影自己的状态机」可检查。 [E: packages/host/plugin-inventory/src/invariant.ts:15]

group 行是树的结构容器，不是可安装插件。Loader 对 group 的 `disabled` 计算直接返回 `false`。若把 group 投影成一条 `enabled: true` 的「插件」，Settings 会把容器当成活模块。跳过 `entry.options.group` 比再解释一种伪插件更便宜。 [E: vendor/loader/src/config/entry.ts:90]

服务做成 Remote-only、故意不做 `Context` merge：同进程 TypeScript 不能写 `ctx.pluginInventory.list()` 当类型合同，必须经 `api-remotes` 的 generated client。这样 browser 包不会 import host 实现，host 也不会把 inventory 误当成又一个 in-process capability（对比 `ctx.fs` / `ctx.shell` 那种 Definition 包）。

只挂在 `dsh-web-app`：唯一 shipped Consumer 是 Web Settings。`dsh-base` / `dsh-headless` 没有这份 GUI roster，也没有理由在无浏览器的进程里 provide 一个只给 trusted client 看的 Remote。用户仍可用 profile / `--patch` overlay 把同一 `id` 插进别的 profile；那是组合层，不是 shipped 真树。

## Gotcha

- **`DISPOSED` 没有自己的字符串。** `PluginFiberPhase` 不含 `'disposed'`。映射表把 `FiberState.DISPOSED` 写成 `null`，与「从未 `init` / 已被 `_dispose` 清掉 `fiber`」共用 `null`。UI 只能显示 unobserved，不能区分「刚卸掉」和「从未加载」。 [E: packages/host/plugin-inventory/src/index.ts:38]
- **group 不是 `enabled: false`。** `list()` 对 `entry.options.group` 直接 `continue`，group 行从数组里消失。祖先 group 被 disable 时子孙普通行仍在清单里，只是 `enabled` 变 `false`：折叠不在 inventory 循环里，而在 `Entry._disabled`——本行 `disabledOf` 为真则 disabled，否则沿祖先链对祖先 options 再 `disabledOf`（含 `!!js`）。group 自身 getter 恒 `false`，子孙读到的是祖先 options 的 raw `disabled`。`enabled` 只是 `!entry.disabled`。 [E: packages/host/plugin-inventory/src/index.ts:60] [E: packages/host/plugin-inventory/src/index.ts:64] [E: vendor/loader/src/config/entry.ts:90] [E: vendor/loader/src/config/entry.ts:91] [E: vendor/loader/src/config/entry.ts:94]
- **不是 `ctx.apiProxy`。** web-app 的 `id: api-gateway` 是 BFF；`pluginInventory/list` 由 base 里的 `typert-gateway` 按 `typertRemote` 发现。不要到 `RpcMethodMap` 里找 `plugin.*`。
- **不是 `cordis-host-runner` 的 `@Remote('inventory')`。** 那是动态 Cordis 面板的另一条 Remote，payload 也不是 `PluginInventorySnapshot`。
- **没有 mutation / provenance。** `list` 不能 enable/disable/add/remove，也不告诉你哪一层 bundle / home / `--patch` 引入了这一行。要改树走 Loader / `dsh plugin`，不走这条 Remote。
- **host `api-remotes.apply` 是空的。** 只在 client 环境 `$mount` generated remote。只 boot 了 host 行、没挂 client roster 时，Gateway 仍能 SRC-claim endpoint，但浏览器没有 `ctx.remote.pluginInventory`。 [E: packages/api/remotes/src/index.ts:44]
- **第二份 `PluginInventoryGateway` 会撞 Cordis 重复 service。** 服务键写死 `'pluginInventory'`，没有 isolate 标签。
- **`--host 0.0.0.0` 被拒 ≠ schema 禁止 all-interfaces。** 那是 `web-startup` 旗标门。`WebServer.Config.host` 仍承认 `'0.0.0.0'`；一条替换整行 `webserver.config` 的 overlay 仍可能绑 all-interfaces。inventory 不参与 bind。

## Seam 三角

本缝不是 Cordis 事件瀑布（没有 `next()`）。它是 Service + Typert Remote。换 Provider 会让 `pluginInventory/list` 变 `service-unavailable`；换掉 client `$mount` 会让 Settings 的 `remote.pluginInventory` inject 挂起。Definition（四字段快照、`DISPOSED → null`、跳过 group）跟着 npm 包走，不跟着 bundle 行走。

| 角色 | 包 | 符号 / `ctx` 键 | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-host-plugin-inventory`（`./types` + `@Remote`） | `PluginInventoryGateway`、`PluginInventorySnapshot`；wire namespace `'pluginInventory'`；方法 `'list'` | 不是 Loader 行；包可以存在于 lockfile，但 **无** 组合行 | 定义仍在该 npm 包，不另开 Definition 行 | 定义仍在该 npm 包，不另开 Definition 行 |
| Provider | `@deepseek-ai/dsh-host-plugin-inventory` | `provide('pluginInventory')`；`ctx.get('pluginInventory')`；`inject: ['loader']` | **不 insert** | `id: plugin-inventory` `name: '@deepseek-ai/dsh-host-plugin-inventory'` [E: packages/bundle/web-app/cordis.patch.yml:94] | **不 insert**（insert 止于 headless-runner） [E: packages/bundle/headless/cordis.patch.yml:31] |
| Consumer | `@deepseek-ai/dsh-api-remotes`（client `$mount`）+ `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | `ctx.remote.pluginInventory`；`inject` 含 `'remote.pluginInventory'` | **不 insert** 这两行 | `id: api-remotes`、`id: ui-settings-plugin-inventory` [E: packages/bundle/web-app/cordis.patch.yml:165] [E: packages/bundle/web-app/cordis.patch.yml:195] | **不 insert** |
| 分发（相邻缝） | `@deepseek-ai/dsh-api-gateway` | `ctx.typertGateway`；intercept `/api` | `id: typert-gateway` [E: packages/bundle/base/cordis.patch.yml:36] | 继承 base 行，不改写 | 继承 base 行，不改写 |

本包同时还是 `ctx.loader` 的 Consumer：`static inject = ['loader']`，`list()` 读 `EntryTree.entries()`。Loader 的 Provider 是 `cordis-plugin-loader`，三个 shipped bundle 都依赖它；inventory 并不替换 Loader。

## Sources

- packages/host/plugin-inventory/src/index.ts
- packages/host/plugin-inventory/src/types.ts
- packages/host/plugin-inventory/src/invariant.ts
- packages/host/plugin-inventory/package.json
- packages/host/plugin-inventory/tests/inventory.spec.ts
- packages/host/plugin-inventory/tests/invariant.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/web-app/src/startup.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/typert/protocol/src/index.ts
- packages/api/gateway/src/index.ts
- packages/api/remotes/src/index.ts
- packages/api/remotes/src/client/index.ts
- packages/client/ui-settings-plugin-inventory/src/client/index.ts
- vendor/cordis/src/service.ts
- vendor/cordis/src/fiber.ts
- vendor/loader/src/config/entry.ts
- vendor/loader/src/config/tree.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面边界。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一轮提问；inventory 不在那条 prompt 热路径上，但和 webserver / `/api` 同一棵 host 树。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面与 host insert id 全表（含 `plugin-inventory`）。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` patch 真树、`webStartup` 旗标门、模型工具 disable。
- [`subsys.client.modules`](../client/modules.md) — `dsh.client` 行如何进入 `window.__DSH_BOOT__`；Settings 插件页靠这张图挂上。
- [`subsys.integration.api-gateway`](../integration/api-gateway.md) — `ctx.typertGateway` 对 `pluginInventory/list` 的 claim / dispatch / codec。
- [`subsys.host.apiproxy`](apiproxy.md) — `ctx.apiProxy` BFF 合同；**不是**本 Remote 的载体。
- [`subsys.client.connection`](../client/connection.md) — `/api` HTTP/WS carrier 与 trusted-host 篱笆。
