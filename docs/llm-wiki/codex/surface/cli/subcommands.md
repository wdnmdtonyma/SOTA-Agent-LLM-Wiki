---
id: cli.subcommands
title: CLI 子命令 catalog
kind: cli
tier: T1
source: [codex-rs/cli/src/main.rs]
symbols: [MultitoolCli, Subcommand, cli_main, AppServerCommand, DebugCommand, SandboxCommand, FeatureToggles, FeaturesCli]
related: [spine.process-lifecycle, cli.global-flags, cli.exec-mode, command.session-thread, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> CLI 子命令 catalog 覆盖 `codex` 根命令的 `Subcommand` enum:没有 subcommand 时进入 interactive TUI，有 subcommand 时由 `cli_main()` 分派到 exec、auth、MCP、plugin、app-server、sandbox、debug、cloud、features 等入口。

## 能回答的问题

- `codex` 根 CLI 有哪些 top-level subcommand?
- 哪些 subcommand 是 hidden/internal、alias、平台条件编译?
- 根 `codex review` 和 `codex exec review` 的关系是什么?
- `--remote` 为什么只允许 interactive/resume/fork 路径继承或合并，而大多数 subcommand（包括 `app-server` root）会拒绝?

## Catalog

`MultitoolCli` flatten 了 config overrides、feature toggles、remote options 和 interactive `TuiCli`，并把 optional `Subcommand` 放在最后；`clap` usage 明确支持 `codex [OPTIONS] [PROMPT]` 与 `codex [OPTIONS] <COMMAND> [ARGS]` 两种形态。[E: codex-rs/cli/src/main.rs:85][E: codex-rs/cli/src/main.rs:88][E: codex-rs/cli/src/main.rs:91][E: codex-rs/cli/src/main.rs:94][E: codex-rs/cli/src/main.rs:97][E: codex-rs/cli/src/main.rs:98][E: codex-rs/cli/src/main.rs:82]

| 子命令 | enum variant | 类型/别名 | 默认/门控 | 含义与分派 | 源 |
|---|---|---|---|---|---|
| 无 subcommand | `None` | interactive TUI fallback | 默认路径 | `cli_main()` 在 `subcommand == None` 时把 root config flags prepend 到 interactive config，并调用 `run_interactive_tui()`。[E: codex-rs/cli/src/main.rs:700][E: codex-rs/cli/src/main.rs:701][E: codex-rs/cli/src/main.rs:704][E: codex-rs/cli/src/main.rs:705] | `codex-rs/cli/src/main.rs:700` |
| `exec` | `Exec(ExecCli)` | visible alias `e` | 拒绝 remote mode | 非交互执行；dispatch 继承 interactive shared options，合并 root config overrides，然后调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:104][E: codex-rs/cli/src/main.rs:105][E: codex-rs/cli/src/main.rs:715][E: codex-rs/cli/src/main.rs:722][E: codex-rs/cli/src/main.rs:723][E: codex-rs/cli/src/main.rs:727] | `codex-rs/cli/src/main.rs:105` |
| `review` | `Review(ReviewArgs)` | top-level review wrapper | 拒绝 remote mode | 非交互 code review；dispatch 构造 `ExecCli`，把 command 设置为 `ExecCommand::Review(review_args)`，再调用 `codex_exec::run_main()`。[E: codex-rs/cli/src/main.rs:108][E: codex-rs/cli/src/main.rs:730][E: codex-rs/cli/src/main.rs:735][E: codex-rs/cli/src/main.rs:736][E: codex-rs/cli/src/main.rs:741] | `codex-rs/cli/src/main.rs:108` |
| `login` | `Login(LoginCommand)` | auth command | 拒绝 remote mode | 管理 login；dispatch 支持 `login status`、device code、hidden/deprecated `--api-key` error exit、stdin API key 和 ChatGPT login 路径。[E: codex-rs/cli/src/main.rs:111][E: codex-rs/cli/src/main.rs:892][E: codex-rs/cli/src/main.rs:902][E: codex-rs/cli/src/main.rs:906][E: codex-rs/cli/src/main.rs:913][E: codex-rs/cli/src/main.rs:918][E: codex-rs/cli/src/main.rs:922] | `codex-rs/cli/src/main.rs:111` |
| `logout` | `Logout(LogoutCommand)` | auth command | 拒绝 remote mode | 删除 stored authentication credentials；dispatch 合并 config overrides 后调用 `run_logout()`。[E: codex-rs/cli/src/main.rs:114][E: codex-rs/cli/src/main.rs:928][E: codex-rs/cli/src/main.rs:933][E: codex-rs/cli/src/main.rs:937] | `codex-rs/cli/src/main.rs:114` |
| `mcp` | `Mcp(McpCli)` | external MCP management | 拒绝 remote mode | 管理 external MCP servers；dispatch 透传 root config overrides 后运行 `mcp_cli.run()`。[E: codex-rs/cli/src/main.rs:117][E: codex-rs/cli/src/main.rs:752][E: codex-rs/cli/src/main.rs:758][E: codex-rs/cli/src/main.rs:759] | `codex-rs/cli/src/main.rs:117` |
| `plugin` | `Plugin(PluginCli)` | plugin management | 拒绝 remote mode | 管理 Codex plugins；当前 `PluginSubcommand` 只有 `Marketplace`，dispatch 将 config overrides 继续 prepend 到 marketplace CLI 后运行。[E: codex-rs/cli/src/main.rs:120][E: codex-rs/cli/src/main.rs:190][E: codex-rs/cli/src/main.rs:762][E: codex-rs/cli/src/main.rs:771][E: codex-rs/cli/src/main.rs:774][E: codex-rs/cli/src/main.rs:775] | `codex-rs/cli/src/main.rs:120` |
| `mcp-server` | `McpServer` | stdio server | 拒绝 remote mode | 以 MCP server 方式启动 Codex；dispatch 调用 `codex_mcp_server::run_main()`。[E: codex-rs/cli/src/main.rs:123][E: codex-rs/cli/src/main.rs:744][E: codex-rs/cli/src/main.rs:749] | `codex-rs/cli/src/main.rs:123` |
| `app-server` | `AppServer(AppServerCommand)` | experimental app-server | root server 和 tooling 子命令都拒绝 remote mode | 不带 nested subcommand 时运行 app server transport；带 nested subcommand 时生成 TypeScript/JSON Schema/Internal schema。[E: codex-rs/cli/src/main.rs:126][E: codex-rs/cli/src/main.rs:389][E: codex-rs/cli/src/main.rs:786][E: codex-rs/cli/src/main.rs:1409][E: codex-rs/cli/src/main.rs:1416][E: codex-rs/cli/src/main.rs:792][E: codex-rs/cli/src/main.rs:795][E: codex-rs/cli/src/main.rs:806][E: codex-rs/cli/src/main.rs:817][E: codex-rs/cli/src/main.rs:823] | `codex-rs/cli/src/main.rs:126` |
| `app` | `App(app_cmd::AppCommand)` | desktop launcher | 仅 macOS/Windows 编译；拒绝 remote mode | 启动 Codex desktop app；dispatch 调用 `app_cmd::run_app()`。[E: codex-rs/cli/src/main.rs:129][E: codex-rs/cli/src/main.rs:130][E: codex-rs/cli/src/main.rs:830][E: codex-rs/cli/src/main.rs:835] | `codex-rs/cli/src/main.rs:130` |
| `completion` | `Completion(CompletionCommand)` | shell completions | 拒绝 remote mode | 生成 shell completion scripts；shell 参数默认 `Shell::Bash`。[E: codex-rs/cli/src/main.rs:133][E: codex-rs/cli/src/main.rs:196][E: codex-rs/cli/src/main.rs:940][E: codex-rs/cli/src/main.rs:945] | `codex-rs/cli/src/main.rs:133` |
| `sandbox` | `Sandbox(SandboxArgs)` | sandbox runner | 拒绝 remote mode | 在 Codex-provided sandbox 中运行 command；nested subcommands 是 `macos`/`linux`/`windows`，其中 macOS 有 alias `seatbelt`，Linux 有 alias `landlock`。[E: codex-rs/cli/src/main.rs:136][E: codex-rs/cli/src/main.rs:315][E: codex-rs/cli/src/main.rs:316][E: codex-rs/cli/src/main.rs:319][E: codex-rs/cli/src/main.rs:320][E: codex-rs/cli/src/main.rs:323][E: codex-rs/cli/src/main.rs:962][E: codex-rs/cli/src/main.rs:978][E: codex-rs/cli/src/main.rs:994] | `codex-rs/cli/src/main.rs:136` |
| `debug` | `Debug(DebugCommand)` | debug tooling | 拒绝 remote mode | Debugging tools；nested subcommands 是 `models`、`app-server`、`prompt-input` 和 hidden `clear-memories`。[E: codex-rs/cli/src/main.rs:139][E: codex-rs/cli/src/main.rs:209][E: codex-rs/cli/src/main.rs:212][E: codex-rs/cli/src/main.rs:215][E: codex-rs/cli/src/main.rs:218][E: codex-rs/cli/src/main.rs:219][E: codex-rs/cli/src/main.rs:1012][E: codex-rs/cli/src/main.rs:1020][E: codex-rs/cli/src/main.rs:1028][E: codex-rs/cli/src/main.rs:1042] | `codex-rs/cli/src/main.rs:139` |
| `execpolicy` | `Execpolicy(ExecpolicyCommand)` | hidden tooling | hidden；拒绝 remote mode | Execpolicy tooling；nested `check` 调用 `ExecPolicyCheckCommand::run()`。[E: codex-rs/cli/src/main.rs:142][E: codex-rs/cli/src/main.rs:143][E: codex-rs/cli/src/main.rs:335][E: codex-rs/cli/src/main.rs:336][E: codex-rs/cli/src/main.rs:584][E: codex-rs/cli/src/main.rs:1052][E: codex-rs/cli/src/main.rs:1057] | `codex-rs/cli/src/main.rs:143` |
| `apply` | `Apply(ApplyCommand)` | visible alias `a` | 拒绝 remote mode | 将 Codex agent 产生的 latest diff 作为 `git apply` 应用到 working tree；dispatch 调用 `run_apply_command()`。[E: codex-rs/cli/src/main.rs:146][E: codex-rs/cli/src/main.rs:147][E: codex-rs/cli/src/main.rs:1061][E: codex-rs/cli/src/main.rs:1070] | `codex-rs/cli/src/main.rs:147` |
| `resume` | `Resume(ResumeCommand)` | interactive wrapper | 可使用 subcommand-local remote options | 恢复 previous interactive session；dispatch 将 resume 参数写入 interactive CLI 后运行 TUI，并用 subcommand-local remote options 覆盖/回退 root remote options。[E: codex-rs/cli/src/main.rs:150][E: codex-rs/cli/src/main.rs:259][E: codex-rs/cli/src/main.rs:845][E: codex-rs/cli/src/main.rs:854][E: codex-rs/cli/src/main.rs:856][E: codex-rs/cli/src/main.rs:858][E: codex-rs/cli/src/main.rs:859] | `codex-rs/cli/src/main.rs:150` |
| `fork` | `Fork(ForkCommand)` | interactive wrapper | 可使用 subcommand-local remote options | fork previous interactive session；dispatch 将 fork 参数写入 interactive CLI 后运行 TUI，并用 subcommand-local remote options 覆盖/回退 root remote options。[E: codex-rs/cli/src/main.rs:153][E: codex-rs/cli/src/main.rs:285][E: codex-rs/cli/src/main.rs:872][E: codex-rs/cli/src/main.rs:880][E: codex-rs/cli/src/main.rs:882][E: codex-rs/cli/src/main.rs:884][E: codex-rs/cli/src/main.rs:885] | `codex-rs/cli/src/main.rs:153` |
| `cloud` / `cloud-tasks` | `Cloud(CloudTasksCli)` | experimental cloud tasks | alias `cloud-tasks`;拒绝 remote mode | 浏览 Codex Cloud tasks 并本地 apply changes；dispatch 调用 `codex_cloud_tasks::run_main()`。[E: codex-rs/cli/src/main.rs:156][E: codex-rs/cli/src/main.rs:157][E: codex-rs/cli/src/main.rs:948][E: codex-rs/cli/src/main.rs:957] | `codex-rs/cli/src/main.rs:157` |
| `responses-api-proxy` | `ResponsesApiProxy(ResponsesApiProxyArgs)` | hidden internal | hidden；拒绝 remote mode | 运行 internal responses API proxy；dispatch 用 `spawn_blocking` 调 `codex_responses_api_proxy::run_main()`。[E: codex-rs/cli/src/main.rs:160][E: codex-rs/cli/src/main.rs:161][E: codex-rs/cli/src/main.rs:1073][E: codex-rs/cli/src/main.rs:1078] | `codex-rs/cli/src/main.rs:161` |
| `responses` | `Responses(ResponsesCommand)` | hidden internal | hidden；拒绝 remote mode | 通过 Codex auth 发送一条 raw Responses API payload；dispatch 调用 `run_responses_command()`。[E: codex-rs/cli/src/main.rs:164][E: codex-rs/cli/src/main.rs:165][E: codex-rs/cli/src/main.rs:1082][E: codex-rs/cli/src/main.rs:1087] | `codex-rs/cli/src/main.rs:165` |
| `stdio-to-uds` | `StdioToUds(StdioToUdsCommand)` | hidden internal | hidden；拒绝 remote mode | 将 stdio relay 到 Unix domain socket；dispatch 调用 `codex_stdio_to_uds::run()`。[E: codex-rs/cli/src/main.rs:168][E: codex-rs/cli/src/main.rs:169][E: codex-rs/cli/src/main.rs:1090][E: codex-rs/cli/src/main.rs:1096] | `codex-rs/cli/src/main.rs:169` |
| `exec-server` | `ExecServer(ExecServerCommand)` | experimental service | 拒绝 remote mode；listen 默认 `ws://127.0.0.1:0` | 运行 standalone exec-server service；dispatch 调用 `run_exec_server_command()`。[E: codex-rs/cli/src/main.rs:172][E: codex-rs/cli/src/main.rs:431][E: codex-rs/cli/src/main.rs:1099][E: codex-rs/cli/src/main.rs:1104] | `codex-rs/cli/src/main.rs:172` |
| `features` | `Features(FeaturesCli)` | feature flag inspection/editing | 拒绝 remote mode | 检查和编辑 feature flags；nested subcommands 是 `list`、`enable <feature>`、`disable <feature>`。[E: codex-rs/cli/src/main.rs:175][E: codex-rs/cli/src/main.rs:654][E: codex-rs/cli/src/main.rs:656][E: codex-rs/cli/src/main.rs:658][E: codex-rs/cli/src/main.rs:1108][E: codex-rs/cli/src/main.rs:1155][E: codex-rs/cli/src/main.rs:1163] | `codex-rs/cli/src/main.rs:175` |

## 共性机制

`cli_main()` 在 parse 后先把 `--enable`/`--disable` 转成 `features.<name>=true/false` config override，并追加到 root config overrides；这些 toggles 进入 root config overrides 后，会被加载配置的分支继续传递，而纯 completion/internal relay/service 分支可能不消费 root config overrides。[E: codex-rs/cli/src/main.rs:694][E: codex-rs/cli/src/main.rs:695][E: codex-rs/cli/src/main.rs:723][E: codex-rs/cli/src/main.rs:758][E: codex-rs/cli/src/main.rs:939][E: codex-rs/cli/src/main.rs:1072][E: codex-rs/cli/src/main.rs:1089][E: codex-rs/cli/src/main.rs:1098] 大多数非交互 subcommand 在 dispatch 开头调用 `reject_remote_mode_for_subcommand()`；`app-server` 包装为 `reject_remote_mode_for_app_server_subcommand()`，但 `None` 会映射为 `"app-server"` 后同样拒绝 remote；`resume` 与 `fork` 会把 subcommand-local remote options 和 root remote options 合并后进入 interactive TUI。[E: codex-rs/cli/src/main.rs:715][E: codex-rs/cli/src/main.rs:786][E: codex-rs/cli/src/main.rs:1409][E: codex-rs/cli/src/main.rs:1416][E: codex-rs/cli/src/main.rs:856][E: codex-rs/cli/src/main.rs:859][E: codex-rs/cli/src/main.rs:882][E: codex-rs/cli/src/main.rs:885]

## Sources

- `codex-rs/cli/src/main.rs`

## 相关

- [进程生命周期](../../spine/process-lifecycle.md) — 解释 `main()` 和 arg0 dispatch。
- [CLI 全局 flag](global-flags.md) — 覆盖子命令之前可用的 top-level options。
- [exec 非交互模式](exec-mode.md) — 深入 `codex exec` 的 flags 和 event loop。
