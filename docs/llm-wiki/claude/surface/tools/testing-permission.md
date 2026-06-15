---
id: tool.testing-permission
path: surface/tools/testing-permission.md
title: TestingPermission
kind: tool
tier: T1
status: verified
source: [tools/testing/TestingPermissionTool.tsx]
symbols: [TestingPermissionTool]
related: [subsys.permissions]
updated: 2026-06-14
evidence: explicit
---

`TestingPermission` 是测试专用 permission dialog 工具; `tools.ts` 只在 `process.env.NODE_ENV === 'test'` 时注册, 当前 dumped implementation 里的 `isEnabled()` 被编译为 `"production" === 'test'`。[E: tools/testing/TestingPermissionTool.tsx:9][E: tools/testing/TestingPermissionTool.tsx:12][E: tools.ts:244][E: tools/testing/TestingPermissionTool.tsx:28]

## 能回答的问题

- `TestingPermission` 为什么正常 production dump 中不可用?
- `TestingPermission` 如何强制触发 permission ask?
- `TestingPermission` 的 render methods 为什么都返回 null?

## 1 Identity

- Tool name: `TestingPermission`。[E: tools/testing/TestingPermissionTool.tsx:9][E: tools/testing/TestingPermissionTool.tsx:13]
- `tools.ts` 仅在 `process.env.NODE_ENV === 'test'` 时把 `TestingPermissionTool` 加入 base tools。[E: tools.ts:244]
- `maxResultSizeChars`: `100_000`。[E: tools/testing/TestingPermissionTool.tsx:14]
- description: `Test tool that always asks for permission`。[E: tools/testing/TestingPermissionTool.tsx:15][E: tools/testing/TestingPermissionTool.tsx:16]
- prompt: `Test tool that always asks for permission before executing. Used for end-to-end testing.`[E: tools/testing/TestingPermissionTool.tsx:18][E: tools/testing/TestingPermissionTool.tsx:19]

## 2 用途定位

`TestingPermission` 用于 end-to-end testing permission flow: 它不做实际业务操作, 但 `checkPermissions()` 固定返回 ask, 让测试覆盖 permission prompt 的 UI/状态路径。[E: tools/testing/TestingPermissionTool.tsx:39][E: tools/testing/TestingPermissionTool.tsx:40]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| 无 | `strictObject({})` | 不适用 | 不适用 | 工具不接收参数。[E: tools/testing/TestingPermissionTool.tsx:10] |

## 4 输出 & maxResultSizeChars

`call()` 返回 string data: `${NAME} executed successfully`。[E: tools/testing/TestingPermissionTool.tsx:63] `mapToolResultToToolResultBlockParam()` 把 result 转成 string content 的 `tool_result`。[E: tools/testing/TestingPermissionTool.tsx:68][E: tools/testing/TestingPermissionTool.tsx:69][E: tools/testing/TestingPermissionTool.tsx:70]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isEnabled()` | dumped build 中 false | 源码 dump 显示 `"production" === 'test'`, 因此该函数在当前构建中返回 false。[E: tools/testing/TestingPermissionTool.tsx:28] |
| registry gate | test-only | `tools.ts` 只在 `process.env.NODE_ENV === 'test'` 时注册该工具。[E: tools.ts:244] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/testing/TestingPermissionTool.tsx:31] |
| `isReadOnly()` | `true` | 源码直接返回 true。[E: tools/testing/TestingPermissionTool.tsx:34] |
| `checkPermissions()` | 固定 ask | 源码返回 `behavior: 'ask'` 和 `message: Run test?`。[E: tools/testing/TestingPermissionTool.tsx:39][E: tools/testing/TestingPermissionTool.tsx:40] |

## 6 权限

`TestingPermission` 的核心行为就是 permission ask: `checkPermissions()` 不读取输入, 总是要求用户确认。[E: tools/testing/TestingPermissionTool.tsx:39][E: tools/testing/TestingPermissionTool.tsx:40] 该工具没有 `validateInput()` 实现, 输入只由 empty strict schema 约束。[I][E: tools/testing/TestingPermissionTool.tsx:10]

## 7 call() 走读

`call()` 没有 side effect, 只返回 `TestingPermission executed successfully`。[E: tools/testing/TestingPermissionTool.tsx:63] 该结果经过 `mapToolResultToToolResultBlockParam()` 变成模型可见 string content。[E: tools/testing/TestingPermissionTool.tsx:68][E: tools/testing/TestingPermissionTool.tsx:69][E: tools/testing/TestingPermissionTool.tsx:70]

## 8 渲染

`renderToolUseMessage()`、progress、queued、rejected、result 和 error render methods 全部返回 `null`, 因此测试关注 permission mechanics 而不是 transcript UI 内容。[E: tools/testing/TestingPermissionTool.tsx:44][E: tools/testing/TestingPermissionTool.tsx:47][E: tools/testing/TestingPermissionTool.tsx:50][E: tools/testing/TestingPermissionTool.tsx:53][E: tools/testing/TestingPermissionTool.tsx:56][E: tools/testing/TestingPermissionTool.tsx:59]

## 9 设计动机·edge·历史

- description/prompt 和运行时代码共同把该工具限定为 testing permission flow: 文案说明 always asks for permission, `checkPermissions()` 固定返回 ask。[E: tools/testing/TestingPermissionTool.tsx:16][E: tools/testing/TestingPermissionTool.tsx:19][E: tools/testing/TestingPermissionTool.tsx:39][E: tools/testing/TestingPermissionTool.tsx:40]
- production dump 中 `isEnabled()` 常量折叠为 false, 与 `tools.ts` 的 test-only registry gate 共同保证普通会话不应看到该工具。[E: tools/testing/TestingPermissionTool.tsx:28][E: tools.ts:244]
- render methods 全部 null 使测试结果只通过 `tool_result` content 反馈给模型。[E: tools/testing/TestingPermissionTool.tsx:56][E: tools/testing/TestingPermissionTool.tsx:68][E: tools/testing/TestingPermissionTool.tsx:69][E: tools/testing/TestingPermissionTool.tsx:70]

## Sources

- `tools/testing/TestingPermissionTool.tsx`
- `tools.ts`

## 相关

- `subsys.permissions`
