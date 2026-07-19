# Uncertainty · surface commands overview

- `BUILTIN_SLASH_COMMANDS`、catalog 与 `group.slash-commands.instance_count` 已收敛为 22 个静态内置命令；由内置 extension 动态注册的 `/llama` 单独记录，不计入该静态数组目录。
- [U] `/reload` has two visible descriptions: `packages/coding-agent/src/core/slash-commands.ts` says it reloads keybindings, extensions, skills, prompts, and themes; `packages/coding-agent/docs/usage.md` says it reloads keybindings, extensions, skills, prompts, and context files. The implementation-level reload scope should be reconciled when the slash-command catalog or reload subsystem node is filled.
- [U] `packages/coding-agent/src/modes/interactive/interactive-mode.ts` accepts `/debug`, `/arminsayshi`, and `/dementedelves`, but those branches are absent from `BUILTIN_SLASH_COMMANDS` and from the user docs Slash Commands table. This node treats `packages/coding-agent/src/core/slash-commands.ts` as the public built-in command ground truth per `conventions.md`.
