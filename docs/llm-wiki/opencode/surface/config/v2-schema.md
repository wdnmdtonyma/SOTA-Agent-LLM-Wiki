---
id: config.v2-schema
title: V2 Config Schema
status: verified
owner: surface-config-cli
v: v2
kind: surface
tier: T1
schema: grouped-catalog
source:
  - packages/core/src/config.ts
  - packages/core/src/config/
updated: 355a0bcf5
evidence: explicit
---

> `config.v2-schema` 描述 `@opencode/v2/Config` 的 current code schema。V2 config schema 已在 `packages/core/src/config.ts` 建立，但 V2 runtime 目前主要通过 embedded API 接通；不要把它误认为 V1 `packages/opencode/src` 当前活跑的 config loader。

## 能回答的问题

- V2 config top-level key 与 V1 key 的对应关系。
- V2 为什么把 `agent`、`provider`、`plugin`、`attachment` 改成 plural。
- V2 permission ruleset 与 experimental policies 的字段差异。
- V2 config loader 如何同时接受 V2 config 和 V1 config 并迁移。

## Loader 与 Scope

V2 config service 名称是 `@opencode/v2/Config`。[E: packages/core/src/config.ts:132] loader 支持文件名 `config.json`、`opencode.json`、`opencode.jsonc`。[E: packages/core/src/config.ts:141] JSONC 解析允许 trailing comma。[E: packages/core/src/config.ts:151]

loader 同时准备 V2 `Info` decoder 与 V1 `ConfigV1.Info` decoder。[E: packages/core/src/config.ts:143] 如果 `ConfigMigrateV1.isV1(input)` 判断为 true，就先 decode V1，再 migrate，再 decode V2；否则直接 decode V2。[E: packages/core/src/config.ts:154]

V2 discovery 最终把 `configs` 组装为 global supplementary、direct project configs、再到后续 `.opencode` supplementary entries。[E: packages/core/src/config.ts:202] policy loading 对这些 config 调用 `toReversed()` 后再取 `experimental.policies`。[E: packages/core/src/config.ts:205]

## Top-level Catalog

| V2 key | type/default | 含义 | V1 来源 |
| --- | --- | --- | --- |
| `$schema` | optional string；schema default omitted | JSON schema reference。[E: packages/core/src/config.ts:29] | V1 `$schema` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:38] |
| `shell` | optional string | default shell for terminal/shell tool。[E: packages/core/src/config.ts:32] | V1 `shell` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:39] |
| `model` | optional string | default model when session/agent has none。[E: packages/core/src/config.ts:35] | V1 `model` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:40] |
| `default_agent` | optional string | default primary agent。[E: packages/core/src/config.ts:38] | V1 `default_agent` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:41] |
| `autoupdate` | optional boolean or `"notify"` | automatic update/notify behavior。[E: packages/core/src/config.ts:41] | V1 `autoupdate` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:42] |
| `share` | `manual`/`auto`/`disabled` optional | sharing behavior。[E: packages/core/src/config.ts:46] | V1 `share` or `autoshare` alias。[E: packages/core/src/v1/config/migrate.ts:43] |
| `enterprise.url` | optional string | enterprise sharing service config。[E: packages/core/src/config.ts:49] | V1 `enterprise` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:44] |
| `username` | optional string | displayed username / telemetry identity。[E: packages/core/src/config.ts:56] | V1 `username` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:45] |
| `permissions` | optional V2 ruleset | ordered tool permission rules。[E: packages/core/src/config.ts:59] | V1 `permission` and `tools` migrate here。[E: packages/core/src/v1/config/migrate.ts:46] |
| `agents` | optional record agent info | named built-in overrides and custom agents。[E: packages/core/src/config.ts:62] | V1 `agent` plus deprecated `mode` migrate here。[E: packages/core/src/v1/config/migrate.ts:47] |
| `snapshots` | optional boolean | snapshots for undo/revert behavior。[E: packages/core/src/config.ts:65] | V1 `snapshot` renamed。[E: packages/core/src/v1/config/migrate.ts:48] |
| `watcher` | optional watcher info | filesystem watcher config。[E: packages/core/src/config.ts:68] | V1 `watcher` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:49] |
| `formatter` | optional formatter info | built-in formatter enablement/overrides。[E: packages/core/src/config.ts:71] | V1 `formatter` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:50] |
| `lsp` | optional LSP info | language server enablement/overrides。[E: packages/core/src/config.ts:74] | V1 `lsp` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:51] |
| `attachments` | optional attachments info | attachment processing config。[E: packages/core/src/config.ts:77] | V1 `attachment` renamed。[E: packages/core/src/v1/config/migrate.ts:52] |
| `tool_output` | optional thresholds | tool output truncation thresholds。[E: packages/core/src/config.ts:80] | V1 `tool_output` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:53] |
| `mcp` | optional MCP info | MCP server config。[E: packages/core/src/config.ts:83] | V1 `mcp` and `experimental.mcp_timeout` migrate here。[E: packages/core/src/v1/config/migrate.ts:54] |
| `compaction` | optional compaction info | conversation compaction behavior。[E: packages/core/src/config.ts:86] | V1 `compaction` reshaped。[E: packages/core/src/v1/config/migrate.ts:55] |
| `skills` | optional string array | local/remote skill discovery sources。[E: packages/core/src/config.ts:89] | V1 `skills.paths` + `skills.urls` concat。[E: packages/core/src/v1/config/migrate.ts:63] |
| `commands` | optional record command info | named slash command definitions。[E: packages/core/src/config.ts:92] | V1 `command` renamed by migration。[E: packages/core/src/v1/config/migrate.ts:64] |
| `instructions` | optional string array | ambient instruction sources。[E: packages/core/src/config.ts:95] | V1 `instructions` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:65] |
| `references` | optional reference info | named local/git external context。[E: packages/core/src/config.ts:98] | V1 `references ?? reference`。[E: packages/core/src/v1/config/migrate.ts:66] |
| `plugins` | optional plugin array | ordered external plugin packages。[E: packages/core/src/config.ts:101] | V1 `plugin` renamed and tuple entries objectified。[E: packages/core/src/v1/config/migrate.ts:67] |
| `experimental` | optional experimental info | experimental V2-only subkeys; currently policies。[E: packages/core/src/config.ts:104] | V1 only migrates `experimental.policies`。[E: packages/core/src/v1/config/migrate.ts:70] |
| `providers` | optional record provider info | provider/model config overrides。[E: packages/core/src/config.ts:105] | V1 `provider` renamed。[E: packages/core/src/v1/config/migrate.ts:71] |

## Permission 与 Policy

V2 permission effect 允许 `allow`、`deny`、`ask`。[E: packages/core/src/permission/schema.ts:5] Permission rule 是 `{ action, resource, effect }`。[E: packages/core/src/permission/schema.ts:8] Ruleset 是 rule array，顺序本身是 authoring contract。[E: packages/core/src/permission/schema.ts:15]

V2 policy effect 只有 `allow` 和 `deny`。[E: packages/core/src/policy.ts:7] Policy info 同样有 `action`、`effect`、`resource`。[E: packages/core/src/policy.ts:10] policy evaluation 用 `findLast` 匹配 action/resource wildcard，因此同一加载序列里后面的 statement 覆盖前面的 statement。[E: packages/core/src/policy.ts:35]

`experimental.policies` 的 `action` 不是任意 string，而是 `Catalog.PolicyActions` union。[E: packages/core/src/config/experimental.ts:9]

## Nested Catalog

| nested key | type/default | 含义 | V1 来源 |
| --- | --- | --- | --- |
| `agents.<name>.model` | optional string | agent model。[E: packages/core/src/config/agent.ts:14] | V1 agent `model`。 |
| `agents.<name>.variant` | optional string | model variant。[E: packages/core/src/config/agent.ts:15] | V1 agent `variant`。 |
| `agents.<name>.request.headers` | optional record string | V2 agent request headers via provider request shape。[E: packages/core/src/config/provider.ts:8] | V2 schema field only; current V1 migration does not populate agent request headers。[I] |
| `agents.<name>.request.body` | optional record unknown | agent request body options。[E: packages/core/src/config/provider.ts:9] | V1 agent `options`/`temperature`/`top_p` migrate here。[E: packages/core/src/v1/config/migrate.ts:108] |
| `agents.<name>.system` | optional string | agent system prompt override。[E: packages/core/src/config/agent.ts:17] | V1 agent `prompt`。 |
| `agents.<name>.description` | optional string | user-visible when-to-use description。[E: packages/core/src/config/agent.ts:18] | V1 agent `description`。 |
| `agents.<name>.mode` | optional `subagent`/`primary`/`all` | runtime role。[E: packages/core/src/config/agent.ts:19] | V1 agent `mode`。 |
| `agents.<name>.hidden` | optional boolean | UI hidden flag。[E: packages/core/src/config/agent.ts:20] | V1 agent `hidden`。 |
| `agents.<name>.color` | optional hex/theme color | display color。[E: packages/core/src/config/agent.ts:21] | V1 agent `color`。 |
| `agents.<name>.steps` | optional positive int | iteration budget。[E: packages/core/src/config/agent.ts:22] | V1 agent `steps`/`maxSteps`。 |
| `agents.<name>.disabled` | optional boolean | inactive but configured agent。[E: packages/core/src/config/agent.ts:23] | V1 agent `disable`。 |
| `agents.<name>.permissions` | optional V2 ruleset | agent-local permission rules。[E: packages/core/src/config/agent.ts:24] | V1 agent `permission`。 |
| `watcher.ignore` | optional string array | filesystem ignore patterns。[E: packages/core/src/config/watcher.ts:5] | V1 `watcher.ignore`。 |
| `formatter` | boolean or record | built-in formatter switch or overrides。[E: packages/core/src/config/formatter.ts:12] | V1 same shape。 |
| `formatter.<name>.disabled` | optional boolean | disable formatter entry。[E: packages/core/src/config/formatter.ts:6] | V1 same field。 |
| `formatter.<name>.command` | optional string array | formatter command。[E: packages/core/src/config/formatter.ts:7] | V1 same field。 |
| `formatter.<name>.environment` | optional record string | formatter env vars。[E: packages/core/src/config/formatter.ts:8] | V1 same field。 |
| `formatter.<name>.extensions` | optional string array | formatter file extensions。[E: packages/core/src/config/formatter.ts:9] | V1 same field。 |
| `lsp` | boolean or record | built-in LSP switch or overrides。[E: packages/core/src/config/lsp.ts:18] | V1 same broad shape。 |
| `lsp.<id>.command` | string array | language server command。[E: packages/core/src/config/lsp.ts:10] | V1 same field。 |
| `lsp.<id>.extensions` | optional string array | language server file extensions。[E: packages/core/src/config/lsp.ts:11] | V1 same field。 |
| `lsp.<id>.disabled` | optional boolean or disabled entry | disable server。[E: packages/core/src/config/lsp.ts:12] | V1 same field。 |
| `lsp.<id>.env` | optional record string | language server env vars。[E: packages/core/src/config/lsp.ts:13] | V1 same field。 |
| `lsp.<id>.initialization` | optional record unknown | initialization options。[E: packages/core/src/config/lsp.ts:14] | V1 same field。 |
| `attachments.image.auto_resize` | optional boolean | image auto resize。[E: packages/core/src/config/attachments.ts:7] | V1 `attachment.image.auto_resize`。 |
| `attachments.image.max_width` | optional positive int | image width limit。[E: packages/core/src/config/attachments.ts:8] | V1 `attachment.image.max_width`。 |
| `attachments.image.max_height` | optional positive int | image height limit。[E: packages/core/src/config/attachments.ts:9] | V1 `attachment.image.max_height`。 |
| `attachments.image.max_base64_bytes` | optional positive int | base64 payload limit。[E: packages/core/src/config/attachments.ts:10] | V1 `attachment.image.max_base64_bytes`。 |
| `tool_output.max_lines` | optional positive int | max lines before truncation。[E: packages/core/src/config/tool-output.ts:7] | V1 same field。 |
| `tool_output.max_bytes` | optional positive int | max bytes before truncation。[E: packages/core/src/config/tool-output.ts:8] | V1 same field。 |
| `mcp.timeout` | optional positive int | protocol-wide MCP timeout。[E: packages/core/src/config/mcp.ts:37] | V1 `experimental.mcp_timeout`。 |
| `mcp.servers.<name>.type` | `local`/`remote` | explicit MCP server type。[E: packages/core/src/config/mcp.ts:34] | V1 `mcp.<name>.type`。 |
| `mcp.servers.<name>.command` | string array | local MCP command。[E: packages/core/src/config/mcp.ts:8] | V1 same field。 |
| `mcp.servers.<name>.environment` | optional record string | local MCP env vars。[E: packages/core/src/config/mcp.ts:12] | V1 same field。 |
| `mcp.servers.<name>.disabled` | optional boolean | inactive MCP server。[E: packages/core/src/config/mcp.ts:13] | typed V1 MCP server `enabled` is inverted when present；enabled-only stubs are filtered out before migration。[E: packages/core/src/v1/config/migrate.ts:130] [E: packages/core/src/v1/config/migrate.ts:140] |
| `mcp.servers.<name>.timeout` | optional positive int | server-specific timeout。[E: packages/core/src/config/mcp.ts:14] | V1 same field。 |
| `mcp.servers.<name>.url` | string | remote MCP URL。[E: packages/core/src/config/mcp.ts:27] | V1 same field。 |
| `mcp.servers.<name>.headers` | optional record string | remote headers。[E: packages/core/src/config/mcp.ts:28] | V1 same field。 |
| `mcp.servers.<name>.oauth.client_id` | optional string | OAuth client id。[E: packages/core/src/config/mcp.ts:18] | V1 `clientId`。 |
| `mcp.servers.<name>.oauth.client_secret` | optional string | OAuth secret。[E: packages/core/src/config/mcp.ts:19] | V1 `clientSecret`。 |
| `mcp.servers.<name>.oauth.scope` | optional string | OAuth scopes。[E: packages/core/src/config/mcp.ts:20] | V1 same field。 |
| `mcp.servers.<name>.oauth.callback_port` | optional int 1-65535 | OAuth callback port。[E: packages/core/src/config/mcp.ts:21] | V1 `callbackPort`。 |
| `mcp.servers.<name>.oauth.redirect_uri` | optional string | OAuth redirect URI。[E: packages/core/src/config/mcp.ts:22] | V1 `redirectUri`。 |
| `compaction.auto` | optional boolean | automatic compaction。[E: packages/core/src/config/compaction.ts:11] | V1 same field。 |
| `compaction.prune` | optional boolean | prune old tool outputs。[E: packages/core/src/config/compaction.ts:12] | V1 same field。 |
| `compaction.keep.tokens` | optional non-negative int | recent-history token budget。[E: packages/core/src/config/compaction.ts:6] | V1 `preserve_recent_tokens`。 |
| `compaction.buffer` | optional non-negative int | context headroom buffer。[E: packages/core/src/config/compaction.ts:14] | V1 `reserved`。 |
| `commands.<name>.template` | string | command template。[E: packages/core/src/config/command.ts:6] | V1 `command.<name>.template`。 |
| `commands.<name>.description` | optional string | command description。[E: packages/core/src/config/command.ts:7] | V1 same field。 |
| `commands.<name>.agent` | optional string | command agent。[E: packages/core/src/config/command.ts:8] | V1 same field。 |
| `commands.<name>.model` | optional string | command model。[E: packages/core/src/config/command.ts:9] | V1 same field。 |
| `commands.<name>.variant` | optional string | command variant。[E: packages/core/src/config/command.ts:10] | V1 same field。 |
| `commands.<name>.subtask` | optional boolean | subtask command flag。[E: packages/core/src/config/command.ts:11] | V1 same field。 |
| `references.<name>` string | string | compact reference entry。[E: packages/core/src/config/reference.ts:18] | V1 reference info migration preserves entries。 |
| `references.<name>.path` | string | local reference path。[E: packages/core/src/config/reference.ts:13] | V1 local reference shape。 |
| `references.<name>.repository` | string | git repository reference。[E: packages/core/src/config/reference.ts:6] | V1 git reference shape。 |
| `references.<name>.branch` | optional string | git branch。[E: packages/core/src/config/reference.ts:7] | V1 git reference shape。 |
| `references.<name>.description` | optional string | reference description。[E: packages/core/src/config/reference.ts:8] | V1 reference description。 |
| `references.<name>.hidden` | optional boolean | hide reference from UI/listing。[E: packages/core/src/config/reference.ts:9] | V1 reference hidden。 |
| `plugins[]` string | string | plugin package spec。[E: packages/core/src/config/plugin.ts:10] | V1 string plugin spec。 |
| `plugins[].package` | string | plugin package name。[E: packages/core/src/config/plugin.ts:6] | V1 tuple first item。 |
| `plugins[].options` | optional record unknown | plugin options。[E: packages/core/src/config/plugin.ts:7] | V1 tuple second item。 |
| `providers.<name>.name` | optional string | provider display name。[E: packages/core/src/config/provider.ts:66] | V1 provider `name`。 |
| `providers.<name>.env` | optional string array | credential env names。[E: packages/core/src/config/provider.ts:67] | V1 provider `env`。 |
| `providers.<name>.api` | optional provider API | AISDK/native/provider API override。[E: packages/core/src/config/provider.ts:68] | V1 provider `npm`/`api` lower to API object。 |
| `providers.<name>.request.headers` | optional record string | provider-level request headers。[E: packages/core/src/config/provider.ts:8] | V1 provider options lowerer。 |
| `providers.<name>.request.body` | optional record unknown | provider-level request body/options。[E: packages/core/src/config/provider.ts:9] | V1 provider options lowerer。 |
| `providers.<name>.models.<id>.family` | optional model family | model family。[E: packages/core/src/config/provider.ts:48] | V1 model `family`。 |
| `providers.<name>.models.<id>.name` | optional string | model display name。[E: packages/core/src/config/provider.ts:49] | V1 model `name`。 |
| `providers.<name>.models.<id>.api` | optional model API | upstream model/provider API override。[E: packages/core/src/config/provider.ts:50] | V1 model `id`/`provider`。 |
| `providers.<name>.models.<id>.capabilities` | optional capabilities | tools/input/output capability metadata。[E: packages/core/src/config/provider.ts:51] | V1 `tool_call` and `modalities`。 |
| `providers.<name>.models.<id>.request.variant` | optional string | request variant selector。[E: packages/core/src/config/provider.ts:54] | V2 schema field only; V1 `variants` record migrates to `variants[]`。[E: packages/core/src/v1/config/migrate.ts:240] |
| `providers.<name>.models.<id>.variants[]` | optional array with `id` and request fields | model variants。[E: packages/core/src/config/provider.ts:56] | V1 variants record migrated to array。 |
| `providers.<name>.models.<id>.cost` | cost object or array | model pricing。[E: packages/core/src/config/provider.ts:60] | V1 cost object plus context tier。 |
| `providers.<name>.models.<id>.disabled` | optional boolean | model disabled marker。[E: packages/core/src/config/provider.ts:61] | V1 status deprecated maps to disabled。 |
| `providers.<name>.models.<id>.limit` | optional limit object | context/input/output limits。[E: packages/core/src/config/provider.ts:62] | V1 limit。 |

## Published Schema Caveat

`packages/opencode/script/schema.ts` imports `ConfigV1.Info` and `TuiConfig.Info`。[E: packages/opencode/script/schema.ts:4] The script writes the main config schema from `generateEffect(ConfigV1.Info)`。[E: packages/opencode/script/schema.ts:72] Therefore the published `opencode.ai/config.json` generation path remains V1-based, while V2 schema exists in `packages/core/src/config.ts` for the new core.[I]

## Sources

- `packages/core/src/config.ts`
- `packages/core/src/config/agent.ts`
- `packages/core/src/config/attachments.ts`
- `packages/core/src/config/command.ts`
- `packages/core/src/config/compaction.ts`
- `packages/core/src/config/experimental.ts`
- `packages/core/src/config/formatter.ts`
- `packages/core/src/config/lsp.ts`
- `packages/core/src/config/mcp.ts`
- `packages/core/src/config/plugin.ts`
- `packages/core/src/config/provider.ts`
- `packages/core/src/config/reference.ts`
- `packages/core/src/config/tool-output.ts`
- `packages/core/src/config/watcher.ts`
- `packages/core/src/permission/schema.ts`
- `packages/core/src/policy.ts`
- `packages/core/src/v1/config/migrate.ts`
- `packages/opencode/script/schema.ts`

## 相关

- `config.migration`
- `config.v1-core`
- `config.v1-providers-mcp-lsp`
- `config.v1-misc`
