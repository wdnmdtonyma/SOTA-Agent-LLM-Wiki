---
id: surface.extensions.events
title: 扩展事件(钩子)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/docs/extensions.md
symbols:
  - ExtensionEvent
  - ExtensionAPI.on
  - emitToolCall
  - emitToolResult
  - emitInput
related:
  - surface.extensions.api
  - ref.coding-agent.extension-events
  - subsys.coding-agent.extension-runner
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: cee5ff7520
---

> 扩展事件是 pi-coding-agent 暴露给 extension 作者的 hook 面:extension 通过 `pi.on(event, handler)` 订阅生命周期、输入、agent、provider、工具、模型和会话事件,并在少数事件上返回 block、transform、cancel 或 replacement。

## 能回答的问题

- `pi.on(...)` 支持哪些事件族,哪些事件只是通知,哪些事件能改变流程?
- `tool_call` 和 `tool_result` 的区别是什么,哪个能阻止执行,哪个能改结果?
- `input`、`before_agent_start`、`context`、`before_provider_request` 这些前置 hook 的链式语义有什么差别?
- session replacement、reload、fork、compact、tree navigation 相关事件分别在什么阶段触发?
- 事件 handler 拿到的 `ctx` 是什么,`project_trust` 为什么是例外?
- 本节点和逐项事件目录 `ref.coding-agent.extension-events` 的边界在哪里?

## 入口与总模型

extension factory 拿到的 `ExtensionAPI` 暴露一组 `on(event, handler)` overload;每个 overload 把事件名字符串绑定到对应 event payload 与 handler result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1179] [E: packages/coding-agent/src/core/extensions/types.ts:1184] [E: packages/coding-agent/src/core/extensions/types.ts:1225]。通用 handler 形态是 `(event, ctx) => Promise<R | void> | R | void`,其中 `ctx` 通常是 `ExtensionContext` [E: packages/coding-agent/src/core/extensions/types.ts:1174]。`project_trust` 是例外:它使用 `ProjectTrustHandler` 和受限 `ProjectTrustContext`,只暴露 cwd、mode、hasUI 与少量 UI helper [E: packages/coding-agent/src/core/extensions/types.ts:525] [E: packages/coding-agent/src/core/extensions/types.ts:532]。

`ExtensionEvent` 是所有可订阅事件 payload 的联合类型,包含 startup/resource、session、agent/message/tool execution、model、user bash、input、tool call/result 等分支 [E: packages/coding-agent/src/core/extensions/types.ts:1028] [E: packages/coding-agent/src/core/extensions/types.ts:1053]。当前 `ExtensionAPI.on` overload、reference catalog 与 index 统一按 33 个可订阅事件名计数 [E: packages/coding-agent/src/core/extensions/types.ts:1184] [E: packages/coding-agent/src/core/extensions/types.ts:1225] [I]。

用户文档给出的生命周期图把启动、用户输入、agent turn、工具调用、session replacement、fork/clone、compact、tree navigation、model selection 和退出串成一条事件流 [E: packages/coding-agent/docs/extensions.md:280] [E: packages/coding-agent/docs/extensions.md:347]。这张图是 extension 作者理解顺序的主入口;源码的 runner 则定义 handler 如何被调用、返回值如何组合 [I]。

## 事件族速览

| 事件族 | 事件名 | 主要用途 | 返回值语义 |
| --- | --- | --- | --- |
| startup/resource | `project_trust`, `resources_discover` | 决定项目动态资源信任;追加 skills/prompts/themes 路径 | `project_trust` 首个 yes/no 决策获胜;`resources_discover` 聚合路径 [E: packages/coding-agent/src/core/extensions/runner.ts:201] [E: packages/coding-agent/src/core/extensions/runner.ts:215] [E: packages/coding-agent/src/core/extensions/runner.ts:1157] |
| session | `session_start`, `session_info_changed`, `session_before_switch`, `session_before_fork`, `session_before_compact`, `session_compact`, `session_shutdown`, `session_before_tree`, `session_tree` | session 启动/名称变化、替换、fork/clone、压缩、树导航、退出清理 | `session_before_*` 可返回 cancel/custom result;普通 session 事件多为通知 [E: packages/coding-agent/src/core/extensions/types.ts:565] [E: packages/coding-agent/src/core/extensions/types.ts:572] [E: packages/coding-agent/src/core/extensions/types.ts:586] [E: packages/coding-agent/src/core/extensions/types.ts:633] |
| agent/message | `before_agent_start`, `agent_start`, `agent_end`, `agent_settled`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `context` | 注入上下文、观察 run/settled/turn/message 生命周期、改写 message list 或 finalized message | `agent_settled` 表示不会再自动 retry/compact/continue；`before_agent_start` 可加 custom message 或改 system prompt；`context` 链式替换 messages [E: packages/coding-agent/src/core/extensions/types.ts:693] [E: packages/coding-agent/src/core/extensions/types.ts:717] [E: packages/coding-agent/src/core/extensions/types.ts:664] |
| provider/model | `before_provider_request`, `before_provider_headers`, `after_provider_response`, `model_select`, `thinking_level_select` | 查看或改写 provider payload/headers；观察 HTTP response header/status；响应模型/思考级别变化 | request hook 可替换 payload；headers hook 原位修改 headers；其余主要是通知 [E: packages/coding-agent/src/core/extensions/types.ts:670] [E: packages/coding-agent/src/core/extensions/types.ts:681] [E: packages/coding-agent/src/core/extensions/types.ts:686] [E: packages/coding-agent/src/core/extensions/types.ts:788] |
| tool | `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `tool_call`, `tool_result` | 观察工具生命周期;拦截工具调用;改写工具结果 | `tool_call` 可 block 且可 mutate input;`tool_result` 可 patch content/details/isError/usage [E: packages/coding-agent/src/core/extensions/types.ts:756] [E: packages/coding-agent/src/core/extensions/types.ts:908] [E: packages/coding-agent/src/core/extensions/types.ts:1079] |
| input/bash | `input`, `user_bash` | 在 skill/template expansion 前处理用户输入;拦截 `!`/`!!` bash | `input` 返回 continue/transform/handled;`user_bash` 可替换 bash operations 或直接给 result [E: packages/coding-agent/src/core/extensions/types.ts:825] [E: packages/coding-agent/src/core/extensions/types.ts:838] [E: packages/coding-agent/src/core/extensions/types.ts:807] [E: packages/coding-agent/src/core/extensions/types.ts:1072] |

本表只解释事件族和控制能力;逐项列出每个事件 payload 字段、result 字段和完整 event name 清单应由 [ref.coding-agent.extension-events](../../reference/extension-events.md) 覆盖 [I]。

## 启动、资源与 session 事件

`project_trust` 在项目动态资源加载前运行,文档限定只有 user/global extensions 和 CLI `-e` extensions 参与,project-local extensions 要等 trust resolved 后才会加载 [E: packages/coding-agent/docs/extensions.md:354]。handler 必须返回 `{ trusted: "yes" | "no" | "undecided" }`;第一个 yes/no 决策会接管信任决定,`remember` 可持久化该决定 [E: packages/coding-agent/docs/extensions.md:367]。

`resources_discover` 在 `session_start` 后触发,用于追加 skill、prompt 和 theme 路径 [E: packages/coding-agent/docs/extensions.md:373]。类型层只允许返回 `skillPaths`、`promptPaths`、`themePaths`,没有 extension path 或 tool path 字段 [E: packages/coding-agent/src/core/extensions/types.ts:545] [E: packages/coding-agent/src/core/extensions/types.ts:546] [E: packages/coding-agent/src/core/extensions/types.ts:548]。runner 聚合这些路径并给每个 path 附上贡献它的 `extensionPath`,这是 runtime 内部 attribution,不是 extension handler 自己返回的字段 [E: packages/coding-agent/src/core/extensions/runner.ts:1134] [E: packages/coding-agent/src/core/extensions/runner.ts:1157] [E: packages/coding-agent/src/core/extensions/runner.ts:1164]。

session replacement 类事件分两段:替换前的 `session_before_switch`、`session_before_fork`、`session_before_compact`、`session_before_tree` 能取消或定制操作;替换/压缩/导航后的 `session_start`、`session_compact`、`session_tree` 和 teardown 前的 `session_shutdown` 用来重建或清理 extension 状态 [E: packages/coding-agent/src/core/extensions/types.ts:572] [E: packages/coding-agent/src/core/extensions/types.ts:599] [E: packages/coding-agent/src/core/extensions/types.ts:610] [E: packages/coding-agent/src/core/extensions/types.ts:640]。通用 `emit()` 对 `session_before_*` 事件读取 handler result,一旦 result 带 `cancel` 就立即返回 [E: packages/coding-agent/src/core/extensions/runner.ts:779] [E: packages/coding-agent/src/core/extensions/runner.ts:800] [E: packages/coding-agent/src/core/extensions/runner.ts:802]。

`session_before_compact` 的 custom `compaction` 是完整 `CompactionResult`,可携带 provider `usage`;`session_before_tree` 的 custom `summary` 也允许 `{ summary, details?, usage? }`。这让 extension 提供的摘要仍能进入会话用量归集，而不是只替换文本 [E: packages/coding-agent/src/core/extensions/types.ts:1106] [E: packages/coding-agent/src/core/extensions/types.ts:1108] [E: packages/coding-agent/src/core/extensions/types.ts:1111] [E: packages/coding-agent/src/core/extensions/types.ts:1113] [E: packages/coding-agent/src/core/extensions/types.ts:1116] [I]。

## 输入与 agent 前置 hook

`input` 在用户输入进入 agent 前触发,并且文档明确它发生在 extension commands 之后、skill/template expansion 之前 [E: packages/coding-agent/docs/extensions.md:885] [E: packages/coding-agent/docs/extensions.md:888] [E: packages/coding-agent/docs/extensions.md:892]。`InputEventResult` 的三态是 `continue`、`transform`、`handled`;`handled` 跳过 agent,`transform` 改写 text/images 后继续后续处理 [E: packages/coding-agent/src/core/extensions/types.ts:838] [E: packages/coding-agent/src/core/extensions/types.ts:841]。runner 中 `emitInput()` 按 extension 顺序链式处理:遇到 `handled` 立即返回,遇到 `transform` 更新当前 text/images 给后续 handler [E: packages/coding-agent/src/core/extensions/runner.ts:1183] [E: packages/coding-agent/src/core/extensions/runner.ts:1193] [E: packages/coding-agent/src/core/extensions/runner.ts:1204] [E: packages/coding-agent/src/core/extensions/runner.ts:1205]。

`before_agent_start` 在用户 prompt 提交后、agent loop 前触发,可返回 custom message 或替换本 turn 的 system prompt [E: packages/coding-agent/src/core/extensions/types.ts:693] [E: packages/coding-agent/src/core/extensions/types.ts:1091] [E: packages/coding-agent/src/core/extensions/types.ts:1094]。runner 会把 custom messages 聚合到数组,并把 system prompt 按 handler 顺序链式更新;后续 handler 看到的是前面 handler 改过的 `currentSystemPrompt` [E: packages/coding-agent/src/core/extensions/runner.ts:1068] [E: packages/coding-agent/src/core/extensions/runner.ts:1074] [E: packages/coding-agent/src/core/extensions/runner.ts:1096] [E: packages/coding-agent/src/core/extensions/runner.ts:1106]。

`context` 在每次 LLM call 前触发,类型上允许返回 `{ messages }` 替换消息列表 [E: packages/coding-agent/src/core/extensions/types.ts:664] [E: packages/coding-agent/src/core/extensions/types.ts:1059]。runner 先 `structuredClone(messages)`,再把每个 handler 返回的 messages 作为后续 handler 的输入,所以这是非破坏式链式 message transform [E: packages/coding-agent/src/core/extensions/runner.ts:971] [E: packages/coding-agent/src/core/extensions/runner.ts:973] [E: packages/coding-agent/src/core/extensions/runner.ts:984]。

`before_provider_request` 发生在 provider-specific payload 构造完成、请求发送前;文档说明返回 `undefined` 保持 payload,返回其他值会替换 payload 并传给后续 handler 与实际请求 [E: packages/coding-agent/docs/extensions.md:680]。runner 实现也以 `currentPayload` 链式替换,只有 handler result 不是 `undefined` 时才覆盖 [E: packages/coding-agent/src/core/extensions/runner.ts:1003] [E: packages/coding-agent/src/core/extensions/runner.ts:1013] [E: packages/coding-agent/src/core/extensions/runner.ts:1018]。

`before_provider_headers` 在 request headers 组装后、HTTP call 发送前触发；handler 原位修改 shared headers，设为 `null` 的值表示删除该 header，返回值会被忽略 [E: packages/coding-agent/src/core/extensions/types.ts:681] [E: packages/coding-agent/docs/extensions.md:660] [E: packages/coding-agent/src/core/extensions/runner.ts:1041] [E: packages/coding-agent/src/core/extensions/runner.ts:1048]。

## 工具事件

工具事件分成“生命周期通知”和“拦截/改写”两层。`tool_execution_start`、`tool_execution_update`、`tool_execution_end` 是工具执行生命周期事件,携带 toolCallId、toolName、args、partialResult/result/isError 等字段 [E: packages/coding-agent/src/core/extensions/types.ts:756] [E: packages/coding-agent/src/core/extensions/types.ts:764] [E: packages/coding-agent/src/core/extensions/types.ts:773]。文档说并行工具模式下 start 在 preflight 阶段按 assistant source order 发出,update 可交错,end 按工具完成顺序发出,最终 toolResult message 仍按 assistant source order 发出 [E: packages/coding-agent/docs/extensions.md:628] [E: packages/coding-agent/docs/extensions.md:632]。

`tool_call` 在工具真正执行前触发,可 block,且 `event.input` 是 mutable;后续 `tool_call` handler 会看到前面 handler 对 input 的修改,修改后不会再次 re-validation [E: packages/coding-agent/docs/extensions.md:753] [E: packages/coding-agent/docs/extensions.md:759] [E: packages/coding-agent/docs/extensions.md:765]。类型层把 `tool_call` result 限定为 block/reason,参数补丁走 input mutation [E: packages/coding-agent/src/core/extensions/types.ts:1065]。runner 的 `emitToolCall()` 保存最后一个 truthy result,但只要 result 带 `block` 就短路返回 [E: packages/coding-agent/src/core/extensions/runner.ts:919] [E: packages/coding-agent/src/core/extensions/runner.ts:930] [E: packages/coding-agent/src/core/extensions/runner.ts:932]。这个设计让安全 gate extension 能阻止危险 tool call,而参数补丁 extension 可通过 mutate input 继续执行 [I]。

`tool_result` 在工具执行完成后触发；event 与 handler result 都可携带工具自身的 `Usage`，handler 还可修改 `content`、`details` 或 `isError` [E: packages/coding-agent/src/core/extensions/types.ts:908] [E: packages/coding-agent/src/core/extensions/types.ts:915] [E: packages/coding-agent/src/core/extensions/types.ts:1079] [E: packages/coding-agent/src/core/extensions/types.ts:1083]。runner 创建 `currentEvent` 并把每个 patch 链式合并；没有字段被改时返回 `undefined`，有修改时返回 content/details/isError/usage 的完整当前值 [E: packages/coding-agent/src/core/extensions/runner.ts:864] [E: packages/coding-agent/src/core/extensions/runner.ts:878] [E: packages/coding-agent/src/core/extensions/runner.ts:890] [E: packages/coding-agent/src/core/extensions/runner.ts:907] [E: packages/coding-agent/src/core/extensions/runner.ts:911]。

内置工具的 `tool_call` 可用 `isToolCallEventType("bash", event)` 这类 type guard 缩窄 input 类型;custom tool 需要显式 type parameters,因为 `CustomToolCallEvent.toolName` 是 `string`,会和内置 literal 重叠 [E: packages/coding-agent/src/core/extensions/types.ts:887] [E: packages/coding-agent/src/core/extensions/types.ts:888] [E: packages/coding-agent/src/core/extensions/types.ts:1012] [E: packages/coding-agent/src/core/extensions/types.ts:1019]。`tool_result` 侧也提供 `isBashToolResult`、`isReadToolResult`、`isEditToolResult` 等内置 type guard [E: packages/coding-agent/src/core/extensions/types.ts:970] [E: packages/coding-agent/src/core/extensions/types.ts:988]。

## 消息、模型、bash 与退出清理

`message_start` 和 `message_end` 覆盖 user、assistant、toolResult 消息,`message_update` 只覆盖 assistant streaming updates [E: packages/coding-agent/docs/extensions.md:592] [E: packages/coding-agent/docs/extensions.md:593]。`message_end` handler 可返回 replacement message,但 replacement 必须保持同一个 role;runner 对 role 变化发 extension error 并忽略该 replacement [E: packages/coding-agent/src/core/extensions/runner.ts:822] [E: packages/coding-agent/src/core/extensions/runner.ts:833] [E: packages/coding-agent/src/core/extensions/runner.ts:837]。

`model_select` 和 `thinking_level_select` 是模型与思考级别变化通知;类型层分别携带新旧 model/source 与新旧 thinking level [E: packages/coding-agent/src/core/extensions/types.ts:785] [E: packages/coding-agent/src/core/extensions/types.ts:788] [E: packages/coding-agent/src/core/extensions/types.ts:796]。用户文档把 `thinking_level_select` 标成 notification-only,handler 返回值会被忽略 [E: packages/coding-agent/docs/extensions.md:736]。

`user_bash` 拦截用户通过 `!` 或 `!!` 触发的 bash 命令,事件包含 command、excludeFromContext 与 cwd [E: packages/coding-agent/src/core/extensions/types.ts:807] [E: packages/coding-agent/src/core/extensions/types.ts:814]。handler 可返回 custom `operations` 接管执行后端,或直接返回 `result` 作为完整替代 [E: packages/coding-agent/src/core/extensions/types.ts:1072] [E: packages/coding-agent/src/core/extensions/types.ts:1076]。runner 的 `emitUserBash()` 是 first-result-wins,第一个 truthy result 直接返回 [E: packages/coding-agent/src/core/extensions/runner.ts:942] [E: packages/coding-agent/src/core/extensions/runner.ts:951] [E: packages/coding-agent/src/core/extensions/runner.ts:952]。

`session_shutdown` 在已启动 session runtime 被 teardown 前触发,文档建议清理从 `session_start` 或其他 session-scoped hook 打开的资源 [E: packages/coding-agent/docs/extensions.md:509]。runner 的顶层 helper `emitSessionShutdownEvent()` 只有在存在 `session_shutdown` handlers 时才发事件并返回 `true`,否则返回 `false` [E: packages/coding-agent/src/core/extensions/runner.ts:190] [E: packages/coding-agent/src/core/extensions/runner.ts:194] [E: packages/coding-agent/src/core/extensions/runner.ts:198]。

## 跨包关系

[surface.extensions.api](api.md) 是 extension API 主入口:它覆盖 extension factory、`ExtensionAPI`、`ExtensionContext` 和注册贡献点的总体 shape;本节点只展开 `pi.on(...)` 事件 hooks 的事件族、返回值和时序 [I]。

[subsys.coding-agent.extension-runner](../../subsystems/coding-agent/extension-runner.md) 是 runner 实现节点:它详写 `ExtensionRunner.createContext()`、通用 `emit()`、专用 emitters、error handling 和 stale context guard;本节点用这些实现细节解释 public event contract,但不替代 runner 内部设计说明 [I]。

[ref.coding-agent.extension-events](../../reference/extension-events.md) 是 grouped catalog:它应逐一列出 `ExtensionEvent` / `ExtensionAPI.on` 的所有事件名、payload 字段和 result 字段;本节点是 T1 surface,不逐项承担完整 catalog 覆盖率 [I]。

## Sources

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/docs/extensions.md

## 相关

- [surface.extensions.api](api.md): extension factory、主 API 对象和 context 的总入口。
- [ref.coding-agent.extension-events](../../reference/extension-events.md): 扩展事件逐项 catalog。
- [subsys.coding-agent.extension-runner](../../subsystems/coding-agent/extension-runner.md): handler 分发、返回值组合和 runner 内部状态。
- [subsys.coding-agent.usage-accounting](../../subsystems/coding-agent/usage-accounting.md): 工具、压缩与分支总结 usage 的聚合和持久化链路。
