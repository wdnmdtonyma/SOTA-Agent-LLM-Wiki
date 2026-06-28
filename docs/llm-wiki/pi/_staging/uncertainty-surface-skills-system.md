# uncertainty: surface.skills.system

## [U]

- [U] `subsys.agent-core.system-prompt` 的 harness-level prompt formatter 不在 `surface.skills.system` 当前 source 清单内;本节点只能用 `packages/coding-agent/src/core/system-prompt.ts` 明确证明 coding-agent 的 `formatSkillsForPrompt()` 装配路径。是否要把 `packages/agent/src/harness/system-prompt.ts` 加入该 related 节点或本节点 source,留给后续 reconcile。
- [U] `/skill:name` 参数追加语义存在文档/实现不一致:`packages/coding-agent/docs/skills.md` 说 arguments are appended as `User: <args>`,但 `packages/coding-agent/src/core/agent-session.ts` 的 `_expandSkillCommand()` 当前直接追加 trim 后的 `args`,没有加 `User:` 前缀。

## [I]

- [I] `loadSkills()` 被描述为 product-facing loader: 源码能证明它使用 Node fs、`SourceInfo`、默认 global/project 路径和显式 paths;“product-facing”是基于它位于 `packages/coding-agent` 且被 `DefaultResourceLoader` 调用的职责归纳。
- [I] `disable-model-invocation` 被描述为不禁用 `/skill:name`: 源码能证明 system prompt formatter 会过滤该字段,而 `_expandSkillCommand()` 按 loaded skill name 展开时没有检查该字段;没有单独测试直接断言这个 UX 语义。
- [I] `enableSkillCommands=false` 被描述为只影响 interactive autocomplete 注册: 源码能证明 interactive autocomplete 检查该 setting,而 `_expandSkillCommand()` 没有检查;其它入口是否应额外门控属于产品语义推断。
- [I] `AgentSession` command metadata 解释 RPC/外部 UI command list 来源: 源码能证明 loaded skills 被映射成 `SlashCommandInfo`,但不同外部 surface 的消费路径应由对应 surface 节点继续细化。
