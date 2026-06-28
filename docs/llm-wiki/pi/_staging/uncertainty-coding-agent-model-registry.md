# uncertainty-coding-agent-model-registry

本轮填充 `subsys.coding-agent.model-registry` 新增 1 条 `[U]`:

- `AuthStorage.getAuthStatus()` 在命中 `runtimeOverrides` 时返回 `{ configured: false, source: "runtime", label: "--api-key" }`; `ModelRegistry.getProviderAuthStatus()` 会直接返回这个状态。源码能证明该返回值, 但本节点没有继续追 UI/CLI 对 `configured=false + source=runtime` 的解释, 所以“不把 runtime key 视为 configured”是否为有意语义暂存为 `[U]`。

降级为 `[I]` 的主要结论:

- `modelRequestHeaders` 把 `models.json` / dynamic provider 的 headers 留到 request-time resolution, likely 是为了避免把 unresolved secret-bearing header templates 暴露在 `Model<Api>` metadata 里；源码能证明存储与合并路径, 但没有写设计说明。
- `getAvailable()` 是 fast availability filter 而非最终 request-auth proof；源码能证明它只调用 `hasConfiguredAuth()`, 但“proof”这个边界是由后续 `getApiKeyAndHeaders()` 可能失败推出来的。
- 当前 `ModelRegistry` 像是 coding-agent 的 product-level compatibility/assembly layer over compat imports, 而 `packages/ai/src/models.ts` owns newer provider stream/auth contracts；这是由 import/call graph 推断, 不是源码注释中的正式架构声明。
- `authHeader: true` 同时返回 `apiKey` 并写入 `Authorization` header, downstream 是否使用两者取决于调用路径和 wire API, 本节点只记录 registry result shape。
