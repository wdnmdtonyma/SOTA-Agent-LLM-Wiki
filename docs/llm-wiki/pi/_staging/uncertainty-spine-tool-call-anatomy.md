# uncertainty · spine.tool-call-anatomy

- 本轮未留下需要合并进 `reference/uncertainty.md` 的 `[U]` 项。
- 已降级为 `[I]` 的推断: `pi-agent-core` 不包含 coding-agent-specific prompt snippets, renderers, shell settings, or extension metadata。依据是 `AgentTool` 字段与 `ToolDefinition` 字段的结构性对比,但这是边界归纳而不是单行源码声明。
- 已降级为 `[I]` 的推断: Product UI rendering belongs to `ToolDefinition`, not `AgentTool`。`renderCall` / `renderResult` 可由 `ToolDefinition` 单行核到; `AgentTool` 无 renderer 字段属于对接口字段全集的结构性判断。
