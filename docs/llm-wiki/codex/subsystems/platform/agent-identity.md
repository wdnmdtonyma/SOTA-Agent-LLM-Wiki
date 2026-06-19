---
id: subsys.platform.agent-identity
title: Agent identity
kind: subsystem
tier: T2
source: [codex-rs/agent-identity/src/lib.rs, codex-rs/install-context/src/lib.rs]
symbols: [AgentIdentityKey, ChatGptEnvironment, AgentIdentityJwtClaims, AgentBillOfMaterials, authorization_header_for_agent_task, fetch_agent_identity_jwks, decode_agent_identity_jwt, register_agent_task, register_agent_identity, generate_agent_key_material, InstallContext]
related: [subsys.config-auth.auth-flows, subsys.config-auth.credential-storage, subsys.cloud.cloud-tasks]
evidence: explicit
status: verified
updated: 5670360009
---

> Agent identity 子系统生成 Ed25519 agent key material，构造 task-scoped `AgentAssertion` authorization header，拉取并验证 agent identity JWT/JWKS，注册 agent/task，解密 encrypted task id，并通过 install context 判断 Codex binary 的安装来源与 bundled `rg` 选择。[E: codex-rs/agent-identity/src/lib.rs:229][E: codex-rs/agent-identity/src/lib.rs:244][E: codex-rs/agent-identity/src/lib.rs:263][E: codex-rs/agent-identity/src/lib.rs:312][E: codex-rs/agent-identity/src/lib.rs:355][E: codex-rs/agent-identity/src/lib.rs:408][E: codex-rs/agent-identity/src/lib.rs:422][E: codex-rs/install-context/src/lib.rs:68][E: codex-rs/install-context/src/lib.rs:123]

## 能回答的问题

- `AgentAssertion` header 的 payload、envelope 和签名覆盖哪些字段？
- agent task registration request/URL/timeout 怎样构造？
- agent private key material 怎样生成、编码和推导 SSH public key？
- Agent identity JWT 怎样按 ChatGPT environment、JWKS、audience 和 issuer 处理？
- encrypted task id 怎样由 Ed25519 signing key 派生 Curve25519 secret key 后解密？
- agent URLs 和 install context detection 的精确规则是什么？

## Agent identity 数据模型

`ChatGptEnvironment` 只有 Production 与 Staging；`from_chatgpt_base_url` 只接受 production/staging ChatGPT URL 及其 backend-api/codex 变体，`chatgpt_base_url()` 返回对应 backend-api base URL，`agent_identity_authapi_base_url()` 返回 auth API account base URL。[E: codex-rs/agent-identity/src/lib.rs:46][E: codex-rs/agent-identity/src/lib.rs:53][E: codex-rs/agent-identity/src/lib.rs:55][E: codex-rs/agent-identity/src/lib.rs:63][E: codex-rs/agent-identity/src/lib.rs:67][E: codex-rs/agent-identity/src/lib.rs:73][E: codex-rs/agent-identity/src/lib.rs:80]

`AgentIdentityKey` 字段是 agent_runtime_id 和 private_key_pkcs8_base64；注释明确它不包含 task id，因为 task id 只 scoped 到单次 Codex run，而 runtime id/private key 是可复用 identity material。[E: codex-rs/agent-identity/src/lib.rs:88][E: codex-rs/agent-identity/src/lib.rs:90][E: codex-rs/agent-identity/src/lib.rs:94][E: codex-rs/agent-identity/src/lib.rs:95][E: codex-rs/agent-identity/src/lib.rs:96]

`AgentBillOfMaterials` 字段是 agent_version、agent_harness_id 和 running_location；`GeneratedAgentKeyMaterial` 字段是 private_key_pkcs8_base64 和 public_key_ssh。[E: codex-rs/agent-identity/src/lib.rs:99][E: codex-rs/agent-identity/src/lib.rs:100][E: codex-rs/agent-identity/src/lib.rs:101][E: codex-rs/agent-identity/src/lib.rs:102][E: codex-rs/agent-identity/src/lib.rs:106][E: codex-rs/agent-identity/src/lib.rs:107][E: codex-rs/agent-identity/src/lib.rs:108]

`AgentIdentityJwtClaims` 字段覆盖 issuer/audience/time claims、agent runtime/private key、account/user/email/plan 和 FedRAMP account flag。[E: codex-rs/agent-identity/src/lib.rs:111][E: codex-rs/agent-identity/src/lib.rs:113][E: codex-rs/agent-identity/src/lib.rs:114][E: codex-rs/agent-identity/src/lib.rs:115][E: codex-rs/agent-identity/src/lib.rs:118][E: codex-rs/agent-identity/src/lib.rs:119][E: codex-rs/agent-identity/src/lib.rs:120][E: codex-rs/agent-identity/src/lib.rs:123][E: codex-rs/agent-identity/src/lib.rs:124]

`AgentAssertionEnvelope` 内部字段是 agent_runtime_id、task_id、timestamp 和 signature；serialize 时写出同名 JSON keys 并使用 URL-safe no-pad base64 编码。[E: codex-rs/agent-identity/src/lib.rs:127][E: codex-rs/agent-identity/src/lib.rs:128][E: codex-rs/agent-identity/src/lib.rs:129][E: codex-rs/agent-identity/src/lib.rs:130][E: codex-rs/agent-identity/src/lib.rs:131][E: codex-rs/agent-identity/src/lib.rs:528][E: codex-rs/agent-identity/src/lib.rs:529][E: codex-rs/agent-identity/src/lib.rs:530][E: codex-rs/agent-identity/src/lib.rs:531][E: codex-rs/agent-identity/src/lib.rs:532][E: codex-rs/agent-identity/src/lib.rs:533][E: codex-rs/agent-identity/src/lib.rs:536]

## Assertion 与 task registration

`authorization_header_for_agent_task` 接受 `AgentIdentityKey` 和 task id，生成 RFC3339 seconds timestamp、构造 envelope、签名 payload `agent_runtime_id:task_id:timestamp`，并返回 `AgentAssertion <base64url-json>` header；当前函数没有单独的 target runtime id 参数，也不执行 runtime id mismatch 校验。[E: codex-rs/agent-identity/src/lib.rs:229][E: codex-rs/agent-identity/src/lib.rs:230][E: codex-rs/agent-identity/src/lib.rs:231][E: codex-rs/agent-identity/src/lib.rs:233][E: codex-rs/agent-identity/src/lib.rs:234][E: codex-rs/agent-identity/src/lib.rs:238][E: codex-rs/agent-identity/src/lib.rs:240][E: codex-rs/agent-identity/src/lib.rs:241][E: codex-rs/agent-identity/src/lib.rs:518][E: codex-rs/agent-identity/src/lib.rs:524][E: codex-rs/agent-identity/src/lib.rs:525]

`fetch_agent_identity_jwks` 对 `agent_identity_jwks_url(base)` 发 GET、设置 10 秒 timeout、要求 successful status，并把响应 JSON 解成 `JwkSet`。[E: codex-rs/agent-identity/src/lib.rs:36][E: codex-rs/agent-identity/src/lib.rs:244][E: codex-rs/agent-identity/src/lib.rs:249][E: codex-rs/agent-identity/src/lib.rs:250][E: codex-rs/agent-identity/src/lib.rs:254][E: codex-rs/agent-identity/src/lib.rs:258][E: codex-rs/agent-identity/src/lib.rs:260] `decode_agent_identity_jwt` 在有 JWKS 时读取 JWT header kid、查 trusted JWK、用 RS256 validation 设置 audience `codex-app-server` 和 issuer `https://chatgpt.com/codex-backend/agent-identity`；没有 JWKS 时只 base64url decode payload JSON。[E: codex-rs/agent-identity/src/lib.rs:37][E: codex-rs/agent-identity/src/lib.rs:38][E: codex-rs/agent-identity/src/lib.rs:263][E: codex-rs/agent-identity/src/lib.rs:267][E: codex-rs/agent-identity/src/lib.rs:271][E: codex-rs/agent-identity/src/lib.rs:279][E: codex-rs/agent-identity/src/lib.rs:280][E: codex-rs/agent-identity/src/lib.rs:281][E: codex-rs/agent-identity/src/lib.rs:284][E: codex-rs/agent-identity/src/lib.rs:289][E: codex-rs/agent-identity/src/lib.rs:297][E: codex-rs/agent-identity/src/lib.rs:300]

`register_agent_task` 构造 timestamp/signature request body，POST 到 `agent_task_registration_url(agent_identity_authapi_base_url, key.agent_runtime_id)`，设置 30 秒 timeout，并以 JSON body 发送；registration signature payload 是 `agent_runtime_id:timestamp`。[E: codex-rs/agent-identity/src/lib.rs:35][E: codex-rs/agent-identity/src/lib.rs:303][E: codex-rs/agent-identity/src/lib.rs:308][E: codex-rs/agent-identity/src/lib.rs:309][E: codex-rs/agent-identity/src/lib.rs:312][E: codex-rs/agent-identity/src/lib.rs:317][E: codex-rs/agent-identity/src/lib.rs:318][E: codex-rs/agent-identity/src/lib.rs:319][E: codex-rs/agent-identity/src/lib.rs:322][E: codex-rs/agent-identity/src/lib.rs:324][E: codex-rs/agent-identity/src/lib.rs:326][E: codex-rs/agent-identity/src/lib.rs:327]

`register_agent_identity` POST 到 agent registration URL，body 包含 ABOM、public key、capabilities 和 `ttl: None`，使用 bearer token，FedRAMP account 时加 `X-OpenAI-Fedramp: true`，timeout 是 15 秒。[E: codex-rs/agent-identity/src/lib.rs:39][E: codex-rs/agent-identity/src/lib.rs:355][E: codex-rs/agent-identity/src/lib.rs:364][E: codex-rs/agent-identity/src/lib.rs:365][E: codex-rs/agent-identity/src/lib.rs:367][E: codex-rs/agent-identity/src/lib.rs:368][E: codex-rs/agent-identity/src/lib.rs:369][E: codex-rs/agent-identity/src/lib.rs:372][E: codex-rs/agent-identity/src/lib.rs:374][E: codex-rs/agent-identity/src/lib.rs:376][E: codex-rs/agent-identity/src/lib.rs:377][E: codex-rs/agent-identity/src/lib.rs:378]

registration response 优先接受 `task_id` 或 `taskId`；没有直接 task id 时读取 `encrypted_task_id` 或 `encryptedTaskId`，然后调用 decrypt path。[E: codex-rs/agent-identity/src/lib.rs:142][E: codex-rs/agent-identity/src/lib.rs:143][E: codex-rs/agent-identity/src/lib.rs:145][E: codex-rs/agent-identity/src/lib.rs:147][E: codex-rs/agent-identity/src/lib.rs:149][E: codex-rs/agent-identity/src/lib.rs:394][E: codex-rs/agent-identity/src/lib.rs:398][E: codex-rs/agent-identity/src/lib.rs:401][E: codex-rs/agent-identity/src/lib.rs:403][E: codex-rs/agent-identity/src/lib.rs:405]

encrypted task id decrypt path 会 base64 decode ciphertext，使用 signing key 派生的 Curve25519 secret key unseal ciphertext，再要求 plaintext 是 UTF-8；Curve25519 derivation 对 SHA-512 digest 前 32 bytes 做 Ed25519-to-X25519 clamping。[E: codex-rs/agent-identity/src/lib.rs:408][E: codex-rs/agent-identity/src/lib.rs:412][E: codex-rs/agent-identity/src/lib.rs:413][E: codex-rs/agent-identity/src/lib.rs:416][E: codex-rs/agent-identity/src/lib.rs:417][E: codex-rs/agent-identity/src/lib.rs:419][E: codex-rs/agent-identity/src/lib.rs:539][E: codex-rs/agent-identity/src/lib.rs:540][E: codex-rs/agent-identity/src/lib.rs:542][E: codex-rs/agent-identity/src/lib.rs:543][E: codex-rs/agent-identity/src/lib.rs:544][E: codex-rs/agent-identity/src/lib.rs:545]

## Key material 与 URLs

`generate_agent_key_material` 使用 OS RNG 填充 64 字节 seed material，再把 derivation context 与 seed material 经 SHA-512 派生 Ed25519 的 32 字节 seed；随后构造 signing key、编码 PKCS#8 DER 为 standard base64，并生成 SSH ed25519 public key。[E: codex-rs/agent-identity/src/lib.rs:42][E: codex-rs/agent-identity/src/lib.rs:43][E: codex-rs/agent-identity/src/lib.rs:422][E: codex-rs/agent-identity/src/lib.rs:423][E: codex-rs/agent-identity/src/lib.rs:425][E: codex-rs/agent-identity/src/lib.rs:428][E: codex-rs/agent-identity/src/lib.rs:429][E: codex-rs/agent-identity/src/lib.rs:430][E: codex-rs/agent-identity/src/lib.rs:432][E: codex-rs/agent-identity/src/lib.rs:434][E: codex-rs/agent-identity/src/lib.rs:440][E: codex-rs/agent-identity/src/lib.rs:441] public/verifying key helpers 都从 PKCS#8 base64 private key 恢复 signing key 后导出 public material。[E: codex-rs/agent-identity/src/lib.rs:445][E: codex-rs/agent-identity/src/lib.rs:448][E: codex-rs/agent-identity/src/lib.rs:449][E: codex-rs/agent-identity/src/lib.rs:452][E: codex-rs/agent-identity/src/lib.rs:455][E: codex-rs/agent-identity/src/lib.rs:456]

URL helpers 通过 trim trailing slash 后 format：agent registration 是 `/v1/agent/register`，agent task registration 是 `/v1/agent/{agent_runtime_id}/task/register`；JWKS URL 在 base 包含 `/backend-api` 时追加 `/wham/agent-identities/jwks`，否则追加 `/agent-identities/jwks`。[E: codex-rs/agent-identity/src/lib.rs:466][E: codex-rs/agent-identity/src/lib.rs:467][E: codex-rs/agent-identity/src/lib.rs:470][E: codex-rs/agent-identity/src/lib.rs:474][E: codex-rs/agent-identity/src/lib.rs:476][E: codex-rs/agent-identity/src/lib.rs:480][E: codex-rs/agent-identity/src/lib.rs:481][E: codex-rs/agent-identity/src/lib.rs:482][E: codex-rs/agent-identity/src/lib.rs:483][E: codex-rs/agent-identity/src/lib.rs:485][E: codex-rs/agent-identity/src/lib.rs:489][E: codex-rs/agent-identity/src/lib.rs:490][E: codex-rs/agent-identity/src/lib.rs:491]

`build_abom` 把 `SessionSource::VSCode` 映射成 `codex-app`，CLI/Exec/MCP/Custom/Internal/SubAgent/Unknown 映射成 `codex-cli`，running_location 是 session source 与 OS 的组合。[E: codex-rs/agent-identity/src/lib.rs:494][E: codex-rs/agent-identity/src/lib.rs:495][E: codex-rs/agent-identity/src/lib.rs:497][E: codex-rs/agent-identity/src/lib.rs:498][E: codex-rs/agent-identity/src/lib.rs:499][E: codex-rs/agent-identity/src/lib.rs:503][E: codex-rs/agent-identity/src/lib.rs:504][E: codex-rs/agent-identity/src/lib.rs:505][E: codex-rs/agent-identity/src/lib.rs:507]

## InstallContext

`InstallContext` 是 struct，字段是 `method: InstallMethod` 与 optional `package_layout: CodexPackageLayout`；`CodexPackageLayout` 记录 package/bin/resources/path dirs，`InstallMethod` variants 是 Standalone、Npm、Bun、Brew 和 Other；Standalone 记录 release_dir、resources_dir 和 platform。[E: codex-rs/install-context/src/lib.rs:23][E: codex-rs/install-context/src/lib.rs:24][E: codex-rs/install-context/src/lib.rs:26][E: codex-rs/install-context/src/lib.rs:28][E: codex-rs/install-context/src/lib.rs:30][E: codex-rs/install-context/src/lib.rs:32][E: codex-rs/install-context/src/lib.rs:35][E: codex-rs/install-context/src/lib.rs:36][E: codex-rs/install-context/src/lib.rs:37][E: codex-rs/install-context/src/lib.rs:38][E: codex-rs/install-context/src/lib.rs:41][E: codex-rs/install-context/src/lib.rs:42][E: codex-rs/install-context/src/lib.rs:49][E: codex-rs/install-context/src/lib.rs:51][E: codex-rs/install-context/src/lib.rs:53]

`InstallContext::from_exe` detection order 是先识别 package layout，然后 managed_by_npm、managed_by_bun、standalone release/package layout、macOS Homebrew prefix、Other。[E: codex-rs/install-context/src/lib.rs:68][E: codex-rs/install-context/src/lib.rs:69][E: codex-rs/install-context/src/lib.rs:75][E: codex-rs/install-context/src/lib.rs:76][E: codex-rs/install-context/src/lib.rs:92][E: codex-rs/install-context/src/lib.rs:93][E: codex-rs/install-context/src/lib.rs:95][E: codex-rs/install-context/src/lib.rs:97][E: codex-rs/install-context/src/lib.rs:98][E: codex-rs/install-context/src/lib.rs:220][E: codex-rs/install-context/src/lib.rs:223]

`InstallContext::current` 用 `OnceLock` cache，读取 `current_exe()`、`CODEX_MANAGED_BY_NPM` 和 `CODEX_MANAGED_BY_BUN` 后调用 `from_exe`。[E: codex-rs/install-context/src/lib.rs:109][E: codex-rs/install-context/src/lib.rs:110][E: codex-rs/install-context/src/lib.rs:111][E: codex-rs/install-context/src/lib.rs:112][E: codex-rs/install-context/src/lib.rs:113][E: codex-rs/install-context/src/lib.rs:114]

`rg_command` 优先在 package layout 的 `path_dir` 查 bundled `default_rg_command()`；其次在 Standalone `resources_dir` 查 bundled rg；都不存在时落到 default `rg`/`rg.exe`。[E: codex-rs/install-context/src/lib.rs:123][E: codex-rs/install-context/src/lib.rs:124][E: codex-rs/install-context/src/lib.rs:125][E: codex-rs/install-context/src/lib.rs:127][E: codex-rs/install-context/src/lib.rs:128][E: codex-rs/install-context/src/lib.rs:129][E: codex-rs/install-context/src/lib.rs:133][E: codex-rs/install-context/src/lib.rs:138][E: codex-rs/install-context/src/lib.rs:139][E: codex-rs/install-context/src/lib.rs:140][E: codex-rs/install-context/src/lib.rs:144][E: codex-rs/install-context/src/lib.rs:271][E: codex-rs/install-context/src/lib.rs:272][E: codex-rs/install-context/src/lib.rs:275]

standalone layout detection canonicalizes codex_home；有 package layout 时 release_dir 使用 package_dir，否则使用 executable parent；它要求 release_dir under `packages/standalone/releases`，然后用 `codex-resources` 常量拼出 resources_dir，并只在该 path 是目录时保存 resources_dir。[E: codex-rs/install-context/src/lib.rs:12][E: codex-rs/install-context/src/lib.rs:227][E: codex-rs/install-context/src/lib.rs:232][E: codex-rs/install-context/src/lib.rs:233][E: codex-rs/install-context/src/lib.rs:234][E: codex-rs/install-context/src/lib.rs:236][E: codex-rs/install-context/src/lib.rs:238][E: codex-rs/install-context/src/lib.rs:241][E: codex-rs/install-context/src/lib.rs:242][E: codex-rs/install-context/src/lib.rs:246][E: codex-rs/install-context/src/lib.rs:249]

## 设计动机与权衡

Agent assertion 使用 timestamp、runtime id 和 task id 签名，并在 header 中携带 JSON envelope，是为了让 backend 验证 agent runtime 与具体 task 的绑定，而不是只验证一个长期 bearer token。[I] 该设计由 assertion payload 和 envelope fields 支撑。[E: codex-rs/agent-identity/src/lib.rs:233][E: codex-rs/agent-identity/src/lib.rs:234][E: codex-rs/agent-identity/src/lib.rs:238][E: codex-rs/agent-identity/src/lib.rs:518][E: codex-rs/agent-identity/src/lib.rs:524][E: codex-rs/agent-identity/src/lib.rs:528][E: codex-rs/agent-identity/src/lib.rs:530]

InstallContext 把 package layout、managed standalone resources 与 npm/bun/brew/other 区分开，使同一 Codex binary 能在 managed package 中优先使用 bundled dependencies，同时在开发或包管理器环境中使用 PATH 上的默认工具。[I] 该结论由 package layout detection、standalone detection、resources/path dirs 和 `rg_command` fallback branches 支撑。[E: codex-rs/install-context/src/lib.rs:92][E: codex-rs/install-context/src/lib.rs:123][E: codex-rs/install-context/src/lib.rs:133][E: codex-rs/install-context/src/lib.rs:144][E: codex-rs/install-context/src/lib.rs:215][E: codex-rs/install-context/src/lib.rs:247]

## Gotchas

- `authorization_header_for_agent_task` 当前不会单独接收 target runtime id，因此 runtime-id policy 必须由调用方/后端协议保证，不能把本地 mismatch check 当成事实。[E: codex-rs/agent-identity/src/lib.rs:229][E: codex-rs/agent-identity/src/lib.rs:230][E: codex-rs/agent-identity/src/lib.rs:231][E: codex-rs/agent-identity/src/lib.rs:238]
- Agent identity JWT 在没有 JWKS 时走 payload-only decode helper；这条路径不能提供 signature trust，只能解出 payload JSON。[I][E: codex-rs/agent-identity/src/lib.rs:263][E: codex-rs/agent-identity/src/lib.rs:267][E: codex-rs/agent-identity/src/lib.rs:289][E: codex-rs/agent-identity/src/lib.rs:297][E: codex-rs/agent-identity/src/lib.rs:300]
- standalone detection 要求 release_dir 位于 canonical codex_home 的 `packages/standalone/releases` 下；不满足该 layout 会返回 `None` 并继续后续 install context detection。[E: codex-rs/install-context/src/lib.rs:232][E: codex-rs/install-context/src/lib.rs:238][E: codex-rs/install-context/src/lib.rs:241][E: codex-rs/install-context/src/lib.rs:242][E: codex-rs/install-context/src/lib.rs:243][E: codex-rs/install-context/src/lib.rs:215][E: codex-rs/install-context/src/lib.rs:220][E: codex-rs/install-context/src/lib.rs:223]

## Sources

- `codex-rs/agent-identity/src/lib.rs`
- `codex-rs/install-context/src/lib.rs`

## 相关

- `subsys.config-auth.auth-flows`: agent identity auth 是 `CodexAuth` 的一种 runtime auth 形态。
- `subsys.config-auth.credential-storage`: agent identity private key material 的持久化上下文。
- `subsys.cloud.cloud-tasks`: cloud backend task/account 操作与 agent task identity 相邻。
