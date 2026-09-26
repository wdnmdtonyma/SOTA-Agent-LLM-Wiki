---
id: surface.presets.code
title: PTC preset (`ptc`)
kind: surface
tier: T1
pkg: composition
source:
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/display.ts
  - packages/preset/persona/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/ptc.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/api/session-controller/src/agent.ts
  - packages/deliverables/tool-present/src/index.ts
  - packages/client/ui-agent-preset/src/client/locales.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - packages/boot/app-boot/src/profile.ts
symbols:
  - apply
  - Config
  - leakedServices
  - PresetDefinition
related:
  - surface.presets.overview
  - ref.presets
  - surface.presets.standard
  - surface.presets.minimal
  - surface.presets.cordis
  - surface.tools.run-code
  - subsys.core.code-mode
  - spine.trace-code-mode
  - spine.composition-boot
  - surface.profiles.web
  - surface.profiles.headless
evidence: explicit
status: verified
updated: 477b4f4205
---

> 节点 id `surface.presets.code` 是 **PTC** shipped preset 的稳定别名。roster id / `config.id` 是 **`ptc`**（声明文件是 `presets/ptc.patch.yml`，不再存在 `presets/code/`）。picker 显示名 **PTC 模式**。成员资格只认 `packages/bundle/web-app/presets/ptc.patch.yml` 的 `plugins[]`；相对 `standard` 的可加载增量是末尾 `tool-presentation`（`@deepseek-ai/dsh-agent-tool-presentation`，`mode: ptc`）以及 `workflow-ptc` / `tool-workflow` / `tool-ralph` **全部** `disabled: true`。`present` 与 `standard` 一样挂在文件末尾，但 PTC 模型面会把 catalog collapse 成 `run_code`，`present` 须从 SDK 子调度调用。四个 shipped **只叠在 `dsh-web-app`**。

## 能回答的问题

- `ptc` / PTC 的 preset id、显示名、`order` 分别写在哪？locale 算不算成员资格？旧 id `code` 还存在吗？
- 相对 `standard`，可加载行（`id` / `name` / `config` / `disabled` / `isolate`）到底差哪几行？
- PTC 是不是把 `tool-bash` / `tool-fs` / `present` 从 composition 拿掉？模型请求里还剩哪些 schema？
- `planning` / `compaction` / `delegation` 各自 `isolate` 哪些服务？漏到 root realm 会怎样？
- web 默认会不会选中 `ptc`？headless / sdk / acp / sdk-minimal 会不会挂这个 shipped preset？host 面缺 `ptcRuntime` 时 mount 如何失败？

## 是什么

DSH 的主线是 **profile → bundle → agent preset**。四个 shipped 声明文件是 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`，只出现在 `dsh-web-app` 的 `dsh.bundle.patch` 列表里。[E: packages/bundle/web-app/package.json:43] roster id 来自 `config.id`，须由声明行提供。[E: packages/preset/agent-preset/src/index.ts:17] wiki 节点 id 仍叫 `surface.presets.code`。

**agent-preset 面**（本文件）：standing generation 上的 persona、model-facing 工具行、以及带 `isolate` 的 per-preset 服务组；agent 通过 `bindScopeParent` join。[E: packages/preset/agent-preset-registry/src/index.ts:257] Session Controller 的 `composeAgent` 在 factory `setup` 里调用 `presets.mount(agentCtx, resolvedId)`。[E: packages/api/session-controller/src/agent.ts:394] 没有 `agentPresets` 服务时只 `installSelection`，不挂 preset。[E: packages/api/session-controller/src/agent.ts:386]

**host 面**（本 preset 不拥有）：`tools` / `skills` / `tasks` / `goals` / `subagents` 等 registry、sandbox 与 approval、persistence、model route，以及 TypeScript `ptcRuntime`（base 行 `id: ptc-runtime` / `@deepseek-ai/dsh-ptc-runtime-node`）。五个 shipped CLI profile 在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] **`desktop` 不在这张表里**。**只有 web** 在五个模板对应的 bundle patch 里 insert `agent-preset-registry` 行、`default: standard`，并叠四份声明。[E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/cordis.patch.yml:562] web 把 base 上的模型可见工具行 `disabled: true`（例如 `tool-bash`）[E: packages/bundle/web-app/cordis.patch.yml:447]，改由每会话 preset 再挂。headless overlay 没有 registry 行。sdk / acp 叠 base 工具行，也不挂 roster。`sdk-minimal` 不叠 `dsh-base`。

PTC 的含义是 **presentation**，不是另一套成员表。`mode === 'ptc'` 时 `wireSchemas` 只保留 `schema.name === RUN_CODE_NAME`（`run_code`）。[E: packages/core/tools/src/index.ts:1022] [E: packages/core/tools/src/ptc.ts:30] native 工具（含 `present`）仍在 composition 里注册，供 SDK 子调度调用。权威实现是 `packages/core/tools/src/ptc.ts`，不是已删除的 `code-mode.ts`。执行缝是 `ctx.ptcRuntime`，不是 `ctx.codeRuntime`。

## 入口

用户 / 进程碰到 `ptc` 的路径：

1. **磁盘位置**：`packages/bundle/web-app/presets/ptc.patch.yml`。行 id 是 `preset-ptc`，roster id 是 `config.id: ptc`。[E: packages/bundle/web-app/presets/ptc.patch.yml:5] [E: packages/bundle/web-app/presets/ptc.patch.yml:8]
2. **选中本 preset**：会话创建或 blank 期 recompose 时把 preset id 设为 `ptc`。picker 显示 locale `PTC 模式`。[E: packages/client/ui-agent-preset/src/client/locales.ts:89] web 默认仍是 `standard`；要跑 PTC 必须显式选 `ptc` 或把 Settings `selectedDefault` 改成 `ptc`。
3. **headless / sdk / acp 不走这条入口**：无 registry 行，也无这份 patch 文件。headless 的模型可见工具来自 `dsh-base` host 行；进程级 PTC 只可能来自 host `tools.mode: !!js process.env.DSH_TOOLS_MODE` [E: packages/bundle/headless/cordis.patch.yml:18]，与本 shipped preset 无关。
4. **不要把 `DSH_TOOLS_MODE` 当成「选了 ptc preset」**：web 的 host `tools` 行同样吃该环境变量 [E: packages/bundle/web-app/cordis.patch.yml:38]，那是 **进程级 defaultMode**。`ptc` preset 用 agent-plane `tool-presentation` 在 standing scope 上 `presentAs('ptc')`，与 host 默认正交。

## 关键字段

### 显示元数据（locale，不是成员资格）

| 键 | 值 | 作用 |
|---|---|---|
| locale `presetPtcName` | `PTC 模式` | picker 显示名 [E: packages/client/ui-agent-preset/src/client/locales.ts:89] |
| locale `presetPtcDescription` | `包含标准模式的所有能力，更适合批量调用工具，并对结果进行筛选、整理、去重、统计或汇总的任务。` | 一句话说明 [E: packages/client/ui-agent-preset/src/client/locales.ts:90] |
| `order` | `2` | 有 `order` 的 preset 按数值升序；`standard` 是 `1`，本 preset 排第二 [E: packages/bundle/web-app/presets/ptc.patch.yml:9] [E: packages/bundle/web-app/presets/standard.patch.yml:9] |

### 相对 `standard` 的可加载差异

逐 `id` 对照 `presets/standard.patch.yml` 与 `presets/ptc.patch.yml`：

- **可加载增量**：`ptc` 在 `tool-web` 之后多出 `id: tool-presentation` / `name: '@deepseek-ai/dsh-agent-tool-presentation'` / `config.mode: ptc` [E: packages/bundle/web-app/presets/ptc.patch.yml:144] [E: packages/bundle/web-app/presets/ptc.patch.yml:147]。另：`workflow-ptc` / `tool-workflow` / `tool-ralph` 在 PTC 上 **全部 `disabled: true`** [E: packages/bundle/web-app/presets/ptc.patch.yml:121] [E: packages/bundle/web-app/presets/ptc.patch.yml:126] [E: packages/bundle/web-app/presets/ptc.patch.yml:129]；`standard` 启用 `workflow-ptc` + `tool-workflow`，同样把 `tool-ralph` `disabled: true` [E: packages/bundle/web-app/presets/standard.patch.yml:119] [E: packages/bundle/web-app/presets/standard.patch.yml:127]。两边都以 `present` 收束（`@deepseek-ai/dsh-tool-present`），再挂 disabled 的 `tool-plugin-manager` [E: packages/bundle/web-app/presets/ptc.patch.yml:148] [E: packages/bundle/web-app/presets/standard.patch.yml:142]。
- **其余可加载字段相同**：`persona` 的 `prefix` / `suffix`、`agent-instructions.maxBytes`、`command-goal`、平台 `disabled` 的 `tool-bash`/`tool-pwsh`、`tool-fs-search.sampleOverCapGlobResults`、`planning`/`compaction`/`delegation` 的 `isolate` 键、`tool-subagent*` 的 `provider`/`toolName`/`backgroundMode`/`modelSelectionSettings`、两条 product provider 的 `disabled: true`、`tool-todo.allowParallelInProgress`、`tool-web.fetch`。`tool-subagent-fork` 两边都是 `backgroundMode: continuable` [E: packages/bundle/web-app/presets/ptc.patch.yml:102]；这与 host `dsh-base` 里同一 id 的 `backgroundMode: one-shot` 不同 [E: packages/bundle/base/cordis.patch.yml:387]。
- **注释不同，不是成员资格**：YAML `#` 注释不能当成员，也不能当 `[E]`。
- **本文件没有**（完整成员表即反证）：`tool-str-replace-editor`（**四个 shipped 都不挂**）、`persistent-shell` / `tool-bash-persistent`（只有 `minimal`）、`tool-cordis` / `skill-filesystem.customSkillDirs`（只有 `cordis`）。

### 成员表（yml 每一个 `id:`，含 group 子行）

「相对 standard」列：`同` = 与 `standard.patch.yml` 同 `name` / `config` / `disabled` / `isolate`。

| `id` | `name` | isolate / 门控 | 关键 config | 相对 standard | yml |
|---|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 无（只投 prompt） | `prefix: You are a coding agent powered by the {{model}} model.`；`suffix: Your working directory is {{cwd}}.` 不写 `complete` / `includeRuntimeContext` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:14] [E: packages/preset/persona/src/index.ts:52] |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | 无 | `maxBytes: 65536` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:19] |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | 无 | `disabled: !!js process.platform === 'win32'` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:22] |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 无 | `disabled: !!js process.platform !== 'win32'` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:25] |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | 无 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:26] |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | 无 | `sampleOverCapGlobResults: false` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:31] |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | 无 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:32] |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 无 | 无 `customSkillDirs` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:34] |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 无 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:36] |
| `command-goal` | `@deepseek-ai/dsh-command-goal` | 无 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:38] |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | 无 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:40] |
| `planning` | `cordis:group` | `isolate.planMode: true` | `group: true` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:46] |
| `plan-mode` | `@deepseek-ai/dsh-plan-mode` | 落在 `planning` 组内 | 长 `section:`（plan mode 规则，与 standard 同文） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:48] |
| `compaction` | `cordis:group` | `isolate.compaction: true` 与 `toolResultPruner: true` | `group: true` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:67] |
| `compaction-basic` | `@deepseek-ai/dsh-compaction-basic` | 组内 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:70] |
| `command-compact` | `@deepseek-ai/dsh-command-compact` | 组内 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:72] |
| `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` | 组内 | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:77] |
| `delegation` | `cordis:group` | `isolate.workflowEngine: true` | `group: true` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:84] |
| `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | 组内 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:86] |
| `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 组内 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:88] |
| `tool-subagent` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `provider: spawn`，`toolName: subagent`，`modelSelectionSettings: true`，`backgroundMode: continuable` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:96] |
| `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:102] |
| `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `disabled: true`；`provider: codex`，`toolName: subagent_codex`，`backgroundMode: one-shot`，`maxDepth: provider-managed` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:105] |
| `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `disabled: true`；`provider: claude-code`，`toolName: subagent_claude_code`，`backgroundMode: one-shot`，`maxDepth: provider-managed` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:113] |
| `workflow-ptc` | `@deepseek-ai/dsh-workflow-ptc` | 组内 | **`disabled: true`**；`provider: spawn` | **相对 standard 关掉引擎** | [E: packages/bundle/web-app/presets/ptc.patch.yml:121] |
| `tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | 组内 | **`disabled: true`** | **相对 standard 关掉模型面 `workflow`** | [E: packages/bundle/web-app/presets/ptc.patch.yml:126] |
| `tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | 组内 | **`disabled: true`**；`subagentProvider: spawn`，`maxRounds: 64` | 同（standard 也关掉） | [E: packages/bundle/web-app/presets/ptc.patch.yml:129] |
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | 无 | （无 config） | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:133] |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | 无 | `allowParallelInProgress: true` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:138] |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | 无 | `fetch: true`，`searchTimeoutMs: 60000` | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:142] |
| `tool-presentation` | `@deepseek-ai/dsh-agent-tool-presentation` | 无 | **`mode: ptc`（必填，无默认）** | **本 preset 独有** | [E: packages/bundle/web-app/presets/ptc.patch.yml:144] [E: packages/bundle/web-app/presets/ptc.patch.yml:147] |
| `present` | `@deepseek-ai/dsh-tool-present` | 无 | 无行内 config → schema 默认 `maxFiles: 8`。登记 wire 名 `present` | 同（composition 有；PTC 模型面 collapse 后须从子调度调用） | [E: packages/bundle/web-app/presets/ptc.patch.yml:148] [E: packages/deliverables/tool-present/src/index.ts:22] [E: packages/deliverables/tool-present/src/index.ts:39] |
| `tool-plugin-manager` | `@deepseek-ai/dsh-plugin-manager/tools` | 无 | **`disabled: true`** | 同 | [E: packages/bundle/web-app/presets/ptc.patch.yml:150] |

### `tool-presentation` / `mode: ptc`

插件导出 `name = 'tool-presentation'` [E: packages/core/agent-tool-presentation/src/index.ts:28]。静态 `inject` 只有 `['tools']`，不把 `ptcRuntime` 写成硬依赖，这样 `mode: 'native'` 才能在没有 runtime 的部署上 mount [E: packages/core/agent-tool-presentation/src/index.ts:35]。`Config.mode` 是 `'native' | 'ptc' | 'both'` 且 `.required()`：省略值会让这一行等于白挂 [E: packages/core/agent-tool-presentation/src/index.ts:51]。

`apply(ctx, config)`：`native` 立刻 `ctx.tools.presentAs('native')`；`ptc` / `both` 则 `ctx.inject(['ptcRuntime'], …)` 再 `presentAs(config.mode)` [E: packages/core/agent-tool-presentation/src/index.ts:63] [E: packages/core/agent-tool-presentation/src/index.ts:69]。`presentAs` 要求 scoped context（preset 的 standing scope），禁止当成进程全局开关 [E: packages/core/tools/src/index.ts:974] [E: packages/core/tools/src/index.ts:977]。

装配结果：e2e 用 `mount(agentCtx, 'ptc')` 得到 `assembly.tools === ['run_code']` [E: apps/cli/tests/web-agent-presets.e2e.ts:416]；同进程 `standard` 会话仍看见 `bash`、没有 `run_code` [E: apps/cli/tests/web-agent-presets.e2e.ts:426]。

## 装配与门控

1. **发现**：声明行 `register` 进 registry。`ptc` 作为 shipped 声明出现在 web-app bundle 层，`trust` / 目录扫描不存在。
2. **standing generation 一次**：`register` → `mountPreset`；`AgentPresetRegistry.mount` 用 `bindScopeParent` 把 agent join 上去 [E: packages/preset/agent-preset-registry/src/index.ts:257]。
3. **服务泄漏门**：`leakedServices` 列出挂进 **root realm** 的服务名；非空则 throw [E: packages/preset/agent-preset-registry/src/mount.ts:86] [E: packages/preset/agent-preset-registry/src/mount.ts:267]。本 preset 三个 isolate 组覆盖 `planMode` / `compaction`+`toolResultPruner` / `workflowEngine`。只往 host `tools` 注册的行（含 `tool-presentation` / `present`）不 `provide`，不需要 realm。
4. **未激活行门**：`auditRows` 把仍 `fiber.inject` 缺服务的 enabled 行报成 pending。host 若没 compose `ptcRuntime`，`tool-presentation` 的动态 `inject(['ptcRuntime'])` 会停在 pending [E: packages/core/agent-tool-presentation/src/index.ts:69]。base 默认 insert 了 `ptc-runtime`，因此在默认 web 部署上再选 id `ptc` 时这一行能激活 [E: packages/bundle/base/cordis.patch.yml:389]。
5. **平台门**：`tool-bash` 在 `win32` disable，`tool-pwsh` 在非 `win32` disable [E: packages/bundle/web-app/presets/ptc.patch.yml:22]。
6. **产品 provider 门**：`tool-subagent-codex` / `tool-subagent-claude-code` 在 shipped 文件里 `disabled: true` [E: packages/bundle/web-app/presets/ptc.patch.yml:105]。
7. **失败回滚**：activate 失败写下 `broken` 并 `scope.dispose()`；`mount` 走 `retain` 时抛 `agent-preset/invalid` [E: packages/preset/agent-preset-registry/src/index.ts:113] [E: packages/preset/agent-preset-registry/src/index.ts:217]。
8. **与 host `DSH_TOOLS_MODE` 的关系**：环境变量改的是 host `tools` 行的进程级 `mode`。本 preset 的 `presentAs('ptc')` 盖在 standing scope 上，native 会话可以同进程并存。不要把「设了 `DSH_TOOLS_MODE=ptc`」写成「正在跑 shipped `ptc` preset」。

## 跨包关系

- [surface.presets.overview](overview.md) — 声明行、`mount` / `recompose`、`defaultId`、session header 与 `agent-preset/selected`。本页只写 `ptc` 这一份 composition。
- [ref.presets](../../reference/presets.md) — 四个 shipped preset 对照表；本页是 `ptc` 的权威成员清单。
- [surface.presets.standard](standard.md) — 对照对象：除 `tool-presentation` 与 `workflow-ptc` / `tool-workflow` 的 `disabled` 外，可加载行（含 `present`、关掉的 `ralph`）与本页相同。
- [surface.presets.minimal](minimal.md) / [surface.presets.cordis](cordis.md) — 另外两份 shipped 成员表（minimal 只剩 persistent shell；cordis 加 `tool-cordis` + 定制 skill 目录 + `present`）。不要把它们的行算进 `ptc`。
- [surface.tools.run-code](../tools/run-code.md) — 模型在 `mode: ptc` 下看见的运输工具 `run_code`。
- [subsys.core.code-mode](../../subsystems/core/code-mode.md) — PTC SDK 生成、子调度与 `ctx.ptcRuntime`。本页不展开 `packages/core/tools/src/ptc.ts`。
- [spine.trace-code-mode](../../spine/trace-code-mode.md) — 一次 PTC turn 的端到端走读。
- [spine.composition-boot](../../spine/composition-boot.md) — profile → bundle → preset 叠层；五个 CLI profile 里只有 web insert roster。
- [surface.profiles.web](../profiles/web.md) — host 面 disable base 工具行、insert `agent-preset-registry` `default: standard`。
- [surface.profiles.headless](../profiles/headless.md) — 无 preset roster；host 工具 + 可选 `DSH_TOOLS_MODE`。

## Sources

- `packages/bundle/web-app/presets/ptc.patch.yml`
- `packages/bundle/web-app/presets/standard.patch.yml`
- `packages/bundle/web-app/package.json`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/core/agent-tool-presentation/src/index.ts`
- `packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts`
- `packages/preset/agent-preset/src/index.ts`
- `packages/preset/agent-preset-registry/src/index.ts`
- `packages/preset/agent-preset-registry/src/mount.ts`
- `packages/preset/agent-preset-registry/src/display.ts`
- `packages/preset/persona/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/core/tools/src/ptc.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/api/session-controller/src/agent.ts`
- `packages/deliverables/tool-present/src/index.ts`
- `packages/client/ui-agent-preset/src/client/locales.ts`
- `apps/cli/tests/web-agent-presets.e2e.ts`
- `packages/boot/app-boot/src/profile.ts`

## 相关

- [surface.presets.overview](overview.md)
- [ref.presets](../../reference/presets.md)
- [surface.presets.standard](standard.md)
- [surface.presets.minimal](minimal.md)
- [surface.presets.cordis](cordis.md)
- [surface.tools.run-code](../tools/run-code.md)
- [subsys.core.code-mode](../../subsystems/core/code-mode.md)
- [spine.trace-code-mode](../../spine/trace-code-mode.md)
- [spine.composition-boot](../../spine/composition-boot.md)
- [surface.profiles.web](../profiles/web.md)
- [surface.profiles.headless](../profiles/headless.md)
