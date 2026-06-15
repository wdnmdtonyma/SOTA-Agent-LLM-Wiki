---
id: subsys.platform.network-proxy
title: Network proxy
kind: subsystem
tier: T2
source: [codex-rs/network-proxy/src/lib.rs, codex-rs/network-proxy/src/config.rs, codex-rs/network-proxy/src/runtime.rs, codex-rs/network-proxy/src/policy.rs, codex-rs/network-proxy/src/state.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/network-proxy/src/network_policy.rs]
symbols: [NetworkProxyConfig, NetworkProxyState, NetworkProxy, NetworkMode, NetworkDomainPermission, build_config_state, NetworkPolicyDecider]
related: [subsys.exec-sandbox.sandbox-linux, subsys.exec-sandbox.sandbox-seatbelt, config.approval-sandbox]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex_network_proxy` 是 Codex 的 managed network control crate：crate root re-export config/domain policy types、runtime state、proxy builder/handle、proxy env constants、blocked request types 和 network policy decider types。[E: codex-rs/network-proxy/src/lib.rs:17][E: codex-rs/network-proxy/src/lib.rs:20][E: codex-rs/network-proxy/src/lib.rs:21][E: codex-rs/network-proxy/src/lib.rs:25][E: codex-rs/network-proxy/src/lib.rs:27][E: codex-rs/network-proxy/src/lib.rs:33][E: codex-rs/network-proxy/src/lib.rs:40][E: codex-rs/network-proxy/src/lib.rs:41][E: codex-rs/network-proxy/src/lib.rs:42][E: codex-rs/network-proxy/src/lib.rs:50][E: codex-rs/network-proxy/src/lib.rs:55][E: codex-rs/network-proxy/src/lib.rs:61]

## 能回答的问题

- network proxy config 的 allow/deny/default mode 怎样表达？
- host block decision 的顺序是什么？
- runtime config 怎样被 constraints 校验？
- proxy builder 怎样选择 listen address 并注入 HTTP_PROXY/HTTPS_PROXY/NO_PROXY？
- sandbox network policy 怎样通过 public decider types 与 crate-private evaluator 协作？

## Config 与 policy model

`NetworkProxyConfig` 保存 `network: NetworkProxySettings`；`NetworkProxySettings` 字段包括 enabled、proxy_url、socks_url、upstream flags、non-loopback override、Unix socket flags、mode、domains、unix_sockets、allow_local_binding 和 mitm，不包含 audit 字段。[E: codex-rs/network-proxy/src/config.rs:16][E: codex-rs/network-proxy/src/config.rs:19][E: codex-rs/network-proxy/src/config.rs:119][E: codex-rs/network-proxy/src/config.rs:121][E: codex-rs/network-proxy/src/config.rs:123][E: codex-rs/network-proxy/src/config.rs:126][E: codex-rs/network-proxy/src/config.rs:128][E: codex-rs/network-proxy/src/config.rs:130][E: codex-rs/network-proxy/src/config.rs:132][E: codex-rs/network-proxy/src/config.rs:134][E: codex-rs/network-proxy/src/config.rs:136][E: codex-rs/network-proxy/src/config.rs:138][E: codex-rs/network-proxy/src/config.rs:139][E: codex-rs/network-proxy/src/config.rs:141]

`NetworkDomainPermission` 的 variant order 是 `None < Allow < Deny`；`effective_entries()` 在相同 pattern 冲突时保留更高 permission，因此 deny 覆盖 allow。[E: codex-rs/network-proxy/src/config.rs:22][E: codex-rs/network-proxy/src/config.rs:27][E: codex-rs/network-proxy/src/config.rs:28][E: codex-rs/network-proxy/src/config.rs:29][E: codex-rs/network-proxy/src/config.rs:73][E: codex-rs/network-proxy/src/config.rs:82][E: codex-rs/network-proxy/src/config.rs:85][E: codex-rs/network-proxy/src/config.rs:86] `NetworkMode::Full` 允许所有 method，`NetworkMode::Limited` 只允许 GET/HEAD/OPTIONS。[E: codex-rs/network-proxy/src/config.rs:271][E: codex-rs/network-proxy/src/config.rs:275][E: codex-rs/network-proxy/src/config.rs:279][E: codex-rs/network-proxy/src/config.rs:283][E: codex-rs/network-proxy/src/config.rs:285][E: codex-rs/network-proxy/src/config.rs:286]

domain pattern code 会 normalize host、识别 loopback/non-public IP、编译 allowlist/denylist globset，并拒绝 denylist global wildcard。[E: codex-rs/network-proxy/src/policy.rs:21][E: codex-rs/network-proxy/src/policy.rs:33][E: codex-rs/network-proxy/src/policy.rs:45][E: codex-rs/network-proxy/src/policy.rs:101][E: codex-rs/network-proxy/src/policy.rs:161][E: codex-rs/network-proxy/src/policy.rs:165][E: codex-rs/network-proxy/src/policy.rs:176][E: codex-rs/network-proxy/src/policy.rs:178]

## Runtime state 与 blocking

`NetworkProxyState` 保存 config state、config reloader、blocked request observer 和 audit metadata；audit metadata 是 runtime state 的一部分，而不是 config settings 字段。[E: codex-rs/network-proxy/src/runtime.rs:200][E: codex-rs/network-proxy/src/runtime.rs:201][E: codex-rs/network-proxy/src/runtime.rs:202][E: codex-rs/network-proxy/src/runtime.rs:203][E: codex-rs/network-proxy/src/runtime.rs:204]

`host_blocked` 的 decision order 是 explicit deny、local/private networking opt-in、allowlist enforcement。[E: codex-rs/network-proxy/src/runtime.rs:349][E: codex-rs/network-proxy/src/runtime.rs:374][E: codex-rs/network-proxy/src/runtime.rs:379][E: codex-rs/network-proxy/src/runtime.rs:411] DNS lookup failure/timeout 只有在 `allow_local_binding` 为 false 且进入 local/private IP 检查时才会导致 block。[E: codex-rs/network-proxy/src/runtime.rs:379][E: codex-rs/network-proxy/src/runtime.rs:406][E: codex-rs/network-proxy/src/runtime.rs:720][E: codex-rs/network-proxy/src/runtime.rs:726][E: codex-rs/network-proxy/src/runtime.rs:732]

blocked request 会 push 到 capped ring buffer、递增 blocked_total、保持最多 200 条并通知 observer。[E: codex-rs/network-proxy/src/runtime.rs:38][E: codex-rs/network-proxy/src/runtime.rs:418][E: codex-rs/network-proxy/src/runtime.rs:431][E: codex-rs/network-proxy/src/runtime.rs:432][E: codex-rs/network-proxy/src/runtime.rs:434][E: codex-rs/network-proxy/src/runtime.rs:435][E: codex-rs/network-proxy/src/runtime.rs:447][E: codex-rs/network-proxy/src/runtime.rs:448]

Unix socket allowance 只支持 macOS；runtime 要求 request path 是 absolute，canonicalization 是 best-effort，用于 symlink 比较，canonicalize 失败时仍保留 raw absolute path comparison。[E: codex-rs/network-proxy/src/runtime.rs:471][E: codex-rs/network-proxy/src/runtime.rs:473][E: codex-rs/network-proxy/src/runtime.rs:480][E: codex-rs/network-proxy/src/runtime.rs:490][E: codex-rs/network-proxy/src/runtime.rs:494][E: codex-rs/network-proxy/src/runtime.rs:505][E: codex-rs/network-proxy/src/runtime.rs:511][E: codex-rs/network-proxy/src/runtime.rs:514][E: codex-rs/network-proxy/src/runtime.rs:709][E: codex-rs/network-proxy/src/runtime.rs:710]

## State validation 与 proxy process

`build_config_state` 校验 Unix socket allowlist paths，提取 allowed/denied domains，拒绝 denied global wildcard，编译 deny/allow globsets，并按 `network.mitm` 构造 optional MITM state。[E: codex-rs/network-proxy/src/state.rs:57][E: codex-rs/network-proxy/src/state.rs:61][E: codex-rs/network-proxy/src/state.rs:62][E: codex-rs/network-proxy/src/state.rs:63][E: codex-rs/network-proxy/src/state.rs:64][E: codex-rs/network-proxy/src/state.rs:66][E: codex-rs/network-proxy/src/state.rs:67][E: codex-rs/network-proxy/src/state.rs:68][E: codex-rs/network-proxy/src/state.rs:69] `validate_policy_against_constraints` 校验 enabled、mode、upstream proxy、non-loopback proxy、all Unix sockets、local binding、allowlist/denylist 和 Unix socket constraints。[E: codex-rs/network-proxy/src/state.rs:86][E: codex-rs/network-proxy/src/state.rs:118][E: codex-rs/network-proxy/src/state.rs:132][E: codex-rs/network-proxy/src/state.rs:146][E: codex-rs/network-proxy/src/state.rs:165][E: codex-rs/network-proxy/src/state.rs:184][E: codex-rs/network-proxy/src/state.rs:202][E: codex-rs/network-proxy/src/state.rs:216][E: codex-rs/network-proxy/src/state.rs:303][E: codex-rs/network-proxy/src/state.rs:350]

`NetworkProxyBuilder::build` 要求 state 存在并设置 blocked observer；managed_by_codex 时，非 Windows 保留 loopback ephemeral listeners，Windows 优先尝试 managed loopback ports，端口占用时 fallback 到 ephemeral loopback ports。[E: codex-rs/network-proxy/src/proxy.rs:166][E: codex-rs/network-proxy/src/proxy.rs:167][E: codex-rs/network-proxy/src/proxy.rs:173][E: codex-rs/network-proxy/src/proxy.rs:177][E: codex-rs/network-proxy/src/proxy.rs:187][E: codex-rs/network-proxy/src/proxy.rs:193][E: codex-rs/network-proxy/src/proxy.rs:194][E: codex-rs/network-proxy/src/proxy.rs:252][E: codex-rs/network-proxy/src/proxy.rs:255][E: codex-rs/network-proxy/src/proxy.rs:257][E: codex-rs/network-proxy/src/proxy.rs:259][E: codex-rs/network-proxy/src/proxy.rs:282]

`apply_proxy_env_overrides` 写入 proxy active/local-binding env、HTTP/HTTPS/websocket proxy vars、NO_PROXY、ALL_PROXY/FTP proxy；macOS 且 socks enabled 时会设置 `GIT_SSH_COMMAND`，但保留非 Codex 已有 SSH wrapper。[E: codex-rs/network-proxy/src/proxy.rs:473][E: codex-rs/network-proxy/src/proxy.rs:482][E: codex-rs/network-proxy/src/proxy.rs:484][E: codex-rs/network-proxy/src/proxy.rs:493][E: codex-rs/network-proxy/src/proxy.rs:518][E: codex-rs/network-proxy/src/proxy.rs:523][E: codex-rs/network-proxy/src/proxy.rs:533][E: codex-rs/network-proxy/src/proxy.rs:534][E: codex-rs/network-proxy/src/proxy.rs:535][E: codex-rs/network-proxy/src/proxy.rs:541][E: codex-rs/network-proxy/src/proxy.rs:542][E: codex-rs/network-proxy/src/proxy.rs:546][E: codex-rs/network-proxy/src/proxy.rs:547][E: codex-rs/network-proxy/src/proxy.rs:550]

`NetworkProxy` public methods 包括 builder、addresses、current config、domain mutation、runtime accessors、env application、config replacement 和 run；`run` skips listeners when `network.enabled` is false and otherwise spawns HTTP and optional SOCKS tasks.[E: codex-rs/network-proxy/src/proxy.rs:559][E: codex-rs/network-proxy/src/proxy.rs:563][E: codex-rs/network-proxy/src/proxy.rs:567][E: codex-rs/network-proxy/src/proxy.rs:571][E: codex-rs/network-proxy/src/proxy.rs:575][E: codex-rs/network-proxy/src/proxy.rs:579][E: codex-rs/network-proxy/src/proxy.rs:583][E: codex-rs/network-proxy/src/proxy.rs:587][E: codex-rs/network-proxy/src/proxy.rs:595][E: codex-rs/network-proxy/src/proxy.rs:608][E: codex-rs/network-proxy/src/proxy.rs:648][E: codex-rs/network-proxy/src/proxy.rs:650][E: codex-rs/network-proxy/src/proxy.rs:668][E: codex-rs/network-proxy/src/proxy.rs:678]

## Sandbox policy evaluator

`network_policy.rs` 的 public types 包括 protocol、policy decision、decision source、request args/request、decision result 和 `NetworkPolicyDecider` trait。[E: codex-rs/network-proxy/src/network_policy.rs:23][E: codex-rs/network-proxy/src/network_policy.rs:43][E: codex-rs/network-proxy/src/network_policy.rs:59][E: codex-rs/network-proxy/src/network_policy.rs:78][E: codex-rs/network-proxy/src/network_policy.rs:88][E: codex-rs/network-proxy/src/network_policy.rs:122][E: codex-rs/network-proxy/src/network_policy.rs:267] `evaluate_host_policy` 本身是 `pub(crate)`，不是 crate root re-export 的 public API。[E: codex-rs/network-proxy/src/network_policy.rs:289][E: codex-rs/network-proxy/src/lib.rs:25][E: codex-rs/network-proxy/src/lib.rs:31]

crate-private `evaluate_host_policy` 先调用 `host_blocked`；只有 `HostBlockReason::NotAllowed` 且 decider 存在时会调用 optional decider，其它 baseline blocked reasons 直接 deny；最后记录 domain policy audit event。[E: codex-rs/network-proxy/src/network_policy.rs:294][E: codex-rs/network-proxy/src/network_policy.rs:295][E: codex-rs/network-proxy/src/network_policy.rs:297][E: codex-rs/network-proxy/src/network_policy.rs:298][E: codex-rs/network-proxy/src/network_policy.rs:299][E: codex-rs/network-proxy/src/network_policy.rs:312][E: codex-rs/network-proxy/src/network_policy.rs:313][E: codex-rs/network-proxy/src/network_policy.rs:315][E: codex-rs/network-proxy/src/network_policy.rs:342][E: codex-rs/network-proxy/src/network_policy.rs:358]

## 设计动机与权衡

Network proxy 同时暴露 config validation、runtime dynamic updates、proxy env injection 和 network policy decider interface，说明它既是本地代理进程配置层，也是 sandbox/network enforcement 的共享决策层。[I] 该设计由 `build_config_state`、`NetworkProxyState`、`NetworkProxy` 和 `NetworkPolicyDecider` 共同体现。[E: codex-rs/network-proxy/src/state.rs:57][E: codex-rs/network-proxy/src/runtime.rs:200][E: codex-rs/network-proxy/src/proxy.rs:315][E: codex-rs/network-proxy/src/network_policy.rs:267]

deny permission rank 高于 allow，能让 managed denylist 在同一 domain 同时出现在 allow/deny 时保持保守。[I] 该结论由 `NetworkDomainPermission` ordering 和 `effective_entries` 更新逻辑共同支撑。[E: codex-rs/network-proxy/src/config.rs:22][E: codex-rs/network-proxy/src/config.rs:85]

## Gotchas

- global wildcard deny pattern 会被 pattern compiler/constraint validation 拒绝，避免 denylist 变成不可恢复的全局 deny。[E: codex-rs/network-proxy/src/policy.rs:176][E: codex-rs/network-proxy/src/policy.rs:178][E: codex-rs/network-proxy/src/state.rs:381][E: codex-rs/network-proxy/src/state.rs:385]
- loopback/private host 默认受 opt-in 逻辑影响；显式本地 allowlist 不接受 wildcard。[E: codex-rs/network-proxy/src/runtime.rs:379][E: codex-rs/network-proxy/src/runtime.rs:794][E: codex-rs/network-proxy/src/runtime.rs:798]
- environment injection 只有在 macOS 且 socks enabled 时才注入 Codex fallback `GIT_SSH_COMMAND`，并会保留非 Codex 已有命令。[E: codex-rs/network-proxy/src/proxy.rs:541][E: codex-rs/network-proxy/src/proxy.rs:542][E: codex-rs/network-proxy/src/proxy.rs:546][E: codex-rs/network-proxy/src/proxy.rs:547][E: codex-rs/network-proxy/src/proxy.rs:549][E: codex-rs/network-proxy/src/proxy.rs:550][E: codex-rs/network-proxy/src/proxy.rs:551]

## Sources

- `codex-rs/network-proxy/src/lib.rs`
- `codex-rs/network-proxy/src/config.rs`
- `codex-rs/network-proxy/src/runtime.rs`
- `codex-rs/network-proxy/src/policy.rs`
- `codex-rs/network-proxy/src/state.rs`
- `codex-rs/network-proxy/src/proxy.rs`
- `codex-rs/network-proxy/src/network_policy.rs`

## 相关

- `subsys.exec-sandbox.sandbox-linux`: Linux sandbox managed network route integration。
- `subsys.exec-sandbox.sandbox-seatbelt`: macOS Seatbelt network policy integration。
- `config.approval-sandbox`: network proxy 与 sandbox/approval policy 的配置关系。
