---
id: subsys.exec-sandbox.sandbox-linux
title: Linux sandbox
kind: subsystem
tier: T2
source: [codex-rs/linux-sandbox/src, codex-rs/sandboxing/src/manager.rs, codex-rs/bwrap/src/main.rs, codex-rs/bwrap/build.rs]
symbols: [LandlockCommand, linux_sandbox::run_main, apply_permission_profile_to_current_thread, resolve_permission_profile, create_bwrap_command_args, BwrapNetworkMode, prepare_host_proxy_route_spec, activate_proxy_routes_in_netns, BundledBwrapLauncher, bwrap_main]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.arg0-dispatch, subsys.exec-sandbox.file-system, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> Linux sandbox backend accepts a serialized `PermissionProfile`, resolves it to runtime filesystem/network policies, then normally uses a two-stage bubblewrap helper: the outer stage builds mount/user/pid/network namespaces, and the inner stage applies seccomp/no_new_privs before exec. Legacy Landlock filesystem enforcement is an explicit fallback path.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:88][E: codex-rs/linux-sandbox/src/linux_run_main.rs:159][E: codex-rs/linux-sandbox/src/linux_run_main.rs:184][E: codex-rs/linux-sandbox/src/linux_run_main.rs:223][E: codex-rs/linux-sandbox/src/linux_run_main.rs:232][E: codex-rs/linux-sandbox/src/linux_run_main.rs:257][E: codex-rs/linux-sandbox/src/linux_run_main.rs:280][E: codex-rs/linux-sandbox/src/linux_run_main.rs:294]

## 能回答的问题

- `codex-linux-sandbox` CLI 接收哪些 policy 参数和 command 参数？
- bubblewrap、Landlock、seccomp 分别负责哪部分隔离？
- managed network proxy 如何在 host namespace 和 sandbox namespace 之间桥接？
- full disk write、restricted read/write、unreadable globs 在 bwrap argv 中如何表现？
- legacy Landlock fallback 为什么只接受不需要 direct runtime enforcement 的 permission profile？

## 职责边界

Linux sandbox 节点覆盖 `codex-rs/linux-sandbox/src` helper 的 CLI、bwrap argv、Landlock/seccomp、proxy route activation 和 helper exec path。`SandboxManager::transform` 负责把 helper executable 插到 argv[0]，并给 helper 传入 permission-profile 参数；真正执行 helper 主逻辑的是 `codex_linux_sandbox::run_main()`。[E: codex-rs/sandboxing/src/manager.rs:435][E: codex-rs/sandboxing/src/manager.rs:437][E: codex-rs/sandboxing/src/manager.rs:449][E: codex-rs/sandboxing/src/manager.rs:458][E: codex-rs/sandboxing/src/manager.rs:462][E: codex-rs/linux-sandbox/src/lib.rs:32]

## 关键 crate/文件

- `codex-rs/linux-sandbox/src/linux_run_main.rs`: CLI parser、permission-profile resolution、两阶段 outer/inner flow、legacy fallback guard、bwrap fallback、inner seccomp command generation。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:88][E: codex-rs/linux-sandbox/src/linux_run_main.rs:159][E: codex-rs/linux-sandbox/src/linux_run_main.rs:357][E: codex-rs/linux-sandbox/src/linux_run_main.rs:377][E: codex-rs/linux-sandbox/src/linux_run_main.rs:393][E: codex-rs/linux-sandbox/src/linux_run_main.rs:1511]
- `codex-rs/linux-sandbox/src/bwrap.rs`: filesystem namespace 与 bubblewrap argv 生成。[E: codex-rs/linux-sandbox/src/bwrap.rs:61][E: codex-rs/linux-sandbox/src/bwrap.rs:88][E: codex-rs/linux-sandbox/src/bwrap.rs:235][E: codex-rs/linux-sandbox/src/bwrap.rs:381]
- `codex-rs/linux-sandbox/src/landlock.rs`: `PermissionProfile`-driven no_new_privs, seccomp 网络过滤、ptrace/io_uring deny、legacy Landlock filesystem enforcement。[E: codex-rs/linux-sandbox/src/landlock.rs:42][E: codex-rs/linux-sandbox/src/landlock.rs:49][E: codex-rs/linux-sandbox/src/landlock.rs:61][E: codex-rs/linux-sandbox/src/landlock.rs:67][E: codex-rs/linux-sandbox/src/landlock.rs:71][E: codex-rs/linux-sandbox/src/landlock.rs:179][E: codex-rs/linux-sandbox/src/landlock.rs:182]
- `codex-rs/linux-sandbox/src/proxy_routing.rs`: managed network proxy route spec、host bridge、sandbox namespace bridge、proxy env rewrite。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:124]
- `codex-rs/linux-sandbox/src/launcher.rs`: system/bundled bubblewrap selection、`--argv0`/`--perms` support probing、exec handoff。[E: codex-rs/linux-sandbox/src/launcher.rs:38][E: codex-rs/linux-sandbox/src/launcher.rs:53][E: codex-rs/linux-sandbox/src/launcher.rs:128][E: codex-rs/linux-sandbox/src/launcher.rs:133][E: codex-rs/linux-sandbox/src/launcher.rs:153][E: codex-rs/linux-sandbox/src/launcher.rs:196][E: codex-rs/linux-sandbox/src/launcher.rs:197][E: codex-rs/linux-sandbox/src/launcher.rs:201]
- `codex-rs/linux-sandbox/src/bundled_bwrap.rs`: install-context resource lookup、legacy candidate fallback、optional SHA-256 verification, and fd-based exec of bundled bubblewrap。[E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:28][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:30][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:36][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:43][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:48][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:69][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:77][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:115][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:124]
- `codex-rs/bwrap`: standalone wrapper crate that compiles vendored bubblewrap C sources on Linux and calls renamed `bwrap_main`; non-Linux or unavailable builds panic with setup guidance.[E: codex-rs/bwrap/build.rs:6][E: codex-rs/bwrap/build.rs:13][E: codex-rs/bwrap/build.rs:22][E: codex-rs/bwrap/build.rs:27][E: codex-rs/bwrap/build.rs:32][E: codex-rs/bwrap/src/main.rs:8][E: codex-rs/bwrap/src/main.rs:27][E: codex-rs/bwrap/src/main.rs:43]

## 数据模型

- `LandlockCommand`: CLI struct，保留 historical type name but carries sandbox-policy cwd, optional command cwd, serialized `--permission-profile`, legacy fallback flag, inner-stage flag, proxy flags, `no_proc`, and trailing command.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:88][E: codex-rs/linux-sandbox/src/linux_run_main.rs:92][E: codex-rs/linux-sandbox/src/linux_run_main.rs:101][E: codex-rs/linux-sandbox/src/linux_run_main.rs:109][E: codex-rs/linux-sandbox/src/linux_run_main.rs:115][E: codex-rs/linux-sandbox/src/linux_run_main.rs:123][E: codex-rs/linux-sandbox/src/linux_run_main.rs:131][E: codex-rs/linux-sandbox/src/linux_run_main.rs:135][E: codex-rs/linux-sandbox/src/linux_run_main.rs:145][E: codex-rs/linux-sandbox/src/linux_run_main.rs:149]
- `BwrapOptions`: bubblewrap argv builder 的选项结构，仅含 `mount_proc`、`network_mode`、`glob_scan_max_depth`; command、policy cwd、command cwd、filesystem policy 等是 `create_bwrap_command_args` 的独立入参。[E: codex-rs/linux-sandbox/src/bwrap.rs:61][E: codex-rs/linux-sandbox/src/bwrap.rs:66][E: codex-rs/linux-sandbox/src/bwrap.rs:68][E: codex-rs/linux-sandbox/src/bwrap.rs:73][E: codex-rs/linux-sandbox/src/bwrap.rs:235][E: codex-rs/linux-sandbox/src/bwrap.rs:236][E: codex-rs/linux-sandbox/src/bwrap.rs:237][E: codex-rs/linux-sandbox/src/bwrap.rs:238][E: codex-rs/linux-sandbox/src/bwrap.rs:239][E: codex-rs/linux-sandbox/src/bwrap.rs:240]
- `BwrapNetworkMode`: `FullAccess` 不 unshare network，`Isolated` 和 `ProxyOnly` 都会 unshare network。[E: codex-rs/linux-sandbox/src/bwrap.rs:88][E: codex-rs/linux-sandbox/src/bwrap.rs:91][E: codex-rs/linux-sandbox/src/bwrap.rs:93][E: codex-rs/linux-sandbox/src/bwrap.rs:98][E: codex-rs/linux-sandbox/src/bwrap.rs:102][E: codex-rs/linux-sandbox/src/bwrap.rs:103]
- `NetworkSeccompMode`: `Restricted` 表示禁网络，`ProxyRouted` 表示只允许 proxy-routed 形态所需 socket 行为。[E: codex-rs/linux-sandbox/src/landlock.rs:90][E: codex-rs/linux-sandbox/src/landlock.rs:92][E: codex-rs/linux-sandbox/src/landlock.rs:93]

## 控制流

1. `run_main` 解析 `LandlockCommand`，拒绝空 command，并校验 inner mode 参数组合。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:159][E: codex-rs/linux-sandbox/src/linux_run_main.rs:160][E: codex-rs/linux-sandbox/src/linux_run_main.rs:173][E: codex-rs/linux-sandbox/src/linux_run_main.rs:179]
2. `resolve_permission_profile` requires `--permission-profile`, then derives runtime filesystem and network policies via `PermissionProfile::to_runtime_permissions`.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:180][E: codex-rs/linux-sandbox/src/linux_run_main.rs:357][E: codex-rs/linux-sandbox/src/linux_run_main.rs:360][E: codex-rs/linux-sandbox/src/linux_run_main.rs:361][E: codex-rs/linux-sandbox/src/linux_run_main.rs:363]
3. `ensure_legacy_landlock_mode_supports_policy` rejects legacy fallback when the resolved filesystem policy needs direct runtime enforcement under the network policy/cwd.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:185][E: codex-rs/linux-sandbox/src/linux_run_main.rs:377][E: codex-rs/linux-sandbox/src/linux_run_main.rs:383][E: codex-rs/linux-sandbox/src/linux_run_main.rs:385][E: codex-rs/linux-sandbox/src/linux_run_main.rs:387]
4. inner stage 由 `--apply-seccomp-then-exec` 触发：先校验 retained capabilities，若 managed proxy 则 `activate_proxy_routes_in_netns`，再 `apply_permission_profile_to_current_thread`（不装 Landlock FS），然后 `fork`；child `exec_or_panic` 用户命令，parent `waitpid` 并转发信号。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:194][E: codex-rs/linux-sandbox/src/linux_run_main.rs:220][E: codex-rs/linux-sandbox/src/linux_run_main.rs:223][E: codex-rs/linux-sandbox/src/linux_run_main.rs:227][E: codex-rs/linux-sandbox/src/linux_run_main.rs:232][E: codex-rs/linux-sandbox/src/linux_run_main.rs:243][E: codex-rs/linux-sandbox/src/linux_run_main.rs:252][E: codex-rs/linux-sandbox/src/linux_run_main.rs:257]
5. 如果 filesystem 是 full disk write 且无需 proxy route，`run_main` 可以跳过 bwrap mount namespace，只在当前线程应用网络/seccomp 相关限制后 exec。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:277][E: codex-rs/linux-sandbox/src/linux_run_main.rs:278][E: codex-rs/linux-sandbox/src/linux_run_main.rs:287]
6. 非 legacy outer path 会为 managed network 准备 host proxy route spec，serialize permission profile into the inner command, then call `run_bwrap_with_proc_fallback`.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:290][E: codex-rs/linux-sandbox/src/linux_run_main.rs:294][E: codex-rs/linux-sandbox/src/linux_run_main.rs:301][E: codex-rs/linux-sandbox/src/linux_run_main.rs:309]
7. `run_bwrap_with_proc_fallback` 根据 network policy 选 `BwrapNetworkMode`，做 `/proc` preflight，构造 bwrap argv，必要时插入 `--argv0`，最后 exec bwrap。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:393][E: codex-rs/linux-sandbox/src/linux_run_main.rs:405][E: codex-rs/linux-sandbox/src/linux_run_main.rs:428][E: codex-rs/linux-sandbox/src/linux_run_main.rs:429]
8. legacy path 不走 bwrap，而是直接在当前线程应用 permission profile 的 Landlock filesystem/seccomp restrictions，再 exec 用户命令。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:321][E: codex-rs/linux-sandbox/src/linux_run_main.rs:325][E: codex-rs/linux-sandbox/src/linux_run_main.rs:330]

## 策略生成细节

- `create_bwrap_command_args` 在 full disk write 且 full network 且没有 unreadable globs 时返回原始 command；如果 full disk write 但需要 network isolation，则生成 full filesystem bubblewrap flags。[E: codex-rs/linux-sandbox/src/bwrap.rs:235][E: codex-rs/linux-sandbox/src/bwrap.rs:242][E: codex-rs/linux-sandbox/src/bwrap.rs:246][E: codex-rs/linux-sandbox/src/bwrap.rs:247][E: codex-rs/linux-sandbox/src/bwrap.rs:249][E: codex-rs/linux-sandbox/src/bwrap.rs:255]
- full filesystem bubblewrap flags 包括 `--new-session`、`--die-with-parent`、`--bind / /`、`--dev /dev`、`--bind-try /dev/shm /dev/shm`、`--unshare-user`、`--unshare-pid`、`--unshare-ipc`、可选 `--unshare-net`、可选 `--proc /proc`，最后 `--` 后接 command。[E: codex-rs/linux-sandbox/src/bwrap.rs:269][E: codex-rs/linux-sandbox/src/bwrap.rs:272][E: codex-rs/linux-sandbox/src/bwrap.rs:276][E: codex-rs/linux-sandbox/src/bwrap.rs:279][E: codex-rs/linux-sandbox/src/bwrap.rs:284][E: codex-rs/linux-sandbox/src/bwrap.rs:285][E: codex-rs/linux-sandbox/src/bwrap.rs:286][E: codex-rs/linux-sandbox/src/bwrap.rs:288][E: codex-rs/linux-sandbox/src/bwrap.rs:291]
- restricted filesystem path 先生成 read-only 或 tmpfs root baseline，再按 writable roots 绑定 `--bind`，按 read-only subpaths 重放 `--ro-bind`，按 unreadable roots 使用 mask/tmpfs/ro-bind-data 等方式隐藏。[E: codex-rs/linux-sandbox/src/bwrap.rs:381][E: codex-rs/linux-sandbox/src/bwrap.rs:447][E: codex-rs/linux-sandbox/src/bwrap.rs:474][E: codex-rs/linux-sandbox/src/bwrap.rs:559][E: codex-rs/linux-sandbox/src/bwrap.rs:574][E: codex-rs/linux-sandbox/src/bwrap.rs:602][E: codex-rs/linux-sandbox/src/bwrap.rs:632]
- unreadable glob expansion uses existing-path expansion before constructing the mount overlay and is bounded by `MAX_UNREADABLE_GLOB_MATCHES`.[E: codex-rs/linux-sandbox/src/bwrap.rs:57][E: codex-rs/linux-sandbox/src/bwrap.rs:439][E: codex-rs/linux-sandbox/src/bwrap.rs:440]
- `apply_permission_profile_to_current_thread` derives runtime policies from `PermissionProfile`, sets no_new_privs only when seccomp is needed or legacy filesystem enforcement is active without full disk write, then installs seccomp and optional Landlock filesystem rules.[E: codex-rs/linux-sandbox/src/landlock.rs:42][E: codex-rs/linux-sandbox/src/landlock.rs:49][E: codex-rs/linux-sandbox/src/landlock.rs:61][E: codex-rs/linux-sandbox/src/landlock.rs:64][E: codex-rs/linux-sandbox/src/landlock.rs:67][E: codex-rs/linux-sandbox/src/landlock.rs:71][E: codex-rs/linux-sandbox/src/landlock.rs:84]
- seccomp filter 一律 deny `ptrace`、process_vm 和 `io_uring_*`；restricted network deny `connect`、`accept`、`bind`、`listen` 等，并只允许 `AF_UNIX` socket；proxy-routed mode 允许 `AF_INET`/`AF_INET6` socket but denies other socket families.[E: codex-rs/linux-sandbox/src/landlock.rs:179][E: codex-rs/linux-sandbox/src/landlock.rs:180][E: codex-rs/linux-sandbox/src/landlock.rs:181][E: codex-rs/linux-sandbox/src/landlock.rs:182][E: codex-rs/linux-sandbox/src/landlock.rs:188][E: codex-rs/linux-sandbox/src/landlock.rs:191][E: codex-rs/linux-sandbox/src/landlock.rs:215][E: codex-rs/linux-sandbox/src/landlock.rs:218][E: codex-rs/linux-sandbox/src/landlock.rs:225]
- managed network proxy flow 先在 host namespace 为 loopback proxy endpoints 创建 UDS route spec，再在 sandbox netns 中启动 local TCP listener 并把 proxy env 改写到 `127.0.0.1:<local_port>`。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:105][E: codex-rs/linux-sandbox/src/proxy_routing.rs:124][E: codex-rs/linux-sandbox/src/proxy_routing.rs:182]

## 设计动机与权衡

- Linux backend uses `PermissionProfile` as the helper boundary while still separating enforcement duties: bwrap owns the filesystem namespace, seccomp owns the network/syscall surface, and legacy Landlock remains an explicit fallback for profiles that do not require direct runtime enforcement.[I]
- `run_bwrap_with_proc_fallback` 独立处理 `/proc` preflight，说明 Linux backend 允许在无法安全 mount `/proc` 的环境中退化到 no-proc bwrap argv，而不是立即放弃整个 sandbox。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:405][E: codex-rs/linux-sandbox/src/linux_run_main.rs:406][E: codex-rs/linux-sandbox/src/linux_run_main.rs:411]
- system/bundled bwrap launcher 同时存在；system path 需要 probe `--argv0` 与 `--perms`，bundled launcher 默认支持 argv0 override 并可按 `CODEX_BWRAP_SHA256` 校验资源 digest。[E: codex-rs/linux-sandbox/src/launcher.rs:128][E: codex-rs/linux-sandbox/src/launcher.rs:133][E: codex-rs/linux-sandbox/src/launcher.rs:174][E: codex-rs/linux-sandbox/src/launcher.rs:181][E: codex-rs/linux-sandbox/src/launcher.rs:196][E: codex-rs/linux-sandbox/src/launcher.rs:197][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:43][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:115][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:124]

## gotcha

- legacy Landlock 不能表达 restricted read-only policy；`apply_permission_profile_to_current_thread` 在 legacy filesystem path 遇到非 full-disk-read policy 会报 unsupported operation。[E: codex-rs/linux-sandbox/src/landlock.rs:71][E: codex-rs/linux-sandbox/src/landlock.rs:72][E: codex-rs/linux-sandbox/src/landlock.rs:73][E: codex-rs/linux-sandbox/src/landlock.rs:74]
- managed network 即使 network policy enabled，也会让 `should_install_network_seccomp` 返回 true，因为 `allow_network_for_proxy` 需要 seccomp 配合代理路由语义。[E: codex-rs/linux-sandbox/src/landlock.rs:96][E: codex-rs/linux-sandbox/src/landlock.rs:102]
- `CODEX_LINUX_SANDBOX_ARG0` 不是 shell 命令；它是 arg0 dispatch 识别 helper re-entry 的名字，`SandboxManager` 会用 `linux_sandbox_arg0_override` 生成这个 override。[E: codex-rs/sandboxing/src/manager.rs:462][E: codex-rs/sandboxing/src/manager.rs:765][E: codex-rs/sandboxing/src/manager.rs:766][E: codex-rs/sandboxing/src/manager.rs:769]

## Sources

- `codex-rs/linux-sandbox/src/linux_run_main.rs`
- `codex-rs/linux-sandbox/src/bwrap.rs`
- `codex-rs/linux-sandbox/src/landlock.rs`
- `codex-rs/linux-sandbox/src/proxy_routing.rs`
- `codex-rs/linux-sandbox/src/launcher.rs`
- `codex-rs/linux-sandbox/src/bundled_bwrap.rs`
- `codex-rs/bwrap/src/main.rs`
- `codex-rs/bwrap/build.rs`
- `codex-rs/sandboxing/src/manager.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.arg0-dispatch`
- `subsys.exec-sandbox.file-system`
- `spine.shell-exec-flow`
