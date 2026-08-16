# tools-exec batch uncertainty — `9ded177ce7`

## Remaining [U]

- [U] 本轮 brief 写 “no open-session/tool-description limits that were removed”。目标树可以证明 framed/gRPC `open_session` 不再按并发 session 数或 tool-description 大小拒绝请求，但仍保留 request/active-cell/control/delegate semaphore。无法从当前 checkout 单独证明上一 SHA 里具体是哪条 open-session / tool-description 配额被删掉的。
- [U] Windows 上 UnifiedExec 默认开启还取决于 `conpty_supported()`。feature registry 全平台 `default_enabled: true`，但若某 Windows 构建的 ConPTY 探测失败，`shell_type_for_model_and_features` 仍会回落到 `ShellCommand`。本批未在目标树里核到 ConPTY 探测对所有 Windows 发行版恒为 true。
- [U] `wait_for_environment` 的 `StartingTurnEnvironment::wait_until_ready()` 失败后，handler 把任意 error 都映射成 “failed to start and is unavailable”。不同 environment 后端的失败原因是否会丢失，本批未逐个环境实现核对。

## Notes (not [U])

- Guardian reviewer 只暴露 `exec_command` / `write_stdin` / 可选 `view_image`，这是 `add_core_tool_sources` 的显式 early-return，不是推断。
- `Feature::ViewImage` 是 Stable 且默认 true；`Feature::UnifiedImageBudget` 与 `Feature::ApplyPatchPreserveLineEndings` 都是 under-development、默认 false。
- 本批未发现新的 core tool 名字。
