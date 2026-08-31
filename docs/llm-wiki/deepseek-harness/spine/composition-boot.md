---
id: spine.composition-boot
title: 组合启动(profile→bundle→preset)
kind: flow
tier: T0
pkg: composition
source:
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - apps/cli/src/bin.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/args.ts
  - apps/cli/src/plugin.ts
  - apps/cli/package.json
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/boot/app-boot/tests/config-dump.spec.ts
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/telemetry-switch.spec.ts
  - apps/cli/tests/windows-shell.spec.ts
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/acp-app/package.json
  - packages/boot/cmdline/src/index.ts
  - packages/util/home-paths/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/api/session-controller/src/agent.ts
  - packages/subagent/subagent/src/child-agent.ts
  - vendor/include/src/index.ts
symbols:
  - composeProfile
  - composeEntries
  - loadProfile
  - initProfile
  - prepareProfile
  - runProfile
  - PROFILE_TEMPLATES
  - renderConfigDump
  - boot
  - parseDshArgs
  - applyEntryPatches
related:
  - spine.overview
  - subsys.composition.app-boot
  - subsys.composition.bundle-base
  - surface.presets.overview
evidence: explicit
status: verified
updated: 0a53fb55be
---

> DSH 是 **Cordis 组合运行时**：一次启动把空的 Loader 入口表叠成 `profile → bundle → agent preset`。进程级 **host 面**（webserver / persistence / sandbox / subagent backends）先 settle；会话级 **agent-preset 面**（tools / persona / isolate）只在 Web 组合了 `agent-presets` 时、于 Agent factory 的 `setup` 里 join。模型看见的 preset 必须写进 session log（`model-visible ⟺ logged`）。没有 shipped TUI 包。入口是 `dsh web` 或 `dsh --profile web|headless|sdk|sdk-minimal|acp`（以及 `dsh plugin` 初始化的自定义名）。

## 能回答的问题

- `dsh` / `dsh web` / `dsh --profile headless|sdk|sdk-minimal|acp` 怎样变成一次 profile boot，inner args 归谁解析？
- 空的 `$DSH_HOME/profiles/<name>/cordis.yml` 按什么层序叠成有效入口表？`composeProfile` 和 `composeEntries` 各在哪一层？
- shipped `PROFILE_TEMPLATES` 五个名字差在哪一层 bundle？谁叠 `dsh-base`？谁是唯一 `patchReload: live`？
- Web 会话何时 `AgentPresets.mount`？headless / sdk / acp 为什么不挂 roster？子代理怎么 `composeFrom`？
- `dsh --dump-config` / `--dump-default-config` 看到的是哪几层？telemetry 开关会不会出现在 dump 里？

```mermaid
flowchart TD
  Argv["parseDshArgs argv"] --> Mode{invocation.mode}
  Mode -->|web alias| Web["profile=web"]
  Mode -->|profile| Run["runProfile"]
  Mode -->|dump-config| Dump["runDumpConfig"]
  Mode -->|plugin| Plugin["runPlugin / pnpm"]
  Web --> Run
  Run --> Env["loadLayeredEnv"]
  Env --> Prep["prepareProfile"]
  Prep --> Heal["healProfilesModuleFallback"]
  Prep --> Load["loadProfile"]
  Load --> Init{"package.json missing?"}
  Init -->|PROFILE_TEMPLATES| Auto["initProfile five shipped names"]
  Init -->|unknown name| Fail["throw: create with dsh plugin"]
  Load --> Stack["composeProfile layers"]
  Stack --> Bundles["bundle patches in dsh.profile.bundles order"]
  Stack --> User["profile cordis.patch.yml"]
  Stack --> Home["home cordis.patch.yml"]
  Stack --> Flag["--patch overlays + telemetry"]
  Flag --> Boot["boot empty cordis.yml + patches"]
  Boot --> Host["host plane"]
  Host --> Roster{"rows has agent-presets?"}
  Roster -->|web only among five| Session["session-controller composeAgent"]
  Session --> Mount["AgentPresets.mount standing scope"]
  Mount --> AgentPlane["preset tools / persona / isolate"]
  Roster -->|headless sdk acp| Global["tools stay on host global layer"]
  Dump --> FileLayers["renderConfigDump file layers only"]
```

## 端到端步骤

1. `parseDshArgs@apps/cli/src/args.ts` 只吃 launcher 旗标：`--profile`、可重复 `--patch`、`--dump-config` / `--dump-default-config`。第一个它不认识的 token 起全部是 inner args，交给已 boot 的 app 自己解析（含 app 的 `-h`）。子命令 `web` 硬编码为 `profile: 'web'`，与 `dsh --profile web` 同一条 boot 路径。没有 `dsh sdk` / `dsh acp` / `dsh headless` 子命令。缺 `--profile` 且不是 `web`/`plugin` 则报错退出。help 里的 `--profile tui` 只是自定义 profile 示例，不是 `PROFILE_TEMPLATES` 键。 [E: apps/cli/src/args.ts:168] [E: apps/cli/src/args.ts:140] [E: apps/cli/src/args.ts:68] [E: apps/cli/tests/args.spec.ts:28]

2. `bin` switch@apps/cli/src/bin.ts 按 `invocation.mode` 动态 import：`profile` → `runProfile`；`dump-config` → `runDumpConfig`；`plugin` → `runPlugin` 后 `process.exit`。profile 路径在进树之前调用 `loadLayeredEnv('dsh')`：继承环境优先，再补 invoking-directory `.env`，再补 `$DSH_HOME/.env`（不覆盖已有名）；bootstrap-only 名禁止出现在发现到的 `.env` 里。 [E: apps/cli/src/bin.ts:27] [E: apps/cli/src/bin.ts:42] [E: packages/boot/app-boot/src/index.ts:190] [E: packages/boot/app-boot/src/index.ts:160]

3. `runProfile@apps/cli/src/profile-boot.ts` 先走模块内 `composeProfile`（**未 export**；`dsh-app-boot` 导出的是 `composeEntries` / `loadProfile` / `initProfile`，launcher 导出的是 `runProfile` / `prepareProfile`）。`prepareProfile` 调 `loadProfile`，并**每次**把 profile 目录里的 `cordis.yml` 重写成 `PROFILE_ROOT_CONFIG`（正文是空入口表 `[]`）——Loader 需要真实 include 根来锚定 `baseUrl`，但 vendored Loader 的 write-back 会把已叠好的行烤进该文件，下次 boot 就会把 bundle insert 再插一遍。heal 发生在 `composeProfile` 里、`prepareProfile` 之后。 [E: apps/cli/src/profile-boot.ts:156] [E: apps/cli/src/profile-boot.ts:118] [E: apps/cli/src/profile-boot.ts:80]

4. `loadProfile@packages/boot/app-boot/src/profile.ts` 解析 `$DSH_HOME/profiles/<name>/package.json` 的 `dsh.profile.bundles`。目录尚不存在时，仅当 `name` 落在 `PROFILE_TEMPLATES` 才 `initProfile`。五个 shipped 名：`acp` = `dsh-base` + `dsh-acp-app`（`startup`）；`web` = `dsh-base` + `dsh-web-app`（**唯一 shipped `live`**）；`headless` = `dsh-base` + `dsh-headless`（`startup`）；`sdk` = `dsh-base` + `dsh-sdk-app`（`startup`）；`sdk-minimal` = **仅** `dsh-sdk-minimal`（`startup`，不叠 base）。其它名字必须先 `dsh plugin --profile <name> add …`；`dsh plugin` 对无模板名用 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']` 与 `DEFAULT_PROFILE_PATCH_RELOAD = 'live'`。测试钉死 `sdk-minimal` 的 bundles 只有自身。 [E: packages/boot/app-boot/tests/profile.spec.ts:203]每个 bundle 必须在自己的 `package.json` 声明 `dsh.bundle.patch`（六个 bundle 都是 `./cordis.patch.yml`），否则 fail loud。manifest 里畸形 `patchReload` fail loud；写成后又省略该键则 loader 回落到 `'live'`（自定义默认），不是模板值。bundle 解析 **installation-first，profile-second**。 [E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:154] [E: packages/boot/app-boot/src/profile.ts:811] [E: packages/boot/app-boot/src/profile.ts:823] [E: packages/boot/app-boot/src/profile.ts:828] [E: packages/bundle/base/package.json:38] [E: packages/bundle/web-app/package.json:43] [E: packages/bundle/headless/package.json:43] [E: packages/bundle/sdk-app/package.json:38] [E: packages/bundle/sdk-minimal/package.json:38] [E: packages/bundle/acp-app/package.json:38] [E: apps/cli/src/plugin.ts:126]

5. `composeEntries@packages/boot/app-boot/src/profile.ts` 从**空数组**出发，把各层 `PatchOptions[]` flatten 成一次 `applyEntryPatches` 调用。`applyEntryPatches@vendor/include/src/index.ts` 按 id 找行：无 `id` 的 `insert` 追加到根；带 `id` 的 patch 把 `config` / `disabled` 等键**整键覆盖**（不是 deep-merge）；同一 flattened 列表里后写的 insert 立刻入索引，所以后一层可以改前一层刚插的行；匹配不到的 patch 只 warn、不抛。 [E: packages/boot/app-boot/src/profile.ts:854] [E: vendor/include/src/index.ts:121] [E: vendor/include/src/index.ts:58]

6. `composeProfile` 的应用顺序是 `bundlePatches → profile.patches → homePatches → overlays`。profile 层是 `$DSH_HOME/profiles/<name>/cordis.patch.yml`（缺文件 = 空层，`loadOptionalPatches`）；home 层是 `$DSH_HOME/cordis.patch.yml`，机器级、压过每个 profile 自己的层。`--patch` 文件按 argv 顺序 `loadOverlayPatches`（**缺文件抛错**）。叠完之后，若 `DSH_TELEMETRY_DISABLED` 非空且存在 `session-telemetry-otel` 行，再推 `{ id, disabled: true }`（`'0'`/`'false'` 也关）。**不再**向 `agent-presets` 注入 `apps/cli/config/agent-presets/`：CLI `files` 只发布 `lib/*.js`；shipped preset 根在 `@deepseek-ai/dsh-agent-presets` 包内 `presets/`。 [E: apps/cli/src/profile-boot.ts:137] [E: apps/cli/src/profile-boot.ts:170] [E: packages/boot/app-boot/src/index.ts:300] [E: apps/cli/tests/telemetry-switch.spec.ts:11] [E: apps/cli/package.json:17] [E: packages/preset/agent-presets/src/discovery.ts:60]

7. `runProfile` 调 `boot@packages/boot/app-boot/src/index.ts`：`new Context` → `provide('dshHomePath')` → `ctx.plugin(Loader)` → `prepare` 回调里 `provide` 冻结的 `LaunchEnvironmentSnapshot` 和 `provideCmdline`（`ctx.cmdlineArgs` + `ctx.appExit`）→ 空 `cordis.yml` 加上整叠 patches。app 旗标不是 launcher 的事：`dsh web --host …` / `--no-open` 在 inner args 里。树 settle 后，**仅当** `composed.profile.patchReload === 'live'` 才挂用户 patch 热重载：若组合没留下 HMR（`dsh-base` 的 `hmr` 行默认 `disabled: true`），launcher 会挂一个 `root: []` 的 watch-only HMR，然后 `watchUserPatches` 同时盯 profile `cordis.patch.yml` 与 `$DSH_HOME/cordis.patch.yml`。`startup` 模板仍在 boot 时应用这些层，但不装 watcher。重载时 `composeLive` 仍是「bundle 在下、overlays 在上」。 [E: apps/cli/src/profile-boot.ts:251] [E: apps/cli/src/profile-boot.ts:258] [E: apps/cli/src/profile-boot.ts:270] [E: apps/cli/src/profile-boot.ts:285] [E: packages/boot/cmdline/src/index.ts:84] [E: packages/bundle/base/cordis.patch.yml:23] [E: packages/boot/app-boot/src/index.ts:772]

8. **host 面 vs agent-preset 面在这一步切开。** `dsh-base` 用**一条**根 `insert` 放下共享核心：timer / 默认 disabled 的 hmr、`llm` 族、`session` 与 jsonl persistence、`sandbox` + `sandbox-policy` + `approval`、`tools` 注册表、`agent-loop`、`agent-default-model`（`provider: deepseek-official` / `model: deepseek-v4-flash`）、shell 双栈。`dsh-web-app` 叠在 base 之后：插入 webserver / web-runtime / api-gateway / client roster，并把 **model-facing** 行（`tool-bash` / `tool-pwsh` / plan / subagent / compaction …）全部 `disabled: true`，再 `insert` `agent-presets`（`default: standard`）。权限与执行缝留在 host：`sandbox` / `approval` / `fs-sandbox` / `permission` 不被 disable。`dsh-headless` 只插 `code-runtime` + `headless-startup` + `headless-runner`，**不**插 `agent-presets`，也 **不** disable base 的工具行。`dsh-sdk-app` 插 `sdk-app-startup` + `sdk-jsonrpc-server`；`dsh-acp-app` 插 `acp-app-startup` + `acp`（ACP 行再写一遍同一对默认模型）。`dsh-sdk-minimal` 的 patch 是**完整** `insert`（JSON-RPC + DeepSeek adapter + sandbox/pty/fs + `dsh-agent-spine-demo` 等），不叠 base 行 id。五个 shipped profile 里**只有 web** 挂 roster。 [E: packages/bundle/base/cordis.patch.yml:15] [E: packages/bundle/base/cordis.patch.yml:78] [E: packages/bundle/web-app/cordis.patch.yml:320] [E: packages/bundle/web-app/cordis.patch.yml:442] [E: packages/bundle/web-app/cordis.patch.yml:445] [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/sdk-app/cordis.patch.yml:12] [E: packages/bundle/acp-app/cordis.patch.yml:12] [E: packages/bundle/acp-app/cordis.patch.yml:19] [E: packages/bundle/sdk-minimal/cordis.patch.yml:5] [E: packages/bundle/sdk-minimal/cordis.patch.yml:73] [E: apps/cli/tests/windows-shell.spec.ts:64]

9. **preset 按会话挂上（仅当 host 组合了 roster）。** Web 的 `composeAgent@packages/api/session-controller/src/agent.ts` 在 `ctx.agents.create` **之前** `presets.resolve`，把 id 写进 session header 的 `agentPreset`；真正的 `AgentPresets.mount` 发生在 factory `setup`，失败则整次 create 回滚。`ctx.get('agentPresets') === undefined` 时 `composeAgent` 只装 model selection，工具走 host 全局层（headless / sdk / acp / sdk-minimal 默认）。`mount` 对每个 preset id **single-flight 一份 standing scope**，再 `bindScopeParent` 让这个 Agent 看见那份注册。组合文件名是目录下的 `agent.cordis.yml`；可选展示元数据是 `preset.yml`；用户自写 preset 落在 `$DSH_HOME/.agent-presets`。shipped 目录名：`minimal` / `standard` / `ptc` / `cordis`（旧名 `code` 即 PTC；wiki 节点 `surface.presets.code` 是稳定别名）。roster 根序：shipped `system` 根（`includeShippedRoot` 默认 true）→ 配置的 `roots` → 用户根（`includeUserRoot` 默认 true）；更早的根赢重复 id。Web 行只设 `default: standard`。 [E: packages/api/session-controller/src/agent.ts:373] [E: packages/api/session-controller/src/agent.ts:380] [E: packages/preset/agent-presets/src/index.ts:414] [E: packages/preset/agent-presets/src/index.ts:110] [E: packages/preset/agent-presets/src/index.ts:179] [E: packages/preset/agent-presets/src/discovery.ts:37] [E: packages/preset/agent-presets/src/discovery.ts:51] [E: packages/preset/agent-presets/src/discovery.ts:60] [E: packages/preset/agent-presets/src/metadata.ts:25]

10. `mountPreset@packages/preset/agent-presets/src/mount.ts` 把 `agent.cordis.yml` 当 Include 树插进 scoped context。拒绝无 scope 的 context。preset 行若把 service publish 进 **root realm**（`leakedServices` 非空），mount 抛错。需要私有实例的行必须放进 `cordis:group` + `isolate`（`standard` 对 `planMode` / `compaction` / `workflowEngine` 就是这样）。`ptc` 额外一行 `tool-presentation` / `@deepseek-ai/dsh-agent-tool-presentation` `mode: ptc`（不是 isolate 组）。只往 host `ctx.tools` 注册的工具行不必 isolate。 [E: packages/preset/agent-presets/src/mount.ts:382] [E: packages/preset/agent-presets/src/mount.ts:210] [E: packages/preset/agent-presets/src/mount.ts:407] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:107] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:264] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:268]

11. **model-visible ⟺ logged。** 创建时 header 记下 `agentPreset`；空白窗口里换 preset 必须 append `'agent-preset/selected'`。投影 `agentPresetProjectionDefinition` 从 header 初始化，被 selection 事件推进；resume / fork / 冷读读这条，禁止只信 header。子代理不重新 `resolve` id，而是 `applyChildComposition` → `agentPresets.composeFrom(childCtx, parent.ctx)`，加入**父进程已经 standing 的那一代**。 [E: packages/preset/agent-presets/src/session.ts:28] [E: packages/preset/agent-presets/src/session.ts:38] [E: packages/subagent/subagent/src/child-agent.ts:199] [E: packages/subagent/subagent/src/child-agent.ts:204] [E: packages/preset/agent-presets/src/index.ts:455]

12. `runDumpConfig@apps/cli/src/dump-config.ts` **不 boot、不求值 `!!js`**。它 `prepareProfile` 后把「每个 bundle 一层 +（非 `--dump-default-config` 时）profile 用户层 + home 层 + 每个 `--patch`」交给 `renderConfigDump`，锚在同一份空 `cordis.yml` 上。`--dump-default-config` 设 `userLayer: false` 且禁止再带 `--patch`。dump **不含** `DSH_TELEMETRY_DISABLED` disable 行——那一刀只活在 `composeProfile` 的 boot 叠层里。Home 取非空 `$DSH_HOME`，否则 `~/.dsh`。 [E: apps/cli/src/dump-config.ts:30] [E: apps/cli/src/dump-config.ts:51] [E: packages/boot/app-boot/src/index.ts:394] [E: packages/boot/app-boot/src/profile.ts:840] [E: packages/boot/app-boot/tests/config-dump.spec.ts:85] [E: packages/util/home-paths/src/index.ts:87]

## 关键决策点

- **空根 + 后写覆盖。** 有效树不是一份手写的大 `cordis.yml`，而是 `[]` 上按 bundles → profile patch → home patch → `--patch` → telemetry overlay 做一次 `applyEntryPatches`。`config` 整键替换，所以 mode bundle 必须重述它改的那一行的全部键；跨 mode 会变的值不准放进 `dsh-base`。
- **installation-first 的 bundle 解析。** `@deepseek-ai/dsh-base` 等 in-box 包永远来自当前安装；profile `node_modules` 只承载 out-of-tree 插件。`healProfilesModuleFallback` 用 app 依赖闭包铺平 symlink。
- **模板认五个 shipped 名。** `PROFILE_TEMPLATES` 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`。`web` 是唯一 `live` 模板。恰好等于旧三元组 `base + web-app + headless` 的 `headless` manifest 会被 `normalizeShippedProfile` 写成现行二元组（**现行 headless 不含 `dsh-web-app`**）；带额外 custom bundle 的列表视为用户所有，不动。 [E: packages/boot/app-boot/src/profile.ts:162] [E: packages/boot/app-boot/src/profile.ts:721]
- **`sdk-minimal` 不叠 `dsh-base`。** 模板 `bundles` 只有它自己；patch 是完整 insert。其余四个 shipped 模板都叠 base。
- **Web 把 agent 面从进程挪到 preset。** host 留下 webserver、persistence、sandbox/approval、subagent **backends**、jobs/goals/skills **registry**、token-meter；preset 决定这个 Agent 看见哪些 tools / persona / isolate 域。headless / sdk / acp 组合无 roster，工具留在 host 全局层。
- **四个 shipped preset。** 目录 `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/`。PTC 权威实现是 `packages/core/tools/src/ptc.ts`（模型可见名仍是 `run_code`）。
- **standing mount，不是每会话复制一棵树。** 每个 preset id 一份 scoped 组合；session 用 scope parentage join。
- **dump 看文件真树，不是 launcher 真树。** `dsh --profile web --dump-config` 与 boot 共用 parser / `applyEntryPatches` / 空根，但看不到 telemetry hard-disable。
- **与 peer 的一句话差。** Claude Code / Codex 的工具目录是进程内写死的；DSH 的模型可见集是 Cordis 组出来的，以 shipped `agent.cordis.yml` 加用户 `$DSH_HOME/.agent-presets` 为准。

## 指向后续 T1/T2

- `surface.cli.overview`（[../surface/cli/overview.md](../surface/cli/overview.md)）— `parseDshArgs` 旗标边界与 `dsh plugin`。
- `surface.profiles.web`（[../surface/profiles/web.md](../surface/profiles/web.md)）/ `surface.profiles.headless`（[../surface/profiles/headless.md](../surface/profiles/headless.md)）— shipped profile 的 host 行与 startup 旗标；sdk / sdk-minimal / acp 同样走 `--profile`。
- `surface.presets.overview`（[../surface/presets/overview.md](../surface/presets/overview.md)）以及 `surface.presets.minimal` / `standard` / `code`（PTC 别名）/ `cordis` — 各 preset 装了哪些 wire 工具。
- `subsys.composition.app-boot`（[../subsystems/composition/app-boot.md](../subsystems/composition/app-boot.md)）— `boot` / fail-loud / HMR 用户层 / env snapshot。
- `subsys.composition.bundle-base`（[../subsystems/composition/bundle-base.md](../subsystems/composition/bundle-base.md)）/ `subsys.composition.bundle-web-app`（[../subsystems/composition/bundle-web-app.md](../subsystems/composition/bundle-web-app.md)）/ `subsys.composition.bundle-headless`（[../subsystems/composition/bundle-headless.md](../subsystems/composition/bundle-headless.md)）— 各 bundle 行表。
- `subsys.composition.agent-presets`（[../subsystems/composition/agent-presets.md](../subsystems/composition/agent-presets.md)）— discovery、`includeUserRoot`、authoring copy/delete。
- `spine.trace-web-first-prompt`（[trace-web-first-prompt.md](trace-web-first-prompt.md)）— `dsh web` 到第一轮 turn；`spine.trace-headless-turn`（[trace-headless-turn.md](trace-headless-turn.md)）— argv 任务到进程退出。
- `spine.capability-seams`（[capability-seams.md](capability-seams.md)）— Definition / Provider / Consumer 三角。
- `surface.misc.home`（[../surface/misc/home.md](../surface/misc/home.md)）— `$DSH_HOME` / `~/.dsh`。

## Sources

- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- apps/cli/src/bin.ts
- apps/cli/src/profile-boot.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/args.ts
- apps/cli/src/plugin.ts
- apps/cli/package.json
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/boot/app-boot/tests/profile.spec.ts
- packages/boot/app-boot/tests/config-dump.spec.ts
- apps/cli/tests/args.spec.ts
- apps/cli/tests/telemetry-switch.spec.ts
- apps/cli/tests/windows-shell.spec.ts
- packages/bundle/base/package.json
- packages/bundle/web-app/package.json
- packages/bundle/headless/package.json
- packages/bundle/sdk-app/package.json
- packages/bundle/sdk-minimal/package.json
- packages/bundle/acp-app/package.json
- packages/boot/cmdline/src/index.ts
- packages/util/home-paths/src/index.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/session.ts
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/metadata.ts
- packages/api/session-controller/src/agent.ts
- packages/subagent/subagent/src/child-agent.ts
- vendor/include/src/index.ts

## 相关

- [spine.overview](overview.md) — DSH 全仓地图与 host / preset / client 边界总览。
- [subsys.composition.app-boot](../subsystems/composition/app-boot.md) — `boot`、`loadProfile`、用户 patch 热更新与 fail-loud 的子系统细节。
- [subsys.composition.bundle-base](../subsystems/composition/bundle-base.md) — `@deepseek-ai/dsh-base` 那条共享 insert 的逐行职责。
- [surface.presets.overview](../surface/presets/overview.md) — shipped / 用户 preset 的发现、默认 `standard`、以及各 preset 的模型可见工具集。
