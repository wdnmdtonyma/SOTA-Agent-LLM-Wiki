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
updated: 7750465934
---

> exec sandbox 是 Codex 在真正 spawn 进程前，把 permission model、per-OS sandbox backend、managed network、environment id 和 argv wrapper 统一收敛成 `SandboxExecRequest` 的转换层。[E: codex-rs/sandboxing/src/manager.rs:97][E: codex-rs/sandboxing/src/manager.rs:112][E: codex-rs/sandboxing/src/manager.rs:129][E: codex-rs/sandboxing/src/manager.rs:310]

## 能回答的问题

- Codex 怎样在 macOS、Linux、Windows 和 no sandbox 之间选择 backend？
- `SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest` 各自承载什么字段？
- 为什么 managed network、network disabled、restricted filesystem 会影响是否需要平台 sandbox？
- `transform` 怎样把原始命令改写成 `sandbox-exec`、`codex-linux-sandbox` 或原始 argv？
- additional permissions 怎样在进入 backend 前被归一化并合并？
- filesystem/network sandbox denial 怎样被归一化为内部 tracing event？

## 职责边界

exec sandbox 总览节点覆盖 `codex_sandboxing` crate 的 platform selection 与 argv transform。`SandboxType` 的四个 backend 枚举值是 `None`、`MacosSeatbelt`、`LinuxSeccomp`、`WindowsRestrictedToken`。[E: codex-rs/sandboxing/src/manager.rs:35][E: codex-rs/sandboxing/src/manager.rs:36][E: codex-rs/sandboxing/src/manager.rs:37][E: codex-rs/sandboxing/src/manager.rs:38][E: codex-rs/sandboxing/src/manager.rs:39] `get_platform_sandbox` 在 macOS 返回 `MacosSeatbelt`，在 Linux 返回 `LinuxSeccomp`，在 Windows 且 `windows_sandbox_enabled` 为 true 时返回 `WindowsRestrictedToken`，否则返回 `None`。[E: codex-rs/sandboxing/src/manager.rs:60][E: codex-rs/sandboxing/src/manager.rs:61][E: codex-rs/sandboxing/src/manager.rs:63][E: codex-rs/sandboxing/src/manager.rs:65][E: codex-rs/sandboxing/src/manager.rs:66][E: codex-rs/sandboxing/src/manager.rs:67][E: codex-rs/sandboxing/src/manager.rs:69][E: codex-rs/sandboxing/src/manager.rs:72]

`SandboxManager::select_initial` 是首轮 backend selector。它把 canonical `PermissionProfile` 交给 `should_sandbox`，后者处理 `SandboxablePreference::Forbid`、`Require`、`Auto`；true case 映射到当前平台 sandbox，无法提供平台 sandbox 时回落到 `SandboxType::None`。[E: codex-rs/sandboxing/src/manager.rs:272][E: codex-rs/sandboxing/src/manager.rs:274][E: codex-rs/sandboxing/src/manager.rs:279][E: codex-rs/sandboxing/src/manager.rs:280][E: codex-rs/sandboxing/src/manager.rs:281][E: codex-rs/sandboxing/src/manager.rs:289][E: codex-rs/sandboxing/src/manager.rs:295][E: codex-rs/sandboxing/src/manager.rs:299]

`should_require_platform_sandbox` 在 managed network 生效时返回 true，在网络关闭且不是 `ExternalSandbox` 时返回 true，在网络开启且 filesystem 是 restricted 且不存在 `full_disk_write_access` 时也返回 true。[E: codex-rs/sandboxing/src/policy_transforms.rs:523][E: codex-rs/sandboxing/src/policy_transforms.rs:528][E: codex-rs/sandboxing/src/policy_transforms.rs:532][E: codex-rs/sandboxing/src/policy_transforms.rs:533][E: codex-rs/sandboxing/src/policy_transforms.rs:539][E: codex-rs/sandboxing/src/policy_transforms.rs:540]

exec sandbox 总览节点不覆盖 tool schema、approval UI、exec-server JSON-RPC 协议或具体 OS backend 的完整策略语言。工具 schema 的权威节点在 `tool.exec-command`；exec-server 的 WebSocket/PTY lifecycle 在 `subsys.exec-sandbox.exec-server`；Seatbelt、Linux、Windows backend 分别由 `subsys.exec-sandbox.sandbox-seatbelt`、`subsys.exec-sandbox.sandbox-linux`、`subsys.exec-sandbox.sandbox-windows` 细化。[I]

## 关键 crate/文件

- `codex-rs/sandboxing/src/manager.rs`: 定义 `SandboxManager`、`SandboxType`、`SandboxCommand`、`SandboxTransformRequest`、`SandboxExecRequest`，并实现 backend selection 与 argv transform。[E: codex-rs/sandboxing/src/manager.rs:35][E: codex-rs/sandboxing/src/manager.rs:97][E: codex-rs/sandboxing/src/manager.rs:112][E: codex-rs/sandboxing/src/manager.rs:129][E: codex-rs/sandboxing/src/manager.rs:264][E: codex-rs/sandboxing/src/manager.rs:310]
- `codex-rs/sandboxing/src/policy_transforms.rs`: normalizes additional permissions and, before backend transform, merges `PermissionProfile`, filesystem policy, network policy, and additional permissions into effective policies.[E: codex-rs/sandboxing/src/policy_transforms.rs:459][E: codex-rs/sandboxing/src/policy_transforms.rs:492][E: codex-rs/sandboxing/src/policy_transforms.rs:507]
- `codex-rs/sandboxing/src/violation.rs`: 归一化 filesystem/network denial 的 backend、reason 与 bounded diagnostic fields，再写入 tracing stack。[E: codex-rs/sandboxing/src/violation.rs:41][E: codex-rs/sandboxing/src/violation.rs:48][E: codex-rs/sandboxing/src/violation.rs:68][E: codex-rs/sandboxing/src/violation.rs:101][E: codex-rs/sandboxing/src/violation.rs:203]
- `codex-rs/sandboxing/src/lib.rs`: 按 `cfg` 声明 platform modules，重导出 manager 与 violation types，并把 sandbox transform errors 映射到 protocol errors。[E: codex-rs/sandboxing/src/lib.rs:1][E: codex-rs/sandboxing/src/lib.rs:5][E: codex-rs/sandboxing/src/lib.rs:10][E: codex-rs/sandboxing/src/lib.rs:19][E: codex-rs/sandboxing/src/lib.rs:33][E: codex-rs/sandboxing/src/lib.rs:57]

## 数据模型

- `SandboxCommand`: 输入命令的最小不可执行结构，包含 `program`、`args`、`cwd`、`env`、`managed_network`、`additional_permissions`。[E: codex-rs/sandboxing/src/manager.rs:97][E: codex-rs/sandboxing/src/manager.rs:99][E: codex-rs/sandboxing/src/manager.rs:100][E: codex-rs/sandboxing/src/manager.rs:101][E: codex-rs/sandboxing/src/manager.rs:102][E: codex-rs/sandboxing/src/manager.rs:103][E: codex-rs/sandboxing/src/manager.rs:104]
- `SandboxTransformRequest`: transform 的完整输入，包含 command、`PermissionProfile`、目标 sandbox、managed-network 开关、environment id、network proxy、policy cwd、Linux sandbox exe、legacy Landlock 标志、Windows level 和 private desktop 标志。[E: codex-rs/sandboxing/src/manager.rs:129][E: codex-rs/sandboxing/src/manager.rs:130][E: codex-rs/sandboxing/src/manager.rs:131][E: codex-rs/sandboxing/src/manager.rs:132][E: codex-rs/sandboxing/src/manager.rs:133][E: codex-rs/sandboxing/src/manager.rs:134][E: codex-rs/sandboxing/src/manager.rs:137][E: codex-rs/sandboxing/src/manager.rs:138][E: codex-rs/sandboxing/src/manager.rs:139][E: codex-rs/sandboxing/src/manager.rs:140][E: codex-rs/sandboxing/src/manager.rs:141][E: codex-rs/sandboxing/src/manager.rs:142]
- `SandboxExecRequest`: transform 后可交给 spawn 层的结构，保留改写后的 command、URI cwd/policy cwd、env、network 与 environment id、sandbox/Windows 设置、canonical effective `permission_profile` 和 optional `arg0` override；它不再并存一份 derived filesystem/network runtime policies。[E: codex-rs/sandboxing/src/manager.rs:112][E: codex-rs/sandboxing/src/manager.rs:113][E: codex-rs/sandboxing/src/manager.rs:114][E: codex-rs/sandboxing/src/manager.rs:115][E: codex-rs/sandboxing/src/manager.rs:116][E: codex-rs/sandboxing/src/manager.rs:117][E: codex-rs/sandboxing/src/manager.rs:118][E: codex-rs/sandboxing/src/manager.rs:119][E: codex-rs/sandboxing/src/manager.rs:120][E: codex-rs/sandboxing/src/manager.rs:121][E: codex-rs/sandboxing/src/manager.rs:122][E: codex-rs/sandboxing/src/manager.rs:123]
- `effective_permission_profile`: `policy_transforms` 里的归一化函数短暂派生 runtime filesystem/network policies，分别应用 additional permissions，再用原 enforcement 重建一个 canonical effective profile。[E: codex-rs/sandboxing/src/policy_transforms.rs:507][E: codex-rs/sandboxing/src/policy_transforms.rs:511][E: codex-rs/sandboxing/src/policy_transforms.rs:513][E: codex-rs/sandboxing/src/policy_transforms.rs:515][E: codex-rs/sandboxing/src/policy_transforms.rs:516][E: codex-rs/sandboxing/src/manager.rs:332]
- `SandboxViolationEvent`: `FileSystem`/`Network` 两类内部 tracing event；backend 统一为 Linux sandbox、managed network proxy、Seatbelt 或 Windows sandbox。它不是 protocol `EventMsg`。[E: codex-rs/sandboxing/src/violation.rs:41][E: codex-rs/sandboxing/src/violation.rs:42][E: codex-rs/sandboxing/src/violation.rs:48][E: codex-rs/sandboxing/src/violation.rs:203]

## 控制流

1. `SandboxManager::select_initial` 读取 canonical `PermissionProfile`、sandboxable preference、Windows level 和 managed-network 状态；`Forbid` 走 no sandbox，`Require` 走 platform sandbox，`Auto` 才临时派生 runtime policies 并调用 `should_require_platform_sandbox`。[E: codex-rs/sandboxing/src/manager.rs:272][E: codex-rs/sandboxing/src/manager.rs:274][E: codex-rs/sandboxing/src/manager.rs:275][E: codex-rs/sandboxing/src/manager.rs:276][E: codex-rs/sandboxing/src/manager.rs:277][E: codex-rs/sandboxing/src/manager.rs:295][E: codex-rs/sandboxing/src/manager.rs:299][E: codex-rs/sandboxing/src/manager.rs:301]
2. `SandboxManager::transform` 先取出 command 上的 `additional_permissions` 并合成 effective `PermissionProfile`；Seatbelt 在生成 SBPL、Linux 在生成 helper argv 时才从 profile 派生 backend runtime permissions。[E: codex-rs/sandboxing/src/manager.rs:310][E: codex-rs/sandboxing/src/manager.rs:329][E: codex-rs/sandboxing/src/manager.rs:332][E: codex-rs/sandboxing/src/manager.rs:353][E: codex-rs/sandboxing/src/manager.rs:356][E: codex-rs/sandboxing/src/manager.rs:389]
3. `transform` 把 `SandboxCommand` 拆成 `argv = [program] + args`，这是后续所有 backend wrapper 的基准命令。[E: codex-rs/sandboxing/src/manager.rs:340][E: codex-rs/sandboxing/src/manager.rs:341][E: codex-rs/sandboxing/src/manager.rs:342]
4. 当目标是 `SandboxType::None` 时，`transform` 不插入 wrapper，只返回原始 argv。[E: codex-rs/sandboxing/src/manager.rs:344][E: codex-rs/sandboxing/src/manager.rs:345]
5. 当目标是 `SandboxType::MacosSeatbelt` 且编译平台是 macOS 时，`transform` 调用 `create_seatbelt_command_args` 生成 `sandbox-exec -p ... -- <argv>`，并把 executable 设置为 `/usr/bin/sandbox-exec`。[E: codex-rs/sandboxing/src/manager.rs:347][E: codex-rs/sandboxing/src/manager.rs:356][E: codex-rs/sandboxing/src/manager.rs:367][E: codex-rs/sandboxing/src/manager.rs:369][E: codex-rs/sandboxing/src/manager.rs:370]
6. 当目标是 `SandboxType::LinuxSeccomp` 时，`transform` 要求存在 Linux sandbox executable，调用 `create_linux_sandbox_command_args_for_permission_profile` 生成 helper 参数，然后把 helper exe 插到 argv[0]，并可设置 `arg0` override。[E: codex-rs/sandboxing/src/manager.rs:375][E: codex-rs/sandboxing/src/manager.rs:377][E: codex-rs/sandboxing/src/manager.rs:389][E: codex-rs/sandboxing/src/manager.rs:397][E: codex-rs/sandboxing/src/manager.rs:398][E: codex-rs/sandboxing/src/manager.rs:402]
7. 当目标是 `SandboxType::WindowsRestrictedToken` 时，`transform` 在 `codex_sandboxing` 层保持原始 argv；Windows restricted token 逻辑在 Windows sandbox crate 的 spawn 层实现。[E: codex-rs/sandboxing/src/manager.rs:407][E: codex-rs/sandboxing/src/manager.rs:408][E: codex-rs/sandboxing/src/manager.rs:410][E: codex-rs/sandboxing/src/manager.rs:413][E: codex-rs/sandboxing/src/manager.rs:414][E: codex-rs/sandboxing/src/manager.rs:416]
8. `transform` 最终返回 `SandboxExecRequest`，把改写后的 command、cwd/env/network、canonical effective profile、sandbox 类型、Windows 设置和 `arg0` 一并带回调用者；unsandboxed foreign cwd 也保留 base effective profile。[E: codex-rs/sandboxing/src/manager.rs:423][E: codex-rs/sandboxing/src/manager.rs:428][E: codex-rs/sandboxing/src/manager.rs:429][E: codex-rs/sandboxing/src/manager.rs:430][E: codex-rs/sandboxing/src/manager.rs:434][E: codex-rs/sandboxing/src/manager.rs:435][E: codex-rs/sandboxing/src/manager.rs:436][E: codex-rs/sandboxing/src/manager.rs:437][E: codex-rs/sandboxing/src/manager.rs:438][E: codex-rs/sandboxing/src/manager.rs:439]

## 设计动机与权衡

- backend selection 与 backend argument synthesis 被放在同一个 `SandboxManager`，让 shell runtime、unified exec 和 escalated exec 可以请求同一种 `SandboxExecRequest`，而不用各自理解 Seatbelt/bwrap/Windows token 参数细节。[I]
- `Auto` 模式把“需要 OS sandbox”的判断集中在 `should_require_platform_sandbox`，因为 managed network、禁用 network、restricted filesystem 都需要平台能力补足普通 spawn 无法表达的限制。[E: codex-rs/sandboxing/src/policy_transforms.rs:523][E: codex-rs/sandboxing/src/policy_transforms.rs:528][E: codex-rs/sandboxing/src/policy_transforms.rs:532][E: codex-rs/sandboxing/src/policy_transforms.rs:539][E: codex-rs/sandboxing/src/policy_transforms.rs:540]
- additional permissions 先合并到一个 canonical effective `PermissionProfile`；backend 只在真正消费策略时展开 runtime policies，避免跨层同时传递 profile 与 derived copies。[E: codex-rs/sandboxing/src/manager.rs:329][E: codex-rs/sandboxing/src/manager.rs:332][E: codex-rs/sandboxing/src/manager.rs:353][E: codex-rs/sandboxing/src/manager.rs:389]
- filesystem violation classifier 只对真实 sandbox backend、非零退出且命中已知输出 signature 或 Linux `SIGSYS` 时记录；quick-reject shell codes 不会被盲目归因。[E: codex-rs/sandboxing/src/violation.rs:134][E: codex-rs/sandboxing/src/violation.rs:138][E: codex-rs/sandboxing/src/violation.rs:141][E: codex-rs/sandboxing/src/violation.rs:148][E: codex-rs/sandboxing/src/violation.rs:157][E: codex-rs/sandboxing/src/violation.rs:163]

## gotcha

- `WindowsRestrictedToken` 在 `SandboxManager::transform` 里不是 argv wrapper；不要在 `codex_sandboxing` 的 manager 层寻找 Windows token creation。[E: codex-rs/sandboxing/src/manager.rs:407][E: codex-rs/sandboxing/src/manager.rs:408][E: codex-rs/sandboxing/src/manager.rs:413][E: codex-rs/sandboxing/src/manager.rs:414]
- `MacosSeatbelt` 在非 macOS 编译目标会返回 `SeatbeltUnavailable`，`LinuxSeccomp` 在缺少 helper exe 时会返回 `MissingLinuxSandboxExecutable`。[E: codex-rs/sandboxing/src/manager.rs:373][E: codex-rs/sandboxing/src/manager.rs:374][E: codex-rs/sandboxing/src/manager.rs:377][E: codex-rs/sandboxing/src/manager.rs:378]
- Linux helper `arg0` override 不是用户命令 argv[0]，而是为了让 helper 以 `codex-linux-sandbox` 这个 argv0 分支重新进入 arg0 dispatch。[E: codex-rs/sandboxing/src/manager.rs:402][E: codex-rs/sandboxing/src/manager.rs:684][E: codex-rs/sandboxing/src/manager.rs:685][E: codex-rs/sandboxing/src/manager.rs:688]

## Sources

- `codex-rs/sandboxing/src/manager.rs`
- `codex-rs/sandboxing/src/policy_transforms.rs`
- `codex-rs/sandboxing/src/violation.rs`
- `codex-rs/sandboxing/src/lib.rs`

## 相关

- `spine.shell-exec-flow`
- `tool.exec-command`
- `tool.write-stdin`
