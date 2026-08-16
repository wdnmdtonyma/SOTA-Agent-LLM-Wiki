---
id: spine.overview
title: pi 源码总览
kind: flow
tier: T0
pkg: cross
source:
  - README.md
  - package.json
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/core/agent-session-runtime.ts
  - packages/coding-agent/src/core/agent-session-services.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/model-runtime.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/modes/rpc/rpc-types.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/stream-fn.ts
  - packages/agent/src/types.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/tools/index.ts
  - packages/ai/src/models.ts
  - packages/ai/src/providers/all.ts
  - packages/session-backends/sqlite-node/package.json
  - packages/telemetry/package.json
  - packages/evals/package.json
  - packages/server/package.json
  - packages/server/src/index.ts
symbols:
  - main
  - Agent
  - runAgentLoop
  - getDefaultStreamFn
  - setDefaultStreamFn
  - AgentSession
  - ModelRuntime
  - ModelRegistry
  - Models
related:
  - spine.layered-architecture
  - spine.process-lifecycle
  - spine.agent-loop
  - spine.provider-stream
  - spine.session-state-model
  - ref.package-index
evidence: explicit
status: verified
updated: 086c32e745
---

> `spine.overview` 描述 Pi monorepo 从 `pi-coding-agent` CLI 产品入口，经 reusable `pi-agent-core` harness，再到 multi-provider `pi-ai` streaming 的端到端主路径；远程 `protocol` / `client` / `server` 是另一条 composable session 栈，不等于本地 RPC mode。

## 能回答的问题

- Pi monorepo 当前 workspace 如何组成：`packages/*` + `packages/session-backends/*` + 五个 extension examples？
- `main()` 怎样把 argv、settings、session、trust 和 mode 组装成一次可运行的 coding agent session？
- `pi-agent-core` 的 `Agent` / `runAgentLoop` 与 `pi-coding-agent` 的 `AgentSession` 边界在哪里？
- 模型与 provider streaming 在 `pi-ai`、`ModelRuntime` 和 `Agent` stream function 之间怎样交接？
- 内置工具、slash commands、RPC protocol、telemetry、session-backends 这些能力的 ground truth 文件在哪里？

## 总览图

```mermaid
flowchart TD
  CLI["pi-coding-agent main(args)"] --> Parse["parseArgs + resolveAppMode"]
  Parse --> RuntimeFactory["CreateAgentSessionRuntimeFactory"]
  RuntimeFactory --> Services["createAgentSessionServices(cwd, agentDir)"]
  Services --> Registry["ModelRuntime + ResourceLoader + SettingsManager"]
  RuntimeFactory --> SDK["createAgentSessionFromServices"]
  SDK --> Session["AgentSession product facade"]
  SDK --> CoreAgent["pi-agent-core Agent"]
  Session --> ToolDefs["Built-in + extension tool definitions"]
  CoreAgent --> Loop["runAgentLoop / runAgentLoopContinue"]
  Loop --> LLM["streamAssistantResponse"]
  LLM --> StreamFn["coding-agent streamFn"]
  StreamFn --> PiAI["ModelRuntime.streamSimple -> pi-ai Provider"]
  PiAI --> Wire["provider wire API"]
  Loop --> ToolExec["validate + execute tool calls"]
  ToolExec --> Session
  CLI --> Modes["interactive / rpc / print mode"]
  Modes --> Session
  Telemetry["pi-telemetry contracts"] -.-> CoreAgent
  Telemetry -.-> PiAI
  SQLite["pi-session-backend-sqlite-node"] -.-> Harness["AgentHarness v4 Session"]
  Protocol["pi-protocol CBOR"] --> Client["pi-client"]
  Protocol --> Server["pi-server PiServer"]
  Client --> RemoteAdapter["coding-agent ./client"]
```

## 端到端主路径

1. `README.md` 把 Pi 定义为 Pi agent harness 项目；产品入口是 `@earendil-works/pi-coding-agent`，runtime 是 `@earendil-works/pi-agent-core`，LLM API 是 `@earendil-works/pi-ai`。[E: README.md:13] [E: README.md:15] [E: README.md:33] [E: README.md:32] [E: README.md:31]
2. 根 `workspaces` 是 `packages/*`、`packages/session-backends/*`，再显式列入五个 coding-agent extension examples（`with-deps`、`custom-provider-anthropic`、`custom-provider-gitlab-duo`、`sandbox`、`gondolin`）。[E: package.json:5] [E: package.json:6] [E: package.json:7] [E: package.json:8] [E: package.json:9] [E: package.json:10] [E: package.json:11] [E: package.json:12]
3. `main(args)` 是 `pi-coding-agent` 的 exported CLI entry point：先处理 auth / package / config 子命令，再 `parseArgs(args)` 进入 session 与 runtime 装配。[E: packages/coding-agent/src/main.ts:569] [E: packages/coding-agent/src/main.ts:578] [E: packages/coding-agent/src/main.ts:592] [E: packages/coding-agent/src/main.ts:605] [E: packages/coding-agent/src/main.ts:609]
4. `resolveAppMode()` 决定 app mode：`rpc` 与 `json` 走显式 mode；`--print` 或非 TTY stdin/stdout 进入 print mode；其余进入 interactive mode。[E: packages/coding-agent/src/main.ts:118] [E: packages/coding-agent/src/main.ts:119] [E: packages/coding-agent/src/main.ts:122] [E: packages/coding-agent/src/main.ts:125] [E: packages/coding-agent/src/main.ts:128]
5. `createSessionManager()` 选择产品级 `SessionManager`：`--no-session` / help / list models 走 in-memory；`--fork` / `--session` / `--resume` / `--continue` / `--session-id` 分别 fork、open、select、continue 或 create。[E: packages/coding-agent/src/main.ts:360] [E: packages/coding-agent/src/main.ts:366] [E: packages/coding-agent/src/main.ts:370] [E: packages/coding-agent/src/main.ts:393] [E: packages/coding-agent/src/main.ts:417] [E: packages/coding-agent/src/main.ts:434] [E: packages/coding-agent/src/main.ts:438] [E: packages/coding-agent/src/main.ts:450]
6. `main(args)` 创建 `CreateAgentSessionRuntimeFactory`：在目标 cwd 下调用 `createAgentSessionServices()` 得到 `SettingsManager`、`ModelRuntime`、`ResourceLoader`，再把 model / thinking / scoped models / tool allow-deny / custom tools 交给 `createAgentSessionFromServices()`。[E: packages/coding-agent/src/main.ts:719] [E: packages/coding-agent/src/main.ts:738] [E: packages/coding-agent/src/main.ts:783] [E: packages/coding-agent/src/main.ts:823]
7. `createAgentSessionRuntime()` 用该 factory 构造 `AgentSessionRuntime`；`switchSession()` / `newSession()` / `fork()` / `importFromJsonl()` 都通过保存的 `createRuntime` 重建并替换当前 runtime。[E: packages/coding-agent/src/core/agent-session-runtime.ts:74] [E: packages/coding-agent/src/core/agent-session-runtime.ts:196] [E: packages/coding-agent/src/core/agent-session-runtime.ts:226] [E: packages/coding-agent/src/core/agent-session-runtime.ts:262] [E: packages/coding-agent/src/core/agent-session-runtime.ts:361] [E: packages/coding-agent/src/core/agent-session-runtime.ts:414]
8. `createAgentSession()` 创建 core `Agent`，注入 coding-agent 的 `convertToLlm` wrapper、provider `streamFn`、extension hooks、queue mode、transport、thinking budgets，然后创建 `AgentSession` facade。[E: packages/coding-agent/src/core/sdk.ts:171] [E: packages/coding-agent/src/core/sdk.ts:297] [E: packages/coding-agent/src/core/sdk.ts:305] [E: packages/coding-agent/src/core/sdk.ts:379]
9. `Agent.prompt()` / `Agent.continue()` 是 stateful wrapper 到 loop 的调用点：`prompt()` 规范化输入后走 `runPromptMessages()` → `runAgentLoop()`；`continue()` 在 last message 不是 assistant 时走 `runContinuation()` → `runAgentLoopContinue()`，若 last 是 assistant 且 steering / follow-up 队列非空则改走 `runPromptMessages()`。两条 loop 入口都传入 context snapshot、loop config、event processor 和 `streamFunction`。[E: packages/agent/src/agent.ts:350] [E: packages/agent/src/agent.ts:361] [E: packages/agent/src/agent.ts:374] [E: packages/agent/src/agent.ts:380] [E: packages/agent/src/agent.ts:414] [E: packages/agent/src/agent.ts:427]
10. `runAgentLoop()` 将 prompt 追加到 context，emit `agent_start` / `turn_start` / message start-end，然后进入 `runLoop()`；`runLoop()` 负责 assistant streaming、tool call detection、tool execution、turn end、prepare-next-turn、stop condition、steering / follow-up polling。[E: packages/agent/src/agent-loop.ts:95] [E: packages/agent/src/agent-loop.ts:109] [E: packages/agent/src/agent-loop.ts:116] [E: packages/agent/src/agent-loop.ts:155] [E: packages/agent/src/agent-loop.ts:193] [E: packages/agent/src/agent-loop.ts:203] [E: packages/agent/src/agent-loop.ts:224] [E: packages/agent/src/agent-loop.ts:232] [E: packages/agent/src/agent-loop.ts:247] [E: packages/agent/src/agent-loop.ts:259]
11. `runAgentLoop()` 把 `streamFn ?? getDefaultStreamFn()` 交给 `runLoop()`；`getDefaultStreamFn()` 在未安装时抛错，`pi-agent-core` 本身不绑定 provider。`pi-coding-agent` 在 SDK 模块顶层调用 `setDefaultStreamFn(streamSimple)`；产品装配的 `streamFn` 则直接调 `ModelRuntime.streamSimple()`。[E: packages/agent/src/agent-loop.ts:116] [E: packages/agent/src/stream-fn.ts:11] [E: packages/agent/src/stream-fn.ts:15] [E: packages/coding-agent/src/core/sdk.ts:36] [E: packages/coding-agent/src/core/sdk.ts:315]
12. `streamAssistantResponse()` 先跑 `transformContext`，再 `convertToLlm` 把 `AgentMessage[]` 转成 LLM `Message[]`，构造 `Context`，然后调用已经解析好的 `streamFunction`。[E: packages/agent/src/agent-loop.ts:281] [E: packages/agent/src/agent-loop.ts:290] [E: packages/agent/src/agent-loop.ts:295] [E: packages/agent/src/agent-loop.ts:298] [E: packages/agent/src/agent-loop.ts:308]
13. tool execution 在 `pi-agent-core` loop 内按 generic contract 执行：从 assistant content 筛出 `toolCall`；若 `toolExecution === "sequential"` 或任一工具 `executionMode === "sequential"` 则串行，否则并行。[E: packages/agent/src/agent-loop.ts:411] [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:422]
14. `main(args)` 最后按 app mode 派发：RPC mode 调 `runRpcMode(runtime)`，interactive mode 创建 `InteractiveMode(runtime)` 并 `run()`，print / json mode 调 `runPrintMode(runtime, ...)`。[E: packages/coding-agent/src/main.ts:927] [E: packages/coding-agent/src/main.ts:929] [E: packages/coding-agent/src/main.ts:930] [E: packages/coding-agent/src/main.ts:961] [E: packages/coding-agent/src/main.ts:964]

## 包边界

`pi-agent-core` 是可复用 runtime harness：`Agent` 持有 transcript、lifecycle listener、steering / follow-up queue、`streamFunction` 和 tool hooks；底层 `runAgentLoop` / `runAgentLoopContinue` 消费 context、loop config、event sink 和 `StreamFn`。[E: packages/agent/src/agent.ts:173] [E: packages/agent/src/agent.ts:181] [E: packages/agent/src/agent-loop.ts:95] [E: packages/agent/src/agent-loop.ts:120] `AgentHarness` 是另一条可复用入口，绑定 v4 `Session` / `SessionTree`，不是 CLI 产品默认路径。[E: packages/agent/src/harness/agent-harness.ts:305] [E: packages/agent/src/harness/agent-harness.ts:307]

`pi-coding-agent` 是产品装配层：`main()` 管 argv parsing、settings、session selection、project trust、runtime creation、mode dispatch；`createAgentSessionFromServices()` 把 cwd-bound services 转给 `createAgentSession()`，后者把 `Agent`、`SessionManager`、`SettingsManager`、`ResourceLoader`、`ModelRuntime` 包成 `AgentSession`。[E: packages/coding-agent/src/main.ts:569] [E: packages/coding-agent/src/core/agent-session-services.ts:202] [E: packages/coding-agent/src/core/sdk.ts:379] 产品会话文件由 `SessionManager`（`CURRENT_SESSION_VERSION = 3`）管理，与 harness v4 `JsonlSessionRepo` / `Session` 不是同一套 API。[E: packages/coding-agent/src/core/session-manager.ts:30] [E: packages/coding-agent/src/core/session-manager.ts:855] `spine.session-state-model` 展开这两套状态模型。[I]

`pi-ai` 是 provider / runtime LLM API 层：`Provider` 拥有 id / name / auth / model listing / stream；`Models` 是 provider collection，负责 auth application 并把 stream request 委派给拥有该 model 的 provider；built-in 集合由 `builtinProviders()` / `builtinModels()` 构造。[E: packages/ai/src/models.ts:97] [E: packages/ai/src/models.ts:156] [E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:135]

`pi-tui` 是 differential rendering 的 terminal UI library。[E: README.md:34] 本 overview 的主路径里，interactive mode 只创建 `InteractiveMode(runtime)` 并 `run()`；TUI 组件细节不在本节点展开。[E: packages/coding-agent/src/main.ts:931] [E: packages/coding-agent/src/main.ts:961]

`@earendil-works/pi-telemetry` 提供 vendor-neutral telemetry contracts。[E: packages/telemetry/package.json:2] [E: packages/telemetry/package.json:4] `@earendil-works/pi-session-backend-sqlite-node` 是可选的 Node `node:sqlite` session backend，实现 agent-core 的 `SessionRepo` seam。[E: packages/session-backends/sqlite-node/package.json:2] [E: packages/session-backends/sqlite-node/package.json:4] `pi-evals` 是 `private: true` 的真实 `AgentSession` 评测消费者。[E: packages/evals/package.json:2] [E: packages/evals/package.json:4]

`pi-protocol` / `pi-client` / `pi-server` 组成 transport-neutral remote-session 栈。`pi-server` 只导出 composable `PiServer`（`.` / `./testing` / `./unix`），没有 `server` binary，也没有 legacy JSONL IPC / supervisor / Radius 入口。[E: packages/server/package.json:8] [E: packages/server/src/index.ts:1] 这条 remote 栈不等于 `pi-coding-agent` 本地 RPC mode（`runRpcMode` 读 JSONL stdin 的 `RpcCommand`）。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20]

## 关键决策点

`CreateAgentSessionRuntimeFactory` 把 process-global inputs 与 cwd-bound services 分开：factory 接受 cwd、agentDir、sessionManager、sessionStartEvent、projectTrustContext；`createAgentSessionServices()` 在 effective cwd 下创建 `ModelRuntime`、`SettingsManager`、`DefaultResourceLoader`，reload resources，并把 extension provider registrations 写入 runtime。[E: packages/coding-agent/src/main.ts:719] [E: packages/coding-agent/src/core/agent-session-services.ts:135] [E: packages/coding-agent/src/core/agent-session-services.ts:158]

`AgentSession._buildRuntime()` 是产品工具和 extension runtime 的重装点：默认用 `createAllToolDefinitions()` 创建内置工具，再构造 `ExtensionRunner`；默认 active built-in tools 是 `read`、`bash`、`edit`、`write`。完整 built-in name set 在 tools index 中是 `read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`。[E: packages/coding-agent/src/core/agent-session.ts:2556] [E: packages/coding-agent/src/core/agent-session.ts:2571] [E: packages/coding-agent/src/core/agent-session.ts:2587] [E: packages/coding-agent/src/core/agent-session.ts:2602] [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:156]

`ModelRuntime` 是 `pi-coding-agent` 对 `pi-ai` 的产品侧运行时：实现 `Models`，加载 built-ins 与 `models.json`，合成 extension provider，提供 lookup / availability / auth，并在 dispatch 前完成 auth / baseUrl / header / env 准备。[E: packages/coding-agent/src/core/model-runtime.ts:130] [E: packages/coding-agent/src/core/model-runtime.ts:610] [E: packages/coding-agent/src/core/model-runtime.ts:636] `ModelRegistry` 只是传给 extension 的同步 compatibility facade。[E: packages/coding-agent/src/core/model-registry.ts:32]

`StreamFn` 的类型边界在 `pi-agent-core`：必须返回 assistant event stream，失败走 stream 内 `stopReason "error" | "aborted"`，不能靠抛异常表达 provider 失败。[E: packages/agent/src/types.ts:28] coding-agent 注入的 wrapper 调用 `ModelRuntime.streamSimple()`。[E: packages/coding-agent/src/core/sdk.ts:305] [E: packages/coding-agent/src/core/sdk.ts:315]

## Ground Truth 索引

内置工具集的 ground truth 是 `packages/coding-agent/src/core/tools/index.ts`：`ToolName` / `allToolNames` 列出 `read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`，`createAllToolDefinitions()` 返回同一组 definitions。[E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:156]

provider 集的 ground truth 是 `packages/ai/src/providers/all.ts`：`builtinProviders()` freshly constructs provider factories，`builtinModels()` 创建 `Models` collection 并逐个 `setProvider()`。[E: packages/ai/src/providers/all.ts:89] [E: packages/ai/src/providers/all.ts:135] [E: packages/ai/src/providers/all.ts:138]

slash command 的 built-in ground truth 是 `BUILTIN_SLASH_COMMANDS`；RPC command union 在 `rpc-types.ts`，RPC mode 在 `switch (command.type)` 内 dispatch。[E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:389]

agent-core 还公开依赖 `ExecutionEnv` 的 `createBashTool` / `createReadTool` / `createEditTool` / `createWriteTool` factories；调用方必须显式安装，它们不是 coding-agent 七工具 registry。[E: packages/agent/src/harness/tools/index.ts:7] [E: packages/agent/src/harness/tools/index.ts:10] [E: packages/agent/src/harness/tools/index.ts:15] [E: packages/agent/src/harness/tools/index.ts:23]

## 指向 T1/T2 深挖

`spine.layered-architecture` 应从 package-level 解释 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui`、remote 栈、`pi-telemetry` 与 `session-backends` 的依赖方向。[I]

`spine.process-lifecycle` 应从 `main(args)` 展开 argv parsing、session selection、project trust、runtime creation、mode dispatch。[I]

`spine.agent-loop` 应从 `Agent.prompt()` / `runAgentLoop()` 展开 one turn 内 assistant streaming、tool calls、steering、follow-up、termination。[I]

`spine.provider-stream` 应从 `ModelRuntime`、`streamFn`、`pi-ai` provider dispatch、wire API 展开 request / response normalization。[I]

`spine.session-state-model` 应对比 harness v4 `Session` / lane-based entries 与 coding-agent `SessionManager` v3。[I]

`ref.package-index` 应列出 monorepo 包、build / test / publish 与 package metadata。[I]

## Sources

- README.md
- package.json
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/core/agent-session-runtime.ts
- packages/coding-agent/src/core/agent-session-services.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/model-runtime.ts
- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/modes/rpc/rpc-types.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/stream-fn.ts
- packages/agent/src/types.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/tools/index.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/all.ts
- packages/session-backends/sqlite-node/package.json
- packages/telemetry/package.json
- packages/evals/package.json
- packages/server/package.json
- packages/server/src/index.ts

## 相关

- [spine.layered-architecture](layered-architecture.md) - 分层架构与包边界。
- [spine.process-lifecycle](process-lifecycle.md) - 进程生命周期（argv → mode → session）。
- [spine.agent-loop](agent-loop.md) - agent 回合循环（一次 turn）。
- [spine.provider-stream](provider-stream.md) - provider 流式调用（统一 → wire → 归一）。
- [spine.session-state-model](session-state-model.md) - harness v4 Session 与产品 SessionManager。
- [ref.package-index](../reference/package-index.md) - monorepo 包索引与工具链。
