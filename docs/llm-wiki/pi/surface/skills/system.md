---
id: surface.skills.system
title: skills 系统
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/skills.ts
  - packages/agent/src/harness/skills.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/system-prompt.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/docs/skills.md
  - .pi/skills/add-llm-provider.md
symbols:
  - loadSkills
  - Skill
  - enableSkillCommands
related:
  - subsys.agent-core.skills-loading
  - subsys.agent-core.system-prompt
  - surface.slash-commands.overview
evidence: explicit
status: verified
updated: 8c943640
---

> `surface.skills.system` 描述 pi-coding-agent 暴露给用户的 skills 系统: 从哪些位置加载 skill、如何把 skill 摘要写入 system prompt、何时把 skill 变成 `/skill:name` 命令,以及它和 pi-agent-core harness loader 的边界。

## 能回答的问题

- pi 会从哪些用户、项目、package、settings、CLI 位置发现 skills?
- 一个 `SKILL.md` 的 frontmatter 会生成哪些 `Skill` 字段,缺少 description 会怎样?
- skill 描述如何进入 system prompt,`disable-model-invocation` 会隐藏什么?
- `/skill:name args` 如何展开成完整 skill 内容,它和普通模型自选 skill 有什么差异?
- `enableSkillCommands` 在 settings 和 interactive autocomplete 中怎样生效?
- `surface.skills.system` 与 `subsys.agent-core.skills-loading`、`subsys.agent-core.system-prompt` 的跨包边界是什么?

## 可见模型

Pi 的 skills 是自包含 capability packages: 用户把 `SKILL.md`、脚本、reference 文档和 assets 放在一个目录里,pi 启动或 reload 时只把 name、description、location 这类摘要暴露给模型,完整内容在任务匹配时由模型用 `read` 工具加载,或由 `/skill:name` 命令强制展开。[E: packages/coding-agent/docs/skills.md:5] [E: packages/coding-agent/docs/skills.md:66] [E: packages/coding-agent/docs/skills.md:67] [E: packages/coding-agent/docs/skills.md:68] [E: packages/coding-agent/docs/skills.md:71]

产品文档把 skill discovery 位置分成 global、project、packages、settings 和 CLI: global 包括 `~/.pi/agent/skills/` 与 `~/.agents/skills/`,project 包括 `.pi/skills/` 与 `.agents/skills/`,packages 可贡献 `skills/` 或 `package.json` 的 `pi.skills`,settings 用 `skills` 数组,CLI 用可重复的 `--skill <path>`。[E: packages/coding-agent/docs/skills.md:24] [E: packages/coding-agent/docs/skills.md:27] [E: packages/coding-agent/docs/skills.md:28] [E: packages/coding-agent/docs/skills.md:30] [E: packages/coding-agent/docs/skills.md:31] [E: packages/coding-agent/docs/skills.md:32] [E: packages/coding-agent/docs/skills.md:33] [E: packages/coding-agent/docs/skills.md:34]

源码侧的 product loader 入口是 `loadSkills(options)`。它接收 `cwd`、`agentDir`、显式 `skillPaths` 和 `includeDefaults`,在 `includeDefaults` 为真时扫描 global `agentDir/skills` 和 project `.pi/skills`,并把显式 paths 解析为目录或 `.md` 文件加载。[E: packages/coding-agent/src/core/skills.ts:372] [E: packages/coding-agent/src/core/skills.ts:387] [E: packages/coding-agent/src/core/skills.ts:391] [E: packages/coding-agent/src/core/skills.ts:392] [E: packages/coding-agent/src/core/skills.ts:430] [E: packages/coding-agent/src/core/skills.ts:431] [E: packages/coding-agent/src/core/skills.ts:432] [E: packages/coding-agent/src/core/skills.ts:455] [E: packages/coding-agent/src/core/skills.ts:466] [E: packages/coding-agent/src/core/skills.ts:468]

## Skill 文件与字段

`Skill` 在 pi-coding-agent 中包含 `name`、`description`、`filePath`、`baseDir`、`sourceInfo` 和 `disableModelInvocation`;这些字段由 `loadSkillFromFile()` 从 markdown frontmatter、文件路径和 source provenance 组合出来。[E: packages/coding-agent/src/core/skills.ts:74] [E: packages/coding-agent/src/core/skills.ts:75] [E: packages/coding-agent/src/core/skills.ts:76] [E: packages/coding-agent/src/core/skills.ts:77] [E: packages/coding-agent/src/core/skills.ts:78] [E: packages/coding-agent/src/core/skills.ts:79] [E: packages/coding-agent/src/core/skills.ts:80] [E: packages/coding-agent/src/core/skills.ts:309] [E: packages/coding-agent/src/core/skills.ts:310]

`SkillFrontmatter` 读取 `name`、`description` 和 `disable-model-invocation`,同时允许其它 unknown keys 存在;`description` 为空会阻止 skill 加载,而 description/name validation error 会产生 warning diagnostic。[E: packages/coding-agent/src/core/skills.ts:67] [E: packages/coding-agent/src/core/skills.ts:68] [E: packages/coding-agent/src/core/skills.ts:69] [E: packages/coding-agent/src/core/skills.ts:70] [E: packages/coding-agent/src/core/skills.ts:71] [E: packages/coding-agent/src/core/skills.ts:290] [E: packages/coding-agent/src/core/skills.ts:291] [E: packages/coding-agent/src/core/skills.ts:292] [E: packages/coding-agent/src/core/skills.ts:299] [E: packages/coding-agent/src/core/skills.ts:300] [E: packages/coding-agent/src/core/skills.ts:301] [E: packages/coding-agent/src/core/skills.ts:305] [E: packages/coding-agent/src/core/skills.ts:306]

Name validation 在 product loader 里检查 64 字符上限、小写字母数字连字符、首尾非连字符、无连续连字符;它不会像 harness loader 那样要求 name 必须等于父目录名,这与产品文档说明的 lenient 兼容策略一致。[E: packages/coding-agent/src/core/skills.ts:92] [E: packages/coding-agent/src/core/skills.ts:95] [E: packages/coding-agent/src/core/skills.ts:99] [E: packages/coding-agent/src/core/skills.ts:103] [E: packages/coding-agent/src/core/skills.ts:107] [E: packages/coding-agent/docs/skills.md:7] [I]

项目内 `.pi/skills/add-llm-provider.md` 是一个真实 skill 文件: 它用 frontmatter 声明 `name: add-llm-provider` 和具体 description,正文把新增 LLM provider 的核心类型、实现、lazy registration、model generation、tests、coding-agent wiring 与 docs 拆成步骤。[E: .pi/skills/add-llm-provider.md:1] [E: .pi/skills/add-llm-provider.md:2] [E: .pi/skills/add-llm-provider.md:3] [E: .pi/skills/add-llm-provider.md:6] [E: .pi/skills/add-llm-provider.md:27] [E: .pi/skills/add-llm-provider.md:34] [E: .pi/skills/add-llm-provider.md:39] [E: .pi/skills/add-llm-provider.md:46] [E: .pi/skills/add-llm-provider.md:54]

## 发现规则与去重

`loadSkillsFromDirInternal()` 先读取 ignore files,再优先查找非 ignored 的 `SKILL.md`;目录内一旦命中 `SKILL.md`,loader 加载该文件并返回,不会继续把同目录 sibling 当作独立 skills。[E: packages/coding-agent/src/core/skills.ts:168] [E: packages/coding-agent/src/core/skills.ts:189] [E: packages/coding-agent/src/core/skills.ts:194] [E: packages/coding-agent/src/core/skills.ts:195] [E: packages/coding-agent/src/core/skills.ts:210] [E: packages/coding-agent/src/core/skills.ts:211] [E: packages/coding-agent/src/core/skills.ts:215] [E: packages/coding-agent/src/core/skills.ts:220]

没有 `SKILL.md` 时,loader 跳过 hidden entries 和 `node_modules`,递归进入子目录,并且只在 `includeRootFiles` 为真时把当前 root 的直接 `.md` 文件当成 skill。[E: packages/coding-agent/src/core/skills.ts:223] [E: packages/coding-agent/src/core/skills.ts:224] [E: packages/coding-agent/src/core/skills.ts:229] [E: packages/coding-agent/src/core/skills.ts:255] [E: packages/coding-agent/src/core/skills.ts:256] [E: packages/coding-agent/src/core/skills.ts:262] [E: packages/coding-agent/src/core/skills.ts:266]

`loadSkills()` 以 skill name 做 first-wins 去重:相同真实文件路径会被静默跳过,相同 name 的不同文件会生成 collision diagnostic,而第一份 skill 留在 `skillMap` 中。[E: packages/coding-agent/src/core/skills.ts:394] [E: packages/coding-agent/src/core/skills.ts:395] [E: packages/coding-agent/src/core/skills.ts:403] [E: packages/coding-agent/src/core/skills.ts:406] [E: packages/coding-agent/src/core/skills.ts:410] [E: packages/coding-agent/src/core/skills.ts:412] [E: packages/coding-agent/src/core/skills.ts:417] [E: packages/coding-agent/src/core/skills.ts:419] [E: packages/coding-agent/src/core/skills.ts:420] [E: packages/coding-agent/src/core/skills.ts:424]

## Resource loader 装配

`DefaultResourceLoader.reload()` 从 package manager 得到 enabled skill resources,把 package-origin 或 auto-source 目录映射到 `SKILL.md` 文件时会保留 metadata,再把 CLI、package/settings 和 additional skill paths 合并后调用 `updateSkillsFromPaths()`。[E: packages/coding-agent/src/core/resource-loader.ts:357] [E: packages/coding-agent/src/core/resource-loader.ts:380] [E: packages/coding-agent/src/core/resource-loader.ts:384] [E: packages/coding-agent/src/core/resource-loader.ts:419] [E: packages/coding-agent/src/core/resource-loader.ts:420] [E: packages/coding-agent/src/core/resource-loader.ts:421] [E: packages/coding-agent/src/core/resource-loader.ts:423] [E: packages/coding-agent/src/core/resource-loader.ts:424] [E: packages/coding-agent/src/core/resource-loader.ts:582] [E: packages/coding-agent/src/core/resource-loader.ts:583] [E: packages/coding-agent/src/core/resource-loader.ts:594] [E: packages/coding-agent/src/core/resource-loader.ts:597] [E: packages/coding-agent/src/core/resource-loader.ts:599]

`updateSkillsFromPaths()` 在 `noSkills` 且传入的 `skillPaths` 为空时返回空列表,否则调用 product `loadSkills({ includeDefaults: false })`;随后它把 extension/package metadata、loader 自带 `sourceInfo` 或默认路径分类补回每个 `Skill.sourceInfo`。[E: packages/coding-agent/src/core/resource-loader.ts:618] [E: packages/coding-agent/src/core/resource-loader.ts:620] [E: packages/coding-agent/src/core/resource-loader.ts:621] [E: packages/coding-agent/src/core/resource-loader.ts:623] [E: packages/coding-agent/src/core/resource-loader.ts:627] [E: packages/coding-agent/src/core/resource-loader.ts:630] [E: packages/coding-agent/src/core/resource-loader.ts:631] [E: packages/coding-agent/src/core/resource-loader.ts:633] [E: packages/coding-agent/src/core/resource-loader.ts:634] [E: packages/coding-agent/src/core/resource-loader.ts:636]

`mapSkillPath()` 对 package-origin 或 auto-source 的目录做一个 convenience mapping:如果该目录存在 `SKILL.md`,它返回具体 skill file 并把 metadata 记到 `metadataByPath`;非目录、stat 失败或没有 `SKILL.md` 时保留原路径。[E: packages/coding-agent/src/core/resource-loader.ts:582] [E: packages/coding-agent/src/core/resource-loader.ts:583] [E: packages/coding-agent/src/core/resource-loader.ts:587] [E: packages/coding-agent/src/core/resource-loader.ts:588] [E: packages/coding-agent/src/core/resource-loader.ts:594] [E: packages/coding-agent/src/core/resource-loader.ts:595] [E: packages/coding-agent/src/core/resource-loader.ts:597] [E: packages/coding-agent/src/core/resource-loader.ts:599] [E: packages/coding-agent/src/core/resource-loader.ts:601]

## System prompt 暴露

`formatSkillsForPrompt(skills)` 只把 `disableModelInvocation` 为 false 的 skills 放入 system prompt;它生成 `<available_skills>` XML-like block,每项包含 escaped `name`、`description` 和 `location`,并明确告诉模型用 read tool 加载 skill 文件、相对路径要按 skill directory 解析。[E: packages/coding-agent/src/core/skills.ts:335] [E: packages/coding-agent/src/core/skills.ts:336] [E: packages/coding-agent/src/core/skills.ts:342] [E: packages/coding-agent/src/core/skills.ts:344] [E: packages/coding-agent/src/core/skills.ts:345] [E: packages/coding-agent/src/core/skills.ts:347] [E: packages/coding-agent/src/core/skills.ts:352] [E: packages/coding-agent/src/core/skills.ts:353] [E: packages/coding-agent/src/core/skills.ts:354]

`buildSystemPrompt()` 在 custom prompt 路径和默认 prompt 路径都会追加 skills section,但前提是 read tool 可用:custom prompt path 检查 `!selectedTools || selectedTools.includes("read")`,默认 prompt path 检查 `hasRead && skills.length > 0`。[E: packages/coding-agent/src/core/system-prompt.ts:6] [E: packages/coding-agent/src/core/system-prompt.ts:71] [E: packages/coding-agent/src/core/system-prompt.ts:72] [E: packages/coding-agent/src/core/system-prompt.ts:73] [E: packages/coding-agent/src/core/system-prompt.ts:164] [E: packages/coding-agent/src/core/system-prompt.ts:165]

`disable-model-invocation: true` 的 effect 是从 always-on skills list 中隐藏 skill,不是禁用 `/skill:name`:product docs 明确说该字段为 true 时 skill hidden from system prompt 且用户必须用 `/skill:name`,代码也只在 `formatSkillsForPrompt()` 过滤它。[E: packages/coding-agent/docs/skills.md:149] [E: packages/coding-agent/src/core/skills.ts:336] [I]

## `/skill:name` 命令

产品文档把 skills 注册为 `/skill:name` commands,并说明命令后参数会追加到 skill content 之后;`/settings` 或 `settings.json` 可通过 `enableSkillCommands` 控制命令注册。[E: packages/coding-agent/docs/skills.md:73] [E: packages/coding-agent/docs/skills.md:75] [E: packages/coding-agent/docs/skills.md:78] [E: packages/coding-agent/docs/skills.md:79] [E: packages/coding-agent/docs/skills.md:82] [E: packages/coding-agent/docs/skills.md:84] [E: packages/coding-agent/docs/skills.md:88]

`enableSkillCommands` 是 `Settings` 字段,默认 getter 返回 `true`;旧版 `skills` object format 的 `enableSkillCommands` 会迁移到顶层字段。[E: packages/coding-agent/src/core/settings-manager.ts:108] [E: packages/coding-agent/src/core/settings-manager.ts:397] [E: packages/coding-agent/src/core/settings-manager.ts:398] [E: packages/coding-agent/src/core/settings-manager.ts:401] [E: packages/coding-agent/src/core/settings-manager.ts:402] [E: packages/coding-agent/src/core/settings-manager.ts:1034] [E: packages/coding-agent/src/core/settings-manager.ts:1035]

Interactive mode 的 autocomplete 只在 `settingsManager.getEnableSkillCommands()` 为 true 时把 loaded skills 转成 `skill:<name>` commands;设置选择器也读取同一个 getter 来显示该开关。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:551] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:553] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:554] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:555] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:558] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:559] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3954]

`AgentSession.prompt()` 在 extension input handlers 之后、prompt template 展开之前调用 `_expandSkillCommand()`;该 method 只处理以 `/skill:` 开头的 text,按 name 找到 loaded skill 后读取 `skill.filePath`、去掉 frontmatter,生成 `<skill name="..." location="...">` block,并把命令参数作为额外文本追加。[E: packages/coding-agent/src/core/agent-session.ts:1045] [E: packages/coding-agent/src/core/agent-session.ts:1065] [E: packages/coding-agent/src/core/agent-session.ts:1066] [E: packages/coding-agent/src/core/agent-session.ts:1208] [E: packages/coding-agent/src/core/agent-session.ts:1209] [E: packages/coding-agent/src/core/agent-session.ts:1212] [E: packages/coding-agent/src/core/agent-session.ts:1213] [E: packages/coding-agent/src/core/agent-session.ts:1215] [E: packages/coding-agent/src/core/agent-session.ts:1219] [E: packages/coding-agent/src/core/agent-session.ts:1220] [E: packages/coding-agent/src/core/agent-session.ts:1221] [E: packages/coding-agent/src/core/agent-session.ts:1222]

`AgentSession` 也把 loaded skills 暴露成 command metadata:每个 skill 变成一个 `SlashCommandInfo`,其中 name 为 `skill:${skill.name}`、source 为 `"skill"`、description 来自 `skill.description`;这一点解释了 RPC/外部 UI 能拿到 skill command list 的来源。[E: packages/coding-agent/src/core/agent-session.ts:2234] [E: packages/coding-agent/src/core/agent-session.ts:2235] [E: packages/coding-agent/src/core/agent-session.ts:2236] [E: packages/coding-agent/src/core/agent-session.ts:2237] [E: packages/coding-agent/src/core/agent-session.ts:2238] [I]

## 跨包关系

`subsys.agent-core.skills-loading` 覆盖 reusable `pi-agent-core` harness loader:它的 `loadSkills(env, dirs)` 用 abstract `ExecutionEnv` 异步发现 skills,返回包含去 frontmatter 后 `content` body 和 `filePath` 的 harness `Skill`。[E: packages/agent/src/harness/skills.ts:49] [E: packages/agent/src/harness/skills.ts:50] [E: packages/agent/src/harness/skills.ts:52] [E: packages/agent/src/harness/skills.ts:233] [E: packages/agent/src/harness/skills.ts:238] [E: packages/agent/src/harness/skills.ts:244] [E: packages/agent/src/harness/skills.ts:250] [E: packages/agent/src/harness/skills.ts:270] [E: packages/agent/src/harness/skills.ts:273] [E: packages/agent/src/harness/skills.ts:274] 本节点覆盖的 `packages/coding-agent/src/core/skills.ts` 是 product-facing loader,它用 Node fs 同步读取、附加 `SourceInfo`、支持 product 的 default locations 和 command integration。[E: packages/coding-agent/src/core/skills.ts:1] [E: packages/coding-agent/src/core/skills.ts:79] [E: packages/coding-agent/src/core/skills.ts:315] [E: packages/coding-agent/src/core/skills.ts:387] [I]

`subsys.agent-core.system-prompt` 是 related 节点;本节点的 index source 能直接核到的是 coding-agent 的 `formatSkillsForPrompt()` 被 `buildSystemPrompt()` 调用。harness-level prompt formatter 不在本节点 source 清单内,因此不在此处作 `[E]` 断言。[E: packages/coding-agent/src/core/system-prompt.ts:6] [E: packages/coding-agent/src/core/system-prompt.ts:73] [E: packages/coding-agent/src/core/system-prompt.ts:165] [U]

`surface.slash-commands.overview` 是 slash command 总览节点;本节点只说明 skill commands 这一路如何由 settings、interactive autocomplete 和 `AgentSession._expandSkillCommand()` 连接到 loaded skills。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:553] [E: packages/coding-agent/src/core/agent-session.ts:1208] [I]

## Gotcha

- `enableSkillCommands=false` 只影响 interactive autocomplete 中 skill commands 的注册;`AgentSession._expandSkillCommand()` 本身不检查该 setting,因此其它调用路径若直接提交 `/skill:name` 且启用 prompt expansion,仍可能展开 skill。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:553] [E: packages/coding-agent/src/core/agent-session.ts:1208] [I]
- `disable-model-invocation` 不阻止 skill command 展开;它只从 `formatSkillsForPrompt()` 的 always-on list 中过滤 skill。[E: packages/coding-agent/src/core/skills.ts:336] [E: packages/coding-agent/src/core/agent-session.ts:1215] [I]
- 产品文档说 `/skill:name` 的 arguments 会作为 `User: <args>` 追加,但当前 `_expandSkillCommand()` 直接把 trim 后的 `args` 追加到 skill block 后,没有加 `User:` 前缀;用户承诺与实现需要后续 reconcile。[E: packages/coding-agent/docs/skills.md:82] [E: packages/coding-agent/src/core/agent-session.ts:1222] [U]
- Product loader 的 name validation 不检查 parent directory equality;harness loader 的 `validateName(name, parentDirName)` 会检查 name 和父目录名相等,所以跨 harness 共享 skills 时要区分这两个 loader 的规则。[E: packages/coding-agent/src/core/skills.ts:92] [E: packages/agent/src/harness/skills.ts:281] [E: packages/agent/src/harness/skills.ts:283] [I]

## Sources

- packages/coding-agent/src/core/skills.ts
- packages/agent/src/harness/skills.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/system-prompt.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/docs/skills.md
- .pi/skills/add-llm-provider.md

## 相关

- [subsys.agent-core.skills-loading](../../subsystems/agent-core/skills-loading.md): reusable harness 的 skill discovery、frontmatter parsing 和 diagnostics。
- [subsys.agent-core.system-prompt](../../subsystems/agent-core/system-prompt.md): reusable harness 的 skill prompt formatter 边界。
- [surface.slash-commands.overview](../commands/overview.md): slash commands 总览;skill commands 是其中的 `skill:<name>` 一类。
