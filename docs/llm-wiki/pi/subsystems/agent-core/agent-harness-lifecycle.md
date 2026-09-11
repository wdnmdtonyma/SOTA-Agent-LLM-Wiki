---
id: subsys.agent-core.agent-harness-lifecycle
title: AgentHarness 默认导出与 runtime 生命周期
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/runtime/harness.ts
  - packages/agent/src/harness/runtime/lane.ts
  - packages/agent/src/harness/runtime/drive.ts
  - packages/agent/src/harness/runtime/restore.ts
  - packages/agent/src/harness/runtime/reducer.ts
  - packages/agent/src/harness/result.ts
  - packages/agent/src/harness/types.ts
  - packages/agent/src/index.ts
  - packages/agent/package.json
  - packages/agent/src/agent.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/coding-agent/src/core/agent-session.ts
symbols:
  - AgentHarness
  - AgentLane
  - AgentHarness.create
  - createAgentHarness
  - Harness
  - Lane
  - reduceLaneSnapshot
  - HarnessClosed
  - HarnessFault
  - SliceNotImplemented
  - TaggedError
  - Agent.reset
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
updated: bbb61e34aa
---

> `subsys.agent-core.agent-harness-lifecycle` 说明 `AgentHarness` 仍从 `harness/agent-harness.ts` 以 `{ create }` 导出；运行时实现是 `harness/runtime/harness.ts` 的 `Harness` 类，加上 `runtime/lane.ts` 的 `Lane` 与 `runtime/drive/*` 的 durable procedure。旧顶层 `harness/reducer.ts` 已迁到 `runtime/reducer.ts`（`reduceLaneSnapshot`）。

## 能回答的问题

- `AgentHarness` 现在从哪个包入口导出，它是 class 还是 `{ create }`?
- `AgentHarness.create()` 对已有 durable lane 做什么？返回什么？
- `accept` / `drive` / `prompt` 如何接成一次 run？
- 哪些 API 仍抛 `SliceNotImplemented`？
- `reset()` 拒绝 active run 的是 `Agent` 还是 `AgentHarness`？
- `expandPromptTemplates` 属于哪一层，harness 有没有等价开关？

## 职责边界

`AgentHarness` 是 `pi-agent-core` 的 session 门面：它管理多条 `AgentLane`，但 **自己不是 lane**。[E: packages/agent/src/harness/runtime/harness.ts:29] 公开合同写在 `harness/agent-harness.ts`：`AgentHarness` / `AgentLane` 接口、`AgentHarnessOptions`、`Result` 别名、`HarnessEvent`、`HookMap`。[E: packages/agent/src/harness/agent-harness.ts:586] [E: packages/agent/src/harness/agent-harness.ts:538]

运行时实现：

- `createAgentHarness` + `Harness`：`packages/agent/src/harness/runtime/harness.ts` [E: packages/agent/src/harness/runtime/harness.ts:29] [E: packages/agent/src/harness/runtime/harness.ts:375]
- `Lane`：`packages/agent/src/harness/runtime/lane.ts`，实现 `AgentLane`（`accept` / `drive` / `prompt` / `watch`）[E: packages/agent/src/harness/runtime/lane.ts:480] [E: packages/agent/src/harness/runtime/lane.ts:921] [E: packages/agent/src/harness/runtime/lane.ts:1133]
- `driveOperation`：`runtime/drive.ts` 按 durable `OperationState.at` 派到 `runtime/drive/*` [E: packages/agent/src/harness/runtime/drive.ts:29] [E: packages/agent/src/harness/runtime/drive.ts:56]
- `restoreSession` / `restoreLaneState`：`runtime/restore.ts` [E: packages/agent/src/harness/runtime/restore.ts:92]
- `reduceLaneSnapshot`：`runtime/reducer.ts`，给 watch 客户端投影，不是 restore 入口 [E: packages/agent/src/harness/runtime/reducer.ts:22]

旧 `AgentHarnessPhase`、`startOperation()`、`requestShutdown()`、`AgentHarnessError`、`HarnessNotImplemented`、`reduceLaneState` 已不在当前源码。本节点只写现行门闩。

## 默认包导出

`packages/agent/src/index.ts` 对 `./harness/agent-harness.ts` 做 `export *`，因此 `AgentHarness`、`AgentLane` 与 TaggedError / Result 别名都从包根出来。[E: packages/agent/src/index.ts:43]

`packages/agent/package.json` 的 `exports` 含 `"."`、`"./node"`、`"./harness/runtime/reducer"` 等，没有 experimental subpath。[E: packages/agent/package.json:8] [E: packages/agent/package.json:25]

这不是 `export default AgentHarness`。源码里 `AgentHarness` 是满足 `AgentHarnessConstructor` 的对象字面量：`{ create: createAgentHarness }`。[E: packages/agent/src/harness/agent-harness.ts:614] [E: packages/agent/src/harness/agent-harness.ts:622] 测试用 `created.harness instanceof Harness` 锁 runtime 类。[E: packages/agent/test/harness/runtime/harness.test.ts:36] [E: packages/agent/test/harness/runtime/harness.test.ts:37]

## 数据模型

`Result` 是 `{ ok: true; value } | { ok: false; error }`。`TaggedError(tag)` 生成带稳定 `_tag` 的 Error 子类，并提供 `is()`。[E: packages/agent/src/harness/result.ts:1] [E: packages/agent/src/harness/result.ts:28] [E: packages/agent/src/harness/result.ts:46]

公开操作把成功 outcome 与拒绝 error 拆开：

| 结果类型 | 成功 value | 拒绝 error union |
| --- | --- | --- |
| `RunResult` | `OperationResultRecord \| SuspendedRun` | `LaneBusy \| InvalidMessage \| UnknownSkill \| UnknownTemplate \| Closed` [E: packages/agent/src/harness/agent-harness.ts:84] |
| `CompactionResult` | `{ compaction; run? }` | `LaneBusy \| NothingToCompact \| Closed` [E: packages/agent/src/harness/agent-harness.ts:88] |
| `NavigationResult` | `{ navigation; run? }` | `LaneBusy \| InvalidNavigation \| UnknownTarget \| Closed` [E: packages/agent/src/harness/agent-harness.ts:112] |
| `ResumeResult` | `OperationResultRecord \| SuspendedRun` | `NothingToResume \| Closed` [E: packages/agent/src/harness/agent-harness.ts:96] |
| `QueueResult` | `{ entryId }` | `InvalidMessage \| Closed` [E: packages/agent/src/harness/agent-harness.ts:97] |
| `AbortResult` | `{ operationId; steer; followUp }` | `NoActiveOperation \| Closed` [E: packages/agent/src/harness/agent-harness.ts:99] |
| `DriveResult` | `DriveOutcome` | `OperationMismatch \| Closed` [E: packages/agent/src/harness/agent-harness.ts:169] |

`DriveOutcome` 可以是 `settled`、`waiting`+`retry`、`waiting`+`deferred`。[E: packages/agent/src/harness/agent-harness.ts:165] [E: packages/agent/src/harness/agent-harness.ts:167] [E: packages/agent/src/harness/agent-harness.ts:168] `SuspendedRun` 是 convenience observation：`status: "suspended"` + `DeferredHandle`。[E: packages/agent/src/harness/agent-harness.ts:78]

`AgentHarnessOptions` 接收 `session`、`models`、`model`、tools/resources/stream/retry/compaction/queue mode、`toolContext`、`systemPrompt`、`entryProjectors`。[E: packages/agent/src/harness/agent-harness.ts:518] constructor 把它们拷进 `Config`：thinking 默认 `"off"`、compaction 用 `DEFAULT_COMPACTION_SETTINGS`、两种 queue mode 默认 `"all"`、`toolExecution` 默认 `"parallel"`。[E: packages/agent/src/harness/runtime/harness.ts:64] [E: packages/agent/src/harness/runtime/harness.ts:66] [E: packages/agent/src/harness/runtime/harness.ts:68] [E: packages/agent/src/harness/runtime/harness.ts:385]

`packages/agent/src/harness/types.ts` 仍导出 `AgentHarnessResources`、`AgentHarnessTool`、`AgentHarnessStreamOptions` 等支撑类型。[E: packages/agent/src/harness/types.ts:73] [E: packages/agent/src/harness/types.ts:108]

## 控制流

1. `AgentHarness.create(options, context)` 转调 `createAgentHarness`。先 `validateToolNames` / retry / compaction，再从 `options.model` 建 `LaneConfiguration` seed（thinking 默认 `"off"`，`activeToolNames` 默认全部 tool name）。[E: packages/agent/src/harness/agent-harness.ts:622] [E: packages/agent/src/harness/runtime/harness.ts:379] [E: packages/agent/src/harness/runtime/harness.ts:383]
2. `restoreSession(options.session, context)` 扫全部 `pi.branch.tip` / `pi.lane.config` / `pi.lane.state`。完整配置的 lane 进入 `restored` map；只有 tip、没有 config/state 的 branch 跳过；缺字段的部分 lane 抛 `SessionInvariantError`，外层包成 `HarnessFault`。[E: packages/agent/src/harness/runtime/restore.ts:92] [E: packages/agent/src/harness/runtime/restore.ts:110] [E: packages/agent/src/harness/runtime/harness.ts:389] [E: packages/agent/src/harness/runtime/harness.ts:406] [E: packages/agent/test/harness/runtime/harness.test.ts:332]
3. 返回 `{ harness: new Harness(options, seed, restored), open }`。`open` 列出每条已恢复且仍有 current operation 的 `OpenOperation`（可带 `aborting: true`）。空 session 得到空 map 与 `open: []`。[E: packages/agent/src/harness/runtime/harness.ts:390] [E: packages/agent/src/harness/runtime/harness.ts:404] [E: packages/agent/test/harness/runtime/harness.test.ts:315]
4. `Harness` constructor 创建真实 `HarnessEventBus` 与 `HookRegistry`（hook 错误发 `handler_error`）。[E: packages/agent/src/harness/runtime/harness.ts:45] [E: packages/agent/src/harness/runtime/harness.ts:46]
5. `lane(name, context)` / `lane(name, { createAt }, context)`：已缓存则返回；否则读 storage。完整 lane 走 `restoreLaneState`；absent/branch 则 commit tip+config+state 并 emit `lane_created`。空名或含 `\u0000` 抛 `InvalidLane`；`createAt` 指向不存在的 entry 抛 `UnknownTarget`。[E: packages/agent/src/harness/runtime/harness.ts:86] [E: packages/agent/src/harness/runtime/harness.ts:105] [E: packages/agent/src/harness/runtime/harness.ts:118]
6. 一次 run：`Lane.prompt` → `accept` 写出 operation meta/state → `drive({ operationId, waitForRetry: true })` → `driveOperation` 按 `state.at` 循环（`starting` / `checkpoint` / `assistant.*` / `tools` / `deferred.*` / `summary.*` / `navigation.ready_to_commit`），直到 `settled` 或 durable wait。[E: packages/agent/src/harness/runtime/lane.ts:1139] [E: packages/agent/src/harness/runtime/lane.ts:1162] [E: packages/agent/src/harness/runtime/lane.ts:1178] [E: packages/agent/src/harness/runtime/drive.ts:56] [E: packages/agent/src/harness/runtime/drive.ts:99]
7. `watchSession` 仍抛 `SliceNotImplemented("watchSession")`。lane 级 `watch` 已实现。[E: packages/agent/src/harness/runtime/harness.ts:305] [E: packages/agent/src/harness/runtime/types.ts:18] [E: packages/agent/src/harness/runtime/lane.ts:1705]
8. `close(context)` 设 `HarnessClosed`，seal 每条 lane、关闭 hooks/events，并 `session.close(context)`。之后 getter/setter 与 `lane()` 抛同一个 closed/fault 错误。[E: packages/agent/src/harness/runtime/harness.ts:322] [E: packages/agent/src/harness/runtime/harness.ts:329] [E: packages/agent/src/harness/runtime/harness.ts:368]

## reducer 与 restore

`reduceLaneSnapshot(snapshot, event)` 是纯函数：把一条 `HarnessEvent` / `LaneWatchEvent` 应用到可变 `LaneSnapshot`。`navigation_end` 返回 `"rebase"`，要求调用方重拍 snapshot；其它 case 就地改 operation / transcript / queues / config。[E: packages/agent/src/harness/runtime/reducer.ts:22] [E: packages/agent/src/harness/runtime/reducer.ts:220]

`createAgentHarness` **不** 调用 `reduceLaneSnapshot`。restore 读的是 session values（`pi.lane.*` / `pi.op.*`），不是事件日志回放。[E: packages/agent/src/harness/runtime/harness.ts:389] [E: packages/agent/src/harness/runtime/restore.ts:137] reducer 给 remote/UI watch 投影，包入口单独导出。[E: packages/agent/src/index.ts:77]

旧 `reduceLaneState` / `RecordLogCorruption` / 顶层 `harness/reducer.ts` 已删除。

## `Agent.reset()` 拒绝 active run

`AgentHarness` 没有 `reset()`。拒绝 active run 的是低层 `Agent.reset()`。[E: packages/agent/src/agent.ts:333]

若 `this.activeRun` 存在，`reset()` throw `"Agent is already processing. Wait for completion before resetting."`，不改 messages / streaming / queues。[E: packages/agent/src/agent.ts:334] [E: packages/agent/src/agent.ts:335] idle 时才清空 transcript、runtime flags 与两类 queue。[E: packages/agent/src/agent.ts:338] [E: packages/agent/src/agent.ts:343] 测试断言 streaming 期间 reset 抛错且 user message 仍在。[E: packages/agent/test/agent.test.ts:530] [E: packages/agent/test/agent.test.ts:532]

`Agent.waitForIdle()` 等的是 `activeRun.promise`，该 promise 在 `agent_end` listeners settle 之后由 `finishRun()` resolve。[E: packages/agent/src/agent.ts:328] [E: packages/agent/src/agent.ts:529]

`Agent.prepareNextTurn` / `prepareNextTurnWithContext` 只在 `shouldStopAfterTurn` 与 queued-message 检查决定还会再开一轮 assistant turn 之后运行；终局 turn 不再调用。`AgentLane.prompt` 走 harness drive，不再经过低层 `Agent.prompt`。[E: packages/agent/src/agent.ts:200] [E: packages/agent/src/agent.ts:463] [E: packages/agent/src/harness/runtime/lane.ts:1133]

## Blocked tool terminate

低层 `BeforeToolCallResult.terminate` 仍属于 `Agent` / `runLoop`：blocked call 把 hint 写进 error tool result 后，只有当前 batch 每个 finalized result 都为 true 才会 early-stop。[E: packages/agent/src/types.ts:61] [E: packages/agent/src/types.ts:68] [E: packages/agent/src/agent-loop.ts:589] [E: packages/agent/src/agent-loop.ts:643]

harness 路径用 `HookMap.before_tool`：result 是 `{ args?; block?: { reason; terminate? } }`。`HookRegistry.beforeTool` 聚合 handlers；`applyBeforeToolDecision` 在 `decision.block` 时用 `block.reason` 与 `block.terminate === true` 生成 immediate error。[E: packages/agent/src/harness/agent-harness.ts:464] [E: packages/agent/src/harness/hooks.ts:161] [E: packages/agent/src/harness/execution/tools.ts:105] [E: packages/agent/src/harness/runtime/drive/tools.ts:452]

batch 完成后 `tool-placement` 用 `completedCalls.every(call => call.status === "completed" && call.terminate)` 决定 checkpoint 是 `may_finish` 还是 `need_assistant`。[E: packages/agent/src/harness/runtime/drive/tool-placement.ts:221]

## `expandPromptTemplates` 跨包边界

`AgentLane.promptFromTemplate()` 已实现：它 `accept` 一条 `prompt_template` request，再 `drive`。没有 coding-agent 那种 expand 开关。[E: packages/agent/src/harness/runtime/lane.ts:1154] [E: packages/agent/src/harness/runtime/lane.ts:1155]

`expandPromptTemplates` 是 `coding-agent` 的 `PromptOptions` 字段：`AgentSession.prompt()` 默认 `true`，为真时先拦截 `/` 扩展命令，再展开 skill command 与 prompt template。[E: packages/coding-agent/src/core/agent-session.ts:244] [E: packages/coding-agent/src/core/agent-session.ts:1176] [E: packages/coding-agent/src/core/agent-session.ts:1183] [E: packages/coding-agent/src/core/agent-session.ts:1213]

`AgentSession.sendUserMessage()` 把同一字段默认成 `false`，再转调 `prompt()`。[E: packages/coding-agent/src/core/agent-session.ts:1573] [E: packages/coding-agent/src/core/agent-session.ts:1596] 这不是 `AgentHarness` API。

## 设计动机与权衡

公开面留在 `agent-harness.ts`，实现拆到 `runtime/`：调用方只依赖 `{ create }` 与接口，测试可以直接 `instanceof Harness`。[E: packages/agent/src/harness/agent-harness.ts:622] [E: packages/agent/src/harness/runtime/harness.ts:29] [I]

`TaggedError` + `Result` 表达预期拒绝（`LaneBusy` / `Closed` / `NothingToResume`）；存储/不变量失败走 `HarnessFault` 并 seal 全部 lane。[E: packages/agent/src/harness/result.ts:28] [E: packages/agent/src/harness/runtime/harness.ts:309] [E: packages/agent/src/harness/runtime/harness.ts:315]

`create()` 只 restore、不启动 provider/tool/hook/timer effects。未完成的 operation 出现在 `open`，由调用方再 `drive`。[E: packages/agent/src/harness/runtime/harness.ts:375] [E: packages/agent/src/harness/runtime/restore.ts:118]

## Gotcha

- `AgentHarness` 不是 class，不能 `new AgentHarness()`。`create` 的第二参是 `Context`（常用 `BACKGROUND_CONTEXT`）。[E: packages/agent/src/harness/agent-harness.ts:615] [E: packages/agent/test/harness/runtime/harness.test.ts:36]
- `watchSession` 仍未实现；需要 session 级快照的调用方只能自己组合 `lanes()`。[E: packages/agent/src/harness/runtime/harness.ts:305]
- 部分 durable lane（有 tip+config 但缺 `pi.lane.state`）会让整个 `create()` 以 `HarnessFault` 失败，而不是跳过该 lane。[E: packages/agent/test/harness/runtime/harness.test.ts:321] [E: packages/agent/src/harness/runtime/restore.ts:74]
- `close()` 会 `session.close()`，与旧 scaffold 只翻 `closed` 标志不同。[E: packages/agent/src/harness/runtime/harness.ts:329]
- 低层 `Agent` / `runLoop` 仍独立存在，coding-agent `AgentSession` 今天主要走那条路；不要把 `AgentLane.prompt` 与 `Agent.prompt` 当成同一个入口。[I]

## 跨包边界

`AgentHarness` 属于 `pi-agent-core`。`Agent.reset()` 与 `runLoop` 的 `BeforeToolCallResult.terminate` 属于同一包的低层 `Agent`。`expandPromptTemplates` 属于 `coding-agent` 的 `AgentSession`。[E: packages/agent/src/index.ts:43] [E: packages/agent/src/agent.ts:333] [E: packages/coding-agent/src/core/agent-session.ts:244]

## Sources

- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/runtime/harness.ts
- packages/agent/src/harness/runtime/lane.ts
- packages/agent/src/harness/runtime/drive.ts
- packages/agent/src/harness/runtime/restore.ts
- packages/agent/src/harness/runtime/reducer.ts
- packages/agent/src/harness/runtime/types.ts
- packages/agent/src/harness/result.ts
- packages/agent/src/harness/types.ts
- packages/agent/src/harness/hooks.ts
- packages/agent/src/harness/execution/tools.ts
- packages/agent/src/harness/runtime/drive/tools.ts
- packages/agent/src/harness/runtime/drive/tool-placement.ts
- packages/agent/src/index.ts
- packages/agent/package.json
- packages/agent/src/agent.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/agent/test/agent.test.ts
- packages/agent/test/harness/runtime/harness.test.ts
- packages/coding-agent/src/core/agent-session.ts

## 相关

- [spine.agent-loop](../../spine/agent-loop.md)：低层 `Agent` / `runLoop` 仍是 coding-agent 的 turn 执行器。
- [subsys.agent-core.turn-control](turn-control.md)：batch `terminate` 如何停止下一轮 provider request。
- [subsys.agent-core.hooks](hooks.md)：`HookMap` / `before_tool` / `after_tool` 类型合同。
- [subsys.agent-core.harness-events](harness-events.md)：`HarnessEventBus` 的 direct listener 与 buffered watch。
- [subsys.agent-core.prompt-templates](prompt-templates.md)：harness 侧模板加载与占位符，不含 `expandPromptTemplates`。
- [ref.agent.agent-events](../../reference/agent-events.md)：`AgentEvent` 与 `HarnessEvent` 目录。
- [ref.agent.error-codes](../../reference/error-codes.md)：File/Exec/Session/`TaggedError` 错误面。
