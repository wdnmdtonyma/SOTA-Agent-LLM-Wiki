---
id: cli.subcommands
title: CLI 子命令 catalog
kind: cli
tier: T1
source: [codex-rs/cli/src/main.rs, codex-rs/cli/src/queue_cmd.rs, codex-rs/cli/src/remote_control_cmd.rs, codex-rs/cli/src/doctor.rs, codex-rs/cli/src/doctor/disk.rs, codex-rs/cli/src/doctor/security.rs, codex-rs/cli/src/doctor/output.rs, codex-rs/cli/src/migrate_rollouts.rs, codex-rs/app-server-protocol/src/precomputed_exports.rs]
symbols: [MultitoolCli, Subcommand, cli_main, AppServerCommand, AppServerSubcommand, DebugCommand, ExecServerCommand, RemoteControlCommand, FeatureToggles, FeaturesCli, DoctorCommand, MigrateRolloutsCommand, AgentsCommand, QueueCommand]
related: [spine.process-lifecycle, cli.global-flags, cli.exec-mode, surface.cli.external-agent-import, command.session-thread, config.skills-plugins-features, subsys.core.rollout-migration, subsys.platform.diagnostics]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> CLI 子命令 catalog 覆盖当前 `codex` 根命令的 `Subcommand` enum：没有 subcommand 时进入 interactive TUI，有 subcommand 时由 `cli_main()` 分派到 exec、auth、MCP **client** 管理、plugin、app-server、session 管理、sandbox、debug、cloud、features、doctor、migrate-rollouts、agents、queue、hidden `tcp-tunnel` 等入口。`codex mcp-server` 已删除。[E: codex-rs/cli/src/main.rs:126][E: codex-rs/cli/src/main.rs:143][E: codex-rs/cli/src/main.rs:1023]

## 能回答的问题

- 当前 `codex` 根命令有哪些 top-level subcommand?
- 哪些 subcommand 有 alias、hidden 或平台条件编译?
- 根 `codex review` 与 `codex exec review` 的关系是什么?
- `--remote`、`--remote-auth-token-env` 和 root `--strict-config` 在哪些 subcommand 上被拒绝?

## Catalog

`MultitoolCli` 把 config overrides、feature toggles、remote options、interactive TUI args 和 optional `Subcommand` 依次 flatten/挂载；root usage 仍是 `codex [OPTIONS] [PROMPT]` 或 `codex [OPTIONS] <COMMAND> [ARGS]`。[E: codex-rs/cli/src/main.rs:125][E: codex-rs/cli/src/main.rs:127][E: codex-rs/cli/src/main.rs:130][E: codex-rs/cli/src/main.rs:133][E: codex-rs/cli/src/main.rs:136][E: codex-rs/cli/src/main.rs:139] 当前 `Subcommand` enum 有 **30** 个 top-level variant（含平台条件 `app` 与 hidden `TcpTunnel`）；`app` 仅在 macOS/Windows 编译，`tcp-tunnel`、`execpolicy`、`responses-api-proxy`、`stdio-to-uds` 是 hidden/internal 入口。没有 `McpServer`。[E: codex-rs/cli/src/main.rs:143][E: codex-rs/cli/src/main.rs:145][E: codex-rs/cli/src/main.rs:148][E: codex-rs/cli/src/main.rs:176][E: codex-rs/cli/src/main.rs:195][E: codex-rs/cli/src/main.rs:229][E: codex-rs/cli/src/main.rs:233]

| 命令 | enum variant | 门控 / alias | 分派语义 | 源 |
|---|---|---|---|---|
| 无 subcommand | `None` | 默认 interactive | `cli_main()` prepend root config flags 后调用 `run_interactive_tui()`，并传入 root remote options。[E: codex-rs/cli/src/main.rs:1079][E: codex-rs/cli/src/main.rs:1122] | `codex-rs/cli/src/main.rs:1079` |
| `agents` | `Agents(AgentsCommand)` | 与无 subcommand 共用 interactive TUI；可带 subcommand-local remote/`--cd`/`--no-alt-screen` | 浏览 shared local app-server daemon 上的 agent sessions。dispatch 把 `agents_overview` 设为 true，拒绝 initial prompt/images；无 `--remote` 时解析 local daemon endpoint，仅非 Unix 且非 Windows 才强制 `--remote`。[E: codex-rs/cli/src/main.rs:145][E: codex-rs/cli/src/main.rs:333][E: codex-rs/cli/src/main.rs:1085][E: codex-rs/cli/src/main.rs:1112][E: codex-rs/cli/src/main.rs:1117] | `codex-rs/cli/src/main.rs:144` |
| `tcp-tunnel` | `TcpTunnel(codex_tcp_tunnel::Args)` | hidden internal;拒绝 root `--strict-config` | 把本地 TCP socket 经 HTTP/3 CONNECT proxy 转发；dispatch 直接 `return codex_tcp_tunnel::run(args).await`。[E: codex-rs/cli/src/main.rs:148][E: codex-rs/cli/src/main.rs:1131][E: codex-rs/cli/src/main.rs:2266] | `codex-rs/cli/src/main.rs:149` |
| `exec` | `Exec(ExecCli)` | alias `e`;拒绝 root remote | 非交互执行；继承 interactive shared options、合并 root config overrides，然后调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:151][E: codex-rs/cli/src/main.rs:1134][E: codex-rs/cli/src/main.rs:1142][E: codex-rs/cli/src/main.rs:1148] | `codex-rs/cli/src/main.rs:152` |
| `review` | `Review(ReviewCommand)` | 拒绝 root remote | 根 review 是 exec review wrapper；它构造 `ExecCli`，把 command 设为 `ExecCommand::Review`，再调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:155][E: codex-rs/cli/src/main.rs:1150][E: codex-rs/cli/src/main.rs:1163] | `codex-rs/cli/src/main.rs:155` |
| `login` | `Login(LoginCommand)` | 拒绝 root remote | 支持 `status`、device auth、stdin API key、stdin access token 和 ChatGPT login。[E: codex-rs/cli/src/main.rs:158][E: codex-rs/cli/src/main.rs:1553] | `codex-rs/cli/src/main.rs:157` |
| `logout` | `Logout(LogoutCommand)` | 拒绝 root remote | 合并 root config overrides 后走 logout path。[E: codex-rs/cli/src/main.rs:161] | `codex-rs/cli/src/main.rs:160` |
| `mcp` | `Mcp(McpCli)` | 拒绝 root remote | 管理 **external** MCP servers；root config overrides prepend 后传入 `mcp_cli.run()`。这不是 Codex 自身的 stdio MCP server。[E: codex-rs/cli/src/main.rs:164][E: codex-rs/cli/src/main.rs:1171][E: codex-rs/cli/src/main.rs:1181] | `codex-rs/cli/src/main.rs:164` |
| `plugin` | `Plugin(PluginCli)` | 拒绝 root remote | 管理 Codex plugins；dispatch 覆盖 add/list/marketplace/remove 四类 plugin subcommand。[E: codex-rs/cli/src/main.rs:167][E: codex-rs/cli/src/main.rs:1183] | `codex-rs/cli/src/main.rs:167` |
| `app-server` | `AppServer(AppServerCommand)` | experimental;root server 可用 `--strict-config`，tooling 子命令另行检查 | 不带 nested subcommand 时运行 app-server transport；`--code-mode-host` 令该进程连接共享的远端 Code Mode host；nested subcommands 覆盖 daemon/proxy/generate-ts/generate-json-schema/internal-json-schema。auth flatten 使用 `codex_websocket_auth::WebsocketAuthArgs`。[E: codex-rs/cli/src/main.rs:170][E: codex-rs/cli/src/main.rs:553][E: codex-rs/cli/src/main.rs:605][E: codex-rs/cli/src/main.rs:1219][E: codex-rs/cli/src/main.rs:1232] | `codex-rs/cli/src/main.rs:170` |
| `remote-control` | `RemoteControl(RemoteControlCommand)` | experimental;拒绝 root remote | 不带 nested subcommand 时启动 foreground app-server 并临时启用 remote control；nested `start`/`stop` 管理 daemon remote-control 状态，`pair` 创建短期 pairing code。dispatch 用 subcommand 自报名称做 remote-mode 拒绝，然后调用 `remote_control_cmd::run()`。[E: codex-rs/cli/src/main.rs:173][E: codex-rs/cli/src/remote_control_cmd.rs:32][E: codex-rs/cli/src/main.rs:1414][E: codex-rs/cli/src/main.rs:1421] | `codex-rs/cli/src/main.rs:173` |
| `app` | `App(app_cmd::AppCommand)` | macOS/Windows only;拒绝 root remote | 启动 Codex desktop app 或 installer path。[E: codex-rs/cli/src/main.rs:176][E: codex-rs/cli/src/main.rs:1429][E: codex-rs/cli/src/main.rs:1435] | `codex-rs/cli/src/main.rs:177` |
| `completion` | `Completion(CompletionCommand)` | 拒绝 root remote | 生成 shell completions；shell 参数默认 bash。[E: codex-rs/cli/src/main.rs:180][E: codex-rs/cli/src/main.rs:245] | `codex-rs/cli/src/main.rs:180` |
| `update` | `Update` | 拒绝 root remote | 检查安装方式并运行 update action；debug builds 会拒绝。[E: codex-rs/cli/src/main.rs:183][E: codex-rs/cli/src/main.rs:1617] | `codex-rs/cli/src/main.rs:183` |
| `doctor` | `Doctor(DoctorCommand)` | 拒绝 root remote | 诊断本地安装、配置、认证和 runtime health。报告按 Environment/Configuration/Desktop App 等分组。[E: codex-rs/cli/src/main.rs:186][E: codex-rs/cli/src/doctor.rs:159][E: codex-rs/cli/src/doctor/output.rs:26][E: codex-rs/cli/src/main.rs:1625] | `codex-rs/cli/src/main.rs:186` |
| `sandbox` | `Sandbox(HostSandboxArgs)` | OS-specific host sandbox;拒绝 root remote | `HostSandboxArgs` 在 macOS/Linux/Windows 分别映射到 Seatbelt/Landlock/Windows sandbox command；dispatch 按平台调用对应 runner。[E: codex-rs/cli/src/main.rs:189][E: codex-rs/cli/src/main.rs:460][E: codex-rs/cli/src/main.rs:462][E: codex-rs/cli/src/main.rs:464][E: codex-rs/cli/src/main.rs:1652] | `codex-rs/cli/src/main.rs:188` |
| `debug` | `Debug(DebugCommand)` | 拒绝 root remote | Debug tooling 包含 `models`、`app-server`、`prompt-input` 和 hidden `trace-reduce`/`clear-memories`。[E: codex-rs/cli/src/main.rs:192][E: codex-rs/cli/src/main.rs:250][E: codex-rs/cli/src/main.rs:258][E: codex-rs/cli/src/main.rs:261][E: codex-rs/cli/src/main.rs:264] | `codex-rs/cli/src/main.rs:192` |
| `execpolicy` | `Execpolicy(ExecpolicyCommand)` | hidden;拒绝 root remote | Hidden execpolicy tooling；当前 nested command 是 `check`。[E: codex-rs/cli/src/main.rs:195][E: codex-rs/cli/src/main.rs:485][E: codex-rs/cli/src/main.rs:1756] | `codex-rs/cli/src/main.rs:196` |
| `apply` | `Apply(ApplyCommand)` | alias `a`;拒绝 root remote | 将 Codex agent 产生的 latest diff 作为 `git apply` 应用到工作树。[E: codex-rs/cli/src/main.rs:199][E: codex-rs/cli/src/main.rs:1766] | `codex-rs/cli/src/main.rs:199` |
| `resume` | `Resume(ResumeCommand)` | session wrapper;可带 subcommand-local remote options | 恢复 interactive session；`session_id/--last/--all/--include-non-interactive` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:203][E: codex-rs/cli/src/main.rs:1437][E: codex-rs/cli/src/main.rs:1455] | `codex-rs/cli/src/main.rs:203` |
| `queue` | `Queue(QueueCommand)` | session wrapper;可带 remote options | 向已有 session 排队一条文本消息。要求 `--thread` 与非空 `--message`；不支持 image attachments；合并 root/subcommand remote 后调用 `queue_cmd::run_queue_command()`。[E: codex-rs/cli/src/main.rs:206][E: codex-rs/cli/src/queue_cmd.rs:13][E: codex-rs/cli/src/queue_cmd.rs:16][E: codex-rs/cli/src/queue_cmd.rs:20][E: codex-rs/cli/src/main.rs:1479] | `codex-rs/cli/src/main.rs:206` |
| `archive` | `Archive(SessionArchiveCommand)` | session wrapper;可带 remote options | 归档 saved session；共用 `run_session_archive_cli_command()`，输出 command result。[E: codex-rs/cli/src/main.rs:209][E: codex-rs/cli/src/main.rs:1466] | `codex-rs/cli/src/main.rs:209` |
| `delete` | `Delete(DeleteCommand)` | session wrapper;`--force` 要求 UUID | 删除 saved session；先把 `--force` 映射成 delete confirmation policy，再走 session archive command path。[E: codex-rs/cli/src/main.rs:212][E: codex-rs/cli/src/main.rs:1491] | `codex-rs/cli/src/main.rs:212` |
| `migrate-rollouts` | `MigrateRollouts(MigrateRolloutsCommand)` | 拒绝 root remote | 检查或迁移 legacy local sessions 到 paginated thread history。默认 dry-run；`--apply` 才写入。[E: codex-rs/cli/src/main.rs:215][E: codex-rs/cli/src/main.rs:1505] | `codex-rs/cli/src/main.rs:215` |
| `unarchive` | `Unarchive(SessionArchiveCommand)` | session wrapper;可带 remote options | 取消归档 saved session；共用 session archive command path。[E: codex-rs/cli/src/main.rs:218][E: codex-rs/cli/src/main.rs:1513] | `codex-rs/cli/src/main.rs:218` |
| `fork` | `Fork(ForkCommand)` | session wrapper;可带 subcommand-local remote options | fork previous interactive session；`session_id/--last/--all` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:221][E: codex-rs/cli/src/main.rs:1526] | `codex-rs/cli/src/main.rs:221` |
| `cloud` / `cloud-tasks` | `Cloud(CloudTasksCli)` | alias `cloud-tasks`;拒绝 root remote | 浏览 Codex Cloud tasks 并本地 apply changes。[E: codex-rs/cli/src/main.rs:224][E: codex-rs/cli/src/main.rs:1639] | `codex-rs/cli/src/main.rs:225` |
| `responses-api-proxy` | `ResponsesApiProxy(ResponsesApiProxyArgs)` | hidden internal;拒绝 root remote | 运行 internal responses API proxy；dispatch 通过 `spawn_blocking` 调用 proxy main。[E: codex-rs/cli/src/main.rs:228][E: codex-rs/cli/src/main.rs:1778] | `codex-rs/cli/src/main.rs:229` |
| `stdio-to-uds` | `StdioToUds(StdioToUdsCommand)` | hidden internal;拒绝 root remote | 将 stdio relay 到 Unix domain socket。[E: codex-rs/cli/src/main.rs:233][E: codex-rs/cli/src/main.rs:1787] | `codex-rs/cli/src/main.rs:233` |
| `exec-server` | `ExecServer(ExecServerCommand)` | experimental;拒绝 root remote | 运行 standalone exec-server service；支持 listen 或 remote registration 参数。[E: codex-rs/cli/src/main.rs:236][E: codex-rs/cli/src/main.rs:1796] | `codex-rs/cli/src/main.rs:236` |
| `features` | `Features(FeaturesCli)` | 拒绝 root remote | feature flags inspection/editing；nested subcommands 是 `list`、`enable <feature>`、`disable <feature>`。[E: codex-rs/cli/src/main.rs:239][E: codex-rs/cli/src/main.rs:982][E: codex-rs/cli/src/main.rs:988][E: codex-rs/cli/src/main.rs:1805] | `codex-rs/cli/src/main.rs:239` |

## 共性规则

`--enable`/`--disable` 在 dispatch 前被转换成 `features.<name>=true/false` 并追加到 root config overrides，因此会随 root overrides 继续流入消费 config 的 subcommand。[E: codex-rs/cli/src/main.rs:936][E: codex-rs/cli/src/main.rs:961][E: codex-rs/cli/src/main.rs:963][E: codex-rs/cli/src/main.rs:1044][E: codex-rs/cli/src/main.rs:1045]

多数非交互命令在 dispatch 开头调用 `reject_remote_mode_for_subcommand()`；该函数明确拒绝 root `--remote` 与 `--remote-auth-token-env`，错误文案说这些只支持 interactive TUI commands。[E: codex-rs/cli/src/main.rs:2139][E: codex-rs/cli/src/main.rs:2144][E: codex-rs/cli/src/main.rs:2146][E: codex-rs/cli/src/main.rs:2149][E: codex-rs/cli/src/main.rs:2151] `agents`、`resume`、`queue`、`fork` 和 session archive/delete/unarchive wrappers 不走这个拒绝函数，而是把 root/subcommand remote options 合并后进入 TUI/session command path。[E: codex-rs/cli/src/main.rs:1079][E: codex-rs/cli/src/main.rs:1437][E: codex-rs/cli/src/main.rs:1479][E: codex-rs/cli/src/main.rs:1466][E: codex-rs/cli/src/main.rs:1526]

root `--strict-config` 只有部分 subcommand 可继承；源码 allow-list 包含 interactive、`agents`、exec、review、exec-server、resume/`queue`/archive/delete/unarchive/fork、doctor 和 root app-server。`mcp-server` 已不在 allow-list，因为该子命令已删除。`migrate-rollouts` 与 `tcp-tunnel` 不在该 allow-list。[E: codex-rs/cli/src/main.rs:2228][E: codex-rs/cli/src/main.rs:2232][E: codex-rs/cli/src/main.rs:2244][E: codex-rs/cli/src/main.rs:2251][E: codex-rs/cli/src/main.rs:2266]

root `--profile` 在有 subcommand 时走 `profile_v2_for_subcommand()` allow-list：`agents`、exec、review、resume/`queue`/archive/delete/unarchive/fork、mcp、sandbox 和 `debug prompt-input`。[E: codex-rs/cli/src/main.rs:1861][E: codex-rs/cli/src/main.rs:1869][E: codex-rs/cli/src/main.rs:1881]

## doctor 检查面

`codex doctor` 是 read-mostly：它不修复状态，只生成 redacted human/JSON 报告；overall Fail 以 exit 1 结束。[E: codex-rs/cli/src/doctor.rs:332][E: codex-rs/cli/src/doctor.rs:346] 当前固定检查包括：

- **disk**：`disk` 比较 `CODEX_HOME` 与 worktree 可用空间；低于 1 GiB Fail，低于 5 GiB Warning。[E: codex-rs/cli/src/doctor.rs:383][E: codex-rs/cli/src/doctor/disk.rs:12][E: codex-rs/cli/src/doctor/disk.rs:13][E: codex-rs/cli/src/doctor/disk.rs:15]
- **security / endpoint**：`endpoint protection` 探测 macOS/Windows endpoint protection 产品。[E: codex-rs/cli/src/doctor.rs:362]

## Sources

- `codex-rs/cli/src/main.rs`
- `codex-rs/cli/src/queue_cmd.rs`
- `codex-rs/cli/src/remote_control_cmd.rs`
- `codex-rs/cli/src/doctor.rs`
- `codex-rs/cli/src/doctor/disk.rs`
- `codex-rs/cli/src/doctor/security.rs`
- `codex-rs/cli/src/doctor/output.rs`
- `codex-rs/cli/src/migrate_rollouts.rs`
- `codex-rs/app-server-protocol/src/precomputed_exports.rs`

## 相关

- [进程生命周期](../../spine/process-lifecycle.md) - 解释 `main()`、arg0 dispatch 与进程入口。
- [CLI 全局 flag](global-flags.md) - 覆盖 root option surface、shared flags、remote 和 config override。
- [exec 非交互模式](exec-mode.md) - 深入 `codex exec` 的 flags、resume/review 与事件循环。
- [从外部 agent 导入](external-agent-import.md) - `/import` 与 externalAgentConfig RPC 的迁移入口。
- [Code Mode runtime](../../subsystems/core/code-mode-runtime.md) - `--code-mode-host` 的 URL 校验、共享连接和 host transport。
