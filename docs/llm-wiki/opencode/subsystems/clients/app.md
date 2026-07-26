---
id: clients.app
title: App UI shell(SolidJS)
kind: subsystem
tier: T2
v: na
source:
  - packages/app/package.json
  - packages/app/V1_API_MIGRATION.md
  - packages/app/vite.config.ts
  - packages/app/src/entry.tsx
  - packages/app/src/app.tsx
  - packages/app/src/context/platform.tsx
  - packages/app/src/context/server.tsx
  - packages/app/src/context/sdk.tsx
  - packages/app/src/context/server-sync.tsx
  - packages/app/src/context/global-sync/bootstrap.ts
  - packages/app/src/pages/home.tsx
  - packages/app/src/pages/home/home-controller.ts
  - packages/app/src/pages/home/home-projects-controller.tsx
  - packages/app/src/pages/home/home-projects-view.tsx
  - packages/app/src/pages/home/home-session-search-controller.ts
  - packages/app/src/pages/home/home-sessions-controller.tsx
  - packages/app/src/pages/home/home-sessions-view.tsx
  - packages/app/src/pages/home/home-scroll-controller.ts
  - packages/desktop/src/renderer/index.tsx
symbols:
  - "@opencode-ai/app"
  - AppInterface
  - AppBaseProviders
  - Platform
  - ServerConnection
  - NewHome
  - createHomeController
related:
  - clients.desktop
  - clients.ui
  - clients.app-compatibility
evidence: explicit
status: verified
updated: 7534d23551
---

> App UI shell 是 `@opencode-ai/app` SolidJS 前端包: 同一套 `AppInterface` 可以在浏览器直接连 HTTP server, 也可以在 Electron renderer 内通过 desktop `Platform` 连本地 sidecar。

## 能回答的问题

- `packages/app` 和 `packages/desktop` 的 UI 边界在哪里?
- Web browser entry 如何决定默认 opencode server URL?
- `Platform` 抽象有哪些 browser/desktop 差异?
- `AppInterface` 里有哪些 provider 和 routes?
- App shell 怎样通过 generated SDK 同步 server state?

## 职责边界

`@opencode-ai/app` 暴露 package root、`desktop-menu`、`updater`、`wsl/types`、`vite` plugin 和 CSS 入口 [E: packages/app/package.json:6] [E: packages/app/package.json:7] [E: packages/app/package.json:8] [E: packages/app/package.json:9] [E: packages/app/package.json:10] [E: packages/app/package.json:11] [E: packages/app/package.json:12]。这些 exports 支撑 Web 与 Desktop 复用 UI shell 的包装边界 [I]。它依赖 `@opencode-ai/sdk`, `@opencode-ai/ui`, `@opencode-ai/session-ui`, `@opencode-ai/core`, Solid Router 和 TanStack Solid Query [E: packages/app/package.json:56] [E: packages/app/package.json:57] [E: packages/app/package.json:59] [E: packages/app/package.json:60] [E: packages/app/package.json:61] [E: packages/app/package.json:77] [E: packages/app/package.json:78] [E: packages/app/package.json:79]。

V1/V2 关系: App shell 同时连接 legacy unprefixed API 与 current `/api/*` API。它会按 server 探测 protocol、选择兼容 API/event transport，并把 current session state 投影进现有 UI store；详细边界见 `clients.app-compatibility`。[E: packages/app/src/context/server-sync.tsx:227][E: packages/app/src/context/server-sync.tsx:228][E: packages/app/src/context/server-sync.tsx:534]

## 技术栈

- SolidJS + Vite: package scripts 用 `vite`, `vite.config.ts` 安装 `desktopPlugin` 与 Sentry plugin, dev server 默认 `0.0.0.0:3000` [E: packages/app/package.json:17] [E: packages/app/package.json:18] [E: packages/app/vite.config.ts:22] [E: packages/app/vite.config.ts:23] [E: packages/app/vite.config.ts:25] [E: packages/app/vite.config.ts:27]。
- Tailwind Vite plugin、Kobalte、Solid primitives、Solid Router、TanStack Solid Query 和 session UI 共同组成 UI runtime [E: packages/app/package.json:37] [E: packages/app/package.json:56] [E: packages/app/package.json:60] [E: packages/app/package.json:65] [E: packages/app/package.json:77] [E: packages/app/package.json:78] [E: packages/app/package.json:79]。
- 测试层是 Bun unit、browser-condition Bun tests 和 Playwright e2e, package scripts 明确把 unit/browser/e2e 分开 [E: packages/app/package.json:21] [E: packages/app/package.json:22] [E: packages/app/package.json:23] [E: packages/app/package.json:25]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/app/src/entry.tsx` | Browser entry。构造 `Platform` 为 `web`, 解析 `auth_token`, 创建 HTTP `ServerConnection`, 然后 render `AppInterface` [E: packages/app/src/entry.tsx:122] [E: packages/app/src/entry.tsx:157] [E: packages/app/src/entry.tsx:159] [E: packages/app/src/entry.tsx:171]。 |
| `packages/app/src/app.tsx` | 共享 shell。定义 `AppBaseProviders`, `ConnectionGate`, `AppInterface` 和 `Routes` [E: packages/app/src/app.tsx:388] [E: packages/app/src/app.tsx:422] [E: packages/app/src/app.tsx:549] [E: packages/app/src/app.tsx:607]。 |
| `packages/app/src/context/platform.tsx` | host capability contract。`Platform` discriminated union 分 `web` 与 `desktop`, desktop 分支要求 `openDirectoryPickerDialog` [E: packages/app/src/context/platform.tsx:125] [E: packages/app/src/context/platform.tsx:127] [E: packages/app/src/context/platform.tsx:129] [E: packages/app/src/context/platform.tsx:131]。 |
| `packages/app/src/context/server.tsx` | server list, keys, local/sidecar/ssh 分类, persisted server/project state;项目状态还保留 recently-closed history [E: packages/app/src/context/server.tsx:10] [E: packages/app/src/context/server.tsx:13] [E: packages/app/src/context/server.tsx:20] [E: packages/app/src/context/server.tsx:21] [E: packages/app/src/context/server.tsx:191] [E: packages/app/src/context/server.tsx:197] [E: packages/app/src/context/server.tsx:212] [E: packages/app/src/context/server.tsx:224] [E: packages/app/src/context/server.tsx:255] [E: packages/app/src/context/server.tsx:263]。 |
| `packages/app/src/context/server-sync.tsx` | server state sync root。创建 SDK cache、bootstrap query、global store、directory child stores、server session helper 和 home session index cache [E: packages/app/src/context/server-sync.tsx:215] [E: packages/app/src/context/server-sync.tsx:227] [E: packages/app/src/context/server-sync.tsx:266] [E: packages/app/src/context/server-sync.tsx:292] [E: packages/app/src/context/server-sync.tsx:316] [E: packages/app/src/context/server-sync.tsx:352]。 |
| `packages/app/src/context/global-sync/bootstrap.ts` | bootstrap queries。加载 config、providers、path、projects；provider/path 查询按 protocol 选择兼容路径，project 结果写入 global store [E: packages/app/src/context/global-sync/bootstrap.ts:140] [E: packages/app/src/context/global-sync/bootstrap.ts:151] [E: packages/app/src/context/global-sync/bootstrap.ts:152] [E: packages/app/src/context/global-sync/bootstrap.ts:155] [E: packages/app/src/context/global-sync/bootstrap.ts:157] [E: packages/app/src/context/global-sync/bootstrap.ts:160] [E: packages/app/src/context/global-sync/bootstrap.ts:161]。 |
| `packages/app/src/pages/home.tsx` + `pages/home/*` | 新 layout Home composition root。它组合 home/project/session/search/scroll controllers，再把 accessors 与 callbacks 交给 project/session views [E: packages/app/src/pages/home.tsx:11] [E: packages/app/src/pages/home.tsx:16] [E: packages/app/src/pages/home.tsx:38] [E: packages/app/src/pages/home.tsx:39]。 |

## Home controller/view seams

`NewHome` 已从单体页面拆成多个窄 controller：root controller 解析 focused server/project selection 与 new-session target；projects controller 承担 server/project management；sessions controller 读取 home session index、分组/open/archive；search 与 scroll controller 分别隔离查询交互和 sticky-header/viewport 状态。[E: packages/app/src/pages/home/home-controller.ts:9] [E: packages/app/src/pages/home/home-controller.ts:45] [E: packages/app/src/pages/home/home-projects-controller.tsx:18] [E: packages/app/src/pages/home/home-sessions-controller.tsx:63] [E: packages/app/src/pages/home/home-session-search-controller.ts:13] [E: packages/app/src/pages/home/home-scroll-controller.ts:9]

这不是纯 MVC：views 仍持有 DnD、local UI state、platform helpers 与 session status controller。[E: packages/app/src/pages/home/home-projects-view.tsx:3] [E: packages/app/src/pages/home/home-projects-view.tsx:17] [E: packages/app/src/pages/home/home-projects-view.tsx:63] [E: packages/app/src/pages/home/home-sessions-view.tsx:150] 路由只在 `newLayoutDesigns` 为 false 时挂 `LegacyHome`，为 true 时挂 `NewHome`。[E: packages/app/src/app.tsx:617] [E: packages/app/src/app.tsx:620] [E: packages/app/src/app.tsx:630] [E: packages/app/src/app.tsx:631]

New Home 也不是“只走 current API”：home session index 用 SDK `v2.session.list`，但 archive 目前只允许 protocol V1 并调用 legacy session update。[E: packages/app/src/pages/home/home-sessions-controller.tsx:63] [E: packages/app/src/pages/home/home-sessions-controller.tsx:72] [E: packages/app/src/pages/home/home-sessions-controller.tsx:209] [E: packages/app/src/pages/home/home-sessions-controller.tsx:214] [E: packages/app/src/pages/home/home-sessions-controller.tsx:219]

## 数据模型

`Platform` 是 host capability carrier。基础能力包括 `openLink`, `restart`, browser history, notification, optional storage/fetch/default-server, 以及 desktop-only open/reveal path、attachment picker、save picker、updater、WSL、display backend、markdown parser、zoom/menu/clipboard/logging/force-focus 能力 [E: packages/app/src/context/platform.tsx:30] [E: packages/app/src/context/platform.tsx:35] [E: packages/app/src/context/platform.tsx:38] [E: packages/app/src/context/platform.tsx:41] [E: packages/app/src/context/platform.tsx:44] [E: packages/app/src/context/platform.tsx:53] [E: packages/app/src/context/platform.tsx:56] [E: packages/app/src/context/platform.tsx:65] [E: packages/app/src/context/platform.tsx:68] [E: packages/app/src/context/platform.tsx:77] [E: packages/app/src/context/platform.tsx:80] [E: packages/app/src/context/platform.tsx:86] [E: packages/app/src/context/platform.tsx:89] [E: packages/app/src/context/platform.tsx:95] [E: packages/app/src/context/platform.tsx:98] [E: packages/app/src/context/platform.tsx:107] [E: packages/app/src/context/platform.tsx:113] [E: packages/app/src/context/platform.tsx:116] [E: packages/app/src/context/platform.tsx:119] [E: packages/app/src/context/platform.tsx:122]。

`ServerConnection` 是 UI 连接 server 的 union。`Http` 用 URL 和 optional auth, `Sidecar` 表示 Desktop server 或 WSL server, `Ssh` 表示 desktop 通过 SSH 暴露的 HTTP proxy [E: packages/app/src/context/server.tsx:184] [E: packages/app/src/context/server.tsx:191] [E: packages/app/src/context/server.tsx:197] [E: packages/app/src/context/server.tsx:212]。`ServerConnection.key` 把 HTTP URL、sidecar、WSL distro、SSH host 统一成 stable key [E: packages/app/src/context/server.tsx:224]。

`GlobalStore` 镜像 server 全局数据: readiness/error、path、project list、normalized provider list、provider auth、config 和 reload 状态 [E: packages/app/src/context/server-sync.tsx:63] [E: packages/app/src/context/server-sync.tsx:64] [E: packages/app/src/context/server-sync.tsx:65] [E: packages/app/src/context/server-sync.tsx:66] [E: packages/app/src/context/server-sync.tsx:67] [E: packages/app/src/context/server-sync.tsx:68] [E: packages/app/src/context/server-sync.tsx:69] [E: packages/app/src/context/server-sync.tsx:70] [E: packages/app/src/context/server-sync.tsx:71]。

project persistence 把用户主动 close 的 worktree 去重后记入 `recentlyClosed`,history 最多 16 条,UI display limit 是 5;再次 open 会从 recently-closed 中移除它。[E: packages/app/src/context/server.tsx:20] [E: packages/app/src/context/server.tsx:21] [E: packages/app/src/context/server.tsx:86] [E: packages/app/src/context/server.tsx:98] [E: packages/app/src/context/server.tsx:102] [E: packages/app/src/context/server.tsx:106] [E: packages/app/src/context/server.tsx:114] [E: packages/app/src/context/server.tsx:117] [E: packages/app/src/context/server.tsx:119] [E: packages/app/src/context/server.tsx:121]

## 控制流

1. Browser entry 用 `getCurrentUrl()` 选择 server。`opencode.ai` hostname 默认连 `http://localhost:4096`, dev 模式读 `VITE_OPENCODE_SERVER_HOST/PORT`, production fallback 用 `location.origin` [E: packages/app/src/entry.tsx:102] [E: packages/app/src/entry.tsx:103] [E: packages/app/src/entry.tsx:104] [E: packages/app/src/entry.tsx:105] [E: packages/app/src/entry.tsx:106]。
2. Browser entry 构造 `Platform` 为 `web`, 使用 browser notification、`window.open`, history 和 localStorage-backed default server [E: packages/app/src/entry.tsx:57] [E: packages/app/src/entry.tsx:81] [E: packages/app/src/entry.tsx:122] [E: packages/app/src/entry.tsx:130] [E: packages/app/src/entry.tsx:134]。
3. Browser entry 创建 canonical local HTTP server connection, 把它作为 `servers` 传入 `AppInterface`, 并禁用 startup health check [E: packages/app/src/entry.tsx:159] [E: packages/app/src/entry.tsx:171] [E: packages/app/src/entry.tsx:172] [E: packages/app/src/entry.tsx:173] [E: packages/app/src/entry.tsx:174] [E: packages/app/src/entry.tsx:175]。
4. `AppBaseProviders` 安装 Meta、Font、Theme、Language、UI i18n bridge、ErrorBoundary、QueryClient、WSL、Dialog、Marked、File providers [E: packages/app/src/app.tsx:388] [E: packages/app/src/app.tsx:390] [E: packages/app/src/app.tsx:391] [E: packages/app/src/app.tsx:392] [E: packages/app/src/app.tsx:397] [E: packages/app/src/app.tsx:398] [E: packages/app/src/app.tsx:399] [E: packages/app/src/app.tsx:405] [E: packages/app/src/app.tsx:406] [E: packages/app/src/app.tsx:407] [E: packages/app/src/app.tsx:408] [E: packages/app/src/app.tsx:409]。
5. `AppInterface` 安装 `ServerProvider`, `GlobalProvider`, `SettingsProvider`, `ConnectionGate`, Router, Tabs, Permission/Notification 和 shared shell providers。`Routes` 挂 legacy/new-layout session routes、legacy redirect 与 `/new-session`;target server route 保持 server identity subtree,用 session error boundary/lineage 处理 session 切换。[E: packages/app/src/app.tsx:549] [E: packages/app/src/app.tsx:572] [E: packages/app/src/app.tsx:577] [E: packages/app/src/app.tsx:578] [E: packages/app/src/app.tsx:579] [E: packages/app/src/app.tsx:584] [E: packages/app/src/app.tsx:585] [E: packages/app/src/app.tsx:586] [E: packages/app/src/app.tsx:607] [E: packages/app/src/app.tsx:620] [E: packages/app/src/app.tsx:621] [E: packages/app/src/app.tsx:625] [E: packages/app/src/app.tsx:627] [E: packages/app/src/app.tsx:631] [E: packages/app/src/app.tsx:632] [E: packages/app/src/app.tsx:633] [E: packages/app/src/app.tsx:635] [E: packages/app/src/app.tsx:111] [E: packages/app/src/app.tsx:123] [E: packages/app/src/app.tsx:141] [E: packages/app/src/app.tsx:152]。
6. `ConnectionGate` 在未禁用时循环调用 `checkServerHealth(http)`,blocking 模式最多 10 秒,之后用 error UI 或后台 retry。health check 通过后,它还可等待 optional `startup` promise;失败只记录并放行。[E: packages/app/src/app.tsx:422] [E: packages/app/src/app.tsx:430] [E: packages/app/src/app.tsx:438] [E: packages/app/src/app.tsx:440] [E: packages/app/src/app.tsx:443] [E: packages/app/src/app.tsx:451] [E: packages/app/src/app.tsx:452] [E: packages/app/src/app.tsx:453] [E: packages/app/src/app.tsx:456] [E: packages/app/src/app.tsx:459]。
7. `ServerSyncProvider` 通过 `bootstrapGlobal` 读取 global config、providers、path 和 projects,directory 级数据再由 `SDKProvider` 用当前 directory 创建 context。server event 同时维护 home session index,而非 active directory 的 refresh/LSP/reference work会被抑制。[E: packages/app/src/context/server-sync.tsx:316] [E: packages/app/src/context/global-sync/bootstrap.ts:151] [E: packages/app/src/context/global-sync/bootstrap.ts:155] [E: packages/app/src/context/global-sync/bootstrap.ts:157] [E: packages/app/src/context/global-sync/bootstrap.ts:160] [E: packages/app/src/context/sdk.tsx:7] [E: packages/app/src/context/sdk.tsx:14] [E: packages/app/src/context/server-sync.tsx:535] [E: packages/app/src/context/server-sync.tsx:536] [E: packages/app/src/context/server-sync.tsx:537] [E: packages/app/src/context/server-sync.tsx:539] [E: packages/app/src/context/server-sync.tsx:563] [E: packages/app/src/context/server-sync.tsx:600] [E: packages/app/src/context/server-sync.tsx:601] [E: packages/app/src/context/server-sync.tsx:608] [E: packages/app/src/context/server-sync.tsx:612]。

## 设计动机与权衡

`Platform` 把 host-specific 能力全部推到边界, 使 `AppInterface` 可以在 browser 和 Electron 内共享同一套路由、providers 和 server sync 代码 [E: packages/app/src/context/platform.tsx:125] [E: packages/app/src/app.tsx:549]。Server connection 使用 union 而不是单纯 URL; 这个形状能表达 HTTP、sidecar、WSL 和 SSH proxy 这类连接形态 [E: packages/app/src/context/server.tsx:191] [E: packages/app/src/context/server.tsx:197] [E: packages/app/src/context/server.tsx:204] [E: packages/app/src/context/server.tsx:212] [I]。

## Gotcha

- Browser entry 的 default server 不等于 Desktop sidecar。Desktop renderer 自己创建 `Platform` 并传 `DesktopMemoryRouter`,还用 `startup/serverScoped` 接入首次启动 onboarding;browser entry 使用普通 Router 和 HTTP connection。[E: packages/app/src/entry.tsx:159] [E: packages/app/src/entry.tsx:171] [E: packages/desktop/src/renderer/index.tsx:113] [E: packages/desktop/src/renderer/index.tsx:353] [E: packages/desktop/src/renderer/index.tsx:356] [E: packages/desktop/src/renderer/index.tsx:415] [E: packages/desktop/src/renderer/index.tsx:418] [E: packages/desktop/src/renderer/index.tsx:419] [E: packages/desktop/src/renderer/index.tsx:420] [E: packages/desktop/src/renderer/index.tsx:421]
- `@opencode-ai/sdk/v2` 在 App migration 术语中仍承载 legacy unprefixed API；不能根据 package 名把它误判为 current server API。[E: packages/app/V1_API_MIGRATION.md:3]
- controller/view extraction 没有一条 split-specific wiring/equivalence test；这里记录源码 ownership seam，不把重构本身外推成“行为完全等价”。[I]

## Sources

- `packages/app/package.json`
- `packages/app/V1_API_MIGRATION.md`
- `packages/app/vite.config.ts`
- `packages/app/src/entry.tsx`
- `packages/app/src/app.tsx`
- `packages/app/src/context/platform.tsx`
- `packages/app/src/context/server.tsx`
- `packages/app/src/context/sdk.tsx`
- `packages/app/src/context/server-sync.tsx`
- `packages/app/src/context/global-sync/bootstrap.ts`
- `packages/app/src/pages/home.tsx`
- `packages/app/src/pages/home/home-controller.ts`
- `packages/app/src/pages/home/home-projects-controller.tsx`
- `packages/app/src/pages/home/home-projects-view.tsx`
- `packages/app/src/pages/home/home-session-search-controller.ts`
- `packages/app/src/pages/home/home-sessions-controller.tsx`
- `packages/app/src/pages/home/home-sessions-view.tsx`
- `packages/app/src/pages/home/home-scroll-controller.ts`
- `packages/desktop/src/renderer/index.tsx`

## 相关

- [Desktop 应用(Electron)](desktop.md)
- [共享 UI 组件库(SolidJS)](ui.md)
- [App Legacy/Current Server 兼容层](app-compatibility.md)
