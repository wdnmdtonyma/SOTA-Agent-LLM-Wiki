---
id: subsys.exec-sandbox.process-hardening
title: process hardening
kind: subsystem
tier: T2
source: [codex-rs/process-hardening/src/lib.rs]
symbols: [pre_main_hardening]
related: [spine.process-lifecycle, subsys.exec-sandbox.overview, subsys.exec-sandbox.arg0-dispatch]
evidence: explicit
status: verified
updated: 5670360009
---

> process hardening 是 Codex 进程 main 之前的 best-effort defense layer:Linux 关闭 dumpability、禁 core dump、移除 `LD_` env；FreeBSD/OpenBSD 禁 core dump 并移除 `LD_` env；macOS deny attach、禁 core dump、移除 `DYLD_` env；Windows 当前是 no-op。[E: codex-rs/process-hardening/src/lib.rs:12][E: codex-rs/process-hardening/src/lib.rs:14][E: codex-rs/process-hardening/src/lib.rs:44][E: codex-rs/process-hardening/src/lib.rs:56][E: codex-rs/process-hardening/src/lib.rs:60][E: codex-rs/process-hardening/src/lib.rs:75][E: codex-rs/process-hardening/src/lib.rs:77][E: codex-rs/process-hardening/src/lib.rs:83][E: codex-rs/process-hardening/src/lib.rs:85][E: codex-rs/process-hardening/src/lib.rs:95][E: codex-rs/process-hardening/src/lib.rs:99][E: codex-rs/process-hardening/src/lib.rs:120][E: codex-rs/process-hardening/src/lib.rs:121]

## 能回答的问题

- `pre_main_hardening` 在不同 OS 上调用哪些 hardening steps？
- Linux 为什么设置 `PR_SET_DUMPABLE = 0`？
- macOS 为什么调用 `ptrace(PT_DENY_ATTACH)`？
- core dump limit 如何设置为 0？
- 哪些 dynamic loader env vars 会被清掉？

## 职责边界

process hardening 节点只覆盖 `codex-rs/process-hardening/src/lib.rs` 中的进程级预启动防护。它不创建 sandbox，也不修改命令执行 policy；它保护的是当前 Codex 进程自身被 dump、attach 或通过 loader env 注入的风险面。[I]

## 关键 crate/文件

- `codex-rs/process-hardening/src/lib.rs`: 单文件 crate，导出 `pre_main_hardening` 并按 target OS dispatch。[E: codex-rs/process-hardening/src/lib.rs:13][E: codex-rs/process-hardening/src/lib.rs:14][E: codex-rs/process-hardening/src/lib.rs:17][E: codex-rs/process-hardening/src/lib.rs:21][E: codex-rs/process-hardening/src/lib.rs:24]

## 数据模型

该 crate 没有复杂 struct/enum；主要 public API 是 `pre_main_hardening()`，失败时在平台实现内部直接退出或 best-effort ignore。[E: codex-rs/process-hardening/src/lib.rs:13][E: codex-rs/process-hardening/src/lib.rs:47][E: codex-rs/process-hardening/src/lib.rs:77]

## 控制流

1. `pre_main_hardening` 在 Linux/Android 编译目标调用 `pre_main_hardening_linux()`；在 macOS 调用 `pre_main_hardening_macos()`；在 FreeBSD/OpenBSD 调用 `pre_main_hardening_bsd()`；在 Windows 调用 `pre_main_hardening_windows()`。[E: codex-rs/process-hardening/src/lib.rs:14][E: codex-rs/process-hardening/src/lib.rs:15][E: codex-rs/process-hardening/src/lib.rs:17][E: codex-rs/process-hardening/src/lib.rs:18][E: codex-rs/process-hardening/src/lib.rs:21][E: codex-rs/process-hardening/src/lib.rs:22][E: codex-rs/process-hardening/src/lib.rs:24][E: codex-rs/process-hardening/src/lib.rs:25]
2. Linux path 调用 `libc::prctl(libc::PR_SET_DUMPABLE, 0, 0, 0, 0)`；失败时打印错误并以 `PRCTL_FAILED_EXIT_CODE` 退出，该常量值为 5。[E: codex-rs/process-hardening/src/lib.rs:29][E: codex-rs/process-hardening/src/lib.rs:47][E: codex-rs/process-hardening/src/lib.rs:53]
3. Linux path 调用 `set_core_dump_limit_zero()`，然后删除所有 key 以 `LD_` 开头的环境变量。[E: codex-rs/process-hardening/src/lib.rs:56][E: codex-rs/process-hardening/src/lib.rs:59]
4. macOS path 调用 `ptrace(PT_DENY_ATTACH, 0, NULL, 0)`；失败时打印错误并以 `PTRACE_DENY_ATTACH_FAILED_EXIT_CODE` 退出，该常量值为 6。[E: codex-rs/process-hardening/src/lib.rs:31][E: codex-rs/process-hardening/src/lib.rs:75][E: codex-rs/process-hardening/src/lib.rs:83]
5. macOS path 调用 `set_core_file_size_limit_to_zero()`，然后删除 `DYLD_` 前缀环境变量。[E: codex-rs/process-hardening/src/lib.rs:94][E: codex-rs/process-hardening/src/lib.rs:95][E: codex-rs/process-hardening/src/lib.rs:97][E: codex-rs/process-hardening/src/lib.rs:99]
6. `set_core_file_size_limit_to_zero` 构造 `rlimit { rlim_cur: 0, rlim_max: 0 }` 并调用 `setrlimit(RLIMIT_CORE, &rlim)`；失败时打印错误并以 `SET_RLIMIT_CORE_FAILED_EXIT_CODE` 退出，该常量值为 7。[E: codex-rs/process-hardening/src/lib.rs:42][E: codex-rs/process-hardening/src/lib.rs:99][E: codex-rs/process-hardening/src/lib.rs:100][E: codex-rs/process-hardening/src/lib.rs:105][E: codex-rs/process-hardening/src/lib.rs:111]
7. `remove_env_vars_with_prefix` 遍历 `env_keys_with_prefix(std::env::vars_os(), prefix)` 的结果并调用 `remove_var`；prefix matching 在 helper 中以 raw bytes 执行。[E: codex-rs/process-hardening/src/lib.rs:125][E: codex-rs/process-hardening/src/lib.rs:126][E: codex-rs/process-hardening/src/lib.rs:128][E: codex-rs/process-hardening/src/lib.rs:134][E: codex-rs/process-hardening/src/lib.rs:140][E: codex-rs/process-hardening/src/lib.rs:142]
8. Windows `pre_main_hardening_windows` 当前只有 TODO 和 no-op body。[E: codex-rs/process-hardening/src/lib.rs:119][E: codex-rs/process-hardening/src/lib.rs:120][E: codex-rs/process-hardening/src/lib.rs:121][E: codex-rs/process-hardening/src/lib.rs:122]

## 设计动机与权衡

- Linux/macOS 对 attach/dump/core-limit hardening failure 都选择显式退出，退出码分别由 `PRCTL_FAILED_EXIT_CODE`、`PTRACE_DENY_ATTACH_FAILED_EXIT_CODE`、`SET_RLIMIT_CORE_FAILED_EXIT_CODE` 常量定义。[E: codex-rs/process-hardening/src/lib.rs:29][E: codex-rs/process-hardening/src/lib.rs:31][E: codex-rs/process-hardening/src/lib.rs:42][E: codex-rs/process-hardening/src/lib.rs:53][E: codex-rs/process-hardening/src/lib.rs:83][E: codex-rs/process-hardening/src/lib.rs:111]
- 删除 `LD_`/`DYLD_` env vars 是为了缩小 dynamic loader 注入面。[I]
- Windows no-op 明确保留 TODO，表示 Windows hardening 尚未与 Unix path 对齐。[E: codex-rs/process-hardening/src/lib.rs:120][E: codex-rs/process-hardening/src/lib.rs:121]

## gotcha

- `remove_env_vars_with_prefix` 通过 `env_keys_with_prefix` 做 byte-prefix matching；测试覆盖了 non-UTF8 key 与 prefix filtering 行为。[E: codex-rs/process-hardening/src/lib.rs:125][E: codex-rs/process-hardening/src/lib.rs:134][E: codex-rs/process-hardening/src/lib.rs:140][E: codex-rs/process-hardening/src/lib.rs:142][E: codex-rs/process-hardening/src/lib.rs:157][E: codex-rs/process-hardening/src/lib.rs:181]
- `pre_main_hardening` 返回 `()`，调用者不能从 public API 获取哪些 hardening step 成功或失败。[E: codex-rs/process-hardening/src/lib.rs:13]
- Windows path 当前不执行防护逻辑；不要把该 crate 误读为跨平台等价 hardening。[E: codex-rs/process-hardening/src/lib.rs:119][E: codex-rs/process-hardening/src/lib.rs:120][E: codex-rs/process-hardening/src/lib.rs:121][E: codex-rs/process-hardening/src/lib.rs:122]

## Sources

- `codex-rs/process-hardening/src/lib.rs`

## 相关

- `spine.process-lifecycle`
- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.arg0-dispatch`
