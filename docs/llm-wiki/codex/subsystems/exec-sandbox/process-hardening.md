---
id: subsys.exec-sandbox.process-hardening
title: process hardening
kind: subsystem
tier: T2
source: [codex-rs/process-hardening/src/lib.rs, codex-rs/utils/pty/src/win/job.rs, codex-rs/utils/pty/src/pipe.rs, codex-rs/utils/pty/src/process.rs]
symbols: [pre_main_hardening, JobObject, JobObject::create, JobObject::preserve_descendants, JobObject::terminate, WindowsChildTerminator, ProcessDriver]
related: [spine.process-lifecycle, subsys.exec-sandbox.overview, subsys.exec-sandbox.arg0-dispatch]
evidence: explicit
status: verified
updated: 7750465934
---

> process hardening 是 Codex 进程 main 之前的 best-effort defense layer:Linux 关闭 dumpability、禁 core dump、移除 `LD_` env；FreeBSD/OpenBSD 禁 core dump 并移除 `LD_` env；macOS deny attach、禁 core dump、移除 `DYLD_` env；Windows 当前是 no-op。[E: codex-rs/process-hardening/src/lib.rs:12][E: codex-rs/process-hardening/src/lib.rs:14][E: codex-rs/process-hardening/src/lib.rs:44][E: codex-rs/process-hardening/src/lib.rs:56][E: codex-rs/process-hardening/src/lib.rs:60][E: codex-rs/process-hardening/src/lib.rs:75][E: codex-rs/process-hardening/src/lib.rs:77][E: codex-rs/process-hardening/src/lib.rs:83][E: codex-rs/process-hardening/src/lib.rs:85][E: codex-rs/process-hardening/src/lib.rs:95][E: codex-rs/process-hardening/src/lib.rs:99][E: codex-rs/process-hardening/src/lib.rs:120]

## 能回答的问题

- `pre_main_hardening` 在不同 OS 上调用哪些 hardening steps？
- Linux 为什么设置 `PR_SET_DUMPABLE = 0`？
- macOS 为什么调用 `ptrace(PT_DENY_ATTACH)`？
- core dump limit 如何设置为 0？
- 哪些 dynamic loader env vars 会被清掉？
- Windows non-TTY interrupt 怎样终止 process tree 而不重复 kill？

## 职责边界

process hardening 节点只覆盖 `codex-rs/process-hardening/src/lib.rs` 中的进程级预启动防护。它不创建 sandbox，也不修改命令执行 policy；它保护的是当前 Codex 进程自身被 dump、attach 或通过 loader env 注入的风险面。[I]

Windows PTY 的 `JobObject` 是相邻的 child-process lifecycle 防护，不属于 `pre_main_hardening`：前者约束 spawned process tree，后者在 Windows 仍是 no-op。本页一并记录它，是为了避免把 “Windows pre-main no-op” 误读为 Windows child cleanup 也没有保护。[E: codex-rs/process-hardening/src/lib.rs:119][E: codex-rs/process-hardening/src/lib.rs:120][E: codex-rs/utils/pty/src/win/job.rs:17][E: codex-rs/utils/pty/src/win/job.rs:27]

## 关键 crate/文件

- `codex-rs/process-hardening/src/lib.rs`: 单文件 crate，导出 `pre_main_hardening` 并按 target OS dispatch。[E: codex-rs/process-hardening/src/lib.rs:13][E: codex-rs/process-hardening/src/lib.rs:14][E: codex-rs/process-hardening/src/lib.rs:17][E: codex-rs/process-hardening/src/lib.rs:21][E: codex-rs/process-hardening/src/lib.rs:24]

## 数据模型

该 crate 没有复杂 struct/enum；主要 public API 是 `pre_main_hardening()`，失败时在平台实现内部直接退出或 best-effort ignore。[E: codex-rs/process-hardening/src/lib.rs:13][E: codex-rs/process-hardening/src/lib.rs:47][E: codex-rs/process-hardening/src/lib.rs:77]

## 控制流

1. `pre_main_hardening` 在 Linux/Android 编译目标调用 `pre_main_hardening_linux()`；在 macOS 调用 `pre_main_hardening_macos()`；在 FreeBSD/OpenBSD 调用 `pre_main_hardening_bsd()`；在 Windows 调用 `pre_main_hardening_windows()`。[E: codex-rs/process-hardening/src/lib.rs:14][E: codex-rs/process-hardening/src/lib.rs:17][E: codex-rs/process-hardening/src/lib.rs:21][E: codex-rs/process-hardening/src/lib.rs:24]
2. Linux path 调用 `libc::prctl(libc::PR_SET_DUMPABLE, 0, 0, 0, 0)`；失败时打印错误并以 `PRCTL_FAILED_EXIT_CODE` 退出，该常量值为 5。[E: codex-rs/process-hardening/src/lib.rs:28][E: codex-rs/process-hardening/src/lib.rs:44][E: codex-rs/process-hardening/src/lib.rs:46][E: codex-rs/process-hardening/src/lib.rs:52]
3. Linux path 调用 `set_core_dump_limit_zero()`，然后删除所有 key 以 `LD_` 开头的环境变量。[E: codex-rs/process-hardening/src/lib.rs:56]
4. macOS path 调用 `ptrace(PT_DENY_ATTACH, 0, NULL, 0)`；失败时打印错误并以 `PTRACE_DENY_ATTACH_FAILED_EXIT_CODE` 退出，该常量值为 6。[E: codex-rs/process-hardening/src/lib.rs:31][E: codex-rs/process-hardening/src/lib.rs:75][E: codex-rs/process-hardening/src/lib.rs:83]
5. macOS path 调用 `set_core_file_size_limit_to_zero()`，然后删除 `DYLD_` 前缀环境变量。[E: codex-rs/process-hardening/src/lib.rs:95][E: codex-rs/process-hardening/src/lib.rs:99]
6. `set_core_file_size_limit_to_zero` 构造 `rlimit { rlim_cur: 0, rlim_max: 0 }` 并调用 `setrlimit(RLIMIT_CORE, &rlim)`；失败时打印错误并以 `SET_RLIMIT_CORE_FAILED_EXIT_CODE` 退出，该常量值为 7。[E: codex-rs/process-hardening/src/lib.rs:41][E: codex-rs/process-hardening/src/lib.rs:103][E: codex-rs/process-hardening/src/lib.rs:104][E: codex-rs/process-hardening/src/lib.rs:109][E: codex-rs/process-hardening/src/lib.rs:115]
7. `remove_env_vars_with_prefix` 遍历 `env_keys_with_prefix(std::env::vars_os(), prefix)` 的结果并调用 `remove_var`；prefix matching 在 helper 中以 raw bytes 执行。[E: codex-rs/process-hardening/src/lib.rs:125][E: codex-rs/process-hardening/src/lib.rs:126][E: codex-rs/process-hardening/src/lib.rs:128][E: codex-rs/process-hardening/src/lib.rs:134][E: codex-rs/process-hardening/src/lib.rs:140][E: codex-rs/process-hardening/src/lib.rs:142]
8. Windows `pre_main_hardening_windows` 当前只有 TODO 和 no-op body。[E: codex-rs/process-hardening/src/lib.rs:119][E: codex-rs/process-hardening/src/lib.rs:120]

## Windows PTY process tree

`JobObject::create` 建立 Windows Job Object，默认同时设置 `KILL_ON_JOB_CLOSE` 和 `BREAKAWAY_OK`；将 root process 分配进去后，关闭最后一个 handle 或显式 `terminate()` 会清理 job 中的 process tree。[E: codex-rs/utils/pty/src/win/job.rs:17][E: codex-rs/utils/pty/src/win/job.rs:27][E: codex-rs/utils/pty/src/win/job.rs:34][E: codex-rs/utils/pty/src/win/job.rs:59][E: codex-rs/utils/pty/src/win/job.rs:98][E: codex-rs/utils/pty/src/win/job.rs:107]

正常 root exit 若要保留后台 descendants，可调用 `preserve_descendants()` 去掉 kill-on-close，只保留 breakaway；同一 mutex 把 preserve/terminate 的 state check 与 OS API 调用串行化，先取得 lock 的操作决定保留或终止。assignment 不是 retroactive，分配完成前已创建的 descendants 不保证进入 job。[E: codex-rs/utils/pty/src/win/job.rs:19][E: codex-rs/utils/pty/src/win/job.rs:59][E: codex-rs/utils/pty/src/win/job.rs:73][E: codex-rs/utils/pty/src/win/job.rs:83][E: codex-rs/utils/pty/src/win/job.rs:92][E: codex-rs/utils/pty/src/win/job.rs:99][E: codex-rs/utils/pty/src/win/job.rs:103]

Windows pipe backend 的 `Interrupt` 现在调用同一 terminator：有 JobObject 时终止整个 job，否则终止单 PID。Driver-backed backend 仅在 non-TTY 且存在 terminator 时把 interrupt 映射为 termination；signal 成功后 `ProcessHandle` 取走 killer，防止 Drop 或后续 terminate 再次执行。[E: codex-rs/utils/pty/src/pipe.rs:29][E: codex-rs/utils/pty/src/pipe.rs:42][E: codex-rs/utils/pty/src/pipe.rs:51][E: codex-rs/utils/pty/src/pipe.rs:70][E: codex-rs/utils/pty/src/process.rs:229][E: codex-rs/utils/pty/src/process.rs:237][E: codex-rs/utils/pty/src/process.rs:279][E: codex-rs/utils/pty/src/process.rs:287][E: codex-rs/utils/pty/src/process.rs:390]

## 设计动机与权衡

- Linux/macOS 对 attach/dump/core-limit hardening failure 都选择显式退出，退出码分别由 `PRCTL_FAILED_EXIT_CODE`、`PTRACE_DENY_ATTACH_FAILED_EXIT_CODE`、`SET_RLIMIT_CORE_FAILED_EXIT_CODE` 常量定义。[E: codex-rs/process-hardening/src/lib.rs:28][E: codex-rs/process-hardening/src/lib.rs:31][E: codex-rs/process-hardening/src/lib.rs:41][E: codex-rs/process-hardening/src/lib.rs:52][E: codex-rs/process-hardening/src/lib.rs:91][E: codex-rs/process-hardening/src/lib.rs:115]
- 删除 `LD_`/`DYLD_` env vars 是为了缩小 dynamic loader 注入面。[I]
- Windows no-op 明确保留 TODO，表示 Windows hardening 尚未与 Unix path 对齐。[E: codex-rs/process-hardening/src/lib.rs:120]

## gotcha

- `remove_env_vars_with_prefix` 通过 `env_keys_with_prefix` 做 byte-prefix matching；测试覆盖了 non-UTF8 key 与 prefix filtering 行为。[E: codex-rs/process-hardening/src/lib.rs:125][E: codex-rs/process-hardening/src/lib.rs:134][E: codex-rs/process-hardening/src/lib.rs:140][E: codex-rs/process-hardening/src/lib.rs:142][E: codex-rs/process-hardening/src/lib.rs:157][E: codex-rs/process-hardening/src/lib.rs:181]
- `pre_main_hardening` 返回 `()`，调用者不能从 public API 获取哪些 hardening step 成功或失败。[E: codex-rs/process-hardening/src/lib.rs:13]
- Windows path 当前不执行防护逻辑；不要把该 crate 误读为跨平台等价 hardening。[E: codex-rs/process-hardening/src/lib.rs:119][E: codex-rs/process-hardening/src/lib.rs:120]

## Sources

- `codex-rs/process-hardening/src/lib.rs`
- `codex-rs/utils/pty/src/win/job.rs`
- `codex-rs/utils/pty/src/pipe.rs`
- `codex-rs/utils/pty/src/process.rs`

## 相关

- `spine.process-lifecycle`
- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.arg0-dispatch`
