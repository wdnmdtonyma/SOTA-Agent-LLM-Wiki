---
id: ref.coding-agent.extension-events
title: 扩展事件目录(40)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/cache-warmer.ts
  - packages/coding-agent/docs/extensions.md
symbols:
  - ExtensionEvent
related:
  - surface.extensions.events
  - subsys.coding-agent.extension-runner
evidence: explicit
status: verified
updated: ff72faba28
---

> `ref.coding-agent.extension-events` 是 pi-coding-agent extension hook 的逐实例 catalog:以 `ExtensionEvent` union 和 `ExtensionAPI.on(...)` overload 为准,列出每个事件名、payload 字段、handler 返回值语义和触发场景。ground truth 是 `on()` 从 `project_trust` 到 `input` 的 **40** 个 overload。

## 能回答的问题

- `ExtensionEvent` / `ExtensionAPI.on` 当前支持哪些事件名?
- 每个 extension event 的 payload 字段是什么?
- 哪些事件 handler 可以返回 cancel、block、transform、`BoundaryResult` 或资源路径?
- `context` 与 `context_with_system` 谁看见 system messages?
- `turn_end` / `agent_before_settle` 的 `BoundaryResult` 能追加哪些 draft?

## Catalog 口径

`ExtensionEvent` 是 extension 事件 payload 的总 union,含 startup/resource、`SessionEvent`、`ContextEvent` / `ContextWithSystemEvent`、`CacheWarmingDecisionEvent`、provider/agent/message/tool、`ProviderStreamEvent`、`AgentBeforeSettleEvent`、`input` 等分支。[E: packages/coding-agent/src/core/extensions/types.ts:1185] [E: packages/coding-agent/src/core/extensions/types.ts:1189] [E: packages/coding-agent/src/core/extensions/types.ts:1191] [E: packages/coding-agent/src/core/extensions/types.ts:1195] [E: packages/coding-agent/src/core/extensions/types.ts:1199] `ExtensionAPI.on(...)` 从 `project_trust` 到 `input` 共 **40** 个可订阅事件名,每个 overload 返回 unsubscribe `() => void`。[E: packages/coding-agent/src/core/extensions/types.ts:1370] [E: packages/coding-agent/src/core/extensions/types.ts:1398] [E: packages/coding-agent/src/core/extensions/types.ts:1409] [E: packages/coding-agent/src/core/extensions/types.ts:1416] [E: packages/coding-agent/src/core/extensions/types.ts:1436]

本轮相对 36 事件集新增 4 个:`context_with_system`、`cache_warming_decision`、`provider_stream_event`、`agent_before_settle`。[E: packages/coding-agent/src/core/extensions/types.ts:1398] [E: packages/coding-agent/src/core/extensions/types.ts:1399] [E: packages/coding-agent/src/core/extensions/types.ts:1409] [E: packages/coding-agent/src/core/extensions/types.ts:1416] `turn_end` 现在可返回 `BoundaryResult`。[E: packages/coding-agent/src/core/extensions/types.ts:1424] [E: packages/coding-agent/src/core/extensions/types.ts:1226] `context` handler 不再看见 system messages。[E: packages/coding-agent/src/core/extensions/types.ts:704] [E: packages/coding-agent/src/core/extensions/runner.ts:1197]

## Startup / Resource Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `project_trust` | `{ type: "project_trust"; cwd: string }` | `ProjectTrustEventResult { trusted: "yes" \| "no" \| "undecided"; remember?: boolean }` | 在项目动态配置和 project-local extension 加载前参与 trust 决策;只有 user/global 和 CLI `-e` extension 参与,第一个 yes/no 决策接管内置 trust prompt。[E: packages/coding-agent/docs/extensions.md:50] | `ProjectTrustEvent` [E: packages/coding-agent/src/core/extensions/types.ts:531]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1370] |
| `resources_discover` | `{ type: "resources_discover"; cwd: string; reason: "startup" \| "reload" }` | `ResourcesDiscoverResult { skillPaths?: string[]; promptPaths?: string[]; themePaths?: string[] }` | `session_start` 后让 extension 贡献额外 skills、prompts、themes 路径。 | `ResourcesDiscoverEvent` [E: packages/coding-agent/src/core/extensions/types.ts:556]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1371] |

## Session Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `session_start` | `{ type: "session_start"; reason: "startup" \| "reload" \| "new" \| "resume" \| "fork"; previousSessionFile?: string }` | 通知事件 | session 启动、加载或重载时触发。 | `SessionStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:574]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1375] |
| `session_info_changed` | `{ type: "session_info_changed"; name: string \| undefined }` | 通知事件 | 当前 session display name 设置或清除时触发。 | `SessionInfoChangedEvent` [E: packages/coding-agent/src/core/extensions/types.ts:583]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1376] |
| `session_before_switch` | `{ type: "session_before_switch"; reason: "new" \| "resume"; targetSessionFile?: string }` | `SessionBeforeSwitchResult { cancel?: boolean }` | `/new` 或 `/resume` 切换前触发;handler 可取消切换。 | `SessionBeforeSwitchEvent` [E: packages/coding-agent/src/core/extensions/types.ts:590]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1377] |
| `session_before_fork` | `{ type: "session_before_fork"; entryId: string; position: "before" \| "at" }` | `SessionBeforeForkResult { cancel?: boolean; skipConversationRestore?: boolean }` | `/fork` 或 `/clone` 前触发。 | `SessionBeforeForkEvent` [E: packages/coding-agent/src/core/extensions/types.ts:597]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1381] |
| `session_before_compact` | `{ type: "session_before_compact"; preparation; branchEntries; customInstructions?; reason; willRetry; signal }` | `SessionBeforeCompactResult { cancel?: boolean; compaction?: CompactionResult }` | `/compact`、threshold 或 overflow recovery compaction 前触发;handler 可取消或提供自定义 summary。 | `SessionBeforeCompactEvent` [E: packages/coding-agent/src/core/extensions/types.ts:604]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1385] |
| `session_compact` | `{ type: "session_compact"; compactionEntry; fromExtension: boolean; reason; willRetry }` | 通知事件 | compaction 完成后触发。 | `SessionCompactEvent` [E: packages/coding-agent/src/core/extensions/types.ts:617]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1389] |
| `session_compact_failed` | `{ type: "session_compact_failed"; reason; errorMessage?; aborted; willRetry; fromExtension }` | 通知事件 | compaction 失败或 abort 后触发;`errorMessage` 仅非 abort 失败时出现。 | `SessionCompactFailedEvent` [E: packages/coding-agent/src/core/extensions/types.ts:628]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1390] |
| `session_shutdown` | `{ type: "session_shutdown"; reason: "quit" \| "reload" \| "new" \| "resume" \| "fork"; targetSessionFile?: string }` | 通知事件 | 已启动 session runtime 被 teardown 前触发。 | `SessionShutdownEvent` [E: packages/coding-agent/src/core/extensions/types.ts:643]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1391] |
| `session_before_tree` | `{ type: "session_before_tree"; preparation: TreePreparation; signal: AbortSignal }` | `SessionBeforeTreeResult { cancel?: boolean; summary?; customInstructions?; replaceInstructions?; label? }` | `/tree` 导航前触发;handler 可取消或提供 custom summary。 | `SessionBeforeTreeEvent` [E: packages/coding-agent/src/core/extensions/types.ts:666]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1392] |
| `session_tree` | `{ type: "session_tree"; newLeafId; oldLeafId; summaryEntry?; fromExtension? }` | 通知事件 | `/tree` navigation 完成后触发。 | `SessionTreeEvent` [E: packages/coding-agent/src/core/extensions/types.ts:673]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1396] |

## Agent / Message / Context Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `context` | `{ type: "context"; messages: AgentMessage[] }` | `ContextEventResult { messages?: AgentMessage[] }` | 每次 LLM call 前。`messages` **不含** system messages;Pi 在 handler 返回后恢复 prompt/tool state。handler 不能靠丢掉 leading system 来卸工具。[E: packages/coding-agent/docs/extensions.md:113] | `ContextEvent` [E: packages/coding-agent/src/core/extensions/types.ts:704]; restore [E: packages/coding-agent/src/core/extensions/runner.ts:1197]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1397] |
| `context_with_system` | `{ type: "context_with_system"; messages: AgentMessage[] }` | `ContextEventResult { messages?: AgentMessage[] }` | 所有 `context` handler 之后。`messages` 是含 system 的完整 transcript,返回值按原样发送。必须保留 index 0 的 system message,否则请求没有 prompt/initial tools。[E: packages/coding-agent/docs/extensions.md:113] | `ContextWithSystemEvent` [E: packages/coding-agent/src/core/extensions/types.ts:714]; emit [E: packages/coding-agent/src/core/extensions/runner.ts:1221]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1398] |
| `before_agent_start` | `{ type: "before_agent_start"; prompt; images?; systemPrompt; systemPromptOptions }` | `BeforeAgentStartEventResult { message?; systemPrompt? }` | 用户 prompt 提交后、agent loop 前;可注入 custom message 或 `forceSystemPrompt`。 | `BeforeAgentStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:752]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1410] |
| `agent_start` | `{ type: "agent_start" }` | 通知事件 | 每个用户 prompt 的 agent loop 开始。 | `AgentStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:765]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1414] |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[] }` | 通知事件 | 每个用户 prompt 的 agent loop 结束;之后仍可能 retry/compact/queued work。 | `AgentEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:770]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1415] |
| `agent_before_settle` | `BoundaryState` + `{ type: "agent_before_settle" }`:`entries`、`continue`、`context`、`outcome` | `BoundaryResult { entries?; continue? }` | 最终可行动边界:可链式追加 `custom` / `custom_message` / `context_edit` / `compaction` draft,并 `continue: true` 请求一次后续 model call。无条件 continue 可能循环。[E: packages/coding-agent/docs/extensions.md:66] [E: packages/coding-agent/docs/extensions.md:115] | `AgentBeforeSettleEvent` [E: packages/coding-agent/src/core/extensions/types.ts:833]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1416] |
| `agent_settled` | `{ type: "agent_settled" }` | 通知事件 | 不会再自动 retry、compact 或消费 queued continuation。handler 看到 `ctx.isIdle() === true`;在此调用 `prompt()` 会推迟到全部 settled handler 结束,避免重入 `agent_start`。[E: packages/coding-agent/docs/extensions.md:67] | `AgentSettledEvent` [E: packages/coding-agent/src/core/extensions/types.ts:838]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1420] |
| `ui_prompt_start` | `{ type: "ui_prompt_start"; reason: "ui_prompt"; kind: UIPromptKind; title? }` | 通知事件 | 开始等待 blocking user-facing extension UI prompt;`UIPromptKind` 为 `"select" \| "confirm" \| "input" \| "editor" \| "custom"`。 | `UIPromptStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:845]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1421] |
| `ui_prompt_end` | `{ type: "ui_prompt_end"; reason: "ui_prompt"; kind: UIPromptKind; title? }` | 通知事件 | 不再等待该 UI prompt span。 | `UIPromptEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:853]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1422] |
| `turn_start` | `{ type: "turn_start"; turnIndex: number; timestamp: number }` | 通知事件 | 每个 turn 开始。 | `TurnStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:861]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1423] |
| `turn_end` | `BoundaryState` + `{ type: "turn_end"; turnIndex; message; toolResults; messageEntryId; toolResultEntryIds }` | `TurnEndEventResult = BoundaryResult` | 每个 turn 结束。可返回 `{ entries, continue }` 追加结构性 entry 并确保一次后续 provider request。走 `emitBoundary()`,不再走通用 `emit()`。[E: packages/coding-agent/docs/extensions.md:115] | `TurnEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:868]; result [E: packages/coding-agent/src/core/extensions/types.ts:1226]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1424] |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | 通知事件 | user、assistant、toolResult 消息开始。 | `MessageStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:878]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1425] |
| `message_update` | `{ type: "message_update"; message; assistantMessageEvent }` | 通知事件 | 只用于 assistant streaming updates。 | `MessageUpdateEvent` [E: packages/coding-agent/src/core/extensions/types.ts:884]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1426] |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | `MessageEndEventResult { message?: AgentMessage }` | finalized message;replacement 必须保持相同 `role`。 | `MessageEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:891]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1427] |

## Provider / Model / Cache Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `cache_warming_decision` | `{ type: "cache_warming_decision"; warmCost; missCost; continuationProbability; action }` | `CacheWarmingDecisionEventResult { action?: "warm" \| "stop" }` | 每次 prompt-cache refresh 前。最后一个返回 `action` 的 handler 获胜;不返回则用 pi 的经济学决策。[E: packages/coding-agent/docs/extensions.md:119] | event [E: packages/coding-agent/src/core/cache-warmer.ts:112]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1399] |
| `before_provider_request` | `{ type: "before_provider_request"; payload: unknown }` | `BeforeProviderRequestEventResult = unknown`;`undefined` 表示不替换 | provider-specific payload 构造完成、请求发送前;非 `undefined` 替换 payload。 | `BeforeProviderRequestEvent` [E: packages/coding-agent/src/core/extensions/types.ts:720]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1403] |
| `before_provider_headers` | `{ type: "before_provider_headers"; headers: ProviderHeaders }` | 返回值忽略;设为 `null` 的 header 会被删除 | request headers 已组装但 HTTP call 尚未发送。 | `BeforeProviderHeadersEvent` [E: packages/coding-agent/src/core/extensions/types.ts:731]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1407] |
| `after_provider_response` | `{ type: "after_provider_response"; status: number; headers: Record<string,string> }` | 通知事件 | HTTP response 到达后、stream body 消费前。 | `AfterProviderResponseEvent` [E: packages/coding-agent/src/core/extensions/types.ts:736]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1408] |
| `provider_stream_event` | `{ type: "provider_stream_event"; provider; api; model; data: unknown }` | 通知事件 | 每个已解析 provider stream event、Pi 规范化之前。`data` 只读,不是原始 HTTP/SSE 字节;handler 按 stream 顺序 await,慢 handler 拖住消费。[E: packages/coding-agent/docs/extensions.md:107] [E: packages/coding-agent/docs/extensions.md:109] | `ProviderStreamEvent` [E: packages/coding-agent/src/core/extensions/types.ts:743]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1409] |
| `model_select` | `{ type: "model_select"; model; previousModel; source: "set" \| "cycle" \| "restore" }` | 通知事件 | `/model`、model cycling 或 session restore 改变模型时。 | `ModelSelectEvent` [E: packages/coding-agent/src/core/extensions/types.ts:929]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1431] |
| `thinking_level_select` | `{ type: "thinking_level_select"; level; previousLevel }` | 通知事件;返回值忽略 | thinking level 变化时。 | `ThinkingLevelSelectEvent` [E: packages/coding-agent/src/core/extensions/types.ts:937]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1432] |

## Tool Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId; toolName; args }` | 通知事件 | 工具开始执行。 | `ToolExecutionStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:897]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1428] |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId; toolName; args; partialResult }` | 通知事件 | 工具执行期间的 partial/streaming update。 | `ToolExecutionUpdateEvent` [E: packages/coding-agent/src/core/extensions/types.ts:905]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1429] |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId; toolName; result; isError }` | 通知事件 | 工具完成。 | `ToolExecutionEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:914]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1430] |
| `tool_call` | built-in variants for `bash/powershell/read/edit/write/grep/find/ls` plus `CustomToolCallEvent`;共同字段 `{ type: "tool_call"; toolCallId; toolName; input }` | `ToolCallEventResult { block?; reason?; terminate? }`;也可 mutate `event.input` | `tool_execution_start` 后、执行前。`terminate` 只在该 call 被 block 时参与 batch 早停:仅当本 batch 每个 finalized result 都 `terminate: true` 时才跳过自动 follow-up LLM call。 | `ToolCallEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1233]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1433] |
| `tool_result` | built-in variants plus `CustomToolResultEvent`;共同字段 `{ type: "tool_result"; toolCallId; toolName; input; content; details; isError; usage? }` | `ToolResultEventResult { content?; details?; isError?; usage? }` | 工具执行完成后、`tool_execution_end` 和最终 tool result message 前;patches 按 extension 顺序链式生效。 | `ToolResultEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1257]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1434] |

## Input / User Bash Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `user_bash` | `{ type: "user_bash"; command; excludeFromContext; cwd }` | `UserBashEventResult { operations } \| { result }`;`undefined` 继续传播 | `!` / `!!` bash。非法 defined result 或 handler 失败阻断命令,不 fall through 到本地执行。[E: packages/coding-agent/docs/extensions.md:125] | `UserBashEvent` [E: packages/coding-agent/src/core/extensions/types.ts:948]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1435] |
| `input` | `{ type: "input"; text; images?; source: "interactive" \| "rpc" \| "extension"; streamingBehavior?: "steer" \| "followUp" }` | `{ action: "continue" } \| { action: "transform"; text; images? } \| { action: "handled" }` | 用户输入到达后,extension commands 之后、skill/template expansion 之前;`handled` 跳过 agent。 | `InputEvent` [E: packages/coding-agent/src/core/extensions/types.ts:966]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1436] |

## Type Guards And Typed Tool Variants

`tool_call` 与 `tool_result` 的 built-in variants 覆盖 `bash`、`powershell`、`read`、`edit`、`write`、`grep`、`find`、`ls`,同时保留 custom tool fallback。源码提供 `isToolCallEventType(...)` overload,其中包括 `isToolCallEventType("powershell", event)`。[E: packages/coding-agent/src/core/extensions/types.ts:1168] [E: packages/coding-agent/src/core/extensions/types.ts:1169] [E: packages/coding-agent/src/core/extensions/types.ts:1179] `tool_result` 侧提供 `isBashToolResult`、`isPowerShellToolResult`、`isReadToolResult`、`isEditToolResult`、`isWriteToolResult`、`isGrepToolResult`、`isFindToolResult`、`isLsToolResult` 八个 built-in result guards。[E: packages/coding-agent/src/core/extensions/types.ts:1123] [E: packages/coding-agent/src/core/extensions/types.ts:1126] [E: packages/coding-agent/src/core/extensions/types.ts:1144]

## Sources

- `packages/coding-agent/src/core/extensions/types.ts`
- `packages/coding-agent/src/core/extensions/runner.ts`
- `packages/coding-agent/src/core/cache-warmer.ts`
- `packages/coding-agent/docs/extensions.md`

## 相关

- [surface.extensions.events](../surface/extensions/events.md): extension hook 面的 T1 说明,解释事件族、时序和跨包边界。
- [subsys.coding-agent.extension-runner](../subsystems/coding-agent/extension-runner.md): extension runner 的 handler 分发、`emitBoundary`、返回值组合和错误处理实现。
