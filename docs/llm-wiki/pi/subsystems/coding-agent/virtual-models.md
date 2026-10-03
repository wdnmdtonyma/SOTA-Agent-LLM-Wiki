---
id: subsys.coding-agent.virtual-models
title: Virtual models 路由
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/virtual-models.ts
  - packages/coding-agent/src/core/model-runtime.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session-services.ts
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/core/model-resolver.ts
  - packages/coding-agent/src/core/usage-totals.ts
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/src/core/tools/read.ts
  - packages/coding-agent/src/index.ts
  - packages/coding-agent/src/modes/interactive/components/footer.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/test/virtual-models.test.ts
  - packages/coding-agent/test/suite/virtual-models.test.ts
  - packages/agent/src/agent-loop.ts
  - packages/ai/src/types.ts
  - packages/ai/src/api/transform-messages.ts
  - packages/ai/src/utils/model-operations.ts
symbols:
  - VIRTUAL_MODEL_API
  - VIRTUAL_MODEL_STATE_ENTRY
  - isVirtualModel
  - createVirtualModel
  - withVirtualModels
  - getBranchSelection
  - getVirtualModelState
  - findLatestResponse
  - ModelRouteReason
  - ModelRouteRequest
  - ModelRoute
  - VirtualModelDefinition
  - VirtualModelStateData
  - ModelRuntime.registerVirtualModel
  - ModelRuntime.resolveModel
  - ModelRuntime.streamSimple
related:
  - subsys.coding-agent.model-registry
  - subsys.coding-agent.model-resolver
  - surface.providers.overview
  - ref.ai.model-catalog
  - subsys.coding-agent.agent-session
  - subsys.coding-agent.session-manager
  - surface.extensions.contribution-points
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> Virtual model 是 coding-agent catalog 里可选的 `api: "pi-virtual"` 条目：selection（`model_change`、`agent.state.model`、`ctx.model`）可以叫它；每次请求由 `route()` 映射到有凭证的物理模型。Providers 只 stream 物理模型；routing 之后 `pi-virtual` 永远不会到达 provider。

## 能回答的问题

- `VIRTUAL_MODEL_API` / `VIRTUAL_MODEL_STATE_ENTRY` 各写在哪、谁消费？
- `ModelRuntime` 怎样把 virtual model 装进 provider catalog（`withVirtualModels`）？
- selection 与 dispatch 分别记在 session 的什么 entry 上？
- `route()` 的 `user` / `continuation` / `retry` / `direct` 何时触发？
- session branch 上的 router state 何时写入、fork/`/tree` 会不会跟错枝？
- 为什么 `stream()` 打 virtual model 会失败，而 `streamSimple()` 会先 route？
- resume 如何恢复 virtual selection，注销后又怎样 fallback 到最后一次物理回答？

## 职责边界

`packages/coding-agent/src/core/virtual-models.ts` 定义 catalog 形态、session 上的 selection/state lookup，以及把 virtual 条目叠进 `Provider` 的 `withVirtualModels()`。[E: packages/coding-agent/src/core/virtual-models.ts:29] [E: packages/coding-agent/src/core/virtual-models.ts:32] [E: packages/coding-agent/src/core/virtual-models.ts:201]

`ModelRuntime` 是唯一持有 `route` 闭包的地方：`registerVirtualModel()` 写入 `virtualModels` map，`recomposeProvider()` 用 `withVirtualModels()` 叠进 `pi-ai` `Models`，`resolveModel()` 调 router 并校验目标是有凭证的物理 chat model。[E: packages/coding-agent/src/core/model-runtime.ts:179] [E: packages/coding-agent/src/core/model-runtime.ts:293] [E: packages/coding-agent/src/core/model-runtime.ts:955] [E: packages/coding-agent/src/core/model-runtime.ts:994]

`ModelRegistry` 只把 `registerVirtualModel` / `unregisterVirtualModel` / `stream` / `streamSimple` 转给 `ModelRuntime`，给 extension 同步 facade。[E: packages/coding-agent/src/core/model-registry.ts:225] [E: packages/coding-agent/src/core/model-registry.ts:229] [E: packages/coding-agent/src/core/model-registry.ts:129] [E: packages/coding-agent/src/core/model-registry.ts:138]

`AgentSession._installAgentRequestProjection()` 在 agent loop 的 `prepareRequest` 里做 per-request 路由，selection 留在 `agent.state.model`；assistant message 记下物理 `provider` / `api` / `model`。[E: packages/coding-agent/src/core/agent-session.ts:786] [E: packages/coding-agent/src/core/agent-session.ts:794] [E: packages/coding-agent/src/core/agent-session.ts:814]

本节点不枚举 built-in provider 或 generated chat catalog：那是 [surface.providers.overview](../../surface/providers/overview.md) 与 [ref.ai.model-catalog](../../reference/model-catalog.md)。Virtual model **不在** `KnownApi` 十个 wire API 里；`Api` 允许任意 string，`pi-virtual` 是 coding-agent 自己的 sentinel。[E: packages/ai/src/types.ts:17] [E: packages/ai/src/types.ts:29] [E: packages/coding-agent/src/core/virtual-models.ts:29]

## 关键文件

- `packages/coding-agent/src/core/virtual-models.ts`：`VIRTUAL_MODEL_API`、`VIRTUAL_MODEL_STATE_ENTRY`、`createVirtualModel`、`withVirtualModels`、`getBranchSelection`、`getVirtualModelState`、`isVirtualModel`。
- `packages/coding-agent/src/core/model-runtime.ts`：`virtualModels` map、`registerVirtualModel`、`resolveModel`、`streamSimple` 的 `direct` 路由、`getPhysicalModel`。
- `packages/coding-agent/src/core/model-registry.ts`：extension 兼容 facade。
- `packages/coding-agent/src/core/agent-session.ts`：agent-loop `prepareRequest` 路由、branch state、`routedModel`、compaction 对 routed model 的检查。
- `packages/coding-agent/src/core/sdk.ts`：resume 用 `getBranchSelection` 恢复 selection。
- `packages/coding-agent/src/core/extensions/loader.ts` / `runner.ts`：`pi.registerVirtualModel()` 排队、reload、把 `route(request, ctx)` 绑到 `ExtensionContext`。
- `packages/coding-agent/src/modes/interactive/components/footer.ts`：footer 显示 `selection → routed`。
- `packages/coding-agent/test/virtual-models.test.ts`、`test/suite/virtual-models.test.ts`：注册、clamp、resume、reason、state、compaction。

## 数据模型

`VIRTUAL_MODEL_API` 是 `"pi-virtual"`。`isVirtualModel(model)` 只看 `model.api === VIRTUAL_MODEL_API`。[E: packages/coding-agent/src/core/virtual-models.ts:29] [E: packages/coding-agent/src/core/virtual-models.ts:105] [E: packages/coding-agent/src/core/virtual-models.ts:106]

`VIRTUAL_MODEL_STATE_ENTRY` 是 `"pi.virtual-model-state"`。对应 custom entry 的 `data` 是 `VirtualModelStateData`：`{ provider, modelId, state }`。[E: packages/coding-agent/src/core/virtual-models.ts:32] [E: packages/coding-agent/src/core/virtual-models.ts:35] [E: packages/coding-agent/src/core/session-manager.ts:1290] [E: packages/coding-agent/src/core/session-manager.ts:1293]

`createVirtualModel()` 造出的 catalog 条目：`api: "pi-virtual"`、`baseUrl: ""`、`cost` 全 0、`contextWindow` / `maxTokens` 默认 0（unset = unknown）、`input` 默认 `["text", "image"]`、`thinkingLevels` 默认 `["off"]`。`reasoning` 在任一 offered level 不是 `"off"` 时为 true。[E: packages/coding-agent/src/core/virtual-models.ts:171] [E: packages/coding-agent/src/core/virtual-models.ts:177] [E: packages/coding-agent/src/core/virtual-models.ts:182] [E: packages/coding-agent/src/core/virtual-models.ts:183] [E: packages/coding-agent/src/core/virtual-models.ts:184] [E: packages/coding-agent/src/core/virtual-models.ts:185] [E: packages/coding-agent/src/core/virtual-models.ts:180]

`VirtualModelDefinition.route` 接收 `ModelRouteRequest`，返回 `ModelRoute`（物理 `model` + `thinkingLevel` + 可选 `state`）。`ModelRouteReason` 是 `"user" | "continuation" | "retry" | "direct"`。[E: packages/coding-agent/src/core/virtual-models.ts:50] [E: packages/coding-agent/src/core/virtual-models.ts:52] [E: packages/coding-agent/src/core/virtual-models.ts:73] [E: packages/coding-agent/src/core/virtual-models.ts:101]

`withVirtualModels(providerId, provider, virtualModels)`：没有底层 provider 时造一个 keyless provider（`auth.apiKey.resolve` 返回 `{ auth: {}, source: "virtual" }`），`stream` / `streamSimple` 都是 `unroutedStream`。有底层 provider 时：virtual id 会藏掉同 id 的物理 **chat** 模型；`stream` / `streamSimple` 在 `isVirtualModel(model)` 时仍走 `unroutedStream`，物理模型才交给原 provider。[E: packages/coding-agent/src/core/virtual-models.ts:206] [E: packages/coding-agent/src/core/virtual-models.ts:210] [E: packages/coding-agent/src/core/virtual-models.ts:218] [E: packages/coding-agent/src/core/virtual-models.ts:234] [E: packages/coding-agent/src/core/virtual-models.ts:236] [E: packages/coding-agent/src/core/virtual-models.ts:192]

`getBranchSelection(branch, getModel)` 从 leaf 往根扫：遇到 `model_change` 就把它当 selection；遇到非 virtual 的 assistant message 时，若它之前最近一次 `model_change` 在 catalog 里仍是 virtual model，则继续持有该 virtual selection，否则用这条物理回答。失败的 routing 会把 virtual model 写在 assistant message 上，`isVirtualModel(entry.message)` 为 true，这条会被跳过。[E: packages/coding-agent/src/core/virtual-models.ts:134] [E: packages/coding-agent/src/core/virtual-models.ts:137] [E: packages/coding-agent/src/core/virtual-models.ts:141] [E: packages/coding-agent/src/core/virtual-models.ts:105] [E: packages/coding-agent/test/virtual-models.test.ts:85]

`findLatestResponse()` 从后往前找 `stopReason` 既不是 `"error"` 也不是 `"aborted"` 的 assistant，所以失败/中止（含失败 routing）不进入 `previous`。[E: packages/coding-agent/src/core/virtual-models.ts:110] [E: packages/coding-agent/src/core/virtual-models.ts:113]

公开包导出 `VIRTUAL_MODEL_STATE_ENTRY`、`VirtualModelDefinition`、`ModelRoute*`；**不**导出 `VIRTUAL_MODEL_API` / `isVirtualModel` / `withVirtualModels`。[E: packages/coding-agent/src/index.ts:398] [E: packages/coding-agent/src/index.ts:402] [E: packages/coding-agent/src/index.ts:403]

## 控制流

1. `pi.registerVirtualModel@loader.ts:500` 把 extension 的 `route(request, ctx)` 包成 `VirtualModelDefinition.route`，`ctx` 每次请求现取 `runtime.createContext()`。[E: packages/coding-agent/src/core/extensions/loader.ts:500] [E: packages/coding-agent/src/core/extensions/loader.ts:506] [E: packages/coding-agent/src/core/extensions/loader.ts:508] bindCore 之前写入 `pendingVirtualModelRegistrations`；`createAgentSessionServices` 与 `ExtensionRunner.bindCore` 都会 flush 到 `ModelRuntime.registerVirtualModel`。[E: packages/coding-agent/src/core/extensions/loader.ts:226] [E: packages/coding-agent/src/core/agent-session-services.ts:182] [E: packages/coding-agent/src/core/agent-session-services.ts:184] [E: packages/coding-agent/src/core/extensions/runner.ts:498] [E: packages/coding-agent/src/core/extensions/runner.ts:504] SDK 也可直接 `modelRuntime.registerVirtualModel(definition)`，不经过 extension。[E: packages/coding-agent/src/core/model-runtime.ts:955]

2. `ModelRuntime.registerVirtualModel@model-runtime.ts:955` 拒绝空 provider/id；若 `getModel(provider, id)` 已存在且 **不是** virtual，抛 `conflicts with a physical model`。[E: packages/coding-agent/src/core/model-runtime.ts:957] [E: packages/coding-agent/src/core/model-runtime.ts:959] [E: packages/coding-agent/src/core/model-runtime.ts:960] [E: packages/coding-agent/test/virtual-models.test.ts:189] 同 provider+id 再注册会替换。然后 `createVirtualModel` + 保存 `route`，`recomposeProvider` 调用 `withVirtualModels`。[E: packages/coding-agent/src/core/model-runtime.ts:963] [E: packages/coding-agent/src/core/model-runtime.ts:293] 纯 virtual provider（`composeProvider` 返回 undefined）立刻把 snapshot 标成 configured，`auth` source 为 `"virtual"`，好让 session restore 在 refresh 完成前通过 `hasConfiguredAuth`。[E: packages/coding-agent/src/core/model-runtime.ts:965] [E: packages/coding-agent/src/core/model-runtime.ts:968] [E: packages/coding-agent/test/virtual-models.test.ts:316]

3. `unregisterProvider@model-runtime.ts:942` 只删 extension/native provider，**不动** `virtualModels`。卸 virtual 必须 `unregisterVirtualModel`。[E: packages/coding-agent/src/core/model-runtime.ts:942] [E: packages/coding-agent/src/core/model-runtime.ts:943] [E: packages/coding-agent/src/core/model-runtime.ts:976] [E: packages/coding-agent/src/core/model-runtime.ts:978]

4. Selection 把 virtual model 当普通 catalog 条目：`--model` / settings / `/model` / scoped models 走 [subsys.coding-agent.model-resolver](model-resolver.md) 的 `findInitialModel` / `resolveCliModel`，它们读 `ModelRuntime.getModels()` / `getAvailable()`，不区分 `pi-virtual`。[E: packages/coding-agent/src/core/model-resolver.ts:420] [E: packages/coding-agent/src/core/model-resolver.ts:369] [E: packages/coding-agent/src/core/model-runtime.ts:441] `ExtensionContext.model` 与 bash 注入的 `PI_MODEL` 也是 selection（virtual id），不是 routed 物理 id。[E: packages/coding-agent/src/core/extensions/runner.ts:906] [E: packages/coding-agent/src/core/extensions/types.ts:339] [E: packages/coding-agent/src/core/tools/bash.ts:205] [E: packages/coding-agent/src/core/tools/bash.ts:206]

5. Resume：`createAgentSession@sdk.ts:203` 用 `getBranchSelection(sessionManager.getBranch(), modelRuntime.getModel)`。若 virtual 仍注册且 provider 有 configured auth，`session.model` 恢复为 virtual；否则 fallback 文案 `Could not restore model …`，后续 `findInitialModel` 或（virtual 已注销时）`getBranchSelection` 落到最后一次物理回答。[E: packages/coding-agent/src/core/sdk.ts:203] [E: packages/coding-agent/src/core/sdk.ts:209] [E: packages/coding-agent/src/core/sdk.ts:210] [E: packages/coding-agent/test/virtual-models.test.ts:293] [E: packages/coding-agent/test/virtual-models.test.ts:325]

6. 每次 user prompt，`AgentSession._runAgentPrompt@_recordSelection`：若当前 branch 隐含的 selection 与 `this.model` 不一致，且至少一侧是 virtual，才 `appendModelChange`。物理 selection 不会在 `prepareRequest` 改写请求模型时被每轮 prompt 重记一次。[E: packages/coding-agent/src/core/agent-session.ts:1779] [E: packages/coding-agent/src/core/agent-session.ts:604] [E: packages/coding-agent/src/core/agent-session.ts:607] [E: packages/coding-agent/src/core/agent-session.ts:608] [E: packages/coding-agent/test/virtual-models.test.ts:424]

7. Agent loop `prepareRequest@agent-loop.ts:219` 把 `requestUpdate.model` 写进 **这一轮** `config.model` 再 `streamAssistantResponse`；`AgentSession` 的 wrapper 在 virtual selection 上调用 `resolveModel`，**不**改 `agent.state.model`。[E: packages/agent/src/agent-loop.ts:219] [E: packages/agent/src/agent-loop.ts:231] [E: packages/coding-agent/src/core/agent-session.ts:786] [E: packages/coding-agent/src/core/agent-session.ts:814] [E: packages/coding-agent/test/suite/virtual-models.test.ts:96] reason：有 `_failedResponse` → `"retry"`；last assistant 之后的投影里存在 `role === "user"` → `"user"`；否则 `"continuation"`。[E: packages/coding-agent/src/core/agent-session.ts:795] [E: packages/coding-agent/test/suite/virtual-models.test.ts:92] [E: packages/coding-agent/test/suite/virtual-models.test.ts:170] extension 在 `before_agent_start` 紧跟 user prompt 塞 custom message 时，slice 里仍有 user，reason 仍是 `"user"`。[E: packages/coding-agent/test/suite/virtual-models.test.ts:190]

8. `ModelRuntime.resolveModel@model-runtime.ts:994`：查出 registered `route`；`previous` 来自 `findLatestResponse` + `getPhysicalModel`；`failed` 仅当失败消息本身是物理模型（routing 失败写的 virtual assistant **没有** `failed`）。[E: packages/coding-agent/src/core/model-runtime.ts:1006] [E: packages/coding-agent/src/core/model-runtime.ts:1009] [E: packages/coding-agent/src/core/model-runtime.ts:1012] [E: packages/coding-agent/test/virtual-models.test.ts:162] [E: packages/coding-agent/test/virtual-models.test.ts:164] 目标必须 `getPhysicalModel` 命中且 `hasConfiguredAuth`；thinking level 经 `clampThinkingLevel`。[E: packages/coding-agent/src/core/model-runtime.ts:1020] [E: packages/coding-agent/src/core/model-runtime.ts:1022] [E: packages/coding-agent/src/core/model-runtime.ts:1023] [E: packages/coding-agent/src/core/model-runtime.ts:1024] [E: packages/coding-agent/test/virtual-models.test.ts:133] route 到另一个 virtual / 未知 id 抛 `which is not a physical model`。[E: packages/coding-agent/test/virtual-models.test.ts:205] `route()` throw 则 agent run 以 error assistant 结束，消息上仍是 virtual `provider/id`，provider **零次**调用。[E: packages/coding-agent/test/suite/virtual-models.test.ts:205] [E: packages/coding-agent/test/suite/virtual-models.test.ts:212]

9. Router `state`：`getVirtualModelState` 从当前 branch 由新到旧找 matching custom entry。`prepareRequest` 仅当 `route.state !== undefined && route.state !== state`（引用不等）时 `appendCustomEntry(VIRTUAL_MODEL_STATE_ENTRY, { provider, modelId, state })`。返回 `request.state` 本身或 `undefined` 不写新 entry；返回新对象即使值相等也会写。entry 在请求发出前写入，之后失败也留在树上，fork / `/tree` 跟 branch。[E: packages/coding-agent/src/core/virtual-models.ts:159] [E: packages/coding-agent/src/core/virtual-models.ts:162] [E: packages/coding-agent/src/core/agent-session.ts:793] [E: packages/coding-agent/src/core/agent-session.ts:801] [E: packages/coding-agent/src/core/agent-session.ts:804] [E: packages/coding-agent/test/suite/virtual-models.test.ts:334]

10. Compaction：prompt 前的 `_compactBeforeNextAssistantResponse` **跳过** virtual selection；threshold 检查发生在 `prepareRequest` 已经选出 `route.model` 之后。超窗则 compact，**不**重新 route。[E: packages/coding-agent/src/core/agent-session.ts:752] [E: packages/coding-agent/src/core/agent-session.ts:810] [E: packages/coding-agent/src/core/agent-session.ts:814] [E: packages/coding-agent/test/suite/virtual-models.test.ts:254] overflow compact-and-retry 把截断/溢出的 assistant 放进 `_failedResponse`，下一轮 reason 是 `"retry"`。[E: packages/coding-agent/src/core/agent-session.ts:2998] [E: packages/coding-agent/test/suite/virtual-models.test.ts:144] Pi 自己生成 summary 时 `_getSummarizationRequestAuth` 先 `resolveModel(..., { reason: "direct" })` 再按物理模型的 `maxTokens` 截输出预算；extension 提供的 summary **不**走 router。[E: packages/coding-agent/src/core/agent-session.ts:555] [E: packages/coding-agent/src/core/agent-session.ts:557] [E: packages/coding-agent/test/suite/virtual-models.test.ts:393] [E: packages/coding-agent/test/suite/virtual-models.test.ts:368]

11. SDK session 的 `streamFn` 是 `modelRuntime.streamSimple`。`prepareRequest` 之后传入的已是物理模型，走普通 `streamSimple` 分支，provider 只看见物理 `api`。[E: packages/coding-agent/src/core/sdk.ts:396] [E: packages/coding-agent/src/core/sdk.ts:406] [E: packages/coding-agent/src/core/model-runtime.ts:736] 若有人把 **virtual** model 直接交给 `streamSimple`（loop 外），runtime 用 `reason: "direct"` 先 route，把 `maxTokens` cap 到 routed `maxTokens`，且当 routed provider ≠ virtual provider 时丢掉 caller 的 `apiKey` / `headers` / `env`。[E: packages/coding-agent/src/core/model-runtime.ts:717] [E: packages/coding-agent/src/core/model-runtime.ts:722] [E: packages/coding-agent/src/core/model-runtime.ts:727] [E: packages/coding-agent/src/core/model-runtime.ts:732] [E: packages/coding-agent/test/virtual-models.test.ts:228] [E: packages/coding-agent/test/virtual-models.test.ts:249] `direct` **不**传 `state`，返回的 state 也被忽略。[E: packages/coding-agent/test/suite/virtual-models.test.ts:342]

12. `ModelRuntime.stream()` / `ModelRegistry.stream()` **没有** virtual 分支：`prepareRequest` 后调用 wrapped provider 的 `stream`，命中 `unroutedStream`，error message 含 `must be routed before streaming`。[E: packages/coding-agent/src/core/model-runtime.ts:697] [E: packages/coding-agent/src/core/model-runtime.ts:703] [E: packages/coding-agent/src/core/virtual-models.ts:192] [E: packages/coding-agent/test/virtual-models.test.ts:260]

## 选择 vs 派发

| 层 | 记在哪 | 用户/extension 看见 |
|---|---|---|
| Selection | `model_change`、`agent.state.model`、`ctx.model`、`PI_MODEL` | `/model`、footer 左侧 id、settings |
| Dispatch | 每条成功 assistant：`provider`、`api`、`model`、`thinkingLevel` | footer `→ routed.id`、`/session` 按物理 key 拆 cost |

`AgentSession.routedModel` 仅在当前 selection 是 virtual 时，用 `findLatestResponse` + `getPhysicalModel` 给出最近一次成功物理模型。[E: packages/coding-agent/src/core/agent-session.ts:1422] [E: packages/coding-agent/src/core/agent-session.ts:1423] [E: packages/coding-agent/src/core/agent-session.ts:1425] footer 在 `routed` 存在时追加 ` → ${routed.model.id}`，若有 `thinkingLevel` 再加 ` • ${level}`。[E: packages/coding-agent/src/modes/interactive/components/footer.ts:241] [E: packages/coding-agent/src/modes/interactive/components/footer.ts:244]

Context / compaction 窗口用 `_limitsModel()` = `routedModel?.model ?? this.model`。没有成功物理回答时才用 virtual 自己声明的 `contextWindow`（默认 0 表示 unknown，`getContextUsage` 直接 undefined）。[E: packages/coding-agent/src/core/agent-session.ts:612] [E: packages/coding-agent/src/core/agent-session.ts:613] [E: packages/coding-agent/src/core/agent-session.ts:4188] [E: packages/coding-agent/src/core/agent-session.ts:4193] [E: packages/coding-agent/test/suite/virtual-models.test.ts:99] 失败 routing 的 assistant 叫 virtual，但 limits 仍跟上次成功的物理模型。[E: packages/coding-agent/test/suite/virtual-models.test.ts:214]

`/session` 的 cost 拆分走 `getUsageCostBreakdown`：assistant 用 `provider/responseModel??model`（物理），`usage` entry 用它自己的 `provider/model`。[E: packages/coding-agent/src/core/usage-totals.ts:67] [E: packages/coding-agent/src/core/usage-totals.ts:68] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6630] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6680]

## 设计动机与权衡

Virtual model 把“用户选一个名字”和“这一请求打哪个 vendor/api”拆开：router 可按 task、thinking level、classifier、或 branch state 换物理模型，而不把 `pi-virtual` 送进任何 wire implementation。[E: packages/coding-agent/src/core/virtual-models.ts:29] [E: packages/coding-agent/src/core/model-runtime.ts:1022] [I]

Assistant 记物理模型，所以跨物理模型 replay 等价于手动切模型；resume 必须从 `model_change` 还原 virtual，因为回答里已经没有 virtual id。[E: packages/coding-agent/src/core/sdk.ts:203] [E: packages/coding-agent/src/core/virtual-models.ts:134] [I]

`continuation` / `retry` 默认 sticky 到 `previous` / `failed` 是 router 的惯例（suite 测试的 `defaultRoute`），runtime **不**强制；强制的是：目标必须是有凭证的物理模型，且不能再 route 到 virtual。[E: packages/coding-agent/src/core/model-runtime.ts:1022] [E: packages/coding-agent/test/suite/virtual-models.test.ts:24] [I]

## Gotcha

- Catalog refresh 之后若物理 chat 模型撞上已注册的 virtual id，`withVirtualModels` 的 `physical()` filter 会藏掉物理条目，virtual 赢。[E: packages/coding-agent/src/core/virtual-models.ts:218] 注册当时若物理已存在则直接 throw，不会并存。[E: packages/coding-agent/src/core/model-runtime.ts:959]
- `stream()`（API-specific options）打 virtual 一定失败；extension 应 `ctx.modelRegistry.streamSimple()` 或让 agent loop 的 `prepareRequest` 来 route。[E: packages/coding-agent/test/virtual-models.test.ts:260] [E: packages/coding-agent/src/core/model-registry.ts:138]
- `ctx.model.input` 默认含 image，所以 `read` 工具按 selection 可能仍读图；真正发给 vendor 时 `downgradeUnsupportedImages` 看的是 **物理** model 的 `input`。[E: packages/coding-agent/src/core/virtual-models.ts:182] [E: packages/coding-agent/src/core/tools/read.ts:60] [E: packages/ai/src/api/transform-messages.ts:35] [E: packages/ai/src/api/transform-messages.ts:36]
- Auto-retry 把失败 assistant 放进 `_failedResponse` 再 `continue()`；`prepareRequest` 开头立刻清掉它，所以只有紧接着的那一次 route 看得到 `failed`。[E: packages/coding-agent/src/core/agent-session.ts:762] [E: packages/coding-agent/src/core/agent-session.ts:1819]
- `generateImages` / `classify` 走 `assertImageModel` / `assertClassifierModel`，virtual catalog 条目是 chat sentinel，不是 image/classifier type。[E: packages/coding-agent/src/core/model-runtime.ts:789] [E: packages/coding-agent/src/core/model-runtime.ts:806] [E: packages/ai/src/utils/model-operations.ts:32]

## 跨包边界

[subsys.coding-agent.model-registry](model-registry.md) 拥有 `ModelRuntime` 的 provider 合成、auth snapshot 与 `stream`/`streamSimple`；本节点只覆盖它的 virtual map、`withVirtualModels` 包装和 `resolveModel`。[I]

[subsys.coding-agent.model-resolver](model-resolver.md) 把 CLI/settings/scope 解析成 `Model<Api>`。Virtual 条目一旦出现在 `getModels()`/`getAvailable()` 里，resolver 把它们当普通 chat model，不读 `route()`。[I]

[surface.providers.overview](../../surface/providers/overview.md) / [ref.ai.model-catalog](../../reference/model-catalog.md) 描述 `pi-ai` 的 42 个 built-in provider 与 generated shards。`pi-virtual` 不是其中任何一个 KnownApi，也不会出现在 generated JSON。[E: packages/ai/src/types.ts:17] [I]

[subsys.coding-agent.agent-session](agent-session.md) 拥有 prompt/retry/compaction loop；本节点写它如何在 `prepareRequest` 里换成物理模型并写入 `pi.virtual-model-state`。[I]

[subsys.coding-agent.session-manager](session-manager.md) 提供 JSONL tree、`appendModelChange` / `appendCustomEntry` / `getBranch()`；state 跟 leaf，compaction 之后 branch 上的 `pi.virtual-model-state` 仍在。[E: packages/coding-agent/src/core/session-manager.ts:1290] [E: packages/coding-agent/test/suite/virtual-models.test.ts:346]

`pi-agent-core` `Agent.prepareRequest` 只替换 **当轮** stream 所用 model，不改 session 级 selection。[E: packages/agent/src/agent-loop.ts:231] [I]

## Sources

- packages/coding-agent/src/core/virtual-models.ts
- packages/coding-agent/src/core/model-runtime.ts
- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session-services.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/core/model-resolver.ts
- packages/coding-agent/src/core/usage-totals.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/index.ts
- packages/coding-agent/src/modes/interactive/components/footer.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/test/virtual-models.test.ts
- packages/coding-agent/test/suite/virtual-models.test.ts
- packages/agent/src/agent-loop.ts
- packages/ai/src/types.ts
- packages/ai/src/api/transform-messages.ts
- packages/ai/src/utils/model-operations.ts

## 相关

- [subsys.coding-agent.model-registry](model-registry.md): `ModelRuntime` catalog/auth 与 `ModelRegistry` facade；virtual 注册与 `resolveModel` 挂在这层。
- [subsys.coding-agent.model-resolver](model-resolver.md): `--model` / settings / scope 如何把 catalog 条目（含 virtual）解析成初始 selection。
- [surface.providers.overview](../../surface/providers/overview.md): 用户可见的 provider 选择；virtual 可挂在任一 provider id 下，包括已有物理模型的 provider。
- [ref.ai.model-catalog](../../reference/model-catalog.md): generated 物理 chat catalog；`pi-virtual` 不在此目录。
- [subsys.coding-agent.agent-session](agent-session.md): `prepareRequest` 路由、retry、compaction 与 `routedModel`。
- [subsys.coding-agent.session-manager](session-manager.md): `model_change` 与 `pi.virtual-model-state` custom entry 的 JSONL tree。
- [surface.extensions.contribution-points](../../surface/extensions/contribution-points.md): `pi.registerVirtualModel()` / `unregisterVirtualModel()` 作为 extension API。
