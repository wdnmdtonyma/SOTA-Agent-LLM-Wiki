---
id: ref.coding-agent.extension-events
title: 扩展事件目录(41)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/cache-warmer.ts
  - packages/coding-agent/src/core/mcp-servers.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/docs/extensions.md
symbols:
  - ExtensionEvent
  - McpServersChangeEvent
related:
  - surface.extensions.events
  - subsys.coding-agent.extension-runner
  - spine.extension-lifecycle
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.coding-agent.extension-events` 是 pi-coding-agent extension hook 的逐实例 catalog:以 `ExtensionEvent` union 和 `ExtensionAPI.on(...)` overload 为准,列出每个事件名、payload 字段、handler 返回值语义和触发场景。ground truth 是 `on()` 从 `project_trust` 到 `input` 的 **41** 个 overload,含 `mcp_servers_change`。

## 能回答的问题

- `ExtensionEvent` / `ExtensionAPI.on` 当前支持哪些事件名,一共几个?
- 每个 extension event 的 payload 字段是什么?
- 哪些事件 handler 可以返回 cancel、block、transform、`BoundaryResult` 或资源路径?
- `context` 与 `context_with_system` 谁看见 system messages?
- `turn_end` / `agent_before_settle` 的 `BoundaryResult` 能追加哪些 draft?
- `mcp_servers_change` 的 payload 是什么,订阅它意味着什么?

## Catalog 口径

`ExtensionEvent` 是 extension 事件 payload 的总 union,含 startup/resource、`McpServersChangeEvent`、`SessionEvent`、`ContextEvent` / `ContextWithSystemEvent`、`CacheWarmingDecisionEvent`、provider/agent/message/tool、`ProviderStreamEvent`、`AgentBeforeSettleEvent`、`input` 等分支。[E: packages/coding-agent/src/core/extensions/types.ts:1364] [E: packages/coding-agent/src/core/extensions/types.ts:1367] [E: packages/coding-agent/src/core/extensions/types.ts:1368] [E: packages/coding-agent/src/core/extensions/types.ts:1371] [E: packages/coding-agent/src/core/extensions/types.ts:1375] [E: packages/coding-agent/src/core/extensions/types.ts:1379] `ExtensionAPI.on(...)` 从 `project_trust` 到 `input` 共 **41** 个可订阅事件名,每个 overload 返回 unsubscribe `() => void`。[E: packages/coding-agent/src/core/extensions/types.ts:1556] [E: packages/coding-agent/src/core/extensions/types.ts:1578] [E: packages/coding-agent/src/core/extensions/types.ts:1623]

相对上一轮 40 事件集新增 1 个:`mcp_servers_change`。它插在 `session_shutdown` 与 `session_before_tree` 之间,不是 `SessionEvent` 成员。[E: packages/coding-agent/src/core/extensions/types.ts:1577] [E: packages/coding-agent/src/core/extensions/types.ts:1578] [E: packages/coding-agent/src/core/extensions/types.ts:1579] [E: packages/coding-agent/src/core/extensions/types.ts:839]

下表按 `on()` 声明顺序枚举全部 **41** 个事件名。payload / 返回值细节见随后分组表。

| # | 事件名 | handler 返回 | 族 |
| --- | --- | --- | --- |
| 1 | `project_trust` | `ProjectTrustEventResult` | startup/resource |
| 2 | `resources_discover` | `ResourcesDiscoverResult` | startup/resource |
| 3 | `session_start` | 通知 | session |
| 4 | `session_info_changed` | 通知 | session |
| 5 | `session_before_switch` | `SessionBeforeSwitchResult` | session |
| 6 | `session_before_fork` | `SessionBeforeForkResult` | session |
| 7 | `session_before_compact` | `SessionBeforeCompactResult` | session |
| 8 | `session_compact` | 通知 | session |
| 9 | `session_compact_failed` | 通知 | session |
| 10 | `session_shutdown` | 通知 | session |
| 11 | `mcp_servers_change` | 通知 | startup/resource |
| 12 | `session_before_tree` | `SessionBeforeTreeResult` | session |
| 13 | `session_tree` | 通知 | session |
| 14 | `context` | `ContextEventResult` | agent/message/context |
| 15 | `context_with_system` | `ContextEventResult` | agent/message/context |
| 16 | `cache_warming_decision` | `CacheWarmingDecisionEventResult` | provider/cache |
| 17 | `before_provider_request` | `BeforeProviderRequestEventResult`(`unknown`) | provider/cache |
| 18 | `before_provider_headers` | 返回值忽略 | provider/cache |
| 19 | `after_provider_response` | 通知 | provider/cache |
| 20 | `provider_stream_event` | 通知 | provider/cache |
| 21 | `before_agent_start` | `BeforeAgentStartEventResult` | agent/message/context |
| 22 | `agent_start` | 通知 | agent/message/context |
| 23 | `agent_end` | 通知 | agent/message/context |
| 24 | `agent_before_settle` | `BoundaryResult` | agent/message/context |
| 25 | `agent_settled` | 通知 | agent/message/context |
| 26 | `ui_prompt_start` | 通知 | agent/message/context |
| 27 | `ui_prompt_end` | 通知 | agent/message/context |
| 28 | `turn_start` | 通知 | agent/message/context |
| 29 | `turn_end` | `BoundaryResult` | agent/message/context |
| 30 | `message_start` | 通知 | agent/message/context |
| 31 | `message_update` | 通知 | agent/message/context |
| 32 | `message_end` | `MessageEndEventResult` | agent/message/context |
| 33 | `tool_execution_start` | 通知 | tool |
| 34 | `tool_execution_update` | 通知 | tool |
| 35 | `tool_execution_end` | 通知 | tool |
| 36 | `model_select` | 通知 | provider/model |
| 37 | `thinking_level_select` | 通知;返回值忽略 | provider/model |
| 38 | `tool_call` | `ToolCallEventResult`;也可 mutate `event.input` | tool |
| 39 | `tool_result` | `ToolResultEventResult` | tool |
| 40 | `user_bash` | `UserBashEventResult` | input/bash |
| 41 | `input` | `continue` / `transform` / `handled` | input/bash |

## Startup / Resource Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `project_trust` | `{ type: "project_trust"; cwd: string }` | `ProjectTrustEventResult { trusted: "yes" \| "no" \| "undecided"; remember?: boolean }` | 在项目动态配置和 project-local extension 加载前参与 trust 决策;只有 user/global 和 CLI `-e` extension 参与,第一个 yes/no 决策接管内置 trust prompt。[E: packages/coding-agent/docs/extensions.md:50] | `ProjectTrustEvent` [E: packages/coding-agent/src/core/extensions/types.ts:677]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1556] |
| `resources_discover` | `{ type: "resources_discover"; cwd: string; reason: "startup" \| "reload" }` | `ResourcesDiscoverResult { skillPaths?: string[]; promptPaths?: string[]; themePaths?: string[] }` | `session_start` 后让 extension 贡献额外 skills、prompts、themes 路径。 | `ResourcesDiscoverEvent` [E: packages/coding-agent/src/core/extensions/types.ts:702]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1557] |
| `mcp_servers_change` | `{ type: "mcp_servers_change"; servers: RegisteredMcpServer[] }`;`RegisteredMcpServer` 为 `{ name; config: McpServerConfig; extensionPath }` | 通知事件。`on()` 的 handler 类型是 `ExtensionHandler<McpServersChangeEvent>`,无 result type 参数。 | bind 之后 `registerMcpServer` / `unregisterMcpServer` 会 emit;load 阶段登记的 server 不走这个事件,应在 `session_start` 用 `pi.getMcpServers()` 读。订阅该事件等于宣称“我来 connect 已登记 MCP 服务器”:runner 用 `hasHandlers("mcp_servers_change")` 判断,没有 handler 时对每个已登记 server `emitError`(`event: "register_mcp_server"`)。内置 MCP 扩展在 `sessionActive` 时用它立刻连上新增 server、关掉注销或改 config 的 server。 | event [E: packages/coding-agent/src/core/extensions/types.ts:721]; payload [E: packages/coding-agent/src/core/extensions/types.ts:724]; `RegisteredMcpServer` [E: packages/coding-agent/src/core/mcp-servers.ts:281]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1578]; emit [E: packages/coding-agent/src/core/extensions/runner.ts:458]; unhandled [E: packages/coding-agent/src/core/extensions/runner.ts:753]; builtin [E: packages/coding-agent/src/extensions/mcp/index.ts:1097] |

## Session Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `session_start` | `{ type: "session_start"; reason: "startup" \| "reload" \| "new" \| "resume" \| "fork"; previousSessionFile?: string }` | 通知事件 | session 启动、加载或重载时触发。 | `SessionStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:732]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1561] |
| `session_info_changed` | `{ type: "session_info_changed"; name: string \| undefined }` | 通知事件 | 当前 session display name 设置或清除时触发。 | `SessionInfoChangedEvent` [E: packages/coding-agent/src/core/extensions/types.ts:741]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1562] |
| `session_before_switch` | `{ type: "session_before_switch"; reason: "new" \| "resume"; targetSessionFile?: string }` | `SessionBeforeSwitchResult { cancel?: boolean }` | `/new` 或 `/resume` 切换前触发;handler 可取消切换。 | `SessionBeforeSwitchEvent` [E: packages/coding-agent/src/core/extensions/types.ts:748]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1563] |
| `session_before_fork` | `{ type: "session_before_fork"; entryId: string; position: "before" \| "at" }` | `SessionBeforeForkResult { cancel?: boolean; skipConversationRestore?: boolean }` | `/fork` 或 `/clone` 前触发。 | `SessionBeforeForkEvent` [E: packages/coding-agent/src/core/extensions/types.ts:755]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1567] |
| `session_before_compact` | `{ type: "session_before_compact"; preparation; branchEntries; customInstructions?; reason; willRetry; signal }` | `SessionBeforeCompactResult { cancel?: boolean; compaction?: CompactionResult }` | `/compact`、threshold 或 overflow recovery compaction 前触发;handler 可取消或提供自定义 summary。 | `SessionBeforeCompactEvent` [E: packages/coding-agent/src/core/extensions/types.ts:762]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1571] |
| `session_compact` | `{ type: "session_compact"; compactionEntry; fromExtension: boolean; reason; willRetry }` | 通知事件 | compaction 完成后触发。 | `SessionCompactEvent` [E: packages/coding-agent/src/core/extensions/types.ts:775]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1575] |
| `session_compact_failed` | `{ type: "session_compact_failed"; reason; errorMessage?; aborted; willRetry; fromExtension }` | 通知事件 | compaction 失败或 abort 后触发;`errorMessage` 仅非 abort 失败时出现。 | `SessionCompactFailedEvent` [E: packages/coding-agent/src/core/extensions/types.ts:786]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1576] |
| `session_shutdown` | `{ type: "session_shutdown"; reason: "quit" \| "reload" \| "new" \| "resume" \| "fork"; targetSessionFile?: string }` | 通知事件 | 已启动 session runtime 被 teardown 前触发。 | `SessionShutdownEvent` [E: packages/coding-agent/src/core/extensions/types.ts:801]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1577] |
| `session_before_tree` | `{ type: "session_before_tree"; preparation: TreePreparation; signal: AbortSignal }` | `SessionBeforeTreeResult { cancel?: boolean; summary?; customInstructions?; replaceInstructions?; label? }` | `/tree` 导航前触发;handler 可取消或提供 custom summary。 | `SessionBeforeTreeEvent` [E: packages/coding-agent/src/core/extensions/types.ts:824]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1579] |
| `session_tree` | `{ type: "session_tree"; newLeafId; oldLeafId; summaryEntry?; fromExtension? }` | 通知事件 | `/tree` navigation 完成后触发。 | `SessionTreeEvent` [E: packages/coding-agent/src/core/extensions/types.ts:831]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1583] |

## Agent / Message / Context Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `context` | `{ type: "context"; messages: AgentMessage[] }` | `ContextEventResult { messages?: AgentMessage[] }` | 每次 LLM call 前。`messages` **不含** system messages;Pi 在 handler 返回后恢复 prompt/tool state。handler 不能靠丢掉 leading system 来卸工具。[E: packages/coding-agent/docs/extensions.md:115] | `ContextEvent` [E: packages/coding-agent/src/core/extensions/types.ts:862]; restore [E: packages/coding-agent/src/core/extensions/runner.ts:1315]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1584] |
| `context_with_system` | `{ type: "context_with_system"; messages: AgentMessage[] }` | `ContextEventResult { messages?: AgentMessage[] }` | 所有 `context` handler 之后。`messages` 是含 system 的完整 transcript,返回值按原样发送。必须保留 index 0 的 system message,否则请求没有 prompt/initial tools。[E: packages/coding-agent/docs/extensions.md:115] | `ContextWithSystemEvent` [E: packages/coding-agent/src/core/extensions/types.ts:872]; emit [E: packages/coding-agent/src/core/extensions/runner.ts:1329]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1585] |
| `before_agent_start` | `{ type: "before_agent_start"; prompt; images?; systemPrompt; systemPromptOptions }` | `BeforeAgentStartEventResult { message?; systemPrompt? }` | 用户 prompt 提交后、agent loop 前;可注入 custom message 或 `forceSystemPrompt`。 | `BeforeAgentStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:910]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1597] |
| `agent_start` | `{ type: "agent_start" }` | 通知事件 | 每个用户 prompt 的 agent loop 开始。 | `AgentStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:923]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1601] |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[] }` | 通知事件 | 每个用户 prompt 的 agent loop 结束;之后仍可能 retry/compact/queued work。 | `AgentEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:928]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1602] |
| `agent_before_settle` | `BoundaryState` + `{ type: "agent_before_settle" }`:`entries`、`continue`、`context`、`outcome` | `BoundaryResult { entries?; continue? }` | 最终可行动边界:可链式追加 `custom` / `custom_message` / `context_edit` / `compaction` draft,并 `continue: true` 请求一次后续 model call。无条件 continue 可能循环。[E: packages/coding-agent/docs/extensions.md:66] [E: packages/coding-agent/docs/extensions.md:117] | `AgentBeforeSettleEvent` [E: packages/coding-agent/src/core/extensions/types.ts:991]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1603] |
| `agent_settled` | `{ type: "agent_settled" }` | 通知事件 | 不会再自动 retry、compact 或消费 queued continuation。handler 看到 `ctx.isIdle() === true`;在此调用 `prompt()` 会推迟到全部 settled handler 结束,避免重入 `agent_start`。[E: packages/coding-agent/docs/extensions.md:67] | `AgentSettledEvent` [E: packages/coding-agent/src/core/extensions/types.ts:996]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1607] |
| `ui_prompt_start` | `{ type: "ui_prompt_start"; reason: "ui_prompt"; kind: UIPromptKind; title? }` | 通知事件 | 开始等待 blocking user-facing extension UI prompt;`UIPromptKind` 为 `"select" \| "confirm" \| "input" \| "editor" \| "custom"`。 | `UIPromptStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1003]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1608] |
| `ui_prompt_end` | `{ type: "ui_prompt_end"; reason: "ui_prompt"; kind: UIPromptKind; title? }` | 通知事件 | 不再等待该 UI prompt span。 | `UIPromptEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1011]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1609] |
| `turn_start` | `{ type: "turn_start"; turnIndex: number; timestamp: number }` | 通知事件 | 每个 turn 开始。 | `TurnStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1019]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1610] |
| `turn_end` | `BoundaryState` + `{ type: "turn_end"; turnIndex; message; toolResults; messageEntryId; toolResultEntryIds }` | `TurnEndEventResult = BoundaryResult` | 每个 turn 结束。可返回 `{ entries, continue }` 追加结构性 entry 并确保一次后续 provider request。走 `emitBoundary()`,不再走通用 `emit()`。[E: packages/coding-agent/docs/extensions.md:117] | `TurnEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1026]; result [E: packages/coding-agent/src/core/extensions/types.ts:1406]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1611] |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | 通知事件 | user、assistant、toolResult 消息开始。 | `MessageStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1036]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1612] |
| `message_update` | `{ type: "message_update"; message; assistantMessageEvent }` | 通知事件 | 只用于 assistant streaming updates。 | `MessageUpdateEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1042]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1613] |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | `MessageEndEventResult { message?: AgentMessage }` | finalized message;replacement 必须保持相同 `role`。 | `MessageEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1049]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1614] |

## Provider / Model / Cache Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `cache_warming_decision` | `{ type: "cache_warming_decision"; warmCost; missCost; continuationProbability; action }` | `CacheWarmingDecisionEventResult { action?: "warm" \| "stop" }` | 每次 prompt-cache refresh 前。最后一个返回 `action` 的 handler 获胜;不返回则用 pi 的经济学决策。[E: packages/coding-agent/docs/extensions.md:121] | event [E: packages/coding-agent/src/core/cache-warmer.ts:112]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1586] |
| `before_provider_request` | `{ type: "before_provider_request"; payload: unknown }` | `BeforeProviderRequestEventResult = unknown`;`undefined` 表示不替换 | provider-specific payload 构造完成、请求发送前;非 `undefined` 替换 payload。 | `BeforeProviderRequestEvent` [E: packages/coding-agent/src/core/extensions/types.ts:878]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1590] |
| `before_provider_headers` | `{ type: "before_provider_headers"; headers: ProviderHeaders }` | 返回值忽略;设为 `null` 的 header 会被删除 | request headers 已组装但 HTTP call 尚未发送。 | `BeforeProviderHeadersEvent` [E: packages/coding-agent/src/core/extensions/types.ts:888]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1594] |
| `after_provider_response` | `{ type: "after_provider_response"; status: number; headers: Record<string,string> }` | 通知事件 | HTTP response 到达后、stream body 消费前。 | `AfterProviderResponseEvent` [E: packages/coding-agent/src/core/extensions/types.ts:894]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1595] |
| `provider_stream_event` | `{ type: "provider_stream_event"; provider; api; model; data: unknown }` | 通知事件 | 每个已解析 provider stream event、Pi 规范化之前。`data` 只读,不是原始 HTTP/SSE 字节;handler 按 stream 顺序 await,慢 handler 拖住消费。[E: packages/coding-agent/docs/extensions.md:109] [E: packages/coding-agent/docs/extensions.md:111] | `ProviderStreamEvent` [E: packages/coding-agent/src/core/extensions/types.ts:901]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1596] |
| `model_select` | `{ type: "model_select"; model; previousModel; source: "set" \| "cycle" \| "restore" }` | 通知事件 | `/model`、model cycling 或 session restore 改变模型时。 | `ModelSelectEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1093]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1618] |
| `thinking_level_select` | `{ type: "thinking_level_select"; level; previousLevel }` | 通知事件;返回值忽略 | thinking level 变化时。 | `ThinkingLevelSelectEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1101]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1619] |

## Tool Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId; toolName; args; parentToolCallId? }` | 通知事件 | 工具开始执行。`parentToolCallId` 在另一工具(例如 codemode script)发起该 call 时出现。 | `ToolExecutionStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1055]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1615] |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId; toolName; args; partialResult; parentToolCallId? }` | 通知事件 | 工具执行期间的 partial/streaming update。 | `ToolExecutionUpdateEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1065]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1616] |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId; toolName; result; isError; parentToolCallId? }` | 通知事件 | 工具完成。 | `ToolExecutionEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1076]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1617] |
| `tool_call` | built-in variants for `bash/powershell/read/edit/write/grep/find/ls` plus `CustomToolCallEvent`;共同字段 `{ type: "tool_call"; toolCallId; parentToolCallId?; toolName; input }` | `ToolCallEventResult { block?; reason?; terminate? }`;也可 mutate `event.input` | agent-loop 先 emit `tool_execution_start`,再 `prepareToolCall` → `beforeToolCall`/`emitToolCall`,然后才 execute。`terminate` 只在该 call 被 block 时参与 batch 早停:仅当本 batch 每个 finalized result 都 `terminate: true` 时才跳过自动 follow-up LLM call。 | `ToolCallEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1413]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1620] |
| `tool_result` | built-in variants plus `CustomToolResultEvent`;共同字段 `{ type: "tool_result"; toolCallId; parentToolCallId?; toolName; input; content; structuredContent?; details; isError; usage? }` | `ToolResultEventResult { content?; details?; structuredContent?; isError?; usage? }` | 工具执行完成后、`tool_execution_end` 和最终 tool result message 前;patches 按 extension 顺序链式生效。只替换 `content` 而不返回 `structuredContent` 会丢掉旧 structured content。 | `ToolResultEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1442]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1621] |

## Input / User Bash Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `user_bash` | `{ type: "user_bash"; command; excludeFromContext; cwd }` | `UserBashEventResult { operations } \| { result }`;`undefined` 继续传播 | `!` / `!!` bash。非法 defined result 或 handler 失败阻断命令,不 fall through 到本地执行。[E: packages/coding-agent/docs/extensions.md:127] | `UserBashEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1112]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1622] |
| `input` | `{ type: "input"; text; images?; source: "interactive" \| "rpc" \| "extension"; streamingBehavior?: "steer" \| "followUp" }` | `{ action: "continue" } \| { action: "transform"; text; images? } \| { action: "handled" }` | 用户输入到达后,extension commands 之后、skill/template expansion 之前;`handled` 跳过 agent。 | `InputEvent` [E: packages/coding-agent/src/core/extensions/types.ts:1130]; `on()` [E: packages/coding-agent/src/core/extensions/types.ts:1623] |

## Type Guards And Typed Tool Variants

`tool_call` 与 `tool_result` 的 built-in variants 覆盖 `bash`、`powershell`、`read`、`edit`、`write`、`grep`、`find`、`ls`,同时保留 custom tool fallback。源码提供 `isToolCallEventType(...)` overload,其中包括 `isToolCallEventType("powershell", event)`。[E: packages/coding-agent/src/core/extensions/types.ts:1347] [E: packages/coding-agent/src/core/extensions/types.ts:1348] [E: packages/coding-agent/src/core/extensions/types.ts:1358] `tool_result` 侧提供 `isBashToolResult`、`isPowerShellToolResult`、`isReadToolResult`、`isEditToolResult`、`isWriteToolResult`、`isGrepToolResult`、`isFindToolResult`、`isLsToolResult` 八个 built-in result guards。[E: packages/coding-agent/src/core/extensions/types.ts:1302] [E: packages/coding-agent/src/core/extensions/types.ts:1305] [E: packages/coding-agent/src/core/extensions/types.ts:1323]

## Sources

- `packages/coding-agent/src/core/extensions/types.ts`
- `packages/coding-agent/src/core/extensions/runner.ts`
- `packages/coding-agent/src/core/cache-warmer.ts`
- `packages/coding-agent/src/core/mcp-servers.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/extensions/mcp/index.ts`
- `packages/coding-agent/docs/extensions.md`

## 相关

- [surface.extensions.events](../surface/extensions/events.md): extension hook 面的 T1 说明,解释事件族、时序和跨包边界;与本 catalog 同样按 **41** 个 `on()` overload 计数。
- [subsys.coding-agent.extension-runner](../subsystems/coding-agent/extension-runner.md): extension runner 的 handler 分发、`emitBoundary`、`mcp_servers_change` listener、返回值组合和错误处理实现。
- [spine.extension-lifecycle](../spine/extension-lifecycle.md): 从 factory 注册到 `bindCore` / `mcp_servers_change` 的端到端主线,含 41 个 overload 的声明顺序清单。
