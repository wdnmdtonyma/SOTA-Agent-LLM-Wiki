---
id: surface.profiles.headless
title: headless profile
kind: surface
tier: T1
pkg: composition
source:
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/src/startup.ts
  - packages/bundle/headless/src/index.ts
  - packages/bundle/headless/package.json
  - packages/bundle/headless/tests/startup.spec.ts
  - packages/bundle/headless/tests/headless.spec.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/boot/cmdline/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/core/tools/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/built-bin.e2e.ts
  - apps/cli/tests/profiles/headless/tests/keyless-smoke.e2e.ts
  - packages/bundle/web-app/cordis.patch.yml
symbols:
  - HEADLESS_STARTUP_SERVICE
  - headlessStartup
  - PROFILE_TEMPLATES
related:
  - surface.cli.overview
  - surface.profiles.web
  - spine.composition-boot
  - spine.trace-headless-turn
  - surface.presets.overview
evidence: explicit
status: verified
updated: c291e7961a
---

> `headless` 是 DSH 的 **one-shot 进程 profile**：模板把 `@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-headless` 叠成一棵 **无 Host / 无 HTTP / 无 browser / 无 `agent-presets` roster** 的 Cordis 树；`patchReload` 是 `startup`；`headless-startup` 把 task positional 做成 `headlessStartup` 服务，`headless-runner` 在 host 面上 `agents.create` 一次、`followup` 一次、把 reasoning 流到 stderr、打印最后一条 assistant text，再按 `turn/end` reason 经 `ctx.appExit` 退出。`desktop` 不是第六个 CLI profile。

## 能回答的问题

- `dsh --profile headless "<task>"` 的 launcher 边界在哪、task 几个词怎么拼成一句？
- 第一次启动会不会自动 `initProfile`？旧的三元组 `dsh-base + dsh-web-app + dsh-headless` 会不会被改回两元组？
- 这棵树有没有 webserver / `dsh-client-*` / shipped preset roster？模型看见的 `tool-*` 从哪一层来？host 面有没有 `str_replace_editor`？
- 空 task、`--help`、`turn/end` 非 `completed`、Agent 工厂抛错时进程怎么退？
- `DSH_TOOLS_MODE` 在 headless overlay 里怎么写？`patchReload: startup` 会不会装 live HMR watcher？
- 和 `web` / `sdk` / `sdk-minimal` / `acp` 比，host 面 vs agent-preset 面差在哪？

## 是什么

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），不是「又一个 coding agent」。capability seam 仍是 Definition / Provider / Consumer；`model-visible ⟺ logged` 对 headless 同样成立——runner 只打印 session 日志里已经 append 过的 assistant text，再 `sessions.flush`。

**profile** 是进程级目录 `$DSH_HOME/profiles/<name>`：`package.json` 的 `dsh.profile.bundles` 决定 bundle 层顺序，`dsh.profile.patchReload` 决定用户 patch 是 boot 一次还是 live watch，`cordis.patch.yml` 是用户层。**bundle** 是声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` 的 npm 包。**agent preset** 是每会话的 `agent.cordis.yml`，只认 `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/`，必须由组合树里的 `agent-presets` 行挂 roster。[E: packages/preset/agent-presets/src/discovery.ts:60]

`headless` 只走 profile 与 bundle，不挂 preset。模板名写在 `PROFILE_TEMPLATES.headless`：bundles `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-headless']`，`patchReload: 'startup'`。[E: packages/boot/app-boot/src/profile.ts:114] [E: packages/boot/app-boot/src/profile.ts:116] 五个 shipped 模板是 `acp` / `web` / `headless` / `sdk` / `sdk-minimal`；`web` 是唯一 `live`。[E: packages/boot/app-boot/src/profile.ts:105] [E: packages/boot/app-boot/src/profile.ts:112] `desktop` 不在这张表里。`@deepseek-ai/dsh-headless` 的 manifest 把 patch 指到本包 `./cordis.patch.yml`。[E: packages/bundle/headless/package.json:38]

相对其它入口：`dsh web` 是唯一硬编码 profile 子命令 alias；headless / sdk / sdk-minimal / acp 都走 `dsh --profile <name>`。[E: apps/cli/src/args.ts:175] 本仓没有 shipped TUI 包；help 里的 `tui` 只是自定义 profile 示例。[E: apps/cli/src/args.ts:81] `dsh --profile desktop` 在 launcher 就被 `rejectElectronProfile` 拒绝。[E: apps/cli/src/args.ts:69] `headless` 是 **无 UI 的一次性任务进程**——不 bind 端口、不挂 browser roster。`dsh --profile headless --dump-default-config` 的验收断言：树里有 `@deepseek-ai/dsh-headless`，没有 `dsh-host-*`、没有 `@deepseek-ai/dsh-web-app`、没有 `dsh-client-*`。[E: apps/cli/tests/built-bin.e2e.ts:1056] [E: apps/cli/tests/built-bin.e2e.ts:1057] [E: apps/cli/tests/built-bin.e2e.ts:1058] [E: apps/cli/tests/built-bin.e2e.ts:1059]

本 bundle **不挂 preset roster**。`packages/bundle/headless/cordis.patch.yml` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner` 三行，没有 `id: agent-presets`。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] [E: packages/bundle/headless/cordis.patch.yml:27] CLI `composeProfile` **不再**按 `rows.has('agent-presets')` 补 shipped root；roster 只在 web overlay 自己 insert。[E: packages/bundle/web-app/cordis.patch.yml:481] 因此 **不要** 把 `minimal` / `standard` / `ptc` / `cordis` 说成 headless 的默认装配。模型可见工具留在 **host 面**：`dsh-base` 已经 insert 的 `tool-*` 行，runner 在 root realm 上 `agents.create`，`setup` 只装 `installModelSelection`，没有 `bindScopeParent`。[E: packages/bundle/headless/src/index.ts:185] [E: packages/bundle/headless/src/index.ts:191] keyless-smoke 落盘工具名 **不含** `str_replace_editor`。[E: apps/cli/tests/profiles/headless/tests/keyless-smoke.e2e.ts:64]

## 入口

用户 / 进程碰到 `headless` 的路径：

1. **Launcher**：`dsh --profile headless …`。`parseDshArgs` 只吃 `--profile` / `--from-default-profile` / `--patch` / `--dump-*` / `-V`；第一个它不认识的 token 起全部交给 app。[E: apps/cli/src/args.ts:126] [E: apps/cli/src/args.ts:141] `dsh --profile headless run the tests` 解析成 `{ mode: 'profile', profile: 'headless', patches: [], args: ['run', 'the', 'tests'] }`。[E: apps/cli/tests/args.spec.ts:43] launcher 把 `web` 做成子命令 alias（`dsh web` ≡ `--profile web`）。[E: apps/cli/src/args.ts:175] headless 没有对等 alias；help 例子写的是 `dsh --profile headless "run the tests"`。[E: apps/cli/src/args.ts:80]
2. **Dispatch**：`apps/cli/src/bin.ts` 在 `mode: 'profile'` 动态 `import('./profile-boot.ts')`，并以 `profile` / `fromDefaultProfile` 调用 `runProfile`。[E: apps/cli/src/bin.ts:32] [E: apps/cli/src/bin.ts:37]
3. **Boot**：`runProfile` → 文件内 `composeProfile` → `prepareProfile` → `loadProfile`。目录尚无 `package.json` 且名字在 `PROFILE_TEMPLATES` 里时，`initProfile(dir, template.bundles, template.patchReload)` 写出 `$DSH_HOME/profiles/headless/`（含 `patchReload: 'startup'`）。[E: packages/boot/app-boot/src/profile.ts:827] 未知名字（help 里的自定义 `tui`）第一次 `dsh --profile <unknown>` **不会**自动 init，会报错让你走 `dsh plugin --profile <name> add`。[E: packages/boot/app-boot/src/profile.ts:824]
4. **App 旗标**：inner args 经 `provideCmdline` 冻成 `ctx.cmdlineArgs`，并提供 `ctx.appExit`。[E: apps/cli/src/profile-boot.ts:343] [E: packages/boot/cmdline/src/index.ts:84] `headless-startup` 用 commander 程序名 `dsh --profile headless`，位置参数 `[task...]`，多词 `join(' ')`。[E: packages/bundle/headless/src/startup.ts:33] [E: packages/bundle/headless/src/startup.ts:52]
5. **真树入口**：`dsh --profile headless --dump-config` / `--dump-default-config` 走 `runDumpConfig`。[E: apps/cli/src/dump-config.ts:31] `defaultOnly` 时 `prepareProfile(profile, !defaultOnly)`，并且不把 profile / home / `--patch` 层推进 dump。[E: apps/cli/src/dump-config.ts:37] [E: apps/cli/src/dump-config.ts:42]

## 关键字段

### Launcher / app 旗标

| 实例 | 谁解析 | 含义 |
|---|---|---|
| `--profile headless` | launcher `parseDshArgs` | 选 `$DSH_HOME/profiles/headless`。无 `dsh headless` alias。 |
| `[task...]` | `headless-startup` | 任务正文；多个 token 用空格拼成一句。[E: packages/bundle/headless/src/startup.ts:36] |
| `-h` / `--help` | `headless-startup` | 打 app help，**不** provide `headlessStartup`，runner 保持 pending，进程 `appExit(0)`。[E: packages/bundle/headless/tests/startup.spec.ts:110] |
| `--patch <path>`（可重复） | launcher | 叠在 profile / home 用户层之后。 |
| `--dump-config` / `--dump-default-config` | launcher | 打印组合树后退出；dump 不接受 app args。 |

`--host` / `--port` / `--trusted-host` / `--no-open` 是 **web** app 旗标，headless commander 不声明它们。sdk / acp 各自也是零 extra-flag 的 stdio app。

### 模板与历史三元组

| 符号 | 值 | 作用 |
|---|---|---|
| `PROFILE_TEMPLATES.headless` | bundles 两元组 + `patchReload: 'startup'` | 第一次 `loadProfile('headless')` 自动 `initProfile` 时写入。[E: packages/boot/app-boot/src/profile.ts:114] [E: packages/boot/app-boot/src/profile.ts:827] |
| `INSTALLATION_OWNED_PROFILE_TUPLES.headless`（文件内，未导出） | `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-headless']` | 旧安装曾把 `dsh-web-app` 也写进 headless 清单。`normalizeShippedProfile` 只在 **精确等于** 这个三元组时，把 manifest 改回两元组模板并写回磁盘（同时补 `patchReload: 'startup'`）。[E: packages/boot/app-boot/src/profile.ts:130] [E: packages/boot/app-boot/src/profile.ts:689] |
| 其它 list | 用户所有 | 三元组后再加 `custom-bundle`、或任何不同顺序 / 缺项，normalize **不动**。[E: packages/boot/app-boot/tests/profile.spec.ts:265] |

当前 shipped `headless` **不**叠 `dsh-web-app`；三元组只作为退役 heal 输入。

### `@deepseek-ai/dsh-headless` patch 每一行

`packages/bundle/headless/cordis.patch.yml` 叠在 `dsh-base` 的 insert 之后，按 id 覆盖 / 再 insert：

| id | 操作 | 字段 | 含义 |
|---|---|---|---|
| `system-prompt` | 覆盖 `config` | `personaPrefix` + `personaSuffix` | 部署级 persona **两字段**；不是旧的单字段 `persona` / `text`。[E: packages/bundle/headless/cordis.patch.yml:9] [E: packages/bundle/headless/cordis.patch.yml:11] |
| `tools` | 覆盖 `config` | `mode: !!js process.env.DSH_TOOLS_MODE` | 进程级 PTC 呈现开关。unset 时 `!!js` 得到 `undefined`，`dsh-tools` schema 默认 `native`。[E: packages/bundle/headless/cordis.patch.yml:16] [E: packages/core/tools/src/index.ts:784] |
| `code-runtime` | insert | `name: '@deepseek-ai/dsh-code-runtime-worker-thread'` | PTC `run_code` 的 runtime provider，不是 Web 组件。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:21] |
| `headless-startup` | insert | `name: '@deepseek-ai/dsh-headless/startup'` | 解析 task / `--help`，provide `headlessStartup`。[E: packages/bundle/headless/cordis.patch.yml:23] |
| `headless-runner` | insert | `name: '@deepseek-ai/dsh-headless'`；`inject: [headlessStartup]`；`config.task: !!js ctx.headlessStartup.task` | 等服务就绪后把 task 写进 runner `Config`。[E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] |

没有 `agent-presets` 行，也没有 `webserver` / `web-runtime` / `ui-*` insert。本 overlay **不再** disable `hmr`：headless 靠模板 `patchReload: 'startup'` 让 `runProfile` 跳过 live watcher。[E: packages/boot/app-boot/src/profile.ts:116] [E: apps/cli/src/profile-boot.ts:355]

### 插件符号

| 符号 | 文件 | 值 |
|---|---|---|
| `name`（startup） | `startup.ts` | `'headless-startup'` [E: packages/bundle/headless/src/startup.ts:13] |
| `inject`（startup） | `startup.ts` | `['cmdlineArgs']` [E: packages/bundle/headless/src/startup.ts:16] |
| `HEADLESS_STARTUP_SERVICE` | `startup.ts` | `'headlessStartup'` [E: packages/bundle/headless/src/startup.ts:19] |
| `HeadlessStartupValues.task` | `startup.ts` | 非空任务字符串 |
| `name`（runner） | `index.ts` | `'headless-runner'` [E: packages/bundle/headless/src/index.ts:28] |
| `inject`（runner 插件） | `index.ts` | `['agentDefaultModel', 'agents', 'sessions']` [E: packages/bundle/headless/src/index.ts:31] |
| `Config.task` | `index.ts` | `z.string().required()` [E: packages/bundle/headless/src/index.ts:40] |
| `internals.stdout` / `stderr` | `index.ts` | 默认真 `process` 流；测试替换 [E: packages/bundle/headless/src/index.ts:58] |

### Host 面仍在的模型可见工具（来自 `dsh-base`，本 overlay **不** disable）

headless **不**像 web 那样把 base 的 `tool-*` 整表 `disabled: true` 再交给每会话 preset。web 对 `tool-bash` 的 disable 从这里开始。[E: packages/bundle/web-app/cordis.patch.yml:368] 下列 id 继续挂在 headless host 面（平台 `!!js` 仍生效）。**没有** `tool-str-replace-editor` 行——base 已不挂该包。

| id | package / 要点 | 源 |
|---|---|---|
| `tool-bash` | `@deepseek-ai/dsh-tool-bash`；`disabled` 当 `win32` | [E: packages/bundle/base/cordis.patch.yml:246] |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh`；`disabled` 当非 `win32` | [E: packages/bundle/base/cordis.patch.yml:250] |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | [E: packages/bundle/base/cordis.patch.yml:254] |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | [E: packages/bundle/base/cordis.patch.yml:260] |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | [E: packages/bundle/base/cordis.patch.yml:263] |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | [E: packages/bundle/base/cordis.patch.yml:283] |
| `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | [E: packages/bundle/base/cordis.patch.yml:343] |
| `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | [E: packages/bundle/base/cordis.patch.yml:346] |
| `tool-subagent` | `toolName: subagent`，`backgroundMode: continuable` | [E: packages/bundle/base/cordis.patch.yml:349] [E: packages/bundle/base/cordis.patch.yml:354] |
| `tool-subagent-fork` | `toolName: subagent_fork`，`backgroundMode: one-shot` | [E: packages/bundle/base/cordis.patch.yml:362] [E: packages/bundle/base/cordis.patch.yml:367] |
| `tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | [E: packages/bundle/base/cordis.patch.yml:374] |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | [E: packages/bundle/base/cordis.patch.yml:401] |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | [E: packages/bundle/base/cordis.patch.yml:408] |
| `tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | [E: packages/bundle/base/cordis.patch.yml:412] |
| `tool-web` | `fetch: true`，`searchTimeoutMs: 60000` | [E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/base/cordis.patch.yml:453] |

`plan-mode`、`skill` / `skill-filesystem`、jobs registry、`token-meter`、`subagent` registry 同样留在 host 面（base insert，headless 未 disable）。默认模型是 `provider: deepseek-official` / `model: deepseek-flash`。[E: packages/bundle/base/cordis.patch.yml:78] [E: packages/bundle/base/cordis.patch.yml:79] **不是** `deepseek-v4-flash`。成员资格仍只看这些 yml 行，不看 `apps/cli/package.json` 是否依赖了某个工具包。`dsh-experimental-tool-agent-team` 与 `tool-pwsh-persistent` **不**在这份 base insert 里。

## 装配与门控

**叠层（CLI `composeProfile`）**：`composeEntries([bundlePatches, profile.patches, homePatches, overlays])` 按这个数组顺序叠：bundle 层（`dsh.profile.bundles` 顺序，headless 默认先 `dsh-base` 再 `dsh-headless`）→ profile `$DSH_HOME/profiles/headless/cordis.patch.yml` → home `$DSH_HOME/cordis.patch.yml` → `--patch` overlays。[E: apps/cli/src/profile-boot.ts:237] `DSH_TELEMETRY_DISABLED` 非空且树里有 `session-telemetry-otel` 时再 push disable 该行。[E: apps/cli/src/profile-boot.ts:241] 默认 headless 树没有 `agent-presets` 行；`session-telemetry-otel` 行来自 `dsh-base`，env 开关仍然有效。

**旧三元组门控**：`loadProfile` 读完 manifest 必走 `normalizeShippedProfile`。[E: packages/boot/app-boot/src/profile.ts:829] 精确三元组被写成两元组并写入 `patchReload: 'startup'`；多一个用户 bundle 则保持原样。[E: packages/boot/app-boot/tests/profile.spec.ts:254] [E: packages/boot/app-boot/tests/profile.spec.ts:265]

**cmdline 门控**：`headless-startup.apply` 调 `parseCmdline`。[E: packages/bundle/headless/src/startup.ts:56] `task.trim() === ''`（无参数或纯空白）走 `program.error(...)`，**不** `provide(HEADLESS_STARTUP_SERVICE)`。[E: packages/bundle/headless/src/startup.ts:53] commander 拒绝被收成 `appExit`；测试里空 task 退出码 `1`，`--help` 退出码 `0`，两种情况 `runnerConfig` 都是 `undefined`。[E: packages/bundle/headless/tests/startup.spec.ts:101] [E: packages/bundle/headless/tests/startup.spec.ts:110] built-bin：`dsh --profile headless`（无 task）stderr 含 `a task is required`。[E: apps/cli/tests/built-bin.e2e.ts:397]

**runner 门控**：

1. 缺 `ctx.appExit` 时 `apply` 同步抛 `headless-runner: the launcher must provide ctx.appExit before the tree mounts`。[E: packages/bundle/headless/src/index.ts:225] [E: packages/bundle/headless/tests/headless.spec.ts:442]
2. `run` 先 `await ctx.get('loader')?.await()`，避免并发 mount 时工具 / adapter 半组成。[E: packages/bundle/headless/src/index.ts:173] 若 settlement 期间树已被 dispose，三个核心服务缺失则直接 `return`，**不**再 `appExit`。[E: packages/bundle/headless/src/index.ts:178]
3. `agents.create` 新 `SessionId('session-' + uuid)`，`meta.cwd = process.cwd()`，模型取 `agentDefaultModel.currentSelection()`。[E: packages/bundle/headless/src/index.ts:185] [E: packages/bundle/headless/src/index.ts:188]
4. `await agent.whenIdle()` → 记下 `firstSeq` → 挂 `streamReasoning`（`assistant/chunk` 的 `reasoning-delta` 写 stderr）→ **一次** `followup(createUserMessage({ content: [{ type: 'text', text: task }], source: { kind: 'user' } }))` → 再 `whenIdle`。[E: packages/bundle/headless/src/index.ts:198]
5. `sessions.flush` 之后才读 `summarize`：从 `firstSeq` 起，忽略 create 前的噪声 turn；每个非空 `assistant/message` 文本覆盖 `text`，最后一个 `turn/end` 的 `reason` 留下。[E: packages/bundle/headless/src/index.ts:206] [E: packages/bundle/headless/src/index.ts:79]
6. `stdout` 写 `text + '\n'`。`reason.kind === 'error'` 时 stderr 再写 `dsh: ${code}: ${message}`。`appExit(reason?.kind === 'completed' ? 0 : 1)`——无 turn、`aborted`、error 都是 `1`。[E: packages/bundle/headless/src/index.ts:208] [E: packages/bundle/headless/src/index.ts:212] 测试：跨两个 turn 只打印 `final answer`，顺序 `flush` 然后 `exit`；error reason 退出 `1` 且 stderr 为 `dsh: SERVER: provider unavailable`。[E: packages/bundle/headless/tests/headless.spec.ts:156] [E: packages/bundle/headless/tests/headless.spec.ts:325]
7. `run` 抛错（含 `agents.create` reject）走 `fail`：stderr `dsh: <message>`，`exit(1)`。[E: packages/bundle/headless/src/index.ts:160] [E: packages/bundle/headless/src/index.ts:228]

**HMR / patchReload**：模板是 `startup`。`runProfile` **只在** `composed.profile.patchReload === 'live'` 时补 watch-only HMR 并 `watchUserPatches`。[E: apps/cli/src/profile-boot.ts:355] 默认 headless 因此 **不**装 profile/home 文件 watcher；用户层仍在 boot 时 `allPatches` 叠一次。[E: apps/cli/src/profile-boot.ts:206] 若用户手改 manifest 把 `patchReload` 写成 `live`（或省略后 loader 回落到 custom 默认 `'live'`），才会走 watcher 路径。[E: packages/boot/app-boot/src/profile.ts:137]

**isolate**：headless 默认不 mount preset，也就没有 preset isolate 域、没有 `leakedServices` 检查。host 面上的 registry（`jobs` / `skill` / `subagent` / `token-meter` / `goal`）与 `tool-*` 同树。若部署自己在后续 patch 里 insert `agent-presets`，必须在 runner 的 `setup` 里 `bindScopeParent` 才能让 Agent 进 preset 面——默认 shipped 代码不做这一步。[E: packages/bundle/headless/src/index.ts:191]

## 跨包关系

- [`surface.cli.overview`](../cli/overview.md)：launcher 三种 mode、`rejectElectronProfile`、`--profile` / `--from-default-profile` / `--patch` / dump 互斥。headless 的 task positional 是 **app** 参数，不是 launcher 旗标。`dsh --profile sdk|sdk-minimal|acp|headless` 与 `dsh web` 并列。
- [`surface.profiles.web`](web.md)：`PROFILE_TEMPLATES.web` 是 `dsh-base + dsh-web-app` 且 `patchReload: live`；web overlay **disable** base 的模型可见 `tool-*`，再 insert `agent-presets` 且 `default: standard`。headless 反向：工具留在 host 面，不挂 roster，`startup` 冻结用户 patch。
- [`spine.composition-boot`](../../spine/composition-boot.md)：`loadProfile` / `composeEntries` / `composeProfile` 叠层与 `!!js` 求值。headless 是五个 `PROFILE_TEMPLATES` 名之一。
- [`spine.trace-headless-turn`](../../spine/trace-headless-turn.md)：从 `dsh --profile headless "<task>"` 走到 `turn/end` 的一次真实路径（startup provide → runner followup → loop → stdout）。
- [`surface.presets.overview`](../presets/overview.md)：shipped preset 成员资格只认 `packages/preset/agent-presets/presets/*/agent.cordis.yml`（`minimal` / `standard` / `ptc` / `cordis`）。那些目录存在 **不等于** headless 默认会 mount 它们。

## Sources

- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/src/startup.ts
- packages/bundle/headless/src/index.ts
- packages/bundle/headless/package.json
- packages/bundle/headless/tests/startup.spec.ts
- packages/bundle/headless/tests/headless.spec.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/tests/profile.spec.ts
- packages/boot/cmdline/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/core/tools/src/index.ts
- packages/preset/agent-presets/src/discovery.ts
- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/profile-boot.ts
- apps/cli/tests/args.spec.ts
- apps/cli/tests/built-bin.e2e.ts
- apps/cli/tests/profiles/headless/tests/keyless-smoke.e2e.ts
- packages/bundle/web-app/cordis.patch.yml

## 相关

- [`surface.cli.overview`](../cli/overview.md)
- [`surface.profiles.web`](web.md)
- [`spine.composition-boot`](../../spine/composition-boot.md)
- [`spine.trace-headless-turn`](../../spine/trace-headless-turn.md)
- [`surface.presets.overview`](../presets/overview.md)
