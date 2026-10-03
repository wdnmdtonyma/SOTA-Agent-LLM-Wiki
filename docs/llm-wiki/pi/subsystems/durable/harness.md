---
id: subsys.durable.harness
title: Durable Harness / tasks / tools
kind: subsystem
tier: T2
pkg: durable
source:
  - packages/durable/package.json
  - packages/durable/README.md
  - packages/durable/CHANGELOG.md
  - packages/durable/src/index.ts
  - packages/durable/src/tasks.ts
  - packages/durable/src/errors.ts
  - packages/durable/src/types.ts
  - packages/durable/src/session/session.ts
  - packages/durable/src/session/transaction.ts
  - packages/durable/src/harness/harness.ts
  - packages/durable/src/harness/types.ts
  - packages/durable/src/harness/define.ts
  - packages/durable/src/harness/agent.ts
  - packages/durable/src/harness/registry.ts
  - packages/durable/src/harness/scheduler.ts
  - packages/durable/src/harness/submissions.ts
  - packages/durable/src/harness/generation.ts
  - packages/durable/src/harness/tool.ts
  - packages/durable/src/harness/compaction.ts
  - packages/durable/src/harness/inbox.ts
  - packages/durable/src/harness/live.ts
  - packages/durable/src/harness/events.ts
  - packages/durable/src/harness/view.ts
  - packages/durable/src/harness/task-graph.ts
  - packages/durable/src/harness/usage.ts
  - packages/durable/src/harness/prompt.ts
  - packages/durable/src/tools/index.ts
  - packages/durable/src/tools/env.ts
  - packages/durable/src/tools/bash.ts
  - packages/durable/src/tools/read.ts
  - packages/durable/src/tools/edit.ts
  - packages/durable/src/tools/write.ts
  - packages/durable/src/tools/image.ts
  - packages/durable/src/tools/file-mutation-queue.ts
  - packages/durable/src/env/index.ts
  - packages/durable/src/env/node.ts
  - packages/agent/package.json
  - packages/agent/src/index.ts
  - packages/agent/CHANGELOG.md
  - packages/coding-agent/package.json
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/core/experimental.ts
  - packages/coding-agent/src/experimental/commands.ts
  - packages/coding-agent/src/experimental/session-worker.ts
  - packages/coding-agent/src/experimental/durable/runtime.ts
  - packages/coding-agent/src/experimental/vacation/runtime.ts
symbols:
  - Harness
  - createRegistry
  - defineTool
  - defineExtension
  - defineTask
  - GenerationTask
  - ToolTask
  - CompactionTask
  - CodingTools
  - Conversation
  - ConversationBusy
  - NodeExecutionEnv
  - watchEvents
  - AgentDoc
  - LiveDoc
  - InboxDoc
  - UsageDoc
related:
  - subsys.durable.runtime
  - subsys.durable.storage
  - spine.layered-architecture
  - spine.agent-loop
  - ref.package-index
  - subsys.coding-agent.session-manager
  - subsys.coding-agent.experimental-cli
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `@earendil-works/pi-durable` 的 `Harness` 是 1.0 可复用 durable agent harness：在一份 Session / Storage 上跑 conversation、generation、tool 与 compaction。它取代已从 `pi-agent-core` 删除的 experimental `AgentHarness`，**不是** coding-agent `SessionManager` JSONL，也**不**调用 `pi-agent-core` 的 `Agent` loop。

## 能回答的问题

- 1.0 之后可复用 harness 落在哪个包？`AgentHarness` 还存在吗？
- `Harness.open()` 需要什么，`createRegistry()` / `defineTool` / `defineExtension` / `defineTask` 各干什么？
- conversation abort 与 task / conversation ownership 怎样走？background 任务会不会被带上？
- threshold / overflow / manual compaction 分别由谁创建、谁阻塞 generation？
- `./tools` 的 `CodingTools` 有哪些工具？和 coding-agent 八工具有何不同？SQLite 是不是本节点？

## 职责边界

npm 名 `@earendil-works/pi-durable`，版本 `1.0.1`。[E: packages/durable/package.json:2] [E: packages/durable/package.json:3] 根 barrel 导出 `Harness`、`createRegistry`、`defineTool` / `defineExtension` / `hook` / `section` / `wrapTool` / `wrapSection`、`defineTask`、内置 `GenerationTask` / `ToolTask` / `CompactionTask`，以及 `createSession` / `MemoryStorage`。[E: packages/durable/src/index.ts:24] [E: packages/durable/src/index.ts:38] [E: packages/durable/src/index.ts:98] [E: packages/durable/src/index.ts:100] README 把整包标为 **Experimental**。[E: packages/durable/README.md:3]

这是 `pi-agent-core` 1.0 breaking 的落点：`@earendil-works/pi-agent-core` 1.0.0 删除 experimental `AgentHarness`、sessions/storage、harness tools、compaction 与 `./harness/*` 子路径，包内只剩 `Agent`、agent loop、proxy stream 与 types；changelog 明确要求 durable session 用 `pi-durable`。[E: packages/agent/CHANGELOG.md:11] [E: packages/agent/CHANGELOG.md:11] 现行 `packages/agent/src/index.ts` 只有这五条 re-export；`package.json` exports 只剩 `.` 与 `./package.json`。[E: packages/agent/src/index.ts:1] [E: packages/agent/src/index.ts:2] [E: packages/agent/src/index.ts:3] [E: packages/agent/src/index.ts:5] [E: packages/agent/package.json:8] [E: packages/agent/package.json:13] `pi-durable` 源码 **不** import `pi-agent-core`。运行依赖是 Chord 与 `pi-ai`（另有 `diff` / `typebox`）。[E: packages/durable/package.json:102] [E: packages/durable/package.json:103] [E: packages/durable/package.json:104]

本节点覆盖 Harness、registry、内置 tasks、conversation abort / ownership、compaction / overflow、`./tools` 与 `./env`。Session kernel / document tokens 在 [subsys.durable.runtime](runtime.md)。Memory / JSONL / SQLite backends 在 [subsys.durable.storage](storage.md)——SQLite **不是**本节点。

## 关键文件

- `packages/durable/src/harness/harness.ts`：`Harness.open()`；`HarnessImpl` 继承 `SessionImpl`。[E: packages/durable/src/harness/harness.ts:407] [E: packages/durable/src/harness/harness.ts:164]
- `packages/durable/src/harness/types.ts`：`Harness` / `Conversation` / `Registry` / `ToolRegistration` / `HarnessOptions`。[E: packages/durable/src/harness/types.ts:538] [E: packages/durable/src/harness/types.ts:484] [E: packages/durable/src/harness/types.ts:201]
- `packages/durable/src/harness/define.ts`：`defineExtension` / `defineTool` / `defineTask` 的配对 helpers。[E: packages/durable/src/harness/define.ts:6] [E: packages/durable/src/harness/define.ts:13]
- `packages/durable/src/tasks.ts`：`defineTask()` 把 `TaskDefinition` 包成 `{ definition }`。[E: packages/durable/src/tasks.ts:4] [E: packages/durable/src/tasks.ts:7]
- `packages/durable/src/harness/registry.ts`：`createRegistry()`；`BUILTIN_TASKS`。[E: packages/durable/src/harness/registry.ts:112] [E: packages/durable/src/harness/registry.ts:10]
- `packages/durable/src/harness/scheduler.ts`：`TaskScheduler`；open 时把 surviving `running` 打回 `pending`。[E: packages/durable/src/harness/scheduler.ts:174] [E: packages/durable/src/harness/scheduler.ts:244]
- `packages/durable/src/harness/generation.ts` / `tool.ts` / `compaction.ts`：内置 `pi.generation` / `pi.tool` / `pi.compaction`。[E: packages/durable/src/harness/generation.ts:116] [E: packages/durable/src/harness/tool.ts:51] [E: packages/durable/src/harness/compaction.ts:103]
- `packages/durable/src/tools/index.ts`：`CodingTools` 扩展（`read` / `write` / `edit` / `bash`）。[E: packages/durable/src/tools/index.ts:19] [E: packages/durable/src/tools/index.ts:21]
- `packages/durable/src/env/index.ts` / `env/node.ts`：portable `ExecutionEnv` 与 `NodeExecutionEnv`。[E: packages/durable/src/env/index.ts:174] [E: packages/durable/src/env/node.ts:437]

## 数据模型

### `Harness` 与 `Conversation`

`Harness` 扩展 Session：同一条 mutation line，外加 scheduler、submissions、conversation handles。[E: packages/durable/src/harness/types.ts:538] [E: packages/durable/src/types.ts:899] `HarnessOptions` 必填 `models`（pi-ai `Models`）与 `registry`；可选 `settings`、`env`、`conversationCreated`、`now`、`onReport`。[E: packages/durable/src/harness/types.ts:423] [E: packages/durable/src/harness/types.ts:425] [E: packages/durable/src/harness/types.ts:426]

`Conversation` 是无状态 handle，按 `id` 比较。`submit()` 耐久承认 user input 或被动 entry write；`compact()` 承认 manual compaction；`abort()` 撤回 queued inputs 并标记 ordinary ownership 上的 live 非 background 任务。[E: packages/durable/src/harness/types.ts:484] [E: packages/durable/src/harness/types.ts:496] [E: packages/durable/src/harness/harness.ts:144]

### Registry / Extension / Tool

`createRegistry()` 只预装内置 tasks，不是一个 extension，不能卸载或替换。[E: packages/durable/src/harness/registry.ts:10] [E: packages/durable/src/harness/registry.ts:112] `install()` 按 `extension.name` 就地替换并立刻 publish；`uninstall()` 按名移除。[E: packages/durable/src/harness/registry.ts:73] [E: packages/durable/src/harness/registry.ts:82]

`defineExtension()` / `defineTool()` 是 typed identity；`defineTask()` 返回 `{ definition }`。[E: packages/durable/src/harness/define.ts:6] [E: packages/durable/src/harness/define.ts:13] [E: packages/durable/src/tasks.ts:7] `hook()` / `section()` / `wrapTool()` / `wrapSection()` 组装 hooks、prompt sections 与 wrappers。[E: packages/durable/src/harness/define.ts:20] [E: packages/durable/src/harness/define.ts:29] [E: packages/durable/src/harness/define.ts:34] [E: packages/durable/src/harness/define.ts:39]

`ToolRegistration` 在 pi-ai `Tool` 上加 `replay`（默认 `unsafe`）、`executionMode`、`prepareArguments`、`outputLimits` 与 `execute(args, api, context)`。[E: packages/durable/src/harness/types.ts:201] [E: packages/durable/src/harness/types.ts:206] [E: packages/durable/src/harness/tool.ts:88]

### Built-in documents

每个 conversation 创建/fork 时，`conversationCreated` 先种空的 `pi.live` / `pi.inbox` / `pi.usage`，再 `createAgent()` 写 `pi.agent`。[E: packages/durable/src/harness/harness.ts:354]

| token | kind | 作用 |
|---|---|---|
| `AgentDoc` | `pi.agent` | 每会话 model / extensions / tools / instructions / cwd；rewindable + `fork: "asOf"` [E: packages/durable/src/harness/agent.ts:36] [E: packages/durable/src/harness/agent.ts:37] [E: packages/durable/src/harness/agent.ts:41] |
| `LiveDoc` | `pi.live` | `run`（busy 时存在）、generation 偏、tool slots、compactions [E: packages/durable/src/harness/live.ts:63] [E: packages/durable/src/harness/live.ts:64] [E: packages/durable/src/harness/live.ts:46] |
| `InboxDoc` | `pi.inbox` | 等 boundary 的 queued submissions [E: packages/durable/src/harness/inbox.ts:16] [E: packages/durable/src/harness/inbox.ts:17] |
| `UsageDoc` | `pi.usage` | 本会话 models / tools spend [E: packages/durable/src/harness/usage.ts:14] [E: packages/durable/src/harness/usage.ts:15] |

`pi.live.run` 只能由 `pi.generation` 拥有。[E: packages/durable/src/harness/live.ts:79]

### Ownership

`TaskOwnership`：conversation-owned 或 child of another task。[E: packages/durable/src/types.ts:264] 每个 task 必须带 `ownership`；`background` 只对 conversation-owned 有效，ordinary idle / abort / cascade 会跳过它。[E: packages/durable/src/types.ts:272] [E: packages/durable/src/types.ts:279] `ConversationOwnership`：`ownerless` 或 `{ kind: "task", taskId }`。[E: packages/durable/src/types.ts:283] root conversation 经 `createRootConversation()` 以 `ownerless` + 保留 ID 写入。[E: packages/durable/src/session/transaction.ts:285] [E: packages/durable/src/session/transaction.ts:286]

### Settings / compaction policy

`resolveSettings()` 默认：`toolExecution: "parallel"`，`steeringMode` / `followUpMode: "one-at-a-time"`，retry `enabled: true, maxRetries: 3, baseDelayMs: 2000, maxAgentDelayMs: 60000`，compaction `enabled: true, reserveTokens: 16384, keepRecentTokens: 20000, backgroundTokens: 32768`。[E: packages/durable/src/harness/agent.ts:18] [E: packages/durable/src/harness/agent.ts:25] [E: packages/durable/src/harness/agent.ts:54] [E: packages/durable/src/harness/agent.ts:55] [E: packages/durable/src/harness/agent.ts:56] `HarnessImpl` 每次经 `() => resolveSettings(options.settings)` 读 settings，不把对象拷进 conversation。[E: packages/durable/src/harness/harness.ts:180] [E: packages/durable/src/harness/agent.ts:47]

`CompactionReason` 是 `"manual" | "threshold" | "overflow"`。[E: packages/durable/src/harness/types.ts:383]

## 控制流

1. 应用 `createRegistry()`，可选 `registry.install(defineExtension({...}))` / `CodingTools`。[E: packages/durable/src/harness/registry.ts:112] [E: packages/durable/src/tools/index.ts:19]
2. `Harness.open(storage, { models, registry, ... }, context)`：registry snapshot 必须含三个 `BUILTIN_TASKS`，否则抛 `create it with createRegistry()`；然后 `openTasks()`。[E: packages/durable/src/harness/harness.ts:409] [E: packages/durable/src/harness/harness.ts:416] [E: packages/durable/src/harness/harness.ts:419] [E: packages/durable/src/harness/harness.ts:232] crash 后仍为 `running` 的 task 被写成 `pending`，checkpoint 保留。[E: packages/durable/src/harness/scheduler.ts:244]
3. `root()` 若根 conversation 不存在则 `createRootConversation()`；`createConversation()` / `fork()` 必须显式 `ownership`。[E: packages/durable/src/harness/harness.ts:304] [E: packages/durable/src/harness/harness.ts:339] [E: packages/durable/src/harness/harness.ts:318] 创建 commit 里种 `pi.*` documents。[E: packages/durable/src/harness/harness.ts:354]
4. `Conversation.submit()` → `admitSubmission()`。已知 `requestId` 返回已有 submission。busy 且 `whenBusy: "reject"` 抛 `ConversationBusy`、不写库。否则入 `pi.inbox` 或直接 place 并 `startRun()`。[E: packages/durable/src/harness/submissions.ts:54] [E: packages/durable/src/harness/submissions.ts:148] [E: packages/durable/src/harness/submissions.ts:166] [E: packages/durable/src/errors.ts:20]
5. `startRun()` 创建 conversation-owned `GenerationTask`，写入 `pi.live.run`。[E: packages/durable/src/harness/generation.ts:660] [E: packages/durable/src/harness/generation.ts:671] 调度默认暂停；`submit` / `compact` / `abort` / `wait*` 会 `resume()`。[E: packages/durable/src/harness/harness.ts:236] [E: packages/durable/src/harness/scheduler.ts:259]
6. `pi.generation` `prepare`：渲染 sections、追加 positional `pi.system`。tokens `> contextWindow - reserveTokens` 且切得动 → blocking compaction（generation 拥有并 wait）；否则可在无 listed compaction 时起 background threshold compaction。[E: packages/durable/src/harness/generation.ts:156] `request` 走 `models.streamSimple()`，**不是** agent-core `runAgentLoop`。[E: packages/durable/src/harness/generation.ts:399]
7. `classify()`：`toolUse` → `startToolRound()`（默认 parallel；任一 offered tool `executionMode === "sequential"` 或 settings sequential 则整轮 sequential）。[E: packages/durable/src/harness/generation.ts:554] overflow（`stopReason === "error"` 且 `isContextOverflow`）且尚未 compacted、policy enabled、切得动 → `createCompaction(..., { reason: "overflow" }, generationTaskId)`，generation wait；overflow **不**走 retry。[E: packages/durable/src/harness/generation.ts:457] [E: packages/durable/src/harness/generation.ts:458] [E: packages/durable/src/harness/generation.ts:467] [E: packages/durable/src/harness/generation.ts:478]
8. `pi.tool`：`call` 校验 / `beforeTool` / 提交 intent（`replay` 默认 `unsafe`）再 `execute()`。recovery 进入 `execute` 仅当 stored 与当前 tool 都是 `replay: "safe"`；否则给模型 `interrupted` 错误结果。[E: packages/durable/src/harness/tool.ts:50] [E: packages/durable/src/harness/tool.ts:88] [E: packages/durable/src/harness/tool.ts:98]
9. `createCompaction()`：有 `owner`（generation）→ task-owned + blocking；无 owner → conversation-owned，且 `reason !== "manual"` 时 `background: true`。[E: packages/durable/src/harness/compaction.ts:232] [E: packages/durable/src/harness/compaction.ts:238] [E: packages/durable/src/harness/compaction.ts:240] [E: packages/durable/src/harness/compaction.ts:241] blocking 的 summary 直接 append；conversation-owned 经 write submission 在 idle 或下一 boundary 放置。
10. `Conversation.abort()`：一 commit 内 `withdrawQueuedInputs()`（queued writes 留下）并标记 ordinary traversal 到达的 live 非 background tasks；`background: true` 才穿过 background 边界并 wait 那些 task。[E: packages/durable/src/harness/harness.ts:144] [E: packages/durable/src/harness/scheduler.ts:326] [E: packages/durable/src/harness/inbox.ts:124]
11. `close()` 覆盖后调 `super.close()`；`beforeClose()` 里 `this.#tasks.join()`，在 admission sealed 之后、Storage close 之前。[E: packages/durable/src/harness/harness.ts:321] [E: packages/durable/src/harness/harness.ts:323] [E: packages/durable/src/harness/harness.ts:327] [E: packages/durable/src/harness/harness.ts:328] invocation-bound `ConversationHandle` 每次操作先 `binding.check()`，invocation 结束后拒绝新操作。[E: packages/durable/src/harness/harness.ts:380]

UI：`Conversation.viewState()` / `watch()` 挂 `ConversationView`（active entries + `pi.*` docs）。[E: packages/durable/src/harness/view.ts:25] [E: packages/durable/src/harness/view.ts:71] `watchEvents()` 是 experimental，从 view 派生 coding-agent 风格事件；与 `pi-agent-core` `AgentEvent`（loop 10 variant）不是同一类型。[E: packages/durable/src/harness/events.ts:56] [E: packages/durable/src/harness/events.ts:140] `taskGraph()` 列出 live tasks。[E: packages/durable/src/harness/task-graph.ts:62]

## `./tools` 与 `./env`

subpath `./tools` 导出四个工厂与 `CodingTools`；**没有**自动 install。[E: packages/durable/package.json:27] [E: packages/durable/src/tools/index.ts:19] [E: packages/durable/src/tools/index.ts:21]

| factory | wire name | 备注 |
|---|---|---|
| `createReadTool()` | `read` | 文本；图像 magic 命中则 error result `unsupported_image` [E: packages/durable/src/tools/read.ts:27] [E: packages/durable/src/tools/read.ts:35] [E: packages/durable/src/tools/read.ts:45] |
| `createWriteTool()` | `write` | 经 `withFileMutationQueue` [E: packages/durable/src/tools/write.ts:18] |
| `createEditTool()` | `edit` | `prepareArguments` 修 JSON-string / legacy `oldText`；同样走 mutation queue [E: packages/durable/src/tools/edit.ts:92] [E: packages/durable/src/tools/edit.ts:96] |
| `createBashTool()` | `bash` | `outputLimits.retain: "tail"`；经 `env.exec` [E: packages/durable/src/tools/bash.ts:49] [E: packages/durable/src/tools/bash.ts:52] |

`image.ts` 只导出 `detectSupportedImageMimeType()`，**不是** tool。[E: packages/durable/src/tools/image.ts:3] `withFileMutationQueue` 按 `env.id` + canonical path 串行化本进程内 `edit`/`write`；不锁 `bash` 或其他进程。[E: packages/durable/src/tools/file-mutation-queue.ts:33]

这四工具 **不是** coding-agent 的 8 工具 ground truth（无 grep / find / ls / powershell）。它们只通过 `ToolExecutionApi.env`（`ExecutionEnv` = `FileSystem` + `Shell`）碰文件与进程。[E: packages/durable/src/env/index.ts:174] 无 `HarnessOptions.env` 时 `buildEnv` 返回 `undefined`，内置工具 `requireEnv()` 在 `api.env === undefined` 时抛 `No execution environment is configured`。[E: packages/durable/src/harness/harness.ts:226] [E: packages/durable/src/tools/env.ts:5] [E: packages/durable/src/tools/env.ts:6] Node 绑定是 `NodeExecutionEnv`，`id = "node:local"`，走 subpath `./env/node`。[E: packages/durable/src/env/node.ts:437] [E: packages/durable/src/env/node.ts:439] [E: packages/durable/package.json:21]

## 设计动机与权衡

先 commit 再展示：generation 偏最多每 100 ms 落 `pi.live`；tool intent 在 `execute()` 之前入 checkpoint。进程死在 turn 中间，reopen + `resume()` 从最后 checkpoint 继续。[E: packages/durable/README.md:5] [E: packages/durable/src/harness/generation.ts:108] [E: packages/durable/src/harness/scheduler.ts:244]

Registry 存代码、conversation 只存名字。`resolveAgent()` 每次对当前 snapshot + settings 解析；wrapper throw 或改名会丢掉 target 并 `onReport`。[E: packages/durable/src/harness/agent.ts:147]

Generation 直接调 pi-ai `Models`，与 [spine.agent-loop](../../spine/agent-loop.md) 的 `runAgentLoop` 平行，不是它的包装。1.0 把可复用 harness 从 `pi-agent-core` 拆到 `pi-durable`，agent-core 只留 loop。[E: packages/agent/CHANGELOG.md:11] [E: packages/durable/src/harness/generation.ts:399]

`env` 按 conversation `cwd` 每次构建，根入口仍 runtime-neutral；Node fs / bash 走 `./env/node`。JSONL / SQLite 同样是显式 storage subpath，见 [subsys.durable.storage](storage.md)。

## gotcha

- **不要**把 `Harness` 写成默认 `pi` CLI 会话。产品 JSONL 仍是 `SessionManager`（`CURRENT_SESSION_VERSION = 3`）。[E: packages/coding-agent/src/core/session-manager.ts:41] `pi` bin 指向 `dist/bundle/cli.js`；published `files` 排除 `dist/experimental`。[E: packages/coding-agent/package.json:10] [E: packages/coding-agent/package.json:32] experimental 路径才会 `Harness.open(openNodeSqliteStorage(...))`：session worker、durable TUI、vacation planner 三处都打开，不是 worker 独有。[E: packages/coding-agent/src/experimental/session-worker.ts:784] [E: packages/coding-agent/src/experimental/session-worker.ts:785] [E: packages/coding-agent/src/experimental/durable/runtime.ts:138] [E: packages/coding-agent/src/experimental/durable/runtime.ts:139] [E: packages/coding-agent/src/experimental/vacation/runtime.ts:135] [E: packages/coding-agent/src/experimental/vacation/runtime.ts:136] `PI_EXPERIMENTAL=1` 闸的是 `pi server`/`pi client`（`areExperimentalFeaturesEnabled()`），worker 打开行本身不读该环境变量。[E: packages/coding-agent/src/core/experimental.ts:2] [E: packages/coding-agent/src/experimental/commands.ts:86] coding-agent `dependencies` 列出 `pi-agent-core` / `pi-ai`，**未**列出 `pi-durable`。[E: packages/coding-agent/package.json:51] [E: packages/coding-agent/package.json:52] 默认 CLI 会不会切到 Harness：[U]
- **不要**再 cite `packages/agent/src/harness/**` 或把 `AgentHarness` 当现行 API。agent-core 现行入口没有 harness。[E: packages/agent/src/index.ts:1] [E: packages/agent/package.json:8]
- **不要**把 `packages/durable/docs/pico*` 当 shipped 源。
- `Harness.open()` 的 registry 必须来自 `createRegistry()`（或等价地含三个 built-in tasks）。[E: packages/durable/src/harness/harness.ts:419]
- reopen 后 `viewState()` / `watch()` 不调用 `resume()`；要续跑须 `resume()` 或 submit / wait。[E: packages/durable/src/harness/harness.ts:154] [E: packages/durable/src/harness/harness.ts:236]
- `CodingTools` 不会自动安装；读图目前 error，不是 image tool。[E: packages/durable/src/tools/index.ts:19] [E: packages/durable/src/tools/read.ts:45]
- tool `replay` 默认 `unsafe`：中断后不重跑副作用。[E: packages/durable/src/harness/tool.ts:88]
- `whenBusy: "reject"` 抛 `ConversationBusy` 且不写 storage。[E: packages/durable/src/harness/submissions.ts:166]
- durable `watchEvents()` 的 `AgentEvent` ≠ `packages/agent/src/types.ts` 的 loop `AgentEvent`。[E: packages/durable/src/harness/events.ts:56]
- SQLite / JSONL adapter 细节不在本节点，见 [subsys.durable.storage](storage.md)。

## 跨包边界

- **依赖** [subsys.durable.runtime](runtime.md) 的 `Session` / `Tx` / `createSession`：`HarnessImpl extends SessionImpl`。[E: packages/durable/src/harness/harness.ts:164] [E: packages/durable/src/session/session.ts:59]
- **依赖** [subsys.durable.storage](storage.md) 的 `Storage`。Harness 不实现 SQLite。
- **依赖** Chord `Context` 与 pi-ai `Models` / `Message` / `Tool`。不依赖 `pi-agent-core`。[E: packages/durable/package.json:103] [E: packages/durable/package.json:104]
- **对照** [spine.agent-loop](../../spine/agent-loop.md)：产品默认路径仍是 agent-core `Agent` + coding-agent `AgentSession`；durable generation 是另一套 task 状态机。
- **被依赖（experimental only）**：coding-agent session worker / durable TUI / vacation planner。不是 published `pi` CLI。见 [subsys.coding-agent.experimental-cli](../coding-agent/experimental-cli.md)。
- **分层**：durable 在根 build 里排在 ai 之后、agent 之前。见 [spine.layered-architecture](../../spine/layered-architecture.md) 与 [ref.package-index](../../reference/package-index.md)。

## Sources

- packages/durable/package.json
- packages/durable/README.md
- packages/durable/CHANGELOG.md
- packages/durable/src/index.ts
- packages/durable/src/tasks.ts
- packages/durable/src/errors.ts
- packages/durable/src/types.ts
- packages/durable/src/session/session.ts
- packages/durable/src/session/transaction.ts
- packages/durable/src/harness/harness.ts
- packages/durable/src/harness/types.ts
- packages/durable/src/harness/define.ts
- packages/durable/src/harness/agent.ts
- packages/durable/src/harness/registry.ts
- packages/durable/src/harness/scheduler.ts
- packages/durable/src/harness/submissions.ts
- packages/durable/src/harness/generation.ts
- packages/durable/src/harness/tool.ts
- packages/durable/src/harness/compaction.ts
- packages/durable/src/harness/inbox.ts
- packages/durable/src/harness/live.ts
- packages/durable/src/harness/events.ts
- packages/durable/src/harness/view.ts
- packages/durable/src/harness/task-graph.ts
- packages/durable/src/harness/usage.ts
- packages/durable/src/harness/prompt.ts
- packages/durable/src/tools/index.ts
- packages/durable/src/tools/env.ts
- packages/durable/src/tools/bash.ts
- packages/durable/src/tools/read.ts
- packages/durable/src/tools/edit.ts
- packages/durable/src/tools/write.ts
- packages/durable/src/tools/image.ts
- packages/durable/src/tools/file-mutation-queue.ts
- packages/durable/src/env/index.ts
- packages/durable/src/env/node.ts
- packages/agent/package.json
- packages/agent/src/index.ts
- packages/agent/CHANGELOG.md
- packages/coding-agent/package.json
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/core/experimental.ts
- packages/coding-agent/src/experimental/commands.ts
- packages/coding-agent/src/experimental/session-worker.ts
- packages/coding-agent/src/experimental/durable/runtime.ts
- packages/coding-agent/src/experimental/vacation/runtime.ts

## 相关

- [subsys.durable.runtime](runtime.md) - Session kernel、document tokens、`createSession`。
- [subsys.durable.storage](storage.md) - Memory / JSONL / SQLite；Harness 把 SQLite 当 Storage。
- [spine.layered-architecture](../../spine/layered-architecture.md) - 1.0 可复用 harness 在 `pi-durable`。
- [spine.agent-loop](../../spine/agent-loop.md) - agent-core `runAgentLoop`；与 durable `GenerationTask` 平行。
- [ref.package-index](../../reference/package-index.md) - `@earendil-works/pi-durable` 1.0.1。
- [subsys.coding-agent.session-manager](../coding-agent/session-manager.md) - 产品 JSONL `SessionManager` v3。
- [subsys.coding-agent.experimental-cli](../coding-agent/experimental-cli.md) - experimental session worker / durable TUI / vacation 才打开 Harness；`PI_EXPERIMENTAL=1` 只闸 `pi server`/`pi client`。
