# uncertainty-update-086c32e745-tui-latex-search

batch: tui latex / alt-screen-search / keybinding-actions / alternate-screen / runtime
updated: 086c32e745

本轮未登记 `[U]`。

保留为 `[I]` 的边界：

- `renderLatex` 是终端近似排版、不是 TeX；嵌套分数保持线性，属于实现选择而非完整 math mode 语义。
- `TUI.mode` 不能原地改写；coding-agent `InteractiveMode.switchTuiMode` 走 `stop({ preserveScreen })` + 重建 renderer，该调度不在 `packages/tui/src/tui.ts` 内，runtime 节点只标 `[I]`。
- 未注入 `copySelection` 时 OSC 52 写入后总是 flash `Copied!`，终端是否真正进剪贴板无法从 tui 源码自证。
- `tui.editor.yank` / `yankPop` 的 kill-ring 语义仍按 description 归纳，未在本 catalog 展开 editor 实现。

未写入 index.json / llms.txt（按 filler 任务约束）。新节点 `subsys.tui.latex`、`subsys.tui.alt-screen-search` 需后续 reconcile 才能被 lint 认进图。
