---
id: subsys.config-auth.plugins
title: Plugins 系统
kind: subsystem
tier: T2
source: [codex-rs/core-plugins/src/agent_plugin_manifest.rs, codex-rs/core-plugins/src/manifest.rs, codex-rs/plugin/src/lib.rs, codex-rs/plugin/src/plugin_id.rs, codex-rs/plugin/src/load_outcome.rs, codex-rs/utils/plugins/src/plugin_namespace.rs, codex-rs/exec-server-protocol/src/protocol.rs, codex-rs/core-skills/src/loader.rs]
symbols: [PluginManifest, UriPluginManifest, parse_agent_plugin_manifest_uri, load_plugin_manifest, load_plugin_command_paths, parse_plugin_manifest_uri, PluginId, plugin_namespace_for_skill_path, LoadedPlugin, PluginLoadOutcome, PluginCapabilitySummary]
related: [subsys.config-auth.skills, subsys.config-auth.hooks, subsys.mcp.connectors, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Codex plugins 系统用 discoverable plugin manifests 描述 plugin metadata、skills、MCP servers、apps、hooks 和 interface metadata；loader 把 active plugins 汇总为 capability summaries、effective skill roots、MCP servers、apps 与 hook sources。[E: codex-rs/utils/plugins/src/plugin_namespace.rs:39][E: codex-rs/core-plugins/src/manifest.rs:36][E: codex-rs/core-plugins/src/manifest.rs:48][E: codex-rs/core-plugins/src/manifest.rs:50][E: codex-rs/core-plugins/src/manifest.rs:52][E: codex-rs/core-plugins/src/manifest.rs:54][E: codex-rs/plugin/src/load_outcome.rs:19][E: codex-rs/plugin/src/load_outcome.rs:106][E: codex-rs/plugin/src/load_outcome.rs:117][E: codex-rs/plugin/src/load_outcome.rs:156][E: codex-rs/plugin/src/load_outcome.rs:168][E: codex-rs/plugin/src/load_outcome.rs:177]

## 能回答的问题

- plugin manifest 支持哪些 top-level 和 interface 字段？
- manifest path 为什么必须是 `./...` 且不能包含 `..`？
- plugin id `<plugin>@<marketplace>` 如何解析和校验？
- active/inactive plugin 对 capability summary、skills/MCP/apps/hooks 有什么影响？
- plugin namespace 如何给 plugin skills 加前缀？

## 职责边界

plugins 节点覆盖 manifest parsing、plugin id/namespace、load outcome 和 capability summary。MCP runtime 连接与 connector auth 由 `subsys.mcp.*` 节点覆盖；skills discovery/injection 由 `subsys.config-auth.skills` 覆盖；hooks runtime 由 `subsys.config-auth.hooks` 覆盖。

## Manifest schema

### Agent Plugins root manifest

当调用方把 plugin root 的 `plugin.json` 显式交给 URI parser 时，它按 Agent Plugins 1.0 manifest 解析；只有这个 root path 走 Agent Plugins parser，`.codex-plugin/.claude-plugin/.cursor-plugin` manifest 继续走 legacy parser。[E: codex-rs/utils/plugins/src/plugin_namespace.rs:10][E: codex-rs/core-plugins/src/manifest.rs:236][E: codex-rs/core-plugins/src/manifest.rs:248]

root manifest 必须是 JSON object，并声明受支持的 `$schema`；当前 canonical schema 是 `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`。parser 识别 `$schema`、name/version/description/author/homepage/repository/license/keywords/extensions，未知字段只 warning 后忽略。[E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:16][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:27][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:63][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:80][E: codex-rs/utils/plugins/src/plugin_namespace.rs:12]

name 只允许小写 ASCII letters、digits、dot、hyphen，长度不超过 64，首尾必须是 ASCII alphanumeric，且不能出现连续 `--`/`..`；schema 或 name 不合法会使 manifest parse 失败。[E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:129][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:146][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:219][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:230][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:234]

兼容映射默认把 Agent Plugin 的 skills 指向 `./skills`、MCP config 指向 `./mcp.json`，并用基础 metadata 构造 Codex interface。`extensions.com.openai` object 可覆盖 apps/hooks/interface；若 manifest 内没有该 extension，则可应用外部 Codex overlay。[E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:158][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:179][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:181][E: codex-rs/core-plugins/src/agent_plugin_manifest.rs:196]

这是一条格式兼容入口，不代表 Agent Plugins schema 的所有潜在字段都映射为 Codex capability；parser 的 allow-list 和 `com.openai` overlay 才是当前实现边界。[I]

### Legacy Codex manifest

`RawPluginManifest` 使用 camelCase 反序列化，top-level fields 包含 name、version、description、keywords、skills、mcpServers、apps、hooks 和 interface。[E: codex-rs/core-plugins/src/manifest.rs:34][E: codex-rs/core-plugins/src/manifest.rs:35][E: codex-rs/core-plugins/src/manifest.rs:36][E: codex-rs/core-plugins/src/manifest.rs:38][E: codex-rs/core-plugins/src/manifest.rs:40][E: codex-rs/core-plugins/src/manifest.rs:42][E: codex-rs/core-plugins/src/manifest.rs:44][E: codex-rs/core-plugins/src/manifest.rs:48][E: codex-rs/core-plugins/src/manifest.rs:50][E: codex-rs/core-plugins/src/manifest.rs:52][E: codex-rs/core-plugins/src/manifest.rs:54]

Interface metadata 包含 display/description/developer/category/capabilities/URLs/defaultPrompt/brand assets/screenshots；defaultPrompt 可以是 string 或 string list，最终最多保留 3 条，每条会 whitespace-normalize 且最多 128 字符。[E: codex-rs/core-plugins/src/manifest.rs:65][E: codex-rs/core-plugins/src/manifest.rs:67][E: codex-rs/core-plugins/src/manifest.rs:69][E: codex-rs/core-plugins/src/manifest.rs:73][E: codex-rs/core-plugins/src/manifest.rs:79][E: codex-rs/core-plugins/src/manifest.rs:90][E: codex-rs/core-plugins/src/manifest.rs:105][E: codex-rs/core-plugins/src/manifest.rs:468][E: codex-rs/core-plugins/src/manifest.rs:512][E: codex-rs/core-plugins/src/manifest.rs:518]

`load_plugin_manifest` 通过 `find_plugin_manifest_path` 查找 manifest，读取 JSON 后调用 parser；parse 失败只 warning 并返回 None。[E: codex-rs/core-plugins/src/manifest.rs:145][E: codex-rs/core-plugins/src/manifest.rs:146][E: codex-rs/core-plugins/src/manifest.rs:138][E: codex-rs/core-plugins/src/manifest.rs:166]

同一 parser 现在公开 `parse_plugin_manifest_uri`，可直接在 `PathUri`/executor filesystem 语境生成 `UriPluginManifest`，host loader 再把 resources map 回 `AbsolutePathBuf`。另有 `load_plugin_command_paths` 的窄读取路径：它只反序列化 top-level `commands`，复用同一 `./...` path validation，而不要求先解析完整 manifest capability surface。[E: codex-rs/core-plugins/src/manifest.rs:32][E: codex-rs/core-plugins/src/manifest.rs:176][E: codex-rs/core-plugins/src/manifest.rs:180][E: codex-rs/core-plugins/src/manifest.rs:186][E: codex-rs/core-plugins/src/manifest.rs:194][E: codex-rs/core-plugins/src/manifest.rs:228]

Parser 会在 manifest name 为空时使用 plugin root 目录名，并把 skills、mcpServers、apps、hooks 解析为 public `PluginManifestPaths`。[E: codex-rs/core-plugins/src/manifest.rs:194][E: codex-rs/core-plugins/src/manifest.rs:279][E: codex-rs/core-plugins/src/manifest.rs:281][E: codex-rs/core-plugins/src/manifest.rs:363][E: codex-rs/core-plugins/src/manifest.rs:368][E: codex-rs/core-plugins/src/manifest.rs:369][E: codex-rs/core-plugins/src/manifest.rs:370][E: codex-rs/core-plugins/src/manifest.rs:371][E: codex-rs/core-plugins/src/manifest.rs:372]

## Path safety

Manifest path fields are resolved by `resolve_manifest_path`: path must be non-empty, start with `./`, not be exactly `./`, must not contain `..`, and must not be absolute/rooted before it is joined with plugin root; the joined path must still start with the plugin root.[E: codex-rs/core-plugins/src/manifest.rs:570][E: codex-rs/core-plugins/src/manifest.rs:575][E: codex-rs/core-plugins/src/manifest.rs:579][E: codex-rs/core-plugins/src/manifest.rs:583][E: codex-rs/core-plugins/src/manifest.rs:588][E: codex-rs/core-plugins/src/manifest.rs:597][E: codex-rs/core-plugins/src/manifest.rs:602][E: codex-rs/core-plugins/src/manifest.rs:610][E: codex-rs/core-plugins/src/manifest.rs:617]

这条规则是相对路径校验和 `PathUri::join`，不是 canonical symlink sandbox；函数最后返回的是 joined `PathUri`。[E: codex-rs/core-plugins/src/manifest.rs:610][E: codex-rs/core-plugins/src/manifest.rs:617][E: codex-rs/core-plugins/src/manifest.rs:621]

`hooks` manifest field 可声明单路径、路径列表、inline `HooksFile` 或 inline list；path 形态仍走同一 `resolve_manifest_path`。[E: codex-rs/core-plugins/src/manifest.rs:126][E: codex-rs/core-plugins/src/manifest.rs:136][E: codex-rs/core-plugins/src/manifest.rs:129][E: codex-rs/core-plugins/src/manifest.rs:131][E: codex-rs/core-plugins/src/manifest.rs:386][E: codex-rs/core-plugins/src/manifest.rs:391][E: codex-rs/core-plugins/src/manifest.rs:402]

## Identity 与 namespace

`PluginId` 保存 plugin_name 和 marketplace_name；`parse` 只接受 `<plugin>@<marketplace>`，`as_key` 输出相同 key 形态。[E: codex-rs/plugin/src/plugin_id.rs:9][E: codex-rs/plugin/src/plugin_id.rs:10][E: codex-rs/plugin/src/plugin_id.rs:11][E: codex-rs/plugin/src/plugin_id.rs:12][E: codex-rs/plugin/src/plugin_id.rs:26][E: codex-rs/plugin/src/plugin_id.rs:45]

Plugin id segment 校验只允许 ASCII letters/digits、underscore 和 hyphen，且不能为空。[E: codex-rs/plugin/src/plugin_id.rs:51][E: codex-rs/plugin/src/plugin_id.rs:52][E: codex-rs/plugin/src/plugin_id.rs:55][E: codex-rs/plugin/src/plugin_id.rs:57]

Namespace/manifest discovery 共享有序 path 列表：`.codex-plugin/plugin.json`、`.claude-plugin/plugin.json`、新增的 `.cursor-plugin/plugin.json`，取第一个存在的 manifest；namespace helper 从最近 ancestor manifest 读取 name。[E: codex-rs/exec-server-protocol/src/protocol.rs:46][E: codex-rs/exec-server-protocol/src/protocol.rs:49][E: codex-rs/utils/plugins/src/plugin_namespace.rs:39]

## Load outcome 与 capabilities

`LoadedPlugin` 记录 config_name、manifest_name、plugin_namespace、description、root、enabled、skill roots、disabled skill paths、MCP servers、apps、hook sources、hook load warnings 和 error；`is_active()` 要求 enabled 且 error 为 None。[E: codex-rs/plugin/src/load_outcome.rs:19][E: codex-rs/plugin/src/load_outcome.rs:20][E: codex-rs/plugin/src/load_outcome.rs:23][E: codex-rs/plugin/src/load_outcome.rs:26][E: codex-rs/plugin/src/load_outcome.rs:27][E: codex-rs/plugin/src/load_outcome.rs:30][E: codex-rs/plugin/src/load_outcome.rs:31][E: codex-rs/plugin/src/load_outcome.rs:32][E: codex-rs/plugin/src/load_outcome.rs:33][E: codex-rs/plugin/src/load_outcome.rs:38]

Capability summary 只为 active plugin 生成；summary 包含 config_name、display name、prompt-safe description、has_skills、sorted MCP server names 和 app connector ids。没有 skills/MCP/apps 的 active plugin 也不会生成 summary。[E: codex-rs/plugin/src/load_outcome.rs:47][E: codex-rs/plugin/src/load_outcome.rs:50][E: codex-rs/plugin/src/load_outcome.rs:54][E: codex-rs/plugin/src/load_outcome.rs:57][E: codex-rs/plugin/src/load_outcome.rs:60][E: codex-rs/plugin/src/load_outcome.rs:61][E: codex-rs/plugin/src/load_outcome.rs:62][E: codex-rs/plugin/src/load_outcome.rs:63][E: codex-rs/plugin/src/load_outcome.rs:66]

`PluginLoadOutcome::from_plugins` 保存原始 plugins list 并派生 capability summaries；effective skill roots、plugin skill roots、MCP servers、apps 和 plugin hook sources 都只来自 active plugins。[E: codex-rs/plugin/src/load_outcome.rs:94][E: codex-rs/plugin/src/load_outcome.rs:106][E: codex-rs/plugin/src/load_outcome.rs:107][E: codex-rs/plugin/src/load_outcome.rs:117][E: codex-rs/plugin/src/load_outcome.rs:121][E: codex-rs/plugin/src/load_outcome.rs:129][E: codex-rs/plugin/src/load_outcome.rs:132][E: codex-rs/plugin/src/load_outcome.rs:156][E: codex-rs/plugin/src/load_outcome.rs:158][E: codex-rs/plugin/src/load_outcome.rs:168][E: codex-rs/plugin/src/load_outcome.rs:172][E: codex-rs/plugin/src/load_outcome.rs:177][E: codex-rs/plugin/src/load_outcome.rs:180]

Plugin description 会 whitespace-normalize 并截断到 1024 chars，以适合 model-facing capability summary。[E: codex-rs/plugin/src/load_outcome.rs:15][E: codex-rs/plugin/src/load_outcome.rs:73][E: codex-rs/plugin/src/load_outcome.rs:75][E: codex-rs/plugin/src/load_outcome.rs:83]

## Gotchas

- inactive plugin 仍保留在 `PluginLoadOutcome::plugins()` 中，但不会贡献 capability summary、effective skill roots、MCP servers、apps 或 hook sources。[E: codex-rs/plugin/src/load_outcome.rs:94][E: codex-rs/plugin/src/load_outcome.rs:193][E: codex-rs/plugin/src/load_outcome.rs:197][E: codex-rs/plugin/src/load_outcome.rs:50][E: codex-rs/plugin/src/load_outcome.rs:121][E: codex-rs/plugin/src/load_outcome.rs:168][E: codex-rs/plugin/src/load_outcome.rs:177]
- target 的默认 host/executor discovery allow-list 仍只有 `.codex-plugin/plugin.json`、`.claude-plugin/plugin.json` 和 `.cursor-plugin/plugin.json`；root `plugin.json` 虽有 Agent Plugins parser，却尚未被这条默认 discovery path 自动发现。是否由其它上游调用方显式传入该 path 取决于集成面，因此不能把 parser presence 等同于默认可安装性。[E: codex-rs/exec-server-protocol/src/protocol.rs:46][E: codex-rs/exec-server-protocol/src/protocol.rs:49][E: codex-rs/utils/plugins/src/plugin_namespace.rs:39][E: codex-rs/core-plugins/src/manifest.rs:236][U]
- Manifest paths 的 `./...` 规则不能被解释为 symlink-resolved sandbox；它只是相对路径校验、`PathUri::join` 和 prefix check。[E: codex-rs/core-plugins/src/manifest.rs:575][E: codex-rs/core-plugins/src/manifest.rs:610][E: codex-rs/core-plugins/src/manifest.rs:617]
- Plugin hooks 是 manifest surface 与 `PluginHookSource` load outcome surface；真正是否运行还受 hooks engine trust/policy 控制。[E: codex-rs/core-plugins/src/manifest.rs:54][E: codex-rs/plugin/src/load_outcome.rs:32][E: codex-rs/hooks/src/engine/discovery.rs:163]

## Sources

- `codex-rs/core-plugins/src/agent_plugin_manifest.rs`
- `codex-rs/core-plugins/src/manifest.rs`
- `codex-rs/plugin/src/lib.rs`
- `codex-rs/plugin/src/plugin_id.rs`
- `codex-rs/plugin/src/load_outcome.rs`
- `codex-rs/utils/plugins/src/plugin_namespace.rs`
- `codex-rs/exec-server-protocol/src/protocol.rs`
- `codex-rs/core-skills/src/loader.rs`

## 相关

- `subsys.config-auth.skills`: plugins 贡献的 skill roots 如何被发现与 namespace 化。
- `subsys.config-auth.hooks`: plugin hook sources 如何进入 hooks engine。
- `subsys.mcp.connectors`: plugin apps/connectors 和 MCP runtime 连接面。
