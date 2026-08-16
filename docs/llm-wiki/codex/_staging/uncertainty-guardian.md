# Uncertainty — guardian batch (`9ded177ce7`)

## Remaining [U]

- [U] 非 app-server host（直接 spawn `Session` 的 TUI/CLI/test）是否会间接走到 `thread_extensions()`：源码里 `codex_guardian_v2::install` 只有 app-server 一处调用；若某 host 不经过该装配，V2 classifier / 短路径不会出现。未把每个 host 的 extension wiring 逐一走完。
- [U] 生产 `ApprovalReviewContributor` 列表是否永远只有 V2：非 test 实现目前只看到 `GuardianV2Extension`，但不能排除未来/动态注册的其他 contributor 插在它前面。

## Not [U] after verification

- V2 不 spawn child Codex；高风险是不 claim 而不是 V2 deny。
- V1 reviewer 用 `empty_extension_registry()` 且 disable `Feature::GuardianV2`。
- `request_permissions` 走共享 `ApprovalAction::RequestPermissions` → `request_guardian_approval`。
- `Feature::UnifiedExec` `default_enabled: true`，无 Windows 例外。
