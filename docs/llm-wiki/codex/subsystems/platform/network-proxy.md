---
id: subsys.platform.network-proxy
title: Network proxy
kind: subsystem
tier: T2
source: [codex-rs/network-proxy/src/lib.rs, codex-rs/network-proxy/src/config.rs, codex-rs/network-proxy/src/runtime.rs, codex-rs/network-proxy/src/policy.rs, codex-rs/network-proxy/src/state.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/network-proxy/src/network_policy.rs, codex-rs/network-proxy/src/mitm_hook.rs, codex-rs/network-proxy/src/http_proxy.rs, codex-rs/network-proxy/src/socks5.rs]
symbols: [NetworkProxyConfig, NetworkProxyState, NetworkProxy, NetworkMode, NetworkDomainPermission, MitmHookConfig, build_config_state, NetworkPolicyDecider]
related: [subsys.exec-sandbox.sandbox-linux, subsys.exec-sandbox.sandbox-seatbelt, config.approval-sandbox]
evidence: explicit
status: verified
updated: 5670360009
---

> `codex_network_proxy` 是 Codex 的 managed network control crate：crate root re-export config/domain policy types、MITM hook config types、runtime state、proxy builder/handle、proxy env constants、blocked request types 和 network policy decider types。[E: codex-rs/network-proxy/src/lib.rs:19][E: codex-rs/network-proxy/src/lib.rs:21][E: codex-rs/network-proxy/src/lib.rs:25][E: codex-rs/network-proxy/src/lib.rs:29][E: codex-rs/network-proxy/src/lib.rs:32][E: codex-rs/network-proxy/src/lib.rs:34][E: codex-rs/network-proxy/src/lib.rs:47][E: codex-rs/network-proxy/src/lib.rs:51][E: codex-rs/network-proxy/src/lib.rs:62][E: codex-rs/network-proxy/src/lib.rs:70]

## 能回答的问题

- network proxy config 的 allow/deny/default mode 怎样表达？
- host block decision 的顺序是什么？
- runtime config 怎样被 constraints 校验？
- MITM hooks 怎样配置、编译和参与 HTTPS enforcement？
- proxy builder 怎样选择 listen address 并注入 HTTP_PROXY/HTTPS_PROXY/NO_PROXY？
- sandbox network policy 怎样通过 public decider types 与 crate-private evaluator 协作？

## Config 与 policy model

`NetworkProxyConfig` 保存 `network: NetworkProxySettings`；`NetworkProxySettings` 字段包括 enabled、proxy_url、socks_url、upstream flags、non-loopback override、Unix socket flags、mode、domains、unix_sockets、allow_local_binding、mitm 和 mitm_hooks，不包含 audit 字段。[E: codex-rs/network-proxy/src/config.rs:19][E: codex-rs/network-proxy/src/config.rs:19][E: codex-rs/network-proxy/src/config.rs:121][E: codex-rs/network-proxy/src/config.rs:121][E: codex-rs/network-proxy/src/config.rs:123][E: codex-rs/network-proxy/src/config.rs:126][E: codex-rs/network-proxy/src/config.rs:128][E: codex-rs/network-proxy/src/config.rs:130][E: codex-rs/network-proxy/src/config.rs:132][E: codex-rs/network-proxy/src/config.rs:134][E: codex-rs/network-proxy/src/config.rs:136][E: codex-rs/network-proxy/src/config.rs:138][E: codex-rs/network-proxy/src/config.rs:140][E: codex-rs/network-proxy/src/config.rs:141][E: codex-rs/network-proxy/src/config.rs:143][E: codex-rs/network-proxy/src/config.rs:145]

`MitmHookConfig` 配置字段是 host、matcher 和 actions；matcher 支持 methods、path_prefixes、query、headers 和预留 body，actions 支持 strip_request_headers 与 inject_request_headers，injected header 可从 env var 或 file 取 secret 并加 prefix。[E: codex-rs/network-proxy/src/mitm_hook.rs:27][E: codex-rs/network-proxy/src/mitm_hook.rs:27][E: codex-rs/network-proxy/src/mitm_hook.rs:28][E: codex-rs/network-proxy/src/mitm_hook.rs:30][E: codex-rs/network-proxy/src/mitm_hook.rs:32][E: codex-rs/network-proxy/src/mitm_hook.rs:37][E: codex-rs/network-proxy/src/mitm_hook.rs:37][E: codex-rs/network-proxy/src/mitm_hook.rs:38][E: codex-rs/network-proxy/src/mitm_hook.rs:39][E: codex-rs/network-proxy/src/mitm_hook.rs:40][E: codex-rs/network-proxy/src/mitm_hook.rs:41][E: codex-rs/network-proxy/src/mitm_hook.rs:42][E: codex-rs/network-proxy/src/mitm_hook.rs:47][E: codex-rs/network-proxy/src/mitm_hook.rs:47][E: codex-rs/network-proxy/src/mitm_hook.rs:48][E: codex-rs/network-proxy/src/mitm_hook.rs:49][E: codex-rs/network-proxy/src/mitm_hook.rs:54][E: codex-rs/network-proxy/src/mitm_hook.rs:55][E: codex-rs/network-proxy/src/mitm_hook.rs:56][E: codex-rs/network-proxy/src/mitm_hook.rs:57][E: codex-rs/network-proxy/src/mitm_hook.rs:58]

`NetworkDomainPermission` 的 variant order 是 `None < Allow < Deny`；`effective_entries()` 在相同 pattern 冲突时保留更高 permission，因此 deny 覆盖 allow。[E: codex-rs/network-proxy/src/config.rs:24][E: codex-rs/network-proxy/src/config.rs:25][E: codex-rs/network-proxy/src/config.rs:28][E: codex-rs/network-proxy/src/config.rs:28][E: codex-rs/network-proxy/src/config.rs:84][E: codex-rs/network-proxy/src/config.rs:87][E: codex-rs/network-proxy/src/config.rs:88] `NetworkMode::Full` 允许所有 method，`NetworkMode::Limited` 只允许 GET/HEAD/OPTIONS。[E: codex-rs/network-proxy/src/config.rs:276][E: codex-rs/network-proxy/src/config.rs:277][E: codex-rs/network-proxy/src/config.rs:281][E: codex-rs/network-proxy/src/config.rs:284][E: codex-rs/network-proxy/src/config.rs:288][E: codex-rs/network-proxy/src/config.rs:290][E: codex-rs/network-proxy/src/config.rs:291]

domain pattern code 会 normalize host、识别 loopback/non-public IP、编译 allowlist/denylist globset，并拒绝 denylist global wildcard。[E: codex-rs/network-proxy/src/policy.rs:21][E: codex-rs/network-proxy/src/policy.rs:33][E: codex-rs/network-proxy/src/policy.rs:45][E: codex-rs/network-proxy/src/policy.rs:101][E: codex-rs/network-proxy/src/policy.rs:161][E: codex-rs/network-proxy/src/policy.rs:165][E: codex-rs/network-proxy/src/policy.rs:176]

## Runtime state 与 blocking

`NetworkProxyState` 保存 config state、config reloader、blocked request observer 和 audit metadata；audit metadata 是 runtime state 的一部分，而不是 config settings 字段。[E: codex-rs/network-proxy/src/runtime.rs:206][E: codex-rs/network-proxy/src/runtime.rs:207][E: codex-rs/network-proxy/src/runtime.rs:208][E: codex-rs/network-proxy/src/runtime.rs:209][E: codex-rs/network-proxy/src/runtime.rs:210]

`host_blocked` 的 decision order 是 explicit deny、local/private networking opt-in、allowlist enforcement。[E: codex-rs/network-proxy/src/runtime.rs:355][E: codex-rs/network-proxy/src/runtime.rs:376][E: codex-rs/network-proxy/src/runtime.rs:377][E: codex-rs/network-proxy/src/runtime.rs:378][E: codex-rs/network-proxy/src/runtime.rs:379][E: codex-rs/network-proxy/src/runtime.rs:380][E: codex-rs/network-proxy/src/runtime.rs:385][E: codex-rs/network-proxy/src/runtime.rs:425] DNS lookup failure/timeout 只有在 `allow_local_binding` 为 false 且进入 local/private IP 检查时才会导致 block。[E: codex-rs/network-proxy/src/runtime.rs:385][E: codex-rs/network-proxy/src/runtime.rs:409][E: codex-rs/network-proxy/src/runtime.rs:763][E: codex-rs/network-proxy/src/runtime.rs:771][E: codex-rs/network-proxy/src/runtime.rs:777]

blocked request 会 push 到 capped ring buffer、递增 blocked_total、保持最多 200 条并通知 observer。[E: codex-rs/network-proxy/src/runtime.rs:43][E: codex-rs/network-proxy/src/runtime.rs:432][E: codex-rs/network-proxy/src/runtime.rs:434][E: codex-rs/network-proxy/src/runtime.rs:435][E: codex-rs/network-proxy/src/runtime.rs:445][E: codex-rs/network-proxy/src/runtime.rs:446][E: codex-rs/network-proxy/src/runtime.rs:448][E: codex-rs/network-proxy/src/runtime.rs:461][E: codex-rs/network-proxy/src/runtime.rs:462]

Unix socket allowance 只支持 macOS；runtime 要求 request path 是 absolute，canonicalization 是 best-effort，用于 symlink 比较，canonicalize 失败时仍保留 raw absolute path comparison。[E: codex-rs/network-proxy/src/runtime.rs:485][E: codex-rs/network-proxy/src/runtime.rs:487][E: codex-rs/network-proxy/src/runtime.rs:491][E: codex-rs/network-proxy/src/runtime.rs:494][E: codex-rs/network-proxy/src/runtime.rs:503][E: codex-rs/network-proxy/src/runtime.rs:504][E: codex-rs/network-proxy/src/runtime.rs:508][E: codex-rs/network-proxy/src/runtime.rs:519][E: codex-rs/network-proxy/src/runtime.rs:523][E: codex-rs/network-proxy/src/runtime.rs:528][E: codex-rs/network-proxy/src/runtime.rs:745][E: codex-rs/network-proxy/src/runtime.rs:746]

## State validation 与 proxy process

`build_config_state` 校验 Unix socket allowlist paths，提取 allowed/denied domains，拒绝 denied global wildcard，编译 deny/allow globsets，编译 MITM hooks，并按 `network.mitm` 构造 optional MITM state。[E: codex-rs/network-proxy/src/state.rs:64][E: codex-rs/network-proxy/src/state.rs:68][E: codex-rs/network-proxy/src/state.rs:69][E: codex-rs/network-proxy/src/state.rs:70][E: codex-rs/network-proxy/src/state.rs:71][E: codex-rs/network-proxy/src/state.rs:73][E: codex-rs/network-proxy/src/state.rs:74][E: codex-rs/network-proxy/src/state.rs:75][E: codex-rs/network-proxy/src/state.rs:76][E: codex-rs/network-proxy/src/state.rs:89] `validate_policy_against_constraints` 校验 enabled、mode、upstream proxy、non-loopback proxy、all Unix sockets、local binding、allowlist/denylist、Unix socket constraints 和 MITM hook config。[E: codex-rs/network-proxy/src/state.rs:86][E: codex-rs/network-proxy/src/state.rs:127][E: codex-rs/network-proxy/src/state.rs:132][E: codex-rs/network-proxy/src/state.rs:146][E: codex-rs/network-proxy/src/state.rs:165][E: codex-rs/network-proxy/src/state.rs:184][E: codex-rs/network-proxy/src/state.rs:202][E: codex-rs/network-proxy/src/state.rs:216][E: codex-rs/network-proxy/src/state.rs:303][E: codex-rs/network-proxy/src/state.rs:350][E: codex-rs/network-proxy/src/state.rs:388][E: codex-rs/network-proxy/src/state.rs:390]

MITM hook validation 要求 `network.mitm_hooks` 只能在 `network.mitm = true` 时使用，且 methods/path_prefixes 不能为空，body matcher 当前保留未支持；编译结果按 normalized host 存入 `MitmHooksByHost`，runtime 提供 `evaluate_mitm_hooks` 和 `host_has_mitm_hooks` 查询。[E: codex-rs/network-proxy/src/mitm_hook.rs:172][E: codex-rs/network-proxy/src/mitm_hook.rs:178][E: codex-rs/network-proxy/src/mitm_hook.rs:186][E: codex-rs/network-proxy/src/mitm_hook.rs:189][E: codex-rs/network-proxy/src/mitm_hook.rs:195][E: codex-rs/network-proxy/src/mitm_hook.rs:199][E: codex-rs/network-proxy/src/mitm_hook.rs:206][E: codex-rs/network-proxy/src/mitm_hook.rs:231][E: codex-rs/network-proxy/src/mitm_hook.rs:277][E: codex-rs/network-proxy/src/runtime.rs:599][E: codex-rs/network-proxy/src/runtime.rs:602][E: codex-rs/network-proxy/src/runtime.rs:605]

`NetworkProxyBuilder::build` 要求 state 存在并设置 blocked observer；managed_by_codex 时，非 Windows 保留 loopback ephemeral listeners，Windows 优先尝试 managed loopback ports，端口占用时 fallback 到 ephemeral loopback ports。[E: codex-rs/network-proxy/src/proxy.rs:167][E: codex-rs/network-proxy/src/proxy.rs:173][E: codex-rs/network-proxy/src/proxy.rs:177][E: codex-rs/network-proxy/src/proxy.rs:188][E: codex-rs/network-proxy/src/proxy.rs:193][E: codex-rs/network-proxy/src/proxy.rs:195][E: codex-rs/network-proxy/src/proxy.rs:252][E: codex-rs/network-proxy/src/proxy.rs:257][E: codex-rs/network-proxy/src/proxy.rs:259][E: codex-rs/network-proxy/src/proxy.rs:283]

`apply_proxy_env_overrides` 写入 proxy active/local-binding env、HTTP/HTTPS/websocket proxy vars、NO_PROXY、ALL_PROXY/FTP proxy；macOS 且 socks enabled 时会设置 `GIT_SSH_COMMAND`，但保留非 Codex 已有 SSH wrapper。[E: codex-rs/network-proxy/src/proxy.rs:486][E: codex-rs/network-proxy/src/proxy.rs:496][E: codex-rs/network-proxy/src/proxy.rs:507][E: codex-rs/network-proxy/src/proxy.rs:532][E: codex-rs/network-proxy/src/proxy.rs:537][E: codex-rs/network-proxy/src/proxy.rs:549][E: codex-rs/network-proxy/src/proxy.rs:550][E: codex-rs/network-proxy/src/proxy.rs:551][E: codex-rs/network-proxy/src/proxy.rs:557][E: codex-rs/network-proxy/src/proxy.rs:558][E: codex-rs/network-proxy/src/proxy.rs:562][E: codex-rs/network-proxy/src/proxy.rs:563][E: codex-rs/network-proxy/src/proxy.rs:565][E: codex-rs/network-proxy/src/proxy.rs:567]

`NetworkProxy` public methods 包括 builder、addresses、current config、domain mutation、runtime accessors、env application、config replacement 和 run；`run` skips listeners when `network.enabled` is false and otherwise spawns HTTP and optional SOCKS tasks.[E: codex-rs/network-proxy/src/proxy.rs:595][E: codex-rs/network-proxy/src/proxy.rs:596][E: codex-rs/network-proxy/src/proxy.rs:600][E: codex-rs/network-proxy/src/proxy.rs:604][E: codex-rs/network-proxy/src/proxy.rs:608][E: codex-rs/network-proxy/src/proxy.rs:612][E: codex-rs/network-proxy/src/proxy.rs:616][E: codex-rs/network-proxy/src/proxy.rs:620][E: codex-rs/network-proxy/src/proxy.rs:624][E: codex-rs/network-proxy/src/proxy.rs:628][E: codex-rs/network-proxy/src/proxy.rs:643][E: codex-rs/network-proxy/src/proxy.rs:647][E: codex-rs/network-proxy/src/proxy.rs:657][E: codex-rs/network-proxy/src/proxy.rs:697][E: codex-rs/network-proxy/src/proxy.rs:699][E: codex-rs/network-proxy/src/proxy.rs:700][E: codex-rs/network-proxy/src/proxy.rs:717][E: codex-rs/network-proxy/src/proxy.rs:727][E: codex-rs/network-proxy/src/proxy.rs:732]

HTTP/SOCKS CONNECT enforcement 会把 `host_has_mitm_hooks` 纳入是否必须 MITM 的判断：limited mode 或 hooked host 需要 MITM，若无法 MITM 则阻断并记录 reason。[E: codex-rs/network-proxy/src/http_proxy.rs:263][E: codex-rs/network-proxy/src/http_proxy.rs:270][E: codex-rs/network-proxy/src/http_proxy.rs:310][E: codex-rs/network-proxy/src/socks5.rs:319][E: codex-rs/network-proxy/src/socks5.rs:334][E: codex-rs/network-proxy/src/socks5.rs:335][E: codex-rs/network-proxy/src/socks5.rs:370]

## Sandbox policy evaluator

`network_policy.rs` 的 public types 包括 protocol、policy decision、decision source、request args/request、decision result 和 `NetworkPolicyDecider` trait。[E: codex-rs/network-proxy/src/network_policy.rs:23][E: codex-rs/network-proxy/src/network_policy.rs:43][E: codex-rs/network-proxy/src/network_policy.rs:59][E: codex-rs/network-proxy/src/network_policy.rs:78][E: codex-rs/network-proxy/src/network_policy.rs:89][E: codex-rs/network-proxy/src/network_policy.rs:126][E: codex-rs/network-proxy/src/network_policy.rs:126][E: codex-rs/network-proxy/src/network_policy.rs:270][E: codex-rs/network-proxy/src/network_policy.rs:271] `evaluate_host_policy` 本身是 `pub(crate)`，不是 crate root re-export 的 public API；crate root 只 re-export `NetworkDecision`/`NetworkDecisionSource`/`NetworkPolicyDecider`/`NetworkPolicyDecision`/`NetworkPolicyRequest`/`NetworkPolicyRequestArgs`/`NetworkProtocol` 等 public types。[E: codex-rs/network-proxy/src/network_policy.rs:293][E: codex-rs/network-proxy/src/lib.rs:34][E: codex-rs/network-proxy/src/lib.rs:35][E: codex-rs/network-proxy/src/lib.rs:36][E: codex-rs/network-proxy/src/lib.rs:37][E: codex-rs/network-proxy/src/lib.rs:38][E: codex-rs/network-proxy/src/lib.rs:39][E: codex-rs/network-proxy/src/lib.rs:40][E: codex-rs/network-proxy/src/lib.rs:41]

crate-private `evaluate_host_policy` 先调用 `host_blocked`；只有 `HostBlockReason::NotAllowed` 且 decider 存在时会调用 optional decider，其它 baseline blocked reasons 直接 deny；最后记录 domain policy audit event。[E: codex-rs/network-proxy/src/network_policy.rs:294][E: codex-rs/network-proxy/src/network_policy.rs:298][E: codex-rs/network-proxy/src/network_policy.rs:299][E: codex-rs/network-proxy/src/network_policy.rs:300][E: codex-rs/network-proxy/src/network_policy.rs:301][E: codex-rs/network-proxy/src/network_policy.rs:302][E: codex-rs/network-proxy/src/network_policy.rs:303][E: codex-rs/network-proxy/src/network_policy.rs:305][E: codex-rs/network-proxy/src/network_policy.rs:307][E: codex-rs/network-proxy/src/network_policy.rs:310][E: codex-rs/network-proxy/src/network_policy.rs:316][E: codex-rs/network-proxy/src/network_policy.rs:317][E: codex-rs/network-proxy/src/network_policy.rs:346][E: codex-rs/network-proxy/src/network_policy.rs:350][E: codex-rs/network-proxy/src/network_policy.rs:351][E: codex-rs/network-proxy/src/network_policy.rs:358]

## 设计动机与权衡

Network proxy 同时暴露 config validation、MITM hook config/runtime evaluation、runtime dynamic updates、proxy env injection 和 network policy decider interface，说明它既是本地代理进程配置层，也是 sandbox/network enforcement 的共享决策层。[I] 该设计由 `build_config_state`、MITM hook compile/evaluate、`NetworkProxyState`、`NetworkProxy` 和 `NetworkPolicyDecider` 共同体现。[E: codex-rs/network-proxy/src/state.rs:64][E: codex-rs/network-proxy/src/mitm_hook.rs:231][E: codex-rs/network-proxy/src/mitm_hook.rs:244][E: codex-rs/network-proxy/src/runtime.rs:206][E: codex-rs/network-proxy/src/proxy.rs:595][E: codex-rs/network-proxy/src/proxy.rs:608][E: codex-rs/network-proxy/src/proxy.rs:612][E: codex-rs/network-proxy/src/proxy.rs:643][E: codex-rs/network-proxy/src/proxy.rs:697][E: codex-rs/network-proxy/src/network_policy.rs:270]

deny permission rank 高于 allow，能让 managed denylist 在同一 domain 同时出现在 allow/deny 时保持保守。[I] 该结论由 `NetworkDomainPermission` ordering 和 `effective_entries` 更新逻辑共同支撑。[E: codex-rs/network-proxy/src/config.rs:24][E: codex-rs/network-proxy/src/config.rs:25][E: codex-rs/network-proxy/src/config.rs:84][E: codex-rs/network-proxy/src/config.rs:87][E: codex-rs/network-proxy/src/config.rs:88]

## Gotchas

- global wildcard deny pattern 会被 pattern compiler/constraint validation 拒绝，避免 denylist 变成不可恢复的全局 deny。[E: codex-rs/network-proxy/src/policy.rs:172][E: codex-rs/network-proxy/src/policy.rs:176][E: codex-rs/network-proxy/src/state.rs:128][E: codex-rs/network-proxy/src/state.rs:314][E: codex-rs/network-proxy/src/state.rs:315]
- loopback/private host 默认受 opt-in 逻辑影响；显式本地 allowlist 不接受 wildcard。[E: codex-rs/network-proxy/src/runtime.rs:379][E: codex-rs/network-proxy/src/runtime.rs:794][E: codex-rs/network-proxy/src/runtime.rs:798]
- `network.mitm_hooks` 要求 `network.mitm = true`；body matcher 当前是 reserved path，会被 validation 拒绝。[E: codex-rs/network-proxy/src/mitm_hook.rs:178][E: codex-rs/network-proxy/src/mitm_hook.rs:203][E: codex-rs/network-proxy/src/mitm_hook.rs:206]
- environment injection 只有在 macOS 且 socks enabled 时才注入 Codex fallback `GIT_SSH_COMMAND`，并会保留非 Codex 已有命令。[E: codex-rs/network-proxy/src/proxy.rs:557][E: codex-rs/network-proxy/src/proxy.rs:558][E: codex-rs/network-proxy/src/proxy.rs:562][E: codex-rs/network-proxy/src/proxy.rs:563][E: codex-rs/network-proxy/src/proxy.rs:565][E: codex-rs/network-proxy/src/proxy.rs:567]

## Sources

- `codex-rs/network-proxy/src/lib.rs`
- `codex-rs/network-proxy/src/config.rs`
- `codex-rs/network-proxy/src/runtime.rs`
- `codex-rs/network-proxy/src/policy.rs`
- `codex-rs/network-proxy/src/state.rs`
- `codex-rs/network-proxy/src/proxy.rs`
- `codex-rs/network-proxy/src/network_policy.rs`
- `codex-rs/network-proxy/src/mitm_hook.rs`
- `codex-rs/network-proxy/src/http_proxy.rs`
- `codex-rs/network-proxy/src/socks5.rs`

## 相关

- `subsys.exec-sandbox.sandbox-linux`: Linux sandbox managed network route integration。
- `subsys.exec-sandbox.sandbox-seatbelt`: macOS Seatbelt network policy integration。
- `config.approval-sandbox`: network proxy 与 sandbox/approval policy 的配置关系。
