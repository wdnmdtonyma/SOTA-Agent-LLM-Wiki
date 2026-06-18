---
id: persistence.project-directories
title: Project Directories 与 Copies
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/project.ts, packages/core/src/project/directories.ts, packages/core/src/project/copy.ts, packages/core/src/project/copy-strategies.ts, packages/core/src/project/sql.ts, packages/core/src/location-layer.ts, packages/server/src/groups/project-copy.ts, packages/server/src/handlers/project-copy.ts]
symbols: [ProjectDirectories.Service, ProjectCopy.Service, ProjectCopy.Strategy, ProjectDirectoryTable, ProjectCopyGroup, ProjectCopyHandler]
related: [persistence.project-instance-location, session-v2.location-wiring, server-api.v2-routes]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 project directories 子系统把 project identity resolution 与 project copy/worktree 目录列表拆开：`Project` 负责 resolve/commit project id，`ProjectDirectories` 负责持久化目录记录，`ProjectCopy` 负责创建、删除、刷新 copy/worktree 目录。

## 能回答的问题
- `Project.resolve()` 如何选择 remote hash、cached id、root id?
- `project_directory` 表里 `strategy` 字段代表什么?
- `ProjectDirectories.create()` 的 ignore/replace conflict behavior 有什么区别?
- `ProjectCopy` 如何创建 git worktree copy 并登记目录?
- `/experimental/project/:projectID/copy` routes 如何调用 core service?

## Project Resolution

`Project.Service` 的 interface 包含 `directories(projectID)`、`resolve(path)` 和 `commit({ store, id })`；`directories` 直接委托 `ProjectDirectories.Service.list(projectID)`。[E: packages/core/src/project.ts:37][E: packages/core/src/project.ts:38][E: packages/core/src/project.ts:39][E: packages/core/src/project.ts:49][E: packages/core/src/project.ts:57][E: packages/core/src/project.ts:59][E: packages/core/src/project.ts:61][E: packages/core/src/project.ts:62]

`resolve(input)` 先通过 Git service 查找 repo；非 git path 返回 global project id 和 filesystem root directory；git repo 优先用 normalized remote hash，其次 repo-local cached id，最后 git root-derived id。[E: packages/core/src/project.ts:110][E: packages/core/src/project.ts:111][E: packages/core/src/project.ts:112][E: packages/core/src/project.ts:114][E: packages/core/src/project.ts:115][E: packages/core/src/project.ts:118][E: packages/core/src/project.ts:119][E: packages/core/src/project.ts:120]

`commit({ store, id })` 把 resolved project id 写到 repo store 下的 `opencode` 文件；代码注释说明这是旧 opencode project service 和 core project service 共存期的桥接方法。[E: packages/core/src/project.ts:49][E: packages/core/src/project.ts:49][E: packages/core/src/project.ts:49][E: packages/core/src/project.ts:124][E: packages/core/src/project.ts:125]

## Directory Records

`ProjectDirectoryTable` 主键是 `(project_id, directory)`，字段包含 `directory`、legacy-ish `type`、new `strategy` 和 `time_created`。[E: packages/core/src/project/sql.ts:20][E: packages/core/src/project/sql.ts:23][E: packages/core/src/project/sql.ts:27][E: packages/core/src/project/sql.ts:28][E: packages/core/src/project/sql.ts:29][E: packages/core/src/project/sql.ts:30][E: packages/core/src/project/sql.ts:34]

`ProjectDirectories.Directory` 是 `{ directory, strategy? }`；list output 返回同样 shape，并用 optional omit undefined schema 表示 optional strategy。[E: packages/core/src/project/directories.ts:12][E: packages/core/src/project/directories.ts:13][E: packages/core/src/project/directories.ts:14][E: packages/core/src/project/directories.ts:39][E: packages/core/src/project/directories.ts:41][E: packages/core/src/project/directories.ts:42]

`ProjectDirectories.create(input, tx?)` 插入 `(project_id, directory, strategy)`；`behavior: "ignore"` 使用 `onConflictDoNothing`，`behavior: "replace"` 使用 `onConflictDoUpdate`，并且只有 strategy 从 null/不同值变更时才更新。[E: packages/core/src/project/directories.ts:17][E: packages/core/src/project/directories.ts:20][E: packages/core/src/project/directories.ts:21][E: packages/core/src/project/directories.ts:65][E: packages/core/src/project/directories.ts:68][E: packages/core/src/project/directories.ts:70][E: packages/core/src/project/directories.ts:71][E: packages/core/src/project/directories.ts:73][E: packages/core/src/project/directories.ts:78]

`list(projectID)` 按 `time_created desc, directory asc` 排序；`contains/get/remove` 都按 `(project_id, directory)` 查询或删除。[E: packages/core/src/project/directories.ts:100][E: packages/core/src/project/directories.ts:104][E: packages/core/src/project/directories.ts:105][E: packages/core/src/project/directories.ts:111][E: packages/core/src/project/directories.ts:121][E: packages/core/src/project/directories.ts:130][E: packages/core/src/project/directories.ts:139][E: packages/core/src/project/directories.ts:145][E: packages/core/src/project/directories.ts:84][E: packages/core/src/project/directories.ts:90]

## ProjectCopy Service

`ProjectCopy.Service` 支持 strategy registry、create、remove、refresh；它发布的 event type 是 `project.directories.updated`，payload 是 project id。[E: packages/core/src/project/copy.ts:117][E: packages/core/src/project/copy.ts:118][E: packages/core/src/project/copy.ts:119][E: packages/core/src/project/copy.ts:120][E: packages/core/src/project/copy.ts:121][E: packages/core/src/project/copy.ts:110][E: packages/core/src/project/copy.ts:112][E: packages/core/src/project/copy.ts:113]

默认 strategy 是 `git_worktree`：create 调 `git.worktreeCreate` 并 canonicalize destination；remove 调 `git.worktreeRemove`；list 调 `git.worktreeList` 并标记 root/copy。[E: packages/core/src/project/copy.ts:173][E: packages/core/src/project/copy.ts:173][E: packages/core/src/project/copy-strategies.ts:14][E: packages/core/src/project/copy-strategies.ts:15][E: packages/core/src/project/copy-strategies.ts:16][E: packages/core/src/project/copy-strategies.ts:17][E: packages/core/src/project/copy-strategies.ts:20][E: packages/core/src/project/copy-strategies.ts:23][E: packages/core/src/project/copy-strategies.ts:25][E: packages/core/src/project/copy-strategies.ts:29]

`ProjectCopy.create` 要求 source directory 已在 `ProjectDirectories` 中登记，创建 destination parent directory，按 name/suffix 找一个最多重试 10 次的 destination，strategy create 成功后用 `ProjectDirectories.create(..., behavior: "replace")` 登记 copy directory 与 strategy id。[E: packages/core/src/project/copy.ts:177][E: packages/core/src/project/copy.ts:179][E: packages/core/src/project/copy.ts:190][E: packages/core/src/project/copy.ts:192][E: packages/core/src/project/copy.ts:193][E: packages/core/src/project/copy.ts:194][E: packages/core/src/project/copy.ts:197][E: packages/core/src/project/copy.ts:199][E: packages/core/src/project/copy.ts:203][E: packages/core/src/project/copy.ts:209][E: packages/core/src/project/copy.ts:212][E: packages/core/src/project/copy.ts:213]

`ProjectCopy.remove` 只允许删除有 strategy 的 stored copy directory；删除 strategy copy 后，从 `ProjectDirectories` 移除记录并按变更情况发布 event。[E: packages/core/src/project/copy.ts:219][E: packages/core/src/project/copy.ts:221][E: packages/core/src/project/copy.ts:222][E: packages/core/src/project/copy.ts:223][E: packages/core/src/project/copy.ts:227][E: packages/core/src/project/copy.ts:229]

`ProjectCopy.refresh` 读取 stored directories，找出还存在的 source/root directories，逐 strategy 扫描 discovered copies，然后在 transaction 中 upsert discovered rows、remove missing rows，并返回 changed updated/removed lists。[E: packages/core/src/project/copy.ts:233][E: packages/core/src/project/copy.ts:234][E: packages/core/src/project/copy.ts:240][E: packages/core/src/project/copy.ts:243][E: packages/core/src/project/copy.ts:246][E: packages/core/src/project/copy.ts:259][E: packages/core/src/project/copy.ts:261][E: packages/core/src/project/copy.ts:262][E: packages/core/src/project/copy.ts:265][E: packages/core/src/project/copy.ts:276][E: packages/core/src/project/copy.ts:282][E: packages/core/src/project/copy.ts:286]

## Location Layer 与 API

`LocationServiceMap` 的 per-location base 合并 `ProjectCopy.locationLayer`，并在 boot 后 fork `ProjectCopy.refreshAfterBoot`；dependencies 中包含 `Project.defaultLayer` 与 `ProjectDirectories.defaultLayer`。[E: packages/core/src/location-layer.ts:58][E: packages/core/src/location-layer.ts:69][E: packages/core/src/location-layer.ts:108][E: packages/core/src/location-layer.ts:108][E: packages/core/src/location-layer.ts:122][E: packages/core/src/location-layer.ts:127][E: packages/core/src/location-layer.ts:138]

`ProjectCopyGroup` 暴露 experimental routes：`POST /experimental/project/:projectID/copy` 创建 copy，`DELETE /experimental/project/:projectID/copy` 删除 copy，`POST /experimental/project/:projectID/copy/refresh` 刷新目录记录。[E: packages/server/src/groups/project-copy.ts:7][E: packages/server/src/groups/project-copy.ts:23][E: packages/server/src/groups/project-copy.ts:25][E: packages/server/src/groups/project-copy.ts:36][E: packages/server/src/groups/project-copy.ts:47]

handler create 使用 current `Location.Service.project.directory` 作为 sourceDirectory；remove/refresh 直接调用 `ProjectCopy.Service`，并把 domain errors 映射成 400 `ProjectCopyError`。[E: packages/server/src/handlers/project-copy.ts:14][E: packages/server/src/handlers/project-copy.ts:15][E: packages/server/src/handlers/project-copy.ts:17][E: packages/server/src/handlers/project-copy.ts:20][E: packages/server/src/handlers/project-copy.ts:26][E: packages/server/src/handlers/project-copy.ts:27][E: packages/server/src/handlers/project-copy.ts:32][E: packages/server/src/handlers/project-copy.ts:34][E: packages/server/src/handlers/project-copy.ts:42][E: packages/server/src/handlers/project-copy.ts:46]

## Gotcha

- `project_directory.type` still exists, but HEAD directory service writes `strategy`, not `type`.[E: packages/core/src/project/sql.ts:28][E: packages/core/src/project/sql.ts:29][E: packages/core/src/project/directories.ts:68]
- Source/root directories are stored with no strategy; copies store a strategy such as `git_worktree`.[E: packages/core/src/project/copy.ts:240][E: packages/core/src/project/copy.ts:251][E: packages/core/src/project/copy.ts:252]
- `ProjectCopy.refreshAfterBoot` runs after `PluginBoot.wait()`, so directory refresh is asynchronous relative to location boot.[E: packages/core/src/project/copy.ts:126][E: packages/core/src/project/copy.ts:131][E: packages/core/src/project/copy.ts:141]

## Sources
- packages/core/src/project.ts
- packages/core/src/project/directories.ts
- packages/core/src/project/copy.ts
- packages/core/src/project/copy-strategies.ts
- packages/core/src/project/sql.ts
- packages/core/src/location-layer.ts
- packages/server/src/groups/project-copy.ts
- packages/server/src/handlers/project-copy.ts

## 相关
- [Project/Instance/Location/Worktree 模型](project-instance-location.md)
- [Location-scoped runner 装配](../session-v2/location-wiring.md)
- [V2 route catalog](../../surface/server-api/v2-routes.md)
