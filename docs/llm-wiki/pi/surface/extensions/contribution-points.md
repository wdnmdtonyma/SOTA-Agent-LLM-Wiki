---
id: surface.extensions.contribution-points
title: 扩展贡献点
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/coding-agent/src/modes/interactive/components/custom-message.ts
  - packages/coding-agent/src/extensions/mcp/index.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/test/extensions-runner.test.ts
  - packages/coding-agent/docs/extensions.md
symbols:
  - registerTool
  - registerCommand
  - registerShortcut
  - registerProvider
  - registerMessageRenderer
  - registerToolRenderer
  - ToolRendererResolver
related:
  - surface.extensions.api
  - ref.coding-agent.contribution-points
  - subsys.coding-agent.extension-wrapper
  - subsys.ai.constrained-sampling
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.extensions.contribution-points` 描述 pi 扩展作者可以向 `pi-coding-agent` 注入的主要贡献点: LLM 工具、slash 命令、键盘快捷键、模型 provider、自定义消息渲染器，以及可覆盖未注册工具（含 MCP）的 `registerToolRenderer()`。

## 能回答的问题

- 扩展可以通过哪些 `ExtensionAPI` 方法向 pi 贡献能力?
- `registerTool()` 的工具定义需要包含哪些模型侧和 UI 侧字段?
- `registerCommand()` 注册的命令如何处理同名冲突?
- `registerShortcut()` 注册的快捷键如何与内置键位冲突?
- `registerProvider()` 在 extension load 阶段和运行期分别怎样生效?
- `registerMessageRenderer()` 的 renderer 与 `pi.sendMessage()` 的 `customType` 如何对应?
- `registerToolRenderer()` 怎样为尚未注册的工具（例如 resume 时的 MCP 调用）画 transcript / HTML?

## 贡献点总览

| 贡献点 | 面向谁 | 注册形状 | 运行期接入 |
| --- | --- | --- | --- |
| `registerTool(tool)` | LLM 和工具 UI | 接收 `ToolDefinition` | `Extension.tools` 保存 `RegisteredTool`, runner 聚合时读取 `ext.tools` [E: packages/coding-agent/src/core/extensions/types.ts:1630] [E: packages/coding-agent/src/core/extensions/types.ts:2232] [E: packages/coding-agent/src/core/extensions/runner.ts:630] |
| `registerCommand(name, options)` | slash command 调用者 | 接收命令名、描述、补全函数和 handler | `Extension.commands` 保存 `RegisteredCommand`, runner 解析为可调用 `invocationName` [E: packages/coding-agent/src/core/extensions/types.ts:1639] [E: packages/coding-agent/src/core/extensions/types.ts:2237] [E: packages/coding-agent/src/core/extensions/runner.ts:821] |
| `registerShortcut(shortcut, options)` | 交互模式键盘输入 | 接收 `KeyId`、描述和 handler | `Extension.shortcuts` 保存 `ExtensionShortcut`, runner 与内置键位表做冲突处理 [E: packages/coding-agent/src/core/extensions/types.ts:1642] [E: packages/coding-agent/src/core/extensions/types.ts:2239] [E: packages/coding-agent/src/core/extensions/runner.ts:673] |
| `registerProvider` | 模型选择、登录和 provider 调用 | overload:`registerProvider(provider: Provider)` 或 `registerProvider(name, config: ProviderConfig)` | load 阶段分别排队 `pendingProviderRegistrations` 与 `pendingNativeProviderRegistrations`, `bindCore()` flush 后把 `registerProvider` / `registerNativeProvider` 绑成立即调用 [E: packages/coding-agent/src/core/extensions/types.ts:1817] [E: packages/coding-agent/src/core/extensions/types.ts:1818] [E: packages/coding-agent/src/core/extensions/types.ts:2113] [E: packages/coding-agent/src/core/extensions/types.ts:2115] [E: packages/coding-agent/src/core/extensions/runner.ts:464] [E: packages/coding-agent/src/core/extensions/runner.ts:481] [E: packages/coding-agent/src/core/extensions/runner.ts:518] [E: packages/coding-agent/src/core/extensions/runner.ts:525] |
| `registerMessageRenderer(customType, renderer)` | TUI 自定义消息显示 | 接收 `customType` 和 `MessageRenderer` | `Extension.messageRenderers` 保存 renderer, runner 按 `customType` 查找 renderer [E: packages/coding-agent/src/core/extensions/types.ts:1674] [E: packages/coding-agent/src/core/extensions/types.ts:2233] [E: packages/coding-agent/src/core/extensions/runner.ts:775] |
| `registerToolRenderer(resolver)` | 任意工具调用的 transcript / HTML 绘制 | 接收 `ToolRendererResolver` | `Extension.toolRenderers` 按 load order 串联; `next()` 之后才落到已注册工具的 `renderCall`/`renderResult` [E: packages/coding-agent/src/core/extensions/types.ts:1683] [E: packages/coding-agent/src/core/extensions/types.ts:2234] [E: packages/coding-agent/src/core/extensions/loader.ts:367] [E: packages/coding-agent/src/core/extensions/runner.ts:790] |
| `registerEntryRenderer(customType, renderer)` | TUI 自定义状态显示 | 接收 `customType` 和 `EntryRenderer` | `Extension.entryRenderers` 保存不参与 LLM context 的 `CustomEntry` renderer [E: packages/coding-agent/src/core/extensions/types.ts:1680] [E: packages/coding-agent/src/core/extensions/types.ts:2236] [E: packages/coding-agent/src/core/extensions/loader.ts:361] |

`ExtensionAPI` 是 extension factory 可调用的主接口,它把事件订阅、注册型贡献点、消息/session/tool/model 动作和共享 event bus 放在同一个 surface 中;本节点展开工具、命令、快捷键、provider、message renderer 与 `registerToolRenderer()` [E: packages/coding-agent/src/core/extensions/types.ts:1551] [E: packages/coding-agent/src/core/extensions/types.ts:1630] [E: packages/coding-agent/src/core/extensions/types.ts:1639] [E: packages/coding-agent/src/core/extensions/types.ts:1642] [E: packages/coding-agent/src/core/extensions/types.ts:1674] [E: packages/coding-agent/src/core/extensions/types.ts:1683] [E: packages/coding-agent/src/core/extensions/types.ts:1818] [I]。

## `registerTool`: LLM 可调用工具

`registerTool()` 的参数是 `ToolDefinition`, 它把模型可见的 `name`、`description`、TypeBox `parameters` 与产品 UI 可见的 `label` 放在同一个定义里 [E: packages/coding-agent/src/core/extensions/types.ts:565] [E: packages/coding-agent/src/core/extensions/types.ts:567] [E: packages/coding-agent/src/core/extensions/types.ts:569] [E: packages/coding-agent/src/core/extensions/types.ts:571] [E: packages/coding-agent/src/core/extensions/types.ts:577]。工具定义还能声明 `promptSnippet`、`promptGuidelines`、`prepareArguments`、`executionMode` 和 `execute()`;其中 `execute()` 的第五个参数是 `ExtensionToolContext`, 这是 extension tool 能访问 UI、session、model 和 runtime action 的关键 [E: packages/coding-agent/src/core/extensions/types.ts:573] [E: packages/coding-agent/src/core/extensions/types.ts:575] [E: packages/coding-agent/src/core/extensions/types.ts:584] [E: packages/coding-agent/src/core/extensions/types.ts:627] [E: packages/coding-agent/src/core/extensions/types.ts:632] [E: packages/coding-agent/src/core/extensions/types.ts:383]。

`Extension` 把 tool contribution 存成 `tools: Map<string, RegisteredTool>`,而 `RegisteredTool` 又由 `ToolDefinition` 和 `SourceInfo` 组成 [E: packages/coding-agent/src/core/extensions/types.ts:2040] [E: packages/coding-agent/src/core/extensions/types.ts:2041] [E: packages/coding-agent/src/core/extensions/types.ts:2042] [E: packages/coding-agent/src/core/extensions/types.ts:2232]。`ExtensionRuntime` 的 `refreshTools` action 在 `bindCore()` 时绑定到 runner 的 shared runtime,说明工具表刷新是 core action 注入的一部分 [E: packages/coding-agent/src/core/extensions/types.ts:2156] [E: packages/coding-agent/src/core/extensions/runner.ts:410] [E: packages/coding-agent/src/core/extensions/runner.ts:432]。

`ToolDefinition.constrainedSampling` 可选地声明 JSON Schema strict（`prefer` / `require`）或 provider-specific grammar；definition wrapper 会把它原样保留到 core `AgentTool`，最终生效、fallback 或报错取决于 provider capability [E: packages/coding-agent/src/core/extensions/types.ts:575] [E: packages/coding-agent/src/core/extensions/types.ts:579] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:18] [I]。具体 provider 与 grammar 边界见 `subsys.ai.constrained-sampling`。

runner 聚合工具时按 extension 顺序遍历 `ext.tools`, 同名工具只保留第一个注册结果 [E: packages/coding-agent/src/core/extensions/runner.ts:630] [E: packages/coding-agent/src/core/extensions/runner.ts:632] [E: packages/coding-agent/src/core/extensions/runner.ts:634]。这只描述多个 extension tool 之间的冲突策略;extension/custom tool 与内置 tool 的最终覆盖关系在 [subsys.coding-agent.extension-wrapper](../../subsystems/coding-agent/extension-wrapper.md) 和 session tool registry 中处理 [I]。

## `registerCommand`: slash 命令

`RegisteredCommand` 包含 `name`、`sourceInfo`、可选 `description`、可选 `getArgumentCompletions()` 和必填 handler;handler 接收原始参数字符串和 `ExtensionCommandContext` [E: packages/coding-agent/src/core/extensions/types.ts:1528] [E: packages/coding-agent/src/core/extensions/types.ts:1530] [E: packages/coding-agent/src/core/extensions/types.ts:1531] [E: packages/coding-agent/src/core/extensions/types.ts:1532] [E: packages/coding-agent/src/core/extensions/types.ts:1533]。`registerCommand(name, options)` 的 `options` 类型排除调用方手写 `name` 和 `sourceInfo`,而 `Extension.commands` 持有完整 `RegisteredCommand` [E: packages/coding-agent/src/core/extensions/types.ts:1639] [E: packages/coding-agent/src/core/extensions/types.ts:2237]。

同名命令不会互相覆盖。runner 先统计每个命令名出现次数, 再把重复名解析为 `name:1`、`name:2` 这类 `invocationName`;如果生成名仍被占用, runner 会继续递增 suffix [E: packages/coding-agent/src/core/extensions/runner.ts:811] [E: packages/coding-agent/src/core/extensions/runner.ts:814] [E: packages/coding-agent/src/core/extensions/runner.ts:825] [E: packages/coding-agent/src/core/extensions/runner.ts:827] [E: packages/coding-agent/src/core/extensions/runner.ts:831]。

## `registerShortcut`: 键盘快捷键

`registerShortcut()` 接收 `KeyId` 和一个带可选 `description`、必填 handler 的 options 对象;handler 在执行时拿到普通 `ExtensionContext`, 而不是 command 专用 context [E: packages/coding-agent/src/core/extensions/types.ts:1642] [E: packages/coding-agent/src/core/extensions/types.ts:1645] [E: packages/coding-agent/src/core/extensions/types.ts:1646]。`ExtensionShortcut` 保存 `shortcut`、可选 `description`、handler 和 `extensionPath`,而 `Extension.shortcuts` 以 `KeyId` 为 key 持有这些 shortcut [E: packages/coding-agent/src/core/extensions/types.ts:2053] [E: packages/coding-agent/src/core/extensions/types.ts:2054] [E: packages/coding-agent/src/core/extensions/types.ts:2057] [E: packages/coding-agent/src/core/extensions/types.ts:2239]。

runner 的快捷键聚合会先把内置 keybindings 建成冲突表, 然后遍历 extension shortcuts [E: packages/coding-agent/src/core/extensions/runner.ts:673] [E: packages/coding-agent/src/core/extensions/runner.ts:675] [E: packages/coding-agent/src/core/extensions/runner.ts:685]。如果快捷键命中禁止覆盖的内置动作, runner 发出 diagnostic 并跳过该 extension shortcut;如果只是与允许覆盖的内置键位冲突, runner 记录 warning 但仍使用 extension shortcut [E: packages/coding-agent/src/core/extensions/runner.ts:690] [E: packages/coding-agent/src/core/extensions/runner.ts:691] [E: packages/coding-agent/src/core/extensions/runner.ts:695] [E: packages/coding-agent/src/core/extensions/runner.ts:698] [E: packages/coding-agent/src/core/extensions/runner.ts:699] [E: packages/coding-agent/src/core/extensions/runner.ts:712]。多个 extension 注册同一 normalized key 时, 后遍历到的 extension shortcut 覆盖前一个,并产生 diagnostic [E: packages/coding-agent/src/core/extensions/runner.ts:705] [E: packages/coding-agent/src/core/extensions/runner.ts:707] [E: packages/coding-agent/src/core/extensions/runner.ts:712]。

## `registerProvider`: 动态模型 provider

`ExtensionAPI.registerProvider` 有两个 overload:`registerProvider(provider: Provider)` 注册完整 native `Provider`,以及 `registerProvider(name, config)` 接收 provider name 和 `ProviderConfig` [E: packages/coding-agent/src/core/extensions/types.ts:1817] [E: packages/coding-agent/src/core/extensions/types.ts:1818]。`ProviderConfig` 的关键字段包括 `name`、`baseUrl`、`apiKey`、`api`、`streamSimple`、`headers`、`authHeader`、`models` 和 `oauth` [E: packages/coding-agent/src/core/extensions/types.ts:1890] [E: packages/coding-agent/src/core/extensions/types.ts:1892] [E: packages/coding-agent/src/core/extensions/types.ts:1894] [E: packages/coding-agent/src/core/extensions/types.ts:1896] [E: packages/coding-agent/src/core/extensions/types.ts:1898] [E: packages/coding-agent/src/core/extensions/types.ts:1909] [E: packages/coding-agent/src/core/extensions/types.ts:1919] [E: packages/coding-agent/src/core/extensions/types.ts:1921] [E: packages/coding-agent/src/core/extensions/types.ts:1923] [E: packages/coding-agent/src/core/extensions/types.ts:1930]。name+config 路径会交给 `providerActions.registerProvider` 或 `modelRegistry.registerProvider(name, config)`;native `Provider` 路径走 `registerNativeProvider` 或 `modelRegistry.registerProvider(provider)`。具体新增/覆盖语义属于 model registry 节点边界 [E: packages/coding-agent/src/core/extensions/runner.ts:467] [E: packages/coding-agent/src/core/extensions/runner.ts:469] [E: packages/coding-agent/src/core/extensions/runner.ts:483] [E: packages/coding-agent/src/core/extensions/runner.ts:486] [I]。

provider registration 的时序和 tool registration 不同。`ExtensionRuntimeState` 带有 `pendingProviderRegistrations`、`pendingNativeProviderRegistrations` 和 runtime-level `registerProvider`/`registerNativeProvider`/`unregisterProvider` [E: packages/coding-agent/src/core/extensions/types.ts:2113] [E: packages/coding-agent/src/core/extensions/types.ts:2115] [E: packages/coding-agent/src/core/extensions/types.ts:2132]。`ExtensionRunner.bindCore()` 先 flush name+config pending:优先 `providerActions.registerProvider`,否则 `modelRegistry.registerProvider`,再清空该 list;随后 flush native pending:优先 `providerActions.registerNativeProvider`,否则 `modelRegistry.registerProvider(provider)` [E: packages/coding-agent/src/core/extensions/runner.ts:464] [E: packages/coding-agent/src/core/extensions/runner.ts:466] [E: packages/coding-agent/src/core/extensions/runner.ts:469] [E: packages/coding-agent/src/core/extensions/runner.ts:480] [E: packages/coding-agent/src/core/extensions/runner.ts:481] [E: packages/coding-agent/src/core/extensions/runner.ts:497]。flush 后 runner 把 runtime 的 `registerProvider`、`registerNativeProvider`、`unregisterProvider` 改成即时调用,所以 pre-bind queue 与 post-bind immediate call 的差异由 pending flush + function rebinding 共同体现 [E: packages/coding-agent/src/core/extensions/runner.ts:518] [E: packages/coding-agent/src/core/extensions/runner.ts:525] [E: packages/coding-agent/src/core/extensions/runner.ts:532] [I]。

## `registerMessageRenderer`: 自定义消息渲染

`MessageRenderer` 是一个函数, 接收 `CustomMessage<T>`、`MessageRenderOptions` 和 `Theme`, 返回 TUI `Component` 或 `undefined` [E: packages/coding-agent/src/core/extensions/types.ts:1514] [E: packages/coding-agent/src/core/extensions/types.ts:1512] [E: packages/coding-agent/src/core/extensions/types.ts:1516]。`MessageRenderOptions` 现在同时携带 `expanded` 与当前 `outputPad`，扩展 renderer 可与内置 user/assistant/custom message 保持相同水平 padding [E: packages/coding-agent/src/core/extensions/types.ts:1494] [E: packages/coding-agent/src/core/extensions/types.ts:1495] [E: packages/coding-agent/src/core/extensions/types.ts:1497]。`CustomMessageComponent` 每次 rebuild 都把两者传给 renderer；padding 变化会触发重建 [E: packages/coding-agent/src/modes/interactive/components/custom-message.ts:48] [E: packages/coding-agent/src/modes/interactive/components/custom-message.ts:71] [E: packages/coding-agent/src/modes/interactive/components/custom-message.ts:74]。`registerMessageRenderer(customType, renderer)` 的参数把 `customType` 和 renderer 绑定到同一次注册调用;`Extension.messageRenderers` 是 `Map<string, MessageRenderer>`, runner 查找时按 `customType` 返回匹配 renderer [E: packages/coding-agent/src/core/extensions/types.ts:1674] [E: packages/coding-agent/src/core/extensions/types.ts:2233] [E: packages/coding-agent/src/core/extensions/runner.ts:775]。

message renderer 与 `pi.sendMessage()` 共享 `CustomMessage.customType` 这个 discriminant: `sendMessage()` 的 message 参数包含 `customType`,而 `getMessageRenderer(customType)` 用同一个字符串查 renderer [E: packages/coding-agent/src/core/extensions/types.ts:1690] [E: packages/coding-agent/src/core/extensions/types.ts:1691] [E: packages/coding-agent/src/core/extensions/runner.ts:775] [E: packages/coding-agent/src/core/extensions/runner.ts:777]。因此 renderer 是 TUI 显示扩展点,不是 provider payload、agent loop 或 tool result 的语义拦截点 [I]。

## `registerToolRenderer`: 未注册工具也能画

`ToolRenderers` 是 `renderShell` / `renderCall` / `renderResult` 的子集。`ToolRendererResolver` 接收 `toolName` 和 `next()`：`next()` 返回后续 resolver（按 extension load order）以及最终已注册工具会用的那套 renderers [E: packages/coding-agent/src/core/extensions/types.ts:649] [E: packages/coding-agent/src/core/extensions/types.ts:655] [E: packages/coding-agent/src/core/extensions/types.ts:1683]。用户文档的惯用写法是 `next() ?? mine`：只在后面没有 renderer 时填空，这样 MCP 可以在 server 尚未连接时为 `mcp__<server>__<tool>` 画出调用 [E: packages/coding-agent/docs/extensions.md:190]。

`registerToolRenderer(resolver)` 把 resolver push 进当前 extension 的 `toolRenderers` 数组；同一 extension 可注册多个 [E: packages/coding-agent/src/core/extensions/loader.ts:367] [E: packages/coding-agent/src/core/extensions/loader.ts:369] [E: packages/coding-agent/src/core/extensions/loader.ts:370] [E: packages/coding-agent/src/core/extensions/types.ts:2234]。`ExtensionRunner.resolveToolRenderers(toolName, base)` 把所有 extension 的 resolver flatten 后从 index 0 递归：最后一个 resolver 的 `next()` 才调用 `base()` [E: packages/coding-agent/src/core/extensions/runner.ts:790] [E: packages/coding-agent/src/core/extensions/runner.ts:791] [E: packages/coding-agent/src/core/extensions/runner.ts:793]。测试固定这条链：先匹配 `toolName === "a"` 的 resolver 赢，未匹配时后一个 `next() ?? { renderShell: "self" }` 填空，若 `base()` 已有 `renderCall` 则不再填 [E: packages/coding-agent/test/extensions-runner.test.ts:892] [E: packages/coding-agent/test/extensions-runner.test.ts:910] [E: packages/coding-agent/test/extensions-runner.test.ts:912]。

内置 MCP 扩展在 factory 里注册一条 resolver：`/^mcp__(.+?)__(.+)$/` 命中且 `next()` 为空时，用 `createMcpToolRenderers(\`${server}/${tool}\`)` 画 collapsed 调用。这让 resumed session 在 MCP server 连上之前（或永远连不上时）仍能渲染历史 MCP 调用，而不是整段展开 [E: packages/coding-agent/src/extensions/mcp/index.ts:363] [E: packages/coding-agent/src/extensions/mcp/index.ts:364] [E: packages/coding-agent/src/extensions/mcp/index.ts:365]。

interactive TUI 取 renderer 时走 `session.extensionRunner.resolveToolRenderers(toolName, () => withBuiltInRenderers(...))`；HTML export 同样把 `resolveToolRenderers` 交给 `createToolHtmlRenderer` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2193] [E: packages/coding-agent/src/core/agent-session.ts:4247]。因此 `registerToolRenderer` 同时覆盖 transcript 与 HTML，不只是 TUI 组件。

`registerToolRenderer` 不注册 LLM 可调用工具，也不改变 active tool set；它只选择怎么画一次 tool call。要贡献可执行工具仍用 `registerTool()` [I]。

## 边界与相邻贡献点

`registerFlag()` 也是 `ExtensionAPI` 上的注册方法,flag 作为 CLI 参数扩展点应在贡献点 catalog 中逐项列出 [E: packages/coding-agent/src/core/extensions/types.ts:1651] [E: packages/coding-agent/src/core/extensions/types.ts:2048] [I]。`ExtensionAPI` 上的 `sendMessage()`、`setActiveTools()`、`setModel()` 等是 action methods,它们改变当前 session 或注入消息,但不是“注册一个新贡献物并由 runner 聚合”的同类贡献点 [E: packages/coding-agent/src/core/extensions/types.ts:1690] [E: packages/coding-agent/src/core/extensions/types.ts:1737] [E: packages/coding-agent/src/core/extensions/types.ts:1750] [I]。

`surface.extensions.api` 是 extension factory 收到的完整 `ExtensionAPI` 主入口;本节点只展开其中的 contribution registration methods [I]。[subsys.coding-agent.extension-wrapper](../../subsystems/coding-agent/extension-wrapper.md) 解释 `registerTool()` 保存的 `RegisteredTool` 如何转换成 agent-core `AgentTool`,并在执行时注入 `ExtensionContext` [I]。[ref.coding-agent.contribution-points](../../reference/contribution-points.md) 应作为逐项 catalog,覆盖主贡献点和相邻动作的清单化字段 [I]。

## Sources

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/modes/interactive/components/custom-message.ts
- packages/coding-agent/src/extensions/mcp/index.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/test/extensions-runner.test.ts
- packages/coding-agent/docs/extensions.md

## 相关

- [surface.extensions.api](api.md): `ExtensionAPI`、extension factory 和完整 API surface。
- [ref.coding-agent.contribution-points](../../reference/contribution-points.md): 贡献点与 action 的 catalog 级索引。
- [subsys.coding-agent.extension-wrapper](../../subsystems/coding-agent/extension-wrapper.md): extension tool definition 到 agent-core tool 的适配层。
