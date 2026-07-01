---
id: ref.glossary
title: Glossary
kind: reference
tier: T3
v: shared
source:
  - CONTEXT.md
  - AGENTS.md
  - packages/core/src/session.ts
  - packages/core/src/integration.ts
  - packages/core/src/credential.ts
  - packages/protocol/src/api.ts
symbols:
  - System Context
  - Context Epoch
  - SessionRunner
  - EventV2
  - Integration
  - Credential
related:
  - spine.overview
  - integrations.integration-v2
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> opencode glossary 把 V1 当前活跑路径、V2 新内核、shared package 和容易误读的 codename 分开定义，避免把迁移期同名概念混讲。

## 能回答的问题

- `SessionPrompt`、`SessionProcessor`、`SessionRunner` 分别属于哪一代？
- `Context Epoch`、`Baseline System Context`、`Context Snapshot` 在 V2 中是什么意思？
- `message-v2.ts`、`integration.ts`、`packages/cli`、`EventV2Bridge` 等名字为什么容易误导？

## V1

| Term | 定义 |
| --- | --- |
| V1 current runtime | 当前活跑路径主要在 `packages/opencode/src`。`SessionPrompt.run` 定义 `runLoop`，循环中读取 V1 message stream、降到 model messages，并继续 provider/tool turn [E: packages/opencode/src/session/prompt.ts:1081] [E: packages/opencode/src/session/prompt.ts:1092] [E: packages/opencode/src/session/prompt.ts:1261] [E: packages/opencode/src/session/prompt.ts:1271]。 |
| `SessionPrompt.loop(...)` | V1 对外 loop 入口，使用 `state.ensureRunning(..., runLoop(sessionID))` 保证同一 session 的 loop 运行被协调 [E: packages/opencode/src/session/prompt.ts:1342] [E: packages/opencode/src/session/prompt.ts:1345]。 |
| `SessionProcessor` | V1 stream event processor。`SessionProcessor.process` 在开始处理前把 session status 设为 busy，并调用 `llm.stream(streamInput)` 消费 LLM stream [E: packages/opencode/src/session/processor.ts:625] [E: packages/opencode/src/session/processor.ts:637] [E: packages/opencode/src/session/processor.ts:638]。 |
| Vercel AI SDK path | V1 `LLM` seam 中仍包含 AI SDK 兼容路径；native LLM adapter 是 `experimentalNativeLlm` 打开时的 opt-in branch，未选中 native 时会返回 `type: "ai-sdk"` 并调用 `streamText(...)` [E: packages/opencode/src/session/llm.ts:226] [E: packages/opencode/src/session/llm.ts:243] [E: packages/opencode/src/session/llm.ts:271] [E: packages/opencode/src/session/llm.ts:279] [E: packages/opencode/src/session/llm.ts:280]。 |
| `packages/opencode/src/session/message-v2.ts` | 名字带 `v2`，但该文件导入 `ai` 的 `convertToModelMessages`/`UIMessage`，同时导入 `SessionV1` 和 core session SQL tables，因此它是 V1 与 AI-SDK/current session projection 的消息转换层，不是 V2 core runner [E: packages/opencode/src/session/message-v2.ts:2] [E: packages/opencode/src/session/message-v2.ts:20] [E: packages/opencode/src/session/message-v2.ts:30] [E: packages/opencode/src/session/message-v2.ts:131] [E: packages/opencode/src/session/message-v2.ts:407] [E: packages/opencode/src/session/message-v2.ts:417]。 |
| `GlobalBus` | V1 side 的 global event emitter 位于 `packages/opencode/src/bus/global.ts`，只定义 `event` channel，并给缺少 id 的 payload 补事件 id [E: packages/opencode/src/bus/global.ts:12] [E: packages/opencode/src/bus/global.ts:15] [E: packages/opencode/src/bus/global.ts:16] [E: packages/opencode/src/bus/global.ts:22]。 |
| `EventV2Bridge` | V1 opencode publish boundary，把 core EventV2 注入 instance/workspace location，并把 EventV2 payload/sync payload emit 到 `GlobalBus` [E: packages/opencode/src/event-v2-bridge.ts:22] [E: packages/opencode/src/event-v2-bridge.ts:30] [E: packages/opencode/src/event-v2-bridge.ts:39] [E: packages/opencode/src/event-v2-bridge.ts:46] [E: packages/opencode/src/event-v2-bridge.ts:52] [E: packages/opencode/src/event-v2-bridge.ts:55]。 |
| V1 HTTP server | V1 server 的 public API 是 Effect HttpApi：`OpenCodeHttpApi` 由 `RootHttpApi`、`EventApi`、`InstanceHttpApi`、`ServerApi` 和 `PtyConnectApi` 合成 [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:79] [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:80] [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:81] [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:82] [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:83] [E: packages/opencode/src/server/routes/instance/httpapi/api.ts:84]。`packages/opencode/src/server/server.ts` 用 Effect `HttpRouter.serve(HttpApiApp.createRoutes(...))` 建 listener layer [E: packages/opencode/src/server/server.ts:100] [E: packages/opencode/src/server/server.ts:101] [E: packages/opencode/src/server/server.ts:106]。 |

## V2

| Term | 定义 |
| --- | --- |
| V2 core | V2 core 是 Effect-native session/service slice，明确把 prompt recording 和 execution 分离 [E: specs/v2/session.md:3] [E: specs/v2/session.md:5]。`packages/core/src/session.ts` 暴露 `@opencode/v2/Session` service，接口包含 `create`、`prompt`、`resume`、`interrupt` 等 session facade 方法 [E: packages/core/src/session.ts:113] [E: packages/core/src/session.ts:115] [E: packages/core/src/session.ts:147] [E: packages/core/src/session.ts:169] [E: packages/core/src/session.ts:170] [E: packages/core/src/session.ts:182]。 |
| `session_input` | Durable admission inbox；admitted inputs 在 runner 发布 `Prompted` 前不进入 model-visible Session history [E: specs/v2/session.md:35]。 |
| `SessionExecution` | V2 process-global execution coordinator；routing 从 Session ID 经 `SessionStore.get(sessionID)` 到 `LocationServiceMap.get(session.location)`，再到 `SessionRunner.run(...)` [E: specs/v2/session.md:39] [E: specs/v2/session.md:42] [E: specs/v2/session.md:44] [E: specs/v2/session.md:45] [E: specs/v2/session.md:48]。 |
| `SessionRunner` | V2 Location-scoped runner；catalog、model resolver、tool registry、permission state 和 filesystem 都按 Location cache [E: specs/v2/session.md:48]。AGENTS.md 要求不要 bridge through legacy `SessionPrompt.loop(...)`，并保持每个 provider turn 一个显式 `llm.stream(request)` [E: AGENTS.md:156] [E: AGENTS.md:157]。 |
| V2 `llm.stream` | `packages/core/src/session/runner/llm.ts` 在 provider turn 中调用 `llm.stream(request)`，随后在同一 runner 流程里处理 tool-call settlement 和 continuation 判断 [E: packages/core/src/session/runner/llm.ts:227] [E: packages/core/src/session/runner/llm.ts:244] [E: packages/core/src/session/runner/llm.ts:247] [E: packages/core/src/session/runner/llm.ts:256] [E: packages/core/src/session/runner/llm.ts:260] [E: packages/core/src/session/runner/llm.ts:340]。 |
| `Context Epoch` | 一个 effective agent 的初始 `System Context` 保持不可变的 span，到 compaction 或其他 baseline replacement 结束 [E: CONTEXT.md:27]。V2 spec 进一步说 Context Epoch stores one immutable provider-cache baseline and a model-hidden structured snapshot [E: specs/v2/session.md:56]。 |
| `Baseline System Context` | Context Epoch 开始时渲染出的完整 System Context [E: CONTEXT.md:30]。Baseline 会在 epoch 内 durably preserved 并跨进程重启复用 [E: CONTEXT.md:130] [E: CONTEXT.md:131] [E: CONTEXT.md:132]。 |
| `Context Snapshot` | Model-hidden JSON state，用于比较每个 Context Source 与上次已 admission 的值 [E: CONTEXT.md:34]。Snapshot 会与 durable Mid-Conversation System Message 原子推进 [E: CONTEXT.md:95]。 |
| `System Context Registry` | Location-scoped ordered/scoped producer registry，贡献当前 System Context [E: CONTEXT.md:20]。 |
| `Safe Provider-Turn Boundary` | provider call 前、durable input promotion 和必要 tool settlement 之后，context changes 可以被 chronological admission 的点 [E: CONTEXT.md:40]。 |
| `Managed Tool Output File` | 过大的 Core tool output 完整内容会进入 shared tool-output directory 的临时文件；Session history 保留 bounded projection [E: CONTEXT.md:55] [E: CONTEXT.md:58]。 |
| `EventV2` | Core event system。`EventV2.define` re-export schema event definitions；payload 可带 durable `seq`、`version`、`location` 和 metadata [E: packages/core/src/event.ts:115] [E: packages/schema/src/event.ts:42] [E: packages/schema/src/event.ts:55] [E: packages/schema/src/event.ts:56] [E: packages/schema/src/event.ts:58] [E: packages/schema/src/event.ts:59]。durable event commit 会补入 aggregate ID、seq 和 version 并写入 event table [E: packages/core/src/event.ts:318] [E: packages/core/src/event.ts:337] [E: packages/core/src/event.ts:341] [E: packages/core/src/event.ts:342] [E: packages/core/src/event.ts:343]。 |
| `session.next.*` | V2 synchronized session event family；durable replay 使用 aggregate sequence cursor，live-only text/reasoning/tool-input fragments 只通过 EventV2 subscriptions 给 connected renderer [E: specs/v2/session.md:175]。 |
| `Integration` | `packages/core/src/integration.ts` 是 `@opencode/v2/Integration` service，管理 integration registry、key/OAuth/env methods、connections、OAuth attempt status 和 credential creation [E: packages/core/src/integration.ts:45] [E: packages/core/src/integration.ts:48] [E: packages/core/src/integration.ts:51] [E: packages/core/src/integration.ts:140] [E: packages/core/src/integration.ts:146] [E: packages/core/src/integration.ts:181] [E: packages/core/src/integration.ts:196]。它不是 workspace/cloud connector 客户端；`connection.key` 会把用户输入 secret 转成 credential 存储，OAuth begin/status/complete/cancel 管理本地 attempt lifecycle [E: packages/core/src/integration.ts:404] [E: packages/core/src/integration.ts:410] [E: packages/core/src/integration.ts:418] [E: packages/core/src/integration.ts:428] [E: packages/core/src/integration.ts:476] [E: packages/core/src/integration.ts:484] [E: packages/core/src/integration.ts:505]。 |
| V2 HTTP server | `packages/server/src/api.ts` 注入 Location/SessionLocation middleware，`packages/protocol/src/api.ts` 使用 `HttpApi.make("server")` 组装 Health、Location、Session、Integration、Credential、Pty、ProjectCopy 等 group，并附加 Authorization/SchemaError middleware [E: packages/server/src/api.ts:5] [E: packages/server/src/api.ts:6] [E: packages/server/src/api.ts:7] [E: packages/protocol/src/api.ts:37] [E: packages/protocol/src/api.ts:38] [E: packages/protocol/src/api.ts:39] [E: packages/protocol/src/api.ts:41] [E: packages/protocol/src/api.ts:45] [E: packages/protocol/src/api.ts:46] [E: packages/protocol/src/api.ts:52] [E: packages/protocol/src/api.ts:55] [E: packages/protocol/src/api.ts:63] [E: packages/protocol/src/api.ts:64]。这也是 Effect HttpApi，不是 Hono [I]。 |

## Shared / NA

| Term | 定义 |
| --- | --- |
| `packages/llm` | Shared native provider/protocol engine，package exports 包括 provider、providers、protocols 和 route surfaces [E: packages/llm/package.json:15] [E: packages/llm/package.json:16] [E: packages/llm/package.json:17] [E: packages/llm/package.json:29]。V1 通过 experimental native seam 可选接入，V2 runner 直接从 `@opencode-ai/llm` 导入 `LLM`、`LLMClient`、`LLMEvent` 等 [E: packages/core/src/session/runner/llm.ts:2] [E: packages/core/src/session/runner/llm.ts:3] [E: packages/core/src/session/runner/llm.ts:5] [E: packages/core/src/session/runner/llm.ts:10]。 |
| `packages/tui` | Canonical OpenTUI/Solid terminal UI package；TUI package spec 要把 canonical TUI 从旧 `packages/opencode/src/cli/cmd/tui` 移到 `packages/tui`，同时 legacy CLI 和 new CLI 共用同一 implementation [E: specs/tui-package.md:5] [E: specs/tui-package.md:6] [E: specs/tui-package.md:7] [E: specs/tui-package.md:12] [E: specs/tui-package.md:13]。 |
| `packages/cli` / `lildax` | 新 CLI host package，package 名 `@opencode-ai/cli`，bin 名 `lildax` [E: packages/cli/package.json:3] [E: packages/cli/package.json:8]。它与 V1 `packages/opencode` bin `opencode` 并存 [E: packages/opencode/package.json:19]。 |
| `OpenTUI` | TUI plugin API re-export `@opentui/core`、`@opentui/keymap` 和 `@opentui/keymap/extras` 类型，并导入 `@opentui/solid` 的 `JSX`/`SolidPlugin` 类型供 exported API types 使用，说明 plugin UI surface 是 terminal renderer/Solid 组件 surface [E: packages/plugin/src/tui.ts:19] [E: packages/plugin/src/tui.ts:28] [E: packages/plugin/src/tui.ts:31] [E: packages/plugin/src/tui.ts:33] [E: packages/plugin/src/tui.ts:36] [E: packages/plugin/src/tui.ts:43]。 |
| `Location` | V2 placement/cache identity；SessionExecution 只有在 drain starts 时通过 `LocationServiceMap.get(session.location)` 进入 Session 当前 Location，Location runner 会 fence new provider turn 防止 moved Session 继续用 source-Location tools/context [E: specs/v2/session.md:167]。 |
| `Instance` | V1 per-directory runtime context。V1 effect command wrapper 会在 command 需要 instance 时 load `InstanceStore`，提供 `InstanceRef`，并在结束时 dispose context [E: packages/opencode/src/cli/effect-cmd.ts:79] [E: packages/opencode/src/cli/effect-cmd.ts:84] [E: packages/opencode/src/cli/effect-cmd.ts:87] [E: packages/opencode/src/cli/effect-cmd.ts:91] [E: packages/opencode/src/cli/effect-cmd.ts:93]。 |
| `Project` | Project spec 目标是单个 OpenCode instance 能为多个 project/worktree 运行 sessions [E: specs/project.md:3]；API sketch 以 `/project`、`/project/init`、`/project/:projectID/session` 等 endpoint 表达 project/session 资源 [E: specs/project.md:8] [E: specs/project.md:10] [E: specs/project.md:13]。 |
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
- `packages/core/src/session.ts`
- `packages/core/src/event.ts`
- `packages/schema/src/event.ts`
- `packages/core/src/integration.ts`
- `packages/core/src/credential.ts`
- `packages/server/src/api.ts`
- `packages/protocol/src/api.ts`
- `packages/opencode/src/server/routes/instance/httpapi/api.ts`
- `packages/opencode/src/event-v2-bridge.ts`
- `packages/opencode/src/bus/global.ts`

## 相关

- `spine.overview`
