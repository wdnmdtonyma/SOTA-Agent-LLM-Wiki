---
id: config.migration
title: Config Migration
status: verified
owner: surface-config-cli
v: shared
kind: surface
tier: T1
schema: node
source:
  - packages/core/src/v1/config/migrate.ts
  - packages/core/src/config.ts
updated: 8b68dc0d7
evidence: explicit
---

> `config.migration` 描述 V1 config 到 V2 config 的 in-memory migration。它不会重写用户文件；V2 loader 在读取文件内容后检测 V1 shape，decode V1，再调用 `ConfigMigrateV1.migrate`，最后 decode V2。

## 能回答的问题

- `isV1` 通过哪些 legacy keys 判断一个 config 是 V1。
- V1 key 到 V2 key 的重命名表是什么。
- permission、agent、MCP、provider、model 的 nested migration 如何处理。
- 哪些 V1 字段在 migration 中被丢弃。

## V1 输入识别

`isV1(input)` 只接受非 null object，array 会被排除。[E: packages/core/src/v1/config/migrate.ts:31] 判断依据是 object keys 是否命中 legacy key set。[E: packages/core/src/v1/config/migrate.ts:32]

| detector key | 为什么是 V1 signal |
| --- | --- |
| `logLevel` | V1 顶层存在，V2 schema 不含该 key。[E: packages/core/src/v1/config/migrate.ts:11] |
| `server` | V1 顶层 server config，V2 schema 不含。[E: packages/core/src/v1/config/migrate.ts:12] |
| `command` | V1 singular command container，V2 current key 是 `commands`。[E: packages/core/src/v1/config/migrate.ts:13] |
| `reference` | V1 deprecated singular alias，V2 只用 `references`。[E: packages/core/src/v1/config/migrate.ts:14] |
| `snapshot` | V1 singular snapshot key，V2 current key 是 `snapshots`。[E: packages/core/src/v1/config/migrate.ts:15] |
| `plugin` | V1 singular plugin array，V2 current key 是 `plugins`。[E: packages/core/src/v1/config/migrate.ts:16] |
| `autoshare` | V1 deprecated sharing alias。[E: packages/core/src/v1/config/migrate.ts:17] |
| `disabled_providers` | V1 provider allow/deny helper。[E: packages/core/src/v1/config/migrate.ts:18] |
| `enabled_providers` | V1 provider allowlist helper。[E: packages/core/src/v1/config/migrate.ts:19] |
| `small_model` | V1 utility model field。[E: packages/core/src/v1/config/migrate.ts:20] |
| `mode` | V1 deprecated agent alias。[E: packages/core/src/v1/config/migrate.ts:21] |
| `agent` | V1 singular agent container。[E: packages/core/src/v1/config/migrate.ts:22] |
| `provider` | V1 singular provider container。[E: packages/core/src/v1/config/migrate.ts:23] |
| `permission` | V1 singular permission map。[E: packages/core/src/v1/config/migrate.ts:24] |
| `tools` | V1 deprecated boolean tool map。[E: packages/core/src/v1/config/migrate.ts:25] |
| `attachment` | V1 singular attachment config。[E: packages/core/src/v1/config/migrate.ts:26] |
| `layout` | V1 deprecated TUI layout key。[E: packages/core/src/v1/config/migrate.ts:27] |

## V2 Loader Loop

V2 config loader reads file text safely, parses JSONC with trailing commas, and accumulates parse errors locally。[E: packages/core/src/config.ts:148] [E: packages/core/src/config.ts:151] [E: packages/core/src/config.ts:152] 对每个 parsed input，loader 用 `isV1` 分叉：V1 文件走 `decodeV1Info -> migrate -> decodeInfo`，V2 文件直接 `decodeInfo`。[E: packages/core/src/config.ts:156] [E: packages/core/src/config.ts:157] [E: packages/core/src/config.ts:158] 这说明 migration 是 read-time compatibility layer，不是写回磁盘的 upgrader。[I]

## 重命名与保留表

下表描述 `migrate()` 在已经被识别为 V1 config 后的输出行为；`isV1` 只看 legacy detector key set，因此只包含 V1-shaped `skills`、`mcp`、`compaction` 或 nested `experimental.mcp_timeout` 的文件不一定会进入 migration 分支。[E: packages/core/src/v1/config/migrate.ts:10]

| V1 input | V2 output | behavior |
| --- | --- | --- |
| `$schema` | `$schema` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:37] |
| `shell` | `shell` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:38] |
| `model` | `model` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:39] |
| `default_agent` | `default_agent` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:40] |
| `autoupdate` | `autoupdate` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:41] |
| `share` | `share` | 优先使用 V1 `share`。[E: packages/core/src/v1/config/migrate.ts:42] |
| `autoshare` | `share` | 如果 `share` absent 且 `autoshare` truthy，输出 `"auto"`。[E: packages/core/src/v1/config/migrate.ts:42] |
| `enterprise` | `enterprise` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:43] |
| `username` | `username` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:44] |
| `permission` + `tools` | `permissions` | 通过 `permissions(info.permission, info.tools)` 转 rules。[E: packages/core/src/v1/config/migrate.ts:45] |
| `agent` + `mode` | `agents` | 通过 `agents(info)` 合并。[E: packages/core/src/v1/config/migrate.ts:46] |
| `snapshot` | `snapshots` | singular to plural。[E: packages/core/src/v1/config/migrate.ts:47] |
| `watcher` | `watcher` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:48] |
| `formatter` | `formatter` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:49] |
| `lsp` | `lsp` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:50] |
| `attachment` | `attachments` | singular to plural。[E: packages/core/src/v1/config/migrate.ts:51] |
| `tool_output` | `tool_output` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:52] |
| `mcp` + `experimental.mcp_timeout` | `mcp` | server map plus subsystem timeout。[E: packages/core/src/v1/config/migrate.ts:53] |
| `compaction.auto` | `compaction.auto` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:55] |
| `compaction.prune` | `compaction.prune` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:56] |
| `compaction.preserve_recent_tokens` | `compaction.keep.tokens` | renamed under keep。[E: packages/core/src/v1/config/migrate.ts:57] [E: packages/core/src/v1/config/migrate.ts:58] |
| `compaction.reserved` | `compaction.buffer` | renamed to buffer。[E: packages/core/src/v1/config/migrate.ts:60] |
| `skills.paths` + `skills.urls` | `skills` | concatenated string array。[E: packages/core/src/v1/config/migrate.ts:62] |
| `command` | `commands` | renamed to plural。[E: packages/core/src/v1/config/migrate.ts:63] |
| `instructions` | `instructions` | 原样复制。[E: packages/core/src/v1/config/migrate.ts:64] |
| `references` or `reference` | `references` | plural preferred, singular fallback。[E: packages/core/src/v1/config/migrate.ts:65] |
| `plugin` | `plugins` | string preserved, tuple converted to object。[E: packages/core/src/v1/config/migrate.ts:66] [E: packages/core/src/v1/config/migrate.ts:67] |
| `experimental.policies` | `experimental.policies` | only policies are preserved。[E: packages/core/src/v1/config/migrate.ts:69] |
| `provider` | `providers` | renamed to plural and nested migrated。[E: packages/core/src/v1/config/migrate.ts:70] |

## Permission Migration

V1 `tools` boolean map is converted first into rules where `enabled` true means `allow` and false means `deny`。[E: packages/core/src/v1/config/migrate.ts:75] [E: packages/core/src/v1/config/migrate.ts:80] `write` and `patch` actions are normalized to `edit` only in that deprecated `tools` conversion path。[E: packages/core/src/v1/config/migrate.ts:94] Whole-field `permission: "allow"` is normalized by V1 decode to `{ "*": "allow" }` before migration。[E: packages/core/src/v1/config/permission.ts:40] A per-action rule string such as `permission.bash: "allow"` becomes `{ action: "bash", resource: "*", effect: "allow" }`。[E: packages/core/src/v1/config/migrate.ts:85] V1 object rules become one V2 rule per resource/effect entry。[E: packages/core/src/v1/config/migrate.ts:88]

## Agent Migration

`agents(info)` concatenates `info.agent` entries with deprecated `info.mode` entries; each `mode` entry is copied and forced to `mode: "primary"`。[E: packages/core/src/v1/config/migrate.ts:98] [E: packages/core/src/v1/config/migrate.ts:100] Empty result returns `undefined` rather than `{}`。[E: packages/core/src/v1/config/migrate.ts:102]

单个 agent migration 把 V1 `options`、`temperature`、`top_p` 合并到 `request.body`。[E: packages/core/src/v1/config/migrate.ts:108] [E: packages/core/src/v1/config/migrate.ts:109] [E: packages/core/src/v1/config/migrate.ts:110] [E: packages/core/src/v1/config/migrate.ts:115] `prompt` becomes `system`。[E: packages/core/src/v1/config/migrate.ts:116] `disable` becomes `disabled`。[E: packages/core/src/v1/config/migrate.ts:122] V1 agent `permission` becomes V2 `permissions`。[E: packages/core/src/v1/config/migrate.ts:123]

## MCP Migration

V1 `mcp` entries without `type` are skipped, so legacy `{ enabled: boolean }` stubs do not become V2 servers。[E: packages/core/src/v1/config/migrate.ts:129] [E: packages/core/src/v1/config/migrate.ts:130] V1 `experimental.mcp_timeout` becomes `mcp.timeout`。[E: packages/core/src/v1/config/migrate.ts:133] [E: packages/core/src/v1/config/migrate.ts:135] V1 `enabled` is inverted into V2 `disabled` only when `enabled` is present。[E: packages/core/src/v1/config/migrate.ts:139]

Remote OAuth fields are snake_cased: `clientId` to `client_id`、`clientSecret` to `client_secret`、`callbackPort` to `callback_port`、`redirectUri` to `redirect_uri`。[E: packages/core/src/v1/config/migrate.ts:154] [E: packages/core/src/v1/config/migrate.ts:155] [E: packages/core/src/v1/config/migrate.ts:157] [E: packages/core/src/v1/config/migrate.ts:158]

## Provider 和 Model Migration

Provider migration uses `ConfigProviderOptionsV1.get(info.npm)` to lower legacy provider options into V2 request/settings shapes。[E: packages/core/src/v1/config/migrate.ts:171] [E: packages/core/src/v1/config/migrate.ts:172] If V1 provider has `npm`, migration emits an AISDK `api` object with package, URL and settings。[E: packages/core/src/v1/config/migrate.ts:177] [E: packages/core/src/v1/config/migrate.ts:180] [E: packages/core/src/v1/config/migrate.ts:181] [E: packages/core/src/v1/config/migrate.ts:182] V1 `models` record becomes a V2 `models` record by calling `migrateModel` on each entry。[E: packages/core/src/v1/config/migrate.ts:186] [E: packages/core/src/v1/config/migrate.ts:188]

Model migration builds tiered cost array from V1 `cost` and optional `context_over_200k`。[E: packages/core/src/v1/config/migrate.ts:196] [E: packages/core/src/v1/config/migrate.ts:200] [E: packages/core/src/v1/config/migrate.ts:202] V1 `tool_call` and `modalities` become `capabilities.tools/input/output`。[E: packages/core/src/v1/config/migrate.ts:213] [E: packages/core/src/v1/config/migrate.ts:215] V1 `headers` and lowered request options become V2 `request.headers/body`。[E: packages/core/src/v1/config/migrate.ts:232] [E: packages/core/src/v1/config/migrate.ts:233] [E: packages/core/src/v1/config/migrate.ts:234] V1 variants record becomes a V2 variants array with `id` and `body`。[E: packages/core/src/v1/config/migrate.ts:236] [E: packages/core/src/v1/config/migrate.ts:239] [E: packages/core/src/v1/config/migrate.ts:240] V1 `status: "deprecated"` becomes V2 `disabled: true`。[E: packages/core/src/v1/config/migrate.ts:243]

## Dropped or Compatibility-only Fields

Top-level V1 fields used for detection or partial compatibility but not emitted as same-name V2 fields include: `logLevel`、`server`、`disabled_providers`、`enabled_providers`、`small_model`、`layout`、`compaction.tail_turns`、`experimental.disable_paste_summary`、`experimental.batch_tool`、`experimental.openTelemetry`、`experimental.primary_tools`、`experimental.continue_loop_on_deny`。[I] Nested provider/model fields with no first-class V2 output include provider `id`、`whitelist`、`blacklist` and model `release_date`、`attachment`、`reasoning`、`temperature`、`interleaved`、`experimental`；provider/model `api` is only preserved in the AISDK-package branches described in provider migration。[I]

## Sources

- `packages/core/src/v1/config/migrate.ts`
- `packages/core/src/config.ts`
- `packages/core/src/config/agent.ts`
- `packages/core/src/config/mcp.ts`
- `packages/core/src/config/provider.ts`

## 相关

- `config.v1-core`
- `config.v1-providers-mcp-lsp`
- `config.v1-misc`
- `config.v2-schema`
