---
id: surface.cli.overview
title: CLI 入口与旗标
kind: surface
tier: T1
pkg: composition
source:
  - apps/cli/src/bin.ts
  - apps/cli/src/args.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/plugin.ts
  - apps/cli/src/process-shutdown.ts
  - apps/cli/package.json
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/telemetry-switch.spec.ts
  - apps/cli/tests/built-bin.e2e.ts
  - packages/boot/cmdline/src/index.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/headless/src/startup.ts
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/acp-app/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/display.ts
  - packages/util/home-paths/src/index.ts
symbols: [parseDshArgs, DshInvocation, runProfile, runDumpConfig, PROFILE_TEMPLATES, rejectElectronProfile]
related: [ref.cli-flags, spine.composition-boot]
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh` 的 `dsh` 可执行文件是 Cordis **组合运行时**的进程 launcher：只解析自己拥有的旗标，解析出三种 `DshInvocation` mode（`profile` / `plugin` / `dump-config`），再动态 import 对应 runner；`dsh web` 只是 `--profile web` 的 alias，仍然是 `mode: 'profile'`。没有 `dsh sdk` / `dsh acp` / `dsh headless` / `dsh desktop` 子命令。`desktop` 不是第六个 CLI profile：launcher 会 `rejectElectronProfile`。

## 能回答的问题

- `dsh` 的 npm 包名、bin 落到哪个文件、`--version` 从哪读？
- launcher 自己吃哪些 option / 子命令？第一个它不认识的 token 之后去哪？
- `dsh web`、`dsh plugin`、`--dump-config`、`--from-default-profile` 各是哪种 `DshInvocation.mode`？
- 为什么 `dsh --profile desktop` 会立刻失败？大小写呢？
- `--dump-config` 与 `--dump-default-config` 如何互斥？dump 能不能带 app args 或 `--patch`？
- shipped `--profile` 有哪些？`tui` / `desktop` 是不是模板？未知名字第一次 `dsh --profile <name>` 会怎样？
- `runProfile` 的 patch 叠层顺序是什么？host 面和 agent-preset 面在 launcher 里怎么分？

## 是什么

DSH 不是「又一个 coding agent」。`dsh` 启动的是一棵 **profile → bundle →（可选）agent preset** 的 Cordis 插件树。

包 `@deepseek-ai/dsh` 发布 bin 名 `dsh`，指向构建产物 `lib/bin.js`。[E: apps/cli/package.json:2] [E: apps/cli/package.json:15] 发布 `files` 只含 `lib/*.js`，不再随 CLI 带 `config/` 树；shipped preset 目录在 `@deepseek-ai/dsh-agent-presets` 的 `presets/`。[E: apps/cli/package.json:17] [E: packages/preset/agent-presets/src/discovery.ts:60] 源码入口是 `apps/cli/src/bin.ts`。版本字符串从同包 `package.json` 的 `version` 字段读（当前冻结树为 `0.1.5-rc.2`）；`version` 不是 string 时回退 `'0.0.0'`。[E: apps/cli/package.json:4] [E: apps/cli/src/bin.ts:21]

`parseDshArgs` 把 `process.argv.slice(2)` 收成导出类型 `DshInvocation` = `ProfileInvocation | DumpConfigInvocation | PluginInvocation`。help / version / 语法错误在 `parseDshArgs` **内部** `process.exit`，只有合法 mode 回到 `bin.ts` 的 `switch`。[E: apps/cli/src/args.ts:126] [E: apps/cli/src/bin.ts:31]

| `mode` | 用户怎么打 | runner |
|---|---|---|
| `'profile'` | `dsh --profile <name> …` 或 `dsh web …` | 动态 import `runProfile`；先 `loadLayeredEnv('dsh')` |
| `'plugin'` | `dsh plugin --profile <name> <pnpm args…>` | 动态 import `runPlugin`，然后 `process.exit` 其返回码 |
| `'dump-config'` | 带 `--dump-config` 或 `--dump-default-config` | 动态 import `runDumpConfig`（不 `boot`） |

[E: apps/cli/src/bin.ts:31] [E: apps/cli/src/bin.ts:37] [E: apps/cli/src/bin.ts:43]

`dsh web` 在 commander 里是子命令，action 固定把 profile 写成 `'web'`，再走与默认命令相同的 `resolveBoot`；测试断言 `parse(['web'])` 得到 `{ mode: 'profile', profile: 'web', patches: [], args: [] }`。[E: apps/cli/src/args.ts:175] [E: apps/cli/src/args.ts:187] [E: apps/cli/tests/args.spec.ts:30] 这是 launcher **唯一**硬编码的 profile alias。

**`desktop` 被拒。** `rejectElectronProfile`：`profile.toLowerCase() === 'desktop'` → `error: profile "desktop" is managed exclusively by the Electron application`。根命令在 `resolveBoot` 之前调用；`plugin` 子命令同样调用。[E: apps/cli/src/args.ts:68] [E: apps/cli/src/args.ts:70] [E: apps/cli/src/args.ts:159] [E: apps/cli/src/args.ts:198] 测试：`desktop` / `Desktop` / `DESKTOP`、带 `--dump-config`、以及 `plugin --profile desktop` 全部 exit 1。[E: apps/cli/tests/args.spec.ts:119] [E: apps/cli/tests/args.spec.ts:123]

**host 面 vs agent-preset 面。** launcher / `runProfile` 管的是 **host 面**（进程级）：profile 目录、bundle 叠层、`$DSH_HOME` 用户层、`--patch`、`ctx.cmdlineArgs`、信号与 `fail-loud`、可选的 `session-telemetry-otel` 硬关。**agent-preset 面**由 web bundle 在树里 `insert` `id: agent-presets`（`default: standard`）；CLI **不再**往 `allPatches` 压一层 shipped root overlay。[E: packages/bundle/web-app/cordis.patch.yml:481] [E: packages/bundle/web-app/cordis.patch.yml:484] headless overlay 只 insert `code-runtime` / `headless-startup` / `headless-runner`，没有 `agent-presets` 行。[E: packages/bundle/headless/cordis.patch.yml:20] shipped 四个 preset 目录名是 `minimal` / `standard` / `ptc` / `cordis`。[E: packages/preset/agent-presets/src/display.ts:43] [E: packages/preset/agent-presets/src/display.ts:46]

**五个 shipped profile，没有 shipped TUI，没有 desktop 模板。** `PROFILE_TEMPLATES` 键为 `acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:105] 其中只有 `web` 的 `patchReload` 是 `'live'`；其余四个是 `'startup'`。[E: packages/boot/app-boot/src/profile.ts:108] [E: packages/boot/app-boot/src/profile.ts:112] [E: packages/boot/app-boot/src/profile.ts:116] `sdk-minimal` 的 `bundles` **只有** `@deepseek-ai/dsh-sdk-minimal`，不叠 `dsh-base`。[E: packages/boot/app-boot/src/profile.ts:122] `HELP_EXAMPLES` 把 `tui` 写成 custom profile 示例，它不是模板键；`--from-default-profile` 的例子用 `rescue` 从 `web` 模板初始化。[E: apps/cli/src/args.ts:75] [E: apps/cli/src/args.ts:78]

## 入口

用户碰到 `dsh` 的路径：

1. PATH 上的 `dsh` → `lib/bin.js`，或开发态 `pnpm dsh <args…>` 进同一套 `parseDshArgs`。
2. `parseDshArgs(argv, version)` 用 commander：`helpOption(false)` + `allowUnknownOption` + `passThroughOptions` + `enablePositionalOptions`。launcher 旗标必须写在前面；第一个它不认识的 token 起全部进入 `args`，包括 app 的 `-h`。[E: apps/cli/src/args.ts:140] [E: apps/cli/src/args.ts:141]
3. 无 `--profile` 且 leftover 含 `-h` / `--help` 时打印 **launcher** help 并退出 0；无 profile 又不是 help 则报 `--profile <name> is required`。[E: apps/cli/src/args.ts:154] [E: apps/cli/src/args.ts:155]
4. 合法 invocation 回到 `bin.ts`：`mode: 'profile'` 先 `loadLayeredEnv('dsh')` 再 `runProfile`，并传入 `fromDefaultProfile`。[E: apps/cli/src/bin.ts:37]

profile 目录在 `$DSH_HOME/profiles/<name>`。`$DSH_HOME` 由 `resolveDshHome` 解析：非空环境变量 `DSH_HOME`，否则 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:18] [E: packages/util/home-paths/src/index.ts:87]

`--host` / `--no-open` / `--port` / `--trusted-host` 属于 web app（节点 [`surface.profiles.web`](../profiles/web.md)）；headless 的 `[task...]` 属于 headless app（节点 [`surface.profiles.headless`](../profiles/headless.md)）。launcher 把它们留在 `DshInvocation.args`，经 `provideCmdline` 冻成 `ctx.cmdlineArgs` 快照。[E: packages/boot/cmdline/src/index.ts:84]

## 关键字段

### launcher 拥有的 token

下列是 `parseDshArgs` 自己认识的全部 option 与子命令。app 旗标不要读成 launcher 旗标。

| token | 出现位置 | 作用 | 门控 |
|---|---|---|---|
| `--profile <name>` | 根命令 | 指定 `$DSH_HOME/profiles/<name>` | 根命令缺它则报 required；空字符串报 `--profile needs a name`；`desktop`（任意大小写）走 `rejectElectronProfile`。[E: apps/cli/src/args.ts:145] [E: apps/cli/src/args.ts:159] |
| `--from-default-profile <name>` | 根命令 | 用一份 shipped 模板 **初始化** 新的自定义 profile，再 boot / dump | 空名报 `--from-default-profile needs a name`；目标名若已是 shipped 模板、或目录已存在则失败；`desktop` 不在 `PROFILE_TEMPLATES` 里，当 source 会报 unknown default profile。[E: apps/cli/src/args.ts:146] [E: apps/cli/src/args.ts:99] [E: apps/cli/src/profile-boot.ts:104] [E: apps/cli/src/profile-boot.ts:110] |
| `--patch <path>` | 根命令与 `web` | 可重复、**非 variadic** 的 overlay，叠在 profile 层之后 | collector 每次收一个 path；空 path 报 `--patch needs a path`。[E: apps/cli/src/args.ts:66] [E: apps/cli/src/args.ts:147] |
| `--dump-config` | 根命令与 `web` | 打印含用户层与 `--patch` 的组成树，不 boot | 与 `--dump-default-config` 互斥；dump 拒绝任何 leftover app args。[E: apps/cli/src/args.ts:148] [E: apps/cli/src/args.ts:104] |
| `--dump-default-config` | 根命令与 `web` | 只打印 bundle 层 | 与 `--dump-config` 互斥；带 `--patch` 则报错。[E: apps/cli/src/args.ts:149] [E: apps/cli/src/args.ts:114] |
| `-V, --version` | 根命令 | 打印 `readVersion()` 的字符串 | commander `.version`。[E: apps/cli/src/args.ts:133] |
| `-h` / `--help` | 不是注册在 launcher 上的 helpOption | 无 profile 时打 launcher help；有 profile 时进 `args` 交给 app | `helpOption(false)`。[E: apps/cli/src/args.ts:140] |
| `web` | 子命令 | `--profile web` 的 alias，仍 `mode: 'profile'`（或带 dump 旗标时 `mode: 'dump-config'`） | 拒绝父级已解析的 `--profile` / `--from-default-profile` / `--patch` / `--dump-*`。[E: apps/cli/src/args.ts:175] [E: apps/cli/src/args.ts:186] |
| `plugin` | 子命令 | `mode: 'plugin'`，把剩余 argv 原样转给 profile 目录里的 pnpm | 自己的 `--profile <name>` 必填；同样 `rejectElectronProfile`；零 pnpm args 报错。[E: apps/cli/src/args.ts:190] [E: apps/cli/src/args.ts:198] |
| `[args...]` | 根命令 / `web` / `plugin` 的 leftover | profile 模式下交给 app；plugin 模式下当 pnpm argv | dump 模式下 leftover 长度必须为 0。[E: apps/cli/src/args.ts:144] |

已删除、解析期就会失败的入口：裸 `tui`、`--config`、`-p`、`run <task>`。这些不是 launcher 旗标。`dsh --profile desktop` 也失败，但是 **显式拒绝 Electron 面**，不是「未知 profile」。

### `DshInvocation` 字段

| 变体 | 字段 | 含义 |
|---|---|---|
| `mode: 'profile'` | `profile` / `fromDefaultProfile` / `patches` / `args` | 要 boot 的名字；可选的模板源；argv 序的 `--patch` 路径；第一未知 token 起的 app argv |
| `mode: 'dump-config'` | `profile` / `fromDefaultProfile` / `defaultOnly` / `patches` | `defaultOnly === true` 来自 `--dump-default-config` |
| `mode: 'plugin'` | `profile` / `args` | 无 `patches`；`args` 是 pnpm 参数 |

无 dump 旗标时 `resolveBoot` 返回 `{ mode: 'profile', profile, fromDefaultProfile, patches, args }`。[E: apps/cli/src/args.ts:101] `parse(['--profile', 'rescue', '--from-default-profile', 'web'])` 得到 `fromDefaultProfile: 'web'`。[E: apps/cli/tests/args.spec.ts:28] `web` 子命令**不**吃 `--from-default-profile`：`parse(['web', '--from-default-profile', 'web'])` 把它留给 app args。[E: apps/cli/tests/args.spec.ts:55]

### 不是 launcher 旗标（点到 profile / bundle）

| 外观 | 真正的所有者 | 去哪读 |
|---|---|---|
| `--host` / `--no-open` / `--port` / `--trusted-host` | web 树里的 `web-startup` + `parseCmdline`；`--host 0.0.0.0` 仍拒绝 | [`surface.profiles.web`](../profiles/web.md) [E: packages/bundle/web-app/src/startup.ts:51] [E: packages/bundle/web-app/src/startup.ts:74] |
| headless `[task...]` | `headless-startup` | [`surface.profiles.headless`](../profiles/headless.md) [E: packages/bundle/headless/src/startup.ts:36] |
| sdk / sdk-minimal 零 extra-flag | `dsh --profile ${profile}` | [`surface.profiles.sdk`](../profiles/sdk.md) |
| acp 零 extra-flag | `dsh --profile acp` | [`surface.profiles.acp`](../profiles/acp.md) |
| Electron `desktop` | **不是** CLI profile | [`surface.profiles.desktop`](../profiles/desktop.md)（已另写；本页只负责拒绝） |

## 装配与门控

### 解析期

- 根命令没有 `--profile` 不能 boot（子命令 `web` 自己填 `'web'`；`plugin` 用自己的 required `--profile`）。
- `--dump-config` 与 `--dump-default-config` 同时出现 → 互斥错误。[E: apps/cli/src/args.ts:104]
- dump 带 leftover → `config dumps take no app arguments`。[E: apps/cli/src/args.ts:110]
- `--dump-default-config` 再带 `--patch` → 拒绝。[E: apps/cli/src/args.ts:114]
- `web` / `plugin` 前面若已出现父级 `--profile` / `--from-default-profile` / `--patch` / `--dump-*` → `rejectParentOptions`。[E: apps/cli/src/args.ts:164]
- `--patch` 用单值 collector，避免 variadic 把 app argv 吞掉。[E: apps/cli/src/args.ts:66]
- `desktop`（任意大小写）在解析期就失败，**不会**走到 `loadProfile`。[E: apps/cli/src/args.ts:68]

`parseDshArgs` **不**检查 profile 目录是否存在。`parse(['--profile', 'tui'])` 在解析期是合法的 `mode: 'profile'`。存在性检查发生在 boot / dump 的 `loadProfile`。

### 第一次碰到某个 profile 名

`loadProfile` 看 `$DSH_HOME/profiles/<name>/package.json`：

- 名字在 `PROFILE_TEMPLATES` 里且目录未初始化 → `initProfile(dir, template.bundles, template.patchReload)`。[E: packages/boot/app-boot/src/profile.ts:821] [E: packages/boot/app-boot/src/profile.ts:827]
- 名字不在模板里 → 抛 `profile "<name>" does not exist; create it with 'dsh plugin --profile <name> add <package>'`。第一次 `dsh --profile tui`（或任何未知名）**不会**自动 init。[E: packages/boot/app-boot/src/profile.ts:824]
- `--from-default-profile <template>`：`initializeProfileFromDefault` 只认 `PROFILE_TEMPLATES` 键（`acp` / `web` / `headless` / `sdk` / `sdk-minimal`）。`desktop` 当 source → `unknown default profile`。目标名若已是 shipped 键，或目录已有 `package.json`，都失败并提示 `omit --from-default-profile to use it`。[E: apps/cli/src/profile-boot.ts:110] [E: apps/cli/src/profile-boot.ts:119]
- `dsh plugin --profile <name> …` 在目录没有 `package.json` 时也会 `initProfile`；未知名用 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']`。[E: apps/cli/src/plugin.ts:126] [E: packages/boot/app-boot/src/profile.ts:134]
- 已存在的 `headless` 若 bundles 仍是退役三元组 `dsh-base` + `dsh-web-app` + `dsh-headless`，加载时会被 `normalizeShippedProfile` 写成当前两 bundle 模板。[E: packages/boot/app-boot/src/profile.ts:130] [E: packages/boot/app-boot/src/profile.ts:689]

用户层文件名是 profile 目录内的 `cordis.patch.yml`。细节与 pnpm reconcile 在 [`surface.cli.plugin`](plugin.md)。

### `runProfile` 叠层（host 面真树）

`prepareProfile` 若带了 `fromDefaultProfile` 先 `initializeProfileFromDefault`，再 `loadProfile`，并把 profile 内 `cordis.yml` **整文件重写成**空数组 `[]`。[E: apps/cli/src/profile-boot.ts:187] [E: apps/cli/src/profile-boot.ts:188] `composeProfile` 随后 `healProfilesModuleFallback`。[E: apps/cli/src/profile-boot.ts:226]

`allPatches` 顺序：[E: apps/cli/src/profile-boot.ts:206]

1. `bundlePatches`：`dsh.profile.bundles` 各 bundle 的 `dsh.bundle.patch`，安装序。
2. `profile.patches`：该 profile 的 `cordis.patch.yml`。
3. `homePatches`：`$DSH_HOME/cordis.patch.yml`。
4. `--patch` overlays（argv 序）以及 telemetry 硬关（`DSH_TELEMETRY_DISABLED` 为任意非空字符串且树里有 `session-telemetry-otel` 行）。[E: apps/cli/src/profile-boot.ts:211]

preset roster **不**由这一栈注入：web 的 bundle patch 自己 insert `agent-presets`；headless / sdk / acp overlay 不挂 roster，模型可见工具留在 host 面 `dsh-base` 行。

`runProfile` 然后 `boot('dsh', rootConfig, allPatches, prepare)`。[E: apps/cli/src/profile-boot.ts:282] 优雅退出宽限 `PROCESS_SHUTDOWN_TIMEOUT_MS = 5_000`。[E: apps/cli/src/process-shutdown.ts:4]

**只有** `composed.profile.patchReload === 'live'` 才装 watcher。[E: apps/cli/src/profile-boot.ts:355] `startup` 模板仍在 boot 时应用用户层，但不装 watch。

### dump 不 boot，叠层也更窄

`runDumpConfig` 同样 `prepareProfile`（因此 shipped 名的 `--dump-default-config` 也会触发模板 init，且可带 `fromDefaultProfile`），但只 `renderConfigDump` 写 stdout，不调用 `boot`。[E: apps/cli/src/dump-config.ts:31] [E: apps/cli/src/dump-config.ts:37] `defaultOnly === false` 时才追加 profile / home / `--patch`。dump **没有** telemetry 那一层。

## 跨包关系

- [`spine.composition-boot`](../../spine/composition-boot.md) — profile 发现、bundle patch、Loader `boot`、preset mount 的端到端走读。
- [`ref.cli-flags`](../../reference/cli-flags.md) — 旗标 catalog。
- [`surface.cli.plugin`](plugin.md) — `runPlugin`。
- [`surface.profiles.web`](../profiles/web.md) — `PROFILE_TEMPLATES.web` = `dsh-base` + `dsh-web-app`，`patchReload: live`。
- [`surface.profiles.headless`](../profiles/headless.md) — `dsh-base` + `dsh-headless`，`startup`；无 HTTP / browser。
- [`surface.profiles.desktop`](../profiles/desktop.md) — Electron 面；本页只负责 CLI 拒绝。
- [`surface.presets.overview`](../presets/overview.md) — shipped preset 发现 / `mountPreset` / isolate。
- `@deepseek-ai/dsh-cmdline` — `provideCmdline` / `parseCmdline`。[E: packages/boot/cmdline/src/index.ts:84]
- `@deepseek-ai/dsh-app-boot` — `loadProfile` / `initProfile` / `PROFILE_TEMPLATES` / `boot`。

## Sources

- `apps/cli/src/bin.ts`
- `apps/cli/src/args.ts`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/src/dump-config.ts`
- `apps/cli/src/plugin.ts`
- `apps/cli/src/process-shutdown.ts`
- `apps/cli/package.json`
- `apps/cli/tests/args.spec.ts`
- `apps/cli/tests/telemetry-switch.spec.ts`
- `apps/cli/tests/built-bin.e2e.ts`
- `packages/boot/cmdline/src/index.ts`
- `packages/boot/app-boot/src/index.ts`
- `packages/boot/app-boot/src/profile.ts`
- `packages/boot/app-boot/tests/profile.spec.ts`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/web-app/src/startup.ts`
- `packages/bundle/headless/src/startup.ts`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/bundle/sdk-app/src/index.ts`
- `packages/bundle/acp-app/src/index.ts`
- `packages/preset/agent-presets/src/discovery.ts`
- `packages/preset/agent-presets/src/display.ts`
- `packages/util/home-paths/src/index.ts`

## 相关

- [`ref.cli-flags`](../../reference/cli-flags.md) — CLI 旗标与 dump 诊断的 T3 catalog。
- [`spine.composition-boot`](../../spine/composition-boot.md) — 从 launcher 到 Loader 树 settle 的 T0 脊柱。

邻居（不在本节点 `related`，但同属组合入口）：[`surface.cli.plugin`](plugin.md)、[`surface.profiles.web`](../profiles/web.md)、[`surface.profiles.headless`](../profiles/headless.md)、[`surface.profiles.desktop`](../profiles/desktop.md)、[`surface.presets.overview`](../presets/overview.md)。
