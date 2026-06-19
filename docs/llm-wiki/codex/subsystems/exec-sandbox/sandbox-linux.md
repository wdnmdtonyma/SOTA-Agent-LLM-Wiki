---
id: subsys.exec-sandbox.sandbox-linux
title: Linux sandbox
kind: subsystem
tier: T2
source: [codex-rs/linux-sandbox/src, codex-rs/sandboxing/src/manager.rs, codex-rs/bwrap/src/main.rs, codex-rs/bwrap/build.rs]
symbols: [LandlockCommand, run_main, apply_permission_profile_to_current_thread, resolve_permission_profile, create_bwrap_command_args, BwrapNetworkMode, prepare_host_proxy_route_spec, activate_proxy_routes_in_netns, BundledBwrapLauncher, bwrap_main]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.arg0-dispatch, subsys.exec-sandbox.file-system, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 5670360009
---

> Linux sandbox backend accepts a serialized `PermissionProfile`, resolves it to runtime filesystem/network policies, then normally uses a two-stage bubblewrap helper: the outer stage builds mount/user/pid/network namespaces, and the inner stage applies seccomp/no_new_privs before exec. Legacy Landlock filesystem enforcement is an explicit fallback path.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:95][E: codex-rs/linux-sandbox/src/linux_run_main.rs:147][E: codex-rs/linux-sandbox/src/linux_run_main.rs:164][E: codex-rs/linux-sandbox/src/linux_run_main.rs:168][E: codex-rs/linux-sandbox/src/linux_run_main.rs:176][E: codex-rs/linux-sandbox/src/linux_run_main.rs:188][E: codex-rs/linux-sandbox/src/linux_run_main.rs:213][E: codex-rs/linux-sandbox/src/linux_run_main.rs:244]

## 能回答的问题

- `codex-linux-sandbox` CLI 接收哪些 policy 参数和 command 参数？
- bubblewrap、Landlock、seccomp 分别负责哪部分隔离？
- managed network proxy 如何在 host namespace 和 sandbox namespace 之间桥接？
- full disk write、restricted read/write、unreadable globs 在 bwrap argv 中如何表现？
- legacy Landlock fallback 为什么只接受不需要 direct runtime enforcement 的 permission profile？

## 职责边界

Linux sandbox 节点覆盖 `codex-rs/linux-sandbox/src` helper 的 CLI、bwrap argv、Landlock/seccomp、proxy route activation 和 helper exec path。`SandboxManager::transform` 负责把 helper executable 插到 argv[0]，并给 helper 传入 permission-profile 参数；真正执行 helper 主逻辑的是 `codex_linux_sandbox::run_main()`。[E: codex-rs/sandboxing/src/manager.rs:360][E: codex-rs/sandboxing/src/manager.rs:362][E: codex-rs/sandboxing/src/manager.rs:372][E: codex-rs/sandboxing/src/manager.rs:380][E: codex-rs/sandboxing/src/manager.rs:381][E: codex-rs/sandboxing/src/manager.rs:385][E: codex-rs/linux-sandbox/src/lib.rs:19][E: codex-rs/linux-sandbox/src/lib.rs:21]

## 关键 crate/文件

- `codex-rs/linux-sandbox/src/linux_run_main.rs`: CLI parser、permission-profile resolution、两阶段 outer/inner flow、legacy fallback guard、bwrap fallback、inner seccomp command generation。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:23][E: codex-rs/linux-sandbox/src/linux_run_main.rs:80][E: codex-rs/linux-sandbox/src/linux_run_main.rs:95][E: codex-rs/linux-sandbox/src/linux_run_main.rs:147][E: codex-rs/linux-sandbox/src/linux_run_main.rs:281][E: codex-rs/linux-sandbox/src/linux_run_main.rs:301][E: codex-rs/linux-sandbox/src/linux_run_main.rs:317][E: codex-rs/linux-sandbox/src/linux_run_main.rs:1401]
- `codex-rs/linux-sandbox/src/bwrap.rs`: filesystem namespace 与 bubblewrap argv 生成。[E: codex-rs/linux-sandbox/src/bwrap.rs:113][E: codex-rs/linux-sandbox/src/bwrap.rs:171][E: codex-rs/linux-sandbox/src/bwrap.rs:222]
- `codex-rs/linux-sandbox/src/landlock.rs`: `PermissionProfile`-driven no_new_privs, seccomp 网络过滤、ptrace/io_uring deny、legacy Landlock filesystem enforcement。[E: codex-rs/linux-sandbox/src/landlock.rs:42][E: codex-rs/linux-sandbox/src/landlock.rs:49][E: codex-rs/linux-sandbox/src/landlock.rs:61][E: codex-rs/linux-sandbox/src/landlock.rs:67][E: codex-rs/linux-sandbox/src/landlock.rs:71]
- `codex-rs/linux-sandbox/src/proxy_routing.rs`: managed network proxy route spec、host bridge、sandbox namespace bridge、proxy env rewrite。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:70][E: codex-rs/linux-sandbox/src/proxy_routing.rs:121][E: codex-rs/linux-sandbox/src/proxy_routing.rs:419][E: codex-rs/linux-sandbox/src/proxy_routing.rs:475]
- `codex-rs/linux-sandbox/src/launcher.rs`: system/bundled bubblewrap selection、`--argv0`/`--perms` support probing、exec handoff。[E: codex-rs/linux-sandbox/src/launcher.rs:14][E: codex-rs/linux-sandbox/src/launcher.rs:36][E: codex-rs/linux-sandbox/src/launcher.rs:51][E: codex-rs/linux-sandbox/src/launcher.rs:55][E: codex-rs/linux-sandbox/src/launcher.rs:61][E: codex-rs/linux-sandbox/src/launcher.rs:69][E: codex-rs/linux-sandbox/src/launcher.rs:101][E: codex-rs/linux-sandbox/src/launcher.rs:108][E: codex-rs/linux-sandbox/src/launcher.rs:121][E: codex-rs/linux-sandbox/src/launcher.rs:122][E: codex-rs/linux-sandbox/src/launcher.rs:126][E: codex-rs/linux-sandbox/src/launcher.rs:148]
- `codex-rs/linux-sandbox/src/bundled_bwrap.rs`: install-context resource lookup、legacy candidate fallback、optional SHA-256 verification, and fd-based exec of bundled bubblewrap。[E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:28][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:30][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:36][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:43][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:48][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:62][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:72][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:78][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:92][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:116][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:126]
- `codex-rs/bwrap`: standalone wrapper crate that compiles vendored bubblewrap C sources on Linux and calls renamed `bwrap_main`; non-Linux or unavailable builds panic with setup guidance.[E: codex-rs/bwrap/build.rs:6][E: codex-rs/bwrap/build.rs:13][E: codex-rs/bwrap/build.rs:22][E: codex-rs/bwrap/build.rs:27][E: codex-rs/bwrap/build.rs:32][E: codex-rs/bwrap/build.rs:53][E: codex-rs/bwrap/build.rs:60][E: codex-rs/bwrap/build.rs:75][E: codex-rs/bwrap/src/main.rs:2][E: codex-rs/bwrap/src/main.rs:8][E: codex-rs/bwrap/src/main.rs:27][E: codex-rs/bwrap/src/main.rs:32][E: codex-rs/bwrap/src/main.rs:43]

## 数据模型

- `LandlockCommand`: CLI struct，保留 historical type name but carries sandbox-policy cwd, optional command cwd, serialized `--permission-profile`, legacy fallback flag, inner-stage flag, proxy flags, `no_proc`, and trailing command.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:74][E: codex-rs/linux-sandbox/src/linux_run_main.rs:80][E: codex-rs/linux-sandbox/src/linux_run_main.rs:84][E: codex-rs/linux-sandbox/src/linux_run_main.rs:93][E: codex-rs/linux-sandbox/src/linux_run_main.rs:97][E: codex-rs/linux-sandbox/src/linux_run_main.rs:101][E: codex-rs/linux-sandbox/src/linux_run_main.rs:107][E: codex-rs/linux-sandbox/src/linux_run_main.rs:115][E: codex-rs/linux-sandbox/src/linux_run_main.rs:123][E: codex-rs/linux-sandbox/src/linux_run_main.rs:127][E: codex-rs/linux-sandbox/src/linux_run_main.rs:133][E: codex-rs/linux-sandbox/src/linux_run_main.rs:137]
- `BwrapOptions`: bubblewrap argv builder 的选项结构，仅含三个字段——`mount_proc`(是否 mount 新 `/proc`)、`network_mode`(`BwrapNetworkMode`)、`glob_scan_max_depth`(unreadable glob 展开的可选最大深度);command、policy cwd、command cwd、filesystem policy 等不是该结构的字段，而是 `create_bwrap_command_args` 的独立入参。[E: codex-rs/linux-sandbox/src/bwrap.rs:54][E: codex-rs/linux-sandbox/src/bwrap.rs:60][E: codex-rs/linux-sandbox/src/bwrap.rs:65][E: codex-rs/linux-sandbox/src/bwrap.rs:67]
- `BwrapNetworkMode`: `FullAccess` 不 unshare network，`Isolated` 和 `ProxyOnly` 都会 unshare network。[E: codex-rs/linux-sandbox/src/bwrap.rs:79][E: codex-rs/linux-sandbox/src/bwrap.rs:81][E: codex-rs/linux-sandbox/src/bwrap.rs:82][E: codex-rs/linux-sandbox/src/bwrap.rs:87][E: codex-rs/linux-sandbox/src/bwrap.rs:92]
- `NetworkSeccompMode`: `Restricted` 表示禁网络，`ProxyRouted` 表示只允许 proxy-routed 形态所需 socket 行为。[E: codex-rs/linux-sandbox/src/landlock.rs:89][E: codex-rs/linux-sandbox/src/landlock.rs:91][E: codex-rs/linux-sandbox/src/landlock.rs:92]

## 控制流

1. `run_main` 解析 `LandlockCommand`，拒绝空 command，并校验 inner mode 参数组合。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:101][E: codex-rs/linux-sandbox/src/linux_run_main.rs:116][E: codex-rs/linux-sandbox/src/linux_run_main.rs:119]
2. `resolve_permission_profile` requires `--permission-profile`, then derives runtime filesystem and network policies via `PermissionProfile::to_runtime_permissions`.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:164][E: codex-rs/linux-sandbox/src/linux_run_main.rs:281][E: codex-rs/linux-sandbox/src/linux_run_main.rs:284][E: codex-rs/linux-sandbox/src/linux_run_main.rs:286][E: codex-rs/linux-sandbox/src/linux_run_main.rs:287]
3. `ensure_legacy_landlock_mode_supports_policy` rejects legacy fallback when the resolved filesystem policy needs direct runtime enforcement under the network policy/cwd.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:169][E: codex-rs/linux-sandbox/src/linux_run_main.rs:301][E: codex-rs/linux-sandbox/src/linux_run_main.rs:307][E: codex-rs/linux-sandbox/src/linux_run_main.rs:309][E: codex-rs/linux-sandbox/src/linux_run_main.rs:312]
4. inner stage 由 `--apply-seccomp-then-exec` 触发：如果存在 proxy route spec 则先 `activate_proxy_routes_in_netns`，然后以 `apply_landlock_fs = false` 调用 `apply_permission_profile_to_current_thread` 安装 seccomp/no_new_privs 相关限制，最后 `exec_or_panic` 用户命令。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:176][E: codex-rs/linux-sandbox/src/linux_run_main.rs:179][E: codex-rs/linux-sandbox/src/linux_run_main.rs:183][E: codex-rs/linux-sandbox/src/linux_run_main.rs:188][E: codex-rs/linux-sandbox/src/linux_run_main.rs:191][E: codex-rs/linux-sandbox/src/linux_run_main.rs:197]
5. 如果 filesystem 是 full disk write 且无需 proxy route，`run_main` 可以跳过 bwrap mount namespace，只在当前线程应用网络/seccomp 相关限制后 exec，并且该 fast path 传入 `apply_landlock_fs = false`。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:200][E: codex-rs/linux-sandbox/src/linux_run_main.rs:201][E: codex-rs/linux-sandbox/src/linux_run_main.rs:204][E: codex-rs/linux-sandbox/src/linux_run_main.rs:207][E: codex-rs/linux-sandbox/src/linux_run_main.rs:210]
6. 非 legacy outer path 会为 managed network 准备 host proxy route spec，serialize permission profile into the inner command, then call `run_bwrap_with_proc_fallback`.[E: codex-rs/linux-sandbox/src/linux_run_main.rs:213][E: codex-rs/linux-sandbox/src/linux_run_main.rs:217][E: codex-rs/linux-sandbox/src/linux_run_main.rs:225][E: codex-rs/linux-sandbox/src/linux_run_main.rs:228][E: codex-rs/linux-sandbox/src/linux_run_main.rs:233][E: codex-rs/linux-sandbox/src/linux_run_main.rs:1414][E: codex-rs/linux-sandbox/src/linux_run_main.rs:1429]
7. `run_bwrap_with_proc_fallback` 根据 network policy 选 `BwrapNetworkMode`，做 `/proc` preflight，构造 bwrap argv，必要时插入 `--argv0 codex-linux-sandbox`，最后 exec bwrap。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:317][E: codex-rs/linux-sandbox/src/linux_run_main.rs:326][E: codex-rs/linux-sandbox/src/linux_run_main.rs:330][E: codex-rs/linux-sandbox/src/linux_run_main.rs:349][E: codex-rs/linux-sandbox/src/linux_run_main.rs:357][E: codex-rs/linux-sandbox/src/linux_run_main.rs:358]
8. legacy path 不走 bwrap，而是直接在当前线程以 `apply_landlock_fs = true` 应用 permission profile 的 Landlock filesystem/seccomp restrictions，再 exec 用户命令。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:244][E: codex-rs/linux-sandbox/src/linux_run_main.rs:245][E: codex-rs/linux-sandbox/src/linux_run_main.rs:248][E: codex-rs/linux-sandbox/src/linux_run_main.rs:254]

## 策略生成细节

- `create_bwrap_command_args` 在 full disk write 且 full network 时返回原始 command；如果 full disk write 但需要 network isolation，则生成 full filesystem bubblewrap flags。[E: codex-rs/linux-sandbox/src/bwrap.rs:113][E: codex-rs/linux-sandbox/src/bwrap.rs:120][E: codex-rs/linux-sandbox/src/bwrap.rs:130]
- full filesystem bubblewrap flags 包括 `--new-session`、`--die-with-parent`、`--bind / /`、`--unshare-user`、`--unshare-pid`、可选 `--unshare-net`、可选 `--proc /proc`，最后 `--` 后接 command。[E: codex-rs/linux-sandbox/src/bwrap.rs:145][E: codex-rs/linux-sandbox/src/bwrap.rs:147][E: codex-rs/linux-sandbox/src/bwrap.rs:148][E: codex-rs/linux-sandbox/src/bwrap.rs:149][E: codex-rs/linux-sandbox/src/bwrap.rs:150][E: codex-rs/linux-sandbox/src/bwrap.rs:153][E: codex-rs/linux-sandbox/src/bwrap.rs:156][E: codex-rs/linux-sandbox/src/bwrap.rs:161]
- restricted filesystem path 先生成 read-only 或 tmpfs root baseline，再按 writable roots 绑定 `--bind`，按 read-only subpaths 重放 `--ro-bind`，按 unreadable roots 使用 mask/tmpfs/ro-bind-data 等方式隐藏。[E: codex-rs/linux-sandbox/src/bwrap.rs:277][E: codex-rs/linux-sandbox/src/bwrap.rs:300][E: codex-rs/linux-sandbox/src/bwrap.rs:389][E: codex-rs/linux-sandbox/src/bwrap.rs:408][E: codex-rs/linux-sandbox/src/bwrap.rs:421][E: codex-rs/linux-sandbox/src/bwrap.rs:441]
- unreadable glob expansion 优先运行 `rg --files --hidden --no-ignore --null`，如果 ripgrep 不存在则 fallback 到 glob walker；匹配数量由 `MAX_UNREADABLE_GLOB_MATCHES` 限制，超过上限会返回 fatal error。[E: codex-rs/linux-sandbox/src/bwrap.rs:50][E: codex-rs/linux-sandbox/src/bwrap.rs:467][E: codex-rs/linux-sandbox/src/bwrap.rs:501][E: codex-rs/linux-sandbox/src/bwrap.rs:502][E: codex-rs/linux-sandbox/src/bwrap.rs:577][E: codex-rs/linux-sandbox/src/bwrap.rs:609]
- `apply_permission_profile_to_current_thread` derives runtime policies from `PermissionProfile`, sets no_new_privs only when seccomp is needed or legacy filesystem enforcement is active without full disk write, then installs seccomp and optional Landlock filesystem rules.[E: codex-rs/linux-sandbox/src/landlock.rs:42][E: codex-rs/linux-sandbox/src/landlock.rs:49][E: codex-rs/linux-sandbox/src/landlock.rs:61][E: codex-rs/linux-sandbox/src/landlock.rs:67][E: codex-rs/linux-sandbox/src/landlock.rs:71][E: codex-rs/linux-sandbox/src/landlock.rs:79][E: codex-rs/linux-sandbox/src/landlock.rs:84]
- seccomp filter 一律 deny `ptrace` 与 `io_uring_setup`；restricted network deny `connect`、`accept`、`bind`、`listen` 等，并只允许 `AF_UNIX` socket；proxy-routed mode 允许 `AF_INET`/`AF_INET6` socket 但 deny `socketpair(AF_UNIX)`。[E: codex-rs/linux-sandbox/src/landlock.rs:177][E: codex-rs/linux-sandbox/src/landlock.rs:180][E: codex-rs/linux-sandbox/src/landlock.rs:183][E: codex-rs/linux-sandbox/src/landlock.rs:203][E: codex-rs/linux-sandbox/src/landlock.rs:215][E: codex-rs/linux-sandbox/src/landlock.rs:238]
- managed network proxy flow 先在 host namespace 为 loopback proxy endpoints 创建 UDS route spec，再在 sandbox netns 中启动 local TCP listener 并把 proxy env 改写到 `127.0.0.1:<local_port>`。[E: codex-rs/linux-sandbox/src/proxy_routing.rs:70][E: codex-rs/linux-sandbox/src/proxy_routing.rs:104][E: codex-rs/linux-sandbox/src/proxy_routing.rs:121][E: codex-rs/linux-sandbox/src/proxy_routing.rs:160]

## 设计动机与权衡

- Linux backend uses `PermissionProfile` as the helper boundary while still separating enforcement duties: bwrap owns the filesystem namespace, seccomp owns the network/syscall surface, and legacy Landlock remains an explicit fallback for profiles that do not require direct runtime enforcement.[I]
- `run_bwrap_with_proc_fallback` 独立处理 `/proc` preflight，说明 Linux backend 允许在无法安全 mount `/proc` 的环境中退化到 no-proc bwrap argv，而不是立即放弃整个 sandbox。[E: codex-rs/linux-sandbox/src/linux_run_main.rs:401][E: codex-rs/linux-sandbox/src/linux_run_main.rs:520]
- system/bundled bwrap launcher 同时存在；system path 需要 probe `--argv0` 与 `--perms`，bundled launcher 默认支持 argv0 override 并可按 `CODEX_BWRAP_SHA256` 校验资源 digest。[E: codex-rs/linux-sandbox/src/launcher.rs:55][E: codex-rs/linux-sandbox/src/launcher.rs:61][E: codex-rs/linux-sandbox/src/launcher.rs:101][E: codex-rs/linux-sandbox/src/launcher.rs:108][E: codex-rs/linux-sandbox/src/launcher.rs:121][E: codex-rs/linux-sandbox/src/launcher.rs:122][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:43][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:116][E: codex-rs/linux-sandbox/src/bundled_bwrap.rs:126]

## gotcha

- legacy Landlock 不能表达 restricted read-only policy；`apply_permission_profile_to_current_thread` 在 legacy filesystem path 遇到非 full-disk-read policy 会报 unsupported operation。[E: codex-rs/linux-sandbox/src/landlock.rs:71][E: codex-rs/linux-sandbox/src/landlock.rs:72][E: codex-rs/linux-sandbox/src/landlock.rs:73][E: codex-rs/linux-sandbox/src/landlock.rs:74]
- managed network 即使 network policy enabled，也会让 `should_install_network_seccomp` 返回 true，因为 `allow_network_for_proxy` 需要 seccomp 配合代理路由语义。[E: codex-rs/linux-sandbox/src/landlock.rs:96][E: codex-rs/linux-sandbox/src/landlock.rs:100]
- `CODEX_LINUX_SANDBOX_ARG0` 不是 shell 命令；它是 arg0 dispatch 识别 helper re-entry 的名字，`SandboxManager` 会用 `linux_sandbox_arg0_override` 生成这个 override。[E: codex-rs/sandboxing/src/manager.rs:385][E: codex-rs/sandboxing/src/manager.rs:662][E: codex-rs/sandboxing/src/manager.rs:667]

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
