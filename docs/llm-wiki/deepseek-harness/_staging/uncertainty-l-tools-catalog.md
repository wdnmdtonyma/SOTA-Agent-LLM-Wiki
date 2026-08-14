# uncertainty · ref.tools-catalog

- 官方 `docs/tool-catalog.md` 对 `@deepseek-ai/dsh-tool-cordis` 写 “Not in any shipped tree”。冻结树 `apps/cli/config/agent-presets/cordis/agent.cordis.yml` 有 `id: tool-cordis` / `name: '@deepseek-ai/dsh-tool-cordis'`。wiki 跟四个 `agent.cordis.yml`，不跟官方 deployment note。
- 官方 tool-web 节按包默认 Config（`fetch: true`）列出 `web_fetch`。`standard` / `code` / `cordis` 三份 yml 都写 `config.fetch: false`，`apply` 因此不调用 `applyWebFetchTool`。wiki 把 shipped 列标成「包装·fetch关」，不把出厂 Web 产品写成模型看得到 `web_fetch`。
- 官方 `list_agents` 行写 Requires `ctx.sessionProjections`。源码 `packages/subagent/tool-subagent-control/src/list-agents.ts` 的 `inject` 是 `['tools', 'subagents', 'agents']`，文件内无 `sessionProjections`。wiki 跟 `inject`。
