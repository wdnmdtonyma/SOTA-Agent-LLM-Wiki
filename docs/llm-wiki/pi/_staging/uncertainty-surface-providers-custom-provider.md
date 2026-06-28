# uncertainty: surface.providers.custom-provider

本轮按 `index.json` 的 source 核验,只承认以下 3 个文件作为本节点 `[E]` 来源:

- `packages/coding-agent/docs/custom-provider.md`
- `packages/coding-agent/docs/models.md`
- `packages/coding-agent/src/core/extensions/types.ts`

新增 `[U]`:

- `ExtensionRuntimeState` 的实际类型行只能证明存在 `pendingProviderRegistrations` 与 runtime-level register/unregister hooks;bind 前 queued、bind 后调用 `ModelRegistry` 的语义来自相邻类型注释,本轮不作为 `[E]` 锚点。index source 不能确认 `AgentSession` 是否在动态 provider 注册/注销后刷新当前已选模型视图。原节点对 `_refreshCurrentModelFromRegistry()` 的逐行断言依赖 `packages/coding-agent/src/core/agent-session.ts`,不属于 index source。

保留为 `[I]` 的主要结论:

- “只是 base URL、headers、模型列表和已支持 API 类型的组合时优先使用 `models.json`;需要 `/login` 集成、动态模型发现或新 streaming implementation 时使用扩展注册”: 这是 `docs/models.md` 与 `docs/custom-provider.md` 的入口边界共同推出,不是源码里单行声明的硬规则。
- `apiKey` 与 header value 复用 `models.json` config value 语法,因此扩展 provider 与 `models.json` provider 在 secret/reference 表达上保持一致: docs 明确说语法相同,但“保持一致”是作者层面的归纳。
- `models.json` custom model 与扩展 `ProviderConfig` 对 auth 的要求有差异: `docs/models.md` 允许通过 `/login`、`auth.json` 或 CLI `--api-key` 使模型可用,而 `ProviderConfig.apiKey` 注释写着定义 models 时需要 API key,除非提供 oauth;“差异”是二者对比得出的结论。
- wire protocol 的源码目录、lazy wrapper、dynamic API registry 重放等实现细节本轮不作为本节点 `[E]` 展开;它们应由 `ref.ai.wire-protocol-catalog` 或 `subsys.coding-agent.model-registry` 覆盖。
