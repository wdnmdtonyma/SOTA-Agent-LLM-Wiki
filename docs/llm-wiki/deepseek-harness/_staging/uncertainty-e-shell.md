# uncertainty · subsys.execution.shell

- **官方 README 与代码冲突（namespace 名）。** `packages/shell/shell/README.md` / `README.zh.md` 写 `SHELL_SETTINGS_NAMESPACE`（`bash`）。源码是 `settingsNamespace('shell')`（`packages/shell/shell/src/index.ts`）。wiki 跟代码：品牌串是 `shell`。
- **YAML / 事后分析仍写 `DSH_WEB_MODE`。** `packages/bundle/web-app/cordis.patch.yml` 与 shipped preset 头注释、`docs/postmortem/0003-web-agent-gui-feedback-loop.md` 并列 `$DSH_WEB_URL` / `$DSH_WEB_MODE`。`packages/bundle/web-app/src/index.ts` 的 `web-runtime` contributor 只 `register` `DSH_WEB_URL`。wiki 只写源码里存在的那一个。
