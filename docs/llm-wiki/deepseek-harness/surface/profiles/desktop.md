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
symbols:
  - PROFILE_TEMPLATES
  - rejectElectronProfile
  - resolveDesktopPaths
  - WEB_PROFILE
  - claimDesktopSingleInstance
  - runDesktopHost
related:
  - surface.profiles.web
  - surface.cli.overview
  - spine.composition-boot
evidence: explicit
status: verified
updated: 477b4f4205
---

> `desktop` 是 Electron 应用独占的 **目录名**，不是 `PROFILE_TEMPLATES` 里的第六个 CLI profile。壳进程占用 `$DSH_HOME/profiles/desktop`，用自定义协议 `dsh-app://` 加子进程字节管道承载 Web 组合；**不** 开监听端口。`dsh --profile desktop` 被 launcher 拒绝。

## 能回答的问题

- `desktop` 在不在 `PROFILE_TEMPLATES`？五个 shipped CLI profile 键是哪些？
- `dsh --profile desktop` / `dsh plugin --profile desktop` / `Desktop` 大小写会怎样？
- Electron 把 profile 写到哪？和 `$DSH_HOME/profiles/web` 是不是同一套发现规则？
- 为什么没有 `--port`、也没有 `webserver.listen`？流量走哪条载体？
- 子进程 boot 的仍是 `dsh-base` + `dsh-web-app` 吗？谁把 `webserver` disable 掉？

## 是什么

DSH 的 shipped **CLI** 组合模板只有 `PROFILE_TEMPLATES` 五个键：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] 对象字面量里 **没有** `desktop`。

`apps/desktop` 包名 `@deepseek-ai/dsh-desktop`，描述是 bundled dsh runtime 的 Electron 壳。[E: apps/desktop/package.json:2] [E: apps/desktop/package.json:3] 它 **不** 走 `dsh --profile` 自动 `initProfile`。第一次使用由 Electron 自己 `createPluginProfile` 写出目录：`initProfile(projectDir, PROFILE_TEMPLATES.web.bundles)`，因此 bundles 是 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`（从 `PROFILE_TEMPLATES.web` 读出来）。[E: apps/desktop/src/project-manager.ts:32] [E: apps/desktop/src/project-manager.ts:175]

子进程入口是私有包 `@deepseek-ai/dsh-desktop-host`。[E: apps/desktop-host/package.json:2] 它调用 CLI 的 `runProfile({ profile: 'desktop', resolvedProfile, args: ['--no-open', '--port', '19387'] })`，再用 `dsh-app://` 把浏览器文档接到本机 `webServer` 端口，而不是走 `dsh --profile desktop`。[E: apps/desktop-host/src/index.ts:25] [E: apps/desktop-host/src/index.ts:30] [E: apps/desktop-host/src/index.ts:103]

## 入口

| 入口 | 行为 |
|---|---|
| Electron 应用 | `claimDesktopSingleInstance` 成功后才继续；失败的第二实例 `quit()`，返回 `false`。[E: apps/desktop/src/main.ts:1280] [E: apps/desktop/src/single-instance.ts:20] [E: apps/desktop/src/single-instance.ts:21] |
| `dsh --profile desktop`（任意大小写）或简写 `dsh desktop` | launcher `rejectElectronProfile`：`profile.toLowerCase() === 'desktop'` 时 `program.error('error: profile "desktop" is managed exclusively by the Electron application')`。[E: apps/cli/src/args.ts:83] [E: apps/cli/src/args.ts:85] 发生在 `resolveBoot` **之前**，因此 `--dump-config` 同样进不了。[E: apps/cli/src/args.ts:182] 测试：`desktop` / `Desktop` / `DESKTOP` / 带 `--dump-config` 都是 exit 1。[E: apps/cli/tests/args.spec.ts:83] [E: apps/cli/tests/args.spec.ts:208] |
| `dsh plugin --profile desktop add …` | 同一道门，作用在 plugin 子命令上。[E: apps/cli/src/args.ts:194] [E: apps/cli/tests/args.spec.ts:212] |
| `dsh --from-default-profile desktop` | `initializeProfileFromDefault` 用 `Object.hasOwn(PROFILE_TEMPLATES, fromDefaultProfile)`；`desktop` 不在表里 → `unknown default profile "desktop"; expected one of …`（排序后的五个 shipped 键）。[E: apps/cli/src/profile-boot.ts:111] [E: apps/cli/src/profile-boot.ts:116] |
| `$DSH_HOME/profiles/desktop/` | Electron 独占的 profile 目录，见下一节。CLI 即使看见这个目录也不会 boot：名字在 parse 阶段已被拒。 |

没有 `dsh desktop` 作为合法 CLI profile。`dsh <name>` 简写同样会撞上 `rejectElectronProfile`。

## 关键字段

### 独占路径

`resolveDesktopPaths(dshHome = resolveDshHome())` 把 Electron 拥有的路径钉在共享 Harness home 下：

| 字段 | 值 |
|---|---|
| `profile` | `join(dshHome, 'profiles', 'desktop')` → `$DSH_HOME/profiles/desktop` [E: apps/desktop/src/paths.ts:19] |
| `lock` | 同目录下的 `lock` [E: apps/desktop/src/paths.ts:20] |

`PROFILES_DIR` 字面量是 `'profiles'`，与 CLI 的 `$DSH_HOME/profiles/<name>` 同一层。[E: packages/boot/app-boot/src/profile.ts:37] 差别是：**名字 `desktop` 只许 Electron 写**。`createPluginProfile` 调用 `initProfile(projectDir, WEB_PROFILE.bundles)`。[E: apps/desktop/src/project-manager.ts:175]

### 无监听端口

产品面 **没有** listen port：

1. Electron 用特权 scheme `dsh-app` 注册 `protocol.handle`。[E: apps/desktop/src/main.ts:617]
2. 子进程 `dsh-desktop-host` 用 `runProfile` 启动 **web 那一对 bundle**，inner args 是 `--no-open --port 19387`。[E: apps/desktop-host/src/index.ts:30]
3. 就绪后把 `ctx.connection.authenticatedUrl(\`http://127.0.0.1:${ctx.webServer.port}\`)` 经 IPC 交给壳。[E: apps/desktop-host/src/index.ts:103] 浏览器文档走 `dsh-app://`，不是让人去敲 `dsh --profile desktop`。

## 装配与门控

叠层（桌面子进程走 `runProfile` + `resolvedProfile`，不是 `dsh --profile desktop`）：

1. `loadProfileDirectory` 读 Electron 写出的 `$DSH_HOME/profiles/desktop`。[E: apps/desktop-host/src/index.ts:23]
2. 各 bundle patch（`dsh-base` 然后 `dsh-web-app`，因此 **带四份 shipped preset 文件**）+ 用户层。
3. inner args `--no-open --port 19387` 交给 web-startup；壳再用 `dsh-app://` 承接页面。[E: apps/desktop-host/src/index.ts:30]

`web` CLI profile 的 bind / `--host` / `--port` / `--no-open` 权威在 [`surface.profiles.web`](web.md)。desktop 复用同一对 bundle，所以 web-app 的四份 preset **会**叠上；CLI 入口仍然拒绝 `--profile desktop`。

失败怎么响：

| 条件 | 响应 |
|---|---|
| `dsh --profile desktop`（任意大小写） | launcher usage error，exit 1，不 boot、不 dump |
| `dsh plugin --profile desktop …` | 同上 |
| `--from-default-profile desktop` | `unknown default profile`，列出五个 shipped 键 |
| 第二 Electron 实例 | `requestSingleInstanceLock` 失败 → `quit()` [E: apps/desktop/src/single-instance.ts:20] |

## 跨包关系

- `surface.profiles.web`（[web.md](web.md)）— 五个 CLI 模板里的 live Web 组合：同一对 `dsh-base` + `dsh-web-app`，但 **会** listen，且走 `dsh --profile web` / `dsh web`。desktop 不是这张表上的键。
- `surface.cli.overview`（[../cli/overview.md](../cli/overview.md)）— launcher 四种 mode、`dsh <name>` 简写与 `--profile` 边界；本页只补 `rejectElectronProfile` 这道门。
- `spine.composition-boot`（[../../spine/composition-boot.md](../../spine/composition-boot.md)）— `profile → bundle → preset` 叠层。desktop-host 经 `runProfile` + `resolvedProfile` 启动 web 那一对 bundle，不是 CLI `--profile desktop`。

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

## 相关

- `surface.profiles.web`：[web profile](web.md)
- `surface.cli.overview`：[CLI 入口与旗标](../cli/overview.md)
- `spine.composition-boot`：[组合启动(profile→bundle→preset)](../../spine/composition-boot.md)
