---
id: subsys.agent-core.agent-harness-lifecycle
title: AgentHarness 默认导出与生命周期门闩
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/result.ts
  - packages/agent/src/harness/reducer.ts
  - packages/agent/src/harness/types.ts
  - packages/agent/src/index.ts
  - packages/agent/package.json
  - packages/agent/src/agent.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/agent/CHANGELOG.md
  - packages/agent/test/agent.test.ts
symbols:
  - AgentHarness
  - AgentLane
  - AgentHarness.create
  - HarnessNotImplemented
  - HarnessClosed
  - TaggedError
  - reduceLaneState
  - Agent.reset
  - BeforeToolCallResult.terminate
related:
  - spine.agent-loop
  - subsys.agent-core.turn-control
  - subsys.agent-core.hooks
  - subsys.agent-core.harness-events
  - subsys.agent-core.prompt-templates
  - ref.agent.agent-events
  - ref.agent.error-codes
evidence: explicit
status: verified
updated: 086c32e745
---

> `subsys.agent-core.agent-harness-lifecycle` 说明已提升到包默认入口的 `AgentHarness` v2 scaffold、它用 `Result` / `TaggedError` 表达的拒绝面、尚未接线的 `reduceLaneState` restore，以及相邻的 `Agent.reset()`、blocked tool `terminate` 与 coding-agent `expandPromptTemplates` 边界。

## 能回答的问题

- `AgentHarness` 现在从哪个包入口导出，experimental subpath 还在吗？
- `AgentHarness.create()` 对已有 durable records 做什么？
- 哪些 lane API 已实现，哪些仍抛 `HarnessNotImplemented` / `HarnessClosed`？
- `reset()` 拒绝 active run 的是 `Agent` 还是 `AgentHarness`？
- blocked `beforeToolCall` 如何参与 batch `terminate`？
- `expandPromptTemplates` 属于哪一层，harness 有没有等价开关？

## 职责边界

`AgentHarness` 是 `pi-agent-core` 的 lane 门面：它实现 `AgentLane`，持有一份 durable `Session`，并声明 prompt / compact / navigate / queue / watch 等操作的 `Result` 返回型。[E: packages/agent/src/harness/agent-harness.ts:271] [E: packages/agent/src/harness/agent-harness.ts:305] [E: packages/agent/src/harness/agent-harness.ts:310]

当前类是 compile-complete scaffold，不是旧版会真正跑 turn 的 harness。`prompt`、`abort`、`watch` 等主路径走 `unavailable()`，在未 close 时 reject `HarnessNotImplemented`。[E: packages/agent/src/harness/agent-harness.ts:74] [E: packages/agent/src/harness/agent-harness.ts:355] [E: packages/agent/src/harness/agent-harness.ts:366] `packages/agent/CHANGELOG.md` 把这称为 “Added a compile-complete AgentHarness v2 scaffold”。[E: packages/agent/CHANGELOG.md:34]

旧节点描述的 `AgentHarnessPhase`、`startOperation()`、`requestShutdown()`、`AgentHarnessError` 已不在 `packages/agent/src/harness/types.ts` 与 `agent-harness.ts`。本节点只写当前源码能证明的门闩。

## 默认包导出

`packages/agent/src/index.ts` 对 `./harness/agent-harness.ts` 做 `export *`，因此 `AgentHarness`、`AgentLane` 与全部 TaggedError / Result 别名都从包根出来。[E: packages/agent/src/index.ts:45]

`packages/agent/package.json` 的 `exports` 只有 `"."`、`"./node"`、`"./session/testing"`，没有 experimental subpath。[E: packages/agent/package.json:8] [E: packages/agent/package.json:13] [E: packages/agent/package.json:17] CHANGELOG 0.84.0 写明：v2 session 与 `AgentHarness` 已从 experimental entrypoint 提升到 default package export，并删除 experimental subpaths。[E: packages/agent/CHANGELOG.md:26]

这是包入口提升，不是 `export default AgentHarness`。源码里 `AgentHarness` 是 named class export。[E: packages/agent/src/harness/agent-harness.ts:305]

## 数据模型

`Result` 是 `{ ok: true; value } | { ok: false; error }`。`TaggedError(tag)` 生成带稳定 `_tag` 的 Error 子类，并提供 `is()`。[E: packages/agent/src/harness/result.ts:1] [E: packages/agent/src/harness/result.ts:28] [E: packages/agent/src/harness/result.ts:30] [E: packages/agent/src/harness/result.ts:46]

公开操作把成功 outcome 与拒绝 error 拆开：

| 结果类型 | 成功 value | 拒绝 error union |
| --- | --- | --- |
| `RunResult` | `{ runId } & RunOutcome` | `LaneBusy \| InvalidMessage \| UnknownSkill \| UnknownTemplate \| Closed` [E: packages/agent/src/harness/agent-harness.ts:105] [E: packages/agent/src/harness/agent-harness.ts:113] |
| `CompactionResult` | `{ runId } & CompactionOutcome` | `LaneBusy \| NothingToCompact \| Closed` [E: packages/agent/src/harness/agent-harness.ts:106] [E: packages/agent/src/harness/agent-harness.ts:114] |
| `NavigationResult` | `{ runId } & NavigationOutcome` | `LaneBusy \| UnknownTarget \| Closed` [E: packages/agent/src/harness/agent-harness.ts:107] [E: packages/agent/src/harness/agent-harness.ts:115] |
| `ResumeResult` | `ResumeOutcome` | `LaneBusy \| NothingToResume \| MissingIdentities \| Closed` [E: packages/agent/src/harness/agent-harness.ts:108] [E: packages/agent/src/harness/agent-harness.ts:131] |
| `QueueResult` | `{ entryId }` | `NoActiveRun \| InvalidMessage \| Closed` [E: packages/agent/src/harness/agent-harness.ts:109] [E: packages/agent/src/harness/agent-harness.ts:116] |
| `AbortResult` | `{ runId; steer; followUp }` | `NoActiveOperation \| Closed` [E: packages/agent/src/harness/agent-harness.ts:111] [E: packages/agent/src/harness/agent-harness.ts:122] |

`RunOutcome` 可以是 `completed` / `aborted` / `failed` / `suspended`。[E: packages/agent/src/harness/agent-harness.ts:89] [E: packages/agent/src/harness/agent-harness.ts:90] [E: packages/agent/src/harness/agent-harness.ts:92] [E: packages/agent/src/harness/agent-harness.ts:93] 这些是类型合同。scaffold 的 `prompt()` 目前不会返回这些 value，只 reject `HarnessNotImplemented`。[E: packages/agent/src/harness/agent-harness.ts:366]

`AgentHarnessOptions` 仍接收 `session`、`models`、`model`、tools/resources/stream/retry/compaction/queue mode 等构造参数。[E: packages/agent/src/harness/agent-harness.ts:243] [E: packages/agent/src/harness/agent-harness.ts:244] [E: packages/agent/src/harness/agent-harness.ts:246] constructor 把它们拷进实例字段，默认 thinking `"off"`、compaction `enabled: true`、两种 queue mode `"one-at-a-time"`。[E: packages/agent/src/harness/agent-harness.ts:329] [E: packages/agent/src/harness/agent-harness.ts:338] [E: packages/agent/src/harness/agent-harness.ts:343]

`packages/agent/src/harness/types.ts` 仍导出 `AgentHarnessResources`、`AgentHarnessTool`、`AgentHarnessStreamOptions` 等支撑类型，不再导出 `AgentHarnessPhase` 或 `AgentHarnessError`。[E: packages/agent/src/harness/types.ts:70] [E: packages/agent/src/harness/types.ts:81] [E: packages/agent/src/harness/types.ts:102]

## 控制流

1. `AgentHarness.create(options)` 读 `options.session.findRecords({ limit: 1 })`。只要存在任意 record，就 throw `HarnessNotImplemented("create.restore")`，不构造实例。[E: packages/agent/src/harness/agent-harness.ts:347] [E: packages/agent/src/harness/agent-harness.ts:350] [E: packages/agent/src/harness/agent-harness.ts:351]
2. 空 session 才 `new AgentHarness(options)`，并返回 `{ harness, suspended: [] }`。private constructor，不能直接 `new`。[E: packages/agent/src/harness/agent-harness.ts:352] [E: packages/agent/src/harness/agent-harness.ts:323]
3. constructor 把 `hooks` / `events` 设成 `UnavailableRegistry`。调用 `hooks.on` / `events.on` 在未 close 时 throw `HarnessNotImplemented("hooks.on"|"events.on")`。[E: packages/agent/src/harness/agent-harness.ts:326] [E: packages/agent/src/harness/agent-harness.ts:327] [E: packages/agent/src/harness/agent-harness.ts:233]
4. 已实现的同步状态门：`getLeafId()` 转调 `session.getLeafId()`；model / thinking / tools / resources / stream / retry / compaction / steering / follow-up 的 getter/setter 只改内存字段。[E: packages/agent/src/harness/agent-harness.ts:359] [E: packages/agent/src/harness/agent-harness.ts:422] [E: packages/agent/src/harness/agent-harness.ts:425] [E: packages/agent/src/harness/agent-harness.ts:456]
5. 未实现的 operation 一律 `unavailable(name)`：`prompt`、`skill`、`promptFromTemplate`、`compact`、`navigateTree`、`resume`、`abort`、`steer`、`followUp`、`nextRun`、`cancelQueued`、`recordUsage`、`waitForIdle`、`runWhenIdle`、`peekAction`、`executeAction`、`runToCompletion`、`watch`、`lane`、`createLane`、`lanes`、`watchSession`。[E: packages/agent/src/harness/agent-harness.ts:366] [E: packages/agent/src/harness/agent-harness.ts:383] [E: packages/agent/src/harness/agent-harness.ts:407] [E: packages/agent/src/harness/agent-harness.ts:440]
6. `close()` 只把 `closed` 置 true。之后 `unavailable()` 改为 reject `HarnessClosed`，`hooks.on` / `events.on` 也改为 throw `HarnessClosed`。[E: packages/agent/src/harness/agent-harness.ts:505] [E: packages/agent/src/harness/agent-harness.ts:506] [E: packages/agent/src/harness/agent-harness.ts:356] [E: packages/agent/src/harness/agent-harness.ts:233] `close()` 不 delete/dispose session。[E: packages/agent/src/harness/agent-harness.ts:505] [I]

## reducer 与 restore 缺口

`reduceLaneState()` 是纯函数：从一份 bounded `LaneReductionInput`（open operations、lane records、own entries、configuration entries、defaults）重建 `LaneState`、effective configuration 与 optional `terminalFailure`。[E: packages/agent/src/harness/reducer.ts:506] [E: packages/agent/src/harness/reducer.ts:121] [E: packages/agent/src/harness/reducer.ts:79]

单 writer record 协议若出现自相矛盾，reducer throw `RecordLogCorruption`，reason 是封闭字面量 union；函数注释要求 restore 拒绝而不是修复。[E: packages/agent/src/harness/reducer.ts:36] [E: packages/agent/src/harness/reducer.ts:22] [E: packages/agent/src/harness/reducer.ts:131]

`AgentHarness.create()` 并不调用 `reduceLaneState`。它在发现任何 record 时直接 `HarnessNotImplemented("create.restore")`。[E: packages/agent/src/harness/agent-harness.ts:351] reducer 目前只被 `packages/agent/test/harness/reducer.test.ts` 引用，没有被 harness 运行时 import。[I]

## `Agent.reset()` 拒绝 active run

`AgentHarness` 没有 `reset()`。拒绝 active run 的是低层 `Agent.reset()`。[E: packages/agent/src/agent.ts:333]

若 `this.activeRun` 存在，`reset()` throw `"Agent is already processing. Wait for completion before resetting."`，不改 messages / streaming / queues。[E: packages/agent/src/agent.ts:334] [E: packages/agent/src/agent.ts:335] idle 时才清空 transcript、runtime flags 与两类 queue。[E: packages/agent/src/agent.ts:338] [E: packages/agent/src/agent.ts:343] 测试断言 streaming 期间 reset 抛错且 user message 仍在。[E: packages/agent/test/agent.test.ts:530] [E: packages/agent/test/agent.test.ts:532]

`Agent.waitForIdle()` 等的是 `activeRun.promise`，该 promise 在 `agent_end` listeners settle 之后由 `finishRun()` resolve。[E: packages/agent/src/agent.ts:328] [E: packages/agent/src/agent.ts:329] [E: packages/agent/src/agent.ts:529]

## Blocked tool terminate

`BeforeToolCallResult` 在 `block` / `reason` 之外增加 `terminate?: boolean`。[E: packages/agent/src/types.ts:61] [E: packages/agent/src/types.ts:62] [E: packages/agent/src/types.ts:63] [E: packages/agent/src/types.ts:68] blocked call 把该 hint 写进 error tool result 后，只有当前 batch 每个 finalized result 都为 true 才会 early-stop。[E: packages/agent/src/agent-loop.ts:638] [E: packages/agent/src/agent-loop.ts:583]

`agent-loop` 在 `beforeResult?.block` 时用 `reason` 或默认 `"Tool execution was blocked"` 生成 error tool result；仅当 `beforeResult.terminate === true` 才把 `result.terminate = true`。[E: packages/agent/src/agent-loop.ts:636] [E: packages/agent/src/agent-loop.ts:637] [E: packages/agent/src/agent-loop.ts:638] [E: packages/agent/src/agent-loop.ts:639]

batch 级判定是 `shouldTerminateToolBatch()`：`finalizedCalls.length > 0` 且每个 `result.terminate === true`。[E: packages/agent/src/agent-loop.ts:582] [E: packages/agent/src/agent-loop.ts:583]

`reduceLaneState` 重建 tool batch 时，若对应 tool-result entry 带 `terminate === true`，会把该 call 标成 `terminate: true`。这是 durable 恢复投影，不是 loop 执行器。[E: packages/agent/src/harness/reducer.ts:73] [E: packages/agent/src/harness/reducer.ts:493]

`AgentHarness` 的 `before_tool` hook 名写在 `HookName` 里，但 `hooks.on` 仍是 `HarnessNotImplemented`。blocked terminate 今天只对 `Agent` / `runLoop` 生效。[E: packages/agent/src/harness/agent-harness.ts:207] [E: packages/agent/src/harness/agent-harness.ts:233] [I]

## `expandPromptTemplates` 跨包边界

`AgentHarness.promptFromTemplate()` 仍是 `unavailable("promptFromTemplate")`，没有 expand 开关。[E: packages/agent/src/harness/agent-harness.ts:371] [E: packages/agent/src/harness/agent-harness.ts:372]

`expandPromptTemplates` 是 `coding-agent` 的 `PromptOptions` 字段：`AgentSession.prompt()` 默认 `true`，为真时先拦截 `/` 扩展命令，再展开 skill command 与 prompt template。[E: packages/coding-agent/src/core/agent-session.ts:240] [E: packages/coding-agent/src/core/agent-session.ts:242] [E: packages/coding-agent/src/core/agent-session.ts:1117] [E: packages/coding-agent/src/core/agent-session.ts:1124] [E: packages/coding-agent/src/core/agent-session.ts:1161]

`AgentSession.sendUserMessage()` 把同一字段默认成 `false`，再转调 `prompt()`。[E: packages/coding-agent/src/core/agent-session.ts:1481] [E: packages/coding-agent/src/core/agent-session.ts:1506] 这不是 `AgentHarness` API。

## 设计动机与权衡

scaffold 先钉死 `AgentLane` 签名、`Result` 拒绝面和 `create()` restore 缺口，让调用方按最终合同编译，同时未完成路径显式失败。[E: packages/agent/src/harness/agent-harness.ts:271] [E: packages/agent/src/harness/agent-harness.ts:351] [E: packages/agent/src/harness/agent-harness.ts:355] [I]

`TaggedError` + `Result` 取代旧 `AgentHarnessErrorCode` 字符串：预期拒绝走 `ok: false`，编程错误 / 未实现走 throw。[E: packages/agent/src/harness/result.ts:1] [E: packages/agent/src/harness/agent-harness.ts:113] [E: packages/agent/src/harness/agent-harness.ts:356] [I]

## Gotcha

- `AgentHarness.events` 的 `Events` 接口与 `packages/agent/src/harness/events.ts` 的 `HarnessEventBus` 不是同一个对象。harness 实例上的 `events.on` 现在会 throw。[E: packages/agent/src/harness/agent-harness.ts:215] [E: packages/agent/src/harness/agent-harness.ts:327] 订阅/watch 实现见 [subsys.agent-core.harness-events](harness-events.md)。
- `close()` 之后 getter/setter 仍可改内存字段；`closed` 只挡住 `unavailable()` 路径和 registry `on()`。[E: packages/agent/src/harness/agent-harness.ts:425] [E: packages/agent/src/harness/agent-harness.ts:356] [I]
- `create()` 对“有任何 record”一刀切拒绝 restore，包括只写了一条非 operation record 的 session。[E: packages/agent/src/harness/agent-harness.ts:350] [E: packages/agent/src/harness/agent-harness.ts:351]

## 跨包边界

`AgentHarness` 属于 `pi-agent-core`。`Agent.reset()` 与 blocked `terminate` 属于同一包的 `Agent` / `runLoop`。`expandPromptTemplates` 属于 `coding-agent` 的 `AgentSession`。[E: packages/agent/src/index.ts:45] [E: packages/agent/src/agent.ts:333] [E: packages/coding-agent/src/core/agent-session.ts:242]

## Sources

- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/result.ts
- packages/agent/src/harness/reducer.ts
- packages/agent/src/harness/types.ts
- packages/agent/src/index.ts
- packages/agent/package.json
- packages/agent/CHANGELOG.md
- packages/agent/src/agent.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/agent/test/agent.test.ts
- packages/coding-agent/src/core/agent-session.ts

## 相关

- [spine.agent-loop](../../spine/agent-loop.md)：`Agent` / `runLoop` 仍是实际 turn 执行器。
- [subsys.agent-core.turn-control](turn-control.md)：batch `terminate` 如何停止下一轮 provider request。
- [subsys.agent-core.hooks](hooks.md)：`beforeToolCall` / `afterToolCall` 类型合同。
- [subsys.agent-core.harness-events](harness-events.md)：`HarnessEventBus` 的 direct listener 与 buffered watch。
- [subsys.agent-core.prompt-templates](prompt-templates.md)：harness 侧模板加载与占位符，不含 `expandPromptTemplates`。
- [ref.agent.agent-events](../../reference/agent-events.md)：`AgentEvent` 与 `HarnessEvent` 目录。
- [ref.agent.error-codes](../../reference/error-codes.md)：File/Exec/Session/JSONL/`TaggedError` 错误面。
