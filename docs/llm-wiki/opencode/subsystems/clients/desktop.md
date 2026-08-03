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
  - packages/desktop/src/main/background-cli.ts
  - packages/desktop/src/main/draft-store.ts
  - packages/desktop/src/main/ipc.ts
  - packages/desktop/src/main/onboarding.ts
  - packages/desktop/src/main/server.ts
  - packages/desktop/src/main/sidecar.ts
  - packages/desktop/src/preload/types.ts
  - packages/desktop/src/renderer/index.tsx
  - packages/desktop/src/renderer/onboarding.tsx
  - packages/desktop/scripts/utils.ts
  - packages/desktop/electron-builder.config.ts
  - packages/cli/src/services/daemon.ts
symbols:
  - "@opencode-ai/desktop"
  - spawnLocalServer
  - sidecar
  - createPlatform
  - startBackgroundCli
  - createDesktopDraftStore
related:
  - clients.app
  - server.http-server
evidence: explicit
status: verified
updated: 89130db6b0
---

> Desktop 应用是 `@opencode-ai/desktop` Electron host: main process 启动本地 opencode server sidecar, renderer 复用 `@opencode-ai/app` 的 SolidJS shell, 再通过 preload IPC 提供文件选择、通知、更新、WSL server 与首次启动引导等桌面能力。

## 能回答的问题

- Desktop 包为什么同时有 main、sidecar、renderer 三个入口?
- Electron renderer 怎样复用 `packages/app` 的 `AppInterface`?
- 本地 server sidecar 如何选择端口、认证和健康检查?
- Desktop 与普通 Web App 的 `Platform`、draft storage 差异在哪里?
- `OPENCODE_SIDECAR_V2` 怎样在 embedded utility process 与后台 CLI service 间切换?
- Desktop 包如何把 `packages/opencode` server bundle 嵌进 Electron 构建?
- 首次启动引导怎样判断旧安装、创建默认项目并阻塞 App startup?

## 职责边界

`@opencode-ai/desktop` 是桌面包装层, 不是 V1/V2 session runtime 本体。它的任务是启动一个本机 opencode server sidecar, 把 sidecar 作为一个 `ServerConnection.Sidecar` 交给共享 App UI, 并暴露 Electron-only 能力给 renderer。包名、Electron 入口、Electron 构建脚本和 `electron-vite` 依赖都在 `packages/desktop/package.json` 内声明 [E: packages/desktop/package.json:2] [E: packages/desktop/package.json:15] [E: packages/desktop/package.json:25] [E: packages/desktop/package.json:53]。

V1/V2 关系: Desktop 现在显式选择两种 host mode，但默认仍是 V1。`OPENCODE_SIDECAR_V2=1` 选择 bundled CLI 的 background `service`；否则继续使用 `virtual:opencode-server` utility process。这个 V1/V2 名称描述 desktop sidecar rollout，不等于 renderer 自己实现两套 session loop；具体 API/runtime 仍由被启动的 server 决定。[E: packages/desktop/src/main/index.ts:63][E: packages/desktop/src/main/index.ts:315][E: packages/desktop/src/main/index.ts:321][E: packages/desktop/src/main/index.ts:323][E: packages/desktop/src/main/index.ts:335][E: packages/desktop/src/main/index.ts:338][E: packages/desktop/src/main/sidecar.ts:57][E: packages/desktop/src/main/sidecar.ts:59]

## 技术栈

- Electron + Electron utility process: `spawnLocalServer` 通过 `utilityProcess.fork(sidecar, ...)` 启动 sidecar JS [E: packages/desktop/src/main/server.ts:63] [E: packages/desktop/src/main/server.ts:64]。
- `electron-vite`: package scripts 使用 `electron-vite dev/build/preview`, build config 用 `defineConfig` 分 main/preload/renderer 三块 [E: packages/desktop/package.json:15] [E: packages/desktop/package.json:17] [E: packages/desktop/package.json:18] [E: packages/desktop/electron.vite.config.ts:34] [E: packages/desktop/electron.vite.config.ts:82] [E: packages/desktop/electron.vite.config.ts:93]。
- SolidJS renderer: renderer import `@opencode-ai/app` 的 `AppBaseProviders`, `AppInterface`, `PlatformProvider`, `ServerConnection` 等导出 [E: packages/desktop/src/renderer/index.tsx:5] [E: packages/desktop/src/renderer/index.tsx:6] [E: packages/desktop/src/renderer/index.tsx:10] [E: packages/desktop/src/renderer/index.tsx:12] [E: packages/desktop/src/renderer/index.tsx:13]。
- Effect main flow: Electron main 的 `main` 是 `Effect.gen(...)`, 收尾通过 `Effect.runFork(main)` 启动 [E: packages/desktop/src/main/index.ts:114] [E: packages/desktop/src/main/index.ts:416]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/desktop/electron.vite.config.ts` | Electron build graph。main 同时输入 `src/main/index.ts` 和 `src/main/sidecar.ts`, renderer 使用 `@opencode-ai/app/vite` 插件和 `packages/app/public` publicDir [E: packages/desktop/electron.vite.config.ts:41] [E: packages/desktop/electron.vite.config.ts:94] [E: packages/desktop/electron.vite.config.ts:95]。 |
| `packages/desktop/src/main/index.ts` | 主进程生命周期。设置 embedded-web-ui flag、app id/userData、注册 IPC，并按 `SIDECAR_VERSION` 选择 background CLI 或 embedded utility-process server。[E: packages/desktop/src/main/index.ts:63][E: packages/desktop/src/main/index.ts:122][E: packages/desktop/src/main/index.ts:274][E: packages/desktop/src/main/index.ts:315][E: packages/desktop/src/main/index.ts:321][E: packages/desktop/src/main/index.ts:338][E: packages/desktop/src/main/index.ts:367]。 |
| `packages/desktop/src/main/background-cli.ts` | V2 rollout path。解析 bundled CLI，按版本 stage 到 userData，跨 state-home 检查已有 service，再执行 `service start/get password`。[E: packages/desktop/src/main/background-cli.ts:19][E: packages/desktop/src/main/background-cli.ts:24][E: packages/desktop/src/main/background-cli.ts:27][E: packages/desktop/src/main/background-cli.ts:33][E: packages/desktop/src/main/background-cli.ts:43][E: packages/desktop/src/main/background-cli.ts:44][E: packages/desktop/src/main/background-cli.ts:60][E: packages/desktop/src/main/background-cli.ts:76]。 |
| `packages/desktop/src/main/draft-store.ts` + `main/ipc.ts` | Desktop prompt draft SQLite store 与 IPC bridge：documents/blobs 分表、WAL、content hash、buffered document writes。[E: packages/desktop/src/main/draft-store.ts:7][E: packages/desktop/src/main/draft-store.ts:11][E: packages/desktop/src/main/draft-store.ts:16][E: packages/desktop/src/main/draft-store.ts:19][E: packages/desktop/src/main/ipc.ts:54][E: packages/desktop/src/main/ipc.ts:131]。 |
| `packages/desktop/src/main/onboarding.ts` | 首次启动持久状态。它记录旧布局资格与 onboarding 完成位，按选择创建 Documents 下的 `Default Project` [E: packages/desktop/src/main/onboarding.ts:12] [E: packages/desktop/src/main/onboarding.ts:27] [E: packages/desktop/src/main/onboarding.ts:33] [E: packages/desktop/src/main/onboarding.ts:39] [E: packages/desktop/src/main/onboarding.ts:42]。 |
| `packages/desktop/src/main/server.ts` | sidecar process manager。负责 fork、ready/error handshake、current `/api/health` 与 legacy `/global/health` 轮询、stop timeout [E: packages/desktop/src/main/server.ts:64] [E: packages/desktop/src/main/server.ts:108] [E: packages/desktop/src/main/server.ts:116] [E: packages/desktop/src/main/server.ts:172] [E: packages/desktop/src/main/server.ts:175] [E: packages/desktop/src/main/server.ts:186] [E: packages/desktop/src/main/server.ts:189]。 |
| `packages/desktop/src/main/sidecar.ts` | sidecar bootstrap。接收 `start/stop` 消息, 设置 server username/password 和 XDG state, 调用 `Server.listen` [E: packages/desktop/src/main/sidecar.ts:41] [E: packages/desktop/src/main/sidecar.ts:44] [E: packages/desktop/src/main/sidecar.ts:51] [E: packages/desktop/src/main/sidecar.ts:83] [E: packages/desktop/src/main/sidecar.ts:85] [E: packages/desktop/src/main/sidecar.ts:86] [E: packages/desktop/src/main/sidecar.ts:87] [E: packages/desktop/src/main/sidecar.ts:59]。 |
| `packages/desktop/src/preload/types.ts` | preload API contract。renderer 可调用 sidecar lifecycle、WSL、updater、store、file picker、zoom、debug log 等方法 [E: packages/desktop/src/preload/types.ts:44] [E: packages/desktop/src/preload/types.ts:47] [E: packages/desktop/src/preload/types.ts:48] [E: packages/desktop/src/preload/types.ts:49] [E: packages/desktop/src/preload/types.ts:60] [E: packages/desktop/src/preload/types.ts:76] [E: packages/desktop/src/preload/types.ts:81] [E: packages/desktop/src/preload/types.ts:102] [E: packages/desktop/src/preload/types.ts:111]。 |
| `packages/desktop/src/renderer/index.tsx` | Desktop renderer adapter。构造 desktop `Platform`，等待 optional window ID/state，再等 sidecar credentials、default server、locale 与 WSL state，最后把 `AppInterface` 挂到 `DesktopMemoryRouter`。[E: packages/desktop/src/renderer/index.tsx:114][E: packages/desktop/src/renderer/index.tsx:173][E: packages/desktop/src/renderer/index.tsx:350][E: packages/desktop/src/renderer/index.tsx:354][E: packages/desktop/src/renderer/index.tsx:377][E: packages/desktop/src/renderer/index.tsx:380][E: packages/desktop/src/renderer/index.tsx:437][E: packages/desktop/src/renderer/index.tsx:446]。 |
| `packages/desktop/src/renderer/onboarding.tsx` | renderer 侧 onboarding gate。它等待 server/tabs ready, 仅对本地、全新安装、根路由、无 tabs、只有 built-in servers 的场景创建默认项目与 draft [E: packages/desktop/src/renderer/onboarding.tsx:15] [E: packages/desktop/src/renderer/onboarding.tsx:21] [E: packages/desktop/src/renderer/onboarding.tsx:23] [E: packages/desktop/src/renderer/onboarding.tsx:26] [E: packages/desktop/src/renderer/onboarding.tsx:41] [E: packages/desktop/src/renderer/onboarding.tsx:47]。 |

## 数据模型

Desktop 自己最重要的跨进程数据结构是 `ServerReadyData`, 它包含 sidecar URL、username、password, 由 main process 的 `Deferred` 交给 renderer [E: packages/desktop/src/preload/types.ts:18] [E: packages/desktop/src/main/index.ts:252] [E: packages/desktop/src/main/index.ts:375]。`SidecarCommand` 在 sidecar 侧区分 `start` 和 `stop`, `start` 需要 hostname、port、password、userDataPath [E: packages/desktop/src/main/sidecar.ts:13] [E: packages/desktop/src/main/sidecar.ts:21] [E: packages/desktop/src/main/sidecar.ts:22]。

`Platform` adapter 是 renderer 的主抽象。Desktop renderer 返回 `platform: "desktop"`, 从 user agent 推断 `os`, 并把 native picker、store、updater、debug log、clipboard image、WSL servers、zoom、desktop menu 等能力映射到 `window.api` [E: packages/desktop/src/renderer/index.tsx:114] [E: packages/desktop/src/renderer/index.tsx:116] [E: packages/desktop/src/renderer/index.tsx:169] [E: packages/desktop/src/renderer/index.tsx:175] [E: packages/desktop/src/renderer/index.tsx:182] [E: packages/desktop/src/renderer/index.tsx:230] [E: packages/desktop/src/renderer/index.tsx:238] [E: packages/desktop/src/renderer/index.tsx:244] [E: packages/desktop/src/renderer/index.tsx:286] [E: packages/desktop/src/renderer/index.tsx:296] [E: packages/desktop/src/renderer/index.tsx:304] [E: packages/desktop/src/renderer/index.tsx:310]。

Desktop draft store 使用 `drafts.sqlite`：document key/value 与 blob id/data 分表并启用 WAL。document writes 合并到 500ms timer transaction，quit/session-end 时 flush；blob 以 SHA-256 去重，启动时扫描 documents 并删除无引用 blobs。renderer 把五个 draft IPC 方法适配回 App 的 `DraftStore`。[E: packages/desktop/src/main/draft-store.ts:7][E: packages/desktop/src/main/draft-store.ts:11][E: packages/desktop/src/main/draft-store.ts:16][E: packages/desktop/src/main/draft-store.ts:19][E: packages/desktop/src/main/draft-store.ts:22][E: packages/desktop/src/main/draft-store.ts:35][E: packages/desktop/src/main/draft-store.ts:37][E: packages/desktop/src/main/draft-store.ts:44][E: packages/desktop/src/main/draft-store.ts:56][E: packages/desktop/src/main/draft-store.ts:67][E: packages/desktop/src/main/ipc.ts:55][E: packages/desktop/src/main/ipc.ts:58][E: packages/desktop/src/main/ipc.ts:60][E: packages/desktop/src/main/ipc.ts:131][E: packages/desktop/src/main/ipc.ts:137][E: packages/desktop/src/renderer/index.tsx:230][E: packages/desktop/src/renderer/index.tsx:231][E: packages/desktop/src/renderer/index.tsx:232][E: packages/desktop/src/renderer/index.tsx:233][E: packages/desktop/src/renderer/index.tsx:234][E: packages/desktop/src/renderer/index.tsx:235]

## 控制流

1. Electron main 设置 context menu, 切工作目录到 home, 禁用 server embedded Web UI, 设置 app id/userData, 初始化 logging/crash reporter [E: packages/desktop/src/main/index.ts:115] [E: packages/desktop/src/main/index.ts:119] [E: packages/desktop/src/main/index.ts:122] [E: packages/desktop/src/main/index.ts:124] [E: packages/desktop/src/main/index.ts:142] [E: packages/desktop/src/main/index.ts:148] [E: packages/desktop/src/main/index.ts:149]。
2. main 调用 `preferAppEnv(app.getPath("userData"))`, 让 sidecar 环境带上 desktop client 标记、file watcher/icon discovery flags 和 XDG state [E: packages/desktop/src/main/index.ts:210] [E: packages/desktop/src/main/server.ts:44] [E: packages/desktop/src/main/server.ts:49] [E: packages/desktop/src/main/server.ts:50] [E: packages/desktop/src/main/server.ts:51] [E: packages/desktop/src/main/server.ts:52]。
3. main 记录 `SIDECAR_VERSION`。V2 分支调用 `startBackgroundCli`，把 service 返回的 URL 与 `opencode`/password 直接 resolve 到 `serverReady`；Windows 还初始化 WSL server，然后提前结束 loading task。[E: packages/desktop/src/main/index.ts:315][E: packages/desktop/src/main/index.ts:316][E: packages/desktop/src/main/index.ts:321][E: packages/desktop/src/main/index.ts:323][E: packages/desktop/src/main/index.ts:324][E: packages/desktop/src/main/index.ts:330][E: packages/desktop/src/main/index.ts:335]
4. `startBackgroundCli` 在 packaged app 中先按 CLI `--version` 把 binary stage 到 `userData/cli/<version>`；它检查环境与 desktop app state-home candidates 的 `service status`，然后在发现或默认 state home 上执行 `service start` 和 `service get password`。[E: packages/desktop/src/main/background-cli.ts:19][E: packages/desktop/src/main/background-cli.ts:20][E: packages/desktop/src/main/background-cli.ts:24][E: packages/desktop/src/main/background-cli.ts:25][E: packages/desktop/src/main/background-cli.ts:27][E: packages/desktop/src/main/background-cli.ts:33][E: packages/desktop/src/main/background-cli.ts:36][E: packages/desktop/src/main/background-cli.ts:42][E: packages/desktop/src/main/background-cli.ts:43][E: packages/desktop/src/main/background-cli.ts:44][E: packages/desktop/src/main/background-cli.ts:60][E: packages/desktop/src/main/background-cli.ts:61][E: packages/desktop/src/main/background-cli.ts:76]
5. V1 默认分支才选择 `127.0.0.1` port：优先 `OPENCODE_PORT`，否则临时 listen 取空闲端口；再生成随机 password 并调用 `spawnLocalServer`。[E: packages/desktop/src/main/index.ts:338][E: packages/desktop/src/main/index.ts:339][E: packages/desktop/src/main/index.ts:345][E: packages/desktop/src/main/index.ts:361][E: packages/desktop/src/main/index.ts:363][E: packages/desktop/src/main/index.ts:365][E: packages/desktop/src/main/index.ts:367]
6. `spawnLocalServer` fork `sidecar.js`, 向 child post `{ type: "start", hostname, port, password, userDataPath }`, 等待 sidecar 发 `ready`; sidecar 再设置 server credentials/XDG state、import virtual server bundle、调用 `Server.listen`。[E: packages/desktop/src/main/server.ts:63] [E: packages/desktop/src/main/server.ts:64] [E: packages/desktop/src/main/server.ts:108] [E: packages/desktop/src/main/server.ts:132][E: packages/desktop/src/main/sidecar.ts:51][E: packages/desktop/src/main/sidecar.ts:57][E: packages/desktop/src/main/sidecar.ts:59][E: packages/desktop/src/main/sidecar.ts:83][E: packages/desktop/src/main/sidecar.ts:87]
7. V1 branch 先把 credentials resolve 到 `serverReady`，再做 current `/api/health` 与 legacy `/global/health` 的兼容 health probe；30 秒 timeout/失败只记日志，仍完成 loading task 并恢复窗口。V2 branch 在 background service command 成功后于 main 提前返回，不走这段 embedded helper；但两种分支的 renderer 都仍把未禁用 health check 的 `AppInterface` 接到共享 `ConnectionGate`。[E: packages/desktop/src/main/index.ts:321][E: packages/desktop/src/main/index.ts:335][E: packages/desktop/src/main/index.ts:375][E: packages/desktop/src/main/index.ts:385][E: packages/desktop/src/main/index.ts:386][E: packages/desktop/src/main/index.ts:387][E: packages/desktop/src/main/index.ts:389][E: packages/desktop/src/main/index.ts:394][E: packages/desktop/src/main/index.ts:395][E: packages/desktop/src/main/index.ts:399][E: packages/desktop/src/main/server.ts:186][E: packages/desktop/src/main/server.ts:189][E: packages/desktop/src/renderer/index.tsx:350][E: packages/desktop/src/renderer/index.tsx:407][E: packages/desktop/src/renderer/index.tsx:420][E: packages/app/src/app.tsx:422][E: packages/app/src/app.tsx:445]
8. renderer 把 sidecar credentials 变成 `ServerConnection.Sidecar` 列表项, 拼上 WSL server, 再用 `availableStartupServer(defaultServer.latest, wslServers.data)` 计算 default server key 并传给 `AppInterface` [E: packages/desktop/src/renderer/index.tsx:382] [E: packages/desktop/src/renderer/index.tsx:386] [E: packages/desktop/src/renderer/index.tsx:388] [E: packages/desktop/src/renderer/index.tsx:397] [E: packages/desktop/src/renderer/index.tsx:400] [E: packages/desktop/src/renderer/index.tsx:400]。
9. main 在确定 `userData` 后初始化旧布局资格，并把三个 onboarding 方法装进 preload API [E: packages/desktop/src/main/index.ts:142] [E: packages/desktop/src/main/index.ts:147] [E: packages/desktop/src/main/index.ts:289] [E: packages/desktop/src/main/index.ts:290] [E: packages/desktop/src/main/index.ts:291]。renderer 把 `DesktopFirstLaunchOnboarding` 放进 `AppInterface.serverScoped`, 并用 `startup={onboarding.promise}` 等待引导检查完成 [E: packages/desktop/src/renderer/index.tsx:357] [E: packages/desktop/src/renderer/index.tsx:411] [E: packages/desktop/src/renderer/index.tsx:413] [E: packages/desktop/src/renderer/index.tsx:415]。

## 设计动机与权衡

Desktop V1 把 server 放在 utility process，而不是 renderer。[E: packages/desktop/src/main/server.ts:64] 这种进程边界可以隔离 long-running server、保留 Electron main 对 lifecycle 的控制。[I] main 的兼容 health helper 是 best-effort readiness observation，不是窗口恢复的成功门槛；真正面向用户的 blocking/background health state仍由共享 renderer `ConnectionGate` 管理。[E: packages/desktop/src/main/index.ts:375][E: packages/desktop/src/main/index.ts:385][E: packages/desktop/src/main/index.ts:387][E: packages/desktop/src/main/index.ts:394][E: packages/desktop/src/main/index.ts:395][E: packages/desktop/src/main/index.ts:399][E: packages/app/src/app.tsx:422][E: packages/app/src/app.tsx:445] `OPENCODE_DISABLE_EMBEDDED_WEB_UI = "true"` 表明 desktop 不需要 server 自己再 serve embedded web UI, 因为 renderer 由 Electron bundle提供 [E: packages/desktop/src/main/index.ts:122]。

上述 utility-process main helper 只适用于默认 V1 path。V2 rollout 选择 CLI background service，同 state-home、同安装版本的已健康 daemon 才可复用；版本不匹配时 `status` 不返回 URL，`start` 会停止旧进程后启动当前版本。packaged app 另把 bundled binary 按版本复制到 userData，避免二进制被 app 升级直接替换。[E: packages/cli/src/services/daemon.ts:66][E: packages/cli/src/services/daemon.ts:76][E: packages/cli/src/services/daemon.ts:110][E: packages/cli/src/services/daemon.ts:114][E: packages/cli/src/services/daemon.ts:115][E: packages/cli/src/services/daemon.ts:146][E: packages/cli/src/services/daemon.ts:149][E: packages/cli/src/services/daemon.ts:150][E: packages/desktop/src/main/background-cli.ts:24][E: packages/desktop/src/main/background-cli.ts:25][E: packages/desktop/src/main/background-cli.ts:61][E: packages/desktop/src/main/background-cli.ts:70][E: packages/desktop/src/main/background-cli.ts:71][E: packages/desktop/src/main/background-cli.ts:72][E: packages/desktop/src/main/background-cli.ts:73][E: packages/desktop/src/main/background-cli.ts:74][E: packages/desktop/src/main/background-cli.ts:76]

## Gotcha

- `virtual:opencode-server` 不是源码中的普通 import, 它由 `electron.vite.config.ts` 的 `opencode:virtual-server-module` 插件解析到 `../opencode/dist/node/node.js` [E: packages/desktop/electron.vite.config.ts:65] [E: packages/desktop/electron.vite.config.ts:68]。
- Electron main bundle 显式用 Rollup banner 注入 Node CommonJS shim；这避免 electron-vite 的 regex insertion 与 bundled TypeScript 互相干扰 [E: packages/desktop/electron.vite.config.ts:41] [E: packages/desktop/electron.vite.config.ts:44] [E: packages/desktop/electron.vite.config.ts:47] [E: packages/desktop/electron.vite.config.ts:48] [E: packages/desktop/electron.vite.config.ts:49] [E: packages/desktop/electron.vite.config.ts:50] [I]。
- Desktop 的 renderer 并不是 fork 一套 UI, 它直接 import `@opencode-ai/app` 的 providers/interface/platform/server symbols [E: packages/desktop/src/renderer/index.tsx:5] [E: packages/desktop/src/renderer/index.tsx:6] [E: packages/desktop/src/renderer/index.tsx:12] [E: packages/desktop/src/renderer/index.tsx:13]。
- Desktop host 属于 `v: na`: 它包装运行中的 server, 不改变 V1/V2 session kernel 归属 [I]。
- V2 sidecar 仍是 opt-in；`electron-builder` 默认排除 `resources/opencode-cli*`，只有 dev channel 通过 extraResources 打包该 binary。不能从源码分支存在推断 beta/prod 安装包已启用 V2 sidecar。[E: packages/desktop/src/main/index.ts:63][E: packages/desktop/electron-builder.config.ts:58][E: packages/desktop/electron-builder.config.ts:60][E: packages/desktop/electron-builder.config.ts:65]
- background CLI 的 pinned download version 是 `0.0.0-next-16350`，这是 desktop build 输入，不是本 Wiki target SHA 或 public release version。[E: packages/desktop/scripts/utils.ts:6]

## Sources

- `packages/desktop/package.json`
- `packages/desktop/electron.vite.config.ts`
- `packages/desktop/src/main/index.ts`
- `packages/desktop/src/main/background-cli.ts`
- `packages/desktop/src/main/draft-store.ts`
- `packages/desktop/src/main/ipc.ts`
- `packages/desktop/src/main/onboarding.ts`
- `packages/desktop/src/main/server.ts`
- `packages/desktop/src/main/sidecar.ts`
- `packages/desktop/src/preload/types.ts`
- `packages/desktop/src/renderer/index.tsx`
- `packages/desktop/src/renderer/onboarding.tsx`
- `packages/desktop/scripts/utils.ts`
- `packages/desktop/electron-builder.config.ts`
- `packages/cli/src/services/daemon.ts`

## 相关

- [App UI shell(SolidJS)](app.md)
- [HTTP server](../server/http-server.md)
