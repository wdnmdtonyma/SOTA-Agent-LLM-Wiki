# uncertainty-update-run-code

- `auditRows` 只扫 `fiber.inject`（静态 inject）。`tool-presentation` 静态 `inject = ['tools']`，`ptcRuntime` 是 `apply` 里动态 `ctx.inject(['ptcRuntime'])`。因此缺 runtime 时这条行不会出现在 `auditRows.pending` 的 waiting 列表里；装配仍保持 native。JSDoc / 测试注释写「fails at mount / 审计点名该行」是设计意图，执行路径未用静态 inject 卡住整棵 fiber。见 `packages/preset/agent-preset-registry/src/mount.ts:206` 与 `packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111`。
