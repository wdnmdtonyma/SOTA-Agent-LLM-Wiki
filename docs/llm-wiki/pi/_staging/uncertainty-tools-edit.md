# uncertainty-tools-edit

节点: `surface.tools.edit` (`surface/tools/edit.md`)

本轮已核:

- index entry 的 source/symbols/related 已对照 `docs/llm-wiki/pi/index.json`。
- 内置工具集 ground truth 已核 `packages/coding-agent/src/core/tools/index.ts`。
- 会话装配已核 `packages/coding-agent/src/core/agent-session.ts` 的 `_buildRuntime()` 与 `_refreshToolRegistry()`。
- `executionMode` 未在 `createEditToolDefinition()` 中显式设置; 本节点按 agent 默认 parallel + `withFileMutationQueue()` per-file serialization 解释。

新增 `[U]`: 无。
