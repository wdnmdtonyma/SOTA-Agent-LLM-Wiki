---
id: subsys.persistence.settings
title: settings 缝
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/src/types.ts
  - packages/settings/settings/src/redact.ts
  - packages/settings/settings/src/invariant.ts
  - packages/settings/settings/tests/settings.spec.ts
  - packages/settings/settings/tests/redact.spec.ts
  - packages/settings/settings-file/src/index.ts
  - packages/settings/settings-file/tests/loader-composition.spec.ts
  - packages/settings/settings-file/tests/local.spec.ts
  - packages/settings/settings-file/tests/watcher.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/util/home-paths/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/api/settings-controller/src/index.ts
  - packages/credentials/credentials/src/types.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/session/src/types.ts
  - packages/session/session-persistence/src/storage-contract.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/shell/shell/src/index.ts
symbols:
  - SettingsProvider
  - FileSettingsProvider
  - installSection
  - redactSecrets
  - SettingsController
related:
  - spine.composition-boot
  - spine.capability-seams
  - spine.overview
  - spine.session-log
  - subsys.persistence.credentials
  - surface.config.settings
  - subsys.llm.deepseek
  - subsys.llm.pi-ai
  - subsys.host.apiproxy
  - subsys.util.home-paths
  - subsys.core.session
evidence: explicit
status: verified
updated: c291e7961a
---

> `ctx.settings` 是 **host 面**用户设置缝：一份按 namespace 切段的 raw 文档，`SettingsScope.get` / 内部 `resolve` 的优先级是 schema defaults → composition `base`（entry Config）→ 用户文档 section。叠 `dsh-base` 的 shipped profile 挂 `FileSettingsProvider`（默认 `$DSH_HOME/settings.yaml`，hot-reload）。这是 Cordis 组合运行时的配置面，不是 session log，也不是另一套 coding agent 的内存 `SettingsManager`。

## 能回答的问题

- `ctx.settings` 的 resolve 三层顺序是什么？测试把哪一层钉成赢家？
- 五个 shipped profile 里谁挂 `settings-file`？`sdk-minimal` 呢？默认路径、boot 解析失败与 live 解析失败各怎样？
- `SettingsProvider.installSection` 怎样把 entry Config 当 `base`？进程里没有 settings 服务时谁是权威？
- `settings/updated` 与 `settings/document-updated` 是 emit、parallel 还是 waterfall？谁必须 `next()`？
- wire 为什么必须 `describe({ redactSecrets: true })`？`settings.yaml` 会不会存 `role('secret')` 明文？
- 组合 / settings 里的 `CredentialRef` 和 `$DSH_HOME/.credentials.yaml` 各放什么？

## 职责边界

本包拥有：`SettingsProvider`（`ctx.settings`）的 namespace 注册、三层 resolve、每 namespace 串行写队列、`settings/updated` / `settings/document-updated` 的 emit 扇出、`redactSecrets`、以及 shipped Provider `FileSettingsProvider`（一份 YAML/JSON 文档、跨进程锁、comment-preserving 叶级 diff、chokidar hot-reload）。

本包**不**拥有：secret **值**的存储与解析梯子（[subsys.persistence.credentials](credentials.md) 的 `ctx.credentials` / `.credentials.yaml`）；Models / General 表单与 Remote 字段表（[surface.config.settings](../../surface/config/settings.md)、[subsys.host.apiproxy](../host/apiproxy.md) 现为 Host HTTP API 的 `SettingsController`）；session event `version` / JSONL / SQLite `SCHEMA_VERSION` / checkpoint flush（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)）；agent-preset 面的 tools / persona / isolate。

`@deepseek-ai/dsh-settings` 是 **Service Definition**，不是 shipped Cordis 行。物理介质在 `@deepseek-ai/dsh-settings-file`。host HTTP 配置面在 `@deepseek-ai/dsh-api-settings-controller`（`ctx.settingsController`，Remote namespace `'settings'`）。settings 坐在 **host 进程**，preset 不得再 publish 一份 `settings`。

正交、写错会污染邻页的事实（本页只点名）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `3`）。JSONL catalog 有 adjacent v0→v1→v2→v3；比 3 新仍拒。 [E: packages/core/session/src/types.ts:88] [E: packages/session/session-persistence/src/storage-contract.ts:50]
- session persistence SQLite 包已删除。settings 文档不走那条盘。
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。那些 waterfall **必须** `next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/src/index.ts:81]
- compaction 的 `SurfaceOp` 只有 `'append'` 或 `{ op: 'replace'; startSeq; endSeq }`，没有 delete。 [E: packages/core/session/src/types.ts:434] [E: packages/core/session/src/types.ts:436]
- settings 分层：schema defaults → composition `base` → 用户文档 section。`SettingsProvider.resolve` 先 `mergeLayers(base, section)` 再走 schema。 [E: packages/settings/settings/src/index.ts:748]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。secret **值**在 `$DSH_HOME/.credentials.yaml`。 [E: packages/llm/llm-deepseek/src/index.ts:178] [E: packages/credentials/credentials-local/src/index.ts:61]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/settings/settings/src/index.ts` | `SettingsProvider`、`installSection`、`SettingsConflictError`、`mergeLayers` / `resolve` |
| `packages/settings/settings/src/types.ts` | `settings/updated`、`settings/document-updated`（均为 emit） |
| `packages/settings/settings/src/redact.ts` | `redactSecrets`：剥 `role('secret')`，留下 sidecar `secrets` |
| `packages/settings/settings/src/invariant.ts` | companion：`settings/updated` 必须对上权威 `get(ns)` 且 next ≠ prev |
| `packages/settings/settings/tests/settings.spec.ts` | 三层顺序、写队列、`installSection` attach/detach、`mutate`、revision |
| `packages/settings/settings/tests/redact.spec.ts` | `describe({ redactSecrets: true })` 剥每一层 |
| `packages/settings/settings-file/src/index.ts` | `FileSettingsProvider`、`resolveSpec`、boot `load` / live `refresh` |
| `packages/settings/settings-file/tests/loader-composition.spec.ts` | 真 Loader 组合：有/无 settings 行 |
| `packages/settings/settings-file/tests/local.spec.ts` | 默认路径、boot 解析失败 fail-loud、权限 0600 |
| `packages/settings/settings-file/tests/watcher.spec.ts` | live 无效编辑留 last good；写路径对脏盘 fail-loud |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: settings` → `@deepseek-ai/dsh-settings-file` |
| `packages/api/settings-controller/src/index.ts` | wire：`describe()` 固定 `redactSecrets: true` |
| `packages/llm/llm-deepseek/src/index.ts` | 产品约定：`apiKeyEnv` 标 `role('credential-ref')`，再 `installSection` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SettingsNamespace` | `parseSettingsNamespace()` 品牌化；必须匹配 `^[a-z][a-z0-9-]*$`。 [E: packages/settings/settings/src/index.ts:20] |
| `SettingsScope<T>` | owner 句柄：`get()` / `watch` / `update` / `replace`。`get()` 返回深冻的已 resolve 值。 |
| `SettingsRegisterOptions.base` | 组合层，压在用户层之下、schema defaults 之上。`installSection` 把插件 entry Config 填进这里。 |
| `SettingsApplies` | `'live' \| 'restart'`，给配置 UI 的声明，**不是**运行时门。缺省 `'live'`。 [E: packages/settings/settings/src/index.ts:53] |
| `SettingsDescriptor` | `describe()` 输出：`ns` / `schema`（`schema.toJSON()`）/ `value` / `revision` / 可选 `base` / `user` / `applies` / 可选 `secrets`。`user` 里出现的键 = 用户覆盖。 |
| `SettingsPathOp` | `{ op:'set', path, value }` 或 `{ op:'unset', path }`。给只拿到 redacted 视图的调用方，避免 `replace` 把没看见的 secret 抹掉。 [E: packages/settings/settings/src/index.ts:190] |
| `SettingsConflictError` | `code: 'SETTINGS_CONFLICT'`。`expectedRevision` 与当前 `revision` 不等则拒写。 [E: packages/settings/settings/src/index.ts:156] |
| `SettingsUpdateSource` | `'update'`（进程内 persist）或 `'provider'`（盘上/外部 publish）。 |
| `RedactedSecret` | `{ path, set }`。`set` 只表示槽里有没有值，值本身不随 wire 走。 |

一份文档的顶层键是 namespace，值必须是 object section；标量 / 数组当 section 在 `section()` 里抛 `must be an object of keys`。 [E: packages/settings/settings/src/index.ts:734]

## 控制流

1. **host 面挂 Provider。** `dsh-base` 用组合行 `id: settings` / `name: '@deepseek-ai/dsh-settings-file'` 插入叠 base 的 profile 第一层。`FileSettingsProvider` 继承 `SettingsProvider`，构造里 `super(ctx)`，服务键是 `ctx.settings`。这是进程级服务，不是 preset isolate 里的私有实例。`PROFILE_TEMPLATES` 五个名字：`acp` / `web` / `headless` / `sdk` 都是 `dsh-base` + 对应 app；`sdk-minimal` **只**叠 `@deepseek-ai/dsh-sdk-minimal`，其 `cordis.patch.yml` **没有** `id: settings` 行。`dsh-web-app` 另插 `id: settings-controller`（Host Remote）与 client 行 `id: ui-settings`，不是本缝的第二份 Provider。`dsh-headless` 的 `insert` 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/base/cordis.patch.yml:90] [E: packages/bundle/base/cordis.patch.yml:91] [E: packages/settings/settings/src/index.ts:350] [E: packages/settings/settings-file/src/index.ts:137] [E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:154] [E: packages/boot/app-boot/src/profile.ts:155] [E: packages/bundle/web-app/cordis.patch.yml:91] [E: packages/bundle/web-app/cordis.patch.yml:191] [E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/sdk-minimal/cordis.patch.yml:2]

2. **默认盘与 watch。** `resolveSpec`：显式 `path` 赢，否则 `join(resolveDshHome(dshHome), 'settings.yaml')`。`resolveDshHome` 优先级是配置路径 → 非空 `$DSH_HOME` → `~/.dsh`。扩展名只认 `.yaml` / `.yml` / `.json`。`watch` 默认 `true`，`debounceMs` 默认 `100`。`writable === true`。测试：只传 `dshHome` 时 `documentPath` 就是 `<home>/settings.yaml`。 [E: packages/settings/settings-file/src/index.ts:57] [E: packages/settings/settings-file/src/index.ts:65] [E: packages/util/home-paths/src/index.ts:90] [E: packages/settings/settings-file/tests/local.spec.ts:105]

3. **boot：`load` 失败 = 插件起不来。** `SettingsProvider[Service.init]` 在服务可 inject 之前 `this.publish(await this.load())`。`FileSettingsProvider` 用 `yield* super[Service.init]()` 走同一条路：已存在但 YAML 拆不开、根不是 map、文件是目录、权限不够，都会让 `ctx.plugin` reject。缺文件当空文档，不是错误。 [E: packages/settings/settings/src/index.ts:368] [E: packages/settings/settings-file/src/index.ts:237] [E: packages/settings/settings-file/tests/local.spec.ts:156]

4. **Consumer 用 `installSection` 把 entry 当 `base`。** 消费者先 `ctx.inject(['settings'], …)`：有服务才 `settings.installSection(owner, ns, schema, entry, hooks)`，内部 `register(..., { base: entry })`、`setSource(() => scope.get())`、再 `onChange()`。没有 settings 行时 inject 回调不跑，`hooks.setSource` 从未被调用，entry 自己就是权威。真 Loader 测试：无 `id: settings` 时 `ctx.get('settings')` 为 `undefined`，consumer 跑在 schema default + composition base。旧名 `installSettingsSection` 已不存在。 [E: packages/settings/settings/src/index.ts:472] [E: packages/settings/settings/src/index.ts:483] [E: packages/settings/settings/tests/settings.spec.ts:721] [E: packages/settings/settings-file/tests/loader-composition.spec.ts:138] [E: packages/settings/settings-file/tests/loader-composition.spec.ts:141]

5. **resolve = schema defaults → composition `base` → 用户 section。** `resolve` 先 `mergeLayers(base, section)`（object 递归、数组整段替换、`undefined` 不擦下层），再把候选交给 `schema(...)` 填 defaults 并做运行时校验，最后可选 `validate`。用户层赢过 `base`，`base` 赢过 schema default。测试钉死：文档 `{ theme: 'light' }` + `base: { fontSize: 16 }` → `{ theme: 'light', fontSize: 16 }`。`persist` 只写用户 section，不把 `base` 烤进盘。 [E: packages/settings/settings/src/index.ts:748] [E: packages/settings/settings/tests/settings.spec.ts:93] [E: packages/settings/settings/tests/settings.spec.ts:217]

6. **`register` 是 fiber effect。** 重复 namespace 立刻抛 `already registered`。已存 section 过不了 schema / `validate` → **注册本身失败**（此时还没有 last good）。注册成功后 `resolved` 深冻。卸掉 registrant fiber 会 `registrations.delete(ns)`，observer 一起走；盘上的 section 仍在，下次 `register` 再读。 [E: packages/settings/settings/src/index.ts:426] [E: packages/settings/settings/src/index.ts:444]

7. **进程内写：先校验再 persist 再 commit。** `update` / `replace` / `mutate` 都进每 namespace 一条 settled-tail 队列。调用时 `cloneJsonShaped` 快照并拒 Date / Map / bigint / 环 / 非有限数字 / 数组里的 `undefined`。排到队头才读**当前** section、比 `expectedRevision`、merge 或 apply path ops、`resolve`（失败则 **尚未 persist**）、`await persist`、写回 `document[ns]`。若此时 registration 仍是 owner 且服务未停：raw section 变了就 `bumpRevision`（emit `settings/document-updated`），resolved 变了才 `commit`（watcher + emit `settings/updated`，`source: 'update'`）。前一次写 reject 不会毒死后续队列。 [E: packages/settings/settings/src/index.ts:650] [E: packages/settings/settings/src/index.ts:652]

8. **事件是 emit，没有 `next()`。** `settings/updated` 与 `settings/document-updated` 的签名都没有 `next`。`commit` / `emitDocumentUpdated` 用 `events.dispatch('emit', …)` 逐个 listener 跑完：普通 throw / async reject 被包住并 `logger.warn`；`code === 'INVARIANT'` 等全部跑完再 rethrow。`deepEqualJson(next, prev)` 则整段 `return`，不发 `settings/updated`。把 raw override 写成与 `base`/default 相等的值：resolved 不变，但 revision +1 且发出 `settings/document-updated`。这不是 waterfall，省略 `next()` 挡不住任何人；也不是 `session/flush` 那种 parallel。 [E: packages/settings/settings/src/types.ts:92] [E: packages/settings/settings/src/types.ts:105] [E: packages/settings/settings/src/index.ts:794] [E: packages/settings/settings/src/index.ts:821]

9. **外部盘：`publish` / watcher。** Provider 把完整 raw 文档推进 `publish(doc, 'provider')`。每个已注册 namespace 再 resolve；坏 section `logger.warn` 并 **keep last good**，别的 namespace 照常 commit。`FileSettingsProvider` 的 chokidar `'all'` / `'ready'` 把 `refresh` 排进与 persist 同一条 operation 链：文本等于缓存（含自己刚写下的）是 no-op；ENOENT 发布空文档；拆不开或读失败 **warn + 留 last good**，进程继续。测试：live 写成 `ui-theme: [unclosed` 后 `scope.get()` 仍是 `{ theme: 'light', fontSize: 14 }`。 [E: packages/settings/settings/src/index.ts:720] [E: packages/settings/settings-file/src/index.ts:311] [E: packages/settings/settings-file/tests/local.spec.ts:404]

10. **写盘是 read-modify-write，脏盘 fail-loud。** `persistSection` 先 `mkdir(..., 0o700)`，再 `withFileLock`：`reconcileFromDisk()` 折进尚未观察到的外部编辑，然后 YAML 走叶级 `setIn`/`deleteIn`（注释留下），JSON 整段换一个 namespace 键。`writeFileAtomic(..., { mode: 0o600, dirMode: 0o700 })`。若盘上文本已经拆不开，`reconcileFromDisk` 抛、这次 `update` reject，**不覆盖**用户手改。`prepareDocument` 用 `wx` 物化空文件。 [E: packages/settings/settings-file/src/index.ts:215] [E: packages/settings/settings-file/src/index.ts:228] [E: packages/settings/settings-file/src/index.ts:159] [E: packages/settings/settings-file/tests/watcher.spec.ts:218]

11. **wire 必须 redact。** `describe({ redactSecrets: true })` 对 `value` / `base` / `user` 各跑一遍 `redactSecrets`：walker 只进 `object` / `dict` / `array`，碰到 `meta.role === 'secret'` 就删值并记 `{ path, set }`。缺省（同进程 UI）**不**剥。`SettingsController.describe` 固定传 `redactSecrets: true`。持 redacted 视图的写路径是 `mutate`（按 path set/unset），不是把剥过的文档 `replace` 回去。测试：存着 `apiKey: 'sk-stored'` 时 redacted `user` 没有该键；`unset ['baseURL']` 之后 verbatim `user` 仍带 `apiKey`。 [E: packages/settings/settings/src/index.ts:527] [E: packages/settings/settings/src/redact.ts:52] [E: packages/api/settings-controller/src/index.ts:122] [E: packages/settings/settings/tests/settings.spec.ts:837]

12. **detach：settings 走了回退 entry；consumer 自己卸则沉默。** `installSection` 在 scoped fiber 的 disposer 里：若 consumer 自己的 fiber 已是 `UNLOADING`/`DISPOSED`，直接 return。否则 `setSource(() => entry)` 再 `onChange()`。`scope.watch` 同样在 unloading 时跳过。测试：挂上 MemorySettings 后 source 变成用户层；dispose Provider 后回到 `{ theme: 'entry' }`。 [E: packages/settings/settings/src/index.ts:487] [E: packages/settings/settings/tests/settings.spec.ts:741]

13. **产品约定：adapter 配置放 `CredentialRef`，secret 值放 credentials 文档。** `llm-deepseek` 的 `Config.apiKeyEnv` 是 `z.string().role('credential-ref').default('DEEPSEEK_API_KEY')`，`apply` 里 `installSection(ctx, 'llm-deepseek', Config, config, …)`；每请求用 `credentialRef(...)` 去 `ctx.credentials.resolve`。`CredentialRef` 是 POSIX 环境变量名品牌。`.credentials.yaml`（`CREDENTIALS_FILENAME`）存的是 **非空 secret 字符串**，不是 ref。schema **允许** `role('secret')`（`web-search-deepseek` 的字面 `apiKey`），所以 `settings.yaml` **可以**含明文 secret。 [E: packages/llm/llm-deepseek/src/index.ts:178] [E: packages/llm/llm-deepseek/src/index.ts:492] [E: packages/credentials/credentials/src/types.ts:14] [E: packages/credentials/credentials-local/src/index.ts:61] [E: packages/web/web-search-deepseek/src/index.ts:64]

14. **其它 shipped consumer（点到即可）。** `llm-pi-ai` 同样 `installSection`，空 profiles 时 route 休眠。`agent-loop` / `agent-default-model` / `bash-local` / `pwsh-local` / `permission-presets` / `web-search-deepseek` 走同一 helper。`dsh-agent-presets` **故意不用** helper：`defaultId` 每次现读，hooks 会是空转；它直接 `register(SETTINGS_NAMESPACE, …, { base: { default: config.default } })`，`SETTINGS_NAMESPACE` 是 `'agent-presets'`。wire 不再有 ApiProxy 白名单；Host Remote 由 `SettingsController` 描述全部已注册 namespace。 [E: packages/llm/llm-pi-ai/src/index.ts:297] [E: packages/preset/agent-presets/src/index.ts:181] [E: packages/preset/agent-presets/src/index.ts:55] [E: packages/core/agent-loop/src/index.ts:396] [E: packages/api/settings-controller/src/index.ts:117]

## 设计动机

DSH 把「组合时写进 `cordis.yml` / bundle 行的 entry」和「用户事后改、下次请求就要生效的文档」拆开。entry 是 composition `base`；用户文档是可热发布的 overlay。没有 settings 服务时插件仍按组合好的 Config 工作——settings 是可选缝，不是第二个启动器。`sdk-minimal` 就是这条路径：不叠 `dsh-base`，adapter 停在 entry。

三层顺序让 schema 继续当表单与缺省源，bundle 行继续当产品默认，用户只覆盖自己改过的键。`persist` 不把 `base` 烤进 YAML，reset（`replace({})`）才能回到组合默认。

`settings/updated` 按 resolved 深等关门，是给 `installSection` 的 `onChange`（重挂 route、换 retry policy）。`settings/document-updated` 按 raw section 关门，是给编辑器：继承变成等值覆盖也要刷新「已覆盖」标记。两条都是 emit 扇出，一条坏 listener 不能卡死 Provider 的 reload 环。

`role('secret')` 留在 schema 里，是因为有的插件仍接受字面密钥，redact 才能让 wire 只带槽位。adapter 主路径用 `CredentialRef`，把值赶到 `.credentials.yaml` / 环境。

## Gotcha

- **boot 解析失败 ≠ live 解析失败。** 启动时坏文档让 `settings-file` 插件起不来。跑起来之后坏编辑只 warn，resolved 停在 last good。对脏盘做 `update` 则 fail-loud，不覆盖手改。 [E: packages/settings/settings-file/tests/local.spec.ts:156] [E: packages/settings/settings-file/src/index.ts:311]
- **不要把 `settings.yaml` 说成「只存 ref」。** schema 可以声明 `role('secret')`；redact 存在就是因为值可能在文档里。产品约定 adapter 用 `apiKeyEnv`。 [E: packages/web/web-search-deepseek/src/index.ts:64]
- **`describe()` 默认不 redact。** 漏传 `redactSecrets: true` 会把 secret 交给 RPC。wire 合同在 `SettingsController`。 [E: packages/settings/settings/src/index.ts:527]
- **redacted `replace` 会删没看见的 secret。** 用 `mutate`。空 path 寻址整段 section。 [E: packages/settings/settings/tests/settings.spec.ts:837]
- **没有 settings 服务时 `inject(['settings'])` 整段不跑。** 调用方必须先让 `current` 指向 entry。 [E: packages/settings/settings/tests/settings.spec.ts:721]
- **`agent-presets` 不走 `installSection`。** 再包一层只会空转 `onChange`。 [E: packages/preset/agent-presets/src/index.ts:181]
- **namespace 撞车 fail-loud。** 两个插件 `register` 同一个 kebab 名会抛 `already registered`。`SHELL_SETTINGS_NAMESPACE` 是 `'shell'`：`bash-local` 与 `pwsh-local` 共用这一名，同时挂要靠组合互斥，不是 settings 自动 merge。 [E: packages/shell/shell/src/index.ts:21] [E: packages/settings/settings/src/index.ts:426]
- **`applies: 'restart'` 只是标签。** 缝本身 live commit；要不要重启是 owner / UI 的事。
- **union / transform 里的 secret 走不到 walker。** `redactSecrets` 对未建模的节点原样返回。secret 必须挂在 object/dict/array 能直接走到的字段上。 [E: packages/settings/settings/src/redact.ts:90]
- **`sdk-minimal` 不挂本缝。** 其 insert 是完整树，不含 `settings-file`；消费者回退 composition entry。 [E: packages/bundle/sdk-minimal/cordis.patch.yml:2]
- **本缝与 session 盘版本正交。** `SESSION_FORMAT_VERSION = 3` 管的是 session log，不迁 settings 文档。checkpoint 在 `llm/stream` / 顶层 `tools/execute` 前 `sessions.flush`，不读 `ctx.settings`。 [E: packages/core/session/src/types.ts:88] [E: packages/session/session-checkpoint-policy/src/index.ts:35]

## Seam 三角

| 角色 | 包 / 合同 | ctx 键 | `dsh-base` | `dsh-web-app` | `dsh-headless` / `dsh-sdk-app` / `dsh-acp-app` | `dsh-sdk-minimal` |
|---|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-settings`：`SettingsProvider`、`SettingsScope`、`installSection`、`redactSecrets`；事件 `settings/updated`、`settings/document-updated`（**emit**，无 `next`） | `ctx.settings` | 类型随消费者 peerDep 进来；**没有**单独的 Definition 行 | 不改合同 | 不改合同 | 不改合同 |
| Provider | `@deepseek-ai/dsh-settings-file` 的 `FileSettingsProvider` | 实现同一个 `ctx.settings` | `id: settings`，默认 `$DSH_HOME/settings.yaml`，`watch: true`。旁边挂 `id: credentials` → `credentials-local` | **继承**，不重挂；另 insert `settings-controller` 与 `ui-settings` | **继承**（叠 base）；headless insert 无 HTTP / storage | **不**挂 `settings-file` |
| Consumer | `installSection`：`llm-deepseek` / `llm-pi-ai` / `agent-loop` / `agent-default-model` / `shell` / `permission` / `web-search-deepseek`。`agent-presets` 直接 `register`。wire：`SettingsController.describe` 固定 redact | 读 `scope.get()` / `watch`；写 `update`/`replace`/`mutate` | adapter / loop / shell 是 host 行，跟 settings 同进程 | 浏览器半边只看见 redacted descriptor，不持 `ctx.settings` | 无（headless/sdk/acp）或非 Web HTTP；仍吃同一份 `$DSH_HOME/settings.yaml` overlay | 无 Provider；`inject(['settings'])` 不跑，停在 entry |

换掉 `settings-file` 只换 raw 文档介质（例如测试用的 MemorySettings）；resolve 顺序、emit 合同、`installSection` 回退 entry 都不变。卸掉整行，每个 consumer 停在自己的 composition entry 上。preset 需要私有 Provider 时必须 `isolate`；`settings` 不是那种私有服务。

## Sources

- packages/settings/settings/src/index.ts
- packages/settings/settings/src/types.ts
- packages/settings/settings/src/redact.ts
- packages/settings/settings/src/invariant.ts
- packages/settings/settings/tests/settings.spec.ts
- packages/settings/settings/tests/redact.spec.ts
- packages/settings/settings-file/src/index.ts
- packages/settings/settings-file/tests/loader-composition.spec.ts
- packages/settings/settings-file/tests/local.spec.ts
- packages/settings/settings-file/tests/watcher.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/util/home-paths/src/index.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/web/web-search-deepseek/src/index.ts
- packages/api/settings-controller/src/index.ts
- packages/credentials/credentials/src/types.ts
- packages/credentials/credentials-local/src/index.ts
- packages/preset/agent-presets/src/index.ts
- packages/core/agent-loop/src/index.ts
- packages/core/session/src/types.ts
- packages/session/session-persistence/src/storage-contract.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/shell/shell/src/index.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md)：`profile → bundle → preset`；五个 shipped profile，`dsh-base` 先于 web-app / headless / sdk-app / acp-app 叠层；`sdk-minimal` 不叠 base。本页 `id: settings` 从 `dsh-base` 进入真树。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；本缝的 `ctx.settings` 是 host 面能力缝。
- [spine.overview](../../spine/overview.md)：host 面 vs agent-preset 面；入口含 `dsh web` 与 `dsh --profile sdk|sdk-minimal|acp|headless`。
- [spine.session-log](../../spine/session-log.md)：append-only log 与 `deriveMessages`；本缝不写 session 事件。
- [subsys.persistence.credentials](credentials.md)：`CredentialRef` 解析梯子；`.credentials.yaml` 存 secret 值。
- [surface.config.settings](../../surface/config/settings.md)：用户可见设置面与 Config 目录，不在本页展开表单。
- [subsys.llm.deepseek](../llm/deepseek.md)：`llm-deepseek` 用 `installSection` + `apiKeyEnv`；密钥按请求解析。
- [subsys.llm.pi-ai](../llm/pi-ai.md)：`llm-pi-ai` 段为空则零 route，段有 profiles 才 `registerAdapter`。
- [subsys.host.apiproxy](../host/apiproxy.md)：Host HTTP API；`SettingsController` 的 `describe` / `mutate` / `openSettingsDocument`。节点 id 保持稳定别名。
- [subsys.util.home-paths](../util/home-paths.md)：`resolveDshHome` / `dshHomePath`；本页默认文档落在该根下的 `settings.yaml`。
- [subsys.core.session](../core/session.md)：`SESSION_FORMAT_VERSION`、`surfaceOp: replace`、`session/flush` parallel。
