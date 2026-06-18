---
id: server.control-plane
title: Control Plane
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/control-plane/workspace.ts
  - packages/opencode/src/control-plane/adapters/
  - packages/core/src/control-plane/move-session.ts
  - packages/core/src/integration.ts
  - packages/core/src/credential.ts
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
updated: 355a0bcf5
---

`server.control-plane` 描述 workspace adapter orchestration、remote workspace sync/session warp，以及 V2 core 的 `MoveSession`。需要避免的命名陷阱: HEAD 已用 `packages/core/src/integration.ts` 的 `@opencode/v2/Integration` 承载 provider authentication registry；它不是 workspace remote connector，也不是 control-plane adapter。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:253][E: packages/core/src/integration.ts:451][I]

## V1

### Adapter contract

`WorkspaceInfo` 包含 id、type、name、branch、directory、extra、projectID。[E: packages/opencode/src/control-plane/types.ts:7][E: packages/opencode/src/control-plane/types.ts:14] `Target` union 只有 local `{ type: "local"; directory }` 和 remote `{ type: "remote"; url; headers? }` 两类。[E: packages/opencode/src/control-plane/types.ts:30][E: packages/opencode/src/control-plane/types.ts:38] `WorkspaceAdapter` 方法是 configure、create、optional list、remove、target。[E: packages/opencode/src/control-plane/types.ts:49][E: packages/opencode/src/control-plane/types.ts:58]

内建 adapter registry 只有 `worktree: WorktreeAdapter`。[E: packages/opencode/src/control-plane/adapters/index.ts:5][E: packages/opencode/src/control-plane/adapters/index.ts:6] `getAdapter` 先查 per-project custom map，再查 builtin；都没有就抛 unknown adapter error。[E: packages/opencode/src/control-plane/adapters/index.ts:12][E: packages/opencode/src/control-plane/adapters/index.ts:18] `registerAdapter(projectID, type, adapter)` 把 custom adapter 写入 project-scoped map。[E: packages/opencode/src/control-plane/adapters/index.ts:37][E: packages/opencode/src/control-plane/adapters/index.ts:40]

`WorktreeAdapter` 配置 schema 包含 name、branch、directory。[E: packages/opencode/src/control-plane/adapters/worktree.ts:5][E: packages/opencode/src/control-plane/adapters/worktree.ts:8] 它的 `configure` 调 `svc.makeWorktreeInfo({ detached: true })`，`create` 调 `svc.createFromInfo(...)`，`list` 调 `svc.list()` 并映射成 type `worktree`，`target` 返回 local target。[E: packages/opencode/src/control-plane/adapters/worktree.ts:35][E: packages/opencode/src/control-plane/adapters/worktree.ts:51][E: packages/opencode/src/control-plane/adapters/worktree.ts:67][E: packages/opencode/src/control-plane/adapters/worktree.ts:92]

### Workspace service

`Workspace` service tag 是 `@opencode/Workspace`，接口包含 create、sessionWarp、list、syncList、get、remove、status、isSyncing、waitForSync、startWorkspaceSyncing。[E: packages/opencode/src/control-plane/workspace.ts:148][E: packages/opencode/src/control-plane/workspace.ts:162][E: packages/opencode/src/control-plane/workspace.ts:165] connection status literals 是 connected、connecting、disconnected、error。[E: packages/opencode/src/control-plane/workspace.ts:43][E: packages/opencode/src/control-plane/workspace.ts:45]

`create(input)` 生成 ascending workspace id，取 adapter，调用 `WorkspaceAdapterRuntime.configure`，构造 `Info`，插入 `WorkspaceTable`，再把 auth/workspace/OTEL env 传给 `WorkspaceAdapterRuntime.create`。[E: packages/opencode/src/control-plane/workspace.ts:509][E: packages/opencode/src/control-plane/workspace.ts:511][E: packages/opencode/src/control-plane/workspace.ts:519][E: packages/opencode/src/control-plane/workspace.ts:530][E: packages/opencode/src/control-plane/workspace.ts:545][E: packages/opencode/src/control-plane/workspace.ts:554]

`syncList(project)` 先用当前 workspace names 建 set，再并发调用 `registeredAdapters(project.id)` 中每个 adapter 的 `list`，最后只插入 name 不在 set 中的 discovered workspace。[E: packages/opencode/src/control-plane/workspace.ts:743][E: packages/opencode/src/control-plane/workspace.ts:746][E: packages/opencode/src/control-plane/workspace.ts:753][E: packages/opencode/src/control-plane/workspace.ts:760]

### Local and remote target execution

`runInWorkspace` 没有 workspaceID 时执行 local function；有 workspaceID 时加载 workspace 并取 adapter target。[E: packages/opencode/src/control-plane/workspace.ts:280][E: packages/opencode/src/control-plane/workspace.ts:285] local target 用 `InstanceStore.Service.provide({ directory: target.directory }, input.local())` 切 directory。[E: packages/opencode/src/control-plane/workspace.ts:287][E: packages/opencode/src/control-plane/workspace.ts:289] remote target 执行 caller 构造的 HTTP request，并在 non-2xx 或 decode failure 时 log warning 后返回 fallback。[E: packages/opencode/src/control-plane/workspace.ts:292][E: packages/opencode/src/control-plane/workspace.ts:301][E: packages/opencode/src/control-plane/workspace.ts:318]

Remote workspace sync 通过 `GET /global/event` 建 SSE stream，request accept 是 `text/event-stream`，非 2xx 抛 `WorkspaceSyncHttpError`。[E: packages/opencode/src/control-plane/workspace.ts:205][E: packages/opencode/src/control-plane/workspace.ts:207][E: packages/opencode/src/control-plane/workspace.ts:210][E: packages/opencode/src/control-plane/workspace.ts:211] SSE parser 识别 `data`、`id`、`retry` 字段，JSON parse 失败时产生 `type: "sse.message"` fallback。[E: packages/opencode/src/control-plane/workspace.ts:238][E: packages/opencode/src/control-plane/workspace.ts:239][E: packages/opencode/src/control-plane/workspace.ts:241][E: packages/opencode/src/control-plane/workspace.ts:242][E: packages/opencode/src/control-plane/workspace.ts:253][E: packages/opencode/src/control-plane/workspace.ts:256]

sync loop 对 payload type `"sync"` 且带 `syncEvent` 的事件调用 `events.replay(payload.syncEvent, { publish: true, ownerID: space.id })`。[E: packages/opencode/src/control-plane/workspace.ts:417][E: packages/opencode/src/control-plane/workspace.ts:418] replay 没失败时，代码继续把同一个 event 通过 `GlobalBus.emit("event", { directory, project, workspace, payload })` 发出。[E: packages/opencode/src/control-plane/workspace.ts:432][E: packages/opencode/src/control-plane/workspace.ts:436]

### Session warp

`sessionWarp` 先查 session 当前 workspace；如果 source 是 remote target，就先 `syncHistory(previous, target.url, target.headers)`；如果 source 是 local target，则 `prompt.cancel(input.sessionID)`。[E: packages/opencode/src/control-plane/workspace.ts:577][E: packages/opencode/src/control-plane/workspace.ts:589][E: packages/opencode/src/control-plane/workspace.ts:600] `copyChanges` 为真且当前 session 有 workspaceID 时，会从 source workspace 取 `/vcs/diff/raw` 或 local `vcs.diffRaw()`，再在目标 workspace apply patch。[E: packages/opencode/src/control-plane/workspace.ts:609][E: packages/opencode/src/control-plane/workspace.ts:615][E: packages/opencode/src/control-plane/workspace.ts:629][E: packages/opencode/src/control-plane/workspace.ts:633]

目标 workspaceID 为 null 时，`session.setWorkspace(... workspaceID: undefined)` 后返回。[E: packages/opencode/src/control-plane/workspace.ts:639][E: packages/opencode/src/control-plane/workspace.ts:642] 目标是 local target 时，只更新 session workspaceID 后返回。[E: packages/opencode/src/control-plane/workspace.ts:655][E: packages/opencode/src/control-plane/workspace.ts:658] 目标是 remote target 时，代码读取该 session 的 event rows、按 10 条切 chunk、POST `/sync/replay`，再 POST `/sync/steal`，最后更新 session workspaceID。[E: packages/opencode/src/control-plane/workspace.ts:661][E: packages/opencode/src/control-plane/workspace.ts:680][E: packages/opencode/src/control-plane/workspace.ts:688][E: packages/opencode/src/control-plane/workspace.ts:712][E: packages/opencode/src/control-plane/workspace.ts:728]

### HTTP routes

Workspace API root 是 `/experimental/workspace`，paths 是 adapter、root list/create、sync-list、status、remove `/:id`、warp。[E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:12][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:40][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:46] create 是 `POST` 到 `WorkspacePaths.list`，remove 是 `DELETE` 到 `WorkspacePaths.remove`，warp 返回 `NoContent`。[E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:73][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:105][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:117][E: packages/opencode/src/server/routes/instance/httpapi/groups/workspace.ts:120]

Control-plane move-session route 在 opencode server package 中声明，root 是 `/experimental/control-plane`，endpoint 是 `POST /experimental/control-plane/move-session`，success 是 `HttpApiSchema.NoContent`。[E: packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts:6][E: packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts:22][E: packages/opencode/src/server/routes/instance/httpapi/groups/control-plane.ts:24] Handler 从 V2 core `MoveSession.Service` 取 service，并调用 `service.moveSession(ctx.payload)`。[E: packages/opencode/src/server/routes/instance/httpapi/handlers/control-plane.ts:10][E: packages/opencode/src/server/routes/instance/httpapi/handlers/control-plane.ts:15]

## V2

`ControlPlaneMoveSession` 的 input 包含 `sessionID`、`destination.directory`、optional `moveChanges`，service interface 返回 `Effect<void, Error>`。[E: packages/core/src/control-plane/move-session.ts:16][E: packages/core/src/control-plane/move-session.ts:21][E: packages/core/src/control-plane/move-session.ts:23][E: packages/core/src/control-plane/move-session.ts:63] `moveSession` 先读取 current session，destination directory 与当前 directory 相同则直接 `return`。[E: packages/core/src/control-plane/move-session.ts:76][E: packages/core/src/control-plane/move-session.ts:79]

移动前它解析 source/destination project；如果 destination project id 不等于 current session project id，抛 `DestinationProjectMismatchError`。[E: packages/core/src/control-plane/move-session.ts:81][E: packages/core/src/control-plane/move-session.ts:84] 当 `moveChanges` 为真且 source/destination project directory 不同，它 capture git patch，再在 destination directory apply patch。[E: packages/core/src/control-plane/move-session.ts:87][E: packages/core/src/control-plane/move-session.ts:96]

移动核心事件是 `SessionEvent.Moved`，payload 包含 sessionID、新 `Location.Ref.make({ directory })`、destination project 相对 subdirectory、timestamp。[E: packages/core/src/control-plane/move-session.ts:99][E: packages/core/src/control-plane/move-session.ts:103] 如果移动过 patch，source directory 会执行 `git.softResetChanges(current.location.directory)`。[E: packages/core/src/control-plane/move-session.ts:106][E: packages/core/src/control-plane/move-session.ts:107] `defaultLayer` 里提供 `SessionExecution.noopLayer` 和 `SessionV2.defaultLayer`。[E: packages/core/src/control-plane/move-session.ts:128][E: packages/core/src/control-plane/move-session.ts:129]

`packages/core/src/integration.ts` 的 integration interface 是 provider credential/auth registry: 它提供 registry transform/update/get/list、connection list/key/oauth/update/remove，以及 attempt status/complete/cancel。[E: packages/core/src/integration.ts:196][E: packages/core/src/integration.ts:202][E: packages/core/src/integration.ts:204][E: packages/core/src/integration.ts:205][E: packages/core/src/integration.ts:238] `connection.key` 调 `credentials.create(...)` 存 credential；OAuth begin/status/complete/cancel 都围绕 attempt state 运作。[E: packages/core/src/integration.ts:464][E: packages/core/src/integration.ts:470][E: packages/core/src/integration.ts:477][E: packages/core/src/integration.ts:527][E: packages/core/src/integration.ts:535][E: packages/core/src/integration.ts:556] 因此它不是 workspace adapter/remote target 的实现点。[I]

## V1 / V2 对照

| 维度 | V1 workspace control plane | V2 core control plane |
| --- | --- | --- |
| Workspace orchestration | `Workspace` service 管 adapter、workspace create/syncList/sessionWarp/status。[E: packages/opencode/src/control-plane/workspace.ts:148][E: packages/opencode/src/control-plane/workspace.ts:162] | `MoveSession` 管 directory-level session move。[E: packages/core/src/control-plane/move-session.ts:63] |
| Built-in adapter | Builtin map 只有 `worktree`。[E: packages/opencode/src/control-plane/adapters/index.ts:5] | `MoveSession.Destination` 接 destination directory；是否存在其他 V2 adapter registry 不由本节点 source 证明。[E: packages/core/src/control-plane/move-session.ts:16][I] |
| Remote behavior | Adapter target 可以是 remote URL/headers，Workspace 用 HTTP/SSE routes 同步。[E: packages/opencode/src/control-plane/types.ts:36][E: packages/opencode/src/control-plane/workspace.ts:205] | 已读 core move-session path 覆盖 directory equality check、optional git patch 和 `SessionEvent.Moved` publish。[E: packages/core/src/control-plane/move-session.ts:79][E: packages/core/src/control-plane/move-session.ts:87][E: packages/core/src/control-plane/move-session.ts:96][E: packages/core/src/control-plane/move-session.ts:99][I] |

## Design notes

V1 workspace control plane 把 local worktree 与 remote opencode instance 都收敛成 adapter target union；local path 用 `InstanceStore.provide`，remote path 用 HTTP/SSE。[E: packages/opencode/src/control-plane/types.ts:30][E: packages/opencode/src/control-plane/workspace.ts:287][E: packages/opencode/src/control-plane/workspace.ts:292] V2 `MoveSession` 更小，它把 session location change 表达成 core event，并可选择搬运 git patch。[E: packages/core/src/control-plane/move-session.ts:87][E: packages/core/src/control-plane/move-session.ts:99][I]

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
