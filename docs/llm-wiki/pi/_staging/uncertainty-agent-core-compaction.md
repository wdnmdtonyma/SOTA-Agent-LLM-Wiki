# uncertainty: subsys.agent-core.compaction

- 本轮未新增 `[U]`。
- 保留为 `[I]` 的主要边界判断: `prepareCompaction()` 与 `shouldCompact()` 的调用顺序属于从函数签名和当前 source 内无调用关系推出的职责边界;`compact()` 不持久化 session entry 属于当前两个 source 文件范围内的负向边界;branch summary 的 abandoned-branch collection 和 prompt 交给 `subsys.agent-core.branch-summary` 单独核验。
- L2 verifier: 已逐条核对 221 个 `[E]` 引用,201 个唯一源码行号均存在;未发现行号漂移、不可核证据或需要降级的过度推断。本节点通过,状态更新为 `verified`。
