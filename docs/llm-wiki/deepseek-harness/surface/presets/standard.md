---
id: surface.presets.standard
title: standard preset
kind: surface
tier: T1
pkg: composition
source:
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/preset.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/src/profile-boot.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/preset.ts
  - packages/preset/persona/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/core/agent-loop/src/index.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - packages/preset/agent-presets/tests/settings.spec.ts
  - packages/fs/tool-fs-search/src/index.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - planning
  - compaction
  - delegation
related:
  - surface.presets.overview
  - ref.presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `standard` 是 shipped **agent-preset 面**的默认全套编码组合：目录名即 id，成员资格只认 `apps/cli/config/agent-presets/standard/agent.cordis.yml` 的行（含 `disabled:`）。它不是又一个 coding agent，也不是 host 进程本身——web profile 先把 base 上的模型可见工具行 `disabled: true`，再 `insert` `agent-presets` 且 `default: standard`；每个会话在 Agent factory `setup` 里 `mount` 这份 standing 组合。`preset.yml` 只提供 picker 文案与 `order`，不决定装哪些包。

## 能回答的问题

- web 新建会话不点 preset 时，模型看见的是哪一套工具？谁把 `default` 写成 `standard`？
- `standard` 的 `agent.cordis.yml` 每一个 top-level `id`（含 `planning` / `compaction` / `delegation` 子行）装了什么、哪些 `disabled`、哪些有 `isolate`？
- `tool-subagent-fork` 在 `standard` 与 `dsh-base` 的 `backgroundMode` 差在哪？
- `standard` 有没有 `tool-str-replace-editor` / `tool-bash-persistent` / `tool-cordis` / `tool-presentation` / `web_fetch`？
- 发布服务的行为什么必须进 `cordis:group` + `isolate`？不发布服务的 tool 行为什么可以裸挂？
- headless 会不会默认挂上 `standard`？

## 是什么

DSH 的主线是 `profile → bundle → agent preset`。`standard` 是四个 shipped preset 之一，id 等于目录名 `standard`，必须匹配 `PRESET_ID = /^[a-z0-9][a-z0-9-]*$/`，并且目录里必须有 `COMPOSITION_FILE`（`agent.cordis.yml`）才算 preset。 [E: packages/preset/agent-presets/src/preset.ts:18] [E: packages/preset/agent-presets/src/discovery.ts:26]

`preset.yml` 是可选的 `METADATA_FILE`：只读 `name` / `description` / `order`。文件缺失或 YAML 损坏时 `readPresetMetadata` 返回空对象，composition 照样可 mount。 [E: packages/preset/agent-presets/src/metadata.ts:25] [E: packages/preset/agent-presets/src/metadata.ts:63] [E: packages/preset/agent-presets/src/metadata.ts:71] shipped 这份写的是 `name: 标准模式`、`order: 1`。 [E: apps/cli/config/agent-presets/standard/preset.yml:1] [E: apps/cli/config/agent-presets/standard/preset.yml:3]

**host 面 vs agent-preset 面。** `dsh-web-app` 在 host 上留下 webserver / persistence / sandbox / jobs·skill·goals **registry** / token meter / subagent **backends**，并把 base 的模型可见工具行关掉，再插入 roster：

```yaml
- id: agent-presets
  name: '@deepseek-ai/dsh-agent-presets'
  config:
    default: standard
```

[E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424] [E: packages/bundle/web-app/cordis.patch.yml:294]

`standard` 再在 **agent-preset 面**把 persona、instructions、模型可见 tools、以及三个 isolate 组挂回每个 join 了这份 standing mount 的 Agent。capability seam 仍是 Definition / Provider / Consumer：preset 多数行只当 Consumer，往 host 的 `ctx.tools` / `ctx.skills` 注册；只有需要私有 Provider 的服务才进 `isolate`。模型看见哪份 preset，就必须写进 session header / `agent-preset/selected`（`model-visible ⟺ logged`）。

`packages/bundle/headless/cordis.patch.yml` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `agent-presets` 行。 [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] headless 的模型可见工具留在 `dsh-base` 的 host 行，**不是** shipped `standard`。

web e2e 钉死：system 根只供应 `code` / `cordis` / `minimal` / `standard`，且 `defaultId === 'standard'`。 [E: apps/cli/tests/web-agent-presets.e2e.ts:190] [E: apps/cli/tests/web-agent-presets.e2e.ts:192]

## 入口

用户碰到 `standard` 的路径：

1. 默认产品是本地 Web GUI：`dsh web` ≡ `--profile web`。web bundle 插入 `agent-presets` 且 `default: standard`。 [E: packages/bundle/web-app/cordis.patch.yml:424]
2. launcher `composeProfile`（`apps/cli/src/profile-boot.ts` 文件内函数，未导出）在叠完 bundle / profile / home / `--patch` 之后，若行表已有 `agent-presets`，再补一条 overlay：`roots: [{ path: SHIPPED_PRESET_ROOT, trust: 'system' }]`。`SHIPPED_PRESET_ROOT` 解析到 `apps/cli/config/agent-presets/`（源码与 `lib/` 布局都相对该文件的上一级）。 [E: apps/cli/src/profile-boot.ts:35] [E: apps/cli/src/profile-boot.ts:159] [E: apps/cli/src/profile-boot.ts:164]
3. `AgentPresets` 的 `includeUserRoot` 默认 `true`，构造时在配置 roots 之后再追加 `$DSH_HOME/.agent-presets`（`USER_PRESET_DIR`）。 [E: packages/preset/agent-presets/src/index.ts:92] [E: packages/preset/agent-presets/src/index.ts:134] `discoverPresets` 先到先得：已占用的 id 跳过后根。 [E: packages/preset/agent-presets/src/discovery.ts:181] shipped `standard` 因此挡住用户目录里的同名文件夹。
4. 浏览器 `session.create` 不传 `agentPreset` 时，`composeAgent(undefined)` 走 `presets.resolve(presetId)`；`resolve` 用 `id ?? this.defaultId`。 [E: packages/host/apiproxy/src/api-proxy.ts:1240] [E: packages/preset/agent-presets/src/index.ts:214]
5. `defaultId` = settings 命名空间 `agent-presets` 的 `default`，否则 composition 的 `config.default`。未写 settings 时回落到 `standard`。 [E: packages/preset/agent-presets/src/index.ts:192] [E: packages/preset/agent-presets/tests/settings.spec.ts:63]
6. 真正的 Include 发生在 factory `setup`：`presets.mount(agentCtx, resolvedId)`。`setupAndPublish` 在 `setup` 抛错时 `prepared.dispose()` 再把 error 抛出，Agent 不会 publish。 [E: packages/host/apiproxy/src/api-proxy.ts:1245] [E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:642]

## 关键字段

### `preset.yml`（显示元数据，不是成员资格）

| 字段 | 值 | 含义 |
|---|---|---|
| `name` | `标准模式` | picker 显示名；缺了就回落目录 id。 [E: apps/cli/config/agent-presets/standard/preset.yml:1] |
| `description` | `功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。` | 一句话说明。 [E: apps/cli/config/agent-presets/standard/preset.yml:2] |
| `order` | `1` | shipped 集合里按 capability 排序时最小，排在 `code`(2) / `minimal`(3) / `cordis`(4) 前面。 [E: apps/cli/config/agent-presets/standard/preset.yml:3] |

### `agent.cordis.yml` 全部 top-level `id`（文件顺序）

成员资格只认这一列。仓库里有同名包、或 `dsh-base` 曾经 insert 过同一 `id`，都不构成 `standard` 的成员。

| id | `name` | 组 / isolate | Config / 门控 | 模型可见名（unix e2e，见下） |
|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 无 | 只写 `text`：`You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.` 不写 `complete` / `includeRuntimeContext`。插件 schema 默认 `complete: false`、`includeRuntimeContext: true`，所以这条只 shadow 部署 persona，不封死其它 section，也不 suppress runtime context。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:24] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:28] [E: packages/preset/persona/src/index.ts:50] [E: packages/preset/persona/src/index.ts:51] | 无 tool；prompt section |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | 无 | `maxBytes: 65536`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:30] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:33] | 无 tool；workspace 指令 |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | 无 | `disabled: !!js process.platform === 'win32'`。消费 host `shell-env` / `bash-sandbox`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:44] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:46] | `bash` |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 无 | `disabled: !!js process.platform !== 'win32'`。与 `tool-bash` 互斥。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:48] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:50] | `pwsh`（仅 win32） |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | 无 | 无额外 config。消费 host `fs` / sandbox，自己 `provide` 空。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56] | `read` / `read_image` / `write` / `edit` |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | 无 | `sampleOverCapGlobResults: false`。插件 `apply` 同时注册 `glob` 与 `grep`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:59] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:62] [E: packages/fs/tool-fs-search/src/index.ts:142] [E: packages/fs/tool-fs-search/src/index.ts:151] | `glob` / `grep` |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | 无 | 无 config。只挂模型侧 `job_*`；jobs **registry** 留在 host。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:73] | `job_list` / `job_output` / `job_kill` |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 无 | 无 `customSkillDirs`（相对 `cordis` preset）。往 **本 preset 的 skill 层** 贡献本地根发现；skill **registry** 仍是 host。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:83] | 无独立 tool 名 |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 无 | 无 config。给该 Agent 目录与 loader。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:86] | `skill` |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | 无 | 无 config。goals **service** / `/goal` 留在 host。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:97] | `create_goal` / `get_goal` / `update_goal` |
| `planning` | `cordis:group` | `isolate.planMode: true` | 组本身 `group: true`。子行：`plan-mode`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:104] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] | `exit_plan_mode` |
| `compaction` | `cordis:group` | `isolate.compaction: true` 且 `toolResultPruner: true` | 不 isolate `tokenMeter`（meter 在 host）。子行：`compaction-basic` / `command-compact` / `tool-result-pruner`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:137] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:142] | 无 wire 名 |
| `delegation` | `cordis:group` | `isolate.workflowEngine: true` | subagent **registry** / spawn·fork backends 在 host；本 isolate 只覆盖 `workflows` 与同组消费者。子行：`tool-subagent-*` / `workflow-worker-thread` / `tool-workflow` / `tool-ralph`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:174] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178] | `subagent` 一族 + `workflow` / `ralph` |
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | 无 | 无 config。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:237] | `ask_user_question` |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | 无 | `allowParallelInProgress: true`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:240] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:243] | `todo_write` |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | 无 | `fetch: false`，`searchTimeoutMs: 60000`。web **service** / search provider 在 host。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:251] | `web_search`（无 `web_fetch`） |

### isolate 组的子行

| 组 | 子 id | `name` | Config / 门控 | 模型可见 |
|---|---|---|---|---|
| `planning` | `plan-mode` | `@deepseek-ai/dsh-plan-mode` | 长 `section:` 以 “You are in plan mode. Stay in plan mode until exit_plan_mode succeeds” 起头；禁止用 mutation tools 执行计划；禁止用 `todo_write` 跟踪规划阶段。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:110] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:114] | `exit_plan_mode` |
| `compaction` | `compaction-basic` | `@deepseek-ai/dsh-compaction-basic` | 无行内 config。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:144] | 无 wire 名（自动压缩） |
| `compaction` | `command-compact` | `@deepseek-ai/dsh-command-compact` | 无行内 config。人命令 `/compact`，不进模型 tool catalog。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:147] | 无 |
| `compaction` | `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024`。与 `compaction-basic` 同组，共享 `toolResultPruner` realm。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:150] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:153] | 无 |
| `delegation` | `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | 无行内 config。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:180] | `send_message` / `interrupt_agent` |
| `delegation` | `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 无行内 config。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:183] | `list_agents` |
| `delegation` | `tool-subagent` | `@deepseek-ai/dsh-tool-subagent` | `provider: spawn`，`toolName: subagent`，`backgroundMode: continuable`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:186] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:191] | `subagent` |
| `delegation` | `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent` | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:193] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198] | `subagent_fork` |
| `delegation` | `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent` | **`disabled: true`**。`provider: codex`，`toolName: subagent_codex`，`enableRunInBackground: false`，`maxDepth: provider-managed`。行在、工具不进 catalog。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:203] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205] | （关闭） |
| `delegation` | `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent` | **`disabled: true`**。`provider: claude-code`，`toolName: subagent_claude_code`，同样 `enableRunInBackground: false` / `maxDepth: provider-managed`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:212] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:214] | （关闭） |
| `delegation` | `workflow-worker-thread` | `@deepseek-ai/dsh-workflow-worker-thread` | `provider: spawn`。给同组 `workflowEngine` 提供 worker，不是模型 tool。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:221] | 无 |
| `delegation` | `tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | 无行内 config。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:226] | `workflow` |
| `delegation` | `tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | `subagentProvider: spawn`，`maxRounds: 64`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:229] | `ralph` |

### `tool-subagent-fork`：`continuable` vs base 的 `one-shot`

`standard` 把 fork 写成 `backgroundMode: continuable`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:198]

`dsh-base` 同一 `id` 写的是 `backgroundMode: one-shot`。 [E: packages/bundle/base/cordis.patch.yml:324] [E: packages/bundle/base/cordis.patch.yml:329]

web 已把 host 上的 `tool-subagent-fork` `disabled: true`，所以会话实际吃到的是 preset 这份 `continuable`，不是 base 的 `one-shot`。 [E: packages/bundle/web-app/cordis.patch.yml:384]

### 本文件没有的行

下列 id **不在** `standard/agent.cordis.yml`。不要因为 workspace 里有对应包、或 `dsh-base` / 其它 preset 装过，就写成「standard 也有」。

| 缺的 id | 谁才有 | 证据 |
|---|---|---|
| `tool-str-replace-editor` | `minimal` 的 `filesystem` isolate（子 id `str-replace-editor`）；base 也有一行但 web 已 `disabled: true` | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:319] |
| `tool-bash-persistent` / `persistent-bash` | 只有 `minimal` 的 `persistent-shell` isolate | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:32] |
| `tool-cordis` | 只有 `cordis` | [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245] web e2e：`standard` catalog 不含 `cordis_define` [E: apps/cli/tests/web-agent-presets.e2e.ts:326] |
| `tool-presentation` | 只有 `code`（`mode: code` → 模型侧 `run_code`） | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] |

unix web e2e 对 `standard` 的 **精确** catalog（故意滤掉 `glob`/`grep`，因那条测试按机器是否带 ripgrep 排除它们）是：

`ask_user_question`, `bash`, `create_goal`, `edit`, `exit_plan_mode`, `get_goal`, `interrupt_agent`, `job_kill`, `job_list`, `job_output`, `list_agents`, `ralph`, `read`, `read_image`, `send_message`, `skill`, `subagent`, `subagent_fork`, `todo_write`, `update_goal`, `web_search`, `workflow`, `write`。 [E: apps/cli/tests/web-agent-presets.e2e.ts:206]

该表没有 `str_replace_editor`、`web_fetch`、`run_code`、`subagent_codex`、`subagent_claude_code`、任何 `cordis_*`。

## 装配与门控

**何时 init。** roster 行在 web host 面进程级 settle；每个 preset id **standing mount 一次**：`ensureStanding` 用 `{ agentPreset: preset.id }` 调 `createScope`，再 `mountPreset`。 [E: packages/preset/agent-presets/src/index.ts:514] [E: packages/preset/agent-presets/src/index.ts:515] [E: packages/preset/agent-presets/src/mount.ts:332] 之后会话只 `bindScopeParent` join。 [E: packages/preset/agent-presets/src/index.ts:286] `AgentPresets.mount` 必须在 factory `setup` 里调用：`setupAndPublish` 先 `await setup`，成功才 `publish`；抛错则 `prepared.dispose()`。 [E: packages/preset/agent-presets/src/index.ts:275] [E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:640] [E: packages/core/agent-loop/src/index.ts:642]

**默认 id。** `AgentPresets.Config.default` 必填。 [E: packages/preset/agent-presets/src/index.ts:87] web patch 写成 `standard`。用户 settings 的 `agent-presets.default` 可以改成别的 id，只影响**之后**新建的会话；已经 join 的 session 仍停在当初那份 standing 组合。 [E: packages/preset/agent-presets/src/index.ts:192]

**isolate 门。** `mountPreset` 在树 settle 后跑 `leakedServices`：任何把 service publish 进 **root realm** 的行都会抛错——「a preset service must sit behind an `isolate` realm or move to the host composition」。 [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365] `standard` 因此把发布服务的行放进三个组：`planning`→`planMode`、`compaction`→`compaction`+`toolResultPruner`、`delegation`→`workflowEngine`。只往 host `ctx.tools` 注册、自己不 `provide` 的 tool 行（`tool-bash` / `tool-fs` / `tool-web` 等）不必带 realm。

**平台门。** `tool-bash` 在 `win32` disable，`tool-pwsh` 在非 `win32` disable。同一时刻只有一条 shell tool 进 catalog。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:46] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:50]

**产品后端门。** `tool-subagent-codex` / `tool-subagent-claude-code` 行在但 `disabled: true`。host 即便另外 insert 了 `subagent-codex` / `subagent-claude-code` backends，`standard` 会话也看不到 `subagent_codex` / `subagent_claude_code`；要暴露必须 copy 出用户 preset 再去掉 `disabled`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:214]

**fetch 门。** `tool-web` 的 `fetch: false` 让 catalog 只有 `web_search`，没有 `web_fetch`。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250]

**失败怎么响。** 未知 id → `UnknownPresetError`。yml 缺文件 / 不是 entry list / 行 inactive（在等一个 composition 永远不提供的 service）→ `PresetMountError`。泄漏 root service → 同一条 `PresetMountError`，detail 点名 leaked 服务名。`composeAgent` 先 `resolve` 出 id；`ensureSession` 把 `composition.agentPreset` 写进 create `meta`，`setup` 才 `mount`。`setup` 抛错时 `setupAndPublish` 会 `dispose` 未 publish 的 Agent。 [E: packages/host/apiproxy/src/api-proxy.ts:1240] [E: packages/host/apiproxy/src/api-proxy.ts:1675] [E: packages/preset/agent-presets/src/mount.ts:379] [E: packages/core/agent-loop/src/index.ts:642]

**headless 不走这条门。** 没有 roster 时 `composeAgent` 只装 model selection，工具走 host 全局层。 [E: packages/host/apiproxy/src/api-proxy.ts:1232]

## 跨包关系

- `surface.presets.overview`（[overview.md](overview.md)）— 发现 roots、`COMPOSITION_FILE`、standing mount / `composeFrom`、authoring 只能 `copy`。本页只展开 `standard` 这一份成员表。
- `ref.presets`（[../../reference/presets.md](../../reference/presets.md)）— 四份 shipped preset 的对照表；逐行 id 以本页为准。
- `surface.profiles.web`（[../profiles/web.md](../profiles/web.md)）— host 面 overlay：disable base 工具行、`insert` `agent-presets` `default: standard`。
- `surface.profiles.headless`（[../profiles/headless.md](../profiles/headless.md)）— 不挂 roster；不要把 `standard` 说成 headless 默认装配。
- `surface.presets.minimal`（[minimal.md](minimal.md)）— 固定英文 persona + persistent bash + `str_replace_editor`；没有 compaction / skill / subagent / web / plan / todo / jobs。
- `surface.presets.code`（[code.md](code.md)）— shipped 增量是末尾 `tool-presentation` / `mode: code`；composition 仍保留 `standard` 那些 tool 行。
- `surface.presets.cordis`（[cordis.md](cordis.md)）— 不同 persona + `tool-cordis` + `skill-filesystem.customSkillDirs`。
- `spine.composition-boot`（[../../spine/composition-boot.md](../../spine/composition-boot.md)）— `profile → bundle → preset` 叠层与 `composeProfile` 补 shipped root。

## Sources

- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/standard/preset.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/src/profile-boot.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/metadata.ts
- packages/preset/agent-presets/src/preset.ts
- packages/preset/persona/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/core/agent-loop/src/index.ts
- apps/cli/tests/web-agent-presets.e2e.ts
- packages/preset/agent-presets/tests/settings.spec.ts
- packages/fs/tool-fs-search/src/index.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [surface.presets.overview](overview.md) — preset 发现、默认 id、standing mount、会话记录。
- [ref.presets](../../reference/presets.md) — shipped preset 对照 catalog。
