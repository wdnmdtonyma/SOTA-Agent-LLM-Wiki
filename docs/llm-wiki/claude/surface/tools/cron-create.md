---
id: tool.cron-create
path: surface/tools/cron-create.md
title: CronCreate
kind: tool
tier: T1
status: verified
source: [tools/ScheduleCronTool/CronCreateTool.ts]
symbols: [CronCreateTool]
related: [tool.cron-delete, tool.cron-list]
updated: 2026-06-14
evidence: explicit
---

`CronCreate` 是创建 session-only 或 durable scheduled prompt 的 deferred cron 工具, 输入为 5-field cron expression、prompt、recurring 和 durable。[E: tools/ScheduleCronTool/prompt.ts:64][E: tools/ScheduleCronTool/CronCreateTool.ts:56][E: tools/ScheduleCronTool/CronCreateTool.ts:60][E: tools/ScheduleCronTool/CronCreateTool.ts:29][E: tools/ScheduleCronTool/CronCreateTool.ts:34][E: tools/ScheduleCronTool/CronCreateTool.ts:35][E: tools/ScheduleCronTool/CronCreateTool.ts:39][E: tools/ScheduleCronTool/CronCreateTool.ts:117]

## 能回答的问题

- `CronCreate` 如何校验 cron expression 和任务数量?
- `durable` 与 `recurring` 的默认和运行时 gate 是什么?
- 创建 cron 后如何启动 scheduler?

## 1 Identity

- Tool name: `CronCreate`。[E: tools/ScheduleCronTool/prompt.ts:64][E: tools/ScheduleCronTool/CronCreateTool.ts:57]
- `tools.ts` 在 `feature('AGENT_TRIGGERS')` 时 lazy require cron 三件套。[E: tools.ts:29][E: tools.ts:31][E: tools.ts:32][E: tools.ts:33]
- `tools.ts` 将 `...cronTools` 放入 base tools。[E: tools.ts:235]
- `searchHint`: `schedule a recurring or one-shot prompt`。[E: tools/ScheduleCronTool/CronCreateTool.ts:58]
- `maxResultSizeChars`: `100_000`。[E: tools/ScheduleCronTool/CronCreateTool.ts:59]

## 2 用途定位

`CronCreate` 的 prompt 把该工具用于未来时间 enqueue prompt, 既支持 recurring schedules, 也支持 one-shot reminders; cron 使用用户 local timezone 的标准 5-field 格式。[E: tools/ScheduleCronTool/prompt.ts:87][E: tools/ScheduleCronTool/prompt.ts:89]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `cron` | `string` | 是 | 无 | 标准 5-field cron expression, local time。[E: tools/ScheduleCronTool/CronCreateTool.ts:29][E: tools/ScheduleCronTool/CronCreateTool.ts:33] |
| `prompt` | `string` | 是 | 无 | 每次触发时 enqueue 的 prompt。[E: tools/ScheduleCronTool/CronCreateTool.ts:34] |
| `recurring` | semantic boolean | 否 | `true` in `call()` | true 表示每次 cron match 都触发, false 表示下一次 match 后 auto-delete。[E: tools/ScheduleCronTool/CronCreateTool.ts:35][E: tools/ScheduleCronTool/CronCreateTool.ts:37][E: tools/ScheduleCronTool/CronCreateTool.ts:117] |
| `durable` | semantic boolean | 否 | `false` in `call()` | true 表示写 `.claude/scheduled_tasks.json` 并跨 session 存活; false 表示 memory-only session task。[E: tools/ScheduleCronTool/CronCreateTool.ts:38][E: tools/ScheduleCronTool/CronCreateTool.ts:40][E: tools/ScheduleCronTool/CronCreateTool.ts:117] |

`semanticBoolean` 允许模型误把 `"true"`/`"false"` 作为 string 传入; API schema 仍表现为 boolean 是该 helper 的设计意图[I]。[E: utils/semanticBoolean.ts:26]

## 4 输出 & maxResultSizeChars

输出 schema 包含 `id`、`humanSchedule`、`recurring` 和可选 `durable`。[E: tools/ScheduleCronTool/CronCreateTool.ts:47][E: tools/ScheduleCronTool/CronCreateTool.ts:50] `mapToolResultToToolResultBlockParam()` 对 recurring 与 one-shot 返回不同描述, 并说明 durable 或 session-only 存储位置。[E: tools/ScheduleCronTool/CronCreateTool.ts:150][E: tools/ScheduleCronTool/CronCreateTool.ts:152]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/ScheduleCronTool/CronCreateTool.ts:60] |
| `isEnabled()` | `isKairosCronEnabled()` | `isKairosCronEnabled()` 需要 `feature('AGENT_TRIGGERS')`, 不被 `CLAUDE_CODE_DISABLE_CRON` 关闭, 并通过 `tengu_kairos_cron` gate。[E: tools/ScheduleCronTool/CronCreateTool.ts:68][E: tools/ScheduleCronTool/prompt.ts:37][E: tools/ScheduleCronTool/prompt.ts:44] |
| `isConcurrencySafe()` | 默认 `false` | 工具未声明该方法, `buildTool` 默认 false。[E: tools/ScheduleCronTool/CronCreateTool.ts:56][E: Tool.ts:759] |
| `isReadOnly()` | 默认 `false` | 工具未声明该方法, `buildTool` 默认 false; `call()` 新增 cron task 并启用 scheduler。[E: tools/ScheduleCronTool/CronCreateTool.ts:121][E: tools/ScheduleCronTool/CronCreateTool.ts:133][E: Tool.ts:760] |
| `getPath()` | cron storage path | 返回 `getCronFilePath()`。[E: tools/ScheduleCronTool/CronCreateTool.ts:79][E: tools/ScheduleCronTool/CronCreateTool.ts:80] |

## 6 权限

未看到 `CronCreate` 自定义 `checkPermissions()`[I], 因此使用 `buildTool` 默认 allow; safety 主要由 `validateInput()` 和 feature gates 实现。[E: Tool.ts:762][E: Tool.ts:766] `validateInput()` 拒绝无法 parse 的 cron、未来一年没有 match 的 cron、超过 `MAX_JOBS=50` 的任务数量, 以及 teammate context 中的 durable cron。[E: tools/ScheduleCronTool/CronCreateTool.ts:25][E: tools/ScheduleCronTool/CronCreateTool.ts:83][E: tools/ScheduleCronTool/CronCreateTool.ts:86][E: tools/ScheduleCronTool/CronCreateTool.ts:90][E: tools/ScheduleCronTool/CronCreateTool.ts:93][E: tools/ScheduleCronTool/CronCreateTool.ts:98][E: tools/ScheduleCronTool/CronCreateTool.ts:101][E: tools/ScheduleCronTool/CronCreateTool.ts:107][E: tools/ScheduleCronTool/CronCreateTool.ts:111]

## 7 call() 走读

`call()` 把 `durable && isDurableCronEnabled()` 作为 `effectiveDurable`, 然后调用 `addCronTask(cron, prompt, recurring, effectiveDurable, getTeammateContext()?.agentId)`。[E: tools/ScheduleCronTool/CronCreateTool.ts:117][E: tools/ScheduleCronTool/CronCreateTool.ts:127] 创建后调用 `setScheduledTasksEnabled(true)`, 让 scheduler 在本 session 开始 tick/poll。[E: tools/ScheduleCronTool/CronCreateTool.ts:133] 返回的 `humanSchedule` 由 `cronToHuman(cron)` 生成。[E: tools/ScheduleCronTool/CronCreateTool.ts:137]

## 8 渲染

工具定义把 `renderToolUseMessage` 指向 `renderCreateToolUseMessage`, 把 `renderToolResultMessage` 指向 `renderCreateResultMessage`。[E: tools/ScheduleCronTool/CronCreateTool.ts:23][E: tools/ScheduleCronTool/CronCreateTool.ts:155][E: tools/ScheduleCronTool/CronCreateTool.ts:156]

## 9 设计动机·edge·历史

- prompt 要求用户没有指定精确分钟时避开 `:00` 和 `:30`, 以降低 fleet-wide 同时请求峰值。[E: tools/ScheduleCronTool/prompt.ts:103][E: tools/ScheduleCronTool/prompt.ts:110]
- recurring tasks 会在 `DEFAULT_MAX_AGE_DAYS` 后 auto-expire, tool result 会告知该期限。[E: tools/ScheduleCronTool/prompt.ts:8][E: tools/ScheduleCronTool/CronCreateTool.ts:151]
- durable kill switch 只影响 disk persistence; `call()` 会把 disabled durable request forced 成 session-only, 而 schema 保持可接收 `durable`[I]。[E: tools/ScheduleCronTool/CronCreateTool.ts:38][E: tools/ScheduleCronTool/CronCreateTool.ts:40][E: tools/ScheduleCronTool/CronCreateTool.ts:120]

## Sources

- `tools/ScheduleCronTool/CronCreateTool.ts`
- `tools/ScheduleCronTool/prompt.ts`
- `utils/semanticBoolean.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [CronDelete](cron-delete.md)
- [CronList](cron-list.md)
