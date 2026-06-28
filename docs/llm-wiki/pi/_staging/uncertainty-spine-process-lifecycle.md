# uncertainty: spine.process-lifecycle

本轮未登记 `[U]`。

降级为 `[I]` 的推断：

- package/config 子命令因位于 `parseArgs` 之前且命中后 exit/return，被归类为 CLI bootstrap 分支，而不是 agent session 分支。
- Bun 入口最终 import `../cli.ts`，因此把 lifecycle 权威归到 `cli.ts` 与 `main.ts`。
