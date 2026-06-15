---
id: tool.overflow-test
title: OverflowTest
kind: tool
tier: T1
path: surface/tools/overflow-test.md
status: verified
source: [tools.ts]
symbols: [OverflowTestTool]
related: [subsys.tool-system, subsys.telemetry-flags]
updated: 2026-06-14
evidence: explicit
---

`OverflowTestTool` 是 `tools.ts` 中由 `OVERFLOW_TEST_TOOL` feature flag 控制的注册级工具条目; 本节点只描述测试工具的注册方式。[E: tools.ts:107][E: tools.ts:221]

## 能回答的问题

- `OverflowTestTool` 的 feature flag 是什么?
- `OverflowTestTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 能否确认 overflow 测试的输入、输出或副作用?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `OverflowTestTool` 变量在 `tools.ts` 中声明。[E: tools.ts:107] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('OVERFLOW_TEST_TOOL')` 为真时才 `require('./tools/OverflowTestTool/OverflowTestTool.js').OverflowTestTool`, 否则变量为 `null`。[E: tools.ts:107][E: tools.ts:108][E: tools.ts:109] |

## 2 用途定位

`OverflowTestTool` 的符号名支持把它归入 internal/test surface, 但 `tools.ts` 没有证明它测试哪种 overflow 或如何触发 overflow。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `OverflowTestTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `OverflowTestTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(OverflowTestTool ? [OverflowTestTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:221] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `OverflowTestTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `OverflowTestTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `OverflowTestTool` export, 没有内联 `call()` 控制流。[E: tools.ts:108][U]

## 8 渲染

`tools.ts` 没有暴露 `OverflowTestTool` 的 render 函数或测试 UI 细节。[U]

## 9 设计动机·edge·历史

`OVERFLOW_TEST_TOOL` gate 说明该工具是可选测试能力; gate 背后的测试场景不在 `tools.ts` 中说明。[E: tools.ts:107][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
