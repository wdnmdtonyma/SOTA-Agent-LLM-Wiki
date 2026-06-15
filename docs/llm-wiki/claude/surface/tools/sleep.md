---
id: tool.sleep
path: surface/tools/sleep.md
title: Sleep
kind: tool
tier: T1
status: verified
source: [tools/SleepTool/]
symbols: [SleepTool]
related: [tool.bash]
updated: 2026-06-14
evidence: unknown
---

`Sleep` 是 feature-gated 的等待工具; 当前源码 dump 只包含 prompt 文件, `tools.ts` 注册处会在 `feature('PROACTIVE') || feature('KAIROS')` 时 require `tools/SleepTool/SleepTool.js`。[E: tools.ts:26][E: tools.ts:27][E: tools/SleepTool/prompt.ts:3][E: tools/SleepTool/prompt.ts:5][U]

## 能回答的问题

- `Sleep` 在 `tools.ts` 中由哪些 feature flag 注册?
- `Sleep` prompt 暴露了哪些使用场景和调度建议?
- 当前 dump 中缺失哪些 runtime implementation 细节?

## 1 Identity

- Tool name: `Sleep`。[E: tools/SleepTool/prompt.ts:3]
- `tools.ts` 在 `feature('PROACTIVE') || feature('KAIROS')` 时 lazy require `SleepTool`。[E: tools.ts:26][E: tools.ts:27]
- `tools.ts` 仅当 `SleepTool` truthy 时放入 base tools。[E: tools.ts:234]
- description constant: `Wait for a specified duration`。[E: tools/SleepTool/prompt.ts:5]
- `searchHint`、aliases、`maxResultSizeChars`、input schema、output schema 在当前 dump 中不可核实。[U]

## 2 用途定位

`SLEEP_TOOL_PROMPT` 说明该工具用于等待一段时间, 用户可随时 interrupt; 适用场景包括用户要求 sleep/rest、没有事情可做、或正在等待某事。[E: tools/SleepTool/prompt.ts:7][E: tools/SleepTool/prompt.ts:9] prompt 还要求收到 periodic `<tick>` prompts 时先寻找有用工作再 sleep。[E: tools/SleepTool/prompt.ts:11]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| 未知 | 未知 | 未知 | 未知 | `tools/SleepTool/SleepTool.ts` 或 `.js` 不在当前 dump 中, 无法核实实际 duration 字段、单位、上限或默认值。[U] |

## 4 输出 & maxResultSizeChars

`Sleep` 的 prompt 只描述等待行为, 未给出 output shape; 当前 dump 没有实现文件, 因此输出 schema、tool result 文案和 `maxResultSizeChars` 都不可核实。[U]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isEnabled()` | 未知 | `SleepTool` 实现文件不在当前 dump 中。[U] |
| `shouldDefer` | 未知 | `SleepTool` 实现文件不在当前 dump 中。[U] |
| `isConcurrencySafe()` | prompt 声称可并发, 实现未知 | prompt 写明可以与其他 tools concurrently 调用且不会干扰; 实际 method 返回值不可核实。[E: tools/SleepTool/prompt.ts:13][U] |
| `isReadOnly()` | 未知 | `SleepTool` 实现文件不在当前 dump 中。[U] |
| `interruptBehavior()` | prompt 声称可 interrupt, 实现未知 | prompt 写明用户可随时 interrupt sleep; 实际 interrupt behavior method 不可核实。[E: tools/SleepTool/prompt.ts:7][U] |

## 6 权限

当前 dump 没有 `SleepTool` 实现文件, 所以 `validateInput()`、`checkPermissions()`、`preparePermissionMatcher()` 是否存在都不可核实。[U] 只能确认 registry 层由 `PROACTIVE` 或 `KAIROS` feature gate 决定是否 require。[E: tools.ts:26][E: tools.ts:27]

## 7 call() 走读

`Sleep` 的 `call()` 逻辑不可核实, 因为 `tools/SleepTool/SleepTool.ts` 或 compiled `.js` 未出现在当前 source tree 中。[U] prompt 明确建议 prefer this over `Bash(sleep ...)`, 因为它不占用 shell process。[E: tools/SleepTool/prompt.ts:15]

## 8 渲染

`Sleep` 的 render methods 不可核实, 因为实现文件缺失。[U]

## 9 设计动机·edge·历史

- prompt 把 `Sleep` 定位为等待时的专用工具, 而不是 shell `sleep`, 以避免持有 shell process。[E: tools/SleepTool/prompt.ts:15]
- prompt 提醒每次 wake-up 都花费一次 API call, 但 prompt cache 会在 5 分钟 inactivity 后过期, 因此等待时间需要平衡。[E: tools/SleepTool/prompt.ts:17]
- implementation absent 的状态应在后续源码补齐后复核, 包括 schema、权限、interrupt behavior、rendering 和 `call()` side effects。[U]

## Sources

- `tools/SleepTool/`
- `tools/SleepTool/prompt.ts`
- `tools.ts`

## 相关

- [Bash](bash.md)
