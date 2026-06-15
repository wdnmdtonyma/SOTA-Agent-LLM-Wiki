---
id: tool.tungsten
title: Tungsten
kind: tool
tier: T1
path: surface/tools/tungsten.md
status: verified
source: [tools.ts]
symbols: [TungstenTool]
related: [subsys.tool-system]
updated: 2026-06-14
evidence: explicit
---

`TungstenTool` 是 `tools.ts` 中静态 import、但只在 `USER_TYPE === 'ant'` 时注入 base tool array 的注册级工具条目; 当前源码片段没有通过 `feature()` 包裹它的 import。[E: tools.ts:60][E: tools.ts:215]

## 能回答的问题

- `TungstenTool` 在 `tools.ts` 中是 feature-gated require 还是静态 import?
- `TungstenTool` 什么时候进入 `getAllBaseTools()`?
- `tools.ts` 能否确认 Tungsten 的系统自省能力细节?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `TungstenTool` 从 `./tools/TungstenTool/TungstenTool.js` 静态 import。[E: tools.ts:60] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `getAllBaseTools()` 只在 `process.env.USER_TYPE === 'ant'` 时展开 `[TungstenTool]`。[E: tools.ts:215] |

## 2 用途定位

`tools.ts` 只证明 `TungstenTool` 是 ant-only 注册项; 它是否执行系统自省、如何与虚拟终端或 tmux 交互, 需要实现文件确认。[U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `TungstenTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `TungstenTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(process.env.USER_TYPE === 'ant' ? [TungstenTool] : [])` 条件展开。[E: tools.ts:215] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `TungstenTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `TungstenTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只静态 import `TungstenTool` 并在 ant 用户类型下注册, 没有内联 `call()` 控制流。[E: tools.ts:60][E: tools.ts:215][U]

## 8 渲染

`tools.ts` 没有暴露 `TungstenTool` 的 render 函数或 terminal/system UI 细节。[U]

## 9 设计动机·edge·历史

`USER_TYPE === 'ant'` 条件说明 `TungstenTool` 不属于普通 base tool set; ant-only 背后的设计动机不在 `tools.ts` 中说明。[E: tools.ts:215][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
