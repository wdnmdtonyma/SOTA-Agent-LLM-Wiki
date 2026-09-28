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
updated: 1cc7e23612
---

> Linux sandbox backend accepts a serialized `PermissionProfile`, resolves it to runtime filesystem/network policies, then normally uses a two-stage bubblewrap helper: the outer stage builds mount/user/pid/network namespaces, and the inner stage applies seccomp/no_new_privs before exec. Legacy Landlock filesystem enforcement is an explicit fallback path.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:91][E: codex-rs/linux-sandbox/src/linux_run_main.rs:167][E: codex-rs/linux-sandbox/src/linux_run_main.rs:194][E: codex-rs/linux-sandbox/src/linux_run_main.rs:228][E: codex-rs/linux-sandbox/src/linux_run_main.rs:237][E: codex-rs/linux-sandbox/src/linux_run_main.rs:262][E: codex-rs/linux-sandbox/src/linux_run_main.rs:285][E: codex-rs/linux-sandbox/src/linux_run_main.rs:299]

## 能回答的问题

- `codex-linux-sandbox` CLI 接收哪些 policy 参数和 command 参数？
- bubblewrap、Landlock、seccomp 分别负责哪部分隔离？
- managed network proxy 如何在 host namespace 和 sandbox namespace 之间桥接？
- full disk write、restricted read/write、unreadable globs 在 bwrap argv 中如何表现？
- legacy Landlock fallback 为什么只接受不需要 direct runtime enforcement 的 permission profile？

## 职责边界

Linux sandbox 节点覆盖 `codex-rs/linux-sandbox/src` helper 的 CLI、bwrap argv、Landlock/seccomp、proxy route activation 和 helper exec path。`SandboxManager::transform` 的 `LinuxSeccomp` 分支负责把 helper executable 插到 argv[0]，并给 helper 传入 permission-profile 参数；真正执行 helper 主逻辑的是 `codex_linux_sandbox::run_main()`。[E: codex-rs/sandboxing/src/manager.rs:474][E: codex-rs/sandboxing/src/manager.rs:504][E: codex-rs/sandboxing/src/manager.rs:518][E: codex-rs/sandboxing/src/manager.rs:522][E: codex-rs/linux-sandbox/src/lib.rs:36]

## 关键 crate/文件

- `codex-rs/linux-sandbox/src/linux_run_main.rs`: CLI parser、permission-profile resolution、两阶段 outer/inner flow、legacy fallback guard、bwrap fallback、inner seccomp command generation。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:91][E: codex-rs/linux-sandbox/src/linux_run_main.rs:167][E: codex-rs/linux-sandbox/src/linux_run_main.rs:392][E: codex-rs/linux-sandbox/src/linux_run_main.rs:412][E: codex-rs/linux-sandbox/src/linux_run_main.rs:421][E: codex-rs/linux-sandbox/src/linux_run_main.rs:1530]
- `codex-rs/linux-sandbox/src/bwrap.rs`: filesystem namespace 与 bubblewrap argv 生成。[E: codex-rs/linux-sandbox/src/bwrap.rs:67][E: codex-rs/linux-sandbox/src/bwrap.rs:101][E: codex-rs/linux-sandbox/src/bwrap.rs:248][E: codex-rs/linux-sandbox/src/bwrap.rs:425]
- `codex-rs/linux-sandbox/src/landlock.rs`: `PermissionProfile`-driven no_new_privs, seccomp 网络过滤、ptrace/io_uring deny、legacy Landlock filesystem enforcement。[E: codex-rs/linux-sandbox/src/landlock.rs:43][E: codex-rs/linux-sandbox/src/landlock.rs:50][E: codex-rs/linux-sandbox/src/landlock.rs:70][E: codex-rs/linux-sandbox/src/landlock.rs:76][E: codex-rs/linux-sandbox/src/landlock.rs:80][E: codex-rs/linux-sandbox/src/landlock.rs:191][E: codex-rs/linux-sandbox/src/landlock.rs:197]
- `codex-rs/linux-sandbox/src/proxy_routing.rs`: managed network proxy route spec、host bridge、sandbox namespace bridge、proxy env rewrite。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:124]
- `codex-rs/linux-sandbox/src/launcher.rs`: system/bundled bubblewrap selection、`--argv0`/`--perms` support probing、exec handoff。[E: codex-rs/linux-sandbox/src/launcher.rs:38][E: codex-rs/linux-sandbox/src/launcher.rs:59][E: codex-rs/linux-sandbox/src/launcher.rs:134][E: codex-rs/linux-sandbox/src/launcher.rs:139][E: codex-rs/linux-sandbox/src/launcher.rs:159][E: codex-rs/linux-sandbox/src/launcher.rs:202][E: codex-rs/linux-sandbox/src/launcher.rs:203][E: codex-rs/linux-sandbox/src/launcher.rs:207]
- `codex-rs/linux-sandbox/src/bundled_bwrap.rs`: install-context resource lookup、legacy candidate fallback、optional SHA-256 verification, and fd-based exec of bundled bubblewrap。[E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:28][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:30][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:36][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:43][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:48][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:69][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:77][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:115][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:124]
- `codex-rs/bwrap`: standalone wrapper crate that compiles vendored bubblewrap C sources on Linux and calls renamed `bwrap_main`; non-Linux or unavailable builds panic with setup guidance.[E: codex-rs/bwrap/build.rs:6][E: codex-rs/bwrap/build.rs:13][E: codex-rs/bwrap/build.rs:22][E: codex-rs/bwrap/build.rs:27][E: codex-rs/bwrap/build.rs:32][E: codex-rs/bwrap/src/main.rs:8][E: codex-rs/bwrap/src/main.rs:27][E: codex-rs/bwrap/src/main.rs:43]

## 数据模型

- `LandlockCommand`: CLI struct，保留 historical type name but carries sandbox-policy cwd, optional command cwd, serialized `--permission-profile`, legacy fallback flag, inner-stage flag, proxy flags, `verify_fd_mounts`, `no_proc`, `inherit_pid_namespace`, and trailing command.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:91][E: codex-rs/linux-sandbox/src/linux_run_main.rs:95][E: codex-rs/linux-sandbox/src/linux_run_main.rs:104][E: codex-rs/linux-sandbox/src/linux_run_main.rs:112][E: codex-rs/linux-sandbox/src/linux_run_main.rs:118][E: codex-rs/linux-sandbox/src/linux_run_main.rs:126][E: codex-rs/linux-sandbox/src/linux_run_main.rs:132][E: codex-rs/linux-sandbox/src/linux_run_main.rs:138][E: codex-rs/linux-sandbox/src/linux_run_main.rs:142][E: codex-rs/linux-sandbox/src/linux_run_main.rs:148][E: codex-rs/linux-sandbox/src/linux_run_main.rs:153][E: codex-rs/linux-sandbox/src/linux_run_main.rs:157]
- `BwrapOptions`: bubblewrap argv builder 的选项结构，含 `mount_proc`、`network_mode`、`mask_wsl_interop`、`glob_scan_max_depth`; command、policy cwd、command cwd、filesystem policy 等是 `create_bwrap_command_args` 的独立入参。[E: codex-rs/linux-sandbox/src/bwrap.rs:67][E: codex-rs/linux-sandbox/src/bwrap.rs:69][E: codex-rs/linux-sandbox/src/bwrap.rs:73][E: codex-rs/linux-sandbox/src/bwrap.rs:75][E: codex-rs/linux-sandbox/src/bwrap.rs:83][E: codex-rs/linux-sandbox/src/bwrap.rs:248][E: codex-rs/linux-sandbox/src/bwrap.rs:249][E: codex-rs/linux-sandbox/src/bwrap.rs:250][E: codex-rs/linux-sandbox/src/bwrap.rs:251][E: codex-rs/linux-sandbox/src/bwrap.rs:252][E: codex-rs/linux-sandbox/src/bwrap.rs:253]
- `BwrapNetworkMode`: `FullAccess` 不 unshare network，`Isolated` 和 `ProxyOnly` 都会 unshare network。[E: codex-rs/linux-sandbox/src/bwrap.rs:101][E: codex-rs/linux-sandbox/src/bwrap.rs:104][E: codex-rs/linux-sandbox/src/bwrap.rs:106][E: codex-rs/linux-sandbox/src/bwrap.rs:111][E: codex-rs/linux-sandbox/src/bwrap.rs:115][E: codex-rs/linux-sandbox/src/bwrap.rs:116]
- `NetworkSeccompMode`: `Restricted` 表示禁网络，`ProxyRouted` 表示只允许 proxy-routed 形态所需 socket 行为。[E: codex-rs/linux-sandbox/src/landlock.rs:99][E: codex-rs/linux-sandbox/src/landlock.rs:101][E: codex-rs/linux-sandbox/src/landlock.rs:102]

## 控制流

1. `run_main` 解析 `LandlockCommand`，拒绝空 command，并校验 inner mode 参数组合。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:167][E: codex-rs/linux-sandbox/src/linux_run_main.rs:168][E: codex-rs/linux-sandbox/src/linux_run_main.rs:183][E: codex-rs/linux-sandbox/src/linux_run_main.rs:189]
2. `resolve_permission_profile` requires `--permission-profile`, then derives runtime filesystem and network policies via `PermissionProfile::to_runtime_permissions`.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:190][E: codex-rs/linux-sandbox/src/linux_run_main.rs:392][E: codex-rs/linux-sandbox/src/linux_run_main.rs:395][E: codex-rs/linux-sandbox/src/linux_run_main.rs:396][E: codex-rs/linux-sandbox/src/linux_run_main.rs:398]
3. `ensure_legacy_landlock_mode_supports_policy` 在 `use_legacy_landlock` 且 filesystem policy 没有 full-disk write 时 panic；调用点在 `linux_run_main` 解析权限之后。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:195][E: codex-rs/linux-sandbox/src/linux_run_main.rs:412][E: codex-rs/linux-sandbox/src/linux_run_main.rs:416]
4. inner stage 由 `--apply-seccomp-then-exec` 触发：先校验 retained capabilities，若 managed proxy 则 `activate_proxy_routes_in_netns`，再 `apply_permission_profile_to_current_thread`（不装 Landlock FS），然后 `fork`；child `exec_or_panic` 用户命令，parent `waitpid` 并转发信号。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:199][E: codex-rs/linux-sandbox/src/linux_run_main.rs:225][E: codex-rs/linux-sandbox/src/linux_run_main.rs:228][E: codex-rs/linux-sandbox/src/linux_run_main.rs:232][E: codex-rs/linux-sandbox/src/linux_run_main.rs:237][E: codex-rs/linux-sandbox/src/linux_run_main.rs:248][E: codex-rs/linux-sandbox/src/linux_run_main.rs:257][E: codex-rs/linux-sandbox/src/linux_run_main.rs:262]
5. 如果 filesystem 是 full disk write 且无需 proxy route，`run_main` 可以跳过 bwrap mount namespace，只在当前线程应用网络/seccomp 相关限制后 exec。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:282][E: codex-rs/linux-sandbox/src/linux_run_main.rs:283][E: codex-rs/linux-sandbox/src/linux_run_main.rs:292]
6. 非 legacy outer path 会为 managed network 准备 host proxy route spec，serialize permission profile into the inner command, then call `run_bwrap_with_proc_fallback`.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:295][E: codex-rs/linux-sandbox/src/linux_run_main.rs:299][E: codex-rs/linux-sandbox/src/linux_run_main.rs:332][E: codex-rs/linux-sandbox/src/linux_run_main.rs:340]
7. `run_bwrap_with_proc_fallback` 根据 network policy 选 `BwrapNetworkMode`，做 `/proc` preflight，构造 bwrap argv，必要时插入 `--argv0`，最后 exec bwrap。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:421][E: codex-rs/linux-sandbox/src/linux_run_main.rs:422][E: codex-rs/linux-sandbox/src/linux_run_main.rs:449][E: codex-rs/linux-sandbox/src/linux_run_main.rs:450]
8. legacy path 不走 bwrap，而是直接在当前线程应用 permission profile 的 Landlock filesystem/seccomp restrictions，再 exec 用户命令。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:351][E: codex-rs/linux-sandbox/src/linux_run_main.rs:328][E: codex-rs/linux-sandbox/src/linux_run_main.rs:360]

## 策略生成细节

- `create_bwrap_command_args` 在 full disk write 且 full network 且没有 unreadable globs 时返回原始 command；如果 full disk write 但需要 network isolation，则生成 full filesystem bubblewrap flags。[E: codex-rs/linux-sandbox/src/bwrap.rs:248][E: codex-rs/linux-sandbox/src/bwrap.rs:255][E: codex-rs/linux-sandbox/src/bwrap.rs:259][E: codex-rs/linux-sandbox/src/bwrap.rs:260][E: codex-rs/linux-sandbox/src/bwrap.rs:262][E: codex-rs/linux-sandbox/src/bwrap.rs:268]
- full filesystem bubblewrap flags 固定包括 `--new-session`、`--die-with-parent`、`--bind / /`、`--dev /dev`、`--bind-try /dev/shm /dev/shm`、`--unshare-user`、`--unshare-ipc`；`--unshare-pid` 仅在 `!options.inherit_pid_namespace` 时加入；另有可选 `--unshare-net`、可选 `--proc /proc`，最后 `--` 后接 command。[E: codex-rs/linux-sandbox/src/bwrap.rs:282][E: codex-rs/linux-sandbox/src/bwrap.rs:297][E: codex-rs/linux-sandbox/src/bwrap.rs:298][E: codex-rs/linux-sandbox/src/bwrap.rs:300][E: codex-rs/linux-sandbox/src/bwrap.rs:303][E: codex-rs/linux-sandbox/src/bwrap.rs:306]
- restricted filesystem path 先生成 read-only 或 tmpfs root baseline，再按 writable roots 绑定 `--bind`，按 read-only subpaths 重放 `--ro-bind`，按 unreadable roots 使用 mask/tmpfs/ro-bind-data 等方式隐藏。[E: codex-rs/linux-sandbox/src/bwrap.rs:425][E: codex-rs/linux-sandbox/src/bwrap.rs:464][E: codex-rs/linux-sandbox/src/bwrap.rs:531][E: codex-rs/linux-sandbox/src/bwrap.rs:628][E: codex-rs/linux-sandbox/src/bwrap.rs:643][E: codex-rs/linux-sandbox/src/bwrap.rs:709][E: codex-rs/linux-sandbox/src/bwrap.rs:764]
- unreadable glob expansion uses existing-path expansion before constructing the mount overlay and is bounded by `MAX_UNREADABLE_GLOB_MATCHES`.[E: codex-rs/linux-sandbox/src/bwrap.rs:61][E: codex-rs/linux-sandbox/src/bwrap.rs:456][E: codex-rs/linux-sandbox/src/bwrap.rs:491]
- `apply_permission_profile_to_current_thread` derives runtime policies from `PermissionProfile`, sets no_new_privs only when seccomp is needed or legacy filesystem enforcement is active without full disk write, then installs seccomp and optional Landlock filesystem rules.[E: codex-rs/linux-sandbox/src/landlock.rs:43][E: codex-rs/linux-sandbox/src/landlock.rs:50][E: codex-rs/linux-sandbox/src/landlock.rs:70][E: codex-rs/linux-sandbox/src/landlock.rs:73][E: codex-rs/linux-sandbox/src/landlock.rs:76][E: codex-rs/linux-sandbox/src/landlock.rs:80][E: codex-rs/linux-sandbox/src/landlock.rs:93]
- seccomp filter 一律 deny `ptrace`、process_vm 和 `io_uring_*`；restricted network deny `connect`、`accept`、`bind`、`listen` 等，并只允许 `AF_UNIX` socket；proxy-routed mode 允许 `AF_INET`/`AF_INET6` socket but denies other socket families.[E: codex-rs/linux-sandbox/src/landlock.rs:191][E: codex-rs/linux-sandbox/src/landlock.rs:192][E: codex-rs/linux-sandbox/src/landlock.rs:193][E: codex-rs/linux-sandbox/src/landlock.rs:197][E: codex-rs/linux-sandbox/src/landlock.rs:203][E: codex-rs/linux-sandbox/src/landlock.rs:206][E: codex-rs/linux-sandbox/src/landlock.rs:230][E: codex-rs/linux-sandbox/src/landlock.rs:233][E: codex-rs/linux-sandbox/src/landlock.rs:238]
- managed network proxy flow 先在 host namespace 为 loopback proxy endpoints 创建 UDS route spec，再在 sandbox netns 中启动 local TCP listener 并把 proxy env 改写到 `127.0.0.1:<local_port>`。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:105][E: codex-rs/linux-sandbox/src/proxy_routing.rs:124][E: codex-rs/linux-sandbox/src/proxy_routing.rs:182]

## 设计动机与权衡

- Linux backend uses `PermissionProfile` as the helper boundary while still separating enforcement duties: bwrap owns the filesystem namespace, seccomp owns the network/syscall surface, and legacy Landlock remains an explicit fallback for profiles that do not require direct runtime enforcement.[I]
- `run_bwrap_with_proc_fallback` 独立处理 `/proc` preflight，说明 Linux backend 允许在无法安全 mount `/proc` 的环境中退化到 no-proc bwrap argv，而不是立即放弃整个 sandbox。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:422][E: codex-rs/linux-sandbox/src/linux_run_main.rs:423][E: codex-rs/linux-sandbox/src/linux_run_main.rs:428]
- system/bundled bwrap launcher 同时存在；system path 需要 probe `--argv0` 与 `--perms`，bundled launcher 默认支持 argv0 override 并可按 `CODEX_BWRAP_SHA256` 校验资源 digest。[E: codex-rs/linux-sandbox/src/launcher.rs:134][E: codex-rs/linux-sandbox/src/launcher.rs:139][E: codex-rs/linux-sandbox/src/launcher.rs:180][E: codex-rs/linux-sandbox/src/launcher.rs:187][E: codex-rs/linux-sandbox/src/launcher.rs:202][E: codex-rs/linux-sandbox/src/launcher.rs:203][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:43][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:115][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:124]

## gotcha

- legacy Landlock 不能表达 restricted read-only policy；`apply_permission_profile_to_current_thread` 在 legacy filesystem path 遇到非 full-disk-read policy 会报 unsupported operation。[E: codex-rs/linux-sandbox/src/landlock.rs:80][E: codex-rs/linux-sandbox/src/landlock.rs:81][E: codex-rs/linux-sandbox/src/landlock.rs:82][E: codex-rs/linux-sandbox/src/landlock.rs:83]
- managed network 即使 network policy enabled，也会让 `should_install_network_seccomp` 返回 true，因为 `allow_network_for_proxy` 需要 seccomp 配合代理路由语义。[E: codex-rs/linux-sandbox/src/landlock.rs:106][E: codex-rs/linux-sandbox/src/landlock.rs:112]
- `CODEX_LINUX_SANDBOX_ARG0` 不是 shell 命令；它是 arg0 dispatch 识别 helper re-entry 的名字，`SandboxManager` 会用 `linux_sandbox_arg0_override` 生成这个 override。[E: codex-rs/sandboxing/src/manager.rs:522][E: codex-rs/sandboxing/src/manager.rs:806][E: codex-rs/sandboxing/src/manager.rs:807][E: codex-rs/sandboxing/src/manager.rs:810]

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
