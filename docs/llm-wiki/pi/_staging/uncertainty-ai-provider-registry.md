# uncertainty-ai-provider-registry

本轮填充 `subsys.ai.provider-registry` 新增 1 条 `[U]`:

- `docs/llm-wiki/pi/index.json` 里 `group.providers.instance_count` 与 `ref.ai.provider-catalog` 标题仍暗示约 38 个 provider, 但当前源码 ground truth `packages/ai/src/providers/all.ts` 的 `builtinProviders()` 只返回 35 个 factory call；`packages/ai/src/models.generated.ts` 的 generated provider key 数也为 35。按 conventions 第 7 节, 本节点采用 `builtinProviders()` 的 35 作为当前事实, catalog/index 计数留待后续专门 reconcile。

降级为 `[I]` 的主要结论:

- `builtinProviders()` 每次调用构造 fresh provider instances: 源码显示直接调用 factories, 但“fresh”语义跨入各 provider factory 的实现。
- `builtinProviders()` 与 generated `MODELS` 当前数量一致不构成 API 契约: 这是本轮人工对照, 源码没有写同步不变量。
- provider catalog 应以 `builtinProviders()` 做 membership, 以 generated model catalog 做 cross-check: 这是 conventions ground-truth 约定加当前代码结构推出。
