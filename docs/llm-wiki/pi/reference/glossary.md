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
evidence: explicit
status: verified
updated: 5a073885
---

> `ref.glossary` 是 Pi agent harness 常用英文术语的中文导览索引；README 能直接证明的公开定位标 `[E]`，更细的内部实现术语标 `[I]` 并指向对应节点。

## 能回答的问题

- Pi monorepo 里 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui`、`pi-orchestrator` 各是什么意思？
- Agent loop、Agent、AgentSession、tool call、steering、follow-up 在 Pi 语境中怎样区分？
- Provider、ModelRegistry、Models、wire API、transport 这些模型调用术语怎样对应源码？
- RPC 与 IPC 在 Pi 里分别跑在哪条通道上？
- Orchestrator、Radius、Unix socket、extension、skill、slash command 的边界是什么？

## 包与分层

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Pi Agent Harness | README 的 H1 是 `Pi Agent Harness`，并说明该项目包含 self extensible coding agent。 | [E: README.md:13] [E: README.md:15] |
| self extensible coding agent | README 用该短语描述 Pi agent harness project 包含的 coding agent；extension/skill/command 的内部机制由 [spine.extension-lifecycle](../spine/extension-lifecycle.md) 与 [surface.extensions.api](../surface/extensions/api.md) 详写。[I] | [E: README.md:15] |
| Pi monorepo | README 的 All Packages 表列出 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 四个公开包；“monorepo”是本 wiki 对该源码树的组织性叫法。[I] | [E: README.md:26] [E: README.md:30] [E: README.md:31] [E: README.md:32] [E: README.md:33] |
| `pi-ai` / `@earendil-works/pi-ai` | README 定义为 Unified multi-provider LLM API，并例举 OpenAI、Anthropic、Google 等 provider 语境。 | [E: README.md:30] |
| `pi-agent-core` / `@earendil-works/pi-agent-core` | README 定义为带 tool calling 和 state management 的 agent runtime。 | [E: README.md:31] |
| `pi-coding-agent` / `@earendil-works/pi-coding-agent` | README 定义为 Interactive coding agent CLI。 | [E: README.md:32] |
| `pi-tui` / `@earendil-works/pi-tui` | README 定义为带 differential rendering 的 Terminal UI library。 | [E: README.md:33] |
| `pi-orchestrator` / `@earendil-works/pi-orchestrator` | orchestrator 不是 README All Packages 表中的公开包条目；本 wiki 将它作为实验性编排层处理，源码证明应看 [ref.package-index](package-index.md) 与 `subsys.orchestrator.*` 节点。[I] | [I] |
| `spine.overview` | 本 wiki 的跨包总览节点，负责把 CLI 产品入口、agent runtime、provider streaming 的主路径串起来；本术语表只是速查入口。[I] | [I] |

## 运行时与 Agent Loop

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Agent | README 把 `pi-agent-core` 定位为带 tool calling 和 state management 的 agent runtime；`Agent` 类和状态细节由 [spine.agent-loop](../spine/agent-loop.md) 与 [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md) 证明。[I] | [E: README.md:31] |
| Agent state | agent runtime 的 state management 属于 README 公开定位；具体 state 字段与重置行为由 [subsys.agent-core.message-model](../subsystems/agent-core/message-model.md) 和 [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md) 覆盖。[I] | [E: README.md:31] |
| Agent loop | agent runtime 的回合循环是 `pi-agent-core` 内部实现术语；端到端 turn 流程看 [spine.agent-loop](../spine/agent-loop.md)。[I] | [I] |
| Turn | Turn 指一次 agent 产生 assistant response、可能执行工具并决定是否继续的循环单位；权威解释在 [spine.agent-loop](../spine/agent-loop.md) 与 [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md)。[I] | [I] |
| Streaming assistant response | provider streaming 进入 agent loop 的响应流边界；跨包路径看 [spine.provider-stream](../spine/provider-stream.md) 与 [subsys.agent-core.message-conversion](../subsystems/agent-core/message-conversion.md)。[I] | [I] |
| StreamFn | agent-core 对 LLM streaming function 的抽象入口；类型和错误/中止约定看 [subsys.agent-core.transport-proxy](../subsystems/agent-core/transport-proxy.md)。[I] | [I] |
| Tool call | README 只公开说明 `pi-agent-core` 支持 tool calling；tool call 的消息块、校验、hook 与执行分派由 [spine.tool-call-anatomy](../spine/tool-call-anatomy.md) 和 [subsys.agent-core.tool-invocation](../subsystems/agent-core/tool-invocation.md) 证明。[I] | [E: README.md:31] |
| Sequential / parallel tool execution | 工具执行模式是 agent-core 内部策略；实例清单与执行语义看 [ref.agent.tool-execution-modes](tool-execution-modes.md) 和 [subsys.agent-core.tool-invocation](../subsystems/agent-core/tool-invocation.md)。[I] | [I] |
| Steering | Steering 是运行中向 agent 注入消息的队列语义；详见 [subsys.agent-core.message-queue](../subsystems/agent-core/message-queue.md)。[I] | [I] |
| Follow-up | Follow-up 是 agent 将停止时继续下一轮的排队语义；详见 [subsys.agent-core.message-queue](../subsystems/agent-core/message-queue.md)。[I] | [I] |
| AgentSession | `AgentSession` 是 `pi-coding-agent` 产品层会话 facade，把 core runtime、资源、设置、模型和工具组装成 CLI 会话；详见 [subsys.coding-agent.agent-session](../subsystems/coding-agent/agent-session.md)。[I] | [I] |

## 模型与 Provider

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Provider | README 把 `pi-ai` 定义为 multi-provider LLM API；provider 的源码形态、built-in 集合和注册细节看 [surface.providers.overview](../surface/providers/overview.md) 与 [subsys.ai.provider-registry](../subsystems/ai/provider-registry.md)。[I] | [E: README.md:30] |
| Models collection | `Models` 是 `pi-ai` 的模型/provider 集合导览名；lookup、auth resolution 和 stream 委派由 [spine.provider-stream](../spine/provider-stream.md) 与 [subsys.ai.model-discovery](../subsystems/ai/model-discovery.md) 覆盖。[I] | [I] |
| Built-in providers | README 只例举 OpenAI、Anthropic、Google 等 provider 语境；当前 built-in provider catalog 以 [ref.ai.provider-catalog](provider-catalog.md) 为准。[I] | [E: README.md:30] |
| API / wire API | wire API 是本 wiki 对 provider-specific request protocol 层的导览名；dispatch 与 protocol catalog 看 [subsys.ai.wire-protocol-dispatch](../subsystems/ai/wire-protocol-dispatch.md) 和 [ref.ai.wire-protocol-catalog](wire-protocol-catalog.md)。[I] | [I] |
| Transport | Transport 是 LLM stream 传输选择相关术语；agent-core 与 provider stream 的边界看 [subsys.agent-core.transport-proxy](../subsystems/agent-core/transport-proxy.md) 和 [spine.provider-stream](../spine/provider-stream.md)。[I] | [I] |
| ModelRegistry | `ModelRegistry` 是 `pi-coding-agent` 产品层模型 inventory 与 auth adapter；详见 [subsys.coding-agent.model-registry](../subsystems/coding-agent/model-registry.md)。[I] | [I] |
| Provider auth | provider credential resolution 由 `pi-ai` 和 `pi-coding-agent` 协作；导览见 [surface.providers.auth](../surface/providers/auth.md)、[subsys.ai.auth-resolution](../subsystems/ai/auth-resolution.md) 和 [subsys.coding-agent.auth-storage](../subsystems/coding-agent/auth-storage.md)。[I] | [I] |

## 工具、命令与资源

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| Built-in tools | README 公开说明 `pi-agent-core` 支持 tool calling；`pi-coding-agent` 的具体 built-in tool 清单由 [ref.tools-catalog](tools-catalog.md) 与 `surface.tools.*` 节点逐项覆盖。[I] | [E: README.md:31] |
| Active tools | Active tools 是 coding-agent 会话装配时启用的工具子集；详见 [subsys.coding-agent.agent-session](../subsystems/coding-agent/agent-session.md) 与 [subsys.coding-agent.tool-wrapper](../subsystems/coding-agent/tool-wrapper.md)。[I] | [I] |
| Extension | Extension 是 Pi self extensible coding agent 的扩展机制导览名；API 和生命周期看 [surface.extensions.api](../surface/extensions/api.md) 与 [spine.extension-lifecycle](../spine/extension-lifecycle.md)。[I] | [E: README.md:15] |
| Extension runtime | Extension runtime 是 coding-agent 装载、绑定和分发 extension 的执行层；详见 [subsys.coding-agent.extension-loader](../subsystems/coding-agent/extension-loader.md)、[subsys.coding-agent.extension-runner](../subsystems/coding-agent/extension-runner.md) 和 [subsys.coding-agent.extension-wrapper](../subsystems/coding-agent/extension-wrapper.md)。[I] | [I] |
| ResourceLoader | ResourceLoader 是 coding-agent 的资源发现入口，负责 extensions、skills、prompts、themes 和上下文文件等资源；详见 [subsys.coding-agent.resource-loader](../subsystems/coding-agent/resource-loader.md)。[I] | [I] |
| Skill | Skill 是 Pi 扩展/提示体系中的可发现能力包；用户级 surface 看 [surface.skills.system](../surface/skills/system.md)，agent-core 加载看 [subsys.agent-core.skills-loading](../subsystems/agent-core/skills-loading.md)。[I] | [I] |
| Skill prompt exposure | skill 如何进入 system prompt 属于 prompt assembly 细节；详见 [subsys.agent-core.system-prompt](../subsystems/agent-core/system-prompt.md) 与 [subsys.coding-agent.system-prompt](../subsystems/coding-agent/system-prompt.md)。[I] | [I] |
| Slash command | Slash command 是 coding-agent 交互入口之一；command surface 与逐项 catalog 看 [surface.commands.overview](../surface/commands/overview.md) 和 [ref.coding-agent.slash-commands](slash-commands.md)。[I] | [I] |
| Project context files | AGENTS/CLAUDE 等上下文文件如何被发现和拼接属于 resource/system-prompt 细节；项目级规则文件 `AGENTS.md` 自称 Development Rules。[I] | [E: AGENTS.md:1] |

## RPC、IPC 与 Orchestrator

| 术语 | 中文解释 | 源码锚点 |
|---|---|---|
| RPC mode | RPC mode 是 coding-agent 的 headless command/event surface；入口、stdin/stdout 约定和 prompt trace 看 [surface.modes.rpc](../surface/modes/rpc.md) 与 [spine.trace-rpc-prompt](../spine/trace-rpc-prompt.md)。[I] | [I] |
| RpcCommand | `RpcCommand` 是 RPC mode 的 command union 名称；逐项命令看 [ref.coding-agent.rpc-methods](rpc-methods.md)。[I] | [I] |
| JSONL framing | JSONL framing 是 RPC/IPC 的行分隔消息边界术语；coding-agent RPC 协议看 [surface.modes.rpc-protocol](../surface/modes/rpc-protocol.md)。[I] | [I] |
| RPC dispatch | RPC dispatch 是 headless command 到 session action 的分派逻辑；详见 [surface.modes.rpc](../surface/modes/rpc.md) 和 [spine.trace-rpc-prompt](../spine/trace-rpc-prompt.md)。[I] | [I] |
| IPC | IPC 在 orchestrator 语境中指本地 client/server 通道；transport 与 protocol 分别看 [subsys.orchestrator.ipc-transport](../subsystems/orchestrator/ipc-transport.md) 和 [subsys.orchestrator.message-protocol](../subsystems/orchestrator/message-protocol.md)。[I] | [I] |
| Unix socket path | Unix socket path 是 orchestrator IPC 监听地址相关术语；配置来源看 [subsys.orchestrator.config](../subsystems/orchestrator/config.md)，传输实现看 [subsys.orchestrator.ipc-transport](../subsystems/orchestrator/ipc-transport.md)。[I] | [I] |
| OrchestratorRequest | OrchestratorRequest 是 orchestrator IPC request union 名称；逐项消息看 [ref.orchestrator.ipc-messages](ipc-messages.md) 与 [subsys.orchestrator.message-protocol](../subsystems/orchestrator/message-protocol.md)。[I] | [I] |
| OrchestratorSupervisor | OrchestratorSupervisor 是 orchestrator 的 live instance 管理对象；详见 [subsys.orchestrator.supervisor](../subsystems/orchestrator/supervisor.md)。[I] | [I] |
| RPC stream bridge | RPC stream bridge 指 orchestrator 把 client IPC stream 接到 coding-agent RPC 子进程的桥接路径；详见 [subsys.orchestrator.request-handler](../subsystems/orchestrator/request-handler.md) 与 [subsys.orchestrator.rpc-spawner](../subsystems/orchestrator/rpc-spawner.md)。[I] | [I] |
| Radius | Radius 是 orchestrator 的远端 presence/registration 集成导览名；详见 [subsys.orchestrator.radius](../subsystems/orchestrator/radius.md)。[I] | [I] |
| Orchestrator serve lifecycle | serve lifecycle 指 orchestrator server 启动、恢复实例、处理 shutdown 的过程；详见 [subsys.orchestrator.request-handler](../subsystems/orchestrator/request-handler.md)。[I] | [I] |

## 证据边界与跨包入口

- `ref.glossary` 的 source 只包括 `README.md` 与 `AGENTS.md`；本页 `[E]` 只用于这两个文件能直接证明的项目定位、公开包说明、permission/containerization 和 Development Rules 语境。
- README 明确说明 Pi 默认没有内置 permission system；需要更强边界时应 containerize 或 sandbox Pi，并列出 Gondolin extension、Plain Docker、OpenShell 三种方向。[E: README.md:39] [E: README.md:41] [E: README.md:43] [E: README.md:44] [E: README.md:45]
- README 的 Development 段列出 `npm install --ignore-scripts`、`npm run build`、`npm run check`、`./test.sh`、`./pi-test.sh` 等开发入口；更细的测试/命令策略由 `AGENTS.md` 的 Development Rules 约束。[E: README.md:51] [E: README.md:54] [E: README.md:55] [E: README.md:56] [E: README.md:57] [E: README.md:58] [E: AGENTS.md:1]
- package-internal、RPC/IPC、provider/model、orchestrator/RPC bridge 等术语在本页标 `[I]`，其源码证明责任属于链接到的 `spine.*`、`surface.*`、`subsys.*` 或 `ref.*` 节点。
- README 的 All Packages 表只直接列出 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 四个公开包；`pi-orchestrator` 的存在和 experimental/stability 口径不在本 glossary 节点用 README/AGENTS 直证。[E: README.md:26] [E: README.md:30] [E: README.md:31] [E: README.md:32] [E: README.md:33] [I]

## Sources

- README.md
- AGENTS.md

## 相关

- [spine.overview](../spine/overview.md) - Pi 从 CLI 产品入口到 reusable agent harness、provider streaming 的跨包主路径。
