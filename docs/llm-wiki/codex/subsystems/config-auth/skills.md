---
id: subsys.config-auth.skills
title: Skills 系统
kind: subsystem
tier: T2
source: [codex-rs/core-skills/src/loader.rs, codex-rs/core-skills/src/model.rs, codex-rs/core-skills/src/injection.rs, codex-rs/core-skills/src/render.rs, codex-rs/skills/src/lib.rs, docs/skills.md]
symbols: [SkillMetadata, SkillRoot, SkillLoadOutcome, skill_roots, discover_skills_under_root, build_skill_injections, build_available_skills, install_system_skills]
related: [subsys.config-auth.plugins, subsys.config-auth.config-loading, subsys.core.instruction-assembly, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex skills 系统从 user/system/project/plugin 等 roots 发现 `SKILL.md`，解析 metadata 与 optional `agents/openai.yaml`，把可用 skills 渲染进提示词，并把显式提到的 skill body 注入当前 turn。[E: codex-rs/core-skills/src/loader.rs:157][E: codex-rs/core-skills/src/loader.rs:426][E: codex-rs/core-skills/src/render.rs:72][E: codex-rs/core-skills/src/injection.rs:31]

## 能回答的问题

- Codex 会从哪些目录发现 skills？
- `SKILL.md` frontmatter 和 `agents/openai.yaml` 分别负责什么？
- skill enable/implicit/product policy 怎样过滤可用 skill？
- `$skill-name` 和 structured `UserInput::Skill` 怎样触发 skill injection？
- core embedded skills 怎样安装到 cache 目录？

## 职责边界

skills 节点覆盖 skill root discovery、metadata parsing、prompt rendering、explicit injection 和 embedded core skills 安装。`docs/skills.md` 只链接到 OpenAI developer docs，不是源码级 schema。[E: docs/skills.md:1][E: docs/skills.md:3]

## 数据模型

`SkillMetadata` 包含 name、description、short_description、interface、dependencies、policy、path_to_skills_md 和 scope。[E: codex-rs/core-skills/src/model.rs:12][E: codex-rs/core-skills/src/model.rs:13][E: codex-rs/core-skills/src/model.rs:21] skill 是否允许 implicit invocation 由 `policy.allow_implicit_invocation` 决定；该字段缺失时默认允许 implicit invocation。[E: codex-rs/core-skills/src/model.rs:24][E: codex-rs/core-skills/src/model.rs:29]

`SkillPolicy` 支持 `allow_implicit_invocation` 和 product restrictions；`SkillInterface` 支持 display/icon/brand/default_prompt metadata；`SkillDependencies` 保存 tool dependencies。[E: codex-rs/core-skills/src/model.rs:49][E: codex-rs/core-skills/src/model.rs:50][E: codex-rs/core-skills/src/model.rs:53][E: codex-rs/core-skills/src/model.rs:57][E: codex-rs/core-skills/src/model.rs:63][E: codex-rs/core-skills/src/model.rs:67][E: codex-rs/core-skills/src/model.rs:68]

`SkillLoadOutcome` 保存 loaded skills、parse errors、disabled paths、skill-specific file systems 和 implicit-skill indexes；helper 方法会按 disabled paths 和 implicit policy 判断 skill 是否 enabled 或 allowed for implicit invocation。[E: codex-rs/core-skills/src/model.rs:87][E: codex-rs/core-skills/src/model.rs:94][E: codex-rs/core-skills/src/model.rs:97][E: codex-rs/core-skills/src/model.rs:102]

## Root discovery 与 parsing

`skill_roots` 会从 config layer、plugin roots 和 repo `.agents/skills` roots 组合 root list，并通过 `dedupe_skill_roots_by_path` 按路径去重。[E: codex-rs/core-skills/src/loader.rs:207][E: codex-rs/core-skills/src/loader.rs:232][E: codex-rs/core-skills/src/loader.rs:238][E: codex-rs/core-skills/src/loader.rs:239] config layer roots 按 `HighestPrecedenceFirst` 且 `include_disabled=true` 遍历，说明 disabled layer 仍可贡献 root 记录或被后续逻辑处理。[E: codex-rs/core-skills/src/loader.rs:250][E: codex-rs/core-skills/src/loader.rs:252]

project skill root 是 `.codex/skills`；System config layer 下的 `/etc/codex/skills` 被作为 Admin-scoped skill root，embedded system skills cache 才是 `CODEX_HOME/skills/.system`。[E: codex-rs/core-skills/src/loader.rs:258][E: codex-rs/core-skills/src/loader.rs:294][E: codex-rs/core-skills/src/loader.rs:298][E: codex-rs/core-skills/src/loader.rs:299][E: codex-rs/core-skills/src/loader.rs:286][E: codex-rs/core-skills/src/loader.rs:289][E: codex-rs/core-skills/src/loader.rs:290] repo `.agents/skills` discovery 会围绕 project markers 找到 project root 到 cwd 之间的目录，并只把存在且是目录的 `.agents/skills` 作为 Repo root。[E: codex-rs/core-skills/src/loader.rs:313][E: codex-rs/core-skills/src/loader.rs:321][E: codex-rs/core-skills/src/loader.rs:323][E: codex-rs/core-skills/src/loader.rs:326][E: codex-rs/core-skills/src/loader.rs:328]

`discover_skills_under_root` 负责遍历单个 skill root，`parse_skill_file` 读取 `SKILL.md`、解析 frontmatter、推导 default name，并尝试读取 optional `agents/openai.yaml` metadata。[E: codex-rs/core-skills/src/loader.rs:426][E: codex-rs/core-skills/src/loader.rs:568][E: codex-rs/core-skills/src/loader.rs:578][E: codex-rs/core-skills/src/loader.rs:631][E: codex-rs/core-skills/src/loader.rs:654]

plugin skill path 会通过 `plugin_namespace_for_skill_path` 生成 namespaced skill name；有 namespace 时输出 `<namespace>:<base_name>`，没有 namespace 时保留 base name。[E: codex-rs/core-skills/src/loader.rs:643][E: codex-rs/core-skills/src/loader.rs:648][E: codex-rs/core-skills/src/loader.rs:650][E: codex-rs/core-skills/src/loader.rs:651]

## Prompt rendering 与 injection

`default_skill_metadata_budget` 根据 context window 计算默认 metadata budget；`build_available_skills` 接收 budget 后调用 `render_skill_lines` 按预算循环渲染 skill line。[E: codex-rs/core-skills/src/render.rs:55][E: codex-rs/core-skills/src/render.rs:72][E: codex-rs/core-skills/src/render.rs:74][E: codex-rs/core-skills/src/render.rs:87][E: codex-rs/core-skills/src/render.rs:130] skill line ordering 按 scope priority、name 和 path 排序；scope priority 是 System、Admin、Repo、User。[E: codex-rs/core-skills/src/render.rs:161][E: codex-rs/core-skills/src/render.rs:164][E: codex-rs/core-skills/src/render.rs:172]

`build_skill_injections` 读取显式触发的 `SKILL.md` 内容，并用 skill 的 name/path/contents 构造 `SkillInjection`，同时记录 metrics 与 warnings。[E: codex-rs/core-skills/src/injection.rs:25][E: codex-rs/core-skills/src/injection.rs:31][E: codex-rs/core-skills/src/injection.rs:53][E: codex-rs/core-skills/src/injection.rs:64][E: codex-rs/core-skills/src/injection.rs:68][E: codex-rs/core-skills/src/injection.rs:80] explicit trigger 来源包括 structured `UserInput::Skill` 和 `$skill-name` mention；源码注释把这两条称为 explicit mention collection。[E: codex-rs/core-skills/src/injection.rs:106][E: codex-rs/core-skills/src/injection.rs:114][E: codex-rs/core-skills/src/injection.rs:156]

## Embedded core skills

`codex-rs/skills/src/lib.rs` 使用 `include_dir!` 嵌入 bundled skills，并用 cache root 保存安装结果。[E: codex-rs/skills/src/lib.rs:10][E: codex-rs/skills/src/lib.rs:17] `install_system_skills` 创建 root/marker，按 fingerprint 跳过或重写目录，并递归写入文件。[E: codex-rs/skills/src/lib.rs:32][E: codex-rs/skills/src/lib.rs:34][E: codex-rs/skills/src/lib.rs:39][E: codex-rs/skills/src/lib.rs:41][E: codex-rs/skills/src/lib.rs:52][E: codex-rs/skills/src/lib.rs:101][E: codex-rs/skills/src/lib.rs:121]

## 设计动机与权衡

skills 系统把“可发现 metadata”和“显式注入正文”拆成两步：模型先看到可用 skill 清单，只有用户或系统明确触发时才读取完整 `SKILL.md` body。[I] 这个设计由 `build_available_skills` 和 `build_skill_injections` 的分离体现。[E: codex-rs/core-skills/src/render.rs:72][E: codex-rs/core-skills/src/injection.rs:31]

optional `agents/openai.yaml` 的解析是 fail-open：文件缺失或不是文件时静默返回 default metadata，异常 stat/read/parse 错误才记录 warning 并返回 default metadata，而不是让 `SKILL.md` 加载失败。[E: codex-rs/core-skills/src/loader.rs:654][E: codex-rs/core-skills/src/loader.rs:658][E: codex-rs/core-skills/src/loader.rs:667][E: codex-rs/core-skills/src/loader.rs:668][E: codex-rs/core-skills/src/loader.rs:671][E: codex-rs/core-skills/src/loader.rs:683][E: codex-rs/core-skills/src/loader.rs:697][E: codex-rs/core-skills/src/loader.rs:703]

## Gotchas

- `matches_product_restriction_for_product` 和 `filter_skill_load_outcome_for_product` 会按 product restriction 过滤 skill；不匹配当前 product 的 skill 不能简单视为未安装。[E: codex-rs/core-skills/src/model.rs:32][E: codex-rs/core-skills/src/model.rs:164][E: codex-rs/core-skills/src/model.rs:196]
- `$skill-name` mention 是显式触发路径之一，但必须匹配 loader 发现的 skill name/namespace 才能注入。[I]
- embedded core skills 安装会写入 cache 目录，不等同于项目 `.codex/skills` root。[E: codex-rs/skills/src/lib.rs:17][E: codex-rs/skills/src/lib.rs:24]

## Sources

- `codex-rs/core-skills/src/loader.rs`
- `codex-rs/core-skills/src/model.rs`
- `codex-rs/core-skills/src/injection.rs`
- `codex-rs/core-skills/src/render.rs`
- `codex-rs/skills/src/lib.rs`
- `docs/skills.md`

## 相关

- `subsys.config-auth.plugins`: plugin 如何贡献 skill root 与 namespace。
- `subsys.core.instruction-assembly`: skill metadata/body 如何进入 prompt。
- `config.skills-plugins-features`: skills 配置入口。
