---
id: subsys.auth
path: subsystems/auth.md
title: 认证与安全存储
kind: subsystem
tier: T2
source: [services/oauth/, utils/secureStorage/, utils/auth.ts]
symbols: [getAuthTokenSource, getAnthropicApiKeyWithSource, OAuthService, secureStorage]
related: []
status: verified
evidence: explicit
updated: 2026-06-14
---

> 认证子系统在 API key、OAuth token、apiKeyHelper、FD/env token、managed OAuth 和 secure storage 之间做 source selection, 并通过 OAuth service 与 keychain/plaintext fallback 保存长期凭据。[E: utils/auth.ts:164][E: utils/auth.ts:168][E: utils/auth.ts:173][E: utils/auth.ts:195][E: utils/auth.ts:200][E: utils/auth.ts:235][E: utils/auth.ts:258][E: utils/auth.ts:321][E: utils/auth.ts:339][E: services/oauth/index.ts:21][E: utils/secureStorage/index.ts:11]

## 能回答的问题

- Claude Code 如何决定使用 API key、OAuth token、apiKeyHelper 或 managed OAuth?
- OAuth PKCE 登录、token exchange、refresh 和 profile fetch 在哪里实现?
- macOS Keychain 与 plaintext fallback 的行为是什么?
- OAuth 401 或 token 过期时如何跨进程刷新?

## 职责边界

`utils/auth.ts` 是 source-selection 与 token lifecycle 层: 它判断 Anthropic auth 是否启用, 决定 token/API key source, 读写 OAuth tokens, 刷新过期 token, 并处理 401 恢复。[E: utils/auth.ts:100][E: utils/auth.ts:153][E: utils/auth.ts:1194][E: utils/auth.ts:1427] `services/oauth/` 是 protocol 层: 它负责 PKCE/state、localhost listener、auth URL、code exchange、refresh 和 profile/API key endpoint。[E: services/oauth/crypto.ts:11][E: services/oauth/auth-code-listener.ts:37][E: services/oauth/client.ts:46][E: services/oauth/client.ts:107][E: services/oauth/client.ts:146]

`utils/secureStorage/` 是 persistence layer: macOS 使用 Keychain primary + plaintext fallback, 非 macOS 直接使用 plaintext storage。[E: utils/secureStorage/index.ts:11][E: utils/secureStorage/index.ts:16]

## 关键文件

- `utils/auth.ts`: auth enablement、source priority、apiKeyHelper cache、legacy API key save/read、OAuth token save/read/refresh。[E: utils/auth.ts:102][E: utils/auth.ts:164][E: utils/auth.ts:195][E: utils/auth.ts:435][E: utils/auth.ts:1116][E: utils/auth.ts:1217][E: utils/auth.ts:1531]
- `services/oauth/index.ts`: high-level OAuth flow, 创建 listener、PKCE/state、URL、exchange、profile 和 success/error redirect。[E: services/oauth/index.ts:51][E: services/oauth/index.ts:55][E: services/oauth/index.ts:56][E: services/oauth/index.ts:69][E: services/oauth/index.ts:73][E: services/oauth/index.ts:94][E: services/oauth/index.ts:106][E: services/oauth/index.ts:111][E: services/oauth/index.ts:125]
- `services/oauth/client.ts`: build auth URL、exchange code、refresh token、fetch roles、create API key 和 expiry check。[E: services/oauth/client.ts:46][E: services/oauth/client.ts:107][E: services/oauth/client.ts:146][E: services/oauth/client.ts:276][E: services/oauth/client.ts:311][E: services/oauth/client.ts:315][E: services/oauth/client.ts:321][E: services/oauth/client.ts:344]
- `utils/secureStorage/macOsKeychainStorage.ts`: macOS `security` command read/update/delete, TTL cache, stale-on-error 和 keychain locked detection。[E: utils/secureStorage/macOsKeychainStorage.ts:30][E: utils/secureStorage/macOsKeychainStorage.ts:34][E: utils/secureStorage/macOsKeychainStorage.ts:57][E: utils/secureStorage/macOsKeychainStorage.ts:118][E: utils/secureStorage/macOsKeychainStorage.ts:159][E: utils/secureStorage/macOsKeychainStorage.ts:211]
- `utils/secureStorage/plainTextStorage.ts`: `.credentials.json` fallback, mkdir/write JSON/chmod 0600 和 warning。[E: utils/secureStorage/plainTextStorage.ts:15][E: utils/secureStorage/plainTextStorage.ts:49][E: utils/secureStorage/plainTextStorage.ts:57][E: utils/secureStorage/plainTextStorage.ts:61][E: utils/secureStorage/plainTextStorage.ts:64]

## 数据模型

auth token source 返回 enum-like source: env vars、file descriptors、apiKeyHelper、secure OAuth token 或 none; managed OAuth context 会影响 source selection。[E: utils/auth.ts:91][E: utils/auth.ts:153][E: utils/auth.ts:168][E: utils/auth.ts:173][E: utils/auth.ts:195][E: utils/auth.ts:200] API key source 另有优先级, 会处理 bare mode、homespace env ignore、third-party env、CI/test requirement、apiKeyHelper 和 keychain/config fallback。[E: utils/auth.ts:235][E: utils/auth.ts:252][E: utils/auth.ts:258][E: utils/auth.ts:265][E: utils/auth.ts:321][E: utils/auth.ts:339]

OAuth token 持久化只保存 ClaudeAI scope 的长期 token; inference-only 且没有 refresh/expiry 的 token 不会写入 secure storage。[E: utils/auth.ts:1198][E: utils/auth.ts:1204] secure storage 的 macOS fallback 会先尝试 primary Keychain, primary 成功且 `primaryDataBefore === null` 时删除 secondary stale copy, primary 失败时写 secondary。[E: utils/secureStorage/fallbackStorage.ts:29][E: utils/secureStorage/fallbackStorage.ts:31][E: utils/secureStorage/fallbackStorage.ts:33][E: utils/secureStorage/fallbackStorage.ts:37][E: utils/secureStorage/fallbackStorage.ts:38][E: utils/secureStorage/fallbackStorage.ts:43]

## 控制流

1. `isAnthropicAuthEnabled` 先处理 bare mode、Unix socket token、third-party env、apiKeyHelper 和 external API key source, 最后受 disable flag 影响。[E: utils/auth.ts:102][E: utils/auth.ts:111][E: utils/auth.ts:115][E: utils/auth.ts:122][E: utils/auth.ts:130][E: utils/auth.ts:148]
2. OAuth login 调用 `OAuthService.startOAuthFlow`, 启动 localhost listener, 生成 PKCE/state, build auth URL, 等待 code, exchange token, fetch profile, 最后返回 token/profile bundle。[E: services/oauth/index.ts:51][E: services/oauth/index.ts:55][E: services/oauth/index.ts:59][E: services/oauth/index.ts:73][E: services/oauth/index.ts:92][E: services/oauth/index.ts:106]
3. `saveOAuthTokensIfNeeded` 写 secure storage 中的 `claudeAiOauth` token/profile fields, 并清 token、betas 和 tool schema cache。[E: utils/auth.ts:1209][E: utils/auth.ts:1217][E: utils/auth.ts:1231][E: utils/auth.ts:1239][E: utils/auth.ts:1240][E: utils/auth.ts:1241]
4. `checkAndRefreshOAuthTokenIfNeeded` 会先做 disk staleness invalidation, 再用 lock 包住 refresh, 拿锁后重新检查 token, 调用 `refreshOAuthToken`, 保存新 token 并释放锁。[E: utils/auth.ts:1453][E: utils/auth.ts:1491][E: utils/auth.ts:1519][E: utils/auth.ts:1531][E: utils/auth.ts:1539][E: utils/auth.ts:1559]
5. 401 handler 会 dedupe 同类错误, 清 cache 后重读 token; 如果 keychain 已有新 token 则恢复, 否则强制 refresh。[E: utils/auth.ts:1363][E: utils/auth.ts:1369][E: utils/auth.ts:1377][E: utils/auth.ts:1378][E: utils/auth.ts:1385][E: utils/auth.ts:1391]

## 设计动机与权衡

auth 选择逻辑把 third-party/cloud env 与 Anthropic OAuth 分开, 避免在 Bedrock/Vertex/Foundry 等模式下误用 Anthropic auth。[E: utils/auth.ts:115][E: utils/auth.ts:130] macOS Keychain fallback 到 plaintext 是可用性权衡: primary update 失败时写 secondary, plaintext storage 会 chmod 0600 并输出 warning, keychain lock check 有缓存与非 macOS fast path。[E: utils/secureStorage/fallbackStorage.ts:43][E: utils/secureStorage/plainTextStorage.ts:61][E: utils/secureStorage/plainTextStorage.ts:64][E: utils/secureStorage/macOsKeychainStorage.ts:212][E: utils/secureStorage/macOsKeychainStorage.ts:214][E: utils/secureStorage/macOsKeychainStorage.ts:215][I]

跨进程 token staleness 通过 secure storage mtime/generation 与 lock 控制, 这降低多个 Claude Code 进程同时 refresh OAuth token 的风险。[E: utils/auth.ts:1320][E: utils/auth.ts:1491][I]

## Gotcha

- `CLAUDE_CODE_OAUTH_TOKEN` 和 FD token 是 inference-only token path, 与长期 ClaudeAI OAuth refresh token 不是同一种持久化语义。[E: utils/auth.ts:1260][E: utils/auth.ts:1273][E: utils/auth.ts:1198]
- `saveApiKey` 在 macOS 会先尝试 `security add-generic-password -i hex`, 失败才 fallback 写 global config。[E: utils/auth.ts:1104][E: utils/auth.ts:1116][E: utils/auth.ts:1118][E: utils/auth.ts:1124][E: utils/auth.ts:1141][E: utils/auth.ts:1146]
- OAuth token expiry check 有 5 分钟 buffer, 到期前就会被视为需要刷新。[E: services/oauth/client.ts:349][E: services/oauth/client.ts:351][E: services/oauth/client.ts:352]
- keychain prefetch 只在 darwin 且非 bare mode 启动, 并行预取 OAuth 与 legacy keychain 结果。[E: utils/secureStorage/keychainPrefetch.ts:70][E: utils/secureStorage/keychainPrefetch.ts:75][E: utils/secureStorage/keychainPrefetch.ts:78][E: utils/secureStorage/keychainPrefetch.ts:80]

## Sources

- `services/oauth/`
- `utils/secureStorage/`
- `utils/auth.ts`
- `services/oauth/index.ts`
- `services/oauth/client.ts`
- `services/oauth/auth-code-listener.ts`
- `services/oauth/crypto.ts`
- `services/oauth/getOauthProfile.ts`
- `utils/secureStorage/index.ts`
- `utils/secureStorage/macOsKeychainStorage.ts`
- `utils/secureStorage/plainTextStorage.ts`
- `utils/secureStorage/fallbackStorage.ts`
- `utils/secureStorage/keychainPrefetch.ts`

## 相关

- 无
