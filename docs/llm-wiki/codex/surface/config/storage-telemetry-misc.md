---
id: config.storage-telemetry-misc
title: 存储/遥测/杂项设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/project_root_markers.rs, codex-rs/core/src/config/mod.rs, codex-rs/core/src/config_loader/mod.rs, codex-rs/core/src/windows_sandbox.rs, docs/config.md]
symbols: [ConfigToml, History, UriBasedFileOpener, GhostSnapshotToml, AnalyticsConfigToml, FeedbackConfigToml, AppsConfigToml, OtelConfigToml, WindowsToml, Notice]
related: [command.config-system, config.ui-tui, config.approval-sandbox, config.auth-account]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 存储/遥测/杂项设置 catalog 覆盖 `ConfigToml` 中通知、commit attribution、history、SQLite/log dirs、file opener、remote thread store、ghost snapshot、project root markers、updates、analytics、feedback、apps、OTEL、Windows 和 notice 状态的顶层键。

## 能回答的问题

- `sqlite_home` 和 `log_dir` 的默认目录如何解析?
- `history.persistence`、`file_opener`、`ghost_snapshot` 的 nested shape 是什么?
- `analytics.enabled` 与 `feedback.enabled` 的 effective default 有何差异?
- `apps` connector config 的 default/per-app/per-tool 层级是什么?
- `project_root_markers` 如何禁用或改变 project root discovery?

## Catalog

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `notify` | `Option<Vec<String>>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2229] | 配置 agent finish turn 后运行的 external notification command；docs 说明 legacy notify payload 可包含 client 字段。[E: codex-rs/config/src/config_toml.rs:120][E: docs/config.md:53][E: docs/config.md:57] | `codex-rs/config/src/config_toml.rs:122` |
| `commit_attribution` | `Option<String>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:1994][E: codex-rs/core/src/config/mod.rs:2235] | 配置 commit message co-author trailer attribution text；空字符串或 whitespace-only 会关闭 automatic commit attribution。[E: codex-rs/config/src/config_toml.rs:149][E: codex-rs/config/src/config_toml.rs:151][E: codex-rs/core/src/config/mod.rs:319][E: codex-rs/core/src/config/mod.rs:320] | `codex-rs/config/src/config_toml.rs:152` |
| `history` | `Option<History>` | unset | `History::default()`，其中 `persistence=SaveAll`。[E: codex-rs/core/src/config/mod.rs:1886][E: codex-rs/config/src/types.rs:133][E: codex-rs/config/src/types.rs:138] | 控制 `~/.codex/history.jsonl` 写入与 size cap；nested fields 是 `persistence` 和 `max_bytes`。[E: codex-rs/config/src/types.rs:126][E: codex-rs/config/src/types.rs:130] | `codex-rs/config/src/config_toml.rs:229` |
| `sqlite_home` | `Option<AbsolutePathBuf>` | unset | effective `Config.sqlite_home` 中 `cfg.sqlite_home` 优先，其次读取 `CODEX_SQLITE_HOME`、trim 空白、忽略空值、相对路径按 resolved cwd 解析，最后 fallback 到 `$CODEX_HOME`。[E: codex-rs/core/src/config/mod.rs:2084][E: codex-rs/core/src/config/mod.rs:2086][E: codex-rs/core/src/config/mod.rs:2087][E: codex-rs/core/src/config/mod.rs:2088][E: codex-rs/core/src/config/mod.rs:136][E: codex-rs/core/src/config/mod.rs:137][E: codex-rs/core/src/config/mod.rs:138][E: codex-rs/core/src/config/mod.rs:139][E: codex-rs/core/src/config/mod.rs:142][E: codex-rs/core/src/config/mod.rs:145] | 指定 Codex SQLite state DB 目录；docs 说明 config key 或 `CODEX_SQLITE_HOME` 控制 state DB 位置，并补充未设置时 WorkspaceWrite sandbox sessions 默认 temp dir、其他模式默认 `CODEX_HOME`。[E: codex-rs/config/src/config_toml.rs:231][E: docs/config.md:65][E: docs/config.md:66][E: docs/config.md:67] | `codex-rs/config/src/config_toml.rs:233` |
| `log_dir` | `Option<AbsolutePathBuf>` | unset | `$CODEX_HOME/log`。[E: codex-rs/core/src/config/mod.rs:2078][E: codex-rs/core/src/config/mod.rs:2081][E: codex-rs/core/src/config/mod.rs:2082] | 指定 Codex log files 目录，例如 `codex-tui.log`。[E: codex-rs/config/src/config_toml.rs:235] | `codex-rs/config/src/config_toml.rs:237` |
| `file_opener` | `Option<UriBasedFileOpener>` | unset | `UriBasedFileOpener::VsCode`。[E: codex-rs/core/src/config/mod.rs:2282] | 控制 model output 中 file citations 的 URI hyperlink scheme；enum 支持 `vscode`、`vscode-insiders`、`windsurf`、`cursor`、`none`。[E: codex-rs/config/src/config_toml.rs:239][E: codex-rs/config/src/types.rs:92][E: codex-rs/config/src/types.rs:95][E: codex-rs/config/src/types.rs:98][E: codex-rs/config/src/types.rs:101][E: codex-rs/config/src/types.rs:105][E: codex-rs/config/src/types.rs:106] | `codex-rs/config/src/config_toml.rs:241` |
| `experimental_thread_store_endpoint` | `Option<String>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2334] | 让 app-server 使用 remote thread store endpoint，而不是 local filesystem/SQLite store。[E: codex-rs/config/src/config_toml.rs:308][E: codex-rs/config/src/config_toml.rs:310] | `codex-rs/config/src/config_toml.rs:310` |
| `ghost_snapshot` | `Option<GhostSnapshotToml>` | unset | `GhostSnapshotConfig::default()` 后按 nested fields overlay；非正数 threshold 会变成 `None`。[E: codex-rs/core/src/config/mod.rs:1935][E: codex-rs/core/src/config/mod.rs:1939][E: codex-rs/core/src/config/mod.rs:1942][E: codex-rs/core/src/config/mod.rs:1948][E: codex-rs/core/src/config/mod.rs:1949][E: codex-rs/core/src/config/mod.rs:1954] | 配置 undo 用 ghost snapshots；nested fields 控制 large untracked files、large untracked dirs 和 warning disable。[E: codex-rs/config/src/config_toml.rs:348][E: codex-rs/config/src/config_toml.rs:594][E: codex-rs/config/src/config_toml.rs:598][E: codex-rs/config/src/config_toml.rs:600] | `codex-rs/config/src/config_toml.rs:350` |
| `project_root_markers` | `Option<Vec<String>>` | unset | loader 使用 default marker list `[".git"]`；显式 empty array 会禁用 root detection 并让 cwd 作为 root。[E: codex-rs/config/src/project_root_markers.rs:5][E: codex-rs/config/src/project_root_markers.rs:29][E: codex-rs/config/src/project_root_markers.rs:30][E: codex-rs/core/src/config_loader/mod.rs:255][E: codex-rs/core/src/config_loader/mod.rs:256][E: codex-rs/core/src/config_loader/mod.rs:903] | 改变向上查找 project root 时匹配的 marker filenames/directories。[E: codex-rs/config/src/config_toml.rs:352][E: codex-rs/core/src/config_loader/mod.rs:906][E: codex-rs/core/src/config_loader/mod.rs:914] | `codex-rs/config/src/config_toml.rs:355` |
| `check_for_update_on_startup` | `Option<bool>` | unset | `true`。[E: codex-rs/core/src/config/mod.rs:2070][E: codex-rs/core/src/config/mod.rs:2352] | startup 时检查 Codex updates 并显示 update prompts；源码注释建议 centrally managed updates 才设置 false。[E: codex-rs/config/src/config_toml.rs:357][E: codex-rs/config/src/config_toml.rs:358][E: codex-rs/config/src/config_toml.rs:359] | `codex-rs/config/src/config_toml.rs:360` |
| `analytics` | `Option<AnalyticsConfigToml>` | unset | effective config 保存 profile/global `enabled` override，unset 时保持 `None`。[E: codex-rs/core/src/config/mod.rs:2354][E: codex-rs/core/src/config/mod.rs:2358] | 当 `enabled=false` 时禁用 analytics；nested schema 目前只有 `enabled`。[E: codex-rs/config/src/config_toml.rs:367][E: codex-rs/config/src/types.rs:148][E: codex-rs/config/src/types.rs:150] | `codex-rs/config/src/config_toml.rs:369` |
| `feedback` | `Option<FeedbackConfigToml>` | unset | `true`。[E: codex-rs/core/src/config/mod.rs:2359][E: codex-rs/core/src/config/mod.rs:2363] | 当 `enabled=false` 时禁用 feedback flow；nested schema 目前只有 `enabled`。[E: codex-rs/config/src/config_toml.rs:371][E: codex-rs/config/src/types.rs:155][E: codex-rs/config/src/types.rs:157] | `codex-rs/config/src/config_toml.rs:373` |
| `apps` | `Option<AppsConfigToml>` | unset | absent 时没有 app-specific config table；`_default` 或 per-app entry 存在时，其 nested bool defaults 为 true unless overridden；broader app exposure 还会由 `Feature::Apps` gate 影响。[E: codex-rs/config/src/types.rs:363][E: codex-rs/config/src/types.rs:368][E: codex-rs/config/src/types.rs:289][E: codex-rs/config/src/types.rs:294][E: codex-rs/config/src/types.rs:301][E: codex-rs/config/src/types.rs:334][E: codex-rs/core/src/config/mod.rs:835] | 配置 app/connector controls；docs 说明 `/apps` command lists available and installed apps。[E: codex-rs/config/src/config_toml.rs:375][E: docs/config.md:45][E: docs/config.md:49] | `codex-rs/config/src/config_toml.rs:377` |
| `otel` | `Option<OtelConfigToml>` | unset | `log_user_prompt=false`、`environment="dev"`、`exporter=None`、`trace_exporter=exporter`、`metrics_exporter=Statsig`。[E: codex-rs/core/src/config/mod.rs:2386][E: codex-rs/core/src/config/mod.rs:2387][E: codex-rs/core/src/config/mod.rs:2390][E: codex-rs/core/src/config/mod.rs:2391][E: codex-rs/core/src/config/mod.rs:2392][E: codex-rs/core/src/config/mod.rs:2393][E: codex-rs/config/src/types.rs:29] | 配置 OpenTelemetry exporters、environment 和 prompt logging；nested fields 是 `log_user_prompt`、`environment`、`exporter`、`trace_exporter`、`metrics_exporter`。[E: codex-rs/config/src/types.rs:420][E: codex-rs/config/src/types.rs:423][E: codex-rs/config/src/types.rs:426][E: codex-rs/config/src/types.rs:429][E: codex-rs/config/src/types.rs:432] | `codex-rs/config/src/config_toml.rs:380` |
| `windows` | `Option<WindowsToml>` | unset | profile legacy windows feature key 优先；若 profile legacy windows keys present 但没有产出启用 sandbox mode，则返回 `None`；之后才依次使用 profile `[windows]`、global `[windows]`、global legacy feature；private desktop 默认 true。[E: codex-rs/core/src/windows_sandbox.rs:63][E: codex-rs/core/src/windows_sandbox.rs:64][E: codex-rs/core/src/windows_sandbox.rs:66][E: codex-rs/core/src/windows_sandbox.rs:67][E: codex-rs/core/src/windows_sandbox.rs:71][E: codex-rs/core/src/windows_sandbox.rs:73][E: codex-rs/core/src/windows_sandbox.rs:74][E: codex-rs/core/src/windows_sandbox.rs:75][E: codex-rs/core/src/windows_sandbox.rs:78][E: codex-rs/core/src/windows_sandbox.rs:88] | 配置 Windows-specific sandbox settings；nested fields 是 `sandbox` 和 `sandbox_private_desktop`。[E: codex-rs/config/src/types.rs:84][E: codex-rs/config/src/types.rs:87] | `codex-rs/config/src/config_toml.rs:384` |
| `windows_wsl_setup_acknowledged` | `Option<bool>` | unset | `false`。[E: codex-rs/core/src/config/mod.rs:2350] | 记录 Windows onboarding screen 是否已被 acknowledged。[E: codex-rs/config/src/config_toml.rs:386] | `codex-rs/config/src/config_toml.rs:387` |
| `notice` | `Option<Notice>` | unset | `Notice::default()`。[E: codex-rs/core/src/config/mod.rs:2351] | 存储 in-product notices 的 do-not-show/ack state；docs 明确 notices 不同于 notifications。[E: codex-rs/config/src/config_toml.rs:389][E: docs/config.md:91][E: docs/config.md:93] | `codex-rs/config/src/config_toml.rs:391` |

## Apps、OTEL、Notice nested shape

`AppsConfigToml` 有 `_default` 和 flatten per-app map；`AppConfig` 支持 per-app enabled、destructive/open-world toggles、default tool approval mode、default tool enabled 和 per-tool settings。[E: codex-rs/config/src/types.rs:363][E: codex-rs/config/src/types.rs:368][E: codex-rs/config/src/types.rs:335][E: codex-rs/config/src/types.rs:339][E: codex-rs/config/src/types.rs:343][E: codex-rs/config/src/types.rs:347][E: codex-rs/config/src/types.rs:351][E: codex-rs/config/src/types.rs:355] `AppToolConfig` 支持 per-tool `enabled` 和 `approval_mode`。[E: codex-rs/config/src/types.rs:313][E: codex-rs/config/src/types.rs:317]

`OtelExporterKind` 支持 `none`、`statsig`、`otlp-http` 和 `otlp-grpc` shapes；`otlp-http` 需要 endpoint 与 protocol，headers 默认空，tls 可选；`otlp-grpc` 需要 endpoint，headers 默认空，tls 可选。[E: codex-rs/config/src/types.rs:395][E: codex-rs/config/src/types.rs:396][E: codex-rs/config/src/types.rs:397][E: codex-rs/config/src/types.rs:398][E: codex-rs/config/src/types.rs:399][E: codex-rs/config/src/types.rs:400][E: codex-rs/config/src/types.rs:401][E: codex-rs/config/src/types.rs:402][E: codex-rs/config/src/types.rs:403][E: codex-rs/config/src/types.rs:404][E: codex-rs/config/src/types.rs:406][E: codex-rs/config/src/types.rs:407][E: codex-rs/config/src/types.rs:408][E: codex-rs/config/src/types.rs:409][E: codex-rs/config/src/types.rs:410][E: codex-rs/config/src/types.rs:411] `Notice` 包含 full-access warning、world-writable warning、rate-limit model nudge、model migration prompts、model migration map 和 external config migration prompt state。[E: codex-rs/config/src/types.rs:615][E: codex-rs/config/src/types.rs:617][E: codex-rs/config/src/types.rs:619][E: codex-rs/config/src/types.rs:621][E: codex-rs/config/src/types.rs:624][E: codex-rs/config/src/types.rs:627][E: codex-rs/config/src/types.rs:630]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/project_root_markers.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/core/src/config_loader/mod.rs`
- `codex-rs/core/src/windows_sandbox.rs`
- `docs/config.md`

## 相关

- [配置与系统 slash command](../slash-commands/config-system.md) — 覆盖 `/feedback`、`/status`、`/settings` 等 entrypoints。
- [UI / TUI / 实时设置](ui-tui.md) — 覆盖 TUI-specific display settings。
- [审批与沙箱设置](approval-sandbox.md) — 覆盖 Windows sandbox mode 与 permission policy 的交叉点。
