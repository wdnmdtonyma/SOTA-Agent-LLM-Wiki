# uncertainty-update-853a80d26c-tui

batch: TUI capability / copyOnSelect / chunking / native path / autocomplete ranking / word selection
updated: 853a80d26c

本轮未新增必须升级的 `[U]`。

保留为 `[I]` / 既有 `[U]`:

- 未注入 `copySelection` 时 OSC 52 写入后总是 flash `Copied!`,终端是否真正进剪贴板无法从 tui 源码自证。
- `darwin-modifiers.node` / `win32-console-mode.node` 内部如何读 OS modifier state 仍不在 TypeScript source 中。
- `setKittyProtocolActive` 定义在 `keys.ts`;`terminal-capabilities` 按既有约定只核 `terminal.ts` 调用点。
- coding-agent changelog `#8676` 是 inherited fullscreen word selection;TUI 实现与测试在 `#7746` / `getWordSelection()`。
- 官方 `docs/terminal-setup.md` 写 settings 优先于 env,是产品接线(`getTerminalCapabilityOverrides` + `setCapabilityOverrides`),不是 TUI `detectCapabilities()` 自己读 settings。
