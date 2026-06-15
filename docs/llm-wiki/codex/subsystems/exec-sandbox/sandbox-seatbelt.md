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
updated: 37aadeaa13
---

> macOS Seatbelt backend 把 Codex 的 filesystem/network policies 编译成 SBPL profile，并通过 `/usr/bin/sandbox-exec -p <profile> -D... -- <command>` 启动目标命令。[E: codex-rs/sandboxing/src/seatbelt.rs:24][E: codex-rs/sandboxing/src/seatbelt.rs:681][E: codex-rs/sandboxing/src/seatbelt.rs:690]

## 能回答的问题

- Seatbelt profile 怎样表达 writable roots、read-only roots、unreadable roots 和 deny globs？
- managed network 和 proxy loopback 在 SBPL 中怎样影响 outbound/inbound 规则？
- `/usr/bin/sandbox-exec` argv 是怎样拼出来的？
- `-D` 参数怎样由 filesystem roots、Unix sockets 和 `DARWIN_USER_CACHE_DIR` 生成？
- unreadable glob 为什么会转成 `regex` deny 规则？

## 职责边界

Seatbelt backend 只负责 macOS SBPL 字符串和 `sandbox-exec` 参数生成。它不决定初始 sandbox 类型；`SandboxManager::select_initial` 负责选择 `MacosSeatbelt`。[I] Seatbelt backend 也不执行 spawn；它返回 argv 给上层 spawn runtime。[E: codex-rs/sandboxing/src/seatbelt.rs:559][E: codex-rs/sandboxing/src/seatbelt.rs:690]

`MACOS_SEATBELT_BASE_POLICY`、`MACOS_SEATBELT_NETWORK_POLICY`、`MACOS_RESTRICTED_READ_ONLY_PLATFORM_DEFAULTS` 由 `include_str!` 嵌入，说明 SBPL profile 是静态模板加动态片段拼接的组合。[E: codex-rs/sandboxing/src/seatbelt.rs:19][E: codex-rs/sandboxing/src/seatbelt.rs:20][E: codex-rs/sandboxing/src/seatbelt.rs:21]

## 关键 crate/文件

- `codex-rs/sandboxing/src/seatbelt.rs`: 生成 SBPL access policy、dynamic network policy、unreadable glob deny 规则和 `sandbox-exec` argv。[E: codex-rs/sandboxing/src/seatbelt.rs:333][E: codex-rs/sandboxing/src/seatbelt.rs:256][E: codex-rs/sandboxing/src/seatbelt.rs:383][E: codex-rs/sandboxing/src/seatbelt.rs:559]

## 数据模型

- `UnixDomainSocketPolicy`: `AllowAll` 或 `Restricted { allowed }` 两种 Unix domain socket 策略；default 是 empty allowed list 的 `Restricted`。[E: codex-rs/sandboxing/src/seatbelt.rs:87][E: codex-rs/sandboxing/src/seatbelt.rs:88][E: codex-rs/sandboxing/src/seatbelt.rs:89][E: codex-rs/sandboxing/src/seatbelt.rs:92]
- `CreateSeatbeltCommandArgsParams`: `command`、filesystem policy、network policy、sandbox policy cwd、managed-network enforcement flag、network proxy、extra allowed Unix sockets 是生成 SBPL 和 argv 所需的输入。[E: codex-rs/sandboxing/src/seatbelt.rs:550][E: codex-rs/sandboxing/src/seatbelt.rs:551][E: codex-rs/sandboxing/src/seatbelt.rs:552][E: codex-rs/sandboxing/src/seatbelt.rs:553][E: codex-rs/sandboxing/src/seatbelt.rs:554][E: codex-rs/sandboxing/src/seatbelt.rs:555][E: codex-rs/sandboxing/src/seatbelt.rs:556]
- `ProxyPolicyInputs`: 从 managed network proxy 中抽取 loopback ports、proxy config 是否存在、local binding allowance 和 Unix socket policy。[E: codex-rs/sandboxing/src/seatbelt.rs:77][E: codex-rs/sandboxing/src/seatbelt.rs:79][E: codex-rs/sandboxing/src/seatbelt.rs:80][E: codex-rs/sandboxing/src/seatbelt.rs:81][E: codex-rs/sandboxing/src/seatbelt.rs:82]

## 控制流

1. `create_seatbelt_command_args` 接收目标命令、effective sandbox policy、cwd、network policy 和 managed network proxy。[E: codex-rs/sandboxing/src/seatbelt.rs:559][E: codex-rs/sandboxing/src/seatbelt.rs:566]
2. 函数先把 `sandbox_policy.get_unreadable_roots()` 转成 `unreadable_roots`，后续读写策略都会排除这些路径。[E: codex-rs/sandboxing/src/seatbelt.rs:570][E: codex-rs/sandboxing/src/seatbelt.rs:571]
3. 如果 filesystem 是 full disk write，且没有 unreadable roots，Seatbelt 直接加入 `(allow file-write* (regex #"^/"))`；如果存在 unreadable roots，则通过 `build_seatbelt_access_policy` 对写入做 excluded subpaths。[E: codex-rs/sandboxing/src/seatbelt.rs:573][E: codex-rs/sandboxing/src/seatbelt.rs:577][E: codex-rs/sandboxing/src/seatbelt.rs:581][E: codex-rs/sandboxing/src/seatbelt.rs:583]
4. 如果 filesystem 是 restricted write，函数取 `get_writable_roots_with_cwd(cwd)`，再用 `build_seatbelt_access_policy` 生成对这些 roots 的写授权。[E: codex-rs/sandboxing/src/seatbelt.rs:590][E: codex-rs/sandboxing/src/seatbelt.rs:595][E: codex-rs/sandboxing/src/seatbelt.rs:599]
5. read policy 分支会在 full read 时允许 `file-read*`，在 restricted read 时根据 explicit read roots 生成 read-only access policy，并附加 platform defaults。[E: codex-rs/sandboxing/src/seatbelt.rs:605][E: codex-rs/sandboxing/src/seatbelt.rs:615][E: codex-rs/sandboxing/src/seatbelt.rs:641]
6. `dynamic_network_policy_for_network` 根据 `NetworkSandboxPolicy` 与 managed proxy 输入生成 network SBPL 片段；完整网络启用时允许 outbound 和 inbound network，默认禁网时返回空策略片段。[E: codex-rs/sandboxing/src/seatbelt.rs:256][E: codex-rs/sandboxing/src/seatbelt.rs:306][E: codex-rs/sandboxing/src/seatbelt.rs:314][E: codex-rs/sandboxing/src/seatbelt.rs:315]
7. 函数拼接 base policy、network policy、filesystem policy 和 platform defaults，然后把它们放入 `sandbox-exec` 的 `-p` 参数。[E: codex-rs/sandboxing/src/seatbelt.rs:657][E: codex-rs/sandboxing/src/seatbelt.rs:668][E: codex-rs/sandboxing/src/seatbelt.rs:681][E: codex-rs/sandboxing/src/seatbelt.rs:682]
8. 函数把 `dir_params` 格式化成 `-Dkey=value` 参数，再追加 `--` 和目标 command；当前 `macos_dir_params` 在 `_CS_DARWIN_USER_CACHE_DIR` 可用时只返回 `DARWIN_USER_CACHE_DIR`。[E: codex-rs/sandboxing/src/seatbelt.rs:681][E: codex-rs/sandboxing/src/seatbelt.rs:682][E: codex-rs/sandboxing/src/seatbelt.rs:685][E: codex-rs/sandboxing/src/seatbelt.rs:688][E: codex-rs/sandboxing/src/seatbelt.rs:689][E: codex-rs/sandboxing/src/seatbelt.rs:712][E: codex-rs/sandboxing/src/seatbelt.rs:714]

## 策略生成细节

- `build_seatbelt_access_policy` 为每个 allowed root 生成 `(subpath (param ...))` policy component；如果 root 带 excluded subpaths，excluded subpaths 会被编译为 `require-not` 包裹的 `literal` 和 `subpath` 条件。[E: codex-rs/sandboxing/src/seatbelt.rs:333][E: codex-rs/sandboxing/src/seatbelt.rs:348][E: codex-rs/sandboxing/src/seatbelt.rs:352][E: codex-rs/sandboxing/src/seatbelt.rs:363][E: codex-rs/sandboxing/src/seatbelt.rs:366]
- unreadable globs 经过 `build_seatbelt_unreadable_glob_policy` 生成 `(deny file-read* ...)` 与 `(deny file-write-unlink ...)`，因此 glob 命中路径既不能读取，也不能被 unlink。[E: codex-rs/sandboxing/src/seatbelt.rs:383][E: codex-rs/sandboxing/src/seatbelt.rs:409][E: codex-rs/sandboxing/src/seatbelt.rs:410]
- glob 到 regex 的转换由 `seatbelt_regex_for_unreadable_glob` 完成，`*`、`**`、`?` 和 closed character classes 被专门处理；没有 glob metacharacters 的 pattern 会被当作 exact path plus subtree。[E: codex-rs/sandboxing/src/seatbelt.rs:443][E: codex-rs/sandboxing/src/seatbelt.rs:458][E: codex-rs/sandboxing/src/seatbelt.rs:460][E: codex-rs/sandboxing/src/seatbelt.rs:472][E: codex-rs/sandboxing/src/seatbelt.rs:476][E: codex-rs/sandboxing/src/seatbelt.rs:520]
- managed network 的 loopback proxy 会先从 `NetworkProxy` environment 中抽取 `127.0.0.1`/`localhost` 端口，再把这些端口编进 restricted network policy。[E: codex-rs/sandboxing/src/seatbelt.rs:42][E: codex-rs/sandboxing/src/seatbelt.rs:68][E: codex-rs/sandboxing/src/seatbelt.rs:265][E: codex-rs/sandboxing/src/seatbelt.rs:281]

## 设计动机与权衡

- Seatbelt backend 选择“静态模板 + 动态 policy snippets”的结构，因为 base sandbox 与 common platform paths 稳定，而 workspace roots、unreadable globs、managed network ports 每次 exec 都可能不同。[I]
- `build_seatbelt_access_policy` 使用 explicit allowed roots 加 optional excluded subpaths，而不是先允许全盘再单独 deny，能够在 restricted write/read 模式下把允许面限制在 Codex 计算出的 roots。[I]
- unreadable glob 额外 deny `file-write-unlink`，体现出“读不可见路径也不能被删除”的保守语义。[E: codex-rs/sandboxing/src/seatbelt.rs:409][E: codex-rs/sandboxing/src/seatbelt.rs:410]

## gotcha

- `/usr/bin/sandbox-exec` 路径是硬编码常量，不是通过 PATH 查找。[E: codex-rs/sandboxing/src/seatbelt.rs:24]
- `dynamic_network_policy_for_network` 在 network disabled 且没有 managed proxy/Unix socket allowance 时返回空字符串；禁网行为依赖 base Seatbelt profile 默认禁止网络，而不是在这里显式追加 deny。[E: codex-rs/sandboxing/src/seatbelt.rs:315][E: codex-rs/sandboxing/src/seatbelt.rs:317]
- `CreateSeatbeltCommandArgsParams` 直接接收 split filesystem/network policy，而不是 legacy `SandboxPolicy`；legacy `create_seatbelt_command_args_for_legacy_policy` wrapper（`#[cfg_attr(not(test), allow(dead_code))]`，非 test build 仅测试用）会先从 `SandboxPolicy` 派生 split policy 再调用主函数。[E: codex-rs/sandboxing/src/seatbelt.rs:531][E: codex-rs/sandboxing/src/seatbelt.rs:539][E: codex-rs/sandboxing/src/seatbelt.rs:559]

## Sources

- `codex-rs/sandboxing/src/seatbelt.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `spine.shell-exec-flow`
