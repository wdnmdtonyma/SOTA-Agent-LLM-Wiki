---
id: tool.exit-plan-mode
path: surface/tools/exit-plan-mode.md
title: ExitPlanMode
kind: tool
tier: T1
status: verified
source: [tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts]
symbols: [ExitPlanModeV2Tool]
related: [tool.enter-plan-mode, tool.agent, tool.team-create]
updated: 2026-06-14
evidence: explicit
---

`ExitPlanModeV2Tool` 的模型可见名称是 `ExitPlanMode`; 它把 plan mode 的方案提交给用户或 team lead 审批, 并在通过后恢复 permission mode。[E: tools/ExitPlanModeTool/constants.ts:2][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:147][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:234][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:287][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:357][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:399]

## 能回答的问题

- `ExitPlanMode` 为什么 `isReadOnly()` 是 false?
- `ExitPlanMode` 如何验证当前确实在 plan mode?
- teammate 与普通主线程退出 plan mode 的审批路径有什么不同?

## 1 Identity

- Tool name: `ExitPlanMode`。[E: tools/ExitPlanModeTool/constants.ts:2][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:148]
- `tools.ts` 在 base tools 中注册 `ExitPlanModeV2Tool`。[E: tools.ts:202]
- `searchHint`: `present plan for approval and start coding (plan mode only)`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:149]
- `maxResultSizeChars`: `100_000`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:150]
- description: `Prompts the user to exit plan mode and start coding`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:151][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:152]

## 2 用途定位

`ExitPlanMode` 只用于 plan mode 结束点: 它校验主线程当前 mode, 可能把 edited plan 写回 plan file, 然后 either 向用户展示 approval dialog, 或在 teammate required-plan 场景向 team lead mailbox 发送 approval request。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:195][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:205][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:258][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:287]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `allowedPrompts` | `{ tool: 'Bash'; prompt: string }[]` | 否 | `undefined` | plan 请求的 semantic permission prompts。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:81][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:86] |
| `allowedPrompts[].tool` | enum `'Bash'` | 是 | 无 | prompt permission 当前只允许指向 Bash。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:64][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:66] |
| `allowedPrompts[].prompt` | `string` | 是 | 无 | 语义动作描述, 例如 run tests 或 install dependencies。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:67][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:71] |
| `plan` | `string` | SDK/hooks normalized only | 从 disk 注入 | `_sdkInputSchema` 扩展字段, 内部 schema 不直接要求。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:97][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:102] |
| `planFilePath` | `string` | SDK/hooks normalized only | 从 disk 注入 | `_sdkInputSchema` 扩展字段, 表示 plan file path。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:103][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:106] |

## 4 输出 & maxResultSizeChars

输出 schema 包含 nullable `plan`、`isAgent`、可选 `filePath`、`hasTaskTool`、`planWasEdited`、`awaitingLeaderApproval` 和 `requestId`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:112][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:140] `mapToolResultToToolResultBlockParam()` 对 teammate awaiting approval、agent approval、empty plan 和普通 approved plan 分别返回不同 `tool_result.content`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:432][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:447][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:452][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:456][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:462][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:465][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:481][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:489]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:166] |
| `isEnabled()` | channels 场景可禁用 | 当 `KAIROS` 或 `KAIROS_CHANNELS` feature 开启且 `getAllowedChannels().length > 0` 时返回 `false`, 否则返回 `true`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:172][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:177] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:179][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:180] |
| `isReadOnly()` | `false` | 源码直接返回 false, 运行路径会写 plan file 和修改 AppState。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:183][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:259][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:357] |
| `requiresUserInteraction()` | teammate false, 非 teammate true | teammate 直接返回 false; 非 teammate 返回 true。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:189][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:190][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:193] |
| `checkPermissions()` | teammate allow, 非 teammate ask | teammate 返回 allow; 非 teammate 返回 `behavior: 'ask'` 和 `message: 'Exit plan mode?'`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:226][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:230][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:234][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:237] |

## 6 权限

`validateInput()` 对 teammate 直接通过; 对非 teammate, 读取 `getAppState().toolPermissionContext.mode`, 只有 `mode === 'plan'` 才允许继续。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:198][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:199][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:204][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:205][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:219] 非 plan mode 时返回 errorCode 1, message 明确说该工具只用于写完 plan 后退出 plan mode。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:213][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:216]

## 7 call() 走读

`call()` 先计算 `isAgent`, 读取 `getPlanFilePath(context.agentId)`, 并把 `input.plan` 作为 edited plan; 没有 edited plan 时 fallback 到 `getPlan(context.agentId)`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:244][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:246][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:251][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:253] 存在 edited plan 且有 file path 时, 工具写回 plan file 并触发 remote snapshot 持久化。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:259][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:260]

required-plan teammate 分支要求 plan 存在, 生成 `plan_approval` request id, 写入 `team-lead` mailbox, 并在 in-process teammate task 上设置 awaiting approval。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:264][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:269][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:273][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:276][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:287][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:295][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:299][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:301] 普通分支通过 `context.setAppState()` 把 `toolPermissionContext.mode` 从 plan 恢复到 `prePlanMode ?? 'default'`, 并清掉 `prePlanMode`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:357][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:361][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:399][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:400] 当 agent swarms 启用且当前 tools 包含 Agent tool 时, 输出会设置 `hasTaskTool`。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:405][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:407][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:414]

## 8 渲染

工具定义挂载 `renderToolUseMessage`、`renderToolResultMessage` 和 `renderToolUseRejectedMessage`, 都从 `UI.js` 导入。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:46][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:48][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:240][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:242] `tool_result` 对普通 approved plan 会包含保存路径、可选 team hint 和 approved plan 内容。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:470][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:472][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:485][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:489]

## 9 设计动机·edge·历史

- `ExitPlanMode` 的 channels gate 与 `EnterPlanMode` 对称, 两者都在 allowed channels 非空时禁用。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:171][E: tools/EnterPlanModeTool/EnterPlanModeTool.ts:60]
- auto mode restore 有 gate-off fallback: 当 `prePlanMode` 是 `auto` 但 gate 已关闭时, 恢复到 `default` 并发送 notification。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:328][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:339][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:347][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:354][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:367]
- teammate required-plan 分支返回 `awaitingLeaderApproval: true`; 该分支在本地 plan-mode restore 逻辑之前 return, 因此不走普通退出路径[I]。[E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:304][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:309][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:312][E: tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts:357]

## Sources

- `tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts`
- `tools/ExitPlanModeTool/constants.ts`
- `tools/EnterPlanModeTool/EnterPlanModeTool.ts`
- `tools.ts`

## 相关

- [EnterPlanMode](enter-plan-mode.md)
- [Agent](agent.md)
