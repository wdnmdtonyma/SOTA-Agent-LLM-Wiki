---
id: subsys.config-auth.skills
title: Skills 系统
kind: subsystem
tier: T2
source: [codex-rs/core-skills/src/loader.rs, codex-rs/core-skills/src/model.rs, codex-rs/core-skills/src/injection.rs, codex-rs/core-skills/src/render.rs, codex-rs/skills/src/lib.rs, docs/skills.md]
symbols: [SkillMetadata, SkillRoot, SkillLoadOutcome, skill_roots, discover_skills_under_root, build_skill_injections, build_available_skills, install_system_skills]
related: [spine.extension-system, subsys.config-auth.plugins, subsys.config-auth.config-loading, subsys.core.instruction-assembly, config.skills-plugins-features]
evidence: explicit
status: verified
updated: db887d03e1
---

> Codex skills 系统从 config layer、plugin roots、extra roots 和 repo `.agents/skills` roots 组成 `SkillRoot` 列表，递归发现 `SKILL.md`，解析 frontmatter/metadata/dependencies/policy，把可隐式调用的 skills 渲染进提示词，并在显式提及时读取完整 skill body 注入 turn。[E: codex-rs/core-skills/src/loader.rs:237][E: codex-rs/core-skills/src/loader.rs:265][E: codex-rs/core-skills/src/loader.rs:282][E: codex-rs/core-skills/src/loader.rs:498][E: codex-rs/core-skills/src/model.rs:15][E: codex-rs/core-skills/src/render.rs:155][E: codex-rs/core-skills/src/injection.rs:63]

## 能回答的问题

- skills 会从哪些 roots 发现？
- plugin skills 如何 namespace 化？
- `SKILL.md` frontmatter、optional metadata 和 product restrictions 如何解析？
- available-skills prompt 如何控制预算和排序？
- 显式 skill injection 和隐式 skill listing 有什么区别？
- embedded system skills 如何安装到 `$CODEX_HOME/skills/.system`？

## 职责边界

skills 节点覆盖 root discovery、metadata parsing、prompt rendering、explicit injection 和 embedded system skills 安装。`docs/skills.md` 只是链接到 OpenAI developer docs，不是源码级 schema。[E: docs/skills.md:1][E: docs/skills.md:3]

Plugin manifest 的 skills root 声明由 `subsys.config-auth.plugins` 覆盖；本节点只解释 plugin roots 进入 skill loader 后如何 namespace 和发现。

## 数据模型

`SkillMetadata` 包含 name、description、short_description、interface、dependencies、policy、path_to_skills_md、scope 和 plugin_id；`allows_implicit_invocation()` 在 policy field 缺失时默认允许隐式调用。[E: codex-rs/core-skills/src/model.rs:15][E: codex-rs/core-skills/src/model.rs:16][E: codex-rs/core-skills/src/model.rs:18][E: codex-rs/core-skills/src/model.rs:19][E: codex-rs/core-skills/src/model.rs:20][E: codex-rs/core-skills/src/model.rs:21][E: codex-rs/core-skills/src/model.rs:23][E: codex-rs/core-skills/src/model.rs:24][E: codex-rs/core-skills/src/model.rs:25][E: codex-rs/core-skills/src/model.rs:29][E: codex-rs/core-skills/src/model.rs:33]

`SkillPolicy` 支持 `allow_implicit_invocation` 和 product restrictions；product filtering 会保留匹配当前 product 的 skills，并同步裁剪 file-system map。[E: codex-rs/core-skills/src/model.rs:53][E: codex-rs/core-skills/src/model.rs:54][E: codex-rs/core-skills/src/model.rs:57][E: codex-rs/core-skills/src/model.rs:36][E: codex-rs/core-skills/src/model.rs:196][E: codex-rs/core-skills/src/model.rs:200][E: codex-rs/core-skills/src/model.rs:209]

`SkillLoadOutcome` 保存 loaded skills、parse errors、disabled paths、skill roots、path-to-root map、skill-specific file systems 和 implicit lookup indexes；helper 会按 disabled path 与 implicit policy 判断 skill 是否可用。[E: codex-rs/core-skills/src/model.rs:92][E: codex-rs/core-skills/src/model.rs:93][E: codex-rs/core-skills/src/model.rs:95][E: codex-rs/core-skills/src/model.rs:96][E: codex-rs/core-skills/src/model.rs:98][E: codex-rs/core-skills/src/model.rs:99][E: codex-rs/core-skills/src/model.rs:104][E: codex-rs/core-skills/src/model.rs:108]

## Root discovery

`skill_roots` 从 config layer stack、plugin skill roots、extra skill roots 和 repo `.agents/skills` 组合 root list，最后按 path 去重。[E: codex-rs/core-skills/src/loader.rs:237][E: codex-rs/core-skills/src/loader.rs:265][E: codex-rs/core-skills/src/loader.rs:266][E: codex-rs/core-skills/src/loader.rs:274][E: codex-rs/core-skills/src/loader.rs:282][E: codex-rs/core-skills/src/loader.rs:283]

Config layer roots 以 `HighestPrecedenceFirst` 且 `include_disabled=true` 遍历；Project layer 贡献 repo-scoped `.codex/skills`，User layer 贡献 deprecated `$CODEX_HOME/skills`、`$HOME/.agents/skills` 和 embedded system cache root，System layer 贡献 admin-scoped `/etc/codex/skills`。[E: codex-rs/core-skills/src/loader.rs:287][E: codex-rs/core-skills/src/loader.rs:294][E: codex-rs/core-skills/src/loader.rs:296][E: codex-rs/core-skills/src/loader.rs:303][E: codex-rs/core-skills/src/loader.rs:315][E: codex-rs/core-skills/src/loader.rs:327][E: codex-rs/core-skills/src/loader.rs:339][E: codex-rs/core-skills/src/loader.rs:350]

Repo `.agents/skills` discovery 会基于 project root markers 找到 project root 到 cwd 之间的 dirs，并只把存在且是目录的 `.agents/skills` 加入 Repo root。[E: codex-rs/core-skills/src/loader.rs:373][E: codex-rs/core-skills/src/loader.rs:381][E: codex-rs/core-skills/src/loader.rs:383][E: codex-rs/core-skills/src/loader.rs:385][E: codex-rs/core-skills/src/loader.rs:386][E: codex-rs/core-skills/src/loader.rs:389]

Plugin roots 会带 `plugin_id`、`plugin_namespace` 和 `plugin_root`，进入 loader 后以 User scope 参与发现；skill name 优先使用传入的 plugin namespace，否则从 ancestor plugin manifest 推导 namespace。[E: codex-rs/core-skills/src/loader.rs:266][E: codex-rs/core-skills/src/loader.rs:270][E: codex-rs/core-skills/src/loader.rs:271][E: codex-rs/core-skills/src/loader.rs:272][E: codex-rs/core-skills/src/loader.rs:821][E: codex-rs/core-skills/src/loader.rs:827][E: codex-rs/core-skills/src/loader.rs:830]

## File discovery 与 parsing

`discover_skills_under_root` 只扫描目录 roots；user/admin/repo skills 会跟随 symlinked directories，system skills 不跟随；扫描会跳过 dotfiles，发现 `SKILL.md` 时调用 `parse_skill_file`。[E: codex-rs/core-skills/src/loader.rs:498][E: codex-rs/core-skills/src/loader.rs:510][E: codex-rs/core-skills/src/loader.rs:541][E: codex-rs/core-skills/src/loader.rs:677][E: codex-rs/core-skills/src/loader.rs:567][E: codex-rs/core-skills/src/loader.rs:599][E: codex-rs/core-skills/src/loader.rs:638]

`parse_skill_file` 读取 `SKILL.md`、要求 frontmatter、解析 YAML，某些第三方 scalar field YAML error 会尝试 line-oriented repair；缺少 name 时用父目录名作为 default name。[E: codex-rs/core-skills/src/loader.rs:717][E: codex-rs/core-skills/src/loader.rs:725][E: codex-rs/core-skills/src/loader.rs:763][E: codex-rs/core-skills/src/loader.rs:765][E: codex-rs/core-skills/src/loader.rs:767][E: codex-rs/core-skills/src/loader.rs:779][E: codex-rs/core-skills/src/loader.rs:784]

Loaded metadata 会经过 length validation，最终 `SkillMetadata` 保存 resolved canonical skill path、scope 和 plugin_id。[E: codex-rs/core-skills/src/loader.rs:739][E: codex-rs/core-skills/src/loader.rs:742][E: codex-rs/core-skills/src/loader.rs:744][E: codex-rs/core-skills/src/loader.rs:746][E: codex-rs/core-skills/src/loader.rs:753][E: codex-rs/core-skills/src/loader.rs:754][E: codex-rs/core-skills/src/loader.rs:755]

## Prompt rendering 与 injection

`default_skill_metadata_budget` 从 context window 计算 token budget，否则回退到 character budget；`build_available_skills` 只渲染 allowed-for-implicit skills，为 prompt 构造 skill root aliases、skill lines、render report 和 warning。[E: codex-rs/core-skills/src/render.rs:138][E: codex-rs/core-skills/src/render.rs:142][E: codex-rs/core-skills/src/render.rs:150][E: codex-rs/core-skills/src/render.rs:155][E: codex-rs/core-skills/src/render.rs:160][E: codex-rs/core-skills/src/render.rs:172]

`build_skill_injections` 只处理显式提到的 skills，读取对应 `SKILL.md` 全文并输出 `SkillInjection { name, path, contents }`；读取失败只产生 warning，不阻断整个 turn。[E: codex-rs/core-skills/src/injection.rs:63][E: codex-rs/core-skills/src/injection.rs:70][E: codex-rs/core-skills/src/injection.rs:80][E: codex-rs/core-skills/src/injection.rs:85][E: codex-rs/core-skills/src/injection.rs:95][E: codex-rs/core-skills/src/injection.rs:101]

显式提及收集先处理 structured `UserInput::Skill`，再扫描文本里的 `$skill-name`，显式 links 按 path 解析，plain names 只有不歧义时才采用。[E: codex-rs/core-skills/src/injection.rs:138][E: codex-rs/core-skills/src/injection.rs:140][E: codex-rs/core-skills/src/injection.rs:143][E: codex-rs/core-skills/src/injection.rs:149][E: codex-rs/core-skills/src/injection.rs:168]

## Embedded system skills

Bundled system skills 用 `include_dir!` 嵌入，安装目标是 `CODEX_HOME/skills/.system`；安装时写 marker fingerprint，marker 匹配则跳过，否则清理旧目录并写入 embedded dir。[E: codex-rs/skills/src/lib.rs:10][E: codex-rs/skills/src/lib.rs:18][E: codex-rs/skills/src/lib.rs:24][E: codex-rs/skills/src/lib.rs:32][E: codex-rs/skills/src/lib.rs:39][E: codex-rs/skills/src/lib.rs:41][E: codex-rs/skills/src/lib.rs:47][E: codex-rs/skills/src/lib.rs:52]

## Gotchas

- 可发现 metadata 与显式正文注入是两条路径：available skills prompt 不读取每个 `SKILL.md` 全文，explicit injection 才读取全文。[E: codex-rs/core-skills/src/render.rs:155][E: codex-rs/core-skills/src/injection.rs:63]
- Product restriction 过滤不是安装失败；它会从当前 product 的 outcome 中删除不匹配 skills，并裁剪关联 file-system map。[E: codex-rs/core-skills/src/model.rs:196][E: codex-rs/core-skills/src/model.rs:200][E: codex-rs/core-skills/src/model.rs:209]
- Embedded system skills cache root 是 `$CODEX_HOME/skills/.system`，不等同于 project `.codex/skills` root。[E: codex-rs/skills/src/lib.rs:18][E: codex-rs/core-skills/src/loader.rs:339]

## Sources

- `codex-rs/core-skills/src/loader.rs`
- `codex-rs/core-skills/src/model.rs`
- `codex-rs/core-skills/src/injection.rs`
- `codex-rs/core-skills/src/render.rs`
- `codex-rs/skills/src/lib.rs`
- `docs/skills.md`

## 相关

- `subsys.config-auth.plugins`: plugin manifest 如何声明 skill roots。
- `subsys.config-auth.config-loading`: config layers 如何提供 skill root folders。
- `subsys.core.instruction-assembly`: rendered skills 如何进入 model-facing prompt。
- [Ext 扩展插件系统](../../spine/extension-system.md): skills extension 如何注册 discovery/catalog/provider 工具面。
