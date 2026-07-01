---
id: subsys.exec-sandbox.overview
title: exec sandbox 总览
kind: subsystem
tier: T2
source: [codex-rs/sandboxing/src/manager.rs, codex-rs/sandboxing/src/policy_transforms.rs, codex-rs/sandboxing/src/lib.rs]
symbols: [SandboxManager, SandboxType, SandboxCommand, SandboxExecRequest, SandboxTransformRequest, SandboxablePreference]
related: [spine.shell-exec-flow, tool.exec-command, tool.write-stdin]
evidence: explicit
status: verified
updated: db887d03e1
---

> exec sandbox 是 Codex 在真正 spawn 进程前，把 permission model、per-OS sandbox backend、managed network、environment id 和 argv wrapper 统一收敛成 `SandboxExecRequest` 的转换层。[E: codex-rs/sandboxing/src/manager.rs:97][E: codex-rs/sandboxing/src/manager.rs:112][E: codex-rs/sandboxing/src/manager.rs:131][E: codex-rs/sandboxing/src/manager.rs:321]

## 能回答的问题

- Codex 怎样在 macOS、Linux、Windows 和 no sandbox 之间选择 backend？
- `SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest` 各自承载什么字段？
- 为什么 managed network、network disabled、restricted filesystem 会影响是否需要平台 sandbox？
- `transform` 怎样把原始命令改写成 `sandbox-exec`、`codex-linux-sandbox` 或原始 argv？
- additional permissions 怎样在进入 backend 前被归一化并合并？

## 职责边界

exec sandbox 总览节点覆盖 `codex_sandboxing` crate 的 platform selection 与 argv transform。`SandboxType` 的四个 backend 枚举值是 `None`、`MacosSeatbelt`、`LinuxSeccomp`、`WindowsRestrictedToken`。[E: codex-rs/sandboxing/src/manager.rs:35][E: codex-rs/sandboxing/src/manager.rs:36][E: codex-rs/sandboxing/src/manager.rs:37][E: codex-rs/sandboxing/src/manager.rs:38][E: codex-rs/sandboxing/src/manager.rs:39] `get_platform_sandbox` 在 macOS 返回 `MacosSeatbelt`，在 Linux 返回 `LinuxSeccomp`，在 Windows 且 `windows_sandbox_enabled` 为 true 时返回 `WindowsRestrictedToken`，否则返回 `None`。[E: codex-rs/sandboxing/src/manager.rs:60][E: codex-rs/sandboxing/src/manager.rs:61][E: codex-rs/sandboxing/src/manager.rs:63][E: codex-rs/sandboxing/src/manager.rs:65][E: codex-rs/sandboxing/src/manager.rs:66][E: codex-rs/sandboxing/src/manager.rs:67][E: codex-rs/sandboxing/src/manager.rs:69][E: codex-rs/sandboxing/src/manager.rs:72]

`SandboxManager::select_initial` 是首轮 backend selector。它通过 `should_sandbox` 处理 `SandboxablePreference::Forbid`、`Require`、`Auto`，再把 true case 映射到当前平台 sandbox，无法提供平台 sandbox 时回落到 `SandboxType::None`。[E: codex-rs/sandboxing/src/manager.rs:280][E: codex-rs/sandboxing/src/manager.rs:288][E: codex-rs/sandboxing/src/manager.rs:294][E: codex-rs/sandboxing/src/manager.rs:295][E: codex-rs/sandboxing/src/manager.rs:310][E: codex-rs/sandboxing/src/manager.rs:311][E: codex-rs/sandboxing/src/manager.rs:312][E: codex-rs/sandboxing/src/manager.rs:313]

`should_require_platform_sandbox` 在 managed network 生效时返回 true，在网络关闭且不是 `ExternalSandbox` 时返回 true，在网络开启且 filesystem 是 restricted 且不存在 `full_disk_write_access` 时也返回 true。[E: codex-rs/sandboxing/src/policy_transforms.rs:509][E: codex-rs/sandboxing/src/policy_transforms.rs:514][E: codex-rs/sandboxing/src/policy_transforms.rs:518][E: codex-rs/sandboxing/src/policy_transforms.rs:519][E: codex-rs/sandboxing/src/policy_transforms.rs:525][E: codex-rs/sandboxing/src/policy_transforms.rs:526]

exec sandbox 总览节点不覆盖 tool schema、approval UI、exec-server JSON-RPC 协议或具体 OS backend 的完整策略语言。工具 schema 的权威节点在 `tool.exec-command`；exec-server 的 WebSocket/PTY lifecycle 在 `subsys.exec-sandbox.exec-server`；Seatbelt、Linux、Windows backend 分别由 `subsys.exec-sandbox.sandbox-seatbelt`、`subsys.exec-sandbox.sandbox-linux`、`subsys.exec-sandbox.sandbox-windows` 细化。[I]

## 关键 crate/文件

- `codex-rs/sandboxing/src/manager.rs`: 定义 `SandboxManager`、`SandboxType`、`SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest`，并实现 backend selection 与 argv transform。[E: codex-rs/sandboxing/src/manager.rs:35][E: codex-rs/sandboxing/src/manager.rs:97][E: codex-rs/sandboxing/src/manager.rs:112][E: codex-rs/sandboxing/src/manager.rs:131][E: codex-rs/sandboxing/src/manager.rs:272][E: codex-rs/sandboxing/src/manager.rs:321]
- `codex-rs/sandboxing/src/policy_transforms.rs`: normalizes additional permissions and, before backend transform, merges `PermissionProfile`, filesystem policy, network policy, and additional permissions into effective policies.[E: codex-rs/sandboxing/src/policy_transforms.rs:445][E: codex-rs/sandboxing/src/policy_transforms.rs:478][E: codex-rs/sandboxing/src/policy_transforms.rs:493]
- `codex-rs/sandboxing/src/lib.rs`: 按 `cfg` 声明 Linux bubblewrap module、policy transforms、macOS Seatbelt module，重导出 manager types，并把 sandbox transform errors 映射到 protocol errors。[E: codex-rs/sandboxing/src/lib.rs:1][E: codex-rs/sandboxing/src/lib.rs:4][E: codex-rs/sandboxing/src/lib.rs:6][E: codex-rs/sandboxing/src/lib.rs:8][E: codex-rs/sandboxing/src/lib.rs:17][E: codex-rs/sandboxing/src/lib.rs:20][E: codex-rs/sandboxing/src/lib.rs:44]

## 数据模型

- `SandboxCommand`: 输入命令的最小不可执行结构，包含 `program`、`args`、`cwd`、`env`、`managed_network`、`additional_permissions`。[E: codex-rs/sandboxing/src/manager.rs:97][E: codex-rs/sandboxing/src/manager.rs:99][E: codex-rs/sandboxing/src/manager.rs:100][E: codex-rs/sandboxing/src/manager.rs:101][E: codex-rs/sandboxing/src/manager.rs:102][E: codex-rs/sandboxing/src/manager.rs:103][E: codex-rs/sandboxing/src/manager.rs:104]
- `SandboxTransformRequest`: transform 的完整输入，包含 command、`PermissionProfile`、目标 sandbox、managed-network 开关、environment id、network proxy、policy cwd、Linux sandbox exe、legacy Landlock 标志、Windows level 和 private desktop 标志。[E: codex-rs/sandboxing/src/manager.rs:131][E: codex-rs/sandboxing/src/manager.rs:132][E: codex-rs/sandboxing/src/manager.rs:133][E: codex-rs/sandboxing/src/manager.rs:134][E: codex-rs/sandboxing/src/manager.rs:135][E: codex-rs/sandboxing/src/manager.rs:136][E: codex-rs/sandboxing/src/manager.rs:139][E: codex-rs/sandboxing/src/manager.rs:140][E: codex-rs/sandboxing/src/manager.rs:141][E: codex-rs/sandboxing/src/manager.rs:142][E: codex-rs/sandboxing/src/manager.rs:143][E: codex-rs/sandboxing/src/manager.rs:144]
- `SandboxExecRequest`: transform 后可交给 spawn 层的结构，保留 `command`、`cwd`、`sandbox_policy_cwd`、`env`、`network`、`network_environment_id`、`sandbox`、Windows 字段、`permission_profile`、filesystem/network runtime policies 和 `arg0` override。[E: codex-rs/sandboxing/src/manager.rs:112][E: codex-rs/sandboxing/src/manager.rs:113][E: codex-rs/sandboxing/src/manager.rs:114][E: codex-rs/sandboxing/src/manager.rs:115][E: codex-rs/sandboxing/src/manager.rs:116][E: codex-rs/sandboxing/src/manager.rs:117][E: codex-rs/sandboxing/src/manager.rs:118][E: codex-rs/sandboxing/src/manager.rs:119][E: codex-rs/sandboxing/src/manager.rs:120][E: codex-rs/sandboxing/src/manager.rs:121][E: codex-rs/sandboxing/src/manager.rs:122][E: codex-rs/sandboxing/src/manager.rs:123][E: codex-rs/sandboxing/src/manager.rs:124][E: codex-rs/sandboxing/src/manager.rs:125]
- `effective_permission_profile`: `policy_transforms` 里的归一化函数先从 `PermissionProfile` 派生 runtime filesystem/network policies，再分别应用 `effective_file_system_sandbox_policy` 和 `effective_network_sandbox_policy`，最后用原 enforcement 重建 effective `PermissionProfile`。[E: codex-rs/sandboxing/src/policy_transforms.rs:493][E: codex-rs/sandboxing/src/policy_transforms.rs:497][E: codex-rs/sandboxing/src/policy_transforms.rs:498][E: codex-rs/sandboxing/src/policy_transforms.rs:500][E: codex-rs/sandboxing/src/policy_transforms.rs:502][E: codex-rs/sandboxing/src/manager.rs:343][E: codex-rs/sandboxing/src/manager.rs:351]

## 控制流

1. `SandboxManager::select_initial` 读取 filesystem policy、network policy、sandboxable preference、Windows level 和 managed network 状态；`Forbid` 走 no sandbox，`Require` 走 platform sandbox，`Auto` 由 `should_require_platform_sandbox` 决定。[E: codex-rs/sandboxing/src/manager.rs:280][E: codex-rs/sandboxing/src/manager.rs:282][E: codex-rs/sandboxing/src/manager.rs:283][E: codex-rs/sandboxing/src/manager.rs:284][E: codex-rs/sandboxing/src/manager.rs:285][E: codex-rs/sandboxing/src/manager.rs:286][E: codex-rs/sandboxing/src/manager.rs:310][E: codex-rs/sandboxing/src/manager.rs:313]
2. `SandboxManager::transform` 先取出 command 上的 `additional_permissions`，合成 effective `PermissionProfile`，再从 profile 派生 runtime filesystem/network policies。[E: codex-rs/sandboxing/src/manager.rs:321][E: codex-rs/sandboxing/src/manager.rs:340][E: codex-rs/sandboxing/src/manager.rs:343][E: codex-rs/sandboxing/src/manager.rs:351]
3. `transform` 把 `SandboxCommand` 拆成 `argv = [program] + args`，这是后续所有 backend wrapper 的基准命令。[E: codex-rs/sandboxing/src/manager.rs:353][E: codex-rs/sandboxing/src/manager.rs:354][E: codex-rs/sandboxing/src/manager.rs:355]
4. 当目标是 `SandboxType::None` 时，`transform` 不插入 wrapper，只返回原始 argv。[E: codex-rs/sandboxing/src/manager.rs:357][E: codex-rs/sandboxing/src/manager.rs:358]
5. 当目标是 `SandboxType::MacosSeatbelt` 且编译平台是 macOS 时，`transform` 调用 `create_seatbelt_command_args` 生成 `sandbox-exec -p ... -- <argv>`，并把 executable 设置为 `/usr/bin/sandbox-exec`。[E: codex-rs/sandboxing/src/manager.rs:360][E: codex-rs/sandboxing/src/manager.rs:366][E: codex-rs/sandboxing/src/manager.rs:377][E: codex-rs/sandboxing/src/manager.rs:379][E: codex-rs/sandboxing/src/manager.rs:380]
6. 当目标是 `SandboxType::LinuxSeccomp` 时，`transform` 要求存在 Linux sandbox executable，调用 `create_linux_sandbox_command_args_for_permission_profile` 生成 helper 参数，然后把 helper exe 插到 argv[0]，并可设置 `arg0` override。[E: codex-rs/sandboxing/src/manager.rs:385][E: codex-rs/sandboxing/src/manager.rs:387][E: codex-rs/sandboxing/src/manager.rs:397][E: codex-rs/sandboxing/src/manager.rs:405][E: codex-rs/sandboxing/src/manager.rs:406][E: codex-rs/sandboxing/src/manager.rs:410]
7. 当目标是 `SandboxType::WindowsRestrictedToken` 时，`transform` 在 `codex_sandboxing` 层保持原始 argv；Windows restricted token 逻辑在 Windows sandbox crate 的 spawn 层实现。[E: codex-rs/sandboxing/src/manager.rs:415][E: codex-rs/sandboxing/src/manager.rs:416][E: codex-rs/sandboxing/src/manager.rs:418][E: codex-rs/sandboxing/src/manager.rs:421][E: codex-rs/sandboxing/src/manager.rs:422][E: codex-rs/sandboxing/src/manager.rs:424]
8. `transform` 最终返回 `SandboxExecRequest`，把改写后的 command、effective cwd/env/network/policies、sandbox 类型、Windows 设置和 `arg0` 一并带回调用者。[E: codex-rs/sandboxing/src/manager.rs:447][E: codex-rs/sandboxing/src/manager.rs:448][E: codex-rs/sandboxing/src/manager.rs:449][E: codex-rs/sandboxing/src/manager.rs:453][E: codex-rs/sandboxing/src/manager.rs:454][E: codex-rs/sandboxing/src/manager.rs:455][E: codex-rs/sandboxing/src/manager.rs:456][E: codex-rs/sandboxing/src/manager.rs:460]

## 设计动机与权衡

- backend selection 与 backend argument synthesis 被放在同一个 `SandboxManager`，让 shell runtime、unified exec 和 escalated exec 可以请求同一种 `SandboxExecRequest`，而不用各自理解 Seatbelt/bwrap/Windows token 参数细节。[I]
- `Auto` 模式把“需要 OS sandbox”的判断集中在 `should_require_platform_sandbox`，因为 managed network、禁用 network、restricted filesystem 都需要平台能力补足普通 spawn 无法表达的限制。[E: codex-rs/sandboxing/src/policy_transforms.rs:509][E: codex-rs/sandboxing/src/policy_transforms.rs:514][E: codex-rs/sandboxing/src/policy_transforms.rs:518][E: codex-rs/sandboxing/src/policy_transforms.rs:525][E: codex-rs/sandboxing/src/policy_transforms.rs:526]
- additional permissions 先合并到 effective `PermissionProfile`，再派生 runtime filesystem/network policies，意味着 backend 只消费 effective permissions，而不需要重复实现 permission merge/intersection。[E: codex-rs/sandboxing/src/manager.rs:340][E: codex-rs/sandboxing/src/manager.rs:343][E: codex-rs/sandboxing/src/manager.rs:351]

## gotcha

- `WindowsRestrictedToken` 在 `SandboxManager::transform` 里不是 argv wrapper；不要在 `codex_sandboxing` 的 manager 层寻找 Windows token creation。[E: codex-rs/sandboxing/src/manager.rs:415][E: codex-rs/sandboxing/src/manager.rs:416][E: codex-rs/sandboxing/src/manager.rs:421][E: codex-rs/sandboxing/src/manager.rs:422]
- `MacosSeatbelt` 在非 macOS 编译目标会返回 `SeatbeltUnavailable`，`LinuxSeccomp` 在缺少 helper exe 时会返回 `MissingLinuxSandboxExecutable`。[E: codex-rs/sandboxing/src/manager.rs:383][E: codex-rs/sandboxing/src/manager.rs:384][E: codex-rs/sandboxing/src/manager.rs:387][E: codex-rs/sandboxing/src/manager.rs:388]
- Linux helper `arg0` override 不是用户命令 argv[0]，而是为了让 helper 以 `codex-linux-sandbox` 这个 argv0 分支重新进入 arg0 dispatch。[E: codex-rs/sandboxing/src/manager.rs:410][E: codex-rs/sandboxing/src/manager.rs:691][E: codex-rs/sandboxing/src/manager.rs:692][E: codex-rs/sandboxing/src/manager.rs:695]

## Sources

- `codex-rs/sandboxing/src/manager.rs`
- `codex-rs/sandboxing/src/policy_transforms.rs`
- `codex-rs/sandboxing/src/lib.rs`

## 相关

- `spine.shell-exec-flow`
- `tool.exec-command`
- `tool.write-stdin`
