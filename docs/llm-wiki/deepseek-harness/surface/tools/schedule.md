---
id: surface.tools.schedule
title: schedule_create / list / delete / update
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/schedule/schedule/src/index.ts
  - packages/schedule/schedule/src/tools.ts
  - packages/schedule/schedule/src/domain.ts
  - packages/schedule/schedule/src/runtime.ts
  - packages/schedule/schedule/src/types.ts
  - packages/schedule/schedule/src/storage.ts
  - packages/schedule/schedule/src/update.ts
  - packages/schedule/schedule/src/invariant.ts
  - packages/schedule/schedule/package.json
  - packages/schedule/schedule/tests/tools.spec.ts
  - packages/schedule/schedule/tests/plugin.spec.ts
  - packages/schedule/schedule/tests/runtime.spec.ts
  - packages/schedule/schedule/tests/domain.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - apps/cli/package.json
  - apps/cli/tests/profiles/web/tests/fixtures/schedule.patch.yml
  - apps/web/tests/schedule-after.e2e.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
symbols:
  - schedule_create
  - schedule_list
  - schedule_delete
  - schedule_update
  - registerScheduleTools
  - ScheduleService
  - MIN_EVERY_INTERVAL_SECONDS
  - MAX_TITLE_LENGTH
  - ScheduleRuntime
  - foldScheduleEvents
  - createAfterScheduleRecord
  - createAtScheduleRecord
  - createEveryScheduleRecord
  - SCHEDULE_CHANGE_VERSION
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - subsys.orchestration.schedule
evidence: explicit
status: verified
updated: 477b4f4205
---

> `schedule_create` / `schedule_list` / `schedule_delete` / `schedule_update` 是 `@deepseek-ai/dsh-schedule` 向 **root** agent 注册的四条 Host-wide 提醒管理工具。任务存在 `storageDomain` 的 `schedule` 表里，到期由 `ScheduleRuntime` 经 `sessionController.resolveAgent` 把 framing 文本 `followup` 进原 Session；不是第三条 tool call，也不是 session-local 日志折叠。

## 能回答的问题

- 四个 wire 名是什么？实现包是不是 `dsh-tool-schedule`？`ScheduleService.inject` 要哪些 seam？
- `schedule_create` 的互斥选择器有哪些？`every` 下限、`title` 上限各是多少？
- 成功值和结构化错误长什么样？缺 `title` 是 schema 失败还是 `invalid_prompt`？
- 落盘是 `schedule/change` 事件还是 Host `tasks` 表？fork / 冷 session 会不会投递？
- 四个 shipped preset 有没有装？`dsh-web-app` 那一行为什么是 `disabled: true`？
- 到期后模型看到的是 user-role reminder 还是 tool result？one-shot 和 recurring 的 commit 差在哪？

## Identity

这是**一页四家**：模型可见名一共四个，由 `registerScheduleTools(rootCtx, toolCtx, agent)` 在同一 `try` 里连续 `defineTool` + `toolCtx.tools.register`。后一个名字注册失败会 rollback 已经挂上的名字。[E: packages/schedule/schedule/src/tools.ts:408] [E: packages/schedule/schedule/src/tools.ts:416] [E: packages/schedule/schedule/src/tools.ts:541]

| wire `name` | 作用 | `presentCall` |
|---|---|---|
| `schedule_create` | 在当前 Session 建一条 Host 任务 | `{ card: 'generic', title: 'Create reminder', kind: 'other', rawInput: prompt }` [E: packages/schedule/schedule/src/tools.ts:417] [E: packages/schedule/schedule/src/tools.ts:448] |
| `schedule_list` | 列出该 Session **active** 提醒 | `{ card: 'generic', title: 'List reminders', kind: 'read' }` [E: packages/schedule/schedule/src/tools.ts:452] [E: packages/schedule/schedule/src/tools.ts:466] |
| `schedule_delete` | 按 id 删除（active 或 inactive） | `{ card: 'generic', title: 'Delete reminder', kind: 'other', rawInput: id }` [E: packages/schedule/schedule/src/tools.ts:469] [E: packages/schedule/schedule/src/tools.ts:489] |
| `schedule_update` | 原地改 title / prompt / 至多一个 timing | `{ card: 'generic', title: 'Update reminder', kind: 'other', rawInput: id }` [E: packages/schedule/schedule/src/tools.ts:493] [E: packages/schedule/schedule/src/tools.ts:539] |

实现包是 `@deepseek-ai/dsh-schedule`，**不是** `dsh-tool-schedule`。CLI 把它写进 `dependencies`，不等于默认装进会话 catalog。[E: packages/schedule/schedule/package.json:2] [E: apps/cli/package.json:56]

工厂是 `TypertRemoteService` 子类 `ScheduleService`（`export default ScheduleService`）：`super(ctx, 'schedule')` 挂 `ctx.schedule`。[E: packages/schedule/schedule/src/index.ts:100] [E: packages/schedule/schedule/src/index.ts:122] [E: packages/schedule/schedule/src/index.ts:462] `static inject = ['agents', 'sessions', 'tools', 'storageDomain', 'sessionController', 'sessionPersistence']`。[E: packages/schedule/schedule/src/index.ts:101] `static Config` 有 `deliveryHistoryDays`（默认 30）和 `deliveryHistoryRecords`（默认 200），**不**改 wire 名、**不**改 `every` 下限。[E: packages/schedule/schedule/src/index.ts:103] [E: packages/schedule/schedule/src/index.ts:87]

constructor 在 `agent/created` 上只给 `ctx.agents.roots()` 调 `registerScheduleTools(ctx, agent.ctx, agent)`。child、已登记过的 agent、以及 `stopping` 窗口一律跳过。无 agent 的 `ctx.tools.get('schedule_create')` 是 `undefined`。[E: packages/schedule/schedule/src/index.ts:170] [E: packages/schedule/schedule/src/index.ts:175] [E: packages/schedule/schedule/src/index.ts:178]

同包 invariant companion `@deepseek-ai/dsh-schedule/invariant`（plugin 名 `schedule-invariant`）只 fold 历史 `schedule/change` 流，**不**再注册第五个模型名。现行任务不靠这条事件流存活。[E: packages/schedule/schedule/src/invariant.ts:14]

## 用途定位

四条工具管的是 **Host 上绑定原 Session 的提醒任务**，不是 OS cron、不是邮件推送。创建必须给非空 `prompt` **和** 非空 `title`（上限 `MAX_TITLE_LENGTH = 120`），再从六个选择器里**恰好挑一个**：`after_seconds`、`at`、`every_seconds`（下限 `MIN_EVERY_INTERVAL_SECONDS = 60`）、`daily`、`weekly`、`cron`。[E: packages/schedule/schedule/src/domain.ts:37] [E: packages/schedule/schedule/src/domain.ts:40] [E: packages/schedule/schedule/src/tools.ts:169] [E: packages/schedule/schedule/src/tools.ts:249]

view 把 `deliveryMode` 写成常量 `'host'`：到期投递走 `sessionController.resolveAgent` 唤醒原 Session，而不是「只有 live root 在跑才 tick」。进程关掉后任务仍在 `storageDomain`；下次 Host 起来 `ScheduleRuntime.requestDrive` 会扫 overdue。[E: packages/schedule/schedule/src/domain.ts:1854] [E: packages/schedule/schedule/src/index.ts:164] [E: packages/schedule/schedule/src/runtime.ts:101]

`every` / `daily` / `weekly` / `cron` 在 downtime 之后只交**最新**一次漏掉的 occurrence，不补中间各档。一次 drive 把同一 Session 上到期的 recurring 合成 `[SCHEDULE REMINDER BATCH]`。[E: packages/schedule/schedule/src/tools.ts:173] [E: packages/schedule/schedule/src/runtime.ts:114]

历史 session 日志里的 `schedule/change` **不再**填充 Host 任务。`session/created` 若 fold 出 active 遗留，只 `logger.warn` 让模型用 `schedule_create` 重建。[E: packages/schedule/schedule/src/index.ts:192] [E: packages/schedule/schedule/src/index.ts:203]

## 输入 schema

插件 Config 不改模型字段。`parameterSchemaSpecToJsonSchema` 编出来的是隐式开放 object；「恰好一个选择器」是 `validateCreateArgs` / `validateUpdateArgs` 在 execute 里做的。[E: packages/schedule/schedule/src/tools.ts:222] [E: packages/schedule/schedule/src/tools.ts:269]

### `schedule_create`

| 字段 | 类型 | 必填 | 约束 | 说明 |
|---|---|---:|---|---|
| `prompt` | `string` | 是 | execute 再 `trim()` 非空 | 到期展示给用户的正文。[E: packages/schedule/schedule/src/tools.ts:420] |
| `title` | `string` | 是 | schema 要 string；execute 再 trim 非空且 `<= 120` | 任务卡 / list 显示名。缺字段是 registry `INVALID_ARGS`（`isError`）；空白 / 超长是成功值 `invalid_prompt`。[E: packages/schedule/schedule/src/tools.ts:425] [E: packages/schedule/schedule/tests/tools.spec.ts:100] [E: packages/schedule/schedule/tests/tools.spec.ts:111] |
| `after_seconds` | `number` | 否 | 六选一；正 safe integer | 相对 `Date.now()` 的秒延迟。[E: packages/schedule/schedule/src/tools.ts:430] |
| `every_seconds` | `number` | 否 | 六选一；`>= 60` | 固定间隔。`< 60` → `frequency_too_high`。[E: packages/schedule/schedule/src/tools.ts:342] [E: packages/schedule/schedule/src/tools.ts:212] |
| `at` | `string` 或 object | 否 | 六选一。string = 带 offset 的 RFC 3339；object 恰好 `date` / `time` / `time_zone` | [E: packages/schedule/schedule/src/tools.ts:384] |
| `daily` | object | 否 | 六选一；`time` + `time_zone` | 每天本地时刻。[E: packages/schedule/schedule/src/tools.ts:346] |
| `weekly` | object | 否 | 六选一；另加 `weekdays`（ISO 1–7，不重复） | [E: packages/schedule/schedule/src/tools.ts:355] |
| `cron` | object | 否 | 六选一；五段 Vixie + `time_zone` | [E: packages/schedule/schedule/src/tools.ts:370] |

`time_zone` 必须是字面 `UTC` 或 IANA `Area/Location`。本地墙钟落在 DST gap 会跳过该 occurrence；overlap 取较早 instant。[E: packages/schedule/schedule/src/tools.ts:172]

### `schedule_list`

`parameters: {}`。没有过滤 / 分页。[E: packages/schedule/schedule/src/tools.ts:454]

### `schedule_delete`

| 字段 | 类型 | 必填 | 约束 |
|---|---|---:|---|
| `id` | `string` | 是 | 非空且两侧无空白，否则 `invalid_rule`。[E: packages/schedule/schedule/src/tools.ts:473] [E: packages/schedule/schedule/src/tools.ts:477] |

### `schedule_update`

| 字段 | 类型 | 必填 | 约束 |
|---|---|---:|---|
| `id` | `string` | 是 | 抄 list 返回的 id。[E: packages/schedule/schedule/src/tools.ts:496] |
| `title` / `prompt` | `string` | 否 | 与至多一个 timing 选择器一起；全空 → `invalid_selector`。不能改 `after_seconds`（相对延迟要新建）。[E: packages/schedule/schedule/src/tools.ts:180] [E: packages/schedule/schedule/src/tools.ts:303] |
| `at` / `every_seconds` / `daily` / `weekly` / `cron` | 同 create | 否 | **至多一个**；`after_seconds` 不在 update 选择器里。[E: packages/schedule/schedule/src/tools.ts:297] |

四个 shipped preset 都不挂本插件，因此也没有 yml 层改名 / 改参。

## 输出 & 截断 / spill

四条工具都把规范值 `JSON.stringify` 成单段 `text`。没有 `presentationMeta`，没有自己的 spill。[E: packages/schedule/schedule/src/tools.ts:185]

**结构化失败是成功值。** `invalid_prompt` 一类走 `output.schema` 的 `oneOf`，`isError === false`。缺必填 `title` 过不了 schema，才是 `isError`。[E: packages/schedule/schedule/src/tools.ts:119] [E: packages/schedule/schedule/tests/tools.spec.ts:100] [E: packages/schedule/schedule/tests/tools.spec.ts:111]

`scheduleView` 在 durable 记录上加 `state`（`scheduled` / `overdue`）和 `deliveryMode: 'host'`。`kind` 可以是 `after` / `at` / `every` / `daily` / `weekly` / `cron`。id 形如 `schedule-${randomUUID()}`，创建后不复用。[E: packages/schedule/schedule/src/domain.ts:1850] [E: packages/schedule/schedule/src/index.ts:256]

`schedule_delete`：`{ id, deleted: true }` 或 `{ id, deleted: false, code: 'schedule_not_found' }`。[E: packages/schedule/schedule/src/tools.ts:126]

`schedule_update` 失败码还包括 `schedule_ended`（catalog 里仍有但已 inactive）和 `schedule_conflict`。[E: packages/schedule/schedule/src/tools.ts:149] [E: packages/schedule/schedule/src/tools.ts:523]

工具层错误码现为 `invalid_prompt` / `invalid_selector` / `invalid_rule` / `invalid_time_zone` / `not_future` / `time_out_of_range` / `frequency_too_high` / `internal_error`。**没有** `persistence_uncertain` / `corrupt_schedule_log`：写路径改走 `ctx.schedule.create` 的 storage 队列。[E: packages/schedule/schedule/src/tools.ts:108]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `ctx.schedule` / `ScheduleService`。协议常量 `SCHEDULE_CHANGE_VERSION = 1` 仍给历史事件 decoder 用。[E: packages/schedule/schedule/src/index.ts:68] [E: packages/schedule/schedule/src/domain.ts:34] |
| Provider | `ctx.storageDomain.open(scheduleDomain)`，表名 `tasks`。[E: packages/schedule/schedule/src/storage.ts:57] [E: packages/schedule/schedule/src/index.ts:126] |
| Consumer | `registerScheduleTools`（管理面）和 `ScheduleRuntime`（投递面）。 |

换掉 storage 会带走：任务是否跨进程存活、delivery history 窗口。不会带走：四个 wire 名、选择器形状、`MIN_EVERY_INTERVAL_SECONDS = 60`、`deliveryMode: 'host'`。

消费的 `ctx.*`：

- `ctx.agents`：`agent/created` / `roots()` / `withoutInitiator`。[E: packages/schedule/schedule/src/index.ts:178] [E: packages/schedule/schedule/src/runtime.ts:51]
- `ctx.sessionController.resolveAgent`：到期时恢复原 Session。[E: packages/schedule/schedule/src/runtime.ts:101]
- `ctx.sessions.flush`：投递后确认 inbox 落盘。[E: packages/schedule/schedule/src/runtime.ts:124]
- `agent.followup`：`source: { kind: 'schedule' }`。[E: packages/schedule/schedule/src/runtime.ts:120] [E: packages/schedule/schedule/src/runtime.ts:123]

不消费 `ctx.fs` / `ctx.shell` / `ctx.approval` / `ctx.sandboxPolicy`。

## 执行管线

模型发出 `schedule_*` 之后走 registry：`tools/pre-execute` → monotonic guard → `tools/execute` → body → `tools/post-execute`。[E: packages/core/tools/src/index.ts:1506] [E: packages/core/tools/src/index.ts:1606] [E: packages/core/tools/src/index.ts:1783]

- **pre-execute / approval / sandbox：** Schedule 不注册 listener，也不 `ask`。
- **调度：** 四个 `defineTool` 都没声明 `isConcurrencySafe` → exclusive。[E: packages/core/tools/src/index.ts:1305]
- **包内 FIFO：** `ScheduleService.serialize` 串行化 create / update / delete / runtime drive。[E: packages/schedule/schedule/src/index.ts:456]
- **checkpoint：** 顶层调用仍撞 `session-checkpoint-policy` 的 `flush`。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
- **timeout：** 未声明 `timeoutMs`，`timeout-policy` 直接 `next()`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **PTC：** 非嵌套且 `mode: ptc` 时除 `run_code` 外 collapse。[E: packages/core/tools/src/index.ts:1352]

到期投递**不**经过 tool 管线。`ScheduleRuntime.drive` 在 Host timer 里 `followup` + 改 `tasks` 行。

## Preset 装配

成员资格只认 `packages/bundle/web-app/presets/{standard,ptc,minimal,cordis}.patch.yml`。四个文件都没有 `id: schedule` / `@deepseek-ai/dsh-schedule`。

| preset | 装 `@deepseek-ai/dsh-schedule`？ | 反证 |
|---|---|---|
| `minimal` | **否** | 只有 complete persona + persistent-shell。[E: packages/bundle/web-app/presets/minimal.patch.yml:15] [E: packages/bundle/web-app/presets/minimal.patch.yml:17] |
| `standard` | **否** | 末条是 `present` 然后 `tool-plugin-manager` `disabled: true`。[E: packages/bundle/web-app/presets/standard.patch.yml:142] [E: packages/bundle/web-app/presets/standard.patch.yml:146] |
| `ptc` | **否** | 相对 standard 有 `tool-presentation` `mode: ptc`，同样没有 schedule 行。[E: packages/bundle/web-app/presets/ptc.patch.yml:147] |
| `cordis` | **否** | 增量是 `tool-cordis` + `customSkillDirs`。[E: packages/bundle/web-app/presets/cordis.patch.yml:141] |

`dsh-web-app` **已经 insert** host 行 `id: schedule`，但出厂 `disabled: true`；旁边 `time-context` 与 `ui-schedule` 同样关掉。[E: packages/bundle/web-app/cordis.patch.yml:125] [E: packages/bundle/web-app/cordis.patch.yml:127] [E: packages/bundle/web-app/cordis.patch.yml:123] [E: packages/bundle/web-app/cordis.patch.yml:372] 产品默认 Web catalog 因此不含 `schedule_*`。

opt-in：把 host 行 `disabled: false`（测试夹具 `apps/cli/tests/profiles/web/tests/fixtures/schedule.patch.yml`），或用户 profile / `--patch`。Web e2e 在打开 overlay 后断言请求里出现 `schedule_create`。[E: apps/cli/tests/profiles/web/tests/fixtures/schedule.patch.yml:1] [E: apps/web/tests/schedule-after.e2e.ts:645]

旧 example `apps/cli/config/examples/schedule/cordis.yml` **已删除**。

## execute() 走读

1. **认主。** `exec.agent !== agent` → `{ code: 'internal_error' }`。[E: packages/schedule/schedule/src/tools.ts:438]
2. **形状。** create 走 `validateCreateArgs`（含 title / 六选一）；update 走 `validateUpdateArgs`；delete 先拒空 id。
3. **取消。** `exec.signal.aborted` 时返回 `internal_error` 占位，registry 收成 `ABORTED`。[E: packages/schedule/schedule/src/tools.ts:441]
4. **`schedule_create`：** `rootCtx.schedule.create(agent.session.id, args, exec.signal)` → `scheduleView`。id 在服务里 `schedule-${randomUUID()}`，clock 在入队前采样。[E: packages/schedule/schedule/src/tools.ts:443] [E: packages/schedule/schedule/src/index.ts:249]
5. **`schedule_list`：** `rootCtx.schedule.list({ sessionId })` 再 map `scheduleView`。空 list 是 `[]`。[E: packages/schedule/schedule/src/tools.ts:460]
6. **`schedule_delete`：** `rootCtx.schedule.delete({ sessionId, id }, signal)`。描述写明不收回已经 queued 的 reminder 消息。[E: packages/schedule/schedule/src/tools.ts:484] [E: packages/schedule/schedule/src/tools.ts:178]
7. **`schedule_update`：** 先 list 找 expected；没有则查 catalog 区分 `schedule_ended` / `schedule_not_found`；再 `schedule.update({ expected, change?, title?, prompt? })`。[E: packages/schedule/schedule/src/tools.ts:516]
8. **投递。** `requestDrive` → `drive`：筛 active 且 `scheduledAt <= now`；`resolveAgent`；one-shot 用 `renderReminderFraming`，recurring 用 batch framing；`followup` → `flush` → `commit`（one-shot 变 `inactive`，recurring 推下一档或结束）。[E: packages/schedule/schedule/src/runtime.ts:90] [E: packages/schedule/schedule/src/runtime.ts:123] [E: packages/schedule/schedule/src/runtime.ts:128]

## 设计动机·edge

- **Host 任务，不是 session 事件源。** 管理值在 `tasks` 表；`schedule/change` 只服务旧日志 invariant / 警告。
- **`title` 是必填产品字段。** 不再从 prompt 推导。缺字段 = schema 错；空白 / 超长 = `invalid_prompt`。
- **`every` 下限 60 秒。** 旧文案里的 300 已过时。[E: packages/schedule/schedule/src/domain.ts:37]
- **日历选择器是一等公民。** `daily` / `weekly` / `cron` 与 `at` / `every` 互斥。`schedule_update` 不能改 `after_seconds`。
- **投递可跨冷 Session。** `deliveryMode: 'host'`；runtime 用 `sessionController` 恢复 agent。archive 时 armed 行会拒绝归档，stop 会删这些行。[E: packages/schedule/schedule/src/index.ts:216] [E: packages/schedule/schedule/tests/plugin.spec.ts:63]
- **不是 shipped 默认。** web-app 行在、但 `disabled: true`。四个 preset 都不 remount。
- **PTC 下直连只能叫 `run_code`。** 这四个名字要从 SDK 子分发里调。

## Sources

- packages/schedule/schedule/src/index.ts
- packages/schedule/schedule/src/tools.ts
- packages/schedule/schedule/src/domain.ts
- packages/schedule/schedule/src/runtime.ts
- packages/schedule/schedule/src/types.ts
- packages/schedule/schedule/src/storage.ts
- packages/schedule/schedule/src/update.ts
- packages/schedule/schedule/src/invariant.ts
- packages/schedule/schedule/package.json
- packages/schedule/schedule/tests/tools.spec.ts
- packages/schedule/schedule/tests/plugin.spec.ts
- packages/schedule/schedule/tests/runtime.spec.ts
- packages/schedule/schedule/tests/domain.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- apps/cli/package.json
- apps/cli/tests/profiles/web/tests/fixtures/schedule.patch.yml
- apps/web/tests/schedule-after.e2e.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/guard/timeout-policy/src/index.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute`；到期 `followup` 不走这条
- [工具 catalog](../../reference/tools-catalog.md) — `schedule_*` 是 opt-in（web-app 行默认 disabled），不是 shipped preset 默认行
- [schedule 子系统](../../subsystems/orchestration/schedule.md) — Host `tasks` 表、runtime 定时器、delivery history
