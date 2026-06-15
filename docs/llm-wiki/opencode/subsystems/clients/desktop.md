---
id: clients.desktop
title: Desktop 应用(Electron)
kind: subsystem
tier: T2
v: na
source:
  - packages/desktop/package.json
  - packages/desktop/electron.vite.config.ts
  - packages/desktop/src/main/index.ts
  - packages/desktop/src/main/server.ts
  - packages/desktop/src/main/sidecar.ts
  - packages/desktop/src/preload/types.ts
  - packages/desktop/src/renderer/index.tsx
symbols:
  - "@opencode-ai/desktop"
  - spawnLocalServer
  - sidecar
  - createPlatform
related:
  - clients.app
  - server.http-server
evidence: explicit
status: verified
updated: 92c70c9c3
---

> Desktop 应用是 `@opencode-ai/desktop` Electron host: main process 启动本地 opencode server sidecar, renderer 复用 `@opencode-ai/app` 的 SolidJS shell, 再通过 preload IPC 提供文件选择、通知、更新、WSL server 等桌面能力。

## 能回答的问题

- Desktop 包为什么同时有 main、sidecar、renderer 三个入口?
- Electron renderer 怎样复用 `packages/app` 的 `AppInterface`?
- 本地 server sidecar 如何选择端口、认证和健康检查?
- Desktop 与普通 Web App 的 `Platform` 差异在哪里?
- Desktop 包如何把 `packages/opencode` server bundle 嵌进 Electron 构建?

## 职责边界

`@opencode-ai/desktop` 是桌面包装层, 不是 V1/V2 session runtime 本体。它的任务是启动一个本机 opencode server sidecar, 把 sidecar 作为一个 `ServerConnection.Sidecar` 交给共享 App UI, 并暴露 Electron-only 能力给 renderer。包名、Electron 入口、Electron 构建脚本和 `electron-vite` 依赖都在 `packages/desktop/package.json` 内声明 [E: packages/desktop/package.json:2] [E: packages/desktop/package.json:15] [E: packages/desktop/package.json:25] [E: packages/desktop/package.json:53]。

V1/V2 关系: Desktop 不直接选择 V1 或 V2 run loop。Desktop sidecar import 的是构建产物 `virtual:opencode-server`, 之后调用 `Server.listen(...)` 暴露 HTTP server [E: packages/desktop/src/main/sidecar.ts:57] [E: packages/desktop/src/main/sidecar.ts:59]。实际 `/api/*` 行为由 server 包和 opencode runtime 决定, Desktop 只是 host 和 transport [I]。

## 技术栈

- Electron + Electron utility process: `spawnLocalServer` 通过 `utilityProcess.fork(sidecar, ...)` 启动 sidecar JS [E: packages/desktop/src/main/server.ts:61] [E: packages/desktop/src/main/server.ts:62]。
- `electron-vite`: package scripts 使用 `electron-vite dev/build/preview`, build config 用 `defineConfig` 分 main/preload/renderer 三块 [E: packages/desktop/package.json:15] [E: packages/desktop/package.json:17] [E: packages/desktop/package.json:18] [E: packages/desktop/electron.vite.config.ts:34] [E: packages/desktop/electron.vite.config.ts:71] [E: packages/desktop/electron.vite.config.ts:82]。
- SolidJS renderer: renderer import `@opencode-ai/app` 的 `AppBaseProviders`, `AppInterface`, `PlatformProvider` 等导出 [E: packages/desktop/src/renderer/index.tsx:5] [E: packages/desktop/src/renderer/index.tsx:6] [E: packages/desktop/src/renderer/index.tsx:12]。
- Effect main flow: Electron main 的 `main` 是 `Effect.gen(...)`, 收尾通过 `Effect.runFork(main)` 启动 [E: packages/desktop/src/main/index.ts:103] [E: packages/desktop/src/main/index.ts:367]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/desktop/electron.vite.config.ts` | Electron build graph。main 同时输入 `src/main/index.ts` 和 `src/main/sidecar.ts`, renderer 使用 `@opencode-ai/app/vite` 插件和 `packages/app/public` publicDir [E: packages/desktop/electron.vite.config.ts:41] [E: packages/desktop/electron.vite.config.ts:83] [E: packages/desktop/electron.vite.config.ts:84]。 |
| `packages/desktop/src/main/index.ts` | 主进程生命周期。设置 app id/userData、注册 IPC、选端口、spawn sidecar、创建窗口 [E: packages/desktop/src/main/index.ts:113] [E: packages/desktop/src/main/index.ts:131] [E: packages/desktop/src/main/index.ts:244] [E: packages/desktop/src/main/index.ts:283] [E: packages/desktop/src/main/index.ts:350]。 |
| `packages/desktop/src/main/server.ts` | sidecar process manager。负责 fork、ready/error handshake、`/global/health` 轮询、stop timeout [E: packages/desktop/src/main/server.ts:62] [E: packages/desktop/src/main/server.ts:107] [E: packages/desktop/src/main/server.ts:114] [E: packages/desktop/src/main/server.ts:187] [E: packages/desktop/src/main/server.ts:171]。 |
| `packages/desktop/src/main/sidecar.ts` | sidecar bootstrap。接收 `start/stop` 消息, 设置 server username/password 和 XDG state, 调用 `Server.listen` [E: packages/desktop/src/main/sidecar.ts:41] [E: packages/desktop/src/main/sidecar.ts:44] [E: packages/desktop/src/main/sidecar.ts:48] [E: packages/desktop/src/main/sidecar.ts:85] [E: packages/desktop/src/main/sidecar.ts:86] [E: packages/desktop/src/main/sidecar.ts:87] [E: packages/desktop/src/main/sidecar.ts:59]。 |
| `packages/desktop/src/preload/types.ts` | preload API contract。renderer 可调用 sidecar lifecycle、WSL、updater、store、file picker、zoom、debug log 等方法 [E: packages/desktop/src/preload/types.ts:43] [E: packages/desktop/src/preload/types.ts:44] [E: packages/desktop/src/preload/types.ts:46] [E: packages/desktop/src/preload/types.ts:47] [E: packages/desktop/src/preload/types.ts:48] [E: packages/desktop/src/preload/types.ts:57] [E: packages/desktop/src/preload/types.ts:68] [E: packages/desktop/src/preload/types.ts:73] [E: packages/desktop/src/preload/types.ts:90] [E: packages/desktop/src/preload/types.ts:99]。 |
| `packages/desktop/src/renderer/index.tsx` | Desktop renderer adapter。构造 desktop `Platform`, 等 sidecar credentials, 然后把 `AppInterface` 挂到 `MemoryRouter` [E: packages/desktop/src/renderer/index.tsx:80] [E: packages/desktop/src/renderer/index.tsx:295] [E: packages/desktop/src/renderer/index.tsx:363]。 |

## 数据模型

Desktop 自己最重要的跨进程数据结构是 `ServerReadyData`, 它包含 sidecar URL、username、password, 由 main process 的 `Deferred` 交给 renderer [E: packages/desktop/src/preload/types.ts:18] [E: packages/desktop/src/main/index.ts:235] [E: packages/desktop/src/main/index.ts:326]。`SidecarCommand` 在 sidecar 侧区分 `start` 和 `stop`, `start` 需要 hostname、port、password、userDataPath [E: packages/desktop/src/main/sidecar.ts:13] [E: packages/desktop/src/main/sidecar.ts:22]。

`Platform` adapter 是 renderer 的主抽象。Desktop renderer 返回 `platform: "desktop"`, 从 user agent 推断 `os`, 并把 native picker、store、updater、debug log、clipboard image、WSL servers 等能力映射到 `window.api` [E: packages/desktop/src/renderer/index.tsx:80] [E: packages/desktop/src/renderer/index.tsx:81] [E: packages/desktop/src/renderer/index.tsx:135] [E: packages/desktop/src/renderer/index.tsx:139] [E: packages/desktop/src/renderer/index.tsx:189] [E: packages/desktop/src/renderer/index.tsx:237]。

## 控制流

1. Electron main 禁用内嵌 Web UI, 设置 app id/userData, 初始化 logging/crash reporter [E: packages/desktop/src/main/index.ts:111] [E: packages/desktop/src/main/index.ts:130] [E: packages/desktop/src/main/index.ts:131] [E: packages/desktop/src/main/index.ts:136] [E: packages/desktop/src/main/index.ts:137]。
2. main 调用 `preferAppEnv(app.getPath("userData"))`, 让 sidecar 环境带上 desktop client 标记、file watcher/icon discovery flags 和 XDG state [E: packages/desktop/src/main/index.ts:189] [E: packages/desktop/src/main/server.ts:44] [E: packages/desktop/src/main/server.ts:48] [E: packages/desktop/src/main/server.ts:49] [E: packages/desktop/src/main/server.ts:50] [E: packages/desktop/src/main/server.ts:51]。
3. main 选择 `127.0.0.1` 上的端口, 优先使用 `OPENCODE_PORT`, 否则用临时 TCP server 取空闲端口 [E: packages/desktop/src/main/index.ts:283] [E: packages/desktop/src/main/index.ts:291] [E: packages/desktop/src/main/index.ts:306]。
4. main 生成随机 password, 调用 `spawnLocalServer(hostname, port, password, ...)` 启动 utility process [E: packages/desktop/src/main/index.ts:308] [E: packages/desktop/src/main/index.ts:318]。
5. `spawnLocalServer` fork `sidecar.js`, 向 child post `{ type: "start", hostname, port, password, userDataPath }`, 等待 sidecar 发 `ready` [E: packages/desktop/src/main/server.ts:62] [E: packages/desktop/src/main/server.ts:130] [E: packages/desktop/src/main/server.ts:107]。
6. sidecar 收到 `start`, 设置 `OPENCODE_SERVER_USERNAME`, `OPENCODE_SERVER_PASSWORD`, `XDG_STATE_HOME`, import server bundle, 调用 `Server.listen` 并限定 CORS 为 `oc://renderer` [E: packages/desktop/src/main/sidecar.ts:51] [E: packages/desktop/src/main/sidecar.ts:85] [E: packages/desktop/src/main/sidecar.ts:86] [E: packages/desktop/src/main/sidecar.ts:87] [E: packages/desktop/src/main/sidecar.ts:57] [E: packages/desktop/src/main/sidecar.ts:59] [E: packages/desktop/src/main/sidecar.ts:64]。
7. main 把 `url`, `username: "opencode"`, `password` resolve 到 `serverReady`, renderer 的 `awaitInitialization()` 得到这些凭据 [E: packages/desktop/src/main/index.ts:326] [E: packages/desktop/src/renderer/index.tsx:295]。
8. renderer 把 sidecar credentials 变成 `ServerConnection.Sidecar` 列表项, 再用 `availableStartupServer(defaultServer.latest, wslServers.data)` 计算 default server key 并传给 `AppInterface` [E: packages/desktop/src/renderer/index.tsx:337] [E: packages/desktop/src/renderer/index.tsx:341] [E: packages/desktop/src/renderer/index.tsx:355] [E: packages/desktop/src/renderer/index.tsx:356] [E: packages/desktop/src/renderer/index.tsx:363]。

## 设计动机与权衡

Desktop 把 server 放在 utility process, 而不是 renderer [E: packages/desktop/src/main/server.ts:62], 这种进程边界可以隔离 long-running server、保留 Electron main 对 lifecycle 的控制 [I]。main 还会用 `/global/health` 确认 server 真可用后再让 UI 进入连接状态 [E: packages/desktop/src/main/server.ts:150] [E: packages/desktop/src/main/server.ts:187] [E: packages/desktop/src/main/index.ts:336]。`OPENCODE_DISABLE_EMBEDDED_WEB_UI = "true"` 表明 desktop 不需要 server 自己再 serve embedded web UI, 因为 renderer 由 Electron bundle 提供 [E: packages/desktop/src/main/index.ts:111]。

## Gotcha

- `virtual:opencode-server` 不是源码中的普通 import, 它由 `electron.vite.config.ts` 的 `opencode:virtual-server-module` 插件解析到 `../opencode/dist/node/node.js` [E: packages/desktop/electron.vite.config.ts:54] [E: packages/desktop/electron.vite.config.ts:57]。
- Desktop 的 renderer 并不是 fork 一套 UI, 它直接 import `@opencode-ai/app` 的 providers/interface/platform symbols [E: packages/desktop/src/renderer/index.tsx:5] [E: packages/desktop/src/renderer/index.tsx:6] [E: packages/desktop/src/renderer/index.tsx:12]。
- Desktop host 属于 `v: na`: 它包装运行中的 server, 不改变 V1/V2 session kernel 归属 [I]。

## Sources

- `packages/desktop/package.json`
- `packages/desktop/electron.vite.config.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/server.ts`
- `packages/desktop/src/main/sidecar.ts`
- `packages/desktop/src/preload/types.ts`
- `packages/desktop/src/renderer/index.tsx`

## 相关

- [App UI shell(SolidJS)](app.md)
- [HTTP server](../server/http-server.md)
