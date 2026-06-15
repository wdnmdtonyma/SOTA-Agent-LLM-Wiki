---
id: tool.monitor
title: Monitor
kind: tool
tier: T1
path: surface/tools/monitor.md
status: verified
source: [tools.ts]
symbols: [MonitorTool]
related: [subsys.tool-system, subsys.telemetry-flags]
updated: 2026-06-14
evidence: explicit
---

`MonitorTool` 是 `tools.ts` 中由 `MONITOR_TOOL` feature flag 控制的注册级工具条目; 本节点只覆盖注册事实和可见性边界。[E: tools.ts:39][E: tools.ts:237]

## 能回答的问题

- `MonitorTool` 在 `tools.ts` 中由哪个 feature flag 控制?
- `MonitorTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 是否能证明 `MonitorTool` 的 monitor task 行为?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `MonitorTool` 变量在 `tools.ts` 中声明。[E: tools.ts:39] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('MONITOR_TOOL')` 为真时才 `require('./tools/MonitorTool/MonitorTool.js').MonitorTool`, 否则变量为 `null`。[E: tools.ts:39][E: tools.ts:40][E: tools.ts:41] |

## 2 用途定位

`tools.ts` 能证明 `MonitorTool` 是 feature-gated 内置工具; 具体是否流式查看后台任务、如何连接 monitor task, 需要实现文件或 task 层源码确认。[U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `MonitorTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `MonitorTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(MonitorTool ? [MonitorTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:237] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `MonitorTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `MonitorTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `MonitorTool` export, 没有内联 `call()` 控制流。[E: tools.ts:40][U]

## 8 渲染

`tools.ts` 没有暴露 `MonitorTool` 的 render 函数或 monitor UI 细节。[U]

## 9 设计动机·edge·历史

`MONITOR_TOOL` gate 说明该工具是可选注册能力; gate 背后的设计动机不在 `tools.ts` 中说明。[E: tools.ts:39][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
