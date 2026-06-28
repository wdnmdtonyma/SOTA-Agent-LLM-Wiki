# Uncertainty: surface/reference/default-keybindings

- `group.keybindings.instance_count` in `docs/llm-wiki/pi/index.json` is `55`, while current source expands to 72 default keybinding instances: 31 from `packages/tui/src/keybindings.ts` `TUI_KEYBINDINGS` plus 41 `app.*` actions declared in `packages/coding-agent/src/core/keybindings.ts` `AppKeybindings` / `KEYBINDINGS`. [U]
- The planned node symbols in `index.json` are `DEFAULT_APP_KEYBINDINGS` and `DEFAULT_EDITOR_KEYBINDINGS`, but current source exports `KEYBINDINGS`, imports/spreads `TUI_KEYBINDINGS`, and declares `AppKeybindings`; no `DEFAULT_APP_KEYBINDINGS` or `DEFAULT_EDITOR_KEYBINDINGS` symbol exists in the current keybindings source. [U]
- The planned node source list omits `packages/tui/src/keybindings.ts`, but `KEYBINDINGS` includes TUI defaults by spreading `TUI_KEYBINDINGS`; the catalog node therefore cites the TUI file directly to keep every `tui.*` row evidence-backed. [U]
