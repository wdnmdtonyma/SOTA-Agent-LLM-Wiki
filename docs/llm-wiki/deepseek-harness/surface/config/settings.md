---
id: surface.config.settings
title: 用户设置与 Config
kind: surface
tier: T1
pkg: persistence
source:
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/src/types.ts
  - packages/settings/settings/src/redact.ts
  - packages/settings/settings/src/schema.ts
  - packages/settings/settings/package.json
  - packages/settings/settings/tests/redact.spec.ts
  - packages/boot/config-editor/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/util/home-paths/src/index.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-deepseek-api-key/src/config.ts
  - packages/api/settings-controller/src/index.ts
  - packages/api/settings-controller/package.json
  - packages/credentials/credentials/src/types.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/client/ui-settings-models/src/client/ProviderEditor.tsx
  - packages/client/ui-settings-models/src/client/operations.ts
symbols:
  - SettingsForms
  - SettingsController
  - redactSecrets
  - ConfigEditor
related: []
evidence: explicit
status: verified
updated: 477b4f4205
---

> `ctx.settings` 是 **host 面** `SettingsForms`：把 active Loader 行上标了 `.volatile()` 的 Config 投影成表单，写入走 `ctx.configEditor.edit`，落在 **当前 profile 的 Cordis patch**。`@deepseek-ai/dsh-settings-file` 已删除。遗留 `$DSH_HOME/settings.yaml` 只在 Loader 安定后一次性导入并改名为 `settings.yaml.imported`。这是 Cordis 组合运行时的用户覆盖面，不是 session log，也不是生成物 `docs/config-catalog.md`。

## 能回答的问题

- 用户改设置走哪几条入口：profile `cordis.patch.yml`、Models / General Remote、`openSettingsDocument`，跟插件普通 `config:` 各管哪一层？
- namespace 现在是什么？`value` / `base` / `user` 谁赢？`replace({})` 回到哪一层？
- `settings/document-updated` 是 emit 还是 waterfall？还有没有 `settings/updated` / `installSection`？
- `role('secret')`、`CredentialRef`、`.credentials.yaml` 各放什么？浏览器为什么必须 `describe({ redactSecrets: true })`？
- `dsh-base` 怎样挂 `id: settings`？没有 `profileContext` 时呢？`sdk-minimal` 为什么没有这份表单？
- `llm-pi-ai` 始终加载，Settings 加 profile 之前为什么是零 route？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。五个 shipped CLI profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`。[E: packages/boot/app-boot/src/profile.ts:179] 默认产品路径含本地 Web GUI（`dsh web` ≡ `dsh --profile web`），以及 `dsh sdk|sdk-minimal|acp|headless`。capability seam 是 Definition / Provider / Consumer。`@deepseek-ai/dsh-settings` **就是** shipped Provider：`SettingsForms` 占 `ctx.settings`，`inject = ['configEditor', 'profileContext']`。[E: packages/settings/settings/package.json:2] [E: packages/settings/settings/src/index.ts:223] [E: packages/settings/settings/src/index.ts:224]

两份「配置」不要混：

| 面 | 是什么 | 谁写 |
|---|---|---|
| 组合 **entry Config** | 插件构造 / `apply` 收到的 schemastery 值 | bundle / profile `cordis.yml` 的 `config:`、用户 `$DSH_HOME/profiles/<name>/cordis.patch.yml` |
| 用户 **settings 表单** | 同一棵树里标了 `.volatile()` 的字段投影 | 人、`SettingsForms.update` / `replace` / `mutate`、Web Models / General |

生成物 `docs/config-catalog.md` 是各包 **部署轴** `Config` 声明的粘贴表，只当查漏线索，本页不当 `[E]`。本页也不展开 session event / JSONL / checkpoint。

`dsh-web-app` 另 insert 的 `id: ui-settings` / `ui-settings-models` 是 **浏览器**设置页插件，消费 Typert Remote，不替代 `ctx.settings`。Host Remote 所有者是 `@deepseek-ai/dsh-api-settings-controller`（`ctx.settingsController`）。[E: packages/api/settings-controller/package.json:2]

## 入口

用户碰到这份文档的路径：

| 入口 | 行为 |
|---|---|
| `$DSH_HOME/profiles/<name>/cordis.patch.yml` | `configEditor.documentPath`；表单写入走 `configEditor.edit` [E: packages/settings/settings/src/index.ts:292] |
| 遗留 `$DSH_HOME/settings.yaml` | 若仍在，Loader 安定后一次性 `rename` 成 `settings.yaml.imported` 再按 section `update` [E: packages/settings/settings/src/index.ts:243] [E: packages/settings/settings/src/index.ts:246] |
| `dsh web` Models 页 | 浏览器只持 redacted descriptor；profile 编辑走 `remote.settings.mutate`，键走 `remote.credentials.set` [E: packages/client/ui-settings-models/src/client/operations.ts:89] [E: packages/client/ui-settings-models/src/client/operations.ts:97] |
| General / 其它设置行 | 同一条 `settings` Remote：`describe` / `update` / `replace` / `mutate` / `openSettingsDocument` |
| `openSettingsDocument` | Host 侧 `prepareDocument()` 返回现有 profile patch 路径 [E: packages/settings/settings/src/index.ts:296] |
| 插件普通 `config:` | 继承层 `base`；不是独立 YAML section |

## 关键字段

### 文档路径

`documentPath` 转给 `configEditor.documentPath`（当前 profile 的 `cordis.patch.yml`）。[E: packages/settings/settings/src/index.ts:292] `$DSH_HOME` 由 `resolveDshHome` 解析：非空环境变量否则 `~/.dsh`；空串或只含空白当未设置。[E: packages/util/home-paths/src/index.ts:88]

wire 的 `hasDocument` 不把 Host 绝对路径交给浏览器。

### namespace

`SettingsNamespace` 是品牌化的 **profile entry id**，不是独立 kebab 注册表。[E: packages/settings/settings/src/types.ts:7] `describe` 扫 `configEditor.configuration()` 里 ACTIVE 且有 `.volatile()` 的行。[E: packages/settings/settings/src/index.ts:302]

**Remote 不再维护 `exposedNamespaces` 白名单。** `SettingsController.describe` 对每一个已投影 namespace 调 `describe({ redactSecrets: true })`。

### 三层投影

| 字段 | 来源 |
|---|---|
| `value` | 当前 fiber 的 live Config 投影 [E: packages/settings/settings/src/index.ts:319] |
| `base` | 继承层（schema + 组合）[E: packages/settings/settings/src/index.ts:321] |
| `user` | profile override [E: packages/settings/settings/src/index.ts:322] |

`update` merge 用户 patch；`replace` 用 `mergeLayers(base, input)` 重置 live 字段；`mutate` 按 path set/unset，给只拿到 redacted 视图的调用方。[E: packages/settings/settings/src/index.ts:347] [E: packages/settings/settings/src/index.ts:357] [E: packages/settings/settings/src/index.ts:367] 只有 `.volatile()` 路径能改。[E: packages/settings/settings/src/index.ts:388]

旧的 `installSection` / namespace `register` / `settings/updated` **已删除**。事件只剩 `settings/document-updated`（emit，没有 `next`）。[E: packages/settings/settings/src/types.ts:75]

### CredentialRef 与 `.credentials.yaml`

`CredentialRef` 是 POSIX 环境变量名品牌。组合 / settings 里放 **ref**（`role('credential-ref')`，如 `llm-deepseek-api-key` 的 `apiKeyEnv` 默认 `DEEPSEEK_API_KEY`）。secret **值**在 `$DSH_HOME/.credentials.yaml`，不是 profile patch。[E: packages/llm/llm-deepseek-api-key/src/config.ts:16] [E: packages/credentials/credentials-local/src/index.ts:61]

schema **允许** `role('secret')`，所以 profile patch **可以**含明文；`redactSecrets` 存在就是因为值可能在 section 里。产品路径禁止把明文交给浏览器：Host `describe()` **始终** `redactSecrets: true`。[E: packages/api/settings-controller/src/index.ts:103] 持 redacted 视图的写路径是 `mutate`，不是把剥过的文档 `replace` 回去。Models 页把键交给 `credentials.set`。

## 装配与门控

1. **host 面一行，叠在 `dsh-base` 上。** `dsh-base` 插入 `id: config-editor` 与 `id: settings` / `name: '@deepseek-ai/dsh-settings'`，两者都是 `disabled: !!js "!ctx.get('profileContext')"`。[E: packages/bundle/base/cordis.patch.yml:97] [E: packages/bundle/base/cordis.patch.yml:101] `PROFILE_TEMPLATES`：`web` / `headless` / `sdk` / `acp` 叠 `dsh-base`；**`sdk-minimal` 只含 `@deepseek-ai/dsh-sdk-minimal`，不叠 base，也没有 `id: settings`**。[E: packages/boot/app-boot/src/profile.ts:183] [E: packages/boot/app-boot/src/profile.ts:193] `dsh-web-app` insert `id: settings-controller`，不重插 `id: settings`。[E: packages/bundle/web-app/cordis.patch.yml:137] `dsh-headless` 的 `insert` 只有 `headless-startup` / `headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:21]

2. **没有 `profileContext` = 整行 disabled。** `writable` getter 恒 `true`，但没有 profile 时插件根本不加载。[E: packages/settings/settings/src/index.ts:290]

3. **并发写用 revision。** descriptor `revision` 当 `expectedRevision`，不匹配抛 `SettingsConflictError`（`code: 'SETTINGS_CONFLICT'`）。[E: packages/settings/settings/src/index.ts:47] [E: packages/settings/settings/src/index.ts:394]

4. **pi-ai：始终加载，零 route 直到 Settings 加 profile。** `dsh-base` 挂 `id: llm-pi-ai`。空 profiles 时不 `registerAdapter`（dormant）；有 profile 才注册。路由细节见 [surface.providers.pi-ai](../providers/pi-ai.md)。

5. **DeepSeek 对照。** `llm-deepseek-api-key` 的 `apiKeyEnv` 是 `role('credential-ref')` + `.volatile()`；boot 就注册官方路由。细节链 [surface.providers.deepseek](../providers/deepseek.md)。

## 跨包关系

- `subsys.persistence.settings` — `ctx.settings` 缝的控制流、volatile 投影、遗留 YAML 导入；本页只写用户可见面。
- `subsys.persistence.credentials` — `CredentialRef` 解析梯子与 `.credentials.yaml`。
- `surface.misc.home` — `resolveDshHome` / `$DSH_HOME`。
- `surface.providers.pi-ai` — 空 profile = 零 route。
- `surface.providers.deepseek` — 官方路由始终注册。
- `spine.composition-boot` — `id: settings` 从 `dsh-base` 进入叠 base 的 profile 真树。
- `subsys.host.apiproxy`（稳定别名：Host HTTP API）— `SettingsController`。

## Sources

- packages/settings/settings/src/index.ts
- packages/settings/settings/src/types.ts
- packages/settings/settings/src/redact.ts
- packages/settings/settings/src/schema.ts
- packages/settings/settings/package.json
- packages/settings/settings/tests/redact.spec.ts
- packages/boot/config-editor/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/util/home-paths/src/index.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-deepseek-api-key/src/config.ts
- packages/api/settings-controller/src/index.ts
- packages/api/settings-controller/package.json
- packages/credentials/credentials/src/types.ts
- packages/credentials/credentials-local/src/index.ts
- packages/client/ui-settings-models/src/client/ProviderEditor.tsx
- packages/client/ui-settings-models/src/client/operations.ts

## 相关

无 index related。邻居节点：

- [surface.misc.home](../misc/home.md)：`$DSH_HOME` 与 `resolveDshHome`。
- [surface.providers.pi-ai](../providers/pi-ai.md)：`llm-pi-ai` 路由 / profile / 每请求凭据。
- [surface.providers.deepseek](../providers/deepseek.md)：`deepseek-official` 与 `apiKeyEnv`。
- [subsys.persistence.settings](../../subsystems/persistence/settings.md)：`ctx.settings` 缝内部。
- [subsys.persistence.credentials](../../subsystems/persistence/credentials.md)：`.credentials.yaml` 与解析梯子。
- [spine.composition-boot](../../spine/composition-boot.md)：`dsh-base` 把 `id: settings` 叠进叠 base 的 profile 真树。
- [subsys.host.apiproxy](../../subsystems/host/apiproxy.md)：Host HTTP API 上的 settings Remote。
