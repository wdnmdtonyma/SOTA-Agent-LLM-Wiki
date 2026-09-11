---
id: subsys.exec-sandbox.sandbox-windows
title: Windows sandbox
kind: subsystem
tier: T2
source: [codex-rs/windows-sandbox-rs/src/lib.rs, codex-rs/windows-sandbox-rs/src/desktop.rs, codex-rs/windows-sandbox-rs/src/deny_read_walker.rs, codex-rs/windows-sandbox-rs/src/resolved_permissions.rs, codex-rs/mxc-sandbox/src/lib.rs, codex-rs/windows-sandbox-service/src/lib.rs, codex-rs/windows-sandbox-service/src/main.rs, codex-rs/sandboxing/src/manager.rs, codex-rs/sandboxing/src/windows.rs, codex-rs/sandboxing/src/windows_mxc.rs, codex-rs/features/src/lib.rs, codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs, codex-rs/protocol/src/permissions.rs, codex-rs/utils/pty/src/process.rs, codex-rs/core/src/context/world_state/environment.rs]
symbols: [run_windows_sandbox_capture, ResolvedWindowsSandboxPermissions, token_mode_for_permission_profile, Feature::WindowsSandboxService, MxcCommand, is_available, RunMode]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Windows sandbox backend 用 Windows restricted token、capability SID、ACL allow/deny、可选 private desktop、elevated runner IPC，以及可选的 native MXC process-security probe 与 `windows-sandbox-service` 安装服务来执行 read-only 或 workspace-write policy 下的命令。[I]

## 能回答的问题

- Windows sandbox 支持哪些 policy preset，拒绝哪些 policy？
- legacy restricted-token path 与 elevated runner path 的 spawn 差异是什么？
- `codex-mxc-sandbox` 与 `windows-sandbox-service` 各自承担什么？
- `Feature::windows_sandbox_service` 何时参与 elevated provisioning？
- token、capability SID、workspace ACL、null device allow 是怎样组合的？
- Windows sandbox 在非 Windows target 上的行为是什么？

## 职责边界

`codex_sandboxing::SandboxManager` 只把 `WindowsRestrictedToken` 带到 `SandboxExecRequest`；它不在 manager 层改写 argv。[E: codex-rs/sandboxing/src/manager.rs:467][E: codex-rs/sandboxing/src/manager.rs:490] Windows token、ACL、runner IPC 和 process creation 都在 `codex-rs/windows-sandbox-rs` 内实现。[I]

Windows policy resolution starts from a managed `PermissionProfile`: `ResolvedWindowsSandboxPermissions::try_from_permission_profile` rejects non-managed profiles and non-restricted filesystem policies, `try_from_permission_profile_for_workspace_roots` materializes workspace-root entries, and `token_mode_for_permission_profile` rejects full-disk write access before choosing read-only or writable-root capability token mode.[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:40][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:51][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:64][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:71][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:84]

Managed deny-read rules 不能走 unelevated restricted-token path：`resolve_windows_deny_read_paths` 得到非空路径时直接拒绝。deny-read 必须用 elevated backend。[E: codex-rs/sandboxing/src/windows.rs:120][E: codex-rs/sandboxing/src/windows.rs:124][E: codex-rs/sandboxing/src/windows.rs:126]

`codex-mxc-sandbox` 是 native Windows process security environment 探测 crate：`is_available()` 在 Windows 上查询 MXC process-security 是否 usable，非 Windows 恒为 false。它不是 argv wrapper。[E: codex-rs/mxc-sandbox/src/lib.rs:25][E: codex-rs/mxc-sandbox/src/lib.rs:30][E: codex-rs/mxc-sandbox/src/lib.rs:32] `SandboxManager::select_initial` 在 Windows 上调用 `windows_mxc::record_availability_once` 上报 `codex.windows_mxc.available`。[E: codex-rs/sandboxing/src/manager.rs:324][E: codex-rs/sandboxing/src/windows_mxc.rs:9][E: codex-rs/sandboxing/src/windows_mxc.rs:12][E: codex-rs/sandboxing/src/windows_mxc.rs:17]

`windows-sandbox-service` 是独立 Windows 服务 crate：`RunMode::Service`（debug 还有 `Foreground`）走 `codex_windows_sandbox_service::run`；非 Windows 直接 bail。[E: codex-rs/windows-sandbox-service/src/lib.rs:16][E: codex-rs/windows-sandbox-service/src/lib.rs:23][E: codex-rs/windows-sandbox-service/src/lib.rs:27][E: codex-rs/windows-sandbox-service/src/lib.rs:36][E: codex-rs/windows-sandbox-service/src/main.rs:5] `Feature::WindowsSandboxService` 的 key 是 `windows_sandbox_service`，UnderDevelopment，默认关闭。[E: codex-rs/features/src/lib.rs:384][E: codex-rs/features/src/lib.rs:1213][E: codex-rs/features/src/lib.rs:1214][E: codex-rs/features/src/lib.rs:1215] Elevated setup 在 Windows 上且该 feature 开启、且不是 workload identity 时才会尝试经安装服务做 provisioning。[E: codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs:90][E: codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs:91]

## 关键 crate/文件

- `codex-rs/windows-sandbox-rs/src/lib.rs`: Windows sandbox APIs 与 non-Windows stub。[E: codex-rs/windows-sandbox-rs/src/lib.rs:954]
- `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs`: managed profile → Windows token mode。[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:40]
- `codex-rs/mxc-sandbox/src/lib.rs`: MXC process-security availability。[E: codex-rs/mxc-sandbox/src/lib.rs:25]
- `codex-rs/windows-sandbox-service/src/lib.rs`: 安装服务入口。[E: codex-rs/windows-sandbox-service/src/lib.rs:23]
- `codex-rs/sandboxing/src/manager.rs`: `WindowsRestrictedToken` 保持原始 argv。[E: codex-rs/sandboxing/src/manager.rs:490]
- `codex-rs/sandboxing/src/windows.rs`: unelevated deny-read 拒绝。[E: codex-rs/sandboxing/src/windows.rs:124]

## 数据模型

- `ResolvedWindowsSandboxPermissions`: managed restricted filesystem + network 的 Windows 解析结果。[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:63]
- `WindowsSandboxTokenMode`: `ReadOnlyCapability` 或 `WritableRootsCapability`。[E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:57][E: codex-rs/windows-sandbox-rs/src/resolved_permissions.rs:59]
- `MxcCommand`: native policy adapter 输入（permissions、cwd、command）。[E: codex-rs/mxc-sandbox/src/lib.rs:15]
- `RunMode`: 服务 `Service` / debug `Foreground`。[E: codex-rs/windows-sandbox-service/src/lib.rs:16]

## 控制流

1. `select_initial` 在 Windows 上先记录 MXC availability，再按 preference 选 `WindowsRestrictedToken` 或 `None`。[E: codex-rs/sandboxing/src/manager.rs:324][E: codex-rs/sandboxing/src/manager.rs:328]
2. `transform` 对 `WindowsRestrictedToken` 不插 wrapper；managed network 且 level 不是 `Elevated` 时报 preparation error。[E: codex-rs/sandboxing/src/manager.rs:468][E: codex-rs/sandboxing/src/manager.rs:470][E: codex-rs/sandboxing/src/manager.rs:490]
3. Legacy capture 用 restricted token + ACL；elevated path 经 runner IPC 在 sandbox user 下再建 token。[I]
4. Unelevated path 遇到 deny-read 或 split read restriction 直接拒绝。[E: codex-rs/sandboxing/src/windows.rs:114][E: codex-rs/sandboxing/src/windows.rs:124]
5. Elevated setup 可选走 `windows-sandbox-service`（`Feature::WindowsSandboxService`）。[E: codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs:91]
6. `ProcessDriver::signal` 在 Windows 上成功后移除 killer，避免 Drop 重复 terminate。[E: codex-rs/utils/pty/src/process.rs:229][E: codex-rs/utils/pty/src/process.rs:239]

## 设计动机与权衡

- MXC crate 只探测 process-security 是否可用，不替代 restricted-token spawn。[E: codex-rs/mxc-sandbox/src/lib.rs:25][I]
- 安装服务把 elevated provisioning 从调用进程拆出，feature 默认关闭。[E: codex-rs/features/src/lib.rs:1216][I]
- WRITE_RESTRICTED token 的 capability deny-read ACE 不参与 read check，所以 deny-read 必须 elevated。[E: codex-rs/sandboxing/src/windows.rs:113][E: codex-rs/sandboxing/src/windows.rs:124]

## Private desktop 与 deny-read walker

`desktop.rs` 创建 `CodexSandboxDesktop-*` private desktop；这是窗口隔离，不是 restricted token 本身。[I]

`deny_read_walker.rs` 把 deny-read glob 展开成现有路径快照。legacy restricted-token 路径遇到非空 deny-read 仍直接拒绝。[E: codex-rs/sandboxing/src/windows.rs:124]

## Model-visible PowerShell version

Windows sandbox crate **不**探测 PowerShell 版本。`Feature::PowerShellShellVersion` 打开且当前单本地环境是 PowerShell 时，`EnvironmentsState` 才把版本写进 env context `<shell_version>`。[E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:973][E: codex-rs/core/src/context/world_state/environment.rs:50][E: codex-rs/core/src/context/world_state/environment.rs:290]

## Windows permission/path portability

Symbolic `FileSystemSpecialPath::SlashTmp` 是 protocol 层 special token，不是字面 `/tmp`。[E: codex-rs/protocol/src/permissions.rs:145] Writable project roots 下默认保护 `.git` / `.agents` / `.codex`。[E: codex-rs/protocol/src/permissions.rs:41]

## gotcha

- non-Windows target 上 capture/preflight stub 返回 “Windows sandbox is only available on Windows”。[E: codex-rs/windows-sandbox-rs/src/lib.rs:954][E: codex-rs/windows-sandbox-rs/src/lib.rs:964]
- `windows-sandbox-service` 非 Windows 同样 bail。[E: codex-rs/windows-sandbox-service/src/lib.rs:36]
- 不要把 `mxc-sandbox` 写成独立 wiki 节点；它折叠在本页。[I]

## Sources

- `codex-rs/windows-sandbox-rs/src/lib.rs`
- `codex-rs/windows-sandbox-rs/src/desktop.rs`
- `codex-rs/windows-sandbox-rs/src/deny_read_walker.rs`
- `codex-rs/windows-sandbox-rs/src/resolved_permissions.rs`
- `codex-rs/mxc-sandbox/src/lib.rs`
- `codex-rs/windows-sandbox-service/src/lib.rs`
- `codex-rs/windows-sandbox-service/src/main.rs`
- `codex-rs/sandboxing/src/manager.rs`
- `codex-rs/sandboxing/src/windows.rs`
- `codex-rs/sandboxing/src/windows_mxc.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/app-server/src/request_processors/windows_sandbox_processor.rs`
- `codex-rs/protocol/src/permissions.rs`
- `codex-rs/utils/pty/src/process.rs`
- `codex-rs/core/src/context/world_state/environment.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
