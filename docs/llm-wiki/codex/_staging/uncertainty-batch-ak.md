## subsys.mcp.connectors

- [U] `subsystems/mcp/connectors.md`: prior node text asserted originator-specific hard-disallow lists inside `codex-rs/connectors/src/filter.rs`. At `db887d03e1`, `filter_tool_suggest_discoverable_connectors` only removes already-accessible connectors, intersects configured discoverable ids, and sorts results; no equivalent originator/hard-disallow branch was found in `codex-rs/connectors/src/filter.rs`.
