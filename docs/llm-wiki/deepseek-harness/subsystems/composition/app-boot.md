---
id: subsys.composition.app-boot
title: app-boot 与 profile 发现
kind: subsystem
tier: T2
pkg: composition
source:
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/package.json
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/boot/app-boot/tests/config-dump.spec.ts
  - packages/boot/app-boot/tests/app-boot.spec.ts
  - packages/boot/app-boot/tests/user-patches.spec.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/plugin.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/telemetry-switch.spec.ts
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/cmdline/src/index.ts
  - packages/util/home-paths/src/index.ts
  - packages/util/launch-environment/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - vendor/include/src/index.ts
  - vendor/loader/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
symbols:
  - boot
  - loadProfile
  - composeEntries
  - initProfile
  - PROFILE_TEMPLATES
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
  - subsys.composition.bundle-web-app
  - subsys.composition.bundle-headless
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-app-boot` 是 Cordis 组合运行时的 **profile 发现与 Loader 启动胶**：把 `$DSH_HOME/profiles/<name>` 的 `dsh.profile.bundles` 叠成空根上的入口表，再 `boot` 出进程级 host 面。它不实现 turn、不注册模型可见工具、不 `mountPreset`；主线仍是 `profile → bundle → agent preset`，能力缝是 `Definition / Provider / Consumer`。

## 能回答的问题

- `dsh web` / `dsh --profile headless` 怎样变成一次 `boot`？`PROFILE_TEMPLATES` 到底有几个 shipped 名？
- `loadProfile` 为什么 installation-first？缺 `dsh.bundle.patch`、未知 profile 名各怎样 fail-loud？
- `composeEntries` 与 launcher 本地 `composeProfile`（**未导出**）差哪几刀？`dsh --dump-config` 为什么看不到 shipped preset `roots` 和 telemetry 开关？
- 空的 `cordis.yml` 为什么每次被重写成 `[]`？Loader write-back 不调用 waterfall `next()` 会怎样？
- `boot` 在挂任何树行之前 `provide` 什么？`isolate` / `leakedServices` 是本包的门还是 preset 的门？

## 职责边界

本包拥有：profile 目录解析与 `initProfile`、installation-first 的 bundle 解析、`composeEntries`（空根上一次 `applyEntryPatches`）、`boot` / `mountRootInclude` / fail-loud 审计、分层 `.env` 快照、用户层 `watchUserPatches`、以及离线 `renderConfigDump`。

本包**不**拥有：

- launcher 旗标边界与 `ctx.cmdlineArgs` / `ctx.appExit` —— [subsys.composition.cmdline](./cmdline.md)
- `dsh-base` / `dsh-web-app` / `dsh-headless` 的行表 —— [subsys.composition.bundle-base](./bundle-base.md) / [subsys.composition.bundle-web-app](./bundle-web-app.md) / [subsys.composition.bundle-headless](./bundle-headless.md)
- preset 发现、standing mount、`leakedServices` 审计 —— [subsys.composition.agent-presets](./agent-presets.md)
- 端到端 `profile → bundle → preset` 走读 —— [spine.composition-boot](../../spine/composition-boot.md)
- Agent / inbox / session log（`model-visible ⟺ logged` 从 `Session.deriveMessages()` 起算，不从 Loader 入口表起算）

**host 面 vs agent-preset 面。** `boot` 只 settle 进程级 host 面：webserver / persistence / sandbox / subagent **backends** / 注册表。agent-preset 面（每会话 tools / persona / isolate）要等组合里已经有 `agent-presets` 行，再由 factory `setup` 去 `mountPreset`。默认产品路径是本地 Web GUI（`dsh web`）；`PROFILE_TEMPLATES` 没有 `tui`，本仓也没有 shipped TUI 包。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/boot/app-boot/src/profile.ts` | `PROFILE_TEMPLATES` / `DEFAULT_PROFILE_BUNDLES` / `loadProfile` / `composeEntries` / `healProfilesModuleFallback` |
| `packages/boot/app-boot/src/index.ts` | `boot` / `mountRootInclude` / `loadLayeredEnv` / `loadOptionalPatches` / `loadOverlayPatches` / `renderConfigDump` / `installFailLoud` |
| `apps/cli/src/profile-boot.ts` | launcher 本地 `composeProfile`（未导出）、空根重写、shipped preset `roots`、telemetry 开关、watch-only HMR |
| `apps/cli/src/dump-config.ts` | `runDumpConfig`：文件层 dump，不含 launcher 后两刀 |
| `apps/cli/src/plugin.ts` | 未知名走 `DEFAULT_PROFILE_BUNDLES`，不走模板 |
| `packages/bundle/base/package.json` | in-box bundle 的 `dsh.bundle.patch = ./cordis.patch.yml` |
| `vendor/include/src/index.ts` | `applyEntryPatches`：同 id 的 `config` 整键覆盖；`Include.write` 把当前树烤回文件 |
| `vendor/loader/src/index.ts` | `internal/update` waterfall 里 `await next()` 之后 `tree.write()` |
| `vendor/cordis/src/events.ts` | `Events.waterfall`：不调用 `next()` 就不 `shift` |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `PROFILE_TEMPLATES` | `profile.ts` | 仅 `web` / `headless` 两个键。`web` = `dsh-base` + `dsh-web-app`；`headless` = `dsh-base` + `dsh-headless`。[E: packages/boot/app-boot/src/profile.ts:114] [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] |
| `DEFAULT_PROFILE_BUNDLES` | `profile.ts` | `['@deepseek-ai/dsh-base']`。`dsh plugin` 对无模板名用这份，不会偷偷当成 web。[E: packages/boot/app-boot/src/profile.ts:125] [E: apps/cli/src/plugin.ts:123] |
| `Profile` / `ProfileLayer` | `loadProfile` 返回值 | `layers` 按 `dsh.profile.bundles` 顺序；`patches` 是 profile 自己的 `cordis.patch.yml`（缺文件 = `[]`）。 |
| `INSTALLATION_OWNED_PROFILE_TUPLES` | `normalizeShippedProfile` | 恰好等于旧三元组 `base + web-app + headless` 的 `headless` manifest 被写成现行二元组；带额外 custom bundle 的列表视为用户所有，不动。[E: packages/boot/app-boot/src/profile.ts:121] [E: packages/boot/app-boot/tests/profile.spec.ts:178] |
| `PatchOptions` | `vendor/include` | `id` / `insert` / `config` / `disabled` / `isolate` …；`config` 赋值是整键替换。[E: vendor/include/src/index.ts:123] |
| `PROFILE_ROOT_CONFIG` | launcher | 正文就是空数组 `[]`。Loader 需要真实 include 根来锚定 `baseUrl`，但文件本身不是手写大树。[E: apps/cli/src/profile-boot.ts:63] |
| `LaunchEnvironmentSnapshot` | `ctx.launchEnvironment` | `loadLayeredEnv` 冻结的 inherited > 调用目录 `.env` > `$DSH_HOME/.env`；`DSH_*` 等 bootstrap-only 名禁止出现在发现到的文件里。[E: packages/util/launch-environment/src/index.ts:106] [E: packages/boot/app-boot/src/index.ts:157] |

`dsh.bundle.patch` 是 bundle 包必须声明的相对路径。`@deepseek-ai/dsh-base` / `dsh-web-app` / `dsh-headless` 都是 `./cordis.patch.yml`。[E: packages/bundle/base/package.json:38] [E: packages/bundle/web-app/package.json:43] [E: packages/bundle/headless/package.json:43]

## 控制流

### 1. 入口切到 profile 模式

1. `parseDshArgs@apps/cli/src/args.ts` 只吃 launcher 旗标。`dsh web` 硬编码 `profile: 'web'`，与 `dsh --profile web` 同一条 `mode: 'profile'`。[E: apps/cli/src/args.ts:168] [E: apps/cli/tests/args.spec.ts:28]
2. `bin` switch@apps/cli/src/bin.ts：`profile` → `runProfile`（先 `loadLayeredEnv('dsh')`）；`dump-config` → `runDumpConfig`（**不** `boot`）；`plugin` → `runPlugin`。[E: apps/cli/src/bin.ts:31] [E: apps/cli/src/bin.ts:33] [E: apps/cli/src/bin.ts:45]
3. help 里的 `dsh --profile tui` 写的是「boot a custom profile」，不是 shipped 模板。[E: apps/cli/src/args.ts:68] `parse(['--profile', 'tui'])` 只是把任意名字送进 `mode: 'profile'`。[E: apps/cli/tests/args.spec.ts:25]

### 2. `prepareProfile`：heal、发现、空根重写

4. `prepareProfile@apps/cli/src/profile-boot.ts` 先 `healProfilesModuleFallback(INSTALL_ANCHOR)`：把安装树依赖闭包扁平 symlink 到 `$DSH_HOME/profiles/node_modules`，让任意 profile 的 parent-walk 都能 `import` in-box 名。[E: apps/cli/src/profile-boot.ts:99] [E: packages/boot/app-boot/src/profile.ts:223]
5. 再 `loadProfile('dsh', name, INSTALL_ANCHOR, …)`。[E: apps/cli/src/profile-boot.ts:100]
6. **每次** `writeFileSync(…, PROFILE_ROOT_CONFIG)`，把 `$DSH_HOME/profiles/<name>/cordis.yml` 重写成空数组。[E: apps/cli/src/profile-boot.ts:101] [E: apps/cli/src/profile-boot.ts:63]
7. 重写原因在 Loader：插件 `Fiber.update` 走 `internal/update` waterfall，innermost `next` 才是 `restart`。[E: vendor/cordis/src/fiber.ts:748] Loader 的 persist 钩子 `await next()` 之后调用 `this.entry.parent.tree.write()`；自处置路径也会 `tree.write()`。[E: vendor/loader/src/index.ts:105] [E: vendor/loader/src/index.ts:108] [E: vendor/loader/src/index.ts:156] `Include.write` 把 `this.root.data` 烤进那个 `cordis.yml`。[E: vendor/include/src/index.ts:373] 若不每次清空，下次 `boot` 会在已烤进行上再跑一遍 bundle `insert`，根 insert 翻倍。

### 3. `loadProfile`：installation-first，未知名不自动 init

8. `resolveProfileDir` 拼 `$DSH_HOME/profiles/<name>`；空名、`.` / `..`、带斜杠、名为 `node_modules` 都抛 `invalid profile name`。[E: packages/boot/app-boot/src/profile.ts:105] [E: packages/boot/app-boot/src/profile.ts:107]
9. 目录里还没有 `package.json` 时：仅当 `name` 落在 `PROFILE_TEMPLATES` 才 `initProfile(dir, template)`；否则抛 `does not exist; create it with 'dsh plugin --profile … add'`。[E: packages/boot/app-boot/src/profile.ts:376] [E: packages/boot/app-boot/src/profile.ts:378] [E: packages/boot/app-boot/src/profile.ts:383] 测试钉死 `custom` 不会被创建。[E: packages/boot/app-boot/tests/profile.spec.ts:150] `web` 会按模板写出 bundles。[E: packages/boot/app-boot/tests/profile.spec.ts:161]
10. `resolveBundleDir` 的锚点顺序是 `[installAnchor, profileDir/package.json]`：in-box bundle 永远来自正在跑的这份 dsh，不是 profile-local 副本。[E: packages/boot/app-boot/src/profile.ts:347]
11. 每个 listed bundle 必须在自己的 `package.json` 声明 `dsh.bundle.patch`。`declared === undefined` 抛 `declares no dsh.bundle`——「点了名却不是 bundle」是误配置，不是「无 patch」。[E: packages/boot/app-boot/src/profile.ts:392] [E: packages/boot/app-boot/src/profile.ts:393] [E: packages/boot/app-boot/tests/profile.spec.ts:196]
12. profile 自己的 `cordis.patch.yml`：`userLayer !== false` 且文件存在才 `loadOverlayPatches`；缺文件得到 `[]`，不抛。[E: packages/boot/app-boot/src/profile.ts:399]

### 4. `composeEntries`：从 `[]` 一次 flatten

13. `composeEntries@packages/boot/app-boot/src/profile.ts` 的第一参是空数组，第二参是 `structuredClone(layers.flat())`，只调用**一次** `applyEntryPatches`。[E: packages/boot/app-boot/src/profile.ts:416] dump / boot 共用这一次调用，避免「按层重建 id 索引」让后层改到 group `config` 替换才出现的孩子——那种树真实 `boot` 挂不上。[E: packages/boot/app-boot/tests/config-dump.spec.ts:128]
14. `applyEntryPatches`：无 `id` 的 `insert` 追加到根；刚插入的行立刻 `buildMap`，同一 flattened 列表里后写的 patch 可以改刚插的行；匹配不到只 `warn`，不抛。[E: vendor/include/src/index.ts:94] [E: vendor/include/src/index.ts:101] [E: vendor/include/src/index.ts:112]
15. 同 id 的 `config` / `disabled` **整键覆盖**（`target[key] = value`），不是 deep-merge。测试：后层 `{ a: 2 }` 赢，缺行 `"missing"` 进 warn。[E: vendor/include/src/index.ts:123] [E: packages/boot/app-boot/tests/profile.spec.ts:207] [E: packages/boot/app-boot/tests/profile.spec.ts:208]

### 5. launcher 本地 `composeProfile`（未导出）与 dump 的两刀差

16. `composeProfile@apps/cli/src/profile-boot.ts` 是 `function`，没有 `export`。`dsh-app-boot` 导出的是 `composeEntries` / `loadProfile` / `initProfile`；launcher 导出的是 `runProfile` / `prepareProfile`。[E: apps/cli/src/profile-boot.ts:142]
17. 层序：`bundlePatches → profile.patches → homePatches → overlays`。home 层是 `$DSH_HOME/cordis.patch.yml`（`loadOptionalPatches`：缺文件 = 无层）。`--patch` 走 `loadOverlayPatches`：**缺文件抛错**。[E: apps/cli/src/profile-boot.ts:147] [E: apps/cli/src/profile-boot.ts:148] [E: apps/cli/src/profile-boot.ts:151] [E: packages/boot/app-boot/tests/app-boot.spec.ts:534]
18. 先用这四层 `composeEntries` 建 `rows` 索引。若已有 `agent-presets` 行，再 push 一条 overlay，把 `apps/cli/config/agent-presets/` 写成 `trust: 'system'` 的 shipped `roots`（整键重述该行 `config`）。[E: apps/cli/src/profile-boot.ts:159] [E: apps/cli/src/profile-boot.ts:164]
19. 若 `DSH_TELEMETRY_DISABLED` 非空且存在 `session-telemetry-otel` 行，再 push `{ id, disabled: true }`。`'0'` / `'false'` 也关——隐私开关偏 off-by-mistake。[E: apps/cli/src/profile-boot.ts:168] [E: apps/cli/tests/telemetry-switch.spec.ts:12]
20. `runDumpConfig@apps/cli/src/dump-config.ts` 只把「每个 bundle 一层 +（非 `--dump-default-config` 时）profile 用户层 + home 层 + 每个 `--patch`」交给 `renderConfigDump`，锚在同一份空 `cordis.yml` 上，**不求值 `!!js`**。[E: apps/cli/src/dump-config.ts:32] [E: apps/cli/src/dump-config.ts:51] [E: packages/boot/app-boot/tests/config-dump.spec.ts:80] dump **不含** shipped preset `roots` 与 telemetry hard-disable：它从不读 `SHIPPED_PRESET_ROOT`，也不调用 `resolveTelemetryPatch`。

### 6. `boot`：空 `cordis.yml` + 整叠 patches

21. `runProfile` 调 `boot(NAME, rootConfig, structuredClone(allPatches(composed)), prepare)`。[E: apps/cli/src/profile-boot.ts:248]
22. `boot@packages/boot/app-boot/src/index.ts`：`new Context()` → `ctx.provide('dshHomePath', dshHomePath)` → `ctx.plugin(Loader)` → `prepare?.(ctx)` → `mountRootInclude`。[E: packages/boot/app-boot/src/index.ts:764] [E: packages/boot/app-boot/src/index.ts:770] [E: packages/boot/app-boot/src/index.ts:771] [E: packages/boot/app-boot/src/index.ts:774] 测试用 `!!js dshHomePath('sessions')` 钉死这个 provide。[E: packages/boot/app-boot/tests/app-boot.spec.ts:682]
23. `prepare` 在任何 config 行挂上之前：`provide('launchEnvironment', …)` 与 `provideCmdline`（`ctx.cmdlineArgs` + `ctx.appExit`）。[E: apps/cli/src/profile-boot.ts:252] [E: apps/cli/src/profile-boot.ts:255] [E: packages/boot/cmdline/src/index.ts:70] Home 取非空 `$DSH_HOME`，否则 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:89]
24. `mountRootInclude` 钉死根行 `id: 'include'` / `name: 'cordis:include'`，`config.path` 指向那份空 `cordis.yml`，`config.patches` 是整叠 overlays。[E: packages/boot/app-boot/src/index.ts:519] [E: packages/boot/app-boot/src/index.ts:520] 同时注册 `ctx.loader.builtins.group = Group`，让 `cordis:group` 不依赖 included 树自己的 specifier 解析——isolate realm 靠 group 行把 Provider 与 Consumer 关进同一份私有符号表。[E: packages/boot/app-boot/src/index.ts:510]
25. 树 settle 后 `assertEntriesActivated`：enabled 且非 `ACTIVE` 的行 fail-closed（`FAILED` 带原 stack；`PENDING` 点名缺的 service）。`prepare` 抛错标 `host preparation failed` 并 `dispose` 半棵树；之后的失败标 `plugin tree failed to load`。[E: packages/boot/app-boot/src/index.ts:723] [E: packages/boot/app-boot/src/index.ts:767] `installFailLoud` 把后续 unhandledRejection 收成一行 stderr + `exit(1)`。[E: packages/boot/app-boot/src/index.ts:622] [E: packages/boot/app-boot/src/index.ts:624]

### 7. 用户层热更新（仍是 host 面）

26. web-app 把共享 `hmr` 行 `disabled: true`。[E: packages/bundle/web-app/cordis.patch.yml:23] 组合若没留下 HMR，launcher 先保证 `timer`，再 `loader.create({ name: '@deepseek-ai/cordis-plugin-hmr', config: { root: [] } })`——只看文件、不重载模块。[E: apps/cli/src/profile-boot.ts:283]
27. 两个 `watchUserPatches` 分别盯 profile `cordis.patch.yml` 与 home `cordis.patch.yml`。`composeLive` 仍是「bundle 在下、overlays 在上」，用户编辑挤不走 shipped 层；每次 `structuredClone`，避免 include 按引用推进 `insert` 行后把用户覆盖烤进 bundle 内存对象。[E: apps/cli/src/profile-boot.ts:240]

### 8. Waterfall 必须 `next()`

Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层；不调用就停在本层，内建行为也不会跑。注册本身走 `fiber.effect`，卸 fiber 即卸监听。[E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:256]

对本页最直接的一条是 Loader 的 `internal/update`：

| 事件 | 谁注册 | 默认 `next()` | 不调用 `next()` |
|---|---|---|---|
| `internal/update` | `Fiber.update` 发起；Loader persist 钩子 `prepend` | innermost 是 `restart()` [E: vendor/cordis/src/fiber.ts:748] | 插件不重启；persist 钩子若自己不 `await next()`，后续钩子与 restart 都停 [E: vendor/loader/src/index.ts:105] |
| `system-prompt/assemble` / `tools/pre-execute` / `agent/pre-step` | 树 settle **之后**的 host / scoped 插件 | 当前装配 / allow / enter | 后续 listener 与内建行为都看不到本层之后的变换 |

`applyEntryPatches` **不是** waterfall：它是一次 flatten 的同步循环。不要把「后层整键覆盖」写成 `next()`。

### 9. isolate / `leakedServices`（boot 之后、preset 之时）

28. `boot` 不跑 `leakedServices`。它只保证 `cordis:group` 能按名加载，让以后的 preset 行可以写 `isolate: { …: true }`。
29. Web 的 `dsh-web-app` `insert` `id: agent-presets` / `default: standard`；headless 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`，**没有** `agent-presets`，工具留在 host 全局层。[E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:31]
30. 会话 `setup` 里 `mountPreset` 扫 standing 子树：若 preset 行把 service publish 进 **root realm**，`leakedServices` 收集那些名字并抛——必须坐进 `isolate` realm，或把服务搬到 host 组合。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365]
31. shipped `standard` 对需要每会话私有实例的行就是这样写的，例如 `isolate: { planMode: true }`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:107] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] 只往 host `ctx.tools` 注册、自己不 `provide` 进 root 的工具行不必 isolate。`dsh-base` **没有** `subagent-codex` / `subagent-claude-code` 行——那不是「装了但 dormant」，而是根本不在这份 host 组合里。

## 设计动机

DSH 的产品单元是组合树，不是写死的 coding-agent 主循环。有效树不是一份手写的大 `cordis.yml`，而是 `[]` 上按 bundles → profile patch → home patch → `--patch` → launcher overlay 做一次 `applyEntryPatches`。`config` 整键替换，所以 mode bundle 必须重述它改的那一行的全部键；跨 mode 会变的值不准放进 `dsh-base`。

installation-first 保证 `@deepseek-ai/dsh-base` 等 in-box 包永远来自当前安装；profile `node_modules` 只承载 out-of-tree 插件。未知名拒绝自动 init，避免把随便一个 typo 做成「残缺 web」。

dump 看文件真树，boot 看 launcher 真树。`dsh --profile web --dump-config` 与 boot 共用 parser / `applyEntryPatches` / 空根，但看不到 shipped `roots` 与 telemetry hard-disable——那两刀只活在未导出的 `composeProfile` 后半段。

`model-visible ⟺ logged` 不在本包落地：boot 只交出 host `Context`。Web 把模型可见 tool 行 `disabled: true` 再挂 roster；真正进模型的内容必须能从 session log 的 `deriveMessages()` 重建。

## Gotcha

- **只有两个 shipped 模板。** `PROFILE_TEMPLATES` 的键是 `web` 与 `headless`。`tui` 是自定义 profile 示例；`dsh plugin --profile tui add …` 只会用 `DEFAULT_PROFILE_BUNDLES` 写出一份只含 `dsh-base` 的 manifest。
- **未知名不会 `initProfile`。** `loadProfile('custom')` 在目录不存在时直接抛，不会先建再 fail。
- **缺 `dsh.bundle.patch` fail-loud。** 把普通 npm 包写进 `dsh.profile.bundles` 会在 load 时炸掉，不是静默空层。
- **用户层缺文件 ≠ overlay 缺文件。** profile / home 的 `cordis.patch.yml` 走 `loadOptionalPatches`（ENOENT = 无层）；`--patch` 与 bundle 自己的 patch 走 `loadOverlayPatches`（ENOENT 抛）。
- **dump 少两刀。** 对齐 boot 真树还得读 `composeProfile` 的 shipped `roots` 与 `resolveTelemetryPatch`，不能只信 `--dump-config` 输出。
- **不要手改 `cordis.yml`。** 它每次 boot 被写成 `[]`。用户改动写 `cordis.patch.yml`。Loader persist 钩子若忘了 `next()`，热更新既不 restart 也不按预期 write-back。
- **整键覆盖。** 后层只写 `{ mode: 'code' }` 会抹掉前层同 id 行的其它 `config` 键。web-app 重述 `system-prompt.persona` 就是这个合同。
- **`!!js` 在 dump 里是字面量。** `renderConfigDump` 打印 `{ __jsExpr: '…' }` 对应的 `!!js` 标量，不求值。求值发生在 Loader 对**已挂上**的行做 interpolate 时，且能看见 `dshHomePath` / `cmdlineArgs` 等 prepare 提供的键。
- **isolate 不是 boot 的审计。** 漏写 `isolate` 的 preset 服务会在 `mountPreset` 被拒，表现为 create Agent 失败回滚，而不是 `boot()` 抛错。
- **分层 `.env` 先校验再物化。** 任一发现到的文件带 `DSH_*` / `PATH` / `HTTPS_PROXY` 等 bootstrap-only 名，整次 launch 抛错，已解析的其它键也不会写进 `process.env`。[E: packages/boot/app-boot/tests/app-boot.spec.ts:143]

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合行 |
|---|---|---|
| **Definition** | vendored Cordis `Context` / `Loader` / `Include`；`Profile` / `DshBundleManifest`（`dsh.bundle.patch`、`dsh.profile.bundles`） | 根行 `id: include` / `name: cordis:include`；`ctx.dshHomePath`；`ctx.loader` [E: packages/boot/app-boot/src/index.ts:519] |
| **Provider** | `@deepseek-ai/dsh-app-boot`：`loadProfile` + `composeEntries` + `boot`；launcher 本地 `composeProfile` 补 shipped `roots` / telemetry | `prepare` 里 `ctx.launchEnvironment`、`ctx.cmdlineArgs`、`ctx.appExit`；HMR 缺席时 watch-only `root: []` |
| **Consumer** | `runProfile` / `runDumpConfig` / `runPlugin`；`dsh-base` 第一条 insert；`dsh-web-app` 的 `agent-presets`；`mountPreset` 消费 `cordis:group` builtin 做 isolate | web：`id: agent-presets` `default: standard` [E: packages/bundle/web-app/cordis.patch.yml:424]；headless：无 roster，工具留在 host 全局层 |

换 profile 模板 = 换 `PROFILE_TEMPLATES` 的第二层 bundle（`dsh-web-app` vs `dsh-headless`），不是换 `boot`。换 bundle 行表不会改 Definition；Consumer 仍只看见 settle 后的 `ctx`。

## Sources

- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/package.json
- packages/boot/app-boot/tests/profile.spec.ts
- packages/boot/app-boot/tests/config-dump.spec.ts
- packages/boot/app-boot/tests/app-boot.spec.ts
- packages/boot/app-boot/tests/user-patches.spec.ts
- apps/cli/src/profile-boot.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/plugin.ts
- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/tests/args.spec.ts
- apps/cli/tests/telemetry-switch.spec.ts
- packages/bundle/base/package.json
- packages/bundle/web-app/package.json
- packages/bundle/headless/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/cmdline/src/index.ts
- packages/util/home-paths/src/index.ts
- packages/util/launch-environment/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- vendor/include/src/index.ts
- vendor/loader/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 端到端层序与 host / preset 切开。
- [subsys.composition.cmdline](./cmdline.md) — `provideCmdline` / `parseCmdline`；launcher 只吃 `--profile` / `--patch` / dump。
- [subsys.composition.bundle-base](./bundle-base.md) — 每个 profile 的第一层 insert：共享核心与 subagent backends。
- [spine.overview](../../spine/overview.md) — Cordis 组合运行时全仓地图。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 与 isolate 门。
- [surface.cli.overview](../../surface/cli/overview.md) — `parseDshArgs` 旗标与 `dsh web` alias。
- [surface.cli.plugin](../../surface/cli/plugin.md) — `dsh plugin` 对无模板名走 `DEFAULT_PROFILE_BUNDLES`。
- [surface.profiles.web](../../surface/profiles/web.md) — shipped `web` host 行与 startup 旗标。
- [surface.profiles.headless](../../surface/profiles/headless.md) — shipped `headless`：无 roster、无 webserver。
- [subsys.composition.bundle-web-app](./bundle-web-app.md) — 叠在 base 上的 host UI 层；模型可见行 `disabled: true`。
- [subsys.composition.bundle-headless](./bundle-headless.md) — 只插 runner；工具留在 host 全局层。
- [subsys.composition.agent-presets](./agent-presets.md) — standing mount、`leakedServices`、会话 header 的 `agentPreset`。
