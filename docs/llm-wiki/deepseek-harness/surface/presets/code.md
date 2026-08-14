---
id: surface.presets.code
title: code preset (PTC)
kind: surface
tier: T1
pkg: composition
source:
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/code/preset.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/preset.ts
  - packages/core/tools/src/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/src/profile-boot.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - apply
  - Config
  - leakedServices
  - COMPOSITION_FILE
  - METADATA_FILE
  - PRESET_ID
related:
  - surface.presets.overview
  - ref.presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `code`（picker 显示名 **PTC 模式**）是 shipped **agent-preset 面** composition：成员资格只认 `apps/cli/config/agent-presets/code/agent.cordis.yml`；相对 `standard` 的唯一可加载增量是末尾 `tool-presentation`（`@deepseek-ai/dsh-agent-tool-presentation`，`mode: code`），把本会话模型看见的工具投影成 `run_code` + 生成 SDK，而不是从 yml 删掉 native 工具行。

## 能回答的问题

- `code` / PTC 的 preset id、显示名、`order` 分别写在哪？`preset.yml` 算不算成员资格？
- 相对 `standard`，可加载行（`id` / `name` / `config` / `disabled` / `isolate`）到底差哪一行？注释算不算差异？
- Code Mode 是不是把 `tool-bash` / `tool-fs` 从 composition 拿掉？模型请求里还剩哪些 schema？
- `planning` / `compaction` / `delegation` 各自 `isolate` 哪些服务？漏到 root realm 会怎样？
- web 默认会不会选中 `code`？headless 会不会挂这个 shipped preset？host 面缺 `codeRuntime` 时 mount 如何失败？

## 是什么

DSH 的主线是 **profile → bundle → agent preset**，不是「又一个 coding agent」。`code` 是四个 shipped preset 之一：目录名就是 id（`PRESET_ID = /^[a-z0-9][a-z0-9-]*$/`）[E: packages/preset/agent-presets/src/preset.ts:18]，发现时读该目录下必有的 `COMPOSITION_FILE = 'agent.cordis.yml'` [E: packages/preset/agent-presets/src/discovery.ts:26]，可选旁边的 `METADATA_FILE = 'preset.yml'` 只提供 picker 文案 [E: packages/preset/agent-presets/src/metadata.ts:25]。

**agent-preset 面**（本文件）：standing mount 上的 persona、model-facing 工具行、以及带 `isolate` 的 per-preset 服务组；agent 通过 `bindScopeParent` join。web 的 `composeAgent` 把 `presets.mount(agentCtx, resolvedId)` 放进 factory `setup` [E: packages/host/apiproxy/src/api-proxy.ts:1245]。

**host 面**（本 preset 不拥有）：`tools` / `skills` / `tasks` / `goals` / `subagents` 等 registry、sandbox 与 approval、persistence、model route，以及 TypeScript `codeRuntime`。web bundle 在 host 上 `insert` `@deepseek-ai/dsh-code-runtime-worker-thread` [E: packages/bundle/web-app/cordis.patch.yml:49]，并把 base 上的模型可见工具行 `disabled: true`（例如 `tool-bash`）[E: packages/bundle/web-app/cordis.patch.yml:294]，改由每会话 preset 再挂。headless **没有** `agent-presets` 行，只在 host 上同样 insert `code-runtime` [E: packages/bundle/headless/cordis.patch.yml:25]。

Code Mode 的含义是 **presentation**，不是另一套成员表：`ctx.tools.presentAs('code')` 让装配给模型的 schema 只剩 `run_code` [E: packages/core/tools/src/index.ts:994]，native 工具仍在 composition 里注册，供 SDK 子调度调用。这满足 **model-visible ⟺ logged**：模型本轮看见的名字是 `run_code`，子调用仍按工具管线记账。

## 入口

用户 / 进程碰到 `code` 的路径：

1. **磁盘位置**：`apps/cli/config/agent-presets/code/`（与 `minimal` / `standard` / `cordis` 并列）。id 来自目录名 `code`，不是 `preset.yml` 的 `name` [E: packages/preset/agent-presets/src/discovery.ts:160]。
2. **web profile 挂 roster**：`packages/bundle/web-app/cordis.patch.yml` insert `agent-presets`，`default: standard`（不是 `code`）[E: packages/bundle/web-app/cordis.patch.yml:424]。CLI `composeProfile` 若树里已有 `agent-presets` 行，再 overlay shipped root `apps/cli/config/agent-presets/`，`trust: 'system'` [E: apps/cli/src/profile-boot.ts:164]。
3. **选中本 preset**：会话创建或 blank 期 recompose 时把 preset id 设为 `code`。picker 显示 `preset.yml` 的 `name: PTC 模式` [E: apps/cli/config/agent-presets/code/preset.yml:1]。web 默认仍是 `standard`；要跑 PTC 必须显式选 `code` 或把 settings `agent-presets.default` 改成 `code`。
4. **headless 不走这条入口**：`packages/bundle/headless/cordis.patch.yml` 无 `agent-presets` 行。headless 的模型可见工具来自 `dsh-base` host 行；进程级 Code Mode 只可能来自 host `tools.mode: !!js process.env.DSH_TOOLS_MODE` [E: packages/bundle/headless/cordis.patch.yml:20]，与本 shipped preset 无关。
5. **不要把 `DSH_TOOLS_MODE` 当成「选了 code preset」**：web 的 host `tools` 行同样吃该环境变量 [E: packages/bundle/web-app/cordis.patch.yml:41]，那是 **进程级 defaultMode**。`code` preset 用 agent-plane `tool-presentation` 在 standing scope 上 `presentAs('code')`，与 host 默认正交。

## 关键字段

### 显示元数据（`preset.yml`，不是成员资格）

| 键 | 值 | 作用 |
|---|---|---|
| `name` | `PTC 模式` | picker 显示名；缺省回退到 id `code` [E: apps/cli/config/agent-presets/code/preset.yml:1] |
| `description` | `具备标准模式的全部能力，并通过 Code Mode SDK 呈现工具，让模型用一个 TypeScript 程序组合多步操作。` | 一句话说明 [E: apps/cli/config/agent-presets/code/preset.yml:2] |
| `order` | `2` | 有 `order` 的 preset 按数值升序；`standard` 是 `1`，本 preset 排第二 [E: apps/cli/config/agent-presets/code/preset.yml:3] |

`readPresetMetadata` 读不到或 YAML 坏掉时返回 `{}`，composition 仍可 mount [E: packages/preset/agent-presets/src/metadata.ts:63]。

### 相对 `standard` 的可加载差异

逐 `id` 对照 `apps/cli/config/agent-presets/standard/agent.cordis.yml` 与 `apps/cli/config/agent-presets/code/agent.cordis.yml`：

- **唯一可加载增量**：`code` 在 `tool-web` 之后多出 `id: tool-presentation` / `name: '@deepseek-ai/dsh-agent-tool-presentation'` / `config.mode: code` [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259]。`standard` 以 `tool-web` 收束（`fetch: false`，`searchTimeoutMs: 60000`），没有 `tool-presentation` 行 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247]。
- **其余可加载字段相同**：`persona` 英文句、`agent-instructions.maxBytes`、平台 `disabled` 的 `tool-bash`/`tool-pwsh`、`tool-fs-search.sampleOverCapGlobResults`、`planning`/`compaction`/`delegation` 的 `isolate` 键、`tool-subagent*` 的 `provider`/`toolName`/`backgroundMode`、两条 product provider 的 `disabled: true`、`tool-todo.allowParallelInProgress`、`tool-web.fetch` 均同值。`tool-subagent-fork` 两边都是 `backgroundMode: continuable` [E: apps/cli/config/agent-presets/code/agent.cordis.yml:199]；这与 host `dsh-base` 里同一 id 的 `backgroundMode: one-shot` 不同 [E: packages/bundle/base/cordis.patch.yml:329]。
- **注释不同，不是成员资格**：`code` 文件头与 isolate 说明、以及末尾 presentation 段是 YAML `#` 注释；`standard` 另有一段关于 host 面 `tool-subagent-report` 的注释，`code` 未抄那段。注释不能当成员，也不能当 `[E]`。
- **本文件没有**（完整成员表即反证）：`tool-str-replace-editor`、`tool-bash-persistent` / `persistent-shell`、`tool-cordis`、`skill-filesystem.customSkillDirs`。这些出现在 `minimal` 或 `cordis` 的 `agent.cordis.yml`，不在 `code` 里。

### 成员表（yml 每一个 `id:`，含 group 子行）

「相对 standard」列：`同` = 与 `standard/agent.cordis.yml` 同 `name` / `config` / `disabled` / `isolate`。

| `id` | `name` | isolate / 门控 | 关键 config | 相对 standard | yml |
|---|---|---|---|---|---|
| `persona` | `@deepseek-ai/dsh-persona` | 无（只投 prompt） | `text`: `You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:31] |
| `agent-instructions` | `@deepseek-ai/dsh-agent-instructions` | 无 | `maxBytes: 65536` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:40] |
| `tool-bash` | `@deepseek-ai/dsh-tool-bash` | 无 | `disabled: !!js process.platform === 'win32'` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:51] |
| `tool-pwsh` | `@deepseek-ai/dsh-tool-pwsh` | 无 | `disabled: !!js process.platform !== 'win32'` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:55] |
| `tool-fs` | `@deepseek-ai/dsh-tool-fs` | 无 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:63] |
| `tool-fs-search` | `@deepseek-ai/dsh-tool-fs-search` | 无 | `sampleOverCapGlobResults: false` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:66] |
| `tool-jobs` | `@deepseek-ai/dsh-tool-jobs` | 无 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:80] |
| `skill-filesystem` | `@deepseek-ai/dsh-skill-filesystem` | 无 | 无 `customSkillDirs` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:90] |
| `tool-skill` | `@deepseek-ai/dsh-tool-skill` | 无 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:93] |
| `tool-goal` | `@deepseek-ai/dsh-tool-goal` | 无 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:104] |
| `planning` | `cordis:group` | `isolate.planMode: true` | `group: true` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:115] |
| `plan-mode` | `@deepseek-ai/dsh-plan-mode` | 落在 `planning` 组内 | 长 `section:`（plan mode 规则，与 standard 同文） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:117] |
| `compaction` | `cordis:group` | `isolate.compaction: true` 与 `toolResultPruner: true` | `group: true` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:148] |
| `compaction-basic` | `@deepseek-ai/dsh-compaction-basic` | 组内 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:151] |
| `command-compact` | `@deepseek-ai/dsh-command-compact` | 组内 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:154] |
| `tool-result-pruner` | `@deepseek-ai/dsh-compaction-tool-result-pruner` | 组内 | `thresholdChars: 8192`，`headChars: 4096`，`tailChars: 1024` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:157] |
| `delegation` | `cordis:group` | `isolate.workflowEngine: true` | `group: true` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:179] |
| `tool-subagent-control` | `@deepseek-ai/dsh-tool-subagent-control` | 组内 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:181] |
| `tool-subagent-list-agents` | `@deepseek-ai/dsh-tool-subagent-control/list-agents` | 组内 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:184] |
| `tool-subagent` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `provider: spawn`，`toolName: subagent`，`backgroundMode: continuable` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:187] |
| `tool-subagent-fork` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `provider: fork`，`toolName: subagent_fork`，`backgroundMode: continuable` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:194] |
| `tool-subagent-codex` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `disabled: true`；`provider: codex`，`toolName: subagent_codex`，`enableRunInBackground: false`，`maxDepth: provider-managed` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:206] |
| `tool-subagent-claude-code` | `@deepseek-ai/dsh-tool-subagent` | 组内 | `disabled: true`；`provider: claude-code`，`toolName: subagent_claude_code`，`enableRunInBackground: false`，`maxDepth: provider-managed` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:215] |
| `workflow-worker-thread` | `@deepseek-ai/dsh-workflow-worker-thread` | 组内 | `provider: spawn` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:222] |
| `tool-workflow` | `@deepseek-ai/dsh-tool-workflow` | 组内 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:227] |
| `tool-ralph` | `@deepseek-ai/dsh-tool-ralph` | 组内 | `subagentProvider: spawn`，`maxRounds: 64` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:230] |
| `tool-ask-user` | `@deepseek-ai/dsh-tool-ask-user` | 无 | （无 config） | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:238] |
| `tool-todo` | `@deepseek-ai/dsh-tool-todo` | 无 | `allowParallelInProgress: true` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:241] |
| `tool-web` | `@deepseek-ai/dsh-tool-web` | 无 | `fetch: false`，`searchTimeoutMs: 60000` | 同 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:248] |
| `tool-presentation` | `@deepseek-ai/dsh-agent-tool-presentation` | 无 | **`mode: code`（必填，无默认）** | **本 preset 独有** | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] |

### `tool-presentation` / `mode: code`

插件导出 `name = 'tool-presentation'` [E: packages/core/agent-tool-presentation/src/index.ts:28]。静态 `inject` 只有 `['tools']`，不把 `codeRuntime` 写成硬依赖，这样 `mode: 'native'` 才能在没有 runtime 的部署上 mount [E: packages/core/agent-tool-presentation/src/index.ts:35]。`Config.mode` 是 `'native' | 'code' | 'both'` 且 `.required()`：省略值会让这一行等于白挂 [E: packages/core/agent-tool-presentation/src/index.ts:51]。

`apply(ctx, config)`：`native` 立刻 `ctx.tools.presentAs('native')`；`code` / `both` 则 `ctx.inject(['codeRuntime'], …)` 再 `presentAs(config.mode)` [E: packages/core/agent-tool-presentation/src/index.ts:69]。`presentAs` 要求 scoped context（preset 的 standing scope），禁止当成进程全局开关 [E: packages/core/tools/src/index.ts:949]。

装配结果：插件单测里 `mode: 'code'` 的 agent 只看见 `run_code` [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:74]。shipped yml 的 e2e 用 `mount(agentCtx, 'code')` 得到 `assembly.tools === ['run_code']` [E: apps/cli/tests/web-agent-presets.e2e.ts:301]；同进程 `standard` 会话仍看见 `bash`、没有 `run_code` [E: apps/cli/tests/web-agent-presets.e2e.ts:310]。`mode === 'code'` 时 `wireSchemas` 把可见 schema 滤成 `schema.name === RUN_CODE_NAME`（`run_code`）[E: packages/core/tools/src/index.ts:996]。

## 装配与门控

1. **发现**：`discoverPresets` 按 `roots` 先到先得扫描子目录；目录名过 `PRESET_ID` 且存在 `agent.cordis.yml` 才是 roster 行。`code` 作为 shipped 目录出现在 CLI 写入的 `trust: 'system'` root。
2. **standing mount 一次**：`ensureStanding` 用 `{ agentPreset: preset.id }` 建 scope key [E: packages/preset/agent-presets/src/index.ts:514]，再 `mountPreset` [E: packages/preset/agent-presets/src/index.ts:524]。`AgentPresets.mount` 用 `bindScopeParent(agentKey, standing.key)` 把 agent join 上去 [E: packages/preset/agent-presets/src/index.ts:286]。
3. **服务泄漏门**：`leakedServices` 列出挂进 **root realm** 的服务名；非空则 `PresetMountError`，要求服务行放进 `isolate` 或挪到 host [E: packages/preset/agent-presets/src/mount.ts:365]。本 preset 三个 isolate 组覆盖 `planMode` / `compaction`+`toolResultPruner` / `workflowEngine`。只往 host `tools` 注册的行（含 `tool-presentation`）不 `provide`，不需要 realm。
4. **未激活行门**：`inactiveRows` 把仍 `fiber.inject` 缺服务的 enabled 行报成 `id (name): waiting for …` [E: packages/preset/agent-presets/src/mount.ts:297]。host 若没 compose `codeRuntime`，`tool-presentation` 的动态 `inject(['codeRuntime'])` 会停在 pending；单测断言此时 `row.ctx.get('codeRuntime')` 为 `undefined` [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:109]。web 与 headless 都 insert 了 worker-thread runtime，因此在默认 web 部署上再选 id `code` 时这一行能激活。
5. **平台门**：`tool-bash` 在 `win32` disable，`tool-pwsh` 在非 `win32` disable [E: apps/cli/config/agent-presets/code/agent.cordis.yml:53]。
6. **产品 provider 门**：`tool-subagent-codex` / `tool-subagent-claude-code` 在 shipped 文件里 `disabled: true` [E: apps/cli/config/agent-presets/code/agent.cordis.yml:206]。要暴露须先 `AgentPresets.copy` 出 user preset，再改副本里的 `disabled`。
7. **失败回滚**：`mountPreset` catch 后 `handle.dispose()`，再抛 `PresetMountError`；`ensureStanding` 同时 `scope.dispose()` 并删掉 standing promise，下次会话会重试。
8. **与 host `DSH_TOOLS_MODE` 的关系**：环境变量改的是 host `tools` 行的进程级 `mode`。本 preset 的 `presentAs('code')` 盖在 standing scope 上，native 会话可以同进程并存。不要把「设了 `DSH_TOOLS_MODE=code`」写成「正在跑 shipped `code` preset」。

## 跨包关系

- [surface.presets.overview](overview.md) — roster 发现、`mount` / `recompose`、`defaultId`、session header 与 `agent-preset/selected`。本页只写 `code` 这一份 composition。
- [ref.presets](../../reference/presets.md) — 四个 shipped preset 对照表；本页是 `code` 的权威成员清单。
- [surface.presets.standard](standard.md) — 对照对象：除 `tool-presentation` 外可加载行与本页相同。
- [surface.presets.minimal](minimal.md) / [surface.presets.cordis](cordis.md) — 另外两份 shipped 成员表（persistent bash + `str_replace_editor`；`tool-cordis` + 定制 skill 目录）。不要把它们的行算进 `code`。
- [surface.tools.run-code](../tools/run-code.md) — 模型在 `mode: code` 下看见的运输工具 `run_code`。
- [subsys.core.code-mode](../../subsystems/core/code-mode.md) — SDK 生成、子调度与 runtime 语言。本页不展开 `packages/core/tools/src/code-mode.ts`。
- [spine.trace-code-mode](../../spine/trace-code-mode.md) — 一次 Code Mode turn 的端到端走读。
- [spine.composition-boot](../../spine/composition-boot.md) — profile → bundle → preset 叠层；web 才 insert roster。
- [surface.profiles.web](../profiles/web.md) — host 面 disable base 工具行、insert `agent-presets` `default: standard`、insert `code-runtime`。
- [surface.profiles.headless](../profiles/headless.md) — 无 preset roster；host 工具 + 可选 `DSH_TOOLS_MODE`。

## Sources

- `apps/cli/config/agent-presets/code/agent.cordis.yml`
- `apps/cli/config/agent-presets/code/preset.yml`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `packages/core/agent-tool-presentation/src/index.ts`
- `packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts`
- `packages/preset/agent-presets/src/discovery.ts`
- `packages/preset/agent-presets/src/metadata.ts`
- `packages/preset/agent-presets/src/mount.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/src/preset.ts`
- `packages/core/tools/src/index.ts`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `apps/cli/src/profile-boot.ts`
- `packages/host/apiproxy/src/api-proxy.ts`
- `apps/cli/tests/web-agent-presets.e2e.ts`

## 相关

- [surface.presets.overview](overview.md)
- [ref.presets](../../reference/presets.md)
