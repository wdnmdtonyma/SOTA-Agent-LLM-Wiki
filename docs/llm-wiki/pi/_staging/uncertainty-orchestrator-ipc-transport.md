# uncertainty-orchestrator-ipc-transport

本轮独立复核后未留下需要升级到全局 `reference/uncertainty.md` 的 `[U]`。无法作为逐行源码事实承诺的内容均留在节点正文的 `[I]`: 主要是 Unix-style socket path 的平台边界、短连接/长流设计取舍、无 runtime schema validation 的影响、无 timeout/retry/backpressure policy 的调用方风险, 以及长期兼容性边界。
