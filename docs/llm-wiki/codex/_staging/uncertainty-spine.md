# Uncertainty — spine (`9ded177ce7`)

Assigned pages have no remaining `[U]`. The items below are `[I]` inferences that still hold after the rewrite, plus one catalog-policy detail that is not fully closed by spine-level sources.

## Remaining `[I]`

- `spine.overview` / `spine.turn-end-to-end`: `executed_tool_calls.attach_pending_to_prompt` 只附加 warehouse metadata 并做 request bound，不改变 model-visible tool list。这是从 attach/bound 调用点推断的；warehouse recorder 的完整语义在 tool-system 节点。
- `spine.sq-eq-architecture`: `ThreadQueueChanged` 来自 `ext/queue` 的 durable per-thread 队列，不是 `Submission.op` payload 本身。spine 只核到 `EventMsg` 变体与 host 安装点，队列 mutation RPC 细节留给 thread-queue 节点。
- `spine.process-lifecycle`: process → turn 的边界是 `Session`/`SessionIo` 已就绪；一次 user turn 的细节属于 `spine.turn-end-to-end`。这是分层约定，不是单一函数返回值。
- `spine.context-and-compaction`: remote compact 把当前 model-visible tool specs 放进 prompt，local compact 用 `Prompt { ..Default::default() }` 因此不带 tool specs。local 路径没有显式 `tools:` 字段，但是否永远为空依赖 `Prompt` 的 Default。
- `spine.trace-mcp-call`: call-time `prepare_mcp_call` 权威、revision guard 只覆盖 prepare→send 窗口、MCP approval 不走 `ToolOrchestrator`、resource list 对缺失 captured client 会回退 live connection set。这些是从调用结构推断的产品语义，不是单独的 policy 文档。

## Not marked `[U]`, but do not over-read

- Guardian V2 的 risk classification / high-risk auto-review 细节属于独立 crate `ext/guardian-v2`，spine 只记录 reviewer 工具面与 host 安装点。
- Thread queue 的 6 个 RPC 与持久化模型属于 `ext/queue` + app-server methods，spine 只记录 `ThreadQueueChanged` 事件与 host install。
- `apply_patch_preserve_line_endings` 仍是 UnderDevelopment / default-off；不要写成稳定默认行为。
