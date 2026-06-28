# Uncertainty: ref.coding-agent.session-format

L2 surface 核验按 `docs/llm-wiki/pi/index.json` 的 source 执行;该 index source 只包含:

- `packages/coding-agent/src/core/session-manager.ts`
- `packages/coding-agent/docs/session-format.md`

新增 `[U]`:

- agent-core `SessionTreeEntry` 是否额外包含 `ActiveToolsChangeEntry` / `LeafEntry`,以及 agent-core `JsonlSessionStorage` 的 header / leaf 解析 contract,本轮不能在 `ref.coding-agent.session-format` 中作为 `[E]` 保留;原 draft 依赖的 `packages/agent/src/harness/types.ts` 与 `packages/agent/src/harness/session/jsonl-storage.ts` 不在该节点 index source 内。
- `subsys.agent-core.session-tree` 和 `ref.agent.session-entry-types` 的具体字段/存储契约应由对应 agent-core 节点或扩展后的 index source 复核,本节点只保留 coding-agent 产品层可核边界。

仍按 `[I]` 保留:

- coding-agent 产品层 `SessionEntry` union 只包含当前 `session-manager.ts` 中列出的九类 non-header entry;`leaf` 在 coding-agent 产品层是 `SessionManager.leafId` 内存字段,不是 `SessionEntry` 成员。
- `getSessionFile()` 返回路径不等同于文件已经存在,是从 `_persist()` 的延迟 flush 行为推导出的使用 gotcha,正文按 `[I]` 标注。
