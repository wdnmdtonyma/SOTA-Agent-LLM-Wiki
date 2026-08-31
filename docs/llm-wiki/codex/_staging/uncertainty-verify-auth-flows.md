# Uncertainty — L2 verify `subsys.config-auth.auth-flows`

- [U] pending environment attachment 与 per-environment permission profile snapshot 的完整跨 thread 契约未在本节点逐字段核完。本轮只核到 `CodexAuth` variants（含 `BedrockAccessKeys`）、restriction allow-list 和 refresh/external-auth 路径。
