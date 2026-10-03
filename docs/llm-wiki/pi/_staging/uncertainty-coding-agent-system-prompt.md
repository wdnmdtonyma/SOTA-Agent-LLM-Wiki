# uncertainty: subsys.coding-agent.system-prompt

本轮 rewrite `subsys.coding-agent.system-prompt` 未新增 `[U]`。已删除 `packages/agent/src/harness/system-prompt.ts` 与 `AgentHarness.systemPrompt` 对照。

保留 `[I]`:

- `BuildSystemPromptOptions` 只消费已准备好的资源,不负责磁盘加载。
- bash-only file operation guideline 是能力替代,不是 tool registry 注册逻辑。
- `forceSystemPrompt` 只投影到本次 request,structured sections 仍会 diff 持久化。
- prompt templates 展开 user prompt text,不等同于 system prompt append source。
