---
id: subsys.composition.agent-presets
title: preset 发现与挂载
kind: subsystem
tier: T2
pkg: composition
source:
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/authoring.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/preset/agent-presets/src/preset.ts
  - packages/preset/agent-presets/src/types.ts
  - packages/preset/agent-presets/src/invariant.ts
  - packages/preset/agent-presets/src/metadata.ts
  - packages/preset/agent-presets/tests/mount.spec.ts
  - packages/preset/agent-presets/tests/discovery.spec.ts
  - packages/preset/agent-presets/tests/session.spec.ts
  - packages/preset/agent-presets/tests/authoring.spec.ts
  - packages/preset/agent-presets/tests/user-root.spec.ts
  - packages/preset/agent-presets/tests/settings.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/src/index.ts
  - packages/bundle/base/tests/base.spec.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/core/scope/src/index.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - AgentPresets
  - discoverPresets
  - mountPreset
  - leakedServices
  - resolveSessionPreset
related:
  - spine.composition-boot
  - surface.presets.overview
  - subsys.composition.persona
  - spine.overview
  - spine.session-log
  - subsys.core.scope
  - subsys.core.session
  - subsys.core.agent
  - subsys.composition.bundle-web-app
  - surface.presets.standard
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-agent-presets` 是 Cordis 组合链 `profile → bundle → agent preset` 的 **roster + standing mount**：按 root 发现目录（目录名 = id，必有 `agent.cordis.yml`），每个 preset id **single-flight 一份** scoped 组合，Agent 再用 `bindScopeParent` join。这是 **agent-preset 面**（每会话 tools / persona / isolate），不是又一个 coding agent 的固定工具清单。capability seam 仍是 Definition / Provider / Consumer；模型看见的 preset 必须写进 session log（`model-visible ⟺ logged`）。

## 能回答的问题

- `dsh web` 的 roster 从哪几个 root 扫？谁把 shipped `apps/cli/config/agent-presets/` 写成 `trust: 'system'`？`includeUserRoot` 默认把哪一层接到 `$DSH_HOME/.agent-presets`？
- `AgentPresets.mount` 为什么必须放进 factory `setup`？失败时 `agents.create` 会不会留下半成品会话？
- `leakedServices` 怎样判定「publish 进 root realm」？preset 行要怎样写 `isolate: { …: true }` 才过门？
- 子代理为什么走 `composeFrom` 而不是按 id 再 `resolve`？父启动后有人改了 `agent.cordis.yml`，孩子拿到哪一代？
- header 的 `agentPreset` 和 `agent-preset/selected` 谁赢？resume / fork / 列表标签该读 `resolveSessionPreset` 还是只信 header？
- waterfall `system-prompt/assemble` 上的 invariant companion 为什么必须 `next()`？不调用会停在哪一层？
- authoring 为什么只能 copy，不能塞 composition 文本？`system` 根为什么不可删？

## 职责边界

本包拥有：`ctx.agentPresets` 服务、filesystem 发现（`discoverPresets` / `scanRoot`）、standing mount（`ensureStanding` + `mountPreset`）、isolate 审计（`leakedServices` / `inactiveRows`）、会话记录合同（`resolveSessionPreset` + `agent-preset/selected`）、以及 copy/delete authoring。

本包**不**拥有：

- `profile → bundle` 层序、`composeEntries`、空 `cordis.yml` 根 —— [`subsys.composition.app-boot`](app-boot.md) / [`spine.composition-boot`](../../spine/composition-boot.md)
- `dsh-web-app` 把哪些 host 工具行 `disabled: true`、再 `insert` 本行 —— [`subsys.composition.bundle-web-app`](bundle-web-app.md)
- scope 原语本身（`createScope` / `bindScopeParent` / `ScopedLayers`）—— [`subsys.core.scope`](../core/scope.md)
- Agent 工厂槽、`setup` 回滚出版 —— [`subsys.core.agent`](../core/agent.md)
- append-only log、`deriveMessages()`、header 深冻 —— [`subsys.core.session`](../core/session.md) / [`spine.session-log`](../../spine/session-log.md)
- `deployment:persona` 段语义 —— [`subsys.composition.persona`](persona.md)
- 四个 shipped preset 的完整成员表（逐 `id:` / 工具字段）—— [`surface.presets.overview`](../../surface/presets/overview.md) 与 `surface.presets.{minimal,standard,code,cordis}`
- host 面 webserver / persistence / sandbox / approval / subagent **backends** / jobs·goals·skills **registry** / token-meter。那些留在进程级 bundle，preset 不复制一份 Provider。

`dsh-headless` **不挂** 本服务：`insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`。模型可见工具留在 host 全局层。 [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/preset/agent-presets/src/index.ts` | `AgentPresets`：`list` / `resolve` / `mount` / `composeFrom` / `recompose` / `standingKeyFor` |
| `packages/preset/agent-presets/src/discovery.ts` | `COMPOSITION_FILE`、`USER_PRESET_DIR`、`scanRoot`、`discoverPresets`（先到先得） |
| `packages/preset/agent-presets/src/mount.ts` | `mountPreset`、`leakedServices`、`inactiveRows`、`PresetTree.write()` 空实现 |
| `packages/preset/agent-presets/src/session.ts` | `SessionEventMap['agent-preset/selected']`、`resolveSessionPreset` |
| `packages/preset/agent-presets/src/preset.ts` | `PRESET_ID`、`AgentPreset`、`Config`、`UnknownPresetError` / `PresetMountError` |
| `packages/preset/agent-presets/src/authoring.ts` | `copyComposition` / `deleteComposition`；无 composition 文本入口 |
| `packages/preset/agent-presets/src/invariant.ts` | 晚泄漏重检；`system-prompt/assemble` 上「有 roster 必须 join」 |
| `packages/bundle/web-app/cordis.patch.yml` | `insert` `id: agent-presets`、`default: standard` |
| `apps/cli/src/profile-boot.ts` | 已有 `agent-presets` 行时 overlay shipped root `trust: 'system'` |
| `packages/host/apiproxy/src/api-proxy.ts` | Web：`resolve` 写 header，`mount` 进 `setup`；select 后 `append` |
| `packages/subagent/subagent/src/child-agent.ts` | `applyChildComposition` → `composeFrom` |
| `vendor/cordis/src/events.ts` | waterfall：不调用 `next()` 不会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `AgentPresets.Config` | `default` 必填；`roots[]` 默认 `[]`；`includeUserRoot` 默认 `true`。 [E: packages/preset/agent-presets/src/index.ts:87] [E: packages/preset/agent-presets/src/index.ts:92] |
| `PresetRoot` | `{ path, trust }`。`trust` 是 `'system' \| 'user'`，写到每个被发现的 preset 上。 |
| `PRESET_ID` | `/^[a-z0-9][a-z0-9-]*$/`。这是路径 containment，不是风格：`..` / 分隔符会逃出授权 root。 [E: packages/preset/agent-presets/src/preset.ts:18] |
| `AgentPreset` | `id` / `trust` / `path` + 可选 `name` / `description` / `order` / `broken`。`broken` 仍占 roster；mount 路径拒绝。 |
| `COMPOSITION_FILE` | `'agent.cordis.yml'`。缺文件或 YAML 不是 plugin 行列表 → `broken`。 [E: packages/preset/agent-presets/src/discovery.ts:26] |
| `USER_PRESET_DIR` | `'.agent-presets'`，接到 `dshHomePath` 后即 `$DSH_HOME/.agent-presets`（未设 `DSH_HOME` 时 home 是 `~/.dsh`）。 [E: packages/preset/agent-presets/src/discovery.ts:41] |
| `METADATA_FILE` | `'preset.yml'`。只读 `name` / `description` / `order`；读失败降级为空元数据。`id` / `trust` 不写在这个文件里。 [E: packages/preset/agent-presets/src/metadata.ts:25] |
| `defaultId` | `settings?.get().default ?? config.default`。settings 热更新只影响**之后**创建的会话。 [E: packages/preset/agent-presets/src/index.ts:192] |
| `standing` | `Map<string, Promise<StandingMount>>`，按 preset id single-flight。 [E: packages/preset/agent-presets/src/index.ts:252] |
| `StandingMount` | `{ key: { agentPreset }, scope, stamp }`。`stamp` 是 composition 文件的 `mtimeMs` + `size`。 |
| `SessionHeader.agentPreset` | 创建时写入 header。缺省 = 部署没 roster。 [E: packages/core/session/src/types.ts:98] |
| `'agent-preset/selected'` | log-only 事件 `{ agentPreset }`；公开 Cordis 通知同名。 [E: packages/preset/agent-presets/src/session.ts:26] [E: packages/preset/agent-presets/src/types.ts:13] |
| `UnknownPresetError` / `PresetMountError` | 未知 id vs 组合不可用。`resolve` 仍返回 broken 行；`resolveMountable` 才抛后者。 |

## 控制流

1. **host 面先 settle，roster 是 web 叠上去的一行。** `dsh-base` 放下 llm / session / agent / tools 注册表 / sandbox / approval / subagent **backends**。`dsh-web-app` 把模型可见 tool 行标 `disabled: true`（例如 `tool-bash`），再 `insert` `id: agent-presets`、`name: '@deepseek-ai/dsh-agent-presets'`、`config.default: standard`。headless **没有** 这一行，`agents.create` 的 `setup` 只装 `installModelSelection`。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。 [E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:422] [E: packages/bundle/web-app/cordis.patch.yml:424] [E: packages/bundle/headless/src/index.ts:111] [E: packages/bundle/headless/src/index.ts:117]

2. **发现：配置 root 先到先得，再追加用户根。** `AgentPresets` 构造时：`includeUserRoot === true`（schema 默认）则 `resolvedRoots = [...config.roots, { path: dshHomePath('.agent-presets'), trust: 'user' }]`；`false` 则只扫 `config.roots`。`list()` / `resolve()` 每次都 `discoverPresets(resolvedRoots)`，不缓存。`discoverPresets` 按 root 顺序 `scanRoot`，`byId.has(id)` 则跳过——更早的 root 赢重复 id。schema 省略 `roots` 时解析成 `{ includeUserRoot: true, roots: [] }`，只靠用户根也能发现。 [E: packages/preset/agent-presets/src/index.ts:133] [E: packages/preset/agent-presets/src/index.ts:134] [E: packages/preset/agent-presets/src/index.ts:200] [E: packages/preset/agent-presets/src/discovery.ts:181] [E: packages/preset/agent-presets/tests/discovery.spec.ts:118] [E: packages/preset/agent-presets/tests/user-root.spec.ts:73]

3. **CLI 再 overlay shipped root。** launcher 本地 `composeProfile`（**未 export**）叠完 bundles → profile `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` 之后，若行表已有 `agent-presets`，再推一条 overlay：`roots: [{ path: SHIPPED_PRESET_ROOT, trust: 'system' }]`。`SHIPPED_PRESET_ROOT` 是这份安装里的 `apps/cli/config/agent-presets/`。这条 overlay 整键覆盖 `config`，所以 shipped 根排在用户根**之前**，`standard` 不会被 `$DSH_HOME/.agent-presets/standard` 抢走。`dsh --dump-config` **看不到** 这一刀。 [E: apps/cli/src/profile-boot.ts:35] [E: apps/cli/src/profile-boot.ts:159] [E: apps/cli/src/profile-boot.ts:164] [E: packages/preset/agent-presets/tests/user-root.spec.ts:103]

4. **Web 先 `resolve` 再 `create`，真正的 join 在 `setup`。** `composeAgent@packages/host/apiproxy/src/api-proxy.ts`：`ctx.get('agentPresets') === undefined` 则只装 model selection（headless / 无 roster 部署）。有 roster 时 `presets.resolve(presetId)` 得到 id，放进返回值 `agentPreset`；`setup` 里再 `presets.mount(agentCtx, resolvedId)`。`agents.create` 把该 id 写入 `meta.agentPreset`；store 把它折进 header。 [E: packages/host/apiproxy/src/api-proxy.ts:1231] [E: packages/host/apiproxy/src/api-proxy.ts:1232] [E: packages/host/apiproxy/src/api-proxy.ts:1240] [E: packages/host/apiproxy/src/api-proxy.ts:1245] [E: packages/host/apiproxy/src/api-proxy.ts:1675] [E: packages/core/session/src/index.ts:886]

5. **每个 preset id 一份 standing mount。** `mount@AgentPresets` 要求 `scopeOf(agentCtx)` 有值，否则抛 `refusing to compose an unscoped context`。然后 `resolveMountable`（broken 在此变成 `PresetMountError`，loader 还没读文件），`ensureStanding`：`standing` Map 已有 pending 就共用；stamp 变了才开下一代。新一代：`key = { agentPreset: preset.id }`，`createScope(this.selfCtx, key)`（必须用服务自己的 untraced `selfCtx`，不能用调用方带 shadow 的 proxy），`mountPreset(scope.ctx, preset)`。失败则 `standing.delete` + `scope.dispose()`。 [E: packages/preset/agent-presets/src/index.ts:278] [E: packages/preset/agent-presets/src/index.ts:280] [E: packages/preset/agent-presets/src/index.ts:514] [E: packages/preset/agent-presets/src/index.ts:515] [E: packages/preset/agent-presets/src/index.ts:524] [E: packages/preset/agent-presets/src/index.ts:527] [E: packages/core/scope/src/index.ts:137]

6. **`mountPreset`：Include 树 + 两道门。** 先拒 unscoped（否则注册打到进程里每个 Agent）。`PresetTree` 覆盖 `write()` 为空：Loader 若把濒死树写回，会把 shipped `agent.cordis.yml` 截成 `[]`。settle 后 `inactiveRows`：启用行仍在等 `fiber.inject` 里缺的服务 → 抛 `N row(s) did not activate`。再 `leakedServices`。两关都过才把 `{ presetId, fiber, key }` 记进 `mounts`。 [E: packages/preset/agent-presets/src/mount.ts:110] [E: packages/preset/agent-presets/src/mount.ts:334] [E: packages/preset/agent-presets/src/mount.ts:357] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:368] [E: packages/preset/agent-presets/tests/mount.spec.ts:253] [E: packages/preset/agent-presets/tests/mount.spec.ts:439]

7. **isolate / `leakedServices`：publish 进 root realm 就拒。** `leakedServices(ctx, mount)` 扫 `ctx.reflect.store` 的 own symbols：实现的 fiber 属于这棵 subtree，且 `ctx.root[Context.isolate][impl.name] === key`，则该服务名算泄漏。没有 `isolate` 的 `provide` 正是把实现挂在 root 那个 symbol 上；`isolate: { fixtureIsolatedSvc: true }` 用 realm-private symbol，root 解析不到。泄漏诊断按名字排序后抛：`row(s) published process-global service(s) […]; a preset service must sit behind an \`isolate\` realm or move to the host composition`。测试钉死 `leaky` 被拒且 store 里不再留那两个名；`isolated` 过门，`rootResolves` 为 false。shipped `standard` 对需要私有实例的组写 `isolate: { planMode: true }` / `{ compaction, toolResultPruner }` / `{ workflowEngine }`。只 `ctx.tools.register`、不往 root realm `provide` 的行不会出现在这份名单里。 [E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/src/mount.ts:365] [E: packages/preset/agent-presets/tests/mount.spec.ts:258] [E: packages/preset/agent-presets/tests/mount.spec.ts:272] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:107] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:177]

8. **Agent join：`bindScopeParent`，不是再挂一棵树。** standing 成功后 `bindings.set(agentKey, bindScopeParent(agentKey, standing.key))`。`bindScopeParent` 只能绑一次；再绑必须拿回的 `ScopeParentBinding.rebind`。standing 上的 `ctx.tools` / `ctx.systemPrompt` 注册对 join 上来的 Agent 可见（`ScopedLayers` 向下）；mount 上的 listener 收到该 Agent 的事件（`scopeTarget` 向上）。同一 preset 的多个 session 共享**一份**插件实例；会话状态仍由插件按 Session/Agent 自己 key。`serviceFor` 按 fiber 身份在 store 里找 realm-private 实例，给浏览器 RPC 这种「关于某会话、但从会话外进来」的读路径。 [E: packages/preset/agent-presets/src/index.ts:286] [E: packages/core/scope/src/index.ts:72] [E: packages/preset/agent-presets/tests/mount.spec.ts:289]

9. **`setup` 失败整次 `create` 回滚。** `AgentLoop.setupAndPublish` 先 `prepare`，再 `await setup?.(prepared.agent.ctx)`，然后 `publish`。`mount` / `mountPreset` 在 `setup` 里抛则进 `catch`，`await prepared.dispose()` 再把原错误抛出，两个 id 都不宣布。测试：`broken` preset 抛 `/failed to mount/` 后 `ctx.agents.get(sess-broken)` 为 `undefined`，全局 `tools.schemas()` 仍是 `[]`。 [E: packages/core/agent-loop/src/index.ts:638] [E: packages/core/agent-loop/src/index.ts:642] [E: packages/preset/agent-presets/tests/mount.spec.ts:237] [E: packages/preset/agent-presets/tests/mount.spec.ts:239]

10. **子代理 `composeFrom` 加入父已经 standing 的那一代。** `applyChildComposition` 调 `childCtx.get('agentPresets')?.composeFrom(childCtx, parent.ctx)`：读 `standingMountFor(parentCtx)`，再 `bindScopeParent` 到**同一个** `standing.key`。不读 roster、不碰文件、同步——in-process spawn/fork 的 `setup` 是同步的。父没 join（rosterless）则返回 `undefined`，孩子继续看 host 全局层。按 id 再 `resolve` 会在父启动后文件被改时交出另一代；测试钉死 `livePresetMounts()` 长度不因孩子增加。 [E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/preset/agent-presets/src/index.ts:321] [E: packages/preset/agent-presets/src/index.ts:323] [E: packages/preset/agent-presets/tests/mount.spec.ts:185]

11. **model-visible ⟺ logged：header + 从后往前的 selection。** 创建时 header 记下 `agentPreset`。空白窗口 `agentPreset.select`：先 `sessionBlank`，再 `recompose`，成功后 `session.append('agent-preset/selected', { agentPreset })`。`AgentPresets` 听到 `session/event` 再 `emit('agent-preset/selected', session.id, …)` 给客户端。`resolveSessionPreset` 从 `events.length - 1` 往 0 找最后一次 `'agent-preset/selected'`，找不到才回落 `header.agentPreset`。resume / fork / 冷读一律走这条；只信 header 会用创建时的工具集重放已经换过 preset 的历史。测试：header=`standard` + 一条 `minimal` selection → `'minimal'`。 [E: packages/host/apiproxy/src/api-proxy.ts:3110] [E: packages/host/apiproxy/src/api-proxy.ts:3113] [E: packages/preset/agent-presets/src/index.ts:179] [E: packages/preset/agent-presets/src/session.ts:49] [E: packages/preset/agent-presets/src/session.ts:51] [E: packages/preset/agent-presets/src/session.ts:53] [E: packages/preset/agent-presets/tests/session.spec.ts:40]

12. **`recompose` 先 ensure 新 standing，再 `rebind`。** 未知 / unusable 在 link 移动前抛，agent 仍停在旧 composition。没有 binding 的裸 agent 走第一次 `bindScopeParent`（等于一次 `mount`）。本方法**不读** session 历史；空白窗口合同由调用方（Web `sessionBlank`）守。改 `settings` 的 `default` 不会动已经 join 的会话。 [E: packages/preset/agent-presets/src/index.ts:469] [E: packages/preset/agent-presets/tests/mount.spec.ts:495] [E: packages/preset/agent-presets/tests/settings.spec.ts:71] [E: packages/preset/agent-presets/tests/settings.spec.ts:103]

13. **waterfall 必须 `next()`。** Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器调用传入的 `next()` 才会 `cbs.shift()` 到下一层；不调用就停在本层，内建默认行为也不跑。preset 自己登记的 `system-prompt` section / `ctx.tools` 经 scope 链进入装配。companion `agent-presets-invariant` 在 `system-prompt/assemble` 上：有 roster（`presets.roots.length > 0`）且 `context.agent` 存在且 `composedPreset === undefined` 则 `fail(...)`；**无论是否 fail 都 `return next()`**。`assemble` 的 innermost 是 `() => Promise.resolve(assembly)`；不调用 `next()` 则后续 listener 和这份默认 assembly 都不跑，返回值权威链在本层断开。`complete` section 在 waterfall **之后**被恢复，那是 [`subsys.core.system-prompt`](../core/system-prompt.md) 的合同，不是本包改得了的。注册监听本身走 `fiber.effect`，卸插件可逆。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] [E: packages/preset/agent-presets/src/invariant.ts:60] [E: packages/preset/agent-presets/src/invariant.ts:70] [E: packages/core/system-prompt/src/index.ts:532] [E: vendor/cordis/src/events.ts:256]

14. **authoring：只能 copy，不能塞 composition 文本；`system` 不可删。** 公开写入口是 `copy(from, id, name?)`：按 id 解析源目录，`cp` 整树（dereference symlink），再改 `preset.yml` 的显示名。没有「把 YAML 字符串写进缝」的 API。`remove` 调 `deleteComposition`：`preset.trust !== 'user'` 抛 `it ships with the deployment`。`PRESET_ID` 挡 `../escape`。copy 失败会 `rm` 半成品目录。 [E: packages/preset/agent-presets/src/index.ts:380] [E: packages/preset/agent-presets/src/authoring.ts:149] [E: packages/preset/agent-presets/src/authoring.ts:186] [E: packages/preset/agent-presets/src/authoring.ts:187] [E: packages/preset/agent-presets/tests/authoring.spec.ts:184]

15. **Codex / Claude tool 行不是 base 后端。** shipped `standard` 里 `tool-subagent-codex` / `tool-subagent-claude-code` **存在**但 `disabled: true`。`dsh-base` 的 `cordis.patch.yml` **没有** `subagent-codex` / `subagent-claude-code` 行；`base.spec.ts` 钉死 filter 长度为 0，且 manifest `not.toHaveProperty` 那两个包。不要写成「base 装了但 dormant」。要启用，得在**自己的** preset 副本里去掉 `disabled`，并另外在 host 组合挂上对应 backend——那是另一层 insert，不是本 roster 的默认树。完整成员表在 [`surface.presets.standard`](../../surface/presets/standard.md)。 [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:203] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:205] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:212] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:214] [E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]

## 设计动机

- **standing mount，不是每会话复制一棵树。** 工具 / prompt / isolate 服务按「组合世代」存在一次；session 用 scope parentage join。否则每个会话都会把 `planMode` / `compaction` 再 publish 一遍，第二个会话必撞名。
- **isolate 门卡在 publish 前。** 漏进 root realm 的服务是进程全局的，第二个 mount 同名会炸。`leakedServices` 在 `setup` 里拒，观察者从未见过半成品 Agent。
- **文件是唯一编辑器。** authoring 只 copy/delete，所以 `stamp`（mtime + size）足以开下一代。已 join 的会话继续跑旧世代；进程活着期间不 dispose 被取代的树。
- **孩子必须咬住父的世代。** 父历史是在那一代 tools / persona 下产生的；按 id 重扫会在有人改磁盘之后交出另一棵树。
- **preset 选择是模型可见事实。** 工具 schema 与 prompt section 随 composition 变；不打 `agent-preset/selected` 就违反 `model-visible ⟺ logged`。
- **copy 不授予新能力。** 调用方不能塞 composition 文本，只能复制部署已经能 load 的目录。`system` 根只读，避免浏览器改掉「重置到已知 preset」的参照。
- **先到先得 + 用户根垫底。** shipped id 永远 shadow 同名用户目录；`copy` 也拒绝已被任何 root 占用的 id。

## Gotcha

- `resolve` **返回** broken 行（删除 / 汇报需要它）；`mount` / `recompose` / `standingKeyFor` 走 `resolveMountable`，用 discovery 写下的 `broken` 理由直接抛，loader 不再试一次。 [E: packages/preset/agent-presets/src/index.ts:235] [E: packages/preset/agent-presets/tests/mount.spec.ts:359]
- `agent/created` 上「未 join」只是 `logger.warn`，同步 throw 会否决出版，而 ACP / SDK / headless / `recompose` 前的裸 agent 都合法。fail-loud 在 `system-prompt/assemble` 的 invariant companion。 [E: packages/preset/agent-presets/src/index.ts:169] [E: packages/preset/agent-presets/src/invariant.ts:63]
- `composeFrom` 在父无 standing 时静默 `undefined`，不抛。rosterless 部署里模型可见行本来就在 host 全局层。 [E: packages/preset/agent-presets/src/index.ts:322]
- `recompose` 自己不读 log。非空白会话换 preset 会留下新 composition 无法再发出的历史 tool call；Web 用 `sessionBlank` 挡，别的调用方必须自己守。 [E: packages/host/apiproxy/src/api-proxy.ts:3102]
- launcher 注入的 shipped `roots` **不进** `dsh --dump-config`。要对齐 boot 真树，读 `profile-boot.ts` 的 `rows.has('agent-presets')` overlay。
- `PresetTree.write()` 必须空：一次 session 结束触发 Loader persist，会把共享的 shipped 文件写成当前濒死树。 [E: packages/preset/agent-presets/src/mount.ts:110]
- 改 composition 文件会为**之后**的 session 开新世代；已 join 的继续旧工具名。`livePresetMounts()` 在 stamp 刷新后同一 id 可以暂时有两代。 [E: packages/preset/agent-presets/tests/mount.spec.ts:640]
- `includeUserRoot: false` 且没有 `trust: 'user'` root 时 `authorable === false`，`copy` 抛 `no user-writable preset root`。 [E: packages/preset/agent-presets/tests/user-root.spec.ts:112]
- 冷读 `standingKeyFor` 会 mount 插件但**不** `agents.create`、不开 turn。用它给 transcript 解析 presenter。 [E: packages/preset/agent-presets/tests/mount.spec.ts:697]
- `dsh-base` 不 dormant 加载 Codex/Claude 子代理后端。preset 里对应 tool 行 `disabled: true` 是成员资格，不是 host 已装后端。

## Seam 三角

| Seam | Definition | Provider（谁挂上） | Consumer（谁读） |
|---|---|---|---|
| roster 服务 | `AgentPresets` + `Config`；ctx 键 `agentPresets` | `dsh-web-app` 行 `id: agent-presets`（`default: standard`）；CLI overlay 补 `roots[0].trust: 'system'` | `composeAgent` / `agentPreset.select` / `applyChildComposition` / settings `agent-presets.default` |
| standing composition | 目录 + `agent.cordis.yml` 的 plugin 行列表 | `mountPreset` → `PresetTree`（Include）挂在 `createScope({ agentPreset })` | Agent：`bindScopeParent`；冷读：`standingKeyFor`；子代理：`composeFrom` 同一 `key` |
| isolate 私有服务 | Cordis `Context.isolate`；yml `isolate: { name: true }` | preset 组行（`planning` / `compaction` / `delegation` 等） | `leakedServices` 拒 root-realm；`serviceFor` 按 mount fiber 读实例 |
| 会话记录 | `SessionHeader.agentPreset` + `SessionEventMap['agent-preset/selected']` | create 写 header；select 在 `recompose` 成功后 `append` | `resolveSessionPreset`（resume / fork / 列表）；公开 `emit('agent-preset/selected')` |
| prompt 装配 | `system-prompt/assemble` waterfall | preset 行往 scoped `ctx.systemPrompt` 贡献；persona 行见 [`subsys.composition.persona`](persona.md) | loop `assemble`；invariant companion 必须 `next()` |
| 工具注册表 | host `ctx.tools`（Definition 在 [`subsys.core.tools`](../core/tools.md)） | web 把 base 的模型可见行 `disabled: true`，preset 再挂 Consumer 行 | Agent 经 scope 链看见 schema；headless 无 roster 时直接看 host 全局层 |

换一条 seam 的 Provider（例如卸掉 `agent-presets` 行）会带走其 Consumer：Web 会话不再有 per-session 工具面，行为退回「全家共用 host 组合」。那是组合问题，不是改 `Agent` 合同。

## Sources

- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/src/authoring.ts
- packages/preset/agent-presets/src/mount.ts
- packages/preset/agent-presets/src/session.ts
- packages/preset/agent-presets/src/preset.ts
- packages/preset/agent-presets/src/types.ts
- packages/preset/agent-presets/src/invariant.ts
- packages/preset/agent-presets/src/metadata.ts
- packages/preset/agent-presets/tests/mount.spec.ts
- packages/preset/agent-presets/tests/discovery.spec.ts
- packages/preset/agent-presets/tests/session.spec.ts
- packages/preset/agent-presets/tests/authoring.spec.ts
- packages/preset/agent-presets/tests/user-root.spec.ts
- packages/preset/agent-presets/tests/settings.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/src/index.ts
- packages/bundle/base/tests/base.spec.ts
- apps/cli/src/profile-boot.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- packages/host/apiproxy/src/api-proxy.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/core/scope/src/index.ts
- packages/core/agent/src/index.ts
- packages/core/agent-loop/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/index.ts
- packages/core/system-prompt/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 启动层序；launcher overlay shipped root。
- [surface.presets.overview](../../surface/presets/overview.md) — 目录何时算 preset、四个 shipped 的 picker 差异与成员资格。
- [subsys.composition.persona](persona.md) — preset 里同名 `deployment:persona` 怎样 shadow 部署 persona。
- [spine.overview](../../spine/overview.md) — host 面 vs agent-preset 面总览。
- [spine.session-log](../../spine/session-log.md) — append-only log 与 `deriveMessages()`；本页只写 preset 选择怎么进 log。
- [subsys.core.scope](../core/scope.md) — `createScope` / `bindScopeParent` / `ScopedLayers`。
- [subsys.core.session](../core/session.md) — header 深冻、`SessionEventMap`。
- [subsys.core.agent](../core/agent.md) — factory `setup` 在 publish 前组合、失败回滚。
- [subsys.composition.bundle-web-app](bundle-web-app.md) — 谁 `insert` 本行、谁把 base 工具 `disabled: true`。
- [surface.presets.standard](../../surface/presets/standard.md) — `standard` 的 isolate 组与 `disabled` 的 Codex/Claude tool 行。
