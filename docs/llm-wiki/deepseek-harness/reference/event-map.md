---
id: ref.event-map
title: 事件生产消费图
kind: catalog
tier: T3
pkg: cross
source:
  - packages/core/agent/src/index.ts
  - packages/core/agent/src/runtime-types.ts
  - packages/core/agent/src/dispatch.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/session/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/llm/llm/src/index.ts
  - packages/llm/llm/src/types.ts
  - packages/llm/llm/src/call-config.ts
  - packages/fs/fs/src/index.ts
  - packages/preset/agent-presets/src/types.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/interaction/user-approval/src/types.ts
  - packages/interaction/user-questions/src/types.ts
  - packages/interaction/commands/src/types.ts
  - packages/extensions/cordis-host-runner/src/types.ts
  - packages/credentials/credentials/src/types.ts
  - packages/credentials/authorization/src/index.ts
  - packages/storage/storage-domain/src/events.ts
  - packages/goal/goal/src/domain.ts
  - packages/session/session-telemetry/src/index.ts
  - packages/settings/settings/src/types.ts
  - packages/skill/skill/src/index.ts
  - packages/subagent/subagent/src/index.ts
  - packages/subagent/subagent/src/lifecycle.ts
  - packages/workflow/workflow/src/index.ts
  - packages/workflow/workflow-worker-thread/src/index.ts
  - packages/api/remotes/src/remote-events.ts
  - packages/api/remotes/src/index.ts
  - packages/api/session-controller/src/types.ts
  - packages/host/webserver/src/index.ts
  - packages/sdk/server/src/server.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/cordis/src/reflect.ts
symbols:
  - tools/pre-execute
  - tools/execute
  - tools/post-execute
  - tools/ptc-dispatch-log
  - llm/stream
  - session/flush
  - session/event
  - agent/pre-step
  - agent/request
  - agent/turn-stopping
  - approval/request
  - system-prompt/assemble
  - API_REMOTE_FORWARDED_EVENTS
related:
  - spine.turn-and-step
  - spine.tool-call-anatomy
  - ref.session-events
  - subsys.core.agent
  - spine.session-log
  - subsys.core.session
  - subsys.core.agent-loop
  - subsys.core.tools
  - subsys.vendor.cordis
  - subsys.host.apiproxy
evidence: explicit
status: verified
updated: 0a53fb55be
---

> Cordis `Events` 是进程内运行时总线：`ctx.emit` / `ctx.waterfall` / `ctx.serial` / `ctx.parallel`（以及若干包自己的 `events.dispatch` 容纳发射）。它不是 `SessionEvent` 日志词表。本页实例表收录 harness `interface Events` merge **65** 条（不含 client 面与 vendor loader/HMR）；`session/flush` 是 **parallel**；waterfall 监听者必须调用传入的 `next()`。

## 能回答的问题

- target 树有哪些 harness Cordis 事件？每个是 `emit` / `waterfall` / `serial` / `parallel` 哪一种？
- waterfall 不调用 `next()` 会怎样？`session/flush` 为什么标 parallel 而不是 waterfall？
- `session/event` 和 `SessionEvent` 的 `type`（如 `turn/start`）是不是同一套名字？
- 谁 dispatch `agent/pre-step` / `tools/execute` / `llm/stream`？谁 listen？
- host 面哪些事件被 `dsh-api-remotes` 原样转发到 browser（`API_REMOTE_FORWARDED_EVENTS`）？
- `internal/dispatch` 这类 `internal/*` 是不是 harness 事件？

## 范围与 ground truth

本页枚举 **Cordis 运行时事件**（`declare module '@deepseek-ai/cordis' { interface Events { ... } }`）。实例完整性以生成表 `docs/event-producer-consumer.md` **查漏**（本页主表 **65** 行 + Non-harness `internal/*` 4 行字符串），`[E]` 落到各事件**声明行**，不把该 md 或其它 `docs/**` 当证据。

**不是** `SessionEvent` 日志。`turn/start` / `user/message` / `tool/result` 是 append-only 信封的 `type`，词表在 [ref.session-events](session-events.md)。提交一条 log 之后，store 才 fire-and-forget 广播 Cordis `session/event`；两者名字空间碰巧都能带 `/`，但合同、持久化、surface 折叠都不一样。[E: packages/core/session/src/index.ts:74]

认哪份源：

- 声明：各包 `interface Events` 的事件名行 + `@mode` JSDoc（模式以声明为准）。
- dispatch / listen：产品 `packages/*/src` 里的 `ctx.emit` / `waterfall` / `serial` / `events.dispatch` / `ctx.on`（以及 `emitAgentEvent`、`emitWorkflowEvent`、`SessionStore.flush` 这类容纳发射）。测试只当强旁证。listen 列完整名单以生成矩阵查漏，标 `[I]`。
- 内核语义：`vendor/cordis/src/events.ts` 的 dispatch。waterfall 的 `next` 才 `shift` 下一个 listener 或落到 inner；不调用则链停在本层，内置行为也不跑。[E: vendor/cordis/src/events.ts:235][E: vendor/cordis/src/events.ts:237][E: vendor/cordis/src/events.ts:238][E: vendor/cordis/src/events.ts:239]

**host 面 vs agent-preset 面。** 总线是进程级一份 `Context`。host 面插件（`session` store、`session-controller`、`api-remotes`、`settings`、`credentials`、`sdk-server`、`webserver`）听会话生命周期与转发 allowlist。agent-preset 面插件（tools / persona / isolate 里挂上的 hooks、plan、skill、compaction）听 `agent/pre-step`、`tools/*`、`system-prompt/assemble` 这类 **scope-filtered** 扩展点：`this: Scoped<Agent>`，只收到本 agent。五个 shipped profile：`web`（live）以及 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。`dsh web` 不是唯一入口：`dsh --profile sdk|sdk-minimal|acp|headless` 同样 boot。四个 shipped preset 目录名是 `minimal` / `standard` / `ptc` / `cordis`（旧名 `code` 即 PTC）。

本页**不收**：

- client 面：`slots/changed`、`connection/reset`、`locale/change`、`theme/change`、`command/executed`、`slash/input-*`（`packages/client/**`）。
- vendor loader / HMR：`exit`、`loader/*`、`hmr/*`。
- Cordis 内核其余 `internal/config` / `internal/update` / `internal/get` / `internal/set` / `internal/listener`（声明在 `vendor/cordis`，Non-harness 扫描只列出在 package 源码里出现过字符串的那 4 个）。

控制流走读在 [spine.turn-and-step](../spine/turn-and-step.md) 与 [spine.tool-call-anatomy](../spine/tool-call-anatomy.md)；Agent 合同在 [subsys.core.agent](../subsystems/core/agent.md)；内核 mixin 在 [subsys.vendor.cordis](../subsystems/vendor/cordis.md)。Host HTTP 转发在 [subsys.host.apiproxy](../subsystems/host/apiproxy.md)（三个 `packages/api/*-controller` + `dsh-api-remotes`；`packages/host/apiproxy` 已删除）。

## 模式与 dispatch 拼写

| 模式 | Cordis API | 语义 |
|---|---|---|
| `emit` | `ctx.emit` 或 `events.dispatch('emit')` 后自己 contain | 通知；默认同步调 listener，不 veto |
| `waterfall` | `ctx.waterfall(..., next)` | 监听者要 `next()`；不调用则短路剩余链与 inner |
| `serial` | `ctx.serial` | 按注册序 await；本仓 `agent/turn-stopping` 用它 |
| `parallel` | `ctx.parallel` 或语义等价的 `Promise.allSettled` | 每个 listener 都跑，调用方 await 全部 |

若干包不用裸 `ctx.emit`，而用 `events.dispatch` 拿 callback 快照再逐个 contain（`agentEvents.emit`、`SessionStore`、`emitWorkflowEvent`、`agent-loop/config-start-failed`、subagent lifecycle）。agent 主语事件走 `agentEvents` / `emitAgentEvent`：carrier 与 payload.`agent` 由 dispatcher 焊死。[E: packages/core/agent/src/dispatch.ts:118][E: packages/core/agent/src/dispatch.ts:125][E: packages/core/agent/src/dispatch.ts:158]

`session/flush` 声明 `@mode parallel`。`SessionStore.flush` 经 `collectSessionCallbacks` → `events.dispatch('emit')` 取快照，再 `Promise.allSettled` 等全部 listener；调用方必须走 `sessions.flush(session)`，不要自己 `ctx.parallel('session/flush', …)`。[E: packages/core/session/src/index.ts:83][E: packages/core/session/src/index.ts:376][E: packages/core/session/src/index.ts:1020][E: packages/core/session/src/index.ts:1023][E: packages/core/session/src/index.ts:1024]

## 实例表

列：事件名 · 模式 · 声明包 · dispatch · listen（产品 `src`；`remotes` = `API_REMOTE_FORWARDED_EVENTS`）· 源 path（声明行）。组内每个 harness 事件都有行。waterfall 行的模式格写明「监听者要 `next()`」。listen 名单相对生成矩阵 `[I]`。

### agent / agent-loop

| 事件名 | 模式 | 声明包 | dispatch | listen `[I]` | 源 path |
|---|---|---|---|---|---|
| `agent/created` | emit | `agent` | `agent`（`events.dispatch`） | `agent-presets`、`file-reference-local`、`goal-round-driver`、`schedule`、`tool-agent-team`、`tool-subagent` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:166] |
| `agent/disposed` | emit | `agent` | `agent`（`events.dispatch`） | `agent-loop`、`file-reference-local`、`goal-round-driver`、`subagent`、`tool-agent-team`、`tool-subagent` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:175] |
| `agent/status` | emit | `agent` | `agent-loop`（`emit`） | `agent`、`agent-team`、`compaction-basic`、`goal-round-driver`、`schedule`、`server`、`session-controller` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:185] |
| `agent/inbox/inserted` | emit | `agent` | `agent-loop`（`emit`） | `goal-round-driver` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:193] |
| `agent/inbox/claimed` | emit | `agent` | `agent-loop`（`emit`） | `acp`、`goal-round-driver`、`subagent`、`tool-jobs` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:204] |
| `agent/inbox/discarded` | emit | `agent` | `agent-loop`（`emit`） | `goal-round-driver`、`subagent` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:212] |
| `agent/session-start` | emit | `agent` | `agent-loop`（`emitAgentEvent`） | `agent-team`、`goal`、`goal-round-driver`、`hooks-claude-code`、`hooks-codex` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:224] |
| `agent/pre-step` | waterfall（监听者要 `next()`） | `agent` | `agent-loop`（`waterfall`） | `agent-instructions`、`compaction-basic`、`goal-round-driver`、`hooks-claude-code`、`hooks-codex`、`plan-mode`、`repeat-tool-reminder`、`session-checkpoint-policy`、`session-reference`、`subagent-in-process-driver`、`time-context`、`tmux-context`、`tool-cordis`、`tool-skill`、`tool-subagent` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:238] |
| `agent/request` | waterfall（监听者要 `next()`） | `agent` | `agent-loop`（`waterfall`） | `agent`、`webhook` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:251] |
| `agent/request-error` | waterfall（监听者要 `next()`） | `agent` | `agent-loop`（`waterfall`） | `compaction-basic`、`llm-retry` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:267] |
| `agent/turn-stopping` | serial | `agent` | `agent-loop`（`serial`） | `hooks-claude-code`、`hooks-codex` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:285] |
| `agent/error` | emit | `agent` | `agent-loop`（`emit`） | `acp`、`goal-round-driver`、`session-controller`、`session-telemetry` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:297] |
| `agent-loop/config-start-failed` | emit | `agent-loop` | `agent-loop`（`events.dispatch`） | 无产品 listen | `packages/core/agent-loop/src/index.ts` [E: packages/core/agent-loop/src/index.ts:239] |

`agent/pre-step` 的 inner `next` 默认 `{ kind: 'enter', messages }`（可夹 runtime context）。不调用 `next()` 等于自己当 innermost，下游 hooks / checkpoint 看不到这次提案。[E: packages/core/agent-loop/src/agent.ts:243][E: packages/core/agent-loop/src/agent.ts:246]

`agent/session-start` 在 `publish()` 里 `emitAgentEvent(...)`，发生在 session/agent `announce` 之后。[E: packages/core/agent-loop/src/index.ts:630]

### session / api-session / telemetry

| 事件名 | 模式 | 声明包 | dispatch | listen `[I]` | 源 path |
|---|---|---|---|---|---|
| `session/created` | emit | `session` | `session`（`events.dispatch`） | `compaction`、`goal`、`hook-protocol`、`llm-retry`、`permission-presets`、`plan-mode`、`schedule`、`server`、`session`、`session-controller`、`session-log-deepseek`、`session-persistence`、`session-projection`、`session-projection-cache`、`session-telemetry`、`time-context`、`tool-todo`、`tool-workflow`、`tools`、`user-approval` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:52] |
| `session/disposed` | emit | `session` | `session`（`events.dispatch`） | `agent-loop`、`agent-team`、`session-controller`、`session-persistence`、`session-projection-cache`、`session-telemetry`、`session-title` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:62] |
| `session/event` | emit | `session` | `session`（`events.dispatch`） | `acp`、`agent-instructions`、`agent-loop`、`agent-presets`、`agent-team`、`compaction`、`compaction-basic`、`file-reference-local`、`goal`、`goal-round-driver`、`headless`、`hook-protocol`、`loader-smoke`、`server`、`session`、`session-controller`、`session-persistence`、`session-projection`、`session-projection-cache`、`session-telemetry`、`session-telemetry-otel`、`session-title`、`token-meter`、`tool-todo`、`tool-workflow`、`tools`、`user-approval` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:74] |
| `session/flush` | **parallel** | `session` | `session`（`events.dispatch` + `Promise.allSettled`） | `session-persistence`、`session-telemetry` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:83] |
| `session-telemetry/record` | waterfall（监听者要 `next()`） | `session-telemetry` | `session-telemetry`（`waterfall`） | 无产品 listen（redaction 扩展点；无 listener 则原样出站） | `packages/session/session-telemetry/src/index.ts` [E: packages/session/session-telemetry/src/index.ts:43] |
| `api-session/added` | emit | `session-controller` | `session-controller`（`emit`） | `remotes` | `packages/api/session-controller/src/types.ts` [E: packages/api/session-controller/src/types.ts:503] |
| `api-session/removed` | emit | `session-controller` | `session-controller`（`emit`） | `remotes` | `packages/api/session-controller/src/types.ts` [E: packages/api/session-controller/src/types.ts:509] |
| `api-session/status` | emit | `session-controller` | `session-controller`（`emit`） | `remotes` | `packages/api/session-controller/src/types.ts` [E: packages/api/session-controller/src/types.ts:516] |
| `api-session/activity` | emit | `session-controller` | `session-controller`（`emit`） | `remotes` | `packages/api/session-controller/src/types.ts` [E: packages/api/session-controller/src/types.ts:523] |
| `api-session/error` | emit | `session-controller` | `session-controller`（`emit`） | `remotes` | `packages/api/session-controller/src/types.ts` [E: packages/api/session-controller/src/types.ts:530] |

`session/event` 的第三参是已经 commit 的 `SessionEvent` 信封。把 `event.type === 'agent-preset/selected'` 再 `ctx.emit('agent-preset/selected', ...)` 的是 `agent-presets`：日志 type 与 Cordis 事件同名但分两跳。[E: packages/preset/agent-presets/src/index.ts:228][E: packages/preset/agent-presets/src/index.ts:229]

### tools / system-prompt

| 事件名 | 模式 | 声明包 | dispatch | listen `[I]` | 源 path |
|---|---|---|---|---|---|
| `tools/pre-execute` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `hooks-claude-code`、`hooks-codex`、`tool-jobs` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:144] |
| `tools/execute` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `session-checkpoint-policy`、`timeout-policy` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:155] |
| `tools/post-execute` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `hooks-claude-code`、`hooks-codex`、`repeat-tool-reminder`、`spill-policy`、`tool-fs-search` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:167] |
| `tools/ptc-dispatch-log` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `spill-policy` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:181] |
| `tools/result` | emit | `tools` | `tools`（`events.dispatch`） | `agent-instructions`、`subagent-in-process-driver` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:189] |
| `tools/change` | emit | `tools` | `tools` / `agent-presets`（`emit`） | `tool-subagent` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:199] |
| `system-prompt/assemble` | waterfall（监听者要 `next()`） | `system-prompt` | `system-prompt`（`waterfall`） | `agent`、`agent-presets`、`system-prompt` | `packages/core/system-prompt/src/index.ts` [E: packages/core/system-prompt/src/index.ts:31] |
| `system-prompt/change` | emit | `system-prompt` | `system-prompt`（`emit`） | 无产品 listen | `packages/core/system-prompt/src/index.ts` [E: packages/core/system-prompt/src/index.ts:37] |

`tools/pre-execute` inner 默认 `{ kind: 'allow' }`。`tools/execute` inner 是 `dispatchToolBody`。[E: packages/core/tools/src/index.ts:1468][E: packages/core/tools/src/index.ts:1566]

`tools/ptc-dispatch-log` 只改 PTC `run_code` 子分派写入 durable log 的内容副本；程序已经拿到完整值。权威实现在 `packages/core/tools/src/ptc.ts`（wiki 节点 id `subsys.core.code-mode` 是稳定别名）。[E: packages/core/tools/src/index.ts:181]

### llm / fs / approval / commands / user-questions / webserver

| 事件名 | 模式 | 声明包 | dispatch | listen `[I]` | 源 path |
|---|---|---|---|---|---|
| `llm/stream` | waterfall（监听者要 `next()`） | `llm` | `llm`（`waterfall`） | `agent-loop`、`llm`、`llm-replay`、`session-checkpoint-policy`、`session-title` | `packages/llm/llm/src/index.ts` [E: packages/llm/llm/src/index.ts:67] |
| `llm/adapters-updated` | emit | `llm` | `llm`（`events.dispatch`） | `acp`、`llm`、`remotes` | `packages/llm/llm/src/types.ts` [E: packages/llm/llm/src/types.ts:23] |
| `fs/write-intent` | waterfall（监听者要 `next()`） | `fs` | `tool-fs`、`tool-str-replace-editor`（`waterfall`） | `fs-observation-policy` | `packages/fs/fs/src/index.ts` [E: packages/fs/fs/src/index.ts:58] |
| `fs/edit-intent` | waterfall（监听者要 `next()`） | `fs` | `tool-fs`、`tool-str-replace-editor`（`waterfall`） | `fs-observation-policy` | `packages/fs/fs/src/index.ts` [E: packages/fs/fs/src/index.ts:66] |
| `fs/observed` | emit | `fs` | `tool-fs`、`tool-str-replace-editor`（`emit`） | `fs-observation-policy`、`skill-filesystem` | `packages/fs/fs/src/index.ts` [E: packages/fs/fs/src/index.ts:76] |
| `approval/request` | waterfall（监听者要 `next()`） | `user-approval` | `user-approval`（`waterfall`） | `acp`、`remotes` | `packages/interaction/user-approval/src/types.ts` [E: packages/interaction/user-approval/src/types.ts:85] |
| `user-questions/request` | waterfall（监听者要 `next()`） | `user-questions` | `user-questions`（`waterfall`） | `remotes` | `packages/interaction/user-questions/src/types.ts` [E: packages/interaction/user-questions/src/types.ts:85] |
| `commands/change` | emit | `commands` | `commands`（`events.dispatch`） | `remotes` | `packages/interaction/commands/src/types.ts` [E: packages/interaction/commands/src/types.ts:80] |
| `webserver/index-inject` | emit | `webserver` | `webserver`（`emit`） | `inspector`、`modules` | `packages/host/webserver/src/index.ts` [E: packages/host/webserver/src/index.ts:34] |

`llm/stream` 声明：loop 建的 request 带 `markAgentLoopRequest` 且深冻，listener 只读不改消息。[E: packages/llm/llm/src/index.ts:67][E: packages/llm/llm/src/call-config.ts:66]

`approval/request` inner 默认 `'unavailable'`（fail-closed）。`'never'` 策略在 dispatch **之前**由 service 自己短路为 `'rejected'`。[E: packages/interaction/user-approval/src/index.ts:277][E: packages/interaction/user-approval/src/index.ts:283][E: packages/interaction/user-approval/src/index.ts:285]

### goal / subagent / workflow / skill / preset

| 事件名 | 模式 | 声明包 | dispatch | listen `[I]` | 源 path |
|---|---|---|---|---|---|
| `goal/changed` | emit | `goal` | `goal`（`emit`） | `goal-round-driver` | `packages/goal/goal/src/domain.ts` [E: packages/goal/goal/src/domain.ts:114] |
| `subagent/provider-added` | emit | `subagent` | `subagent`（`emit`） | `subagent`、`tool-subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:152] |
| `subagent/provider-removed` | emit | `subagent` | `subagent`（`events.dispatch` / lifecycle） | `subagent`、`tool-subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:158] |
| `subagent/start` | emit | `subagent` | `subagent`（`events.dispatch` / lifecycle） | `hooks-claude-code`、`subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:169] |
| `subagent/end` | emit | `subagent` | `subagent`（`events.dispatch` / lifecycle） | `hooks-claude-code`、`server`、`subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:178] |
| `workflow/start` | emit | `workflow` | `workflow`（`events.dispatch`；worker 调 `emitWorkflowEvent`） | `workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:43] |
| `workflow/phase` | emit | `workflow` | `workflow`（`events.dispatch`） | 无产品 listen | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:51] |
| `workflow/log` | emit | `workflow` | `workflow`（`events.dispatch`） | 无产品 listen | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:58] |
| `workflow/agent-start` | emit | `workflow` | `workflow`（`events.dispatch`） | `tool-workflow`、`workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:68] |
| `workflow/agent-end` | emit | `workflow` | `workflow`（`events.dispatch`） | `tool-workflow`、`workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:79] |
| `workflow/end` | emit | `workflow` | `workflow`（`events.dispatch`） | `workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:89] |
| `skills/change` | emit | `skill` | `skill`（`events.dispatch`） | 无产品 listen | `packages/skill/skill/src/index.ts` [E: packages/skill/skill/src/index.ts:298] |
| `agent-preset/selected` | emit | `agent-presets` | `agent-presets`（`emit`） | `remotes` | `packages/preset/agent-presets/src/types.ts` [E: packages/preset/agent-presets/src/types.ts:80] |

`subagent/start` 与 `subagent/end` 由 `createLifecycleEmitter` 容纳发射：有 parent 则带 scope carrier。[E: packages/subagent/subagent/src/lifecycle.ts:112][E: packages/subagent/subagent/src/lifecycle.ts:160]

`workflow/*` 的生产发射在 `workflow-worker-thread` 调 `emitWorkflowEvent`；引擎基类对每个 callback contain。[E: packages/workflow/workflow/src/index.ts:175][E: packages/workflow/workflow-worker-thread/src/index.ts:190]

### settings / credentials / authorization / domain / cordis-host

| 事件名 | 模式 | 声明包 | dispatch | listen `[I]` | 源 path |
|---|---|---|---|---|---|
| `settings/updated` | emit | `settings` | `settings`（`events.dispatch`） | `settings` | `packages/settings/settings/src/types.ts` [E: packages/settings/settings/src/types.ts:92] |
| `settings/document-updated` | emit | `settings` | `settings`（`events.dispatch`） | `remotes` | `packages/settings/settings/src/types.ts` [E: packages/settings/settings/src/types.ts:105] |
| `credentials/reference-updated` | emit | `credentials` | `credentials`（`events.dispatch`） | `credentials`、`remotes` | `packages/credentials/credentials/src/types.ts` [E: packages/credentials/credentials/src/types.ts:90] |
| `credentials/record-updated` | emit | `credentials` | `credentials`（`events.dispatch`） | `authorization` | `packages/credentials/credentials/src/types.ts` [E: packages/credentials/credentials/src/types.ts:102] |
| `authorization/settled` | emit | `authorization` | `authorization`（`events.dispatch`） | `authorization` | `packages/credentials/authorization/src/index.ts` [E: packages/credentials/authorization/src/index.ts:57] |
| `domain/changed` | emit | `storage-domain` | `storage-domain`（`emit`） | `storage-domain`、`workspace`、`workspace-controller` | `packages/storage/storage-domain/src/events.ts` [E: packages/storage/storage-domain/src/events.ts:46] |
| `cordis/request-run` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `remotes` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:368] |
| `cordis/request-run-resolved` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `remotes` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:374] |
| `cordis/dynamic-package` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `remotes` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:380] |
| `cordis/dynamic-retract` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `remotes` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:386] |
| `cordis/inspect-query` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `remotes` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:392] |
| `cordis/inspect-query-resolved` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `remotes` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:398] |

`dsh-api-remotes` 对 allowlist 做 `API_REMOTE_FORWARDED_EVENTS.map(...)`，按 `mode` 挂 `ctx.on`，包进 Typert Remote Event 队列。allowlist 是：`agent-preset/selected`、`approval/request`（waterfall）、五个 `api-session/*`、`commands/change`、`credentials/reference-updated`、六个 `cordis/*`、`llm/adapters-updated`、`settings/document-updated`、`user-questions/request`（waterfall）。没有已删除的 `packages/host/apiproxy`；session 活控制走 `session-controller` 的 Remote `follow` / `control`，不经这条 allowlist。[E: packages/api/remotes/src/remote-events.ts:16][E: packages/api/remotes/src/remote-events.ts:17][E: packages/api/remotes/src/index.ts:48]

旧名 `credentials/updated` 已拆成 `credentials/reference-updated` 与 `credentials/record-updated`。[E: packages/credentials/credentials/src/types.ts:90][E: packages/credentials/credentials/src/types.ts:102]

## Non-harness · `internal/*`

生成矩阵 Non-harness 表列了 **4** 个在 package 源码里出现、但不是 harness `Events` merge 的字符串。声明与发射都在 vendored Cordis。`internal/dispatch` 只对**非** `internal/` 名字开火。[E: vendor/cordis/src/events.ts:168][E: vendor/cordis/src/events.ts:351]

| 事件名 | 模式 | 声明包 | dispatch | listen（host 产品 `src`）`[I]` | 源 path |
|---|---|---|---|---|---|
| `internal/plugin` | emit | `vendor/cordis` | `fiber`（`context.emit`） | `inspector`、`loader`、`lsp-stdio`、`modules`、`webserver` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:331] |
| `internal/status` | emit | `vendor/cordis` | `fiber`（`context.emit`） | `agent`、`inspector` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:333] |
| `internal/service` | emit | `vendor/cordis` | `reflect`（`events.emit`） | `agent-presets`、`gateway` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:341] |
| `internal/dispatch` | emit | `vendor/cordis` | `EventsService.dispatch`（非 internal 事件） | `agent-team`、`commands`、`compaction`、`fs`、`goal`、`goal-round-driver`、`hook-protocol`、`llm-retry`、`permission-presets`、`plan-mode`、`sandbox-policy`、`schedule`、`scope`、`session`、`session-log-deepseek`、`session-title`、`subagent`、`terminal-bash`、`time-context`、`tool-todo`、`tool-workflow`、`tools`、`user-approval`、`webhook`、`workflow` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:351] |

`internal/status` 的 `agent` listen 用来在 ancestor fiber `UNLOADING` 时关掉 initiator。[E: packages/core/agent/src/index.ts:281]

`internal/dispatch` 的 listen 几乎全是各包 `invariant.ts`：核对 scope carrier 与 payload 主语是否同一对象。client 面另有 `internal/*` listen，host 扫描不列它们。[I]

`fiber.emit('internal/plugin' | 'internal/status')` 与 `reflect` 的 `internal/service`：[E: vendor/cordis/src/fiber.ts:302][E: vendor/cordis/src/fiber.ts:586][E: vendor/cordis/src/reflect.ts:333]

## 对照 · 分家

**Cordis 事件 ≠ SessionEvent。** 同一会话上可以先 `session.append('turn/start', …)`（日志），再由 store 发 `session/event`（总线）。`agent/pre-step` 从不进 JSONL。完整日志词表在 [ref.session-events](session-events.md)；持久化折叠在 [spine.session-log](../spine/session-log.md)。

**scope-filtered vs 登记广播。** `agent/*`、`tools/pre-execute|execute|post-execute|result|ptc-dispatch-log`、`approval/request`、`user-questions/request`、`system-prompt/assemble`、`goal/changed`、`subagent/start|end` 带 `Scoped<…>` `this`。`tools/change`、`system-prompt/change`、`commands/change`、`skills/change`、`llm/adapters-updated` 是**不过滤**的登记通知：scoped listener 也会看到全局变更。

**无 listen 不是死事件。** `skills/change`、`system-prompt/change`、`workflow/phase`、`workflow/log`、`agent-loop/config-start-failed`、`session-telemetry/record` 在产品 `src` 里没有 `ctx.on`。它们仍是扩展点 / UI 刷新钩。

## Sources

- `packages/core/agent/src/index.ts`
- `packages/core/agent/src/runtime-types.ts`
- `packages/core/agent/src/dispatch.ts`
- `packages/core/agent-loop/src/index.ts`
- `packages/core/agent-loop/src/agent.ts`
- `packages/core/session/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/core/system-prompt/src/index.ts`
- `packages/llm/llm/src/index.ts`
- `packages/llm/llm/src/types.ts`
- `packages/llm/llm/src/call-config.ts`
- `packages/fs/fs/src/index.ts`
- `packages/preset/agent-presets/src/types.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/interaction/user-approval/src/index.ts`
- `packages/interaction/user-approval/src/types.ts`
- `packages/interaction/user-questions/src/types.ts`
- `packages/interaction/commands/src/types.ts`
- `packages/extensions/cordis-host-runner/src/types.ts`
- `packages/credentials/credentials/src/types.ts`
- `packages/credentials/authorization/src/index.ts`
- `packages/storage/storage-domain/src/events.ts`
- `packages/goal/goal/src/domain.ts`
- `packages/session/session-telemetry/src/index.ts`
- `packages/settings/settings/src/types.ts`
- `packages/skill/skill/src/index.ts`
- `packages/subagent/subagent/src/index.ts`
- `packages/subagent/subagent/src/lifecycle.ts`
- `packages/workflow/workflow/src/index.ts`
- `packages/workflow/workflow-worker-thread/src/index.ts`
- `packages/api/remotes/src/remote-events.ts`
- `packages/api/remotes/src/index.ts`
- `packages/api/session-controller/src/types.ts`
- `packages/host/webserver/src/index.ts`
- `packages/sdk/server/src/server.ts`
- `vendor/cordis/src/events.ts`
- `vendor/cordis/src/fiber.ts`
- `vendor/cordis/src/reflect.ts`

## 相关

- [spine.turn-and-step](../spine/turn-and-step.md) — 默认可替换 loop 何时 `waterfall` `agent/pre-step` / `agent/request`、`serial` `agent/turn-stopping`。
- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute` 与 approval / timeout 挂点。
- [ref.session-events](session-events.md) — `SessionEventMap` 日志 type（不是本页的 Cordis 事件名）。
- [subsys.core.agent](../subsystems/core/agent.md) — `Agent` 合同、`agentEvents` / `emitAgentEvent`。
- [spine.session-log](../spine/session-log.md) — `append` → `session/event` → `deriveMessages` / checkpoint。
- [subsys.core.session](../subsystems/core/session.md) — `SessionStore`、`flush` 入口。
- [subsys.core.agent-loop](../subsystems/core/agent-loop.md) — 默认 driver 的 dispatch 调用点。
- [subsys.core.tools](../subsystems/core/tools.md) — 工具注册表与执行 waterfall；PTC `run_code`。
- [subsys.vendor.cordis](../subsystems/vendor/cordis.md) — `EventsService` 五种 dispatch；waterfall 必须 `next()`。
- [subsys.host.apiproxy](../subsystems/host/apiproxy.md) — Host HTTP API（三个 controller + `dsh-api-remotes` 转发 allowlist）。
