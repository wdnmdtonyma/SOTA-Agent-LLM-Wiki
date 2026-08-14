---
id: ref.presets
title: shipped preset 对照表
kind: catalog
tier: T3
pkg: composition
source:
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/preset.yml
  - apps/cli/config/agent-presets/standard/preset.yml
  - apps/cli/config/agent-presets/code/preset.yml
  - apps/cli/config/agent-presets/cordis/preset.yml
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/persona/src/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - minimal
  - standard
  - code
  - cordis
  - COMPOSITION_FILE
  - METADATA_FILE
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
updated: 47f943859b
---

> shipped **agent preset** 是目录名 = id 的四份 composition：`apps/cli/config/agent-presets/{minimal,standard,code,cordis}/`，每份必有 `COMPOSITION_FILE`（`agent.cordis.yml`），可选 `METADATA_FILE`（`preset.yml`，只供 picker 文案与 `order`）。成员资格只认那四个 `agent.cordis.yml` 里的插件 `id:`（含 `cordis:group` 与 `disabled` 行，以及 group 子行）。DSH 主线是 `profile → bundle → agent preset`；本表管 **agent-preset 面**（每会话 tools / persona / isolate），不管 host 面（webserver / persistence / sandbox / subagent backends）。默认产品是本地 Web GUI（`dsh web`）：web bundle 挂 `@deepseek-ai/dsh-agent-presets` 且 `default: standard`。headless **不**挂 roster。本仓没有 shipped TUI 包。

## 能回答的问题

- 四个 shipped preset 的目录 id、`preset.yml` `name` / `order`、谁是 web 出厂 default？
- 某个插件 `id:` 在 `minimal` / `standard` / `code` / `cordis` 是否装、是否 `disabled`、isolate 哪个 Service、关键 Config 是什么？
- 成员资格认 `agent.cordis.yml` 还是认「仓库里有这个包」？`preset.yml` 能不能把一个包写进产品？
- `dsh web` 怎样挂 roster？`dsh --profile headless` 会不会 mount 这四份 composition？
- `persistent-bash` / `tool-presentation` / `tool-cordis` 分别只出现在哪个 preset？
- 发布服务的行不写 `isolate` 会怎样？`tokenMeter` / `subagents` registry 为什么不进 preset realm？

## 范围与 ground truth

本页是 T3 **对照 catalog**。一行 = 一个插件 `id:`（四个 yml 的 top-level 行，加上 group 子行与 `disabled: true` 行），或一行 = 一份 `preset.yml` 元数据。分组是为了读，不是为了丢实例。

成员资格 **只认** `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。`preset.yml` 只读 `name` / `description` / `order`，读失败降级为空元数据，composition 仍可 mount。[E: packages/preset/agent-presets/src/discovery.ts:26][E: packages/preset/agent-presets/src/metadata.ts:25][E: packages/preset/agent-presets/src/metadata.ts:63]

目录名才是 preset id：`scanRoot` 把 `child.name` 写成 `id`。[E: packages/preset/agent-presets/src/discovery.ts:160]

**不要**把下列东西写成 preset 成员：workspace 里存在的 `@deepseek-ai/dsh-tool-*` 包；`packages/bundle/base/cordis.patch.yml` 的 host 工具行；web bundle 里被 `disabled: true` 的同名 host 行。那些是 host 面或仓库库存。headless 用的就是 base 的 host 行，不是本表任何一份 shipped composition。

官方 `docs/**` 与 README 只当查漏，不当 `[E]`。单 preset 叙事在 T1 `surface.presets.*`；发现 / standing mount / `composeFrom` 在 T2 `subsys.composition.agent-presets`；模型可见 wire 名全集在 `ref.tools-catalog`。本页只回答「这四份 yml 装了哪几行」。

`mountPreset` 在树 settle 后跑 `leakedServices`：任何把 service publish 进 **root realm** 的行都会抛错，要求「a preset service must sit behind an `isolate` realm or move to the host composition」。[E: packages/preset/agent-presets/src/mount.ts:361][E: packages/preset/agent-presets/src/mount.ts:365]

表内单元格：`装` = 该 yml 有这一 `id:` 且未写死 `disabled: true`；`禁` = 行在但 `disabled: true`；`win32 禁` / `非 win32 禁` = `!!js` 平台门；`—` = 该 yml 没有这一 `id:`。

## 实例表

### shipped preset 元数据

`METADATA_FILE` 不是成员表。web 出厂 default 写在 web bundle 的 `agent-presets` 行上，不写在 `preset.yml`。[E: packages/preset/agent-presets/src/metadata.ts:25][E: packages/bundle/web-app/cordis.patch.yml:421][E: packages/bundle/web-app/cordis.patch.yml:424]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `standard` | 目录 id；`preset.yml` `name: 标准模式` `order: 1` | **web 出厂 default** | picker「标准模式」。完整编码面：persona / 指令 / 平台互斥 shell / fs / jobs / skills / goals / plan / compaction / delegation / ask / todo / web_search。 | `AgentPresets.Config.default` 必填；web patch 写成 `standard`；`defaultId` = settings `agent-presets.default` 否则 `config.default`。 | `apps/cli/config/agent-presets/standard/preset.yml` [E: apps/cli/config/agent-presets/standard/preset.yml:1][E: apps/cli/config/agent-presets/standard/preset.yml:3][E: packages/preset/agent-presets/src/index.ts:87][E: packages/preset/agent-presets/src/index.ts:192][E: apps/cli/tests/web-agent-presets.e2e.ts:192] |
| `code` | 目录 id；`name: PTC 模式` `order: 2` | 非 default | 同构于 `standard` 的成员，再加 `tool-presentation` `mode: code`。须在 picker / settings 显式选。 | Code Mode 是 per-agent presentation，不是 web 出厂会话。 | `apps/cli/config/agent-presets/code/preset.yml` [E: apps/cli/config/agent-presets/code/preset.yml:1][E: apps/cli/config/agent-presets/code/preset.yml:3] |
| `minimal` | 目录 id；`name: 极简模式` `order: 3` | 非 default | 固定英文 persona + 持久 `bash` + `str_replace_editor`。无 compaction / skill / subagent / web / plan / todo / jobs。 | 双工具面；`order: 3` 只影响 shipped 集合排序。 | `apps/cli/config/agent-presets/minimal/preset.yml` [E: apps/cli/config/agent-presets/minimal/preset.yml:1][E: apps/cli/config/agent-presets/minimal/preset.yml:3] |
| `cordis` | 目录 id；`name: 创造模式` `order: 4` | 非 default | 同构于 `standard` 再加 `tool-cordis`，且 `skill-filesystem.customSkillDirs` 指向本目录 `skills/`。 | 用来 copy / 创作用户 preset；出厂不默认打开自修改工具。 | `apps/cli/config/agent-presets/cordis/preset.yml` [E: apps/cli/config/agent-presets/cordis/preset.yml:1][E: apps/cli/config/agent-presets/cordis/preset.yml:3] |

web e2e：system 根只供应这四个 id，全部 `trust === 'system'`，`defaultId === 'standard'`。[E: apps/cli/tests/web-agent-presets.e2e.ts:190][E: apps/cli/tests/web-agent-presets.e2e.ts:191][E: apps/cli/tests/web-agent-presets.e2e.ts:192]

`scanRoot` 排序：声明了 `order` 的按数值升序，其余按 id。shipped 读起来是 `standard` → `code` → `minimal` → `cordis`。[E: packages/preset/agent-presets/src/discovery.ts:167]

### 身份

| 名 | 类型/签名 | min | std（web 默认） | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 装 | 装 | 装 | 装 | min：`text` 固定 `You are a helpful software engineer assistant.`，`complete: true`，`includeRuntimeContext: false`。std / code：一句 `{{model}}` / `{{cwd}}`，不写 `complete` / `includeRuntimeContext`（插件默认 `complete: false`、`includeRuntimeContext: true`）。cordis：多段 text（Harness / HOST vs AGENT PRESET / 禁止改 shipped 目录 / 先 load `editing-cordis-compositions`），同样不写 `complete`。 | min 把 persona 当完整 system prompt；其余只 shadow 部署 persona。 | min [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:12][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:13]；std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:24]；code [E: apps/cli/config/agent-presets/code/agent.cordis.yml:31]；cordis [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:17]；schema [E: packages/preset/persona/src/index.ts:50][E: packages/preset/persona/src/index.ts:51] |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | — | 装 | 装 | 装 | `maxBytes: 65536`。workspace 指令 section，不是 tool。 | min 的 `complete: true` 本来就会压掉其它 section；三份完整面才挂指令。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:30][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:33]；code [E: apps/cli/config/agent-presets/code/agent.cordis.yml:37]；cordis [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:31] |

### `minimal` 专属 isolate

这两行 group **只出现在** `minimal/agent.cordis.yml`。std / code / cordis 没有 `persistent-shell` / `filesystem`，也没有子 id `pty` / `terminal-bash` / `persistent-bash` / `fs-local` / `str-replace-editor`。

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `persistent-shell` | `cordis:group` | 装 | — | — | — | `group: true`；`isolate.terminals: true`。子行：`pty` / `terminal-bash` / `persistent-bash`。 | PTY 栈是 agent-owned service，必须进 entry-local realm，否则泄漏 root。 | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:20][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:22] |
| `pty` | `@deepseek-ai/dsh-terminal`（组内） | 装 | — | — | — | 无额外 config。给持久 bash 提供 `terminals`。 | 与 `terminal-bash` / `persistent-bash` 同 realm。 | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:24] |
| `terminal-bash` | `@deepseek-ai/dsh-terminal-bash`（组内） | 装 | — | — | — | `timeoutMs: 300000`。 | PTY bash 后端；超时写在 preset 行上。 | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:27][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:30] |
| `persistent-bash` | `@deepseek-ai/dsh-tool-bash-persistent`（组内） | 装 | — | — | — | `timeoutMs: 300000`；自带长 `description`。模型看见的 wire 名是 `bash`（persistent），不是 one-shot `dsh-tool-bash`。 | min 只要跨调用有状态的 shell，不要 host 那条 one-shot `tool-bash`。 | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:35] |
| `filesystem` | `cordis:group` | 装 | — | — | — | `group: true`；`isolate.fs: true`。子行：`fs-local` / `str-replace-editor`。 | 裸 local fs 只影子本 preset 的 `fs` realm，不换掉进程级 host `fs-sandbox`。 | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:48][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:50][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] |
| `fs-local` | `@deepseek-ai/dsh-fs-local`（组内） | 装 | — | — | — | `cwd: !!js process.env.DSH_CWD ?? process.cwd()`。 | 给 editor 一条不经 host sandbox provider 的 local fs。 | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:54][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:57] |
| `str-replace-editor` | `@deepseek-ai/dsh-tool-str-replace-editor`（组内） | 装 | — | — | — | `maxOutputChars: 16000`。模型看见 `str_replace_editor`。 | min 的第二个（也是唯一的文件）工具；std 用 `tool-fs` 的 `read`/`write`/`edit` 代替。 | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:62] |

unix web e2e：mount `minimal` 后 assembly tools 恰好 `bash` + `str_replace_editor`，且 `compaction` 对本 agent 不存在。[E: apps/cli/tests/web-agent-presets.e2e.ts:227][E: apps/cli/tests/web-agent-presets.e2e.ts:231]

### shell / filesystem / jobs（标准面）

这些行 **只出现在** std / code / cordis。它们注册进 host `tools`，自己不 `provide`，因此没有 isolate。

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | — | 装 · win32 禁 | 装 · win32 禁 | 装 · win32 禁 | `disabled: !!js process.platform === 'win32'`。one-shot `bash`，消费 host `shell-env` / `bash-sandbox`。 | 与 `tool-pwsh` 平台互斥；min 改走 persistent 包。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:44][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:46] |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | — | 装 · 非 win32 禁 | 装 · 非 win32 禁 | 装 · 非 win32 禁 | `disabled: !!js process.platform !== 'win32'`。 | win32 上的 shell 位。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:48][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:50] |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | — | 装 | 装 | 装 | 无行内 config。`read` / `read_image` / `write` / `edit`。`fs` policy 留在 host。 | 标准面文件工具；不是 `str_replace_editor`。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56] |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | — | 装 | 装 | 装 | `sampleOverCapGlobResults: false`。登记 `glob` / `grep`。 | 搜索与读写拆包；cap 行为写死在 preset。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:59][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:62] |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | — | 装 | 装 | 装 | 无 config。`job_list` / `job_output` / `job_kill`。jobs **registry** 在 host。 | preset 只决定模型能不能收割后台任务。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:73] |

### skills / goals

`skill-filesystem` / `tool-skill` 在 std / code 写在 `tool-jobs` 之后；cordis 把它们挪到 `tool-cordis` 之后并加 `customSkillDirs`。id 仍算装。min 两行都没有。

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | — | 装 | 装 | 装（带 `customSkillDirs`） | std / code：无 `customSkillDirs`。cordis：`customSkillDirs` 一条 `!!js`，把 `new URL('skills/', baseUrl)` 解析成本 preset 目录下的 `skills/`。skill **registry** 在 host；本行写入该 preset 的层。 | cordis 要把 `editing-cordis-compositions` 跟着 preset 走，不能只靠用户 skill 根。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:83]；cordis [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:255][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:258][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:259] |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | — | 装 | 装 | 装 | 无 config。模型看见 `skill`。 | 给该 Agent 目录与 loader。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:86]；cordis [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261] |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | — | 装 | 装 | 装 | 无 config。`create_goal` / `get_goal` / `update_goal`。goals **service** / `/goal` 在 host。 | 只决定模型能不能调 goal 工具。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:97]；cordis [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:85] |

cordis e2e：scoped skill list 含 `editing-cordis-compositions`，无 scope 的全局 list 不含该名。[E: apps/cli/tests/web-agent-presets.e2e.ts:280][E: apps/cli/tests/web-agent-presets.e2e.ts:281]

### `planning` 组

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `planning` | `cordis:group` | — | 装 | 装 | 装 | `group: true`；`isolate.planMode: true`。子行：`plan-mode`。 | plan 状态按 agent 活；entry-local realm 是正确寿命。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:104][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108]；code [E: apps/cli/config/agent-presets/code/agent.cordis.yml:115]；cordis [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:96] |
| `plan-mode` | `@deepseek-ai/dsh-plan-mode`（组内） | — | 装 | 装 | 装 | 长 `section`：留在 plan mode 直到 `exit_plan_mode` 成功；禁止用 mutation 执行计划；禁止用 `todo_write` 跟踪规划阶段。模型看见 `exit_plan_mode`。 | 规则写在 preset 行，三份完整面共用同一段。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:110]；code [E: apps/cli/config/agent-presets/code/agent.cordis.yml:117]；cordis [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:98] |

### `compaction` 组

`tokenMeter` **不**进本 realm，留在 host。preset 只决定这个 agent 要不要 compact。

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `compaction` | `cordis:group` | — | 装 | 装 | 装 | `isolate.compaction: true` 且 `toolResultPruner: true`。子行：`compaction-basic` / `command-compact` / `tool-result-pruner`。 | pruner 与 `compaction-basic` 必须同 realm（后者 `ctx.get` 读 pruner）。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:137][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:142] |
| `compaction-basic` | `@deepseek-ai/dsh-compaction-basic`（组内） | — | 装 | 装 | 装 | 无行内 config。自动压缩后端。 | 有没有 compact 是 preset 选择。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:144] |
| `command-compact` | `@deepseek-ai/dsh-command-compact`（组内） | — | 装 | 装 | 装 | 无行内 config。人命令 `/compact`，不进模型 tool catalog。 | 跟人命令走同一 compaction 服务。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:147] |
| `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner`（组内） | — | 装 | 装 | 装 | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024`。 | 先裁 tool result，再跑会话 compact。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:150][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:153][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:154][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:155] |

### `delegation` 组

`subagents` registry 与 spawn / fork **backends** 在 host。本 isolate 键是 `workflowEngine`（workflow 消费者必须看见本 preset 填的引擎，而不是空的 host 注册表）。

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `delegation` | `cordis:group` | — | 装 | 装 | 装 | `isolate.workflowEngine: true`。子行九条，见本表后续行。 | 把 workflows 留在 preset realm；delegation **工具**解析 host registry。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:174][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] |
| `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control`（组内） | — | 装 | 装 | 装 | 无行内 config。`send_message` / `interrupt_agent`。 | 模型侧控制面。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:180] |
| `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents`（组内） | — | 装 | 装 | 装 | 无行内 config。`list_agents`。 | 与 control 拆行，同一包的另一入口。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:183] |
| `tool-subagent` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 装 | 装 | 装 | `provider: spawn`，`toolName: subagent`，`backgroundMode: continuable`。 | shipped spawn 工具；wire 名由 `toolName` 决定。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:186][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:190][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:191] |
| `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 装 | 装 | 装 | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable`。 | 与 host `dsh-base` 同行的 `one-shot` 不同：preset 写成 continuable。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:193][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:197][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198]；base [E: packages/bundle/base/cordis.patch.yml:329] |
| `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 禁 | 禁 | 禁 | **`disabled: true`**。`provider: codex`，`toolName: subagent_codex`，`enableRunInBackground: false`，`maxDepth: provider-managed`。 | 行在、工具不进 catalog。要暴露须 copy 用户 preset 再去掉 `disabled`。host 即便有 codex backend，也不等于本 preset 装了这个工具。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:203][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:208][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:209][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:210] |
| `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 禁 | 禁 | 禁 | **`disabled: true`**。`provider: claude-code`，`toolName: subagent_claude_code`，`enableRunInBackground: false`，`maxDepth: provider-managed`。 | 与 `tool-subagent-codex` 对称的产品后端门。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:212][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:214][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:217][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:218][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:219] |
| `workflow-worker-thread` | `@deepseek-ai/dsh-workflow-worker-thread`（组内） | — | 装 | 装 | 装 | `provider: spawn`。给同组 `workflowEngine` 提供 worker，不是模型 tool。 | 必须与 `tool-workflow` 同 realm。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:221][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:224] |
| `tool-workflow` | `@deepseek-ai/dsh-tool-workflow`（组内） | — | 装 | 装 | 装 | 无行内 config。`workflow`。 | 模型侧工作流入口。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:226] |
| `tool-ralph` | `@deepseek-ai/dsh-tool-ralph`（组内） | — | 装 | 装 | 装 | `subagentProvider: spawn`，`maxRounds: 64`。`ralph`。 | Ralph 迭代上限写在 preset。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:229][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:233] |

`tool-subagent-report` **不是**任何一份 shipped preset 的成员：它留在 host（setup 列表不按 scope 分层）。四份 `agent.cordis.yml` 都没有这个 `id:`。

### 其余模型可见行

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | — | 装 | 装 | 装 | 无 config。`ask_user_question`。 | 标准面对人提问；min 不要。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:237] |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | — | 装 | 装 | 装 | `allowParallelInProgress: true`。`todo_write`。 | 并行 in-progress 写在 preset。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:240][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:243] |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | — | 装 | 装 | 装 | `fetch: false`，`searchTimeoutMs: 60000`。catalog 只有 `web_search`，没有 `web_fetch`。`web` service / search provider 在 host。 | shipped 面关掉 fetch；本行没有 fetch provider。 | std [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:251] |

unix web e2e 对 `standard` 的精确 catalog（测试滤掉 `glob`/`grep`，因机器可能没有 ripgrep）是：`ask_user_question` `bash` `create_goal` `edit` `exit_plan_mode` `get_goal` `interrupt_agent` `job_kill` `job_list` `job_output` `list_agents` `ralph` `read` `read_image` `send_message` `skill` `subagent` `subagent_fork` `todo_write` `update_goal` `web_search` `workflow` `write`。[E: apps/cli/tests/web-agent-presets.e2e.ts:206] 该清单没有 `str_replace_editor`、`web_fetch`、`run_code`、`subagent_codex`、`subagent_claude_code`、任何 `cordis_*`。

### 仅某 preset 的增量

| 名 | 类型/签名 | min | std | code | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-presentation` | `@deepseek-ai/dsh-agent-tool-presentation` | — | — | 装 | — | `mode: code`。模型装配只剩 `run_code` + SDK；native 工具行仍留在 composition 里供 SDK 子调度。 | Code Mode 是 presentation，不是另一套成员表。缺 host `codeRuntime` 时本行 inactive，mount 失败。 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259][E: apps/cli/config/agent-presets/code/agent.cordis.yml:262][E: apps/cli/tests/web-agent-presets.e2e.ts:301] |
| `tool-cordis` | `@deepseek-ai/dsh-tool-cordis` | — | — | — | 装 | 无行内 config、无 isolate。e2e 见到的 wire 名：`cordis_inspect_list` / `cordis_inspect_query` / `cordis_inspect_self` / `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine`。 | 自修改工具只给创造模式；std 的 catalog 不含 `cordis_define`。 | [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245][E: apps/cli/tests/web-agent-presets.e2e.ts:270][E: apps/cli/tests/web-agent-presets.e2e.ts:271][E: apps/cli/tests/web-agent-presets.e2e.ts:326] |

`code` 相对 `standard` 多出来的 **可加载 `id:`** 就是 `tool-presentation`。`cordis` 相对 `standard` 多出来的可加载 `id:` 就是 `tool-cordis`（`skill-filesystem` 仍是同一 id，只是 config / 文件位置不同）。本对照表把四份 yml 里出现过的每个 top-level `id:` 和每个 group 子 `id:` 都写成行，没有第三份「只存在于仓库、不存在于 yml」的增量。

## 对照 / 分家 / 装配

**host 面 vs agent-preset 面。** `dsh-base` 仍 insert 一整套模型可见工具（`tool-bash`、`tool-fs`、`plan-mode`、`tool-subagent` 等），供 **没有 roster** 的 profile（headless）从全局层读。[E: packages/bundle/base/cordis.patch.yml:210][E: packages/bundle/base/cordis.patch.yml:224] web bundle 把这些 host 工具行 `disabled: true`，再 `insert` `agent-presets`。[E: packages/bundle/web-app/cordis.patch.yml:293][E: packages/bundle/web-app/cordis.patch.yml:294][E: packages/bundle/web-app/cordis.patch.yml:421] 会话实际吃到的成员是本表四份 yml，不是 base 那份清单。同一 `id` 在两处出现时，以 **preset 文件** 为准：例如 preset 的 `tool-subagent-fork` 是 `backgroundMode: continuable`，base 同行是 `one-shot`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198][E: packages/bundle/base/cordis.patch.yml:329]

**web 挂 roster，default `standard`。** `packages/bundle/web-app/cordis.patch.yml`：`id: agent-presets`，`name: '@deepseek-ai/dsh-agent-presets'`，`config.default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:421][E: packages/bundle/web-app/cordis.patch.yml:422][E: packages/bundle/web-app/cordis.patch.yml:424] launcher `composeProfile` 若行表已有 `agent-presets`，再 overlay `roots: [{ path: SHIPPED_PRESET_ROOT, trust: 'system' }]`；`SHIPPED_PRESET_ROOT` 是 `apps/cli/config/agent-presets/`。[E: apps/cli/src/profile-boot.ts:35][E: apps/cli/src/profile-boot.ts:159][E: apps/cli/src/profile-boot.ts:164] `includeUserRoot` 默认 `true`，构造时在配置 roots **之后**追加 `$DSH_HOME/.agent-presets`。[E: packages/preset/agent-presets/src/index.ts:92] 先到先得：shipped id 挡住用户根下的同名目录。[E: packages/preset/agent-presets/src/discovery.ts:181]

**headless 不挂 `agent-presets`。** `packages/bundle/headless/cordis.patch.yml` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `id: agent-presets`。[E: packages/bundle/headless/cordis.patch.yml:24][E: packages/bundle/headless/cordis.patch.yml:27][E: packages/bundle/headless/cordis.patch.yml:31] `composeProfile` 因此不会补 shipped root。runner `setup` 只调用 `installModelSelection`，不调用 `agentPresets.mount`。[E: packages/bundle/headless/src/index.ts:117] headless 的模型可见工具来自 **host** 的 `dsh-base` 行，不是 `standard` / `minimal` / `code` / `cordis` 任何一份 composition。

**进程级 `DSH_TOOLS_MODE` 不是选了 `code` preset。** web 与 headless 的 host `tools` 行都写 `mode: !!js process.env.DSH_TOOLS_MODE`。[E: packages/bundle/web-app/cordis.patch.yml:41][E: packages/bundle/headless/cordis.patch.yml:20] 那是进程 defaultMode。`code` preset 的 `tool-presentation` `mode: code` 只作用于 join 了该 standing mount 的 agent。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262][E: apps/cli/tests/web-agent-presets.e2e.ts:301] 旁边一个 `standard` 会话仍看见 native `bash`，装配里没有 `run_code`。[E: apps/cli/tests/web-agent-presets.e2e.ts:310][E: apps/cli/tests/web-agent-presets.e2e.ts:311]

**没有 shipped TUI。** help 例子里的 `tui` 只是自定义 profile 名，不会自动带上这四份 preset。[I]

**四份 yml 都没有、但容易被误认成成员的东西（不是本表实例）：** `tool-lsp` / `schedule_*` / `terminal_open` 一族 / `web_fetch`（`fetch: false`）/ `run_code`（那是 `code` 的 presentation，不是 yml `id:`）/ `tool-subagent-report` / `subagent_codex`（行在但 `disabled: true`）。仓库有包 ≠ preset 成员。

## Sources

- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/preset.yml
- apps/cli/config/agent-presets/standard/preset.yml
- apps/cli/config/agent-presets/code/preset.yml
- apps/cli/config/agent-presets/cordis/preset.yml
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/metadata.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/persona/src/index.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/src/index.ts
- packages/bundle/base/cordis.patch.yml
- apps/cli/src/profile-boot.ts
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [surface.presets.overview](../surface/presets/overview.md) — 发现 roots、standing mount、`composeFrom`、authoring 只能 copy。
- [surface.presets.minimal](../surface/presets/minimal.md) — `minimal` 单页：complete persona 与两个 isolate 组。
- [surface.presets.standard](../surface/presets/standard.md) — `standard` 单页：完整编码面逐行叙事。
- [surface.presets.code](../surface/presets/code.md) — `code` / PTC：`tool-presentation` `mode: code`。
- [surface.presets.cordis](../surface/presets/cordis.md) — `cordis`：自修改工具与 `customSkillDirs`。
- [spine.composition-boot](../spine/composition-boot.md) — `profile → bundle → preset` 叠层与 `composeProfile` 补 shipped root。
- [subsys.composition.agent-presets](../subsystems/composition/agent-presets.md) — `AgentPresets` 服务、mount 守卫、settings default。
- [surface.profiles.web](../surface/profiles/web.md) — web host overlay：disable base 工具行、insert roster。
- [surface.profiles.headless](../surface/profiles/headless.md) — 不挂 roster；工具留在 host。
- [ref.tools-catalog](tools-catalog.md) — 模型可见 wire 名全集；preset 成员列回指本表。
