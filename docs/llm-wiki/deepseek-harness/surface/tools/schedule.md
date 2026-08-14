---
id: surface.tools.schedule
title: schedule_create / list / delete
kind: tool
tier: T1
pkg: orchestration
source:
  - packages/schedule/schedule/src/index.ts
  - packages/schedule/schedule/src/tools.ts
  - packages/schedule/schedule/src/domain.ts
  - packages/schedule/schedule/src/runtime.ts
  - packages/schedule/schedule/src/types.ts
  - packages/schedule/schedule/src/persistence.ts
  - packages/schedule/schedule/src/transaction.ts
  - packages/schedule/schedule/src/invariant.ts
  - packages/schedule/schedule/package.json
  - packages/schedule/schedule/tests/tools.spec.ts
  - packages/schedule/schedule/tests/plugin.spec.ts
  - packages/schedule/schedule/tests/runtime.spec.ts
  - packages/schedule/schedule/tests/jsonl-restart.spec.ts
  - examples/web-schedule/cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/package.json
  - apps/web/tests/schedule-after.e2e.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/agent/src/index.ts
  - packages/core/session/src/index.ts
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
symbols:
  - schedule_create
  - schedule_list
  - schedule_delete
  - registerScheduleTools
  - apply
  - name
  - inject
  - MIN_EVERY_INTERVAL_SECONDS
  - ScheduleRuntime
  - foldScheduleEvents
  - allocateScheduleId
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
updated: 47f943859b
---

> `schedule_create` / `schedule_list` / `schedule_delete` 是 `@deepseek-ai/dsh-schedule` 向 **root** agent 注册的三条 session-local 提醒管理工具：模型用互斥选择器创建一条提醒、按创建顺序列出、按 id 删除；到期后由同包 `ScheduleRuntime` 把 framing 文本 `followup` 进同一会话，而不是再走一条 tool call。

## 能回答的问题

- 三个 wire 名是什么？实现包是不是 `dsh-tool-schedule`？`inject` 要哪些 seam？谁在 `agent/created` 上注册？
- `schedule_create` 的三种互斥形状 `after_seconds` / `at` / `every_seconds` 各接受什么？`every` 的下限是多少？
- 成功值和结构化错误长什么样？会不会 spill？`isError` 什么时候才为 true？
- 落盘事件叫什么、有哪些 `operation`？fork 会不会继承父会话的提醒？
- 四个 shipped preset 有没有装这条能力？它出现在哪类 composition？
- 到期后模型看到的是普通 user message 还是专用 reminder 卡片？one-shot 和 fixed-rate 的 dispatch 差在哪？

## Identity

这是**一页三家**：模型可见的名字一共三个，全部由 `registerScheduleTools` 在同一 `try` 里连续 `defineTool` + `toolCtx.tools.register`。后一个名字注册失败会把已经挂上的名字 rollback。[E: packages/schedule/schedule/src/tools.ts:318][E: packages/schedule/schedule/src/tools.ts:400][E: packages/schedule/schedule/src/tools.ts:420][E: packages/schedule/schedule/src/tools.ts:457]

| wire `name` | 作用 | `presentCall` 卡片 |
|---|---|---|
| `schedule_create` | 在当前 session 创建一条提醒 | `{ card: 'generic', title: 'Create reminder', kind: 'other', rawInput: prompt }` [E: packages/schedule/schedule/src/tools.ts:396] |
| `schedule_list` | 按创建顺序列出全部 **active** 提醒 | `{ card: 'generic', title: 'List reminders', kind: 'read' }` [E: packages/schedule/schedule/src/tools.ts:416] |
| `schedule_delete` | 按 `schedule_create` / `schedule_list` 返回的精确 id 删除 | `{ card: 'generic', title: 'Delete reminder', kind: 'other', rawInput: id }` [E: packages/schedule/schedule/src/tools.ts:454] |

实现包是 `@deepseek-ai/dsh-schedule`，**不是** `dsh-tool-schedule`。仓库里没有 `@deepseek-ai/dsh-tool-schedule` 这个 package；CLI 把 schedule 包当作可解析依赖挂上，不等于默认装进会话。[E: packages/schedule/schedule/package.json:2][E: apps/cli/package.json:68]

Cordis function-plugin 名是字面量 `'schedule'`。`inject = ['agents', 'sessions', 'tools', 'sessionPersistence']`：四个服务缺一，插件保持 pending，catalog 里不会出现这三条名字。插件**没有** `Config` / schemastery，yml 不能改名、不能关某一个名字、不能改 `every` 下限。[E: packages/schedule/schedule/src/index.ts:33][E: packages/schedule/schedule/src/index.ts:35][E: packages/schedule/schedule/tests/plugin.spec.ts:33][E: packages/schedule/schedule/tests/plugin.spec.ts:34]

`apply(ctx)` 在全局 `ctx` 上 `ctx.on('agent/created')`。listener 只给 **未来的 root** 装 runtime：已经在跑的 agent、非 `ctx.agents.roots()` 的 child、以及插件正在拆的窗口，一律跳过。注册发生在 `agent.ctx`（scope-local 层），所以无 agent 的 `ctx.tools.get('schedule_create')` 是 `undefined`。[E: packages/schedule/schedule/src/index.ts:40][E: packages/schedule/schedule/src/index.ts:46][E: packages/schedule/schedule/src/index.ts:49][E: packages/schedule/schedule/tests/plugin.spec.ts:43][E: packages/schedule/schedule/tests/plugin.spec.ts:47][E: packages/schedule/schedule/tests/plugin.spec.ts:50][E: packages/core/agent/src/index.ts:613]

child agent 即使在已装 Schedule 的 root 底下 `create`，也拿不到这三条工具。[E: packages/schedule/schedule/tests/plugin.spec.ts:67]

同包另有 invariant companion `@deepseek-ai/dsh-schedule/invariant`（plugin 名 `tool-schedule-invariant`），只校验 `schedule/change` 流，**不**向模型再注册第四个名字。[E: packages/schedule/schedule/src/invariant.ts:14]

## 用途定位

三条工具管的是**当前 session 里的提醒记录**，不是 cron、不是日历、不是 OS / 邮件 / SMS 推送。创建时模型必须给非空 `prompt`，再从三种选择器里**恰好挑一个**：相对延迟 `after_seconds`、绝对时刻 `at`、固定频率 `every_seconds`（下限 `MIN_EVERY_INTERVAL_SECONDS = 300`）。[E: packages/schedule/schedule/src/domain.ts:24][E: packages/schedule/schedule/src/tools.ts:269]

投递边界写死为 `deliveryMode: 'session-local'`：只有这条 session 的 **live root** 在跑，到期才会 `followup`；进程关掉或 session 变冷，内存 timer 停，记录仍留在日志里，下次 resume 同一 session 会把已到期的当成 overdue 再投一次。冷读历史不会激活 timer。fork 只 fold `seedLength` 之后的后缀，不继承父会话的 active 提醒。[E: packages/schedule/schedule/src/domain.ts:770][E: packages/schedule/schedule/src/domain.ts:584][E: packages/schedule/schedule/tests/jsonl-restart.spec.ts:101]

`every` 对齐创建时刻，不枚举漏掉的 occurrence：一次 idle 决策只取每条 overdue 规则的**最新**一次，多条 overdue `every` 合成一条 `[SCHEDULE REMINDER BATCH]`。到期的 one-shot 永远排在这批 fixed-rate 前面。[E: packages/schedule/schedule/src/runtime.ts:47][E: packages/schedule/schedule/tests/runtime.spec.ts:288][E: packages/schedule/schedule/tests/runtime.spec.ts:331]

## 输入 schema

插件没有 Config，模型看见的就是 `defineTool` 默认参数。`parameterSchemaSpecToJsonSchema` 编出来的是**隐式开放** object（不写 `additionalProperties: false`）；「恰好一个选择器、禁止多余键」是 `validateCreateArgs` 在 execute 里做的，不是 JSON Schema 的 `oneOf`。[E: packages/core/tools/src/schema.ts:451][E: packages/schedule/schedule/src/tools.ts:259]

### `schedule_create`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `prompt` | `string` | 是 | 无 | schema 只要 string；execute 再要求 `trim()` 后非空 | 到期时展示给用户的提醒正文。落盘前会 trim。[E: packages/schedule/schedule/src/tools.ts:321][E: packages/schedule/schedule/src/tools.ts:272] |
| `after_seconds` | `number` | 否 | 无 | 与 `at` / `every_seconds` 三选一；须是正 `safe integer` | 相对 `Date.now()` 的秒延迟。schema 是 `number` 不是 `integer`。[E: packages/schedule/schedule/src/tools.ts:326][E: packages/schedule/schedule/src/tools.ts:276] |
| `every_seconds` | `number` | 否 | 无 | 三选一；须是 `safe integer` 且 `>= 300` | 固定间隔秒数。`< 300` 的码是 `frequency_too_high`，不是 `invalid_rule`。[E: packages/schedule/schedule/src/tools.ts:330][E: packages/schedule/schedule/src/tools.ts:282] |
| `at` | `string` 或 object | 否 | 无 | 三选一。string = 带 `Z` 或数值 offset 的 RFC 3339；object 必须**恰好**有 `date` / `time` / `time_zone` | schema 入口是 `at`。[E: packages/schedule/schedule/src/tools.ts:334] object 精确 key 集在 `hasExactKeys(at, ['date','time','time_zone'])`。[E: packages/schedule/schedule/src/domain.ts:694] 成功记录只冻 `id` / `kind` / `prompt` / `scheduledAt`，不保留 `date`/`time`/`time_zone`。[E: packages/schedule/schedule/src/domain.ts:714] |

`at` object 的子字段（仅当 `at` 是 object）：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---:|---|
| `date` | `string` | 是 | `YYYY-MM-DD` |
| `time` | `string` | 是 | `HH:mm:ss` 加可选 1–3 位小数秒 |
| `time_zone` | `string` | 是 | 字面量 `UTC` 或 IANA `Area/Location`（例如 `Asia/Shanghai`）。`CST` 这类缩写会 `invalid_time_zone`。[E: packages/schedule/schedule/src/tools.ts:344][E: packages/schedule/schedule/src/domain.ts:253] |

选择器错误码：

| 条件 | `code` | 是否先 `flush` |
|---|---|---|
| 0 个或 ≥2 个选择器，或出现未声明键 | `invalid_selector` | 否 [E: packages/schedule/schedule/src/tools.ts:269][E: packages/schedule/schedule/tests/tools.spec.ts:154] |
| `prompt` trim 后空 | `invalid_prompt` | 否 [E: packages/schedule/schedule/tests/tools.spec.ts:146] |
| `after_seconds` 非正整数 / `every_seconds` 非整数 | `invalid_rule` | 否 [E: packages/schedule/schedule/tests/tools.spec.ts:148] |
| `every_seconds < 300`（含 `299`） | `frequency_too_high` | 否 [E: packages/schedule/schedule/tests/tools.spec.ts:159] |
| `at` 字符串缺 offset（无 `Z` / 数值 offset） | `invalid_rule` | 是（过了 `validateCreateArgs` 才进 preflight）[E: packages/schedule/schedule/tests/tools.spec.ts:287] |
| 本地墙钟落在 DST gap（`createAtScheduleRecord` 找不到 candidate 且非 out-of-range） | `invalid_rule` | 是 [E: packages/schedule/schedule/src/domain.ts:379][E: packages/schedule/schedule/tests/domain.spec.ts:421] |
| `time_zone` 不是 `UTC` / IANA | `invalid_time_zone` | 是 [E: packages/schedule/schedule/tests/tools.spec.ts:293] |
| 目标 `<= now` | `not_future` | 是 [E: packages/schedule/schedule/tests/tools.spec.ts:299] |
| 算出来的瞬间超出四位年份 RFC 3339 UTC | `time_out_of_range` | 是 [E: packages/schedule/schedule/tests/tools.spec.ts:311] |

### `schedule_list`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| （无） | — | — | — | `parameters: {}` | 没有过滤、分页、排序参数。返回值按 durable 创建顺序。[E: packages/schedule/schedule/src/tools.ts:402] |

### `schedule_delete`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `id` | `string` | 是 | 无 | 非空且两侧无空白；空白 / 空串在 persist 前就被拒 | schema 只声明 string。[E: packages/schedule/schedule/src/tools.ts:423] execute 先拒空/两侧空白 → `invalid_rule`。[E: packages/schedule/schedule/src/tools.ts:427] 不在 `folded.active` 里（已删或已 dispatch 完）返回 `{ deleted: false, code: 'schedule_not_found' }`，不是「当还活着」。[E: packages/schedule/schedule/src/tools.ts:438] |

四个 shipped preset 都不挂这个插件，因此也没有 yml 层改名 / 改参。产品默认 catalog **没有**这三家。

## 输出 & 截断 / spill

三条工具都把规范值 `JSON.stringify` 成单段 `text`。没有 `presentationMeta`，没有 `ctx.spillStore`，没有自己的字符帽——截断如果发生，只可能来自事后 compaction，不是本工具合同。[E: packages/schedule/schedule/src/tools.ts:167]

**结构化失败是成功值。** `code: 'invalid_prompt'` 一类对象走 `output.schema` 的 `oneOf`，registry `createSuccessResult` 之后 `isError === false`，模型看到的是 JSON 对象而不是 `Error: …`。测试用 `value()` 断言的就是这条路径。[E: packages/schedule/schedule/src/tools.ts:117][E: packages/schedule/schedule/tests/tools.spec.ts:84]

真正的 `isError: true` 几乎只来自 registry 取消：body 在 abort 后返回占位 `internal_error`，registry 在 body 静止后换成 `AbortError` / `ABORTED`。[E: packages/schedule/schedule/src/tools.ts:183][E: packages/schedule/schedule/tests/tools.spec.ts:436]

### 成功 view（create 单条 / list 数组元素）

`scheduleView(record, now)` 在 durable 记录上加两个字段：[E: packages/schedule/schedule/src/domain.ts:766]

| 字段 | 含义 |
|---|---|
| `id` | session-local，创建后永不复用（删掉 `schedule-1` 再创建是 `schedule-2`）[E: packages/schedule/schedule/src/domain.ts:631][E: packages/schedule/schedule/tests/tools.spec.ts:196] |
| `kind` | `'after'` / `'at'` / `'every'` |
| `prompt` | 已 trim |
| `scheduledAt` | 规范四位年份 UTC instant（`…Z`） |
| `afterSeconds` | 仅 `kind: 'after'` |
| `everySeconds` | 仅 `kind: 'every'` |
| `state` | `now >= scheduledAt` → `'overdue'`，否则 `'scheduled'` |
| `deliveryMode` | 常量 `'session-local'` |

`at` 记录**没有** `date` / `time` / `time_zone` / 原始 offset 字符串。`+08:00` 输入会变成 UTC `scheduledAt` 再落盘。[E: packages/schedule/schedule/tests/tools.spec.ts:219]

### `schedule_delete` 成功形

| 值 | 何时 |
|---|---|
| `{ id, deleted: true }` | 当时 active，已 append `operation: 'delete'` 且第二道 barrier 成功 [E: packages/schedule/schedule/src/tools.ts:451] |
| `{ id, deleted: false, code: 'schedule_not_found' }` | id 未知、已 delete、或 one-shot 已 dispatch。这是成功值，不是 `isError` [E: packages/schedule/schedule/src/tools.ts:439] |

### 结构化错误（三家共用 `oneOf`）

| `code` | 额外字段 |
|---|---|
| `invalid_prompt` / `invalid_selector` / `invalid_rule` / `invalid_time_zone` / `not_future` / `time_out_of_range` / `frequency_too_high` / `corrupt_schedule_log` / `internal_error` | 只有 `code` + `message` |
| `persistence_uncertain` | `operation: 'create' \| 'list' \| 'delete'`，create/delete 在已经分配或已经知道 id 时带 `id` [E: packages/schedule/schedule/src/tools.ts:107] |

`persistence_uncertain` 的文案固定要求模型先 `schedule_list` 再相信刚才那次结果：live 日志可能已经 append，只是 durability listener 没确认。[E: packages/schedule/schedule/src/tools.ts:210][E: packages/schedule/schedule/tests/tools.spec.ts:376]

没有 persistence listener 时，`ctx.sessions.flush` 返回 `false`，同样映射成 `persistence_uncertain`，而不是空 list 成功。[E: packages/schedule/schedule/src/persistence.ts:26][E: packages/schedule/schedule/tests/tools.spec.ts:342]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | 本包把 `SessionEventMap['schedule/change']` 扩成 v1 `ScheduleChange`（`create` / `delete` / `dispatch`），并定义三条 tool schema。协议版本常量 `SCHEDULE_CHANGE_VERSION = 1`。[E: packages/schedule/schedule/src/types.ts:219][E: packages/schedule/schedule/src/domain.ts:21] |
| Provider | `ctx.sessionPersistence` 的后端（JSONL / SQLite 等）加上 `ctx.sessions.flush` 这条共享 barrier。Schedule **不**自己写磁盘。[E: packages/session/session-persistence/src/index.ts:62][E: packages/core/session/src/index.ts:1022] |
| Consumer | `registerScheduleTools`（管理面）和 `ScheduleRuntime`（投递面）。两者都通过 `flushSchedulePersistence` 要求「至少一名 `session/flush` listener 成功返回」。 |

`apply` 的 `inject` 决定插件能不能 load。换掉 persistence 后端会带走：flush 是否真的落盘、进程重启后能否 `agents.resume` 找回 overdue。不会带走：三条 wire 名、选择器形状、`MIN_EVERY_INTERVAL_SECONDS`、session-local 投递、`schedule/change` 的严格 decode。

消费的 `ctx.*` / agent API：

- `ctx.agents`：`agent/created`、`roots()`、`withoutInitiator`、`get`（runtime 用来确认自己还是活着的 root）。[E: packages/schedule/schedule/src/index.ts:46][E: packages/core/agent/src/index.ts:613]
- `ctx.sessions.flush`：管理工具的 preflight / post-append barrier，以及 runtime 的 wake / dispatch barrier。[E: packages/schedule/schedule/src/persistence.ts:26]
- `ctx.tools.register`：在 **`agent.ctx`** 上注册，属于该 root 的 scope-local 层，shadow 全局同名（产品里没有全局同名）。[E: packages/core/tools/src/index.ts:1037][E: packages/schedule/schedule/src/index.ts:49]
- `ctx.sessionPersistence`：只出现在 `inject` 里，用来等 Provider 就位；工具 body 不直接调它。
- `agent.session.append('schedule/change', …)`：唯一写路径。
- `agent.followup`：到期投递。`source: { kind: 'plugin', plugin: 'schedule' }`。不用 `steer` / `inject`。[E: packages/schedule/schedule/src/runtime.ts:273][E: packages/schedule/schedule/src/runtime.ts:275]
- `agent.runMaintenance`：只有 agent 真正 idle 才准入；busy 时改 `whenIdle()`。[E: packages/schedule/schedule/src/runtime.ts:256]

不消费 `ctx.fs` / `ctx.shell` / `ctx.approval` / `ctx.sandboxPolicy`。sandbox 只罩文件副作用；这三条工具没有 per-call sandbox stamp，也不广告 `sandbox_permissions`。

配套但**不是**本工具：`examples/web-schedule/cordis.yml` 同时 insert `@deepseek-ai/dsh-time-context`，给模型一段 request-local 时钟 / 浏览器时区。Schedule 自己不读 `ctx` 上的 clock service，也不推断 session 默认时区——`at` 必须自带 offset 或显式 `time_zone`。[E: examples/web-schedule/cordis.yml:5][E: examples/web-schedule/cordis.yml:6]

## 执行管线

模型发出 `schedule_*` 之后，loop 走 registry：`tools/pre-execute` → monotonic guard → `tools/execute`（around-dispatch）→ tool body → `tools/post-execute` → `output.render`。[E: packages/core/tools/src/index.ts:1342][E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574]

对本三家的挂点：

- **`tools/pre-execute`**：Schedule 不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会进 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **调度模式**：三条 `defineTool` 都没声明 `isConcurrencySafe`。registry `executionMode` 只把精确 `true` 当成 `parallel`，否则 `exclusive`。测试对三个名字都断言 `{ kind: 'exclusive' }`。[E: packages/core/tools/src/index.ts:1278][E: packages/schedule/schedule/tests/tools.spec.ts:114]
- **包内 FIFO**：body 还包一层 `runScheduleTransaction(agent, …)`，按 agent 串行化 create/list/delete，避免两个 mutation 交错 fold。[E: packages/schedule/schedule/src/transaction.ts:13]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 在「有 `exec.agent` 且 `exec.parent === undefined`」时先 `flush` 再 `next()`；这是通用 checkpoint，不是 Schedule 自己的 `flushSchedulePersistence`。[E: packages/session/session-checkpoint-policy/src/index.ts:71][E: packages/session/session-checkpoint-policy/src/index.ts:72]
  - `timeout-policy` 读 `definition.timeoutMs`。三条工具都没声明该字段，包装器直接 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59]
- **`tools/post-execute`**：Schedule 不注册 listener，默认 `accept`。[E: packages/core/tools/src/index.ts:1745]
- **sandbox / approval**：不挂。

到期投递**不**经过 `tools/pre-execute → execute → post-execute`。`ScheduleRuntime.driveOnce` 在 idle maintenance 里 `followup` + `append('schedule/change', { operation: 'dispatch' })`。那是另一条控制流，见本页 `execute()` 走读的 runtime 小节。

若同一会话又开了 Code Mode（`tools.presentAs('code')`），非嵌套且 `mode === 'code'` 时，除 `run_code` 外的名字在 `createExecution` 里 collapse，**进不了** `tools/pre-execute`。SDK 子分发带 `parent` 则不 collapse，仍走完整管线。[E: packages/core/tools/src/index.ts:1325]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。包存在、CLI 把它写进 `dependencies`，都不算产品默认装。

四个 shipped 文件里都**没有** `id: schedule`，也没有 `name: '@deepseek-ai/dsh-schedule'`。各文件实际挂到的末条 model-facing 插件是：

| preset | 装 `@deepseek-ai/dsh-schedule`？ | `disabled` | isolate | 反证（该文件实际末条） |
|---|---|---|---|---|
| `minimal` | **否** | — | — | 末条是 isolate `fs` 组里的 `str-replace-editor` → `@deepseek-ai/dsh-tool-str-replace-editor`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |
| `standard` | **否** | — | — | 末条是 `tool-web` → `@deepseek-ai/dsh-tool-web`（`fetch: false`）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:248] |
| `code` | **否** | — | — | 相对 `standard` 的增量是末尾 `tool-presentation` `mode: code`，仍然没有 schedule 行。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259][E: apps/cli/config/agent-presets/code/agent.cordis.yml:260] |
| `cordis` | **否** | — | — | 增量是 `tool-cordis`；文件末条是 `tool-skill`。没有 schedule 行。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261] |

`dsh-base` / `web-app` / `headless` 的 `cordis.patch.yml` 同样没有 `dsh-schedule` 行。产品默认 Web catalog 因此不含 `schedule_*`。

它出现在**用户 / example composition**，不是 shipped preset：

- `examples/web-schedule/cordis.yml` 在 host 面 `insert` `id: time-context` 与 `id: schedule` / `name: '@deepseek-ai/dsh-schedule'`。[E: examples/web-schedule/cordis.yml:8][E: examples/web-schedule/cordis.yml:9]
- Web e2e 用 `launchWebScaffold({ extraOverlayPath: OVERLAY })` 加载这份 overlay，再断言请求里出现 `schedule_create`。[E: apps/web/tests/schedule-after.e2e.ts:216][E: apps/web/tests/schedule-after.e2e.ts:483]
- 用户自己的 `$DSH_HOME/profiles/<name>/cordis.patch.yml` 或 `dsh web --patch …` 也可以同样 insert。插件只观察**加载之后新发布的 root**；已经活着的 root 不会补注册。[E: packages/schedule/schedule/tests/plugin.spec.ts:42][E: packages/schedule/schedule/tests/plugin.spec.ts:43]

## execute() 走读

符号：`registerScheduleTools` / `validateCreateArgs` / `preflight` @ `packages/schedule/schedule/src/tools.ts`；`createAfterScheduleRecord` / `createAtScheduleRecord` / `createEveryScheduleRecord` / `foldScheduleEvents` / `allocateScheduleId` / `scheduleView` @ `domain.ts`；`runScheduleTransaction` @ `transaction.ts`；`flushSchedulePersistence` @ `persistence.ts`；`ScheduleRuntime.driveOnce` @ `runtime.ts`。

### 1. 三条工具共用的门

1. **认主。** `schedule_create` / `schedule_list` 的 `execute` 第一句比较 `exec.agent !== agent`。`schedule_delete` 先拒空/两侧空白 id，再在 `ScheduleId(...)` 之后比 owner。跨 owner 调用立刻返回 `{ code: 'internal_error', message: 'The schedule operation failed.' }`，不 flush、不 fold。畸形 id 会先 `invalid_rule`，到不了认主。[E: packages/schedule/schedule/src/tools.ts:352][E: packages/schedule/schedule/src/tools.ts:427][E: packages/schedule/schedule/src/tools.ts:431][E: packages/schedule/schedule/tests/tools.spec.ts:553]
2. **形状校验（仅 create / delete）。** create 走 `validateCreateArgs`；delete 先拒空 id / 带空白 id。这些失败 `flushes.count === 0`。[E: packages/schedule/schedule/src/tools.ts:353][E: packages/schedule/schedule/src/tools.ts:427][E: packages/schedule/schedule/tests/tools.spec.ts:161]
3. **FIFO + 取消占位。** `runCancellableScheduleTransaction` 等到该 agent 的前一个 Schedule 事务结束；轮到自己时若 `signal.aborted`，返回 `internal_error` 占位，让 registry 收成 `ABORTED`，此时还没有 preflight。[E: packages/schedule/schedule/src/tools.ts:192][E: packages/schedule/schedule/tests/tools.spec.ts:436][E: packages/schedule/schedule/tests/tools.spec.ts:440]
4. **preflight。** `flushSchedulePersistence` → `ctx.sessions.flush`。listener 抛错或一个 listener 都没有（返回 `false`）→ `persistence_uncertain`。成功才 `notifyDurableChange()`（唤醒 runtime），再 `foldForTool`。[E: packages/schedule/schedule/src/tools.ts:245][E: packages/schedule/schedule/src/persistence.ts:26]
5. **fold。** `foldScheduleEvents(events, header.seedLength ?? 0)`。decode 失败 → `corrupt_schedule_log`；其它 throw → `internal_error`。fold **跳过** seed 前缀，所以 fork 看不到父会话创建的 id。[E: packages/schedule/schedule/src/tools.ts:224][E: packages/schedule/schedule/src/domain.ts:584]

### 2. `schedule_create`

6. **分配 id。** `allocateScheduleId(folded)` 从 `schedule-${seen.size+1}` 往上找第一个未见过的 `schedule-N`。已删除的 id 仍在 `seenIds` 里。[E: packages/schedule/schedule/src/domain.ts:628]
7. **造 record。** `args.at` 优先，否则 `after_seconds`，否则 `every_seconds`。每个分支各自再调一次 `Date.now()`。`ScheduleInputError` 变成对应 `code`；其它异常变成 `internal_error`。[E: packages/schedule/schedule/src/tools.ts:364][E: packages/schedule/schedule/src/tools.ts:366][E: packages/schedule/schedule/src/tools.ts:369][E: packages/schedule/schedule/src/tools.ts:376][E: packages/schedule/schedule/tests/tools.spec.ts:320]
8. **append 前再看一眼 abort。** 已算出 record 但还没写日志时取消，不 persist。[E: packages/schedule/schedule/src/tools.ts:379]
9. **append `schedule/change`。** payload 是 `{ version: 1, operation: 'create', schedule: record }`。`append` 抛错 → `internal_error`。[E: packages/schedule/schedule/src/tools.ts:382]
10. **第二道 barrier。** 再 `preflight(..., 'create', id)`。失败返回带 `id` 的 `persistence_uncertain`（live 日志里可能已经有这条 create）。成功才 `notifyDurableChange()` 并返回 `scheduleView(record, Date.now())`。[E: packages/schedule/schedule/src/tools.ts:390][E: packages/schedule/schedule/tests/tools.spec.ts:178]

一次成功 create 因此 **flush 两次、observer 两次**。

### 3. `schedule_list`

11. 只有第一道 preflight。fold 成功后 `folded.active.map(record => scheduleView(record, now))`。空 session 返回 `[]`，不是错误。[E: packages/schedule/schedule/src/tools.ts:407][E: packages/schedule/schedule/src/tools.ts:413]
12. list 也会在 preflight 成功后 `notifyDurableChange()`：读路径用来把 runtime 从「刚恢复的磁盘前缀」上重新 arm timer。[E: packages/schedule/schedule/src/tools.ts:409]

### 4. `schedule_delete`

13. 预检 id，再 preflight（带着已知 `id`）。fold 后若 `active` 里没有这个 id，返回 `{ id, deleted: false, code: 'schedule_not_found' }`，**不再 append**。[E: packages/schedule/schedule/src/tools.ts:438]
14. 否则 abort 检查 → `append({ version: 1, operation: 'delete', id })` → 第二道 barrier → `{ id, deleted: true }`。[E: packages/schedule/schedule/src/tools.ts:444][E: packages/schedule/schedule/src/tools.ts:451]

### 5. `ScheduleRuntime` 投递（不是 tool body）

15. **何时 drive。** `runtime.start()`、每次成功的 durable-change observer、以及 root 回到 `status === 'idle'` 且日志里已有 `schedule/change`。[E: packages/schedule/schedule/src/index.ts:51][E: packages/schedule/schedule/src/runtime.ts:99]
16. **wake。** `driveOnce` 先 flush，再 fold，再 `dueDecision(now)`。没有任何 due → 若有未来 `scheduledAt` 就 `setTimeout`（单段不超过 `MAX_TIMER_DELAY_MS = 2_147_483_647`），到点只重新 `requestDrive`，以墙上时钟为准，避免 timer 漂移早射。[E: packages/schedule/schedule/src/runtime.ts:179][E: packages/schedule/schedule/src/runtime.ts:250][E: packages/schedule/schedule/tests/runtime.spec.ts:191]
17. **准入。** 有 due 就 `agent.runMaintenance`。同步扔 busy → `whenIdle()`，**不**把记录标成已 dispatch。[E: packages/schedule/schedule/src/runtime.ts:309][E: packages/schedule/schedule/tests/runtime.spec.ts:224]
18. **maintenance 内再采样一次 `Date.now()`。** 墙上时钟回拨则改回 wait。确认 due 后：
    - one-shot：`renderReminderFraming` → `[SCHEDULE REMINDER]`。`schedule_id_json` 与 `reminder_prompt_json` 走 `JSON.stringify`；`occurrence_at` 是裸插值 `record.scheduledAt`，不 stringify。prompt 里伪造的 `occurrence_at:` 因此只会落在 JSON 字符串字段里。[E: packages/schedule/schedule/src/domain.ts:783][E: packages/schedule/schedule/src/domain.ts:784][E: packages/schedule/schedule/src/domain.ts:785][E: packages/schedule/schedule/tests/runtime.spec.ts:255]
    - 全部 overdue `every`：`.sort(byTargetThenCreate)` 后再合成 `[SCHEDULE REMINDER BATCH]` + `reminders_json`。[E: packages/schedule/schedule/src/domain.ts:794][E: packages/schedule/schedule/src/runtime.ts:52]
19. **`followup` 先于 dispatch append。** 顺序测试固定为 `flush → maintenance → followup → dispatch → release → flush`。`followup` 失败则**不**写 dispatch，下次 idle 会重试同一条。[E: packages/schedule/schedule/src/runtime.ts:275][E: packages/schedule/schedule/tests/runtime.spec.ts:248]
20. **dispatch 形状。** one-shot 是 `{ version: 1, operation: 'dispatch', id }`（fold 后从 active 消失）。`every` 是同结构外加 `acceptedAt`；`dispatchedRecord` 调 `resolveEveryOccurrence` 把 `scheduledAt` 推到下一档，若下一档超出四位年份则 `nextScheduledAt` 缺失、规则结束。[E: packages/schedule/schedule/src/runtime.ts:284][E: packages/schedule/schedule/src/domain.ts:544][E: packages/schedule/schedule/src/domain.ts:563][E: packages/schedule/schedule/src/domain.ts:564]
21. **resume。** JSONL 重启：第一条 overdue create 在新进程 `agents.resume` 后恰好 dispatch 一次；再 resume 一次不会二次 followup。[E: packages/schedule/schedule/tests/jsonl-restart.spec.ts:113][E: packages/schedule/schedule/tests/jsonl-restart.spec.ts:129]

UI e2e 断言会话里**没有** `[data-schedule-reminder]`：投递就是普通 `user/message` + 随后的 assistant 回复，没有专用 reminder 卡片。[E: apps/web/tests/schedule-after.e2e.ts:400]

## 设计动机·edge

- **不是作业调度器。** 没有 calendar / cron 表达式，没有「工作日 9:00」这种本地循环。fixed-rate 只是创建对齐的秒间隔，下限五分钟，避免模型把 `every_seconds: 1` 变成忙等。
- **session-local 是产品边界，不是暂缺的 push。** view 把 `deliveryMode` 写成常量，逼模型不要假设关了浏览器还能响。
- **管理值与投递值分开。** 工具返回 JSON view；到期文本是抗注入 framing。`prompt` 被当成 untrusted reminder content，不是新的 user instruction。
- **严格日志。** `decodeScheduleChange` 要求 payload 是 object、`version === 1`、以及各 `operation` 的精确 key 集。id 不复用、delete/dispatch 必须打在 active 记录上属于 `foldScheduleEvents`。companion invariant 在 `session/event` 前用同一套 fold 拒掉坏 append。[E: packages/schedule/schedule/src/domain.ts:466][E: packages/schedule/schedule/src/domain.ts:467][E: packages/schedule/schedule/src/domain.ts:589][E: packages/schedule/schedule/src/domain.ts:596][E: packages/schedule/schedule/src/domain.ts:602][E: packages/schedule/schedule/src/invariant.ts:42]
- **两道 barrier。** create/delete 成功只在第二道 flush 之后承认。第一道失败则根本不 fold 未确认的 live 后缀（包括可能损坏的 version≠1 事件）。[E: packages/schedule/schedule/tests/tools.spec.ts:363]
- **observer 失败不能回滚。** `notifyDurableChange` 吞掉 projection 异常；create 仍然 committed。[E: packages/schedule/schedule/src/tools.ts:308][E: packages/schedule/schedule/tests/tools.spec.ts:333]
- **DST。** 本地 `at` 在 gap 里 `invalid_rule`；在 overlap 里取最早那个 instant。成功记录不保留 zone。
- **与 peer harness 的差异。** 这不是 Claude scheduled task / cron skill，也不是 Codex 的后台 job。没有跨 session 的全局 scheduler 服务；fork 显式丢弃父提醒。

## Sources

- packages/schedule/schedule/src/index.ts
- packages/schedule/schedule/src/tools.ts
- packages/schedule/schedule/src/domain.ts
- packages/schedule/schedule/src/runtime.ts
- packages/schedule/schedule/src/types.ts
- packages/schedule/schedule/src/persistence.ts
- packages/schedule/schedule/src/transaction.ts
- packages/schedule/schedule/src/invariant.ts
- packages/schedule/schedule/package.json
- packages/schedule/schedule/tests/tools.spec.ts
- packages/schedule/schedule/tests/plugin.spec.ts
- packages/schedule/schedule/tests/runtime.spec.ts
- packages/schedule/schedule/tests/jsonl-restart.spec.ts
- examples/web-schedule/cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/package.json
- apps/web/tests/schedule-after.e2e.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/agent/src/index.ts
- packages/core/session/src/index.ts
- packages/session/session-persistence/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/guard/timeout-policy/src/index.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute` 脊柱；Schedule 管理调用走这条，到期 `followup` 不走
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表（`schedule_*` 是 opt-in，不是 shipped preset 默认行）
- [schedule 子系统](../../subsystems/orchestration/schedule.md) — `schedule/change` 流、runtime 定时器与 persistence barrier 的子系统页
