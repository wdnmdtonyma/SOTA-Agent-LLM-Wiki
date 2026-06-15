---
id: tool.workflow
title: WorkflowTool
kind: tool
tier: T1
path: surface/tools/workflow.md
status: verified
source: [tools.ts]
symbols: [WorkflowTool]
related: [subsys.tool-system, subsys.telemetry-flags]
updated: 2026-06-14
evidence: explicit
---

`WorkflowTool` 是 `tools.ts` 中由 `WORKFLOW_SCRIPTS` feature flag 控制的注册级工具条目; gate 通过时它先初始化 bundled workflows, 再返回工具 export。[E: tools.ts:129][E: tools.ts:131][E: tools.ts:132]

## 能回答的问题

- `WorkflowTool` 的 feature flag 是什么?
- `WorkflowTool` 注册时为什么会额外调用 bundled workflow 初始化?
- `tools.ts` 能否确认 workflow 输入、权限和执行语义?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `WorkflowTool` 变量在 `tools.ts` 中声明。[E: tools.ts:129] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('WORKFLOW_SCRIPTS')` 为真时执行 IIFE, 否则变量为 `null`。[E: tools.ts:129][E: tools.ts:130][E: tools.ts:134] |

## 2 用途定位

`tools.ts` 能证明 `WorkflowTool` 与 `WORKFLOW_SCRIPTS` gate 绑定。[E: tools.ts:129] gate 通过后的 IIFE 会调用 `initBundledWorkflows()`。[E: tools.ts:130][E: tools.ts:131] 这些事实支持把它描述为 workflow scripts 相关工具, 但具体脚本协议和执行行为不在 `tools.ts` 中展开。[U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `WorkflowTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `WorkflowTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(WorkflowTool ? [WorkflowTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:233] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `WorkflowTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `WorkflowTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只证明 gate 通过后加载 `WorkflowTool` export, 没有内联 workflow `call()` 控制流。[E: tools.ts:132][U]

## 8 渲染

`tools.ts` 没有暴露 `WorkflowTool` 的 render 函数或 workflow permission UI 细节。[U]

## 9 设计动机·edge·历史

`WorkflowTool` 的注册 IIFE 会调用 bundled workflow 初始化, 然后返回 `WorkflowTool` export, 说明注册阶段有副作用。[E: tools.ts:130][E: tools.ts:131][E: tools.ts:132] 副作用内容和动机需 `WorkflowTool` 实现或 bundled 模块确认。[U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
