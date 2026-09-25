# uncertainty-update-ff72faba28-l2-protocol

batch: ff72faba28 L2 protocol / stream / chord / html-export / read
nodes: spine.provider-stream, subsys.ai.wire-protocol-dispatch, subsys.ai.anthropic-messages, subsys.ai.openai-responses, surface.providers.custom-provider, subsys.chord.delta, subsys.coding-agent.html-export, surface.tools.read, ref.glossary, ref.ai.wire-protocol-catalog
updated: ff72faba28
status: verified

L2 独立证伪后仍不能升成 `[E]` 的点。节点本身保持 `status: verified`。

## [U] 扩展 register/unregister 后当前模型视图

- 节点: `surface.providers.custom-provider`
- `ExtensionRuntimeState` 能确认 pending queue、bind 后的 `registerProvider` / `registerNativeProvider` / `unregisterProvider` 方法。
- 本节点 source 不含 `agent-session.ts`，不能确认 AgentSession 是否在注册/注销后刷新当前已选模型。

## [U] OpenAI Responses service-tier 乘数不是远端价表

- 节点: `subsys.ai.openai-responses`
- `flex` ×0.5、`priority` 对 `gpt-5.5` ×2.5、其它 priority ×2 是本地硬编码。价格表变化是否要同步更新，这两个源码文件不能证明。
