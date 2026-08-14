---
id: subsys.util.home-paths
title: home-paths
kind: subsystem
tier: T2
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
  - packages/settings/settings-file/src/index.ts
  - packages/skill/skill-filesystem/src/index.ts
symbols:
  - resolveDshHome
  - defaultDshHome
  - dshHomePath
  - dshHomeDisplay
  - DSH_HOME_ENV
  - canonicalizeWatchPath
related:
  - spine.overview
  - spine.composition-boot
  - surface.misc.home
  - subsys.composition.app-boot
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-home-paths` 是 **纯函数路径工具**：解析唯一产品主目录（显式 configured > 非空白 `$DSH_HOME` > `~/.dsh`）、拼接子路径、给出永不回绝对路径的显示名。它不是 Cordis `Service`，没有 `ctx.home`，也不做 profile / settings / skills 发现。

## 能回答的问题

- 产品主目录怎么解析？`resolveDshHome(configured?, env)` 的优先级是什么？空白 `$DSH_HOME` 算不算已设置？
- 默认根是 `.dsh` 还是 `.agents`？和 Claude 的 `~/.agents` 是不是同一个目录？
- `dshHomeDisplay` 为什么永远看不到绝对路径？自定义根显示成什么？
- `dshHomePath('sessions')` 谁提供给 Loader `!!js`？本包有没有自己挂 `ctx` 键？
- `canonicalizeWatchPath` 是不是通用 `realpath`？谁在用它？

## 职责边界

本包拥有：环境变量名 `DSH_HOME`、默认目录名 `.dsh`、`resolveDshHome` / `defaultDshHome` / `expandHomePath` / `dshHomePath` / `dshHomeDisplay`，以及给 native watcher 用的 `canonicalizeWatchPath`。[E: packages/util/home-paths/src/index.ts:18] [E: packages/util/home-paths/src/index.ts:12] 包名 `@deepseek-ai/dsh-home-paths`。[E: packages/util/home-paths/package.json:2] 主入口是这些函数与常量；Cordis companion 走 `./invariant`，不是另一套 home service。

它**不**拥有：

- profile 发现、`$DSH_HOME/profiles/<name>` 的 `loadProfile` / `healProfilesModuleFallback` / `boot` — [`subsys.composition.app-boot`](../composition/app-boot.md)（`subsys.composition.app-boot`）。那些函数的 `home` 默认参数调用 `resolveDshHome()`，本包只给根路径。[E: packages/boot/app-boot/src/profile.ts:104] [E: packages/boot/app-boot/src/profile.ts:223]
- `ctx.dshHomePath` 这个 **Context 键**。类型扩在 app-boot，值由 `boot` 里 `ctx.provide('dshHomePath', dshHomePath)` 放上去，供 Loader `!!js` 调用；本包不 `provide`。[E: packages/boot/app-boot/src/index.ts:27] [E: packages/boot/app-boot/src/index.ts:770]
- settings / credentials / session 盘 / user preset 目录里放什么文件 — 各 Persistence / composition Consumer 自己 `join` 或 `dshHomePath(...)`。
- skills 扫描树、`~/.agents`、项目内 `.dsh/skills` — `skill-filesystem` 把 `dshHome` 与 `agentsHome` 分成两个字段。[E: packages/skill/skill-filesystem/src/index.ts:163] [E: packages/skill/skill-filesystem/src/index.ts:164]
- T1 产品文案入口 — [`surface.misc.home`](../../surface/misc/home.md)（`surface.misc.home`）尚未写。本页是 T2 权威实现；T1 以后只做产品面入口。

**不是 service，没有 waterfall，没有 isolate。** 解析函数读 `os.homedir` / `process.env` 再 `path.resolve`，不往 `ctx` 注册。companion `home-paths-invariant` 的 `install` 是空函数：值代数由本包单测保证。[E: packages/util/home-paths/src/invariant.ts:13] [E: packages/util/home-paths/src/invariant.ts:21] `package.json` 的 `peerDependencies` 只有 `@deepseek-ai/dsh-invariants` 与 `@deepseek-ai/cordis`，给这份 companion 用。[E: packages/util/home-paths/package.json:35] [E: packages/util/home-paths/package.json:36]

**host 面路径，不是 preset 面配置。** 主目录是进程级用户数据根。默认产品路径仍是本地 Web GUI（`dsh web`）；换 preset 不会换 `$DSH_HOME`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/util/home-paths/src/index.ts` | `DSH_HOME_ENV` / `resolveDshHome` / `defaultDshHome` / `dshHomePath` / `dshHomeDisplay` / `canonicalizeWatchPath` |
| `packages/util/home-paths/src/invariant.ts` | companion 名 `home-paths-invariant`；`install` 为空 |
| `packages/util/home-paths/package.json` | `@deepseek-ai/dsh-home-paths`；导出 `.` 与 `./invariant` |
| `packages/util/home-paths/tests/home-paths.spec.ts` | 优先级、空白 env、display、watcher 祖先 |
| `packages/boot/app-boot/src/profile.ts` | Consumer：`resolveProfileDir` / `healProfilesModuleFallback` / `loadProfile` 默认 `resolveDshHome()` |
| `packages/boot/app-boot/src/index.ts` | Consumer：`loadLayeredEnv` 先解析 home；`boot` `provide` `dshHomePath` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `DSH_HOME_ENV` | 字符串 `'DSH_HOME'`。覆盖默认根的环境变量名。[E: packages/util/home-paths/src/index.ts:18] |
| `DSH_HOME_DIR_NAME` | `'.dsh'`。默认根是 `join(homedir(), '.dsh')`，不是 `.agents`。[E: packages/util/home-paths/src/index.ts:12] [E: packages/util/home-paths/src/index.ts:62] |
| `DEFAULT_DSH_HOME_DISPLAY` | `` `~/${DSH_HOME_DIR_NAME}` ``，即 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:15] [E: packages/util/home-paths/tests/home-paths.spec.ts:23] |
| `defaultDshHome()` | `join(homedir(), DSH_HOME_DIR_NAME)`。平台路径规则走 Node `os.homedir`。[E: packages/util/home-paths/src/index.ts:62] |
| `expandHomePath(path)` | 仅展开 `~`、`~/…`、`~\…`；`~other/…` 原样返回。[E: packages/util/home-paths/src/index.ts:71] [E: packages/util/home-paths/src/index.ts:72] [E: packages/util/home-paths/tests/home-paths.spec.ts:32] |
| `resolveDshHome(configured?, env = process.env)` | `configured ??` 非空白 `env.DSH_HOME` ?? `defaultDshHome()`，再 `resolve(expandHomePath(selected))`。[E: packages/util/home-paths/src/index.ts:87] [E: packages/util/home-paths/src/index.ts:89] |
| `dshHomePath(...segments)` | `join(resolveDshHome(), ...segments)`。无 configured 参数，只看当时的 `process.env`。空 `segments` 返回根本身。[E: packages/util/home-paths/src/index.ts:99] |
| `dshHomeDisplay(resolvedHome)` | 若 `resolvedHome === resolve(defaultDshHome())` 则 `~/.dsh`，否则 `` `$DSH_HOME` ``。从不返回绝对路径。[E: packages/util/home-paths/src/index.ts:111] |
| `canonicalizeWatchPath(path)` | 给 native watcher 一个 canonical 祖先：最深已存在祖先走 `realpath`，缺失后缀再拼回去。不是通用 realpath 封装。[E: packages/util/home-paths/src/index.ts:33] [E: packages/util/home-paths/src/index.ts:38] |

产品主目录不是 Claude / Pi 的配置根。`skill-filesystem` 的 `agentsHome` 默认 `join(homedir(), '.agents')`（可被 `DSH_AGENTS_HOME` 改），与 `resolveDshHome(config.dshHome)` 并列。[E: packages/skill/skill-filesystem/src/index.ts:164] 项目内它同时扫 `.dsh/skills` 与 `.agents/skills`，用户级 DSH skills 才落在 `join(dshHome, 'skills')`。[E: packages/skill/skill-filesystem/src/index.ts:246] [E: packages/skill/skill-filesystem/src/index.ts:247] [E: packages/skill/skill-filesystem/src/index.ts:253]

## 控制流

1. `resolveDshHome@packages/util/home-paths/src/index.ts` 读 `env[DSH_HOME_ENV]`。`selected = configured ?? (fromEnv 有定义且 `trim().length > 0` ? fromEnv : defaultDshHome())`：显式 `configured` 最高；否则非空白 `$DSH_HOME`；否则 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:88] [E: packages/util/home-paths/src/index.ts:89] 空白或只含空白的 `$DSH_HOME` 当未设置，避免 `resolve('')` 落到 cwd。

2. 选中的字符串先 `expandHomePath`，再 `path.resolve` 收成绝对路径。[E: packages/util/home-paths/src/index.ts:90] `expandHomePath('~')` → `homedir()`；`~/` 与 `~\` 切掉前两个字符再 `join(homedir(), …)`。[E: packages/util/home-paths/src/index.ts:71] [E: packages/util/home-paths/src/index.ts:72]

3. `defaultDshHome@packages/util/home-paths/src/index.ts` 固定 `join(homedir(), '.dsh')`。单测钉死目录名、显示名与默认绝对路径。[E: packages/util/home-paths/src/index.ts:62] [E: packages/util/home-paths/tests/home-paths.spec.ts:22] [E: packages/util/home-paths/tests/home-paths.spec.ts:24]

4. 单测钉死优先级：`configured='/tmp/explicit-dsh'` 压过 `DSH_HOME: '~/env-dsh'`；只给 env 则展开到 `join(homedir(), 'env-dsh')`；`env = {}` 走 `defaultDshHome()`。[E: packages/util/home-paths/tests/home-paths.spec.ts:38] [E: packages/util/home-paths/tests/home-paths.spec.ts:39] [E: packages/util/home-paths/tests/home-paths.spec.ts:40] `DSH_HOME: ''` 与 `'   '` 都等于默认根。[E: packages/util/home-paths/tests/home-paths.spec.ts:44] [E: packages/util/home-paths/tests/home-paths.spec.ts:45]

5. `dshHomePath@packages/util/home-paths/src/index.ts` 把段拼到 `resolveDshHome()` 上。测试 `stubEnv('DSH_HOME', '~/env-dsh')` 后 `dshHomePath()` / `dshHomePath('storages', 'cache')` 分别是 env 根与其下两级。[E: packages/util/home-paths/src/index.ts:99] [E: packages/util/home-paths/tests/home-paths.spec.ts:50] [E: packages/util/home-paths/tests/home-paths.spec.ts:51]

6. `dshHomeDisplay@packages/util/home-paths/src/index.ts` 比较的是解析后的绝对路径是否等于默认根：相等标 `~/.dsh`，否则标 `$DSH_HOME`。测试对 `resolve(defaultDshHome())` 与 `'/some/other/root'` 分别钉这两档，没有第三档绝对路径。[E: packages/util/home-paths/src/index.ts:111] [E: packages/util/home-paths/tests/home-paths.spec.ts:55] [E: packages/util/home-paths/tests/home-paths.spec.ts:56]

7. Consumer `resolveProfileDir@packages/boot/app-boot/src/profile.ts`：`home` 默认 `resolveDshHome()`，再 `join(home, 'profiles', name)`。`healProfilesModuleFallback` 与 `loadProfile` 同样默认这个 home；fallback 目录是 `join(home, PROFILES_DIR, 'node_modules')`。[E: packages/boot/app-boot/src/profile.ts:104] [E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:223] [E: packages/boot/app-boot/src/profile.ts:225] [E: packages/boot/app-boot/src/profile.ts:372]

8. `loadLayeredEnv@packages/boot/app-boot/src/index.ts` 在读任何 `.env` 之前先 `const home = resolveDshHome()`，再 `readEnvLayer(..., home, …)` 找用户层文件（home 等于 cwd 时跳过，避免与项目层重复）。[E: packages/boot/app-boot/src/index.ts:181] [E: packages/boot/app-boot/src/index.ts:185] `DSH_` 是 bootstrap-only 前缀：`isBootstrapOnly` 为真的名字在发现到的文件里会抛，不能靠项目 `.env` 改写本包的解析输入。[E: packages/boot/app-boot/src/index.ts:117] [E: packages/boot/app-boot/src/index.ts:127] [E: packages/boot/app-boot/src/index.ts:157]

9. `boot@packages/boot/app-boot/src/index.ts` 在 `ctx.plugin(Loader)` 之前 `ctx.provide('dshHomePath', dshHomePath)`。这是函数，不是 `Service`，也不是 `ctx.home`。[E: packages/boot/app-boot/src/index.ts:770] 测试写 `!!js dshHomePath('sessions')`，断言插值结果是 `join($DSH_HOME, 'sessions')`。[E: packages/boot/app-boot/tests/app-boot.spec.ts:676] [E: packages/boot/app-boot/tests/app-boot.spec.ts:682] shipped `dsh-base` 用同一表达式把 JSONL 根指到 `dshHomePath('sessions')`。[E: packages/bundle/base/cordis.patch.yml:101]

10. `canonicalizeWatchPath@packages/util/home-paths/src/index.ts`：`resolve` 后遇 `ENOENT` 向上收缺失段，对最深已存在祖先 `realpath`；若有缺失后缀还 `opendir` 证明祖先是可枚举目录，再 `join` 回去。非 `ENOENT` 原样抛。测试：经 symlink 的 `alias/later/config.yml` 收到 `realpath(target)/later/config.yml`；文件当父目录则 `ENOTDIR`。[E: packages/util/home-paths/src/index.ts:45] [E: packages/util/home-paths/src/index.ts:47] [E: packages/util/home-paths/tests/home-paths.spec.ts:66] [E: packages/util/home-paths/tests/home-paths.spec.ts:67] [E: packages/util/home-paths/tests/home-paths.spec.ts:71] `settings-file` 把这个结果交给 chokidar，而不是自己 `realpath` 整条路径。[E: packages/settings/settings-file/src/index.ts:238]

## 设计动机

所有用户数据（profiles、settings、sessions、credentials、user presets）共用一根，避免每家自己读 `HOME` / 猜 `.agents`。优先级写成 `configured ?? 非空白 env ?? default`，是为了让测试与嵌入方注入假 env，同时让空白 `$DSH_HOME` 不能把根解析成 cwd。

`dshHomeDisplay` 只输出 `~/.dsh` 或 `$DSH_HOME`，是为了日志 / 指令里永不泄露机器绝对路径。比较的是解析后的路径：若有人把 `$DSH_HOME` 设成恰好等于默认根，显示仍是 `~/.dsh`。

本包保持纯函数：没有 `ctx.home` service，换 Persistence Provider 也不会带走另一套 home 解析。app-boot 只把 `dshHomePath` 这个函数 `provide` 给 `!!js`，插值与 profile 发现仍是 Consumer。

`canonicalizeWatchPath` 只解决 watcher 要的那件事：末段还可以不存在，但祖先必须是目录的真实拼写（Windows 短名 / 把普通文件当父目录）。它不是 `fs.realpath` 的包装。

## Gotcha

- **空白 `$DSH_HOME` 当 unset；空字符串 `configured` 不是。** `??` 只跳过 `null` / `undefined`。`resolveDshHome('')` 会把 `''` 交给 `expandHomePath` 再 `resolve`。覆盖请传绝对路径或 `~/…`。[E: packages/util/home-paths/src/index.ts:89] [E: packages/util/home-paths/src/index.ts:90]
- **`dshHomeDisplay` 永不回绝对路径。** 自定义根在 UI / 指令里只出现 `$DSH_HOME`，不会打印你设的那条路径。[E: packages/util/home-paths/src/index.ts:111]
- **`dshHomePath` 看不见 `configured`。** 它永远 `resolveDshHome()`，只读 `process.env`。插件 Config 里的 `dshHome` 必须自己调 `resolveDshHome(config.dshHome)`，例如 settings 默认文件。[E: packages/util/home-paths/src/index.ts:99] [E: packages/settings/settings-file/src/index.ts:56]
- **没有 `ctx.home`。** 树上能看见的是 app-boot 提供的 `ctx.dshHomePath`（函数），不是本包注册的 `Service`。[E: packages/boot/app-boot/src/index.ts:770]
- **产品主目录不是 `.agents`。** 默认根是 `~/.dsh`。`.agents` 是 skills 的另一条兼容根（`agentsHome` / 项目 `.agents/skills`），不要把 Claude 配置目录当成 `$DSH_HOME`。[E: packages/util/home-paths/tests/home-paths.spec.ts:22] [E: packages/skill/skill-filesystem/src/index.ts:164]
- **`~other/...` 不展开。** 只有光秃 `~` 与 `~/` / `~\` 前缀。`~user` 风格不是本包合同。[E: packages/util/home-paths/tests/home-paths.spec.ts:32]
- **本包不是 Loader 插件。** 不要在 `cordis.yml` 里 `name: '@deepseek-ai/dsh-home-paths'`。要挂的是 invariant companion（空 `install`），或什么都不挂、只 import 函数。

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合行 |
|---|---|---|
| **Definition** | 本包导出的路径代数：`DSH_HOME` + `resolveDshHome` / `dshHomePath` / `dshHomeDisplay` | **没有** `ctx.home`。唯一相关键是 app-boot 加上的可选 `ctx.dshHomePath?: typeof dshHomePath` |
| **Provider（本页）** | `@deepseek-ai/dsh-home-paths` 纯函数 | 不占 bundle 行。`./invariant` 的 `name = 'home-paths-invariant'`，`install` 为空 |
| **Consumer（组合）** | [`subsys.composition.app-boot`](../composition/app-boot.md) | `resolveProfileDir` / `healProfilesModuleFallback` / `loadProfile` / `loadLayeredEnv` 默认 `resolveDshHome()`；`boot` `provide('dshHomePath', dshHomePath)` |
| **Consumer（`!!js` / 默认文件）** | `dsh-base` / `settings-file` | `root: !!js dshHomePath('sessions')`；`join(resolveDshHome(config.dshHome), 'settings.yaml')` |
| **Consumer（watcher）** | `settings-file` | `chokidarWatch(await canonicalizeWatchPath(this.spec.filename), …)` |

换产品主目录 = 设非空白 `$DSH_HOME` 或给 `resolveDshHome` 传 `configured`，不是换 bundle、也不是改 preset。换 Persistence Provider 仍应走同一套函数，否则会写出第二根「home」。

## Sources

- packages/util/home-paths/src/index.ts
- packages/util/home-paths/src/invariant.ts
- packages/util/home-paths/package.json
- packages/util/home-paths/tests/home-paths.spec.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/tests/app-boot.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/settings/settings-file/src/index.ts
- packages/skill/skill-filesystem/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：Cordis 组合运行时全仓地图；host / preset / client 切面。
- [spine.composition-boot](../../spine/composition-boot.md)（`spine.composition-boot`）：`profile → bundle → preset`；用户数据落在 `$DSH_HOME` 否则 `~/.dsh`。
- [surface.misc.home](../../surface/misc/home.md)（`surface.misc.home`）：T1 产品面入口（尚未写）。本页是 T2 权威实现。
- [subsys.composition.app-boot](../composition/app-boot.md)（`subsys.composition.app-boot`）：`resolveProfileDir` / `healProfilesModuleFallback` / `boot` 提供 `dshHomePath`。
