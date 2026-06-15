---
id: cli.exec-mode
title: exec 非交互模式
kind: cli
tier: T1
source: [codex-rs/exec/src/cli.rs, codex-rs/exec/src/lib.rs, docs/exec.md]
symbols: [codex_exec::Cli, codex_exec::Command, ResumeArgs, ReviewArgs, run_main, run_exec_session, EventProcessorWithJsonOutput, EventProcessorWithHumanOutput]
related: [cli.subcommands, cli.global-flags, subsys.core.review-mode, rpc.overview, config.approval-sandbox]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex exec` 是 Codex 的非交互 CLI 模式:它解析 prompt、resume/review 子命令、JSONL 输出、ephemeral/session flags 和 shared model/sandbox flags，然后启动 in-process app-server client 来跑一个 turn 或 review。

## 能回答的问题

- `codex exec` 有哪些专属 flags?
- `codex exec --json` 为什么 stdout 必须是 JSONL?
- `codex exec resume --last <prompt>` 如何区分 session id 和 prompt?
- exec 模式如何启动 thread、turn 或 review?

## Catalog

| flag / arg / 子命令 | 定义字段 | 类型 | 默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `PROMPT` | `Cli::prompt` | optional positional `String` | stdin fallback [I] | root 非交互 initial instructions；只有 root prompt 路径用 `resolve_root_prompt()` 在 prompt 已给且 stdin piped 时追加 `<stdin>` block，resume/review prompt 走 `resolve_prompt()` 或 review target builder。[E: codex-rs/exec/src/cli.rs:70][E: codex-rs/exec/src/cli.rs:71][E: codex-rs/exec/src/lib.rs:599][E: codex-rs/exec/src/lib.rs:620][E: codex-rs/exec/src/lib.rs:1721][E: codex-rs/exec/src/lib.rs:1724][E: codex-rs/exec/src/lib.rs:1725][E: codex-rs/exec/src/lib.rs:1745] | `codex-rs/exec/src/cli.rs:71` |
| `resume` | `Command::Resume(ResumeArgs)` | exec nested subcommand | unset | 恢复 previous session by id 或 `--last`；`resolve_resume_thread_id()` 对 `--last` 走 sorted `thread/list`，UUID 直接返回，thread name 先查 state DB / rollout meta 再 search `thread/list`；解析到 thread id 后调用 `thread/resume`，否则 fallback 到 `thread/start`。[E: codex-rs/exec/src/cli.rs:142][E: codex-rs/exec/src/lib.rs:662][E: codex-rs/exec/src/lib.rs:663][E: codex-rs/exec/src/lib.rs:669][E: codex-rs/exec/src/lib.rs:1243][E: codex-rs/exec/src/lib.rs:1246][E: codex-rs/exec/src/lib.rs:1282][E: codex-rs/exec/src/lib.rs:1283][E: codex-rs/exec/src/lib.rs:1288][E: codex-rs/exec/src/lib.rs:1300][E: codex-rs/exec/src/lib.rs:1309][E: codex-rs/exec/src/lib.rs:677][E: codex-rs/exec/src/lib.rs:683] | `codex-rs/exec/src/cli.rs:142` |
| `review` | `Command::Review(ReviewArgs)` | exec nested subcommand | unset | 运行 code review operation；`build_review_request()` 要求 `--uncommitted`、`--base`、`--commit` 或 custom prompt 之一，否则报错；`run_exec_session()` 把 review 转成 `InitialOperation::Review` 并发送 `review/start`。[E: codex-rs/exec/src/cli.rs:145][E: codex-rs/exec/src/lib.rs:582][E: codex-rs/exec/src/lib.rs:583][E: codex-rs/exec/src/lib.rs:1735][E: codex-rs/exec/src/lib.rs:1737][E: codex-rs/exec/src/lib.rs:1739][E: codex-rs/exec/src/lib.rs:1744][E: codex-rs/exec/src/lib.rs:1753][E: codex-rs/exec/src/lib.rs:1754][E: codex-rs/exec/src/lib.rs:770][E: codex-rs/exec/src/lib.rs:773] | `codex-rs/exec/src/cli.rs:145` |
| `--skip-git-repo-check` | `Cli::skip_git_repo_check` | bool global | false | 允许在 Git repo 外运行；未设置且不是 dangerous bypass 时，exec 会检查 `get_git_repo_root()`，失败则退出。[E: codex-rs/exec/src/cli.rs:23][E: codex-rs/exec/src/cli.rs:24][E: codex-rs/exec/src/lib.rs:643][E: codex-rs/exec/src/lib.rs:644][E: codex-rs/exec/src/lib.rs:645][E: codex-rs/exec/src/lib.rs:647] | `codex-rs/exec/src/cli.rs:24` |
| `--ephemeral` | `Cli::ephemeral` | bool global | false | exec path 把 true 写入 `ConfigOverrides.ephemeral`，thread start params 也带 `ephemeral: Some(config.ephemeral)`；“不持久化 session files”是 CLI flag 意图而非本节点所列源码内完整实现。[E: codex-rs/exec/src/cli.rs:27][E: codex-rs/exec/src/cli.rs:28][E: codex-rs/exec/src/lib.rs:410][E: codex-rs/exec/src/lib.rs:934] | `codex-rs/exec/src/cli.rs:28` |
| `--ignore-user-config` | `Cli::ignore_user_config` | bool global | false | 不加载 `$CODEX_HOME/config.toml` 的开关写入 `LoaderOverrides.ignore_user_config`。[E: codex-rs/exec/src/cli.rs:31][E: codex-rs/exec/src/cli.rs:32][E: codex-rs/exec/src/lib.rs:308][E: codex-rs/exec/src/lib.rs:309] | `codex-rs/exec/src/cli.rs:32` |
| `--ignore-rules` | `Cli::ignore_rules` | bool global | false | 不加载 user/project execpolicy `.rules` 的开关写入 `LoaderOverrides.ignore_user_and_project_exec_policy_rules`。[E: codex-rs/exec/src/cli.rs:35][E: codex-rs/exec/src/cli.rs:36][E: codex-rs/exec/src/lib.rs:310] | `codex-rs/exec/src/cli.rs:36` |
| `--output-schema FILE` | `Cli::output_schema` | optional `PathBuf` | unset | 读取 JSON Schema 文件描述最终响应 shape；root 和 resume user-turn 路径都会加载 schema，并把结果放入 `TurnStartParams.output_schema`。[E: codex-rs/exec/src/cli.rs:39][E: codex-rs/exec/src/cli.rs:40][E: codex-rs/exec/src/lib.rs:610][E: codex-rs/exec/src/lib.rs:630][E: codex-rs/exec/src/lib.rs:758][E: codex-rs/exec/src/lib.rs:1552][E: codex-rs/exec/src/lib.rs:1563] | `codex-rs/exec/src/cli.rs:40` |
| `--color always|never|auto` | `Cli::color` | enum | `auto` | 控制 ANSI capability 计算；代码计算 stdout/stderr 两个值，但只把 `stderr_with_ansi` 传给 tracing layer 和 human event processor。[E: codex-rs/exec/src/cli.rs:46][E: codex-rs/exec/src/cli.rs:47][E: codex-rs/exec/src/lib.rs:250][E: codex-rs/exec/src/lib.rs:253][E: codex-rs/exec/src/lib.rs:267][E: codex-rs/exec/src/lib.rs:554] | `codex-rs/exec/src/cli.rs:47` |
| `--json` / `--experimental-json` | `Cli::json` | bool global | false | 设置 json mode；`run_exec_session()` 在 true 时选择 `EventProcessorWithJsonOutput`，否则选择 human output processor。[E: codex-rs/exec/src/cli.rs:51][E: codex-rs/exec/src/cli.rs:52][E: codex-rs/exec/src/cli.rs:56][E: codex-rs/exec/src/lib.rs:551][E: codex-rs/exec/src/lib.rs:552][E: codex-rs/exec/src/lib.rs:553] | `codex-rs/exec/src/cli.rs:56` |
| `-o, --output-last-message FILE` | `Cli::last_message_file` | optional `PathBuf` global | unset | 指定 agent last-message output path；当前节点 source 可证明 json/human event processor 都接收该 path。[E: codex-rs/exec/src/cli.rs:58][E: codex-rs/exec/src/cli.rs:60][E: codex-rs/exec/src/cli.rs:61][E: codex-rs/exec/src/cli.rs:65][E: codex-rs/exec/src/lib.rs:552][E: codex-rs/exec/src/lib.rs:556] | `codex-rs/exec/src/cli.rs:65` |
| `resume SESSION_ID` | `ResumeArgs::session_id` | optional string | unset | session id 或 thread name；UUID parse 成功时直接作为 thread id，thread name 会先查 state DB / rollout meta 再 search `thread/list`；`ResumeArgsRaw` 在 `--last` 且没有 prompt 时会把 positional 重新解释为 prompt。[E: codex-rs/exec/src/cli.rs:154][E: codex-rs/exec/src/cli.rs:155][E: codex-rs/exec/src/cli.rs:184][E: codex-rs/exec/src/cli.rs:203][E: codex-rs/exec/src/lib.rs:1282][E: codex-rs/exec/src/lib.rs:1283][E: codex-rs/exec/src/lib.rs:1288][E: codex-rs/exec/src/lib.rs:1300][E: codex-rs/exec/src/lib.rs:1330] | `codex-rs/exec/src/cli.rs:184` |
| `resume --last` | `ResumeArgs::last` | bool | false | 按 `UpdatedAt` 列表寻找最近 thread，但会限制 model provider，并默认要求 cwd 匹配；转换逻辑允许 `codex exec resume --last <prompt>` 把 positional 当 prompt。[E: codex-rs/exec/src/cli.rs:158][E: codex-rs/exec/src/cli.rs:159][E: codex-rs/exec/src/cli.rs:203][E: codex-rs/exec/src/lib.rs:1241][E: codex-rs/exec/src/lib.rs:1253][E: codex-rs/exec/src/lib.rs:1255][E: codex-rs/exec/src/lib.rs:1268][E: codex-rs/exec/src/lib.rs:1349] | `codex-rs/exec/src/cli.rs:187` |
| `resume --all` | `ResumeArgs::all` | bool | false | 禁用 cwd filtering，但不禁用 `--last` 的 model provider filtering。[E: codex-rs/exec/src/cli.rs:162][E: codex-rs/exec/src/cli.rs:163][E: codex-rs/exec/src/lib.rs:1268][E: codex-rs/exec/src/lib.rs:1286][E: codex-rs/exec/src/lib.rs:1334][E: codex-rs/exec/src/lib.rs:1349] | `codex-rs/exec/src/cli.rs:190` |
| `resume -i, --image FILE` | `ResumeArgs::images` | `Vec<PathBuf>` | `[]` | 向 resumed prompt 附加图片；`run_exec_session()` 合并 root images 和 resume images 成 `UserInput::LocalImage`。[E: codex-rs/exec/src/cli.rs:167][E: codex-rs/exec/src/cli.rs:173][E: codex-rs/exec/src/lib.rs:600][E: codex-rs/exec/src/lib.rs:602][E: codex-rs/exec/src/lib.rs:603] | `codex-rs/exec/src/cli.rs:193` |
| `review --uncommitted` | `ReviewArgs::uncommitted` | bool | false | review staged、unstaged 和 untracked changes；与 `--base`、`--commit`、prompt 冲突，并映射到 `ReviewTarget::UncommittedChanges`。[E: codex-rs/exec/src/cli.rs:241][E: codex-rs/exec/src/cli.rs:243][E: codex-rs/exec/src/cli.rs:245][E: codex-rs/exec/src/cli.rs:247][E: codex-rs/exec/src/lib.rs:1735][E: codex-rs/exec/src/lib.rs:1736] | `codex-rs/exec/src/cli.rs:247` |
| `review --base BRANCH` | `ReviewArgs::base` | optional string | unset | review 相对 base branch 的 changes；与 uncommitted/commit/prompt 冲突，并映射到 `ReviewTarget::BaseBranch`。[E: codex-rs/exec/src/cli.rs:251][E: codex-rs/exec/src/cli.rs:253][E: codex-rs/exec/src/cli.rs:255][E: codex-rs/exec/src/lib.rs:1737][E: codex-rs/exec/src/lib.rs:1738] | `codex-rs/exec/src/cli.rs:255` |
| `review --commit SHA` | `ReviewArgs::commit` | optional string | unset | review 指定 commit 引入的 changes；与 uncommitted/base/prompt 冲突，并映射到 `ReviewTarget::Commit`。[E: codex-rs/exec/src/cli.rs:259][E: codex-rs/exec/src/cli.rs:261][E: codex-rs/exec/src/cli.rs:263][E: codex-rs/exec/src/lib.rs:1739][E: codex-rs/exec/src/lib.rs:1740] | `codex-rs/exec/src/cli.rs:263` |
| `review --title TITLE` | `ReviewArgs::commit_title` | optional string | unset | 给 commit review summary 显示 custom title；`requires = "commit"`，并进入 commit review target 的 `title` 字段。[E: codex-rs/exec/src/cli.rs:266][E: codex-rs/exec/src/cli.rs:267][E: codex-rs/exec/src/lib.rs:1742] | `codex-rs/exec/src/cli.rs:267` |
| `review PROMPT` | `ReviewArgs::prompt` | optional string | unset | 自定义 review instructions；`build_review_request()` 用 `resolve_prompt()` 读取 `-`/stdin，并映射到 `ReviewTarget::Custom`。[E: codex-rs/exec/src/cli.rs:270][E: codex-rs/exec/src/cli.rs:271][E: codex-rs/exec/src/lib.rs:1744][E: codex-rs/exec/src/lib.rs:1745][E: codex-rs/exec/src/lib.rs:1749][E: codex-rs/exec/src/lib.rs:1750] | `codex-rs/exec/src/cli.rs:271` |

## 控制流

1. `codex exec` 的 `run_main()` 解构 CLI，解析 shared flags、loader overrides、cwd、config.toml 和 OSS provider/model 选择。[E: codex-rs/exec/src/lib.rs:217][E: codex-rs/exec/src/lib.rs:222][E: codex-rs/exec/src/lib.rs:237][E: codex-rs/exec/src/lib.rs:308][E: codex-rs/exec/src/lib.rs:309][E: codex-rs/exec/src/lib.rs:314][E: codex-rs/exec/src/lib.rs:355][E: codex-rs/exec/src/lib.rs:374]
2. exec 模式默认把 approval policy override 设成 `AskForApproval::Never`，使 headless mode 不弹交互审批；sandbox 来自 `--full-auto`、danger bypass 或 `--sandbox`。[E: codex-rs/exec/src/lib.rs:272][E: codex-rs/exec/src/lib.rs:274][E: codex-rs/exec/src/lib.rs:276][E: codex-rs/exec/src/lib.rs:386][E: codex-rs/exec/src/lib.rs:391]
3. `run_exec_session()` 根据 `--json` 选择 `EventProcessorWithJsonOutput` 或 `EventProcessorWithHumanOutput`。[E: codex-rs/exec/src/lib.rs:551][E: codex-rs/exec/src/lib.rs:552][E: codex-rs/exec/src/lib.rs:553]
4. root prompt 和 resume prompt 都变成 `InitialOperation::UserTurn`，review 变成 `InitialOperation::Review`。[E: codex-rs/exec/src/lib.rs:582][E: codex-rs/exec/src/lib.rs:587][E: codex-rs/exec/src/lib.rs:619][E: codex-rs/exec/src/lib.rs:612][E: codex-rs/exec/src/lib.rs:632]
5. exec 模式启动 in-process app-server client，然后用 `thread/start` 或 `thread/resume` 拿到 primary thread，再发送 `turn/start` 或 `review/start`。[E: codex-rs/exec/src/lib.rs:652][E: codex-rs/exec/src/lib.rs:663][E: codex-rs/exec/src/lib.rs:677][E: codex-rs/exec/src/lib.rs:692][E: codex-rs/exec/src/lib.rs:740][E: codex-rs/exec/src/lib.rs:771]
6. 事件循环同时监听 Ctrl+C 和 app-server events；Ctrl+C 会发送 `turn/interrupt`，server notification 通过 event processor 输出，server error 或 failed/interrupted turn 会导致 process exit code 1。[E: codex-rs/exec/src/lib.rs:805][E: codex-rs/exec/src/lib.rs:811][E: codex-rs/exec/src/lib.rs:828][E: codex-rs/exec/src/lib.rs:840][E: codex-rs/exec/src/lib.rs:852][E: codex-rs/exec/src/lib.rs:853][E: codex-rs/exec/src/lib.rs:856][E: codex-rs/exec/src/lib.rs:872][E: codex-rs/exec/src/lib.rs:900][E: codex-rs/exec/src/lib.rs:901][E: codex-rs/exec/src/lib.rs:902]

## Sources

- `codex-rs/exec/src/cli.rs`
- `codex-rs/exec/src/lib.rs`
- `docs/exec.md`

## 相关

- [CLI 子命令 catalog](subcommands.md) — 覆盖 `codex exec` 如何从 root dispatch 进入。
- [CLI 全局 flag](global-flags.md) — 覆盖 exec 继承的 shared flags。
- [Review mode](../../subsystems/core/review-mode.md) — 解释 review task 的 core 语义。
