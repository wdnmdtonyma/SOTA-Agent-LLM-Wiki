---
id: subsys.coding-agent.extension-wrapper
title: 扩展贡献适配
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/wrapper.ts
  - packages/coding-agent/src/core/extensions/types.ts
symbols:
  - wrapRegisteredTools
  - ExtensionRuntime
related:
  - surface.extensions.contribution-points
  - subsys.coding-agent.tool-wrapper
evidence: explicit
status: verified
updated: a8ee03b815
---

> `extensions/wrapper.ts` 是 pi-coding-agent 把 extension-registered `ToolDefinition` 转成 agent-core `AgentTool` 的极薄适配层: 它不执行工具、不拦截事件, 只在 tool execution 时通过 `ExtensionRunner.createContext()` 注入最新 `ExtensionContext`。

## 能回答的问题

- extension 用 `registerTool()` 注册的 `ToolDefinition` 怎样进入 agent-core runtime?
- `wrapRegisteredTool()` 和 `wrapRegisteredTools()` 分别做什么?
- extension tool 为什么能在 `execute()` 里拿到 `ExtensionContext`?
- `ExtensionRuntime` 是 tool wrapper 的输入吗, 还是 runner / loader 的共享运行时?
- extension tool 同名注册、active tools、prompt metadata 和 renderer metadata 分别在哪里处理?
- `tool_call` / `tool_result` event interception 是不是 `extensions/wrapper.ts` 负责?

## 职责边界

`wrapRegisteredTool(registeredTool, runner)` 接收一个 `RegisteredTool` 和一个 `ExtensionRunner`, 返回 agent-core `AgentTool` [E: packages/coding-agent/src/core/extensions/wrapper.ts:17]。它把 `registeredTool.definition` 交给通用 `wrapToolDefinition()`, 并传入 `() => runner.createContext()` 作为 `ctxFactory` [E: packages/coding-agent/src/core/extensions/wrapper.ts:18]。因此这个文件的核心职责是 context injection: extension tool 每次被 agent-core 调用时, 都通过 runner 生成一个运行期 `ExtensionContext` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:18]。

`wrapRegisteredTools(registeredTools, runner)` 是批量版本: 它从每个 `RegisteredTool` 中取出 `definition`, 再调用 `wrapToolDefinitions()` 生成 `AgentTool[]` [E: packages/coding-agent/src/core/extensions/wrapper.ts:43] [E: packages/coding-agent/src/core/extensions/wrapper.ts:26] [E: packages/coding-agent/src/core/extensions/wrapper.ts:28]。这意味着 `sourceInfo` 不进入 agent-core `AgentTool`;source metadata 留在 `AgentSession` 的 definition registry, 用于 introspection、renderer lookup 或来源展示 [E: packages/coding-agent/src/core/extensions/types.ts:1522] [E: packages/coding-agent/src/core/extensions/types.ts:1524] [E: packages/coding-agent/src/core/agent-session.ts:2494] [E: packages/coding-agent/src/core/agent-session.ts:2496] [E: packages/coding-agent/src/core/agent-session.ts:911] [E: packages/coding-agent/src/core/agent-session.ts:917] [I]。

`extensions/wrapper.ts` 不负责 event interception: 它只导入 `wrapToolDefinition` / `wrapToolDefinitions`、`ExtensionRunner` 和 `RegisteredTool`, 并把 registered tool definitions 转交给通用 wrapper [E: packages/coding-agent/src/core/extensions/wrapper.ts:8] [E: packages/coding-agent/src/core/extensions/wrapper.ts:9] [E: packages/coding-agent/src/core/extensions/wrapper.ts:10] [E: packages/coding-agent/src/core/extensions/wrapper.ts:11] [E: packages/coding-agent/src/core/extensions/wrapper.ts:18] [E: packages/coding-agent/src/core/extensions/wrapper.ts:26]。实际 `tool_call` 和 `tool_result` handler 在 `ExtensionRunner.emitToolCall()` / `emitToolResult()` 中运行 [E: packages/coding-agent/src/core/extensions/runner.ts:932] [E: packages/coding-agent/src/core/extensions/runner.ts:941] [E: packages/coding-agent/src/core/extensions/runner.ts:877] [E: packages/coding-agent/src/core/extensions/runner.ts:888]。

## 关键文件

- `packages/coding-agent/src/core/extensions/wrapper.ts`: 本节点权威文件;导出 `wrapRegisteredTool()` 和 `wrapRegisteredTools()` [E: packages/coding-agent/src/core/extensions/wrapper.ts:17] [E: packages/coding-agent/src/core/extensions/wrapper.ts:43]。
- `packages/coding-agent/src/core/extensions/types.ts`: 定义 `ToolDefinition`、`RegisteredTool`、`ExtensionRuntime`、`ExtensionActions` 和 `LoadExtensionsResult.runtime` 等 extension 合约 [E: packages/coding-agent/src/core/extensions/types.ts:449] [E: packages/coding-agent/src/core/extensions/types.ts:1522] [E: packages/coding-agent/src/core/extensions/types.ts:1612] [E: packages/coding-agent/src/core/extensions/types.ts:1678] [E: packages/coding-agent/src/core/extensions/types.ts:1701]。
- `packages/coding-agent/src/core/tools/tool-definition-wrapper.ts`: 通用 `ToolDefinition` to `AgentTool` adapter;extension wrapper 只是把 `RegisteredTool.definition` 和 `runner.createContext()` 接到这个 adapter 上 [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:18]。
- `packages/coding-agent/src/core/extensions/loader.ts`: `registerTool()` 写入 `extension.tools` 并附带 `sourceInfo`, 然后调用 `runtime.refreshTools()` [E: packages/coding-agent/src/core/extensions/loader.ts:249] [E: packages/coding-agent/src/core/extensions/loader.ts:251] [E: packages/coding-agent/src/core/extensions/loader.ts:253] [E: packages/coding-agent/src/core/extensions/loader.ts:255]。
- `packages/coding-agent/src/core/extensions/runner.ts`: `ExtensionRunner` 持有 `ExtensionRuntime`, 聚合 registered tools, 并创建 event handlers 与 tool execution 共享的 `ExtensionContext` [E: packages/coding-agent/src/core/extensions/runner.ts:268] [E: packages/coding-agent/src/core/extensions/runner.ts:270] [E: packages/coding-agent/src/core/extensions/runner.ts:451] [E: packages/coding-agent/src/core/extensions/runner.ts:673]。
- `packages/coding-agent/src/core/agent-session.ts`: `_refreshToolRegistry()` 调用 `wrapRegisteredTools()` 把 built-in、extension 和 SDK custom tool definitions 转成 runtime `AgentTool` registry [E: packages/coding-agent/src/core/agent-session.ts:2466] [E: packages/coding-agent/src/core/agent-session.ts:2517] [E: packages/coding-agent/src/core/agent-session.ts:2518] [E: packages/coding-agent/src/core/agent-session.ts:2528] [E: packages/coding-agent/src/core/agent-session.ts:2530]。

## 数据模型

`ToolDefinition` 是 extension-facing tool contract: 它包含模型可见的 `name`、`description`、TypeBox `parameters`, 也包含 UI-facing `label`、`renderCall`、`renderResult`, 并且 `execute()` 的第五个参数是 `ExtensionContext` [E: packages/coding-agent/src/core/extensions/types.ts:449] [E: packages/coding-agent/src/core/extensions/types.ts:451] [E: packages/coding-agent/src/core/extensions/types.ts:453] [E: packages/coding-agent/src/core/extensions/types.ts:455] [E: packages/coding-agent/src/core/extensions/types.ts:461] [E: packages/coding-agent/src/core/extensions/types.ts:480] [E: packages/coding-agent/src/core/extensions/types.ts:485] [E: packages/coding-agent/src/core/extensions/types.ts:489] [E: packages/coding-agent/src/core/extensions/types.ts:492]。这个 signature 是 extension wrapper 存在的原因: agent-core `AgentTool.execute()` 没有 `ctx` 参数, 所以 coding-agent wrapper 必须把 `ctxFactory` 补进去 [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:18] [I]。

`RegisteredTool` 是 loader 保存的结构, 只有 `definition` 和 `sourceInfo` 两个字段 [E: packages/coding-agent/src/core/extensions/types.ts:1522] [E: packages/coding-agent/src/core/extensions/types.ts:1523] [E: packages/coding-agent/src/core/extensions/types.ts:1524]。`wrapRegisteredTools()` 只消费 `definition`;`sourceInfo` 在 `_refreshToolRegistry()` 合入 `definitionRegistry` 时保留 [E: packages/coding-agent/src/core/extensions/wrapper.ts:28] [E: packages/coding-agent/src/core/agent-session.ts:2494] [E: packages/coding-agent/src/core/agent-session.ts:2496]。

`ExtensionRuntime` 是 loader 创建、runner 绑定、extension API 调用的 shared runtime, 类型上等于 `ExtensionRuntimeState & ExtensionActions` [E: packages/coding-agent/src/core/extensions/types.ts:1678]。它包含 `refreshTools` action, loader 初始化时这个 action 是 no-op, runner `bindCore()` 后替换为 `AgentSession._refreshToolRegistry()` 的入口 [E: packages/coding-agent/src/core/extensions/loader.ts:185] [E: packages/coding-agent/src/core/extensions/loader.ts:196] [E: packages/coding-agent/src/core/extensions/runner.ts:314] [E: packages/coding-agent/src/core/extensions/runner.ts:333] [E: packages/coding-agent/src/core/agent-session.ts:2407]。`ExtensionRuntime` 本身不是 `wrapRegisteredTools()` 的参数;wrapper 的 runtime access 间接来自 `ExtensionRunner.createContext()` [E: packages/coding-agent/src/core/extensions/wrapper.ts:43] [E: packages/coding-agent/src/core/extensions/wrapper.ts:28] [I]。

`ExtensionRunner.createContext()` 返回 extension handler 和 tool execution 使用的 `ExtensionContext`;其 getter / method 会先 `assertActive()`, 再读取 runner 当前的 UI、mode、cwd、session manager、model registry、model、signal 等状态 [E: packages/coding-agent/src/core/extensions/runner.ts:673] [E: packages/coding-agent/src/core/extensions/runner.ts:679] [E: packages/coding-agent/src/core/extensions/runner.ts:680] [E: packages/coding-agent/src/core/extensions/runner.ts:683] [E: packages/coding-agent/src/core/extensions/runner.ts:684] [E: packages/coding-agent/src/core/extensions/runner.ts:691] [E: packages/coding-agent/src/core/extensions/runner.ts:692] [E: packages/coding-agent/src/core/extensions/runner.ts:695] [E: packages/coding-agent/src/core/extensions/runner.ts:696] [E: packages/coding-agent/src/core/extensions/runner.ts:699] [E: packages/coding-agent/src/core/extensions/runner.ts:700] [E: packages/coding-agent/src/core/extensions/runner.ts:703] [E: packages/coding-agent/src/core/extensions/runner.ts:704] [E: packages/coding-agent/src/core/extensions/runner.ts:723] [E: packages/coding-agent/src/core/extensions/runner.ts:724]。所以 extension wrapper 使用 factory 而不是预先保存 context, 可以让 tool execution 在调用时创建 context 并读取 bindCore/bindUI 后的 runner 状态 [E: packages/coding-agent/src/core/extensions/runner.ts:673] [E: packages/coding-agent/src/core/extensions/wrapper.ts:28] [I]。

## 控制流

1. Extension module 调用 `pi.registerTool(tool)`;`createExtensionAPI().registerTool()` 先 `runtime.assertActive()`, 然后按 `tool.name` 写入 `extension.tools`, value 为 `{ definition: tool, sourceInfo: extension.sourceInfo }`, 最后触发 `runtime.refreshTools()` [E: packages/coding-agent/src/core/extensions/loader.ts:249] [E: packages/coding-agent/src/core/extensions/loader.ts:250] [E: packages/coding-agent/src/core/extensions/loader.ts:251] [E: packages/coding-agent/src/core/extensions/loader.ts:253] [E: packages/coding-agent/src/core/extensions/loader.ts:255]。
2. Extension load 阶段的 `refreshTools` 是空函数, 因为 runtime action stubs 在 `createExtensionRuntime()` 中先被创建, `bindCore()` 后才换成真实 action [E: packages/coding-agent/src/core/extensions/loader.ts:185] [E: packages/coding-agent/src/core/extensions/loader.ts:196] [E: packages/coding-agent/src/core/extensions/runner.ts:314] [E: packages/coding-agent/src/core/extensions/runner.ts:333]。
3. `AgentSession._buildRuntime()` 创建 `ExtensionRunner`, 调用 `_bindExtensionCore()` 和 `_applyExtensionBindings()`, 然后调用 `_refreshToolRegistry()` 建 runtime tool registry [E: packages/coding-agent/src/core/agent-session.ts:2590] [E: packages/coding-agent/src/core/agent-session.ts:2600] [E: packages/coding-agent/src/core/agent-session.ts:2601] [E: packages/coding-agent/src/core/agent-session.ts:2607]。
4. `_refreshToolRegistry()` 从 `ExtensionRunner.getAllRegisteredTools()` 读取 extension tools;runner 遍历 extensions, 同名工具只保留第一个注册结果 [E: packages/coding-agent/src/core/agent-session.ts:2474] [E: packages/coding-agent/src/core/extensions/runner.ts:451] [E: packages/coding-agent/src/core/extensions/runner.ts:453] [E: packages/coding-agent/src/core/extensions/runner.ts:455]。
5. `_refreshToolRegistry()` 把 extension registered tools 和 SDK custom tools 合并成 `allCustomTools`, 再按 allowed / excluded tool names 过滤 [E: packages/coding-agent/src/core/agent-session.ts:2475] [E: packages/coding-agent/src/core/agent-session.ts:2477] [E: packages/coding-agent/src/core/agent-session.ts:2481]。
6. `_refreshToolRegistry()` 先把 built-in base tool definitions 放入 `definitionRegistry`, 再用 `allCustomTools` 按同名覆盖 definition entries;这一步保留 `sourceInfo`, 并派生 prompt snippets / prompt guidelines [E: packages/coding-agent/src/core/agent-session.ts:2482] [E: packages/coding-agent/src/core/agent-session.ts:2493] [E: packages/coding-agent/src/core/agent-session.ts:2496] [E: packages/coding-agent/src/core/agent-session.ts:2499] [E: packages/coding-agent/src/core/agent-session.ts:2500] [E: packages/coding-agent/src/core/agent-session.ts:2508]。
7. `_refreshToolRegistry()` 对 `allCustomTools` 调 `wrapRegisteredTools(allCustomTools, runner)`, 对 built-in definitions 也构造 synthetic `RegisteredTool` 后调同一个 wrapper [E: packages/coding-agent/src/core/agent-session.ts:2516] [E: packages/coding-agent/src/core/agent-session.ts:2517] [E: packages/coding-agent/src/core/agent-session.ts:2518] [E: packages/coding-agent/src/core/agent-session.ts:2521] [E: packages/coding-agent/src/core/agent-session.ts:2525]。
8. Runtime `_toolRegistry` 先放 wrapped built-ins, 再 set wrapped extension/custom tools;同名 extension/custom runtime tool 因此覆盖 built-in `AgentTool` [E: packages/coding-agent/src/core/agent-session.ts:2528] [E: packages/coding-agent/src/core/agent-session.ts:2529] [E: packages/coding-agent/src/core/agent-session.ts:2530]。
9. Agent-core 调用 `AgentTool.execute(toolCallId, params, signal, onUpdate)` 时, 通用 wrapper 转发到 `ToolDefinition.execute(..., ctxFactory?.())`;extension wrapper 提供的 `ctxFactory` 会执行 `runner.createContext()` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:18] [E: packages/coding-agent/src/core/extensions/wrapper.ts:28]。
10. Extension tool 执行前后，wrapper 对比 `runner.getActiveTools()`；如果原 active set 没有被移除且出现新名称，它把去重后的增量写进 `AgentToolResult.addedToolNames`，让 transcript 标记 deferred tools 从该结果起可用 [E: packages/coding-agent/src/core/extensions/wrapper.ts:23] [E: packages/coding-agent/src/core/extensions/wrapper.ts:25] [E: packages/coding-agent/src/core/extensions/wrapper.ts:29] [E: packages/coding-agent/src/core/extensions/wrapper.ts:33]。

## 设计动机与权衡

这个子系统把 extension tool registration 和 agent-core execution contract 分开: extension 作者实现的是 `ToolDefinition.execute(..., ctx)`, agent-core 看到的是没有 coding-agent UI/runtime dependency 的 `AgentTool.execute(...)` [E: packages/coding-agent/src/core/extensions/types.ts:480] [E: packages/coding-agent/src/core/extensions/types.ts:485] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:8] [I]。这样 `pi-agent-core` 可以继续只依赖 `AgentTool`, 而 `pi-coding-agent` 在产品层补上 extension context、UI renderers 和 source metadata [I]。

wrapper 选择每次 execute 创建 context, 而不是注册时捕获 context: `wrapRegisteredTools()` 传入 `() => runner.createContext()`, `createContext()` 返回的 getter 会在读取时访问 runner 当前状态 [E: packages/coding-agent/src/core/extensions/wrapper.ts:28] [E: packages/coding-agent/src/core/extensions/runner.ts:673] [E: packages/coding-agent/src/core/extensions/runner.ts:678] [E: packages/coding-agent/src/core/extensions/runner.ts:680]。这和 `createExtensionRuntime()` 的 stale guard 配合: stale runtime 会在 `assertActive()` 中抛错, runner context getter 也会调用 `assertActive()` [E: packages/coding-agent/src/core/extensions/loader.ts:179] [E: packages/coding-agent/src/core/extensions/loader.ts:181] [E: packages/coding-agent/src/core/extensions/runner.ts:679] [I]。

`ExtensionRuntime.refreshTools` 的 no-op pre-bind 行为让 extension 可以在 loading phase 注册 tool, 又避免尚未绑定 `AgentSession` 时刷新 registry [E: packages/coding-agent/src/core/extensions/loader.ts:196]。bindCore 后同一个 API 调用会触发真实 refresh, 因为 runner 把 `actions.refreshTools` 写回 shared runtime [E: packages/coding-agent/src/core/extensions/runner.ts:333] [I]。

`addedToolNames` 把 runtime tool-set mutation 转成 provider-neutral transcript signal：agent-core 将它复制到 `ToolResultMessage`，支持原生 deferred tools 的 wire adapter 再序列化为 tool reference/search；不支持的 provider 仍发送完整 `Context.tools`，不会改变 extension 工具的普通执行 contract [E: packages/coding-agent/src/core/extensions/wrapper.ts:29] [E: packages/coding-agent/src/core/extensions/wrapper.ts:33] [I]。

同名冲突有两个层级: runner 聚合 extension tools 时 first registration wins, 但 `_refreshToolRegistry()` 把 extension/custom wrapped tools 写到 runtime registry 时会覆盖 built-in tools [E: packages/coding-agent/src/core/extensions/runner.ts:451] [E: packages/coding-agent/src/core/extensions/runner.ts:455] [E: packages/coding-agent/src/core/agent-session.ts:2528] [E: packages/coding-agent/src/core/agent-session.ts:2530]。这意味着“多个 extension 之间”和“extension/custom 对 built-in”不是同一个冲突策略 [I]。

## Gotcha

- `wrapRegisteredTools()` 的参数名是 `registeredTools`, 但 `_refreshToolRegistry()` 也会把 SDK `customTools` 包成 `{ definition, sourceInfo }` 后一起传入;所以这个 wrapper 不只服务磁盘 extension, 也服务 coding-agent SDK custom tool path [E: packages/coding-agent/src/core/agent-session.ts:2475] [E: packages/coding-agent/src/core/agent-session.ts:2477] [E: packages/coding-agent/src/core/agent-session.ts:2517] [I]。
- `sourceInfo` 不会被复制进 `AgentTool`;需要来源信息时读 `AgentSession._toolDefinitions` / `getAllTools()` 这一侧的 definition registry, 不要从 runtime `AgentTool` 反推 [E: packages/coding-agent/src/core/extensions/wrapper.ts:28] [E: packages/coding-agent/src/core/agent-session.ts:2499] [E: packages/coding-agent/src/core/agent-session.ts:911] [E: packages/coding-agent/src/core/agent-session.ts:917] [I]。
- `tool_call` event 可以在 runner 里返回 block, `tool_result` event 可以改 content/details/isError;这些 interception hooks 与 `extensions/wrapper.ts` 分离 [E: packages/coding-agent/src/core/extensions/runner.ts:932] [E: packages/coding-agent/src/core/extensions/runner.ts:945] [E: packages/coding-agent/src/core/extensions/runner.ts:877] [E: packages/coding-agent/src/core/extensions/runner.ts:891] [E: packages/coding-agent/src/core/extensions/runner.ts:895] [E: packages/coding-agent/src/core/extensions/runner.ts:899]。
- `ExtensionRuntime` 是本节点 symbols 之一, 但它不在 `wrapper.ts` 中直接出现;它解释的是 wrapper 背后的 shared runtime 如何从 loader 的 stubs 变成 runner-bound actions [E: packages/coding-agent/src/core/extensions/types.ts:1678] [E: packages/coding-agent/src/core/extensions/loader.ts:185] [E: packages/coding-agent/src/core/extensions/runner.ts:333] [I]。

## 跨包边界

[surface.extensions.contribution-points](../../surface/extensions/contribution-points.md) 覆盖 extension author-facing contribution API: `registerTool()` 是 surface method, 参数是 `ToolDefinition`, loader 把它保存为 `RegisteredTool` [E: packages/coding-agent/src/core/extensions/types.ts:1246] [E: packages/coding-agent/src/core/extensions/types.ts:1247] [E: packages/coding-agent/src/core/extensions/loader.ts:249] [E: packages/coding-agent/src/core/extensions/loader.ts:251]。本节点只解释这个 registered tool 如何适配进 runtime tool registry。

[subsys.coding-agent.tool-wrapper](tool-wrapper.md) 覆盖通用 `ToolDefinition` to `AgentTool` adapter: `wrapToolDefinition()` 复制 name/label/description/parameters/prepareArguments/executionMode, 并在 execute 时把 `ctxFactory` 的结果传给 `ToolDefinition.execute()` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:9] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:18]。本节点覆盖 extension-specific `RegisteredTool` 与 `ExtensionRunner` 的那一层。

`pi-agent-core` 边界是 `AgentTool`: extension wrapper 的输出类型来自 `@earendil-works/pi-agent-core`, 所以 agent-core 不需要知道 `ExtensionRuntime`、`ExtensionContext` 或 `sourceInfo` [E: packages/coding-agent/src/core/extensions/wrapper.ts:8] [E: packages/coding-agent/src/core/extensions/wrapper.ts:17] [I]。`pi-tui` 边界保留在 `ToolDefinition.renderCall` / `renderResult`, 它们不经过 `AgentTool` 字段复制, 而是留在 coding-agent definition registry 供 UI 使用 [E: packages/coding-agent/src/core/extensions/types.ts:489] [E: packages/coding-agent/src/core/extensions/types.ts:492] [E: packages/coding-agent/src/core/agent-session.ts:2499] [I]。

## Sources

- packages/coding-agent/src/core/extensions/wrapper.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts

## 相关

- [surface.extensions.contribution-points](../../surface/extensions/contribution-points.md): extension 可见的 `registerTool()` / event / command / provider contribution API。
- [subsys.coding-agent.tool-wrapper](tool-wrapper.md): 通用 `ToolDefinition` 与 agent-core `AgentTool` 之间的 adapter 行为。
