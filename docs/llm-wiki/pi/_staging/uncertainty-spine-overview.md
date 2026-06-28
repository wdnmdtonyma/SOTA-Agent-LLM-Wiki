# uncertainty-spine-overview

## [I] `spine.layered-architecture` 的详细职责

`spine.overview` 只从 README、`main()`、`Agent`、`runAgentLoop`、`Models` 和辅助源码推断 `spine.layered-architecture` 应继续细化 package dependency direction 与 reusable/product boundary。该 related 节点在 index.json 中仍是 planned，本轮未创建该节点。

## [I] TUI 交互渲染细节

`spine.overview` 只核到 README 对 `pi-tui` 的 package 描述，以及 `main()` 在 interactive mode 创建 `InteractiveMode(runtime)`。具体 terminal rendering、differential rendering 和组件层细节没有在本节点展开，应由 TUI surface/subsystem 节点或 `spine.process-lifecycle` 继续覆盖。

## [I] StreamFn contract 与 coding-agent wrapper 的边界张力

`packages/agent/src/types.ts` 声明 `StreamFn` 不应 throw/reject runtime failures；`packages/coding-agent/src/core/sdk.ts` 注入的 stream function 在 auth resolution 失败时会 throw，随后由 `Agent.runWithLifecycle()` 转成 assistant error message。本节点把它标为 reusable contract 与产品 wrapper 的边界张力，但未判断这是技术债、刻意兼容策略还是文档 contract 需要更新。
