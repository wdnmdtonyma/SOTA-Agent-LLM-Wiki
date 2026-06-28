# uncertainty · spine.layered-architecture

本轮未发现必须上报到全局 `reference/uncertainty.md` 的 `[U]`。

## 降级为 `[I]` 的推断

- `pi-agent-core` 的可复用边界不包含 `pi-coding-agent` 的 CLI mode、settings manager、resource loader 或 extension runner: 由 `packages/agent/src/index.ts` 的 public exports 与 `packages/coding-agent/src/core/agent-session.ts` 的 product imports/config 对照推出。
- `AgentSession` 围绕 reusable `Agent` 增加 session persistence、extensions、auto-compaction 和 retry handling: 由构造器订阅 core `Agent` event、安装 tool hooks、事件持久化和 post-run 逻辑推出。
- `pi-coding-agent` 选择和校验模型，但 provider stream 语义来自 `pi-ai`: 由 `AgentSession` 使用 `ModelRegistry` 与 `@earendil-works/pi-ai/compat` helper 推出。
- `spine.overview`、`spine.agent-loop`、`subsys.coding-agent.agent-session`、`ref.package-index` 的职责描述: 由本节点 related id 与源码边界分工推出，等待对应节点填充时交叉校验。
