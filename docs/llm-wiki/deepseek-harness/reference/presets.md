---
id: ref.presets
title: shipped preset 对照表
kind: catalog
tier: T3
pkg: composition
source:
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/preset/agent-presets/presets/minimal/preset.yml
  - packages/preset/agent-presets/presets/standard/preset.yml
  - packages/preset/agent-presets/presets/ptc/preset.yml
  - packages/preset/agent-presets/presets/cordis/preset.yml
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/persona/src/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - minimal
  - standard
  - ptc
  - cordis
  - COMPOSITION_FILE
  - METADATA_FILE
  - SHIPPED_PRESET_ROOT
related:
  - surface.presets.overview
  - surface.presets.minimal
  - surface.presets.standard
  - surface.presets.code
  - surface.presets.cordis
  - spine.composition-boot
  - subsys.composition.agent-presets
  - surface.profiles.web
  - surface.profiles.headless
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 0a53fb55be
---

> shipped **agent preset** 是目录名 = id 的四份 composition：`packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/`。旧目录名 `code` 现为 **PTC**（`presets/ptc/`）；wiki 节点 id `surface.presets.code` / `subsys.core.code-mode` 是稳定别名。每份必有 `COMPOSITION_FILE`（`agent.cordis.yml`），可选 `METADATA_FILE`（`preset.yml`，只供 picker 文案与 `order`）。成员资格只认那四个 `agent.cordis.yml` 里的插件 `id:`（含 `cordis:group` 与 `disabled` 行，以及 group 子行）。DSH 主线是 `profile → bundle → agent preset`；本表管 **agent-preset 面**（每会话 tools / persona / isolate），不管 host 面。五个 shipped profile：`web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。只有 **web** 挂 `@deepseek-ai/dsh-agent-presets` 且 `default: standard`。

## 能回答的问题

- 四个 shipped preset 的目录 id、`preset.yml` `name` / `order`、谁是 web 出厂 default？
- 某个插件 `id:` 在 `minimal` / `standard` / `ptc` / `cordis` 是否装、是否 `disabled`、isolate 哪个 Service、关键 Config 是什么？
- 成员资格认 `agent.cordis.yml` 还是认「仓库里有这个包」？`preset.yml` 能不能把一个包写进产品？
- `dsh web` 怎样挂 roster？`dsh --profile headless|sdk|sdk-minimal|acp` 会不会 mount 这四份 composition？
- `persistent-bash` / `persistent-pwsh` / `tool-presentation` / `tool-cordis` 分别只出现在哪个 preset？
- 发布服务的行不写 `isolate` 会怎样？`tokenMeter` / `subagents` registry 为什么不进 preset realm？

## 范围与 ground truth

本页是 T3 **对照 catalog**。一行 = 一个插件 `id:`（四个 yml 的 top-level 行，加上 group 子行与 `disabled: true` 行），或一行 = 一份 `preset.yml` 元数据。分组是为了读，不是为了丢实例。

成员资格 **只认** `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/agent.cordis.yml`。`COMPOSITION_FILE` 是 `agent.cordis.yml`。[E: packages/preset/agent-presets/src/discovery.ts:37] `preset.yml` 只读 `name` / `description` / `order`，读失败降级为空元数据，composition 仍可 mount。[E: packages/preset/agent-presets/src/metadata.ts:25][E: packages/preset/agent-presets/src/metadata.ts:63]

目录名才是 preset id：`scanRoot` 把 `child.name` 写成 `id`。[E: packages/preset/agent-presets/src/discovery.ts:313] shipped 根是包内 `SHIPPED_PRESET_ROOT`（`../presets/`）。[E: packages/preset/agent-presets/src/discovery.ts:60] 用户根是 `$DSH_HOME/.agent-presets`。[E: packages/preset/agent-presets/src/discovery.ts:51]

**不要**把下列东西写成 preset 成员：workspace 里存在的 `@deepseek-ai/dsh-tool-*` 包；`packages/bundle/base/cordis.patch.yml` 的 host 工具行；web bundle 里被 `disabled: true` 的同名 host 行。那些是 host 面或仓库库存。headless / sdk / acp 用的就是 base 的 host 行（`sdk-minimal` 自带完整 insert），不是本表任何一份 shipped composition。

官方 `docs/**` 与 README 只当查漏，不当 `[E]`。单 preset 叙事在 T1 `surface.presets.*`；发现 / standing mount / `composeFrom` 在 T2 `subsys.composition.agent-presets`；模型可见 wire 名全集在 `ref.tools-catalog`。本页只回答「这四份 yml 装了哪几行」。

`mountPreset` 拒绝无 scope 的 context。[E: packages/preset/agent-presets/src/mount.ts:382] 树 settle 后 `leakedServices` 列出 publish 进 **root isolate** 的名字；非空则抛「a preset service must sit behind an `isolate` realm or move to the host composition」。[E: packages/preset/agent-presets/src/mount.ts:210][E: packages/preset/agent-presets/src/mount.ts:221][E: packages/preset/agent-presets/src/mount.ts:407][E: packages/preset/agent-presets/src/mount.ts:411]

表内单元格：`装` = 该 yml 有这一 `id:` 且未写死 `disabled: true`；`禁` = 行在但 `disabled: true`；`win32 禁` / `非 win32 禁` = `!!js` 平台门；`—` = 该 yml 没有这一 `id:`。

## 实例表

### shipped preset 元数据

`METADATA_FILE` 不是成员表。web 出厂 default 写在 web bundle 的 `agent-presets` 行上，不写在 `preset.yml`。[E: packages/preset/agent-presets/src/metadata.ts:25][E: packages/bundle/web-app/cordis.patch.yml:442][E: packages/bundle/web-app/cordis.patch.yml:445]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `standard` | 目录 id；`preset.yml` `name: 标准模式` `order: 1` | **web 出厂 default** | picker「标准模式」。完整编码面：persona / 指令 / 平台互斥 shell / fs / jobs / skills / goals / plan / compaction / delegation / ask / todo / web。 | `AgentPresets.Config.default` 必填；web patch 写成 `standard`；`defaultId` = settings `agent-presets.default` 否则 `config.default`。 | `packages/preset/agent-presets/presets/standard/preset.yml` [E: packages/preset/agent-presets/presets/standard/preset.yml:1][E: packages/preset/agent-presets/presets/standard/preset.yml:3][E: packages/preset/agent-presets/src/index.ts:105][E: packages/preset/agent-presets/src/index.ts:241] |
| `ptc` | 目录 id；`name: PTC 模式` `order: 2` | 非 default | 同构于 `standard` 的成员，再加 `tool-presentation` `mode: ptc`。须在 picker / settings 显式选。wiki 节点仍叫 `surface.presets.code`。 | PTC 是 per-agent presentation，不是 web 出厂会话。 | `packages/preset/agent-presets/presets/ptc/preset.yml` [E: packages/preset/agent-presets/presets/ptc/preset.yml:1][E: packages/preset/agent-presets/presets/ptc/preset.yml:3] |
| `minimal` | 目录 id；`name: 极简模式` `order: 3` | 非 default | 固定英文 persona + 持久 shell（POSIX `bash` / win32 `pwsh`）+ `str_replace_editor`。无 compaction / skill / subagent / web / plan / todo / jobs。 | 双工具面；`order: 3` 只影响 shipped 集合排序。 | `packages/preset/agent-presets/presets/minimal/preset.yml` [E: packages/preset/agent-presets/presets/minimal/preset.yml:1][E: packages/preset/agent-presets/presets/minimal/preset.yml:3] |
| `cordis` | 目录 id；`name: 创造模式` `order: 4` | 非 default | 同构于 `standard` 再加 `tool-cordis`，且 `skill-filesystem.customSkillDirs` 指向本目录 `skills/`。 | 用来 copy / 创作用户 preset；出厂不默认打开自修改工具。 | `packages/preset/agent-presets/presets/cordis/preset.yml` [E: packages/preset/agent-presets/presets/cordis/preset.yml:1][E: packages/preset/agent-presets/presets/cordis/preset.yml:3] |

web e2e：system 根只供应这四个 id，全部 `trust === 'system'`，`defaultId === 'standard'`。[E: apps/cli/tests/web-agent-presets.e2e.ts:218][E: apps/cli/tests/web-agent-presets.e2e.ts:219][E: apps/cli/tests/web-agent-presets.e2e.ts:220]

`scanRoot` 排序：声明了 `order` 的按数值升序，其余按 id。shipped 读起来是 `standard` → `ptc` → `minimal` → `cordis`。[E: packages/preset/agent-presets/src/discovery.ts:319][E: packages/preset/agent-presets/src/discovery.ts:320]

### 身份

| 名 | 类型/签名 | min | std（web 默认） | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 装 | 装 | 装 | 装 | min：`text` 固定 `You are a helpful software engineer assistant.`，`complete: true`，`includeRuntimeContext: false`。std / ptc：一句 `{{model}}` / `{{cwd}}`，不写 `complete` / `includeRuntimeContext`（插件默认 `complete: false`、`includeRuntimeContext: true`）。cordis：多段 text（Harness / HOST vs AGENT PRESET / 禁止改 shipped 目录 / 先 load `editing-cordis-compositions`），同样不写 `complete`。 | min 把 persona 当完整 system prompt；其余只 shadow 部署 persona。 | min [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:9][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:13][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:14]；std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:24]；ptc [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:31]；cordis [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:17]；schema [E: packages/preset/persona/src/index.ts:46][E: packages/preset/persona/src/index.ts:47] |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | — | 装 | 装 | 装 | `maxBytes: 65536`。workspace 指令 section，不是 tool。 | min 的 `complete: true` 本来就会压掉其它 section；三份完整面才挂指令。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:30][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:33]；ptc [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:37]；cordis [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:31] |

### `minimal` 专属 isolate

这两行 group **只出现在** `minimal/agent.cordis.yml`。std / ptc / cordis 没有 `persistent-shell` / `filesystem`，也没有子 id `pty` / `terminal-bash` / `persistent-bash` / `terminal-pwsh` / `persistent-pwsh` / `fs-local` / `str-replace-editor`。

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `persistent-shell` | `cordis:group` | 装 | — | — | — | `group: true`；`isolate.terminals: true`。子行：`pty` / `terminal-bash` / `persistent-bash` / `terminal-pwsh` / `persistent-pwsh`。 | PTY 栈是 agent-owned service，必须进 entry-local realm，否则泄漏 root。POSIX 与 win32 各装一套。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:23][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:25] |
| `pty` | `@deepseek-ai/dsh-terminal`（组内） | 装 | — | — | — | 无额外 config。给持久 shell 提供 `terminals`。 | 与 bash / pwsh 后端同 realm。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:27] |
| `terminal-bash` | `@deepseek-ai/dsh-terminal-bash`（组内） | 装 · win32 禁 | — | — | — | `timeoutMs: 300000`。`disabled: !!js process.platform === 'win32'`。 | POSIX PTY bash 后端。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:30][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:32] |
| `persistent-bash` | `@deepseek-ai/dsh-tool-bash-persistent`（组内） | 装 · win32 禁 | — | — | — | `timeoutMs: 300000`；自带长 `description`。模型看见的 wire 名是 `bash`（persistent），不是 one-shot `dsh-tool-bash`。 | min 只要跨调用有状态的 shell。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:36][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:38] |
| `terminal-pwsh` | `@deepseek-ai/dsh-terminal-bash`（组内） | 装 · 非 win32 禁 | — | — | — | `shellDialect: pwsh`，`timeoutMs: 300000`。`disabled: !!js process.platform !== 'win32'`。 | win32 上仍走 `dsh-terminal-bash`，方言改成 pwsh。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:51][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:53][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:55] |
| `persistent-pwsh` | `@deepseek-ai/dsh-tool-pwsh-persistent`（组内） | 装 · 非 win32 禁 | — | — | — | `timeoutMs: 300000`。模型看见的 wire 名是 **`pwsh`**（persistent）。 | 对标 persistent bash。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:58][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:60] |
| `filesystem` | `cordis:group` | 装 | — | — | — | `group: true`；`isolate.fs: true`。子行：`fs-local` / `str-replace-editor`。 | 裸 local fs 只影子本 preset 的 `fs` realm，不换掉进程级 host `fs-sandbox`。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:74][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:76][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:78] |
| `fs-local` | `@deepseek-ai/dsh-fs-local`（组内） | 装 | — | — | — | `cwd: !!js process.env.DSH_CWD ?? process.cwd()`。 | 给 editor 一条不经 host sandbox provider 的 local fs。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:80][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:83] |
| `str-replace-editor` | `@deepseek-ai/dsh-tool-str-replace-editor`（组内） | 装 | — | — | — | `maxOutputChars: 16000`。模型看见 `str_replace_editor`。 | min 的文件工具；std 用 `tool-fs` 的 `read`/`write`/`edit` 代替。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:85][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:88] |

unix web e2e：mount `minimal` 后 assembly tools 恰好 `bash` + `str_replace_editor`，且 `compaction` 对本 agent 不存在。[E: apps/cli/tests/web-agent-presets.e2e.ts:290][E: apps/cli/tests/web-agent-presets.e2e.ts:296]

### shell / filesystem / jobs（标准面）

这些行 **只出现在** std / ptc / cordis。它们注册进 host `tools`，自己不 `provide`，因此没有 isolate。

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | — | 装 · win32 禁 | 装 · win32 禁 | 装 · win32 禁 | `disabled: !!js process.platform === 'win32'`。one-shot `bash`，消费 host `shell-env` / `bash-sandbox`。 | 与 `tool-pwsh` 平台互斥；min 改走 persistent 包。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:44][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:46] |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | — | 装 · 非 win32 禁 | 装 · 非 win32 禁 | 装 · 非 win32 禁 | `disabled: !!js process.platform !== 'win32'`。one-shot `pwsh`。 | win32 上的 shell 位。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:48][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:50] |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | — | 装 | 装 | 装 | 无行内 config。`read` / `read_image` / `write` / `edit`。`fs` policy 留在 host。 | 标准面文件工具；不是 `str_replace_editor`。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:56] |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | — | 装 | 装 | 装 | `sampleOverCapGlobResults: false`。登记 `glob` / `grep`。 | 搜索与读写拆包；cap 行为写死在 preset。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:59][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:62] |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | — | 装 | 装 | 装 | 无 config。`job_list` / `job_output` / `job_kill`。jobs **registry** 在 host。 | preset 只决定模型能不能收割后台任务。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:73] |

### skills / goals

`skill-filesystem` / `tool-skill` 在 std / ptc 写在 `tool-jobs` 之后；cordis 把它们挪到 `tool-cordis` 之后并加 `customSkillDirs`。id 仍算装。min 两行都没有。

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | — | 装 | 装 | 装（带 `customSkillDirs`） | std / ptc：无 `customSkillDirs`。cordis：`customSkillDirs` 一条 `!!js`，把 `new URL('skills/', baseUrl)` 解析成本 preset 目录下的 `skills/`。skill **registry** 在 host；本行写入该 preset 的层。 | cordis 要把 `editing-cordis-compositions` 跟着 preset 走。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:83]；cordis [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:261][E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:264][E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:265] |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | — | 装 | 装 | 装 | 无 config。模型看见 `skill`。 | 给该 Agent 目录与 loader。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:86]；cordis [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:267] |
| `command-goal` | `@deepseek-ai/dsh-command-goal` | — | 装 | 装 | 装 | 人命令 `/goal`，不进模型 tool catalog。 | 与 `tool-goal` 同属 preset 层；min 不要。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:94] |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | — | 装 | 装 | 装 | 无 config。`create_goal` / `get_goal` / `update_goal`。goals **service** 在 host。 | 只决定模型能不能调 goal 工具。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:97]；cordis [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:85] |

cordis e2e：scoped skill list 含 `editing-cordis-compositions`，无 scope 的全局 list 不含该名。[E: apps/cli/tests/web-agent-presets.e2e.ts:345][E: apps/cli/tests/web-agent-presets.e2e.ts:346]

### `planning` 组

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `planning` | `cordis:group` | — | 装 | 装 | 装 | `group: true`；`isolate.planMode: true`。子行：`plan-mode`。 | plan 状态按 agent 活；entry-local realm 是正确寿命。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:104][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:108]；ptc [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:111]；cordis [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:92] |
| `plan-mode` | `@deepseek-ai/dsh-plan-mode`（组内） | — | 装 | 装 | 装 | 长 `section`：留在 plan mode 直到 `exit_plan_mode` 成功；禁止用 mutation 执行计划；禁止用 `todo_write` 跟踪规划阶段。模型看见 `exit_plan_mode`。 | 规则写在 preset 行，三份完整面共用同一段。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:110]；ptc [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:117]；cordis [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:98] |

### `compaction` 组

`tokenMeter` **不**进本 realm，留在 host。preset 只决定这个 agent 要不要 compact。

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `compaction` | `cordis:group` | — | 装 | 装 | 装 | `isolate.compaction: true` 且 `toolResultPruner: true`。子行：`compaction-basic` / `command-compact` / `tool-result-pruner`。 | pruner 与 `compaction-basic` 必须同 realm（后者 `ctx.get` 读 pruner）。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:137][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:141][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:142] |
| `compaction-basic` | `@deepseek-ai/dsh-compaction-basic`（组内） | — | 装 | 装 | 装 | 无行内 config。自动压缩后端。 | 有没有 compact 是 preset 选择。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:144] |
| `command-compact` | `@deepseek-ai/dsh-command-compact`（组内） | — | 装 | 装 | 装 | 无行内 config。人命令 `/compact`，不进模型 tool catalog。 | 跟人命令走同一 compaction 服务。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:147] |
| `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner`（组内） | — | 装 | 装 | 装 | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024`。 | 先裁 tool result，再跑会话 compact。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:150][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:153][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:154][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:155] |

### `delegation` 组

`subagents` registry 与 spawn / fork **backends** 在 host。本 isolate 键是 `workflowEngine`。

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `delegation` | `cordis:group` | — | 装 | 装 | 装 | `isolate.workflowEngine: true`。子行九条，见本表后续行。 | 把 workflows 留在 preset realm；delegation **工具**解析 host registry。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:174][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:178] |
| `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control`（组内） | — | 装 | 装 | 装 | 无行内 config。`send_message` / `interrupt_agent`。 | 模型侧控制面。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:180] |
| `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents`（组内） | — | 装 | 装 | 装 | 无行内 config。`list_agents`。 | 与 control 拆行，同一包的另一入口。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:183] |
| `tool-subagent` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 装 | 装 | 装 | `provider: spawn`，`toolName: subagent`，`modelSelectionSettings: true`，`backgroundMode: continuable`。 | shipped spawn 工具；wire 名由 `toolName` 决定。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:186][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:190][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:192] |
| `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 装 | 装 | 装 | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable`。 | 与 host `dsh-base` 同行的 `one-shot` 不同：preset 写成 continuable。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:198][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:202][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:203]；base [E: packages/bundle/base/cordis.patch.yml:373] |
| `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 禁 | 禁 | 禁 | **`disabled: true`**。`provider: codex`，`toolName: subagent_codex`，`backgroundMode: one-shot`，`maxDepth: provider-managed`。 | 行在、工具不进 catalog。host 即便有 codex backend，也不等于本 preset 装了这个工具。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:209][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:211][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:213][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:214][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:215] |
| `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 禁 | 禁 | 禁 | **`disabled: true`**。`provider: claude-code`，`toolName: subagent_claude_code`，`backgroundMode: one-shot`，`maxDepth: provider-managed`。 | 与 `tool-subagent-codex` 对称的产品后端门。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:218][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:220][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:222][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:223][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:224] |
| `workflow-worker-thread` | `@deepseek-ai/dsh-workflow-worker-thread`（组内） | — | 装 | 装 | 装 | `provider: spawn`。给同组 `workflowEngine` 提供 worker，不是模型 tool。 | 必须与 `tool-workflow` 同 realm。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:227][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:230] |
| `tool-workflow` | `@deepseek-ai/dsh-tool-workflow`（组内） | — | 装 | 装 | 装 | 无行内 config。`workflow`。 | 模型侧工作流入口。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:232] |
| `tool-ralph` | `@deepseek-ai/dsh-tool-ralph`（组内） | — | 装 | 装 | 装 | `subagentProvider: spawn`，`maxRounds: 64`。`ralph`。 | Ralph 迭代上限写在 preset。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:235][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:238] |

`tool-subagent-report` **不是**任何一份 shipped preset 的成员：它留在 host。四份 `agent.cordis.yml` 都没有这个 `id:`。host 行在 base。[E: packages/bundle/base/cordis.patch.yml:376]

### 其余模型可见行

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | — | 装 | 装 | 装 | 无 config。`ask_user_question`。 | 标准面对人提问；min 不要。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:243] |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | — | 装 | 装 | 装 | `allowParallelInProgress: true`。`todo_write`。 | 并行 in-progress 写在 preset。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:246][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:249] |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | — | 装 | 装 | 装 | `fetch: true`，`searchTimeoutMs: 60000`。catalog 同时有 `web_search` 与 `web_fetch`。`web` service / search provider 在 host。 | shipped 完整面打开 fetch。 | std [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:253][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:256][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:257] |

unix web e2e 对 `standard` 的精确 catalog（测试滤掉 `glob`/`grep`）是：`ask_user_question` `bash` `create_goal` `edit` `exit_plan_mode` `get_goal` `interrupt_agent` `job_kill` `job_list` `job_output` `list_agents` `ralph` `read` `read_image` `send_message` `skill` `subagent` `subagent_fork` `todo_write` `update_goal` `web_fetch` `web_search` `workflow` `write`。[E: apps/cli/tests/web-agent-presets.e2e.ts:234] 该清单没有 `str_replace_editor`、`run_code`、`subagent_codex`、`subagent_claude_code`、任何 `cordis_*`。

### 仅某 preset 的增量

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-presentation` | `@deepseek-ai/dsh-agent-tool-presentation` | — | — | 装 | — | `mode: ptc`。模型装配只剩 `run_code` + SDK；native 工具行仍留在 composition 里供 SDK 子调度。权威 PTC 实现是 `packages/core/tools/src/ptc.ts`。 | PTC 是 presentation，不是另一套成员表。缺 host `codeRuntime` 时本行 inactive，mount 失败。 | [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:265][E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:268][E: apps/cli/tests/web-agent-presets.e2e.ts:366] |
| `tool-cordis` | `@deepseek-ai/dsh-tool-cordis` | — | — | — | 装 | 无行内 config、无 isolate。e2e 见到的 wire 名：`cordis_inspect_list` / `cordis_inspect_query` / `cordis_inspect_self` / `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine`。 | 自修改工具只给创造模式；std 的 catalog 不含 `cordis_define`。 | [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:251][E: apps/cli/tests/web-agent-presets.e2e.ts:333][E: apps/cli/tests/web-agent-presets.e2e.ts:335] |

`ptc` 相对 `standard` 多出来的 **可加载 `id:`** 就是 `tool-presentation`。`cordis` 相对 `standard` 多出来的可加载 `id:` 就是 `tool-cordis`（`skill-filesystem` 仍是同一 id，只是 config / 文件位置不同）。本对照表把四份 yml 里出现过的每个 top-level `id:` 和每个 group 子 `id:` 都写成行。

## 对照 / 分家 / 装配

**host 面 vs agent-preset 面。** `dsh-base` 仍 insert 一整套模型可见工具，供 **没有 roster** 的 profile（headless / sdk / acp）从全局层读。web bundle 把这些 host 工具行 `disabled: true`，再 `insert` `agent-presets`。[E: packages/bundle/web-app/cordis.patch.yml:320][E: packages/bundle/web-app/cordis.patch.yml:321][E: packages/bundle/web-app/cordis.patch.yml:442] 会话实际吃到的成员是本表四份 yml，不是 base 那份清单。同一 `id` 在两处出现时，以 **preset 文件** 为准：preset 的 `tool-subagent-fork` 是 `backgroundMode: continuable`，base 同行是 `one-shot`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:203][E: packages/bundle/base/cordis.patch.yml:373]

**web 挂 roster，default `standard`。** `id: agent-presets`，`name: '@deepseek-ai/dsh-agent-presets'`，`config.default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:442][E: packages/bundle/web-app/cordis.patch.yml:443][E: packages/bundle/web-app/cordis.patch.yml:445] web 行不重写 `includeShippedRoot` / `includeUserRoot`；schema 默认都是 `true`。[E: packages/preset/agent-presets/src/index.ts:110][E: packages/preset/agent-presets/src/index.ts:111] 构造 roots：shipped 根先、配置 `roots` 中、用户根后。[E: packages/preset/agent-presets/src/index.ts:179][E: packages/preset/agent-presets/src/index.ts:181] 先到先得：shipped id 挡住用户根下的同名目录。[E: packages/preset/agent-presets/src/discovery.ts:338]

**standing mount。** 每个 preset id 一份 composition（`standing` map），用 `bindScopeParent` 把 agent scope 接到这份树上，不是每会话一份 mount。[E: packages/preset/agent-presets/src/index.ts:391][E: packages/preset/agent-presets/src/index.ts:420][E: packages/preset/agent-presets/src/index.ts:425]

**只有 web 挂 `agent-presets`。** `PROFILE_TEMPLATES` 五个名字：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:137] headless overlay insert 是 `code-runtime` + `headless-startup` + `headless-runner`，没有 `id: agent-presets`。[E: packages/bundle/headless/cordis.patch.yml:19][E: packages/bundle/headless/cordis.patch.yml:22][E: packages/bundle/headless/cordis.patch.yml:26] runner `setup` 只调用 `installModelSelection`，不调用 `agentPresets.mount`。[E: packages/bundle/headless/src/index.ts:184] sdk / acp overlay 同样没有 roster 行。`sdk-minimal` 的 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`，不叠 `dsh-base`。[E: packages/boot/app-boot/src/profile.ts:155] 这些 profile 的模型可见工具来自 **host** 行，不是 `standard` / `minimal` / `ptc` / `cordis` 任何一份 composition。入口是 `dsh web` **以及** `dsh --profile headless|sdk|sdk-minimal|acp`。

**进程级 `DSH_TOOLS_MODE` 不是选了 `ptc` preset。** web 与 headless 的 host `tools` 行都写 `mode: !!js process.env.DSH_TOOLS_MODE`。[E: packages/bundle/web-app/cordis.patch.yml:37][E: packages/bundle/headless/cordis.patch.yml:15] 那是进程 defaultMode。`ptc` preset 的 `tool-presentation` `mode: ptc` 只作用于 join 了该 standing mount 的 agent。[E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:268][E: apps/cli/tests/web-agent-presets.e2e.ts:366] 旁边一个 `standard` 会话仍看见 native `bash`，装配里没有 `run_code`。[E: apps/cli/tests/web-agent-presets.e2e.ts:376][E: apps/cli/tests/web-agent-presets.e2e.ts:377]

**没有 shipped TUI。** help 例子里的 `tui` 只是自定义 profile 名，不是 `PROFILE_TEMPLATES` 键。[I]

**四份 yml 都没有、但容易被误认成成员的东西（不是本表实例）：** `tool-lsp` / `schedule_*` / `terminal_open` 一族 / `run_code`（那是 `ptc` 的 presentation，不是 yml `id:`）/ `tool-subagent-report` / `subagent_codex`（行在但 `disabled: true`）。仓库有包 ≠ preset 成员。`web_fetch` **是** std/ptc/cordis 成员（`fetch: true`）。

## Sources

- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/preset/agent-presets/presets/minimal/preset.yml
- packages/preset/agent-presets/presets/standard/preset.yml
- packages/preset/agent-presets/presets/ptc/preset.yml
- packages/preset/agent-presets/presets/cordis/preset.yml
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/metadata.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/persona/src/index.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [surface.presets.overview](../surface/presets/overview.md) — 发现 roots、standing mount、`composeFrom`、authoring 只能 copy。
- [surface.presets.minimal](../surface/presets/minimal.md) — `minimal` 单页：complete persona 与两个 isolate 组。
- [surface.presets.standard](../surface/presets/standard.md) — `standard` 单页：完整编码面逐行叙事。
- [surface.presets.code](../surface/presets/code.md) — PTC（稳定 id `surface.presets.code`）：`tool-presentation` `mode: ptc`，目录 `presets/ptc/`。
- [surface.presets.cordis](../surface/presets/cordis.md) — `cordis`：自修改工具与 `customSkillDirs`。
- [spine.composition-boot](../spine/composition-boot.md) — `profile → bundle → preset` 叠层。
- [subsys.composition.agent-presets](../subsystems/composition/agent-presets.md) — `AgentPresets` 服务、mount 守卫、settings default。
- [surface.profiles.web](../surface/profiles/web.md) — web host overlay：disable base 工具行、insert roster。
- [surface.profiles.headless](../surface/profiles/headless.md) — 不挂 roster；工具留在 host。
- [ref.tools-catalog](tools-catalog.md) — 模型可见 wire 名全集；preset 成员列回指本表。
