---
id: subsys.app-server.message-processor
title: Message processor
kind: subsystem
tier: T2
source:
  - codex-rs/app-server/src/codex_message_processor.rs
symbols:
  - CodexMessageProcessor
  - CodexMessageProcessor::process_request
  - CodexMessageProcessor::thread_start
  - CodexMessageProcessor::turn_start
  - ensure_conversation_listener_task
related:
  - subsys.app-server.session-management
  - subsys.app-server.transport
  - subsys.app-server.client-libs
  - tool.dynamic-tools
evidence: explicit
status: verified
updated: 37aadeaa13
---

`CodexMessageProcessor` 是 app-server 的 Codex-domain request dispatcher；源码注释把它描述为处理 Codex threads 和 legacy conversation APIs 的 JSON-RPC messages，`process_request` 对 `ClientRequest` 做 match 分派。它持有 `ThreadManager`、`OutgoingMessageSender`、thread store、config manager、active login、pending thread unloads、thread state manager、thread watch manager、command exec manager、fuzzy search state 和 background task tracker [E: codex-rs/app-server/src/codex_message_processor.rs:472][E: codex-rs/app-server/src/codex_message_processor.rs:475][E: codex-rs/app-server/src/codex_message_processor.rs:476][E: codex-rs/app-server/src/codex_message_processor.rs:480][E: codex-rs/app-server/src/codex_message_processor.rs:481][E: codex-rs/app-server/src/codex_message_processor.rs:482][E: codex-rs/app-server/src/codex_message_processor.rs:483][E: codex-rs/app-server/src/codex_message_processor.rs:484][E: codex-rs/app-server/src/codex_message_processor.rs:485][E: codex-rs/app-server/src/codex_message_processor.rs:486][E: codex-rs/app-server/src/codex_message_processor.rs:487][E: codex-rs/app-server/src/codex_message_processor.rs:488][E: codex-rs/app-server/src/codex_message_processor.rs:489][E: codex-rs/app-server/src/codex_message_processor.rs:861][E: codex-rs/app-server/src/codex_message_processor.rs:866]。

## 能回答的问题

- app-server v2 `thread/start`, `thread/resume`, `thread/fork`, `turn/start` 如何映射到 core `ThreadManager` 和 `CodexThread`。
- 哪些 `ClientRequest` 由 outer `MessageProcessor` 处理，哪些落到 `CodexMessageProcessor`。
- dynamic tools 在 `thread/start` 时如何校验并转成 core dynamic tool spec。
- listener task 如何把 core `EventMsg` 翻译为 app-server notifications。

## 职责边界

- `CodexMessageProcessor::process_request` 不处理 `Initialize`，源码里 `ClientRequest::Initialize` 会 panic，说明 initialize 必须由 outer `MessageProcessor` 处理 [E: codex-rs/app-server/src/codex_message_processor.rs:862][E: codex-rs/app-server/src/codex_message_processor.rs:863]。
- config、filesystem、device-key、external agent config 等请求应由 outer `MessageProcessor` 处理；如果这些请求落到 `CodexMessageProcessor`，这里只 warn [E: codex-rs/app-server/src/codex_message_processor.rs:1152][E: codex-rs/app-server/src/codex_message_processor.rs:1158][E: codex-rs/app-server/src/codex_message_processor.rs:1169][E: codex-rs/app-server/src/codex_message_processor.rs:1176][I]。
- Codex-domain 请求如 `ThreadStart`、`ThreadResume`、`ThreadFork`、`TurnStart`、`TurnSteer`、`TurnInterrupt` 在 `process_request` 中分派到同名 handler [E: codex-rs/app-server/src/codex_message_processor.rs:866][E: codex-rs/app-server/src/codex_message_processor.rs:867][E: codex-rs/app-server/src/codex_message_processor.rs:880][E: codex-rs/app-server/src/codex_message_processor.rs:881][E: codex-rs/app-server/src/codex_message_processor.rs:884][E: codex-rs/app-server/src/codex_message_processor.rs:885][E: codex-rs/app-server/src/codex_message_processor.rs:991][E: codex-rs/app-server/src/codex_message_processor.rs:992][E: codex-rs/app-server/src/codex_message_processor.rs:1004][E: codex-rs/app-server/src/codex_message_processor.rs:1005][E: codex-rs/app-server/src/codex_message_processor.rs:1008][E: codex-rs/app-server/src/codex_message_processor.rs:1009]。
- `CodexMessageProcessor` 不直接暴露 socket/stdout 写入；它通过 `OutgoingMessageSender` 字段和 sender API 发送 response、error 与 notification [E: codex-rs/app-server/src/codex_message_processor.rs:476][E: codex-rs/app-server/src/codex_message_processor.rs:2478][E: codex-rs/app-server/src/codex_message_processor.rs:2724][E: codex-rs/app-server/src/codex_message_processor.rs:2736][I]。

## 关键 crate/文件

- `codex-rs/app-server/src/codex_message_processor.rs`: Codex-domain dispatcher、thread/turn lifecycle、auth/MCP/plugin APIs。
- `codex-rs/app-server/src/message_processor.rs`: outer typed JSON-RPC dispatch and initialize/config/fs/device-key handling。
- `codex-rs/app-server/src/thread_state.rs`: per-thread listener state and subscription bookkeeping。
- `codex-rs/app-server/src/thread_status.rs`: loaded/running/waiting status derivation。
- `codex-rs/core/src/thread_manager.rs`: core thread creation/resume/fork backend。

## 数据模型

- `ApiVersion` 当前默认 `V2`，listener attach、hook prompt emission 和 bespoke event handling 调用都携带 api version 参数 [E: codex-rs/app-server/src/codex_message_processor.rs:494][E: codex-rs/app-server/src/codex_message_processor.rs:498][E: codex-rs/app-server/src/codex_message_processor.rs:499][E: codex-rs/app-server/src/codex_message_processor.rs:2660][E: codex-rs/app-server/src/codex_message_processor.rs:7780][E: codex-rs/app-server/src/codex_message_processor.rs:7801]。
- `ListenerTaskContext` 打包 thread manager、thread state manager、outgoing sender、pending unload set、analytics、thread watch manager、fallback model provider 和 codex home，作为 listener task 的 captured runtime context [E: codex-rs/app-server/src/codex_message_processor.rs:503][E: codex-rs/app-server/src/codex_message_processor.rs:504][E: codex-rs/app-server/src/codex_message_processor.rs:505][E: codex-rs/app-server/src/codex_message_processor.rs:506][E: codex-rs/app-server/src/codex_message_processor.rs:507][E: codex-rs/app-server/src/codex_message_processor.rs:508][E: codex-rs/app-server/src/codex_message_processor.rs:509][E: codex-rs/app-server/src/codex_message_processor.rs:510][E: codex-rs/app-server/src/codex_message_processor.rs:511][E: codex-rs/app-server/src/codex_message_processor.rs:512]。
- thread store 由 config 决定：有 `experimental_thread_store_endpoint` 时使用 `RemoteThreadStore`，否则使用 `LocalThreadStore` [E: codex-rs/app-server/src/codex_message_processor.rs:646][E: codex-rs/app-server/src/codex_message_processor.rs:648][E: codex-rs/app-server/src/codex_message_processor.rs:649]。
- `UnloadingState` 同时观察 “has subscribers” 和 `ThreadStatus::Active`，用于延迟卸载没有订阅且 inactive 的 thread [E: codex-rs/app-server/src/codex_message_processor.rs:528][E: codex-rs/app-server/src/codex_message_processor.rs:530][E: codex-rs/app-server/src/codex_message_processor.rs:532][E: codex-rs/app-server/src/codex_message_processor.rs:552][E: codex-rs/app-server/src/codex_message_processor.rs:564][E: codex-rs/app-server/src/codex_message_processor.rs:566][E: codex-rs/app-server/src/codex_message_processor.rs:567]。

## 控制流

1. `thread_start` 解构 `ThreadStartParams`，把 model/provider/service tier/cwd/approval/sandbox/instructions/personality 等转成 config overrides，并把 dynamic tools、session start source、persist flag 传给 background task [E: codex-rs/app-server/src/codex_message_processor.rs:2333][E: codex-rs/app-server/src/codex_message_processor.rs:2353][E: codex-rs/app-server/src/codex_message_processor.rs:2379][E: codex-rs/app-server/src/codex_message_processor.rs:2388][E: codex-rs/app-server/src/codex_message_processor.rs:2389][E: codex-rs/app-server/src/codex_message_processor.rs:2390][E: codex-rs/app-server/src/codex_message_processor.rs:2758][E: codex-rs/app-server/src/codex_message_processor.rs:2771][E: codex-rs/app-server/src/codex_message_processor.rs:2785]。
2. `thread_start_task` 加载 config，必要时把请求的 sandbox trust 写入 project trust，再加载 instruction sources [E: codex-rs/app-server/src/codex_message_processor.rs:2470][E: codex-rs/app-server/src/codex_message_processor.rs:2498][E: codex-rs/app-server/src/codex_message_processor.rs:2514][E: codex-rs/app-server/src/codex_message_processor.rs:2567]。
3. dynamic tools 非空时先 `validate_dynamic_tools`，再映射到 `CoreDynamicToolSpec` [E: codex-rs/app-server/src/codex_message_processor.rs:2568][E: codex-rs/app-server/src/codex_message_processor.rs:2569][E: codex-rs/app-server/src/codex_message_processor.rs:2572][E: codex-rs/app-server/src/codex_message_processor.rs:2586][E: codex-rs/app-server/src/codex_message_processor.rs:2593]。
4. `thread_start_task` 调用 `ThreadManager::start_thread_with_tools_and_service_name` 创建 core thread，随后设置 app-server client info、取 config snapshot、构造 protocol `Thread`，并 auto-attach listener [E: codex-rs/app-server/src/codex_message_processor.rs:2599][E: codex-rs/app-server/src/codex_message_processor.rs:2627][E: codex-rs/app-server/src/codex_message_processor.rs:2640][E: codex-rs/app-server/src/codex_message_processor.rs:2647][E: codex-rs/app-server/src/codex_message_processor.rs:2653][E: codex-rs/app-server/src/codex_message_processor.rs:2655]。
5. start 成功后，processor upsert thread watch、计算 status、发送 `ThreadStartResponse`，再 broadcast `ThreadStarted` notification [E: codex-rs/app-server/src/codex_message_processor.rs:2673][E: codex-rs/app-server/src/codex_message_processor.rs:2675][E: codex-rs/app-server/src/codex_message_processor.rs:2682][E: codex-rs/app-server/src/codex_message_processor.rs:2699][E: codex-rs/app-server/src/codex_message_processor.rs:2726][E: codex-rs/app-server/src/codex_message_processor.rs:2733][E: codex-rs/app-server/src/codex_message_processor.rs:2736]。
6. `turn_start` 校验 input size，load thread，设置 client info，映射 collaboration mode/environments/input items，必要时提交 `Op::OverrideTurnContext`，最后提交 `Op::UserInput` 并返回 in-progress `Turn` [E: codex-rs/app-server/src/codex_message_processor.rs:6684][E: codex-rs/app-server/src/codex_message_processor.rs:6693][E: codex-rs/app-server/src/codex_message_processor.rs:6701][E: codex-rs/app-server/src/codex_message_processor.rs:6716][E: codex-rs/app-server/src/codex_message_processor.rs:6719][E: codex-rs/app-server/src/codex_message_processor.rs:6730][E: codex-rs/app-server/src/codex_message_processor.rs:6748][E: codex-rs/app-server/src/codex_message_processor.rs:6777][E: codex-rs/app-server/src/codex_message_processor.rs:6795]。
7. listener task 在 `conversation.next_event()` 分支先更新 `ThreadState` 的 current turn history/raw event opt-in，再构造 `ThreadScopedOutgoingMessageSender` 并调用 bespoke event translation [E: codex-rs/app-server/src/codex_message_processor.rs:7763][E: codex-rs/app-server/src/codex_message_processor.rs:7764][E: codex-rs/app-server/src/codex_message_processor.rs:7765][E: codex-rs/app-server/src/codex_message_processor.rs:7770][E: codex-rs/app-server/src/codex_message_processor.rs:7790]。

## 设计动机与权衡

- `thread_start` spawn background task，而不是阻塞 outer processor loop [I]；源码将 task 放入 `background_tasks`，shutdown 时最多等 10 秒 drain background tasks [E: codex-rs/app-server/src/codex_message_processor.rs:2397][E: codex-rs/app-server/src/codex_message_processor.rs:2398][E: codex-rs/app-server/src/codex_message_processor.rs:2401][E: codex-rs/app-server/src/codex_message_processor.rs:2403]。
- trust auto-persist 的注释说明：即使命令行请求 WorkspaceWrite/DangerFullAccess 后 config 被降级为 ReadOnly，也仍应把 requested cwd 视为 trusted [E: codex-rs/app-server/src/codex_message_processor.rs:2485][E: codex-rs/app-server/src/codex_message_processor.rs:2489]。
- listener 在 raw response item 且 raw events 未启用时只发 hook prompt completed，然后 continue；这意味着未 opt-in client 不会继续进入通用 raw event translation [E: codex-rs/app-server/src/codex_message_processor.rs:7776][E: codex-rs/app-server/src/codex_message_processor.rs:7777][E: codex-rs/app-server/src/codex_message_processor.rs:7779][E: codex-rs/app-server/src/codex_message_processor.rs:7787][I]。

## gotcha

- `CodexMessageProcessor` 中对 config/fs/device-key request 的 warn 表示路由 bug，而不是 fallback handler；outer `MessageProcessor` 才是这些 API 的 owner [E: codex-rs/app-server/src/codex_message_processor.rs:1152][E: codex-rs/app-server/src/codex_message_processor.rs:1158][E: codex-rs/app-server/src/codex_message_processor.rs:1169][I]。
- running thread resume 会把 request 作为 `ThreadListenerCommand::SendThreadResumeResponse` 排进 listener command channel；这让 resume response 排在 listener 所管理的 active turn 状态路径上 [E: codex-rs/app-server/src/codex_message_processor.rs:4662][E: codex-rs/app-server/src/codex_message_processor.rs:4671][I]。
- `turn_start` 对 `OverrideTurnContext` 的提交结果没有中断后续 `UserInput` 提交；源码把返回值赋给 `_` 后继续 [E: codex-rs/app-server/src/codex_message_processor.rs:6749][E: codex-rs/app-server/src/codex_message_processor.rs:6769][E: codex-rs/app-server/src/codex_message_processor.rs:6772][E: codex-rs/app-server/src/codex_message_processor.rs:6777]。

## Sources

- `codex-rs/app-server/src/codex_message_processor.rs`

## 相关

- `subsys.app-server.session-management`
- `subsys.app-server.transport`
- `subsys.app-server.client-libs`
- `tool.dynamic-tools`
