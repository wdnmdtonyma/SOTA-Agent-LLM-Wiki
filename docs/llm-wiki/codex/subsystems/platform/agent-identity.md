---
id: subsys.platform.agent-identity
title: Agent identity
kind: subsystem
tier: T2
source: [codex-rs/agent-identity/src/lib.rs, codex-rs/install-context/src/lib.rs]
symbols: [AgentIdentityKey, ChatGptEnvironment, AgentIdentityJwtClaims, AgentBillOfMaterials, authorization_header_for_agent_task, fetch_agent_identity_jwks, decode_agent_identity_jwt, register_agent_task, register_agent_identity, generate_agent_key_material, InstallContext, InstallMethod]
related: [subsys.config-auth.auth-flows, subsys.config-auth.credential-storage, subsys.cloud.cloud-tasks]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Agent identity 子系统生成 Ed25519 agent key material，构造 task-scoped `AgentAssertion` authorization header，拉取并验证 agent identity JWT/JWKS，注册 agent/task，解密 encrypted task id，并通过 install context 判断 Codex binary 的安装来源与 bundled `rg` 选择。[E: codex-rs/agent-identity/src/lib.rs:232][E: codex-rs/agent-identity/src/lib.rs:247][E: codex-rs/agent-identity/src/lib.rs:266][E: codex-rs/agent-identity/src/lib.rs:315][E: codex-rs/agent-identity/src/lib.rs:358][E: codex-rs/agent-identity/src/lib.rs:411][E: codex-rs/agent-identity/src/lib.rs:425][E: codex-rs/install-context/src/lib.rs:70][E: codex-rs/install-context/src/lib.rs:126]

## 能回答的问题

- `AgentAssertion` header 的 payload、envelope 和签名覆盖哪些字段？
- agent task registration request/URL/timeout 怎样构造？
- agent private key material 怎样生成、编码和推导 SSH public key？
- Agent identity JWT 怎样按 ChatGPT environment、JWKS、audience 和 issuer 处理？
- encrypted task id 怎样由 Ed25519 signing key 派生 Curve25519 secret key 后解密？
- agent URLs 和 install context detection 的精确规则是什么？

## Agent identity 数据模型

`ChatGptEnvironment` 只有 Production 与 Staging；`from_chatgpt_base_url` 只接受 production/staging ChatGPT URL 及其 backend-api/codex 变体，`chatgpt_base_url()` 返回对应 backend-api base URL，`agent_identity_authapi_base_url()` 返回 auth API account base URL。[E: codex-rs/agent-identity/src/lib.rs:49][E: codex-rs/agent-identity/src/lib.rs:56][E: codex-rs/agent-identity/src/lib.rs:58][E: codex-rs/agent-identity/src/lib.rs:66][E: codex-rs/agent-identity/src/lib.rs:70][E: codex-rs/agent-identity/src/lib.rs:76][E: codex-rs/agent-identity/src/lib.rs:83]

`AgentIdentityKey` 字段是 agent_runtime_id 和 private_key_pkcs8_base64；该 struct 不包含 task id。[E: codex-rs/agent-identity/src/lib.rs:97][E: codex-rs/agent-identity/src/lib.rs:98][E: codex-rs/agent-identity/src/lib.rs:99]

`AgentBillOfMaterials` 字段是 agent_version、agent_harness_id 和 running_location；`GeneratedAgentKeyMaterial` 字段是 private_key_pkcs8_base64 和 public_key_ssh。[E: codex-rs/agent-identity/src/lib.rs:103][E: codex-rs/agent-identity/src/lib.rs:104][E: codex-rs/agent-identity/src/lib.rs:105][E: codex-rs/agent-identity/src/lib.rs:109][E: codex-rs/agent-identity/src/lib.rs:110][E: codex-rs/agent-identity/src/lib.rs:111]

`AgentIdentityJwtClaims` 字段覆盖 issuer/audience/time claims、agent runtime/private key、account/user/email/plan 和 FedRAMP account flag。[E: codex-rs/agent-identity/src/lib.rs:116][E: codex-rs/agent-identity/src/lib.rs:117][E: codex-rs/agent-identity/src/lib.rs:118][E: codex-rs/agent-identity/src/lib.rs:121][E: codex-rs/agent-identity/src/lib.rs:122][E: codex-rs/agent-identity/src/lib.rs:123][E: codex-rs/agent-identity/src/lib.rs:126][E: codex-rs/agent-identity/src/lib.rs:127]

`AgentAssertionEnvelope` 内部字段是 agent_runtime_id、task_id、timestamp 和 signature；serialize 时写出同名 JSON keys 并使用 URL-safe no-pad base64 编码。[E: codex-rs/agent-identity/src/lib.rs:131][E: codex-rs/agent-identity/src/lib.rs:132][E: codex-rs/agent-identity/src/lib.rs:133][E: codex-rs/agent-identity/src/lib.rs:134][E: codex-rs/agent-identity/src/lib.rs:531][E: codex-rs/agent-identity/src/lib.rs:532][E: codex-rs/agent-identity/src/lib.rs:533][E: codex-rs/agent-identity/src/lib.rs:534][E: codex-rs/agent-identity/src/lib.rs:535][E: codex-rs/agent-identity/src/lib.rs:536][E: codex-rs/agent-identity/src/lib.rs:539]

## Assertion 与 task registration

`authorization_header_for_agent_task` 接受 `AgentIdentityKey` 和 task id，生成 RFC3339 seconds timestamp、构造 envelope、签名 payload `agent_runtime_id:task_id:timestamp`，并返回 `AgentAssertion <base64url-json>` header；当前函数没有单独的 target runtime id 参数，也不执行 runtime id mismatch 校验。[E: codex-rs/agent-identity/src/lib.rs:232][E: codex-rs/agent-identity/src/lib.rs:233][E: codex-rs/agent-identity/src/lib.rs:234][E: codex-rs/agent-identity/src/lib.rs:236][E: codex-rs/agent-identity/src/lib.rs:237][E: codex-rs/agent-identity/src/lib.rs:241][E: codex-rs/agent-identity/src/lib.rs:243][E: codex-rs/agent-identity/src/lib.rs:244][E: codex-rs/agent-identity/src/lib.rs:521][E: codex-rs/agent-identity/src/lib.rs:527][E: codex-rs/agent-identity/src/lib.rs:528]

`fetch_agent_identity_jwks` 对 `agent_identity_jwks_url(base)` 发 GET、设置 10 秒 timeout、要求 successful status，并把响应 JSON 解成 `JwkSet`。[E: codex-rs/agent-identity/src/lib.rs:39][E: codex-rs/agent-identity/src/lib.rs:247][E: codex-rs/agent-identity/src/lib.rs:252][E: codex-rs/agent-identity/src/lib.rs:253][E: codex-rs/agent-identity/src/lib.rs:257][E: codex-rs/agent-identity/src/lib.rs:261][E: codex-rs/agent-identity/src/lib.rs:263] `decode_agent_identity_jwt` 在有 JWKS 时读取 JWT header kid、查 trusted JWK、用 RS256 validation 设置 audience `codex-app-server` 和 issuer `https://chatgpt.com/codex-backend/agent-identity`；没有 JWKS 时只 base64url decode payload JSON。[E: codex-rs/agent-identity/src/lib.rs:40][E: codex-rs/agent-identity/src/lib.rs:41][E: codex-rs/agent-identity/src/lib.rs:266][E: codex-rs/agent-identity/src/lib.rs:270][E: codex-rs/agent-identity/src/lib.rs:274][E: codex-rs/agent-identity/src/lib.rs:282][E: codex-rs/agent-identity/src/lib.rs:283][E: codex-rs/agent-identity/src/lib.rs:284][E: codex-rs/agent-identity/src/lib.rs:287][E: codex-rs/agent-identity/src/lib.rs:292][E: codex-rs/agent-identity/src/lib.rs:300][E: codex-rs/agent-identity/src/lib.rs:303]

`register_agent_task` 构造 timestamp/signature request body，POST 到 `agent_task_registration_url(agent_identity_authapi_base_url, key.agent_runtime_id)`，设置 30 秒 timeout，并以 JSON body 发送；registration signature payload 是 `agent_runtime_id:timestamp`。[E: codex-rs/agent-identity/src/lib.rs:38][E: codex-rs/agent-identity/src/lib.rs:306][E: codex-rs/agent-identity/src/lib.rs:311][E: codex-rs/agent-identity/src/lib.rs:312][E: codex-rs/agent-identity/src/lib.rs:315][E: codex-rs/agent-identity/src/lib.rs:320][E: codex-rs/agent-identity/src/lib.rs:321][E: codex-rs/agent-identity/src/lib.rs:322][E: codex-rs/agent-identity/src/lib.rs:325][E: codex-rs/agent-identity/src/lib.rs:327][E: codex-rs/agent-identity/src/lib.rs:329][E: codex-rs/agent-identity/src/lib.rs:330]

`register_agent_identity` POST 到 agent registration URL，body 包含 ABOM、public key、capabilities 和 `ttl: None`，使用 bearer token，FedRAMP account 时加 `X-OpenAI-Fedramp: true`，timeout 是 15 秒。[E: codex-rs/agent-identity/src/lib.rs:42][E: codex-rs/agent-identity/src/lib.rs:358][E: codex-rs/agent-identity/src/lib.rs:367][E: codex-rs/agent-identity/src/lib.rs:368][E: codex-rs/agent-identity/src/lib.rs:370][E: codex-rs/agent-identity/src/lib.rs:371][E: codex-rs/agent-identity/src/lib.rs:372][E: codex-rs/agent-identity/src/lib.rs:375][E: codex-rs/agent-identity/src/lib.rs:377][E: codex-rs/agent-identity/src/lib.rs:379][E: codex-rs/agent-identity/src/lib.rs:380][E: codex-rs/agent-identity/src/lib.rs:381]

registration response 优先接受 `task_id` 或 `taskId`；没有直接 task id 时读取 `encrypted_task_id` 或 `encryptedTaskId`，然后调用 decrypt path。[E: codex-rs/agent-identity/src/lib.rs:145][E: codex-rs/agent-identity/src/lib.rs:147][E: codex-rs/agent-identity/src/lib.rs:149][E: codex-rs/agent-identity/src/lib.rs:151][E: codex-rs/agent-identity/src/lib.rs:153][E: codex-rs/agent-identity/src/lib.rs:397][E: codex-rs/agent-identity/src/lib.rs:401][E: codex-rs/agent-identity/src/lib.rs:404][E: codex-rs/agent-identity/src/lib.rs:406][E: codex-rs/agent-identity/src/lib.rs:408]

encrypted task id decrypt path 会 base64 decode ciphertext，使用 signing key 派生的 Curve25519 secret key unseal ciphertext，再要求 plaintext 是 UTF-8；Curve25519 derivation 对 SHA-512 digest 前 32 bytes 做 Ed25519-to-X25519 clamping。[E: codex-rs/agent-identity/src/lib.rs:411][E: codex-rs/agent-identity/src/lib.rs:415][E: codex-rs/agent-identity/src/lib.rs:416][E: codex-rs/agent-identity/src/lib.rs:419][E: codex-rs/agent-identity/src/lib.rs:420][E: codex-rs/agent-identity/src/lib.rs:422][E: codex-rs/agent-identity/src/lib.rs:542][E: codex-rs/agent-identity/src/lib.rs:543][E: codex-rs/agent-identity/src/lib.rs:545][E: codex-rs/agent-identity/src/lib.rs:546][E: codex-rs/agent-identity/src/lib.rs:547][E: codex-rs/agent-identity/src/lib.rs:548]

## Key material 与 URLs

`generate_agent_key_material` 使用 OS RNG 填充 64 字节 seed material，再把 derivation context 与 seed material 经 SHA-512 派生 Ed25519 的 32 字节 seed；随后构造 signing key、编码 PKCS#8 DER 为 standard base64，并生成 SSH ed25519 public key。[E: codex-rs/agent-identity/src/lib.rs:45][E: codex-rs/agent-identity/src/lib.rs:46][E: codex-rs/agent-identity/src/lib.rs:425][E: codex-rs/agent-identity/src/lib.rs:426][E: codex-rs/agent-identity/src/lib.rs:428][E: codex-rs/agent-identity/src/lib.rs:431][E: codex-rs/agent-identity/src/lib.rs:432][E: codex-rs/agent-identity/src/lib.rs:433][E: codex-rs/agent-identity/src/lib.rs:435][E: codex-rs/agent-identity/src/lib.rs:437][E: codex-rs/agent-identity/src/lib.rs:443][E: codex-rs/agent-identity/src/lib.rs:444] public/verifying key helpers 都从 PKCS#8 base64 private key 恢复 signing key 后导出 public material。[E: codex-rs/agent-identity/src/lib.rs:448][E: codex-rs/agent-identity/src/lib.rs:451][E: codex-rs/agent-identity/src/lib.rs:452][E: codex-rs/agent-identity/src/lib.rs:455][E: codex-rs/agent-identity/src/lib.rs:458][E: codex-rs/agent-identity/src/lib.rs:459]

URL helpers 通过 trim trailing slash 后 format：agent registration 是 `/v1/agent/register`，agent task registration 是 `/v1/agent/{agent_runtime_id}/task/register`；JWKS URL 在 base 包含 `/backend-api` 时追加 `/wham/agent-identities/jwks`，否则追加 `/agent-identities/jwks`。[E: codex-rs/agent-identity/src/lib.rs:469][E: codex-rs/agent-identity/src/lib.rs:470][E: codex-rs/agent-identity/src/lib.rs:473][E: codex-rs/agent-identity/src/lib.rs:477][E: codex-rs/agent-identity/src/lib.rs:479][E: codex-rs/agent-identity/src/lib.rs:483][E: codex-rs/agent-identity/src/lib.rs:484][E: codex-rs/agent-identity/src/lib.rs:485][E: codex-rs/agent-identity/src/lib.rs:486][E: codex-rs/agent-identity/src/lib.rs:488][E: codex-rs/agent-identity/src/lib.rs:492][E: codex-rs/agent-identity/src/lib.rs:493][E: codex-rs/agent-identity/src/lib.rs:494]

`build_abom` 把 `SessionSource::VSCode` 映射成 `codex-app`，CLI/Exec/MCP/Custom/Internal/SubAgent/Unknown 映射成 `codex-cli`，running_location 是 session source 与 OS 的组合。[E: codex-rs/agent-identity/src/lib.rs:497][E: codex-rs/agent-identity/src/lib.rs:498][E: codex-rs/agent-identity/src/lib.rs:500][E: codex-rs/agent-identity/src/lib.rs:501][E: codex-rs/agent-identity/src/lib.rs:502][E: codex-rs/agent-identity/src/lib.rs:506][E: codex-rs/agent-identity/src/lib.rs:507][E: codex-rs/agent-identity/src/lib.rs:508][E: codex-rs/agent-identity/src/lib.rs:510]

## InstallContext

`InstallContext` 是 struct，字段是 `method: InstallMethod` 与 optional `package_layout: CodexPackageLayout`；`CodexPackageLayout` 记录 package/bin/resources/path dirs，`InstallMethod` variants 是 Standalone、Npm、Bun、Pnpm、Brew 和 Other；Standalone 记录 release_dir、resources_dir 和 platform。[E: codex-rs/install-context/src/lib.rs:24][E: codex-rs/install-context/src/lib.rs:26][E: codex-rs/install-context/src/lib.rs:28][E: codex-rs/install-context/src/lib.rs:30][E: codex-rs/install-context/src/lib.rs:32][E: codex-rs/install-context/src/lib.rs:36][E: codex-rs/install-context/src/lib.rs:37][E: codex-rs/install-context/src/lib.rs:42][E: codex-rs/install-context/src/lib.rs:49]

`InstallContext::from_exe` 先独立识别 optional package layout；`method_override` 若存在直接决定 install method，否则才按 executable/codex-home layout 识别 standalone、macOS Homebrew 或 Other。[E: codex-rs/install-context/src/lib.rs:71][E: codex-rs/install-context/src/lib.rs:74][E: codex-rs/install-context/src/lib.rs:91][E: codex-rs/install-context/src/lib.rs:92][E: codex-rs/install-context/src/lib.rs:94][E: codex-rs/install-context/src/lib.rs:95][E: codex-rs/install-context/src/lib.rs:97]

`InstallContext::current` 用 `OnceLock` cache，读取 `current_exe()`，并按 `CODEX_MANAGED_BY_PNPM` → `CODEX_MANAGED_BY_NPM` → `CODEX_MANAGED_BY_BUN` 优先级形成 method override 后调用 `from_exe`。[E: codex-rs/install-context/src/lib.rs:106][E: codex-rs/install-context/src/lib.rs:108][E: codex-rs/install-context/src/lib.rs:109][E: codex-rs/install-context/src/lib.rs:111][E: codex-rs/install-context/src/lib.rs:113][E: codex-rs/install-context/src/lib.rs:118][E: codex-rs/install-context/src/lib.rs:121]

`rg_command` 优先在 package layout 的 `path_dir` 查 bundled `default_rg_command()`；其次在 Standalone `resources_dir` 查 bundled rg；都不存在时落到 default `rg`/`rg.exe`。[E: codex-rs/install-context/src/lib.rs:126][E: codex-rs/install-context/src/lib.rs:127][E: codex-rs/install-context/src/lib.rs:128][E: codex-rs/install-context/src/lib.rs:130][E: codex-rs/install-context/src/lib.rs:131][E: codex-rs/install-context/src/lib.rs:132][E: codex-rs/install-context/src/lib.rs:136][E: codex-rs/install-context/src/lib.rs:141][E: codex-rs/install-context/src/lib.rs:142][E: codex-rs/install-context/src/lib.rs:143][E: codex-rs/install-context/src/lib.rs:147][E: codex-rs/install-context/src/lib.rs:274][E: codex-rs/install-context/src/lib.rs:275][E: codex-rs/install-context/src/lib.rs:278]

standalone layout detection canonicalizes codex_home；有 package layout 时 release_dir 使用 package_dir，否则使用 executable parent；它要求 release_dir under `packages/standalone/releases`，然后用 `codex-resources` 常量拼出 resources_dir，并只在该 path 是目录时保存 resources_dir。[E: codex-rs/install-context/src/lib.rs:12][E: codex-rs/install-context/src/lib.rs:230][E: codex-rs/install-context/src/lib.rs:235][E: codex-rs/install-context/src/lib.rs:236][E: codex-rs/install-context/src/lib.rs:237][E: codex-rs/install-context/src/lib.rs:239][E: codex-rs/install-context/src/lib.rs:241][E: codex-rs/install-context/src/lib.rs:244][E: codex-rs/install-context/src/lib.rs:245][E: codex-rs/install-context/src/lib.rs:249][E: codex-rs/install-context/src/lib.rs:252]

## 设计动机与权衡

Agent assertion 使用 timestamp、runtime id 和 task id 签名，并在 header 中携带 JSON envelope，是为了让 backend 验证 agent runtime 与具体 task 的绑定，而不是只验证一个长期 bearer token。[I] 该设计由 assertion payload 和 envelope fields 支撑。[E: codex-rs/agent-identity/src/lib.rs:236][E: codex-rs/agent-identity/src/lib.rs:237][E: codex-rs/agent-identity/src/lib.rs:241][E: codex-rs/agent-identity/src/lib.rs:521][E: codex-rs/agent-identity/src/lib.rs:527][E: codex-rs/agent-identity/src/lib.rs:531][E: codex-rs/agent-identity/src/lib.rs:533]

InstallContext 把 package layout、managed standalone resources 与 npm/bun/pnpm/brew/other 区分开，使同一 Codex binary 能在 managed package 中优先使用 bundled dependencies，同时在开发或包管理器环境中使用 PATH 上的默认工具。[I] 该结论由 package layout detection、standalone detection、resources/path dirs 和 `rg_command` fallback branches 支撑。[E: codex-rs/install-context/src/lib.rs:91][E: codex-rs/install-context/src/lib.rs:126][E: codex-rs/install-context/src/lib.rs:136][E: codex-rs/install-context/src/lib.rs:147][E: codex-rs/install-context/src/lib.rs:218][E: codex-rs/install-context/src/lib.rs:250]

## Gotchas

- `authorization_header_for_agent_task` 当前不会单独接收 target runtime id，因此 runtime-id policy 必须由调用方/后端协议保证，不能把本地 mismatch check 当成事实。[E: codex-rs/agent-identity/src/lib.rs:232][E: codex-rs/agent-identity/src/lib.rs:233][E: codex-rs/agent-identity/src/lib.rs:234][E: codex-rs/agent-identity/src/lib.rs:241]
- Agent identity JWT 在没有 JWKS 时走 payload-only decode helper；这条路径不能提供 signature trust，只能解出 payload JSON。[I][E: codex-rs/agent-identity/src/lib.rs:266][E: codex-rs/agent-identity/src/lib.rs:270][E: codex-rs/agent-identity/src/lib.rs:292][E: codex-rs/agent-identity/src/lib.rs:300][E: codex-rs/agent-identity/src/lib.rs:303]
- standalone detection 要求 release_dir 位于 canonical codex_home 的 `packages/standalone/releases` 下；不满足该 layout 会返回 `None` 并继续后续 install context detection。[E: codex-rs/install-context/src/lib.rs:235][E: codex-rs/install-context/src/lib.rs:241][E: codex-rs/install-context/src/lib.rs:244][E: codex-rs/install-context/src/lib.rs:245][E: codex-rs/install-context/src/lib.rs:246][E: codex-rs/install-context/src/lib.rs:218][E: codex-rs/install-context/src/lib.rs:223][E: codex-rs/install-context/src/lib.rs:226]

## Sources

- `codex-rs/agent-identity/src/lib.rs`
- `codex-rs/install-context/src/lib.rs`

## 相关

- `subsys.config-auth.auth-flows`: agent identity auth 是 `CodexAuth` 的一种 runtime auth 形态。
- `subsys.config-auth.credential-storage`: agent identity private key material 的持久化上下文。
- `subsys.cloud.cloud-tasks`: cloud backend task/account 操作与 agent task identity 相邻。
