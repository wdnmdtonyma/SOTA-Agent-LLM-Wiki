---
id: subsys.exec-sandbox.sandbox-windows
title: Windows sandbox
kind: subsystem
tier: T2
source: [codex-rs/windows-sandbox-rs/src/lib.rs, codex-rs/windows-sandbox-rs/src/desktop.rs, codex-rs/windows-sandbox-rs/src/deny_read_walker.rs, codex-rs/windows-sandbox-rs/src/resolved_permissions.rs, codex-rs/windows-sandbox-rs/src/setup_provisioning.rs, codex-rs/mxc-sandbox/src/lib.rs, codex-rs/windows-sandbox-service/src/lib.rs, codex-rs/windows-sandbox-service/src/main.rs, codex-rs/sandboxing/src/manager.rs, codex-rs/sandboxing/src/windows.rs, codex-rs/sandboxing/src/windows_mxc.rs, codex-rs/features/src/lib.rs, codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs, codex-rs/tui/src/app/platform_actions.rs, codex-rs/exec-server/src/process_sandbox.rs, codex-rs/arg0/src/lib.rs, codex-rs/core/src/config/windows_sandbox_config.rs, codex-rs/protocol/src/permissions.rs, codex-rs/utils/pty/src/process.rs, codex-rs/core/src/context/world_state/environment.rs]
symbols: [run_windows_sandbox_capture, ResolvedWindowsSandboxPermissions, token_mode_for_permission_profile, Feature::WindowsSandboxService, create_command_args, is_available, SandboxType::WindowsMxc, setup_helper_main, RunMode]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Windows sandbox 有两条可执行 backend：`WindowsRestrictedToken`（restricted token / ACL / 可选 private desktop / elevated runner）和 `SandboxType::WindowsMxc`（把 argv 包成 `--__codex-windows-mxc` helper）。TUI setup 走 app-server `WindowsSandboxSetupStart`，elevated provisioning 实现在 `setup_provisioning.rs`。[E: codex-rs/sandboxing/src/manager.rs:47][E: codex-rs/sandboxing/src/manager.rs:403][E: codex-rs/tui/src/app/platform_actions.rs:145][E: codex-rs/windows-sandbox-rs/src/lib.rs:144]

## 能回答的问题

- Windows sandbox 支持哪些 policy preset，拒绝哪些 policy？
- legacy restricted-token path 与 elevated runner path 的 spawn 差异是什么？
- `codex-mxc-sandbox` 与 `windows-sandbox-service` 各自承担什么？
- `Feature::windows_sandbox_service` 何时参与 elevated provisioning？
- token、capability SID、workspace ACL、null device allow 是怎样组合的？
- Windows sandbox 在非 Windows target 上的行为是什么？

## 职责边界

`SandboxManager::select_initial` 在 Windows 上先 `windows_mxc::record_availability_once`；若 `windows_sandbox_level == WindowsSandboxLevel::Mxc` 则选 `SandboxType::WindowsMxc`，否则才落到 `WindowsRestrictedToken` / `None`。[E: codex-rs/sandboxing/src/manager.rs:332][E: codex-rs/sandboxing/src/manager.rs:337][E: codex-rs/sandboxing/src/manager.rs:338] `transform` 对 `WindowsRestrictedToken` 保持原始 argv；对 `WindowsMxc` 则用 `codex_mxc_sandbox::create_command_args` 把 helper 插到 argv 前，并把 policy/managed network 编进 launcher env。[E: codex-rs/sandboxing/src/manager.rs:550][E: codex-rs/sandboxing/src/manager.rs:441][E: codex-rs/mxc-sandbox/src/lib.rs:63] Restricted-token spawn 仍在 `codex-rs/windows-sandbox-rs`。[I]

Windows policy resolution starts from a managed `PermissionProfile`: `ResolvedWindowsSandboxPermissions::try_from_permission_profile` rejects non-managed profiles and non-restricted filesystem policies, `try_from_permission_profile_for_workspace_roots` materializes workspace-root entries, and `token_mode_for_permission_profile` rejects full-disk write access before choosing read-only or writable-root capability token mode.[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:40][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:51][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:64][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:71][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:84]

Managed deny-read rules 不能走 unelevated restricted-token path：`resolve_windows_deny_read_paths` 得到非空路径时直接拒绝。deny-read 必须用 elevated backend。[E: codex-rs/sandboxing/src/windows.rs:120][E: codex-rs/sandboxing/src/windows.rs:124][E: codex-rs/sandboxing/src/windows.rs:126]

`codex-mxc-sandbox` 同时负责 native process-security 探测与 command wrapping：`is_available()` 在 Windows 上查 process-security 是否 usable，非 Windows 恒为 false；`create_command_args` 校验 managed network（需非空非零 proxy ports 且 `allow_local_binding`）后 `transport::encode` `MxcCommand`。[E: codex-rs/mxc-sandbox/src/lib.rs:91][E: codex-rs/mxc-sandbox/src/lib.rs:63][E: codex-rs/mxc-sandbox/src/lib.rs:75] argv1 `CODEX_WINDOWS_MXC_ARG1` 在 `arg0_dispatch` 里进 `run_windows_mxc_main`。[E: codex-rs/arg0/src/lib.rs:103][E: codex-rs/arg0/src/lib.rs:104] `record_availability_once` 上报 `codex.windows_mxc.available`。[E: codex-rs/sandboxing/src/windows_mxc.rs:9][E: codex-rs/sandboxing/src/windows_mxc.rs:17] exec-server 在 MXC 路径上若 `enforce_managed_network` 或带 network proxy 会先拒绝 “not supported yet”。[E: codex-rs/exec-server/src/process_sandbox.rs:95][E: codex-rs/exec-server/src/process_sandbox.rs:100]

`windows-sandbox-service` 是独立 Windows 服务 crate：`RunMode::Service`（debug 还有 `Foreground`）走 `codex_windows_sandbox_service::run`；非 Windows 直接 bail。[E: codex-rs/windows-sandbox-service/src/lib.rs:19][E: codex-rs/windows-sandbox-service/src/lib.rs:25][E: codex-rs/windows-sandbox-service/src/lib.rs:29][E: codex-rs/windows-sandbox-service/src/lib.rs:38][E: codex-rs/windows-sandbox-service/src/main.rs:5] `Feature::WindowsSandboxService` 的 key 是 `windows_sandbox_service`，UnderDevelopment，默认关闭。[E: codex-rs/features/src/lib.rs:388][E: codex-rs/features/src/lib.rs:1218][E: codex-rs/features/src/lib.rs:1219][E: codex-rs/features/src/lib.rs:1220] Elevated setup 在 Windows 上且该 feature 开启、且不是 workload identity 时才会尝试经安装服务做 provisioning。[E: codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs:90][E: codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs:91] TUI `begin_windows_sandbox_setup` 发 `ClientRequest::WindowsSandboxSetupStart`，不本地 spawn setup helper。[E: codex-rs/tui/src/app/platform_actions.rs:145] setup helper 入口从旧 `bin/setup_main/win.rs` 迁到 `setup_provisioning.rs`，由 `setup_helper_main` 重导出。[E: codex-rs/windows-sandbox-rs/src/lib.rs:140][E: codex-rs/windows-sandbox-rs/src/lib.rs:144]

## 关键 crate/文件

- `codex-rs/windows-sandbox-rs/src/lib.rs`: Windows sandbox APIs、`setup_helper_main`、non-Windows stub。[E: codex-rs/windows-sandbox-rs/src/lib.rs:144][E: codex-rs/windows-sandbox-rs/src/lib.rs:982]
- `codex-rs/windows-sandbox-rs/src/setup_provisioning.rs`: elevated/unelevated setup helper（原 `bin/setup_main/win.rs`）。[E: codex-rs/windows-sandbox-rs/src/setup_provisioning.rs:457]
- `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs`: managed profile → Windows token mode。[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:40]
- `codex-rs/mxc-sandbox/src/lib.rs`: MXC wrap + availability。[E: codex-rs/mxc-sandbox/src/lib.rs:63][E: codex-rs/mxc-sandbox/src/lib.rs:91]
- `codex-rs/windows-sandbox-service/src/lib.rs`: 安装服务入口。[E: codex-rs/windows-sandbox-service/src/lib.rs:25]
- `codex-rs/sandboxing/src/manager.rs`: `WindowsMxc` wrap argv；`WindowsRestrictedToken` 保持原始 argv。[E: codex-rs/sandboxing/src/manager.rs:403][E: codex-rs/sandboxing/src/manager.rs:550]
- `codex-rs/sandboxing/src/windows.rs`: unelevated deny-read 拒绝。[E: codex-rs/sandboxing/src/windows.rs:124]
- `codex-rs/core/src/config/windows_sandbox_config.rs`: config mode → `WindowsSandboxLevel`（含 `Mxc` 不从 toml mode 映射）。[E: codex-rs/core/src/config/windows_sandbox_config.rs:28]

## 数据模型

- `ResolvedWindowsSandboxPermissions`: managed restricted filesystem + network 的 Windows 解析结果。[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:63]
- `WindowsSandboxTokenMode`: `ReadOnlyCapability` 或 `WritableRootsCapability`。[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:57][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:59]
- `MxcCommand`: helper payload（permissions、cwd、managed_network、command）。[E: codex-rs/mxc-sandbox/src/lib.rs:44]
- `RunMode`: 服务 `Service` / debug `Foreground`。[E: codex-rs/windows-sandbox-service/src/lib.rs:18]

## 控制流

1. `select_initial` 在 Windows 上先记录 MXC availability；level 为 `Mxc` 时返回 `WindowsMxc`，否则 `get_platform_sandbox`。[E: codex-rs/sandboxing/src/manager.rs:332][E: codex-rs/sandboxing/src/manager.rs:337][E: codex-rs/sandboxing/src/manager.rs:340]
2. `transform` 对 `WindowsMxc`：拒绝 private desktop、要求 `is_available()`、可准备 managed-network proxy，再 wrap argv。[E: codex-rs/sandboxing/src/manager.rs:404][E: codex-rs/sandboxing/src/manager.rs:409][E: codex-rs/sandboxing/src/manager.rs:441]
3. `transform` 对 `WindowsRestrictedToken` 不插 wrapper；managed network 且 level 不是 `Elevated` 时报 preparation error。[E: codex-rs/sandboxing/src/manager.rs:527][E: codex-rs/sandboxing/src/manager.rs:528][E: codex-rs/sandboxing/src/manager.rs:550]
4. Legacy capture 用 restricted token + ACL；elevated path 经 runner IPC 在 sandbox user 下再建 token。[I]
5. Unelevated path 遇到 deny-read 或 split read restriction 直接拒绝。[E: codex-rs/sandboxing/src/windows.rs:113][E: codex-rs/sandboxing/src/windows.rs:124]
6. TUI setup 经 app-server；elevated 可选走 `windows-sandbox-service`。[E: codex-rs/tui/src/app/platform_actions.rs:145][E: codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs:91]
7. `ProcessDriver::signal` 在 Windows 上成功后移除 killer，避免 Drop 重复 terminate。[E: codex-rs/utils/pty/src/process.rs:229][E: codex-rs/utils/pty/src/process.rs:239]

## 设计动机与权衡

- `WindowsMxc` 是独立 `SandboxType`，不是 restricted-token 的探测旁路；level `Mxc` 才会选它。[E: codex-rs/sandboxing/src/manager.rs:47][E: codex-rs/sandboxing/src/manager.rs:337][I]
- 安装服务把 elevated provisioning 从调用进程拆出，feature 默认关闭。[E: codex-rs/features/src/lib.rs:1220][I]
- WRITE_RESTRICTED token 的 capability deny-read ACE 不参与 read check，所以 deny-read 必须 elevated。[E: codex-rs/sandboxing/src/windows.rs:113][E: codex-rs/sandboxing/src/windows.rs:124]

## Private desktop 与 deny-read walker

`desktop.rs` 创建 `CodexSandboxDesktop-*` private desktop；这是窗口隔离，不是 restricted token 本身。[I]

`deny_read_walker.rs` 把 deny-read glob 展开成现有路径快照。legacy restricted-token 路径遇到非空 deny-read 仍直接拒绝。[E: codex-rs/sandboxing/src/windows.rs:124]

## Model-visible PowerShell version

Windows sandbox crate **不**探测 PowerShell 版本。`Feature::PowerShellShellVersion` 打开且当前单本地环境是 PowerShell 时，`EnvironmentsState` 才把版本写进 env context `<shell_version>`。[E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:977][E: codex-rs/core/src/context/world_state/environment.rs:50][E: codex-rs/core/src/context/world_state/environment.rs:290]

## Windows permission/path portability

Symbolic `FileSystemSpecialPath::SlashTmp` 是 protocol 层 special token，不是字面 `/tmp`。[E: codex-rs/protocol/src/permissions.rs:145] Writable project roots 下默认保护 `.git` / `.agents` / `.codex`。[E: codex-rs/protocol/src/permissions.rs:41]

## gotcha

- non-Windows target 上 capture/preflight stub 返回 “Windows sandbox is only available on Windows”。[E: codex-rs/windows-sandbox-rs/src/lib.rs:982][E: codex-rs/windows-sandbox-rs/src/lib.rs:992]
- `windows-sandbox-service` 非 Windows 同样 bail。[E: codex-rs/windows-sandbox-service/src/lib.rs:38]
- 不要把 `mxc-sandbox` 写成独立 wiki 节点；它折叠在本页。[I]
- MXC `transform` 可编码 managed network，但 exec-server spawn 仍可能拒绝 MXC managed networking。[E: codex-rs/sandboxing/src/manager.rs:414][E: codex-rs/exec-server/src/process_sandbox.rs:100]

## Sources

- `codex-rs/windows-sandbox-rs/src/lib.rs`
- `codex-rs/windows-sandbox-rs/src/desktop.rs`
- `codex-rs/windows-sandbox-rs/src/deny_read_walker.rs`
- `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs`
- `codex-rs/windows-sandbox-rs/src/setup_provisioning.rs`
- `codex-rs/mxc-sandbox/src/lib.rs`
- `codex-rs/windows-sandbox-service/src/lib.rs`
- `codex-rs/windows-sandbox-service/src/main.rs`
- `codex-rs/sandboxing/src/manager.rs`
- `codex-rs/sandboxing/src/windows.rs`
- `codex-rs/sandboxing/src/windows_mxc.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs`
- `codex-rs/tui/src/app/platform_actions.rs`
- `codex-rs/exec-server/src/process_sandbox.rs`
- `codex-rs/arg0/src/lib.rs`
- `codex-rs/core/src/config/windows_sandbox_config.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/utils/pty/src/process.rs`
- `codex-rs/core/src/context/world_state/environment.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
