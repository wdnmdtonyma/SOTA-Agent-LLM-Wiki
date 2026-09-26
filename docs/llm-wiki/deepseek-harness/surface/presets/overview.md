---
id: surface.presets.overview
title: agent preset 总览
kind: surface
tier: T1
pkg: composition
source:
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/definition.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/preset.ts
  - packages/preset/agent-preset-registry/src/session.ts
  - packages/preset/agent-preset-registry/src/display.ts
  - packages/preset/agent-preset-registry/src/invariant.ts
  - packages/preset/agent-preset-registry/package.json
  - packages/preset/agent-preset-registry/tests/registry.spec.ts
  - packages/preset/agent-preset-registry/tests/session.spec.ts
  - packages/preset/agent-preset-registry/tests/mount.spec.ts
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/boot/config-editor/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/client/ui-agent-preset/src/client/locales.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/args.ts
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/api/session-controller/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/core/session/src/types.ts
  - packages/extensions/tool-cordis/src/index.ts
  - packages/boot/plugin-manager/src/tools.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - AgentPreset
  - AgentPresetRegistry
  - PresetDefinition
  - mountPreset
  - agentPresetProjectionDefinition
related:
  - ref.presets
  - spine.composition-boot
evidence: explicit
status: verified
updated: 477b4f4205
---

> **agent preset** 是 DSH 组合链 `profile → bundle → preset` 的 **Agent 面**一层：普通 Cordis YAML 里一行 `@deepseek-ai/dsh-agent-preset`（`config.id` + `plugins[]`），由 `@deepseek-ai/dsh-agent-preset-registry` 登记、eager 激活、并把 Agent 用 `bindScopeParent` join 上去。preset 决定这个 Agent 看见的 tools / persona / isolate；webserver、persistence、sandbox、subagent backends 留在 **host 面**。四个 shipped 声明是 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`（旧名 `code` 即 PTC；wiki id `surface.presets.code` 仍是稳定别名）。成员资格只认这些文件的 `plugins[]`（含 `disabled:`），不认仓库里有没有对应 package。四个 shipped **只叠在 `dsh-web-app`**。模型看见的 preset 必须写进 session log（`model-visible ⟺ logged`）；冷读走 projection `agentPreset`。

## 能回答的问题

- 一行怎样才算 preset？行 id 和 `config.id` 谁进会话？YAML 里的 `name` / `order` 能不能让一个包进入默认产品？
- `dsh --profile web` 的 roster 从哪来？谁把四个 shipped 声明叠进 web 组合？headless / sdk / acp / sdk-minimal 为什么没有 shipped roster？
- `AgentPresetRegistry.defaultId` 读 Settings 还是 Config？web 的工程默认为什么是 `standard`？
- `mount` / `composeFrom` / `recompose` 各在什么窗口调用？服务行漏到 root realm 会怎样？
- 会话 header 的 `agentPreset` 和 `agent-preset/selected` 谁赢？resume / fork / 列表标签该读哪条？
- 用户能从缝里塞 composition 文本吗？覆盖 shipped 声明写到哪一层？

## 是什么

DSH 不是「又一个 coding agent」。进程先把 **host 面** settle（五个 shipped CLI profile：`web` / `headless` / `sdk` / `sdk-minimal` / `acp`）。第一个非旗标 token（`plugin` 除外）展开成 `--profile`，所以 `dsh web` 与 `dsh --profile web` 同一条路径。[E: packages/boot/app-boot/src/profile.ts:179] [E: apps/cli/src/args.ts:201] `PROFILE_TEMPLATES` **没有** `desktop`：Electron 壳独占 `$DSH_HOME/profiles/desktop`，`dsh --profile desktop` 被 `rejectElectronProfile` 拒绝。[E: apps/cli/src/args.ts:83] [E: apps/cli/src/args.ts:182] web 默认装 Web GUI（webserver / persistence / sandbox / subagent backends / jobs·goals·skills **registry** / token-meter / `ptc-runtime`），再在 Agent factory 的 `setup` 里把 **agent-preset 面**（tools / persona / isolate）join 到这个会话。capability seam 仍是 Definition / Provider / Consumer：preset 换走的是模型可见的 Consumer 行；host 上的 Provider 与 registry 不被 preset 复制一份。本仓没有 shipped TUI 包；help 例子里的 `tui` 只是自定义 profile 名，不在 `PROFILE_TEMPLATES`。[E: apps/cli/src/args.ts:96]

一个 preset = 组合树里一行 `@deepseek-ai/dsh-agent-preset`：

- Loader 行 id（shipped 为 `preset-standard` 等）是用户 patch / `ConfigEditor` 的寻址键。[E: packages/bundle/web-app/presets/standard.patch.yml:5]
- `config.id` 是 roster 身份，也是会话 header / `select` 记下的值；必填。[E: packages/preset/agent-preset/src/index.ts:17]
- `config.plugins` 必填，必须是带 `name` 的 plugin 行列表（`group: true` 则递归）。结构坏了会在 `register` 时标 `broken`。[E: packages/preset/agent-preset/src/index.ts:22] [E: packages/preset/agent-preset-registry/src/definition.ts:18]
- 可选 `name` / `description` / `order`。四个 shipped **不写** `name` / `description`，picker 走 locale 键；写了 `name` 的声明按用户文案显示、不翻译。[E: packages/preset/agent-preset-registry/src/display.ts:53]

YAML 显示字段 **不是**成员资格。某工具在不在默认产品里，只看那四个 shipped `plugins[]` 的行（含 `disabled:`）。仓库 dependencies 里有这个包，不构成「产品装着它」。

`@deepseek-ai/dsh-agent-preset-registry` 导出 `AgentPresetRegistry` 服务（`ctx.agentPresets`）。登记是 eager 的：声明行 `init` 时 `register` + `activate`。进程运行中用 profile patch 覆盖某行 `config` 会卸掉旧 generation、再激活新的；已 join 的 Agent 继续咬住旧修订直到释放。[E: packages/preset/agent-preset/src/index.ts:27] [E: packages/preset/agent-preset-registry/src/index.ts:80]

## 入口

用户或进程碰到 roster 的路径：

1. **web profile（默认产品 GUI）**。`packages/bundle/web-app/cordis.patch.yml` 把 base 上的模型可见工具行 `disabled: true`（例如 `tool-bash`），再 `insert` `id: agent-preset-registry`、`name: '@deepseek-ai/dsh-agent-preset-registry'`、`config.default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:447] [E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/cordis.patch.yml:562]
2. **四个 shipped 声明只叠在 `dsh-web-app`。** `package.json` `dsh.bundle.patch` = `cordis.patch.yml` + `presets/{standard,ptc,minimal,cordis}.patch.yml`。[E: packages/bundle/web-app/package.json:43] 没有 `packages/preset/agent-presets/presets/` 目录，也没有 launcher `roots` overlay。
3. **headless / sdk / acp / sdk-minimal 不挂 roster。** headless insert 只有 `headless-startup` / `headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:21] sdk overlay 是 `sdk-app-startup` + `sdk-jsonrpc-server`。[E: packages/bundle/sdk-app/cordis.patch.yml:13] acp overlay 是 `acp-app-startup` + `acp`。[E: packages/bundle/acp-app/cordis.patch.yml:13] sdk-minimal 模板 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`（不叠 `dsh-base`）。[E: packages/boot/app-boot/src/profile.ts:193] 这些 profile 的 `dsh.bundle.patch` **不含** `presets/*.patch.yml`。
4. **Web 会话（Session Controller）**。`composeAgent` 在 `ctx.get('agentPresets')` 存在时 `presets.resolve`，把 id 写入 create `meta.agentPreset`；真正的 `presets.mount(agentCtx, resolvedId)` 发生在 factory `setup`。无 roster 时只 `installSelection`。[E: packages/api/session-controller/src/agent.ts:385] [E: packages/api/session-controller/src/agent.ts:394]
5. **子代理**。`applyChildComposition` 调 `agentPresets.composeFrom(childCtx, parent.ctx)`，join 父进程已经 retain 的那一代，不按 id 重 resolve。[E: packages/subagent/subagent/src/child-agent.ts:205]
6. **dump 能看见声明行，按 bundle 层而不是按文件。** `runDumpConfig` 把 web-app 五份 patch 拼进同一 `label: @deepseek-ai/dsh-web-app` 层；不求值 `!!js`，也不含 telemetry hard-disable。[E: apps/cli/src/dump-config.ts:56]

## 关键字段

### `AgentPresetRegistry.Config` 与登记

| 字段 | 类型 / 默认 | 含义 |
|---|---|---|
| `default` | `string`，required | 调用方不指名时 mount 的 id。缺省在 mount 时 fail loud（`agent-preset/not-found`）。[E: packages/preset/agent-preset-registry/src/index.ts:54] |
| `selectedDefault` | `Volatile<string \| undefined>` | Settings 热更新覆盖。`defaultId` = `selectedDefault.get() ?? config.default`。改默认只影响**之后**创建的会话。已退役的 `modeSelectionEnabled` 不被读取。[E: packages/preset/agent-preset-registry/src/index.ts:74] [E: packages/preset/agent-preset-registry/tests/registry.spec.ts:229] |

`list()` 读当前 map：含 broken 行；按 `order` 再按 id 排序。[E: packages/preset/agent-preset-registry/src/index.ts:153] web e2e 钉死四个 id 是 `cordis` / `minimal` / `ptc` / `standard`，且 `defaultId === 'standard'`，roster 行没有 `path`。[E: apps/cli/tests/web-agent-presets.e2e.ts:248]

### 四个 shipped preset

成员资格 = 下列 patch 文件里声明行的 `plugins[]`。显示名不在 YAML 里。细节（逐 plugin `id:`）在四张分页。wiki 节点 `surface.presets.code` 覆盖 **PTC**（文件 `ptc.patch.yml`），id 不改。四个 shipped **都不挂** `str_replace_editor`。wire `present`（包 `@deepseek-ai/dsh-tool-present`）挂在 `standard` / `ptc` / `cordis`，不在 `minimal`。`load_workspace_dependencies` 由 sdk-app 挂，web preset 默认不挂。

| roster id | 行 id | locale `name`（zh） | `order` | 组合差异（一句话） |
|---|---|---|---|---|
| `standard` | `preset-standard` | 标准模式 [E: packages/client/ui-agent-preset/src/client/locales.ts:87] | 1 [E: packages/bundle/web-app/presets/standard.patch.yml:9] | web 工程默认。完整编码面：`persona` `prefix`/`suffix` / `agent-instructions` / 平台互斥 one-shot shell / `tool-fs` / skills / goals / `planning`+`compaction`+`delegation` isolate / 启用的 `workflow-ptc` + `tool-workflow` / `tool-ralph` `disabled: true` / `present` / `plugin_manager` `disabled: true`。`tool-subagent-codex` / `tool-subagent-claude-code` 行在但 `disabled: true`。无 persistent shell、无 `tool-cordis`、无 `tool-presentation`。[E: packages/bundle/web-app/presets/standard.patch.yml:119] [E: packages/bundle/web-app/presets/standard.patch.yml:127] [E: packages/bundle/web-app/presets/standard.patch.yml:144] |
| `ptc` | `preset-ptc` | PTC 模式 [E: packages/client/ui-agent-preset/src/client/locales.ts:89] | 2 [E: packages/bundle/web-app/presets/ptc.patch.yml:9] | 相对 `standard`：末尾 `tool-presentation` `mode: ptc`；**`workflow-ptc` / `tool-workflow` / `tool-ralph` 均为 `disabled: true`**。同样挂 `present` 与 disabled 的 `plugin_manager`。模型面对 `run_code` + TypeScript/Python SDK（权威 `packages/core/tools/src/ptc.ts`）。[E: packages/bundle/web-app/presets/ptc.patch.yml:121] [E: packages/bundle/web-app/presets/ptc.patch.yml:144] |
| `minimal` | `preset-minimal` | 极简模式 [E: packages/client/ui-agent-preset/src/client/locales.ts:91] | 3 [E: packages/bundle/web-app/presets/minimal.patch.yml:9] | `persona` `prefix` + `complete: true`、`includeRuntimeContext: false`；只挂 `persistent-shell` isolate `terminals`（平台互斥 persistent bash·pwsh）。没有 filesystem / compaction / skill / subagent / web / plan / todo / jobs / `present`。[E: packages/bundle/web-app/presets/minimal.patch.yml:14] [E: packages/bundle/web-app/presets/minimal.patch.yml:17] |
| `cordis` | `preset-cordis` | 创造模式 [E: packages/client/ui-agent-preset/src/client/locales.ts:93] | 4 [E: packages/bundle/web-app/presets/cordis.patch.yml:9] | `standard` 同类工具 + `tool-cordis` + `skill-filesystem.customSkillDirs` 指向 `@deepseek-ai/dsh-agent-preset` 包内 `skills/`。persona 与 `standard` 同文（e2e 钉死装配相等）。`plugin_manager` 仅当 `ctx.get('profileContext')` 为真才启用（`disabled: !!js "!ctx.get('profileContext')"`）。当前可执行登记名是 `cordis_inspect_list` / `cordis_inspect_query` 与（web 上）`plugin_manager`；没有 `cordis_define` / `cordis_run` / `cordis_mount`。[E: packages/bundle/web-app/presets/cordis.patch.yml:141] [E: packages/bundle/web-app/presets/cordis.patch.yml:152] [E: packages/extensions/tool-cordis/src/index.ts:23] [E: apps/cli/tests/web-agent-presets.e2e.ts:365] |

### 会话记录

| 位置 | 写什么 | 读法 |
|---|---|---|
| `SessionHeader.agentPreset` | 创建时 snapshot。`composeAgent` 在 async `setup` 开始前就 resolve，所以 header 能拿到这个 id。[E: packages/core/session/src/types.ts:130] | 没有后续 selection 时的初值 |
| `agent-preset/selected` 事件 | `{ agentPreset: string }`。空白窗口 `select` 在 `recompose` 成功后 `session.append`。[E: packages/preset/agent-preset-registry/src/session.ts:28] [E: packages/preset/agent-preset-registry/src/index.ts:326] | projection `apply` 覆盖 state |
| `agentPresetProjectionDefinition` | key `'agentPreset'`：`init` = `header.agentPreset ?? null`；遇到 `agent-preset/selected` 用 payload 替换。resume / fork / 列表必须走 `sessionProjections.stateOf(..., 'agentPreset')`（Session Controller：`presetForSession` / `presetForObservation`），禁止只信 header。[E: packages/preset/agent-preset-registry/src/session.ts:36] [E: packages/api/session-controller/src/agent.ts:360] | 冷读 / 重建的权威入口 |

## 装配与门控

**何时 init。** host 组合里必须先有 `agent-preset-registry` 行（web 的 insert）以及至少一个声明行。没有这行（headless / sdk / acp / sdk-minimal 默认）时 `ctx.get('agentPresets') === undefined`，`composeAgent` 只装 model selection，每个会话共享 host 全局工具层。[E: packages/api/session-controller/src/agent.ts:386]

**standing generation，不是每会话一棵树。** `AgentPresetRegistry.mount(ctx, id?)` 要求 scoped context。它 `retain`（unknown → `agent-preset/not-found`；`broken` → `agent-preset/invalid`），再 `bindScopeParent`。同一 generation 的多个 Agent 共享一份插件实例。声明被替换时旧 generation `retired`，`users === 0` 才 `dispose`。[E: packages/preset/agent-preset-registry/src/index.ts:257] [E: packages/preset/agent-preset-registry/src/index.ts:144]

**必须在 factory `setup` 里 mount。** `setup` 在 Agent / Session 发布之前 await；拒绝则整次 `create` 回滚，不会留下半装好的会话。[E: packages/core/agent-loop/src/index.ts:774] [E: packages/core/agent-loop/src/index.ts:796]

**isolate 门。** `mountPreset` 拒绝 unscoped context；树 settle 后跑 `auditRows`（failed 行拒）与 `leakedServices`（子树把实现写进 **root realm**）。泄漏抛 `Preset services require isolate realms: …`。等待 host 服务的 pending 行留在树上，registry 每次 `diagnostic` 先 `loader.await()` 再重审。[E: packages/preset/agent-preset-registry/src/mount.ts:259] [E: packages/preset/agent-preset-registry/src/mount.ts:267] [E: packages/preset/agent-preset-registry/src/index.ts:136] companion `agent-presets-invariant` 在 `internal/service` 上对每个 live mount 再查一次 `leakedServices`。[E: packages/preset/agent-preset-registry/src/invariant.ts:34]

**`composeFrom`。** 同步、不读 roster、不 mount。父没有 standing mount 时返回 `undefined`（rosterless 部署：孩子已经从 host 全局层看见工具）。子代理必须走这条，避免父启动后有人改了声明导致孩子拿到另一代。[E: packages/preset/agent-preset-registry/src/index.ts:273]

**`recompose`。** 先 retain 新 generation，再 `rebind`。方法自己不读 session 历史；`select` 用 `turnBoundary` 确认空白（`openTurnStartSeq !== null` 或 `lastTurn > 0` → `agent-preset/locked`）。换 preset 只允许空白会话。[E: packages/preset/agent-preset-registry/src/index.ts:306] [E: packages/preset/agent-preset-registry/src/index.ts:322]

**无 roster 的 Agent。** 带 roster 的部署若 Agent 在 `system-prompt/assemble` 时仍未 join，`agent-presets-invariant` 才会 `fail`，并且必须 `return next()`。[E: packages/preset/agent-preset-registry/src/invariant.ts:48] [E: packages/preset/agent-preset-registry/src/invariant.ts:58]

**authoring 门。** registry Remote 只有 `list` / `read` / `select`，不能从缝里塞 composition 文本。[E: packages/preset/agent-preset-registry/src/index.ts:193] 覆盖 shipped 声明 = profile `$DSH_HOME/profiles/<name>/cordis.patch.yml` 里按行 id 整键替换 `config`（含 `plugins`）。`ConfigEditor.edit` 是这条写路径。[E: packages/boot/config-editor/src/index.ts:75] 新 preset 是再 insert 一行 `@deepseek-ai/dsh-agent-preset`（通常经 `plugin_manager` 装 bundle）。[E: packages/boot/plugin-manager/src/tools.ts:20]

**preset 文件只进不出。** `PresetTree.write()` 是空实现。继承 Include 的 `write` 会在行自处置 / 会话结束时把声明截成当前濒死树。[E: packages/preset/agent-preset-registry/src/mount.ts:23]

## 跨包关系

- [spine.composition-boot](../../spine/composition-boot.md) — 空 `cordis.yml` 上 `profile → bundle → user patch` 的叠层；本页展开 web 插入的 registry 行、同 bundle 层四份声明，以及 host 面 / agent-preset 面切开之后的 join。
- [ref.presets](../../reference/presets.md) — preset 元数据与 shipped 对照的 catalog 面；本页是登记 / mount / 会话记录的控制流。
- [surface.profiles.web](../profiles/web.md) — web bundle 插入 registry 并把 base 模型可见工具行 disable；host 仍留 sandbox / approval / registry。
- [surface.profiles.headless](../profiles/headless.md) — 不插 roster；一次任务一个进程，工具走 `dsh-base` 全局层。
- [surface.presets.standard](standard.md) / [surface.presets.code](code.md) / [surface.presets.minimal](minimal.md) / [surface.presets.cordis](cordis.md) — 四个 shipped `plugins[]` 的逐 `id:` 成员表（`code` 页 = PTC / `presets/ptc.patch.yml`）。
- `@deepseek-ai/dsh-api-session-controller` — Web 的 `composeAgent` / 列表 / 创建 meta；header 写入与 projection 冷读。preset Remote `list` / `read` / `select` 仍在 `AgentPresetRegistry` 自己身上。
- `@deepseek-ai/dsh-subagent` — `applyChildComposition` 调 `composeFrom`。
- `@deepseek-ai/dsh-session` — `SessionHeader.agentPreset` 与 `SessionEventMap['agent-preset/selected']`；投影 `agentPresetProjectionDefinition` 是重建入口。
- `@deepseek-ai/dsh-agent` — factory `setup` 是唯一受支持的 mount 调用点：未发布前失败则整次 create 回滚。
- `@deepseek-ai/dsh-scope` — `createScope` + `bindScopeParent` 是 standing generation 与 Agent 之间的唯一 join / re-link。

## Sources

- packages/preset/agent-preset/src/index.ts
- packages/preset/agent-preset-registry/src/index.ts
- packages/preset/agent-preset-registry/src/definition.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/preset/agent-preset-registry/src/preset.ts
- packages/preset/agent-preset-registry/src/session.ts
- packages/preset/agent-preset-registry/src/display.ts
- packages/preset/agent-preset-registry/src/invariant.ts
- packages/preset/agent-preset-registry/package.json
- packages/preset/agent-preset-registry/tests/registry.spec.ts
- packages/preset/agent-preset-registry/tests/session.spec.ts
- packages/preset/agent-preset-registry/tests/mount.spec.ts
- packages/bundle/web-app/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/boot/config-editor/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/client/ui-agent-preset/src/client/locales.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/args.ts
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/api/session-controller/src/agent.ts
- packages/core/agent-loop/src/index.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/core/session/src/types.ts
- packages/extensions/tool-cordis/src/index.ts
- packages/boot/plugin-manager/src/tools.ts
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [ref.presets](../../reference/presets.md) — shipped / 用户 preset 的 catalog 键与对照。
- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 启动叠层与 host / agent-preset 切开。

邻居（不在本节点 `related` 里，但检索会一起问）：

- [surface.presets.standard](standard.md)
- [surface.presets.code](code.md)
- [surface.presets.minimal](minimal.md)
- [surface.presets.cordis](cordis.md)
- [surface.profiles.web](../profiles/web.md)
- [surface.profiles.headless](../profiles/headless.md)
