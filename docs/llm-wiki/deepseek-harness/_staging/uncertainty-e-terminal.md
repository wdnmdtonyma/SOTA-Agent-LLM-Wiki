# uncertainty · subsys.execution.terminal

- **官方 README 与代码冲突（inject 键名）。** `packages/terminal/terminal-bash/README.md` / `README.zh.md` 写插件 inject `pty`、`sandboxPolicy`、`subprocess`。可加载源是 `export const inject = ['terminals', 'sandboxPolicy', 'subprocess']`（`packages/terminal/terminal-bash/src/index.ts`），Loader 单测钉死同一数组（`packages/terminal/terminal-bash/tests/index.spec.ts`）。wiki 跟代码：键名是 `terminals`。`pty` 只是 `minimal` / E2B overlay 里那一行的 yml `id`，不是 Cordis service 名。
