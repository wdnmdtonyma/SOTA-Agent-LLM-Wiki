---
id: spine.overview
title: pi 源码总览
kind: flow
tier: T0
pkg: cross
source:
  - README.md
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/core/agent-session-runtime.ts
  - packages/coding-agent/src/core/agent-session-services.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/src/modes/rpc/rpc-types.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/types.ts
  - packages/ai/src/models.ts
  - packages/ai/src/providers/all.ts
symbols:
  - main
  - Agent
  - runAgentLoop
  - AgentSession
  - ModelRegistry
  - Models
related:
  - spine.layered-architecture
  - spine.process-lifecycle
  - spine.agent-loop
  - spine.provider-stream
  - ref.package-index
evidence: explicit
status: verified
updated: 8c943640
---

> `spine.overview` 描述 Pi monorepo 从 CLI 产品入口到 reusable agent harness、再到 multi-provider LLM streaming 的端到端主路径。

## 能回答的问题

- Pi monorepo 的 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 分别承担什么职责？
- `main()` 怎样把 argv、settings、session、trust 和 mode 组装成一次可运行的 coding agent session？
- `pi-agent-core` 的 `Agent` / `runAgentLoop` 与 `pi-coding-agent` 的 `AgentSession` 边界在哪里？
- 模型与 provider streaming 在 `pi-ai`、`ModelRegistry` 和 `Agent` stream function 之间怎样交接？
- 内置工具、slash commands、RPC protocol 这些产品能力的 ground truth 文件在哪里？

## 总览图

```mermaid
flowchart TD
  CLI["pi-coding-agent main(args)"] --> Parse["parseArgs + resolveAppMode"]
  Parse --> RuntimeFactory["CreateAgentSessionRuntimeFactory"]
  RuntimeFactory --> Services["createAgentSessionServices(cwd, agentDir)"]
  Services --> Registry["ModelRegistry + ResourceLoader + SettingsManager"]
  RuntimeFactory --> SDK["createAgentSession"]
  SDK --> Session["AgentSession (product session facade)"]
  SDK --> CoreAgent["pi-agent-core Agent"]
  Session --> ToolDefs["Built-in + extension tool definitions"]
  CoreAgent --> Loop["runAgentLoop / runAgentLoopContinue"]
  Loop --> LLM["streamAssistantResponse"]
  LLM --> StreamFn["coding-agent streamFn"]
  StreamFn --> PiAI["pi-ai streamSimple / Models / Provider"]
  PiAI --> Wire["provider wire API"]
  Loop --> ToolExec["validate + execute tool calls"]
  ToolExec --> Session
  CLI --> Modes["interactive / rpc / print mode"]
  Modes --> Session
```

## 端到端主路径

1. `README.md` 把 Pi 定义为 Pi agent harness 项目，并在 package 表中列出 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 的职责。[E: README.md:13] [E: README.md:15] [E: README.md:30] [E: README.md:31] [E: README.md:32] [E: README.md:33]
2. `main(args)` 是 `pi-coding-agent` 的 exported CLI entry point；它解析 argv，并把解析结果继续用于 mode、session、runtime 和 session option 装配。[E: packages/coding-agent/src/main.ts:468] [E: packages/coding-agent/src/main.ts:503] [E: packages/coding-agent/src/main.ts:534] [E: packages/coding-agent/src/main.ts:572] [E: packages/coding-agent/src/main.ts:610] [E: packages/coding-agent/src/main.ts:712]
3. `main(args)` 先解析 app mode：`rpc` 和 `json` 显式选择对应 mode，`--print` 或非 TTY stdin/stdout 进入 print mode，其余情况进入 interactive mode。[E: packages/coding-agent/src/main.ts:100] [E: packages/coding-agent/src/main.ts:101] [E: packages/coding-agent/src/main.ts:104] [E: packages/coding-agent/src/main.ts:107] [E: packages/coding-agent/src/main.ts:110]
4. session 选择由 `createSessionManager()` 处理：`--no-session`、help、list models 走 in-memory session；`--fork`、`--session`、`--resume`、`--continue`、`--session-id` 分别走 fork/open/select/continue/create 的分支。[E: packages/coding-agent/src/main.ts:264] [E: packages/coding-agent/src/main.ts:270] [E: packages/coding-agent/src/main.ts:274] [E: packages/coding-agent/src/main.ts:297] [E: packages/coding-agent/src/main.ts:321] [E: packages/coding-agent/src/main.ts:338] [E: packages/coding-agent/src/main.ts:342] [E: packages/coding-agent/src/main.ts:349]
5. `main(args)` 创建 `CreateAgentSessionRuntimeFactory`，该 factory 在目标 cwd 下创建 `SettingsManager`、`ModelRegistry`、`ResourceLoader` 等 cwd-bound services，再把 model、thinking、scoped models、tool allow/deny list 和 custom tools 传给 `createAgentSessionFromServices()`。[E: packages/coding-agent/src/main.ts:610] [E: packages/coding-agent/src/main.ts:628] [E: packages/coding-agent/src/main.ts:629] [E: packages/coding-agent/src/main.ts:674] [E: packages/coding-agent/src/main.ts:685] [E: packages/coding-agent/src/main.ts:712] [E: packages/coding-agent/src/main.ts:716] [E: packages/coding-agent/src/main.ts:717] [E: packages/coding-agent/src/main.ts:718] [E: packages/coding-agent/src/main.ts:719] [E: packages/coding-agent/src/main.ts:720] [E: packages/coding-agent/src/main.ts:721] [E: packages/coding-agent/src/main.ts:722]
6. `createAgentSessionRuntime()` 创建 `AgentSessionRuntime`，该 runtime 保存当前 `AgentSession` 与 cwd-bound services；`switchSession()`、`newSession()`、`fork()`、`importFromJsonl()` 都通过保存的 `createRuntime` 重建并替换当前 runtime。[E: packages/coding-agent/src/core/agent-session-runtime.ts:74] [E: packages/coding-agent/src/core/agent-session-runtime.ts:97] [E: packages/coding-agent/src/core/agent-session-runtime.ts:101] [E: packages/coding-agent/src/core/agent-session-runtime.ts:193] [E: packages/coding-agent/src/core/agent-session-runtime.ts:223] [E: packages/coding-agent/src/core/agent-session-runtime.ts:259] [E: packages/coding-agent/src/core/agent-session-runtime.ts:353] [E: packages/coding-agent/src/core/agent-session-runtime.ts:406] [E: packages/coding-agent/src/core/agent-session-runtime.ts:416] [E: packages/coding-agent/src/core/agent-session-runtime.ts:417]
7. `createAgentSession()` 创建 core `Agent`，注入 coding-agent 的 `convertToLlm` wrapper、provider `streamFn`、extension hooks、queue mode、transport、thinking budgets，然后创建 `AgentSession` facade。[E: packages/coding-agent/src/core/sdk.ts:166] [E: packages/coding-agent/src/core/sdk.ts:293] [E: packages/coding-agent/src/core/sdk.ts:300] [E: packages/coding-agent/src/core/sdk.ts:301] [E: packages/coding-agent/src/core/sdk.ts:332] [E: packages/coding-agent/src/core/sdk.ts:339] [E: packages/coding-agent/src/core/sdk.ts:351] [E: packages/coding-agent/src/core/sdk.ts:356] [E: packages/coding-agent/src/core/sdk.ts:358] [E: packages/coding-agent/src/core/sdk.ts:359] [E: packages/coding-agent/src/core/sdk.ts:377]
8. `Agent.prompt()` / `Agent.continue()` 是 stateful wrapper 到 loop 的调用点：`prompt()` 规范化输入后进入 `runAgentLoop()`，`continue()` 进入 `runAgentLoopContinue()`，两者都传入 context snapshot、loop config、event processor 和 `streamFn`。[E: packages/agent/src/agent.ts:335] [E: packages/agent/src/agent.ts:348] [E: packages/agent/src/agent.ts:400] [E: packages/agent/src/agent.ts:401] [E: packages/agent/src/agent.ts:407] [E: packages/agent/src/agent.ts:413] [E: packages/agent/src/agent.ts:414] [E: packages/agent/src/agent.ts:419]
9. `runAgentLoop()` 将 prompt 追加到 context，emit `agent_start`、`turn_start`、message start/end，然后进入 `runLoop()`；`runLoop()` 负责 assistant streaming、tool call detection、tool execution、turn end、prepare-next-turn、stop condition、steering/follow-up polling。[E: packages/agent/src/agent-loop.ts:95] [E: packages/agent/src/agent-loop.ts:103] [E: packages/agent/src/agent-loop.ts:106] [E: packages/agent/src/agent-loop.ts:109] [E: packages/agent/src/agent-loop.ts:110] [E: packages/agent/src/agent-loop.ts:112] [E: packages/agent/src/agent-loop.ts:113] [E: packages/agent/src/agent-loop.ts:116] [E: packages/agent/src/agent-loop.ts:155] [E: packages/agent/src/agent-loop.ts:193] [E: packages/agent/src/agent-loop.ts:203] [E: packages/agent/src/agent-loop.ts:208] [E: packages/agent/src/agent-loop.ts:218] [E: packages/agent/src/agent-loop.ts:226] [E: packages/agent/src/agent-loop.ts:241] [E: packages/agent/src/agent-loop.ts:253] [E: packages/agent/src/agent-loop.ts:257]
10. `streamAssistantResponse()` 是 AgentMessage 到 LLM Message 的边界：它先应用 `transformContext`，再调用 `convertToLlm`，构造 `Context`，然后用 `streamFn || streamSimple` 发起 provider stream。[E: packages/agent/src/agent-loop.ts:275] [E: packages/agent/src/agent-loop.ts:284] [E: packages/agent/src/agent-loop.ts:285] [E: packages/agent/src/agent-loop.ts:289] [E: packages/agent/src/agent-loop.ts:292] [E: packages/agent/src/agent-loop.ts:298] [E: packages/agent/src/agent-loop.ts:304]
11. tool execution 仍在 `pi-agent-core` loop 内按 generic contract 执行：loop 从 assistant message content 中筛出 `toolCall`，若配置或工具要求 sequential 就串行，否则并行执行；执行前做 tool lookup、argument preparation、schema validation 和 `beforeToolCall` hook，执行后应用 `afterToolCall` hook 并生成 `toolResult` message。[E: packages/agent/src/agent-loop.ts:373] [E: packages/agent/src/agent-loop.ts:380] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:385] [E: packages/agent/src/agent-loop.ts:387] [E: packages/agent/src/agent-loop.ts:451] [E: packages/agent/src/agent-loop.ts:562] [E: packages/agent/src/agent-loop.ts:569] [E: packages/agent/src/agent-loop.ts:579] [E: packages/agent/src/agent-loop.ts:580] [E: packages/agent/src/agent-loop.ts:581] [E: packages/agent/src/agent-loop.ts:637] [E: packages/agent/src/agent-loop.ts:682] [E: packages/agent/src/agent-loop.ts:733]
12. `main(args)` 最后按 app mode 派发：RPC mode 调 `runRpcMode(runtime)`，interactive mode 创建 `InteractiveMode(runtime)` 并 `run()`，print/json mode 调 `runPrintMode(runtime, ...)`。[E: packages/coding-agent/src/main.ts:806] [E: packages/coding-agent/src/main.ts:808] [E: packages/coding-agent/src/main.ts:809] [E: packages/coding-agent/src/main.ts:810] [E: packages/coding-agent/src/main.ts:838] [E: packages/coding-agent/src/main.ts:841]

## 包边界

`pi-agent-core` 是可复用 runtime harness：`Agent` 是 stateful wrapper，拥有 transcript、lifecycle listener、steering/follow-up queue、stream function 和 tool hooks；底层 `runAgentLoop` / `runAgentLoopContinue` 消费 context、loop config、event sink 和 optional `StreamFn`。[E: packages/agent/src/agent.ts:171] [E: packages/agent/src/agent.ts:173] [E: packages/agent/src/agent.ts:174] [E: packages/agent/src/agent.ts:175] [E: packages/agent/src/agent.ts:177] [E: packages/agent/src/agent.ts:179] [E: packages/agent/src/agent.ts:183] [E: packages/agent/src/agent.ts:187] [E: packages/agent/src/agent-loop.ts:95] [E: packages/agent/src/agent-loop.ts:120]

`pi-coding-agent` 是产品装配层：`main()` 管 argv parsing、settings、session selection、project trust、runtime creation、mode dispatch；`createAgentSessionFromServices()` 把 cwd-bound services 和 session options 转给 `createAgentSession()`，后者把 `Agent`、`SessionManager`、`SettingsManager`、`ResourceLoader`、`ModelRegistry`、tool/filter 选项包成 `AgentSession`。[E: packages/coding-agent/src/main.ts:468] [E: packages/coding-agent/src/main.ts:503] [E: packages/coding-agent/src/main.ts:552] [E: packages/coding-agent/src/main.ts:572] [E: packages/coding-agent/src/main.ts:596] [E: packages/coding-agent/src/main.ts:736] [E: packages/coding-agent/src/main.ts:806] [E: packages/coding-agent/src/core/agent-session-services.ts:187] [E: packages/coding-agent/src/core/agent-session-services.ts:190] [E: packages/coding-agent/src/core/sdk.ts:377] `spine.layered-architecture` 应继续细化这个 `pi-agent-core` reusable harness 与 `pi-coding-agent` product assembly 的边界。[I]

`pi-ai` 是 provider/runtime LLM API 层：`Provider` 拥有 provider id/name/base metadata、auth、model listing 和 stream behavior；`Models` 是 provider collection，负责 auth application 和把 stream request 委派给拥有该 model 的 provider；built-in provider 集合由 `builtinProviders()` / `builtinModels()` 构造。[E: packages/ai/src/models.ts:32] [E: packages/ai/src/models.ts:33] [E: packages/ai/src/models.ts:34] [E: packages/ai/src/models.ts:36] [E: packages/ai/src/models.ts:46] [E: packages/ai/src/models.ts:54] [E: packages/ai/src/models.ts:65] [E: packages/ai/src/models.ts:71] [E: packages/ai/src/models.ts:79] [E: packages/ai/src/models.ts:216] [E: packages/ai/src/models.ts:258] [E: packages/ai/src/models.ts:278] [E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:113]

`pi-tui` 是 terminal UI library，README 把它描述为 differential rendering 的 terminal UI package。[E: README.md:33] 在本 overview 覆盖的主路径中，interactive mode 创建 `InteractiveMode(runtime)` 并 `run()`；具体 TUI 渲染组件不在本节点展开。[E: packages/coding-agent/src/main.ts:810] [E: packages/coding-agent/src/main.ts:838] `spine.process-lifecycle` 和 TUI surface/subsystem 节点应覆盖交互模式渲染细节。[I]

## 关键决策点

`CreateAgentSessionRuntimeFactory` 把 process-global inputs 与 cwd-bound services 分开：`main()` 创建的 factory 接受 cwd、agentDir、sessionManager、sessionStartEvent、projectTrustContext；`createAgentSessionServices()` 在 effective cwd 下创建/接收 `AuthStorage`、`SettingsManager`、`ModelRegistry`、`DefaultResourceLoader`，reload resources，并把 extension provider registrations 写入 `ModelRegistry`。[E: packages/coding-agent/src/main.ts:610] [E: packages/coding-agent/src/main.ts:611] [E: packages/coding-agent/src/main.ts:612] [E: packages/coding-agent/src/main.ts:613] [E: packages/coding-agent/src/main.ts:614] [E: packages/coding-agent/src/main.ts:615] [E: packages/coding-agent/src/main.ts:628] [E: packages/coding-agent/src/main.ts:629] [E: packages/coding-agent/src/core/agent-session-services.ts:137] [E: packages/coding-agent/src/core/agent-session-services.ts:140] [E: packages/coding-agent/src/core/agent-session-services.ts:144] [E: packages/coding-agent/src/core/agent-session-services.ts:145] [E: packages/coding-agent/src/core/agent-session-services.ts:151] [E: packages/coding-agent/src/core/agent-session-services.ts:155] [E: packages/coding-agent/src/core/agent-session-services.ts:157]

`AgentSession._buildRuntime()` 是产品工具和 extension runtime 的重装点：它创建 built-in tool definitions、构造 `ExtensionRunner`、绑定 extension core/UI，并把默认 active built-in tools 设为 `read`、`bash`、`edit`、`write`；完整 built-in tool name set 在 tools index 中是 `read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`。[E: packages/coding-agent/src/core/agent-session.ts:2426] [E: packages/coding-agent/src/core/agent-session.ts:2441] [E: packages/coding-agent/src/core/agent-session.ts:2457] [E: packages/coding-agent/src/core/agent-session.ts:2467] [E: packages/coding-agent/src/core/agent-session.ts:2468] [E: packages/coding-agent/src/core/agent-session.ts:2470] [E: packages/coding-agent/src/core/agent-session.ts:2474] [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:156]

`ModelRegistry` 是 `pi-coding-agent` 对 `pi-ai` provider/model layer 的产品侧索引：`main()` 从 services 取得 `modelRegistry` 并用于 model scope/session option resolution；registry 自身加载 built-in models、合并 custom models 和 overrides，提供 lookup/availability/auth resolution，并允许 extension 动态 register provider。[E: packages/coding-agent/src/main.ts:674] [E: packages/coding-agent/src/main.ts:685] [E: packages/coding-agent/src/main.ts:687] [E: packages/coding-agent/src/main.ts:692] [E: packages/coding-agent/src/main.ts:696] [E: packages/coding-agent/src/core/model-registry.ts:352] [E: packages/coding-agent/src/core/model-registry.ts:401] [E: packages/coding-agent/src/core/model-registry.ts:415] [E: packages/coding-agent/src/core/model-registry.ts:416] [E: packages/coding-agent/src/core/model-registry.ts:476] [E: packages/coding-agent/src/core/model-registry.ts:636] [E: packages/coding-agent/src/core/model-registry.ts:645] [E: packages/coding-agent/src/core/model-registry.ts:651] [E: packages/coding-agent/src/core/model-registry.ts:701] [E: packages/coding-agent/src/core/model-registry.ts:828]

`StreamFn` 的类型边界在 `pi-agent-core` 声明；`streamAssistantResponse()` 接收 optional `streamFn`，未提供时回退到 `streamSimple`，随后调用 stream function。coding-agent 注入的 `streamFn` 会先向 `ModelRegistry` 取 request auth，再调用 `streamSimple`；若该 async wrapper 抛错，`Agent.runWithLifecycle()` 会走 failure message 路径。[E: packages/agent/src/types.ts:27] [E: packages/agent/src/agent-loop.ts:275] [E: packages/agent/src/agent-loop.ts:280] [E: packages/agent/src/agent-loop.ts:298] [E: packages/agent/src/agent-loop.ts:304] [E: packages/coding-agent/src/core/sdk.ts:301] [E: packages/coding-agent/src/core/sdk.ts:302] [E: packages/coding-agent/src/core/sdk.ts:304] [E: packages/coding-agent/src/core/sdk.ts:315] [E: packages/agent/src/agent.ts:469] [E: packages/agent/src/agent.ts:485] [E: packages/agent/src/agent.ts:487] [E: packages/agent/src/agent.ts:494]

## Ground Truth 索引

内置工具集的 ground truth 是 `packages/coding-agent/src/core/tools/index.ts`：`ToolName` / `allToolNames` 列出 `read`、`bash`、`edit`、`write`、`grep`、`find`、`ls`，`createAllToolDefinitions()` 返回同一组 tool definitions。[E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:157]

provider 集的 ground truth 是 `packages/ai/src/providers/all.ts`：`builtinProviders()` freshly constructs provider factories，`builtinModels()` 创建 `Models` collection 并逐个 `setProvider()`。[E: packages/ai/src/providers/all.ts:70] [E: packages/ai/src/providers/all.ts:71] [E: packages/ai/src/providers/all.ts:111] [E: packages/ai/src/providers/all.ts:112] [E: packages/ai/src/providers/all.ts:113] [E: packages/ai/src/providers/all.ts:114]

slash command 的 built-in ground truth 是 `BUILTIN_SLASH_COMMANDS`；RPC command union 在 `rpc-types.ts`，RPC mode 通过 JSONL stdin 读取 command，在 `switch (command.type)` 内 dispatch，并在 session replacement 后 rebind runtime session。[E: packages/coding-agent/src/core/slash-commands.ts:18] [E: packages/coding-agent/src/core/slash-commands.ts:19] [E: packages/coding-agent/src/core/slash-commands.ts:40] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:22] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:72] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:53] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:312] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:385] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:390] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:576] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:584] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:653] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:781]

## 指向 T1/T2 深挖

`spine.layered-architecture` 应从 package-level 角度解释 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 的依赖方向和可复用边界；本节点只给端到端鸟瞰。[I]

`spine.process-lifecycle` 应从 `main(args)` 展开 argv parsing、session selection、project trust、runtime creation、mode dispatch；本节点只保留关键分支和锚点。[I]

`spine.agent-loop` 应从 `Agent.prompt()` / `runAgentLoop()` 展开 one turn 内 assistant streaming、tool calls、steering、follow-up、termination；本节点只描述 loop 责任和主要事件。[I]

`spine.provider-stream` 应从 `ModelRegistry`、`streamFn`、`pi-ai` provider dispatch、wire API 展开 provider request/response normalization；本节点只定位边界。[I]

`ref.package-index` 应列出 monorepo 包、build/test/toolchain 和 package metadata；本节点只引用 README 中的 package description。[I]

## Sources

- README.md
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/core/agent-session-runtime.ts
- packages/coding-agent/src/core/agent-session-services.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/src/modes/rpc/rpc-types.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts
- packages/ai/src/models.ts
- packages/ai/src/providers/all.ts

## 相关

- [spine.layered-architecture](layered-architecture.md) - 分层架构与包边界。
- [spine.process-lifecycle](process-lifecycle.md) - 进程生命周期(argv->mode->session)。
- [spine.agent-loop](agent-loop.md) - agent 回合循环(一次 turn)。
- [spine.provider-stream](provider-stream.md) - provider 流式调用(统一->wire->归一)。
- [ref.package-index](../reference/package-index.md) - monorepo 包索引与工具链。
