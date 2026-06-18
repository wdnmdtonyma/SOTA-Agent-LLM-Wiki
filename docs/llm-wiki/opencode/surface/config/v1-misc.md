---
id: config.v1-misc
title: V1 Misc Config
status: verified
owner: surface-config-cli
v: v1
kind: surface
tier: T1
schema: grouped-catalog
source:
  - packages/core/src/v1/config/config.ts
  - packages/core/src/v1/config/server.ts
  - packages/core/src/v1/config/command.ts
  - packages/core/src/v1/config/skills.ts
  - packages/core/src/v1/config/attachment.ts
  - packages/core/src/v1/config/plugin.ts
updated: 355a0bcf5
evidence: explicit
---

> `config.v1-misc` 收纳 V1 config 中不属于核心 agent/permission、provider/MCP/LSP 的余下字段：server、command、skills、references、plugin、attachment、tool_output、compaction、experimental。

## 顶层 Misc Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `server` | optional `ConfigServerV1.Server` | `opencode serve` 和 web command server config。[E: packages/core/src/v1/config/config.ts:38] | V2 schema 不含 `server`；V2 设计规范标为 remove，因为 location config 在 server 启动后才加载。[E: specs/v2/config.md:32] |
| `command` | optional record command info | user command configuration。[E: packages/core/src/v1/config/config.ts:41] | 当前 V2 code 有 `commands` schema。[E: packages/core/src/config.ts:92] 但 V2 设计规范曾标为不 port legacy `command`，属于实现与早期设计不同步。[E: specs/v2/config.md:41] |
| `skills` | optional `{ paths?, urls? }` | additional skill folder paths 或 URL discovery。[E: packages/core/src/v1/config/config.ts:44] | V2 改成单个 `skills: string[]`。[E: packages/core/src/config.ts:89] |
| `references` | optional reference info | named git/local directory references。[E: packages/core/src/v1/config/config.ts:45] | V2 仍叫 plural `references`。[E: packages/core/src/config.ts:98] |
| `reference` | optional reference info；deprecated | `references` 旧名单数 alias。[E: packages/core/src/v1/config/config.ts:48] | V2 只保留 `references`；migration 用 `references ?? reference`。[E: packages/core/src/v1/config/migrate.ts:66] |
| `plugin` | optional array plugin spec | configured plugin modules。[E: packages/core/src/v1/config/config.ts:56] | V2 改名为 `plugins`，entry 可为 string 或 `{ package, options }`。[E: packages/core/src/config/plugin.ts:5] |
| `attachment` | optional attachment config | attachment processing config。[E: packages/core/src/v1/config/config.ts:127] | V2 改名为 `attachments`。[E: packages/core/src/config.ts:77] |
| `tool_output` | optional thresholds | truncation thresholds for tool output。[E: packages/core/src/v1/config/config.ts:133] | V2 仍保留 `tool_output`。[E: packages/core/src/config.ts:80] |
| `compaction` | optional compaction object | context compaction behavior。[E: packages/core/src/v1/config/config.ts:146] | V2 仍保留 `compaction` 但重塑 `keep.tokens` 和 `buffer`。[E: packages/core/src/config/compaction.ts:10] |
| `experimental` | optional experimental object | experimental flags and policies。[E: packages/core/src/v1/config/config.ts:166] | V2 `experimental` 目前只含 `policies`。[E: packages/core/src/config/experimental.ts:16] |

## Server Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `server.port` | optional positive int | port to listen on。[E: packages/core/src/v1/config/server.ts:7] | V2 config schema 不含 server host settings。[E: specs/v2/config.md:32] |
| `server.hostname` | optional string | hostname to listen on。[E: packages/core/src/v1/config/server.ts:10] | V2 config schema 不含 server host settings。[E: specs/v2/config.md:32] |
| `server.mdns` | optional boolean | enable mDNS service discovery。[E: packages/core/src/v1/config/server.ts:11] | V2 config schema 不含 server host settings。[E: specs/v2/config.md:32] |
| `server.mdnsDomain` | optional string；description default `opencode.local` | custom mDNS domain。[E: packages/core/src/v1/config/server.ts:12] | V2 config schema 不含 server host settings。[E: specs/v2/config.md:32] |
| `server.cors` | optional string array | additional CORS domains。[E: packages/core/src/v1/config/server.ts:15] | V2 config schema 不含 server host settings。[E: specs/v2/config.md:32] |

## Command / Skills / Plugin Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `command.<name>.template` | string | command prompt/template body。[E: packages/core/src/v1/config/command.ts:6] | V2 current `commands.<name>.template`。[E: packages/core/src/config/command.ts:6] |
| `command.<name>.description` | optional string | command description。[E: packages/core/src/v1/config/command.ts:7] | V2 current same field。[E: packages/core/src/config/command.ts:7] |
| `command.<name>.agent` | optional string | command default agent。[E: packages/core/src/v1/config/command.ts:8] | V2 current same field。[E: packages/core/src/config/command.ts:8] |
| `command.<name>.model` | optional string | command default model。[E: packages/core/src/v1/config/command.ts:9] | V2 current same field。[E: packages/core/src/config/command.ts:9] |
| `command.<name>.variant` | optional string | command default model variant。[E: packages/core/src/v1/config/command.ts:10] | V2 current same field。[E: packages/core/src/config/command.ts:10] |
| `command.<name>.subtask` | optional boolean | command runs as subtask.[E: packages/core/src/v1/config/command.ts:11] | V2 current same field。[E: packages/core/src/config/command.ts:11] |
| `skills.paths` | optional string array | additional local skill folder paths。[E: packages/core/src/v1/config/skills.ts:6] | V2 concatenates `paths` and `urls` into `skills` string array。[E: packages/core/src/v1/config/migrate.ts:63] |
| `skills.urls` | optional string array | skill discovery URLs。[E: packages/core/src/v1/config/skills.ts:9] | V2 `skills` string array can contain remote URL sources。[E: specs/v2/config.md:42] |
| `plugin[]` string | string | package/plugin spec by string。[E: packages/core/src/v1/config/plugin.ts:8] | V2 `plugins[]` accepts string。[E: packages/core/src/config/plugin.ts:10] |
| `plugin[]` tuple | `[package, options]` | plugin package plus unknown options record。[E: packages/core/src/v1/config/plugin.ts:5] | V2 migration writes `{ package, options }` object。[E: packages/core/src/v1/config/migrate.ts:67] |

## Reference / Attachment / Tool Output / Compaction Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `attachment.image.auto_resize` | optional boolean；description default true | resize images before model send when exceeding limits。[E: packages/core/src/v1/config/attachment.ts:7] | V2 `attachments.image.auto_resize`。[E: packages/core/src/config/attachments.ts:7] |
| `attachment.image.max_width` | optional positive int；description default 2000 | max image width。[E: packages/core/src/v1/config/attachment.ts:10] | V2 `attachments.image.max_width`。[E: packages/core/src/config/attachments.ts:8] |
| `attachment.image.max_height` | optional positive int；description default 2000 | max image height。[E: packages/core/src/v1/config/attachment.ts:13] | V2 `attachments.image.max_height`。[E: packages/core/src/config/attachments.ts:9] |
| `attachment.image.max_base64_bytes` | optional positive int；description default 5242880 | max base64 payload bytes。[E: packages/core/src/v1/config/attachment.ts:16] | V2 `attachments.image.max_base64_bytes`。[E: packages/core/src/config/attachments.ts:10] |
| `tool_output.max_lines` | optional positive int；description default 2000 | max lines before truncation/save-to-disk。[E: packages/core/src/v1/config/config.ts:135] | V2 same field。[E: packages/core/src/config/tool-output.ts:7] |
| `tool_output.max_bytes` | optional positive int；description default 51200 | max bytes before truncation/save-to-disk。[E: packages/core/src/v1/config/config.ts:138] | V2 same field。[E: packages/core/src/config/tool-output.ts:8] |
| `compaction.auto` | optional boolean；description default true | enable automatic compaction when context full。[E: packages/core/src/v1/config/config.ts:148] | V2 same field。[E: packages/core/src/config/compaction.ts:11] |
| `compaction.prune` | optional boolean；description default false | prune old tool outputs。[E: packages/core/src/v1/config/config.ts:151] | V2 same field。[E: packages/core/src/config/compaction.ts:12] |
| `compaction.tail_turns` | optional non-negative int；description default 2 | recent user turns kept verbatim during compaction。[E: packages/core/src/v1/config/config.ts:154] | Current V2 schema does not include `tail_turns`; migration drops it。[E: packages/core/src/v1/config/migrate.ts:55] |
| `compaction.preserve_recent_tokens` | optional non-negative int | token budget for recent turns after compaction。[E: packages/core/src/v1/config/config.ts:158] | V2 `compaction.keep.tokens`。[E: packages/core/src/v1/config/migrate.ts:58] |
| `compaction.reserved` | optional non-negative int | token headroom buffer。[E: packages/core/src/v1/config/config.ts:161] | V2 `compaction.buffer`。[E: packages/core/src/v1/config/migrate.ts:61] |

## Experimental Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `experimental.disable_paste_summary` | optional boolean | paste summary experimental flag。[E: packages/core/src/v1/config/config.ts:168] | V2 schema 不含该 flag。[E: packages/core/src/config/experimental.ts:16] |
| `experimental.batch_tool` | optional boolean | enable batch tool。[E: packages/core/src/v1/config/config.ts:169] | V2 schema 不含该 flag。[E: packages/core/src/config/experimental.ts:16] |
| `experimental.openTelemetry` | optional boolean | enable OpenTelemetry spans for AI SDK calls。[E: packages/core/src/v1/config/config.ts:170] | V2 schema 不含该 flag。[E: packages/core/src/config/experimental.ts:16] |
| `experimental.primary_tools` | optional string array | tools only available to primary agents。[E: packages/core/src/v1/config/config.ts:173] | V2 schema 不含该 flag。[E: packages/core/src/config/experimental.ts:16] |
| `experimental.continue_loop_on_deny` | optional boolean | continue loop when tool call denied。[E: packages/core/src/v1/config/config.ts:176] | V2 schema 不含该 flag。[E: packages/core/src/config/experimental.ts:16] |
| `experimental.mcp_timeout` | optional positive int | MCP request timeout.[E: packages/core/src/v1/config/config.ts:179] | V2 migration moves to `mcp.timeout`。[E: packages/core/src/v1/config/migrate.ts:134] |
| `experimental.policies` | optional policy array | supported resource policy statements。[E: packages/core/src/v1/config/config.ts:182] | V2 keeps only `experimental.policies`。[E: packages/core/src/config/experimental.ts:17] |

## Sources

- `packages/core/src/v1/config/config.ts`
- `packages/core/src/v1/config/server.ts`
- `packages/core/src/v1/config/command.ts`
- `packages/core/src/v1/config/skills.ts`
- `packages/core/src/v1/config/attachment.ts`
- `packages/core/src/v1/config/plugin.ts`
- `packages/core/src/v1/config/migrate.ts`
- `packages/core/src/config.ts`
- `packages/core/src/config/attachments.ts`
- `packages/core/src/config/command.ts`
- `packages/core/src/config/compaction.ts`
- `packages/core/src/config/experimental.ts`
- `packages/core/src/config/plugin.ts`
- `packages/core/src/config/tool-output.ts`
- `specs/v2/config.md`

## 相关

- `config.v1-core`
- `config.v2-schema`
- `config.migration`
