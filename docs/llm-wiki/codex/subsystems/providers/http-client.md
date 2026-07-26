---
id: subsys.providers.http-client
title: HTTP client、proxy route 与 redirect
kind: subsystem
tier: T2
source: [codex-rs/http-client/src/client.rs, codex-rs/http-client/src/client_builder.rs, codex-rs/http-client/src/outbound_proxy.rs, codex-rs/http-client/src/route_aware_client_pool.rs, codex-rs/http-client/src/route_aware_redirect.rs, codex-rs/http-client/src/request.rs, codex-rs/http-client/src/transport.rs, codex-rs/codex-client/src/retry.rs, codex-rs/backend-client/src/client.rs]
symbols: [HttpClient, HttpClientBuilder, HttpClientFactory, OutboundProxyPolicy, OutboundProxyRoute, ClientRouteClass, RouteAwareClientPool, RouteAwareRequestBuilder, HttpTransport]
related: [subsys.providers.overview, subsys.providers.responses-api, subsys.providers.retry-errors, subsys.providers.auth-layer, subsys.platform.network-proxy, subsys.core.code-mode-runtime]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `codex-http-client` 不再只有一个默认 reqwest wrapper。应用先解析 `OutboundProxyPolicy`，固定目标可由 `HttpClientFactory` 构建 client；目标或 redirect 会变化的调用方必须走 `RouteAwareClientPool`，让每个 URL/hop 都按自己的 system/PAC/env route 选择或复用 transport client。

## 分层

| 层 | 职责 |
|---|---|
| `HttpClient` | reqwest wrapper、trace header 与可关闭的 request diagnostics；产品调用方应由 factory/pool 获得实例。[E: codex-rs/http-client/src/client.rs:18][E: codex-rs/http-client/src/client.rs:40][E: codex-rs/http-client/src/client.rs:114] |
| `HttpClientBuilder` | TLS、redirect、timeout、UA 等构造选项，并针对已解析 route 构造 client。[E: codex-rs/http-client/src/client_builder.rs:19][E: codex-rs/http-client/src/client_builder.rs:62] |
| `HttpClientFactory` | 保存一次解析出的 outbound proxy policy，并按目标 URL 解析 `TransportDefault`、`Direct` 或 `Proxy` route。[E: codex-rs/http-client/src/outbound_proxy.rs:141][E: codex-rs/http-client/src/outbound_proxy.rs:170] |
| `RouteAwareClientPool` | 按 `OutboundProxyRoute` 缓存最多 16 个 client；每个 request URL 与每个 redirect hop 独立解析 route。[E: codex-rs/http-client/src/route_aware_client_pool.rs:33][E: codex-rs/http-client/src/route_aware_client_pool.rs:45] |
| `HttpTransport` / retry | 通用 prepared request 的 execute/stream boundary 与 codex-client 的重试策略；不负责 provider auth 或 route policy。[E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/codex-client/src/retry.rs:8] |

`default_client.rs` 已被重构为 `client.rs`；继续引用旧文件会把普通 wrapper 和新 route policy 混成一个层次。[I]

## Proxy policy

`HttpClientFactory` 对 WebSocket URL 用对应 HTTP scheme 解析 proxy，使 `ws/wss` 与 `http/https` 能复用平台 PAC/system proxy 规则；system resolution 不可用时，显式 environment 设置优先，最后 direct。[E: codex-rs/http-client/src/outbound_proxy.rs:156][E: codex-rs/http-client/src/outbound_proxy.rs:170]

route class 让 builder 区分一般 product traffic 与本地/internal exceptions；直接构造 reqwest client 的路径是少数显式 legacy/direct 边界，不应被概括成全局绕过策略。[E: codex-rs/http-client/src/client_builder.rs:99][E: codex-rs/http-client/src/client_builder.rs:187][I]

system-proxy resolution 另有独立的 URL decision cache，不等于 pool 的 16-route client cache。key 是 URL-specific SHA-256，不保存 raw URL；Direct/Proxy 缓存 60 秒，Unavailable 缓存 5 秒，容量最多 256，过期时清理、满时逐出最早到期项，cache miss 在 mutex 内 single-flight。[E: codex-rs/http-client/src/outbound_proxy.rs:24][E: codex-rs/http-client/src/outbound_proxy.rs:28][E: codex-rs/http-client/src/outbound_proxy.rs:468][E: codex-rs/http-client/src/outbound_proxy.rs:495][E: codex-rs/http-client/src/outbound_proxy.rs:524][E: codex-rs/http-client/src/outbound_proxy.rs:600]

## Route-aware request 与 redirect

pool 在发送前解析当前 URL，按 resolved route 复用/新建 client；route cache 满 16 项时逐出一个已有 route。[E: codex-rs/http-client/src/route_aware_client_pool.rs:389][E: codex-rs/http-client/src/route_aware_client_pool.rs:402][E: codex-rs/http-client/src/route_aware_client_pool.rs:520][E: codex-rs/http-client/src/route_aware_client_pool.rs:565]

当 policy 是 `RespectSystemProxy` 且 builder 允许 redirect 时，pool 关闭 reqwest 自动 redirect，并对 valid、可 replay 的 redirect 逐 hop 手工执行：

1. 为 redirect target 重新解析 route；
2. route 改变时移除 `Proxy-Authorization`；
3. 跨 origin 清理 sensitive headers，并按规则设置 Referer；
4. 拒绝非 HTTP(S) target，限制 redirect 次数；
5. 一个 request timeout deadline 覆盖 route resolution、建连、所有 hops 与最终响应。[E: codex-rs/http-client/src/route_aware_client_pool.rs:414][E: codex-rs/http-client/src/route_aware_client_pool.rs:455][E: codex-rs/http-client/src/route_aware_client_pool.rs:496][E: codex-rs/http-client/src/route_aware_client_pool.rs:516]

若 `Location` 缺失/invalid，或 307/308 等保留 body 的 redirect 无法 `try_clone()` 原请求，`redirect_request` 返回 `None`，pool 会把原 redirect response 交给 caller，而不是强行继续下一 hop。[E: codex-rs/http-client/src/route_aware_redirect.rs:44][E: codex-rs/http-client/src/route_aware_redirect.rs:49][E: codex-rs/http-client/src/route_aware_redirect.rs:93][E: codex-rs/http-client/src/route_aware_client_pool.rs:490][E: codex-rs/http-client/src/route_aware_client_pool.rs:502]

这意味着“同一次逻辑请求”不等于“固定使用初始 proxy”：redirect 目标可命中另一条 PAC/system route，但总 timeout budget 不重置。[I]

## Request body、transport 与 retry

通用 `Request` 仍可在发送前把 JSON 序列化/可选 zstd 压缩成可复用 bytes；raw body 不能请求该 compression。prepared clone 让 retry 与 request-signing 看见相同 bytes。[E: codex-rs/http-client/src/request.rs:118][E: codex-rs/http-client/src/request.rs:147][E: codex-rs/http-client/src/request.rs:156][E: codex-rs/http-client/src/request.rs:161]

`HttpTransport` 将非 success status、timeout、network 与 build error 映射为 transport error；`codex-client` 的 `RetryPolicy` 再按 429、5xx、transport flags 与 attempt budget 决定是否重试。[E: codex-rs/http-client/src/transport.rs:25][E: codex-rs/http-client/src/transport.rs:30][E: codex-rs/codex-client/src/retry.rs:9][E: codex-rs/codex-client/src/retry.rs:32]

## 边界与不确定性

- system proxy 支持受 feature/platform 与 application-resolved policy 控制；存在代码路径不代表所有构建默认启用。[U]
- PAC resolver 返回 ordered candidates 时，当前 policy 只折叠为一条 route；该 route 连接失败不会继续尝试后续 proxy 或 `DIRECT` candidate。[E: codex-rs/http-client/src/outbound_proxy.rs:357][E: codex-rs/http-client/src/outbound_proxy.rs:368]
- route-aware pool 解决的是 destination→transport route 一致性，不替代 network sandbox/proxy 的 allow/deny/ask policy。[I]
- backend-client 仍有自己的 typed API/path/auth layer；本节点不把它等同于 provider generic transport。[E: codex-rs/backend-client/src/client.rs:128][I]

## Sources

- `codex-rs/http-client/src/client.rs`
- `codex-rs/http-client/src/client_builder.rs`
- `codex-rs/http-client/src/outbound_proxy.rs`
- `codex-rs/http-client/src/route_aware_client_pool.rs`
- `codex-rs/http-client/src/route_aware_redirect.rs`
- `codex-rs/http-client/src/request.rs`
- `codex-rs/http-client/src/transport.rs`
- `codex-rs/codex-client/src/retry.rs`
- `codex-rs/backend-client/src/client.rs`

## 相关

- [Network proxy](../platform/network-proxy.md)
- [Code Mode runtime](../core/code-mode-runtime.md)
- [Provider overview](overview.md)
