---
id: subsys.cloud.cloud-tasks
title: Cloud tasks
kind: subsystem
tier: T2
source: [codex-rs/cloud-tasks/src/lib.rs, codex-rs/cloud-tasks/src/cli.rs, codex-rs/cloud-tasks/src/app.rs, codex-rs/cloud-tasks/src/new_task.rs, codex-rs/cloud-tasks/src/env_detect.rs, codex-rs/cloud-tasks/src/util.rs]
symbols: [Command, cloud_tasks::run_main, init_backend, run_exec_command, resolve_environment_id, parse_task_id, cloud_tasks::App, NewTaskPage, autodetect_environment_id, ApplyJob]
related: [subsys.cloud.cloud-task-api, subsys.cloud.cloud-config, subsys.platform.git-utils]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `codex cloud` 的 Cloud tasks 子系统是 CLI/TUI orchestration 层：它解析 exec/status/list/apply/diff 命令，初始化 ChatGPT-backed cloud backend，选择 environment，提交 task，并把 list/status/diff/apply/create 操作委托给 `cloud-tasks-client` 的 `CloudBackend` trait。[E: codex-rs/cloud-tasks/src/cli.rs:16][E: codex-rs/cloud-tasks/src/cli.rs:18][E: codex-rs/cloud-tasks/src/cli.rs:26][E: codex-rs/cloud-tasks/src/lib.rs:42][E: codex-rs/cloud-tasks/src/lib.rs:48][E: codex-rs/cloud-tasks/src/lib.rs:188][E: codex-rs/cloud-tasks/src/lib.rs:752]

## 能回答的问题

- `codex cloud` 支持哪些子命令与参数？
- backend 初始化时如何处理 base URL、user agent 和 auth provider？
- exec/status/list/diff/apply 分别调用哪些 backend 方法？
- environment autodetect 如何从 git remotes 与 environment list 选择候选？
- TUI `App` state 和后台 `AppEvent` 包含哪些状态面？

## 职责边界

cloud-tasks 节点覆盖 CLI/TUI orchestration，不定义 HTTP wire schema。HTTP client、task summary、attempt、apply 和 create request 由 `subsys.cloud.cloud-task-api` 覆盖；远端 enterprise config bundle 的传输/缓存/刷新由 `subsys.cloud.cloud-config` 覆盖。[I]

## CLI 数据模型

`Command` 枚举包含 `Exec`、`Status`、`List`、`Apply`、`Diff` 五类命令。[E: codex-rs/cloud-tasks/src/cli.rs:16][E: codex-rs/cloud-tasks/src/cli.rs:18][E: codex-rs/cloud-tasks/src/cli.rs:20][E: codex-rs/cloud-tasks/src/cli.rs:22][E: codex-rs/cloud-tasks/src/cli.rs:24][E: codex-rs/cloud-tasks/src/cli.rs:26] `ExecCommand` 要求 `--env`，可接收 query、attempts 和 branch；attempts 的 parser 限制在 1..4。[E: codex-rs/cloud-tasks/src/cli.rs:30][E: codex-rs/cloud-tasks/src/cli.rs:33][E: codex-rs/cloud-tasks/src/cli.rs:37][E: codex-rs/cloud-tasks/src/cli.rs:45][E: codex-rs/cloud-tasks/src/cli.rs:49][E: codex-rs/cloud-tasks/src/cli.rs:52][E: codex-rs/cloud-tasks/src/cli.rs:57] `ListCommand` 支持 env、limit、cursor 和 json；limit parser 限制在 1..20。[E: codex-rs/cloud-tasks/src/cli.rs:63][E: codex-rs/cloud-tasks/src/cli.rs:67][E: codex-rs/cloud-tasks/src/cli.rs:82][E: codex-rs/cloud-tasks/src/cli.rs:85][E: codex-rs/cloud-tasks/src/cli.rs:89][E: codex-rs/cloud-tasks/src/cli.rs:93][E: codex-rs/cloud-tasks/src/cli.rs:97]

`run_main` 是 `codex cloud` 入口：存在 subcommand 时直接分发到 exec/status/list/apply/diff；没有 subcommand 时进入 Cloud Tasks list TUI。[E: codex-rs/cloud-tasks/src/lib.rs:752][E: codex-rs/cloud-tasks/src/lib.rs:752][E: codex-rs/cloud-tasks/src/lib.rs:753][E: codex-rs/cloud-tasks/src/lib.rs:755][E: codex-rs/cloud-tasks/src/lib.rs:756][E: codex-rs/cloud-tasks/src/lib.rs:757][E: codex-rs/cloud-tasks/src/lib.rs:758][E: codex-rs/cloud-tasks/src/lib.rs:759][E: codex-rs/cloud-tasks/src/lib.rs:776]

## Backend 初始化与 auth

`init_backend` 默认使用 `https://chatgpt.com/backend-api`，debug build 下可用 `CODEX_CLOUD_TASKS_MODE=mock` 切到 mock client；它还用 suffix 设置 Codex user agent。[E: codex-rs/cloud-tasks/src/lib.rs:48][E: codex-rs/cloud-tasks/src/lib.rs:50][E: codex-rs/cloud-tasks/src/lib.rs:54][E: codex-rs/cloud-tasks/src/lib.rs:55][E: codex-rs/cloud-tasks/src/lib.rs:57][E: codex-rs/cloud-tasks/src/lib.rs:60][E: codex-rs/cloud-tasks/src/lib.rs:78][E: codex-rs/cloud-tasks/src/lib.rs:72][E: codex-rs/cloud-tasks/src/lib.rs:78]

backend 初始化要求能取得 auth，且 `auth.uses_codex_backend()` 为 true；当前实现把 `auth_provider_from_auth(&auth)` 装到 `HttpClient`，不是手动塞 bearer token/account header。[E: codex-rs/cloud-tasks/src/lib.rs:73][E: codex-rs/cloud-tasks/src/lib.rs:91][E: codex-rs/cloud-tasks/src/lib.rs:105][E: codex-rs/cloud-tasks/src/lib.rs:112][E: codex-rs/cloud-tasks/src/lib.rs:113] TUI environment 请求仍通过 `build_chatgpt_headers()` 构造 User-Agent，并在 Codex backend auth 下扩展 `auth_provider_from_auth(&auth).to_auth_headers()`。[E: codex-rs/cloud-tasks/src/util.rs:76][E: codex-rs/cloud-tasks/src/util.rs:80][E: codex-rs/cloud-tasks/src/util.rs:82][E: codex-rs/cloud-tasks/src/util.rs:87][E: codex-rs/cloud-tasks/src/util.rs:89][E: codex-rs/cloud-tasks/src/util.rs:91]

## Exec / status / list / diff / apply

`run_exec_command` 读取 query、解析 environment、解析 git ref，然后调用 `CloudBackend::create_task` 并打印 browser URL。[E: codex-rs/cloud-tasks/src/lib.rs:177][E: codex-rs/cloud-tasks/src/lib.rs:184][E: codex-rs/cloud-tasks/src/lib.rs:185][E: codex-rs/cloud-tasks/src/lib.rs:186][E: codex-rs/cloud-tasks/src/lib.rs:187][E: codex-rs/cloud-tasks/src/lib.rs:188][E: codex-rs/cloud-tasks/src/lib.rs:197][E: codex-rs/cloud-tasks/src/lib.rs:198] `resolve_query_input` 对非 `-` query 原样接受；缺参数时从 stdin 读取，空 stdin 报错。[E: codex-rs/cloud-tasks/src/lib.rs:248][E: codex-rs/cloud-tasks/src/lib.rs:250][E: codex-rs/cloud-tasks/src/lib.rs:252][E: codex-rs/cloud-tasks/src/lib.rs:261][E: codex-rs/cloud-tasks/src/lib.rs:265][E: codex-rs/cloud-tasks/src/lib.rs:270]

`parse_task_id` 支持 plain id，也会剥离 URL fragment/query 后取 path 最后一段。[E: codex-rs/cloud-tasks/src/lib.rs:275][E: codex-rs/cloud-tasks/src/lib.rs:280][E: codex-rs/cloud-tasks/src/lib.rs:281][E: codex-rs/cloud-tasks/src/lib.rs:285][E: codex-rs/cloud-tasks/src/lib.rs:293] diff/apply 会先收集 base attempt diff 与 sibling attempts，按 placement/created_at 排序，再按 1-based attempt number 选择目标。[E: codex-rs/cloud-tasks/src/lib.rs:317][E: codex-rs/cloud-tasks/src/lib.rs:321][E: codex-rs/cloud-tasks/src/lib.rs:324][E: codex-rs/cloud-tasks/src/lib.rs:333][E: codex-rs/cloud-tasks/src/lib.rs:340][E: codex-rs/cloud-tasks/src/lib.rs:350][E: codex-rs/cloud-tasks/src/lib.rs:360][E: codex-rs/cloud-tasks/src/lib.rs:367][E: codex-rs/cloud-tasks/src/lib.rs:377]

status/list/diff/apply handlers 分别调用 `get_task_summary`、`list_tasks`、`collect_attempt_diffs`/print diff、`apply_task`；apply 非 success 时以非零状态退出。[E: codex-rs/cloud-tasks/src/lib.rs:514][E: codex-rs/cloud-tasks/src/lib.rs:518][E: codex-rs/cloud-tasks/src/lib.rs:530][E: codex-rs/cloud-tasks/src/lib.rs:537][E: codex-rs/cloud-tasks/src/lib.rs:597][E: codex-rs/cloud-tasks/src/lib.rs:600][E: codex-rs/cloud-tasks/src/lib.rs:602][E: codex-rs/cloud-tasks/src/lib.rs:606][E: codex-rs/cloud-tasks/src/lib.rs:611][E: codex-rs/cloud-tasks/src/lib.rs:618][E: codex-rs/cloud-tasks/src/lib.rs:622]

## Git 与 environment autodetect

`resolve_git_ref_with_git_info` 优先使用 branch override，其次当前 branch，再其次 default branch，最后 fallback 到 `main`。[E: codex-rs/cloud-tasks/src/lib.rs:153][E: codex-rs/cloud-tasks/src/lib.rs:157][E: codex-rs/cloud-tasks/src/lib.rs:165][E: codex-rs/cloud-tasks/src/lib.rs:167][E: codex-rs/cloud-tasks/src/lib.rs:170][E: codex-rs/cloud-tasks/src/lib.rs:173] `resolve_environment_id` 先匹配 environment id，再按 label case-insensitive 匹配；同 label 对应多个 id 会报 ambiguity error。[E: codex-rs/cloud-tasks/src/lib.rs:202][E: codex-rs/cloud-tasks/src/lib.rs:207][E: codex-rs/cloud-tasks/src/lib.rs:194][E: codex-rs/cloud-tasks/src/lib.rs:217][E: codex-rs/cloud-tasks/src/lib.rs:221][E: codex-rs/cloud-tasks/src/lib.rs:234][E: codex-rs/cloud-tasks/src/lib.rs:240]

`autodetect_environment_id` 先读取 git origins 并尝试 GitHub owner/repo 的 by-repo endpoint；若无法选出候选，再 fallback 到 full environment list。[E: codex-rs/cloud-tasks/src/env_detect.rs:26][E: codex-rs/cloud-tasks/src/env_detect.rs:31][E: codex-rs/cloud-tasks/src/env_detect.rs:53][E: codex-rs/cloud-tasks/src/env_detect.rs:66][E: codex-rs/cloud-tasks/src/env_detect.rs:80][E: codex-rs/cloud-tasks/src/env_detect.rs:88][E: codex-rs/cloud-tasks/src/env_detect.rs:88][E: codex-rs/cloud-tasks/src/env_detect.rs:80][E: codex-rs/cloud-tasks/src/env_detect.rs:113] `pick_environment_row` 的优先级是 desired label、single candidate、pinned、task_count/first。[E: codex-rs/cloud-tasks/src/env_detect.rs:122][E: codex-rs/cloud-tasks/src/env_detect.rs:129][E: codex-rs/cloud-tasks/src/env_detect.rs:139][E: codex-rs/cloud-tasks/src/env_detect.rs:143][E: codex-rs/cloud-tasks/src/env_detect.rs:148][E: codex-rs/cloud-tasks/src/env_detect.rs:153]

## TUI state model

`App` 保存 task list、selected index、status、diff overlay、environment filter/modal、apply modal、best-of modal、new task page、best_of_n、apply spinner 和 background enrichment bookkeeping。[E: codex-rs/cloud-tasks/src/app.rs:47][E: codex-rs/cloud-tasks/src/app.rs:48][E: codex-rs/cloud-tasks/src/app.rs:50][E: codex-rs/cloud-tasks/src/app.rs:51][E: codex-rs/cloud-tasks/src/app.rs:56][E: codex-rs/cloud-tasks/src/app.rs:58][E: codex-rs/cloud-tasks/src/app.rs:59][E: codex-rs/cloud-tasks/src/app.rs:65][E: codex-rs/cloud-tasks/src/app.rs:66][E: codex-rs/cloud-tasks/src/app.rs:68][E: codex-rs/cloud-tasks/src/app.rs:72][E: codex-rs/cloud-tasks/src/app.rs:73] `load_tasks` 用 5 秒 timeout 请求最多 20 条任务，并过滤 review-only tasks。[E: codex-rs/cloud-tasks/src/app.rs:121][E: codex-rs/cloud-tasks/src/app.rs:126][E: codex-rs/cloud-tasks/src/app.rs:127][E: codex-rs/cloud-tasks/src/app.rs:128][E: codex-rs/cloud-tasks/src/app.rs:132]

`NewTaskPage` 保存 composer、submitting、env_id 和 best_of_n；composer hints 包含 send/newline/env/attempts/quit。[E: codex-rs/cloud-tasks/src/new_task.rs:3][E: codex-rs/cloud-tasks/src/new_task.rs:4][E: codex-rs/cloud-tasks/src/new_task.rs:5][E: codex-rs/cloud-tasks/src/new_task.rs:6][E: codex-rs/cloud-tasks/src/new_task.rs:7][E: codex-rs/cloud-tasks/src/new_task.rs:11][E: codex-rs/cloud-tasks/src/new_task.rs:13][E: codex-rs/cloud-tasks/src/new_task.rs:14][E: codex-rs/cloud-tasks/src/new_task.rs:17] `AppEvent` 覆盖 tasks loaded、environment autodetect/list、details diff/messages、attempts loaded、new task submitted、apply preflight finished 和 apply finished。[E: codex-rs/cloud-tasks/src/app.rs:300][E: codex-rs/cloud-tasks/src/app.rs:301][E: codex-rs/cloud-tasks/src/app.rs:307][E: codex-rs/cloud-tasks/src/app.rs:309][E: codex-rs/cloud-tasks/src/app.rs:310][E: codex-rs/cloud-tasks/src/app.rs:315][E: codex-rs/cloud-tasks/src/app.rs:330][E: codex-rs/cloud-tasks/src/app.rs:335][E: codex-rs/cloud-tasks/src/app.rs:337][E: codex-rs/cloud-tasks/src/app.rs:346]

## Gotchas

- `codex cloud exec` 当前要求 `--env`；自动 environment selection 是 TUI/env-detect 路径，不是 exec 的默认行为。[E: codex-rs/cloud-tasks/src/cli.rs:37][E: codex-rs/cloud-tasks/src/lib.rs:186]
- `load_auth_manager` 禁用 Codex API key env loading，因此 cloud tasks 依赖 stored ChatGPT/Codex backend auth，而不是 `OPENAI_API_KEY`。[E: codex-rs/cloud-tasks/src/util.rs:43][E: codex-rs/cloud-tasks/src/util.rs:64][E: codex-rs/cloud-tasks/src/lib.rs:105]
- task URL 会规范化 ChatGPT/backend-api、api/codex 和 codex path style。[E: codex-rs/cloud-tasks/src/util.rs:97][E: codex-rs/cloud-tasks/src/util.rs:98][E: codex-rs/cloud-tasks/src/util.rs:99][E: codex-rs/cloud-tasks/src/util.rs:102][E: codex-rs/cloud-tasks/src/util.rs:105][E: codex-rs/cloud-tasks/src/util.rs:108]

## Sources

- `codex-rs/cloud-tasks/src/lib.rs`
- `codex-rs/cloud-tasks/src/cli.rs`
- `codex-rs/cloud-tasks/src/app.rs`
- `codex-rs/cloud-tasks/src/new_task.rs`
- `codex-rs/cloud-tasks/src/env_detect.rs`
- `codex-rs/cloud-tasks/src/util.rs`

## 相关

- `subsys.cloud.cloud-task-api`: Cloud tasks backend trait、HTTP client、task/attempt/apply 数据模型。
- `subsys.cloud.cloud-config`: enterprise cloud config bundle 的 fetch/cache/refresh。
- `subsys.platform.git-utils`: branch/diff/apply 支撑。
