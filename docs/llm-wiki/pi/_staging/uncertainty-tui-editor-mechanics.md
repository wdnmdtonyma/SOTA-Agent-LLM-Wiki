# uncertainty: subsys.tui.editor-mechanics

node: subsys.tui.editor-mechanics

- [U] `PUNCTUATION_REGEX.exec()` in `findWordForward()` may be affected by regex `lastIndex` if the imported regex has a global/sticky flag; this node did not expand `packages/tui/src/utils.ts`, because the assigned source set is limited to `kill-ring.ts`, `undo-stack.ts`, and `word-navigation.ts`.
