---
id: ref.agent.error-codes
title: 错误代码目录(File/Exec/Session/JSONL/Harness)
kind: catalog
tier: T3
pkg: agent
source:
  - packages/agent/src/harness/types.ts
  - packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/jsonl/errors.ts
  - packages/agent/src/harness/session/jsonl/codec.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/result.ts
  - packages/agent/src/harness/reducer.ts
  - packages/agent/src/harness/session/jsonl/storage.ts
symbols:
  - FileErrorCode
  - ExecutionErrorCode
  - CompactionErrorCode
  - BranchSummaryErrorCode
  - SessionErrorCode
  - JsonlDecodeError
  - RecordLogCorruptionReason
related:
  - subsys.agent-core.exec-env
  - subsys.agent-core.agent-harness-lifecycle
  - subsys.agent-core.jsonl-storage
evidence: explicit
status: verified
updated: 086c32e745
---

> `ref.agent.error-codes` 是当前 harness 错误面的逐实例目录：`FileErrorCode` / `ExecutionErrorCode` / `CompactionErrorCode` / `BranchSummaryErrorCode` / `SessionErrorCode`、JSONL `JsonlDecodeError.kind`，以及取代已删除 `AgentHarnessErrorCode` 的 `TaggedError` `_tag` 与 `RecordLogCorruptionReason`。

## 能回答的问题

- `FileErrorCode` 与 `ExecutionErrorCode` 现在有哪些字面量？
- JSONL decode 的显式错误 kind 和消息模板是什么？
- `AgentHarnessErrorCode` 还在吗，公开拒绝面改成了什么？
- `SessionErrorCode` 与 `JsonlDecodeError` 如何衔接？
- reducer restore 拒绝用哪些 `RecordLogCorruptionReason`？

## Error class 承载关系

| Error class | 稳定判别字段 | constructor | 语义边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `FileError` | `code: FileErrorCode`；optional `path` | `(code, message, path?, cause?)` | `FileSystem` 操作失败的 backend-independent 分类。[E: packages/agent/src/harness/types.ts:143] [E: packages/agent/src/harness/types.ts:145] [E: packages/agent/src/harness/types.ts:149] | `packages/agent/src/harness/types.ts:143` |
| `ExecutionError` | `code: ExecutionErrorCode` | `(code, message, cause?)` | `ExecutionEnv.exec` / `Shell.exec` 失败分类。[E: packages/agent/src/harness/types.ts:167] [E: packages/agent/src/harness/types.ts:169] [E: packages/agent/src/harness/types.ts:171] | `packages/agent/src/harness/types.ts:167` |
| `CompactionError` | `code: CompactionErrorCode` | `(code, message, cause?)` | compaction helper 失败。[E: packages/agent/src/harness/types.ts:182] [E: packages/agent/src/harness/types.ts:184] [E: packages/agent/src/harness/types.ts:186] | `packages/agent/src/harness/types.ts:182` |
| `BranchSummaryError` | `code: BranchSummaryErrorCode` | `(code, message, cause?)` | branch summarization helper 失败。[E: packages/agent/src/harness/types.ts:197] [E: packages/agent/src/harness/types.ts:199] [E: packages/agent/src/harness/types.ts:201] | `packages/agent/src/harness/types.ts:197` |
| `SessionError` | `code: SessionErrorCode` | `(code, message, cause?)` | session / storage / query / fork 失败。[E: packages/agent/src/harness/session/types.ts:385] [E: packages/agent/src/harness/session/types.ts:386] [E: packages/agent/src/harness/session/types.ts:388] | `packages/agent/src/harness/session/types.ts:385` |
| `JsonlDecodeError` | `kind: "syntax" \| "schema"` | `(kind, message, cause?)` | 单行 JSONL header/mutation 解析失败；`name` 固定为 `JsonlDecodeError`。[E: packages/agent/src/harness/session/jsonl/errors.ts:4] [E: packages/agent/src/harness/session/jsonl/errors.ts:5] [E: packages/agent/src/harness/session/jsonl/errors.ts:7] [E: packages/agent/src/harness/session/jsonl/errors.ts:9] | `packages/agent/src/harness/session/jsonl/errors.ts:4` |
| `RecordLogCorruption` | `reason: RecordLogCorruptionReason` | `(reason, message)` | lane record log 自相矛盾，restore 必须拒绝。[E: packages/agent/src/harness/reducer.ts:36] [E: packages/agent/src/harness/reducer.ts:37] [E: packages/agent/src/harness/reducer.ts:39] | `packages/agent/src/harness/reducer.ts:36` |
| `HarnessNotImplemented` | `operation: string` | `(operation)` | scaffold 未实现路径；message 为 `AgentHarness.${operation} is not implemented yet`。[E: packages/agent/src/harness/agent-harness.ts:74] [E: packages/agent/src/harness/agent-harness.ts:75] [E: packages/agent/src/harness/agent-harness.ts:78] | `packages/agent/src/harness/agent-harness.ts:74` |
| `HarnessClosed` | 无 code 字段 | `()` | close 后仍调用未实现路径或 registry `on()`。[E: packages/agent/src/harness/agent-harness.ts:67] [E: packages/agent/src/harness/agent-harness.ts:69] | `packages/agent/src/harness/agent-harness.ts:67` |
| `HarnessFault` | `cause: unknown` | `(message, cause)` | 包装未知故障。[E: packages/agent/src/harness/agent-harness.ts:57] [E: packages/agent/src/harness/agent-harness.ts:58] [E: packages/agent/src/harness/agent-harness.ts:60] | `packages/agent/src/harness/agent-harness.ts:57` |

`AgentHarnessError` / `AgentHarnessErrorCode` 已从 `harness/types.ts` 删除。公开预期拒绝改为 `TaggedError` 子类，经 `Result.ok === false` 返回；未实现与 closed 仍 throw。[E: packages/agent/src/harness/result.ts:1] [E: packages/agent/src/harness/agent-harness.ts:113] [E: packages/agent/src/harness/agent-harness.ts:356] [I]

## FileErrorCode 实例

`FileErrorCode` 是 8 元封闭 string union。[E: packages/agent/src/harness/types.ts:132] [E: packages/agent/src/harness/types.ts:140]

| code | 类型 | 含义 | 源 path |
| --- | --- | --- | --- |
| `aborted` | string literal | 文件操作被 abort 或等价取消中止。[E: packages/agent/src/harness/types.ts:133] [I] | `packages/agent/src/harness/types.ts:133` |
| `not_found` | string literal | 目标路径不存在。[E: packages/agent/src/harness/types.ts:134] [I] | `packages/agent/src/harness/types.ts:134` |
| `permission_denied` | string literal | backend 拒绝访问。[E: packages/agent/src/harness/types.ts:135] [I] | `packages/agent/src/harness/types.ts:135` |
| `not_directory` | string literal | 期望目录的位置不是目录。[E: packages/agent/src/harness/types.ts:136] [I] | `packages/agent/src/harness/types.ts:136` |
| `is_directory` | string literal | 期望文件的位置是目录。[E: packages/agent/src/harness/types.ts:137] [I] | `packages/agent/src/harness/types.ts:137` |
| `invalid` | string literal | 路径、类型或参数无效。[E: packages/agent/src/harness/types.ts:138] [I] | `packages/agent/src/harness/types.ts:138` |
| `not_supported` | string literal | 当前 filesystem backend 不支持该操作。[E: packages/agent/src/harness/types.ts:139] [I] | `packages/agent/src/harness/types.ts:139` |
| `unknown` | string literal | 未归入前述分类的 filesystem failure。[E: packages/agent/src/harness/types.ts:140] [I] | `packages/agent/src/harness/types.ts:140` |

`FileSystem` 方法签名一律返回 `Promise<Result<…, FileError>>`，而不是 throw。[E: packages/agent/src/harness/types.ts:236] [E: packages/agent/src/harness/types.ts:240] JSDoc 另要求实现不得 throw/reject，失败必须编码进 `Result`。[I]

## ExecutionErrorCode 实例

`ExecutionErrorCode` 是 6 元封闭 string union。[E: packages/agent/src/harness/types.ts:158] [E: packages/agent/src/harness/types.ts:164]

| code | 类型 | 含义 | 源 path |
| --- | --- | --- | --- |
| `aborted` | string literal | 命令被 abort 中止。[E: packages/agent/src/harness/types.ts:159] [I] | `packages/agent/src/harness/types.ts:159` |
| `timeout` | string literal | 超过允许时限。[E: packages/agent/src/harness/types.ts:160] [I] | `packages/agent/src/harness/types.ts:160` |
| `shell_unavailable` | string literal | 需要 shell 但不可用。[E: packages/agent/src/harness/types.ts:161] [I] | `packages/agent/src/harness/types.ts:161` |
| `spawn_error` | string literal | spawn 层失败。[E: packages/agent/src/harness/types.ts:162] [I] | `packages/agent/src/harness/types.ts:162` |
| `callback_error` | string literal | stdout/stderr 或 lifecycle callback 失败。[E: packages/agent/src/harness/types.ts:163] [I] | `packages/agent/src/harness/types.ts:163` |
| `unknown` | string literal | 未归入前述分类的 execution failure。[E: packages/agent/src/harness/types.ts:164] [I] | `packages/agent/src/harness/types.ts:164` |

## CompactionErrorCode / BranchSummaryErrorCode 实例

两组 helper code 都只有 `aborted` 与 `summarization_failed`。[E: packages/agent/src/harness/types.ts:179] [E: packages/agent/src/harness/types.ts:194]

| code | union | 含义 | 源 path |
| --- | --- | --- | --- |
| `aborted` | `CompactionErrorCode` | compaction helper 被取消。[E: packages/agent/src/harness/types.ts:179] [I] | `packages/agent/src/harness/types.ts:179` |
| `summarization_failed` | `CompactionErrorCode` | compaction summarization 失败。[E: packages/agent/src/harness/types.ts:179] [I] | `packages/agent/src/harness/types.ts:179` |
| `aborted` | `BranchSummaryErrorCode` | branch summary helper 被取消。[E: packages/agent/src/harness/types.ts:194] [I] | `packages/agent/src/harness/types.ts:194` |
| `summarization_failed` | `BranchSummaryErrorCode` | branch summary summarization 失败。[E: packages/agent/src/harness/types.ts:194] [I] | `packages/agent/src/harness/types.ts:194` |

## SessionErrorCode 实例

`SessionErrorCode` 是 8 元封闭 string union，定义在 `session/types.ts`，不是 `harness/types.ts`。[E: packages/agent/src/harness/session/types.ts:375] [E: packages/agent/src/harness/session/types.ts:382]

| code | 类型 | 含义 | 源 path |
| --- | --- | --- | --- |
| `not_found` | string literal | session 或目标对象不存在。[E: packages/agent/src/harness/session/types.ts:376] [I] | `packages/agent/src/harness/session/types.ts:376` |
| `already_exists` | string literal | 创建时目标已存在。[E: packages/agent/src/harness/session/types.ts:377] [I] | `packages/agent/src/harness/session/types.ts:377` |
| `invalid_entry` | string literal | entry / header 内容无效。JSONL decode 失败常被包成该 code。[E: packages/agent/src/harness/session/types.ts:378] [E: packages/agent/src/harness/session/jsonl/errors.ts:25] [I] | `packages/agent/src/harness/session/types.ts:378` |
| `invalid_payload` | string literal | payload 不符合 schema。[E: packages/agent/src/harness/session/types.ts:379] [I] | `packages/agent/src/harness/session/types.ts:379` |
| `invalid_lane` | string literal | lane 名或 lane 状态无效。[E: packages/agent/src/harness/session/types.ts:380] [I] | `packages/agent/src/harness/session/types.ts:380` |
| `invalid_query` | string literal | find/scan 查询参数无效。[E: packages/agent/src/harness/session/types.ts:381] [I] | `packages/agent/src/harness/session/types.ts:381` |
| `invalid_fork_target` | string literal | fork 目标不合法。[E: packages/agent/src/harness/session/types.ts:382] [I] | `packages/agent/src/harness/session/types.ts:382` |
| `storage` | string literal | 底层 storage/filesystem 失败被提升。`fileResult()` 把非 `not_found` 的 `FileError` 映射到该 code。[E: packages/agent/src/harness/session/types.ts:383] [E: packages/agent/src/harness/session/jsonl/errors.ts:17] | `packages/agent/src/harness/session/types.ts:383` |

`fileResult()`：`FileError.code === "not_found"` → `SessionError("not_found")`，其余 → `SessionError("storage")`。[E: packages/agent/src/harness/session/jsonl/errors.ts:14] [E: packages/agent/src/harness/session/jsonl/errors.ts:17] `invalidFile(path, line, cause)` 一律 `SessionError("invalid_entry", \`Invalid JSONL v4 session ${path}: line ${line} ${cause.message}\`, cause)`。[E: packages/agent/src/harness/session/jsonl/errors.ts:25] [E: packages/agent/src/harness/session/jsonl/errors.ts:26]

## JsonlDecodeError 实例

`JsonlDecodeError.kind` 只有 `"syntax"` 与 `"schema"`。`parseHeader()` / `parseMutation()` 捕获该类后返回 `err(error)`；其它 throw 继续冒泡。[E: packages/agent/src/harness/session/jsonl/errors.ts:5] [E: packages/agent/src/harness/session/jsonl/codec.ts:102] [E: packages/agent/src/harness/session/jsonl/codec.ts:106] [E: packages/agent/src/harness/session/jsonl/codec.ts:220] [E: packages/agent/src/harness/session/jsonl/codec.ts:224]

| kind | message 模板 | 触发条件 | 源 path |
| --- | --- | --- | --- |
| `syntax` | `is not valid JSON` | `JSON.parse(line)` 抛错。[E: packages/agent/src/harness/session/jsonl/codec.ts:38] | `packages/agent/src/harness/session/jsonl/codec.ts:38` |
| `schema` | `is not a JSON object` | parse 成功但根值不是非 null 普通对象。[E: packages/agent/src/harness/session/jsonl/codec.ts:40] | `packages/agent/src/harness/session/jsonl/codec.ts:40` |
| `schema` | `has invalid ${field}` | 必填 string 字段类型不对。`field` 包括 `id`、`cwd`、`lane`、`entry type`、`parentId`、`record type`、`operation kind`、`customType`、`runId`、`targetId`。[E: packages/agent/src/harness/session/jsonl/codec.ts:45] [E: packages/agent/src/harness/session/jsonl/codec.ts:93] [E: packages/agent/src/harness/session/jsonl/codec.ts:95] | `packages/agent/src/harness/session/jsonl/codec.ts:45` |
| `schema` | `has invalid seq` | `seq` 不是正的 safe integer。[E: packages/agent/src/harness/session/jsonl/codec.ts:50] [E: packages/agent/src/harness/session/jsonl/codec.ts:51] | `packages/agent/src/harness/session/jsonl/codec.ts:51` |
| `schema` | `has invalid timestamp` | timestamp 不是 `>= 0` 的 safe integer。[E: packages/agent/src/harness/session/jsonl/codec.ts:57] [E: packages/agent/src/harness/session/jsonl/codec.ts:58] | `packages/agent/src/harness/session/jsonl/codec.ts:58` |
| `schema` | `is not a header` | header 行 `kind !== "header"`。[E: packages/agent/src/harness/session/jsonl/codec.ts:72] | `packages/agent/src/harness/session/jsonl/codec.ts:72` |
| `schema` | `has unsupported session version` | `version !== 4`。[E: packages/agent/src/harness/session/jsonl/codec.ts:73] | `packages/agent/src/harness/session/jsonl/codec.ts:73` |
| `schema` | `has invalid parentSessionId` | 字段存在但不是 string。[E: packages/agent/src/harness/session/jsonl/codec.ts:76] | `packages/agent/src/harness/session/jsonl/codec.ts:76` |
| `schema` | `has invalid legacyParentSessionPath` | 字段存在但不是 string。[E: packages/agent/src/harness/session/jsonl/codec.ts:80] | `packages/agent/src/harness/session/jsonl/codec.ts:80` |
| `schema` | `has both parentSessionId and legacyParentSessionPath` | 两个可选父指针同时出现。[E: packages/agent/src/harness/session/jsonl/codec.ts:83] | `packages/agent/src/harness/session/jsonl/codec.ts:83` |
| `schema` | `has invalid metadata` | `metadata` 存在但不是对象。[E: packages/agent/src/harness/session/jsonl/codec.ts:87] | `packages/agent/src/harness/session/jsonl/codec.ts:87` |
| `schema` | `has unknown entry type ${type}` | `type` 不在 message/model_change/thinking_level_change/active_tools_change/compaction/branch_summary/custom。[E: packages/agent/src/harness/session/jsonl/codec.ts:7] [E: packages/agent/src/harness/session/jsonl/codec.ts:136] | `packages/agent/src/harness/session/jsonl/codec.ts:136` |
| `schema` | `has unknown record type ${type}` | `type` 不在 operation_started/abort_requested/operation_finished/step_attempt/tool_started/queue_enqueued/queue_cancelled/write_deferred/usage。[E: packages/agent/src/harness/session/jsonl/codec.ts:16] [E: packages/agent/src/harness/session/jsonl/codec.ts:154] | `packages/agent/src/harness/session/jsonl/codec.ts:154` |
| `schema` | `has invalid intent` | `operation_started` 的 `intent` 不是对象。[E: packages/agent/src/harness/session/jsonl/codec.ts:158] | `packages/agent/src/harness/session/jsonl/codec.ts:158` |
| `schema` | `has unknown operation kind ${operationKind}` | `intent.kind` 不是 `run` / `compaction` / `navigation`。[E: packages/agent/src/harness/session/jsonl/codec.ts:27] [E: packages/agent/src/harness/session/jsonl/codec.ts:161] | `packages/agent/src/harness/session/jsonl/codec.ts:161` |
| `schema` | `has invalid name` | fact `name` 存在但不是 string。[E: packages/agent/src/harness/session/jsonl/codec.ts:184] | `packages/agent/src/harness/session/jsonl/codec.ts:184` |
| `schema` | `has invalid label` | fact `label` 存在但不是 string。[E: packages/agent/src/harness/session/jsonl/codec.ts:190] | `packages/agent/src/harness/session/jsonl/codec.ts:190` |
| `schema` | `has unknown fact type` | `fact` 既不是 `name` 也不是 `label`。[E: packages/agent/src/harness/session/jsonl/codec.ts:200] | `packages/agent/src/harness/session/jsonl/codec.ts:200` |
| `schema` | `has unknown mutation kind` | 行 `kind` 不是 entry/record/lane/fact。[E: packages/agent/src/harness/session/jsonl/codec.ts:216] | `packages/agent/src/harness/session/jsonl/codec.ts:216` |
| `schema` | `is missing a header` | storage 加载时第一行不是 header。由 `JsonlSessionStorage` 构造后交给 `invalidFile()`。[E: packages/agent/src/harness/session/jsonl/storage.ts:74] | `packages/agent/src/harness/session/jsonl/storage.ts:74` |

`kind` 是稳定机器判别；`message` 是短英文短语，不是独立 code union。加载路径通常再包一层 `SessionError("invalid_entry")`。[E: packages/agent/src/harness/session/jsonl/errors.ts:5] [E: packages/agent/src/harness/session/jsonl/errors.ts:26] [I]

## TaggedError 拒绝标签（取代 AgentHarnessErrorCode）

`TaggedError(tag)` 把 `tag` 写成实例 `_tag` 与 `name`。[E: packages/agent/src/harness/result.ts:30] [E: packages/agent/src/harness/result.ts:34] 下列类由 `agent-harness.ts` 导出，并出现在 `RunRejected` 等 union 中。

| `_tag` | 类 | 额外字段 | 出现在哪些 Result error union | 源 path |
| --- | --- | --- | --- | --- |
| `LaneBusy` | `LaneBusy` | `lane`; `operationId`; `operationKind` | Run / Compaction / Navigation / Resume [E: packages/agent/src/harness/agent-harness.ts:28] [E: packages/agent/src/harness/agent-harness.ts:105] | `packages/agent/src/harness/agent-harness.ts:28` |
| `MissingIdentities` | `MissingIdentities` | `lane`; `tools`; `models` | Resume [E: packages/agent/src/harness/agent-harness.ts:34] [E: packages/agent/src/harness/agent-harness.ts:108] | `packages/agent/src/harness/agent-harness.ts:34` |
| `NoActiveRun` | `NoActiveRun` | `lane` | Queue [E: packages/agent/src/harness/agent-harness.ts:40] [E: packages/agent/src/harness/agent-harness.ts:109] | `packages/agent/src/harness/agent-harness.ts:40` |
| `NoActiveOperation` | `NoActiveOperation` | `lane` | Abort [E: packages/agent/src/harness/agent-harness.ts:41] [E: packages/agent/src/harness/agent-harness.ts:111] | `packages/agent/src/harness/agent-harness.ts:41` |
| `NothingToResume` | `NothingToResume` | `lane` | Resume [E: packages/agent/src/harness/agent-harness.ts:42] [E: packages/agent/src/harness/agent-harness.ts:108] | `packages/agent/src/harness/agent-harness.ts:42` |
| `InvalidMessage` | `InvalidMessage` | `lane`; `reason` | Run / Queue [E: packages/agent/src/harness/agent-harness.ts:43] [E: packages/agent/src/harness/agent-harness.ts:105] | `packages/agent/src/harness/agent-harness.ts:43` |
| `UnknownSkill` | `UnknownSkill` | `name` | Run [E: packages/agent/src/harness/agent-harness.ts:44] [E: packages/agent/src/harness/agent-harness.ts:105] | `packages/agent/src/harness/agent-harness.ts:44` |
| `UnknownTemplate` | `UnknownTemplate` | `name` | Run [E: packages/agent/src/harness/agent-harness.ts:45] [E: packages/agent/src/harness/agent-harness.ts:105] | `packages/agent/src/harness/agent-harness.ts:45` |
| `UnknownTarget` | `UnknownTarget` | `targetId` | Navigation / CreateLane [E: packages/agent/src/harness/agent-harness.ts:46] [E: packages/agent/src/harness/agent-harness.ts:107] | `packages/agent/src/harness/agent-harness.ts:46` |
| `UnknownQueueItem` | `UnknownQueueItem` | `lane`; `entryId` | CancelQueued [E: packages/agent/src/harness/agent-harness.ts:47] [E: packages/agent/src/harness/agent-harness.ts:110] | `packages/agent/src/harness/agent-harness.ts:47` |
| `LaneExists` | `LaneExists` | `lane` | CreateLane [E: packages/agent/src/harness/agent-harness.ts:52] [E: packages/agent/src/harness/agent-harness.ts:132] | `packages/agent/src/harness/agent-harness.ts:52` |
| `InvalidLane` | `InvalidLane` | `lane`; `reason` | CreateLane [E: packages/agent/src/harness/agent-harness.ts:53] [E: packages/agent/src/harness/agent-harness.ts:132] | `packages/agent/src/harness/agent-harness.ts:53` |
| `NothingToCompact` | `NothingToCompact` | `lane` | Compaction [E: packages/agent/src/harness/agent-harness.ts:54] [E: packages/agent/src/harness/agent-harness.ts:106] | `packages/agent/src/harness/agent-harness.ts:54` |
| `Closed` | `Closed` | 无额外业务字段 | 上述所有 Result error union [E: packages/agent/src/harness/agent-harness.ts:55] [E: packages/agent/src/harness/agent-harness.ts:105] | `packages/agent/src/harness/agent-harness.ts:55` |

这些类目前主要由类型合同声明。scaffold 的多数方法还没走到 `Result.err(...)`，而是 throw `HarnessNotImplemented`。[E: packages/agent/src/harness/agent-harness.ts:366] [I]

旧 `AgentHarnessErrorCode` 字面量 `busy` / `invalid_state` / `invalid_argument` / `session` / `hook` / `auth` / `compaction` / `branch_summary` / `unknown` 不再作为 harness 顶层 code union 存在。

## RecordLogCorruptionReason 实例

`RecordLogCorruptionReason` 是 13 元封闭 union。[E: packages/agent/src/harness/reducer.ts:22] [E: packages/agent/src/harness/reducer.ts:33]

| reason | 类型 | 含义边界 | 源 path |
| --- | --- | --- | --- |
| `multiple_open_operations` | string literal | 恢复切片里同时存在多个 open operation。[E: packages/agent/src/harness/reducer.ts:23] [I] | `packages/agent/src/harness/reducer.ts:23` |
| `unknown_operation` | string literal | record 引用了未知 operation。[E: packages/agent/src/harness/reducer.ts:24] [I] | `packages/agent/src/harness/reducer.ts:24` |
| `record_after_finish` | string literal | operation 结束后仍出现后续 record。[E: packages/agent/src/harness/reducer.ts:25] [I] | `packages/agent/src/harness/reducer.ts:25` |
| `non_consecutive_attempt` | string literal | step attempt 序号不连续。[E: packages/agent/src/harness/reducer.ts:26] [I] | `packages/agent/src/harness/reducer.ts:26` |
| `invalid_compaction_reason` | string literal | compaction reason 不合法。[E: packages/agent/src/harness/reducer.ts:27] [I] | `packages/agent/src/harness/reducer.ts:27` |
| `queue_after_abort` | string literal | abort 之后仍 enqueue。[E: packages/agent/src/harness/reducer.ts:28] [I] | `packages/agent/src/harness/reducer.ts:28` |
| `invalid_queue_cancellation` | string literal | queue cancel 与现存 enqueue 不一致。[E: packages/agent/src/harness/reducer.ts:29] [I] | `packages/agent/src/harness/reducer.ts:29` |
| `inconsistent_step` | string literal | step 记录自相矛盾。[E: packages/agent/src/harness/reducer.ts:30] [I] | `packages/agent/src/harness/reducer.ts:30` |
| `tool_call_mismatch` | string literal | tool call 与 started/result 对不上。[E: packages/agent/src/harness/reducer.ts:31] [I] | `packages/agent/src/harness/reducer.ts:31` |
| `duplicate_tool_invocation` | string literal | 同一 tool invocation 重复。[E: packages/agent/src/harness/reducer.ts:32] [I] | `packages/agent/src/harness/reducer.ts:32` |
| `provisioned_entry_mismatch` | string literal | 已存在 entry 与 provisioned intent 内容不同。[E: packages/agent/src/harness/reducer.ts:33] [E: packages/agent/src/harness/reducer.ts:148] | `packages/agent/src/harness/reducer.ts:33` |
| `invalid_deferred_handle` | string literal | deferred handle 不合法。[E: packages/agent/src/harness/reducer.ts:34] [I] | `packages/agent/src/harness/reducer.ts:34` |

`provisioned_entry_mismatch` 的 throw 点在 `validateExactProvisionedEntry()`，message 为 `` Provisioned entry ${id} exists with content different from its intent ``。[E: packages/agent/src/harness/reducer.ts:148] [E: packages/agent/src/harness/reducer.ts:149] 其余 reason 的具体 message 由 `validateRecordLog()` 各分支给出，本表只保证 reason 字面量集合。[I]

## 关系边界

`subsys.agent-core.exec-env` 解释 Node filesystem / process backend 如何填 `FileErrorCode` 与 `ExecutionErrorCode`。本节点只列 union 与 Error 承载字段。[E: packages/agent/src/harness/types.ts:132] [E: packages/agent/src/harness/types.ts:158] [I]

`subsys.agent-core.jsonl-storage` 解释 JSONL 文件布局与 load/open。本节点只列 decode 失败的 `kind` + message 模板。[I]

`subsys.agent-core.agent-harness-lifecycle` 解释 `TaggedError` Result 与 `HarnessNotImplemented` 何时出现。[I]

## Sources

- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/types.ts
- packages/agent/src/harness/session/jsonl/errors.ts
- packages/agent/src/harness/session/jsonl/codec.ts
- packages/agent/src/harness/session/jsonl/storage.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/result.ts
- packages/agent/src/harness/reducer.ts

## 相关

- [subsys.agent-core.exec-env](../subsystems/agent-core/exec-env.md)：Node backend 如何映射 `FileErrorCode` / `ExecutionErrorCode`。
- [subsys.agent-core.agent-harness-lifecycle](../subsystems/agent-core/agent-harness-lifecycle.md)：`AgentHarness` scaffold 的 throw / Result 门闩。
- [subsys.agent-core.jsonl-storage](../subsystems/agent-core/jsonl-storage.md)：JSONL v4 存储与 header/mutation 读写。
