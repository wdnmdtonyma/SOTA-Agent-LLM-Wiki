# uncertainty: spine.trace-rpc-prompt

本轮没有保留 `[U]`。

## 降级为 `[I]` 的推断

- RPC prompt 的 queue branch 会通过 RPC subscription 暴露 queue state:源码分别证明 `_queueSteer`/`_queueFollowUp` 会 emit `queue_update`,以及 RPC mode 订阅 session events 并输出;二者合并后的端到端结论是推断。
- prompt acknowledgement 和 agent completion 是两条不同信号:源码分别证明 prompt ack 由 `preflightResult(true)` 输出、events 由 `session.subscribe(output)` 输出;“两条不同信号”是归纳性表述。
- prompt path 的 extension UI bridge 由 headless host 实现交互 UI:源码证明 RPC UI context 发 request 并等待 response;host 负责实现 UI 是协议边界推断。

- 未展开 `Agent.prompt` / `Agent.continue` 在 `pi-agent-core` 内部如何消费 provider stream 与执行 tools;该内容超出 `index.json` 给 `spine.trace-rpc-prompt` 的 source 列,本文只在 `AgentSession._runAgentPrompt` 调用边界处停住。
- 未逐字段解释所有 `AgentSessionEvent` 事件 payload;该内容应放到 `surface.modes.rpc-protocol` 或相关事件 catalog。
