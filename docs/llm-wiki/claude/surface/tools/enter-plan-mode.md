---
id: tool.enter-plan-mode
path: surface/tools/enter-plan-mode.md
title: EnterPlanMode
kind: tool
tier: T1
status: verified
source: [tools/EnterPlanModeTool/EnterPlanModeTool.ts]
symbols: [EnterPlanModeTool]
related: [tool.ask-user-question, tool.exit-plan-mode]
updated: 2026-06-14
evidence: explicit
---

`EnterPlanMode` 是把主线程 session 切换到 plan permission mode 的 deferred、read-only 工具, 成功后要求模型只探索和设计实现方案。[E: tools/EnterPlanModeTool/constants.ts:1][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:36][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:55][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:72][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:92][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:99]

## 能回答的问题

- `EnterPlanMode` 的输入为什么为空?
- `EnterPlanMode` 如何修改 `toolPermissionContext.mode`?
- `EnterPlanMode` 在 channels 场景为什么会禁用?

## 1 Identity

- Tool name: `EnterPlanMode`。[E: tools/EnterPlanModeTool/constants.ts:1][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:37]
- `tools.ts` 在 base tools 中注册 `EnterPlanModeTool`。[E: tools.ts:213]
- `searchHint`: `switch to plan mode to design an approach before coding`。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:38]
- `maxResultSizeChars`: `100_000`。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:39]
- description: `Requests permission to enter plan mode for complex tasks requiring exploration and design`。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:40][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:41]

## 2 用途定位

`EnterPlanMode` 用于复杂任务的探索和方案设计阶段; 成功结果在 `tool_result` 中要求模型探索 codebase、识别相似实现、比较 trade-off, 必要时调用 `AskUserQuestion`, 最后用 `ExitPlanMode` 呈现方案审批。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:111][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:116]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| 无 | `strictObject({})` | 不适用 | 不适用 | 工具不接收参数。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:22][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:24] |

## 4 输出 & maxResultSizeChars

输出 schema 只有 `message: string`, 描述为进入 plan mode 的确认。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:29][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:30] `call()` 成功返回固定 message, 告诉模型开始探索 codebase 并设计实现方案。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:98][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:99]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:55] |
| `isEnabled()` | channels 场景可禁用 | 当 `KAIROS` 或 `KAIROS_CHANNELS` feature 开启且 `getAllowedChannels().length > 0` 时返回 `false`, 否则返回 `true`。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:61][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:66] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:68][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:69] |
| `isReadOnly()` | `true` | 源码直接返回 true; 该工具只改变 permission mode/session state, 不写 workspace 文件。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:72] |
| `checkPermissions()` | 默认 allow | 未看到该工具自定义 `checkPermissions()`[I]; `buildTool` 默认 allow。[E: Tool.ts:762][E: Tool.ts:766] |

## 6 权限

未看到 `EnterPlanMode` 自定义 `validateInput()` 或 `checkPermissions()`[I]; 空 schema 约束输入, permission 采用 `buildTool` 默认 allow。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:22][E: Tool.ts:762][E: Tool.ts:766] `call()` 会拒绝 agent context, 如果 `context.agentId` 存在就抛出 `EnterPlanMode tool cannot be used in agent contexts`。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:78][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:79]

## 7 call() 走读

`call()` 读取当前 `AppState`, 调用 `handlePlanModeTransition(currentMode, 'plan')`, 然后用 `context.setAppState()` 将 `toolPermissionContext` 更新为 `mode: 'plan'`。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:82][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:83][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:88][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:93] permission context 更新先经过 `prepareContextForPlanMode(...)`, 再通过 `applyPermissionUpdate(..., { type: 'setMode', mode: 'plan', destination: 'session' })` 写入。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:90][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:92]

## 8 渲染

工具定义挂载 `renderToolUseMessage`、`renderToolResultMessage` 和 `renderToolUseRejectedMessage`, 三者都从 `UI.js` 导入。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:16][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:18][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:74][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:76] `mapToolResultToToolResultBlockParam()` 在 interview phase 启用时只允许写 plan file, 否则返回 plan mode 行为说明。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:104][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:107][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:110][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:118]

## 9 设计动机·edge·历史

- channels gate 与 `ExitPlanMode` 的 channels gate 配对; 该配对用于避免进入后无法通过本地 approval dialog 退出的状态[I]。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:61][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:172]
- plan mode 的 `tool_result` 明确禁止写文件, 这与工具自身 `isReadOnly()` true 是两个层面的约束。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:71][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:118]
- interview phase gate 会把写入范围进一步收窄到 plan file。[E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:104][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:107]

## Sources

- `tools/EnterPlanModeTool/EnterPlanModeTool.ts`
- `tools/EnterPlanModeTool/constants.ts`
- `tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [AskUserQuestion](ask-user-question.md)
- [ExitPlanMode](exit-plan-mode.md)
