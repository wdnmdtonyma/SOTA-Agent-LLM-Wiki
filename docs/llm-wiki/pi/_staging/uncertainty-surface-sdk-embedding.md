# uncertainty: surface.sdk.embedding

## 保留为 `[U]`

- `createAgentSession()` 是否仍支持或曾经计划支持 `continueSession: true`: `packages/coding-agent/src/core/sdk.ts` 的 JSDoc 示例写了 `continueSession: true`,但当前 `CreateAgentSessionOptions` interface 没有该字段;`SessionManager.open()`、`SessionManager.continueRecent()` 和 `AgentSessionRuntime` 提供 continuation/replacement 相关能力。需要维护者确认这是过期示例、遗漏的 option,还是文档意图迁移到显式 `SessionManager` / runtime API。

## 降级为 `[I]` 的推断

- SDK 嵌入使用 coding-agent 产品层默认运行策略包住 `pi-agent-core` 的 `Agent`:源码证明 `new Agent()` 使用 coding-agent 的 auth/settings/provider/tool/session wiring,该句是架构归纳。
- `extensionsResult` 对自定义宿主有用:源码证明返回该对象,用途是基于其命名和 SDK 文档中 extension/runtime 语境的使用推断。
- `SessionManager.inMemory()` 是无持久化运行、`SessionManager.create()` 是 JSONL session 持久化运行:源码证明构造参数 `persist=false/true` 与 session manager 注释,此处是 SDK 调用层面的归纳。
- `SessionManager` 的 tree/branching 语义来自 class-level 注释;节点只把 `create()` / `inMemory()` 的具体持久化构造行作为 `[E]`。
- `surface.modes.rpc`、`subsys.coding-agent.agent-session`、`subsys.coding-agent.http-dispatcher` 的职责分工来自 `index.json` related/source/symbols 和已存在节点内容,不是 `sdk.ts` 内部声明。

## 未展开范围

- 未展开 `createAgentSessionRuntime()`、`createAgentSessionServices()`、`createAgentSessionFromServices()` 的完整 service graph;本节点按 `surface.sdk.embedding` 范围只说明它们与 session replacement/RPC 的边界。
- 未逐项说明 `AgentSession.prompt()` 的 extension command、prompt template、input hook、retry、compaction 和 queue 内部流程;该内容应由 `subsys.coding-agent.agent-session` 覆盖。
- 未列出所有 SDK re-export type 和 tool factory 的字段级目录;本节点只覆盖 embedding 入口所需的主路径。
