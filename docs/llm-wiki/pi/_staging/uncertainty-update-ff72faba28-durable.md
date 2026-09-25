# uncertainty-update-ff72faba28-durable

本批：`subsys.durable.runtime`、`subsys.durable.storage`、`spine.overview`、`spine.layered-architecture`、`ref.package-index`。

未安装上游 `node_modules`，没有跑 `packages/durable` 的 vitest / `bench:storage`，不宣称 conformance 或 bench 在本机通过。[U]

## [I]

- `pi-agent-core` 与 `pi-coding-agent` 的 `dependencies` 不含 `@earendil-works/pi-durable`；源码也没有 import。durable 在根 `build` 里位于 `ai` 与 `agent` 之间，但是独立 shipped 包，尚未接到 CLI 默认路径。
- `createSession()` 不自动 `commit` `ROOT_CONVERSATION_ID`（`1`）。`mintId()` 从 `2` 起；root conversation 由调用方 / conformance helper 显式写入。
- JSONL / SQLite 源码没有跨进程 file lock（Node SQLite 只有 `busyTimeoutMs`）。“一个 owner 串行化 writes / 不支持跨进程 ID allocation”来自 README 与 `mintId()` 为实例字段这一实现，不是 flock 协议。
- Node SQLite `synchronous = NORMAL` 的掉电窗口：代码只设置 PRAGMA；“acknowledged commits survive process crash, newest may be lost on power failure”是 README 对 WAL+NORMAL 的说明，标 [I]。
- `subsys.ai.classifiers` / `subsys.coding-agent.cache-warming` 本批文件树中不存在，`spine.layered-architecture` related 未链这两 id。
- `AgentHarness` 注释里的 “durable harness” 指 agent-core v4 `Session` 附着，不是 `@earendil-works/pi-durable`。
- `packages/durable/docs/pico*` 与 `pi-agent-core` 的 `./experimental/pico3` 都不是本批 durable 节点的 shipped 证据；只在 gotcha 里排除。

## [U]

- 未跑 runtime tests：Memory / JSONL / SQLite conformance 是否在 target HEAD 全绿，本 filler 未核。
- 两进程同时 `openNodeJsonlStorage` / `openNodeSqliteStorage` 同一路径的失败形态（ID 冲突、marker 交错、SQLite busy）未用测试钉死。
