# guardian-tools 批次残留 uncertainty

对照 target `a9519cbcdd`。下列事实已在节点正文写明，但整条链路尚未完全落地，故标为残留 `[U]` / 未接线：

1. **`codex-guardian-context` 尚未被 V2 消费。** crate 已在 workspace（`codex-rs/guardian-context/`），声明 `ContextTarget::{Sync,Async}`、`SectionRegistry`、`collect_transcript`。`ext/guardian-v2` Cargo.toml 未依赖该 crate；`async_scorer` 仍用自己的 `transcript.rs`。wiki 按现状写，不假装已 `use`。

2. **`sync_reviewer::build_review_prompt` 在非 test 构建标 `dead_code`（“wired by a subsequent PR”）。** 完整同步审查仍走 V1 `core/src/guardian`。V2 reviewer 目前只注册 thread context / `prepare_reviewer_options`。

3. **TUI / exec 经 app-server 继承 registry 的具体调用行号本轮未重核。** 生产 `codex_guardian_v2::install` 只在 app-server `thread_extensions`；MCP server 与 `empty_extension_registry()`（含 V1 reviewer）不自己 install V2。TUI/exec 是否仍经 embedded/remote app-server 拿同一份 registry，未在本轮逐行核对。
