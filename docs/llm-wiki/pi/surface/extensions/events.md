---
id: surface.extensions.events
title: 扩展事件(钩子)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/cache-warmer.ts
  - packages/coding-agent/src/core/mcp-servers.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/agent/src/agent-loop.ts
  - packages/coding-agent/docs/extensions.md
symbols:
  - ExtensionEvent
  - ExtensionAPI.on
  - emitToolCall
  - emitToolResult
  - emitInput
  - emitBoundary
  - sendUserMessage
related:
  - surface.extensions.api
  - ref.coding-agent.extension-events
  - subsys.coding-agent.extension-runner
  - subsys.coding-agent.usage-accounting
  - spine.extension-lifecycle
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> 扩展事件是 pi-coding-agent 暴露给 extension 作者的 hook 面:extension 通过 `pi.on(event, handler)` 订阅生命周期、输入、agent、provider、工具、模型和会话事件,并在少数事件上返回 block、transform、cancel、`BoundaryResult` 或 replacement。`on()` 从 `project_trust` 到 `input` 共 **41** 个 overload,含 `mcp_servers_change`,每个返回 unsubscribe。

## 能回答的问题

- `pi.on(...)` 支持哪些事件族,哪些事件只是通知,哪些事件能改变流程?
- `tool_call` 和 `tool_result` 的区别是什么,哪个能阻止执行,哪个能改结果?
- `input`、`before_agent_start`、`context` / `context_with_system`、`before_provider_request` 这些前置 hook 的链式语义有什么差别?
- `turn_end` / `agent_before_settle` 怎样追加 session entry 并请求下一次 model call?
- session replacement、reload、fork、compact、tree navigation 以及 `mcp_servers_change` 分别在什么阶段触发?
- 事件 handler 拿到的 `ctx` 是什么,`project_trust` 为什么是例外?
- 本节点和逐项事件目录 `ref.coding-agent.extension-events` 的边界在哪里?

## 入口与总模型

extension factory 拿到的 `ExtensionAPI` 暴露一组 `on(event, handler)` overload;每个 overload 把事件名字符串绑定到对应 event payload 与 handler result 类型,并且返回 `() => void` 用于取消该次注册。[E: packages/coding-agent/src/core/extensions/types.ts:1551] [E: packages/coding-agent/src/core/extensions/types.ts:1556] [E: packages/coding-agent/src/core/extensions/types.ts:1623] loader 把 handler 包一层再 push 进 `extension.handlers`,unsubscribe 按引用 splice;已经开始的 dispatch 不受影响,因为 runner 先 `snapshotEventHandlers()` 拷贝 handler 列表。[E: packages/coding-agent/src/core/extensions/loader.ts:272] [E: packages/coding-agent/src/core/extensions/loader.ts:279] [E: packages/coding-agent/src/core/extensions/runner.ts:269] [E: packages/coding-agent/src/core/extensions/runner.ts:270] [E: packages/coding-agent/docs/extensions.md:97]

通用 handler 形态是 `(event, ctx) => Promise<R | void> | R | void`,其中 `ctx` 通常是 `ExtensionContext`。[E: packages/coding-agent/src/core/extensions/types.ts:1546] `project_trust` 是例外:它使用 `ProjectTrustHandler` 和受限 `ProjectTrustContext`,只暴露 cwd、mode、hasUI 与少量 UI helper。[E: packages/coding-agent/src/core/extensions/types.ts:689] [E: packages/coding-agent/src/core/extensions/types.ts:696]

`ExtensionEvent` 是所有可订阅事件 payload 的联合类型,含 `McpServersChangeEvent`。[E: packages/coding-agent/src/core/extensions/types.ts:1364] [E: packages/coding-agent/src/core/extensions/types.ts:1367] `ExtensionAPI.on` overload 从 `project_trust` 到 `input` 共 **41** 个可订阅事件名,相对上一轮 40 事件集增加 `mcp_servers_change`(插在 `session_shutdown` 与 `session_before_tree` 之间)。[E: packages/coding-agent/src/core/extensions/types.ts:1556] [E: packages/coding-agent/src/core/extensions/types.ts:1578] [E: packages/coding-agent/src/core/extensions/types.ts:1623]

用户文档把一次 run 写成 input → `before_agent_start` → model/message/tool → `agent_end`,之后仍可能 retry/compact/queued work;`agent_before_settle` 是最后可行动边界,`agent_settled` 是最终通知。[E: packages/coding-agent/docs/extensions.md:62] [E: packages/coding-agent/docs/extensions.md:66] [E: packages/coding-agent/docs/extensions.md:67]

## 事件族速览

| 事件族 | 事件名 | 主要用途 | 返回值语义 |
| --- | --- | --- | --- |
| startup/resource | `project_trust`, `resources_discover`, `mcp_servers_change` | 决定项目动态资源信任;追加 skills/prompts/themes 路径;bind 后 MCP 登记变化 | `project_trust` 首个 yes/no 决策获胜;`resources_discover` 聚合路径;`mcp_servers_change` 只通知,但有 handler 等于宣称自己负责 connect [E: packages/coding-agent/src/core/extensions/runner.ts:301] [E: packages/coding-agent/src/core/extensions/runner.ts:310] [E: packages/coding-agent/src/core/extensions/runner.ts:753] |
| session | `session_start`, `session_info_changed`, `session_before_switch`, `session_before_fork`, `session_before_compact`, `session_compact`, `session_compact_failed`, `session_shutdown`, `session_before_tree`, `session_tree` | session 启动/名称变化、替换、fork/clone、压缩成功/失败、树导航、退出清理 | `session_before_*` 可返回 cancel/custom result;普通 session 事件多为通知 [E: packages/coding-agent/src/core/extensions/types.ts:748] [E: packages/coding-agent/src/core/extensions/types.ts:762] [E: packages/coding-agent/src/core/extensions/types.ts:786] |
| agent/message | `before_agent_start`, `agent_start`, `agent_end`, `agent_before_settle`, `agent_settled`, `ui_prompt_start`, `ui_prompt_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `context`, `context_with_system` | 注入上下文、观察 run/settled/UI prompt/turn/message 生命周期、改写 conversation 或完整 transcript、在边界追加 entry | `turn_end` / `agent_before_settle` 返回 `BoundaryResult`;`context` 看不见 system messages;`context_with_system` 拥有完整 transcript;`agent_settled` 只通知 [E: packages/coding-agent/src/core/extensions/types.ts:862] [E: packages/coding-agent/src/core/extensions/types.ts:872] [E: packages/coding-agent/src/core/extensions/types.ts:985] [E: packages/coding-agent/src/core/extensions/types.ts:991] [E: packages/coding-agent/src/core/extensions/types.ts:1406] |
| provider/model | `before_provider_request`, `before_provider_headers`, `after_provider_response`, `provider_stream_event`, `model_select`, `thinking_level_select` | 改写 payload/headers;观察 HTTP response;观察规范化前的 stream event;响应模型/思考级别变化 | request hook 可替换 payload;headers hook 原位修改;`provider_stream_event` 只通知且 `data` 只读 [E: packages/coding-agent/src/core/extensions/types.ts:878] [E: packages/coding-agent/src/core/extensions/types.ts:901] [E: packages/coding-agent/docs/extensions.md:109] |
| cache | `cache_warming_decision` | 覆盖一次 prompt-cache refresh | 最后一个返回 `action` 的 handler 获胜 [E: packages/coding-agent/src/core/extensions/runner.ts:1121] [E: packages/coding-agent/src/core/extensions/runner.ts:1129] |
| tool | `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `tool_call`, `tool_result` | 观察工具生命周期;拦截工具调用;改写工具结果 | `tool_call` 可 block 且可 mutate input;`tool_result` 可 patch content/details/structuredContent/isError/usage [E: packages/coding-agent/src/core/extensions/types.ts:1413] [E: packages/coding-agent/src/core/extensions/types.ts:1442] |
| input/bash | `input`, `user_bash` | 在 skill/template expansion 前处理用户输入;拦截 `!`/`!!` bash | `input` 返回 continue/transform/handled;`user_bash` 可替换 operations 或直接给 result [E: packages/coding-agent/src/core/extensions/types.ts:1143] [E: packages/coding-agent/src/core/extensions/types.ts:1425] |

本表只解释事件族和控制能力;逐项列出每个事件 payload 字段、result 字段和完整 41 个 event name 清单应由 [ref.coding-agent.extension-events](../../reference/extension-events.md) 覆盖 [I]。

## 启动、资源、MCP 与 session 事件

`project_trust` 在项目动态资源加载前运行;只有 user/global 和 CLI `-e` extension 参与,project-local extensions 要等 trust resolved 后才会加载。[E: packages/coding-agent/docs/extensions.md:50] handler 必须返回 `{ trusted: "yes" | "no" | "undecided" }`;第一个 yes/no 决策接管信任决定,`remember` 可持久化。[E: packages/coding-agent/src/core/extensions/types.ts:684] [E: packages/coding-agent/src/core/extensions/runner.ts:307] [E: packages/coding-agent/src/core/extensions/runner.ts:310]

`resources_discover` 在 `session_start` 后触发,用于追加 skill、prompt 和 theme 路径。[E: packages/coding-agent/src/core/extensions/types.ts:702] 类型层只允许返回 `skillPaths`、`promptPaths`、`themePaths`。[E: packages/coding-agent/src/core/extensions/types.ts:709] runner 聚合这些路径并给每个 path 附上贡献它的 `extensionPath`。[E: packages/coding-agent/src/core/extensions/runner.ts:1495]

`mcp_servers_change` 的 payload 是变更后的全部 `RegisteredMcpServer`(`name` / `config` / `extensionPath`)。[E: packages/coding-agent/src/core/extensions/types.ts:721] [E: packages/coding-agent/src/core/extensions/types.ts:724] [E: packages/coding-agent/src/core/mcp-servers.ts:281] `ExtensionRunner.bindCore()` 才给 `runtime.mcpServers` 安装 change listener;之后的 `register` / `unregister` emit `{ type: "mcp_servers_change", servers: list() }`。load 阶段登记不 emit,应在 `session_start` 用 `pi.getMcpServers()` 读。[E: packages/coding-agent/src/core/extensions/runner.ts:458] [E: packages/coding-agent/src/core/extensions/runner.ts:459] [E: packages/coding-agent/src/core/mcp-servers.ts:296] handler 是通知-only,但只要有任何 extension `on("mcp_servers_change")`,runner 就认为有人负责 connect;否则 `reportUnhandledMcpServers()` 对每个已登记 server `emitError`。[E: packages/coding-agent/src/core/extensions/types.ts:1578] [E: packages/coding-agent/src/core/extensions/runner.ts:752] [E: packages/coding-agent/src/core/extensions/runner.ts:753] [E: packages/coding-agent/src/core/agent-session.ts:3233] 内置 MCP 扩展在 `sessionActive` 时按该事件立刻连接新增 server、关掉注销或改 config 的 server。[E: packages/coding-agent/src/extensions/mcp/index.ts:1097]

session replacement 类事件分两段:替换前的 `session_before_switch`、`session_before_fork`、`session_before_compact`、`session_before_tree` 能取消或定制操作;替换/压缩/导航后的 `session_start`、`session_compact`、`session_compact_failed`、`session_tree` 和 teardown 前的 `session_shutdown` 用来重建、观察失败或清理。[E: packages/coding-agent/src/core/extensions/types.ts:748] [E: packages/coding-agent/src/core/extensions/types.ts:775] [E: packages/coding-agent/src/core/extensions/types.ts:786] [E: packages/coding-agent/src/core/extensions/types.ts:801] 通用 `emit()` 对 `session_before_*` 一旦 result 带 `cancel` 就立即返回。[E: packages/coding-agent/src/core/extensions/runner.ts:1098] [E: packages/coding-agent/src/core/extensions/runner.ts:1100]

`session_compact_failed` 是 compaction 失败或 abort 后的通知:`reason` 与成功路径相同,`errorMessage` 仅非 abort 失败时出现,`fromExtension` 表示当时正在使用 `session_before_compact` 提供的内容。[E: packages/coding-agent/src/core/extensions/types.ts:786] [E: packages/coding-agent/src/core/extensions/types.ts:797]

`ui_prompt_start` / `ui_prompt_end` 包住 `ctx.ui.select()`、`confirm()`、`input()`、`editor()`、`custom()`;嵌套/重叠 prompt 合并成一段 outer waiting span,handler 不在展示/关闭 prompt 前 await。[E: packages/coding-agent/src/core/extensions/types.ts:1003] [E: packages/coding-agent/src/core/extensions/runner.ts:582] [E: packages/coding-agent/src/core/extensions/runner.ts:611]

`session_before_compact` 的 custom `compaction` 是完整 `CompactionResult`,可携带 provider `usage`;`session_before_tree` 的 custom `summary` 也允许 `{ summary, details?, usage? }`。[E: packages/coding-agent/src/core/extensions/types.ts:1470] [E: packages/coding-agent/src/core/extensions/types.ts:1472] [E: packages/coding-agent/src/core/extensions/types.ts:1477]

## 输入与 agent 前置 hook

`input` 发生在 extension commands 之后、skill/template expansion 之前。[E: packages/coding-agent/docs/extensions.md:62] `steer()` / `followUp()` 也经 `_queueUserInput()` 走到 `_runInputHandlers()` → `emitInput()`。[E: packages/coding-agent/src/core/agent-session.ts:2169] [E: packages/coding-agent/src/core/agent-session.ts:2185] [E: packages/coding-agent/src/core/agent-session.ts:2126] [E: packages/coding-agent/src/core/agent-session.ts:1880] `InputEventResult` 的三态是 `continue`、`transform`、`handled`;`handled` 跳过 agent。[E: packages/coding-agent/src/core/extensions/types.ts:1143] runner 的 `emitInput()` 遇到 `handled` 立即返回,遇到 `transform` 更新当前 text/images 给后续 handler。[E: packages/coding-agent/src/core/extensions/runner.ts:1541] [E: packages/coding-agent/src/core/extensions/runner.ts:1542]

`before_agent_start` 在用户 prompt 提交后、agent loop 前触发,可返回 custom message 或替换本 turn 的 system prompt。[E: packages/coding-agent/src/core/extensions/types.ts:910] [E: packages/coding-agent/src/core/extensions/types.ts:1455] runner 聚合 custom messages,并把 `systemPrompt` 写成 `forceSystemPrompt`;后续 handler 看到前面改过的 `systemPromptOptions`。[E: packages/coding-agent/src/core/extensions/runner.ts:1453] [E: packages/coding-agent/src/core/extensions/runner.ts:1455] [E: packages/coding-agent/docs/extensions.md:103]

`context` 在每次 LLM call 前触发。handler 只看见非 system 的 conversation;`messages` 里没有 prompt/tool 的 system messages,Pi 在 handler 返回后 `restoreSystemMessages()`。[E: packages/coding-agent/src/core/extensions/types.ts:862] [E: packages/coding-agent/src/core/extensions/types.ts:864] [E: packages/coding-agent/src/core/extensions/runner.ts:1305] [E: packages/coding-agent/src/core/extensions/runner.ts:1315] 改过 conversation 时,Pi 用 `getCurrentSystemMessage()` 作为 leading system message 重建,避免 filter/slice 丢掉工具声明。[E: packages/coding-agent/src/core/extensions/runner.ts:291] [E: packages/coding-agent/src/core/extensions/runner.ts:292] [E: packages/coding-agent/docs/extensions.md:115]

`context_with_system` 在所有 `context` handler 跑完、Pi 恢复 prompt/tool 之后触发。`messages` 是含 system 的完整 transcript,返回值按原样发送;handler 拥有 prompt 和 tool declarations。[E: packages/coding-agent/src/core/extensions/types.ts:872] [E: packages/coding-agent/src/core/extensions/types.ts:874] [E: packages/coding-agent/src/core/extensions/runner.ts:1329] 丢掉 leading system message 会 `emitError`,但仍尊重 handler 输出。[E: packages/coding-agent/src/core/extensions/runner.ts:1338] [E: packages/coding-agent/src/core/extensions/runner.ts:1342]

`before_provider_request` 发生在 provider-specific payload 构造完成、请求发送前;返回非 `undefined` 会替换 payload 并传给后续 handler 与实际请求。[E: packages/coding-agent/src/core/extensions/runner.ts:1373] `before_provider_headers` 原位修改 shared headers,设为 `null` 表示删除,返回值忽略。[E: packages/coding-agent/src/core/extensions/types.ts:888] [E: packages/coding-agent/src/core/extensions/runner.ts:1403]

`provider_stream_event` 在 Pi 规范化之前,对每个已解析的 provider stream event 发出。event 带 `provider` / `api` / `model` / `data`;`data` 是 Pi 能拿到的最早结构化值,不是原始 HTTP/SSE 字节,应只读。notification-only,不持久化;handler 按 stream 顺序被 await,慢 handler 会拖住消费。[E: packages/coding-agent/src/core/extensions/types.ts:901] [E: packages/coding-agent/src/core/sdk.ts:372] [E: packages/coding-agent/src/core/sdk.ts:378] [E: packages/coding-agent/docs/extensions.md:109] [E: packages/coding-agent/docs/extensions.md:111]

## 可行动边界:`turn_end` 与 `agent_before_settle`

`turn_end` 不再是纯通知。它 extends `BoundaryState`,额外带 `turnIndex`、assistant `message`、`toolResults`、`messageEntryId`、`toolResultEntryIds`。[E: packages/coding-agent/src/core/extensions/types.ts:1026] [E: packages/coding-agent/src/core/extensions/types.ts:978] `TurnEndEventResult` 就是 `BoundaryResult`:`{ entries?: SessionBoundaryDraft[]; continue?: boolean }`。[E: packages/coding-agent/src/core/extensions/types.ts:1406] [E: packages/coding-agent/src/core/extensions/types.ts:985]

`agent_before_settle` 是最终可行动边界,同样带 `entries` / `continue` / `context` / `outcome`。[E: packages/coding-agent/src/core/extensions/types.ts:991] [E: packages/coding-agent/src/core/extensions/types.ts:1603] draft 类型是 `custom`、`custom_message`、`context_edit`、`compaction`。[E: packages/coding-agent/src/core/extensions/types.ts:964] [E: packages/coding-agent/docs/extensions.md:117]

runner 用 `emitBoundary()` 而不是通用 `emit()` 分发这两个事件:每个 handler 看到当前 `entries`/`continue`/`context`,返回值链式覆盖;entries 非法时该次 dispatch 作废并 `emitError`。[E: packages/coding-agent/src/core/extensions/runner.ts:176] [E: packages/coding-agent/src/core/extensions/runner.ts:191] [E: packages/coding-agent/src/core/extensions/runner.ts:1029] [E: packages/coding-agent/src/core/extensions/runner.ts:1049] [E: packages/coding-agent/src/core/extensions/runner.ts:1075] `AgentSession` 在 `finishTurn` 里 dispatch `turn_end`,在 run 收尾 dispatch `agent_before_settle`;`continue: true` 且 `canContinue` 才会真正再要一次 provider request。[E: packages/coding-agent/src/core/agent-session.ts:838] [E: packages/coding-agent/src/core/agent-session.ts:862] [E: packages/coding-agent/src/core/agent-session.ts:1851] [E: packages/coding-agent/src/core/agent-session.ts:1860]

无条件 `continue: true` 可能循环,文档要求 handler 自己设守卫。[E: packages/coding-agent/docs/extensions.md:117]

## `agent_settled` 不再重入 `agent_start`

`agent_settled` 是 notification-only,表示不会再自动 retry、compact 或消费 queued continuation。[E: packages/coding-agent/src/core/extensions/types.ts:996] [E: packages/coding-agent/docs/extensions.md:67] `_emitAgentSettled()` 先把 `_isAgentRunActive` 设为 false(因此 handler 看到 `ctx.isIdle() === true`),再 emit;在这段 dispatch 里调用 `prompt()` / `sendMessage({ triggerTurn: true })` 会被推进 `_deferredSettledActions`,等全部 settled handler 结束后再跑,避免同一次通知里重入 `agent_start`。[E: packages/coding-agent/src/core/agent-session.ts:1052] [E: packages/coding-agent/src/core/agent-session.ts:1053] [E: packages/coding-agent/src/core/agent-session.ts:1055] [E: packages/coding-agent/src/core/agent-session.ts:1922] [E: packages/coding-agent/src/core/agent-session.ts:2268]

## 工具事件

`tool_execution_start`、`tool_execution_update`、`tool_execution_end` 是工具执行生命周期事件,均可带可选 `parentToolCallId`。[E: packages/coding-agent/src/core/extensions/types.ts:1055] [E: packages/coding-agent/src/core/extensions/types.ts:1065] [E: packages/coding-agent/src/core/extensions/types.ts:1076] 并行工具下不要假设 sibling call/result 已经存在。[E: packages/coding-agent/docs/extensions.md:123]

`tool_call` 在 `tool_execution_start` 之后、真正 execute 之前触发:agent-loop sequential/parallel path 先 emit `tool_execution_start`,再 `prepareToolCall()` → `beforeToolCall` → `emitToolCall()`。[E: packages/agent/src/agent-loop.ts:542] [E: packages/agent/src/agent-loop.ts:549] [E: packages/agent/src/agent-loop.ts:727] [E: packages/coding-agent/src/core/agent-session.ts:640] 可 block,且 `event.input` 可变;后续 handler 看到前序 mutation,不会重新 validate。[E: packages/coding-agent/src/core/extensions/types.ts:1215] result 限定为 `block`/`reason`/`terminate`。[E: packages/coding-agent/src/core/extensions/types.ts:1413] `terminate` 只对 blocked call 生效,并且当前 tool batch 的每个 finalized result 都 `terminate: true` 时才跳过自动 follow-up LLM call。[E: packages/coding-agent/src/core/extensions/types.ts:1421] [E: packages/agent/src/agent-loop.ts:690] runner 的 `emitToolCall()` 只要 result 带 `block` 就短路返回。[E: packages/coding-agent/src/core/extensions/runner.ts:1252]

`pi.sendUserMessage(content, options?)` 始终触发一个 turn。`options.expandPromptTemplates` 为 true 时会先走 extension command,再展开 skill command 与 prompt template;API 默认是 `false`,而普通 `prompt()` 默认是 `true`。[E: packages/coding-agent/src/core/extensions/types.ts:1700] [E: packages/coding-agent/src/core/extensions/types.ts:1702] [E: packages/coding-agent/src/core/agent-session.ts:2318] [E: packages/coding-agent/src/core/agent-session.ts:2343]

`tool_result` 在工具执行完成后触发;handler 可改 `content`、`details`、`structuredContent`、`isError`、`usage`。只替换 `content` 而不返回 `structuredContent` 会丢掉旧 structured content。[E: packages/coding-agent/src/core/extensions/types.ts:1442] [E: packages/coding-agent/src/core/extensions/runner.ts:1194] [E: packages/coding-agent/src/core/extensions/runner.ts:1197] runner 链式 merge,没有字段被改时返回 `undefined`。[E: packages/coding-agent/src/core/extensions/runner.ts:1183] [E: packages/coding-agent/src/core/extensions/runner.ts:1229]

内置工具的 `tool_call` 可用 `isToolCallEventType("bash", event)` 缩窄 input 类型;custom tool 需要显式 type parameters。[E: packages/coding-agent/src/core/extensions/types.ts:1347] [E: packages/coding-agent/src/core/extensions/types.ts:1355] `tool_result` 侧提供 `isBashToolResult`、`isPowerShellToolResult` 等八个 built-in guard。[E: packages/coding-agent/src/core/extensions/types.ts:1302] [E: packages/coding-agent/src/core/extensions/types.ts:1323]

## 消息、模型、bash、cache warming 与退出清理

`message_start` 和 `message_end` 覆盖 user、assistant、toolResult 消息,`message_update` 只覆盖 assistant streaming updates。[E: packages/coding-agent/src/core/extensions/types.ts:1036] [E: packages/coding-agent/src/core/extensions/types.ts:1042] `message_end` handler 可返回 replacement message,但必须保持同一个 role;role 变化时 runner 发 extension error 并忽略。[E: packages/coding-agent/src/core/extensions/runner.ts:1156] [E: packages/coding-agent/src/core/extensions/runner.ts:1160]

`model_select` 和 `thinking_level_select` 是模型与思考级别变化通知。[E: packages/coding-agent/src/core/extensions/types.ts:1093] [E: packages/coding-agent/src/core/extensions/types.ts:1101]

`user_bash` 拦截 `!` / `!!`。返回 `undefined` 继续下一个 handler 以至本地执行;返回 `{ operations }` 或 `{ result }` 停止传播。handler 失败或非法 defined result 会阻断命令,而不是 fall through。[E: packages/coding-agent/src/core/extensions/types.ts:1112] [E: packages/coding-agent/src/core/extensions/runner.ts:1270] [E: packages/coding-agent/docs/extensions.md:127]

`cache_warming_decision` 在每次 idle/streaming refresh 前发出,可覆盖 `{ action: "warm" | "stop" }`;最后一个返回 action 的 handler 获胜。[E: packages/coding-agent/src/core/cache-warmer.ts:114] [E: packages/coding-agent/src/core/extensions/runner.ts:1121] [E: packages/coding-agent/docs/extensions.md:121]

`session_shutdown` 在已启动 session runtime 被 teardown 前触发。[E: packages/coding-agent/src/core/extensions/types.ts:801] `emitSessionShutdownEvent()` 没有 handler 时返回 `false`。[E: packages/coding-agent/src/core/extensions/runner.ts:258] [E: packages/coding-agent/src/core/extensions/runner.ts:266]

## 跨包关系

[surface.extensions.api](api.md) 是 extension API 主入口:它覆盖 extension factory、`ExtensionAPI`、`ExtensionContext` 和注册贡献点的总体 shape;本节点只展开 `pi.on(...)` 事件 hooks 的事件族、返回值和时序 [I]。

[subsys.coding-agent.extension-runner](../../subsystems/coding-agent/extension-runner.md) 是 runner 实现节点:它详写 `emitBoundary()`、通用 `emit()`、专用 emitters、`mcp_servers_change` listener、snapshot unsubscribe 和错误处理;本节点用这些实现细节解释 public event contract [I]。

[ref.coding-agent.extension-events](../../reference/extension-events.md) 是 grouped catalog:它应逐一列出全部 **41** 个 `ExtensionAPI.on` 事件名、payload 字段和 result 字段(含 `mcp_servers_change`);本节点是 T1 surface,不逐项承担完整 catalog 覆盖率 [I]。

[spine.extension-lifecycle](../../spine/extension-lifecycle.md) 把 41 个 overload 的声明顺序和 `bindCore` 后的 `mcp_servers_change` 放进端到端主线 [I]。

## Sources

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/cache-warmer.ts
- packages/coding-agent/src/core/mcp-servers.ts
- packages/coding-agent/src/extensions/mcp/index.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/docs/extensions.md

## 相关

- [surface.extensions.api](api.md): extension factory、主 API 对象和 context 的总入口。
- [ref.coding-agent.extension-events](../../reference/extension-events.md): 扩展事件逐项 catalog,41 个 `on()` overload。
- [subsys.coding-agent.extension-runner](../../subsystems/coding-agent/extension-runner.md): handler 分发、返回值组合和 runner 内部状态。
- [subsys.coding-agent.usage-accounting](../../subsystems/coding-agent/usage-accounting.md): 工具、压缩与分支总结 usage 的聚合和持久化链路。
- [spine.extension-lifecycle](../../spine/extension-lifecycle.md): factory → bind → `mcp_servers_change` 的端到端主线。
