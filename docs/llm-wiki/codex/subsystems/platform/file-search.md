---
id: subsys.platform.file-search
title: File search
kind: subsystem
tier: T2
source: [codex-rs/file-search/src/lib.rs, codex-rs/file-search/src/cli.rs, codex-rs/file-search/src/main.rs, codex-rs/file-search/README.md]
symbols: [FileMatch, MatchType, FileSearchOptions, FileSearchSession, create_session, run, file_search::run_main]
related: [subsys.platform.terminal-detection]
evidence: explicit
status: verified
updated: 7750465934
---

> `codex_file_search` 是基于 `ignore::WalkBuilder` 与 Nucleo matcher 的 fuzzy file search crate：它同时提供 persistent session API、one-shot `run()` API 和 CLI reporter 输出层。[E: codex-rs/file-search/src/lib.rs:7][E: codex-rs/file-search/src/lib.rs:12][E: codex-rs/file-search/src/lib.rs:164][E: codex-rs/file-search/src/lib.rs:297][E: codex-rs/file-search/src/lib.rs:225]

## 能回答的问题

- `FileMatch`、`FileSearchOptions`、`FileSearchSession` 的字段和默认值是什么？
- session mode 怎样通过 query update、walker worker、matcher worker 和 reporter 协作？
- walker 怎样处理 hidden entries、symlinks、gitignore 和 override exclude patterns？
- CLI 的 JSON/plain/indices 输出分别是什么形态？
- CLI 没有 search pattern 时为什么不是 fuzzy search？

## 数据模型与 public API

`FileMatch` 包含 score、relative path、match type、root 和 optional indices；`full_path()` 用 `root.join(path)` 还原完整路径。[E: codex-rs/file-search/src/lib.rs:54][E: codex-rs/file-search/src/lib.rs:55][E: codex-rs/file-search/src/lib.rs:56][E: codex-rs/file-search/src/lib.rs:57][E: codex-rs/file-search/src/lib.rs:58][E: codex-rs/file-search/src/lib.rs:60][E: codex-rs/file-search/src/lib.rs:78] `MatchType` 只有 `File` 与 `Directory` 两种，并以 lowercase 序列化。[E: codex-rs/file-search/src/lib.rs:65][E: codex-rs/file-search/src/lib.rs:66][E: codex-rs/file-search/src/lib.rs:67]

`FileSearchOptions` 字段是 `limit`、`exclude`、`threads`、`compute_indices` 和 `respect_gitignore`；默认值是 limit 20、exclude empty、threads 2、compute_indices false、respect_gitignore true。[E: codex-rs/file-search/src/lib.rs:106][E: codex-rs/file-search/src/lib.rs:107][E: codex-rs/file-search/src/lib.rs:108][E: codex-rs/file-search/src/lib.rs:109][E: codex-rs/file-search/src/lib.rs:110][E: codex-rs/file-search/src/lib.rs:118][E: codex-rs/file-search/src/lib.rs:125][E: codex-rs/file-search/src/lib.rs:126][E: codex-rs/file-search/src/lib.rs:128][E: codex-rs/file-search/src/lib.rs:129][E: codex-rs/file-search/src/lib.rs:130]

`FileSearchSession::update_query` 发送 `WorkSignal::QueryUpdated`，`Drop` 设置 shutdown flag 并发送 `WorkSignal::Shutdown`。[E: codex-rs/file-search/src/lib.rs:147][E: codex-rs/file-search/src/lib.rs:153][E: codex-rs/file-search/src/lib.rs:157][E: codex-rs/file-search/src/lib.rs:159][E: codex-rs/file-search/src/lib.rs:160] `SessionReporter` 用于 session snapshot progress/complete；CLI 的 `Reporter` trait 只负责最终 match/warning 输出。[E: codex-rs/file-search/src/lib.rs:135][E: codex-rs/file-search/src/lib.rs:137][E: codex-rs/file-search/src/lib.rs:140][E: codex-rs/file-search/src/lib.rs:219][E: codex-rs/file-search/src/lib.rs:220][E: codex-rs/file-search/src/lib.rs:222]

## Session 控制流

1. `create_session` 至少要求一个 search directory，构建 override matcher、work channel、Nucleo instance 和 shared `SessionInner`。[E: codex-rs/file-search/src/lib.rs:164][E: codex-rs/file-search/src/lib.rs:178][E: codex-rs/file-search/src/lib.rs:181][E: codex-rs/file-search/src/lib.rs:182][E: codex-rs/file-search/src/lib.rs:188][E: codex-rs/file-search/src/lib.rs:198]
2. `create_session` 分别 spawn matcher worker 与 walker worker，然后返回 `FileSearchSession`。[E: codex-rs/file-search/src/lib.rs:210][E: codex-rs/file-search/src/lib.rs:211][E: codex-rs/file-search/src/lib.rs:213][E: codex-rs/file-search/src/lib.rs:214][E: codex-rs/file-search/src/lib.rs:216]
3. walker 用 `WalkBuilder` 遍历所有 roots，设置 `threads(inner.threads)`、`hidden(false)`、`follow_links(true)` 和 `require_git(true)`。[E: codex-rs/file-search/src/lib.rs:427][E: codex-rs/file-search/src/lib.rs:429][E: codex-rs/file-search/src/lib.rs:432][E: codex-rs/file-search/src/lib.rs:434][E: codex-rs/file-search/src/lib.rs:436][E: codex-rs/file-search/src/lib.rs:439]
4. 当 `respect_gitignore` 为 false 时，walker 同时关闭 `.gitignore`、git global、git exclude、`.ignore` 和 parent ignore scanning。[E: codex-rs/file-search/src/lib.rs:440][E: codex-rs/file-search/src/lib.rs:442][E: codex-rs/file-search/src/lib.rs:443][E: codex-rs/file-search/src/lib.rs:444][E: codex-rs/file-search/src/lib.rs:445][E: codex-rs/file-search/src/lib.rs:446]
5. walker 把 full path 与它观察到的 `MatchType` 一起写入 `IndexedEntry`，并把相对路径作为 matcher column；目录 symlink 被跟随时仍保留 walker 报告的 directory 类型，不必在 matcher 阶段重新 `stat`。[E: codex-rs/file-search/src/lib.rs:71][E: codex-rs/file-search/src/lib.rs:72][E: codex-rs/file-search/src/lib.rs:73][E: codex-rs/file-search/src/lib.rs:471][E: codex-rs/file-search/src/lib.rs:472][E: codex-rs/file-search/src/lib.rs:473][E: codex-rs/file-search/src/lib.rs:476][E: codex-rs/file-search/src/lib.rs:477][E: codex-rs/file-search/src/lib.rs:478][E: codex-rs/file-search/src/lib.rs:479][E: codex-rs/file-search/src/lib.rs:482]
6. matcher worker 接收 `QueryUpdated` 后 reparses Nucleo pattern；snapshot changed 时取 top-N matches，直接复用 `IndexedEntry.match_type`、按需计算 indices，并通过 `SessionReporter::on_update` 发布 snapshot。[E: codex-rs/file-search/src/lib.rs:522][E: codex-rs/file-search/src/lib.rs:524][E: codex-rs/file-search/src/lib.rs:531][E: codex-rs/file-search/src/lib.rs:556][E: codex-rs/file-search/src/lib.rs:560][E: codex-rs/file-search/src/lib.rs:565][E: codex-rs/file-search/src/lib.rs:581][E: codex-rs/file-search/src/lib.rs:588][E: codex-rs/file-search/src/lib.rs:595]

## Path 与排序 helpers

`build_override_matcher` 把每个 exclude string 转成 ignore override 的 negated pattern `!{exclude}`，并在 walker 上安装 override matcher。[E: codex-rs/file-search/src/lib.rs:370][E: codex-rs/file-search/src/lib.rs:377][E: codex-rs/file-search/src/lib.rs:379][E: codex-rs/file-search/src/lib.rs:380][E: codex-rs/file-search/src/lib.rs:382][E: codex-rs/file-search/src/lib.rs:383][E: codex-rs/file-search/src/lib.rs:449] `get_file_path` 在多个 roots 中选择最深匹配 root，并返回该 root index 与相对 path string。[E: codex-rs/file-search/src/lib.rs:386][E: codex-rs/file-search/src/lib.rs:388][E: codex-rs/file-search/src/lib.rs:389][E: codex-rs/file-search/src/lib.rs:390][E: codex-rs/file-search/src/lib.rs:392][E: codex-rs/file-search/src/lib.rs:393][E: codex-rs/file-search/src/lib.rs:395][E: codex-rs/file-search/src/lib.rs:401][E: codex-rs/file-search/src/lib.rs:402]

`cmp_by_score_desc_then_path_asc` 是一个公开 comparator helper，按 score descending、path ascending 生成排序闭包；当前 matcher worker 的生产路径直接消费 `snapshot.matches().iter().take(limit)`，没有在该路径调用这个 comparator。[E: codex-rs/file-search/src/lib.rs:326][E: codex-rs/file-search/src/lib.rs:335][E: codex-rs/file-search/src/lib.rs:336][E: codex-rs/file-search/src/lib.rs:560][E: codex-rs/file-search/src/lib.rs:563]

## CLI 与输出

CLI args 支持 `--json`、`--limit/-l`、`--cwd/-C`、`--compute-indices`、`--threads`、repeatable `--exclude/-e` 和 optional pattern。[E: codex-rs/file-search/src/cli.rs:10][E: codex-rs/file-search/src/cli.rs:13][E: codex-rs/file-search/src/cli.rs:17][E: codex-rs/file-search/src/cli.rs:21][E: codex-rs/file-search/src/cli.rs:25][E: codex-rs/file-search/src/cli.rs:34][E: codex-rs/file-search/src/cli.rs:38][E: codex-rs/file-search/src/cli.rs:41] CLI default limit 是 64，threads 默认是 2；代码注释说明 2 threads 是经验默认值。[E: codex-rs/file-search/src/cli.rs:17][E: codex-rs/file-search/src/cli.rs:34][I]

`run_main` 没有 pattern 时不是 fuzzy search：Unix fallback 执行 `ls -al`，Windows fallback 执行 `cmd /c <search_directory>`，然后返回。[E: codex-rs/file-search/src/lib.rs:241][E: codex-rs/file-search/src/lib.rs:244][E: codex-rs/file-search/src/lib.rs:246][E: codex-rs/file-search/src/lib.rs:247][E: codex-rs/file-search/src/lib.rs:252][E: codex-rs/file-search/src/lib.rs:255][E: codex-rs/file-search/src/lib.rs:255][E: codex-rs/file-search/src/lib.rs:256][E: codex-rs/file-search/src/lib.rs:257][E: codex-rs/file-search/src/lib.rs:261][E: codex-rs/file-search/src/lib.rs:263] 有 pattern 时，CLI 构造 `FileSearchOptions` 并把 `respect_gitignore` 固定为 true。[E: codex-rs/file-search/src/lib.rs:267][E: codex-rs/file-search/src/lib.rs:270][E: codex-rs/file-search/src/lib.rs:273][E: codex-rs/file-search/src/lib.rs:278][E: codex-rs/file-search/src/lib.rs:281]

`StdioReporter` 在 JSON 模式逐行序列化 `FileMatch`；plain 模式下，如果 `--compute-indices` 且 stdout 是 terminal，会用 indices 对匹配字符加粗；否则只打印 relative path。[E: codex-rs/file-search/src/main.rs:14][E: codex-rs/file-search/src/main.rs:16][E: codex-rs/file-search/src/main.rs:29][E: codex-rs/file-search/src/main.rs:31][E: codex-rs/file-search/src/main.rs:33][E: codex-rs/file-search/src/main.rs:45][E: codex-rs/file-search/src/main.rs:49][E: codex-rs/file-search/src/main.rs:59][E: codex-rs/file-search/src/main.rs:60]

## 设计动机与权衡

persistent session 把 filesystem traversal 和 query updates 分离，适合 UI 在用户持续输入时复用同一次 walk，而 one-shot `run()` 通过 `RunReporter` 等待 complete snapshot，适合 CLI 或同步调用点。[I] 这个分层由 `FileSearchSession::update_query`、`walker_worker`、`matcher_worker`、`run()` 和 `RunReporter::wait_for_complete` 共同体现。[E: codex-rs/file-search/src/lib.rs:147][E: codex-rs/file-search/src/lib.rs:417][E: codex-rs/file-search/src/lib.rs:499][E: codex-rs/file-search/src/lib.rs:297][E: codex-rs/file-search/src/lib.rs:308][E: codex-rs/file-search/src/lib.rs:640]

walker 使用 `require_git(true)` 并让 `respect_gitignore` 控制是否关闭 ignore processing，目的是让默认 `.gitignore` 语义更接近 git repo 边界，同时仍允许 API caller 显式搜索 ignored files。[I] 这个意图由源码注释和 `respect_gitignore` 分支共同体现。[E: codex-rs/file-search/src/lib.rs:440][E: codex-rs/file-search/src/lib.rs:446]

## Gotchas

- `respect_gitignore` 是 API 选项，默认 true；CLI 没有暴露关闭它的 flag，并且在 `run_main` 中固定传 true。[E: codex-rs/file-search/src/lib.rs:118][E: codex-rs/file-search/src/lib.rs:130][E: codex-rs/file-search/src/lib.rs:273][E: codex-rs/file-search/src/lib.rs:278]
- walker 默认允许 hidden entries，并且会 follow symlinks；不要把它理解成 `ignore` crate 的默认 hidden/symlink 行为。[E: codex-rs/file-search/src/lib.rs:434][E: codex-rs/file-search/src/lib.rs:436]
- match type 来自 walker 的 `DirEntry::file_type()`，不是对匹配 path 的第二次 filesystem 查询；对应回归测试要求 followed directory symlink 仍分类为 `Directory`。[E: codex-rs/file-search/src/lib.rs:472][E: codex-rs/file-search/src/lib.rs:473][E: codex-rs/file-search/src/lib.rs:474][E: codex-rs/file-search/src/lib.rs:581][E: codex-rs/file-search/src/lib.rs:1028][E: codex-rs/file-search/src/lib.rs:1033][E: codex-rs/file-search/src/lib.rs:1043][E: codex-rs/file-search/src/lib.rs:1045]
- `--compute-indices` 在 JSON 模式下仍会让 `FileMatch.indices` 被计算并序列化；plain 模式只有 stdout 是 terminal 时才用 indices 做加粗展示。[E: codex-rs/file-search/src/lib.rs:277][E: codex-rs/file-search/src/main.rs:16][E: codex-rs/file-search/src/main.rs:29][E: codex-rs/file-search/src/main.rs:33]

## Sources

- `codex-rs/file-search/src/lib.rs`
- `codex-rs/file-search/src/cli.rs`
- `codex-rs/file-search/src/main.rs`
- `codex-rs/file-search/README.md`

## 相关

- `subsys.platform.terminal-detection`: CLI plain output 是否高亮依赖 terminal 能力判断。
