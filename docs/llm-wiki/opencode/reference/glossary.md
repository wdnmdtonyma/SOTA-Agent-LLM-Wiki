---
id: ref.glossary
title: Glossary
kind: reference
tier: T3
v: shared
source:
  - CONTEXT.md
  - AGENTS.md
symbols:
  - System Context
  - Context Epoch
  - SessionRunner
  - EventV2
related:
  - spine.overview
evidence: explicit
status: verified
updated: 92c70c9c3
---

> opencode glossary 把 V1 当前活跑路径、V2 新内核、shared package 和容易误读的 codename 分开定义，避免把迁移期同名概念混讲。

## 能回答的问题

- `SessionPrompt`、`SessionProcessor`、`SessionRunner` 分别属于哪一代？
- `Context Epoch`、`Baseline System Context`、`Context Snapshot` 在 V2 中是什么意思？
- `message-v2.ts`、`connector.ts`、`packages/cli`、`EventV2Bridge` 等名字为什么容易误导？

## V1

| Term | 定义 |
| --- | --- |
| V1 current runtime | 当前活跑路径主要在 `packages/opencode/src`。`SessionPrompt.run` 定义 `runLoop`，循环中读取 V1/V2 shadow message stream 并继续 provider/tool turn [E: packages/opencode/src/session/prompt.ts:1134] [E: packages/opencode/src/session/prompt.ts:1149]。 |
| `SessionPrompt.loop(...)` | V1 对外 loop 入口，使用 `state.ensureRunning(..., runLoop(sessionID))` 保证同一 session 的 loop 运行被协调 [E: packages/opencode/src/session/prompt.ts:1392] [E: packages/opencode/src/session/prompt.ts:1395]。 |
| `SessionProcessor` | V1 stream event processor。`SessionProcessor.process` 在开始处理前把 session status 设为 busy，并调用 `llm.stream(streamInput)` 消费 LLM stream [E: packages/opencode/src/session/processor.ts:960] [E: packages/opencode/src/session/processor.ts:979]。 |
| Vercel AI SDK path | V1 `LLM` seam 中仍包含 AI SDK 兼容路径；native LLM adapter 是 `experimentalNativeLlm` 打开时的 opt-in branch，未选中 native 时会返回 `type: "ai-sdk"` 并调用 `streamText(...)` [E: packages/opencode/src/session/llm.ts:226] [E: packages/opencode/src/session/llm.ts:243] [E: packages/opencode/src/session/llm.ts:271] [E: packages/opencode/src/session/llm.ts:279] [E: packages/opencode/src/session/llm.ts:280]。 |
| `packages/opencode/src/session/message-v2.ts` | 名字带 `v2`，但该文件导入 `ai` 的 `convertToModelMessages`/`UIMessage`，同时桥接 `SessionV1` 和 `EventV2`，因此它是 V1 与 AI-SDK/V2 event shadow 的消息转换层，不是 V2 core runner [E: packages/opencode/src/session/message-v2.ts:1] [E: packages/opencode/src/session/message-v2.ts:23]。 |
| `GlobalBus` | V1 side 的 global event emitter 位于 `packages/opencode/src/bus/global.ts`，只定义 `event` channel，并给缺少 id 的 payload 补事件 id [E: packages/opencode/src/bus/global.ts:11] [E: packages/opencode/src/bus/global.ts:22]。 |
| `EventV2Bridge` | V1 opencode publish boundary，把 core EventV2 注入 instance/workspace location，并把 EventV2 payload/sync payload emit 到 `GlobalBus` [E: packages/opencode/src/event-v2-bridge.ts:22] [E: packages/opencode/src/event-v2-bridge.ts:30] [E: packages/opencode/src/event-v2-bridge.ts:42] [E: packages/opencode/src/event-v2-bridge.ts:46] [E: packages/opencode/src/event-v2-bridge.ts:52] [E: packages/opencode/src/event-v2-bridge.ts:60] [E: packages/opencode/src/event-v2-bridge.ts:63]。 |
| V1 HTTP server | V1 server 的 public API 是 Effect HttpApi：`OpenCodeHttpApi` 由 `RootHttpApi`、`EventApi`、`InstanceHttpApi`、server `Api` 和 `PtyConnectApi` 合成 [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:69] [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:75]。`packages/opencode/src/server/server.ts` 用 Effect `HttpRouter.serve(HttpApiApp.createRoutes(...))` 建 listener layer [E: packages/opencode/src/server/server.ts:100] [E: packages/opencode/src/server/server.ts:101] [E: packages/opencode/src/server/server.ts:107]。 |

## V2

| Term | 定义 |
| --- | --- |
| V2 core | V2 core 是 Effect-native facade，明确把 prompt recording 和 execution 分离 [E: specs/v2/session.md:3] [E: specs/v2/session.md:5]。`packages/core/src/public/opencode.ts` 定义 public `Service`，并在 layer 中暴露 `tools.register` 与 `sessions.*` facade [E: packages/core/src/public/opencode.ts:24] [E: packages/core/src/public/opencode.ts:83] [E: packages/core/src/public/opencode.ts:90] [E: packages/core/src/public/opencode.ts:91]。 |
| `session_input` | Durable admission inbox；admitted inputs 在 runner 发布 `PromptLifecycle.Promoted` 前不进入 model-visible Session history [E: specs/v2/session.md:30]。 |
| `SessionExecution` | V2 process-global execution coordinator；routing 从 Session ID 经 `SessionStore.get(sessionID)` 到 `LocationServiceMap.get(session.location)`，再到 `SessionRunner.run(...)` [E: specs/v2/session.md:32] [E: specs/v2/session.md:39]。 |
| `SessionRunner` | V2 Location-scoped runner；catalog、model resolver、tool registry、permission state 和 filesystem 都按 Location cache [E: specs/v2/session.md:41]。AGENTS.md 要求不要 bridge through legacy `SessionPrompt.loop(...)`，并保持每个 provider turn 一个显式 `llm.stream(request)` [E: AGENTS.md:153] [E: AGENTS.md:154]。 |
| V2 `llm.stream` | `packages/core/src/session/runner/llm.ts` 在 provider turn 中调用 `llm.stream(request)`，随后在同一 runner 流程里处理 tool-call settlement 和 continuation 判断 [E: packages/core/src/session/runner/llm.ts:245] [E: packages/core/src/session/runner/llm.ts:256] [E: packages/core/src/session/runner/llm.ts:261] [E: packages/core/src/session/runner/llm.ts:336]。 |
| `Context Epoch` | 一个 effective agent 的初始 `System Context` 保持不可变的 span，到 compaction 或其他 baseline replacement 结束 [E: CONTEXT.md:27]。V2 spec 进一步说 Context Epoch 拥有一个 effective agent、一个 immutable baseline 和一个 model-hidden structured snapshot [E: specs/v2/session.md:47] [E: specs/v2/session.md:49]。 |
| `Baseline System Context` | Context Epoch 开始时渲染出的完整 System Context [E: CONTEXT.md:30]。Baseline 会在 epoch 内 durably preserved 并跨进程重启复用 [E: CONTEXT.md:94] [E: CONTEXT.md:97]。 |
| `Context Snapshot` | Model-hidden JSON state，用于比较每个 Context Source 与上次已 admission 的值 [E: CONTEXT.md:34]。Snapshot 会与 durable Mid-Conversation System Message 原子推进 [E: CONTEXT.md:62]。 |
| `System Context Registry` | Location-scoped ordered/scoped producer registry，贡献当前 System Context [E: CONTEXT.md:20]。 |
| `Safe Provider-Turn Boundary` | provider call 前、durable input promotion 和必要 tool settlement 之后，context changes 可以被 chronological admission 的点 [E: CONTEXT.md:40]。 |
| `Managed Tool Output File` | 过大的 Core tool output 完整内容会进入 shared tool-output directory 的临时文件；Session history 保留 bounded projection [E: CONTEXT.md:46] [E: CONTEXT.md:105]。 |
| `EventV2` | Core event system。`EventV2.define` 注册 event definition，payload 可带 durable `seq`、`version`、`location` 和 metadata [E: packages/core/src/event.ts:40] [E: packages/core/src/event.ts:45] [E: packages/core/src/event.ts:46] [E: packages/core/src/event.ts:47] [E: packages/core/src/event.ts:48] [E: packages/core/src/event.ts:96]。同步 event 会登记到 `syncRegistry` 的 versioned type 下 [E: packages/core/src/event.ts:123] [E: packages/core/src/event.ts:125]。 |
| `session.next.*` | V2 synchronized session event family；durable replay 使用 aggregate sequence cursor，live-only text/reasoning/tool-input fragments 只通过 EventV2 subscriptions 给 connected renderer [E: specs/v2/session.md:169] [E: specs/v2/session.md:171]。 |
| `Connector` | `packages/core/src/connector.ts` 是 `@opencode/v2/Connector` service，管理 connector registry、key/OAuth connect、attempt status 和 credential creation [E: packages/core/src/connector.ts:180] [E: packages/core/src/connector.ts:191] [E: packages/core/src/connector.ts:205] [E: packages/core/src/connector.ts:232] [E: packages/core/src/connector.ts:332]。它不是云连接器客户端；`connect.key` 会把用户输入 secret 转成 credential 存储，OAuth begin/status/complete/cancel 管理本地 attempt lifecycle [E: packages/core/src/connector.ts:191] [E: packages/core/src/connector.ts:199] [E: packages/core/src/connector.ts:205] [E: packages/core/src/connector.ts:218] [E: packages/core/src/connector.ts:220] [E: packages/core/src/connector.ts:227]。 |
| V2 HTTP server | `packages/server/src/api.ts` 使用 `HttpApi.make("server")` 组装 Health、Location、Session、Connector、Permission 等 group，并附加 Authorization/SchemaError middleware [E: packages/server/src/api.ts:20] [E: packages/server/src/api.ts:44]。这也是 Effect HttpApi，不是 Hono [I]。 |

## Shared / NA

| Term | 定义 |
| --- | --- |
| `packages/llm` | Shared native provider/protocol engine，package exports 包括 provider、providers、protocols 和 route surfaces [E: packages/llm/package.json:13]。V1 通过 experimental native seam 可选接入，V2 runner 直接从 `@opencode-ai/llm` 导入 `LLM`、`LLMClient`、`LLMEvent` 等 [E: packages/core/src/session/runner/llm.ts:1] [E: packages/core/src/session/runner/llm.ts:9]。 |
| `packages/tui` | Canonical OpenTUI/Solid terminal UI package；TUI package spec 要把 canonical TUI 从旧 `packages/opencode/src/cli/cmd/tui` 移到 `packages/tui`，同时 legacy CLI 和 new CLI 共用同一 implementation [E: specs/tui-package.md:3] [E: specs/tui-package.md:14]。 |
| `packages/cli` / `lildax` | 新 CLI host package，package 名 `@opencode-ai/cli`，bin 名 `lildax` [E: packages/cli/package.json:3] [E: packages/cli/package.json:7]。它与 V1 `packages/opencode` bin `opencode` 并存 [E: packages/opencode/package.json:18]。 |
| `OpenTUI` | TUI plugin API re-export `@opentui/core`、`@opentui/keymap` 和 `@opentui/solid` 类型，说明 plugin UI surface 是 terminal renderer/Solid 组件 surface [E: packages/plugin/src/tui.ts:31] [E: packages/plugin/src/tui.ts:44]。 |
| `Location` | V2 placement/cache identity；SessionExecution 只有在 drain starts 时通过 `LocationServiceMap.get(session.location)` 进入 Session 当前 Location，Location runner 会 fence new provider turn 防止 moved Session 继续用 source-Location tools/context [E: specs/v2/session.md:163]。 |
| `Instance` | V1 per-directory runtime context。V1 effect command wrapper 会在 command 需要 instance 时 load `InstanceStore`，提供 `InstanceRef`，并在结束时 dispose context [E: packages/opencode/src/cli/effect-cmd.ts:79] [E: packages/opencode/src/cli/effect-cmd.ts:91]。 |
| `Project` | Project spec 目标是单个 OpenCode instance 能为多个 project/worktree 运行 sessions [E: specs/project.md:3]；API sketch 以 `/project`、`/project/init`、`/project/:projectID/workspace` 等 endpoint 表达 project/workspace 资源 [E: specs/project.md:8] [E: specs/project.md:64]。 |
| `ShareNext` | V1 import command 使用 `ShareNext` 服务获取 share request metadata，并对返回的 `ShareData[]` 执行 `transformShareData(...)`，把 flat `session`/`message`/`part` items 重组成 `{ info, messages: [{ info, parts }] }` 本地结构 [E: packages/opencode/src/cli/cmd/import.ts:20] [E: packages/opencode/src/cli/cmd/import.ts:21] [E: packages/opencode/src/cli/cmd/import.ts:22] [E: packages/opencode/src/cli/cmd/import.ts:23] [E: packages/opencode/src/cli/cmd/import.ts:49] [E: packages/opencode/src/cli/cmd/import.ts:59] [E: packages/opencode/src/cli/cmd/import.ts:72] [E: packages/opencode/src/cli/cmd/import.ts:74] [E: packages/opencode/src/cli/cmd/import.ts:76] [E: packages/opencode/src/cli/cmd/import.ts:100] [E: packages/opencode/src/cli/cmd/import.ts:130] [E: packages/opencode/src/cli/cmd/import.ts:143]。 |

## Sources

- `CONTEXT.md`
- `AGENTS.md`
- `specs/v2/session.md`
- `specs/project.md`
- `specs/tui-package.md`
- `packages/opencode/src/session/prompt.ts`
- `packages/opencode/src/session/processor.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/core/src/session/runner/llm.ts`
- `packages/core/src/public/opencode.ts`
- `packages/core/src/event.ts`
- `packages/core/src/connector.ts`
- `packages/server/src/api.ts`
- `packages/opencode/src/server/routes/instance/httpapi/api.ts`
- `packages/opencode/src/event-v2-bridge.ts`
- `packages/opencode/src/bus/global.ts`

## 相关

- `spine.overview`
