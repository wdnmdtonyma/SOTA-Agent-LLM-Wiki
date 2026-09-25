---
id: subsys.coding-agent.extension-runner
title: 扩展执行引擎与事件分发
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/agent/src/agent-loop.ts
  - packages/coding-agent/docs/extensions.md
symbols:
  - bindCore
  - emitBoundary
  - emitProjectTrustEvent
  - emitToolCall
  - emitInput
  - emitCacheWarmingDecision
  - snapshotEventHandlers
related:
  - spine.extension-lifecycle
  - surface.extensions.events
  - ref.coding-agent.extension-events
evidence: explicit
status: verified
updated: ff72faba28
---

> `ExtensionRunner` 是 pi-coding-agent 的扩展执行引擎: 它把 loader 产出的 extensions 和 shared runtime 绑定到当前会话, 构造 `ExtensionContext`, 并按事件类型顺序调用 extension handlers。可行动边界走 `emitBoundary()`;`pi.on()` 返回的 unsubscribe 只影响之后的 dispatch。

## 能回答的问题

- `bindCore()` 具体把哪些 session action 和 context action 绑定进 extension runtime?
- `emitBoundary()` 怎样组合 `turn_end` / `agent_before_settle` 的 `entries` 和 `continue`?
- 通用 `emit()` 和 `emitToolCall()`、`emitInput()`、`emitCacheWarmingDecision()` 的短路/聚合规则有什么不同?
- `pi.on()` 返回的 unsubscribe 为什么不会打乱正在进行的 dispatch?
- `agent_settled` 期间调用 `prompt()` 为什么看不到重入的 `agent_start`?
- reload/session replacement 后旧 extension context 为什么会变 stale?

## 职责边界

`ExtensionRunner` 不负责发现或导入 extension 文件;它的 constructor 只接收已经加载好的 `Extension[]`、`ExtensionRuntime`、`cwd`、`SessionManager` 和 `ModelRegistry`。[E: packages/coding-agent/src/core/extensions/runner.ts:387] [E: packages/coding-agent/src/core/extensions/runner.ts:389] 发现、import、factory 执行属于 `subsys.coding-agent.extension-loader`;本节点只覆盖 runner 如何消费 loader 的结果并驱动事件分发 [I]。

`bindCore()` 把 session 提供的 action functions 复制进 shared runtime, 并把 context actions 存到 runner 私有字段。[E: packages/coding-agent/src/core/extensions/runner.ts:402] [E: packages/coding-agent/src/core/extensions/runner.ts:412] [E: packages/coding-agent/src/core/extensions/runner.ts:428] `createContext()` 每次调用创建一个带 lazy getters 的 `ExtensionContext`。[E: packages/coding-agent/src/core/extensions/runner.ts:809]

## 关键文件

- `packages/coding-agent/src/core/extensions/runner.ts`: `ExtensionRunner`、`emitBoundary()`、`emitCacheWarmingDecision()`、`snapshotEventHandlers()`、顶层 helper `emitSessionShutdownEvent()` / `emitProjectTrustEvent()`。[E: packages/coding-agent/src/core/extensions/runner.ts:254] [E: packages/coding-agent/src/core/extensions/runner.ts:265] [E: packages/coding-agent/src/core/extensions/runner.ts:291] [E: packages/coding-agent/src/core/extensions/runner.ts:928] [E: packages/coding-agent/src/core/extensions/runner.ts:1020]
- `packages/coding-agent/src/core/extensions/loader.ts`: `pi.on()` 的 unsubscribe 实现。[E: packages/coding-agent/src/core/extensions/loader.ts:256]
- `packages/coding-agent/src/core/agent-session.ts`: `turn_end` / `agent_before_settle` 的 host dispatch,以及 `agent_settled` 延迟重入。

## 数据模型

`ExtensionRunner` 保存 `extensions`、shared `runtime`、`uiContext`、`mode`、`cwd`、`sessionManager`、`modelRegistry` 和 error listeners;未绑定前多数 context/action 字段都有 no-op 或安全默认值。[E: packages/coding-agent/src/core/extensions/runner.ts:354] [E: packages/coding-agent/src/core/extensions/runner.ts:356] `noOpUIContext` 让 print/headless 场景下 `select()` 返回 `undefined`、`confirm()` 返回 `false`、`setTheme()` 返回失败对象。[E: packages/coding-agent/src/core/extensions/runner.ts:320] [E: packages/coding-agent/src/core/extensions/runner.ts:321] [E: packages/coding-agent/src/core/extensions/runner.ts:348]

`RunnerEmitEvent` 是通用 `emit()` 能处理的 event subset;它显式排除 ToolCall、ProjectTrust、ToolResult、UserBash、Context、ContextWithSystem、CacheWarmingDecision、BeforeProviderRequest、BeforeProviderHeaders、BeforeAgentStart、MessageEnd、ResourcesDiscover、Input、**TurnEnd** 和 **AgentBeforeSettle**,因为这些事件有专用 emitter。[E: packages/coding-agent/src/core/extensions/runner.ts:172] [E: packages/coding-agent/src/core/extensions/runner.ts:179] [E: packages/coding-agent/src/core/extensions/runner.ts:187] [E: packages/coding-agent/src/core/extensions/runner.ts:188] `session_before_*` 被抽成 `SessionBeforeEvent`,通用 `emit()` 会读取它们的 cancel result。[E: packages/coding-agent/src/core/extensions/runner.ts:191] [E: packages/coding-agent/src/core/extensions/runner.ts:997]

`BoundaryResult` 是 `{ entries?: SessionBoundaryDraft[]; continue?: boolean }`。draft 为 `custom` / `custom_message` / `context_edit` / `compaction`。[E: packages/coding-agent/src/core/extensions/types.ts:827] [E: packages/coding-agent/src/core/extensions/types.ts:806]

## 控制流

1. `ExtensionRunner.constructor@runner.ts:387` 只保存 loader/runtime/session/model 参数, 并把 UI context 初始化为 `noOpUIContext`。[E: packages/coding-agent/src/core/extensions/runner.ts:387] [E: packages/coding-agent/src/core/extensions/runner.ts:396]
2. `bindCore@runner.ts:402` 复制 action methods 到 shared runtime,包括 `sendMessage`、`sendUserMessage`、tool getters/setters、`getCommands`、`setModel` 和 thinking-level accessors。[E: packages/coding-agent/src/core/extensions/runner.ts:412] [E: packages/coding-agent/src/core/extensions/runner.ts:413] [E: packages/coding-agent/src/core/extensions/runner.ts:421] [E: packages/coding-agent/src/core/extensions/runner.ts:423]
3. `bindCore@runner.ts:428` 同时绑定 context actions: current model、scoped models、idle、project trust、abort signal、pending messages、shutdown、context usage、compact 和 system prompt accessors。[E: packages/coding-agent/src/core/extensions/runner.ts:428] [E: packages/coding-agent/src/core/extensions/runner.ts:430] [E: packages/coding-agent/src/core/extensions/runner.ts:438]
4. `bindCore@runner.ts:443` flush load 阶段排队的 provider registrations,异常转成 `ExtensionError`;flush 后 runtime 的 register/unregister 被替换为立即生效函数。[E: packages/coding-agent/src/core/extensions/runner.ts:443] [E: packages/coding-agent/src/core/extensions/runner.ts:459] [E: packages/coding-agent/src/core/extensions/runner.ts:480]
5. `bindCommandContext@runner.ts:503` 绑定 command-only actions;未传 actions 时恢复 no-op。[E: packages/coding-agent/src/core/extensions/runner.ts:503] [E: packages/coding-agent/src/core/extensions/runner.ts:514]
6. `setUIContext@runner.ts:522` 切换 UI context 和 `mode`;传入真实 UI 时先 `wrapUIPromptContext()`。[E: packages/coding-agent/src/core/extensions/runner.ts:522] [E: packages/coding-agent/src/core/extensions/runner.ts:527] `hasUI()` 只比较当前 context 是否仍是 no-op instance。[E: packages/coding-agent/src/core/extensions/runner.ts:578]
7. contribution lookup 是 pull model: `getAllRegisteredTools()` 同名 tool 只保留第一次遇到的 definition。[E: packages/coding-agent/src/core/extensions/runner.ts:587] [E: packages/coding-agent/src/core/extensions/runner.ts:591]
8. `getShortcuts()` 先把 resolved built-in keybindings 归一化;reserved built-ins 阻止 override;extension-extension conflict 由后写入的 shortcut 覆盖。[E: packages/coding-agent/src/core/extensions/runner.ts:630] [E: packages/coding-agent/src/core/extensions/runner.ts:647] [E: packages/coding-agent/src/core/extensions/runner.ts:662]
9. command lookup 对重复 command name 生成 `name:occurrence` 形式的 `invocationName`。[E: packages/coding-agent/src/core/extensions/runner.ts:739] [E: packages/coding-agent/src/core/extensions/runner.ts:757]
10. `createContext@runner.ts:809` 的 getters/methods 每次访问都先 `assertActive()`。`invalidate()` 保存 stale message 并调用 runtime 的 `invalidate()`。[E: packages/coding-agent/src/core/extensions/runner.ts:809] [E: packages/coding-agent/src/core/extensions/runner.ts:679] [E: packages/coding-agent/src/core/extensions/runner.ts:684] [E: packages/coding-agent/src/core/extensions/runner.ts:688]
11. `createCommandContext@runner.ts:889` 用 property descriptors 克隆 base context,再追加 session-control methods,避免 object spread 冻结旧值。[E: packages/coding-agent/src/core/extensions/runner.ts:889] [E: packages/coding-agent/src/core/extensions/runner.ts:893]
12. 每个 emitter 先 `snapshotEventHandlers(this.extensions, eventType)`:拷贝当时的 handler 数组。`pi.on()` 返回的 unsubscribe 从 `extension.handlers` splice,但不改已经 snapshot 的列表,所以“正在进行的 dispatch 不受增删影响”。[E: packages/coding-agent/src/core/extensions/runner.ts:265] [E: packages/coding-agent/src/core/extensions/loader.ts:256] [E: packages/coding-agent/src/core/extensions/loader.ts:263] [E: packages/coding-agent/docs/extensions.md:95]
13. 通用 `emit()` 按 snapshot 顺序调用 handlers;抛错转成 `emitError()`。session-before events 若 result 带 `cancel` 立即返回。[E: packages/coding-agent/src/core/extensions/runner.ts:988] [E: packages/coding-agent/src/core/extensions/runner.ts:995] [E: packages/coding-agent/src/core/extensions/runner.ts:999]

## `emitBoundary` 与可行动 turn_end / agent_before_settle

`emitBoundary@runner.ts:928` 是 `turn_end` 和 `agent_before_settle` 的专用分发。它从空 `entries` / `continue: false` 起步,每个 handler 收到带当前 `entries`、`continue`、`context` 的 event;handler 返回的 `entries` / `continue` 覆盖累积值,然后 `buildContext(entries)` 刷新 preview。非法 draft 会 `emitError` 并把本次结果标成 `valid: false`(entries 清空、continue 强制 false)。[E: packages/coding-agent/src/core/extensions/runner.ts:928] [E: packages/coding-agent/src/core/extensions/runner.ts:933] [E: packages/coding-agent/src/core/extensions/runner.ts:947] [E: packages/coding-agent/src/core/extensions/runner.ts:960] [E: packages/coding-agent/src/core/extensions/runner.ts:974]

`AgentSession._installAgentBoundaryHooks()` 把 `agent.finishTurn` 包一层:先 `_dispatchTurnEndBoundary()`,extension `continue` 或既有 `{ action: "continue" }` 会让 loop 再要一次 model call;`{ action: "end" }` 仍优先结束。[E: packages/coding-agent/src/core/agent-session.ts:678] [E: packages/coding-agent/src/core/agent-session.ts:682] [E: packages/coding-agent/src/core/agent-session.ts:684] [E: packages/coding-agent/src/core/agent-session.ts:685] run 收尾走 `_runBeforeSettleBoundary()` → `emitBoundary({ type: "agent_before_settle", ... })`;`continue: true` 但 `canContinue` 为 false 时上报 invalid continuation。[E: packages/coding-agent/src/core/agent-session.ts:1534] [E: packages/coding-agent/src/core/agent-session.ts:1539] [E: packages/coding-agent/src/core/agent-session.ts:1548] [E: packages/coding-agent/src/core/agent-session.ts:1549] 提交 draft 时 `_applyBoundaryDrafts()` 按类型调用 `appendCustomEntry` / `appendCustomMessageEntry` / `appendContextEdit` / compaction。[E: packages/coding-agent/src/core/agent-session.ts:741] [E: packages/coding-agent/src/core/agent-session.ts:747]

## `agent_settled` 不再重入 `agent_start`

`_emitAgentSettled()` 先 `onAgentSettled()`(cache warmer)、把 `_isAgentRunActive = false`,再设 `_isEmittingAgentSettled = true` 后 `emit({ type: "agent_settled" })`。[E: packages/coding-agent/src/core/agent-session.ts:873] [E: packages/coding-agent/src/core/agent-session.ts:875] [E: packages/coding-agent/src/core/agent-session.ts:876] [E: packages/coding-agent/src/core/agent-session.ts:878] 因此 handler 看到 `ctx.isIdle() === true`。[E: packages/coding-agent/src/core/agent-session.ts:1237] 在这段窗口里 `prompt()` 和 `sendMessage({ triggerTurn: true })` 只把工作推进 `_deferredSettledActions`,等全部 settled handler 结束后再执行,避免同一次通知里发出 `agent_start`。[E: packages/coding-agent/src/core/agent-session.ts:1610] [E: packages/coding-agent/src/core/agent-session.ts:1611] [E: packages/coding-agent/src/core/agent-session.ts:1956] [E: packages/coding-agent/src/core/agent-session.ts:884]

## 专用事件语义

`emitProjectTrustEvent()` 是顶层 helper,直接读 `LoadExtensionsResult.extensions`;第一个返回非 `undecided` 的 `project_trust` handler 获胜。[E: packages/coding-agent/src/core/extensions/runner.ts:291] [E: packages/coding-agent/src/core/extensions/runner.ts:302]

`emitCacheWarmingDecision()` 从 `event.action` 起步,最后一个返回 `result.action` 的 handler 获胜;抛错 `emitError` 后继续,不改当前累积 action。[E: packages/coding-agent/src/core/extensions/runner.ts:1020] [E: packages/coding-agent/src/core/extensions/runner.ts:1022] [E: packages/coding-agent/src/core/extensions/runner.ts:1028]

`emitToolCall()` 保存最后一个 truthy result,但一旦 `block` 就立即返回。`emitToolCall()` 没有 try/catch;handler 抛错会直接 reject。[E: packages/coding-agent/src/core/extensions/runner.ts:1134] [E: packages/coding-agent/src/core/extensions/runner.ts:1144] [E: packages/coding-agent/src/core/extensions/runner.ts:1139] blocked result 的 `terminate` 原样回传;`AgentSession.beforeToolCall` 再交给 agent-core。当前 tool batch 每个 finalized result 都 `terminate === true` 时才跳过自动 follow-up。[E: packages/coding-agent/src/core/extensions/types.ts:1241] [E: packages/coding-agent/src/core/agent-session.ts:540] [E: packages/agent/src/agent-loop.ts:686]

`emitToolResult()` 是 mutable merge:handler 可覆盖 `content`、`details`、`isError`、`usage`;没有修改时返回 `undefined`。[E: packages/coding-agent/src/core/extensions/runner.ts:1082] [E: packages/coding-agent/src/core/extensions/runner.ts:1122] [E: packages/coding-agent/src/core/extensions/runner.ts:1130]

`emitInput()` 是输入改写链:`handled` 立即短路,`transform` 更新当前 text/images。`AgentSession.prompt()`、`steer()` 和 `followUp()` 都经 `_runInputHandlers()`;RPC `steer` / `follow_up` 的 `source` 为 `"rpc"`。[E: packages/coding-agent/src/core/extensions/runner.ts:1412] [E: packages/coding-agent/src/core/extensions/runner.ts:1433] [E: packages/coding-agent/src/core/agent-session.ts:1558] [E: packages/coding-agent/src/core/agent-session.ts:1852] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:417]

`emitMessageEnd()` 允许替换同 role message;role 不同时 `emitError` 并忽略。[E: packages/coding-agent/src/core/extensions/runner.ts:1043] [E: packages/coding-agent/src/core/extensions/runner.ts:1055] `emitBeforeAgentStart()` 聚合 custom messages,并把返回的 `systemPrompt` 写成 `forceSystemPrompt`。[E: packages/coding-agent/src/core/extensions/runner.ts:1312] [E: packages/coding-agent/src/core/extensions/runner.ts:1346] [E: packages/coding-agent/src/core/extensions/runner.ts:1347]

`emitContext()` 分两阶段。`context` handlers 只看见 `role !== "system"` 的 conversation,返回后 `restoreSystemMessages()` 把 prompt/tool 接回去。[E: packages/coding-agent/src/core/extensions/runner.ts:1190] [E: packages/coding-agent/src/core/extensions/runner.ts:1197] [E: packages/coding-agent/src/core/extensions/runner.ts:1207] `context_with_system` handlers 看到完整 transcript,输出按原样使用;丢掉 leading system message 会报错但仍尊重 handler 输出。[E: packages/coding-agent/src/core/extensions/runner.ts:1221] [E: packages/coding-agent/src/core/extensions/runner.ts:1227] [E: packages/coding-agent/src/core/extensions/runner.ts:1230]

`emitBeforeProviderRequest()` 链式替换 payload,只有 handler result 不是 `undefined` 时才覆盖。[E: packages/coding-agent/src/core/extensions/runner.ts:1253] [E: packages/coding-agent/src/core/extensions/runner.ts:1265] `emitResourcesDiscover()` 聚合 skill/prompt/theme paths 并附上 `extensionPath`。[E: packages/coding-agent/src/core/extensions/runner.ts:1366] [E: packages/coding-agent/src/core/extensions/runner.ts:1386] `emitUserBash()` first-result-wins;非法 defined result throw,失败阻断命令。[E: packages/coding-agent/src/core/extensions/runner.ts:1154] [E: packages/coding-agent/src/core/extensions/runner.ts:1162] [E: packages/coding-agent/src/core/extensions/runner.ts:1177]

`ui_prompt_start` / `ui_prompt_end` 走通用 `emit()`,由 `withUIPrompt()` 在 outermost blocking UI 上 `queueMicrotask` 发出。[E: packages/coding-agent/src/core/extensions/runner.ts:539] [E: packages/coding-agent/src/core/extensions/runner.ts:568]

`session_compact_failed` 走通用 `emit()`。`AgentSession._emitSessionCompactFailed()` 仅在 `hasHandlers("session_compact_failed")` 时发出。[E: packages/coding-agent/src/core/agent-session.ts:848] [E: packages/coding-agent/src/core/extensions/types.ts:628]

`pi.sendMessage(..., { triggerTurn: false })` 在 agent 正在 streaming 时不能立刻 append:会把 custom message 插到 assistant tool call 与 tool result 之间。`AgentSession` 把它推进 `_pendingCustomMessages`,在 `turn_end` 以及 run 收尾 flush。[E: packages/coding-agent/src/core/agent-session.ts:1961] [E: packages/coding-agent/src/core/agent-session.ts:973] [E: packages/coding-agent/src/core/agent-session.ts:1490]

## 设计动机与权衡

runner 把 loader 阶段的 declarative contributions 和 session 阶段的 live actions 分开:factory 先注册 handlers/tools/commands,等 session 构建完再由 `bindCore()` 填真实 actions。[E: packages/coding-agent/src/core/extensions/runner.ts:412] [E: packages/coding-agent/src/core/extensions/runner.ts:443] [I]

专用 emitters 让不同事件拥有不同 combination policy:`emitBoundary` 链式 entries/continue,`tool_call` block 短路,`cache_warming_decision` last action wins,`context` 两阶段 restore。[E: packages/coding-agent/src/core/extensions/runner.ts:948] [E: packages/coding-agent/src/core/extensions/runner.ts:1144] [E: packages/coding-agent/src/core/extensions/runner.ts:1028] [E: packages/coding-agent/src/core/extensions/runner.ts:1190] [I]

snapshot + unsubscribe 让 handler 可以在自己的回调里退订,而不改当前 dispatch 的剩余调用列表。[E: packages/coding-agent/src/core/extensions/runner.ts:265] [E: packages/coding-agent/src/core/extensions/loader.ts:263] [I]

## Gotcha

- `emitToolCall()` 没有 try/catch;handler 抛错会直接 reject 该 emitter,与 `emit()`、`emitToolResult()`、`emitInput()` 等捕获并 `emitError()` 的模式不同。[E: packages/coding-agent/src/core/extensions/runner.ts:1139] [E: packages/coding-agent/src/core/extensions/runner.ts:1140] [E: packages/coding-agent/src/core/extensions/runner.ts:1003] 这是否是刻意让 blocking hook fail-closed,当前源码未直接说明 [U]。
- `getFlags()` 与 `getAllRegisteredTools()` 都是 first registration wins,但 `getShortcuts()` 对 extension-extension shortcut conflict 是 later registration wins。[E: packages/coding-agent/src/core/extensions/runner.ts:610] [E: packages/coding-agent/src/core/extensions/runner.ts:591] [E: packages/coding-agent/src/core/extensions/runner.ts:662]
- `emitSessionShutdownEvent()` 没有 handler 时返回 `false`。[E: packages/coding-agent/src/core/extensions/runner.ts:254] [E: packages/coding-agent/src/core/extensions/runner.ts:258]
- TUI wrapper 不再无限递归的修复不在 `runner.ts`;见 [subsys.coding-agent.interactive-orchestration](interactive-orchestration.md)。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:191]

## 跨包边界

[spine.extension-lifecycle](../../spine/extension-lifecycle.md) 是跨文件生命周期总览;本节点只详写 `runner.ts` 内部的 binding/context/dispatch 规则 [I]。

[surface.extensions.events](../../surface/extensions/events.md) 是面向 extension 作者的 event API 节点;本节点解释 runner 如何执行这些 handlers、如何组合结果、如何处理 error [I]。

[ref.coding-agent.extension-events](../../reference/extension-events.md) 枚举全部 40 个 `on()` 事件;本节点覆盖 dispatch 分支而不是逐字段 catalog [I]。

## Sources

- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/docs/extensions.md

## 相关

- [spine.extension-lifecycle](../../spine/extension-lifecycle.md): extension 从发现、加载、绑定到事件进入 runner 的端到端主线。
- [surface.extensions.events](../../surface/extensions/events.md): extension 作者视角的 event hooks、输入输出和行为约束。
- [ref.coding-agent.extension-events](../../reference/extension-events.md): `ExtensionEvent` 事件目录与 grouped catalog。
