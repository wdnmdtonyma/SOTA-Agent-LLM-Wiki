---
id: tool.terminal-capture
title: TerminalCapture
kind: tool
tier: T1
path: surface/tools/terminal-capture.md
status: verified
source: [tools.ts]
symbols: [TerminalCaptureTool]
related: [subsys.tool-system, subsys.telemetry-flags]
updated: 2026-06-14
evidence: explicit
---

`TerminalCaptureTool` 是 `tools.ts` 中由 `TERMINAL_PANEL` feature flag 控制的注册级工具条目; 本节点只覆盖注册事实。[E: tools.ts:113][E: tools.ts:223]

## 能回答的问题

- `TerminalCaptureTool` 的 feature flag 是什么?
- `TerminalCaptureTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 能否确认 terminal capture 的输入、输出和权限?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `TerminalCaptureTool` 变量在 `tools.ts` 中声明。[E: tools.ts:113] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('TERMINAL_PANEL')` 为真时才加载 `TerminalCaptureTool`, 否则变量为 `null`。[E: tools.ts:113][E: tools.ts:114][E: tools.ts:115][E: tools.ts:116] |

## 2 用途定位

`TerminalCaptureTool` 的符号名和 `TERMINAL_PANEL` flag 支持把它归入 terminal panel capture 能力, 但 capture 范围、数据格式和安全约束不在 `tools.ts` 中证明。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `TerminalCaptureTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `TerminalCaptureTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(TerminalCaptureTool ? [TerminalCaptureTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:223] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `TerminalCaptureTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `TerminalCaptureTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `TerminalCaptureTool` export, 没有内联 `call()` 控制流。[E: tools.ts:114][E: tools.ts:115][U]

## 8 渲染

`tools.ts` 没有暴露 `TerminalCaptureTool` 的 render 函数或 terminal panel UI 细节。[U]

## 9 设计动机·edge·历史

`TERMINAL_PANEL` gate 说明该工具随 terminal panel 能力裁剪; gate 背后的 capture 设计不在 `tools.ts` 中说明。[E: tools.ts:113][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
