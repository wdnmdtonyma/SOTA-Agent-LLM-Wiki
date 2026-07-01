---
id: server.control-plane
title: Control Plane
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/control-plane/types.ts
  - packages/opencode/src/control-plane/adapters/index.ts
  - packages/opencode/src/control-plane/adapters/worktree.ts
  - packages/opencode/src/control-plane/workspace.ts
  - packages/core/src/control-plane/move-session.ts
  - packages/core/src/integration.ts
  - packages/core/src/credential.ts
  - packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts
  - packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts
  - packages/opencode/src/server/routes/instance/httpapi/handlers/control-plane.ts
symbols:
  - Workspace
  - WorkspaceAdapter
  - WorktreeAdapter
  - MoveSession
  - Integration
  - Credential
related:
  - execution.worktree
  - model-layer.credential-v2
  - integrations.integration-v2
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `server.control-plane` 描述 workspace adapter orchestration、remote workspace sync/session warp，以及 V2 core 的 `MoveSession`。

需要避免的命名陷阱: HEAD 已用 `packages/core/src/integration.ts` 的 `@opencode/v2/Integration` 承载 provider authentication registry；它不是 workspace remote connector，也不是 control-plane adapter。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:221][E: packages/core/src/integration.ts:404][I]

## V1

### Adapter contract

`WorkspaceInfo` 包含 id、type、name、branch、directory、extra、projectID。[E: packages/opencode/src/control-plane/types.ts:7][E: packages/opencode/src/control-plane/types.ts:8][E: packages/opencode/src/control-plane/types.ts:9][E: packages/opencode/src/control-plane/types.ts:10][E: packages/opencode/src/control-plane/types.ts:11][E: packages/opencode/src/control-plane/types.ts:12][E: packages/opencode/src/control-plane/types.ts:13][E: packages/opencode/src/control-plane/types.ts:14] `Target` union 只有 local `{ type: "local"; directory }` 和 remote `{ type: "remote"; url; headers? }` 两类。[E: packages/opencode/src/control-plane/types.ts:30][E: packages/opencode/src/control-plane/types.ts:32][E: packages/opencode/src/control-plane/types.ts:33][E: packages/opencode/src/control-plane/types.ts:36][E: packages/opencode/src/control-plane/types.ts:37][E: packages/opencode/src/control-plane/types.ts:38] `WorkspaceAdapter` 方法是 configure、create、optional list、remove、target。[E: packages/opencode/src/control-plane/types.ts:46][E: packages/opencode/src/control-plane/types.ts:49][E: packages/opencode/src/control-plane/types.ts:50][E: packages/opencode/src/control-plane/types.ts:56][E: packages/opencode/src/control-plane/types.ts:57][E: packages/opencode/src/control-plane/types.ts:58]

内建 adapter registry 只有 `worktree: WorktreeAdapter`。[E: packages/opencode/src/control-plane/adapters/index.ts:5][E: packages/opencode/src/control-plane/adapters/index.ts:6] `getAdapter` 先查 per-project custom map，再查 builtin；都没有就抛 unknown adapter error。[E: packages/opencode/src/control-plane/adapters/index.ts:11][E: packages/opencode/src/control-plane/adapters/index.ts:12][E: packages/opencode/src/control-plane/adapters/index.ts:15][E: packages/opencode/src/control-plane/adapters/index.ts:18] `registerAdapter(projectID, type, adapter)` 把 custom adapter 写入 project-scoped map。[E: packages/opencode/src/control-plane/adapters/index.ts:37][E: packages/opencode/src/control-plane/adapters/index.ts:38][E: packages/opencode/src/control-plane/adapters/index.ts:39][E: packages/opencode/src/control-plane/adapters/index.ts:40]

`WorktreeAdapter` 配置 schema 包含 name、branch、directory。[E: packages/opencode/src/control-plane/adapters/worktree.ts:5][E: packages/opencode/src/control-plane/adapters/worktree.ts:6][E: packages/opencode/src/control-plane/adapters/worktree.ts:7][E: packages/opencode/src/control-plane/adapters/worktree.ts:8] 它的 `configure` 调 `svc.makeWorktreeInfo({ detached: true })`，`create` 调 `svc.createFromInfo(...)`，`list` 调 `svc.list()` 并映射成 type `worktree`，`target` 返回 local target。[E: packages/opencode/src/control-plane/adapters/worktree.ts:31][E: packages/opencode/src/control-plane/adapters/worktree.ts:35][E: packages/opencode/src/control-plane/adapters/worktree.ts:45][E: packages/opencode/src/control-plane/adapters/worktree.ts:50][E: packages/opencode/src/control-plane/adapters/worktree.ts:61][E: packages/opencode/src/control-plane/adapters/worktree.ts:67][E: packages/opencode/src/control-plane/adapters/worktree.ts:72][E: packages/opencode/src/control-plane/adapters/worktree.ts:89][E: packages/opencode/src/control-plane/adapters/worktree.ts:92][E: packages/opencode/src/control-plane/adapters/worktree.ts:93]

### Workspace service

`Workspace` service tag 是 `@opencode/Workspace`，接口包含 create、sessionWarp、list、syncList、get、remove、status、isSyncing、waitForSync、startWorkspaceSyncing。[E: packages/opencode/src/control-plane/workspace.ts:131][E: packages/opencode/src/control-plane/workspace.ts:132][E: packages/opencode/src/control-plane/workspace.ts:133][E: packages/opencode/src/control-plane/workspace.ts:134][E: packages/opencode/src/control-plane/workspace.ts:135][E: packages/opencode/src/control-plane/workspace.ts:136][E: packages/opencode/src/control-plane/workspace.ts:137][E: packages/opencode/src/control-plane/workspace.ts:138][E: packages/opencode/src/control-plane/workspace.ts:139][E: packages/opencode/src/control-plane/workspace.ts:140][E: packages/opencode/src/control-plane/workspace.ts:146][E: packages/opencode/src/control-plane/workspace.ts:149] connection status literals now come from shared `WorkspaceEvent.ConnectionStatus` schema。[E: packages/opencode/src/control-plane/workspace.ts:36][E: packages/opencode/src/control-plane/workspace.ts:44][E: packages/opencode/src/control-plane/workspace.ts:45]

`create(input)` generates a workspace id, obtains adapter/config, inserts `WorkspaceTable`, passes auth/workspace/OTEL env to `WorkspaceAdapterRuntime.create`, then waits for status/startSync race completion。[E: packages/opencode/src/control-plane/workspace.ts:503][E: packages/opencode/src/control-plane/workspace.ts:514][E: packages/opencode/src/control-plane/workspace.ts:515][E: packages/opencode/src/control-plane/workspace.ts:529][E: packages/opencode/src/control-plane/workspace.ts:530][E: packages/opencode/src/control-plane/workspace.ts:538][E: packages/opencode/src/control-plane/workspace.ts:539][E: packages/opencode/src/control-plane/workspace.ts:553]

`syncList(project)` 先用当前 workspace names 建 set，再并发调用 `registeredAdapters(project.id)` 中每个 adapter 的 `list`，最后只插入 name 不在 set 中的 discovered workspace。[E: packages/opencode/src/control-plane/workspace.ts:727][E: packages/opencode/src/control-plane/workspace.ts:728][E: packages/opencode/src/control-plane/workspace.ts:729][E: packages/opencode/src/control-plane/workspace.ts:730][E: packages/opencode/src/control-plane/workspace.ts:737][E: packages/opencode/src/control-plane/workspace.ts:744][E: packages/opencode/src/control-plane/workspace.ts:758]

### Local and remote target execution

`runInWorkspace` 没有 workspaceID 时执行 local function；有 workspaceID 时加载 workspace 并取 adapter target。[E: packages/opencode/src/control-plane/workspace.ts:253][E: packages/opencode/src/control-plane/workspace.ts:264][E: packages/opencode/src/control-plane/workspace.ts:266][E: packages/opencode/src/control-plane/workspace.ts:269] local target 用 `InstanceStore.Service.provide({ directory: target.directory }, input.local())` 切 directory。[E: packages/opencode/src/control-plane/workspace.ts:271][E: packages/opencode/src/control-plane/workspace.ts:272][E: packages/opencode/src/control-plane/workspace.ts:273] remote target 执行 caller 构造的 HTTP request，并在 non-2xx 或 decode failure 时 log warning 后返回 fallback。[E: packages/opencode/src/control-plane/workspace.ts:276][E: packages/opencode/src/control-plane/workspace.ts:285][E: packages/opencode/src/control-plane/workspace.ts:287][E: packages/opencode/src/control-plane/workspace.ts:292][E: packages/opencode/src/control-plane/workspace.ts:295][E: packages/opencode/src/control-plane/workspace.ts:299][E: packages/opencode/src/control-plane/workspace.ts:302]

Remote workspace sync 通过 `GET /global/event` 建 SSE stream，request accept 是 `text/event-stream`，非 2xx 抛 `WorkspaceSyncHttpError`。[E: packages/opencode/src/control-plane/workspace.ts:190][E: packages/opencode/src/control-plane/workspace.ts:191][E: packages/opencode/src/control-plane/workspace.ts:194][E: packages/opencode/src/control-plane/workspace.ts:195] SSE parser 识别 `data`、`id`、`retry` 字段，JSON parse 失败时产生 `type: "sse.message"` fallback。[E: packages/opencode/src/control-plane/workspace.ts:203][E: packages/opencode/src/control-plane/workspace.ts:210][E: packages/opencode/src/control-plane/workspace.ts:222][E: packages/opencode/src/control-plane/workspace.ts:223][E: packages/opencode/src/control-plane/workspace.ts:224][E: packages/opencode/src/control-plane/workspace.ts:237][E: packages/opencode/src/control-plane/workspace.ts:240]

sync loop 对 payload type `"sync"` 且带 `syncEvent` 的事件调用 `events.replay(payload.syncEvent, { publish: true, ownerID: space.id })`。[E: packages/opencode/src/control-plane/workspace.ts:401][E: packages/opencode/src/control-plane/workspace.ts:402] replay 没失败时，代码继续把同一个 event 通过 `GlobalBus.emit("event", { directory, project, workspace, payload })` 发出。[E: packages/opencode/src/control-plane/workspace.ts:414][E: packages/opencode/src/control-plane/workspace.ts:416][E: packages/opencode/src/control-plane/workspace.ts:417][E: packages/opencode/src/control-plane/workspace.ts:418][E: packages/opencode/src/control-plane/workspace.ts:419][E: packages/opencode/src/control-plane/workspace.ts:420]

### Session warp

`sessionWarp` 先查 session 当前 workspace；如果 source 是 remote target，就先 `syncHistory(previous, target.url, target.headers)`；如果 source 是 local target，则 `prompt.cancel(input.sessionID)`。[E: packages/opencode/src/control-plane/workspace.ts:559][E: packages/opencode/src/control-plane/workspace.ts:561][E: packages/opencode/src/control-plane/workspace.ts:568][E: packages/opencode/src/control-plane/workspace.ts:573][E: packages/opencode/src/control-plane/workspace.ts:574][E: packages/opencode/src/control-plane/workspace.ts:584] `copyChanges` 为真且当前 session 有 workspaceID 时，会从 source workspace 取 `/vcs/diff/raw` 或 local `vcs.diffRaw()`，再在目标 workspace apply patch。[E: packages/opencode/src/control-plane/workspace.ts:593][E: packages/opencode/src/control-plane/workspace.ts:595][E: packages/opencode/src/control-plane/workspace.ts:597][E: packages/opencode/src/control-plane/workspace.ts:599][E: packages/opencode/src/control-plane/workspace.ts:611][E: packages/opencode/src/control-plane/workspace.ts:613][E: packages/opencode/src/control-plane/workspace.ts:615]

目标 workspaceID 为 null 时，`session.setWorkspace(... workspaceID: undefined)` 后返回。[E: packages/opencode/src/control-plane/workspace.ts:623][E: packages/opencode/src/control-plane/workspace.ts:624][E: packages/opencode/src/control-plane/workspace.ts:626] 目标是 local target 时，只更新 session workspaceID 后返回。[E: packages/opencode/src/control-plane/workspace.ts:637][E: packages/opencode/src/control-plane/workspace.ts:639][E: packages/opencode/src/control-plane/workspace.ts:640][E: packages/opencode/src/control-plane/workspace.ts:642] 目标是 remote target 时，代码读取该 session 的 event rows、按 10 条切 chunk、POST `/sync/replay`，再 POST `/sync/steal`，最后更新 session workspaceID。[E: packages/opencode/src/control-plane/workspace.ts:645][E: packages/opencode/src/control-plane/workspace.ts:664][E: packages/opencode/src/control-plane/workspace.ts:671][E: packages/opencode/src/control-plane/workspace.ts:672][E: packages/opencode/src/control-plane/workspace.ts:695][E: packages/opencode/src/control-plane/workspace.ts:696][E: packages/opencode/src/control-plane/workspace.ts:712]

### HTTP routes

Workspace API root 是 `/experimental/workspace`，paths 是 adapter、root list/create、sync-list、status、remove `/:id`、warp。[E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:12][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:40][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:41][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:42][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:43][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:44][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:45][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:46] create 是 `POST` 到 `WorkspacePaths.list`，remove 是 `DELETE` 到 `WorkspacePaths.remove`，warp 返回 `NoContent`。[E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:73][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:105][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:117][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:120]

Control-plane move-session route 在 opencode server package 中声明，root 是 `/experimental/control-plane`，endpoint 是 `POST /experimental/control-plane/move-session`，success 是 `HttpApiSchema.NoContent`。[E: packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts:6][E: packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts:19][E: packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts:22][E: packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts:24] Handler 从 V2 core `MoveSession.Service` 取 service，并调用 `service.moveSession(ctx.payload)`。[E: packages/opencode/src/server/routes/instance/httpapi/handlers/control-plane.ts:8][E: packages/opencode/src/server/routes/instance/httpapi/handlers/control-plane.ts:10][E: packages/opencode/src/server/routes/instance/httpapi/handlers/control-plane.ts:15]

## V2

`ControlPlaneMoveSession` 的 input 包含 `sessionID`、`destination.directory`、optional `moveChanges`，service interface 返回 `Effect<void, Error>`。[E: packages/core/src/control-plane/move-session.ts:16][E: packages/core/src/control-plane/move-session.ts:17][E: packages/core/src/control-plane/move-session.ts:21][E: packages/core/src/control-plane/move-session.ts:22][E: packages/core/src/control-plane/move-session.ts:23][E: packages/core/src/control-plane/move-session.ts:24][E: packages/core/src/control-plane/move-session.ts:63][E: packages/core/src/control-plane/move-session.ts:64] `moveSession` 先读取 current session；missing session 返回 `SessionV2.NotFoundError`，destination directory 与当前 directory 相同则直接 return。[E: packages/core/src/control-plane/move-session.ts:77][E: packages/core/src/control-plane/move-session.ts:78][E: packages/core/src/control-plane/move-session.ts:79][E: packages/core/src/control-plane/move-session.ts:80][E: packages/core/src/control-plane/move-session.ts:81]

移动前它解析 source/destination project；如果 destination project id 不等于 current session project id，抛 `DestinationProjectMismatchError`。[E: packages/core/src/control-plane/move-session.ts:83][E: packages/core/src/control-plane/move-session.ts:84][E: packages/core/src/control-plane/move-session.ts:85][E: packages/core/src/control-plane/move-session.ts:86] 当 `moveChanges` 为真且 source/destination project directory 不同，它 capture git patch，再在 destination directory apply patch。[E: packages/core/src/control-plane/move-session.ts:89][E: packages/core/src/control-plane/move-session.ts:90][E: packages/core/src/control-plane/move-session.ts:93][E: packages/core/src/control-plane/move-session.ts:95][E: packages/core/src/control-plane/move-session.ts:99][E: packages/core/src/control-plane/move-session.ts:102]

移动核心事件是 `SessionEvent.Moved`，payload 包含 sessionID、新 `Location.Ref.make({ directory })`、destination project 相对 subdirectory、timestamp。[E: packages/core/src/control-plane/move-session.ts:106][E: packages/core/src/control-plane/move-session.ts:107][E: packages/core/src/control-plane/move-session.ts:108][E: packages/core/src/control-plane/move-session.ts:109][E: packages/core/src/control-plane/move-session.ts:110] 如果移动过 patch，source directory 会执行 `git.change.discard({ index: "preserve", untracked: "remove" })`。[E: packages/core/src/control-plane/move-session.ts:113][E: packages/core/src/control-plane/move-session.ts:120][E: packages/core/src/control-plane/move-session.ts:121][E: packages/core/src/control-plane/move-session.ts:123][E: packages/core/src/control-plane/move-session.ts:124][E: packages/core/src/control-plane/move-session.ts:125] `node` 的 deps 是 Git、EventV2、ProjectV2、SessionStore。[E: packages/core/src/control-plane/move-session.ts:144][E: packages/core/src/control-plane/move-session.ts:147]

`packages/core/src/integration.ts` 的 integration interface 是 provider credential/auth registry: 它提供 registry transform/reload/get/list、connection active/resolve/key/oauth/update/remove，以及 attempt status/complete/cancel。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:367][E: packages/core/src/integration.ts:368][E: packages/core/src/integration.ts:369][E: packages/core/src/integration.ts:374][E: packages/core/src/integration.ts:380][E: packages/core/src/integration.ts:404][E: packages/core/src/integration.ts:418][E: packages/core/src/integration.ts:458][E: packages/core/src/integration.ts:466][E: packages/core/src/integration.ts:476][E: packages/core/src/integration.ts:484][E: packages/core/src/integration.ts:505] `connection.key` 调 `credentials.create(...)` 存 credential；OAuth begin/status/complete/cancel 都围绕 attempt state 运作。[E: packages/core/src/integration.ts:410][E: packages/core/src/integration.ts:418][E: packages/core/src/integration.ts:428][E: packages/core/src/integration.ts:476][E: packages/core/src/integration.ts:484][E: packages/core/src/integration.ts:505] 因此它不是 workspace adapter/remote target 的实现点。[I]

## V1 / V2 对照

| 维度 | V1 workspace control plane | V2 core control plane |
| --- | --- | --- |
| Workspace orchestration | `Workspace` service 管 adapter、workspace create/syncList/sessionWarp/status。[E: packages/opencode/src/control-plane/workspace.ts:131][E: packages/opencode/src/control-plane/workspace.ts:149] | `MoveSession` 管 directory-level session move。[E: packages/core/src/control-plane/move-session.ts:63] |
| Built-in adapter | Builtin map 只有 `worktree`。[E: packages/opencode/src/control-plane/adapters/index.ts:5] | `MoveSession.Destination` 接 destination directory；是否存在其他 V2 adapter registry 不由本节点 source 证明。[E: packages/core/src/control-plane/move-session.ts:16][I] |
| Remote behavior | Adapter target 可以是 remote URL/headers，Workspace 用 HTTP/SSE routes 同步。[E: packages/opencode/src/control-plane/types.ts:36][E: packages/opencode/src/control-plane/workspace.ts:190] | 已读 core move-session path 覆盖 directory equality check、optional git patch 和 `SessionEvent.Moved` publish。[E: packages/core/src/control-plane/move-session.ts:81][E: packages/core/src/control-plane/move-session.ts:89][E: packages/core/src/control-plane/move-session.ts:102][E: packages/core/src/control-plane/move-session.ts:106][I] |

## Design notes

V1 workspace control plane 把 local worktree 与 remote opencode instance 都收敛成 adapter target union；local path 用 `InstanceStore.provide`，remote path 用 HTTP/SSE。[E: packages/opencode/src/control-plane/types.ts:30][E: packages/opencode/src/control-plane/workspace.ts:272][E: packages/opencode/src/control-plane/workspace.ts:276] V2 `MoveSession` 更小，它把 session location change 表达成 core event，并可选择搬运 git patch。[E: packages/core/src/control-plane/move-session.ts:89][E: packages/core/src/control-plane/move-session.ts:106][I]

## Sources

- `packages/opencode/src/control-plane/types.ts`
- `packages/opencode/src/control-plane/adapters/index.ts`
- `packages/opencode/src/control-plane/adapters/worktree.ts`
- `packages/opencode/src/control-plane/workspace.ts`
- `packages/core/src/control-plane/move-session.ts`
- `packages/core/src/integration.ts`
- `packages/core/src/credential.ts`
- `packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts`
- `packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts`
- `packages/opencode/src/server/routes/instance/httpapi/handlers/control-plane.ts`

## Related

- [execution.worktree](../execution/worktree.md)
- [model-layer.credential-v2](../model-layer/credential-v2.md)
- [integrations.integration-v2](../integrations/integration-v2.md)
