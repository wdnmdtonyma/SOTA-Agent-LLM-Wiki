---
id: tool.verify-plan-execution
title: VerifyPlanExecution
kind: tool
tier: T1
path: surface/tools/verify-plan-execution.md
status: verified
source: [tools.ts]
symbols: [VerifyPlanExecutionTool]
related: [subsys.tool-system]
updated: 2026-06-14
evidence: explicit
---

`VerifyPlanExecutionTool` 是 `tools.ts` 中由环境变量 `CLAUDE_CODE_VERIFY_PLAN === 'true'` 控制的注册级工具条目; 本节点只覆盖注册与可见性。[E: tools.ts:91][E: tools.ts:92][E: tools.ts:231]

## 能回答的问题

- `VerifyPlanExecutionTool` 由 feature flag 还是环境变量控制?
- `VerifyPlanExecutionTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 能否确认 plan execution 验证算法?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `VerifyPlanExecutionTool` 变量在 `tools.ts` 中声明。[E: tools.ts:91] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `process.env.CLAUDE_CODE_VERIFY_PLAN === 'true'` 时才 `require('./tools/VerifyPlanExecutionTool/VerifyPlanExecutionTool.js').VerifyPlanExecutionTool`, 否则变量为 `null`。[E: tools.ts:92][E: tools.ts:93][E: tools.ts:94][E: tools.ts:95] |

## 2 用途定位

`VerifyPlanExecutionTool` 的符号名支持把它归入 plan execution verification, 但 `tools.ts` 没有证明它验证哪些 plan 条件或如何生成结论。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `VerifyPlanExecutionTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `VerifyPlanExecutionTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(VerifyPlanExecutionTool ? [VerifyPlanExecutionTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:231] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `VerifyPlanExecutionTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `VerifyPlanExecutionTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 env gate 通过后加载 `VerifyPlanExecutionTool` export, 没有内联 `call()` 控制流。[E: tools.ts:93][E: tools.ts:94][U]

## 8 渲染

`tools.ts` 没有暴露 `VerifyPlanExecutionTool` 的 render 函数或 plan verification UI 细节。[U]

## 9 设计动机·edge·历史

环境变量 gate 说明该工具可由 runtime env 显式开启; gate 背后的验证设计动机不在 `tools.ts` 中说明。[E: tools.ts:92][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
