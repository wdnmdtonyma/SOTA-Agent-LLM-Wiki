# uncertainty: subsys.ai.anthropic-messages

本轮未登记 `[U]`。

保留的 `[I]`:

- `openai-prompt-cache.ts` 与 `anthropic-messages.ts` 没有直接调用关系:Anthropic adapter 的缓存实现可由 `cache_control` 相关代码证明,OpenAI helper 的行为可由独立文件证明,但“无直接参与”是基于本节点 source/import 边界的归纳。
- `message_delta` 省略 usage 字段时保留已有值:源码直接证明每个字段是 guarded assignment,保留既有值是控制流结果。
- `options.onPayload` / `options.onResponse` 的调试用途:hook 的调用点和可替换 payload / 可观察 response metadata 可由源码证明,但“用于调试或调整”的用途描述是调用方意图层面的归纳。
