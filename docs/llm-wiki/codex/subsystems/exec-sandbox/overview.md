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
updated: 37aadeaa13
---

> exec sandbox 是 Codex 在真正 spawn 进程前，把 permission model、per-OS sandbox backend、network proxy 和 argv wrapper 统一收敛成 `SandboxExecRequest` 的转换层。[I]

## 能回答的问题

- Codex 怎样在 macOS、Linux、Windows 和 no sandbox 之间选择 backend？
- `SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest` 各自承载什么字段？
- 为什么 managed network、network disabled、restricted filesystem 会影响是否需要平台 sandbox？
- `transform` 怎样把原始命令改写成 `sandbox-exec`、`codex-linux-sandbox` 或原始 argv？
- additional permissions 怎样在进入 backend 前被归一化并合并？

## 职责边界

exec sandbox 总览节点覆盖 `codex_sandboxing` crate 的 platform selection 与 argv transform。`SandboxType` 的四个 backend 枚举值是 `None`、`MacosSeatbelt`、`LinuxSeccomp`、`WindowsRestrictedToken`。[E: codex-rs/sandboxing/src/manager.rs:25][E: codex-rs/sandboxing/src/manager.rs:26][E: codex-rs/sandboxing/src/manager.rs:27][E: codex-rs/sandboxing/src/manager.rs:28] `get_platform_sandbox` 在 macOS 返回 `MacosSeatbelt`，在 Linux 返回 `LinuxSeccomp`，在 Windows 且 `windows_sandbox_enabled` 为 true 时返回 `WindowsRestrictedToken`，否则返回 `None`。[E: codex-rs/sandboxing/src/manager.rs:50][E: codex-rs/sandboxing/src/manager.rs:52][E: codex-rs/sandboxing/src/manager.rs:55][E: codex-rs/sandboxing/src/manager.rs:56][E: codex-rs/sandboxing/src/manager.rs:58]

`SandboxManager::select_initial` 是首轮 backend selector。`SandboxablePreference::Forbid` 直接选择 `SandboxType::None`，`SandboxablePreference::Require` 直接选择当前平台 sandbox，`SandboxablePreference::Auto` 会调用 `should_require_platform_sandbox` 再决定是否使用平台 sandbox。[E: codex-rs/sandboxing/src/manager.rs:151][E: codex-rs/sandboxing/src/manager.rs:152][E: codex-rs/sandboxing/src/manager.rs:157][E: codex-rs/sandboxing/src/manager.rs:164] `should_require_platform_sandbox` 在 managed network 生效时返回 true，在网络关闭且不是 `ExternalSandbox` 时返回 true，在网络开启且 filesystem 是 restricted 且不存在 `full_disk_write_access` 时也返回 true。[E: codex-rs/sandboxing/src/policy_transforms.rs:670][E: codex-rs/sandboxing/src/policy_transforms.rs:674][E: codex-rs/sandboxing/src/policy_transforms.rs:681]

exec sandbox 总览节点不覆盖 tool schema、approval UI、exec-server JSON-RPC 协议或具体 OS backend 的完整策略语言。工具 schema 的权威节点在 `tool.exec-command`；exec-server 的 WebSocket/PTY lifecycle 在 `subsys.exec-sandbox.exec-server`；Seatbelt、Linux、Windows backend 分别由 `subsys.exec-sandbox.sandbox-seatbelt`、`subsys.exec-sandbox.sandbox-linux`、`subsys.exec-sandbox.sandbox-windows` 细化。[I]

## 关键 crate/文件

- `codex-rs/sandboxing/src/manager.rs`: 定义 `SandboxManager`、`SandboxType`、`SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest`，并实现 backend selection 与 argv transform。[E: codex-rs/sandboxing/src/manager.rs:23][E: codex-rs/sandboxing/src/manager.rs:65][E: codex-rs/sandboxing/src/manager.rs:74][E: codex-rs/sandboxing/src/manager.rs:92]
- `codex-rs/sandboxing/src/policy_transforms.rs`: 在 backend transform 前把 `PermissionProfile`、filesystem policy、network policy、additional permissions 合成 effective policy。[E: codex-rs/sandboxing/src/policy_transforms.rs:27][E: codex-rs/sandboxing/src/policy_transforms.rs:585]
- `codex-rs/sandboxing/src/lib.rs`: 按 `cfg` 声明 Linux bubblewrap module、policy transforms、macOS Seatbelt module，重导出 manager types，并把 sandbox transform errors 映射到 protocol errors。[E: codex-rs/sandboxing/src/lib.rs:1][E: codex-rs/sandboxing/src/lib.rs:5][E: codex-rs/sandboxing/src/lib.rs:7][E: codex-rs/sandboxing/src/lib.rs:13][E: codex-rs/sandboxing/src/lib.rs:31]

## 数据模型

- `SandboxCommand`: 输入命令的最小不可执行结构，包含 `program`、`args`、`cwd`、`env`、`additional_permissions`。[E: codex-rs/sandboxing/src/manager.rs:66][E: codex-rs/sandboxing/src/manager.rs:67][E: codex-rs/sandboxing/src/manager.rs:68][E: codex-rs/sandboxing/src/manager.rs:69][E: codex-rs/sandboxing/src/manager.rs:70]
- `SandboxTransformRequest`: transform 的完整输入，包含 command、sandbox policy、filesystem policy、network policy、目标 sandbox、managed network 开关、network proxy、policy cwd、Linux sandbox exe、legacy Landlock 标志、Windows level 和 private desktop 标志。[E: codex-rs/sandboxing/src/manager.rs:93][E: codex-rs/sandboxing/src/manager.rs:94][E: codex-rs/sandboxing/src/manager.rs:95][E: codex-rs/sandboxing/src/manager.rs:96][E: codex-rs/sandboxing/src/manager.rs:97][E: codex-rs/sandboxing/src/manager.rs:98][E: codex-rs/sandboxing/src/manager.rs:99][E: codex-rs/sandboxing/src/manager.rs:100][E: codex-rs/sandboxing/src/manager.rs:101][E: codex-rs/sandboxing/src/manager.rs:102][E: codex-rs/sandboxing/src/manager.rs:103][E: codex-rs/sandboxing/src/manager.rs:104]
- `SandboxExecRequest`: transform 后可交给 spawn 层的结构，保留 `command`、`cwd`、`env`、`network`、`sandbox`、Windows 字段 `windows_sandbox_level`/`windows_sandbox_private_desktop`、三类 policy(`sandbox_policy`/`file_system_sandbox_policy`/`network_sandbox_policy`)和 `arg0` override。[E: codex-rs/sandboxing/src/manager.rs:75][E: codex-rs/sandboxing/src/manager.rs:76][E: codex-rs/sandboxing/src/manager.rs:77][E: codex-rs/sandboxing/src/manager.rs:78][E: codex-rs/sandboxing/src/manager.rs:79][E: codex-rs/sandboxing/src/manager.rs:80][E: codex-rs/sandboxing/src/manager.rs:81][E: codex-rs/sandboxing/src/manager.rs:82][E: codex-rs/sandboxing/src/manager.rs:83][E: codex-rs/sandboxing/src/manager.rs:84][E: codex-rs/sandboxing/src/manager.rs:85][E: codex-rs/sandboxing/src/manager.rs:86]
- `EffectiveSandboxPermissions`: `policy_transforms` 里的内部归一化对象，当前只持有合成后的 `sandbox_policy`；`new` 接收 base policy 与 optional additional permissions，并在存在 additional permissions 时调用 effective sandbox policy 计算。[E: codex-rs/sandboxing/src/policy_transforms.rs:24][E: codex-rs/sandboxing/src/policy_transforms.rs:28][E: codex-rs/sandboxing/src/policy_transforms.rs:30][E: codex-rs/sandboxing/src/policy_transforms.rs:39]

## 控制流

1. `SandboxManager::select_initial` 读取 filesystem policy、network policy、sandboxable preference、Windows level 和 managed network 状态；`Forbid` 走 no sandbox，`Require` 走 platform sandbox，`Auto` 由 `should_require_platform_sandbox` 决定。[E: codex-rs/sandboxing/src/manager.rs:142][E: codex-rs/sandboxing/src/manager.rs:151][E: codex-rs/sandboxing/src/manager.rs:152][E: codex-rs/sandboxing/src/manager.rs:157]
2. `SandboxManager::transform` 先取出 command 上的 `additional_permissions`，用 `EffectiveSandboxPermissions::new` 得到 effective `SandboxPolicy`，再分别计算 effective filesystem policy 和 effective network policy。[E: codex-rs/sandboxing/src/manager.rs:189][E: codex-rs/sandboxing/src/manager.rs:190][E: codex-rs/sandboxing/src/manager.rs:193][E: codex-rs/sandboxing/src/manager.rs:197]
3. `transform` 把 `SandboxCommand` 拆成 `argv = [program] + args`，这是后续所有 backend wrapper 的基准命令。[E: codex-rs/sandboxing/src/manager.rs:199][E: codex-rs/sandboxing/src/manager.rs:200]
4. 当目标是 `SandboxType::None` 时，`transform` 不插入 wrapper，只返回原始 argv。[E: codex-rs/sandboxing/src/manager.rs:203][E: codex-rs/sandboxing/src/manager.rs:204]
5. 当目标是 `SandboxType::MacosSeatbelt` 且编译平台是 macOS 时，`transform` 调用 `create_seatbelt_command_args` 生成 `sandbox-exec -p ... -- <argv>`，并把 executable 设置为 `/usr/bin/sandbox-exec`。[E: codex-rs/sandboxing/src/manager.rs:205][E: codex-rs/sandboxing/src/manager.rs:209][E: codex-rs/sandboxing/src/manager.rs:219][E: codex-rs/sandboxing/src/manager.rs:220]
6. 当目标是 `SandboxType::LinuxSeccomp` 时，`transform` 要求存在 Linux sandbox executable，调用 `create_linux_sandbox_command_args_for_policies` 生成 helper 参数，然后把 helper exe 插到 argv[0]，并可设置 `arg0` override。[E: codex-rs/sandboxing/src/manager.rs:227][E: codex-rs/sandboxing/src/manager.rs:229][E: codex-rs/sandboxing/src/manager.rs:238][E: codex-rs/sandboxing/src/manager.rs:249][E: codex-rs/sandboxing/src/manager.rs:251]
7. 当目标是 `SandboxType::WindowsRestrictedToken` 时，`transform` 在 `codex_sandboxing` 层保持原始 argv；Windows restricted token 逻辑在 Windows sandbox crate 的 spawn 层实现。[E: codex-rs/sandboxing/src/manager.rs:253][E: codex-rs/sandboxing/src/manager.rs:256]
8. `transform` 最终返回 `SandboxExecRequest`，把改写后的 command、effective cwd/env/network/policies、sandbox 类型、Windows 设置和 `arg0` 一并带回调用者。[E: codex-rs/sandboxing/src/manager.rs:259][E: codex-rs/sandboxing/src/manager.rs:271]

## 设计动机与权衡

- backend selection 与 backend argument synthesis 被放在同一个 `SandboxManager`，让 shell runtime、unified exec 和 escalated exec 可以请求同一种 `SandboxExecRequest`，而不用各自理解 Seatbelt/bwrap/Windows token 参数细节。[I]
- `Auto` 模式把“需要 OS sandbox”的判断集中在 `should_require_platform_sandbox`，因为 managed network、禁用 network、restricted filesystem 都需要平台能力补足普通 spawn 无法表达的限制。[E: codex-rs/sandboxing/src/policy_transforms.rs:665][E: codex-rs/sandboxing/src/policy_transforms.rs:670][E: codex-rs/sandboxing/src/policy_transforms.rs:674][E: codex-rs/sandboxing/src/policy_transforms.rs:681]
- additional permissions 先经过 `EffectiveSandboxPermissions::new`、`effective_file_system_sandbox_policy` 和 `effective_network_sandbox_policy`，意味着 backend 只消费 effective policies，而不需要重复实现 permission merge/intersection。[E: codex-rs/sandboxing/src/manager.rs:190][E: codex-rs/sandboxing/src/manager.rs:193][E: codex-rs/sandboxing/src/manager.rs:197]

## gotcha

- `WindowsRestrictedToken` 在 `SandboxManager::transform` 里不是 argv wrapper；不要在 `codex_sandboxing` 的 manager 层寻找 Windows token creation。[E: codex-rs/sandboxing/src/manager.rs:253][E: codex-rs/sandboxing/src/manager.rs:256]
- `MacosSeatbelt` 在非 macOS 编译目标会返回 `SeatbeltUnavailable`，`LinuxSeccomp` 在缺少 helper exe 时会返回 `MissingLinuxSandboxExecutable`。[E: codex-rs/sandboxing/src/manager.rs:226][E: codex-rs/sandboxing/src/manager.rs:229]
- Linux helper `arg0` override 不是用户命令 argv[0]，而是为了让 helper 以 `codex-linux-sandbox` 这个 argv0 分支重新进入 arg0 dispatch。[E: codex-rs/sandboxing/src/manager.rs:303][E: codex-rs/sandboxing/src/manager.rs:309]

## Sources

- `codex-rs/sandboxing/src/manager.rs`
- `codex-rs/sandboxing/src/policy_transforms.rs`
- `codex-rs/sandboxing/src/lib.rs`

## 相关

- `spine.shell-exec-flow`
- `tool.exec-command`
- `tool.write-stdin`
