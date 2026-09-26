---
id: subsys.composition.agent-presets
title: preset 声明与挂载
kind: subsystem
tier: T2
pkg: composition
source:
  - packages/preset/agent-preset/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/definition.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/preset/agent-preset-registry/src/session.ts
  - packages/preset/agent-preset-registry/src/preset.ts
  - packages/preset/agent-preset-registry/src/types.ts
  - packages/preset/agent-preset-registry/src/invariant.ts
  - packages/preset/agent-preset-registry/src/display.ts
  - packages/preset/agent-preset-registry/tests/mount.spec.ts
  - packages/preset/agent-preset-registry/tests/session.spec.ts
  - packages/preset/agent-preset-registry/tests/registry.spec.ts
  - packages/preset/agent-preset-registry/tests/display.spec.ts
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/boot/config-editor/src/index.ts
  - packages/api/session-controller/src/agent.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/core/scope/src/index.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/system-prompt/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - AgentPreset
  - AgentPresetRegistry
  - PresetDefinition
  - mountPreset
  - leakedServices
  - agentPresetProjectionDefinition
  - entryListProblem
related:
  - spine.composition-boot
  - surface.presets.overview
  - surface.presets.code
  - subsys.composition.persona
  - spine.overview
  - spine.session-log
  - subsys.core.scope
  - subsys.core.session
  - subsys.core.agent
  - subsys.composition.bundle-web-app
  - surface.presets.standard
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: 477b4f4205
---

> `@deepseek-ai/dsh-agent-preset` 是普通 Cordis YAML 里的 **声明行**（`id` + `plugins[]`）；`@deepseek-ai/dsh-agent-preset-registry` 是 **roster + revision + bind**：登记定义、eager 激活一份 scoped 组合，Agent 再用 `bindScopeParent` join。这是 **agent-preset 面**（每会话 tools / persona / isolate），不是又一个 coding agent 的固定工具清单。四个 shipped 声明只叠在 `dsh-web-app`。capability seam 仍是 Definition / Provider / Consumer；模型看见的 preset 必须写进 session log（`model-visible ⟺ logged`）。

## 能回答的问题

- 一个 preset 现在怎样声明？行 id `preset-standard` 和 `config.id: standard` 谁是会话记下的身份？谁把 shipped 声明叠进 web 组合？
- 五个 shipped profile（`web` / `headless` / `sdk` / `sdk-minimal` / `acp`）里谁真正 `insert` registry？headless / sdk / acp 的模型可见工具停在哪一层？
- `AgentPresetRegistry.mount` 为什么必须放进 factory `setup`？失败时 `agents.create` 会不会留下半成品会话？
- `leakedServices` 怎样判定「publish 进 root realm」？preset 行要怎样写 `isolate: { …: true }` 才过门？等待 host 服务的行会不会让整份定义 broken？
- 子代理为什么走 `composeFrom` 而不是按 id 再 `resolve`？父启动后有人改了声明，孩子拿到哪一代？
- header 的 `agentPreset` 和 `agent-preset/selected` 谁赢？resume / fork / 列表标签该读 `agentPreset` projection 还是只信 header？
- waterfall `system-prompt/assemble` 上的 invariant companion 为什么必须 `next()`？不调用会停在哪一层？
- registry 为什么没有 composition 写入 Remote？Web 编辑覆盖写到哪一层？

## 职责边界

本包拥有：声明插件 `@deepseek-ai/dsh-agent-preset`（`AgentPreset.register`）、`ctx.agentPresets` 服务（roster / revision / bind）、isolate 审计（`leakedServices` / `auditRows`）、会话记录合同（`agentPresetProjectionDefinition` + `agent-preset/selected`）、以及 shipped 显示文案键（`display.ts`，无 `name` 的内置 id 走 locale）。

本包**不**拥有：

- `profile → bundle` 层序、`composeEntries`、空 `cordis.yml` 根 —— [`subsys.composition.app-boot`](app-boot.md) / [`spine.composition-boot`](../../spine/composition-boot.md)
- `dsh-web-app` 把哪些 host 工具行 `disabled: true`、再 `insert` registry、再叠四份 preset patch —— [`subsys.composition.bundle-web-app`](bundle-web-app.md)
- scope 原语本身（`createScope` / `bindScopeParent` / `ScopedLayers`）—— [`subsys.core.scope`](../core/scope.md)
- Agent 工厂槽、`setup` 回滚出版 —— [`subsys.core.agent`](../core/agent.md)
- append-only log、`deriveMessages()`、header 深冻 —— [`subsys.core.session`](../core/session.md) / [`spine.session-log`](../../spine/session-log.md)
- `deployment:persona` 段语义 —— [`subsys.composition.persona`](persona.md)
- 四个 shipped preset 的完整成员表（逐 `id:` / 工具字段）—— [`surface.presets.overview`](../../surface/presets/overview.md) 与 `surface.presets.{minimal,standard,code,cordis}`（`surface.presets.code` 是 PTC 的稳定别名，声明文件是 `presets/ptc.patch.yml`）
- PTC 传输（`run_code` / `packages/core/tools/src/ptc.ts`）—— [`subsys.core.code-mode`](../core/code-mode.md)
- host 面 webserver / persistence / sandbox / approval / subagent **backends** / jobs·goals·skills **registry** / token-meter / `ptc-runtime`。那些留在进程级 bundle，preset 不复制一份 Provider。

`dsh-headless` **不挂** 本服务：`insert` 只有 `headless-startup` / `headless-runner`。模型可见工具留在 host 全局层。[E: packages/bundle/headless/cordis.patch.yml:21] [E: packages/bundle/headless/cordis.patch.yml:25]

`dsh-sdk-app` overlay 是 `sdk-app-startup` + `sdk-jsonrpc-server`；`dsh-acp-app` overlay 是 `acp-app-startup` + `acp`；`dsh-sdk-minimal` 用自己完整 insert，都没有 `agent-preset-registry` 行，也没有 `presets/*.patch.yml`。[E: packages/bundle/sdk-app/cordis.patch.yml:13] [E: packages/bundle/acp-app/cordis.patch.yml:13] [E: packages/bundle/sdk-minimal/cordis.patch.yml:6]

五个 shipped profile 里，**只有 `web`** 把模型可见工具从 host 挪到 roster 后面。入口不只 `dsh web`：第一个非旗标 token（`plugin` 除外）都会展开成 `--profile`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/preset/agent-preset/src/index.ts` | 声明行：`Config` = `PresetDefinition`；`[Service.init]` 调 `agentPresets.register` |
| `packages/preset/agent-preset-registry/src/index.ts` | `AgentPresetRegistry`：`register` / `list` / `resolve` / `mount` / `composeFrom` / `recompose` / `select` |
| `packages/preset/agent-preset-registry/src/definition.ts` | `PresetDefinition`、`entryListProblem` |
| `packages/preset/agent-preset-registry/src/mount.ts` | `mountPreset`、`leakedServices`、`auditRows`、`PresetTree.write()` 空实现 |
| `packages/preset/agent-preset-registry/src/session.ts` | `SessionEventMap['agent-preset/selected']`、`agentPresetProjectionDefinition` |
| `packages/preset/agent-preset-registry/src/display.ts` | 无 `name` 的 shipped id 走 locale 键；用户声明不翻译 |
| `packages/preset/agent-preset-registry/src/invariant.ts` | 晚泄漏重检；`system-prompt/assemble` 上「有 roster 必须 join」 |
| `packages/bundle/web-app/package.json` | `dsh.bundle.patch` 列表把四份声明叠在 `cordis.patch.yml` 之后 |
| `packages/bundle/web-app/cordis.patch.yml` | `insert` `id: agent-preset-registry`、`default: standard` |
| `packages/bundle/web-app/presets/*.patch.yml` | 四个 shipped 声明（成员资格以 `plugins[]` 为准） |
| `packages/boot/config-editor/src/index.ts` | Web 编辑把完整 `config` 写回 profile `cordis.patch.yml` |
| `packages/api/session-controller/src/agent.ts` | Host：`composeAgent` 里 `resolve` 写 header，`mount` 进 `setup` |
| `packages/subagent/subagent/src/child-agent.ts` | `applyChildComposition` → `composeFrom` |
| `vendor/cordis/src/events.ts` | waterfall：不调用 `next()` 不会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AgentPreset`（声明插件） | `static inject = ['agentPresets']`；`Config`：`id` 必填、`plugins[]` 必填、可选 `name` / `description` / `order`。`[EntryGroup.key] = true` 保留子行 `!!js`。[E: packages/preset/agent-preset/src/index.ts:13] [E: packages/preset/agent-preset/src/index.ts:16] |
| `PresetDefinition` | 与声明 `Config` 同一形状。[E: packages/preset/agent-preset-registry/src/definition.ts:5] |
| `AgentPresetRegistry.Config` | `default` 必填；`selectedDefault` 是 `Volatile<string \| undefined>`（Settings）。[E: packages/preset/agent-preset-registry/src/index.ts:54] [E: packages/preset/agent-preset-registry/src/preset.ts:17] |
| `defaultId` | `selectedDefault.get() ?? config.default`。registry **不**读已退役的 `modeSelectionEnabled`。[E: packages/preset/agent-preset-registry/src/index.ts:74] [E: packages/preset/agent-preset-registry/tests/registry.spec.ts:229] |
| `Generation` | `{ scope, key, mount, users, retired }`。声明更新 / 卸载把上一代标 `retired`；`users === 0` 才 `dispose`。[E: packages/preset/agent-preset-registry/src/index.ts:30] [E: packages/preset/agent-preset-registry/src/index.ts:144] |
| `AgentPreset`（roster 行） | `id` / 可选 `name` / `description` / `order` / `broken`。`broken` 仍占 roster；`mount` 路径拒绝。没有 `path` / `trust` 字段。[E: packages/preset/agent-preset-registry/src/preset.ts:4] |
| `entryListProblem` | `plugins` 必须是带 `name` 的 plugin 行列表；`group: true` 则递归校验 `config`。[E: packages/preset/agent-preset-registry/src/definition.ts:18] |
| `SessionHeader.agentPreset` | 创建时写入 header。缺省 = 部署没 roster。[E: packages/core/session/src/types.ts:130] |
| `'agent-preset/selected'` | log-only 事件 `{ agentPreset }`；公开 Cordis 通知同名。[E: packages/preset/agent-preset-registry/src/session.ts:28] [E: packages/preset/agent-preset-registry/src/types.ts:69] |
| `agentPresetProjectionDefinition` | key `'agentPreset'`；`init` 取 header，`apply` 吃 selection；resume / 列表走投影，不单信 header。[E: packages/preset/agent-preset-registry/src/session.ts:36] |
| Remote | `list` / `read` / `select`。未知 id → `agent-preset/not-found`；broken → `agent-preset/invalid`；已开 turn → `agent-preset/locked`。没有 copy / delete / 写 YAML 的 Remote。[E: packages/preset/agent-preset-registry/src/index.ts:170] [E: packages/preset/agent-preset-registry/src/index.ts:193] [E: packages/preset/agent-preset-registry/src/index.ts:318] |

Shipped 显示：YAML **不**写 `name` / `description`；`isBuiltInPreset` 要求 `name === undefined` 且 id 在 `standard` / `ptc` / `minimal` / `cordis`。picker 文案走 locale 键（中文「标准模式」/「PTC 模式」/「极简模式」/「创造模式」）。`order` 写在声明里：standard `1`、ptc `2`、minimal `3`、cordis `4`。[E: packages/preset/agent-preset-registry/src/display.ts:40] [E: packages/bundle/web-app/presets/standard.patch.yml:9] [E: packages/bundle/web-app/presets/ptc.patch.yml:9]

## 控制流

1. **host 面先 settle，roster 是 web 叠上去的一行，声明是同 bundle 层后续文件。** `dsh-base` 放下 llm / session / agent / tools 注册表 / sandbox / approval / subagent **backends** / `ptc-runtime`。`dsh-web-app` 把模型可见 tool 行标 `disabled: true`（例如 `tool-bash`），再 `insert` `id: agent-preset-registry`、`name: '@deepseek-ai/dsh-agent-preset-registry'`、`config.default: standard`。四份 `presets/*.patch.yml` 各 insert 一行 `@deepseek-ai/dsh-agent-preset`。headless / sdk / acp / sdk-minimal **没有** 这些行或文件。[E: packages/bundle/web-app/cordis.patch.yml:447] [E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/package.json:43]

2. **声明行向 registry `register`，不是扫目录。** `AgentPreset` 的 `[Service.init]` `yield await this.ctx.agentPresets.register(this.config)`。[E: packages/preset/agent-preset/src/index.ts:27] 空 `id`、重复 `id` 当场抛。[E: packages/preset/agent-preset-registry/src/index.ts:82] [E: packages/preset/agent-preset-registry/src/index.ts:83] `activate`：`entryListProblem` 失败或 `mountPreset` 失败则写下 `broken` 并 `scope.dispose()`，定义仍留在 map 里给 `list()` 看。[E: packages/preset/agent-preset-registry/src/index.ts:102] 没有 `SHIPPED_PRESET_ROOT`、没有 `$DSH_HOME/.agent-presets` 扫描。

3. **Web Host 先 `resolve` 再 `create`，真正的 join 在 `setup`。** `composeAgent`：`ctx.get('agentPresets') === undefined` 则只装 model selection。有 roster 时 `presets.resolve(presetId)` 得到 id，放进返回值 `agentPreset`；`setup` 里再 `presets.mount(agentCtx, resolvedId)`。[E: packages/api/session-controller/src/agent.ts:385] [E: packages/api/session-controller/src/agent.ts:389] [E: packages/api/session-controller/src/agent.ts:394]

4. **每个定义一份 generation；Agent 用引用计数咬住修订。** `mount` 调 `retain`（broken / 无 generation → `agent-preset/invalid`），再 `bind`：已有 binding 则 `rebind`，否则 `join`（`bindScopeParent` + `users++`，fiber dispose 时 `users--`）。[E: packages/preset/agent-preset-registry/src/index.ts:257] [E: packages/preset/agent-preset-registry/src/index.ts:226] `mount` 要求 scoped context，否则抛 `Agent preset binding requires a scoped context`。[E: packages/preset/agent-preset-registry/src/index.ts:228]

5. **`mountPreset`：Include 树 + 失败行 / 泄漏两道门；pending 留给 host settle。** 先拒 unscoped。`PresetTree` 覆盖 `write()` 为空，避免 Loader persist 把声明写回磁盘。[E: packages/preset/agent-preset-registry/src/mount.ts:23] [E: packages/preset/agent-preset-registry/src/mount.ts:259] settle 后 `auditRows`：`failed` 非空则抛；`leakedServices` 非空则抛 `Preset services require isolate realms: …`。[E: packages/preset/agent-preset-registry/src/mount.ts:266] [E: packages/preset/agent-preset-registry/src/mount.ts:267] **等待 host 服务的 pending 行留在树上**：registry `diagnostic` 每次读取先 `loader.await()` 再重审，启动顺序不决定结局。[E: packages/preset/agent-preset-registry/src/index.ts:136]

6. **isolate / `leakedServices`：publish 进 root realm 就拒。** 没有 `isolate` 的 `provide` 把实现挂在 root 那个 symbol 上；`isolate: { planMode: true }` 用 realm-private symbol，root 解析不到。[E: packages/preset/agent-preset-registry/src/mount.ts:86] shipped `standard` / `ptc` / `cordis` 对需要私有实例的组写 `isolate: { planMode: true }` / `{ compaction, toolResultPruner }` / `{ workflowEngine }`。`minimal` 另有 `isolate.terminals`。[E: packages/bundle/web-app/presets/standard.patch.yml:45] [E: packages/bundle/web-app/presets/minimal.patch.yml:20] `ptc` 额外一行 `tool-presentation` `mode: ptc`（不是 isolate 组）。只 `ctx.tools.register`、不往 root realm `provide` 的行不会出现在这份名单里。

7. **Agent join：`bindScopeParent`，不是再挂一棵树。** 同一 generation 的多个 session 共享**一份**插件实例；会话状态仍由插件按 Session/Agent 自己 key。`serviceFor` 按 fiber 身份在 store 里找 realm-private 实例，给浏览器 RPC 这种「关于某会话、但从会话外进来」的读路径。[E: packages/preset/agent-preset-registry/src/index.ts:241] [E: packages/preset/agent-preset-registry/src/index.ts:297]

8. **`setup` 失败整次 `create` 回滚。** `AgentLoop.setupAndPublish` 先 `prepare`，再 `await setup?.(prepared.agent.ctx, prepared.agent)`，然后 `publish`。`setup` 抛则 `prepared.dispose()` 再把原错误抛出，id 不宣布。[E: packages/core/agent-loop/src/index.ts:774] [E: packages/core/agent-loop/src/index.ts:796]

9. **子代理 `composeFrom` 加入父已经 retain 的那一代。** `applyChildComposition` 调 `childCtx.get('agentPresets')?.composeFrom(childCtx, parent.ctx)`：读 `standingMountFor(parent)`，再 `join` 到**同一个** `generation.key`。不读 roster、不碰声明、同步。父没 join（rosterless）则返回 `undefined`，孩子继续看 host 全局层。按 id 再 `resolve` 会在父启动后声明被改时交出另一代。[E: packages/subagent/subagent/src/child-agent.ts:205] [E: packages/preset/agent-preset-registry/src/index.ts:273]

10. **model-visible ⟺ logged：header + projection，而不是手扫 events。** 创建时 header 记下 `agentPreset`。空白窗口 `select`：检查 turn 边界仍 blank，再 `recompose`，成功后 `session.append('agent-preset/selected', { agentPreset })`。[E: packages/preset/agent-preset-registry/src/index.ts:322] Host `presetForSession` / `presetForObservation` 读投影。resume / fork / 冷读一律走这条；只信 header 会用创建时的工具集重放已经换过 preset 的历史。测试：header=`standard` + 后续 selection → 最新 id。[E: packages/preset/agent-preset-registry/src/session.ts:38] [E: packages/preset/agent-preset-registry/tests/session.spec.ts:31] [E: packages/api/session-controller/src/agent.ts:360]

11. **`recompose` 先 retain 新 generation，再 `rebind`。** 未知 / unusable 在 link 移动前抛，agent 仍停在旧 composition。本方法**不读** session 历史；空白窗口合同由 `select` / 调用方守。改 `selectedDefault` 只改 `defaultId` 给**之后**的 `resolve` / 未指名 `mount` 用，已经 join 的会话不重读它。[E: packages/preset/agent-preset-registry/src/index.ts:306] [E: packages/preset/agent-preset-registry/src/index.ts:74]

12. **waterfall 必须 `next()`。** companion `agent-presets-invariant` 在 `system-prompt/assemble` 上：有 roster 且 `context.agent` 存在且 `composedPreset === undefined` 则 `fail(...)`；**无论是否 fail 都 `return next()`**。[E: packages/preset/agent-preset-registry/src/invariant.ts:48] [E: packages/preset/agent-preset-registry/src/invariant.ts:58] `assemble` 的 innermost 是 `() => Promise.resolve(assembly)`；不调用 `next()` 则后续 listener 和这份默认 assembly 都不跑。[E: packages/core/system-prompt/src/index.ts:627] `complete` section 在 waterfall **之后**被恢复，那是 [`subsys.core.system-prompt`](../core/system-prompt.md) 的合同。晚泄漏：companion 在 `internal/service` 上对每个 live mount 再跑 `leakedServices`。[E: packages/preset/agent-preset-registry/src/invariant.ts:34]

13. **registry 不写声明。** `read` Remote 把 `plugins` dump 成 entry-list YAML（`!!js` 原样），只供查看。[E: packages/preset/agent-preset-registry/src/index.ts:202] 覆盖 shipped 声明 = profile `cordis.patch.yml` 里按行 id（`preset-standard` 等）整键替换 `config`（含 `plugins`）。`ConfigEditor.edit` 把完整 `config` 写回该文件。[E: packages/boot/config-editor/src/index.ts:75] [E: packages/boot/config-editor/src/index.ts:115] 新 preset 是再 insert 一行 `@deepseek-ai/dsh-agent-preset`（通常经 `plugin_manager` 装 bundle）。创造模式的 skill 目录在 `@deepseek-ai/dsh-agent-preset` 包内 `skills/`，由 cordis 声明的 `customSkillDirs` 挂上，不是独立 preset 根。

14. **Codex / Claude tool 行不是 base 后端。** shipped `standard` 里 `tool-subagent-codex` / `tool-subagent-claude-code` **存在**但 `disabled: true`。[E: packages/bundle/web-app/presets/standard.patch.yml:103] [E: packages/bundle/web-app/presets/standard.patch.yml:111] `dsh-base` 的 `cordis.patch.yml` **没有** `subagent-codex` / `subagent-claude-code` 行；`base.spec.ts` 钉死 filter 长度为 0，且 manifest `not.toHaveProperty` 那两个包。[E: packages/bundle/base/tests/base.spec.ts:42] [E: packages/bundle/base/tests/base.spec.ts:47] 完整成员表在 [`surface.presets.standard`](../../surface/presets/standard.md)。

## 设计动机

- **声明行，不是扫目录。** 组合树已经是 YAML；再扫 `presets/<id>/agent.cordis.yml` 会多一套 root / trust / copy API。声明是普通 plugin 行，覆盖走同一套 `applyEntryPatches` 整键替换。
- **revision + 引用计数，不是每会话复制一棵树。** 工具 / prompt / isolate 服务按「组合世代」存在一次；session 用 scope parentage join。声明被替换时旧 generation `retired`，仍被活着的 Agent 咬住，直到 `users === 0`。
- **isolate 门卡在 publish 前。** 漏进 root realm 的服务是进程全局的，第二个 mount 同名会炸。`leakedServices` 在 activate 里拒；pending host 依赖不把整份定义标 broken，避免启动顺序误杀。
- **孩子必须咬住父的世代。** 父历史是在那一代 tools / persona 下产生的；按 id 重扫会在有人改声明之后交出另一棵树。
- **preset 选择是模型可见事实。** 工具 schema 与 prompt section 随 composition 变；不打 `agent-preset/selected` 就违反 `model-visible ⟺ logged`。
- **registry 不授予新能力。** 调用方不能把 YAML 字符串塞进缝；要改成员表就 patch 那一行的 `config.plugins`，或再 insert 一行声明。
- **PTC 是声明行，不是第四个「code」id。** 旧名 Code Mode；wiki id `surface.presets.code` / `subsys.core.code-mode` 保持稳定别名。权威实现是 `packages/core/tools/src/ptc.ts`。

## Gotcha

- `resolve` **返回** broken 行（列表需要它）；`mount` / `recompose` / `retain` 在 `broken` 或无 generation 时抛 `agent-preset/invalid`。[E: packages/preset/agent-preset-registry/src/index.ts:180] [E: packages/preset/agent-preset-registry/src/index.ts:217]
- 行 id（`preset-standard`）是 Loader / 用户 patch 的寻址键；`config.id`（`standard`）才是会话 header 与 `select` 用的身份。两者不要混。
- `composeFrom` 在父无 standing 时静默 `undefined`，不抛。rosterless 部署里模型可见行本来就在 host 全局层。[E: packages/preset/agent-preset-registry/src/index.ts:275]
- `recompose` **不**读 session 历史、**不**守 blank；空白窗口合同由 `select` / 调用方守。非空白会话若直接 `recompose`，会留下新 composition 无法再发出的历史 tool call。`select` 在已开 turn 时抛 `agent-preset/locked`。[E: packages/preset/agent-preset-registry/src/index.ts:322]
- shipped 声明由 web-app `dsh.bundle.patch` 列表叠上，**不是** launcher overlay，也不是包内 `presets/` 目录扫描。
- `PresetTree.write()` 必须空：一次 session 结束触发 Loader persist，会把共享声明写成当前濒死树。[E: packages/preset/agent-preset-registry/src/mount.ts:23]
- 改声明会为**之后**的 session 开新 generation；已 join 的继续旧工具名，直到进程重启（跨进程不保留旧实现）。
- `dsh-base` 不 dormant 加载 Codex/Claude 子代理后端。preset 里对应 tool 行 `disabled: true` 是成员资格，不是 host 已装后端。
- 不要把旧路径 `packages/preset/agent-presets/presets/`、旧目录名 `code`、或 `packages/core/tools/src/code-mode.ts` 当作活源。PTC 声明在 `presets/ptc.patch.yml`。

## Seam 三角

| Seam | Definition | Provider（谁挂上） | Consumer（谁读） |
|---|---|---|---|
| roster 服务 | `AgentPresetRegistry` + `Config`；ctx 键 `agentPresets` | `dsh-web-app` 行 `id: agent-preset-registry`（`default: standard`）；四份 `presets/*.patch.yml` 声明 | `composeAgent` / `select` / `applyChildComposition` / settings `selectedDefault` |
| standing composition | `PresetDefinition.plugins` 的 plugin 行列表 | `mountPreset` → `PresetTree` 挂在 `createScope`；`AgentPreset.register` 触发 activate | Agent：`bindScopeParent`；冷读：`acquireScope`；子代理：`composeFrom` 同一 `key` |
| isolate 私有服务 | Cordis `Context.isolate`；yml `isolate: { name: true }` | preset 组行（`planning` / `compaction` / `delegation` 等） | `leakedServices` 拒 root-realm；`serviceFor` 按 mount fiber 读实例 |
| 会话记录 | `SessionHeader.agentPreset` + `SessionEventMap['agent-preset/selected']` + projection `agentPreset` | create 写 header；`select` 在 `recompose` 成功后 `append` | `agentPresetProjectionDefinition`（resume / fork / 列表）；公开 `emit('agent-preset/selected')` |
| prompt 装配 | `system-prompt/assemble` waterfall | preset 行往 scoped `ctx.systemPrompt` 贡献；persona 行见 [`subsys.composition.persona`](persona.md) | loop `assemble`；invariant companion 必须 `next()` |
| 工具注册表 | host `ctx.tools`（Definition 在 [`subsys.core.tools`](../core/tools.md)） | web 把 base 的模型可见行 `disabled: true`，preset 再挂 Consumer 行 | Agent 经 scope 链看见 schema；headless / sdk / acp / sdk-minimal 无 roster 时直接看 host 全局层 |

换一条 seam 的 Provider（例如卸掉 `agent-preset-registry` 行）会带走其 Consumer：Web 会话不再有 per-session 工具面，行为退回「全家共用 host 组合」。那是组合问题，不是改 `Agent` 合同。

## Sources

- packages/preset/agent-preset/src/index.ts
- packages/preset/agent-preset-registry/src/index.ts
- packages/preset/agent-preset-registry/src/definition.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/preset/agent-preset-registry/src/session.ts
- packages/preset/agent-preset-registry/src/preset.ts
- packages/preset/agent-preset-registry/src/types.ts
- packages/preset/agent-preset-registry/src/invariant.ts
- packages/preset/agent-preset-registry/src/display.ts
- packages/preset/agent-preset-registry/tests/mount.spec.ts
- packages/preset/agent-preset-registry/tests/session.spec.ts
- packages/preset/agent-preset-registry/tests/registry.spec.ts
- packages/preset/agent-preset-registry/tests/display.spec.ts
- packages/bundle/web-app/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/acp-app/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/boot/config-editor/src/index.ts
- packages/api/session-controller/src/agent.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/core/scope/src/index.ts
- packages/core/agent-loop/src/index.ts
- packages/core/session/src/types.ts
- packages/core/system-prompt/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 启动层序；shipped 声明由 web-app `dsh.bundle.patch` 列表叠上。
- [surface.presets.overview](../../surface/presets/overview.md) — 声明何时算 preset、四个 shipped（`minimal` / `standard` / `ptc` / `cordis`）的 picker 差异与成员资格。
- [surface.presets.code](../../surface/presets/code.md) — PTC 预设稳定别名（文件 `presets/ptc.patch.yml`）。
- [subsys.composition.persona](persona.md) — preset 里同名 `deployment:persona` 怎样 shadow 部署 persona。
- [spine.overview](../../spine/overview.md) — host 面 vs agent-preset 面总览。
- [spine.session-log](../../spine/session-log.md) — append-only log 与 `deriveMessages()`；本页只写 preset 选择怎么进 log。
- [subsys.core.scope](../core/scope.md) — `createScope` / `bindScopeParent` / `ScopedLayers`。
- [subsys.core.session](../core/session.md) — header 深冻、`SessionEventMap`。
- [subsys.core.agent](../core/agent.md) — factory `setup` 在 publish 前组合、失败回滚。
- [subsys.composition.bundle-web-app](bundle-web-app.md) — 谁 `insert` registry、谁把 base 工具 `disabled: true`、谁叠四份声明。
- [surface.presets.standard](../../surface/presets/standard.md) — `standard` 的 isolate 组与 `disabled` 的 Codex/Claude tool 行。
- [subsys.core.code-mode](../core/code-mode.md) — PTC 传输 `run_code`（权威 `ptc.ts`）。
