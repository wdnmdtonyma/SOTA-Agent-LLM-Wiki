# uncertainty · ref.ctx-keys

- `launcherSessionQueryPath` / `SESSION_QUERY_SQLITE_PATH_KEY` 在 `packages/session-query/session-query-sqlite/src/index.ts` 声明并导出，冻结树没有任何产品 `ctx.provide` / `ctx.get` / `ctx.launcherSessionQueryPath` 读取。默认 web 用 row `config.path`。wiki 按声明收行，标「无产品 provide」。
- `configuredAgentIdentities` 只在 `agent-loop` 声明 + 测试 `provide`；`apps/cli` 不写。产品 CLI 靠 row 上的 `sessionId` / `resumeSessionId`。wiki 按声明收，标「dsh 不 provide」。
- `pluginInventory` 只有 `super(ctx, 'pluginInventory')`，没有 `interface Context` merge。Typert Remote 仍按这个服务键走。wiki 按 provide/super 收。
- 官方 `docs/capability-seams.md` 把 `ctx.terminals` / `ctx.lsp` / `ctx.e2b` / `ctx.invariants` 画进产品缝图。源码：`dsh-base` + `dsh-web-app` + shipped `standard`/`code`/`cordis` **都不**挂 terminal / lsp / e2b / invariants 行。`terminals` 只在 `minimal` 的 isolate 组。wiki 跟 yml，不把它们写成默认 `dsh web` 已装。
- 官方主表约 56 个 `ctx.*`，不含 launcher/provide-only 键（`dshHomePath` / `cmdlineArgs` / `appExit` / `webStartup` / `storage.backend.*` 等）和整张 client 表。catalog 跟源码补，不当官方遗漏去改代码。
