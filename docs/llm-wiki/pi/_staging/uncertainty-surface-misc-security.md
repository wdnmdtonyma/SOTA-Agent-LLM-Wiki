# uncertainty · surface.misc.security

- `[U]` `surface/misc/security.md` 的 HTTP 出站配置段只核到 CLI/RPC 入口调用 `configureHttpDispatcher()` 以及 `http-dispatcher.ts` 安装 undici `EnvHttpProxyAgent`。本轮没有逐个 provider SDK / wire implementation 验证所有网络请求都使用该 global dispatcher,所以该节点不能把 HTTP dispatcher 表述成完整网络隔离、出站 allowlist 或 egress firewall。
- `[I]` L2 核验时发现原文用 `agent-session-services.ts` 和 `main.ts` 证明默认 service wiring 与 CLI `--api-key` 注入,但这两个文件不在该节点 index source 中。正文已收窄为只用 `auth-storage.ts` / `model-registry.ts` 证明默认构造路径和 runtime API key 的内存覆盖行为;具体会话装配调用点留给包含对应 source 的节点核验。
