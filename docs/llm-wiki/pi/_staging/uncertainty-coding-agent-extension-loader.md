# uncertainty-coding-agent-extension-loader

节点: `subsys.coding-agent.extension-loader`

## [U]

- 无。

## [I]

- `discoverAndLoadExtensions` 更像 low-level discovery API 和测试入口, 当前 product reload 主路径更多依赖 package-manager/resource-loader 产出的 resolved paths。
- loader/runtime split 的设计意图是把 extension declaration phase 与 session-bound action phase 分开。
- cwd-scoped factory cache 的风险控制目标是避免跨 cwd 污染和 reload 后陈旧 import。
