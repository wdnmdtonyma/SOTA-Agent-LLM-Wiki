---
id: subsys.cloud.cloud-task-api
title: Cloud task API
kind: subsystem
tier: T2
source: [codex-rs/cloud-tasks-client/src/lib.rs, codex-rs/cloud-tasks-client/src/api.rs, codex-rs/cloud-tasks-client/src/http.rs, codex-rs/cloud-tasks/src/lib.rs]
symbols: [CloudBackend, cloud_tasks_client::HttpClient, TaskSummary, TaskText, TurnAttempt, ApplyOutcome, CreatedTask, TaskListPage, DiffSummary]
related: [subsys.cloud.cloud-tasks, subsys.platform.git-utils]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `cloud-tasks-client` 是 Cloud tasks 的 backend abstraction：`CloudBackend` trait 定义 list/status/diff/messages/text/sibling/preflight/apply/create 操作，`HttpClient` 包装 `codex_backend_client::Client` 并把这些 trait 方法映射到 backend API、details parsing 和 local git apply。[E: codex-rs/cloud-tasks-client/src/api.rs:136][E: codex-rs/cloud-tasks-client/src/api.rs:137][E: codex-rs/cloud-tasks-client/src/api.rs:143][E: codex-rs/cloud-tasks-client/src/api.rs:144][E: codex-rs/cloud-tasks-client/src/api.rs:146][E: codex-rs/cloud-tasks-client/src/api.rs:148][E: codex-rs/cloud-tasks-client/src/api.rs:150][E: codex-rs/cloud-tasks-client/src/api.rs:158][E: codex-rs/cloud-tasks-client/src/api.rs:163][E: codex-rs/cloud-tasks-client/src/api.rs:168][E: codex-rs/cloud-tasks-client/src/http.rs:25][E: codex-rs/cloud-tasks-client/src/http.rs:68][E: codex-rs/cloud-tasks-client/src/http.rs:126]

## 能回答的问题

- `CloudBackend` trait 暴露哪些 cloud task 操作？
- task、attempt、apply、diff 的 Rust 数据模型是什么？
- `HttpClient` 如何装配 user agent / auth provider / account id？
- create task 如何注入 starting diff 与 best_of_n metadata？
- apply/preflight 如何验证 unified diff 并复用 git-utils？

## 职责边界

cloud-task-api 节点覆盖 `cloud-tasks-client` crate 的 public trait、types 和 HTTP/local-apply implementation。`codex cloud` CLI/TUI 如何消费这些方法由 `subsys.cloud.cloud-tasks` 覆盖；底层 patch application 由 `subsys.platform.git-utils` 覆盖。[I]

## Public API types

`cloud-tasks-client/src/lib.rs` 只 re-export selected API types 与 `HttpClient`，其 `api` / `http` 模块本身保持私有。[E: codex-rs/cloud-tasks-client/src/lib.rs:1][E: codex-rs/cloud-tasks-client/src/lib.rs:3][E: codex-rs/cloud-tasks-client/src/lib.rs:6][E: codex-rs/cloud-tasks-client/src/lib.rs:15][E: codex-rs/cloud-tasks-client/src/lib.rs:16][E: codex-rs/cloud-tasks-client/src/lib.rs:17][E: codex-rs/cloud-tasks-client/src/lib.rs:19][E: codex-rs/cloud-tasks-client/src/lib.rs:20]

`TaskStatus` 覆盖 Pending、Ready、Applied、Error；`TaskSummary` 保存 id、title、status、updated_at、environment_id、environment_label、diff summary、is_review 和 attempt_total。[E: codex-rs/cloud-tasks-client/src/api.rs:27][E: codex-rs/cloud-tasks-client/src/api.rs:29][E: codex-rs/cloud-tasks-client/src/api.rs:30][E: codex-rs/cloud-tasks-client/src/api.rs:31][E: codex-rs/cloud-tasks-client/src/api.rs:32][E: codex-rs/cloud-tasks-client/src/api.rs:33][E: codex-rs/cloud-tasks-client/src/api.rs:37][E: codex-rs/cloud-tasks-client/src/api.rs:38][E: codex-rs/cloud-tasks-client/src/api.rs:40][E: codex-rs/cloud-tasks-client/src/api.rs:41][E: codex-rs/cloud-tasks-client/src/api.rs:43][E: codex-rs/cloud-tasks-client/src/api.rs:45][E: codex-rs/cloud-tasks-client/src/api.rs:46][E: codex-rs/cloud-tasks-client/src/api.rs:49][E: codex-rs/cloud-tasks-client/src/api.rs:52]

`AttemptStatus` 与 `TurnAttempt` 表达 sibling attempt 的状态、turn id、placement、created_at、diff 和 messages；`TaskText` 表达 prompt、messages、turn id、sibling turn ids、attempt placement/status。[E: codex-rs/cloud-tasks-client/src/api.rs:56][E: codex-rs/cloud-tasks-client/src/api.rs:57][E: codex-rs/cloud-tasks-client/src/api.rs:59][E: codex-rs/cloud-tasks-client/src/api.rs:61][E: codex-rs/cloud-tasks-client/src/api.rs:67][E: codex-rs/cloud-tasks-client/src/api.rs:68][E: codex-rs/cloud-tasks-client/src/api.rs:69][E: codex-rs/cloud-tasks-client/src/api.rs:70][E: codex-rs/cloud-tasks-client/src/api.rs:71][E: codex-rs/cloud-tasks-client/src/api.rs:72][E: codex-rs/cloud-tasks-client/src/api.rs:73][E: codex-rs/cloud-tasks-client/src/api.rs:114][E: codex-rs/cloud-tasks-client/src/api.rs:115][E: codex-rs/cloud-tasks-client/src/api.rs:116][E: codex-rs/cloud-tasks-client/src/api.rs:117][E: codex-rs/cloud-tasks-client/src/api.rs:118][E: codex-rs/cloud-tasks-client/src/api.rs:119][E: codex-rs/cloud-tasks-client/src/api.rs:120]

`ApplyOutcome` 包含 applied、status、message、skipped_paths、conflict_paths；`CreatedTask` 只保存新 task id；`TaskListPage` 保存 tasks 和 cursor。[E: codex-rs/cloud-tasks-client/src/api.rs:78][E: codex-rs/cloud-tasks-client/src/api.rs:85][E: codex-rs/cloud-tasks-client/src/api.rs:86][E: codex-rs/cloud-tasks-client/src/api.rs:87][E: codex-rs/cloud-tasks-client/src/api.rs:88][E: codex-rs/cloud-tasks-client/src/api.rs:90][E: codex-rs/cloud-tasks-client/src/api.rs:92][E: codex-rs/cloud-tasks-client/src/api.rs:96][E: codex-rs/cloud-tasks-client/src/api.rs:97][E: codex-rs/cloud-tasks-client/src/api.rs:101][E: codex-rs/cloud-tasks-client/src/api.rs:102][E: codex-rs/cloud-tasks-client/src/api.rs:103]

## CloudBackend trait 与 HttpClient

`CloudBackend` trait 的完整 surface 是 list_tasks、get_task_summary、get_task_diff、get_task_messages、get_task_text、list_sibling_attempts、apply_task_preflight、apply_task、create_task。[E: codex-rs/cloud-tasks-client/src/api.rs:136][E: codex-rs/cloud-tasks-client/src/api.rs:137][E: codex-rs/cloud-tasks-client/src/api.rs:143][E: codex-rs/cloud-tasks-client/src/api.rs:144][E: codex-rs/cloud-tasks-client/src/api.rs:146][E: codex-rs/cloud-tasks-client/src/api.rs:148][E: codex-rs/cloud-tasks-client/src/api.rs:150][E: codex-rs/cloud-tasks-client/src/api.rs:158][E: codex-rs/cloud-tasks-client/src/api.rs:163][E: codex-rs/cloud-tasks-client/src/api.rs:168]

`HttpClient` 保存 base_url 和 backend client；constructor 调用 `backend::Client::new`，并提供 `with_user_agent`、`with_auth_provider`、`with_chatgpt_account_id` 链式设置。[E: codex-rs/cloud-tasks-client/src/http.rs:25][E: codex-rs/cloud-tasks-client/src/http.rs:26][E: codex-rs/cloud-tasks-client/src/http.rs:27][E: codex-rs/cloud-tasks-client/src/http.rs:31][E: codex-rs/cloud-tasks-client/src/http.rs:36][E: codex-rs/cloud-tasks-client/src/http.rs:40][E: codex-rs/cloud-tasks-client/src/http.rs:45][E: codex-rs/cloud-tasks-client/src/http.rs:50] trait impl 只是把 public trait 方法转发到 `tasks_api()`、`attempts_api()` 和 `apply_api()`。[E: codex-rs/cloud-tasks-client/src/http.rs:68][E: codex-rs/cloud-tasks-client/src/http.rs:75][E: codex-rs/cloud-tasks-client/src/http.rs:79][E: codex-rs/cloud-tasks-client/src/http.rs:83][E: codex-rs/cloud-tasks-client/src/http.rs:91][E: codex-rs/cloud-tasks-client/src/http.rs:99][E: codex-rs/cloud-tasks-client/src/http.rs:108][E: codex-rs/cloud-tasks-client/src/http.rs:120][E: codex-rs/cloud-tasks-client/src/http.rs:135]

## HTTP mapping

`Tasks::list` 调用 backend `list_tasks(limit, Some("current"), env, cursor)`，把返回 items 映射成 `TaskSummary`，并保留 response cursor。[E: codex-rs/cloud-tasks-client/src/http.rs:161][E: codex-rs/cloud-tasks-client/src/http.rs:167][E: codex-rs/cloud-tasks-client/src/http.rs:170][E: codex-rs/cloud-tasks-client/src/http.rs:174][E: codex-rs/cloud-tasks-client/src/http.rs:177][E: codex-rs/cloud-tasks-client/src/http.rs:190][E: codex-rs/cloud-tasks-client/src/http.rs:192]

`Tasks::summary` 读取 task details body，解析 task metadata、status display、diff summary、environment、attempt_total 和 is_review；当 status display 没给 diff summary 时会 fallback 到 unified diff 统计。[E: codex-rs/cloud-tasks-client/src/http.rs:196][E: codex-rs/cloud-tasks-client/src/http.rs:198][E: codex-rs/cloud-tasks-client/src/http.rs:208][E: codex-rs/cloud-tasks-client/src/http.rs:214][E: codex-rs/cloud-tasks-client/src/http.rs:223][E: codex-rs/cloud-tasks-client/src/http.rs:224][E: codex-rs/cloud-tasks-client/src/http.rs:228][E: codex-rs/cloud-tasks-client/src/http.rs:230][E: codex-rs/cloud-tasks-client/src/http.rs:237][E: codex-rs/cloud-tasks-client/src/http.rs:241][E: codex-rs/cloud-tasks-client/src/http.rs:242][E: codex-rs/cloud-tasks-client/src/http.rs:248][E: codex-rs/cloud-tasks-client/src/http.rs:260]

create task request 写入 message input item、environment_id、branch、qa mode；`CODEX_STARTING_DIFF` 非空时追加 `pre_apply_patch` input item，`best_of_n > 1` 时写入 `metadata.best_of_n`。[E: codex-rs/cloud-tasks-client/src/http.rs:332][E: codex-rs/cloud-tasks-client/src/http.rs:340][E: codex-rs/cloud-tasks-client/src/http.rs:347][E: codex-rs/cloud-tasks-client/src/http.rs:350][E: codex-rs/cloud-tasks-client/src/http.rs:356][E: codex-rs/cloud-tasks-client/src/http.rs:358][E: codex-rs/cloud-tasks-client/src/http.rs:359][E: codex-rs/cloud-tasks-client/src/http.rs:360][E: codex-rs/cloud-tasks-client/src/http.rs:365][E: codex-rs/cloud-tasks-client/src/http.rs:370][E: codex-rs/cloud-tasks-client/src/http.rs:374][E: codex-rs/cloud-tasks-client/src/http.rs:381]

## Apply / preflight

`apply_task` 与 `apply_task_preflight` 都调用 `Apply::run`，区别是 `preflight` bool。[E: codex-rs/cloud-tasks-client/src/http.rs:102][E: codex-rs/cloud-tasks-client/src/http.rs:108][E: codex-rs/cloud-tasks-client/src/http.rs:109][E: codex-rs/cloud-tasks-client/src/http.rs:114][E: codex-rs/cloud-tasks-client/src/http.rs:120][E: codex-rs/cloud-tasks-client/src/http.rs:121] `Apply::run` 优先使用 diff override，否则 fetch task details 的 unified diff；非 unified diff 会直接返回 Error outcome。[E: codex-rs/cloud-tasks-client/src/http.rs:443][E: codex-rs/cloud-tasks-client/src/http.rs:450][E: codex-rs/cloud-tasks-client/src/http.rs:453][E: codex-rs/cloud-tasks-client/src/http.rs:456][E: codex-rs/cloud-tasks-client/src/http.rs:462][E: codex-rs/cloud-tasks-client/src/http.rs:468][E: codex-rs/cloud-tasks-client/src/http.rs:470][E: codex-rs/cloud-tasks-client/src/http.rs:471]

通过 format check 后，`Apply::run` 构造 `ApplyGitRequest` 并调用 `apply_git_patch()`；exit code 与 applied/conflict paths 决定 Success/Partial/Error，preflight success 不设置 `applied=true`。[E: codex-rs/cloud-tasks-client/src/http.rs:478][E: codex-rs/cloud-tasks-client/src/http.rs:479][E: codex-rs/cloud-tasks-client/src/http.rs:480][E: codex-rs/cloud-tasks-client/src/http.rs:482][E: codex-rs/cloud-tasks-client/src/http.rs:484][E: codex-rs/cloud-tasks-client/src/http.rs:487][E: codex-rs/cloud-tasks-client/src/http.rs:489][E: codex-rs/cloud-tasks-client/src/http.rs:494] 返回 outcome 会携带 message、skipped_paths 和 conflict_paths。[E: codex-rs/cloud-tasks-client/src/http.rs:567][E: codex-rs/cloud-tasks-client/src/http.rs:568][E: codex-rs/cloud-tasks-client/src/http.rs:569][E: codex-rs/cloud-tasks-client/src/http.rs:570][E: codex-rs/cloud-tasks-client/src/http.rs:571][E: codex-rs/cloud-tasks-client/src/http.rs:572]

## 设计动机与权衡

`CloudBackend` trait 把 CLI/TUI 与 backend implementation 分离，使 production HTTP client、mock client 和 tests 可以共享操作语义。[I] 该结论由 trait object 持有 backend、mock mode 和 trait impl 共同支撑。[E: codex-rs/cloud-tasks/src/lib.rs:42][E: codex-rs/cloud-tasks/src/lib.rs:60][E: codex-rs/cloud-tasks-client/src/api.rs:136][E: codex-rs/cloud-tasks-client/src/http.rs:68]

## Gotchas

- `CloudTaskError` 当前只有 Unimplemented、Http、Io 和 Msg；不要假设有 unauthorized/not-found 专用 variant。[E: codex-rs/cloud-tasks-client/src/api.rs:12][E: codex-rs/cloud-tasks-client/src/api.rs:13][E: codex-rs/cloud-tasks-client/src/api.rs:15][E: codex-rs/cloud-tasks-client/src/api.rs:17][E: codex-rs/cloud-tasks-client/src/api.rs:20]
- create task 的 starting diff 来自 `CODEX_STARTING_DIFF` 环境变量。[E: codex-rs/cloud-tasks-client/src/http.rs:347]
- apply/preflight 都要求 unified diff；不符合时不会调用 git apply。[E: codex-rs/cloud-tasks-client/src/http.rs:462][E: codex-rs/cloud-tasks-client/src/http.rs:468]

## Sources

- `codex-rs/cloud-tasks-client/src/lib.rs`
- `codex-rs/cloud-tasks-client/src/api.rs`
- `codex-rs/cloud-tasks-client/src/http.rs`
- `codex-rs/cloud-tasks/src/lib.rs`

## 相关

- `subsys.cloud.cloud-tasks`: CLI/TUI 如何消费 `CloudBackend`。
- `subsys.platform.git-utils`: apply/preflight 使用的 local patch engine。
