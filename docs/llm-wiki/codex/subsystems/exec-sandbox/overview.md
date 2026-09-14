---
id: subsys.exec-sandbox.overview
title: exec sandbox 总览
kind: subsystem
tier: T2
source: [codex-rs/sandboxing/src/manager.rs, codex-rs/sandboxing/src/policy_transforms.rs, codex-rs/sandboxing/src/violation.rs, codex-rs/sandboxing/src/lib.rs]
symbols: [SandboxManager, SandboxType, SandboxCommand, SandboxExecRequest, SandboxTransformRequest, SandboxablePreference, SandboxViolationEvent, SandboxViolationBackend, FileSystemSandboxViolationReason]
related: [spine.shell-exec-flow, tool.exec-command, tool.write-stdin]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> exec sandbox 是 Codex 在真正 spawn 进程前，把 permission model、per-OS sandbox backend、managed network、environment id 和 argv wrapper 统一收敛成 `SandboxExecRequest` 的转换层。[E: codex-rs/sandboxing/src/manager.rs:108][E: codex-rs/sandboxing/src/manager.rs:121][E: codex-rs/sandboxing/src/manager.rs:140][E: codex-rs/sandboxing/src/manager.rs:368]

## 能回答的问题

- Codex 怎样在 macOS、Linux、Windows 和 no sandbox 之间选择 backend？
- `SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest` 各自承载什么字段？
- 为什么 managed network、network disabled、restricted filesystem 会影响是否需要平台 sandbox？
- `transform` 怎样把原始命令改写成 `sandbox-exec`、`codex-linux-sandbox` 或原始 argv？
- additional permissions 怎样在进入 backend 前被归一化并合并？
- filesystem/network sandbox denial 怎样被归一化为内部 tracing event？

## 职责边界

exec sandbox 总览节点覆盖 `codex_sandboxing` crate 的 platform selection 与 argv transform。`SandboxType` 的五个 backend 枚举值是 `None`、`MacosSeatbelt`、`LinuxSeccomp`、`WindowsRestrictedToken`、`WindowsMxc`。[E: codex-rs/sandboxing/src/manager.rs:42][E: codex-rs/sandboxing/src/manager.rs:43][E: codex-rs/sandboxing/src/manager.rs:44][E: codex-rs/sandboxing/src/manager.rs:45][E: codex-rs/sandboxing/src/manager.rs:46][E: codex-rs/sandboxing/src/manager.rs:47] `get_platform_sandbox` 在 macOS 返回 `MacosSeatbelt`，在 Linux 返回 `LinuxSeccomp`，在 Windows 且 `windows_sandbox_enabled` 为 true 时返回 `WindowsRestrictedToken`（不是 MXC），否则返回 `None`。[E: codex-rs/sandboxing/src/manager.rs:69][E: codex-rs/sandboxing/src/manager.rs:71][E: codex-rs/sandboxing/src/manager.rs:73][E: codex-rs/sandboxing/src/manager.rs:76]

`SandboxManager::select_initial` 是首轮 backend selector。Windows 上会先 `windows_mxc::record_availability_once`；若 level 是 `WindowsSandboxLevel::Mxc` 则直接返回 `WindowsMxc`。其余 true case 走 `get_platform_sandbox`，无法提供平台 sandbox 时回落到 `SandboxType::None`。[E: codex-rs/sandboxing/src/manager.rs:324][E: codex-rs/sandboxing/src/manager.rs:332][E: codex-rs/sandboxing/src/manager.rs:337][E: codex-rs/sandboxing/src/manager.rs:338][E: codex-rs/sandboxing/src/manager.rs:346]

`should_require_platform_sandbox` 在 managed network 生效时返回 true，在网络关闭且不是 `ExternalSandbox` 时返回 true，在网络开启且 filesystem 是 restricted 且不存在 `full_disk_write_access` 时也返回 true。[E: codex-rs/sandboxing/src/policy_transforms.rs:646][E: codex-rs/sandboxing/src/policy_transforms.rs:651][E: codex-rs/sandboxing/src/policy_transforms.rs:655][E: codex-rs/sandboxing/src/policy_transforms.rs:663]

exec sandbox 总览节点不覆盖 tool schema、approval UI、exec-server JSON-RPC 协议或具体 OS backend 的完整策略语言。工具 schema 的权威节点在 `tool.exec-command`；exec-server 的 WebSocket/PTY lifecycle 在 `subsys.exec-sandbox.exec-server`；Seatbelt、Linux、Windows backend 分别由 `subsys.exec-sandbox.sandbox-seatbelt`、`subsys.exec-sandbox.sandbox-linux`、`subsys.exec-sandbox.sandbox-windows` 细化。[I]

## 关键 crate/文件

- `codex-rs/sandboxing/src/manager.rs`: 定义 `SandboxManager`、`SandboxType`、`SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest`，并实现 backend selection 与 argv transform。[E: codex-rs/sandboxing/src/manager.rs:42][E: codex-rs/sandboxing/src/manager.rs:108][E: codex-rs/sandboxing/src/manager.rs:121][E: codex-rs/sandboxing/src/manager.rs:140][E: codex-rs/sandboxing/src/manager.rs:324][E: codex-rs/sandboxing/src/manager.rs:368]
- `codex-rs/sandboxing/src/policy_transforms.rs`: normalizes additional permissions and, before backend transform, merges `PermissionProfile`, filesystem policy, network policy, and additional permissions into effective policies.[E: codex-rs/sandboxing/src/policy_transforms.rs:630]
- `codex-rs/sandboxing/src/violation.rs`: 归一化 filesystem/network denial 的 backend、reason 与 bounded diagnostic fields，再写入 tracing stack。[E: codex-rs/sandboxing/src/violation.rs:41][E: codex-rs/sandboxing/src/violation.rs:48]
- `codex-rs/sandboxing/src/lib.rs`: 按 `cfg` 声明 platform modules（含 `windows_mxc`），重导出 manager 与 violation types，并把 sandbox transform errors 映射到 protocol errors。[E: codex-rs/sandboxing/src/lib.rs:5][E: codex-rs/sandboxing/src/lib.rs:12][E: codex-rs/sandboxing/src/lib.rs:14][E: codex-rs/sandboxing/src/lib.rs:26][E: codex-rs/sandboxing/src/lib.rs:64]

## 数据模型

- `SandboxCommand`: 输入命令的最小不可执行结构，包含 `program`、`args`、`cwd`、`env`、`managed_network`、`additional_permissions`。[E: codex-rs/sandboxing/src/manager.rs:108][E: codex-rs/sandboxing/src/manager.rs:113]
- `SandboxTransformRequest`: transform 的完整输入，包含 command、`PermissionProfile`、目标 sandbox、managed-network 开关、environment id、network proxy、policy cwd、Linux sandbox exe、legacy Landlock 标志、Windows level 和 private desktop 标志。[E: codex-rs/sandboxing/src/manager.rs:140][E: codex-rs/sandboxing/src/manager.rs:154]
- `SandboxExecRequest`: transform 后可交给 spawn 层的结构，保留改写后的 command、URI cwd/policy cwd、env、network 与 environment id、sandbox/Windows 设置、canonical effective `permission_profile` 和 optional `arg0` override；它不再并存一份 derived filesystem/network runtime policies。[E: codex-rs/sandboxing/src/manager.rs:121][E: codex-rs/sandboxing/src/manager.rs:133]
- `effective_permission_profile`: `policy_transforms` 里的归一化函数短暂派生 runtime filesystem/network policies，分别应用 additional permissions，再用原 enforcement 重建一个 canonical effective profile。[E: codex-rs/sandboxing/src/policy_transforms.rs:630][E: codex-rs/sandboxing/src/policy_transforms.rs:639][E: codex-rs/sandboxing/src/manager.rs:389]
- `SandboxViolationEvent`: `FileSystem`/`Network` 两类内部 tracing event；backend 含 Linux sandbox、managed network proxy、Seatbelt、Windows sandbox、Windows MXC。它不是 protocol `EventMsg`。[E: codex-rs/sandboxing/src/violation.rs:41][E: codex-rs/sandboxing/src/violation.rs:48][E: codex-rs/sandboxing/src/violation.rs:53]

## 控制流

1. `SandboxManager::select_initial` 读取 canonical `PermissionProfile`、sandboxable preference、Windows level 和 managed-network 状态；`Forbid` 走 no sandbox，`Require`/`Auto` 需要 sandbox 时 Windows `Mxc` level 优先于 platform restricted token。[E: codex-rs/sandboxing/src/manager.rs:324][E: codex-rs/sandboxing/src/manager.rs:334][E: codex-rs/sandboxing/src/manager.rs:337][E: codex-rs/sandboxing/src/manager.rs:352]
2. `SandboxManager::transform` 先取出 command 上的 `additional_permissions` 并合成 effective `PermissionProfile`；Seatbelt 在生成 SBPL、Linux 在生成 helper argv 时才从 profile 派生 backend runtime permissions。[E: codex-rs/sandboxing/src/manager.rs:368][E: codex-rs/sandboxing/src/manager.rs:386][E: codex-rs/sandboxing/src/manager.rs:390]
3. `transform` 把 `SandboxCommand` 拆成 `argv = [program] + args`，这是后续所有 backend wrapper 的基准命令。[E: codex-rs/sandboxing/src/manager.rs:397][E: codex-rs/sandboxing/src/manager.rs:399]
4. 当目标是 `SandboxType::None` 时，`transform` 不插入 wrapper，只返回原始 argv。[E: codex-rs/sandboxing/src/manager.rs:402]
5. 当目标是 `SandboxType::MacosSeatbelt` 且编译平台是 macOS 时，`transform` 调用 `create_seatbelt_command_args_with_profile` 生成 `sandbox-exec -p ... -- <argv>`，并把 executable 设置为 `/usr/bin/sandbox-exec`。[E: codex-rs/sandboxing/src/manager.rs:455][E: codex-rs/sandboxing/src/manager.rs:489][E: codex-rs/sandboxing/src/manager.rs:489]
6. 当目标是 `SandboxType::LinuxSeccomp` 时，`transform` 要求存在 Linux sandbox executable，调用 `create_linux_sandbox_command_args_for_permission_profile` 生成 helper 参数，然后把 helper exe 插到 argv[0]，并可设置 `arg0` override。[E: codex-rs/sandboxing/src/manager.rs:495][E: codex-rs/sandboxing/src/manager.rs:498][E: codex-rs/sandboxing/src/manager.rs:509][E: codex-rs/sandboxing/src/manager.rs:522]
7. 当目标是 `SandboxType::WindowsMxc` 时，`transform` 用 Codex exe + `create_command_args` wrap argv，并把 managed network 编进 helper env；private desktop 或不 available 会 `WindowsMxcPreparation`。[E: codex-rs/sandboxing/src/manager.rs:403][E: codex-rs/sandboxing/src/manager.rs:441]
8. 当目标是 `SandboxType::WindowsRestrictedToken` 时，`transform` 在 `codex_sandboxing` 层保持原始 argv；若启用 managed network 且 Windows level 不是 `Elevated`，会返回 preparation error。Windows restricted token 逻辑在 Windows sandbox crate 的 spawn 层实现。[E: codex-rs/sandboxing/src/manager.rs:527][E: codex-rs/sandboxing/src/manager.rs:528][E: codex-rs/sandboxing/src/manager.rs:550]
9. `transform` 最终返回 `SandboxExecRequest`，把改写后的 command、cwd/env/network、canonical effective profile、sandbox 类型、Windows 设置和 `arg0` 一并带回调用者；unsandboxed foreign cwd 也保留 base effective profile。[E: codex-rs/sandboxing/src/manager.rs:564][E: codex-rs/sandboxing/src/manager.rs:559]

## 设计动机与权衡

- backend selection 与 backend argument synthesis 被放在同一个 `SandboxManager`，让 shell runtime、unified exec 和 escalated exec 可以请求同一种 `SandboxExecRequest`，而不用各自理解 Seatbelt/bwrap/Windows token 参数细节。[I]
- `Auto` 模式把“需要 OS sandbox”的判断集中在 `should_require_platform_sandbox`，因为 managed network、禁用 network、restricted filesystem 都需要平台能力补足普通 spawn 无法表达的限制。[E: codex-rs/sandboxing/src/policy_transforms.rs:646][E: codex-rs/sandboxing/src/policy_transforms.rs:651][E: codex-rs/sandboxing/src/policy_transforms.rs:663]
- additional permissions 先合并到一个 canonical effective `PermissionProfile`；backend 只在真正消费策略时展开 runtime policies，避免跨层同时传递 profile 与 derived copies。[E: codex-rs/sandboxing/src/manager.rs:386][E: codex-rs/sandboxing/src/manager.rs:389]
- filesystem violation classifier 只对真实 sandbox backend、非零退出且命中已知输出 signature 或 Linux `SIGSYS` 时记录；quick-reject shell codes 不会被盲目归因。[E: codex-rs/sandboxing/src/violation.rs:136][E: codex-rs/sandboxing/src/violation.rs:140][E: codex-rs/sandboxing/src/violation.rs:148][E: codex-rs/sandboxing/src/violation.rs:160][E: codex-rs/sandboxing/src/violation.rs:166]

## gotcha

- `WindowsRestrictedToken` 在 `SandboxManager::transform` 里不是 argv wrapper；`WindowsMxc` 才是 manager 层 wrap。[E: codex-rs/sandboxing/src/manager.rs:550][E: codex-rs/sandboxing/src/manager.rs:403]
- `MacosSeatbelt` 在非 macOS 编译目标会返回 `SeatbeltUnavailable`，`LinuxSeccomp` 在缺少 helper exe 时会返回 `MissingLinuxSandboxExecutable`。[E: codex-rs/sandboxing/src/manager.rs:494][E: codex-rs/sandboxing/src/manager.rs:498]
- Linux helper `arg0` override 不是用户命令 argv[0]，而是为了让 helper 以 `codex-linux-sandbox` 这个 argv0 分支重新进入 arg0 dispatch。[E: codex-rs/sandboxing/src/manager.rs:522][E: codex-rs/sandboxing/src/manager.rs:812]

## Sources

- `codex-rs/sandboxing/src/manager.rs`
- `codex-rs/sandboxing/src/policy_transforms.rs`
- `codex-rs/sandboxing/src/violation.rs`
- `codex-rs/sandboxing/src/lib.rs`

## 相关

- `spine.shell-exec-flow`
- `tool.exec-command`
- `tool.write-stdin`
