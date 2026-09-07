---
id: subsys.coding-agent.auth-storage
title: 凭证持久化与运行时覆盖
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/auth-storage.ts
  - packages/coding-agent/src/core/runtime-credentials.ts
  - packages/ai/src/auth/types.ts
symbols:
  - AuthStorage
  - FileAuthStorageBackend
  - RuntimeCredentials
  - readStoredCredential
related:
  - surface.providers.auth
  - subsys.coding-agent.model-registry
  - subsys.ai.credential-store
evidence: explicit
status: verified
updated: 9767ba275f
---

> `AuthStorage` 是 coding-agent 对 `pi-ai` `CredentialStore` 的持久化实现；临时 `--api-key` 已拆到 `RuntimeCredentials`，provider auth 解析、OAuth 刷新与登录编排则属于 `ModelRuntime`/`pi-ai Models`。

## 能回答的问题

- `auth.json` 保存什么，默认在哪里，权限与跨进程锁是什么？
- `CredentialStore.modify()` 为何是唯一写入入口？
- stored API key 中的命令/环境模板何时解析？
- runtime API key 是否写入 `auth.json`？
- 哪些旧 `AuthStorage` API 已从当前实现移走？

## 数据与接口边界

`auth.json` 是以 provider id 为 key、每个 provider 一个 type-tagged credential 的对象；`Credential` 是 `ApiKeyCredential | OAuthCredential`，前者可带 `key` 与 provider-scoped `env`，后者带 refresh/access/expiry 字段 [E: packages/ai/src/auth/types.ts:17] [E: packages/ai/src/auth/types.ts:18] [E: packages/ai/src/auth/types.ts:20] [E: packages/ai/src/auth/types.ts:24] [E: packages/ai/src/auth/types.ts:25] [E: packages/ai/src/auth/types.ts:26] [E: packages/ai/src/auth/types.ts:27] [E: packages/ai/src/auth/types.ts:32] [E: packages/ai/src/auth/types.ts:33] [E: packages/ai/src/auth/types.ts:37]。

`CredentialStore` 暴露 `read`、不泄露 secret 的 `list`、序列化 read-modify-write 的 `modify` 和删除 credential 的 `delete` [E: packages/ai/src/auth/types.ts:65] [E: packages/ai/src/auth/types.ts:65] [E: packages/ai/src/auth/types.ts:70] [E: packages/ai/src/auth/types.ts:86] [E: packages/ai/src/auth/types.ts:90] [E: packages/ai/src/auth/types.ts:87]。OAuth refresh 需要在 `modify` 锁内重读当前 credential，因而持久层只提供原子存储原语，不再自己实现 provider-specific refresh [I]。

## 文件后端

`FileAuthStorageBackend` 默认把路径设为 `getAgentDir()/auth.json` 并规范化；创建父目录时使用 `0o700`。[E: packages/coding-agent/src/core/auth-storage.ts:49] [E: packages/coding-agent/src/core/auth-storage.ts:52] [E: packages/coding-agent/src/core/auth-storage.ts:56] [E: packages/coding-agent/src/core/auth-storage.ts:59] `AUTH_FILE_WRITE_OPTIONS` 带 `mode: 0o600`, 但这个 mode **只在创建文件时生效**; 之后 `writeFileSync` 不再 `chmodSync`, 以免覆盖管理员设好的权限和 ACL。[E: packages/coding-agent/src/core/auth-storage.ts:25] [E: packages/coding-agent/src/core/auth-storage.ts:25] [E: packages/coding-agent/src/core/auth-storage.ts:65] [E: packages/coding-agent/src/core/auth-storage.ts:106] 读回 JSON 时用 `stripBom()`, 避免 UTF-8 BOM 让 parse 失败。[E: packages/coding-agent/src/core/auth-storage.ts:366] [E: packages/coding-agent/src/core/auth-storage.ts:501]

同步路径最多重试十次 `ELOCKED`，每次间隔 20ms；拿到锁后读取当前 JSON，由 callback 返回 `{ result, next }`，只有 `next` 存在时才写回，并在 `finally` 释放锁 [E: packages/coding-agent/src/core/auth-storage.ts:69] [E: packages/coding-agent/src/core/auth-storage.ts:70] [E: packages/coding-agent/src/core/auth-storage.ts:71] [E: packages/coding-agent/src/core/auth-storage.ts:74] [E: packages/coding-agent/src/core/auth-storage.ts:76] [E: packages/coding-agent/src/core/auth-storage.ts:82] [E: packages/coding-agent/src/core/auth-storage.ts:96] [E: packages/coding-agent/src/core/auth-storage.ts:102] [E: packages/coding-agent/src/core/auth-storage.ts:103] [E: packages/coding-agent/src/core/auth-storage.ts:104] [E: packages/coding-agent/src/core/auth-storage.ts:106] [E: packages/coding-agent/src/core/auth-storage.ts:111]。

异步路径使用 retry/backoff、30 秒 stale threshold 和 compromised callback；读前、写前、返回前都会检查 lock 是否已 compromised [E: packages/coding-agent/src/core/auth-storage.ts:111] [E: packages/coding-agent/src/core/auth-storage.ts:128] [E: packages/coding-agent/src/core/auth-storage.ts:130] [E: packages/coding-agent/src/core/auth-storage.ts:132] [E: packages/coding-agent/src/core/auth-storage.ts:132] [E: packages/coding-agent/src/core/auth-storage.ts:136] [E: packages/coding-agent/src/core/auth-storage.ts:176] [E: packages/coding-agent/src/core/auth-storage.ts:180] [E: packages/coding-agent/src/core/auth-storage.ts:184] [E: packages/coding-agent/src/core/auth-storage.ts:189]。`InMemoryAuthStorageBackend` 提供相同接口，适合 SDK/tests 注入 [E: packages/coding-agent/src/core/auth-storage.ts:292] [E: packages/coding-agent/src/core/auth-storage.ts:296] [E: packages/coding-agent/src/core/auth-storage.ts:176]。

## AuthStorage 控制流

`AuthStorage.create()` 选择文件后端，`fromStorage()` 接受任意 backend，`inMemory()` 先写入初始 JSON 再复用 `fromStorage()` [E: packages/coding-agent/src/core/auth-storage.ts:347] [E: packages/coding-agent/src/core/auth-storage.ts:352] [E: packages/coding-agent/src/core/auth-storage.ts:356] [E: packages/coding-agent/src/core/auth-storage.ts:359]。constructor 并不总是 `reload()`: 当 `authPath` 已设且 `getFileRevision(authPath)` 与共享 `AuthFileReadState.revision` 相等时直接 return; 否则才 `reload()`。reload 失败时保留上一个有效的内存快照 [E: packages/coding-agent/src/core/auth-storage.ts:332] [E: packages/coding-agent/src/core/auth-storage.ts:340] [E: packages/coding-agent/src/core/auth-storage.ts:341] [E: packages/coding-agent/src/core/auth-storage.ts:342] [E: packages/coding-agent/src/core/auth-storage.ts:344] [E: packages/coding-agent/src/core/auth-storage.ts:377] [E: packages/coding-agent/src/core/auth-storage.ts:387]。

`read(provider)` 走 `readLatestData()`: 无 `authPath` 时总是从 storage reload; 有 path 时仅当 file revision 与缓存不同才 reload。API-key credential 会在返回前通过 `resolveConfigValue(key, env)` 展开命令/环境配置，OAuth credential 原样返回 [E: packages/coding-agent/src/core/auth-storage.ts:401] [E: packages/coding-agent/src/core/auth-storage.ts:403] [E: packages/coding-agent/src/core/auth-storage.ts:407] [E: packages/coding-agent/src/core/auth-storage.ts:408] [E: packages/coding-agent/src/core/auth-storage.ts:441] [E: packages/coding-agent/src/core/auth-storage.ts:442] [E: packages/coding-agent/src/core/auth-storage.ts:444] [E: packages/coding-agent/src/core/auth-storage.ts:446]。

`modify(provider, fn)` 在异步锁内重读全量 JSON，把当前 provider 交给 callback；callback 返回 `undefined` 表示不改，返回 credential 才合并并写回 pretty JSON [E: packages/coding-agent/src/core/auth-storage.ts:449] [E: packages/coding-agent/src/core/auth-storage.ts:393] [E: packages/coding-agent/src/core/auth-storage.ts:457] [E: packages/coding-agent/src/core/auth-storage.ts:458] [E: packages/coding-agent/src/core/auth-storage.ts:459] [E: packages/coding-agent/src/core/auth-storage.ts:465] [E: packages/coding-agent/src/core/auth-storage.ts:467]。`delete()` 同样在锁内重读、删除单个 provider 并写回；`list()` 只返回 provider id 与 credential type [E: packages/coding-agent/src/core/auth-storage.ts:304] [E: packages/coding-agent/src/core/auth-storage.ts:475] [E: packages/coding-agent/src/core/auth-storage.ts:477] [E: packages/coding-agent/src/core/auth-storage.ts:479] [E: packages/coding-agent/src/core/auth-storage.ts:315] [E: packages/coding-agent/src/core/auth-storage.ts:394]。

`readStoredCredential()` 是无需构造 store 的一次性同步读取，它不解析配置值，读文件或 JSON 失败时返回 `undefined` [E: packages/coding-agent/src/core/auth-storage.ts:496] [E: packages/coding-agent/src/core/auth-storage.ts:498] [E: packages/coding-agent/src/core/auth-storage.ts:501] [E: packages/coding-agent/src/core/auth-storage.ts:502] [E: packages/coding-agent/src/core/auth-storage.ts:504]。

## 运行时覆盖与迁移结论

`RuntimeCredentials` 把底层 store 与内存 `overrides` map 组合：`setRuntimeApiKey()` 只写 map，`read()` 优先返回 runtime key，否则委托底层 store；`list()` 会把 runtime provider 覆盖成非 secret metadata [E: packages/coding-agent/src/core/runtime-credentials.ts:4] [E: packages/coding-agent/src/core/runtime-credentials.ts:6] [E: packages/coding-agent/src/core/runtime-credentials.ts:12] [E: packages/coding-agent/src/core/runtime-credentials.ts:13] [E: packages/coding-agent/src/core/runtime-credentials.ts:24] [E: packages/coding-agent/src/core/runtime-credentials.ts:26] [E: packages/coding-agent/src/core/runtime-credentials.ts:26] [E: packages/coding-agent/src/core/runtime-credentials.ts:27] [E: packages/coding-agent/src/core/runtime-credentials.ts:34]。因此 CLI `--api-key` 不会持久化；`delete()` 同时清掉 runtime override 与 stored credential [E: packages/coding-agent/src/core/runtime-credentials.ts:44] [E: packages/coding-agent/src/core/runtime-credentials.ts:50] [E: packages/coding-agent/src/core/runtime-credentials.ts:44]。

相对旧版本，`setRuntimeApiKey`、`getApiKey`、`getAuthStatus`、OAuth login/refresh 和 environment fallback 已不在 `AuthStorage`。当前边界是：storage 管原子 credential persistence，runtime overlay 管临时 key，`pi-ai Models`/`ModelRuntime` 管 auth 解析与刷新 [I]。写入 `auth.json` 不再在每次 write 后 `chmod 0o600`；已存在文件的 mode/ACL 保持原样，只有新建时带 `mode: 0o600`。[E: packages/coding-agent/src/core/auth-storage.ts:25] [E: packages/coding-agent/src/core/auth-storage.ts:65] [E: packages/coding-agent/src/core/auth-storage.ts:106]

## Sources

- `packages/coding-agent/src/core/auth-storage.ts`
- `packages/coding-agent/src/core/runtime-credentials.ts`
- `packages/ai/src/auth/types.ts`

## 相关

- [surface.providers.auth](../../surface/providers/auth.md) - 用户可见的 `/login`、`/logout`、认证方式选择与请求优先级。
- [subsys.coding-agent.model-registry](model-registry.md) - `ModelRuntime` 如何消费 store、合成 provider、刷新 availability 并准备请求。
- [subsys.ai.credential-store](../ai/credential-store.md) - `CredentialStore` 与 OAuth refresh 的 ai 层协议。
