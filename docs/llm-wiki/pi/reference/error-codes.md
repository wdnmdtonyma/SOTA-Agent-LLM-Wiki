---
id: ref.agent.error-codes
title: 错误代码目录(File/Exec/Harness)
kind: catalog
tier: T3
pkg: agent
batch: agent-core
source:
  - packages/agent/src/harness/types.ts
symbols:
  - FileErrorCode
  - ExecutionErrorCode
  - AgentHarnessErrorCode
related:
  - subsys.agent-core.exec-env
evidence: explicit
status: verified
updated: 8c943640
---

> `ref.agent.error-codes` 是 `packages/agent/src/harness/types.ts` 中 agent harness 公开错误代码的逐实例目录:覆盖 filesystem、execution env 与 top-level harness 三组 error code union,并记录对应 Error class 的 `code` 字段承载关系。

## 能回答的问题

- `FileErrorCode` 当前有哪些稳定字面量?
- `ExecutionErrorCode` 当前有哪些稳定字面量?
- `AgentHarnessErrorCode` 当前有哪些 top-level failure 分类?
- 三组 error code 分别由哪个 Error class 的 `code` 字段承载?
- 哪些语义可以从 literal 名称推断,哪些只应视作静态成员关系?

## Error class 承载关系

| Error class | code 类型 | constructor 参数 | 字段承载 | 语义边界 | 源码证据 |
| --- | --- | --- | --- | --- | --- |
| `FileError` | `FileErrorCode` | `constructor(code: FileErrorCode, message: string, path?: string, cause?: Error)` | `public code: FileErrorCode`;额外带 optional `path` | filesystem 操作失败的 backend-independent 分类;具体 backend 如何映射 OS 错误不由本节点 source 完整覆盖。[I] | [E: packages/agent/src/harness/types.ts:122][E: packages/agent/src/harness/types.ts:124][E: packages/agent/src/harness/types.ts:126][E: packages/agent/src/harness/types.ts:128][E: packages/agent/src/harness/types.ts:131] |
| `ExecutionError` | `ExecutionErrorCode` | `constructor(code: ExecutionErrorCode, message: string, cause?: Error)` | `public code: ExecutionErrorCode` | `ExecutionEnv.exec` 失败分类;spawn、timeout、callback 等运行时触发点需要到 exec-env 子系统核实。[I] | [E: packages/agent/src/harness/types.ts:146][E: packages/agent/src/harness/types.ts:148][E: packages/agent/src/harness/types.ts:150][E: packages/agent/src/harness/types.ts:153] |
| `AgentHarnessError` | `AgentHarnessErrorCode` | `constructor(code: AgentHarnessErrorCode, message: string, cause?: Error)` | `public code: AgentHarnessErrorCode` | public harness failure 的 top-level 分类;具体方法何时抛出每类错误由 harness runtime 覆盖。[I] | [E: packages/agent/src/harness/types.ts:219][E: packages/agent/src/harness/types.ts:220][E: packages/agent/src/harness/types.ts:222][E: packages/agent/src/harness/types.ts:225] |

## FileErrorCode 实例

`FileErrorCode` 是 `packages/agent/src/harness/types.ts` 中的 closed string-literal union,成员集合由该 type alias 的 8 个 literal 行定义。[E: packages/agent/src/harness/types.ts:111][E: packages/agent/src/harness/types.ts:119]

| code | union | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
| --- | --- | --- | --- | --- | --- | --- |
| `aborted` | `FileErrorCode` | string literal | none | 文件操作被 abort signal 或等价取消路径中止。[I] | 字面量归属 `FileErrorCode`;含义来自 code 名称与 `FileError` 用于 file operations 的类型边界推断。[E: packages/agent/src/harness/types.ts:112][I] | `packages/agent/src/harness/types.ts:112` |
| `not_found` | `FileErrorCode` | string literal | none | 目标路径或路径组件不存在。[I] | 字面量归属 `FileErrorCode`;更细的 path resolution 行为不在本 source 展开。[E: packages/agent/src/harness/types.ts:113][I] | `packages/agent/src/harness/types.ts:113` |
| `permission_denied` | `FileErrorCode` | string literal | none | backend 拒绝访问目标路径或文件系统对象。[I] | 字面量归属 `FileErrorCode`;权限来源可能是 OS、sandbox 或 backend policy,需由实现节点确认。[E: packages/agent/src/harness/types.ts:114][I] | `packages/agent/src/harness/types.ts:114` |
| `not_directory` | `FileErrorCode` | string literal | none | 期望目录的位置不是目录。[I] | 字面量归属 `FileErrorCode`;具体触发方法由 filesystem implementation 决定。[E: packages/agent/src/harness/types.ts:115][I] | `packages/agent/src/harness/types.ts:115` |
| `is_directory` | `FileErrorCode` | string literal | none | 期望文件的位置是目录。[I] | 字面量归属 `FileErrorCode`;例如 read/write 类 API 可使用该分类,但调用点不由本节点 source 直接证明。[E: packages/agent/src/harness/types.ts:116][I] | `packages/agent/src/harness/types.ts:116` |
| `invalid` | `FileErrorCode` | string literal | none | 路径、文件类型或参数对 filesystem operation 无效。[I] | 字面量归属 `FileErrorCode`;无效条件的具体枚举不在 type alias 内。[E: packages/agent/src/harness/types.ts:117][I] | `packages/agent/src/harness/types.ts:117` |
| `not_supported` | `FileErrorCode` | string literal | none | 当前 filesystem backend 不支持请求的操作或对象形态。[I] | 字面量归属 `FileErrorCode`;本 source 没有列出哪些 operation 会返回该 code。[E: packages/agent/src/harness/types.ts:118][I] | `packages/agent/src/harness/types.ts:118` |
| `unknown` | `FileErrorCode` | string literal | none | 其他未归入前述稳定分类的 filesystem failure。[I] | 字面量归属 `FileErrorCode`;作为 catch-all 的语义来自名称推断。[E: packages/agent/src/harness/types.ts:119][I] | `packages/agent/src/harness/types.ts:119` |

## ExecutionErrorCode 实例

`ExecutionErrorCode` 是 `packages/agent/src/harness/types.ts` 中的 closed string-literal union,成员集合由该 type alias 的 6 个 literal 行定义。[E: packages/agent/src/harness/types.ts:137][E: packages/agent/src/harness/types.ts:143]

| code | union | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
| --- | --- | --- | --- | --- | --- | --- |
| `aborted` | `ExecutionErrorCode` | string literal | none | 命令执行被 abort signal 或等价取消路径中止。[I] | 字面量归属 `ExecutionErrorCode`;具体取消传播由 `ExecutionEnv.exec` implementation 决定。[E: packages/agent/src/harness/types.ts:138][I] | `packages/agent/src/harness/types.ts:138` |
| `timeout` | `ExecutionErrorCode` | string literal | none | 命令执行超过允许时限。[I] | 字面量归属 `ExecutionErrorCode`;timeout 单位和默认值不在该 union 中定义。[E: packages/agent/src/harness/types.ts:139][I] | `packages/agent/src/harness/types.ts:139` |
| `shell_unavailable` | `ExecutionErrorCode` | string literal | none | 需要 shell 但 shell 不可用。[I] | 字面量归属 `ExecutionErrorCode`;shell 发现策略需要到 exec-env 节点核实。[E: packages/agent/src/harness/types.ts:140][I] | `packages/agent/src/harness/types.ts:140` |
| `spawn_error` | `ExecutionErrorCode` | string literal | none | 启动子进程或执行 backend 时发生 spawn 层错误。[I] | 字面量归属 `ExecutionErrorCode`;具体 errno 或 backend exception 映射不由本 source 展开。[E: packages/agent/src/harness/types.ts:141][I] | `packages/agent/src/harness/types.ts:141` |
| `callback_error` | `ExecutionErrorCode` | string literal | none | stdout/stderr 或 lifecycle callback 处理失败。[I] | 字面量归属 `ExecutionErrorCode`;callback 种类和调用顺序由 exec-env 子系统覆盖。[E: packages/agent/src/harness/types.ts:142][I] | `packages/agent/src/harness/types.ts:142` |
| `unknown` | `ExecutionErrorCode` | string literal | none | 其他未归入前述稳定分类的 execution failure。[I] | 字面量归属 `ExecutionErrorCode`;作为 catch-all 的语义来自名称推断。[E: packages/agent/src/harness/types.ts:143][I] | `packages/agent/src/harness/types.ts:143` |

## AgentHarnessErrorCode 实例

`AgentHarnessErrorCode` 是 `packages/agent/src/harness/types.ts` 中的 closed string-literal union,成员集合由该 type alias 的 9 个 literal 行定义。[E: packages/agent/src/harness/types.ts:207][E: packages/agent/src/harness/types.ts:216]

| code | union | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
| --- | --- | --- | --- | --- | --- | --- |
| `busy` | `AgentHarnessErrorCode` | string literal | none | public harness 当前不能接受该操作,通常表示已有进行中的 turn 或 lifecycle phase 不允许。[I] | 字面量归属 `AgentHarnessErrorCode`;phase 规则不是该 type alias 的职责。[E: packages/agent/src/harness/types.ts:208][I] | `packages/agent/src/harness/types.ts:208` |
| `invalid_state` | `AgentHarnessErrorCode` | string literal | none | harness 内部或会话状态不满足操作前置条件。[I] | 字面量归属 `AgentHarnessErrorCode`;具体前置条件需由 harness runtime 节点核实。[E: packages/agent/src/harness/types.ts:209][I] | `packages/agent/src/harness/types.ts:209` |
| `invalid_argument` | `AgentHarnessErrorCode` | string literal | none | public API 入参无效或引用了未知资源。[I] | 字面量归属 `AgentHarnessErrorCode`;参数校验细节不在本 source 展开。[E: packages/agent/src/harness/types.ts:210][I] | `packages/agent/src/harness/types.ts:210` |
| `session` | `AgentHarnessErrorCode` | string literal | none | session storage、session tree 或 repository 相关错误被提升为 harness 顶层分类。[I] | 字面量归属 `AgentHarnessErrorCode`;与 `SessionErrorCode` 的映射点不在本节点指定 symbols 内。[E: packages/agent/src/harness/types.ts:211][I] | `packages/agent/src/harness/types.ts:211` |
| `hook` | `AgentHarnessErrorCode` | string literal | none | harness hook 执行或 hook 返回值相关失败。[I] | 字面量归属 `AgentHarnessErrorCode`;hook lifecycle 和错误包装由 hooks 节点覆盖。[E: packages/agent/src/harness/types.ts:212][I] | `packages/agent/src/harness/types.ts:212` |
| `auth` | `AgentHarnessErrorCode` | string literal | none | provider auth 或模型请求认证相关失败被提升为 harness 顶层分类。[I] | 字面量归属 `AgentHarnessErrorCode`;auth resolution 细节属于 ai/auth 或 harness transport 相关节点。[E: packages/agent/src/harness/types.ts:213][I] | `packages/agent/src/harness/types.ts:213` |
| `compaction` | `AgentHarnessErrorCode` | string literal | none | compaction helper 或 compaction flow 失败的 harness 顶层分类。[I] | 字面量归属 `AgentHarnessErrorCode`;底层 `CompactionErrorCode` 不是本节点目标 union。[E: packages/agent/src/harness/types.ts:214][I] | `packages/agent/src/harness/types.ts:214` |
| `branch_summary` | `AgentHarnessErrorCode` | string literal | none | branch summary helper 或 branch summary flow 失败的 harness 顶层分类。[I] | 字面量归属 `AgentHarnessErrorCode`;底层 `BranchSummaryErrorCode` 不是本节点目标 union。[E: packages/agent/src/harness/types.ts:215][I] | `packages/agent/src/harness/types.ts:215` |
| `unknown` | `AgentHarnessErrorCode` | string literal | none | 其他未归入前述稳定分类的 harness failure。[I] | 字面量归属 `AgentHarnessErrorCode`;作为 catch-all 的语义来自名称推断。[E: packages/agent/src/harness/types.ts:216][I] | `packages/agent/src/harness/types.ts:216` |

## 关系边界

`subsys.agent-core.exec-env` 负责解释 `FileErrorCode` 与 `ExecutionErrorCode` 在 Node filesystem / process execution backend 中如何产生;本节点只覆盖三组 public union 的逐字面量目录和 Error class 承载字段。[E: packages/agent/src/harness/types.ts:111][E: packages/agent/src/harness/types.ts:137][I]

`CompactionErrorCode`、`BranchSummaryErrorCode`、`SessionErrorCode` 也定义在同一文件附近,但不在本节点 `symbols` 范围内;它们只作为 `AgentHarnessErrorCode` 的相邻分类背景出现,不做逐实例覆盖。[E: packages/agent/src/harness/types.ts:158][E: packages/agent/src/harness/types.ts:173][E: packages/agent/src/harness/types.ts:187][I]

## Sources

- packages/agent/src/harness/types.ts

## 相关

- [subsys.agent-core.exec-env](../subsystems/agent-core/exec-env.md): Node execution/filesystem backend 如何映射 `FileErrorCode` 与 `ExecutionErrorCode`。
