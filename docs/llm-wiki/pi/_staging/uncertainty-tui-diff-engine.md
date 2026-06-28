# uncertainty: tui diff-engine

- `subsys.tui.diff-engine` 的 `symbols` 包含 `normalizeTerminalOutput`，但该函数定义在 `packages/tui/src/utils.ts`，而本节点 index/source 只列 `packages/tui/src/tui.ts` 和 `packages/tui/src/terminal.ts`。本轮主文只覆盖 `tui.ts` 中的 import/call site，把定义归属标为 [U]；后续可选择把 `packages/tui/src/utils.ts` 加入该节点 source，或把 `normalizeTerminalOutput` 移到覆盖 utils 的节点。
