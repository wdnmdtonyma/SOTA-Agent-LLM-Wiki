# uncertainty-update-workspace-dependencies

- 「四个 shipped web preset 不挂本包」来自对 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml` 的全文检索（无 `tool-workspace-dependencies` / `load_workspace_dependencies`），标 `[I]`。
- 本工具不走 `ctx.approval` / `ctx.sandbox`：`defineTool` 无 `ask`、execute 不读这两条 seam。标 `[I]`。
