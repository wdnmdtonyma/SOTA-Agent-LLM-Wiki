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
  - packages/settings/settings/package.json
  - packages/settings/settings/tests/settings.spec.ts
  - packages/settings/settings/tests/redact.spec.ts
  - packages/settings/settings-file/src/index.ts
  - packages/settings/settings-file/package.json
  - packages/settings/settings-file/tests/local.spec.ts
  - packages/settings/settings-file/tests/loader-composition.spec.ts
  - packages/settings/settings-file/tests/watcher.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/util/home-paths/src/index.ts
  - packages/util/home-paths/tests/home-paths.spec.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/api/settings.ts
  - packages/credentials/credentials/src/types.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/client/ui-settings-models/src/client/ProviderEditor.tsx
  - packages/web/web-search-deepseek/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - docs/config-catalog.md
symbols:
  - SettingsProvider
  - FileSettingsProvider
  - installSettingsSection
  - redactSecrets
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.settings` 是 **host 面**按 namespace 切段的用户设置文档：`SettingsProvider.resolve` 的优先级是 schema defaults → composition `base`（插件 entry `Config`）→ 用户文档 section。`dsh-base` 挂 `FileSettingsProvider`（默认 `$DSH_HOME/settings.yaml`，hot-reload）。这是 Cordis 组合运行时的用户覆盖面，不是 session log，也不是 `docs/config-catalog.md` 那种 T3 部署键表。

## 能回答的问题

- 用户改设置走哪几条入口：`settings.yaml`、Models / General RPC、`settings.openDocument`，跟插件 `config:` 各管哪一层？
- namespace 是什么？三层 resolve 谁赢？`replace({})` 回到哪一层？
- `settings/updated` 与 `settings/document-updated` 是 emit 还是 waterfall？resolved 不变时哪条还会响？
- `role('secret')`、`CredentialRef`、`.credentials.yaml` 各放什么？浏览器为什么必须 `describe({ redactSecrets: true })`？
- `dsh-base` 怎样挂 `settings-file`？空白 `$DSH_HOME` 算不算已设置？没有 settings 服务时 entry Config 还工作吗？
- `llm-pi-ai` 始终加载，Settings 加 profile 之前为什么是零 route？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），默认产品路径是本地 Web GUI（`dsh web` ≡ `--profile web`）。capability seam 是 Definition / Provider / Consumer。`@deepseek-ai/dsh-settings` 是 `ctx.settings` 的 **Service Definition**；物理文档在 `@deepseek-ai/dsh-settings-file` 的 `FileSettingsProvider`。[E: packages/settings/settings/package.json:2] [E: packages/settings/settings-file/package.json:2] [E: packages/settings/settings/src/index.ts:367]

两份「配置」不要混：

| 面 | 是什么 | 谁写 |
|---|---|---|
| 组合 **entry Config** | 插件构造 / `apply` 收到的 schemastery 值；`installSettingsSection` 把它登记成 composition `base` | bundle / profile `cordis.yml` 的 `config:`、用户 `$DSH_HOME/profiles/<name>/cordis.patch.yml` |
| 用户 **settings 文档** | 一份 YAML/JSON，顶层键是 namespace，值必须是 object section | 人、`SettingsScope.update` / `replace` / `mutate`、Web Models / General |

生成物 `docs/config-catalog.md` 是各包 **部署轴** `Config` 声明的粘贴表（`scripts/gen-config-catalog.ts`），只当查漏线索，本页不当 `[E]`，也不抄成键目录。本页也不展开 session event / JSONL / checkpoint：那些是 [spine.session-log](../../spine/session-log.md) 的盘，不是 `settings.yaml`。

`dsh-web-app` 另 insert 的 `id: ui-settings` / `ui-settings-models` 是 **浏览器**设置页插件，消费 RPC，不替代 `ctx.settings`。[E: packages/bundle/web-app/cordis.patch.yml:186] [E: packages/bundle/web-app/cordis.patch.yml:192]

## 入口

用户碰到这份文档的路径：

| 入口 | 行为 |
|---|---|
| `$DSH_HOME/settings.yaml`（或显式 `path`） | `FileSettingsProvider.documentPath`；chokidar `watch` 默认开，外部编辑 hot-publish [E: packages/settings/settings-file/src/index.ts:56] [E: packages/settings/settings-file/src/index.ts:64] [E: packages/settings/settings-file/src/index.ts:148] |
| `dsh web` Models 页 | 浏览器只持 redacted descriptor；profile 编辑走 `settings.mutate`，键走 `credentials.set` [E: packages/client/ui-settings-models/src/client/ProviderEditor.tsx:271] [E: packages/client/ui-settings-models/src/client/ProviderEditor.tsx:282] |
| General / 其它设置行 | 同一条 `settings.*` RPC（`describe` / `update` / `replace` / `mutate` / `openDocument`）[E: packages/host/apiproxy/src/api/settings.ts:61] |
| `settings.openDocument` | Host 侧 `prepareDocument()` 物化空文件后交给系统打开器；请求不带路径 [E: packages/host/apiproxy/src/api/settings.ts:73] [E: packages/settings/settings-file/src/index.ts:153] |
| 插件 `config:` | 进入 `installSettingsSection(..., entry)` 的 `base`，**不**烤进 YAML [E: packages/settings/settings/src/index.ts:872] [E: packages/settings/settings/tests/settings.spec.ts:219] |

缺文件当空文档 `{}`，不是错误。[E: packages/settings/settings-file/src/index.ts:177] 启动时已存在但拆不开 / 根不是 map / 路径是目录 / 权限不够 → `settings-file` 插件起不来。[E: packages/settings/settings-file/src/index.ts:236] [E: packages/settings/settings-file/tests/local.spec.ts:157] 跑起来之后 live 坏编辑只 warn，resolved 停在 last good；对脏盘做 `update` 则 fail-loud，不覆盖手改。[E: packages/settings/settings-file/src/index.ts:310] [E: packages/settings/settings-file/tests/watcher.spec.ts:219]

## 关键字段

### 文档路径

`resolveSpec`：显式 `path` 赢，否则 `join(resolveDshHome(dshHome), 'settings.yaml')`。扩展名只认 `.yaml` / `.yml` / `.json`。[E: packages/settings/settings-file/src/index.ts:56] [E: packages/settings/settings-file/src/index.ts:59] `resolveDshHome` 优先级是配置路径 → 非空 `$DSH_HOME` → `~/.dsh`。空串或只含空白的 `DSH_HOME` 当未设置，不会把 home 解析成 cwd。[E: packages/util/home-paths/src/index.ts:89] [E: packages/util/home-paths/tests/home-paths.spec.ts:44] 测试：只传 `dshHome` 时 `documentPath` 就是 `<home>/settings.yaml`。[E: packages/settings/settings-file/tests/local.spec.ts:106] 写出权限 `0600`，父目录 `0700`。[E: packages/settings/settings-file/src/index.ts:227] [E: packages/settings/settings-file/tests/local.spec.ts:178]

wire 的 `hasDocument` 只报 `documentPath !== undefined`，不把 Host 绝对路径交给浏览器。[E: packages/host/apiproxy/src/api-proxy.ts:3267]

### namespace

`settingsNamespace()` 品牌化，必须匹配 `^[a-z][a-z0-9-]*$`。重复 `register` 立刻抛 `already registered`。[E: packages/settings/settings/src/index.ts:19] [E: packages/settings/settings/src/index.ts:27] [E: packages/settings/settings/src/index.ts:437] 顶层 section 必须是 object；标量 / 数组在 `section()` 里抛 `must be an object of keys`。[E: packages/settings/settings/src/index.ts:691]

产品里常见的用户可见段（不是 Config 键表）：`llm-deepseek`、`llm-pi-ai`（Models）、`agent-presets` / `ui-onboarding`（产品白名单）、以及 Web 显式名单 `agent-loop` / `shell` / `locale` / `permission` / `ui-conversation` / `ui-theme` / `web-search-deepseek`。[E: packages/llm/llm-deepseek/src/index.ts:44] [E: packages/llm/llm-pi-ai/src/index.ts:87] [E: packages/host/apiproxy/src/api-proxy.ts:127] [E: packages/host/apiproxy/src/api-proxy.ts:256] 未列入 `exposedNamespaces()` 的已注册段，RPC 回 `settings-not-exposed`。[E: packages/host/apiproxy/src/api-proxy.ts:2009]

### 三层 resolve

`SettingsScope.get()` 返回深冻的已 resolve 值。内部 `resolve` 先 `mergeLayers(base, section)`（object 递归、数组整段替换），再交给 `schema(...)` 填 defaults 并校验。[E: packages/settings/settings/src/index.ts:705] 因此 **用户 section 赢过 `base`，`base` 赢过 schema default**。测试钉死：文档 `{ theme: 'light' }` + `base: { fontSize: 16 }` + schema default `theme:'dark'` / `fontSize:14` → `{ theme: 'light', fontSize: 16 }`。[E: packages/settings/settings/tests/settings.spec.ts:95]

`persist` 只写用户 section，不把 `base` 烤进盘；`replace` 整段替换用户层（`replace({})` 清掉覆盖，回到组合默认）。[E: packages/settings/settings/tests/settings.spec.ts:219] [E: packages/settings/settings/src/index.ts:548]

`installSettingsSection(ctx, ns, schema, entry, hooks)` 在 `ctx.inject(['settings'], …)` 里 `register(..., { base: entry })`，再 `setSource(() => scope.get())` + `onChange()`。[E: packages/settings/settings/src/index.ts:870] [E: packages/settings/settings/src/index.ts:872] 进程里没有 settings 服务时 inject 回调不跑，entry 自己就是权威（测试：`current()` 仍是 `{ theme: 'entry' }`，`onChange` 次数为 0）。[E: packages/settings/settings/tests/settings.spec.ts:721]

### `settings/updated` vs `settings/document-updated`

两条事件签名都没有 `next`。实现用 `events.dispatch('emit', …)` 逐个 listener 跑完：普通 throw / async reject 被包住并 `logger.warn`；这是 **emit 扇出**，不是必须 `next()` 的 waterfall，也不是 `session/flush` 那种 parallel。[E: packages/settings/settings/src/types.ts:35] [E: packages/settings/settings/src/types.ts:48] [E: packages/settings/settings/src/index.ts:729] [E: packages/settings/settings/src/index.ts:779]

| 事件 | 关门谓词 | 给谁 |
|---|---|---|
| `settings/updated` | resolved 深等；`deepEqualJson(next, prev)` 则整段 `return` [E: packages/settings/settings/src/index.ts:751] | consumer `onChange`（重挂 route、换 retry policy） |
| `settings/document-updated` | raw section 变了就 `revision + 1` [E: packages/settings/settings/src/index.ts:721] | 配置面：继承变成等值覆盖也要刷新「已覆盖」与 `expectedRevision` |

测试：把 raw override 写成与 default 相等的值 → 只发 `document-updated`，不发 `updated`。[E: packages/settings/settings/tests/settings.spec.ts:980]

`SettingsApplies`（`'live' \| 'restart'`）是给 UI 的标签，缺省 `'live'`，**不是**缝的运行时门。[E: packages/settings/settings/src/index.ts:443]

### CredentialRef 与 `.credentials.yaml`

`CredentialRef` 是 POSIX 环境变量名品牌。[E: packages/credentials/credentials/src/types.ts:13] 组合 / settings 里放 **ref**（`role('credential-ref')`，如 `llm-deepseek` 的 `apiKeyEnv` 默认 `DEEPSEEK_API_KEY`、`llm-pi-ai` profile 的 `apiKeyEnv`）。[E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/llm/llm-pi-ai/src/config.ts:233] secret **值**在 `$DSH_HOME/.credentials.yaml`（`CREDENTIALS_FILENAME`），不是 settings 文档。[E: packages/credentials/credentials-local/src/index.ts:52]

schema **允许** `role('secret')`（`web-search-deepseek` 的字面 `apiKey`），所以磁盘上的 `settings.yaml` **可以**含明文；`redactSecrets` 存在就是因为值可能在 section 里。[E: packages/web/web-search-deepseek/src/index.ts:64] [E: packages/settings/settings/src/redact.ts:52] 产品路径禁止把明文交给浏览器：`describe({ redactSecrets: true })` 对 `value` / `base` / `user` 各剥一遍，留下 sidecar `{ path, set }`（`set` 只表示槽里有没有值）。[E: packages/settings/settings/src/index.ts:501] [E: packages/host/apiproxy/src/api-proxy.ts:3268] 缺省（同进程）**不**剥。持 redacted 视图的写路径是 `mutate`（按 path set/unset），不是把剥过的文档 `replace` 回去。[E: packages/settings/settings/src/index.ts:564] Models 页把键交给 `credentials.set`，不把密钥写入 `settings.yaml`。[E: packages/client/ui-settings-models/src/client/ProviderEditor.tsx:282]

## 装配与门控

1. **host 面一行。** `dsh-base` 插入 `id: settings` / `name: '@deepseek-ai/dsh-settings-file'`。`PROFILE_TEMPLATES.web` = `dsh-base` + `dsh-web-app`，`headless` = `dsh-base` + `dsh-headless`。[E: packages/bundle/base/cordis.patch.yml:78] [E: packages/bundle/base/cordis.patch.yml:79] [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116] `dsh-web-app` / `dsh-headless` **不再**插一条 `id: settings`；headless 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31] `FileSettingsProvider.writable === true`，`watch` 默认 `true`，`debounceMs` 默认 `100`。[E: packages/settings/settings-file/src/index.ts:143] [E: packages/settings/settings-file/src/index.ts:64] [E: packages/settings/settings-file/src/index.ts:65]

2. **settings 是可选缝。** 没有 `id: settings` 时 `ctx.get('settings')` 为 `undefined`，consumer 停在自己的 entry Config 上。[E: packages/settings/settings-file/tests/loader-composition.spec.ts:138] [E: packages/settings/settings-file/tests/loader-composition.spec.ts:141] Provider 卸掉后 `installSettingsSection` 的 disposer 把 source 拨回 `entry`（consumer 自己正在 `UNLOADING`/`DISPOSED` 则沉默，避免拆资源时再注册 route）。[E: packages/settings/settings/src/index.ts:883] [E: packages/settings/settings/tests/settings.spec.ts:741]

3. **wire 白名单。** `exposedNamespaces()` = `ctx.llm.listConfigurableProviders()` 的 `settingsNs` ∪ `WEB_SETTINGS_NAMESPACES` ∪ `PRODUCT_SETTINGS_NAMESPACES`。`describe` 按此过滤；写路径先查名单。[E: packages/host/apiproxy/src/api-proxy.ts:1953] [E: packages/host/apiproxy/src/api-proxy.ts:3268] 并发写用 descriptor `revision` 当 `expectedRevision`，不匹配抛 `SettingsConflictError`（`code: 'SETTINGS_CONFLICT'`）。[E: packages/settings/settings/src/index.ts:166] [E: packages/settings/settings/src/index.ts:625]

4. **pi-ai：始终加载，零 route 直到 Settings 加 profile。** `dsh-base` 挂 `id: llm-pi-ai`，默认不写 `config.providers`。[E: packages/bundle/base/cordis.patch.yml:95] [E: packages/bundle/base/cordis.patch.yml:96] 插件 `Config.providers` 缺省 `{}`；`apply` 里 `installSettingsSection` 把 entry 当 `base`，`profiles()` 读 `current().providers`。[E: packages/llm/llm-pi-ai/src/config.ts:256] [E: packages/llm/llm-pi-ai/src/index.ts:278] [E: packages/llm/llm-pi-ai/src/index.ts:168] `ensureRegistrationFacts`：`routes.length === 0` 时不 `registerAdapter`（dormant）；有 profile 才 `registerAdapter(routes, adapter)`，清空再 `replace` 掉。[E: packages/llm/llm-pi-ai/src/index.ts:266] 目录（Models 可选列表）在零 route 时仍登记 catalog 里需要 API key 的提供方，所以页面能在没有任何 route 之前加 profile。[E: packages/llm/llm-pi-ai/src/index.ts:143] 路由 / 模型 / `apiKeyEnv` 怎样解析进 adapter，见 [surface.providers.pi-ai](../providers/pi-ai.md)。

5. **DeepSeek 对照。** `llm-deepseek` 同样 `installSettingsSection`，但 boot 就 `registerAdapter(['deepseek-official'], …)`；Settings 只热更新 endpoint / retry 等，不靠「有没有 section」才出现这条官方路由。[E: packages/llm/llm-deepseek/src/index.ts:256] [E: packages/llm/llm-deepseek/src/index.ts:270] 细节链 [surface.providers.deepseek](../providers/deepseek.md)。

6. **`agent-presets` 不走 helper。** 它直接 `register(..., { base: { default: config.default } })`：`defaultId` 每次现读，包一层 `installSettingsSection` 只会空转 `onChange`。[E: packages/preset/agent-presets/src/index.ts:142]

## 跨包关系

- `subsys.persistence.settings` — `ctx.settings` 缝的控制流、写队列、hot-reload 与 seam 三角；本页只写用户可见面与 Config 分层，不复述内部 14 步。
- `subsys.persistence.credentials` — `CredentialRef` 解析梯子与 `.credentials.yaml`；本页只划清「settings 放 ref / credentials 放值」。
- `surface.misc.home` — `resolveDshHome` / `$DSH_HOME`；本页默认文档落在该根下的 `settings.yaml`。
- `surface.providers.pi-ai` — Settings 的 `llm-pi-ai.providers` 如何变成活 route；本页只写「空 profile = 零 route」。
- `surface.providers.deepseek` — 官方路由始终注册；本页只写它怎样把 entry Config 当 `base`。
- `spine.composition-boot` — `profile → bundle → preset`；`id: settings` 从 `dsh-base` 进入真树。
- `subsys.host.apiproxy` — `settings.describe` / `mutate` / `openDocument` 的 RPC 边界与 namespace 白名单。

## Sources

- packages/settings/settings/src/index.ts
- packages/settings/settings/src/types.ts
- packages/settings/settings/src/redact.ts
- packages/settings/settings/package.json
- packages/settings/settings/tests/settings.spec.ts
- packages/settings/settings/tests/redact.spec.ts
- packages/settings/settings-file/src/index.ts
- packages/settings/settings-file/package.json
- packages/settings/settings-file/tests/local.spec.ts
- packages/settings/settings-file/tests/loader-composition.spec.ts
- packages/settings/settings-file/tests/watcher.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/util/home-paths/src/index.ts
- packages/util/home-paths/tests/home-paths.spec.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-pi-ai/src/config.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/api/settings.ts
- packages/credentials/credentials/src/types.ts
- packages/credentials/credentials-local/src/index.ts
- packages/client/ui-settings-models/src/client/ProviderEditor.tsx
- packages/web/web-search-deepseek/src/index.ts
- packages/preset/agent-presets/src/index.ts
- docs/config-catalog.md

## 相关

无 index related。邻居节点：

- [surface.misc.home](../misc/home.md)：`$DSH_HOME` 与 `resolveDshHome`（空白环境变量当未设置）。
- [surface.providers.pi-ai](../providers/pi-ai.md)：`llm-pi-ai` 路由 / profile / 每请求凭据。
- [surface.providers.deepseek](../providers/deepseek.md)：`deepseek-official` 与 `apiKeyEnv`。
- [subsys.persistence.settings](../../subsystems/persistence/settings.md)：`ctx.settings` 缝内部。
- [subsys.persistence.credentials](../../subsystems/persistence/credentials.md)：`.credentials.yaml` 与解析梯子。
- [spine.composition-boot](../../spine/composition-boot.md)：`dsh-base` 把 `id: settings` 叠进 profile 真树。
