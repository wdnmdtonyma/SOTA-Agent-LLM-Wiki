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
  - packages/desktop/src/main/onboarding.ts
  - packages/desktop/src/main/server.ts
  - packages/desktop/src/main/sidecar.ts
  - packages/desktop/src/preload/types.ts
  - packages/desktop/src/renderer/index.tsx
  - packages/desktop/src/renderer/onboarding.tsx
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
updated: 67caf894e
---

> Desktop 应用是 `@opencode-ai/desktop` Electron host: main process 启动本地 opencode server sidecar, renderer 复用 `@opencode-ai/app` 的 SolidJS shell, 再通过 preload IPC 提供文件选择、通知、更新、WSL server 与首次启动引导等桌面能力。

## 能回答的问题

- Desktop 包为什么同时有 main、sidecar、renderer 三个入口?
- Electron renderer 怎样复用 `packages/app` 的 `AppInterface`?
- 本地 server sidecar 如何选择端口、认证和健康检查?
- Desktop 与普通 Web App 的 `Platform` 差异在哪里?
- Desktop 包如何把 `packages/opencode` server bundle 嵌进 Electron 构建?
- 首次启动引导怎样判断旧安装、创建默认项目并阻塞 App startup?

## 职责边界

`@opencode-ai/desktop` 是桌面包装层, 不是 V1/V2 session runtime 本体。它的任务是启动一个本机 opencode server sidecar, 把 sidecar 作为一个 `ServerConnection.Sidecar` 交给共享 App UI, 并暴露 Electron-only 能力给 renderer。包名、Electron 入口、Electron 构建脚本和 `electron-vite` 依赖都在 `packages/desktop/package.json` 内声明 [E: packages/desktop/package.json:2] [E: packages/desktop/package.json:15] [E: packages/desktop/package.json:25] [E: packages/desktop/package.json:53]。

V1/V2 关系: Desktop 不直接选择 V1 或 V2 run loop。Desktop sidecar import 的是构建产物 `virtual:opencode-server`, 之后调用 `Server.listen(...)` 暴露 HTTP server [E: packages/desktop/src/main/sidecar.ts:57] [E: packages/desktop/src/main/sidecar.ts:59]。实际 `/api/*` 行为由 server 包和 opencode runtime 决定, Desktop 只是 host 和 transport [I]。

## 技术栈

- Electron + Electron utility process: `spawnLocalServer` 通过 `utilityProcess.fork(sidecar, ...)` 启动 sidecar JS [E: packages/desktop/src/main/server.ts:61] [E: packages/desktop/src/main/server.ts:62]。
- `electron-vite`: package scripts 使用 `electron-vite dev/build/preview`, build config 用 `defineConfig` 分 main/preload/renderer 三块 [E: packages/desktop/package.json:15] [E: packages/desktop/package.json:17] [E: packages/desktop/package.json:18] [E: packages/desktop/electron.vite.config.ts:34] [E: packages/desktop/electron.vite.config.ts:82] [E: packages/desktop/electron.vite.config.ts:93]。
- SolidJS renderer: renderer import `@opencode-ai/app` 的 `AppBaseProviders`, `AppInterface`, `PlatformProvider`, `ServerConnection` 等导出 [E: packages/desktop/src/renderer/index.tsx:5] [E: packages/desktop/src/renderer/index.tsx:6] [E: packages/desktop/src/renderer/index.tsx:11] [E: packages/desktop/src/renderer/index.tsx:12] [E: packages/desktop/src/renderer/index.tsx:13]。
- Effect main flow: Electron main 的 `main` 是 `Effect.gen(...)`, 收尾通过 `Effect.runFork(main)` 启动 [E: packages/desktop/src/main/index.ts:113] [E: packages/desktop/src/main/index.ts:399]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/desktop/electron.vite.config.ts` | Electron build graph。main 同时输入 `src/main/index.ts` 和 `src/main/sidecar.ts`, renderer 使用 `@opencode-ai/app/vite` 插件和 `packages/app/public` publicDir [E: packages/desktop/electron.vite.config.ts:41] [E: packages/desktop/electron.vite.config.ts:94] [E: packages/desktop/electron.vite.config.ts:95]。 |
| `packages/desktop/src/main/index.ts` | 主进程生命周期。设置 embedded-web-ui flag、app id/userData、注册 IPC、选端口、spawn sidecar、恢复窗口 [E: packages/desktop/src/main/index.ts:121] [E: packages/desktop/src/main/index.ts:123] [E: packages/desktop/src/main/index.ts:141] [E: packages/desktop/src/main/index.ts:273] [E: packages/desktop/src/main/index.ts:315] [E: packages/desktop/src/main/index.ts:350] [E: packages/desktop/src/main/index.ts:382]。 |
| `packages/desktop/src/main/onboarding.ts` | 首次启动持久状态。它记录旧布局资格与 onboarding 完成位，按选择创建 Documents 下的 `Default Project` [E: packages/desktop/src/main/onboarding.ts:12] [E: packages/desktop/src/main/onboarding.ts:27] [E: packages/desktop/src/main/onboarding.ts:33] [E: packages/desktop/src/main/onboarding.ts:39] [E: packages/desktop/src/main/onboarding.ts:42]。 |
| `packages/desktop/src/main/server.ts` | sidecar process manager。负责 fork、ready/error handshake、`/global/health` 轮询、stop timeout [E: packages/desktop/src/main/server.ts:62] [E: packages/desktop/src/main/server.ts:106] [E: packages/desktop/src/main/server.ts:114] [E: packages/desktop/src/main/server.ts:170] [E: packages/desktop/src/main/server.ts:187]。 |
| `packages/desktop/src/main/sidecar.ts` | sidecar bootstrap。接收 `start/stop` 消息, 设置 server username/password 和 XDG state, 调用 `Server.listen` [E: packages/desktop/src/main/sidecar.ts:41] [E: packages/desktop/src/main/sidecar.ts:44] [E: packages/desktop/src/main/sidecar.ts:51] [E: packages/desktop/src/main/sidecar.ts:83] [E: packages/desktop/src/main/sidecar.ts:85] [E: packages/desktop/src/main/sidecar.ts:86] [E: packages/desktop/src/main/sidecar.ts:87] [E: packages/desktop/src/main/sidecar.ts:59]。 |
| `packages/desktop/src/preload/types.ts` | preload API contract。renderer 可调用 sidecar lifecycle、WSL、updater、store、file picker、zoom、debug log 等方法 [E: packages/desktop/src/preload/types.ts:44] [E: packages/desktop/src/preload/types.ts:47] [E: packages/desktop/src/preload/types.ts:48] [E: packages/desktop/src/preload/types.ts:49] [E: packages/desktop/src/preload/types.ts:61] [E: packages/desktop/src/preload/types.ts:73] [E: packages/desktop/src/preload/types.ts:78] [E: packages/desktop/src/preload/types.ts:97] [E: packages/desktop/src/preload/types.ts:106]。 |
| `packages/desktop/src/renderer/index.tsx` | Desktop renderer adapter。构造 desktop `Platform`, 等 sidecar credentials/default server/window count/locale, 然后把 `AppInterface` 挂到 `DesktopMemoryRouter` [E: packages/desktop/src/renderer/index.tsx:113] [E: packages/desktop/src/renderer/index.tsx:349] [E: packages/desktop/src/renderer/index.tsx:351] [E: packages/desktop/src/renderer/index.tsx:353] [E: packages/desktop/src/renderer/index.tsx:408]。 |
| `packages/desktop/src/renderer/onboarding.tsx` | renderer 侧 onboarding gate。它等待 server/tabs ready, 仅对本地、全新安装、根路由、无 tabs、只有 built-in servers 的场景创建默认项目与 draft [E: packages/desktop/src/renderer/onboarding.tsx:15] [E: packages/desktop/src/renderer/onboarding.tsx:20] [E: packages/desktop/src/renderer/onboarding.tsx:22] [E: packages/desktop/src/renderer/onboarding.tsx:25] [E: packages/desktop/src/renderer/onboarding.tsx:40] [E: packages/desktop/src/renderer/onboarding.tsx:46]。 |

## 数据模型

Desktop 自己最重要的跨进程数据结构是 `ServerReadyData`, 它包含 sidecar URL、username、password, 由 main process 的 `Deferred` 交给 renderer [E: packages/desktop/src/preload/types.ts:18] [E: packages/desktop/src/main/index.ts:251] [E: packages/desktop/src/main/index.ts:358]。`SidecarCommand` 在 sidecar 侧区分 `start` 和 `stop`, `start` 需要 hostname、port、password、userDataPath [E: packages/desktop/src/main/sidecar.ts:13] [E: packages/desktop/src/main/sidecar.ts:21] [E: packages/desktop/src/main/sidecar.ts:22]。

`Platform` adapter 是 renderer 的主抽象。Desktop renderer 返回 `platform: "desktop"`, 从 user agent 推断 `os`, 并把 native picker、store、updater、debug log、clipboard image、WSL servers、zoom、desktop menu 等能力映射到 `window.api` [E: packages/desktop/src/renderer/index.tsx:113] [E: packages/desktop/src/renderer/index.tsx:115] [E: packages/desktop/src/renderer/index.tsx:168] [E: packages/desktop/src/renderer/index.tsx:174] [E: packages/desktop/src/renderer/index.tsx:181] [E: packages/desktop/src/renderer/index.tsx:233] [E: packages/desktop/src/renderer/index.tsx:235] [E: packages/desktop/src/renderer/index.tsx:241] [E: packages/desktop/src/renderer/index.tsx:283] [E: packages/desktop/src/renderer/index.tsx:295] [E: packages/desktop/src/renderer/index.tsx:301] [E: packages/desktop/src/renderer/index.tsx:307]。

## 控制流

1. Electron main 设置 context menu, 切工作目录到 home, 禁用 server embedded Web UI, 设置 app id/userData, 初始化 logging/crash reporter [E: packages/desktop/src/main/index.ts:114] [E: packages/desktop/src/main/index.ts:118] [E: packages/desktop/src/main/index.ts:121] [E: packages/desktop/src/main/index.ts:123] [E: packages/desktop/src/main/index.ts:141] [E: packages/desktop/src/main/index.ts:147] [E: packages/desktop/src/main/index.ts:148]。
2. main 调用 `preferAppEnv(app.getPath("userData"))`, 让 sidecar 环境带上 desktop client 标记、file watcher/icon discovery flags 和 XDG state [E: packages/desktop/src/main/index.ts:209] [E: packages/desktop/src/main/server.ts:44] [E: packages/desktop/src/main/server.ts:48] [E: packages/desktop/src/main/server.ts:49] [E: packages/desktop/src/main/server.ts:50] [E: packages/desktop/src/main/server.ts:51]。
3. main 选择 `127.0.0.1` 上的端口, 优先使用 `OPENCODE_PORT`, 否则用临时 TCP server 取空闲端口 [E: packages/desktop/src/main/index.ts:315] [E: packages/desktop/src/main/index.ts:316] [E: packages/desktop/src/main/index.ts:319] [E: packages/desktop/src/main/index.ts:323] [E: packages/desktop/src/main/index.ts:325] [E: packages/desktop/src/main/index.ts:332]。
4. main 生成随机 password, 调用 `spawnLocalServer(hostname, port, password, ...)` 启动 utility process [E: packages/desktop/src/main/index.ts:338] [E: packages/desktop/src/main/index.ts:340] [E: packages/desktop/src/main/index.ts:350]。
5. `spawnLocalServer` fork `sidecar.js`, 向 child post `{ type: "start", hostname, port, password, userDataPath }`, 等待 sidecar 发 `ready` [E: packages/desktop/src/main/server.ts:61] [E: packages/desktop/src/main/server.ts:62] [E: packages/desktop/src/main/server.ts:106] [E: packages/desktop/src/main/server.ts:130]。
6. sidecar 收到 `start`, 设置 `OPENCODE_SERVER_USERNAME`, `OPENCODE_SERVER_PASSWORD`, `XDG_STATE_HOME`, import server bundle, 调用 `Server.listen` 并限定 CORS 为 `oc://renderer` [E: packages/desktop/src/main/sidecar.ts:51] [E: packages/desktop/src/main/sidecar.ts:83] [E: packages/desktop/src/main/sidecar.ts:85] [E: packages/desktop/src/main/sidecar.ts:86] [E: packages/desktop/src/main/sidecar.ts:87] [E: packages/desktop/src/main/sidecar.ts:57] [E: packages/desktop/src/main/sidecar.ts:59] [E: packages/desktop/src/main/sidecar.ts:64]。
7. main 把 `url`, `username: "opencode"`, `password` resolve 到 `serverReady`, renderer 的 `awaitInitialization()` 得到这些凭据;main 之后还等待 `/global/health` 最多 30 秒并记录失败 [E: packages/desktop/src/main/index.ts:358] [E: packages/desktop/src/main/index.ts:368] [E: packages/desktop/src/main/index.ts:369] [E: packages/desktop/src/main/index.ts:372] [E: packages/desktop/src/renderer/index.tsx:349]。
8. renderer 把 sidecar credentials 变成 `ServerConnection.Sidecar` 列表项, 拼上 WSL server, 再用 `availableStartupServer(defaultServer.latest, wslServers.data)` 计算 default server key 并传给 `AppInterface` [E: packages/desktop/src/renderer/index.tsx:390] [E: packages/desktop/src/renderer/index.tsx:394] [E: packages/desktop/src/renderer/index.tsx:396] [E: packages/desktop/src/renderer/index.tsx:405] [E: packages/desktop/src/renderer/index.tsx:408] [E: packages/desktop/src/renderer/index.tsx:408]。
9. main 在确定 `userData` 后初始化旧布局资格，并把三个 onboarding 方法装进 preload API [E: packages/desktop/src/main/index.ts:141] [E: packages/desktop/src/main/index.ts:146] [E: packages/desktop/src/main/index.ts:288] [E: packages/desktop/src/main/index.ts:289] [E: packages/desktop/src/main/index.ts:290]。renderer 把 `DesktopFirstLaunchOnboarding` 放进 `AppInterface.serverScoped`, 并用 `startup={onboarding.promise}` 等待引导检查完成 [E: packages/desktop/src/renderer/index.tsx:356] [E: packages/desktop/src/renderer/index.tsx:419] [E: packages/desktop/src/renderer/index.tsx:421] [E: packages/desktop/src/renderer/index.tsx:423]。

## 设计动机与权衡

Desktop 把 server 放在 utility process, 而不是 renderer [E: packages/desktop/src/main/server.ts:62], 这种进程边界可以隔离 long-running server、保留 Electron main 对 lifecycle 的控制 [I]。main 还会用 `/global/health` 确认 server 可用后再完成 loading task [E: packages/desktop/src/main/server.ts:150] [E: packages/desktop/src/main/server.ts:153] [E: packages/desktop/src/main/index.ts:368]。`OPENCODE_DISABLE_EMBEDDED_WEB_UI = "true"` 表明 desktop 不需要 server 自己再 serve embedded web UI, 因为 renderer 由 Electron bundle 提供 [E: packages/desktop/src/main/index.ts:121]。

## Gotcha

- `virtual:opencode-server` 不是源码中的普通 import, 它由 `electron.vite.config.ts` 的 `opencode:virtual-server-module` 插件解析到 `../opencode/dist/node/node.js` [E: packages/desktop/electron.vite.config.ts:65] [E: packages/desktop/electron.vite.config.ts:68]。
- Electron main bundle 显式用 Rollup banner 注入 Node CommonJS shim；这避免 electron-vite 的 regex insertion 与 bundled TypeScript 互相干扰 [E: packages/desktop/electron.vite.config.ts:41] [E: packages/desktop/electron.vite.config.ts:44] [E: packages/desktop/electron.vite.config.ts:47] [E: packages/desktop/electron.vite.config.ts:48] [E: packages/desktop/electron.vite.config.ts:49] [E: packages/desktop/electron.vite.config.ts:50] [I]。
- Desktop 的 renderer 并不是 fork 一套 UI, 它直接 import `@opencode-ai/app` 的 providers/interface/platform/server symbols [E: packages/desktop/src/renderer/index.tsx:5] [E: packages/desktop/src/renderer/index.tsx:6] [E: packages/desktop/src/renderer/index.tsx:12] [E: packages/desktop/src/renderer/index.tsx:13]。
- Desktop host 属于 `v: na`: 它包装运行中的 server, 不改变 V1/V2 session kernel 归属 [I]。

## Sources

- `packages/desktop/package.json`
- `packages/desktop/electron.vite.config.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/onboarding.ts`
- `packages/desktop/src/main/server.ts`
- `packages/desktop/src/main/sidecar.ts`
- `packages/desktop/src/preload/types.ts`
- `packages/desktop/src/renderer/index.tsx`
- `packages/desktop/src/renderer/onboarding.tsx`

## 相关

- [App UI shell(SolidJS)](app.md)
- [HTTP server](../server/http-server.md)
