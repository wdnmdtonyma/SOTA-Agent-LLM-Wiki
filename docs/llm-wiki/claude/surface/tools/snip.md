---
id: tool.snip
title: Snip
kind: tool
tier: T1
path: surface/tools/snip.md
status: verified
source: [tools.ts]
symbols: [SnipTool]
related: [subsys.tool-system, subsys.telemetry-flags, subsys.compaction]
updated: 2026-06-14
evidence: explicit
---

`SnipTool` 是 `tools.ts` 中由 `HISTORY_SNIP` feature flag 控制的注册级工具条目; 本节点只证明它的 gate、require 和 base tool 注入位置。[E: tools.ts:123][E: tools.ts:243]

## 能回答的问题

- `SnipTool` 在 `tools.ts` 中由哪个 feature flag 控制?
- `SnipTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 是否能确认历史片段读取的 schema 和算法?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `SnipTool` 变量在 `tools.ts` 中声明。[E: tools.ts:123] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('HISTORY_SNIP')` 为真时才 `require('./tools/SnipTool/SnipTool.js').SnipTool`, 否则变量为 `null`。[E: tools.ts:123][E: tools.ts:124][E: tools.ts:125] |

## 2 用途定位

`HISTORY_SNIP` 的 flag 名和 `SnipTool` 的符号名支持把该工具归入 history snip 能力, 但 `tools.ts` 没有证明它如何选择、压缩或返回历史片段。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `SnipTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `SnipTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(SnipTool ? [SnipTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:243] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `SnipTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `SnipTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `SnipTool` export, 没有内联 `call()` 控制流。[E: tools.ts:124][U]

## 8 渲染

`tools.ts` 没有暴露 `SnipTool` 的 render 函数或 snipped-history UI 细节。[U]

## 9 设计动机·edge·历史

`HISTORY_SNIP` gate 说明该工具与历史片段能力一起裁剪; gate 背后的产品动机和边界条件不在 `tools.ts` 中说明。[E: tools.ts:123][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
- subsys.compaction
