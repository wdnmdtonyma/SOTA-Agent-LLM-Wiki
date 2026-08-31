---
id: subsys.client.web
title: web shell
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/web/src/index.ts
  - packages/client/web/src/boot.ts
  - packages/client/web/src/boot-page.ts
  - packages/client/web/src/seed.ts
  - packages/client/web/src/platform.ts
  - packages/client/web/src/loader-status.ts
  - packages/client/ui-renderer/src/index.ts
  - packages/client/ui-renderer/src/client/index.ts
  - packages/client/ui-renderer/src/client/app.tsx
  - packages/client/ui-renderer/src/client/bind.ts
  - apps/web/src/main.ts
  - apps/web/vite.config.ts
  - apps/web/index.html
  - packages/client/modules/src/client/manifest.ts
  - packages/client/modules/src/client/index.ts
  - packages/client/modules/src/client/system.ts
  - packages/client/modules/src/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/client/web/tests/boot.client.spec.ts
  - apps/web/tests/assembled-boot.ts
  - apps/web/tests/vite-entry.e2e.ts
  - packages/host/frontend-static/src/index.ts
  - packages/host/webserver/src/index.ts
  - vendor/loader/src/config/tree.ts
  - packages/client/tsdown.client.ts
  - packages/client/ui-layout/src/client/index.ts
symbols:
  - AppWebEntry
  - BootPage
  - PLATFORM_MODULES
  - getStaticModules
  - UiRendererService
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - surface.profiles.web
  - surface.web.workbench
  - subsys.client.modules
  - subsys.client.runtime
  - subsys.client.ui-layout
  - subsys.composition.bundle-web-app
  - subsys.host.frontend-static
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-client-web` 的产品是无框架 boot 内核 `AppWebEntry`：等待可选的 `__DSH_BOOT_READY__`，用 host 注入的 `window.__ModuleLoader__` 建 `ClientModuleSystem`，先画 `BootPage`（HARNESS），prefetch `immediately` 行，把 vendored Cordis `Loader.internal` 接到模块表，等全部 plugin fiber `ACTIVE` 后 `ctx.inject(['uiRenderer'])` 把 mount 点交给 `@deepseek-ai/dsh-client-ui-renderer`。`apps/web` 只找 `#root`。client **不**执行模型 turn。Web 是默认 GUI 安装路径；本仓没有 shipped TUI。其它宿主入口是 `dsh --profile headless|sdk|sdk-minimal|acp`。

## 能回答的问题

- `apps/web` 自己做了什么？没有 `window.__DSH_BOOT__` / `__ModuleLoader__` 时，裸 Vite 能否当独立应用跑？
- `AppWebEntry.run()` 的顺序是什么？`loader.internal` 为什么必须在任何 entry `create` 之前赋值？
- 壳为什么零 composition 决策？模块系统为何必须由 `__ModuleLoader__.create` 在 Cordis 之前建好？
- 单包 `prefetch` 失败为什么静默？失败 UI 是 `BootPage.fail` 还是 fiber `status` 一门切 React？
- `dsh-client-ui-renderer` 是不是第二套壳？`createSlotRenderer` / `buildRenderApp` / `bindSnapshotSelector` 谁安装？
- `dsh-base` / `dsh-web-app` / `dsh-headless` / `sdk` / `sdk-minimal` / `acp` 谁挂这套浏览器壳？

## 职责边界

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`，capability seam 是 Definition / Provider / Consumer。**model-visible ⟺ logged**。浏览器壳只属于 **client 面**：不实现 `ctx.fs`、不跑 agent loop、不 `provide('webStartup')`。Web 是默认 GUI（`dsh web` ≡ `--profile web`，`patchReload: 'live'`）；另外四个 shipped profile 是 `headless` / `sdk` / `sdk-minimal` / `acp`（均为 `startup`），它们不叠这套 SPA 壳。launcher 在 `provide('webStartup')` **之前**拒绝 `--host 0.0.0.0`，进程不 bind。 [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/bundle/web-app/src/startup.ts:75]

本包拥有：

- 壳内核 `AppWebEntry`（`run` / `dispose`）与无 React 的 `BootPage`。
- 冻结模块表种子 `PLATFORM_MODULES` / `getStaticModules()`。
- 壳自有 `KernelSignal` 镜像 `STATE_LABELS`（不得 value-import 任何 plugin 包）。

本包**不**拥有：

- host 图里有哪些 `dsh.client` 行、`immediately` 谁为真 —— composition / 各包 `package.json` 的 `dsh.client`；壳只消费 `__DSH_BOOT__` 与 `__ModuleLoader__`。扫描与 index 注入在 [`subsys.client.modules`](modules.md)。
- HTTP `/api`、信任篱笆 —— [`subsys.client.connection`](connection.md)。
- snapshot store / `SlotMap` / session 客户端对象层 —— [`subsys.client.runtime`](runtime.md)（`dsh-client-store` + `packages/api/session-controller/src/client/`）。
- `'root'` 上的 `AppFrame` 与四子槽 —— [`subsys.client.ui-layout`](ui-layout.md)。
- 槽 renderer 与 `ctx.uiRenderer.mount` —— `@deepseek-ai/dsh-client-ui-renderer` 的 **client** `apply`；host 半边 `apply()` 是空函数。 [E: packages/client/ui-renderer/src/index.ts:4] [E: packages/client/ui-renderer/src/client/index.ts:88]
- 静态 dist 与 SPA fallback —— [`subsys.host.frontend-static`](../host/frontend-static.md)。
- 模型 turn —— [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。

旧包 `packages/client/web-react`、`packages/client/runtime`、`boot.tsx` / `AppRoot.tsx` / `app-shell.ts` **已删除**。不要把 `APP_SHELL_ID` 或 `createSlotRenderer` 写成仍由 `dsh-client-web` 安装。

`@deepseek-ai/dsh-client-web` **没有** `dsh.client` 声明：壳由 Vite 打进 frontend dist，不经 `/plugins/<id>/client.js` 再拉自己。

## 关键文件

| 路径 | 角色 |
|---|---|
| `apps/web/src/main.ts` | 唯一 Vite 入口：取 `#root`，`new AppWebEntry(el).run()` |
| `apps/web/index.html` | `#root` + `/src/main.ts`；host 把 `__DSH_BOOT__` 与 loader facade 注入 `<head>` |
| `apps/web/vite.config.ts` | `serve` 直接抛错；`node:module` stub；`process.versions.node` 成 `"0.0.0"` |
| `packages/client/web/src/index.ts` | 库出口：`AppWebEntry` / `PLATFORM_MODULES` / `getStaticModules` |
| `packages/client/web/src/boot.ts` | `AppWebEntry.run`：模块表 → Loader → `uiRenderer.mount` |
| `packages/client/web/src/boot-page.ts` | 无框架 loading / fail-loud 页 |
| `packages/client/web/src/seed.ts` | `getStaticModules()` 与 `PLATFORM_MODULES` `satisfies` 对齐 |
| `packages/client/web/src/platform.ts` | `PLATFORM_MODULES`：tsdown client externals 真源 |
| `packages/client/ui-renderer/src/client/index.ts` | `apply`：`SlotRegistry` + `createSlotRenderer` + `provide('uiRenderer')` |
| `packages/client/ui-renderer/src/client/app.tsx` | `buildRenderApp`：全程序唯一的 `ctx.slots.renderSlot('root', {})` |
| `packages/client/modules/src/client/index.ts` | `createClientModuleSystem` + `provide('modules')` |
| `packages/bundle/web-app/cordis.patch.yml` | `id: modules` / `ui-renderer` 等 browser roster |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AppWebEntry` | 持有 mount 点、可选 `BootSeams.loadBundle`、`BootPage`。`run()` **不 reject**：缺 facade / 畸形 manifest / plugin 失败都 `page.fail`。 |
| `BootManifest` | `parseBootManifest` 要求对象 + 字符串 `rev` + 数组 `entries` **和** `batches`。 |
| `PLATFORM_MODULES` | `react` / `react/jsx-runtime` / `react-dom` / `react-dom/client` / `@deepseek-ai/cordis` / `@deepseek-ai/dsh-client-store` / `@deepseek-ai/dsh-client-ui-slots` / `@deepseek-ai/dsh-client-ui-primitives`。`PRELOADED_CLIENT_EXTERNALS` 现为空数组。 |
| `UiRendererService` | `{ mount(container): disposer }`。壳在 Loader 静止后 `inject(['uiRenderer'])` 才调用。 |
| `BootSeams` | `Pick<ClientModuleCreateOptions, 'loadBundle'>`。显式 seams 覆盖 `__DSH_TRANSPORT__.loadBundle`。 |
| `immediately` | `dsh.client.immediately === true` 才进 stage-one prefetch。shipped 例：`modules` / `connection` / `hmr` / `locale` / `ui-theme` / `ui-renderer`。`ui-layout` 默认不标。 |

## 控制流

1. **只有 `web` profile 叠 browser roster。** `PROFILE_TEMPLATES.web` 是 `dsh-base` 然后 `dsh-web-app`，`patchReload: 'live'`。`headless` / `sdk` / `acp` 叠对应 app bundle 且 `startup`；`sdk-minimal` **只**叠 `dsh-sdk-minimal`。`PROFILE_TEMPLATES.headless` 的 bundle 是 `dsh-base` + `dsh-headless`。headless **patch** 才挂 `headless-startup` / `headless-runner`，**没有** `webserver`、**没有** browser roster。本仓没有 shipped TUI。 [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:154] [E: packages/bundle/web-app/cordis.patch.yml:152] [E: packages/bundle/headless/cordis.patch.yml:22]

2. **`--host 0.0.0.0` 在 `provide('webStartup')` 之前被拒。** 字面量等于 `'0.0.0.0'` 则 `program.error`；`webserver` `inject: [webStartup]` 保持 pending。缺省 bind 是 `127.0.0.1:3080`。 [E: packages/bundle/web-app/src/startup.ts:75] [E: packages/bundle/web-app/cordis.patch.yml:115]

3. **host 把图插进 SPA HTML。** `frontend-static` 占 fallback：GET/HEAD 发 dist；index 先 `webServer.renderIndex`（注入表 + taps），miss 是 **404**（不再回 `index.html` 200）。`ClientModuleRegistry` 把 `__DSH_BOOT__` 作为 `kind: 'global'` 注入行。裸 Vite 拒听是 `rejectStandaloneServe`。 [E: packages/host/frontend-static/src/index.ts:100] [E: packages/host/frontend-static/src/index.ts:124] [E: packages/client/modules/src/index.ts:522]

4. **`apps/web` 只找 `#root`。** `getElementById('root')` 为 `null` 则抛 `web app: missing #root`；否则 `void new AppWebEntry(el).run()`。 [E: apps/web/src/main.ts:4] [E: apps/web/src/main.ts:6]

5. **`run()` 先等 `__DSH_BOOT_READY__`（若有），再要求 `__ModuleLoader__`。** 缺 facade 抛 `web boot: window.__ModuleLoader__ bootstrap facade is missing`，被外层 catch 画 fail 页。`moduleLoader.create({ boot: win.__DSH_BOOT__, staticModules, loadBundle? })` 内部 `parseBootManifest`。测试钉死缺 `__DSH_BOOT__` 时页面含 `window.__DSH_BOOT__ is missing or not an object`。 [E: packages/client/web/src/boot.ts:54] [E: packages/client/web/src/boot.ts:58] [E: packages/client/web/src/boot.ts:68] [E: packages/client/modules/src/client/manifest.ts:169] [E: packages/client/web/tests/boot.client.spec.ts:76]

6. **prefetch 与 Loader 挂载并行；entry `create` 等整层 prefetch。** `prefetchImmediateTier` 对 `plugins.filter(row => row.immediately)` 调 `modules.prefetch(id)`；单包 `.catch(() => {})`。已在 `loadCache` 的 id（含 bootstrap `modules`）prefetch 直接 return。 [E: packages/client/web/src/boot.ts:105] [E: packages/client/web/src/boot.ts:107] [E: packages/client/modules/src/client/system.ts:234]

7. **`internal` 必须在任何 entry 存在之前注入。** `runPluginBoot`：`await ctx.plugin(Loader)`，立刻 `loader.internal = this.modules`。vendored `EntryTree.import`：有 `internal` 走 `internal.import`；否则相对路径或裸 `import(name)`。 [E: packages/client/web/src/boot.ts:114] [E: packages/client/web/src/boot.ts:116] [E: vendor/loader/src/config/tree.ts:154]

8. **按 manifest 全量 `loader.create`，不再追加伪包 `APP_SHELL_ID`。** `rows = this.manifest.plugins.map(row => row.id)`。`Promise.all` 并发 create；无 fiber 则 `page.setState(..., 'failed')`。`modules` 的 `apply` 读闭包里的 `moduleSystem`，未 `createClientModuleSystem` 则抛 `client-modules: createClientModuleSystem must run before plugin boot`。 [E: packages/client/web/src/boot.ts:124] [E: packages/client/web/src/boot.ts:130] [E: packages/client/modules/src/client/index.ts:59]

9. **`loader.await()` + 全 fiber `ACTIVE`，否则 fail 列出谁。** `assertEntriesActive`：无 fiber → `import failed`；`pending` → 列出缺失 inject 服务。有失败则抛 `web boot: N entr(y|ies) did not activate\n…`。catch 调 `page.fail`，**不**把 mount 交给 React。 [E: packages/client/web/src/boot.ts:133] [E: packages/client/web/src/boot.ts:156] [E: packages/client/web/src/boot.ts:83]

10. **成功后依赖 fiber 调 `uiRenderer.mount`。** `ctx.inject(['uiRenderer'], (scope) => scope.effect(() => scope.uiRenderer.mount(this.container)))`。替换 `uiRenderer` 会重挂应用。 [E: packages/client/web/src/boot.ts:97] [E: packages/client/web/src/boot.ts:98]

11. **ui-renderer client `apply` 安装槽渲染并提供 mount 面。** 新建 `SlotRegistry`，`slots.install(createSlotRenderer())`，`provide('uiRenderer', { mount })`。`mountApp` 若容器里有 `[data-dsh-boot]` 则 `hydrateRoot` + `BootHandoff`，否则 `createRoot` + `flushSync`。host 半边 `apply()` 空。 [E: packages/client/ui-renderer/src/client/index.ts:89] [E: packages/client/ui-renderer/src/client/index.ts:91] [E: packages/client/ui-renderer/src/client/index.ts:74] [E: packages/client/ui-renderer/src/index.ts:4]

12. **`buildRenderApp` 只渲染 `'root'`。** `() => ctx.slots.renderSlot('root', {})`。`ui-layout` 一次 `register` 把 `AppFrame` 放进 `'root'`，声明 `sidebar` / `conversation` / `details` / `shell.overlay`。壳不点名任何一个 `ui-*`。 [E: packages/client/ui-renderer/src/client/app.tsx:21] [E: packages/client/ui-layout/src/client/index.ts:141]

13. **裸 Vite `serve` 在 listen 之前被拒。** `env.command === 'serve'` 抛含 `window.__DSH_BOOT__` 的 `STANDALONE_ERROR`。e2e 钉死 `Server.listen` 未调用。正确路径是 `dsh web`（可另开 `pnpm run dev:web` 给 client-hmr）。`webSurfacePrompt` 另有 model-visible 取向句，不是 Vite 拒听实现。 [E: apps/web/vite.config.ts:35] [E: apps/web/tests/vite-entry.e2e.ts:59] [E: packages/bundle/web-app/src/index.ts:153]

14. **settled 之后的第一句提问不在本页执行。** composer → session client → host Remote `prompt` → `followup` 打开 turn。见 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。

## 设计动机

- **壳自给自足、无 React。** loading / fail-loud 不得 value-import plugin 包。`loader-status.ts` 手写 `FIBER_STATE` 镜像。插件全挂了，用户仍看得到谁没 ACTIVE。
- **零 composition。** 谁进图、谁 `immediately`、preset 挂哪些 tool，全是 host / bundle / 每会话 preset 的事。壳不再追加 `APP_SHELL_ID`。
- **prefetch 整层屏障，不是 fail-fast。** 一个坏 bundle 若在 prefetch 炸掉 `Promise.all`，其它 immediately 行的 factory 也登记不上。
- **模块系统不能经自己到达。** HTML facade 先 materialize modules bundle 并 `createClientModuleSystem`；plugin `apply` 只 `provide('modules')`。
- **ui-renderer 是绑定，不是壳。** `createSlotRenderer` 实现 `SlotRenderer`；`bindSnapshotSelector` 是整栈 uSES 构造器。host 图有 `id: ui-renderer`。
- **默认产品面是本地 Web GUI。** `dsh-base` 给执行缝；`dsh-web-app` 才插入这套壳；`dsh-headless` 直接 runner。`sdk` / `sdk-minimal` / `acp` 是另外三条 startup 宿主，不是第二套 SPA。

## Gotcha

- **缺 `__ModuleLoader__` / 畸形 `__DSH_BOOT__` 仍有 BootPage。** 构造器立刻 `new BootPage(container)`；`run()` catch 写 fail 文案，不再让 Promise reject 成白屏。 [E: packages/client/web/src/boot.ts:38] [E: packages/client/web/src/boot.ts:83]
- **没有 `settled` KernelSignal 一门。** 真 UI 是否出现只取决于 `uiRenderer.mount` 是否跑到；失败停在 `BootPage`。
- **pending 没有超时。** `assertEntriesActive` 是 fail-loud 补偿。
- **`PLATFORM_MODULES` 与 `getStaticModules()` `satisfies` 互锁。** tsdown `clientExternals` 基线就是 `PLATFORM_MODULES` 加空的 `PRELOADED_CLIENT_EXTERNALS`。 [E: packages/client/web/src/seed.ts:36] [E: packages/client/tsdown.client.ts:410]
- **Vite 不再 alias 到 `boot.tsx`。** 只 stub `node:module`；`process.versions.node` `"0.0.0"` 让 vendored loader `fromInternal()` 走空槽。 [E: apps/web/vite.config.ts:216] [E: apps/web/vite.config.ts:224]
- **同页第二次 live `create` 会炸。** `registrationTarget.mode !== 'queue'` 抛 `client-modules: window.__ModuleLoader__.create called after module-system boot`。 [E: packages/client/modules/src/client/system.ts:103]
- **在 `'root'` 上再 `register` 会阴影整框。** 加法面是 `shell.overlay`（list）。
- **`WebServer.Config.host` 仍承认 `'0.0.0.0'`。** 旗标路径被拒 ≠ overlay 不能改 bind。 [E: packages/host/webserver/src/index.ts:61]
- **jsdom 装配图从 workspace `dsh.client` 扫出来。** `assembled-boot.ts` 用 `loadBundle` 喂 `lib/client.js`；bootstrap id 固定 `@deepseek-ai/dsh-client-modules`。 [E: apps/web/tests/assembled-boot.ts:126]
- **SPA miss 是 404。** 不要再写 frontend-static 把未知路径回 `index.html`。 [E: packages/host/frontend-static/src/index.ts:100]

## Seam 三角

capability seam = Definition / Provider / Consumer。下表对照 `dsh-base`、叠在它之后的 `dsh-web-app`、叠在它之后的 `dsh-headless`。`sdk` / `sdk-minimal` / `acp` 与 headless 一样：**无本页这条 SPA 缝**。

| 缝 | Definition | Provider | Consumer | dsh-base | dsh-web-app | dsh-headless |
|---|---|---|---|---|---|---|
| 浏览器壳 `AppWebEntry` | `dsh-client-web`：`run()` 合同 | Vite 入口对 `#root` 调 `new AppWebEntry(el).run()` | 人打开 `dsh web: http://127.0.0.1:<port>` | 无 | **有** | 无 Host HTTP |
| `window.__DSH_BOOT__` / `__ModuleLoader__` | `WebBootGraph` + facade `create` | host modules 注入行 + HTML bootstrap | `AppWebEntry.run` | 无 | **有** | 无 |
| `ctx.modules` / `loader.internal` | `ClientModuleLoader` | facade `createClientModuleSystem`；`modules` 行 `provide` | vendored `EntryTree.import` | 无 | **有** | 无 |
| `ctx.uiRenderer` | `UiRendererService.mount` | `id: ui-renderer` client `apply` | `AppWebEntry.mountApp` | 无 | **有** | 无 |
| React 槽渲染 | `SlotRenderer`（ui-renderer + ui-slots） | `slots.install(createSlotRenderer())` | `buildRenderApp` → `renderSlot('root')` | 无 | **有** | 无 |
| `PLATFORM_MODULES` 种子 | `platform.ts` 字面量 | `getStaticModules()`；tsdown externals | 每个 client factory `require` | 无 | **有** | 无 |
| `ctx.webStartup` → listen | `WEB_STARTUP_SERVICE` | host `web-startup` | `webserver` / `web-runtime` | 无 | **有**；`--host 0.0.0.0` 拒在 provide 前 | 无（`headlessStartup`） |

换掉 `AppWebEntry` 会带走 fail-loud 页与 mount 时序，但 `__DSH_BOOT__` / `/plugins` 仍由 modules 定义。删掉 web-app 的 `id: modules` / `id: ui-renderer`，壳 parse 到空图或 `inject(['uiRenderer'])` 永不 ACTIVE。

## Sources

- packages/client/web/src/index.ts
- packages/client/web/src/boot.ts
- packages/client/web/src/boot-page.ts
- packages/client/web/src/seed.ts
- packages/client/web/src/platform.ts
- packages/client/web/src/loader-status.ts
- packages/client/ui-renderer/src/index.ts
- packages/client/ui-renderer/src/client/index.ts
- packages/client/ui-renderer/src/client/app.tsx
- packages/client/ui-renderer/src/client/bind.ts
- apps/web/src/main.ts
- apps/web/vite.config.ts
- apps/web/index.html
- packages/client/modules/src/client/manifest.ts
- packages/client/modules/src/client/index.ts
- packages/client/modules/src/client/system.ts
- packages/client/modules/src/index.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/src/startup.ts
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/client/web/tests/boot.client.spec.ts
- apps/web/tests/assembled-boot.ts
- apps/web/tests/vite-entry.e2e.ts
- packages/host/frontend-static/src/index.ts
- packages/host/webserver/src/index.ts
- vendor/loader/src/config/tree.ts
- packages/client/tsdown.client.ts
- packages/client/ui-layout/src/client/index.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮 session prompt；本页停在 `uiRenderer.mount` 与 `renderSlot('root')`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — `dsh web` alias、`--host` / `--port`、web overlay。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台槽位与 chrome 可见面。
- [`subsys.client.modules`](modules.md) — node 半边扫 `dsh.client`、combo、`__DSH_BOOT__`；浏览器半边模块表。
- [`subsys.client.runtime`](runtime.md) — `dsh-client-store` + session-controller 客户端 + ui-renderer 对象层。
- [`subsys.client.ui-layout`](ui-layout.md) — `AppFrame` 占 `'root'`，声明四子槽。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 把这套 roster 插进 host 树。
- [`subsys.host.frontend-static`](../host/frontend-static.md) — dist fallback 与 index render。
