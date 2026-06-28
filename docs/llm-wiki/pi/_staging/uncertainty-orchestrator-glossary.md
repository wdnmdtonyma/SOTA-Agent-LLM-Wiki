# uncertainty-orchestrator-glossary

Batch: orchestrator
Node: ref.glossary
Path: docs/llm-wiki/pi/reference/glossary.md

## [U] 待同步项

- 当前无阻塞 `ref.glossary` verified 状态的 unknown 条目。该节点是术语导览，不负责证明 package-internal、RPC/IPC、provider/model 或 orchestrator 细节；这些内容已在正文标为 `[I]` 并链接到对应权威节点。

## [I] 降级说明

- “Pi monorepo”是 wiki 对 README public package table 的组织性归纳；README 只直接列出 `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui` 四个包。
- “wire API” 是 wiki 术语；本轮限定 source 无法直证它对应 `Api` / `KnownApi` 字符串协议类型。
- “spine.overview 是背景入口”是 wiki 编排判断，不是 pi 源码自身概念。
- `pi-orchestrator`、IPC、Unix socket path、OrchestratorRequest、OrchestratorSupervisor、RPC stream bridge、Radius、serve lifecycle 等术语已作为导览 `[I]` 保留，并链接到 `ref.package-index` / `subsys.orchestrator.*` / `ref.orchestrator.ipc-messages` 等节点；不再因为 glossary 自身 source 只有 README/AGENTS 而登记为 unknown。
- Agent loop、Tool call、ModelRegistry、Provider、Skill、Slash command、RPC JSONL framing 等 package-internal 术语已作为导览 `[I]` 保留，并链接到对应 spine/surface/subsystem/reference 节点；不再作为 glossary 节点的 L2 阻塞项。
