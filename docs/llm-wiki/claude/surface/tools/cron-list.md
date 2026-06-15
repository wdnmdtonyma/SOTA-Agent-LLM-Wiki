---
id: tool.cron-list
path: surface/tools/cron-list.md
title: CronList
kind: tool
tier: T1
status: verified
source: [tools/ScheduleCronTool/CronListTool.ts]
symbols: [CronListTool]
related: [tool.cron-create, tool.cron-delete]
updated: 2026-06-14
evidence: explicit
---

`CronList` 是列出 active cron jobs 的 deferred、read-only、concurrency-safe 工具, 并在 teammate context 中只显示当前 teammate 自己的 crons。[E: tools/ScheduleCronTool/prompt.ts:66][E: tools/ScheduleCronTool/CronListTool.ts:37][E: tools/ScheduleCronTool/CronListTool.ts:41][E: tools/ScheduleCronTool/CronListTool.ts:51][E: tools/ScheduleCronTool/CronListTool.ts:54][E: tools/ScheduleCronTool/CronListTool.ts:68]

## 能回答的问题

- `CronList` 的输入为什么为空?
- `CronList` 如何格式化 job 列表给模型?
- teammate 和 team lead 看到的 cron 范围有什么差异?

## 1 Identity

- Tool name: `CronList`。[E: tools/ScheduleCronTool/prompt.ts:66][E: tools/ScheduleCronTool/CronListTool.ts:38]
- `tools.ts` 在 `feature('AGENT_TRIGGERS')` 时 lazy require cron 三件套。[E: tools.ts:29][E: tools.ts:31][E: tools.ts:32][E: tools.ts:33][E: tools.ts:34]
- `tools.ts` 将 `...cronTools` 放入 base tools。[E: tools.ts:235]
- `searchHint`: `list active cron jobs`。[E: tools/ScheduleCronTool/CronListTool.ts:39]
- `maxResultSizeChars`: `100_000`。[E: tools/ScheduleCronTool/CronListTool.ts:40]

## 2 用途定位

`CronList` 的 prompt 说明它列出由 `CronCreate` 创建的 cron jobs; durable gate 开启时包括 durable 与 session-only, gate 关闭时只描述当前 session jobs。[E: tools/ScheduleCronTool/prompt.ts:131][E: tools/ScheduleCronTool/prompt.ts:133][E: tools/ScheduleCronTool/prompt.ts:134]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| 无 | `strictObject({})` | 不适用 | 不适用 | 工具不接收参数。[E: tools/ScheduleCronTool/CronListTool.ts:17] |

## 4 输出 & maxResultSizeChars

输出 schema 是 `{ jobs: Job[] }`, 每个 job 包含 `id`、`cron`、`humanSchedule`、`prompt`、可选 `recurring` 和可选 `durable`。[E: tools/ScheduleCronTool/CronListTool.ts:22][E: tools/ScheduleCronTool/CronListTool.ts:24][E: tools/ScheduleCronTool/CronListTool.ts:25][E: tools/ScheduleCronTool/CronListTool.ts:26][E: tools/ScheduleCronTool/CronListTool.ts:27][E: tools/ScheduleCronTool/CronListTool.ts:28][E: tools/ScheduleCronTool/CronListTool.ts:29] `mapToolResultToToolResultBlockParam()` 有 jobs 时逐行输出 id、human schedule、one-shot/recurring、session-only marker 和截断到 80 字符的 prompt; 没有 jobs 时返回 `No scheduled jobs.`。[E: tools/ScheduleCronTool/CronListTool.ts:85][E: tools/ScheduleCronTool/CronListTool.ts:89][E: tools/ScheduleCronTool/CronListTool.ts:92]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/ScheduleCronTool/CronListTool.ts:41] |
| `isEnabled()` | `isKairosCronEnabled()` | 源码直接调用 cron unified gate。[E: tools/ScheduleCronTool/CronListTool.ts:48][E: tools/ScheduleCronTool/CronListTool.ts:49] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/ScheduleCronTool/CronListTool.ts:51][E: tools/ScheduleCronTool/CronListTool.ts:52] |
| `isReadOnly()` | `true` | 源码直接返回 true。[E: tools/ScheduleCronTool/CronListTool.ts:54][E: tools/ScheduleCronTool/CronListTool.ts:55] |
| `checkPermissions()` | 默认 allow | 未看到工具自定义该方法[I]; `buildTool` 默认 allow。[E: Tool.ts:762][E: Tool.ts:766] |

## 6 权限

未看到 `CronList` 自定义 `validateInput()` 或 `checkPermissions()`[I]; 空 schema 约束输入, permission 使用 `buildTool` 默认 allow。[E: tools/ScheduleCronTool/CronListTool.ts:17][E: Tool.ts:762][E: Tool.ts:766]

## 7 call() 走读

`call()` 先 `listAllCronTasks()`, 再读取 `getTeammateContext()`。[E: tools/ScheduleCronTool/CronListTool.ts:64][E: tools/ScheduleCronTool/CronListTool.ts:66] 如果存在 teammate ctx, 只保留 `t.agentId === ctx.agentId` 的 tasks; 没有 ctx 的 team lead/main thread 看到全部 tasks。[E: tools/ScheduleCronTool/CronListTool.ts:68][E: tools/ScheduleCronTool/CronListTool.ts:69] 输出 jobs 会把 `cronToHuman(t.cron)` 写入 humanSchedule, 只在 `t.recurring` 为真时输出 `recurring: true`, 只在 `t.durable === false` 时输出 `durable: false`。[E: tools/ScheduleCronTool/CronListTool.ts:73][E: tools/ScheduleCronTool/CronListTool.ts:75][E: tools/ScheduleCronTool/CronListTool.ts:76][E: tools/ScheduleCronTool/CronListTool.ts:78]

## 8 渲染

工具定义把 `renderToolUseMessage` 指向 `renderListToolUseMessage`, 把 `renderToolResultMessage` 指向 `renderListResultMessage`。[E: tools/ScheduleCronTool/CronListTool.ts:15][E: tools/ScheduleCronTool/CronListTool.ts:95][E: tools/ScheduleCronTool/CronListTool.ts:96]

## 9 设计动机·edge·历史

- teammate filter 与 `CronCreate` 的 `agentId` 写入配套, 让 teammate 创建的 crons 可按 agent ownership 隔离。[E: tools/ScheduleCronTool/CronCreateTool.ts:126][E: tools/ScheduleCronTool/CronListTool.ts:68]
- `durable` 只在 false 时显式输出, 因此缺省值在结果中表示 durable true 或 legacy task shape。[E: tools/ScheduleCronTool/CronListTool.ts:76]
- 模型侧列表对 prompt 使用 `truncate(j.prompt, 80, true)`, 避免长 prompt 淹没结果。[E: tools/ScheduleCronTool/CronListTool.ts:89]

## Sources

- `tools/ScheduleCronTool/CronListTool.ts`
- `tools/ScheduleCronTool/CronCreateTool.ts`
- `tools/ScheduleCronTool/prompt.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [CronCreate](cron-create.md)
- [CronDelete](cron-delete.md)
