---
id: clients.app
title: App UI shell(SolidJS)
kind: subsystem
tier: T2
v: na
source:
  - packages/app/package.json
  - packages/app/vite.config.ts
  - packages/app/src/entry.tsx
  - packages/app/src/app.tsx
  - packages/app/src/context/platform.tsx
  - packages/app/src/context/server.tsx
  - packages/app/src/context/sdk.tsx
  - packages/app/src/context/server-sync.tsx
  - packages/app/src/context/global-sync/bootstrap.ts
  - packages/desktop/src/renderer/index.tsx
symbols:
  - "@opencode-ai/app"
  - AppInterface
  - AppBaseProviders
  - Platform
  - ServerConnection
related:
  - clients.desktop
  - clients.ui
evidence: explicit
status: verified
updated: 92c70c9c3
---

> App UI shell 是 `@opencode-ai/app` SolidJS 前端包: 同一套 `AppInterface` 可以在浏览器直接连 HTTP server, 也可以在 Electron renderer 内通过 desktop `Platform` 连本地 sidecar。

## 能回答的问题

- `packages/app` 和 `packages/desktop` 的 UI 边界在哪里?
- Web browser entry 如何决定默认 opencode server URL?
- `Platform` 抽象有哪些 browser/desktop 差异?
- `AppInterface` 里有哪些 provider 和 routes?
- App shell 怎样通过 generated SDK 同步 server state?

## 职责边界

`@opencode-ai/app` 暴露 package root、`desktop-menu`、`updater`、`wsl/types`、`vite` plugin 和 CSS 入口 [E: packages/app/package.json:7] [E: packages/app/package.json:8] [E: packages/app/package.json:9] [E: packages/app/package.json:10] [E: packages/app/package.json:11] [E: packages/app/package.json:12]。这些 exports 支撑 Web 与 Desktop 复用 UI shell 的包装边界 [I]。它依赖 `@opencode-ai/sdk`, `@opencode-ai/ui`, `@opencode-ai/core`, Solid Router 和 TanStack Solid Query [E: packages/app/package.json:46] [E: packages/app/package.json:47] [E: packages/app/package.json:48] [E: packages/app/package.json:64] [E: packages/app/package.json:65]。

V1/V2 关系: App shell 使用 `@opencode-ai/sdk/v2/client` 类型和 generated client 面向 server API, 但 App shell 本身不实现 V1/V2 run loop [E: packages/app/src/context/server-sync.tsx:1] [I]。V1/V2 的实际行为由 server endpoint 和 session subsystem 决定。

## 技术栈

- SolidJS + Vite: package scripts 用 `vite`, `vite.config.ts` 安装 `desktopPlugin` 与 Sentry plugin, dev server 默认 `0.0.0.0:3000` [E: packages/app/package.json:16] [E: packages/app/vite.config.ts:23] [E: packages/app/vite.config.ts:25] [E: packages/app/vite.config.ts:27]。
- Tailwind v4/Vite plugin、Kobalte、Solid primitives、Solid Router、TanStack Solid Query 共同组成 UI runtime [E: packages/app/package.json:33] [E: packages/app/package.json:45] [E: packages/app/package.json:51] [E: packages/app/package.json:64] [E: packages/app/package.json:65]。
- 测试层是 Bun unit + Playwright e2e, package scripts 明确把 unit 和 e2e 分开 [E: packages/app/package.json:20] [E: packages/app/package.json:23]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/app/src/entry.tsx` | Browser entry。构造 `Platform` 为 `web`, 解析 `auth_token`, 创建 HTTP `ServerConnection`, 然后 render `AppInterface` [E: packages/app/src/entry.tsx:122] [E: packages/app/src/entry.tsx:157] [E: packages/app/src/entry.tsx:159] [E: packages/app/src/entry.tsx:171]。 |
| `packages/app/src/app.tsx` | 共享 shell。定义 `AppBaseProviders`, `ConnectionGate`, `AppInterface` 和 routes [E: packages/app/src/app.tsx:230] [E: packages/app/src/app.tsx:264] [E: packages/app/src/app.tsx:380] [E: packages/app/src/app.tsx:412]。 |
| `packages/app/src/context/platform.tsx` | host capability contract。`Platform` discriminated union 分 `web` 与 `desktop`, desktop 分支要求 `openDirectoryPickerDialog` [E: packages/app/src/context/platform.tsx:113] [E: packages/app/src/context/platform.tsx:115] [E: packages/app/src/context/platform.tsx:117] [E: packages/app/src/context/platform.tsx:119]。 |
| `packages/app/src/context/server.tsx` | server list, keys, local/sidecar/ssh 分类, persisted server/project state [E: packages/app/src/context/server.tsx:157] [E: packages/app/src/context/server.tsx:163] [E: packages/app/src/context/server.tsx:178] [E: packages/app/src/context/server.tsx:190] [E: packages/app/src/context/server.tsx:207] [E: packages/app/src/context/server.tsx:229] [E: packages/app/src/context/server.tsx:235]。 |
| `packages/app/src/context/server-sync.tsx` | server state sync root。创建 SDK cache、bootstrap query、global store 和 directory child stores [E: packages/app/src/context/server-sync.tsx:93] [E: packages/app/src/context/server-sync.tsx:116] [E: packages/app/src/context/server-sync.tsx:166] [E: packages/app/src/context/server-sync.tsx:214]。 |
| `packages/app/src/context/global-sync/bootstrap.ts` | bootstrap queries。加载 config、providers、path、projects, project 结果写入 global store [E: packages/app/src/context/global-sync/bootstrap.ts:118] [E: packages/app/src/context/global-sync/bootstrap.ts:119] [E: packages/app/src/context/global-sync/bootstrap.ts:120] [E: packages/app/src/context/global-sync/bootstrap.ts:123] [E: packages/app/src/context/global-sync/bootstrap.ts:124]。 |

## 数据模型

`Platform` 是 host capability carrier。基础能力包括 `openLink`, `restart`, browser history, notification, optional storage/fetch/default-server, 以及 desktop-only picker/updater/WSL/display/markdown/clipboard/logging 能力 [E: packages/app/src/context/platform.tsx:30] [E: packages/app/src/context/platform.tsx:35] [E: packages/app/src/context/platform.tsx:41] [E: packages/app/src/context/platform.tsx:44] [E: packages/app/src/context/platform.tsx:47] [E: packages/app/src/context/platform.tsx:50] [E: packages/app/src/context/platform.tsx:53] [E: packages/app/src/context/platform.tsx:62] [E: packages/app/src/context/platform.tsx:65] [E: packages/app/src/context/platform.tsx:71] [E: packages/app/src/context/platform.tsx:77] [E: packages/app/src/context/platform.tsx:80] [E: packages/app/src/context/platform.tsx:83] [E: packages/app/src/context/platform.tsx:86] [E: packages/app/src/context/platform.tsx:104] [E: packages/app/src/context/platform.tsx:107] [E: packages/app/src/context/platform.tsx:110] [E: packages/app/src/context/platform.tsx:119]。

`ServerConnection` 是 UI 连接 server 的 union。`Http` 用 URL 和 optional auth, `Sidecar` 表示 Desktop server 或 WSL server, `Ssh` 表示 desktop 通过 SSH 暴露的 HTTP proxy [E: packages/app/src/context/server.tsx:150] [E: packages/app/src/context/server.tsx:157] [E: packages/app/src/context/server.tsx:163] [E: packages/app/src/context/server.tsx:178]。`ServerConnection.key` 把 HTTP URL、sidecar、WSL distro、SSH host 统一成 stable key [E: packages/app/src/context/server.tsx:190]。

`GlobalStore` 镜像 server 全局数据: `path`, `project`, `session_todo`, normalized provider list, provider auth, config 和 reload 状态 [E: packages/app/src/context/server-sync.tsx:41] [E: packages/app/src/context/server-sync.tsx:45] [E: packages/app/src/context/server-sync.tsx:46] [E: packages/app/src/context/server-sync.tsx:49] [E: packages/app/src/context/server-sync.tsx:50] [E: packages/app/src/context/server-sync.tsx:51] [E: packages/app/src/context/server-sync.tsx:52]。

## 控制流

1. Browser entry 用 `getCurrentUrl()` 选择 server。`opencode.ai` hostname 默认连 `http://localhost:4096`, dev 模式读 `VITE_OPENCODE_SERVER_HOST/PORT`, production fallback 用 `location.origin` [E: packages/app/src/entry.tsx:102] [E: packages/app/src/entry.tsx:103] [E: packages/app/src/entry.tsx:104] [E: packages/app/src/entry.tsx:106]。
2. Browser entry 构造 `Platform` 为 `web`, 使用 browser notification、`window.open`, history 和 localStorage-backed default server [E: packages/app/src/entry.tsx:57] [E: packages/app/src/entry.tsx:81] [E: packages/app/src/entry.tsx:122] [E: packages/app/src/entry.tsx:130]。
3. Browser entry 创建 canonical local HTTP server connection, 把它作为 `servers` 传入 `AppInterface`, 并禁用 startup health check [E: packages/app/src/entry.tsx:159] [E: packages/app/src/entry.tsx:171] [E: packages/app/src/entry.tsx:173] [E: packages/app/src/entry.tsx:174] [E: packages/app/src/entry.tsx:175]。
4. `AppBaseProviders` 安装 Meta、Font、Theme、Language、I18n bridge、ErrorBoundary、QueryClient、WSL、Dialog、Marked、File providers [E: packages/app/src/app.tsx:230] [E: packages/app/src/app.tsx:232] [E: packages/app/src/app.tsx:234] [E: packages/app/src/app.tsx:239] [E: packages/app/src/app.tsx:247] [E: packages/app/src/app.tsx:248] [E: packages/app/src/app.tsx:249] [E: packages/app/src/app.tsx:250] [E: packages/app/src/app.tsx:251]。
5. `AppInterface` 安装 `ServerProvider`, `GlobalProvider`, `ConnectionGate`, Router, Tabs, `ServerSDKProvider`, `ServerSyncProvider`, 然后挂 `/`, `/new-session`, `/:dir/session/:id?` routes [E: packages/app/src/app.tsx:389] [E: packages/app/src/app.tsx:394] [E: packages/app/src/app.tsx:395] [E: packages/app/src/app.tsx:397] [E: packages/app/src/app.tsx:399] [E: packages/app/src/app.tsx:402] [E: packages/app/src/app.tsx:403] [E: packages/app/src/app.tsx:412] [E: packages/app/src/app.tsx:413] [E: packages/app/src/app.tsx:414] [E: packages/app/src/app.tsx:416]。
6. `ConnectionGate` 在未禁用时循环调用 `checkServerHealth(http)`, blocking 模式最多 10 秒, 之后用 error UI 或后台 retry [E: packages/app/src/app.tsx:272] [E: packages/app/src/app.tsx:280] [E: packages/app/src/app.tsx:285] [E: packages/app/src/app.tsx:324]。
7. `ServerSyncProvider` 通过 `bootstrapGlobal` 读取 global config、providers、path 和 projects, directory 级数据再由 `SDKProvider` 用当前 directory 创建 context [E: packages/app/src/context/server-sync.tsx:166] [E: packages/app/src/context/global-sync/bootstrap.ts:118] [E: packages/app/src/context/global-sync/bootstrap.ts:119] [E: packages/app/src/context/global-sync/bootstrap.ts:120] [E: packages/app/src/context/global-sync/bootstrap.ts:123] [E: packages/app/src/context/sdk.tsx:4] [E: packages/app/src/context/sdk.tsx:9]。

## 设计动机与权衡

`Platform` 把 host-specific 能力全部推到边界, 使 `AppInterface` 可以在 browser 和 Electron 内共享同一套路由、providers 和 server sync 代码 [E: packages/app/src/context/platform.tsx:113] [E: packages/app/src/app.tsx:380]。Server connection 使用 union 而不是单纯 URL; 这个形状能表达 HTTP、sidecar、WSL 和 SSH proxy 这类连接形态 [E: packages/app/src/context/server.tsx:157] [E: packages/app/src/context/server.tsx:163] [E: packages/app/src/context/server.tsx:170] [E: packages/app/src/context/server.tsx:178] [I]。

## Gotcha

- Browser entry 的 default server 不等于 Desktop sidecar。Desktop renderer 自己创建 `Platform` 并传 `MemoryRouter`; browser entry 使用普通 `Router` 和 HTTP connection [E: packages/app/src/entry.tsx:159] [E: packages/app/src/entry.tsx:171] [E: packages/app/src/app.tsx:397] [E: packages/desktop/src/renderer/index.tsx:80] [E: packages/desktop/src/renderer/index.tsx:363]。
- `packages/app/src/context/server-sync.tsx` import 的是 `@opencode-ai/sdk/v2/client`, 这说明 UI client surface 已按 v2 SDK 类型消费 API, 但不代表所有后台 session 执行都已经切到 V2 [E: packages/app/src/context/server-sync.tsx:1] [I]。

## Sources

- `packages/app/package.json`
- `packages/app/vite.config.ts`
- `packages/app/src/entry.tsx`
- `packages/app/src/app.tsx`
- `packages/app/src/context/platform.tsx`
- `packages/app/src/context/server.tsx`
- `packages/app/src/context/sdk.tsx`
- `packages/app/src/context/server-sync.tsx`
- `packages/app/src/context/global-sync/bootstrap.ts`
- `packages/desktop/src/renderer/index.tsx`

## 相关

- [Desktop 应用(Electron)](desktop.md)
- [共享 UI 组件库(SolidJS)](ui.md)
