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
  - packages/preset/agent-presets/src/index.ts
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
  - AgentPresetPluginGroup
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
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-host-plugin-inventory` 的 `PluginInventoryGateway` 是 **host 面**只读 Typert Remote：把当前 Cordis Loader 的**非 group**行投影成 `PluginInventorySnapshot`；若进程里 `ctx.get('agentPresets')` 有值，再附上每个 preset 的 composition 行。`@Remote('list')` 每次遍历 `ctx.loader.entries()`，没有第二份 cache。它不注册 HTTP 路由，也不进三个 Host HTTP controller。

## 能回答的问题

- `pluginInventory/list` 是谁 `provide` 的？服务键是什么？有没有 `declare module` 把 `ctx.pluginInventory` 并进 Cordis `Context`？
- 每次 `list()` 读哪里？为什么没有 cache？`entry.options.group` 为什么整行跳过？何时带 `agentPresets`？
- `fiberPhase` 的字符串有哪些？`FiberState.DISPOSED` 和「没有 fiber」各变成什么？
- `enabled` 是不是只看本行 `disabled`？祖先 group 被关掉时这一行会出现吗？
- 五个 shipped profile 里谁 insert `id: plugin-inventory`？谁是 trusted client Consumer？
- 这条 Remote 走 `ctx.typertGateway` 还是 session/settings/workspace controller？和 `cordis-host-runner` 的 `inventory` 是不是同一个方法？

## 职责边界

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`。capability seam 是 Definition / Provider / Consumer。`model-visible ⟺ logged` 管会话工具与 log，**不**管这份 inventory：它不是模型可见工具，也不写 session log。五个 shipped profile 是 `web`（`patchReload: 'live'`）与 `headless` / `sdk` / `sdk-minimal` / `acp`（`startup`）。 [E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:144] 默认 GUI 路径是 `dsh web` / `dsh --profile web`；本仓没有 shipped TUI。launcher 在 `provide('webStartup')` **之前**拒绝 `--host 0.0.0.0`。 [E: packages/bundle/web-app/src/startup.ts:74] [E: packages/bundle/web-app/src/startup.ts:75]

本包拥有：

- 进程级 Service / Remote：`PluginInventoryGateway extends TypertRemoteService`，`super(ctx, 'pluginInventory')`，`static inject = ['loader']`。 [E: packages/host/plugin-inventory/src/index.ts:47] [E: packages/host/plugin-inventory/src/index.ts:49] [E: packages/host/plugin-inventory/src/index.ts:50]
- 点时刻投影合同：`PluginInventorySnapshot` / `PluginInventoryEntry` / `PluginFiberPhase` / branded `PluginEntryId`，以及可选的 `AgentPresetPluginGroup`。 [E: packages/host/plugin-inventory/src/types.ts:64]
- 空 invariant companion（`install` 是 no-op）：Loader 已经是唯一生命周期真源。 [E: packages/host/plugin-inventory/src/invariant.ts:15]

本包**不**拥有：

- Loader 树本身、`Entry.disabled` 的祖先折叠、`FiberState` 枚举（`vendor/loader` / `vendor/cordis`）。本包只读 `ctx.loader.entries()`。 [E: packages/host/plugin-inventory/src/index.ts:68]
- HTTP listen / 路由登记（[`subsys.host.webserver`](webserver.md)）。本包不 `register` 任何 path。
- Host HTTP API：`ctx.sessionController` / `ctx.settingsController` / `ctx.workspaceController`（[`subsys.host.apiproxy`](apiproxy.md) 现写这三个 controller + webserver）。`pluginInventory/list` **不**在那些 Remote 动词表里。
- Typert 分发、codec、`/api` intercept（[`subsys.integration.api-gateway`](../integration/api-gateway.md)）。本页只点名 `TypertGatewayService` 如何 **claim** `pluginInventory/list`。
- 浏览器模块图 / `__DSH_BOOT__`（[`subsys.client.modules`](../client/modules.md)）和 `/api` 信任篱笆（[`subsys.client.connection`](../client/connection.md)）。
- Settings 插件清单 UI 的槽位、筛选、文案。Consumer 是 trusted client 的 `ui-settings-plugin-inventory`。
- agent-preset roster 的 mount / isolate。roster 由 `ctx.agentPresets.compositionInventory()` 提供；inventory 只做 `fiberState → fiberPhase` 映射。 [E: packages/host/plugin-inventory/src/index.ts:82]

**三面切开。** host 面一次 boot 一份 `pluginInventory`；client 面经 generated `./remote` 调 `list()`，不执行模型 turn；agent-preset 面只作为可选 `agentPresets` 字段出现在同一 snapshot 里。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/host/plugin-inventory/src/index.ts` | `PluginInventoryGateway`、`FIBER_PHASE`、`@Remote('list')`、Loader 遍历 + 可选 roster |
| `packages/host/plugin-inventory/src/types.ts` | `PluginInventorySnapshot`、`PluginInventoryEntry`、`AgentPresetPluginGroup` |
| `packages/host/plugin-inventory/src/invariant.ts` | 空 installer |
| `packages/host/plugin-inventory/tests/inventory.spec.ts` | 单方法 `list`、跳过 group、disable/remove 立刻反映、preset 映射 |
| `packages/host/plugin-inventory/tests/invariant.spec.ts` | companion 可重复挂上 |
| `packages/host/plugin-inventory/package.json` | 导出 `.` / `./types` / `./typert` / `./remote` |
| `packages/bundle/web-app/cordis.patch.yml` | 唯一 shipped `id: plugin-inventory`；同树 `api-remotes` 与 `ui-settings-plugin-inventory` |
| `packages/bundle/base/cordis.patch.yml` | 有 `typert-gateway`，**无** `plugin-inventory` |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 code-runtime / headless-startup / headless-runner |
| `packages/preset/agent-presets/src/index.ts` | `compositionInventory()`：roster 顺序、live mount 优先、未 mount 读文件 |
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
| `ctx.pluginInventory` | **服务键**，不是一份 `Context` interface merge。实现用 `super(ctx, 'pluginInventory')` → `ctx.reflect.provide`；测试用 `ctx.get('pluginInventory')`。 [E: vendor/cordis/src/service.ts:58] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:30] |
| `PluginInventorySnapshot` | `{ entries, agentPresets? }`。`entries` 是 Loader 遍历顺序下的非 group 行。`agentPresets` 仅在 `ctx.get('agentPresets')` 有值时出现。 [E: packages/host/plugin-inventory/src/types.ts:69] [E: packages/host/plugin-inventory/src/index.ts:78] |
| `PluginInventoryEntry` | 四字段：`entryId`（`PluginEntryId` brand）、`moduleName`（`entry.options.name`）、`enabled`（`!entry.disabled`）、`fiberPhase`。 |
| `AgentPresetPluginRow` | composition 行：`entryId` 可为 `null`；`enabled` 是 `boolean \| 'conditional'`；可选 `condition`；`fiberPhase`。 [E: packages/host/plugin-inventory/src/types.ts:29] |
| `PluginFiberPhase` | `'pending' \| 'loading' \| 'active' \| 'failed' \| 'unloading' \| null`。类型里**没有** `'disposed'`。 [E: packages/host/plugin-inventory/src/types.ts:7] |
| `FIBER_PHASE` | `FiberState` → 投影。五态映射小写字符串；**`DISPOSED → null`**。 [E: packages/host/plugin-inventory/src/index.ts:41] |
| `typertRemote` | `{ serviceKey: 'pluginInventory', namespace: 'pluginInventory' }`。Gateway source-mode 发现靠这个字段。 [E: packages/host/plugin-inventory/tests/inventory.spec.ts:38] |

`enabled` 是 `!entry.disabled`。`Entry.disabled` 走 `_disabled`：先 `disabledOf` 本行 options，再沿 `parent.ctx.fiber.entry` 对祖先 options 做同样的 `disabledOf`（`!!js` 先对 loader context 求值）。祖先折叠读的是祖先 options 上的 raw `disabled`，不是祖先的 `disabled` getter——group 自身 getter 恒为 `false`。inventory **根本不投影 group**。 [E: packages/host/plugin-inventory/src/index.ts:73] [E: vendor/loader/src/config/entry.ts:90] [E: vendor/loader/src/config/entry.ts:91] [E: vendor/loader/src/config/entry.ts:94] [E: vendor/loader/src/config/entry.ts:105]

## 控制流

1. **web profile 叠上本行。** `PROFILE_TEMPLATES.web` 是 `dsh-base` 然后 `dsh-web-app`。 [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:143] `dsh-web-app` insert `id: plugin-inventory`、`name: '@deepseek-ai/dsh-host-plugin-inventory'`，并把该包装进 web-app `package.json` 依赖。 [E: packages/bundle/web-app/cordis.patch.yml:82] [E: packages/bundle/web-app/cordis.patch.yml:83] [E: packages/bundle/web-app/package.json:101] `dsh-base` 有 `typert-gateway`，没有 `plugin-inventory`。 [E: packages/bundle/base/cordis.patch.yml:45] `dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26] sdk / sdk-minimal / acp 的 overlay 同样不 insert 本行（web-app 是唯一 shipped Consumer 树）。

2. **同树放下分发与 Consumer 行，但它们不是本包。** web-app 另 insert `id: api-remotes`（`@deepseek-ai/dsh-api-remotes`）和 `id: ui-settings-plugin-inventory`。 [E: packages/bundle/web-app/cordis.patch.yml:166] [E: packages/bundle/web-app/cordis.patch.yml:199] base 已经有 `id: typert-gateway`（`@deepseek-ai/dsh-api-gateway`，`ctx.typertGateway`）。 [E: packages/bundle/base/cordis.patch.yml:46] web-app 的 HTTP 命令面是 `session-controller` / `settings-controller` / `workspace-controller`，**不**承载 `pluginInventory/list`。 [E: packages/bundle/web-app/cordis.patch.yml:86] [E: packages/bundle/web-app/cordis.patch.yml:91] [E: packages/bundle/web-app/cordis.patch.yml:95]

3. **Loader 激活 class plugin。** `PluginInventoryGateway.static inject = ['loader']`。构造只做 `super(ctx, 'pluginInventory')`：`TypertRemoteService` 先 `Service` `provide` 服务键，再 `bindTypertRemote(this, this.name)`，得到可被 Gateway 扫到的 `typertRemote`。本包**没有** `apply` 函数、没有 `listen`、没有 `register` 路由。 [E: packages/typert/protocol/src/index.ts:165] [E: packages/typert/protocol/src/index.ts:167]

4. **装饰器钉死唯一 direct 方法。** `@Remote('list')` 把 public `list` 标成 `{ kind: 'direct' }`。`remoteMethods(inventory)` 的期望是恰好一项 `{ method: 'list', invocation: { kind: 'direct' } }`。没有 `@RemoteScope`，没有第二方法。 [E: packages/host/plugin-inventory/src/index.ts:65] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:42]

5. **`typertGateway` claim `/api` 上的 `pluginInventory/list`。** `TypertGatewayService` `provide('typertGateway')`，并在有 `connection` 时 `rpc.intercept('/api', claimsEndpoint, dispatchRpc)`。 [E: packages/api/gateway/src/index.ts:193] [E: packages/api/gateway/src/index.ts:199] source-mode 下 `collectSrcClaims` 扫 `ctx.reflect.props` 里的 service，读 `typertRemote.namespace` 与 `remoteMethods`。 [E: packages/api/gateway/src/index.ts:275] `endpointOf` 是 `` `${namespace}/${method}` ``，因此本服务的 endpoint 是 `pluginInventory/list`。 [E: packages/api/gateway/src/index.ts:1018] 分发细节交给 [`subsys.integration.api-gateway`](../integration/api-gateway.md)。

6. **client 半边挂 generated Remote，再注入 Settings 页。** `@deepseek-ai/dsh-api-remotes` 的 **host** `apply()` 向 `typertGateway.registerRemoteEvents` 登记转发源，不是空函数。 [E: packages/api/remotes/src/index.ts:37] 选中的 contribution 在 **client** `apply` 里 `$mount`。client `apply` 把 `pluginInventoryRemote`（包的 `./remote` 导出）放进 `agentPresetsRemote … workspaceRemote` 这一列。 [E: packages/api/remotes/src/client/index.ts:147] [E: packages/api/remotes/src/client/index.ts:151] `ui-settings-plugin-inventory` 的 `inject = ['slots', 'locale', 'remote', 'remote.pluginInventory']`，真正拉数是 `ctx.remote.pluginInventory.list()`，失败则抛 `pluginInventory.list failed: …`。 [E: packages/client/ui-settings-plugin-inventory/src/client/index.ts:29] [E: packages/client/ui-settings-plugin-inventory/src/client/index.ts:37] [E: packages/client/ui-settings-plugin-inventory/src/client/index.ts:39]

7. **`list()` 每次从 Loader 现读。** `list` 是 `async`：新建本地数组，`for (const entry of this.ctx.loader.entries())`：`entry.options.group` 为真则 `continue`；否则 push `{ entryId, moduleName, enabled, fiberPhase }`。 [E: packages/host/plugin-inventory/src/index.ts:66] [E: packages/host/plugin-inventory/src/index.ts:69] 类上没有 snapshot 实例字段。无 roster 时直接 `{ entries }`。测试标题是 `without a second cache`：`loader.update(..., { disabled: true })` 与 `loader.remove` 之后下一次 `list()` 立刻变。 [E: packages/host/plugin-inventory/tests/inventory.spec.ts:46] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:81]

8. **可选 `agentPresets`。** `const presets = this.ctx.get('agentPresets')`；`undefined` 则 snapshot 不含该字段（测试断言 `agentPresets` 为 `undefined`）。 [E: packages/host/plugin-inventory/src/index.ts:77] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:58] 有值则 `await presets.compositionInventory()`，把每行 `fiberState` 映射成 `fiberPhase`（缺省 `undefined` → `null`）。 [E: packages/host/plugin-inventory/src/index.ts:82] [E: packages/host/plugin-inventory/src/index.ts:84] `AgentPresets.compositionInventory`：roster 顺序；本 runtime 上 live standing mount 用 Loader 树；从未 mount 的 preset 读 composition 文件；broken 则 `rows: []`。 [E: packages/preset/agent-presets/src/index.ts:293] [E: packages/preset/agent-presets/src/index.ts:316] web 是五个 shipped profile 里唯一 insert `id: agent-presets` 的；headless/sdk/acp 跑 base 工具行，sdk-minimal 用 `agent-spine-demo`。因此默认 GUI 进程会带 `agentPresets`，无 roster 的 profile 即使 overlay 插了 inventory 也只返回 `entries`。

9. **`fiberPhase` 两条路都可能是 `null`。** 无 root Fiber（`entry.fiber === undefined`）直接 `null`。有 fiber 则查 `FIBER_PHASE[entry.fiber.state]`：`DISPOSED` 的值是 `null`。 [E: packages/host/plugin-inventory/src/index.ts:74] Loader `_dispose` 先把 `this.fiber = undefined` 再 `fiber.dispose()`，所以 disable / remove 之后的下一次 `list()` 通常走「无 fiber」分支。 [E: vendor/loader/src/config/entry.ts:132] `FiberState.DISPOSED` 是枚举成员 `4`。 [E: vendor/cordis/src/fiber.ts:152]

10. **group 与 disabled 夹具钉死投影规则。** 测试创建 active / pending / disabled 三条普通行，再 `create({ name: 'cordis:active', group: true })`；`snapshot.entries` 长度仍是 3。 [E: packages/host/plugin-inventory/tests/inventory.spec.ts:54] [E: packages/host/plugin-inventory/tests/inventory.spec.ts:59] disabled 且从未启动的行是 `enabled: false, fiberPhase: null`。pending 行因 `inject: ['neverReady']` 停在 `'pending'`。`EntryTree.entries()` 先 `yield` 本树 `store` 再递归 subtree。 [E: vendor/loader/src/config/tree.ts:28] `list` 是普通 async 方法，没有 waterfall `next()`。

11. **`--host 0.0.0.0` 与本行无关，但决定 GUI 能不能起来。** 拒绝发生在 `web-startup` 的 `program.error`，**不会** `provide('webStartup')`。本包 `inject` 的是 `loader` 不是 `webStartup`。 [E: packages/bundle/web-app/src/startup.ts:74]

## 设计动机

Loader 已经用内部 plugin/status 事件维护 `Entry.fiber` 与 `Fiber.state`。再做一份 inventory cache 就是第二份生命周期真源。`list()` 选择现读，用空 invariant 把这句话钉死。 [E: packages/host/plugin-inventory/src/invariant.ts:15]

group 行是树的结构容器，不是可安装插件。Loader 对 group 的 `disabled` 计算直接返回 `false`。跳过 `entry.options.group` 避免 Settings 把容器当成活模块。 [E: vendor/loader/src/config/entry.ts:90]

挂上 roster 后，模型可见插件往往跑在 preset 的 isolate 树里，而不是 host Loader 的顶层行。所以 snapshot 在 `ctx.agentPresets` 存在时附带 `compositionInventory()`，而不是假装 host `entries` 就是 agent 面。

服务做成 Remote-only、故意不做 `Context` merge：同进程 TypeScript 不能把 `ctx.pluginInventory.list()` 当类型合同，必须经 `api-remotes` 的 generated client。browser 包不会 import host 实现。

只挂在 `dsh-web-app`：唯一 shipped Consumer 是 Web Settings。`dsh-base` 与另外四个 shipped overlay（headless / sdk / sdk-minimal / acp）没有这份 GUI roster。用户仍可用 profile / `--patch` overlay 把同一 `id` 插进别的 profile。

## Gotcha

- **`DISPOSED` 没有自己的字符串。** `PluginFiberPhase` 不含 `'disposed'`。映射表把 `FiberState.DISPOSED` 写成 `null`，与「从未 `init` / 已被 `_dispose` 清掉 `fiber`」共用 `null`。 [E: packages/host/plugin-inventory/src/index.ts:41]
- **group 不是 `enabled: false`。** `list()` 对 `entry.options.group` 直接 `continue`。祖先 group 被 disable 时子孙普通行仍在清单里，只是 `enabled` 变 `false`。 [E: packages/host/plugin-inventory/src/index.ts:69] [E: packages/host/plugin-inventory/src/index.ts:73]
- **不是三个 HTTP controller。** `pluginInventory/list` 由 base 里的 `typert-gateway` 按 `typertRemote` 发现。不要到 session/settings/workspace Remote 动词里找 `plugin.*`。
- **不是 `cordis-host-runner` 的 `@Remote('inventory')`。** 那是动态 Cordis 面板的另一条 Remote，payload 也不是 `PluginInventorySnapshot`。
- **没有 mutation / provenance。** `list` 不能 enable/disable/add/remove，也不告诉你哪一层 bundle / home / `--patch` 引入了这一行。
- **host `api-remotes.apply` 登记 Remote events，client `$mount` generated remote。** 只 boot 了 host 行、没挂 client roster 时，Gateway 仍能 SRC-claim endpoint，但浏览器没有 `ctx.remote.pluginInventory`。 [E: packages/api/remotes/src/index.ts:37] [E: packages/api/remotes/src/client/index.ts:151]
- **第二份 `PluginInventoryGateway` 会撞 Cordis 重复 service。** 服务键写死 `'pluginInventory'`，没有 isolate 标签。
- **`--host 0.0.0.0` 被拒 ≠ schema 禁止 all-interfaces。** 那是 `web-startup` 旗标门。`WebServer.Config.host` 仍承认 `'0.0.0.0'`。inventory 不参与 bind。
- **preset 行的 `'conditional'`。** 未 mount 的 composition 上 `!!js` disabled 表达式若标识符在 Loader 求值作用域解不出，`enabled` 是 `'conditional'`，不是 boolean。 [E: packages/host/plugin-inventory/src/types.ts:26]

## Seam 三角

本缝不是 Cordis 事件瀑布（没有 `next()`）。它是 Service + Typert Remote。换 Provider 会让 `pluginInventory/list` 变 `service-unavailable`；换掉 client `$mount` 会让 Settings 的 `remote.pluginInventory` inject 挂起。Definition（四字段快照、`DISPOSED → null`、跳过 group、可选 `agentPresets`）跟着 npm 包走。

| 角色 | 包 | 符号 / `ctx` 键 | `dsh-base` | `dsh-web-app` | 其它 shipped overlay |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-host-plugin-inventory`（`./types` + `@Remote`） | `PluginInventoryGateway`、`PluginInventorySnapshot`；wire namespace `'pluginInventory'`；方法 `'list'` | 不是 Loader 行 | 定义仍在该 npm 包 | 定义仍在该 npm 包 |
| Provider | `@deepseek-ai/dsh-host-plugin-inventory` | `provide('pluginInventory')`；`inject: ['loader']` | **不 insert** | `id: plugin-inventory` [E: packages/bundle/web-app/cordis.patch.yml:82] | **不 insert**（headless 止于 headless-runner） [E: packages/bundle/headless/cordis.patch.yml:26] |
| Consumer | `@deepseek-ai/dsh-api-remotes`（client `$mount`）+ `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | `ctx.remote.pluginInventory`；`inject` 含 `'remote.pluginInventory'` | **不 insert** | `id: api-remotes`、`id: ui-settings-plugin-inventory` [E: packages/bundle/web-app/cordis.patch.yml:166] [E: packages/bundle/web-app/cordis.patch.yml:199] | **不 insert** |
| 分发（相邻缝） | `@deepseek-ai/dsh-api-gateway` | `ctx.typertGateway`；intercept `/api` | `id: typert-gateway` [E: packages/bundle/base/cordis.patch.yml:45] | 继承 base 行 | 继承 base 的 profile（sdk-minimal 不叠 base，默认没有 gateway 行） |
| Roster 输入（可选） | `@deepseek-ai/dsh-agent-presets` | `ctx.agentPresets.compositionInventory` | 无 roster 行 | web 另 insert `agent-presets` | headless/sdk/acp 无该 insert |

本包同时还是 `ctx.loader` 的 Consumer：`static inject = ['loader']`。Loader 的 Provider 是 `cordis-plugin-loader`；inventory 并不替换 Loader。

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
- packages/preset/agent-presets/src/index.ts
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
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — `dsh-web-app` patch 真树、`webStartup` 旗标门。
- [`subsys.client.modules`](../client/modules.md) — `dsh.client` 行如何进入 `window.__DSH_BOOT__`。
- [`subsys.integration.api-gateway`](../integration/api-gateway.md) — `ctx.typertGateway` 对 `pluginInventory/list` 的 claim / dispatch / codec。
- [`subsys.host.apiproxy`](apiproxy.md) — Host HTTP API（三个 `packages/api/*-controller` + webserver）；**不是**本 Remote 的载体。
- [`subsys.client.connection`](../client/connection.md) — `/api` HTTP/WS carrier 与 trusted-host 篱笆。
