---
id: persistence.config-loading
title: 配置发现/分层/合并/变量替换/managed
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/config/config.ts
  - packages/core/src/config.ts
  - packages/opencode/src/config/managed.ts
  - packages/opencode/src/session/message-v2.ts
symbols:
  - Config.Service
  - Config.layer
  - ConfigVariable.substitute
  - ConfigManaged.readManagedPreferences
  - Config.Info
related:
  - config.v1-core
  - config.v2-schema
evidence: explicit
status: verified
updated: 92c70c9c3
---

> 配置加载节点覆盖两套并存 loader：V1 `@opencode/Config` 把多来源配置 deep-merge 成一个 `Info`，V2 `@opencode/v2/Config` 暴露从低优先级到高优先级的 ordered `Entry[]`。

## 能回答的问题

- V1 配置按什么顺序读取 global、remote、project、`.opencode`、env content、managed/MDM。
- V1 `{env:VAR}` 与 `{file:path}` 替换发生在 JSONC parse 之前，文件路径如何相对配置文件解析。
- V2 配置为什么不是一个 deep-merged object，而是 `Document | Directory` ordered entries。
- V2 loader 在哪里 inline 识别并迁移 V1 schema。
- managed config directory 和 macOS MDM preferences 为什么最后覆盖普通配置。

## 职责边界

`persistence.config-loading` 只覆盖“配置文档如何被发现、解析、排序、合并或返回”。V1 agent/schema 字段 catalog 由 `surface/config/v1-core` 与 `reference/config-keys` 覆盖；V2 schema 字段 catalog 由 `surface/config/v2-schema` 覆盖。本节点只解释 loader 行为和迁移边界。

## V1

### 关键文件

| 文件 | 作用 |
| --- | --- |
| `packages/opencode/src/config/config.ts` | V1 `@opencode/Config` Effect service，负责 global/project/remote/managed 合并、plugin origin provenance、updateGlobal/update。 |
| `packages/opencode/src/config/variable.ts` | 对原始配置文本做 `{env:}` 和 `{file:}` substitution。 |
| `packages/opencode/src/config/paths.ts` | 向上搜索 project config files 和 `.opencode` directories。 |
| `packages/opencode/src/config/managed.ts` | system managed config dir 与 macOS managed preferences 读取。 |

### 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `Info` | V1 loader 使用 `ConfigV1.Info`，并附加 `plugin_origins?: ConfigPlugin.Origin[]`；`writable(info)` 写回前会剔除 `plugin_origins`，所以它是 derived non-persistent metadata。 | [E: packages/opencode/src/config/config.ts:111][E: packages/opencode/src/config/config.ts:114][E: packages/opencode/src/config/config.ts:163][E: packages/opencode/src/config/config.ts:164] |
| `State` | per-instance cached state 包含 `config`、`directories`、background dependency `deps`、`consoleState`。 | [E: packages/opencode/src/config/config.ts:118][E: packages/opencode/src/config/config.ts:119][E: packages/opencode/src/config/config.ts:120][E: packages/opencode/src/config/config.ts:121] |
| `Service` | service tag 是 `@opencode/Config`，接口暴露 `get/getGlobal/getConsoleState/update/updateGlobal/invalidate/directories/waitForDependencies`。 | [E: packages/opencode/src/config/config.ts:125][E: packages/opencode/src/config/config.ts:126][E: packages/opencode/src/config/config.ts:127][E: packages/opencode/src/config/config.ts:128][E: packages/opencode/src/config/config.ts:129][E: packages/opencode/src/config/config.ts:130][E: packages/opencode/src/config/config.ts:131][E: packages/opencode/src/config/config.ts:132][E: packages/opencode/src/config/config.ts:135] |
| Global file candidates | `globalConfigFile()` 在 `Global.Path.config` 下按 `opencode.jsonc`、`opencode.json`、`config.json` 顺序选第一个存在文件，否则返回第一个候选。 | [E: packages/opencode/src/config/config.ts:140][E: packages/opencode/src/config/config.ts:143][E: packages/opencode/src/config/config.ts:144][E: packages/opencode/src/config/config.ts:146] |
| Merge primitive | 普通合并用 `mergeDeep`；`mergeConfigConcatArrays` 对 `instructions` 做去重拼接，避免后写来源直接替换前写 instructions。 | [E: packages/opencode/src/config/config.ts:42][E: packages/opencode/src/config/config.ts:47][E: packages/opencode/src/config/config.ts:48] |

### 控制流

1. `loadConfig(text, options, env?)` 先调用 `ConfigVariable.substitute`，路径来源用 `{ type: "path", path }`，虚拟来源用 `{ type: "virtual", dir, source }`。[E: packages/opencode/src/config/config.ts:213][E: packages/opencode/src/config/config.ts:220][E: packages/opencode/src/config/config.ts:222][E: packages/opencode/src/config/config.ts:223]
2. substitution 后的文本经 `ConfigParse.jsonc` parse，再用 `ConfigParse.schema(ConfigV1.Info, ...)` decode；legacy `theme/keybinds/tui` keys 会被 `normalizeLoadedConfig` 删除。[E: packages/opencode/src/config/config.ts:226][E: packages/opencode/src/config/config.ts:227][E: packages/opencode/src/config/config.ts:56][E: packages/opencode/src/config/config.ts:58][E: packages/opencode/src/config/config.ts:59][E: packages/opencode/src/config/config.ts:60]
3. path-backed config 才会执行 `resolveLoadedPlugins(data, options.path)`，该 helper 把 `options.path` 传给 `ConfigPlugin.resolvePluginSpec`。[E: packages/opencode/src/config/config.ts:228][E: packages/opencode/src/config/config.ts:230][E: packages/opencode/src/config/config.ts:106]
4. path-backed config 如果没有 `$schema`，loader 写回 `https://opencode.ai/config.json` schema hint；虚拟 config 在 writeback 分支前直接返回，不触发写回。[E: packages/opencode/src/config/config.ts:228][E: packages/opencode/src/config/config.ts:231][E: packages/opencode/src/config/config.ts:232][E: packages/opencode/src/config/config.ts:234]
5. `loadGlobal()` 在没有 `OPENCODE_CONFIG`、`OPENCODE_CONFIG_DIR`、`OPENCODE_CONFIG_CONTENT` 时，默认创建带 `$schema` 的 global config 文件。[E: packages/opencode/src/config/config.ts:250][E: packages/opencode/src/config/config.ts:252][E: packages/opencode/src/config/config.ts:254]
6. global merge 顺序固定为 `config.json`、`opencode.json`、`opencode.jsonc`；后合并来源覆盖前合并来源是由顺序赋值和 `mergeDeep(target, source)` 推断出的结果。[E: packages/opencode/src/config/config.ts:42][E: packages/opencode/src/config/config.ts:258][E: packages/opencode/src/config/config.ts:259][E: packages/opencode/src/config/config.ts:260][I]
7. 如果存在 legacy `Global.Path.config/config` TOML 文件，loader 用 TOML import 读取，解构 `provider/model` 转成 `result.model`，写出 `config.json` 后删除 legacy 文件。[E: packages/opencode/src/config/config.ts:262][E: packages/opencode/src/config/config.ts:265][E: packages/opencode/src/config/config.ts:267][E: packages/opencode/src/config/config.ts:268][E: packages/opencode/src/config/config.ts:271][E: packages/opencode/src/config/config.ts:272]
8. instance load 先遍历 well-known auth entries，取 `/.well-known/opencode`，用 `wellknown.remote_config` 解析可选 remote config URL，再 fetch `remote.url`；最后将 well-known inline config 和 fetched config merge 成 remote config。[E: packages/opencode/src/config/config.ts:355][E: packages/opencode/src/config/config.ts:359][E: packages/opencode/src/config/config.ts:361][E: packages/opencode/src/config/config.ts:362][E: packages/opencode/src/config/config.ts:364][E: packages/opencode/src/config/config.ts:370][E: packages/opencode/src/config/config.ts:372][E: packages/opencode/src/config/config.ts:373][E: packages/opencode/src/config/config.ts:381]
9. remote config 用 virtual source 加载，virtual source 带 `dir` 和 `source`；`pluginScopeForSource` 对 HTTP(S) source 返回 `global`。[E: packages/opencode/src/config/config.ts:322][E: packages/opencode/src/config/config.ts:323][E: packages/opencode/src/config/config.ts:384][E: packages/opencode/src/config/config.ts:387][E: packages/opencode/src/config/config.ts:388][E: packages/opencode/src/config/config.ts:392]
10. authEnv 存在时重新 `loadGlobal(authEnv)`，否则使用 cached global；全局配置以 `global` plugin scope 合并进 result。[E: packages/opencode/src/config/config.ts:397][E: packages/opencode/src/config/config.ts:398]
11. `OPENCODE_CONFIG` 指向的 custom config 直接 loadFile 后 merge。[E: packages/opencode/src/config/config.ts:400][E: packages/opencode/src/config/config.ts:401]
12. project config discovery 用 `ConfigPaths.files("opencode", ctx.directory, ctx.worktree)`；该 helper 从 cwd 向 worktree 边界上行找 `opencode.jsonc` 和 `opencode.json`，再 reverse，让较上层先合并、较近 cwd 后覆盖。[E: packages/opencode/src/config/config.ts:405][E: packages/opencode/src/config/config.ts:406][E: packages/opencode/src/config/config.ts:407][E: packages/opencode/src/config/paths.ts:16][E: packages/opencode/src/config/paths.ts:17][E: packages/opencode/src/config/paths.ts:18][E: packages/opencode/src/config/paths.ts:19][E: packages/opencode/src/config/paths.ts:20][I]
13. `.opencode` directories 来源由 `ConfigPaths.directories(ctx.directory, ctx.worktree)` 组装，包含 `Global.Path.config`、project `.opencode`、home `.opencode`、`OPENCODE_CONFIG_DIR`。[E: packages/opencode/src/config/paths.ts:23][E: packages/opencode/src/config/paths.ts:26][E: packages/opencode/src/config/paths.ts:29][E: packages/opencode/src/config/paths.ts:30][E: packages/opencode/src/config/paths.ts:31][E: packages/opencode/src/config/paths.ts:34][E: packages/opencode/src/config/paths.ts:35][E: packages/opencode/src/config/paths.ts:36][E: packages/opencode/src/config/paths.ts:37][E: packages/opencode/src/config/paths.ts:39]
14. 每个 `.opencode` 或 `OPENCODE_CONFIG_DIR` directory 下的 `opencode.json` 与 `opencode.jsonc` 被加载并合并；同一循环还会确保 `.gitignore`、安装 `@opencode-ai/plugin` 依赖，并调用 command/agent/mode/plugin directory loaders。[E: packages/opencode/src/config/config.ts:423][E: packages/opencode/src/config/config.ts:425][E: packages/opencode/src/config/config.ts:428][E: packages/opencode/src/config/config.ts:435][E: packages/opencode/src/config/config.ts:437][E: packages/opencode/src/config/config.ts:441][E: packages/opencode/src/config/config.ts:458][E: packages/opencode/src/config/config.ts:459][E: packages/opencode/src/config/config.ts:460][E: packages/opencode/src/config/config.ts:463]
15. `OPENCODE_CONFIG_CONTENT` 作为 virtual local source 在 project/directory sources 之后合并。[E: packages/opencode/src/config/config.ts:467][E: packages/opencode/src/config/config.ts:469][E: packages/opencode/src/config/config.ts:473]
16. active organization config 来自 `accountSvc.config(accountID, orgID)`；provider IDs 会进入 `consoleManagedProviders`，并以 `global` scope 合并。[E: packages/opencode/src/config/config.ts:480][E: packages/opencode/src/config/config.ts:481][E: packages/opencode/src/config/config.ts:482][E: packages/opencode/src/config/config.ts:485][E: packages/opencode/src/config/config.ts:494][E: packages/opencode/src/config/config.ts:500][E: packages/opencode/src/config/config.ts:501][E: packages/opencode/src/config/config.ts:503]
17. managed config directory 最后段读取 `ConfigManaged.managedConfigDir()` 下的 `opencode.json/jsonc`，以 global scope 合并。[E: packages/opencode/src/config/config.ts:515][E: packages/opencode/src/config/config.ts:517][E: packages/opencode/src/config/config.ts:519]
18. macOS managed preferences 通过 `ConfigManaged.readManagedPreferences()` 得到 `mobileconfig:<plist>` virtual source，然后 merge 到 result；这发生在普通 global/project/env/account/managed-directory 来源之后。[E: packages/opencode/src/config/managed.ts:63][E: packages/opencode/src/config/managed.ts:64][E: packages/opencode/src/config/config.ts:524][E: packages/opencode/src/config/config.ts:526][E: packages/opencode/src/config/config.ts:528]
19. legacy `mode` entries 被合并成 `agent.<name>` 并标成 `mode: "primary"`。[E: packages/opencode/src/config/config.ts:535][E: packages/opencode/src/config/config.ts:536][E: packages/opencode/src/config/config.ts:539]
20. legacy top-level `tools` boolean map 被转换成 permission action；`write/edit/patch` 统一折叠为 `edit` action。[E: packages/opencode/src/config/config.ts:552][E: packages/opencode/src/config/config.ts:554][E: packages/opencode/src/config/config.ts:556][E: packages/opencode/src/config/config.ts:557][E: packages/opencode/src/config/config.ts:562]

### 变量替换

`ConfigVariable.substitute` 对原始文本执行 `{env:VAR}` 和 `{file:path}` 替换。`{env:VAR}` 先查传入 `env`，再查 `process.env`，缺失时替换为空字符串。[E: packages/opencode/src/config/variable.ts:36][E: packages/opencode/src/config/variable.ts:37] `{file:path}` 会跳过行首 `//` 注释里的 token，支持 `~/` 展开，非绝对路径相对配置文件所在目录解析。[E: packages/opencode/src/config/variable.ts:53][E: packages/opencode/src/config/variable.ts:55][E: packages/opencode/src/config/variable.ts:61][E: packages/opencode/src/config/variable.ts:62][E: packages/opencode/src/config/variable.ts:63][E: packages/opencode/src/config/variable.ts:66] 文件内容读取后会 `trim()`，再用 JSON string escaping 去掉外层引号的方式插回原文本。[E: packages/opencode/src/config/variable.ts:67][E: packages/opencode/src/config/variable.ts:83][E: packages/opencode/src/config/variable.ts:85]

### Managed / MDM

`managedConfigDir()` 默认按平台返回 `/Library/Application Support/opencode`、`%ProgramData%/opencode` 或 `/etc/opencode`，测试可用 `OPENCODE_TEST_MANAGED_CONFIG_DIR` 覆盖。[E: packages/opencode/src/config/managed.ts:21][E: packages/opencode/src/config/managed.ts:23][E: packages/opencode/src/config/managed.ts:25][E: packages/opencode/src/config/managed.ts:27][E: packages/opencode/src/config/managed.ts:31][E: packages/opencode/src/config/managed.ts:32] macOS MDM preferences 只在 `process.platform === "darwin"` 时读取，查用户和系统两个 plist 路径，使用 `plutil -convert json -o -` 转 JSON。[E: packages/opencode/src/config/managed.ts:43][E: packages/opencode/src/config/managed.ts:44][E: packages/opencode/src/config/managed.ts:53][E: packages/opencode/src/config/managed.ts:54][E: packages/opencode/src/config/managed.ts:55][E: packages/opencode/src/config/managed.ts:60] `parseManagedPlist` 删除 payload metadata keys，然后 stringify 剩余 fields；源码没有额外 whitelist arbitrary non-meta keys。[E: packages/opencode/src/config/managed.ts:35][E: packages/opencode/src/config/managed.ts:37][E: packages/opencode/src/config/managed.ts:38][E: packages/opencode/src/config/managed.ts:40]

## V2

### 关键文件

| 文件 | 作用 |
| --- | --- |
| `packages/core/src/config.ts` | V2 `@opencode/v2/Config` schema、ordered entries loader、V1 inline migration、policy load。 |
| `packages/core/src/v1/config/migrate.ts` | V1 schema detector 与 field rename/lowering。 |
| `specs/v2/config.md` | V2 config review 决策来源，说明哪些 legacy keys keep/remove/redesign。 |

### 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `Config.Info` | V2 schema 包含 `shell/model/default_agent/autoupdate/share/enterprise/username/permissions/.../plugins/providers` 等 surface。 | [E: packages/core/src/config.ts:32][E: packages/core/src/config.ts:35][E: packages/core/src/config.ts:38][E: packages/core/src/config.ts:41][E: packages/core/src/config.ts:46][E: packages/core/src/config.ts:49][E: packages/core/src/config.ts:56][E: packages/core/src/config.ts:59][E: packages/core/src/config.ts:101][E: packages/core/src/config.ts:105] |
| `Document` | config document 保存 `type: "document"`、optional `path`、decoded `info`。 | [E: packages/core/src/config.ts:108][E: packages/core/src/config.ts:109][E: packages/core/src/config.ts:110][E: packages/core/src/config.ts:111] |
| `Directory` | supplemental directory 保存 `type: "directory"` 和 absolute `path`。 | [E: packages/core/src/config.ts:114][E: packages/core/src/config.ts:115][E: packages/core/src/config.ts:116] |
| `Entry` | `Entry = Document | Directory`，`entries()` 返回 entries，而不是 merged object。 | [E: packages/core/src/config.ts:119][E: packages/core/src/config.ts:127][E: packages/core/src/config.ts:129] |
| `latest(entries, key)` | helper 从 document entries 中找最后一个定义 key 的 value；消费者可用这个 helper 从 ordered entries 决定 effective value。 | [E: packages/core/src/config.ts:121][E: packages/core/src/config.ts:123][E: packages/core/src/config.ts:124][I] |

### 控制流

1. V2 layer 依赖 `FSUtil.Service`、`Global.Service`、`Location.Service`、`Policy.Service`。[E: packages/core/src/config.ts:137][E: packages/core/src/config.ts:138][E: packages/core/src/config.ts:139][E: packages/core/src/config.ts:140]
2. loader 只识别 `config.json`、`opencode.json`、`opencode.jsonc` 三个 file names。[E: packages/core/src/config.ts:141]
3. decode options 设置 `errors: "all"`、`onExcessProperty: "ignore"`、`propertyOrder: "original"`，再建立 V2 `decodeInfo` 和 V1 `decodeV1Info`。[E: packages/core/src/config.ts:142][E: packages/core/src/config.ts:143][E: packages/core/src/config.ts:144]
4. `loadFile(filepath)` 读取 safe text，空文本或 JSONC parse errors 直接返回 `undefined`。[E: packages/core/src/config.ts:146][E: packages/core/src/config.ts:147][E: packages/core/src/config.ts:148][E: packages/core/src/config.ts:150][E: packages/core/src/config.ts:152]
5. 如果 `ConfigMigrateV1.isV1(input)` 为真，V2 loader 会先按 V1 schema decode，再 `ConfigMigrateV1.migrate`，最后按 V2 schema decode；否则直接 decode V2 schema。[E: packages/core/src/config.ts:154][E: packages/core/src/config.ts:155][E: packages/core/src/config.ts:156][E: packages/core/src/config.ts:157]
6. 成功 decode 后返回 `Document({ type: "document", path: filepath, info })`。[E: packages/core/src/config.ts:159][E: packages/core/src/config.ts:160]
7. `loadDirectory(directory)` 读取目录下三个 config file，并在末尾追加 `Directory({ type: "directory", path: directory })`。[E: packages/core/src/config.ts:163][E: packages/core/src/config.ts:165][E: packages/core/src/config.ts:168]
8. 如果当前 Location directory 就是 global config directory，project upward discovery 为空。[E: packages/core/src/config.ts:172][E: packages/core/src/config.ts:173][E: packages/core/src/config.ts:176][E: packages/core/src/config.ts:177]
9. project upward discovery 从 `location.directory` 向 `location.project.directory` 查找 `.opencode` 和 reversed file names。[E: packages/core/src/config.ts:179][E: packages/core/src/config.ts:180][E: packages/core/src/config.ts:181][E: packages/core/src/config.ts:182]
10. `directories` 由 global directory 加 discovered `.opencode` directories 组成；`.opencode` discovery 被 reverse 后变成较上层先加载、较近 directory 后加载。[E: packages/core/src/config.ts:185][E: packages/core/src/config.ts:186][E: packages/core/src/config.ts:187][E: packages/core/src/config.ts:188][E: packages/core/src/config.ts:189]
11. direct config paths 取 discovered 中非 `.opencode` 的项并 reverse，再逐个 loadFile。[E: packages/core/src/config.ts:194][E: packages/core/src/config.ts:195]
12. final `configs` 顺序是 global supplementary entries、direct documents、project `.opencode` supplementary entries；这一顺序把 general settings 放前，specific settings 放后。[E: packages/core/src/config.ts:199][E: packages/core/src/config.ts:202]
13. provider policy rules 读取时使用相反 order：document entries reverse 后取 `experimental.policies`，再交给 `policy.load(...)`。[E: packages/core/src/config.ts:205][E: packages/core/src/config.ts:207][E: packages/core/src/config.ts:208][E: packages/core/src/config.ts:209]
14. `entries()` 只返回预先发现的 `configs`，不会在 later call 重新读文件。[E: packages/core/src/config.ts:212][E: packages/core/src/config.ts:213][E: packages/core/src/config.ts:214]

### V1 inline migration

`ConfigMigrateV1.isV1` 用 legacy keys set 检测 V1 文档；命中任一 legacy key 就走 migration。[E: packages/core/src/v1/config/migrate.ts:11][E: packages/core/src/v1/config/migrate.ts:31][E: packages/core/src/v1/config/migrate.ts:33] `migrate()` 将 `permission/tools` 降成 V2 `permissions`、`agent/mode` 降成 `agents`、`attachment` 改成 `attachments`、`reference` 改成 `references`、`plugin` 改成 `plugins`、`provider` 改成 `providers`。[E: packages/core/src/v1/config/migrate.ts:46][E: packages/core/src/v1/config/migrate.ts:47][E: packages/core/src/v1/config/migrate.ts:52][E: packages/core/src/v1/config/migrate.ts:66][E: packages/core/src/v1/config/migrate.ts:67][E: packages/core/src/v1/config/migrate.ts:71][E: packages/core/src/v1/config/migrate.ts:99][E: packages/core/src/v1/config/migrate.ts:100][E: packages/core/src/v1/config/migrate.ts:101]

V2 config spec 明确 `$schema` 在 V2 loader 中应保持 read-only metadata，加载时不应为了它插入或创建文件。[E: specs/v2/config.md:22] 这解释了 V2 loader 没有复用 V1 “缺 `$schema` 就写回文件”的行为。[I]

## V1 / V2 对照

| 维度 | V1 `@opencode/Config` | V2 `@opencode/v2/Config` |
| --- | --- | --- |
| 输出 shape | 单个 cached `Info` object；load flow 多次 `merge(...)` into `result`，`loadInstanceState` 返回 `{ config: result }`，`get()` 返回 `s.config`。[E: packages/opencode/src/config/config.ts:258][E: packages/opencode/src/config/config.ts:407][E: packages/opencode/src/config/config.ts:428][E: packages/opencode/src/config/config.ts:585][E: packages/opencode/src/config/config.ts:586][E: packages/opencode/src/config/config.ts:605][E: packages/opencode/src/config/config.ts:606] | ordered `Entry[]`，`entries()` 返回 `configs`。[E: packages/core/src/config.ts:213][E: packages/core/src/config.ts:214] |
| V1 compatibility | V1 本身解析 `ConfigV1.Info`，并继续接受 legacy aliases。 | loader inline `isV1 → migrate → decodeInfo`。[E: packages/opencode/src/config/config.ts:227][E: packages/opencode/src/config/config.ts:56][E: packages/opencode/src/config/config.ts:58][E: packages/opencode/src/config/config.ts:59][E: packages/opencode/src/config/config.ts:60][E: packages/core/src/config.ts:155][E: packages/core/src/config.ts:156] |
| Variable substitution | loader 调 `ConfigVariable.substitute` 后 parse JSONC。[E: packages/opencode/src/config/config.ts:220][E: packages/opencode/src/config/config.ts:226] | `core/src/config.ts` 的 loader 路径是 readFileStringSafe → jsonc parse → schema decode，当前文件没有调用 V1 `ConfigVariable.substitute`。[E: packages/core/src/config.ts:147][E: packages/core/src/config.ts:151][E: packages/core/src/config.ts:155][E: packages/core/src/config.ts:156][E: packages/core/src/config.ts:157][I] |
| Project config | `ConfigPaths.files()` 和 `ConfigPaths.directories()` 共同参与 merge into result。[E: packages/opencode/src/config/config.ts:406][E: packages/opencode/src/config/config.ts:407][E: packages/opencode/src/config/config.ts:415][E: packages/opencode/src/config/config.ts:428] | `fs.up()` discovery 产生 direct paths 与 `.opencode` directories，再组成 ordered entries。[E: packages/core/src/config.ts:179][E: packages/core/src/config.ts:194][E: packages/core/src/config.ts:202] |
| Managed/MDM | managed directory 与 macOS MDM preferences 在普通来源之后合并，MDM 最后 merge。[E: packages/opencode/src/config/config.ts:515][E: packages/opencode/src/config/config.ts:524][E: packages/opencode/src/config/config.ts:526] | `core/src/config.ts` 本节点读取范围内没有 managed directory 或 macOS MDM reader wiring。[I] |

## 设计动机与权衡

- V2 config review 决定“先用一个 V2 schema”，即使某些字段更像 global/user scope，也暂时不拆 global/location schema。[E: specs/v2/config.md:14]
- V2 config review 把 plugin 从 legacy `plugin` 改成 `plugins`，且保留 ordered loading，因为 hook registration 和 execution 可能依赖 load order。[E: specs/v2/config.md:90][E: specs/v2/config.md:92]
- V2 config review 把 `permission` 改成 `permissions`，并用 ordered `{ action, resource, effect }` ruleset 替代 legacy map shorthand。[E: specs/v2/config.md:246][E: specs/v2/config.md:292]
- V1 loader 的 managed/MDM 后置合并体现 enterprise policy override 需求；源码顺序显示 MDM preferences 在 ordinary/user/project/remote/account/managed-directory 后合并。[E: packages/opencode/src/config/config.ts:515][E: packages/opencode/src/config/config.ts:524][E: packages/opencode/src/config/config.ts:526][I]

## Gotchas

- `packages/opencode/src/session/message-v2.ts` 的 `v2` 命名不表示 V2 core config；该 file imports V1 session types and AI SDK `convertToModelMessages`，config-loading 节点的 V2 指 `packages/core/src/config.ts` 命名空间 `@opencode/v2/Config`。[E: packages/opencode/src/session/message-v2.ts:3][E: packages/opencode/src/session/message-v2.ts:20][E: packages/opencode/src/session/message-v2.ts:23][I]
- V1 `plugin_origins` 是 derived state，`writable(info)` 会把它剔除后再写回 config。[E: packages/opencode/src/config/config.ts:163][E: packages/opencode/src/config/config.ts:164]
- V2 config spec 示例仍出现 `{env:...}` token，但 `core/src/config.ts` 当前 loader 没有执行 V1 `ConfigVariable.substitute`；token 的实际处理如果存在，应在具体 consumer 中继续追踪。[E: specs/v2/config.md:223][I]

## Sources

- `packages/opencode/src/config/config.ts`
- `packages/opencode/src/config/paths.ts`
- `packages/opencode/src/config/variable.ts`
- `packages/opencode/src/config/managed.ts`
- `packages/opencode/src/session/message-v2.ts`
- `packages/core/src/config.ts`
- `packages/core/src/v1/config/migrate.ts`
- `specs/v2/config.md`

## 相关

- [V1 Config:核心/agents/permissions](../../surface/config/v1-core.md)
- [V2 Config schema](../../surface/config/v2-schema.md)
- [Config key 全 catalog](../../reference/config-keys.md)
