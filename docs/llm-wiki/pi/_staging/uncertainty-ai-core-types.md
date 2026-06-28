# uncertainty: ref.ai.core-types

L2 verification passed for `ref.ai.core-types`; status set to `verified`.

- `packages/ai/src/types.ts` 的 exported 类型/re-export 均已覆盖,包括核心 `Model`、`Context`、`Message`、`AssistantMessage`、`AssistantMessageEvent`、`Usage`。
- 已逐条收紧 `[E]` 行号:补充 `ImagesOutputContent` 的 `TextContent`/`ImageContent` 证据,把 `Usage.reasoning`、`ProviderEnv`、`ProviderHeaders`、`ThinkingLevelMap`、`SimpleStreamOptions`、routing/model cost 等语义指向实际注释或字段行。
- 已将 `Models.*` facade、message transform/provider serializer、event-stream result 行为、provider-specific image option 消费等非本 source 可直接证明的内容降级为 `[I]` 或收窄措辞。
- 未新增 `[U]`。
