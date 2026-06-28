# Uncertainty · coding-agent extension-wrapper

本节点未留下 `[U]`。

- `[I]` 降级项主要是设计动机和边界推断: `sourceInfo` 保留在 definition registry、wrapper 每次 execute 创建 context 的动机、extension/custom 对 built-in 的覆盖含义、SDK custom tools 复用 `wrapRegisteredTools()` 的解释。
- 这些 `[I]` 均有相邻代码证据, 但源码没有直接写成产品设计说明, 所以未提升为纯 `[E]`。
- 本轮复核校准了少量 `[E]` 行号: event interception 的文件头注释、`ToolDefinition` 的 UI 字段、`createContext()` getter/assertActive/call-time 注释均已改到实际承载行;未新增 `[U]`。
