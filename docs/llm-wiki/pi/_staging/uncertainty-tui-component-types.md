# uncertainty-tui-component-types

- `ref.tui.component-types` 本轮 L2 只允许采信 `packages/tui/src/components/` 和 `packages/tui/src/index.ts`;原文关于 `Component` / `Focusable` runtime protocol 的证据来自 `packages/tui/src/tui.ts`,已从本节点硬 `[E]` 结论降级。该 protocol 语义应在允许引用 `tui.ts` 的节点(如 `subsys.tui.component-model`)中核验后再收敛。
