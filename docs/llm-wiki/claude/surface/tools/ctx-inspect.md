---
id: tool.ctx-inspect
title: CtxInspect
kind: tool
tier: T1
path: surface/tools/ctx-inspect.md
status: verified
source: [tools.ts]
symbols: [CtxInspectTool]
related: [subsys.tool-system, subsys.telemetry-flags, subsys.compaction]
updated: 2026-06-14
evidence: explicit
---

`CtxInspectTool` 是 `tools.ts` 中由 `CONTEXT_COLLAPSE` feature flag 控制的注册级工具条目; 本节点只覆盖注册事实, 不推断上下文检查实现。[E: tools.ts:110][E: tools.ts:222]

## 能回答的问题

- `CtxInspectTool` 的 feature flag 是什么?
- `CtxInspectTool` 在 `getAllBaseTools()` 里如何注入?
- `tools.ts` 能否确认上下文检查的输入与输出?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `CtxInspectTool` 变量在 `tools.ts` 中声明。[E: tools.ts:110] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('CONTEXT_COLLAPSE')` 为真时才 `require('./tools/CtxInspectTool/CtxInspectTool.js').CtxInspectTool`, 否则变量为 `null`。[E: tools.ts:110][E: tools.ts:111][E: tools.ts:112] |

## 2 用途定位

`CONTEXT_COLLAPSE` flag 名支持把 `CtxInspectTool` 归入 context collapse / context inspection 能力, 但检查内容、输出格式和触发条件不在 `tools.ts` 中证明。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `CtxInspectTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `CtxInspectTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(CtxInspectTool ? [CtxInspectTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:222] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `CtxInspectTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `CtxInspectTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `CtxInspectTool` export, 没有内联 `call()` 控制流。[E: tools.ts:111][U]

## 8 渲染

`tools.ts` 没有暴露 `CtxInspectTool` 的 render 函数或 context inspection UI 细节。[U]

## 9 设计动机·edge·历史

`CONTEXT_COLLAPSE` gate 说明该工具随上下文折叠能力裁剪; gate 背后的设计动机不在 `tools.ts` 中说明。[E: tools.ts:110][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
- subsys.compaction
