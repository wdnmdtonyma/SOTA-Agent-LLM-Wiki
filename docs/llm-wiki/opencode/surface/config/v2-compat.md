---
id: config.v2-compat
title: V2→V1 配置兼容层
kind: surface
tier: T1
v: v1
source:
  - packages/opencode/src/config/v2-compat.ts
  - packages/opencode/src/config/config.ts
  - packages/opencode/src/config/parse.ts
  - packages/opencode/test/config/v2-compat.test.ts
symbols:
  - ConfigV2Compat.lower
  - ConfigV2Compat
related:
  - persistence.config-loading
  - config.migration
  - config.v2-schema
  - config.v1-core
evidence: explicit
status: verified
updated: e207624c48
---

> `config.v2-compat` 是 V1 `@opencode/Config` 读路径上的 V2-shaped 文件投影层：`ConfigV2Compat.lower` 把能表示的 V2 key 压成 `ConfigV1.Info`，再交给 schema decode。它**不是** `config.migration`（那是 V2 loader 里 V1→V2 的 in-memory migrate，符号在 `packages/core/src/v1/config/migrate.ts`）。

## 能回答的问题

- V1 loader 读到 V2-shaped `opencode.json(c)` 时先 lower 还是直接 `ConfigParse.schema`。
- 任意 `permissions`（含 agents/agent/mode 嵌套）为什么硬拒绝，而不是降成 V1 `permission`。
- 哪些 V2 字段被忽略，哪些被映射，V1 同名冲突谁赢。
- `invalid` / `unsupported` / `conflict` 三种 diagnostic 各自何时发出。
- `Config.update` / `Config.updateGlobal` 为什么 merge 原始 JSON/JSONC 树，而不是 lowered 投影。

## 与 `config.migration` 的边界

| | `config.v2-compat` | `config.migration` |
| --- | --- | --- |
| 方向 | V2-shaped 文件 → V1 `ConfigV1.Info` | V1 `ConfigV1.Info` → V2 `Config.Info` |
| 运行时 | V1 `@opencode/Config` 读路径 | V2 `@opencode/v2/Config` loader |
| 权威符号 | `ConfigV2Compat.lower` | `ConfigMigrateV1.isV1` / `ConfigMigrateV1.migrate` |
| 写回磁盘 | 不把 lowered 投影写回；写路径保留 raw 树 | 不写回；只在内存 migrate |

本节点不覆盖 `migrate.ts` 的 rename 表。V2 schema catalog 见 `config.v2-schema`；V1 字段 catalog 见 `config.v1-core`。

## 入口

V1 `decodeConfig` 对 parse 后的对象先 `normalizeLoadedConfig`（删 legacy `theme`/`keybinds`/`tui`），再 `ConfigV2Compat.lower`，把每条 diagnostic 打成 `configuration compatibility diagnostic` warning，最后 `ConfigParse.schema(ConfigV1.Info, result.value)`。[E: packages/opencode/src/config/config.ts:188][E: packages/opencode/src/config/config.ts:189][E: packages/opencode/src/config/config.ts:190][E: packages/opencode/src/config/config.ts:198][E: packages/opencode/src/config/config.ts:54][E: packages/opencode/src/config/config.ts:59]

`loadConfig` 在 `{env:}`/`{file:}` substitution 和 JSONC parse 之后调用 `decodeConfig`。[E: packages/opencode/src/config/config.ts:240][E: packages/opencode/src/config/config.ts:241]

`ConfigV2Compat.lower` 不 mutate 输入：先 `decodeRecord`，再 `{ ...parsed.value }` 上投影。[E: packages/opencode/src/config/v2-compat.ts:91][E: packages/opencode/src/config/v2-compat.ts:92][E: packages/opencode/src/config/v2-compat.ts:115] 非 record 输入原样返回、diagnostics 为空。[E: packages/opencode/src/config/v2-compat.ts:93] fixture runner 也断言 input 未被改写。[E: packages/opencode/test/config/v2-compat.test.ts:55]

## 硬拒绝 `permissions`

任意 V2 `permissions` 在投影开始前 `throw InvalidError`，不降成 V1 `permission`，也不进入 schema decode。[E: packages/opencode/src/config/v2-compat.ts:106][E: packages/opencode/src/config/v2-compat.ts:107]

| 扫描位置 | 行为 |
| --- | --- |
| 顶层 `permissions` | 只要 key 存在就拒绝，含 `[]` / `null` / 字符串 / 畸形 ruleset。[E: packages/opencode/src/config/v2-compat.ts:96] |
| `agents.<name>.permissions` | 嵌套 record 里出现该 key 即拒绝。[E: packages/opencode/src/config/v2-compat.ts:97][E: packages/opencode/src/config/v2-compat.ts:102] |
| `agent.<name>.permissions` | 同上，扫 V1 单数容器。[E: packages/opencode/src/config/v2-compat.ts:97] |
| `mode.<name>.permissions` | 同上，扫 deprecated mode 容器。[E: packages/opencode/src/config/v2-compat.ts:97] |

错误文案固定为：`V2 permissions are not supported by OpenCode V1. Use V1 "permission" rules or run opencode2.`[E: packages/opencode/src/config/v2-compat.ts:111] 合法 V1 `permission` / `agent.*.permission` 继续接受。[E: packages/opencode/test/config/v2-compat.test.ts:246] 写路径若磁盘上已有 native `permissions`，`update` 的 `loadFile` 与 `updateGlobal` 的 lower+schema / `decodeConfig` 会在写盘前 throw。[E: packages/opencode/src/config/config.ts:641][E: packages/opencode/src/config/config.ts:665][E: packages/opencode/src/config/config.ts:673]

## 忽略字段

`unsupported()` 只记 diagnostic，不把该值投影进 V1 语义。`plugins`/`providers`/`websearch`/`warming` 仍留在 spread 后的 raw object 上，随后被 `ConfigParse.schema` 的 `onExcessProperty: "ignore"` 丢掉。[E: packages/opencode/src/config/v2-compat.ts:117][E: packages/opencode/src/config/v2-compat.ts:443][E: packages/opencode/src/config/parse.ts:42]

| V2 输入 | 忽略方式 |
| --- | --- |
| `plugins` | 顶层 unsupported。[E: packages/opencode/src/config/v2-compat.ts:117] |
| `providers` | 顶层 unsupported。[E: packages/opencode/src/config/v2-compat.ts:117] |
| `attachments` | 不投影、也不发 `unsupported` diagnostic。compat 只识别 `media→attachment`；V2 schema 的 `attachments` 随 spread 留下，再被 schema `onExcessProperty: "ignore"` 丢掉。[E: packages/opencode/src/config/v2-compat.ts:139][E: packages/opencode/src/config/parse.ts:42] [I] |
| `websearch` | 顶层 unsupported。[E: packages/opencode/src/config/v2-compat.ts:117] |
| `warming` | 顶层 unsupported。[E: packages/opencode/src/config/v2-compat.ts:117] |
| `experimental.portable_shell_scanner` | unsupported，不映射。[E: packages/opencode/src/config/v2-compat.ts:194] |
| `model.variant`（object 或 `provider/model#variant` 的 `#` 段） | 只保留 `provider/model` 字符串；variant 记 unsupported。[E: packages/opencode/src/config/v2-compat.ts:150][E: packages/opencode/src/config/v2-compat.ts:151] |
| `agents.*.request.headers` | agent 可投影，headers 记 unsupported。[E: packages/opencode/src/config/v2-compat.ts:221] |
| `mcp.*.codemode` / `mcp.servers.*.codemode` | server 可投影，codemode 记 unsupported 并从 V1 server 对象删除。[E: packages/opencode/src/config/v2-compat.ts:324][E: packages/opencode/src/config/v2-compat.ts:375] |
| MCP `timeout` 无法压成单一 scalar | `startup` 有值、缺 `catalog`/`execution`、或两者不等 → unsupported，不写 V1 `timeout`。[E: packages/opencode/src/config/v2-compat.ts:362][E: packages/opencode/src/config/v2-compat.ts:325] |
| 无 `extensions` 的 custom LSP | 非 builtin、非 `disabled: true`、且没有 `extensions` → unsupported 并从 `lsp` map 滤掉。[E: packages/opencode/src/config/v2-compat.ts:344][E: packages/opencode/src/config/v2-compat.ts:345] |

builtin LSP、`disabled: true` 的 custom LSP、带 `extensions` 的 custom LSP 保留。[E: packages/opencode/src/config/v2-compat.ts:339][E: packages/opencode/src/config/v2-compat.ts:342][E: packages/opencode/src/config/v2-compat.ts:343]

## V2→V1 映射

`preferLegacy`：目标上已有 V1 同名 key 则保留 V1；值深度不等时记 `conflict`。[E: packages/opencode/src/config/v2-compat.ts:432][E: packages/opencode/src/config/v2-compat.ts:433]

| V2 输入 | V1 输出 | 行为 |
| --- | --- | --- |
| `snapshots` | `snapshot` | boolean；与已有 `snapshot` 冲突则保留 V1。[E: packages/opencode/src/config/v2-compat.ts:135][E: packages/opencode/src/config/v2-compat.ts:137] |
| `media` | `attachment` | 按 `ConfigAttachmentV1.Info` decode 后 preferLegacy。[E: packages/opencode/src/config/v2-compat.ts:140][E: packages/opencode/src/config/v2-compat.ts:141] |
| `model` object `{providerID,model,variant?}` | `model` 字符串 `providerID/model` | variant 见忽略表。[E: packages/opencode/src/config/v2-compat.ts:353] |
| `model` 字符串 `provider/model#variant` | `model` 去掉 `#` 段 | `#` 后记 unsupported。[E: packages/opencode/src/config/v2-compat.ts:357][E: packages/opencode/src/config/v2-compat.ts:359] |
| `skills[]` 字符串数组 | `{ paths, urls }` | `https?://` 进 `urls`，其余进 `paths`。[E: packages/opencode/src/config/v2-compat.ts:158] |
| `compaction.keep.tokens` | `compaction.preserve_recent_tokens` | preferLegacy。[E: packages/opencode/src/config/v2-compat.ts:177] |
| `compaction.buffer` | `compaction.reserved` | preferLegacy。[E: packages/opencode/src/config/v2-compat.ts:182] |
| `experimental.subagent_depth` | 顶层 `subagent_depth` | preferLegacy。[E: packages/opencode/src/config/v2-compat.ts:204] |
| `agents` | `agent` | 与已有 `agent` 按 name merge；同名且深度不等 → conflict，跳过该 name。[E: packages/opencode/src/config/v2-compat.ts:215][E: packages/opencode/src/config/v2-compat.ts:225] |
| `agents.*.system` | `agent.*.prompt` | [E: packages/opencode/src/config/v2-compat.ts:401] |
| `agents.*.disabled` | `agent.*.disable` | [E: packages/opencode/src/config/v2-compat.ts:402] |
| `agents.*.request.body` | `agent.*.options` | [E: packages/opencode/src/config/v2-compat.ts:404] |
| `agents.*.model` | `agent.*.model` + 可选 `variant` | 走 `lowerSelection`。[E: packages/opencode/src/config/v2-compat.ts:403] |
| `commands` | `command` | 按 name preferLegacy。[E: packages/opencode/src/config/v2-compat.ts:239] |
| `mcp.servers` | 展开进扁平 `mcp` map | envelope（`servers` 不是直接 server）才展开；与扁平同名冲突保留扁平。[E: packages/opencode/src/config/v2-compat.ts:278][E: packages/opencode/src/config/v2-compat.ts:282] |
| `mcp.*.disabled` | `mcp.*.enabled` | `enabled = disabled !== true`；若 raw 已有 `enabled` 则保留 raw，并在与 `disabled` 矛盾时 conflict。[E: packages/opencode/src/config/v2-compat.ts:372][E: packages/opencode/src/config/v2-compat.ts:329] |
| remote `oauth` snake_case | V1 camelCase | `client_id→clientId` 等。[E: packages/opencode/src/config/v2-compat.ts:385] |
| `mcp.timeout` `{catalog,execution}` 且相等、无 `startup` | `experimental.mcp_timeout` | 压成单一毫秒；否则 unsupported。[E: packages/opencode/src/config/v2-compat.ts:301][E: packages/opencode/src/config/v2-compat.ts:309] |

畸形 V2 子树记 `invalid` 后跳过该条目，兄弟条目继续投影。[E: packages/opencode/src/config/v2-compat.ts:421] 畸形扁平 MCP（例如 `mcp.servers` 本身是 server 而不是 envelope）不在 lower 里修，`setOwn` 原样留下交给最终 V1 decoder。[E: packages/opencode/src/config/v2-compat.ts:275]

`agent` / `command` / `experimental` 若已是非 record（`null`、array），lower 不拿 V2 值去修补，后续 schema 仍会 `ConfigInvalidError`。[E: packages/opencode/src/config/v2-compat.ts:224][E: packages/opencode/src/config/v2-compat.ts:233][E: packages/opencode/src/config/v2-compat.ts:307]

## Diagnostic kinds

`Diagnostic` 只有三种 `kind`，`message` 是固定模板，不内嵌用户值，避免把 secret 打进日志。[E: packages/opencode/src/config/v2-compat.ts:11][E: packages/opencode/test/config/v2-compat.test.ts:125]

| kind | 何时 | message |
| --- | --- | --- |
| `invalid` | `decodeValue` 对目标 schema 失败 | `Native setting could not be lowered because it is malformed` [E: packages/opencode/src/config/v2-compat.ts:421] |
| `unsupported` | 该 native 设置无法用 V1 表示 | `Omitted native setting that cannot be represented in V1` [E: packages/opencode/src/config/v2-compat.ts:444] |
| `conflict` | 已有 V1 值与 native 投影深度不等 | `Retained legacy value over native value` [E: packages/opencode/src/config/v2-compat.ts:448] |

`permissions` 硬拒绝走 `InvalidError`，不是这三种 diagnostic。[E: packages/opencode/src/config/v2-compat.ts:107] loader 把每条 diagnostic 的 `kind`/`path`/`message` 打 warning，**不**把 lowered 投影写回源文件。[E: packages/opencode/src/config/config.ts:190][E: packages/opencode/test/config/v2-compat.test.ts:311]

## 写路径：保留 raw JSON/JSONC

读路径消费 lowered `ConfigV1.Info`；写路径 merge **原始解析树**，未 lower 的 V2 字段（`providers`、`mcp.servers`、`disabled` 等）留在磁盘上。[E: packages/opencode/src/config/config.ts:643][E: packages/opencode/src/config/config.ts:647]

| API | 目标文件 | merge | `changed` |
| --- | --- | --- | --- |
| `update` | instance 目录下的 `config.json`（不是 `opencode.json`） | `mergeDeep(jsonc 原树, writable(patch))` 后 `JSON.stringify` | 无比较，总是写 [E: packages/opencode/src/config/config.ts:640][E: packages/opencode/src/config/config.ts:647] |
| `updateGlobal`（`.json`） | `globalConfigFile()` | 先用 lower+schema 校验原树，再 `mergeDeep(原树, writableGlobal(patch))` | `serialized !== before` [E: packages/opencode/src/config/config.ts:665][E: packages/opencode/src/config/config.ts:668][E: packages/opencode/src/config/config.ts:669] |
| `updateGlobal`（`.jsonc`） | 同上 | `patchJsonc(原文, patch)`，保留注释与 formatting | `updated !== before` [E: packages/opencode/src/config/config.ts:672][E: packages/opencode/src/config/config.ts:674] |

`writable` 写回前剔除 derived `plugin_origins`。[E: packages/opencode/src/config/config.ts:165] `writableGlobal` 额外把空字符串 `shell` 收成 `undefined`，避免留下 `"shell": ""`。[E: packages/opencode/src/config/config.ts:172] `updateGlobal` 只在 `changed` 时写盘并 `invalidate`，返回 `{ info, changed }`；`info` 是 merge 后再 `decodeConfig` 的 V1 投影。[E: packages/opencode/src/config/config.ts:668][E: packages/opencode/src/config/config.ts:673][E: packages/opencode/src/config/config.ts:678][E: packages/opencode/src/config/config.ts:679]

## V1 / V2 关系

- V1 活路径：本节点 + `persistence.config-loading` 的 `@opencode/Config`。
- V2 活路径：`config.v2-schema` 的 `@opencode/v2/Config`；遇到 V1-shaped 文件走 `config.migration`，方向相反。
- SessionV2 仍不是默认执行路径；本层存在是为了让当前 V1 runtime 能读（并在写时保留）V2-shaped 用户文件。

## Sources

- `packages/opencode/src/config/v2-compat.ts`
- `packages/opencode/src/config/config.ts`
- `packages/opencode/src/config/parse.ts`
- `packages/opencode/test/config/v2-compat.test.ts`

## 相关

- [配置发现/分层/合并](../../subsystems/persistence/config-loading.md)（`persistence.config-loading`）
- [Config Migration](migration.md)（`config.migration`，V1→V2，不要与本层混淆）
- [V2 Config schema](v2-schema.md)（`config.v2-schema`）
- [V1 Config 核心字段](v1-core.md)（`config.v1-core`）
