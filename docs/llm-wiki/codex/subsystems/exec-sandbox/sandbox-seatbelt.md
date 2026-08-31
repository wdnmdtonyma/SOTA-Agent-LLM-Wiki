---
id: subsys.exec-sandbox.sandbox-seatbelt
title: macOS Seatbelt sandbox
kind: subsystem
tier: T2
source: [codex-rs/sandboxing/src/seatbelt.rs]
symbols: [create_seatbelt_command_args, CreateSeatbeltCommandArgsParams, build_seatbelt_access_policy, dynamic_network_policy_for_network, UnixDomainSocketPolicy]
related: [subsys.exec-sandbox.overview, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> macOS Seatbelt backend 把 Codex 的 filesystem/network policies 编译成 SBPL profile，并通过 `/usr/bin/sandbox-exec -p <profile> -D... -- <command>` 启动目标命令；生成函数现在返回 `Result<Vec<String>, String>` because network proxy env preparation can fail.[E: codex-rs/sandboxing/src/seatbelt.rs:63][E: codex-rs/sandboxing/src/seatbelt.rs:844][E: codex-rs/sandboxing/src/seatbelt.rs:846][E: codex-rs/sandboxing/src/seatbelt.rs:1029][E: codex-rs/sandboxing/src/seatbelt.rs:1036]

## 能回答的问题

- Seatbelt profile 怎样表达 writable roots、read-only roots、unreadable roots 和 deny globs？
- managed network、environment id 和 proxy loopback 在 SBPL 中怎样影响 outbound/inbound 规则？
- `/usr/bin/sandbox-exec` argv 是怎样拼出来的？
- `-D` 参数怎样由 filesystem roots、Unix sockets 和 path params 生成？
- unreadable glob 为什么会转成 `regex` deny 规则？

## 职责边界

Seatbelt backend 只负责 macOS SBPL 字符串和 `sandbox-exec` 参数生成。它不决定初始 sandbox 类型；`SandboxManager::select_initial` 负责选择 `MacosSeatbelt`。[I] Seatbelt backend 也不执行 spawn；它返回 argv 给上层 spawn runtime。[E: codex-rs/sandboxing/src/seatbelt.rs:844][E: codex-rs/sandboxing/src/seatbelt.rs:1029][E: codex-rs/sandboxing/src/seatbelt.rs:1038]

`MACOS_SEATBELT_BASE_POLICY`、`MACOS_SEATBELT_NETWORK_POLICY`、`MACOS_RESTRICTED_READ_ONLY_PLATFORM_DEFAULTS` 由 `include_str!` 嵌入，说明 SBPL profile 是静态模板加动态片段拼接的组合。[E: codex-rs/sandboxing/src/seatbelt.rs:21][E: codex-rs/sandboxing/src/seatbelt.rs:22][E: codex-rs/sandboxing/src/seatbelt.rs:24]

## 关键 crate/文件

- `codex-rs/sandboxing/src/seatbelt.rs`: 生成 SBPL access policy、dynamic network policy、unreadable glob deny 规则和 `sandbox-exec` argv。[E: codex-rs/sandboxing/src/seatbelt.rs:307][E: codex-rs/sandboxing/src/seatbelt.rs:483][E: codex-rs/sandboxing/src/seatbelt.rs:617][E: codex-rs/sandboxing/src/seatbelt.rs:844][E: codex-rs/sandboxing/src/seatbelt.rs:1029]

## 数据模型

- `UnixDomainSocketPolicy`: `AllowAll` 或 `Restricted { allowed }` 两种 Unix domain socket 策略；default 是 empty allowed list 的 `Restricted`。[E: codex-rs/sandboxing/src/seatbelt.rs:122][E: codex-rs/sandboxing/src/seatbelt.rs:123][E: codex-rs/sandboxing/src/seatbelt.rs:124][E: codex-rs/sandboxing/src/seatbelt.rs:127][E: codex-rs/sandboxing/src/seatbelt.rs:129]
- `ProxyPolicyInputs`: 从 managed network/proxy 中抽取 loopback ports、proxy config 是否存在、local binding allowance 和 Unix socket policy。[E: codex-rs/sandboxing/src/seatbelt.rs:113][E: codex-rs/sandboxing/src/seatbelt.rs:114][E: codex-rs/sandboxing/src/seatbelt.rs:115][E: codex-rs/sandboxing/src/seatbelt.rs:116][E: codex-rs/sandboxing/src/seatbelt.rs:117]
- `CreateSeatbeltCommandArgsParams`: `command`、filesystem policy、network policy、sandbox policy cwd、managed-network enforcement flag、managed-network context、environment id、network proxy、extra allowed Unix sockets 是生成 SBPL 和 argv 所需的输入。[E: codex-rs/sandboxing/src/seatbelt.rs:832][E: codex-rs/sandboxing/src/seatbelt.rs:833][E: codex-rs/sandboxing/src/seatbelt.rs:834][E: codex-rs/sandboxing/src/seatbelt.rs:835][E: codex-rs/sandboxing/src/seatbelt.rs:836][E: codex-rs/sandboxing/src/seatbelt.rs:837][E: codex-rs/sandboxing/src/seatbelt.rs:838][E: codex-rs/sandboxing/src/seatbelt.rs:839][E: codex-rs/sandboxing/src/seatbelt.rs:840][E: codex-rs/sandboxing/src/seatbelt.rs:841]

## 控制流

1. `create_seatbelt_command_args` 接收 `CreateSeatbeltCommandArgsParams`，再交给 `create_seatbelt_command_args_with_profile`。[E: codex-rs/sandboxing/src/seatbelt.rs:832][E: codex-rs/sandboxing/src/seatbelt.rs:844][E: codex-rs/sandboxing/src/seatbelt.rs:847][E: codex-rs/sandboxing/src/seatbelt.rs:851]
2. 函数先把 filesystem policy 的 unreadable roots 转成 `unreadable_roots`，后续读写策略都会排除这些路径。[E: codex-rs/sandboxing/src/seatbelt.rs:867][E: codex-rs/sandboxing/src/seatbelt.rs:868]
3. 如果 filesystem 是 full disk write，且没有 unreadable roots，Seatbelt 直接加入 `(allow file-write* (regex #"^/"))`；如果存在 unreadable roots，则通过 `build_seatbelt_access_policy` 对写入做 excluded subpaths。[E: codex-rs/sandboxing/src/seatbelt.rs:896][E: codex-rs/sandboxing/src/seatbelt.rs:897][E: codex-rs/sandboxing/src/seatbelt.rs:900][E: codex-rs/sandboxing/src/seatbelt.rs:904]
4. 如果 filesystem 是 restricted write，函数取 `get_writable_roots_with_cwd_preserving_mutable_paths`，再用 `build_seatbelt_access_policy` 生成对这些 roots 的写授权。[E: codex-rs/sandboxing/src/seatbelt.rs:869][E: codex-rs/sandboxing/src/seatbelt.rs:913][E: codex-rs/sandboxing/src/seatbelt.rs:914]
5. read policy 分支会在 full read 时允许 `file-read*`，在 restricted read 时根据 explicit read roots 生成 read-only access policy，并可附加 platform defaults。[E: codex-rs/sandboxing/src/seatbelt.rs:931][E: codex-rs/sandboxing/src/seatbelt.rs:932][E: codex-rs/sandboxing/src/seatbelt.rs:935][E: codex-rs/sandboxing/src/seatbelt.rs:953][E: codex-rs/sandboxing/src/seatbelt.rs:956][E: codex-rs/sandboxing/src/seatbelt.rs:989]
6. `proxy_policy_inputs` prefers a `ManagedNetworkSandboxContext` when provided; otherwise it applies the `NetworkProxy` to an env map for an optional environment id, extracts loopback ports, and records Unix socket allowance.[E: codex-rs/sandboxing/src/seatbelt.rs:139][E: codex-rs/sandboxing/src/seatbelt.rs:979]
7. `dynamic_network_policy_for_network` 根据 `NetworkSandboxPolicy` 与 managed/proxy inputs 生成 network SBPL 片段；完整网络启用且无 proxy restriction 时允许 outbound 和 inbound network，默认禁网时返回空策略片段。[E: codex-rs/sandboxing/src/seatbelt.rs:307][E: codex-rs/sandboxing/src/seatbelt.rs:357][E: codex-rs/sandboxing/src/seatbelt.rs:359][E: codex-rs/sandboxing/src/seatbelt.rs:367]
8. 函数拼接 base policy、read/write policy、network policy、optional platform defaults 和 deny-read policy，然后把它们放入 `sandbox-exec` 的 `-p` 参数。[E: codex-rs/sandboxing/src/seatbelt.rs:990][E: codex-rs/sandboxing/src/seatbelt.rs:992][E: codex-rs/sandboxing/src/seatbelt.rs:1007][E: codex-rs/sandboxing/src/seatbelt.rs:1029]
9. 函数把 read/write/unix-socket dir params 合并并格式化成 `-Dkey=value` 参数，再追加 `--` 和目标 command。[E: codex-rs/sandboxing/src/seatbelt.rs:1021][E: codex-rs/sandboxing/src/seatbelt.rs:1033][E: codex-rs/sandboxing/src/seatbelt.rs:1036][E: codex-rs/sandboxing/src/seatbelt.rs:1037]

## 策略生成细节

- `build_seatbelt_access_policy` 为每个 allowed root 生成 `(subpath (param ...))` policy component；如果 root 带 excluded subpaths 或 protected metadata names，函数会生成 `require-not` 条件或 metadata regex 条件。[E: codex-rs/sandboxing/src/seatbelt.rs:483][E: codex-rs/sandboxing/src/seatbelt.rs:495][E: codex-rs/sandboxing/src/seatbelt.rs:519][E: codex-rs/sandboxing/src/seatbelt.rs:532][E: codex-rs/sandboxing/src/seatbelt.rs:568]
- unreadable globs 经过 `build_seatbelt_unreadable_glob_policy` 生成 `(deny file-read* ...)` 与 `(deny file-write* ...)`；ancestor 路径还会追加 `file-write-unlink` deny，避免把匹配路径 rename 出 glob 覆盖范围。[E: codex-rs/sandboxing/src/seatbelt.rs:617][E: codex-rs/sandboxing/src/seatbelt.rs:625][E: codex-rs/sandboxing/src/seatbelt.rs:640][E: codex-rs/sandboxing/src/seatbelt.rs:641]
- glob 到 regex 的转换由 `seatbelt_regex_for_unreadable_glob` 完成，`*`、`**`、`?` 和 closed character classes 被专门处理；没有 glob metacharacters 的 pattern 会被当作 exact path plus subtree。[E: codex-rs/sandboxing/src/seatbelt.rs:692][E: codex-rs/sandboxing/src/seatbelt.rs:696][E: codex-rs/sandboxing/src/seatbelt.rs:706][E: codex-rs/sandboxing/src/seatbelt.rs:715][E: codex-rs/sandboxing/src/seatbelt.rs:718][E: codex-rs/sandboxing/src/seatbelt.rs:721]
- managed network 的 loopback proxy 会先从 `ManagedNetworkSandboxContext` 或 `NetworkProxy` environment 中抽取 loopback 端口，再把这些端口编进 restricted network policy。[E: codex-rs/sandboxing/src/seatbelt.rs:66][E: codex-rs/sandboxing/src/seatbelt.rs:90][E: codex-rs/sandboxing/src/seatbelt.rs:94][E: codex-rs/sandboxing/src/seatbelt.rs:165][E: codex-rs/sandboxing/src/seatbelt.rs:170][E: codex-rs/sandboxing/src/seatbelt.rs:182][E: codex-rs/sandboxing/src/seatbelt.rs:323][E: codex-rs/sandboxing/src/seatbelt.rs:325]

## 设计动机与权衡

- Seatbelt backend 选择“静态模板 + 动态 policy snippets”的结构，因为 base sandbox 与 common platform paths 稳定，而 workspace roots、unreadable globs、managed network ports 每次 exec 都可能不同。[I]
- `build_seatbelt_access_policy` 使用 explicit allowed roots 加 optional excluded subpaths，而不是先允许全盘再单独 deny，能够在 restricted write/read 模式下把允许面限制在 Codex 计算出的 roots。[I]
- unreadable glob 对命中路径 deny 全部 `file-write*`，并对 ancestor 追加 `file-write-unlink`，避免 rename 绕过 glob。[E: codex-rs/sandboxing/src/seatbelt.rs:640][E: codex-rs/sandboxing/src/seatbelt.rs:641]

## gotcha

- `/usr/bin/sandbox-exec` 路径是硬编码常量，不是通过 PATH 查找。[E: codex-rs/sandboxing/src/seatbelt.rs:63]
- `dynamic_network_policy_for_network` 在 network disabled 且没有 managed proxy/Unix socket allowance 时返回空字符串；禁网行为依赖 base Seatbelt profile 默认禁止网络，而不是在这里显式追加 deny。[E: codex-rs/sandboxing/src/seatbelt.rs:357][E: codex-rs/sandboxing/src/seatbelt.rs:367]
- `CreateSeatbeltCommandArgsParams` 直接接收 split filesystem/network policy，而不是 legacy `SandboxPolicy`；legacy `create_seatbelt_command_args_for_legacy_policy` wrapper 会先从 `SandboxPolicy` 派生 split policy 再调用主函数。[E: codex-rs/sandboxing/src/seatbelt.rs:807][E: codex-rs/sandboxing/src/seatbelt.rs:815][E: codex-rs/sandboxing/src/seatbelt.rs:818][E: codex-rs/sandboxing/src/seatbelt.rs:832]

## Sources

- `codex-rs/sandboxing/src/seatbelt.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `spine.shell-exec-flow`
