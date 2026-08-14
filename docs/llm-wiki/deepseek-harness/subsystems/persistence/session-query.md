---
id: subsys.persistence.session-query
title: session-query 检索
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session-query/session-query/src/index.ts
  - packages/session-query/session-query/src/corpus.ts
  - packages/session-query/session-query/src/config.ts
  - packages/session-query/session-query/src/documents.ts
  - packages/session-query/session-query/src/tracing.ts
  - packages/session-query/session-query/src/types.ts
  - packages/session-query/session-query/src/sources.ts
  - packages/session-query/session-query/tests/session-query.spec.ts
  - packages/session-query/session-query-sqlite/src/index.ts
  - packages/session-query/session-query-sqlite/src/schema.ts
  - packages/session-query/session-query-sqlite/src/query.ts
  - packages/session-query/session-query-sqlite/tests/sqlite.spec.ts
  - packages/session-query/session-query-sqlite/tests/query.spec.ts
  - packages/session-query/session-log-export/src/index.ts
  - packages/session-query/session-log-export/src/client/index.ts
  - packages/session-query/session-log-export/src/client/controller.ts
  - packages/session-query/session-log-export/tests/command.client.spec.ts
  - packages/session-query/tool-session-query/src/index.ts
  - packages/session-query/tool-session-query/src/workspace-access.ts
  - examples/acp-agent/session-query.cordis.yml
  - packages/host/apiproxy/src/session-export.ts
  - packages/host/apiproxy/src/fetch/handler.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/session/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/session-query/session-query/src/extraction.ts
  - packages/session/session-persistence/src/coordinator.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/session/session-title/src/index.ts
  - vendor/cordis/src/events.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/tests/settings.spec.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
symbols:
  - SessionQueryEngine
  - SqliteSessionQueryEngine
  - SESSION_QUERY_SQLITE_SCHEMA_VERSION
  - session-log-download
related:
  - spine.session-log
  - surface.tools.session-query
  - subsys.persistence.jsonl
  - subsys.persistence.attachment
  - spine.overview
  - spine.capability-seams
  - subsys.core.session
  - subsys.persistence.session-persistence
  - subsys.persistence.sqlite
  - subsys.persistence.checkpoint
  - subsys.persistence.title
  - subsys.host.apiproxy
  - subsys.persistence.workspace
  - subsys.persistence.storage
  - subsys.persistence.projection
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.sessionQuery` 是 **host 面** 的 live-preferred 会话检索缝：基类 `SessionQueryEngine` 拥有精确读 / lineage / title fold；子类 `SqliteSessionQueryEngine` 另做 FTS5 派生索引。shipped 默认 `openAt: never` + `path: ':memory:'`，search 抛 `SESSION_QUERY_SEARCH_DISABLED` 且不 import `node:sqlite`。这是 Cordis 组合运行时（`profile → bundle → agent preset`）上的只读投影，不是 session 盘，也不是模型可见五件套的 schema 页。

## 能回答的问题

- `ctx.sessionQuery` 谁 provide？base / web-app / headless 各挂什么行？`openAt: never` 之后哪些 API 还活着？persist 默认是不是 `session-persistence-jsonl` / `dshHomePath('sessions')`？`storage` / `workspace` / `session-projection-cache` 哪一层才有？
- live 记录和 persist 记录谁赢？精确读走 `inspect` 还是 `load`？会不会 `commitRepair`？
- FTS schema version 是 8 还是 15？版本不匹配是拒盘还是丢派生表重建？`application_id` `DSHQ` 和 session 盘 `DSHP` 差在哪？
- 调用方的 `query` 是 FTS 语法还是 data？`quoteFtsData` 怎样把 `OR` / `*` 变成短语？
- `/export` 命令收不收 path？ZIP 字节在哪一层？`traceSession` 给谁用？
- 模型五件套的 ACL 在 engine 里还是 tool 包里？四个 shipped preset 装不装 `tool-session-query`？

## 职责边界

本缝拥有：`ctx.sessionQuery` 的 Service Definition（`SessionQueryEngine`）与 shipped Provider（`SqliteSessionQueryEngine`）；live-preferred 语料解析（`SessionCorpus`）；精确读 / filter / title fold / lineage / event 关系；可选 FTS5 派生索引的打开策略（`openAt`）、schema 8 重建、以及把 caller `query` 当 data 的 MATCH 编译。`session-log-download`（`@deepseek-ai/dsh-session-log-export`）只拥有 Web 人命令 `/export` 与浏览器 dialog / Header 按钮，不拥有 ZIP 字节。 [E: packages/session-query/session-query/src/index.ts:88] [E: packages/session-query/session-query-sqlite/src/index.ts:196] [E: packages/session-query/session-log-export/src/index.ts:6]

本缝**不**拥有：append-only `SessionEvent` 日志与 `deriveMessages()`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；JSONL 盘布局（[subsys.persistence.jsonl](jsonl.md)）；仓库里未 bundled 的 session 盘 SQLite `SCHEMA_VERSION = 15`（[subsys.persistence.sqlite](sqlite.md)）；`session/event` 入队与 `session/flush` 写窗（[subsys.persistence.session-persistence](session-persistence.md)）；adapter / top-level tool 之前的 fail-closed `flush`（[subsys.persistence.checkpoint](checkpoint.md)）；`session/title` 怎样写出（[subsys.persistence.title](title.md)）；图片字节（[subsys.persistence.attachment](attachment.md)）；ZIP 流与 `GET /api/session.export`（[subsys.host.apiproxy](../host/apiproxy.md)）；模型五件套字段表与 workspace ACL（[surface.tools.session-query](../../surface/tools/session-query.md)）；**只 web-app** 的 `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`（[subsys.persistence.storage](storage.md)、[subsys.persistence.workspace](workspace.md)、[subsys.persistence.projection](projection.md)）。

正交、写错会污染邻页的事实（本页只点名）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。别的 version **没有**自动 migration：更新的盘叫人升级 harness，更旧的盘「本 build 无升级路径」。这跟 FTS `user_version` 正交。 [E: packages/core/session/src/types.ts:56] [E: packages/session/session-persistence/src/coordinator.ts:1047] [E: packages/session/session-persistence/src/coordinator.ts:79] [E: packages/session/session-persistence/src/coordinator.ts:80]
- SQLite **session 盘** `SCHEMA_VERSION = 15`：`user_version` 非 0 且不等于 15 → 拒开，原地不迁。那张盘**不**在任何 shipped bundle。本页的派生库是另一张 SQLite。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108] [E: packages/session/session-persistence-sqlite/src/schema.ts:109]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete。`SurfaceOp` 联合只有 `'append'` 与 `{ op: 'replace'; start; end }`。检索把被 shadow 的 surface 标成 `shadowed`，不从 `this.log` 删事件。 [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374] [E: packages/session-query/session-query/src/documents.ts:71]
- settings 分层：schema defaults → composition `base` → user document。`SettingsScope.get` 返回 register 时 `resolve` 写进 `registration.resolved` 的值。 [E: packages/settings/settings/src/index.ts:447] [E: packages/settings/settings/src/index.ts:458] [E: packages/settings/settings/src/index.ts:705] [E: packages/settings/settings/tests/settings.spec.ts:95]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`.credentials.yaml` 存的是非空 secret **字符串**，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:178] [E: packages/credentials/credentials-local/src/index.ts:181] [E: packages/credentials/credentials-local/src/index.ts:183]
- shipped JSONL 后端挂在 base：`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。headless / web 继承这一行，自己不重挂。query 冷路径 `inspect` 默认落这条盘。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101]
- **只 web-app**：`storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain`、`workspace`、`session-projection-cache`。base / headless **没有**这些行。`session-log-export`（`id: session-log-download`）同样只 web-app。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/cordis.patch.yml:57] [E: packages/bundle/web-app/cordis.patch.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:70] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

这是 **host 面** 进程级服务。agent-preset 面不 remount `sessionQuery`。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI 包。Client 半边只消费 `/export` dialog，不实现 engine。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session-query/session-query/src/index.ts` | Definition：`SessionQueryEngine` 占住 `ctx.sessionQuery`；精确读 / filter / title / lineage |
| `packages/session-query/session-query/src/corpus.ts` | `SessionCorpus`：live 优先；冷路径 `inspect`，不 `load` |
| `packages/session-query/session-query/src/documents.ts` | `buildSessionEventSearchDocuments`：抽文本 + `current` / `shadowed` / `log-only` |
| `packages/session-query/session-query/src/extraction.ts` | `extractSessionEventText`：哪些 event type 进 FTS 文档 |
| `packages/session-query/session-query/src/tracing.ts` | `traceSession` / `traceEvent` / `currentSurfaceEvents` |
| `packages/session-query/session-query/src/config.ts` | `SessionQueryError` 与 `SESSION_QUERY_SEARCH_DISABLED` 等 code |
| `packages/session-query/session-query-sqlite/src/index.ts` | Provider：`SqliteSessionQueryEngine`；`openAt`；串行 reconcile + FTS |
| `packages/session-query/session-query-sqlite/src/schema.ts` | `SESSION_QUERY_SQLITE_SCHEMA_VERSION = 8`、`application_id = 0x44534851`、丢表重建 |
| `packages/session-query/session-query-sqlite/src/query.ts` | `quoteFtsData`、filter SQL、snippet |
| `packages/session-query/session-query-sqlite/tests/sqlite.spec.ts` | `openAt: never`、schema 8 重建、first-search |
| `packages/session-query/session-log-export/src/index.ts` | host 命令 `/export`（`name = 'session-log-download'`） |
| `packages/session-query/session-log-export/src/client/index.ts` | 听 `command/executed` emit，打开 dialog |
| `packages/host/apiproxy/src/session-export.ts` | ZIP 流；`traceSession` 收子孙 |
| `packages/session-query/tool-session-query/src/workspace-access.ts` | 模型面 ACL（cwd 相等）；不在 engine |
| `packages/bundle/base/cordis.patch.yml` | shipped 行 `id: session-query-sqlite`，`openAt: never`；同层 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')` |
| `packages/bundle/web-app/cordis.patch.yml` | 重申 `:memory:` + `never`；insert `session-log-download`；**只 web-app** 另 insert `storage*` / `workspace` / `session-projection-cache` |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner`；不重挂 jsonl / query；无 storage / workspace / projection-cache |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SessionQueryEngine` | 抽象 Cordis service，键 `ctx.sessionQuery`。`inject = ['sessions']`。`sessionPersistence` 是可选动态绑定，不是静态 inject。 [E: packages/session-query/session-query/src/index.ts:82] |
| `SqliteSessionQueryEngine` | 唯一 shipped 实现。类默认 `openAt: 'startup'`；**bundle 覆盖成 `never`**。 [E: packages/session-query/session-query-sqlite/src/index.ts:201] |
| `OpenAt` | `'startup'` / `'first-search'` / `'never'`。`never`：search 在规范化之前失败，不 import / 不 open SQLite。 [E: packages/session-query/session-query-sqlite/src/index.ts:86] |
| `SESSION_QUERY_SQLITE_SCHEMA_VERSION` | `8`。派生索引的表布局，不是 session event `version`，也不是 persistence `SCHEMA_VERSION`。 [E: packages/session-query/session-query-sqlite/src/schema.ts:8] |
| `SESSION_QUERY_SQLITE_APPLICATION_ID` | `0x44534851`（`DSHQ`）。错 application_id → 拒开，不重建。 [E: packages/session-query/session-query-sqlite/src/schema.ts:11] |
| `SessionRecord` | `{ header, live, persisted }`。同一 id 可同时 `live: true` 且 `persisted: true`。 |
| `SessionEventSurface` | `'current'` / `'shadowed'` / `'log-only'`。`shadowed` 来自 `foldSurface` 的 replace 区间，不是 delete。 [E: packages/session-query/session-query/src/types.ts:21] |
| `SessionQueryError.code` | 含 `SESSION_QUERY_SEARCH_DISABLED`、`SESSION_QUERY_SESSION_NOT_FOUND`、`SESSION_QUERY_STALE_CURSOR`、`SESSION_QUERY_SOURCE_CONFLICT`。 [E: packages/session-query/session-query/src/config.ts:34] [E: packages/session-query/session-query/src/config.ts:35] [E: packages/session-query/session-query/src/config.ts:36] [E: packages/session-query/session-query/src/config.ts:37] |
| `quoteFtsData` | 把规范化后的 query 包成一条 FTS5 phrase：`"` + 内部 `"` 加倍 + `"`。MATCH 绑定走这个返回值，不是 caller 原文。 [E: packages/session-query/session-query-sqlite/src/query.ts:223] [E: packages/session-query/session-query-sqlite/src/query.ts:224] |

FTS 持久表是 `search_state` / `persisted_sessions` / `persisted_docs`（FTS5 `unicode61`）。live 行落在 `TEMP`：`temp.live_sessions` / `temp.live_docs`。连接关掉，live 半边就没了。 [E: packages/session-query/session-query-sqlite/src/schema.ts:106] [E: packages/session-query/session-query-sqlite/src/schema.ts:143]

## 控制流

1. **host 组合挂 Provider。** `dsh-base` insert 行 `id: session-query-sqlite` / `name: '@deepseek-ai/dsh-session-query-sqlite'`，`config.path: ':memory:'`，`config.openAt: never`。同层 persist 行是 `id: session-persistence-jsonl` / `name: '@deepseek-ai/dsh-session-persistence-jsonl'`，`root: dshHomePath('sessions')`。`dsh-web-app` 用同 id 整行重申 query 的 `:memory:` + `never`，**不**重挂 jsonl。`dsh-web-app` 另 insert **只 web-app** 的 `storage` + `storage-json`（`root: dshHomePath('storages')`）+ `storage-domain`、`workspace`、`session-projection-cache`，以及 `session-log-download`。`dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，不重挂 query / jsonl，也没有 storage / workspace / projection-cache，因此继承 base 的 `never` + `:memory:` 与 jsonl root。精确读 / title / `traceSession` 仍走基类；search 才被 `openAt: never` 拒绝。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:99] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:117] [E: packages/bundle/base/cordis.patch.yml:118] [E: packages/bundle/base/cordis.patch.yml:120] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:30] [E: packages/bundle/web-app/cordis.patch.yml:32] [E: packages/bundle/web-app/cordis.patch.yml:33] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/cordis.patch.yml:57] [E: packages/bundle/web-app/cordis.patch.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:70] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **构造时占住 `ctx.sessionQuery`。** `SessionQueryEngine` 构造 `super(ctx, 'sessionQuery')`，并建 `SessionCorpus`。 [E: packages/session-query/session-query/src/index.ts:88] `SqliteSessionQueryEngine` 再 `ctx.inject(['sessionPersistence'], …)` 绑可选 persistence；没有 persistence 时精确读只看见 live。 [E: packages/session-query/session-query-sqlite/src/index.ts:235] `SessionCorpus` 自己也对 `sessionPersistence` 做同样的 optional inject。 [E: packages/session-query/session-query/src/corpus.ts:40] `static inject` 两边都只有 `['sessions']`。 [E: packages/session-query/session-query/src/index.ts:82] [E: packages/session-query/session-query-sqlite/src/index.ts:197] 本缝**不**听 `session/event`，也**不**实现 `session/flush`。

3. **精确列目录：persist 垫底，live 覆盖。** `SessionCorpus.listSessions` 先 `persistence.list`（若已绑定），每条写成 `{ live: false, persisted: true }` [E: packages/session-query/session-query/src/corpus.ts:65]；再扫 `ctx.sessions.list()`，同 id 覆盖成 `live: true`，`persisted` 取决于是否已有盘上行 [E: packages/session-query/session-query/src/corpus.ts:72]。排序是 `createdAt` 降序，再 `id` 升序 [E: packages/session-query/session-query/src/corpus.ts:300]。测试把同 id 标成 `[id, live: true, persisted: true]` [E: packages/session-query/session-query/tests/session-query.spec.ts:1063]；`readEvent` 读到 live 文本 `live`，不是 persist 文本 `persisted` [E: packages/session-query/session-query/tests/session-query.spec.ts:1066]；`readSurface` 同样命中 live 文本 [E: packages/session-query/session-query/tests/session-query.spec.ts:1068]；把 persist header 的 `cwd` 改成冲突值后 `listSessions` 抛 `SESSION_QUERY_SOURCE_CONFLICT` [E: packages/session-query/session-query/tests/session-query.spec.ts:1079]；`delegationDepth` 冲突同样抛 [E: packages/session-query/session-query/tests/session-query.spec.ts:1081]。

4. **精确加载：已知 live 永不问盘。** `SessionCorpus.load` 先 `ctx.sessions.get`；命中则立刻返回 live 快照。 [E: packages/session-query/session-query/src/corpus.ts:90] 冷路径才 `list` + `inspectPersisted`（即 `SessionPersistence.inspect`）。 [E: packages/session-query/session-query/src/corpus.ts:101] coordinator 的 `inspect` 走 `preparations.inspect`，**不** `commitRepair` [E: packages/session/session-persistence/src/coordinator.ts:794]；`load` 才会 `preparations.reserve` 并把 `commitPrepared` 当 commit 回调 [E: packages/session/session-persistence/src/coordinator.ts:764]。query 选 inspect，所以检索 / export lineage / title fold 不会把 crash-tail 写回盘。inspect 过程中若 id 变成 live，再切回 live 快照。

5. **`readSession` 重放但不入店。** 基类 `readSession` 在 corpus 快照上调用 `Session.create(sessionId, loaded.events, loaded.header)` 做与 resume 相同的 surface 校验，然后交回克隆。 [E: packages/session-query/session-query/src/index.ts:145] [E: packages/session-query/session-query/src/index.ts:146] 它不 `sessions.enter` / `announce`。`readSurface` 把 `events` 设成 `tracing.currentSurfaceEvents(...)` [E: packages/session-query/session-query/src/index.ts:268]；`analyzeEventLog` 调用 `foldSurface` [E: packages/session-query/session-query/src/tracing.ts:181]（定义在 `surface.ts`）[E: packages/core/session/src/surface.ts:387]。`readEvent` 用 `_readWindow` 切 `before`/`after` [E: packages/session-query/session-query/src/index.ts:308]；缺省时 `_readWindow` 返回 `0` [E: packages/session-query/session-query/src/index.ts:348]；上限是 `SESSION_QUERY_READ_WINDOW_MAX`（`50`）[E: packages/session-query/session-query/src/config.ts:6]，构造写成 `config.readWindowMax ?? SESSION_QUERY_READ_WINDOW_MAX` [E: packages/session-query/session-query/src/index.ts:89]。

6. **title 是 log-only fold。** `readTitleSnapshots` 经 `projectMany` 对每个 id 调 `foldSessionTitle(source.events)` [E: packages/session-query/session-query/src/index.ts:209]：`findLast` 取最后一条 `session/title` [E: packages/session/session-title/src/index.ts:192]。没有该事件则 `title` 缺省。标题不进 `deriveMessages()`；本页只读，不调度 LLM title provider。

7. **lineage / event 关系不碰 FTS。** `traceSession` 先 `listSessions` [E: packages/session-query/session-query/src/index.ts:280]，再沿 `header.parentSession` 往上走 [E: packages/session-query/session-query/src/tracing.ts:129]；环抛 `SESSION_QUERY_INVALID_LINEAGE`；缺父则 `complete: false` 并带 `unresolvedParentId`。子孙按 `createdAt`/`id` 递归。`traceEvent` 用同一次 `foldSurface`：`replace` 的 `shadowedSeqs` 变成 `replacedBy` 链，`sourceEventSeqs` 变成直接引用。`session/flush` 是 **parallel**（签名没有 `next`）[E: packages/core/session/src/index.ts:85]；实现是 `Promise.allSettled` [E: packages/core/session/src/index.ts:1026]。这些读路径也不在任何 waterfall 上，没有人必须 `next()`。

8. **`openAt: never` 把门开在 SQLite 之前。** `searchSessions` / `searchEvents` 第一句是 `_assertSearchEnabled()`：`openAt === 'never'` 则抛 `SESSION_QUERY_SEARCH_DISABLED`，不跑 `normalize*`、不 `_ensureReady`、不 reconcile。`openSearchDatabase` 里的 `await import('node:sqlite')` 因此不会执行。测试：never 模式下 `listSessions` / `traceSession` 仍成功，配置的磁盘 path 在 mount / search / dispose 全程 `ENOENT`。类默认 `openAt` 虽是 `'startup'`，shipped bundle 把它盖成 `never`。 [E: packages/session-query/session-query-sqlite/src/index.ts:260] [E: packages/session-query/session-query-sqlite/src/index.ts:327] [E: packages/session-query/session-query-sqlite/src/index.ts:330] [E: packages/session-query/session-query-sqlite/src/schema.ts:52] [E: packages/session-query/session-query-sqlite/tests/sqlite.spec.ts:248]

9. **`startup` / `first-search` 才碰派生库。** `Service.init` 仅当 `openAt === 'startup'` 才 `_ensureReady` [E: packages/session-query/session-query-sqlite/src/index.ts:253]。`first-search` 发布 ACTIVE 服务但不建文件；`_ensureReady` 用 `this._ready ??= this._open()` 让第一次 search 共享同一个 promise [E: packages/session-query/session-query-sqlite/src/index.ts:358]。顺序两次 search 只 `_open` 一次 [E: packages/session-query/session-query-sqlite/tests/sqlite.spec.ts:278]。并发 first-search 从同一条 readiness it 起跑 [E: packages/session-query/session-query-sqlite/tests/sqlite.spec.ts:281]，两条 search 都启动后 `_open` 仍只被调用一次 [E: packages/session-query/session-query-sqlite/tests/sqlite.spec.ts:302]。打开后 `_serialized` 用 `_tail` 串行化：同时只有一个 reconcile + query [E: packages/session-query/session-query-sqlite/src/index.ts:371]。这是服务内部队列，不是 Cordis waterfall。

10. **schema 8：认得出就重建，认不出就拒。** `openSearchDatabase` 读 `PRAGMA application_id` / `user_version`。`application_id` 非 0 且不是 `0x44534851` → 「belongs to another application」，关句柄抛错。已是 `DSHQ` 但 `user_version !== 8` → `resetDerivedSchema`：`DROP TABLE` 所有已识别派生表，把 `user_version` 置 0，再 `ensurePersistentSchema` stamp 回 8。多了不认识的 user table → 拒，**不** DROP 别人的表。这与 session-persistence-sqlite「`user_version` ≠ 15 就拒、原地不迁」相反。 [E: packages/session-query/session-query-sqlite/src/schema.ts:58] [E: packages/session-query/session-query-sqlite/src/schema.ts:66] [E: packages/session-query/session-query-sqlite/src/schema.ts:98] [E: packages/session-query/session-query-sqlite/tests/sqlite.spec.ts:1287]

11. **search 对账：revision 变了才 `inspect`。** `_reconcile` 读已索引的 persisted revision / live fingerprint，再 `_observeStable`（最多 2 次）。persistence 侧用 `listSnapshots`；revision 已在索引里且 store identity 没换则跳过整本 log。需要加载时调 `inspect`，并且跳过当前 live 的 id（live 半边自己折 documents）。live 文档用 `buildSessionEventSearchDocuments` + SHA-256 fingerprint。写入走 `BEGIN IMMEDIATE`；失败 `ROLLBACK`，抛 `SESSION_QUERY_INDEX_FAILED`。SQL 选文档时 persisted 行带 `NOT EXISTS (temp.live_sessions)`，所以 live 覆盖 persist。 [E: packages/session-query/session-query-sqlite/src/index.ts:508] [E: packages/session-query/session-query-sqlite/src/index.ts:442] [E: packages/session-query/session-query-sqlite/src/index.ts:806]

12. **query 是 data，不是 FTS 语法。** 调用方传入的 `query` 进 MATCH 之前必须先 `quoteFtsData`：整段包成一条 phrase（`"` + 内部 `"` 加倍 + `"`）[E: packages/session-query/session-query-sqlite/src/query.ts:223] [E: packages/session-query/session-query-sqlite/src/query.ts:224]，再交给 `selectedDocumentsParams` 当绑定 [E: packages/session-query/session-query-sqlite/src/index.ts:840]。`normalizeQuery` 要求非空、无 NUL，再 `sanitizeFtsText`。测例：`quoteFtsData('say "needle" OR *') === '"say ""needle"" OR *"'`，`OR` / `*` 留在短语里，不能改 FTS 计划 [E: packages/session-query/session-query-sqlite/tests/query.spec.ts:207]。filter 编成参数化 `WHERE`；跨会话 outer predicate 预算 14，单会话因为固定 `session_id = ?` 少一格。超预算或超 32766 bindings → `SESSION_QUERY_INVALID_FILTER`，语句还没 prepare。cursor 绑 `instance` + `fingerprint` + `generation`；语料变了抛 `SESSION_QUERY_STALE_CURSOR`。可检索文本来自 `extractSessionEventText`：`user/message` / `assistant/message` / `tool/call` / `tool/result` / `todo/write` 抽文本 [E: packages/session-query/session-query/src/extraction.ts:15] [E: packages/session-query/session-query/src/extraction.ts:17] [E: packages/session-query/session-query/src/extraction.ts:19] [E: packages/session-query/session-query/src/extraction.ts:21] [E: packages/session-query/session-query/src/extraction.ts:27]；`turn/end` 在 `completed` 时贡献空串 [E: packages/session-query/session-query/src/extraction.ts:54]；`assistant/chunk` / `request/header` 落入空串分支 [E: packages/session-query/session-query/src/extraction.ts:34] [E: packages/session-query/session-query/src/extraction.ts:35] [E: packages/session-query/session-query/src/extraction.ts:36]；未知 merge type 走 `default` 返回空串 [E: packages/session-query/session-query/src/extraction.ts:40]。

13. **`/export` 只 web-app，且不收 path。** `dsh-web-app` insert `id: session-log-download` / `name: '@deepseek-ai/dsh-session-log-export'` [E: packages/bundle/web-app/cordis.patch.yml:70] [E: packages/bundle/web-app/cordis.patch.yml:71]。host `apply` 注册人命令 `export` [E: packages/session-query/session-log-export/src/index.ts:20]：`rawInput` 去空白后为空 → success 文案 `Session log download requested.`；否则 error `The Web /export command does not accept a path.` [E: packages/session-query/session-log-export/src/index.ts:24]。浏览器插件听 **emit** `command/executed`：只有 `commandName === 'export'` 且 `result.kind === 'success'` 才 `controller.download` [E: packages/session-query/session-log-export/src/client/index.ts:38]。controller 对 `/api/session.export?sessionId=…&includeDescendants=true` 先 `HEAD`，再把同一 URL 交给浏览器下载管理器 [E: packages/session-query/session-log-export/src/client/controller.ts:114]。ZIP 字节在 ApiProxy：读每份 raw artifact **之前**对 live id 调 `flushLiveSessionLog` [E: packages/host/apiproxy/src/session-export.ts:242]，然后 `sessionPersistence.readRaw` [E: packages/host/apiproxy/src/session-export.ts:243]；`sessionLogZipEntries` 再 `sessionQuery.traceSession` 收子孙 [E: packages/host/apiproxy/src/session-export.ts:256]。路由是 `GET|HEAD /api/session.export` [E: packages/host/apiproxy/src/fetch/handler.ts:260]。本页停在命令 / dialog 边界。

14. **模型五件套是 Consumer，ACL 不在 engine。** `@deepseek-ai/dsh-tool-session-query` `inject = ['tools', 'systemPrompt', 'sessionQuery']` [E: packages/session-query/tool-session-query/src/index.ts:20]，登记 `session_search` [E: packages/session-query/tool-session-query/src/index.ts:67] / `session_event_search` [E: packages/session-query/tool-session-query/src/index.ts:77] / `session_trace` [E: packages/session-query/tool-session-query/src/index.ts:87] / `session_event_trace` [E: packages/session-query/tool-session-query/src/index.ts:97] / `session_event_read` [E: packages/session-query/tool-session-query/src/index.ts:110]。跨会话授权是 caller `header.cwd` **字符串相等**（`filterSessions` 同时带 `id` 与 `cwd`）[E: packages/session-query/tool-session-query/src/workspace-access.ts:84] [E: packages/session-query/tool-session-query/src/workspace-access.ts:85]；engine 的 `listSessions` / `searchSessions` 不过这道门。`dsh-base` / `dsh-web-app` / `dsh-headless` 与四个 shipped preset **都不**挂该行；仓库里的 opt-in 是 `examples/acp-agent/session-query.cordis.yml` 的 `id: tool-session-query` [E: examples/acp-agent/session-query.cordis.yml:9]。字段表留给 [surface.tools.session-query](../../surface/tools/session-query.md)。

15. **相关 waterfall 必须 `next()`；本缝不在那条链上。** Cordis `Events.waterfall` 把 innermost 从 `args.pop()` 取出 [E: vendor/cordis/src/events.ts:236]，`next()` 里才 `cbs.shift()` [E: vendor/cordis/src/events.ts:238]。checkpoint 在 `llm/stream` / `tools/execute` 上先 `flush` 再 `next()`。query 既不 veto adapter，也不挡 tool body。`session/event` 是 append 之后的 fire-and-forget emit [E: packages/core/session/src/index.ts:646]；漏听不会让 search 落后一整段——下一次 search 会重新 observe。

## 设计动机

DSH 的会话真相是 append-only log，模型历史是 `deriveMessages()` 投影。检索缝必须 **live 优先**：进程里已经 `enter` 的 `Session` 是当前 model-visible 状态；盘上的 JSONL 可能还停在上一次 `session/flush`。已知 live 连 persistence 故障都不问，避免「磁盘挂了就把内存对话变成不可读」。

派生 FTS 库不是权威。schema 不匹配就丢表重建，是因为索引可以从 log 再折；session 盘 `SCHEMA_VERSION = 15` 必须拒，是因为那是事件本身。两张 SQLite、两个 `application_id`（`DSHQ` vs `DSHP`），就是为了不让「重建索引」误伤「拒旧盘」。

`query` 当 data，是为了让模型或人输入里的 `OR` / `NEAR` / `*` 不能改 MATCH 计划。需要字面子串时走基类 `filterEvents` 的 `text` 谓词，不走 FTS。

shipped `openAt: never` 把全文检索做成部署开关：export / title / lineage / subagent 继承只要精确读。打开 FTS 是后来的 overlay（通常改 `openAt` 并换耐久 `path`），不是默认产品路径。

`inspect` 而不是 `load`，是为了让「只是看看」不触发 crash-tail 写入。repair 仍归 persistence coordinator 的 resume/`load` 路径。

ACL 放在 tool 包：engine 是进程级语料，host export 必须看见整棵 lineage；模型工具必须按 cwd 收口。混在一个类里会把人命令和模型臂绑死。

## Gotcha

- **`openAt: never` 仍挂 `ctx.sessionQuery`。** 没有服务时 tool 插件会 pending；有服务但 never 时，search 工具拿到的是 typed `SESSION_QUERY_SEARCH_DISABLED`，精确读工具仍可用。 [E: packages/session-query/session-query-sqlite/tests/sqlite.spec.ts:247]
- **类默认不是 shipped 默认。** `SqliteSessionQueryEngine.Config.openAt` 默认 `'startup'`。只看包、不看 `cordis.patch.yml`，会以为 `dsh web` 启动就 import `node:sqlite`。 [E: packages/session-query/session-query-sqlite/src/index.ts:201] [E: packages/bundle/base/cordis.patch.yml:121]
- **三套 version 不要混。** event header `SESSION_FORMAT_VERSION = 0`（无跨 version migration）；session 盘 `SCHEMA_VERSION = 15`（拒）；query 派生库 `SESSION_QUERY_SQLITE_SCHEMA_VERSION = 8`（丢表重建）。storage-sqlite 还有自己的 schema 1，未 shipped。
- **search 不订阅 `session/event`。** 热路径 append 之后不会同步更新 FTS。下一次 `searchSessions` 才 reconcile。把 query 当成 projection registry 会写错控制流。
- **`quoteFtsData` 之后没有 FTS 运算符。** 测例把 `OR *` 留在短语里。要字面子串谓词，走基类 `filterEvents` 的 `text` 子句，不要把 `OR` / `NEAR` 当 MATCH 语法。 [E: packages/session-query/session-query-sqlite/src/query.ts:224] [E: packages/session-query/session-query-sqlite/tests/query.spec.ts:207]
- **`inspect` ≠ `load`。** query / search 走 inspect。把「读历史」写成 `sessionPersistence.load` 会在冷会话上 commit repair。
- **`/export` 拒绝任何 path。** 文件名由 host `dsh-session-<id>.zip` 决定。带 path 的 `/export` 得到 `The Web /export command does not accept a path.` [E: packages/session-query/session-log-export/tests/command.client.spec.ts:27] ZIP 里的附件字节走 attachment store，不经 query engine。
- **engine 没有 workspace ACL。** 直接调 `ctx.sessionQuery.searchSessions` 能看见整本语料。模型臂的 cwd 门在 `workspace-access.ts`。
- **compaction 不是删 log。** 被 replace 掉的 surface 仍在 documents 里，只是 `surface: 'shadowed'`。搜索能命中旧文本。
- **`:memory:` 派生库随进程消失。** shipped 不在 `$DSH_HOME` 落 query.db。要耐久索引必须 overlay `path`。冷路径盘是 base 的 `session-persistence-jsonl`，`root: dshHomePath('sessions')`，不是 query.db。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101]
- **`storage` / `workspace` / `session-projection-cache` 只 web-app。** `dsh-web-app` 才 insert 这三组。base / headless 没有这些行。headless 继承 jsonl / query，不继承 workspace。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24]
- **waterfall 漏 `next()` 停的是 checkpoint / invariant，不是本缝。** 本缝没有 `next()` 可漏。 [E: vendor/cordis/src/events.ts:238]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | base | web-app | headless |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-session-query`（`SessionQueryEngine`） | `ctx.sessionQuery`；精确读 / filter / title / lineage 是基类实方法；`searchSessions` / `searchEvents` 抽象 | 类型随 sqlite 行一起进树 | 同 | 同 |
| Provider | `@deepseek-ai/dsh-session-query-sqlite`（`SqliteSessionQueryEngine`） | 同一 `ctx.sessionQuery`；`openAt` + FTS5 派生库；可选观察 `ctx.sessionPersistence` | 行 `id: session-query-sqlite`，`path: ':memory:'`，`openAt: never` | 同 id 重申同一对值 | **继承 base**，不重挂 |
| Consumer（host 读） | `@deepseek-ai/dsh-session-log-export`、`dsh-host-apiproxy` | 命令 `/export`；ZIP 调 `traceSession` + `readRaw` + `attachments` | **无** export 行 | insert `id: session-log-download`；ApiProxy 有 `/api/session.export` | **无** HTTP、无 `/export`；`traceSession` 仍可用 |
| Consumer（模型臂） | `@deepseek-ai/dsh-tool-session-query` | `inject` `sessionQuery`；ACL 在 tool 包 | **不挂** | **不挂**（preset 也不挂） | **不挂** |

换 persistence backend 只换 corpus / reconcile 看见的 `list` / `inspect` / `listSnapshots`。shipped 默认 backend 是 base 的 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；web-app / headless **继承**，不重挂。`storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache` **只 web-app**，不是本缝 Provider。换 loop 不能绕开 log 合同。preset 需要私有 Provider 时必须 `isolate`；`sessionQuery` 不是那种私有服务。启用全文检索是后来的 patch：改 `openAt` 为 `first-search` 或 `startup`，通常再换耐久 `path`。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76]

## Sources

- packages/session-query/session-query/src/index.ts
- packages/session-query/session-query/src/corpus.ts
- packages/session-query/session-query/src/config.ts
- packages/session-query/session-query/src/documents.ts
- packages/session-query/session-query/src/tracing.ts
- packages/session-query/session-query/src/types.ts
- packages/session-query/session-query/src/sources.ts
- packages/session-query/session-query/src/extraction.ts
- packages/session-query/session-query/tests/session-query.spec.ts
- packages/session-query/session-query-sqlite/src/index.ts
- packages/session-query/session-query-sqlite/src/schema.ts
- packages/session-query/session-query-sqlite/src/query.ts
- packages/session-query/session-query-sqlite/tests/sqlite.spec.ts
- packages/session-query/session-query-sqlite/tests/query.spec.ts
- packages/session-query/session-log-export/src/index.ts
- packages/session-query/session-log-export/src/client/index.ts
- packages/session-query/session-log-export/src/client/controller.ts
- packages/session-query/session-log-export/tests/command.client.spec.ts
- packages/session-query/tool-session-query/src/index.ts
- packages/session-query/tool-session-query/src/workspace-access.ts
- examples/acp-agent/session-query.cordis.yml
- packages/host/apiproxy/src/session-export.ts
- packages/host/apiproxy/src/fetch/handler.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/session/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/session/session-persistence/src/coordinator.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/session/session-title/src/index.ts
- vendor/cordis/src/events.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings/tests/settings.spec.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/credentials/credentials-local/src/index.ts

## 相关

- [spine.session-log](../../spine/session-log.md)：append-only log、`deriveMessages()`、`surfaceOp` replace、checkpoint 两个副作用落点。
- [surface.tools.session-query](../../surface/tools/session-query.md)：`session_*` 五件套 schema、cwd ACL、四个 preset 都不装。
- [subsys.persistence.jsonl](jsonl.md)：shipped 默认 session 盘；base 挂 `id: session-persistence-jsonl`，`root: dshHomePath('sessions')`；query 冷路径 `inspect` 的物理介质。
- [subsys.persistence.attachment](attachment.md)：图片字节不进 log；export ZIP 的 `media/` 从这里读。
- [subsys.persistence.workspace](workspace.md)：**只 web-app**；query 不读 workspace 实体。
- [subsys.persistence.storage](storage.md)：**只 web-app** 的非会话 KV；不是 FTS 派生库。
- [subsys.persistence.projection](projection.md)：registry 在 base；`session-projection-cache` **只 web-app**。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer 三角。
- [subsys.core.session](../core/session.md)：`Session` / `SessionStore`、`session/flush` parallel、`SESSION_FORMAT_VERSION = 0`。
- [subsys.persistence.session-persistence](session-persistence.md)：`inspect` 不 commit recovery；`load` 才 `commitRepair`。
- [subsys.persistence.sqlite](sqlite.md)：另一张 SQLite（schema 15 / `DSHP`），拒盘，未 shipped。
- [subsys.persistence.checkpoint](checkpoint.md)：`llm/stream` / top-level `tools/execute` 上先 `flush` 再 `next()`。
- [subsys.persistence.title](title.md)：log-only `session/title`；本缝只 `foldSessionTitle`。
- [subsys.host.apiproxy](../host/apiproxy.md)：`GET|HEAD /api/session.export` 的 ZIP 字节与 fail-loud 规则。
