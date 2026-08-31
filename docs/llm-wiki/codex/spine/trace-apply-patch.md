---
id: spine.trace-apply-patch
title: trace: apply_patch
kind: flow
tier: T0
source: [codex-rs/core/src/tools/spec_plan.rs, codex-rs/core/src/tools/handlers/apply_patch.rs, codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs, codex-rs/core/src/apply_patch.rs, codex-rs/core/src/tools/runtimes/apply_patch.rs, codex-rs/core/src/tools/orchestrator.rs, codex-rs/core/src/tools/events.rs, codex-rs/apply-patch/src/lib.rs, codex-rs/apply-patch/src/file_update.rs, codex-rs/apply-patch/src/invocation.rs, codex-rs/features/src/lib.rs]
symbols: [ApplyPatchRuntimeInvocation, ApplyPatchRuntime::run]
related: [spine.tool-call-anatomy, spine.shell-exec-flow, tool.apply-patch, tool.exec-command, ref.protocol-event-lifecycle]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> direct custom tool 与 `exec_command` interception 都先得到 verified patch，随后汇合到 `execute_verified_patch`。该 helper 计算权限、调用 `prepare_apply_patch`，并把获准 invocation 交给 orchestrator/runtime；底层 crate 用 `apply_patch_with_options` 写文件。`Feature::ApplyPatchPreserveLineEndings` 打开时走 `file_update.rs` 的 PreserveLineEndings 路径，否则仍归一化为 LF。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:430][E: codex-rs/core/src/tools/handlers/apply_patch.rs:510][E: codex-rs/core/src/tools/handlers/apply_patch.rs:558][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:179][E: codex-rs/apply-patch/src/file_update.rs:48]

```mermaid
flowchart TD
    DIRECT["custom apply_patch"] --> VERIFY1["parse + verify"]
    EXEC["exec_command interception"] --> VERIFY2["maybe_parse_apply_patch_verified_with_mode"]
    VERIFY1 --> SHARED["execute_verified_patch"]
    VERIFY2 --> SHARED
    SHARED --> PREP["prepare_apply_patch"]
    PREP -->|Reject| MODEL["model error"]
    PREP -->|Invocation| BEGIN["PatchApplyBegin"]
    BEGIN --> ORCH["ToolOrchestrator::run"]
    ORCH --> RUNTIME["ApplyPatchRuntime::run"]
    RUNTIME --> LIB["apply_patch_with_options"]
    LIB --> UPDATE["file_update.rs"]
    UPDATE --> FS["filesystem delta"]
```

## 端到端步骤

1. direct handler 只接受 custom payload，解析 patch、选择 environment、取得 filesystem，并按 cwd/sandbox 验证参数；验证时传入 `apply_patch_file_update_mode(turn)`，随后调用共享 `execute_verified_patch`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:385][E: codex-rs/core/src/tools/handlers/apply_patch.rs:413][E: codex-rs/core/src/tools/handlers/apply_patch.rs:430]
2. `apply_patch_file_update_mode` 读取 `Feature::ApplyPatchPreserveLineEndings`：开启则为 `PreserveLineEndings`，否则 `NormalizeToLf`。该 feature 当前是 UnderDevelopment、默认关闭。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:61][E: codex-rs/features/src/lib.rs:1112][E: codex-rs/features/src/lib.rs:1115]
3. `exec_command` 在启动 process 前调用同一个 `intercept_apply_patch`；只有 `maybe_parse_apply_patch_verified_with_mode` 返回 verified body 才转入共享 patch path，否则继续普通 command 执行。legacy `shell.rs` / `ShellCommandHandler` 已删除，不再有第二条 shell interception。[E: codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs:358][E: codex-rs/core/src/tools/handlers/apply_patch.rs:510][E: codex-rs/core/src/tools/handlers/apply_patch.rs:524]
4. `execute_verified_patch` 先计算 changed paths 与额外文件写权限，再调用 `prepare_apply_patch`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:558][E: codex-rs/core/src/tools/handlers/apply_patch.rs:565][E: codex-rs/core/src/tools/handlers/apply_patch.rs:569]
5. helper 把 patch action 转成 protocol file changes，创建 environment-aware emitter 并发送 begin event，然后构造 `ApplyPatchRequest` 交给 `ToolOrchestrator::run`。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:575][E: codex-rs/core/src/tools/handlers/apply_patch.rs:587][E: codex-rs/core/src/tools/handlers/apply_patch.rs:589][E: codex-rs/core/src/tools/handlers/apply_patch.rs:598]
6. runtime 的 approval key 由 environment id 与变更路径组成，并向 orchestrator 暴露 request 自带的 approval requirement。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:39][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:147]
7. runtime 从 turn environment 取得 filesystem 和 sandbox attempt，调用 `codex_apply_patch::apply_patch_with_options`（不再有独立的 `apply_patch_with_mode` 入口）；成功后把 committed delta 追加到 runtime output。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:175][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:179][E: codex-rs/core/src/tools/runtimes/apply_patch.rs:207]
8. `apply_patch_with_options` 把 `update_file_mode` 交给 `file_update.rs`。`NormalizeToLf` 按 `\n` 切行并写回 LF；`PreserveLineEndings` 用 `SourceFile` 保留原文件换行。[E: codex-rs/apply-patch/src/lib.rs:361][E: codex-rs/apply-patch/src/file_update.rs:48][E: codex-rs/apply-patch/src/file_update.rs:69]
9. sandbox denial 被规范化后返回；无论 orchestrator 成功或失败，helper 都保留 committed delta 并由 emitter 发送 finish。[E: codex-rs/core/src/tools/runtimes/apply_patch.rs:222][E: codex-rs/core/src/tools/handlers/apply_patch.rs:604][E: codex-rs/core/src/tools/handlers/apply_patch.rs:614]

## 关键边界

- `prepare_apply_patch` 只决定 rejection 或 runtime invocation；真正写文件的是 `codex-rs/apply-patch`。[E: codex-rs/core/src/apply_patch.rs:22][E: codex-rs/core/src/apply_patch.rs:36][E: codex-rs/core/src/apply_patch.rs:57][E: codex-rs/apply-patch/src/lib.rs:361]
- direct 与 intercepted path 共享同一个 permission、approval、events、sandbox 和 committed-delta 实现，不存在两套写文件逻辑。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:430][E: codex-rs/core/src/tools/handlers/apply_patch.rs:542][E: codex-rs/core/src/tools/handlers/apply_patch.rs:558]
- 换行保留是 feature-gated 的 file-update 语义，不是独立 patch engine。standalone/arg0 apply-patch 进程通过 `CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS` env 选择同一套 mode。[E: codex-rs/core/src/tools/handlers/apply_patch.rs:61][E: codex-rs/apply-patch/src/lib.rs:59][E: codex-rs/apply-patch/src/lib.rs:91]

## Sources

- `codex-rs/core/src/tools/spec_plan.rs`
- `codex-rs/core/src/tools/handlers/apply_patch.rs`
- `codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs`
- `codex-rs/core/src/apply_patch.rs`
- `codex-rs/core/src/tools/runtimes/apply_patch.rs`
- `codex-rs/core/src/tools/orchestrator.rs`
- `codex-rs/core/src/tools/events.rs`
- `codex-rs/apply-patch/src/lib.rs`
- `codex-rs/apply-patch/src/file_update.rs`
- `codex-rs/apply-patch/src/invocation.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- [工具调用解剖](tool-call-anatomy.md)
- [shell exec flow](shell-exec-flow.md)
- [apply_patch 工具](../surface/tools/apply-patch.md)
- [exec_command 工具](../surface/tools/exec-command.md)
