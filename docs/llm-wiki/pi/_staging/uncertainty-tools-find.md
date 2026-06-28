# uncertainty-tools-find

本轮填充 `surface.tools.find` 未留下需要登记为 `[U]` 的源码不确定项。

- `find` 的 input schema、details shape、默认 `fd` 行为、注册 ground truth、`AgentSession._buildRuntime` 装配、以及省略 `executionMode` 后落入 agent-core 默认执行策略,均已用源码或测试行号标注。
- 未运行 reconcile；按任务要求只做节点级填充。
