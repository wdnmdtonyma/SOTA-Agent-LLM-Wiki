---
id: cli.exec-mode
title: exec 非交互模式
kind: cli
tier: T1
source: [codex-rs/exec/src/cli.rs, codex-rs/exec/src/lib.rs, codex-rs/exec/src/event_processor_with_jsonl_output.rs, codex-rs/exec/src/event_processor_with_human_output.rs, codex-rs/utils/cli/src/shared_options.rs]
symbols: [codex_exec::Cli, codex_exec::Command, ResumeArgs, ReviewArgs, Color, run_main, run_exec_session, resolve_resume_thread_id, build_review_request, EventProcessorWithJsonOutput, EventProcessorWithHumanOutput]
related: [cli.subcommands, cli.global-flags, subsys.core.review-mode, rpc.overview, config.approval-sandbox]
evidence: explicit
status: verified
updated: db887d03e1
---

> `codex exec` 是 Codex 的非交互 CLI 模式:它解析 root prompt、`resume`/`review` nested subcommands、JSONL/human 输出、ephemeral/session flags 和 shared model/sandbox/workdir flags，然后启动 in-process app-server client 跑 user turn 或 review。[E: codex-rs/exec/src/cli.rs:14][E: codex-rs/exec/src/cli.rs:17][E: codex-rs/exec/src/lib.rs:239][E: codex-rs/exec/src/lib.rs:670][E: codex-rs/exec/src/lib.rs:789]

## 能回答的问题

- `codex exec` 有哪些专属 flags?
- `codex exec --json` 如何输出 JSONL?
- `codex exec resume --last <prompt>` 如何区分 session id 和 prompt?
- exec 模式如何通过 app-server API 启动 thread、turn 或 review?
- headless exec 的 approval/sandbox 默认与 interactive 有什么差异?

## Catalog

| flag / arg / 子命令 | 定义字段 | 类型 / 默认 | 语义 | 源 |
|---|---|---|---|---|
| `PROMPT` | `Cli::prompt` | optional positional | root initial instructions；有 prompt 且 stdin piped 时，`resolve_root_prompt()` 会把 stdin 追加为 `<stdin>` block。[E: codex-rs/exec/src/cli.rs:84][E: codex-rs/exec/src/cli.rs:85][E: codex-rs/exec/src/lib.rs:1961][E: codex-rs/exec/src/lib.rs:1964] | `codex-rs/exec/src/cli.rs:85` |
| `resume` | `Command::Resume(ResumeArgs)` | nested subcommand | 恢复 previous session；解析到 thread id 后发 `thread/resume`，否则 fallback 到 `thread/start`。[E: codex-rs/exec/src/cli.rs:166][E: codex-rs/exec/src/cli.rs:168][E: codex-rs/exec/src/lib.rs:797][E: codex-rs/exec/src/lib.rs:809][E: codex-rs/exec/src/lib.rs:824] | `codex-rs/exec/src/cli.rs:168` |
| `review` | `Command::Review(ReviewArgs)` | nested subcommand | 非交互 code review；先构造 `ReviewRequest`，再发送 `review/start`。[E: codex-rs/exec/src/cli.rs:171][E: codex-rs/exec/src/cli.rs:171][E: codex-rs/exec/src/lib.rs:719][E: codex-rs/exec/src/lib.rs:720][E: codex-rs/exec/src/lib.rs:917][E: codex-rs/exec/src/lib.rs:928] | `codex-rs/exec/src/cli.rs:171` |
| `--strict-config` | `Cli::strict_config` | bool global false | config.toml 含当前版本不认识字段时出错；该值进入 config load path。[E: codex-rs/exec/src/cli.rs:20][E: codex-rs/exec/src/cli.rs:21][E: codex-rs/exec/src/lib.rs:251][E: codex-rs/exec/src/lib.rs:343] | `codex-rs/exec/src/cli.rs:21` |
| shared flags | `Cli::shared` | flatten `ExecSharedCliOptions` | 继承 `SharedCliOptions` 的 image/model/oss/profile/sandbox/dangerous-bypass/cwd/add-dir；exec 将 shared struct 解构后构造 runtime config。[E: codex-rs/exec/src/cli.rs:23][E: codex-rs/exec/src/cli.rs:24][E: codex-rs/exec/src/lib.rs:265][E: codex-rs/exec/src/lib.rs:277] | `codex-rs/exec/src/cli.rs:24` |
| `--skip-git-repo-check` | `Cli::skip_git_repo_check` | bool global false | 允许在非 Git trusted directory 运行；未设置且不是 dangerous bypass 时，如果找不到 repo root 就退出。[E: codex-rs/exec/src/cli.rs:27][E: codex-rs/exec/src/cli.rs:28][E: codex-rs/exec/src/lib.rs:780][E: codex-rs/exec/src/lib.rs:784] | `codex-rs/exec/src/cli.rs:28` |
| `--ephemeral` | `Cli::ephemeral` | bool global false | 不持久化 session 文件的 CLI 意图；exec 写入 `ConfigOverrides.ephemeral`，thread start params 也带 `ephemeral: Some(config.ephemeral)`。[E: codex-rs/exec/src/cli.rs:31][E: codex-rs/exec/src/cli.rs:32][E: codex-rs/exec/src/lib.rs:445][E: codex-rs/exec/src/lib.rs:1073] | `codex-rs/exec/src/cli.rs:32` |
| `--ignore-user-config` | `Cli::ignore_user_config` | bool global false | 不加载 `$CODEX_HOME/config.toml`；写入 `LoaderOverrides.ignore_user_config`。[E: codex-rs/exec/src/cli.rs:35][E: codex-rs/exec/src/cli.rs:36][E: codex-rs/exec/src/lib.rs:330][E: codex-rs/exec/src/lib.rs:333] | `codex-rs/exec/src/cli.rs:36` |
| `--ignore-rules` | `Cli::ignore_rules` | bool global false | 不加载 user/project execpolicy `.rules`；写入 `LoaderOverrides.ignore_user_and_project_exec_policy_rules`。[E: codex-rs/exec/src/cli.rs:39][E: codex-rs/exec/src/cli.rs:40][E: codex-rs/exec/src/lib.rs:330][E: codex-rs/exec/src/lib.rs:334] | `codex-rs/exec/src/cli.rs:40` |
| `--full-auto` | `Cli::removed_full_auto` | hidden bool global false | removed compatibility trap；与 dangerous bypass 冲突，打印 deprecation warning，并映射为 workspace-write sandbox。[E: codex-rs/exec/src/cli.rs:50][E: codex-rs/exec/src/cli.rs:50][E: codex-rs/exec/src/cli.rs:103][E: codex-rs/exec/src/lib.rs:292][E: codex-rs/exec/src/lib.rs:293] | `codex-rs/exec/src/cli.rs:50` |
| `--output-schema FILE` | `Cli::output_schema` | optional path global | 读取 JSON Schema 文件；root user turn 和 resume user turn 都会把 schema 放入 `TurnStartParams.output_schema`。[E: codex-rs/exec/src/cli.rs:53][E: codex-rs/exec/src/cli.rs:54][E: codex-rs/exec/src/lib.rs:747][E: codex-rs/exec/src/lib.rs:767][E: codex-rs/exec/src/lib.rs:904][E: codex-rs/exec/src/lib.rs:1789] | `codex-rs/exec/src/cli.rs:54` |
| `--color always|never|auto` | `Cli::color` | enum default `auto` | 控制 stderr/human output ANSI；`auto` 检测 stdout/stderr support，human processor 接收 `stderr_with_ansi`。[E: codex-rs/exec/src/cli.rs:60][E: codex-rs/exec/src/cli.rs:61][E: codex-rs/exec/src/cli.rs:302][E: codex-rs/exec/src/cli.rs:306][E: codex-rs/exec/src/lib.rs:279][E: codex-rs/exec/src/lib.rs:692] | `codex-rs/exec/src/cli.rs:61` |
| `--json` / `--experimental-json` | `Cli::json` | bool global false | 选择 JSONL event processor；processor 的 `emit()` 对每个 `ThreadEvent` 做 `serde_json::to_string` 后 `println!`。[E: codex-rs/exec/src/cli.rs:70][E: codex-rs/exec/src/cli.rs:70][E: codex-rs/exec/src/lib.rs:689][E: codex-rs/exec/src/lib.rs:690][E: codex-rs/exec/src/event_processor_with_jsonl_output.rs:104][E: codex-rs/exec/src/event_processor_with_jsonl_output.rs:114] | `codex-rs/exec/src/cli.rs:70` |
| `-o, --output-last-message FILE` | `Cli::last_message_file` | optional path global | json/human processors 都接收 last-message path；shutdown 时把 final message 写入该 path。[E: codex-rs/exec/src/cli.rs:79][E: codex-rs/exec/src/cli.rs:79][E: codex-rs/exec/src/lib.rs:690][E: codex-rs/exec/src/lib.rs:694][E: codex-rs/exec/src/event_processor_with_jsonl_output.rs:624][E: codex-rs/exec/src/event_processor_with_human_output.rs:378] | `codex-rs/exec/src/cli.rs:79` |
| `resume SESSION_ID [PROMPT]` | `ResumeArgs::session_id`, `ResumeArgs::prompt` | optional strings | 第一个 positional 是 session id 或 thread name，第二个 positional 是 resumed prompt；UUID 直接当 thread id，非 UUID 先查 state DB exact title / rollout meta，再用 `thread/list` search title。[E: codex-rs/exec/src/cli.rs:181][E: codex-rs/exec/src/cli.rs:203][E: codex-rs/exec/src/cli.rs:210][E: codex-rs/exec/src/cli.rs:222][E: codex-rs/exec/src/lib.rs:724][E: codex-rs/exec/src/lib.rs:736][E: codex-rs/exec/src/lib.rs:1500][E: codex-rs/exec/src/lib.rs:1518][E: codex-rs/exec/src/lib.rs:1505][E: codex-rs/exec/src/lib.rs:1552] | `codex-rs/exec/src/cli.rs:210` |
| `resume --last` | `ResumeArgs::last` | bool false | 按 updated time 列出 threads；默认限制 model provider 并要求 cwd match，`--all` 可放宽 cwd filter。[E: codex-rs/exec/src/cli.rs:185][E: codex-rs/exec/src/cli.rs:185][E: codex-rs/exec/src/lib.rs:1456][E: codex-rs/exec/src/lib.rs:1458][E: codex-rs/exec/src/lib.rs:1468][E: codex-rs/exec/src/lib.rs:1486][E: codex-rs/exec/src/lib.rs:1556][E: codex-rs/exec/src/lib.rs:1571][E: codex-rs/exec/src/lib.rs:1572] | `codex-rs/exec/src/cli.rs:185` |
| `resume --all` | `ResumeArgs::all` | bool false | 禁用 cwd filtering；不取消 `--last` 的 model provider filter。[E: codex-rs/exec/src/cli.rs:189][E: codex-rs/exec/src/cli.rs:189][E: codex-rs/exec/src/lib.rs:1486][E: codex-rs/exec/src/lib.rs:1504][E: codex-rs/exec/src/lib.rs:1556] | `codex-rs/exec/src/cli.rs:189` |
| `resume -i, --image FILE` | `ResumeArgs::images` | optional image path list | resume prompt 的 images 会和 root images 一起转成 `UserInput::LocalImage`。[E: codex-rs/exec/src/cli.rs:199][E: codex-rs/exec/src/cli.rs:199][E: codex-rs/exec/src/lib.rs:737][E: codex-rs/exec/src/lib.rs:740] | `codex-rs/exec/src/cli.rs:199` |
| `resume --last PROMPT` | `ResumeArgsRaw` -> `ResumeArgs` conversion | conditional positional reinterpretation | `--last` 且没有第二个 positional prompt 时，raw `session_id` positional 被重新解释为 prompt；这样 `codex exec resume --last <prompt>` 不会把 `<prompt>` 当 session id。[E: codex-rs/exec/src/cli.rs:181][E: codex-rs/exec/src/cli.rs:180][E: codex-rs/exec/src/cli.rs:203][E: codex-rs/exec/src/cli.rs:229][E: codex-rs/exec/src/cli.rs:230][E: codex-rs/exec/src/lib.rs:725][E: codex-rs/exec/src/lib.rs:736] | `codex-rs/exec/src/cli.rs:229` |
| `review --uncommitted` | `ReviewArgs::uncommitted` | bool false | review staged、unstaged、untracked changes；与 base/commit/prompt 冲突，映射到 `ReviewTarget::UncommittedChanges`。[E: codex-rs/exec/src/cli.rs:273][E: codex-rs/exec/src/cli.rs:273][E: codex-rs/exec/src/lib.rs:1974][E: codex-rs/exec/src/lib.rs:1976] | `codex-rs/exec/src/cli.rs:273` |
| `review --base BRANCH` | `ReviewArgs::base` | optional string | review 相对 base branch 的 changes；映射到 `ReviewTarget::BaseBranch`。[E: codex-rs/exec/src/cli.rs:281][E: codex-rs/exec/src/cli.rs:281][E: codex-rs/exec/src/lib.rs:1977][E: codex-rs/exec/src/lib.rs:1978] | `codex-rs/exec/src/cli.rs:281` |
| `review --commit SHA` / `--title TITLE` | `ReviewArgs::commit`, `commit_title` | optional string | review 指定 commit 引入的 changes；title 只在 commit target 上可用并进入 target title 字段。[E: codex-rs/exec/src/cli.rs:289][E: codex-rs/exec/src/cli.rs:293][E: codex-rs/exec/src/lib.rs:1979][E: codex-rs/exec/src/lib.rs:1982] | `codex-rs/exec/src/cli.rs:289` |
| `review PROMPT` | `ReviewArgs::prompt` | optional positional | 自定义 review instructions；`-` 会从 stdin 读，空 prompt 报错。[E: codex-rs/exec/src/cli.rs:297][E: codex-rs/exec/src/cli.rs:297][E: codex-rs/exec/src/lib.rs:1985][E: codex-rs/exec/src/lib.rs:1987] | `codex-rs/exec/src/cli.rs:297` |

## 控制流

`run_main()` 先解构 CLI 和 shared flags，计算 color、sandbox、config overrides、cwd、loader overrides、OSS provider/model，然后构造 `ConfigOverrides`；headless exec 默认把 approval policy 设为 `AskForApproval::Never`。[E: codex-rs/exec/src/lib.rs:249][E: codex-rs/exec/src/lib.rs:277][E: codex-rs/exec/src/lib.rs:279][E: codex-rs/exec/src/lib.rs:297][E: codex-rs/exec/src/lib.rs:301][E: codex-rs/exec/src/lib.rs:335][E: codex-rs/exec/src/lib.rs:410][E: codex-rs/exec/src/lib.rs:426]

`run_exec_session()` 根据 `--json` 选择 `EventProcessorWithJsonOutput` 或 `EventProcessorWithHumanOutput`，再把 command 归一成 `InitialOperation::Review` 或 `InitialOperation::UserTurn`。[E: codex-rs/exec/src/lib.rs:689][E: codex-rs/exec/src/lib.rs:695][E: codex-rs/exec/src/lib.rs:718][E: codex-rs/exec/src/lib.rs:769]

exec 模式启动 `InProcessAppServerClient` 后，resume path 先尝试 `thread/resume`，否则或非 resume path 使用 `thread/start`；随后 user turn 发 `turn/start`，review 发 `review/start`。[E: codex-rs/exec/src/lib.rs:789][E: codex-rs/exec/src/lib.rs:801][E: codex-rs/exec/src/lib.rs:805][E: codex-rs/exec/src/lib.rs:820][E: codex-rs/exec/src/lib.rs:836][E: codex-rs/exec/src/lib.rs:884][E: codex-rs/exec/src/lib.rs:920]

事件循环同时监听 Ctrl+C 和 app-server events；Ctrl+C 发送 `turn/interrupt`，server error 或 failed/interrupted turn 会把 `error_seen` 置 true，用于自动化可观察的失败退出语义。[E: codex-rs/exec/src/lib.rs:948][E: codex-rs/exec/src/lib.rs:967][E: codex-rs/exec/src/lib.rs:982][E: codex-rs/exec/src/lib.rs:992][E: codex-rs/exec/src/lib.rs:998][E: codex-rs/exec/src/lib.rs:1003]

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
