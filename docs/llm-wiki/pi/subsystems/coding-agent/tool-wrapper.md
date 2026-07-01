---
id: subsys.coding-agent.tool-wrapper
title: ToolDefinition↔AgentTool 适配
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/coding-agent/src/core/tools/render-utils.ts
  - packages/coding-agent/src/core/tools/index.ts
symbols:
  - wrapToolDefinition
  - createToolDefinitionFromAgentTool
  - createAllToolDefinitions
related:
  - spine.tool-call-anatomy
  - surface.extensions.contribution-points
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 8c943640
---

> `tool-definition-wrapper` 是 pi-coding-agent 把产品层 `ToolDefinition` 适配成 agent-core `AgentTool` 的薄边界: runtime 只拿执行所需字段, UI/prompt/source metadata 仍留在 `AgentSession` 的 definition registry。

## 能回答的问题

- `wrapToolDefinition()` 到底复制哪些字段, 哪些 `ToolDefinition` metadata 不进入 `AgentTool`?
- extension 注册的 tool 怎样获得 `ExtensionContext`, 又怎样进入 `AgentSession.agent.state.tools`?
- `createToolDefinitionFromAgentTool()` 为什么存在, 它会丢失哪些 UI/prompt metadata?
- tool result `details`、truncation 信息和自定义 renderer 是 wrapper 处理, 还是其他层处理?
- `tool_call` / `tool_result` extension events 是 wrapper 拦截的吗?
- built-in tool definition ground truth 和默认 active tools 分别在哪里?

## 职责边界

`wrapToolDefinition<TDetails>()` 只做一件事: 接收 coding-agent 的 `ToolDefinition<any, TDetails>`, 返回 agent-core 可执行的 `AgentTool<any, TDetails>` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:6] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:8]。它复制 `name`、`label`、`description`、`parameters`、`prepareArguments`、`executionMode`, 并把 `AgentTool.execute(toolCallId, params, signal, onUpdate)` 转发到 `ToolDefinition.execute(..., ctxFactory?.())` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:10] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:11] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:12] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:13] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:14] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:15] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17]。

`ToolDefinition` 是 pi-coding-agent 的产品装配合约: 它除了模型可见 name/description/schema, 还带 `promptSnippet`、`promptGuidelines`、`renderShell`、`renderCall`、`renderResult`, 并要求 execute 接收第五个 `ExtensionContext` 参数 [E: packages/coding-agent/src/core/extensions/types.ts:437] [E: packages/coding-agent/src/core/extensions/types.ts:441] [E: packages/coding-agent/src/core/extensions/types.ts:447] [E: packages/coding-agent/src/core/extensions/types.ts:443] [E: packages/coding-agent/src/core/extensions/types.ts:445] [E: packages/coding-agent/src/core/extensions/types.ts:449] [E: packages/coding-agent/src/core/extensions/types.ts:469] [E: packages/coding-agent/src/core/extensions/types.ts:473] [E: packages/coding-agent/src/core/extensions/types.ts:476]。`AgentTool` 是 agent-core 的运行时合约: 它继承基础 tool schema, 并在运行时侧额外包含 `label`、可选 `prepareArguments`、`execute` 和可选 `executionMode` [E: packages/agent/src/types.ts:371] [E: packages/agent/src/types.ts:373] [E: packages/agent/src/types.ts:378] [E: packages/agent/src/types.ts:380] [E: packages/agent/src/types.ts:393]。

因此本子系统不负责 schema 校验、tool batch 调度、事件拦截、truncation 算法或 TUI 渲染;这些分别在 agent-core loop、AgentSession hooks、各 tool definition 和 UI/export renderer 中完成 [E: packages/agent/src/agent-loop.ts:380] [E: packages/agent/src/agent-loop.ts:580] [E: packages/coding-agent/src/core/agent-session.ts:418] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:269] [I]。

## 关键文件

- `packages/coding-agent/src/core/tools/tool-definition-wrapper.ts`: `wrapToolDefinition()`、`wrapToolDefinitions()` 和 reverse adapter `createToolDefinitionFromAgentTool()` 的权威实现 [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:22] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:35]。
- `packages/coding-agent/src/core/tools/index.ts`: built-in tool ground truth; `ToolName` 和 `allToolNames` 枚举 read/bash/edit/write/grep/find/ls, `createAllToolDefinitions()` 返回七个 built-in definitions [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:158] [E: packages/coding-agent/src/core/tools/index.ts:164]。
- `packages/coding-agent/src/core/extensions/types.ts`: `ToolDefinition`、`ToolRenderContext`、`RegisteredTool` 和 extension API `registerTool()` 的类型源 [E: packages/coding-agent/src/core/extensions/types.ts:405] [E: packages/coding-agent/src/core/extensions/types.ts:435] [E: packages/coding-agent/src/core/extensions/types.ts:1187] [E: packages/coding-agent/src/core/extensions/types.ts:1439]。
- `packages/coding-agent/src/core/extensions/wrapper.ts`: extension `RegisteredTool` 到 `AgentTool` 的包装层, 使用 `runner.createContext()` 作为 `ctxFactory` [E: packages/coding-agent/src/core/extensions/wrapper.ts:17] [E: packages/coding-agent/src/core/extensions/wrapper.ts:18] [E: packages/coding-agent/src/core/extensions/wrapper.ts:25] [E: packages/coding-agent/src/core/extensions/wrapper.ts:28]。
- `packages/coding-agent/src/core/agent-session.ts`: definition registry、runtime registry、active tool selection、event hooks 和 UI/export lookup 的调用点 [E: packages/coding-agent/src/core/agent-session.ts:819] [E: packages/coding-agent/src/core/agent-session.ts:839] [E: packages/coding-agent/src/core/agent-session.ts:2333] [E: packages/coding-agent/src/core/agent-session.ts:2426] [E: packages/coding-agent/src/core/agent-session.ts:3058]。
- `packages/coding-agent/src/core/tools/render-utils.ts`: default/fallback render helpers, 尤其 `getTextOutput()` 对文本、图片 fallback、ANSI/binary sanitize 的处理 [E: packages/coding-agent/src/core/tools/render-utils.ts:39] [E: packages/coding-agent/src/core/tools/render-utils.ts:48] [E: packages/coding-agent/src/core/tools/render-utils.ts:51] [E: packages/coding-agent/src/core/tools/render-utils.ts:63]。

## 数据模型与函数

`wrapToolDefinition(definition, ctxFactory?)` 的输入是 `ToolDefinition`;输出是 `AgentTool`。它不会复制 `promptSnippet`、`promptGuidelines`、`renderShell`、`renderCall` 或 `renderResult`, 因为返回对象只包含 runtime fields 和 execute adapter [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:9] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17] [I]。这些 metadata 仍保存在 `AgentSession._toolDefinitions`, `getAllTools()` 从 definition registry 返回 `promptGuidelines` 和 `sourceInfo` [E: packages/coding-agent/src/core/agent-session.ts:819] [E: packages/coding-agent/src/core/agent-session.ts:825] [E: packages/coding-agent/src/core/agent-session.ts:2366]。

`wrapToolDefinitions(definitions, ctxFactory?)` 是批量 map, 对每个 definition 调 `wrapToolDefinition()` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:22] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:26]。extension wrapper 在 `wrapRegisteredTools()` 中先抽出每个 `RegisteredTool.definition`, 再用同一个 `() => runner.createContext()` 包装, 所以 extension tool 执行时和 event handler 使用同一 runner context 生成机制 [E: packages/coding-agent/src/core/extensions/wrapper.ts:25] [E: packages/coding-agent/src/core/extensions/wrapper.ts:28] [I]。

`createToolDefinitionFromAgentTool(tool)` 是 reverse adapter: 它把 plain `AgentTool` 合成为最小 `ToolDefinition`, 复制 name/label/description/parameters/prepareArguments/executionMode, 并把 execute 直接转发回 `tool.execute()` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:35] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:37] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:38] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:39] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:40] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:41] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:42] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:43]。`AgentSession._buildRuntime()` 在 `baseToolsOverride` 分支调用它, 让 plain `AgentTool` 输入也能进入内部 definition registry [E: packages/coding-agent/src/core/agent-session.ts:2434] [E: packages/coding-agent/src/core/agent-session.ts:2438] [E: packages/coding-agent/src/core/agent-session.ts:2446]。

`AgentToolResult<TDetails>` 把 model-visible `content` 和 structured `details` 放在同一个 envelope 中;agent-core 类型把 `details` 定义为泛型结构化字段 [E: packages/agent/src/types.ts:350] [E: packages/agent/src/types.ts:352] [E: packages/agent/src/types.ts:354]。wrapper 不解释 `details`;它只保留泛型并把 execute 的返回值原样交回 agent-core [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16] [I]。

`ToolRenderContext` 是 UI renderer 的上下文模型, 包含 args、toolCallId、invalidate、lastComponent、state、cwd、executionStarted、argsComplete、isPartial、expanded、showImages、isError [E: packages/coding-agent/src/core/extensions/types.ts:405] [E: packages/coding-agent/src/core/extensions/types.ts:429]。这些字段由 `ToolExecutionComponent.getRenderContext()` 构造, 不是由 `wrapToolDefinition()` 注入 [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:115] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:131]。

## 控制流

1. `AgentSession._buildRuntime@packages/coding-agent/src/core/agent-session.ts:2403` 读取 image auto-resize、shell command prefix 和 shell path settings, 然后在没有 `baseToolsOverride` 时调用 `createAllToolDefinitions(this._cwd, { read, bash })` 创建 built-in definitions [E: packages/coding-agent/src/core/agent-session.ts:2431] [E: packages/coding-agent/src/core/agent-session.ts:2432] [E: packages/coding-agent/src/core/agent-session.ts:2433] [E: packages/coding-agent/src/core/agent-session.ts:2441] [E: packages/coding-agent/src/core/agent-session.ts:2443]。
2. 如果调用方传了 `baseToolsOverride`, `_buildRuntime` 对每个 plain `AgentTool` 调 `createToolDefinitionFromAgentTool()` 后写入 `_baseToolDefinitions`;这条路径保留运行时执行能力, 但没有自定义 prompt snippets 或 renderers, 除非原 plain tool 另有外部 definition registry [E: packages/coding-agent/src/core/agent-session.ts:2434] [E: packages/coding-agent/src/core/agent-session.ts:2438] [E: packages/coding-agent/src/core/agent-session.ts:2446] [I]。
3. extension load 期间, `createExtensionAPI().registerTool()` 把 tool 按 `tool.name` 存入 `extension.tools`, 附带 extension 的 `sourceInfo`, 然后调用 `runtime.refreshTools()` [E: packages/coding-agent/src/core/extensions/loader.ts:227] [E: packages/coding-agent/src/core/extensions/loader.ts:229] [E: packages/coding-agent/src/core/extensions/loader.ts:231] [E: packages/coding-agent/src/core/extensions/loader.ts:233]。pre-bind runtime 中 `refreshTools` 是 no-op, `registerTool()` 仍会调用这一路径 [E: packages/coding-agent/src/core/extensions/loader.ts:181] [E: packages/coding-agent/src/core/extensions/loader.ts:233]。
4. `ExtensionRunner.getAllRegisteredTools()` 遍历所有 extensions, 只在 `toolsByName` 尚无该 tool name 时写入, 所以同名 tool 是 first registration wins [E: packages/coding-agent/src/core/extensions/runner.ts:418] [E: packages/coding-agent/src/core/extensions/runner.ts:422] [E: packages/coding-agent/src/core/extensions/runner.ts:423] [E: packages/coding-agent/src/core/extensions/runner.ts:427]。
5. `AgentSession._refreshToolRegistry()` 合并 extension tools 和 SDK `customTools`, 再把 built-ins、extensions、custom tools 统一写入 `definitionRegistry`;allowed/excluded filters 在进入 registry 前生效 [E: packages/coding-agent/src/core/agent-session.ts:2336] [E: packages/coding-agent/src/core/agent-session.ts:2341] [E: packages/coding-agent/src/core/agent-session.ts:2344] [E: packages/coding-agent/src/core/agent-session.ts:2348] [E: packages/coding-agent/src/core/agent-session.ts:2351] [E: packages/coding-agent/src/core/agent-session.ts:2360] [E: packages/coding-agent/src/core/agent-session.ts:2366]。
6. `_refreshToolRegistry()` 从 definition registry 派生 `_toolPromptSnippets` 和 `_toolPromptGuidelines`, 然后调用 `wrapRegisteredTools(allCustomTools, runner)` 与 built-in base tool definitions 的 `wrapRegisteredTools(..., runner)` 生成 runtime `AgentTool`s [E: packages/coding-agent/src/core/agent-session.ts:2367] [E: packages/coding-agent/src/core/agent-session.ts:2375] [E: packages/coding-agent/src/core/agent-session.ts:2384] [E: packages/coding-agent/src/core/agent-session.ts:2385]。
7. runtime registry 先放 built-in wrapped tools, 再用 extension/custom wrapped tools 按同名覆盖;最后 `setActiveToolsByName([...new Set(nextActiveToolNames)])` 把存在于 `_toolRegistry` 的工具写到 `agent.state.tools` [E: packages/coding-agent/src/core/agent-session.ts:2395] [E: packages/coding-agent/src/core/agent-session.ts:2397] [E: packages/coding-agent/src/core/agent-session.ts:2423] [E: packages/coding-agent/src/core/agent-session.ts:843] [E: packages/coding-agent/src/core/agent-session.ts:849]。
8. agent-core 执行时, `executeToolCalls()` 根据 `AgentTool.executionMode` 决定 sequential/parallel batch, `prepareToolCall()` 找 tool、跑 `prepareArguments` 和 schema validation, `executePreparedToolCall()` 调 `AgentTool.execute()` 并把 `onUpdate` 变成 `tool_execution_update` event [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:569] [E: packages/agent/src/agent-loop.ts:548] [E: packages/agent/src/agent-loop.ts:580] [E: packages/agent/src/agent-loop.ts:637] [E: packages/agent/src/agent-loop.ts:645]。
9. tool 返回后, `createToolResultMessage()` 把 finalized `content`、`details`、`isError` 写入 `ToolResultMessage`;这一步保存的是 `AgentToolResult.details`, 不再经过 wrapper [E: packages/agent/src/agent-loop.ts:733] [E: packages/agent/src/agent-loop.ts:738] [E: packages/agent/src/agent-loop.ts:739] [E: packages/agent/src/agent-loop.ts:740]。

## 设计动机与权衡

这个子系统把“模型运行时需要什么”和“产品 UI/prompt 需要什么”分开: `AgentTool` 给 agent-core 提供可执行的最小 contract, `ToolDefinition` 留在 coding-agent registry 中给 system prompt、extension introspection、TUI 和 HTML export 使用 [E: packages/agent/src/types.ts:397] [E: packages/agent/src/types.ts:403] [E: packages/coding-agent/src/core/agent-session.ts:934] [E: packages/coding-agent/src/core/agent-session.ts:939] [E: packages/coding-agent/src/core/agent-session.ts:3058] [I]。

extension tools 通过 `ctxFactory` 获得执行时上下文, 而不是在注册时捕获一个永久 `ctx`;`wrapRegisteredTool()` 每次 execute 都调用 `runner.createContext()` [E: packages/coding-agent/src/core/extensions/wrapper.ts:17] [E: packages/coding-agent/src/core/extensions/wrapper.ts:18]。这与 extension loader 的 stale context guard 一起降低 reload/session replacement 后误用旧 context 的风险 [E: packages/coding-agent/src/core/extensions/loader.ts:164] [E: packages/coding-agent/src/core/extensions/loader.ts:190] [I]。

`createToolDefinitionFromAgentTool()` 的权衡是兼容 plain `AgentTool` override: 它让 `AgentSession` 仍可维护 `_toolDefinitions`, 但最小合成 definition 没有 `promptSnippet`、`promptGuidelines`、`renderCall`、`renderResult` 等 coding-agent metadata [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:35] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:43] [I]。因此使用 `baseToolsOverride` 时默认 active tools 是 override keys, 而不是 read/bash/edit/write [E: packages/coding-agent/src/core/agent-session.ts:2470] [E: packages/coding-agent/src/core/agent-session.ts:2472]。

truncation 是 per-tool `details` convention, 不是 wrapper policy: `truncate.ts` 定义 `TruncationResult`, built-in tools如 `read`、`bash` 把 truncation 放进 result details, renderer 再读取 details 显示警告或 preview [E: packages/coding-agent/src/core/tools/truncate.ts:15] [E: packages/coding-agent/src/core/tools/read.ts:288] [E: packages/coding-agent/src/core/tools/read.ts:305] [E: packages/coding-agent/src/core/tools/bash.ts:380] [E: packages/coding-agent/src/core/tools/bash.ts:425] [E: packages/coding-agent/src/core/tools/read.ts:190]。wrapper 对这些结构完全透明 [I]。

UI metadata 也不进入 `AgentTool`: interactive `ToolExecutionComponent` 优先用传入的 `toolDefinition`, 并为 built-ins 额外用 `createAllToolDefinitions(cwd)[toolName]` 找 renderer fallback [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:48] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:57] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:81] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:88] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:98]。HTML export 同样通过 `getToolDefinition(name)` 查 definition 并调用 `renderCall`/`renderResult` [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:58] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:102] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:107] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:129] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:143]。

## Gotcha

- `wrapToolDefinition()` 不是 event interceptor。extension wrappers 只把 `RegisteredTool.definition` 适配成带 `runner.createContext()` 的 `AgentTool`; tool call 和 tool result interception 由 `AgentSession` 通过 agent-core hooks 处理 [E: packages/coding-agent/src/core/extensions/wrapper.ts:17] [E: packages/coding-agent/src/core/extensions/wrapper.ts:18] [E: packages/coding-agent/src/core/agent-session.ts:419] [E: packages/coding-agent/src/core/agent-session.ts:440]。
- `tool_call` event 在 `beforeToolCall` 阶段运行, 可以返回 block;`tool_result` event 在 `afterToolCall` 阶段运行, 可以替换 content/details/isError [E: packages/coding-agent/src/core/agent-session.ts:419] [E: packages/coding-agent/src/core/agent-session.ts:426] [E: packages/agent/src/agent-loop.ts:598] [E: packages/coding-agent/src/core/extensions/runner.ts:875] [E: packages/coding-agent/src/core/agent-session.ts:440] [E: packages/coding-agent/src/core/agent-session.ts:460] [E: packages/coding-agent/src/core/extensions/runner.ts:826] [E: packages/coding-agent/src/core/extensions/runner.ts:830] [E: packages/coding-agent/src/core/extensions/runner.ts:835]。
- partial updates 是 `AgentTool.execute` 的 `onUpdate` 参数发出的 `tool_execution_update` events;只有 final result 会变成 `ToolResultMessage`, 所以 UI 不能把 partial details 当作持久最终 details [E: packages/agent/src/agent-loop.ts:641] [E: packages/agent/src/agent-loop.ts:645] [E: packages/agent/src/agent-loop.ts:657] [E: packages/agent/src/agent-loop.ts:733] [I]。
- built-in tools 虽然可以由 `createReadTool()` 这类函数直接返回 `AgentTool`, 但 `AgentSession._buildRuntime` 的常规路径使用 `createAllToolDefinitions()` 后再统一包装, 这样 prompt snippets、guidelines、sourceInfo 和 renderers 仍在 definition registry 中可查 [E: packages/coding-agent/src/core/tools/read.ts:349] [E: packages/coding-agent/src/core/tools/read.ts:350] [E: packages/coding-agent/src/core/agent-session.ts:2441] [E: packages/coding-agent/src/core/agent-session.ts:2366] [I]。
- `render-utils.getTextOutput()` 是 fallback rendering helper, 不是 tool result truncation helper;它过滤 text/image content、sanitize 文本、在终端不支持图片或关闭图片时生成 image fallback [E: packages/coding-agent/src/core/tools/render-utils.ts:45] [E: packages/coding-agent/src/core/tools/render-utils.ts:48] [E: packages/coding-agent/src/core/tools/render-utils.ts:51] [E: packages/coding-agent/src/core/tools/render-utils.ts:57]。
- extension/custom tool 同名会覆盖 runtime registry 里的 built-in `AgentTool`, 因为 `_refreshToolRegistry()` 先放 built-ins 后 set custom tools;但是 definition registry 也是按同名 `set`, 因此 source metadata 和 renderer lookup 同样跟随覆盖后的 definition [E: packages/coding-agent/src/core/agent-session.ts:2360] [E: packages/coding-agent/src/core/agent-session.ts:2395] [E: packages/coding-agent/src/core/agent-session.ts:2397] [I]。
- allowlist/excludelist 在 built-ins、extension tools 和 SDK custom tools 进入 registry 前过滤;`allowedToolNames` 存在时, active names 会额外从 `_toolRegistry` 中加入 allowlisted names [E: packages/coding-agent/src/core/agent-session.ts:2336] [E: packages/coding-agent/src/core/agent-session.ts:2339] [E: packages/coding-agent/src/core/agent-session.ts:2348] [E: packages/coding-agent/src/core/agent-session.ts:2351] [E: packages/coding-agent/src/core/agent-session.ts:2405] [E: packages/coding-agent/src/core/agent-session.ts:2407] [E: packages/coding-agent/src/core/agent-session.ts:2408]。

## 跨包边界

[spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) 覆盖 agent-core tool-call lifecycle: `AgentTool` 的 prepare/validate/execute/finalize、parallel/sequential scheduling、tool result message 生成都在 `packages/agent/src/agent-loop.ts` 中完成 [E: packages/agent/src/agent-loop.ts:373] [E: packages/agent/src/agent-loop.ts:628]。本节点只覆盖 coding-agent 如何把 `ToolDefinition` 装配为这条 lifecycle 可消费的 `AgentTool`。

[surface.extensions.contribution-points](../../surface/extensions/contribution-points.md) 是 extension 可见 API 节点: extension 通过 `registerTool()` 提供 `ToolDefinition`, loader 把它存成 `RegisteredTool`, runner 再把所有注册工具暴露给 `AgentSession._refreshToolRegistry()` [E: packages/coding-agent/src/core/extensions/types.ts:1187] [E: packages/coding-agent/src/core/extensions/loader.ts:227] [E: packages/coding-agent/src/core/extensions/runner.ts:418]。

[ref.tools-catalog](../../reference/tools-catalog.md) 是 built-in tool catalog 节点: `ToolName` 和 `createAllToolDefinitions()` 的七个内置工具列表是 catalog 的 ground truth, 本节点只解释这些 definitions 如何被包装和激活 [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:156]。

`pi-tui` 边界在 renderer callback: `ToolDefinition.renderCall` / `renderResult` 返回 `Component`, `ToolExecutionComponent` 负责把这些 component 放进默认 shell 或 self-render container [E: packages/coding-agent/src/core/extensions/types.ts:473] [E: packages/coding-agent/src/core/extensions/types.ts:481] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:263] [E: packages/coding-agent/src/modes/interactive/components/tool-execution.ts:303]。`pi-ai` 边界在 result content: `AgentToolResult.content` 是 text/image blocks, wrapper 不改变 provider-facing content shape [E: packages/agent/src/types.ts:350] [E: packages/agent/src/types.ts:352] [I]。

## Sources

- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/tools/render-utils.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/wrapper.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/modes/interactive/components/tool-execution.ts
- packages/coding-agent/src/core/export-html/tool-renderer.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md): agent-core 的 tool call 调度、校验、执行、partial update 和 tool result message 生成。
- [surface.extensions.contribution-points](../../surface/extensions/contribution-points.md): extension `registerTool()`、event handlers 和 runtime API 的可见面。
- [ref.tools-catalog](../../reference/tools-catalog.md): built-in tool names、definitions 和 catalog 覆盖清单。
