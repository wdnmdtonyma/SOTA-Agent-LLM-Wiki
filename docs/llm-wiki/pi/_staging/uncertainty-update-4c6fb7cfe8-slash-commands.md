# uncertainty · slash-commands (4c6fb7cfe8)

- [U] `packages/coding-agent/src/modes/interactive/interactive-mode.ts` 的 submit handler 仍直接处理 `/debug`、`/arminsayshi`、`/dementedelves`，但这三个名字不在 `BUILTIN_SLASH_COMMANDS` 也不在 `docs/slash-commands.md`。本轮 catalog 按 `BUILTIN_SLASH_COMMANDS` 计 24，不把它们算作公开内置命令。
