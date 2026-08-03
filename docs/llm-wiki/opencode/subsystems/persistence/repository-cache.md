---
id: persistence.repository-cache
title: Remote Repository Reference Cache
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/repository.ts
  - packages/core/src/repository-cache.ts
  - packages/core/src/reference.ts
  - packages/schema/src/reference.ts
  - packages/core/test/repository.test.ts
  - packages/core/test/repository-cache.test.ts
  - packages/core/test/reference.test.ts
symbols:
  - Repository.cachePath
  - RepositoryCache.Service
  - RepositoryCache.ensure
  - Reference.Service
related:
  - persistence.project-instance-location
  - prompt.system-prompts
  - ref.env-vars
evidence: explicit
status: verified
updated: 89130db6b0
---

> V2 repository cache 把 remote Git reference materialize 到全局 checkout。cache identity 由 remote 与可选 branch 共同决定；同一 checkout 在 refresh 时按 “newest wins” fetch、checkout remote branch 并 hard reset。

## 能回答的问题

- 为什么同一 remote 的不同 branch 不再共用一个目录。
- cache entry 怎样判定可复用、怎样串行化并发操作。
- clone、cached 与 refreshed 三种结果有什么差异。
- Reference service 何时发布 path，clone 失败怎样表现。

## Cache identity

`Repository.cachePath(root, reference, branch?)` 先按 host 与 repository segments 组成 base path；branch 存在时追加 `@${encodeURIComponent(branch)}`。因此 slash 等合法 branch 字符不会直接变成目录层级，branchless 与 branch-specific references 也不会互相移动 checkout。[E: packages/core/src/repository.ts:126][E: packages/core/src/repository.ts:127][E: packages/core/src/repository.ts:128]

remote parser 仍负责 normalized identity；`Repository.same()` 比较的是 host/path cache identity，不比较 branch，因为 branch 已经由 cache path 隔离。[E: packages/core/src/repository.ts:131][E: packages/core/src/repository.ts:135][E: packages/core/src/repository.ts:136]

## Ensure 控制流

1. `ensure()` 先校验可选 branch，再计算 branch-keyed `localPath` 与 clone target。[E: packages/core/src/repository-cache.ts:141][E: packages/core/src/repository-cache.ts:142][E: packages/core/src/repository-cache.ts:145][E: packages/core/src/repository-cache.ts:146]
2. 所有操作用 `repository-cache:${localPath}` 文件锁串行化，因此不同 branch 有不同 lock key。[E: packages/core/src/repository-cache.ts:148][E: packages/core/src/repository-cache.ts:150][E: packages/core/src/repository-cache.ts:231]
3. reuse 同时要求 Git discovery 的 worktree 精确等于 cache path，且 origin 与 clone target 相同；这是为了避免 discovery 向上找到一个同 origin 的 enclosing repo。存在但不满足 reuse 的路径会被递归删除后重建。[E: packages/core/src/repository-cache.ts:153][E: packages/core/src/repository-cache.ts:159][E: packages/core/src/repository-cache.ts:160][E: packages/core/src/repository-cache.ts:164][E: packages/core/src/repository-cache.ts:166][E: packages/core/src/repository-cache.ts:167]
4. 不可复用是 `cloned`，可复用且 `refresh:true` 是 `refreshed`，否则是 `cached`。[E: packages/core/src/repository-cache.ts:170][E: packages/core/src/repository-cache.ts:172][E: packages/core/src/repository-cache.ts:174]
5. clone 会把可选 branch 直接传给 Git clone。[E: packages/core/src/repository-cache.ts:176][E: packages/core/src/repository-cache.ts:178][E: packages/core/src/repository-cache.ts:181]
6. refresh 先 fetch remotes；指定 branch 时再 fetch branch。随后 checkout 指定 branch 或 remote default branch，最后 hard reset 到 `origin/<branch>`；没有可解析 branch 时 reset `HEAD`。[E: packages/core/src/repository-cache.ts:186][E: packages/core/src/repository-cache.ts:189][E: packages/core/src/repository-cache.ts:193][E: packages/core/src/repository-cache.ts:195][E: packages/core/src/repository-cache.ts:202][E: packages/core/src/repository-cache.ts:205][E: packages/core/src/repository-cache.ts:213][E: packages/core/src/repository-cache.ts:215]
7. result 报告 repository/remote/localPath/status，并从最终 checkout 读取 optional head 与 branch。[E: packages/core/src/repository-cache.ts:219][E: packages/core/src/repository-cache.ts:221][E: packages/core/src/repository-cache.ts:226][E: packages/core/src/repository-cache.ts:227][E: packages/core/src/repository-cache.ts:228]

普通 `cached` ensure 不 fetch、checkout 或 reset；只有 clone 与显式 refresh 路径改变 checkout。因此不能把 cache 描述成每次读取都自动自愈。[E: packages/core/src/repository-cache.ts:170][E: packages/core/src/repository-cache.ts:176][E: packages/core/src/repository-cache.ts:186]

refresh 实现会 fetch、checkout 并 hard reset，采用可移动的 newest-wins checkout；文件锁保护 cache operation，不为下游 reader 提供 immutable snapshot。[E: packages/core/src/repository-cache.ts:148][E: packages/core/src/repository-cache.ts:186][E: packages/core/src/repository-cache.ts:202][E: packages/core/src/repository-cache.ts:215]

`reset --hard` 只重置 tracked state，不会清掉 untracked files，因此 refresh 不能称为 pristine snapshot。[I] branchless refresh 依赖本地 `refs/remotes/origin/HEAD`；上游默认分支变化或该 symbolic ref 缺失时的长期行为没有测试覆盖。[U]

## Reference 集成与 readiness 边界

Reference finalize 对 Git source 先 parse remote 与校验 branch，然后立刻把 branch-keyed path 放进 `materialized` map。`cache.ensure({ refresh:true })` 被 fork 到 scope；失败只记录 warning，之后仍发布 `Reference.Updated`。[E: packages/core/src/reference.ts:75][E: packages/core/src/reference.ts:77][E: packages/core/src/reference.ts:84][E: packages/core/src/reference.ts:88][E: packages/core/src/reference.ts:94][E: packages/core/src/reference.ts:95][E: packages/core/src/reference.ts:102][E: packages/core/src/reference.ts:105]

所以 `Reference.list()` 的 path availability 不代表 clone/refresh 已完成，也不代表 checkout 可读；这是一个异步 materialization contract，而不是 readiness barrier。[E: packages/core/src/reference.ts:109][E: packages/core/src/reference.ts:112][E: packages/core/src/reference.ts:113][I]

路径隔离已有单元测试覆盖 slash encoding、同 remote 不同 branch、并发 ensure 与 enclosing repository；但 cache key 是 `base + "@" + encodedBranch` 的字符串拼接，含 `@` 的 repository segment 理论上可和另一个 branchless path 碰撞。[E: packages/core/test/repository.test.ts:7][E: packages/core/test/repository.test.ts:26][E: packages/core/test/repository-cache.test.ts:36][E: packages/core/test/repository-cache.test.ts:69][E: packages/core/test/repository-cache.test.ts:91][I] 大小写不敏感文件系统上的 branch-name case collision 尚未覆盖。[U]

## 错误与依赖

cache 把 invalid repository/branch、clone/fetch/checkout/reset、lock 与 filesystem operation 区分为 tagged errors；`isError()` 用这些 class 识别 domain error。[E: packages/core/src/repository-cache.ts:34][E: packages/core/src/repository-cache.ts:42][E: packages/core/src/repository-cache.ts:50][E: packages/core/src/repository-cache.ts:55][E: packages/core/src/repository-cache.ts:60][E: packages/core/src/repository-cache.ts:69][E: packages/core/src/repository-cache.ts:74][E: packages/core/src/repository-cache.ts:79][E: packages/core/src/repository-cache.ts:104]

global node 依赖 flock、filesystem、Git 与 Global path；Reference location node 再依赖该 cache node。[E: packages/core/src/repository-cache.ts:243][E: packages/core/src/repository-cache.ts:246][E: packages/core/src/reference.ts:121][E: packages/core/src/reference.ts:124]

## Sources

- packages/core/src/repository.ts
- packages/core/src/repository-cache.ts
- packages/core/src/reference.ts
- packages/schema/src/reference.ts
- packages/core/test/repository.test.ts
- packages/core/test/repository-cache.test.ts
- packages/core/test/reference.test.ts

## 相关

- [Project/Instance/Location](project-instance-location.md)
- [System Prompts](../../surface/prompts/system-prompts.md)
- [Env vars](../../reference/env-vars.md)
