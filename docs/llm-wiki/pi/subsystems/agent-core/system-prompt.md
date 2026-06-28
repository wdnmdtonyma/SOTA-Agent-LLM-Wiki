---
id: subsys.agent-core.system-prompt
title: 系统提示组装(harness)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/system-prompt.ts
symbols:
  - formatSkillsForSystemPrompt
related:
  - subsys.agent-core.skills-loading
  - subsys.coding-agent.system-prompt
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.agent-core.system-prompt` 描述 `pi-agent-core` harness 在当前 source 中可见的 system prompt helper: `formatSkillsForSystemPrompt(skills)` 把可由模型调用的 skill 列表格式化成 XML-like `<available_skills>` block,供更上层 system prompt builder 拼接。

## 能回答的问题

- `formatSkillsForSystemPrompt(skills)` 会把哪些 skill 放进模型可见提示?
- 没有可见 skill 时 system prompt skill block 是什么?
- skill 的 name、description、location 如何进入 prompt,如何避免 XML 特殊字符破坏结构?
- `pi-agent-core` harness 是否在这个文件里组装完整 coding-agent system prompt?
- `subsys.agent-core.system-prompt` 和 `subsys.coding-agent.system-prompt` 的边界是什么?

## 职责边界

`packages/agent/src/harness/system-prompt.ts` 只导出 `formatSkillsForSystemPrompt(skills: Skill[]): string`,并在同文件内定义私有 `escapeXml(value)` helper;本文件没有导出完整 system prompt builder,也没有读取 cwd、工具列表、日期、项目上下文或 coding-agent 产品文案。[E: packages/agent/src/harness/system-prompt.ts:1] [E: packages/agent/src/harness/system-prompt.ts:3] [E: packages/agent/src/harness/system-prompt.ts:27] [I]

`formatSkillsForSystemPrompt` 的输入类型来自 harness `Skill`,但本节点只覆盖当前 source 中对 skill 字段的使用: `disableModelInvocation` 决定是否展示,name、description、filePath 分别写入 `<name>`、`<description>`、`<location>`。[E: packages/agent/src/harness/system-prompt.ts:1] [E: packages/agent/src/harness/system-prompt.ts:4] [E: packages/agent/src/harness/system-prompt.ts:17] [E: packages/agent/src/harness/system-prompt.ts:18] [E: packages/agent/src/harness/system-prompt.ts:19]

## Skill formatting

`formatSkillsForSystemPrompt` 先计算 `visibleSkills = skills.filter((skill) => !skill.disableModelInvocation)`,所以显式关闭 model invocation 的 skill 不会出现在模型可见 `<available_skills>` block 中。[E: packages/agent/src/harness/system-prompt.ts:4]

当 `visibleSkills.length === 0` 时函数直接返回空字符串;调用者若要把 skill block 拼进更大的 system prompt,需要把空字符串视作“没有可展示 skill section”。[E: packages/agent/src/harness/system-prompt.ts:5] [I]

非空 skill block 的开头固定包含三行 instruction:说明这些 skills 提供 specialized instructions,要求任务匹配 description 时读取完整 skill file,并要求相对路径按 skill directory 解析后在工具命令中使用 absolute path。[E: packages/agent/src/harness/system-prompt.ts:7] [E: packages/agent/src/harness/system-prompt.ts:8] [E: packages/agent/src/harness/system-prompt.ts:9] [E: packages/agent/src/harness/system-prompt.ts:10]

函数用 `<available_skills>` 包住所有可见 skill,每个 skill 用缩进的 `<skill>` block 表示,并写入 `<name>`、`<description>`、`<location>` 三个字段。[E: packages/agent/src/harness/system-prompt.ts:12] [E: packages/agent/src/harness/system-prompt.ts:15] [E: packages/agent/src/harness/system-prompt.ts:16] [E: packages/agent/src/harness/system-prompt.ts:17] [E: packages/agent/src/harness/system-prompt.ts:18] [E: packages/agent/src/harness/system-prompt.ts:19] [E: packages/agent/src/harness/system-prompt.ts:20] [E: packages/agent/src/harness/system-prompt.ts:23]

输出字符串通过 `lines.join("\n")` 生成;因此 helper 只负责文本格式化,不负责把 block 插入 system prompt 的具体位置,也不负责去重、排序、文件读取或权限校验。[E: packages/agent/src/harness/system-prompt.ts:7] [E: packages/agent/src/harness/system-prompt.ts:15] [E: packages/agent/src/harness/system-prompt.ts:24] [I]

## XML escaping

`escapeXml(value)` 依次替换 `&`、`<`、`>`、`"`、`'`,分别转成 `&amp;`、`&lt;`、`&gt;`、`&quot;`、`&apos;`;`formatSkillsForSystemPrompt` 对 name、description、filePath 都调用这个 helper 后再写入标签。[E: packages/agent/src/harness/system-prompt.ts:17] [E: packages/agent/src/harness/system-prompt.ts:18] [E: packages/agent/src/harness/system-prompt.ts:19] [E: packages/agent/src/harness/system-prompt.ts:27] [E: packages/agent/src/harness/system-prompt.ts:29] [E: packages/agent/src/harness/system-prompt.ts:30] [E: packages/agent/src/harness/system-prompt.ts:31] [E: packages/agent/src/harness/system-prompt.ts:32] [E: packages/agent/src/harness/system-prompt.ts:33]

escaping 的边界是 tag content:当前 source 中没有 attribute interpolation,也没有对 instruction 文案本身做 escaping,因为 instruction 文案是函数内固定字符串。[E: packages/agent/src/harness/system-prompt.ts:8] [E: packages/agent/src/harness/system-prompt.ts:9] [E: packages/agent/src/harness/system-prompt.ts:10] [E: packages/agent/src/harness/system-prompt.ts:17] [E: packages/agent/src/harness/system-prompt.ts:18] [E: packages/agent/src/harness/system-prompt.ts:19]

## Prompt assembly if present

本 source 文件没有 `buildSystemPrompt`、`systemPrompt` state mutation 或 provider request call;可由 `[E]` 证明的 assembly 只有 skill block 内部的 line array 构造、skill loop、closing tag 和 newline join。[E: packages/agent/src/harness/system-prompt.ts:3] [E: packages/agent/src/harness/system-prompt.ts:7] [E: packages/agent/src/harness/system-prompt.ts:15] [E: packages/agent/src/harness/system-prompt.ts:23] [E: packages/agent/src/harness/system-prompt.ts:24] [I]

更上层的 coding-agent system prompt builder、AgentSession 何时重建 prompt、以及 skill block 是否受 read tool 可用性门控,都属于 source 外调用关系;本节点只把这些作为 `subsys.coding-agent.system-prompt` 与 `subsys.agent-core.skills-loading` 的边界信息,不对外部实现细节给 `[E]`。[I]

## Coding-agent system prompt 边界

`pi-agent-core` 在本节点 source 中提供的是 reusable harness formatter:它接受已经加载好的 `Skill[]`,过滤掉不应被模型调用的 skill,再返回一个自包含 skill catalog string。[E: packages/agent/src/harness/system-prompt.ts:3] [E: packages/agent/src/harness/system-prompt.ts:4] [E: packages/agent/src/harness/system-prompt.ts:24]

`pi-coding-agent` 产品层负责决定完整 coding-agent system prompt 的主体文案、工具说明、项目上下文、日期/cwd、以及何时把 skill formatter 的输出拼进去;这些装配点不在当前 source 文件内,因此本节点只用 `[I]` 标出跨包边界。[I]

`subsys.agent-core.skills-loading` 应覆盖 skill 从文件系统或配置来源被发现、解析和标记的流程;本节点只覆盖已经得到 `Skill[]` 后如何格式化成模型可见 system prompt block。[E: packages/agent/src/harness/system-prompt.ts:1] [E: packages/agent/src/harness/system-prompt.ts:3] [I]

## Gotcha

- `disableModelInvocation` 为 true 的 skill 在这里被完全过滤,不会留下 name 或 location 占位。[E: packages/agent/src/harness/system-prompt.ts:4]
- 空 skill 列表和“全部 skill 都 disableModelInvocation”的结果相同:函数都返回 `""`。[E: packages/agent/src/harness/system-prompt.ts:4] [E: packages/agent/src/harness/system-prompt.ts:5]
- `<location>` 使用的是 `skill.filePath` 原值的 escaped 文本;当前 source 不把它改成相对路径或绝对路径。[E: packages/agent/src/harness/system-prompt.ts:19] [I]

## Sources

- packages/agent/src/harness/system-prompt.ts

## 相关

- subsys.agent-core.skills-loading - skill discovery/loading 的权威节点;本节点只处理 loaded skills 的 prompt formatting。
- subsys.coding-agent.system-prompt - coding-agent 产品层完整 system prompt 的权威节点;本节点只处理 agent-core harness formatter。
