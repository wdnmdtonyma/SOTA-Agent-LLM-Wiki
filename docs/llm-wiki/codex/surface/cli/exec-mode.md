---
id: cli.exec-mode
title: exec 非交互模式
kind: cli
tier: T1
source: [codex-rs/exec/src/cli.rs, codex-rs/exec/src/lib.rs, codex-rs/exec/src/event_processor_with_jsonl_output.rs, codex-rs/exec/src/event_processor_with_human_output.rs, codex-rs/utils/cli/src/shared_options.rs]
symbols: [codex_exec::Cli, codex_exec::Command, ResumeArgs, ForkArgs, ReviewArgs, Color, codex_exec::run_main, run_exec_session, resolve_resume_thread_id, build_review_request, EventProcessorWithJsonOutput, EventProcessorWithHumanOutput]
related: [cli.subcommands, cli.global-flags, subsys.core.review-mode, rpc.overview, config.approval-sandbox]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> `codex exec` 是 Codex 的非交互 CLI 模式：它解析 root prompt、`resume`/`fork`/`review` nested subcommands、JSONL/human 输出、ephemeral/session flags 和 shared model/sandbox/workdir flags，然后启动 in-process app-server client 跑 user turn、fork 或 review。[E: codex-rs/exec/src/cli.rs:15][E: codex-rs/exec/src/cli.rs:18][E: codex-rs/exec/src/cli.rs:149][E: codex-rs/exec/src/lib.rs:246][E: codex-rs/exec/src/lib.rs:660]

## 能回答的问题

- `codex exec` 有哪些专属 flags?
- `codex exec --json` 如何输出 JSONL?
- `codex exec resume --last <prompt>` 如何区分 session id 和 prompt?
- exec 模式如何通过 app-server API 启动 thread、turn 或 review?
- headless exec 的 approval/sandbox 默认与 interactive 有什么差异?
- persistent exec thread 如何请求 paginated history?

## Catalog

| flag / arg / 子命令 | 定义字段 | 类型 / 默认 | 语义 | 源 |
|---|---|---|---|---|
| `PROMPT` | `Cli::prompt` | optional positional | root initial instructions；有 prompt 且 stdin piped 时，`resolve_root_prompt()` 会把 stdin 追加为 `<stdin>` block。[E: codex-rs/exec/src/cli.rs:80][E: codex-rs/exec/src/lib.rs:2118] | `codex-rs/exec/src/cli.rs:80` |
| `resume` | `Command::Resume(ResumeArgs)` | nested subcommand | 恢复 previous session；解析到 thread id 后发 `thread/resume`，否则 fallback 到 `thread/start`。[E: codex-rs/exec/src/cli.rs:151][E: codex-rs/exec/src/lib.rs:819][E: codex-rs/exec/src/lib.rs:835][E: codex-rs/exec/src/lib.rs:844] | `codex-rs/exec/src/cli.rs:151` |
| `fork` | `Command::Fork(ForkArgs)` | nested subcommand | fork previous session 到新 thread；发 `thread/fork`。无 prompt 时可以只 fork；带 images/output/ephemeral 则要求 prompt。[E: codex-rs/exec/src/cli.rs:154][E: codex-rs/exec/src/cli.rs:161][E: codex-rs/exec/src/lib.rs:748][E: codex-rs/exec/src/lib.rs:852][E: codex-rs/exec/src/lib.rs:893] | `codex-rs/exec/src/cli.rs:154` |
| `review` | `Command::Review(ReviewArgs)` | nested subcommand | 非交互 code review；先构造 `ReviewRequest`，再发送 `review/start`。[E: codex-rs/exec/src/cli.rs:157][E: codex-rs/exec/src/lib.rs:711][E: codex-rs/exec/src/lib.rs:712][E: codex-rs/exec/src/lib.rs:1020][E: codex-rs/exec/src/lib.rs:2131] | `codex-rs/exec/src/cli.rs:157` |
| `--strict-config` | `Cli::strict_config` | bool global false | config.toml 含当前版本不认识字段时出错；该值进入 config load path。[E: codex-rs/exec/src/cli.rs:22][E: codex-rs/exec/src/lib.rs:253] | `codex-rs/exec/src/cli.rs:22` |
| `--thread-source SOURCE` | `Cli::thread_source` | optional `ThreadSource` | 给新创建或 fork 的 thread 标记 source classification。[E: codex-rs/exec/src/cli.rs:29][E: codex-rs/exec/src/lib.rs:255] | `codex-rs/exec/src/cli.rs:29` |
| shared flags | `Cli::shared` | flatten `ExecSharedCliOptions` | 继承 `SharedCliOptions` 的 image/model/oss/profile/sandbox/approve-for-me/dangerous-bypass/cwd/add-dir；exec 将 shared struct 解构后构造 runtime config。[E: codex-rs/exec/src/cli.rs:25][E: codex-rs/exec/src/cli.rs:98][E: codex-rs/exec/src/lib.rs:267] | `codex-rs/exec/src/cli.rs:25` |
| `--skip-git-repo-check` | `Cli::skip_git_repo_check` | bool global false | 允许在非 Git trusted directory 运行；未设置且不是 dangerous bypass 时，如果找不到 repo root 就退出。[E: codex-rs/exec/src/cli.rs:33][E: codex-rs/exec/src/lib.rs:803][E: codex-rs/exec/src/lib.rs:804] | `codex-rs/exec/src/cli.rs:33` |
| `--ephemeral` | `Cli::ephemeral` | bool global false | 不持久化 session 文件的 CLI 意图；exec 写入 `ConfigOverrides.ephemeral`，thread start params 也带 `ephemeral: Some(config.ephemeral)`。[E: codex-rs/exec/src/cli.rs:37][E: codex-rs/exec/src/lib.rs:257][E: codex-rs/exec/src/lib.rs:1198] | `codex-rs/exec/src/cli.rs:37` |
| `--ignore-user-config` | `Cli::ignore_user_config` | bool global false | 不加载 `$CODEX_HOME/config.toml`；写入 loader overrides。[E: codex-rs/exec/src/cli.rs:41][E: codex-rs/exec/src/lib.rs:258][E: codex-rs/exec/src/lib.rs:335] | `codex-rs/exec/src/cli.rs:41` |
| `--ignore-rules` | `Cli::ignore_rules` | bool global false | 不加载 user/project execpolicy `.rules`。[E: codex-rs/exec/src/cli.rs:45][E: codex-rs/exec/src/lib.rs:259] | `codex-rs/exec/src/cli.rs:45` |
| `--approve-for-me` / hidden `--not-so-yolo` | `SharedCliOptions::auto_review` | bool false | 注入 `approvals_reviewer="auto_review"`、`approval_policy="on-request"`、`sandbox_mode="workspace-write"`；与 `--sandbox`/dangerous bypass 冲突。旧 `--full-auto` 已不再解析。[E: codex-rs/utils/cli/src/shared_options.rs:50][E: codex-rs/utils/cli/src/shared_options.rs:46][E: codex-rs/utils/cli/src/shared_options.rs:76][E: codex-rs/exec/src/lib.rs:268] | `codex-rs/utils/cli/src/shared_options.rs:50` |
| `--output-schema FILE` | `Cli::output_schema` | optional path global | 读取 JSON Schema 文件；root user turn 和 resume user turn 都会把 schema 放入 `TurnStartParams.output_schema`。[E: codex-rs/exec/src/cli.rs:49][E: codex-rs/exec/src/lib.rs:264][E: codex-rs/exec/src/lib.rs:739] | `codex-rs/exec/src/cli.rs:49` |
| `--color always\|never\|auto` | `Cli::color` | enum default `auto` | 控制 stderr/human output ANSI；`auto` 检测 stdout/stderr support。[E: codex-rs/exec/src/cli.rs:56][E: codex-rs/exec/src/cli.rs:309][E: codex-rs/exec/src/lib.rs:283] | `codex-rs/exec/src/cli.rs:56` |
| `--json` / `--experimental-json` | `Cli::json` | bool global false | 选择 JSONL event processor；processor 的 `emit()` 对每个 `ThreadEvent` 做 `serde_json::to_string` 后 `println!`。[E: codex-rs/exec/src/cli.rs:60][E: codex-rs/exec/src/lib.rs:682][E: codex-rs/exec/src/event_processor_with_jsonl_output.rs:104] | `codex-rs/exec/src/cli.rs:60` |
| `-o, --output-last-message FILE` | `Cli::last_message_file` | optional path global | json/human processors 都接收 last-message path。[E: codex-rs/exec/src/cli.rs:74][E: codex-rs/exec/src/lib.rs:671][E: codex-rs/exec/src/lib.rs:682] | `codex-rs/exec/src/cli.rs:74` |
| `resume SESSION_ID [PROMPT]` | `ResumeArgs::session_id`, `ResumeArgs::prompt` | optional strings | 第一个 positional 是 session id 或 thread name，第二个 positional 是 resumed prompt。[E: codex-rs/exec/src/cli.rs:187][E: codex-rs/exec/src/cli.rs:210][E: codex-rs/exec/src/cli.rs:217] | `codex-rs/exec/src/cli.rs:217` |
| `resume --last` | `ResumeArgs::last` | bool false | 按 updated time 列出 threads 并选最近一条。[E: codex-rs/exec/src/cli.rs:192][E: codex-rs/exec/src/cli.rs:220] | `codex-rs/exec/src/cli.rs:220` |
| `resume --all` | `ResumeArgs::all` | bool false | 禁用 cwd filtering。[E: codex-rs/exec/src/cli.rs:196][E: codex-rs/exec/src/cli.rs:223] | `codex-rs/exec/src/cli.rs:223` |
| `resume -i, --image FILE` | `ResumeArgs::images` | optional image path list | resume prompt 的 images 会和 root images 一起转成 `UserInput::LocalImage`。[E: codex-rs/exec/src/cli.rs:206][E: codex-rs/exec/src/lib.rs:729] | `codex-rs/exec/src/cli.rs:226` |
| `resume --last PROMPT` | `ResumeArgsRaw` -> `ResumeArgs` conversion | conditional positional reinterpretation | `--last` 且没有第二个 positional prompt 时，raw `session_id` positional 被重新解释为 prompt。[E: codex-rs/exec/src/cli.rs:236][E: codex-rs/exec/src/cli.rs:237] | `codex-rs/exec/src/cli.rs:236` |
| `fork SESSION_ID [PROMPT]` | `ForkArgs::session_id`, `ForkArgs::prompt` | required session id, optional prompt | fork 指定 session；optional prompt/images 在 fork 后作为 user turn。[E: codex-rs/exec/src/cli.rs:164][E: codex-rs/exec/src/cli.rs:178][E: codex-rs/exec/src/lib.rs:748] | `codex-rs/exec/src/cli.rs:161` |
| `review --uncommitted` | `ReviewArgs::uncommitted` | bool false | review staged、unstaged、untracked changes；与 base/commit/prompt 冲突，映射到 `ReviewTarget::UncommittedChanges`。[E: codex-rs/exec/src/cli.rs:280][E: codex-rs/exec/src/lib.rs:2132][E: codex-rs/exec/src/lib.rs:2133] | `codex-rs/exec/src/cli.rs:280` |
| `review --base BRANCH` | `ReviewArgs::base` | optional string | review 相对 base branch 的 changes；映射到 `ReviewTarget::BaseBranch`。[E: codex-rs/exec/src/cli.rs:288][E: codex-rs/exec/src/lib.rs:2134][E: codex-rs/exec/src/lib.rs:2135] | `codex-rs/exec/src/cli.rs:288` |
| `review --commit SHA` / `--title TITLE` | `ReviewArgs::commit`, `commit_title` | optional string | review 指定 commit 引入的 changes；title 只在 commit target 上可用。[E: codex-rs/exec/src/cli.rs:296][E: codex-rs/exec/src/cli.rs:300][E: codex-rs/exec/src/lib.rs:2136][E: codex-rs/exec/src/lib.rs:2139] | `codex-rs/exec/src/cli.rs:296` |
| `review PROMPT` | `ReviewArgs::prompt` | optional positional | 自定义 review instructions；`-` 会从 stdin 读，空 prompt 报错。[E: codex-rs/exec/src/cli.rs:304][E: codex-rs/exec/src/lib.rs:2141][E: codex-rs/exec/src/lib.rs:2144] | `codex-rs/exec/src/cli.rs:304` |

## 控制流

`run_main()` 先把 `--approve-for-me` 转成 config overrides，再解构 shared flags、计算 color/sandbox/cwd/loader/OSS provider/model 并构造 `ConfigOverrides`。headless exec 的基础默认仍是 `AskForApproval::Never`，但 fully resolved reviewer 是 AutoReview 时会重建为自动评审所需的 policy/profile。[E: codex-rs/exec/src/lib.rs:246][E: codex-rs/exec/src/lib.rs:268][E: codex-rs/exec/src/lib.rs:413][E: codex-rs/exec/src/lib.rs:602]

`run_exec_session()` 根据 `--json` 选择 `EventProcessorWithJsonOutput` 或 human processor，再把 command 归一成 `InitialOperation::Review`、`InitialOperation::UserTurn` 或 `InitialOperation::ForkOnly`。[E: codex-rs/exec/src/lib.rs:660][E: codex-rs/exec/src/lib.rs:682][E: codex-rs/exec/src/lib.rs:711][E: codex-rs/exec/src/lib.rs:776]

exec 模式启动 `InProcessAppServerClient` 后，resume path 先尝试 `thread/resume`，fork path 发 `thread/fork`，否则使用 `thread/start`；随后 user turn 发 `turn/start`，review 发 `review/start`。[E: codex-rs/exec/src/lib.rs:812][E: codex-rs/exec/src/lib.rs:819][E: codex-rs/exec/src/lib.rs:852][E: codex-rs/exec/src/lib.rs:972][E: codex-rs/exec/src/lib.rs:1001][E: codex-rs/exec/src/lib.rs:1020][E: codex-rs/exec/src/lib.rs:1148]

非 ephemeral persistent exec thread 在 `thread/start` 时默认请求 `history_mode: Paginated`。如果当前 in-process app-server 返回 `-32600` 且 message 是 `paginated threads require thread/turns/list and thread/items/list support`，exec 会清掉 `history_mode` 再重试一次。[E: codex-rs/exec/src/lib.rs:1198][E: codex-rs/exec/src/lib.rs:1199][E: codex-rs/exec/src/lib.rs:1165][E: codex-rs/exec/src/lib.rs:1168][E: codex-rs/exec/src/lib.rs:1170]

新 thread 总是把 resolved `config.approvals_reviewer` 传入 `thread/start`；resume 则只在 CLI config overrides 显式包含 `approvals_reviewer` 时向 `thread/resume` 传该 override。[E: codex-rs/exec/src/lib.rs:454][E: codex-rs/exec/src/lib.rs:1194][E: codex-rs/exec/src/lib.rs:1224]

事件循环同时监听 Ctrl+C 和 app-server events；Ctrl+C 发送 `turn/interrupt`。[E: codex-rs/exec/src/lib.rs:1059]

## Sources

- `codex-rs/exec/src/cli.rs`
- `codex-rs/exec/src/lib.rs`
- `codex-rs/exec/src/event_processor_with_jsonl_output.rs`
- `codex-rs/exec/src/event_processor_with_human_output.rs`
- `codex-rs/utils/cli/src/shared_options.rs`

## 相关

- [CLI 子命令 catalog](subcommands.md) - 覆盖 `codex exec` 如何从 root dispatch 进入。
- [CLI 全局 flag](global-flags.md) - 覆盖 exec 继承的 shared flags。
- [Review mode](../../subsystems/core/review-mode.md) - 解释 review task 的 core 语义。
