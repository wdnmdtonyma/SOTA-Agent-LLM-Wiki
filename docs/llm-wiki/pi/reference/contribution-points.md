---
id: ref.coding-agent.contribution-points
title: 扩展贡献点与动作目录
kind: catalog
tier: T3
pkg: coding-agent
source:
 - packages/coding-agent/src/core/extensions/types.ts
 - packages/coding-agent/docs/extensions.md
symbols:
 - ExtensionAPI
 - registerTool
 - registerCommand
 - registerProvider
evidence: explicit
status: verified
updated: 4c6fb7cfe8
related:
 - surface.extensions.contribution-points
---

> `ref.coding-agent.contribution-points` 是 `ExtensionAPI` 上 extension 可调用入口的逐实例 catalog:覆盖事件订阅、注册型贡献点、消息/session/tool/model/provider 动作和共享事件总线。

## 能回答的问题

- `ExtensionAPI` 当前暴露哪些 `pi.*` 方法和属性?
- 哪些入口会注册可被 runner 聚合的贡献物,哪些只是当前 session 动作?
- `registerTool()`、`registerCommand()`、`registerProvider()` 的参数形状是什么?
- extension 如何注入消息、持久化自定义 entry、切换 active tools、设置 model 或 thinking level?
- `registerFlag()` 与 `getFlag()` 的可见 catalog 口径在哪里?
- provider 注册与注销在 initial load 和运行期的语义有什么差别?

## Catalog 口径

本页以 `packages/coding-agent/src/core/extensions/types.ts` 的 `ExtensionAPI` interface 为完整清单 ground truth,并用 `packages/coding-agent/docs/extensions.md` 的 `ExtensionAPI Methods` 用户文档补充公开语义 [E: packages/coding-agent/src/core/extensions/types.ts:1551] 。`on(event, handler)` 的事件名实例由 event catalog 节点展开;本页只把 `on` 作为订阅型 contribution point 列一行,因为所有 overload 都共享同一个 `pi.on` 入口 [E: packages/coding-agent/src/core/extensions/types.ts:1442] [E: packages/coding-agent/src/core/extensions/types.ts:1487] [I]。

当前逐实例表有 26 个 `pi.*` API / property；相较旧基线新增的是 `registerMarkdownTransformer()`，extension event union 本身没有因此增加事件名 [E: packages/coding-agent/src/core/extensions/types.ts:1677] [I]。

“注册型贡献点”指 extension 把工具、命令、快捷键、CLI flag、message renderer、provider 或 event handler 挂进 pi 的扩展系统;“动作入口”指 extension 直接改变当前 session、工具集、模型状态或发送消息 [I]。这个分类是 catalog 口径,不是源码里的 discriminated union;源码在 `ExtensionAPI` 上以方法签名连续暴露这些入口 [E: packages/coding-agent/src/core/extensions/types.ts:1442] [E: packages/coding-agent/src/core/extensions/types.ts:1630] [E: packages/coding-agent/src/core/extensions/types.ts:1674] [E: packages/coding-agent/src/core/extensions/types.ts:1690] [E: packages/coding-agent/src/core/extensions/types.ts:1750] [E: packages/coding-agent/src/core/extensions/types.ts:1818]。

## ExtensionAPI 逐实例目录

| API | 类别 | 签名 / 参数形状 | 默认 / 返回 | 含义与使用时机 | 证据 |
| --- | --- | --- | --- | --- | --- |
| `pi.on(event, handler)` | event handler contribution | `event` 是 typed event name,`handler` 是 `ExtensionHandler<E, R>` 或 `ProjectTrustHandler` | `void` | 订阅 extension lifecycle、session、agent、model、tool、input 等事件;事件名逐项由 extension events catalog 覆盖 [I]。 | [E: packages/coding-agent/src/core/extensions/types.ts:1546] [E: packages/coding-agent/src/core/extensions/types.ts:1442] [E: packages/coding-agent/src/core/extensions/types.ts:1487] |
| `pi.registerTool(definition)` | tool contribution | `definition: ToolDefinition<TParams, TDetails, TState>` | `void` | 注册 LLM 可调用 custom tool;docs 明确可在 extension load 后、`session_start`、command handler 或 event handler 内调用,新工具会刷新并可被 `pi.getAllTools()` 看到。 | [E: packages/coding-agent/src/core/extensions/types.ts:1630] |
| `pi.registerCommand(name, options)` | command contribution | `name: string`, `options: Omit<RegisteredCommand, "name" \| "sourceInfo">` | `void` | 注册 slash command;同名 extension command 不互相覆盖,docs 描述会按 load order 分配数字 invocation suffix。 | [E: packages/coding-agent/src/core/extensions/types.ts:1639] |
| `pi.registerShortcut(shortcut, options)` | keyboard contribution | `shortcut: KeyId`, `options.description?`, `options.handler(ctx)` | `void` | 注册交互模式键盘快捷键;handler 接收普通 `ExtensionContext`。 | [E: packages/coding-agent/src/core/extensions/types.ts:1642] [E: packages/coding-agent/src/core/extensions/types.ts:1645] [E: packages/coding-agent/src/core/extensions/types.ts:1646] |
| `pi.registerFlag(name, options)` | CLI flag contribution | `name: string`, `options.type: "boolean" \| "string"`, `options.default?` | `void` | 注册 extension CLI flag;docs 示例显示注册后用 `pi.getFlag("plan")` 读取。 | [E: packages/coding-agent/src/core/extensions/types.ts:1651] [E: packages/coding-agent/src/core/extensions/types.ts:2048] [E: packages/coding-agent/src/core/extensions/types.ts:2049] [E: packages/coding-agent/docs/extensions.md:36] |
| `pi.getFlag(name)` | flag action | `name: string` | `boolean \| string \| undefined` | 读取 extension flag value;这是 `registerFlag()` 的配套查询入口。 | [E: packages/coding-agent/src/core/extensions/types.ts:1667] [E: packages/coding-agent/src/core/extensions/types.ts:2111] [E: packages/coding-agent/docs/extensions.md:36] |
| `pi.registerMessageRenderer(customType, renderer)` | message renderer contribution | `customType: string`, `renderer: MessageRenderer<T>` | `void` | 为 `CustomMessageEntry` 注册 TUI renderer;renderer 通过 `customType` 与 `pi.sendMessage()` 发送的 custom message 对齐。 | [E: packages/coding-agent/src/core/extensions/types.ts:1674] [E: packages/coding-agent/src/core/extensions/types.ts:1512] |
| `pi.registerMarkdownTransformer(transformer)` | transcript Markdown contribution | `transformer: (markdown, { messageType, isStreaming, availableWidth }) => string` | `void` | 在 interactive transcript 渲染前同步改写 user、assistant 或 assistant-thinking Markdown；每个 extension 只保留一个 transformer，多个 extension 按 load order 串联。 | [E: packages/coding-agent/src/core/extensions/types.ts:1500] [E: packages/coding-agent/src/core/extensions/types.ts:1506] [E: packages/coding-agent/src/core/extensions/types.ts:1677] [E: packages/coding-agent/src/core/extensions/loader.ts:356] [E: packages/coding-agent/src/core/extensions/loader.ts:358] [E: packages/coding-agent/src/core/extensions/runner.ts:785] [E: packages/coding-agent/src/core/extensions/runner.ts:786] |
| `pi.registerEntryRenderer(customType, renderer)` | entry renderer contribution | `customType: string`, `renderer: EntryRenderer<T>` | `void` | 为不进入 LLM context 的 `CustomEntry` 注册 TUI renderer；loader 按 custom type 存入 per-extension map。 | [E: packages/coding-agent/src/core/extensions/types.ts:1680] [E: packages/coding-agent/src/core/extensions/types.ts:1680] [E: packages/coding-agent/src/core/extensions/loader.ts:361] [E: packages/coding-agent/src/core/extensions/loader.ts:363] [E: packages/coding-agent/src/core/extensions/loader.ts:364] |
| `pi.sendMessage(message, options?)` | message action | `message` 包含 `customType`、`content`、`display`、`details`;`options.triggerTurn?`;`options.deliverAs?` | `void` | 向 session 注入 custom message;`deliverAs` 支持 `"steer"`、`"followUp"`、`"nextTurn"`,且 `triggerTurn` 只对前两者有效。 | [E: packages/coding-agent/src/core/extensions/types.ts:1690] [E: packages/coding-agent/src/core/extensions/types.ts:1692] |
| `pi.sendUserMessage(content, options?)` | prompt action | `content: string \| (TextContent \| ImageContent)[]`;`options.deliverAs?`;`options.expandPromptTemplates?: boolean`（默认 false，可派发 extension command 并展开 skill/prompt templates） | `void` | 像用户输入一样发送 user message,总会触发 turn;streaming 中未指定 `deliverAs` 会抛错。 | [E: packages/coding-agent/src/core/extensions/types.ts:1700] [E: packages/coding-agent/src/core/extensions/types.ts:1702] [E: packages/coding-agent/src/core/extensions/types.ts:1702] |
| `pi.appendEntry(customType, data?)` | session persistence action | `customType: string`, `data?: T` | `void` | 持久化 extension state 到 custom entry,不参与 LLM context。 | [E: packages/coding-agent/src/core/extensions/types.ts:1706] |
| `pi.setSessionName(name)` | session metadata action | `name: string` | `void` | 设置 session selector 中展示的 session display name。 | [E: packages/coding-agent/src/core/extensions/types.ts:1713] |
| `pi.getSessionName()` | session metadata action | no args | `string \| undefined` | 读取当前 session name。 | [E: packages/coding-agent/src/core/extensions/types.ts:1716] |
| `pi.setLabel(entryId, label)` | session tree action | `entryId: string`, `label: string \| undefined` | `void` | 设置或清除 session tree entry label,用于 bookmark/navigation。 | [E: packages/coding-agent/src/core/extensions/types.ts:1719] |
| `pi.exec(command, args, options?)` | process action | `command: string`, `args: string[]`, `options?: ExecOptions` | `Promise<ExecResult>` | 执行 shell command 并返回 stdout、stderr、exit code 等结果。 | [E: packages/coding-agent/src/core/extensions/types.ts:1722] |
| `pi.getActiveTools()` | tool state action | no args | `string[]` | 读取当前 active tool names。 | [E: packages/coding-agent/src/core/extensions/types.ts:1725] |
| `pi.getAllTools()` | tool catalog action | no args | `ToolInfo[]` | 读取所有 configured tools 的 name、description、parameters、promptGuidelines 和 source metadata。 | [E: packages/coding-agent/src/core/extensions/types.ts:1728] [E: packages/coding-agent/src/core/extensions/types.ts:2081] |
| `pi.setActiveTools(toolNames)` | tool state action | `toolNames: string[]` | `void` | 设置 active tools;docs 明确 built-in tools 与动态注册工具都可管理。 | [E: packages/coding-agent/src/core/extensions/types.ts:1737] |
| `pi.getCommands()` | command catalog action | no args | `SlashCommandInfo[]` | 读取当前 session 可通过 `prompt` invocation 调用的 extension、prompt、skill slash commands;不包含 built-in interactive commands。 | [E: packages/coding-agent/src/core/extensions/types.ts:1740] |
| `pi.setModel(model)` | model action | `model: Model<any>` | `Promise<boolean>` | 设置当前 model;无可用 API key 时返回 `false`。 | [E: packages/coding-agent/src/core/extensions/types.ts:1750] |
| `pi.getThinkingLevel()` | thinking action | no args | `ThinkingLevel` | 读取当前 thinking level。 | [E: packages/coding-agent/src/core/extensions/types.ts:1753] |
| `pi.setThinkingLevel(level)` | thinking action | `level: ThinkingLevel` | `void` | 设置 thinking level;docs 说明会 clamp 到 model capabilities,变更会 emit `thinking_level_select`。 | [E: packages/coding-agent/src/core/extensions/types.ts:1759] |
| `pi.registerProvider(provider)` / `pi.registerProvider(name, config)` | provider contribution | `provider: Provider` 或 `name: string`, `config: ProviderConfig` | `void` | 注册或覆盖 model provider;支持完整 Provider overload，或用 config 声明 models、refreshModels、baseUrl、OAuth 和 custom stream handler；factory 阶段调用会排队,runner 初始化后应用,后续 command/event 中调用即时生效。 | [E: packages/coding-agent/src/core/extensions/types.ts:1817] [E: packages/coding-agent/src/core/extensions/types.ts:1818] [E: packages/coding-agent/src/core/extensions/types.ts:1894] [E: packages/coding-agent/src/core/extensions/types.ts:1719] [E: packages/coding-agent/src/core/extensions/types.ts:1923] [E: packages/coding-agent/src/core/extensions/types.ts:1928] [E: packages/coding-agent/src/core/extensions/types.ts:1930] [E: packages/coding-agent/src/core/extensions/types.ts:2132] |
| `pi.unregisterProvider(name)` | provider action | `name: string` | `void` | 移除已注册 provider 及其 models,并恢复被覆盖的 built-in models;目标不存在时无效果。 | [E: packages/coding-agent/src/core/extensions/types.ts:1833] [E: packages/coding-agent/src/core/extensions/types.ts:2134] |
| `pi.events` | extension bus | `EventBus` property | shared bus | extension 间共享事件总线,用于自定义 extension-to-extension communication。 | [E: packages/coding-agent/src/core/extensions/types.ts:1876] |

## 关键参数形状

`ToolDefinition` 至少包含 `name`、`label`、`description`、`parameters` 和 `execute()`,并可选 `promptSnippet`、`promptGuidelines`、`constrainedSampling`、`renderShell`、`prepareArguments`、`executionMode`、`renderCall()`、`renderResult()` [E: packages/coding-agent/src/core/extensions/types.ts:565] [E: packages/coding-agent/src/core/extensions/types.ts:567] [E: packages/coding-agent/src/core/extensions/types.ts:569] [E: packages/coding-agent/src/core/extensions/types.ts:571] [E: packages/coding-agent/src/core/extensions/types.ts:573] [E: packages/coding-agent/src/core/extensions/types.ts:575] [E: packages/coding-agent/src/core/extensions/types.ts:577] [E: packages/coding-agent/src/core/extensions/types.ts:579] [E: packages/coding-agent/src/core/extensions/types.ts:581] [E: packages/coding-agent/src/core/extensions/types.ts:584] [E: packages/coding-agent/src/core/extensions/types.ts:624] [E: packages/coding-agent/src/core/extensions/types.ts:627] [E: packages/coding-agent/src/core/extensions/types.ts:636] [E: packages/coding-agent/src/core/extensions/types.ts:639]。`execute()` 的最后一个参数是 `ExtensionContext`,所以 custom tool 可以在执行时访问 extension context [E: packages/coding-agent/src/core/extensions/types.ts:509] [I]。

`RegisteredCommand` 保存 `name`、`sourceInfo`、可选 `description`、可选 `getArgumentCompletions()` 和必填 `handler(args, ctx)`;`registerCommand()` 的 options 排除 `name` 与 `sourceInfo`,由注册入口和 loader 侧 provenance 填入 [E: packages/coding-agent/src/core/extensions/types.ts:1528] [E: packages/coding-agent/src/core/extensions/types.ts:1530] [E: packages/coding-agent/src/core/extensions/types.ts:1531] [E: packages/coding-agent/src/core/extensions/types.ts:1532] [E: packages/coding-agent/src/core/extensions/types.ts:1533] [E: packages/coding-agent/src/core/extensions/types.ts:1639] [I]。

`ProviderConfig` 可包含 UI display `name`、`baseUrl`、`apiKey`、`api`、`streamSimple`、`headers`、`authHeader`、`models` 和 `oauth`;`models` 提供时替换该 provider 的已有 models,只有 `baseUrl` 时可覆盖已有 models 的 endpoint [E: packages/coding-agent/src/core/extensions/types.ts:1890] [E: packages/coding-agent/src/core/extensions/types.ts:1892] [E: packages/coding-agent/src/core/extensions/types.ts:1894] [E: packages/coding-agent/src/core/extensions/types.ts:1896] [E: packages/coding-agent/src/core/extensions/types.ts:1898] [E: packages/coding-agent/src/core/extensions/types.ts:1719] [E: packages/coding-agent/src/core/extensions/types.ts:1919] [E: packages/coding-agent/src/core/extensions/types.ts:1921] [E: packages/coding-agent/src/core/extensions/types.ts:1923] [E: packages/coding-agent/src/core/extensions/types.ts:1930] 。

## 边界与相邻节点

[surface.extensions.contribution-points](../surface/extensions/contribution-points.md) 是作者面向的总览节点,解释主要注册型贡献点如何被 loader/runner 接入;本 catalog 只做逐实例索引和参数口径,不重复展开 runner conflict policy [I]。事件名全集虽然出现在 `ExtensionAPI.on(...)` overloads 中,但每个事件的 payload、return value 和生命周期应由 extension events reference 节点逐事件覆盖 [I]。

## Sources

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/docs/extensions.md

## 相关

- [surface.extensions.contribution-points](../surface/extensions/contribution-points.md): extension 作者能注册工具、命令、快捷键、provider 和 message renderer 的用户可见总览。
