---
id: subsys.exec-sandbox.sandbox-windows
title: Windows sandbox
kind: subsystem
tier: T2
source: [codex-rs/windows-sandbox-rs/src, codex-rs/windows-sandbox-rs/src/desktop.rs, codex-rs/windows-sandbox-rs/src/deny_read_walker.rs, codex-rs/sandboxing/src/manager.rs, codex-rs/sandboxing/src/policy_transforms.rs, codex-rs/sandboxing/src/windows.rs, codex-rs/protocol/src/permissions.rs, codex-rs/utils/pty/src/pipe.rs, codex-rs/utils/pty/src/process.rs, codex-rs/utils/absolute-path/src/lib.rs, codex-rs/utils/path-uri/src/lib.rs, codex-rs/core/src/context/world_state/environment.rs, codex-rs/features/src/lib.rs]
symbols: [run_windows_sandbox_capture, ResolvedWindowsSandboxPermissions, token_mode_for_permission_profile, create_readonly_token_with_cap, create_workspace_write_token_with_caps_from, prepare_legacy_spawn_context, prepare_elevated_spawn_context_for_permissions, spawn_windows_sandbox_session_legacy, spawn_windows_sandbox_session_elevated_for_permission_profile, normalize_windows_device_path, PathUri]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Windows sandbox backend 用 Windows restricted token、capability SID、ACL allow/deny、可选 private desktop、以及 elevated runner IPC 两条 spawn 路径来执行 read-only 或 workspace-write policy 下的命令。[I]

## 能回答的问题

- Windows sandbox 支持哪些 policy preset，拒绝哪些 policy？
- legacy restricted-token path 与 elevated runner path 的 spawn 差异是什么？
- token、capability SID、workspace ACL、null device allow 是怎样组合的？
- `SpawnRequest` 在 elevated unified exec 中如何流向 sandbox user runner？
- Windows sandbox 在非 Windows target 上的行为是什么？
- non-TTY interrupt、symbolic `:slash_tmp` 和 Windows namespace path 怎样跨 platform boundary 处理？
- private desktop 与 deny-read glob walker 怎样工作？
- 模型看到的 PowerShell 版本从哪里来？

## 职责边界

`codex_sandboxing::SandboxManager` 只把 `WindowsRestrictedToken` 带到 `SandboxExecRequest`；它不在 manager 层改写 argv。[E: codex-rs/sandboxing/src/manager.rs:442][E: codex-rs/sandboxing/src/manager.rs:444][E: codex-rs/sandboxing/src/manager.rs:452] Windows token、ACL、runner IPC 和 process creation 都在 `codex-rs/windows-sandbox-rs/src` 内实现。[I]

Windows policy resolution starts from a managed `PermissionProfile`: `ResolvedWindowsSandboxPermissions::try_from_permission_profile` rejects non-managed profiles and non-restricted filesystem policies, `try_from_permission_profile_for_workspace_roots` materializes workspace-root entries, and `token_mode_for_permission_profile` rejects full-disk write access before choosing read-only or writable-root capability token mode.[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:39][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:45][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:50][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:55][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:63][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:64][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:70][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:83][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:87][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:88][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:90]

Managed deny-read rules 不能走 unelevated restricted-token path：`resolve_windows_deny_read_paths` 得到非空路径时直接拒绝，因为 WRITE_RESTRICTED token 的 capability SID deny-read ACE 不参与 read access checks。deny-read 必须用 elevated backend。[E: codex-rs/sandboxing/src/windows.rs:113][E: codex-rs/sandboxing/src/windows.rs:120][E: codex-rs/sandboxing/src/windows.rs:124][E: codex-rs/sandboxing/src/windows.rs:126]

## 关键 crate/文件

- `codex-rs/windows-sandbox-rs/src/lib.rs`: exports Windows sandbox APIs, capture wrappers, Windows-only implementation module, and non-Windows stubs.[E: codex-rs/windows-sandbox-rs/src/lib.rs:321][E: codex-rs/windows-sandbox-rs/src/lib.rs:325][E: codex-rs/windows-sandbox-rs/src/lib.rs:333][E: codex-rs/windows-sandbox-rs/src/lib.rs:335][E: codex-rs/windows-sandbox-rs/src/lib.rs:351][E: codex-rs/windows-sandbox-rs/src/lib.rs:355][E: codex-rs/windows-sandbox-rs/src/lib.rs:358][E: codex-rs/windows-sandbox-rs/src/lib.rs:363][E: codex-rs/windows-sandbox-rs/src/lib.rs:481][E: codex-rs/windows-sandbox-rs/src/lib.rs:508][E: codex-rs/windows-sandbox-rs/src/lib.rs:844]
- `codex-rs/windows-sandbox-rs/src/token.rs`: 从当前 token 创建 restricted token，设置 restricting SID entries，启用 capability SID、logon SID 和 write-restricted token flags。[E: codex-rs/windows-sandbox-rs/src/token.rs:448][E: codex-rs/windows-sandbox-rs/src/token.rs:462][E: codex-rs/windows-sandbox-rs/src/token.rs:479][E: codex-rs/windows-sandbox-rs/src/token.rs:480][E: codex-rs/windows-sandbox-rs/src/token.rs:481]
- `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs`: converts managed permission profiles into Windows-local filesystem/network permissions and token mode decisions.[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:20][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:33][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:39][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:63][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:83]
- `codex-rs/windows-sandbox-rs/src/spawn_prep.rs`: common/legacy/elevated spawn context 准备，包含 permission resolution、network block env rewrite、cap SID、allow/deny paths、workspace metadata protection 和 sandbox credentials。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:83][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:91][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:113][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:123][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:141][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:147][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:267][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:339][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:349]
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs`: legacy unified exec 用 restricted token 直接 spawn ConPTY 或 pipe process。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:89][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:90][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:104][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:314][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:315][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:327]
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs`: elevated unified exec resolves permissions, prepares `SpawnRequest`, starts runner transport, bridges stdin/stdout/stderr/resize/terminate, and finishes a `ProcessDriver`.[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:149][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:177][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:182][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:198][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:204][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:228][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:240][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:254][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:261]
- `codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs`: elevated runner 在 sandbox user 下读取 `SpawnRequest`，根据 permission profile token mode 创建 restricted token，spawn child，并用 framed IPC 返回 output/exit。[E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:196][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:238][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:241][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:275][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:308][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:315][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:351]

## 数据模型

- `AllowDenyPaths`: Windows ACL policy 计算输出，包含 allow set 与 deny set。[E: codex-rs/windows-sandbox-rs/src/allow.rs:8][E: codex-rs/windows-sandbox-rs/src/allow.rs:9][E: codex-rs/windows-sandbox-rs/src/allow.rs:10][E: codex-rs/windows-sandbox-rs/src/allow.rs:11]
- `SpawnContext`: common spawn context contains resolved Windows permissions, current dir, optional logs base dir, and whether the profile uses write capabilities for the cwd/env.[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:44][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:45][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:46][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:47][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:48]
- `ElevatedSpawnContext`: elevated path 在 common context 之外包含 sandbox base/log dir、sandbox user credentials 和 capability SID strings。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:51][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:52][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:53][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:54][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:55]
- `SpawnRequest`: elevated runner IPC payload，包含 command、cwd、env、permission profile、workspace roots、Codex homes、cap SIDs、timeout、tty、stdin 和 private desktop 标志。[E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:59][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:60][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:61][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:62][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:63][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:64][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:65][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:66][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:67][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:71][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:72][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:74][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:78]

## 控制流

1. Legacy capture path 调用 `prepare_legacy_spawn_context`，从 `PermissionProfile` 解析 resolved permissions、准备当前目录/日志目录/网络限制，并判断是否需要 write capabilities。[E: codex-rs/windows-sandbox-rs/src/lib.rs:529][E: codex-rs/windows-sandbox-rs/src/lib.rs:536][E: codex-rs/windows-sandbox-rs/src/lib.rs:540][E: codex-rs/windows-sandbox-rs/src/lib.rs:544][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:83][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:91][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:107][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:110][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:113][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:123][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:141]
2. read-only or writable-root capability mode controls restricted token creation: legacy mode calls readonly/workspace-write token helpers, while elevated runner calls `token_mode_for_permission_profile` and selects readonly or writable-root token helpers with the sandbox user's token.[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:147][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:152][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:155][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:165][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:170][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:238][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:241][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:275][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:276][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:283]
3. `compute_allow_paths_for_permissions` derives allow/deny paths from writable roots and read-only subpaths, retaining only existing paths.[E: codex-rs/windows-sandbox-rs/src/allow.rs:14][E: codex-rs/windows-sandbox-rs/src/allow.rs:22][E: codex-rs/windows-sandbox-rs/src/allow.rs:27][E: codex-rs/windows-sandbox-rs/src/allow.rs:33][E: codex-rs/windows-sandbox-rs/src/allow.rs:36][E: codex-rs/windows-sandbox-rs/src/allow.rs:41]
4. legacy capture path applies allow/deny ACL rules, allows the null device, creates stdio pipes, and then calls `create_process_as_user` with inherited stdio handles.[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:267][E: codex-rs/windows-sandbox-rs/src/lib.rs:560][E: codex-rs/windows-sandbox-rs/src/lib.rs:561][E: codex-rs/windows-sandbox-rs/src/lib.rs:574][E: codex-rs/windows-sandbox-rs/src/lib.rs:577][E: codex-rs/windows-sandbox-rs/src/lib.rs:592]
5. `create_process_as_user` 构造 Windows command line 和 env block，使用 `LaunchDesktop::prepare`，在 stdio 模式下用 `STARTUPINFOEX` handle list 配合 `EXTENDED_STARTUPINFO_PRESENT` 启动进程。[E: codex-rs/windows-sandbox-rs/src/process.rs:83][E: codex-rs/windows-sandbox-rs/src/process.rs:92][E: codex-rs/windows-sandbox-rs/src/process.rs:94][E: codex-rs/windows-sandbox-rs/src/process.rs:95][E: codex-rs/windows-sandbox-rs/src/process.rs:100][E: codex-rs/windows-sandbox-rs/src/process.rs:133][E: codex-rs/windows-sandbox-rs/src/process.rs:137]
6. elevated unified exec first resolves permissions, calls `prepare_elevated_spawn_context_for_permissions`, then constructs `RunnerTransportRequest` with a nested `SpawnRequest` and starts runner transport; the client waits for `SpawnReady` before converting named pipe files into driver channels.[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:177][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:182][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:198][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:204][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:228][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:151][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:161][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:174]
7. runner client 用 `CreateProcessWithLogonW` 以 sandbox user 启动 `codex-command-runner.exe`，connects the named pipes, sends the spawn request, waits for spawn-ready, and then transfers the pipe files to the driver.[E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:354][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:385][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:386][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:412][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:422][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:423]
8. runner 读取 `SpawnRequest` 后用 sandbox user 当前 token 派生 read-only 或 writable-root restricted token，再用 ConPTY 或 anonymous pipes spawn 实际命令。[E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:196][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:238][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:241][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:275][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:308][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:315][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:351]
9. unified Windows driver 把 `Stdin`、`CloseStdin`、`Resize`、`Terminate` frame 写给 runner，把 runner 返回的 `Output` 和 `Exit` frame 映射到 `ProcessDriver` 的 stdout/stderr/exit 通道。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:43][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:57][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:69][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:80][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:110][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:127]
10. `ProcessDriver` 保存真实 `tty`；Windows 只有 non-TTY 且存在 terminator 时把 `Interrupt` 映射成 termination。Pipe backend 会 terminate JobObject 或单进程，成功 signal 后移除 killer，避免 Drop/后续 terminate 重复执行；ConPTY 不走这条强制终止语义。[E: codex-rs/utils/pty/src/pipe.rs:30][E: codex-rs/utils/pty/src/pipe.rs:45][E: codex-rs/utils/pty/src/pipe.rs:51][E: codex-rs/utils/pty/src/pipe.rs:77][E: codex-rs/utils/pty/src/process.rs:229][E: codex-rs/utils/pty/src/process.rs:237][E: codex-rs/utils/pty/src/process.rs:240][E: codex-rs/utils/pty/src/process.rs:374][E: codex-rs/utils/pty/src/process.rs:392]

## 设计动机与权衡

- legacy path 直接在当前用户上下文中创建 restricted token 并修改 ACL；elevated path 先切到 sandbox user runner，再由 runner 创建更小的 restricted token，适合需要独立 sandbox identity/ACL orchestration 的场景。[I]
- `create_token_with_caps_from` 使用 `DISABLE_MAX_PRIVILEGE | LUA_TOKEN | WRITE_RESTRICTED` 创建 restricted token，这表明 Windows backend 同时依赖 token privilege reduction 与 write-restricted SID 机制。[E: codex-rs/windows-sandbox-rs/src/token.rs:448][E: codex-rs/windows-sandbox-rs/src/token.rs:480][E: codex-rs/windows-sandbox-rs/src/token.rs:481]
- Windows ACL preparation 本身显式保护 command cwd 下的 `.codex` 与 `.agents`；更上层的 restricted filesystem policy 还把 `.git`、`.agents`、`.codex` 都作为 writable project root 下的默认 read-only metadata，除非存在更窄的显式 write entry。因此 writable root 不是敏感 metadata children 的无条件写授权。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:339][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:340][E: codex-rs/windows-sandbox-rs/src/workspace_acl.rs:13][E: codex-rs/protocol/src/permissions.rs:27][E: codex-rs/protocol/src/permissions.rs:32][E: codex-rs/protocol/src/permissions.rs:62][E: codex-rs/protocol/src/permissions.rs:789][E: codex-rs/protocol/src/permissions.rs:790][E: codex-rs/protocol/src/permissions.rs:791]
- write allow ACE 不再在 parent 授予 `FILE_DELETE_CHILD`，而是在可继承的 descendant 授予 `DELETE`；`ensure_allow_write_aces` 会把仍含 `FILE_DELETE_CHILD` 的 stale ACE 视为需要替换，避免 parent grant 绕过 `.git` 或显式 read-only child 上的 deny-write。[E: codex-rs/windows-sandbox-rs/src/acl.rs:359][E: codex-rs/windows-sandbox-rs/src/acl.rs:360][E: codex-rs/windows-sandbox-rs/src/acl.rs:327][E: codex-rs/windows-sandbox-rs/src/acl.rs:329][E: codex-rs/windows-sandbox-rs/src/acl.rs:372][E: codex-rs/windows-sandbox-rs/src/acl.rs:507][E: codex-rs/windows-sandbox-rs/src/acl.rs:511][E: codex-rs/windows-sandbox-rs/src/acl.rs:512][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:294][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:298]
- setup orchestration 对相同 base64 payload 做 in-process singleflight：第一个 caller 执行 helper，同 key 的 waiter 共享成功或保留 `SetupErrorCode` 的失败结果；refresh 与 full setup 都经过该合并层。[E: codex-rs/windows-sandbox-rs/src/setup.rs:144][E: codex-rs/windows-sandbox-rs/src/setup.rs:146][E: codex-rs/windows-sandbox-rs/src/setup.rs:152][E: codex-rs/windows-sandbox-rs/src/setup.rs:157][E: codex-rs/windows-sandbox-rs/src/setup.rs:163][E: codex-rs/windows-sandbox-rs/src/setup.rs:169][E: codex-rs/windows-sandbox-rs/src/setup.rs:327]
- setup 为 sandbox group 补齐 read/execute ACL 的 runtime roots 现在还包含 `%USERPROFILE%/.cache/codex-runtimes`；elevated pipe runner 只对 filesystem helper arg 选择 `ConsoleMode::NoWindow`/`CREATE_NO_WINDOW`，其它命令继承 console。[E: codex-rs/windows-sandbox-rs/src/bin/setup_main/win/setup_runtime_bin.rs:19][E: codex-rs/windows-sandbox-rs/src/bin/setup_main/win/setup_runtime_bin.rs:24][E: codex-rs/windows-sandbox-rs/src/bin/setup_main/win/setup_runtime_bin.rs:27][E: codex-rs/windows-sandbox-rs/src/bin/setup_main/win/setup_runtime_bin.rs:103][E: codex-rs/windows-sandbox-rs/src/process.rs:46][E: codex-rs/windows-sandbox-rs/src/process.rs:47][E: codex-rs/windows-sandbox-rs/src/process.rs:48][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:358][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:359][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:361]

## Private desktop 与 deny-read walker

`desktop.rs` 用 `CreateDesktopW` 创建 `CodexSandboxDesktop-*` private desktop（按 policy 复用 shared map）；participant ACL 是 `DESKTOP_ALL_ACCESS` 去掉 `WRITE_DAC`/`WRITE_OWNER`/`DELETE`。这是窗口隔离，不是 restricted token 本身。[E: codex-rs/windows-sandbox-rs/src/desktop.rs:66][E: codex-rs/windows-sandbox-rs/src/desktop.rs:82][E: codex-rs/windows-sandbox-rs/src/desktop.rs:85][E: codex-rs/windows-sandbox-rs/src/desktop.rs:305][E: codex-rs/windows-sandbox-rs/src/desktop.rs:308]

`deny_read_walker.rs` 把 deny-read glob 展开成现有路径快照：不可访问/消失的分支无法枚举，但匹配到的目录会在读 children 前保留；unexpected I/O 中止 snapshot。这不能替代 elevated backend：legacy restricted-token 路径遇到非空 deny-read 仍直接拒绝。[E: codex-rs/windows-sandbox-rs/src/deny_read_walker.rs:24][E: codex-rs/windows-sandbox-rs/src/deny_read_walker.rs:24][E: codex-rs/windows-sandbox-rs/src/deny_read_walker.rs:32][E: codex-rs/sandboxing/src/windows.rs:120][E: codex-rs/sandboxing/src/windows.rs:124]

## Model-visible PowerShell version

Windows sandbox crate **不**探测 PowerShell 版本。`Feature::PowerShellShellVersion` 打开且当前单本地环境是 PowerShell 时，`EnvironmentsState` 才把 `$PSVersionTable.PSVersion` 的 major.minor 写进 env context `<shell_version>`。[E: codex-rs/features/src/lib.rs:161][E: codex-rs/features/src/lib.rs:933][E: codex-rs/core/src/context/world_state/environment.rs:45][E: codex-rs/core/src/context/world_state/environment.rs:53][E: codex-rs/core/src/context/world_state/environment.rs:288][E: codex-rs/core/src/context/world_state/environment.rs:394]

## Windows permission/path portability

Symbolic `FileSystemSpecialPath::SlashTmp` 在非 Unix 上不会形成 deny-read 或 full-write narrowing，也不会被 policy transform 解析成字面 `/tmp`。配置里的普通 path `/tmp` 仍是普通 path；被忽略的是 special `:slash_tmp` token。[E: codex-rs/protocol/src/permissions.rs:629][E: codex-rs/protocol/src/permissions.rs:636][E: codex-rs/protocol/src/permissions.rs:718][E: codex-rs/sandboxing/src/policy_transforms.rs:428][E: codex-rs/sandboxing/src/policy_transforms.rs:433]

Windows device/verbatim drive 和 namespace UNC aliases 先经 `normalize_windows_device_path` 规范化，再转为 canonical drive/UNC file URI；含混 namespace form、null 或无法安全表达的 path 保持 UTF-16LE opaque URI。这样 remote/app host 不需要把 executor path 当成本机 path 解释。[E: codex-rs/utils/absolute-path/src/lib.rs:152][E: codex-rs/utils/absolute-path/src/lib.rs:156][E: codex-rs/utils/absolute-path/src/lib.rs:161][E: codex-rs/utils/path-uri/src/lib.rs:756][E: codex-rs/utils/path-uri/src/lib.rs:767][E: codex-rs/utils/path-uri/src/lib.rs:783][E: codex-rs/utils/path-uri/src/lib.rs:832]

`PathUri::join` 支持 same-drive relative path；跨 drive relative path 因其 current directory 属于 executor 而拒绝。Absolute path 则替换 base URI path。[E: codex-rs/utils/path-uri/src/lib.rs:445][E: codex-rs/utils/path-uri/src/lib.rs:461][E: codex-rs/utils/path-uri/src/lib.rs:465][E: codex-rs/utils/path-uri/src/lib.rs:477]

## gotcha

- non-Windows target 上 `run_windows_sandbox_capture`、preflight 等函数由 stub export 接管，会返回 “Windows sandbox is only available on Windows”。[E: codex-rs/windows-sandbox-rs/src/lib.rs:355][E: codex-rs/windows-sandbox-rs/src/lib.rs:356][E: codex-rs/windows-sandbox-rs/src/lib.rs:358][E: codex-rs/windows-sandbox-rs/src/lib.rs:360][E: codex-rs/windows-sandbox-rs/src/lib.rs:844][E: codex-rs/windows-sandbox-rs/src/lib.rs:863][E: codex-rs/windows-sandbox-rs/src/lib.rs:874][E: codex-rs/windows-sandbox-rs/src/lib.rs:877][E: codex-rs/windows-sandbox-rs/src/lib.rs:884]
- legacy path requires full-disk read access and cannot enforce deny-read overrides; restricted read-only or explicit deny-read overrides require the elevated backend.[E: codex-rs/windows-sandbox-rs/src/lib.rs:545][E: codex-rs/windows-sandbox-rs/src/lib.rs:547]
- `make_env_block` 会按 case-insensitive key 排序并生成双 NUL 结尾的 Windows environment block，直接传普通 map 给 Windows API 不是这里的最终形态。[E: codex-rs/windows-sandbox-rs/src/process.rs:51][E: codex-rs/windows-sandbox-rs/src/process.rs:52][E: codex-rs/windows-sandbox-rs/src/process.rs:54][E: codex-rs/windows-sandbox-rs/src/process.rs:59][E: codex-rs/windows-sandbox-rs/src/process.rs:64][E: codex-rs/windows-sandbox-rs/src/process.rs:66]

## Sources

- `codex-rs/windows-sandbox-rs/src/lib.rs`
- `codex-rs/windows-sandbox-rs/src/desktop.rs`
- `codex-rs/windows-sandbox-rs/src/deny_read_walker.rs`
- `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs`
- `codex-rs/windows-sandbox-rs/src/token.rs`
- `codex-rs/windows-sandbox-rs/src/allow.rs`
- `codex-rs/windows-sandbox-rs/src/process.rs`
- `codex-rs/windows-sandbox-rs/src/spawn_prep.rs`
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs`
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs`
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs`
- `codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs`
- `codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs`
- `codex-rs/sandboxing/src/manager.rs`
- `codex-rs/sandboxing/src/policy_transforms.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/utils/pty/src/pipe.rs`
- `codex-rs/utils/pty/src/process.rs`
- `codex-rs/utils/absolute-path/src/lib.rs`
- `codex-rs/utils/path-uri/src/lib.rs`
- `codex-rs/core/src/context/world_state/environment.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
