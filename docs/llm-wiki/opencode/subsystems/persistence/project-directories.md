---
id: persistence.project-directories
title: Project Directories 与 Copies
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/project.ts
  - packages/core/src/project/directories.ts
  - packages/core/src/project/copy.ts
  - packages/core/src/project/copy-strategies.ts
  - packages/core/src/project/sql.ts
  - packages/core/src/location-services.ts
  - packages/protocol/src/groups/project-copy.ts
  - packages/server/src/handlers/project-copy.ts
symbols:
  - ProjectDirectories.Service
  - ProjectCopy.Service
  - ProjectCopy.Strategy
  - ProjectDirectoryTable
  - ProjectCopyGroup
  - ProjectCopyHandler
related:
  - persistence.project-instance-location
  - session-v2.location-wiring
  - server-api.v2-routes
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 project directories 子系统把 project identity resolution 与 project copy/worktree 目录列表拆开：`Project` 负责 resolve/commit project id，`ProjectDirectories` 负责持久化目录记录，`ProjectCopy` 负责创建、删除、刷新 copy/worktree 目录。

## 能回答的问题

- `Project.resolve()` 如何选择 remote hash、cached id、root id?
- `project_directory` 表里 `strategy` 字段代表什么?
- `ProjectDirectories.create()` 的 ignore/replace conflict behavior 有什么区别?
- `ProjectCopy` 如何创建 git worktree copy 并登记目录?
- `/experimental/project/:projectID/copy` routes 如何调用 core service?

## Project Resolution

`Project.Service` 的 interface 包含 `directories(input)`、`resolve(input)` 和 `commit({ store, id })`；`directories` 直接委托 `ProjectDirectories.Service.list(input.projectID)`。[E: packages/core/src/project.ts:37][E: packages/core/src/project.ts:38][E: packages/core/src/project.ts:39][E: packages/core/src/project.ts:49][E: packages/core/src/project.ts:61][E: packages/core/src/project.ts:62]

`resolve(input)` 先通过 Git service 查找 repo；非 git path 返回 global project id 和 filesystem root directory；git repo 优先用 normalized remote hash，其次 repo-local cached id，最后 git root-derived id。[E: packages/core/src/project.ts:110][E: packages/core/src/project.ts:111][E: packages/core/src/project.ts:112][E: packages/core/src/project.ts:114][E: packages/core/src/project.ts:115][E: packages/core/src/project.ts:118][E: packages/core/src/project.ts:119][E: packages/core/src/project.ts:120] `commit({ store, id })` 把 resolved project id 写到 repo store 下的 `opencode` 文件。[E: packages/core/src/project.ts:49][E: packages/core/src/project.ts:124][E: packages/core/src/project.ts:125]

## Directory Records

`ProjectDirectoryTable` 主键是 `(project_id, directory)`，字段包含 `directory`、legacy-ish `type`、new `strategy` 和 `time_created`。[E: packages/core/src/project/sql.ts:20][E: packages/core/src/project/sql.ts:23][E: packages/core/src/project/sql.ts:27][E: packages/core/src/project/sql.ts:28][E: packages/core/src/project/sql.ts:29][E: packages/core/src/project/sql.ts:30][E: packages/core/src/project/sql.ts:34]

`ProjectDirectories.Directory` 是 `{ directory, strategy? }`；list output 返回同样 shape，并用 optional omit-undefined schema 表示 optional strategy。[E: packages/core/src/project/directories.ts:12][E: packages/core/src/project/directories.ts:13][E: packages/core/src/project/directories.ts:14][E: packages/core/src/project/directories.ts:39][E: packages/core/src/project/directories.ts:41][E: packages/core/src/project/directories.ts:42]

`ProjectDirectories.create(input, tx?)` 插入 `(project_id, directory, strategy)`；`behavior: "ignore"` 使用 `onConflictDoNothing`，`behavior: "replace"` 使用 `onConflictDoUpdate`，并且只有 strategy 从 null/不同值变更时才更新。[E: packages/core/src/project/directories.ts:65][E: packages/core/src/project/directories.ts:67][E: packages/core/src/project/directories.ts:68][E: packages/core/src/project/directories.ts:70][E: packages/core/src/project/directories.ts:71][E: packages/core/src/project/directories.ts:72][E: packages/core/src/project/directories.ts:73][E: packages/core/src/project/directories.ts:74][E: packages/core/src/project/directories.ts:75][E: packages/core/src/project/directories.ts:76][E: packages/core/src/project/directories.ts:78]

`list(projectID)` 按 `time_created desc, directory asc` 排序；`contains/get/remove` 都按 `(project_id, directory)` 查询或删除。[E: packages/core/src/project/directories.ts:100][E: packages/core/src/project/directories.ts:102][E: packages/core/src/project/directories.ts:104][E: packages/core/src/project/directories.ts:105][E: packages/core/src/project/directories.ts:84][E: packages/core/src/project/directories.ts:90][E: packages/core/src/project/directories.ts:121][E: packages/core/src/project/directories.ts:130][E: packages/core/src/project/directories.ts:139][E: packages/core/src/project/directories.ts:145]

## ProjectCopy Service

`ProjectCopy.Service` 支持 strategy registry、create、remove、refresh；它发布的 event type 是 `project.directories.updated`，payload 是 project id。[E: packages/core/src/project/copy.ts:101][E: packages/core/src/project/copy.ts:102][E: packages/core/src/project/copy.ts:103][E: packages/core/src/project/copy.ts:104][E: packages/core/src/project/copy.ts:105][E: packages/core/src/project/copy.ts:108][E: packages/core/src/project/copy.ts:137][E: packages/core/src/project/copy.ts:138]

默认 strategy 是 `git_worktree`：create 调 `git.worktree.create` 并 canonicalize destination；remove 调 `git.worktree.remove`；list 调 `git.worktree.list` 并标记 root/copy。[E: packages/core/src/project/copy.ts:155][E: packages/core/src/project/copy-strategies.ts:11][E: packages/core/src/project/copy-strategies.ts:12][E: packages/core/src/project/copy-strategies.ts:15][E: packages/core/src/project/copy-strategies.ts:16][E: packages/core/src/project/copy-strategies.ts:18][E: packages/core/src/project/copy-strategies.ts:21][E: packages/core/src/project/copy-strategies.ts:23][E: packages/core/src/project/copy-strategies.ts:26][E: packages/core/src/project/copy-strategies.ts:29]

`ProjectCopy.create` 要求 source directory 已在 `ProjectDirectories` 中登记，创建 destination parent directory，按 name/suffix 找一个最多重试 10 次的 destination，strategy create 成功后用 `ProjectDirectories.create(..., behavior: "replace")` 登记 copy directory 与 strategy id。[E: packages/core/src/project/copy.ts:159][E: packages/core/src/project/copy.ts:161][E: packages/core/src/project/copy.ts:172][E: packages/core/src/project/copy.ts:174][E: packages/core/src/project/copy.ts:175][E: packages/core/src/project/copy.ts:176][E: packages/core/src/project/copy.ts:179][E: packages/core/src/project/copy.ts:181][E: packages/core/src/project/copy.ts:185][E: packages/core/src/project/copy.ts:191][E: packages/core/src/project/copy.ts:194][E: packages/core/src/project/copy.ts:195]

`ProjectCopy.remove` 只允许删除有 strategy 的 stored copy directory；删除 strategy copy 后，从 `ProjectDirectories` 移除记录并按变更情况发布 event。[E: packages/core/src/project/copy.ts:201][E: packages/core/src/project/copy.ts:202][E: packages/core/src/project/copy.ts:203][E: packages/core/src/project/copy.ts:204][E: packages/core/src/project/copy.ts:205][E: packages/core/src/project/copy.ts:211] `ProjectCopy.refresh` 读取 stored directories，找出还存在的 source/root directories，逐 strategy 扫描 discovered copies，然后在 transaction 中 upsert discovered rows、remove missing rows，并返回 changed updated/removed lists。[E: packages/core/src/project/copy.ts:215][E: packages/core/src/project/copy.ts:216][E: packages/core/src/project/copy.ts:222][E: packages/core/src/project/copy.ts:223][E: packages/core/src/project/copy.ts:225][E: packages/core/src/project/copy.ts:228][E: packages/core/src/project/copy.ts:233][E: packages/core/src/project/copy.ts:244][E: packages/core/src/project/copy.ts:247][E: packages/core/src/project/copy.ts:258][E: packages/core/src/project/copy.ts:264][E: packages/core/src/project/copy.ts:265][E: packages/core/src/project/copy.ts:266]

## Location Services 与 API

旧 `packages/core/src/location-layer.ts` 已被新结构替代；`locationServices` 这个 `LayerNode.group` 现在直接纳入 `ProjectCopy.node`、`ProjectCopy.refreshNode`、`FileSystemSearch.node` 和 `FileSystem.node`。[E: packages/core/src/location-services.ts:42][E: packages/core/src/location-services.ts:54][E: packages/core/src/location-services.ts:55][E: packages/core/src/location-services.ts:56][E: packages/core/src/location-services.ts:57] `buildLocationServiceMap()` 用 `Location.boundNode(ref)` 作为 replacement，compile location graph 后包一层 `Layer.fresh`，LayerMap idle TTL 是 60 minutes。[E: packages/core/src/location-services.ts:84][E: packages/core/src/location-services.ts:90][E: packages/core/src/location-services.ts:91][E: packages/core/src/location-services.ts:94][E: packages/core/src/location-services.ts:95][E: packages/core/src/location-services.ts:105]

`ProjectCopyGroup` 现在在 protocol package 中声明，root 是 `/experimental/project/:projectID/copy`；routes 是 `POST root` 创建 copy、`DELETE root` 删除 copy、`POST root/refresh` 刷新目录记录。[E: packages/protocol/src/groups/project-copy.ts:7][E: packages/protocol/src/groups/project-copy.ts:23][E: packages/protocol/src/groups/project-copy.ts:25][E: packages/protocol/src/groups/project-copy.ts:36][E: packages/protocol/src/groups/project-copy.ts:47] handler create 使用 current `Location.Service.project.directory` 作为 sourceDirectory；remove/refresh 直接调用 `ProjectCopy.Service`，并把 domain errors 映射成 400 `ProjectCopyError`。[E: packages/server/src/handlers/project-copy.ts:14][E: packages/server/src/handlers/project-copy.ts:15][E: packages/server/src/handlers/project-copy.ts:17][E: packages/server/src/handlers/project-copy.ts:20][E: packages/server/src/handlers/project-copy.ts:26][E: packages/server/src/handlers/project-copy.ts:27][E: packages/server/src/handlers/project-copy.ts:32][E: packages/server/src/handlers/project-copy.ts:34][E: packages/server/src/handlers/project-copy.ts:42][E: packages/server/src/handlers/project-copy.ts:46]

## Gotcha

- `project_directory.type` still exists, but HEAD directory service writes `strategy`, not `type`.[E: packages/core/src/project/sql.ts:28][E: packages/core/src/project/sql.ts:29][E: packages/core/src/project/directories.ts:68]
- Source/root directories are stored with no strategy; copies store a strategy such as `git_worktree`.[E: packages/core/src/project/copy.ts:222][E: packages/core/src/project/copy.ts:233][E: packages/core/src/project/copy.ts:234]
- `ProjectCopy.refreshAfterBoot` now runs through `ProjectCopy.refreshNode` in `locationServices`, not through the deleted `location-layer.ts` file。[E: packages/core/src/project/copy.ts:110][E: packages/core/src/project/copy.ts:288][E: packages/core/src/project/copy.ts:290][E: packages/core/src/location-services.ts:55]

## Sources

- `packages/core/src/project.ts`
- `packages/core/src/project/directories.ts`
- `packages/core/src/project/copy.ts`
- `packages/core/src/project/copy-strategies.ts`
- `packages/core/src/project/sql.ts`
- `packages/core/src/location-services.ts`
- `packages/protocol/src/groups/project-copy.ts`
- `packages/server/src/handlers/project-copy.ts`

## 相关

- [Project/Instance/Location/Worktree 模型](project-instance-location.md)
- [Location-scoped runner 装配](../session-v2/location-wiring.md)
- [V2 route catalog](../../surface/server-api/v2-routes.md)
