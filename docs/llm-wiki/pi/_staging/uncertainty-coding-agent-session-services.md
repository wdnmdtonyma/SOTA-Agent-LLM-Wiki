# uncertainty: coding-agent session-services

本轮填充 `subsys.coding-agent.session-services` 时未发现需要升级为 `[U]` 的源码不确定项。

保留为 `[I]` 的内容主要是设计层推断: services/session factory 拆分的意图、diagnostics 由 caller 决定如何展示或中止、`resourceLoaderOptions` omit 字段带来的自定义边界、boolean extension flag 表达 presence、`pendingProviderRegistrations` 清空后的复用注意点、以及 `pi-agent-core` 在本文件中仅作为 `ThinkingLevel` 类型边界出现。
