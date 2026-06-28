# Uncertainty · coding-agent keybindings

- [U] `index.json` node `subsys.coding-agent.keybindings` lists symbols `DEFAULT_APP_KEYBINDINGS` and `DEFAULT_EDITOR_KEYBINDINGS`, and `conventions.md` section 7 also names those as keybinding ground-truth symbols. At pi HEAD `5a073885`, `packages/coding-agent/src/core/keybindings.ts` instead exports `KEYBINDINGS`, `migrateKeybindingsConfig`, `KeybindingsManager`, and type re-exports; neither planned symbol appears in the source. The node frontmatter uses current source symbols and the body calls out the mismatch rather than editing `index.json`.
