---
id: surface.presets.minimal
title: minimal preset
kind: surface
tier: T1
pkg: composition
source:
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/minimal/preset.yml
  - packages/preset/agent-presets/presets/standard/preset.yml
  - packages/preset/agent-presets/presets/ptc/preset.yml
  - packages/preset/agent-presets/presets/cordis/preset.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/core/system-prompt/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/persona/src/index.ts
  - packages/preset/persona/tests/persona.spec.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/shell/tool-pwsh-persistent/src/index.ts
  - packages/terminal/terminal/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/terminal/terminal-bash/src/config.ts
  - apps/cli/src/args.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols: [persona, persistent-shell, pty, terminal-bash, persistent-bash, terminal-pwsh, persistent-pwsh]
related: [surface.presets.overview, ref.presets]
evidence: explicit
status: verified
updated: c291e7961a
---

> `minimal` 是 shipped **agent preset** 目录 `packages/preset/agent-presets/presets/minimal/`：固定英文 `prefix` 当完整 system prompt，再在一个 `isolate` group 里挂持久 shell（POSIX 上模型名 `bash` / `@deepseek-ai/dsh-tool-bash-persistent`；win32 上模型名 `pwsh` / `@deepseek-ai/dsh-tool-pwsh-persistent`）。它改的是 **agent-preset 面**（每会话 tools / persona / isolate），不是 host 面（webserver / persistence / sandbox 策略 / subagent backends）。DSH 主线是 `profile → bundle → agent preset`；capability seam = Definition / Provider / Consumer；model-visible ⟺ logged。四个 shipped preset **都不挂** `str_replace_editor`；本目录也没有 `filesystem` / `fs-local` / `present`。

## 能回答的问题

- `minimal` 的成员资格以哪份文件为准？`preset.yml` 算不算成员？
- 模型在 `minimal` 会话里看见哪一个工具、哪一段 system prompt？POSIX 与 win32 差在哪？
- `complete: true` 与 `includeRuntimeContext: false` 分别关掉什么？`prefix` 写进哪个 section 名？
- `persistent-shell` isolate 哪个 Service？为什么不 isolate 会挂不上？
- `minimal` 有没有 compaction / skill 加载器 / subagent / plan / todo / jobs / web / `present` / `str_replace_editor`？web 默认会不会选它？headless / sdk / acp 会不会挂这份 composition？

## 是什么

DSH 是 Cordis **组合运行时**。进程先按 profile 叠 bundle patch，再（仅当树里有 roster）按会话 join 一个 agent preset。四个 shipped 目录名是 `minimal` / `standard` / `ptc` / `cordis`；旧名 `code` 现为 PTC。目录名就是 id，必有 composition 文件 `agent.cordis.yml`（`COMPOSITION_FILE`），可选显示文件 `preset.yml`（`METADATA_FILE`）。shipped 根是包内 `SHIPPED_PRESET_ROOT`。[E: packages/preset/agent-presets/src/discovery.ts:37][E: packages/preset/agent-presets/src/discovery.ts:60][E: packages/preset/agent-presets/src/metadata.ts:25]

成员资格**只认** `packages/preset/agent-presets/presets/minimal/agent.cordis.yml` 里的 plugin 行（含 `cordis:group` 子行）。仓库里有某个 `@deepseek-ai/dsh-tool-*` **不**等于本 preset 装了它。`preset.yml` 只贡献 `name` / `description` / `order`；`mountPreset` 读的是 composition 的 `preset.path`。[E: packages/preset/agent-presets/src/metadata.ts:75][E: packages/preset/agent-presets/src/mount.ts:386]

Web 装配下，host 全局工具层为空，模型可见工具改由每会话 preset 再挂。POSIX 上 `minimal` 挂上后，assembly 的 sections 只剩 `deployment:persona-prefix` 那一句固定英文，tools 只剩 `bash`；`compaction` Service 对本 agent 不存在；`serviceFor(..., 'fs')` 为 `undefined`（吃 host `fs-sandbox`）。[E: apps/cli/tests/web-agent-presets.e2e.ts:190][E: apps/cli/tests/web-agent-presets.e2e.ts:296][E: apps/cli/tests/web-agent-presets.e2e.ts:299][E: apps/cli/tests/web-agent-presets.e2e.ts:303][E: apps/cli/tests/web-agent-presets.e2e.ts:306]

## 入口

用户碰到 `minimal` 的路径是 **web profile 的 preset roster**，不是 CLI 子命令。五个 shipped `PROFILE_TEMPLATES` 是 `acp` / `web` / `headless` / `sdk` / `sdk-minimal`；其中只有 `web` 的 bundle 插入 `agent-presets`。`desktop` 不在模板里。[E: packages/boot/app-boot/src/profile.ts:105][E: packages/boot/app-boot/src/profile.ts:110]

1. `dsh web`（`--profile web`）叠 `@deepseek-ai/dsh-web-app`。该 bundle **insert** `id: agent-presets` / `@deepseek-ai/dsh-agent-presets`，composition default 写 `standard`（不是 `minimal`）。[E: packages/bundle/web-app/cordis.patch.yml:481][E: packages/bundle/web-app/cordis.patch.yml:484]
2. `AgentPresets.Config` 默认 `includeShippedRoot: true`、`includeUserRoot: true`。`resolvedRoots` 顺序：shipped `SHIPPED_PRESET_ROOT`（`trust: 'system'`）→ 配置 `roots` → `$DSH_HOME/.agent-presets`（`USER_PRESET_DIR`）。先到先得：shipped `minimal` 挡住用户根下同名目录。Web 的 row 不重写这些 flag，只设 `default: standard`。[E: packages/preset/agent-presets/src/index.ts:113][E: packages/preset/agent-presets/src/index.ts:182][E: packages/preset/agent-presets/src/discovery.ts:51]
3. `scanRoot` 扫子目录名；`minimal/` + `agent.cordis.yml` 成为 roster 行。`preset.yml` 的 `name: 极简模式`、`order: 3` 只影响显示排序。[E: packages/preset/agent-presets/presets/minimal/preset.yml:1][E: packages/preset/agent-presets/presets/minimal/preset.yml:3][E: packages/preset/agent-presets/src/discovery.ts:320]
4. 会话 factory 的 `setup(agentCtx)` 调用 `agentPresets.mount(agentCtx, 'minimal')`：`ensureStanding` 把 composition standing mount 一次，再 `bindScopeParent` 让该 agent 的 scope key 接到 mount 上。失败会从 `standing` map 删掉 pending、`dispose` 刚建的 scope，再把错误抛回 `setup`。[E: packages/preset/agent-presets/src/index.ts:436][E: packages/preset/agent-presets/src/index.ts:447][E: packages/preset/agent-presets/src/index.ts:810]

`AgentPresets.defaultId` 经 `selectionPolicy()` 读 settings 的 `default`（且 `modeSelectionEnabled`），否则用 composition `config.default`。Web 出厂 default 是 `standard`；要把新会话切到 `minimal`，靠 picker / `agent-preset/selected` / settings。[E: packages/preset/agent-presets/src/index.ts:247][E: apps/cli/tests/web-agent-presets.e2e.ts:229]

**headless / sdk / acp 不挂 preset roster。** headless insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:20][E: packages/bundle/headless/cordis.patch.yml:23][E: packages/bundle/headless/cordis.patch.yml:27] sdk overlay 是 `sdk-app-startup` + `sdk-jsonrpc-server`。[E: packages/bundle/sdk-app/cordis.patch.yml:13][E: packages/bundle/sdk-app/cordis.patch.yml:18] acp overlay 是 `acp-app-startup` + `acp`。[E: packages/bundle/acp-app/cordis.patch.yml:13][E: packages/bundle/acp-app/cordis.patch.yml:16] 这些 profile 的模型可见工具留在 host 面的 `dsh-base` 行上，**不是** 本目录这份 `minimal` composition。`sdk-minimal` 的 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`，不叠 base，也不挂 roster。[E: packages/boot/app-boot/src/profile.ts:122]

本仓没有 shipped TUI 包；help 例子里的 `tui` 只是自定义 profile 名（`HELP_EXAMPLES`），不在 `PROFILE_TEMPLATES` 里，不会自动带上 `minimal`。[E: apps/cli/src/args.ts:81]

## 关键字段

### `preset.yml`（显示元数据，不是成员表）

| 键 | 值 | 含义 |
|---|---|---|
| `name` | `极简模式` | picker 显示名；缺省回退到目录 id `minimal`。[E: packages/preset/agent-presets/presets/minimal/preset.yml:1] |
| `description` | `仅提供持久 shell 的单工具编码 Agent。` | 一句话说明（显示文案写 shell；POSIX 挂 `bash`，win32 挂 `pwsh`）。[E: packages/preset/agent-presets/presets/minimal/preset.yml:2] |
| `order` | `3` | `scanRoot` 按数值升序。shipped 对照：`standard`=`1`，`ptc`=`2`，`minimal`=`3`，`cordis`=`4`。[E: packages/preset/agent-presets/presets/minimal/preset.yml:3][E: packages/preset/agent-presets/presets/standard/preset.yml:3][E: packages/preset/agent-presets/presets/ptc/preset.yml:3][E: packages/preset/agent-presets/presets/cordis/preset.yml:3] |

### `agent.cordis.yml` 每一行 `id`（含 group 子行）

本文件一共 **2 个 top-level**（`persona` / `persistent-shell`）+ **5 个子行**。没有 `filesystem` / `fs-local` / `str-replace-editor` / `tool-bash` / `tool-pwsh` 一次性 shell 行；shell 走 PTY 栈，且 POSIX / win32 互斥 disable。

| `id` | `name` | isolate / config | 角色 |
|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | `prefix: You are a helpful software engineer assistant.`；`complete: true`；`includeRuntimeContext: false`。无 `suffix`。 | 在 standing mount 的 scope 里注册 `deployment:persona-prefix`。固定英文句，无 `{{model}}` / `{{cwd}}`。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:12][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:13][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:14] |
| `persistent-shell` | `cordis:group`（`group: true`） | `isolate.terminals: true` | 给 PTY 注册表一个独立 realm，避免 `terminals` 泄漏到 root。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:25] |
| `pty` | `@deepseek-ai/dsh-terminal` | （无额外 config） | Provider：`super(ctx, 'terminals')`。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:27][E: packages/terminal/terminal/src/index.ts:117] |
| `terminal-bash` | `@deepseek-ai/dsh-terminal-bash` | `disabled: !!js process.platform === 'win32'`；`timeoutMs: 300000`（包默认 `30_000`） | POSIX Consumer：`inject = ['terminals', 'sandboxPolicy', 'sessionProjections', 'subprocess']`。`terminals` 来自本 group；其余仍是 **host** 面。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:32][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:34][E: packages/terminal/terminal-bash/src/index.ts:27][E: packages/terminal/terminal-bash/src/config.ts:98] |
| `persistent-bash` | `@deepseek-ai/dsh-tool-bash-persistent` | 同样 win32 `disabled`；`timeoutMs: 300000`；覆盖多行 `description` | POSIX Consumer：注册 **model-visible** 名 `bash`。`inject = ['tools', 'terminals']`。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:36][E: packages/shell/tool-bash-persistent/src/index.ts:405][E: packages/shell/tool-bash-persistent/src/index.ts:432] |
| `terminal-pwsh` | `@deepseek-ai/dsh-terminal-bash` | `disabled: !!js process.platform !== 'win32'`；`shellDialect: pwsh`；`timeoutMs: 300000` | win32 Consumer：同一 `terminal-bash` 包，方言改成 pwsh。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:50][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:54] |
| `persistent-pwsh` | `@deepseek-ai/dsh-tool-pwsh-persistent` | POSIX `disabled`；`timeoutMs: 300000`；覆盖多行 `description` | win32 Consumer：注册 **model-visible** 名 `pwsh`（不是 `pwsh-persistent`）。`inject = ['tools', 'terminals']`。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:57][E: packages/shell/tool-pwsh-persistent/src/index.ts:442][E: packages/shell/tool-pwsh-persistent/src/index.ts:469] |

`persistent-bash` 的 `description` 与 e2e 常量 `MINIMAL_BASH_DESCRIPTION` 逐字相同；persona `prefix` 与 `MINIMAL_PROMPT` 相同。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:41][E: apps/cli/tests/web-agent-presets.e2e.ts:32][E: apps/cli/tests/web-agent-presets.e2e.ts:297]

### 本文件没有的 shipped 行（不要因为仓库有包就当成成员）

`standard` / `ptc` / `cordis` 会挂、本 yml **完全没有** 的 composition id 包括：

| 缺席 id / 能力 | 后果 |
|---|---|
| `agent-instructions` | 不装工作区指令收集。 |
| `tool-bash` / `tool-pwsh` | 无一过性 shell；持久栈按平台互斥。 |
| `tool-fs` / `tool-fs-search` | 模型看不见 `read` / `write` / `edit` / `glob` / `grep`。`serviceFor(agent, 'fs')` 为 `undefined`，`agent.ctx.get('fs')` 仍是 host `fs-sandbox`。[E: apps/cli/tests/web-agent-presets.e2e.ts:303][E: apps/cli/tests/web-agent-presets.e2e.ts:305] |
| `present` | 不登记 wire `present`（`@deepseek-ai/dsh-tool-present`）。 |
| `tool-jobs` | 没有 `job_list` / `job_output` / `job_kill`。 |
| `skill-filesystem` / `tool-skill` | 不装 skill 加载器。host 全局 skill 层仍可读，但工具表没有 `skill`。 |
| `tool-goal` | 没有 `create_goal` / `get_goal` / `update_goal`。 |
| `planning` / `plan-mode` | 没有 plan mode，没有 `exit_plan_mode`。 |
| `compaction` / `compaction-basic` / `command-compact` / `tool-result-pruner` | 无 compaction Service；`serviceFor(agent, 'compaction')` 与 `agent.ctx.get('compaction')` 都是 `undefined`。[E: apps/cli/tests/web-agent-presets.e2e.ts:306][E: apps/cli/tests/web-agent-presets.e2e.ts:307] |
| `delegation` 整组 | 没有 `subagent` / `subagent_fork` / `workflow` / `ralph`。 |
| `tool-ask-user` / `tool-todo` / `tool-web` | 没有 `ask_user_question` / `todo_write` / `web_search`。 |
| `tool-cordis` / `tool-presentation` | 不是 cordis / PTC preset。`surface.presets.code` 是 PTC 的稳定 wiki id，源目录是 `presets/ptc/`。 |
| `filesystem` / `fs-local` / `str-replace-editor` | 四个 shipped 都不挂 `str_replace_editor`。本文件也没有独立 fs isolate。 |

Web 上 POSIX `ctx.tools.schemas(minimalAgent)` 的排序名恰好是 `['bash']`。[E: apps/cli/tests/web-agent-presets.e2e.ts:323]

## 装配与门控

### persona：完整 prompt + 关掉 runtime context

`dsh-persona` 是 scope-only 行：它往 `ctx.systemPrompt` 注册与 host 同名的 `deployment:persona-prefix`（`PERSONA_PREFIX_SECTION`），从而影子掉 deployment 默认 prefix；它自己不 `provide` 任何 Service，所以**不必**进 isolate group。[E: packages/core/system-prompt/src/index.ts:174][E: packages/preset/persona/src/index.ts:63]

`complete: true` 只挂在 prefix 槽上。`assemble()` 仍跑 `system-prompt/assemble` waterfall，然后把那一个 complete section **恢复成唯一** prompt section；多于一个 complete section 会抛错。suffix 槽即便带 `{{unknown}}` 也会在 complete 之后丢掉。[E: packages/preset/persona/src/index.ts:67][E: packages/core/system-prompt/src/index.ts:590][E: packages/core/system-prompt/src/index.ts:624][E: packages/preset/persona/tests/persona.spec.ts:139]

`includeRuntimeContext: false` 调用 `ctx.systemPrompt.suppressRuntimeContext()`。被抑制时 `assemble()` 的 `contexts` 固定为 `[]`。[E: packages/preset/persona/src/index.ts:74][E: packages/core/system-prompt/src/index.ts:606]

Web e2e 对 `minimal` 断言 `assembly.sections` 等于 `[{ name: 'deployment:persona-prefix', text: 'You are a helpful software engineer assistant.' }]`——host 的 identity、Web 导向、工具指导、后置监听器都加不进这段 prompt。[E: apps/cli/tests/web-agent-presets.e2e.ts:296]

进入模型的 system 走独立 `system/message` 事件，不再写进 `request/header.system`。[E: packages/core/agent-loop/src/agent.ts:371]

### isolate：发布服务的行必须进 realm

`mountPreset` 拒绝无 scope 的 context；subtree 落定后跑 `leakedServices`：若把某个 Service 写进 `ctx.root[Context.isolate]` 的根符号，就抛错，文案要求「a preset service must sit behind an `isolate` realm or move to the host composition」。[E: packages/preset/agent-presets/src/mount.ts:378][E: packages/preset/agent-presets/src/mount.ts:210][E: packages/preset/agent-presets/src/mount.ts:409]

`pty` 发布 `ctx.terminals`。没有 `isolate.terminals` 时第一次 `mountPreset` 就会被拒绝。值为 `true` 的 isolate 把实现放在 realm-private 符号上：root 的 `ctx.get('terminals')` 看不到这份 PTY；本 group 内的 `inject` 才解析到 preset 自己的 Provider。

不发布 Service 的 tool 行（`persistent-bash`、`persistent-pwsh`、`persona`）注册进 host 的 `ctx.tools` / `ctx.systemPrompt` 的 **scope 层**，不需要 realm。

`inactiveRows` 会拒绝仍在等未提供 Service 的行。`terminal-bash` / `terminal-pwsh` 依赖 host 已装的 `sandboxPolicy`、`sessionProjections` 与 `subprocess`；缺了这些，本 preset 会在 mount 期失败。

### Web host 面 vs 本 preset 面

`dsh-web-app` 把 base 上的模型可见工具行设为 `disabled: true`（例如 `tool-bash`）。boot 后无 agent 时 `ctx.tools.schemas()` 为空；每个会话只看见自己 join 的 preset。[E: packages/bundle/web-app/cordis.patch.yml:368][E: apps/cli/tests/web-agent-presets.e2e.ts:194]

host 留下的是 registries 与策略：`tools`、`systemPrompt`、`skills`、`sandboxPolicy`、`subprocess`、`fs-sandbox`、`tokenMeter`、subagent backends。`minimal` 不搬走它们，只是不挂对应的 model-facing 行。因此：全局 skill 层对 `minimal` agent 仍可读，但没有 `skill` 工具；`fs` 走 host `fs-sandbox`，不是 preset 私有 `fs-local`。[E: packages/bundle/base/cordis.patch.yml:479][E: apps/cli/tests/web-agent-presets.e2e.ts:303]

同进程里一个 `standard` 会话与一个 `minimal` 会话工具表独立：拆掉 `minimal` 之后 `standard` 的工具数仍 `> 10`，全局层仍为空。[E: apps/cli/tests/web-agent-presets.e2e.ts:323][E: apps/cli/tests/web-agent-presets.e2e.ts:329][E: apps/cli/tests/web-agent-presets.e2e.ts:330]

### 失败怎么响

| 条件 | 行为 |
|---|---|
| 目录缺 `agent.cordis.yml` 或 YAML 不是 entry list | discovery 标 `broken`；`resolveMountable` / `mount` 失败。 |
| `pty` 没有对应 `isolate` | `leakedServices` 非空 → 抛错。 |
| `terminal-bash` 等不到 host `sandboxPolicy` / `subprocess` / `sessionProjections` | `inactiveRows` → mount 失败并 `dispose` 整棵 subtree。 |
| `setup` 里 `mount` / `ensureStanding` 拒绝 | pending 从 map 删除，scope `dispose`，错误抛回 `setup`。[E: packages/preset/agent-presets/src/index.ts:810] |
| 用户根也叫 `minimal` | shipped system root 先胜，用户那份不会上 roster。 |

## 跨包关系

- [`surface.presets.overview`](overview.md) — roster 发现（`COMPOSITION_FILE` / `METADATA_FILE` / `discoverPresets`）、standing mount、`defaultId`、`recompose`。本页只写 `minimal` 这份 composition 装了什么。
- [`ref.presets`](../../reference/presets.md) — 四份 shipped preset 的对照表（id / 显示名 / order / 一句话差异）。
- [`surface.presets.standard`](standard.md) — Web 默认 preset；本页缺席表里那些 id 的权威成员清单在那边。
- [`surface.presets.code`](code.md) / [`surface.presets.cordis`](cordis.md) — 另外两份 shipped 增量（`code` 节点是 PTC / `presets/ptc/` 的稳定别名）；`minimal` 没有 `tool-presentation` / `tool-cordis` / `present`。
- [`surface.tools.bash-persistent`](../tools/bash-persistent.md) — 模型名 `bash`、包 `@deepseek-ai/dsh-tool-bash-persistent`。同名不同包的一次性 `bash` 见 [`surface.tools.bash`](../tools/bash.md)。
- [`surface.tools.pwsh`](../tools/pwsh.md) — 持久 `pwsh`（`dsh-tool-pwsh-persistent`），win32 上 `minimal` 的 shell 工具。
- [`surface.profiles.web`](../profiles/web.md) — 默认安装路径；insert roster 且 disable base 模型可见工具行。
- [`surface.profiles.headless`](../profiles/headless.md) — 不挂 `agent-presets`；不要把 shipped preset 说成 headless 默认装配。
- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → --patch` 的叠层顺序。
- [`spine.capability-seams`](../../spine/capability-seams.md) — Definition / Provider / Consumer。本 preset 里：`ctx.terminals` 的 Provider 是 `pty`，Consumer 是 `terminal-bash` + `persistent-bash`（POSIX）或 `terminal-pwsh` + `persistent-pwsh`（win32）；`sandboxPolicy` / `subprocess` / `tools` / `fs` 的 Provider 在 host。

## Sources

- `packages/preset/agent-presets/presets/minimal/agent.cordis.yml`
- `packages/preset/agent-presets/presets/minimal/preset.yml`
- `packages/preset/agent-presets/presets/standard/preset.yml`
- `packages/preset/agent-presets/presets/ptc/preset.yml`
- `packages/preset/agent-presets/presets/cordis/preset.yml`
- `packages/boot/app-boot/src/profile.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/sdk-app/cordis.patch.yml`
- `packages/bundle/acp-app/cordis.patch.yml`
- `packages/core/system-prompt/src/index.ts`
- `packages/preset/agent-presets/src/discovery.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/src/metadata.ts`
- `packages/preset/agent-presets/src/mount.ts`
- `packages/preset/persona/src/index.ts`
- `packages/preset/persona/tests/persona.spec.ts`
- `packages/core/agent-loop/src/agent.ts`
- `packages/shell/tool-bash-persistent/src/index.ts`
- `packages/shell/tool-pwsh-persistent/src/index.ts`
- `packages/terminal/terminal/src/index.ts`
- `packages/terminal/terminal-bash/src/index.ts`
- `packages/terminal/terminal-bash/src/config.ts`
- `apps/cli/src/args.ts`
- `apps/cli/tests/web-agent-presets.e2e.ts`

## 相关

- [`surface.presets.overview`](overview.md) — agent preset 总览（发现、挂载、default、会话记录）
- [`ref.presets`](../../reference/presets.md) — shipped preset 对照 catalog

邻居（不在本节点 `related` 里，但 index 有对应 path）：[`surface.presets.standard`](standard.md)、[`surface.presets.code`](code.md)、[`surface.presets.cordis`](cordis.md)、[`surface.profiles.web`](../profiles/web.md)、[`surface.profiles.headless`](../profiles/headless.md)、[`surface.tools.bash-persistent`](../tools/bash-persistent.md)、[`spine.composition-boot`](../../spine/composition-boot.md)。
