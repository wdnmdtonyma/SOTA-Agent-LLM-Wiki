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
updated: a9519cbcdd
---

> CLI 子命令 catalog 覆盖当前 `codex` 根命令的 `Subcommand` enum：没有 subcommand 时进入 interactive TUI，有 subcommand 时由 `cli_main()` 分派到 exec、auth、MCP、plugin、app-server、session 管理、sandbox、debug、cloud、features、doctor、migrate-rollouts、agents、queue 等入口。[E: codex-rs/cli/src/main.rs:128][E: codex-rs/cli/src/main.rs:132][E: codex-rs/cli/src/main.rs:1046]

## 能回答的问题

- 当前 `codex` 根命令有哪些 top-level subcommand?
- 哪些 subcommand 有 alias、hidden 或平台条件编译?
- 根 `codex review` 与 `codex exec review` 的关系是什么?
- `--remote`、`--remote-auth-token-env` 和 root `--strict-config` 在哪些 subcommand 上被拒绝?

## Catalog

`MultitoolCli` 把 config overrides、feature toggles、remote options、interactive TUI args 和 optional `Subcommand` 依次 flatten/挂载；root usage 仍是 `codex [OPTIONS] [PROMPT]` 或 `codex [OPTIONS] <COMMAND> [ARGS]`。[E: codex-rs/cli/src/main.rs:114][E: codex-rs/cli/src/main.rs:116][E: codex-rs/cli/src/main.rs:119][E: codex-rs/cli/src/main.rs:122][E: codex-rs/cli/src/main.rs:125][E: codex-rs/cli/src/main.rs:128] 当前 `Subcommand` enum 有 30 个 top-level variant（含平台条件 `app`）；`app` 仅在 macOS/Windows 编译，`execpolicy`、`responses-api-proxy`、`stdio-to-uds` 是 hidden/internal 入口。本轮新增 `agents` 与 `queue`。[E: codex-rs/cli/src/main.rs:132][E: codex-rs/cli/src/main.rs:134][E: codex-rs/cli/src/main.rs:195][E: codex-rs/cli/src/main.rs:165][E: codex-rs/cli/src/main.rs:184][E: codex-rs/cli/src/main.rs:218][E: codex-rs/cli/src/main.rs:222]

| 命令 | enum variant | 门控 / alias | 分派语义 | 源 |
|---|---|---|---|---|
| 无 subcommand | `None` | 默认 interactive | `cli_main()` prepend root config flags 后调用 `run_interactive_tui()`，并传入 root remote options。[E: codex-rs/cli/src/main.rs:1092][E: codex-rs/cli/src/main.rs:1135] | `codex-rs/cli/src/main.rs:1092` |
| `agents` | `Agents(AgentsCommand)` | 与无 subcommand 共用 interactive TUI；可带 subcommand-local remote/`--cd`/`--no-alt-screen` | 浏览 shared local app-server daemon 上的 agent sessions。dispatch 把 `agents_overview` 设为 true，拒绝 initial prompt/images；无 `--remote` 时解析 local daemon endpoint，非 Unix 平台要求显式 `--remote`。[E: codex-rs/cli/src/main.rs:134][E: codex-rs/cli/src/main.rs:329][E: codex-rs/cli/src/main.rs:1090][E: codex-rs/cli/src/main.rs:1098][E: codex-rs/cli/src/main.rs:1133] | `codex-rs/cli/src/main.rs:134` |
| `exec` | `Exec(ExecCli)` | alias `e`;拒绝 root remote | 非交互执行；继承 interactive shared options、合并 root config overrides，然后调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:137][E: codex-rs/cli/src/main.rs:1144][E: codex-rs/cli/src/main.rs:1145][E: codex-rs/cli/src/main.rs:1152] | `codex-rs/cli/src/main.rs:138` |
| `review` | `Review(ReviewCommand)` | 拒绝 root remote | 根 review 是 exec review wrapper；它构造 `ExecCli`，把 command 设为 `ExecCommand::Review`，再调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:141][E: codex-rs/cli/src/main.rs:1160][E: codex-rs/cli/src/main.rs:1164] | `codex-rs/cli/src/main.rs:141` |
| `login` | `Login(LoginCommand)` | 拒绝 root remote | 支持 `status`、device auth、stdin API key、stdin access token 和 ChatGPT login。[E: codex-rs/cli/src/main.rs:144][E: codex-rs/cli/src/main.rs:491][E: codex-rs/cli/src/main.rs:1515][E: codex-rs/cli/src/main.rs:1516] | `codex-rs/cli/src/main.rs:144` |
| `logout` | `Logout(LogoutCommand)` | 拒绝 root remote | 合并 root config overrides 后调用 `run_logout()`。[E: codex-rs/cli/src/main.rs:147][E: codex-rs/cli/src/main.rs:540][E: codex-rs/cli/src/main.rs:1559][E: codex-rs/cli/src/main.rs:1560] | `codex-rs/cli/src/main.rs:147` |
| `mcp` | `Mcp(McpCli)` | 拒绝 root remote | 管理 external MCP servers；root config overrides prepend 后传入 `mcp_cli.run()`。[E: codex-rs/cli/src/main.rs:150][E: codex-rs/cli/src/main.rs:1197][E: codex-rs/cli/src/main.rs:1198] | `codex-rs/cli/src/main.rs:150` |
| `plugin` | `Plugin(PluginCli)` | 拒绝 root remote | 管理 Codex plugins；dispatch 覆盖 add/list/marketplace/remove 四类 plugin subcommand。[E: codex-rs/cli/src/main.rs:153][E: codex-rs/cli/src/main.rs:1209][E: codex-rs/cli/src/main.rs:1210] | `codex-rs/cli/src/main.rs:153` |
| `mcp-server` | `McpServer(McpServerCommand)` | 拒绝 root remote | 以 stdio MCP server 方式启动 Codex，支持 subcommand-local `--strict-config`。[E: codex-rs/cli/src/main.rs:156][E: codex-rs/cli/src/main.rs:311][E: codex-rs/cli/src/main.rs:1181][E: codex-rs/cli/src/main.rs:1185] | `codex-rs/cli/src/main.rs:156` |
| `app-server` | `AppServer(AppServerCommand)` | experimental;root server 可用 `--strict-config`，tooling 子命令另行检查 | 不带 nested subcommand 时运行 app-server transport；`--code-mode-host` 令该进程连接共享的远端 Code Mode host；nested subcommands 覆盖 daemon/proxy/generate-ts/generate-json-schema/internal-json-schema。[E: codex-rs/cli/src/main.rs:159][E: codex-rs/cli/src/main.rs:546][E: codex-rs/cli/src/main.rs:1245][E: codex-rs/cli/src/main.rs:1258] | `codex-rs/cli/src/main.rs:159` |
| `remote-control` | `RemoteControl(RemoteControlCommand)` | experimental;拒绝 root remote | 不带 nested subcommand 时启动 foreground app-server 并临时启用 remote control；nested `start`/`stop` 管理 daemon remote-control 状态，`pair` 创建短期 pairing code。dispatch 用 subcommand 自报名称做 remote-mode 拒绝，然后调用 `remote_control_cmd::run()`。[E: codex-rs/cli/src/main.rs:162][E: codex-rs/cli/src/remote_control_cmd.rs:32][E: codex-rs/cli/src/main.rs:1376][E: codex-rs/cli/src/main.rs:1378][E: codex-rs/cli/src/main.rs:1383] | `codex-rs/cli/src/main.rs:162` |
| `app` | `App(app_cmd::AppCommand)` | macOS/Windows only;拒绝 root remote | 启动 Codex desktop app 或 installer path。[E: codex-rs/cli/src/main.rs:165][E: codex-rs/cli/src/main.rs:166][E: codex-rs/cli/src/main.rs:1391][E: codex-rs/cli/src/main.rs:1392] | `codex-rs/cli/src/main.rs:166` |
| `completion` | `Completion(CompletionCommand)` | 拒绝 root remote | 生成 shell completions；shell 参数默认 bash。[E: codex-rs/cli/src/main.rs:169][E: codex-rs/cli/src/main.rs:232][E: codex-rs/cli/src/main.rs:1571][E: codex-rs/cli/src/main.rs:1572] | `codex-rs/cli/src/main.rs:169` |
| `update` | `Update` | 拒绝 root remote | 检查安装方式并运行 update action；debug builds 会拒绝。[E: codex-rs/cli/src/main.rs:172][E: codex-rs/cli/src/main.rs:1579][E: codex-rs/cli/src/main.rs:1580] | `codex-rs/cli/src/main.rs:172` |
| `doctor` | `Doctor(DoctorCommand)` | 拒绝 root remote | 诊断本地安装、配置、认证和 runtime health。报告按 Environment/Configuration/Updates/Connectivity/Background Server 分组。[E: codex-rs/cli/src/main.rs:175][E: codex-rs/cli/src/doctor.rs:168][E: codex-rs/cli/src/main.rs:1587][E: codex-rs/cli/src/main.rs:1593] | `codex-rs/cli/src/main.rs:175` |
| `sandbox` | `Sandbox(HostSandboxArgs)` | OS-specific host sandbox;拒绝 root remote | `HostSandboxArgs` 在 macOS/Linux/Windows 分别映射到 Seatbelt/Landlock/Windows sandbox command；dispatch 按平台调用对应 runner。[E: codex-rs/cli/src/main.rs:178][E: codex-rs/cli/src/main.rs:453][E: codex-rs/cli/src/main.rs:455][E: codex-rs/cli/src/main.rs:457][E: codex-rs/cli/src/main.rs:1614] | `codex-rs/cli/src/main.rs:178` |
| `debug` | `Debug(DebugCommand)` | 拒绝 root remote | Debug tooling 包含 `models`、`app-server`、`prompt-input` 和 hidden `trace-reduce`/`clear-memories`。[E: codex-rs/cli/src/main.rs:181][E: codex-rs/cli/src/main.rs:239][E: codex-rs/cli/src/main.rs:247][E: codex-rs/cli/src/main.rs:250][E: codex-rs/cli/src/main.rs:253][E: codex-rs/cli/src/main.rs:1670] | `codex-rs/cli/src/main.rs:181` |
| `execpolicy` | `Execpolicy(ExecpolicyCommand)` | hidden;拒绝 root remote | Hidden execpolicy tooling；当前 nested command 是 `check`。[E: codex-rs/cli/src/main.rs:184][E: codex-rs/cli/src/main.rs:478][E: codex-rs/cli/src/main.rs:1718][E: codex-rs/cli/src/main.rs:1719] | `codex-rs/cli/src/main.rs:185` |
| `apply` | `Apply(ApplyCommand)` | alias `a`;拒绝 root remote | 将 Codex agent 产生的 latest diff 作为 `git apply` 应用到工作树。[E: codex-rs/cli/src/main.rs:188][E: codex-rs/cli/src/main.rs:189][E: codex-rs/cli/src/main.rs:1728][E: codex-rs/cli/src/main.rs:1729] | `codex-rs/cli/src/main.rs:189` |
| `resume` | `Resume(ResumeCommand)` | session wrapper;可带 subcommand-local remote options | 恢复 interactive session；`session_id/--last/--all/--include-non-interactive` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:192][E: codex-rs/cli/src/main.rs:343][E: codex-rs/cli/src/main.rs:1399][E: codex-rs/cli/src/main.rs:1417] | `codex-rs/cli/src/main.rs:192` |
| `queue` | `Queue(QueueCommand)` | session wrapper;可带 remote options | 向已有 session 排队一条文本消息。要求 `--thread` 与非空 `--message`；不支持 image attachments；合并 root/subcommand remote 后调用 `queue_cmd::run_queue_command()`。[E: codex-rs/cli/src/main.rs:195][E: codex-rs/cli/src/queue_cmd.rs:13][E: codex-rs/cli/src/queue_cmd.rs:16][E: codex-rs/cli/src/queue_cmd.rs:20][E: codex-rs/cli/src/main.rs:1441][E: codex-rs/cli/src/queue_cmd.rs:29] | `codex-rs/cli/src/main.rs:195` |
| `archive` | `Archive(SessionArchiveCommand)` | session wrapper;可带 remote options | 归档 saved session；共用 `run_session_archive_cli_command()`，输出 command result。[E: codex-rs/cli/src/main.rs:198][E: codex-rs/cli/src/main.rs:369][E: codex-rs/cli/src/main.rs:1428] | `codex-rs/cli/src/main.rs:198` |
| `delete` | `Delete(DeleteCommand)` | session wrapper;`--force` 要求 UUID | 删除 saved session；先把 `--force` 映射成 delete confirmation policy，再走 session archive command path。[E: codex-rs/cli/src/main.rs:201][E: codex-rs/cli/src/main.rs:395][E: codex-rs/cli/src/main.rs:1453] | `codex-rs/cli/src/main.rs:201` |
| `migrate-rollouts` | `MigrateRollouts(MigrateRolloutsCommand)` | 拒绝 root remote | 检查或迁移 legacy local sessions 到 paginated thread history。默认 dry-run；`--apply` 才写入。[E: codex-rs/cli/src/main.rs:204][E: codex-rs/cli/src/main.rs:1467][E: codex-rs/cli/src/main.rs:1468] | `codex-rs/cli/src/main.rs:204` |
| `unarchive` | `Unarchive(SessionArchiveCommand)` | session wrapper;可带 remote options | 取消归档 saved session；共用 session archive command path。[E: codex-rs/cli/src/main.rs:207][E: codex-rs/cli/src/main.rs:1475] | `codex-rs/cli/src/main.rs:207` |
| `fork` | `Fork(ForkCommand)` | session wrapper;可带 subcommand-local remote options | fork previous interactive session；`session_id/--last/--all` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:210][E: codex-rs/cli/src/main.rs:405][E: codex-rs/cli/src/main.rs:1488][E: codex-rs/cli/src/main.rs:1504] | `codex-rs/cli/src/main.rs:210` |
| `cloud` / `cloud-tasks` | `Cloud(CloudTasksCli)` | alias `cloud-tasks`;拒绝 root remote | 浏览 Codex Cloud tasks 并本地 apply changes。[E: codex-rs/cli/src/main.rs:213][E: codex-rs/cli/src/main.rs:1601][E: codex-rs/cli/src/main.rs:1602] | `codex-rs/cli/src/main.rs:213` |
| `responses-api-proxy` | `ResponsesApiProxy(ResponsesApiProxyArgs)` | hidden internal;拒绝 root remote | 运行 internal responses API proxy；dispatch 通过 `spawn_blocking` 调用 proxy main。[E: codex-rs/cli/src/main.rs:217][E: codex-rs/cli/src/main.rs:218][E: codex-rs/cli/src/main.rs:1740][E: codex-rs/cli/src/main.rs:1741] | `codex-rs/cli/src/main.rs:218` |
| `stdio-to-uds` | `StdioToUds(StdioToUdsCommand)` | hidden internal;拒绝 root remote | 将 stdio relay 到 Unix domain socket。[E: codex-rs/cli/src/main.rs:221][E: codex-rs/cli/src/main.rs:222][E: codex-rs/cli/src/main.rs:1749][E: codex-rs/cli/src/main.rs:1750] | `codex-rs/cli/src/main.rs:222` |
| `exec-server` | `ExecServer(ExecServerCommand)` | experimental;拒绝 root remote | 运行 standalone exec-server service；支持 listen 或 remote registration 参数。[E: codex-rs/cli/src/main.rs:225][E: codex-rs/cli/src/main.rs:598][E: codex-rs/cli/src/main.rs:1758][E: codex-rs/cli/src/main.rs:1759] | `codex-rs/cli/src/main.rs:225` |
| `features` | `Features(FeaturesCli)` | 拒绝 root remote | feature flags inspection/editing；nested subcommands 是 `list`、`enable <feature>`、`disable <feature>`。[E: codex-rs/cli/src/main.rs:228][E: codex-rs/cli/src/main.rs:1007][E: codex-rs/cli/src/main.rs:1013][E: codex-rs/cli/src/main.rs:1768] | `codex-rs/cli/src/main.rs:228` |

## 共性规则

`--enable`/`--disable` 在 dispatch 前被转换成 `features.<name>=true/false` 并追加到 root config overrides，因此会随 root overrides 继续流入消费 config 的 subcommand。[E: codex-rs/cli/src/main.rs:959][E: codex-rs/cli/src/main.rs:984][E: codex-rs/cli/src/main.rs:988][E: codex-rs/cli/src/main.rs:992][E: codex-rs/cli/src/main.rs:1058][E: codex-rs/cli/src/main.rs:1059]

多数非交互命令在 dispatch 开头调用 `reject_remote_mode_for_subcommand()`；该函数明确拒绝 root `--remote` 与 `--remote-auth-token-env`，错误文案说这些只支持 interactive TUI commands。[E: codex-rs/cli/src/main.rs:2363][E: codex-rs/cli/src/main.rs:2368][E: codex-rs/cli/src/main.rs:2370][E: codex-rs/cli/src/main.rs:2373][E: codex-rs/cli/src/main.rs:2375] `agents`、`resume`、`queue`、`fork` 和 session archive/delete/unarchive wrappers 不走这个拒绝函数，而是把 root/subcommand remote options 合并后进入 TUI/session command path。[E: codex-rs/cli/src/main.rs:1092][E: codex-rs/cli/src/main.rs:1399][E: codex-rs/cli/src/main.rs:1441][E: codex-rs/cli/src/main.rs:1428][E: codex-rs/cli/src/main.rs:1488]

root `--strict-config` 只有部分 subcommand 可继承；源码 allow-list 包含 interactive、`agents`、exec、review、mcp-server、exec-server、resume/`queue`/archive/delete/unarchive/fork、doctor 和 root app-server，其他命令会走 post-parse reject。`migrate-rollouts` 不在该 allow-list。[E: codex-rs/cli/src/main.rs:2381][E: codex-rs/cli/src/main.rs:2414][E: codex-rs/cli/src/main.rs:2420][E: codex-rs/cli/src/main.rs:2433]

root `--profile` 在有 subcommand 时走 `profile_v2_for_subcommand()` allow-list：`agents`、exec、review、resume/`queue`/archive/delete/unarchive/fork、mcp、sandbox 和 `debug prompt-input`。[E: codex-rs/cli/src/main.rs:1824][E: codex-rs/cli/src/main.rs:1833][E: codex-rs/cli/src/main.rs:1837][E: codex-rs/cli/src/main.rs:1847]

## doctor 检查面

`codex doctor` 是 read-mostly：它不修复状态，只生成 redacted human/JSON 报告；overall Fail 以 exit 1 结束。[E: codex-rs/cli/src/doctor.rs:328][E: codex-rs/cli/src/doctor.rs:348] 当前固定检查包括：

- **disk**：`disk` 比较 `CODEX_HOME` 与 worktree 可用空间；低于 1 GiB Fail，低于 5 GiB Warning。[E: codex-rs/cli/src/doctor.rs:383][E: codex-rs/cli/src/doctor/disk.rs:12][E: codex-rs/cli/src/doctor/disk.rs:13][E: codex-rs/cli/src/doctor/disk.rs:15]
- **security / endpoint**：`endpoint protection` 探测 macOS/Windows endpoint protection 产品。[E: codex-rs/cli/src/doctor.rs:364]
- **storage**：`state.paths` 检查 CODEX_HOME、log/sqlite 路径、runtime DB integrity 和 rollout file stats。[E: codex-rs/cli/src/doctor.rs:2217]

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
