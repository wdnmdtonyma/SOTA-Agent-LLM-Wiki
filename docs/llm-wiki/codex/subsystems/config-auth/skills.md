---
id: subsys.config-auth.skills
title: Skills 系统
kind: subsystem
tier: T2
source: [codex-rs/core-skills/src/loader.rs, codex-rs/core-skills/src/loader/discovery.rs, codex-rs/core-skills/src/loader/namespace.rs, codex-rs/core-skills/src/root_loader.rs, codex-rs/core-skills/src/model.rs, codex-rs/core-skills/src/injection.rs, codex-rs/core-skills/src/render.rs, codex-rs/skills/src/lib.rs, docs/skills.md]
symbols: [SkillMetadata, SkillRoot, SkillLoadOutcome, SkillDiscovery, SkillNamespaceResolver, discover_skills, build_skill_injections, HostSkillsCatalogInWorldState, build_available_skills, install_system_skills]
related: [spine.extension-system, subsys.config-auth.plugins, subsys.config-auth.config-loading, subsys.core.instruction-assembly, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Codex skills 系统从 config layer、plugin roots、extra roots 和 repo `.agents/skills` roots 组成 `SkillRoot` 列表，递归发现 `SKILL.md`，解析 frontmatter/metadata/dependencies/policy，把可隐式调用的 skills 渲染进提示词，并在显式提及时读取完整 skill body 注入 turn。[E: codex-rs/core-skills/src/loader.rs:253][E: codex-rs/core-skills/src/loader.rs:281][E: codex-rs/core-skills/src/loader.rs:298][E: codex-rs/core-skills/src/loader.rs:498][E: codex-rs/core-skills/src/model.rs:15][E: codex-rs/core-skills/src/render.rs:155][E: codex-rs/core-skills/src/injection.rs:71]

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

`skill_roots` 从 config layer stack、plugin skill roots、extra skill roots 和 repo `.agents/skills` 组合 root list，最后按 path 去重。[E: codex-rs/core-skills/src/loader.rs:253][E: codex-rs/core-skills/src/loader.rs:281][E: codex-rs/core-skills/src/loader.rs:282][E: codex-rs/core-skills/src/loader.rs:290][E: codex-rs/core-skills/src/loader.rs:298][E: codex-rs/core-skills/src/loader.rs:299]

Config layer roots 以 `HighestPrecedenceFirst` 且 `include_disabled=true` 遍历；Project layer 贡献 repo-scoped `.codex/skills`，User layer 贡献 deprecated `$CODEX_HOME/skills`、`$HOME/.agents/skills` 和 embedded system cache root，System layer 贡献 admin-scoped `/etc/codex/skills`。[E: codex-rs/core-skills/src/loader.rs:303][E: codex-rs/core-skills/src/loader.rs:310][E: codex-rs/core-skills/src/loader.rs:312][E: codex-rs/core-skills/src/loader.rs:319][E: codex-rs/core-skills/src/loader.rs:331][E: codex-rs/core-skills/src/loader.rs:343][E: codex-rs/core-skills/src/loader.rs:355][E: codex-rs/core-skills/src/loader.rs:366]

Repo `.agents/skills` discovery 会基于 project root markers 找到 project root 到 cwd 之间的 dirs，并以最多 256 个并发 metadata probes 检查这些 roots；project-root marker 的 ancestor probes 也使用同一并发上限。[E: codex-rs/core-skills/src/loader.rs:389][E: codex-rs/core-skills/src/loader.rs:397][E: codex-rs/core-skills/src/loader.rs:401][E: codex-rs/core-skills/src/loader.rs:411][E: codex-rs/core-skills/src/loader.rs:457][E: codex-rs/core-skills/src/loader.rs:473][E: codex-rs/core-skills/src/loader.rs:479]

Plugin roots 会带 `plugin_id`、`plugin_namespace` 和 `plugin_root`，进入 loader 后以 User scope 参与发现；`SkillNamespaceResolver` 每轮 scan 一次性解析相关 manifest，precedence 是显式 namespace > 最深 canonical-symlink/nested-plugin root > scan root inherited namespace，避免为 sibling skills 重复 ancestor probes。[E: codex-rs/core-skills/src/loader.rs:282][E: codex-rs/core-skills/src/loader.rs:286][E: codex-rs/core-skills/src/loader/namespace.rs:10][E: codex-rs/core-skills/src/loader/namespace.rs:20][E: codex-rs/core-skills/src/loader/namespace.rs:39][E: codex-rs/core-skills/src/loader/namespace.rs:150]

## File discovery 与 parsing

`discover_skills` 通过 executor filesystem 的 `walk` 做一次 inventory，限制 depth 6、directory 2000、entry 20000；walk error/truncation 会变成 warning。user/admin/repo roots 跟随 directory symlink，system root 忽略，hidden directories 默认 prune；发现 `SKILL.md`、`agents/openai.yaml` 与嵌套 plugin roots 后再进入 parse。[E: codex-rs/core-skills/src/loader/discovery.rs:16][E: codex-rs/core-skills/src/loader/discovery.rs:52][E: codex-rs/core-skills/src/loader/discovery.rs:63][E: codex-rs/core-skills/src/loader/discovery.rs:67][E: codex-rs/core-skills/src/loader/discovery.rs:94][E: codex-rs/core-skills/src/loader/discovery.rs:105][E: codex-rs/core-skills/src/loader/discovery.rs:116][E: codex-rs/core-skills/src/loader.rs:546][E: codex-rs/core-skills/src/loader.rs:560]

`parse_skill_file` 并行读取 `SKILL.md` 与 optional metadata；同一 root 最多并发 64 个 skill load，namespace resolution 与全部 skill parse 也并行 join。frontmatter 要求 YAML delimiters，某些第三方 scalar error 会尝试 line-oriented repair，缺少 name 时用父目录名。[E: codex-rs/core-skills/src/loader.rs:621][E: codex-rs/core-skills/src/loader.rs:639][E: codex-rs/core-skills/src/loader.rs:642][E: codex-rs/core-skills/src/loader.rs:662][E: codex-rs/core-skills/src/loader.rs:681][E: codex-rs/core-skills/src/loader.rs:714][E: codex-rs/core-skills/src/loader.rs:730]

多个 roots 的扫描共享 semaphore，并在单次 load 内最多 `MAX_CONCURRENT_ROOT_SCANS=8` 个 unordered scan；完成后按原 root index 排序再 merge，因此并发不会改变 root precedence。plugin load 可复用 `PluginSkillSnapshots`，避免同一 plugin skill root 再扫一次。[E: codex-rs/core-skills/src/root_loader.rs:43][E: codex-rs/core-skills/src/root_loader.rs:51][E: codex-rs/core-skills/src/root_loader.rs:53][E: codex-rs/core-skills/src/root_loader.rs:73][E: codex-rs/core-skills/src/root_loader.rs:101][E: codex-rs/core-skills/src/root_loader.rs:105]

Loaded metadata 会经过 length validation，最终 `SkillMetadata` 保存 resolved canonical skill path、scope 和 plugin_id。[E: codex-rs/core-skills/src/loader.rs:694][E: codex-rs/core-skills/src/loader.rs:742][E: codex-rs/core-skills/src/loader.rs:744][E: codex-rs/core-skills/src/loader.rs:697][E: codex-rs/core-skills/src/loader.rs:753][E: codex-rs/core-skills/src/loader.rs:705][E: codex-rs/core-skills/src/loader.rs:706]

## Prompt rendering 与 injection

`default_skill_metadata_budget` 从 context window 计算 token budget，否则回退到 character budget；`build_available_skills` 只渲染 allowed-for-implicit skills，为 prompt 构造 skill root aliases、skill lines、render report 和 warning。[E: codex-rs/core-skills/src/render.rs:138][E: codex-rs/core-skills/src/render.rs:142][E: codex-rs/core-skills/src/render.rs:150][E: codex-rs/core-skills/src/render.rs:155][E: codex-rs/core-skills/src/render.rs:160][E: codex-rs/core-skills/src/render.rs:172]

`build_skill_injections` 只处理显式提到的 skills，读取对应 `SKILL.md` 全文并输出 `SkillInjection { name, path, contents }`；读取失败只产生 warning，不阻断整个 turn。[E: codex-rs/core-skills/src/injection.rs:71][E: codex-rs/core-skills/src/injection.rs:78][E: codex-rs/core-skills/src/injection.rs:88][E: codex-rs/core-skills/src/injection.rs:93][E: codex-rs/core-skills/src/injection.rs:103][E: codex-rs/core-skills/src/injection.rs:109]

当 skills extension 已把 host catalog 投影进 WorldState 时，`HostSkillsCatalogInWorldState` marker 用来抑制 legacy thread-start catalog，避免同一 catalog 重复注入；显式 host prompt 还有单独的 `InjectedHostSkillPrompts` path set 去重。[E: codex-rs/core-skills/src/injection.rs:32][E: codex-rs/core-skills/src/injection.rs:37][E: codex-rs/core-skills/src/injection.rs:42][E: codex-rs/core-skills/src/injection.rs:48]

显式提及收集先处理 structured `UserInput::Skill`，再扫描文本里的 `$skill-name`，显式 links 按 path 解析，plain names 只有不歧义时才采用。[E: codex-rs/core-skills/src/injection.rs:146][E: codex-rs/core-skills/src/injection.rs:148][E: codex-rs/core-skills/src/injection.rs:151][E: codex-rs/core-skills/src/injection.rs:157][E: codex-rs/core-skills/src/injection.rs:176]

## Embedded system skills

Bundled system skills 用 `include_dir!` 嵌入，安装目标是 `CODEX_HOME/skills/.system`；安装时写 marker fingerprint，marker 匹配则跳过，否则清理旧目录并写入 embedded dir。[E: codex-rs/skills/src/lib.rs:10][E: codex-rs/skills/src/lib.rs:18][E: codex-rs/skills/src/lib.rs:24][E: codex-rs/skills/src/lib.rs:32][E: codex-rs/skills/src/lib.rs:39][E: codex-rs/skills/src/lib.rs:41][E: codex-rs/skills/src/lib.rs:47][E: codex-rs/skills/src/lib.rs:52]

## Gotchas

- 可发现 metadata 与显式正文注入是两条路径：available skills prompt 不读取每个 `SKILL.md` 全文，explicit injection 才读取全文。[E: codex-rs/core-skills/src/render.rs:155][E: codex-rs/core-skills/src/injection.rs:71]
- Product restriction 过滤不是安装失败；它会从当前 product 的 outcome 中删除不匹配 skills，并裁剪关联 file-system map。[E: codex-rs/core-skills/src/model.rs:196][E: codex-rs/core-skills/src/model.rs:200][E: codex-rs/core-skills/src/model.rs:209]
- Embedded system skills cache root 是 `$CODEX_HOME/skills/.system`，不等同于 project `.codex/skills` root。[E: codex-rs/skills/src/lib.rs:18][E: codex-rs/core-skills/src/loader.rs:355]

## Sources

- `codex-rs/core-skills/src/loader.rs`
- `codex-rs/core-skills/src/loader/discovery.rs`
- `codex-rs/core-skills/src/loader/namespace.rs`
- `codex-rs/core-skills/src/root_loader.rs`
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
