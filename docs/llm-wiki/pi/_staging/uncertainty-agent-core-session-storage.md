# uncertainty: subsys.agent-core.session-storage

L2 核验后 `subsys.agent-core.session-storage` 未新增 `[U]`;节点已标记 `status: verified`。主节点只把 `SessionStorage`、`SessionRepo`、JSONL-specific 类型 specialization 和 `repo-utils.ts` 的通用 helper 写成可由指定 source 直接核验的事实。

JSONL 文件格式、目录扫描、append 策略、memory backend 的 Map/array/cache 行为、以及具体 implementation 的并发/生命周期语义没有在本节点展开；这些边界留给 `subsys.agent-core.jsonl-storage` 与 `subsys.agent-core.memory-storage`。节点中涉及“接口与 repo 分离”“helper 可被不同 backend 复用”“默认 fork 偏向从 user message 之前分叉”“leaf/repo 边界”“fork validation boundary”的设计意图或结构判断均按 `[I]` 标注,不当作源码可直接证明的设计说明。L2 修正了过度表述: `createTimestamp()` 只保留为 ISO timestamp helper,`getEntriesToFork()` 无 `entryId` 分支只写成返回完整 entries,filesystem error gotcha 不再列未引用的具体 FileErrorCode 示例,跨包边界只说指定 source 覆盖范围,不再把 CLI/TUI/product settings 的依赖关系写成 `[E]` 可证明事实。
