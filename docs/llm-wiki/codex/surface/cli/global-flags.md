---
id: cli.global-flags
title: CLI 全局 flag
kind: cli
tier: T1
source: [codex-rs/cli/src/main.rs, codex-rs/utils/cli/src/shared_options.rs, codex-rs/utils/cli/src/config_override.rs, codex-rs/utils/cli/src/approval_mode_cli_arg.rs, codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs, codex-rs/tui/src/cli.rs, codex-rs/exec/src/lib.rs]
symbols: [MultitoolCli, SharedCliOptions, CliConfigOverrides, ApprovalModeCliArg, SandboxModeCliArg, FeatureToggles, InteractiveRemoteOptions, codex_tui::Cli]
related: [cli.subcommands, cli.exec-mode, config.model-provider, config.approval-sandbox, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> CLI 全局 flag 是 `codex` 根命令通过 `clap(flatten)` 拼出的 top-level option surface:配置覆盖、feature toggles、remote app-server 连接、interactive TUI flags 和 shared model/sandbox/workdir flags。

## 能回答的问题

- `codex` 根命令有哪些 top-level flags 和 positional prompt?
- `-c/--config` 如何解析 dotted config override?
- `--full-auto` 与 `--dangerously-bypass-approvals-and-sandbox` 分别映射到什么 sandbox/approval 意图?
- 哪些 shared flags 会被 `codex exec` 继承?

## Catalog

`MultitoolCli` flatten 了 `CliConfigOverrides`、`FeatureToggles`、`InteractiveRemoteOptions` 和 `TuiCli`，因此这些 struct 中的 clap args 一起构成 root `codex` option surface。[E: codex-rs/cli/src/main.rs:85][E: codex-rs/cli/src/main.rs:88][E: codex-rs/cli/src/main.rs:91][E: codex-rs/cli/src/main.rs:94]

| flag / arg | 定义字段 | 类型 | 默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `PROMPT` | `codex_tui::Cli::prompt` | optional positional `String` | unset | 不带 subcommand 时作为 initial user prompt 启动 interactive session。[E: codex-rs/tui/src/cli.rs:12][E: codex-rs/tui/src/cli.rs:13][E: codex-rs/cli/src/main.rs:700] | `codex-rs/tui/src/cli.rs:13` |
| `-c, --config key=value` | `CliConfigOverrides::raw_overrides` | repeatable string | `[]` | 覆盖 `~/.codex/config.toml` 的 dotted path；右侧先按 TOML value 解析，失败则作为 string literal；`use_legacy_landlock` 会 canonicalize 成 `features.use_legacy_landlock`；应用到配置树时按 `.` split 路径并创建中间 table。[E: codex-rs/utils/cli/src/config_override.rs:30][E: codex-rs/utils/cli/src/config_override.rs:34][E: codex-rs/utils/cli/src/config_override.rs:36][E: codex-rs/utils/cli/src/config_override.rs:65][E: codex-rs/utils/cli/src/config_override.rs:70][E: codex-rs/utils/cli/src/config_override.rs:92][E: codex-rs/utils/cli/src/config_override.rs:93][E: codex-rs/utils/cli/src/config_override.rs:104][E: codex-rs/utils/cli/src/config_override.rs:129][E: codex-rs/utils/cli/src/config_override.rs:132] | `codex-rs/utils/cli/src/config_override.rs:36` |
| `--enable FEATURE` | `FeatureToggles::enable` | repeatable string | `[]` | 等价于追加 `features.<name>=true` config override；feature 名必须是 known feature key。[E: codex-rs/cli/src/main.rs:600][E: codex-rs/cli/src/main.rs:601][E: codex-rs/cli/src/main.rs:625][E: codex-rs/cli/src/main.rs:627][E: codex-rs/cli/src/main.rs:637] | `codex-rs/cli/src/main.rs:601` |
| `--disable FEATURE` | `FeatureToggles::disable` | repeatable string | `[]` | 等价于追加 `features.<name>=false` config override；unknown feature 会报错。[E: codex-rs/cli/src/main.rs:604][E: codex-rs/cli/src/main.rs:605][E: codex-rs/cli/src/main.rs:629][E: codex-rs/cli/src/main.rs:631][E: codex-rs/cli/src/main.rs:640] | `codex-rs/cli/src/main.rs:605` |
| `--remote ADDR` | `InteractiveRemoteOptions::remote` | optional string | unset | 让 TUI 连接 remote app-server websocket endpoint；进入 TUI 前会调用 `codex_tui::normalize_remote_addr` normalize remote address。[E: codex-rs/cli/src/main.rs:613][E: codex-rs/cli/src/main.rs:614][E: codex-rs/cli/src/main.rs:1468][E: codex-rs/cli/src/main.rs:1470] | `codex-rs/cli/src/main.rs:614` |
| `--remote-auth-token-env ENV_VAR` | `InteractiveRemoteOptions::remote_auth_token_env` | optional string | unset | 指定环境变量名，从中读取发送给 remote app-server websocket 的 bearer token；未同时指定 `--remote` 会 fatal。[E: codex-rs/cli/src/main.rs:618][E: codex-rs/cli/src/main.rs:619][E: codex-rs/cli/src/main.rs:1473][E: codex-rs/cli/src/main.rs:1478][E: codex-rs/cli/src/main.rs:1480] | `codex-rs/cli/src/main.rs:619` |
| `-i, --image FILE` | `SharedCliOptions::images` | repeatable `PathBuf`，comma-delimited | `[]` | 把本地图片附加到 initial prompt；shared options 可被 exec/resume 等入口继承或覆盖。[E: codex-rs/utils/cli/src/shared_options.rs:11][E: codex-rs/utils/cli/src/shared_options.rs:12][E: codex-rs/utils/cli/src/shared_options.rs:14][E: codex-rs/utils/cli/src/shared_options.rs:15][E: codex-rs/utils/cli/src/shared_options.rs:17] | `codex-rs/utils/cli/src/shared_options.rs:17` |
| `-m, --model MODEL` | `SharedCliOptions::model` | optional string | unset | 指定 agent model；exec path 会把它放入 `ConfigOverrides.model`，未指定且 `--oss` 为 true 时用 provider 默认 model。[E: codex-rs/utils/cli/src/shared_options.rs:20][E: codex-rs/utils/cli/src/shared_options.rs:21][E: codex-rs/exec/src/lib.rs:374][E: codex-rs/exec/src/lib.rs:376][E: codex-rs/exec/src/lib.rs:379][E: codex-rs/exec/src/lib.rs:380][E: codex-rs/exec/src/lib.rs:387] | `codex-rs/utils/cli/src/shared_options.rs:21` |
| `--oss` | `SharedCliOptions::oss` | bool | false | 使用 open-source provider；exec path 只在 `oss` 为 true 时调用 `resolve_oss_provider()`，并在未指定 model 时用 provider 默认 model。[E: codex-rs/utils/cli/src/shared_options.rs:24][E: codex-rs/utils/cli/src/shared_options.rs:25][E: codex-rs/exec/src/lib.rs:355][E: codex-rs/exec/src/lib.rs:376][E: codex-rs/exec/src/lib.rs:379][E: codex-rs/exec/src/lib.rs:380] | `codex-rs/utils/cli/src/shared_options.rs:25` |
| `--local-provider PROVIDER` | `SharedCliOptions::oss_provider` | optional string | unset | 指定 local provider id；该值在 `--oss` 路径下传入 `resolve_oss_provider()`。[E: codex-rs/utils/cli/src/shared_options.rs:29][E: codex-rs/utils/cli/src/shared_options.rs:30][E: codex-rs/exec/src/lib.rs:355][E: codex-rs/exec/src/lib.rs:357] | `codex-rs/utils/cli/src/shared_options.rs:30` |
| `-p, --profile PROFILE` | `SharedCliOptions::config_profile` | optional string | unset | 选择 `config.toml` profile 作为默认选项层；shared inheritance 会在 subcommand 未设置 profile 时复制 root profile。[E: codex-rs/utils/cli/src/shared_options.rs:33][E: codex-rs/utils/cli/src/shared_options.rs:34][E: codex-rs/utils/cli/src/shared_options.rs:103][E: codex-rs/utils/cli/src/shared_options.rs:104] | `codex-rs/utils/cli/src/shared_options.rs:34` |
| `-s, --sandbox MODE` | `SharedCliOptions::sandbox_mode` | enum `read-only|workspace-write|danger-full-access` | unset | 选择 model-generated shell command 的 sandbox policy；CLI enum 使用 kebab-case 值并映射到 `SandboxMode` 三个 variant。[E: codex-rs/utils/cli/src/shared_options.rs:38][E: codex-rs/utils/cli/src/shared_options.rs:39][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:13][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:15][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:16][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:17][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:23][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:24][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:25] | `codex-rs/utils/cli/src/shared_options.rs:39` |
| `--full-auto` | `SharedCliOptions::full_auto` | bool | false | 低摩擦 sandboxed automatic execution alias；exec path 的 approval override 默认 `AskForApproval::Never`，sandbox 映射为 `WorkspaceWrite`；debug prompt-input config construction maps it to `AskForApproval::OnRequest` and `WorkspaceWrite`。[E: codex-rs/utils/cli/src/shared_options.rs:42][E: codex-rs/utils/cli/src/shared_options.rs:43][E: codex-rs/exec/src/lib.rs:272][E: codex-rs/exec/src/lib.rs:390][E: codex-rs/exec/src/lib.rs:391][E: codex-rs/cli/src/main.rs:1258][E: codex-rs/cli/src/main.rs:1259][E: codex-rs/cli/src/main.rs:1265][E: codex-rs/cli/src/main.rs:1266] | `codex-rs/utils/cli/src/shared_options.rs:43` |
| `--dangerously-bypass-approvals-and-sandbox` / `--yolo` | `SharedCliOptions::dangerously_bypass_approvals_and_sandbox` | bool | false | 跳过 confirmation prompts 且不使用 sandbox；与 `--full-auto` 冲突。exec path sandbox 映射为 `DangerFullAccess`，并让 git repo check 条件不成立；debug prompt-input config construction maps it to `AskForApproval::Never` and `DangerFullAccess`。[E: codex-rs/utils/cli/src/shared_options.rs:48][E: codex-rs/utils/cli/src/shared_options.rs:49][E: codex-rs/utils/cli/src/shared_options.rs:51][E: codex-rs/exec/src/lib.rs:274][E: codex-rs/exec/src/lib.rs:643][E: codex-rs/exec/src/lib.rs:644][E: codex-rs/exec/src/lib.rs:645][E: codex-rs/cli/src/main.rs:1260][E: codex-rs/cli/src/main.rs:1261][E: codex-rs/cli/src/main.rs:1267][E: codex-rs/cli/src/main.rs:1268] | `codex-rs/utils/cli/src/shared_options.rs:53` |
| `-C, --cd DIR` | `SharedCliOptions::cwd` | optional `PathBuf` | current dir | 指定 agent working root；exec path 会 canonicalize 指定 cwd，未指定时使用 current dir 作为 config cwd。[E: codex-rs/utils/cli/src/shared_options.rs:56][E: codex-rs/utils/cli/src/shared_options.rs:57][E: codex-rs/exec/src/lib.rs:289][E: codex-rs/exec/src/lib.rs:292][E: codex-rs/exec/src/lib.rs:294] | `codex-rs/utils/cli/src/shared_options.rs:57` |
| `--add-dir DIR` | `SharedCliOptions::add_dir` | repeatable `PathBuf` | `[]` | 为 primary workspace 之外的目录增加 writable root；exec path 放入 `ConfigOverrides.additional_writable_roots`。[E: codex-rs/utils/cli/src/shared_options.rs:60][E: codex-rs/utils/cli/src/shared_options.rs:61][E: codex-rs/exec/src/lib.rs:411] | `codex-rs/utils/cli/src/shared_options.rs:61` |
| `-a, --ask-for-approval MODE` | `codex_tui::Cli::approval_policy` | enum `untrusted|on-failure|on-request|never` | unset | 配置 command execution 前何时要 human approval；CLI enum 使用 kebab-case values 并转成 `AskForApproval`，`untrusted` 映射 `UnlessTrusted`。[E: codex-rs/tui/src/cli.rs:57][E: codex-rs/tui/src/cli.rs:58][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:8][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:13][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:19][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:22][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:26][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:32][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:33][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:34][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:35] | `codex-rs/tui/src/cli.rs:58` |
| `--search` | `codex_tui::Cli::web_search` | bool | false | 设置 TUI CLI 的 `web_search` bool；普通 interactive path 将整个 `TuiCli` 传给 `codex_tui::run_main`，debug prompt-input config construction 会把 true 转成 `web_search=\"live\"` override。[E: codex-rs/tui/src/cli.rs:61][E: codex-rs/tui/src/cli.rs:62][E: codex-rs/cli/src/main.rs:1483][E: codex-rs/cli/src/main.rs:1484][E: codex-rs/cli/src/main.rs:1251][E: codex-rs/cli/src/main.rs:1253][E: codex-rs/cli/src/main.rs:1254] | `codex-rs/tui/src/cli.rs:62` |
| `--no-alt-screen` | `codex_tui::Cli::no_alt_screen` | bool | false | 设置 TUI CLI 的 alternate-screen opt-out flag；普通 interactive path 将整个 `TuiCli` 传给 `codex_tui::run_main`。[E: codex-rs/tui/src/cli.rs:69][E: codex-rs/tui/src/cli.rs:70][E: codex-rs/cli/src/main.rs:1483][E: codex-rs/cli/src/main.rs:1484] | `codex-rs/tui/src/cli.rs:70` |

## 继承与冲突规则

`SharedCliOptions::inherit_exec_root_options()` 会把 root interactive shared options 复制给 exec subcommand，除非 exec subcommand 自己已经设置对应值；images 和 add_dir 会合并而不是简单覆盖，`cli_main()` 的 exec 分支会调用这个继承函数。[E: codex-rs/utils/cli/src/shared_options.rs:65][E: codex-rs/utils/cli/src/shared_options.rs:94][E: codex-rs/utils/cli/src/shared_options.rs:117][E: codex-rs/utils/cli/src/shared_options.rs:122][E: codex-rs/cli/src/main.rs:720][E: codex-rs/cli/src/main.rs:722] `SharedCliOptions::apply_subcommand_overrides()` 则把 subcommand-local shared values 写回 root-shaped options，用于需要 wrapper 到 interactive TUI 的入口。[E: codex-rs/utils/cli/src/shared_options.rs:129][E: codex-rs/utils/cli/src/shared_options.rs:146]

`TuiSharedCliOptions` 只额外给 dangerous bypass flag 加上与 `approval_policy` 的冲突关系，防止 interactive TUI 同时指定 `--ask-for-approval` 和 `--dangerously-bypass-approvals-and-sandbox`。[E: codex-rs/tui/src/cli.rs:133][E: codex-rs/tui/src/cli.rs:135]

## Sources

- `codex-rs/cli/src/main.rs`
- `codex-rs/utils/cli/src/shared_options.rs`
- `codex-rs/utils/cli/src/config_override.rs`
- `codex-rs/utils/cli/src/approval_mode_cli_arg.rs`
- `codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs`
- `codex-rs/tui/src/cli.rs`
- `codex-rs/exec/src/lib.rs`

## 相关

- [CLI 子命令 catalog](subcommands.md) — 覆盖这些 flags 流入的 subcommand dispatch。
- [exec 非交互模式](exec-mode.md) — 覆盖 `codex exec` 额外 global flags。
- [审批与沙箱设置](../config/approval-sandbox.md) — 覆盖 approval/sandbox config 键。
