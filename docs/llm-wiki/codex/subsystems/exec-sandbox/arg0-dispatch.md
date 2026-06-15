---
id: subsys.exec-sandbox.arg0-dispatch
title: arg0 dispatch
kind: subsystem
tier: T2
source: [codex-rs/arg0/src/lib.rs, codex-rs/linux-sandbox/src/lib.rs, codex-rs/apply-patch/src/lib.rs, codex-rs/shell-escalation/src/unix]
symbols: [arg0_dispatch, arg0_dispatch_or_else, Arg0DispatchPaths, prepend_path_entry_for_codex_aliases, CODEX_LINUX_SANDBOX_ARG0, EXECVE_WRAPPER_ARG0]
related: [spine.process-lifecycle, subsys.exec-sandbox.sandbox-linux, subsys.exec-sandbox.apply-patch-engine, subsys.exec-sandbox.shell-escalation]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> arg0 dispatch 是 Codex 单二进制多入口机制:同一个 executable 可以根据 argv0/argv1 伪装成 `apply_patch`、`codex-linux-sandbox`、`codex-execve-wrapper`、exec-server fs helper 或 core apply-patch helper。[E: codex-rs/arg0/src/lib.rs:54][E: codex-rs/arg0/src/lib.rs:89][E: codex-rs/arg0/src/lib.rs:92][E: codex-rs/arg0/src/lib.rs:96]

## 能回答的问题

- Codex 怎样通过 argv0 进入 apply_patch、Linux sandbox 或 execve wrapper？
- argv1 marker 怎样触发 exec-server fs helper 和 core apply-patch helper？
- PATH alias tempdir 怎样创建、锁定、清理和注入？
- `.env` loading 为什么在 tokio runtime 创建前执行？
- Linux sandbox helper path 怎样优先使用 alias？

## 职责边界

arg0 dispatch 节点覆盖 `codex-rs/arg0/src/lib.rs` 的 alias dispatch、PATH alias generation、dotenv loading 和 runtime wrapper。它不覆盖 apply_patch parser、Linux sandbox policy 或 shell escalation protocol 的内部逻辑；这些由对应 subsystem 节点覆盖。[I]

## 关键 crate/文件

- `codex-rs/arg0/src/lib.rs`: 常量、dispatch path struct、argv0/argv1 branch、PATH alias tempdir、dotenv guard、runtime wrapper。[E: codex-rs/arg0/src/lib.rs:14][E: codex-rs/arg0/src/lib.rs:21][E: codex-rs/arg0/src/lib.rs:54][E: codex-rs/arg0/src/lib.rs:267]
- `codex-rs/linux-sandbox/src/lib.rs`: `codex_linux_sandbox::run_main()` 是 Linux sandbox argv0 branch 的目标函数。[E: codex-rs/linux-sandbox/src/lib.rs:19][E: codex-rs/linux-sandbox/src/lib.rs:21]
- `codex-rs/apply-patch/src/lib.rs`: `CODEX_CORE_APPLY_PATCH_ARG1` 是 argv1 branch 的 marker。[E: codex-rs/apply-patch/src/lib.rs:35][E: codex-rs/apply-patch/src/lib.rs:42]
- `codex-rs/shell-escalation/src/unix`: `codex-execve-wrapper` argv0 branch 调用 Unix shell escalation wrapper。[E: codex-rs/arg0/src/lib.rs:63][E: codex-rs/shell-escalation/src/unix/execve_wrapper.rs:22]

## 数据模型

- `Arg0DispatchPaths`: 保存 stable current Codex executable、Linux sandbox helper executable 和 main execve wrapper executable 三个 optional paths。[E: codex-rs/arg0/src/lib.rs:21][E: codex-rs/arg0/src/lib.rs:28][E: codex-rs/arg0/src/lib.rs:29][E: codex-rs/arg0/src/lib.rs:30]
- `Arg0PathEntryGuard`: 持有 temp dir、lock file 和 `Arg0DispatchPaths`，用于 alias tempdir 生命周期和 path lookup。[E: codex-rs/arg0/src/lib.rs:33][E: codex-rs/arg0/src/lib.rs:35][E: codex-rs/arg0/src/lib.rs:36][E: codex-rs/arg0/src/lib.rs:37]
- constants: `APPLY_PATCH_ARG0` 是 `apply_patch`，兼容拼写 `MISSPELLED_APPLY_PATCH_ARG0` 是 `applypatch`，Linux sandbox alias 来自 `codex_sandboxing::landlock::CODEX_LINUX_SANDBOX_ARG0`，Unix execve wrapper alias 常量是 `EXECVE_WRAPPER_ARG0`。[E: codex-rs/arg0/src/lib.rs:8][E: codex-rs/arg0/src/lib.rs:14][E: codex-rs/arg0/src/lib.rs:15][E: codex-rs/arg0/src/lib.rs:17]

## 控制流

1. `arg0_dispatch` 从 `argv[0]` 的 file name 取 `exe_name`；取不到 file name 时使用空字符串继续匹配，函数返回 `Option<Arg0PathEntryGuard>`。[E: codex-rs/arg0/src/lib.rs:54][E: codex-rs/arg0/src/lib.rs:58][E: codex-rs/arg0/src/lib.rs:61][E: codex-rs/arg0/src/lib.rs:141]
2. 如果 `exe_name == EXECVE_WRAPPER_ARG0`，dispatch 把第一个剩余参数当 file，后续参数收集成 wrapper argv，并调用 `codex_shell_escalation::run_shell_escalation_execve_wrapper`；缺少 file 或 runtime 创建失败时直接 `process::exit(1)`。[E: codex-rs/arg0/src/lib.rs:64][E: codex-rs/arg0/src/lib.rs:67][E: codex-rs/arg0/src/lib.rs:69][E: codex-rs/arg0/src/lib.rs:71][E: codex-rs/arg0/src/lib.rs:80][E: codex-rs/arg0/src/lib.rs:81]
3. 如果 `exe_name == CODEX_LINUX_SANDBOX_ARG0`，dispatch 调用 `codex_linux_sandbox::run_main()` 并返回 true。[E: codex-rs/arg0/src/lib.rs:89][E: codex-rs/arg0/src/lib.rs:90]
4. 如果 `exe_name` 是 `apply_patch` 或 `applypatch`，dispatch 调用 `codex_apply_patch::main()`。[E: codex-rs/arg0/src/lib.rs:92][E: codex-rs/arg0/src/lib.rs:93]
5. 如果 `argv[1] == CODEX_FS_HELPER_ARG1`，dispatch 进入 `codex_exec_server::run_fs_helper_main()`。[E: codex-rs/arg0/src/lib.rs:96][E: codex-rs/arg0/src/lib.rs:98]
6. 如果 `argv[1] == CODEX_CORE_APPLY_PATCH_ARG1`，dispatch 要求 `argv[2]` 是 patch body，用 `codex_apply_patch::apply_patch` 和 `codex_exec_server::LOCAL_FS` 执行 patch。[E: codex-rs/arg0/src/lib.rs:100][E: codex-rs/arg0/src/lib.rs:107][E: codex-rs/arg0/src/lib.rs:119][E: codex-rs/arg0/src/lib.rs:125]
7. 如果没有命中特殊入口，dispatch 先调用 `load_dotenv`，再调用 `prepend_path_entry_for_codex_aliases` 创建 alias PATH entry，最后返回 false 让正常 CLI main 继续执行。[E: codex-rs/arg0/src/lib.rs:137][E: codex-rs/arg0/src/lib.rs:141][E: codex-rs/arg0/src/lib.rs:150]
8. `arg0_dispatch_or_else` 先运行 `arg0_dispatch` 并保留返回的 optional guard，然后创建 tokio runtime，构造 `Arg0DispatchPaths`，并把 paths 交给 CLI main future。[E: codex-rs/arg0/src/lib.rs:175][E: codex-rs/arg0/src/lib.rs:183][E: codex-rs/arg0/src/lib.rs:187][E: codex-rs/arg0/src/lib.rs:190][E: codex-rs/arg0/src/lib.rs:202]

## PATH alias 生成

- `prepend_path_entry_for_codex_aliases` 在 Codex home 下使用 `tmp/arg0` 作为 base root，Unix 上把 root chmod 为 0700，并清理陈旧 entries。[E: codex-rs/arg0/src/lib.rs:267][E: codex-rs/arg0/src/lib.rs:283][E: codex-rs/arg0/src/lib.rs:287][E: codex-rs/arg0/src/lib.rs:295]
- 函数创建 tempdir 和 `.lock` 文件，然后按 `cfg` 写入 aliases:所有平台都有 `apply_patch` 与 `applypatch`，Linux 额外有 `codex-linux-sandbox`，Unix 额外有 `codex-execve-wrapper`；Unix aliases 使用 symlink，Windows aliases 使用 `.bat` wrapper。[E: codex-rs/arg0/src/lib.rs:300][E: codex-rs/arg0/src/lib.rs:305][E: codex-rs/arg0/src/lib.rs:314][E: codex-rs/arg0/src/lib.rs:317][E: codex-rs/arg0/src/lib.rs:320][E: codex-rs/arg0/src/lib.rs:324][E: codex-rs/arg0/src/lib.rs:330]
- alias entry 会 prepend 到 `PATH`，并通过 `Arg0PathEntryGuard` 保持 tempdir 与 lock file 存活。[E: codex-rs/arg0/src/lib.rs:351][E: codex-rs/arg0/src/lib.rs:357][E: codex-rs/arg0/src/lib.rs:367]
- `linux_sandbox_exe_path` 优先返回 alias path；没有 alias 时回退 current executable path。[E: codex-rs/arg0/src/lib.rs:206][E: codex-rs/arg0/src/lib.rs:207][E: codex-rs/arg0/src/lib.rs:212]

## dotenv 与 runtime

- `.env` loading 在 tokio runtime 创建前执行；`set_filtered` 会跳过 key upper-case 后以 `CODEX_` 开头的 dotenv entries，只设置未命中该 prefix 的变量。[E: codex-rs/arg0/src/lib.rs:137][E: codex-rs/arg0/src/lib.rs:231][E: codex-rs/arg0/src/lib.rs:244][E: codex-rs/arg0/src/lib.rs:245][E: codex-rs/arg0/src/lib.rs:248]
- tokio runtime 的 worker stack size 由 `TOKIO_WORKER_STACK_SIZE_BYTES` 控制，当前值是 `16 * 1024 * 1024` bytes。[E: codex-rs/arg0/src/lib.rs:19][E: codex-rs/arg0/src/lib.rs:218][E: codex-rs/arg0/src/lib.rs:221]

## 设计动机与权衡

- arg0 dispatch 让一个 Codex binary 同时承担 CLI、apply_patch、Linux sandbox helper、execve wrapper 等角色，减少分发多个 helper binary 的需要。[I]
- PATH alias tempdir 用 lock file 和 janitor 清理，避免长期把过期 symlink/bat 留在 Codex home；同时 alias path 让 child process 可以用普通 command name 重新进入当前 binary。[I]
- `.env` 禁止 `CODEX_` prefix，避免本地 `.env` 覆盖 Codex 内部控制环境变量。[E: codex-rs/arg0/src/lib.rs:241][E: codex-rs/arg0/src/lib.rs:248]

## gotcha

- `EXECVE_WRAPPER_ARG0` branch 至少需要 wrapper alias 后的 file argument；缺少 file 时直接 `std::process::exit(1)`。[E: codex-rs/arg0/src/lib.rs:64][E: codex-rs/arg0/src/lib.rs:67][E: codex-rs/arg0/src/lib.rs:69]
- core apply-patch argv1 branch 没有走 shell command string parser；它直接读取 `argv[2]` patch body，并在当前 process 内调用 apply_patch engine。[E: codex-rs/arg0/src/lib.rs:107][E: codex-rs/arg0/src/lib.rs:119]
- `load_dotenv` 的 `CODEX_` 检查发生在 key 层面；匹配该 prefix 的 dotenv entry 会被跳过而不是写入 process env。[E: codex-rs/arg0/src/lib.rs:225][E: codex-rs/arg0/src/lib.rs:239][E: codex-rs/arg0/src/lib.rs:245]

## Sources

- `codex-rs/arg0/src/lib.rs`
- `codex-rs/linux-sandbox/src/lib.rs`
- `codex-rs/apply-patch/src/lib.rs`
- `codex-rs/shell-escalation/src/unix`

## 相关

- `spine.process-lifecycle`
- `subsys.exec-sandbox.sandbox-linux`
- `subsys.exec-sandbox.apply-patch-engine`
- `subsys.exec-sandbox.shell-escalation`
