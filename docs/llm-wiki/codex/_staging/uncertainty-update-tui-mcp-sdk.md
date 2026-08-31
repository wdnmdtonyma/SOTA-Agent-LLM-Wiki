# Uncertainty — tui-mcp-sdk @ a9519cbcdd

本批次更新已有节点，不写 `reference/uncertainty.md`。

## 残留 `[U]`

- [U] MCP prewarm 是 bounded best-effort 启动优化；step path 的 refresh/capture 才是正确性屏障，不能把 prewarm 完成当成 binding 已冻结。(`subsys.mcp.client`)
- [U] system proxy 支持受 feature/platform 与 application-resolved policy 控制；存在代码路径不代表所有构建默认启用。(`subsys.providers.http-client`)
- [U] dynamic skill selector 仍是 shadow-selection path，不能写成已成为稳定的用户可见选择协议。(`subsys.config-auth.skills`)
- [U] pending environment attachment 与 per-environment permission profile snapshot 的完整跨 thread 契约未在本节点逐字段核完。(`subsys.config-auth.auth-flows`)

`subsys.exec-sandbox.exec-server` 的 Ask/UI `[U]` 不在本批次（shell-exec）。

## 专项已核、不是 `[U]`

- MCP server 名 charset 已放宽为 `^[a-zA-Z0-9_:@/.-]+$`（package-style）；tool 名仍走 `sanitize_responses_api_tool_name`。
- `omit_app_server_notification_media` 只剥 `ItemStarted` / `ItemCompleted` / `RawResponseItemCompleted` 的 inline media；`LocalImage`/`LocalAudio` 保留。
- TUI keymap 12 contexts（含 `vim_search` / `agents`）；rate-limit 75/90/95 + backend banner 分层；model picker `on_models_loaded` in-place refresh。
- Windows private desktop / deny-read walker 在 sandbox crate；PowerShell 版本探测在 `environment.rs`，不在 sandbox crate。
