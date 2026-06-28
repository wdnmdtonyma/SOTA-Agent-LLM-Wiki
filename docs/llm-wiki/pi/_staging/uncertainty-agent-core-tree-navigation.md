# uncertainty: subsys.agent-core.tree-navigation

L2 verifier 已逐条证伪 `[E]` 的可核性、行号精度与过度推断风险;节点已标记 `status: verified`。正文保留 1 个 source-scope `[U]`: `getPathToRoot` backend 具体实现不在本节点指定 source `packages/agent/src/harness/session/session.ts` 中;这不是失败的 `[E]`,而是本节点的覆盖边界。

本轮收紧的表述:

- `SessionStorage` 能力摘要不再把 metadata 写成“读写”;`session.ts` 只直接读取 metadata,leaf/entry/message/state/branch summary 才涉及读取、移动或追加。
- 薄 wrapper 说明中把 `getStorage()` 改为“直接返回 storage 实例”,不再说它转发到 storage 方法。
- compaction rebuild 范围改为“自 `firstKeptEntryId` 起”,对应源码先命中该 id 再 append 当前 entry。
- `buildSessionContext()` 状态扫描说明补充 assistant message 会覆盖 model,避免把 model 来源全部概括成 state entry。
- 跨包边界改成基于当前 source import 与节点 scope 的结构性 `[I]`,不把未展开 coding-agent product 层写成可由单行 `[E]` 直接证明的事实。

保留为边界/推断的点:

- `getPathToRoot` 的具体 backend 实现不在本节点 source 中;本节点只证明 `Session.getBranch()` 调用 `storage.getPathToRoot(leafId)`。
- `fromId` 被解释为指定 leaf/path anchor,以及多个 compaction 时最后一次扫描到的 compaction 生效,均来自源码控制流推断,正文继续用 `[I]` 标注。
