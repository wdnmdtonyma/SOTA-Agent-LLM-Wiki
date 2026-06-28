# uncertainty-tui-keybinding-matching

本轮 L2 核验 `subsys.tui.keybinding-matching` 后保留 1 条 source-scope `[U]`:

- [U] `subsys.coding-agent.keybindings` 的 product-level 展开、`app.*` actions、`keybindings.json` 读取/迁移不在本节点指定 source `packages/tui/src/keys.ts` / `packages/tui/src/keybindings.ts` 内;本节点只能从 TUI source 核到 `KeybindingsManager` 可作为复用边界,具体 coding-agent 行为应在对应节点/source 中复核。
