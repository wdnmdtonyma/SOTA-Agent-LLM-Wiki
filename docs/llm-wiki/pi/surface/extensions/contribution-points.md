---
id: surface.extensions.contribution-points
title: 扩展贡献点
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/extensions/runner.ts
symbols:
  - registerTool
  - registerCommand
  - registerShortcut
  - registerProvider
  - registerMessageRenderer
related:
  - surface.extensions.api
  - ref.coding-agent.contribution-points
  - subsys.coding-agent.extension-wrapper
evidence: explicit
status: verified
updated: 8c943640
---

> `surface.extensions.contribution-points` 描述 pi 扩展作者可以向 `pi-coding-agent` 注入的主要贡献点: LLM 工具、slash 命令、键盘快捷键、模型 provider 和自定义消息渲染器。

## 能回答的问题

- 扩展可以通过哪些 `ExtensionAPI` 方法向 pi 贡献能力?
- `registerTool()` 的工具定义需要包含哪些模型侧和 UI 侧字段?
- `registerCommand()` 注册的命令如何处理同名冲突?
- `registerShortcut()` 注册的快捷键如何与内置键位冲突?
- `registerProvider()` 在 extension load 阶段和运行期分别怎样生效?
- `registerMessageRenderer()` 的 renderer 与 `pi.sendMessage()` 的 `customType` 如何对应?

## 贡献点总览

| 贡献点 | 面向谁 | 注册形状 | 运行期接入 |
| --- | --- | --- | --- |
| `registerTool(tool)` | LLM 和工具 UI | 接收 `ToolDefinition` | `Extension.tools` 保存 `RegisteredTool`, runner 聚合时读取 `ext.tools` [E: packages/coding-agent/src/core/extensions/types.ts:1187] [E: packages/coding-agent/src/core/extensions/types.ts:1599] [E: packages/coding-agent/src/core/extensions/runner.ts:418] |
| `registerCommand(name, options)` | slash command 调用者 | 接收命令名、描述、补全函数和 handler | `Extension.commands` 保存 `RegisteredCommand`, runner 解析为可调用 `invocationName` [E: packages/coding-agent/src/core/extensions/types.ts:1196] [E: packages/coding-agent/src/core/extensions/types.ts:1601] [E: packages/coding-agent/src/core/extensions/runner.ts:570] |
| `registerShortcut(shortcut, options)` | 交互模式键盘输入 | 接收 `KeyId`、描述和 handler | `Extension.shortcuts` 保存 `ExtensionShortcut`, runner 与内置键位表做冲突处理 [E: packages/coding-agent/src/core/extensions/types.ts:1199] [E: packages/coding-agent/src/core/extensions/types.ts:1603] [E: packages/coding-agent/src/core/extensions/runner.ts:461] |
| `registerProvider(name, config)` | 模型选择、登录和 provider 调用 | 接收 provider 名和 `ProviderConfig` | load 阶段先排队, `bindCore()` 后 flush;绑定后直接调用 provider actions 或 `ModelRegistry` [E: packages/coding-agent/src/core/extensions/types.ts:1346] [E: packages/coding-agent/src/core/extensions/types.ts:1507] [E: packages/coding-agent/src/core/extensions/runner.ts:345] [E: packages/coding-agent/src/core/extensions/runner.ts:365] |
| `registerMessageRenderer(customType, renderer)` | TUI 自定义消息显示 | 接收 `customType` 和 `MessageRenderer` | `Extension.messageRenderers` 保存 renderer, runner 按 `customType` 查找 renderer [E: packages/coding-agent/src/core/extensions/types.ts:1225] [E: packages/coding-agent/src/core/extensions/types.ts:1600] [E: packages/coding-agent/src/core/extensions/runner.ts:546] |

`ExtensionAPI` 是 extension factory 可调用的主接口,它把事件订阅、注册型贡献点、消息/session/tool/model 动作和共享 event bus 放在同一个 surface 中;本节点只展开 `index.json` 指定的五个注册型贡献点 [E: packages/coding-agent/src/core/extensions/types.ts:1136] [E: packages/coding-agent/src/core/extensions/types.ts:1187] [E: packages/coding-agent/src/core/extensions/types.ts:1196] [E: packages/coding-agent/src/core/extensions/types.ts:1199] [E: packages/coding-agent/src/core/extensions/types.ts:1225] [E: packages/coding-agent/src/core/extensions/types.ts:1346] [I]。

## `registerTool`: LLM 可调用工具

`registerTool()` 的参数是 `ToolDefinition`, 它把模型可见的 `name`、`description`、TypeBox `parameters` 与产品 UI 可见的 `label` 放在同一个定义里 [E: packages/coding-agent/src/core/extensions/types.ts:435] [E: packages/coding-agent/src/core/extensions/types.ts:437] [E: packages/coding-agent/src/core/extensions/types.ts:439] [E: packages/coding-agent/src/core/extensions/types.ts:441] [E: packages/coding-agent/src/core/extensions/types.ts:447]。工具定义还能声明 `promptSnippet`、`promptGuidelines`、`prepareArguments`、`executionMode` 和 `execute()`;其中 `execute()` 的第五个参数是 `ExtensionContext`, 这是 extension tool 能访问 UI、session、model 和 runtime action 的关键 [E: packages/coding-agent/src/core/extensions/types.ts:443] [E: packages/coding-agent/src/core/extensions/types.ts:445] [E: packages/coding-agent/src/core/extensions/types.ts:452] [E: packages/coding-agent/src/core/extensions/types.ts:461] [E: packages/coding-agent/src/core/extensions/types.ts:464] [E: packages/coding-agent/src/core/extensions/types.ts:469]。

`Extension` 把 tool contribution 存成 `tools: Map<string, RegisteredTool>`,而 `RegisteredTool` 又由 `ToolDefinition` 和 `SourceInfo` 组成 [E: packages/coding-agent/src/core/extensions/types.ts:1439] [E: packages/coding-agent/src/core/extensions/types.ts:1440] [E: packages/coding-agent/src/core/extensions/types.ts:1441] [E: packages/coding-agent/src/core/extensions/types.ts:1599]。`ExtensionRuntime` 的 `refreshTools` action 在 `bindCore()` 时绑定到 runner 的 shared runtime,说明工具表刷新是 core action 注入的一部分 [E: packages/coding-agent/src/core/extensions/types.ts:1536] [E: packages/coding-agent/src/core/extensions/runner.ts:307] [E: packages/coding-agent/src/core/extensions/runner.ts:325]。

runner 聚合工具时按 extension 顺序遍历 `ext.tools`, 同名工具只保留第一个注册结果 [E: packages/coding-agent/src/core/extensions/runner.ts:418] [E: packages/coding-agent/src/core/extensions/runner.ts:420] [E: packages/coding-agent/src/core/extensions/runner.ts:422]。这只描述多个 extension tool 之间的冲突策略;extension/custom tool 与内置 tool 的最终覆盖关系在 [subsys.coding-agent.extension-wrapper](../../subsystems/coding-agent/extension-wrapper.md) 和 session tool registry 中处理 [I]。

## `registerCommand`: slash 命令

`RegisteredCommand` 包含 `name`、`sourceInfo`、可选 `description`、可选 `getArgumentCompletions()` 和必填 handler;handler 接收原始参数字符串和 `ExtensionCommandContext` [E: packages/coding-agent/src/core/extensions/types.ts:1113] [E: packages/coding-agent/src/core/extensions/types.ts:1115] [E: packages/coding-agent/src/core/extensions/types.ts:1116] [E: packages/coding-agent/src/core/extensions/types.ts:1117] [E: packages/coding-agent/src/core/extensions/types.ts:1118]。`registerCommand(name, options)` 的 `options` 类型排除调用方手写 `name` 和 `sourceInfo`,而 `Extension.commands` 持有完整 `RegisteredCommand` [E: packages/coding-agent/src/core/extensions/types.ts:1196] [E: packages/coding-agent/src/core/extensions/types.ts:1601]。

同名命令不会互相覆盖。runner 先统计每个命令名出现次数, 再把重复名解析为 `name:1`、`name:2` 这类 `invocationName`;如果生成名仍被占用, runner 会继续递增 suffix [E: packages/coding-agent/src/core/extensions/runner.ts:560] [E: packages/coding-agent/src/core/extensions/runner.ts:563] [E: packages/coding-agent/src/core/extensions/runner.ts:574] [E: packages/coding-agent/src/core/extensions/runner.ts:576] [E: packages/coding-agent/src/core/extensions/runner.ts:580]。

## `registerShortcut`: 键盘快捷键

`registerShortcut()` 接收 `KeyId` 和一个带可选 `description`、必填 handler 的 options 对象;handler 在执行时拿到普通 `ExtensionContext`, 而不是 command 专用 context [E: packages/coding-agent/src/core/extensions/types.ts:1199] [E: packages/coding-agent/src/core/extensions/types.ts:1202] [E: packages/coding-agent/src/core/extensions/types.ts:1203]。`ExtensionShortcut` 保存 `shortcut`、可选 `description`、handler 和 `extensionPath`,而 `Extension.shortcuts` 以 `KeyId` 为 key 持有这些 shortcut [E: packages/coding-agent/src/core/extensions/types.ts:1452] [E: packages/coding-agent/src/core/extensions/types.ts:1453] [E: packages/coding-agent/src/core/extensions/types.ts:1456] [E: packages/coding-agent/src/core/extensions/types.ts:1603]。

runner 的快捷键聚合会先把内置 keybindings 建成冲突表, 然后遍历 extension shortcuts [E: packages/coding-agent/src/core/extensions/runner.ts:461] [E: packages/coding-agent/src/core/extensions/runner.ts:463] [E: packages/coding-agent/src/core/extensions/runner.ts:473]。如果快捷键命中禁止覆盖的内置动作, runner 发出 diagnostic 并跳过该 extension shortcut;如果只是与允许覆盖的内置键位冲突, runner 记录 warning 但仍使用 extension shortcut [E: packages/coding-agent/src/core/extensions/runner.ts:478] [E: packages/coding-agent/src/core/extensions/runner.ts:479] [E: packages/coding-agent/src/core/extensions/runner.ts:483] [E: packages/coding-agent/src/core/extensions/runner.ts:486] [E: packages/coding-agent/src/core/extensions/runner.ts:487] [E: packages/coding-agent/src/core/extensions/runner.ts:500]。多个 extension 注册同一 normalized key 时, 后遍历到的 extension shortcut 覆盖前一个,并产生 diagnostic [E: packages/coding-agent/src/core/extensions/runner.ts:493] [E: packages/coding-agent/src/core/extensions/runner.ts:495] [E: packages/coding-agent/src/core/extensions/runner.ts:500]。

## `registerProvider`: 动态模型 provider

`registerProvider()` 接收 provider name 和 `ProviderConfig`;`ProviderConfig` 的关键字段包括 `name`、`baseUrl`、`apiKey`、`api`、`streamSimple`、`headers`、`authHeader`、`models` 和 `oauth` [E: packages/coding-agent/src/core/extensions/types.ts:1346] [E: packages/coding-agent/src/core/extensions/types.ts:1372] [E: packages/coding-agent/src/core/extensions/types.ts:1374] [E: packages/coding-agent/src/core/extensions/types.ts:1376] [E: packages/coding-agent/src/core/extensions/types.ts:1378] [E: packages/coding-agent/src/core/extensions/types.ts:1380] [E: packages/coding-agent/src/core/extensions/types.ts:1382] [E: packages/coding-agent/src/core/extensions/types.ts:1384] [E: packages/coding-agent/src/core/extensions/types.ts:1386] [E: packages/coding-agent/src/core/extensions/types.ts:1388] [E: packages/coding-agent/src/core/extensions/types.ts:1390]。从这些字段和 runner 的 `modelRegistry.registerProvider(name, config)` 调用可见,extension provider contribution 会把配置交给模型注册层处理,具体新增/覆盖语义属于 model registry 节点边界 [E: packages/coding-agent/src/core/extensions/runner.ts:350] [I]。

provider registration 的时序和 tool registration 不同。`ExtensionRuntimeState` 带有 `pendingProviderRegistrations` 和 runtime-level `registerProvider`/`unregisterProvider` 函数,而 `ExtensionRunner.bindCore()` 会遍历 pending provider registrations,优先调用 `providerActions.registerProvider`,否则调用 `modelRegistry.registerProvider`,随后清空 pending list [E: packages/coding-agent/src/core/extensions/types.ts:1507] [E: packages/coding-agent/src/core/extensions/types.ts:1518] [E: packages/coding-agent/src/core/extensions/runner.ts:345] [E: packages/coding-agent/src/core/extensions/runner.ts:347] [E: packages/coding-agent/src/core/extensions/runner.ts:350] [E: packages/coding-agent/src/core/extensions/runner.ts:361]。flush 后 runner 把 runtime 的 `registerProvider` / `unregisterProvider` 改成即时调用,所以 pre-bind queue 与 post-bind immediate call 的差异由 pending flush + function rebinding 共同体现 [E: packages/coding-agent/src/core/extensions/runner.ts:365] [E: packages/coding-agent/src/core/extensions/runner.ts:372] [I]。

## `registerMessageRenderer`: 自定义消息渲染

`MessageRenderer` 是一个函数, 接收 `CustomMessage<T>`、`MessageRenderOptions` 和 `Theme`, 返回 TUI `Component` 或 `undefined` [E: packages/coding-agent/src/core/extensions/types.ts:1103] [E: packages/coding-agent/src/core/extensions/types.ts:1104] [E: packages/coding-agent/src/core/extensions/types.ts:1105] [E: packages/coding-agent/src/core/extensions/types.ts:1106] [E: packages/coding-agent/src/core/extensions/types.ts:1107]。`registerMessageRenderer(customType, renderer)` 的参数把 `customType` 和 renderer 绑定到同一次注册调用;`Extension.messageRenderers` 是 `Map<string, MessageRenderer>`, runner 查找时按 extension 顺序返回第一个匹配 renderer [E: packages/coding-agent/src/core/extensions/types.ts:1225] [E: packages/coding-agent/src/core/extensions/types.ts:1600] [E: packages/coding-agent/src/core/extensions/runner.ts:546] [E: packages/coding-agent/src/core/extensions/runner.ts:548] [E: packages/coding-agent/src/core/extensions/runner.ts:550]。

message renderer 与 `pi.sendMessage()` 共享 `CustomMessage.customType` 这个 discriminant: `sendMessage()` 的 message 参数包含 `customType`,而 `getMessageRenderer(customType)` 用同一个字符串查 renderer [E: packages/coding-agent/src/core/extensions/types.ts:1232] [E: packages/coding-agent/src/core/extensions/types.ts:1233] [E: packages/coding-agent/src/core/extensions/runner.ts:546] [E: packages/coding-agent/src/core/extensions/runner.ts:548]。因此 renderer 是 TUI 显示扩展点,不是 provider payload、agent loop 或 tool result 的语义拦截点 [I]。

## 边界与相邻贡献点

`registerFlag()` 也是 `ExtensionAPI` 上的注册方法,但本节点的 `symbols` 只覆盖 `index.json` 指定的五个主贡献点;flag 作为 CLI 参数扩展点应在贡献点 catalog 中逐项列出 [E: packages/coding-agent/src/core/extensions/types.ts:1208] [E: packages/coding-agent/src/core/extensions/types.ts:1212] [I]。`ExtensionAPI` 上的 `sendMessage()`、`setActiveTools()`、`setModel()` 等是 action methods,它们改变当前 session 或注入消息,但不是“注册一个新贡献物并由 runner 聚合”的同类贡献点 [E: packages/coding-agent/src/core/extensions/types.ts:1232] [E: packages/coding-agent/src/core/extensions/types.ts:1272] [E: packages/coding-agent/src/core/extensions/types.ts:1282] [I]。

`surface.extensions.api` 是 extension factory 收到的完整 `ExtensionAPI` 主入口;本节点只展开其中的 contribution registration methods [I]。[subsys.coding-agent.extension-wrapper](../../subsystems/coding-agent/extension-wrapper.md) 解释 `registerTool()` 保存的 `RegisteredTool` 如何转换成 agent-core `AgentTool`,并在执行时注入 `ExtensionContext` [I]。[ref.coding-agent.contribution-points](../../reference/contribution-points.md) 应作为逐项 catalog,覆盖主贡献点和相邻动作的清单化字段 [I]。

## Sources

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/runner.ts

## 相关

- [surface.extensions.api](api.md): `ExtensionAPI`、extension factory 和完整 API surface。
- [ref.coding-agent.contribution-points](../../reference/contribution-points.md): 贡献点与 action 的 catalog 级索引。
- [subsys.coding-agent.extension-wrapper](../../subsystems/coding-agent/extension-wrapper.md): extension tool definition 到 agent-core tool 的适配层。
