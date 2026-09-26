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
  - packages/client/modules/src/client/entries.ts
  - packages/client/modules/src/client/entry-lifecycle.ts
  - packages/boot/hmr/src/index.ts
  - packages/client/web/src/boot.ts
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
  - subsys.client.runtime
  - subsys.composition.bundle-web-app
  - subsys.composition.bundle-base
  - subsys.composition.bundle-headless
  - surface.profiles.web
  - subsys.host.webserver
  - subsys.vendor.loader
evidence: explicit
status: verified
updated: 477b4f4205
---

> `@deepseek-ai/dsh-client-hmr`（组合行 `id: client-hmr`）是 **运行时装 UI 插件** 的双面驱动：node 半边用 `setInterval` + `statSync` 轮询每个 `dsh.client` graph 行的 client bundle，变化走 `ctx.clientModules.rebuilt(id)`，再经 SSE `GET /plugins/events` 广播；浏览器半边 `EventSource('plugins/events')` 把 `graph` 帧交给 `entries.sync`、把 `rebuilt` 帧交给 `entries.reload`。它和 `id: hmr`（`@deepseek-ai/dsh-hmr`，在有 `profileContext` 时看 profile / home patch）**不是同一条链**。

## 能回答的问题

- `id: client-hmr` 与 base 的 `id: hmr`（`@deepseek-ai/dsh-hmr`）各管哪一层？CLI 还补不补第三份 vendor HMR？
- 为什么监视是 stat-poll 而不是 `fs.watch` / inotify？`pollIntervalMs` 缺省多少？没有 `pnpm run dev:web` 时链为什么空闲？
- `clientModules.rebuilt(id)` 何时静默、何时发 SSE？`/plugins/events` 怎样压过 `/plugins` 前缀路由？
- 浏览器半边 `graph` / `rebuilt` 帧分别交给谁？`entries.reload` 的顺序是什么？
- `dsh-base` / `dsh-web-app` / `dsh-headless` / 其它 profile 各自挂不挂这条链？headless / sdk / acp 有没有 client 热换？

## 职责边界

DSH 是 **Cordis 组合运行时**（`profile → bundle → preset`；seam = Definition / Provider / Consumer；**model-visible ⟺ logged**）。五个 shipped profile：`web` 叠 `dsh-base` + `dsh-web-app`，以及 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。默认 GUI 入口是 `dsh web` / `--profile web`；也可用 `dsh --profile sdk|sdk-minimal|acp`。本仓没有 shipped TUI。launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`，本页不展开旗标解析。[`surface.profiles.web`](../../surface/profiles/web.md)

本包拥有 **client 插件热换这条 dev 链** 的两端：

- **node 半边**（`packages/client/hmr/src/index.ts`）：`name = 'client-hmr'`，`inject = ['clientModules', 'webServer']`，`Config.pollIntervalMs` 缺省 `500`。[E: packages/client/hmr/src/index.ts:27] [E: packages/client/hmr/src/index.ts:27] [E: packages/client/hmr/src/index.ts:27]
- **浏览器半边**（`packages/client/hmr/src/client/index.ts`）：同名插件，`inject = ['modules']`，`EventSource(EVENTS_ROUTE)` 收帧并转给 `ctx.modules.entries`。[E: packages/client/hmr/src/client/index.ts:12] [E: packages/client/hmr/src/client/index.ts:28]
- **线协议**：`EVENTS_ENDPOINT = '/plugins/events'`；浏览器用 document-relative `EVENTS_ROUTE = 'plugins/events'`；帧是 `graph`（全图快照）或 `rebuilt`（单行 id + rev）。[E: packages/client/hmr/src/events.ts:44] [E: packages/client/hmr/src/events.ts:50] [E: packages/client/hmr/src/events.ts:12]

`package.json` 的 `dsh.client` 声明 `inject: []`、`platform: 'web'`、`immediately: true`：这是扫进 `window.__DSH_BOOT__` 的图元数据；Cordis 真门是浏览器半边的 `inject = ['modules']`。[E: packages/client/hmr/package.json:34] [E: packages/client/hmr/package.json:37] [E: packages/client/hmr/src/client/index.ts:12]

本包**不**拥有：

- `dsh.client` 扫描、`window.__DSH_BOOT__`、combo `/plugins/??…` 发盘 — [`subsys.client.modules`](modules.md)。HMR 只调用 `graph()` / `artifactBaseline()` / `rebuilt()` / `onRebuilt` / `onGraphChanged`。
- 壳 boot、`immediately` 层 prefetch 策略 — [`subsys.client.web`](web.md)。
- HTTP listen 与 exact-vs-prefix 匹配 — [`subsys.host.webserver`](../host/webserver.md)。
- 共享模块 / 配置文件 HMR（`ctx.hmr`，`@deepseek-ai/dsh-hmr`）— 见本页「两条 HMR」。
- `/api`、会话、模型 turn。client **不**执行 agent loop。第一次提问走 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。浏览器状态层见 [`subsys.client.runtime`](runtime.md)（`packages/client/store` + session-controller 客户端 + ui-renderer）。

`dsh-web-app` **无条件 insert** `id: client-hmr`（无 `disabled`、无 `config`）。[E: packages/bundle/web-app/cordis.patch.yml:196] `pollWatches` 在 `!dirty` 且 mtime/size 与 baseline 相同时 `continue`，不调 `rebuilt`。[E: packages/client/hmr/src/index.ts:77] 改写各包 `lib/client.js` 的是 `pnpm run dev:web`（tsdown `watch: true`）。[E: scripts/dev-web.ts:134] [E: package.json:180] 没有这条 rebuild watcher 时 poll 看不到变化，链空闲。[I]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/hmr/src/index.ts` | node 半边：`apply` 挂 watch + SSE |
| `packages/client/hmr/src/events.ts` | `EVENTS_ENDPOINT`、`PluginsEventFrame`、`parsePluginsEventFrame` |
| `packages/client/hmr/src/client/index.ts` | 浏览器半边：SSE → 热换 |
| `packages/client/hmr/src/invariant.ts` | 伴随核：fiber 卸掉后不应残留 `StatWatcher`（与当前 `setInterval` 实现有漂移，见 Gotcha） |
| `packages/client/hmr/tests/node-half.client.spec.ts` | graph 跟随、stat 变化、map-only 忽略、`ENOENT` dirty、构造窗口 rehash、dispose 停表 |
| `packages/client/hmr/package.json` | `dsh.client.immediately: true`；`exports` 暴露 `.` / `./client` / `./invariant` |
| `packages/bundle/web-app/cordis.patch.yml` | 无条件 insert `client-hmr` |
| `packages/bundle/base/cordis.patch.yml` | 共享 `id: hmr` = `@deepseek-ai/dsh-hmr`，`disabled: !!js "!ctx.get('profileContext')"`，`root: []` |
| `packages/bundle/headless/cordis.patch.yml` | **无** `client-hmr`、无 webserver / modules；不覆盖 `hmr` 行 |
| `packages/boot/hmr/src/index.ts` | profile / home `cordis.patch.yml` 与 profile `package.json` 的 watcher |
| `packages/client/modules/src/index.ts` | `ctx.clientModules`；`rebuilt()` 是 bundle 内容进图的唯一入口 |
| `packages/client/modules/src/client/entries.ts` | 浏览器 `entries.sync` / `entries.reload`（invalidate → prefetch → tearDown → refresh） |
| `scripts/dev-web.ts` | 改写各包 `lib/client.js` 的 watch-build；**不**发 SSE |
| `apps/cli/src/profile-boot.ts` | 始终 `provide('profileContext')`，不再补第三份 HMR |

## 数据模型

| 符号 | 要点 |
|---|---|
| `name` / 组合 `id` | 插件名 `'client-hmr'`；web-app 行 `id: client-hmr`，`name: '@deepseek-ai/dsh-client-hmr'`。graph 行 id 是 **package name**（`entry.options.name`），不是组合 id。 |
| `inject`（node） | `['clientModules', 'webServer']`。`ClientModuleRegistry` 构造 `super(ctx, 'clientModules')`。[E: packages/client/modules/src/index.ts:510] |
| `inject`（browser） | `['modules']`。`modules` 由壳 adopt 后 `ctx.reflect.provide('modules', …)`。[E: packages/client/hmr/src/client/index.ts:12] [E: packages/client/modules/src/client/index.ts:66] |
| `Config.pollIntervalMs` | 正整数，步长 1，缺省 `500`。与 `pnpm run dev:web`（`tsx scripts/dev-web.ts --poll`）源 watcher 缺省 500ms 对齐。[E: package.json:180] [E: scripts/dev-web.ts:339] |
| `WatchedBundle` | `{ path, mtimeMs, size, dirty }`。`dirty` 在 `ENOENT`（文件消失或 `rebuilt` 读盘失败）时置位，避免「同 mtime/size 复活」被当成无变化。 |
| `PluginsEventFrame` | `{ type: 'graph'; graph }` 或 `{ type: 'rebuilt'; id; rev }`。SSE 行是 `data: ${JSON.stringify(frame)}\n\n`。 |
| `EVENTS_ENDPOINT` | `'/plugins/events'`。exact 路由；`/plugins` 前缀是 modules 发盘。 |
| `WebBootEntry.id` | 等于 Loader `entry.options.name`（package name）。`graphRow(id, rev, …)` 把该名写成行 id，url 是 combo `/plugins/??…&rev=`；`rebuilt` 帧与 `findEntry` 都按这个名字对齐。[E: packages/client/modules/src/index.ts:639] [E: packages/client/modules/src/index.ts:372] |

`rebuilt(id)` 重读磁盘、`artifactRevision`（framed sha1 12 位）。rev **没变**则返回当前 rev、不通知；变了才换 `graphRow`、`onRebuilt(id, rev)`、再 `notifyGraphChanged()`。[E: packages/client/modules/src/index.ts:608] [E: packages/client/modules/src/index.ts:610] [E: packages/client/modules/src/index.ts:620] [E: packages/client/modules/src/index.ts:625]

## 控制流

1. **`dsh-web-app` 叠在 `dsh-base` 上，无条件插入本行。** shipped `web` profile 的 bundles 是 `dsh-base` 然后 `dsh-web-app`。web overlay `insert` `id: client-hmr` / `name: '@deepseek-ai/dsh-client-hmr'`（无 `disabled`、无 `config`，吃 schema 缺省）。[E: packages/bundle/web-app/cordis.patch.yml:196] [E: packages/bundle/web-app/cordis.patch.yml:197]

2. **共享 `hmr` 与本行拆开。** base 插入 `@deepseek-ai/dsh-hmr`，`disabled: !!js "!ctx.get('profileContext')"`，`config.root: []`。[E: packages/bundle/base/cordis.patch.yml:28] [E: packages/bundle/base/cordis.patch.yml:30] [E: packages/bundle/base/cordis.patch.yml:32] CLI 始终 `provide('profileContext')`，所以这条行在 CLI 启动的 profile 上是启用的，负责 profile / home `cordis.patch.yml` 与 profile `package.json`。[E: apps/cli/src/profile-boot.ts:298] [E: packages/boot/hmr/src/index.ts:206] `dsh-headless` 不覆盖该行，**也不** insert `client-hmr`。[E: packages/bundle/headless/cordis.patch.yml:21] [E: packages/bundle/headless/cordis.patch.yml:25]

3. **launcher 不再补第三份 HMR。** `patchReload` 字段已删除。`runProfile` 只 `provide('profileContext')`，由 base 的 `dsh-hmr` 自己 `watchConfig`。不要再写 launcher `loader.create({ name: '@deepseek-ai/cordis-plugin-hmr', config: { root: [] } })`。[E: apps/cli/src/profile-boot.ts:298]

4. **`client-hmr` 的 node `apply` 等 `clientModules` 与 `webServer`。** `modules` 行先提供 `ctx.clientModules` 并登记 `/plugins` 前缀。本行随后激活。headless **没有** `webserver` / `modules` / `client-hmr`，insert 只有 `headless-startup`、`headless-runner`（`ptc-runtime` 在 base）。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:21] [E: packages/bundle/headless/cordis.patch.yml:27] `sdk` / `sdk-minimal` / `acp` 同样不叠 `dsh-web-app`，因此没有本行。[I]

5. **`syncWatches@packages/client/hmr/src/index.ts` 按当前 graph 对齐监视集。** 对每个 `ctx.clientModules.graph().entries` 取 `artifactBaseline(row.id)`；路径变了或行没了就 `watched.delete`；新行 `watchRow`。没有「跳过自己」的分支——`modules`/`hmr` 自己的 bundle 也走同一条链。[E: packages/client/hmr/src/index.ts:130] [E: packages/client/hmr/src/index.ts:136] [E: packages/client/hmr/src/index.ts:139]

6. **`watchRow` 先 `statSync` 抓当前 stat，仅在与 host baseline **不一致** 时 `rehash`。** 抓不到文件（`ENOENT`）则写入 `dirty: true` 的占位，等以后 poll。baseline 由 modules 在读字节前捕获；构造窗口里改文件会让第一次 `watchRow` 就 `rebuilt`。[E: packages/client/hmr/src/index.ts:98] [E: packages/client/hmr/src/index.ts:92] 测试钉死：构图读图窗口里改文件，激活后仍会 `rebuilt('pkg-a')`。[E: packages/client/hmr/tests/node-half.client.spec.ts:119] 稳态激活、stat 与 baseline 一致时 **不会** 立刻 `rebuilt`。[E: packages/client/hmr/tests/node-half.client.spec.ts:119]

7. **`ctx.effect` 挂 interval：`setInterval(pollWatches, pollIntervalMs)` 且 `timer.unref()`。** 同时订 `onGraphChanged(syncWatches)`。卸载时 `unsubscribe` + `clearInterval` + `watched.clear()`。[E: packages/client/hmr/src/index.ts:147] [E: packages/client/hmr/src/index.ts:148] [E: packages/client/hmr/src/index.ts:149] [E: packages/client/hmr/src/index.ts:150] 测试：dispose 后再写文件，`rebuiltCalls` 保持 0。[E: packages/client/hmr/tests/node-half.client.spec.ts:133]

8. **`pollWatches`：stat 没变且不 dirty 就 `continue`。** 网络盘没有可靠 inotify，所以是 poll。`statSync` 失败标 dirty；成功则 `rehash` → `ctx.clientModules.rebuilt(id)`。[E: packages/client/hmr/src/index.ts:109] [E: packages/client/hmr/src/index.ts:77] [E: packages/client/hmr/src/index.ts:79] 只改 `.map`、可执行 bundle 的 mtime/size 不变则不 `rebuilt`。[E: packages/client/hmr/tests/node-half.client.spec.ts:122]

9. **`rebuilt` 抛 `ENOENT` 时保留 dirty、不改 mtime。** 其它错误只 `logger.warn`，然后仍把当前 stat 写成 baseline 并清 dirty。文件消失再以相同 mtime/size 回来，必须靠 dirty 才能再 hash；测试用固定 `utimes` 钉这一点。[E: packages/client/hmr/src/index.ts:82] [E: packages/client/hmr/src/index.ts:93] [E: packages/client/hmr/tests/node-half.client.spec.ts:184]

10. **`rebuilt@ClientModuleRegistry` 才是内容进图的入口。** 读 bundle + source map、`artifactRevision`；rev 相同则静默返回。变了才换 `graphRow`（url 带 `&rev=`）、通知 `onRebuilt`（单个 listener 抛错不得打死 poll）、再 `notifyGraphChanged`。[E: packages/client/modules/src/index.ts:610] [E: packages/client/modules/src/index.ts:733] [E: packages/client/modules/src/index.ts:620] [E: packages/client/modules/src/index.ts:625]

11. **SSE 信道是 exact `/plugins/events`。** `webServer.register({ kind: 'exact', path: EVENTS_ENDPOINT, … })`。`WebServer.match` 先查 exact 表，miss 才 longest-prefix。因此本路由压过 modules 的 `/plugins` 前缀。[E: packages/client/hmr/src/index.ts:176] [E: packages/client/hmr/src/index.ts:207] [E: packages/host/webserver/src/index.ts:39] [E: packages/host/webserver/src/index.ts:320] 测试断言登记的是 `{ kind: 'exact', path: EVENTS_ENDPOINT }`。[E: packages/client/hmr/tests/node-half.client.spec.ts:110] `modules` 把 `/plugins` 登成 prefix。[E: packages/client/modules/src/index.ts:539] `bundleResource` 对未知路径返回 `{ status: 404 }`，`serveBundle` 再 `writeHead(response.status)`。[E: packages/client/modules/src/index.ts:992] [E: packages/client/modules/src/index.ts:1154]

12. **非 GET/HEAD 回 405；GET/HEAD 都进 `connect`。** `connect` 写 `text/event-stream` + `cache-control: no-cache`，先打注释行 `: connected\n\n`（没有 rebuild 时通道也活着），再推一帧 `{ type: 'graph', graph }`，把 `ServerResponse` 放进 `connections`。[E: packages/client/hmr/src/index.ts:182] [E: packages/client/hmr/src/index.ts:163] [E: packages/client/hmr/src/index.ts:169] [E: packages/client/hmr/src/index.ts:170]

13. **`onRebuilt` 把 `{ type: 'rebuilt', id, rev }` 写给每个连接。** 卸载时 `unsubscribe`、拆路由、`res.destroy()` 全部连接。[E: packages/client/hmr/src/index.ts:190] [E: packages/client/hmr/src/index.ts:197] [E: packages/client/hmr/src/index.ts:197]

14. **浏览器 `apply` 用 `EventSource(EVENTS_ROUTE)`。** `EVENTS_ROUTE` 是 `'plugins/events'`（document-relative）。`message` 里 `JSON.parse` 再 `parsePluginsEventFrame`；坏 JSON / invalid 帧 `logger.warn` 丢弃。未知 `type` 返回 `kind: 'unknown'` 并忽略。[E: packages/client/hmr/src/client/index.ts:28] [E: packages/client/hmr/src/events.ts:50] [E: packages/client/hmr/src/events.ts:39]

15. **`graph` 帧走 `entries.sync`，`rebuilt` 帧走 `entries.reload`。** 两者都进 `ClientEntries` 的串行 queue，交错 dispose/execute 会弄坏单槽交接。[E: packages/client/hmr/src/client/index.ts:21] [E: packages/client/modules/src/client/entries.ts:116]

16. **`entries.reload` 顺序：`invalidateForReplacement` 必须先于 `prefetch`。** 活着的 factory 会让二次执行变成重复登记抛错。随后 `tearDownEntryFiber` → `removeOwnedStyles` → `import` → `entry.refresh()`。[E: packages/client/modules/src/client/entries.ts:178] [E: packages/client/modules/src/client/entries.ts:179] [E: packages/client/modules/src/client/entries.ts:181]

17. **teardown 仍必须 registry-first。** `tearDownEntryFiber` 先 `registry.delete` 再清 fiber；vendor Loader 的 self-dispose 分支若仍持有 callback 会把 entry 永久 `disabled`。[E: packages/client/modules/src/client/entry-lifecycle.ts:9]

18. **下游不靠 HMR 记账。** 依赖方 fiber 的 `_refresh` 把 epoch 编成所 inject 的 provider `fiber.uid` 串。[E: vendor/cordis/src/fiber.ts:611] [E: vendor/cordis/src/fiber.ts:620] provider 被换掉则 epoch 字符串变：先 `_unload`，卸完若新 epoch 不是 `INACTIVE` 再 `_reload`。[E: vendor/cordis/src/fiber.ts:635] [E: vendor/cordis/src/fiber.ts:692] 换 connection / store 层会原生级联到 UI 依赖。

19. **自己也可以被热换。** 本包是 graph 行（`dsh.client`）。旧 closure 里的 `reload` 继续跑；旧 fiber 的 effect 关掉 `EventSource`；新 `apply` 再开一条。空隙里的帧会丢，下一次 rebuild 再通知。

20. **没有 `dev:web` 时链空闲。** `scripts/dev-web.ts` 只对 `dsh.client.platform === 'web'` 的包（以及 client-preset 的静态库包）跑 tsdown watch，改写 `lib/client.js`；SSE 仍由本包发出。`package.json` 的 `dev:web` 带 `--poll`（缺省 500ms），理由同样是网络盘没有 inotify。[E: scripts/dev-web.ts:84] [E: scripts/dev-web.ts:134] [E: scripts/dev-web.ts:136] 生产/未改 bundle 时 poll 每 500ms `statSync` 一次；mtime/size 未变且不 dirty 则 `continue`，即使进了 `rebuilt` 也是 rev 相同则静默、不发 SSE。[E: packages/client/hmr/src/index.ts:52] [E: packages/client/modules/src/index.ts:610]

## 设计动机

- **client 热换与配置热更新必须拆开。** `@deepseek-ai/dsh-hmr` 吃 Node ESM `loadCache` 和 profile / home `cordis.patch.yml`；浏览器插件是另一套 lazy CJS 表 + Loader entry。base 行在有 `profileContext` 时启用（`root: []` 不扫模块根，只 watch 配置）；client 插件走始终 insert 的 `client-hmr`（仅 `dsh-web-app`）。
- **poll，不是 inotify。** 开发机/网络盘不保证 `fs.watch`。node 半边与 `dev:web --poll` 都按 500ms 默认轮询。
- **无条件挂、默认可空闲。** web 图也留着这一行：没有人改 `lib/client.js` 时只是空转 interval + 一条注释 SSE。headless / sdk / acp 不挂本行。
- **lazy CJS 让热换只动登记。** 执行 bundle 只 `__ModuleLoader__.load({id, factory})`；副作用（含 CSS）在 materialize / `refresh()`。所以可以先登记新 factory、再拆旧 fiber、再 materialize。
- **registry-first 是 Loader 的约束，不是口味。** `Entry.fiber` dispose 后仍留着；`refresh()` 见 fiber 就 no-op。裸 `dispose()` 走 self-dispose 会把 entry 永久 `disabled`。必须先 `registry.delete` 再清 `entry.fiber`。
- **无 rollback。** prefetch 在 invalidate 之后失败：旧 fiber 还在跑（teardown 没开始），模块已无 factory，下一帧从头再来。apply 失败留下 FAILED fiber，给壳的 status 投影。
- **rev 进 URL + immutable cache。** modules 对已登记 combo 回 `public, max-age=31536000, immutable`；热换靠 `invalidate` 把 `reloadUrls` 指到新 `&rev=`，而不是 `no-cache`。[E: packages/client/modules/src/index.ts:164] [E: packages/client/modules/src/index.ts:986]

## Gotcha

- **两条线不要并成一句「web 关了 HMR」。** (1) base 共享 `id: hmr` = `@deepseek-ai/dsh-hmr`，有 `profileContext` 时启用；(2) `dsh-web-app` 始终挂着的 `client-hmr`。关 (1) 并不关掉 UI 插件热换。[E: packages/bundle/base/cordis.patch.yml:28] [E: packages/bundle/web-app/cordis.patch.yml:196]
- **`client-hmr` 不是 `ctx` 服务。** node 半边不 `provide('client-hmr')`，只 `inject` 已有的 `clientModules` / `webServer`。[E: packages/client/hmr/src/index.ts:27] 共享模块 / 配置热更新的服务是 `dsh-hmr` 的 `ctx.hmr`。[E: packages/boot/hmr/src/index.ts:206]
- **graph id 是 package name。** SSE `rebuilt.id` 是 `@deepseek-ai/dsh-…`，不是组合 `id: client-hmr`。
- **`invalidate` 删 `factories` / `loadCache`，并记下 `reloadUrls`。** 函数体不碰 `pendingArrival` 表。[E: packages/client/modules/src/client/system.ts:204] [E: packages/client/modules/src/client/system.ts:247] [E: packages/client/modules/src/client/system.ts:148] `arrive` 对同 URL 复用 in-flight Promise，`finally` 才 `pendingArrival.delete`。[E: packages/client/modules/src/client/system.ts:130] [E: packages/client/modules/src/client/system.ts:131] 因此 `invalidate` 不取消在途 `arrive`；boot 尚未落地时撞上 `rebuilt`，可能 materialize 到 rebuild 前的字节，下一帧自愈。[I]
- **浏览器现在消费 `graph` 帧。** `entries.sync(frame.graph)` 会按新图调和 Loader 行；`rebuilt` 仍走 `entries.reload`。[E: packages/client/hmr/src/client/index.ts:21]
- **HEAD `/plugins/events` 也走 `connect`。** 会打开一条 SSE 写循环，不是空 HEAD。
- **`immediately: true` 只影响壳的 stage-one prefetch。** 热换语义与惰性行相同。[E: packages/client/web/src/boot.ts:11]
- **伴随 invariant 仍在数 `StatWatcher`。** 现行 `apply` 用 `setInterval` + `statSync`，不再 `fs.watchFile`。`StatWatcher` 基线差在当前实现上通常是 0。测试靠「dispose 后再写文件不再 `rebuilt`」证明卸载，不靠 invariant。[U] [E: packages/client/hmr/src/index.ts:149] [E: packages/client/hmr/src/invariant.ts:18]
- **本页不是模型可见面。** 热换不进 session log；**model-visible ⟺ logged** 管的是 agent 工具 / preset，不是这条 dev 信道。
- **旧路径 `packages/client/web/src/boot.tsx` 不存在**；壳入口是 `packages/client/web/src/boot.ts` 的 `AppWebEntry`。

## Seam 三角

| 缝 | Definition | Provider | Consumer | base | web-app | headless / sdk / acp |
|---|---|---|---|---|---|---|
| 运行时装 UI 插件 | npm `@deepseek-ai/dsh-client-hmr`；组合 `id: client-hmr`；双面 `name: 'client-hmr'` | **host** 行 insert；node `apply` 提供 watch + SSE | 浏览器半边 `EventSource` + `ctx.modules` / `ctx.loader` | 无此行 | **无条件 insert**；无 rebuild 则空闲 | **无** webserver / modules / 本行 |
| `ctx.clientModules.rebuilt` | `ClientModuleRegistry.rebuilt(id)`：重哈希，rev 变才通知 | **host** 行 `id: modules`（[`subsys.client.modules`](modules.md)） | node 半边 `pollWatches` / `watchRow` | 无 `modules` | insert `modules`；本行 `inject: [clientModules, webServer]` | 无 |
| `GET /plugins/events` | `EVENTS_ENDPOINT` + `PluginsEventFrame` | node 半边 `webServer.register` exact | 浏览器半边 `EventSource`；unknown/invalid 忽略 | 无 | exact 压过 `/plugins` prefix | 无 |
| 浏览器 `modules` 热换钩 | `ClientEntries.sync` / `reload` | 壳建 `ClientModuleSystem`，modules 行 `provide('modules')` | 浏览器半边 `EventSource` | 无浏览器壳 | [`subsys.client.web`](web.md) 先 adopt modules | 无 |
| 共享 `ctx.hmr` | `@deepseek-ai/dsh-hmr`；`Hmr.Config.root` | base 行 `id: hmr`，`disabled: !!js "!ctx.get('profileContext')"`，`root: []` | 该服务自己 `watchConfig` profile / home yml | insert；CLI 有 `profileContext` 则启用 | 不覆盖该行 | 行仍在（有 profileContext 则启用），但无 client-hmr |
| Loader entry 生命 | `Entry.refresh` / `internal/plugin` case 4 | vendored Loader（[`subsys.vendor.loader`](../vendor/loader.md)） | 浏览器半边必须 registry-first，否则 entry 被永久 disable | host 树用同一 Loader | 浏览器另有一份 Loader，`internal` 接到 `ClientModuleSystem` | 仅 host Loader，无 client entry |

换 Provider 会带走 Consumer：去掉 `client-hmr` 行则浏览器永远收不到 `rebuilt`（`/plugins/events` 变 404）；去掉 `modules` 则本行因 `inject` pending 不激活；把共享 `hmr` 整行删掉则 profile / home patch 不再热更新。Definition（服务名、帧形状、`rebuilt` 合同）不变。

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
- packages/client/modules/src/client/entries.ts
- packages/client/modules/src/client/entry-lifecycle.ts
- packages/client/web/src/boot.ts
- packages/host/webserver/src/index.ts
- packages/boot/hmr/src/index.ts
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
- [`subsys.client.modules`](modules.md) — `__DSH_BOOT__`、combo `/plugins`、`rebuilt` 的 Provider。
- [`subsys.client.web`](web.md) — `AppWebEntry` 壳；`immediately` prefetch 与 adopt `modules`。
- [`subsys.client.runtime`](runtime.md) — `packages/client/store` + session-controller 客户端 + ui-renderer。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — web overlay：insert `client-hmr`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — 共享 `id: hmr` 默认 `disabled: true`。
- [`subsys.composition.bundle-headless`](../composition/bundle-headless.md) — 无浏览器 roster，无 `client-hmr`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面；`--host 0.0.0.0` 拒在 `webStartup` 之前。
- [`subsys.host.webserver`](../host/webserver.md) — exact / prefix 路由表；本页的 SSE 占 exact 座。
- [`subsys.vendor.loader`](../vendor/loader.md) — `Entry.refresh` 与 self-dispose `disabled: true`。
