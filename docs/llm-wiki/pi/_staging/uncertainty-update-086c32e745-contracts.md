# uncertainty-update-086c32e745-contracts

- `[U]` `AgentHarnessOptions.context?: TelemetryContext` 已声明,但 `AgentHarness` 构造函数不读取该字段,`prompt` / `compact` / `navigateTree` 等仍 `HarnessNotImplemented`。本节点只证明 schema + `startAiSpan` / `startHarnessSpan` / `createTypedSpanStarter(AGENT_TELEMETRY_SCHEMAS)` 的组合方式,不能证明 harness 运行时已按 schema 发射 span。
- `[U]` `packages/agent/docs/harness.md` §5.8 把 `pi.harness.sleep` 的允许 parents 写成 run/compaction/navigation/turn/checkpoint,并把 `pi.session.write` 描述为带 `item_count` / `item_kinds` 的 transaction。当前 `HARNESS_TELEMETRY_SCHEMA` 中 sleep parents 仅为 `pi.harness.step` 与 `pi.harness.run`,`pi.session.write` start 字段为 `mutation` / `item_type`。以 TypeScript schema 为准;设计文档是否过时未知。
