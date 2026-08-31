# uncertainty-verify-request-permissions

- node: `tool.request-permissions`
- claim: Guardian V2 `fast_decision` can approve a `request_permissions` action before the V1 child reviewer runs
- why unprovable here: `Session::request_permissions_for_environment` only shows `ApprovalAction::RequestPermissions` → `request_guardian_approval` → `spawn_approval_request_review` → `run_guardian_review` (`codex-rs/core/src/guardian/review.rs:810`). Whether Guardian V2 `fast_decision` intercepts that review is in the V2 extension, not this handler.
- marked: `[I]` in `surface/tools/request-permissions.md`
