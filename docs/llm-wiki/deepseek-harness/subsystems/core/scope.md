---
id: subsys.core.scope
title: scope 作用域原语
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/scope/src/index.ts
  - packages/core/scope/src/store.ts
  - packages/core/scope/src/invariant.ts
  - packages/core/scope/src/scoped-events.generated.ts
  - packages/core/scope/package.json
  - packages/core/scope/tests/scope.spec.ts
  - packages/core/scope/tests/store.spec.ts
  - packages/core/scope/tests/invariant.spec.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/tests/mount.spec.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/client/runtime/src/client/agents/scope.ts
  - packages/bundle/headless/cordis.patch.yml
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/cordis/src/context.ts
  - vendor/cordis/src/registry.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
symbols:
  - Scope
  - createScope
  - bindScopeParent
  - scopeTarget
  - ScopedLayers
related:
  - spine.overview
  - spine.composition-boot
  - spine.capability-seams
  - spine.turn-and-step
  - subsys.core.tools
  - subsys.core.system-prompt
  - subsys.core.agent-loop
  - subsys.composition.agent-presets
  - surface.presets.overview
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-scope` 是 Cordis 组合运行时里的 **scope 作用域原语**：用 no-op plugin fiber 铸带 `kScope` 标签的 context，同一条 `scopeParents` 链同时管 **注册视图向下继承**（`ScopedLayers`）和 **事件准入向上扩展**（`scopeTarget`）。它不是 `ctx.scope` 服务，也不是又一个 coding-agent 沙箱。

## 能回答的问题

- `dsh-scope` 是 `ctx` 服务还是零服务库？谁在哪一层 `createScope`？
- `ScopedLayers` 为什么向下、`scopeTarget` 为什么向上？sibling preset 听不听得到这次 dispatch？
- `bindScopeParent` 为什么只能绑一次？`rebind` 给谁、空白会话 recompose 合同是什么？
- scope 过滤后的 waterfall 为什么必须 `next()`？不调用会停在哪一层？
- `isolate` 和 scope 是不是同一件事？`leakedServices` 何时拒绝、preset 行要怎样写 `isolate: { …: true }`？
- headless 没有 `agent-presets` 时，工具为什么还能从全局层看见？

## 职责边界

本包拥有：`ScopeKey` 身份、`createScope` 铸 tagged context、`bindScopeParent` / `ScopeParentBinding.rebind`、`scopeTarget` 路由 carrier、`ScopedLayers` / `NamedEntries` / `AnonymousEntries` 层叠积木、以及可选 companion `@deepseek-ai/dsh-scope/invariant`（校 scope-filtered 事件的 `thisArg`）。

本包**不**拥有：

- 工具注册表、`tools/pre-execute` 管线、`presentAs` 模式 —— [subsys.core.tools](./tools.md)
- `system-prompt/assemble` 的 section 语义与 `complete` 恢复 —— [subsys.core.system-prompt](./system-prompt.md)
- Agent 工厂、turn / step、inbox —— [subsys.core.agent-loop](./agent-loop.md)
- preset 发现、standing mount、`leakedServices` 审计、会话 header 的 `agentPreset` —— [subsys.composition.agent-presets](../composition/agent-presets.md)
- host 面 webserver / persistence / sandbox / subagent backends；这些留在 `profile → bundle`，不进 scope 链
- Cordis `Context.isolate` 服务 realm（vendor）；本包只提供身份与过滤，isolate 门由 `mountPreset` 读

`package.json` 没有 `dependencies`，只有对 `@deepseek-ai/cordis` 与 `@deepseek-ai/dsh-invariants` 的 `peerDependencies`。主入口不 `provide` 任何服务名；`./invariant` 才是可选 companion。[E: packages/core/scope/package.json:2] [E: packages/core/scope/package.json:34]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/scope/src/index.ts` | `createScope` / `bindScopeParent` / `scopeTarget` / `kScope` |
| `packages/core/scope/src/store.ts` | `ScopedLayers`、`NamedEntries`、`AnonymousEntries` |
| `packages/core/scope/src/invariant.ts` | companion：校 scope-filtered dispatch 的 carrier |
| `packages/core/scope/src/scoped-events.generated.ts` | 生成表：哪些事件要 carrier、subject 从哪读 |
| `packages/core/scope/tests/scope.spec.ts` | 标签、向上准入、一次绑定、成环 |
| `packages/core/scope/tests/store.spec.ts` | 层叠 merge、peek 不创建、effect 回滚 |
| `packages/preset/agent-presets/src/index.ts` | standing `createScope` + `bindScopeParent` 消费者 |
| `packages/preset/agent-presets/src/mount.ts` | `mountPreset` / `leakedServices` isolate 门 |
| `packages/core/agent-loop/src/agent.ts` | 用 live `Agent` 当 `ScopeKey` 铸会话 scope |
| `vendor/cordis/src/events.ts` | `waterfall` 必须 `next()` 才会 `shift` |

## 数据模型

| 符号 | 角色 |
|---|---|
| `ScopeKey` | 不透明对象身份，只比 `===`，不读字段 |
| `kScope` | `createScope` 写进 context 的 symbol 标签 |
| `Scope` | `{ ctx, rawDispose, dispose() }`：注册面 + 精确 / 共享卸掉 |
| `ScopeParentBinding` | 唯一能改父的句柄，只有 `rebind(parent)` |
| `Scoped<T>` | `scopeTarget` 返回的路由-only carrier；不暴露 subject 属性 |
| `scopeParents` | 一条 WeakMap 链，同时喂给层叠读取和事件准入 |
| `NamedEntries<V>` | 层内按名唯一；重复诊断由调用方工厂抛 |
| `AnonymousEntries<V>` | 层内按 `Symbol` 区分，等值也是两条注册 |
| `ScopedLayers<L>` | 一份 eager `global` + 按 key 的 overlay；读路径不创建层 |

`NamedEntries` / `AnonymousEntries` 是 tools / system-prompt / skills 往 `ScopedLayers` 里塞表的积木。本页不展开工具 schema。

## 控制流

1. `createScope@packages/core/scope/src/index.ts` 不是 Loader 行，也不占 `ctx` 服务槽。可选 `options.parent` 先走一次 `bindScopeParent`；然后 `ctx.plugin(scope)` 挂 **no-op** 函数 `scope()` 当 backing fiber，再 `fiber.ctx.extend({ [kScope]: key })` 打标签。`scopeOf` 读最近一层 `kScope`。`rawDispose` 是这条 fiber 的精确 disposer；公开 `dispose()` 对 racing 调用共享同一次 quiescence。[E: packages/core/scope/src/index.ts:121] [E: packages/core/scope/src/index.ts:138] [E: packages/core/scope/src/index.ts:139] [E: packages/core/scope/src/index.ts:140] [E: vendor/cordis/src/registry.ts:318]

2. **agent-preset 面**的 standing scope 由 `AgentPresets.ensureStanding` 铸：`key = { agentPreset: preset.id }`，`createScope(this.selfCtx, key)`，再 `mountPreset(scope.ctx, preset)`。同一 preset id single-flight 一份；多个 Web 会话 join 同一代插件实例。`dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `agent-presets` 行，这一步不发生，模型可见工具留在 host 全局层。[E: packages/preset/agent-presets/src/index.ts:514] [E: packages/preset/agent-presets/src/index.ts:515] [E: packages/preset/agent-presets/src/index.ts:524] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

3. `mountPreset@packages/preset/agent-presets/src/mount.ts` 拒绝 unscoped context（否则注册会落到进程里每个 Agent）。树 settle 后跑两道 fail-closed：`inactiveRows`（enabled 行还在等永远不会来的 inject）和 `leakedServices`。后者扫 `ctx.reflect.store`：实现的 fiber 落在这次 mount 子树里，且 `ctx.root[Context.isolate][impl.name] ===` 该 store 槽，就算泄漏进 **root realm**。有泄漏就抛，要求 preset 服务坐 `isolate` 或搬到 host。[E: packages/preset/agent-presets/src/mount.ts:334] [E: packages/preset/agent-presets/src/mount.ts:362] [E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/tests/mount.spec.ts:258]

4. `isolate` 是 vendor Cordis 的服务 realm，不是 `dsh-scope` 的 parent 链。`Context.isolate(name)` 给该服务名换一个 realm-private symbol；yml 组上写 `isolate: { planMode: true }` 就是这条缝。测试钉死：同一 provider 不带 isolate 被 `leakedServices` 拒绝；带 realm 则 root 解析不到，但 `serviceFor(agent, name)` 能按 standing fiber 读到（同一 preset 的两个 Agent 读到**同一**实例）。[E: vendor/cordis/src/context.ts:121] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:107] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108] [E: packages/preset/agent-presets/tests/mount.spec.ts:272] [E: packages/preset/agent-presets/tests/mount.spec.ts:289]

5. **会话 Agent scope** 由默认 loop 铸：`ReactLoopAgent` 构造里 `this.scope = createScope(loopCtx, this)`，live `Agent` 对象自己当 `ScopeKey`，再 `this.ctx = this.scope.ctx.extend({ agent: this })`。[E: packages/core/agent-loop/src/agent.ts:94] [E: packages/core/agent-loop/src/agent.ts:95]

6. `AgentPresets.mount@packages/preset/agent-presets/src/index.ts` 在 `setup` 里做**唯一一次** `bindScopeParent(agentKey, standing.key)`，binding 放进 roster 私有 `WeakMap`。再调 `bindScopeParent` 抛 `scope key is already bound to a parent`。成环（含自指）抛 `scope parent link would form a cycle`。`scopeChainOf(agent)` 近到远是 `[agent, standingKey]`。[E: packages/preset/agent-presets/src/index.ts:286] [E: packages/core/scope/src/index.ts:74] [E: packages/core/scope/src/index.ts:56] [E: packages/core/scope/tests/scope.spec.ts:184]

7. 子代理不重新发现 preset：`applyChildComposition` 调 `composeFrom(childCtx, parent.ctx)`，再 `bindScopeParent` 到**父已经 standing 的那一代**。roster 不在（headless）时 `?.` 成 no-op，孩子继续看 host 全局层。[E: packages/subagent/subagent/src/child-agent.ts:168] [E: packages/preset/agent-presets/src/index.ts:323]

8. 空白会话换 preset 走 `recompose`：先 `ensureStanding` 新一代，再用原 binding 的 `rebind`。方法**不读** session log；调用方必须保证旧父下没有已产生、仍被保留的产物（logged tool 名换组成后对不上）。没有 binding 的 Agent 第一次 `recompose` 等于一次 `mount`。[E: packages/preset/agent-presets/src/index.ts:469] [E: packages/core/scope/src/index.ts:79]

9. **注册视图向下。** `ScopedLayers.effect` 用 `scopeOf(ctx)` 选层：无标签写 `global`；有标签才懒创建 overlay。`chainLayers` 沿 `scopeChainOf` **远祖在前、本 scope 在后**，近处同名覆盖远处。`peek` 故意 chain-blind，只看本 key 自己的层。`ctx.tools.register` / `ctx.systemPrompt.section` 都把插入挂在 `ctx.effect` 上，fiber dispose 时倒序卸掉。preset standing 上注册的 tool / persona section，join 上去的每个 Agent 都能在 `schemas(agent)` / `assemble({ scope: agent })` 里看见。[E: packages/core/scope/src/store.ts:231] [E: packages/core/scope/src/store.ts:194] [E: packages/core/tools/src/index.ts:1057] [E: packages/core/system-prompt/src/index.ts:385] [E: vendor/cordis/src/fiber.ts:431]

10. **事件准入向上。** `scopeTarget(base, key)` 造不带 subject 属性的 carrier：先跑 base 已有的 `Context.filter`，然后无标签 listener **一律放行**；有标签则从 **dispatch key 往祖先走**，命中 listener 的 tag 才准入。descendant 听得到 ancestor 的 listener；反过来不行。测试：对 agent key emit，`preset` + `agent` + untagged 都听到；对 preset key emit，agent-tagged 被排除。[E: packages/core/scope/src/index.ts:176] [E: packages/core/scope/src/index.ts:177] [E: packages/core/scope/tests/scope.spec.ts:213] [E: packages/core/scope/tests/scope.spec.ts:220]

11. **Waterfall 必须 `next()`。** `Events.dispatch` 先用 carrier 的 filter 筛 hook（`{ global: true }` 跳过 filter）。`Events.waterfall` 把最后一个参数当 innermost `next`；每次 `next()` 才 `cbs.shift()` 到下一层，没人叫就停在本 listener，**内置行为也不跑**。`tools/pre-execute` 的 inner 是 `{ kind: 'allow' }`；`tools/execute` 的 inner 是 `dispatchToolBody`；`system-prompt/assemble` 的 inner 是原样返回 `assembly`。Agent 事件走 `agentEvents`：`scopeTarget(agent, agent)`，payload 里的 `agent` 由 dispatcher 注入，避免 subject 与 key 分叉。[E: vendor/cordis/src/events.ts:173] [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1477] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1575] [E: packages/core/system-prompt/src/index.ts:533] [E: packages/core/system-prompt/src/index.ts:534] [E: packages/core/agent/src/dispatch.ts:95]

12. `tools/change` / `system-prompt/change` 是 **unfiltered** `emit`：层一变就广播，scoped listener 也会看到别人的变更。这和带 `scopeTarget` 的执行 / assemble 事件相反。[E: packages/core/tools/src/index.ts:813] [E: packages/core/system-prompt/src/index.ts:349]

13. 可选 companion `scope-invariant` 听 `internal/dispatch`：生成表里的事件必须带 `isScopeCarrier` 的 thisArg；带 subject 的事件还要求 `carrierKeyOf(thisArg)` 等于 payload 里的 subject。`tools/pre-execute` / `agent/pre-step` / `system-prompt/assemble` 都在这张表上。[E: packages/core/scope/src/invariant.ts:17] [E: packages/core/scope/src/scoped-events.generated.ts:31] [E: packages/core/scope/src/scoped-events.generated.ts:35] [E: packages/core/scope/tests/invariant.spec.ts:32]

## 设计动机

DSH 主线是 `profile → bundle → agent preset`，capability seam 是 Definition / Provider / Consumer，模型看见的内容必须能从 session log 重建（`model-visible ⟺ logged`）。scope 解决的是 **同一进程里多会话、多 preset 如何共享 host 注册表、又互不污染**：host 面一份 `ctx.tools` / `ctx.systemPrompt`；preset 行往 standing scoped context 注册；Agent 只通过 parent 链接入那份 overlay。

一条 `scopeParents` 链同时服务两个相反方向，是为了让「standing 组合观察它下面每一个 Agent」和「孩子看见祖先注册」共用同一份祖先关系，而不是再维护第二棵树。

`bindScopeParent` 不开放二次绑定：只有原 binder 拿到 `rebind`，roster 才能做空白会话换 preset，外面的插件不能把一个正在跑的 Agent 挪到另一份 composition。成环检查是因为每个消费者都 `get` 到根。

`leakedServices` 把 isolate 做成 mount 时的 fail-closed：preset 若把服务 publish 进 root realm，第二个会话再 mount 同一 preset 会撞名。需要私有实例的行必须写 `isolate: { …: true }`；registry / sandbox / approval / subagent **backends** 留在 host，preset 只挂 Consumer 工具行。

## Gotcha

- **没有 `ctx.scope`。** 到处 `import { createScope } from '@deepseek-ai/dsh-scope'`。bundle 里也没有 `dsh-scope` 插件行。
- **浏览器半边另有一个 `createScope`。** `packages/client/runtime/src/client/agents/scope.ts` 用 `SessionId` 当 tag，filter 只认 exact key 或 untagged，**没有** `bindScopeParent` / 祖先链。不要和本包混用。[E: packages/client/runtime/src/client/agents/scope.ts:55]
- **事件向上、注册向下。** ancestor listener 收 descendant emit；descendant listener 不收 ancestor emit。`peek` 看不到祖先层。
- **waterfall 不调 `next()` = 否决整条链**，包括 inner 默认（pre-execute 的 allow、execute 的 tool body、assemble 的原 assembly）。
- **`{ global: true }` 监听跳过 scope filter**，会听到外键 dispatch。
- **`tools.presentAs` / `tools.restrict` 必须在 scoped context。** 全局呈现是 host `tools` 行的 `mode` config，不是 `presentAs`。[E: packages/core/tools/src/index.ts:948]
- **`rebind` 不读 log。** 半会话换 preset 会留下新组成无法兑现的已记录 tool call。
- **isolate ≠ scope。** isolate 换的是 `provide` 的 symbol；scope 换的是注册层与事件 filter。两者在 `mountPreset` 相遇。
- **untagged 注册进 global 层**，每个 viewing scope 都看得到。headless 正靠这一层，不靠 parent 链。

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-scope`：`Scope`、`ScopeKey`、`Scoped<T>`、`ScopedLayers` | 无。不是服务 | 无独立 `cordis.patch.yml` 行 |
| Provider（mint） | `createScope` 调用方：`ReactLoopAgent`（key = live `Agent`）；`AgentPresets.ensureStanding`（key = `{ agentPreset }`） | 无 | host `agent-loop`（`agents: []`，Web 不在进程级造 Agent）；web 另挂 `agent-presets` |
| Provider（parent） | `bindScopeParent`；binding 只由 `AgentPresets` 持有 | `ctx.agentPresets` | web 的 `agent-presets` 行；headless 不挂，无 join |
| Consumer（注册视图） | `ToolRuntime` / `SystemPrompt` 的 `ScopedLayers` | `ctx.tools` / `ctx.systemPrompt` | host `tools` / `system-prompt`；preset 行往 standing / agent scoped ctx `register` |
| Consumer（事件 / waterfall） | `scopeTarget` + `agentEvents` | 无 | `tools/pre-execute`、`tools/execute`、`system-prompt/assemble`、`agent/pre-step` 等必须 `next()` |
| Consumer（isolate 门） | `leakedServices` @ `mountPreset` | 读 `Context.isolate`，不是 `ctx.scope` | preset 组：`isolate: { planMode: true }` / `compaction` / `workflowEngine`；host 服务不要写进 preset |

换一条 host Provider（例如 `ctx.fs`）会带走挂在该键上的 Consumer 工具，但那些工具仍经 `ctx.tools` 的 scoped 视图进模型。scope 不替换 capability seam，只决定 **哪一次会话看见哪一层注册、哪一串 listener 参加 waterfall**。

## Sources

- `packages/core/scope/src/index.ts`
- `packages/core/scope/src/store.ts`
- `packages/core/scope/src/invariant.ts`
- `packages/core/scope/src/scoped-events.generated.ts`
- `packages/core/scope/package.json`
- `packages/core/scope/tests/scope.spec.ts`
- `packages/core/scope/tests/store.spec.ts`
- `packages/core/scope/tests/invariant.spec.ts`
- `packages/preset/agent-presets/src/mount.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/tests/mount.spec.ts`
- `packages/core/agent-loop/src/agent.ts`
- `packages/core/agent/src/dispatch.ts`
- `packages/core/tools/src/index.ts`
- `packages/core/system-prompt/src/index.ts`
- `packages/subagent/subagent/src/child-agent.ts`
- `packages/client/runtime/src/client/agents/scope.ts`
- `packages/bundle/headless/cordis.patch.yml`
- `vendor/cordis/src/events.ts`
- `vendor/cordis/src/fiber.ts`
- `vendor/cordis/src/context.ts`
- `vendor/cordis/src/registry.ts`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`

## 相关

- [spine.overview](../../spine/overview.md) — Cordis 组合运行时总览（host 面 vs agent-preset 面）
- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 启动层序
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 与 isolate 门
- [spine.turn-and-step](../../spine/turn-and-step.md) — turn / step 里 `assemble` 与 tool waterfall 的位置
- [subsys.core.tools](./tools.md) — host 面 `ctx.tools` 注册表与执行管线
- [subsys.core.system-prompt](./system-prompt.md) — `system-prompt/assemble` waterfall
- [subsys.core.agent-loop](./agent-loop.md) — 默认 loop：铸 Agent scope、驱动 turn
- [subsys.composition.agent-presets](../composition/agent-presets.md) — standing mount、`bindScopeParent`、`leakedServices`
- [surface.presets.overview](../../surface/presets/overview.md) — shipped preset 成员资格与 picker
