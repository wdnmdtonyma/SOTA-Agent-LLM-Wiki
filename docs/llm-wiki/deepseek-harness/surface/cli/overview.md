---
id: surface.cli.overview
title: CLI 入口与旗标
kind: surface
tier: T1
pkg: composition
source:
  - apps/cli/src/bin.ts
  - apps/cli/src/args.ts
  - apps/cli/README.md
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
  - packages/util/home-paths/src/index.ts
symbols: [parseDshArgs, DshInvocation, runProfile, runDumpConfig]
related: [ref.cli-flags, spine.composition-boot]
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh` 的 `dsh` 可执行文件是 Cordis **组合运行时**的进程 launcher:只解析自己拥有的旗标,解析出三种 `DshInvocation` mode(`profile` / `plugin` / `dump-config`),再动态 import 对应 runner;`dsh web` 只是 `--profile web` 的 alias,仍然是 `mode: 'profile'`。

## 能回答的问题

- `dsh` 的 npm 包名、bin 落到哪个文件、`--version` 从哪读?
- launcher 自己吃哪些 option / 子命令?第一个它不认识的 token 之后去哪?
- `dsh web`、`dsh plugin`、`--dump-config` 各是哪种 `DshInvocation.mode`?
- `--dump-config` 与 `--dump-default-config` 如何互斥?dump 能不能带 app args 或 `--patch`?
- help 例子里的 `tui` 是不是 shipped profile?未知名字第一次 `dsh --profile <name>` 会怎样?
- `runProfile` 的 patch 叠层顺序是什么?host 面和 agent-preset 面在 launcher 里怎么分?

## 是什么

DSH 不是「又一个 coding agent」。`dsh` 启动的是一棵 **profile → bundle → agent preset** 的 Cordis 插件树:capability seam 是 Definition / Provider / Consumer;模型看见的工具必须能从 session 日志重建(`model-visible ⟺ logged`)。

包 `@deepseek-ai/dsh` 发布 bin 名 `dsh`,指向构建产物 `lib/bin.js`。[E: apps/cli/package.json:2][E: apps/cli/package.json:15] 源码入口是 `apps/cli/src/bin.ts`(`#!/usr/bin/env node`)。版本字符串从同包 `package.json` 的 `version` 字段读(当前冻结树为 `0.1.0-rc.5`);`version` 不是 string 时回退 `'0.0.0'`。[E: apps/cli/package.json:4][E: apps/cli/src/bin.ts:22][E: apps/cli/src/bin.ts:24] 发布物还带上 `config/`(shipped `agent-presets/` 跟 CLI 走,不靠再解析 monorepo)。[E: apps/cli/package.json:19]

`parseDshArgs` 把 `process.argv.slice(2)` 收成导出类型 `DshInvocation` = `ProfileInvocation | DumpConfigInvocation | PluginInvocation`。help / version / 语法错误在 `parseDshArgs` **内部** `process.exit`,只有合法 mode 回到 `bin.ts` 的 `switch`。[E: apps/cli/src/args.ts:48][E: apps/cli/src/args.ts:186][E: apps/cli/src/bin.ts:27][E: apps/cli/src/bin.ts:29]

| `mode` | 用户怎么打 | runner |
|---|---|---|
| `'profile'` | `dsh --profile <name> …` 或 `dsh web …` | 动态 import `runProfile` |
| `'plugin'` | `dsh plugin --profile <name> <pnpm args…>` | 动态 import `runPlugin`,然后 `process.exit` 其返回码 |
| `'dump-config'` | 带 `--dump-config` 或 `--dump-default-config` | 动态 import `runDumpConfig`(不 `boot`) |

[E: apps/cli/src/bin.ts:30][E: apps/cli/src/bin.ts:40][E: apps/cli/src/bin.ts:45]

`dsh web` 在 commander 里是子命令,action 固定把 profile 写成 `'web'`,再走与默认命令相同的 `resolveBoot`;测试断言 `parse(['web'])` 得到 `{ mode: 'profile', profile: 'web', patches: [], args: [] }`。[E: apps/cli/src/args.ts:168][E: apps/cli/tests/args.spec.ts:28]

**host 面 vs agent-preset 面。** launcher / `runProfile` 管的是 **host 面**(进程级):profile 目录、bundle 叠层、`$DSH_HOME` 用户层、`--patch`、`ctx.cmdlineArgs`、信号与 `fail-loud`、可选的 `session-telemetry-otel` 硬关。**agent-preset 面**(每会话的 tools / persona / isolate)只在叠完的树里已经出现 `id: agent-presets` 时,才由文件内函数 `composeProfile`(未导出)再压一层 shipped root;成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`,不认本包 `dependencies` 里有没有工具包。web bundle 会 `insert` 该行且 `default: standard`;[E: packages/bundle/web-app/cordis.patch.yml:421][E: packages/bundle/web-app/cordis.patch.yml:424] `packages/bundle/headless/cordis.patch.yml` 无 `agent-presets` id,CLI 因此不会把四个 shipped preset 挂进 headless。[I]

**没有 shipped TUI。** `PROFILE_TEMPLATES` 只有 `web` 与 `headless`。[E: packages/boot/app-boot/src/profile.ts:114][E: packages/boot/app-boot/src/profile.ts:115][E: packages/boot/app-boot/src/profile.ts:116] `HELP_EXAMPLES` 把 `tui` 写成「custom profile」;built bin 的 `--help` 也不把 `tui` 列成子命令;光打 `dsh tui` 以缺 `--profile` 退出 1。[E: apps/cli/src/args.ts:68][E: apps/cli/tests/built-bin.e2e.ts:322][E: apps/cli/tests/args.spec.ts:75]

## 入口

用户碰到 `dsh` 的路径:

1. PATH 上的 `dsh` → `lib/bin.js`,或开发态 `pnpm dsh <args…>` 进同一套 `parseDshArgs`。
2. `parseDshArgs(argv, version)` 用 commander:`helpOption(false)` + `allowUnknownOption` + `passThroughOptions` + `enablePositionalOptions`。launcher 旗标必须写在前面;第一个它不认识的 token 起全部进入 `args`,包括 app 的 `-h`。[E: apps/cli/src/args.ts:126][E: apps/cli/src/args.ts:127][E: apps/cli/src/args.ts:128][E: apps/cli/src/args.ts:129]
3. 无 `--profile` 且 leftover 含 `-h` / `--help` 时打印 **launcher** help 并退出 0;无 profile 又不是 help 则报 `--profile <name> is required`。[E: apps/cli/src/args.ts:138][E: apps/cli/src/args.ts:139][E: apps/cli/src/args.ts:140][E: apps/cli/tests/args.spec.ts:102]
4. 合法 invocation 回到 `bin.ts`:`mode: 'profile'` 先 `loadLayeredEnv('dsh')` 再 `runProfile`;另两个 mode 不走 layered env。[E: apps/cli/src/bin.ts:33]

profile 目录在 `$DSH_HOME/profiles/<name>`(`PROFILES_DIR = 'profiles'`)。`$DSH_HOME` 由 `resolveDshHome` 解析:非空环境变量 `DSH_HOME`,否则 `~/.dsh`。[E: packages/boot/app-boot/src/profile.ts:36][E: packages/boot/app-boot/src/profile.ts:110][E: packages/util/home-paths/src/index.ts:18][E: packages/util/home-paths/src/index.ts:87]

`--host` / `--port` / `--trusted-host` 属于 web app(节点 [`surface.profiles.web`](../profiles/web.md));headless 的 task positional 属于 headless app(节点 [`surface.profiles.headless`](../profiles/headless.md))。launcher 把它们留在 `DshInvocation.args`,经 `provideCmdline` 冻成 `ctx.cmdlineArgs` 快照,由树内插件 `parseCmdline`。[E: apps/cli/tests/args.spec.ts:39][E: apps/cli/tests/args.spec.ts:41][E: packages/boot/cmdline/src/index.ts:69][E: apps/cli/src/profile-boot.ts:255]

## 关键字段

### launcher 拥有的 token

下列是 `parseDshArgs` 自己认识的全部 option 与子命令。app 旗标不要读成 launcher 旗标。

| token | 出现位置 | 作用 | 门控 |
|---|---|---|---|
| `--profile <name>` | 根命令 | 指定 `$DSH_HOME/profiles/<name>` | 根命令缺它则报 required;空字符串报 `--profile needs a name`。[E: apps/cli/src/args.ts:131][E: apps/cli/src/args.ts:140][E: apps/cli/src/args.ts:143] |
| `--patch <path>` | 根命令与 `web` | 可重复、**非 variadic** 的 overlay,叠在 profile 层之后 | collector 每次收一个 path;空 path 报 `--patch needs a path`;出现在「第一未知 token」之后的 `--patch` 归 app。[E: apps/cli/src/args.ts:61][E: apps/cli/src/args.ts:132][E: apps/cli/src/args.ts:85][E: apps/cli/tests/args.spec.ts:44] |
| `--dump-config` | 根命令与 `web` | 打印含用户层与 `--patch` 的组成树,不 boot | 与 `--dump-default-config` 互斥;dump 拒绝任何 leftover app args。[E: apps/cli/src/args.ts:133][E: apps/cli/src/args.ts:90][E: apps/cli/src/args.ts:96] |
| `--dump-default-config` | 根命令与 `web` | 只打印 bundle 层(不解析用户 `cordis.patch.yml`,不收 `--patch`) | 与 `--dump-config` 互斥;带 `--patch` 则报错。[E: apps/cli/src/args.ts:134][E: apps/cli/src/args.ts:100] |
| `-V, --version` | 根命令 | 打印 `readVersion()` 的字符串 | commander `.version`;built bin 断言 stdout 等于 manifest `version`。[E: apps/cli/src/args.ts:119][E: apps/cli/tests/built-bin.e2e.ts:402] |
| `-h` / `--help` | 不是注册在 launcher 上的 helpOption | 无 profile 时打 launcher help;有 profile 时进 `args` 交给 app | `helpOption(false)`。[E: apps/cli/src/args.ts:126][E: apps/cli/tests/args.spec.ts:37] |
| `web` | 子命令 | `--profile web` 的 alias,仍 `mode: 'profile'`(或带 dump 旗标时 `mode: 'dump-config'`) | 拒绝父级已解析的 `--profile` / `--patch` / `--dump-*`。[E: apps/cli/src/args.ts:156][E: apps/cli/src/args.ts:152] |
| `plugin` | 子命令 | `mode: 'plugin'`,把剩余 argv 原样转给 profile 目录里的 pnpm | 自己的 `--profile <name>` 必填;零 pnpm args 报错;同样拒绝父级 `--profile/--patch/--dump-*`。[E: apps/cli/src/args.ts:171][E: apps/cli/src/args.ts:173][E: apps/cli/src/args.ts:179] |
| `[args...]` | 根命令 / `web` / `plugin` 的 leftover | profile 模式下交给 app;plugin 模式下当 pnpm argv | dump 模式下 leftover 长度必须为 0。[E: apps/cli/src/args.ts:130][E: apps/cli/src/args.ts:95] |

已删除、解析期就会失败的入口(测试按 exit 1 锁住):裸 `tui`、`--config`、`-p`、`run <task>`。这些不是 launcher 旗标。[E: apps/cli/tests/args.spec.ts:76][E: apps/cli/tests/args.spec.ts:77][E: apps/cli/tests/args.spec.ts:78]

### `DshInvocation` 字段

| 变体 | 字段 | 含义 |
|---|---|---|
| `mode: 'profile'` | `profile` / `patches` / `args` | 要 boot 的名字;argv 序的 `--patch` 路径;第一未知 token 起的 app argv |
| `mode: 'dump-config'` | `profile` / `defaultOnly` / `patches` | `defaultOnly === true` 来自 `--dump-default-config` |
| `mode: 'plugin'` | `profile` / `args` | 无 `patches`;`args` 是 pnpm 参数 |

无 dump 旗标时 `resolveBoot` 返回 `{ mode: 'profile', profile, patches, args }`。[E: apps/cli/src/args.ts:87]

### 不是 launcher 旗标(点到 profile 页)

| 外观 | 真正的所有者 | 去哪读 |
|---|---|---|
| `--host` / `--port` / `--trusted-host` | web 树里的 `web-startup` + `parseCmdline` | [`surface.profiles.web`](../profiles/web.md) |
| headless task positional | headless 树里的 `headless-startup` + `parseCmdline` | [`surface.profiles.headless`](../profiles/headless.md) |

`parse(['web', '--host', '127.0.0.1', '--port', '8080', '--dev'])` 的 `args` 原样含这三项;`parse(['--profile', 'headless', 'run', 'the', 'tests'])` 的 `args` 是 `['run', 'the', 'tests']`。[E: apps/cli/tests/args.spec.ts:39][E: apps/cli/tests/args.spec.ts:41]

## 装配与门控

### 解析期

- 根命令没有 `--profile` 不能 boot(子命令 `web` 自己填 `'web'`;`plugin` 用自己的 required `--profile`)。
- `--dump-config` 与 `--dump-default-config` 同时出现 → 互斥错误。[E: apps/cli/src/args.ts:90][E: apps/cli/tests/args.spec.ts:82]
- dump 带 leftover(含 app 的 `-h` / `--port`) → `config dumps take no app arguments`。[E: apps/cli/src/args.ts:96][E: apps/cli/tests/args.spec.ts:84][E: apps/cli/tests/args.spec.ts:93]
- `--dump-default-config` 再带 `--patch` → 拒绝。[E: apps/cli/src/args.ts:100][E: apps/cli/tests/args.spec.ts:83]
- `web` / `plugin` 前面若已出现父级 `--profile` / `--patch` / `--dump-*` → `rejectParentOptions`。[E: apps/cli/src/args.ts:152]
- `--patch` 用单值 collector,避免 variadic 把 app argv 吞掉。[E: apps/cli/src/args.ts:61]

`parseDshArgs` **不**检查 profile 目录是否存在。`parse(['--profile', 'tui'])` 在解析期是合法的 `mode: 'profile'`。[E: apps/cli/tests/args.spec.ts:25] 存在性检查发生在 boot / dump 的 `loadProfile`。

### 第一次碰到某个 profile 名

`loadProfile` 看 `$DSH_HOME/profiles/<name>/package.json`:

- 名字在 `PROFILE_TEMPLATES` 里(`web` / `headless`)且目录未初始化 → `initProfile(dir, template)`,模板 bundles 分别是 `dsh-base`+`dsh-web-app`、`dsh-base`+`dsh-headless`。[E: packages/boot/app-boot/src/profile.ts:376][E: packages/boot/app-boot/src/profile.ts:383]
- 名字不在模板里 → 抛 `profile "<name>" does not exist; create it with 'dsh plugin --profile <name> add <package>'`。第一次 `dsh --profile tui`(或任何未知名)**不会**自动 init。[E: packages/boot/app-boot/src/profile.ts:378][E: packages/boot/app-boot/src/profile.ts:380][E: apps/cli/tests/built-bin.e2e.ts:413][E: packages/boot/app-boot/tests/profile.spec.ts:150]
- `dsh plugin --profile <name> …` 在目录没有 `package.json` 时也会 `initProfile`,但未知名用的是 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']`,不是 web/headless 模板。[E: apps/cli/src/plugin.ts:123][E: packages/boot/app-boot/src/profile.ts:125]

用户层文件名是 profile 目录内的 `cordis.patch.yml`(`PROFILE_PATCH_FILENAME`)。[E: packages/boot/app-boot/src/profile.ts:39] 细节与 pnpm reconcile 在 [`surface.cli.plugin`](plugin.md)。

### `runProfile` 叠层(host 面真树)

`prepareProfile` 先 `healProfilesModuleFallback`,再 `loadProfile`,并把 profile 内 `cordis.yml` **整文件重写成**空数组 `[]`(Loader 需要真实 include 根;写回的组成行会在下次 boot 重复 insert)。[E: apps/cli/src/profile-boot.ts:99][E: apps/cli/src/profile-boot.ts:101]

文件内 `composeProfile` 按这次序拼 `allPatches`:[E: apps/cli/src/profile-boot.ts:124]

1. `bundlePatches`:`dsh.profile.bundles` 各 bundle 的 `dsh.bundle.patch`,安装序。[E: apps/cli/src/profile-boot.ts:149]
2. `profile.patches`:该 profile 的 `cordis.patch.yml`。[E: apps/cli/src/profile-boot.ts:125]
3. `homePatches`:`homePatchPath()` = `$DSH_HOME/cordis.patch.yml`(每 profile 都叠这一层)。[E: apps/cli/src/profile-boot.ts:50][E: apps/cli/src/profile-boot.ts:147]
4. `--patch` overlays(argv 序;`loadOverlayPatches`,缺文件即失败)。[E: apps/cli/src/profile-boot.ts:148]
5. **仅当**组成行里已有 `id: 'agent-presets'`:再 push 一层,把 `roots` 设为 CLI 自己的 `config/agent-presets/`(`SHIPPED_PRESET_ROOT`)且 `trust: 'system'`。[E: apps/cli/src/profile-boot.ts:35][E: apps/cli/src/profile-boot.ts:159][E: apps/cli/src/profile-boot.ts:164]
6. `DSH_TELEMETRY_DISABLED` 为**任意非空**字符串(含 `'0'` / `'false'`)且树里有 `session-telemetry-otel` 行 → `{ id: 'session-telemetry-otel', disabled: true }`;无该行则不生成 patch。[E: apps/cli/src/profile-boot.ts:81][E: apps/cli/src/profile-boot.ts:82][E: apps/cli/src/profile-boot.ts:168][E: apps/cli/tests/telemetry-switch.spec.ts:12]

第 5 步是 host 面给 preset roster 的唯一挂钩:web bundle 会 insert `agent-presets`(默认 `standard`);[E: packages/bundle/web-app/cordis.patch.yml:421][E: packages/bundle/web-app/cordis.patch.yml:424] headless bundle 的 patch 无该 id,shipped preset 不会被 CLI 塞进 headless。[I] preset 里有哪些工具,只看对应 `agent.cordis.yml`(节点 [`surface.presets.overview`](../presets/overview.md)),不看 `apps/cli/package.json` 的 dependencies。

`runProfile` 然后 `boot('dsh', rootConfig, allPatches, prepare)`:prepare 里先 `provide` 启动环境快照,再 `provideCmdline`。[E: apps/cli/src/profile-boot.ts:248][E: apps/cli/src/profile-boot.ts:255] 启动窗就挂 `SIGTERM` → `interrupt(0)`、`SIGINT` → `interrupt(130)`,以及 `installFailLoud`。[E: apps/cli/src/profile-boot.ts:221][E: apps/cli/src/profile-boot.ts:222] 优雅退出宽限 `PROCESS_SHUTDOWN_TIMEOUT_MS = 5_000`。[E: apps/cli/src/process-shutdown.ts:4] 树里若没有 `hmr` 服务,launcher 会补一个 `root: []` 的 watch-only HMR,并 `watchUserPatches` 监视 profile 层与 home 层,使长驻 host 面上的 `cordis.patch.yml` 可热更新。[E: apps/cli/src/profile-boot.ts:279][E: apps/cli/src/profile-boot.ts:283]

### dump 不 boot,叠层也更窄

`runDumpConfig` 同样 `prepareProfile`(因此 `web`/`headless` 的 `--dump-default-config` 也会触发模板 init),但只 `renderConfigDump` 写 stdout,不调用 `boot`。[E: apps/cli/src/dump-config.ts:31][E: apps/cli/src/dump-config.ts:51] `defaultOnly === false` 时才追加 profile `cordis.patch.yml`、home `$DSH_HOME/cordis.patch.yml`、以及 `--patch` 文件。[E: apps/cli/src/dump-config.ts:36] dump **没有** `composeProfile` 的 shipped `agent-presets` root overlay,也 **没有** `DSH_TELEMETRY_DISABLED` 那一层。

## 跨包关系

- [`spine.composition-boot`](../../spine/composition-boot.md) — profile 发现、bundle patch、Loader `boot`、preset mount 的端到端走读;本页只覆盖 CLI 如何选 mode 并叠 launcher 层。
- [`ref.cli-flags`](../../reference/cli-flags.md) — 旗标 catalog;本页给控制流与门控,catalog 给逐键索引。
- [`surface.cli.plugin`](plugin.md) — `runPlugin`:按调用 cwd 锚定相对 path spec、Windows `shell: true`、pnpm 缺失返回 127、成功后按**已安装状态** reconcile `dsh.profile.bundles`(模板自带 bundle 不是 dependency,reconcile 不删)。
- [`surface.profiles.web`](../profiles/web.md) — `PROFILE_TEMPLATES.web` = `dsh-base` + `dsh-web-app`;默认产品入口 `dsh web`;app 旗标 `--host` / `--port` / `--trusted-host`;host 面挂 webserver / UI,并把 base 上的模型可见工具行 disable,改由每会话 preset 再挂。
- [`surface.profiles.headless`](../profiles/headless.md) — `PROFILE_TEMPLATES.headless` = `dsh-base` + `dsh-headless`;无 HTTP / browser;不挂 `agent-presets`;模型可见工具留在 host 面的 `dsh-base` 行;task positional 在 app 侧解析。
- [`surface.presets.overview`](../presets/overview.md) — shipped preset 发现 / `mountPreset` / isolate;CLI 只在树已有 `agent-presets` 时注入 `trust: 'system'` 的 shipped root。
- `@deepseek-ai/dsh-cmdline` — `provideCmdline` / `parseCmdline` 是 app 旗标的 seam:Definition 是 `ctx.cmdlineArgs` + `ctx.appExit`,Provider 是 launcher 的 `runProfile`,Consumer 是各 bundle 的 `*-startup` 插件。[E: packages/boot/cmdline/src/index.ts:68]
- `@deepseek-ai/dsh-app-boot` — `loadProfile` / `initProfile` / `PROFILE_TEMPLATES` / `boot` / `loadLayeredEnv` / `renderConfigDump`;组合真树的算法在这边,CLI 是调用方。[E: packages/boot/app-boot/src/index.ts:177][E: packages/boot/app-boot/src/index.ts:757]

## Sources

- `apps/cli/src/bin.ts`
- `apps/cli/src/args.ts`
- `apps/cli/README.md`
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
- `packages/util/home-paths/src/index.ts`

## 相关

- [`ref.cli-flags`](../../reference/cli-flags.md) — CLI 旗标与 dump 诊断的 T3 catalog。
- [`spine.composition-boot`](../../spine/composition-boot.md) — 从 launcher 到 Loader 树 settle 的 T0 脊柱。

邻居(不在本节点 `related`,但同属组合入口):[`surface.cli.plugin`](plugin.md)、[`surface.profiles.web`](../profiles/web.md)、[`surface.profiles.headless`](../profiles/headless.md)、[`surface.presets.overview`](../presets/overview.md)。
