---
id: ref.agent.error-codes
title: 错误代码目录(File/Exec/Session/Harness)
kind: catalog
tier: T3
pkg: agent
source:
  - packages/agent/src/harness/types.ts
  - packages/agent/src/harness/session/session.ts
  - packages/agent/src/harness/session/jsonl/codec.ts
  - packages/agent/src/harness/session/jsonl/storage.ts
  - packages/agent/src/harness/session/jsonl/repo.ts
  - packages/agent/src/harness/session/jsonl/io.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/result.ts
  - packages/agent/src/harness/runtime/types.ts
  - packages/agent/src/harness/runtime/reducer.ts
  - packages/agent/src/harness/runtime/harness.ts
  - packages/agent/test/harness/types.test.ts
symbols:
  - FileErrorCode
  - ExecutionErrorCode
  - CompactionErrorCode
  - BranchSummaryErrorCode
  - SessionInvariantError
  - SessionInvalidBranchError
  - SessionBranchExistsError
  - SessionPendingAssistantMessageError
  - SessionUnknownTargetError
  - TaggedError
  - SliceNotImplemented
  - TextLineReader
  - openTextLineReader
related:
  - subsys.agent-core.exec-env
  - subsys.agent-core.agent-harness-lifecycle
  - subsys.agent-core.jsonl-storage
evidence: explicit
status: verified
updated: 71dca871bc
---

> `ref.agent.error-codes` 是当前 harness 错误面的逐实例目录：`FileErrorCode` / `ExecutionErrorCode` / `CompactionErrorCode` / `BranchSummaryErrorCode`、session typed Error、JSONL 普通 `Error` 消息，以及 `TaggedError` `_tag` 与 `SliceNotImplemented`。`SessionErrorCode`、`JsonlDecodeError`、`RecordLogCorruptionReason`、`AgentHarnessErrorCode` 已删除。本轮没有新增 typed error code。

## 能回答的问题

- `FileErrorCode` 与 `ExecutionErrorCode` 现在有哪些字面量？
- `TextLineReader` / `openTextLineReader` 失败走哪套错误？
- JSONL 解析失败还用 `JsonlDecodeError.kind` 吗？
- `AgentHarnessErrorCode` / `SessionErrorCode` 还在吗，公开拒绝面改成了什么？
- session 层有哪些 typed Error class？
- `reduceLaneSnapshot` 还会因 record log 抛 `RecordLogCorruption` 吗？

## Error class 承载关系

| Error class | 稳定判别字段 | constructor | 语义边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `FileError` | `code: FileErrorCode`；optional `path` | `(code, message, path?, cause?)` | `FileSystem` 操作失败的 backend-independent 分类。[E: packages/agent/src/harness/types.ts:173] [E: packages/agent/src/harness/types.ts:175] | `packages/agent/src/harness/types.ts:173` |
| `ExecutionError` | `code: ExecutionErrorCode` | `(code, message, cause?)` | `ExecutionEnv.exec` / `Shell.exec` 失败分类。[E: packages/agent/src/harness/types.ts:197] [E: packages/agent/src/harness/types.ts:199] | `packages/agent/src/harness/types.ts:197` |
| `CompactionError` | `code: CompactionErrorCode` | `(code, message, cause?)` | compaction helper 失败。[E: packages/agent/src/harness/types.ts:212] [E: packages/agent/src/harness/types.ts:214] | `packages/agent/src/harness/types.ts:212` |
| `BranchSummaryError` | `code: BranchSummaryErrorCode` | `(code, message, cause?)` | branch summarization helper 失败。[E: packages/agent/src/harness/types.ts:227] [E: packages/agent/src/harness/types.ts:229] | `packages/agent/src/harness/types.ts:227` |
| `SessionInvariantError` | `name` | `(message)` | durable session 内部不一致，不能安全推进。[E: packages/agent/src/harness/session/session.ts:45] [E: packages/agent/src/harness/session/session.ts:48] | `packages/agent/src/harness/session/session.ts:45` |
| `SessionInvalidBranchError` | `branch`; `reason` | `(branch, reason)` | branch 名非法。[E: packages/agent/src/harness/session/session.ts:53] [E: packages/agent/src/harness/session/session.ts:58] | `packages/agent/src/harness/session/session.ts:53` |
| `SessionBranchExistsError` | `branch` | `(branch)` | `createBranch` 时 tip 已存在。[E: packages/agent/src/harness/session/session.ts:66] [E: packages/agent/src/harness/session/session.ts:70] | `packages/agent/src/harness/session/session.ts:66` |
| `SessionPendingAssistantMessageError` | `name` | `()` | 不能把 `stopReason === "pending"` 的 assistant 落盘。[E: packages/agent/src/harness/session/session.ts:77] [E: packages/agent/src/harness/session/session.ts:79] | `packages/agent/src/harness/session/session.ts:77` |
| `SessionUnknownTargetError` | `targetId` | `(targetId)` | `createBranch(at)` 的目标 entry 不存在。[E: packages/agent/src/harness/session/session.ts:85] [E: packages/agent/src/harness/session/session.ts:89] | `packages/agent/src/harness/session/session.ts:85` |
| `SliceNotImplemented` | `name`; message 含 operation | `(operation)` | 未实现的 harness slice；message 为 `` `${operation} is not implemented until its later AgentHarness slice` ``。[E: packages/agent/src/harness/runtime/types.ts:18] [E: packages/agent/src/harness/runtime/types.ts:20] | `packages/agent/src/harness/runtime/types.ts:18` |
| `HarnessClosed` | 无 code 字段 | `()` | harness 在操作进行中被 close。[E: packages/agent/src/harness/result.ts:100] [E: packages/agent/src/harness/result.ts:102] | `packages/agent/src/harness/result.ts:100` |
| `HarnessFault` | `cause: unknown` | `(message, cause)` | 包装未知故障。[E: packages/agent/src/harness/result.ts:90] [E: packages/agent/src/harness/result.ts:93] | `packages/agent/src/harness/result.ts:90` |

`SessionError` / `SessionErrorCode`、`JsonlDecodeError`、`RecordLogCorruption` / `RecordLogCorruptionReason`、`HarnessNotImplemented`、`AgentHarnessError` / `AgentHarnessErrorCode` 已从源码删除。公开预期拒绝改为 `TaggedError` 子类，经 `Result.ok === false` 返回；未实现 slice 与 closed 仍 throw。[E: packages/agent/src/harness/result.ts:28] [E: packages/agent/src/harness/agent-harness.ts:36] [E: packages/agent/src/harness/agent-harness.ts:84] [I]

## FileErrorCode 实例

`FileErrorCode` 是 8 元封闭 string union。[E: packages/agent/src/harness/types.ts:162] [E: packages/agent/src/harness/types.ts:170]

| code | 类型 | 含义 | 源 path |
| --- | --- | --- | --- |
| `aborted` | string literal | 文件操作被 abort 或等价取消中止。[E: packages/agent/src/harness/types.ts:163] [I] | `packages/agent/src/harness/types.ts:163` |
| `not_found` | string literal | 目标路径不存在。[E: packages/agent/src/harness/types.ts:164] [I] | `packages/agent/src/harness/types.ts:164` |
| `permission_denied` | string literal | backend 拒绝访问。[E: packages/agent/src/harness/types.ts:165] [I] | `packages/agent/src/harness/types.ts:165` |
| `not_directory` | string literal | 期望目录的位置不是目录。[E: packages/agent/src/harness/types.ts:166] [I] | `packages/agent/src/harness/types.ts:166` |
| `is_directory` | string literal | 期望文件的位置是目录。[E: packages/agent/src/harness/types.ts:167] [I] | `packages/agent/src/harness/types.ts:167` |
| `invalid` | string literal | 路径、类型或参数无效。[E: packages/agent/src/harness/types.ts:168] [I] | `packages/agent/src/harness/types.ts:168` |
| `not_supported` | string literal | 当前 filesystem backend 不支持该操作。[E: packages/agent/src/harness/types.ts:169] [I] | `packages/agent/src/harness/types.ts:169` |
| `unknown` | string literal | 未归入前述分类的 filesystem failure。[E: packages/agent/src/harness/types.ts:170] [I] | `packages/agent/src/harness/types.ts:170` |

`FileSystem` 的 path/IO 方法（含 `openTextLineReader`）返回 `Promise<Result<…, FileError>>`，不是 throw；`cleanup(context)` 例外，签名是 `Promise<void>`。`Shell.cleanup` 同样是 `Promise<void>`。[E: packages/agent/src/harness/types.ts:286] [E: packages/agent/src/harness/types.ts:280] [E: packages/agent/src/harness/types.ts:330] [E: packages/agent/src/harness/types.ts:403] path/IO 失败编码进 `Result`；`cleanup` 是 best-effort 且不得 throw/reject。[I]

`TextLineReader.readLine` 也返回 `Result<TextLine | undefined, FileError>`；`close` 必须 best-effort 且不得 throw/reject。没有单独的 line-reader error union。[E: packages/agent/src/harness/types.ts:261] [E: packages/agent/src/harness/types.ts:263]

## ExecutionErrorCode 实例

`ExecutionErrorCode` 是 6 元封闭 string union。[E: packages/agent/src/harness/types.ts:188] [E: packages/agent/src/harness/types.ts:194]

| code | 类型 | 含义 | 源 path |
| --- | --- | --- | --- |
| `aborted` | string literal | 命令被 abort 中止。[E: packages/agent/src/harness/types.ts:189] [I] | `packages/agent/src/harness/types.ts:189` |
| `timeout` | string literal | 超过允许时限。[E: packages/agent/src/harness/types.ts:190] [I] | `packages/agent/src/harness/types.ts:190` |
| `shell_unavailable` | string literal | 需要 shell 但不可用。[E: packages/agent/src/harness/types.ts:191] [I] | `packages/agent/src/harness/types.ts:191` |
| `spawn_error` | string literal | spawn 层失败。[E: packages/agent/src/harness/types.ts:192] [I] | `packages/agent/src/harness/types.ts:192` |
| `callback_error` | string literal | stdout/stderr 或 lifecycle callback 失败。[E: packages/agent/src/harness/types.ts:193] [I] | `packages/agent/src/harness/types.ts:193` |
| `unknown` | string literal | 未归入前述分类的 execution failure。[E: packages/agent/src/harness/types.ts:194] [I] | `packages/agent/src/harness/types.ts:194` |

## CompactionErrorCode / BranchSummaryErrorCode 实例

两组 helper code 都只有 `aborted` 与 `summarization_failed`。[E: packages/agent/src/harness/types.ts:209] [E: packages/agent/src/harness/types.ts:224]

| code | union | 含义 | 源 path |
| --- | --- | --- | --- |
| `aborted` | `CompactionErrorCode` | compaction helper 被取消。[E: packages/agent/src/harness/types.ts:209] [I] | `packages/agent/src/harness/types.ts:209` |
| `summarization_failed` | `CompactionErrorCode` | compaction summarization 失败。[E: packages/agent/src/harness/types.ts:209] [I] | `packages/agent/src/harness/types.ts:209` |
| `aborted` | `BranchSummaryErrorCode` | branch summary helper 被取消。[E: packages/agent/src/harness/types.ts:224] [I] | `packages/agent/src/harness/types.ts:224` |
| `summarization_failed` | `BranchSummaryErrorCode` | branch summary summarization 失败。[E: packages/agent/src/harness/types.ts:224] [I] | `packages/agent/src/harness/types.ts:224` |

## Session typed errors（取代 SessionErrorCode）

`session/types.ts` 不再导出 `SessionError` / `SessionErrorCode`。判别靠 `error.name` 与额外字段。

| class | 额外字段 | 典型触发 | 源 path |
| --- | --- | --- | --- |
| `SessionInvariantError` | 无 | 未知 branch tip、内部不一致。[E: packages/agent/src/harness/session/session.ts:418] | `packages/agent/src/harness/session/session.ts:45` |
| `SessionInvalidBranchError` | `branch`; `reason` | 空名或含 `\0`。[E: packages/agent/src/harness/session/session.ts:466] | `packages/agent/src/harness/session/session.ts:53` |
| `SessionBranchExistsError` | `branch` | `createBranch` 时 tip 已在。[E: packages/agent/src/harness/session/session.ts:360] | `packages/agent/src/harness/session/session.ts:66` |
| `SessionPendingAssistantMessageError` | 无 | commit / append 遇到 pending assistant。[E: packages/agent/src/harness/session/session.ts:118] | `packages/agent/src/harness/session/session.ts:77` |
| `SessionUnknownTargetError` | `targetId` | `createBranch(at)` 目标不存在。[E: packages/agent/src/harness/session/session.ts:363] | `packages/agent/src/harness/session/session.ts:85` |

repo / storage 生命周期失败（already open、unknown session、closed、duplicate id）是普通 `Error`，没有稳定 code union。[E: packages/agent/src/harness/session/memory.ts:380] [E: packages/agent/src/harness/session/jsonl/repo.ts:98] [I]

## JSONL 错误（JsonlDecodeError 已删除）

`parseJsonlSessionHeader()` 返回 `Result<JsonlParsedSessionHeader, Error>`：坏 JSON → `Invalid JSONL session header: not valid JSON`；既不是 v4 也不是 v3-legacy → `Unsupported JSONL session header`。[E: packages/agent/src/harness/session/jsonl/codec.ts:53] [E: packages/agent/src/harness/session/jsonl/codec.ts:58] [E: packages/agent/src/harness/session/jsonl/codec.ts:62]

`fileValue` / `parseJsonlTransaction` / `publishJsonl` 在 `jsonl/io.ts`。`JsonlStorage` / repo 把 filesystem `Result` 经 `fileValue` 提成 `Error(`${action}: ${message}`, { cause })`。[E: packages/agent/src/harness/session/jsonl/io.ts:15] [E: packages/agent/src/harness/session/jsonl/io.ts:66] [E: packages/agent/src/harness/session/jsonl/repo.ts:8]

不存在 `createFromForkSnapshot` / `captureForkSource`；fork 失败同样是普通 `Error`（例如已打开的 legacy v3、identity mismatch、unsupported storage version）。[E: packages/agent/src/harness/session/jsonl/repo.ts:306] [I]

| message / 模式 | 触发条件 | 源 path |
| --- | --- | --- |
| `Invalid JSONL session header: not valid JSON` | header 行 `JSON.parse` 失败。[E: packages/agent/src/harness/session/jsonl/codec.ts:58] | `packages/agent/src/harness/session/jsonl/codec.ts:58` |
| `Unsupported JSONL session header` | parse 成功但不是 v4 header 也不是 v3 session header。[E: packages/agent/src/harness/session/jsonl/codec.ts:62] | `packages/agent/src/harness/session/jsonl/codec.ts:62` |
| `Invalid JSONL storage ${path}: missing header` | 文件没有完整、terminated 的第一行。[E: packages/agent/src/harness/session/jsonl/io.ts:27] | `packages/agent/src/harness/session/jsonl/io.ts:27` |
| `Invalid JSONL storage ${path}: invalid header` | header 行 `parseJsonlSessionHeader` 失败。[E: packages/agent/src/harness/session/jsonl/io.ts:31] | `packages/agent/src/harness/session/jsonl/io.ts:31` |
| `Session ${id} uses unsupported storage version ${n}` | v4 header 的 `storageVersion !== 1`。[E: packages/agent/src/harness/session/jsonl/storage.ts:96] | `packages/agent/src/harness/session/jsonl/storage.ts:96` |
| `Invalid JSONL storage ${path}: line ${n}` | 事务行 decode/apply 失败。[E: packages/agent/src/harness/session/jsonl/storage.ts:104] | `packages/agent/src/harness/session/jsonl/storage.ts:104` |
| `Invalid JSONL transaction: not valid JSON` | 事务行不是合法 JSON。[E: packages/agent/src/harness/session/jsonl/io.ts:71] | `packages/agent/src/harness/session/jsonl/io.ts:71` |
| `Invalid JSONL write kind: …` | write `kind` 不是 entry/usage/value/list。[E: packages/agent/src/harness/session/jsonl/io.ts:62] | `packages/agent/src/harness/session/jsonl/io.ts:62` |
| `Session file does not exist: ${path}` | open/delete 时文件缺失。[E: packages/agent/src/harness/session/jsonl/repo.ts:356] | `packages/agent/src/harness/session/jsonl/repo.ts:356` |
| `Session identity does not match header` | open 后 header id/cwd 对不上 metadata。[E: packages/agent/src/harness/session/jsonl/repo.ts:368] | `packages/agent/src/harness/session/jsonl/repo.ts:368` |
| `Cannot fork an open legacy v3 JSONL session…` | 源已打开且仍是 v3 backing。[E: packages/agent/src/harness/session/jsonl/repo.ts:306] | `packages/agent/src/harness/session/jsonl/repo.ts:306` |

没有稳定的 `syntax` / `schema` kind 字段；机器判别只能看 `Error.message` / `cause`。[I]

## TaggedError 拒绝标签

`TaggedError(tag)` 把 `tag` 写成实例 `_tag` 与 `name`。[E: packages/agent/src/harness/result.ts:28] [E: packages/agent/src/harness/result.ts:30] 下列类由 `result.ts` 定义、`agent-harness.ts` 再导出，并出现在 `RunResult` 等 union 中。

| `_tag` | 类 | 额外字段 | 出现在哪些 Result error union | 源 path |
| --- | --- | --- | --- | --- |
| `LaneBusy` | `LaneBusy` | `lane`; `operationId`; `operationKind` | Run / Compaction / Navigation / Admission [E: packages/agent/src/harness/result.ts:53] [E: packages/agent/src/harness/agent-harness.ts:86] | `packages/agent/src/harness/result.ts:53` |
| `OperationMismatch` | `OperationMismatch` | `lane`; `expectedOperationId`; optional current/last | Drive / AbortRequest [E: packages/agent/src/harness/result.ts:59] [E: packages/agent/src/harness/agent-harness.ts:169] | `packages/agent/src/harness/result.ts:59` |
| `NoActiveRun` | `NoActiveRun` | `lane` | 仍导出；当前公开 Result union 未列入 Queue [E: packages/agent/src/harness/result.ts:66] [E: packages/agent/src/harness/agent-harness.ts:44] [I] | `packages/agent/src/harness/result.ts:66` |
| `NoActiveOperation` | `NoActiveOperation` | `lane` | Abort [E: packages/agent/src/harness/result.ts:67] [E: packages/agent/src/harness/agent-harness.ts:101] | `packages/agent/src/harness/result.ts:67` |
| `NothingToResume` | `NothingToResume` | `lane` | Resume [E: packages/agent/src/harness/result.ts:68] [E: packages/agent/src/harness/agent-harness.ts:96] | `packages/agent/src/harness/result.ts:68` |
| `NothingToCompact` | `NothingToCompact` | `lane` | Compaction / Admission [E: packages/agent/src/harness/result.ts:69] [E: packages/agent/src/harness/agent-harness.ts:90] | `packages/agent/src/harness/result.ts:69` |
| `InvalidMessage` | `InvalidMessage` | `lane`; `reason` | Run / Queue / Admission [E: packages/agent/src/harness/result.ts:70] [E: packages/agent/src/harness/agent-harness.ts:86] | `packages/agent/src/harness/result.ts:70` |
| `InvalidNavigation` | `InvalidNavigation` | `lane`; `reason` | Navigation / Admission [E: packages/agent/src/harness/result.ts:75] [E: packages/agent/src/harness/agent-harness.ts:94] | `packages/agent/src/harness/result.ts:75` |
| `UnknownSkill` | `UnknownSkill` | `name` | Run / Admission [E: packages/agent/src/harness/result.ts:80] [E: packages/agent/src/harness/agent-harness.ts:86] | `packages/agent/src/harness/result.ts:80` |
| `UnknownTemplate` | `UnknownTemplate` | `name` | Run / Admission [E: packages/agent/src/harness/result.ts:81] [E: packages/agent/src/harness/agent-harness.ts:86] | `packages/agent/src/harness/result.ts:81` |
| `UnknownTarget` | `UnknownTarget` | `targetId` | Navigation / Admission [E: packages/agent/src/harness/result.ts:82] [E: packages/agent/src/harness/agent-harness.ts:94] | `packages/agent/src/harness/result.ts:82` |
| `InvalidLane` | `InvalidLane` | `lane`; `reason` | 仍导出；当前公开 Result typedef 未列入 CreateLane [E: packages/agent/src/harness/result.ts:83] [E: packages/agent/src/harness/agent-harness.ts:39] [I] | `packages/agent/src/harness/result.ts:83` |
| `Closed` | `Closed` | 无额外业务字段 | 上述多数 Result error union [E: packages/agent/src/harness/result.ts:88] [E: packages/agent/src/harness/agent-harness.ts:86] | `packages/agent/src/harness/result.ts:88` |

已删除的旧 tag / class：`MissingIdentities`、`LaneExists`、`UnknownQueueItem`。类型测试锁定 `RunResult` 失败 tag 为 `LaneBusy | InvalidMessage | UnknownSkill | UnknownTemplate | Closed`。[E: packages/agent/test/harness/types.test.ts:394]

`SliceNotImplemented` 仍会在未完成的 slice（例如 `watchSession`）上 throw。[E: packages/agent/src/harness/runtime/harness.ts:306] [E: packages/agent/src/harness/agent-harness.ts:52]

## RecordLogCorruption 已删除

`packages/agent/src/harness/reducer.ts` 已迁到 `packages/agent/src/harness/runtime/reducer.ts`。现行导出是 `reduceLaneSnapshot`：把 `HarnessEvent` / `LaneWatchEvent` 应用到可变 `LaneSnapshot`，返回 `"rebase"` 或 `undefined`。它不再定义 `RecordLogCorruptionReason`，也不再 throw corruption。[E: packages/agent/src/harness/runtime/reducer.ts:22] [E: packages/agent/src/index.ts:77]

## 关系边界

`subsys.agent-core.exec-env` 解释 Node filesystem / process backend 如何填 `FileErrorCode` 与 `ExecutionErrorCode`，以及 `TextLineReader` 的 `terminated` 语义。本节点只列 union 与 Error 承载字段。[E: packages/agent/src/harness/types.ts:162] [E: packages/agent/src/harness/types.ts:188] [I]

`subsys.agent-core.jsonl-storage` 解释 JSONL 文件布局、`runJsonlFork` 与 load/open。本节点只列失败时的 `Error.message` 模板。[I]

`subsys.agent-core.agent-harness-lifecycle` 解释 `TaggedError` Result 与 `SliceNotImplemented` 何时出现。[I]

## Sources

- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/session.ts
- packages/agent/src/harness/session/jsonl/codec.ts
- packages/agent/src/harness/session/jsonl/storage.ts
- packages/agent/src/harness/session/jsonl/repo.ts
- packages/agent/src/harness/session/jsonl/io.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/result.ts
- packages/agent/src/harness/runtime/types.ts
- packages/agent/src/harness/runtime/harness.ts
- packages/agent/src/harness/runtime/reducer.ts
- packages/agent/test/harness/types.test.ts

## 相关

- [subsys.agent-core.exec-env](../subsystems/agent-core/exec-env.md)：Node backend 如何映射 `FileErrorCode` / `ExecutionErrorCode`，以及 `openTextLineReader`。
- [subsys.agent-core.agent-harness-lifecycle](../subsystems/agent-core/agent-harness-lifecycle.md)：`AgentHarness` 的 throw / Result 门闩。
- [subsys.agent-core.jsonl-storage](../subsystems/agent-core/jsonl-storage.md)：JSONL v4 存储、`parseJsonlTransaction` 与 header/事务读写。
