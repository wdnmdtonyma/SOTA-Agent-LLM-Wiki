---
id: ref.event-map
title: 事件生产消费图
kind: catalog
tier: T3
pkg: cross
source:
  - docs/event-producer-consumer.md
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
  - packages/fs/fs/src/index.ts
  - packages/preset/agent-presets/src/types.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/interaction/commands/src/types.ts
  - packages/extensions/cordis-host-runner/src/types.ts
  - packages/credentials/credentials/src/types.ts
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
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/sdk/server/src/server.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/cordis/src/reflect.ts
  - packages/core/session/tests/scoped.spec.ts
  - packages/core/agent-loop/tests/interception.spec.ts
symbols:
  - tools/pre-execute
  - tools/execute
  - tools/post-execute
  - llm/stream
  - session/flush
  - session/event
  - agent/pre-step
  - agent/request
  - agent/turn-stopping
  - approval/request
  - system-prompt/assemble
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
evidence: explicit
status: verified
updated: 47f943859b
---

> Cordis `Events` 是进程内运行时总线：`ctx.emit` / `ctx.waterfall` / `ctx.serial` / `ctx.parallel`（以及若干包自己的 `events.dispatch` 容纳发射）。它不是 `SessionEvent` 日志词表。冻结树官方矩阵有 **56** 个 harness 事件；`session/flush` 是 **parallel**；waterfall 监听者必须调用传入的 `next()`。

## 能回答的问题

- 冻结树有哪些 harness Cordis 事件？每个是 `emit` / `waterfall` / `serial` / `parallel` 哪一种？
- waterfall 不调用 `next()` 会怎样？`session/flush` 为什么标 parallel 而不是 waterfall？
- `session/event` 和 `SessionEvent` 的 `type`（如 `turn/start`）是不是同一套名字？
- 谁 dispatch `agent/pre-step` / `tools/execute` / `llm/stream`？谁 listen？
- host 面哪些事件被 `apiproxy` 原样转发到 browser（`API_REMOTE_FORWARDED_EVENTS`）？
- `internal/dispatch` 这类 `internal/*` 是不是 harness 事件？

## 范围与 ground truth

本页枚举 **Cordis 运行时事件**（`declare module '@deepseek-ai/cordis' { interface Events { ... } }`）。实例完整性以官方生成表 `docs/event-producer-consumer.md` **查漏**（冻结树主表 56 行 + Non-harness `internal/*` 4 行），`[E]` 落到各事件**声明行**，不把该 md 或其它 `docs/**` 当证据。

**不是** `SessionEvent` 日志。`turn/start` / `user/message` / `tool/result` 是 append-only 信封的 `type`，词表在 [ref.session-events](session-events.md)。提交一条 log 之后，store 才 fire-and-forget 广播 Cordis `session/event`；两者名字空间碰巧都能带 `/`，但合同、持久化、surface 折叠都不一样。[E: packages/core/session/src/index.ts:76]

认哪份源：

- 声明：各包 `interface Events` 的事件名行 + `@mode` JSDoc（模式以声明为准）。
- dispatch / listen：产品 `packages/*/src` 里的 `ctx.emit` / `waterfall` / `serial` / `events.dispatch` / `ctx.on`（以及 `emitAgentEvent`、`emitWorkflowEvent`、`SessionStore.flush` 这类容纳发射）。测试只当强旁证。
- 内核语义：`vendor/cordis/src/events.ts` 的五种 dispatch。waterfall 的 `next` 才 `shift` 下一个 listener 或落到 inner；不调用则链停在本层，内置行为也不跑。[E: vendor/cordis/src/events.ts:234][E: vendor/cordis/src/events.ts:237][E: vendor/cordis/src/events.ts:238][E: vendor/cordis/src/events.ts:239]

**host 面 vs agent-preset 面。** 总线是进程级一份 `Context`。host 面插件（`session` store、`apiproxy`、`settings`、`credentials`、`sdk-server`）听会话生命周期与转发 allowlist。agent-preset 面插件（tools / persona / isolate 里挂上的 hooks、plan、skill、compaction）听 `agent/pre-step`、`tools/*`、`system-prompt/assemble` 这类 **scope-filtered** 扩展点：`this: Scoped<Agent>`，只收到本 agent。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI 包。

本页**不收**（官方 harness 矩阵也没有）：

- client 面：`slots/changed`、`connection/reset`、`locale/change`、`theme/change`、`command/executed`、`slash/input-*`（`packages/client/**`）。
- vendor loader / HMR：`exit`、`loader/*`、`hmr/*`。
- Cordis 内核其余 `internal/config` / `internal/update` / `internal/get` / `internal/set` / `internal/listener`（声明在 `vendor/cordis`，官方 Non-harness 扫描只列出在 package 源码里出现过字符串的那 4 个）。

控制流走读在 [spine.turn-and-step](../spine/turn-and-step.md) 与 [spine.tool-call-anatomy](../spine/tool-call-anatomy.md)；Agent 合同在 [subsys.core.agent](../subsystems/core/agent.md)；内核 mixin 在 [subsys.vendor.cordis](../subsystems/vendor/cordis.md)。

## 模式与 dispatch 拼写

| 模式 | Cordis API | 语义 |
|---|---|---|
| `emit` | `ctx.emit` 或 `events.dispatch('emit')` 后自己 contain | 通知；默认同步调 listener，不 veto |
| `waterfall` | `ctx.waterfall(..., next)` | 监听者要 `next()`；不调用则短路剩余链与 inner |
| `serial` | `ctx.serial` | 按注册序 await；本仓 `agent/turn-stopping` 用它 |
| `parallel` | `ctx.parallel` 或语义等价的 `Promise.allSettled` | 每个 listener 都跑，调用方 await 全部 |

若干包不用裸 `ctx.emit`，而用 `events.dispatch` 拿 callback 快照再逐个 contain（`agentEvents.emit`、`SessionStore`、`emitWorkflowEvent`、`agent-loop/config-start-failed`、subagent lifecycle）。官方矩阵把这类标成 `events.dispatch`。agent 主语事件走 `agentEvents` / `emitAgentEvent`：carrier 与 payload.`agent` 由 dispatcher 焊死。[E: packages/core/agent/src/dispatch.ts:107][E: packages/core/agent/src/dispatch.ts:125][E: packages/core/agent/src/dispatch.ts:158]

`session/flush` 声明 `@mode parallel`。`SessionStore.flush` 经 `collectSessionCallbacks` → `events.dispatch('emit')` 取快照，再 `Promise.allSettled` 等全部 listener；调用方必须走 `sessions.flush(session)`，不要自己 `ctx.parallel('session/flush', …)`。[E: packages/core/session/src/index.ts:85][E: packages/core/session/src/index.ts:377][E: packages/core/session/src/index.ts:1022][E: packages/core/session/src/index.ts:1025][E: packages/core/session/src/index.ts:1026]

## 实例表

列：事件名 · 模式 · 声明包（官方短名）· dispatch · listen（产品 `src`；`apiproxy` 含 allowlist 转发）· 源 path（声明行）。组内每个官方 harness 事件都有行。waterfall 行的模式格写明「监听者要 `next()`」。

### agent / agent-loop

| 事件名 | 模式 | 声明包 | dispatch | listen | 源 path |
|---|---|---|---|---|---|
| `agent/created` | emit | `agent` | `agent`（`events.dispatch`） | `agent-presets`、`goal-round-driver`、`schedule` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:159] |
| `agent/disposed` | emit | `agent` | `agent`（`events.dispatch`） | `agent-loop`、`goal-round-driver`、`subagent` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:168] |
| `agent/status` | emit | `agent` | `agent-loop`（`emit`） | `agent`、`apiproxy`、`compaction-basic`、`goal-round-driver`、`schedule`、`server` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:178] |
| `agent/inbox/inserted` | emit | `agent` | `agent-loop`（`emit`） | `goal-round-driver` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:186] |
| `agent/inbox/claimed` | emit | `agent` | `agent-loop`（`emit`） | `acp`、`goal-round-driver`、`subagent`、`tool-jobs` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:197] |
| `agent/inbox/discarded` | emit | `agent` | `agent-loop`（`emit`） | `goal-round-driver`、`subagent` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:205] |
| `agent/session-start` | emit | `agent` | `agent-loop`（`emitAgentEvent`） | `goal`、`goal-round-driver`、`hooks-claude-code`、`hooks-codex` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:217] |
| `agent/pre-step` | waterfall（监听者要 `next()`） | `agent` | `agent-loop`（`waterfall`） | `agent-instructions`、`compaction-basic`、`goal-round-driver`、`hooks-claude-code`、`hooks-codex`、`plan-mode`、`repeat-tool-reminder`、`session-checkpoint-policy`、`subagent-in-process-driver`、`time-context`、`tmux-context`、`tool-cordis`、`tool-skill` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:231] |
| `agent/request` | waterfall（监听者要 `next()`） | `agent` | `agent-loop`（`waterfall`） | `agent` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:244] |
| `agent/request-error` | waterfall（监听者要 `next()`） | `agent` | `agent-loop`（`waterfall`） | `compaction-basic`、`llm-retry` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:260] |
| `agent/turn-stopping` | serial | `agent` | `agent-loop`（`serial`） | `hooks-claude-code`、`hooks-codex` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:278] |
| `agent/error` | emit | `agent` | `agent-loop`（`emit`） | `acp`、`apiproxy`、`goal-round-driver`、`session-telemetry` | `packages/core/agent/src/runtime-types.ts` [E: packages/core/agent/src/runtime-types.ts:290] |
| `agent-loop/config-start-failed` | emit | `agent-loop` | `agent-loop`（`events.dispatch`） | 无产品 listen | `packages/core/agent-loop/src/index.ts` [E: packages/core/agent-loop/src/index.ts:183] |

`agent/pre-step` 的 inner `next` 默认 `{ kind: 'enter', messages }`（可夹 runtime context）。不调用 `next()` 等于自己当 innermost，下游 hooks / checkpoint 看不到这次提案。[E: packages/core/agent-loop/src/agent.ts:234][E: packages/core/agent-loop/src/agent.ts:236]

`agent/session-start` 在 `publish()` 里 `emitAgentEvent(...)`，发生在 session/agent `announce` 之后。[E: packages/core/agent-loop/src/index.ts:567]

### session

| 事件名 | 模式 | 声明包 | dispatch | listen | 源 path |
|---|---|---|---|---|---|
| `session/created` | emit | `session` | `session`（`events.dispatch`） | `apiproxy`、`compaction`、`goal`、`hook-protocol`、`llm-retry`、`permission-presets`、`plan-mode`、`schedule`、`server`、`session`、`session-persistence`、`session-telemetry`、`time-context`、`tool-workflow`、`tools`、`user-approval` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:54] |
| `session/disposed` | emit | `session` | `session`（`events.dispatch`） | `agent-loop`、`apiproxy`、`session-persistence`、`session-projection-cache`、`session-telemetry`、`session-title` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:64] |
| `session/event` | emit | `session` | `session`（`events.dispatch`） | `acp`、`agent-instructions`、`agent-loop`、`agent-presets`、`apiproxy`、`compaction`、`compaction-basic`、`goal`、`goal-round-driver`、`hook-protocol`、`loader-smoke`、`server`、`session`、`session-persistence`、`session-projection`、`session-projection-cache`、`session-telemetry`、`session-telemetry-otel`、`session-title`、`token-meter`、`tool-workflow`、`tools`、`user-approval` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:76] |
| `session/flush` | **parallel** | `session` | `session`（`events.dispatch` + `Promise.allSettled`） | `session-persistence`、`session-telemetry` | `packages/core/session/src/index.ts` [E: packages/core/session/src/index.ts:85] |
| `session-telemetry/record` | waterfall（监听者要 `next()`） | `session-telemetry` | `session-telemetry`（`waterfall`） | 无产品 listen（redaction 扩展点；无 listener 则原样出站） | `packages/session/session-telemetry/src/index.ts` [E: packages/session/session-telemetry/src/index.ts:43] |

`session/event` 的第三参是已经 commit 的 `SessionEvent` 信封。把 `event.type === 'agent-preset/selected'` 再 `ctx.emit('agent-preset/selected', ...)` 的是 `agent-presets`：日志 type 与 Cordis 事件同名但分两跳。[E: packages/preset/agent-presets/src/index.ts:179][E: packages/preset/agent-presets/src/index.ts:180]

### tools / system-prompt

| 事件名 | 模式 | 声明包 | dispatch | listen | 源 path |
|---|---|---|---|---|---|
| `tools/pre-execute` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `hooks-claude-code`、`hooks-codex`、`tool-jobs` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:152] |
| `tools/execute` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `session-checkpoint-policy`、`timeout-policy` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:163] |
| `tools/post-execute` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `hooks-claude-code`、`hooks-codex`、`repeat-tool-reminder`、`spill-policy`、`tool-fs-search` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:175] |
| `tools/code-dispatch-log` | waterfall（监听者要 `next()`） | `tools` | `tools`（`waterfall`） | `spill-policy` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:189] |
| `tools/result` | emit | `tools` | `tools`（`events.dispatch`） | `agent-instructions`、`subagent-in-process-driver` | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:197] |
| `tools/change` | emit | `tools` | `tools`（`emit`） | 无产品 listen | `packages/core/tools/src/index.ts` [E: packages/core/tools/src/index.ts:207] |
| `system-prompt/assemble` | waterfall（监听者要 `next()`） | `system-prompt` | `system-prompt`（`waterfall`） | `agent`、`agent-presets`、`system-prompt` | `packages/core/system-prompt/src/index.ts` [E: packages/core/system-prompt/src/index.ts:31] |
| `system-prompt/change` | emit | `system-prompt` | `system-prompt`（`emit`） | 无产品 listen | `packages/core/system-prompt/src/index.ts` [E: packages/core/system-prompt/src/index.ts:37] |

`tools/pre-execute` inner 默认 `{ kind: 'allow' }`。`tools/execute` inner 是 `dispatchToolBody`。[E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574]

### llm / fs / approval / commands

| 事件名 | 模式 | 声明包 | dispatch | listen | 源 path |
|---|---|---|---|---|---|
| `llm/stream` | waterfall（监听者要 `next()`） | `llm` | `llm`（`waterfall`） | `agent-loop`、`llm`、`llm-replay`、`session-checkpoint-policy`、`session-title` | `packages/llm/llm/src/index.ts` [E: packages/llm/llm/src/index.ts:64] |
| `llm/adapters-updated` | emit | `llm` | `llm`（`events.dispatch`） | `apiproxy`、`llm` | `packages/llm/llm/src/types.ts` [E: packages/llm/llm/src/types.ts:23] |
| `fs/write-intent` | waterfall（监听者要 `next()`） | `fs` | `tool-fs`、`tool-str-replace-editor`（`waterfall`） | `fs-observation-policy` | `packages/fs/fs/src/index.ts` [E: packages/fs/fs/src/index.ts:58] |
| `fs/edit-intent` | waterfall（监听者要 `next()`） | `fs` | `tool-fs`、`tool-str-replace-editor`（`waterfall`） | `fs-observation-policy` | `packages/fs/fs/src/index.ts` [E: packages/fs/fs/src/index.ts:66] |
| `fs/observed` | emit | `fs` | `tool-fs`、`tool-str-replace-editor`（`emit`） | `fs-observation-policy`、`skill-filesystem` | `packages/fs/fs/src/index.ts` [E: packages/fs/fs/src/index.ts:76] |
| `approval/request` | waterfall（监听者要 `next()`） | `user-approval` | `user-approval`（`waterfall`） | `acp`、`apiproxy` | `packages/interaction/user-approval/src/index.ts` [E: packages/interaction/user-approval/src/index.ts:30] |
| `commands/change` | emit | `commands` | `commands`（`events.dispatch`） | `apiproxy` | `packages/interaction/commands/src/types.ts` [E: packages/interaction/commands/src/types.ts:72] |

`llm/stream` 的 inner 是 `adapterStream`。loop 建的 request 带 `markAgentLoopRequest` 且深冻，listener 只读不改消息。[E: packages/llm/llm/src/index.ts:921][E: packages/llm/llm/src/index.ts:923]

`approval/request` inner 默认 `'unavailable'`（fail-closed）。`'never'` 策略在 dispatch **之前**由 service 自己短路。[E: packages/interaction/user-approval/src/index.ts:312][E: packages/interaction/user-approval/src/index.ts:318]

### goal / subagent / workflow / skill / preset

| 事件名 | 模式 | 声明包 | dispatch | listen | 源 path |
|---|---|---|---|---|---|
| `goal/changed` | emit | `goal` | `goal`（`emit`） | `goal-round-driver` | `packages/goal/goal/src/domain.ts` [E: packages/goal/goal/src/domain.ts:114] |
| `subagent/provider-added` | emit | `subagent` | `subagent`（`emit`） | `subagent`、`tool-subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:140] |
| `subagent/provider-removed` | emit | `subagent` | `subagent`（`events.dispatch` / lifecycle） | `subagent`、`tool-subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:146] |
| `subagent/start` | emit | `subagent` | `subagent`（`events.dispatch` / lifecycle） | `hooks-claude-code`、`subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:157] |
| `subagent/end` | emit | `subagent` | `subagent`（`events.dispatch` / lifecycle） | `hooks-claude-code`、`server`、`subagent` | `packages/subagent/subagent/src/index.ts` [E: packages/subagent/subagent/src/index.ts:166] |
| `workflow/start` | emit | `workflow` | `workflow`（`events.dispatch`；worker 调 `emitWorkflowEvent`） | `workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:43] |
| `workflow/phase` | emit | `workflow` | `workflow`（`events.dispatch`） | 无产品 listen | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:51] |
| `workflow/log` | emit | `workflow` | `workflow`（`events.dispatch`） | 无产品 listen | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:58] |
| `workflow/agent-start` | emit | `workflow` | `workflow`（`events.dispatch`） | `tool-workflow`、`workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:68] |
| `workflow/agent-end` | emit | `workflow` | `workflow`（`events.dispatch`） | `tool-workflow`、`workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:79] |
| `workflow/end` | emit | `workflow` | `workflow`（`events.dispatch`） | `workflow` | `packages/workflow/workflow/src/index.ts` [E: packages/workflow/workflow/src/index.ts:89] |
| `skills/change` | emit | `skill` | `skill`（`events.dispatch`） | 无产品 listen | `packages/skill/skill/src/index.ts` [E: packages/skill/skill/src/index.ts:297] |
| `agent-preset/selected` | emit | `agent-presets` | `agent-presets`（`emit`） | `apiproxy` | `packages/preset/agent-presets/src/types.ts` [E: packages/preset/agent-presets/src/types.ts:13] |

`subagent/start` 与 `subagent/end` 由 `createLifecycleEmitter` 容纳发射：有 parent 则带 scope carrier，官方矩阵仍标 `events.dispatch`。[E: packages/subagent/subagent/src/lifecycle.ts:105][E: packages/subagent/subagent/src/lifecycle.ts:160]

`workflow/*` 的生产发射在 `workflow-worker-thread` 调 `emitWorkflowEvent`；引擎基类对每个 callback contain。[E: packages/workflow/workflow/src/index.ts:176][E: packages/workflow/workflow-worker-thread/src/index.ts:190]

### settings / credentials / domain / cordis-host

| 事件名 | 模式 | 声明包 | dispatch | listen | 源 path |
|---|---|---|---|---|---|
| `settings/updated` | emit | `settings` | `settings`（`events.dispatch`） | `settings` | `packages/settings/settings/src/types.ts` [E: packages/settings/settings/src/types.ts:35] |
| `settings/document-updated` | emit | `settings` | `settings`（`events.dispatch`） | `apiproxy` | `packages/settings/settings/src/types.ts` [E: packages/settings/settings/src/types.ts:48] |
| `credentials/updated` | emit | `credentials` | `credentials`（`events.dispatch`） | `apiproxy`、`credentials` | `packages/credentials/credentials/src/types.ts` [E: packages/credentials/credentials/src/types.ts:29] |
| `domain/changed` | emit | `storage-domain` | `storage-domain`（`emit`） | `apiproxy`、`storage-domain`、`workspace` | `packages/storage/storage-domain/src/events.ts` [E: packages/storage/storage-domain/src/events.ts:46] |
| `cordis/request-run` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `apiproxy` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:367] |
| `cordis/request-run-resolved` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `apiproxy` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:373] |
| `cordis/dynamic-package` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `apiproxy` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:379] |
| `cordis/dynamic-retract` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `apiproxy` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:385] |
| `cordis/inspect-query` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `apiproxy` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:391] |
| `cordis/inspect-query-resolved` | emit | `cordis-host-runner` | `cordis-host-runner`（`emit`） | `apiproxy` | `packages/extensions/cordis-host-runner/src/types.ts` [E: packages/extensions/cordis-host-runner/src/types.ts:397] |

`apiproxy` 对 allowlist 做 `API_REMOTE_FORWARDED_EVENTS.map(name => ctx.on(name, ...))`，包进 `host/remote-event`。allowlist 是：`agent-preset/selected`、`commands/change`、`credentials/updated`、六个 `cordis/*`、`llm/adapters-updated`、`settings/document-updated`。另有手写 `ctx.on`：`session/event`、`session/created`、`session/disposed`、`agent/status`、`agent/error`、`approval/request`、`domain/changed`。[E: packages/api/remotes/src/remote-events.ts:18][E: packages/host/apiproxy/src/api-proxy.ts:3620]

## Non-harness · `internal/*`

官方 `docs/event-producer-consumer.md` 的 Non-harness 表列了 **4** 个在 package 源码里出现、但不是 harness `Events` merge 的字符串。声明与发射都在 vendored Cordis。`internal/dispatch` 只对**非** `internal/` 名字开火。[E: vendor/cordis/src/events.ts:168][E: vendor/cordis/src/events.ts:351]

| 事件名 | 模式 | 声明包 | dispatch | listen（host 产品 `src`） | 源 path |
|---|---|---|---|---|---|
| `internal/plugin` | emit | `vendor/cordis` | `fiber`（`context.emit`） | `loader`、`lsp-stdio`、`webserver` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:331] |
| `internal/status` | emit | `vendor/cordis` | `fiber`（`context.emit`） | `agent` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:333] |
| `internal/service` | emit | `vendor/cordis` | `reflect`（`events.emit`） | `agent-presets`、`gateway` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:341] |
| `internal/dispatch` | emit | `vendor/cordis` | `EventsService.dispatch`（非 internal 事件） | `commands`、`compaction`、`fs`、`goal`、`goal-round-driver`、`hook-protocol`、`llm-retry`、`permission-presets`、`plan-mode`、`sandbox-policy`、`schedule`、`scope`、`session`、`session-title`、`subagent`、`terminal-bash`、`time-context`、`tool-todo`、`tool-workflow`、`tools`、`user-approval`、`workflow` | `vendor/cordis/src/events.ts` [E: vendor/cordis/src/events.ts:351] |

`internal/status` 的 `agent` listen 用来在 ancestor fiber `UNLOADING` 时关掉 initiator。[E: packages/core/agent/src/index.ts:289]

`internal/dispatch` 的 listen 几乎全是各包 `invariant.ts`：核对 scope carrier 与 payload 主语是否同一对象。client 面另有 `runtime` / `hmr` / `modules` / `web` 的 `internal/*` listen，官方矩阵的 host 扫描不列它们。[I]

`fiber.emit('internal/plugin' | 'internal/status')` 与 `reflect` 的 `internal/service`：[E: vendor/cordis/src/fiber.ts:302][E: vendor/cordis/src/fiber.ts:586][E: vendor/cordis/src/reflect.ts:333]

## 对照 · 分家

**Cordis 事件 ≠ SessionEvent。** 同一会话上可以先 `session.append('turn/start', …)`（日志），再由 store 发 `session/event`（总线）。`agent/pre-step` 从不进 JSONL。完整日志词表在 [ref.session-events](session-events.md)；持久化折叠在 [spine.session-log](../spine/session-log.md)。

**scope-filtered vs 登记广播。** `agent/*`、`tools/pre-execute|execute|post-execute|result`、`approval/request`、`system-prompt/assemble`、`goal/changed`、`subagent/start|end` 带 `Scoped<…>` `this`。`tools/change`、`system-prompt/change`、`commands/change`、`skills/change`、`llm/adapters-updated` 是**不过滤**的登记通知：scoped listener 也会看到全局变更。

**无 listen 不是死事件。** `tools/change`、`skills/change`、`system-prompt/change`、`workflow/phase`、`workflow/log`、`agent-loop/config-start-failed`、`session-telemetry/record` 在冻结树产品 `src` 里没有 `ctx.on`。它们仍是扩展点 / UI 刷新钩；官方矩阵 listen 列为 `-`。

## Sources

- `docs/event-producer-consumer.md`
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
- `packages/fs/fs/src/index.ts`
- `packages/preset/agent-presets/src/types.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/interaction/user-approval/src/index.ts`
- `packages/interaction/commands/src/types.ts`
- `packages/extensions/cordis-host-runner/src/types.ts`
- `packages/credentials/credentials/src/types.ts`
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
- `packages/host/apiproxy/src/api-proxy.ts`
- `packages/sdk/server/src/server.ts`
- `vendor/cordis/src/events.ts`
- `vendor/cordis/src/fiber.ts`
- `vendor/cordis/src/reflect.ts`
- `packages/core/session/tests/scoped.spec.ts`
- `packages/core/agent-loop/tests/interception.spec.ts`

## 相关

- [spine.turn-and-step](../spine/turn-and-step.md) — 默认可替换 loop 何时 `waterfall` `agent/pre-step` / `agent/request`、`serial` `agent/turn-stopping`。
- [spine.tool-call-anatomy](../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute` 与 approval / timeout 挂点。
- [ref.session-events](session-events.md) — `SessionEventMap` 日志 type（不是本页的 Cordis 事件名）。
- [subsys.core.agent](../subsystems/core/agent.md) — `Agent` 合同、`agentEvents` / `emitAgentEvent`。
- [spine.session-log](../spine/session-log.md) — `append` → `session/event` → `deriveMessages` / checkpoint。
- [subsys.core.session](../subsystems/core/session.md) — `SessionStore`、`flush` 入口。
- [subsys.core.agent-loop](../subsystems/core/agent-loop.md) — 默认 driver 的 dispatch 调用点。
- [subsys.core.tools](../subsystems/core/tools.md) — 工具注册表与执行 waterfall。
- [subsys.vendor.cordis](../subsystems/vendor/cordis.md) — `EventsService` 五种 dispatch；waterfall 必须 `next()`。
