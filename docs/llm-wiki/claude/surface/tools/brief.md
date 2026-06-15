---
id: tool.brief
path: surface/tools/brief.md
title: Brief
kind: tool
tier: T1
status: verified
source: [tools/BriefTool/BriefTool.ts]
symbols: [BriefTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`BriefTool` 导出的模型可见工具名是 `SendUserMessage`, alias 是 legacy `Brief`, 用于把用户真正会读到的消息和可选附件送出。[E: tools/BriefTool/prompt.ts:1][E: tools/BriefTool/prompt.ts:2][E: tools/BriefTool/BriefTool.ts:136][E: tools/BriefTool/BriefTool.ts:138][E: tools/BriefTool/prompt.ts:6][E: tools/BriefTool/BriefTool.ts:25][E: tools/BriefTool/BriefTool.ts:27]

## 能回答的问题

- `BriefTool` 为什么 index title 是 Brief 但 tool name 是 `SendUserMessage`?
- `BriefTool` 的 attachments 如何校验和解析?
- `BriefTool` 的启用条件由哪些 build/runtime gates 共同决定?

## 1 Identity

- Tool name: `SendUserMessage`。[E: tools/BriefTool/prompt.ts:1][E: tools/BriefTool/BriefTool.ts:137]
- Alias: `Brief`。[E: tools/BriefTool/prompt.ts:2][E: tools/BriefTool/BriefTool.ts:138]
- `tools.ts` 在 base tools 中注册 `BriefTool`。[E: tools.ts:238]
- `searchHint`: `send a message to the user — your primary visible output channel`。[E: tools/BriefTool/BriefTool.ts:139][E: tools/BriefTool/BriefTool.ts:140]
- `maxResultSizeChars`: `100_000`。[E: tools/BriefTool/BriefTool.ts:141]
- `isEnabled()` 直接调用 `isBriefEnabled()`。[E: tools/BriefTool/BriefTool.ts:151][E: tools/BriefTool/BriefTool.ts:152]

## 2 用途定位

`BRIEF_TOOL_PROMPT` 明确把 `message` 定义为用户会读的消息, 并说明普通 text outside this tool 多数用户不会打开 detail view。[E: tools/BriefTool/prompt.ts:6] prompt 还规定 `attachments` 是 absolute 或 cwd-relative file paths, 可用于 images、diffs、logs。[E: tools/BriefTool/prompt.ts:8]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `message` | `string` | 是 | 无 | 面向用户的 markdown message。[E: tools/BriefTool/BriefTool.ts:21][E: tools/BriefTool/BriefTool.ts:24] |
| `attachments` | `string[]` | 否 | `undefined` | 要随消息展示的文件路径, 可为 absolute 或 cwd-relative。[E: tools/BriefTool/BriefTool.ts:26][E: tools/BriefTool/BriefTool.ts:27][E: tools/BriefTool/BriefTool.ts:29] |
| `status` | `normal | proactive` | 是 | 无 | 标记是回复当前用户输入还是主动触达。[E: tools/BriefTool/BriefTool.ts:32][E: tools/BriefTool/BriefTool.ts:34] |

## 4 输出 & maxResultSizeChars

输出 schema 包含 `message`、可选已解析 `attachments` metadata 和可选 `sentAt` ISO timestamp。[E: tools/BriefTool/BriefTool.ts:44][E: tools/BriefTool/BriefTool.ts:45][E: tools/BriefTool/BriefTool.ts:55][E: tools/BriefTool/BriefTool.ts:56][E: tools/BriefTool/BriefTool.ts:61] `mapToolResultToToolResultBlockParam()` 固定返回 `Message delivered to user.`, 并在 attachments 数量大于 0 时追加附件数量 suffix。[E: tools/BriefTool/BriefTool.ts:177][E: tools/BriefTool/BriefTool.ts:181]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isEnabled()` | `isBriefEnabled()` | `isBriefEnabled()` 需要 `feature('KAIROS') || feature('KAIROS_BRIEF')`, 且 `(getKairosActive() || getUserMsgOptIn()) && isBriefEntitled()`。[E: tools/BriefTool/BriefTool.ts:131][E: tools/BriefTool/BriefTool.ts:133] |
| `isBriefEntitled()` | build flag + Kairos/env/GB gate | entitlement 需要 `feature('KAIROS') || feature('KAIROS_BRIEF')`, 并满足 `getKairosActive()`、`CLAUDE_CODE_BRIEF` 或 `tengu_kairos_brief` gate 之一。[E: tools/BriefTool/BriefTool.ts:91][E: tools/BriefTool/BriefTool.ts:99] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/BriefTool/BriefTool.ts:154][E: tools/BriefTool/BriefTool.ts:155] |
| `isReadOnly()` | `true` | 源码直接返回 true; 该工具发消息和处理附件 metadata, 不编辑 workspace 文件。[E: tools/BriefTool/BriefTool.ts:157][E: tools/BriefTool/BriefTool.ts:158] |
| `shouldDefer` | 未声明 | 未看到该工具定义 `shouldDefer`[I]; `Tool` 接口把该字段定义为 optional。[E: Tool.ts:442] |
| `checkPermissions()` | 默认 allow | 未看到该工具自定义 `checkPermissions()`[I]; `buildTool` 默认 allow。[E: Tool.ts:762][E: Tool.ts:766] |

## 6 权限

`validateInput()` 仅在存在 attachments 时调用 `validateAttachmentPaths(attachments)`, 没有 attachments 时直接通过。[E: tools/BriefTool/BriefTool.ts:164][E: tools/BriefTool/BriefTool.ts:167] 未看到工具自定义 `checkPermissions()`[I], 因此使用 `buildTool` 默认 allow。[E: Tool.ts:762][E: Tool.ts:766]

## 7 call() 走读

`call()` 先生成 `sentAt`, 记录 `tengu_brief_send` 事件, 事件包含 `proactive` 与 `attachment_count`。[E: tools/BriefTool/BriefTool.ts:187][E: tools/BriefTool/BriefTool.ts:191] 无附件时直接返回 `{ message, sentAt }`; 有附件时读取 `appState.replBridgeEnabled`, 调用 `resolveAttachments(...)`, 并返回 resolved attachments metadata。[E: tools/BriefTool/BriefTool.ts:192][E: tools/BriefTool/BriefTool.ts:201]

## 8 渲染

`BriefTool` 将 `renderToolUseMessage` 和 `renderToolResultMessage` 从 `UI.js` 导入并挂到工具定义上。[E: tools/BriefTool/BriefTool.ts:18][E: tools/BriefTool/BriefTool.ts:184][E: tools/BriefTool/BriefTool.ts:185] 模型侧结果由 `mapToolResultToToolResultBlockParam()` 返回, 不包含原始 message 全文, 只确认 message delivered 与附件数量。[E: tools/BriefTool/BriefTool.ts:175][E: tools/BriefTool/BriefTool.ts:182]

## 9 设计动机·edge·历史

- output schema 中 attachments 保持 optional; 这与 resumed sessions 需要兼容旧输出结构的设计相吻合。[E: tools/BriefTool/BriefTool.ts:55][E: tools/BriefTool/BriefTool.ts:56][I]
- `status` 不是随意标签, prompt 明确 normal/proactive 的区别, 并说 downstream routing 会使用它。[E: tools/BriefTool/prompt.ts:10]
- `CLAUDE_CODE_BRIEF` 可强制 entitlement, 但 activation 仍由 `isBriefEnabled()` 的 opt-in/Kairos 条件统一裁决。[E: tools/BriefTool/BriefTool.ts:93][E: tools/BriefTool/BriefTool.ts:131][E: tools/BriefTool/BriefTool.ts:133]

## Sources

- `tools/BriefTool/BriefTool.ts`
- `tools/BriefTool/prompt.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.remote-trigger`
