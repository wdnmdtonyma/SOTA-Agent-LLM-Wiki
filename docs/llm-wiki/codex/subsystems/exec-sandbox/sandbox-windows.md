---
id: subsys.exec-sandbox.sandbox-windows
title: Windows sandbox
kind: subsystem
tier: T2
source: [codex-rs/windows-sandbox-rs/src, codex-rs/sandboxing/src/manager.rs]
symbols: [run_windows_sandbox_capture, parse_policy, create_token_with_caps_from, prepare_legacy_spawn_context, prepare_elevated_spawn_context, spawn_windows_sandbox_session_legacy, spawn_windows_sandbox_session_elevated]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Windows sandbox backend 用 Windows restricted token、capability SID、ACL allow/deny、可选 private desktop、以及 Elevated runner IPC 两条 spawn 路径来执行 read-only 或 workspace-write policy 下的命令。[I]

## 能回答的问题

- Windows sandbox 支持哪些 policy preset，拒绝哪些 policy？
- legacy restricted-token path 与 elevated runner path 的 spawn 差异是什么？
- token、capability SID、workspace ACL、null device allow 是怎样组合的？
- `SpawnRequest` 在 elevated unified exec 中如何流向 sandbox user runner？
- Windows sandbox 在非 Windows target 上的行为是什么？

## 职责边界

`codex_sandboxing::SandboxManager` 只把 `WindowsRestrictedToken` 带到 `SandboxExecRequest`；它不在 manager 层改写 argv。[E: codex-rs/sandboxing/src/manager.rs:253][E: codex-rs/sandboxing/src/manager.rs:256] Windows token、ACL、runner IPC 和 process creation 都在 `codex-rs/windows-sandbox-rs/src` 内实现。[I]

Windows policy parser 只接受 `read-only` 与 `workspace-write` 两类 preset/JSON policy，显式拒绝 `danger-full-access` 和 `external-sandbox`。[E: codex-rs/windows-sandbox-rs/src/policy.rs:4][E: codex-rs/windows-sandbox-rs/src/policy.rs:5][E: codex-rs/windows-sandbox-rs/src/policy.rs:11][E: codex-rs/windows-sandbox-rs/src/policy.rs:14][E: codex-rs/windows-sandbox-rs/src/policy.rs:20][E: codex-rs/windows-sandbox-rs/src/policy.rs:21]

## 关键 crate/文件

- `codex-rs/windows-sandbox-rs/src/lib.rs`: 公开 Windows sandbox API，包含 capture wrapper、legacy spawn preparation、non-Windows stub。[E: codex-rs/windows-sandbox-rs/src/lib.rs:76][E: codex-rs/windows-sandbox-rs/src/lib.rs:314][E: codex-rs/windows-sandbox-rs/src/lib.rs:349][E: codex-rs/windows-sandbox-rs/src/lib.rs:675]
- `codex-rs/windows-sandbox-rs/src/token.rs`: 从当前 token 创建 restricted token，设置 default DACL，启用 capability SID 与 logon SID。[E: codex-rs/windows-sandbox-rs/src/token.rs:52][E: codex-rs/windows-sandbox-rs/src/token.rs:144][E: codex-rs/windows-sandbox-rs/src/token.rs:329][E: codex-rs/windows-sandbox-rs/src/token.rs:354]
- `codex-rs/windows-sandbox-rs/src/spawn_prep.rs`: common/legacy/elevated spawn context 准备，包含 policy parse、network block env rewrite、cap SID、allow/deny paths 和 sandbox credentials。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:89][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:132][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:156][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:267]
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs`: legacy unified exec 用 restricted token 直接 spawn ConPTY 或 pipe process。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:69][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:87][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:291]
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs`: elevated unified exec 准备 `SpawnRequest`，启动 runner transport，桥接 stdin/stdout/stderr/resize/terminate。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:34][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:43][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:61][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:81]
- `codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs`: elevated runner 在 sandbox user 下读取 `SpawnRequest`，创建 restricted token，spawn child，并用 framed IPC 返回 output/exit。[E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:155][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:189][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:204][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:306]

## 数据模型

- `AllowDenyPaths`: Windows ACL policy 计算输出，包含 allow set 与 deny set。[E: codex-rs/windows-sandbox-rs/src/allow.rs:8][E: codex-rs/windows-sandbox-rs/src/allow.rs:9][E: codex-rs/windows-sandbox-rs/src/allow.rs:10]
- `SpawnContext`: common spawn context 包含 parsed sandbox policy、current dir、sandbox base dir、optional logs base dir 和 workspace-write flag。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:38][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:39][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:40][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:41][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:42][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:43]
- `ElevatedSpawnContext`: elevated path 在 common context 之外包含 sandbox user credentials 和 capability SID strings。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:46][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:47][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:48][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:49]
- `SpawnRequest`: elevated runner IPC payload，包含 command、cwd、env、policy、policy cwd、Codex homes、cap SIDs、timeout、tty、stdin 和 private desktop 标志。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:43][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:44][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:45][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:46][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:47][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:48][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:49][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:50][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:51][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:52][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:53][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:54][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:55]

## 控制流

1. Legacy capture path 调用 `prepare_legacy_spawn_context`，解析 policy、准备当前目录/日志目录/网络限制，并判断是否 workspace-write。[E: codex-rs/windows-sandbox-rs/src/lib.rs:349][E: codex-rs/windows-sandbox-rs/src/lib.rs:358][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:89][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:121]
2. read-only 或 workspace-write policy 会创建对应 restricted token；workspace-write path 还会给 logon SID 和 workspace-specific SID 计算 ACL。[E: codex-rs/windows-sandbox-rs/src/lib.rs:367][E: codex-rs/windows-sandbox-rs/src/lib.rs:387][E: codex-rs/windows-sandbox-rs/src/token.rs:284][E: codex-rs/windows-sandbox-rs/src/token.rs:314]
3. `compute_allow_paths` 只保留存在的 allow/deny path；workspace-write 会加入 command cwd 与 writable roots，并对 `.git`、`.codex`、`.agents` 生成 deny paths。[E: codex-rs/windows-sandbox-rs/src/allow.rs:20][E: codex-rs/windows-sandbox-rs/src/allow.rs:41][E: codex-rs/windows-sandbox-rs/src/allow.rs:55][E: codex-rs/windows-sandbox-rs/src/allow.rs:92]
4. legacy capture path 对 allow paths 添加 allow ACE，对 deny paths 添加 deny-write ACE，允许 null device，然后通过 `create_process_as_user` spawn 子进程并传入 stdio handles。[E: codex-rs/windows-sandbox-rs/src/lib.rs:421][E: codex-rs/windows-sandbox-rs/src/lib.rs:442][E: codex-rs/windows-sandbox-rs/src/lib.rs:450][E: codex-rs/windows-sandbox-rs/src/lib.rs:457][E: codex-rs/windows-sandbox-rs/src/lib.rs:464]
5. `create_process_as_user` 构造 Windows command line 和 env block，使用 `LaunchDesktop::prepare`，在 stdio 模式下用 `STARTUPINFOEX` handle list 配合 `EXTENDED_STARTUPINFO_PRESENT` 启动进程。[E: codex-rs/windows-sandbox-rs/src/process.rs:78][E: codex-rs/windows-sandbox-rs/src/process.rs:95][E: codex-rs/windows-sandbox-rs/src/process.rs:112][E: codex-rs/windows-sandbox-rs/src/process.rs:143]
6. elevated unified exec 先 `prepare_elevated_spawn_context`，再构造 `SpawnRequest` 并通过 `spawn_runner_transport` 启动 runner，等待 `SpawnReady` 后把 named pipe 文件转换为 driver 通道。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:34][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:43][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:61][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:64][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:65][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:70]
7. runner client 用 `CreateProcessWithLogonW` 以 sandbox user 启动 `codex-command-runner.exe`，并用只允许 sandbox username 的 named pipe 交换 framed messages。[E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:78][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:80][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:84][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:108]
8. runner 读取 `SpawnRequest` 后用 sandbox user 当前 token 派生 read-only 或 workspace-write restricted token，再用 ConPTY 或 anonymous pipes spawn 实际命令。[E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:155][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:204][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:207][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:211][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:239][E: codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs:271]
9. unified Windows driver 把 `Stdin`、`CloseStdin`、`Resize`、`Terminate` frame 写给 runner，把 runner 返回的 `Output` 和 `Exit` frame 映射到 `ProcessDriver` 的 stdout/stderr/exit 通道。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:58][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:72][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:95][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:126][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:142]

## 设计动机与权衡

- legacy path 直接在当前用户上下文中创建 restricted token 并修改 ACL；elevated path 先切到 sandbox user runner，再由 runner 创建更小的 restricted token，适合需要独立 sandbox identity/ACL orchestration 的场景。[I]
- `create_token_with_caps_from` 使用 `DISABLE_MAX_PRIVILEGE | LUA_TOKEN | WRITE_RESTRICTED` 创建 restricted token，这表明 Windows backend 同时依赖 token privilege reduction 与 write-restricted SID 机制。[E: codex-rs/windows-sandbox-rs/src/token.rs:354][E: codex-rs/windows-sandbox-rs/src/token.rs:356]
- `.git`、`.codex`、`.agents` 在 workspace-write roots 下被加入 deny list，说明 workspace-write 并不是对整个 workspace 的无条件写入许可。[E: codex-rs/windows-sandbox-rs/src/allow.rs:55][E: codex-rs/windows-sandbox-rs/src/allow.rs:60]

## gotcha

- non-Windows target 上 `run_windows_sandbox_capture`、preflight、setup 等函数都是 stub，会返回 “Windows sandbox is only available on Windows”。[E: codex-rs/windows-sandbox-rs/src/lib.rs:675][E: codex-rs/windows-sandbox-rs/src/lib.rs:724]
- `prepare_legacy_spawn_context` 在 read-only policy 且 restricted read-only filesystem 存在时要求 elevated backend；legacy path 会 bail。[E: codex-rs/windows-sandbox-rs/src/lib.rs:362][E: codex-rs/windows-sandbox-rs/src/lib.rs:366]
- `make_env_block` 会按 case-insensitive key 排序并生成双 NUL 结尾的 Windows environment block，直接传普通 map 给 Windows API 不是这里的最终形态。[E: codex-rs/windows-sandbox-rs/src/process.rs:39][E: codex-rs/windows-sandbox-rs/src/process.rs:45][E: codex-rs/windows-sandbox-rs/src/process.rs:53]

## Sources

- `codex-rs/windows-sandbox-rs/src/lib.rs`
- `codex-rs/windows-sandbox-rs/src/policy.rs`
- `codex-rs/windows-sandbox-rs/src/token.rs`
- `codex-rs/windows-sandbox-rs/src/allow.rs`
- `codex-rs/windows-sandbox-rs/src/process.rs`
- `codex-rs/windows-sandbox-rs/src/spawn_prep.rs`
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs`
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs`
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs`
- `codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs`
- `codex-rs/windows-sandbox-rs/src/elevated/command_runner_win.rs`
- `codex-rs/sandboxing/src/manager.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
