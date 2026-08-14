---
id: surface.presets.cordis
title: cordis preset
kind: surface
tier: T1
pkg: composition
source:
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/preset.yml
  - apps/cli/config/agent-presets/cordis/skills/editing-cordis-compositions/SKILL.md
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/preset.yml
  - apps/cli/config/agent-presets/code/preset.yml
  - apps/cli/config/agent-presets/minimal/preset.yml
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - apps/web/tests/agent-preset-authoring.e2e.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/src/index.ts
  - packages/extensions/tool-cordis/src/index.ts
  - packages/extensions/tool-cordis/src/prompt.ts
  - packages/extensions/cordis-host-runner/src/index.ts
  - packages/extensions/cordis-host-runner/src/sandbox.ts
  - packages/preset/agent-presets/src/authoring.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/preset.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/preset/persona/src/index.ts
  - packages/skill/skill-filesystem/src/index.ts
symbols:
  - CORDIS_SYSTEM_PROMPT
  - evaluateHostCode
  - customSkillDirs
  - copyComposition
  - deleteComposition
related:
  - surface.presets.overview
  - ref.presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `cordis` 是 shipped **agent-preset 面**里的「创造模式」：目录名即 id，成员资格只认 `apps/cli/config/agent-presets/cordis/agent.cordis.yml`。它在 `standard` 的编码工具集上再挂 `@deepseek-ai/dsh-tool-cordis`，让本会话读/改自己正在跑的 Cordis 组合，用来再写另一个 preset。DSH 是 `profile → bundle → agent preset` 的组合运行时，不是又一个 coding agent；host 面仍握着 registries / sandbox / approval / persistence / model route / `dynamicCordisRunner`。

## 能回答的问题

- `cordis` preset 的 `agent.cordis.yml` 按文件顺序列出了哪些 top-level `id:`？和 `standard` 比多了什么、挪了什么？
- `preset.yml` 的 `name` / `order` 是什么？web 默认会不会选 `cordis`？
- persona 怎么划分 HOST / AGENT PRESET 两平面？为什么禁止改 shipped `agent-presets/`？
- `tool-cordis` 向模型登记哪些名字？`standard` 会话看不看得到？
- `skill-filesystem.customSkillDirs` 解析到哪？`editing-cordis-compositions` 为什么只出现在本 preset 的 skill catalog？
- 发布服务的 isolate 组有哪些？`tool-cordis` 为什么可以不进 realm？mount 失败、删 shipped、改 composition 分别怎么响？

## 是什么

DeepSeek Harness（DSH）把能力做成 Cordis plugin 行：capability seam 是 **Definition**（yml 行 + 包）/ **Provider**（`ctx.provide` / isolate realm）/ **Consumer**（`inject` / `ctx.get`）。模型看见的工具与 prompt 必须能在 session 日志里重建（`model-visible ⟺ logged`）；preset 选择写在 header 与后续 `agent-preset/selected` 事件里，重建读 `resolveSessionPreset`：从事件尾向前扫，命中最新一条 `agent-preset/selected` 即返回 [E: packages/preset/agent-presets/src/session.ts:51]。

四个 shipped preset 的成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。仓库里存在 `@deepseek-ai/dsh-tool-cordis` 不等于产品默认给每个会话挂上它。`preset.yml` 只提供 picker 用的 `name` / `description` / `order`，不决定装哪些 plugin [E: packages/preset/agent-presets/src/metadata.ts:25]。

`cordis` 的 id 是目录名 `cordis`，发现时写入 `AgentPreset.id` [E: packages/preset/agent-presets/src/discovery.ts:160]。web 进程从 shipped root 列出的四个 id 是 `code` / `cordis` / `minimal` / `standard` [E: apps/cli/tests/web-agent-presets.e2e.ts:190]，全部 `trust: 'system'` [E: apps/cli/tests/web-agent-presets.e2e.ts:191]，roster 默认是 `standard` 而不是 `cordis` [E: apps/cli/tests/web-agent-presets.e2e.ts:192]。

相对 `standard`，本 composition 的可执行增量只有三处（其余同行同 config，但 **skill 两行被挪到文件末尾**，不要按 `standard` 的中段结构去对）：

1. `persona.config.text` 改成两平面说明、禁止改 shipped 目录、动手前先 load `editing-cordis-compositions` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:20]。
2. 末尾增加 `tool-cordis` → `@deepseek-ai/dsh-tool-cordis` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245]。
3. 末尾的 `skill-filesystem` 带 `customSkillDirs`，`!!js` 用 `baseUrl` 解析本 preset 目录下的 `skills/` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:258]。

没有 `tool-presentation`（那是 `code` preset 的增量）、没有 `tool-str-replace-editor`、没有 `tool-bash-persistent`。e2e 在 mount `cordis` 后断言 catalog 含整组 `cordis_*` [E: apps/cli/tests/web-agent-presets.e2e.ts:270]、以及 `bash` / `read` / `edit` / `skill` [E: apps/cli/tests/web-agent-presets.e2e.ts:274]，且不含 `str_replace_editor` [E: apps/cli/tests/web-agent-presets.e2e.ts:275]。

yml 头注释把 TRUST 说成「`cordis_mount` 对 live runtime 求值模型写的 JS，本会话 ≈ shell access」。注释行不能当 [E]；该陈述标 [I]。当前可执行登记名是 `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` 与三条 `cordis_inspect_*`，不是 `cordis_mount` [U]。求值本身落在 host 面 `evaluateHostCode` → `node:vm` `runInContext` [E: packages/extensions/cordis-host-runner/src/sandbox.ts:229]。

## 入口

用户 / 进程碰到 `cordis` 的路径：

| 碰到方式 | 发生什么 |
|---|---|
| 目录 | `apps/cli/config/agent-presets/cordis/`：必有 `agent.cordis.yml`（`COMPOSITION_FILE`）[E: packages/preset/agent-presets/src/discovery.ts:26]，可选 `preset.yml`（`METADATA_FILE`）[E: packages/preset/agent-presets/src/metadata.ts:25]，另有 `skills/`（只因 yml 的 `customSkillDirs` 才进 catalog）。 |
| `dsh web`（`--profile web`） | `packages/bundle/web-app/cordis.patch.yml` insert `agent-presets` 且 `default: standard` [E: packages/bundle/web-app/cordis.patch.yml:424]。CLI `composeProfile` 若树里已有 `agent-presets` 行，再 overlay shipped root `apps/cli/config/agent-presets/`、`trust: 'system'` [E: apps/cli/src/profile-boot.ts:164]。 |
| 设置 UI「创造模式」 | Web e2e 点「用「创造模式」创作自定义预设」后，新 session 的 `agentPreset` 为 `"cordis"` [E: apps/web/tests/agent-preset-authoring.e2e.ts:273]。 |
| `AgentPresets.mount(agentCtx, 'cordis')` | 约定从 agent factory 的 `setup(agentCtx)` 调用：先 `ensureStanding`，再 `bindScopeParent` join [E: packages/preset/agent-presets/src/index.ts:286]。mount 抛错则 `setup` 失败，agent 不会以半挂载状态发布。 |
| 用户根 | `includeUserRoot` 默认 `true` 时追加 `$DSH_HOME/.agent-presets`（`USER_PRESET_DIR`）[E: packages/preset/agent-presets/src/index.ts:92]。本地创作必须 `copy` 到这个 `user` 根，不能改 shipped 目录。 |
| `dsh --profile headless` | **不挂** `agent-presets` roster。runner `setup` 只 `installModelSelection` [E: packages/bundle/headless/src/index.ts:117]，不调用 `agentPresets.mount`。本 preset 不是 headless 默认工具集。 |

默认安装面是本地 Web GUI（`dsh web`）。本仓没有 shipped TUI 包；help 例子里的 `tui` 只是自定义 profile 名。

## 关键字段

### `preset.yml`（显示元数据，不是成员资格）

| 字段 | 值 | 含义 |
|---|---|---|
| `name` | `创造模式` [E: apps/cli/config/agent-presets/cordis/preset.yml:1] | picker / UI 文案。shipped 行在 Web 上还会被 `ui-agent-preset` 的 locale 覆盖显示，但文件里写的就是这四个汉字。 |
| `description` | `用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。` [E: apps/cli/config/agent-presets/cordis/preset.yml:2] | 一句话定位。 |
| `order` | `4` [E: apps/cli/config/agent-presets/cordis/preset.yml:3] | 四个 shipped 里最后一位：`standard` `order: 1` [E: apps/cli/config/agent-presets/standard/preset.yml:3]、`code` `order: 2` [E: apps/cli/config/agent-presets/code/preset.yml:3]、`minimal` `order: 3` [E: apps/cli/config/agent-presets/minimal/preset.yml:3]、`cordis` `order: 4`。`scanRoot` 按 `order` 再按 id 排序 [E: packages/preset/agent-presets/src/discovery.ts:167]。 |

### `agent.cordis.yml` 成员表（按文件顺序；每个 top-level `id:` 一行）

成员资格只认这些行。`#` 注释不是成员。group 子行写在「组内」列。

| `id` | `name` | isolate / `disabled` / config | 相对 `standard` |
|---|---|---|---|
| `persona` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:17] | `@deepseek-ai/dsh-persona` | `text: \|-` 多段英文。未写 `complete` / `includeRuntimeContext`，插件默认 `complete: false` [E: packages/preset/persona/src/index.ts:50]、`includeRuntimeContext: true` [E: packages/preset/persona/src/index.ts:51]。 | **文本不同**。`standard` 只有一句 `You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:28]。本文件声明：跑在 DeepSeek Harness 上、组合即 Cordis plugin 行 [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:21]；HOST 握 registries / persistence / sandbox / approval / model route / subagent backends，AGENT PRESET 贡献 tools / persona / prompt sections，发布服务必须进 host 或 `isolate` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:25]；作者目录是 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/<id>/`，**NEVER edit or delete** shipped `agent-presets`（升级会覆盖；弄坏 `cordis` 会废掉本模式），要改就 copy [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:27]；改 composition 前先 load `editing-cordis-compositions` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:29]。 |
| `agent-instructions` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:31] | `@deepseek-ai/dsh-agent-instructions` | `maxBytes: 65536` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:34] | 同 id/config |
| `tool-bash` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:45] | `@deepseek-ai/dsh-tool-bash` | `disabled: !!js process.platform === 'win32'` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:47] | 同 id/config。消费 host 面 `shell` / sandbox，本行不发布服务。 |
| `tool-pwsh` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:49] | `@deepseek-ai/dsh-tool-pwsh` | `disabled: !!js process.platform !== 'win32'` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:51] | 同 id/config |
| `tool-fs` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:57] | `@deepseek-ai/dsh-tool-fs` | 无 config | 同 id/config。`fs` policy 留在 host。 |
| `tool-fs-search` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:60] | `@deepseek-ai/dsh-tool-fs-search` | `sampleOverCapGlobResults: false` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:63] | 同 id/config |
| `tool-jobs` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:74] | `@deepseek-ai/dsh-tool-jobs` | 无 config | 同 id/config。jobs **registry** 在 host；本行只是模型可见控制。 |
| `tool-goal` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:85] | `@deepseek-ai/dsh-tool-goal` | 无 config | 同 id/config。**位置前移**：`standard` 在 `tool-jobs` 与 `planning` 之间先写 `skill-filesystem` / `tool-skill` [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:83]；本文件把 skill 两行放到 `tool-cordis` 之后。goal **service** 在 host。 |
| `planning` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:92] | `cordis:group` | `group: true`；`isolate.planMode: true` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:96] | 同 id/config |
| └ `plan-mode` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:98] | `@deepseek-ai/dsh-plan-mode` | 长 `section`（plan mode 规则、禁止在 plan 阶段落地改文件、最后只准 `exit_plan_mode`）[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:101] | 同 id/config |
| `compaction` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:125] | `cordis:group` | `isolate.compaction: true` 且 `toolResultPruner: true` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:129] | 同 id/config。`tokenMeter` 不进本 realm，留在 host。 |
| └ `compaction-basic` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:132] | `@deepseek-ai/dsh-compaction-basic` | 无额外 config | 同 |
| └ `command-compact` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:135] | `@deepseek-ai/dsh-command-compact` | 无额外 config | 同 |
| └ `tool-result-pruner` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:138] | `@deepseek-ai/dsh-compaction-tool-result-pruner` | `thresholdChars: 8192`、`headChars: 4096`、`tailChars: 1024` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:141] | 同 |
| `delegation` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:162] | `cordis:group` | `isolate.workflowEngine: true` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:166] | 同 id/config。`subagents` registry 与 spawn/fork **backends** 在 host；本 isolate 键是 `workflowEngine`。 |
| └ `tool-subagent-control` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:168] | `@deepseek-ai/dsh-tool-subagent-control` | | 同 |
| └ `tool-subagent-list-agents` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:171] | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | | 同 |
| └ `tool-subagent` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:174] | `@deepseek-ai/dsh-tool-subagent` | `provider: spawn`、`toolName: subagent`、`backgroundMode: continuable` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:179] | 同 |
| └ `tool-subagent-fork` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:181] | `@deepseek-ai/dsh-tool-subagent` | `provider: fork`、`toolName: subagent_fork`、`backgroundMode: continuable` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:186] | 同 |
| └ `tool-subagent-codex` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:191] | `@deepseek-ai/dsh-tool-subagent` | `disabled: true`；`provider: codex`、`toolName: subagent_codex`、`enableRunInBackground: false`、`maxDepth: provider-managed` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:193] | 同。要暴露须 copy 后去掉 `disabled`。 |
| └ `tool-subagent-claude-code` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:200] | `@deepseek-ai/dsh-tool-subagent` | `disabled: true`；`provider: claude-code`、`toolName: subagent_claude_code`、同样的 background/depth [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:202] | 同 |
| └ `workflow-worker-thread` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:209] | `@deepseek-ai/dsh-workflow-worker-thread` | `provider: spawn` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:212] | 同 |
| └ `tool-workflow` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:214] | `@deepseek-ai/dsh-tool-workflow` | | 同 |
| └ `tool-ralph` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:217] | `@deepseek-ai/dsh-tool-ralph` | `subagentProvider: spawn`、`maxRounds: 64` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:221] | 同 |
| `tool-ask-user` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:225] | `@deepseek-ai/dsh-tool-ask-user` | | 同 |
| `tool-todo` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:228] | `@deepseek-ai/dsh-tool-todo` | `allowParallelInProgress: true` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:231] | 同 |
| `tool-web` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:235] | `@deepseek-ai/dsh-tool-web` | `fetch: false`、`searchTimeoutMs: 60000` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:238] | 同。`web` service 在 host。 |
| `tool-cordis` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245] | `@deepseek-ai/dsh-tool-cordis` | 无 config、无 isolate | **本 preset 增量**。`standard` 无此行。插件 `inject` 为 `tools` / `systemPrompt` / `dynamicCordisRunner` / `cordisInspect` [E: packages/extensions/tool-cordis/src/index.ts:27]，全部消费 host 已提供的服务，本行不 `provide`，因此不必进 realm。 |
| `skill-filesystem` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:255] | `@deepseek-ai/dsh-skill-filesystem` | `customSkillDirs: [ !!js "process.getBuiltinModule('node:url').fileURLToPath(new URL('skills/', baseUrl))" ]` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:259] | **位置 + config 都不同**。`standard` 同 id 无 `customSkillDirs`，且写在 `tool-jobs` 之后 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:83]。`baseUrl` 是 preset 目录（`Include` 会把它改成 composition 所在目录），所以 `skills/` 跟着 preset 走。 |
| `tool-skill` [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261] | `@deepseek-ai/dsh-tool-skill` | 无 config | 同包；**位置**在文件最后，紧跟带 `customSkillDirs` 的 `skill-filesystem`。 |

`customSkillDirs` 是 `@deepseek-ai/dsh-skill-filesystem` 的 Config 数组，默认 `[]` [E: packages/skill/skill-filesystem/src/index.ts:81]。provider 把每一项 `resolve` 后插入 roots，`source: 'custom'`、`rank` 为 `CUSTOM_RANK`（常量 `300`）[E: packages/skill/skill-filesystem/src/index.ts:38][E: packages/skill/skill-filesystem/src/index.ts:250]。web e2e：mount `cordis` 后 `ctx.skills.list({ scope: agent })` 含 `editing-cordis-compositions` [E: apps/cli/tests/web-agent-presets.e2e.ts:280]，无 scope 的全局 list 不含该名 [E: apps/cli/tests/web-agent-presets.e2e.ts:281]。同目录还放了 `cordis-plugin-development/`（`CORDIS_SYSTEM_PROMPT` 要求做动态 plugin 前 load 它 [E: packages/extensions/tool-cordis/src/prompt.ts:24]）；成员资格仍只认 yml 的 `customSkillDirs` 行，不认 SKILL.md 正文。

### `tool-cordis` 模型可见名

`apply` 往 `ctx.tools` 登记七个名字（同时挂 `systemPrompt` section `tool:cordis`，文本为 `CORDIS_SYSTEM_PROMPT`）[E: packages/extensions/tool-cordis/src/index.ts:36]：

| 模型看见的 `name` | 登记行 |
|---|---|
| `cordis_inspect_list` | [E: packages/extensions/tool-cordis/src/index.ts:42] |
| `cordis_inspect_query` | [E: packages/extensions/tool-cordis/src/index.ts:61] |
| `cordis_inspect_self` | [E: packages/extensions/tool-cordis/src/index.ts:97] |
| `cordis_define` | [E: packages/extensions/tool-cordis/src/index.ts:149] |
| `cordis_run` | [E: packages/extensions/tool-cordis/src/index.ts:241] |
| `cordis_stop` | [E: packages/extensions/tool-cordis/src/index.ts:330] |
| `cordis_undefine` | [E: packages/extensions/tool-cordis/src/index.ts:352] |

`cordis_define` 的 `code.host` / `code.client` 是「plain JavaScript function body，无 TS/JSX/import 变换」[E: packages/extensions/tool-cordis/src/index.ts:154]。define 只校验并入库，不执行 `apply`；真正跑起来走 `cordis_run` → host `DynamicCordisRunnerService.startHost` → `evaluateHostCode` [E: packages/extensions/cordis-host-runner/src/index.ts:899]。`CORDIS_SYSTEM_PROMPT` 写明 restricted environment **不是**恶意代码的 security boundary，动态代码拿到的 Service 连真实 runtime [E: packages/extensions/tool-cordis/src/prompt.ts:8]。

mount `standard` 的会话 catalog **不含** `cordis_define`：自指工具集按会话 opt-in，不是进程环境光环 [E: apps/cli/tests/web-agent-presets.e2e.ts:326]。

## 装配与门控

1. **谁把它放进 roster。** `PRESET_ID = /^[a-z0-9][a-z0-9-]*$/` [E: packages/preset/agent-presets/src/preset.ts:18]。目录缺 `agent.cordis.yml` 或 YAML 不成形则 `broken`，仍占 id，但 `resolveMountable` 拒绝挂载。web 组合树 insert `agent-presets` 之后，CLI 把 shipped root 写成 `trust: 'system'` [E: apps/cli/src/profile-boot.ts:164]。`AgentPresets.defaultId` = settings `agent-presets.default` 否则 `config.default` [E: packages/preset/agent-presets/src/index.ts:192]；web patch 的 default 是 `standard` [E: packages/bundle/web-app/cordis.patch.yml:424]。
2. **何时 init。** 每个 preset **standing mount 一次**；会话在 agent factory `setup` 里 `AgentPresets.mount`，再 `bindScopeParent` join [E: packages/preset/agent-presets/src/index.ts:286]。子 agent 用 `composeFrom` join 同一代 composition，不按 id 重读文件。
3. **host 依赖。** `tool-cordis` 等待 host 的 `dynamicCordisRunner` / `cordisInspect`。web-app 在 host 面 insert `cordis-host-runner`（`@deepseek-ai/dsh-cordis-host-runner`）[E: packages/bundle/web-app/cordis.patch.yml:102]，其 service 名是 `dynamicCordisRunner` [E: packages/extensions/cordis-host-runner/src/index.ts:140]。缺这些服务时 `inactiveRows` 报 `waiting for …`，`mountPreset` 对未激活行直接 throw [E: packages/preset/agent-presets/src/mount.ts:359]。
4. **isolate / 泄漏。** 发布服务的行必须在 `isolate` 组里。本文件的 realm 是 `planning.planMode`、`compaction.compaction` + `toolResultPruner`、`delegation.workflowEngine`。`leakedServices` 扫到写入 root realm 的 provide 就拒绝：「a preset service must sit behind an `isolate` realm or move to the host composition」[E: packages/preset/agent-presets/src/mount.ts:365]。`tool-cordis` / `tool-bash` / `tool-fs` / `skill-filesystem` 只往 host 已有的 layered registry 注册，不 provide，故可散装。
5. **不可改 shipped。** persona 把 shipped `agent-presets` 标成部署财产 [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:27]。authoring 只暴露整目录 `copyComposition`（composition + metadata + skill 目录一起 `cp`，dereference symlink）[E: packages/preset/agent-presets/src/authoring.ts:149]；`deleteComposition` 在 `preset.trust !== 'user'` 时抛 `PresetNotWritableError`（`it ships with the deployment`）[E: packages/preset/agent-presets/src/authoring.ts:187]。`PresetTree.write` 是空实现，session 结束不会把 shipped yml 截成 `[]` [E: packages/preset/agent-presets/src/mount.ts:110]。
6. **失败怎么响。** 未知 id → `UnknownPresetError`。broken / 行未激活 / 服务泄漏 → `PresetMountError`，catch 里 `handle.dispose()`，调用方看不到半挂载树 [E: packages/preset/agent-presets/src/mount.ts:371]。动态 package 的 Host 半在 `node:vm` 里跑，同步超时默认 `vmTimeoutMs: 5000` [E: packages/extensions/cordis-host-runner/src/index.ts:128]；async body 能逃出该超时（模块自己的 trust stance）。
7. **日志。** 创建 header 记下当时的 preset；blank 窗口改选后，日志事件类型是 `agent-preset/selected`（payload 为 `{ agentPreset: string }`）[E: packages/preset/agent-presets/src/session.ts:26]。重建用 `resolveSessionPreset` 从事件尾向前取最新一条 [E: packages/preset/agent-presets/src/session.ts:51]。preset 决定工具 schema 与 prompt sections，所以 selection 必须进日志（model-visible ⟺ logged）。

## 跨包关系

- [`surface.presets.overview`](overview.md)：roster 发现、`COMPOSITION_FILE` / `METADATA_FILE`、standing mount、`defaultId`、authoring 只能 copy。本页只展开 id=`cordis` 的成员表与增量。
- [`ref.presets`](../../reference/presets.md)：四 preset 对照与配置键总表。本页是 `cordis` 行的权威展开。
- [`surface.presets.standard`](standard.md)：本文件除 persona 文本、`tool-cordis`、末尾带 `customSkillDirs` 的 skill 两行外，与 `standard` 同行同 config。`standard` 是 web 的 `default`。
- [`surface.presets.code`](code.md)：`code` 相对 `standard` 的 shipped 增量是 `tool-presentation` `mode: code`（模型面对 `run_code`），**没有** `tool-cordis`。
- [`surface.presets.minimal`](minimal.md)：极简成员（`persona.complete: true`、persistent bash + `str-replace-editor`），没有 compaction / skill / subagent / `tool-cordis`。
- [`surface.profiles.web`](../profiles/web.md)：host 面 disable base 上的模型可见工具行，改由每会话 preset 再挂；并 insert `agent-presets` + `cordis-host-runner`，本 preset 的 `tool-cordis` 才有 Provider。
- [`surface.profiles.headless`](../profiles/headless.md)：无 preset roster；模型可见工具来自 `dsh-base` host 行，不是 shipped `cordis`。
- [`spine.composition-boot`](../../spine/composition-boot.md)：`PROFILE_TEMPLATES` / `composeEntries` / CLI 叠层（bundle → profile patch → home patch → `--patch` → shipped preset root）。
- `@deepseek-ai/dsh-tool-cordis` + `@deepseek-ai/dsh-cordis-host-runner`：Definition 在 preset 行 `tool-cordis`；Provider 是 host 的 `dynamicCordisRunner` / `cordisInspect`；Consumer 是七个 `cordis_*` 工具。没有单独的 tool 节点 id 时，以这两包源码为准。
- `@deepseek-ai/dsh-skill-filesystem`：`customSkillDirs` 把本 preset 的 `skills/` 铺进 **该 standing mount 的** skill 层，不污染全局 catalog。

## Sources

- `apps/cli/config/agent-presets/cordis/agent.cordis.yml`
- `apps/cli/config/agent-presets/cordis/preset.yml`
- `apps/cli/config/agent-presets/cordis/skills/editing-cordis-compositions/SKILL.md`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `apps/cli/config/agent-presets/standard/preset.yml`
- `apps/cli/config/agent-presets/code/preset.yml`
- `apps/cli/config/agent-presets/minimal/preset.yml`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/tests/web-agent-presets.e2e.ts`
- `apps/web/tests/agent-preset-authoring.e2e.ts`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/headless/src/index.ts`
- `packages/extensions/tool-cordis/src/index.ts`
- `packages/extensions/tool-cordis/src/prompt.ts`
- `packages/extensions/cordis-host-runner/src/index.ts`
- `packages/extensions/cordis-host-runner/src/sandbox.ts`
- `packages/preset/agent-presets/src/authoring.ts`
- `packages/preset/agent-presets/src/discovery.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/src/metadata.ts`
- `packages/preset/agent-presets/src/mount.ts`
- `packages/preset/agent-presets/src/preset.ts`
- `packages/preset/agent-presets/src/session.ts`
- `packages/preset/persona/src/index.ts`
- `packages/skill/skill-filesystem/src/index.ts`

## 相关

- [`surface.presets.overview`](overview.md) — agent preset 总览：发现、standing mount、默认 id、authoring。
- [`ref.presets`](../../reference/presets.md) — preset 对照与配置键。

同批邻居（不在本节点 `related` 里，链接按 index path）：[`surface.presets.standard`](standard.md)、[`surface.presets.code`](code.md)、[`surface.presets.minimal`](minimal.md)、[`surface.profiles.web`](../profiles/web.md)、[`surface.profiles.headless`](../profiles/headless.md)、[`spine.composition-boot`](../../spine/composition-boot.md)。
