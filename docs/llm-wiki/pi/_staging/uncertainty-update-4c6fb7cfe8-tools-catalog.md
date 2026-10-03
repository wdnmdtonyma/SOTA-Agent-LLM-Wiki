# Uncertainty · ref.tools-catalog (4c6fb7cfe8)

Source node: `ref.tools-catalog` (`docs/llm-wiki/pi/reference/tools-catalog.md`)

本轮没有新的 `[U]`。八个 `createXToolDefinition` 都未声明 `executionMode`;结论 `unset -> default parallel` 来自 wrapper 原样复制该字段,以及 `Agent` 默认 `toolExecution: "parallel"`,正文标 `[I]`。

Evidence: `packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:20`, `packages/agent/src/agent.ts:253`, `packages/coding-agent/src/core/extensions/types.ts:624`
