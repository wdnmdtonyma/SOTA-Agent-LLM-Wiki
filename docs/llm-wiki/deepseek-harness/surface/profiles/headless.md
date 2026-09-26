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
  - packages/boot/app-boot/src/profile-context.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/boot/cmdline/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/core/tools/src/index.ts
  - packages/bundle/web-app/package.json
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/args.spec.ts
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
updated: 477b4f4205
---

> `headless` 是 DSH 的 **one-shot 进程 profile**：模板把 `@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-headless` 叠成一棵 **无 Host / 无 HTTP / 无 browser / 无 shipped preset 文件** 的 Cordis 树；`headless-startup` 把 task positional（以及 `--session-id` / `--json`）做成 `headlessStartup` 服务，`headless-runner` 在 host 面上 `agents.create` 一次或 adopt 指定 Session、`followup` 一次、把 reasoning 流到 stderr、打印最后一条 assistant text（或 NDJSON），再经 `ctx.appExit` 退出。`dsh headless` 与 `dsh --profile headless` 同一条 boot。`desktop` 不是第六个 CLI profile。

## 能回答的问题

- `dsh headless "<task>"` 与 `dsh --profile headless "<task>"` 是不是同一条 launcher 路径？task 几个词怎么拼成一句？
- 第一次启动会不会自动 `initProfile`？旧的三元组 `dsh-base + dsh-web-app + dsh-headless` 会不会被改回两元组？
- 这棵树有没有 webserver / `dsh-client-*` / shipped preset roster？模型看见的 `tool-*` 从哪一层来？
- 空 task、`--help`、`--json`、`--session-id`、Agent 工厂抛错时进程怎么退？
- `DSH_TOOLS_MODE` 在 headless overlay 里怎么写？overlay 怎样关掉 `hmr`？
- 和 `web` / `sdk` / `sdk-minimal` / `acp` 比，host 面 vs agent-preset 面差在哪？

## 是什么

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。capability seam 仍是 Definition / Provider / Consumer；`model-visible ⟺ logged` 对 headless 同样成立——runner 只打印 session 日志里已经 append 过的 assistant text，再 flush。

**profile** 是进程级目录 `$DSH_HOME/profiles/<name>`：`package.json` 的 `dsh.profile.bundles` 决定 bundle 层顺序，`cordis.patch.yml` 是用户层。**bundle** 是声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` 的 npm 包。四个 shipped agent preset **只叠在 `dsh-web-app`** 的 `dsh.bundle.patch` 列表里；headless 模板不含那些文件。[E: packages/bundle/web-app/package.json:43] [E: packages/bundle/headless/package.json:39]

`headless` 只走 profile 与 bundle，不挂 preset roster。模板名写在 `PROFILE_TEMPLATES.headless`：bundles `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-headless']`。[E: packages/boot/app-boot/src/profile.ts:186] 五个 shipped 模板是 `acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] 模板没有 `patchReload` 字段。[E: packages/boot/app-boot/src/profile.ts:43] `desktop` 不在这张表里。`@deepseek-ai/dsh-headless` 的 manifest 把 patch 指到本包 `./cordis.patch.yml`。[E: packages/bundle/headless/package.json:39]

相对其它入口：`dsh <name>` 是通用 `--profile` 简写，所以 `dsh headless "run the tests"` 与 `dsh --profile headless "run the tests"` 同一条 profile 模式。[E: apps/cli/src/args.ts:201] [E: apps/cli/src/args.ts:95] 本仓没有 shipped TUI 包；help 里的 `tui` 只是自定义 profile 示例。[E: apps/cli/src/args.ts:96] `dsh --profile desktop` 在 launcher 就被 `rejectElectronProfile` 拒绝。[E: apps/cli/src/args.ts:83]

本 bundle **不挂 preset roster**。`packages/bundle/headless/cordis.patch.yml` 的 `insert` 只有 `headless-startup` / `headless-runner` 两行，没有 `id: agent-preset-registry`，也没有 `code-runtime`。[E: packages/bundle/headless/cordis.patch.yml:21] [E: packages/bundle/headless/cordis.patch.yml:25] 因此 **不要** 把 `minimal` / `standard` / `ptc` / `cordis` 说成 headless 的默认装配。模型可见工具留在 **host 面**：`dsh-base` 已经 insert 的 `tool-*` 行，runner 在 root realm 上建 Agent，`setup` 只装 `installModelSelection`。[E: packages/bundle/headless/src/index.ts:340]

## 入口

用户 / 进程碰到 `headless` 的路径：

1. **Launcher**：`dsh headless …` 或 `dsh --profile headless …`。`parseDshArgs` 只吃 `--profile` / `--from-default-profile` / `--patch` / `--dump-*` / `-V`；第一个它不认识的 token 起全部交给 app。[E: apps/cli/src/args.ts:201] `dsh --profile headless run the tests` 解析成 `{ mode: 'profile', profile: 'headless', patches: [], args: ['run', 'the', 'tests'] }`。[E: apps/cli/tests/args.spec.ts:43]
2. **Dispatch**：`apps/cli/src/bin.ts` 在 `mode: 'profile'` 动态 `import('./profile-boot.ts')`，并以 `profile` / `fromDefaultProfile` 调用 `runProfile`。[E: apps/cli/src/bin.ts:23] [E: apps/cli/src/bin.ts:26]
3. **Boot**：`runProfile` → 文件内 `composeProfile` → `prepareProfile` → `loadProfile`。目录尚无 `package.json` 且名字在 `PROFILE_TEMPLATES` 里时，`initProfile(dir, template.bundles)` 写出 `$DSH_HOME/profiles/headless/`。[E: packages/boot/app-boot/src/profile.ts:715] 未知名字第一次 **不会**自动 init。[E: packages/boot/app-boot/src/profile.ts:712]
4. **App 旗标**：inner args 经 `provideCmdline` 冻成 `ctx.cmdlineArgs`，并提供 `ctx.appExit`。[E: packages/boot/cmdline/src/index.ts:84] `headless-startup` 用 commander 程序名 `dsh --profile headless`，位置参数 `[task...]`，多词 `join(' ')`。[E: packages/bundle/headless/src/startup.ts:40] [E: packages/bundle/headless/src/startup.ts:45] [E: packages/bundle/headless/src/startup.ts:99]
5. **真树入口**：`dsh --profile headless --dump-config` / `--dump-default-config` 走 `runDumpConfig`。[E: apps/cli/src/dump-config.ts:32]

## 关键字段

### Launcher / app 旗标

| 实例 | 谁解析 | 含义 |
|---|---|---|
| `--profile headless` 或简写 `dsh headless` | launcher `parseDshArgs` | 选 `$DSH_HOME/profiles/headless`。 |
| `[task...]` | `headless-startup` | 任务正文；多个 token 用空格拼成一句；单独的 `-` 从 stdin 读。[E: packages/bundle/headless/src/startup.ts:45] |
| `--json` | `headless-startup` | stdout 改打 NDJSON 事件流，而不是最后一条 assistant text。[E: packages/bundle/headless/src/startup.ts:43] |
| `--session-id <id>` | `headless-startup` | adopt 已有 Session；空 id 拒；带 preset 记录的 Session 拒（本 bundle 不 compose roster）。[E: packages/bundle/headless/src/startup.ts:44] [E: packages/bundle/headless/src/index.ts:217] |
| `-h` / `--help` | `headless-startup` | 打 app help，**不** provide `headlessStartup` |
| `--patch <path>`（可重复） | launcher | 叠在 profile / home 用户层之后。 |
| `--dump-config` / `--dump-default-config` / `--dump-config-schema` | launcher | 打印组合树 / schema 后退出；dump 不接受 app args。 |

`--host` / `--port` / `--trusted-host` / `--no-open` 是 **web** app 旗标，headless commander 不声明它们。

### 模板与历史三元组

| 符号 | 值 | 作用 |
|---|---|---|
| `PROFILE_TEMPLATES.headless` | bundles 两元组 | 第一次 `loadProfile('headless')` 自动 `initProfile` 时写入。[E: packages/boot/app-boot/src/profile.ts:186] [E: packages/boot/app-boot/src/profile.ts:715] |
| `INSTALLATION_OWNED_PROFILE_TUPLES.headless`（文件内，未导出） | `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-headless']` | 旧安装曾把 `dsh-web-app` 也写进 headless 清单。`normalizeShippedProfile` 只在 **精确等于** 这个三元组时，把 manifest 改回两元组模板。[E: packages/boot/app-boot/src/profile.ts:198] [E: packages/boot/app-boot/src/profile.ts:579] |

当前 shipped `headless` **不**叠 `dsh-web-app`；三元组只作为退役 heal 输入。

### `@deepseek-ai/dsh-headless` patch 每一行

`packages/bundle/headless/cordis.patch.yml` 叠在 `dsh-base` 的 insert 之后：

| id | 操作 | 字段 | 含义 |
|---|---|---|---|
| `system-prompt` | 覆盖 `config` | `personaPrefix` + `personaSuffix` | 部署级 persona **两字段**。[E: packages/bundle/headless/cordis.patch.yml:9] |
| `tools` | 覆盖 `config` | `mode: !!js process.env.DSH_TOOLS_MODE` | 进程级 PTC 呈现开关。[E: packages/bundle/headless/cordis.patch.yml:16] |
| `headless-startup` | insert | `name: '@deepseek-ai/dsh-headless/startup'` | 解析 task / `--help` / `--json` / `--session-id`，provide `headlessStartup`。[E: packages/bundle/headless/cordis.patch.yml:21] |
| `headless-runner` | insert | `name: '@deepseek-ai/dsh-headless'`；`inject: [headlessStartup]` | 等服务就绪后把 task / sessionId / json 写进 runner `Config`。[E: packages/bundle/headless/cordis.patch.yml:25] |
| `hmr` | `disabled: true` | — | overlay 关掉 base 那条 watch 行。[E: packages/bundle/headless/cordis.patch.yml:33] |

没有 `agent-preset-registry` 行，也没有 `webserver` / `web-runtime` / `ui-*` insert。PTC runtime 来自 **base** 的 `id: ptc-runtime`（`@deepseek-ai/dsh-ptc-runtime-node`），不是本 overlay 再插一份 `code-runtime`。[E: packages/bundle/base/cordis.patch.yml:389]

### 插件符号

| 符号 | 文件 | 值 |
|---|---|---|
| `name`（startup） | `startup.ts` | `'headless-startup'` [E: packages/bundle/headless/src/startup.ts:16] |
| `inject`（startup） | `startup.ts` | `['cmdlineArgs']` [E: packages/bundle/headless/src/startup.ts:19] |
| `HEADLESS_STARTUP_SERVICE` | `startup.ts` | `'headlessStartup'` [E: packages/bundle/headless/src/startup.ts:22] |
| `name`（runner） | `index.ts` | `'headless-runner'` [E: packages/bundle/headless/src/index.ts:36] |
| `inject`（runner 插件） | `index.ts` | `['agentDefaultModel', 'agents', 'sessions']` [E: packages/bundle/headless/src/index.ts:39] |

### Host 面仍在的模型可见工具（来自 `dsh-base`，本 overlay **不** disable）

headless **不**像 web 那样把 base 的 `tool-*` 整表 `disabled: true` 再交给每会话 preset。下列 id 继续挂在 headless host 面（平台 `!!js` 仍生效）。**没有** `tool-str-replace-editor` 行。

| id | 要点 | 源 |
|---|---|---|
| `tool-bash` / `tool-pwsh` | 平台互斥 disable | [E: packages/bundle/base/cordis.patch.yml:266] |
| `tool-jobs` / `tool-fs` / `tool-fs-search` | host 直挂 | [E: packages/bundle/base/cordis.patch.yml:274] |
| `tool-subagent` | `backgroundMode: continuable` | [E: packages/bundle/base/cordis.patch.yml:374] |
| `tool-subagent-fork` | base 行 `backgroundMode: one-shot`（shipped web preset 才会改成 `continuable`） | [E: packages/bundle/base/cordis.patch.yml:387] |
| `tool-workflow` / `ptc-runtime` | host 直挂 | [E: packages/bundle/base/cordis.patch.yml:389] |

默认模型是 `provider: deepseek-official` / `model: deepseek-flash`。[E: packages/bundle/base/cordis.patch.yml:85] [E: packages/bundle/base/cordis.patch.yml:86] **不是** `deepseek-v4-flash`。

## 装配与门控

**叠层**：bundle（先 `dsh-base` 再 `dsh-headless`）→ profile `$DSH_HOME/profiles/headless/cordis.patch.yml` → home `$DSH_HOME/cordis.patch.yml` → `--patch` overlays。[E: packages/boot/app-boot/src/profile-context.ts:65] `DSH_TELEMETRY_DISABLED` 非空且树里有 `session-telemetry-otel` 时再 push disable 该行。默认 headless 树没有 `agent-preset-registry` 行。

**旧三元组门控**：`loadProfile` 读完 manifest 必走 `normalizeShippedProfile`。精确三元组被写成两元组；多一个用户 bundle 则保持原样。

**cmdline 门控**：`headless-startup.apply` 调 `parseCmdline`。[E: packages/bundle/headless/src/startup.ts:78] 交互式 tty 且无 task → `program.error`，**不** `provide(HEADLESS_STARTUP_SERVICE)`。[E: packages/bundle/headless/src/startup.ts:105] `--help` 同样不 provide。

**runner 门控**：缺 `ctx.appExit` 时 `apply` 同步抛 `headless-runner: the launcher must provide ctx.appExit before the tree mounts`。[E: packages/bundle/headless/src/index.ts:396] 成功路径：`installModelSelection` 后 **一次** `followup`。[E: packages/bundle/headless/src/index.ts:340] [E: packages/bundle/headless/src/index.ts:365] 空 task 在 runner 里也会抛同一句 `a task is required`。[E: packages/bundle/headless/src/index.ts:329]

**isolate**：headless 默认不 mount preset，也就没有 preset isolate 域、没有 `leakedServices` 检查。host 面上的 registry 与 `tool-*` 同树。

## 跨包关系

- [`surface.cli.overview`](../cli/overview.md)：launcher 四种 mode、`dsh <name>` 简写、`rejectElectronProfile`。headless 的 task positional 是 **app** 参数，不是 launcher 旗标。
- [`surface.profiles.web`](web.md)：`PROFILE_TEMPLATES.web` 是 `dsh-base + dsh-web-app`；web overlay **disable** base 的模型可见 `tool-*`，再 insert `agent-preset-registry` 且叠四份 preset。headless 反向：工具留在 host 面，不挂 roster。
- [`spine.composition-boot`](../../spine/composition-boot.md)：`loadProfile` / `composeEntries` / `composeProfile` 叠层与 `!!js` 求值。
- [`spine.trace-headless-turn`](../../spine/trace-headless-turn.md)：从 `dsh headless "<task>"` 走到 `turn/end` 的一次真实路径。
- [`surface.presets.overview`](../presets/overview.md)：四个 shipped preset 声明存在 **不等于** headless 默认会 mount 它们。

## Sources

- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/src/startup.ts
- packages/bundle/headless/src/index.ts
- packages/bundle/headless/package.json
- packages/bundle/headless/tests/startup.spec.ts
- packages/bundle/headless/tests/headless.spec.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/src/profile-context.ts
- packages/boot/app-boot/tests/profile.spec.ts
- packages/boot/cmdline/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/core/tools/src/index.ts
- packages/bundle/web-app/package.json
- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/profile-boot.ts
- apps/cli/tests/args.spec.ts

## 相关

- [`surface.cli.overview`](../cli/overview.md)
- [`surface.profiles.web`](web.md)
- [`spine.composition-boot`](../../spine/composition-boot.md)
- [`spine.trace-headless-turn`](../../spine/trace-headless-turn.md)
- [`surface.presets.overview`](../presets/overview.md)
