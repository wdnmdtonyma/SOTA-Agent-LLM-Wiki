# uncertainty · subsys.agent-core.tool-invocation

- 本轮未留下需要并入 `reference/uncertainty.md` 的 `[U]` 项。
- L2 已逐条证伪 `subsys.agent-core.tool-invocation` 的 `[E]` 可核性、行号精度和过度推断风险;节点 frontmatter 已置 `status: verified`。
- 为满足 `source=[packages/agent/src/agent-loop.ts, packages/agent/src/types.ts]`,正文没有展开 `validateToolArguments` 在 `pi-ai` 中的 schema 细节,只引用 agent loop 对该函数的调用边界。
- 已把产品层工具注册归属、相关节点职责分配等不能由本节点两个 source 直接证明的内容收窄为 `[I]` 边界说明;正文证据行改为实际代码行,不再依赖注释行锚点。
