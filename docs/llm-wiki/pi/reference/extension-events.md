---
id: ref.coding-agent.extension-events
title: 扩展事件目录(30)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/docs/extensions.md
symbols:
  - ExtensionEvent
related:
  - surface.extensions.events
  - subsys.coding-agent.extension-runner
evidence: explicit
status: verified
updated: 5a073885
---

> `ref.coding-agent.extension-events` 是 pi-coding-agent extension hook 的逐实例 catalog:以 `ExtensionEvent` union 和 `ExtensionAPI.on(...)` overload 为准,列出每个事件名、payload 字段、handler 返回值语义和文档化触发场景。

## 能回答的问题

- `ExtensionEvent` / `ExtensionAPI.on` 当前支持哪些事件名?
- 每个 extension event 的 payload 字段是什么?
- 哪些事件 handler 可以返回 cancel、block、transform、replacement 或资源路径?
- `tool_call`、`tool_result`、`tool_execution_*` 三组工具事件分别在什么阶段使用?
- session、input、provider、model、message 事件在用户文档里怎样解释?

## Catalog 口径

`ExtensionEvent` 是 extension 事件 payload 的总 union,源码把 startup/resource、`SessionEvent`、agent/message/tool execution、model、`user_bash`、`input`、`tool_call` 和 `tool_result` 分支全部列入同一个类型 [E: packages/coding-agent/src/core/extensions/types.ts:993] [E: packages/coding-agent/src/core/extensions/types.ts:1016]。`ExtensionAPI.on(...)` 为这些事件名提供 overload,从 `project_trust` 到 `input` 共 30 个可订阅事件名 [E: packages/coding-agent/src/core/extensions/types.ts:1133] [E: packages/coding-agent/src/core/extensions/types.ts:1171]。

用户文档的 lifecycle overview 把这些事件放进启动、用户输入、agent turn、工具调用、session replacement、fork/clone、compact、tree navigation、model selection 和退出流程 [E: packages/coding-agent/docs/extensions.md:276] [E: packages/coding-agent/docs/extensions.md:341]。`index.json` 的 `group.extension-events.instance_count` 仍是 29,但当前源码 catalog 可数到 30 个事件名;本节点按源码列 30 个,索引计数另记入 staging uncertainty [U]。

## Startup / Resource Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `project_trust` | `{ type: "project_trust"; cwd: string }` | `ProjectTrustEventResult { trusted: "yes" | "no" | "undecided"; remember?: boolean }` | 在项目动态配置和 project-local extension 加载前参与 trust 决策;文档说明只有 user/global extension 和 CLI `-e` extension 参与,第一个 yes/no 决策接管内置 trust prompt [E: packages/coding-agent/docs/extensions.md:348] [E: packages/coding-agent/docs/extensions.md:361]。 | `ProjectTrustEvent` [E: packages/coding-agent/src/core/extensions/types.ts:503]; `ProjectTrustEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:510] |
| `resources_discover` | `{ type: "resources_discover"; cwd: string; reason: "startup" \| "reload" }` | `ResourcesDiscoverResult { skillPaths?: string[]; promptPaths?: string[]; themePaths?: string[] }`;未返回字段时无额外资源路径可追加 [I]。 | 在 `session_start` 后让 extension 贡献额外 skills、prompts、themes 路径;文档把 startup path 的 reason 标为 `"startup"`,reload path 标为 `"reload"` [E: packages/coding-agent/docs/extensions.md:367] [E: packages/coding-agent/docs/extensions.md:368]。 | `ResourcesDiscoverEvent` [E: packages/coding-agent/src/core/extensions/types.ts:528]; `ResourcesDiscoverResult` [E: packages/coding-agent/src/core/extensions/types.ts:535] |

## Session Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `session_start` | `{ type: "session_start"; reason: "startup" \| "reload" \| "new" \| "resume" \| "fork"; previousSessionFile?: string }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1135]。 | session 启动、加载或重载时触发;payload 类型把 `previousSessionFile` 设为可选,`reason` 覆盖 `"new"`、`"resume"`、`"fork"` 等场景 [E: packages/coding-agent/src/core/extensions/types.ts:549] [E: packages/coding-agent/src/core/extensions/types.ts:551]。 | `SessionStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:546] |
| `session_before_switch` | `{ type: "session_before_switch"; reason: "new" \| "resume"; targetSessionFile?: string }` | `SessionBeforeSwitchResult { cancel?: boolean }`;未取消时继续切换 [I]。 | `/new` 或 `/resume` 切换前触发;handler 可取消切换 [E: packages/coding-agent/docs/extensions.md:398] [E: packages/coding-agent/docs/extensions.md:409]。 | `SessionBeforeSwitchEvent` [E: packages/coding-agent/src/core/extensions/types.ts:555]; `SessionBeforeSwitchResult` [E: packages/coding-agent/src/core/extensions/types.ts:1059] |
| `session_before_fork` | `{ type: "session_before_fork"; entryId: string; position: "before" \| "at" }` | `SessionBeforeForkResult { cancel?: boolean; skipConversationRestore?: boolean }`;未取消时继续 fork/clone [I]。 | `/fork` 或 `/clone` 前触发;文档示例把 `cancel` 用作取消 fork/clone,并把 `skipConversationRestore` 标成保留的未来控制项 [E: packages/coding-agent/docs/extensions.md:417] [E: packages/coding-agent/docs/extensions.md:427]。 | `SessionBeforeForkEvent` [E: packages/coding-agent/src/core/extensions/types.ts:562]; `SessionBeforeForkResult` [E: packages/coding-agent/src/core/extensions/types.ts:1063] |
| `session_before_compact` | `{ type: "session_before_compact"; preparation; branchEntries; customInstructions?; reason; willRetry; signal }` | `SessionBeforeCompactResult { cancel?: boolean; compaction?: CompactionResult }`;未取消且未提供 `compaction` 时继续内置 compaction [I]。 | `/compact`、threshold 或 overflow recovery compaction 前触发;handler 可取消或提供自定义 summary [E: packages/coding-agent/docs/extensions.md:446] [E: packages/coding-agent/docs/extensions.md:449]。 | `SessionBeforeCompactEvent` [E: packages/coding-agent/src/core/extensions/types.ts:569]; `SessionBeforeCompactResult` [E: packages/coding-agent/src/core/extensions/types.ts:1068] |
| `session_compact` | `{ type: "session_compact"; compactionEntry; fromExtension: boolean; reason; willRetry }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1145]。 | compaction 完成后触发,记录保存的 compaction entry、是否来自 extension、compaction reason 和 retry 标记 [E: packages/coding-agent/src/core/extensions/types.ts:584] [E: packages/coding-agent/src/core/extensions/types.ts:589]。 | `SessionCompactEvent` [E: packages/coding-agent/src/core/extensions/types.ts:582] |
| `session_shutdown` | `{ type: "session_shutdown"; reason: "quit" \| "reload" \| "new" \| "resume" \| "fork"; targetSessionFile?: string }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1146]。 | 已启动 session runtime 被 teardown 前触发;文档建议清理从 `session_start` 或 session-scoped hooks 打开的资源 [E: packages/coding-agent/docs/extensions.md:483] [E: packages/coding-agent/docs/extensions.md:485]。 | `SessionShutdownEvent` [E: packages/coding-agent/src/core/extensions/types.ts:593] |
| `session_before_tree` | `{ type: "session_before_tree"; preparation: TreePreparation; signal: AbortSignal }` | `SessionBeforeTreeResult { cancel?: boolean; summary?: { summary; details? }; customInstructions?; replaceInstructions?; label? }`;未取消或替换时继续内置 tree navigation [I]。 | `/tree` 导航前触发;handler 可取消或提供 custom summary [E: packages/coding-agent/docs/extensions.md:466] [E: packages/coding-agent/docs/extensions.md:475]。 | `SessionBeforeTreeEvent` [E: packages/coding-agent/src/core/extensions/types.ts:616]; `SessionBeforeTreeResult` [E: packages/coding-agent/src/core/extensions/types.ts:1073] |
| `session_tree` | `{ type: "session_tree"; newLeafId: string \| null; oldLeafId: string \| null; summaryEntry?: BranchSummaryEntry; fromExtension?: boolean }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1148]。 | `/tree` navigation 完成后触发,暴露新旧 leaf、可选 summary entry 和 from-extension 标记 [E: packages/coding-agent/src/core/extensions/types.ts:625] [E: packages/coding-agent/src/core/extensions/types.ts:628]。 | `SessionTreeEvent` [E: packages/coding-agent/src/core/extensions/types.ts:623] |

## Agent / Message Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `before_agent_start` | `{ type: "before_agent_start"; prompt: string; images?: ImageContent[]; systemPrompt: string; systemPromptOptions: BuildSystemPromptOptions }` | `BeforeAgentStartEventResult { message?: Pick<CustomMessage,...>; systemPrompt?: string }`;未返回字段时不注入 message、不改 system prompt [I]。 | 用户 prompt 提交后、agent loop 前触发;文档说明可注入持久 custom message 或替换本 turn system prompt [E: packages/coding-agent/docs/extensions.md:497] [E: packages/coding-agent/docs/extensions.md:525]。 | `BeforeAgentStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:665]; `BeforeAgentStartEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1053] |
| `agent_start` | `{ type: "agent_start" }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1156]。 | 每个用户 prompt 的 agent loop 开始时触发;文档把 `agent_start` / `agent_end` 说明为 once per user prompt [E: packages/coding-agent/docs/extensions.md:534] [E: packages/coding-agent/docs/extensions.md:536]。 | `AgentStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:678] |
| `agent_end` | `{ type: "agent_end"; messages: AgentMessage[] }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1157]。 | 每个用户 prompt 的 agent loop 结束时触发,携带该 prompt 产生的 messages [E: packages/coding-agent/docs/extensions.md:536] [E: packages/coding-agent/src/core/extensions/types.ts:685]。 | `AgentEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:683] |
| `turn_start` | `{ type: "turn_start"; turnIndex: number; timestamp: number }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1158]。 | 每个 turn 开始时触发;文档把一个 turn 定义为一次 LLM response 加 tool calls [E: packages/coding-agent/docs/extensions.md:546] [E: packages/coding-agent/docs/extensions.md:548]。 | `TurnStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:689] |
| `turn_end` | `{ type: "turn_end"; turnIndex: number; message: AgentMessage; toolResults: ToolResultMessage[] }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1159]。 | 每个 turn 结束时触发,携带最终 assistant message 和 tool result messages [E: packages/coding-agent/src/core/extensions/types.ts:699] [E: packages/coding-agent/src/core/extensions/types.ts:700]。 | `TurnEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:696] |
| `message_start` | `{ type: "message_start"; message: AgentMessage }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1160]。 | message lifecycle 开始事件;文档说明 start/end 覆盖 user、assistant 和 toolResult messages [E: packages/coding-agent/docs/extensions.md:560] [E: packages/coding-agent/docs/extensions.md:564]。 | `MessageStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:704] |
| `message_update` | `{ type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1161]。 | assistant streaming update 事件;文档明确 `message_update` 只用于 assistant streaming updates [E: packages/coding-agent/docs/extensions.md:565]。 | `MessageUpdateEvent` [E: packages/coding-agent/src/core/extensions/types.ts:710] |
| `message_end` | `{ type: "message_end"; message: AgentMessage }` | `MessageEndEventResult { message?: AgentMessage }`;未返回 replacement 时保留 finalized message [I]。 | finalized message 结束事件;handler 可替换 message,但 replacement 必须保持相同 `role` [E: packages/coding-agent/docs/extensions.md:566]。 | `MessageEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:717]; `MessageEndEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1048] |
| `context` | `{ type: "context"; messages: AgentMessage[] }` | `ContextEventResult { messages?: AgentMessage[] }`;未返回 `messages` 时保留原 messages [I]。 | 每次 LLM call 前触发,用于非破坏式改写即将发送给 provider 的 messages [E: packages/coding-agent/docs/extensions.md:620] [E: packages/coding-agent/docs/extensions.md:628]。 | `ContextEvent` [E: packages/coding-agent/src/core/extensions/types.ts:646]; `ContextEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1022] |

## Provider / Model Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `before_provider_request` | `{ type: "before_provider_request"; payload: unknown }` | `BeforeProviderRequestEventResult = unknown`;`undefined` 表示不替换 payload [E: packages/coding-agent/src/core/extensions/types.ts:1026]。 | provider-specific payload 构造完成、请求发送前触发;文档说明返回非 `undefined` 值会替换 payload 并传给后续 handler 和实际请求 [E: packages/coding-agent/docs/extensions.md:632] [E: packages/coding-agent/docs/extensions.md:634]。 | `BeforeProviderRequestEvent` [E: packages/coding-agent/src/core/extensions/types.ts:652] |
| `after_provider_response` | `{ type: "after_provider_response"; status: number; headers: Record<string,string> }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1154]。 | HTTP response 到达后、stream body 消费前触发;文档提醒 header 可用性取决于 provider 和 transport [E: packages/coding-agent/docs/extensions.md:649] [E: packages/coding-agent/docs/extensions.md:663]。 | `AfterProviderResponseEvent` [E: packages/coding-agent/src/core/extensions/types.ts:658] |
| `model_select` | `{ type: "model_select"; model: Model<any>; previousModel: Model<any> \| undefined; source: "set" \| "cycle" \| "restore" }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1166]。 | `/model`、model cycling 或 session restore 改变模型时触发 [E: packages/coding-agent/docs/extensions.md:667] [E: packages/coding-agent/docs/extensions.md:669]。 | `ModelSelectEvent` [E: packages/coding-agent/src/core/extensions/types.ts:755] |
| `thinking_level_select` | `{ type: "thinking_level_select"; level: ThinkingLevel; previousLevel: ThinkingLevel }` | 通知事件;用户文档明确 handler return values are ignored [E: packages/coding-agent/docs/extensions.md:688] [E: packages/coding-agent/docs/extensions.md:690]。 | thinking level 变化时触发,包括 `pi.setThinkingLevel()`、model 变化或 built-in thinking-level controls [E: packages/coding-agent/docs/extensions.md:701]。 | `ThinkingLevelSelectEvent` [E: packages/coding-agent/src/core/extensions/types.ts:763] |

## Tool Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `tool_execution_start` | `{ type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1163]。 | 工具开始执行的 lifecycle event;并行工具模式下 start 在 preflight 阶段按 assistant source order 发出 [E: packages/coding-agent/docs/extensions.md:596] [E: packages/coding-agent/docs/extensions.md:602]。 | `ToolExecutionStartEvent` [E: packages/coding-agent/src/core/extensions/types.ts:723] |
| `tool_execution_update` | `{ type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1164]。 | 工具执行期间的 partial/streaming update;并行工具模式下 update events may interleave across tools [E: packages/coding-agent/src/core/extensions/types.ts:733] [E: packages/coding-agent/src/core/extensions/types.ts:736] [E: packages/coding-agent/docs/extensions.md:602]。 | `ToolExecutionUpdateEvent` [E: packages/coding-agent/src/core/extensions/types.ts:731] |
| `tool_execution_end` | `{ type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean }` | 通知事件;`ExtensionAPI.on` 未声明 result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1165]。 | 工具完成 lifecycle event;并行工具模式下按 tool completion order 发出,final `toolResult` message events 仍按 assistant source order 发出 [E: packages/coding-agent/docs/extensions.md:603] [E: packages/coding-agent/docs/extensions.md:604]。 | `ToolExecutionEndEvent` [E: packages/coding-agent/src/core/extensions/types.ts:740] |
| `tool_call` | built-in variants for `bash/read/edit/write/grep/find/ls` plus `CustomToolCallEvent`;共同字段 `{ type: "tool_call"; toolCallId; toolName; input }` | `ToolCallEventResult { block?: boolean; reason?: string }`;未 `block` 时允许执行 [I],但 handler 也可直接 mutate `event.input` [E: packages/coding-agent/src/core/extensions/types.ts:1028]。 | `tool_execution_start` 后、工具执行前触发;可 block,也可改写 mutable input;文档说明 mutation 影响实际执行,后续 handlers 会看到 mutation,且不会重新 validate [E: packages/coding-agent/docs/extensions.md:705] [E: packages/coding-agent/docs/extensions.md:719]。 | `ToolCallEvent` [E: packages/coding-agent/src/core/extensions/types.ts:865]; built-ins/custom [E: packages/coding-agent/src/core/extensions/types.ts:819] [E: packages/coding-agent/src/core/extensions/types.ts:854] |
| `tool_result` | built-in variants for `bash/read/edit/write/grep/find/ls` plus `CustomToolResultEvent`;共同字段 `{ type: "tool_result"; toolCallId; toolName; input; content; details; isError }` | `ToolResultEventResult { content?: TextContent[]/ImageContent[]; details?: unknown; isError?: boolean }`;缺省为不 patch result [E: packages/coding-agent/docs/extensions.md:777]。 | 工具执行完成后、`tool_execution_end` 和最终 tool result message events 前触发;handler patches 链式生效 [E: packages/coding-agent/docs/extensions.md:770] [E: packages/coding-agent/docs/extensions.md:774]。 | `ToolResultEvent` [E: packages/coding-agent/src/core/extensions/types.ts:924]; built-ins/custom [E: packages/coding-agent/src/core/extensions/types.ts:883] [E: packages/coding-agent/src/core/extensions/types.ts:918]; `ToolResultEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1042] |

## Input / User Bash Events

| 事件名 | payload 字段/签名 | handler 返回值 / 默认 | 含义与使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `user_bash` | `{ type: "user_bash"; command: string; excludeFromContext: boolean; cwd: string }` | `UserBashEventResult { operations?: BashOperations; result?: BashResult }`;缺省为使用内置 user bash 执行路径 [I]。 | 用户通过 `!` 或 `!!` 执行 bash 时触发;handler 可提供 custom operations 或直接返回完整 result [E: packages/coding-agent/docs/extensions.md:807] [E: packages/coding-agent/docs/extensions.md:831]。 | `UserBashEvent` [E: packages/coding-agent/src/core/extensions/types.ts:774]; `UserBashEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:1035] |
| `input` | `{ type: "input"; text: string; images?: ImageContent[]; source: "interactive" \| "rpc" \| "extension"; streamingBehavior?: "steer" \| "followUp" }` | `InputEventResult = { action: "continue" } \| { action: "transform"; text; images? } \| { action: "handled" }`;缺省语义是 continue [E: packages/coding-agent/src/core/extensions/types.ts:805]。 | 用户输入到达后触发,发生在 extension commands 检查之后、skill/template expansion 之前;`handled` 跳过 agent,`transform` 修改 text/images 后继续 [E: packages/coding-agent/docs/extensions.md:837] [E: packages/coding-agent/docs/extensions.md:846] [E: packages/coding-agent/docs/extensions.md:880] [E: packages/coding-agent/docs/extensions.md:882]。 | `InputEvent` [E: packages/coding-agent/src/core/extensions/types.ts:792]; `InputEventResult` [E: packages/coding-agent/src/core/extensions/types.ts:805] |

## Type Guards And Typed Tool Variants

`tool_call` 与 `tool_result` 的 built-in variants 覆盖 `bash`、`read`、`edit`、`write`、`grep`、`find`、`ls`,同时保留 custom tool fallback,因此直接用 `event.toolName === "bash"` 不能可靠缩窄 custom-overlap 的 `ToolCallEvent` [I];源码提供 `isToolCallEventType(...)` overload 处理 built-in 和 custom tool input 缩窄 [E: packages/coding-agent/src/core/extensions/types.ts:977] [E: packages/coding-agent/src/core/extensions/types.ts:987]。`tool_result` 侧提供 `isBashToolResult`、`isReadToolResult`、`isEditToolResult`、`isWriteToolResult`、`isGrepToolResult`、`isFindToolResult`、`isLsToolResult` 七个 built-in result guards [E: packages/coding-agent/src/core/extensions/types.ts:935] [E: packages/coding-agent/src/core/extensions/types.ts:953]。

## Sources

- `packages/coding-agent/src/core/extensions/types.ts`
- `packages/coding-agent/docs/extensions.md`

## 相关

- [surface.extensions.events](../surface/extensions/events.md): extension hook 面的 T1 说明,解释事件族、时序和跨包边界。
- [subsys.coding-agent.extension-runner](../subsystems/coding-agent/extension-runner.md): extension runner 的 handler 分发、返回值组合和错误处理实现。
