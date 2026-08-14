---
id: surface.presets.minimal
title: minimal preset
kind: surface
tier: T1
pkg: composition
source:
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/preset.yml
  - apps/cli/config/agent-presets/standard/preset.yml
  - apps/cli/config/agent-presets/code/preset.yml
  - apps/cli/config/agent-presets/cordis/preset.yml
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - apps/cli/tests/windows-shell.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/core/system-prompt/src/index.ts
  - packages/fs/fs/src/index.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/persona/src/index.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/terminal/terminal/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/terminal/terminal-bash/src/config.ts
symbols: [persona, persistent-shell, pty, terminal-bash, persistent-bash, filesystem, fs-local, str-replace-editor]
related: [surface.presets.overview, ref.presets]
evidence: explicit
status: verified
updated: 47f943859b
---

> `minimal` 是 shipped **agent preset** 目录 `apps/cli/config/agent-presets/minimal/`：固定英文 persona 当完整 system prompt，再在两个 `isolate` group 里挂持久 `bash`（PTY 栈，包 `@deepseek-ai/dsh-tool-bash-persistent`）与 `str_replace_editor`（裸 `fs-local`）。它改的是 **agent-preset 面**（每会话 tools / persona / isolate），不是 host 面（webserver / persistence / sandbox 策略 / subagent backends）。DSH 主线是 `profile → bundle → agent preset`；capability seam = Definition / Provider / Consumer；model-visible ⟺ logged。

## 能回答的问题

- `minimal` 的成员资格以哪份文件为准？`preset.yml` 算不算成员？
- 模型在 `minimal` 会话里看见哪两个工具、哪一段 system prompt？
- `complete: true` 与 `includeRuntimeContext: false` 分别关掉什么？
- `persistent-shell` / `filesystem` 各自 isolate 哪个 Service？为什么不 isolate 会挂不上？
- `fs-local` 怎样影子 host 的 `fs-sandbox`？影子范围是整个进程还是本 preset 的 isolate 域？
- `minimal` 有没有 compaction / skill 加载器 / subagent / plan / todo / jobs / web？web 默认会不会选它？headless 会不会挂这份 composition？

## 是什么

DSH 不是「又一个 coding agent」，而是 Cordis **组合运行时**。进程先按 profile 叠 bundle patch，再（仅当树里有 roster）按会话 join 一个 agent preset。`minimal` 是四份 shipped preset 之一：目录名就是 id `minimal`，必有 composition 文件 `agent.cordis.yml`，可选显示文件 `preset.yml`。[E: packages/preset/agent-presets/src/discovery.ts:26][E: packages/preset/agent-presets/src/discovery.ts:160][E: packages/preset/agent-presets/src/metadata.ts:25]

成员资格**只认** `apps/cli/config/agent-presets/minimal/agent.cordis.yml` 里的 plugin 行（含 `cordis:group` 子行）。仓库或 `apps/cli/package.json` 里有某个 `@deepseek-ai/dsh-tool-*` **不**等于本 preset 装了它。`preset.yml` 只贡献 `name` / `description` / `order`；`mountPreset` 读的是 composition 的 `preset.path`，不是 `preset.yml`。[E: packages/preset/agent-presets/src/metadata.ts:75][E: packages/preset/agent-presets/src/mount.ts:340]

Web 装配下，host 全局工具层为空，模型可见工具改由每会话 preset 再挂。`minimal` 挂上后，assembly 的 sections 只剩 `deployment:persona` 那一句固定英文，tools 只剩 `bash` 与 `str_replace_editor`；`compaction` Service 对本 agent 不存在。[E: apps/cli/tests/web-agent-presets.e2e.ts:157][E: apps/cli/tests/web-agent-presets.e2e.ts:224][E: apps/cli/tests/web-agent-presets.e2e.ts:227][E: apps/cli/tests/web-agent-presets.e2e.ts:231]

## 入口

用户碰到 `minimal` 的路径是 **web profile 的 preset roster**，不是 CLI 子命令。

1. `dsh web`（`--profile web`）叠 `@deepseek-ai/dsh-web-app`。该 bundle **insert** `agent-presets`，composition default 写 `standard`（不是 `minimal`）。[E: packages/bundle/web-app/cordis.patch.yml:421][E: packages/bundle/web-app/cordis.patch.yml:424]
2. launcher 的 `composeProfile` 发现树里已有 `agent-presets` 行，再 overlay shipped root：`apps/cli/config/agent-presets/`，`trust: 'system'`。[E: apps/cli/src/profile-boot.ts:35][E: apps/cli/src/profile-boot.ts:159][E: apps/cli/src/profile-boot.ts:164]
3. `AgentPresets` 默认 `includeUserRoot: true`，在配置 roots 之后追加 `$DSH_HOME/.agent-presets`（`USER_PRESET_DIR`）。先到先得：shipped `minimal` 挡住用户根下同名目录。[E: packages/preset/agent-presets/src/index.ts:92][E: packages/preset/agent-presets/src/index.ts:134][E: packages/preset/agent-presets/src/discovery.ts:41][E: packages/preset/agent-presets/src/discovery.ts:181]
4. 发现扫描子目录名；`minimal/` + `agent.cordis.yml` 成为 roster 行。`preset.yml` 的 `name: 极简模式`、`order: 3` 只影响显示排序。[E: apps/cli/config/agent-presets/minimal/preset.yml:1][E: apps/cli/config/agent-presets/minimal/preset.yml:3][E: packages/preset/agent-presets/src/discovery.ts:167]
5. 会话 factory 的 `setup(agentCtx)` 调用 `agentPresets.mount(agentCtx, 'minimal')`：先 `ensureStanding` 把 composition standing mount 一次，再 `bindScopeParent` 让该 agent 的 scope key 接到 mount 上。`ensureStanding` 失败会删掉 pending、`dispose` 刚建的 scope，再把错误抛回 `setup`。[E: packages/preset/agent-presets/src/index.ts:281][E: packages/preset/agent-presets/src/index.ts:286][E: packages/preset/agent-presets/src/index.ts:528]

`AgentPresets.defaultId` 读 settings `agent-presets.default`，否则用 composition `config.default`。Web 出厂 default 是 `standard`；要把新会话切到 `minimal`，靠 picker / `agent-preset/selected` / settings，而不是改 shipped yml。[E: packages/preset/agent-presets/src/index.ts:192][E: apps/cli/tests/web-agent-presets.e2e.ts:192]

**headless 不挂 preset roster。** `packages/bundle/headless/cordis.patch.yml` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `agent-presets` 行；`composeProfile` 因此不会补 shipped root。headless 的模型可见工具留在 host 面的 `dsh-base` 行上，**不是** 本目录这份 `minimal` composition。[E: packages/bundle/headless/cordis.patch.yml:24][E: packages/bundle/headless/cordis.patch.yml:27][E: packages/bundle/headless/cordis.patch.yml:31]

本仓没有 shipped TUI 包；help 例子里的 `tui` 只是自定义 profile 名，不会自动带上 `minimal`。

## 关键字段

### `preset.yml`（显示元数据，不是成员表）

| 键 | 值 | 含义 |
|---|---|---|
| `name` | `极简模式` | picker 显示名；缺省回退到目录 id `minimal`。[E: apps/cli/config/agent-presets/minimal/preset.yml:1] |
| `description` | `仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent。` | 一句话说明。[E: apps/cli/config/agent-presets/minimal/preset.yml:2] |
| `order` | `3` | `scanRoot` 按数值升序。shipped 对照：`standard`=`1`，`code`=`2`，`minimal`=`3`，`cordis`=`4`。[E: apps/cli/config/agent-presets/minimal/preset.yml:3][E: apps/cli/config/agent-presets/standard/preset.yml:3][E: apps/cli/config/agent-presets/code/preset.yml:3][E: apps/cli/config/agent-presets/cordis/preset.yml:3] |

### `agent.cordis.yml` 每一行 `id`（含 group 子行）

本文件一共 **3 个 top-level** + **5 个子行**，各行都没有 `disabled:`。也没有 `tool-bash` / `tool-pwsh`——Windows 测试把这两个 id 断言为不在 entry 数组里，shell 走 PTY 栈。[E: apps/cli/tests/windows-shell.spec.ts:134]

| `id` | `name` | isolate / config | 角色 |
|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | `text: You are a helpful software engineer assistant.`；`complete: true`；`includeRuntimeContext: false` | 在 standing mount 的 scope 里注册 `deployment:persona`。固定英文句，无 `{{model}}` / `{{cwd}}`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:11][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:12][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:13] |
| `persistent-shell` | `cordis:group`（`group: true`） | `isolate.terminals: true` | 给 PTY 注册表一个独立 realm，避免 `terminals` 泄漏到 root。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:22] |
| `pty` | `@deepseek-ai/dsh-terminal` | （无额外 config） | Provider：`TerminalSessionService`，`super(ctx, 'terminals')`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:24][E: packages/terminal/terminal/src/index.ts:116] |
| `terminal-bash` | `@deepseek-ai/dsh-terminal-bash` | `timeoutMs: 300000`（包默认 `30_000`） | Consumer：`inject = ['terminals', 'sandboxPolicy', 'subprocess']`。`terminals` 来自本 group；`sandboxPolicy` / `subprocess` 仍是 **host** 面。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:27][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:30][E: packages/terminal/terminal-bash/src/index.ts:25][E: packages/terminal/terminal-bash/src/config.ts:57] |
| `persistent-bash` | `@deepseek-ai/dsh-tool-bash-persistent` | `timeoutMs: 300000`；覆盖多行 `description`（声明 persistent、无 internet、可用 apt/pip mirror） | Consumer：注册 **model-visible** 名 `bash`（不是 one-shot `dsh-tool-bash`）。`inject = ['tools', 'terminals']`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33][E: packages/shell/tool-bash-persistent/src/index.ts:375][E: packages/shell/tool-bash-persistent/src/index.ts:402] |
| `filesystem` | `cordis:group`（`group: true`） | `isolate.fs: true` | 给 `fs` 一个独立 realm，只对本 group 的 Consumer 生效。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:48][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] |
| `fs-local` | `@deepseek-ai/dsh-fs-local` | `cwd: !!js process.env.DSH_CWD ?? process.cwd()` | Provider：`LocalFileSystem` 继承 `FileSystem`，`super(ctx, 'fs')`。`cwd` 只是相对路径解析基准。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:54][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:57][E: packages/fs/fs/src/index.ts:88][E: packages/fs/fs-local/src/index.ts:108] |
| `str-replace-editor` | `@deepseek-ai/dsh-tool-str-replace-editor` | `maxOutputChars: 16000` | Consumer：注册 **model-visible** 名 `str_replace_editor`。`inject = ['tools', 'fs']`，因此吃到的是本 realm 的裸 `fs-local`，不是 host `fs-sandbox`。`path` 必须是绝对路径。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59][E: packages/fs/tool-str-replace-editor/src/index.ts:423][E: packages/fs/tool-str-replace-editor/src/index.ts:494][E: packages/fs/tool-str-replace-editor/src/index.ts:94] |

`persistent-bash` 的 `description` 与 e2e 常量 `MINIMAL_BASH_DESCRIPTION` 逐字相同；persona `text` 与 `MINIMAL_PROMPT` 相同。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:37][E: apps/cli/tests/web-agent-presets.e2e.ts:32][E: apps/cli/tests/web-agent-presets.e2e.ts:228]

### 本文件没有的 shipped 行（不要因为仓库有包就当成成员）

`standard` / `code` / `cordis` 会挂、本 yml **完全没有** 的 composition id 包括：

| 缺席 id / 能力 | 后果 |
|---|---|
| `agent-instructions` | 不装工作区指令收集。 |
| `tool-bash` / `tool-pwsh` | 无一过性 shell；Windows 也没有 pwsh 行。[E: apps/cli/tests/windows-shell.spec.ts:134] |
| `tool-fs` / `tool-fs-search` | 模型看不见 `read` / `write` / `edit` / `glob` / `grep`。 |
| `tool-jobs` | 没有 `job_list` / `job_output` / `job_kill`。 |
| `skill-filesystem` / `tool-skill` | 不装 skill 加载器。host 全局 skill 层仍可读，但工具表没有 `skill`。[E: apps/cli/tests/web-agent-presets.e2e.ts:396] |
| `tool-goal` | 没有 `create_goal` / `get_goal` / `update_goal`。 |
| `planning` / `plan-mode` | 没有 plan mode，没有 `exit_plan_mode`。 |
| `compaction` / `compaction-basic` / `command-compact` / `tool-result-pruner` | 无 compaction Service；`serviceFor(agent, 'compaction')` 与 `agent.ctx.get('compaction')` 都是 `undefined`。[E: apps/cli/tests/web-agent-presets.e2e.ts:231][E: apps/cli/tests/web-agent-presets.e2e.ts:232] |
| `delegation` 整组（`tool-subagent` / `tool-subagent-fork` / `tool-subagent-control` / list-agents / workflow / ralph，以及 disabled 的 product 行） | 没有 `subagent` / `subagent_fork` / `workflow` / `ralph`。 |
| `tool-ask-user` / `tool-todo` / `tool-web` | 没有 `ask_user_question` / `todo_write` / `web_search`。 |
| `tool-cordis` / `tool-presentation` | 不是 cordis / code preset。 |

Web 上 `ctx.tools.schemas(minimalAgent)` 的排序名恰好是 `['bash', 'str_replace_editor']`。[E: apps/cli/tests/web-agent-presets.e2e.ts:397]

## 装配与门控

### persona：完整 prompt + 关掉 runtime context

`dsh-persona` 是 scope-only 行：它往 `ctx.systemPrompt` 注册与 host 同名的 `deployment:persona`（`PERSONA_SECTION`），从而影子掉 deployment 默认 persona；它自己不 `provide` 任何 Service，所以**不必**进 isolate group。[E: packages/core/system-prompt/src/index.ts:128][E: packages/preset/persona/src/index.ts:61]

`complete: true` 传进 `section({ complete: true })`。`assemble()` 仍跑 `system-prompt/assemble` waterfall（工具 schema、变量、监听器都还在），然后把那一个 complete section **恢复成唯一** prompt section；多于一个 complete section 会抛错。[E: packages/preset/persona/src/index.ts:65][E: packages/core/system-prompt/src/index.ts:506][E: packages/core/system-prompt/src/index.ts:516][E: packages/core/system-prompt/src/index.ts:539]

`includeRuntimeContext: false` 调用 `ctx.systemPrompt.suppressRuntimeContext()`。被抑制时 `assemble()` 的 `contexts` 固定为 `[]`，包括 waterfall 监听器后加的 context；拥有那些事实的 Service 并不被 disable。[E: packages/preset/persona/src/index.ts:67][E: packages/core/system-prompt/src/index.ts:540]

Web e2e 对 `minimal` 断言 `assembly.sections` 等于 `[{ name: 'deployment:persona', text: 'You are a helpful software engineer assistant.' }]`——host 的 `harness:identity`、Web 导向、工具指导、后置监听器都加不进这段 prompt。[E: apps/cli/tests/web-agent-presets.e2e.ts:225]

### isolate：发布服务的行必须进 realm

`mountPreset` 在每行都激活之后跑 `leakedServices`：若 subtree 把某个 Service 写进 `ctx.root[Context.isolate]` 的根符号，就抛错，文案要求「a preset service must sit behind an `isolate` realm or move to the host composition」；外层再包成 `PresetMountError`。[E: packages/preset/agent-presets/src/mount.ts:200][E: packages/preset/agent-presets/src/mount.ts:365][E: packages/preset/agent-presets/src/mount.ts:379]

`pty` 发布 `ctx.terminals`，`fs-local` 发布 `ctx.fs`。没有对应 `isolate` 时，第一次 `mountPreset` 就会被 `leakedServices` 拒绝（实现落在 `rootIsolate[impl.name]`）。所以 `persistent-shell` 写 `isolate.terminals: true`，`filesystem` 写 `isolate.fs: true`。值为 `true` 的 isolate 把实现放在 realm-private 符号上：root 的 `ctx.get('fs')` 仍是 host `fs-sandbox`；本 group 内的 `inject` 才解析到 preset 自己的 Provider。

不发布 Service 的 tool 行（`persistent-bash`、`str-replace-editor`、`persona`）注册进 host 的 `ctx.tools` / `ctx.systemPrompt` 的 **scope 层**，不需要 realm。

`inactiveRows` 会拒绝仍在等未提供 Service 的行。`terminal-bash` 依赖 host 已装的 `sandboxPolicy` 与 `subprocess`；缺了这两项，本 preset 会在 mount 期失败，而不是静默少一个 bash。

### `fs-local` 只影子本 isolate 域

host / `dsh-base` 在进程级挂 `@deepseek-ai/dsh-fs-sandbox`（`id: fs-sandbox`），这是带策略围栏的 `ctx.fs`。[E: packages/bundle/base/cordis.patch.yml:443]

`minimal` 在 `isolate.fs: true` 的 group 里再挂 `@deepseek-ai/dsh-fs-local`。`LocalFileSystem` 不覆盖 `sandboxMode`；基类 getter 返回 `undefined`（不 confine）。同 group 的 `str_replace_editor` 构造 `MutationPolicy` 时看到 `ctx.fs.sandboxMode === undefined`，就不去要 `sandboxPolicy`，编辑走裸本地文件系统。[E: packages/fs/fs/src/index.ts:104][E: packages/fs/tool-str-replace-editor/src/index.ts:69]

这个影子**只对 `filesystem` group 里解析 `fs` 的 Consumer 有效**。host 行、其它 preset、浏览器 RPC 走 host 的 `fs-sandbox` 不变。Web 还把 base 上的 `tool-str-replace-editor`（host 目录 id，同样的包）`disabled: true`，避免该行留在全局层；`minimal` 用的是 preset 自己的 `id: str-replace-editor`。[E: packages/bundle/web-app/cordis.patch.yml:319][E: packages/bundle/base/cordis.patch.yml:384]

`cwd: !!js process.env.DSH_CWD ?? process.cwd()` 在 loader 读 yml 时求值。`LocalFileSystem.resolve` 用 `this.config.cwd` 解析相对路径；编辑器则在进 `ctx.fs.resolve` 之前就拒绝非绝对 `path`。[E: packages/fs/fs-local/src/index.ts:108][E: packages/fs/tool-str-replace-editor/src/index.ts:94]

### Web host 面 vs 本 preset 面

`dsh-web-app` 把 base 上的模型可见工具行设为 `disabled: true`（例如 `tool-bash`、`tool-str-replace-editor`）。boot 后无 agent 时 `ctx.tools.schemas()` 为空；每个会话只看见自己 join 的 preset。[E: packages/bundle/web-app/cordis.patch.yml:294][E: packages/bundle/web-app/cordis.patch.yml:319][E: apps/cli/tests/web-agent-presets.e2e.ts:157]

host 留下的是 registries 与策略：`tools`、`systemPrompt`、`skills`、`sandboxPolicy`、`subprocess`、`fs-sandbox`、`tokenMeter`、subagent backends。`minimal` 不搬走它们，只是不挂对应的 model-facing 行。因此：全局 skill 层对 `minimal` agent 仍可读，但没有 `skill` 工具；`tokenMeter` 在挂 `minimal` 之前就能 `ctx.get` 到，且该会话的 projection 仍含 `contextBreakdown` / `contextPressure` / `tokenUsage`。[E: apps/cli/tests/web-agent-presets.e2e.ts:170][E: apps/cli/tests/web-agent-presets.e2e.ts:181][E: apps/cli/tests/web-agent-presets.e2e.ts:396]

同进程里一个 `standard` 会话与一个 `minimal` 会话工具表独立：拆掉 `minimal` 之后 `standard` 的工具数仍 `> 10`，全局层仍为空。[E: apps/cli/tests/web-agent-presets.e2e.ts:248][E: apps/cli/tests/web-agent-presets.e2e.ts:254][E: apps/cli/tests/web-agent-presets.e2e.ts:255]

### 失败怎么响

| 条件 | 行为 |
|---|---|
| 目录缺 `agent.cordis.yml` 或 YAML 不是 entry list | discovery 标 `broken`；`resolveMountable` / `mount` 抛 `PresetMountError`。 |
| `pty` / `fs-local` 没有对应 `isolate` | `leakedServices` 非空 → `PresetMountError`。 |
| `terminal-bash` 等不到 host `sandboxPolicy` / `subprocess` | `inactiveRows` → mount 失败并 `dispose` 整棵 subtree。 |
| `setup` 里 `mount` / `ensureStanding` 拒绝 | pending 从 map 删除，scope `dispose`，错误抛回 `setup`；不会留下可用的 standing 行。[E: packages/preset/agent-presets/src/index.ts:528] |
| 用户根也叫 `minimal` | shipped system root 先胜，用户那份不会上 roster。 |

## 跨包关系

- [`surface.presets.overview`](overview.md) — roster 发现（`COMPOSITION_FILE` / `METADATA_FILE` / `discoverPresets`）、standing mount、`defaultId`、`recompose`。本页只写 `minimal` 这份 composition 装了什么。
- [`ref.presets`](../../reference/presets.md) — 四份 shipped preset 的对照表（id / 显示名 / order / 一句话差异）。
- [`surface.presets.standard`](standard.md) — Web 默认 preset；本页缺席表里那些 id 的权威成员清单在那边。
- [`surface.presets.code`](code.md) / [`surface.presets.cordis`](cordis.md) — 另外两份 shipped 增量；`minimal` 没有 `tool-presentation` / `tool-cordis`。
- [`surface.tools.bash-persistent`](../tools/bash-persistent.md) — 模型名 `bash`、包 `@deepseek-ai/dsh-tool-bash-persistent` 的 schema 与 PTY 执行。同名不同包的一次性 `bash` 见 [`surface.tools.bash`](../tools/bash.md)。
- [`surface.tools.str-replace-editor`](../tools/str-replace-editor.md) — 模型名 `str_replace_editor` 的 command 枚举与绝对路径约束。
- [`surface.profiles.web`](../profiles/web.md) — 默认安装路径；insert roster 且 disable base 模型可见工具行。
- [`surface.profiles.headless`](../profiles/headless.md) — 不挂 `agent-presets`；不要把 shipped preset 说成 headless 默认装配。
- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → --patch → shipped preset root` 的叠层顺序。
- [`spine.capability-seams`](../../spine/capability-seams.md) — Definition / Provider / Consumer。本 preset 里：`ctx.terminals` 的 Provider 是 `pty`，Consumer 是 `terminal-bash` + `persistent-bash`；`ctx.fs` 的 Provider 是 `fs-local`，Consumer 是 `str-replace-editor`；`sandboxPolicy` / `subprocess` / `tools` 的 Provider 在 host。

## Sources

- `apps/cli/config/agent-presets/minimal/agent.cordis.yml`
- `apps/cli/config/agent-presets/minimal/preset.yml`
- `apps/cli/config/agent-presets/standard/preset.yml`
- `apps/cli/config/agent-presets/code/preset.yml`
- `apps/cli/config/agent-presets/cordis/preset.yml`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/tests/web-agent-presets.e2e.ts`
- `apps/cli/tests/windows-shell.spec.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/core/system-prompt/src/index.ts`
- `packages/fs/fs/src/index.ts`
- `packages/fs/fs-local/src/index.ts`
- `packages/fs/tool-str-replace-editor/src/index.ts`
- `packages/preset/agent-presets/src/discovery.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/src/metadata.ts`
- `packages/preset/agent-presets/src/mount.ts`
- `packages/preset/persona/src/index.ts`
- `packages/shell/tool-bash-persistent/src/index.ts`
- `packages/terminal/terminal/src/index.ts`
- `packages/terminal/terminal-bash/src/index.ts`
- `packages/terminal/terminal-bash/src/config.ts`

## 相关

- [`surface.presets.overview`](overview.md) — agent preset 总览（发现、挂载、default、会话记录）
- [`ref.presets`](../../reference/presets.md) — shipped preset 对照 catalog

邻居（不在本节点 `related` 里，但 index 有对应 path）：[`surface.presets.standard`](standard.md)、[`surface.presets.code`](code.md)、[`surface.presets.cordis`](cordis.md)、[`surface.profiles.web`](../profiles/web.md)、[`surface.profiles.headless`](../profiles/headless.md)、[`surface.tools.bash-persistent`](../tools/bash-persistent.md)、[`surface.tools.str-replace-editor`](../tools/str-replace-editor.md)、[`spine.composition-boot`](../../spine/composition-boot.md)。
