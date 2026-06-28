# uncertainty: subsys.agent-core.system-prompt

本轮填充 `subsys.agent-core.system-prompt` 未新增 `[U]`。

节点 `[E]` 严格限定在 `packages/agent/src/harness/system-prompt.ts`。关于 `formatSkillsForSystemPrompt` 的调用点、coding-agent 产品层完整 prompt 组装、AgentSession 何时重建 system prompt、以及 skill loading 来源,均属于 source 外关系,正文只用 `[I]` 标注边界,不作为本节点显式证据。

L2 已逐条证伪 `subsys.agent-core.system-prompt` 的 `[E]` 可核性、行号精度和过度推断风险;未留下需要上卷到 `reference/uncertainty.md` 的 `[U]`。节点 frontmatter 已置 `status: verified`;摘要 wording 已从 package-wide “唯一可见” 收紧为 “当前 source 中可见”。
