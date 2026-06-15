---
id: subsys.config-auth.plugins
title: Plugins 系统
kind: subsystem
tier: T2
source: [codex-rs/core-plugins/src/manifest.rs, codex-rs/plugin/src/lib.rs, codex-rs/plugin/src/plugin_id.rs, codex-rs/plugin/src/load_outcome.rs, codex-rs/utils/plugins/src/plugin_namespace.rs, codex-rs/core-skills/src/loader.rs]
symbols: [PluginManifest, load_plugin_manifest, PluginId, plugin_namespace_for_skill_path, LoadedPlugin, PluginLoadOutcome, PluginCapabilitySummary]
related: [subsys.config-auth.skills, subsys.config-auth.config-loading, subsys.mcp.connectors, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex plugins 系统用 discoverable plugin manifest 描述 plugin metadata、skills、MCP servers、apps 和 interface metadata，再把加载结果汇总为 active capability summaries、effective roots 和 telemetry metadata。[E: codex-rs/utils/plugins/src/plugin_namespace.rs:8][E: codex-rs/core-plugins/src/manifest.rs:15][E: codex-rs/core-plugins/src/manifest.rs:29][E: codex-rs/plugin/src/load_outcome.rs:83][E: codex-rs/plugin/src/load_outcome.rs:104][E: codex-rs/plugin/src/lib.rs:30][E: codex-rs/plugin/src/lib.rs:45]

## 能回答的问题

- plugin manifest 支持哪些字段和默认值？
- manifest path 为什么必须以 `./` 开头且不能逃出 plugin root？
- plugin id 与 marketplace id 怎样组成 key？
- plugin load outcome 怎样区分 active/inactive、capability summary、effective skill/MCP/app roots？
- plugin namespace 怎样用于 skill path？

## 职责边界

plugins 节点覆盖 manifest parsing、plugin id/namespace、load outcome 和 capability summary。MCP runtime 连接与 connector auth 由 `subsys.mcp.*` 节点覆盖；skills 注入由 `subsys.config-auth.skills` 覆盖。

## Manifest schema 与 path 安全

raw manifest Rust 字段是 name、version、description、skills、mcp_servers、apps 和 interface；因为 raw struct 使用 `rename_all = "camelCase"`，JSON 字段例如 `mcpServers` 会映射到 Rust `mcp_servers`。[E: codex-rs/core-plugins/src/manifest.rs:12][E: codex-rs/core-plugins/src/manifest.rs:15][E: codex-rs/core-plugins/src/manifest.rs:17][E: codex-rs/core-plugins/src/manifest.rs:19][E: codex-rs/core-plugins/src/manifest.rs:23][E: codex-rs/core-plugins/src/manifest.rs:25][E: codex-rs/core-plugins/src/manifest.rs:27][E: codex-rs/core-plugins/src/manifest.rs:29] public `PluginManifest` 保存 name、version、description、paths 和 interface。[E: codex-rs/core-plugins/src/manifest.rs:33][E: codex-rs/core-plugins/src/manifest.rs:34][E: codex-rs/core-plugins/src/manifest.rs:38]

`PluginManifestInterface` 保存 `display_name`、`short_description`、`long_description`、`developer_name`、`category`、`capabilities`、`website_url`、policy URLs、`default_prompt`、`brand_color`、`composer_icon`、`logo` 和 `screenshots`。[E: codex-rs/core-plugins/src/manifest.rs:49][E: codex-rs/core-plugins/src/manifest.rs:50][E: codex-rs/core-plugins/src/manifest.rs:51][E: codex-rs/core-plugins/src/manifest.rs:52][E: codex-rs/core-plugins/src/manifest.rs:53][E: codex-rs/core-plugins/src/manifest.rs:54][E: codex-rs/core-plugins/src/manifest.rs:55][E: codex-rs/core-plugins/src/manifest.rs:56][E: codex-rs/core-plugins/src/manifest.rs:59][E: codex-rs/core-plugins/src/manifest.rs:63]

`load_plugin_manifest` 读取 manifest、解析 raw JSON、把 raw paths 交给 `resolve_manifest_path`，并把 interface asset/default prompt 规范化后放入 public manifest。[E: codex-rs/core-plugins/src/manifest.rs:119][E: codex-rs/core-plugins/src/manifest.rs:120][E: codex-rs/core-plugins/src/manifest.rs:169][E: codex-rs/core-plugins/src/manifest.rs:171][E: codex-rs/core-plugins/src/manifest.rs:181][E: codex-rs/core-plugins/src/manifest.rs:214][E: codex-rs/core-plugins/src/manifest.rs:221] `resolve_manifest_path` 要求 path 以 `./` 开头，不允许空 `./`、`..` 或非 normal component，并返回 `plugin_root.join(normalized)` 的 absolute path。[E: codex-rs/core-plugins/src/manifest.rs:351][E: codex-rs/core-plugins/src/manifest.rs:355][E: codex-rs/core-plugins/src/manifest.rs:364][E: codex-rs/core-plugins/src/manifest.rs:369][E: codex-rs/core-plugins/src/manifest.rs:375]

`interface.defaultPrompt` 可以是 string 或 string list；list 路径最多保留 3 条，单条 prompt 会 whitespace-normalize、拒绝空字符串，并限制为最多 128 个字符。[E: codex-rs/core-plugins/src/manifest.rs:8][E: codex-rs/core-plugins/src/manifest.rs:9][E: codex-rs/core-plugins/src/manifest.rs:102][E: codex-rs/core-plugins/src/manifest.rs:105][E: codex-rs/core-plugins/src/manifest.rs:106][E: codex-rs/core-plugins/src/manifest.rs:256][E: codex-rs/core-plugins/src/manifest.rs:302][E: codex-rs/core-plugins/src/manifest.rs:303][E: codex-rs/core-plugins/src/manifest.rs:307]

## Plugin identity 与 namespace

`PluginId` 保存 plugin name 和 marketplace id；`new` 校验两个 segment，`parse` 解析 `<plugin>@<marketplace>` 形式，`as_key` 重新输出相同 key 形态。[E: codex-rs/plugin/src/plugin_id.rs:11][E: codex-rs/plugin/src/plugin_id.rs:12][E: codex-rs/plugin/src/plugin_id.rs:16][E: codex-rs/plugin/src/plugin_id.rs:18][E: codex-rs/plugin/src/plugin_id.rs:27][E: codex-rs/plugin/src/plugin_id.rs:29][E: codex-rs/plugin/src/plugin_id.rs:45][E: codex-rs/plugin/src/plugin_id.rs:46] segment 校验只允许 ASCII alphanumeric、hyphen 和 underscore。[E: codex-rs/plugin/src/plugin_id.rs:55][E: codex-rs/plugin/src/plugin_id.rs:57][E: codex-rs/plugin/src/plugin_id.rs:60]

`codex_utils_plugins` 的 namespace helper 会识别 `.codex-plugin/plugin.json` 与 `.claude-plugin/plugin.json`，读取最近 ancestor 的 manifest name，返回 manifest name 或 plugin root 目录名；skill loader 调用这个 helper 给 plugin skill name 加 namespace。[E: codex-rs/utils/plugins/src/plugin_namespace.rs:8][E: codex-rs/utils/plugins/src/plugin_namespace.rs:30][E: codex-rs/utils/plugins/src/plugin_namespace.rs:45][E: codex-rs/utils/plugins/src/plugin_namespace.rs:47][E: codex-rs/utils/plugins/src/plugin_namespace.rs:52][E: codex-rs/utils/plugins/src/plugin_namespace.rs:58][E: codex-rs/core-skills/src/loader.rs:22][E: codex-rs/core-skills/src/loader.rs:648]

## Load outcome 与 capabilities

`LoadedPlugin` 保存 config_name、manifest_name、manifest_description、root、enabled、skill roots、disabled skill paths、has_enabled_skills、MCP servers、apps 和 error；`is_active()` 要求 enabled 且 error 为空。[E: codex-rs/plugin/src/load_outcome.rs:14][E: codex-rs/plugin/src/load_outcome.rs:15][E: codex-rs/plugin/src/load_outcome.rs:16][E: codex-rs/plugin/src/load_outcome.rs:17][E: codex-rs/plugin/src/load_outcome.rs:18][E: codex-rs/plugin/src/load_outcome.rs:19][E: codex-rs/plugin/src/load_outcome.rs:24][E: codex-rs/plugin/src/load_outcome.rs:28][E: codex-rs/plugin/src/load_outcome.rs:29] capability summary 只对 active plugin 生成，并保存 display name、model-facing description、是否有 enabled skills、MCP server names 和 app connector ids；没有任何 capability 的 active plugin 不生成 summary。[E: codex-rs/plugin/src/load_outcome.rs:36][E: codex-rs/plugin/src/load_outcome.rs:43][E: codex-rs/plugin/src/load_outcome.rs:49][E: codex-rs/plugin/src/load_outcome.rs:52][E: codex-rs/plugin/src/load_outcome.rs:55][E: codex-rs/plugin/src/load_outcome.rs:58]

`PluginLoadOutcome::from_plugins` 保存原始 plugins list，并派生 active capability summaries。[E: codex-rs/plugin/src/load_outcome.rs:81][E: codex-rs/plugin/src/load_outcome.rs:83][E: codex-rs/plugin/src/load_outcome.rs:93][E: codex-rs/plugin/src/load_outcome.rs:96][E: codex-rs/plugin/src/load_outcome.rs:99] effective roots/mcp/apps 只从 active plugin 生成，inactive plugin 不贡献 runtime capability。[E: codex-rs/plugin/src/load_outcome.rs:104][E: codex-rs/plugin/src/load_outcome.rs:108][E: codex-rs/plugin/src/load_outcome.rs:116][E: codex-rs/plugin/src/load_outcome.rs:118][E: codex-rs/plugin/src/load_outcome.rs:128][E: codex-rs/plugin/src/load_outcome.rs:132]

`PluginTelemetryMetadata` 只有 `plugin_id` 和 optional `capability_summary`；`PluginCapabilitySummary::telemetry_metadata` 通过解析 summary 的 `config_name` 生成 telemetry metadata。[E: codex-rs/plugin/src/lib.rs:30][E: codex-rs/plugin/src/lib.rs:32][E: codex-rs/plugin/src/lib.rs:33][E: codex-rs/plugin/src/lib.rs:45][E: codex-rs/plugin/src/lib.rs:47][E: codex-rs/plugin/src/lib.rs:51]

## 设计动机与权衡

manifest path 只接受词法上的 root-relative `./...` 并拒绝 `..` 或非 normal component；这让普通 relative path 不能通过 `../` 逃出 plugin root。[E: codex-rs/core-plugins/src/manifest.rs:351][E: codex-rs/core-plugins/src/manifest.rs:360][E: codex-rs/core-plugins/src/manifest.rs:364][E: codex-rs/core-plugins/src/manifest.rs:369][I] 源码当前只把 `plugin_root.join(normalized)` 转成 absolute path，不能把这条规则误读成 canonical symlink sandbox。[E: codex-rs/core-plugins/src/manifest.rs:375][I]

plugins 与 skills 的边界是：plugin 定义可供加载的 roots/capabilities，skill loader 再把 plugin skill path namespace 化并纳入 skill discovery。[I] 对应事实是 plugin load outcome 暴露 effective skill roots，skill loader 把 plugin skill roots 转成 `SkillRoot`，并调用 plugin namespace helper。[E: codex-rs/plugin/src/load_outcome.rs:104][E: codex-rs/core-skills/src/loader.rs:233][E: codex-rs/core-skills/src/loader.rs:237][E: codex-rs/core-skills/src/loader.rs:648]

## Gotchas

- inactive plugin 仍保留在 `PluginLoadOutcome::plugins()` list 中，但不会贡献 capability summary/effective roots。[E: codex-rs/plugin/src/load_outcome.rs:99][E: codex-rs/plugin/src/load_outcome.rs:143][E: codex-rs/plugin/src/load_outcome.rs:147][E: codex-rs/plugin/src/load_outcome.rs:36][E: codex-rs/plugin/src/load_outcome.rs:108]
- capability summary 的 description 会 whitespace-normalize 并截断到 1024 characters，适合 model-facing capability summary 使用。[E: codex-rs/plugin/src/load_outcome.rs:9][E: codex-rs/plugin/src/load_outcome.rs:61][E: codex-rs/plugin/src/load_outcome.rs:64][E: codex-rs/plugin/src/load_outcome.rs:66][E: codex-rs/plugin/src/load_outcome.rs:74]
- namespace discovery 当前接受 `.codex-plugin/plugin.json` 与 `.claude-plugin/plugin.json`；manifest path normalization 仍只处理 manifest 内声明的 paths。[E: codex-rs/utils/plugins/src/plugin_namespace.rs:8][E: codex-rs/core-plugins/src/manifest.rs:340]

## Sources

- `codex-rs/core-plugins/src/manifest.rs`
- `codex-rs/plugin/src/lib.rs`
- `codex-rs/plugin/src/plugin_id.rs`
- `codex-rs/plugin/src/load_outcome.rs`
- `codex-rs/utils/plugins/src/plugin_namespace.rs`
- `codex-rs/core-skills/src/loader.rs`

## 相关

- `subsys.config-auth.skills`: plugins 贡献的 skill root 如何被发现与注入。
- `subsys.mcp.connectors`: plugin apps/connectors 的 runtime 连接面。
- `config.skills-plugins-features`: plugin 配置入口。
