# uncertainty-update-run-code

- `inactiveRows` 只扫 `fiber.inject`（静态 inject）。`tool-presentation` 静态 `inject = ['tools']`，`codeRuntime` 是 `apply` 里动态 `ctx.inject`。因此缺 runtime 时这条行不会出现在 `inactiveRows` 的 waiting 列表里；装配仍保持 native。JSDoc 写「fails at mount」是设计意图，执行路径未用静态 inject 卡住整棵 fiber。见 `packages/preset/agent-presets/src/mount.ts:316` 与 `packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111`。
