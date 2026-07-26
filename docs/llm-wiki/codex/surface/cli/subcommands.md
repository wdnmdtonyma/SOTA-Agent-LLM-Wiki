---
id: cli.subcommands
title: CLI 子命令 catalog
kind: cli
tier: T1
source: [codex-rs/cli/src/main.rs, codex-rs/cli/src/remote_control_cmd.rs]
symbols: [MultitoolCli, Subcommand, cli_main, AppServerCommand, DebugCommand, ExecServerCommand, RemoteControlCommand, FeatureToggles, FeaturesCli]
related: [spine.process-lifecycle, cli.global-flags, cli.exec-mode, surface.cli.external-agent-import, command.session-thread, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 61a44880a8
---

> CLI 子命令 catalog 覆盖当前 `codex` 根命令的 `Subcommand` enum:没有 subcommand 时进入 interactive TUI，有 subcommand 时由 `cli_main()` 分派到 exec、auth、MCP、plugin、app-server、session 管理、sandbox、debug、cloud、features 等入口。[E: codex-rs/cli/src/main.rs:119][E: codex-rs/cli/src/main.rs:123][E: codex-rs/cli/src/main.rs:989]

## 能回答的问题

- 当前 `codex` 根命令有哪些 top-level subcommand?
- 哪些 subcommand 有 alias、hidden 或平台条件编译?
- 根 `codex review` 与 `codex exec review` 的关系是什么?
- `--remote`、`--remote-auth-token-env` 和 root `--strict-config` 在哪些 subcommand 上被拒绝?

## Catalog

`MultitoolCli` 把 config overrides、feature toggles、remote options、interactive TUI args 和 optional `Subcommand` 依次 flatten/挂载；root usage 仍是 `codex [OPTIONS] [PROMPT]` 或 `codex [OPTIONS] <COMMAND> [ARGS]`。[E: codex-rs/cli/src/main.rs:103][E: codex-rs/cli/src/main.rs:107][E: codex-rs/cli/src/main.rs:110][E: codex-rs/cli/src/main.rs:113][E: codex-rs/cli/src/main.rs:116][E: codex-rs/cli/src/main.rs:119] 当前 `Subcommand` enum 有 27 个 top-level variant；`app` 仅在 macOS/Windows 编译，`execpolicy`、`responses-api-proxy`、`stdio-to-uds` 是 hidden/internal 入口。[E: codex-rs/cli/src/main.rs:123][E: codex-rs/cli/src/main.rs:153][E: codex-rs/cli/src/main.rs:172][E: codex-rs/cli/src/main.rs:199][E: codex-rs/cli/src/main.rs:203][E: codex-rs/cli/src/main.rs:210]

| 命令 | enum variant | 门控 / alias | 分派语义 | 源 |
|---|---|---|---|---|
| 无 subcommand | `None` | 默认 interactive | `cli_main()` prepend root config flags 后调用 `run_interactive_tui()`，并传入 root remote options。[E: codex-rs/cli/src/main.rs:989][E: codex-rs/cli/src/main.rs:991][E: codex-rs/cli/src/main.rs:995][E: codex-rs/cli/src/main.rs:997][E: codex-rs/cli/src/main.rs:998] | `codex-rs/cli/src/main.rs:987` |
| `exec` | `Exec(ExecCli)` | alias `e`;拒绝 root remote | 非交互执行；继承 interactive shared options、合并 root config overrides，然后调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:125][E: codex-rs/cli/src/main.rs:126][E: codex-rs/cli/src/main.rs:1004][E: codex-rs/cli/src/main.rs:1005][E: codex-rs/cli/src/main.rs:1012][E: codex-rs/cli/src/main.rs:1018] | `codex-rs/cli/src/main.rs:127` |
| `review` | `Review(ReviewCommand)` | 拒绝 root remote | 根 review 是 exec review wrapper；它构造 `ExecCli`，把 command 设为 `ExecCommand::Review(review_args)`，再调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:129][E: codex-rs/cli/src/main.rs:1020][E: codex-rs/cli/src/main.rs:1024][E: codex-rs/cli/src/main.rs:1029][E: codex-rs/cli/src/main.rs:1033][E: codex-rs/cli/src/main.rs:1039] | `codex-rs/cli/src/main.rs:130` |
| `login` | `Login(LoginCommand)` | 拒绝 root remote | 支持 `status`、device auth、stdin API key、stdin access token 和 ChatGPT login；hidden `--api-key` 现在只打印迁移提示后退出。[E: codex-rs/cli/src/main.rs:132][E: codex-rs/cli/src/main.rs:483][E: codex-rs/cli/src/main.rs:486][E: codex-rs/cli/src/main.rs:498][E: codex-rs/cli/src/main.rs:502][E: codex-rs/cli/src/main.rs:1363][E: codex-rs/cli/src/main.rs:1373][E: codex-rs/cli/src/main.rs:1379][E: codex-rs/cli/src/main.rs:1385][E: codex-rs/cli/src/main.rs:1388][E: codex-rs/cli/src/main.rs:1391] | `codex-rs/cli/src/main.rs:133` |
| `logout` | `Logout(LogoutCommand)` | 拒绝 root remote | 合并 root config overrides 后调用 `run_logout()`。[E: codex-rs/cli/src/main.rs:135][E: codex-rs/cli/src/main.rs:507][E: codex-rs/cli/src/main.rs:1396][E: codex-rs/cli/src/main.rs:1402][E: codex-rs/cli/src/main.rs:1406] | `codex-rs/cli/src/main.rs:136` |
| `mcp` | `Mcp(McpCli)` | 拒绝 root remote | 管理 external MCP servers；root config overrides prepend 后传入 `mcp_cli.run()`。[E: codex-rs/cli/src/main.rs:138][E: codex-rs/cli/src/main.rs:1054][E: codex-rs/cli/src/main.rs:1055][E: codex-rs/cli/src/main.rs:1061][E: codex-rs/cli/src/main.rs:1064] | `codex-rs/cli/src/main.rs:139` |
| `plugin` | `Plugin(PluginCli)` | 拒绝 root remote | 管理 Codex plugins；dispatch 覆盖 add/list/marketplace/remove 四类 plugin subcommand。[E: codex-rs/cli/src/main.rs:141][E: codex-rs/cli/src/main.rs:1066][E: codex-rs/cli/src/main.rs:1077][E: codex-rs/cli/src/main.rs:1082][E: codex-rs/cli/src/main.rs:1088][E: codex-rs/cli/src/main.rs:1092][E: codex-rs/cli/src/main.rs:1098] | `codex-rs/cli/src/main.rs:142` |
| `mcp-server` | `McpServer(McpServerCommand)` | 拒绝 root remote | 以 stdio MCP server 方式启动 Codex，支持 subcommand-local `--strict-config`。[E: codex-rs/cli/src/main.rs:144][E: codex-rs/cli/src/main.rs:292][E: codex-rs/cli/src/main.rs:296][E: codex-rs/cli/src/main.rs:1041][E: codex-rs/cli/src/main.rs:1047] | `codex-rs/cli/src/main.rs:145` |
| `app-server` | `AppServer(AppServerCommand)` | experimental;root server 可用 `--strict-config`，tooling 子命令另行检查 | 不带 nested subcommand 时运行 app-server transport；`--code-mode-host WS_URL` 令该进程连接共享的远端 Code Mode host；nested subcommands 覆盖 daemon/proxy/generate-ts/generate-json-schema/internal-json-schema。[E: codex-rs/cli/src/main.rs:147][E: codex-rs/cli/src/main.rs:514][E: codex-rs/cli/src/main.rs:517][E: codex-rs/cli/src/main.rs:519][E: codex-rs/cli/src/main.rs:520][E: codex-rs/cli/src/main.rs:594][E: codex-rs/cli/src/main.rs:596][E: codex-rs/cli/src/main.rs:599][E: codex-rs/cli/src/main.rs:602][E: codex-rs/cli/src/main.rs:605][E: codex-rs/cli/src/main.rs:609][E: codex-rs/cli/src/main.rs:1102][E: codex-rs/cli/src/main.rs:1120][E: codex-rs/cli/src/main.rs:1144][E: codex-rs/cli/src/main.rs:1229] | `codex-rs/cli/src/main.rs:148` |
| `remote-control` | `RemoteControl(RemoteControlCommand)` | experimental;拒绝 root remote | 不带 nested subcommand 时启动 foreground app-server 并临时启用 remote control；nested `start`/`stop` 管理 app-server daemon 的 remote-control 状态，`pair` 创建并打印短期 pairing code。dispatch 用 subcommand 自报名称做 remote-mode 拒绝，然后调用 `remote_control_cmd::run()`。[E: codex-rs/cli/src/main.rs:150][E: codex-rs/cli/src/main.rs:1233][E: codex-rs/cli/src/main.rs:1234][E: codex-rs/cli/src/main.rs:1240][E: codex-rs/cli/src/remote_control_cmd.rs:42][E: codex-rs/cli/src/remote_control_cmd.rs:47][E: codex-rs/cli/src/remote_control_cmd.rs:64][E: codex-rs/cli/src/remote_control_cmd.rs:75][E: codex-rs/cli/src/remote_control_cmd.rs:82][E: codex-rs/cli/src/remote_control_cmd.rs:87][E: codex-rs/cli/src/remote_control_cmd.rs:91] | `codex-rs/cli/src/main.rs:151` |
| `app` | `App(app_cmd::AppCommand)` | macOS/Windows only;拒绝 root remote | 启动 Codex desktop app 或 installer path。[E: codex-rs/cli/src/main.rs:153][E: codex-rs/cli/src/main.rs:154][E: codex-rs/cli/src/main.rs:1247][E: codex-rs/cli/src/main.rs:1254] | `codex-rs/cli/src/main.rs:155` |
| `completion` | `Completion(CompletionCommand)` | 拒绝 root remote | 生成 shell completions；shell 参数默认 bash。[E: codex-rs/cli/src/main.rs:157][E: codex-rs/cli/src/main.rs:216][E: codex-rs/cli/src/main.rs:217][E: codex-rs/cli/src/main.rs:1408][E: codex-rs/cli/src/main.rs:1414] | `codex-rs/cli/src/main.rs:158` |
| `update` | `Update` | 拒绝 root remote | 检查安装方式并运行 update action；debug builds 会拒绝。[E: codex-rs/cli/src/main.rs:160][E: codex-rs/cli/src/main.rs:801][E: codex-rs/cli/src/main.rs:804][E: codex-rs/cli/src/main.rs:811][E: codex-rs/cli/src/main.rs:816][E: codex-rs/cli/src/main.rs:1416][E: codex-rs/cli/src/main.rs:1422] | `codex-rs/cli/src/main.rs:161` |
| `doctor` | `Doctor(DoctorCommand)` | 拒绝 root remote | 诊断本地安装、配置、认证和 runtime health。[E: codex-rs/cli/src/main.rs:163][E: codex-rs/cli/src/main.rs:1424][E: codex-rs/cli/src/main.rs:1430] | `codex-rs/cli/src/main.rs:164` |
| `sandbox` | `Sandbox(HostSandboxArgs)` | OS-specific host sandbox;拒绝 root remote | `HostSandboxArgs` 在 macOS/Linux/Windows 分别映射到 Seatbelt/Landlock/Windows sandbox command；dispatch 按平台调用对应 runner。[E: codex-rs/cli/src/main.rs:166][E: codex-rs/cli/src/main.rs:420][E: codex-rs/cli/src/main.rs:422][E: codex-rs/cli/src/main.rs:424][E: codex-rs/cli/src/main.rs:1451][E: codex-rs/cli/src/main.rs:1481][E: codex-rs/cli/src/main.rs:1488][E: codex-rs/cli/src/main.rs:1495] | `codex-rs/cli/src/main.rs:167` |
| `debug` | `Debug(DebugCommand)` | 拒绝 root remote | Debug tooling 包含 `models`、`app-server`、`prompt-input` 和 hidden `trace-reduce`/`clear-memories`。[E: codex-rs/cli/src/main.rs:169][E: codex-rs/cli/src/main.rs:229][E: codex-rs/cli/src/main.rs:232][E: codex-rs/cli/src/main.rs:235][E: codex-rs/cli/src/main.rs:238][E: codex-rs/cli/src/main.rs:242][E: codex-rs/cli/src/main.rs:243][E: codex-rs/cli/src/main.rs:1507] | `codex-rs/cli/src/main.rs:170` |
| `execpolicy` | `Execpolicy(ExecpolicyCommand)` | hidden;拒绝 root remote | Hidden execpolicy tooling；当前 nested command 是 `check`。[E: codex-rs/cli/src/main.rs:172][E: codex-rs/cli/src/main.rs:173][E: codex-rs/cli/src/main.rs:451][E: codex-rs/cli/src/main.rs:455][E: codex-rs/cli/src/main.rs:1555] | `codex-rs/cli/src/main.rs:174` |
| `apply` | `Apply(ApplyCommand)` | alias `a`;拒绝 root remote | 将 Codex agent 产生的 latest diff 作为 `git apply` 应用到工作树。[E: codex-rs/cli/src/main.rs:176][E: codex-rs/cli/src/main.rs:177][E: codex-rs/cli/src/main.rs:1565][E: codex-rs/cli/src/main.rs:1575] | `codex-rs/cli/src/main.rs:178` |
| `resume` | `Resume(ResumeCommand)` | session wrapper;可带 subcommand-local remote options | 恢复 interactive session；`session_id/--last/--all/--include-non-interactive` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:180][E: codex-rs/cli/src/main.rs:315][E: codex-rs/cli/src/main.rs:319][E: codex-rs/cli/src/main.rs:323][E: codex-rs/cli/src/main.rs:327][E: codex-rs/cli/src/main.rs:1256][E: codex-rs/cli/src/main.rs:1265][E: codex-rs/cli/src/main.rs:1276] | `codex-rs/cli/src/main.rs:181` |
| `archive` | `Archive(SessionArchiveCommand)` | session wrapper;可带 remote options | 归档 saved session；共用 `run_session_archive_cli_command()`，输出 command result。[E: codex-rs/cli/src/main.rs:183][E: codex-rs/cli/src/main.rs:336][E: codex-rs/cli/src/main.rs:1285][E: codex-rs/cli/src/main.rs:1286] | `codex-rs/cli/src/main.rs:184` |
| `delete` | `Delete(DeleteCommand)` | session wrapper;`--force` 要求 UUID | 删除 saved session；先把 `--force` 映射成 delete confirmation policy，再走 session archive command path。[E: codex-rs/cli/src/main.rs:186][E: codex-rs/cli/src/main.rs:362][E: codex-rs/cli/src/main.rs:369][E: codex-rs/cli/src/main.rs:858][E: codex-rs/cli/src/main.rs:861][E: codex-rs/cli/src/main.rs:865][E: codex-rs/cli/src/main.rs:1298][E: codex-rs/cli/src/main.rs:1299] | `codex-rs/cli/src/main.rs:187` |
| `unarchive` | `Unarchive(SessionArchiveCommand)` | session wrapper;可带 remote options | 取消归档 saved session；共用 session archive command path。[E: codex-rs/cli/src/main.rs:189][E: codex-rs/cli/src/main.rs:336][E: codex-rs/cli/src/main.rs:1312][E: codex-rs/cli/src/main.rs:1313] | `codex-rs/cli/src/main.rs:190` |
| `fork` | `Fork(ForkCommand)` | session wrapper;可带 subcommand-local remote options | fork previous interactive session；`session_id/--last/--all` 写入 TUI config，并合并 root/subcommand remote options。[E: codex-rs/cli/src/main.rs:192][E: codex-rs/cli/src/main.rs:377][E: codex-rs/cli/src/main.rs:381][E: codex-rs/cli/src/main.rs:385][E: codex-rs/cli/src/main.rs:1325][E: codex-rs/cli/src/main.rs:1333][E: codex-rs/cli/src/main.rs:1343] | `codex-rs/cli/src/main.rs:193` |
| `cloud` / `cloud-tasks` | `Cloud(CloudTasksCli)` | alias `cloud-tasks`;拒绝 root remote | 浏览 Codex Cloud tasks 并本地 apply changes。[E: codex-rs/cli/src/main.rs:195][E: codex-rs/cli/src/main.rs:196][E: codex-rs/cli/src/main.rs:1438][E: codex-rs/cli/src/main.rs:1448] | `codex-rs/cli/src/main.rs:197` |
| `responses-api-proxy` | `ResponsesApiProxy(ResponsesApiProxyArgs)` | hidden internal;拒绝 root remote | 运行 internal responses API proxy；dispatch 通过 `spawn_blocking` 调用 proxy main。[E: codex-rs/cli/src/main.rs:199][E: codex-rs/cli/src/main.rs:200][E: codex-rs/cli/src/main.rs:1577][E: codex-rs/cli/src/main.rs:1583] | `codex-rs/cli/src/main.rs:201` |
| `stdio-to-uds` | `StdioToUds(StdioToUdsCommand)` | hidden internal;拒绝 root remote | 将 stdio relay 到 Unix domain socket。[E: codex-rs/cli/src/main.rs:203][E: codex-rs/cli/src/main.rs:204][E: codex-rs/cli/src/main.rs:1586][E: codex-rs/cli/src/main.rs:1593] | `codex-rs/cli/src/main.rs:205` |
| `exec-server` | `ExecServer(ExecServerCommand)` | experimental;拒绝 root remote | 运行 standalone exec-server service；支持 listen 或 remote registration 参数。[E: codex-rs/cli/src/main.rs:207][E: codex-rs/cli/src/main.rs:565][E: codex-rs/cli/src/main.rs:573][E: codex-rs/cli/src/main.rs:577][E: codex-rs/cli/src/main.rs:589][E: codex-rs/cli/src/main.rs:1595][E: codex-rs/cli/src/main.rs:1602] | `codex-rs/cli/src/main.rs:208` |
| `features` | `Features(FeaturesCli)` | 拒绝 root remote | feature flags inspection/editing；nested subcommands 是 `list`、`enable <feature>`、`disable <feature>`。[E: codex-rs/cli/src/main.rs:210][E: codex-rs/cli/src/main.rs:926][E: codex-rs/cli/src/main.rs:933][E: codex-rs/cli/src/main.rs:935][E: codex-rs/cli/src/main.rs:937][E: codex-rs/cli/src/main.rs:939][E: codex-rs/cli/src/main.rs:1605][E: codex-rs/cli/src/main.rs:1645][E: codex-rs/cli/src/main.rs:1653] | `codex-rs/cli/src/main.rs:211` |

## 共性规则

`--enable`/`--disable` 在 dispatch 前被转换成 `features.<name>=true/false` 并追加到 root config overrides，因此会随 root overrides 继续流入消费 config 的 subcommand。[E: codex-rs/cli/src/main.rs:881][E: codex-rs/cli/src/main.rs:885][E: codex-rs/cli/src/main.rs:908][E: codex-rs/cli/src/main.rs:912][E: codex-rs/cli/src/main.rs:979][E: codex-rs/cli/src/main.rs:980]

多数非交互命令在 dispatch 开头调用 `reject_remote_mode_for_subcommand()`；该函数明确拒绝 root `--remote` 与 `--remote-auth-token-env`，错误文案说这些只支持 interactive TUI commands。[E: codex-rs/cli/src/main.rs:2114][E: codex-rs/cli/src/main.rs:2119][E: codex-rs/cli/src/main.rs:2121][E: codex-rs/cli/src/main.rs:2124][E: codex-rs/cli/src/main.rs:2126] `resume`、`fork` 和 session archive/delete/unarchive wrappers 不走这个拒绝函数，而是把 root/subcommand remote options 合并后进入 TUI/session command path。[E: codex-rs/cli/src/main.rs:1256][E: codex-rs/cli/src/main.rs:1276][E: codex-rs/cli/src/main.rs:1278][E: codex-rs/cli/src/main.rs:1285][E: codex-rs/cli/src/main.rs:1325][E: codex-rs/cli/src/main.rs:1343]

root `--strict-config` 只有部分 subcommand 可继承；源码 allow-list 包含 interactive、exec、review、mcp-server、exec-server、resume/archive/delete/unarchive/fork、doctor 和 root app-server，其他命令会走 post-parse reject。[E: codex-rs/cli/src/main.rs:983][E: codex-rs/cli/src/main.rs:984][E: codex-rs/cli/src/main.rs:2132][E: codex-rs/cli/src/main.rs:2140][E: codex-rs/cli/src/main.rs:2163][E: codex-rs/cli/src/main.rs:2175]

## Sources

- `codex-rs/cli/src/main.rs`
- `codex-rs/cli/src/remote_control_cmd.rs`

## 相关

- [进程生命周期](../../spine/process-lifecycle.md) - 解释 `main()`、arg0 dispatch 与进程入口。
- [CLI 全局 flag](global-flags.md) - 覆盖 root option surface、shared flags、remote 和 config override。
- [exec 非交互模式](exec-mode.md) - 深入 `codex exec` 的 flags、resume/review 与事件循环。
- [从外部 agent 导入](external-agent-import.md) - `/import` 与 externalAgentConfig RPC 的迁移入口。
- [Code Mode runtime](../../subsystems/core/code-mode-runtime.md) - `--code-mode-host` 的 URL 校验、共享连接和 host transport。
