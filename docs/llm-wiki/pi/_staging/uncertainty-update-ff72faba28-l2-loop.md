# uncertainty-update-ff72faba28-l2-loop

batch: ff72faba28 L2 agent-loop / session / compaction
nodes: spine.agent-loop, subsys.agent-core.turn-control, subsys.agent-core.hooks, spine.session-state-model, ref.coding-agent.session-format, subsys.coding-agent.session-manager, spine.compaction-flow
updated: ff72faba28
status: draft

本轮只改上述 7 个节点。下列点不能升成 `[E]`。

## [U] agent-core JSONL 与产品 SessionManager 的字段差

- 节点: `ref.coding-agent.session-format`
- 本节点 index source 只有 `packages/coding-agent/src/core/session-manager.ts` 与 `packages/coding-agent/docs/session-format.md`。
- agent-core `SessionTreeEntry` / `JsonlSessionStorage` 的具体字段差异不能在本节点保留为 `[E]`。待对应 agent-core 节点或 index source 扩展后复核。

## [U] SessionTreeEntry / storage contract 不在本节点 source

- 节点: `ref.coding-agent.session-format`
- `subsys.agent-core.session-tree` 与 `ref.agent.session-entry-types` 是 harness session tree 相关节点。
- 本节点 index source 不含 agent-core 源文件，不在本节点内复核它们的 `SessionTreeEntry` / storage contract。

## 本轮已核、不进 uncertainty

- `shouldStopAfterTurn` 已从 `packages/agent/src` 删除；现行 API 是 `finishTurn` / `prepareRequest`。
- `finishTurn` 在 assistant+tools finalize 之后、`turn_end` 之前跑；决策在 `turn_end` 之后应用。error/aborted 仍 hard exit：hook 会跑，返回值忽略。
- `prepareRequest` 在每次 conversational provider 请求前运行，含本 run 第一次。
- `ContextEditEntry.replacement: null` 从未来模型 context 省略 target。`SessionManager` 是产品层 canonical provider context；赋值 `agent.state.messages` 不再替换未来 request history。
- `_hasConversation()` 只在 user 或 assistant message 后创建文件。
- retain-none compaction：`appendCompaction(summary, null, tokensBefore)` 把 `firstKeptEntryId` 写成 compaction 自己的 id。
