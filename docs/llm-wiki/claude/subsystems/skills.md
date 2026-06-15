---
id: subsys.skills
path: subsystems/skills.md
title: Skills
kind: subsystem
tier: T2
status: verified
source: [skills/]
symbols: [parseSkillFrontmatterFields, createSkillCommand, loadSkillsFromSkillsDir, getSkillDirCommands, discoverSkillDirsForPaths, activateConditionalSkillsForPaths, registerBundledSkill, getPluginSkills]
related: [tool.skill]
updated: 2026-06-14
evidence: explicit
---

Skills 子系统把磁盘 `SKILL.md`、legacy commands、bundled skills、plugin skills 和 MCP skills 统一到 `Command` surface: 磁盘/plugin/bundled skills 由 `getSkills` 聚合, MCP skills 则从 `AppState.mcp.commands` 里筛出 `loadedFrom:'mcp'` 的 prompt command。[E: skills/loadSkillsDir.ts:407][E: skills/loadSkillsDir.ts:270][E: commands.ts:353][E: commands.ts:360][E: commands.ts:375][E: commands.ts:377][E: commands.ts:547][E: commands.ts:551][E: commands.ts:553][E: commands.ts:554] loader 只把技能元数据先变成 prompt command, 真正的正文替换、shell 注入和路径变量替换发生在 command 被调用时。[E: skills/loadSkillsDir.ts:317][E: skills/loadSkillsDir.ts:344][E: skills/loadSkillsDir.ts:359][E: skills/loadSkillsDir.ts:366][E: skills/loadSkillsDir.ts:374]

## 能回答的问题

- 一个 `SKILL.md` 的 frontmatter 会被解析成哪些 command 字段?
- managed/user/project/add-dir/legacy/plugin/bundled skills 如何合并?
- `paths` 条件技能什么时候进入动态技能集合?
- bundled skills 和 plugin skills 与普通磁盘 skills 的差异在哪里?

## 职责边界

Skills 负责把 skill definition 转成 `Command`, 不负责工具权限最终裁决; `allowed-tools` 会进入 command 和 shell injection 的 tool permission context, 但真实工具执行仍走 Tool/permission 子系统。[E: skills/loadSkillsDir.ts:242][E: skills/loadSkillsDir.ts:322][E: skills/loadSkillsDir.ts:374] Plugin skills 通过 plugin command loader 进入同一 command surface, 但 plugin 安装、manifest、cache 和安全策略属于 Plugins 子系统。[E: utils/plugins/loadPluginCommands.ts:840][E: utils/plugins/pluginLoader.ts:3137][I]

## 关键文件

- `skills/loadSkillsDir.ts`: 解析 skill frontmatter, 创建 `Command`, 加载 managed/user/project/add-dir/legacy skills, 管理条件技能和动态技能。[E: skills/loadSkillsDir.ts:185][E: skills/loadSkillsDir.ts:270][E: skills/loadSkillsDir.ts:638][E: skills/loadSkillsDir.ts:997]
- `skills/bundledSkills.ts`: 注册编译进 CLI 的 bundled skills, 处理 bundled reference files 的安全写入和 base directory 前缀。[E: skills/bundledSkills.ts:53][E: skills/bundledSkills.ts:147][E: skills/bundledSkills.ts:208]
- `commands.ts`: `getSkills` 并行加载磁盘 skills 和 plugin skills, 再加入 bundled skills 与 builtin plugin skills。[E: commands.ts:360][E: commands.ts:375][E: commands.ts:377]
- `utils/plugins/loadPluginCommands.ts`: 从启用插件的默认 `skills/` 和 manifest skills paths 中加载 plugin skills。[E: utils/plugins/loadPluginCommands.ts:687][E: utils/plugins/loadPluginCommands.ts:840]

## 数据模型 / 状态

`parseSkillFrontmatterFields` 输出 display name、description、allowedTools、argument hint/names、whenToUse、version、model、disableModelInvocation、userInvocable、hooks、fork context、agent、effort 和 shell。[E: skills/loadSkillsDir.ts:185][E: skills/loadSkillsDir.ts:237] `createSkillCommand` 把这些字段映射成 `Command`, 设置 `type:'prompt'`、`source`、`loadedFrom`、`hooks`、`skillRoot` 和 lazy `getPromptForCommand`。[E: skills/loadSkillsDir.ts:317][E: skills/loadSkillsDir.ts:340][E: skills/loadSkillsDir.ts:342][E: skills/loadSkillsDir.ts:343]

磁盘 skill 只支持目录格式 `skill-name/SKILL.md`; `/skills/` 下单个 `.md` 文件会被跳过。[E: skills/loadSkillsDir.ts:425] loader 会读取 `SKILL.md`, 解析 frontmatter 和正文, 以目录名作为 skill name, 再把 baseDir 设为 skill directory。[E: skills/loadSkillsDir.ts:435][E: skills/loadSkillsDir.ts:447][E: skills/loadSkillsDir.ts:452][E: skills/loadSkillsDir.ts:461]

Bundled skill definition 包含 name、description、aliases、whenToUse、argumentHint、allowedTools、model、hooks、context、agent、files 和 `getPromptForCommand`。[E: skills/bundledSkills.ts:15] 如果 bundled skill 带 reference files, 注册器会在首次调用时提取文件, 并把 base directory 前缀加到返回 text block 前。[E: skills/bundledSkills.ts:59][E: skills/bundledSkills.ts:67][E: skills/bundledSkills.ts:208]

## 控制流

`getSkillDirCommands` 同时计算 user、managed、project 和 additional dirs, 并受 plugin-only policy 与 bare mode 影响。[E: skills/loadSkillsDir.ts:640][E: skills/loadSkillsDir.ts:649][E: skills/loadSkillsDir.ts:650][E: skills/loadSkillsDir.ts:658] 非 bare 模式下, managed、user、project、additional 和 legacy commands 会并行加载, 然后按 realpath/file identity 去重。[E: skills/loadSkillsDir.ts:679][E: skills/loadSkillsDir.ts:685][E: skills/loadSkillsDir.ts:728] 带 `paths` frontmatter 的 skill 不会直接返回给 command surface, 而是进入 `conditionalSkills`, 等匹配文件被触达后再激活。[E: skills/loadSkillsDir.ts:772][E: skills/loadSkillsDir.ts:788]

调用 skill command 时, `getPromptForCommand` 会先把 base directory 前缀插入正文, 替换参数、`${CLAUDE_SKILL_DIR}` 和 `${CLAUDE_SESSION_ID}`, 然后对非 MCP skill 执行 markdown 中的 shell injection。[E: skills/loadSkillsDir.ts:344][E: skills/loadSkillsDir.ts:349][E: skills/loadSkillsDir.ts:359][E: skills/loadSkillsDir.ts:366][E: skills/loadSkillsDir.ts:374] MCP skills 被显式排除 shell injection, 因为 `loadedFrom !== 'mcp'` 才进入 injection 分支。[E: skills/loadSkillsDir.ts:374]

动态发现从触达文件的父目录向上走到 cwd 之前, 查找 `.claude/skills`; gitignored 目录会跳过, 找到的新目录按路径深度从深到浅排序。[E: skills/loadSkillsDir.ts:861][E: skills/loadSkillsDir.ts:876][E: skills/loadSkillsDir.ts:892][E: skills/loadSkillsDir.ts:912] 条件 skill 激活时, 它用 ignore matcher 比对 cwd-relative file path, 命中后移入 `dynamicSkills`, 从 `conditionalSkills` 删除并发送 `skillsLoaded` 事件。[E: skills/loadSkillsDir.ts:997][E: skills/loadSkillsDir.ts:1012][E: skills/loadSkillsDir.ts:1029][E: skills/loadSkillsDir.ts:1054]

Plugin skills 的加载只看 enabled plugins; bare mode 如果没有 inline plugins 会直接返回空。[E: utils/plugins/loadPluginCommands.ts:840][E: utils/plugins/loadPluginCommands.ts:847] 每个 plugin 先加载默认 skillsPath, 再加载 manifest skillsPaths, skill 名会被命名为 `${pluginName}:${entry.name}` 或 `${pluginName}:${basename(skillsPath)}`。[E: utils/plugins/loadPluginCommands.ts:726][E: utils/plugins/loadPluginCommands.ts:806][E: utils/plugins/loadPluginCommands.ts:870][E: utils/plugins/loadPluginCommands.ts:897]

## 设计动机与权衡

- Skills 使用 `Command` 作为统一表示, 让技能可以复用 slash command 的 prompt、工具权限、参数替换和隐藏/可调用字段; 代价是 skill loader 必须适配多种来源。[E: skills/loadSkillsDir.ts:317][E: commands.ts:360][E: utils/plugins/loadPluginCommands.ts:840][I]
- 条件技能默认不进入 command surface, 等文件路径命中才激活, 这是用 discovery 延迟换取更少的 prompt/command 噪声。[E: skills/loadSkillsDir.ts:772][E: skills/loadSkillsDir.ts:997][I]
- Bundled skill 文件写入使用 owner-only 目录和 `O_EXCL/O_NOFOLLOW` 风格的 safe write, 说明 bundled reference file extraction 被当作本地文件安全边界处理。[E: skills/bundledSkills.ts:161][E: skills/bundledSkills.ts:176][E: skills/bundledSkills.ts:186][I]

## Gotchas

- `/skills/` 目录下的单文件 `.md` 不会被当作 skill; 必须是 `name/SKILL.md`。[E: skills/loadSkillsDir.ts:425]
- `${CLAUDE_SKILL_DIR}` 替换只在有 `baseDir` 时发生; MCP skills 没有本地 skill dir 且不会执行 shell injection。[E: skills/loadSkillsDir.ts:359][E: skills/loadSkillsDir.ts:374]
- `paths` 条件技能匹配的是 cwd-relative path; 空路径、`..` 逃逸和绝对路径会跳过。[E: skills/loadSkillsDir.ts:1014][E: skills/loadSkillsDir.ts:1021]

## Sources

- `skills/`

## 相关

- `tool.skill`
