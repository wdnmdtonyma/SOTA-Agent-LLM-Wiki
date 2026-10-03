---
id: ref.glossary
title: 术语表
kind: reference
tier: T3
pkg: cross
source:
  - README.md
  - AGENTS.md
symbols: []
related:
  - spine.overview
  - spine.layered-architecture
  - ref.package-index
  - subsys.durable.runtime
  - subsys.durable.storage
  - subsys.coding-agent.model-registry
  - surface.providers.auth
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.glossary` 是 Pi agent harness 常用英文术语的中文导览索引；README 能直接证明的公开定位标 `[E]`，更细的内部实现术语标 `[I]` 并指向对应节点。

## 能回答的问题

- Pi monorepo 里 `chord`、`pi-ai`、`pi-durable`、`pi-agent-core`、`pi-coding-agent`、`pi-tui`、`pi-codemode`、`pi-mcp` 各是什么意思？`pi-client` 的公开类名是什么？
- Agent loop、Agent、AgentSession、durable `Harness`、tool call、steering、follow-up、`finishTurn` 在 Pi 语境中怎样区分？
- Virtual model / `pi-virtual`、`TranscriptContext`、`ContextEditEntry`、Classifier、`Models.classify` 指什么？
- Provider、ModelRegistry、Models、wire API、transport 这些模型调用术语怎样对应源码？
- coding-agent RPC mode 与 composable `PiServer` remote protocol 有什么区别？
- `SessionMetadata`、telemetry 分别指什么？已删除的 `session-backends` 包去哪了？

## 包与分层

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Pi | README 的 H1 是 `Pi`。正文把它定位为 minimal、extensible agent harness，可用 extensions / skills / prompt templates / themes 定制。[I] | [E: README.md:15] [E: README.md:15] [E: README.md:17] |
| agent harness | README 用 “minimal, extensible agent harness” 描述整个项目；产品 CLI 是 `pi-coding-agent`，可复用 loop 是 `pi-agent-core`，1.0 可复用 session/task harness 是 `pi-durable` 的 `Harness`。[I] | [E: README.md:15] |
| Pi monorepo | README Packages 表现在列出 `chord`、`pi-telemetry`、`pi-ai`、`pi-durable`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 七个公开包。“monorepo”是本 wiki 对该源码树的组织性叫法；workspace 另有 `pi-codemode`、`pi-mcp` 等未进该表的包。[I] | [E: README.md:74] [E: README.md:78] [E: README.md:79] [E: README.md:80] [E: README.md:81] [E: README.md:82] [E: README.md:83] [E: README.md:84] |
| `chord` / `@earendil-works/chord` | README 定义为 standalone application-composition runtime，覆盖 services、replicated state、RPC 与 plugins。 | [E: README.md:78] |
| `pi-telemetry` / `@earendil-works/pi-telemetry` | README 定义为 vendor-neutral telemetry contracts、reference adapter、conformance tests 与 typed schemas。 | [E: README.md:79] |
| `pi-ai` / `@earendil-works/pi-ai` | README 定义为 Unified multi-provider LLM API，并例举 OpenAI、Anthropic、Google 等 provider 语境。 | [E: README.md:80] |
| `pi-durable` / `@earendil-works/pi-durable` | README 定义为 Durable conversation、task 和 document runtime。它不是 coding-agent session JSONL 的替代；SQLite/JSONL/Memory 适配器在本包内。[I] | [E: README.md:81] |
| durable `Harness` | `pi-durable` 导出的可复用 conversation/task runtime（`Harness`、`defineTask`、`defineTool`、`./tools`）。1.0 起取代已删除的 agent-core experimental harness。权威节点是 [subsys.durable.runtime](../subsystems/durable/runtime.md) 与 [subsys.durable.storage](../subsystems/durable/storage.md)。[I] | [I] |
| `pi-agent-core` / `@earendil-works/pi-agent-core` | README 定义为带 tool calling 和 state management 的 agent runtime。1.0 只剩 `Agent` / loop / proxy / types，不再带 session/harness。[I] | [E: README.md:82] |
| `pi-coding-agent` / `@earendil-works/pi-coding-agent` | README 定义为 Interactive coding agent CLI。 | [E: README.md:83] |
| `pi-tui` / `@earendil-works/pi-tui` | README 定义为带 differential rendering 的 Terminal UI library。 | [E: README.md:84] |
| `pi-codemode` / `@earendil-works/pi-codemode` | QuickJS WASM sandbox，无其它 Pi 包依赖。coding-agent 内置 replaceable `codemode` 扩展调用它。README Packages 表不列此包。[I] | [I] |
| `pi-mcp` / `@earendil-works/pi-mcp` | 独立 MCP client（stdio / Streamable HTTP / in-memory + OAuth）。coding-agent 内置 replaceable `mcp` 扩展使用它。README Packages 表不列此包。[I] | [I] |
| `pi-client` / `@earendil-works/pi-client` | 公开面是 Chord 风格的 `Client` + `createClientServiceTransport`，不是 `PiClient` / `PiSessionHandle`。README Packages 短表不列此包。[I] | [I] |
| `pi-server` / `@earendil-works/pi-server` | 实验性 composable remote-session 服务端,导出 `PiServer` + `PiServerService`;不是 README Packages 表中的公开产品包。[I] | [I] |
| `session-backends`（已删除） | **不是**现行 package。`packages/session-backends` 与 `@earendil-works/pi-session-backend-sqlite-node` 已删除。SQLite 现在是 `pi-durable` 的 storage adapter，见 [subsys.durable.storage](../subsystems/durable/storage.md)。[I] | [I] |
| `spine.overview` | 本 wiki 的跨包总览节点，负责把 CLI 产品入口、agent runtime、provider streaming 的主路径串起来；本术语表只是速查入口。[I] | [I] |

## 运行时与 Agent Loop

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Agent | README 把 `pi-agent-core` 定位为带 tool calling 和 state management 的 agent runtime；`Agent` 类和状态细节由 [spine.agent-loop](../spine/agent-loop.md) 与 [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md) 证明。[I] | [E: README.md:82] |
| Agent state | agent runtime 的 state management 属于 README 公开定位；具体 state 字段与重置行为由 [subsys.agent-core.message-model](../subsystems/agent-core/message-model.md) 和 [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md) 覆盖。[I] | [E: README.md:82] |
| Agent loop | agent runtime 的回合循环是 `pi-agent-core` 内部实现术语；端到端 turn 流程看 [spine.agent-loop](../spine/agent-loop.md)。[I] | [I] |
| Turn | Turn 指一次 agent 产生 assistant response、可能执行工具并决定是否继续的循环单位；权威解释在 [spine.agent-loop](../spine/agent-loop.md) 与 [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md)。[I] | [I] |
| Streaming assistant response | provider streaming 进入 agent loop 的响应流边界；跨包路径看 [spine.provider-stream](../spine/provider-stream.md) 与 [subsys.agent-core.message-model](../subsystems/agent-core/message-model.md)。[I] | [I] |
| StreamFn | agent-core 对 LLM streaming function 的抽象入口；类型和错误/中止约定看 [subsys.agent-core.transport-proxy](../subsystems/agent-core/transport-proxy.md)。[I] | [I] |
| Tool call | README 只公开说明 `pi-agent-core` 支持 tool calling；tool call 的消息块、校验、hook 与执行分派由 [spine.tool-call-anatomy](../spine/tool-call-anatomy.md) 和 [subsys.agent-core.tool-invocation](../subsystems/agent-core/tool-invocation.md) 证明。[I] | [E: README.md:82] |
| Sequential / parallel tool execution | 工具执行模式是 agent-core 内部策略；实例清单与执行语义看 [ref.agent.tool-execution-modes](tool-execution-modes.md) 和 [subsys.agent-core.tool-invocation](../subsystems/agent-core/tool-invocation.md)。[I] | [I] |
| Steering | Steering 是运行中向 agent 注入消息的队列语义；详见 [subsys.agent-core.message-queue](../subsystems/agent-core/message-queue.md)。[I] | [I] |
| Follow-up | Follow-up 是 agent 将停止时继续下一轮的排队语义；详见 [subsys.agent-core.message-queue](../subsystems/agent-core/message-queue.md)。[I] | [I] |
| `finishTurn` | agent-core 在 assistant+tools finalize 之后、`turn_end` 之前调用的 hook。返回 `{ action: "end" }` 结束正常 run；`{ action: "continue" }` 保证再发一次 provider 请求；`undefined` 保持默认调度。error/aborted 仍是 hard exit。**不是**已删除的 `shouldStopAfterTurn`。[I] | [I] |
| `prepareRequest` | 每次 conversational provider 请求前调用（含第一次）。pending messages 已 append；返回的 context/model/thinking 替换本 run 后续请求。不 poll 队列。[I] | [I] |
| `shouldStopAfterTurn` | **已删除，不是现行 API。** 现行 turn 结束决策是 `finishTurn`。不要在新代码或 wiki 现行面把它写成 hook 名。[I] | [I] |
| AgentSession | `AgentSession` 是 `pi-coding-agent` 产品层会话 facade，把 core runtime、资源、设置、模型和工具组装成 CLI 会话；详见 [subsys.coding-agent.agent-session](../subsystems/coding-agent/agent-session.md)。[I] | [I] |

## 模型与 Provider

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Provider | README 把 `pi-ai` 定义为 multi-provider LLM API；provider 的源码形态、built-in 集合和注册细节看 [surface.providers.overview](../surface/providers/overview.md) 与 [subsys.ai.provider-registry](../subsystems/ai/provider-registry.md)。[I] | [E: README.md:80] |
| Models collection | `Models` 是 `pi-ai` 的模型/provider 集合导览名；lookup、auth resolution 和 stream 委派由 [spine.provider-stream](../spine/provider-stream.md) 与 [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md) 覆盖。[I] | [I] |
| Built-in providers | README 只例举 OpenAI、Anthropic、Google 等 provider 语境；当前 built-in provider catalog 以 [ref.ai.provider-catalog](provider-catalog.md) 为准。[I] | [E: README.md:80] |
| `TranscriptContext` | provider `stream`/`complete` 的输入类型。system prompt 与 tools 在 transcript 的 system messages 里，用 `getCurrentSystemPrompt()` / `getCurrentTools()` 读取。只有 `normalizeContext()` 能产出该 branded 类型，原始 `Context` 不能直接进 provider。[I] | [I] |
| Classifier / `Models.classify()` | JEV 风格分类入口（`choice`/`score`/`bool`）。`KnownClassifierApi` 是 `typesafe-system-one` 与 `cloudflare-workers-ai-system-one`。与 chat `Models.stream()`、图像 `Models.generateImages()` 并列。[I] | [I] |
| API / wire API | wire API 是本 wiki 对 provider-specific request protocol 层的导览名；dispatch 与 protocol catalog 看 [subsys.ai.wire-protocol-dispatch](../subsystems/ai/wire-protocol-dispatch.md) 和 [ref.ai.wire-protocol-catalog](wire-protocol-catalog.md)。[I] | [I] |
| Transport | Transport 是 LLM stream 传输选择相关术语；agent-core 与 provider stream 的边界看 [subsys.agent-core.transport-proxy](../subsystems/agent-core/transport-proxy.md) 和 [spine.provider-stream](../spine/provider-stream.md)。[I] | [I] |
| ModelRegistry | `ModelRegistry` 是 `pi-coding-agent` 产品层模型 inventory 与 auth adapter（`ModelRuntime` 的同步 facade）；详见 [subsys.coding-agent.model-registry](../subsystems/coding-agent/model-registry.md)。[I] | [I] |
| Virtual model / `pi-virtual` | coding-agent catalog 里 `api: "pi-virtual"` 的可选条目。selection 可以叫它；每次请求由 `route()` 映射到有凭证的物理模型。Providers 只 stream 物理模型。装配 overlay 在 [subsys.coding-agent.model-registry](../subsystems/coding-agent/model-registry.md)。[I] | [I] |
| Provider auth | provider credential resolution 由 `pi-ai` 和 `pi-coding-agent` 协作；导览见 [surface.providers.auth](../surface/providers/auth.md)、[subsys.ai.auth-resolution](../subsystems/ai/auth-resolution.md) 和 [subsys.coding-agent.auth-storage](../subsystems/coding-agent/auth-storage.md)。[I] | [I] |

## 工具、命令与资源

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Built-in tools | README 公开说明 `pi-agent-core` 支持 tool calling；`pi-coding-agent` 的具体 built-in tool 清单由 [ref.tools-catalog](tools-catalog.md) 与 `surface.tools.*` 节点逐项覆盖。[I] | [E: README.md:82] |
| Active tools | Active tools 是 coding-agent 会话装配时启用的工具子集；详见 [subsys.coding-agent.agent-session](../subsystems/coding-agent/agent-session.md) 与 [subsys.coding-agent.tool-wrapper](../subsystems/coding-agent/tool-wrapper.md)。[I] | [I] |
| Extension | Extension 是 Pi self extensible coding agent 的扩展机制导览名；API 和生命周期看 [surface.extensions.api](../surface/extensions/api.md) 与 [spine.extension-lifecycle](../spine/extension-lifecycle.md)。[I] | [E: README.md:15] |
| Extension runtime | Extension runtime 是 coding-agent 装载、绑定和分发 extension 的执行层；详见 [subsys.coding-agent.extension-loader](../subsystems/coding-agent/extension-loader.md)、[subsys.coding-agent.extension-runner](../subsystems/coding-agent/extension-runner.md) 和 [subsys.coding-agent.extension-wrapper](../subsystems/coding-agent/extension-wrapper.md)。[I] | [I] |
| ResourceLoader | ResourceLoader 是 coding-agent 的资源发现入口，负责 extensions、skills、prompts、themes 和上下文文件等资源；详见 [subsys.coding-agent.resource-loader](../subsystems/coding-agent/resource-loader.md)。[I] | [I] |
| Skill | Skill 是 Pi 扩展/提示体系中的可发现能力包；用户级 surface 看 [surface.skills.system](../surface/skills/system.md)。[I] | [I] |
| Skill prompt exposure | skill 如何进入 system prompt 属于 prompt assembly 细节；详见 [subsys.coding-agent.system-prompt](../subsystems/coding-agent/system-prompt.md)。[I] | [I] |
| Slash command | Slash command 是 coding-agent 交互入口之一；command surface 与逐项 catalog 看 [surface.commands.overview](../surface/commands/overview.md) 和 [ref.coding-agent.slash-commands](slash-commands.md)。[I] | [I] |
| Project context files | AGENTS/CLAUDE 等上下文文件如何被发现和拼接属于 resource/system-prompt 细节；项目级规则文件 `AGENTS.md` 自称 Development Rules。[I] | [E: AGENTS.md:5] |
| `ContextEditEntry` | append-only session 记录，改一条更早 entry 对未来 provider context 的贡献，不改 raw history。`replacement: null` 从模型 context 省略该 target；有值则只替换 content。SessionManager 是 canonical。[I] | [I] |
| `ContextEdit` | durable/pico 手稿里的同名概念不是 shipped coding-agent API。现行 session 类型是 `ContextEditEntry`。不要把 `packages/*/docs/pico*` 当运行时证据。[I] | [I] |

## RPC、PiServer 与 Remote Protocol

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| RPC mode | coding-agent 的 headless stdin/stdout JSONL command/event surface；入口与 prompt trace 看 [surface.modes.rpc](../surface/modes/rpc.md) 与 [spine.trace-rpc-prompt](../spine/trace-rpc-prompt.md)。它不是 `pi-server` 的 listener/service。[I] | [I] |
| RpcCommand | `RpcCommand` 是 RPC mode 的 command union 名称；逐项命令看 [ref.coding-agent.rpc-methods](rpc-methods.md)。[I] | [I] |
| JSONL framing | coding-agent RPC 的 LF-only 行分隔消息边界；协议细节看 [surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md)。[I] | [I] |
| PiServer | `@earendil-works/pi-server` 的 composable remote-session core:listener 交已授权 `ByteConnection`,server 做 handshake、request dispatch 与 snapshot publication。详见 [subsys.server.session-server](../subsystems/server/session-server.md)。[I] | [I] |
| PiServerService | durable session 边界,原名 backend contract;方法是 `listSessions`/`listModels`/`createSession`/`openSession`。testing helper 现为 `packages/server/src/testing/host.ts` 导出的 `TestServerHost` / `createTestServerServices`,不再是旧的 `testing/service.ts`。[I] | [I] |
| SessionMetadata | protocol 层 durable session list 项:必填 `id`/`createdAt`,可选 `updatedAt`/`parentSessionId`/`sessionName`/`cwd`。它取代旧 list summaries;runtime phase/model/lock 只出现在 acquired `SessionSnapshot`。[I] | [I] |
| Wire protocol | remote client/server 的 CBOR session protocol,由 [subsys.protocol.wire-protocol](../subsystems/protocol/wire-protocol.md) 覆盖;不要与 coding-agent RPC JSONL 混淆。[I] | [I] |
| Unix listener | `PiServer` 的常见 Unix socket transport;看 [subsys.server.unix-transport](../subsystems/server/unix-transport.md)。[I] | [I] |
| telemetry | vendor-neutral telemetry contracts 包,以及 coding-agent 的 install ping / analytics settings;包级见 README,产品实现见 [subsys.coding-agent.telemetry](../subsystems/coding-agent/telemetry.md)。[I] | [E: README.md:79] |

## 证据边界与跨包入口

- `ref.glossary` 的 source 只包括 `README.md` 与 `AGENTS.md`；本页 `[E]` 只用于这两个文件能直接证明的项目定位、公开包说明、permission/containerization 和 Development Rules 语境。
- README 明确说明 Pi 默认没有内置 permission system；需要更强边界时应 containerize 或 sandbox Pi，并列出 Gondolin extension、Plain Docker、OpenShell 三种方向。[E: README.md:90] [E: README.md:92] [E: README.md:94] [E: README.md:95] [E: README.md:96]
- README 的 Development 段列出 `npm install --ignore-scripts`、`npm run build`、`npm run check`、`./test.sh`、`./pi-test.sh` 等开发入口；更细的测试/命令策略由 `AGENTS.md` 的 Development Rules 约束。[E: README.md:106] [E: README.md:106] [E: README.md:109] [E: README.md:110] [E: README.md:110] [E: AGENTS.md:5]
- package-internal、RPC/`PiServer`、provider/model 等术语在本页标 `[I]`，其源码证明责任属于链接到的 `spine.*`、`surface.*`、`subsys.*` 或 `ref.*` 节点。
- README 的 Packages 表现在直接列出 `chord`、`pi-telemetry`、`pi-ai`、`pi-durable`、`pi-agent-core`、`pi-coding-agent`、`pi-tui`；`pi-client` 的公开类名是 `Client` 不是 `PiClient`。`pi-codemode`、`pi-mcp`、`pi-server` 不在该表；本 glossary 把它们标 `[I]`，不拿 README 直证。[E: README.md:74] [E: README.md:78] [E: README.md:79] [E: README.md:80] [E: README.md:81] [E: README.md:82] [E: README.md:83] [E: README.md:84] [I]
- 已删除术语:`ServerSupervisor`、legacy JSONL IPC、`ServerRequest`、RPC stream bridge、`shouldStopAfterTurn`、`packages/session-backends` / `pi-session-backend-sqlite-node`。这些对象已不在现行公开 API 中。Radius 不是已删除术语：`radiusProvider` 与 `loadRadiusOAuth` 仍在 `packages/ai`。[I]

## Sources

- README.md
- AGENTS.md

## 相关

- [spine.overview](../spine/overview.md) - Pi 从 CLI 产品入口到 reusable agent harness、provider streaming 的跨包主路径。
- [spine.layered-architecture](../spine/layered-architecture.md) - 包边界与 build 顺序。
- [ref.package-index](package-index.md) - workspace 包索引。
- [subsys.durable.runtime](../subsystems/durable/runtime.md) - durable runtime；Harness 落点在相邻 durable 节点。
- [subsys.durable.storage](../subsystems/durable/storage.md) - Memory / JSONL / SQLite；取代已删除的 session-backends。
- [subsys.coding-agent.model-registry](../subsystems/coding-agent/model-registry.md) - ModelRuntime 与 virtual model overlay。
- [surface.providers.auth](../surface/providers/auth.md) - `/login`、OAuth、federation。
