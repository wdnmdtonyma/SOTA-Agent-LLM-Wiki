---
id: surface.presets.cordis
title: cordis preset
kind: surface
tier: T1
pkg: composition
source:
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/session.ts
  - packages/preset/agent-preset-registry/src/display.ts
  - packages/preset/persona/src/index.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/extensions/tool-cordis/src/index.ts
  - packages/boot/plugin-manager/src/tools.ts
  - packages/boot/config-editor/src/index.ts
  - packages/client/ui-agent-preset/src/client/locales.ts
  - packages/bundle/headless/src/index.ts
  - packages/deliverables/tool-present/src/index.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - apps/web/tests/agent-preset-authoring.e2e.ts
symbols:
  - customSkillDirs
  - cordis_inspect_list
  - cordis_inspect_query
  - plugin_manager
related:
  - surface.presets.overview
  - ref.presets
evidence: explicit
status: verified
updated: 477b4f4205
---

> `cordis` 是 shipped **agent-preset 面**里的「创造模式」：行 id `preset-cordis`，roster 身份 `config.id: cordis`，成员资格只认 `packages/bundle/web-app/presets/cordis.patch.yml` 的 `plugins[]`。它在 `standard` 的编码工具集上再挂 `@deepseek-ai/dsh-tool-cordis`（只读 inspect）与条件启用的 `plugin_manager`，并把 creator skills 目录铺进本 standing mount 的 skill 层。文件末尾同样挂 `present`。四个 shipped **只叠在 `dsh-web-app`**。DSH 是 `profile → bundle → agent preset` 的组合运行时；host 面仍握着 registries / sandbox / approval / persistence / model route / `dynamicCordisRunner`。

## 能回答的问题

- `cordis` preset 的 `plugins[]` 按文件顺序列出了哪些 top-level `id:`？和 `standard` 比多了什么、挪了什么？
- locale 的 `name` / YAML 的 `order` 是什么？web 默认会不会选 `cordis`？
- persona 现在还划 HOST / AGENT PRESET 两平面吗？为什么和 `standard` 同文？
- `tool-cordis` 向模型登记哪些名字？`standard` 会话看不看得到？`plugin_manager` 在什么条件下启用？
- `skill-filesystem.customSkillDirs` 解析到哪？`editing-cordis-compositions` 为什么只出现在本 preset 的 skill catalog？
- 发布服务的 isolate 组有哪些？`tool-cordis` 为什么可以不进 realm？mount 失败、覆盖 shipped 声明分别怎么响？

## 是什么

DeepSeek Harness（DSH）把能力做成 Cordis plugin 行：capability seam 是 **Definition**（yml 行 + 包）/ **Provider**（`ctx.provide` / isolate realm）/ **Consumer**（`inject` / `ctx.get`）。模型看见的工具与 prompt 必须能在 session 日志里重建（`model-visible ⟺ logged`）。blank 窗口改选后，日志事件类型是 `agent-preset/selected`（payload `{ agentPreset: string }`）[E: packages/preset/agent-preset-registry/src/session.ts:28]。重建读 `agentPreset` Session projection：`init` 取 header 的 `agentPreset`，`apply` 在看到 `agent-preset/selected` 时换成该事件的 `agentPreset` [E: packages/preset/agent-preset-registry/src/session.ts:38] [E: packages/preset/agent-preset-registry/src/session.ts:39]。

四个 shipped preset 的成员资格只认 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml` 的 `plugins[]`；这些文件只出现在 `dsh-web-app` 的 `dsh.bundle.patch` 列表里 [E: packages/bundle/web-app/package.json:43]。仓库里存在 `@deepseek-ai/dsh-tool-cordis` 不等于产品默认给每个会话挂上它。YAML **不**写 `name` / `description`；picker 走 locale [E: packages/preset/agent-preset-registry/src/display.ts:44]。

`cordis` 的 roster id 是 `config.id: cordis` [E: packages/bundle/web-app/presets/cordis.patch.yml:8]。web 进程列出的四个 id 是 `cordis` / `minimal` / `ptc` / `standard` [E: apps/cli/tests/web-agent-presets.e2e.ts:248]，roster 默认是 `standard` 而不是 `cordis` [E: apps/cli/tests/web-agent-presets.e2e.ts:250]。wiki 节点 id `surface.presets.code` 仍是 **PTC** 预设的稳定别名，声明文件是 `ptc.patch.yml`，不是 `code`。

相对 `standard`，本 composition 的可执行增量主要有三处（其余同行同 config，但 **skill 两行被挪到 `tool-cordis` 之后**）：

1. 增量 `tool-cordis` → `@deepseek-ai/dsh-tool-cordis` [E: packages/bundle/web-app/presets/cordis.patch.yml:141]。
2. `skill-filesystem` 带 `customSkillDirs`，`!!js` 解析 `@deepseek-ai/dsh-agent-preset/package.json` 旁的 `skills/` [E: packages/bundle/web-app/presets/cordis.patch.yml:147]。
3. `tool-plugin-manager` 的 `disabled: !!js "!ctx.get('profileContext')"`：web 有 `profileContext` 时启用 `plugin_manager` [E: packages/bundle/web-app/presets/cordis.patch.yml:154]。`present` 与 `standard` 一样挂在 skill 之后 [E: packages/bundle/web-app/presets/cordis.patch.yml:150]。

persona `prefix` / `suffix` 与 `standard` 同文（folded YAML 与 literal 在装配后相等）；e2e 钉死两个会话的 `deployment:persona-*` section 完全一致 [E: apps/cli/tests/web-agent-presets.e2e.ts:393]。创造模式的操作细则在 skill catalog 与 tool description，不在 persona。

没有 `tool-presentation`（那是 `ptc` preset 的增量，`mode: ptc`）[E: packages/bundle/web-app/presets/ptc.patch.yml:144]、没有 `tool-str-replace-editor`（**四个 shipped 都不挂**）、没有 `persistent-shell`。e2e 在 mount `cordis` 后断言 catalog 含 `cordis_inspect_list` / `cordis_inspect_query` / `plugin_manager` [E: apps/cli/tests/web-agent-presets.e2e.ts:365]，**不含** `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` / `cordis_inspect_self` [E: apps/cli/tests/web-agent-presets.e2e.ts:368]，以及含 `bash` / `read` / `edit` / `skill` [E: apps/cli/tests/web-agent-presets.e2e.ts:371]，且不含 `str_replace_editor` [E: apps/cli/tests/web-agent-presets.e2e.ts:372]。

## 入口

用户 / 进程碰到 `cordis` 的路径：

| 碰到方式 | 发生什么 |
|---|---|
| 声明文件 | `packages/bundle/web-app/presets/cordis.patch.yml`：行 id `preset-cordis`，`config.id: cordis`，`plugins[]` 是成员表。creator skills 只因 yml 的 `customSkillDirs` 才进 catalog。 |
| `dsh web`（`--profile web`） | 五个 shipped CLI profile 里 **只有 web** 挂 roster：`cordis.patch.yml` insert `agent-preset-registry` 且 `default: standard`，再叠四份 preset 文件 [E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/cordis.patch.yml:562] [E: packages/bundle/web-app/package.json:43]。 |
| 设置 UI「创造模式」 | Web e2e 点「让 Agent 帮我创建预设模式」后，新 session 的 `agentPreset` 为 `"cordis"` [E: apps/web/tests/agent-preset-authoring.e2e.ts:88] [E: apps/web/tests/agent-preset-authoring.e2e.ts:105]。 |
| `AgentPresetRegistry.mount(agentCtx, 'cordis')` | 约定从 agent factory 的 `setup(agentCtx)` 调用：先 `retain`，再 `bindScopeParent` join [E: packages/preset/agent-preset-registry/src/index.ts:257]。mount 抛错则 `setup` 失败，agent 不会以半挂载状态发布。 |
| 用户覆盖 | 覆盖写在 profile `cordis.patch.yml`，按行 id `preset-cordis` 整键替换 `config`（含 `plugins`）。`ConfigEditor.edit` 是这条写路径 [E: packages/boot/config-editor/src/index.ts:75]。 |
| `dsh --profile headless` / `sdk` / `sdk-minimal` / `acp` | **不挂** registry，也 **不含** 这份 patch 文件。headless runner `setup` 不调用 `agentPresets.mount`。本 preset 不是这些 profile 的默认工具集。 |

默认安装面是本地 Web GUI（`dsh web`）。本仓没有 shipped TUI 包；help 例子里的 `tui` 只是自定义 profile 名。`desktop` 不是第六个 CLI profile。

## 关键字段

### 显示元数据（locale，不是成员资格）

| 字段 | 值 | 含义 |
|---|---|---|
| locale `presetCordisName` | `创造模式` [E: packages/client/ui-agent-preset/src/client/locales.ts:93] | picker / UI 文案。 |
| locale `presetCordisDescription` | `用对话定制 DSH：让 Agent 编写插件，添加新功能或界面；也能组合工具和提示词，创建自己的模式。` [E: packages/client/ui-agent-preset/src/client/locales.ts:94] | 一句话定位。 |
| `order` | `4` [E: packages/bundle/web-app/presets/cordis.patch.yml:9] | 四个 shipped 里最后一位：`standard` `1`、`ptc` `2`、`minimal` `3`、`cordis` `4`。 |

### `plugins[]` 成员表（按文件顺序；每个 top-level `id:` 一行）

成员资格只认这些行。`#` 注释不是成员。group 子行写在「组内」列。

| `id` | `name` | isolate / `disabled` / config | 相对 `standard` |
|---|---|---|---|
| `persona` [E: packages/bundle/web-app/presets/cordis.patch.yml:13] | `@deepseek-ai/dsh-persona` | `suffix: Your working directory is {{cwd}}.`；`prefix` 与 standard 同句 `You are a coding agent powered by the {{model}} model.`。未写 `complete` / `includeRuntimeContext`，插件默认 `complete: false` [E: packages/preset/persona/src/index.ts:52]、`includeRuntimeContext: true` [E: packages/preset/persona/src/index.ts:53]。 | **装配后与 standard 同文** [E: apps/cli/tests/web-agent-presets.e2e.ts:393]。 |
| `agent-instructions` [E: packages/bundle/web-app/presets/cordis.patch.yml:21] | `@deepseek-ai/dsh-agent-instructions` | `maxBytes: 65536` | 同 id/config |
| `tool-bash` [E: packages/bundle/web-app/presets/cordis.patch.yml:25] | `@deepseek-ai/dsh-tool-bash` | `disabled: !!js process.platform === 'win32'` | 同 id/config。消费 host 面 `shell` / sandbox，本行不发布服务。 |
| `tool-pwsh` [E: packages/bundle/web-app/presets/cordis.patch.yml:28] | `@deepseek-ai/dsh-tool-pwsh` | `disabled: !!js process.platform !== 'win32'` | 同 id/config |
| `tool-fs` [E: packages/bundle/web-app/presets/cordis.patch.yml:29] | `@deepseek-ai/dsh-tool-fs` | 无 config | 同 id/config。`fs` policy 留在 host。 |
| `tool-fs-search` [E: packages/bundle/web-app/presets/cordis.patch.yml:34] | `@deepseek-ai/dsh-tool-fs-search` | `sampleOverCapGlobResults: false` | 同 id/config |
| `tool-jobs` [E: packages/bundle/web-app/presets/cordis.patch.yml:35] | `@deepseek-ai/dsh-tool-jobs` | 无 config | 同 id/config。jobs **registry** 在 host；本行只是模型可见控制。 |
| `command-goal` [E: packages/bundle/web-app/presets/cordis.patch.yml:37] | `@deepseek-ai/dsh-command-goal` | 无 config | 同 id（`standard` 也有此行）。人命令，不经模型 turn。 |
| `tool-goal` [E: packages/bundle/web-app/presets/cordis.patch.yml:39] | `@deepseek-ai/dsh-tool-goal` | 无 config | 同 id/config。**位置前移**：`standard` 在 `tool-jobs` 与 goals 之间先写 `skill-filesystem` / `tool-skill`；本文件把 skill 两行放到 `tool-cordis` 之后。goal **service** 在 host。 |
| `planning` [E: packages/bundle/web-app/presets/cordis.patch.yml:41] | `cordis:group` | `group: true`；`isolate.planMode: true` [E: packages/bundle/web-app/presets/cordis.patch.yml:45] | 同 id/config |
| └ `plan-mode` [E: packages/bundle/web-app/presets/cordis.patch.yml:47] | `@deepseek-ai/dsh-plan-mode` | 长 `section`（plan mode 规则） | 同 id/config |
| `compaction` [E: packages/bundle/web-app/presets/cordis.patch.yml:62] | `cordis:group` | `isolate.compaction: true` 且 `toolResultPruner: true` [E: packages/bundle/web-app/presets/cordis.patch.yml:66] | 同 id/config。`tokenMeter` 不进本 realm，留在 host。 |
| └ `compaction-basic` [E: packages/bundle/web-app/presets/cordis.patch.yml:69] | `@deepseek-ai/dsh-compaction-basic` | 无额外 config | 同 |
| └ `command-compact` [E: packages/bundle/web-app/presets/cordis.patch.yml:71] | `@deepseek-ai/dsh-command-compact` | 无额外 config | 同 |
| └ `tool-result-pruner` [E: packages/bundle/web-app/presets/cordis.patch.yml:76] | `@deepseek-ai/dsh-compaction-tool-result-pruner` | `thresholdChars: 8192`、`headChars: 4096`、`tailChars: 1024` | 同 |
| `delegation` [E: packages/bundle/web-app/presets/cordis.patch.yml:79] | `cordis:group` | `isolate.workflowEngine: true` [E: packages/bundle/web-app/presets/cordis.patch.yml:83] | 同 id/config。`subagents` registry 与 spawn/fork **backends** 在 host；本 isolate 键是 `workflowEngine`。 |
| └ `tool-subagent-control` [E: packages/bundle/web-app/presets/cordis.patch.yml:85] | `@deepseek-ai/dsh-tool-subagent-control` | | 同 |
| └ `tool-subagent-list-agents` [E: packages/bundle/web-app/presets/cordis.patch.yml:87] | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | | 同 |
| └ `tool-subagent` [E: packages/bundle/web-app/presets/cordis.patch.yml:95] | `@deepseek-ai/dsh-tool-subagent` | `provider: spawn`、`toolName: subagent`、`modelSelectionSettings: true`、`backgroundMode: continuable` | 同 |
| └ `tool-subagent-fork` [E: packages/bundle/web-app/presets/cordis.patch.yml:101] | `@deepseek-ai/dsh-tool-subagent` | `provider: fork`、`toolName: subagent_fork`、`backgroundMode: continuable` | 同 |
| └ `tool-subagent-codex` [E: packages/bundle/web-app/presets/cordis.patch.yml:104] | `@deepseek-ai/dsh-tool-subagent` | `disabled: true`；`provider: codex`、`toolName: subagent_codex`、`backgroundMode: one-shot`、`maxDepth: provider-managed` | 同 |
| └ `tool-subagent-claude-code` [E: packages/bundle/web-app/presets/cordis.patch.yml:112] | `@deepseek-ai/dsh-tool-subagent` | `disabled: true`；`provider: claude-code`、`toolName: subagent_claude_code`、同样的 background/depth | 同 |
| └ `workflow-ptc` [E: packages/bundle/web-app/presets/cordis.patch.yml:118] | `@deepseek-ai/dsh-workflow-ptc` | `provider: spawn`（启用） | 同（与 `ptc` 的 `disabled: true` 不同） |
| └ `tool-workflow` [E: packages/bundle/web-app/presets/cordis.patch.yml:122] | `@deepseek-ai/dsh-tool-workflow` | 启用 | 同（与 `ptc` 的 `disabled: true` 不同） |
| └ `tool-ralph` [E: packages/bundle/web-app/presets/cordis.patch.yml:126] | `@deepseek-ai/dsh-tool-ralph` | **`disabled: true`**；`subagentProvider: spawn`、`maxRounds: 64` | 同 |
| `tool-ask-user` [E: packages/bundle/web-app/presets/cordis.patch.yml:130] | `@deepseek-ai/dsh-tool-ask-user` | | 同 |
| `tool-todo` [E: packages/bundle/web-app/presets/cordis.patch.yml:135] | `@deepseek-ai/dsh-tool-todo` | `allowParallelInProgress: true` | 同 |
| `tool-web` [E: packages/bundle/web-app/presets/cordis.patch.yml:139] | `@deepseek-ai/dsh-tool-web` | `fetch: true`、`searchTimeoutMs: 60000` | 同。`web` service 在 host。 |
| `tool-cordis` [E: packages/bundle/web-app/presets/cordis.patch.yml:141] | `@deepseek-ai/dsh-tool-cordis` | 无 config、无 isolate | **本 preset 增量**。`standard` 无此行。插件 `inject` 为 `tools` / `cordisInspect` [E: packages/extensions/tool-cordis/src/index.ts:10]，全部消费 host 已提供的服务，本行不 `provide`，因此不必进 realm。 |
| `skill-filesystem` [E: packages/bundle/web-app/presets/cordis.patch.yml:143] | `@deepseek-ai/dsh-skill-filesystem` | `customSkillDirs: [ !!js … resolve('@deepseek-ai/dsh-agent-preset/package.json') … 'skills' ]` [E: packages/bundle/web-app/presets/cordis.patch.yml:147] | **位置 + config 都不同**。`standard` 同 id 无 `customSkillDirs`，且写在 `tool-jobs` 之后。 |
| `tool-skill` [E: packages/bundle/web-app/presets/cordis.patch.yml:148] | `@deepseek-ai/dsh-tool-skill` | 无 config | 同包；**位置**在 `tool-cordis` 之后、`present` 之前。 |
| `present` [E: packages/bundle/web-app/presets/cordis.patch.yml:150] | `@deepseek-ai/dsh-tool-present` | 无行内 config → schema 默认 `maxFiles: 8` [E: packages/deliverables/tool-present/src/index.ts:22] | 同（`standard` / `ptc` 也挂）。登记 wire 名 `present` [E: packages/deliverables/tool-present/src/index.ts:39]。 |
| `tool-plugin-manager` [E: packages/bundle/web-app/presets/cordis.patch.yml:152] | `@deepseek-ai/dsh-plugin-manager/tools` | `disabled: !!js "!ctx.get('profileContext')"` [E: packages/bundle/web-app/presets/cordis.patch.yml:154] | **相对 standard 的门控不同**：standard / ptc 写死 `disabled: true`；本行在 web（有 `profileContext`）上启用 `plugin_manager`。 |

`customSkillDirs` 是 `@deepseek-ai/dsh-skill-filesystem` 的 Config 数组，默认 `[]` [E: packages/skill/skill-filesystem/src/index.ts:81]。provider 把每一项 `resolve` 后插入 roots，`source: 'custom'`、`rank` 为 `CUSTOM_RANK`（常量 `300`）[E: packages/skill/skill-filesystem/src/index.ts:38] [E: packages/skill/skill-filesystem/src/index.ts:169] [E: packages/skill/skill-filesystem/src/index.ts:254]。web e2e：mount `cordis` 后 `ctx.skills.list({ scope: agent })` 含 `editing-cordis-compositions` [E: apps/cli/tests/web-agent-presets.e2e.ts:378]，无 scope 的全局 list 不含该名 [E: apps/cli/tests/web-agent-presets.e2e.ts:379]。同目录还放了 `cordis-plugin-development/` 与 `cordis-composition-reference/`；成员资格仍只认 yml 的 `customSkillDirs` 行，不认 SKILL.md 正文。

### `tool-cordis` 模型可见名

`apply` 往 `ctx.tools` 登记两个只读 inspect 名：

| 模型看见的 `name` | 登记行 |
|---|---|
| `cordis_inspect_list` | [E: packages/extensions/tool-cordis/src/index.ts:23] |
| `cordis_inspect_query` | [E: packages/extensions/tool-cordis/src/index.ts:42] |

没有 `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` / `cordis_inspect_self` / `cordis_mount`。web 上另外启用的 `plugin_manager` 来自 `tool-plugin-manager` 行，不来自 `tool-cordis` [E: packages/boot/plugin-manager/src/tools.ts:20]。

mount `standard` 的会话 catalog **不含** `cordis_define`：自指工具集按会话 opt-in，不是进程环境光环 [E: apps/cli/tests/web-agent-presets.e2e.ts:442]。unix 精确 catalog 也不含任何 `cordis_*` [E: apps/cli/tests/web-agent-presets.e2e.ts:264]。

## 装配与门控

1. **谁把它放进 roster。** 声明行 `register` 进 registry。web 组合树 insert `agent-preset-registry` 之后叠 `presets/cordis.patch.yml` [E: packages/bundle/web-app/package.json:43]。`AgentPresetRegistry.defaultId` = `selectedDefault.get() ?? config.default`；web patch 的 default 是 `standard` [E: packages/preset/agent-preset-registry/src/index.ts:74] [E: packages/bundle/web-app/cordis.patch.yml:562]。
2. **何时 init。** 每个声明 **activate 一份 generation**；会话在 agent factory `setup` 里 `mount`，再 `bindScopeParent` join [E: packages/preset/agent-preset-registry/src/index.ts:257]。子 agent 用 `composeFrom` join 同一代 composition，不按 id 重读声明 [E: packages/preset/agent-preset-registry/src/index.ts:273]。
3. **host 依赖。** `tool-cordis` 等待 host 的 `cordisInspect`。web-app 在 host 面 insert `cordis-inspect-providers`（`@deepseek-ai/dsh-tool-cordis/host`）与 `cordis-host-runner` [E: packages/bundle/web-app/cordis.patch.yml:144] [E: packages/bundle/web-app/cordis.patch.yml:150]。缺这些服务时 `auditRows` 报 pending。
4. **isolate / 泄漏。** 发布服务的行必须在 `isolate` 组里。本文件的 realm 是 `planning.planMode`、`compaction.compaction` + `toolResultPruner`、`delegation.workflowEngine`。`leakedServices` 扫到写入 root realm 的 provide 就拒绝 [E: packages/preset/agent-preset-registry/src/mount.ts:267]。`tool-cordis` / `tool-bash` / `tool-fs` / `skill-filesystem` / `present` / `tool-plugin-manager` 只往 host 已有的 layered registry 注册，不 provide，故可散装。
5. **覆盖 shipped。** registry 不写声明。用户 patch 按行 id `preset-cordis` 整键替换 `config` [E: packages/boot/config-editor/src/index.ts:115]。`PresetTree.write` 是空实现，session 结束不会把声明截成当前濒死树 [E: packages/preset/agent-preset-registry/src/mount.ts:23]。
6. **失败怎么响。** 未知 id → `RemoteError` `agent-preset/not-found` [E: packages/preset/agent-preset-registry/src/index.ts:183]。broken / 行失败 / 服务泄漏 → activate 标 `broken` 或 `mount` 抛错。`plugin_manager` 每次调用要求 danger-full-access / approval [E: packages/boot/plugin-manager/src/tools.ts:39]。
7. **日志。** 创建 header 记下当时的 preset；blank 窗口改选后事件类型是 `agent-preset/selected` [E: packages/preset/agent-preset-registry/src/session.ts:28]。projection `apply` 用该事件更新 `agentPreset` [E: packages/preset/agent-preset-registry/src/session.ts:39]。preset 决定工具 schema 与 prompt sections，所以 selection 必须进日志（model-visible ⟺ logged）。

## 跨包关系

- [`surface.presets.overview`](overview.md)：声明行、standing generation、`defaultId`、覆盖写 profile patch。本页只展开 id=`cordis` 的成员表与增量。
- [`ref.presets`](../../reference/presets.md)：四 preset 对照与配置键总表。本页是 `cordis` 行的权威展开。
- [`surface.presets.standard`](standard.md)：本文件除 `tool-cordis`、末尾带 `customSkillDirs` 的 skill 两行、条件启用的 `plugin_manager` 外，与 `standard` 同行同 config（含 `present`、关掉的 `ralph`、启用的 `workflow-ptc`）。`standard` 是 web 的 `default`。
- [`surface.presets.code`](code.md)：稳定别名指向 **PTC**（`presets/ptc.patch.yml`）。相对 `standard` 的 shipped 增量是 `tool-presentation` `mode: ptc`（模型面对 `run_code`），**没有** `tool-cordis`。
- [`surface.presets.minimal`](minimal.md)：极简成员（`persona.complete: true`、只剩 persistent shell），没有 compaction / skill / subagent / `tool-cordis` / `present`。
- [`surface.profiles.web`](../profiles/web.md)：host 面 disable base 上的模型可见工具行，改由每会话 preset 再挂；并 insert `agent-preset-registry` + `cordis-host-runner` + `cordis-inspect-providers`，本 preset 的 `tool-cordis` 才有 Provider。
- [`surface.profiles.headless`](../profiles/headless.md)：无 preset roster；模型可见工具来自 `dsh-base` host 行，不是 shipped `cordis`。
- [`spine.composition-boot`](../../spine/composition-boot.md)：`PROFILE_TEMPLATES`（`web` / `headless` / `sdk` / `sdk-minimal` / `acp`）/ `composeEntries` / CLI 叠层（bundle → profile patch → home patch → `--patch`）。
- `@deepseek-ai/dsh-tool-cordis`：Definition 在 preset 行 `tool-cordis`；Provider 是 host 的 `cordisInspect`；Consumer 是两个 `cordis_inspect_*` 工具。
- `@deepseek-ai/dsh-plugin-manager/tools`：web 上本 preset 额外启用的 `plugin_manager`。
- `@deepseek-ai/dsh-skill-filesystem`：`customSkillDirs` 把 `@deepseek-ai/dsh-agent-preset` 包内 `skills/` 铺进 **该 standing mount 的** skill 层，不污染全局 catalog。

## Sources

- `packages/bundle/web-app/presets/cordis.patch.yml`
- `packages/bundle/web-app/presets/standard.patch.yml`
- `packages/bundle/web-app/presets/ptc.patch.yml`
- `packages/bundle/web-app/presets/minimal.patch.yml`
- `packages/bundle/web-app/package.json`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/preset/agent-preset/src/index.ts`
- `packages/preset/agent-preset-registry/src/index.ts`
- `packages/preset/agent-preset-registry/src/mount.ts`
- `packages/preset/agent-preset-registry/src/session.ts`
- `packages/preset/agent-preset-registry/src/display.ts`
- `packages/preset/persona/src/index.ts`
- `packages/skill/skill-filesystem/src/index.ts`
- `packages/extensions/tool-cordis/src/index.ts`
- `packages/boot/plugin-manager/src/tools.ts`
- `packages/boot/config-editor/src/index.ts`
- `packages/client/ui-agent-preset/src/client/locales.ts`
- `packages/bundle/headless/src/index.ts`
- `packages/deliverables/tool-present/src/index.ts`
- `apps/cli/tests/web-agent-presets.e2e.ts`
- `apps/web/tests/agent-preset-authoring.e2e.ts`

## 相关

- [`surface.presets.overview`](overview.md) — agent preset 总览：声明、standing generation、默认 id、覆盖写 profile patch。
- [`ref.presets`](../../reference/presets.md) — preset 对照与配置键。
