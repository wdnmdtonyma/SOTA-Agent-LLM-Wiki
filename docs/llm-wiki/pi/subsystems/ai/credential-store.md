---
id: subsys.ai.credential-store
title: 凭证存储层
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/auth/credential-store.ts
  - packages/ai/src/auth/types.ts
symbols:
  - CredentialStore
  - InMemoryCredentialStore
related:
  - subsys.ai.auth-resolution
  - ref.ai.auth-types
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.credential-store` 描述 `pi-ai` 的 provider credential storage contract: `CredentialStore` 规定按 `providerId` 读、串行改、删除一个 `Credential`, `InMemoryCredentialStore` 提供基于 `Map` 和 per-provider promise chain 的默认内存实现。[E: packages/ai/src/auth/types.ts:47][E: packages/ai/src/auth/types.ts:52][E: packages/ai/src/auth/types.ts:62][E: packages/ai/src/auth/types.ts:64][E: packages/ai/src/auth/types.ts:68][E: packages/ai/src/auth/credential-store.ts:8][E: packages/ai/src/auth/credential-store.ts:9][E: packages/ai/src/auth/credential-store.ts:10][E: packages/ai/src/auth/credential-store.ts:13][E: packages/ai/src/auth/credential-store.ts:14]

## 能回答的问题

- `CredentialStore` 的最小实现需要提供哪些方法?
- `InMemoryCredentialStore` 对同一个 provider 的并发写入如何排队?
- `modify()` 返回 `undefined` 时是删除 credential 还是保持原值?
- `Credential` 当前能表示哪些 auth credential shape?
- `CredentialStore` 与认证解析 `subsys.ai.auth-resolution` 的职责边界在哪里?

## 职责边界

`CredentialStore` 是 `pi-ai` 的存储抽象; 从该 interface 的方法面看, 它不承载 provider-specific auth 解析策略 [I]。它只暴露 `read(providerId)`、`modify(providerId, fn)` 和 `delete(providerId)` 三个方法, 且 `modify` 的回调只接收当前 `Credential | undefined` 并返回新的 `Credential | undefined`。[E: packages/ai/src/auth/types.ts:47][E: packages/ai/src/auth/types.ts:52][E: packages/ai/src/auth/types.ts:62][E: packages/ai/src/auth/types.ts:64][E: packages/ai/src/auth/types.ts:68]

`Credential` 是持久化或内存中保存的 credential shape, 不是单次请求直接使用的 auth shape: `Credential` 只能是 `ApiKeyCredential | OAuthCredential`, 而单次请求 auth 由 `ModelAuth` 的 `apiKey`、`headers`、`baseUrl` 表示。[E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:9][E: packages/ai/src/auth/types.ts:10][E: packages/ai/src/auth/types.ts:11][E: packages/ai/src/auth/types.ts:30]

`InMemoryCredentialStore` 是默认内存实现: 它实现 `CredentialStore`, 用 `Map<string, Credential>` 保存 credential, 并用 `Map<string, Promise<unknown>>` 保存每个 provider 的写入链。[E: packages/ai/src/auth/credential-store.ts:8][E: packages/ai/src/auth/credential-store.ts:9][E: packages/ai/src/auth/credential-store.ts:10]

## 关键文件

- `packages/ai/src/auth/types.ts`: 定义 `ModelAuth`、`Credential` union、`CredentialStore` contract、`AuthContext`、`AuthResult`、`ApiKeyAuth`、`OAuthAuth` 和 `ProviderAuth`。[E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:30][E: packages/ai/src/auth/types.ts:47][E: packages/ai/src/auth/types.ts:72][E: packages/ai/src/auth/types.ts:79][E: packages/ai/src/auth/types.ts:129][E: packages/ai/src/auth/types.ts:154][E: packages/ai/src/auth/types.ts:179]
- `packages/ai/src/auth/credential-store.ts`: 定义 `InMemoryCredentialStore`, 只从 `types.ts` 导入 `Credential` 和 `CredentialStore`, 因此该实现本身不依赖 provider auth handlers。[E: packages/ai/src/auth/credential-store.ts:1][E: packages/ai/src/auth/credential-store.ts:8][I]

## 数据模型

`ModelAuth` 是一次 model request 可携带的 auth material: `apiKey?: string`、`headers?: ProviderHeaders`、`baseUrl?: string`。[E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:9][E: packages/ai/src/auth/types.ts:10][E: packages/ai/src/auth/types.ts:11]

`ApiKeyCredential` 的 tag 是 `type: "api_key"`, 可保存 `key?: string` 和 provider-scoped `env?: ProviderEnv`。[E: packages/ai/src/auth/types.ts:18][E: packages/ai/src/auth/types.ts:19][E: packages/ai/src/auth/types.ts:20][E: packages/ai/src/auth/types.ts:21]

`OAuthCredential` 继承 `OAuthCredentials` 并追加 `type: "oauth"`, 所以 `Credential` union 当前只有 api-key credential 与 OAuth credential 两种成员。[E: packages/ai/src/auth/types.ts:2][E: packages/ai/src/auth/types.ts:25][E: packages/ai/src/auth/types.ts:26][E: packages/ai/src/auth/types.ts:30]

`CredentialStore.read(providerId)` 返回 `Promise<Credential | undefined>`, `CredentialStore.modify(providerId, fn)` 返回 `Promise<Credential | undefined>`, `CredentialStore.delete(providerId)` 返回 `Promise<void>`; 调用者必须用 `delete()` 表达 logout/removal, 因为 `modify()` 的返回类型没有单独的 delete sentinel。[E: packages/ai/src/auth/types.ts:52][E: packages/ai/src/auth/types.ts:62][E: packages/ai/src/auth/types.ts:64][E: packages/ai/src/auth/types.ts:65][E: packages/ai/src/auth/types.ts:68][I]

`AuthContext` 抽象 ambient context, 只暴露 `env(name)` 与 `fileExists(path)`; `AuthResult` 把解析后的 `ModelAuth` 放在 `auth`, 并可附带 provider-scoped `env` 与人类可读 `source`。[E: packages/ai/src/auth/types.ts:72][E: packages/ai/src/auth/types.ts:73][E: packages/ai/src/auth/types.ts:75][E: packages/ai/src/auth/types.ts:79][E: packages/ai/src/auth/types.ts:80][E: packages/ai/src/auth/types.ts:82][E: packages/ai/src/auth/types.ts:84]

`ApiKeyAuth.resolve()` 接收 `model`、`ctx` 和可选 `credential`, 返回 `AuthResult | undefined`; `OAuthAuth` 把交互登录、刷新 credential、从 credential 派生 `ModelAuth` 拆成 `login()`、`refresh()`、`toAuth()`。[E: packages/ai/src/auth/types.ts:142][E: packages/ai/src/auth/types.ts:143][E: packages/ai/src/auth/types.ts:144][E: packages/ai/src/auth/types.ts:145][E: packages/ai/src/auth/types.ts:146][E: packages/ai/src/auth/types.ts:158][E: packages/ai/src/auth/types.ts:164][E: packages/ai/src/auth/types.ts:171]

`ProviderAuth` 只包含可选 `apiKey?: ApiKeyAuth` 与 `oauth?: OAuthAuth`; credential storage 不选择 provider auth handler, handler choice belongs to auth resolution code that consumes both provider auth metadata and `CredentialStore` [I]。[E: packages/ai/src/auth/types.ts:179][E: packages/ai/src/auth/types.ts:180][E: packages/ai/src/auth/types.ts:181]

## 控制流

1. `InMemoryCredentialStore.read@packages/ai/src/auth/credential-store.ts:26` 直接从 `credentials` map 读取 `providerId`, 未命中时由 `Map.get()` 产生 `undefined`。[E: packages/ai/src/auth/credential-store.ts:26][E: packages/ai/src/auth/credential-store.ts:27]
2. `InMemoryCredentialStore.modify@packages/ai/src/auth/credential-store.ts:30` 把写操作交给 `enqueue(providerId, ...)`, 因此同一 provider 的 `modify` 与 `delete` 共享同一条 provider-local promise chain。[E: packages/ai/src/auth/credential-store.ts:30][E: packages/ai/src/auth/credential-store.ts:34][E: packages/ai/src/auth/credential-store.ts:42][E: packages/ai/src/auth/credential-store.ts:43][I]
3. `enqueue@packages/ai/src/auth/credential-store.ts:13` 以 `providerId` 从 `chains` map 取上一个 promise, 等待上一个 promise 的 rejection 被吞掉后再运行当前 task, 然后把当前 promise 的 catch-wrapper 存回 `chains`。[E: packages/ai/src/auth/credential-store.ts:13][E: packages/ai/src/auth/credential-store.ts:14][E: packages/ai/src/auth/credential-store.ts:16][E: packages/ai/src/auth/credential-store.ts:19][E: packages/ai/src/auth/credential-store.ts:21]
4. `modify()` 的 task 先读取当前 credential, 再 `await fn(current)`, 只有 `next !== undefined` 时才写入 map, 最后返回 `next ?? current`。[E: packages/ai/src/auth/credential-store.ts:35][E: packages/ai/src/auth/credential-store.ts:36][E: packages/ai/src/auth/credential-store.ts:37][E: packages/ai/src/auth/credential-store.ts:38]
5. `InMemoryCredentialStore.delete@packages/ai/src/auth/credential-store.ts:42` 也走 `enqueue`, task 内部调用 `this.credentials.delete(providerId)`, 所以 delete 与同 provider 的 modify 串行, 但不同 provider 因 `chains` 按 `providerId` 分桶而不会被同一个全局锁串住。[E: packages/ai/src/auth/credential-store.ts:10][E: packages/ai/src/auth/credential-store.ts:13][E: packages/ai/src/auth/credential-store.ts:14][E: packages/ai/src/auth/credential-store.ts:42][E: packages/ai/src/auth/credential-store.ts:43][E: packages/ai/src/auth/credential-store.ts:44][I]

## 设计动机与权衡

`modify(fn)` 让写入方在同一个 critical section 中读取 current credential、计算 next credential、再写回; 这对 OAuth refresh 这类需要基于当前 token 决策的更新尤其重要, 但这个节点只证明 store contract 和默认内存实现, 不展开 refresh policy 本身。[E: packages/ai/src/auth/types.ts:62][E: packages/ai/src/auth/types.ts:64][E: packages/ai/src/auth/types.ts:65][E: packages/ai/src/auth/credential-store.ts:34][E: packages/ai/src/auth/credential-store.ts:35][E: packages/ai/src/auth/credential-store.ts:36][E: packages/ai/src/auth/credential-store.ts:37][I]

`InMemoryCredentialStore` 的 failure handling keeps the queue alive: 等待上一个 promise 时用 `previous.catch(() => {})`, 存入 `chains` 时也保存 `next.catch(() => {})`, 但返回给 caller 的仍是原始 `next`, 所以当前 task 的 rejection 会传给 caller, 同时后续同 provider task 不会被已拒绝的 chain 永久阻塞。[E: packages/ai/src/auth/credential-store.ts:15][E: packages/ai/src/auth/credential-store.ts:16][E: packages/ai/src/auth/credential-store.ts:19][E: packages/ai/src/auth/credential-store.ts:21][E: packages/ai/src/auth/credential-store.ts:23][I]

`InMemoryCredentialStore` 不做持久化或结构复制: credential 存在私有 `Map<string, Credential>` 中, `read()` 返回该 map 中的值, `modify()` 写入 `fn` 返回的对象引用。[E: packages/ai/src/auth/credential-store.ts:9][E: packages/ai/src/auth/credential-store.ts:27][E: packages/ai/src/auth/credential-store.ts:36][E: packages/ai/src/auth/credential-store.ts:37][I]

## Gotcha

- `modify()` 返回 `undefined` 不会删除 credential: `InMemoryCredentialStore` 只在 `next !== undefined` 时 set, 随后返回 `next ?? current`; 删除要用 `delete(providerId)`。[E: packages/ai/src/auth/types.ts:64][E: packages/ai/src/auth/types.ts:65][E: packages/ai/src/auth/types.ts:68][E: packages/ai/src/auth/credential-store.ts:37][E: packages/ai/src/auth/credential-store.ts:38][E: packages/ai/src/auth/credential-store.ts:42][E: packages/ai/src/auth/credential-store.ts:44]
- `read()` 不是排队操作: 默认内存实现的 `read()` 直接 `Map.get(providerId)`, 因而它适合读取当前内存视图, 但不参与 `modify()`/`delete()` 的 per-provider queue。[E: packages/ai/src/auth/credential-store.ts:26][E: packages/ai/src/auth/credential-store.ts:27][E: packages/ai/src/auth/credential-store.ts:34][E: packages/ai/src/auth/credential-store.ts:43][I]
- `InMemoryCredentialStore` 的串行范围是 provider id, 不是所有 provider 的全局互斥: `chains` map 的 key 是 `providerId`, `enqueue()` 每次只取 `this.chains.get(providerId)`。[E: packages/ai/src/auth/credential-store.ts:10][E: packages/ai/src/auth/credential-store.ts:13][E: packages/ai/src/auth/credential-store.ts:14]
- `Credential` 当前没有单独的 refresh-error 或 disabled 状态; store 缺失、api-key credential、OAuth credential 以 `undefined` 或 `Credential` union 表达, 更高层如何解释这些状态属于 auth-resolution/UI 边界。[E: packages/ai/src/auth/types.ts:30][E: packages/ai/src/auth/types.ts:52][I]

## 跨包边界

[subsys.ai.auth-resolution](auth-resolution.md) 应覆盖 provider auth metadata、ambient context、stored credential 与 override 如何被解析成 `AuthResult`; 本节点只覆盖 `CredentialStore` 的 storage contract 与 `InMemoryCredentialStore` 的 queue/read/write behavior。[E: packages/ai/src/auth/types.ts:47][E: packages/ai/src/auth/types.ts:79][E: packages/ai/src/auth/types.ts:142][E: packages/ai/src/auth/types.ts:171][I]

[ref.ai.auth-types](../../reference/auth-types.md) 应作为 auth type catalog 逐项列出 `ModelAuth`、`ApiKeyCredential`、`OAuthCredential`、`Credential`、`AuthContext`、`AuthResult`、`ApiKeyAuth`、`OAuthAuth`、`ProviderAuth`; 本节点只在解释 store 边界时摘录这些类型。[E: packages/ai/src/auth/types.ts:8][E: packages/ai/src/auth/types.ts:18][E: packages/ai/src/auth/types.ts:25][E: packages/ai/src/auth/types.ts:30][E: packages/ai/src/auth/types.ts:72][E: packages/ai/src/auth/types.ts:79][E: packages/ai/src/auth/types.ts:129][E: packages/ai/src/auth/types.ts:154][E: packages/ai/src/auth/types.ts:179][I]

## Sources

- packages/ai/src/auth/credential-store.ts
- packages/ai/src/auth/types.ts

## 相关

- [subsys.ai.auth-resolution](auth-resolution.md) - provider auth metadata、stored credential、ambient context 与 request auth 的解析边界。
- [ref.ai.auth-types](../../reference/auth-types.md) - auth 与 credential 类型 catalog。
