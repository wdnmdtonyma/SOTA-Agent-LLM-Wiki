# Uncertainty · surface/reference/slash-commands

batch: surface
node: `ref.coding-agent.slash-commands`
path: `reference/slash-commands.md`
updated: `5a073885`

## [U] group count drift

- `index.json` 当前 `group.slash-commands.instance_count` 写作 `21`,但 `packages/coding-agent/src/core/slash-commands.ts` 的 `BUILTIN_SLASH_COMMANDS` 枚举为 22 个实例: `settings`, `model`, `scoped-models`, `export`, `import`, `share`, `copy`, `name`, `session`, `changelog`, `hotkeys`, `fork`, `clone`, `tree`, `trust`, `login`, `logout`, `new`, `compact`, `resume`, `reload`, `quit`.
- 本轮按用户约束不改 `docs/llm-wiki/pi/index.json`;主节点按源码 catalog 写 22 个实例并已标记 `status: verified`,但 index group 计数仍需后续单独 reconcile。

## [U] index source scope drift

- `docs/llm-wiki/pi/index.json` 中 `ref.coding-agent.slash-commands.source` 仍只有 `packages/coding-agent/src/core/slash-commands.ts` 和 `packages/coding-agent/docs/usage.md`,但本节点为了核验交互 dispatch、handler 行为、动态命令来源和 RPC `get_commands` 边界,实际引用了 `interactive-mode.ts`、`agent-session.ts`、`extensions/runner.ts`、`prompt-templates.ts`、`rpc-mode.ts`。本轮不改 index;后续应补 index source 或把节点范围收窄为纯 catalog+usage。

## [U] runtime-only slash branches

- `packages/coding-agent/src/modes/interactive/interactive-mode.ts` 直接 dispatch `/debug`, `/arminsayshi`, `/dementedelves`,但这三个名字不在 `BUILTIN_SLASH_COMMANDS` catalog,也不在 `packages/coding-agent/docs/usage.md` 的 slash command 表中。
- 本轮按 `packages/coding-agent/src/core/slash-commands.ts` 作为 catalog ground truth,没有把这些 runtime-only 分支计入 22 个内置 slash command 实例。是否应另建“debug/internal commands”节点或把它们暴露到 catalog,需要后续产品口径确认。
