### Removed tool nodes at codex 5670360009

- `tool.shell`: removed from wiki target because current `spec_plan.rs` exposes shell execution through `shell_command` or unified exec handlers; the old `tools/src/local_tool.rs` source path is gone.
- `tool.local-shell`: removed from wiki target because `ToolSpec::LocalShell` is not present in current `codex-rs/tools/src/tool_spec.rs`.
- `tool.list-dir`: removed from wiki target because no current `handlers/list_dir.rs` or list-dir registration exists under `codex-rs/core/src/tools/spec_plan.rs`.
- `tool.js-repl` and `tool.js-repl-reset`: removed from wiki target because JS REPL sources and docs are gone in current HEAD.
- `tool.tool-suggest`: removed from wiki target because plugin install suggestion is now split across `list_available_plugins_to_install` and `request_plugin_install`.
- `tool.close-agent-v2`: removed from wiki target because current MultiAgent V2 registers `interrupt_agent` and `list_agents`, while V2 `close_agent` is absent.
