---
id: tool.push-notification
title: PushNotification
kind: tool
tier: T1
path: surface/tools/push-notification.md
status: verified
source: [tools.ts]
symbols: [PushNotificationTool]
related: [subsys.tool-system, subsys.telemetry-flags]
updated: 2026-06-14
evidence: explicit
---

`PushNotificationTool` 是 `tools.ts` 中由 `KAIROS` 或 `KAIROS_PUSH_NOTIFICATION` feature flag 控制的注册级工具条目; 本节点只覆盖注册事实。[E: tools.ts:45][E: tools.ts:46][E: tools.ts:240]

## 能回答的问题

- `PushNotificationTool` 的 feature flag 条件是什么?
- `PushNotificationTool` 如何进入 `getAllBaseTools()`?
- `tools.ts` 能否确认通知 payload、权限和发送行为?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `PushNotificationTool` 变量在 `tools.ts` 中声明。[E: tools.ts:45] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('KAIROS') || feature('KAIROS_PUSH_NOTIFICATION')` 为真时才加载 `PushNotificationTool`, 否则变量为 `null`。[E: tools.ts:46][E: tools.ts:47][E: tools.ts:48][E: tools.ts:49] |

## 2 用途定位

`PushNotificationTool` 的符号名和 `KAIROS_PUSH_NOTIFICATION` flag 支持把它归入 push notification 能力, 但通知渠道、payload schema 和发送策略不在 `tools.ts` 中证明。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `PushNotificationTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `PushNotificationTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(PushNotificationTool ? [PushNotificationTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:240] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `PushNotificationTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `PushNotificationTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `PushNotificationTool` export, 没有内联 `call()` 控制流。[E: tools.ts:47][E: tools.ts:48][U]

## 8 渲染

`tools.ts` 没有暴露 `PushNotificationTool` 的 render 函数或 notification UI 细节。[U]

## 9 设计动机·edge·历史

`KAIROS` 与 `KAIROS_PUSH_NOTIFICATION` 的 OR gate 说明该工具既可随 Kairos 能力启用, 也可由独立 push-notification flag 启用; 两个 gate 的产品边界不在 `tools.ts` 中说明。[E: tools.ts:46][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
