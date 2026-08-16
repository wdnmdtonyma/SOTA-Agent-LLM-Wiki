# update-086c32e745 · agent-core harness / search / events

batch: update-086c32e745
nodes:
  - subsys.agent-core.session-search
  - subsys.agent-core.agent-harness-lifecycle
  - subsys.agent-core.harness-events
  - ref.agent.agent-events
  - ref.agent.error-codes
updated: 086c32e745

## [U]

- `packages/agent/docs/harness.md` 仍描述带 `sync()` / `notify()` / durable cursor 的 `SessionSearchService`。`packages/agent/src` 没有该符号；当前公开面是 `SessionSearch` + `createScanningSessionSearch`。无法从源码判断这份设计稿是否仍是后续实现目标。
- `packages/agent/docs/search.md` 写 follow-up 应增加默认 no-op 的 `NOOP_SEARCH_INDEX_SINK`。源码与导出里都没有该符号，是否落地未知。

## 本轮已核清、不再当 [U]

- `SessionSearch` 仍从 `pi-agent-core` 根入口 `export * from "./search/index.ts"` 导出；旧 `harness/session/search.ts` 已删除。
- `AgentHarnessEvent` / `AgentHarnessErrorCode` 已从 `harness/types.ts` 删除。事件 catalog 改为 `AgentEvent` + `HarnessEvent`；错误 catalog 改为 File/Exec/Compaction/BranchSummary/Session + `JsonlDecodeError.kind` + `TaggedError` `_tag` + `RecordLogCorruptionReason`。
- `AgentHarness` 是 named export，经包 `"."` 入口再导出；`package.json` 无 experimental subpath。多数 lane API 仍 `HarnessNotImplemented`。
- `reset()` 拒绝 active run 的是 `Agent.reset()`，不是 `AgentHarness`。
- `expandPromptTemplates` 只存在于 `coding-agent` `AgentSession`，不在 `AgentHarness`。
- `HarnessEventBus` 未从 `packages/agent/src/index.ts` 再导出，也未接到 `AgentHarness.events`。
