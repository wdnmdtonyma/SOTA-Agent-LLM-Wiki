---
id: subsys.persistence.workspace
title: workspace 实体
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/workspace/workspace/src/index.ts
  - packages/workspace/workspace/src/entity.ts
  - packages/workspace/workspace/src/spec.ts
  - packages/workspace/workspace/src/paths.ts
  - packages/workspace/workspace/src/types.ts
  - packages/workspace/workspace/src/invariant.ts
  - packages/workspace/workspace/tests/workspace.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/storage/storage-json/src/index.ts
  - packages/storage/storage-json/src/single-unit.ts
  - packages/storage/storage-domain/src/spec.ts
  - packages/storage/storage-domain/src/domain.ts
  - packages/api/workspace-controller/src/index.ts
  - packages/api/workspace-controller/src/commands.ts
  - packages/api/workspace-controller/src/feed.ts
  - packages/api/session-controller/src/index.ts
  - packages/api/session-controller/src/commands.ts
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-persistence/src/handle.ts
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-persistence-jsonl/src/format.ts
  - packages/core/session/src/types.ts
  - packages/session-query/session-query-sqlite/src/schema.ts
  - packages/storage/storage-sqlite/src/schema.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/settings/settings/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/webhook/webhook/src/session.ts
symbols:
  - WorkspaceRegistry
  - WorkspaceId
  - workspaceDomainSpec
  - WorkspaceController
related:
  - subsys.persistence.storage
  - subsys.host.apiproxy
  - spine.session-log
  - spine.capability-seams
  - subsys.core.session
  - subsys.persistence.session-persistence
  - subsys.persistence.jsonl
  - subsys.persistence.session-query
  - subsys.persistence.projection
evidence: explicit
status: verified
updated: c291e7961a
---

> `WorkspaceRegistry`（`ctx.workspaceRegistry`）是 **只 `dsh-web-app` 挂行** 的 **host 面** 实体注册表：用 UUID `WorkspaceId` 钉住一个经 `fs.realpath` 规范化的已存在目录，并把 session 记账写进 domain `workspace` v2（shipped JSON 盘是 `$DSH_HOME/storages/workspace.json`）。它不拥有 append-only session log，也不进入 `deriveMessages()`。缺 `sessionPersistence` 时服务不激活，避免把「peer 不可用」当成「空历史」并盖上 `initialized`。HTTP 消费者是 `WorkspaceController`（`ctx.workspaceController`，Remote 命名空间 `'workspace'`）与 `SessionController.create` 的后置 `attachSession`，不是已删除的 `apiproxy`。

## 能回答的问题

- `ctx.workspaceRegistry` 挂在 host 面还是 agent-preset 面？`dsh-base` / `dsh-web-app` / `dsh-headless` / `sdk` / `sdk-minimal` / `acp` 各有没有 `id: workspace`？
- 缺 `sessionPersistence` 时服务会不会启动？bootstrap 读的是 `list()` header 还是 `open`/`read` 整本 log？JSONL `list()` 对更新 generation 是 skip 还是 throw？
- shipped `session-query-sqlite` 的 `openAt` 是什么？workspace 会不会 `inject` `sessionQuery`？`session-projection-cache` 挂在 base 还是只 web-app？
- `WorkspaceId` 是 path 还是 UUID？两个拼写不同的目录何时算同一个 workspace？
- `attachSession` 校验什么？`archiveSession` 会不会 `detach`？有没有 `unarchive`？
- 标题 uniqueness 是 registry 还是 `WorkspaceCommands.rename` 的门？`domain/changed` 是 emit 还是 waterfall？

## 职责边界

本包拥有：`WorkspaceRegistry`（`ctx.workspaceRegistry`）的启动、一次性 header 历史 bootstrap、`realpath` 路径唯一、create / delete / 注册表排序、header-validated 的 session 记账（`attach` / `insertSessionBefore` / `detach`）、以及覆盖在记账之上的全局 `archivedSessionIds`。

本包**不**拥有：`ctx.storage` / `storage-json` / `storage-domain` 的介质与写链（[subsys.persistence.storage](storage.md)）；append-only `SessionEvent` log、`SessionHeader` 深冻、`deriveMessages()`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；JSONL 写窗与 `session/flush`（[subsys.persistence.session-persistence](session-persistence.md)）；Host Remote 上的标题查重、`workspace.*` 动词、以及 `session.create` 成功后再 `attachSession` 的编排（[subsys.host.apiproxy](../host/apiproxy.md)，现为三个 `packages/api/*-controller`）；浏览器侧边栏（client 面，吃 `WorkspaceView`）。

workspace 是 **host 面**进程级服务。agent-preset 面不 remount 一份 registry；会话只把 `header.cwd` 当 attach 校验输入。五个 shipped profile 里，**只有 `web` 的 bundle 插入 `id: workspace`**。`dsh web` 仍是硬编码 profile 别名；`dsh --profile sdk|sdk-minimal|acp|headless` 不挂本注册表。本仓没有 shipped TUI 包。

正交、写错会污染邻页的事实（本页只点名，不展开实现）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `3`）。JSONL catalog 有 adjacent v0→v1→v2→v3；比 3 新仍拒。workspace bootstrap 只 `await this.ctx.sessionPersistence.list()`，把 snapshot 的 header 投影出来。JSONL `list()` 经 `listArtifacts` / `readGenerationHeader`：catalog 把旧 generation 翻成当前逻辑 header；`SessionFormatUnsupportedError`（比 current 新）在 listing 里 **skip**，open 同一 id 仍拒。 [E: packages/core/session/src/types.ts:88] [E: packages/workspace/workspace/src/index.ts:128] [E: packages/workspace/workspace/src/index.ts:592] [E: packages/session/session-persistence/src/index.ts:198] [E: packages/session/session-persistence-jsonl/src/index.ts:461] [E: packages/session/session-persistence-jsonl/src/index.ts:742] [E: packages/session/session-persistence-jsonl/src/index.ts:1033]
- session persistence SQLite 包已删除。workspace domain version 2 ≠ session-query schema 8 ≠ storage-sqlite schema 1 ≠ `SESSION_FORMAT_VERSION` 3。 [E: packages/session-query/session-query-sqlite/src/schema.ts:8] [E: packages/storage/storage-sqlite/src/schema.ts:20]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:65] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:80]
- compaction 的 surface 替换是 `{ op: 'replace', startSeq, endSeq }`，没有 delete。workspace 记账**不是** surface 节点，不走 `replace`。 [E: packages/core/session/src/types.ts:434] [E: packages/core/session/src/types.ts:436]
- settings 分层：`resolve` 是 `schema(mergeLayers(base, section))`。 [E: packages/settings/settings/src/index.ts:748]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。`.credentials.yaml` 写入的是 admitted record，不是 ref。 [E: packages/llm/llm-deepseek/src/index.ts:188]
- shipped JSONL 后端挂在 base：`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。headless / web / sdk / acp 继承这一行（`sdk-minimal` 有自己的完整 insert）。workspace 的 `sessionPersistence.list()` 在 web 默认落这条盘。 [E: packages/bundle/base/cordis.patch.yml:110] [E: packages/bundle/base/cordis.patch.yml:113]
- shipped `session-query-sqlite` 写出 `openAt: never`（base 挂载；web-app 用同一键重述 `path: ':memory:'` + `openAt: never`）。search 默认关，不 import/open sqlite。workspace **不** `inject` `sessionQuery`；bootstrap 不走 query 缝。 [E: packages/bundle/base/cordis.patch.yml:129] [E: packages/bundle/base/cordis.patch.yml:132] [E: packages/bundle/base/cordis.patch.yml:133] [E: packages/bundle/web-app/cordis.patch.yml:27] [E: packages/bundle/web-app/cordis.patch.yml:30] [E: packages/bundle/web-app/cordis.patch.yml:30] [E: packages/workspace/workspace/src/index.ts:94]
- `session-projection-cache` **在 base**（与 `storage*` 同层 insert，`writeEveryEvents: 200`，`writeIntervalMs: 5000`）。web-app **不再**单独插这一行。headless 继承 base 的 cache，但仍**不**挂 `id: workspace`。 [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/base/cordis.patch.yml:165] [E: packages/bundle/base/cordis.patch.yml:166]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/workspace/workspace/src/index.ts` | `WorkspaceRegistry`；`WorkspaceId()`；`inject`；`Service.init` bootstrap；create / delete / order / archive |
| `packages/workspace/workspace/src/entity.ts` | 包私有 `WorkspaceEntity`：`attachSession` / `insertSessionBefore` / `detachSession` / `setTitle` / `status` / `mutate` |
| `packages/workspace/workspace/src/spec.ts` | `workspaceDomainSpec`（name `workspace`、version 2）、`workspaceRecord`、`workspaceDomainState` |
| `packages/workspace/workspace/src/paths.ts` | `realpathNormalize`：路径唯一 canon |
| `packages/workspace/workspace/src/types.ts` | `Workspace` 接口、`WorkspaceId` brand |
| `packages/workspace/workspace/src/invariant.ts` | companion：`domain/changed` 与 entity cache 必须同步 |
| `packages/workspace/workspace/tests/workspace.spec.ts` | inject 挂起、header-only bootstrap、重名、archive 不 detach |
| `packages/bundle/web-app/cordis.patch.yml` | **只 web-app** insert：`id: workspace` + `id: workspace-controller` + session/settings controllers；同文件重述 `session-query-sqlite` `openAt: never` |
| `packages/bundle/headless/cordis.patch.yml` | insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `packages/bundle/base/cordis.patch.yml` | JSONL 盘、`session-query-sqlite` `openAt: never`、`storage*`、`session-projection-cache` |
| `packages/storage/storage-json/src/single-unit.ts` | `$DSH_HOME/storages/<unit>.json` |
| `packages/storage/storage-domain/src/domain.ts` | 先耐久、再改内存、再 `emit('domain/changed')` |
| `packages/api/workspace-controller/src/commands.ts` | 标题查重；`workspace/name-conflict` |
| `packages/api/workspace-controller/src/index.ts` | Remote 动词 `create` / `rename` / `delete` / `insertBefore` / `insertSessionBefore` / `archiveSession` / stream `follow` |
| `packages/api/workspace-controller/src/feed.ts` | 听 `domain/changed`，过滤 `domain !== 'workspace'` |
| `packages/api/session-controller/src/commands.ts` | `session.create` 后 `attachSession` |
| `packages/session/session-persistence/src/index.ts` | `list(): Promise<SessionPersistenceSnapshot[]>`，header 在 snapshot 上 |
| `packages/session/session-persistence/src/handle.ts` | `SessionHandle`：`create`/`open` 的 per-session 通道 |
| `packages/session/session-persistence-jsonl/src/index.ts` | shipped `list()`：`listArtifacts` + `readGenerationHeader`，不扫 event body |
| `packages/session/session-persistence-jsonl/src/format.ts` | header 形状；catalog 负责 generation 翻译 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `WorkspaceId` | `Branded<'WorkspaceId'>`。工厂是 `WorkspaceId(randomUUID())`。**不是** path：path 会经 `realpath` 改写，引用锚必须稳定。 [E: packages/workspace/workspace/src/types.ts:16] [E: packages/workspace/workspace/src/index.ts:293] |
| `Workspace` | 消费者接口：`id` / `path` / `title` / `createdAt` / `updatedAt` / `sessionIds`，外加 `setTitle` / `attachSession` / `insertSessionBefore` / `detachSession` / `status`。实现类 `WorkspaceEntity` 不从包入口 re-export。 |
| `workspaceDomainSpec` | `defineDomain({ name: 'workspace', version: 2 })`。一张 `workspaces` 表 + global singleton。 [E: packages/workspace/workspace/src/spec.ts:68] [E: packages/workspace/workspace/src/spec.ts:69] [E: packages/workspace/workspace/src/spec.ts:70] |
| `WorkspaceRecord` | `path`（create 时的 `realpath` canon，之后不改写）/ `title` / `sessionIds`（数组序 = 展示序）/ `createdAt` / `updatedAt`。 |
| `WorkspaceDomainState` | `initialized`（空注册表 vs 尚未跑 header bootstrap）/ `workspaceIds`（权威展示序）/ `archivedSessionIds`（缺省 `[]`，旧盘可升）/ 可选 `pendingMutation`。 [E: packages/workspace/workspace/src/spec.ts:52] [E: packages/workspace/workspace/src/spec.ts:55] |
| `pendingMutation` | `create` 或 `delete` + `workspaceId`。两步写（表行 + 次序）可能分叉时，启动只完成**显式**标出的那一步，不猜。 |
| 成员资格 | 记账数组里有 id，**并且** header 的 canonical cwd === workspace `path`。getter 同步过滤；下一次被接受的 `mutate` 才把过滤结果耐久 prune。 [E: packages/workspace/workspace/src/entity.ts:102] |
| 盘路径 | shipped `storage-json` `root: dshHomePath('storages')`，unit 名 = domain 名 `workspace` → `$DSH_HOME/storages/workspace.json`。 [E: packages/bundle/base/cordis.patch.yml:148] [E: packages/bundle/base/cordis.patch.yml:151] [E: packages/storage/storage-json/src/single-unit.ts:33] [E: packages/storage/storage-domain/src/spec.ts:124] |

## 控制流

```mermaid
flowchart TD
  Web["dsh-web-app insert id: workspace"] --> Inject["inject storageDomain + sessionPersistence"]
  Inject -->|missing persistence| Pending["fiber pending / ctx.workspaceRegistry undefined"]
  Inject -->|both present| Init["Service.init open domain v2"]
  Init --> Recover["recoverPendingMutation"]
  Recover --> Boot{"state.initialized?"}
  Boot -->|no| List["sessionPersistence.list headers only"]
  List --> Groups["realpath cwd groups"]
  Groups --> Mark["setState initialized true"]
  Boot -->|yes + table nonempty| Relist["list headers to rebuild sessionPaths"]
  Boot -->|yes + empty table| Skip["do not list"]
  Mark --> Cache["rebuildEntities"]
  Relist --> Cache
  Skip --> Cache
  Cache --> API["WorkspaceController / SessionController.create"]
  API --> Create["create: realpath + UUID + pending marker"]
  API --> Attach["attachSession: header cwd === path"]
  API --> Archive["archiveSession: archivedSessionIds only"]
  Create --> Write["domain write: durable then memory then emit"]
  Attach --> Write
  Archive --> Write
  Write --> Mux["WorkspaceFeed emit domain/changed no next"]
```

1. **组合真树只在 web-app 挂 workspace 行。** `dsh-web-app` 的 `- insert:` 放上 `id: workspace` / `name: '@deepseek-ai/dsh-workspace'`，以及 `id: workspace-controller` / `@deepseek-ai/dsh-api-workspace-controller`。`dsh-base` 没有 workspace 行，但**已经**挂 `storage` / `storage-json`（`root: dshHomePath('storages')`）/ `storage-domain`（`backend: json`）和 `session-projection-cache`。`dsh-base` 另挂 `id: session-query-sqlite`，`path: ':memory:'`，`openAt: never`；`dsh-web-app` 用同一 id 重述同一对值。`dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，**不**重挂 workspace。`sdk` / `sdk-minimal` / `acp` 同样没有 `id: workspace`。默认 GUI 路径是 `dsh web` / `dsh --profile web`。 [E: packages/bundle/web-app/cordis.patch.yml:75] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/web-app/cordis.patch.yml:114] [E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/base/cordis.patch.yml:145] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/base/cordis.patch.yml:129] [E: packages/bundle/base/cordis.patch.yml:133] [E: packages/bundle/web-app/cordis.patch.yml:30] [E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] [E: packages/bundle/headless/cordis.patch.yml:27]

2. **`inject` 是激活门，不是可选增强。** `WorkspaceRegistry.static inject = ['storageDomain', 'sessionPersistence']`。构造只做 `super(ctx, 'workspaceRegistry')`。缺 `sessionPersistence` 时 fiber 停在 pending：`ctx.get('workspaceRegistry')` 为 `undefined`，domain 介质也不会被 open / 盖 `initialized`。测试先只挂 storage，再补 `provide('sessionPersistence')` 才 `fiber.await()`。persistence 是强制依赖，这样「list 调不到」不会被误写成「历史上没有 session」。 [E: packages/workspace/workspace/src/index.ts:94] [E: packages/workspace/workspace/src/index.ts:114] [E: packages/workspace/workspace/tests/workspace.spec.ts:191] [E: packages/workspace/workspace/tests/workspace.spec.ts:195]

3. **`Service.init` 打开 domain，按 `initialized` 决定要不要 bootstrap。** `ctx.storageDomain.open(workspaceDomainSpec)` 之后登记 `domain.close` disposer，读 global。先 `recoverPendingMutation`，再 `validateStoredState`。`initialized === false`：`await this.ctx.sessionPersistence.list()`，用返回的 `SessionHeader[]` 建 cwd 索引并 `bootstrap`。`initialized === true` 且表非空：再 `list()` 一次只为重建 `sessionPaths`，**不再**跑 bootstrap。`initialized === true` 且表空：第二次启动 **不**调用 `list()`，迟到的 header 不会自动长出 workspace。然后 `indexLiveSessions`（若有 `ctx.sessions`）、再校验、`rebuildEntities`、对过滤掉的 candidate 打 warn。 [E: packages/workspace/workspace/src/index.ts:120] [E: packages/workspace/workspace/src/index.ts:128] [E: packages/workspace/workspace/src/index.ts:129] [E: packages/workspace/workspace/src/index.ts:132] [E: packages/workspace/workspace/src/index.ts:132] [E: packages/workspace/workspace/tests/workspace.spec.ts:259]

4. **bootstrap / attach 的 persistence 面只有 `list()`。** `SessionPersistence.list` 返回 snapshot（header + revision），不做 full-log parse。测试把整本 log 读路径 stub 成抛错：一次成功 bootstrap 之后只碰 `list`。shipped JSONL 走 `listArtifacts` / `readGenerationHeader`（catalog 翻旧 generation）；比 current 新的 generation 在 list 上 skip。按 canonical cwd 把 header 分成组，组内 `createdAt` 降序（并列比 session id），组间比最新 header 时间（并列比 path）。缺 cwd、`realpath` 失败、非目录的 header 进 `invalidSessionPaths`，不建组。 [E: packages/session/session-persistence/src/index.ts:198] [E: packages/session/session-persistence-jsonl/src/index.ts:461] [E: packages/session/session-persistence-jsonl/src/index.ts:742] [E: packages/workspace/workspace/src/index.ts:592] [E: packages/workspace/workspace/tests/workspace.spec.ts:221] [E: packages/workspace/workspace/tests/workspace.spec.ts:222] [E: packages/workspace/workspace/tests/workspace.spec.ts:222]

5. **`initialized` 一旦盖上就是「空也是有效空」。** bootstrap 末尾无条件 `setState({ initialized: true, workspaceIds, … })`。空 header 列表也会把空注册表标成已初始化。之后再出现的盘上 session **不会**自动建 workspace；必须走 `create` + `attachSession`（Web 路径上由 `SessionController` / `WorkspaceController` 编排）。 [E: packages/workspace/workspace/src/index.ts:506] [E: packages/workspace/workspace/tests/workspace.spec.ts:260]

6. **`create`：先 canon，再串行写。** `realpathNormalize` 就是 `fs.realpath`：trailing slash / `..` / symlink 全解开；不存在的路径把原始 `ENOENT` 抛给调用方。非目录再拒。随后 `enqueueOperation` → `createCanonical`：已有相同 `entity.path` 的记录原样返回，**不**改 title。新记录 `WorkspaceId(randomUUID())`，title 默认 `basename(canonical)`，`sessionIds: []`，prepend 进 `workspaceIds`。两步写用 `pendingMutation: { operation: 'create' }` 夹住：先标 pending，再 `table.put`，再写最终次序并清 marker；任一步失败回滚 cache / 行 / 旧 state。 [E: packages/workspace/workspace/src/paths.ts:21] [E: packages/workspace/workspace/src/index.ts:159] [E: packages/workspace/workspace/src/index.ts:160] [E: packages/workspace/workspace/src/index.ts:293] [E: packages/workspace/workspace/src/index.ts:307] [E: packages/workspace/workspace/src/index.ts:315] [E: packages/workspace/workspace/src/index.ts:332]

7. **路径唯一、标题不唯一。** 指向同一目录的 symlink 第二次 `create` 返回同一 entity，传入的新 title 被忽略。两个不同 canonical path 可以都叫 `Shared`。标题 uniqueness 是 `WorkspaceCommands.rename`：在 `operationTail` 上扫 `list()`，别的 workspace 已用该 title 则抛 `RemoteError('workspace/name-conflict')`。registry 自己没有这道门。 [E: packages/workspace/workspace/tests/workspace.spec.ts:364] [E: packages/workspace/workspace/tests/workspace.spec.ts:388] [E: packages/workspace/workspace/tests/workspace.spec.ts:391] [E: packages/api/workspace-controller/src/commands.ts:73] [E: packages/api/workspace-controller/src/commands.ts:76]

8. **`attachSession` 校验的是冻结 header 的 cwd，不是调用方口中的 path。** 记账数组里还没有该 id 时：`readSessionHeader`（先 live `ctx.sessions.get`，再 cache，再 `list()`）→ 无 cwd / `realpath` 失败 / 非目录 / canon ≠ `record.path` 全部抛错且不写盘；通过则 `rememberSessionPath` 后 `mutate` prepend。已经在 `record.sessionIds` 里的 id 跳过校验（header cwd 与 workspace path 都不可变）。`sessionIds` getter 再过滤一遍：`sessionPath(id) === record.path` 才对外可见。`insertSessionBefore` 只重排已记账 id（DOM-insertBefore：有锚插到锚前，无锚追加）；未记账的 id 或锚抛 `WorkspaceMoveInvalidError`。`detachSession` 只改记账数组，不碰 session 自己的 log。 [E: packages/workspace/workspace/src/entity.ts:114] [E: packages/workspace/workspace/src/entity.ts:116] [E: packages/workspace/workspace/src/entity.ts:138] [E: packages/workspace/workspace/src/entity.ts:148] [E: packages/workspace/workspace/src/entity.ts:154] [E: packages/workspace/workspace/src/entity.ts:175] [E: packages/workspace/workspace/src/index.ts:614]

9. **Web 创建会话时 attach 是 Session Controller 的后置步骤。** `SessionController.static inject` 含 `workspaceRegistry`。`session.create` 若带 `workspaceId`，先解析 entity，用 `workspace.path` 当 cwd 建/复用 session，成功后再 `await workspace.attachSession(sessionId)`；失败返回 `session/workspace-attach-failed`（会话已经 publish）。这是 Consumer 编排，不是 registry 听 `session/created`。Webhook 运行时（opt-in）也会 `workspaceRegistry.create` 再 `attachSession`。 [E: packages/api/session-controller/src/index.ts:97] [E: packages/api/session-controller/src/commands.ts:87] [E: packages/api/session-controller/src/commands.ts:110] [E: packages/api/session-controller/src/commands.ts:113] [E: packages/webhook/webhook/src/session.ts:130] [E: packages/webhook/webhook/src/session.ts:147]

10. **`archiveSession` 不 detach，也没有 unarchive。** registry 只把 id append 进 global `archivedSessionIds`；已经在集合里则不写盘。会话必须 live，或已在 header 索引里，或新一次 `list()` 能看见——确定 miss 才 `WorkspaceUnknownSessionError`；`list()` 自己抛错原样冒泡，不伪装成 unknown。归档后 `workspace.sessionIds` **仍含**该 id。`WorkspaceController` Remote 合同止于 `archiveSession`，没有 `unarchive` 方法；`WorkspaceRegistry` 公开写接口同样没有配对的 unarchive。注释里的「unarchiving restores position」是预留语义，不是本 build 的 API。 [E: packages/workspace/workspace/src/index.ts:248] [E: packages/workspace/workspace/src/index.ts:252] [E: packages/workspace/workspace/tests/workspace.spec.ts:885] [E: packages/api/workspace-controller/src/index.ts:107]

11. **两条写链，都不是 waterfall。** registry 级 `create` / `delete` / `insertBefore` / `archiveSession` 走 `enqueueOperation`（单 tail Promise，下一次先 `recoverPendingMutation`）。entity 级 `setTitle` / attach / move / detach 走 `table.update` 的 domain 写槽：`fn` 看见的是轮到自己时的 current，所以 attach/detach 竞态在槽上拍板。domain 的 put/update：**先** `unit.putRecord` / `setGlobal`，**再**改内存，**再** `this.ctx.emit('domain/changed', change)`。这是 `ctx.emit` 派发，调用没有 `next`；listener 失败只 `logger.warn`，不能回滚已提交的耐久写。workspace 包自己不挂任何 waterfall，也就没有「必须 `next()`」的本包义务。`session/flush` 是 persistence 的 **parallel** 耐久屏障，workspace 不订阅。 [E: packages/workspace/workspace/src/index.ts:648] [E: packages/workspace/workspace/src/entity.ts:205] [E: packages/storage/storage-domain/src/domain.ts:309] [E: packages/storage/storage-domain/src/domain.ts:310] [E: packages/storage/storage-domain/src/domain.ts:195] [E: packages/storage/storage-domain/src/domain.ts:253] [E: packages/storage/storage-domain/src/domain.ts:259]

12. **WorkspaceFeed 把 emit 推成 Remote 帧。** `WorkspaceFeed` 听 `domain/changed`：`domain !== 'workspace'` 直接 return（这是过滤，不是 waterfall veto）。global 写（`table === ''`）推 `order` / `archived` / 新 id 的 `upsert`；`workspaces` 表 delete 推 `remove`。没有 `next()` 可调。 [E: packages/api/workspace-controller/src/feed.ts:59] [E: packages/api/workspace-controller/src/feed.ts:96] [E: packages/api/workspace-controller/src/feed.ts:97]

13. **delete 只撕注册，不撕目录、不撕 log。** `delete` 先把 id 从 `workspaceIds` 拿掉并标 `pendingMutation: delete`，再 `table.delete`。目录仍在，header 仍在 persistence。`load` / `inspect` 次数仍是 0。同一 path 再 `create` 得到**新的** UUID，`sessionIds` 从空开始。 [E: packages/workspace/workspace/src/index.ts:370] [E: packages/workspace/workspace/tests/workspace.spec.ts:485] [E: packages/workspace/workspace/tests/workspace.spec.ts:493] [E: packages/workspace/workspace/tests/workspace.spec.ts:497]

14. **`status()` 是现场 `stat`，不写盘。** 目录暂时消失或变成文件 → `'missing-dir'`；`path` 字段保持 create 时的 canon。 [E: packages/workspace/workspace/src/entity.ts:182] [E: packages/workspace/workspace/src/entity.ts:186]

## 设计动机

DSH 把「模型下一轮看见什么」钉在 append-only session log 上（**model-visible ⟺ logged**）。Web 工作台还需要另一份 **host 面** 索引：按目录把许多 session 编成可排序、可归档、可重命名的分组。那份索引若写进 log，会污染 `deriveMessages()`；若用 path 当主键，symlink / `..` / 目录改名会让引用漂移。所以 identity 是 UUID，uniqueness canon 是 `realpath`，介质是非会话 storage domain，而不是 JSONL。

`inject` 强制 `sessionPersistence`，是为了让第一次启动的 header bootstrap 有权威输入。没有这份 peer 就激活 registry，空 `list()` 会被当成「从来没有过会话」并盖上 `initialized`，之后永远不再扫描历史。这和 peer harness 常见的「内存里先有一份 project 列表、session 事后再挂上去」相反：DSH 先有 header 上的 `cwd` 事实，再决定 workspace 记账。

标题查重放在 `WorkspaceCommands.rename` 而不是 registry，是因为 registry 的身份是 path，不是 display name；同一 basename 的两个目录在磁盘上本来就可以共存。归档不 detach，是为了将来若补 unarchive，仍能回到原来的 `sessionIds` 槽位——本 build 只实现了 archive 这一半。

## Gotcha

- **只 web-app 挂 registry。** 在 headless / sdk / sdk-minimal / acp 或裸 base 里找 `ctx.workspaceRegistry` 会得到 `undefined`。headless 继承 base 的 JSONL / checkpoint / settings / `session-query-sqlite`（`openAt: never`）以及 **`session-projection-cache` 与 `storage*`**，**不**继承 workspace 行。 [E: packages/bundle/web-app/cordis.patch.yml:75] [E: packages/bundle/base/cordis.patch.yml:162] [E: packages/bundle/base/cordis.patch.yml:133]
- **无 persistence = 服务不激活。** 不是「当成空注册表继续跑」。 [E: packages/workspace/workspace/tests/workspace.spec.ts:191]
- **bootstrap 只跑一次。** `initialized: true` 的空盘不会因为后来多了 session header 而自动建 workspace。 [E: packages/workspace/workspace/tests/workspace.spec.ts:259]
- **永远不要对 bootstrap 调 `open`/`read`。** 那会把整本 event body 拉进启动路径。合同与测试都只允许 `list()`。 [E: packages/workspace/workspace/tests/workspace.spec.ts:222] [E: packages/workspace/workspace/src/index.ts:592]
- **shipped query 默认 `openAt: never`。** `ctx.sessionQuery` 仍在；workspace bootstrap 不走这条缝。 [E: packages/bundle/base/cordis.patch.yml:133]
- **list 上外国/更新 generation 会被 skip。** JSONL listing 对 `SessionFormatUnsupportedError` `continue`；真正 `open` 才把拒绝交给调用方。 [E: packages/session/session-persistence-jsonl/src/index.ts:742] [E: packages/workspace/workspace/src/index.ts:128]
- **id ≠ path。** 删掉注册再 `create` 同一目录，UUID 变了，旧 bookmark 失效。 [E: packages/workspace/workspace/tests/workspace.spec.ts:497]
- **registry 允许重名。** 只在 `WorkspaceCommands.rename` 上会撞 `workspace/name-conflict`。 [E: packages/api/workspace-controller/src/commands.ts:76]
- **archive 不是 detach。** grouping 表面把归档 session 藏起来，但 `sessionIds` 槽还在；本 build 没有 `unarchive`。 [E: packages/workspace/workspace/tests/workspace.spec.ts:885]
- **getter 过滤 ≠ 盘上已 prune。** `list()` 可以少返回几个 candidate，耐久数组要等下一次成功的 `mutate`（例如 `setTitle`）才缩短。 [E: packages/workspace/workspace/tests/workspace.spec.ts:751] [E: packages/workspace/workspace/tests/workspace.spec.ts:754]
- **损坏的盘 fail-loud。** 重复 path、同一 session 被两个 workspace 记账、`initialized` 后次序与表行对不上、pending 行仍留在 `workspaceIds` 里——一律抛，不猜。 [E: packages/workspace/workspace/src/index.ts:535] [E: packages/workspace/workspace/src/index.ts:544]
- **`domain/changed` 没有 `next()`。** 把它当成 waterfall、指望不调用 next 就挡住别人，是错的。写在 `ctx.emit` 之前已经提交。 [E: packages/storage/storage-domain/src/domain.ts:253] [E: packages/storage/storage-domain/src/domain.ts:259]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | base | web-app | headless / sdk / acp / sdk-minimal |
|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-workspace`（`types.ts` + `workspaceDomainSpec`） | `Workspace` / `WorkspaceId`；domain 名 `workspace` version 2 | 无 workspace 行 | 类型随包进 host 进程 | 无 workspace 行 |
| Provider | `WorkspaceRegistry` | `ctx.workspaceRegistry`；`static inject = ['storageDomain', 'sessionPersistence']` | 无 | `id: workspace` / `name: '@deepseek-ai/dsh-workspace'` | 无；headless insert 只有 `code-runtime` / `headless-startup` / `headless-runner` |
| Consumer | `WorkspaceController` + `SessionController` | `ctx.workspaceController` namespace `'workspace'`；`SessionController` inject `workspaceRegistry`；`session.create` 后 `attachSession` | 无 Host Remote | `id: workspace-controller` + `id: session-controller` | 无 Web Host |

`storage` + `storage-json` + `storage-domain` 是 workspace **inject 的 peer seam**（[subsys.persistence.storage](storage.md)），不是本缝的 Provider：换 json backend 只换 `$DSH_HOME/storages/workspace.json` 的落盘，不换 `Workspace` 合同。这些 storage 行现在在 **base**，web / headless 都继承。`session-projection-cache` 同样在 base（[subsys.persistence.projection](projection.md)）。shipped `session-query-sqlite` 写 `openAt: never`（[subsys.persistence.session-query](session-query.md)），workspace 不消费这条缝。浏览器 UI 消费的是 `WorkspaceView` Remote，不 `inject` `workspaceRegistry`。workspace 记账不进 session log，因此也不进 `deriveMessages()`——**model-visible ⟺ logged** 管的是对话表面，不管 Web 侧栏分组。

## Sources

- packages/workspace/workspace/src/index.ts
- packages/workspace/workspace/src/entity.ts
- packages/workspace/workspace/src/spec.ts
- packages/workspace/workspace/src/paths.ts
- packages/workspace/workspace/src/types.ts
- packages/workspace/workspace/src/invariant.ts
- packages/workspace/workspace/tests/workspace.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/storage/storage-json/src/index.ts
- packages/storage/storage-json/src/single-unit.ts
- packages/storage/storage-domain/src/spec.ts
- packages/storage/storage-domain/src/domain.ts
- packages/api/workspace-controller/src/index.ts
- packages/api/workspace-controller/src/commands.ts
- packages/api/workspace-controller/src/feed.ts
- packages/api/session-controller/src/index.ts
- packages/api/session-controller/src/commands.ts
- packages/session/session-persistence/src/index.ts
- packages/session/session-persistence/src/handle.ts
- packages/session/session-persistence-jsonl/src/index.ts
- packages/session/session-persistence-jsonl/src/format.ts
- packages/core/session/src/types.ts
- packages/session-query/session-query-sqlite/src/schema.ts
- packages/storage/storage-sqlite/src/schema.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/settings/settings/src/index.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/webhook/webhook/src/session.ts

## 相关

- [非会话 storage](storage.md)（`subsys.persistence.storage`）— `ctx.storage` + domain 写链；workspace.json 落在这条缝上。
- [Host HTTP API](../host/apiproxy.md)（`subsys.host.apiproxy`）— 现为三个 `packages/api/*-controller`；`workspace.*` Remote、标题查重、`session.create` 后 attach、`WorkspaceFeed`。
- [会话日志与 deriveMessages](../../spine/session-log.md)（`spine.session-log`）— append-only log 与 **model-visible ⟺ logged**；workspace 记账不在这条表面上。
- [能力缝](../../spine/capability-seams.md)（`spine.capability-seams`）— Definition / Provider / Consumer 三角。
- [SessionEvent 日志](../core/session.md)（`subsys.core.session`）— `SessionHeader.cwd` 是 attach 的冻结输入。
- [session persistence 缝](session-persistence.md)（`subsys.persistence.session-persistence`）— `list()` 回 snapshot；`create`/`open` 得到 `SessionHandle`。
- [JSONL 后端](jsonl.md)（`subsys.persistence.jsonl`）— shipped 默认盘；listing 可 skip 外国 generation。
- [session-query 检索](session-query.md)（`subsys.persistence.session-query`）— shipped `openAt: never`；workspace 不 inject 这条缝。
- [session projection](projection.md)（`subsys.persistence.projection`）— `session-projection-cache` 在 **base**；`id: workspace` 只在 web-app。
