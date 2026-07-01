---
id: subsys.agent-core.session-storage
title: 会话存储接口(SessionStorage/SessionRepo)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/types.ts
  - packages/agent/src/harness/session/repo-utils.ts
symbols:
  - SessionStorage
  - SessionRepo
related:
  - subsys.agent-core.jsonl-storage
  - subsys.agent-core.memory-storage
  - subsys.agent-core.session-tree
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.session-storage` 是 `pi-agent-core` 的会话持久化抽象层: `SessionStorage` 定义单个会话树如何读写,`SessionRepo` 定义会话集合如何 create/open/list/delete/fork。

## 能回答的问题

- `SessionStorage` 的最小接口包含哪些会话树读写能力?
- `SessionRepo` 和 `SessionStorage` 的职责边界在哪里?
- `repo-utils.ts` 如何把通用 repo 操作和存储后端解耦?
- fork 会话时 `entryId` 与 `position` 如何决定复制哪些 entry?
- JSONL 与 memory implementation 应该在哪里解释,哪些内容不属于本节点?

## 职责边界

`SessionStorage<TMetadata>` 是单个 session 的后端无关接口:它暴露 metadata、当前 leaf、entry id 生成、entry append、entry lookup、按 type 查找、label lookup、path-to-root 和完整 entries 读取 [E: packages/agent/src/harness/types.ts:440] [E: packages/agent/src/harness/types.ts:441] [E: packages/agent/src/harness/types.ts:442] [E: packages/agent/src/harness/types.ts:445] [E: packages/agent/src/harness/types.ts:446] [E: packages/agent/src/harness/types.ts:447] [E: packages/agent/src/harness/types.ts:448] [E: packages/agent/src/harness/types.ts:451] [E: packages/agent/src/harness/types.ts:452] [E: packages/agent/src/harness/types.ts:453]。

`SessionRepo<TMetadata, TCreateOptions, TListOptions>` 是 session 集合接口:它负责创建、打开、列出、删除和 fork session,每个方法以 `Session<TMetadata>` 或 metadata 为边界,不直接暴露底层文件或内存容器 [E: packages/agent/src/harness/types.ts:468] [E: packages/agent/src/harness/types.ts:473] [E: packages/agent/src/harness/types.ts:474] [E: packages/agent/src/harness/types.ts:475] [E: packages/agent/src/harness/types.ts:476] [E: packages/agent/src/harness/types.ts:477]。

`SessionMetadata` 只要求 `id` 与 `createdAt`;JSONL repo 在这个基础上扩展 `cwd`、`path` 和可选 `parentSessionPath`,所以通用 repo contract 不要求所有 backend 都有文件路径或工作目录 [E: packages/agent/src/harness/types.ts:429] [E: packages/agent/src/harness/types.ts:430] [E: packages/agent/src/harness/types.ts:431] [E: packages/agent/src/harness/types.ts:434] [E: packages/agent/src/harness/types.ts:435] [E: packages/agent/src/harness/types.ts:436] [E: packages/agent/src/harness/types.ts:437]。

## 关键文件

- `packages/agent/src/harness/types.ts`: 定义 `SessionErrorCode` / `SessionError`、`SessionMetadata` / `JsonlSessionMetadata`、`SessionStorage`、`SessionRepo`、`SessionCreateOptions`、`SessionForkOptions`、JSONL-specific create/list/repo API 类型 [E: packages/agent/src/harness/types.ts:187] [E: packages/agent/src/harness/types.ts:196] [E: packages/agent/src/harness/types.ts:429] [E: packages/agent/src/harness/types.ts:434] [E: packages/agent/src/harness/types.ts:440] [E: packages/agent/src/harness/types.ts:468] [E: packages/agent/src/harness/types.ts:458] [E: packages/agent/src/harness/types.ts:462] [E: packages/agent/src/harness/types.ts:480] [E: packages/agent/src/harness/types.ts:485] [E: packages/agent/src/harness/types.ts:489]。
- `packages/agent/src/harness/session/repo-utils.ts`: 定义 repo helper: `createSessionId()`、`createTimestamp()`、`toSession()`、filesystem-result 到 `SessionError` 的转换、以及 `getEntriesToFork()` [E: packages/agent/src/harness/session/repo-utils.ts:12] [E: packages/agent/src/harness/session/repo-utils.ts:16] [E: packages/agent/src/harness/session/repo-utils.ts:20] [E: packages/agent/src/harness/session/repo-utils.ts:24] [E: packages/agent/src/harness/session/repo-utils.ts:32]。

## 数据模型

`SessionErrorCode` 为 session 子系统列出稳定错误码:`not_found`、`invalid_session`、`invalid_entry`、`invalid_fork_target`、`storage` 和 `unknown`;`SessionError` 是 `Error` 子类,构造器接收其中一个 code 并写入 public `code` 字段 [E: packages/agent/src/harness/types.ts:187] [E: packages/agent/src/harness/types.ts:188] [E: packages/agent/src/harness/types.ts:189] [E: packages/agent/src/harness/types.ts:190] [E: packages/agent/src/harness/types.ts:191] [E: packages/agent/src/harness/types.ts:192] [E: packages/agent/src/harness/types.ts:193] [E: packages/agent/src/harness/types.ts:196] [E: packages/agent/src/harness/types.ts:198] [E: packages/agent/src/harness/types.ts:200] [E: packages/agent/src/harness/types.ts:203]。

`SessionStorage` 同时暴露 `getLeafId()` 和 `setLeafId(leafId)`,所以 leaf position 是 storage 层可读写状态,不是 repo 层状态 [E: packages/agent/src/harness/types.ts:442] [E: packages/agent/src/harness/types.ts:444] [I]。

`SessionForkOptions` 只定义 `entryId`、`position?: "before" | "at"` 和可选新 session `id`;repo 的 `fork()` 把这些 fork 选项与 backend-specific create options 组合后返回新的 `Session<TMetadata>` [E: packages/agent/src/harness/types.ts:462] [E: packages/agent/src/harness/types.ts:463] [E: packages/agent/src/harness/types.ts:464] [E: packages/agent/src/harness/types.ts:465] [E: packages/agent/src/harness/types.ts:477]。

`JsonlSessionCreateOptions` 在通用 `SessionCreateOptions` 上要求 `cwd` 并允许 `parentSessionPath`;`JsonlSessionListOptions` 允许按 `cwd` 过滤;`JsonlSessionRepoApi` 是 `SessionRepo<JsonlSessionMetadata, JsonlSessionCreateOptions, JsonlSessionListOptions>` 的命名 specialization [E: packages/agent/src/harness/types.ts:480] [E: packages/agent/src/harness/types.ts:481] [E: packages/agent/src/harness/types.ts:482] [E: packages/agent/src/harness/types.ts:485] [E: packages/agent/src/harness/types.ts:486] [E: packages/agent/src/harness/types.ts:489] [E: packages/agent/src/harness/types.ts:490]。

## Repo Utils 控制流

1. `createSessionId@packages/agent/src/harness/session/repo-utils.ts:12` 直接返回 `uuidv7()`,是 repo 层创建 session id 的通用 helper [E: packages/agent/src/harness/session/repo-utils.ts:12] [E: packages/agent/src/harness/session/repo-utils.ts:13]。
2. `createTimestamp@packages/agent/src/harness/session/repo-utils.ts:16` 返回 `new Date().toISOString()`,是 repo-utils 暴露的 ISO timestamp helper [E: packages/agent/src/harness/session/repo-utils.ts:16] [E: packages/agent/src/harness/session/repo-utils.ts:17]。
3. `toSession@packages/agent/src/harness/session/repo-utils.ts:20` 接收任意 `SessionStorage<TMetadata>` 并返回 `new Session(storage)`,这把 backend-specific storage 包装成统一 `Session<TMetadata>` API [E: packages/agent/src/harness/session/repo-utils.ts:20] [E: packages/agent/src/harness/session/repo-utils.ts:21]。
4. `getFileSystemResultOrThrow@packages/agent/src/harness/session/repo-utils.ts:24` 把 `FileSystem` 的 `Result<TValue, FileError>` 转成返回值或 `SessionError`;底层 file error code 为 `not_found` 时映射到 session `not_found`,其余 file failure 映射到 session `storage` [E: packages/agent/src/harness/session/repo-utils.ts:24] [E: packages/agent/src/harness/session/repo-utils.ts:25] [E: packages/agent/src/harness/session/repo-utils.ts:26] [E: packages/agent/src/harness/session/repo-utils.ts:27]。
5. `getEntriesToFork@packages/agent/src/harness/session/repo-utils.ts:32` 在没有 `entryId` 时返回 `storage.getEntries()`,也就是返回完整 session entry 列表 [E: packages/agent/src/harness/session/repo-utils.ts:32] [E: packages/agent/src/harness/session/repo-utils.ts:36]。
6. `getEntriesToFork()` 带 `entryId` 时先调用 `storage.getEntry(entryId)`;目标不存在会抛 `SessionError("invalid_fork_target", ...)` [E: packages/agent/src/harness/session/repo-utils.ts:37] [E: packages/agent/src/harness/session/repo-utils.ts:38] [E: packages/agent/src/harness/session/repo-utils.ts:39]。
7. fork `position: "at"` 时 effective leaf 是 target entry 自身;默认 `"before"` 时 target 必须是 user message,然后 effective leaf 改为 target 的 `parentId` [E: packages/agent/src/harness/session/repo-utils.ts:41] [E: packages/agent/src/harness/session/repo-utils.ts:42] [E: packages/agent/src/harness/session/repo-utils.ts:43] [E: packages/agent/src/harness/session/repo-utils.ts:45] [E: packages/agent/src/harness/session/repo-utils.ts:46] [E: packages/agent/src/harness/session/repo-utils.ts:48]。
8. `getEntriesToFork()` 最终只要求 storage 提供 `getPathToRoot(effectiveLeafId)`,因此 fork copy 的树导航规则在 `SessionStorage` contract 上表达,不需要 repo helper 知道 JSONL 或 memory 的内部数据结构 [E: packages/agent/src/harness/session/repo-utils.ts:50] [E: packages/agent/src/harness/types.ts:452] [I]。

## JSONL 与 Memory Implementation 边界

本节点权威覆盖接口和 repo utilities,不详写 JSONL 的 header/version/file layout、append 策略、目录扫描或 corrupt-file 容错;这些应由 [subsys.agent-core.jsonl-storage](jsonl-storage.md) 覆盖。当前类型层只证明 JSONL backend 有专用 metadata、create/list options 和 `JsonlSessionRepoApi` specialization [E: packages/agent/src/harness/types.ts:434] [E: packages/agent/src/harness/types.ts:480] [E: packages/agent/src/harness/types.ts:485] [E: packages/agent/src/harness/types.ts:489]。

本节点也不详写 memory backend 的 Map/array/cache 行为或生命周期;这些应由 [subsys.agent-core.memory-storage](memory-storage.md) 覆盖。接口层只要求任何 backend 实现 `SessionStorage` 或 `SessionRepo` 的方法集合,而不规定持久化介质、并发控制或进程生命周期 [E: packages/agent/src/harness/types.ts:440] [E: packages/agent/src/harness/types.ts:468] [I]。

## 设计动机与权衡

`SessionStorage` 和 `SessionRepo` 分离了“一个 session tree 怎么读写”和“一组 session 怎么管理”:前者面向 leaf/entry/path/label,后者面向 create/open/list/delete/fork [E: packages/agent/src/harness/types.ts:440] [E: packages/agent/src/harness/types.ts:446] [E: packages/agent/src/harness/types.ts:452] [E: packages/agent/src/harness/types.ts:468] [E: packages/agent/src/harness/types.ts:473] [E: packages/agent/src/harness/types.ts:477] [I]。

`repo-utils.ts` 把 id、timestamp、storage-to-session wrapping、filesystem error normalization 和 fork entry selection 放在 shared helper 中;JSONL repo 与 memory repo 可以复用这些不依赖具体存储介质的规则 [E: packages/agent/src/harness/session/repo-utils.ts:12] [E: packages/agent/src/harness/session/repo-utils.ts:16] [E: packages/agent/src/harness/session/repo-utils.ts:20] [E: packages/agent/src/harness/session/repo-utils.ts:24] [E: packages/agent/src/harness/session/repo-utils.ts:32] [I]。

Fork 的默认语义偏向“从某个 user message 之前分叉”:当 `position` 不是 `"at"` 时,目标必须是 user message,复制路径停在该 message 的 parent;这让 caller 可以从即将发送的 user turn 之前创建分支,而 `"at"` 则保留目标 entry 本身 [E: packages/agent/src/harness/session/repo-utils.ts:42] [E: packages/agent/src/harness/session/repo-utils.ts:45] [E: packages/agent/src/harness/session/repo-utils.ts:46] [E: packages/agent/src/harness/session/repo-utils.ts:48] [I]。

## Gotcha

- `SessionStorage.createEntryId()` 只承诺返回 `Promise<string>`;接口没有规定 UUID、短 id、去重尝试次数或排序语义,这些属于具体 storage 实现 [E: packages/agent/src/harness/types.ts:445] [I]。
- `getFileSystemResultOrThrow()` 只把 file `not_found` 保留为 session `not_found`;`not_found` 之外的 file failure 在该 helper 中统一变成 session `storage` [E: packages/agent/src/harness/session/repo-utils.ts:24] [E: packages/agent/src/harness/session/repo-utils.ts:26] [E: packages/agent/src/harness/session/repo-utils.ts:27]。
- `getEntriesToFork()` 对 missing target 和 non-user-message default fork 都使用 `invalid_fork_target`,而不是 `not_found`;这是 fork 操作自己的 validation error boundary [E: packages/agent/src/harness/session/repo-utils.ts:39] [E: packages/agent/src/harness/session/repo-utils.ts:46] [I]。
- `JsonlSessionRepoApi` 是一个 type-level specialization,不是 JSONL implementation 本身;JSONL 文件读写不在 `types.ts` 或 `repo-utils.ts` 中发生 [E: packages/agent/src/harness/types.ts:489] [E: packages/agent/src/harness/types.ts:490] [I]。

## 跨包边界

本节点的直接 source 位于 `packages/agent/src/harness/...`: `SessionStorage`/`SessionRepo` contract 在 `types.ts`,JSONL-specific API 仍是 agent package 内的 harness 类型;CLI session manager、TUI export 或 product settings 不在本节点 source 覆盖范围内,因此不在这里展开 [E: packages/agent/src/harness/types.ts:440] [E: packages/agent/src/harness/types.ts:468] [E: packages/agent/src/harness/types.ts:489] [I]。

[subsys.agent-core.session-tree](session-tree.md) 应解释 `SessionTreeEntry` 的 union shape、leaf entry 和 parent path 语义;本节点只说明 storage/repo 如何暴露这些 entry 的读写接口 [E: packages/agent/src/harness/types.ts:409] [E: packages/agent/src/harness/types.ts:420] [E: packages/agent/src/harness/types.ts:440]。

## Sources

- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/repo-utils.ts

## 相关

- [subsys.agent-core.jsonl-storage](jsonl-storage.md): JSONL session storage/repo 的文件格式、目录策略和异常处理边界。
- [subsys.agent-core.memory-storage](memory-storage.md): in-memory session storage/repo 的进程内生命周期和数据结构边界。
- [subsys.agent-core.session-tree](session-tree.md): `SessionTreeEntry`、leaf entry、parent path 和 tree navigation 的数据模型。
