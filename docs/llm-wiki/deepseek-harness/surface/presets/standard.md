---
id: surface.presets.standard
title: standard preset
kind: surface
tier: T1
pkg: composition
source:
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/display.ts
  - packages/preset/persona/src/index.ts
  - packages/api/session-controller/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - packages/client/ui-agent-preset/src/client/locales.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - packages/preset/agent-preset-registry/tests/registry.spec.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/web/tool-web/src/index.ts
  - packages/deliverables/tool-present/src/index.ts
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
updated: 477b4f4205
---

> `standard` 是 shipped **agent-preset 面**的默认全套编码组合：行 id `preset-standard`，roster 身份 `config.id: standard`，成员资格只认 `packages/bundle/web-app/presets/standard.patch.yml` 的 `plugins[]`（含 `disabled:`）。它不是 host 进程本身——五个 shipped CLI profile 里，**只有 `web`** 在 overlay 里 `insert` `agent-preset-registry` 且 `default: standard`，并只在 `dsh-web-app` 的 `dsh.bundle.patch` 列表叠上这份声明；每个会话在 Agent factory `setup` 里 `mount` 这份 standing 组合。locale 只提供 picker 文案，不决定装哪些包。

## 能回答的问题

- web 新建会话不点 preset 时，模型看见的是哪一套工具？谁把 `default` 写成 `standard`？
- `standard` 的 `plugins[]` 每一个 top-level `id`（含 `planning` / `compaction` / `delegation` 子行）装了什么、哪些 `disabled`、哪些有 `isolate`？
- `tool-subagent-fork` 在 `standard` 与 `dsh-base` 的 `backgroundMode` 差在哪？
- `standard` 有没有 `present` / `tool-str-replace-editor` / persistent shell / `tool-cordis` / `tool-presentation` / `web_fetch` / `command-goal` / 启用的 `workflow` / 启用的 `ralph` / `plugin_manager`？
- 发布服务的行为什么必须进 `cordis:group` + `isolate`？不发布服务的 tool 行为什么可以裸挂？
- headless / sdk / sdk-minimal / acp 会不会默认挂上 `standard`？

## 是什么

DSH 的主线是 `profile → bundle → agent preset`。`standard` 是四个 shipped preset 之一（`minimal` / `standard` / `ptc` / `cordis`），roster id 等于 `config.id: standard`。四个声明只叠在 `dsh-web-app`。[E: packages/preset/agent-preset/src/index.ts:17] [E: packages/bundle/web-app/package.json:43] [E: packages/bundle/web-app/presets/standard.patch.yml:8]

YAML **不**写 `name` / `description`；picker 走 locale「标准模式」，`order: 1`。[E: packages/client/ui-agent-preset/src/client/locales.ts:87] [E: packages/bundle/web-app/presets/standard.patch.yml:9] [E: packages/preset/agent-preset-registry/src/display.ts:41]

**host 面 vs agent-preset 面。** `dsh-web-app` 在 host 上留下 webserver / persistence / sandbox / jobs·skill·goals **registry** / token meter / subagent **backends** / `ptc-runtime`，并把 base 的模型可见工具行关掉，再插入 roster：

```yaml
- id: agent-preset-registry
  name: '@deepseek-ai/dsh-agent-preset-registry'
  config:
    default: standard
```

[E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/cordis.patch.yml:560] [E: packages/bundle/web-app/cordis.patch.yml:562]

`standard` 再在 **agent-preset 面**把 persona、instructions、模型可见 tools、以及三个 isolate 组挂回每个 join 了这份 standing mount 的 Agent。capability seam 仍是 Definition / Provider / Consumer：preset 多数行只当 Consumer，往 host 的 `ctx.tools` / `ctx.skills` 注册；只有需要私有 Provider 的服务才进 `isolate`。

`packages/bundle/headless/cordis.patch.yml` 的 insert 只有 `headless-startup` / `headless-runner`，没有 registry 行，也没有 `presets/*.patch.yml`。[E: packages/bundle/headless/cordis.patch.yml:21] [E: packages/bundle/headless/cordis.patch.yml:25] headless（以及 `sdk` / `acp` overlay、不叠 base 的 `sdk-minimal`）的模型可见工具留在各自 bundle / `dsh-base` 的 host 行，**不是** shipped `standard`。

web e2e 钉死：roster 只供应 `cordis` / `minimal` / `ptc` / `standard`，且 `defaultId === 'standard'`。[E: apps/cli/tests/web-agent-presets.e2e.ts:248] [E: apps/cli/tests/web-agent-presets.e2e.ts:250]

## 入口

用户碰到 `standard` 的路径：

1. 默认 GUI 入口是 `dsh web` ≡ `--profile web`。web bundle 插入 `agent-preset-registry` 且 `default: standard`，并叠 `presets/standard.patch.yml`。[E: packages/bundle/web-app/cordis.patch.yml:562] [E: packages/bundle/web-app/presets/standard.patch.yml:5] 其它 shipped CLI profile（`headless` / `sdk` / `sdk-minimal` / `acp`）用 `dsh --profile <name>`（或同名 positional）启动，不走这条 roster 默认。
2. 浏览器创建会话不传 `agentPreset` 时，`SessionController.composeAgent(undefined)` 走 `presets.resolve(presetId)`；`resolve` 用 `id ?? this.defaultId`。[E: packages/api/session-controller/src/agent.ts:389] [E: packages/preset/agent-preset-registry/src/index.ts:181] 没有 roster 时 `composeAgent` 只返回 `installSelection` setup，不 mount preset。[E: packages/api/session-controller/src/agent.ts:386]
3. `defaultId` = `selectedDefault.get() ?? config.default`。未写 Settings 时回落到 `standard`。[E: packages/preset/agent-preset-registry/src/index.ts:74] [E: packages/preset/agent-preset-registry/tests/registry.spec.ts:226]
4. 真正的 Include 发生在 factory `setup`：`presets.mount(agentCtx, resolvedId)`。[E: packages/api/session-controller/src/agent.ts:394] `setupAndPublish` 在 `setup` 抛错时 `prepared.dispose()` 再把 error 抛出，Agent 不会 publish。[E: packages/core/agent-loop/src/index.ts:774] [E: packages/core/agent-loop/src/index.ts:796]

## 关键字段

### 显示元数据（locale，不是成员资格）

| 字段 | 值 | 含义 |
|---|---|---|
| locale `presetStandardName` | `标准模式` | picker 显示名。[E: packages/client/ui-agent-preset/src/client/locales.ts:87] |
| locale `presetStandardDescription` | `处理代码、文件和资料，适合大多数任务。…` | 一句话说明。[E: packages/client/ui-agent-preset/src/client/locales.ts:88] |
| `order` | `1` | shipped 集合里按 capability 排序时最小，排在 `ptc`(2) / `minimal`(3) / `cordis`(4) 前面。[E: packages/bundle/web-app/presets/standard.patch.yml:9] |

### `plugins[]` 全部 top-level `id`（文件顺序）

成员资格只认这一列。仓库里有同名包、或 `dsh-base` 曾经 insert 过同一 `id`，都不构成 `standard` 的成员。

| id | `name` | 组 / isolate | Config / 门控 | 模型可见名（unix e2e，见下） |
|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 无 | `prefix: You are a coding agent powered by the {{model}} model.`；`suffix: Your working directory is {{cwd}}.` 不写 `complete` / `includeRuntimeContext`。插件 schema 默认 `complete: false`、`includeRuntimeContext: true`，所以这条只 shadow 部署 prefix/suffix，不封死其它 section，也不 suppress runtime context。[E: packages/bundle/web-app/presets/standard.patch.yml:14] [E: packages/preset/persona/src/index.ts:52] | 无 tool；prompt section |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | 无 | `maxBytes: 65536`。[E: packages/bundle/web-app/presets/standard.patch.yml:19] | 无 tool；workspace 指令 |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | 无 | `disabled: !!js process.platform === 'win32'`。[E: packages/bundle/web-app/presets/standard.patch.yml:22] | `bash` |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 无 | `disabled: !!js process.platform !== 'win32'`。与 `tool-bash` 互斥。[E: packages/bundle/web-app/presets/standard.patch.yml:25] | `pwsh`（仅 win32） |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | 无 | 无额外 config。消费 host `fs` / sandbox，自己 `provide` 空。[E: packages/bundle/web-app/presets/standard.patch.yml:26] | `read` / `read_image` / `write` / `edit` |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | 无 | `sampleOverCapGlobResults: false`。插件 `apply` 同时注册 `glob` 与 `grep`。[E: packages/bundle/web-app/presets/standard.patch.yml:31] [E: packages/fs/tool-fs-search/src/index.ts:142] [E: packages/fs/tool-fs-search/src/index.ts:151] | `glob` / `grep` |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | 无 | 无 config。只挂模型侧 `job_*`；jobs **registry** 留在 host。[E: packages/bundle/web-app/presets/standard.patch.yml:32] | `job_list` / `job_output` / `job_kill` |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 无 | 无 `customSkillDirs`（相对 `cordis` preset）。往 **本 preset 的 skill 层** 贡献本地根发现；skill **registry** 仍是 host。[E: packages/bundle/web-app/presets/standard.patch.yml:34] | 无独立 tool 名 |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 无 | 无 config。[E: packages/bundle/web-app/presets/standard.patch.yml:36] | `skill` |
| `command-goal` | `@deepseek-ai/dsh-command-goal` | 无 | 人命令 `/goal`；goals **service** 留在 host。[E: packages/bundle/web-app/presets/standard.patch.yml:38] | 无 wire 名 |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | 无 | 无 config。[E: packages/bundle/web-app/presets/standard.patch.yml:40] | `create_goal` / `get_goal` / `update_goal` |
| `planning` | `cordis:group` | `isolate.planMode: true` | 组本身 `group: true`。子行：`plan-mode`。[E: packages/bundle/web-app/presets/standard.patch.yml:42] [E: packages/bundle/web-app/presets/standard.patch.yml:46] | `exit_plan_mode` |
| `compaction` | `cordis:group` | `isolate.compaction: true` 且 `toolResultPruner: true` | 不 isolate `tokenMeter`（meter 在 host）。子行：`compaction-basic` / `command-compact` / `tool-result-pruner`。[E: packages/bundle/web-app/presets/standard.patch.yml:63] [E: packages/bundle/web-app/presets/standard.patch.yml:67] | 无 wire 名 |
| `delegation` | `cordis:group` | `isolate.workflowEngine: true` | subagent **registry** / spawn·fork backends 在 host；本 isolate 只覆盖 `workflows` 与同组消费者。子行：`tool-subagent-*` / `workflow-ptc` / `tool-workflow` / `tool-ralph`。[E: packages/bundle/web-app/presets/standard.patch.yml:80] [E: packages/bundle/web-app/presets/standard.patch.yml:84] | `subagent` 一族 + `workflow`（`ralph` 关闭） |
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | 无 | 无 config。[E: packages/bundle/web-app/presets/standard.patch.yml:131] | `ask_user_question` |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | 无 | `allowParallelInProgress: true`。[E: packages/bundle/web-app/presets/standard.patch.yml:136] | `todo_write` |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | 无 | `fetch: true`，`searchTimeoutMs: 60000`。插件默认 `fetch: true`；本行显式打开 `web_fetch`。[E: packages/bundle/web-app/presets/standard.patch.yml:140] [E: packages/web/tool-web/src/index.ts:56] | `web_search` **与** `web_fetch` |
| `present` | `@deepseek-ai/dsh-tool-present` | 无 | 无行内 config → schema 默认 `maxFiles: 8`。登记 wire 名 `present`。[E: packages/bundle/web-app/presets/standard.patch.yml:142] [E: packages/deliverables/tool-present/src/index.ts:22] [E: packages/deliverables/tool-present/src/index.ts:39] | `present` |
| `tool-plugin-manager` | `@deepseek-ai/dsh-plugin-manager/tools` | 无 | **`disabled: true`**。行在、工具不进 catalog。[E: packages/bundle/web-app/presets/standard.patch.yml:144] | （关闭） |

### isolate 组的子行

| 组 | 子 id | `name` | Config / 门控 | 模型可见 |
|---|---|---|---|---|
| `planning` | `plan-mode` | `@deepseek-ai/dsh-plan-mode` | 长 `section:` 以 “You are in plan mode. Stay in plan mode until exit_plan_mode succeeds” 起头。[E: packages/bundle/web-app/presets/standard.patch.yml:48] | `exit_plan_mode` |
| `compaction` | `compaction-basic` | `@deepseek-ai/dsh-compaction-basic` | 无行内 config。[E: packages/bundle/web-app/presets/standard.patch.yml:70] | 无 wire 名（自动压缩） |
| `compaction` | `command-compact` | `@deepseek-ai/dsh-command-compact` | 无行内 config。人命令 `/compact`，不进模型 tool catalog。[E: packages/bundle/web-app/presets/standard.patch.yml:72] | 无 |
| `compaction` | `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024`。[E: packages/bundle/web-app/presets/standard.patch.yml:77] | 无 |
| `delegation` | `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | 无行内 config。[E: packages/bundle/web-app/presets/standard.patch.yml:86] | `send_message` / `interrupt_agent` |
| `delegation` | `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 无行内 config。[E: packages/bundle/web-app/presets/standard.patch.yml:88] | `list_agents` |
| `delegation` | `tool-subagent` | `@deepseek-ai/dsh-tool-subagent` | `provider: spawn`，`toolName: subagent`，`modelSelectionSettings: true`，`backgroundMode: continuable`。[E: packages/bundle/web-app/presets/standard.patch.yml:96] | `subagent` |
| `delegation` | `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent` | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable`。[E: packages/bundle/web-app/presets/standard.patch.yml:102] | `subagent_fork` |
| `delegation` | `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent` | **`disabled: true`**。`provider: codex`，`toolName: subagent_codex`，`backgroundMode: one-shot`，`maxDepth: provider-managed`。[E: packages/bundle/web-app/presets/standard.patch.yml:105] | （关闭） |
| `delegation` | `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent` | **`disabled: true`**。`provider: claude-code`，`toolName: subagent_claude_code`，同样 `backgroundMode: one-shot` / `maxDepth: provider-managed`。[E: packages/bundle/web-app/presets/standard.patch.yml:113] | （关闭） |
| `delegation` | `workflow-ptc` | `@deepseek-ai/dsh-workflow-ptc` | `provider: spawn`。给同组 `workflowEngine` 提供引擎，不是模型 tool。本行 **启用**。[E: packages/bundle/web-app/presets/standard.patch.yml:119] | 无 |
| `delegation` | `tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | 无行内 `disabled`：模型面启用 `workflow`。[E: packages/bundle/web-app/presets/standard.patch.yml:123] | `workflow` |
| `delegation` | `tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | **`disabled: true`**。`subagentProvider: spawn`，`maxRounds: 64`。[E: packages/bundle/web-app/presets/standard.patch.yml:127] | （关闭） |

### `tool-subagent-fork`：`continuable` vs base 的 `one-shot`

`standard` 把 fork 写成 `backgroundMode: continuable`。[E: packages/bundle/web-app/presets/standard.patch.yml:102]

`dsh-base` 同一 `id` 写的是 `backgroundMode: one-shot`。[E: packages/bundle/base/cordis.patch.yml:387]

web 已把 host 上的 `tool-subagent-fork` `disabled: true`，所以 web 会话实际吃到的是 preset 这份 `continuable`，不是 base 的 `one-shot`。[E: packages/bundle/web-app/cordis.patch.yml:531]

### 本文件没有的行

下列 id **不在** `standard.patch.yml` 的 `plugins[]`。不要因为 workspace 里有对应包、或 `dsh-base` / 其它 preset 装过，就写成「standard 也有」。

| 缺的 id | 谁才有 | 证据 |
|---|---|---|
| `str-replace-editor` / `tool-str-replace-editor` | **四个 shipped 都不挂**。包仍在仓库，出厂路径不挂。 | [E: packages/bundle/web-app/presets/minimal.patch.yml:17] |
| `persistent-shell` / `persistent-bash` / `persistent-pwsh` | 只有 `minimal` 的 `persistent-shell` isolate | [E: packages/bundle/web-app/presets/minimal.patch.yml:17] [E: packages/bundle/web-app/presets/minimal.patch.yml:30] |
| `tool-cordis` | 只有 `cordis` | [E: packages/bundle/web-app/presets/cordis.patch.yml:141] |
| `tool-presentation` | 只有 `ptc`（`mode: ptc` → 模型侧 `run_code`）。wiki 节点 id 仍是 `surface.presets.code` | [E: packages/bundle/web-app/presets/ptc.patch.yml:144] [E: packages/bundle/web-app/presets/ptc.patch.yml:147] |

unix web e2e 对 `standard` 的 **精确** catalog（故意滤掉 `glob`/`grep`，因那条测试按机器是否带 ripgrep 排除它们）是：

`ask_user_question`, `bash`, `create_goal`, `edit`, `exit_plan_mode`, `get_goal`, `interrupt_agent`, `job_kill`, `job_list`, `job_output`, `list_agents`, `present`, `read`, `read_image`, `send_message`, `skill`, `subagent`, `subagent_fork`, `todo_write`, `update_goal`, `web_fetch`, `web_search`, `workflow`, `write`。[E: apps/cli/tests/web-agent-presets.e2e.ts:264] 同一用例还断言人命令 `goal` 存在。[E: apps/cli/tests/web-agent-presets.e2e.ts:271]

该表没有 `str_replace_editor`、`run_code`、`ralph`、`plugin_manager`、`subagent_codex`、`subagent_claude_code`、任何 `cordis_*`。**有** `web_fetch`（`fetch: true`）与 `present` 与 `workflow`。

## 装配与门控

**何时 init。** roster 行在 web host 面进程级 settle；每个声明 **activate 一份 generation**：`register` → `mountPreset`。之后会话只 `bindScopeParent` join。[E: packages/preset/agent-preset-registry/src/index.ts:80] [E: packages/preset/agent-preset-registry/src/index.ts:257] `AgentPresetRegistry.mount` 必须在 factory `setup` 里调用：`setupAndPublish` 先 `await setup`，成功才 `publish`；抛错则 `prepared.dispose()`。[E: packages/core/agent-loop/src/index.ts:774] [E: packages/core/agent-loop/src/index.ts:796]

**默认 id。** `AgentPresetRegistry.Config.default` 必填。[E: packages/preset/agent-preset-registry/src/index.ts:54] web patch 写成 `standard`。用户 Settings 的 `selectedDefault` 可以改成别的 id，只影响**之后**新建的会话；已经 join 的 session 仍停在当初那份 standing 组合。[E: packages/preset/agent-preset-registry/src/index.ts:74]

**isolate 门。** `mountPreset` 拒绝无 scope 的 context。[E: packages/preset/agent-preset-registry/src/mount.ts:259] 树 settle 后跑 `leakedServices`：任何把 service publish 进 **root realm** 的行都会抛错——「Preset services require isolate realms」。[E: packages/preset/agent-preset-registry/src/mount.ts:267] `standard` 因此把发布服务的行放进三个组：`planning`→`planMode`、`compaction`→`compaction`+`toolResultPruner`、`delegation`→`workflowEngine`。只往 host `ctx.tools` 注册、自己不 `provide` 的 tool 行（`tool-bash` / `tool-fs` / `tool-web` / `present` 等）不必带 realm。

**平台门。** `tool-bash` 在 `win32` disable，`tool-pwsh` 在非 `win32` disable。同一时刻只有一条 one-shot shell tool 进 catalog。[E: packages/bundle/web-app/presets/standard.patch.yml:22] [E: packages/bundle/web-app/presets/standard.patch.yml:25]

**产品后端门。** `tool-subagent-codex` / `tool-subagent-claude-code` 行在但 `disabled: true`。host 即便另外 insert 了 backends，`standard` 会话也看不到 `subagent_codex` / `subagent_claude_code`。[E: packages/bundle/web-app/presets/standard.patch.yml:105] [E: packages/bundle/web-app/presets/standard.patch.yml:113]

**workflow / ralph 门。** `workflow-ptc` + `tool-workflow` **启用**；`tool-ralph` **`disabled: true`**。这与 PTC 声明（三者全 disabled）不同。[E: packages/bundle/web-app/presets/standard.patch.yml:119] [E: packages/bundle/web-app/presets/standard.patch.yml:127]

**fetch 门。** `tool-web` 的 `fetch: true` 让 catalog 同时有 `web_search` 与 `web_fetch`。[E: packages/bundle/web-app/presets/standard.patch.yml:140]

**失败怎么响。** 未知 id → `resolve` 抛 `RemoteError` `agent-preset/not-found`。[E: packages/preset/agent-preset-registry/src/index.ts:183] 泄漏 root service → `mountPreset` 抛错，detail 点名 leaked 服务名。[E: packages/preset/agent-preset-registry/src/mount.ts:267] `composeAgent` 先 `resolve` 出 id；`setup` 才 `mount`。`setup` 抛错时 `setupAndPublish` 会 `dispose` 未 publish 的 Agent。[E: packages/api/session-controller/src/agent.ts:389] [E: packages/core/agent-loop/src/index.ts:796]

**无 roster 的 profile 不走这条门。** `ctx.get('agentPresets')` 为 `undefined` 时 `composeAgent` 只装 model selection，工具走 host 全局层。[E: packages/api/session-controller/src/agent.ts:386]

## 跨包关系

- `surface.presets.overview`（[overview.md](overview.md)）— 声明行、standing generation / `composeFrom`、authoring 写 profile patch。本页只展开 `standard` 这一份成员表。
- `ref.presets`（[../../reference/presets.md](../../reference/presets.md)）— 四份 shipped preset 的对照表；逐行 id 以本页为准。
- `surface.profiles.web`（[../profiles/web.md](../profiles/web.md)）— host 面 overlay：disable base 工具行、`insert` `agent-preset-registry` `default: standard`。
- `surface.profiles.headless`（[../profiles/headless.md](../profiles/headless.md)）— 不挂 roster；不要把 `standard` 说成 headless 默认装配。
- `surface.presets.minimal`（[minimal.md](minimal.md)）— 固定英文 `prefix` + persistent bash/pwsh；没有 compaction / skill / subagent / web / plan / todo / jobs / `present`。
- `surface.presets.code`（[code.md](code.md)）— 稳定别名；文件是 `presets/ptc.patch.yml`，增量是末尾 `tool-presentation` / `mode: ptc` 且 `workflow-ptc` / `tool-workflow` / `tool-ralph` 全 `disabled`；composition 仍保留 `standard` 那些 tool 行（含 `present`）。
- `surface.presets.cordis`（[cordis.md](cordis.md)）— `tool-cordis` + `skill-filesystem.customSkillDirs` + 条件启用的 `plugin_manager` + `present`。
- `spine.composition-boot`（[../../spine/composition-boot.md](../../spine/composition-boot.md)）— `profile → bundle → preset` 叠层；shipped 声明由 web-app `dsh.bundle.patch` 列表叠上，不是 launcher overlay。

## Sources

- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/preset/agent-preset/src/index.ts
- packages/preset/agent-preset-registry/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/preset/agent-preset-registry/src/display.ts
- packages/preset/persona/src/index.ts
- packages/api/session-controller/src/agent.ts
- packages/core/agent-loop/src/index.ts
- packages/client/ui-agent-preset/src/client/locales.ts
- apps/cli/tests/web-agent-presets.e2e.ts
- packages/preset/agent-preset-registry/tests/registry.spec.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/web/tool-web/src/index.ts
- packages/deliverables/tool-present/src/index.ts

## 相关

- [surface.presets.overview](overview.md) — preset 声明、默认 id、standing generation、会话记录。
- [ref.presets](../../reference/presets.md) — shipped preset 对照 catalog。
