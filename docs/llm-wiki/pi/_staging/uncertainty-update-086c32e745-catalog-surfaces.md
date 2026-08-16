# update-086c32e745 catalog/surface

- `[U]` `Settings` / `docs/settings.md` 没有 `markdown.latex` 键。LaTeX 由 `@earendil-works/pi-tui` 的 `renderLatex` 与 markdown `renderLatex` option 负责;catalog 未把它计为 settings instance。
- `[U]` `terminal.showTerminalProgress` 仍在 `Settings`/`SettingsManager` 中,但当前 `docs/settings.md` 未列此 key。
- `[U]` `interactive-mode.ts` 仍直接处理 `/debug`、`/arminsayshi`、`/dementedelves`;它们不在 `BUILTIN_SLASH_COMMANDS` 或 `usage.md` 表中,本轮 slash catalog 仍不计这三项。
- `[I]` `defaultTools` 只选择初始 built-in active set;extension/SDK custom tools 的保留是由 `allowedToolNames`/`_refreshToolRegistry` 控制,不是 settings schema 自己保证。
- `[I]` `message_update` 的内部 `AgentSessionEvent` 仍携带 cumulative `message`;JSON/RPC stdout 的 breaking 发生在 `toJsonEvent()` 边界。
