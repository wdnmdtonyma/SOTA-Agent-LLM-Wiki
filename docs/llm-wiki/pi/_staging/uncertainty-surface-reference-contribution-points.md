# uncertainty: surface reference contribution points

本节点未留下 `[U]`。

- `[I]` 主要用于 catalog 边界判断: `on(event, handler)` 的事件名实例不在 `ref.coding-agent.contribution-points` 展开,而应由 extension events catalog 覆盖;本页只列 `ExtensionAPI` 上的 `pi.on` 入口。
- `[I]` 也用于“注册型贡献点”和“动作入口”的分类。源码以 `ExtensionAPI` 方法分段和签名暴露入口,但没有提供一个正式 union 来声明这些类别。
- `../../../pi` 在当前工作目录不可达;实际源码根是 `/Users/makii/Project/Agent_Wiki/pi`。主节点的 evidence path 仍按 wiki 约定写为相对 `pi/` 的路径。
- L3 lint fix: 将 `ref.coding-agent.contribution-points` 中落在 JSDoc、分隔线、Markdown heading-only 或示例注释行的 `[E]` 锚点移动到真实承载的方法签名、字段、正文说明或示例调用行;少量分类性语义继续保留为 `[I]`。主节点保持 `status: verified`,未新增 `[U]`。
