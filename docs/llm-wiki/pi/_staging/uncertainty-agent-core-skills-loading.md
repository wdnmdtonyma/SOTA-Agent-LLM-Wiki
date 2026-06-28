# uncertainty: subsys.agent-core.skills-loading

本轮填充 `subsys.agent-core.skills-loading` 未新增 `[U]`。

L2 核验后节点已置 `status: verified`。本轮逐条对照 `packages/agent/src/harness/skills.ts` 核验 `[E]` 可核性、行号精度和过度推断:将 diagnostic code 描述从 "root or symlink info failure" 收紧为 file-info/canonical-path failure;将 `SKILL.md` 优先级补充为 non-ignored regular file,避免把 ignored/non-file `SKILL.md` 写成必然截断遍历。其余 `[E]` 均能落到当前 source 行号;跨节点职责边界继续保留为 `[I]`。

- [I] `Skill` 的完整接口定义不在本节点 source 内。本节点只用 `packages/agent/src/harness/skills.ts` 证明 `Skill` 被 type-import、作为数组/返回类型使用,以及 `loadSkillFromFile()` 构造的字段集合;完整契约应由类型模型或 skills surface 节点核验。
- [I] `loadSourcedSkills` 的 source schema 由调用方定义这一点来自泛型 `TSource` 和 runtime 原样转发 `input.source` 的组合判断;本文件能直接证明原样附加,不能单独证明所有上层 source taxonomy。
- [I] broader system prompt 装配不在本节点 source 内。本节点只覆盖 `formatSkillInvocation()` 的单 skill invocation payload,并把 always-on skills listing / summary 交给 `subsys.agent-core.system-prompt` 或 `surface.skills.system`。
