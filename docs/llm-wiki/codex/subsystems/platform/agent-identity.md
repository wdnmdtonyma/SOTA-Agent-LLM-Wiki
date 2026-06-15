---
id: subsys.platform.agent-identity
title: Agent identity
kind: subsystem
tier: T2
source: [codex-rs/agent-identity/src/lib.rs, codex-rs/install-context/src/lib.rs]
symbols: [AgentIdentityKey, AgentTaskAuthorizationTarget, AgentBillOfMaterials, authorization_header_for_agent_task, register_agent_task, generate_agent_key_material, normalize_chatgpt_base_url, InstallContext]
related: [subsys.config-auth.auth-flows, subsys.config-auth.credential-storage, subsys.cloud.cloud-tasks]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Agent identity 子系统生成 Ed25519 agent key material，构造 task-scoped `AgentAssertion` authorization header，注册 agent task，解密 encrypted task id，并通过 install context 判断 Codex binary 的安装来源与 bundled `rg` 选择。[E: codex-rs/agent-identity/src/lib.rs:90][E: codex-rs/agent-identity/src/lib.rs:95][E: codex-rs/agent-identity/src/lib.rs:98][E: codex-rs/agent-identity/src/lib.rs:121][E: codex-rs/agent-identity/src/lib.rs:126][E: codex-rs/agent-identity/src/lib.rs:127][E: codex-rs/agent-identity/src/lib.rs:162][E: codex-rs/agent-identity/src/lib.rs:163][E: codex-rs/agent-identity/src/lib.rs:169][E: codex-rs/agent-identity/src/lib.rs:173][E: codex-rs/agent-identity/src/lib.rs:179][E: codex-rs/agent-identity/src/lib.rs:180][E: codex-rs/install-context/src/lib.rs:65][E: codex-rs/install-context/src/lib.rs:73][E: codex-rs/install-context/src/lib.rs:79][E: codex-rs/install-context/src/lib.rs:109][E: codex-rs/install-context/src/lib.rs:110][E: codex-rs/install-context/src/lib.rs:111]

## 能回答的问题

- `AgentAssertion` header 的 payload、envelope 和签名覆盖哪些字段？
- agent task registration request/URL/timeout 怎样构造？
- agent private key material 怎样生成、编码和推导 SSH public key？
- encrypted task id 怎样由 Ed25519 signing key 派生 Curve25519 secret key 后解密？
- `normalize_chatgpt_base_url`、agent URLs 和 install context detection 的精确规则是什么？

## Agent identity 数据模型

`AgentIdentityKey` 字段是 agent_runtime_id 和 private_key_pkcs8_base64；`AgentTaskAuthorizationTarget` 字段是 agent_runtime_id 和 task_id。[E: codex-rs/agent-identity/src/lib.rs:29][E: codex-rs/agent-identity/src/lib.rs:30][E: codex-rs/agent-identity/src/lib.rs:31][E: codex-rs/agent-identity/src/lib.rs:36][E: codex-rs/agent-identity/src/lib.rs:37][E: codex-rs/agent-identity/src/lib.rs:38]

`AgentBillOfMaterials` 字段是 agent_version、agent_harness_id 和 running_location；`GeneratedAgentKeyMaterial` 字段是 private_key_pkcs8_base64 和 public_key_ssh。[E: codex-rs/agent-identity/src/lib.rs:42][E: codex-rs/agent-identity/src/lib.rs:43][E: codex-rs/agent-identity/src/lib.rs:44][E: codex-rs/agent-identity/src/lib.rs:45][E: codex-rs/agent-identity/src/lib.rs:48][E: codex-rs/agent-identity/src/lib.rs:49][E: codex-rs/agent-identity/src/lib.rs:50]

`AgentAssertionEnvelope` 内部字段是 agent_runtime_id、task_id、timestamp 和 signature；serialize 时写出同名 JSON keys 并使用 URL-safe no-pad base64 编码。[E: codex-rs/agent-identity/src/lib.rs:54][E: codex-rs/agent-identity/src/lib.rs:55][E: codex-rs/agent-identity/src/lib.rs:56][E: codex-rs/agent-identity/src/lib.rs:57][E: codex-rs/agent-identity/src/lib.rs:58][E: codex-rs/agent-identity/src/lib.rs:287][E: codex-rs/agent-identity/src/lib.rs:288][E: codex-rs/agent-identity/src/lib.rs:289][E: codex-rs/agent-identity/src/lib.rs:290][E: codex-rs/agent-identity/src/lib.rs:291][E: codex-rs/agent-identity/src/lib.rs:292][E: codex-rs/agent-identity/src/lib.rs:295]

## Assertion 与 task registration

`authorization_header_for_agent_task` 先校验 stored key 的 runtime id 与 target runtime id 一致；mismatch 会直接 error。[E: codex-rs/agent-identity/src/lib.rs:79][E: codex-rs/agent-identity/src/lib.rs:83][E: codex-rs/agent-identity/src/lib.rs:84] 通过校验后生成 RFC3339 seconds timestamp、构造 envelope、签名 payload `agent_runtime_id:task_id:timestamp`，并返回 `AgentAssertion <base64url-json>` header。[E: codex-rs/agent-identity/src/lib.rs:90][E: codex-rs/agent-identity/src/lib.rs:91][E: codex-rs/agent-identity/src/lib.rs:95][E: codex-rs/agent-identity/src/lib.rs:97][E: codex-rs/agent-identity/src/lib.rs:98][E: codex-rs/agent-identity/src/lib.rs:277][E: codex-rs/agent-identity/src/lib.rs:283][E: codex-rs/agent-identity/src/lib.rs:284]

`register_agent_task` 构造 timestamp/signature request body，POST 到 `agent_task_registration_url(chatgpt_base_url, key.agent_runtime_id)`，设置 30 秒 timeout，并以 JSON body 发送。[E: codex-rs/agent-identity/src/lib.rs:25][E: codex-rs/agent-identity/src/lib.rs:110][E: codex-rs/agent-identity/src/lib.rs:115][E: codex-rs/agent-identity/src/lib.rs:116][E: codex-rs/agent-identity/src/lib.rs:117][E: codex-rs/agent-identity/src/lib.rs:118][E: codex-rs/agent-identity/src/lib.rs:121][E: codex-rs/agent-identity/src/lib.rs:122][E: codex-rs/agent-identity/src/lib.rs:124][E: codex-rs/agent-identity/src/lib.rs:126][E: codex-rs/agent-identity/src/lib.rs:127] registration signature payload 是 `agent_runtime_id:timestamp`。[E: codex-rs/agent-identity/src/lib.rs:101][E: codex-rs/agent-identity/src/lib.rs:105][E: codex-rs/agent-identity/src/lib.rs:106][E: codex-rs/agent-identity/src/lib.rs:107]

registration response 优先接受 `task_id` 或 `taskId`；没有直接 task id 时读取 `encrypted_task_id` 或 `encryptedTaskId`，然后调用 decrypt path。[E: codex-rs/agent-identity/src/lib.rs:68][E: codex-rs/agent-identity/src/lib.rs:70][E: codex-rs/agent-identity/src/lib.rs:72][E: codex-rs/agent-identity/src/lib.rs:74][E: codex-rs/agent-identity/src/lib.rs:76][E: codex-rs/agent-identity/src/lib.rs:140][E: codex-rs/agent-identity/src/lib.rs:144][E: codex-rs/agent-identity/src/lib.rs:145][E: codex-rs/agent-identity/src/lib.rs:147][E: codex-rs/agent-identity/src/lib.rs:151]

encrypted task id decrypt path 会 base64 decode ciphertext，使用 signing key 派生的 Curve25519 secret key unseal ciphertext，再要求 plaintext 是 UTF-8；Curve25519 derivation 对 SHA-512 digest 前 32 bytes 做 Ed25519-to-X25519 clamping。[E: codex-rs/agent-identity/src/lib.rs:154][E: codex-rs/agent-identity/src/lib.rs:158][E: codex-rs/agent-identity/src/lib.rs:159][E: codex-rs/agent-identity/src/lib.rs:160][E: codex-rs/agent-identity/src/lib.rs:162][E: codex-rs/agent-identity/src/lib.rs:163][E: codex-rs/agent-identity/src/lib.rs:165][E: codex-rs/agent-identity/src/lib.rs:298][E: codex-rs/agent-identity/src/lib.rs:299][E: codex-rs/agent-identity/src/lib.rs:301][E: codex-rs/agent-identity/src/lib.rs:302][E: codex-rs/agent-identity/src/lib.rs:303][E: codex-rs/agent-identity/src/lib.rs:304][E: codex-rs/agent-identity/src/lib.rs:305]

## Key material 与 URLs

`generate_agent_key_material` 使用 OS RNG 填充 32 字节 secret key，构造 Ed25519 signing key，编码 PKCS#8 DER 为 standard base64，并生成 SSH ed25519 public key。[E: codex-rs/agent-identity/src/lib.rs:168][E: codex-rs/agent-identity/src/lib.rs:169][E: codex-rs/agent-identity/src/lib.rs:170][E: codex-rs/agent-identity/src/lib.rs:171][E: codex-rs/agent-identity/src/lib.rs:173][E: codex-rs/agent-identity/src/lib.rs:174][E: codex-rs/agent-identity/src/lib.rs:175][E: codex-rs/agent-identity/src/lib.rs:179][E: codex-rs/agent-identity/src/lib.rs:180] public/verifying key helpers 都从 PKCS#8 base64 private key 恢复 signing key 后导出 public material。[E: codex-rs/agent-identity/src/lib.rs:184][E: codex-rs/agent-identity/src/lib.rs:187][E: codex-rs/agent-identity/src/lib.rs:188][E: codex-rs/agent-identity/src/lib.rs:191][E: codex-rs/agent-identity/src/lib.rs:194][E: codex-rs/agent-identity/src/lib.rs:195]

URL helpers 通过 trim trailing slash 后 format：agent registration 是 `/v1/agent/register`，agent task registration 是 `/v1/agent/{agent_runtime_id}/task/register`，agent identity biscuit URL 是 `/authenticate_app_v2`。[E: codex-rs/agent-identity/src/lib.rs:205][E: codex-rs/agent-identity/src/lib.rs:206][E: codex-rs/agent-identity/src/lib.rs:207][E: codex-rs/agent-identity/src/lib.rs:210][E: codex-rs/agent-identity/src/lib.rs:211][E: codex-rs/agent-identity/src/lib.rs:212][E: codex-rs/agent-identity/src/lib.rs:215][E: codex-rs/agent-identity/src/lib.rs:216][E: codex-rs/agent-identity/src/lib.rs:217]

`normalize_chatgpt_base_url` 会 trim trailing slash，strip remote-control suffixes 和 `/codex` suffix；对以 `https://chatgpt.com` 或 `https://chat.openai.com` 开头、且 string 中不包含 `/backend-api` 的 base URL 追加 `/backend-api`。这个实现用 `starts_with` 与 `contains` 字符串判断，不是严格 URL host parsing。[I][E: codex-rs/agent-identity/src/lib.rs:231][E: codex-rs/agent-identity/src/lib.rs:232][E: codex-rs/agent-identity/src/lib.rs:234][E: codex-rs/agent-identity/src/lib.rs:235][E: codex-rs/agent-identity/src/lib.rs:237][E: codex-rs/agent-identity/src/lib.rs:238][E: codex-rs/agent-identity/src/lib.rs:242][E: codex-rs/agent-identity/src/lib.rs:243][E: codex-rs/agent-identity/src/lib.rs:245][E: codex-rs/agent-identity/src/lib.rs:246][E: codex-rs/agent-identity/src/lib.rs:247][E: codex-rs/agent-identity/src/lib.rs:249]

`build_abom` 把 `SessionSource::VSCode` 映射成 `codex-app`，CLI/Exec/MCP/Custom/SubAgent/Unknown 映射成 `codex-cli`，running_location 是 session source 与 OS 的组合。[E: codex-rs/agent-identity/src/lib.rs:254][E: codex-rs/agent-identity/src/lib.rs:255][E: codex-rs/agent-identity/src/lib.rs:257][E: codex-rs/agent-identity/src/lib.rs:258][E: codex-rs/agent-identity/src/lib.rs:259][E: codex-rs/agent-identity/src/lib.rs:260][E: codex-rs/agent-identity/src/lib.rs:261][E: codex-rs/agent-identity/src/lib.rs:262][E: codex-rs/agent-identity/src/lib.rs:263][E: codex-rs/agent-identity/src/lib.rs:264][E: codex-rs/agent-identity/src/lib.rs:266]

## InstallContext

`InstallContext` variants 是 Standalone、Npm、Bun、Brew 和 Other；Standalone 记录 release_dir、resources_dir 和 platform。[E: codex-rs/install-context/src/lib.rs:17][E: codex-rs/install-context/src/lib.rs:18][E: codex-rs/install-context/src/lib.rs:21][E: codex-rs/install-context/src/lib.rs:24][E: codex-rs/install-context/src/lib.rs:26][E: codex-rs/install-context/src/lib.rs:29][E: codex-rs/install-context/src/lib.rs:31][E: codex-rs/install-context/src/lib.rs:33][E: codex-rs/install-context/src/lib.rs:38]

`InstallContext::from_exe` detection order 是 managed_by_npm、managed_by_bun、standalone release layout、macOS Homebrew prefix、Other。[E: codex-rs/install-context/src/lib.rs:65][E: codex-rs/install-context/src/lib.rs:66][E: codex-rs/install-context/src/lib.rs:69][E: codex-rs/install-context/src/lib.rs:70][E: codex-rs/install-context/src/lib.rs:73][E: codex-rs/install-context/src/lib.rs:74][E: codex-rs/install-context/src/lib.rs:76][E: codex-rs/install-context/src/lib.rs:79][E: codex-rs/install-context/src/lib.rs:81][E: codex-rs/install-context/src/lib.rs:83][E: codex-rs/install-context/src/lib.rs:86]

`InstallContext::current` 用 `OnceLock` cache，读取 `current_exe()`、`CODEX_MANAGED_BY_NPM` 和 `CODEX_MANAGED_BY_BUN` 后调用 `from_exe`。[E: codex-rs/install-context/src/lib.rs:89][E: codex-rs/install-context/src/lib.rs:90][E: codex-rs/install-context/src/lib.rs:91][E: codex-rs/install-context/src/lib.rs:92][E: codex-rs/install-context/src/lib.rs:93][E: codex-rs/install-context/src/lib.rs:94]

`rg_command` 在 Standalone 且 resources_dir 存在时查找 bundled `default_rg_command()`；bundled path 存在则返回 bundled rg，否则落到 default `rg`/`rg.exe`。Standalone 没有 resources_dir 以及 Npm/Bun/Brew/Other 都直接返回 default command。[E: codex-rs/install-context/src/lib.rs:103][E: codex-rs/install-context/src/lib.rs:105][E: codex-rs/install-context/src/lib.rs:109][E: codex-rs/install-context/src/lib.rs:110][E: codex-rs/install-context/src/lib.rs:111][E: codex-rs/install-context/src/lib.rs:113][E: codex-rs/install-context/src/lib.rs:116][E: codex-rs/install-context/src/lib.rs:120][E: codex-rs/install-context/src/lib.rs:121][E: codex-rs/install-context/src/lib.rs:122][E: codex-rs/install-context/src/lib.rs:123][E: codex-rs/install-context/src/lib.rs:159][E: codex-rs/install-context/src/lib.rs:161][E: codex-rs/install-context/src/lib.rs:163]

standalone layout detection canonicalizes exe path and codex_home, requires release_dir under `packages/standalone/releases`，然后用 `codex-resources` 常量拼出 resources_dir，并只在该 path 是目录时保存 resources_dir。[E: codex-rs/install-context/src/lib.rs:6][E: codex-rs/install-context/src/lib.rs:128][E: codex-rs/install-context/src/lib.rs:132][E: codex-rs/install-context/src/lib.rs:133][E: codex-rs/install-context/src/lib.rs:134][E: codex-rs/install-context/src/lib.rs:135][E: codex-rs/install-context/src/lib.rs:136][E: codex-rs/install-context/src/lib.rs:137][E: codex-rs/install-context/src/lib.rs:138][E: codex-rs/install-context/src/lib.rs:139][E: codex-rs/install-context/src/lib.rs:143][E: codex-rs/install-context/src/lib.rs:144][E: codex-rs/install-context/src/lib.rs:146]

## 设计动机与权衡

Agent assertion 使用 timestamp、runtime id 和 task id 签名，并在 header 中携带 JSON envelope，是为了让 backend 验证 agent runtime 与具体 task 的绑定，而不是只验证一个长期 bearer token。[I] 该设计由 runtime-id equality check、assertion payload 和 envelope fields 支撑。[E: codex-rs/agent-identity/src/lib.rs:83][E: codex-rs/agent-identity/src/lib.rs:91][E: codex-rs/agent-identity/src/lib.rs:95][E: codex-rs/agent-identity/src/lib.rs:283][E: codex-rs/agent-identity/src/lib.rs:288]

InstallContext 把 managed standalone resources 与 npm/bun/brew/other 区分开，使同一 Codex binary 能在 standalone 包中优先使用 bundled dependencies，同时在开发或包管理器环境中使用 PATH 上的默认工具。[I] 该结论由 standalone detection、resources_dir 和 `rg_command` standalone/default branches 支撑。[E: codex-rs/install-context/src/lib.rs:73][E: codex-rs/install-context/src/lib.rs:144][E: codex-rs/install-context/src/lib.rs:146][E: codex-rs/install-context/src/lib.rs:103][E: codex-rs/install-context/src/lib.rs:109][E: codex-rs/install-context/src/lib.rs:123]

## Gotchas

- runtime id mismatch 会让 `authorization_header_for_agent_task` 直接失败，避免用一个 agent key 为另一个 runtime 的 task 签名。[E: codex-rs/agent-identity/src/lib.rs:83][E: codex-rs/agent-identity/src/lib.rs:84]
- `normalize_chatgpt_base_url` 对 ChatGPT domains 的判断是 string prefix/contains；调用方不应假设这里做了 URL host parse 或 path normalization beyond suffix stripping。[I][E: codex-rs/agent-identity/src/lib.rs:245][E: codex-rs/agent-identity/src/lib.rs:247][E: codex-rs/agent-identity/src/lib.rs:249]
- standalone detection 要求 executable 的 release_dir 位于 canonical codex_home 的 `packages/standalone/releases` 下；不满足该 layout 会返回 `None` 并继续后续 install context detection。[E: codex-rs/install-context/src/lib.rs:73][E: codex-rs/install-context/src/lib.rs:74][E: codex-rs/install-context/src/lib.rs:76][E: codex-rs/install-context/src/lib.rs:79][E: codex-rs/install-context/src/lib.rs:83][E: codex-rs/install-context/src/lib.rs:86][E: codex-rs/install-context/src/lib.rs:132][E: codex-rs/install-context/src/lib.rs:133][E: codex-rs/install-context/src/lib.rs:135][E: codex-rs/install-context/src/lib.rs:136][E: codex-rs/install-context/src/lib.rs:137][E: codex-rs/install-context/src/lib.rs:138][E: codex-rs/install-context/src/lib.rs:139][E: codex-rs/install-context/src/lib.rs:140]

## Sources

- `codex-rs/agent-identity/src/lib.rs`
- `codex-rs/install-context/src/lib.rs`

## 相关

- `subsys.config-auth.auth-flows`: agent identity auth 是 `CodexAuth` 的一种 runtime auth 形态。
- `subsys.config-auth.credential-storage`: agent identity private key material 的持久化上下文。
- `subsys.cloud.cloud-tasks`: cloud backend task/account 操作与 agent task identity 相邻。
