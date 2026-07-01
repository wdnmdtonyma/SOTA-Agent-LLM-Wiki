---
id: cli.global-flags
title: CLI 全局 flag
kind: cli
tier: T1
source: [codex-rs/cli/src/main.rs, codex-rs/utils/cli/src/shared_options.rs, codex-rs/utils/cli/src/config_override.rs, codex-rs/utils/cli/src/approval_mode_cli_arg.rs, codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs, codex-rs/tui/src/cli.rs, codex-rs/exec/src/cli.rs, codex-rs/exec/src/lib.rs]
symbols: [MultitoolCli, SharedCliOptions, CliConfigOverrides, ApprovalModeCliArg, SandboxModeCliArg, FeatureToggles, InteractiveRemoteOptions, codex_tui::Cli, codex_exec::Cli]
related: [cli.subcommands, cli.exec-mode, config.model-provider, config.approval-sandbox, config.skills-plugins-features]
evidence: explicit
status: verified
updated: db887d03e1
---

> CLI 全局 flag 是 `codex` 根命令由 `MultitoolCli` 拼出的 option surface:root config override、feature toggle、remote app-server 连接、interactive TUI flags，以及 interactive/exec 共享的 model/sandbox/workdir flags。[E: codex-rs/cli/src/main.rs:106][E: codex-rs/cli/src/main.rs:120]

## 能回答的问题

- `codex` 根命令有哪些 top-level flags 和 positional prompt?
- `-c/--config` 如何解析 dotted config override?
- `--enable`/`--disable` 如何流入 feature config?
- 哪些 shared flags 会被 `codex exec` 继承?
- 当前 `--full-auto` 还是否是 root/shared flag?

## Root 形状

`MultitoolCli` 依次 flatten `CliConfigOverrides`、`FeatureToggles`、`InteractiveRemoteOptions` 和 `codex_tui::Cli`，最后挂载 optional `Subcommand`。[E: codex-rs/cli/src/main.rs:106][E: codex-rs/cli/src/main.rs:108][E: codex-rs/cli/src/main.rs:111][E: codex-rs/cli/src/main.rs:114][E: codex-rs/cli/src/main.rs:117][E: codex-rs/cli/src/main.rs:120] 因为 `codex_tui::Cli` 又 flatten `TuiSharedCliOptions`，root interactive surface 同时包含 `SharedCliOptions` 里的 model/sandbox/workdir flags。[E: codex-rs/tui/src/cli.rs:10][E: codex-rs/tui/src/cli.rs:58][E: codex-rs/tui/src/cli.rs:93][E: codex-rs/tui/src/cli.rs:117]

## Catalog

| flag / arg | 定义字段 | 类型 / 默认 | 语义 | 源 |
|---|---|---|---|---|
| `PROMPT` | `codex_tui::Cli::prompt` | optional positional | 不带 subcommand 时作为 initial user prompt 进入 interactive TUI。[E: codex-rs/tui/src/cli.rs:13][E: codex-rs/tui/src/cli.rs:13][E: codex-rs/cli/src/main.rs:987][E: codex-rs/cli/src/main.rs:993] | `codex-rs/tui/src/cli.rs:13` |
| `--strict-config` | `codex_tui::Cli::strict_config` | bool false | interactive root 可用；有 subcommand 时会先走 `reject_root_strict_config_for_subcommand()`，只让 allow-list 继承 root strict config。[E: codex-rs/tui/src/cli.rs:17][E: codex-rs/tui/src/cli.rs:17][E: codex-rs/cli/src/main.rs:981][E: codex-rs/cli/src/main.rs:982][E: codex-rs/cli/src/main.rs:2102][E: codex-rs/cli/src/main.rs:2117] | `codex-rs/tui/src/cli.rs:17` |
| `-c, --config key=value` | `CliConfigOverrides::raw_overrides` | repeatable string | 捕获 raw `key=value`；解析时只 split 第一个 `=`，右值优先按 TOML 解析，失败则作为 string，路径按 `.` 创建/覆盖 table。[E: codex-rs/utils/cli/src/config_override.rs:19][E: codex-rs/utils/cli/src/config_override.rs:36][E: codex-rs/utils/cli/src/config_override.rs:49][E: codex-rs/utils/cli/src/config_override.rs:55][E: codex-rs/utils/cli/src/config_override.rs:72][E: codex-rs/utils/cli/src/config_override.rs:108][E: codex-rs/utils/cli/src/config_override.rs:150] | `codex-rs/utils/cli/src/config_override.rs:36` |
| `--enable FEATURE` | `FeatureToggles::enable` | repeatable string | 转为 `features.<feature>=true` root config override；unknown feature 通过 `is_known_feature_key()` 报错。[E: codex-rs/cli/src/main.rs:877][E: codex-rs/cli/src/main.rs:880][E: codex-rs/cli/src/main.rs:902][E: codex-rs/cli/src/main.rs:906][E: codex-rs/cli/src/main.rs:915][E: codex-rs/cli/src/main.rs:919] | `codex-rs/cli/src/main.rs:879` |
| `--disable FEATURE` | `FeatureToggles::disable` | repeatable string | 转为 `features.<feature>=false` root config override，和 `--enable` 一样先校验 feature key。[E: codex-rs/cli/src/main.rs:883][E: codex-rs/cli/src/main.rs:884][E: codex-rs/cli/src/main.rs:908][E: codex-rs/cli/src/main.rs:910][E: codex-rs/cli/src/main.rs:915] | `codex-rs/cli/src/main.rs:883` |
| `--remote ADDR` | `InteractiveRemoteOptions::remote` | optional string | 连接 remote app-server endpoint；interactive root 直接传入 `run_interactive_tui()`，`resume`/`fork` 用 subcommand 值覆盖 root 值，`archive`/`delete`/`unarchive` 也通过 session archive path 合并 root/subcommand remote 值。[E: codex-rs/cli/src/main.rs:888][E: codex-rs/cli/src/main.rs:892][E: codex-rs/cli/src/main.rs:992][E: codex-rs/cli/src/main.rs:994][E: codex-rs/cli/src/main.rs:838][E: codex-rs/cli/src/main.rs:840][E: codex-rs/cli/src/main.rs:1262][E: codex-rs/cli/src/main.rs:1272][E: codex-rs/cli/src/main.rs:1285][E: codex-rs/cli/src/main.rs:1299][E: codex-rs/cli/src/main.rs:1329] | `codex-rs/cli/src/main.rs:892` |
| `--remote-auth-token-env ENV_VAR` | `InteractiveRemoteOptions::remote_auth_token_env` | optional string | 指定 bearer token 所在环境变量；interactive/session wrappers 会合并 root/subcommand 值，非 interactive/session path 会被 `reject_remote_mode_for_subcommand()` 拒绝。[E: codex-rs/cli/src/main.rs:897][E: codex-rs/cli/src/main.rs:897][E: codex-rs/cli/src/main.rs:995][E: codex-rs/cli/src/main.rs:838][E: codex-rs/cli/src/main.rs:840][E: codex-rs/cli/src/main.rs:1264][E: codex-rs/cli/src/main.rs:1272][E: codex-rs/cli/src/main.rs:1285][E: codex-rs/cli/src/main.rs:1299][E: codex-rs/cli/src/main.rs:2056][E: codex-rs/cli/src/main.rs:2058] | `codex-rs/cli/src/main.rs:897` |
| `-i, --image FILE` | `SharedCliOptions::images` | repeatable `PathBuf`, comma-delimited | 给 initial prompt 附加本地图片；exec 继承 root shared options 时会把 root images prepend 到 subcommand images。[E: codex-rs/utils/cli/src/shared_options.rs:18][E: codex-rs/utils/cli/src/shared_options.rs:18][E: codex-rs/utils/cli/src/shared_options.rs:119][E: codex-rs/utils/cli/src/shared_options.rs:122] | `codex-rs/utils/cli/src/shared_options.rs:18` |
| `-m, --model MODEL` | `SharedCliOptions::model` | optional string | 指定 agent model；exec path destructure 后写入 `ConfigOverrides.model`，未指定且 `--oss` 为 true 时尝试 provider 默认 model。[E: codex-rs/utils/cli/src/shared_options.rs:22][E: codex-rs/utils/cli/src/shared_options.rs:22][E: codex-rs/exec/src/lib.rs:266][E: codex-rs/exec/src/lib.rs:268][E: codex-rs/exec/src/lib.rs:410][E: codex-rs/exec/src/lib.rs:407] | `codex-rs/utils/cli/src/shared_options.rs:22` |
| `--oss` | `SharedCliOptions::oss` | bool false | 启用 open-source provider path；exec 只在 `oss` 为 true 时解析 OSS provider，并在 provider 缺失时报错。[E: codex-rs/utils/cli/src/shared_options.rs:26][E: codex-rs/utils/cli/src/shared_options.rs:26][E: codex-rs/exec/src/lib.rs:376][E: codex-rs/exec/src/lib.rs:396][E: codex-rs/exec/src/lib.rs:401] | `codex-rs/utils/cli/src/shared_options.rs:26` |
| `--local-provider PROVIDER` | `SharedCliOptions::oss_provider` | optional string | 指定 OSS/local provider id；exec 传给 `resolve_oss_provider()`。[E: codex-rs/utils/cli/src/shared_options.rs:31][E: codex-rs/utils/cli/src/shared_options.rs:31][E: codex-rs/exec/src/lib.rs:270][E: codex-rs/exec/src/lib.rs:396] | `codex-rs/utils/cli/src/shared_options.rs:31` |
| `-p, --profile PROFILE` | `SharedCliOptions::config_profile_v2` | optional `ProfileV2Name` | 选择 `$CODEX_HOME/<name>.config.toml` profile；exec loader overrides 用它构造 `user_config_path` 和 `user_config_profile`。[E: codex-rs/utils/cli/src/shared_options.rs:35][E: codex-rs/utils/cli/src/shared_options.rs:35][E: codex-rs/exec/src/lib.rs:327][E: codex-rs/exec/src/lib.rs:332] | `codex-rs/utils/cli/src/shared_options.rs:35` |
| `-s, --sandbox MODE` | `SharedCliOptions::sandbox_mode` | optional enum | CLI enum 值是 `read-only`、`workspace-write`、`danger-full-access`；exec 映射为 `ConfigOverrides.sandbox_mode`。[E: codex-rs/utils/cli/src/shared_options.rs:40][E: codex-rs/utils/cli/src/shared_options.rs:40][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:14][E: codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs:25][E: codex-rs/exec/src/lib.rs:292][E: codex-rs/exec/src/lib.rs:428] | `codex-rs/utils/cli/src/shared_options.rs:40` |
| `--dangerously-bypass-approvals-and-sandbox` / `--yolo` | `SharedCliOptions::dangerously_bypass_approvals_and_sandbox` | bool false | 跳过 confirmation prompts 且不使用 sandbox；exec 将其映射为 `SandboxMode::DangerFullAccess`，并跳过 git repo check 条件。[E: codex-rs/utils/cli/src/shared_options.rs:49][E: codex-rs/utils/cli/src/shared_options.rs:49][E: codex-rs/exec/src/lib.rs:292][E: codex-rs/exec/src/lib.rs:295][E: codex-rs/exec/src/lib.rs:780][E: codex-rs/exec/src/lib.rs:782] | `codex-rs/utils/cli/src/shared_options.rs:49` |
| `--dangerously-bypass-hook-trust` | `SharedCliOptions::bypass_hook_trust` | bool false | 仅本次 invocation 绕过 persisted hook trust；exec destructure 该字段并写入 `ConfigOverrides.bypass_hook_trust`。[E: codex-rs/utils/cli/src/shared_options.rs:54][E: codex-rs/utils/cli/src/shared_options.rs:54][E: codex-rs/exec/src/lib.rs:266][E: codex-rs/exec/src/lib.rs:274][E: codex-rs/exec/src/lib.rs:446] | `codex-rs/utils/cli/src/shared_options.rs:54` |
| `-C, --cd DIR` | `SharedCliOptions::cwd` | optional `PathBuf` | 指定 working root；exec 用该值 canonicalize config cwd，未指定时取 current dir。[E: codex-rs/utils/cli/src/shared_options.rs:58][E: codex-rs/utils/cli/src/shared_options.rs:58][E: codex-rs/exec/src/lib.rs:310][E: codex-rs/exec/src/lib.rs:315] | `codex-rs/utils/cli/src/shared_options.rs:58` |
| `--add-dir DIR` | `SharedCliOptions::add_dir` | repeatable `PathBuf` | 为 primary workspace 之外的路径增加 writable root；shared inheritance 会合并 root/subcommand add-dir。[E: codex-rs/utils/cli/src/shared_options.rs:62][E: codex-rs/utils/cli/src/shared_options.rs:62][E: codex-rs/utils/cli/src/shared_options.rs:124][E: codex-rs/utils/cli/src/shared_options.rs:127] | `codex-rs/utils/cli/src/shared_options.rs:62` |
| `-a, --ask-for-approval MODE` | `codex_tui::Cli::approval_policy` | optional enum | interactive approval policy；CLI enum 映射 `untrusted/on-request/never` 到 `AskForApproval`。[E: codex-rs/tui/src/cli.rs:62][E: codex-rs/tui/src/cli.rs:62][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:9][E: codex-rs/utils/cli/src/approval_mode_cli_arg.rs:23] | `codex-rs/tui/src/cli.rs:62` |
| `--search` | `codex_tui::Cli::web_search` | bool false | 开启 interactive native web search；`features list` 也会把它作为 canonical `web_search="live"` override 来计算 effective feature rows。[E: codex-rs/tui/src/cli.rs:66][E: codex-rs/tui/src/cli.rs:66][E: codex-rs/cli/src/main.rs:1600][E: codex-rs/cli/src/main.rs:1604] | `codex-rs/tui/src/cli.rs:66` |
| `--no-alt-screen` | `codex_tui::Cli::no_alt_screen` | bool false | 让 TUI inline 运行并保留 terminal scrollback。[E: codex-rs/tui/src/cli.rs:72][E: codex-rs/tui/src/cli.rs:72] | `codex-rs/tui/src/cli.rs:72` |

## 继承与优先级

root config overrides 通过 `prepend_root_overrides()` 放到 subcommand-local overrides 前面，因此 subcommand 后面解析到的 `-c` 有更高优先级。[E: codex-rs/utils/cli/src/config_override.rs:39][E: codex-rs/utils/cli/src/config_override.rs:44][E: codex-rs/cli/src/main.rs:2049][E: codex-rs/cli/src/main.rs:2053]

`codex exec` 入口会调用 `SharedCliOptions::inherit_exec_root_options()` 继承 root interactive shared options；该函数对 unset 的 scalar 才复制 root 值，对 images/add-dir 采用合并策略，并保留 subcommand 自己显式选择的 sandbox/dangerous bypass。[E: codex-rs/cli/src/main.rs:1007][E: codex-rs/cli/src/main.rs:1009][E: codex-rs/utils/cli/src/shared_options.rs:66][E: codex-rs/utils/cli/src/shared_options.rs:109][E: codex-rs/utils/cli/src/shared_options.rs:119][E: codex-rs/utils/cli/src/shared_options.rs:127]

`codex exec` 还把 shared `--model`、`--dangerously-bypass-approvals-and-sandbox` 和 `--dangerously-bypass-hook-trust` 标成 exec-global args，允许这些 flags 出现在 exec subcommand 之后。[E: codex-rs/exec/src/cli.rs:157][E: codex-rs/exec/src/cli.rs:162]

root-level `--profile` 在无 subcommand 的 interactive root path 不走 subcommand reject；有 subcommand 时会走 `profile_v2_for_subcommand()` allow-list，当前允许 exec、review、resume/archive/delete/unarchive/fork、mcp、sandbox 和 `debug prompt-input`，其他 subcommand 会报错。[E: codex-rs/cli/src/main.rs:983][E: codex-rs/cli/src/main.rs:1650][E: codex-rs/cli/src/main.rs:1658][E: codex-rs/cli/src/main.rs:1672]

当前 `--full-auto` 不是 `SharedCliOptions` 的 root/shared flag；它只保留在 `codex exec` 的 hidden compatibility trap 中，并在 exec run_main 内映射到 `SandboxMode::WorkspaceWrite` 后打印 deprecation warning。[E: codex-rs/utils/cli/src/shared_options.rs:9][E: codex-rs/utils/cli/src/shared_options.rs:62][E: codex-rs/exec/src/cli.rs:50][E: codex-rs/exec/src/cli.rs:50][E: codex-rs/exec/src/cli.rs:103][E: codex-rs/exec/src/lib.rs:292]

`TuiSharedCliOptions` 只额外给 dangerous bypass flag 加上与 `approval_policy` 的冲突关系，防止 interactive TUI 同时声明两套审批策略。[E: codex-rs/tui/src/cli.rs:93][E: codex-rs/tui/src/cli.rs:135][E: codex-rs/tui/src/cli.rs:138]

## Sources

- `codex-rs/cli/src/main.rs`
- `codex-rs/utils/cli/src/shared_options.rs`
- `codex-rs/utils/cli/src/config_override.rs`
- `codex-rs/utils/cli/src/approval_mode_cli_arg.rs`
- `codex-rs/utils/cli/src/sandbox_mode_cli_arg.rs`
- `codex-rs/tui/src/cli.rs`
- `codex-rs/exec/src/cli.rs`
- `codex-rs/exec/src/lib.rs`

## 相关

- [CLI 子命令 catalog](subcommands.md) - 覆盖这些 flags 如何进入 root dispatch。
- [exec 非交互模式](exec-mode.md) - 覆盖 `codex exec` 专属 flags 与事件循环。
- [审批与沙箱设置](../config/approval-sandbox.md) - 覆盖 approval/sandbox config 键。
