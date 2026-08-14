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
  - apps/cli/tests/built-bin.e2e.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/util/home-paths/src/index.ts
symbols:
  - runPlugin
  - initProfile
  - PROFILE_TEMPLATES
  - DEFAULT_PROFILE_BUNDLES
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `dsh plugin --profile <name> <pnpm args...>` 是 `@deepseek-ai/dsh` launcher 的 `mode: 'plugin'`：在 `$DSH_HOME/profiles/<name>` 里把 pnpm 当 thin forwarder，成功后再按**已安装状态** reconcile `dsh.profile.bundles`。它改的是 **host 面**（进程级 profile → bundle 层列表），不改 agent-preset 成员资格，也不 boot Cordis 树。

## 能回答的问题

- `dsh plugin` 和 `dsh --profile` / `dsh web` 分别走哪条 mode？plugin 会不会挂 webserver / tools / persona？
- 第一次对未知名字（help 例子里的 `tui`）跑 `dsh plugin`，会不会自动 `initProfile`？初始 `bundles` 是什么？
- 什么样的 dependency 会进入或离开 `dsh.profile.bundles`？模板自带的 `@deepseek-ai/dsh-base` 会被 reconcile 删掉吗？
- `dsh plugin --profile x add .` 为什么按调用 cwd 锚定，而不是在 profile 目录自链？
- 父级 `--profile` / `--patch` / `--dump-config` / `--dump-default-config` 为什么被拒绝？
- PATH 上没有 pnpm、或 pnpm 非 0 退出时，退出码是什么？还会不会写 `package.json` 的 bundles？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**：`profile → bundle → agent preset`。capability seam 是 Definition / Provider / Consumer；模型看得见的东西必须能从 session 日志重建（`model-visible ⟺ logged`）。`dsh plugin` 站在这条主线的 **host 面**入口：它只维护 profile 目录里的 npm 依赖和 `dsh.profile.bundles` 层序，让下一次 `dsh --profile <name>` / `dsh web` 把那些 bundle 的 `cordis.patch.yml` 叠进进程级树。

它**不是**又一个 coding-agent 插件市场，也**不是** agent-preset 安装器。Preset 成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`；`dsh plugin` 不读、不写这些文件。本命令也不 `provide` 任何 seam、不 `mountPreset`、不产生 session 事件，因此没有 isolate 域可谈。

一个 npm 包算不算 profile bundle，只看它安装后的 `package.json` 是否声明 `dsh.bundle.patch`。shipped 三个 bundle 都这样声明：

| 包名 | `dsh.bundle.patch` |
|---|---|
| `@deepseek-ai/dsh-base` | `./cordis.patch.yml` [E: packages/bundle/base/package.json:38] |
| `@deepseek-ai/dsh-web-app` | `./cordis.patch.yml` [E: packages/bundle/web-app/package.json:43] |
| `@deepseek-ai/dsh-headless` | `./cordis.patch.yml` [E: packages/bundle/headless/package.json:43] |

`exportsPatch` 的判定就是 `manifest.dsh?.bundle?.patch !== undefined` [E: apps/cli/src/plugin.ts:44]。解析目录时先走安装锚点 `INSTALL_ANCHOR`（`apps/cli/package.json`），再走 profile 自己的 `package.json` [E: apps/cli/src/plugin.ts:39] [E: apps/cli/src/profile-boot.ts:54] [E: packages/boot/app-boot/src/profile.ts:347]。inbox 模板 bundle 因此始终来自当前 dsh 安装，而不是 profile 里可能被 pnpm 拷进去的副本。

## 入口

包 `@deepseek-ai/dsh` 的 bin 是 `dsh` → `lib/bin.js` [E: apps/cli/package.json:2] [E: apps/cli/package.json:15]。`parseDshArgs` 解析出 `mode: 'plugin'` 后，`bin.ts` **动态 import** `runPlugin`，并用它的返回值 `process.exit` [E: apps/cli/src/bin.ts:40] [E: apps/cli/src/bin.ts:41] [E: apps/cli/src/bin.ts:42]。`mode: 'profile'` 才会 `loadLayeredEnv` + `runProfile` [E: apps/cli/src/bin.ts:30] [E: apps/cli/src/bin.ts:33]；plugin 这条路径既不加载分层 `.env`，也不 compose / boot。

用户键入形态：

```text
dsh plugin --profile <name> <pnpm args...>
```

`plugin` 是 commander 子命令，描述为把剩余参数转发到 profile 目录里的 pnpm [E: apps/cli/src/args.ts:171]。`--profile <name>` 是子命令自己的 **requiredOption**（description 写 initialized on first use）[E: apps/cli/src/args.ts:173]。其余 token 是 `[args...]`，description 写明 `add` / `remove` / `why` 这类 pnpm 动词按原样转发 [E: apps/cli/src/args.ts:175]。子命令开了 `allowUnknownOption()`，所以 `add --save-dev x` 里的 pnpm 旗标会进 `args`，不会被 launcher 吃掉 [E: apps/cli/src/args.ts:174] [E: apps/cli/tests/args.spec.ts:57]。

解析结果是未导出的 `PluginInvocation`：`mode: 'plugin'` + `profile` + `args`，**没有** `patches` 字段 [E: apps/cli/src/args.ts:41] [E: apps/cli/src/args.ts:180]。测试把 `plugin --profile tui add turtle-ui` 钉成 `{ mode: 'plugin', profile: 'tui', args: ['add', 'turtle-ui'] }` [E: apps/cli/tests/args.spec.ts:50]。`tui` 只是自定义 profile 名（launcher help 例子也这么用）；`PROFILE_TEMPLATES` 里没有这一项。

父级（根 `program`）若已经带了 `--profile` / `--patch` / `--dump-config` / `--dump-default-config`，子命令 action 先 `rejectParentOptions('plugin')` [E: apps/cli/src/args.ts:177]。四个父级字段任一已定义就报错：`plugin takes none of parent --profile, --patch, --dump-config, or --dump-default-config` [E: apps/cli/src/args.ts:150] [E: apps/cli/src/args.ts:152]。因此 `dsh --profile x plugin add y` 退出 1 [E: apps/cli/tests/args.spec.ts:98]。`--profile` 必须写在 `plugin` **后面**。

缺 `--profile`、空名字、或没有任何 pnpm 参数，都会在 `parseDshArgs` 里 `program.error` 退出，到不了 `runPlugin`：

| argv | 结果 |
|---|---|
| `plugin add x` | 缺 required `--profile`，退出 1 [E: apps/cli/tests/args.spec.ts:95] |
| `plugin --profile ''` | `error: --profile needs a name` [E: apps/cli/src/args.ts:178] |
| `plugin --profile tui` | `error: plugin needs pnpm arguments to forward (e.g. add <package>)` [E: apps/cli/src/args.ts:179] [E: apps/cli/tests/args.spec.ts:96] |

profile 目录是 `$DSH_HOME/profiles/<name>`（未设或空白 `DSH_HOME` 时回退 `~/.dsh`）[E: packages/util/home-paths/src/index.ts:12] [E: packages/util/home-paths/src/index.ts:18] [E: packages/util/home-paths/src/index.ts:62] [E: packages/util/home-paths/src/index.ts:89] [E: packages/boot/app-boot/src/profile.ts:36] [E: packages/boot/app-boot/src/profile.ts:110]。`runPlugin` 用无第二参的 `resolveProfileDir(profile)` [E: apps/cli/src/plugin.ts:121]。空串、`.`、`..`、含 `/` 或 `\`、以及保留名 `node_modules` 会抛 `invalid profile name` [E: packages/boot/app-boot/src/profile.ts:105] [E: packages/boot/app-boot/src/profile.ts:108]。

## 关键字段

### 子命令自己拥有的旗标

| 旗标 / 位置 | 类型 | 行为 |
|---|---|---|
| `--profile <name>` | plugin `requiredOption` | 目标 profile 名；空串拒绝 [E: apps/cli/src/args.ts:173] [E: apps/cli/src/args.ts:178] |
| `[args...]` | plugin argument | 转发给 `spawnSync('pnpm', …)` 的 argv；至少 1 个 [E: apps/cli/src/args.ts:175] [E: apps/cli/src/args.ts:179] |

`plugin` **不**声明 `--patch` / `--dump-config` / `--dump-default-config`。那些是 `mode: 'profile'` / `mode: 'dump-config'` 的 launcher 旗标；写在 `plugin` 前面会被 `rejectParentOptions` 拒掉。

### 父级禁旗标（写在 `plugin` 之前即失败）

| 父级旗标 | 拒绝条件 |
|---|---|
| `--profile <name>` | `parent.profile !== undefined` [E: apps/cli/src/args.ts:150] |
| `--patch <path>`（可重复） | `parent.patch !== undefined` [E: apps/cli/src/args.ts:150] |
| `--dump-config` | `parent.dumpConfig !== undefined` [E: apps/cli/src/args.ts:151] |
| `--dump-default-config` | `parent.dumpDefaultConfig !== undefined` [E: apps/cli/src/args.ts:151] |

### 首次 init 的 shipped bundle 列表

`runPlugin` 发现目录里还没有 `package.json` 时调用 `initProfile(dir, PROFILE_TEMPLATES[profile] ?? DEFAULT_PROFILE_BUNDLES)` [E: apps/cli/src/plugin.ts:122] [E: apps/cli/src/plugin.ts:123]。

| profile 名 | 初始 `dsh.profile.bundles` | 来源 |
|---|---|---|
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app` | `PROFILE_TEMPLATES.web` [E: packages/boot/app-boot/src/profile.ts:115] |
| `headless` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-headless` | `PROFILE_TEMPLATES.headless` [E: packages/boot/app-boot/src/profile.ts:116] |
| 其它名字（含 help 例子 `tui`） | `@deepseek-ai/dsh-base` | `DEFAULT_PROFILE_BUNDLES` [E: packages/boot/app-boot/src/profile.ts:125] |

`PROFILE_TEMPLATES` **只有** `web` 与 `headless` 两个键 [E: packages/boot/app-boot/src/profile.ts:114]。没有 shipped TUI 包；`tui` 不是模板名。

对照：`loadProfile`（`dsh --profile` / `dsh web` 走的加载）对**没有**模板的名字**不会** init，而是抛 `does not exist; create it with 'dsh plugin --profile <name> add <package>'` [E: packages/boot/app-boot/src/profile.ts:378] [E: packages/boot/app-boot/src/profile.ts:380]。内置 bin 测试核过 `dsh --profile nope` 的 stderr 同时含 `profile "nope" does not exist` 和 `dsh plugin --profile nope add` [E: apps/cli/tests/built-bin.e2e.ts:413] [E: apps/cli/tests/built-bin.e2e.ts:414]。有模板的 `web` / `headless` 在首次 boot 时也会 `initProfile`，但那是 `loadProfile` 自己的分支，不是 `runPlugin`。

### `initProfile` 写出的文件

`initProfile` 对已存在的文件一律不覆盖 [E: packages/boot/app-boot/src/profile.ts:155] [E: packages/boot/app-boot/src/profile.ts:165] [E: packages/boot/app-boot/src/profile.ts:167]。`runPlugin` 只在缺 `package.json` 时调用它；目录里已有 manifest 时，即便 `cordis.patch.yml` / `pnpm-workspace.yaml` 被人删掉，plugin 也不会补写。

| 文件 | 内容 |
|---|---|
| `package.json` | `name: dsh-profile-<basename>`、`private: true`、`dependencies: {}`、`dsh.profile.bundles` 复制传入列表 [E: packages/boot/app-boot/src/profile.ts:157] [E: packages/boot/app-boot/src/profile.ts:159] [E: packages/boot/app-boot/src/profile.ts:160] |
| `cordis.patch.yml` | 用户自己的 patch 层（缺则写入空数组模板）；是 profile 目录文件，不是 bundle 包 [E: packages/boot/app-boot/src/profile.ts:165] |
| `pnpm-workspace.yaml` | `packages: [.]`、`nodeLinker: hoisted`、`autoInstallPeers: false` [E: packages/boot/app-boot/src/profile.ts:141] [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:167] |

模板 bundle 写进 `dsh.profile.bundles`，**同时** `dependencies` 是空对象 [E: packages/boot/app-boot/src/profile.ts:159]。这是 reconcile「不碰 inbox 模板」的前提。单测核过 `initProfile(..., ['@deepseek-ai/dsh-base'])` 后 `bundles` 就是这一项 [E: packages/boot/app-boot/tests/profile.spec.ts:64]；再传入 `['other']` 也不会改已有 manifest 或用户改过的 patch [E: packages/boot/app-boot/tests/profile.spec.ts:70] [E: packages/boot/app-boot/tests/profile.spec.ts:71]。

### `reconcilePlugins` 读写的字段

| 字段 | 角色 |
|---|---|
| `dependencies` 的 key | 已安装依赖的**真实包名**（pnpm 已把 git/path/alias spec 写成名字）；遍历顺序 = 追加到 bundles 的顺序 [E: apps/cli/src/plugin.ts:61] [E: apps/cli/src/plugin.ts:65] |
| `dsh.profile.bundles` | 进程 boot 时的 bundle 层列表；缺省当 `[]` [E: apps/cli/src/plugin.ts:63] |
| `dsh.bundle.patch`（每个依赖的 manifest） | 非 `undefined` ⇒ 这是 bundle，应在层列表里 [E: apps/cli/src/plugin.ts:44] |

只在 `spawnSync` 的 `status` 为 0 时调用 `reconcilePlugins(before, dir)` [E: apps/cli/src/plugin.ts:143] [E: apps/cli/src/plugin.ts:144]。`before` 是 pnpm **之前**读出的 manifest [E: apps/cli/src/plugin.ts:126]。

规则（对 `after.dependencies` 的每个名字）：

1. `exportsPatch` 为真且还不在 `bundles` → `push`，标 `changed` [E: apps/cli/src/plugin.ts:67] [E: apps/cli/src/plugin.ts:68]。
2. 不是 bundle，且 **不在** `before.dependencies` → 向 stderr 打一条「declares no dsh.bundle — installed as a plain dependency」警告 [E: apps/cli/src/plugin.ts:70] [E: apps/cli/src/plugin.ts:72]。已存在的普通依赖不再刷屏。
3. 对当前 `bundles` 里每一项：仅当 `wasDependency`（出现在 before 或 after 的 `dependencies`）并且不再 `stillBundle`（仍在 after 依赖里 **且** 仍声明 patch）时才 `splice` 掉 [E: apps/cli/src/plugin.ts:81] [E: apps/cli/src/plugin.ts:82] [E: apps/cli/src/plugin.ts:83] [E: apps/cli/src/plugin.ts:84]。
4. `changed` 才 `writeProfileManifest` [E: apps/cli/src/plugin.ts:88] [E: apps/cli/src/plugin.ts:90]。

因此：`add` 一个声明了 `dsh.bundle.patch` 的包会入层；`remove` 掉它、或新版本摘掉该声明，会出层。模板写进 bundles、但从未进入 `dependencies` 的 `@deepseek-ai/dsh-base`（以及 `web` / `headless` 模板里的第二个 bundle）**不会**被第 3 步当成 `wasDependency`，reconcile 不碰。内置 bin 测试用手改已安装包的 manifest 再跑无害的 `pnpm root`：v1 无 `dsh.bundle` 时 bundles 仍是 `['@deepseek-ai/dsh-base']`；v2 加上声明后变成 `['@deepseek-ai/dsh-base', 'late-bundle']` [E: apps/cli/tests/built-bin.e2e.ts:681] [E: apps/cli/tests/built-bin.e2e.ts:690]。这证明 reconcile 看的是**安装后的磁盘状态**，不是这次 argv 的 diff，所以 `update` 也能激活后来才声明 bundle 的包。

`exportsPatch` 里 `resolveBundleDir` 抛错（pnpm 报成功但包不可解析）时当成普通依赖，返回 `false`，不让 reconcile 炸掉 [E: apps/cli/src/plugin.ts:41]。对照：下一次 `loadProfile` 若 `bundles` 里仍列着一个 `dsh.bundle.patch` 为 `undefined` 的包，会 **fail loud**（`declares no dsh.bundle`）[E: packages/boot/app-boot/src/profile.ts:392] [E: packages/boot/app-boot/src/profile.ts:393]。plugin 宽松、boot 严格。

### 相对路径 spec（`anchorPathSpec`）

pnpm 的 `cwd` 是 profile 目录 [E: apps/cli/src/plugin.ts:130]。若把用户写的 `.` / `../x` 原样交给 pnpm，会在 profile 里自链。`runPlugin` 在 spawn 前对每个参数跑 `anchorPathSpec(argument, process.cwd())` [E: apps/cli/src/plugin.ts:129]。

匹配正则：`^(file:|link:)?` + `.{1,2}`（可选再跟 `/` 或 `\` 与后续）[E: apps/cli/src/plugin.ts:105]。命中则保留前缀，路径改成 `resolve(调用 cwd, 相对段)` [E: apps/cli/src/plugin.ts:111]；不命中（绝对路径、registry 名、其它 pnpm 参数）原样返回 [E: apps/cli/src/plugin.ts:106]。

| 用户写下的 spec | 处理后 |
|---|---|
| `.` / `..` / `./pkg` / `../pkg` | `resolve(process.cwd(), 该相对路径)` |
| `file:.` / `file:./pkg` / `link:../pkg` | 保留 `file:` / `link:`，只绝对化后面的相对段 |
| 绝对路径、`some-registry-name`、`--save-dev` | 不改 |

`file:` 与裸目录对 pnpm 是 copy vs link，锚定不得改写用户选的那种语义。内置 bin 测试从插件 checkout 跑 `dsh plugin --profile anchor add .`：`dependencies` 出现 `anchored-bundle`（checkout 的 `name`），且 `bundles` 含该名 [E: apps/cli/tests/built-bin.e2e.ts:651] [E: apps/cli/tests/built-bin.e2e.ts:652]。

## 装配与门控

`runPlugin(profile, args)` 的控制流 [E: apps/cli/src/plugin.ts:120]：

1. **解析目录** `resolveProfileDir(profile)` [E: apps/cli/src/plugin.ts:121]。非法名在这一步抛错，不会去 spawn pnpm。
2. **缺 `package.json` 才 init** [E: apps/cli/src/plugin.ts:122]。`web` / `headless` 用对应 `PROFILE_TEMPLATES`；其它名用 `DEFAULT_PROFILE_BUNDLES`（只有 `dsh-base`）[E: apps/cli/src/plugin.ts:123]。init 后往 stderr 写 `initialized profile <name> at <dir>` [E: apps/cli/src/plugin.ts:124]。已有 `package.json` 则跳过，不重新套模板。
3. **拍 `before` 快照** `readProfileManifest('dsh', dir)` [E: apps/cli/src/plugin.ts:126]，供 reconcile 区分「本来就在 dependencies 里的普通库」和「这一次新装上的」。
4. **`spawnSync('pnpm', anchoredArgs, { cwd: dir, stdio: 'inherit', shell: win32 })`** [E: apps/cli/src/plugin.ts:129] [E: apps/cli/src/plugin.ts:130] [E: apps/cli/src/plugin.ts:131] [E: apps/cli/src/plugin.ts:132]。Windows 走 `shell: true`。`stdio: 'inherit'` 让用户直接看见 pnpm 自己的输出。
5. **spawn 自己失败**（`result.error`）：
   - `ENOENT` → stderr「pnpm not found on PATH」[E: apps/cli/src/plugin.ts:137]，**返回 127** [E: apps/cli/src/plugin.ts:138]。
   - 其它 `ErrnoException` → `throw` [E: apps/cli/src/plugin.ts:140]。
6. **pnpm 退出码**取 `result.status ?? 1` [E: apps/cli/src/plugin.ts:142]。
   - `0`：`reconcilePlugins` [E: apps/cli/src/plugin.ts:144]。
   - 非 0：不进入 `reconcilePlugins`（该调用只在 `exitCode === 0` 分支）[E: apps/cli/src/plugin.ts:143] [E: apps/cli/src/plugin.ts:144]。stderr 写 `pnpm failed in profile directory <dir>` [E: apps/cli/src/plugin.ts:149]。若任一原始 arg 匹配 `git+` 前缀、`github:` 前缀、或 `.git` 后接 `#`/结束，再提示：git-hosted 插件靠 `prepare` 构建，pnpm 默认拦住，要把 pnpm 打出的 key 写进该 profile 的 `pnpm-workspace.yaml` 的 `allowBuilds` 再重跑 [E: apps/cli/src/plugin.ts:150]。
7. **把 pnpm 退出码原样返回**给 `bin.ts` 的 `process.exit` [E: apps/cli/src/plugin.ts:157] [E: apps/cli/src/bin.ts:42]。

**isolate / disable：** 本命令不 mount 插件行，没有 `disabled:`、没有 isolate 组、也不看 `DSH_TELEMETRY_DISABLED`。那些门控发生在之后的 `composeProfile` / `mountPreset`。plugin 唯一的「disable」是：失败的 pnpm 让 bundles 维持 `before` 快照。

**和 boot 叠层的衔接：** 下一次 `dsh --profile <name>` 里，`composeProfile` 把 `profile.layers` 摊成 `bundlePatches` [E: apps/cli/src/profile-boot.ts:149]，再按 `allPatches` 顺序叠 profile 自己的 patches、home `$DSH_HOME/cordis.patch.yml`、以及 overlays（`--patch` 文件）[E: apps/cli/src/profile-boot.ts:124] [E: apps/cli/src/profile-boot.ts:125] [E: apps/cli/src/profile-boot.ts:126] [E: apps/cli/src/profile-boot.ts:127]。若组成树上已有 `agent-presets` 行，再往 overlays 推一个 `trust: 'system'` 的 shipped root [E: apps/cli/src/profile-boot.ts:159] [E: apps/cli/src/profile-boot.ts:164]。`dsh plugin` 改的就是这棵真树最底下的 bundle 列表。默认产品面是本地 Web GUI（`dsh web` ≡ `--profile web`），不是 TUI；往默认安装加 host 层，用的是 `dsh plugin --profile web add <package>`。

## 跨包关系

- `surface.cli.overview` — launcher 三种 mode（`profile` / `plugin` / `dump-config`）和根旗标边界；本页只展开 `plugin` 子命令与 `runPlugin`。
- `surface.profiles.web` — `PROFILE_TEMPLATES.web` 的两元组（`dsh-base` + `dsh-web-app`）以及 web 在 host 面插入的 webserver / `agent-presets` 行。`dsh plugin --profile web` 首次 init 用的就是这张表。
- `surface.profiles.headless` — `PROFILE_TEMPLATES.headless` 的两元组（`dsh-base` + `dsh-headless`）。`dsh plugin` 只改该 profile 的 `dsh.profile.bundles`，不会写入任何 `agent.cordis.yml`。
- `spine.composition-boot` — `dsh.profile.bundles` 如何经 `loadProfile` / `composeEntries` 变成进程树。plugin 是改这份列表的 CLI，不是 boot 本身。
- `@deepseek-ai/dsh-app-boot` 的 `initProfile` / `resolveBundleDir` / `resolveProfileDir` — 目录布局与双锚点解析的权威实现；本页只覆盖 `dsh plugin` 调用它们的门控。
- `surface.presets.overview` — preset 发现与 `mountPreset`。`dsh plugin` 不修改 `apps/cli/config/agent-presets/*/agent.cordis.yml`，所以不能靠它把某个 tool 装进 `standard` / `minimal` / `code` / `cordis`。

## Sources

- `apps/cli/src/plugin.ts`
- `apps/cli/src/args.ts`
- `apps/cli/src/bin.ts`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/package.json`
- `apps/cli/tests/args.spec.ts`
- `apps/cli/tests/built-bin.e2e.ts`
- `packages/boot/app-boot/src/profile.ts`
- `packages/boot/app-boot/tests/profile.spec.ts`
- `packages/bundle/base/package.json`
- `packages/bundle/web-app/package.json`
- `packages/bundle/headless/package.json`
- `packages/util/home-paths/src/index.ts`

## 相关

无 index related。邻居节点：

- [surface.cli.overview](overview.md) — `dsh` launcher 三 mode 与根旗标。
- [surface.profiles.web](../profiles/web.md) — `web` 模板 bundles 与 host overlay。
- [surface.profiles.headless](../profiles/headless.md) — `headless` 模板 bundles 与 one-shot runner。
- [spine.composition-boot](../../spine/composition-boot.md) — profile 真树叠层（bundle → user → home → `--patch`）。
- [surface.presets.overview](../presets/overview.md) — agent-preset 成员资格与 `mountPreset`（plugin 不改这里）。
