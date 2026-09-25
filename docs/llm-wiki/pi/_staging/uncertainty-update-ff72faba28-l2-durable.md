# uncertainty-update-ff72faba28-l2-durable

L2 审查 `subsys.durable.runtime` / `subsys.durable.storage` / `spine.overview` / `spine.layered-architecture` / `ref.package-index`。HEAD `ff72faba28`。未安装 `node_modules`，未跑 `packages/durable` vitest / `bench:storage`。

## [U]

- Memory / JSONL / SQLite conformance 与 `bench:storage` 是否在本 HEAD 全绿，L2 未跑测试，只核了源码与行号。
- 两进程同时 `openNodeJsonlStorage` / `openNodeSqliteStorage` 同一路径的失败形态（ID 冲突、marker 交错、SQLite busy）仍无测试钉死。
