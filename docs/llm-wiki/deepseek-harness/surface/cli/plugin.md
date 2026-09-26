---
id: surface.cli.plugin
title: dsh plugin 子命令
kind: surface
tier: T1
pkg: composition
source:
  - apps/cli/src/plugin.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/package.json
  - apps/cli/tests/args.spec.ts
  - packages/boot/plugin-manager/src/operations.ts
  - packages/boot/plugin-manager/src/index.ts
  - packages/boot/plugin-manager/src/types.ts
  - packages/boot/plugin-manager/src/tools.ts
  - packages/boot/plugin-manager/package.json
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/bundle/base/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/acp-app/package.json
  - packages/util/home-paths/src/index.ts
symbols:
  - runPlugin
  - runPluginCommand
  - PluginManager
  - initProfile
  - PROFILE_TEMPLATES
  - DEFAULT_PROFILE_BUNDLES
  - OPTIONAL_BUNDLES
related:
  - surface.cli.overview
  - surface.profiles.web
  - surface.profiles.headless
  - spine.composition-boot
  - surface.presets.overview
evidence: explicit
status: verified
updated: 477b4f4205
---

> `dsh plugin --profile <name> <pnpm args...>` 是 `@deepseek-ai/dsh` launcher 的 `mode: 'plugin'`：在 `$DSH_HOME/profiles/<name>` 里把 pnpm 交给 `@deepseek-ai/dsh-plugin-manager/operations` 的 `runPluginCommand`，成功后再按**已安装状态** reconcile `dsh.profile.bundles`。它改的是 **host 面**（进程级 profile → bundle 层列表），不改 agent-preset 成员资格，也不 boot Cordis 树。同包的 `PluginManager`（`ctx.pluginManager`）与模型可见 `plugin_manager` 工具共用这套 operations。

## 能回答的问题

- `dsh plugin` 和 `dsh --profile` / `dsh web` 分别走哪条 mode？plugin 会不会挂 webserver / tools / persona？
- 第一次对未知名字（help 例子里的 `tui`）跑 `dsh plugin`，会不会自动 `initProfile`？初始 `bundles` 是什么？
- 什么样的 dependency 会进入或离开 `dsh.profile.bundles`？`OPTIONAL_BUNDLES` 是什么、会不会被当成 shipped 模板？
- `dsh plugin --profile x add .` 为什么按调用 cwd 锚定，而不是在 profile 目录自链？
- 父级 `--profile` 写在 `plugin` 前面会怎样？`dsh plugin` 能不能 boot 名叫 `plugin` 的 profile？
- PATH 上没有 pnpm、或 pnpm 非 0 退出时，退出码是什么？还会不会写 `package.json` 的 bundles？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**：`profile → bundle → agent preset`。`dsh plugin` 站在这条主线的 **host 面**入口：它只维护 profile 目录里的 npm 依赖和 `dsh.profile.bundles` 层序，让下一次 `dsh <name>` / `dsh --profile <name>` 把那些 bundle 的 `cordis.patch.yml` 叠进进程级树。

它**不是**又一个 coding-agent 插件市场，也**不是** agent-preset 安装器。四个 shipped preset 只作为 `@deepseek-ai/dsh-web-app` 的 `dsh.bundle.patch` 列表后续文件叠上。[E: packages/bundle/web-app/package.json:43] `dsh plugin` 不读、不写这些 preset 文件。本命令也不 `provide` 任何 seam、不 `mountPreset`、不产生 session 事件。

一个 npm 包算不算 profile bundle，只看它安装后的 `package.json` 是否声明 `dsh.bundle.patch`。`bundleManifest` 的判定就是 `manifest.dsh?.bundle?.patch === undefined` 则不是 bundle。[E: packages/boot/plugin-manager/src/operations.ts:77] 六个 shipped bundle 都这样声明：

| 包名 | `dsh.bundle.patch` |
|---|---|
| `@deepseek-ai/dsh-base` | `./cordis.patch.yml` [E: packages/bundle/base/package.json:33] |
| `@deepseek-ai/dsh-web-app` | **列表**：`cordis.patch.yml` + 四份 `presets/*.patch.yml` [E: packages/bundle/web-app/package.json:43] |
| `@deepseek-ai/dsh-headless` | `./cordis.patch.yml` [E: packages/bundle/headless/package.json:39] |
| `@deepseek-ai/dsh-sdk-app` | `./cordis.patch.yml` [E: packages/bundle/sdk-app/package.json:33] |
| `@deepseek-ai/dsh-sdk-minimal` | `./cordis.patch.yml` [E: packages/bundle/sdk-minimal/package.json:33] |
| `@deepseek-ai/dsh-acp-app` | `./cordis.patch.yml` [E: packages/bundle/acp-app/package.json:33] |

**`OPTIONAL_BUNDLES`** 是安装随附、默认关掉、由 plugin manager 列出的 experimental bundle：`@deepseek-ai/dsh-experimental-agent-team-profile` / `@deepseek-ai/dsh-experimental-voice-input-bundle` / `@deepseek-ai/dsh-experimental-auto-review`。[E: packages/boot/app-boot/src/profile.ts:213] `PluginManager.listBundles` 把 `OPTIONAL_BUNDLES.includes(name)` 标成 `optional: true`，且安装自带的这些包 **never removable**。[E: packages/boot/plugin-manager/src/index.ts:290] [E: packages/boot/plugin-manager/src/types.ts:57] 它们不是 `PROFILE_TEMPLATES` 成员。

同包还有两条产品面，本页只点名：

| 面 | 符号 | 挂载 |
|---|---|---|
| Host 服务 | `PluginManager` / `ctx.pluginManager` | `dsh-base` `id: plugin-manager`，`disabled: !!js "!ctx.get('profileContext')"` [E: packages/boot/plugin-manager/src/index.ts:176] [E: packages/bundle/base/cordis.patch.yml:20] |
| 模型可见工具 | `plugin_manager` | `id: tool-plugin-manager`，出厂 `disabled: true`；preset 行默认仍 disabled。权威在 [`surface.tools.plugin-manager`](../tools/plugin-manager.md)。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/boot/plugin-manager/src/tools.ts:20] |

CLI `dsh plugin` **不** `plugin(PluginManager)`：它直接调 `runPluginCommand`。[E: apps/cli/src/plugin.ts:2] [E: apps/cli/src/plugin.ts:69]

## 入口

包 `@deepseek-ai/dsh` 的 bin 是 `dsh` → `lib/bin.js`。[E: apps/cli/package.json:2] [E: apps/cli/package.json:15] `parseDshArgs` 解析出 `mode: 'plugin'` 后，`bin.ts` **动态 import** `runPlugin`，并用它的返回值 `process.exit`。[E: apps/cli/src/bin.ts:40] [E: apps/cli/src/bin.ts:42] `mode: 'profile'` 才会 `loadLayeredEnv` + `runProfile`；plugin 这条路径既不加载分层 `.env`，也不 compose / boot。

用户键入形态：

```text
dsh plugin --profile <name> <pnpm args...>
```

`plugin` 只在 argv[0] 恰好是 `plugin` 时注册为 commander 子命令。[E: apps/cli/src/args.ts:186] `--profile <name>` 是子命令自己的 **requiredOption**。[E: apps/cli/src/args.ts:189] 其余 token 是 `[args...]`，`add` / `remove` / `why` 这类 pnpm 动词按原样转发。[E: apps/cli/src/args.ts:191] 子命令开了 `allowUnknownOption()`，所以 `add --save-dev x` 里的 pnpm 旗标会进 `args`。[E: apps/cli/src/args.ts:190] [E: apps/cli/tests/args.spec.ts:121]

解析结果是 `PluginInvocation`：`mode: 'plugin'` + `profile` + `args`，**没有** `patches` 字段。[E: apps/cli/src/args.ts:53] [E: apps/cli/src/args.ts:196] 测试把 `plugin --profile tui add turtle-ui` 钉成 `{ mode: 'plugin', profile: 'tui', args: ['add', 'turtle-ui'] }`。[E: apps/cli/tests/args.spec.ts:114] `tui` 只是自定义 profile 名；`PROFILE_TEMPLATES` 里没有这一项。

`dsh <name>` 是通用 `--profile` 简写，但 **`plugin` 是保留字**：`dsh plugin …` 永远走管理命令。要 boot 一个名叫 `plugin` 的 profile，必须写 `dsh --profile plugin`。[E: apps/cli/src/args.ts:201] [E: apps/cli/tests/args.spec.ts:74] `dsh --profile x plugin add y` 是 `mode: 'profile'`，`args` 含 `plugin add y`，不是这条 runner。[E: apps/cli/tests/args.spec.ts:75]

缺 `--profile`、空名字、或没有任何 pnpm 参数，都会在 `parseDshArgs` 里退出，到不了 `runPlugin`：

| argv | 结果 |
|---|---|
| `plugin add x` | 缺 required `--profile`，退出 1 [E: apps/cli/tests/args.spec.ts:205] |
| `plugin --profile ''` | `error: --profile needs a name` [E: apps/cli/src/args.ts:193] |
| `plugin --profile tui` | `error: plugin needs pnpm arguments to forward (e.g. add <package>)` [E: apps/cli/src/args.ts:195] [E: apps/cli/tests/args.spec.ts:206] |
| `plugin --profile desktop add x` | `rejectElectronProfile`，exit 1 [E: apps/cli/tests/args.spec.ts:212] |

profile 目录是 `$DSH_HOME/profiles/<name>`（未设或空白 `DSH_HOME` 时回退 `~/.dsh`）。[E: packages/util/home-paths/src/index.ts:88] [E: packages/boot/app-boot/src/profile.ts:169] 空串、`.`、`..`、含 `/` 或 `\`、以及保留名 `node_modules` 会抛 `invalid profile name`。[E: packages/boot/app-boot/src/profile.ts:170]

五个 shipped CLI profile 都可以 `dsh plugin --profile web|headless|sdk|sdk-minimal|acp …`；简写 `dsh web` 是 boot，不是 plugin。

## 关键字段

### 子命令自己拥有的旗标

| 旗标 / 位置 | 类型 | 行为 |
|---|---|---|
| `--profile <name>` | plugin `requiredOption` | 目标 profile 名；空串拒绝 [E: apps/cli/src/args.ts:189] [E: apps/cli/src/args.ts:193] |
| `[args...]` | plugin argument | 转发给 `runPluginCommand` 的 argv；至少 1 个 [E: apps/cli/src/args.ts:191] [E: apps/cli/src/args.ts:195] |

`plugin` **不**声明 `--patch` / `--dump-*`。那些是 profile / dump 模式的 launcher 旗标。

### DSH 自有的 version 子命令（不转 pnpm）

`runPlugin` 先跑 `versionCommand`：若 argv 以 `allow-version` / `revoke-version` / `version-exemptions` 开头，就改 profile 的兼容性 exemption，**不** spawn pnpm。[E: apps/cli/src/plugin.ts:13] [E: apps/cli/src/plugin.ts:63]

| 命令 | 作用 |
|---|---|
| `allow-version <pkg@ver> --dsh-version <exact> --accept-risk` | 允许一份不兼容插件版本；必须 `--accept-risk` [E: apps/cli/src/plugin.ts:34] |
| `revoke-version <pkg@ver> --dsh-version <exact>` | 撤销 exemption |
| `version-exemptions` | 把当前 exemption JSON 打到 stdout |

pnpm 非 0 且有 `incompatible` 条目时，CLI 会提示同一条 `allow-version` 命令。[E: apps/cli/src/plugin.ts:77]

### 首次 init 的 shipped bundle 列表

`runPluginCommand` 发现目录里还没有 `package.json` 时调用 `initProfile(dir, template?.bundles ?? DEFAULT_PROFILE_BUNDLES)`。[E: packages/boot/plugin-manager/src/operations.ts:551] [E: packages/boot/plugin-manager/src/operations.ts:552] `initProfile` 现在只收 `dir` + `bundles`，不再写 `patchReload`。[E: packages/boot/app-boot/src/profile.ts:243]

| profile 名 | 初始 `dsh.profile.bundles` | 来源 |
|---|---|---|
| `acp` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-acp-app` | `PROFILE_TEMPLATES.acp` [E: packages/boot/app-boot/src/profile.ts:180] |
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app` | `PROFILE_TEMPLATES.web` [E: packages/boot/app-boot/src/profile.ts:183] |
| `headless` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-headless` | `PROFILE_TEMPLATES.headless` [E: packages/boot/app-boot/src/profile.ts:186] |
| `sdk` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-sdk-app` | `PROFILE_TEMPLATES.sdk` [E: packages/boot/app-boot/src/profile.ts:189] |
| `sdk-minimal` | **仅** `@deepseek-ai/dsh-sdk-minimal`（不叠 `dsh-base`） | `PROFILE_TEMPLATES['sdk-minimal']` [E: packages/boot/app-boot/src/profile.ts:192] |
| 其它名字（含 help 例子 `tui`） | `@deepseek-ai/dsh-base` | `DEFAULT_PROFILE_BUNDLES` [E: packages/boot/app-boot/src/profile.ts:203] |

`PROFILE_TEMPLATES` 有五个键：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] 没有 shipped TUI 包；`tui` 不是模板名。`desktop` 在 parse 期就被拒，到不了 init。

对照：`loadProfile`（`dsh --profile` / `dsh web` 走的加载）对**没有**模板的名字**不会** init，而是抛 `does not exist; create it with 'dsh plugin --profile <name> add <package>'`。[E: packages/boot/app-boot/src/profile.ts:712]

### `initProfile` 写出的文件

`initProfile` 对已存在的文件一律不覆盖。[E: packages/boot/app-boot/src/profile.ts:256] [E: packages/boot/app-boot/src/profile.ts:259]

| 文件 | 内容 |
|---|---|
| `package.json` | `name: dsh-profile-<basename>`、`private: true`、`dependencies: {}`、`dsh.profile.bundles` 复制传入列表 [E: packages/boot/app-boot/src/profile.ts:251] [E: packages/boot/app-boot/src/profile.ts:254] |
| `cordis.patch.yml` | 用户自己的 patch 层（缺则写入空数组模板）[E: packages/boot/app-boot/src/profile.ts:259] |
| `pnpm-workspace.yaml` | `packages: [.]`、`nodeLinker: hoisted`、`autoInstallPeers: false` [E: packages/boot/app-boot/src/profile.ts:229] |

模板 bundle 写进 `dsh.profile.bundles`，**同时** `dependencies` 是空对象。[E: packages/boot/app-boot/src/profile.ts:253] 这是 reconcile「不碰 inbox 模板」的前提。

### `reconcile` 读写的字段

`runProfilePnpm` 成功后调 `reconcile(before, dir, …)`。[E: packages/boot/plugin-manager/src/operations.ts:89]

| 字段 | 角色 |
|---|---|
| `dependencies` 的 key | 已安装依赖的真实包名 |
| `dsh.profile.bundles` | 进程 boot 时的 bundle 层列表；缺省当 `[]` [E: packages/boot/plugin-manager/src/operations.ts:93] |
| `dsh.bundle.patch` | 非 `undefined` ⇒ 这是 bundle [E: packages/boot/plugin-manager/src/operations.ts:77] |

规则：新装上且声明 patch 的包 `push` 进 bundles；新装上但不是 bundle 的向 stderr 警告 `declares no dsh.bundle`；已从 dependencies 消失、或不再声明 patch 的 selected 包被滤掉。模板写进 bundles、但从未进入 `dependencies` 的 inbox 包（`dsh-base`、各模板第二个 bundle、`sdk-minimal` 的 `dsh-sdk-minimal`、以及 `OPTIONAL_BUNDLES` 安装自带项）不会因为「不在 after.dependencies」被删掉——`beforeDeps`/`dependencies` 都没有时 `filter` 保留原 selected。[E: packages/boot/plugin-manager/src/operations.ts:95]

### 相对路径 spec（`anchorPathSpec`）

pnpm 的 cwd 是 profile 目录。若把用户写的 `.` / `../x` 原样交给 pnpm，会在 profile 里自链。`runProfilePnpm` 在 spawn 前对每个参数跑 `anchorPathSpec(argument, context.cwd)`。[E: packages/boot/plugin-manager/src/operations.ts:357]

匹配：可选 `file:` / `link:` 前缀 + `.` 或 `..`（可选再跟路径）。[E: packages/boot/plugin-manager/src/operations.ts:63] 命中则保留前缀，路径改成 `resolve(调用 cwd, 相对段)`；绝对路径、registry 名、其它 pnpm 参数原样返回。

## 装配与门控

`runPlugin(profile, args)` 的控制流：[E: apps/cli/src/plugin.ts:62]

1. **version 子命令** 若命中则处理 exemption 并返回，不再 spawn pnpm。[E: apps/cli/src/plugin.ts:63]
2. **已有 manifest** 时把 `readProfileCompatibility` 的 warnings 打到 stderr。[E: apps/cli/src/plugin.ts:67]
3. **`runPluginCommand({ profile, installAnchor: INSTALL_ANCHOR, cwd: process.cwd() }, args, { execution: 'cli', … })`**。[E: apps/cli/src/plugin.ts:69] 内部：`resolveProfileDir` → 缺 `package.json` 才 `initProfile` → `runProfilePnpm`。[E: packages/boot/plugin-manager/src/operations.ts:547]
4. **exit 127**：stderr「pnpm was not found; install pnpm…」。[E: apps/cli/src/plugin.ts:76]
5. **非 0**：写 `plugin command failed; diagnostics: <logPath>`；若任一原始 arg 像 git-hosted spec，再提示要把 pnpm 打出的 key 写进该 profile 的 `pnpm-workspace.yaml` 的 `allowBuilds`。[E: apps/cli/src/plugin.ts:80] [E: apps/cli/src/plugin.ts:81]
6. **把 pnpm / operations 退出码原样返回**给 `bin.ts` 的 `process.exit`。[E: apps/cli/src/plugin.ts:84] [E: apps/cli/src/bin.ts:42]

**isolate / disable：** 本命令不 mount 插件行，没有 `disabled:`、没有 isolate 组。那些门控发生在之后的 `boot` / `mountPreset`。plugin 唯一的「disable」是：失败的 pnpm 让 bundles 维持 `before` 快照。

**和 boot 叠层的衔接：** 下一次 `dsh --profile <name>` 里，`readProfilePatches` 把 `profile.layers` 摊成 bundle patches，再叠 profile / home / `--patch`。[E: packages/boot/app-boot/src/profile-context.ts:65] `dsh plugin` 改的就是这棵真树最底下的 bundle 列表。往默认安装加 host 层，用的是 `dsh plugin --profile web add <package>`。

## 跨包关系

- `surface.cli.overview` — launcher 四种 mode（`profile` / `plugin` / `dump-config` / `dump-config-schema`）和 `dsh <name>` 简写；本页只展开 `plugin` 子命令与 `runPlugin`。
- `surface.profiles.web` — `PROFILE_TEMPLATES.web` 的两元组以及 web 在 host 面插入的 webserver / `agent-preset-registry` 行。`dsh plugin --profile web` 首次 init 用的就是这张表。
- `surface.profiles.headless` — `PROFILE_TEMPLATES.headless` 的两元组。`dsh plugin` 只改该 profile 的 `dsh.profile.bundles`，不会写入任何 preset 声明。
- `spine.composition-boot` — `dsh.profile.bundles` 如何经 `loadProfile` / `composeEntries` 变成进程树。
- `surface.tools.plugin-manager` — 模型可见 `plugin_manager`；出厂 disabled。本页是 CLI 人命令面。
- `surface.presets.overview` — 声明式 preset 成员资格。`dsh plugin` 不修改 `packages/bundle/web-app/presets/*.patch.yml`。

## Sources

- `apps/cli/src/plugin.ts`
- `apps/cli/src/args.ts`
- `apps/cli/src/bin.ts`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/package.json`
- `apps/cli/tests/args.spec.ts`
- `packages/boot/plugin-manager/src/operations.ts`
- `packages/boot/plugin-manager/src/index.ts`
- `packages/boot/plugin-manager/src/types.ts`
- `packages/boot/plugin-manager/src/tools.ts`
- `packages/boot/plugin-manager/package.json`
- `packages/boot/app-boot/src/profile.ts`
- `packages/boot/app-boot/tests/profile.spec.ts`
- `packages/bundle/base/package.json`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/package.json`
- `packages/bundle/headless/package.json`
- `packages/bundle/sdk-app/package.json`
- `packages/bundle/sdk-minimal/package.json`
- `packages/bundle/acp-app/package.json`
- `packages/util/home-paths/src/index.ts`

## 相关

- [surface.cli.overview](overview.md) — `dsh` launcher 四 mode、`dsh <name>` 简写与根旗标。
- [surface.profiles.web](../profiles/web.md) — `web` 模板 bundles 与 host overlay。
- [surface.profiles.headless](../profiles/headless.md) — `headless` 模板 bundles 与 one-shot runner。
- [spine.composition-boot](../../spine/composition-boot.md) — profile 真树叠层（bundle → user → home → `--patch`）。
- [surface.presets.overview](../presets/overview.md) — agent-preset 成员资格（plugin 不改这里）。
