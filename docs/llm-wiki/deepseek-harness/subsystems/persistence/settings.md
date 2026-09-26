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
  - packages/settings/settings/src/schema.ts
  - packages/settings/settings/tests/redact.spec.ts
  - packages/boot/config-editor/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/llm/llm-deepseek-api-key/src/config.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/api/settings-controller/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/core/session/src/types.ts
  - packages/session/session-persistence/src/storage-contract.ts
  - packages/session/session-checkpoint-policy/src/index.ts
symbols:
  - SettingsForms
  - redactSecrets
  - SettingsConflictError
  - ConfigEditor
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
  - subsys.core.session
evidence: explicit
status: verified
updated: 477b4f4205
---

> `ctx.settings` 是 **host 面** `SettingsForms`：把 **active Loader 行** 上标了 `.volatile()` 的 Config 投影成表单，写入走 `ctx.configEditor.edit`，落在 **当前 profile 的 Cordis patch**，不是独立的 `settings.yaml` 文档。`@deepseek-ai/dsh-settings-file` **已删除**。遗留 `$DSH_HOME/settings.yaml` 只在 Loader 安定后 **一次性** 导入并改名为 `settings.yaml.imported`。这是 Cordis 组合运行时的配置面，不是 session log。

## 能回答的问题

- `ctx.settings` 现在是谁？`settings-file` / `FileSettingsProvider` 还在吗？
- 五个 shipped profile 谁挂 `id: settings`？没有 `profileContext` 时怎样？`sdk-minimal` 呢？
- 表单的 `value` / `base` / `user` 各来自哪一层？只有 `.volatile()` 字段能改吗？
- `settings/document-updated` 是 emit 还是 waterfall？还有没有 `settings/updated` / `installSection`？
- wire 为什么必须 `describe({ redactSecrets: true })`？profile patch 会不会存 `role('secret')` 明文？
- 旧 `settings.yaml` 怎样进 profile？导入失败会不会挡 boot？

## 职责边界

本包拥有：`SettingsForms`（`ctx.settings`）对 Loader 行的表单投影、`update` / `replace` / `mutate` 经 `configEditor.edit` 的 revision 写、`settings/document-updated` emit、`redactSecrets`、以及遗留 `settings.yaml` 的一次性导入。物理 patch 路径由 `@deepseek-ai/dsh-config-editor`（`ctx.configEditor`）拥有。

本包**不**拥有：secret **值**的存储（[subsys.persistence.credentials](credentials.md)）；Models / General 表单字段表（[surface.config.settings](../../surface/config/settings.md)、[subsys.host.apiproxy](../host/apiproxy.md) 现为 `SettingsController`）；session event `version` / JSONL / checkpoint flush。**没有** `installSection` / `SettingsProvider.load` / `FileSettingsProvider`。`packages/preset/agent-presets` 已删除。

`@deepseek-ai/dsh-settings` **就是** shipped Provider：`dsh-base` 行 `id: settings` / `name: '@deepseek-ai/dsh-settings'`。`static inject = ['configEditor', 'profileContext']`：没有 profile 上下文则整行 `disabled`。preset 不得再 publish 一份 `settings`。

正交事实（点名）：

- 新 header 的 `version` 必须等于 `SESSION_FORMAT_VERSION`（现为 `4`）。JSONL catalog adjacent v0→v1→v2→v3→v4；比 4 新仍拒。settings 不迁 session 盘。 [E: packages/core/session/src/types.ts:89] [E: packages/session/session-persistence/src/storage-contract.ts:50]
- session persistence SQLite 包已删除。
- checkpoint 在 `llm/stream` / 顶层 `tools/execute` 前 `sessions.flush`。那些 waterfall **必须** `next()`。 [E: packages/session/session-checkpoint-policy/src/index.ts:35] [E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:80]
- compaction 的 `SurfaceOp` 只有 `'append'` 或 `{ op: 'replace'; startSeq; endSeq }`。 [E: packages/core/session/src/types.ts:462] [E: packages/core/session/src/types.ts:464]
- adapter Config 里放 `CredentialRef`（`role('credential-ref')` / `apiKeyEnv`）。secret **值**在 `$DSH_HOME/.credentials.yaml`。 [E: packages/llm/llm-deepseek-api-key/src/config.ts:16] [E: packages/credentials/credentials-local/src/index.ts:61]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/settings/settings/src/index.ts` | `SettingsForms`、`importLegacyDocument`、`describe` / `update` / `replace` / `mutate` |
| `packages/settings/settings/src/schema.ts` | `volatileForm`：只投影 `.volatile()` 子树 |
| `packages/settings/settings/src/redact.ts` | `redactSecrets`：剥 `role('secret')` |
| `packages/settings/settings/src/types.ts` | `settings/document-updated` emit；wire 视图 |
| `packages/boot/config-editor/src/index.ts` | `ctx.configEditor`；`documentPath` = profile patch |
| `packages/bundle/base/cordis.patch.yml` | `id: settings` → `@deepseek-ai/dsh-settings`，无 `profileContext` 则 `disabled` |
| `packages/api/settings-controller/src/index.ts` | Host Remote：`describe()` 固定 `redactSecrets: true` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SettingsForms` | Cordis `Service`，键 `'settings'`。`inject = ['configEditor', 'profileContext']`。 [E: packages/settings/settings/src/index.ts:223] [E: packages/settings/settings/src/index.ts:224] [E: packages/settings/settings/src/index.ts:231] |
| `SettingsNamespace` | 品牌化的 **profile entry id**，不是独立 kebab 注册表。 [E: packages/settings/settings/src/types.ts:7] |
| `SettingsDescriptor` | `ns` / `schema` / `value` / `base` / `user` / `revision` / `applies: 'live'` / 可选 `secrets`。`user` 里出现的键 = profile override。 [E: packages/settings/settings/src/index.ts:20] |
| `value` / `base` / `user` | `value` = 当前 fiber 的 live Config 投影；`base` = 继承层（schema + 组合）；`user` = profile override。 [E: packages/settings/settings/src/index.ts:319] [E: packages/settings/settings/src/index.ts:321] [E: packages/settings/settings/src/index.ts:322] |
| `SettingsPathOp` | `{ op:'set', path, value }` 或 `{ op:'unset', path }`。给只拿到 redacted 视图的调用方。 [E: packages/settings/settings/src/index.ts:81] |
| `SettingsConflictError` | `code: 'SETTINGS_CONFLICT'`。`expectedRevision` 对不上则拒写。 [E: packages/settings/settings/src/index.ts:45] [E: packages/settings/settings/src/index.ts:47] |
| `volatileForm` | 最近 volatile 祖先下的字段才能进表单、才能 `mutate`。 [E: packages/settings/settings/src/schema.ts:37] [E: packages/settings/settings/src/index.ts:388] |
| `writable` | getter 恒 `true`；没有 profile 时插件根本不加载。 [E: packages/settings/settings/src/index.ts:290] |
| `documentPath` | 转给 `configEditor.documentPath`（profile patch）。 [E: packages/settings/settings/src/index.ts:292] [E: packages/boot/config-editor/src/index.ts:34] |

事件只剩 `settings/document-updated(ns, revision)`，**emit**，没有 `next`。旧的 `settings/updated` / `installSection` / namespace `register` **已删除**。 [E: packages/settings/settings/src/types.ts:75]

## 控制流

1. **host 面挂 SettingsForms。** `dsh-base` 插入 `id: settings` / `name: '@deepseek-ai/dsh-settings'`，`disabled: !!js "!ctx.get('profileContext')"`。同层先挂 `id: config-editor`。`PROFILE_TEMPLATES`：`web` / `headless` / `sdk` / `acp` 叠 `dsh-base`；`sdk-minimal` **不叠** base，也 **没有** `id: settings`。`dsh-web-app` 另插 `id: settings-controller` 与 `ui-settings*`，不是第二份 Provider。`dsh-headless` insert 只有 `headless-startup` / `headless-runner`。 [E: packages/bundle/base/cordis.patch.yml:97] [E: packages/bundle/base/cordis.patch.yml:101] [E: packages/bundle/base/cordis.patch.yml:102] [E: packages/bundle/base/cordis.patch.yml:103] [E: packages/boot/app-boot/src/profile.ts:179] [E: packages/boot/app-boot/src/profile.ts:192] [E: packages/bundle/web-app/cordis.patch.yml:137]

2. **遗留 `settings.yaml` 一次性导入。** 构造里 `loader.await()` 之后 `importLegacyDocument`：若 `join(profile.home, 'settings.yaml')` 存在，先 `rename` 成 `settings.yaml.imported`，再按 section 调 `update`。映射：`ui-developer-tools` → `ui-settings`，`ui-onboarding` → `ui-settings-general`，`shell` → 平台 shell 行。被运行中 composition 拒绝的 section 只打 warn，留在 renamed 文件里。缺文件是 no-op。 [E: packages/settings/settings/src/index.ts:201] [E: packages/settings/settings/src/index.ts:235] [E: packages/settings/settings/src/index.ts:241] [E: packages/settings/settings/src/index.ts:246] [E: packages/settings/settings/src/index.ts:251]

3. **`describe` 扫 Loader 行，不扫独立文档。** 对 `configEditor.configuration()` 的每一行：有 Config schema、fiber ACTIVE、且 `volatileForm` 非空才出 descriptor。revision 按 `[fiber.uid, schema JSON, entry.options.config]` 的序列化变化递增。变化时 emit `settings/document-updated`。 [E: packages/settings/settings/src/index.ts:302] [E: packages/settings/settings/src/index.ts:304] [E: packages/settings/settings/src/index.ts:317]

4. **写路径：校验 volatile → `configEditor.edit`。** `update` merge 用户 patch；`replace` 用 `mergeLayers(base, input)` 重置 live 字段；`mutate` 按 path set/unset（数组 unset 删元素；对象 unset 若下层有继承值则写回继承值）。`expectedRevision` 不匹配抛 `SettingsConflictError`。非 volatile 路径抛错。 [E: packages/settings/settings/src/index.ts:347] [E: packages/settings/settings/src/index.ts:357] [E: packages/settings/settings/src/index.ts:367] [E: packages/settings/settings/src/index.ts:390] [E: packages/settings/settings/src/index.ts:394]

5. **事件是 emit，没有 `next()`。** 只有 `settings/document-updated`。不是 waterfall，也不是 `session/flush` 那种 parallel。 [E: packages/settings/settings/src/types.ts:75] [E: packages/settings/settings/src/index.ts:317]

6. **wire 必须 redact。** `describe({ redactSecrets: true })` 对 `value` / `base` / `user` 跑 `redactSecrets`：碰到 `meta.role === 'secret'` 就删值并记 `{ path, set }`。`role('credential-ref')` **不**剥。`SettingsController.describe` 固定传 `redactSecrets: true`。持 redacted 视图的写路径是 `mutate`。 [E: packages/settings/settings/src/index.ts:323] [E: packages/settings/settings/src/redact.ts:53] [E: packages/api/settings-controller/src/index.ts:103] [E: packages/settings/settings/tests/redact.spec.ts:6]

7. **产品约定：adapter 配置放 `CredentialRef`。** `llm-deepseek-api-key` 的 `apiKeyEnv` 是 `z.string().role('credential-ref').default('DEEPSEEK_API_KEY').volatile()`。每请求 `credentials.resolve`。`.credentials.yaml` 存非空 secret 字符串。schema 仍允许 `role('secret')`，所以 profile patch **可以**含明文 secret。 [E: packages/llm/llm-deepseek-api-key/src/config.ts:16] [E: packages/credentials/credentials-local/src/index.ts:61]

8. **消费者不再 `installSection`。** 插件读自己的 Cordis Config；表单由 SettingsForms 从 Loader 行投影。`llm-pi-ai` 空 profiles 时 route 休眠。Host Remote 由 `SettingsController` 描述全部已投影 namespace。

## 设计动机

独立 `settings.yaml` 与 Cordis 组合树是两份真相：改表单不一定改到正在跑的 entry，dump-config 也对不上。把 live 配置收进 **profile patch + `.volatile()`**，表单、Loader、`--dump-config` 读同一棵树。遗留 YAML 只导入一次并改名，避免半截导入重复写。

`redactSecrets` 仍在，是因为 schema 可以声明字面 `role('secret')`；adapter 主路径用 `CredentialRef`，把 bearer 赶到 credentials 缝。

## Gotcha

- **没有 `settings-file`。** 默认盘是 profile patch，不是 `$DSH_HOME/settings.yaml`。后者只在首次启动时导入。
- **没有 `installSection` / `settings/updated`。** 业务插件不要再 register namespace。
- **没有 `profileContext` = 整行 disabled。** `sdk-minimal` 不挂本缝。 [E: packages/bundle/base/cordis.patch.yml:103] [E: packages/boot/app-boot/src/profile.ts:192]
- **只有 `.volatile()` 能从表单改。** 普通 Config 仍走 YAML / overlay。 [E: packages/settings/settings/src/index.ts:386]
- **`describe()` 默认不 redact。** 漏传 `redactSecrets: true` 会把 secret 交给同进程调用方。wire 合同在 `SettingsController`。 [E: packages/api/settings-controller/src/index.ts:103]
- **redacted `replace` 会删没看见的 secret。** 用 `mutate`。
- **Home patch / `--patch` 压过表单。** 会被它们盖住的写直接拒绝（config-editor 层）。
- **本缝与 session 盘版本正交。** `SESSION_FORMAT_VERSION = 4` 不迁 settings。 [E: packages/core/session/src/types.ts:89]

## Seam 三角

| 角色 | 包 / 合同 | ctx 键 | `dsh-base` | `dsh-web-app` | headless / sdk / acp | `sdk-minimal` |
|---|---|---|---|---|---|---|
| Definition | `@deepseek-ai/dsh-settings` 的 `SettingsForms`；事件 `settings/document-updated`（emit） | `ctx.settings` | 行 `id: settings`，无 profile 则 disabled | 继承 | 继承（叠 base） | **无** |
| Provider（patch） | `@deepseek-ai/dsh-config-editor` | `ctx.configEditor`；`documentPath` = profile patch | `id: config-editor`，无 profile 则 disabled | 继承 | 继承 | **无** |
| Consumer | 各插件的 `.volatile()` Config；wire：`SettingsController.describe` 固定 redact | 读 `describe`；写 `update`/`replace`/`mutate` | adapter / loop 是 host 行 | 另插 controller + ui-settings | 无 HTTP 表单仍吃同一份 profile patch | `inject(['settings'])` 不跑 |

换掉 config-editor 只换 patch 介质；volatile 投影与 redact 合同不变。卸掉 `id: settings`，每个插件停在自己的 composition Config 上。preset 需要私有 Provider 时必须 `isolate`。

## Sources

- packages/settings/settings/src/index.ts
- packages/settings/settings/src/types.ts
- packages/settings/settings/src/redact.ts
- packages/settings/settings/src/schema.ts
- packages/settings/settings/tests/redact.spec.ts
- packages/boot/config-editor/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/llm/llm-deepseek-api-key/src/config.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/api/settings-controller/src/index.ts
- packages/credentials/credentials-local/src/index.ts
- packages/core/session/src/types.ts
- packages/session/session-persistence/src/storage-contract.ts
- packages/session/session-checkpoint-policy/src/index.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md)：`profile → bundle → preset`；五个 shipped profile；`id: settings` 从 `dsh-base` 进入真树。
- [spine.capability-seams](../../spine/capability-seams.md)：Definition / Provider / Consumer；`ctx.settings` 是 host 面缝。
- [spine.overview](../../spine/overview.md)：host 面 vs agent-preset 面。
- [spine.session-log](../../spine/session-log.md)：本缝不写 session 事件。
- [subsys.persistence.credentials](credentials.md)：`CredentialRef` 与 DeepSeek 账号 grant。
- [surface.config.settings](../../surface/config/settings.md)：用户可见设置面。
- [subsys.llm.deepseek](../llm/deepseek.md)：`llm-deepseek-api-key` 的 `apiKeyEnv`；`llm-deepseek-account` 走账号 token。
- [subsys.llm.pi-ai](../llm/pi-ai.md)：空 profiles 则零 route。
- [subsys.host.apiproxy](../host/apiproxy.md)：Host HTTP；`SettingsController`。
- [subsys.core.session](../core/session.md)：`SESSION_FORMAT_VERSION = 4`、`surfaceOp: replace`、`session/flush` parallel。
