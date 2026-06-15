---
id: tool.list-peers
title: ListPeers
kind: tool
tier: T1
path: surface/tools/list-peers.md
status: verified
source: [tools.ts]
symbols: [ListPeersTool]
related: [subsys.tool-system, subsys.telemetry-flags, subsys.bridge-remote]
updated: 2026-06-14
evidence: explicit
---

`ListPeersTool` 是 `tools.ts` 中由 `UDS_INBOX` feature flag 控制的注册级工具条目; 本节点只描述工具注册, 不推断 peer discovery 的实现协议。[E: tools.ts:126][E: tools.ts:227]

## 能回答的问题

- `ListPeersTool` 的 feature flag 是什么?
- `ListPeersTool` 在 `getAllBaseTools()` 中如何注入?
- `tools.ts` 能否确认 peer 列表的 schema、权限和输出格式?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `ListPeersTool` 变量在 `tools.ts` 中声明。[E: tools.ts:126] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('UDS_INBOX')` 为真时才 `require('./tools/ListPeersTool/ListPeersTool.js').ListPeersTool`, 否则变量为 `null`。[E: tools.ts:126][E: tools.ts:127][E: tools.ts:128] |

## 2 用途定位

`UDS_INBOX` flag 名支持把 `ListPeersTool` 归入 inbox/peer 通信面, 但 peer 的来源、地址格式和可见性规则不在 `tools.ts` 中证明。[I][U]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `ListPeersTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `ListPeersTool` 的 output schema、`maxResultSizeChars` 或 result block 映射。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(ListPeersTool ? [ListPeersTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:227] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `ListPeersTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `ListPeersTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型未知。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `ListPeersTool` export, 没有内联 `call()` 控制流。[E: tools.ts:127][U]

## 8 渲染

`tools.ts` 没有暴露 `ListPeersTool` 的 render 函数或 peer list UI 细节。[U]

## 9 设计动机·edge·历史

`UDS_INBOX` gate 说明该工具跟 Unix-domain-socket inbox 相关能力一起裁剪; `tools.ts` 没有说明该 gate 的产品动机。[E: tools.ts:126][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
- subsys.bridge-remote
