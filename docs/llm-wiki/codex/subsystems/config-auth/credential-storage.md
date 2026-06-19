---
id: subsys.config-auth.credential-storage
title: 凭据存储
kind: subsystem
tier: T2
source: [codex-rs/login/src/auth/storage.rs, codex-rs/keyring-store/src/lib.rs, codex-rs/secrets/src/lib.rs, codex-rs/secrets/src/local.rs, codex-rs/secrets/src/sanitizer.rs, codex-rs/config/src/types.rs, codex-rs/core/src/config/auth_keyring.rs, codex-rs/core/src/config/mod.rs]
symbols: [AuthDotJson, AuthStorageBackend, FileAuthStorage, DirectKeyringAuthStorage, SecretsKeyringAuthStorage, AutoAuthStorage, EphemeralAuthStorage, AuthKeyringBackendKind, SecretsManager, LocalSecretsBackend, LocalSecretsNamespace]
related: [subsys.config-auth.auth-flows, config.auth-account, subsys.platform.agent-identity]
evidence: explicit
status: verified
updated: 5670360009
---

> Codex 凭据存储由 login auth storage、keyring-store 和 secrets 三层组成：`AuthDotJson` 是 CLI auth schema，auth storage 可在 file、keyring、auto、ephemeral mode 间切换；keyring mode 再按 `AuthKeyringBackendKind` 选择直接 OS keyring 或本地加密 secrets 文件。[E: codex-rs/login/src/auth/storage.rs:40][E: codex-rs/config/src/types.rs:86][E: codex-rs/config/src/types.rs:89][E: codex-rs/config/src/types.rs:119][E: codex-rs/login/src/auth/storage.rs:479]

## 能回答的问题

- `auth.json` 里保存哪些字段？
- file、direct keyring、secrets keyring、auto 和 ephemeral auth storage 的行为差异是什么？
- keyring service/account key 怎样计算？
- SecretAuthStorage feature 怎样切换 keyring backend？
- local secret store 怎样加密、写入和列举 secret？

## 职责边界

credential-storage 节点覆盖 secret material 的持久化和 backend fallback，不覆盖 OAuth/device-code/API key login 的控制流；login flow 由 `subsys.config-auth.auth-flows` 说明。`AuthDotJson` 是 login 层 schema，当前字段包含 `auth_mode`、序列化名为 `OPENAI_API_KEY` 的 API key、`tokens`、`last_refresh`、`agent_identity`、`personal_access_token` 和 `bedrock_api_key`。[E: codex-rs/login/src/auth/storage.rs:38][E: codex-rs/login/src/auth/storage.rs:40][E: codex-rs/login/src/auth/storage.rs:42][E: codex-rs/login/src/auth/storage.rs:45][E: codex-rs/login/src/auth/storage.rs:48][E: codex-rs/login/src/auth/storage.rs:51][E: codex-rs/login/src/auth/storage.rs:54][E: codex-rs/login/src/auth/storage.rs:57][E: codex-rs/login/src/auth/storage.rs:60]

## AuthDotJson 与 auth storage

`auth.json` 路径固定为 `codex_home/auth.json`。[E: codex-rs/login/src/auth/storage.rs:97][E: codex-rs/login/src/auth/storage.rs:98] `AuthStorageBackend` 只有三个同步操作：`load`、`save`、`delete`。[E: codex-rs/login/src/auth/storage.rs:110][E: codex-rs/login/src/auth/storage.rs:111][E: codex-rs/login/src/auth/storage.rs:112][E: codex-rs/login/src/auth/storage.rs:113]

`FileAuthStorage::load` 在文件不存在时返回 `Ok(None)`，存在时按 JSON 反序列化；`save` 创建 parent dir、用 0600 mode 写 JSON 并 flush。[E: codex-rs/login/src/auth/storage.rs:138][E: codex-rs/login/src/auth/storage.rs:141][E: codex-rs/login/src/auth/storage.rs:143][E: codex-rs/login/src/auth/storage.rs:149][E: codex-rs/login/src/auth/storage.rs:153][E: codex-rs/login/src/auth/storage.rs:160][E: codex-rs/login/src/auth/storage.rs:163][E: codex-rs/login/src/auth/storage.rs:164] `delete_file_if_exists` 对 NotFound 视为成功。[E: codex-rs/login/src/auth/storage.rs:101][E: codex-rs/login/src/auth/storage.rs:104][E: codex-rs/login/src/auth/storage.rs:105]

`DirectKeyringAuthStorage` 使用 service 名 `Codex Auth`，并通过 canonicalized `codex_home` 的 SHA-256 生成 `cli|<hash>` store key。[E: codex-rs/login/src/auth/storage.rs:178][E: codex-rs/login/src/auth/storage.rs:181][E: codex-rs/login/src/auth/storage.rs:183][E: codex-rs/login/src/auth/storage.rs:187][E: codex-rs/login/src/auth/storage.rs:191] 它从 keyring 读取 serialized `AuthDotJson`，保存成功后删除 file fallback，删除时同时删除 keyring entry 和 `auth.json`。[E: codex-rs/login/src/auth/storage.rs:208][E: codex-rs/login/src/auth/storage.rs:209][E: codex-rs/login/src/auth/storage.rs:210][E: codex-rs/login/src/auth/storage.rs:244][E: codex-rs/login/src/auth/storage.rs:247][E: codex-rs/login/src/auth/storage.rs:249][E: codex-rs/login/src/auth/storage.rs:255][E: codex-rs/login/src/auth/storage.rs:263][E: codex-rs/login/src/auth/storage.rs:264]

`SecretsKeyringAuthStorage` 组合 direct keyring storage 与 `SecretsManager`，并使用 `LocalSecretsNamespace::CodexAuth`；它把 serialized auth 存为 `SecretScope::Global` 下的 `CODEX_AUTH` secret，保存后删除 file fallback，删除时还清理 direct keyring fallback。[E: codex-rs/login/src/auth/storage.rs:269][E: codex-rs/login/src/auth/storage.rs:271][E: codex-rs/login/src/auth/storage.rs:272][E: codex-rs/login/src/auth/storage.rs:283][E: codex-rs/login/src/auth/storage.rs:287][E: codex-rs/login/src/auth/storage.rs:291][E: codex-rs/login/src/auth/storage.rs:301][E: codex-rs/login/src/auth/storage.rs:305][E: codex-rs/login/src/auth/storage.rs:320][E: codex-rs/login/src/auth/storage.rs:323][E: codex-rs/login/src/auth/storage.rs:330][E: codex-rs/login/src/auth/storage.rs:336][E: codex-rs/login/src/auth/storage.rs:339][E: codex-rs/login/src/auth/storage.rs:346]

`AutoAuthStorage::load` 先读 keyring storage，失败或为空再 fallback 到 file；`save` 先写 keyring storage，失败则写 file。[E: codex-rs/login/src/auth/storage.rs:352][E: codex-rs/login/src/auth/storage.rs:375][E: codex-rs/login/src/auth/storage.rs:376][E: codex-rs/login/src/auth/storage.rs:378][E: codex-rs/login/src/auth/storage.rs:380][E: codex-rs/login/src/auth/storage.rs:386][E: codex-rs/login/src/auth/storage.rs:387][E: codex-rs/login/src/auth/storage.rs:390][E: codex-rs/login/src/auth/storage.rs:391] `EphemeralAuthStorage` 用进程内全局 map 按 `compute_store_key(codex_home)` 保存 auth，不写磁盘或 OS keyring。[E: codex-rs/login/src/auth/storage.rs:403][E: codex-rs/login/src/auth/storage.rs:420][E: codex-rs/login/src/auth/storage.rs:430][E: codex-rs/login/src/auth/storage.rs:435][E: codex-rs/login/src/auth/storage.rs:441]

`create_auth_storage_with_store` 按 `AuthCredentialsStoreMode::{File,Keyring,Auto,Ephemeral}` 分派；`create_keyring_auth_storage` 再把 keyring mode 分派到 `DirectKeyringAuthStorage` 或 `SecretsKeyringAuthStorage`。[E: codex-rs/login/src/auth/storage.rs:454][E: codex-rs/login/src/auth/storage.rs:460][E: codex-rs/login/src/auth/storage.rs:461][E: codex-rs/login/src/auth/storage.rs:462][E: codex-rs/login/src/auth/storage.rs:465][E: codex-rs/login/src/auth/storage.rs:470][E: codex-rs/login/src/auth/storage.rs:474][E: codex-rs/login/src/auth/storage.rs:479][E: codex-rs/login/src/auth/storage.rs:481][E: codex-rs/login/src/auth/storage.rs:484]

## Keyring store abstraction

`codex-rs/keyring-store` 把平台 keyring 封装成 `KeyringStore` trait，暴露 `load`、`save`、`delete` 三个操作。[E: codex-rs/keyring-store/src/lib.rs:42][E: codex-rs/keyring-store/src/lib.rs:43][E: codex-rs/keyring-store/src/lib.rs:45] `DefaultKeyringStore` 每次操作都创建 `keyring::Entry`，并在 trait 方法内部调用底层 `get_password`、`set_password`、`delete_credential`。[E: codex-rs/keyring-store/src/lib.rs:51][E: codex-rs/keyring-store/src/lib.rs:55][E: codex-rs/keyring-store/src/lib.rs:77][E: codex-rs/keyring-store/src/lib.rs:92]

`AuthKeyringBackendKind` 有 `Direct` 和 `Secrets` 两种；默认值在 Windows 上是 `Secrets`，其他平台是 `Direct`。[E: codex-rs/config/src/types.rs:116][E: codex-rs/config/src/types.rs:119][E: codex-rs/config/src/types.rs:121][E: codex-rs/config/src/types.rs:123][E: codex-rs/config/src/types.rs:126][E: codex-rs/config/src/types.rs:128][E: codex-rs/config/src/types.rs:131] runtime config 的 `auth_keyring_backend_kind()` 不直接用这个 default，而是由 `SecretAuthStorage` feature 决定：开启时返回 `Secrets`，关闭时返回 `Direct`。[E: codex-rs/core/src/config/auth_keyring.rs:10][E: codex-rs/core/src/config/auth_keyring.rs:11][E: codex-rs/core/src/config/auth_keyring.rs:13][E: codex-rs/core/src/config/auth_keyring.rs:47][E: codex-rs/core/src/config/auth_keyring.rs:50][E: codex-rs/core/src/config/auth_keyring.rs:53]

## Secrets subsystem

`SecretName::new` 要求 secret name 非空，并且每个字符只能是 `A-Z`、`0-9` 或 `_`。[E: codex-rs/secrets/src/lib.rs:28][E: codex-rs/secrets/src/lib.rs:34][E: codex-rs/secrets/src/lib.rs:35] `SecretScope` 支持 `Global` 和 `Environment(String)`，并通过 `SecretsManager` 委托给 backend。[E: codex-rs/secrets/src/lib.rs:53][E: codex-rs/secrets/src/lib.rs:54][E: codex-rs/secrets/src/lib.rs:98][E: codex-rs/secrets/src/lib.rs:126]

`LocalSecretsNamespace` 选择本地加密文件：managed secrets 写 `local.age`，CLI auth 写 `codex_auth.age`，MCP OAuth 写 `mcp_oauth.age`。[E: codex-rs/secrets/src/local.rs:36][E: codex-rs/secrets/src/local.rs:37][E: codex-rs/secrets/src/local.rs:38][E: codex-rs/secrets/src/local.rs:39][E: codex-rs/secrets/src/local.rs:41][E: codex-rs/secrets/src/local.rs:43][E: codex-rs/secrets/src/local.rs:47][E: codex-rs/secrets/src/local.rs:49][E: codex-rs/secrets/src/local.rs:142][E: codex-rs/secrets/src/local.rs:144][E: codex-rs/secrets/src/local.rs:145][E: codex-rs/secrets/src/local.rs:146]

`LocalSecretsBackend` 的保存结构包含 `version` 和 `secrets` map；`set`、`get`、`delete`、`list` 都先加载当前 secret map，再按 scope/name 读写。[E: codex-rs/secrets/src/local.rs:54][E: codex-rs/secrets/src/local.rs:55][E: codex-rs/secrets/src/local.rs:56][E: codex-rs/secrets/src/local.rs:96][E: codex-rs/secrets/src/local.rs:99][E: codex-rs/secrets/src/local.rs:100][E: codex-rs/secrets/src/local.rs:104][E: codex-rs/secrets/src/local.rs:106][E: codex-rs/secrets/src/local.rs:110][E: codex-rs/secrets/src/local.rs:112][E: codex-rs/secrets/src/local.rs:120][E: codex-rs/secrets/src/local.rs:121] 保存时会从 keyring 读取或创建 passphrase、encrypt 后 atomic write；passphrase 是 32 bytes random 再 base64 编码。[E: codex-rs/secrets/src/local.rs:179][E: codex-rs/secrets/src/local.rs:184][E: codex-rs/secrets/src/local.rs:186][E: codex-rs/secrets/src/local.rs:188][E: codex-rs/secrets/src/local.rs:192][E: codex-rs/secrets/src/local.rs:196][E: codex-rs/secrets/src/local.rs:205][E: codex-rs/secrets/src/local.rs:207][E: codex-rs/secrets/src/local.rs:313][E: codex-rs/secrets/src/local.rs:314][E: codex-rs/secrets/src/local.rs:319]

`environment_id_from_cwd` 优先使用 Git repo root 的目录名；没有 repo root/name 时，才用 canonicalized cwd 的 SHA-256 短 hash 生成 `cwd-<hash>`。[E: codex-rs/secrets/src/lib.rs:159][E: codex-rs/secrets/src/lib.rs:160][E: codex-rs/secrets/src/lib.rs:164][E: codex-rs/secrets/src/lib.rs:169][E: codex-rs/secrets/src/lib.rs:174][E: codex-rs/secrets/src/lib.rs:179] keyring account helpers 使用 `codex` service 和 `secrets|<hash>` account，`LocalSecretsBackend::load_or_create_passphrase` 会用这些 helper 保存 secret-store passphrase。[E: codex-rs/secrets/src/lib.rs:23][E: codex-rs/secrets/src/lib.rs:182][E: codex-rs/secrets/src/lib.rs:183][E: codex-rs/secrets/src/lib.rs:194][E: codex-rs/secrets/src/lib.rs:197][E: codex-rs/secrets/src/local.rs:192][E: codex-rs/secrets/src/local.rs:193][E: codex-rs/secrets/src/local.rs:196][E: codex-rs/secrets/src/local.rs:207] sanitizer 会用 regex redact OpenAI key、AWS access key、bearer token 和常见 secret assignment pattern。[E: codex-rs/secrets/src/sanitizer.rs:4][E: codex-rs/secrets/src/sanitizer.rs:5][E: codex-rs/secrets/src/sanitizer.rs:7][E: codex-rs/secrets/src/sanitizer.rs:9][E: codex-rs/secrets/src/sanitizer.rs:16][E: codex-rs/secrets/src/sanitizer.rs:19]

## 设计动机与权衡

`AutoAuthStorage` 的 keyring-first/file-fallback 让支持 keyring 的平台优先走 OS credential store，同时保留无 keyring 环境的可用性。[I] 该行为由 `AutoAuthStorage::load` 和 `AutoAuthStorage::save` 中的 fallback 分支直接体现。[E: codex-rs/login/src/auth/storage.rs:375][E: codex-rs/login/src/auth/storage.rs:378][E: codex-rs/login/src/auth/storage.rs:386][E: codex-rs/login/src/auth/storage.rs:390]

`SecretsKeyringAuthStorage` 把 auth payload 放进 age 加密文件、只把 passphrase 放进 OS keyring，降低了直接在 keyring value 中保存整段 serialized auth 的依赖面；这是由 `AuthKeyringBackendKind::Secrets` 的注释、`SecretsKeyringAuthStorage::new` 的 namespace 选择和 `LocalSecretsBackend::load_or_create_passphrase` 的 keyring 用法共同支撑的推断。[I][E: codex-rs/config/src/types.rs:122][E: codex-rs/login/src/auth/storage.rs:287][E: codex-rs/login/src/auth/storage.rs:291][E: codex-rs/secrets/src/local.rs:192][E: codex-rs/secrets/src/local.rs:196][E: codex-rs/secrets/src/local.rs:207]

## Gotchas

- keyring auth storage 的 account key 与 canonicalized `codex_home` 绑定；移动 `codex_home` 可能导致 keyring account key 变化。[I]
- `FileAuthStorage::save` 使用 0600 mode，但这只覆盖 Unix permissions 语义；跨平台权限细节由 Rust/OpenOptionsExt 条件编译和平台 filesystem 处理。[I]
- local dev build 会把 configured `Keyring`/`Auto` CLI auth storage 解析成 `File`，这会绕过 keyring 与 secrets backend。[E: codex-rs/core/src/config/mod.rs:280][E: codex-rs/core/src/config/mod.rs:284][E: codex-rs/core/src/config/mod.rs:286][E: codex-rs/core/src/config/mod.rs:288][E: codex-rs/core/src/config/mod.rs:3639][E: codex-rs/core/src/config/mod.rs:3640]
- `ChatgptAuthTokens` 形态会强制使用 `Ephemeral` storage，不跟随配置的 auth credentials store mode。[E: codex-rs/login/src/auth/manager.rs:1247][E: codex-rs/login/src/auth/manager.rs:1251][E: codex-rs/login/src/auth/manager.rs:1252]
- `secrets` local store 的 passphrase 会保存在 keyring；如果 keyring 不可用，local secret store 的具体失败行为要沿 `LocalSecretsBackend::load_or_create_passphrase` 调用链判断。[E: codex-rs/secrets/src/local.rs:192][E: codex-rs/secrets/src/local.rs:196][E: codex-rs/secrets/src/local.rs:207][E: codex-rs/secrets/src/local.rs:208]

## Sources

- `codex-rs/login/src/auth/storage.rs`
- `codex-rs/keyring-store/src/lib.rs`
- `codex-rs/secrets/src/lib.rs`
- `codex-rs/secrets/src/local.rs`
- `codex-rs/secrets/src/sanitizer.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/core/src/config/auth_keyring.rs`
- `codex-rs/core/src/config/mod.rs`

## 相关

- `subsys.config-auth.auth-flows`: auth storage 的写入来源。
- `config.auth-account`: auth storage mode 与 account restriction 配置。
- `subsys.platform.agent-identity`: agent identity 如何保存私钥材料并生成 assertion。
