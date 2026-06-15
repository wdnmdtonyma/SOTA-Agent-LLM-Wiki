---
id: subsys.cloud.cloud-tasks
title: Cloud tasks
kind: subsystem
tier: T2
source: [codex-rs/cloud-tasks/src/lib.rs, codex-rs/cloud-tasks/src/cli.rs, codex-rs/cloud-tasks/src/app.rs, codex-rs/cloud-tasks/src/new_task.rs, codex-rs/cloud-tasks/src/env_detect.rs, codex-rs/cloud-tasks/src/util.rs]
symbols: [Command, run_main, init_backend, run_exec_command, resolve_environment_id, parse_task_id, App, NewTaskPage, autodetect_environment_id]
related: [subsys.cloud.cloud-task-api, subsys.cloud.cloud-requirements, subsys.platform.git-utils]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex cloud` 的 Cloud tasks 子系统是 CLI/TUI 入口层：它解析 exec/status/list/apply/diff 命令，初始化 cloud backend auth/header，自动选择 cloud environment，并把创建、查看、diff、apply 操作委托给 `cloud-tasks-client` 的 `CloudBackend` trait。[E: codex-rs/cloud-tasks/src/cli.rs:16][E: codex-rs/cloud-tasks/src/cli.rs:18][E: codex-rs/cloud-tasks/src/cli.rs:26][E: codex-rs/cloud-tasks/src/lib.rs:43][E: codex-rs/cloud-tasks/src/lib.rs:174][E: codex-rs/cloud-tasks/src/lib.rs:736]

## 能回答的问题

- `codex cloud` 支持哪些子命令与参数？
- cloud task backend 初始化时怎样设置 base URL、user agent、auth token 和 account header？
- `exec` 怎样创建 cloud task 并打印 ChatGPT URL？
- environment autodetect 怎样根据 git remotes、global env list 和 desired label 选择环境？
- apply/diff 怎样选择 attempt 并调用 backend？
- Cloud tasks TUI 的 state model 包含哪些 screen/modal/overlay？

## 职责边界

cloud-tasks 节点覆盖 CLI/TUI orchestration，不定义 HTTP API wire schema。HTTP API、task summary/diff/apply/create 请求由 `subsys.cloud.cloud-task-api` 解释。cloud requirements 的拉取和缓存由 `subsys.cloud.cloud-requirements` 覆盖。

## CLI 数据模型

`Command` 枚举包含 `Exec`、`Status`、`List`、`Apply`、`Diff` 五类命令。[E: codex-rs/cloud-tasks/src/cli.rs:16][E: codex-rs/cloud-tasks/src/cli.rs:18][E: codex-rs/cloud-tasks/src/cli.rs:26] `Exec` 接收 query、environment、attempts 和 branch；attempts 的 value parser 限制在 1..4。[E: codex-rs/cloud-tasks/src/cli.rs:30][E: codex-rs/cloud-tasks/src/cli.rs:33][E: codex-rs/cloud-tasks/src/cli.rs:45][E: codex-rs/cloud-tasks/src/cli.rs:49][E: codex-rs/cloud-tasks/src/cli.rs:52][E: codex-rs/cloud-tasks/src/cli.rs:57] `List` 的 limit parser 限制在 1..20，并支持 environment、limit、cursor 和 json 参数。[E: codex-rs/cloud-tasks/src/cli.rs:63][E: codex-rs/cloud-tasks/src/cli.rs:67][E: codex-rs/cloud-tasks/src/cli.rs:82][E: codex-rs/cloud-tasks/src/cli.rs:85][E: codex-rs/cloud-tasks/src/cli.rs:89][E: codex-rs/cloud-tasks/src/cli.rs:93][E: codex-rs/cloud-tasks/src/cli.rs:97]

`run_main` 是命令分发入口，会按 enum variant 调用 exec/status/list/apply/diff 的具体 handler。[E: codex-rs/cloud-tasks/src/lib.rs:736][E: codex-rs/cloud-tasks/src/lib.rs:745]

## Backend 初始化与 auth

`init_backend` 在 debug build 中可用 `CODEX_CLOUD_TASKS_MODE=mock` 启用 mock client；默认 base URL 是 `https://chatgpt.com/backend-api`。[E: codex-rs/cloud-tasks/src/lib.rs:43][E: codex-rs/cloud-tasks/src/lib.rs:45][E: codex-rs/cloud-tasks/src/lib.rs:47][E: codex-rs/cloud-tasks/src/lib.rs:49][E: codex-rs/cloud-tasks/src/lib.rs:57] backend 初始化会设置 user agent，按 base URL path style 记录 ChatGPT backend path，并加载 auth manager。[E: codex-rs/cloud-tasks/src/lib.rs:52][E: codex-rs/cloud-tasks/src/lib.rs:64][E: codex-rs/cloud-tasks/src/lib.rs:69][E: codex-rs/cloud-tasks/src/lib.rs:71]

`init_backend` 要求能取得非空 ChatGPT token；account id 可选，存在时用于 `ChatGPT-Account-Id` header。[E: codex-rs/cloud-tasks/src/lib.rs:90][E: codex-rs/cloud-tasks/src/lib.rs:97][E: codex-rs/cloud-tasks/src/lib.rs:100][E: codex-rs/cloud-tasks/src/lib.rs:106] `build_chatgpt_headers` 会写入 User-Agent，并在 stored auth/token/account id 可用时写入 Authorization Bearer 和 ChatGPT-Account-Id。[E: codex-rs/cloud-tasks/src/util.rs:73][E: codex-rs/cloud-tasks/src/util.rs:75][E: codex-rs/cloud-tasks/src/util.rs:84][E: codex-rs/cloud-tasks/src/util.rs:95][E: codex-rs/cloud-tasks/src/util.rs:103]

## Exec / status / list / diff / apply 控制流

1. `run_exec_command` 解析 query、environment、git ref 和 attempts，再调用 backend 创建 task，最后打印 task URL。[E: codex-rs/cloud-tasks/src/lib.rs:163][E: codex-rs/cloud-tasks/src/lib.rs:172][E: codex-rs/cloud-tasks/src/lib.rs:174][E: codex-rs/cloud-tasks/src/lib.rs:184]
2. `resolve_query_input` 对非 `-` 的 CLI query 参数原样接受；没有 CLI 参数或参数为 `-` 时从 stdin 读取，空 stdin 会报错。[E: codex-rs/cloud-tasks/src/lib.rs:233][E: codex-rs/cloud-tasks/src/lib.rs:235][E: codex-rs/cloud-tasks/src/lib.rs:244][E: codex-rs/cloud-tasks/src/lib.rs:255]
3. `parse_task_id` 支持 plain id，也支持先剥离 URL fragment/query 后从 URL path 最后一段取 task id。[E: codex-rs/cloud-tasks/src/lib.rs:260][E: codex-rs/cloud-tasks/src/lib.rs:265][E: codex-rs/cloud-tasks/src/lib.rs:270][E: codex-rs/cloud-tasks/src/lib.rs:278]
4. attempt diff collection 会读取 base/current task attempt 和 sibling attempts，并按 placement/created_at 排序。[E: codex-rs/cloud-tasks/src/lib.rs:302][E: codex-rs/cloud-tasks/src/lib.rs:309][E: codex-rs/cloud-tasks/src/lib.rs:318][E: codex-rs/cloud-tasks/src/lib.rs:335]
5. `select_attempt` 根据显式 attempt number 或默认第 1 个 attempt 选择后续 apply/diff 目标。[E: codex-rs/cloud-tasks/src/lib.rs:345][E: codex-rs/cloud-tasks/src/lib.rs:352][E: codex-rs/cloud-tasks/src/lib.rs:362]
6. status/list/diff/apply command handlers 都在 `lib.rs` 中实现，命令区间集中在 499..610 行。[E: codex-rs/cloud-tasks/src/lib.rs:499][E: codex-rs/cloud-tasks/src/lib.rs:610]

## Git 与 environment autodetect

`resolve_git_ref_with_git_info` 优先使用 branch override，其次读取当前 branch，最后 fallback 到 default/main 分支。[E: codex-rs/cloud-tasks/src/lib.rs:139][E: codex-rs/cloud-tasks/src/lib.rs:143][E: codex-rs/cloud-tasks/src/lib.rs:151][E: codex-rs/cloud-tasks/src/lib.rs:153][E: codex-rs/cloud-tasks/src/lib.rs:156] `autodetect_environment_id` 先通过 git origins 查询 repo-bound environments；如果无法从 repo-bound candidates 选出环境，再 fallback 到 full environment list。[E: codex-rs/cloud-tasks/src/env_detect.rs:25][E: codex-rs/cloud-tasks/src/env_detect.rs:31][E: codex-rs/cloud-tasks/src/env_detect.rs:62][E: codex-rs/cloud-tasks/src/env_detect.rs:69][E: codex-rs/cloud-tasks/src/env_detect.rs:101]

`pick_environment_row` 的优先级是 desired label、single candidate、pinned、task_count/first。[E: codex-rs/cloud-tasks/src/env_detect.rs:110][E: codex-rs/cloud-tasks/src/env_detect.rs:117][E: codex-rs/cloud-tasks/src/env_detect.rs:127][E: codex-rs/cloud-tasks/src/env_detect.rs:131][E: codex-rs/cloud-tasks/src/env_detect.rs:136] `parse_owner_repo` 支持 SSH 和 HTTPS remote URL 形态。[E: codex-rs/cloud-tasks/src/env_detect.rs:218][E: codex-rs/cloud-tasks/src/env_detect.rs:226][E: codex-rs/cloud-tasks/src/env_detect.rs:236]

## TUI state model

`App` 保存 task list、selected index、new task page、diff overlay、apply modal、status message、environments 和 active filters 等 state。[E: codex-rs/cloud-tasks/src/app.rs:47][E: codex-rs/cloud-tasks/src/app.rs:48][E: codex-rs/cloud-tasks/src/app.rs:65][E: codex-rs/cloud-tasks/src/app.rs:75] free function `load_tasks` 使用 5 秒 timeout，请求 limit 20 的任务列表，并隐藏 review-only tasks。[E: codex-rs/cloud-tasks/src/app.rs:121][E: codex-rs/cloud-tasks/src/app.rs:127][E: codex-rs/cloud-tasks/src/app.rs:128][E: codex-rs/cloud-tasks/src/app.rs:132]

`NewTaskPage` 保存 composer、submitting、env_id 和 best_of_n；composer hints 单独定义，用于 TUI 输入提示。[E: codex-rs/cloud-tasks/src/new_task.rs:3][E: codex-rs/cloud-tasks/src/new_task.rs:4][E: codex-rs/cloud-tasks/src/new_task.rs:7][E: codex-rs/cloud-tasks/src/new_task.rs:13] `AppEvent` 覆盖后台异步任务结果，包括任务加载、环境 autodetect/list、details diff/messages、创建任务和 apply 结果。[E: codex-rs/cloud-tasks/src/app.rs:297][E: codex-rs/cloud-tasks/src/app.rs:301][E: codex-rs/cloud-tasks/src/app.rs:307][E: codex-rs/cloud-tasks/src/app.rs:315][E: codex-rs/cloud-tasks/src/app.rs:335][E: codex-rs/cloud-tasks/src/app.rs:337][E: codex-rs/cloud-tasks/src/app.rs:346]

## 设计动机与权衡

`autodetect_environment_id` 把 git origins 的 repo-bound environment lookup 放在本地侧执行，避免调用方必须手动传入 owner/repo tuple。[I] 该行为由函数读取 git origins 并查询 repo-bound environments 共同体现。[E: codex-rs/cloud-tasks/src/env_detect.rs:25][E: codex-rs/cloud-tasks/src/env_detect.rs:31][E: codex-rs/cloud-tasks/src/env_detect.rs:35][E: codex-rs/cloud-tasks/src/env_detect.rs:48]

`init_backend` 默认指向 ChatGPT backend API 而非 OpenAI public API，说明 cloud tasks 当前绑定 ChatGPT account auth。[I] 该结论由默认 base URL 和 optional ChatGPT-Account-Id header 共同支撑。[E: codex-rs/cloud-tasks/src/lib.rs:49][E: codex-rs/cloud-tasks/src/util.rs:100]

## Gotchas

- `resolve_environment_id` 会把用户输入同时匹配 environment id 和 label；label 匹配多个不同 environment id 时会返回 ambiguity error。[E: codex-rs/cloud-tasks/src/lib.rs:188][E: codex-rs/cloud-tasks/src/lib.rs:202][E: codex-rs/cloud-tasks/src/lib.rs:206][E: codex-rs/cloud-tasks/src/lib.rs:220][E: codex-rs/cloud-tasks/src/lib.rs:225]
- `load_auth_manager` 会禁用 env auth loading，cloud tasks 期望使用 stored ChatGPT auth 而不是 `OPENAI_API_KEY`。[E: codex-rs/cloud-tasks/src/util.rs:62][E: codex-rs/cloud-tasks/src/util.rs:67]
- task URL 由 base URL 和 task id 生成；不同 backend base path 需要通过 `normalize_base_url` 处理。[E: codex-rs/cloud-tasks/src/util.rs:109][E: codex-rs/cloud-tasks/src/util.rs:110][E: codex-rs/cloud-tasks/src/util.rs:112][E: codex-rs/cloud-tasks/src/util.rs:121]

## Sources

- `codex-rs/cloud-tasks/src/lib.rs`
- `codex-rs/cloud-tasks/src/cli.rs`
- `codex-rs/cloud-tasks/src/app.rs`
- `codex-rs/cloud-tasks/src/new_task.rs`
- `codex-rs/cloud-tasks/src/env_detect.rs`
- `codex-rs/cloud-tasks/src/util.rs`

## 相关

- `subsys.cloud.cloud-task-api`: Cloud tasks backend HTTP API trait 与 client。
- `subsys.cloud.cloud-requirements`: cloud requirements 拉取、缓存和 auth gating。
- `subsys.platform.git-utils`: local git metadata 和 diff/apply 支撑。
