---
id: tool.cron-delete
path: surface/tools/cron-delete.md
title: CronDelete
kind: tool
tier: T1
status: verified
source: [tools/ScheduleCronTool/CronDeleteTool.ts]
symbols: [CronDeleteTool]
related: [tool.cron-create, tool.cron-list]
updated: 2026-06-14
evidence: explicit
---

`CronDelete` 是按 job id 取消 `CronCreate` 创建的 scheduled cron job 的 deferred 工具。[E: tools/ScheduleCronTool/prompt.ts:65][E: tools/ScheduleCronTool/CronDeleteTool.ts:35][E: tools/ScheduleCronTool/CronDeleteTool.ts:39][E: tools/ScheduleCronTool/CronDeleteTool.ts:82]

## 能回答的问题

- `CronDelete` 如何验证 id 存在?
- teammate 为什么只能删除自己的 cron?
- `CronDelete` 的 durable/session-only 删除差异在哪里表达?

## 1 Identity

- Tool name: `CronDelete`。[E: tools/ScheduleCronTool/prompt.ts:65][E: tools/ScheduleCronTool/CronDeleteTool.ts:36]
- `tools.ts` 在 `feature('AGENT_TRIGGERS')` 时 lazy require cron 三件套。[E: tools.ts:29][E: tools.ts:34]
- `tools.ts` 将 `...cronTools` 放入 base tools。[E: tools.ts:235]
- `searchHint`: `cancel a scheduled cron job`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:37]
- `maxResultSizeChars`: `100_000`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:38]

## 2 用途定位

`CronDelete` 的 prompt 说明它取消先前由 `CronCreate` 安排的 cron job; durable gate 开启时可从 `.claude/scheduled_tasks.json` 或 in-memory session store 删除, durable gate 关闭时只描述 in-memory session store。[E: tools/ScheduleCronTool/prompt.ts:126][E: tools/ScheduleCronTool/prompt.ts:127]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 | 无 | `CronCreate` 返回的 Job ID。[E: tools/ScheduleCronTool/CronDeleteTool.ts:22] |

## 4 输出 & maxResultSizeChars

输出 schema 只有 `id: string`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:29] `mapToolResultToToolResultBlockParam()` 返回 `Cancelled job ${id}.`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:90]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/ScheduleCronTool/CronDeleteTool.ts:39] |
| `isEnabled()` | `isKairosCronEnabled()` | 源码直接调用 cron unified gate。[E: tools/ScheduleCronTool/CronDeleteTool.ts:46][E: tools/ScheduleCronTool/CronDeleteTool.ts:47] |
| `isConcurrencySafe()` | 默认 `false` | 工具未声明该方法, `buildTool` 默认 false。[E: tools/ScheduleCronTool/CronDeleteTool.ts:35][E: Tool.ts:759] |
| `isReadOnly()` | 默认 `false` | 工具未声明该方法, `buildTool` 默认 false; `call()` 调用 `removeCronTasks`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:82][E: tools/ScheduleCronTool/CronDeleteTool.ts:84][E: Tool.ts:760] |
| `getPath()` | cron storage path | 返回 `getCronFilePath()`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:58][E: tools/ScheduleCronTool/CronDeleteTool.ts:59] |

## 6 权限

未看到 `CronDelete` 自定义 `checkPermissions()`[I], 因此使用 `buildTool` 默认 allow。[E: Tool.ts:762][E: Tool.ts:766] `validateInput()` 先 `listAllCronTasks()`, 查不到 id 返回 errorCode 1; teammate context 中如果 task owner 不等于 current agentId, 返回 errorCode 2。[E: tools/ScheduleCronTool/CronDeleteTool.ts:62][E: tools/ScheduleCronTool/CronDeleteTool.ts:63][E: tools/ScheduleCronTool/CronDeleteTool.ts:64][E: tools/ScheduleCronTool/CronDeleteTool.ts:68][E: tools/ScheduleCronTool/CronDeleteTool.ts:72][E: tools/ScheduleCronTool/CronDeleteTool.ts:73][E: tools/ScheduleCronTool/CronDeleteTool.ts:77]

## 7 call() 走读

`call({ id })` 调用 `removeCronTasks([id])`, 然后返回 `{ id }`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:82][E: tools/ScheduleCronTool/CronDeleteTool.ts:83][E: tools/ScheduleCronTool/CronDeleteTool.ts:84] 该工具不自己判断 durable/session-only 存储[I]; 删除细节由 `removeCronTasks` 先扫 session store, 未命中时再读写 durable task file。[E: utils/cronTasks.ts:240][E: utils/cronTasks.ts:244][E: utils/cronTasks.ts:247]

## 8 渲染

工具定义把 `renderToolUseMessage` 指向 `renderDeleteToolUseMessage`, 把 `renderToolResultMessage` 指向 `renderDeleteResultMessage`。[E: tools/ScheduleCronTool/CronDeleteTool.ts:18][E: tools/ScheduleCronTool/CronDeleteTool.ts:93][E: tools/ScheduleCronTool/CronDeleteTool.ts:94]

## 9 设计动机·edge·历史

- teammate ownership check 让 in-process teammate 只能取消自己创建的 cron。[E: tools/ScheduleCronTool/CronDeleteTool.ts:73][E: tools/ScheduleCronTool/CronDeleteTool.ts:77]
- 删除前必须存在 id, 避免静默成功隐藏调度状态漂移。[E: tools/ScheduleCronTool/CronDeleteTool.ts:63][E: tools/ScheduleCronTool/CronDeleteTool.ts:64][E: tools/ScheduleCronTool/CronDeleteTool.ts:68]
- prompt 根据 durable gate 改写用户可见说明, 但 runtime `call()` 始终只以 id 删除。[E: tools/ScheduleCronTool/prompt.ts:125][E: tools/ScheduleCronTool/prompt.ts:127][E: tools/ScheduleCronTool/CronDeleteTool.ts:83]

## Sources

- `tools/ScheduleCronTool/CronDeleteTool.ts`
- `tools/ScheduleCronTool/prompt.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [CronCreate](cron-create.md)
- [CronList](cron-list.md)
