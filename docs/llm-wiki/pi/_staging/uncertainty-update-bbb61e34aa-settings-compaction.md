# uncertainty · bbb61e34aa · settings-compaction

- `CONFIG_DIR_NAME` 的字面值不在本批次 `settings-manager.ts` 证据范围内；用户可见目录名 `.pi` 只从 `docs/settings.md` 确认。`[U]` 在 `surface.config.settings` 与 `subsys.coding-agent.settings-manager`。
- TUI markdown 的 LaTeX 渲染由 `@earendil-works/pi-tui` 的 `renderLatex` option 负责，不是 `Settings` 键。`[U]` 在 `ref.coding-agent.config-keys` 与 `surface.config.settings`。
- `terminal.showTerminalProgress` 在 `Settings` / getter 里存在，当前 `docs/settings.md` 未列此 key。`[U]` 在 `ref.coding-agent.config-keys`。
- `SettingsManager.getDefaultThinkingLevel()` 只返回 `this.settings.defaultThinkingLevel`，不读 `DEFAULT_THINKING_LEVEL`；产品层 `"medium"` fallback 的最终消费点不在本批次 source 列表内。`[U]` 在 `surface.config.settings`。
