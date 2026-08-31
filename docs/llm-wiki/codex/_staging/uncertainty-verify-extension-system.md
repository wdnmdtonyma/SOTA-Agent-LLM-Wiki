# L2 verify: spine.extension-system

- claim: `codex-rs/ext/guardian-v2` does not depend on `codex-guardian-context`; scorer still uses `async_scorer/transcript.rs`.
- why [I]: absence of a Cargo dependency is not a single asserted source line. `ext/guardian-v2/Cargo.toml` `[dependencies]` (lines 16–33) lists `codex-api` … `uuid` and does not name `codex-guardian-context`; confirming the scorer still uses crate-local `async_scorer/transcript.rs` requires that module, not the workspace `guardian-context` crate.
- node: `spine.extension-system`
