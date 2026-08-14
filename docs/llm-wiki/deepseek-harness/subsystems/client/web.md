---
id: subsys.client.web
title: web shell
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/web/src/index.ts
  - packages/client/web/src/app-shell.ts
  - packages/client/web/src/boot.tsx
  - packages/client/web/src/AppRoot.tsx
  - packages/client/web/src/seed.ts
  - packages/client/web/src/platform.ts
  - packages/client/web/src/app.tsx
  - packages/client/web/src/loader-status.ts
  - packages/client/web/src/DocumentTitle.tsx
  - packages/client/web-react/src/index.ts
  - packages/client/web-react/src/bind.ts
  - packages/client/web-react/src/scoped-slots.tsx
  - packages/client/web-react/src/session-provider.tsx
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
  - packages/client/web/tests/app-root.client.spec.tsx
  - packages/client/web/tests/app-shell.client.spec.tsx
  - packages/client/web/tests/app.client.spec.tsx
  - apps/web/tests/assembled-boot.ts
  - apps/web/tests/vite-entry.e2e.ts
  - packages/host/frontend-static/src/index.ts
  - packages/host/webserver/src/index.ts
  - vendor/loader/src/config/tree.ts
  - packages/client/tsdown.client.ts
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/runtime/src/client/slots.ts
symbols:
  - AppWebEntry
  - AppRoot
  - APP_SHELL_ID
  - PLATFORM_MODULES
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - surface.profiles.web
  - surface.web.workbench
  - subsys.client.modules
  - subsys.client.ui-layout
  - subsys.composition.bundle-web-app
  - subsys.host.frontend-static
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-web` 的产品是浏览器壳 `AppWebEntry`：解析 host 注入的 `window.__DSH_BOOT__`，先画 loading，再把 vendored Cordis `Loader` 接到 `ClientModuleSystem`，等 `immediately` prefetch 完再 adopt `modules` 与其余 plugin 行，最后一次 `settled` 把 `AppRoot` 切到 `appShell.renderApp()`。`apps/web` 只找 `#root`。client **不**执行模型 turn。Web 是默认安装路径；本仓没有 shipped TUI。

## 能回答的问题

- `apps/web` 自己做了什么？没有 `window.__DSH_BOOT__` 时，裸 Vite 能否当独立应用跑？
- `AppWebEntry.run()` 的两阶段顺序是什么？`loader.internal` 为什么必须在任何 entry `create` 之前赋值？
- 壳为什么零 composition 决策？`modules` 行为什么必须由 kernel adopt，plugin-row 循环为什么 skip 它？
- 单包 `prefetch` 失败为什么静默？`AppRoot` 的 gate 是 `settled` 还是 fiber `status`？
- `web-react` 是不是第二套壳？`createSlotRenderer` / `SessionProvider` / `bindSnapshotSelector` 谁安装？
- `dsh-base` / `dsh-web-app` / `dsh-headless` 谁挂这套浏览器壳？

## 职责边界

DSH 是 **Cordis 组合运行时**，主线是 `profile → bundle → agent preset`，capability seam 是 Definition / Provider / Consumer。**model-visible ⟺ logged**：模型看见的工具集必须写进 session log。浏览器壳只属于 **client 面**：不实现 `ctx.fs`、不跑 `ReactLoopAgent`、不 `provide('webStartup')`。Web 是默认安装路径（`dsh web` ≡ `--profile web`）；本仓没有 shipped TUI 包。launcher 在 `provide('webStartup')` **之前**拒绝 `--host 0.0.0.0`，进程不 bind。 [E: packages/bundle/web-app/src/startup.ts:70]

本包拥有：

- 壳内核 `AppWebEntry`（`run` / `dispose`）与 loading / fail-loud 页 `AppRoot`。
- 壳自有伪包 `APP_SHELL_ID`（`@deepseek-ai/dsh-client-app-shell`，无 npm 包）以及它提供的 `ctx.appShell`。
- 冻结模块表种子 `PLATFORM_MODULES` / `getStaticModules()`。
- React 绑定包 `@deepseek-ai/dsh-client-web-react`：`createSlotRenderer`、`SessionProvider`、`bindSnapshotSelector`。不是第二套 boot 链。

本包**不**拥有：

- host 图里有哪些 `dsh.client` 行、`immediately` 谁为真 —— 那是 composition / 各包 `package.json` 的 `dsh.client`；壳只消费 `__DSH_BOOT__`。图的扫描与 `tapIndex` 在 [`subsys.client.modules`](modules.md)。
- HTTP `/api`、信任篱笆、`WebApiClient` —— [`subsys.client.connection`](connection.md)。
- `SlotMap` / `SlotKind` 纯核 —— [`subsys.client.ui-slots`](ui-slots.md)。`ctx.slots` Service 与内建 `'root'` —— [`subsys.client.runtime`](runtime.md)。
- `'root'` 上的 `AppFrame` 与四子槽 —— [`subsys.client.ui-layout`](ui-layout.md)。不要把每个 `ui-*` 当成壳的一部分。
- 静态 dist 与 SPA fallback —— [`subsys.host.frontend-static`](../host/frontend-static.md)。
- 模型 turn / inbox / preset mount —— [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。

`@deepseek-ai/dsh-client-web` **没有** `dsh.client` 声明：壳 bundle 由 Vite 打进 `@deepseek-ai/dsh-web-frontend` dist，不经 `/plugins/<id>/client.js` 再拉自己。

## 关键文件

| 路径 | 角色 |
|---|---|
| `apps/web/src/main.ts` | 唯一 Vite 入口：取 `#root`，`new AppWebEntry(el).run()` |
| `apps/web/index.html` | `#root` + `/src/main.ts`；host 的 `tapIndex` 在 `<head>` 插入 `__DSH_BOOT__` |
| `apps/web/vite.config.ts` | `serve` 直接抛错；alias 把 `@deepseek-ai/dsh-client-web` 指到 `boot.tsx` |
| `packages/client/web/src/index.ts` | 库出口：`AppWebEntry` / `AppRoot` / `APP_SHELL_ID` / `PLATFORM_MODULES` |
| `packages/client/web/src/boot.tsx` | `AppWebEntry.run` 两阶段 boot |
| `packages/client/web/src/AppRoot.tsx` | `settled` 一门；失败留在 loading 页列 fiber |
| `packages/client/web/src/app-shell.ts` | 伪包 `apply`：`slots.install(createSlotRenderer())` + `provide('appShell')` |
| `packages/client/web/src/app.tsx` | `buildRenderApp`：`DocumentTitle` + 全程序唯一的 `ctx.slots.renderSlot('root')` |
| `packages/client/web/src/seed.ts` | `getStaticModules()`：与 `PLATFORM_MODULES` `satisfies` 对齐的静态 import |
| `packages/client/web/src/platform.ts` | `PLATFORM_MODULES`：tsdown client externals 的单一真源 |
| `packages/client/web/src/loader-status.ts` | 壳自有 `KernelSignal` / `STATE_LABELS`（不得 value-import runtime 的 store） |
| `packages/client/web-react/src/index.ts` | React 绑定再出口 |
| `packages/client/modules/src/client/manifest.ts` | `parseBootManifest` / `WebBootGraph` |
| `packages/client/modules/src/client/index.ts` | 浏览器半边 `apply`：读 `__DSH_MODULES__`，`provide('modules')` |
| `packages/bundle/web-app/cordis.patch.yml` | `id: modules` 等 browser roster；base / headless 无此壳 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AppWebEntry` | 持有 mount 点、`BootSeams`（测试替换 `loadBundle`）、kernel 自有 `settled` / `error` / `status`。`run()` 在 manifest 缺失时 **reject**；plugin 阶段失败则 **resolve** 并留在 loading 页。 |
| `BootManifest` | `parseBootManifest` 把 `__DSH_BOOT__` 拆成 `modules[]`（拉 bundle）与 `plugins[]`（`inject` / `immediately`）。缺对象 / 缺 `rev` / 缺 `entries` 抛错。 |
| `APP_SHELL_ID` | `'@deepseek-ai/dsh-client-app-shell'`。只存在于壳的 `registerStatic` 与 loader 行，host 图没有这一行。 |
| `MODULES_ID` | `'@deepseek-ai/dsh-client-modules'`。kernel 静态注册浏览器半边，再 `loader.create` 一次；plugin-row 循环必须 skip。 |
| `PLATFORM_MODULES` | `react` / `react/jsx-runtime` / `react-dom` / `react-dom/client` / `@deepseek-ai/cordis` / `dsh-client-ui-slots` / `dsh-client-web-react` / `dsh-client-ui-primitives` / `dsh-client-ui-attachment` / `dsh-client-schema-form`。 |
| `AppShellService` | `{ renderApp(): ReactNode }`。`renderApp ??= buildRenderApp({ ctx })`，跨 `AppRoot` 重绘身份稳定。 |
| `AppRootProps` | `settled` / `status` / `error` 三个 `KernelSignal` + `renderApp`。`status` 全 `active` **打不开**门。 |
| `BootSeams` | `Pick<ClientModuleSystemOptions, 'loadBundle'>`。jsdom 装配测试用 `eval` 喂 `lib/client.js`。 |
| `immediately` | `dsh.client.immediately === true` 才进 stage-one prefetch。shipped 例：`modules` / `connection` / `runtime` / `locale` / `ui-theme` / `client-hmr`。`ui-layout` 默认不标。 |

## 控制流

1. **Web profile 叠上 browser roster；headless / 裸 base 没有这套壳。** `PROFILE_TEMPLATES.web@packages/boot/app-boot/src/profile.ts` 是 `dsh-base` 然后 `dsh-web-app`。web-app patch 插入 `id: modules`（以及 `connection` / `client-runtime` / `ui-layout` 等 `dsh.client` 行）。`PROFILE_TEMPLATES.headless` 是 `dsh-base` + `dsh-headless`：`headless-startup` / `headless-runner`，**没有** `webserver`、**没有** browser roster。本仓没有 shipped TUI。 [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/bundle/web-app/cordis.patch.yml:151] [E: packages/bundle/headless/cordis.patch.yml:27]

2. **`--host 0.0.0.0` 在 `provide('webStartup')` 之前被拒。** `web-startup` action 字面量等于 `'0.0.0.0'` 则 `program.error`，不提供服务；`webserver` `inject: [webStartup]` 保持 pending，进程不 bind。缺省 bind 是 `127.0.0.1:3080`。旗标语义的权威页是 [`surface.profiles.web`](../../surface/profiles/web.md)，本步只钉「壳永远跑在已 listen 的 loopback 上」。 [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/bundle/web-app/cordis.patch.yml:119]

3. **host 把图插进 SPA HTML。** `frontend-static` 占 fallback：GET/HEAD 发 dist，miss 回 `index.html` 200。每个 index 先 `webServer.applyIndexTaps`。`ClientModuleRegistry` 的 tap 把 `<script>window.__DSH_BOOT__ = …</script>` 插进 `<head>`（`<` 转义）。图由 host 灌入；`apps/web` 自己不写 `__DSH_BOOT__`。裸 Vite 被拒听是 `rejectStandaloneServe`，不是 `webSurfacePrompt` 那句 model-visible 文案。 [E: packages/host/frontend-static/src/index.ts:84] [E: packages/host/frontend-static/src/index.ts:97] [E: packages/host/frontend-static/src/index.ts:98] [E: packages/client/modules/src/index.ts:170] [E: packages/client/modules/src/index.ts:246]

4. **`apps/web` 只找 `#root`。** `main.ts`：`document.getElementById('root')` 为 `null` 则抛 `web app: missing #root`；否则 `void new AppWebEntry(el).run()`。HTML 只提供空 `#root` 与 module script。壳库才做 loader / 模块表 / `AppRoot`。 [E: apps/web/src/main.ts:8] [E: apps/web/src/main.ts:10]

5. **`run()` 先 parse wire，失败则整次 reject（还没有 loading 页）。** `parseBootManifest@packages/client/modules/src/client/manifest.ts` 要求 `wire` 是带字符串 `rev` 与数组 `entries` 的对象；缺图文案是 `window.__DSH_BOOT__ is missing or not an object`。`AppWebEntry.run` 的 JSDoc 钉死：只有 manifest 缺失 / 畸形才 reject；plugin 阶段失败走 catch。 [E: packages/client/web/src/boot.tsx:98] [E: packages/client/modules/src/client/manifest.ts:110]

6. **建模块系统，静态登记壳自有模块，先画 loading。** `new ClientModuleSystem({ modules, staticModules: getStaticModules(), ...seams })`。`registerStatic(APP_SHELL_ID, AppShell)`；`registerStatic(MODULES_ID, ModulesClient)`；`(globalThis).__DSH_MODULES__ = this.modules`。然后 `createRoot(el).render(<AppRoot settled={false} …>)`。`renderApp` 闭包在 settled 后才 `ctx.get('appShell')`。 [E: packages/client/web/src/boot.tsx:100] [E: packages/client/web/src/boot.tsx:105] [E: packages/client/web/src/boot.tsx:111] [E: packages/client/web/src/boot.tsx:112] [E: packages/client/web/src/boot.tsx:114]

7. **`immediately` prefetch 与 `Loader` 挂载并行；entry `create` 必须等整层 prefetch。** `prefetchImmediateTier` 对 `plugins.filter(row => row.immediately)` 调 `modules.prefetch(id)`。`prefetch` 对已 `registerStatic` 的 id（`modules` 自己）是 no-op。单包失败 `.catch(() => {})`：barrier 仍 resolve，响在后续 `loader.create` 的 import。同步 `require` 边（例如 locale → `runtime/client`）需要 immediately 行的 factory 先登记完。 [E: packages/client/web/src/boot.tsx:133] [E: packages/client/web/src/boot.tsx:154] [E: packages/client/modules/src/client/system.ts:186] [E: packages/client/tsdown.client.ts:65]

8. **`internal` 必须在任何 entry 存在之前注入。** `runPluginBoot`：`await ctx.plugin(Loader)`，立刻 `loader.internal = this.modules`。vendored `EntryTree.import`：有 `internal` 走 `internal.import`；否则相对路径或裸 `import(name)`。浏览器里裸动态 import 是 tripwire，不是路径。 [E: packages/client/web/src/boot.tsx:163] [E: packages/client/web/src/boot.tsx:168] [E: vendor/loader/src/config/tree.ts:154]

9. **adopt `modules`，再 create 其余 plugin 行 + 壳自己的 app-shell 行。** `await prefetching` 之后：`rows = [MODULES_ID, ...pluginIds.filter(id !== MODULES_ID), APP_SHELL_ID]`。`Promise.all` 并发 `loader.create({ name })`：创建顺序无语义，激活顺序归 fiber `inject` waiting。`MODULES_ID` 必须先占一行且循环 skip：vendored `Group.create` 不按 name 去重，第二次 fiber 会再 `provide('modules')`。`modules` 的 `apply` 读 `__DSH_MODULES__`，缺槽抛 `shell kernel must construct the module system before plugin boot`；有槽则 `ctx.reflect.provide('modules', modules)`。`APP_SHELL_ID` 由壳追加，不是 host 图里的 composition 选择。 [E: packages/client/web/src/boot.tsx:189] [E: packages/client/modules/src/client/index.ts:31] [E: packages/client/modules/src/client/index.ts:33]

10. **`loader.await()` + 全 fiber `ACTIVE`，否则 fail 列出谁。** import 失败的 entry 没有 fiber，boot 把它投影成 `failed`（没有 `internal/status`）。`assertEntriesActive` 扫 `ctx.loader.entries()`：无 fiber → `import failed`；`pending` → 列出 `ctx.get(service) === undefined` 的 inject 名；其它非 `active` 报 state。有失败则抛 `web boot: N entr(y|ies) did not activate\n…`。`run()` catch 把 message 写入 `error`，**不** `settled.set(true)`。 [E: packages/client/web/src/boot.tsx:206] [E: packages/client/web/src/boot.tsx:207] [E: packages/client/web/src/boot.tsx:235]

11. **`settled` 一门切真 UI。** 成功才 `this.settled.set(true)`。`AppRoot`：`if (settled) return renderApp()`；否则画 `HARNESS` loading，或 `Failed to load plugins` + 失败 id + error 文案。测试钉死：全部 status `active` 而 `settled` 仍 false 时 `renderApp` 一次都不调。 [E: packages/client/web/src/boot.tsx:137] [E: packages/client/web/src/AppRoot.tsx:35] [E: packages/client/web/tests/app-root.client.spec.tsx:47]

12. **app-shell 安装 React renderer 并提供装配面。** `inject = ['slots', 'sessions', 'layout']`。`apply`：`ctx.slots.install(createSlotRenderer())`（boot-once；第二次抛 `already installed`），再 `provide('appShell', { renderApp })`。fiber dispose 收回服务并卸载 renderer。`createSlotRenderer` / `SessionProvider` / `bindSnapshotSelector` 来自 `web-react`，不是另一条 `AppWebEntry`。 [E: packages/client/web/src/app-shell.ts:30] [E: packages/client/web/src/app-shell.ts:39] [E: packages/client/web/src/app-shell.ts:44] [E: packages/client/web-react/src/index.ts:19] [E: packages/client/runtime/src/client/slots.ts:214]

13. **`buildRenderApp` 只做两件事。** 缺 `ctx.sessions` 抛 `shell assembly: sessions service unavailable`。否则 `bindSnapshotSelector(sessions.list)` 投影当前会话 title 进 `DocumentTitle`，再 `ctx.slots.renderSlot('root', {})`。`ui-layout` 一次 `register` 把 `AppFrame` 放进内建 `'root'`，并声明 `sidebar` / `conversation` / `details` / `shell.overlay`。壳不点名任何一个 `ui-*` 组件。 [E: packages/client/web/src/app.tsx:29] [E: packages/client/web/src/app.tsx:41] [E: packages/client/ui-layout/src/client/index.ts:120]

14. **裸 Vite `serve` 在 listen 之前被拒。** `rejectStandaloneServe` 在 `env.command === 'serve'` 时抛 `apps/web is not a standalone application: bare Vite cannot inject window.__DSH_BOOT__`。e2e 钉死 stderr 含 `__DSH_BOOT__`，且探针文件证明 `Server.listen` 未调用。正确路径是 `dsh web`（可另开 `pnpm run dev:web` 给 client-hmr）。`web-app` 的 `webSurfacePrompt` 另有一句 model-visible 取向（`The apps/web Vite entry builds the shell but is not a standalone application because only dsh web injects window.__DSH_BOOT__`）；那是 `app:web-surface` 提示词，不是 Vite 拒听的实现。 [E: apps/web/vite.config.ts:16] [E: apps/web/tests/vite-entry.e2e.ts:57] [E: packages/bundle/web-app/src/index.ts:104]

15. **settled 之后的第一句提问不在本页执行。** composer → `session.prompt` → POST `/api/session.prompt` → host `followup` 打开 turn。client 只发 RPC、收 mux。端到端走 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md)。

## 设计动机

- **壳自给自足。** loading / fail-loud 页不得 value-import 任何 plugin 包（runtime 的 snapshot store 也算）。`loader-status.ts` 手写 `KernelSignal`，镜像 vendored `FiberState` 数值。插件全挂了，用户仍看得到谁没 ACTIVE。
- **零 composition。** 谁进图、谁 `immediately`、preset 挂哪些 tool，全是 host / bundle / 每会话 preset 的事。壳只追加自己的 `APP_SHELL_ID` 行，让 sweep / `internal/status` 覆盖装配 fiber。
- **prefetch 整层屏障，不是 fail-fast 聚合。** 跨包同步 `require` 边在 materialize 时发生，fiber inject 等不到。一个坏 bundle 若在 prefetch 阶段炸掉整次 `Promise.all`，其它 immediately 行的 factory 也登记不上，诊断面更差。create 侧 import 按 entry 再响。
- **`modules` 不能当普通 fetch 行。** 模块系统不能经自己到达。kernel 静态登记 + 先 create 一次 + 循环 skip，避免第二次 `provide('modules')`。
- **`web-react` 是绑定，不是壳。** `createSlotRenderer` 实现 `SlotRenderer`；`bindSnapshotSelector` 是整栈唯一的 uSES 构造器；`SessionProvider` 是 session 子树座位。host 图没有 `id: web-react`。
- **默认产品面是本地 Web GUI。** `dsh-base` 给 headless 与 web 共用执行缝；`dsh-web-app` 才插入这套壳；`dsh-headless` 直接 `headless-runner`，不 listen、不灌 `__DSH_BOOT__`。

## Gotcha

- **缺 `__DSH_BOOT__` 看不到 HARNESS 页。** `parseBootManifest` 在 `createRoot` 之前抛，`run()` reject。loading 页只覆盖 plugin 阶段。 [E: packages/client/web/src/boot.tsx:98]
- **`status` 不是门。** 全员 `active` 仍停在 spinner，直到 `settled.set(true)`。 [E: packages/client/web/tests/app-root.client.spec.tsx:47]
- **pending 没有超时。** Cordis inject waiting 会一直等；`assertEntriesActive` 是 fail-loud 补偿，文案列出缺失 service。
- **`PLATFORM_MODULES` 与 `getStaticModules()` 用 `satisfies` 互锁。** 一边加词一边忘静态 import，编译失败。tsdown `CLIENT_EXTERNALS` 另加了临时的 `@deepseek-ai/dsh-client-runtime/client`（store 引擎尚未搬家），它**不**在 `PLATFORM_MODULES` 里。 [E: packages/client/web/src/seed.ts:40] [E: packages/client/tsdown.client.ts:65]
- **Vite alias 指 `boot.tsx`，不是 `index.ts`。** `define` 把 `process.versions.node` 设成 `"0.0.0"`，让 vendored loader 的 `fromInternal()` 走空槽，再由壳填 `internal`。`node:module` 被 stub 成一抛就响的 `createRequire`。 [E: apps/web/vite.config.ts:142] [E: apps/web/vite.config.ts:155]
- **同页第二次 `new ClientModuleSystem` 会炸。** 构造器若发现 `window.__ModuleLoader__` 已在，抛 `double boot?`。测试必须 `delete win.__ModuleLoader__`。 [E: packages/client/modules/src/client/system.ts:87]
- **在 `'root'` 上再 `register` 会阴影整框。** 加法面是 `shell.overlay`（list）。细节在 [`subsys.client.ui-layout`](ui-layout.md) / [`subsys.client.ui-slots`](ui-slots.md)。
- **`WebServer.Config.host` 仍承认 `'0.0.0.0'`。** 旗标路径被拒 ≠ overlay 不能整行改 bind。LAN trust 采样仍认识该字面量。不要把「壳只跑 loopback」写成 schema 禁了 all-interfaces。 [E: packages/host/webserver/src/index.ts:61] [E: packages/bundle/web-app/src/index.ts:86]
- **jsdom 装配图 ≠ 完整 shipped roster。** `PLUGINS` 把 `@deepseek-ai/dsh-client-ui-settings` 写成 `immediately: true`。`mountAssembledApp` 用 `loadBundle` + `eval` 喂 workspace `lib/client.js`。locale / ui-theme 的 fixture `inject` 都列出该包。 [E: apps/web/tests/assembled-boot.ts:26] [E: apps/web/tests/assembled-boot.ts:29] [E: apps/web/tests/assembled-boot.ts:126]

## Seam 三角

capability seam = Definition / Provider / Consumer。换 Provider 会带走 Consumer；Definition（服务名与 boot 合同）保持不变。下表同时对照三份 shipped 组合：`dsh-base`、叠在它之后的 `dsh-web-app`、叠在它之后的 `dsh-headless`。

| 缝 | Definition | Provider | Consumer | dsh-base | dsh-web-app | dsh-headless |
|---|---|---|---|---|---|---|
| 浏览器壳 `AppWebEntry` | `@deepseek-ai/dsh-client-web`：`run()` 合同（parse → 模块表 → loading → prefetch+Loader → create → sweep → `settled`） | Vite 入口 `apps/web` 对 `#root` 调 `new AppWebEntry(el).run()`；dist 由 `web-runtime` 挂 `frontend-static` | 人打开打印出的 `dsh web: http://127.0.0.1:<port>` | 无 webserver / 无 dist | **有**：默认安装路径 | 无 Host / 无 HTTP；`headless-runner` 直接建 Agent |
| `window.__DSH_BOOT__` | `WebBootGraph`：`rev` + `entries[]`（`id`/`url`/`rev`/`inject?`/`immediately?`） | **host** `ClientModuleRegistry.tapIndex` → `injectBootManifest` | `parseBootManifest` @ `AppWebEntry.run`；HMR 读同一份 graph | 无 | **有** `id: modules` | 无 |
| `ctx.modules` / `loader.internal` | `ClientModuleLoader`（`version: 'client'`，`import` / `prefetch` / `registerStatic`） | 壳 kernel 构造 `ClientModuleSystem`，写入 `__DSH_MODULES__`；`modules` 行 `apply` `provide('modules')` | vendored `EntryTree.import`；client-hmr `invalidate` | 无 | **有**（kernel adopt，循环 skip） | 无 |
| `ctx.appShell` | `AppShellService.renderApp`；`APP_SHELL_ID` 伪包 | 壳追加的 loader 行 `app-shell`（`inject: [slots, sessions, layout]`） | `AppRoot` 在 `settled` 后调用 | 无 | **有**（壳自有，host 图无此 id） | 无 |
| React 槽渲染 | `SlotRenderer` / `SessionProvider` / `SnapshotSelectorHook`（`web-react` + `ui-slots` 合同） | `app-shell` `ctx.slots.install(createSlotRenderer())` | `buildRenderApp` → `renderSlot('root')`；各 `ui-*` 的 `register` | 无 | **有** | 无 |
| `PLATFORM_MODULES` 种子 | `platform.ts` 字面量列表 | `getStaticModules()` 静态 import；tsdown `CLIENT_EXTERNALS` 投影 | 每个 `/plugins/.../client.js` 的 factory `require` | 无 | **有**（壳 bundle 内） | 无 |
| `ctx.webStartup` → listen | `WEB_STARTUP_SERVICE` | **host** `web-startup`（本页不展开） | `webserver` / `web-runtime` | 无 | **有**；`--host 0.0.0.0` 拒在 provide 前 | 无（`headlessStartup` 是另一条缝） |
| 每会话 preset / 模型工具 | `ctx.agentPresets` + `ctx.tools` | web insert `agent-presets` `default: standard`；base 工具行被 web disable | `composeAgent` `setup` 里 `mount` | 工具行在 **host** | 工具行在 **preset**；壳不参与 | 工具行留 **host**；无 GUI |

换掉 `AppWebEntry`（例如另写一个不扫 fiber 的壳）会带走 fail-loud 页与 `appShell` 一门切换，但 `__DSH_BOOT__` / `/plugins` 合同仍由 modules 定义。删掉 web-app 的 `id: modules` 行，壳 parse 到空图也跑不起来。headless 根本不进入本页这条缝。

## Sources

- packages/client/web/src/index.ts
- packages/client/web/src/app-shell.ts
- packages/client/web/src/boot.tsx
- packages/client/web/src/AppRoot.tsx
- packages/client/web/src/seed.ts
- packages/client/web/src/platform.ts
- packages/client/web/src/app.tsx
- packages/client/web/src/loader-status.ts
- packages/client/web/src/DocumentTitle.tsx
- packages/client/web-react/src/index.ts
- packages/client/web-react/src/bind.ts
- packages/client/web-react/src/scoped-slots.tsx
- packages/client/web-react/src/session-provider.tsx
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
- packages/client/web/tests/app-root.client.spec.tsx
- packages/client/web/tests/app-shell.client.spec.tsx
- packages/client/web/tests/app.client.spec.tsx
- apps/web/tests/assembled-boot.ts
- apps/web/tests/vite-entry.e2e.ts
- packages/host/frontend-static/src/index.ts
- packages/host/webserver/src/index.ts
- vendor/loader/src/config/tree.ts
- packages/client/tsdown.client.ts
- packages/client/ui-layout/src/client/index.ts
- packages/client/runtime/src/client/slots.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 从 `dsh web` 到第一轮 `session.prompt`；本页停在 `settled` 与 `renderSlot('root')`。
- [`surface.profiles.web`](../../surface/profiles/web.md) — `dsh web` alias、`--host` / `--port`、web overlay 全表。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台槽位与 chrome 可见面（壳只负责 boot 到 `'root'`）。
- [`subsys.client.modules`](modules.md) — node 半边扫 `dsh.client`、`/plugins`、`tapIndex`；浏览器半边模块表。
- [`subsys.client.ui-layout`](ui-layout.md) — `AppFrame` 占 `'root'`，声明四子槽。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 把这套 roster 插进 host 树、disable base 工具行。
- [`subsys.host.frontend-static`](../host/frontend-static.md) — dist fallback 与 `applyIndexTaps`。
