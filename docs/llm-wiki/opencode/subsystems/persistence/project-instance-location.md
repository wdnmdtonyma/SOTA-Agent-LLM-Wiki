---
id: persistence.project-instance-location
title: Project/Instance/Location/Worktree 模型
kind: subsystem
tier: T2
v: shared
source:
  - packages/core/src/project.ts
  - packages/core/src/location.ts
  - packages/core/src/location-service-map.ts
  - packages/core/src/location-services.ts
  - packages/core/src/filesystem.ts
  - packages/opencode/src/project/project.ts
  - packages/opencode/src/project/instance-context.ts
  - packages/opencode/src/project/instance-store.ts
  - packages/opencode/src/project/bootstrap-service.ts
  - packages/opencode/src/project/bootstrap.ts
  - packages/opencode/src/effect/app-node-builder-v1.ts
  - specs/project.md
  - AGENTS.md
symbols:
  - ProjectV2.Service
  - Project.Service
  - Location.Service
  - LocationServiceMap.Service
  - InstanceStore.Service
  - InstanceContext
related:
  - spine.boot
  - session-v2.location-wiring
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Project/Instance/Location 是 opencode 持久化与运行时作用域的三层边界：V2 `ProjectV2` 解析稳定 project identity，V2 `Location` 给 core services 一个 directory/workspace/project scope，V1 `InstanceStore` 为每个 cwd 缓存 legacy service bundle。

## 能回答的问题

- project ID 为什么优先来自 git remote hash，其次 repo-local cache，再其次 root commit，最后才是 `global`。
- `Location.Info` 与 `Location.Ref` 如何承载 directory、workspaceID 和 project identity。
- `LocationServiceMap` 在新源码结构中如何构造 per-location service graph。
- V1 `InstanceStore` 为什么按 resolved cwd 缓存 bootstrap 结果。
- 外部目录权限边界如何用 `InstanceContext.directory/worktree` 判断。

## 职责边界

本节点解释 identity 和 scope：`ProjectV2.resolve()`、`Location.boundNode(ref)`、`LocationServiceMap`、V1 `Project.fromDirectory()`、V1 `InstanceStore.load/reload/dispose`。Session runner 的 Location-scoped dependency graph 由 `subsystems/session-v2/location-wiring` 覆盖；worktree sandbox 创建由 `subsystems/execution/worktree` 覆盖。

## V2 Project

`ProjectV2.ID` 和 `ProjectV2.Vcs` 来自 `ProjectSchema`；`ProjectV2.Info` 只含 project id。[E: packages/core/src/project.ts:14][E: packages/core/src/project.ts:17][E: packages/core/src/project.ts:20][E: packages/core/src/project.ts:21] `ProjectV2.Interface.resolve` 输入 absolute path，输出 optional previous ID、resolved ID、project directory、optional VCS；`commit` 写 resolved project ID 到 repo-local cache。[E: packages/core/src/project.ts:30][E: packages/core/src/project.ts:31][E: packages/core/src/project.ts:32][E: packages/core/src/project.ts:33][E: packages/core/src/project.ts:34][E: packages/core/src/project.ts:37][E: packages/core/src/project.ts:39][E: packages/core/src/project.ts:49]

`resolve(input)` 先调用 `git.repo.discover(input)`；没有 git repo 时返回 `id: ID.global`、directory 为 filesystem root、`vcs: undefined`。[E: packages/core/src/project.ts:110][E: packages/core/src/project.ts:111][E: packages/core/src/project.ts:112] repo 存在时，`previous = cached(repo.commonDirectory)` 读取 `<repo.commonDirectory>/opencode` cache file，remote ID 用 `Hash.fast("git-remote:<normalized>")`，fallback 顺序是 previous cache ID、root commit、global。[E: packages/core/src/project.ts:65][E: packages/core/src/project.ts:66][E: packages/core/src/project.ts:68][E: packages/core/src/project.ts:73][E: packages/core/src/project.ts:78][E: packages/core/src/project.ts:105][E: packages/core/src/project.ts:106][E: packages/core/src/project.ts:107][E: packages/core/src/project.ts:114][E: packages/core/src/project.ts:115][E: packages/core/src/project.ts:118] resolve 返回 repo worktree directory 与 `{ type: "git", store: repo.commonDirectory }`。[E: packages/core/src/project.ts:119][E: packages/core/src/project.ts:120] `commit({ store, id })` 写 `<store>/opencode` cache file。[E: packages/core/src/project.ts:124][E: packages/core/src/project.ts:125]

## V2 Location

`Location` re-exports schema `Info`/`Ref` from `@opencode-ai/schema/location`；`Location.Service` tag 是 `@opencode/Location`，Interface 继承 Info 并附加 optional `vcs`。[E: packages/core/src/location.ts:2][E: packages/core/src/location.ts:9][E: packages/core/src/location.ts:11][E: packages/core/src/location.ts:12][E: packages/core/src/location.ts:15]

`Location.boundNode(ref)` 用 `Project.Service` 解析 `ref.directory`，返回的 service 保留 opened directory、input workspaceID、resolved project id/directory 和 optional VCS。[E: packages/core/src/location.ts:19][E: packages/core/src/location.ts:23][E: packages/core/src/location.ts:24][E: packages/core/src/location.ts:25][E: packages/core/src/location.ts:26][E: packages/core/src/location.ts:27][E: packages/core/src/location.ts:28][E: packages/core/src/location.ts:29][E: packages/core/src/location.ts:34][E: packages/core/src/location.ts:37]

`LocationServiceMap.Service` 是 `LayerMap<Location.Ref, LocationServices, LocationError>`，`get(ref)` unwraps `locations.get(ref)` into a Layer。[E: packages/core/src/location-service-map.ts:7][E: packages/core/src/location-service-map.ts:9][E: packages/core/src/location-service-map.ts:11][E: packages/core/src/location-service-map.ts:12] 旧 `packages/core/src/location-layer.ts` 已删除；new graph lives in `location-services.ts` as `locationServices = LayerNode.group([...])`。[E: packages/core/src/location-services.ts:42]

`locationServices` 直接纳入 Location、Policy、Config、Agent、Command、Reference、Integration、Catalog、Plugin、ProjectCopy、FileSystem/Search、Watcher、Pty、Skill、System Context、LocationMutation、Permission、ToolRegistry、BuiltInTools、SessionRunner、Snapshot 等 per-location nodes。[E: packages/core/src/location-services.ts:42][E: packages/core/src/location-services.ts:43][E: packages/core/src/location-services.ts:44][E: packages/core/src/location-services.ts:45][E: packages/core/src/location-services.ts:46][E: packages/core/src/location-services.ts:47][E: packages/core/src/location-services.ts:48][E: packages/core/src/location-services.ts:49][E: packages/core/src/location-services.ts:50][E: packages/core/src/location-services.ts:52][E: packages/core/src/location-services.ts:54][E: packages/core/src/location-services.ts:56][E: packages/core/src/location-services.ts:57][E: packages/core/src/location-services.ts:58][E: packages/core/src/location-services.ts:59][E: packages/core/src/location-services.ts:60][E: packages/core/src/location-services.ts:61][E: packages/core/src/location-services.ts:63][E: packages/core/src/location-services.ts:65][E: packages/core/src/location-services.ts:67][E: packages/core/src/location-services.ts:68][E: packages/core/src/location-services.ts:75][E: packages/core/src/location-services.ts:78]

`buildLocationServiceMap()` binds each lookup ref by replacing `Location.node` with `Location.boundNode(ref)`, compiles the location graph with `Layer.fresh`, provides hoisted global deps, and configures LayerMap idle TTL as 60 minutes。[E: packages/core/src/location-services.ts:84][E: packages/core/src/location-services.ts:90][E: packages/core/src/location-services.ts:91][E: packages/core/src/location-services.ts:92][E: packages/core/src/location-services.ts:94][E: packages/core/src/location-services.ts:95][E: packages/core/src/location-services.ts:102][E: packages/core/src/location-services.ts:105]

## V1 InstanceContext 和权限边界

`InstanceContext` 是 legacy per-instance scope，包含 `directory`、`worktree`、`project`。[E: packages/opencode/src/project/instance-context.ts:5][E: packages/opencode/src/project/instance-context.ts:6][E: packages/opencode/src/project/instance-context.ts:7][E: packages/opencode/src/project/instance-context.ts:8] `containsPath(filepath, ctx)` 先检查 filepath 是否在 opened directory 内；然后检查是否在 git worktree 内。[E: packages/opencode/src/project/instance-context.ts:18][E: packages/opencode/src/project/instance-context.ts:19][E: packages/opencode/src/project/instance-context.ts:23] 非 git projects 会把 worktree 设为 `/`，helper 遇到 `/` worktree 时直接返回 false，避免把任意 absolute path 都视为内部路径。[E: packages/opencode/src/project/project.ts:217][E: packages/opencode/src/project/instance-context.ts:22][I]

## V1 Legacy Project service

V1 `Project.Service` tag 是 `@opencode/Project`。[E: packages/opencode/src/project/project.ts:102] `Project.fromDirectory(directory)` 调用 core `projectV2.resolve(AbsolutePath.make(directory))`，再把 global non-vcs case 的 worktree 设为 `/`，git/project case 的 worktree 设为 resolved directory。[E: packages/opencode/src/project/project.ts:213][E: packages/opencode/src/project/project.ts:216][E: packages/opencode/src/project/project.ts:217] 它调用 `migrateProjectId(previous, projectID)`，再从 `ProjectTable` 读取 existing row 或创建新的 `Info` object，最终通过 `insert(ProjectTable).values(...).onConflictDoUpdate(...)` upsert project row。[E: packages/opencode/src/project/project.ts:220][E: packages/opencode/src/project/project.ts:221][E: packages/opencode/src/project/project.ts:222][E: packages/opencode/src/project/project.ts:225][E: packages/opencode/src/project/project.ts:257][E: packages/opencode/src/project/project.ts:273][E: packages/opencode/src/project/project.ts:288]

如果 resolved project 不是 global，legacy service 会把此前按 global project + directory 记录的 sessions 改写成 resolved project ID。[E: packages/opencode/src/project/project.ts:291][E: packages/opencode/src/project/project.ts:292][E: packages/opencode/src/project/project.ts:295] 它还调用 `saveProjectDirectory`，该 helper 向 `ProjectDirectoryTable` insert opened directory；git project 会调用 `projectV2.commit({ store, id })` 写 repo-local cache。[E: packages/opencode/src/project/project.ts:195][E: packages/opencode/src/project/project.ts:200][E: packages/opencode/src/project/project.ts:202][E: packages/opencode/src/project/project.ts:300][E: packages/opencode/src/project/project.ts:307]

## V1 InstanceStore 控制流

`InstanceStore.Service` tag 是 `@opencode/InstanceStore`，接口暴露 `load/reload/dispose/disposeDirectory/disposeAll/provide`。[E: packages/opencode/src/project/instance-store.ts:20][E: packages/opencode/src/project/instance-store.ts:21][E: packages/opencode/src/project/instance-store.ts:22][E: packages/opencode/src/project/instance-store.ts:23][E: packages/opencode/src/project/instance-store.ts:24][E: packages/opencode/src/project/instance-store.ts:25][E: packages/opencode/src/project/instance-store.ts:26][E: packages/opencode/src/project/instance-store.ts:29]

layer 依赖 legacy `Project.Service` 和 `InstanceBootstrap.Service`，内部 cache 是 `Map<string, Entry>`，Entry 持有一个 `Deferred<InstanceContext>`。[E: packages/opencode/src/project/instance-store.ts:37][E: packages/opencode/src/project/instance-store.ts:40][E: packages/opencode/src/project/instance-store.ts:41][E: packages/opencode/src/project/instance-store.ts:43] `load(input)` 先用 `FSUtil.resolve(input.directory)` canonicalize directory；同一 directory 已有 cache entry 时等待 existing deferred，cache miss 时创建 entry、放入 Map、fork `completeLoad`，再等待 deferred 完成。[E: packages/opencode/src/project/instance-store.ts:108][E: packages/opencode/src/project/instance-store.ts:109][E: packages/opencode/src/project/instance-store.ts:112][E: packages/opencode/src/project/instance-store.ts:113][E: packages/opencode/src/project/instance-store.ts:115][E: packages/opencode/src/project/instance-store.ts:116][E: packages/opencode/src/project/instance-store.ts:119][E: packages/opencode/src/project/instance-store.ts:121]

`boot(input)` 如果 caller 已提供 `project` 和 `worktree`，直接构造 `InstanceContext`；否则调用 legacy `project.fromDirectory(input.directory)`，把返回的 `sandbox` 作为 `worktree`。[E: packages/opencode/src/project/instance-store.ts:45][E: packages/opencode/src/project/instance-store.ts:47][E: packages/opencode/src/project/instance-store.ts:48][E: packages/opencode/src/project/instance-store.ts:54][E: packages/opencode/src/project/instance-store.ts:57] boot 完成前会在 `InstanceRef` service 中提供 ctx 并运行 `bootstrap.run`。[E: packages/opencode/src/project/instance-store.ts:61]

`reload(input)` 为同一 resolved directory 替换 cache entry；如果有 previous entry，等待它完成、运行 disposers、发 disposed event，再 boot 新 entry。[E: packages/opencode/src/project/instance-store.ts:126][E: packages/opencode/src/project/instance-store.ts:127][E: packages/opencode/src/project/instance-store.ts:130][E: packages/opencode/src/project/instance-store.ts:131][E: packages/opencode/src/project/instance-store.ts:132][E: packages/opencode/src/project/instance-store.ts:136][E: packages/opencode/src/project/instance-store.ts:137][E: packages/opencode/src/project/instance-store.ts:138][E: packages/opencode/src/project/instance-store.ts:140] `disposeContext(ctx)` 调用 instance registry disposers，然后向 `GlobalBus` 发 `server.instance.disposed`。[E: packages/opencode/src/project/instance-store.ts:94][E: packages/opencode/src/project/instance-store.ts:96][E: packages/opencode/src/project/instance-store.ts:97][E: packages/opencode/src/project/instance-store.ts:81][E: packages/opencode/src/project/instance-store.ts:86]

## Bootstrap bundle

`InstanceBootstrap.Service` 只有一个 `run: Effect<void>` method。[E: packages/opencode/src/project/bootstrap-service.ts:3][E: packages/opencode/src/project/bootstrap-service.ts:4][E: packages/opencode/src/project/bootstrap-service.ts:7] concrete `bootstrap.ts` 在 layer init 时抓取 Config、Format、LSP、Plugin、Project、ShareNext、Snapshot、Vcs services，使 `run` 本身不需要额外 R。[E: packages/opencode/src/project/bootstrap.ts:23][E: packages/opencode/src/project/bootstrap.ts:24][E: packages/opencode/src/project/bootstrap.ts:25][E: packages/opencode/src/project/bootstrap.ts:26][E: packages/opencode/src/project/bootstrap.ts:27][E: packages/opencode/src/project/bootstrap.ts:28][E: packages/opencode/src/project/bootstrap.ts:29][E: packages/opencode/src/project/bootstrap.ts:30] `run` 先 eager `config.get()`，再 `plugin.init()`，然后并发 init `lsp/shareNext/format/vcs/snapshot/project`。[E: packages/opencode/src/project/bootstrap.ts:32][E: packages/opencode/src/project/bootstrap.ts:36][E: packages/opencode/src/project/bootstrap.ts:38][E: packages/opencode/src/project/bootstrap.ts:41][E: packages/opencode/src/project/bootstrap.ts:42]

`packages/opencode/src/project/instance-layer.ts` 已不在 HEAD；V1 app-node build path 现在通过 `app-node-builder-v1.ts` 将 `InstanceStore.bootstrapNode` 替换为 concrete `InstanceBootstrap.node`。[E: packages/opencode/src/effect/app-node-builder-v1.ts:1][E: packages/opencode/src/effect/app-node-builder-v1.ts:3][E: packages/opencode/src/effect/app-node-builder-v1.ts:4][E: packages/opencode/src/effect/app-node-builder-v1.ts:6][E: packages/opencode/src/effect/app-node-builder-v1.ts:9]

## V1 / V2 对照

| 维度 | V1 | V2 |
| --- | --- | --- |
| Project identity owner | Legacy `Project.fromDirectory` owns SQL upsert, sandbox list cleanup, optional icon discovery, and GlobalBus `project.updated` emission。[E: packages/opencode/src/project/project.ts:233][E: packages/opencode/src/project/project.ts:247][E: packages/opencode/src/project/project.ts:257][E: packages/opencode/src/project/project.ts:288][E: packages/opencode/src/project/project.ts:305] | `ProjectV2.resolve` owns stable ID resolution and cache commit bridge。[E: packages/core/src/project.ts:110][E: packages/core/src/project.ts:124] |
| Runtime scope | `InstanceContext` is per cwd and includes `directory/worktree/project`。[E: packages/opencode/src/project/instance-context.ts:5] | `Location.Service` is core location scope and includes `directory/workspaceID/project` plus optional `vcs`。[E: packages/core/src/location.ts:11][E: packages/core/src/location.ts:25][E: packages/core/src/location.ts:29] |
| Service cache | `InstanceStore` caches by resolved directory, entry is Deferred boot result。[E: packages/opencode/src/project/instance-store.ts:109][E: packages/opencode/src/project/instance-store.ts:115] | `LocationServiceMap` caches Location layer lookup by `Location.Ref` with 60 minute idle TTL。[E: packages/core/src/location-service-map.ts:9][E: packages/core/src/location-services.ts:105] |
| External path boundary | `containsPath` checks opened directory or git worktree, excluding `/` worktree fallback。[E: packages/opencode/src/project/instance-context.ts:19][E: packages/opencode/src/project/instance-context.ts:22] | V2 `FileSystem` resolves paths against `Location.directory` and dies when resolved paths escape it。[E: packages/core/src/filesystem.ts:67][E: packages/core/src/filesystem.ts:68][E: packages/core/src/filesystem.ts:69] |

## 设计动机与 gotchas

- `specs/project.md` states the goal: one OpenCode instance should run sessions for multiple projects and different worktrees per project。[E: specs/project.md:3] V1 `InstanceStore` per-directory cache and V2 `LocationServiceMap` per-location cache are two implementations serving that multi-project shape。[I]
- Remote-based project ID gives stable identity across clones of the same non-file remote; root-commit fallback gives a deterministic local identity when no usable remote is available。[E: packages/core/src/project.ts:78][E: packages/core/src/project.ts:105][E: packages/core/src/project.ts:115]
- Root `AGENTS.md` V2 guidance says `SessionRunner`, model resolution, tool registry, permissions, and filesystem should be Location-scoped; `locationServices` wires those service nodes under each Location lookup。[E: AGENTS.md:156][E: packages/core/src/location-services.ts:56][E: packages/core/src/location-services.ts:57][E: packages/core/src/location-services.ts:67][E: packages/core/src/location-services.ts:68][E: packages/core/src/location-services.ts:76][E: packages/core/src/location-services.ts:78][I]

## Sources

- `packages/core/src/project.ts`
- `packages/core/src/location.ts`
- `packages/core/src/location-service-map.ts`
- `packages/core/src/location-services.ts`
- `packages/core/src/filesystem.ts`
- `packages/opencode/src/project/project.ts`
- `packages/opencode/src/project/instance-context.ts`
- `packages/opencode/src/project/instance-store.ts`
- `packages/opencode/src/project/bootstrap-service.ts`
- `packages/opencode/src/project/bootstrap.ts`
- `packages/opencode/src/effect/app-node-builder-v1.ts`
- `specs/project.md`
- `AGENTS.md`

## 相关

- [进程启动与运行时装配](../../spine/boot.md)
- [Location-scoped runner 装配](../session-v2/location-wiring.md)
- [Worktree 管理](../execution/worktree.md)
