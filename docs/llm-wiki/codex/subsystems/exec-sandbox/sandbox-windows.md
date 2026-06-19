---
id: subsys.exec-sandbox.sandbox-windows
title: Windows sandbox
kind: subsystem
tier: T2
source: [codex-rs/windows-sandbox-rs/src, codex-rs/sandboxing/src/manager.rs]
symbols: [run_windows_sandbox_capture, ResolvedWindowsSandboxPermissions, token_mode_for_permission_profile, create_readonly_token_with_cap, create_workspace_write_token_with_caps_from, prepare_legacy_spawn_context, prepare_elevated_spawn_context_for_permissions, spawn_windows_sandbox_session_legacy, spawn_windows_sandbox_session_elevated_for_permission_profile]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 5670360009
---

> Windows sandbox backend 用 Windows restricted token、capability SID、ACL allow/deny、可选 private desktop、以及 Elevated runner IPC 两条 spawn 路径来执行 read-only 或 workspace-write policy 下的命令。[I]

## 能回答的问题

- Windows sandbox 支持哪些 policy preset，拒绝哪些 policy？
- legacy restricted-token path 与 elevated runner path 的 spawn 差异是什么？
- token、capability SID、workspace ACL、null device allow 是怎样组合的？
- `SpawnRequest` 在 elevated unified exec 中如何流向 sandbox user runner？
- Windows sandbox 在非 Windows target 上的行为是什么？

## 职责边界

`codex_sandboxing::SandboxManager` 只把 `WindowsRestrictedToken` 带到 `SandboxExecRequest`；它不在 manager 层改写 argv。[E: codex-rs/sandboxing/src/manager.rs:389][E: codex-rs/sandboxing/src/manager.rs:390][E: codex-rs/sandboxing/src/manager.rs:391][E: codex-rs/sandboxing/src/manager.rs:392][E: codex-rs/sandboxing/src/manager.rs:393][E: codex-rs/sandboxing/src/manager.rs:400] Windows token、ACL、runner IPC 和 process creation 都在 `codex-rs/windows-sandbox-rs/src` 内实现。[I]

Windows policy resolution now starts from a managed `PermissionProfile`: `ResolvedWindowsSandboxPermissions::try_from_permission_profile` rejects non-managed profiles and non-restricted filesystem policies, `try_from_permission_profile_for_workspace_roots` materializes workspace-root entries, and `token_mode_for_permission_profile` rejects full-disk write access before choosing read-only or writable-root capability token mode.[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:38][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:44][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:49][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:54][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:61][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:63][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:69][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:82][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:86][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:87][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:89]

## 关键 crate/文件

- `codex-rs/windows-sandbox-rs/src/lib.rs`: exports Windows sandbox APIs, capture wrappers, Windows-only implementation module, and non-Windows stubs.[E: codex-rs/windows-sandbox-rs/src/lib.rs:300][E: codex-rs/windows-sandbox-rs/src/lib.rs:312][E: codex-rs/windows-sandbox-rs/src/lib.rs:314][E: codex-rs/windows-sandbox-rs/src/lib.rs:333][E: codex-rs/windows-sandbox-rs/src/lib.rs:335][E: codex-rs/windows-sandbox-rs/src/lib.rs:340][E: codex-rs/windows-sandbox-rs/src/lib.rs:455][E: codex-rs/windows-sandbox-rs/src/lib.rs:482][E: codex-rs/windows-sandbox-rs/src/lib.rs:788]
- `codex-rs/windows-sandbox-rs/src/token.rs`: 从当前 token 创建 restricted token，设置 default DACL，启用 capability SID 与 logon SID。[E: codex-rs/windows-sandbox-rs/src/token.rs:52][E: codex-rs/windows-sandbox-rs/src/token.rs:144][E: codex-rs/windows-sandbox-rs/src/token.rs:329][E: codex-rs/windows-sandbox-rs/src/token.rs:354]
- `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs`: converts managed permission profiles into Windows-local filesystem/network permissions and token mode decisions.[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:19][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:32][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:38][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:61][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:82]
- `codex-rs/windows-sandbox-rs/src/spawn_prep.rs`: common/legacy/elevated spawn context 准备，包含 permission resolution、network block env rewrite、cap SID、allow/deny paths 和 sandbox credentials。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:82][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:91][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:122][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:140][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:146][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:348][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:400]
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs`: legacy unified exec 用 restricted token 直接 spawn ConPTY 或 pipe process。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:72][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:73][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:90][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:272][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:286]
- `codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs`: elevated unified exec resolves permissions, prepares `SpawnRequest`, starts runner transport, bridges stdin/stdout/stderr/resize/terminate, and finishes a `ProcessDriver`.[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:77][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:82][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:96][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:114][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:148][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:159][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:173][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:180]
- `codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs`: elevated runner 在 sandbox user 下读取 `SpawnRequest`，根据 permission profile token mode 创建 restricted token，spawn child，并用 framed IPC 返回 output/exit。[E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:186][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:236][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:239][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:263][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:286]

## 数据模型

- `AllowDenyPaths`: Windows ACL policy 计算输出，包含 allow set 与 deny set。[E: codex-rs/windows-sandbox-rs/src/allow.rs:8][E: codex-rs/windows-sandbox-rs/src/allow.rs:9][E: codex-rs/windows-sandbox-rs/src/allow.rs:10]
- `SpawnContext`: common spawn context contains resolved Windows permissions, current dir, optional logs base dir, and whether the profile uses write capabilities for the cwd/env.[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:43][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:44][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:45][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:46][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:47]
- `ElevatedSpawnContext`: elevated path 在 common context 之外包含 sandbox base/log dir、sandbox user credentials 和 capability SID strings。[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:50][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:51][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:52][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:53][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:54]
- `SpawnRequest`: elevated runner IPC payload，包含 command、cwd、env、permission profile、workspace roots、Codex homes、cap SIDs、timeout、tty、stdin 和 private desktop 标志。[E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:57][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:59][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:60][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:63][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:64][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:65][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:66][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:67][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:68][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:69][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:71][E: codex-rs/windows-sandbox-rs/src/elevated/ipc_framed.rs:73]

## 控制流

1. Legacy capture path 调用 `prepare_legacy_spawn_context`，从 `PermissionProfile` 解析 resolved permissions、准备当前目录/日志目录/网络限制，并判断是否需要 write capabilities。[E: codex-rs/windows-sandbox-rs/src/lib.rs:503][E: codex-rs/windows-sandbox-rs/src/lib.rs:515][E: codex-rs/windows-sandbox-rs/src/lib.rs:518][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:91][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:112][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:122][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:140]
2. read-only or writable-root capability mode controls restricted token creation: legacy mode calls readonly/workspace-write token helpers, while elevated runner calls `token_mode_for_permission_profile` and selects readonly or writable-root token helpers with the sandbox user's token.[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:146][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:152][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:164][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:170][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:239][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:263][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:265][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:268]
3. `compute_allow_paths_for_permissions` derives allow/deny paths from writable roots and read-only subpaths, retaining only existing paths.[E: codex-rs/windows-sandbox-rs/src/allow.rs:14][E: codex-rs/windows-sandbox-rs/src/allow.rs:22][E: codex-rs/windows-sandbox-rs/src/allow.rs:27][E: codex-rs/windows-sandbox-rs/src/allow.rs:33][E: codex-rs/windows-sandbox-rs/src/allow.rs:36][E: codex-rs/windows-sandbox-rs/src/allow.rs:41]
4. legacy capture path applies allow/deny ACL rules, allows the null device, creates stdio pipes, and then calls `create_process_as_user` with inherited stdio handles.[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:267][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:289][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:300][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:327][E: codex-rs/windows-sandbox-rs/src/lib.rs:537][E: codex-rs/windows-sandbox-rs/src/lib.rs:538][E: codex-rs/windows-sandbox-rs/src/lib.rs:551][E: codex-rs/windows-sandbox-rs/src/lib.rs:554][E: codex-rs/windows-sandbox-rs/src/lib.rs:560]
5. `create_process_as_user` 构造 Windows command line 和 env block，使用 `LaunchDesktop::prepare`，在 stdio 模式下用 `STARTUPINFOEX` handle list 配合 `EXTENDED_STARTUPINFO_PRESENT` 启动进程。[E: codex-rs/windows-sandbox-rs/src/process.rs:78][E: codex-rs/windows-sandbox-rs/src/process.rs:95][E: codex-rs/windows-sandbox-rs/src/process.rs:112][E: codex-rs/windows-sandbox-rs/src/process.rs:143]
6. elevated unified exec first resolves permissions, calls `prepare_elevated_spawn_context_for_permissions`, then constructs `SpawnRequest` and starts runner transport; the client waits for `SpawnReady` before converting named pipe files into driver channels.[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:77][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:82][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:96][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/elevated.rs:114][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:77][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:87][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:100]
7. runner client 用 `CreateProcessWithLogonW` 以 sandbox user 启动 `codex-command-runner.exe`，connects the named pipes, sends the spawn request, waits for spawn-ready, and then transfers the pipe files to the driver.[E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:275][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:306][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:307][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:343][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:344][E: codex-rs/windows-sandbox-rs/src/elevated/runner_client.rs:333]
8. runner 读取 `SpawnRequest` 后用 sandbox user 当前 token 派生 read-only 或 writable-root restricted token，再用 ConPTY 或 anonymous pipes spawn 实际命令。[E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:186][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:236][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:239][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:263][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:286][E: codex-rs/windows-sandbox-rs/src/bin/command_runner/win.rs:319]
9. unified Windows driver 把 `Stdin`、`CloseStdin`、`Resize`、`Terminate` frame 写给 runner，把 runner 返回的 `Output` 和 `Exit` frame 映射到 `ProcessDriver` 的 stdout/stderr/exit 通道。[E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:59][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:72][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:96][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:126][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/windows_common.rs:142]

## 设计动机与权衡

- legacy path 直接在当前用户上下文中创建 restricted token 并修改 ACL；elevated path 先切到 sandbox user runner，再由 runner 创建更小的 restricted token，适合需要独立 sandbox identity/ACL orchestration 的场景。[I]
- `create_token_with_caps_from` 使用 `DISABLE_MAX_PRIVILEGE | LUA_TOKEN | WRITE_RESTRICTED` 创建 restricted token，这表明 Windows backend 同时依赖 token privilege reduction 与 write-restricted SID 机制。[E: codex-rs/windows-sandbox-rs/src/token.rs:427][E: codex-rs/windows-sandbox-rs/src/token.rs:459][E: codex-rs/windows-sandbox-rs/src/token.rs:460]
- `.codex` and `.agents` under the command cwd are explicitly protected with deny-write ACLs for workspace capability SIDs, so writable roots are not an unconditional write grant over every sensitive workspace child.[E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:339][E: codex-rs/windows-sandbox-rs/src/spawn_prep.rs:340][E: codex-rs/windows-sandbox-rs/src/workspace_acl.rs:13][E: codex-rs/windows-sandbox-rs/src/workspace_acl.rs:19][E: codex-rs/windows-sandbox-rs/src/workspace_acl.rs:23][E: codex-rs/windows-sandbox-rs/src/workspace_acl.rs:26]

## gotcha

- non-Windows target 上 `run_windows_sandbox_capture`、preflight 等函数由 stub export 接管，会返回 “Windows sandbox is only available on Windows”。[E: codex-rs/windows-sandbox-rs/src/lib.rs:333][E: codex-rs/windows-sandbox-rs/src/lib.rs:335][E: codex-rs/windows-sandbox-rs/src/lib.rs:337][E: codex-rs/windows-sandbox-rs/src/lib.rs:788][E: codex-rs/windows-sandbox-rs/src/lib.rs:806][E: codex-rs/windows-sandbox-rs/src/lib.rs:817][E: codex-rs/windows-sandbox-rs/src/lib.rs:820][E: codex-rs/windows-sandbox-rs/src/lib.rs:827]
- legacy path requires full-disk read access and cannot enforce deny-read overrides; restricted read-only or explicit deny-read overrides require the elevated backend.[E: codex-rs/windows-sandbox-rs/src/lib.rs:519][E: codex-rs/windows-sandbox-rs/src/lib.rs:520][E: codex-rs/windows-sandbox-rs/src/lib.rs:526][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:298][E: codex-rs/windows-sandbox-rs/src/unified_exec/backends/legacy.rs:303]
- `make_env_block` 会按 case-insensitive key 排序并生成双 NUL 结尾的 Windows environment block，直接传普通 map 给 Windows API 不是这里的最终形态。[E: codex-rs/windows-sandbox-rs/src/process.rs:39][E: codex-rs/windows-sandbox-rs/src/process.rs:45][E: codex-rs/windows-sandbox-rs/src/process.rs:53]

## Sources

- `codex-rs/windows-sandbox-rs/src/lib.rs`
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

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
