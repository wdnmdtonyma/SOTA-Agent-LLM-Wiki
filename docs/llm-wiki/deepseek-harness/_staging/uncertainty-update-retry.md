# uncertainty-update-retry

- Package README 若写 retry “closes the failed turn / fresh numbered turn” 与代码冲突：`ReactLoopAgent.step` 对 `{ kind: 'retry' }` 在同一 `while` 里 `continue`（`packages/core/agent-loop/src/agent.ts:492`）；`retry.spec.ts` 只看到一条 `step/start { turn: 1, step: 1 }`（约 219）。页内 gotcha 标 `[U]`，不把 README 当 `[E]`。
- `./invariant` companion 仍不在 `dsh-base`。是否被 invariants 自动发现未核；正文不写这条 companion 为 shipped 默认树的一部分。
