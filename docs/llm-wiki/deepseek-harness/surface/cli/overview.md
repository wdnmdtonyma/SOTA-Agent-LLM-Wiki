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
  - apps/cli/src/dump-config-schema.ts
  - apps/cli/src/plugin.ts
  - apps/cli/src/process-shutdown.ts
  - apps/cli/package.json
  - apps/cli/tests/args.spec.ts
  - packages/boot/cmdline/src/index.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/profile-context.ts
  - packages/boot/app-boot/src/plugin-compatibility.ts
  - packages/boot/app-boot/package.json
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/boot/plugin-manager/src/index.ts
  - packages/boot/plugin-manager/src/operations.ts
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/headless/src/startup.ts
  - packages/bundle/headless/package.json
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/acp-app/package.json
  - packages/util/home-paths/src/index.ts
symbols: [parseDshArgs, DshInvocation, runProfile, runDumpConfig, runDumpConfigSchema, PROFILE_TEMPLATES, rejectElectronProfile, OPTIONAL_BUNDLES]
related: [ref.cli-flags, spine.composition-boot]
evidence: explicit
status: verified
updated: 477b4f4205
---

> `@deepseek-ai/dsh` 的 `dsh` 可执行文件是 Cordis **组合运行时**的进程 launcher：只解析自己拥有的旗标，解析出四种 `DshInvocation` mode（`profile` / `plugin` / `dump-config` / `dump-config-schema`），再动态 import 对应 runner。`dsh <name>` 是 `dsh --profile <name>` 的通用简写（第一个非 `-` token，且不是保留字 `plugin`）。五个 shipped CLI profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`。`desktop` 不是第六个 CLI profile：launcher 会 `rejectElectronProfile`。

## 能回答的问题

- `dsh` 的 npm 包名、bin 落到哪个文件、`--version` 从哪读？
- launcher 自己吃哪些 option / 子命令？第一个它不认识的 token 之后去哪？
- `dsh web`、`dsh headless`、`dsh tui`、`dsh plugin`、`--dump-config`、`--dump-config-schema` 各是哪种 `DshInvocation.mode`？
- 为什么 `dsh --profile desktop` 会立刻失败？大小写呢？`dsh desktop` 呢？
- `--dump-config` / `--dump-default-config` / `--dump-config-schema` 如何互斥？dump 能不能带 app args 或 `--patch`？
- shipped `--profile` 有哪些？`tui` / `desktop` 是不是模板？未知名字第一次 `dsh --profile <name>` 会怎样？
- `runProfile` 的 patch 叠层顺序是什么？四个 shipped preset 为什么只出现在 `dsh-web-app`？

## 是什么

DSH 不是「又一个 coding agent」。`dsh` 启动的是一棵 **profile → bundle →（可选）agent preset** 的 Cordis 插件树。

包 `@deepseek-ai/dsh` 发布 bin 名 `dsh`，指向构建产物 `lib/bin.js`。[E: apps/cli/package.json:2] [E: apps/cli/package.json:15] 发布 `files` 只含 `lib/*.js` 与类型声明，不再随 CLI 带 `config/` 树。[E: apps/cli/package.json:17] 源码入口是 `apps/cli/src/bin.ts`。版本字符串来自 `getDshRuntimeVersion()`（读 `@deepseek-ai/dsh-app-boot` 的 `package.json` `version`，当前冻结树为 `0.1.7-rc.2`）；`version` 不是 string 时回退。[E: apps/cli/src/bin.ts:9] [E: apps/cli/src/bin.ts:19] [E: packages/boot/app-boot/src/plugin-compatibility.ts:44] [E: packages/boot/app-boot/package.json:4]

`parseDshArgs` 把 `process.argv.slice(2)` 收成导出类型 `DshInvocation` = `ProfileInvocation | DumpConfigInvocation | DumpConfigSchemaInvocation | PluginInvocation`。help / version / 语法错误在 `parseDshArgs` **内部** `process.exit`，只有合法 mode 回到 `bin.ts` 的 `switch`。[E: apps/cli/src/args.ts:61] [E: apps/cli/src/bin.ts:22]

| `mode` | 用户怎么打 | runner |
|---|---|---|
| `'profile'` | `dsh --profile <name> …` 或 `dsh <name> …` | 动态 import `runProfile`；先 `loadLayeredEnv('dsh')` |
| `'plugin'` | `dsh plugin --profile <name> <pnpm args…>` | 动态 import `runPlugin`，然后 `process.exit` 其返回码 |
| `'dump-config'` | 带 `--dump-config` 或 `--dump-default-config` | 动态 import `runDumpConfig`（不 `boot`） |
| `'dump-config-schema'` | 带 `--dump-config-schema` | 动态 import `runDumpConfigSchema`（不 mount 插件） |

[E: apps/cli/src/bin.ts:23] [E: apps/cli/src/bin.ts:40] [E: apps/cli/src/bin.ts:45] [E: apps/cli/src/bin.ts:55]

**`dsh <name>` 是通用 `--profile` 简写。** 第一个 token 不是以 `-` 开头、也不是 `plugin` 时，parser 在交给 commander 之前把它展开成 `--profile` + 原 argv。[E: apps/cli/src/args.ts:201] [E: apps/cli/src/args.ts:202] 测试把 `web` / `headless` / `sdk` / `sdk-minimal` / `acp` / `tui` / `custom` / `run` / `help` 都钉成与 `['--profile', name, …]` 同一结果。[E: apps/cli/tests/args.spec.ts:59] [E: apps/cli/tests/args.spec.ts:69] `plugin` 仍是管理命令；要 boot 一个名叫 `plugin` 的 profile 必须写 `dsh --profile plugin`。[E: apps/cli/tests/args.spec.ts:74] 这不是「只有 `dsh web` 是硬编码子命令」。

**`desktop` 被拒。** `rejectElectronProfile`：`profile.toLowerCase() === 'desktop'` → `error: profile "desktop" is managed exclusively by the Electron application`。根命令在 `resolveBoot` 之前调用；`plugin` 子命令同样调用。[E: apps/cli/src/args.ts:83] [E: apps/cli/src/args.ts:85] [E: apps/cli/src/args.ts:182] [E: apps/cli/src/args.ts:194] 测试：`desktop` / `Desktop` / `DESKTOP`、带 `--dump-config`、带 `--dump-config-schema`、以及 `plugin --profile desktop` 全部 exit 1。[E: apps/cli/tests/args.spec.ts:83] [E: apps/cli/tests/args.spec.ts:208] [E: apps/cli/tests/args.spec.ts:212]

**host 面 vs agent-preset 面。** launcher / `runProfile` 管的是 **host 面**（进程级）：profile 目录、bundle 叠层、`$DSH_HOME` 用户层、`--patch`、`ctx.cmdlineArgs`、信号与 `fail-loud`、可选的 `session-telemetry-otel` 硬关。**agent-preset 面**只出现在叠了 `dsh-web-app` 的树里：该 bundle 的 `dsh.bundle.patch` 是**有序列表**，`cordis.patch.yml` 之后叠四份 `presets/{standard,ptc,minimal,cordis}.patch.yml`。[E: packages/bundle/web-app/package.json:43] [E: packages/bundle/web-app/package.json:44] headless / sdk / acp / sdk-minimal 的 `dsh.bundle.patch` 都是单个 `./cordis.patch.yml`，**不含**这些 preset 文件。[E: packages/bundle/headless/package.json:39] [E: packages/bundle/sdk-app/package.json:33] [E: packages/bundle/sdk-minimal/package.json:33] [E: packages/bundle/acp-app/package.json:33]

**五个 shipped profile，没有 shipped TUI，没有 desktop 模板。** `PROFILE_TEMPLATES` 键为 `acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] 模板只带 `bundles` 列表，**没有** `patchReload` 字段。[E: packages/boot/app-boot/src/profile.ts:43] `sdk-minimal` 的 `bundles` **只有** `@deepseek-ai/dsh-sdk-minimal`，不叠 `dsh-base`。[E: packages/boot/app-boot/src/profile.ts:193] `HELP_EXAMPLES` 把 `tui` 写成 custom profile 示例，它不是模板键；`--from-default-profile` 的例子用 `rescue` 从 `web` 模板初始化。[E: apps/cli/src/args.ts:92] [E: apps/cli/src/args.ts:93]

`OPTIONAL_BUNDLES` 是安装随附、默认关掉、由 plugin manager 列出的 experimental bundle：`dsh-experimental-agent-team-profile` / `dsh-experimental-voice-input-bundle` / `dsh-experimental-auto-review`。[E: packages/boot/app-boot/src/profile.ts:213] [E: packages/boot/plugin-manager/src/index.ts:290] **不是** `PROFILE_TEMPLATES` 成员。细节在 [`surface.cli.plugin`](plugin.md)。

## 入口

用户碰到 `dsh` 的路径：

1. PATH 上的 `dsh` → `lib/bin.js`，或开发态 `pnpm dsh <args…>` 进同一套 `parseDshArgs`。
2. `parseDshArgs(argv, version)` 用 commander：`helpOption(false)` + `allowUnknownOption` + `passThroughOptions` + `enablePositionalOptions`。launcher 旗标必须写在前面；第一个它不认识的 token 起全部进入 `args`，包括 app 的 `-h`。[E: apps/cli/src/args.ts:161] [E: apps/cli/src/args.ts:163]
3. 无 `--profile` 且 leftover 含 `-h` / `--help` 时打印 **launcher** help 并退出 0；无 profile 又不是 help 则报 `--profile <name> is required`。[E: apps/cli/src/args.ts:177] [E: apps/cli/src/args.ts:178]
4. 合法 invocation 回到 `bin.ts`：`mode: 'profile'` 先 `loadLayeredEnv('dsh')` 再 `runProfile`，并传入 `fromDefaultProfile`。[E: apps/cli/src/bin.ts:26]

profile 目录在 `$DSH_HOME/profiles/<name>`。`$DSH_HOME` 由 `resolveDshHome` 解析：非空环境变量 `DSH_HOME`，否则 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:88] [E: packages/util/home-paths/src/index.ts:90]

`--host` / `--no-open` / `--port` / `--trusted-host` 属于 web app（节点 [`surface.profiles.web`](../profiles/web.md)）；headless 的 `[task...]` 属于 headless app（节点 [`surface.profiles.headless`](../profiles/headless.md)）。launcher 把它们留在 `DshInvocation.args`，经 `provideCmdline` 冻成 `ctx.cmdlineArgs` 快照。[E: packages/boot/cmdline/src/index.ts:84]

## 关键字段

### launcher 拥有的 token

下列是 `parseDshArgs` 自己认识的全部 option 与子命令。app 旗标不要读成 launcher 旗标。

| token | 出现位置 | 作用 | 门控 |
|---|---|---|---|
| `--profile <name>` | 根命令 | 指定 `$DSH_HOME/profiles/<name>` | 根命令缺它则报 required；空字符串报 `--profile needs a name`；重复选择报 `select a profile only once`；`desktop`（任意大小写）走 `rejectElectronProfile`。[E: apps/cli/src/args.ts:167] [E: apps/cli/src/args.ts:78] [E: apps/cli/src/args.ts:181] |
| `--from-default-profile <name>` | 根命令 | 用一份 shipped 模板 **初始化** 新的自定义 profile，再 boot / dump | 空名报 `--from-default-profile needs a name`；目标名若已是 shipped 模板、或目录已存在则失败；`desktop` 不在 `PROFILE_TEMPLATES` 里，当 source 会报 unknown default profile。[E: apps/cli/src/args.ts:168] [E: apps/cli/src/args.ts:114] [E: apps/cli/src/profile-boot.ts:111] |
| `--patch <path>` | 根命令 | 可重复、**非 variadic** 的 overlay，叠在 profile 层之后 | collector 每次收一个 path；空 path 报 `--patch needs a path`。[E: apps/cli/src/args.ts:76] [E: apps/cli/src/args.ts:169] |
| `--dump-config` | 根命令 | 打印含用户层与 `--patch` 的组成树，不 boot | 与另外两个 dump 旗标互斥；dump 拒绝任何 leftover app args。[E: apps/cli/src/args.ts:170] [E: apps/cli/src/args.ts:120] |
| `--dump-default-config` | 根命令 | 只打印 bundle 层 | 与另外两个 dump 旗标互斥；带 `--patch` 则报错。[E: apps/cli/src/args.ts:172] [E: apps/cli/src/args.ts:133] |
| `--dump-config-schema` | 根命令 | 打印 JSON Schema，不 mount 插件 | 与另外两个 dump 旗标互斥；同样拒绝 leftover app args。[E: apps/cli/src/args.ts:171] [E: apps/cli/src/args.ts:128] |
| `-V, --version` | 根命令 | 打印 `getDshRuntimeVersion()` 的字符串 | commander `.version`。[E: apps/cli/src/args.ts:153] |
| `-h` / `--help` | 不是注册在 launcher 上的 helpOption | 无 profile 时打 launcher help；有 profile 时进 `args` 交给 app | `helpOption(false)`。[E: apps/cli/src/args.ts:161] |
| `plugin` | 子命令（仅当 argv[0] 是 `plugin` 时注册） | `mode: 'plugin'`，把剩余 argv 原样转给 profile 目录里的 pnpm | 自己的 `--profile <name>` 必填；同样 `rejectElectronProfile`；零 pnpm args 报错。[E: apps/cli/src/args.ts:186] [E: apps/cli/src/args.ts:195] |
| `[args...]` | 根命令 leftover | profile 模式下交给 app；plugin 模式下当 pnpm argv | dump 模式下 leftover 长度必须为 0。[E: apps/cli/src/args.ts:166] |

已删除、解析期就会失败的入口：裸 `--config`、`-p`。这些不是 launcher 旗标。[E: apps/cli/tests/args.spec.ts:186] `dsh --profile desktop` 也失败，但是 **显式拒绝 Electron 面**，不是「未知 profile」。

### `DshInvocation` 字段

| 变体 | 字段 | 含义 |
|---|---|---|
| `mode: 'profile'` | `profile` / `fromDefaultProfile` / `patches` / `args` | 要 boot 的名字；可选的模板源；argv 序的 `--patch` 路径；第一未知 token 起的 app argv |
| `mode: 'dump-config'` | `profile` / `fromDefaultProfile` / `defaultOnly` / `patches` | `defaultOnly === true` 来自 `--dump-default-config` |
| `mode: 'dump-config-schema'` | `profile` / `fromDefaultProfile` / `patches` | 无 `defaultOnly`；仍可带 `--patch` |
| `mode: 'plugin'` | `profile` / `args` | 无 `patches`；`args` 是 pnpm 参数 |

无 dump 旗标时 `resolveBoot` 返回 `{ mode: 'profile', profile, fromDefaultProfile, patches, args }`。[E: apps/cli/src/args.ts:117] `parse(['--profile', 'rescue', '--from-default-profile', 'web'])` 得到 `fromDefaultProfile: 'web'`。[E: apps/cli/tests/args.spec.ts:28] 简写路径上，launcher 旗标仍可跟在名字后面：`parse(['web', '--from-default-profile', 'web'])` 得到 `fromDefaultProfile: 'web'`（不是留给 app）。[E: apps/cli/tests/args.spec.ts:55]

### 不是 launcher 旗标（点到 profile / bundle）

| 外观 | 真正的所有者 | 去哪读 |
|---|---|---|
| `--host` / `--no-open` / `--port` / `--trusted-host` | web 树里的 `web-startup` + `parseCmdline`；`--host 0.0.0.0` 仍拒绝 | [`surface.profiles.web`](../profiles/web.md) [E: packages/bundle/web-app/src/startup.ts:74] |
| headless `[task...]` | `headless-startup` | [`surface.profiles.headless`](../profiles/headless.md) [E: packages/bundle/headless/src/startup.ts:45] |
| sdk / sdk-minimal 零 extra-flag | `dsh sdk` 或 `dsh --profile sdk` | [`surface.profiles.sdk`](../profiles/sdk.md) |
| acp 零 extra-flag | `dsh acp` 或 `dsh --profile acp` | [`surface.profiles.acp`](../profiles/acp.md) |
| Electron `desktop` | **不是** CLI profile | [`surface.profiles.desktop`](../profiles/desktop.md)（本页只负责拒绝） |

## 装配与门控

### 解析期

- 根命令没有 `--profile` 不能 boot（`dsh web` 这类简写会先被展开成 `--profile web`；`plugin` 用自己的 required `--profile`）。
- `--dump-config` / `--dump-default-config` / `--dump-config-schema` 任意两个同时出现 → 互斥错误。[E: apps/cli/src/args.ts:120]
- dump 带 leftover → `config dumps take no app arguments`。[E: apps/cli/src/args.ts:126]
- `--dump-default-config` 再带 `--patch` → 拒绝。[E: apps/cli/src/args.ts:133]
- `--dump-config-schema` **可以**带 `--patch`（schema dump 与 YAML dump 共用 overlay 收集）。[E: apps/cli/tests/args.spec.ts:149]
- `--patch` 用单值 collector，避免 variadic 把 app argv 吞掉。[E: apps/cli/src/args.ts:76]
- `desktop`（任意大小写）在解析期就失败，**不会**走到 `loadProfile`。[E: apps/cli/src/args.ts:83]
- 简写必须紧跟 `dsh`：`dsh --patch a.yml tui` 不会把 `tui` 当成 profile。[E: apps/cli/tests/args.spec.ts:78]

`parseDshArgs` **不**检查 profile 目录是否存在。`parse(['--profile', 'tui'])` 在解析期是合法的 `mode: 'profile'`。存在性检查发生在 boot / dump 的 `loadProfile`。

### 第一次碰到某个 profile 名

`loadProfile` 看 `$DSH_HOME/profiles/<name>/package.json`：

- 名字在 `PROFILE_TEMPLATES` 里且目录未初始化 → `initProfile(dir, template.bundles)`。[E: packages/boot/app-boot/src/profile.ts:709] [E: packages/boot/app-boot/src/profile.ts:715]
- 名字不在模板里 → 抛 `profile "<name>" does not exist; create it with 'dsh plugin --profile <name> add <package>'`。第一次 `dsh tui`（或任何未知名）**不会**自动 init。[E: packages/boot/app-boot/src/profile.ts:712]
- `--from-default-profile <template>`：`initializeProfileFromDefault` 只认 `PROFILE_TEMPLATES` 键（`acp` / `web` / `headless` / `sdk` / `sdk-minimal`）。`desktop` 当 source → `unknown default profile`。目标名若已是 shipped 键，失败并提示 `omit --from-default-profile to use it`。[E: apps/cli/src/profile-boot.ts:113] [E: apps/cli/src/profile-boot.ts:116]
- `dsh plugin --profile <name> …` 在目录没有 `package.json` 时也会 `initProfile`；未知名用 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']`。[E: packages/boot/plugin-manager/src/operations.ts:551] [E: packages/boot/app-boot/src/profile.ts:203]
- 已存在的 `headless` 若 bundles 仍是退役三元组 `dsh-base` + `dsh-web-app` + `dsh-headless`，加载时会被 `normalizeShippedProfile` 写成当前两 bundle 模板。[E: packages/boot/app-boot/src/profile.ts:198] [E: packages/boot/app-boot/src/profile.ts:579]

用户层文件名是 profile 目录内的 `cordis.patch.yml`。细节与 pnpm reconcile 在 [`surface.cli.plugin`](plugin.md)。

### `runProfile` 叠层（host 面真树）

`prepareProfile` 若带了 `fromDefaultProfile` 先 `initializeProfileFromDefault`，再 `loadProfile`，并把 profile 内 `cordis.yml` **整文件重写成**空数组 `[]`。[E: apps/cli/src/profile-boot.ts:169] [E: apps/cli/src/profile-boot.ts:171]

`readProfilePatches` 顺序：[E: packages/boot/app-boot/src/profile-context.ts:65]

1. `profile.layers` 各 bundle 的 `dsh.bundle.patch`（安装序；web-app 一层里已拼好五份文件）。
2. profile 的 `cordis.patch.yml`。
3. `$DSH_HOME/cordis.patch.yml`。
4. `--patch` overlays（argv 序）以及 telemetry 硬关（`DSH_TELEMETRY_DISABLED` 为任意非空字符串且树里有 `session-telemetry-otel` 行）。[E: packages/boot/app-boot/src/profile-context.ts:53]

preset roster **不**由这一栈注入：只有 `dsh-web-app` 的 bundle patch 列表自己 insert `agent-preset-registry` 并叠四个 `preset-*` 声明；headless / sdk / acp overlay 不挂 roster，模型可见工具留在 host 面 `dsh-base` 行。

`runProfile` 然后 `boot('dsh', rootConfig, readProfilePatches(…), prepare)`。[E: apps/cli/src/profile-boot.ts:296] 优雅退出宽限 `PROCESS_SHUTDOWN_TIMEOUT_MS = 5_000`。[E: apps/cli/src/process-shutdown.ts:4]

HMR 是 YAML 行，不是 launcher 特例：`dsh-base` insert `id: hmr`，带 `profileContext` 时启用；launcher **不再**按 `patchReload` 另装 watcher（`ProfileTemplate` 已无该字段）。[E: packages/boot/app-boot/src/profile.ts:43]

### dump 不 boot，叠层也更窄

`runDumpConfig` 同样 `prepareProfile`（因此 shipped 名的 `--dump-default-config` 也会触发模板 init，且可带 `fromDefaultProfile`），但只 `renderConfigDump` 写 stdout，不调用 `boot`。[E: apps/cli/src/dump-config.ts:38] [E: apps/cli/src/dump-config.ts:41] `defaultOnly === false` 时才追加 profile / home / `--patch`。dump **没有** telemetry 那一层。`--dump-config-schema` 走 `generateConfigSchema`，stdout 只打 JSON Schema。[E: apps/cli/src/dump-config-schema.ts:25] [E: apps/cli/src/dump-config-schema.ts:38]

## 跨包关系

- [`spine.composition-boot`](../../spine/composition-boot.md) — profile 发现、bundle patch、Loader `boot`、preset mount 的端到端走读。
- [`ref.cli-flags`](../../reference/cli-flags.md) — 旗标 catalog。
- [`surface.cli.plugin`](plugin.md) — `runPlugin`、plugin-manager、`OPTIONAL_BUNDLES`。
- [`surface.profiles.web`](../profiles/web.md) — `PROFILE_TEMPLATES.web` = `dsh-base` + `dsh-web-app`；四份 preset 只叠在这里。
- [`surface.profiles.headless`](../profiles/headless.md) — `dsh-base` + `dsh-headless`；无 HTTP / browser / shipped preset 文件。
- [`surface.profiles.desktop`](../profiles/desktop.md) — Electron 面；本页只负责 CLI 拒绝。
- [`surface.presets.overview`](../presets/overview.md) — 声明式 preset 与 `agent-preset-registry`。
- `@deepseek-ai/dsh-cmdline` — `provideCmdline` / `parseCmdline`。[E: packages/boot/cmdline/src/index.ts:84]
- `@deepseek-ai/dsh-app-boot` — `loadProfile` / `initProfile` / `PROFILE_TEMPLATES` / `OPTIONAL_BUNDLES` / `boot`。

## Sources

- `apps/cli/src/bin.ts`
- `apps/cli/src/args.ts`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/src/dump-config.ts`
- `apps/cli/src/dump-config-schema.ts`
- `apps/cli/src/plugin.ts`
- `apps/cli/src/process-shutdown.ts`
- `apps/cli/package.json`
- `apps/cli/tests/args.spec.ts`
- `packages/boot/cmdline/src/index.ts`
- `packages/boot/app-boot/src/index.ts`
- `packages/boot/app-boot/src/profile.ts`
- `packages/boot/app-boot/src/profile-context.ts`
- `packages/boot/app-boot/src/plugin-compatibility.ts`
- `packages/boot/app-boot/package.json`
- `packages/boot/app-boot/tests/profile.spec.ts`
- `packages/boot/plugin-manager/src/index.ts`
- `packages/boot/plugin-manager/src/operations.ts`
- `packages/bundle/web-app/package.json`
- `packages/bundle/web-app/src/startup.ts`
- `packages/bundle/headless/src/startup.ts`
- `packages/bundle/headless/package.json`
- `packages/bundle/sdk-app/package.json`
- `packages/bundle/sdk-minimal/package.json`
- `packages/bundle/acp-app/package.json`
- `packages/util/home-paths/src/index.ts`

## 相关

- [`ref.cli-flags`](../../reference/cli-flags.md) — CLI 旗标与 dump 诊断的 T3 catalog。
- [`spine.composition-boot`](../../spine/composition-boot.md) — 从 launcher 到 Loader 树 settle 的 T0 脊柱。

邻居（不在本节点 `related`，但同属组合入口）：[`surface.cli.plugin`](plugin.md)、[`surface.profiles.web`](../profiles/web.md)、[`surface.profiles.headless`](../profiles/headless.md)、[`surface.profiles.desktop`](../profiles/desktop.md)、[`surface.presets.overview`](../presets/overview.md)。
