---
id: subsys.core.agent-default-model
title: 默认模型选择
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/agent-default-model/src/index.ts
  - packages/core/agent-default-model/src/invariant.ts
  - packages/core/agent-default-model/tests/agent-default-model.spec.ts
  - packages/core/agent-default-model/package.json
  - packages/core/agent/src/model-selection.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/tests/model-selection.spec.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/bundle/headless/src/index.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings-file/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/llm/llm-deepseek/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/reflect.ts
symbols:
  - ctx.agentDefaultModel
  - AgentDefaultModelConfig
  - currentSelection
related:
  - spine.overview
  - subsys.llm.deepseek
  - subsys.core.agent
  - spine.composition-boot
  - spine.turn-and-step
  - spine.trace-headless-turn
  - subsys.composition.bundle-base
  - surface.providers.deepseek
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.agentDefaultModel` 是 **host 面** 的进程级默认 `ModelSelection`：入口在「还没有会话专属选择」时用它给 **未来新 Agent** 填 `provider` / `model`。它不改已经 running 的 `Agent.options`，也不实现 adapter / retry。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个 coding agent」。capability seam 是 Definition / Provider / Consumer。本服务坐在 **host 面**（和 `sessions` / `llm` / `settings` 同一层），不进 agent-preset 的 tools / persona / isolate 树。进入模型请求的 `provider` / `model` 必须能从 session log 的 `request/header` 重建（`model-visible ⟺ logged`）；本服务只提供「下一个新 Agent 从哪起」。

## 能回答的问题

- 新 Agent 的 `provider` / `model` 从哪读？composition config 还是 settings 命名空间 `agent-default-model`？
- `currentSelection()` / `saveSelection()` 各写读哪一层？没挂 `ctx.settings` 会怎样？
- `dsh-base` 行上的默认值是什么，和 `deepseek-official` 路由怎么对上？
- `saveSelection` 会不会改已经 running 的 `Agent.options`？Web 空白会话为什么又能读到新默认？
- 这行为什么必须留在 host 面？preset 再挂一次会撞 `leakedServices` 还是 `already registered`？
- `installModelSelection` 的 `system-prompt/assemble` / `agent/request` waterfall 为什么必须 `next()`？

## 职责边界

本包 `@deepseek-ai/dsh-agent-default-model` 拥有： [E: packages/core/agent-default-model/package.json:2]

- 服务键 `ctx.agentDefaultModel`（类 `AgentDefaultModelConfig`）。 [E: packages/core/agent-default-model/src/index.ts:73]
- 组合 `Config`：必填 `provider` + `model`。 [E: packages/core/agent-default-model/src/index.ts:66] [E: packages/core/agent-default-model/src/index.ts:67]
- `Config` 接口只有 `provider` 与 `model`，没有 `reasoningEffort` 字段。 [E: packages/core/agent-default-model/src/index.ts:43] [E: packages/core/agent-default-model/src/index.ts:45]
- settings 命名空间 `agent-default-model`。 [E: packages/core/agent-default-model/src/index.ts:21]
- settings schema 另有可选 `reasoningEffort: z.string()`。 [E: packages/core/agent-default-model/src/index.ts:37]
- 只读投影 `currentSelection()` 与整段写入 `saveSelection()`。

本包 **不** 拥有：

- `Agent` 合同、`ctx.agents` 工厂槽、`Agent.options` 的生命周期 — [subsys.core.agent](./agent.md)。
- 每会话 `ModelSelectionRef` 与 `installModelSelection` 的 waterfall 挂钩（符号在 `@deepseek-ai/dsh-agent`，入口在 create `setup` 里装）。
- `deepseek-official` 适配器、catalog、key、retry — [subsys.llm.deepseek](../llm/deepseek.md)。本页不展开 adapter。
- session `request/header` 折叠与 `deriveMessages()` — [spine.turn-and-step](../../spine/turn-and-step.md)。
- preset 成员资格、standing mount、`leakedServices` 审计实现 — [subsys.composition.bundle-base](../composition/bundle-base.md) / agent-presets。
- Codex / Claude 子代理后端。`dsh-base` **没有** `subagent-codex` / `subagent-claude-code` 行，也不是「装了但 dormant」：`base.spec.ts` 要求这两行长度为 0，且 manifest 不依赖对应包。 [E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]

companion `./invariant` 的 installer 是空函数：可变值已经由 settings schema 在 `currentSelection()` 能读到之前校验。 [E: packages/core/agent-default-model/src/invariant.ts:22]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/agent-default-model/src/index.ts` | `AgentDefaultModelConfig`：publish `agentDefaultModel`，叠 composition / settings |
| `packages/core/agent-default-model/src/invariant.ts` | 空 invariant companion，占名 |
| `packages/core/agent-default-model/tests/agent-default-model.spec.ts` | 有/无 settings、partial overlay、detach、清 effort |
| `packages/core/agent-default-model/package.json` | 包名 `@deepseek-ai/dsh-agent-default-model` |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: agent-default-model` 的默认 `provider` / `model` |
| `packages/settings/settings/src/index.ts` | `installSettingsSection`：`base` = composition entry；无 provider 则不注册 |
| `packages/settings/settings-file/src/index.ts` | 默认文档 `$DSH_HOME/settings.yaml` |
| `packages/core/agent/src/model-selection.ts` | 每会话 `installModelSelection`：assemble / request 必须 `next()` |
| `packages/host/apiproxy/src/api-proxy.ts` | Web：create 快照 + 空白会话 live 读 + `selectModel` 回写默认 |
| `packages/bundle/headless/src/index.ts` | headless-runner：create 时读一次，装进 `agentOptions` 与 `ModelSelectionRef` |

## 数据模型

四个名字不要混：yml `id: agent-default-model`、包 `@deepseek-ai/dsh-agent-default-model`、ctx 键 `agentDefaultModel`、settings 命名空间 `agent-default-model`。

| 符号 | 字段 | 必填 | 含义 |
|---|---|---|---|
| `Config` | `provider`, `model` | 是 | 组合行；不能写 effort |
| `AgentDefaultModelSettings` | `provider`, `model`, `reasoningEffort?` | 前两 | settings 文档段；effort 是普通 `string` |
| `ModelSelection` | `provider`, `model`, `reasoningEffort?` | 前两 | Agent 面；effort 经 `ReasoningEffortId()` brand |
| `ModelSelectionRef` | `current`, `assembled` | — | 入口持有的可变选择；`assembled` 是进 assemble 时的快照 |

`selection()` 每次返回新对象：有 `reasoningEffort` 才展开该键，并用 `ReasoningEffortId` brand。 [E: packages/core/agent-default-model/src/index.ts:53]

`Agent.options` 是 handle 上的 `AgentOptions`（`provider?` / `model?` / `maxTokens?`），不是本服务的 live 视图。 [E: packages/core/agent/src/runtime-types.ts:68] [E: packages/core/agent/src/runtime-types.ts:24]

settings 解析是 `schema(mergeLayers(base, section))`：schema 默认，再 composition `base`，再用户段。`replace` 把用户层整段换成 snapshot，缺的键在 `mergeLayers` 里退回 `base`。 [E: packages/settings/settings/src/index.ts:708] [E: packages/settings/settings/src/index.ts:631]

## 控制流

```mermaid
flowchart TD
  Base["dsh-base id agent-default-model"] --> Ctor["AgentDefaultModelConfig source=entry"]
  Ctor --> Inject{"ctx.settings mounted?"}
  Inject -->|no| Comp["currentSelection = composition"]
  Inject -->|yes| Reg["register ns agent-default-model base=entry"]
  Reg --> Live["currentSelection = scope.get live"]
  Comp --> Entry["headless / apiproxy read"]
  Live --> Entry
  Entry --> Create["agents.create agentOptions snapshot"]
  Create --> Setup["setup: installModelSelection"]
  Setup --> Assemble["system-prompt/assemble next then snapshot assembled"]
  Assemble --> Request["agent/request next then overlay assembled"]
  Request --> Header["request/header logged"]
  Save["saveSelection"] --> Opt{"settings?"}
  Opt -->|no| Noop["keep composition"]
  Opt -->|yes| Replace["settings.replace ns"]
  Replace --> Live
```

1. `dsh-base` 在 host 根 insert 挂 `id: agent-default-model`，`name: '@deepseek-ai/dsh-agent-default-model'`，`config.provider: deepseek-official`，`config.model: deepseek-v4-flash`。该行只有 `id` / `name` / `config`，没有 `isolate:`，服务进 root realm。web-app / headless **不**再 patch 这行。`agent-loop` 的 `agents: []` 表示 base 不在 boot 时按 config 造 Agent，默认只在入口 `create` 时被读。 [E: packages/bundle/base/cordis.patch.yml:63] [E: packages/bundle/base/cordis.patch.yml:64] [E: packages/bundle/base/cordis.patch.yml:66] [E: packages/bundle/base/cordis.patch.yml:67] [E: packages/bundle/base/cordis.patch.yml:439]

2. Loader 实例化 `AgentDefaultModelConfig@packages/core/agent-default-model/src/index.ts`。`super(ctx, 'agentDefaultModel')` 把实现 publish 到当前 isolate 表；host 根上 `root[symbols.isolate][name] ??= Symbol(name)`，同名二次 publish 抛 `service "agentDefaultModel" has been registered at <…>`。构造函数把 composition 收成 `entry`，`this.source = () => entry`，再 `installSettingsSection`。`onChange` 是空函数：没有任何 registration-level 缓存要重建。 [E: packages/core/agent-default-model/src/index.ts:73] [E: vendor/cordis/src/reflect.ts:286] [E: vendor/cordis/src/reflect.ts:290] [E: packages/core/agent-default-model/src/index.ts:80]

3. `installSettingsSection@packages/settings/settings/src/index.ts` 用 `ctx.inject(['settings'], …)`。从未挂 settings 时这段回调不跑，`source` 一直指向 composition `entry`。挂上则 `settings.register(ns, schema, { base: entry })`，`setSource(() => scope.get())`。用户层 live 叠在 `base` 上：`mergeLayers` 里 `over === undefined` 则保留 `under`，非 plain object（含数组）整段用 `over`，plain object 再递归。file provider 默认路径是 harness home 下的 `settings.yaml`。 [E: packages/settings/settings/src/index.ts:870] [E: packages/settings/settings/src/index.ts:872] [E: packages/settings/settings/src/index.ts:299] [E: packages/settings/settings/src/index.ts:300] [E: packages/settings/settings-file/src/index.ts:56]

4. `currentSelection()@packages/core/agent-default-model/src/index.ts` 只做 `selection(this.source())`，每次新对象。测试钉死：boot 后立刻等于 composition `{ provider: 'deepseek-official', model: 'deepseek-v4-flash' }`；`replace` 只写 `model: 'deepseek-reasoner'` 时 provider 仍来自 `base`。 [E: packages/core/agent-default-model/src/index.ts:89] [E: packages/core/agent-default-model/tests/agent-default-model.spec.ts:47] [E: packages/core/agent-default-model/tests/agent-default-model.spec.ts:75]

5. `saveSelection()@packages/core/agent-default-model/src/index.ts` 走 `this.ctx.get('settings')?.replace(AGENT_DEFAULT_MODEL_SETTINGS_NAMESPACE, { provider, model, reasoningEffort? })`。没有 settings 时 optional call 是 no-op，composition 不变。有 settings 时 `replace` 整段替换用户层：再存一份不带 effort 的 selection，会清掉上次的 effort（缺键退回没有 effort 的 `base`）。settings fiber `dispose` 后 `installSettingsSection` 的 disposer 把 `source` 扳回 `entry`。 [E: packages/core/agent-default-model/src/index.ts:99] [E: packages/core/agent-default-model/tests/agent-default-model.spec.ts:95] [E: packages/core/agent-default-model/tests/agent-default-model.spec.ts:65] [E: packages/settings/settings/src/index.ts:884] [E: packages/core/agent-default-model/tests/agent-default-model.spec.ts:84] [E: packages/core/agent-default-model/tests/agent-default-model.spec.ts:85]

6. **headless 入口** `run@packages/bundle/headless/src/index.ts`：`inject = ['agentDefaultModel', 'agents', 'sessions']`。`currentSelection()` 读一次，写入 `agents.create({ agentOptions: { provider, model } })`，并在 `setup` 里 `installModelSelection(agentCtx, { current: selection, assembled: undefined })`。`inject` 不含 `agentPresets`，setup 只装 model selection；这份 selection 在该进程的这一次 create 之后不再重读。 [E: packages/bundle/headless/src/index.ts:28] [E: packages/bundle/headless/src/index.ts:106] [E: packages/bundle/headless/src/index.ts:117]

7. **Web 入口** `ApiProxyService@packages/host/apiproxy/src/index.ts` 的 `static inject` 含 `'agentDefaultModel'`，构造时把 `defaultModelSelection: () => ctx.agentDefaultModel.currentSelection()` 与 `saveDefaultModelSelection: selection => ctx.agentDefaultModel.saveSelection(selection)` 交给 `createApiProxy`。`agentOptions()` 每次 create/resume **现读**默认，只取 `provider` / `model` 填 `AgentOptions`（effort 不进 `Agent.options`）。`host.describe` 同样现读，作为「下一个新会话会用的默认」。 [E: packages/host/apiproxy/src/index.ts:71] [E: packages/host/apiproxy/src/index.ts:99] [E: packages/host/apiproxy/src/api-proxy.ts:1113] [E: packages/host/apiproxy/src/api-proxy.ts:2926]

8. `selectionFor@packages/host/apiproxy/src/api-proxy.ts` 给每个 live `Agent` 装一份 `ModelSelectionRef`（WeakMap）。**每次**读 `current`：进程内 `picked` → 否则 `session.requestHeader()?.config` → 否则再调 `defaults.defaultModelSelection()`。还没有 `request/header` 的会话因此会吃到 create **之后**才 `saveSelection` 的值；已经打过 header 的会话跟 log，不跟默认。`composeAgent` 在无 roster 与有 roster 两条路上都先 `installSelection`。 [E: packages/host/apiproxy/src/api-proxy.ts:1160] [E: packages/host/apiproxy/src/api-proxy.ts:1163] [E: packages/host/apiproxy/src/api-proxy.ts:1164] [E: packages/host/apiproxy/src/api-proxy.ts:1235] [E: packages/host/apiproxy/src/api-proxy.ts:1244]

9. `sessions.selectModel` 先 `llm.resolveCallConfig`，再 `selectionFor(agent).current = selected`（改 **这个** 会话的 ref），然后 `saveDefaultModelSelection?.(selected)`（改 **未来** Agent 的默认）。save 失败只 `logger.warn`，本会话切换仍然生效。这不是改 `Agent.options`。 [E: packages/host/apiproxy/src/api-proxy.ts:2289] [E: packages/host/apiproxy/src/api-proxy.ts:2314] [E: packages/host/apiproxy/src/api-proxy.ts:2316] [E: packages/host/apiproxy/src/api-proxy.ts:2318]

10. **waterfall 必须 `next()`。** `Events.waterfall@vendor/cordis/src/events.ts` 把最后一个参数当 innermost `next`：listener 不调用传入的 `next()` 就不会 `cbs.shift()`，内层 listener 和 inner seed 全部停住。`installModelSelection` 在 **agent 作用域** 上挂两条：`system-prompt/assemble` 先 `const selected = selection.current`，再 `await next()`，然后才写 `selection.assembled = selected` 并覆盖 `variables.provider/model`；`agent/request` 先 `await next()` 拿到 seed `LlmCallConfig`，再用 **`assembled`**（不是此时的 `current`）覆盖 `provider` / `model`，并在缺 effort 时拆掉继承来的 `reasoningEffort`。并发切模型不会把「prompt 变量」和「请求路由」撕成两半。测试：assemble 后把 `current` 改成 `beta`，紧接着的 `agent/request` 仍走 assemble 时的 `alpha`。 [E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:238] [E: packages/core/agent/src/model-selection.ts:42] [E: packages/core/agent/src/model-selection.ts:57] [E: packages/core/agent/src/model-selection.ts:58] [E: packages/core/agent/tests/model-selection.spec.ts:33] [E: packages/core/agent/tests/model-selection.spec.ts:38]

11. `ReactLoopAgent.buildRequest@packages/core/agent-loop/src/agent.ts` 先用 `this.options.provider/model`（create 时写入的 `AgentOptions`）组成 `route`。`seedConfig` 不是永远这份 create 快照：本实例还没 append 过 `request/header` 时，seed 是 `route`（可加同 route 才继承的 effort 与 `options.maxTokens`）；`requestHeaderLogged` 之后则 `requestProposal(persistedHeader)`，从已 logged 的 header 去掉 adapter-derived 的 effort / maxTokens，不再读 `this.options`。`deepFreeze(structuredClone(…))` 冻住 seed，再 `dispatch.waterfall('agent/request', …, () => seedConfig)`。没有 `installModelSelection` 时，请求停在这条 seed。loop 还往 `ctx.systemPrompt` 注册变量 `provider` / `model`，读的是 `context.agent?.options`（create 快照）；Web / headless 靠 assemble waterfall 用 `ModelSelectionRef` 覆盖同名变量。缺 `provider`/`model` 时 loop 抛 `has no provider/model`。 [E: packages/core/agent-loop/src/agent.ts:421] [E: packages/core/agent-loop/src/agent.ts:428] [E: packages/core/agent-loop/src/agent.ts:429] [E: packages/core/agent-loop/src/agent.ts:431] [E: packages/core/agent-loop/src/agent.ts:55] [E: packages/core/agent-loop/src/agent.ts:58] [E: packages/core/agent-loop/src/agent.ts:438] [E: packages/core/agent-loop/src/agent.ts:444] [E: packages/core/agent-loop/src/index.ts:351]

12. **isolate / `leakedServices`。** 本行是 host 服务，yml 不写 `isolate`。preset 再挂 `@deepseek-ai/dsh-agent-default-model` 且不 `isolate: { agentDefaultModel: true }`：host 已占用 root 符号时，步骤 2 的 `provide` 先抛 already registered；若 root 上还没有这键、preset 子树却写进 `rootIsolate[name]`，`leakedServices@packages/preset/agent-presets/src/mount.ts` 会扫到该 name 并抛 `row(s) published process-global service(s) […]; a preset service must sit behind an isolate realm or move to the host composition`。shipped `minimal` / `standard` / `code` / `cordis` 的 `agent.cordis.yml` **没有** 这行。需要进程级一份默认，就留在 host；不要为了「每会话一份」去 isolate 它。 [E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:364]

默认路由名 `deepseek-official` 与 catalog 里的 `deepseek-v4-flash` 由 `dsh-llm-deepseek` 注册。 [E: packages/llm/llm-deepseek/src/index.ts:47] [E: packages/llm/llm-deepseek/src/index.ts:50] `AgentDefaultModelConfig` 没有 `static inject`、构造函数也不碰 `ctx.llm`，所以本服务不查 catalog、不碰 key。 [I]

## 设计动机

- **一个 owner，两条入口。** headless 没有 HTTP，Web 有 `api-gateway`。两边都读 `ctx.agentDefaultModel`，避免 launcher / Host / loop 各写一份默认。 [I]
- **没有 settings 也能 boot。** composition 行是完整 `Config`；`installSettingsSection` 把 settings 当成可选层，而不是硬 `static inject`。headless 测试台可以只 `provide` 一个假 `currentSelection`。
- **`reasoningEffort` 故意不进组合 Config。** 完整 `saveSelection` 必须能清掉 effort（下一模型没有这项）；若 composition 也带 effort，`replace` 缺键时会从 `base` 再继承回来。
- **默认 ≠ 正在跑的 Agent。** 服务只存「下一个 create 读什么」。已经 running 的路由走 `buildRequest` 的 `seedConfig`（首次用 create 时 `Agent.options`，`requestHeaderLogged` 之后用 `requestProposal(persistedHeader)`）+ 每会话 `ModelSelectionRef` 覆盖。`model-visible ⟺ logged`：真正进 adapter 的 pair 落在 `request/header`，不落在 settings 文档。
- **空白会话现读。** Web New Session 复用 id 而不 mint 新 session 时，create-time 快照会过期；`selectionFor` 在没有 header 时每次回默认，和 `host.describe` 同一数据源。

## Gotcha

- **三个名字。** yml id / settings ns 是 kebab `agent-default-model`；ctx 键是 camel `agentDefaultModel`；包名带 `dsh-` 前缀。
- **`saveSelection` 在无 settings 时静默成功。** `?.replace` 不抛；测试里 `saveSelection({ provider: 'other', model: 'other' })` 之后 `currentSelection` 仍是 composition。
- **本服务不改 `Agent.options`。** Web `selectModel` 改的是 `selectionFor` 的 `picked` 外加默认文档；loop 若没装 `installModelSelection`，下一步停在 `seedConfig`：首次是 create 时 `Agent.options`，已经 logged `request/header` 之后是 `requestProposal(persistedHeader)`。
- **已有 `request/header` 的会话不跟默认走。** `selectionFor` 在 `picked` 为空时优先 log。切默认只影响空白会话和未来 create。
- **assemble / request 用的不是同一瞬间的 `current`。** 只认 `assembled`。listener 若漏掉 `next()`，整条 `system-prompt/assemble` 或 `agent/request` 链停在本层，inner seed（`seedConfig`）到不了 loop。
- **不校验 catalog。** 存一个未注册的 `provider` 也能 `currentSelection` 成功；真正失败发生在 `llm.resolveCallConfig` / `prepareCall`（Web `selectModel` 会先 resolve，create 路径不一定）。
- **`onChange` 为空。** settings 热更新立刻反映在下一次 `currentSelection()`，没有 route 重注册。
- **不要把这行搬进 preset。** isolate 一份会让每个 standing mount 各有默认，入口读到的不再是进程级选择；不 isolate 则 `leakedServices` 或 already registered。
- **`dsh-base` 不 dormant 加载 Codex / Claude 子代理。** 和本行无关，但同一份 host insert 里不要按 README 写成「后端装着、preset 再 disable」。 [E: packages/bundle/base/tests/base.spec.ts:39]

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-agent-default-model` 的 `AgentDefaultModelConfig`、`Context.agentDefaultModel`、`currentSelection` / `saveSelection` | `agentDefaultModel` | 无（类型与服务名在包内 `declare module`） |
| Provider | 同包 default export；live 层依赖 `@deepseek-ai/dsh-settings-file` | `agentDefaultModel`（实现）；可选 `settings` | **host** `dsh-base`：`id: agent-default-model`（`provider: deepseek-official`, `model: deepseek-v4-flash`）+ `id: settings`。**无** preset 行，**无** `isolate` |
| Consumer | `@deepseek-ai/dsh-host-apiproxy`（`defaultModelSelection` / `saveDefaultModelSelection`）；`@deepseek-ai/dsh-headless` runner；每会话 `installModelSelection`（`dsh-agent`）把选择折进 assemble / request | `agentDefaultModel`（`static inject` / `export const inject`）；agent 作用域事件 | web-app `id: api-gateway`；headless `id: headless-runner`。shipped preset **不**消费此服务 |

换掉 Provider（换插件占同一 `id: agent-default-model`，或 overlay 整份 `config`）会带走所有入口的默认；不会带走已经打过 `request/header` 的会话。换掉 `id: settings` 只失去 live / persist，composition 行仍可读。

## Sources

- packages/core/agent-default-model/src/index.ts
- packages/core/agent-default-model/src/invariant.ts
- packages/core/agent-default-model/tests/agent-default-model.spec.ts
- packages/core/agent-default-model/package.json
- packages/core/agent/src/model-selection.ts
- packages/core/agent/src/runtime-types.ts
- packages/core/agent/tests/model-selection.spec.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/bundle/headless/src/index.ts
- packages/host/apiproxy/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings-file/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/llm/llm-deepseek/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/reflect.ts

## 相关

- [spine.overview](../../spine/overview.md) — Cordis 组合主线、host 面 vs agent-preset 面、`model-visible ⟺ logged`。
- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset`；`dsh-base` 是第一层 insert。
- [spine.turn-and-step](../../spine/turn-and-step.md) — `agent/request` waterfall 与 `ReactLoopAgent.buildRequest`。
- [spine.trace-headless-turn](../../spine/trace-headless-turn.md) — headless 读 `currentSelection()` 再 `agents.create`。
- [subsys.llm.deepseek](../llm/deepseek.md) — `deepseek-official` 适配器与 catalog（含 `deepseek-v4-flash`）。
- [subsys.core.agent](./agent.md) — `Agent` / `AgentOptions` / `ctx.agents` 合同；本服务不实现 loop。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — host insert 全表；无 Codex / Claude 后端行。
- [surface.providers.deepseek](../../surface/providers/deepseek.md) — 模型可见路由名 `deepseek-official`。
