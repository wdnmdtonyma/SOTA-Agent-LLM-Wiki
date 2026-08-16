---
id: cli.subcommands
title: CLI 子命令 catalog
kind: cli
tier: T1
source: [codex-rs/cli/src/main.rs, codex-rs/cli/src/remote_control_cmd.rs, codex-rs/cli/src/doctor.rs, codex-rs/cli/src/doctor/disk.rs, codex-rs/cli/src/doctor/security.rs, codex-rs/cli/src/doctor/output.rs, codex-rs/cli/src/migrate_rollouts.rs, codex-rs/app-server-protocol/src/precomputed_exports.rs]
symbols: [MultitoolCli, Subcommand, cli_main, AppServerCommand, AppServerSubcommand, DebugCommand, ExecServerCommand, RemoteControlCommand, FeatureToggles, FeaturesCli, DoctorCommand, MigrateRolloutsCommand]
related: [spine.process-lifecycle, cli.global-flags, cli.exec-mode, surface.cli.external-agent-import, command.session-thread, config.skills-plugins-features, subsys.core.rollout-migration, subsys.platform.diagnostics]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> CLI 子命令 catalog 覆盖当前 `codex` 根命令的 `Subcommand` enum:没有 subcommand 时进入 interactive TUI，有 subcommand 时由 `cli_main()` 分派到 exec、auth、MCP、plugin、app-server、session 管理、sandbox、debug、cloud、features、doctor、migrate-rollouts 等入口。[E: codex-rs/cli/src/main.rs:127][E: codex-rs/cli/src/main.rs:131][E: codex-rs/cli/src/main.rs:1024]

## 能回答的问题

- 当前 `codex` 根命令有哪些 top-level subcommand?
- 哪些 subcommand 有 alias、hidden 或平台条件编译?
- 根 `codex review` 与 `codex exec review` 的关系是什么?
- `--remote`、`--remote-auth-token-env` 和 root `--strict-config` 在哪些 subcommand 上被拒绝?

## Catalog

`MultitoolCli` 把 config overrides、feature toggles、remote options、interactive TUI args 和 optional `Subcommand` 依次 flatten/挂载；root usage 仍是 `codex [OPTIONS] [PROMPT]` 或 `codex [OPTIONS] <COMMAND> [ARGS]`。[E: codex-rs/cli/src/main.rs:113][E: codex-rs/cli/src/main.rs:115][E: codex-rs/cli/src/main.rs:118][E: codex-rs/cli/src/main.rs:121][E: codex-rs/cli/src/main.rs:124][E: codex-rs/cli/src/main.rs:127] 当前 `Subcommand` enum 有 28 个 top-level variant（含平台条件 `app`）；`app` 仅在 macOS/Windows 编译，`execpolicy`、`responses-api-proxy`、`stdio-to-uds` 是 hidden/internal 入口。本轮新增 `migrate-rollouts`。[E: codex-rs/cli/src/main.rs:131][E: codex-rs/cli/src/main.rs:161][E: codex-rs/cli/src/main.rs:180][E: codex-rs/cli/src/main.rs:197][E: codex-rs/cli/src/main.rs:211][E: codex-rs/cli/src/main.rs:215][E: codex-rs/cli/src/main.rs:221]

| 命令 | enum variant | 门控 / alias | 分派语义 | 源 |
|---|---|---|---|---|
| 无 subcommand | `None` | 默认 interactive | `cli_main()` prepend root config flags 后调用 `run_interactive_tui()`，并传入 root remote options。[E: codex-rs/cli/src/main.rs:1020][E: codex-rs/cli/src/main.rs:1024] | `codex-rs/cli/src/main.rs:1024` |
| `exec` | `Exec(ExecCli)` | alias `e`;拒绝 root remote | 非交互执行；继承 interactive shared options、合并 root config overrides，然后调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:133][E: codex-rs/cli/src/main.rs:1033][E: codex-rs/cli/src/main.rs:1040][E: codex-rs/cli/src/main.rs:1047] | `codex-rs/cli/src/main.rs:134` |
| `review` | `Review(ReviewCommand)` | 拒绝 root remote | 根 review 是 exec review wrapper；它构造 `ExecCli`，把 command 设为 `ExecCommand::Review(review_args)`，再调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:130][E: codex-rs/cli/src/main.rs:1031][E: codex-rs/cli/src/main.rs:1036][E: codex-rs/cli/src/main.rs:1041][E: codex-rs/cli/src/main.rs:1045][E: codex-rs/cli/src/main.rs:1051] | `codex-rs/cli/src/main.rs:130` |
| `login` | `Login(LoginCommand)` | 拒绝 root remote | 支持 `status`、device auth、stdin API key、stdin access token 和 ChatGPT login；hidden `--api-key` 现在只打印迁移提示后退出。[E: codex-rs/cli/src/main.rs:133][E: codex-rs/cli/src/main.rs:484][E: codex-rs/cli/src/main.rs:487][E: codex-rs/cli/src/main.rs:501][E: codex-rs/cli/src/main.rs:502][E: codex-rs/cli/src/main.rs:1375][E: codex-rs/cli/src/main.rs:1384][E: codex-rs/cli/src/main.rs:1391][E: codex-rs/cli/src/main.rs:1397][E: codex-rs/cli/src/main.rs:1400][E: codex-rs/cli/src/main.rs:1403] | `codex-rs/cli/src/main.rs:133` |
| `logout` | `Logout(LogoutCommand)` | 拒绝 root remote | 合并 root config overrides 后调用 `run_logout()`。[E: codex-rs/cli/src/main.rs:137][E: codex-rs/cli/src/main.rs:508][E: codex-rs/cli/src/main.rs:1408][E: codex-rs/cli/src/main.rs:1413][E: codex-rs/cli/src/main.rs:1418] | `codex-rs/cli/src/main.rs:136` |
| `mcp` | `Mcp(McpCli)` | 拒绝 root remote | 管理 external MCP servers；root config overrides prepend 后传入 `mcp_cli.run()`。[E: codex-rs/cli/src/main.rs:140][E: codex-rs/cli/src/main.rs:1066][E: codex-rs/cli/src/main.rs:1066][E: codex-rs/cli/src/main.rs:1073][E: codex-rs/cli/src/main.rs:1076] | `codex-rs/cli/src/main.rs:139` |
| `plugin` | `Plugin(PluginCli)` | 拒绝 root remote | 管理 Codex plugins；dispatch 覆盖 add/list/marketplace/remove 四类 plugin subcommand。[E: codex-rs/cli/src/main.rs:143][E: codex-rs/cli/src/main.rs:1078][E: codex-rs/cli/src/main.rs:1090][E: codex-rs/cli/src/main.rs:1093][E: codex-rs/cli/src/main.rs:1100][E: codex-rs/cli/src/main.rs:1104][E: codex-rs/cli/src/main.rs:1110] | `codex-rs/cli/src/main.rs:142` |
| `mcp-server` | `McpServer(McpServerCommand)` | 拒绝 root remote | 以 stdio MCP server 方式启动 Codex，支持 subcommand-local `--strict-config`。[E: codex-rs/cli/src/main.rs:146][E: codex-rs/cli/src/main.rs:293][E: codex-rs/cli/src/main.rs:297][E: codex-rs/cli/src/main.rs:1053][E: codex-rs/cli/src/main.rs:1059] | `codex-rs/cli/src/main.rs:145` |
| `app-server` | `AppServer(AppServerCommand)` | experimental;root server 可用 `--strict-config`，tooling 子命令另行检查 | 不带 nested subcommand 时运行 app-server transport；`--code-mode-host WS_URL` 令该进程连接共享的远端 Code Mode host；nested subcommands 覆盖 daemon/proxy/generate-ts/generate-json-schema/internal-json-schema。三个 generator 现在消费 protocol crate 内嵌的预计算 stable/experimental exports，而不是在普通构建中反射 derive metadata。[E: codex-rs/cli/src/main.rs:149][E: codex-rs/cli/src/main.rs:603][E: codex-rs/cli/src/main.rs:611][E: codex-rs/cli/src/main.rs:614][E: codex-rs/cli/src/main.rs:616][E: codex-rs/cli/src/main.rs:1223][E: codex-rs/cli/src/main.rs:1234][E: codex-rs/cli/src/main.rs:1240][E: codex-rs/app-server-protocol/src/precomputed_exports.rs:14][E: codex-rs/app-server-protocol/src/precomputed_exports.rs:62] | `codex-rs/cli/src/main.rs:148` |
| `remote-control` | `RemoteControl(RemoteControlCommand)` | experimental;拒绝 root remote | 不带 nested subcommand 时启动 foreground app-server 并临时启用 remote control；nested `start`/`stop` 管理 app-server daemon 的 remote-control 状态，`pair` 创建并打印短期 pairing code。dispatch 用 subcommand 自报名称做 remote-mode 拒绝，然后调用 `remote_control_cmd::run()`。[E: codex-rs/cli/src/main.rs:152][E: codex-rs/cli/src/main.rs:1245][E: codex-rs/cli/src/main.rs:1246][E: codex-rs/cli/src/main.rs:1252][E: codex-rs/cli/src/remote_control_cmd.rs:42][E: codex-rs/cli/src/remote_control_cmd.rs:47][E: codex-rs/cli/src/remote_control_cmd.rs:64][E: codex-rs/cli/src/remote_control_cmd.rs:75][E: codex-rs/cli/src/remote_control_cmd.rs:82][E: codex-rs/cli/src/remote_control_cmd.rs:87][E: codex-rs/cli/src/remote_control_cmd.rs:91] | `codex-rs/cli/src/main.rs:151` |
| `app` | `App(app_cmd::AppCommand)` | macOS/Windows only;拒绝 root remote | 启动 Codex desktop app 或 installer path。[E: codex-rs/cli/src/main.rs:155][E: codex-rs/cli/src/main.rs:155][E: codex-rs/cli/src/main.rs:1258][E: codex-rs/cli/src/main.rs:1266] | `codex-rs/cli/src/main.rs:155` |
| `completion` | `Completion(CompletionCommand)` | 拒绝 root remote | 生成 shell completions；shell 参数默认 bash。[E: codex-rs/cli/src/main.rs:158][E: codex-rs/cli/src/main.rs:218][E: codex-rs/cli/src/main.rs:218][E: codex-rs/cli/src/main.rs:1420][E: codex-rs/cli/src/main.rs:1426] | `codex-rs/cli/src/main.rs:158` |
| `update` | `Update` | 拒绝 root remote | 检查安装方式并运行 update action；debug builds 会拒绝。[E: codex-rs/cli/src/main.rs:161][E: codex-rs/cli/src/main.rs:810][E: codex-rs/cli/src/main.rs:813][E: codex-rs/cli/src/main.rs:818][E: codex-rs/cli/src/main.rs:825][E: codex-rs/cli/src/main.rs:1428][E: codex-rs/cli/src/main.rs:1434] | `codex-rs/cli/src/main.rs:161` |
| `doctor` | `Doctor(DoctorCommand)` | 拒绝 root remote | 诊断本地安装、配置、认证和 runtime health。报告按 Environment/Configuration/Updates/Connectivity/Background Server 分组；Environment 至少包含 disk、security/endpoint protection、state storage 与 provider HTTP reachability。[E: codex-rs/cli/src/main.rs:171][E: codex-rs/cli/src/main.rs:1461][E: codex-rs/cli/src/doctor.rs:311][E: codex-rs/cli/src/doctor.rs:347][E: codex-rs/cli/src/doctor.rs:366][E: codex-rs/cli/src/doctor.rs:435][E: codex-rs/cli/src/doctor/output.rs:28] | `codex-rs/cli/src/main.rs:171` |
| `sandbox` | `Sandbox(HostSandboxArgs)` | OS-specific host sandbox;拒绝 root remote | `HostSandboxArgs` 在 macOS/Linux/Windows 分别映射到 Seatbelt/Landlock/Windows sandbox command；dispatch 按平台调用对应 runner。[E: codex-rs/cli/src/main.rs:168][E: codex-rs/cli/src/main.rs:421][E: codex-rs/cli/src/main.rs:423][E: codex-rs/cli/src/main.rs:423][E: codex-rs/cli/src/main.rs:1463][E: codex-rs/cli/src/main.rs:1493][E: codex-rs/cli/src/main.rs:1500][E: codex-rs/cli/src/main.rs:1507] | `codex-rs/cli/src/main.rs:167` |
| `debug` | `Debug(DebugCommand)` | 拒绝 root remote | Debug tooling 包含 `models`、`app-server`、`prompt-input` 和 hidden `trace-reduce`/`clear-memories`。[E: codex-rs/cli/src/main.rs:171][E: codex-rs/cli/src/main.rs:228][E: codex-rs/cli/src/main.rs:233][E: codex-rs/cli/src/main.rs:234][E: codex-rs/cli/src/main.rs:240][E: codex-rs/cli/src/main.rs:243][E: codex-rs/cli/src/main.rs:243][E: codex-rs/cli/src/main.rs:1519] | `codex-rs/cli/src/main.rs:170` |
| `execpolicy` | `Execpolicy(ExecpolicyCommand)` | hidden;拒绝 root remote | Hidden execpolicy tooling；当前 nested command 是 `check`。[E: codex-rs/cli/src/main.rs:174][E: codex-rs/cli/src/main.rs:174][E: codex-rs/cli/src/main.rs:452][E: codex-rs/cli/src/main.rs:456][E: codex-rs/cli/src/main.rs:1567] | `codex-rs/cli/src/main.rs:174` |
| `apply` | `Apply(ApplyCommand)` | alias `a`;拒绝 root remote | 将 Codex agent 产生的 latest diff 作为 `git apply` 应用到工作树。[E: codex-rs/cli/src/main.rs:177][E: codex-rs/cli/src/main.rs:177][E: codex-rs/cli/src/main.rs:1577][E: codex-rs/cli/src/main.rs:1587] | `codex-rs/cli/src/main.rs:178` |
| `resume` | `Resume(ResumeCommand)` | session wrapper;可带 subcommand-local remote options | 恢复 interactive session；`session_id/--last/--all/--include-non-interactive` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:181][E: codex-rs/cli/src/main.rs:317][E: codex-rs/cli/src/main.rs:318][E: codex-rs/cli/src/main.rs:325][E: codex-rs/cli/src/main.rs:329][E: codex-rs/cli/src/main.rs:1268][E: codex-rs/cli/src/main.rs:1277][E: codex-rs/cli/src/main.rs:1288] | `codex-rs/cli/src/main.rs:181` |
| `archive` | `Archive(SessionArchiveCommand)` | session wrapper;可带 remote options | 归档 saved session；共用 `run_session_archive_cli_command()`，输出 command result。[E: codex-rs/cli/src/main.rs:184][E: codex-rs/cli/src/main.rs:337][E: codex-rs/cli/src/main.rs:1297][E: codex-rs/cli/src/main.rs:1298] | `codex-rs/cli/src/main.rs:184` |
| `delete` | `Delete(DeleteCommand)` | session wrapper;`--force` 要求 UUID | 删除 saved session；先把 `--force` 映射成 delete confirmation policy，再走 session archive command path。[E: codex-rs/cli/src/main.rs:194][E: codex-rs/cli/src/main.rs:1325] | `codex-rs/cli/src/main.rs:194` |
| `migrate-rollouts` | `MigrateRollouts(MigrateRolloutsCommand)` | 拒绝 root remote | 检查或迁移 legacy local sessions 到 paginated thread history。默认 dry-run；`--apply` 才写入，`--thread` 限制 thread id，`--max-mib-per-second` 限速，`--json`/`--verbose` 控制输出。[E: codex-rs/cli/src/main.rs:197][E: codex-rs/cli/src/main.rs:1341][E: codex-rs/cli/src/migrate_rollouts.rs:22][E: codex-rs/cli/src/migrate_rollouts.rs:25][E: codex-rs/cli/src/migrate_rollouts.rs:70][E: codex-rs/cli/src/migrate_rollouts.rs:101] | `codex-rs/cli/src/main.rs:197` |
| `unarchive` | `Unarchive(SessionArchiveCommand)` | session wrapper;可带 remote options | 取消归档 saved session；共用 session archive command path。[E: codex-rs/cli/src/main.rs:200][E: codex-rs/cli/src/main.rs:1349] | `codex-rs/cli/src/main.rs:200` |
| `fork` | `Fork(ForkCommand)` | session wrapper;可带 subcommand-local remote options | fork previous interactive session；`session_id/--last/--all` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:194][E: codex-rs/cli/src/main.rs:379][E: codex-rs/cli/src/main.rs:380][E: codex-rs/cli/src/main.rs:387][E: codex-rs/cli/src/main.rs:1336][E: codex-rs/cli/src/main.rs:1345][E: codex-rs/cli/src/main.rs:1355] | `codex-rs/cli/src/main.rs:193` |
| `cloud` / `cloud-tasks` | `Cloud(CloudTasksCli)` | alias `cloud-tasks`;拒绝 root remote | 浏览 Codex Cloud tasks 并本地 apply changes。[E: codex-rs/cli/src/main.rs:197][E: codex-rs/cli/src/main.rs:197][E: codex-rs/cli/src/main.rs:1450][E: codex-rs/cli/src/main.rs:1459] | `codex-rs/cli/src/main.rs:197` |
| `responses-api-proxy` | `ResponsesApiProxy(ResponsesApiProxyArgs)` | hidden internal;拒绝 root remote | 运行 internal responses API proxy；dispatch 通过 `spawn_blocking` 调用 proxy main。[E: codex-rs/cli/src/main.rs:200][E: codex-rs/cli/src/main.rs:200][E: codex-rs/cli/src/main.rs:1589][E: codex-rs/cli/src/main.rs:1595] | `codex-rs/cli/src/main.rs:201` |
| `stdio-to-uds` | `StdioToUds(StdioToUdsCommand)` | hidden internal;拒绝 root remote | 将 stdio relay 到 Unix domain socket。[E: codex-rs/cli/src/main.rs:203][E: codex-rs/cli/src/main.rs:206][E: codex-rs/cli/src/main.rs:1598][E: codex-rs/cli/src/main.rs:1605] | `codex-rs/cli/src/main.rs:205` |
| `exec-server` | `ExecServer(ExecServerCommand)` | experimental;拒绝 root remote | 运行 standalone exec-server service；支持 listen 或 remote registration 参数。[E: codex-rs/cli/src/main.rs:207][E: codex-rs/cli/src/main.rs:569][E: codex-rs/cli/src/main.rs:573][E: codex-rs/cli/src/main.rs:579][E: codex-rs/cli/src/main.rs:591][E: codex-rs/cli/src/main.rs:1607][E: codex-rs/cli/src/main.rs:1614] | `codex-rs/cli/src/main.rs:208` |
| `features` | `Features(FeaturesCli)` | 拒绝 root remote | feature flags inspection/editing；nested subcommands 是 `list`、`enable <feature>`、`disable <feature>`。[E: codex-rs/cli/src/main.rs:211][E: codex-rs/cli/src/main.rs:935][E: codex-rs/cli/src/main.rs:941][E: codex-rs/cli/src/main.rs:944][E: codex-rs/cli/src/main.rs:946][E: codex-rs/cli/src/main.rs:948][E: codex-rs/cli/src/main.rs:1617][E: codex-rs/cli/src/main.rs:1657][E: codex-rs/cli/src/main.rs:1665] | `codex-rs/cli/src/main.rs:211` |

## 共性规则

`--enable`/`--disable` 在 dispatch 前被转换成 `features.<name>=true/false` 并追加到 root config overrides，因此会随 root overrides 继续流入消费 config 的 subcommand。[E: codex-rs/cli/src/main.rs:890][E: codex-rs/cli/src/main.rs:892][E: codex-rs/cli/src/main.rs:917][E: codex-rs/cli/src/main.rs:921][E: codex-rs/cli/src/main.rs:988][E: codex-rs/cli/src/main.rs:989]

多数非交互命令在 dispatch 开头调用 `reject_remote_mode_for_subcommand()`；该函数明确拒绝 root `--remote` 与 `--remote-auth-token-env`，错误文案说这些只支持 interactive TUI commands。[E: codex-rs/cli/src/main.rs:2157][E: codex-rs/cli/src/main.rs:2162][E: codex-rs/cli/src/main.rs:2164][E: codex-rs/cli/src/main.rs:2167][E: codex-rs/cli/src/main.rs:2169] `resume`、`fork` 和 session archive/delete/unarchive wrappers 不走这个拒绝函数，而是把 root/subcommand remote options 合并后进入 TUI/session command path。[E: codex-rs/cli/src/main.rs:1268][E: codex-rs/cli/src/main.rs:1288][E: codex-rs/cli/src/main.rs:1290][E: codex-rs/cli/src/main.rs:1297][E: codex-rs/cli/src/main.rs:1336][E: codex-rs/cli/src/main.rs:1355]

root `--strict-config` 只有部分 subcommand 可继承；源码 allow-list 包含 interactive、exec、review、mcp-server、exec-server、resume/archive/delete/unarchive/fork、doctor 和 root app-server，其他命令会走 post-parse reject。`migrate-rollouts` 不在该 allow-list，属于 rejected remote-mode subcommand。[E: codex-rs/cli/src/main.rs:2281][E: codex-rs/cli/src/main.rs:2289]

## doctor 检查面

`codex doctor` 是 read-mostly：它不修复状态，只生成 redacted human/JSON 报告；overall Fail 以 exit 1 结束。[E: codex-rs/cli/src/doctor.rs:311][E: codex-rs/cli/src/doctor.rs:331] 当前固定检查包括：

- **disk**：`system.disk` 比较 `CODEX_HOME` 与 worktree 可用空间；低于 1 GiB Fail，低于 5 GiB Warning。[E: codex-rs/cli/src/doctor.rs:366][E: codex-rs/cli/src/doctor/disk.rs:12][E: codex-rs/cli/src/doctor/disk.rs:31]
- **security / endpoint**：`security.endpoint` 探测 macOS/Windows endpoint protection 产品；检测到产品时 Warning，并提示管理员核对 Codex exclusions。[E: codex-rs/cli/src/doctor.rs:347][E: codex-rs/cli/src/doctor/security.rs:34][E: codex-rs/cli/src/doctor/security.rs:75]
- **storage**：`state.paths` 检查 CODEX_HOME、log/sqlite 路径、runtime DB integrity 和 rollout file stats。[E: codex-rs/cli/src/doctor.rs:2198][E: codex-rs/cli/src/doctor.rs:2223][E: codex-rs/cli/src/doctor.rs:2266]
- **endpoint reachability**：Connectivity 组里的 provider HTTP probe，以及 Responses WebSocket endpoint 检查；不是 `security.endpoint` 的别名。[E: codex-rs/cli/src/doctor.rs:2397][E: codex-rs/cli/src/doctor.rs:2757][E: codex-rs/cli/src/doctor/output.rs:42]

## Sources

- `codex-rs/cli/src/main.rs`
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
