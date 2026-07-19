# Uncertainty · surface/reference/slash-commands

batch: surface
node: `ref.coding-agent.slash-commands`
path: `reference/slash-commands.md`
updated: `3da591ab`

## Group count

- `BUILTIN_SLASH_COMMANDS`、catalog 与 index 已统一为 22 个实例。

## Index source scope

- 实际 source set 已同步到 index。

## [U] runtime-only slash branches

- `packages/coding-agent/src/modes/interactive/interactive-mode.ts` 直接 dispatch `/debug`, `/arminsayshi`, `/dementedelves`,但这三个名字不在 `BUILTIN_SLASH_COMMANDS` catalog,也不在 `packages/coding-agent/docs/usage.md` 的 slash command 表中。
- 本轮按 `packages/coding-agent/src/core/slash-commands.ts` 作为 catalog ground truth,没有把这些 runtime-only 分支计入 22 个内置 slash command 实例。是否应另建“debug/internal commands”节点或把它们暴露到 catalog,需要后续产品口径确认。
