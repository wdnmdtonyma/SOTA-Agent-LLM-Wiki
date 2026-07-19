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
updated: 3da591ab
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

本页以 `packages/coding-agent/src/core/extensions/types.ts` 的 `ExtensionAPI` interface 为完整清单 ground truth,并用 `packages/coding-agent/docs/extensions.md` 的 `ExtensionAPI Methods` 用户文档补充公开语义 [E: packages/coding-agent/src/core/extensions/types.ts:1167] [E: packages/coding-agent/docs/extensions.md:1312]。`on(event, handler)` 的事件名实例由 event catalog 节点展开;本页只把 `on` 作为订阅型 contribution point 列一行,因为所有 overload 都共享同一个 `pi.on` 入口 [E: packages/coding-agent/src/core/extensions/types.ts:1172] [E: packages/coding-agent/src/core/extensions/types.ts:1213] [I]。

“注册型贡献点”指 extension 把工具、命令、快捷键、CLI flag、message renderer、provider 或 event handler 挂进 pi 的扩展系统;“动作入口”指 extension 直接改变当前 session、工具集、模型状态或发送消息 [I]。这个分类是 catalog 口径,不是源码里的 discriminated union;源码在 `ExtensionAPI` 上以方法签名连续暴露这些入口 [E: packages/coding-agent/src/core/extensions/types.ts:1172] [E: packages/coding-agent/src/core/extensions/types.ts:1220] [E: packages/coding-agent/src/core/extensions/types.ts:1258] [E: packages/coding-agent/src/core/extensions/types.ts:1268] [E: packages/coding-agent/src/core/extensions/types.ts:1318] [E: packages/coding-agent/src/core/extensions/types.ts:1383]。

## ExtensionAPI 逐实例目录

| API | 类别 | 签名 / 参数形状 | 默认 / 返回 | 含义与使用时机 | 证据 |
| --- | --- | --- | --- | --- | --- |
| `pi.on(event, handler)` | event handler contribution | `event` 是 typed event name,`handler` 是 `ExtensionHandler<E, R>` 或 `ProjectTrustHandler` | `void` | 订阅 extension lifecycle、session、agent、model、tool、input 等事件;事件名逐项由 extension events catalog 覆盖 [I]。 | [E: packages/coding-agent/src/core/extensions/types.ts:1162] [E: packages/coding-agent/src/core/extensions/types.ts:1172] [E: packages/coding-agent/src/core/extensions/types.ts:1213] [E: packages/coding-agent/docs/extensions.md:1312] |
| `pi.registerTool(definition)` | tool contribution | `definition: ToolDefinition<TParams, TDetails, TState>` | `void` | 注册 LLM 可调用 custom tool;docs 明确可在 extension load 后、`session_start`、command handler 或 event handler 内调用,新工具会刷新并可被 `pi.getAllTools()` 看到。 | [E: packages/coding-agent/src/core/extensions/types.ts:1220] [E: packages/coding-agent/docs/extensions.md:1307] [E: packages/coding-agent/docs/extensions.md:1322] |
| `pi.registerCommand(name, options)` | command contribution | `name: string`, `options: Omit<RegisteredCommand, "name" \| "sourceInfo">` | `void` | 注册 slash command;同名 extension command 不互相覆盖,docs 描述会按 load order 分配数字 invocation suffix。 | [E: packages/coding-agent/src/core/extensions/types.ts:1229] [E: packages/coding-agent/docs/extensions.md:1469] [E: packages/coding-agent/docs/extensions.md:1469] |
| `pi.registerShortcut(shortcut, options)` | keyboard contribution | `shortcut: KeyId`, `options.description?`, `options.handler(ctx)` | `void` | 注册交互模式键盘快捷键;handler 接收普通 `ExtensionContext`。 | [E: packages/coding-agent/src/core/extensions/types.ts:1232] [E: packages/coding-agent/src/core/extensions/types.ts:1235] [E: packages/coding-agent/src/core/extensions/types.ts:1236] [E: packages/coding-agent/docs/extensions.md:1547] |
| `pi.registerFlag(name, options)` | CLI flag contribution | `name: string`, `options.type: "boolean" \| "string"`, `options.default?` | `void` | 注册 extension CLI flag;docs 示例显示注册后用 `pi.getFlag("plan")` 读取。 | [E: packages/coding-agent/src/core/extensions/types.ts:1241] [E: packages/coding-agent/src/core/extensions/types.ts:1245] [E: packages/coding-agent/src/core/extensions/types.ts:1246] [E: packages/coding-agent/docs/extensions.md:1578] [E: packages/coding-agent/docs/extensions.md:1587] |
| `pi.getFlag(name)` | flag action | `name: string` | `boolean \| string \| undefined` | 读取 extension flag value;这是 `registerFlag()` 的配套查询入口。 | [E: packages/coding-agent/src/core/extensions/types.ts:1251] [E: packages/coding-agent/src/core/extensions/types.ts:1559] [E: packages/coding-agent/docs/extensions.md:1587] |
| `pi.registerMessageRenderer(customType, renderer)` | message renderer contribution | `customType: string`, `renderer: MessageRenderer<T>` | `void` | 为 `CustomMessageEntry` 注册 TUI renderer;renderer 通过 `customType` 与 `pi.sendMessage()` 发送的 custom message 对齐。 | [E: packages/coding-agent/src/core/extensions/types.ts:1258] [E: packages/coding-agent/src/core/extensions/types.ts:1128] [E: packages/coding-agent/docs/extensions.md:1540] [E: packages/coding-agent/docs/extensions.md:2775] |
| `pi.sendMessage(message, options?)` | message action | `message` 包含 `customType`、`content`、`display`、`details`;`options.triggerTurn?`;`options.deliverAs?` | `void` | 向 session 注入 custom message;`deliverAs` 支持 `"steer"`、`"followUp"`、`"nextTurn"`,且 `triggerTurn` 只对前两者有效。 | [E: packages/coding-agent/src/core/extensions/types.ts:1268] [E: packages/coding-agent/src/core/extensions/types.ts:1270] [E: packages/coding-agent/docs/extensions.md:1367] [E: packages/coding-agent/docs/extensions.md:1354] [E: packages/coding-agent/docs/extensions.md:1386] |
| `pi.sendUserMessage(content, options?)` | prompt action | `content: string \| (TextContent \| ImageContent)[]`;`options.deliverAs?` | `void` | 像用户输入一样发送 user message,总会触发 turn;streaming 中未指定 `deliverAs` 会抛错。 | [E: packages/coding-agent/src/core/extensions/types.ts:1277] [E: packages/coding-agent/src/core/extensions/types.ts:1279] [E: packages/coding-agent/docs/extensions.md:1390] [E: packages/coding-agent/docs/extensions.md:1412] |
| `pi.appendEntry(customType, data?)` | session persistence action | `customType: string`, `data?: T` | `void` | 持久化 extension state 到 custom entry,不参与 LLM context。 | [E: packages/coding-agent/src/core/extensions/types.ts:1283] [E: packages/coding-agent/docs/extensions.md:1418] |
| `pi.setSessionName(name)` | session metadata action | `name: string` | `void` | 设置 session selector 中展示的 session display name。 | [E: packages/coding-agent/src/core/extensions/types.ts:1290] [E: packages/coding-agent/docs/extensions.md:1435] |
| `pi.getSessionName()` | session metadata action | no args | `string \| undefined` | 读取当前 session name。 | [E: packages/coding-agent/src/core/extensions/types.ts:1293] |
| `pi.setLabel(entryId, label)` | session tree action | `entryId: string`, `label: string \| undefined` | `void` | 设置或清除 session tree entry label,用于 bookmark/navigation。 | [E: packages/coding-agent/src/core/extensions/types.ts:1296] [E: packages/coding-agent/docs/extensions.md:1458] [E: packages/coding-agent/docs/extensions.md:1469] |
| `pi.exec(command, args, options?)` | process action | `command: string`, `args: string[]`, `options?: ExecOptions` | `Promise<ExecResult>` | 执行 shell command 并返回 stdout、stderr、exit code 等结果。 | [E: packages/coding-agent/src/core/extensions/types.ts:1299] [E: packages/coding-agent/docs/extensions.md:1594] [E: packages/coding-agent/docs/extensions.md:1597] |
| `pi.getActiveTools()` | tool state action | no args | `string[]` | 读取当前 active tool names。 | [E: packages/coding-agent/src/core/extensions/types.ts:1302] [E: packages/coding-agent/docs/extensions.md:1617] |
| `pi.getAllTools()` | tool catalog action | no args | `ToolInfo[]` | 读取所有 configured tools 的 name、description、parameters、promptGuidelines 和 source metadata。 | [E: packages/coding-agent/src/core/extensions/types.ts:1305] [E: packages/coding-agent/src/core/extensions/types.ts:1534] [E: packages/coding-agent/docs/extensions.md:1621] |
| `pi.setActiveTools(toolNames)` | tool state action | `toolNames: string[]` | `void` | 设置 active tools;docs 明确 built-in tools 与动态注册工具都可管理。 | [E: packages/coding-agent/src/core/extensions/types.ts:1308] [E: packages/coding-agent/docs/extensions.md:1617] |
| `pi.getCommands()` | command catalog action | no args | `SlashCommandInfo[]` | 读取当前 session 可通过 `prompt` invocation 调用的 extension、prompt、skill slash commands;不包含 built-in interactive commands。 | [E: packages/coding-agent/src/core/extensions/types.ts:1311] [E: packages/coding-agent/docs/extensions.md:1507] [E: packages/coding-agent/docs/extensions.md:1535] |
| `pi.setModel(model)` | model action | `model: Model<any>` | `Promise<boolean>` | 设置当前 model;无可用 API key 时返回 `false`。 | [E: packages/coding-agent/src/core/extensions/types.ts:1318] [E: packages/coding-agent/docs/extensions.md:1630] |
| `pi.getThinkingLevel()` | thinking action | no args | `ThinkingLevel` | 读取当前 thinking level。 | [E: packages/coding-agent/src/core/extensions/types.ts:1321] [E: packages/coding-agent/docs/extensions.md:1644] |
| `pi.setThinkingLevel(level)` | thinking action | `level: ThinkingLevel` | `void` | 设置 thinking level;docs 说明会 clamp 到 model capabilities,变更会 emit `thinking_level_select`。 | [E: packages/coding-agent/src/core/extensions/types.ts:1324] [E: packages/coding-agent/docs/extensions.md:1644] |
| `pi.registerProvider(name, config)` | provider contribution | `name: string`, `config: ProviderConfig` | `void` | 注册或覆盖 model provider;支持自定义 models、baseUrl override、OAuth 和 custom stream handler;factory 阶段调用会排队,runner 初始化后应用,后续 command/event 中调用即时生效。 | [E: packages/coding-agent/src/core/extensions/types.ts:1383] [E: packages/coding-agent/src/core/extensions/types.ts:1413] [E: packages/coding-agent/src/core/extensions/types.ts:1419] [E: packages/coding-agent/src/core/extensions/types.ts:1425] [E: packages/coding-agent/src/core/extensions/types.ts:1432] [E: packages/coding-agent/src/core/extensions/types.ts:1574] [E: packages/coding-agent/docs/extensions.md:1662] [E: packages/coding-agent/docs/extensions.md:1658] [E: packages/coding-agent/docs/extensions.md:1784] |
| `pi.unregisterProvider(name)` | provider action | `name: string` | `void` | 移除已注册 provider 及其 models,并恢复被覆盖的 built-in models;目标不存在时无效果。 | [E: packages/coding-agent/src/core/extensions/types.ts:1398] [E: packages/coding-agent/src/core/extensions/types.ts:1576] [E: packages/coding-agent/docs/extensions.md:1784] |
| `pi.events` | extension bus | `EventBus` property | shared bus | extension 间共享事件总线,用于自定义 extension-to-extension communication。 | [E: packages/coding-agent/src/core/extensions/types.ts:1401] [E: packages/coding-agent/docs/extensions.md:1667] |

## 关键参数形状

`ToolDefinition` 至少包含 `name`、`label`、`description`、`parameters` 和 `execute()`,并可选 `promptSnippet`、`promptGuidelines`、`renderShell`、`prepareArguments`、`executionMode`、`renderCall()`、`renderResult()` [E: packages/coding-agent/src/core/extensions/types.ts:439] [E: packages/coding-agent/src/core/extensions/types.ts:441] [E: packages/coding-agent/src/core/extensions/types.ts:443] [E: packages/coding-agent/src/core/extensions/types.ts:445] [E: packages/coding-agent/src/core/extensions/types.ts:447] [E: packages/coding-agent/src/core/extensions/types.ts:449] [E: packages/coding-agent/src/core/extensions/types.ts:451] [E: packages/coding-agent/src/core/extensions/types.ts:453] [E: packages/coding-agent/src/core/extensions/types.ts:456] [E: packages/coding-agent/src/core/extensions/types.ts:465] [E: packages/coding-agent/src/core/extensions/types.ts:468] [E: packages/coding-agent/src/core/extensions/types.ts:477] [E: packages/coding-agent/src/core/extensions/types.ts:480]。`execute()` 的最后一个参数是 `ExtensionContext`,所以 custom tool 可以在执行时访问 extension context [E: packages/coding-agent/src/core/extensions/types.ts:473] [I]。

`RegisteredCommand` 保存 `name`、`sourceInfo`、可选 `description`、可选 `getArgumentCompletions()` 和必填 `handler(args, ctx)`;`registerCommand()` 的 options 排除 `name` 与 `sourceInfo`,由注册入口和 loader 侧 provenance 填入 [E: packages/coding-agent/src/core/extensions/types.ts:1144] [E: packages/coding-agent/src/core/extensions/types.ts:1146] [E: packages/coding-agent/src/core/extensions/types.ts:1147] [E: packages/coding-agent/src/core/extensions/types.ts:1148] [E: packages/coding-agent/src/core/extensions/types.ts:1149] [E: packages/coding-agent/src/core/extensions/types.ts:1229] [I]。

`ProviderConfig` 可包含 UI display `name`、`baseUrl`、`apiKey`、`api`、`streamSimple`、`headers`、`authHeader`、`models` 和 `oauth`;`models` 提供时替换该 provider 的已有 models,只有 `baseUrl` 时可覆盖已有 models 的 endpoint [E: packages/coding-agent/src/core/extensions/types.ts:1409] [E: packages/coding-agent/src/core/extensions/types.ts:1411] [E: packages/coding-agent/src/core/extensions/types.ts:1413] [E: packages/coding-agent/src/core/extensions/types.ts:1415] [E: packages/coding-agent/src/core/extensions/types.ts:1417] [E: packages/coding-agent/src/core/extensions/types.ts:1419] [E: packages/coding-agent/src/core/extensions/types.ts:1421] [E: packages/coding-agent/src/core/extensions/types.ts:1423] [E: packages/coding-agent/src/core/extensions/types.ts:1425] [E: packages/coding-agent/src/core/extensions/types.ts:1432] [E: packages/coding-agent/docs/extensions.md:1768]。

## 边界与相邻节点

[surface.extensions.contribution-points](../surface/extensions/contribution-points.md) 是作者面向的总览节点,解释主要注册型贡献点如何被 loader/runner 接入;本 catalog 只做逐实例索引和参数口径,不重复展开 runner conflict policy [I]。事件名全集虽然出现在 `ExtensionAPI.on(...)` overloads 中,但每个事件的 payload、return value 和生命周期应由 extension events reference 节点逐事件覆盖 [I]。

## Sources

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/docs/extensions.md

## 相关

- [surface.extensions.contribution-points](../surface/extensions/contribution-points.md): extension 作者能注册工具、命令、快捷键、provider 和 message renderer 的用户可见总览。
