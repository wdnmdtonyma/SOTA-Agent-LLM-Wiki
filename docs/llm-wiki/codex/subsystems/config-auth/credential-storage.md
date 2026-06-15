---
id: subsys.config-auth.credential-storage
title: 凭据存储
kind: subsystem
tier: T2
source: [codex-rs/login/src/auth/storage.rs, codex-rs/keyring-store/src/lib.rs, codex-rs/secrets/src/lib.rs, codex-rs/secrets/src/local.rs, codex-rs/secrets/src/sanitizer.rs, codex-rs/device-key/src/lib.rs, codex-rs/device-key/src/platform.rs]
symbols: [AuthDotJson, AuthStorageBackend, FileAuthStorage, KeyringAuthStorage, AutoAuthStorage, EphemeralAuthStorage, SecretsManager, LocalSecretsBackend, DeviceKeyStore]
related: [subsys.config-auth.auth-flows, config.auth-account, subsys.platform.agent-identity]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Codex 凭据存储由三层组成：login auth storage 保存 `AuthDotJson`，`secrets` crate 保存 scoped secret，`device-key` crate 管理设备签名 key；login auth storage 可在 file、keyring、auto 和 ephemeral backend 之间切换。[E: codex-rs/login/src/auth/storage.rs:29][E: codex-rs/login/src/auth/storage.rs:324][E: codex-rs/secrets/src/lib.rs:89][E: codex-rs/device-key/src/lib.rs:211]

## 能回答的问题

- `auth.json` 里保存哪些字段？
- file auth storage、keyring auth storage、auto auth storage 和 ephemeral auth storage 的行为差异是什么？
- keyring service/account key 怎样计算？
- local secret store 怎样加密、写入和列举 secret？
- device key store 为什么只允许 signing structured payload，而不是任意 bytes？

## 职责边界

credential-storage 节点覆盖 secret material 的持久化和 backend fallback，不覆盖 OAuth/device/API key login 的控制流；login flow 由 `subsys.config-auth.auth-flows` 说明。`AuthDotJson` 是 login 层落盘 schema，包含 `auth_mode`、序列化名为 `OPENAI_API_KEY` 的 API key、`tokens`、`last_refresh` 和 `agent_identity`。[E: codex-rs/login/src/auth/storage.rs:29][E: codex-rs/login/src/auth/storage.rs:33][E: codex-rs/login/src/auth/storage.rs:35][E: codex-rs/login/src/auth/storage.rs:39][E: codex-rs/login/src/auth/storage.rs:45]

## AuthDotJson 与 auth storage

`auth.json` 路径固定为 `codex_home/auth.json`。[E: codex-rs/login/src/auth/storage.rs:59][E: codex-rs/login/src/auth/storage.rs:61] `AuthStorageBackend` 只有三个同步操作：`load`、`save`、`delete`。[E: codex-rs/login/src/auth/storage.rs:72][E: codex-rs/login/src/auth/storage.rs:74][E: codex-rs/login/src/auth/storage.rs:75]

`FileAuthStorage::load` 在文件不存在时返回 `Ok(None)`，存在时按 JSON 反序列化；`save` 创建 parent dir、用 0600 mode 写 JSON 并 flush。[E: codex-rs/login/src/auth/storage.rs:88][E: codex-rs/login/src/auth/storage.rs:102][E: codex-rs/login/src/auth/storage.rs:111][E: codex-rs/login/src/auth/storage.rs:123] `delete_file_if_exists` 对 NotFound 视为成功。[E: codex-rs/login/src/auth/storage.rs:63][E: codex-rs/login/src/auth/storage.rs:68]

`KeyringAuthStorage` 使用 service 名 `Codex Auth`，并通过 canonicalized `codex_home` 的 SHA-256 生成 `cli|<hash>` store key。[E: codex-rs/login/src/auth/storage.rs:135][E: codex-rs/login/src/auth/storage.rs:137][E: codex-rs/login/src/auth/storage.rs:148] `AutoAuthStorage::load` 先读 keyring，失败或为空再 fallback 到 file；`save` 先写 keyring，失败则写 file。[E: codex-rs/login/src/auth/storage.rs:240][E: codex-rs/login/src/auth/storage.rs:246][E: codex-rs/login/src/auth/storage.rs:252][E: codex-rs/login/src/auth/storage.rs:256]

`EphemeralAuthStorage` 用内存 map 按 `codex_home` 保存 auth，适合外部 auth 或测试形态，不会持久化到磁盘。[E: codex-rs/login/src/auth/storage.rs:268][E: codex-rs/login/src/auth/storage.rs:277][E: codex-rs/login/src/auth/storage.rs:294]

## Keyring store abstraction

`codex-rs/keyring-store` 把平台 keyring 封装成 `KeyringStore` trait，暴露 `load`、`save`、`delete` 三个操作。[E: codex-rs/keyring-store/src/lib.rs:41][E: codex-rs/keyring-store/src/lib.rs:43][E: codex-rs/keyring-store/src/lib.rs:45] `DefaultKeyringStore` 每次操作都创建 `keyring::Entry`，并在 trait 方法内部调用底层 `get_password`、`set_password`、`delete_credential`。[E: codex-rs/keyring-store/src/lib.rs:51][E: codex-rs/keyring-store/src/lib.rs:55][E: codex-rs/keyring-store/src/lib.rs:77][E: codex-rs/keyring-store/src/lib.rs:92]

## Secrets subsystem

`SecretName::new` 要求 secret name 非空，并且每个字符只能是 `A-Z`、`0-9` 或 `_`。[E: codex-rs/secrets/src/lib.rs:28][E: codex-rs/secrets/src/lib.rs:34][E: codex-rs/secrets/src/lib.rs:35] `SecretScope` 支持 `Global` 和 `Environment(String)`，并通过 `SecretsManager` 委托给 backend。[E: codex-rs/secrets/src/lib.rs:51][E: codex-rs/secrets/src/lib.rs:54][E: codex-rs/secrets/src/lib.rs:97][E: codex-rs/secrets/src/lib.rs:125]

`LocalSecretsBackend` 把密文文件名固定为 `local.age`，保存结构包含 `version` 和 `secrets` map。[E: codex-rs/secrets/src/local.rs:36][E: codex-rs/secrets/src/local.rs:40][E: codex-rs/secrets/src/local.rs:42] `set`、`get`、`delete`、`list` 都先加载当前 secret map，再按 scope/name 读写。[E: codex-rs/secrets/src/local.rs:68][E: codex-rs/secrets/src/local.rs:76][E: codex-rs/secrets/src/local.rs:82][E: codex-rs/secrets/src/local.rs:92] 保存时会 encrypt，再用 atomic write 写入目标路径。[E: codex-rs/secrets/src/local.rs:146][E: codex-rs/secrets/src/local.rs:153][E: codex-rs/secrets/src/local.rs:155]

`environment_id_from_cwd` 优先使用 Git repo root 的目录名；没有 repo root/name 时，才用 canonicalized cwd 的 SHA-256 短 hash 生成 `cwd-<hash>`。[E: codex-rs/secrets/src/lib.rs:142][E: codex-rs/secrets/src/lib.rs:148][E: codex-rs/secrets/src/lib.rs:152][E: codex-rs/secrets/src/lib.rs:162] keyring account helpers 使用 `codex` service 和 `secrets|<hash>` account，`LocalSecretsBackend::load_or_create_passphrase` 会用这些 helper 保存 secret-store passphrase。[E: codex-rs/secrets/src/lib.rs:165][E: codex-rs/secrets/src/lib.rs:176][E: codex-rs/secrets/src/lib.rs:179][E: codex-rs/secrets/src/local.rs:173] sanitizer 会用 regex redact 常见 token、API key 和 bearer token patterns。[E: codex-rs/secrets/src/sanitizer.rs:4][E: codex-rs/secrets/src/sanitizer.rs:13]

## Device key subsystem

`DeviceKeyStore` 默认使用 platform provider；public API 是 `create`、`get_public` 和 `sign`。[E: codex-rs/device-key/src/lib.rs:211][E: codex-rs/device-key/src/lib.rs:224][E: codex-rs/device-key/src/lib.rs:235][E: codex-rs/device-key/src/lib.rs:243] provider trait 是 private，并且源码注释要求 provider implementation 不能在 crate 外暴露 generic arbitrary-byte signing API；crate 会先验证并序列化 accepted structured payload，再调用 provider `sign`。[E: codex-rs/device-key/src/lib.rs:281][E: codex-rs/device-key/src/lib.rs:283][E: codex-rs/device-key/src/lib.rs:297]

`DeviceKeyStore` 校验 key id 必须是该 crate 生成的 `dk_*_` namespace 形状、长度匹配，并且 suffix 能按 unpadded base64url 解码为固定随机字节长度；payload 还必须符合 binding 与 remote connection/enrollment 的结构化校验。[E: codex-rs/device-key/src/lib.rs:332][E: codex-rs/device-key/src/lib.rs:337][E: codex-rs/device-key/src/lib.rs:340][E: codex-rs/device-key/src/lib.rs:345][E: codex-rs/device-key/src/lib.rs:369][E: codex-rs/device-key/src/lib.rs:408][E: codex-rs/device-key/src/lib.rs:445] 当前 default platform provider 的 `create` 会返回 `HardwareBackedKeysUnavailable`，`get_public`/`binding`/`sign` 会返回 `KeyNotFound`。[E: codex-rs/device-key/src/platform.rs:10][E: codex-rs/device-key/src/platform.rs:24][E: codex-rs/device-key/src/platform.rs:32][E: codex-rs/device-key/src/platform.rs:40][E: codex-rs/device-key/src/platform.rs:49]

## 设计动机与权衡

`AutoAuthStorage` 的 keyring-first/file-fallback 让支持 keyring 的平台优先走 OS credential store，同时保留无 keyring 环境的可用性。[I] 该行为由 `AutoAuthStorage::load` 和 `AutoAuthStorage::save` 中的 fallback 分支直接体现。[E: codex-rs/login/src/auth/storage.rs:240][E: codex-rs/login/src/auth/storage.rs:256]

device key provider 不暴露 arbitrary-byte signing，是为了把可签名内容绑定到 Codex 认可的 typed payload，降低密钥被滥用为通用签名 oracle 的风险。[I] 该动机由 provider trait 注释要求 implementation 不在 crate 外暴露 generic arbitrary-byte signing API，并由 `validate_payload` 在 provider 看到 bytes 前检查 payload shape 支撑。[E: codex-rs/device-key/src/lib.rs:283][E: codex-rs/device-key/src/lib.rs:393][E: codex-rs/device-key/src/lib.rs:397]

## Gotchas

- keyring auth storage 的 account key 与 canonicalized `codex_home` 绑定；移动 `codex_home` 可能导致 keyring account key 变化。[I]
- `FileAuthStorage::save` 使用 0600 mode，但这只覆盖 Unix permissions 语义；跨平台权限细节由 Rust/OpenOptionsExt 条件编译和平台 filesystem 处理。[I]
- `secrets` local store 的 passphrase 会保存在 keyring；如果 keyring 不可用，local secret store 的具体失败行为要沿 `LocalSecretsBackend::load_or_create_passphrase` 调用链判断。[E: codex-rs/secrets/src/local.rs:159][E: codex-rs/secrets/src/local.rs:173]

## Sources

- `codex-rs/login/src/auth/storage.rs`
- `codex-rs/keyring-store/src/lib.rs`
- `codex-rs/secrets/src/lib.rs`
- `codex-rs/secrets/src/local.rs`
- `codex-rs/secrets/src/sanitizer.rs`
- `codex-rs/device-key/src/lib.rs`
- `codex-rs/device-key/src/platform.rs`

## 相关

- `subsys.config-auth.auth-flows`: auth storage 的写入来源。
- `config.auth-account`: auth storage mode 与 account restriction 配置。
- `subsys.platform.agent-identity`: agent identity 如何保存私钥材料并生成 assertion。
