# Uncertainty — L2 verifier CoreB (`a9519cbcdd`)

Pages: `ghost-undo`, `rollout-persistence`, `state-db`, `thread-store`, `trace-bundle`, `code-mode-runtime`, `rollout-budget`, `token-budget`, `turn-metadata`, `approval-guardian-v2`, `rollout-migration`, `thread-queue`, `history-notes`.

## Remaining [U]

- [U] `subsys.core.thread-store`: multi-segment lineage page/materialization still has a strict boundary; the source does not prove that arbitrary incremental item replay of inherited history is supported.
- [U] `subsys.core.thread-store`: first-party app-server / TUI paths currently have no production call to `reserve_thread_id` + `stage_pending_thread_metadata`; visible usage is in core integration tests.

## Not [U] after verification

- Ghost/undo runtime is retired: `Feature::GhostCommit` key `undo` is `Stage::Removed`; legacy `ghost_snapshot` items deserialize as `ResponseItem::Other`; `Op::ThreadRollback` is deleted. Paginated disk-safe revert is app-server `thread/revert` and does not revert workspace file edits.
- Guardian V2 source lives under `async_scorer/*` + `sync_reviewer/*` + `guardian-context`; crate-root `config.rs` is gone. `codex-guardian-v2` does not depend on `codex-guardian-context`.
- History notes expose 9 namespace tools (`history.*` 4 + `notes.*` 5), `ToolExposure::DirectModelOnly`, notes file contract ≤ 1,000,000 UTF-8 bytes.
- Code Mode is a standalone host/runtime (`code-mode-runtime` / process-owned host). Core installs `ProcessOwnedCodeModeSessionProvider` or `DisabledCodeModeSessionProvider`; there is no in-process V8 fallback and no fallback to shell.
