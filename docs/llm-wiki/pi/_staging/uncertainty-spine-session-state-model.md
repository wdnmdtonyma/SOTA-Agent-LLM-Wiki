# Uncertainty staging: spine.session-state-model

- [U] `pi-agent-core` 的 `Session`/`SessionStorage`/`AgentHarness` 与 `pi-coding-agent` 的 `SessionManager` 当前并存，源码可证明它们不是同一个 class hierarchy；未来是否会收敛到单一 session API，本轮 source 列表与邻近调用点没有权威设计说明。
