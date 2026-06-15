---
id: subsys.cloud.cloud-task-api
title: Cloud task API
kind: subsystem
tier: T2
source: [codex-rs/cloud-tasks-client/src/lib.rs, codex-rs/cloud-tasks-client/src/api.rs, codex-rs/cloud-tasks-client/src/http.rs, codex-rs/cloud-tasks/src/lib.rs]
symbols: [CloudBackend, HttpClient, TaskSummary, TurnAttempt, ApplyOutcome, CreatedTask, TaskListPage, DiffSummary]
related: [subsys.cloud.cloud-tasks, subsys.platform.git-utils]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `cloud-tasks-client` 是 Cloud tasks 的 backend abstraction：`CloudBackend` trait 定义 list/status/diff/messages/text/sibling/preflight/apply/create 操作，`HttpClient` 包装 `codex_backend_client::Client` 并通过 HTTP helper 实现这些操作。[E: codex-rs/cloud-tasks-client/src/api.rs:134][E: codex-rs/cloud-tasks-client/src/api.rs:169][E: codex-rs/cloud-tasks-client/src/http.rs:17][E: codex-rs/cloud-tasks-client/src/http.rs:23][E: codex-rs/cloud-tasks-client/src/http.rs:63][E: codex-rs/cloud-tasks-client/src/http.rs:71]

## 能回答的问题

- Cloud task API 的 Rust trait 有哪些方法？
- task、attempt、apply、diff 的数据模型是什么？
- HTTP client 怎样构造 list/status/diff/create/apply 请求？
- create task 怎样注入 starting diff 和 best_of_n metadata？
- apply run 怎样验证 unified diff 并执行 local apply？

## 职责边界

cloud-task-api 节点覆盖 `cloud-tasks-client` crate 的 public trait、types 和 HTTP implementation。CLI/TUI 命令如何调用这些方法由 `subsys.cloud.cloud-tasks` 解释；git patch application 的底层 apply engine 由 `subsys.platform.git-utils` 解释。

## Public API types

`cloud-tasks-client/src/lib.rs` 让 `api` 与 `http` 模块保持私有，并 re-export selected API types 与 `HttpClient` 给上层使用。[E: codex-rs/cloud-tasks-client/src/lib.rs:1][E: codex-rs/cloud-tasks-client/src/lib.rs:3][E: codex-rs/cloud-tasks-client/src/lib.rs:16][E: codex-rs/cloud-tasks-client/src/lib.rs:18][E: codex-rs/cloud-tasks-client/src/lib.rs:19]

`TaskStatus` 覆盖 Pending、Ready、Applied、Error；`TaskSummary` 保存 id、title、status、updated_at、environment_id、environment_label、diff summary、is_review 和 attempt_total。[E: codex-rs/cloud-tasks-client/src/api.rs:24][E: codex-rs/cloud-tasks-client/src/api.rs:26][E: codex-rs/cloud-tasks-client/src/api.rs:30][E: codex-rs/cloud-tasks-client/src/api.rs:33][E: codex-rs/cloud-tasks-client/src/api.rs:35][E: codex-rs/cloud-tasks-client/src/api.rs:49] `AttemptStatus` 与 `TurnAttempt` 表达单次 attempt 的 status、turn_id、attempt_placement、created_at、diff 和 messages。[E: codex-rs/cloud-tasks-client/src/api.rs:52][E: codex-rs/cloud-tasks-client/src/api.rs:60][E: codex-rs/cloud-tasks-client/src/api.rs:63][E: codex-rs/cloud-tasks-client/src/api.rs:65][E: codex-rs/cloud-tasks-client/src/api.rs:70]

`ApplyStatus`、`ApplyOutcome` 表达 apply job 的 status、applied bool、message、skipped_paths 和 conflict_paths；`CreatedTask` 只包含新 task id。[E: codex-rs/cloud-tasks-client/src/api.rs:73][E: codex-rs/cloud-tasks-client/src/api.rs:81][E: codex-rs/cloud-tasks-client/src/api.rs:83][E: codex-rs/cloud-tasks-client/src/api.rs:89][E: codex-rs/cloud-tasks-client/src/api.rs:92][E: codex-rs/cloud-tasks-client/src/api.rs:94]

## CloudBackend trait

`CloudBackend` trait 定义 task list、status、diff、messages、text、sibling attempts、apply preflight、apply run 和 create task。[E: codex-rs/cloud-tasks-client/src/api.rs:134][E: codex-rs/cloud-tasks-client/src/api.rs:140][E: codex-rs/cloud-tasks-client/src/api.rs:146][E: codex-rs/cloud-tasks-client/src/api.rs:152][E: codex-rs/cloud-tasks-client/src/api.rs:160][E: codex-rs/cloud-tasks-client/src/api.rs:169] 该 trait 让 CLI/TUI 不依赖 HTTP 细节，也允许 tests/mock backend 实现相同接口。[I]

`TaskText` 携带 prompt、assistant messages、turn/sibling metadata、attempt placement 和 attempt status，便于 TUI 同时展示 prompt/messages 并关联 sibling attempts。[E: codex-rs/cloud-tasks-client/src/api.rs:110][E: codex-rs/cloud-tasks-client/src/api.rs:112][E: codex-rs/cloud-tasks-client/src/api.rs:118]

## HTTP client implementation

`HttpClient` 保存 base_url 和 `codex_backend_client::Client`；constructor 支持设置 bearer token、user agent 和 account id。[E: codex-rs/cloud-tasks-client/src/http.rs:23][E: codex-rs/cloud-tasks-client/src/http.rs:25][E: codex-rs/cloud-tasks-client/src/http.rs:29][E: codex-rs/cloud-tasks-client/src/http.rs:35][E: codex-rs/cloud-tasks-client/src/http.rs:45] trait impl 把 `CloudBackend` 方法映射到 HTTP helper，核心 impl 从 63 行开始。[E: codex-rs/cloud-tasks-client/src/http.rs:63][E: codex-rs/cloud-tasks-client/src/http.rs:71][E: codex-rs/cloud-tasks-client/src/http.rs:126]

`Tasks::list` 调用 backend list endpoint，并解析 current page 的 task summaries。[E: codex-rs/cloud-tasks-client/src/http.rs:147][E: codex-rs/cloud-tasks-client/src/http.rs:156][E: codex-rs/cloud-tasks-client/src/http.rs:176][E: codex-rs/cloud-tasks-client/src/http.rs:179] summary parser 从 backend details 中提取 status、diff summary、environment、is_review 和 attempt_total。[E: codex-rs/cloud-tasks-client/src/http.rs:182][E: codex-rs/cloud-tasks-client/src/http.rs:209][E: codex-rs/cloud-tasks-client/src/http.rs:210][E: codex-rs/cloud-tasks-client/src/http.rs:223][E: codex-rs/cloud-tasks-client/src/http.rs:228][E: codex-rs/cloud-tasks-client/src/http.rs:234][E: codex-rs/cloud-tasks-client/src/http.rs:247]

diff/messages/text methods 在 251..316 行集中处理；attempt siblings 在 390..415 行处理。[E: codex-rs/cloud-tasks-client/src/http.rs:251][E: codex-rs/cloud-tasks-client/src/http.rs:316][E: codex-rs/cloud-tasks-client/src/http.rs:390]

## Create 与 apply

create task request 包含 message、environment、git ref 和 qa mode；如果本地环境变量 `CODEX_STARTING_DIFF` 存在且非空，create flow 会附带 starting diff；当 `best_of_n > 1` 时 request body 会增加 `metadata.best_of_n`。[E: codex-rs/cloud-tasks-client/src/http.rs:333][E: codex-rs/cloud-tasks-client/src/http.rs:339][E: codex-rs/cloud-tasks-client/src/http.rs:342][E: codex-rs/cloud-tasks-client/src/http.rs:348][E: codex-rs/cloud-tasks-client/src/http.rs:351][E: codex-rs/cloud-tasks-client/src/http.rs:356] 这让本地 CLI 可把未提交 diff 作为 cloud task 初始上下文传给 backend。[I]

apply run 可以接收 explicit diff override，否则会先 fetch diff；然后验证 unified diff，再构造 `ApplyGitRequest` 并调用 `apply_git_patch()`，返回 applied/status/message/skipped_paths/conflict_paths。[E: codex-rs/cloud-tasks-client/src/http.rs:429][E: codex-rs/cloud-tasks-client/src/http.rs:436][E: codex-rs/cloud-tasks-client/src/http.rs:448][E: codex-rs/cloud-tasks-client/src/http.rs:464][E: codex-rs/cloud-tasks-client/src/http.rs:470][E: codex-rs/cloud-tasks-client/src/http.rs:553][E: codex-rs/cloud-tasks-client/src/http.rs:559] apply 依赖 `codex_git_utils::ApplyGitRequest` 和 `apply_git_patch()`，而不是在 HTTP client 中手写 patch apply。[E: codex-rs/cloud-tasks-client/src/http.rs:19][E: codex-rs/cloud-tasks-client/src/http.rs:20][I]

## 设计动机与权衡

`CloudBackend` trait 把 CLI/TUI 与 HTTP transport 分离，使 mock backend 和 production HTTP client 共享 task 操作语义。[I] 该设计由 `CloudBackend` trait、`HttpClient` trait impl 和 cloud-tasks 的 `BackendContext` 使用 trait object 持有 `CloudBackend` 体现。[E: codex-rs/cloud-tasks-client/src/api.rs:134][E: codex-rs/cloud-tasks-client/src/http.rs:63][E: codex-rs/cloud-tasks/src/lib.rs:38]

HTTP client 将 backend client 与 details path helper 内聚在 client 内，说明上层命令不需要知道 ChatGPT backend 的具体 endpoint layout。[I] 该结论由 `HttpClient` 的 backend field 与 `details_path` helper 支撑。[E: codex-rs/cloud-tasks-client/src/http.rs:25][E: codex-rs/cloud-tasks-client/src/http.rs:563][E: codex-rs/cloud-tasks-client/src/http.rs:571]

## Gotchas

- `CloudTaskError` 当前 variants 是 Unimplemented、Http、Io 和 Msg；不要假设有 unauthorized/not-found 专用 variant。[E: codex-rs/cloud-tasks-client/src/api.rs:8][E: codex-rs/cloud-tasks-client/src/api.rs:11][E: codex-rs/cloud-tasks-client/src/api.rs:17]
- create task 的 starting diff 来自环境变量 `CODEX_STARTING_DIFF`。[E: codex-rs/cloud-tasks-client/src/http.rs:333]
- apply run 会先验证 unified diff；不是所有 backend diff 字符串都会直接交给 git apply。[E: codex-rs/cloud-tasks-client/src/http.rs:448]

## Sources

- `codex-rs/cloud-tasks-client/src/lib.rs`
- `codex-rs/cloud-tasks-client/src/api.rs`
- `codex-rs/cloud-tasks-client/src/http.rs`
- `codex-rs/cloud-tasks/src/lib.rs`

## 相关

- `subsys.cloud.cloud-tasks`: CLI/TUI 如何消费 `CloudBackend`。
- `subsys.platform.git-utils`: apply run 使用的 git patch application。
