---
id: ref.session-events
title: SessionEvent 目录
kind: catalog
tier: T3
pkg: core
source:
  - packages/core/session/src/types.ts
  - packages/core/session/src/known-event-types.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/repair.ts
  - packages/core/agent/src/types.ts
  - packages/core/agent-loop/src/inbox.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/core/tools/src/types.ts
  - packages/core/tools/src/ptc.ts
  - packages/compaction/compaction/src/types.ts
  - packages/compaction/compaction-basic/src/region.ts
  - packages/compaction/compaction-tool-result-pruner/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/interaction/user-approval/src/types.ts
  - packages/interaction/commands/src/types.ts
  - packages/interaction/commands/src/index.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/preset/agent-presets/src/session.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/goal/goal/src/domain.ts
  - packages/goal/goal/src/index.ts
  - packages/hooks/hook-protocol/src/types.ts
  - packages/hooks/hook-protocol/src/events.ts
  - packages/sandbox/sandbox-policy/src/session-mode.ts
  - packages/schedule/schedule/src/types.ts
  - packages/schedule/schedule/src/tools.ts
  - packages/schedule/schedule/src/runtime.ts
  - packages/session/session-title/src/index.ts
  - packages/session/session-title/src/types.ts
  - packages/session/session-title-llm/src/index.ts
  - packages/session/session-persistence/src/errors.ts
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-format-catalog/src/generated.ts
  - packages/session/session-format-v2-to-v3/src/migration.ts
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-log-deepseek/src/types.ts
  - packages/session/session-log-deepseek/src/index.ts
  - packages/subagent/subagent/src/descriptor.ts
  - packages/subagent/subagent/src/catalog.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/subagent/subagent/src/continuation-activation.ts
  - packages/subagent/subagent-in-process-driver/src/index.ts
  - packages/subagent/tool-subagent/src/model-selection-state.ts
  - packages/workflow/tool-workflow/src/types.ts
  - packages/workflow/tool-workflow/src/index.ts
  - packages/llm/llm-retry/src/types.ts
  - packages/llm/llm-retry/src/index.ts
  - packages/web/web-search-deepseek/src/provider.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/feedback/command-feedback/src/types.ts
  - packages/feedback/command-feedback/src/index.ts
  - packages/feedback/message-feedback/src/types.ts
  - packages/feedback/message-feedback/src/index.ts
  - packages/fs/tool-present/src/types.ts
  - packages/fs/tool-present/src/index.ts
  - packages/todo/tool-todo/src/types.ts
  - packages/todo/tool-todo/src/index.ts
  - packages/api/session-controller/src/types.ts
  - packages/api/session-controller/src/agent.ts
  - packages/experimental/agent-team/src/types.ts
  - packages/experimental/agent-team/src/journal.ts
symbols:
  - SessionEventMap
  - KNOWN_SESSION_EVENT_TYPES
  - SurfaceEventType
  - SurfaceOp
  - SESSION_FORMAT_VERSION
related:
  - spine.session-log
  - subsys.core.session
  - ref.event-map
  - spine.turn-and-step
  - spine.context-and-compaction
  - subsys.core.agent-inbox
evidence: explicit
status: verified
updated: c291e7961a
---

> `SessionEventMap` 是 merge-extensible 的 append-only 会话日志词表：本仓每个 type 一份 `declare module '@deepseek-ai/dsh-session/types'`（或 `@deepseek-ai/dsh-session` 本体）声明。模型历史只从四类 `SurfaceEventType` 经 `surfaceOp` 折叠而来。这是 **host 面** `ctx.sessions` 的 durable 合同，不是 Cordis 运行时 `Events`。

## 能回答的问题

- 冻结树 `KNOWN_SESSION_EVENT_TYPES` 有哪些成员？每个 `data` 签什么、谁 `Session.append`？
- 哪四个 type 进 surface？`surfaceOp` 有没有 delete？compaction 写的是哪一种？
- `SESSION_FORMAT_VERSION` 现在是多少？v2→v3 迁了什么？新 header 谁盖这个戳？
- `ignorable` 缺省是什么？本仓产品 writer 会不会标 `true`？未知 type 怎么拒载？
- `SessionEvent` 日志变体和 Cordis harness 事件（`llm/stream` / `session/flush`）怎么分家？

## 范围与 ground truth

本页枚举**本仓已声明**的 `SessionEventMap` 键。查漏清单是生成物 `packages/core/session/src/known-event-types.ts` 的 `KNOWN_SESSION_EVENT_TYPES`（冻结树 **56** 个）；`[E]` 落到各 merge 声明的键行，或 `packages/core/session/src/types.ts` 本体键行，不把生成物或注释当证据。[I: packages/core/session/src/known-event-types.ts:22]

`[E]` 不指向 `docs/**`、`.agents/notes/**`、README、`AGENTS.md`。`packages/core/agent/src/inbox.ts` **已删除**；inbox splice 的实现是 `packages/core/agent-loop/src/inbox.ts` 的 `ReactLoopInbox`，声明仍在 `packages/core/agent/src/types.ts`。[E: packages/core/agent/src/types.ts:87][E: packages/core/agent-loop/src/inbox.ts:238]

和相邻节点的分工：

- [spine.session-log](../spine/session-log.md) 走 `append → foldSurface → deriveMessages` 与 checkpoint；本页不重写那条控制流。
- [subsys.core.session](../subsystems/core/session.md) 拥有 `Session` / `SessionStore` 生命周期；本页只列词表。
- [ref.event-map](event-map.md) 是 Cordis 运行时事件（`emit` / `waterfall` / `parallel`）。`session/event` 把一条已提交的 `SessionEvent` 广播出去；日志 type 本身不是 Cordis 事件名。
- [spine.turn-and-step](../spine/turn-and-step.md) 写 loop 何时打开 turn/step；[spine.context-and-compaction](../spine/context-and-compaction.md) 写 compaction 何时 `replace`；[subsys.core.agent-inbox](../subsystems/core/agent-inbox.md) 写 inbox 投影。

**host 面 vs agent-preset 面。** `SessionStore`（`ctx.sessions`）、shipped JSONL 持久化（`SessionHandle`）、`SESSION_FORMAT_VERSION` 校验、未知 type 拒载，都在 host / bundle。`dsh-session-persistence-sqlite` **已删除**。agent-preset 面决定该会话的 tools / persona / isolate，并把 preset id 写进 `SessionHeader.agentPreset` 或事后的 `agent-preset/selected`。preset 里挂上的插件（plan / hooks / todo / workflow / approval / present …）往**同一条** log 里 merge 并 append。宿主入口不只 `dsh web`：还有 `dsh --profile headless|sdk|sdk-minimal|acp`。四个 shipped preset 目录是 `minimal` / `standard` / `ptc` / `cordis`。`desktop` 不是 CLI profile。

下游仓可以再 merge 新 type。那些键不在 `KNOWN_SESSION_EVENT_TYPES` 里：load 时除非信封带 `ignorable: true`，否则 persistence 拒读。比当前更新的 format version 也拒。[E: packages/session/session-persistence/src/errors.ts:134][E: packages/session/session-persistence/src/errors.ts:135]

## 信封合同

`SessionEvent` 信封是 `{ type, seq, time, data, ignorable? }`，外加仅 `SurfaceEventType` 才允许的 `surfaceOp` / `sourceEventSeqs`。`data` 必须过 JSON 校验。[E: packages/core/session/src/types.ts:465][E: packages/core/session/src/types.ts:483]

`SESSION_FORMAT_VERSION = 3`。新 header 盖这个整数。JSONL load 经 `sessionFormatCatalog`（`currentVersion: 3`）做 **adjacent** 迁移：`session-format-v0-to-v1` → `session-format-v1-to-v2` → `session-format-v2-to-v3`。比 3 新的盘仍拒；没有「跳级」链。加普通事件 type **不** bump 版本，靠 `ignorable` 覆盖词表增长。[E: packages/core/session/src/types.ts:88][E: packages/session/session-format-catalog/src/generated.ts:15][E: packages/session/session-persistence-jsonl/src/index.ts:263]

v2→v3 把 header / `agent-preset/selected` 里精确匹配的 preset id `code` 改成 `ptc`，并在首个 `step/start` 后插入 synthetic 空 `system/message`；精确标签 `tool/code-dispatch*` 改成 `tool/ptc-dispatch*`。[E: packages/session/session-format-v2-to-v3/src/migration.ts:18][E: packages/session/session-format-v2-to-v3/src/migration.ts:73][E: packages/session/session-format-v2-to-v3/src/migration.ts:143][E: packages/session/session-format-v2-to-v3/src/migration.ts:146]

`EpochHeader` 只有 `config` / `adapterDefaults?` / `tools?`，**不再带 `system` 字符串**。系统提示是 derived history：surface 节点上的 `system/message`。[E: packages/core/session/src/types.ts:232][E: packages/core/session/src/types.ts:234][E: packages/core/session/src/types.ts:238]

`SurfaceEventType` **只有** `system/message`、`user/message`、`assistant/message`、`tool/result`。运行时集合与类型别名同一组四元。`assistant/message` **内嵌** compact `stream`，不再用 `sourceEventSeqs` 引用 chunk。[E: packages/core/session/src/types.ts:412][E: packages/core/session/src/types.ts:413][E: packages/core/session/src/types.ts:414][E: packages/core/session/src/types.ts:415][E: packages/core/session/src/types.ts:416][E: packages/core/session/src/surface.ts:23][E: packages/core/session/src/surface.ts:24][E: packages/core/session/src/surface.ts:25][E: packages/core/session/src/surface.ts:26]

`SurfaceOp` **只有**两种：`'append'`，以及 `{ op: 'replace', startSeq, endSeq }`（闭区间；**不是**旧字段 `start` / `end`）。**没有 delete。** compaction 的 surface 动作是 replace；`compaction/*` 自己是 log-only。[E: packages/core/session/src/types.ts:434][E: packages/compaction/compaction-basic/src/region.ts:492][E: packages/compaction/compaction-tool-result-pruner/src/index.ts:172]

`ignorable?: true`。缺省 = **required**。`Session.append` 热路径不写该字段。56 个 shipped type 落盘时 ignorable 默认全是 **否**。[E: packages/core/session/src/types.ts:483]

`eventAt()` / `snapshotEvents()` / `ownEvents()` 标 `@deprecated`：存量可读，**禁止新增生产调用**。投影用 `deriveMessages()`。[E: packages/core/session/src/index.ts:623][E: packages/core/session/src/index.ts:637][E: packages/core/session/src/index.ts:654][E: packages/core/session/src/index.ts:832]

## 实例表

列：type · data 签名 · surface（仅四元）· ignorable 默认 · 谁 append · 含义 · 源 path（merge 声明键行）。组内每个 `KNOWN_SESSION_EVENT_TYPES` 成员都有行。

### Loop 边界与 surface

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `turn/start` | `{ turn: number }` | 否 | 否 | `ReactLoopAgent.turn` | 打开 turn；可能随后 0 个 step | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:276] |
| `turn/end` | `{ turn: number; reason: TurnEndReason }`（`completed` / `aborted` / `blocked` / `error` / `max-tokens` / `interrupted`） | 否 | 否 | `ReactLoopAgent.turn` 的 `finally`；crash reload 由 `interruptedTurnClosers` 合成 `reason.kind: 'interrupted'`，AgentLoop `handle.append(closers)` 后再 `sessions.prepare(..., eventState)` 并进 seed | 关闭 turn；loop 自己不写 `interrupted` | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:285] |
| `step/start` | `{ turn: number; step: number }` | 否 | 否 | `ReactLoopAgent.turn` 在 `preStep` 接受之后 | 一个模型调用 + 它点名的 tool | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:287] |
| `step/end` | `{ turn: number; step: number }` | 否 | 否 | `ReactLoopAgent.turn` 的 step `finally`；reload 也可由 `interruptedTurnClosers` 补 | 合上开着的 step | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:289] |
| `system/message` | `{ turn; step; message: SystemMessage }` | 是 | 否 | `ReactLoopAgent`：首个作为 surface 节点 0；空 content 投影为无 wire message（「无 system prompt」占位） | 渲染后的系统提示；进 derived history | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:310] |
| `user/message` | `UserMessage`（`role: 'user'` + `content` + `source`） | 是 | 否 | `ReactLoopAgent`：`surfaceOp: 'append'`（inbox 声明的 human / `inject` / goal 续轮）；`compaction-basic`：`surfaceOp: { op: 'replace', startSeq, endSeq }` | 唯一进模型的 user 角色原文；`source` 区分来源 | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:297] |
| `assistant/attempt` | `{ turn; step; stream: AssistantStreamRecord[] }` | 否 | 否 | `ReactLoopAgent.step`：失败 / 重试 / 取消 / stream-error 且不进 surface | 一次未成 message 的模型 attempt；内嵌 compact stream | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:335] |
| `assistant/message` | `{ turn; step; message: AssistantMessage; stream; usage?; interrupted?: true }` | 是 | 否 | `ReactLoopAgent.step`：完成路径 `surfaceOp: 'append'`；取消且有可见前缀时带 `interrupted: true` | 组装后的 assistant；stream 内嵌，不再引用 chunk seq | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:321] |
| `tool/call` | `{ turn; step; callId: ToolCallId; name: string; arguments: string }` | 否 | 否 | `appendToolCall`（dispatch 前） | `arguments` 是模型原文 JSON 字符串 | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:341] |
| `tool/result` | `{ turn; step; message: ToolResultMessage; error?: { name; code }; meta?: JsonValue }` | 是 | 否 | `appendToolResult`：`surfaceOp: 'append'`；pruner：`replace` 且 `startSeq === endSeq`；reload 可合成 `TOOL_NOT_STARTED` / `TOOL_OUTCOME_UNKNOWN` | 模型可见 tool 结果；`meta` 须 JSON | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:353] |

`ReactLoopAgent` 的边界 append：`turn/start`、`step/start`、`step/end`、`turn/end`、`system/message`、`user/message`、失败路径上的 `assistant/attempt`。[E: packages/core/agent-loop/src/agent.ts:278][E: packages/core/agent-loop/src/agent.ts:302][E: packages/core/agent-loop/src/agent.ts:371][E: packages/core/agent-loop/src/agent.ts:375]

`tool/call` / 常规 `tool/result`：`packages/core/agent-loop/src/tool-calls.ts`。[E: packages/core/agent-loop/src/tool-calls.ts:264][E: packages/core/agent-loop/src/tool-calls.ts:282]

crash 合成 `tool/result` + `step/end` + `turn/end`（`interrupted`）在 `interruptedTurnClosers`，拼进 `sessions.prepare` 的 seed（`[...persisted, ...closers]`），不是 loop 热路径。[E: packages/core/session/src/repair.ts:29][E: packages/core/session/src/repair.ts:111][E: packages/core/session/src/repair.ts:133]

空 `system/message` / 空 `assistant/message` 不投影成 wire message。[E: packages/core/session/src/surface.ts:113][E: packages/core/session/src/surface.ts:114]

### 请求重建与 seed

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `request/header` | `{ header: EpochHeader; reason: RequestHeaderReason; startsSeries?: true }`（`initial` / `resume` / `change` / `series`） | 否 | 否 | `ReactLoopAgent.buildRequest`：本 loop 实例第一条用 `initial` 或 `resume`；header 变了用 `change`（可带 `startsSeries`）；header 未变但要开新 series 用 `series` | 最新一份重建下一请求的 config / adapterDefaults / tools（**无** `system` 字段） | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:365] |
| `request/context` | `RequestContext`（`provider`, `model`, `contextWindow?`, `systemPromptUpdate?`） | 否 | 否 | `ReactLoopAgent.buildRequest`，仅当 route、window 或 system-prompt 更新模式相对上一份变了 | 路由元数据；不参与 header 相等比较 | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:377] |
| `session/end-seed` | `{ inherited?: true }` | 否 | 否 | **只有** `Session` 构造器：seed 存在且末条还不是本 type 时写一次 | 标 live 切点；fork 子可带 `inherited: true` | `packages/core/session/src/types.ts` [E: packages/core/session/src/types.ts:400] |

`request/header` / `request/context` 的 append 在 `buildRequest`。[E: packages/core/agent-loop/src/agent.ts:571][E: packages/core/agent-loop/src/agent.ts:574][E: packages/core/agent-loop/src/agent.ts:580][E: packages/core/agent-loop/src/agent.ts:597]

`session/end-seed` 的唯一合法 writer 是构造器。插件若手写一条，会把该点之前的 live 区间全部错判成 seed。[E: packages/core/session/src/index.ts:607][E: packages/core/session/src/index.ts:609]

### Inbox、preset、模型选择

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `agent/inbox/spliced` | `{ target: InboxTarget; start: number; removedCount?: number; inserted: UserMessage[]; outcome?: 'canceled' }`（`InboxTarget` = `'next-turn' \| 'next-step'`） | 否 | 否 | `ReactLoopInbox` 在改投影**之前** | 队列突变的 durable 记录；observer 此时仍能读到被摘掉的消息 | `packages/core/agent/src/types.ts` [E: packages/core/agent/src/types.ts:87] |
| `agent-preset/selected` | `{ agentPreset: string }` | 否 | 否 | `AgentPresetService` 在 `recompose` 成功之后 | 空白会话事后换 preset；投影读 last-wins，不单靠 header | `packages/preset/agent-presets/src/session.ts` [E: packages/preset/agent-presets/src/session.ts:28] |
| `model/selection` | `ModelSelection`（`provider`, `model`, `reasoningEffort?`） | 否 | 否 | session-controller `selectForNextRequest` | 下一次 prompt 组装要用的已校验模型选择；不进 derived history | `packages/api/session-controller/src/types.ts` [E: packages/api/session-controller/src/types.ts:40] |

inbox splice 先 `append` 再改投影。[E: packages/core/agent-loop/src/inbox.ts:238]

preset 选择只在 swap 提交后落盘。[E: packages/preset/agent-presets/src/index.ts:748]

`model/selection` 写点。[E: packages/api/session-controller/src/agent.ts:327]

### Compaction（log-only 计量；surface 另写 replace）

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `compaction/start` | `{ compactionId: CompactionId; sourceCommandId?: CommandId; turn: number \| null }` | 否 | 否 | `compaction-basic` 开事务 | 持锁；`turn: null` 是 turn 之间的手工事务 | `packages/compaction/compaction/src/types.ts` [E: packages/compaction/compaction/src/types.ts:24] |
| `compaction/summary` | `{ compactionId; sourceCommandId?; summary; shadowedRange; shadowedSeqs; shadowedTokenCount; provider; model; maxTokens?; usage? }` 加 `llmStreamCall: true`+`rawOutput` 或未标记 summarizer | 否 | 否 | `commitCompactionBody` | 摘要与影子价格；紧跟着的 `user/message` replace 才改 surface | `packages/compaction/compaction/src/types.ts` [E: packages/compaction/compaction/src/types.ts:34] |
| `compaction/end` | `{ compactionId; sourceCommandId?; turn: number \| null; error?: string }` | 否 | 否 | 成功路径或 catch 里带 `error` | 放锁 | `packages/compaction/compaction/src/types.ts` [E: packages/compaction/compaction/src/types.ts:72] |
| `compaction/prune` | `{ shadowedRange: { start; end }; shadowedSeqs: number[]; shadowedTokenCount: number }` | 否 | 否 | `compaction-tool-result-pruner`，与下一条 `tool/result` replace **同步相邻** | 无模型 prune 的影子价格 | `packages/compaction/compaction/src/types.ts` [E: packages/compaction/compaction/src/types.ts:82] |

start / end / summary / 紧随的 `user/message` replace 在 `region.ts`。[E: packages/compaction/compaction-basic/src/region.ts:210][E: packages/compaction/compaction-basic/src/region.ts:236][E: packages/compaction/compaction-basic/src/region.ts:476][E: packages/compaction/compaction-basic/src/region.ts:492]

prune + `tool/result` replace 在 pruner。[E: packages/compaction/compaction-tool-result-pruner/src/index.ts:163][E: packages/compaction/compaction-tool-result-pruner/src/index.ts:168]

### Approval、permission、sandbox

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `approval/asked` | `{ id: ApprovalRequestId; toolName: string; callId?: ToolCallId; reason?: string }` | 否 | 否 | `ApprovalService.request` | 审计问句；与 `decided` 靠 `id` 成对 | `packages/interaction/user-approval/src/types.ts` [E: packages/interaction/user-approval/src/types.ts:44] |
| `approval/decided` | `{ id: ApprovalRequestId; outcome: ApprovalOutcome }` | 否 | 否 | 同一次 `request`，outcome 已知后 | 每个 asked 恰好一条（含 cancel / `'unavailable'`） | `packages/interaction/user-approval/src/types.ts` [E: packages/interaction/user-approval/src/types.ts:55] |
| `approval/policy` | `{ policy: ApprovalPolicy; source?: 'delegation' }`（`ask` / `never`） | 否 | 否 | `setApprovalPolicy`（无 `source`）；子 agent 带 `source: 'delegation'` | last-wins override；模型从 runtime-context 得知 | `packages/interaction/user-approval/src/index.ts` [E: packages/interaction/user-approval/src/index.ts:33] |
| `permission/preset` | `{ preset: string }` | 否 | 否 | `PermissionPresetService.apply` / pin | 用户选的 preset 名；随后才写 sandbox / approval 旋钮 | `packages/interaction/permission-presets/src/index.ts` [E: packages/interaction/permission-presets/src/index.ts:54] |
| `sandbox/mode` | `{ mode: SandboxMode; source?: 'delegation' }`（`read-only` / `workspace-write` / `danger-full-access`） | 否 | 否 | `setSandboxMode`；delegation 路径带 `source` | last-wins sandbox override | `packages/sandbox/sandbox-policy/src/session-mode.ts` [E: packages/sandbox/sandbox-policy/src/session-mode.ts:33] |

asked / decided / 运行时 policy：[E: packages/interaction/user-approval/src/index.ts:218][E: packages/interaction/user-approval/src/index.ts:225][E: packages/interaction/user-approval/src/index.ts:97]

delegation 往**子** session 写 sandbox + approval。[E: packages/subagent/subagent/src/child-agent.ts:263][E: packages/subagent/subagent/src/child-agent.ts:266]

permission / sandbox 运行时写点：[E: packages/interaction/permission-presets/src/index.ts:389][E: packages/sandbox/sandbox-policy/src/session-mode.ts:54]

### Command、hook、feedback、deliverables

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `command/run` | `{ commandId: CommandId; name: string; args?: string; source: CommandSource }` | 否 | 否 | `CommandService.execute` 在 handler 之前（`appendLifecycle`） | 人命令进 handler；`recordInput: false` 时省略 `args` | `packages/interaction/commands/src/types.ts` [E: packages/interaction/commands/src/types.ts:105] |
| `command/done` | `{ commandId; kind: 'success' \| 'error'; text?: string; sourceEventSeq?: number }` | 否 | 否 | handler settle 之后（抛错路径也尽量写） | 与 `run` 靠 `commandId` 配对 | `packages/interaction/commands/src/types.ts` [E: packages/interaction/commands/src/types.ts:112] |
| `hook/invoked` | `{ turn: number; point: string; dialect: HookDialect; matcher?: string; handlerId: string }`（`claude-code` / `codex`） | 否 | 否 | `appendHookInvoked` | 某 hook 点真正调了命令 | `packages/hooks/hook-protocol/src/types.ts` [E: packages/hooks/hook-protocol/src/types.ts:19] |
| `hook/result` | `{ turn; point; handlerId; decision: string; exitCode?; stderrSummary?; durationMs: number }` | 否 | 否 | `appendHookResult` | 与 invoked 靠 `handlerId` 配对 | `packages/hooks/hook-protocol/src/types.ts` [E: packages/hooks/hook-protocol/src/types.ts:31] |
| `feedback/record` | `FeedbackRecord`（`text?` + `category?`；两者都可缺） | 否 | 否 | `recordFeedback` | 人写的**会话级**评语；不进模型 | `packages/feedback/command-feedback/src/types.ts` [E: packages/feedback/command-feedback/src/types.ts:40] |
| `feedback/message-put` | `MessageFeedbackPut`（`sessionId` + 完整 `item`） | 否 | 否 | `dsh-message-feedback` live `append` / cold handle | 一条 assistant 消息的当前评分；**进 Session log**，不是 sidecar | `packages/feedback/message-feedback/src/types.ts` [E: packages/feedback/message-feedback/src/types.ts:56] |
| `feedback/message-delete` | `MessageFeedbackDelete`（`sessionId` + `messageId`） | 否 | 否 | 同上 | 删除当前评分；更早 put 仍留在 log | `packages/feedback/message-feedback/src/types.ts` [E: packages/feedback/message-feedback/src/types.ts:58] |
| `deliverables/presented` | `{ turn; callId: ToolCallId; files: PresentedFile[] }` | 否 | 否 | `tool-present` 在 `tools/result` 且**非 error** 之后 | `present` 成功交付的文件清单；不进 derived history | `packages/fs/tool-present/src/types.ts` [E: packages/fs/tool-present/src/types.ts:15] |

command lifecycle：[E: packages/interaction/commands/src/index.ts:373][E: packages/interaction/commands/src/index.ts:380]

hook helpers：[E: packages/hooks/hook-protocol/src/events.ts:76][E: packages/hooks/hook-protocol/src/events.ts:95]

会话级 feedback：[E: packages/feedback/command-feedback/src/index.ts:60]

消息级 feedback 写点（live 路径随后 `sessions.flush`）：[E: packages/feedback/message-feedback/src/index.ts:196][E: packages/feedback/message-feedback/src/index.ts:212]

`present` 成功后 append：[E: packages/fs/tool-present/src/index.ts:104]

### Plan、goal、schedule、todo

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `plan/mode` | `{ active: boolean }` | 否 | 否 | `PlanModeController` | last-wins；无事件 = 未激活 | `packages/plan/plan-mode/src/index.ts` [E: packages/plan/plan-mode/src/index.ts:47] |
| `goal/change` | `GoalChangeMeta`（`version: 1`；非 clear 带整份 `GoalSnapshot`；`operation: 'clear'` 带 tombstone） | 否 | 否 | `GoalService.commit` | 目标状态的整份快照或清除 | `packages/goal/goal/src/domain.ts` [E: packages/goal/goal/src/domain.ts:66] |
| `schedule/change` | `ScheduleChange`：`create` / `delete` / `dispatch`（`every` dispatch 带 `acceptedAt`） | 否 | 否 | `schedule_create` / `schedule_delete`；runtime 写 `dispatch` | 会话内提醒的版本化变迁 | `packages/schedule/schedule/src/types.ts` [E: packages/schedule/schedule/src/types.ts:219] |
| `todo/write` | `{ todos: TodoItem[] }`（`content` + `status: pending \| in_progress \| completed`） | 否 | 否 | `todo_write` execute（必须有 owning agent） | 整表快照，last-write-wins；不进 `deriveMessages` | `packages/todo/tool-todo/src/types.ts` [E: packages/todo/tool-todo/src/types.ts:31] |

plan / goal / schedule / todo 写点：[E: packages/plan/plan-mode/src/index.ts:429][E: packages/goal/goal/src/index.ts:613][E: packages/schedule/schedule/src/tools.ts:383][E: packages/schedule/schedule/src/tools.ts:445][E: packages/schedule/schedule/src/runtime.ts:282][E: packages/todo/tool-todo/src/index.ts:210]

### PTC 与 workflow

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `tool/ptc-dispatch-start` | `PtcDispatchStartEventData`（`rootCallId`, `parentCallId`, `subCallId`, `name`, `arguments`） | 否 | 否 | `run_code` 调度器真正 **start** 子调用时（队列里放弃的不写） | 嵌套 dispatch 开始；`deriveMessages` 忽略。v2 盘上的 `tool/code-dispatch-start` 由 v2→v3 改名 | `packages/core/tools/src/types.ts` [E: packages/core/tools/src/types.ts:40] |
| `tool/ptc-dispatch` | `PtcDispatchEventData`（start 字段 + `isError` + `content`） | 否 | 否 | 子调用 settle（含 abort 的 `isError`） | 与 start 靠 `subCallId` 配对；子调用不回灌模型上下文 | `packages/core/tools/src/types.ts` [E: packages/core/tools/src/types.ts:56] |
| `tool-workflow/run-start` | `{ runId: WorkflowRunId; name: string }` | 否 | 否 | `createWorkflowRecorder().start` | 打开一条顶层 workflow 记录 | `packages/workflow/tool-workflow/src/types.ts` [E: packages/workflow/tool-workflow/src/types.ts:47] |
| `tool-workflow/agent-start` | `{ runId; seq: number; label: string; phase?: string; childId: SessionId }` | 否 | 否 | `workflow/agent-start` 监听者 | 子 Session 发布后的成员 | `packages/workflow/tool-workflow/src/types.ts` [E: packages/workflow/tool-workflow/src/types.ts:52] |
| `tool-workflow/agent-end` | `{ runId; seq: number; outcome: WorkflowAgentOutcome }` | 否 | 否 | `workflow/agent-end` 监听者 | 成员结算 | `packages/workflow/tool-workflow/src/types.ts` [E: packages/workflow/tool-workflow/src/types.ts:57] |
| `tool-workflow/run-end` | `{ runId; stopReason: WorkflowStopReason }` | 否 | 否 | `recorder.finish` | 资源静默后关记录 | `packages/workflow/tool-workflow/src/types.ts` [E: packages/workflow/tool-workflow/src/types.ts:62] |

PTC 权威文件 `ptc.ts`；日志 type **现名** `tool/ptc-dispatch*`。先 start 再 settle。[E: packages/core/tools/src/ptc.ts:534][E: packages/core/tools/src/ptc.ts:509]

workflow 记录失败只 `warn`，不让 tool 失败。[E: packages/workflow/tool-workflow/src/index.ts:86][E: packages/workflow/tool-workflow/src/index.ts:104][E: packages/workflow/tool-workflow/src/index.ts:114][E: packages/workflow/tool-workflow/src/index.ts:119][E: packages/workflow/tool-workflow/src/index.ts:125]

### Subagent

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `subagent/descriptor` | `SubagentDescriptorData`：公共 `version` / `mode` / `provider` / 可选 `label`；continuable 另带组成字段（当前 `SUBAGENT_DESCRIPTOR_VERSION = 3`） | 否 | 否 | continuable：`continuation-activation` 在创建 seed 里写；one-shot in-process：`agent/pre-step` 第一次 `enter` | 子会话身份与可否冷恢复；无 `surfaceOp`，compaction 也留着 | `packages/subagent/subagent/src/descriptor.ts` [E: packages/subagent/subagent/src/descriptor.ts:38] |
| `subagent/catalog` | `SubagentCatalogEvent`（`version: 0` + `childId` + `childCreatedAt` + `mode` + 可选 `label`） | 否 | 否 | 父 session 在登记直接孩子时 | 父拥有的发现事实；`SUBAGENT_CATALOG_VERSION = 0` | `packages/subagent/subagent/src/catalog.ts` [E: packages/subagent/subagent/src/catalog.ts:40] |
| `subagent/model-selection-policy` | `{ allowedModels: AllowedModelRoute[] }` | 否 | 否 | `tool-subagent` 在第一次模型请求前 | 子 agent 可选的 provider/model 路由；缺席 = 固定路由定义 | `packages/subagent/tool-subagent/src/model-selection-state.ts` [E: packages/subagent/tool-subagent/src/model-selection-state.ts:17] |

continuable seed 与 one-shot 热路径是两条 append。[E: packages/subagent/subagent/src/continuation-activation.ts:583][E: packages/subagent/subagent-in-process-driver/src/index.ts:87]

descriptor 版本戳。[E: packages/subagent/subagent/src/descriptor.ts:48]

catalog 写点与版本戳。[E: packages/subagent/subagent/src/catalog.ts:21][E: packages/subagent/subagent/src/catalog.ts:141]

model-selection policy 写点。[E: packages/subagent/tool-subagent/src/model-selection-state.ts:78]

### Title、search、retry、DeepSeek session log

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `session/title` | `SessionTitleEventData`（`title`, `messageSeqs`, `source.kind`: `fallback` / `provider` / `user`） | 否 | 否 | `SessionTitleService`：用户 rename、provider 生成、deterministic fallback | latest-wins 标题；不进模型 | `packages/session/session-title/src/index.ts` [E: packages/session/session-title/src/index.ts:77] |
| `session/title-llm-request` | `SessionTitleLlmRequestEventData`（`titleProvider`, `messageSeqs`, `route`, `system`, `messages`, `maxTokens`） | 否 | 否 | title-llm 在辅助 `ctx.llm.stream` **之前** | 标题模型请求的 secret-free 原文 | `packages/session/session-title-llm/src/index.ts` [E: packages/session/session-title-llm/src/index.ts:45] |
| `web/deepseek-search-llm-request` | `DeepSeekSearchLlmRequest` | 否 | 否 | DeepSeek search provider 的 `recordRequest`：`agents.currentInitiator().session` | 辅助 search 请求；抛错则不 dispatch | `packages/web/web-search-deepseek/src/provider.ts` [E: packages/web/web-search-deepseek/src/provider.ts:83] |
| `llm/retry` | `LlmRetryEventData`：`mode: 'normal'` 带 `maxRetries`；`mode: 'always'` 不带 | 否 | 否 | `dsh-llm-retry` 在等待重试 delay **之前** | 一次已调度的 provider 重试 | `packages/llm/llm-retry/src/types.ts` [E: packages/llm/llm-retry/src/types.ts:9] |
| `llm/retry-started` | `{ retryId; turn; step; retry }` | 否 | 否 | delay 成功结束、下一次请求开始前 | 与 `llm/retry` 靠 `retryId` 配对 | `packages/llm/llm-retry/src/types.ts` [E: packages/llm/llm-retry/src/types.ts:11] |
| `session-log-deepseek/delivery-accepted` | `{ sessionId; sessionFormatVersion?; throughSeq }` | 否 | 否 | `dsh-session-log-deepseek` 的 `accept()`（HTTP 2xx 后） | 增量 `dsh_session_log` 字段的水位线 | `packages/session/session-log-deepseek/src/types.ts` [E: packages/session/session-log-deepseek/src/types.ts:81] |

title / search / retry / watermark 写点：[E: packages/session/session-title/src/index.ts:412][E: packages/session/session-title-llm/src/index.ts:264][E: packages/web/web-search-deepseek/src/index.ts:118][E: packages/llm/llm-retry/src/index.ts:188][E: packages/llm/llm-retry/src/index.ts:190][E: packages/session/session-log-deepseek/src/index.ts:185]

### Agent Teams（experimental；写在 Lead Session）

| type | data 签名 | surface | ignorable 默认 | 谁 append | 含义 | 源 path |
|---|---|---|---|---|---|---|
| `team/member` | `{ version: 2; teamId: TeamId; member: TeamMemberSnapshot }` | 否 | 否 | `TeamJournal.appendAndFlush` | 队友生命周期整值，只落 Lead | `packages/experimental/agent-team/src/types.ts` [E: packages/experimental/agent-team/src/types.ts:221] |
| `team/task` | `{ version: 2; teamId: TeamId; task: TeamTaskSnapshot }` | 否 | 否 | 同上 | 共享任务整值 | `packages/experimental/agent-team/src/types.ts` [E: packages/experimental/agent-team/src/types.ts:223] |
| `team/message/queued` | `{ version: 2; teamId: TeamId; message: TeamMessageSnapshot }` | 否 | 否 | 同上 | mailbox enqueue，交付尝试之前 | `packages/experimental/agent-team/src/types.ts` [E: packages/experimental/agent-team/src/types.ts:225] |
| `team/message/delivered` | `{ version: 2; teamId; messageId; targetId }` | 否 | 否 | 同上 | 目标 Session 已记下该消息 | `packages/experimental/agent-team/src/types.ts` [E: packages/experimental/agent-team/src/types.ts:227] |

Team 先 `append` 再 `sessions.flush`。载荷 `version` 现为 **2**。[E: packages/experimental/agent-team/src/journal.ts:69][E: packages/experimental/agent-team/src/journal.ts:70]

## 对照 / 分家

**日志 type ≠ Cordis 事件。** `turn/start` 是 log 里的一条 `SessionEvent`。`agent/pre-step`、`llm/stream`、`session/flush` 是 Cordis `Events`（waterfall 要 `next()`；`session/flush` 是 parallel）。一条 log append 提交后才 fire-and-forget `session/event`。完整运行时矩阵在 [ref.event-map](event-map.md)。

**surface 四元 vs 其余 52 个 log-only。** 只有 `system/message` / `user/message` / `assistant/message` / `tool/result` 能进 `deriveMessages()`。`todo/write`、`tool/call`、`assistant/attempt`、compaction 计量、hook/command 生命周期、Team / PTC 子调度、`deliverables/presented`、两类 feedback 全部不进模型历史。

**没有 delete。** 压缩与 prune 留下旧事件，用 `surfaceOp.replace`（`startSeq`/`endSeq`）换节点。人读 transcript（`isAppendSurfaceEvent`）继续看见当初 append 的原文。

**查漏。** 生成物 `KNOWN_SESSION_EVENT_TYPES` 在本 SHA 是 **56** 个键：相对上一轮（51），新增 `system/message`、`deliverables/presented`、`feedback/message-put`、`feedback/message-delete`、`subagent/catalog`；`tool/code-dispatch*` 改名为 `tool/ptc-dispatch*`。本页按声明文件重列，不把生成表当证据。[I: packages/core/session/src/known-event-types.ts:22]

## Sources

- `packages/core/session/src/types.ts`
- `packages/core/session/src/known-event-types.ts`
- `packages/core/session/src/surface.ts`
- `packages/core/session/src/index.ts`
- `packages/core/session/src/repair.ts`
- `packages/core/agent/src/types.ts`
- `packages/core/agent-loop/src/inbox.ts`
- `packages/core/agent-loop/src/agent.ts`
- `packages/core/agent-loop/src/tool-calls.ts`
- `packages/core/tools/src/types.ts`
- `packages/core/tools/src/ptc.ts`
- `packages/compaction/compaction/src/types.ts`
- `packages/compaction/compaction-basic/src/region.ts`
- `packages/compaction/compaction-tool-result-pruner/src/index.ts`
- `packages/interaction/user-approval/src/index.ts`
- `packages/interaction/user-approval/src/types.ts`
- `packages/interaction/commands/src/types.ts`
- `packages/interaction/commands/src/index.ts`
- `packages/interaction/permission-presets/src/index.ts`
- `packages/plan/plan-mode/src/index.ts`
- `packages/preset/agent-presets/src/session.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/goal/goal/src/domain.ts`
- `packages/goal/goal/src/index.ts`
- `packages/hooks/hook-protocol/src/types.ts`
- `packages/hooks/hook-protocol/src/events.ts`
- `packages/sandbox/sandbox-policy/src/session-mode.ts`
- `packages/schedule/schedule/src/types.ts`
- `packages/schedule/schedule/src/tools.ts`
- `packages/schedule/schedule/src/runtime.ts`
- `packages/session/session-title/src/index.ts`
- `packages/session/session-title/src/types.ts`
- `packages/session/session-title-llm/src/index.ts`
- `packages/session/session-persistence/src/errors.ts`
- `packages/session/session-persistence/src/index.ts`
- `packages/session/session-format-catalog/src/generated.ts`
- `packages/session/session-format-v2-to-v3/src/migration.ts`
- `packages/session/session-persistence-jsonl/src/index.ts`
- `packages/session/session-log-deepseek/src/types.ts`
- `packages/session/session-log-deepseek/src/index.ts`
- `packages/subagent/subagent/src/descriptor.ts`
- `packages/subagent/subagent/src/catalog.ts`
- `packages/subagent/subagent/src/child-agent.ts`
- `packages/subagent/subagent/src/continuation-activation.ts`
- `packages/subagent/subagent-in-process-driver/src/index.ts`
- `packages/subagent/tool-subagent/src/model-selection-state.ts`
- `packages/workflow/tool-workflow/src/types.ts`
- `packages/workflow/tool-workflow/src/index.ts`
- `packages/llm/llm-retry/src/types.ts`
- `packages/llm/llm-retry/src/index.ts`
- `packages/web/web-search-deepseek/src/provider.ts`
- `packages/web/web-search-deepseek/src/index.ts`
- `packages/feedback/command-feedback/src/types.ts`
- `packages/feedback/command-feedback/src/index.ts`
- `packages/feedback/message-feedback/src/types.ts`
- `packages/feedback/message-feedback/src/index.ts`
- `packages/fs/tool-present/src/types.ts`
- `packages/fs/tool-present/src/index.ts`
- `packages/todo/tool-todo/src/types.ts`
- `packages/todo/tool-todo/src/index.ts`
- `packages/api/session-controller/src/types.ts`
- `packages/api/session-controller/src/agent.ts`
- `packages/experimental/agent-team/src/types.ts`
- `packages/experimental/agent-team/src/journal.ts`

## 相关

- [spine.session-log](../spine/session-log.md) — append-only log、`deriveMessages`、`surfaceOp`、checkpoint 落点。
- [subsys.core.session](../subsystems/core/session.md) — `Session` / `SessionStore`、header 深冻、seed / fork / repair。
- [ref.event-map](event-map.md) — Cordis 运行时事件生产消费图（不是本页的 `SessionEvent` 词表）。
- [spine.turn-and-step](../spine/turn-and-step.md) — 默认可替换 loop 何时写 `turn/*` / `step/*` / inbox claim。
- [spine.context-and-compaction](../spine/context-and-compaction.md) — compaction 何时 append `compaction/*` 再 `replace` surface。
- [subsys.core.agent-inbox](../subsystems/core/agent-inbox.md) — `agent/inbox/spliced` 与 `followup` / `steer` / `inject`。
