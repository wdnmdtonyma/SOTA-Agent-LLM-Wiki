# Uncertainty staging: agent-core / exec-env

Node: `subsys.agent-core.exec-env`

L2 verifier 已逐条证伪本节点 `[E]` 的可核性、行号精度与过度推断。结论: 当前节点未留下需要同步到 `reference/uncertainty.md` 的 `[U]` 断言。

本轮修正:

- 移除正文对 `packages/agent/src/harness/types.ts` 与 `packages/agent/src/harness/utils/shell-output.ts` 的 `[E]` 依赖, 因为本 batch source 只包含 `nodejs.ts`、`node.ts`、`truncate.ts`。
- 将接口 contract、timeout contract、shell capture helper、coding-agent bash executor 等超出 source set 的表述收紧为 `nodejs.ts` / `node.ts` / `truncate.ts` 可直接证明的实现事实或边界说明。
- `subsys.agent-core.exec-env` 已置为 `status: verified`。
