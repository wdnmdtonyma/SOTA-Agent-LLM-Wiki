---
id: subsys.persistence.credentials
title: credentials 缝
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
  - packages/credentials/credentials-local/tests/review-fixes.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/util/launch-environment/src/index.ts
  - packages/core/session/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-deepseek/src/adapter.ts
  - packages/llm/llm-deepseek/tests/loader-composition.spec.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/api/credentials.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/src/redact.ts
  - packages/settings/settings/tests/redact.spec.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/core/session/src/types.ts
  - packages/session/session-persistence-sqlite/src/schema.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
symbols:
  - CredentialProvider
  - CredentialRef
  - credentialRef
  - LocalCredentialProvider
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
updated: 47f943859b
---

> `ctx.credentials` 是 **host 面** credential-reference 缝：组合 / settings 只携带 `CredentialRef`（POSIX 环境变量名），secret **值** 由 Provider 拥有。shipped 唯一实现是 `LocalCredentialProvider`（`$DSH_HOME/.credentials.yaml`），不是 keyring。这是 Cordis 组合运行时（`profile → bundle → agent preset`）把密钥从配置面拆出去的能力缝，不是又一个 coding agent 往 `process.env` 里灌明文。

## 能回答的问题

- `ctx.credentials` 的 Definition / Provider / Consumer 各是哪个包？`dsh web` 与 headless 会不会各挂一行？
- `CredentialRef` 是什么？组合 Config / `settings.yaml` 里放什么，`.credentials.yaml` 里放什么？
- `resolve` 的梯子是哪四层？哪一层只读且挡住 `set` / `unset`？空串算不算已配置？
- `credentials/updated` 是 emit、waterfall 还是 parallel？谁必须 `next()`？
- Models 页写入会不会把 secret 灌进 `process.env`？没有挂 credentials 缝时 adapter 怎么取密钥？

## 职责边界

本包拥有：`CredentialProvider` 抽象缝（`ctx.credentials`）、`credentialRef()` 品牌化、`credentials/updated` **emit** 的 contained fan-out、以及 shipped `LocalCredentialProvider` 对四层来源的解析 / 写盘 / 热更新。

本包**不**拥有：settings 分层与 `settings.yaml` 文档（[subsys.persistence.settings](settings.md)、[surface.config.settings](../../surface/config/settings.md)）；DeepSeek / pi-ai 何时 `resolve`、如何把 bearer 送进 adapter（[subsys.llm.deepseek](../llm/deepseek.md)、[subsys.llm.pi-ai](../llm/pi-ai.md)）；浏览器 RPC 形状与 Models 页表单（[subsys.host.apiproxy](../host/apiproxy.md)）；session log / JSONL / SQLite / checkpoint。本仓**没有** shipped keyring Provider。

`dsh-credentials` 是 **host 面**服务。agent-preset 面只在自己的 Config / settings section 里写 `apiKeyEnv` 这种 **ref**，不得再 `provide` 一份 `credentials`：preset 往 root realm publish 服务会被 `leakedServices` 拒。 [E: packages/preset/agent-presets/src/mount.ts:364] 默认产品路径是本地 Web GUI（`dsh web`），没有 shipped TUI 包。

正交、写错会污染邻页的事实（本页只点名）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `0`）。跨 version **没有**自动 migration。 [E: packages/core/session/src/types.ts:56]
- SQLite **session 盘** `SCHEMA_VERSION = 15`：`user_version` 非 0 且不等于 15 → 拒开，原地不迁。 [E: packages/session/session-persistence-sqlite/src/schema.ts:20] [E: packages/session/session-persistence-sqlite/src/schema.ts:108] 该 backend **不**在任何 shipped bundle（base / web-app / headless 都没有 `session-persistence-sqlite` 行）。 [I]
- shipped JSONL 后端挂在 base：`id: session-persistence-jsonl`，`root: dshHomePath('sessions')`。headless / web 继承这一行，自己不重挂。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:99] [E: packages/bundle/base/cordis.patch.yml:101]
- shipped `session-query-sqlite` 写出 `openAt: never`（base 挂载；web-app 用同一键重述仍是 `never`）。search 默认关，不 import/open sqlite。 [E: packages/bundle/base/cordis.patch.yml:117] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:33]
- `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache` **只 web-app**。headless insert 只有 `code-runtime` / `headless-startup` / `headless-runner`，没有这三组。 [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:54] [E: packages/bundle/web-app/cordis.patch.yml:59] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]
- `session/flush` 是 **parallel**（`Promise.allSettled`，没有 `next`），不是 waterfall。 [E: packages/core/session/src/index.ts:1026]
- checkpoint 在 `llm/stream` 进 adapter **之前**、以及 top-level `tools/execute` 进 tool body **之前** `sessions.flush`。嵌套 `exec.parent` 不再刷。`agent/pre-step` 另有一条耐久刷盘，不是副作用门。那些 waterfall **必须** `next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:36] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72] [E: packages/session/session-checkpoint-policy/src/index.ts:80] [E: packages/session/session-checkpoint-policy/src/index.ts:81]
- compaction 只有 `surfaceOp: { op: 'replace', start, end }`，没有 delete。 [E: packages/core/session/src/types.ts:373] [E: packages/core/session/src/types.ts:374]
- settings 分层：schema defaults → composition `base` → 用户文档 section。`SettingsScope.get` 读已 resolve 的快照；私有 `resolve` 先 `mergeLayers(base, section)` 再走 schema。 [E: packages/settings/settings/src/index.ts:458] [E: packages/settings/settings/src/index.ts:705]
- 组合 / adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。secret **值**在 `$DSH_HOME/.credentials.yaml`。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:52]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/credentials/credentials/src/index.ts` | Definition：`CredentialProvider`、`credentialRef`、`notifyUpdated` |
| `packages/credentials/credentials/src/types.ts` | 浏览器可进的 `CredentialRef` + `credentials/updated` 声明 |
| `packages/credentials/credentials/src/invariant.ts` | 无 live 服务时 emit `credentials/updated` 即 fail |
| `packages/credentials/credentials/tests/credentials.spec.ts` | POSIX 名、空串=缺席、`set`/`unset` 才 emit |
| `packages/credentials/credentials-local/src/index.ts` | shipped Provider：梯子、`.credentials.yaml`、watch、原子写 |
| `packages/credentials/credentials-local/tests/local.spec.ts` | 四层次序、shadow 拒写、0600、热更新 |
| `packages/credentials/credentials-local/tests/review-fixes.spec.ts` | RMW 折叠外部编辑；observer 失败不回滚已提交写 |
| `packages/bundle/base/cordis.patch.yml` | host 组合行 `id: credentials`；同层 `session-persistence-jsonl` `root: dshHomePath('sessions')`；`session-query-sqlite` `openAt: never` |
| `packages/bundle/web-app/cordis.patch.yml` | 不重挂 `credentials`；继承 base；insert `storage*` / `workspace` / `session-projection-cache`（**只 web-app**）；重申 `session-query-sqlite` `openAt: never` |
| `packages/bundle/headless/cordis.patch.yml` | 不重挂 `credentials`；继承 base；insert 无 storage / workspace / projection-cache |
| `packages/util/launch-environment/src/index.ts` | 冻结的 `process` / `project-env` / `user-env` 快照 |
| `packages/llm/llm-deepseek/src/index.ts` | `apiKeyEnv` + 每请求 `resolveApiKey` |
| `packages/llm/llm-pi-ai/src/index.ts` | 点了 `apiKeyEnv` 就必须解析到值，否则 `MISSING_CREDENTIAL` |
| `packages/host/apiproxy/src/api-proxy.ts` | `credentials.describe` / `set` / `unset` RPC |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset 不得往 root 再 publish `credentials` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CredentialRef` | `Branded<'CredentialRef'>`。语义是 **POSIX 风格环境变量名**，不是 secret 本身。 [E: packages/credentials/credentials/src/types.ts:13] |
| `credentialRef(value)` | `/^[A-Za-z_][A-Za-z0-9_]*$/` 才品牌化；`9LEADING` / `WITH-DASH` / `ns:key` 抛 `TypeError`。 [E: packages/credentials/credentials/src/index.ts:16] [E: packages/credentials/credentials/src/index.ts:24] [E: packages/credentials/credentials/tests/credentials.spec.ts:23] |
| `ResolvedCredential` | `{ value, source }`。`value` 非空。local 的 `source` 是 `env` / `file` / `project-env` / `user-env`。 |
| `CredentialInfo` | `{ configured, source?, writable }`。给配置 UI；**永不带 value**。 |
| `credentials/updated` | Cordis **emit**（`dispatch('emit')`）。参数只有 `ref`。process-env 变化不可观察、不发事件。 [E: packages/credentials/credentials/src/types.ts:29] [E: packages/credentials/credentials/src/index.ts:118] |
| `CREDENTIALS_FILENAME` | `'.credentials.yaml'`。默认路径 `join(resolveDshHome(dshHome), CREDENTIALS_FILENAME)`。 [E: packages/credentials/credentials-local/src/index.ts:52] [E: packages/credentials/credentials-local/src/index.ts:81] |
| 文档形状 | 严格 `CredentialRef → 非空 string` mapping。非 mapping 根、非 POSIX 键、非 string 值、空串、重复键一律拒，不静默跳过。 [E: packages/credentials/credentials-local/src/index.ts:166] [E: packages/credentials/credentials-local/src/index.ts:180] |
| settings 里的 ref | `z.string().role('credential-ref')`。`redactSecrets` **只剥** `role('secret')`，`apiKeyEnv` 原样过线。 [E: packages/settings/settings/src/redact.ts:52] [E: packages/settings/settings/tests/redact.spec.ts:35] |

空串在缝上的统一规则：任何层的空值都是缺席——`resolve` 跳过，`describe` 报 unconfigured。空白不能冒充已配置密钥。 [E: packages/credentials/credentials/tests/credentials.spec.ts:38] [E: packages/credentials/credentials/tests/credentials.spec.ts:39]

## 控制流

1. **host 面挂 shipped Provider。** `dsh-base` 用组合行 `id: credentials` / `name: '@deepseek-ai/dsh-credentials-local'` 把 `LocalCredentialProvider` 插进每个 profile 的第一层。`CredentialProvider` 构造时 `super(ctx, 'credentials')`，键是 `ctx.credentials`。这是进程级服务，不是 preset isolate 里的私有实例。`dsh-web-app` / `dsh-headless` 的 patch **没有**再插同名行，所以 `dsh web` 与 headless 继承 base 这一份。同层 base 还挂 `id: session-persistence-jsonl`（`root: dshHomePath('sessions')`）和 `id: session-query-sqlite`（`path: ':memory:'`、`openAt: never`）。web-app 另 insert `storage` + `storage-json` + `storage-domain`、`workspace`、`session-projection-cache`（**只 web-app**）；headless insert 只有 `code-runtime` / `headless-startup` / `headless-runner`。 [E: packages/bundle/base/cordis.patch.yml:85] [E: packages/bundle/base/cordis.patch.yml:86] [E: packages/credentials/credentials/src/index.ts:62] [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:51] [E: packages/bundle/web-app/cordis.patch.yml:73] [E: packages/bundle/web-app/cordis.patch.yml:76] [I]

2. **boot 读盘：缺文件是空 store，坏文件起不来。** `Service.init` 先 `loadInitial`：`assertOwnerOnly`（POSIX 上 group/other 位非 0 则拒，**先于**读内容）；`ENOENT` 直接返回空 `values`；读到的文本走 `parseCredentialsDocument`。存在但不可信的文档不得被当成「没存密钥」。默认 `watch: true`、`debounceMs: 100`。 [E: packages/credentials/credentials-local/src/index.ts:425] [E: packages/credentials/credentials-local/src/index.ts:430] [E: packages/credentials/credentials-local/src/index.ts:433] [E: packages/credentials/credentials-local/src/index.ts:83] [E: packages/credentials/credentials-local/tests/local.spec.ts:66]

3. **`resolve` 梯子（每调用重走，禁止跨操作缓存）。** `LocalCredentialProvider.resolve` 顺序是：`launchEnvironmentOf(ctx).getFrom(ref, ['process'])` 且非空 → `{ source: 'env' }`；否则内存快照 `this.values` → `{ source: 'file' }`；否则 `getFrom(ref, ['project-env', 'user-env'])` 且非空 → `{ source: fallback.source }`；全无则 `undefined`。没有 launcher 快照时，`launchEnvironmentOf` 把当前 `process.env` 收成唯一的 `process` 层。 [E: packages/credentials/credentials-local/src/index.ts:311] [E: packages/credentials/credentials-local/src/index.ts:313] [E: packages/credentials/credentials-local/src/index.ts:315] [E: packages/util/launch-environment/src/index.ts:116] [E: packages/credentials/credentials-local/tests/local.spec.ts:86]

4. **`describe` 只报层与可写性。** 继承环境挡住时 `{ configured: true, source: 'env', writable: false }`。`file` / `project-env` / `user-env` 都报 `writable: true`（往 managed 文件写一条就能盖过 `.env`）。全缺 `{ configured: false, writable: true }`。 [E: packages/credentials/credentials-local/src/index.ts:324] [E: packages/credentials/credentials-local/src/index.ts:327] [E: packages/credentials/credentials-local/src/index.ts:329] [E: packages/credentials/credentials-local/src/index.ts:330] [E: packages/credentials/credentials-local/tests/local.spec.ts:148]

5. **`set` / `unset` 只改 managed 文件。** `set` 拒空串（叫人 `unset`）。入口与出队时各跑一次 `assertUnshadowed`：`process` 层非空则抛「launching environment … shadowed」，**不**写盘。过门之后 `mkdir(..., 0o700)` + `withFileLock`：先 `reconcileFromDisk` 折入未观察的外部编辑，再 `writeFileAtomic(..., { mode: 0o600 })`，改内存快照，最后 `notifyUpdated`。`unset` 对已缺席的 key 是 no-op（不发事件）。这条路径**不**写 `process.env`。 [E: packages/credentials/credentials-local/src/index.ts:334] [E: packages/credentials/credentials-local/src/index.ts:411] [E: packages/credentials/credentials-local/src/index.ts:394] [E: packages/credentials/credentials-local/src/index.ts:400] [E: packages/credentials/credentials-local/src/index.ts:391] [E: packages/credentials/credentials-local/tests/local.spec.ts:338] [I]

6. **`credentials/updated` 是 emit，没有 `next()`。** `notifyUpdated` 用 `this.ctx.events.dispatch('emit', args)` 扇出。每个 listener 都跑；sync throw / async reject 被 log 吞掉，**不**把已提交的 `set`/`unset` 改成失败。唯一例外：`error.code === 'INVARIANT'` 等全部 listener 跑完再 rethrow（只有同步 listener 的抛出会回到 emitter）。这不是 waterfall（没有 innermost `next`），也不是 `session/flush` 那种 `Promise.allSettled` parallel。Provider **只在写或 reload 已经 commit 之后**才调用。 [E: packages/credentials/credentials/src/index.ts:118] [E: packages/credentials/credentials/src/index.ts:127] [E: packages/credentials/credentials-local/tests/review-fixes.spec.ts:94] [E: packages/credentials/credentials-local/tests/review-fixes.spec.ts:119]

7. **热更新替换整份快照。** chokidar `all` / `ready` 都 `queueRefresh`。内容等于 `this.text`（含自己刚写的）是 no-op。磁盘上删掉的 key 不得留在内存。live reload 解析失败 → warn + 保留 last good；**写路径**上同一份坏文档则大声失败，避免覆盖读不懂的文件。 [E: packages/credentials/credentials-local/src/index.ts:453] [E: packages/credentials/credentials-local/src/index.ts:476] [E: packages/credentials/credentials-local/tests/local.spec.ts:416] [E: packages/credentials/credentials-local/tests/local.spec.ts:361]

8. **Consumer 每次操作向缝要一次值。** `dsh-llm-deepseek` 的 `Config.apiKeyEnv` 默认 `DEEPSEEK_API_KEY`，schema 标 `role('credential-ref')`；`resolveAdapterOptions` 把它收成 `credentialRef(...)`。`DeepSeekAdapter.stream` 每个请求先 `options()` 再 `resolveApiKey(connection)`：有 `ctx.credentials` 就 `credentials.resolve(ref)`，否则读 `launchEnvironmentOf(ctx).get(ref)`。两边都空 → `LlmError('MISSING_CREDENTIAL')`，路由仍注册。密钥与 endpoint 来自**同一份** connection 快照。 [E: packages/llm/llm-deepseek/src/index.ts:45] [E: packages/llm/llm-deepseek/src/index.ts:184] [E: packages/llm/llm-deepseek/src/index.ts:231] [E: packages/llm/llm-deepseek/src/adapter.ts:221] [E: packages/llm/llm-deepseek/src/index.ts:241]

9. **pi-ai：点了 ref 就不能退回环境发现。** `profile.apiKeyEnv === undefined` 才把 `undefined` 交给 pi-ai 自己的 ambient discovery。一旦写了 `apiKeyEnv`，miss 必须 `MISSING_CREDENTIAL`。把 `undefined` 交下去会让 pi-ai 捡到无关的 `OPENAI_API_KEY`。 [E: packages/llm/llm-pi-ai/src/index.ts:185] [E: packages/llm/llm-pi-ai/src/index.ts:192] [E: packages/llm/llm-pi-ai/src/config.ts:233] [I]

10. **Web Models 页只打 managed 文件。** ApiProxy `credentials.set` = `credentials.set(credentialRef(ref), value)`，成功体是 `{}`；`describe` 只回 `{ configured, source?, writable }`。没有 list-all：客户端从 settings schema 的 `apiKeyEnv` 字段学习有哪些 ref。组合测试钉死：UI `set` 之后重启，同一把钥匙仍是 `source: 'file'` 且 `writable: true`——没有被 hoist 成只读 `env`。 [E: packages/host/apiproxy/src/api-proxy.ts:3342] [E: packages/host/apiproxy/src/api-proxy.ts:3328] [E: packages/host/apiproxy/src/api-proxy.ts:3330] [E: packages/llm/llm-deepseek/tests/loader-composition.spec.ts:158] [E: packages/llm/llm-deepseek/tests/loader-composition.spec.ts:159]

`web-search-deepseek` 同样按请求 `credentials.resolve(apiKeyEnv)`；它的 schema **额外**有一个 `role('secret')` 的字面 `apiKey` 槽，那是 settings 文档里的明文，不是 `.credentials.yaml`。 [E: packages/web/web-search-deepseek/src/index.ts:64] [E: packages/web/web-search-deepseek/src/index.ts:104]

## 设计动机

DSH 把密钥从组合 / settings 里拆出去，是为了让 `profile → bundle → preset` 的配置面可以描述、dump、过线、写进 `settings.yaml`，而不把 bearer token 变成另一份会进 git / 进 `describe()` 的文档。`CredentialRef` 是环境变量名，因为启动器、CI `-e`、容器 env 与人类 `.env` 已经共用这套名字。

继承环境赢且只读：`DEEPSEEK_API_KEY=… dsh` 是这一次启动的显式意图，内部 `set` 如果「成功」而 `resolve` 仍返回 shell 里的旧值，配置 UI 会以为写进去了。managed 文件压过 project / user `.env`：Models 页刚存的钥匙必须立刻生效，不能被 checkout 里一份旧 `.env` 顶掉。

每次操作重 `resolve`，是为了让改钥匙到达**下一次** `llm/stream`，而不重启插件、不重挂 adapter。进行中的那次 stream 冻结自己那份 connection+key 快照。

本地 YAML 是唯一 shipped Provider：仓库里没有 keyring 包。文档不用 dotenv 语法，避免「既当密钥店又当环境层」——那样会把非密钥条目按优先级藏起来。

## Gotcha

- **配置里放的是 ref，盘上仍可能有明文。** `apiKeyEnv: DEEPSEEK_API_KEY` 出现在 composition / `settings.yaml` 里完全合法。`.credentials.yaml` **就是**非空 secret 字符串。`role('secret')` 还可以活在 settings schema 里（search 的字面 `apiKey`）。不要把「约定用 CredentialRef」读成「任何 yaml 都没有密钥」。 [E: packages/llm/llm-deepseek/src/index.ts:92] [E: packages/credentials/credentials-local/src/index.ts:180]
- **`source: 'env'` ≠ launch-environment 的 `'process'`。** 缝对外把继承环境报成 `'env'`；快照层 id 仍是 `'process'`。 [E: packages/credentials/credentials-local/src/index.ts:311] [E: packages/util/launch-environment/src/index.ts:16]
- **空串 = 缺席。** `vi.stubEnv('DSH_CRED_TEST', '')` 会掉到下一层，不会挡住 file。 [E: packages/credentials/credentials-local/tests/local.spec.ts:96]
- **被 process-env 挡住的 ref 不能 `set`/`unset`。** 错误文案指向「在启动 dsh 的那个 shell 里 unset」，不是改 `.credentials.yaml`。 [E: packages/credentials/credentials-local/src/index.ts:413]
- **Models 页写入不进 `process.env`。** 否则重启后同一把钥匙会变成只读 `env`，再也转不动。 [E: packages/llm/llm-deepseek/tests/loader-composition.spec.ts:158]
- **boot 失败 ≠ live reload 失败。** 启动时坏文档让插件起不来；watch 路径 warn + last good；写路径 RMW 读不懂就拒写。 [E: packages/credentials/credentials-local/src/index.ts:453]
- **POSIX 0600 / 目录 0700；Windows 跳过 mode 检查。** 手写 `0644` 的 `.credentials.yaml` 在 POSIX 上直接拒启动。 [E: packages/credentials/credentials-local/src/index.ts:113] [E: packages/credentials/credentials-local/tests/local.spec.ts:179]
- **诊断不准引用 value。** YAML 解析错误只带 `code` + 行列，避免 parser 把含密钥的源行打进 stderr。 [E: packages/credentials/credentials-local/tests/local.spec.ts:263]
- **没有枚举 API。** `describe` 只回答调用方点名的 ref。
- **Consumer 禁止跨请求缓存 `ResolvedCredential`。** 缓存会让 `set` / 外部编辑到不了下一次 stream。
- **`credentials/updated` 漏听不等于写失败。** observer 抛错仍已落盘。`INVARIANT` 会在 commit **之后**炸回调用方。 [E: packages/credentials/credentials-local/tests/review-fixes.spec.ts:122]
- **仓库没有 keyring。** 换 Provider 可以，但 shipped bundle 只有 `credentials-local`。

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle 行：base / web-app / headless |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-credentials`（`index.ts` + `/types`） | `ctx.credentials`：`resolve` / `describe` / `set` / `unset`；事件 `credentials/updated`（emit，无 `next()`） | 无独立 shipped 行。`/types` 可进浏览器编译面 |
| Provider | `LocalCredentialProvider`（`@deepseek-ai/dsh-credentials-local`） | 实现四层梯子；可写源只有 `$DSH_HOME/.credentials.yaml` | **base** `id: credentials`；同层 `session-persistence-jsonl`（`root: dshHomePath('sessions')`）+ `session-query-sqlite`（`openAt: never`）。**web-app 不重挂 credentials**；另 insert `storage*` / `workspace` / `session-projection-cache`（**只 web-app**）。**headless 继承 base，不重挂**；insert 无 storage / workspace / projection-cache |
| Consumer | `dsh-llm-deepseek`、`dsh-llm-pi-ai`、`dsh-web-search-deepseek`、ApiProxy `credentials.*` | `ctx.get('credentials')` 可选；缺缝则退回 `launchEnvironmentOf`。settings 只持 `apiKeyEnv` | adapter / search 是 host 行。preset **不** remount `credentials`；需要私有服务必须 `isolate` |

换 Provider 只换值从哪来、哪一层可写；`CredentialRef` 与 per-request `resolve` 合同不变。换 loop / preset 不能绕开这条缝去读一份私藏 env，否则 Models 页写的钥匙到不了下一次请求。shipped session 盘是 base 行 `session-persistence-jsonl`（`root: dshHomePath('sessions')`）。同层 `session-query-sqlite` 写 `openAt: never`。`storage` / `workspace` / `session-projection-cache` 只出现在 web-app insert。 [E: packages/bundle/base/cordis.patch.yml:98] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:121] [E: packages/bundle/web-app/cordis.patch.yml:73]

## Sources

- packages/credentials/credentials/src/index.ts
- packages/credentials/credentials/src/types.ts
- packages/credentials/credentials/src/invariant.ts
- packages/credentials/credentials/tests/credentials.spec.ts
- packages/credentials/credentials-local/src/index.ts
- packages/credentials/credentials-local/tests/local.spec.ts
- packages/credentials/credentials-local/tests/review-fixes.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/util/launch-environment/src/index.ts
- packages/core/session/src/index.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/llm/llm-deepseek/src/adapter.ts
- packages/llm/llm-deepseek/tests/loader-composition.spec.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-pi-ai/src/config.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/api/credentials.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings/src/redact.ts
- packages/settings/settings/tests/redact.spec.ts
- packages/web/web-search-deepseek/src/index.ts
- packages/core/session/src/types.ts
- packages/session/session-persistence-sqlite/src/schema.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/preset/agent-presets/src/mount.ts

## 相关

- [subsys.persistence.settings](settings.md)：`ctx.settings`；resolve = schema defaults → composition `base` → 用户文档；wire `describe({ redactSecrets: true })`。
- [subsys.llm.deepseek](../llm/deepseek.md)：默认路由 `deepseek-official`；每请求用 `apiKeyEnv` 向本缝要 key。
- [subsys.llm.pi-ai](../llm/pi-ai.md)：dormant 直到 settings 给出 provider profile；点名的 `apiKeyEnv` miss 即 `MISSING_CREDENTIAL`。
- [surface.config.settings](../../surface/config/settings.md)：用户设置面与 Config 键；Models 页从表单走到 `credentials.set`。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer 通例；host 面 vs agent-preset 面。
- [spine.composition-boot](../../spine/composition-boot.md)：`profile → bundle → preset`；base 行如何进每个 profile。
- [spine.overview](../../spine/overview.md)：host 面 persistence 与 preset 工具面的切分。
- [subsys.host.apiproxy](../host/apiproxy.md)：`credentials.describe` / `set` / `unset` RPC；describe 永不回 value。
