---
id: persistence.project-instance-location
title: Project/Instance/Location/Worktree 模型
kind: subsystem
tier: T2
v: shared
source:
  - packages/core/src/project.ts
  - packages/core/src/location.ts
  - packages/core/src/location-layer.ts
  - packages/opencode/src/project/instance-store.ts
symbols:
  - ProjectV2.Service
  - Project.Service
  - Location.Service
  - InstanceStore.Service
  - InstanceContext
related:
  - spine.boot
  - session-v2.location-wiring
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Project/Instance/Location 是 opencode 持久化与运行时作用域的三层边界：V2 `ProjectV2` 解析稳定 project identity，V2 `Location` 给 core services 一个 directory/workspace/project scope，V1 `InstanceStore` 为每个 cwd 缓存 legacy service bundle。

## 能回答的问题

- project ID 为什么优先来自 git remote hash，其次 repo-local cache，再其次 root commit，最后才是 `global`。
- `Location.Info` 与 `Location.Ref` 如何承载 directory、workspaceID 和 project identity。
- V1 `InstanceStore` 为什么按 resolved cwd 缓存 bootstrap 结果。
- 外部目录权限边界如何用 `InstanceContext.directory/worktree` 判断。
- V1 legacy Project service 如何把 V2 project resolution 结果写入 SQL tables。

## 职责边界

本节点解释 identity 和 scope：`ProjectV2.resolve()`、`Location.layer(ref)`、V1 `Project.fromDirectory()`、V1 `InstanceStore.load/reload/dispose`。Session runner 的 Location-scoped dependency graph 由 `subsystems/session-v2/location-wiring` 覆盖；worktree sandbox 创建由 `subsystems/execution/worktree` 覆盖。

## V2

### 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `ProjectV2.ID` | branded string，static `global` 值是 literal `"global"`。 | [E: packages/core/src/project.ts:15][E: packages/core/src/project.ts:18] |
| `ProjectV2.Vcs` | 当前只建模 git，字段是 `{ type: "git", store: AbsolutePath }`。 | [E: packages/core/src/project.ts:17][E: packages/core/src/project.ts:18][E: packages/core/src/project/schema.ts:7][E: packages/core/src/project/schema.ts:8] |
| `ProjectV2.Interface.resolve` | 输入 absolute path，输出 optional previous ID、resolved ID、project directory、optional VCS。 | [E: packages/core/src/project.ts:30][E: packages/core/src/project.ts:31][E: packages/core/src/project.ts:32][E: packages/core/src/project.ts:33][E: packages/core/src/project.ts:34][E: packages/core/src/project.ts:37][E: packages/core/src/project.ts:39] |
| `ProjectV2.Interface.commit` | bridge method 写 resolved project ID 到 repo-local cache；接口注释说明它是 old opencode project service 与 core project service 的临时协作点。 | [E: packages/core/src/project.ts:49][E: packages/core/src/project.ts:124][E: packages/core/src/project.ts:125] |
| `Location.Ref` | 输入 scope 包含 `directory` 和 optional `workspaceID`。 | [E: packages/core/src/location.ts:8][E: packages/core/src/location.ts:9][E: packages/core/src/location.ts:10] |
| `Location.Info` | runtime scope 包含 `directory`、optional `workspaceID`、`project.id`、`project.directory`。 | [E: packages/core/src/location.ts:13][E: packages/core/src/location.ts:14][E: packages/core/src/location.ts:15][E: packages/core/src/location.ts:16][E: packages/core/src/location.ts:17][E: packages/core/src/location.ts:18] |
| `Location.Service` | tag 是 `@opencode/Location`，Interface 继承 `Info` 并附加 optional `vcs`。 | [E: packages/core/src/location.ts:22][E: packages/core/src/location.ts:23][E: packages/core/src/location.ts:30] |

### ProjectV2.resolve 控制流

1. `resolve(input)` 先调用 `git.find(input)`；没有 git repo 时返回 `id: ProjectV2.ID.global`、directory 为 filesystem root、`vcs: undefined`。[E: packages/core/src/project.ts:110][E: packages/core/src/project.ts:111][E: packages/core/src/project.ts:112]
2. repo 存在时，`previous = cached(repo.store)` 读取 `<repo.store>/opencode` cache file，trim 后转成 `ProjectV2.ID`。[E: packages/core/src/project.ts:65][E: packages/core/src/project.ts:66][E: packages/core/src/project.ts:68][E: packages/core/src/project.ts:114]
3. `remote(repo)` 读取 git remote，规范化 URL/scp-like remote，排除 `file:` protocol，把 `host/path` 变成 lowercased host 和去掉 `.git` 的 pathname。[E: packages/core/src/project.ts:73][E: packages/core/src/project.ts:74][E: packages/core/src/project.ts:76][E: packages/core/src/project.ts:87][E: packages/core/src/project.ts:91][E: packages/core/src/project.ts:97][E: packages/core/src/project.ts:99][E: packages/core/src/project.ts:102]
4. remote ID 是 `Hash.fast("git-remote:<normalized>")`，因此同一 remote URL 在不同 clones 中会得到同一 project ID。[E: packages/core/src/project.ts:78]
5. 如果 remote ID 不可得，则使用 previous cache ID；再不可得则使用 `root(repo)` 返回的第一条 root commit hash；再不可得才落到 `global`。[E: packages/core/src/project.ts:105][E: packages/core/src/project.ts:106][E: packages/core/src/project.ts:107][E: packages/core/src/project.ts:115][E: packages/core/src/project.ts:118]
6. resolve 返回 `directory: repo.directory` 和 `vcs: { type: "git", store: repo.store }`。[E: packages/core/src/project.ts:119][E: packages/core/src/project.ts:120]
7. legacy service 调用 `commit({ store, id })` 后，core 写 `<store>/opencode` cache file。[E: packages/core/src/project.ts:124][E: packages/core/src/project.ts:125]

### Location 控制流

1. `Location.layer(ref)` 依赖 `Project.Service`，调用 `project.resolve(ref.directory)`。[E: packages/core/src/location.ts:32][E: packages/core/src/location.ts:36][E: packages/core/src/location.ts:37]
2. layer 返回的 service 保留 opened `directory` 和 input `workspaceID`，并把 resolved project ID/directory 放入 `project` 字段。[E: packages/core/src/location.ts:38][E: packages/core/src/location.ts:39][E: packages/core/src/location.ts:40][E: packages/core/src/location.ts:41]
3. resolved VCS 透传到 `vcs`，供 Location-scoped services 判断 git-aware behavior。[E: packages/core/src/location.ts:42]

### Location-scoped services

`LocationServiceMap` 的 lookup 使用 `Location.Ref` 创建 Location service graph；base layer merge 了 Location、Policy、Config、Reference、Plugin、Catalog、Integration、Command、Agent、PluginBoot、ProjectCopy、FileSystem、Watcher、Pty、Skill、System Context、LocationMutation 等服务，最终用 `Layer.fresh` 返回 fresh layer。[E: packages/core/src/location-layer.ts:51][E: packages/core/src/location-layer.ts:56][E: packages/core/src/location-layer.ts:58][E: packages/core/src/location-layer.ts:59][E: packages/core/src/location-layer.ts:60][E: packages/core/src/location-layer.ts:61][E: packages/core/src/location-layer.ts:62][E: packages/core/src/location-layer.ts:63][E: packages/core/src/location-layer.ts:64][E: packages/core/src/location-layer.ts:65][E: packages/core/src/location-layer.ts:66][E: packages/core/src/location-layer.ts:67][E: packages/core/src/location-layer.ts:68][E: packages/core/src/location-layer.ts:69][E: packages/core/src/location-layer.ts:70][E: packages/core/src/location-layer.ts:71][E: packages/core/src/location-layer.ts:72][E: packages/core/src/location-layer.ts:73][E: packages/core/src/location-layer.ts:74][E: packages/core/src/location-layer.ts:75][E: packages/core/src/location-layer.ts:123] map 的 dependencies 是 process/global services，包括 Project、EventV2、Credential、Npm、ModelsDev、FSUtil、Git、Global、Ripgrep、Database、ProjectDirectories、SessionStore、PermissionSaved、RepositoryCache、LLMClient 等。[E: packages/core/src/location-layer.ts:126][E: packages/core/src/location-layer.ts:127][E: packages/core/src/location-layer.ts:128][E: packages/core/src/location-layer.ts:129][E: packages/core/src/location-layer.ts:130][E: packages/core/src/location-layer.ts:131][E: packages/core/src/location-layer.ts:132][E: packages/core/src/location-layer.ts:135][E: packages/core/src/location-layer.ts:136][E: packages/core/src/location-layer.ts:137][E: packages/core/src/location-layer.ts:138][E: packages/core/src/location-layer.ts:139][E: packages/core/src/location-layer.ts:140][E: packages/core/src/location-layer.ts:141][E: packages/core/src/location-layer.ts:142]

## V1

### InstanceContext 和权限边界

`InstanceContext` 是 legacy per-instance scope，包含 `directory`、`worktree`、`project`。[E: packages/opencode/src/project/instance-context.ts:5][E: packages/opencode/src/project/instance-context.ts:6][E: packages/opencode/src/project/instance-context.ts:7][E: packages/opencode/src/project/instance-context.ts:8] `containsPath(filepath, ctx)` 先检查 filepath 是否在 opened directory 内；然后检查是否在 git worktree 内。[E: packages/opencode/src/project/instance-context.ts:18][E: packages/opencode/src/project/instance-context.ts:19][E: packages/opencode/src/project/instance-context.ts:23] 非 git projects 会把 worktree 设为 `/`，该 helper 遇到 `/` worktree 时直接返回 false，避免把任意 absolute path 都视为内部路径。[E: packages/opencode/src/project/project.ts:246][E: packages/opencode/src/project/instance-context.ts:22][I]

### Legacy Project service

V1 `Project.Service` tag 是 `@opencode/Project`，接口包括 `init/fromDirectory/discover/list/get/update/initGit/setInitialized/sandboxes/addSandbox/removeSandbox`。[E: packages/opencode/src/project/project.ts:111][E: packages/opencode/src/project/project.ts:117][E: packages/opencode/src/project/project.ts:118][E: packages/opencode/src/project/project.ts:119][E: packages/opencode/src/project/project.ts:120][E: packages/opencode/src/project/project.ts:121][E: packages/opencode/src/project/project.ts:122][E: packages/opencode/src/project/project.ts:123][E: packages/opencode/src/project/project.ts:124][E: packages/opencode/src/project/project.ts:125][E: packages/opencode/src/project/project.ts:126][E: packages/opencode/src/project/project.ts:127][E: packages/opencode/src/project/project.ts:130]

`Project.fromDirectory(directory)` 调用 core `projectV2.resolve(AbsolutePath.make(directory))`，再把 global non-vcs case 的 worktree 设为 `/`，git/project case 的 worktree 设为 resolved directory。[E: packages/opencode/src/project/project.ts:242][E: packages/opencode/src/project/project.ts:245][E: packages/opencode/src/project/project.ts:246] 它调用 `migrateProjectId(previous, projectID)`，再从 `ProjectTable` 读取 existing row 或创建新的 `Info` object。[E: packages/opencode/src/project/project.ts:250][E: packages/opencode/src/project/project.ts:251][E: packages/opencode/src/project/project.ts:253][E: packages/opencode/src/project/project.ts:254] 最终通过 `insert(ProjectTable).values(...).onConflictDoUpdate(...)` upsert project row。[E: packages/opencode/src/project/project.ts:286][E: packages/opencode/src/project/project.ts:287][E: packages/opencode/src/project/project.ts:302][E: packages/opencode/src/project/project.ts:317]

如果 resolved project 不是 global，legacy service 会把此前按 global project + directory 记录的 sessions 改写成 resolved project ID。[E: packages/opencode/src/project/project.ts:320][E: packages/opencode/src/project/project.ts:322][E: packages/opencode/src/project/project.ts:324] 它还调用 `saveProjectDirectory`，该 helper 向 `ProjectDirectoryTable` insert opened directory；git project 会调用 `projectV2.commit({ store, id })` 写 repo-local cache。[E: packages/opencode/src/project/project.ts:224][E: packages/opencode/src/project/project.ts:226][E: packages/opencode/src/project/project.ts:230][E: packages/opencode/src/project/project.ts:231][E: packages/opencode/src/project/project.ts:237][E: packages/opencode/src/project/project.ts:329][E: packages/opencode/src/project/project.ts:336]

### InstanceStore 控制流

1. `InstanceStore.Service` tag 是 `@opencode/InstanceStore`，接口暴露 `load/reload/dispose/disposeDirectory/disposeAll/provide`。[E: packages/opencode/src/project/instance-store.ts:21][E: packages/opencode/src/project/instance-store.ts:22][E: packages/opencode/src/project/instance-store.ts:23][E: packages/opencode/src/project/instance-store.ts:24][E: packages/opencode/src/project/instance-store.ts:25][E: packages/opencode/src/project/instance-store.ts:26][E: packages/opencode/src/project/instance-store.ts:29]
2. layer 依赖 legacy `Project.Service` 和 `InstanceBootstrap.Service`，内部 cache 是 `Map<string, Entry>`，Entry 持有一个 `Deferred<InstanceContext>`。[E: packages/opencode/src/project/instance-store.ts:33][E: packages/opencode/src/project/instance-store.ts:34][E: packages/opencode/src/project/instance-store.ts:37][E: packages/opencode/src/project/instance-store.ts:40][E: packages/opencode/src/project/instance-store.ts:41][E: packages/opencode/src/project/instance-store.ts:43]
3. `load(input)` 先用 `FSUtil.resolve(input.directory)` canonicalize directory；同一 directory 已有 cache entry 时等待 existing deferred。[E: packages/opencode/src/project/instance-store.ts:108][E: packages/opencode/src/project/instance-store.ts:109][E: packages/opencode/src/project/instance-store.ts:112][E: packages/opencode/src/project/instance-store.ts:113]
4. cache miss 时创建 entry、放入 Map、fork `completeLoad(directory, input, entry)` 到 InstanceStore scope，然后等待 deferred 完成。[E: packages/opencode/src/project/instance-store.ts:115][E: packages/opencode/src/project/instance-store.ts:116][E: packages/opencode/src/project/instance-store.ts:119][E: packages/opencode/src/project/instance-store.ts:120][E: packages/opencode/src/project/instance-store.ts:121]
5. `boot(input)` 如果 caller 已提供 `project` 和 `worktree`，直接构造 `InstanceContext`；否则调用 legacy `project.fromDirectory(input.directory)`，把返回的 `sandbox` 作为 `worktree`。[E: packages/opencode/src/project/instance-store.ts:45][E: packages/opencode/src/project/instance-store.ts:47][E: packages/opencode/src/project/instance-store.ts:48][E: packages/opencode/src/project/instance-store.ts:54][E: packages/opencode/src/project/instance-store.ts:57]
6. boot 完成前会在 `InstanceRef` service 中提供 ctx 并运行 `bootstrap.run`。[E: packages/opencode/src/project/instance-store.ts:61]
7. `reload(input)` 为同一 resolved directory 替换 cache entry；如果有 previous entry，等待它完成、运行 disposers、发 disposed event，再 boot 新 entry。[E: packages/opencode/src/project/instance-store.ts:126][E: packages/opencode/src/project/instance-store.ts:130][E: packages/opencode/src/project/instance-store.ts:132][E: packages/opencode/src/project/instance-store.ts:136][E: packages/opencode/src/project/instance-store.ts:137][E: packages/opencode/src/project/instance-store.ts:138][E: packages/opencode/src/project/instance-store.ts:140]
8. `disposeContext(ctx)` 调用 instance registry disposers，然后向 `GlobalBus` 发 `server.instance.disposed`。[E: packages/opencode/src/project/instance-store.ts:94][E: packages/opencode/src/project/instance-store.ts:96][E: packages/opencode/src/project/instance-store.ts:97][E: packages/opencode/src/project/instance-store.ts:81][E: packages/opencode/src/project/instance-store.ts:86]
9. `provide(input, effect)` 先 load instance，再把 `InstanceRef` 注入 effect。[E: packages/opencode/src/project/instance-store.ts:189][E: packages/opencode/src/project/instance-store.ts:190]

### Bootstrap bundle

`InstanceBootstrap.Service` 只有一个 `run: Effect<void>` method。[E: packages/opencode/src/project/bootstrap-service.ts:3][E: packages/opencode/src/project/bootstrap-service.ts:4][E: packages/opencode/src/project/bootstrap-service.ts:7] 具体 `bootstrap.ts` 在 layer init 时抓取 Config、Format、LSP、Plugin、Project、ShareNext、Snapshot、Vcs services，使 `run` 本身不需要额外 R。[E: packages/opencode/src/project/bootstrap.ts:23][E: packages/opencode/src/project/bootstrap.ts:24][E: packages/opencode/src/project/bootstrap.ts:25][E: packages/opencode/src/project/bootstrap.ts:26][E: packages/opencode/src/project/bootstrap.ts:27][E: packages/opencode/src/project/bootstrap.ts:28][E: packages/opencode/src/project/bootstrap.ts:29][E: packages/opencode/src/project/bootstrap.ts:30] `run` 先 eager `config.get()`，再 `plugin.init()`，然后并发 init `lsp/shareNext/format/vcs/snapshot/project`。[E: packages/opencode/src/project/bootstrap.ts:36][E: packages/opencode/src/project/bootstrap.ts:38][E: packages/opencode/src/project/bootstrap.ts:41][E: packages/opencode/src/project/bootstrap.ts:42][E: packages/opencode/src/project/bootstrap.ts:44]

## V1 / V2 对照

| 维度 | V1 | V2 |
| --- | --- | --- |
| Project identity owner | Legacy `Project.fromDirectory` owns SQL upsert, sandbox list cleanup, optional icon discovery, and GlobalBus `project.updated` emission。[E: packages/opencode/src/project/project.ts:262][E: packages/opencode/src/project/project.ts:276][E: packages/opencode/src/project/project.ts:284][E: packages/opencode/src/project/project.ts:286][E: packages/opencode/src/project/project.ts:334][E: packages/opencode/src/project/project.ts:341][E: packages/opencode/src/project/project.ts:346][E: packages/opencode/src/project/project.ts:360] | `ProjectV2.resolve` owns stable ID resolution and cache commit bridge。[E: packages/core/src/project.ts:110][E: packages/core/src/project.ts:124] |
| Runtime scope | `InstanceContext` is per cwd and includes `directory/worktree/project`。[E: packages/opencode/src/project/instance-context.ts:5] | `Location.Info` is core location scope and includes `directory/workspaceID/project` plus optional `vcs` on service interface。[E: packages/core/src/location.ts:13][E: packages/core/src/location.ts:22][E: packages/core/src/location.ts:23] |
| Service cache | `InstanceStore` caches by resolved directory, entry is Deferred boot result。[E: packages/opencode/src/project/instance-store.ts:109][E: packages/opencode/src/project/instance-store.ts:115] | `LocationServiceMap` caches Location layer lookup by `Location.Ref` with 60 minute idle TTL。[E: packages/core/src/location-layer.ts:51][E: packages/core/src/location-layer.ts:125] |
| External path boundary | `containsPath` checks opened directory or git worktree, excluding `/` worktree fallback。[E: packages/opencode/src/project/instance-context.ts:19][E: packages/opencode/src/project/instance-context.ts:22] | V2 `Location` carries `directory` and project info; `FileSystem` resolves paths against `Location.directory` and dies when resolved paths escape it。[E: packages/core/src/location.ts:39][E: packages/core/src/filesystem.ts:78][E: packages/core/src/filesystem.ts:79][E: packages/core/src/filesystem.ts:80] |

## 设计动机与权衡

- `specs/project.md` states the goal: one OpenCode instance should run sessions for multiple projects and different worktrees per project。[E: specs/project.md:3] V1 `InstanceStore` per-directory cache and V2 `LocationServiceMap` per-location cache are two implementations serving that multi-project shape。[I]
- Remote-based project ID gives stable identity across clones of the same non-file remote; root-commit fallback gives a deterministic local identity when no usable remote is available。[E: packages/core/src/project.ts:78][E: packages/core/src/project.ts:105][E: packages/core/src/project.ts:115]
- The `ProjectV2.commit` bridge comment says core resolves ID while old service still owns database migration/persistence; source code confirms legacy `Project.fromDirectory` calls commit only after SQL upsert path。[E: packages/core/src/project.ts:49][E: packages/opencode/src/project/project.ts:286][E: packages/opencode/src/project/project.ts:336]
- Root `AGENTS.md` V2 guidance says `SessionRunner`, model resolution, tool registry, permissions, and filesystem should be Location-scoped; `LocationServiceMap` dependency graph implements that direction by wiring permissions/tools, model, runner, and filesystem-related layers under each Location lookup。[E: AGENTS.md:153][E: packages/core/src/location-layer.ts:70][E: packages/core/src/location-layer.ts:78][E: packages/core/src/location-layer.ts:79][E: packages/core/src/location-layer.ts:98][E: packages/core/src/location-layer.ts:99][I]

## Gotchas

- `ProjectV2.ID.global` is a real branded ID value `"global"`，不是 absence of project。[E: packages/core/src/project.ts:18]
- Non-git V1 instance sets worktree to `/` in `Project.fromDirectory`; `containsPath` special-cases `/` by returning false, which preserves the intended external-directory boundary by inference from the helper name and return path。[E: packages/opencode/src/project/project.ts:246][E: packages/opencode/src/project/instance-context.ts:22][I]
- V1 `InstanceLayer` itself lazy-imports the concrete bootstrap implementation, then provides `InstanceBootstrap.defaultLayer` into `InstanceStore.defaultLayer`; the import-shape rationale is inferred from that wrapper structure。[E: packages/opencode/src/project/instance-layer.ts:4][E: packages/opencode/src/project/instance-layer.ts:6][E: packages/opencode/src/project/instance-layer.ts:7][I]

## Sources

- `packages/core/src/project.ts`
- `packages/core/src/project/sql.ts`
- `packages/core/src/location.ts`
- `packages/core/src/location-layer.ts`
- `packages/core/src/filesystem.ts`
- `packages/opencode/src/project/project.ts`
- `packages/opencode/src/project/instance-context.ts`
- `packages/opencode/src/project/instance-store.ts`
- `packages/opencode/src/project/bootstrap-service.ts`
- `packages/opencode/src/project/bootstrap.ts`
- `packages/opencode/src/project/instance-layer.ts`
- `specs/project.md`
- `AGENTS.md`

## 相关

- [进程启动与运行时装配](../../spine/boot.md)
- [Location-scoped runner 装配](../session-v2/location-wiring.md)
- [Worktree 管理](../execution/worktree.md)
