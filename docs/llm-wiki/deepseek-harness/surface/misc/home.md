---
id: surface.misc.home
title: DSH_HOME 与路径
kind: surface
tier: T1
pkg: util
source:
  - packages/util/home-paths/src/index.ts
  - packages/util/home-paths/src/invariant.ts
  - packages/util/home-paths/package.json
  - packages/util/home-paths/tests/home-paths.spec.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/tests/app-boot.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/settings/settings-file/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/credentials/credentials-local/tests/local.spec.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/shell/shell-env/src/index.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/args.ts
symbols:
  - DSH_HOME
  - DSH_HOME_ENV
  - resolveDshHome
  - defaultDshHome
  - dshHomePath
  - dshHomeDisplay
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> 产品主目录是**一根**用户数据根：环境变量 `$DSH_HOME`（非空、非纯空白）否则 `~/.dsh`。解析函数在 `@deepseek-ai/dsh-home-paths`。它**不是** Claude / Pi 的 `~/.agents`，也**不是** Cordis `Service`，没有 `ctx.home`。`ctx.dshHomePath` 由 `app-boot` 的 `boot` 挂上。DSH 是组合运行时；换 agent preset 不换这根目录。默认产品路径是 `dsh web`。

## 能回答的问题

- 产品主目录怎么定？显式 `configured`、`$DSH_HOME`、`~/.dsh` 谁优先？空白 `$DSH_HOME` 算不算已设置？
- 默认根是 `.dsh` 还是 `.agents`？项目里的 `.dsh/skills` / `.agents/skills` 算不算 `$DSH_HOME`？
- `profiles/`、`settings.yaml`、`.credentials.yaml`、`.agent-presets`、`sessions` 各是谁 `join` 的？
- `dshHomeDisplay` 会不会打出机器绝对路径？
- 换 `standard` / `code` preset，或换 `web` / `headless` profile，会不会换 `$DSH_HOME`？
- 有没有 `ctx.home`？Loader 里的 `!!js dshHomePath('sessions')` 谁提供？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），不是「又一个把配置塞进 `~/.agents` 的 coding agent」。进程级 **host 面**（webserver / persistence / sandbox）和每会话 **agent-preset 面**（tools / persona / isolate）共用**同一根**用户数据目录。capability seam 仍是 Definition / Provider / Consumer；模型看得见的 preset 必须能从 session 日志重建（`model-visible ⟺ logged`）。本仓没有 shipped TUI；默认安装路径是本地 Web GUI，入口是 `dsh web`（`--profile web` 的 alias）。[E: apps/cli/src/args.ts:156] [E: packages/boot/app-boot/src/profile.ts:115]

这根目录由 `@deepseek-ai/dsh-home-paths` 解析。[E: packages/util/home-paths/package.json:2] 导出常量 `DSH_HOME_ENV = 'DSH_HOME'`、默认目录名 `DSH_HOME_DIR_NAME = '.dsh'`，以及纯函数 `resolveDshHome` / `defaultDshHome` / `dshHomePath` / `dshHomeDisplay`。[E: packages/util/home-paths/src/index.ts:12] [E: packages/util/home-paths/src/index.ts:18] 包本身不注册 Cordis `Service`，companion `home-paths-invariant` 的 `install` 是空函数。[E: packages/util/home-paths/src/invariant.ts:21] 没有 `ctx.home` 这个键。[I] 树上能看见的是可选键 `ctx.dshHomePath`，类型扩在 `app-boot`，值由 `boot` `provide`。[E: packages/boot/app-boot/src/index.ts:27] [E: packages/boot/app-boot/src/index.ts:770]

**不是 `~/.agents`。** 默认绝对根是 `join(homedir(), '.dsh')`。[E: packages/util/home-paths/src/index.ts:62] [E: packages/util/home-paths/tests/home-paths.spec.ts:22] `~/.agents` 是 `skill-filesystem` 的另一条兼容根（`agentsHome`，可被 `DSH_AGENTS_HOME` 改），与 `resolveDshHome(config.dshHome)` 并列。[E: packages/skill/skill-filesystem/src/index.ts:163] [E: packages/skill/skill-filesystem/src/index.ts:164] 项目内同时扫 `<project>/.dsh/skills` 与 `<project>/.agents/skills`——那是 [`surface.skills.system`](../skills/system.md) 的扫描树，不是「`$DSH_HOME` 等于 `.agents`」。[E: packages/skill/skill-filesystem/src/index.ts:246] [E: packages/skill/skill-filesystem/src/index.ts:247]

## 入口

用户或进程碰到这根目录的方式：

| 入口 | 行为 |
|---|---|
| 未设或空白 `$DSH_HOME` | `resolveDshHome()` 落到 `defaultDshHome()` = `~/.dsh`。[E: packages/util/home-paths/src/index.ts:89] [E: packages/util/home-paths/tests/home-paths.spec.ts:44] |
| `export DSH_HOME=/abs` 或 `~/…` | 非空白值经 `expandHomePath` 再 `path.resolve`。只认光秃 `~` 与 `~/` / `~\`；`~other/…` 不展开。[E: packages/util/home-paths/src/index.ts:90] [E: packages/util/home-paths/tests/home-paths.spec.ts:32] |
| 插件 Config `dshHome` | settings / credentials / skill-filesystem / shell-env 等自己调 `resolveDshHome(config.dshHome)`。显式 `configured` 经 `??` 压过环境变量。[E: packages/util/home-paths/src/index.ts:89] [E: packages/settings/settings-file/src/index.ts:56] |
| `dsh web` / `dsh --profile <name>` | profile 目录在 `$DSH_HOME/profiles/<name>`。目录里没有 `package.json` 且名字命中 `PROFILE_TEMPLATES` 时 `loadProfile` 调 `initProfile`。[E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:376] [E: packages/boot/app-boot/src/profile.ts:383] |
| `$DSH_HOME/cordis.patch.yml` | 机器级用户 patch，叠在每个 profile 自己的 `cordis.patch.yml` **之后**。`composeEntries` 顺序是 bundle → profile.patches → homePatches → overlays。[E: apps/cli/src/profile-boot.ts:50] [E: apps/cli/src/profile-boot.ts:151] |
| Loader `!!js dshHomePath('sessions')` | `boot` 先 `ctx.provide('dshHomePath', dshHomePath)`，表达式才能插值。[E: packages/boot/app-boot/src/index.ts:770] [E: packages/bundle/base/cordis.patch.yml:101] |
| 模型 bash / pwsh 里的 `$DSH_HOME` | `shell-env` 把**已解析的绝对路径**注入每次调用；这和 `dshHomeDisplay` 的符号名不是同一条通道。[E: packages/shell/shell-env/src/index.ts:101] [E: packages/shell/shell-env/src/index.ts:154] |

launcher 没有 `--home` 旗标。[I] 改根的产品手段是非空白环境变量 `DSH_HOME`，或给 `resolveDshHome` 传 `configured`。

`.env` **不能**改 `DSH_HOME`。`loadLayeredEnv` 先 `const home = resolveDshHome()` 再读项目 / home 的 `.env`；名字带 `DSH_` 前缀的键是 bootstrap-only，写进发现到的文件会抛，只能从继承的进程环境来。[E: packages/boot/app-boot/src/index.ts:117] [E: packages/boot/app-boot/src/index.ts:181] [E: packages/boot/app-boot/src/index.ts:157]

## 关键字段

优先级（高 → 低）：`resolveDshHome(configured?, env = process.env)` 取 `configured ??`（`env.DSH_HOME` 有定义且 `trim().length > 0` 则用它，否则 `defaultDshHome()`），再 `resolve(expandHomePath(selected))`。[E: packages/util/home-paths/src/index.ts:88] [E: packages/util/home-paths/src/index.ts:89] 单测：`configured='/tmp/explicit-dsh'` 压过 `DSH_HOME: '~/env-dsh'`；只给 env 则展开到 `join(homedir(), 'env-dsh')`；`env = {}` 走默认根；`''` 与 `'   '` 都等于默认根。[E: packages/util/home-paths/tests/home-paths.spec.ts:38] [E: packages/util/home-paths/tests/home-paths.spec.ts:44] [E: packages/util/home-paths/tests/home-paths.spec.ts:45]

`dshHomePath(...segments)` **没有** `configured` 参数，永远 `join(resolveDshHome(), ...segments)`，只看当时的 `process.env`。[E: packages/util/home-paths/src/index.ts:99]

`dshHomeDisplay(resolvedHome)` 只回两档：解析后的路径等于默认根则 `~/.dsh`，否则 `` `$DSH_HOME` ``。永不回绝对路径。[E: packages/util/home-paths/src/index.ts:111] [E: packages/util/home-paths/tests/home-paths.spec.ts:55] [E: packages/util/home-paths/tests/home-paths.spec.ts:56] 若有人把 `$DSH_HOME` 设成恰好等于默认根，显示仍是 `~/.dsh`。

| 名 | 谁 join | 落点 |
|---|---|---|
| `DSH_HOME_ENV` | home-paths 常量 | 字符串 `'DSH_HOME'`，覆盖默认根的环境变量名。[E: packages/util/home-paths/src/index.ts:18] |
| 默认目录名 `.dsh` | `defaultDshHome()` = `join(homedir(), DSH_HOME_DIR_NAME)` | 显示名 `DEFAULT_DSH_HOME_DISPLAY` = `~/.dsh`。不是 `.agents`。[E: packages/util/home-paths/src/index.ts:12] [E: packages/util/home-paths/src/index.ts:15] [E: packages/util/home-paths/src/index.ts:62] |
| `profiles/` | `resolveProfileDir(name, home = resolveDshHome())` → `join(home, PROFILES_DIR, name)`；`PROFILES_DIR = 'profiles'` | `$DSH_HOME/profiles/<name>/`（`package.json` + `cordis.patch.yml`）。`healProfilesModuleFallback` 另在 `$DSH_HOME/profiles/node_modules` 维护安装回退。[E: packages/boot/app-boot/src/profile.ts:36] [E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:225] [E: packages/boot/app-boot/src/profile.ts:226] |
| `settings.yaml` | `settings-file` `resolveSpec`：`config.path` 优先，否则 `join(resolveDshHome(config.dshHome), 'settings.yaml')` | 用户设置文档。`dsh-base` 挂 `@deepseek-ai/dsh-settings-file` 时不传 `path`。[E: packages/settings/settings-file/src/index.ts:56] [E: packages/bundle/base/cordis.patch.yml:79] |
| `.credentials.yaml` | `credentials-local` `resolveSpec`：`config.path` 优先，否则 `join(resolveDshHome(config.dshHome), CREDENTIALS_FILENAME)`；`CREDENTIALS_FILENAME = '.credentials.yaml'` | 托管凭据文档。测试钉 `dshHome: '/custom/home'` → `/custom/home/.credentials.yaml`。[E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:81] [E: packages/credentials/credentials-local/tests/local.spec.ts:53] |
| `.agent-presets` | `AgentPresets` 在 `includeUserRoot`（默认 `true`）时追加 `{ path: dshHomePath(USER_PRESET_DIR), trust: 'user' }`；`USER_PRESET_DIR = '.agent-presets'` | `$DSH_HOME/.agent-presets`。换 preset id **只换**扫描到的 composition，不换 home。[E: packages/preset/agent-presets/src/discovery.ts:41] [E: packages/preset/agent-presets/src/index.ts:92] [E: packages/preset/agent-presets/src/index.ts:134] |
| `sessions` | `dsh-base` JSONL 行 `root: !!js dshHomePath('sessions')` | `$DSH_HOME/sessions`。`boot` 测试把同一表达式插值成 `join($DSH_HOME, 'sessions')`。[E: packages/bundle/base/cordis.patch.yml:101] [E: packages/boot/app-boot/tests/app-boot.spec.ts:676] [E: packages/boot/app-boot/tests/app-boot.spec.ts:682] |

同根下还有、但不在本表合同里的 join（各包自己拼）：home 级 `cordis.patch.yml`（`homePatchPath`）、用户 skills `join(dshHome, 'skills')`、web 的 `dshHomePath('storages')`。[E: apps/cli/src/profile-boot.ts:50] [E: packages/skill/skill-filesystem/src/index.ts:253] [E: packages/bundle/web-app/cordis.patch.yml:57]

**不要写进 `$DSH_HOME` 的路径：**

| 路径 | 真正的所有者 |
|---|---|
| `~/.agents` 与 `$DSH_AGENTS_HOME` | `skill-filesystem.agentsHome`，默认 `join(homedir(), '.agents')`。[E: packages/skill/skill-filesystem/src/index.ts:164] |
| `<project>/.dsh/skills`、`<project>/.agents/skills` | 同一 provider 在有 `cwd` 时按 `findProjectRoot` 扫的项目根，`source` 为 `project-dsh` / `project-agents`。[E: packages/skill/skill-filesystem/src/index.ts:246] [E: packages/skill/skill-filesystem/src/index.ts:247] |
| `apps/cli/config/agent-presets/` | shipped preset 的 `trust: 'system'` root，跟安装走，不在用户 home。 |

## 装配与门控

**解析门。** 空白或只含空白的 `$DSH_HOME` 当未设置，避免 `resolve('')` 落到 cwd。[E: packages/util/home-paths/src/index.ts:89] `??` 只跳过 `null` / `undefined`：调用方若传入空字符串 `configured`，空串会进入 `expandHomePath` 再 `resolve`，不会回落到默认根。[E: packages/util/home-paths/src/index.ts:90] 产品覆盖请传绝对路径或 `~/…`。

**不是 Service，没有 isolate。** 不要在 `cordis.yml` 里 `name: '@deepseek-ai/dsh-home-paths'`。函数在 import 时读 `os.homedir` / `process.env`。要给 Loader 用的是 `boot` 提供的函数 `dshHomePath`，不是 `ctx.home`。[E: packages/boot/app-boot/src/index.ts:770]

**host 面路径，不是 preset 面配置。** `web` 模板 bundles 是 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`；web 再 `insert` `agent-presets` 且 `default: standard`。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/bundle/web-app/cordis.patch.yml:424] 会话换 `minimal` / `standard` / `code` / `cordis` 只改模型看见的 tools / persona / isolate；`$DSH_HOME` 仍是进程启动时那根。用户自写 preset 落在同一根下的 `.agent-presets`，不会另起一个 home。

**profile 面也不换根。** `dsh --profile headless` 与 `dsh web` 共用 `resolveDshHome()`；差的是 `$DSH_HOME/profiles/<name>/` 这一层子目录。[E: packages/boot/app-boot/src/profile.ts:104]

**`dshHomePath` 看不见插件 Config。** `!!js dshHomePath('sessions')` 只读 `process.env`。插件自己的 `config.dshHome` 必须调用 `resolveDshHome(config.dshHome)`，settings 默认文件就是这样。[E: packages/util/home-paths/src/index.ts:99] [E: packages/settings/settings-file/src/index.ts:56]

**分层 `.env` 不能回写 home。** `DSH_` 是 `BOOTSTRAP_PREFIXES` 之一；home 在读任何 `.env` 之前已经定死。[E: packages/boot/app-boot/src/index.ts:117] [E: packages/boot/app-boot/src/index.ts:181] home 等于调用 cwd 时跳过用户层 `.env`，避免与项目层重复。[E: packages/boot/app-boot/src/index.ts:185]

**显示通道。** UI / 工作区指令里的符号名走 `dshHomeDisplay`（`~/.dsh` 或 `$DSH_HOME`）。模型 shell 里的 `$DSH_HOME` 是绝对路径。两套不要混读。

## 跨包关系

- [`surface.cli.overview`](../cli/overview.md)（`surface.cli.overview`）：`dsh` launcher 三 mode；profile 目录约定 `$DSH_HOME/profiles/<name>`。本页管这根目录怎么解析。
- [`surface.profiles.web`](../profiles/web.md)（`surface.profiles.web`）：默认产品 `dsh web` 的 host 组合；第一次启动写出 `$DSH_HOME/profiles/web/`。换 web overlay 不换 `$DSH_HOME`。
- [`surface.skills.system`](../skills/system.md)（`surface.skills.system`）：`skill-filesystem` 同时扫项目 `.dsh/skills` / `.agents/skills` 与用户 `$DSH_HOME/skills` / `agentsHome/skills`。本页只划清「那不是 DSH_HOME === `.agents`」。
- [`surface.config.settings`](../config/settings.md)（`surface.config.settings`）：`settings.yaml` 文档里有什么键。本页只写默认文件是谁 `join` 到 home 上的。
- [`spine.composition-boot`](../../spine/composition-boot.md)（`spine.composition-boot`）：空 `cordis.yml` 上 `bundle → profile patch → home patch → --patch`；home 级文件是 `$DSH_HOME/cordis.patch.yml`。
- [`subsys.util.home-paths`](../../subsystems/util/home-paths.md)（`subsys.util.home-paths`）：T2 权威实现（`expandHomePath` / `canonicalizeWatchPath` / seam 三角）。本页是 T1 产品路径面，不复述 watcher 代数。

## Sources

- packages/util/home-paths/src/index.ts
- packages/util/home-paths/src/invariant.ts
- packages/util/home-paths/package.json
- packages/util/home-paths/tests/home-paths.spec.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/tests/app-boot.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/settings/settings-file/src/index.ts
- packages/credentials/credentials-local/src/index.ts
- packages/credentials/credentials-local/tests/local.spec.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/discovery.ts
- packages/skill/skill-filesystem/src/index.ts
- packages/shell/shell-env/src/index.ts
- apps/cli/src/profile-boot.ts
- apps/cli/src/args.ts

## 相关

无 index related。邻居节点：

- [surface.cli.overview](../cli/overview.md)（`surface.cli.overview`）
- [surface.profiles.web](../profiles/web.md)（`surface.profiles.web`）
- [surface.skills.system](../skills/system.md)（`surface.skills.system`）
- [surface.config.settings](../config/settings.md)（`surface.config.settings`）
- [spine.composition-boot](../../spine/composition-boot.md)（`spine.composition-boot`）
- [subsys.util.home-paths](../../subsystems/util/home-paths.md)（`subsys.util.home-paths`）
