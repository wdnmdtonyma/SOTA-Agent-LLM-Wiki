---
id: subsys.persistence.telemetry
title: session telemetry
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-telemetry/src/index.ts
  - packages/session/session-telemetry/src/coordinator.ts
  - packages/session/session-telemetry/tests/redact.spec.ts
  - packages/session/session-telemetry/tests/telemetry.spec.ts
  - packages/session/session-telemetry-otel/src/index.ts
  - packages/session/session-telemetry-otel/tests/otel.spec.ts
  - packages/session/session-stats/src/index.ts
  - packages/session/session-stats/src/projection.ts
  - packages/session/session-stats/src/types.ts
  - packages/session/session-stats/tests/projection.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/telemetry-switch.spec.ts
  - packages/identity/anonymous-user-id/src/index.ts
  - packages/feedback/command-feedback/src/index.ts
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/session/session-projection/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/settings/settings/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - SessionTelemetryBackend
  - SessionTelemetryCoordinator
  - OpenTelemetrySessionBackend
  - sessionStatsProjectionDefinition
related:
  - spine.session-log
  - subsys.persistence.projection
  - surface.cli.overview
  - spine.overview
  - spine.capability-seams
  - subsys.core.session
  - subsys.persistence.checkpoint
  - subsys.interaction.commands
  - subsys.persistence.jsonl
  - subsys.persistence.session-query
  - subsys.persistence.storage
  - subsys.persistence.workspace
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.sessionTelemetry` 是 **host 面** 会话上报缝：Definition 声明 `SessionTelemetryBackend` 与 `session-telemetry/record` waterfall；shipped 唯一 Provider 是 `@deepseek-ai/dsh-session-telemetry-otel`；capture 把已提交 `SessionEvent` 的 `structuredClone` 副本交给 backend，**从不改写** canonical session log。默认 `mode: DISABLED`。`session-stats` 是另一条缝上的 projection unit（**只 web-app**），计的是 `step/end` 不是 `assistant/message`。这是 Cordis 组合运行时（`profile → bundle → agent preset`）的进程级观测面，不是模型可见工具，也不是「又一个 coding agent」的内置 analytics。

## 能回答的问题

- `ctx.sessionTelemetry` 谁挂、默认 `mode` 是什么？`mode: DISABLED` 和 `DSH_TELEMETRY_DISABLED` 把整行 `disabled` 差在哪一层？
- `session-telemetry/record` 是 emit、parallel 还是 waterfall？谁必须 `next()`？零 shipped 脱敏规则时导出长什么样？
- `FULL` / `FEEDBACK_ONLY` / `DISABLED` 各听哪些总线、有没有 OTel SDK、`sessionTelemetry.emit` 直调去哪？
- 匿名 `user.id` 从哪个文件来？落在 Resource 还是每条 record？
- `sessionStats` 为什么计 `step/end` 不计 `assistant/message`？base 是否挂 `session-persistence-jsonl`（`root: dshHomePath('sessions')`）和 `session-query-sqlite`（`openAt: never`）？`storage` / `workspace` / `session-projection-cache` / `session-stats` 哪一层才有？
- telemetry 上报与 `session/flush` 耐久屏障、compaction 的 `surfaceOp: replace` 各走哪条事件形态？

## 职责边界

本页拥有两条 **host 面** 能力，它们共享「读已提交 log」这一侧，但 **不是** 同一条 `ctx` 键：

- **上报缝** `@deepseek-ai/dsh-session-telemetry`：抽象类 `SessionTelemetryBackend` 占住 `ctx.sessionTelemetry`；`SessionTelemetryCoordinator` 由 backend 在构造函数里 compose，自己不 `provide` 键。 [E: packages/session/session-telemetry/src/index.ts:21] [E: packages/session/session-telemetry/src/index.ts:150]
- **shipped Provider** `@deepseek-ai/dsh-session-telemetry-otel`：`OpenTelemetrySessionBackend` 构造 `LoggerProvider`，`enqueue` 按 `channel` 选 ledger / ops logger 再 `logger.emit`。 [E: packages/session/session-telemetry-otel/src/index.ts:147] [E: packages/session/session-telemetry-otel/src/index.ts:197] [E: packages/session/session-telemetry-otel/src/index.ts:221] [E: packages/session/session-telemetry-otel/src/index.ts:222] [E: packages/session/session-telemetry-otel/src/index.ts:223]
- **统计 unit** `@deepseek-ai/dsh-session-stats`：`apply` 把 `sessionStatsProjectionDefinition` 登记到 `ctx.sessionProjections`。 [E: packages/session/session-stats/src/index.ts:28]

本页**不**拥有：

- append-only `Session`、`deriveMessages()`、`SurfaceOp` 合同（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）。
- `ctx.sessionProjections` registry / cache 的 drive 与写盘（[subsys.persistence.projection](projection.md)）。cache 行 `session-projection-cache` **只 web-app**。
- `llm/stream` / 顶层 `tools/execute` 进 adapter 或 tool body **之前** 的 fail-closed `sessions.flush`（[subsys.persistence.checkpoint](checkpoint.md)）。
- JSONL / SQLite 物理盘。shipped 默认盘是 base 行 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；SQLite session 盘未进任何 shipped bundle（[subsys.persistence.jsonl](jsonl.md)、[subsys.persistence.sqlite](sqlite.md)）。
- FTS / `openAt`（[subsys.persistence.session-query](session-query.md)）。shipped `session-query-sqlite` 写出 `openAt: never`。
- 非会话 `ctx.storage` 与 workspace 实体（[subsys.persistence.storage](storage.md)、[subsys.persistence.workspace](workspace.md)）。`storage` + `storage-json` + `storage-domain`、`workspace` **只 web-app**。
- `/feedback` 命令的注册与 `feedback/record` 事件词（[subsys.interaction.commands](../interaction/commands.md)）；本页只写它如何读 `sharing`。
- OTel SDK 内部的 batch / retry / 丢包策略（`emit` 之后归 SDK）。

正交、写错会污染邻页的事实（点名，不展开实现）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。跨 version **没有**自动 migration。telemetry 导出的是事件 `data` 副本，不负责迁盘。 [E: packages/core/session/src/types.ts:56]
- SQLite **session 盘** `SCHEMA_VERSION = 15`：`user_version` 非 0 且不等于 15 → 拒开，原地不迁。该 backend **不**在任何 shipped bundle。这跟 session event `version`、跟 `sessionStats` 的 `stateVersion: 1` 正交。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。telemetry 的 `session/flush` listener 只是可选 flush **hint**，不是那两道门。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，**没有 delete**。`this.log` 只增不删，所以 `sessionStats` 的 whole-log 计数不会因为压缩而少掉已经闭合的 `step/end`。 [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374]
- settings 分层：schema defaults → composition `base` → 用户文档 section。`resolve` 对 `mergeLayers(base, section)` 再跑 schema。 [E: packages/settings/settings/src/index.ts:705]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`.credentials.yaml` 写入 map 的是非空 secret 字符串，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:183]
- shipped JSONL 后端挂在 base：`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。headless / web 继承这一行，自己不重挂。telemetry 导出的是事件 `data` 副本，不换这条盘。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:99] [E: packages/bundle/base/cordis.patch.yml:101]
- shipped `session-query-sqlite` 写出 `openAt: never`（base 挂载；web-app 用同一键重述）。search 默认关，不 import/open sqlite。 [E: packages/bundle/base/cordis.patch.yml:117] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33]
- `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache` **只 web-app**。headless / base **没有**这些行。`session-stats` 与它们同层 insert，也只 web-app。headless `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/cordis.patch.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

这是 **host 面** 进程级服务。agent-preset 面贡献 tools / persona / isolate，不 remount `sessionTelemetry`。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI 包。浏览器 client 不实现 `SessionTelemetryBackend`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-telemetry/src/index.ts` | Definition：`ctx.sessionTelemetry`、`SessionTelemetryRecord`、`session-telemetry/record` waterfall |
| `packages/session/session-telemetry/src/coordinator.ts` | `SessionTelemetryCoordinator`：live / on-demand capture、chunk 投影、handoff cursor、`contain` |
| `packages/session/session-telemetry/tests/redact.spec.ts` | 零 listener 透传、跳过 `next()` 整链替换、抛错 fail-closed 扣条、canonical log 不动 |
| `packages/session/session-telemetry/tests/telemetry.spec.ts` | 首 chunk、adoption / `firstLiveSeq`、`session/flush` hint、`agent/error` ops |
| `packages/session/session-telemetry-otel/src/index.ts` | `OpenTelemetrySessionBackend`：`FULL` / `FEEDBACK_ONLY` / `DISABLED` |
| `packages/session/session-telemetry-otel/tests/otel.spec.ts` | Resource `user.id`、无 `flush()`、feedback 回放、默认 DISABLED |
| `packages/session/session-stats/src/index.ts` | 函数插件 `name: session-stats`，`inject: ['sessionProjections']` |
| `packages/session/session-stats/src/projection.ts` | `sessionStatsProjectionDefinition`：计 `step/end` |
| `packages/session/session-stats/src/types.ts` | `SessionProjectionMap.sessionStats` |
| `packages/session/session-stats/tests/projection.spec.ts` | 取消步仍计、max-tokens 空 content 不加步 |
| `packages/bundle/base/cordis.patch.yml` | `id: session-telemetry-otel`，`mode: !!js process.env.DSH_TELEMETRY_MODE \|\| 'DISABLED'`；同层 `id: session-persistence-jsonl` `root: dshHomePath('sessions')`；`session-query-sqlite` `openAt: never` |
| `packages/bundle/web-app/cordis.patch.yml` | **只 web-app** 的 `id: session-stats`；同层 insert `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`；重述 `session-query-sqlite` `openAt: never` |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner`；不重挂 otel / stats / jsonl / storage / workspace / projection-cache |
| `apps/cli/src/profile-boot.ts` | `resolveTelemetryPatch`：非空 `DSH_TELEMETRY_DISABLED` 把整行 `disabled` |
| `packages/identity/anonymous-user-id/src/index.ts` | `$DSH_HOME/.anonymous-user-id` |
| `packages/feedback/command-feedback/src/index.ts` | `/feedback` 读 `sharing`；无服务则 “not configured” |
| `vendor/cordis/src/events.ts` | waterfall 必须调用传入的 `next()` 才会 `shift` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionTelemetryRecord` | `channel: 'ledger' \| 'ops'` + `time` + `severity` + `attributes` + `body`。ledger 镜像一条 session 事件。ops 只有 `agent-error` / `shutdown`：`shutdownRecord` 的 attributes 只有 `telemetry.op` + `session.id`；`relayAgentError` 另加 `agent.id` / `error.name` / `turn` / `step`；两条都**没有** `event.seq`。 [E: packages/session/session-telemetry/src/index.ts:66] [E: packages/session/session-telemetry/src/coordinator.ts:279] [E: packages/session/session-telemetry/src/coordinator.ts:237] |
| `SessionTelemetrySeverity` | 预映射 `info` / `warn` / `error`。`tool/result` 看 `isError`；`turn/end` 看 `reason.kind === 'error'`；未知 type 落 `info`。 [E: packages/session/session-telemetry/src/coordinator.ts:288] [E: packages/session/session-telemetry/src/coordinator.ts:290] |
| `SessionTelemetrySharingStatus` | `'full'` / `'feedback-only'` / `'disabled'`。backend 必须披露；无服务时 `/feedback` 才说 “not configured”。 [E: packages/session/session-telemetry/src/index.ts:140] |
| `SessionTelemetryMode` | `FULL` / `FEEDBACK_ONLY` / `DISABLED`。`DEFAULT_TELEMETRY_MODE = DISABLED`。 [E: packages/session/session-telemetry-otel/src/index.ts:44] [E: packages/session/session-telemetry-otel/src/index.ts:51] |
| `SessionTelemetryCapture` | 类型是 `'live' \| 'on-demand'`。`live` 才登记 `session/created` / `disposed` / `event` / `flush` + `agent/error` 并对 `ctx.sessions.list()` 扫一遍；否则这些 listener 不挂。`captureSession` 读 cursor 之后的 canonical log。on-demand 不 `adopt`，dispose 后 records 仍只有 `ledger`，不产 `shutdown` / `agent-error` ops。 [E: packages/session/session-telemetry/src/coordinator.ts:23] [E: packages/session/session-telemetry/src/coordinator.ts:79] [E: packages/session/session-telemetry/src/coordinator.ts:138] [E: packages/session/session-telemetry/tests/telemetry.spec.ts:275] |
| `handoffCursor` | 模块级 `WeakMap<Session, number>`：已交给 backend 的最高 `seq`。HMR 重挂靠 Session 对象活过 telemetry fiber。 [E: packages/session/session-telemetry/src/coordinator.ts:43] |
| `sessionStats` | `turns` / `steps` / `llmMs` / `toolMs` / `ttftMs` / `ttftSteps` / `decodeMs` / `decodeTokens`。`stateVersion: 1`。 [E: packages/session/session-stats/src/projection.ts:93] [E: packages/session/session-stats/src/projection.ts:182] |

ledger `attributes` 最小集：`session.id` / `event.type` / `event.seq`，header 有则再加 `session.cwd` / `session.parent_id` / `session.seed_length`。`body` 是 `structuredClone(event.data)`，不是整份 envelope。 [E: packages/session/session-telemetry/src/coordinator.ts:199] [E: packages/session/session-telemetry/src/coordinator.ts:308]

## 控制流

1. **host 面挂 otel 行；Definition 不是 shipped 行。** `dsh-base` 插入 `id: session-telemetry-otel` / `name: '@deepseek-ai/dsh-session-telemetry-otel'`，`mode: !!js process.env.DSH_TELEMETRY_MODE || 'DISABLED'`。测试把该表达式钉成 `__jsExpr`。`OpenTelemetrySessionBackend` 构造 `super(ctx)` → `SessionTelemetryBackend` 再 `super(ctx, 'sessionTelemetry')`，键是 `ctx.sessionTelemetry`。`@deepseek-ai/dsh-session-telemetry` 本身不出现在任何 bundle `insert`。`static inject = ['sessions']`。 [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:149] [E: packages/bundle/base/cordis.patch.yml:151] [E: packages/bundle/base/tests/base.spec.ts:36] [E: packages/session/session-telemetry-otel/src/index.ts:148] [E: packages/session/session-telemetry/src/index.ts:150]

2. **`session-stats` 只 web-app；headless 继承 otel、不重挂 stats。** `dsh-base` 同层还挂 `id: session-persistence-jsonl`（`root: dshHomePath('sessions')`）和 `id: session-query-sqlite`（`path: ':memory:'`、`openAt: never`）。`dsh-web-app` 另插 `id: session-stats` / `name: '@deepseek-ai/dsh-session-stats'`，并 insert **只 web-app** 的 `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`；web-app 用同一键重述 `session-query-sqlite`，仍是 `openAt: never`。projection registry 本身是 base 行 `id: session-projection`。`dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `session-telemetry-otel`、也没有 `session-stats`，也没有 storage / workspace / projection-cache：otel 与 jsonl / query 从 base 继承（otel 默认仍 DISABLED，query 仍 `openAt: never`），stats 在 headless **不存在**。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:117] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/web-app/cordis.patch.yml:84] [E: packages/bundle/web-app/cordis.patch.yml:85] [E: packages/bundle/base/cordis.patch.yml:126] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

3. **`DSH_TELEMETRY_DISABLED` 关的是整行，不是把 mode 改成 DISABLED。** `resolveTelemetryPatch`：环境变量非空（含 `'0'` / `'false'` / `'no'`）且组合里已有 `id: session-telemetry-otel` → overlay `{ id, disabled: true }`。空串或未设置 → 不打补丁，留下 yaml 的 `DSH_TELEMETRY_MODE`。没有该行的自定义 profile 也不打补丁（本来就没有导出）。这一层在 `--patch` 之后、boot 之前。行被 `disabled` 后插件不加载，`ctx.sessionTelemetry` 是 `undefined`。 [E: apps/cli/src/profile-boot.ts:57] [E: apps/cli/src/profile-boot.ts:81] [E: apps/cli/src/profile-boot.ts:82] [E: apps/cli/src/profile-boot.ts:168] [E: apps/cli/tests/telemetry-switch.spec.ts:12]

4. **backend 按 mode 分叉：DISABLED 不读 transport。** `resolveMode(config.mode)` 缺省 `DEFAULT_TELEMETRY_MODE`（`DISABLED`）。`DISABLED`：`directEmit = DROP_RECORD`，不造 `LoggerProvider`，只听 `session/event` 上的 `feedback/record` 打 warn（`session telemetry is DISABLED; nothing will be shared and this feedback remains local`），然后 `return`。测试：DISABLED 连 `exporter` / `processor` / `shutdownTimeoutMillis` 的 getter 都不碰。`FULL` / `FEEDBACK_ONLY` 才校验 `exporter.url` 必须是非空 `http:` / `https:`。 [E: packages/session/session-telemetry-otel/src/index.ts:59] [E: packages/session/session-telemetry-otel/src/index.ts:160] [E: packages/session/session-telemetry-otel/src/index.ts:165] [E: packages/session/session-telemetry-otel/src/index.ts:172] [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:396] [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:488]

5. **上传模式才组 SDK + coordinator。** Resource 一次带上 `service.name` / `service.version`（`APP_IDENTITY`）和 `user.id: getOrCreateAnonymousUserId()`。id 来自 `join(resolveDshHome(...), '.anonymous-user-id')`：随机 UUID 一行，按 home 作用域，删文件下次重铸。`FULL`：`directEmit = enqueue`，`new SessionTelemetryCoordinator(ctx, backend, 'live')`。`FEEDBACK_ONLY`：`directEmit = DROP_RECORD`，coordinator 用 `'on-demand'`，另听 committed `feedback/record` 才 `captureSession(session, event.seq)`。 [E: packages/session/session-telemetry-otel/src/index.ts:204] [E: packages/identity/anonymous-user-id/src/index.ts:29] [E: packages/identity/anonymous-user-id/src/index.ts:69] [E: packages/session/session-telemetry-otel/src/index.ts:237] [E: packages/session/session-telemetry-otel/src/index.ts:239] [E: packages/session/session-telemetry-otel/src/index.ts:243]

6. **live capture 订的是 emit / parallel，没有 `next()`。** `capture === 'live'` 时 coordinator 登记：`session/created` → `adopt`；`session/disposed` → 发 `shutdown` ops 并 `adopted.delete`；`session/event` → `captureEvent`；`session/flush` → `hintFlush`（只对已 adopt 的 session 调可选 `backend.flush?.()`）；`agent/error` → ops `agent-error`。然后对 `ctx.sessions.list()` 扫一遍（HMR 不会重放 `session/created`）。`session/event` 声明是 **emit**（签名没有 `next`）；`session/flush` 是 **parallel**。`append` 先 `log.push` 再 fire-and-forget 观察者：observer 失败不能回滚已提交事件。 [E: packages/session/session-telemetry/src/coordinator.ts:79] [E: packages/session/session-telemetry/src/coordinator.ts:80] [E: packages/session/session-telemetry/src/coordinator.ts:91] [E: packages/session/session-telemetry/src/coordinator.ts:98] [E: packages/core/session/src/index.ts:76] [E: packages/core/session/src/index.ts:85] [E: packages/core/session/src/index.ts:643] [E: packages/core/session/src/index.ts:646]

7. **`session-telemetry/record` 才是 waterfall，必须 `next()`。** `redact` 调 `this.ctx.waterfall('session-telemetry/record', record, () => record)`。innermost `next` 原样交回：本包 **零** shipped 脱敏规则。Cordis `Events.waterfall` 把最后一个参数当 innermost `next`；listener 不调用传入的 `next()` 就不会 `shift`，内侧规则整段被替换。部署挂上的规则叠在 `next()` 返回值上。抛错走 `contain`：该条扣下（fail-closed），`backend.records` 为空，但 `session.events` 仍在。测试：无 listener 时 `body` 里的 fixture secret 原样到达 backend；规则把 `body` 改成 `null` 也不动 canonical log。 [E: packages/session/session-telemetry/src/coordinator.ts:214] [E: packages/session/session-telemetry/src/index.ts:43] [E: vendor/cordis/src/events.ts:238] [E: packages/session/session-telemetry/tests/redact.spec.ts:47] [E: packages/session/session-telemetry/tests/redact.spec.ts:126] [E: packages/session/session-telemetry/tests/redact.spec.ts:76]

8. **投影：每 (turn, step) 只出第一个 `assistant/chunk`。** `captureEvent` 对 chunk 用 `turn:step` 做 seen 集；第二次及以后直接 `return`，**不** `deliver`，因此 **不**推进 `handoffCursor`。内容以该步组装后的 `assistant/message` 为准。`adopt` / `captureSession` 从 `handoffCursor.get(session) ?? session.firstLiveSeq - 1` 起：构造 seed（resume / fork 前缀）不重交，只 `track` 进 seen。代价是 at-most-once：上一进程没送出去的记录，本进程不再补。`deliver` 先 `backend.emit`，成功后才 `handoffCursor.set`。`contain` 吞掉 backend / 规则异常并 `logger.warn`，避免 Cordis emit stop-on-throw 饿死排在后面的 `session/event` 订阅者（例如 projection registry）。 [E: packages/session/session-telemetry/src/coordinator.ts:188] [E: packages/session/session-telemetry/src/coordinator.ts:139] [E: packages/core/session/src/index.ts:539] [E: packages/session/session-telemetry/src/coordinator.ts:219] [E: packages/session/session-telemetry/src/coordinator.ts:265] [E: packages/session/session-telemetry/tests/telemetry.spec.ts:173]

9. **`session/flush` hint 不挡 turn；OTel 故意不实现 `flush()`。** live listener 对 `session/flush` 只调用 `backend.flush?.()` 并立刻返回，测试钉死 parallel 不等待 backend 里踢出的 50ms 定时器。`OpenTelemetrySessionBackend` **没有** `flush`：导出节奏交给 `processor.scheduledDelayMillis`。并发 `forceFlush` 会跟 shutdown drain 打架、丢掉尾记录。`DISABLED` / `FEEDBACK_ONLY` 的 on-demand 路径根本不登记 flush / `agent/error` / `session/disposed`。 [E: packages/session/session-telemetry/src/coordinator.ts:225] [E: packages/session/session-telemetry/tests/telemetry.spec.ts:445] [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:266] [E: packages/session/session-telemetry/tests/telemetry.spec.ts:268]

10. **`FEEDBACK_ONLY` 只在 committed `feedback/record` 上回放前缀。** listener 要求 `session.events[event.seq] === event`；总线伪造、尚未入 log 的同名事件只 warn `session telemetry ignored a feedback event absent from the canonical session log`，不 capture。`throughSeq` 含该条 feedback。再次 `recordFeedback` 只交出 cursor 之后的后缀。直调 `ctx.sessionTelemetry.emit` 在此 mode 是 no-op。测试：导出 type 序列是 `turn/start, feedback/record, turn/end, feedback/record`，且 **没有** `/ops` scope。 [E: packages/session/session-telemetry-otel/src/index.ts:247] [E: packages/session/session-telemetry-otel/src/index.ts:251] [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:302] [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:305]

11. **卸店：先 ops `shutdown`，再 `backend.shutdown()`。** live fiber 的 `ctx.effect` disposer：仍在 `adopted` 里的 session（整进程退出、尚未 `session/disposed`）各发一条 `telemetry.op: shutdown`，然后 `await this.backend.shutdown()`。失败只 `logger.warn`，不让 teardown 失败。`session/disposed` 已经发过的不会再发。OTel `shutdown` 用 `shutdownTimeoutMillis`（默认 3000）去 race provider；`DISABLED` 无 provider，立刻 resolve。`/feedback` 读 `ctx.get('sessionTelemetry')`：有服务则按 `sharing` 说 full / feedback-gated / disabled；无服务（行被 `DSH_TELEMETRY_DISABLED` 卸掉）说 “not configured”。 [E: packages/session/session-telemetry/src/coordinator.ts:117] [E: packages/session/session-telemetry/src/coordinator.ts:121] [E: packages/session/session-telemetry-otel/src/index.ts:284] [E: packages/feedback/command-feedback/src/index.ts:50] [E: packages/feedback/command-feedback/src/index.ts:92]

12. **`sessionStats` 是 projection Consumer，不是 telemetry backend。** `apply(ctx)` 只 `ctx.sessionProjections.register(sessionStatsProjectionDefinition)`。registry 在 `session/event` 上 **emit** 驱动 `drive`，签名没有 `next`。`apply` 里 `step/end` 才 `steps += 1`，并在 `lastTurn !== event.data.turn` 时 `turns += 1`；`assistant/message` 只累加 `llmMs` / `ttft*` / `decode*`，并关掉 `openStep`。取消步：loop 的 `finally` 仍写 `step/end`、可能没有组装 message → 计 1 步、墙钟为 0。max-tokens 空 content 的 usage-host `assistant/message` 不加第二步。`pendingCalls` 用 `Object.hasOwn`，避免 `callId === 'toString'` 把继承函数折进 `toolMs`。 [E: packages/session/session-stats/src/index.ts:20] [E: packages/session/session-projection/src/index.ts:181] [E: packages/session/session-stats/src/projection.ts:155] [E: packages/session/session-stats/src/projection.ts:159] [E: packages/session/session-stats/src/projection.ts:126] [E: packages/session/session-stats/tests/projection.spec.ts:109] [E: packages/session/session-stats/src/projection.ts:148]

这些事件形态不要混：`session/event` = emit；`session/flush` = parallel；`session-telemetry/record` = waterfall（必须 `next()`，否则内侧规则与 innermost 透传都不跑）；`llm/stream` / `tools/execute` 上的 checkpoint 是另一组 waterfall，先 `flush` 再 `next()`。

## 设计动机

DSH 是组合运行时，不是「内存 messages + 事后再写一份 analytics」的 coding agent。模型下一轮看见的 `messages` 只能从 append-only log 的 `surfaceOp` 重建（**model-visible ⟺ logged**）。telemetry 站在 log **之外**：它拷贝已提交事件，走独立 waterfall 做（可选）脱敏，再交给上报 SDK。canonical log 仍是权威；导出脏不脏，完全取决于部署有没有挂 `session-telemetry/record` 规则——shipped 树一条都没有，所以默认导出就是 raw captured copy。

把 capture（coordinator）和 export（SDK batch / retry / loss）切开，是为了让换 backend 不必重写 adoption / chunk 投影 / HMR cursor。OTel 包只拥有 mode、Resource 上的匿名 `user.id`、以及 SDK `forceFlush` 等不到 socket 时的外层 `shutdownTimeoutMillis`。

默认 `DISABLED`、再用 `DSH_TELEMETRY_DISABLED` 把整行卸掉，是同一条隐私梯子的两级：前者保留服务键，让 `/feedback` 能说出 “disabled”；后者连键都没有，确认文案变成 “not configured”。非空即关（含 `'0'` / `'false'`）是 off-by-mistake 优于 on-by-mistake。

`sessionStats` 故意不走 OTLP。它是给 Web 聊天条的 whole-log 数字：paging 与 compaction 都不能改已经闭合的步数，因为 compaction 只 `replace`、不删 `step/end`。计 `step/end` 而不是 `assistant/message`，是为了取消步不漏计、max-tokens usage-host 空消息不双计。

## Gotcha

- **`mode: DISABLED` ≠ `DSH_TELEMETRY_DISABLED`。** 前者插件在、服务在、`sharing === 'disabled'`、feedback 打 local warn；后者行不加载、`ctx.get('sessionTelemetry')` 为 `undefined`。 [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:389] [E: apps/cli/src/profile-boot.ts:82]
- **`'0'` / `'false'` 也会卸行。** 不要按布尔解析这个环境变量。 [E: apps/cli/tests/telemetry-switch.spec.ts:12]
- **零 shipped 脱敏。** 用户消息里的 token / 路径会原样进 ledger `body`，除非部署自己挂 waterfall。 [E: packages/session/session-telemetry/tests/redact.spec.ts:47]
- **规则抛错扣该条；跳过 `next()` 是整链替换。** 两种都不是「改 log」。 [E: packages/session/session-telemetry/tests/redact.spec.ts:114] [E: packages/session/session-telemetry/tests/redact.spec.ts:126]
- **OTel 没有 `flush()`。** 把 `session/flush` 当成「等 OTLP 送完再进下一步」是错的。耐久否决在 checkpoint 的 `llm/stream` / `tools/execute` 上。 [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:266]
- **丢掉的 continuation chunk 不推进 cursor。** 重挂会按 ≤cursor 的首 chunk 再 drop 同一 `turn:step`。 [E: packages/session/session-telemetry/src/coordinator.ts:188]
- **resume 不补上一进程没送出的记录。** adoption 从 `firstLiveSeq` 起，at-most-once。 [E: packages/session/session-telemetry/src/coordinator.ts:139]
- **`FEEDBACK_ONLY` 不产 ops。** 没有 live `shutdown` / `agent-error`。直调 `emit` 也丢。 [E: packages/session/session-telemetry-otel/tests/otel.spec.ts:305]
- **`user.id` 在 Resource，不在每条 record。** 而且只在上传模式构造 SDK 时读取；DISABLED 根本没有 Resource。 [E: packages/session/session-telemetry-otel/src/index.ts:204]
- **`sessionStats` 不是上报。** 从未挂插件时 snapshot 没有 `sessionStats` 键；`fiber.dispose()` 之后同样丢掉该键。headless 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有 `session-stats`。 [E: packages/session/session-stats/tests/projection.spec.ts:139] [E: packages/session/session-stats/tests/projection.spec.ts:146] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]
- **shipped session-query 默认 `openAt: never`。** base 挂 `session-query-sqlite`；不是本缝开了 FTS。 [E: packages/bundle/base/cordis.patch.yml:121]
- **storage / workspace / projection-cache 只 web-app。** 与 `session-stats` 同层 insert；headless insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]
- **contain 保护的是别的 emit 订阅者，不是「这条一定发出去」。** backend `emit` 抛 → 该 seq 不进 cursor，后续事件仍可 adopt。 [E: packages/session/session-telemetry/tests/telemetry.spec.ts:415]
- **header `version` 与 SQLite `user_version` 不是一回事。** 崩过的盘仍要 `version === 0` 才能打开；换未 shipped 的 SQLite backend 还要 `SCHEMA_VERSION === 15`。本页不负责迁盘。

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-telemetry` 的 `SessionTelemetryBackend` / `SessionTelemetryRecord` / `session-telemetry/record` | `ctx.sessionTelemetry`。waterfall 必须 `next()` 才会把 raw copy 交给 innermost；emit / parallel 的 session 总线没有 `next` | **无**独立 Cordis 行 | 无 | 无 |
| Provider | `@deepseek-ai/dsh-session-telemetry-otel` 的 `OpenTelemetrySessionBackend`；构造里 compose `SessionTelemetryCoordinator` | 同一 `ctx.sessionTelemetry`。`sharing` ∈ `full` / `feedback-only` / `disabled`。`FULL` = live；`FEEDBACK_ONLY` = on-demand；`DISABLED` = 无 SDK | `id: session-telemetry-otel`，`mode: DSH_TELEMETRY_MODE \|\| 'DISABLED'`；同层 `id: session-persistence-jsonl`（`root: dshHomePath('sessions')`）+ `id: session-query-sqlite`（`openAt: never`） | **继承** otel / jsonl / query，不重挂 | **继承** otel / jsonl / query，不重挂 |
| Consumer | `/feedback`（`dsh-command-feedback`）读 `sharing`；部署可挂 `session-telemetry/record` 规则（shipped **零**条） | `ctx.get('sessionTelemetry')` 机会读取。registry 的 `sessionStats` 是 **另一条** 缝：`inject: ['sessionProjections']` | `id: command-feedback`；无 stats | **继承** feedback；另插 `id: session-stats`；`storage` / `workspace` / `session-projection-cache` **只 web-app** | **继承** feedback；**无** stats / storage / workspace / projection-cache |

换 OTLP 终点只改 `exporter` / `processor` passthrough，不能改 `Session.append` 或 `deriveMessages()`。preset 若再 `provide` 一份 `sessionTelemetry` 且不 `isolate`，会撞上 host 面 `leakedServices`，与其它 process-global 缝相同。`session-stats` 不是 Provider：它只 `register` 一个同步 unit，drive 权在 [subsys.persistence.projection](projection.md)。shipped log 介质是 base 行 `session-persistence-jsonl`（`root: dshHomePath('sessions')`）。同层 `session-query-sqlite` 写 `openAt: never`。`storage` / `workspace` / `session-projection-cache` 只出现在 web-app insert。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]

CLI 入口如何把 `DSH_TELEMETRY_DISABLED` 叠进 profile overlay，见 [surface.cli.overview](../../surface/cli/overview.md)。

## Sources

- packages/session/session-telemetry/src/index.ts
- packages/session/session-telemetry/src/coordinator.ts
- packages/session/session-telemetry/tests/redact.spec.ts
- packages/session/session-telemetry/tests/telemetry.spec.ts
- packages/session/session-telemetry-otel/src/index.ts
- packages/session/session-telemetry-otel/tests/otel.spec.ts
- packages/session/session-stats/src/index.ts
- packages/session/session-stats/src/projection.ts
- packages/session/session-stats/src/types.ts
- packages/session/session-stats/tests/projection.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/src/profile-boot.ts
- apps/cli/tests/telemetry-switch.spec.ts
- packages/identity/anonymous-user-id/src/index.ts
- packages/feedback/command-feedback/src/index.ts
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/session/session-projection/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/settings/settings/src/index.ts
- packages/credentials/credentials-local/src/index.ts
- packages/llm/llm-deepseek/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages()`、`session/event` emit 与 `session/flush` parallel。
- [subsys.persistence.projection](projection.md)：`ctx.sessionProjections` registry；`sessionStats` 只是其中一个 unit。
- [surface.cli.overview](../../surface/cli/overview.md)：`DSH_TELEMETRY_DISABLED` 在 `runProfile` overlay 上的位置。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer 三角。
- [subsys.core.session](../core/session.md)：`Session.append`、`SESSION_FORMAT_VERSION = 0`、`SurfaceOp` 没有 delete。
- [subsys.persistence.checkpoint](checkpoint.md)：adapter / top-level tool 之前的 fail-closed `flush`；与本页 flush hint 不是同一扇门。
- [subsys.interaction.commands](../interaction/commands.md)：`ctx.commands`；`/feedback` 挂在这条注册表上。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 backend；base 行 `root: dshHomePath('sessions')`。
- [subsys.persistence.session-query](session-query.md)：shipped `openAt: never`；search 默认关。
- [subsys.persistence.storage](storage.md)：只 web-app 的 `ctx.storage` + domain。
- [subsys.persistence.workspace](workspace.md)：只 web-app 的 workspace 实体，与 `session-stats` 同层 insert。
