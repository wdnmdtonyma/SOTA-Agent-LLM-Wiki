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
evidence: explicit
status: verified
updated: 5a073885
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

extension factory 拿到的 `ExtensionAPI` 暴露一组 `on(event, handler)` overload;每个 overload 把事件名字符串绑定到对应 event payload 与 handler result 类型 [E: packages/coding-agent/src/core/extensions/types.ts:1128] [E: packages/coding-agent/src/core/extensions/types.ts:1133] [E: packages/coding-agent/src/core/extensions/types.ts:1171]。通用 handler 形态是 `(event, ctx) => Promise<R | void> | R | void`,其中 `ctx` 通常是 `ExtensionContext` [E: packages/coding-agent/src/core/extensions/types.ts:1123]。`project_trust` 是例外:它使用 `ProjectTrustHandler` 和受限 `ProjectTrustContext`,只暴露 cwd、mode、hasUI 与少量 UI helper [E: packages/coding-agent/src/core/extensions/types.ts:515] [E: packages/coding-agent/src/core/extensions/types.ts:522]。

`ExtensionEvent` 是所有可订阅事件 payload 的联合类型,包含 startup/resource、session、agent/message/tool execution、model、user bash、input、tool call/result 等分支 [E: packages/coding-agent/src/core/extensions/types.ts:993] [E: packages/coding-agent/src/core/extensions/types.ts:1016]。当前源码中 `ExtensionAPI.on` overload 可数到 30 个事件名,而 `index.json` 的 group 仍写作 `extension-events(~29)`;这是 catalog 计数口径或索引陈旧问题,不应在 T1 surface 节点里强行压成 29 个 [U]。

用户文档给出的生命周期图把启动、用户输入、agent turn、工具调用、session replacement、fork/clone、compact、tree navigation、model selection 和退出串成一条事件流 [E: packages/coding-agent/docs/extensions.md:279] [E: packages/coding-agent/docs/extensions.md:341]。这张图是 extension 作者理解顺序的主入口;源码的 runner 则定义 handler 如何被调用、返回值如何组合 [I]。

## 事件族速览

| 事件族 | 事件名 | 主要用途 | 返回值语义 |
| --- | --- | --- | --- |
| startup/resource | `project_trust`, `resources_discover` | 决定项目动态资源信任;追加 skills/prompts/themes 路径 | `project_trust` 首个 yes/no 决策获胜;`resources_discover` 聚合路径 [E: packages/coding-agent/src/core/extensions/runner.ts:197] [E: packages/coding-agent/src/core/extensions/runner.ts:211] [E: packages/coding-agent/src/core/extensions/runner.ts:1069] |
| session | `session_start`, `session_before_switch`, `session_before_fork`, `session_before_compact`, `session_compact`, `session_shutdown`, `session_before_tree`, `session_tree` | session 启动、替换、fork/clone、压缩、树导航、退出清理 | `session_before_*` 可返回 cancel/custom result;普通 session 事件多为通知 [E: packages/coding-agent/src/core/extensions/types.ts:555] [E: packages/coding-agent/src/core/extensions/types.ts:569] [E: packages/coding-agent/src/core/extensions/types.ts:616] |
| agent/message | `before_agent_start`, `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `context` | 注入上下文、观察 turn/message 生命周期、改写 message list 或 finalized message | `before_agent_start` 可加 custom message 或改 system prompt;`context` 链式替换 messages;`message_end` 可替换同 role message [E: packages/coding-agent/src/core/extensions/types.ts:665] [E: packages/coding-agent/src/core/extensions/types.ts:646] [E: packages/coding-agent/src/core/extensions/types.ts:717] |
| provider/model | `before_provider_request`, `after_provider_response`, `model_select`, `thinking_level_select` | 查看或改写 provider payload;观察 HTTP response header/status;响应模型/思考级别变化 | `before_provider_request` 非 `undefined` 返回值替换 payload;其余主要是通知 [E: packages/coding-agent/src/core/extensions/types.ts:652] [E: packages/coding-agent/src/core/extensions/types.ts:658] [E: packages/coding-agent/src/core/extensions/types.ts:755] |
| tool | `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `tool_call`, `tool_result` | 观察工具生命周期;拦截工具调用;改写工具结果 | `tool_call` 可 block 且可 mutate input;`tool_result` 可 patch content/details/isError [E: packages/coding-agent/src/core/extensions/types.ts:723] [E: packages/coding-agent/src/core/extensions/types.ts:865] [E: packages/coding-agent/src/core/extensions/types.ts:924] |
| input/bash | `input`, `user_bash` | 在 skill/template expansion 前处理用户输入;拦截 `!`/`!!` bash | `input` 返回 continue/transform/handled;`user_bash` 可替换 bash operations 或直接给 result [E: packages/coding-agent/src/core/extensions/types.ts:792] [E: packages/coding-agent/src/core/extensions/types.ts:805] [E: packages/coding-agent/src/core/extensions/types.ts:774] [E: packages/coding-agent/src/core/extensions/types.ts:1035] |

本表只解释事件族和控制能力;逐项列出每个事件 payload 字段、result 字段和完整 event name 清单应由 [ref.coding-agent.extension-events](../../reference/extension-events.md) 覆盖 [I]。

## 启动、资源与 session 事件

`project_trust` 在项目动态资源加载前运行,文档限定只有 user/global extensions 和 CLI `-e` extensions 参与,project-local extensions 要等 trust resolved 后才会加载 [E: packages/coding-agent/docs/extensions.md:348]。handler 必须返回 `{ trusted: "yes" | "no" | "undecided" }`;第一个 yes/no 决策会接管信任决定,`remember` 可持久化该决定 [E: packages/coding-agent/docs/extensions.md:361]。

`resources_discover` 在 `session_start` 后触发,用于追加 skill、prompt 和 theme 路径 [E: packages/coding-agent/docs/extensions.md:367]。类型层只允许返回 `skillPaths`、`promptPaths`、`themePaths`,没有 extension path 或 tool path 字段 [E: packages/coding-agent/src/core/extensions/types.ts:535] [E: packages/coding-agent/src/core/extensions/types.ts:536] [E: packages/coding-agent/src/core/extensions/types.ts:538]。runner 聚合这些路径并给每个 path 附上贡献它的 `extensionPath`,这是 runtime 内部 attribution,不是 extension handler 自己返回的字段 [E: packages/coding-agent/src/core/extensions/runner.ts:1046] [E: packages/coding-agent/src/core/extensions/runner.ts:1069] [E: packages/coding-agent/src/core/extensions/runner.ts:1076]。

session replacement 类事件分两段:替换前的 `session_before_switch`、`session_before_fork`、`session_before_compact`、`session_before_tree` 能取消或定制操作;替换/压缩/导航后的 `session_start`、`session_compact`、`session_tree` 和 teardown 前的 `session_shutdown` 用来重建或清理 extension 状态 [E: packages/coding-agent/src/core/extensions/types.ts:555] [E: packages/coding-agent/src/core/extensions/types.ts:582] [E: packages/coding-agent/src/core/extensions/types.ts:593] [E: packages/coding-agent/src/core/extensions/types.ts:623]。通用 `emit()` 对 `session_before_*` 事件读取 handler result,一旦 result 带 `cancel` 就立即返回 [E: packages/coding-agent/src/core/extensions/runner.ts:727] [E: packages/coding-agent/src/core/extensions/runner.ts:748] [E: packages/coding-agent/src/core/extensions/runner.ts:750]。

当前 `index.json` 为本节点列了 symbol `emitSessionStart`,但 `runner.ts` 里没有对应的专用 emitter;`session_start` 属于通用 `emit()` 可处理的事件,不是 `emitToolCall` 这类专用方法 [E: packages/coding-agent/src/core/extensions/runner.ts:120] [E: packages/coding-agent/src/core/extensions/runner.ts:736] [U]。

## 输入与 agent 前置 hook

`input` 在用户输入进入 agent 前触发,并且文档明确它发生在 extension commands 之后、skill/template expansion 之前 [E: packages/coding-agent/docs/extensions.md:839] [E: packages/coding-agent/docs/extensions.md:842] [E: packages/coding-agent/docs/extensions.md:846]。`InputEventResult` 的三态是 `continue`、`transform`、`handled`;`handled` 跳过 agent,`transform` 改写 text/images 后继续后续处理 [E: packages/coding-agent/src/core/extensions/types.ts:805] [E: packages/coding-agent/src/core/extensions/types.ts:808]。runner 中 `emitInput()` 按 extension 顺序链式处理:遇到 `handled` 立即返回,遇到 `transform` 更新当前 text/images 给后续 handler [E: packages/coding-agent/src/core/extensions/runner.ts:1095] [E: packages/coding-agent/src/core/extensions/runner.ts:1105] [E: packages/coding-agent/src/core/extensions/runner.ts:1116] [E: packages/coding-agent/src/core/extensions/runner.ts:1117]。

`before_agent_start` 在用户 prompt 提交后、agent loop 前触发,可返回 custom message 或替换本 turn 的 system prompt [E: packages/coding-agent/src/core/extensions/types.ts:665] [E: packages/coding-agent/src/core/extensions/types.ts:1053] [E: packages/coding-agent/src/core/extensions/types.ts:1056]。runner 会把 custom messages 聚合到数组,并把 system prompt 按 handler 顺序链式更新;后续 handler 看到的是前面 handler 改过的 `currentSystemPrompt` [E: packages/coding-agent/src/core/extensions/runner.ts:980] [E: packages/coding-agent/src/core/extensions/runner.ts:986] [E: packages/coding-agent/src/core/extensions/runner.ts:1008] [E: packages/coding-agent/src/core/extensions/runner.ts:1018]。

`context` 在每次 LLM call 前触发,类型上允许返回 `{ messages }` 替换消息列表 [E: packages/coding-agent/src/core/extensions/types.ts:646] [E: packages/coding-agent/src/core/extensions/types.ts:1022]。runner 先 `structuredClone(messages)`,再把每个 handler 返回的 messages 作为后续 handler 的输入,所以这是非破坏式链式 message transform [E: packages/coding-agent/src/core/extensions/runner.ts:914] [E: packages/coding-agent/src/core/extensions/runner.ts:916] [E: packages/coding-agent/src/core/extensions/runner.ts:927]。

`before_provider_request` 发生在 provider-specific payload 构造完成、请求发送前;文档说明返回 `undefined` 保持 payload,返回其他值会替换 payload 并传给后续 handler 与实际请求 [E: packages/coding-agent/docs/extensions.md:634]。runner 实现也以 `currentPayload` 链式替换,只有 handler result 不是 `undefined` 时才覆盖 [E: packages/coding-agent/src/core/extensions/runner.ts:946] [E: packages/coding-agent/src/core/extensions/runner.ts:956] [E: packages/coding-agent/src/core/extensions/runner.ts:961]。

## 工具事件

工具事件分成“生命周期通知”和“拦截/改写”两层。`tool_execution_start`、`tool_execution_update`、`tool_execution_end` 是工具执行生命周期事件,携带 toolCallId、toolName、args、partialResult/result/isError 等字段 [E: packages/coding-agent/src/core/extensions/types.ts:723] [E: packages/coding-agent/src/core/extensions/types.ts:731] [E: packages/coding-agent/src/core/extensions/types.ts:740]。文档说并行工具模式下 start 在 preflight 阶段按 assistant source order 发出,update 可交错,end 按工具完成顺序发出,最终 toolResult message 仍按 assistant source order 发出 [E: packages/coding-agent/docs/extensions.md:600] [E: packages/coding-agent/docs/extensions.md:604]。

`tool_call` 在工具真正执行前触发,可 block,且 `event.input` 是 mutable;后续 `tool_call` handler 会看到前面 handler 对 input 的修改,修改后不会再次 re-validation [E: packages/coding-agent/docs/extensions.md:707] [E: packages/coding-agent/docs/extensions.md:713] [E: packages/coding-agent/docs/extensions.md:719]。类型层把 `tool_call` result 限定为 block/reason,参数补丁走 input mutation [E: packages/coding-agent/src/core/extensions/types.ts:1028]。runner 的 `emitToolCall()` 保存最后一个 truthy result,但只要 result 带 `block` 就短路返回 [E: packages/coding-agent/src/core/extensions/runner.ts:862] [E: packages/coding-agent/src/core/extensions/runner.ts:873] [E: packages/coding-agent/src/core/extensions/runner.ts:875]。这个设计让安全 gate extension 能阻止危险 tool call,而参数补丁 extension 可通过 mutate input 继续执行 [I]。

`tool_result` 在工具执行完成后触发,可修改 result 的 `content`、`details` 或 `isError` [E: packages/coding-agent/src/core/extensions/types.ts:875] [E: packages/coding-agent/src/core/extensions/types.ts:924] [E: packages/coding-agent/src/core/extensions/types.ts:1042]。runner 创建 `currentEvent` 并把 handler patch 合并回该对象;没有任何字段被改时返回 `undefined`,有修改时返回新的 content/details/isError [E: packages/coding-agent/src/core/extensions/runner.ts:812] [E: packages/coding-agent/src/core/extensions/runner.ts:814] [E: packages/coding-agent/src/core/extensions/runner.ts:826] [E: packages/coding-agent/src/core/extensions/runner.ts:855]。

内置工具的 `tool_call` 可用 `isToolCallEventType("bash", event)` 这类 type guard 缩窄 input 类型;custom tool 需要显式 type parameters,因为 `CustomToolCallEvent.toolName` 是 `string`,会和内置 literal 重叠 [E: packages/coding-agent/src/core/extensions/types.ts:854] [E: packages/coding-agent/src/core/extensions/types.ts:855] [E: packages/coding-agent/src/core/extensions/types.ts:977] [E: packages/coding-agent/src/core/extensions/types.ts:984]。`tool_result` 侧也提供 `isBashToolResult`、`isReadToolResult`、`isEditToolResult` 等内置 type guard [E: packages/coding-agent/src/core/extensions/types.ts:935] [E: packages/coding-agent/src/core/extensions/types.ts:953]。

## 消息、模型、bash 与退出清理

`message_start` 和 `message_end` 覆盖 user、assistant、toolResult 消息,`message_update` 只覆盖 assistant streaming updates [E: packages/coding-agent/docs/extensions.md:564] [E: packages/coding-agent/docs/extensions.md:565]。`message_end` handler 可返回 replacement message,但 replacement 必须保持同一个 role;runner 对 role 变化发 extension error 并忽略该 replacement [E: packages/coding-agent/src/core/extensions/runner.ts:770] [E: packages/coding-agent/src/core/extensions/runner.ts:781] [E: packages/coding-agent/src/core/extensions/runner.ts:785]。

`model_select` 和 `thinking_level_select` 是模型与思考级别变化通知;类型层分别携带新旧 model/source 与新旧 thinking level [E: packages/coding-agent/src/core/extensions/types.ts:752] [E: packages/coding-agent/src/core/extensions/types.ts:755] [E: packages/coding-agent/src/core/extensions/types.ts:763]。用户文档把 `thinking_level_select` 标成 notification-only,handler 返回值会被忽略 [E: packages/coding-agent/docs/extensions.md:690]。

`user_bash` 拦截用户通过 `!` 或 `!!` 触发的 bash 命令,事件包含 command、excludeFromContext 与 cwd [E: packages/coding-agent/src/core/extensions/types.ts:774] [E: packages/coding-agent/src/core/extensions/types.ts:781]。handler 可返回 custom `operations` 接管执行后端,或直接返回 `result` 作为完整替代 [E: packages/coding-agent/src/core/extensions/types.ts:1035] [E: packages/coding-agent/src/core/extensions/types.ts:1039]。runner 的 `emitUserBash()` 是 first-result-wins,第一个 truthy result 直接返回 [E: packages/coding-agent/src/core/extensions/runner.ts:885] [E: packages/coding-agent/src/core/extensions/runner.ts:894] [E: packages/coding-agent/src/core/extensions/runner.ts:895]。

`session_shutdown` 在已启动 session runtime 被 teardown 前触发,文档建议清理从 `session_start` 或其他 session-scoped hook 打开的资源 [E: packages/coding-agent/docs/extensions.md:485]。runner 的顶层 helper `emitSessionShutdownEvent()` 只有在存在 `session_shutdown` handlers 时才发事件并返回 `true`,否则返回 `false` [E: packages/coding-agent/src/core/extensions/runner.ts:186] [E: packages/coding-agent/src/core/extensions/runner.ts:190] [E: packages/coding-agent/src/core/extensions/runner.ts:194]。

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
