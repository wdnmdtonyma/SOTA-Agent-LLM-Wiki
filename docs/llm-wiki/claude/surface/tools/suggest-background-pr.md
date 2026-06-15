---
id: tool.suggest-background-pr
title: SuggestBackgroundPR
kind: tool
tier: T1
path: surface/tools/suggest-background-pr.md
status: verified
source: [tools.ts]
symbols: [SuggestBackgroundPRTool]
related: [subsys.tool-system]
updated: 2026-06-14
evidence: explicit
---

`SuggestBackgroundPRTool` 是 `tools.ts` 中只在 `USER_TYPE === 'ant'` 时通过 conditional require 加载的注册级工具条目; 本节点只描述注册方式。[E: tools.ts:20][E: tools.ts:21][E: tools.ts:216]

## 能回答的问题

- `SuggestBackgroundPRTool` 由 feature flag 还是 `USER_TYPE` 控制?
- `SuggestBackgroundPRTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 能否确认 background PR suggestion 的实现?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `SuggestBackgroundPRTool` 变量在 `tools.ts` 中声明。[E: tools.ts:20] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `process.env.USER_TYPE === 'ant'` 为真时才加载 `SuggestBackgroundPRTool`, 否则变量为 `null`。[E: tools.ts:21][E: tools.ts:22][E: tools.ts:23][E: tools.ts:24] |

## 2 用途定位

`SuggestBackgroundPRTool` 的符号名支持把它归入 background PR suggestion 能力, 但 PR 建议的触发条件、GitHub 行为和用户交互不在 `tools.ts` 中证明。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `SuggestBackgroundPRTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `SuggestBackgroundPRTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(SuggestBackgroundPRTool ? [SuggestBackgroundPRTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:216] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `SuggestBackgroundPRTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `SuggestBackgroundPRTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 `USER_TYPE` gate 通过后加载 `SuggestBackgroundPRTool` export, 没有内联 `call()` 控制流。[E: tools.ts:22][E: tools.ts:23][U]

## 8 渲染

`tools.ts` 没有暴露 `SuggestBackgroundPRTool` 的 render 函数或 PR suggestion UI 细节。[U]

## 9 设计动机·edge·历史

`USER_TYPE === 'ant'` 条件说明该工具不属于普通 base tool set; ant-only 背后的设计动机不在 `tools.ts` 中说明。[E: tools.ts:21][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
