# uncertainty-update · execution refresh (fs/shell/sandbox/lsp)

- **SSH 不在 shipped overlay**：`packages/bundle/**/cordis.patch.yml` 与 `packages/bundle/web-app/presets/*.patch.yml` 无 `dsh-ssh` / `fs-ssh` / `subprocess-ssh` / `sandbox-ssh` 字符串，标 `[I]`（与 `subsys.execution.ssh` 一致）。live e2e 缺 `DSH_SSH_TEST_CONFIG` 则 skip。
- **`SHELL_SETTINGS_NAMESPACE` 已从 TS 删除。** `packages/shell/shell/src/index.ts` 不再导出该常量；预算走各 executor `Config` 的 volatile `.get()` + Loader 热更新（`bash-local/tests/settings.spec.ts` 的 `liveConfig`）。README 仍提旧名，不当 `[E]`。
- **bash-sandbox helpers 重导出 vs pwsh-sandbox 本地副本。** `dsh-bash-sandbox/src/helpers.ts` 把 `isRunnerSpawnFailure` 从 `@deepseek-ai/dsh-sandbox` 重导出；`dsh-pwsh-sandbox/src/helpers.ts` 仍有一份本地实现。分类方言声称镜像，未做逐行 diff。
- **后台 `danger-full-access` 的 `proc.sandbox`。** 统一 `execute` 之后，满权路径 decorate 的是 `result()`，`onProcessDone` 在无 `processFacts` 时仍不盖 `proc.sandbox`。gotcha 保留；未把「前台/后台字段同形」写成合同。
