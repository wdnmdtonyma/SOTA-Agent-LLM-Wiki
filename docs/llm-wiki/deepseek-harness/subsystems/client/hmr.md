---
id: subsys.client.hmr
title: client HMR
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/hmr/src/index.ts
  - packages/client/hmr/src/events.ts
  - packages/client/hmr/src/client/index.ts
  - packages/client/hmr/src/invariant.ts
  - packages/client/hmr/package.json
  - packages/client/hmr/tests/node-half.client.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/client/modules/src/index.ts
  - packages/client/modules/src/client/index.ts
  - packages/client/modules/src/client/system.ts
  - packages/client/modules/src/client/manifest.ts
  - packages/client/web/src/boot.tsx
  - packages/host/webserver/src/index.ts
  - packages/boot/app-boot/src/index.ts
  - apps/cli/src/profile-boot.ts
  - scripts/dev-web.ts
  - package.json
  - vendor/hmr/src/index.ts
  - vendor/loader/src/index.ts
  - vendor/loader/src/config/entry.ts
  - vendor/cordis/src/fiber.ts
symbols:
  - client-hmr
  - EVENTS_ENDPOINT
  - clientModules.rebuilt
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.modules
  - subsys.client.web
  - subsys.composition.bundle-web-app
  - subsys.composition.bundle-base
  - subsys.composition.bundle-headless
  - surface.profiles.web
  - subsys.host.webserver
  - subsys.vendor.loader
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-hmr`（组合行 `id: client-hmr`）是 **运行时装 UI 插件** 的双面驱动：node 半边用 `setInterval` + `statSync` 轮询每个 `dsh.client` graph 行的 client bundle，变化走 `ctx.clientModules.rebuilt(id)`，再经 SSE `GET /plugins/events` 广播；浏览器半边收 `rebuilt` 帧，按 `invalidate → prefetch → registry-first teardown → entry.refresh()` 热换 Loader fiber。它和 base 共享的 `id: hmr`（`@deepseek-ai/cordis-plugin-hmr`，给 profile / home `cordis.patch.yml` 热更新）**不是同一条链**。

## 能回答的问题

- `id: client-hmr` 和被 web overlay `disabled: true` 的共享 `id: hmr`、launcher 再挂的 `root: []` watch-only HMR，三条线各管哪一层？
- 为什么监视是 stat-poll 而不是 `fs.watch` / inotify？`pollIntervalMs` 缺省多少？没有 `pnpm run dev:web` 时链为什么空闲？
- `clientModules.rebuilt(id)` 何时静默、何时发 SSE？`/plugins/events` 怎样压过 `/plugins` 前缀路由？
- 浏览器半边为什么必须先 `invalidate` 再 `prefetch`，并且先 `registry.delete` 再 `entry.refresh()`？裸 `fiber.dispose()` 会怎样？
- `dsh-base` / `dsh-web-app` / `dsh-headless` 各自挂不挂这条链？headless 有没有 client 热换？

## 职责边界

DSH 是 **Cordis 组合运行时**（`profile → bundle → preset`；seam = Definition / Provider / Consumer；**model-visible ⟺ logged**）。默认安装路径是本地 Web GUI（`dsh web` / `--profile web`）；本仓没有 shipped TUI。launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`，本页不展开旗标解析。[`surface.profiles.web`](../../surface/profiles/web.md)

本包拥有 **client 插件热换这条 dev 链** 的两端：

- **node 半边**（`packages/client/hmr/src/index.ts`）：`name = 'client-hmr'`，`inject = ['clientModules', 'webServer']`，`Config.pollIntervalMs` 缺省 `500`。[E: packages/client/hmr/src/index.ts:25] [E: packages/client/hmr/src/index.ts:28] [E: packages/client/hmr/src/index.ts:37]
- **浏览器半边**（`packages/client/hmr/src/client/index.ts`）：同名插件，`inject = ['loader', 'modules']`，`EventSource(EVENTS_ENDPOINT)` 收帧并热换。[E: packages/client/hmr/src/client/index.ts:73] [E: packages/client/hmr/src/client/index.ts:76]
- **线协议**：`EVENTS_ENDPOINT = '/plugins/events'`；帧是 `graph`（全图快照）或 `rebuilt`（单行 id + rev）。[E: packages/client/hmr/src/events.ts:16] [E: packages/client/hmr/src/events.ts:12] [E: packages/client/hmr/src/events.ts:13]

`package.json` 的 `dsh.client` 声明 `platform: 'web'`、`immediately: true`、`inject: []`：这是扫进 `window.__DSH_BOOT__` 的图元数据；Cordis 真门是浏览器半边的 `inject = ['loader', 'modules']`。[E: packages/client/hmr/package.json:34] [E: packages/client/hmr/package.json:35] [E: packages/client/hmr/package.json:36]

本包**不**拥有：

- `dsh.client` 扫描、`window.__DSH_BOOT__`、`/plugins/<id>/client.js` 发盘 — [`subsys.client.modules`](modules.md)。HMR 只调用 `graph()` / `clientPath()` / `rebuilt()` / `onRebuilt` / `onGraphChanged`。
- 壳 boot、`immediately` 层 prefetch 策略 — [`subsys.client.web`](web.md)。
- HTTP listen 与 exact-vs-prefix 匹配 — [`subsys.host.webserver`](../host/webserver.md)。
- 共享模块 / 配置文件 HMR（`ctx.hmr`，`@deepseek-ai/cordis-plugin-hmr`）以及 `watchUserPatches` — 见本页「三条 HMR」与 [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md)。
- `/api`、会话、模型 turn。client **不**执行 `ReactLoopAgent`。第一次提问走 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。

`dsh-web-app` **无条件 insert** `id: client-hmr`（无 `disabled`、无 `config`）。[E: packages/bundle/web-app/cordis.patch.yml:142] [E: packages/bundle/web-app/cordis.patch.yml:143] `pollWatches` 在 `!dirty` 且 mtime/size 与 baseline 相同时 `continue`，不调 `rebuilt`。[E: packages/client/hmr/src/index.ts:109] 改写各包 `lib/client.js` 的是 `pnpm run dev:web`（tsdown `watch: true`）。[E: scripts/dev-web.ts:66] [E: package.json:141] 没有这条 rebuild watcher 时 poll 看不到变化，链空闲。[I]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/hmr/src/index.ts` | node 半边：`apply` 挂 watch + SSE |
| `packages/client/hmr/src/events.ts` | `EVENTS_ENDPOINT` 与 `PluginsEventFrame` |
| `packages/client/hmr/src/client/index.ts` | 浏览器半边：SSE → 热换 |
| `packages/client/hmr/src/invariant.ts` | 伴随核：fiber 卸掉后不应残留 `StatWatcher`（与当前 `setInterval` 实现有漂移，见 Gotcha） |
| `packages/client/hmr/tests/node-half.client.spec.ts` | graph 跟随、stat 变化、`ENOENT` dirty、构造窗口 rehash、dispose 停表 |
| `packages/client/hmr/package.json` | `dsh.client.immediately: true`；`exports` 暴露 `.` / `./client` / `./invariant` |
| `packages/bundle/web-app/cordis.patch.yml` | 关共享 `hmr`；无条件 insert `client-hmr` |
| `packages/bundle/base/cordis.patch.yml` | 共享 `hmr` `root: ['.']` |
| `packages/bundle/headless/cordis.patch.yml` | 共享 `hmr` `disabled: true`；**无** `client-hmr` |
| `packages/client/modules/src/index.ts` | `ctx.clientModules`；`rebuilt()` 是 bundle 内容进图的唯一入口 |
| `packages/client/modules/src/client/system.ts` | 浏览器 `invalidate` / `prefetch` / 在途 `arrive` 共享 |
| `scripts/dev-web.ts` | 改写各包 `lib/client.js` 的 watch-build；**不**发 SSE |
| `apps/cli/src/profile-boot.ts` | `ctx.get('hmr')` 空时补 `root: []` 的 `@deepseek-ai/cordis-plugin-hmr` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / 组合 `id` | 插件名 `'client-hmr'`；web-app 行 `id: client-hmr`，`name: '@deepseek-ai/dsh-client-hmr'`。graph 行 id 是 **package name**（`entry.options.name`），不是组合 id。 |
| `inject`（node） | `['clientModules', 'webServer']`。`ClientModuleRegistry` 构造 `super(ctx, 'clientModules')`。[E: packages/client/modules/src/index.ts:204] |
| `inject`（browser） | `['loader', 'modules']`。`modules` 由壳 adopt 后 `ctx.reflect.provide('modules', …)`。[E: packages/client/modules/src/client/index.ts:33] |
| `Config.pollIntervalMs` | 正整数，步长 1，缺省 `500`。与 `pnpm run dev:web`（`tsx scripts/dev-web.ts --poll`）源 watcher 缺省 500ms 对齐。[E: package.json:141] [E: scripts/dev-web.ts:103] |
| `WatchedBundle` | `{ path, mtimeMs, size, dirty }`。`dirty` 在 `ENOENT`（文件消失或 `rebuilt` 读盘失败）时置位，避免「同 mtime/size 复活」被当成无变化。 |
| `PluginsEventFrame` | `{ type: 'graph'; graph }` 或 `{ type: 'rebuilt'; id; rev }`。SSE 行是 `data: ${JSON.stringify(frame)}\n\n`。 |
| `EVENTS_ENDPOINT` | `'/plugins/events'`。exact 路由；`/plugins` 前缀是 modules 发盘。 |
| `WebBootEntry.id` | 等于 Loader `entry.options.name`（package name）。构图时 `graphRow(entryName, …)` 把该名写成行 id；`rebuilt` 帧与 `findEntry` 都按这个名字对齐。[E: packages/client/modules/src/index.ts:399] |

`rebuilt(id)` 重读磁盘、算 12 位 sha1。rev **没变**则直接返回、不通知；变了才改 graph 行、`onRebuilt(id, rev)`、再 `notifyGraphChanged()`。[E: packages/client/modules/src/index.ts:274] [E: packages/client/modules/src/index.ts:277] [E: packages/client/modules/src/index.ts:278] [E: packages/client/modules/src/index.ts:290]

## 控制流

1. **`dsh-web-app` 叠在 `dsh-base` 上，无条件插入本行。** `PROFILE_TEMPLATES.web` 是 `dsh-base` 然后 `dsh-web-app`。web overlay 把 base 的共享 `id: hmr` 写成 `disabled: true`，再 `insert` `id: client-hmr` / `name: '@deepseek-ai/dsh-client-hmr'`（无 `disabled`、无 `config`，吃 schema 缺省）。[E: packages/bundle/web-app/cordis.patch.yml:22] [E: packages/bundle/web-app/cordis.patch.yml:23] [E: packages/bundle/web-app/cordis.patch.yml:142] [E: packages/bundle/web-app/cordis.patch.yml:143]

2. **共享 `hmr` 与本行拆开。** base 插入 `@deepseek-ai/cordis-plugin-hmr`，`config.root: ['.']`，服务名 `'hmr'`，用 chokidar 看模块根并 `registerConfig` 看单个配置文件。[E: packages/bundle/base/cordis.patch.yml:19] [E: packages/bundle/base/cordis.patch.yml:20] [E: packages/bundle/base/cordis.patch.yml:22] [E: vendor/hmr/src/index.ts:119] web / headless 都把该行 `disabled: true`。[E: packages/bundle/headless/cordis.patch.yml:14] [E: packages/bundle/headless/cordis.patch.yml:15]

3. **launcher 补 watch-only，不是补 client-hmr。** `runProfile@apps/cli/src/profile-boot.ts` 在树已 ACTIVE 且 `ctx.get('hmr') === undefined` 时，必要时先挂 `timer`，再 `loader.create({ name: '@deepseek-ai/cordis-plugin-hmr', config: { root: [] } })`。[E: apps/cli/src/profile-boot.ts:279] [E: apps/cli/src/profile-boot.ts:283] `root.length === 0` 时 vendor HMR 立刻 `ready`，不扫模块树。[E: vendor/hmr/src/index.ts:277] `watchUserPatches` 在 `ctx.get('hmr')` 为空时抛错，否则对 profile / home 的 `cordis.patch.yml` 调 `hmr.registerConfig`。[E: packages/boot/app-boot/src/index.ts:237] [E: packages/boot/app-boot/src/index.ts:238] [E: packages/boot/app-boot/src/index.ts:241]

4. **`client-hmr` 的 node `apply` 等 `clientModules` 与 `webServer`。** `modules` 行先提供 `ctx.clientModules` 并登记 `/plugins` 前缀。本行随后激活。headless **没有** `webserver` / `modules` / `client-hmr`，insert 只有 `code-runtime`、`headless-startup`、`headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

5. **`syncWatches@packages/client/hmr/src/index.ts` 按当前 graph 对齐监视集。** 对每个 `ctx.clientModules.graph().entries` 取 `clientPath(row.id)`；路径变了或行没了就 `watched.delete`；新行 `watchRow`。没有「跳过自己」的分支——`modules`/`hmr` 自己的 bundle 也走同一条链。[E: packages/client/hmr/src/index.ts:120] [E: packages/client/hmr/src/index.ts:126] [E: packages/client/hmr/src/index.ts:129]

6. **`watchRow` 先 `statSync` 抓 baseline，立刻 `rehash`。** 抓不到文件（`ENOENT`）则写入 `dirty: true` 的占位，等以后 poll。立即 rehash 防止「构图哈希已旧、第一次 baseline 却是新文件」把中间写入吃成静默。[E: packages/client/hmr/src/index.ts:85] [E: packages/client/hmr/src/index.ts:96] 测试钉死：构图读图窗口里改文件，激活后仍会 `rebuilt('pkg-a')`。[E: packages/client/hmr/tests/node-half.client.spec.ts:157]

7. **`ctx.effect` 挂 interval：`setInterval(pollWatches, pollIntervalMs)` 且 `timer.unref()`。** 同时订 `onGraphChanged(syncWatches)`。卸载时 `unsubscribe` + `clearInterval` + `watched.clear()`。[E: packages/client/hmr/src/index.ts:138] [E: packages/client/hmr/src/index.ts:139] [E: packages/client/hmr/src/index.ts:140] [E: packages/client/hmr/src/index.ts:143] 测试：dispose 后再写文件，`rebuiltCalls` 保持 0。[E: packages/client/hmr/tests/node-half.client.spec.ts:109]

8. **`pollWatches`：stat 没变且不 dirty 就 `continue`。** 网络盘没有可靠 inotify，所以是 poll。`statSync` 失败标 dirty；成功则 `rehash` → `ctx.clientModules.rebuilt(id)`。[E: packages/client/hmr/src/index.ts:103] [E: packages/client/hmr/src/index.ts:109] [E: packages/client/hmr/src/index.ts:68] 激活时第一次 `watchRow` 就会 `rebuilt` 一次（测试期望 `['pkg-a']`）。[E: packages/client/hmr/tests/node-half.client.spec.ts:95]

9. **`rebuilt` 抛 `ENOENT` 时保留 dirty、不改 mtime。** 其它错误只 `logger.warn`，然后仍把当前 stat 写成 baseline 并清 dirty。文件消失再以相同 mtime/size 回来，必须靠 dirty 才能再 hash；测试用固定 `utimes` 钉这一点。[E: packages/client/hmr/src/index.ts:71] [E: packages/client/hmr/src/index.ts:72] [E: packages/client/hmr/tests/node-half.client.spec.ts:183]

10. **`rebuilt@ClientModuleRegistry` 才是内容进图的入口。** 读 `clientPath`、`shortHash`；rev 相同则静默。变了才换 `graphRow`（url 带 `?rev=`）、通知 `onRebuilt`（单个 listener 抛错不得打死 poll）、再 `notifyGraphChanged`。[E: packages/client/modules/src/index.ts:277] [E: packages/client/modules/src/index.ts:278] [E: packages/client/modules/src/index.ts:281] [E: packages/client/modules/src/index.ts:285]

11. **SSE 信道是 exact `/plugins/events`。** `webServer.register({ kind: 'exact', path: EVENTS_ENDPOINT, … })`。`WebServer.match` 先查 exact 表，miss 才 longest-prefix。因此本路由压过 modules 的 `/plugins` 前缀。[E: packages/client/hmr/src/index.ts:166] [E: packages/client/hmr/src/index.ts:168] [E: packages/host/webserver/src/index.ts:243] [E: packages/host/webserver/src/index.ts:244] 测试断言登记的是 `{ kind: 'exact', path: EVENTS_ENDPOINT }`。[E: packages/client/hmr/tests/node-half.client.spec.ts:94] `modules` 把 `/plugins` 登成 prefix。[E: packages/client/modules/src/index.ts:242] `serveBundle` 只在 pathname `endsWith('/client.js')` 或 `'/client.js.map'` 时解析 id，否则 `path === undefined` 并 `writeHead(404)`。[E: packages/client/modules/src/index.ts:433] [E: packages/client/modules/src/index.ts:434] [E: packages/client/modules/src/index.ts:436] [E: packages/client/modules/src/index.ts:440] [E: packages/client/modules/src/index.ts:441] 本行不在时 GET `/plugins/events` 落到该 prefix 且不带 `client.js` 后缀，因此 404。[I]

12. **非 GET/HEAD 回 405；GET/HEAD 都进 `connect`。** `connect` 写 `text/event-stream` + `cache-control: no-cache`，先打注释行 `: connected\n\n`（没有 rebuild 时通道也活着），再推一帧 `{ type: 'graph', graph }`，把 `ServerResponse` 放进 `connections`。[E: packages/client/hmr/src/index.ts:172] [E: packages/client/hmr/src/index.ts:153] [E: packages/client/hmr/src/index.ts:159] [E: packages/client/hmr/src/index.ts:160]

13. **`onRebuilt` 把 `{ type: 'rebuilt', id, rev }` 写给每个连接。** 卸载时 `unsubscribe`、拆路由、`res.destroy()` 全部连接。[E: packages/client/hmr/src/index.ts:180] [E: packages/client/hmr/src/index.ts:181] [E: packages/client/hmr/src/index.ts:187]

14. **浏览器 `apply` 用 `EventSource(EVENTS_ENDPOINT)`。** `message` 里 `JSON.parse`；坏帧 `logger.warn` 丢弃。`graph` 帧故意不用（boot 图的 rev 会过期；prefetch 走网络，host 发 bundle 带 `cache-control: no-cache`）。未知 `type` 忽略。[E: packages/client/hmr/src/client/index.ts:167] [E: packages/client/hmr/src/client/index.ts:171] [E: packages/client/hmr/src/client/index.ts:153] [E: packages/client/modules/src/index.ts:449]

15. **`rebuilt` 帧串行进 `reload(id)`。** `queue = queue.then(() => reload(frame.id)).catch(…)`，交错 dispose/execute 会弄坏单槽交接。[E: packages/client/hmr/src/client/index.ts:148] `findEntry` 按 `entry.options.name === id` 找；找不到只 warn，不拆树。[E: packages/client/hmr/src/client/index.ts:81] [E: packages/client/hmr/src/client/index.ts:107]

16. **`reload` 顺序：`invalidate` 必须先于 `prefetch`。** 活着的 factory 会让 prefetch 变成 no-op，且重复 `__ModuleLoader__.load` 会因重复登记抛错。`ClientModuleSystem.invalidate` 只删 `factories` 与 `loadCache`。[E: packages/client/hmr/src/client/index.ts:115] [E: packages/client/hmr/src/client/index.ts:116] [E: packages/client/modules/src/client/system.ts:193] [E: packages/client/modules/src/client/system.ts:194]

17. **prefetch 成功后才 registry-first teardown。** 取 `entry.fiber`；`registry.delete(runtime.callback)` 必须在 disposer 发 `internal/plugin` 之前。vendor Loader 的 self-dispose 分支：若 registry **仍持有** callback，就把该 entry `options.disabled = true`（永久）。先 delete 则 `!ctx.registry.has(...)` 早退，entry 保持 enabled。[E: packages/client/hmr/src/client/index.ts:124] [E: vendor/loader/src/index.ts:140] [E: vendor/loader/src/index.ts:155] 然后 `while (oldFiber.inertia) await` 抽干 unload，`delete entry.fiber`（`Entry.refresh` 见 fiber 就直接 return），`removeOwnedStyles(id)`，`await entry.refresh()`，再 `await entry.fiber?.await()` 把 apply 失败打成 FAILED。[E: packages/client/hmr/src/client/index.ts:127] [E: packages/client/hmr/src/client/index.ts:128] [E: packages/client/hmr/src/client/index.ts:132] [E: packages/client/hmr/src/client/index.ts:137] [E: packages/client/hmr/src/client/index.ts:139] [E: vendor/loader/src/config/entry.ts:125]

18. **下游不靠 HMR 记账。** 依赖方 fiber 的 `_refresh` 把 epoch 编成所 inject 的 provider `fiber.uid` 串。[E: vendor/cordis/src/fiber.ts:614] [E: vendor/cordis/src/fiber.ts:620] provider 被换掉则 epoch 字符串变：先 `_unload`，卸完若新 epoch 不是 `INACTIVE` 再 `_reload`。[E: vendor/cordis/src/fiber.ts:635] [E: vendor/cordis/src/fiber.ts:692] 换 `connection` / `client-runtime` 会原生级联到 UI 依赖。

19. **自己也可以被热换。** 本包是 graph 行（`dsh.client`）。旧 closure 里的 `reload` 继续跑；旧 fiber 的 effect 关掉 `EventSource`；新 `apply` 再开一条。空隙里的帧会丢，下一次 rebuild 再通知。

20. **没有 `dev:web` 时链空闲。** `scripts/dev-web.ts` 只对 `dsh.client.platform === 'web'` 的包跑 tsdown watch，改写 `lib/client.js`；SSE 仍由本包发出。`package.json` 的 `dev:web` 带 `--poll`（缺省 500ms），理由同样是网络盘没有 inotify。[E: scripts/dev-web.ts:42] [E: scripts/dev-web.ts:66] [E: scripts/dev-web.ts:103] 生产/未改 bundle 时 poll 每 500ms `statSync` 一次；mtime/size 未变且不 dirty 则 `continue`，即使进了 `rebuilt` 也是 rev 相同则静默、不发 SSE。[E: packages/client/hmr/src/index.ts:109] [E: packages/client/modules/src/index.ts:278]

## 设计动机

- **client 热换与配置热更新必须拆开。** `@deepseek-ai/cordis-plugin-hmr` 吃 Node ESM `loadCache` 和 `cordis.yml` / patch 文件；浏览器插件是另一套 lazy CJS 表 + Loader entry。web 把共享 `hmr` 的模块根关掉（reload lifecycle 未测），但用户 patch 仍要热更新，所以 launcher 补 `root: []`。client 插件走始终 insert 的 `client-hmr`。
- **poll，不是 inotify。** 开发机/网络盘不保证 `fs.watch`。node 半边与 `dev:web --poll` 都按 500ms 默认轮询。
- **无条件挂、默认可空闲。** 生产图也留着这一行：没有人改 `lib/client.js` 时只是空转 interval + 一条注释 SSE。官方 `docs/subsystems/client-modules.md` 写 production 会省略 HMR 行，与 web-app patch 冲突；wiki 跟代码。[U]
- **lazy CJS 让热换只动登记。** 执行 bundle 只 ` __ModuleLoader__.load({id, factory})`；副作用（含 CSS）在 materialize / `refresh()`。所以可以先登记新 factory、再拆旧 fiber、再 materialize。
- **registry-first 是 Loader 的约束，不是口味。** `Entry.fiber` dispose 后仍留着；`refresh()` 见 fiber 就 no-op。裸 `dispose()` 走 self-dispose 会把 entry 永久 `disabled`。必须先 `registry.delete` 再清 `entry.fiber`。
- **无 rollback。** prefetch 在 invalidate 之后失败：旧 fiber 还在跑（teardown 没开始），模块已无 factory，下一帧从头再来。apply 失败留下 FAILED fiber，给壳的 status 投影。

## Gotcha

- **三条线不要并成一句「web 关了 HMR」。** (1) 共享 `id: hmr` `disabled: true`；(2) launcher `root: []` watch-only + `watchUserPatches`；(3) 始终挂着的 `client-hmr`。关 (1) 并不关掉用户 patch 热更新，也不关掉 UI 插件热换。[E: packages/bundle/web-app/cordis.patch.yml:23] [E: apps/cli/src/profile-boot.ts:283]
- **`client-hmr` 不是 `ctx` 服务。** node 半边不 `provide('client-hmr')`，只 `inject` 已有的 `clientModules` / `webServer`。[E: packages/client/hmr/src/index.ts:28] 共享模块 / 配置热更新的服务是 vendor HMR 的 `ctx.hmr`。[E: vendor/hmr/src/index.ts:119]
- **graph id 是 package name。** SSE `rebuilt.id` 是 `@deepseek-ai/dsh-…`，不是组合 `id: client-hmr`。
- **`invalidate` 只删 `factories` 与 `loadCache`。** 函数体不碰 `pendingArrival` 表。[E: packages/client/modules/src/client/system.ts:193] [E: packages/client/modules/src/client/system.ts:194] [E: packages/client/modules/src/client/system.ts:67] `arrive` 对同 id 复用 in-flight Promise，`finally` 才 `pendingArrival.delete`。[E: packages/client/modules/src/client/system.ts:101] [E: packages/client/modules/src/client/system.ts:102] [E: packages/client/modules/src/client/system.ts:108] 因此 `invalidate` 不取消在途 `arrive`；boot 尚未落地时撞上 `rebuilt`，可能 materialize 到 rebuild 前的字节，下一帧自愈。[I]
- **浏览器忽略 `graph` 帧。** 重连不会刷新壳里缓存的 `__DSH_BOOT__` rev。能工作是因为 `/plugins/<id>/client.js` 回 `no-cache`。[E: packages/client/modules/src/index.ts:449]
- **HEAD `/plugins/events` 也走 `connect`。** 会打开一条 SSE 写循环，不是空 HEAD。
- **`immediately: true` 只影响壳的 stage-one prefetch。** 热换语义与惰性行相同。[E: packages/client/web/src/boot.tsx:153]
- **伴随 invariant 仍在数 `StatWatcher`。** 现行 `apply` 用 `setInterval` + `statSync`，不再 `fs.watchFile`。`StatWatcher` 基线差在当前实现上通常是 0。测试靠「dispose 后再写文件不再 `rebuilt`」证明卸载，不靠 invariant。[U] [E: packages/client/hmr/src/index.ts:139] [E: packages/client/hmr/src/invariant.ts:18]
- **本页不是模型可见面。** 热换不进 session log；**model-visible ⟺ logged** 管的是 agent 工具 / preset，不是这条 dev 信道。

## Seam 三角

| 缝 | Definition | Provider | Consumer | base | web-app | headless |
|---|---|---|---|---|---|---|
| 运行时装 UI 插件 | npm `@deepseek-ai/dsh-client-hmr`；组合 `id: client-hmr`；双面 `name: 'client-hmr'` | **host** 行 insert；node `apply` 提供 watch + SSE | 浏览器半边 `EventSource` + `ctx.modules` / `ctx.loader` | 无此行 | **无条件 insert**；无 rebuild 则空闲 | **无** webserver / modules / 本行 |
| `ctx.clientModules.rebuilt` | `ClientModuleRegistry.rebuilt(id)`：重哈希，rev 变才通知 | **host** 行 `id: modules`（[`subsys.client.modules`](modules.md)） | node 半边 `pollWatches` / `watchRow` | 无 `modules` | insert `modules`；本行 `inject: [clientModules, webServer]` | 无 |
| `GET /plugins/events` | `EVENTS_ENDPOINT` + `PluginsEventFrame` | node 半边 `webServer.register` exact | 浏览器半边 `EventSource`；未知 type 忽略 | 无 | exact 压过 `/plugins` prefix | 无 |
| 浏览器 `modules` 热换钩 | `ClientModuleLoader.invalidate` / `prefetch` | 壳建 `ClientModuleSystem`，modules 行 `provide('modules')` | 浏览器半边 `reload` | 无浏览器壳 | [`subsys.client.web`](web.md) 先 adopt modules | 无 |
| 共享 `ctx.hmr` | `@deepseek-ai/cordis-plugin-hmr`；`Hmr.Config.root` 缺省 `['.']` | base 行 `id: hmr`；web/headless disable 后由 launcher `root: []` 补 | `watchUserPatches` → `registerConfig`（profile / home yml） | insert `root: ['.']`（模块 + 配置） | 行 disable；launcher watch-only | 行 disable；launcher watch-only（跑完即卸） |
| Loader entry 生命 | `Entry.refresh` / `internal/plugin` case 4 | vendored Loader（[`subsys.vendor.loader`](../vendor/loader.md)） | 浏览器半边必须 registry-first，否则 entry 被永久 disable | host 树用同一 Loader | 浏览器另有一份 Loader，`internal` 接到 `ClientModuleSystem` | 仅 host Loader，无 client entry |

换 Provider 会带走 Consumer：去掉 `client-hmr` 行则浏览器永远收不到 `rebuilt`（`/plugins/events` 变 404）；去掉 `modules` 则本行因 `inject` pending 不激活；把共享 `hmr` 整行删掉且 launcher 也不补，则 `watchUserPatches` 抛「requires the Cordis HMR service」。Definition（服务名、帧形状、`rebuilt` 合同）不变。

## Sources

- packages/client/hmr/src/index.ts
- packages/client/hmr/src/events.ts
- packages/client/hmr/src/client/index.ts
- packages/client/hmr/src/invariant.ts
- packages/client/hmr/package.json
- packages/client/hmr/tests/node-half.client.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/client/modules/src/index.ts
- packages/client/modules/src/client/index.ts
- packages/client/modules/src/client/system.ts
- packages/client/modules/src/client/manifest.ts
- packages/client/web/src/boot.tsx
- packages/host/webserver/src/index.ts
- packages/boot/app-boot/src/index.ts
- apps/cli/src/profile-boot.ts
- scripts/dev-web.ts
- package.json
- vendor/hmr/src/index.ts
- vendor/loader/src/index.ts
- vendor/loader/src/config/entry.ts
- vendor/cordis/src/fiber.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 边界。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一轮提问；本页是旁边的 dev 热换链，不在提问路径上。
- [`subsys.client.modules`](modules.md) — `__DSH_BOOT__`、`/plugins/<id>/client.js`、`rebuilt` 的 Provider。
- [`subsys.client.web`](web.md) — `AppWebEntry` 壳；`immediately` prefetch 与 adopt `modules`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — web overlay：disable 共享 `hmr`、insert `client-hmr`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — 共享 `id: hmr` `root: ['.']`。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 无浏览器 roster，无 `client-hmr`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面；`--host 0.0.0.0` 拒在 `webStartup` 之前。
- [`subsys.host.webserver`](../host/webserver.md) — exact / prefix 路由表；本页的 SSE 占 exact 座。
- [`subsys.vendor.loader`](../vendor/loader.md) — `Entry.refresh` 与 self-dispose `disabled: true`。
