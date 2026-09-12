---
id: surface.presets.standard
title: standard preset
kind: surface
tier: T1
pkg: composition
source:
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/preset.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/preset.ts
  - packages/preset/persona/src/index.ts
  - packages/api/session-controller/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - packages/preset/agent-presets/tests/settings.spec.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/web/tool-web/src/index.ts
  - packages/fs/tool-present/src/index.ts
symbols:
  - planning
  - compaction
  - delegation
related:
  - surface.presets.overview
  - ref.presets
  - surface.presets.code
  - surface.presets.minimal
  - surface.presets.cordis
  - surface.profiles.web
  - surface.profiles.headless
  - spine.composition-boot
evidence: explicit
status: verified
updated: c291e7961a
---

> `standard` 是 shipped **agent-preset 面**的默认全套编码组合：目录名即 id，成员资格只认 `packages/preset/agent-presets/presets/standard/agent.cordis.yml` 的行（含 `disabled:`）。它不是 host 进程本身——五个 shipped CLI profile 里，**只有 `web`** 在 overlay 里 `insert` `agent-presets` 且 `default: standard`；每个会话在 Agent factory `setup` 里 `mount` 这份 standing 组合。`preset.yml` 只提供 picker 文案与 `order`，不决定装哪些包。

## 能回答的问题

- web 新建会话不点 preset 时，模型看见的是哪一套工具？谁把 `default` 写成 `standard`？
- `standard` 的 `agent.cordis.yml` 每一个 top-level `id`（含 `planning` / `compaction` / `delegation` 子行）装了什么、哪些 `disabled`、哪些有 `isolate`？
- `tool-subagent-fork` 在 `standard` 与 `dsh-base` 的 `backgroundMode` 差在哪？
- `standard` 有没有 `present` / `tool-str-replace-editor` / persistent shell / `tool-cordis` / `tool-presentation` / `web_fetch` / `command-goal`？
- 发布服务的行为什么必须进 `cordis:group` + `isolate`？不发布服务的 tool 行为什么可以裸挂？
- headless / sdk / sdk-minimal / acp 会不会默认挂上 `standard`？

## 是什么

DSH 的主线是 `profile → bundle → agent preset`。`standard` 是四个 shipped preset 之一（`minimal` / `standard` / `ptc` / `cordis`），id 等于目录名 `standard`，必须匹配 `PRESET_ID = /^[a-z0-9][a-z0-9-]*$/`，并且目录里必须有 `COMPOSITION_FILE`（`agent.cordis.yml`）才算 preset。 [E: packages/preset/agent-presets/src/preset.ts:18] [E: packages/preset/agent-presets/src/discovery.ts:37] [E: packages/preset/agent-presets/src/discovery.ts:60]

`preset.yml` 是可选的 `METADATA_FILE`：只读 `name` / `description` / `order`。文件缺失或 YAML 损坏时 `readPresetMetadata` 返回空对象，composition 照样可 mount。 [E: packages/preset/agent-presets/src/metadata.ts:25] [E: packages/preset/agent-presets/src/metadata.ts:63] [E: packages/preset/agent-presets/src/metadata.ts:71] shipped 这份写的是 `name: 标准模式`、`order: 1`。 [E: packages/preset/agent-presets/presets/standard/preset.yml:1] [E: packages/preset/agent-presets/presets/standard/preset.yml:3]

**host 面 vs agent-preset 面。** `dsh-web-app` 在 host 上留下 webserver / persistence / sandbox / jobs·skill·goals **registry** / token meter / subagent **backends**，并把 base 的模型可见工具行关掉，再插入 roster：

```yaml
- id: agent-presets
  name: '@deepseek-ai/dsh-agent-presets'
  config:
    default: standard
```

[E: packages/bundle/web-app/cordis.patch.yml:481] [E: packages/bundle/web-app/cordis.patch.yml:482] [E: packages/bundle/web-app/cordis.patch.yml:484]

`standard` 再在 **agent-preset 面**把 persona、instructions、模型可见 tools、以及三个 isolate 组挂回每个 join 了这份 standing mount 的 Agent。capability seam 仍是 Definition / Provider / Consumer：preset 多数行只当 Consumer，往 host 的 `ctx.tools` / `ctx.skills` 注册；只有需要私有 Provider 的服务才进 `isolate`。

`packages/bundle/headless/cordis.patch.yml` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `agent-presets` 行。 [E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] [E: packages/bundle/headless/cordis.patch.yml:27] headless（以及 `sdk` / `acp` overlay、不叠 base 的 `sdk-minimal`）的模型可见工具留在各自 bundle / `dsh-base` 的 host 行，**不是** shipped `standard`。

web e2e 钉死：system 根只供应 `cordis` / `minimal` / `ptc` / `standard`，且 `defaultId === 'standard'`。 [E: apps/cli/tests/web-agent-presets.e2e.ts:227] [E: apps/cli/tests/web-agent-presets.e2e.ts:229]

## 入口

用户碰到 `standard` 的路径：

1. 默认 GUI 入口是 `dsh web` ≡ `--profile web`。web bundle 插入 `agent-presets` 且 `default: standard`。 [E: packages/bundle/web-app/cordis.patch.yml:484] 其它 shipped CLI profile（`headless` / `sdk` / `sdk-minimal` / `acp`）用 `dsh --profile <name>` 启动，不走这条 roster 默认。
2. 包内 `SHIPPED_PRESET_ROOT` 解析到 `packages/preset/agent-presets/presets/`（相对 `discovery.ts` 的 `../presets/`）。 [E: packages/preset/agent-presets/src/discovery.ts:60] `includeShippedRoot` 默认 `true`，构造时把该根放在 **第一**。 [E: packages/preset/agent-presets/src/index.ts:113] [E: packages/preset/agent-presets/src/index.ts:182]
3. `includeUserRoot` 默认 `true`，在配置 roots 之后再追加 `$DSH_HOME/.agent-presets`（`USER_PRESET_DIR`）。 [E: packages/preset/agent-presets/src/index.ts:114] [E: packages/preset/agent-presets/src/index.ts:184] [E: packages/preset/agent-presets/src/discovery.ts:51] `discoverPresets` 先到先得：已占用的 id 跳过后根。 [E: packages/preset/agent-presets/src/discovery.ts:338] shipped `standard` 因此挡住用户目录里的同名文件夹。
4. 浏览器创建会话不传 `agentPreset` 时，`SessionController.composeAgent(undefined)` 走 `presets.resolve(presetId)`；`resolve` 用 `id ?? this.defaultId`。 [E: packages/api/session-controller/src/agent.ts:382] [E: packages/preset/agent-presets/src/index.ts:366] 没有 roster 时 `composeAgent` 只返回 `installSelection` setup，不 mount preset。 [E: packages/api/session-controller/src/agent.ts:379]
5. `defaultId` 经 `selectionPolicy()`：无 settings 时用 `config.default`；有 settings 且 `modeSelectionEnabled` 才用 settings 的 `default`。未写 settings 时回落到 `standard`。 [E: packages/preset/agent-presets/src/index.ts:247] [E: packages/preset/agent-presets/tests/settings.spec.ts:72]
6. 真正的 Include 发生在 factory `setup`：`presets.mount(agentCtx, resolvedId)`。 [E: packages/api/session-controller/src/agent.ts:387] `setupAndPublish` 在 `setup` 抛错时 `prepared.dispose()` 再把 error 抛出，Agent 不会 publish。 [E: packages/core/agent-loop/src/index.ts:805] [E: packages/core/agent-loop/src/index.ts:833]

## 关键字段

### `preset.yml`（显示元数据，不是成员资格）

| 字段 | 值 | 含义 |
|---|---|---|
| `name` | `标准模式` | picker 显示名；缺了就回落目录 id。 [E: packages/preset/agent-presets/presets/standard/preset.yml:1] |
| `description` | `功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。` | 一句话说明。 [E: packages/preset/agent-presets/presets/standard/preset.yml:2] |
| `order` | `1` | shipped 集合里按 capability 排序时最小，排在 `ptc`(2) / `minimal`(3) / `cordis`(4) 前面。 [E: packages/preset/agent-presets/presets/standard/preset.yml:3] |

### `agent.cordis.yml` 全部 top-level `id`（文件顺序）

成员资格只认这一列。仓库里有同名包、或 `dsh-base` 曾经 insert 过同一 `id`，都不构成 `standard` 的成员。

| id | `name` | 组 / isolate | Config / 门控 | 模型可见名（unix e2e，见下） |
|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 无 | `prefix: You are a coding agent powered by the {{model}} model.`；`suffix: Your working directory is {{cwd}}.` 不写 `complete` / `includeRuntimeContext`。插件 schema 默认 `complete: false`、`includeRuntimeContext: true`，所以这条只 shadow 部署 prefix/suffix，不封死其它 section，也不 suppress runtime context。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:27] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:29] [E: packages/preset/persona/src/index.ts:50] [E: packages/preset/persona/src/index.ts:52] | 无 tool；prompt section |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | 无 | `maxBytes: 65536`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:31] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:34] | 无 tool；workspace 指令 |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | 无 | `disabled: !!js process.platform === 'win32'`。消费 host `shell-env` / `bash-sandbox`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:45] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:47] | `bash` |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 无 | `disabled: !!js process.platform !== 'win32'`。与 `tool-bash` 互斥。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:49] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:51] | `pwsh`（仅 win32） |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | 无 | 无额外 config。消费 host `fs` / sandbox，自己 `provide` 空。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:57] | `read` / `read_image` / `write` / `edit` |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | 无 | `sampleOverCapGlobResults: false`。插件 `apply` 同时注册 `glob` 与 `grep`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:60] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:63] [E: packages/fs/tool-fs-search/src/index.ts:142] [E: packages/fs/tool-fs-search/src/index.ts:151] | `glob` / `grep` |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | 无 | 无 config。只挂模型侧 `job_*`；jobs **registry** 留在 host。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:74] | `job_list` / `job_output` / `job_kill` |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 无 | 无 `customSkillDirs`（相对 `cordis` preset）。往 **本 preset 的 skill 层** 贡献本地根发现；skill **registry** 仍是 host。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:84] | 无独立 tool 名 |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 无 | 无 config。给该 Agent 目录与 loader。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:87] | `skill` |
| `command-goal` | `@deepseek-ai/dsh-command-goal` | 无 | 人命令 `/goal`；goals **service** 留在 host。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:95] | 无 wire 名 |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | 无 | 无 config。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:98] | `create_goal` / `get_goal` / `update_goal` |
| `planning` | `cordis:group` | `isolate.planMode: true` | 组本身 `group: true`。子行：`plan-mode`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:105] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:109] | `exit_plan_mode` |
| `compaction` | `cordis:group` | `isolate.compaction: true` 且 `toolResultPruner: true` | 不 isolate `tokenMeter`（meter 在 host）。子行：`compaction-basic` / `command-compact` / `tool-result-pruner`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:138] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:142] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:143] | 无 wire 名 |
| `delegation` | `cordis:group` | `isolate.workflowEngine: true` | subagent **registry** / spawn·fork backends 在 host；本 isolate 只覆盖 `workflows` 与同组消费者。子行：`tool-subagent-*` / `workflow-worker-thread` / `tool-workflow` / `tool-ralph`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:169] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:173] | `subagent` 一族 + `workflow` / `ralph` |
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | 无 | 无 config。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:238] | `ask_user_question` |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | 无 | `allowParallelInProgress: true`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:241] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:244] | `todo_write` |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | 无 | `fetch: true`，`searchTimeoutMs: 60000`。web **service** / search provider 在 host。插件默认 `fetch: true`；本行显式打开 `web_fetch`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:248] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251] [E: packages/web/tool-web/src/index.ts:56] | `web_search` **与** `web_fetch` |
| `present` | `@deepseek-ai/dsh-tool-present` | 无 | 无行内 config → schema 默认 `maxFiles: 8`。登记 wire 名 `present`；成功后 append `deliverables/presented`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:254] [E: packages/fs/tool-present/src/index.ts:22] [E: packages/fs/tool-present/src/index.ts:39] | `present` |

### isolate 组的子行

| 组 | 子 id | `name` | Config / 门控 | 模型可见 |
|---|---|---|---|---|
| `planning` | `plan-mode` | `@deepseek-ai/dsh-plan-mode` | 长 `section:` 以 “You are in plan mode. Stay in plan mode until exit_plan_mode succeeds” 起头；禁止用 mutation tools 执行计划；禁止用 `todo_write` 跟踪规划阶段。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:111] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:115] | `exit_plan_mode` |
| `compaction` | `compaction-basic` | `@deepseek-ai/dsh-compaction-basic` | 无行内 config。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:145] | 无 wire 名（自动压缩） |
| `compaction` | `command-compact` | `@deepseek-ai/dsh-command-compact` | 无行内 config。人命令 `/compact`，不进模型 tool catalog。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:148] | 无 |
| `compaction` | `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024`。与 `compaction-basic` 同组，共享 `toolResultPruner` realm。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:151] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:154] | 无 |
| `delegation` | `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | 无行内 config。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:175] | `send_message` / `interrupt_agent` |
| `delegation` | `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 无行内 config。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:178] | `list_agents` |
| `delegation` | `tool-subagent` | `@deepseek-ai/dsh-tool-subagent` | `provider: spawn`，`toolName: subagent`，`modelSelectionSettings: true`，`backgroundMode: continuable`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:181] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:186] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:187] | `subagent` |
| `delegation` | `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent` | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:193] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:198] | `subagent_fork` |
| `delegation` | `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent` | **`disabled: true`**。`provider: codex`，`toolName: subagent_codex`，`backgroundMode: one-shot`，`maxDepth: provider-managed`。行在、工具不进 catalog。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:204] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:206] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:210] | （关闭） |
| `delegation` | `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent` | **`disabled: true`**。`provider: claude-code`，`toolName: subagent_claude_code`，同样 `backgroundMode: one-shot` / `maxDepth: provider-managed`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:214] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:216] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:220] | （关闭） |
| `delegation` | `workflow-worker-thread` | `@deepseek-ai/dsh-workflow-worker-thread` | `provider: spawn`。给同组 `workflowEngine` 提供 worker，不是模型 tool。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:222] | 无 |
| `delegation` | `tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | 无行内 `disabled`：模型面启用 `workflow`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:227] | `workflow` |
| `delegation` | `tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | `subagentProvider: spawn`，`maxRounds: 64`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:230] | `ralph` |

### `tool-subagent-fork`：`continuable` vs base 的 `one-shot`

`standard` 把 fork 写成 `backgroundMode: continuable`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:198]

`dsh-base` 同一 `id` 写的是 `backgroundMode: one-shot`。 [E: packages/bundle/base/cordis.patch.yml:362] [E: packages/bundle/base/cordis.patch.yml:367]

web 已把 host 上的 `tool-subagent-fork` `disabled: true`，所以 web 会话实际吃到的是 preset 这份 `continuable`，不是 base 的 `one-shot`。 [E: packages/bundle/web-app/cordis.patch.yml:452]

### 本文件没有的行

下列 id **不在** `standard/agent.cordis.yml`。不要因为 workspace 里有对应包、或 `dsh-base` / 其它 preset 装过，就写成「standard 也有」。

| 缺的 id | 谁才有 | 证据 |
|---|---|---|
| `str-replace-editor` / `tool-str-replace-editor` | **四个 shipped 都不挂**。包仍在仓库，出厂路径不挂。 | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21] |
| `persistent-shell` / `persistent-bash` / `persistent-pwsh` | 只有 `minimal` 的 `persistent-shell` isolate | [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:21] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:36] |
| `tool-cordis` | 只有 `cordis` | [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:246] |
| `tool-presentation` | 只有 `ptc`（`mode: ptc` → 模型侧 `run_code`）。wiki 节点 id 仍是 `surface.presets.code` | [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:269] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:272] |

unix web e2e 对 `standard` 的 **精确** catalog（故意滤掉 `glob`/`grep`，因那条测试按机器是否带 ripgrep 排除它们）是：

`ask_user_question`, `bash`, `create_goal`, `edit`, `exit_plan_mode`, `get_goal`, `interrupt_agent`, `job_kill`, `job_list`, `job_output`, `list_agents`, `present`, `ralph`, `read`, `read_image`, `send_message`, `skill`, `subagent`, `subagent_fork`, `todo_write`, `update_goal`, `web_fetch`, `web_search`, `workflow`, `write`。 [E: apps/cli/tests/web-agent-presets.e2e.ts:243] [E: apps/cli/tests/web-agent-presets.e2e.ts:245] 同一用例还断言人命令 `goal` 存在。 [E: apps/cli/tests/web-agent-presets.e2e.ts:249]

该表没有 `str_replace_editor`、`run_code`、`subagent_codex`、`subagent_claude_code`、任何 `cordis_*`。**有** `web_fetch`（`fetch: true`）与 `present`。

## 装配与门控

**何时 init。** roster 行在 web host 面进程级 settle；每个 preset id **standing mount 一次**：`ensureStanding` 用 `{ agentPreset: preset.id }` 调 `createScope`，再 `mountPreset`。 [E: packages/preset/agent-presets/src/index.ts:769] [E: packages/preset/agent-presets/src/index.ts:792] [E: packages/preset/agent-presets/src/mount.ts:378] 之后会话只 `bindScopeParent` join。 [E: packages/preset/agent-presets/src/index.ts:447] `AgentPresets.mount` 必须在 factory `setup` 里调用：`setupAndPublish` 先 `await setup`，成功才 `publish`；抛错则 `prepared.dispose()`。 [E: packages/preset/agent-presets/src/index.ts:436] [E: packages/core/agent-loop/src/index.ts:805] [E: packages/core/agent-loop/src/index.ts:826] [E: packages/core/agent-loop/src/index.ts:833]

**默认 id。** `AgentPresets.Config.default` 必填。 [E: packages/preset/agent-presets/src/index.ts:108] web patch 写成 `standard`。用户 settings 的 `agent-presets.default` 可以改成别的 id（须 `modeSelectionEnabled`），只影响**之后**新建的会话；已经 join 的 session 仍停在当初那份 standing 组合。 [E: packages/preset/agent-presets/src/index.ts:247] [E: packages/preset/agent-presets/src/index.ts:257]

**isolate 门。** `mountPreset` 拒绝无 scope 的 context。 [E: packages/preset/agent-presets/src/mount.ts:380] 树 settle 后跑 `leakedServices`：任何把 service publish 进 **root realm** 的行都会抛错——「a preset service must sit behind an `isolate` realm or move to the host composition」。 [E: packages/preset/agent-presets/src/mount.ts:210] [E: packages/preset/agent-presets/src/mount.ts:407] [E: packages/preset/agent-presets/src/mount.ts:409] `standard` 因此把发布服务的行放进三个组：`planning`→`planMode`、`compaction`→`compaction`+`toolResultPruner`、`delegation`→`workflowEngine`。只往 host `ctx.tools` 注册、自己不 `provide` 的 tool 行（`tool-bash` / `tool-fs` / `tool-web` / `present` 等）不必带 realm。

**平台门。** `tool-bash` 在 `win32` disable，`tool-pwsh` 在非 `win32` disable。同一时刻只有一条 one-shot shell tool 进 catalog。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:47] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:51]

**产品后端门。** `tool-subagent-codex` / `tool-subagent-claude-code` 行在但 `disabled: true`。host 即便另外 insert 了 backends，`standard` 会话也看不到 `subagent_codex` / `subagent_claude_code`；要暴露必须 copy 出用户 preset 再去掉 `disabled`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:206] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:216]

**fetch 门。** `tool-web` 的 `fetch: true` 让 catalog 同时有 `web_search` 与 `web_fetch`。 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:251]

**失败怎么响。** 未知 id → `resolve` 抛 `RemoteError` `agent-preset/not-found`。 [E: packages/preset/agent-presets/src/index.ts:371] 泄漏 root service → `mountPreset` 抛错，detail 点名 leaked 服务名。 [E: packages/preset/agent-presets/src/mount.ts:409] `composeAgent` 先 `resolve` 出 id；`setup` 才 `mount`。`setup` 抛错时 `setupAndPublish` 会 `dispose` 未 publish 的 Agent。 [E: packages/api/session-controller/src/agent.ts:382] [E: packages/core/agent-loop/src/index.ts:833]

**无 roster 的 profile 不走这条门。** `ctx.get('agentPresets')` 为 `undefined` 时 `composeAgent` 只装 model selection，工具走 host 全局层。 [E: packages/api/session-controller/src/agent.ts:379]

## 跨包关系

- `surface.presets.overview`（[overview.md](overview.md)）— 发现 roots、`COMPOSITION_FILE`、standing mount / `composeFrom`、authoring 只能 `copy`。本页只展开 `standard` 这一份成员表。
- `ref.presets`（[../../reference/presets.md](../../reference/presets.md)）— 四份 shipped preset 的对照表；逐行 id 以本页为准。
- `surface.profiles.web`（[../profiles/web.md](../profiles/web.md)）— host 面 overlay：disable base 工具行、`insert` `agent-presets` `default: standard`。
- `surface.profiles.headless`（[../profiles/headless.md](../profiles/headless.md)）— 不挂 roster；不要把 `standard` 说成 headless 默认装配。
- `surface.presets.minimal`（[minimal.md](minimal.md)）— 固定英文 `prefix` + persistent bash/pwsh；没有 compaction / skill / subagent / web / plan / todo / jobs / `present`。
- `surface.presets.code`（[code.md](code.md)）— 稳定别名；目录是 `presets/ptc/`，增量是末尾 `tool-presentation` / `mode: ptc` 且 `tool-workflow` `disabled`；composition 仍保留 `standard` 那些 tool 行（含 `present`）。
- `surface.presets.cordis`（[cordis.md](cordis.md)）— 不同 persona `prefix` + `tool-cordis` + `skill-filesystem.customSkillDirs` + `present`。
- `spine.composition-boot`（[../../spine/composition-boot.md](../../spine/composition-boot.md)）— `profile → bundle → preset` 叠层；shipped root 由 `includeShippedRoot` 在包内 prepend，不是 launcher overlay。

## Sources

- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/standard/preset.yml
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/metadata.ts
- packages/preset/agent-presets/src/preset.ts
- packages/preset/persona/src/index.ts
- packages/api/session-controller/src/agent.ts
- packages/core/agent-loop/src/index.ts
- apps/cli/tests/web-agent-presets.e2e.ts
- packages/preset/agent-presets/tests/settings.spec.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/web/tool-web/src/index.ts
- packages/fs/tool-present/src/index.ts

## 相关

- [surface.presets.overview](overview.md) — preset 发现、默认 id、standing mount、会话记录。
- [ref.presets](../../reference/presets.md) — shipped preset 对照 catalog。
