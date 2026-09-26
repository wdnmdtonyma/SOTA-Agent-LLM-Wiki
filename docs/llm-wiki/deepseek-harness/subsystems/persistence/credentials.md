---
id: subsys.persistence.credentials
title: credentials 缝与 DeepSeek 账号
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/credentials/credentials/src/index.ts
  - packages/credentials/credentials/src/types.ts
  - packages/credentials/credentials/src/invariant.ts
  - packages/credentials/credentials/tests/credentials.spec.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/credentials/credentials-local/tests/local.spec.ts
  - packages/credentials/deepseek-account/src/index.ts
  - packages/credentials/deepseek-account/src/types.ts
  - packages/credentials/deepseek-account-platform/src/index.ts
  - packages/credentials/authorization/src/index.ts
  - packages/llm/llm-deepseek-api-key/src/index.ts
  - packages/llm/llm-deepseek-api-key/src/config.ts
  - packages/llm/llm-deepseek-account/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/api/settings-controller/src/credentials.ts
  - packages/api/account-controller/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/core/session/src/types.ts
  - packages/session/session-format-catalog/src/generated.ts
  - packages/session/session-persistence/src/storage-contract.ts
symbols:
  - CredentialProvider
  - CredentialRef
  - CredentialKey
  - LocalCredentialProvider
  - DeepSeekAccount
  - PlatformAccount
  - CredentialsController
  - AccountController
related:
  - subsys.persistence.settings
  - subsys.llm.deepseek
  - subsys.llm.pi-ai
  - surface.config.settings
  - spine.capability-seams
  - spine.composition-boot
  - spine.overview
  - subsys.host.apiproxy
evidence: explicit
status: verified
updated: 477b4f4205
---

> `ctx.credentials` 仍是 **host 面** secret 缝：组合 / settings 只带 `CredentialRef`（POSIX 环境变量名）或 `CredentialKey`（`<scope>/<id>`），值由 `LocalCredentialProvider`（`$DSH_HOME/.credentials.yaml`）拥有。DeepSeek **账号登录**是另一条缝：`ctx.deepseekAccount`（Definition `@deepseek-ai/dsh-deepseek-account`）由 `@deepseek-ai/dsh-deepseek-account-platform` 实现，grant 写进同一份 credentials 文档的 record 半边，**不**灌 `process.env`。`deepseek-official` 走 API key；`deepseek-account` 走 `x-dsh-auth-token`。

## 能回答的问题

- `ctx.credentials` 与 `ctx.deepseekAccount` 各是哪条缝？五个 shipped profile 谁挂？`sdk-minimal` 呢？
- `CredentialRef` / `CredentialKey` 怎么分工？账号 grant 存在哪条 key？
- `resolve` 梯子仍是哪四层？账号 token 走不走这四层？
- Platform 登录如何 PKCE？`resolveToken` 为什么要核对 `inferenceOrigin`？
- Models 页写 API key 与账号登录各打哪条 Remote？会不会把 secret 灌进 `process.env`？

## 职责边界

本页拥有两条 **host 面** 缝，共享同一份 local YAML，但 **不是** 同一 `ctx` 键：

- **`ctx.credentials`**：`CredentialProvider` + shipped `LocalCredentialProvider`。ref 半边四层梯子；record 半边 RMW。
- **`ctx.deepseekAccount`**：抽象类 `DeepSeekAccount`；shipped `PlatformAccount`（`inject = ['credentials', 'authorization']`）。浏览器 PKCE、grant 存储、`resolveToken` / `rejectToken`。
- **`ctx.authorization`**：通用「跟人对话拿 credential」缝。账号 Provider inject 它；pi-ai OAuth 也注册 flow。

本页**不**拥有：settings 表单（现为 profile patch 上的 `SettingsForms`，[subsys.persistence.settings](settings.md)）；DeepSeek Messages 传输（[subsys.llm.deepseek](../llm/deepseek.md)）；session log / JSONL。没有 shipped keyring。`packages/preset/agent-presets` 已删除；preset 泄漏检查在 `dsh-agent-preset-registry` 的 `leakedServices`。 [E: packages/preset/agent-preset-registry/src/mount.ts:86]

正交事实：

- `SESSION_FORMAT_VERSION = 4`。JSONL catalog `currentVersion: 4`，adjacent v0→v1→v2→v3→v4。 [E: packages/core/session/src/types.ts:89] [E: packages/session/session-format-catalog/src/generated.ts:17]
- shipped session 盘只有 JSONL。`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。 [E: packages/bundle/base/cordis.patch.yml:130]
- `session-query-sqlite` `openAt: never`。 [E: packages/bundle/base/cordis.patch.yml:153]
- headless insert 只有 `headless-startup` / `headless-runner`，不重挂 credentials / account。 [E: packages/bundle/headless/cordis.patch.yml:21] [E: packages/bundle/headless/cordis.patch.yml:25]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/credentials/credentials/src/index.ts` | `CredentialProvider`、`credentialRef` / `credentialKey` |
| `packages/credentials/credentials-local/src/index.ts` | shipped YAML Provider：梯子、version-1 文档、watch |
| `packages/credentials/deepseek-account/src/index.ts` | `DeepSeekAccount` Definition（`ctx.deepseekAccount`） |
| `packages/credentials/deepseek-account-platform/src/index.ts` | `PlatformAccount`：PKCE、grant record、`resolveToken` |
| `packages/credentials/authorization/src/index.ts` | `ctx.authorization` |
| `packages/llm/llm-deepseek-api-key/src/index.ts` | `deepseek-official`：每请求 `credentials.resolve` |
| `packages/llm/llm-deepseek-account/src/index.ts` | `deepseek-account`：每请求 `resolveToken` |
| `packages/bundle/base/cordis.patch.yml` | `authorization` + `deepseek-account` + `credentials` + 两个 llm 行 |
| `packages/api/account-controller/src/index.ts` | Remote `account`；不导出 token |
| `packages/api/settings-controller/src/credentials.ts` | Remote `credentials`：describe/set/unset refs |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CredentialRef` | POSIX 环境变量名，不是 secret。 [E: packages/credentials/credentials/src/types.ts:14] |
| `credentialRef` | `/^[A-Za-z_][A-Za-z0-9_]*$/`。 [E: packages/credentials/credentials/src/index.ts:19] [E: packages/credentials/credentials/src/index.ts:29] |
| `CredentialKey` | `<scope>/<id>`，与 ref 文法不相交。 [E: packages/credentials/credentials/src/types.ts:29] |
| `credentialKey` | 两段 `/^[a-z][a-z0-9-]*$/`。 [E: packages/credentials/credentials/src/index.ts:22] [E: packages/credentials/credentials/src/index.ts:69] |
| 账号 KEY / DEVICE | `credentialKey('deepseek-account-platform', 'default' \| 'device')`。grant payload `{ version: 1, token, issuer }`。 [E: packages/credentials/deepseek-account-platform/src/index.ts:17] [E: packages/credentials/deepseek-account-platform/src/index.ts:19] |
| `CREDENTIALS_FILENAME` | `'.credentials.yaml'`。 [E: packages/credentials/credentials-local/src/index.ts:61] |
| `DOCUMENT_VERSION` | `1`：`version` + `refs` + `records`。 [E: packages/credentials/credentials-local/src/index.ts:167] |
| `credentials/reference-updated` / `record-updated` | **emit**，无 `next()`。 [E: packages/credentials/credentials/src/types.ts:90] [E: packages/credentials/credentials/src/types.ts:102] |
| `DeepSeekAccount` | `getState` / `startSignIn` / `signOut` / `resolveToken` / `rejectToken` / `getPlatformSession`。 [E: packages/credentials/deepseek-account/src/index.ts:32] [E: packages/credentials/deepseek-account/src/index.ts:99] |

空串在 **ref** 半边 = 缺席。record 半边没有环境层。

## 控制流

1. **host 面挂三条相关行。** `dsh-base`：`id: authorization` → `dsh-authorization`；`id: deepseek-account` → `dsh-deepseek-account-platform`（desktop 才填 `desktopPlatform`）；`id: credentials` → `dsh-credentials-local`。再挂 `id: llm-deepseek`（`dsh-llm-deepseek-api-key`）与 `id: llm-deepseek-account`。叠 base 的 profile 继承；`sdk-minimal` **不叠** base，只挂 api-key 行，**没有** credentials / account。 [E: packages/bundle/base/cordis.patch.yml:109] [E: packages/bundle/base/cordis.patch.yml:112] [E: packages/bundle/base/cordis.patch.yml:117] [E: packages/bundle/base/cordis.patch.yml:524] [E: packages/bundle/base/cordis.patch.yml:527] [E: packages/bundle/sdk-minimal/cordis.patch.yml:26]

2. **`CredentialProvider` 占 `ctx.credentials`。** 构造 `super(ctx, 'credentials')`。 [E: packages/credentials/credentials/src/index.ts:170] [E: packages/credentials/credentials/src/index.ts:172]

3. **`resolve` 梯子（每调用重走）。** process-env 非空 → `{ source: 'env' }`；否则 YAML `refs` → `{ source: 'file' }`；否则 project/user `.env`；全无 `undefined`。 [E: packages/credentials/credentials-local/src/index.ts:610] [E: packages/credentials/credentials-local/src/index.ts:612] [E: packages/credentials/credentials-local/src/index.ts:614]

4. **`set` / `unset` 只改 managed 文件。** 空串拒。process-env 挡住则抛 shadowed，不写盘。不写 `process.env`。 [E: packages/credentials/credentials-local/src/index.ts:633] [E: packages/credentials/credentials-local/src/index.ts:634]

5. **账号 Provider 占 `ctx.deepseekAccount`。** `PlatformAccount.inject = ['credentials', 'authorization']`。grant 走 `modifyRecord(KEY, …)`，device UUID 走 `DEVICE`。 [E: packages/credentials/deepseek-account-platform/src/index.ts:85] [E: packages/credentials/deepseek-account-platform/src/index.ts:566]

6. **`resolveToken` 不走 ref 梯子。** 核对请求 origin == 配置的 `inferenceOrigin`（默认 `https://api.deepseek.com`），读 grant record，拒 mock token / loopback issuer 打生产 API。登出进行中返回 `undefined`。 [E: packages/credentials/deepseek-account-platform/src/index.ts:372] [E: packages/credentials/deepseek-account-platform/src/index.ts:374] [E: packages/credentials/deepseek-account-platform/src/index.ts:56]

7. **两个 LLM Provider。** `llm-deepseek-api-key`：`PROVIDER = 'deepseek-official'`，`apiKeyEnv` 默认 `DEEPSEEK_API_KEY`，`credentials.resolve` 或 launch env，miss → `MISSING_CREDENTIAL`。`llm-deepseek-account`：`PROVIDER = 'deepseek-account'`，`resolveToken`，miss → `ACCOUNT_SIGN_IN_REQUIRED`；HTTP 401 调 `rejectToken`。 [E: packages/llm/llm-deepseek-api-key/src/index.ts:15] [E: packages/llm/llm-deepseek-api-key/src/index.ts:20] [E: packages/llm/llm-deepseek-api-key/src/config.ts:16] [E: packages/llm/llm-deepseek-account/src/index.ts:15] [E: packages/llm/llm-deepseek-account/src/index.ts:22] [E: packages/llm/llm-deepseek-account/src/index.ts:23]

8. **Web Remote 拆开。** `CredentialsController` namespace `'credentials'`：最多 64 个 ref 的 `describe`，永不回 value。`AccountController` namespace `'account'`：`getState` / 登录 / 登出；**不**导出 `resolveToken`。 [E: packages/api/settings-controller/src/credentials.ts:20] [E: packages/api/account-controller/src/index.ts:10] [E: packages/api/account-controller/src/index.ts:13]

9. **事件是 emit。** observer 失败不回滚已提交写。`INVARIANT` 等全部 listener 跑完再 rethrow。

## 设计动机

API key 继续用环境变量名，因为 CI / 容器 / `.env` 已经共用这套名字。账号登录是浏览器 PKCE 产物，没有 POSIX 名可指，所以进 record 半边（`deepseek-account-platform/default`）。两条 LLM 路由分开：官方 key 继续 `x-api-key`；账号 token 只允许配置的 inference origin，避免把 Platform grant 发到任意 URL。

## Gotcha

- **账号 token ≠ `DEEPSEEK_API_KEY`。** `resolveToken` 读 grant record，不走 ref 梯子。
- **`source: 'env'` 挡住 `set`。** Models 页写不进被 shell 导出的 key。
- **Models 页写入不进 `process.env`。** 否则重启后变成只读 `env`。
- **`sdk-minimal` 没有 credentials / account。** 只能从 launch env 取 `DEEPSEEK_API_KEY`。 [E: packages/bundle/sdk-minimal/cordis.patch.yml:26]
- **preset 不得往 root 再 `provide` `credentials` / `deepseekAccount`。** `leakedServices` 会拒。 [E: packages/preset/agent-preset-registry/src/mount.ts:86]
- **没有 keyring。** shipped 只有 YAML。
- **旧扁平 YAML 必须升到 `version: 1` + `refs:`。**

## Seam 三角

| 角色 | 包 | ctx 键 | bundle |
|---|---|---|---|
| Definition（secret） | `dsh-credentials` | `ctx.credentials` | 无独立行 |
| Provider（secret） | `dsh-credentials-local` | 同一键；`.credentials.yaml` | **base** `id: credentials`。sdk-minimal **无** |
| Definition（账号） | `dsh-deepseek-account` | `ctx.deepseekAccount` | 无独立行 |
| Provider（账号） | `dsh-deepseek-account-platform` | 同一键；grant 进 credentials records | **base** `id: deepseek-account`。sdk-minimal **无** |
| Consumer | `llm-deepseek-api-key` / `llm-deepseek-account` / `CredentialsController` / `AccountController` / pi-ai | 每请求 resolve；缺缝 api-key 退回 launch env | api-key 在 base 与 sdk-minimal；account 只叠 base |

换 YAML Provider 只换值从哪来。换账号 Provider 必须仍把 grant 写成 `CredentialKey` 记录。preset 需要私有服务必须 `isolate`。

## Sources

- packages/credentials/credentials/src/index.ts
- packages/credentials/credentials/src/types.ts
- packages/credentials/credentials/src/invariant.ts
- packages/credentials/credentials/tests/credentials.spec.ts
- packages/credentials/credentials-local/src/index.ts
- packages/credentials/credentials-local/tests/local.spec.ts
- packages/credentials/deepseek-account/src/index.ts
- packages/credentials/deepseek-account/src/types.ts
- packages/credentials/deepseek-account-platform/src/index.ts
- packages/credentials/authorization/src/index.ts
- packages/llm/llm-deepseek-api-key/src/index.ts
- packages/llm/llm-deepseek-api-key/src/config.ts
- packages/llm/llm-deepseek-account/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/api/settings-controller/src/credentials.ts
- packages/api/account-controller/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/core/session/src/types.ts
- packages/session/session-format-catalog/src/generated.ts
- packages/session/session-persistence/src/storage-contract.ts

## 相关

- [subsys.persistence.settings](settings.md)：`SettingsForms` 投影 `.volatile()`；不再是 `settings.yaml`。
- [subsys.llm.deepseek](../llm/deepseek.md)：`deepseek-official` 与 `deepseek-account` 两条路由。
- [subsys.llm.pi-ai](../llm/pi-ai.md)：点名的 `apiKeyEnv` miss 即 `MISSING_CREDENTIAL`；OAuth grant 走 `modifyRecord`。
- [surface.config.settings](../../surface/config/settings.md)：Models 页与账号 UI。
- [spine.capability-seams](../../spine/capability-seams.md)：host 面 vs agent-preset 面。
- [spine.composition-boot](../../spine/composition-boot.md)：base 行如何进每个 profile。
- [subsys.host.apiproxy](../host/apiproxy.md)：`credentials.*` 与 `account.*` Remote。
