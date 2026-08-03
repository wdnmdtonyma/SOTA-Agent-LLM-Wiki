---
id: spine.layered-architecture
title: 分层架构与包边界
kind: flow
tier: T0
pkg: cross
source: [package.json, scripts/publish.mjs, packages/agent/src/index.ts, packages/agent/src/harness/tools/index.ts, packages/coding-agent/src/core/agent-session.ts, packages/ai/src/index.ts, packages/ai/package.json, packages/agent/package.json, packages/protocol/package.json, packages/client/package.json, packages/coding-agent/package.json, packages/storage/sqlite-node/package.json, packages/server/package.json, packages/evals/package.json]
symbols: [Agent, AgentHarness, AgentSession, ModelRuntime, Models, PiClient, PiServer]
related: [spine.overview, spine.agent-loop, subsys.coding-agent.agent-session, subsys.agent-core.execution-tools, subsys.protocol.wire-protocol, subsys.client.remote-session-client, subsys.server.session-server, subsys.storage.sqlite-node, subsys.evals.pi-harness, ref.package-index]
evidence: explicit
status: verified
updated: a8ee03b815
---

> Pi 的主线分层是 `pi-ai` 提供 provider/model API，`pi-agent-core` 提供可复用 agent runtime，`pi-coding-agent` 把 runtime 装配成 coding-agent CLI 产品；`AgentSession` 是产品层和 core runtime 的主要边界对象。[E: packages/ai/package.json:2][E: packages/ai/package.json:4][E: packages/agent/package.json:2][E: packages/agent/package.json:4][E: packages/coding-agent/package.json:2][E: packages/coding-agent/package.json:4][E: packages/coding-agent/src/core/agent-session.ts:197][E: packages/coding-agent/src/core/agent-session.ts:198]

`pi-protocol` 和 `pi-client` 在 coding-agent/server 之间新建 transport-neutral remote-session 边界；`pi-storage-sqlite-node` 是 agent-core session seam 的可选 backend；`pi-server` 同时公开 composable server 与 `legacy` 多实例路径；private `pi-evals` 是最外侧的真实-session 评测消费者。[E: packages/protocol/package.json:2][E: packages/protocol/package.json:4][E: packages/client/package.json:2][E: packages/client/package.json:4][E: packages/storage/sqlite-node/package.json:4][E: packages/server/package.json:8][E: packages/server/package.json:21][E: packages/evals/package.json:4]

```mermaid
flowchart TD
  User["User / CLI / RPC / interactive mode"]
  Coding["pi-coding-agent<br/>AgentSession product shell"]
  Core["pi-agent-core<br/>Agent + AgentHarness reusable runtime"]
  AI["pi-ai<br/>Models, provider auth, stream APIs"]
  Protocol["pi-protocol<br/>schemas + CBOR framing"]
  Client["pi-client<br/>remote session client"]
  Server["pi-server<br/>composable server + legacy export"]
  Tools["coding-agent tool definitions<br/>built-in + extension + SDK tools"]
  Sessions["coding-agent session/settings/resources"]

  User --> Coding
  Coding -->|owns Agent in AgentSessionConfig| Core
  Coding -->|ModelRuntime resolves auth and streams| AI
  Coding -->|builds active AgentTool registry| Tools
  Coding -->|persists messages and settings| Sessions
  Core -->|streamFn uses model context| AI
  Tools -->|wrapped as AgentTool| Core
  Coding -->|experimental remote client| Client
  Client -->|validated framed messages| Protocol
  Server -->|validated framed messages| Protocol
  Server -->|owns coding-agent runtimes| Coding
```

## 能回答的问题

- `pi-ai`、`pi-agent-core`、`pi-coding-agent` 三个包各自负责什么？
- `pi-agent-core` 哪些能力是可复用 runtime，哪些能力被 `pi-coding-agent` 产品化？
- `AgentSession` 为什么属于 `pi-coding-agent`，但又持有 `pi-agent-core` 的 `Agent`？
- 内置工具、扩展工具、SDK custom tools 在哪一层被装配进 agent runtime？
- `Models` / provider 逻辑和 `Agent` / tool loop 的边界在哪里？
- `pi-protocol` / `pi-client` / composable `pi-server` 如何把 remote session 链与旧 `legacy` server 分开？
- 相关深挖节点 `spine.agent-loop`、`subsys.coding-agent.agent-session`、`ref.package-index` 应该分别解释什么？

## 分层总览

`@earendil-works/pi-ai` 是 LLM API 层；`packages/ai/package.json` 把它命名为 `@earendil-works/pi-ai` 并描述为带 model discovery 和 provider configuration 的 unified LLM API。[E: packages/ai/package.json:2][E: packages/ai/package.json:4] `packages/ai/src/index.ts` 的 public entrypoint 导出 API lazy loader、auth context/helpers、`models.ts` 和 provider faux 支持，所以 `Models` 相关能力属于 `pi-ai` 包边界。[E: packages/ai/src/index.ts:15][E: packages/ai/src/index.ts:21][E: packages/ai/src/index.ts:23][E: packages/ai/src/index.ts:34][E: packages/ai/src/index.ts:36]

`@earendil-works/pi-agent-core` 是可复用 runtime 层；`packages/agent/package.json` 把它命名为 `@earendil-works/pi-agent-core` 并描述为带 transport abstraction、state management 和 attachment support 的 general-purpose agent。[E: packages/agent/package.json:2][E: packages/agent/package.json:4] `packages/agent/src/index.ts` 从 public entrypoint 导出 `agent.ts`、`agent-loop.ts`、`harness/agent-harness.ts`、session repo、skills、system prompt、types 和 proxy，所以 `Agent` 与 `AgentHarness` 是 core 层对外暴露的 runtime/harness 符号。[E: packages/agent/src/index.ts:3][E: packages/agent/src/index.ts:5][E: packages/agent/src/index.ts:6][E: packages/agent/src/index.ts:32][E: packages/agent/src/index.ts:55][E: packages/agent/src/index.ts:56][E: packages/agent/src/index.ts:59]

`@earendil-works/pi-coding-agent` 是 coding-agent CLI 产品层；`packages/coding-agent/package.json` 把它命名为 `@earendil-works/pi-coding-agent`，描述为带 read、bash、edit、write tools 与 session management 的 coding agent CLI，并声明 `pi` 可执行入口。[E: packages/coding-agent/package.json:2][E: packages/coding-agent/package.json:4][E: packages/coding-agent/package.json:9] `AgentSessionConfig` 把 core `Agent`、`SessionManager`、`SettingsManager`、`ResourceLoader`、SDK custom tools、canonical `ModelRuntime` 和工具 allow/deny list 聚在一个产品会话配置里，因此 `AgentSession` 不是纯 runtime，而是 coding-agent 的产品装配对象。[E: packages/coding-agent/src/core/agent-session.ts:197][E: packages/coding-agent/src/core/agent-session.ts:198][E: packages/coding-agent/src/core/agent-session.ts:199][E: packages/coding-agent/src/core/agent-session.ts:200][E: packages/coding-agent/src/core/agent-session.ts:205][E: packages/coding-agent/src/core/agent-session.ts:207][E: packages/coding-agent/src/core/agent-session.ts:209][E: packages/coding-agent/src/core/agent-session.ts:213][E: packages/coding-agent/src/core/agent-session.ts:215]

`@earendil-works/pi-protocol` 只定义 remote-session DTO/schema/codec，`@earendil-works/pi-client` 依赖 protocol 并另行导出 `./unix`；`pi-coding-agent` 的 `./client` experimental surface 同时依赖 client/protocol。[E: packages/protocol/package.json:4][E: packages/protocol/package.json:8][E: packages/client/package.json:8][E: packages/client/package.json:13][E: packages/client/package.json:37][E: packages/coding-agent/package.json:22][E: packages/coding-agent/package.json:48][E: packages/coding-agent/package.json:49] `pi-server` 根入口与 `./unix` 组装新 `PiServer`，`./legacy` 与 `server` bin 保留旧多实例链。[E: packages/server/package.json:8][E: packages/server/package.json:17][E: packages/server/package.json:21][E: packages/server/package.json:26][E: packages/server/package.json:59]

## pi-agent-core 可复用边界

`pi-agent-core` 的可复用边界是 `Agent`、agent loop、`AgentHarness`、session repo、compaction、skills、system prompt、types 和 proxy utilities 的 export surface；这些 exports 不携带 `pi-coding-agent` 的 CLI mode、settings manager、resource loader 或 extension runner 实体名。[E: packages/agent/src/index.ts:3][E: packages/agent/src/index.ts:5][E: packages/agent/src/index.ts:6][E: packages/agent/src/index.ts:17][E: packages/agent/src/index.ts:32][E: packages/agent/src/index.ts:34][E: packages/agent/src/index.ts:37][E: packages/agent/src/index.ts:55][E: packages/agent/src/index.ts:56][E: packages/agent/src/index.ts:63][I]

agent-core 也公开依赖 `ExecutionEnv` 的 bash/read/edit/write execution-tool factories，但调用方必须显式安装；coding-agent 仍拥有七工具 registry、产品 settings、extension/TUI integration 等产品语义。[E: packages/agent/src/harness/tools/index.ts:1][E: packages/agent/src/harness/tools/index.ts:7][E: packages/agent/src/harness/tools/index.ts:13][E: packages/agent/src/harness/tools/index.ts:19][E: packages/agent/src/harness/tools/index.ts:23][I]

`pi-coding-agent` 在配置、session event、状态 getter 和工具切换中直接使用 core 的 `Agent`、`AgentEvent`、`AgentMessage`、`AgentState`、`AgentTool` 和 `ThinkingLevel`，说明产品层依赖 core runtime 的状态、事件和工具抽象，而不是把 coding-agent UI 逻辑放回 core 包。[E: packages/coding-agent/src/core/agent-session.ts:198][E: packages/coding-agent/src/core/agent-session.ts:141][E: packages/coding-agent/src/core/agent-session.ts:144][E: packages/coding-agent/src/core/agent-session.ts:156][E: packages/coding-agent/src/core/agent-session.ts:866][E: packages/coding-agent/src/core/agent-session.ts:932]

`AgentSession` 构造时接收一个已经创建好的 core `Agent`，保存到 `this.agent`，订阅 core agent event，并安装 tool hook；这让 `pi-coding-agent` 可以围绕同一个 reusable `Agent` 增加 session persistence、extensions、auto-compaction 和 retry handling。[E: packages/coding-agent/src/core/agent-session.ts:376][E: packages/coding-agent/src/core/agent-session.ts:377][E: packages/coding-agent/src/core/agent-session.ts:394][E: packages/coding-agent/src/core/agent-session.ts:396][E: packages/coding-agent/src/core/agent-session.ts:624][E: packages/coding-agent/src/core/agent-session.ts:646][I]

## pi-coding-agent 产品边界

`AgentSession` 的产品职责由字段和方法实现体现：它持有 session/settings/resource/model 依赖，暴露 model/thinking state 管理，负责事件持久化、compaction、bash execution、session tree navigation 和工具/扩展装配。[E: packages/coding-agent/src/core/agent-session.ts:306][E: packages/coding-agent/src/core/agent-session.ts:307][E: packages/coding-agent/src/core/agent-session.ts:345][E: packages/coding-agent/src/core/agent-session.ts:345][E: packages/coding-agent/src/core/agent-session.ts:871][E: packages/coding-agent/src/core/agent-session.ts:876][E: packages/coding-agent/src/core/agent-session.ts:1589][E: packages/coding-agent/src/core/agent-session.ts:1688][E: packages/coding-agent/src/core/agent-session.ts:646][E: packages/coding-agent/src/core/agent-session.ts:1794][E: packages/coding-agent/src/core/agent-session.ts:2776][E: packages/coding-agent/src/core/agent-session.ts:2906][E: packages/coding-agent/src/core/agent-session.ts:2559]

`AgentSession._handleAgentEvent` 把 core event 转成 extension event、listener event 和 session persistence：`message_end` 上的 custom message 走 `appendCustomMessageEntry`，普通 user/assistant/toolResult message 走 `sessionManager.appendMessage`。[E: packages/coding-agent/src/core/agent-session.ts:624][E: packages/coding-agent/src/core/agent-session.ts:627][E: packages/coding-agent/src/core/agent-session.ts:634][E: packages/coding-agent/src/core/agent-session.ts:646]

`AgentSession.prompt()` 先处理 extension command、input hook、skill command、prompt template、streaming queue、model/auth preflight 和 extension `before_agent_start`，然后才把 messages 交给 `_runAgentPrompt()`；这条路径说明用户输入产品语义在 `pi-coding-agent` 层完成，再进入 core `Agent`。[E: packages/coding-agent/src/core/agent-session.ts:1127][E: packages/coding-agent/src/core/agent-session.ts:1146][E: packages/coding-agent/src/core/agent-session.ts:1165][E: packages/coding-agent/src/core/agent-session.ts:1166][E: packages/coding-agent/src/core/agent-session.ts:1170][E: packages/coding-agent/src/core/agent-session.ts:1189][E: packages/coding-agent/src/core/agent-session.ts:1107][E: packages/coding-agent/src/core/agent-session.ts:1236][E: packages/coding-agent/src/core/agent-session.ts:1275]

`AgentSession._runAgentPrompt()` 是产品层进入 reusable runtime 的窄口：它调用 `this.agent.prompt(messages)`，在 post-run 需要 retry、compaction 或 queued message 时继续调用 `this.agent.continue()`。[E: packages/coding-agent/src/core/agent-session.ts:1066][E: packages/coding-agent/src/core/agent-session.ts:1069][E: packages/coding-agent/src/core/agent-session.ts:1070][E: packages/coding-agent/src/core/agent-session.ts:1071][E: packages/coding-agent/src/core/agent-session.ts:1087][E: packages/coding-agent/src/core/agent-session.ts:1101][E: packages/coding-agent/src/core/agent-session.ts:1107]

## 工具与扩展装配

`AgentSession._buildRuntime()` 在 `pi-coding-agent` 层读取 settings 的 image auto-resize、shell command prefix 和 shell path，然后用这些产品设置创建内置工具定义；当 `baseToolsOverride` 存在时，`AgentSession` 会把外部传入的 `AgentTool` 转成 `ToolDefinition`，否则调用 `createAllToolDefinitions()` 创建 coding-agent 内置工具。[E: packages/coding-agent/src/core/agent-session.ts:2564][E: packages/coding-agent/src/core/agent-session.ts:2565][E: packages/coding-agent/src/core/agent-session.ts:2566][E: packages/coding-agent/src/core/agent-session.ts:2567][E: packages/coding-agent/src/core/agent-session.ts:2571][E: packages/coding-agent/src/core/agent-session.ts:2574]

`AgentSession._buildRuntime()` 还创建 `ExtensionRunner`，把扩展绑定到当前 cwd、session manager 和 model registry，再刷新 active tool registry；这说明 extension runtime 和工具可见性是 `pi-coding-agent` 产品层的装配责任。[E: packages/coding-agent/src/core/agent-session.ts:2583][E: packages/coding-agent/src/core/agent-session.ts:2590][E: packages/coding-agent/src/core/agent-session.ts:2593][E: packages/coding-agent/src/core/agent-session.ts:2594][E: packages/coding-agent/src/core/agent-session.ts:2494][E: packages/coding-agent/src/core/agent-session.ts:2600][E: packages/coding-agent/src/core/agent-session.ts:2607]

`AgentSession._refreshToolRegistry()` 把 built-in tools、extension registered tools 和 SDK custom tools 合成 `_toolDefinitions` 与 `_toolRegistry`，再用 `setActiveToolsByName()` 写回 core `Agent` 的 active tools；因此工具定义来源在产品层聚合，工具执行抽象以 `AgentTool` 形式交给 core runtime。[E: packages/coding-agent/src/core/agent-session.ts:2476][E: packages/coding-agent/src/core/agent-session.ts:2477][E: packages/coding-agent/src/core/agent-session.ts:2482][E: packages/coding-agent/src/core/agent-session.ts:2517][E: packages/coding-agent/src/core/agent-session.ts:2518][E: packages/coding-agent/src/core/agent-session.ts:2528][E: packages/coding-agent/src/core/agent-session.ts:2532][E: packages/coding-agent/src/core/agent-session.ts:2556]

## 模型与 provider 边界

`pi-ai` 的 public entrypoint 导出 auth、models、session resources、diagnostics、event stream、overflow、retry 和 validation utilities；这些 exports 是 LLM/provider 基础设施，不包含 `AgentSession`、`ExtensionRunner` 或 coding-agent tool factory。[E: packages/ai/src/index.ts:21][E: packages/ai/src/index.ts:34][E: packages/ai/src/index.ts:37][E: packages/ai/src/index.ts:39][E: packages/ai/src/index.ts:40][E: packages/ai/src/index.ts:42][E: packages/ai/src/index.ts:43][E: packages/ai/src/index.ts:47][I]

`AgentSession` 保存 canonical `ModelRuntime`，通过 `_modelRuntime.getAuth()` 做 API key/auth preflight，并用它负责 model/provider/auth/stream 路径；thinking level 则保存在 core `Agent.state`，由产品层约束和切换。所以 `pi-coding-agent` 选择和校验模型，但 provider stream 语义来自 `pi-ai`。[E: packages/coding-agent/src/core/agent-session.ts:363][E: packages/coding-agent/src/core/agent-session.ts:384][E: packages/coding-agent/src/core/agent-session.ts:404][E: packages/coding-agent/src/core/agent-session.ts:405][E: packages/coding-agent/src/core/agent-session.ts:408][E: packages/coding-agent/src/core/agent-session.ts:415][E: packages/coding-agent/src/core/agent-session.ts:423][E: packages/coding-agent/src/core/agent-session.ts:424][E: packages/coding-agent/src/core/agent-session.ts:871][E: packages/coding-agent/src/core/agent-session.ts:876]

`ModelRegistry` 仍在 `_buildRuntime()` 中临时包裹 `ModelRuntime`，但只作为 extension API 的 compatibility facade 传给 `ExtensionRunner`；它不再是 `AgentSessionConfig` 的 canonical model/auth dependency。[E: packages/coding-agent/src/core/agent-session.ts:2590][E: packages/coding-agent/src/core/agent-session.ts:2594][E: packages/coding-agent/src/core/agent-session.ts:2595][I]

## 端到端步骤

1. `AgentSessionConfig` 要求外部传入 core `Agent`、`SessionManager`、`SettingsManager`、cwd、`ResourceLoader` 和 `ModelRuntime`，`AgentSession` 构造器再接收这份配置并保存产品依赖。[E: packages/coding-agent/src/core/agent-session.ts:197][E: packages/coding-agent/src/core/agent-session.ts:198][E: packages/coding-agent/src/core/agent-session.ts:199][E: packages/coding-agent/src/core/agent-session.ts:200][E: packages/coding-agent/src/core/agent-session.ts:201][E: packages/coding-agent/src/core/agent-session.ts:205][E: packages/coding-agent/src/core/agent-session.ts:209][E: packages/coding-agent/src/core/agent-session.ts:376][E: packages/coding-agent/src/core/agent-session.ts:377][E: packages/coding-agent/src/core/agent-session.ts:378][E: packages/coding-agent/src/core/agent-session.ts:379][E: packages/coding-agent/src/core/agent-session.ts:381][E: packages/coding-agent/src/core/agent-session.ts:384]
2. `AgentSession` 构造器保存 product dependencies、订阅 core `Agent` event、安装 tool hooks，并立即调用 `_buildRuntime()` 装配工具和扩展运行时。[E: packages/coding-agent/src/core/agent-session.ts:376][E: packages/coding-agent/src/core/agent-session.ts:377][E: packages/coding-agent/src/core/agent-session.ts:378][E: packages/coding-agent/src/core/agent-session.ts:379][E: packages/coding-agent/src/core/agent-session.ts:394][E: packages/coding-agent/src/core/agent-session.ts:396][E: packages/coding-agent/src/core/agent-session.ts:398]
3. `_buildRuntime()` 从 settings/resource loader 与 `ModelRuntime` compatibility facade 创建工具定义、`ExtensionRunner` 和 active tool registry，再通过 `setActiveToolsByName()` 更新 core `Agent.state.tools` 和 system prompt。[E: packages/coding-agent/src/core/agent-session.ts:2574][E: packages/coding-agent/src/core/agent-session.ts:2590][E: packages/coding-agent/src/core/agent-session.ts:2595][E: packages/coding-agent/src/core/agent-session.ts:2607][E: packages/coding-agent/src/core/agent-session.ts:941][E: packages/coding-agent/src/core/agent-session.ts:944][E: packages/coding-agent/src/core/agent-session.ts:945]
4. 用户输入进入 `AgentSession.prompt()`，产品层先处理 extension command、input hook、skill/template expansion、streaming queue 和 model/auth preflight。[E: packages/coding-agent/src/core/agent-session.ts:1127][E: packages/coding-agent/src/core/agent-session.ts:1146][E: packages/coding-agent/src/core/agent-session.ts:1165][E: packages/coding-agent/src/core/agent-session.ts:1170][E: packages/coding-agent/src/core/agent-session.ts:1189][E: packages/coding-agent/src/core/agent-session.ts:1107]
5. `AgentSession.prompt()` 生成 user message 和 extension custom messages，应用 extension-modified system prompt 或 base prompt，然后调用 `_runAgentPrompt(messages)`。[E: packages/coding-agent/src/core/agent-session.ts:1216][E: packages/coding-agent/src/core/agent-session.ts:1223][E: packages/coding-agent/src/core/agent-session.ts:1236][E: packages/coding-agent/src/core/agent-session.ts:1245][E: packages/coding-agent/src/core/agent-session.ts:1259][E: packages/coding-agent/src/core/agent-session.ts:1263][E: packages/coding-agent/src/core/agent-session.ts:1275]
6. `_runAgentPrompt()` 调用 core `Agent.prompt()` 和 `Agent.continue()`，core `Agent` event 再回到 `AgentSession._handleAgentEvent()` 做 extension dispatch、listener emit 和 session persistence。[E: packages/coding-agent/src/core/agent-session.ts:1069][E: packages/coding-agent/src/core/agent-session.ts:1071][E: packages/coding-agent/src/core/agent-session.ts:624][E: packages/coding-agent/src/core/agent-session.ts:627][E: packages/coding-agent/src/core/agent-session.ts:634][E: packages/coding-agent/src/core/agent-session.ts:646]

## 关键决策点

- 如果代码只需要 LLM provider/model/auth/stream 能力，应依赖 `pi-ai` 的 `Models` / provider API，而不是依赖 `AgentSession`。[E: packages/ai/src/index.ts:34][E: packages/coding-agent/src/core/agent-session.ts:192][I]
- 如果代码需要 agent loop、tool abstraction、state/messages 和 reusable harness，应依赖 `pi-agent-core` 的 `Agent` / `AgentHarness` exports，而不是引入 coding-agent 的 settings、extensions 或 CLI modes。[E: packages/agent/src/index.ts:3][E: packages/agent/src/index.ts:6][E: packages/agent/src/index.ts:59][I]
- 如果代码需要 coding-agent 产品工具语义、七工具 registry、extension commands、resource loading、session files、settings persistence 或 TUI integration，应放在 `pi-coding-agent`，因为这些实体由 `AgentSession` 和周边 core modules 装配；只需要抽象环境上的四个基础 execution tools 时可直接使用 agent-core factories。[E: packages/coding-agent/src/core/agent-session.ts:2574][E: packages/coding-agent/src/core/agent-session.ts:2605][E: packages/coding-agent/src/core/agent-session.ts:1128][E: packages/coding-agent/src/core/agent-session.ts:2358][E: packages/coding-agent/src/core/agent-session.ts:2583][E: packages/coding-agent/src/core/agent-session.ts:646][E: packages/coding-agent/src/core/agent-session.ts:2564][E: packages/coding-agent/src/core/agent-session.ts:2776][E: packages/agent/src/harness/tools/index.ts:1][E: packages/agent/src/harness/tools/index.ts:23][I]

## 指向 T1/T2 深挖

- `spine.overview` 应给出整个 Pi repo 的一屏总览，并把 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 放进同一张地图。[I]
- `spine.agent-loop` 应沿 core `Agent.prompt()` / `Agent.continue()` 解释 turn、tool call 和 assistant message 的真实执行路径；本节点只说明产品层在哪里进入 core runtime。[E: packages/coding-agent/src/core/agent-session.ts:1069][E: packages/coding-agent/src/core/agent-session.ts:1071]
- `subsys.coding-agent.agent-session` 应详写 `AgentSession` 的方法级职责，包括 prompt、reload、extension binding、compaction、bash execution、tree navigation 和 model registry access；本节点只钉清 `AgentSession` 位于 `pi-coding-agent` 产品边界。[E: packages/coding-agent/src/core/agent-session.ts:386][E: packages/coding-agent/src/core/agent-session.ts:1119][E: packages/coding-agent/src/core/agent-session.ts:1794][E: packages/coding-agent/src/core/agent-session.ts:2600][E: packages/coding-agent/src/core/agent-session.ts:2613][E: packages/coding-agent/src/core/agent-session.ts:2776][E: packages/coding-agent/src/core/agent-session.ts:2906]
- `ref.package-index` 应作为 package catalog，逐包列出 public package name、源码目录、职责和主要 exports；本节点只覆盖分层关系和调用方向。[E: README.md:26][E: README.md:30][E: README.md:31][E: README.md:32][E: README.md:33]

## Sources

- README.md
- packages/agent/src/index.ts
- packages/agent/src/harness/tools/index.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/ai/src/index.ts
- packages/ai/package.json
- packages/agent/package.json
- packages/coding-agent/package.json
- packages/storage/sqlite-node/package.json
- packages/server/package.json
- packages/evals/package.json

## 相关

- `spine.overview`: Pi repo 总览节点，负责把本分层图嵌入全仓库地图。
- `spine.agent-loop`: agent turn/tool loop 走读节点，负责解释 core runtime 的内部执行。
- `subsys.coding-agent.agent-session`: `AgentSession` 子系统节点，负责解释产品会话外壳的字段和方法。
- `ref.package-index`: package catalog 节点，负责列出每个 package 的目录、exports 和职责。
