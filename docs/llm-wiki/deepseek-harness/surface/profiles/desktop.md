---
id: surface.profiles.desktop
title: desktop（Electron 壳，非 CLI profile）
kind: surface
tier: T1
pkg: composition
source:
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - apps/cli/src/args.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/args.spec.ts
  - apps/desktop/package.json
  - apps/desktop/src/paths.ts
  - apps/desktop/src/main.ts
  - apps/desktop/src/host-process.ts
  - apps/desktop/src/project-manager.ts
  - apps/desktop/src/single-instance.ts
  - apps/desktop/src/host-protocol.ts
  - apps/desktop-host/package.json
  - apps/desktop-host/src/index.ts
  - apps/desktop-host/config/desktop.cordis.patch.yml
symbols:
  - PROFILE_TEMPLATES
  - rejectElectronProfile
  - resolveDesktopPaths
  - DESKTOP_PROFILE_BUNDLES
  - DesktopHostProcess
  - claimDesktopSingleInstance
  - runDesktopHost
related:
  - surface.profiles.web
  - surface.cli.overview
  - spine.composition-boot
evidence: explicit
status: verified
updated: c291e7961a
---

> `desktop` 是 Electron 应用独占的 **目录名**，不是 `PROFILE_TEMPLATES` 里的第六个 CLI profile。壳进程占用 `$DSH_HOME/profiles/desktop`，用自定义协议 `dsh-app://` 加子进程字节管道承载 Web 组合；**不** 开监听端口。`dsh --profile desktop` 被 launcher 拒绝。

## 能回答的问题

- `desktop` 在不在 `PROFILE_TEMPLATES`？五个 shipped CLI profile 键是哪些？
- `dsh --profile desktop` / `dsh plugin --profile desktop` / `Desktop` 大小写会怎样？
- Electron 把 profile 写到哪？和 `$DSH_HOME/profiles/web` 是不是同一套发现规则？
- 为什么没有 `--port`、也没有 `webserver.listen`？流量走哪条载体？
- 子进程 boot 的仍是 `dsh-base` + `dsh-web-app` 吗？谁把 `webserver` disable 掉？

## 是什么

DSH 的 shipped **CLI** 组合模板只有 `PROFILE_TEMPLATES` 五个键：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:105] [E: packages/boot/app-boot/src/profile.ts:106] [E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:114] [E: packages/boot/app-boot/src/profile.ts:118] [E: packages/boot/app-boot/src/profile.ts:122] 对象字面量里 **没有** `desktop`。测试按对象相等锁死 `acp` / `sdk` / `sdk-minimal`，并断言 `web` / `headless` 的 `patchReload`；同样没有 `PROFILE_TEMPLATES.desktop`。[E: packages/boot/app-boot/tests/profile.spec.ts:215] [E: packages/boot/app-boot/tests/profile.spec.ts:219] [E: packages/boot/app-boot/tests/profile.spec.ts:223]

`apps/desktop` 包名 `@deepseek-ai/dsh-desktop`，描述是 bundled dsh runtime 的 Electron 壳。[E: apps/desktop/package.json:2] [E: apps/desktop/package.json:3] 它 **不** 走 `dsh --profile` 自动 `initProfile`。第一次使用由 Electron 自己 `createPluginProfile` 写出目录，bundles 硬编码为 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`（与 `PROFILE_TEMPLATES.web` 同两个包，但 **不是** 从那张表读出来的）。[E: apps/desktop/src/project-manager.ts:81] [E: apps/desktop/src/project-manager.ts:608]

子进程入口是私有包 `@deepseek-ai/dsh-desktop-host`。[E: apps/desktop-host/package.json:2] 它 `boot` 桌面 profile 的 patch 树，再用 framed byte pipe 承接 `dsh-app://` 请求，而不是让 `webserver` bind TCP。[E: apps/desktop-host/src/index.ts:279] [E: apps/desktop-host/config/desktop.cordis.patch.yml:7]

## 入口

| 入口 | 行为 |
|---|---|
| Electron 应用 | `claimDesktopSingleInstance` 成功后才 `app.whenReady().then(main)`。[E: apps/desktop/src/main.ts:506] [E: apps/desktop/src/main.ts:508] 失败的第二实例 `quit()`，返回 `false`。[E: apps/desktop/src/single-instance.ts:20] [E: apps/desktop/src/single-instance.ts:22] |
| `dsh --profile desktop`（任意大小写） | launcher `rejectElectronProfile`：`profile.toLowerCase() === 'desktop'` 时 `program.error('error: profile "desktop" is managed exclusively by the Electron application')`。[E: apps/cli/src/args.ts:69] [E: apps/cli/src/args.ts:70] 发生在 `resolveBoot` **之前**，因此 `--dump-config` 同样进不了。[E: apps/cli/src/args.ts:159] 测试：`desktop` / `Desktop` / `DESKTOP` / 带 `--dump-config` 都是 exit 1。[E: apps/cli/tests/args.spec.ts:119] [E: apps/cli/tests/args.spec.ts:122] |
| `dsh plugin --profile desktop add …` | 同一道门，作用在 plugin 子命令上。[E: apps/cli/src/args.ts:198] [E: apps/cli/tests/args.spec.ts:123] |
| `dsh --from-default-profile desktop` | `initializeProfileFromDefault` 用 `Object.hasOwn(PROFILE_TEMPLATES, fromDefaultProfile)`；`desktop` 不在表里 → `unknown default profile "desktop"; expected one of …`（排序后的五个 shipped 键）。[E: apps/cli/src/profile-boot.ts:110] [E: apps/cli/src/profile-boot.ts:116] |
| `$DSH_HOME/profiles/desktop/` | Electron 独占的 profile 目录，见下一节。CLI 即使看见这个目录也不会 boot：名字在 parse 阶段已被拒。 |

没有 `dsh desktop` 子命令。唯一硬编码 profile 子命令仍是 `dsh web`。

## 关键字段

### 独占路径

`resolveDesktopPaths(dshHome = resolveDshHome())` 把 Electron 拥有的路径钉在共享 Harness home 下：

| 字段 | 值 |
|---|---|
| `profile` | `join(dshHome, 'profiles', 'desktop')` → `$DSH_HOME/profiles/desktop` [E: apps/desktop/src/paths.ts:31] |
| `lock` | 同目录下的 `lock` [E: apps/desktop/src/paths.ts:32] |
| `root` | `join(dshHome, 'desktop')`（pnpm store / cache 等，**不是** profile 目录）[E: apps/desktop/src/paths.ts:27] |

`PROFILES_DIR` 字面量是 `'profiles'`，与 CLI 的 `$DSH_HOME/profiles/<name>` 同一层。[E: packages/boot/app-boot/src/profile.ts:42] 差别是：**名字 `desktop` 只许 Electron 写**。打包应用的 `main()` 把 `activeProject` 设成 `paths.profile`（开发态才改用 `.desktop-build/development/project`）。[E: apps/desktop/src/main.ts:154]

`createPluginProfile` 写出 `name: '@deepseek-ai/dsh-desktop-runtime'` 的 `package.json`，`dsh.profile.bundles` 为 `DESKTOP_PROFILE_BUNDLES`。[E: apps/desktop/src/project-manager.ts:606] [E: apps/desktop/src/project-manager.ts:608] 已装 profile 必须 **以这两包开头**，否则 throw `profile must begin with the built-in desktop bundle list`。[E: apps/desktop/src/project-manager.ts:169] [E: apps/desktop/src/project-manager.ts:170]

### 无监听端口

产品面 **没有** listen port：

1. Electron 用特权 scheme `dsh-app` 注册 `protocol.handle`；`hostname === 'app'` 的请求转给子进程 `host.fetch`，不是 `http://127.0.0.1:3080`。[E: apps/desktop/src/main.ts:26] [E: apps/desktop/src/main.ts:283] [E: apps/desktop/src/main.ts:295]
2. `DesktopHostProcess.start` spawn 的 argv 是 Node + `@deepseek-ai/dsh-desktop-host/lib/index.js` + `runtimeDir` + `projectDir`（开发态才多 `--inspect=127.0.0.1:<port>` 与 `--allow-linked-profile`）。没有 `--port`、没有 web 旗标。[E: apps/desktop/src/host-process.ts:109] [E: apps/desktop/src/host-process.ts:114] `stdio` 是 `ignore/pipe/pipe/pipe/pipe/ipc`，请求/响应走 fd 3 / 4。[E: apps/desktop/src/host-process.ts:120] [E: apps/desktop/src/host-protocol.ts:7] [E: apps/desktop/src/host-protocol.ts:10]
3. desktop-host overlay **disable** `web-startup` / `webserver` / `web-runtime` / `client-hmr`。[E: apps/desktop-host/config/desktop.cordis.patch.yml:4] [E: apps/desktop-host/config/desktop.cordis.patch.yml:7] [E: apps/desktop-host/config/desktop.cordis.patch.yml:10] [E: apps/desktop-host/config/desktop.cordis.patch.yml:13] `runDesktopHost` 的 `provideCmdline` 传入 `args: []`，没有 app 旗标可解析成 bind。[E: apps/desktop-host/src/index.ts:298] 就绪后用 `connection.createSharedFetchHandler('/api')` 在进程内接请求。[E: apps/desktop-host/src/index.ts:308]

`DSH_DESKTOP_HOST_INSPECT_PORT` 只在开发态打开 **Node inspector**（`1..65535`），不是产品 HTTP 口。[E: apps/desktop/src/main.ts:80] [E: apps/desktop/src/main.ts:84] [E: apps/desktop/src/host-process.ts:110]

## 装配与门控

叠层（桌面子进程，不是 `apps/cli` 的 `composeProfile`）：

1. `loadProfileDirectory` 读 Electron 写出的 `$DSH_HOME/profiles/desktop`（或开发 project）。
2. 各 bundle patch（`dsh-base` 然后 `dsh-web-app`）+ 用户层。
3. 再叠 `apps/desktop-host/config/desktop.cordis.patch.yml`：关掉网络/浏览器启动行，改 `connection` 的 inject，insert native directory-picker。[E: apps/desktop-host/src/index.ts:163] [E: apps/desktop-host/config/desktop.cordis.patch.yml:25]
4. 若树里有 `agent-presets`，再补一条 overlay，把 shipped preset root 指到安装里的 `config/agent-presets`。[E: apps/desktop-host/src/index.ts:166] [E: apps/desktop-host/src/index.ts:172]

`web` CLI profile 的 bind / `--host` / `--port` / `--no-open` 权威在 [`surface.profiles.web`](web.md)。desktop 复用同一对 bundle，但 overlay 抽掉 `webserver`，所以 **没有** 那组旗标，也没有 `dsh web: http://…` 就绪行。

失败怎么响：

| 条件 | 响应 |
|---|---|
| `dsh --profile desktop`（任意大小写） | launcher usage error，exit 1，不 boot、不 dump |
| `dsh plugin --profile desktop …` | 同上 |
| `--from-default-profile desktop` | `unknown default profile`，列出五个 shipped 键 |
| 第二 Electron 实例 | `requestSingleInstanceLock` 失败 → `quit()`，不碰 profile 目录 |
| 子进程没露出 fd 3/4 | `dsh desktop host did not expose the required byte pipes and IPC channel` [E: apps/desktop/src/host-process.ts:126] |
| 组合缺 `connection` / `typertGateway` / `clientModules` | host throw，fiber dispose [E: apps/desktop-host/src/index.ts:306] |
| profile bundles 不以内建两包开头 | `DesktopProjectManager` throw |

## 跨包关系

- `surface.profiles.web`（[web.md](web.md)）— 五个 CLI 模板里的 live Web 组合：同一对 `dsh-base` + `dsh-web-app`，但 **会** listen，且走 `dsh --profile web` / `dsh web`。desktop 不是这张表上的键。
- `surface.cli.overview`（[../cli/overview.md](../cli/overview.md)）— launcher 三种 mode 与 `--profile` 边界；本页只补 `rejectElectronProfile` 这道门。
- `spine.composition-boot`（[../../spine/composition-boot.md](../../spine/composition-boot.md)）— `profile → bundle → preset` 叠层。desktop-host 自己 `boot` + overlay，不经过 `apps/cli/src/profile-boot.ts` 的 `runProfile`。

## Sources

- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/tests/profile.spec.ts
- apps/cli/src/args.ts
- apps/cli/src/profile-boot.ts
- apps/cli/tests/args.spec.ts
- apps/desktop/package.json
- apps/desktop/src/paths.ts
- apps/desktop/src/main.ts
- apps/desktop/src/host-process.ts
- apps/desktop/src/project-manager.ts
- apps/desktop/src/single-instance.ts
- apps/desktop/src/host-protocol.ts
- apps/desktop-host/package.json
- apps/desktop-host/src/index.ts
- apps/desktop-host/config/desktop.cordis.patch.yml

## 相关

- `surface.profiles.web`：[web profile](web.md)
- `surface.cli.overview`：[CLI 入口与旗标](../cli/overview.md)
- `spine.composition-boot`：[组合启动(profile→bundle→preset)](../../spine/composition-boot.md)
