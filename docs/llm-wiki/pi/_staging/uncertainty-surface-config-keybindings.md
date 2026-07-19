# Uncertainty · surface config keybindings

- 节点 source/symbols 已与当前 `KEYBINDINGS`、`KeybindingsManager`、TUI key grammar、config resolution 和 interactive injection 证据同步；默认键位目录及 group 计数也已 reconcile。没有遗留 metadata/count `[U]`。
- [U] `packages/coding-agent/docs/keybindings.md` documents `ctrl`, `shift`, and `alt` as user-facing modifiers, but `packages/tui/src/keys.ts` also includes `super` in the `KeyId` type and `MODIFIERS` table. This node treats `super` as not-yet-confirmed user-facing surface rather than a documented config promise.
