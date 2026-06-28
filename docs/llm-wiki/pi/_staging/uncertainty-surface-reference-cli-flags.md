# uncertainty: ref.coding-agent.cli-flags

- [U] `printHelp()` 在 `packages/coding-agent/src/cli/args.ts` 中展示 command-specific `[-l]` 和 `--all` 提示,但 `parseArgs()` 没有为这些 token 建立全局 `Args` 字段。本节点按用户要求以 `cli/args.ts` 为 catalog ground truth,只把它们标为 help-only 边界;实际 command handler 行为需要另到 package-manager CLI / command dispatcher 节点核对。

本轮按用户约束只写 `docs/llm-wiki/pi/reference/cli-flags.md` 和本 staging 文件,没有修改 `docs/llm-wiki/pi/index.json`。
