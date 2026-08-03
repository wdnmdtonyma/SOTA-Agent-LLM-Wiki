---
id: subsys.config-auth.skills
title: Skills 系统
kind: subsystem
tier: T2
source: [codex-rs/core-skills/src/loader.rs, codex-rs/core-skills/src/loader/discovery.rs, codex-rs/core-skills/src/loader/namespace.rs, codex-rs/core-skills/src/root_loader.rs, codex-rs/core-skills/src/model.rs, codex-rs/core-skills/src/injection.rs, codex-rs/ext/skills/src/catalog_prompt.rs, codex-rs/ext/skills/src/extension.rs, codex-rs/ext/skills/src/render.rs, codex-rs/ext/skills/src/render_observability.rs, codex-rs/ext/skills/src/state.rs, codex-rs/ext/skills/src/world_state.rs, codex-rs/ext/skills/src/tools/list.rs, codex-rs/ext/skills/src/tools/read.rs, codex-rs/ext/skills/src/provider/executor.rs, codex-rs/core/src/context/world_state/mod.rs, codex-rs/core-plugins/src/manifest.rs, codex-rs/core-plugins/src/agent_plugin_manifest.rs, codex-rs/utils/plugins/src/plugin_namespace.rs, codex-rs/skills/src/lib.rs, docs/skills.md]
symbols: [SkillMetadata, SkillRoot, SkillLoadOutcome, SkillDiscovery, SkillNamespaceResolver, discover_skills, build_skill_injections, HostSkillsCatalogInWorldState, SkillsExtension, skill_metadata_budget, render_available_skills, render_combined_available_skills, CatalogSurface, ListTool, ReadTool, ExecutorSkillProvider, install_system_skills]
related: [spine.extension-system, subsys.config-auth.plugins, subsys.config-auth.config-loading, subsys.core.instruction-assembly, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 7750465934
---

> Codex skills 系统的 ownership 已拆开：`core-skills` 仍负责 host root discovery、metadata model 与 legacy explicit injection；`ext/skills` 统一持有 host/executor/orchestrator provider catalog、model-visible rendering、WorldState/turn-input 投影、resource tools 与预算观测。[E: codex-rs/core-skills/src/loader.rs:240][E: codex-rs/core-skills/src/model.rs:15][E: codex-rs/core-skills/src/injection.rs:72][E: codex-rs/ext/skills/src/extension.rs:512][E: codex-rs/ext/skills/src/render.rs:467][E: codex-rs/ext/skills/src/world_state.rs:26]

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

`SkillMetadata` 包含 name、description、short_description、interface、dependencies、policy、path_to_skills_md、scope 和 plugin_id；`allows_implicit_invocation()` 在 policy field 缺失时默认允许隐式调用。[E: codex-rs/core-skills/src/model.rs:15][E: codex-rs/core-skills/src/model.rs:16][E: codex-rs/core-skills/src/model.rs:18][E: codex-rs/core-skills/src/model.rs:19][E: codex-rs/core-skills/src/model.rs:20][E: codex-rs/core-skills/src/model.rs:21][E: codex-rs/core-skills/src/model.rs:24][E: codex-rs/core-skills/src/model.rs:24][E: codex-rs/core-skills/src/model.rs:25][E: codex-rs/core-skills/src/model.rs:29][E: codex-rs/core-skills/src/model.rs:33]

`SkillPolicy` 支持 `allow_implicit_invocation` 和 product restrictions；product filtering 会保留匹配当前 product 的 skills，并同步裁剪 file-system map。[E: codex-rs/core-skills/src/model.rs:53][E: codex-rs/core-skills/src/model.rs:54][E: codex-rs/core-skills/src/model.rs:56][E: codex-rs/core-skills/src/model.rs:36][E: codex-rs/core-skills/src/model.rs:139][E: codex-rs/core-skills/src/model.rs:143][E: codex-rs/core-skills/src/model.rs:152]

`SkillLoadOutcome` 保存 loaded skills、parse errors、disabled paths、skill roots、path-to-root map、skill-specific file systems 和 implicit lookup indexes；helper 会按 disabled path 与 implicit policy 判断 skill 是否可用。[E: codex-rs/core-skills/src/model.rs:25][E: codex-rs/core-skills/src/model.rs:26][E: codex-rs/core-skills/src/model.rs:28][E: codex-rs/core-skills/src/model.rs:29][E: codex-rs/core-skills/src/model.rs:31][E: codex-rs/core-skills/src/model.rs:32][E: codex-rs/core-skills/src/model.rs:37][E: codex-rs/core-skills/src/model.rs:41]

## Root discovery

`skill_roots` 从 config layer stack、plugin skill roots、extra skill roots 和 repo `.agents/skills` 组合 root list，最后按 path 去重。[E: codex-rs/core-skills/src/loader.rs:240][E: codex-rs/core-skills/src/loader.rs:268][E: codex-rs/core-skills/src/loader.rs:269][E: codex-rs/core-skills/src/loader.rs:278][E: codex-rs/core-skills/src/loader.rs:287][E: codex-rs/core-skills/src/loader.rs:288]

Config layer roots 以 `HighestPrecedenceFirst` 且 `include_disabled=true` 遍历；Project layer 贡献 repo-scoped `.codex/skills`，User layer 贡献 deprecated `$CODEX_HOME/skills`、`$HOME/.agents/skills` 和 embedded system cache root，System layer 贡献 admin-scoped `/etc/codex/skills`。[E: codex-rs/core-skills/src/loader.rs:292][E: codex-rs/core-skills/src/loader.rs:299][E: codex-rs/core-skills/src/loader.rs:308][E: codex-rs/core-skills/src/loader.rs:321][E: codex-rs/core-skills/src/loader.rs:359]

Repo `.agents/skills` discovery 会基于 project root markers 找到 project root 到 cwd 之间的 dirs，并以最多 256 个并发 metadata probes 检查这些 roots；project-root marker 的 ancestor probes 也使用同一并发上限。[E: codex-rs/core-skills/src/loader.rs:383][E: codex-rs/core-skills/src/loader.rs:391][E: codex-rs/core-skills/src/loader.rs:395][E: codex-rs/core-skills/src/loader.rs:405][E: codex-rs/core-skills/src/loader.rs:452][E: codex-rs/core-skills/src/loader.rs:468][E: codex-rs/core-skills/src/loader.rs:474]

Plugin roots 会带 `plugin_id`、`plugin_namespace` 和 `plugin_root`，进入 loader 后以 User scope 参与发现；`SkillNamespaceResolver` 每轮 scan 一次性解析相关 manifest，precedence 是显式 namespace > 最深 canonical-symlink/nested-plugin root > scan root inherited namespace，避免为 sibling skills 重复 ancestor probes。[E: codex-rs/core-skills/src/loader.rs:269][E: codex-rs/core-skills/src/loader.rs:285][E: codex-rs/core-skills/src/loader/namespace.rs:39][E: codex-rs/core-skills/src/loader/namespace.rs:150]

本地主机 plugin discovery 现在先检查 root `plugin.json`：带 Agent Plugins schema 的文件优先于 legacy nested manifests；parser 的 compatibility projection 默认把 skills root 设为 `./skills`，并可叠加 `.codex-plugin/plugin.json` overlay。没有 Agent Plugins schema 的 root file 不会遮蔽 legacy paths。[E: codex-rs/utils/plugins/src/plugin_namespace.rs:41][E: codex-rs/utils/plugins/src/plugin_namespace.rs:48][E: codex-rs/utils/plugins/src/plugin_namespace.rs:54][E: codex-rs/utils/plugins/src/plugin_namespace.rs:61][E: codex-rs/core-plugins/src/manifest.rs:145][E: codex-rs/core-plugins/src/manifest.rs:148][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:158]

## File discovery 与 parsing

`discover_skills` 通过 executor filesystem 的 `walk` 做一次 inventory，限制 depth 6、directory 2000、entry 20000；walk error/truncation 会变成 warning。user/admin/repo roots 跟随 directory symlink，system root 忽略，hidden directories 默认 prune；发现 `SKILL.md`、`agents/openai.yaml` 与嵌套 plugin roots 后再进入 parse。[E: codex-rs/core-skills/src/loader/discovery.rs:17][E: codex-rs/core-skills/src/loader/discovery.rs:54][E: codex-rs/core-skills/src/loader/discovery.rs:65][E: codex-rs/core-skills/src/loader/discovery.rs:67][E: codex-rs/core-skills/src/loader/discovery.rs:99][E: codex-rs/core-skills/src/loader/discovery.rs:110][E: codex-rs/core-skills/src/loader/discovery.rs:121][E: codex-rs/core-skills/src/loader.rs:539][E: codex-rs/core-skills/src/loader.rs:553]

`parse_skill_file` 并行读取 `SKILL.md` 与 optional metadata；同一 root 最多并发 64 个 skill load，namespace resolution 与全部 skill parse 也并行 join。frontmatter 要求 YAML delimiters，某些第三方 scalar error 会尝试 line-oriented repair，缺少 name 时用父目录名。[E: codex-rs/core-skills/src/loader.rs:654][E: codex-rs/core-skills/src/loader.rs:672][E: codex-rs/core-skills/src/loader.rs:675][E: codex-rs/core-skills/src/loader.rs:695][E: codex-rs/core-skills/src/loader.rs:714][E: codex-rs/core-skills/src/loader.rs:748][E: codex-rs/core-skills/src/loader.rs:764]

多个 roots 的扫描共享 semaphore，并在单次 load 内最多 `MAX_CONCURRENT_ROOT_SCANS=8` 个 unordered scan；完成后按原 root index 排序再 merge，因此并发不会改变 root precedence。plugin load 可复用 `PluginSkillSnapshots`，避免同一 plugin skill root 再扫一次。[E: codex-rs/core-skills/src/root_loader.rs:43][E: codex-rs/core-skills/src/root_loader.rs:51][E: codex-rs/core-skills/src/root_loader.rs:74]

Loaded metadata 会经过 length validation，最终 `SkillMetadata` 保存 resolved canonical skill path、scope 和 plugin_id。[E: codex-rs/core-skills/src/loader.rs:727][E: codex-rs/core-skills/src/loader.rs:776][E: codex-rs/core-skills/src/loader.rs:778][E: codex-rs/core-skills/src/loader.rs:730][E: codex-rs/core-skills/src/loader.rs:787][E: codex-rs/core-skills/src/loader.rs:738][E: codex-rs/core-skills/src/loader.rs:706]

## Prompt rendering 与 injection

available-skills rendering 已从删除的 `core-skills/src/render.rs` 迁入 `ext/skills`。`render_available_skills` 只取 model-visible entries，支持 core-compatible/extension-compatible description 与排序策略；发生预算压力时会比较 absolute path 与 aliased root 两种布局并选择信息保留更好的版本。[E: codex-rs/ext/skills/src/render.rs:31][E: codex-rs/ext/skills/src/render.rs:37][E: codex-rs/ext/skills/src/render.rs:467][E: codex-rs/ext/skills/src/render.rs:482][E: codex-rs/ext/skills/src/render.rs:494]

`build_skill_injections` 只处理显式提到的 skills，读取对应 `SKILL.md` 全文并输出 `SkillInjection { name, path, contents }`；读取失败只产生 warning，不阻断整个 turn。[E: codex-rs/core-skills/src/injection.rs:72][E: codex-rs/core-skills/src/injection.rs:79][E: codex-rs/core-skills/src/injection.rs:89][E: codex-rs/core-skills/src/injection.rs:94][E: codex-rs/core-skills/src/injection.rs:105][E: codex-rs/core-skills/src/injection.rs:111]

当 skills extension 已把 host catalog 投影进 WorldState 时，`HostSkillsCatalogInWorldState` marker 用来抑制 legacy thread-start catalog，避免同一 catalog 重复注入；显式 host prompt 还有单独的 `InjectedHostSkillPrompts` path set 去重。[E: codex-rs/core-skills/src/injection.rs:38][E: codex-rs/core-skills/src/injection.rs:49]

显式提及收集先处理 structured `UserInput::Skill`，再扫描文本里的 `$skill-name`，显式 links 按 path 解析，plain names 只有不歧义时才采用。[E: codex-rs/core-skills/src/injection.rs:164][E: codex-rs/core-skills/src/injection.rs:183]

## Ext skills catalog、resource tools 与预算

`skill_metadata_budget` 现在直接取 context window 的 2% token budget（没有额外 4,000-token cap）；未知 context window 时回退到 8,000 characters。超预算时先保留每行的 name/locator，再 round-robin 分配 description 空间；连最小行都放不下才省略条目，并生成 truncation/omission report。[E: codex-rs/ext/skills/src/render.rs:18][E: codex-rs/ext/skills/src/render.rs:19][E: codex-rs/ext/skills/src/render.rs:127][E: codex-rs/ext/skills/src/render.rs:132][E: codex-rs/ext/skills/src/render.rs:302][E: codex-rs/ext/skills/src/render.rs:324][E: codex-rs/ext/skills/src/render.rs:338][E: codex-rs/ext/skills/src/render.rs:408]

当 host 与 executor catalog 同时可见时，`render_combined_available_skills` 用同一个 metadata budget 联合分配，而不是让两边各拿一份 2%；extension 再把 executor 与 host 结果分别放入两个 WorldState sections。`host_skills` section 被 core 特殊插到 permissions section 之前，避免权限说明先打断 skills context。[E: codex-rs/ext/skills/src/render.rs:510][E: codex-rs/ext/skills/src/render.rs:542][E: codex-rs/ext/skills/src/extension.rs:319][E: codex-rs/ext/skills/src/extension.rs:328][E: codex-rs/ext/skills/src/extension.rs:393][E: codex-rs/ext/skills/src/extension.rs:415][E: codex-rs/core/src/context/world_state/mod.rs:308][E: codex-rs/core/src/context/world_state/mod.rs:315]

每次 render 还按 `ThreadContext`、`ExecutorWorldState`、`HostWorldState`、`TurnInput` 标记 catalog surface，向 host-provided `ExtensionMetrics` 记录 total/kept/omitted/description truncation；预算 warning 通过 extension event sink 去重后发出。[E: codex-rs/ext/skills/src/render_observability.rs:10][E: codex-rs/ext/skills/src/render_observability.rs:29][E: codex-rs/ext/skills/src/render_observability.rs:64][E: codex-rs/ext/skills/src/extension.rs:397][E: codex-rs/ext/skills/src/extension.rs:424]

`skills.list` 按 authority 列出 model-visible entries，每页最多 20 项、serialized response 最多 512 KiB，并返回后续 `skills.read` 必须原样使用的 exact `authority`、`package` 和 `main_resource`。catalog warnings 只在第一页返回；单项 metadata 自身超限时该项会被省略并附 warning。[E: codex-rs/ext/skills/src/tools/list.rs:30][E: codex-rs/ext/skills/src/tools/list.rs:31][E: codex-rs/ext/skills/src/tools/list.rs:32][E: codex-rs/ext/skills/src/tools/list.rs:43][E: codex-rs/ext/skills/src/tools/list.rs:83][E: codex-rs/ext/skills/src/tools/list.rs:96][E: codex-rs/ext/skills/src/tools/list.rs:104][E: codex-rs/ext/skills/src/tools/list.rs:113]

`skills.read` 校验 authority/package/resource handles，确认 package 对当前 authority 可用，再从 provider 读取指定 resource。它同样把单页 response 限到 512 KiB，用 opaque cursor 按 UTF-8 boundary 分页；orchestrator authority 的读取还记录 shadow selection invocation。[E: codex-rs/ext/skills/src/tools/read.rs:26][E: codex-rs/ext/skills/src/tools/read.rs:27][E: codex-rs/ext/skills/src/tools/read.rs:63][E: codex-rs/ext/skills/src/tools/read.rs:74][E: codex-rs/ext/skills/src/tools/read.rs:120][E: codex-rs/ext/skills/src/tools/read.rs:151][E: codex-rs/ext/skills/src/tools/read.rs:162][E: codex-rs/ext/skills/src/tools/read.rs:178]

`ExecutorSkillProvider` 从 selected capability roots 或 executor discovery snapshot 构造 `Executor` authority。snapshot 若内嵌 skill instructions，main resource 可携带该内容；否则 `skills.read` 通过 environment filesystem streaming 读取，并拒绝超出 provider 上限或非 UTF-8 的 resource。它不实现 executor-side search，`search()` 当前返回空结果。[E: codex-rs/ext/skills/src/provider/executor.rs:31][E: codex-rs/ext/skills/src/provider/executor.rs:49][E: codex-rs/ext/skills/src/provider/executor.rs:52][E: codex-rs/ext/skills/src/provider/executor.rs:102][E: codex-rs/ext/skills/src/provider/executor.rs:121][E: codex-rs/ext/skills/src/provider/executor.rs:162][E: codex-rs/ext/skills/src/provider/executor.rs:168][E: codex-rs/ext/skills/src/provider/executor.rs:226][E: codex-rs/ext/skills/src/provider/executor.rs:309][E: codex-rs/ext/skills/src/provider/executor.rs:323]

## Embedded system skills

Bundled system skills 用 `include_dir!` 嵌入，安装目标是 `CODEX_HOME/skills/.system`；安装时写 marker fingerprint，marker 匹配则跳过，否则清理旧目录并写入 embedded dir。[E: codex-rs/skills/src/lib.rs:22][E: codex-rs/skills/src/lib.rs:30][E: codex-rs/skills/src/lib.rs:44][E: codex-rs/skills/src/lib.rs:51][E: codex-rs/skills/src/lib.rs:53][E: codex-rs/skills/src/lib.rs:59][E: codex-rs/skills/src/lib.rs:64]

## Gotchas

- 可发现 metadata 与显式正文注入是两条路径：`ext/skills` catalog renderer 不读取每个 `SKILL.md` 全文；legacy host explicit injection 才在 `build_skill_injections` 中读取正文，extension provider path 则通过 `read_main_prompt` 读取 selected entry。[E: codex-rs/ext/skills/src/render.rs:467][E: codex-rs/core-skills/src/injection.rs:72][E: codex-rs/ext/skills/src/extension.rs:607]
- Product restriction 过滤不是安装失败；它会从当前 product 的 outcome 中删除不匹配 skills，并裁剪关联 file-system map。[E: codex-rs/core-skills/src/model.rs:139][E: codex-rs/core-skills/src/model.rs:143][E: codex-rs/core-skills/src/model.rs:152]
- Embedded system skills cache root 是 `$CODEX_HOME/skills/.system`，不等同于 project `.codex/skills` root。[E: codex-rs/skills/src/lib.rs:30]

## Sources

- `codex-rs/core-skills/src/loader.rs`
- `codex-rs/core-skills/src/loader/discovery.rs`
- `codex-rs/core-skills/src/loader/namespace.rs`
- `codex-rs/core-skills/src/root_loader.rs`
- `codex-rs/core-skills/src/model.rs`
- `codex-rs/core-skills/src/injection.rs`
- `codex-rs/ext/skills/src/catalog_prompt.rs`
- `codex-rs/ext/skills/src/extension.rs`
- `codex-rs/ext/skills/src/render.rs`
- `codex-rs/ext/skills/src/render_observability.rs`
- `codex-rs/ext/skills/src/state.rs`
- `codex-rs/ext/skills/src/world_state.rs`
- `codex-rs/ext/skills/src/tools/list.rs`
- `codex-rs/ext/skills/src/tools/read.rs`
- `codex-rs/ext/skills/src/provider/executor.rs`
- `codex-rs/core-plugins/src/manifest.rs`
- `codex-rs/core-plugins/src/agent_plugin_manifest.rs`
- `codex-rs/utils/plugins/src/plugin_namespace.rs`
- `codex-rs/skills/src/lib.rs`
- `docs/skills.md`

## 相关

- `subsys.config-auth.plugins`: plugin manifest 如何声明 skill roots。
- `subsys.config-auth.config-loading`: config layers 如何提供 skill root folders。
- `subsys.core.instruction-assembly`: rendered skills 如何进入 model-facing prompt。
- [Ext 扩展插件系统](../../spine/extension-system.md): skills extension 如何注册 discovery/catalog/provider 工具面。
