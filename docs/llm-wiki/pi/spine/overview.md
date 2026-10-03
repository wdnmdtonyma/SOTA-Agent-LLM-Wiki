---
id: spine.overview
title: pi 源码总览
kind: flow
tier: T0
pkg: cross
source:
  - README.md
  - package.json
  - flake.nix
  - packages/chord/package.json
  - packages/chord/src/index.ts
  - packages/codemode/package.json
  - packages/codemode/src/index.ts
  - packages/codemode/src/runtime/host.ts
  - packages/mcp/package.json
  - packages/mcp/src/index.ts
  - packages/mcp/src/client.ts
  - packages/durable/package.json
  - packages/durable/src/index.ts
  - packages/durable/src/harness/harness.ts
  - packages/durable/src/session/session.ts
  - packages/durable/src/tools/index.ts
  - packages/durable/src/storage/sqlite/node.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/core/agent-session-runtime.ts
  - packages/coding-agent/src/core/agent-session-services.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/model-runtime.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/src/core/tools/read.ts
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/extensions/mcp/cli.lazy.ts
  - packages/coding-agent/src/package-manager-cli.ts
  - packages/coding-agent/src/modes/rpc/rpc-types.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/coding-agent/src/client/index.ts
  - packages/coding-agent/package.json
  - packages/coding-agent/CHANGELOG.md
  - packages/coding-agent/test/builtin-tool-strict-mode.test.ts
  - packages/agent/src/index.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/stream-fn.ts
  - packages/agent/src/types.ts
  - packages/agent/src/proxy.ts
  - packages/agent/package.json
  - packages/agent/CHANGELOG.md
  - packages/ai/src/models.ts
  - packages/ai/src/providers/all.ts
  - packages/ai/src/utils/transcript.ts
  - packages/ai/package.json
  - packages/client/src/index.ts
  - packages/client/src/client.ts
  - packages/client/package.json
  - packages/telemetry/package.json
  - packages/evals/package.json
  - packages/tui/package.json
  - packages/protocol/package.json
  - packages/server/package.json
  - packages/server/src/index.ts
  - packages/server/src/server.ts
symbols:
  - main
  - Agent
  - runAgentLoop
  - getDefaultStreamFn
  - setDefaultStreamFn
  - streamProxy
  - AgentSession
  - ModelRuntime
  - ModelRegistry
  - Models
  - Client
  - createSession
  - Harness
  - McpClient
  - CodemodeSandbox
  - ROOT_CONVERSATION_ID
related:
  - spine.layered-architecture
  - spine.process-lifecycle
  - spine.agent-loop
  - spine.provider-stream
  - spine.session-state-model
  - spine.extension-lifecycle
  - subsys.chord.runtime
  - subsys.chord.delta
  - subsys.durable.runtime
  - subsys.durable.storage
  - ref.package-index
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `spine.overview` 描述 Pi monorepo（产品版本 **1.0.1** + `[Unreleased]`，wiki target SHA `4c6fb7cfe8`）从 `pi-coding-agent` CLI 产品入口，经瘦身后的 `pi-agent-core` `Agent` loop，再到 multi-provider `pi-ai` streaming 的端到端主路径。一阶源码包 **13** 个：`chord`、`tui`、`telemetry`、**`codemode`**、**`mcp`**、`ai`、`durable`、`agent`、`protocol`、`client`、`server`、`coding-agent`、`evals`。`@earendil-works/pi-agent-core` 1.0 只导出 `Agent` / loop / proxy stream / types；**可复用 session/harness 在 `pi-durable`**（含 SQLite），不是 coding-agent `SessionManager` JSONL 的替代。MCP 与 codemode 是产品能力：独立包 + coding-agent 内置 replaceable 扩展。`@earendil-works/chord` 是独立 application-composition runtime；远程 `protocol` / Chord 风格 `pi-client` `Client` / `pi-server` 是另一条 composable session 栈，不等于本地 RPC mode。

## 能回答的问题

- Pi monorepo 当前 workspace 如何组成：13 个一阶源码包（含 `codemode`、`mcp`）+ 5 个 extension-example？根 `workspaces` 是否还包含 `session-backends`？
- 根 `build` 顺序为什么从 `@earendil-works/chord` 开始，`codemode` / `mcp` 插在哪，`evals` 是否在根 `build` 里？
- `main()` 怎样把 argv、settings、session、trust、`pi mcp` 子命令和 mode 组装成一次可运行的 coding agent session？
- `pi-agent-core` 1.0 还剩什么？可复用 harness 在哪个包？它与 `pi-coding-agent` 的 `AgentSession` 边界在哪里？
- 模型与 provider streaming 在 `pi-ai`、`ModelRuntime` 和 `Agent` stream function 之间怎样交接？
- MCP、codemode、内置工具、slash commands、RPC、telemetry、durable SQLite 这些能力的 ground truth 文件在哪里？产品 1.0.1 的 Nix flake 与 managed installer 落在哪？

## 总览图

```mermaid
flowchart TD
  CLI["pi-coding-agent main(args)"] --> Parse["parseArgs + resolveAppMode"]
  CLI --> McpCmd["pi mcp subcommand"]
  Parse --> RuntimeFactory["CreateAgentSessionRuntimeFactory"]
  RuntimeFactory --> Services["createAgentSessionServices(cwd, agentDir)"]
  Services --> Registry["ModelRuntime + ResourceLoader + SettingsManager"]
  RuntimeFactory --> SDK["createAgentSessionFromServices"]
  SDK --> Session["AgentSession product facade"]
  SDK --> CoreAgent["pi-agent-core Agent"]
  Session --> ToolDefs["Built-in + extension tool definitions"]
  Session --> BuiltIns["built-in extensions: mcp / codemode / tool-search / llama.cpp"]
  CoreAgent --> Loop["runAgentLoop / runAgentLoopContinue"]
  Loop --> LLM["streamAssistantResponse"]
  LLM --> StreamFn["coding-agent streamFn"]
  StreamFn --> PiAI["ModelRuntime.streamSimple -> pi-ai Provider"]
  PiAI --> Wire["provider wire API"]
  Loop --> ToolExec["validate + execute tool calls"]
  ToolExec --> Session
  CLI --> Modes["interactive / rpc / print mode"]
  Modes --> Session
  Telemetry["pi-telemetry contracts"] -.-> PiAI
  Codemode["pi-codemode CodemodeSandbox"] -.-> BuiltIns
  McpPkg["pi-mcp McpClient"] -.-> BuiltIns
  Chord["@earendil-works/chord"] --> Client["pi-client Client"]
  Chord --> Server["pi-server"]
  Chord --> Durable["pi-durable createSession + Harness"]
  PiAI --> Durable
  Protocol["pi-protocol CBOR"] --> Client
  Protocol --> Server
  Client -.-> Reexport["coding-agent ./client source-only re-export"]
```

## 端到端主路径

1. `README.md` 把 Pi 定义为可定制的 agent harness；产品入口是 `@earendil-works/pi-coding-agent`。All Packages 表列出 chord、telemetry、ai、durable、agent-core、coding-agent、tui 这组用户可见库；workspace 一阶源码包是 **13** 个，另含 `codemode`、`mcp`、`protocol`、`client`、`server`、`evals`。[E: README.md:15] [E: README.md:78] [E: README.md:79] [E: README.md:80] [E: README.md:81] [E: README.md:82] [E: README.md:83] [E: README.md:84] 公开包版本 **1.0.1**；coding-agent changelog 同时有空的 `[Unreleased]` 与 `[1.0.1]`。[E: packages/coding-agent/package.json:3] [E: packages/coding-agent/CHANGELOG.md:3] [E: packages/coding-agent/CHANGELOG.md:5]
2. 根 `workspaces` 是 `packages/*`，再显式列入五个 coding-agent extension examples（`with-deps`、`custom-provider-anthropic`、`custom-provider-gitlab-duo`、`sandbox`、`gondolin`）。**没有** `packages/session-backends/*`。[E: package.json:6] [E: package.json:7] [E: package.json:8] [E: package.json:9] [E: package.json:10] [E: package.json:11] `packages/*` 下一层是 **13** 个一阶源码目录：`ai`、`agent`、`chord`、`client`、`codemode`、`coding-agent`、`durable`、`evals`、`mcp`、`protocol`、`server`、`telemetry`、`tui`。根 `build` 顺序是 **chord → tui → telemetry → codemode → mcp → ai → durable → agent → protocol → client → server → coding-agent**；`evals` 不在根 `build` 脚本里。[E: package.json:15] [E: packages/evals/package.json:2] [E: packages/evals/package.json:3]
3. 产品 1.0.1 提供 Nix flake 与 pi.dev managed installer。`flake.nix` 描述为 `Pi coding agent`；README 入口是 `nix run github:earendil-works/pi/stable`。[E: flake.nix:2] [E: README.md:59] managed installer 是 `curl -fsSL https://pi.dev/install.sh | sh`，会 pin 全部依赖并用 `pi update` 升级；直接 `npm install -g` **不** pin 传递依赖。changelog 写明已从 published package 去掉 `npm-shrinkwrap.json`，并把全局 npm 安装的 `pi update` 导向该 installer。[E: README.md:28] [E: README.md:37] [E: packages/coding-agent/CHANGELOG.md:26] [E: packages/coding-agent/CHANGELOG.md:47] `main()` 启动时调用 `cleanupManagedInstall()` 清理 managed staging。[E: packages/coding-agent/src/main.ts:589] [E: packages/coding-agent/src/package-manager-cli.ts:150]
4. `@earendil-works/chord` 版本 `1.0.1`，描述为 services / replicated state / RPC / plugins 的 application-composition runtime；`dependencies` 只有 `esbuild`，**不依赖任何其它 Pi workspace 包**。[E: packages/chord/package.json:2] [E: packages/chord/package.json:3] [E: packages/chord/package.json:4] [E: packages/chord/package.json:66] 公开入口导出 `defineFacet` / `defineService` / `replicatedState` / `createFacetHost` 等。[E: packages/chord/src/index.ts:9] [E: packages/chord/src/index.ts:10] [E: packages/chord/src/index.ts:11] [E: packages/chord/src/index.ts:6]
5. `@earendil-works/pi-codemode` 与 `@earendil-works/pi-mcp` 都是 1.0.1 独立包，插在根 `build` 的 `telemetry` 与 `ai` 之间。`pi-codemode` 描述为只能调用注入工具的沙箱 JS；运行依赖只有 `quickjs-wasi`，根入口导出 `CodemodeSandbox`。[E: packages/codemode/package.json:2] [E: packages/codemode/package.json:3] [E: packages/codemode/package.json:4] [E: packages/codemode/package.json:58] [E: packages/codemode/src/index.ts:13] [E: packages/codemode/src/runtime/host.ts:285] `pi-mcp` 描述为不绑官方 MCP SDK 的独立 client；运行依赖只有 `cross-spawn`，根入口导出 `McpClient`。[E: packages/mcp/package.json:2] [E: packages/mcp/package.json:3] [E: packages/mcp/package.json:4] [E: packages/mcp/package.json:54] [E: packages/mcp/src/index.ts:2] [E: packages/mcp/src/client.ts:153]
6. `@earendil-works/pi-durable` 版本 `1.0.1`；根入口导出 `createSession`、`Harness`、`defineTask` / `defineTool`、`MemoryStorage`、`ROOT_CONVERSATION_ID`、`defineDoc` / `defineDocFamily`。运行依赖 chord 与 `pi-ai`。SQLite 在本包 `./storage/sqlite/node`（`openNodeSqliteStorage`），**不是**已删除的 session-backends 包。[E: packages/durable/package.json:2] [E: packages/durable/package.json:3] [E: packages/durable/src/index.ts:1] [E: packages/durable/src/index.ts:24] [E: packages/durable/src/index.ts:38] [E: packages/durable/src/index.ts:98] [E: packages/durable/src/index.ts:99] [E: packages/durable/src/index.ts:100] [E: packages/durable/src/index.ts:181] [E: packages/durable/package.json:57] [E: packages/durable/package.json:103] [E: packages/durable/package.json:104] [E: packages/durable/src/session/session.ts:49] [E: packages/durable/src/harness/harness.ts:409] [E: packages/durable/src/storage/sqlite/node.ts:205] `pi-agent-core` 运行依赖只剩 `pi-ai` 与 `typebox`；`pi-coding-agent` 运行依赖是 chord / `pi-agent-core` / `pi-ai` / **`pi-codemode`** / **`pi-mcp`** / `pi-tui`，**不**依赖 `pi-durable`。CLI 默认会话仍是 `SessionManager` v3 JSONL。[E: packages/agent/package.json:26] [E: packages/agent/package.json:27] [E: packages/coding-agent/package.json:50] [E: packages/coding-agent/package.json:53] [E: packages/coding-agent/package.json:54] [E: packages/coding-agent/src/core/session-manager.ts:41]
7. `pi-agent-core` 1.0 根入口只 `export *` `agent.ts` / `agent-loop.ts` / `proxy.ts` / `types.ts`，并具名导出 `setDefaultStreamFn`。changelog 把 1.0.0 breaking 写成：删掉 `AgentHarness`、sessions/storage、pico3、harness tools 等，可复用 durable session 改用 `pi-durable`。[E: packages/agent/src/index.ts:1] [E: packages/agent/src/index.ts:2] [E: packages/agent/src/index.ts:3] [E: packages/agent/src/index.ts:4] [E: packages/agent/src/index.ts:5] [E: packages/agent/CHANGELOG.md:11] [E: packages/agent/src/proxy.ts:120]
8. `main(args)` 是 `pi-coding-agent` 的 exported CLI entry point：先处理 auth / package / config 子命令，再把 `args[0] === "mcp"` 交给懒加载的 `runMcpCommand`，然后 `parseArgs(args)` 进入 session 与 runtime 装配。[E: packages/coding-agent/src/main.ts:573] [E: packages/coding-agent/src/main.ts:582] [E: packages/coding-agent/src/main.ts:597] [E: packages/coding-agent/src/main.ts:610] [E: packages/coding-agent/src/main.ts:614] [E: packages/coding-agent/src/main.ts:616] [E: packages/coding-agent/src/main.ts:620] [E: packages/coding-agent/src/extensions/mcp/cli.lazy.ts:2]
9. `resolveAppMode()` 决定 app mode：`rpc` 与 `json` 走显式 mode；`--print` 或非 TTY stdin/stdout 进入 print mode；其余进入 interactive mode。[E: packages/coding-agent/src/main.ts:112] [E: packages/coding-agent/src/main.ts:113] [E: packages/coding-agent/src/main.ts:116] [E: packages/coding-agent/src/main.ts:119] [E: packages/coding-agent/src/main.ts:122]
10. `createSessionManager()` 选择产品级 `SessionManager`：`--no-session` / help / list models 走 in-memory；`--fork` / `--session` / `--resume` / `--continue` / `--session-id` 分别 fork、open、select、continue 或 create。[E: packages/coding-agent/src/main.ts:358] [E: packages/coding-agent/src/main.ts:364] [E: packages/coding-agent/src/main.ts:368] [E: packages/coding-agent/src/main.ts:391] [E: packages/coding-agent/src/main.ts:415] [E: packages/coding-agent/src/main.ts:432] [E: packages/coding-agent/src/main.ts:436] [E: packages/coding-agent/src/main.ts:448]
11. `main(args)` 创建 `CreateAgentSessionRuntimeFactory`：在目标 cwd 下调用 `createAgentSessionServices()` 得到 `SettingsManager`、`ModelRuntime`、`ResourceLoader`，再把 model / thinking / scoped models / tool allow-deny / custom tools 交给 `createAgentSessionFromServices()`。[E: packages/coding-agent/src/main.ts:730] [E: packages/coding-agent/src/main.ts:749] [E: packages/coding-agent/src/main.ts:838]
12. `createAgentSessionRuntime()` 用该 factory 构造 `AgentSessionRuntime`；`switchSession()` / `newSession()` / `fork()` / `importFromJsonl()` 都通过保存的 `createRuntime` 重建并替换当前 runtime。[E: packages/coding-agent/src/core/agent-session-runtime.ts:74] [E: packages/coding-agent/src/core/agent-session-runtime.ts:196] [E: packages/coding-agent/src/core/agent-session-runtime.ts:226] [E: packages/coding-agent/src/core/agent-session-runtime.ts:262] [E: packages/coding-agent/src/core/agent-session-runtime.ts:359] [E: packages/coding-agent/src/core/agent-session-runtime.ts:420]
13. `createAgentSession()` 创建 core `Agent`，注入 coding-agent 的 `convertToLlm` wrapper、provider `streamFn`（内部 `ModelRuntime.streamSimple()`）、extension hooks、queue mode、transport、thinking budgets，以及 `CacheWarmer`，然后创建 `AgentSession` facade。[E: packages/coding-agent/src/core/sdk.ts:175] [E: packages/coding-agent/src/core/sdk.ts:311] [E: packages/coding-agent/src/core/sdk.ts:387] [E: packages/coding-agent/src/core/sdk.ts:406] [E: packages/coding-agent/src/core/sdk.ts:437]
14. `Agent.prompt()` / `Agent.continue()` 是 stateful wrapper 到 loop 的调用点：`prompt()` 规范化输入后走 `runPromptMessages()` → `runAgentLoop()`；`continue()` 在 last message 不是 assistant 时走 `runContinuation()` → `runAgentLoopContinue()`，若 last 是 assistant 且 steering / follow-up 队列非空则改走 `runPromptMessages()`。两条 loop 入口都传入 context snapshot、loop config、event processor 和 `streamFunction`。[E: packages/agent/src/agent.ts:373] [E: packages/agent/src/agent.ts:384] [E: packages/agent/src/agent.ts:397] [E: packages/agent/src/agent.ts:403] [E: packages/agent/src/agent.ts:437] [E: packages/agent/src/agent.ts:450]
15. `runAgentLoop()` 将 prompt 追加到 context，emit `agent_start` / `turn_start` / message start-end，然后进入 `runLoop()`；`runLoop()` 负责 assistant streaming、tool call detection、tool execution、`finishTurn`、`turn_end`、steering / follow-up polling。[E: packages/agent/src/agent-loop.ts:102] [E: packages/agent/src/agent-loop.ts:117] [E: packages/agent/src/agent-loop.ts:124] [E: packages/agent/src/agent-loop.ts:242] [E: packages/agent/src/agent-loop.ts:259] [E: packages/agent/src/agent-loop.ts:286]
16. `runAgentLoop()` 把 `streamFn ?? getDefaultStreamFn()` 交给 `runLoop()`；`getDefaultStreamFn()` 在未安装时抛错，`pi-agent-core` 本身不绑定 provider。`pi-coding-agent` 在 SDK 模块顶层调用 `setDefaultStreamFn(streamSimple)`；产品装配的 `streamFn` 则直接调 `ModelRuntime.streamSimple()`。[E: packages/agent/src/agent-loop.ts:124] [E: packages/agent/src/stream-fn.ts:11] [E: packages/agent/src/stream-fn.ts:15] [E: packages/coding-agent/src/core/sdk.ts:39] [E: packages/coding-agent/src/core/sdk.ts:406]
17. `streamAssistantResponse()` 先跑 `transformContext`，再 `convertToLlm` 把 `AgentMessage[]` 转成 LLM `Message[]`，`normalizeContext()` 折成 `TranscriptContext`，然后调用已经解析好的 `streamFunction`。[E: packages/agent/src/agent-loop.ts:389] [E: packages/agent/src/agent-loop.ts:395] [E: packages/agent/src/agent-loop.ts:397] [E: packages/ai/src/utils/transcript.ts:30] [E: packages/agent/src/types.ts:33]
18. tool execution 在 `pi-agent-core` loop 内按 generic contract 执行：从 assistant content 筛出 `toolCall`；若 `toolExecution === "sequential"` 或任一工具 `executionMode === "sequential"` 则串行，否则并行。[E: packages/agent/src/agent-loop.ts:508] [E: packages/agent/src/agent-loop.ts:515] [E: packages/agent/src/agent-loop.ts:519]
19. `main(args)` 最后按 app mode 派发：RPC mode 调 `runRpcMode(runtime)`，`appMode === "interactive"` 时创建 `InteractiveMode(runtime)` 并 `run()`，print / json mode 调 `runPrintMode(runtime, ...)`。[E: packages/coding-agent/src/main.ts:947] [E: packages/coding-agent/src/main.ts:949] [E: packages/coding-agent/src/main.ts:950] [E: packages/coding-agent/src/main.ts:982] [E: packages/coding-agent/src/main.ts:985]

## 包边界

`@earendil-works/chord` 是独立 application-composition runtime：facets / services / replicated state / remote service boundary。它不依赖 `pi-ai` / `pi-agent-core` / `pi-coding-agent`。[E: packages/chord/package.json:4] [E: packages/chord/package.json:66] `pi-client` 与 `pi-server` 依赖 chord；`pi-coding-agent` 也把 chord 列为 runtime dependency，但 CLI 默认路径仍是本地 `AgentSession`，不是 remote session 产品。`pi-agent-core` 1.0 **不再**依赖 chord。[E: packages/client/package.json:50] [E: packages/server/package.json:50] [E: packages/coding-agent/package.json:50] [E: packages/agent/package.json:26]

`@earendil-works/pi-codemode` 提供 QuickJS WASM sandbox（`CodemodeSandbox.execute()`）。`@earendil-works/pi-mcp` 提供独立 `McpClient` 与 stdio / Streamable HTTP / in-memory transport。两个包都没有 Pi workspace 运行依赖。[E: packages/codemode/src/runtime/host.ts:285] [E: packages/codemode/package.json:58] [E: packages/mcp/src/client.ts:153] [E: packages/mcp/package.json:54] coding-agent 把它们装配成内置 replaceable 扩展：`builtInExtensions` 含不可替换 `llama.cpp`，以及 replaceable `codemode`、`tool-search`、`mcp`。[E: packages/coding-agent/src/extensions/index.ts:7] [E: packages/coding-agent/src/extensions/index.ts:11] [E: packages/coding-agent/src/extensions/index.ts:12] [E: packages/coding-agent/src/extensions/index.ts:13] CLI 另有 `pi mcp` 子命令，懒加载 `extensions/mcp/cli.ts`。[E: packages/coding-agent/src/main.ts:614] [E: packages/coding-agent/src/extensions/mcp/cli.lazy.ts:2] 这是产品面，不是默认 `pi` CLI 的另一条 experimental durable TUI。

`@earendil-works/pi-durable` 提供 `createSession(storage)` Session kernel、`Harness.open()` 可复用 harness、document tokens，以及 Memory / JSONL / SQLite `Storage`。根导出 runtime-neutral；Node 文件后端走 `storage/jsonl/node` 与 `storage/sqlite/node`。`./tools` 导出 `createBashTool` / `createReadTool` / `createEditTool` / `createWriteTool` 与 `CodingTools` 扩展；`CodingTools` 是 `defineExtension`，调用方自行安装。它 **不是** coding-agent 会话 JSONL。[E: packages/durable/package.json:4] [E: packages/durable/src/index.ts:98] [E: packages/durable/src/harness/harness.ts:405] [E: packages/durable/src/harness/harness.ts:409] [E: packages/durable/src/tools/index.ts:19] 深挖见 [subsys.durable.runtime](../subsystems/durable/runtime.md) 与 [subsys.durable.storage](../subsystems/durable/storage.md)。

`pi-agent-core` 是可复用 **Agent loop**，不是 session/harness 包：`Agent` 持有 transcript、lifecycle listener、steering / follow-up queue、`streamFunction` 和 tool hooks；底层 `runAgentLoop` / `runAgentLoopContinue` 消费 context、loop config、event sink 和 `StreamFn`；`streamProxy()` 是把 LLM 调用转到服务端的 proxy stream。[E: packages/agent/src/agent.ts:188] [E: packages/agent/src/agent.ts:196] [E: packages/agent/src/agent-loop.ts:102] [E: packages/agent/src/agent-loop.ts:128] [E: packages/agent/src/proxy.ts:120] [E: packages/agent/src/index.ts:1]

`pi-coding-agent` 是产品装配层：`main()` 管 argv parsing、settings、session selection、project trust、runtime creation、mode dispatch；`createAgentSessionFromServices()` 把 cwd-bound services 转给 `createAgentSession()`，后者把 `Agent`、`SessionManager`、`SettingsManager`、`ResourceLoader`、`ModelRuntime` 包成 `AgentSession`。[E: packages/coding-agent/src/main.ts:573] [E: packages/coding-agent/src/core/agent-session-services.ts:214] [E: packages/coding-agent/src/core/sdk.ts:437] 产品会话文件由 `SessionManager`（`CURRENT_SESSION_VERSION = 3`）管理，与 pi-durable `Session` / `Harness` 不是同一套 API。[E: packages/coding-agent/src/core/session-manager.ts:41] [E: packages/coding-agent/src/core/session-manager.ts:987] `spine.session-state-model` 展开产品 JSONL 与 durable session 的对照。[I]

`pi-ai` 是 provider / runtime LLM API 层：`Provider` 拥有 id / name / auth / model listing / stream；`Models` 是 provider collection，负责 auth application 并把 stream request 委派给拥有该 model 的 provider；built-in 集合由 `builtinProviders()` / `builtinModels()` 构造。[E: packages/ai/src/models.ts:144] [E: packages/ai/src/models.ts:244] [E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:184] `pi-ai` 运行依赖 `@earendil-works/pi-telemetry`。[E: packages/ai/package.json:72]

`pi-tui` 是 differential rendering 的 terminal UI library。[E: packages/tui/package.json:4] 本 overview 的主路径里，interactive mode 只创建 `InteractiveMode(runtime)` 并 `run()`；TUI 组件细节不在本节点展开。[E: packages/coding-agent/src/main.ts:951] [E: packages/coding-agent/src/main.ts:982]

`@earendil-works/pi-telemetry` 提供 vendor-neutral telemetry contracts。[E: packages/telemetry/package.json:2] [E: packages/telemetry/package.json:4] `pi-evals` 是 `private: true` 的评测消费者，脚本是 `eval:host` + `eval:docs`。[E: packages/evals/package.json:2] [E: packages/evals/package.json:3] [E: packages/evals/package.json:8]

`pi-protocol` / `pi-client` / `pi-server` 组成 transport-neutral remote-session 栈。`pi-client` 现行公开面是 Chord 风格的 `Client` + `createClientServiceTransport`。[E: packages/client/src/index.ts:1] [E: packages/client/src/client.ts:62] [E: packages/client/src/client.ts:448] `pi-coding-agent` 的 `./client` 只 `export * from "@earendil-works/pi-client"`，且 `exports` 只声明 `source`；`files` 排除 `dist/client`、`dist/experimental`、`dist/cli/experimental`，因此这是 **source-only** 面，不是 shipped npm `RemoteSession`。[E: packages/coding-agent/src/client/index.ts:1] [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/package.json:31] [E: packages/coding-agent/package.json:32] [E: packages/coding-agent/package.json:33] `pi-server` 只导出 composable server（`.` / `./testing` / `./unix`），没有 `server` binary；实现类是 `Server`。[E: packages/server/package.json:8] [E: packages/server/src/index.ts:1] [E: packages/server/src/server.ts:46] 这条 remote 栈不等于 `pi-coding-agent` 本地 RPC mode（`runRpcMode` 读 JSONL stdin 的 `RpcCommand`）。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20]

## 关键决策点

`CreateAgentSessionRuntimeFactory` 把 process-global inputs 与 cwd-bound services 分开：factory 接受 cwd、agentDir、sessionManager、sessionStartEvent、projectTrustContext；`createAgentSessionServices()` 在 effective cwd 下创建 `ModelRuntime`、`SettingsManager`、`DefaultResourceLoader`，reload resources，并把 extension provider registrations 写入 runtime。[E: packages/coding-agent/src/main.ts:730] [E: packages/coding-agent/src/core/agent-session-services.ts:135] [E: packages/coding-agent/src/core/agent-session-services.ts:158]

`AgentSession._buildRuntime()` 是产品工具和 extension runtime 的重装点：默认用 `createAllToolDefinitions()` 创建内置工具，再构造 `ExtensionRunner`；默认 active built-in tools 是 `read`、`bash`、`edit`、`write`。完整 built-in name set 在 tools index 中是 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`。[E: packages/coding-agent/src/core/agent-session.ts:3558] [E: packages/coding-agent/src/core/agent-session.ts:3573] [E: packages/coding-agent/src/core/agent-session.ts:3589] [E: packages/coding-agent/src/core/agent-session.ts:3604] [E: packages/coding-agent/src/core/tools/index.ts:95] [E: packages/coding-agent/src/core/tools/index.ts:96] [E: packages/coding-agent/src/core/tools/index.ts:182]

`read` / `bash` / `powershell` / `edit` / `write` 默认带 `constrainedSampling: { type: "json_schema", strict: "prefer" }`，**不再**要求 `PI_EXPERIMENTAL`。测试锁在 `builtin-tool-strict-mode.test.ts`，且 `grep` / `find` / `ls` 没有该字段。[E: packages/coding-agent/src/core/tools/bash.ts:260] [E: packages/coding-agent/src/core/tools/read.ts:80] [E: packages/coding-agent/test/builtin-tool-strict-mode.test.ts:13] [E: packages/coding-agent/test/builtin-tool-strict-mode.test.ts:19] [E: packages/coding-agent/test/builtin-tool-strict-mode.test.ts:23] [E: packages/coding-agent/test/builtin-tool-strict-mode.test.ts:27]

`ModelRuntime` 是 `pi-coding-agent` 对 `pi-ai` 的产品侧运行时：实现 `Models`，加载 built-ins 与 `models.json`，合成 extension provider，提供 lookup / availability / auth，并在 dispatch 前完成 auth / baseUrl / header / env 准备。[E: packages/coding-agent/src/core/model-runtime.ts:171] [E: packages/coding-agent/src/core/model-runtime.ts:691] [E: packages/coding-agent/src/core/model-runtime.ts:715] `ModelRegistry` 只是传给 extension 的同步 compatibility facade。[E: packages/coding-agent/src/core/model-registry.ts:48]

`StreamFn` 的类型边界在 `pi-agent-core`：参数是 `TranscriptContext`，返回值是 `AssistantMessageEventStream`。类型注释要求失败走 stream 内 `stopReason "error" | "aborted"`，不能靠抛异常表达 provider 失败。[E: packages/agent/src/types.ts:33] [E: packages/agent/src/types.ts:35] [I] coding-agent 注入的 wrapper 调用 `ModelRuntime.streamSimple()`。[E: packages/coding-agent/src/core/sdk.ts:406]

根工具链使用 TypeScript **7.0.2**（`tsc --noEmit` 在 `check` 里）；公开包 `engines.node` 仍是 `>=22.19.0`。[E: package.json:20] [E: package.json:63] [E: package.json:66]

## Ground Truth 索引

内置工具集的 ground truth 是 `packages/coding-agent/src/core/tools/index.ts`：`ToolName` / `allToolNames` 列出 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`（仍是 8 个），`createAllToolDefinitions()` 返回同一组 definitions。[E: packages/coding-agent/src/core/tools/index.ts:95] [E: packages/coding-agent/src/core/tools/index.ts:96] [E: packages/coding-agent/src/core/tools/index.ts:182] `createCodingToolDefinitions()` 仍只返回 `read`/`bash`/`edit`/`write`；`createReadOnlyToolDefinitions()` 仍只返回 `read`/`grep`/`find`/`ls`；两个 preset **都不含** `powershell`。[E: packages/coding-agent/src/core/tools/index.ts:164] [E: packages/coding-agent/src/core/tools/index.ts:173]

provider 集的 ground truth 是 `packages/ai/src/providers/all.ts`：`builtinProviders()` freshly constructs provider factories，`builtinModels()` 创建 `Models` collection 并逐个 `setProvider()`。[E: packages/ai/src/providers/all.ts:136] [E: packages/ai/src/providers/all.ts:184] [E: packages/ai/src/providers/all.ts:187]

slash command 的 built-in ground truth 是 `BUILTIN_SLASH_COMMANDS`（含 `/bug`，共 24 个）；`/mcp` **不在**该数组里，由 mcp 扩展 `registerCommand`。RPC command union 在 `rpc-types.ts`，RPC mode 在 `switch (command.type)` 内 dispatch。[E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/core/slash-commands.ts:28] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:389]

durable 的 ground truth 是 `packages/durable/src/index.ts`（`createSession` / `Harness` / `MemoryStorage` / `ROOT_CONVERSATION_ID`）、`packages/durable/src/harness/harness.ts`（`Harness.open`）、`packages/durable/src/tools/index.ts`（opt-in coding tools）与 `packages/durable/src/storage/sqlite/node.ts`（Node SQLite）。[E: packages/durable/src/index.ts:98] [E: packages/durable/src/index.ts:38] [E: packages/durable/src/index.ts:181] [E: packages/durable/src/harness/harness.ts:409] [E: packages/durable/src/tools/index.ts:19] [E: packages/durable/src/storage/sqlite/node.ts:205]

MCP / codemode 的包级 ground truth 是 `packages/mcp/src/index.ts` 与 `packages/codemode/src/index.ts`；产品装配 ground truth 是 `packages/coding-agent/src/extensions/index.ts`。[E: packages/mcp/src/index.ts:2] [E: packages/codemode/src/index.ts:13] [E: packages/coding-agent/src/extensions/index.ts:7]

## 指向 T1/T2 深挖

`spine.layered-architecture` 应从 package-level 解释 `chord`、`pi-codemode`、`pi-mcp`、`pi-durable`、`pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui`、remote 栈与 `pi-telemetry` 的依赖方向；可复用 harness 写在 `pi-durable`，不要再写已删除的 agent-core experimental harness。[I]

`spine.process-lifecycle` 应从 `main(args)` 展开 argv parsing、`pi mcp` 子命令、session selection、project trust、runtime creation、mode dispatch。[I]

`spine.agent-loop` 应从 `Agent.prompt()` / `runAgentLoop()` 展开 one turn 内 assistant streaming、tool calls、`finishTurn`、steering、follow-up、termination。[I]

`spine.provider-stream` 应从 `ModelRuntime`、`streamFn`、`TranscriptContext`、`pi-ai` provider dispatch、wire API 展开 request / response normalization。[I]

`spine.session-state-model` 应对比 coding-agent `SessionManager` v3 JSONL 与 pi-durable `Session` / `Harness`；不要再写已删除的 agent-core v4 `Session`。[I]

`spine.extension-lifecycle` 应覆盖内置 replaceable `mcp` / `codemode` / `tool-search` 与不可替换 `llama.cpp` 的加载。[I]

`ref.package-index` 应列出 13 个 monorepo 包、build / test / publish 与 package metadata，并去掉 sqlite-node / session-backends。[I]

`subsys.durable.runtime` / `subsys.durable.storage` 展开 `createSession`、document tokens 与 Memory/JSONL/SQLite backends。[I]

`subsys.chord.runtime` / `subsys.chord.delta` 展开 Chord facets / services 与 delta tracking。[I]

## Sources

- README.md
- package.json
- flake.nix
- packages/chord/package.json
- packages/chord/src/index.ts
- packages/codemode/package.json
- packages/codemode/src/index.ts
- packages/codemode/src/runtime/host.ts
- packages/mcp/package.json
- packages/mcp/src/index.ts
- packages/mcp/src/client.ts
- packages/durable/package.json
- packages/durable/src/index.ts
- packages/durable/src/harness/harness.ts
- packages/durable/src/session/session.ts
- packages/durable/src/tools/index.ts
- packages/durable/src/storage/sqlite/node.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/core/agent-session-runtime.ts
- packages/coding-agent/src/core/agent-session-services.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/model-runtime.ts
- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/extensions/mcp/cli.lazy.ts
- packages/coding-agent/src/package-manager-cli.ts
- packages/coding-agent/src/modes/rpc/rpc-types.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/coding-agent/src/client/index.ts
- packages/coding-agent/package.json
- packages/coding-agent/CHANGELOG.md
- packages/coding-agent/test/builtin-tool-strict-mode.test.ts
- packages/agent/src/index.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/stream-fn.ts
- packages/agent/src/types.ts
- packages/agent/src/proxy.ts
- packages/agent/package.json
- packages/agent/CHANGELOG.md
- packages/ai/src/models.ts
- packages/ai/src/providers/all.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/package.json
- packages/client/src/index.ts
- packages/client/src/client.ts
- packages/client/package.json
- packages/telemetry/package.json
- packages/evals/package.json
- packages/tui/package.json
- packages/protocol/package.json
- packages/server/package.json
- packages/server/src/index.ts
- packages/server/src/server.ts

## 相关

- [spine.layered-architecture](layered-architecture.md) - 分层架构与包边界。
- [spine.process-lifecycle](process-lifecycle.md) - 进程生命周期（argv → mode → session）。
- [spine.agent-loop](agent-loop.md) - agent 回合循环（一次 turn）。
- [spine.provider-stream](provider-stream.md) - provider 流式调用（统一 → wire → 归一）。
- [spine.session-state-model](session-state-model.md) - 产品 SessionManager 与 durable Session。
- [spine.extension-lifecycle](extension-lifecycle.md) - 扩展加载；内置 mcp / codemode 由此装配。
- [subsys.durable.runtime](../subsystems/durable/runtime.md) - `createSession` / document tokens / Chord `Context`。
- [subsys.durable.storage](../subsystems/durable/storage.md) - Memory / JSONL / SQLite backends。
- [ref.package-index](../reference/package-index.md) - monorepo 包索引与工具链。
