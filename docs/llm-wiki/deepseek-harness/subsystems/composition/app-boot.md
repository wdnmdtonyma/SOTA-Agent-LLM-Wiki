---
id: subsys.composition.app-boot
title: app-boot 与 profile 发现
kind: subsystem
tier: T2
pkg: composition
source:
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/profile-context.ts
  - packages/boot/app-boot/package.json
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/boot/app-boot/tests/config-dump.spec.ts
  - packages/boot/app-boot/tests/app-boot.spec.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/plugin.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/tests/args.spec.ts
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/acp-app/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/boot/cmdline/src/index.ts
  - packages/boot/plugin-manager/src/index.ts
  - packages/util/home-paths/src/index.ts
  - packages/util/package-manifest/src/types.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - vendor/include/src/index.ts
  - vendor/loader/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
symbols:
  - boot
  - loadProfile
  - loadProfileDirectory
  - composeEntries
  - initProfile
  - PROFILE_TEMPLATES
  - OPTIONAL_BUNDLES
  - bundlePatchFiles
  - readProfilePatches
related:
  - spine.composition-boot
  - subsys.composition.cmdline
  - subsys.composition.bundle-base
  - spine.overview
  - spine.capability-seams
  - surface.cli.overview
  - surface.cli.plugin
  - surface.profiles.web
  - surface.profiles.headless
  - surface.profiles.sdk
  - surface.profiles.sdk-minimal
  - surface.profiles.acp
  - subsys.composition.bundle-web-app
  - subsys.composition.bundle-headless
  - subsys.composition.bundle-sdk-app
  - subsys.composition.bundle-sdk-minimal
  - subsys.composition.bundle-acp-app
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 477b4f4205
---

> `@deepseek-ai/dsh-app-boot` 是 Cordis 组合运行时的 **profile 发现与 Loader 启动胶**：把 `$DSH_HOME/profiles/<name>` 的 `dsh.profile.bundles` 叠成空根上的入口表，再 `boot` 出进程级 host 面。它不实现 turn、不注册模型可见工具、不 `mountPreset`；主线仍是 `profile → bundle → agent preset`，能力缝是 `Definition / Provider / Consumer`。

## 能回答的问题

- `dsh web` / `dsh headless` / `dsh --profile sdk|sdk-minimal|acp` 怎样变成一次 `boot`？`PROFILE_TEMPLATES` 到底有几个 shipped 名？`OPTIONAL_BUNDLES` 是什么？
- `dsh.bundle.patch` 为什么可以是一个文件或一个有序列表？四个 shipped preset 为什么只出现在 `dsh-web-app`？
- `loadProfile` 为什么 installation-first？未知 profile 名、缺 `dsh.bundle`、`skippedBundles` 各怎样响？
- launcher 的 `readProfilePatches` 与 `dsh --dump-config` 差哪一刀？为什么 dump 看不到 telemetry hard-disable？
- 空的 `cordis.yml` 为什么每次被重写成 `[]`？Loader write-back 不调用 waterfall `next()` 会怎样？
- `boot` 在挂任何树行之前 `provide` 什么？`isolate` / `leakedServices` 是本包的门还是 preset 的门？HMR 现在写在哪一层？

## 职责边界

本包拥有：profile 目录解析与 `initProfile`、installation-first 的 bundle 解析（`dsh.bundle.patch` 可以是路径或路径列表）、`composeEntries`（空根上一次 `applyEntryPatches`）、`boot` / `mountRootInclude` / fail-loud 审计、分层 `.env` 快照、`readProfilePatches`（含 telemetry 开关）、以及离线 `renderConfigDump`。

本包**不**拥有：

- launcher 旗标边界与 `ctx.cmdlineArgs` / `ctx.appExit` —— [subsys.composition.cmdline](./cmdline.md)
- `dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app` 的行表 —— 各 bundle 节点
- 声明式 preset 登记、revision bind、`leakedServices` 审计 —— [subsys.composition.agent-presets](./agent-presets.md)
- 端到端 `profile → bundle → preset` 走读 —— [spine.composition-boot](../../spine/composition-boot.md)
- Agent / inbox / session log（`model-visible ⟺ logged` 从 `Session.deriveMessages()` 起算，不从 Loader 入口表起算）

**host 面 vs agent-preset 面。** `boot` 只 settle 进程级 host 面：webserver / persistence / sandbox / subagent **backends** / 注册表。agent-preset 面（每会话 tools / persona / isolate）要等组合里已经有 `agent-preset-registry` 行，再由 factory `setup` 去 `mount`。五个 shipped CLI profile 入口是第一个非旗标 token（`plugin` 除外）展开成 `--profile`，以及显式 `dsh --profile web|headless|sdk|sdk-minimal|acp`。[E: apps/cli/src/args.ts:201] **`desktop` 不在 `PROFILE_TEMPLATES`**：Electron 独占 `$DSH_HOME/profiles/desktop`；`dsh --profile desktop` 被 `rejectElectronProfile` 拒绝。[E: apps/cli/src/args.ts:83] [E: apps/cli/src/args.ts:182] `PROFILE_TEMPLATES` 没有 `tui`，本仓也没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/boot/app-boot/src/profile.ts` | `PROFILE_TEMPLATES` / `OPTIONAL_BUNDLES` / `bundlePatchFiles` / `loadProfile` / `composeEntries` / `normalizeShippedProfile` |
| `packages/util/package-manifest/src/types.ts` | `DshBundleManifest.patch`：`string \| string[]` |
| `packages/boot/app-boot/src/profile-context.ts` | `ProfileContext`、`readProfilePatches`、`resolveTelemetryPatch` |
| `packages/boot/app-boot/src/index.ts` | `boot` / `mountRootInclude` / `loadLayeredEnv` / `loadOptionalPatches` / `loadOverlayPatches` / `renderConfigDump` / `installFailLoud` |
| `apps/cli/src/profile-boot.ts` | launcher 本地 `composeProfile`（未导出）、空根重写、`runProfile` |
| `apps/cli/src/dump-config.ts` | `runDumpConfig`：文件层 dump，不含 telemetry hard-disable |
| `apps/cli/src/plugin.ts` | 未知名走 `DEFAULT_PROFILE_BUNDLES`，不走模板 |
| `packages/bundle/web-app/package.json` | `dsh.bundle.patch` **列表**：`cordis.patch.yml` + 四份 `presets/*.patch.yml` |
| `packages/bundle/*/package.json` | 其它 in-box bundle 仍是单个 `./cordis.patch.yml` |
| `vendor/include/src/index.ts` | `applyEntryPatches`：同 id 的 `config` 整键覆盖 |
| `vendor/loader/src/index.ts` | persist 钩子 `await next()` 之后 `tree.write()` |
| `vendor/cordis/src/events.ts` | `Events.waterfall`：不调用 `next()` 就不 `shift` |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `PROFILE_TEMPLATES` | `profile.ts` | 五个键：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] **没有 `desktop`。** `web` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`。[E: packages/boot/app-boot/src/profile.ts:184] `sdk-minimal` 的 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`，不叠 `dsh-base`。[E: packages/boot/app-boot/src/profile.ts:193] |
| `OPTIONAL_BUNDLES` | `profile.ts` | 安装随附、默认关掉、由 plugin manager 供人打开的 experimental bundle：`dsh-experimental-agent-team-profile` / `dsh-experimental-voice-input-bundle` / `dsh-experimental-auto-review`。[E: packages/boot/app-boot/src/profile.ts:213] [E: packages/boot/plugin-manager/src/index.ts:290] **不是** `PROFILE_TEMPLATES` 成员。 |
| `DEFAULT_PROFILE_BUNDLES` | `profile.ts` | `['@deepseek-ai/dsh-base']`。`dsh plugin` 对无模板名用这份，不会偷偷当成 web。[E: packages/boot/app-boot/src/profile.ts:203] [E: apps/cli/src/plugin.ts:40] |
| `DshBundleManifest.patch` | `package-manifest` | `string \| string[]`。列表按声明顺序拼成**同一** bundle 层。[E: packages/util/package-manifest/src/types.ts:71] [E: packages/boot/app-boot/src/profile.ts:58] |
| `Profile` / `ProfileLayer` | `loadProfileDirectory` | `layers` 按 `dsh.profile.bundles` 顺序；每层 `patchPaths` + 拼接后的 `patches`；`patches` 是 profile 自己的 `cordis.patch.yml`（缺文件 = `[]`）；`skippedBundles` 列出未能加载的 selected bundle。[E: packages/boot/app-boot/src/profile.ts:90] [E: packages/boot/app-boot/src/profile.ts:106] |
| `INSTALLATION_OWNED_PROFILE_TUPLES` | `normalizeShippedProfile` | 仅 `headless` 的旧三元组 `base + web-app + headless` 会被写成现行二元组；带额外 custom bundle 的列表视为用户所有，不动。[E: packages/boot/app-boot/src/profile.ts:198] [E: packages/boot/app-boot/src/profile.ts:579] |
| `PatchOptions` | `vendor/include` | `id` / `insert` / `config` / `disabled` / `isolate` …；`config` 赋值是整键替换。[E: vendor/include/src/index.ts:122] |
| `PROFILE_ROOT_CONFIG` | launcher | 正文就是空数组 `[]`。Loader 需要真实 include 根来锚定 `baseUrl`，但文件本身不是手写大树。[E: apps/cli/src/profile-boot.ts:81] |
| `ProfileContext` | `profile-context.ts` | launcher 在 `prepare` 里 `provide('profileContext', …)`：profile 目录、启动时 bundle 名、overlays、telemetry 环境值。[E: apps/cli/src/profile-boot.ts:287] [E: apps/cli/src/profile-boot.ts:298] |
| `LaunchEnvironmentSnapshot` | `ctx.launchEnvironment` | `loadLayeredEnv` 冻结的 inherited > 调用目录 `.env` > `$DSH_HOME/.env`；bootstrap-only 名禁止出现在发现到的文件里。[E: packages/boot/app-boot/src/index.ts:234] |

五个非 web shipped bundle 的 `dsh.bundle.patch` 都是 `./cordis.patch.yml`。[E: packages/bundle/base/package.json:33] [E: packages/bundle/headless/package.json:39] [E: packages/bundle/sdk-app/package.json:33] [E: packages/bundle/sdk-minimal/package.json:33] [E: packages/bundle/acp-app/package.json:33] **只有** `@deepseek-ai/dsh-web-app` 把 patch 写成列表：`cordis.patch.yml` 之后叠 `presets/{standard,ptc,minimal,cordis}.patch.yml`。[E: packages/bundle/web-app/package.json:43] headless / sdk / acp / sdk-minimal **不含**这些 preset 文件。

四个 shipped agent preset 的 roster id 是 `minimal` / `standard` / `ptc` / `cordis`（wiki 节点 id `surface.presets.code` 仍是 PTC 的稳定别名）。它们是 web-app bundle 层里的 `@deepseek-ai/dsh-agent-preset` 声明行，不是独立目录、也不是 launcher overlay。

## 控制流

### 1. 入口切到 profile 模式

1. `parseDshArgs@apps/cli/src/args.ts` 只吃 launcher 旗标。第一个非 `-` 且不是 `plugin` 的 token 被展开成 `--profile <name>`，所以 `dsh web` 与 `dsh --profile web` 同一条 profile 模式；`dsh headless "…"` 同样成立。[E: apps/cli/src/args.ts:201] [E: apps/cli/tests/args.spec.ts:69] `--profile desktop`（大小写不敏感）在 parse 时被 `rejectElectronProfile` 拒绝。[E: apps/cli/src/args.ts:83] [E: apps/cli/src/args.ts:182]
2. `bin` switch@apps/cli/src/bin.ts：`profile` → `runProfile`（先 `loadLayeredEnv('dsh')`）；`dump-config` → `runDumpConfig`（**不** `boot`）；`plugin` → `runPlugin`。[E: apps/cli/src/bin.ts:23] [E: apps/cli/src/bin.ts:45] [E: apps/cli/src/bin.ts:40]
3. help 里的 `dsh tui` 写的是「boot a custom profile」，不是 shipped 模板。[E: apps/cli/src/args.ts:96]

### 2. `prepareProfile`：发现、空根重写

4. `prepareProfile@apps/cli/src/profile-boot.ts` 先 `loadProfile('dsh', name, INSTALL_ANCHOR, …)`。[E: apps/cli/src/profile-boot.ts:169]
5. **每次** `writeFileSync(…, PROFILE_ROOT_CONFIG)`，把 `$DSH_HOME/profiles/<name>/cordis.yml` 重写成空数组。[E: apps/cli/src/profile-boot.ts:171] [E: apps/cli/src/profile-boot.ts:81]
6. 重写原因在 Loader：插件 `Fiber.update` 走 `internal/update` waterfall，innermost `next` 才是 `restart`。[E: vendor/cordis/src/fiber.ts:748] Loader 的 persist 钩子之后调用 `this.entry.parent.tree.write()`；自处置路径也会 `tree.write()`。[E: vendor/loader/src/index.ts:119] [E: vendor/loader/src/index.ts:165] 若不每次清空，下次 `boot` 会在已烤进行上再跑一遍 bundle `insert`，根 insert 翻倍。

### 3. `loadProfile`：installation-first，未知名不自动 init

7. `resolveProfileDir` 拼 `$DSH_HOME/profiles/<name>`。`loadProfile` 在目录还没有 `package.json` 时：仅当 `name` 落在 `PROFILE_TEMPLATES` 才 `initProfile`；否则抛 `does not exist`。`desktop` 不在模板里，CLI 路径不会自动 init 它。[E: packages/boot/app-boot/src/profile.ts:708] [E: packages/boot/app-boot/src/profile.ts:711]
8. **`loadProfileDirectory`** 给**已经初始化**的绝对目录用：不经 `$DSH_HOME/profiles/<name>` 解析。Electron 独占的 `desktop` profile 走这条，而不是 `dsh --profile desktop`。[E: packages/boot/app-boot/src/profile.ts:654]
9. `loadProfile` 在 init / `normalizeShippedProfile` 之后 **`return loadProfileDirectory(...)`**。[E: packages/boot/app-boot/src/profile.ts:719]
10. `resolveBundleDir` 的锚点顺序是 `[installAnchor, profileDir/package.json]`：in-box bundle 永远来自正在跑的这份 dsh。[E: packages/boot/app-boot/src/profile.ts:632]
11. 每个 listed bundle 必须在自己的 `package.json` 声明 `dsh.bundle`。`bundle === undefined` 对该包抛 `declares no dsh.bundle`，但 `loadProfileDirectory` **catch 后记入 `skippedBundles`**，其余 bundle 继续。[E: packages/boot/app-boot/src/profile.ts:670] [E: packages/boot/app-boot/src/profile.ts:679] `dsh.bundle.patch` 既不是 string 也不是 string[] 时，`bundlePatchFiles` 抛 `must be a file path or a list of file paths`，同样进 `skippedBundles`。[E: packages/boot/app-boot/src/profile.ts:61] [E: packages/boot/app-boot/tests/profile.spec.ts:334]
12. profile 自己的 `cordis.patch.yml`：`userLayer !== false` 且文件存在才 `loadOverlayPatches`；缺文件得到 `[]`，不抛。[E: packages/boot/app-boot/src/profile.ts:684]

### 4. `composeEntries`：从 `[]` 一次 flatten

13. `composeEntries@packages/boot/app-boot/src/profile.ts` 第一参是 `layers`（patch 列表的列表），内部只调用**一次** `applyEntryPatches([], structuredClone(layers.flat()), …)`：空根是 `applyEntryPatches` 的第一参。[E: packages/boot/app-boot/src/profile.ts:733] dump / boot 共用这一次调用。
14. `applyEntryPatches`：无 `id` 的 `insert` 追加到根；刚插入的行立刻 `buildMap`，同一 flattened 列表里后写的 patch 可以改刚插的行；匹配不到只 `warn`，不抛。[E: vendor/include/src/index.ts:93] [E: vendor/include/src/index.ts:100]
15. 同 id 的 `config` / `disabled` **整键覆盖**（`target[key] = value`），不是 deep-merge。[E: vendor/include/src/index.ts:122] web-app 的五份文件在**同一** bundle 层里按 `dsh.bundle.patch` 顺序拼接，因此 `presets/standard.patch.yml` 可以改 `cordis.patch.yml` 刚 insert 的行。[E: packages/boot/app-boot/tests/profile.spec.ts:308]

### 5. `readProfilePatches` 与 dump 的一刀差

16. launcher 本地 `composeProfile@apps/cli/src/profile-boot.ts` 是 `async function`，没有 `export`。它只装 profile + overlays；真正叠层在 `readProfilePatches`。[E: apps/cli/src/profile-boot.ts:197] [E: apps/cli/src/profile-boot.ts:296]
17. `readProfilePatches` 顺序：`bundlePatches → profile.patches → homePatches → overlays`，再视情况 push telemetry disable。home 层是 `$DSH_HOME/cordis.patch.yml`（`loadOptionalPatches`：缺文件 = 无层）。`--patch` 走 `loadOverlayPatches`：**缺文件抛错**。[E: packages/boot/app-boot/src/profile-context.ts:63] [E: packages/boot/app-boot/src/profile-context.ts:68]
18. 若 `DSH_TELEMETRY_DISABLED` 非空且存在 `session-telemetry-otel` 行，再 push `{ id, disabled: true }`。`'0'` / `'false'` 也关。[E: packages/boot/app-boot/src/profile-context.ts:52]
19. `runDumpConfig@apps/cli/src/dump-config.ts` 只把「每个 bundle 一层 +（非 `--dump-default-config` 时）profile 用户层 + home 层 + 每个 `--patch`」交给 `renderConfigDump`，锚在同一份空 `cordis.yml` 上，**不求值 `!!js`**。[E: apps/cli/src/dump-config.ts:56] [E: packages/boot/app-boot/tests/config-dump.spec.ts:94] dump **不含** telemetry hard-disable：它从不调用 `readProfilePatches` / `resolveTelemetryPatch`。web-app 那一层是五份文件**已拼接**的 `layer.patches`，所以 dump **能看见** `agent-preset-registry` 与四个 `preset-*` 声明行，只是不会按文件拆层。[E: apps/cli/src/dump-config.ts:56]

### 6. `boot`：空 `cordis.yml` + 整叠 patches

20. `runProfile` 调 `boot(NAME, rootConfig, readProfilePatches(…), prepare)`。[E: apps/cli/src/profile-boot.ts:296]
21. `boot@packages/boot/app-boot/src/index.ts`：`new Context()` → `ctx.provide('dshHomePath', dshHomePath)` → `ctx.plugin(Loader)` → `prepare?.(ctx)` → `mountRootInclude`。[E: packages/boot/app-boot/src/index.ts:979] [E: packages/boot/app-boot/src/index.ts:995]
22. `prepare` 在任何 config 行挂上之前：`provide('profileContext', …)`、`provide(DSH_LAUNCH_ENVIRONMENT_KEY, …)`、`PluginPackages`、`provideCmdline`（`ctx.cmdlineArgs` + `ctx.appExit` + 可选 `ctx.appReady`）。[E: apps/cli/src/profile-boot.ts:298] [E: apps/cli/src/profile-boot.ts:301] [E: packages/boot/cmdline/src/index.ts:84] Home 取非空 `$DSH_HOME`，否则 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:88]
23. `mountRootInclude` 钉死根行 `id: 'include'` / `name: 'cordis:include'`，`config.path` 指向那份空 `cordis.yml`，`config.patches` 是整叠 overlays。[E: packages/boot/app-boot/src/index.ts:574] [E: packages/boot/app-boot/src/index.ts:575] 同时注册 `ctx.loader.builtins.group = Group`，让 `cordis:group` 不依赖 included 树自己的 specifier 解析——isolate realm 靠 group 行把 Provider 与 Consumer 关进同一份私有符号表。[E: packages/boot/app-boot/src/index.ts:563]
24. 树 settle 后 `auditStartupEntries`：enabled 且非 `ACTIVE` 的行 fail-closed。`prepare` 抛错标 `host preparation failed` 并 `dispose` 半棵树；之后的失败标 `plugin tree failed to load`。[E: packages/boot/app-boot/src/index.ts:992] [E: packages/boot/app-boot/src/index.ts:1003] `installFailLoud` 把后续 unhandledRejection / uncaughtException 收成一行 stderr + `exit(1)`。[E: packages/boot/app-boot/src/index.ts:679]

### 7. HMR 是 YAML 行，不是 launcher 特例

25. `dsh-base` insert `id: hmr` / `@deepseek-ai/dsh-hmr`，`disabled: !!js "!ctx.get('profileContext')"`，`config.root: []`（只看文件、不重载模块）。[E: packages/bundle/base/cordis.patch.yml:28] web **不** overlay 这一行，因此带 `profileContext` 的 web 进程启用 profile 热更新。headless / sdk / acp 把 `hmr` 写成 `disabled: true`。[E: packages/bundle/headless/cordis.patch.yml:33] [E: packages/bundle/sdk-app/cordis.patch.yml:24] [E: packages/bundle/acp-app/cordis.patch.yml:23] launcher **不再**按 `patchReload` 另装 watcher（`ProfileTemplate` 已无该字段）。[E: packages/boot/app-boot/src/profile.ts:43]
26. `client-hmr` 是 web-app 始终 insert 的另一条行，空闲直到 `pnpm run dev:web` 改写 client bundle。[E: packages/bundle/web-app/cordis.patch.yml:196]

### 8. Waterfall 必须 `next()`

Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层；不调用就停在本层，内建行为也不会跑。注册本身走 `fiber.effect`，卸 fiber 即卸监听。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:256]

对本页最直接的一条是 Loader 的 `internal/update`：

| 事件 | 谁注册 | 默认 `next()` | 不调用 `next()` |
|---|---|---|---|
| `internal/update` | `Fiber.update` 发起；Loader persist 钩子 | innermost 是 `restart()` [E: vendor/cordis/src/fiber.ts:748] | 插件不重启；persist 钩子若自己不 `await next()`，后续钩子与 restart 都停 |
| `system-prompt/assemble` / `tools/pre-execute` / `agent/pre-step` | 树 settle **之后**的 host / scoped 插件 | 当前装配 / allow / enter | 后续 listener 与内建行为都看不到本层之后的变换 |

`applyEntryPatches` **不是** waterfall：它是一次 flatten 的同步循环。不要把「后层整键覆盖」写成 `next()`。

### 9. isolate / `leakedServices`（boot 之后、preset 之时）

27. `boot` 不跑 `leakedServices`。它只保证 `cordis:group` 能按名加载，让以后的 preset 行可以写 `isolate: { …: true }`。
28. Web 的 `dsh-web-app` `insert` `id: agent-preset-registry` / `default: standard`；五个 shipped profile 里**只有 web** 挂 roster，并且只有 web 的 `dsh.bundle.patch` 列表叠上四个 `preset-*` 声明。[E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/cordis.patch.yml:562] [E: packages/bundle/web-app/package.json:43] headless 的 `insert` 只有 `headless-startup` / `headless-runner`，**没有** registry，也 **没有** preset 文件。[E: packages/bundle/headless/cordis.patch.yml:21] [E: packages/bundle/headless/cordis.patch.yml:25] sdk overlay 是 `sdk-app-startup` + `sdk-jsonrpc-server`。[E: packages/bundle/sdk-app/cordis.patch.yml:13] [E: packages/bundle/sdk-app/cordis.patch.yml:18] acp overlay 是 `acp-app-startup` + `acp`。[E: packages/bundle/acp-app/cordis.patch.yml:13] [E: packages/bundle/acp-app/cordis.patch.yml:16]
29. 会话 `setup` 里 `mountPreset` 扫 standing 子树：若 preset 行把 service publish 进 **root realm**，`leakedServices` 收集那些名字并抛。[E: packages/preset/agent-preset-registry/src/mount.ts:86] [E: packages/preset/agent-preset-registry/src/mount.ts:267]
30. shipped `standard` 对需要每会话私有实例的行就是这样写的，例如 `isolate: { planMode: true }`。[E: packages/bundle/web-app/presets/standard.patch.yml:45] 只往 host `ctx.tools` 注册、自己不 `provide` 进 root 的工具行不必 isolate。`dsh-base` **没有** `subagent-codex` / `subagent-claude-code` 行。[E: packages/bundle/base/tests/base.spec.ts:42]

## 设计动机

DSH 的产品单元是组合树，不是写死的 coding-agent 主循环。有效树不是一份手写的大 `cordis.yml`，而是 `[]` 上按 bundles → profile patch → home patch → `--patch` → telemetry overlay 做一次 `applyEntryPatches`。`config` 整键替换，所以 mode bundle 必须重述它改的那一行的全部键；跨 mode 会变的值不准放进 `dsh-base`。一个 bundle 可以用 patch **列表**把声明式 preset 叠在同一层（web-app），其它 profile 的模板根本不列那些文件。

installation-first 保证 `@deepseek-ai/dsh-base` 等 in-box 包永远来自当前安装；profile `node_modules` 只承载 out-of-tree 插件。未知名拒绝自动 init，避免把随便一个 typo 做成「残缺 web」。单个 bundle 解析失败记 `skippedBundles` 而不是整次 load 炸掉，让 plugin manager 仍能对着其余层工作。

dump 看文件真树，boot 看 `readProfilePatches` 真树。`dsh --profile web --dump-config` 与 boot 共用 parser / `applyEntryPatches` / 空根，但看不到 telemetry hard-disable。

`model-visible ⟺ logged` 不在本包落地：boot 只交出 host `Context`。Web 把模型可见 tool 行 `disabled: true` 再挂 registry + 四个声明；真正进模型的内容必须能从 session log 的 `deriveMessages()` 重建。

## Gotcha

- **五个 shipped CLI 模板，desktop 不是第六个。** `PROFILE_TEMPLATES` 的键是 `acp` / `web` / `headless` / `sdk` / `sdk-minimal`。`OPTIONAL_BUNDLES` 是安装可选、默认关掉的 experimental bundle，由 plugin manager 列出，不进模板。`tui` 是自定义 profile 示例。
- **`sdk-minimal` 不叠 `dsh-base`。** 其它四个模板都是 base + mode bundle。
- **四个 shipped preset 只叠在 `dsh-web-app`。** headless / sdk / acp / sdk-minimal 的 `dsh.bundle.patch` 没有 `presets/*.patch.yml`。
- **未知名不会 `initProfile`。** `loadProfile('custom')` 在目录不存在时直接抛，不会先建再 fail。
- **缺 `dsh.bundle` 对该包 skip，不是整次 load 抛。** 把普通 npm 包写进 `dsh.profile.bundles` 会进 `skippedBundles`；其余层继续。profile manifest 与用户 patch 错误仍会让启动失败。
- **用户层缺文件 ≠ overlay 缺文件。** profile / home 的 `cordis.patch.yml` 走 optional（ENOENT = 无层）；`--patch` 与 bundle 自己的 patch 走 `loadOverlayPatches`（ENOENT 抛）。
- **dump 少 telemetry 那一刀。** 对齐 boot 真树还得读 `readProfilePatches`，不能只信 `--dump-config` 输出。`--dump-config` 本身仍存在。
- **不要手改 `cordis.yml`。** 它每次 boot 被写成 `[]`。用户改动写 `cordis.patch.yml`。
- **整键覆盖。** 后层只写 `{ mode: 'ptc' }` 会抹掉前层同 id 行的其它 `config` 键。web-app 重述 `system-prompt` 的 `personaPrefix` / `personaSuffix` 就是这个合同。
- **`!!js` 在 dump 里是字面量。** `renderConfigDump` 打印 `{ __jsExpr: '…' }` 对应的 `!!js` 标量，不求值。
- **isolate 不是 boot 的审计。** 漏写 `isolate` 的 preset 服务会在 `mountPreset` 被拒，表现为 create Agent 失败回滚，而不是 `boot()` 抛错。
- **分层 `.env` 先校验再物化。** 任一发现到的文件带 bootstrap-only 名，整次 launch 抛错。[E: packages/boot/app-boot/src/index.ts:214]
- **现行 `headless` 不含 `dsh-web-app`。** 旧三元组只在 `normalizeShippedProfile` 里被改写。
- **HMR 三件事不要混。** base 的 `hmr` 行（有 `profileContext` 才启用）、web 的 `client-hmr`、headless/sdk/acp 把 `hmr` `disabled: true`。

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合行 |
|---|---|---|
| **Definition** | vendored Cordis `Context` / `Loader` / `Include`；`Profile` / `DshBundleManifest`（`dsh.bundle.patch`、`dsh.profile.bundles`） | 根行 `id: include` / `name: cordis:include`；`ctx.dshHomePath`；`ctx.loader` [E: packages/boot/app-boot/src/index.ts:575] |
| **Provider** | `@deepseek-ai/dsh-app-boot`：`loadProfile` + `composeEntries` + `boot`；`readProfilePatches` 补 telemetry | `prepare` 里 `ctx.profileContext`、`ctx.launchEnvironment`、`ctx.cmdlineArgs`、`ctx.appExit` |
| **Consumer** | `runProfile` / `runDumpConfig` / `runPlugin`；`dsh-base` 第一条 insert；`dsh-web-app` 的 `agent-preset-registry` + 四个 `preset-*`；`mountPreset` 消费 `cordis:group` builtin 做 isolate | web：`id: agent-preset-registry` `default: standard` [E: packages/bundle/web-app/cordis.patch.yml:562]；headless / sdk / acp：无 roster，工具留在 host 全局层 |

换 profile 模板 = 换 `PROFILE_TEMPLATES` 的第二层 bundle（或 `sdk-minimal` 的单层），不是换 `boot`。换 bundle 行表不会改 Definition；Consumer 仍只看见 settle 后的 `ctx`。`OPTIONAL_BUNDLES` 换的是 plugin manager 提供的可选层，不是 CLI 模板。

## Sources

- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/profile-context.ts
- packages/boot/app-boot/package.json
- packages/boot/app-boot/tests/profile.spec.ts
- packages/boot/app-boot/tests/config-dump.spec.ts
- packages/boot/app-boot/tests/app-boot.spec.ts
- apps/cli/src/profile-boot.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/plugin.ts
- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/tests/args.spec.ts
- packages/bundle/base/package.json
- packages/bundle/web-app/package.json
- packages/bundle/headless/package.json
- packages/bundle/sdk-app/package.json
- packages/bundle/sdk-minimal/package.json
- packages/bundle/acp-app/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- packages/boot/cmdline/src/index.ts
- packages/boot/plugin-manager/src/index.ts
- packages/util/home-paths/src/index.ts
- packages/util/package-manifest/src/types.ts
- packages/preset/agent-preset-registry/src/mount.ts
- vendor/include/src/index.ts
- vendor/loader/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 端到端层序与 host / preset 切开。
- [subsys.composition.cmdline](./cmdline.md) — `provideCmdline` / `parseCmdline`；launcher 只吃 `--profile` / `--patch` / dump。
- [subsys.composition.bundle-base](./bundle-base.md) — 每个 base-backed profile 的第一层 insert：共享核心与 subagent backends。
- [spine.overview](../../spine/overview.md) — Cordis 组合运行时全仓地图。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 与 isolate 门。
- [surface.cli.overview](../../surface/cli/overview.md) — `parseDshArgs` 旗标与 positional profile。
- [surface.cli.plugin](../../surface/cli/plugin.md) — `dsh plugin` 对无模板名走 `DEFAULT_PROFILE_BUNDLES`。
- [surface.profiles.web](../../surface/profiles/web.md) — shipped `web` host 行与 startup 旗标。
- [surface.profiles.headless](../../surface/profiles/headless.md) — shipped `headless`：无 roster、无 webserver。
- [surface.profiles.sdk](../../surface/profiles/sdk.md) — shipped `sdk` JSON-RPC 面。
- [surface.profiles.sdk-minimal](../../surface/profiles/sdk-minimal.md) — 不叠 `dsh-base` 的最小 SDK 面。
- [surface.profiles.acp](../../surface/profiles/acp.md) — shipped `acp` 自动化面。
- [subsys.composition.bundle-web-app](./bundle-web-app.md) — 叠在 base 上的 host UI 层；模型可见行 `disabled: true`；四份 preset patch。
- [subsys.composition.bundle-headless](./bundle-headless.md) — 只插 runner；工具留在 host 全局层。
- [subsys.composition.bundle-sdk-app](./bundle-sdk-app.md) — JSON-RPC overlay。
- [subsys.composition.bundle-sdk-minimal](./bundle-sdk-minimal.md) — 完整 insert，不叠 base。
- [subsys.composition.bundle-acp-app](./bundle-acp-app.md) — ACP overlay。
- [subsys.composition.agent-presets](./agent-presets.md) — 声明行登记、revision bind、`leakedServices`、会话 header 的 `agentPreset`。
