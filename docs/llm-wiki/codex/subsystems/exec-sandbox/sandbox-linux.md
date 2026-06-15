---
id: subsys.exec-sandbox.sandbox-linux
title: Linux sandbox
kind: subsystem
tier: T2
source: [codex-rs/linux-sandbox/src, codex-rs/sandboxing/src/manager.rs]
symbols: [LandlockCommand, run_main, apply_sandbox_policy_to_current_thread, create_bwrap_command_args, BwrapNetworkMode, prepare_host_proxy_route_spec, activate_proxy_routes_in_netns]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.arg0-dispatch, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Linux sandbox backend 是一个两阶段 helper:外层用 bubblewrap 建 mount/user/pid/network namespace，inner stage 在 bubblewrap 建好的 filesystem view 中安装 seccomp/no_new_privs 相关限制，然后 exec 用户命令；legacy Landlock filesystem enforcement 是 separate legacy path。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:177][E: codex-rs/linux-sandbox/src/linux_run_main.rs:199][E: codex-rs/linux-sandbox/src/linux_run_main.rs:138][E: codex-rs/linux-sandbox/src/linux_run_main.rs:150][E: codex-rs/linux-sandbox/src/linux_run_main.rs:154][E: codex-rs/linux-sandbox/src/linux_run_main.rs:160][E: codex-rs/linux-sandbox/src/linux_run_main.rs:210]

## 能回答的问题

- `codex-linux-sandbox` CLI 接收哪些 policy 参数和 command 参数？
- bubblewrap、Landlock、seccomp 分别负责哪部分隔离？
- managed network proxy 如何在 host namespace 和 sandbox namespace 之间桥接？
- full disk write、restricted read/write、unreadable globs 在 bwrap argv 中如何表现？
- legacy Landlock 与 split policy 为什么要互相转换和校验？

## 职责边界

Linux sandbox 节点覆盖 `codex-rs/linux-sandbox/src` helper 的 CLI、bwrap argv、Landlock/seccomp、proxy route activation 和 helper exec path。`SandboxManager::transform` 负责把 helper executable 插到 argv[0]，并给 helper 传入 policy 参数；真正执行 helper 主逻辑的是 `codex_linux_sandbox::run_main()`。[E: codex-rs/sandboxing/src/manager.rs:244][E: codex-rs/sandboxing/src/manager.rs:247][E: codex-rs/linux-sandbox/src/lib.rs:19][E: codex-rs/linux-sandbox/src/lib.rs:21]

## 关键 crate/文件

- `codex-rs/linux-sandbox/src/linux_run_main.rs`: CLI parser、两阶段 outer/inner flow、policy resolution、bwrap fallback、inner seccomp command generation。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:23][E: codex-rs/linux-sandbox/src/linux_run_main.rs:101][E: codex-rs/linux-sandbox/src/linux_run_main.rs:275][E: codex-rs/linux-sandbox/src/linux_run_main.rs:650]
- `codex-rs/linux-sandbox/src/bwrap.rs`: filesystem namespace 与 bubblewrap argv 生成。[E: codex-rs/linux-sandbox/src/bwrap.rs:113][E: codex-rs/linux-sandbox/src/bwrap.rs:171][E: codex-rs/linux-sandbox/src/bwrap.rs:222]
- `codex-rs/linux-sandbox/src/landlock.rs`: no_new_privs、seccomp 网络过滤、ptrace/io_uring deny、legacy Landlock filesystem enforcement。[E: codex-rs/linux-sandbox/src/landlock.rs:42][E: codex-rs/linux-sandbox/src/landlock.rs:56][E: codex-rs/linux-sandbox/src/landlock.rs:175][E: codex-rs/linux-sandbox/src/landlock.rs:136]
- `codex-rs/linux-sandbox/src/proxy_routing.rs`: managed network proxy route spec、host bridge、sandbox namespace bridge、proxy env rewrite。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:70][E: codex-rs/linux-sandbox/src/proxy_routing.rs:121][E: codex-rs/linux-sandbox/src/proxy_routing.rs:419][E: codex-rs/linux-sandbox/src/proxy_routing.rs:475]
- `codex-rs/linux-sandbox/src/launcher.rs`: system/vendored bubblewrap selection 与 `--argv0` support probing。[E: codex-rs/linux-sandbox/src/launcher.rs:14][E: codex-rs/linux-sandbox/src/launcher.rs:26][E: codex-rs/linux-sandbox/src/launcher.rs:35][E: codex-rs/linux-sandbox/src/launcher.rs:78]

## 数据模型

- `LandlockCommand`: CLI struct，包含 sandbox policy cwd、command cwd、legacy `sandbox_policy`、split filesystem/network policy、legacy flag、inner mode flag、proxy flags、`no_proc` 和 trailing command。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:23][E: codex-rs/linux-sandbox/src/linux_run_main.rs:32][E: codex-rs/linux-sandbox/src/linux_run_main.rs:41][E: codex-rs/linux-sandbox/src/linux_run_main.rs:48][E: codex-rs/linux-sandbox/src/linux_run_main.rs:51][E: codex-rs/linux-sandbox/src/linux_run_main.rs:54][E: codex-rs/linux-sandbox/src/linux_run_main.rs:60][E: codex-rs/linux-sandbox/src/linux_run_main.rs:68][E: codex-rs/linux-sandbox/src/linux_run_main.rs:76][E: codex-rs/linux-sandbox/src/linux_run_main.rs:86][E: codex-rs/linux-sandbox/src/linux_run_main.rs:90]
- `BwrapOptions`: bubblewrap argv builder 的选项结构，仅含三个字段——`mount_proc`(是否 mount 新 `/proc`)、`network_mode`(`BwrapNetworkMode`)、`glob_scan_max_depth`(unreadable glob 展开的可选最大深度);command、policy cwd、command cwd、filesystem policy 等不是该结构的字段，而是 `create_bwrap_command_args` 的独立入参。[E: codex-rs/linux-sandbox/src/bwrap.rs:54][E: codex-rs/linux-sandbox/src/bwrap.rs:59][E: codex-rs/linux-sandbox/src/bwrap.rs:61][E: codex-rs/linux-sandbox/src/bwrap.rs:66]
- `BwrapNetworkMode`: `FullAccess` 不 unshare network，`Isolated` 和 `ProxyOnly` 都会 unshare network。[E: codex-rs/linux-sandbox/src/bwrap.rs:79][E: codex-rs/linux-sandbox/src/bwrap.rs:81][E: codex-rs/linux-sandbox/src/bwrap.rs:82][E: codex-rs/linux-sandbox/src/bwrap.rs:87][E: codex-rs/linux-sandbox/src/bwrap.rs:91]
- `NetworkSeccompMode`: `Restricted` 表示禁网络，`ProxyRouted` 表示只允许 proxy-routed 形态所需 socket 行为。[E: codex-rs/linux-sandbox/src/landlock.rs:89][E: codex-rs/linux-sandbox/src/landlock.rs:91][E: codex-rs/linux-sandbox/src/landlock.rs:92]

## 控制流

1. `run_main` 解析 `LandlockCommand`，拒绝空 command，并校验 inner mode 参数组合。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:101][E: codex-rs/linux-sandbox/src/linux_run_main.rs:116][E: codex-rs/linux-sandbox/src/linux_run_main.rs:119]
2. `resolve_sandbox_policies` 把 legacy `SandboxPolicy` 与 split filesystem/network policy 对齐；部分缺失会报错，legacy/split 同时存在但语义不一致也会报错。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:275][E: codex-rs/linux-sandbox/src/linux_run_main.rs:284][E: codex-rs/linux-sandbox/src/linux_run_main.rs:303][E: codex-rs/linux-sandbox/src/linux_run_main.rs:350]
3. inner stage 由 `--apply-seccomp-then-exec` 触发：如果存在 proxy route spec 则先 `activate_proxy_routes_in_netns`，然后以 `apply_landlock_fs = false` 调用 `apply_sandbox_policy_to_current_thread` 安装 seccomp/no_new_privs 相关限制，最后 `exec_or_panic` 用户命令。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:138][E: codex-rs/linux-sandbox/src/linux_run_main.rs:142][E: codex-rs/linux-sandbox/src/linux_run_main.rs:145][E: codex-rs/linux-sandbox/src/linux_run_main.rs:150][E: codex-rs/linux-sandbox/src/linux_run_main.rs:154][E: codex-rs/linux-sandbox/src/linux_run_main.rs:160]
4. 如果 filesystem 是 full disk write 且无需 proxy route，`run_main` 可以跳过 bwrap mount namespace，只在当前线程应用网络/seccomp 相关限制后 exec，并且该 fast path 传入 `apply_landlock_fs = false`。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:163][E: codex-rs/linux-sandbox/src/linux_run_main.rs:164][E: codex-rs/linux-sandbox/src/linux_run_main.rs:168][E: codex-rs/linux-sandbox/src/linux_run_main.rs:172][E: codex-rs/linux-sandbox/src/linux_run_main.rs:174]
5. 非 legacy outer path 会为 managed network 准备 host proxy route spec，生成 inner command，再调用 `run_bwrap_with_proc_fallback`。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:177][E: codex-rs/linux-sandbox/src/linux_run_main.rs:181][E: codex-rs/linux-sandbox/src/linux_run_main.rs:189][E: codex-rs/linux-sandbox/src/linux_run_main.rs:199]
6. `run_bwrap_with_proc_fallback` 根据 network policy 选 `BwrapNetworkMode`，做 `/proc` preflight，构造 bwrap argv，必要时插入 `--argv0 codex-linux-sandbox`，最后 `exec_bwrap`。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:401][E: codex-rs/linux-sandbox/src/linux_run_main.rs:411][E: codex-rs/linux-sandbox/src/linux_run_main.rs:421][E: codex-rs/linux-sandbox/src/linux_run_main.rs:429][E: codex-rs/linux-sandbox/src/linux_run_main.rs:438]
7. legacy path 不走 bwrap，而是直接在当前线程应用 legacy Landlock filesystem policy 与 seccomp，再 exec 用户命令。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:210][E: codex-rs/linux-sandbox/src/linux_run_main.rs:217][E: codex-rs/linux-sandbox/src/linux_run_main.rs:220]

## 策略生成细节

- `create_bwrap_command_args` 在 full disk write 且 full network 时返回原始 command；如果 full disk write 但需要 network isolation，则生成 full filesystem bubblewrap flags。[E: codex-rs/linux-sandbox/src/bwrap.rs:113][E: codex-rs/linux-sandbox/src/bwrap.rs:120][E: codex-rs/linux-sandbox/src/bwrap.rs:128]
- full filesystem bubblewrap flags 包括 `--new-session`、`--die-with-parent`、`--bind / /`、`--unshare-user`、`--unshare-pid`、可选 `--unshare-net`、可选 `--proc /proc`，最后 `--` 后接 command。[E: codex-rs/linux-sandbox/src/bwrap.rs:144][E: codex-rs/linux-sandbox/src/bwrap.rs:147][E: codex-rs/linux-sandbox/src/bwrap.rs:148][E: codex-rs/linux-sandbox/src/bwrap.rs:149][E: codex-rs/linux-sandbox/src/bwrap.rs:150][E: codex-rs/linux-sandbox/src/bwrap.rs:153][E: codex-rs/linux-sandbox/src/bwrap.rs:156][E: codex-rs/linux-sandbox/src/bwrap.rs:161]
- restricted filesystem path 先生成 read-only 或 tmpfs root baseline，再按 writable roots 绑定 `--bind`，按 read-only subpaths 重放 `--ro-bind`，按 unreadable roots 使用 mask/tmpfs/ro-bind-data 等方式隐藏。[E: codex-rs/linux-sandbox/src/bwrap.rs:277][E: codex-rs/linux-sandbox/src/bwrap.rs:300][E: codex-rs/linux-sandbox/src/bwrap.rs:389][E: codex-rs/linux-sandbox/src/bwrap.rs:408][E: codex-rs/linux-sandbox/src/bwrap.rs:421][E: codex-rs/linux-sandbox/src/bwrap.rs:441]
- unreadable glob expansion 优先运行 `rg --files --hidden --no-ignore --null`，如果 ripgrep 不存在则 fallback 到 glob walker；匹配数量由 `MAX_UNREADABLE_GLOB_MATCHES` 限制，超过上限会返回 fatal error。[E: codex-rs/linux-sandbox/src/bwrap.rs:50][E: codex-rs/linux-sandbox/src/bwrap.rs:467][E: codex-rs/linux-sandbox/src/bwrap.rs:501][E: codex-rs/linux-sandbox/src/bwrap.rs:502][E: codex-rs/linux-sandbox/src/bwrap.rs:577][E: codex-rs/linux-sandbox/src/bwrap.rs:609]
- `apply_sandbox_policy_to_current_thread` 只有在 seccomp 需要安装或 legacy filesystem 不允许 full disk write 时才设置 no_new_privs；之后安装 seccomp，legacy 模式再尝试 Landlock filesystem rules。[E: codex-rs/linux-sandbox/src/landlock.rs:50][E: codex-rs/linux-sandbox/src/landlock.rs:56][E: codex-rs/linux-sandbox/src/landlock.rs:66][E: codex-rs/linux-sandbox/src/landlock.rs:78]
- seccomp filter 一律 deny `ptrace` 与 `io_uring_setup`；restricted network deny `connect`、`accept`、`bind`、`listen` 等，并只允许 `AF_UNIX` socket；proxy-routed mode 允许 `AF_INET`/`AF_INET6` socket 但 deny `socketpair(AF_UNIX)`。[E: codex-rs/linux-sandbox/src/landlock.rs:175][E: codex-rs/linux-sandbox/src/landlock.rs:180][E: codex-rs/linux-sandbox/src/landlock.rs:183][E: codex-rs/linux-sandbox/src/landlock.rs:203][E: codex-rs/linux-sandbox/src/landlock.rs:215][E: codex-rs/linux-sandbox/src/landlock.rs:238]
- managed network proxy flow 先在 host namespace 为 loopback proxy endpoints 创建 UDS route spec，再在 sandbox netns 中启动 local TCP listener 并把 proxy env 改写到 `127.0.0.1:<local_port>`。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:70][E: codex-rs/linux-sandbox/src/proxy_routing.rs:104][E: codex-rs/linux-sandbox/src/proxy_routing.rs:121][E: codex-rs/linux-sandbox/src/proxy_routing.rs:160]

## 设计动机与权衡

- Linux backend 采用 split policy 是为了让 bwrap 专注 mount namespace，让 seccomp 专注 syscall/network surface；legacy Landlock 路径仍可从 split policy 派生 legacy policy，兼容缺少 bwrap 的模式。[I]
- `run_bwrap_with_proc_fallback` 独立处理 `/proc` preflight，说明 Linux backend 允许在无法安全 mount `/proc` 的环境中退化到 no-proc bwrap argv，而不是立即放弃整个 sandbox。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:401][E: codex-rs/linux-sandbox/src/linux_run_main.rs:520]
- vendored/system bwrap launcher 同时存在；系统 bwrap 需要 probe `--argv0` 支持，vendored launcher 默认支持 argv0 override。[E: codex-rs/linux-sandbox/src/launcher.rs:35][E: codex-rs/linux-sandbox/src/launcher.rs:71][E: codex-rs/linux-sandbox/src/launcher.rs:78]

## gotcha

- legacy Landlock 不能表达 restricted read-only policy；`apply_sandbox_policy_to_current_thread` 遇到 `FileSystemSandboxPolicy::Restricted { read_only: Some(_) }` 会报错。[E: codex-rs/linux-sandbox/src/landlock.rs:70][E: codex-rs/linux-sandbox/src/landlock.rs:74]
- managed network 即使 network policy enabled，也会让 `should_install_network_seccomp` 返回 true，因为 `allow_network_for_proxy` 需要 seccomp 配合代理路由语义。[E: codex-rs/linux-sandbox/src/landlock.rs:95][E: codex-rs/linux-sandbox/src/landlock.rs:100]
- `CODEX_LINUX_SANDBOX_ARG0` 不是 shell 命令；它是 arg0 dispatch 识别 helper re-entry 的名字，`SandboxManager` 会用 `linux_sandbox_arg0_override` 生成这个 override。[E: codex-rs/sandboxing/src/manager.rs:303][E: codex-rs/sandboxing/src/manager.rs:309]

## Sources

- `codex-rs/linux-sandbox/src/linux_run_main.rs`
- `codex-rs/linux-sandbox/src/bwrap.rs`
- `codex-rs/linux-sandbox/src/landlock.rs`
- `codex-rs/linux-sandbox/src/proxy_routing.rs`
- `codex-rs/linux-sandbox/src/launcher.rs`
- `codex-rs/sandboxing/src/manager.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.arg0-dispatch`
- `spine.shell-exec-flow`
