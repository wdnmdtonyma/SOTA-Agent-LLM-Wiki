---
id: ref.presets
title: shipped preset 对照表
kind: catalog
tier: T3
pkg: composition
source:
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/display.ts
  - packages/preset/agent-preset-registry/src/session.ts
  - packages/preset/persona/src/index.ts
  - packages/client/ui-agent-preset/src/client/locales.ts
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
symbols:
  - minimal
  - standard
  - ptc
  - cordis
  - AgentPreset
  - AgentPresetRegistry
  - leakedServices
  - mountPreset
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
updated: 477b4f4205
---

> shipped **agent preset** 是四份声明式 `@deepseek-ai/dsh-agent-preset` 行，叠在 `dsh-web-app` 的 `dsh.bundle.patch` 里：`packages/bundle/web-app/presets/{standard,ptc,minimal,cordis}.patch.yml`。旧包 `packages/preset/agent-presets` 与目录 `presets/{id}/agent.cordis.yml` / `preset.yml` 已删除。成员资格只认这四份 patch 的 `config.plugins[]`（含 `cordis:group` 与 `disabled` 行，以及 group 子行）。DSH 主线是 `profile → bundle → agent preset`；本表管 **agent-preset 面**（每会话 tools / persona / isolate），不管 host 面。五个 shipped profile：`web` / `headless` / `sdk` / `sdk-minimal` / `acp`。只有 **web** 挂 `@deepseek-ai/dsh-agent-preset-registry` 且 `default: standard`。[E: packages/bundle/web-app/package.json:43][E: packages/bundle/web-app/cordis.patch.yml:559][E: packages/bundle/web-app/cordis.patch.yml:562][E: packages/boot/app-boot/src/profile.ts:179]

## 能回答的问题

- 四个 shipped preset 的声明 id、`order`、谁是 web 出厂 default？文案从哪来？
- 某个插件 `id:` 在 `minimal` / `standard` / `ptc` / `cordis` 是否装、是否 `disabled`、isolate 哪个 Service、关键 Config 是什么？
- 成员资格认 web-app preset patch 还是认「仓库里有这个包」？声明行上的 `name` / `description` 能不能覆盖 locale 文案？
- `dsh web` 怎样挂 roster？`dsh --profile headless|sdk|sdk-minimal|acp` 会不会 mount 这四份 composition？
- `persistent-bash` / `persistent-pwsh` / `present` / `tool-presentation` / `tool-cordis` / `plugin_manager` 分别只出现在哪个 preset？
- 发布服务的行不写 `isolate` 会怎样？`tokenMeter` / `subagents` registry 为什么不进 preset realm？

## 范围与 ground truth

本页是 T3 **对照 catalog**。一行 = 一个插件 `id:`（四个 patch 的 top-level 行，加上 group 子行与 `disabled: true` 行），或一行 = 一份 shipped preset 元数据。分组是为了读，不是为了丢实例。

成员资格 **只认** `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。每份 patch 插入一行 `id: preset-<id>`、`name: '@deepseek-ai/dsh-agent-preset'`，`config.id` 才是 preset id。[E: packages/bundle/web-app/presets/standard.patch.yml:5][E: packages/preset/agent-preset/src/index.ts:16]

`@deepseek-ai/dsh-agent-preset` 把 `id` + `plugins[]` 交给 `@deepseek-ai/dsh-agent-preset-registry` 做 roster / revision / bind。Web 编辑保存写 **profile user patch** 的 `config.plugins`，不是独立 preset 目录。[E: packages/preset/agent-preset/src/index.ts:28][E: packages/preset/agent-preset-registry/src/index.ts:53]

**不要**把下列东西写成 preset 成员：workspace 里存在的 `@deepseek-ai/dsh-tool-*` 包；`packages/bundle/base/cordis.patch.yml` 的 host 工具行；web bundle 里被 `disabled: true` 的同名 host 行。那些是 host 面或仓库库存。headless / sdk / acp 用的就是 base 的 host 行（`sdk-minimal` 自带完整 insert），不是本表任何一份 shipped composition。`PROFILE_TEMPLATES` 的 headless / sdk / acp / sdk-minimal **不**列这四份 preset 文件。[E: packages/boot/app-boot/src/profile.ts:186]

官方 `docs/**` 与 README 只当查漏，不当 `[E]`。单 preset 叙事在 T1 `surface.presets.*`；发现 / standing mount 在 T2 `subsys.composition.agent-presets`；模型可见 wire 名全集在 `ref.tools-catalog`。本页只回答「这四份 patch 装了哪几行」。

`mountPreset` 拒绝无 scope 的 context。[E: packages/preset/agent-preset-registry/src/mount.ts:259] 树 settle 后 `leakedServices` 列出 publish 进 **root isolate** 的名字；非空则抛 `Preset services require isolate realms`。[E: packages/preset/agent-preset-registry/src/mount.ts:87][E: packages/preset/agent-preset-registry/src/mount.ts:267]

表内单元格：`装` = 该 patch 有这一 `id:` 且未写死 `disabled: true`；`禁` = 行在但 `disabled: true`；`win32 禁` / `非 win32 禁` = `!!js` 平台门；`—` = 该 patch 没有这一 `id:`。

## 实例表

### shipped preset 元数据

四个 shipped 声明**不**写 `name` / `description`：`isBuiltInPreset` 要求 `name === undefined` 且 id 在 built-in 表里，文案走 locale 字典。用户自写 preset 才带 `name`，那种文案不翻译。[E: packages/preset/agent-preset-registry/src/display.ts:40][E: packages/preset/agent-preset-registry/src/display.ts:53][E: packages/client/ui-agent-preset/src/client/locales.ts:87]

web 出厂 default 写在 web bundle 的 `agent-preset-registry` 行上，不写在 preset patch。[E: packages/bundle/web-app/cordis.patch.yml:559][E: packages/bundle/web-app/cordis.patch.yml:562][E: packages/preset/agent-preset-registry/src/index.ts:54]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `standard` | patch `config.id`；`order: 1`；locale `presetStandardName` = 标准模式 | **web 出厂 default** | 完整编码面：persona / 指令 / 平台互斥 shell / fs / jobs / skills / goals / plan / compaction / delegation / ask / todo / web / `present`。`workflow-ptc` + `tool-workflow` **启用**；`tool-ralph` 与 `plugin_manager` **禁**。 | `AgentPresetRegistry.Config.default` 必填；web patch 写成 `standard`。 | `packages/bundle/web-app/presets/standard.patch.yml` [E: packages/bundle/web-app/presets/standard.patch.yml:8][E: packages/bundle/web-app/presets/standard.patch.yml:9][E: packages/client/ui-agent-preset/src/client/locales.ts:87] |
| `ptc` | patch `config.id`；`order: 2`；locale `presetPtcName` = PTC 模式 | 非 default | 同构于 `standard` 的成员，再加 `tool-presentation` `mode: ptc`；`workflow-ptc` / `tool-workflow` / `tool-ralph` **全禁**。wiki 节点仍叫 `surface.presets.code`。 | PTC 是 per-agent presentation，不是 web 出厂会话。 | `packages/bundle/web-app/presets/ptc.patch.yml` [E: packages/bundle/web-app/presets/ptc.patch.yml:8][E: packages/bundle/web-app/presets/ptc.patch.yml:9][E: packages/client/ui-agent-preset/src/client/locales.ts:89] |
| `minimal` | patch `config.id`；`order: 3`；locale `presetMinimalName` = 极简模式 | 非 default | 固定英文 persona + **只有**持久 shell（POSIX `bash` / win32 `pwsh`）。无 fs 工具、无 compaction / skill / subagent / web / plan / todo / jobs / `present`。 | 单工具面；`order: 3` 只影响 shipped 集合排序。 | `packages/bundle/web-app/presets/minimal.patch.yml` [E: packages/bundle/web-app/presets/minimal.patch.yml:8][E: packages/bundle/web-app/presets/minimal.patch.yml:9][E: packages/client/ui-agent-preset/src/client/locales.ts:91] |
| `cordis` | patch `config.id`；`order: 4`；locale `presetCordisName` = 创造模式 | 非 default | 同构于 `standard` 再加 `tool-cordis`，且 `skill-filesystem.customSkillDirs` 指向 `@deepseek-ai/dsh-agent-preset` 包内 `skills/`。`plugin_manager` 仅当 `ctx.get('profileContext')` 才启用。 | 用来创作用户 preset；出厂不默认打开自修改工具。 | `packages/bundle/web-app/presets/cordis.patch.yml` [E: packages/bundle/web-app/presets/cordis.patch.yml:8][E: packages/bundle/web-app/presets/cordis.patch.yml:9][E: packages/client/ui-agent-preset/src/client/locales.ts:93] |

### 身份

| 名 | 类型/签名 | min | std（web 默认） | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 装 | 装 | 装 | 装 | 配置键是 `prefix` / `suffix`（**不是**旧键 `text`）。min：`prefix` 固定 `You are a helpful software engineer assistant.`，`complete: true`，`includeRuntimeContext: false`，无 `suffix`。std / ptc / cordis：`prefix` 含 `{{model}}`，`suffix: Your working directory is {{cwd}}.`，不写 `complete` / `includeRuntimeContext`（插件默认 `complete: false`、`includeRuntimeContext: true`）。 | min 把 persona prefix 当完整 system prompt；其余只 shadow 部署 persona。 | min [E: packages/bundle/web-app/presets/minimal.patch.yml:11][E: packages/bundle/web-app/presets/minimal.patch.yml:14][E: packages/bundle/web-app/presets/minimal.patch.yml:15][E: packages/bundle/web-app/presets/minimal.patch.yml:16]；std [E: packages/bundle/web-app/presets/standard.patch.yml:11][E: packages/bundle/web-app/presets/standard.patch.yml:14]；schema [E: packages/preset/persona/src/index.ts:50][E: packages/preset/persona/src/index.ts:51] |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | — | 装 | 装 | 装 | `maxBytes: 65536`。workspace 指令 section，不是 tool。 | min 的 `complete: true` 本来就会压掉其它 section；三份完整面才挂指令。 | std [E: packages/bundle/web-app/presets/standard.patch.yml:16][E: packages/bundle/web-app/presets/standard.patch.yml:19] |

### `minimal` 专属 isolate

这一行 group **只出现在** `minimal.patch.yml`。std / ptc / cordis 没有 `persistent-shell`，也没有子 id `pty` / `terminal-bash` / `persistent-bash` / `terminal-pwsh` / `persistent-pwsh`。`filesystem` / `fs-local` / `str-replace-editor` **不再**出现在任何一份 shipped preset patch。

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `persistent-shell` | `cordis:group` | 装 | — | — | — | `group: true`；`isolate.terminals: true`。子行：`pty` / `terminal-bash` / `persistent-bash` / `terminal-pwsh` / `persistent-pwsh`。 | PTY 栈是 agent-owned service，必须进 entry-local realm，否则泄漏 root。POSIX 与 win32 各装一套。 | [E: packages/bundle/web-app/presets/minimal.patch.yml:17][E: packages/bundle/web-app/presets/minimal.patch.yml:20][E: packages/bundle/web-app/presets/minimal.patch.yml:21] |
| `pty` | `@deepseek-ai/dsh-terminal`（组内） | 装 | — | — | — | 无额外 config。给持久 shell 提供 `terminals`。 | 与 bash / pwsh 后端同 realm。 | [E: packages/bundle/web-app/presets/minimal.patch.yml:23] |
| `terminal-bash` | `@deepseek-ai/dsh-terminal-bash`（组内） | 装 · win32 禁 | — | — | — | `timeoutMs: 300000`。`disabled: !!js process.platform === 'win32'`。 | POSIX PTY bash 后端。 | [E: packages/bundle/web-app/presets/minimal.patch.yml:25][E: packages/bundle/web-app/presets/minimal.patch.yml:27] |
| `persistent-bash` | `@deepseek-ai/dsh-tool-bash-persistent`（组内） | 装 · win32 禁 | — | — | — | `timeoutMs: 300000`；自带长 `description`。模型看见的 wire 名是 `bash`（persistent），不是 one-shot `dsh-tool-bash`。 | min 只要跨调用有状态的 shell。 | [E: packages/bundle/web-app/presets/minimal.patch.yml:30][E: packages/bundle/web-app/presets/minimal.patch.yml:32] |
| `terminal-pwsh` | `@deepseek-ai/dsh-terminal-bash`（组内） | 装 · 非 win32 禁 | — | — | — | `shellDialect: pwsh`，`timeoutMs: 300000`。`disabled: !!js process.platform !== 'win32'`。 | win32 上仍走 `dsh-terminal-bash`，方言改成 pwsh。 | [E: packages/bundle/web-app/presets/minimal.patch.yml:43][E: packages/bundle/web-app/presets/minimal.patch.yml:45][E: packages/bundle/web-app/presets/minimal.patch.yml:47] |
| `persistent-pwsh` | `@deepseek-ai/dsh-tool-pwsh-persistent`（组内） | 装 · 非 win32 禁 | — | — | — | `timeoutMs: 300000`。模型看见的 wire 名是 **`pwsh`**（persistent）。 | 对标 persistent bash。 | [E: packages/bundle/web-app/presets/minimal.patch.yml:49][E: packages/bundle/web-app/presets/minimal.patch.yml:51] |

### shell / filesystem / jobs（标准面）

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | — | 装 · win32 禁 | 装 · win32 禁 | 装 · win32 禁 | one-shot `bash`。`disabled: !!js process.platform === 'win32'`。 | 非 Windows 编码面的默认 shell。 | [E: packages/bundle/web-app/presets/standard.patch.yml:20][E: packages/bundle/web-app/presets/standard.patch.yml:22] |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | — | 装 · 非 win32 禁 | 装 · 非 win32 禁 | 装 · 非 win32 禁 | one-shot `pwsh`。`disabled: !!js process.platform !== 'win32'`。 | Windows 编码面的默认 shell。 | [E: packages/bundle/web-app/presets/standard.patch.yml:23][E: packages/bundle/web-app/presets/standard.patch.yml:25] |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | — | 装 | 装 | 装 | `read` / `read_image` / `write` / `edit`。 | min 不要文件系统工具。 | [E: packages/bundle/web-app/presets/standard.patch.yml:26] |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | — | 装 | 装 | 装 | `glob` / `grep`。`sampleOverCapGlobResults: false`。 | 与 `tool-fs` 同面。 | [E: packages/bundle/web-app/presets/standard.patch.yml:28][E: packages/bundle/web-app/presets/standard.patch.yml:31] |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | — | 装 | 装 | 装 | `job_output` / `job_list` / `job_kill`。 | 后台 job 的模型面。 | [E: packages/bundle/web-app/presets/standard.patch.yml:32] |

### skills / goal / planning / compaction

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | — | 装 | 装 | 装 | cordis 另写 `customSkillDirs` 指向 `dsh-agent-preset` 包内 `skills/`。 | creator skills 只给 cordis。 | std [E: packages/bundle/web-app/presets/standard.patch.yml:34]；cordis [E: packages/bundle/web-app/presets/cordis.patch.yml:143] |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | — | 装 | 装 | 装 | wire 名 `skill`。 | 与 filesystem 扫描配套。 | [E: packages/bundle/web-app/presets/standard.patch.yml:36] |
| `command-goal` | `@deepseek-ai/dsh-command-goal` | — | 装 | 装 | 装 | 人命令，不是模型可见 tool。 | 与 `tool-goal` 同面。 | [E: packages/bundle/web-app/presets/standard.patch.yml:38] |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | — | 装 | 装 | 装 | `get_goal` / `create_goal` / `update_goal`。 | 长任务目标。 | [E: packages/bundle/web-app/presets/standard.patch.yml:40] |
| `planning` | `cordis:group` | — | 装 | 装 | 装 | `isolate.planMode: true`。子行 `plan-mode`。 | planMode 必须进 isolate。 | [E: packages/bundle/web-app/presets/standard.patch.yml:42][E: packages/bundle/web-app/presets/standard.patch.yml:45] |
| `plan-mode` | `@deepseek-ai/dsh-plan-mode`（组内） | — | 装 | 装 | 装 | 登记 `exit_plan_mode` + 人命令 `plan`。带长 `section` 文案。 | 请求头工具目录跨模式保持稳定。 | [E: packages/bundle/web-app/presets/standard.patch.yml:48] |
| `compaction` | `cordis:group` | — | 装 | 装 | 装 | `isolate.compaction` + `toolResultPruner`。子行 `compaction-basic` / `command-compact` / `tool-result-pruner`。 | 摘要引擎是 agent-owned。 | [E: packages/bundle/web-app/presets/standard.patch.yml:63][E: packages/bundle/web-app/presets/standard.patch.yml:66] |
| `compaction-basic` | `@deepseek-ai/dsh-compaction-basic`（组内） | — | 装 | 装 | 装 | 摘要 compaction。 | min 无 compaction。 | [E: packages/bundle/web-app/presets/standard.patch.yml:70] |
| `command-compact` | `@deepseek-ai/dsh-command-compact`（组内） | — | 装 | 装 | 装 | 人命令 compact。 | 与引擎同 realm。 | [E: packages/bundle/web-app/presets/standard.patch.yml:72] |
| `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner`（组内） | — | 装 | 装 | 装 | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024`。 | 修剪超长 tool 结果。 | [E: packages/bundle/web-app/presets/standard.patch.yml:74] |

### delegation

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `delegation` | `cordis:group` | — | 装 | 装 | 装 | `isolate.workflowEngine: true`。 | workflow 引擎必须进 isolate。 | [E: packages/bundle/web-app/presets/standard.patch.yml:80][E: packages/bundle/web-app/presets/standard.patch.yml:83] |
| `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control`（组内） | — | 装 | 装 | 装 | `send_message` / `interrupt_agent`。 | continuable 子会话控制。 | [E: packages/bundle/web-app/presets/standard.patch.yml:86] |
| `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents`（组内） | — | 装 | 装 | 装 | `list_agents`。 | 与 control 分装，部署可只留投递。 | [E: packages/bundle/web-app/presets/standard.patch.yml:88] |
| `tool-subagent` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 装 | 装 | 装 | `provider: spawn`，`toolName: subagent`，`modelSelectionSettings: true`，`backgroundMode: continuable`。 | 出厂 spawn 委派。 | [E: packages/bundle/web-app/presets/standard.patch.yml:90][E: packages/bundle/web-app/presets/standard.patch.yml:95] |
| `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 装 | 装 | 装 | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable`。 | 出厂 **不是** one-shot fork。 | [E: packages/bundle/web-app/presets/standard.patch.yml:97][E: packages/bundle/web-app/presets/standard.patch.yml:101] |
| `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 禁 | 禁 | 禁 | `provider: codex`，`toolName: subagent_codex`，`backgroundMode: one-shot`，`maxDepth: provider-managed`。 | 产品行在但关掉。 | [E: packages/bundle/web-app/presets/standard.patch.yml:103][E: packages/bundle/web-app/presets/standard.patch.yml:105] |
| `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent`（组内） | — | 禁 | 禁 | 禁 | `provider: claude-code`，`toolName: subagent_claude_code`，`backgroundMode: one-shot`，`maxDepth: provider-managed`。 | 产品行在但关掉。 | [E: packages/bundle/web-app/presets/standard.patch.yml:110][E: packages/bundle/web-app/presets/standard.patch.yml:112] |
| `workflow-ptc` | `@deepseek-ai/dsh-workflow-ptc`（组内） | — | 装 | 禁 | 装 | `provider: spawn`。PTC **禁**。引擎包已从 `workflow-worker-thread` 迁到 `workflow-ptc`。 | PTC 不把 workflow 留给 ralph：三者全禁。 | std [E: packages/bundle/web-app/presets/standard.patch.yml:119]；ptc [E: packages/bundle/web-app/presets/ptc.patch.yml:119][E: packages/bundle/web-app/presets/ptc.patch.yml:120] |
| `tool-workflow` | `@deepseek-ai/dsh-tool-workflow`（组内） | — | 装 | 禁 | 装 | wire 名默认 `workflow`。PTC **禁**。 | 与 `workflow-ptc` 同开同关。 | std [E: packages/bundle/web-app/presets/standard.patch.yml:123]；ptc [E: packages/bundle/web-app/presets/ptc.patch.yml:124][E: packages/bundle/web-app/presets/ptc.patch.yml:126] |
| `tool-ralph` | `@deepseek-ai/dsh-tool-ralph`（组内） | — | 禁 | 禁 | 禁 | `subagentProvider: spawn`，`maxRounds: 64`。三个非 minimal shipped **都禁**。 | 出厂不把 Ralph loop 交给模型。 | [E: packages/bundle/web-app/presets/standard.patch.yml:125][E: packages/bundle/web-app/presets/standard.patch.yml:127] |

### ask / todo / web / present / presentation / plugin / cordis

| 名 | 类型/签名 | min | std | ptc | cordis | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|---|---|
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | — | 装 | 装 | 装 | `ask_user_question`。 | 阻塞等人。 | [E: packages/bundle/web-app/presets/standard.patch.yml:131] |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | — | 装 | 装 | 装 | `allowParallelInProgress: true`。 | schema 该键 required。 | [E: packages/bundle/web-app/presets/standard.patch.yml:133][E: packages/bundle/web-app/presets/standard.patch.yml:136] |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | — | 装 | 装 | 装 | `fetch: true`，`searchTimeoutMs: 60000`。同时登记 `web_search` 与 `web_fetch`。 | 出厂打开 fetch。 | [E: packages/bundle/web-app/presets/standard.patch.yml:137][E: packages/bundle/web-app/presets/standard.patch.yml:139] |
| `present` | `@deepseek-ai/dsh-tool-present` | — | 装 | 装 | 装 | 交付物声明。实现包在 `packages/deliverables/tool-present`。 | min 不交付文件。 | [E: packages/bundle/web-app/presets/standard.patch.yml:142] |
| `tool-presentation` | `@deepseek-ai/dsh-agent-tool-presentation` | — | — | 装 | — | `mode: ptc`。只出现在 ptc patch。 | 让该 standing mount 的模型只看见 `run_code`。 | [E: packages/bundle/web-app/presets/ptc.patch.yml:144][E: packages/bundle/web-app/presets/ptc.patch.yml:147] |
| `tool-plugin-manager` | `@deepseek-ai/dsh-plugin-manager/tools` | — | 禁 | 禁 | 条件禁 | wire 名 `plugin_manager`。std/ptc `disabled: true`；cordis `disabled: !!js "!ctx.get('profileContext')"`。 | 出厂不让模型改 profile；创造模式在有 profileContext 时打开。 | std [E: packages/bundle/web-app/presets/standard.patch.yml:144][E: packages/bundle/web-app/presets/standard.patch.yml:146]；cordis [E: packages/bundle/web-app/presets/cordis.patch.yml:152][E: packages/bundle/web-app/presets/cordis.patch.yml:154] |
| `tool-cordis` | `@deepseek-ai/dsh-tool-cordis` | — | — | — | 装 | 只登记 `cordis_inspect_list` / `cordis_inspect_query`。 | 只读 inspect；装插件改走 `plugin_manager`。 | [E: packages/bundle/web-app/presets/cordis.patch.yml:141] |

四个 shipped patch **都没有** `tool-terminal` / `tool-session-query` / `dsh-schedule` / `tool-lsp` / `tool-str-replace-editor` / `tool-workspace-dependencies`。后者由 `dsh-sdk-app` 挂，不进本表四列。

## 对照 / 分家 / 装配

**声明式，不再扫目录。** roster 不再 `scanRoot` `SHIPPED_PRESET_ROOT`。web-app 把四份 patch 写进 `dsh.bundle.patch`，每份 insert 一行 `dsh-agent-preset`。用户覆盖写 profile user patch，按 id 覆盖 `config.plugins`。[E: packages/bundle/web-app/package.json:43][E: packages/bundle/web-app/presets/standard.patch.yml:2]

**只有 web 挂 registry。** `dsh-web-app` insert `agent-preset-registry` `default: standard`。headless overlay 的 insert 是 `headless-startup` / `headless-runner`，没有 registry，也没有 preset 文件。[E: packages/bundle/web-app/cordis.patch.yml:559][E: packages/bundle/headless/cordis.patch.yml:21]

**isolate。** 发布 `planMode` / `compaction` / `toolResultPruner` / `workflowEngine` / `terminals` 的 group 必须 `isolate`。`leakedServices` 看见进 root isolate 的名字就抛。[E: packages/preset/agent-preset-registry/src/mount.ts:267]

**host 面 vs agent-preset 面。** `ctx.jobs` registry、`ctx.tools` registry、`ctx.subagents` backend、`ctx.fs` / `ctx.shell` Provider 在 host。preset 只决定这个 Agent 看见哪些 Consumer 行，以及哪些服务进 isolate。

## Sources

- `packages/bundle/web-app/presets/minimal.patch.yml`
- `packages/bundle/web-app/presets/standard.patch.yml`
- `packages/bundle/web-app/presets/ptc.patch.yml`
- `packages/bundle/web-app/presets/cordis.patch.yml`
- `packages/bundle/web-app/package.json`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/preset/agent-preset/src/index.ts`
- `packages/preset/agent-preset-registry/src/index.ts`
- `packages/preset/agent-preset-registry/src/mount.ts`
- `packages/preset/agent-preset-registry/src/display.ts`
- `packages/preset/agent-preset-registry/src/session.ts`
- `packages/preset/persona/src/index.ts`
- `packages/client/ui-agent-preset/src/client/locales.ts`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/sdk-app/cordis.patch.yml`
- `packages/bundle/sdk-minimal/cordis.patch.yml`
- `packages/bundle/acp-app/cordis.patch.yml`
- `packages/boot/app-boot/src/profile.ts`

## 相关

- [surface.presets.overview](../surface/presets/overview.md) — roster / default `standard` / 各 profile 是否挂 preset
- [surface.presets.minimal](../surface/presets/minimal.md) — 只有 persistent shell
- [surface.presets.standard](../surface/presets/standard.md) — 出厂编码面
- [surface.presets.code](../surface/presets/code.md) — PTC 稳定别名
- [surface.presets.cordis](../surface/presets/cordis.md) — 创造模式
- [spine.composition-boot](../spine/composition-boot.md) — `profile → bundle → preset`
- [subsys.composition.agent-presets](../subsystems/composition/agent-presets.md) — registry / standing mount
- [surface.profiles.web](../surface/profiles/web.md) — 唯一挂 roster 的 shipped profile
- [surface.profiles.headless](../surface/profiles/headless.md) — 不挂 preset
- [ref.tools-catalog](tools-catalog.md) — wire 名全集
