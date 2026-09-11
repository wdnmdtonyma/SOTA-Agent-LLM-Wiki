# L2 verify: core-drift (02a8f038b8)

Out of batch (not edited): `subsys.core.approval-guardian-v2` still says guardian turns can attach read-only `history.*` extension tools. Source `spec_plan.rs` skips `append_extension_tool_executors` for `is_basic_session_source`, and `internal_guardian_sessions_exclude_optional_core_tools` asserts only `exec_command` / `write_stdin` / `view_image`. Fixed in `spine.extension-system` this batch.

No remaining [U] inside the eight core-drift nodes after in-place [E] retargets.
