---
id: spine.composition-boot
title: 组合启动(profile→bundle→preset)
kind: flow
tier: T0
pkg: composition
source:
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/profile-context.ts
  - packages/boot/app-boot/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - apps/cli/src/bin.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/dump-config-schema.ts
  - apps/cli/src/args.ts
  - apps/cli/src/plugin.ts
  - apps/cli/package.json
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/boot/app-boot/tests/config-dump.spec.ts
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/telemetry-switch.spec.ts
  - apps/cli/tests/windows-shell.spec.ts
  - apps/cli/tests/profile-hmr.spec.ts
  - packages/bundle/base/package.json
  - packages/bundle/headless/package.json
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/acp-app/package.json
  - packages/boot/cmdline/src/index.ts
  - packages/util/home-paths/src/index.ts
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/session.ts
  - packages/api/session-controller/src/agent.ts
  - packages/subagent/subagent/src/child-agent.ts
  - vendor/include/src/index.ts
  - packages/boot/config-editor/src/index.ts
  - packages/boot/plugin-manager/src/index.ts
symbols:
  - composeProfile
  - composeEntries
  - loadProfile
  - initProfile
  - prepareProfile
  - runProfile
  - PROFILE_TEMPLATES
  - OPTIONAL_BUNDLES
  - readProfilePatches
  - renderConfigDump
  - boot
  - parseDshArgs
  - applyEntryPatches
  - AgentPreset
  - AgentPresetRegistry
related:
  - spine.overview
  - subsys.composition.app-boot
  - subsys.composition.bundle-base
  - surface.presets.overview
evidence: explicit
status: verified
updated: 477b4f4205
---

> DSH 是 **Cordis 组合运行时**：一次启动把空的 Loader 入口表叠成 `profile → bundle → agent preset`。进程级 **host 面**（webserver / persistence / sandbox / subagent backends）先 settle；会话级 **agent-preset 面**（tools / persona / isolate）只在 Web 组合了 `agent-preset-registry` 时、于 Agent factory 的 `setup` 里 join。四个 shipped preset 是 `dsh-web-app` 的声明式 patch，不是已删除的 `packages/preset/agent-presets/`。模型看见的 preset 必须写进 session log（`model-visible ⟺ logged`）。没有 shipped TUI 包。入口是 `dsh <name>`（展开为 `--profile`）或 `dsh --profile web|headless|sdk|sdk-minimal|acp`（以及 `dsh plugin` 初始化的自定义名）。

## 能回答的问题

- `dsh` / `dsh web` / `dsh headless` / `dsh --profile sdk|sdk-minimal|acp` 怎样变成一次 profile boot，inner args 归谁解析？
- 空的 `$DSH_HOME/profiles/<name>/cordis.yml` 按什么层序叠成有效入口表？`composeProfile` 和 `composeEntries` 各在哪一层？
- shipped `PROFILE_TEMPLATES` 五个名字差在哪一层 bundle？谁叠 `dsh-base`？HMR 由哪一层 YAML 启用或关掉？
- Web 会话何时 `agentPresets.mount`？headless / sdk / acp 为什么不挂 roster？子代理怎么 `composeFrom`？
- `dsh --dump-config` / `--dump-default-config` / `--dump-config-schema` 看到的是哪几层？telemetry 开关会不会出现在 dump 里？

```mermaid
flowchart TD
  Argv["parseDshArgs argv"] --> Mode{invocation.mode}
  Mode -->|"dsh NAME"| Web["--profile NAME"]
  Mode -->|profile| Run["runProfile"]
  Mode -->|dump-config| Dump["runDumpConfig"]
  Mode -->|dump-config-schema| DumpSchema["runDumpConfigSchema"]
  Mode -->|plugin| Plugin["runPlugin / pnpm"]
  Web --> Run
  Run --> Env["loadLayeredEnv"]
  Env --> Proxy["installProxyFromEnvironment"]
  Proxy --> Prep["prepareProfile"]
  Prep --> Load["loadProfile"]
  Load --> Init{"package.json missing?"}
  Init -->|PROFILE_TEMPLATES| Auto["initProfile five shipped names"]
  Init -->|unknown name| Fail["throw: create with dsh plugin"]
  Load --> Stack["readProfilePatches layers"]
  Stack --> Bundles["bundle patches in dsh.profile.bundles order"]
  Stack --> User["profile cordis.patch.yml"]
  Stack --> Home["home cordis.patch.yml"]
  Stack --> Flag["--patch overlays + telemetry"]
  Flag --> Boot["boot empty cordis.yml + patches"]
  Boot --> Host["host plane"]
  Host --> Roster{"rows has agent-preset-registry?"}
  Roster -->|web only among five| Session["session-controller composeAgent"]
  Session --> Mount["AgentPresetRegistry.mount standing scope"]
  Mount --> AgentPlane["preset tools / persona / isolate"]
  Roster -->|headless sdk acp sdk-minimal| Global["tools stay on host global layer"]
  Dump --> FileLayers["renderConfigDump file layers only"]
```

## 端到端步骤

1. `parseDshArgs@apps/cli/src/args.ts` 只吃 launcher 旗标：`--profile`、`--from-default-profile`、可重复 `--patch`、`--dump-config` / `--dump-default-config` / `--dump-config-schema`。第一个它不认识的 token 起全部是 inner args，交给已 boot 的 app 自己解析（含 app 的 `-h`）。第一个不以 `-` 开头且不是 `plugin` 的 token 展开成 `--profile <name>`：`dsh web` 与 `dsh --profile web` 同一条 boot 路径，`dsh headless` 同样成立。[E: apps/cli/src/args.ts:145] [E: apps/cli/src/args.ts:201] [E: apps/cli/tests/args.spec.ts:30] [E: apps/cli/tests/args.spec.ts:43] 没有单独的 `dsh sdk` / `dsh acp` Commander 子命令；它们走同一套位置参数缩写。缺 `--profile` 且不是 `plugin`、也没有位置名则报错退出。[E: apps/cli/src/args.ts:178] `--profile desktop`（大小写不敏感）被 `rejectElectronProfile` 拒绝，不是 `PROFILE_TEMPLATES` 成员。[E: apps/cli/src/args.ts:83] [E: apps/cli/src/args.ts:85] help 里的 `--profile tui` 只是自定义 profile 示例，不是 `PROFILE_TEMPLATES` 键。[E: apps/cli/src/args.ts:96]

2. `bin` switch@apps/cli/src/bin.ts 按 `invocation.mode` 动态 import：`profile` → `runProfile`；`dump-config` → `runDumpConfig`；`dump-config-schema` → `runDumpConfigSchema`；`plugin` → `runPlugin` 后 `process.exit`。[E: apps/cli/src/bin.ts:22] [E: apps/cli/src/bin.ts:24] [E: apps/cli/src/bin.ts:40] [E: apps/cli/src/bin.ts:45] [E: apps/cli/src/bin.ts:55] profile 路径在进树之前调用 `loadLayeredEnv('dsh')`：继承环境优先，再补 invoking-directory `.env`，再补 `$DSH_HOME/.env`（不覆盖已有名）；bootstrap-only 名禁止出现在发现到的 `.env` 里（home 层 proxy 名例外）。[E: apps/cli/src/bin.ts:27] [E: packages/boot/app-boot/src/index.ts:234] [E: packages/boot/app-boot/src/index.ts:244]

3. `runProfile@apps/cli/src/profile-boot.ts` 先走模块内 `composeProfile`（**未 export**；`dsh-app-boot` 导出的是 `composeEntries` / `loadProfile` / `initProfile` / `readProfilePatches`，launcher 导出的是 `runProfile` / `prepareProfile`）。`prepareProfile` 调 `loadProfile`，并**每次**把 profile 目录里的 `cordis.yml` 重写成 `PROFILE_ROOT_CONFIG`（正文是空入口表 `[]`）——Loader 需要真实 include 根来锚定 `baseUrl`，但 vendored Loader 的 write-back 会把已叠好的行烤进该文件，下次 boot 就会把 bundle insert 再插一遍。[E: apps/cli/src/profile-boot.ts:167] [E: apps/cli/src/profile-boot.ts:171] [E: apps/cli/src/profile-boot.ts:81] `runProfile` 在 compose 之前 `installProxyFromEnvironment`（进程级 HTTP 代理库，不是 Cordis 插件）。[E: apps/cli/src/profile-boot.ts:249]

4. `loadProfile@packages/boot/app-boot/src/profile.ts` 解析 `$DSH_HOME/profiles/<name>/package.json` 的 `dsh.profile.bundles`。目录尚不存在时，仅当 `name` 落在 `PROFILE_TEMPLATES` 才 `initProfile`。五个 shipped 名：`acp` = `dsh-base` + `dsh-acp-app`；`web` = `dsh-base` + `dsh-web-app`；`headless` = `dsh-base` + `dsh-headless`；`sdk` = `dsh-base` + `dsh-sdk-app`；`sdk-minimal` = **仅** `dsh-sdk-minimal`（不叠 base）。[E: packages/boot/app-boot/src/profile.ts:179] [E: packages/boot/app-boot/src/profile.ts:192] [E: packages/boot/app-boot/tests/profile.spec.ts:351] 其它名字必须先 `dsh plugin --profile <name> add …`；`dsh plugin` 对无模板名用 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']`。[E: packages/boot/app-boot/src/profile.ts:203] [E: apps/cli/src/plugin.ts:40] 每个 bundle 必须在自己的 `package.json` 声明 `dsh.bundle.patch`（字符串或有序列表）；缺了或解析失败的名字进入 `skippedBundles`，`reportSkippedBundles` 写 stderr，不打断整次 load。[E: packages/boot/app-boot/src/profile.ts:670] [E: packages/boot/app-boot/src/profile.ts:680] [E: packages/bundle/base/package.json:33] [E: packages/bundle/web-app/package.json:43] 恰好等于旧三元组 `base + web-app + headless` 的 `headless` manifest 会被 `normalizeShippedProfile` 写成现行二元组（**现行 headless 不含 `dsh-web-app`**）；带额外 custom bundle 的列表视为用户所有，不动。[E: packages/boot/app-boot/src/profile.ts:198] [E: packages/boot/app-boot/src/profile.ts:578] bundle 解析 **installation-first，profile-second**。[E: packages/boot/app-boot/src/profile.ts:632] `OPTIONAL_BUNDLES` 三个 experimental 名字由 plugin manager 标成安装可选、默认关掉。[E: packages/boot/app-boot/src/profile.ts:213] [E: packages/boot/plugin-manager/src/index.ts:290]

5. `composeEntries@packages/boot/app-boot/src/profile.ts` 从**空数组**出发，把各层 `PatchOptions[]` flatten 成一次 `applyEntryPatches` 调用。`applyEntryPatches@vendor/include/src/index.ts` 按 id 找行：无 `id` 的 `insert` 追加到根；带 `id` 的 patch 把 `config` / `disabled` 等键**整键覆盖**（不是 deep-merge）；同一 flattened 列表里后写的 insert 立刻入索引，所以后一层可以改前一层刚插的行；匹配不到的 patch 只 warn、不抛。[E: packages/boot/app-boot/src/profile.ts:730] [E: vendor/include/src/index.ts:58] [E: vendor/include/src/index.ts:93] [E: vendor/include/src/index.ts:120]

6. `composeProfile` 的应用顺序是 `bundlePatches → profile.patches → homePatches → overlays → telemetry`。profile 层是 `$DSH_HOME/profiles/<name>/cordis.patch.yml`（缺文件 = 空层，`loadOptionalPatches`）；home 层是 `$DSH_HOME/cordis.patch.yml`，机器级、压过每个 profile 自己的层。`--patch` 文件按 argv 顺序 `loadOverlayPatches`（**缺文件抛错**）。叠完之后，若 `DSH_TELEMETRY_DISABLED` 非空且存在 `session-telemetry-otel` 行，再推 `{ id, disabled: true }`（`'0'`/`'false'` 也关）。[E: packages/boot/app-boot/src/profile-context.ts:65] [E: packages/boot/app-boot/src/profile-context.ts:54] [E: apps/cli/tests/telemetry-switch.spec.ts:11] **不再**向任何 `agent-presets` 目录注入扫描根：CLI `files` 只发布 `lib/*.js`；四个 shipped preset 是 `dsh-web-app` `dsh.bundle.patch` 列表里的 YAML。[E: apps/cli/package.json:17] [E: packages/bundle/web-app/package.json:43]

7. `runProfile` 调 `boot@packages/boot/app-boot/src/index.ts`：`new Context` → `provide('dshHomePath')` → `ctx.plugin(Loader)` → `prepare` 回调里 `provide` 冻结的 `LaunchEnvironmentSnapshot`、`PluginPackages`（`createRuntimeResolution` 的 installation/profile 表）和 `provideCmdline`（`ctx.cmdlineArgs` + `ctx.appExit`）→ 空 `cordis.yml` 加上整叠 patches。[E: apps/cli/src/profile-boot.ts:296] [E: packages/boot/app-boot/src/index.ts:972] [E: packages/boot/app-boot/src/profile.ts:430] [E: packages/boot/cmdline/src/index.ts:84] app 旗标不是 launcher 的事：`dsh web --host …` / `--no-open` 在 inner args 里。HMR 由 YAML 行拥有：base 插入 `hmr`（`root: []`，无 `profileContext` 时 disabled）；web 组合保持启用；headless / sdk-app / acp-app 把该行 `disabled: true`；sdk-minimal 树里没有 `hmr` 行。[E: packages/bundle/base/cordis.patch.yml:28] [E: packages/bundle/headless/cordis.patch.yml:33] [E: packages/bundle/sdk-app/cordis.patch.yml:24] [E: packages/bundle/acp-app/cordis.patch.yml:23] [E: apps/cli/tests/profile-hmr.spec.ts:24] [E: apps/cli/tests/profile-hmr.spec.ts:42]

8. **host 面 vs agent-preset 面在这一步切开。** `dsh-base` 用**一条**根 `insert` 放下共享核心：timer / `hmr`、`llm` 族、`session` 与 **JSONL-only** session persistence（`id: session-persistence-jsonl`；SQLite session persistence 已删除）、`sandbox` + `sandbox-policy` + `approval`、`tools` 注册表、`agent-loop`、`agent-default-model`（`provider: deepseek-official` / `model: deepseek-flash`）、`ptc-runtime`（`@deepseek-ai/dsh-ptc-runtime-node`）、shell 双栈。[E: packages/bundle/base/cordis.patch.yml:82] [E: packages/bundle/base/cordis.patch.yml:130] [E: packages/bundle/base/cordis.patch.yml:389] [E: packages/bundle/base/cordis.patch.yml:510] `dsh-web-app` 叠在 base 之后：插入 webserver / web-runtime / client roster，并把 **model-facing** 行（`tool-bash` / `tool-pwsh` / plan / subagent / compaction …）全部 `disabled: true`，再 `insert` `agent-preset-registry`（`default: standard`）。[E: packages/bundle/web-app/cordis.patch.yml:447] [E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/cordis.patch.yml:562] 权限与执行缝留在 host：`sandbox` / `approval` / `fs-sandbox` / `permission` 不被 disable。[E: apps/cli/tests/windows-shell.spec.ts:68] `dsh-headless` 只插 `headless-startup` + `headless-runner` 并关掉 `hmr`，**不**插 `agent-preset-registry`，也 **不** disable base 的工具行。[E: packages/bundle/headless/cordis.patch.yml:21] `dsh-sdk-app` 插 `sdk-app-startup` + `sdk-jsonrpc-server`，以及条件启用的 `load_workspace_dependencies`；`dsh-acp-app` 插 `acp-app-startup` + `acp`（ACP 行再写一遍 `deepseek-official` / `deepseek-v4-flash`，与 base 默认 `deepseek-flash` 不同）。[E: packages/bundle/sdk-app/cordis.patch.yml:13] [E: packages/bundle/sdk-app/cordis.patch.yml:30] [E: packages/bundle/acp-app/cordis.patch.yml:13] [E: packages/bundle/acp-app/cordis.patch.yml:20] `dsh-sdk-minimal` 的 patch 是**完整** `insert`（JSON-RPC + DeepSeek adapter + sandbox/pty/fs + `agent` / `agent-loop` 等），不叠 base 行 id。[E: packages/bundle/sdk-minimal/cordis.patch.yml:5] 五个 shipped profile 里**只有 web** 挂 roster：因为只有 `dsh-web-app` 的 `dsh.bundle.patch` 列出四份 preset 文件。[E: packages/bundle/web-app/package.json:43] [E: packages/bundle/headless/package.json:39]

9. **preset 按会话挂上（仅当 host 组合了 registry）。** Web 的 `composeAgent@packages/api/session-controller/src/agent.ts` 在 `ctx.agents.create` **之前** `presets.resolve`，把 id 写进 session header 的 `agentPreset`；真正的 `AgentPresetRegistry.mount` 发生在 factory `setup`，失败则整次 create 回滚。[E: packages/api/session-controller/src/agent.ts:381] [E: packages/api/session-controller/src/agent.ts:389] [E: packages/api/session-controller/src/agent.ts:394] `ctx.get('agentPresets') === undefined` 时 `composeAgent` 只装 model selection，工具走 host 全局层（headless / sdk / acp / sdk-minimal 默认）。[E: packages/api/session-controller/src/agent.ts:385] `mount` 对每个 preset id **single-flight 一份 standing generation**，再 `bindScopeParent` 让这个 Agent 看见那份注册。[E: packages/preset/agent-preset-registry/src/index.ts:257] [E: packages/preset/agent-preset-registry/src/index.ts:242] 声明插件是 `@deepseek-ai/dsh-agent-preset`：普通 Cordis YAML 里写 `id` + `plugins[]`，`Service.init` 里 `agentPresets.register`。[E: packages/preset/agent-preset/src/index.ts:12] [E: packages/preset/agent-preset/src/index.ts:28] 四个 shipped 行 id：`preset-standard` / `preset-ptc` / `preset-minimal` / `preset-cordis`。Web 编辑保存写 **profile user patch**（`ConfigEditor.documentPath` = `profileContext.patchPath`），按 id 覆盖该行的 `config`，不是独立 preset 目录。[E: packages/boot/config-editor/src/index.ts:34] [E: packages/boot/app-boot/src/profile-context.ts:20] Web 行只设 `default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:562]

10. `mountPreset@packages/preset/agent-preset-registry/src/mount.ts` 把声明的 `plugins[]` 当 Include 树插进 scoped context。拒绝无 scope 的 context。[E: packages/preset/agent-preset-registry/src/mount.ts:258] [E: packages/preset/agent-preset-registry/src/mount.ts:259] preset 行若把 service publish 进 **root realm**（`leakedServices` 非空），mount 抛错。[E: packages/preset/agent-preset-registry/src/mount.ts:265] [E: packages/preset/agent-preset-registry/src/mount.ts:267] 需要私有实例的行必须放进 `cordis:group` + `isolate`（`standard` 对 `planMode` / `compaction` / `workflowEngine` 就是这样）。[E: packages/bundle/web-app/presets/standard.patch.yml:45] [E: packages/bundle/web-app/presets/standard.patch.yml:66] [E: packages/bundle/web-app/presets/standard.patch.yml:83] `ptc` 额外一行 `tool-presentation` / `@deepseek-ai/dsh-agent-tool-presentation` `mode: ptc`（不是 isolate 组）；`workflow-ptc` / `tool-workflow` / `tool-ralph` 均为 `disabled: true`。[E: packages/bundle/web-app/presets/ptc.patch.yml:144] [E: packages/bundle/web-app/presets/ptc.patch.yml:147] [E: packages/bundle/web-app/presets/ptc.patch.yml:121] [E: packages/bundle/web-app/presets/ptc.patch.yml:126] [E: packages/bundle/web-app/presets/ptc.patch.yml:129] 只往 host `ctx.tools` 注册的工具行不必 isolate。`minimal` 只挂 `persistent-shell` 组（`isolate.terminals: true`）。[E: packages/bundle/web-app/presets/minimal.patch.yml:17]

11. **model-visible ⟺ logged。** 创建时 header 记下 `agentPreset`；空白窗口里换 preset 必须 append `'agent-preset/selected'`。投影 `agentPresetProjectionDefinition` 从 header 初始化，被 selection 事件推进；resume / fork / 冷读读这条，禁止只信 header。[E: packages/preset/agent-preset-registry/src/session.ts:28] [E: packages/preset/agent-preset-registry/src/session.ts:38] 子代理不重新 `resolve` id，而是 `applyChildComposition` → `agentPresets.composeFrom(childCtx, parent.ctx)`，加入**父进程已经 standing 的那一代**。[E: packages/subagent/subagent/src/child-agent.ts:200] [E: packages/subagent/subagent/src/child-agent.ts:205] [E: packages/preset/agent-preset-registry/src/index.ts:273]

12. `runDumpConfig@apps/cli/src/dump-config.ts` **不 boot、不求值 `!!js`**。它 `prepareProfile` 后把「每个 bundle 一层 +（非 `--dump-default-config` 时）profile 用户层 + home 层 + 每个 `--patch`」交给 `renderConfigDump`，锚在同一份空 `cordis.yml` 上。[E: apps/cli/src/dump-config.ts:32] [E: apps/cli/src/dump-config.ts:51] `--dump-default-config` 设 `userLayer: false` 且禁止再带 `--patch`。[E: apps/cli/src/dump-config.ts:38] [E: apps/cli/src/args.ts:132] dump **不含** `DSH_TELEMETRY_DISABLED` disable 行——那一刀只活在 `readProfilePatches` 的 boot 叠层里。`--dump-config-schema` 用同一套 layer 收集 JSON Schema，仍然不 mount 插件。[E: apps/cli/src/dump-config-schema.ts:25] Home 取非空 `$DSH_HOME`，否则 `~/.dsh`。[E: packages/util/home-paths/src/index.ts:87]

## 关键决策点

- **空根 + 后写覆盖。** 有效树不是一份手写的大 `cordis.yml`，而是 `[]` 上按 bundles → profile patch → home patch → `--patch` → telemetry overlay 做一次 `applyEntryPatches`。`config` 整键替换，所以 mode bundle 必须重述它改的那一行的全部键；跨 mode 会变的值不准放进 `dsh-base`。
- **installation-first 的 bundle 解析。** `@deepseek-ai/dsh-base` 等 in-box 包永远来自当前安装；profile `node_modules` 只承载 out-of-tree 插件。`createRuntimeResolution` 算出一份不可变的 installation/profile 包表，交给 `PluginPackages`；旧的 `healProfilesModuleFallback` symlink 投影已删除。
- **模板认五个 shipped 名。** `PROFILE_TEMPLATES` 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`。HMR 由 YAML 拥有：web 组合启用，headless / sdk / acp 关掉，sdk-minimal 无该行。`desktop` 不是模板。`OPTIONAL_BUNDLES` 三个 experimental 默认关掉。
- **`sdk-minimal` 不叠 `dsh-base`。** 模板 `bundles` 只有它自己；patch 是完整 insert。其余四个 shipped 模板都叠 base。
- **Web 把 agent 面从进程挪到 preset。** host 留下 webserver、persistence、sandbox/approval、subagent **backends**、jobs/goals/skills **registry**、token-meter、`ctx.ptcRuntime`；preset 决定这个 Agent 看见哪些 tools / persona / isolate 域。headless / sdk / acp / sdk-minimal 组合无 roster，工具留在 host 全局层。
- **四个 shipped preset 只叠在 `dsh-web-app`。** 声明文件 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。PTC 权威实现是 `packages/core/tools/src/ptc.ts`（模型可见名仍是 `run_code`）；执行缝是 `ctx.ptcRuntime`。
- **standing mount，不是每会话复制一棵树。** 每个 preset id 一份 scoped 组合；session 用 scope parentage join。
- **dump 看文件真树，不是 launcher 真树。** `dsh --profile web --dump-config` 与 boot 共用 parser / `applyEntryPatches` / 空根，但看不到 telemetry hard-disable。
- **与 peer 的一句话差。** Claude Code / Codex 的工具目录是进程内写死的；DSH 的模型可见集是 Cordis 组出来的，以 shipped `dsh-agent-preset` 声明加用户 profile patch 为准。

## 指向后续 T1/T2

- `surface.cli.overview`（[../surface/cli/overview.md](../surface/cli/overview.md)）— `parseDshArgs` 旗标边界与 `dsh plugin`。
- `surface.profiles.web`（[../surface/profiles/web.md](../surface/profiles/web.md)）/ `surface.profiles.headless`（[../surface/profiles/headless.md](../surface/profiles/headless.md)）— shipped profile 的 host 行与 startup 旗标；sdk / sdk-minimal / acp 同样走 `--profile`。
- `surface.presets.overview`（[../surface/presets/overview.md](../surface/presets/overview.md)）以及 `surface.presets.minimal` / `standard` / `code`（PTC 别名）/ `cordis` — 各 preset 装了哪些 wire 工具。
- `subsys.composition.app-boot`（[../subsystems/composition/app-boot.md](../subsystems/composition/app-boot.md)）— `boot` / fail-loud / HMR YAML / env snapshot。
- `subsys.composition.bundle-base`（[../subsystems/composition/bundle-base.md](../subsystems/composition/bundle-base.md)）/ `subsys.composition.bundle-web-app`（[../subsystems/composition/bundle-web-app.md](../subsystems/composition/bundle-web-app.md)）/ `subsys.composition.bundle-headless`（[../subsystems/composition/bundle-headless.md](../subsystems/composition/bundle-headless.md)）— 各 bundle 行表。
- `subsys.composition.agent-presets`（[../subsystems/composition/agent-presets.md](../subsystems/composition/agent-presets.md)）— registry、`dsh-agent-preset` 声明、standing mount。
- `spine.trace-web-first-prompt`（[trace-web-first-prompt.md](trace-web-first-prompt.md)）— `dsh web` 到第一轮 turn；`spine.trace-headless-turn`（[trace-headless-turn.md](trace-headless-turn.md)）— argv 任务到进程退出。
- `spine.capability-seams`（[capability-seams.md](capability-seams.md)）— Definition / Provider / Consumer 三角。
- `surface.misc.home`（[../surface/misc/home.md](../surface/misc/home.md)）— `$DSH_HOME` / `~/.dsh`。

## Sources

- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/profile-context.ts
- packages/boot/app-boot/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- apps/cli/src/bin.ts
- apps/cli/src/profile-boot.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/dump-config-schema.ts
- apps/cli/src/args.ts
- apps/cli/src/plugin.ts
- apps/cli/package.json
- packages/boot/app-boot/tests/profile.spec.ts
- packages/boot/app-boot/tests/config-dump.spec.ts
- apps/cli/tests/args.spec.ts
- apps/cli/tests/telemetry-switch.spec.ts
- apps/cli/tests/windows-shell.spec.ts
- apps/cli/tests/profile-hmr.spec.ts
- packages/bundle/base/package.json
- packages/bundle/headless/package.json
- packages/bundle/sdk-app/package.json
- packages/bundle/sdk-minimal/package.json
- packages/bundle/acp-app/package.json
- packages/boot/cmdline/src/index.ts
- packages/util/home-paths/src/index.ts
- packages/preset/agent-preset/src/index.ts
- packages/preset/agent-preset-registry/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/preset/agent-preset-registry/src/session.ts
- packages/api/session-controller/src/agent.ts
- packages/subagent/subagent/src/child-agent.ts
- vendor/include/src/index.ts
- packages/boot/config-editor/src/index.ts
- packages/boot/plugin-manager/src/index.ts

## 相关

- [spine.overview](overview.md) — DSH 全仓地图与 host / preset / client 边界总览。
- [subsys.composition.app-boot](../subsystems/composition/app-boot.md) — `boot`、`loadProfile`、用户 patch 热更新与 fail-loud 的子系统细节。
- [subsys.composition.bundle-base](../subsystems/composition/bundle-base.md) — `@deepseek-ai/dsh-base` 那条共享 insert 的逐行职责。
- [surface.presets.overview](../surface/presets/overview.md) — shipped / 用户 preset 的发现、默认 `standard`、以及各 preset 的模型可见工具集。
