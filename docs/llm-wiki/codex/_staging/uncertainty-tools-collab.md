# [U] tools-collab — `9ded177ce7`

- [U] MCP tool catalog cache 可以把 `ToolInfo`（含 `namespace_description`）在 exact ready client 之前发布给后续 thread；但 model-visible tool advertisement 与 resource all-server list 是否永远排除 “cached-only / no ready client” 的 server，现有 `tool_catalog.rs` / `binding.rs` 分叉还不足以写成单一稳定契约。
- [U] `McpToolCatalogCache` 在 HTTP headers helper 或 remote-sourced environment variables 时会被 bypass；这些 bypass 路径是否仍保证 namespace description 字节级不变，不能从 cache happy path 外推。
- [U] V2 leaf worker（子 agent 且 `model_info.multi_agent_version != Some(V2)`）不会注册 collaboration tools，但目标模型 catalog 若漏标 `multi_agent_version`，实际会不会被误判成 leaf，取决于 catalog 数据而不是 core 默认。
- [U] catalog 来源的 `<multi_agent_role>` / world-state `multi_agent_usage_hint` 在 paginated history、remote compact 与 rollback 之后是否总能只出现一次、且不把父角色说明泄漏给 child，当前只证明了 full-history fork 会 filter/remove，不能外推所有 history mode。
- [U] imagegen 返回的 `FunctionCallOutput` `input_image` 会进入 session `prepare_response_items`；`unified_image_budget` / `image_resize_notice` 对 generated image 的最终尺寸、notice 文案和 Responses Lite 表现，还受模型 original-detail 能力与 provider 路径约束，不能从 imagegen handler 单独推出。
- [U] `request_plugin_install` 发出的 `PluginInstallRequested` / `record_plugin_install_suggestion` 与 `core-plugins` 的 `PluginMetricsSidecar` 是两条独立度量面；sidecar 何时绑定到某次 install 请求，当前工具路径没有给出闭合证据。
