# uncertainty-tui

- `subsystems/tui/architecture.md`: OpenTUI renderer/keymap/slot registry internals live in external `@opentui/*` packages, not in `Best/opencode`; wiki can only verify how opencode calls those APIs. [U]
- `subsystems/tui/theming.md`: OpenTUI palette detection internals are external; wiki can verify `renderer.getPalette()` and TUI's ThemeJson synthesis, not the terminal probing algorithm. [U]
- `subsystems/tui/keybindings.md`: `@opentui/keymap` parser/resolver/layer internals are external; wiki can verify opencode registration and config mappings, not the library's internal conflict resolution. [U]
- `subsystems/tui/run-scrollback.md`: OpenTUI retained scrollback and markdown stable-block internals are external; wiki can verify opencode's use of `_stableBlockCount` and commitRows, not the renderer's internal layout algorithm. [U]
