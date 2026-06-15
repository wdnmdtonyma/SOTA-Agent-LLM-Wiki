---
id: tool.subscribe-pr
title: SubscribePR
kind: tool
tier: T1
path: surface/tools/subscribe-pr.md
status: verified
source: [tools.ts]
symbols: [SubscribePRTool]
related: [subsys.tool-system, subsys.telemetry-flags]
updated: 2026-06-14
evidence: explicit
---

`SubscribePRTool` 是 `tools.ts` 中由 `KAIROS_GITHUB_WEBHOOKS` feature flag 控制的注册级工具条目; 本节点只覆盖注册事实。[E: tools.ts:50][E: tools.ts:241]

## 能回答的问题

- `SubscribePRTool` 的 feature flag 是什么?
- `SubscribePRTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 能否确认 PR subscription 的 webhook 行为?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `SubscribePRTool` 变量在 `tools.ts` 中声明。[E: tools.ts:50] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('KAIROS_GITHUB_WEBHOOKS')` 为真时才 `require('./tools/SubscribePRTool/SubscribePRTool.js').SubscribePRTool`, 否则变量为 `null`。[E: tools.ts:50][E: tools.ts:51][E: tools.ts:52] |

## 2 用途定位

`SubscribePRTool` 的符号名和 `KAIROS_GITHUB_WEBHOOKS` flag 支持把它归入 GitHub PR webhook subscription 能力, 但订阅对象、鉴权和回调语义不在 `tools.ts` 中证明。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `SubscribePRTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `SubscribePRTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(SubscribePRTool ? [SubscribePRTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:241] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `SubscribePRTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `SubscribePRTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `SubscribePRTool` export, 没有内联 `call()` 控制流。[E: tools.ts:51][U]

## 8 渲染

`tools.ts` 没有暴露 `SubscribePRTool` 的 render 函数或 GitHub subscription UI 细节。[U]

## 9 设计动机·edge·历史

`KAIROS_GITHUB_WEBHOOKS` gate 说明该工具随 Kairos GitHub webhook 能力裁剪; gate 背后的 webhook 设计不在 `tools.ts` 中说明。[E: tools.ts:50][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
