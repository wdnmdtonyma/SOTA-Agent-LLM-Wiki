# uncertainty · ref.capability-seams

官方 `docs/capability-seams.md`（`scripts/gen-doc-graphs.ts` 的 `SERVICE_ROLES`）与冻结源码的漂移；wiki 跟代码。

- `ctx.lsp` implementations 写成 `lsp-local`。`packages/lsp/` 只有 `lsp` / `lsp-stdio` / `tool-lsp`，npm 名 `@deepseek-ai/dsh-lsp-stdio`。
- `ctx.codeRuntime` implementations 写成 `code-runtime-worker`。真实包是 `@deepseek-ai/dsh-code-runtime-worker-thread`（web-app / headless 插入行）。
- `ctx.shell` implementations 列出 `bash-local` / `bash-sandbox` / `pwsh-local`，漏了 base 默认 win32 行 `@deepseek-ai/dsh-pwsh-sandbox`。
- `ctx.attachments` consumers 写 `host-runtime`。冻结树无此包；`inject`/`ctx.attachments` 落在 `dsh-host-apiproxy`、`dsh-llm-pi-ai`、`dsh-tool-fs`（`read_image`）。
- `ctx.approval` implementations 写 `acp`。`ApprovalService` 自己 `super(ctx, 'approval')`；ACP 是 `approval/request` waterfall 应答者，不占该键。
- `ctx.pluginInventory`（`PluginInventoryGateway` / web-app `plugin-inventory`）是真实 `super(ctx, 'pluginInventory')`，官方 `svc_*` 表没收。
- `storageDomain` 用 `ctx.provide` 挂 `DomainFacility`，不是 `Service.super`。官方仍画 `svc_storageDomain`，本页按 provide 行落地。
