---
id: tool.repl
title: REPLTool
kind: tool
tier: T1
path: surface/tools/repl.md
status: verified
source: [tools/REPLTool/, tools/REPLTool/constants.ts, tools/REPLTool/primitiveTools.ts, utils/collapseReadSearch.ts, components/messages/CollapsedReadSearchContent.tsx, tools.ts, Tool.ts]
symbols: [REPL_TOOL_NAME, REPL_ONLY_TOOLS, isReplModeEnabled, getReplPrimitiveTools]
related: [tool.bash, tool.read, tool.write, tool.edit, tool.glob, tool.grep, tool.notebook-edit, tool.agent]
updated: 2026-06-14
evidence: explicit
---

`REPLTool` 在可见源码中主要体现为 `REPL` wrapper 的注册、模式 gate 和 primitive tool 过滤: REPL mode 开启后, `Read`/`Write`/`Edit`/`Glob`/`Grep`/`Bash`/`NotebookEdit`/`Agent` 会从直接工具列表中隐藏; display/collapse 代码还能识别 REPL 产生的 primitive inner messages, 但产生这些 messages 的 `REPLTool.js` 实现未包含在当前 dump 中。[E: tools/REPLTool/constants.ts:11][E: tools/REPLTool/constants.ts:37][E: tools.ts:314][E: utils/collapseReadSearch.ts:148][U]

## 能回答的问题

- `REPL` 在什么条件下进入 `tools.ts` 的 base tools?
- `REPL` 为什么是 transparent wrapper, 而不是普通业务工具?
- REPL mode 开启时哪些 primitive tools 会被隐藏?
- 当前源码 dump 能否核实 `REPLTool.call()`、input schema 和 VM 细节?

## 1 Identity

- Tool name constant: `REPL`。[E: tools/REPLTool/constants.ts:11]
- `tools.ts` 只在 `process.env.USER_TYPE === 'ant'` 时 require `./tools/REPLTool/REPLTool.js`, require 失败以外的可见路径把 `REPLTool` 变量设为该 module export 或 null。[E: tools.ts:16][E: tools.ts:17][E: tools.ts:18][E: tools.ts:19]
- `getAllBaseTools()` 只在 `process.env.USER_TYPE === 'ant' && REPLTool` 时加入 `REPLTool`。[E: tools.ts:232]
- `isReplModeEnabled()` 在 `CLAUDE_CODE_REPL` 被显式 falsy 时关闭, `CLAUDE_REPL_MODE` truthy 时开启, 否则要求 `USER_TYPE === 'ant'` 且 `CLAUDE_CODE_ENTRYPOINT === 'cli'`。[E: tools/REPLTool/constants.ts:23][E: tools/REPLTool/constants.ts:24][E: tools/REPLTool/constants.ts:25][E: tools/REPLTool/constants.ts:27][E: tools/REPLTool/constants.ts:28]
- 当前 source tree 只有 `constants.ts` 和 `primitiveTools.ts`, 没有 `REPLTool.ts`/`REPLTool.tsx`; `tools.ts` require 的 `REPLTool.js` 实现文件在本源码 dump 中不可见, 因此 schema、permission、call 和 render 的内部细节只能标为 unknown。[U]

## 2 用途定位

`REPL` 是透明 wrapper 的证据来自 display/collapse 层: `collapseReadSearch` 明确把 `REPL` 视为 absorbed silently, 并在处理到 inner primitive tool messages 时用常规 primitive tool definition 做 fallback; wrapper 自身不计数也不打断 collapse group。[E: utils/collapseReadSearch.ts:152][E: utils/collapseReadSearch.ts:160][E: utils/collapseReadSearch.ts:199][E: utils/collapseReadSearch.ts:201] `isVirtual: true` / `newMessages` 生产逻辑只在源码注释里说明, 当前缺少 `REPLTool.js` 实现线可核实。[U] 这与普通工具不同:普通工具的 tool name 对应自身的 schema/call/result; `REPL` 通过隐藏 primitive tools 后承载 batch operations。[E: tools/REPLTool/constants.ts:33][E: tools/REPLTool/constants.ts:37]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `REPLTool.js` 实现文件未包含在当前源码 dump 中, 无法从 `constants.ts` 或 `primitiveTools.ts` 核实 input schema。[U] |

## 4 输出 & maxResultSizeChars

当前可见源码无法核实 `REPLTool` 的 output schema 或 `maxResultSizeChars`, 因为真正 `REPLTool` definition 由 `tools.ts` 动态 require `REPLTool.js`, 但该 implementation source 不在 `tools/REPLTool/` 目录中。[U][E: tools.ts:18]

可见的输出/渲染相关事实是: collapse layer 认为 REPL wrapper 自身 absorbed silently, 并且可以把 inner primitive tool messages 当作常规 `Read`/`Grep`/`Bash` 等消息参与 summary; inner messages 的生成方式仍因缺失 `REPLTool.js` 而无法逐行核实。[E: utils/collapseReadSearch.ts:152][E: utils/collapseReadSearch.ts:160][E: utils/collapseReadSearch.ts:199][U]

## 5 行为标志

| 标志 | 实际值 | 说明 |
| --- | --- | --- |
| `isReplModeEnabled()` | env + entrypoint gate | `CLAUDE_CODE_REPL=0` 关闭; legacy `CLAUDE_REPL_MODE=1` 强制开启; 默认要求 ant interactive CLI。[E: tools/REPLTool/constants.ts:24][E: tools/REPLTool/constants.ts:25][E: tools/REPLTool/constants.ts:27][E: tools/REPLTool/constants.ts:28] |
| `REPL_ONLY_TOOLS` | 8 个 primitive names | Set 包含 `Read`、`Write`、`Edit`、`Glob`、`Grep`、`Bash`、`NotebookEdit`、`Agent`。[E: tools/REPLTool/constants.ts:37][E: tools/REPLTool/constants.ts:38][E: tools/REPLTool/constants.ts:39][E: tools/REPLTool/constants.ts:40][E: tools/REPLTool/constants.ts:41][E: tools/REPLTool/constants.ts:42][E: tools/REPLTool/constants.ts:43][E: tools/REPLTool/constants.ts:44][E: tools/REPLTool/constants.ts:45] |
| `getTools()` filtering | hides primitives only if REPL is enabled and allowed | `getTools()` 先看 allowed tools 中是否有 `REPL`, 有才过滤掉 `REPL_ONLY_TOOLS`。[E: tools.ts:314][E: tools.ts:315][E: tools.ts:319][E: tools.ts:320] |
| simple mode behavior | simple mode may return only REPL | `CLAUDE_CODE_SIMPLE` 且 REPL mode enabled 时, simple tools list 直接以 `[REPLTool]` 起步, coordinator mode 才再追加 `TaskStopTool`/`SendMessageTool`。[E: tools.ts:273][E: tools.ts:277][E: tools.ts:278][E: tools.ts:283] |
| primitive fallback | direct array | `getReplPrimitiveTools()` 返回 `FileReadTool`、`FileWriteTool`、`FileEditTool`、`GlobTool`、`GrepTool`、`BashTool`、`NotebookEditTool`、`AgentTool`。[E: tools/REPLTool/primitiveTools.ts:28][E: tools/REPLTool/primitiveTools.ts:30][E: tools/REPLTool/primitiveTools.ts:31][E: tools/REPLTool/primitiveTools.ts:32][E: tools/REPLTool/primitiveTools.ts:33][E: tools/REPLTool/primitiveTools.ts:34][E: tools/REPLTool/primitiveTools.ts:35][E: tools/REPLTool/primitiveTools.ts:36][E: tools/REPLTool/primitiveTools.ts:37] |
| `isReadOnly`/`isConcurrencySafe`/`isDestructive` | unknown | 这些方法属于缺失的 `REPLTool.js` definition, 当前 source dump 无法核实。[U] |

## 6 权限

当前可见源码无法核实 `REPLTool.checkPermissions()`、`validateInput()` 或 permission matcher, 因为 `REPLTool.js` implementation 不在 dump 中。[U] 可以核实的是: REPL mode 通过 `getTools()` 隐藏 primitive tools 的直接入口, 但 `getReplPrimitiveTools()` 仍把这些 primitive tool objects 暴露给 display/collapse fallback 使用。[E: tools.ts:319][E: tools/REPLTool/primitiveTools.ts:28][E: utils/collapseReadSearch.ts:199]

## 7 call() 走读

当前可见源码无法逐行走读 `REPLTool.call()` 或 VM isolation 内部实现; `tools.ts` 只显示 ant-only require 与 registry inclusion, `tools/REPLTool/` 只包含 constants/primitive helper。[U][E: tools.ts:18][E: tools/REPLTool/primitiveTools.ts:28]

可证实的 wrapper 流程是: REPL mode 开启且 REPL tool 已进入 allowed tools 时, `getTools()` 从模型直接可用工具中移除 `REPL_ONLY_TOOLS`; 后续 collapse/render 代码在需要展示 inner primitive messages 时, 用当前 tools list 找不到就 fallback 到 `getReplPrimitiveTools()`。[E: tools.ts:314][E: tools.ts:319][E: utils/collapseReadSearch.ts:195][E: utils/collapseReadSearch.ts:199][E: components/messages/CollapsedReadSearchContent.tsx:58]

## 8 渲染

wrapper 自身在 collapse layer 被 `isAbsorbedSilently: true` 标记, 不贡献 search/read/repl counts; 已进入 collapse layer 的 inner primitive messages 会用 regular primitive tool definition 参与渲染。[E: utils/collapseReadSearch.ts:152][E: utils/collapseReadSearch.ts:160][E: utils/collapseReadSearch.ts:199] `CollapsedReadSearchContent` 也会在 normal tools 找不到 inner primitive name 时 fallback 到 `getReplPrimitiveTools()` 取 tool definition。[E: components/messages/CollapsedReadSearchContent.tsx:58]

## 9 设计动机·edge·历史

- SDK entrypoints 不默认启用 REPL mode, 因为 SDK consumers script direct tool calls; `isReplModeEnabled()` 的代码要求默认开启路径必须是 ant CLI, 不是 SDK entrypoint。[E: tools/REPLTool/constants.ts:27][E: tools/REPLTool/constants.ts:28]
- `getReplPrimitiveTools()` 没有通过 `getAllBaseTools()` 取 primitives, 而是显式返回数组; 这样即使 `hasEmbeddedSearchTools()` 让 base tools 排除 `Glob`/`Grep`, display/collapse fallback 仍能识别 inner `Glob`/`Grep` messages。[E: tools/REPLTool/primitiveTools.ts:28][E: tools/REPLTool/primitiveTools.ts:33][E: tools/REPLTool/primitiveTools.ts:34][E: tools.ts:201][E: utils/collapseReadSearch.ts:199]
- `REPL` 页的实现级细节保守标 [U], 因为当前源树没有 `tools/REPLTool/REPLTool.ts(x)` 或其它可读 implementation 文件。[U]

## Sources

- `tools/REPLTool/`
- `tools/REPLTool/constants.ts`
- `tools/REPLTool/primitiveTools.ts`
- `utils/collapseReadSearch.ts`
- `components/messages/CollapsedReadSearchContent.tsx`
- `tools.ts`
- `Tool.ts`

## 相关

- [Bash](bash.md)
- [Read](read.md)
- [Write](write.md)
- [Edit](edit.md)
- [Glob](glob.md)
- [Grep](grep.md)
- [NotebookEdit](notebook-edit.md)
- [Agent](agent.md)
