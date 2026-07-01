---
id: ref.config-keys
title: Config key 全 catalog(V1 + V2)
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/v1/config/
  - packages/core/src/config/
  - packages/core/src/v1/config/migrate.ts
status: verified
symbols:
  - ConfigV1.Info
  - Config.Info
  - ConfigMigrateV1.migrate
evidence: explicit
updated: 8b68dc0d7
---

> 这份节点是机器可读的 config key 总账：V1 是当前 V1 CLI/agent surface 的配置 schema，V2 是 `@opencode/v2` core 的 `Config.Info` schema。

## 能回答的问题

- V1 `opencode.json` 支持哪些顶层 key，哪些是 deprecated？
- V2 `Config.Info` 支持哪些顶层 key，哪些是从 V1 重命名迁移来的？
- agent、provider、mcp、lsp、formatter、attachment、compaction 等嵌套对象有哪些字段？
- V1→V2 迁移怎样处理 `permission/tools/write/patch`、`mode/agent`、`plugin/plugins`？

## V1

V1 schema 的主入口是 `ConfigV1.Info`，顶层还定义了 well-known `config` 与 `remote_config` 两个包装字段。[E: packages/core/src/v1/config/config.ts:32][E: packages/core/src/v1/config/config.ts:23][E: packages/core/src/v1/config/config.ts:24] V2 loader 会用 V1 schema decode 旧配置，并在 `ConfigMigrateV1.isV1(input)` 命中时迁移到 V2 schema。[E: packages/core/src/config.ts:145][E: packages/core/src/config.ts:156][E: packages/core/src/config.ts:157]

### V1 top-level keys

| Key | Type/shape | Status | Evidence |
|---|---|---|---|
| `$schema` | string | active | [E: packages/core/src/v1/config/config.ts:33] |
| `shell` | string | active | [E: packages/core/src/v1/config/config.ts:36] |
| `logLevel` | `DEBUG|INFO|WARN|ERROR` | V1-only / migration detector | [E: packages/core/src/v1/config/config.ts:37][E: packages/core/src/v1/config/migrate.ts:11] |
| `server` | server object | V1-only / migration detector | [E: packages/core/src/v1/config/config.ts:38][E: packages/core/src/v1/config/migrate.ts:12] |
| `command` | record of command config | renamed to V2 `commands` | [E: packages/core/src/v1/config/config.ts:41][E: packages/core/src/v1/config/migrate.ts:63] |
| `skills` | paths/urls config | active, migrated to string array | [E: packages/core/src/v1/config/config.ts:44][E: packages/core/src/v1/config/migrate.ts:62] |
| `references` | named local/git references | active | [E: packages/core/src/v1/config/config.ts:45] |
| `reference` | same shape as `references` | deprecated alias | [E: packages/core/src/v1/config/config.ts:48][E: packages/core/src/v1/config/config.ts:49] |
| `watcher.ignore` | string array | active | [E: packages/core/src/v1/config/config.ts:51] |
| `snapshot` | boolean | renamed to V2 `snapshots` | [E: packages/core/src/v1/config/config.ts:52][E: packages/core/src/v1/config/migrate.ts:47] |
| `plugin` | plugin spec array | renamed to V2 `plugins` | [E: packages/core/src/v1/config/config.ts:56][E: packages/core/src/v1/config/migrate.ts:66] |
| `share` | `manual|auto|disabled` | active | [E: packages/core/src/v1/config/config.ts:57] |
| `autoshare` | boolean | deprecated; migrates to `share: "auto"` | [E: packages/core/src/v1/config/config.ts:61][E: packages/core/src/v1/config/config.ts:62][E: packages/core/src/v1/config/migrate.ts:42] |
| `autoupdate` | boolean or `notify` | active | [E: packages/core/src/v1/config/config.ts:64] |
| `disabled_providers` | string array | V1 provider gating | [E: packages/core/src/v1/config/config.ts:68] |
| `enabled_providers` | string array | V1 provider allow-list | [E: packages/core/src/v1/config/config.ts:71] |
| `model` | `provider/model` string | active | [E: packages/core/src/v1/config/config.ts:74] |
| `small_model` | `provider/model` string | V1-only / migration detector | [E: packages/core/src/v1/config/config.ts:77][E: packages/core/src/v1/config/migrate.ts:20] |
| `default_agent` | agent name | active | [E: packages/core/src/v1/config/config.ts:80] |
| `username` | string | active | [E: packages/core/src/v1/config/config.ts:84] |
| `mode` | record of agent config | deprecated alias for `agent`; migrates as primary agents | [E: packages/core/src/v1/config/config.ts:87][E: packages/core/src/v1/config/config.ts:92][E: packages/core/src/v1/config/migrate.ts:100] |
| `agent` | built-in/custom agent map | active | [E: packages/core/src/v1/config/config.ts:93] |
| `provider` | provider config map | renamed to V2 `providers` | [E: packages/core/src/v1/config/config.ts:107][E: packages/core/src/v1/config/migrate.ts:70] |
| `mcp` | MCP server map | active, migrated with field renames | [E: packages/core/src/v1/config/config.ts:110][E: packages/core/src/v1/config/migrate.ts:127] |
| `formatter` | formatter config | active | [E: packages/core/src/v1/config/config.ts:113] |
| `lsp` | LSP config | active | [E: packages/core/src/v1/config/config.ts:117] |
| `instructions` | string array | active | [E: packages/core/src/v1/config/config.ts:121] |
| `layout` | layout enum | deprecated | [E: packages/core/src/v1/config/config.ts:124] |
| `permission` | V1 permission config | migrated to V2 `permissions` | [E: packages/core/src/v1/config/config.ts:125][E: packages/core/src/v1/config/migrate.ts:45] |
| `tools` | record of boolean | migrated to V2 permission rules | [E: packages/core/src/v1/config/config.ts:126][E: packages/core/src/v1/config/migrate.ts:74] |
| `attachment` | attachment processing config | renamed to V2 `attachments` | [E: packages/core/src/v1/config/config.ts:127][E: packages/core/src/v1/config/migrate.ts:51] |
| `enterprise.url` | string | active | [E: packages/core/src/v1/config/config.ts:131] |
| `tool_output.max_lines` | positive int | active | [E: packages/core/src/v1/config/config.ts:135] |
| `tool_output.max_bytes` | positive int | active | [E: packages/core/src/v1/config/config.ts:138] |
| `compaction.auto` | boolean | active | [E: packages/core/src/v1/config/config.ts:148] |
| `compaction.prune` | boolean | active | [E: packages/core/src/v1/config/config.ts:151] |
| `compaction.tail_turns` | non-negative int | V1 shape | [E: packages/core/src/v1/config/config.ts:154] |
| `compaction.preserve_recent_tokens` | non-negative int | migrates to V2 `compaction.keep.tokens` | [E: packages/core/src/v1/config/config.ts:158][E: packages/core/src/v1/config/migrate.ts:58] |
| `compaction.reserved` | non-negative int | migrates to V2 `compaction.buffer` | [E: packages/core/src/v1/config/config.ts:161][E: packages/core/src/v1/config/migrate.ts:60] |
| `experimental.disable_paste_summary` | boolean | V1 experimental | [E: packages/core/src/v1/config/config.ts:168] |
| `experimental.batch_tool` | boolean | V1 experimental | [E: packages/core/src/v1/config/config.ts:169] |
| `experimental.openTelemetry` | boolean | V1 experimental | [E: packages/core/src/v1/config/config.ts:170] |
| `experimental.primary_tools` | string array | V1 experimental | [E: packages/core/src/v1/config/config.ts:173] |
| `experimental.continue_loop_on_deny` | boolean | V1 experimental | [E: packages/core/src/v1/config/config.ts:176] |
| `experimental.mcp_timeout` | positive int | migrates into V2 MCP timeout when present | [E: packages/core/src/v1/config/config.ts:179][E: packages/core/src/v1/config/migrate.ts:133] |
| `experimental.policies` | policy array | migrated to V2 experimental policies | [E: packages/core/src/v1/config/config.ts:182][E: packages/core/src/v1/config/migrate.ts:69] |

### V1 nested catalog

| Object | Fields | Evidence |
|---|---|---|
| `agent.<name>` | `model`, `variant`, `temperature`, `top_p`, `prompt`, deprecated `tools`, `disable`, `description`, `mode`, `hidden`, `options`, `color`, `steps`, deprecated `maxSteps`, `permission` | [E: packages/core/src/v1/config/agent.ts:14][E: packages/core/src/v1/config/agent.ts:15][E: packages/core/src/v1/config/agent.ts:18][E: packages/core/src/v1/config/agent.ts:19][E: packages/core/src/v1/config/agent.ts:20][E: packages/core/src/v1/config/agent.ts:21][E: packages/core/src/v1/config/agent.ts:24][E: packages/core/src/v1/config/agent.ts:25][E: packages/core/src/v1/config/agent.ts:26][E: packages/core/src/v1/config/agent.ts:27][E: packages/core/src/v1/config/agent.ts:30][E: packages/core/src/v1/config/agent.ts:31][E: packages/core/src/v1/config/agent.ts:34][E: packages/core/src/v1/config/agent.ts:37][E: packages/core/src/v1/config/agent.ts:38] |
| `attachment` | `image.auto_resize`, `image.max_width`, `image.max_height`, `image.max_base64_bytes` | [E: packages/core/src/v1/config/attachment.ts:6][E: packages/core/src/v1/config/attachment.ts:7][E: packages/core/src/v1/config/attachment.ts:10][E: packages/core/src/v1/config/attachment.ts:13][E: packages/core/src/v1/config/attachment.ts:16][E: packages/core/src/v1/config/attachment.ts:23] |
| `command.<name>` | command `template`, `description`, `agent`, `model`, `variant`, and `subtask` fields | [E: packages/core/src/v1/config/command.ts:6][E: packages/core/src/v1/config/command.ts:7][E: packages/core/src/v1/config/command.ts:8][E: packages/core/src/v1/config/command.ts:9][E: packages/core/src/v1/config/command.ts:10][E: packages/core/src/v1/config/command.ts:11] |
| `formatter` | formatter `disabled`, `command`, `environment`, `extensions` fields | [E: packages/core/src/v1/config/formatter.ts:6][E: packages/core/src/v1/config/formatter.ts:7][E: packages/core/src/v1/config/formatter.ts:8][E: packages/core/src/v1/config/formatter.ts:9] |
| `lsp` | language-server command/env/extensions/initialization fields plus built-in server IDs | [E: packages/core/src/v1/config/lsp.ts:12][E: packages/core/src/v1/config/lsp.ts:13][E: packages/core/src/v1/config/lsp.ts:14][E: packages/core/src/v1/config/lsp.ts:15][E: packages/core/src/v1/config/lsp.ts:16][E: packages/core/src/v1/config/lsp.ts:22] |
| `mcp` | local, OAuth, and remote server shapes | [E: packages/core/src/v1/config/mcp.ts:6][E: packages/core/src/v1/config/mcp.ts:26][E: packages/core/src/v1/config/mcp.ts:44] |
| `permission` | `read/edit/glob/grep/list/bash/task/external_directory/todowrite/question/webfetch/websearch/lsp/doom_loop/skill` plus unknown string keys | [E: packages/core/src/v1/config/permission.ts:19][E: packages/core/src/v1/config/permission.ts:20][E: packages/core/src/v1/config/permission.ts:21][E: packages/core/src/v1/config/permission.ts:22][E: packages/core/src/v1/config/permission.ts:23][E: packages/core/src/v1/config/permission.ts:24][E: packages/core/src/v1/config/permission.ts:25][E: packages/core/src/v1/config/permission.ts:26][E: packages/core/src/v1/config/permission.ts:27][E: packages/core/src/v1/config/permission.ts:28][E: packages/core/src/v1/config/permission.ts:29][E: packages/core/src/v1/config/permission.ts:30][E: packages/core/src/v1/config/permission.ts:31][E: packages/core/src/v1/config/permission.ts:32][E: packages/core/src/v1/config/permission.ts:33][E: packages/core/src/v1/config/permission.ts:35] |
| `plugin` | string package or tuple with options | [E: packages/core/src/v1/config/plugin.ts:5][E: packages/core/src/v1/config/plugin.ts:8] |
| `provider.<id>` | `api`, `name`, `env`, `id`, `npm`, `whitelist`, `blacklist`, `options`, `models` | [E: packages/core/src/v1/config/provider.ts:77][E: packages/core/src/v1/config/provider.ts:78][E: packages/core/src/v1/config/provider.ts:79][E: packages/core/src/v1/config/provider.ts:80][E: packages/core/src/v1/config/provider.ts:81][E: packages/core/src/v1/config/provider.ts:82][E: packages/core/src/v1/config/provider.ts:83][E: packages/core/src/v1/config/provider.ts:84][E: packages/core/src/v1/config/provider.ts:119] |
| `provider.<id>.models.<model>` | `id`, `name`, `family`, `release_date`, `attachment`, `reasoning`, `temperature`, `tool_call`, `interleaved`, `cost`, `limit`, `modalities`, `experimental`, `status`, `provider`, `options`, `headers`, `variants` | [E: packages/core/src/v1/config/provider.ts:9][E: packages/core/src/v1/config/provider.ts:10][E: packages/core/src/v1/config/provider.ts:11][E: packages/core/src/v1/config/provider.ts:12][E: packages/core/src/v1/config/provider.ts:13][E: packages/core/src/v1/config/provider.ts:14][E: packages/core/src/v1/config/provider.ts:15][E: packages/core/src/v1/config/provider.ts:16][E: packages/core/src/v1/config/provider.ts:17][E: packages/core/src/v1/config/provider.ts:25][E: packages/core/src/v1/config/provider.ts:41][E: packages/core/src/v1/config/provider.ts:48][E: packages/core/src/v1/config/provider.ts:56][E: packages/core/src/v1/config/provider.ts:57][E: packages/core/src/v1/config/provider.ts:58][E: packages/core/src/v1/config/provider.ts:61][E: packages/core/src/v1/config/provider.ts:62][E: packages/core/src/v1/config/provider.ts:63] |
| `server` | `port`, `hostname`, `mdns`, `mdnsDomain`, `cors` | [E: packages/core/src/v1/config/server.ts:6][E: packages/core/src/v1/config/server.ts:7][E: packages/core/src/v1/config/server.ts:10][E: packages/core/src/v1/config/server.ts:11][E: packages/core/src/v1/config/server.ts:12][E: packages/core/src/v1/config/server.ts:15] |
| `skills` | `paths` and `urls` arrays | [E: packages/core/src/v1/config/skills.ts:5][E: packages/core/src/v1/config/skills.ts:6][E: packages/core/src/v1/config/skills.ts:9] |

## V2

V2 schema 的主入口是 `Config.Info` class，而不是 V1 `Schema.Struct` export。[E: packages/core/src/config.ts:29] V2 loader 会在读取文件时保留原始属性顺序，并在发现 V1 shape 时先调用迁移函数。[E: packages/core/src/config.ts:143][E: packages/core/src/config.ts:156][E: packages/core/src/config.ts:157]

### V2 top-level keys

| Key | Type/shape | V1 relation | Evidence |
|---|---|---|---|
| `$schema` | string | same | [E: packages/core/src/config.ts:30] |
| `shell` | string | same | [E: packages/core/src/config.ts:33] |
| `model` | string | same | [E: packages/core/src/config.ts:36] |
| `default_agent` | string | same | [E: packages/core/src/config.ts:39] |
| `autoupdate` | boolean or `notify` | same | [E: packages/core/src/config.ts:42] |
| `share` | `manual|auto|disabled` | same, V1 `autoshare` migrates here | [E: packages/core/src/config.ts:47][E: packages/core/src/v1/config/migrate.ts:42] |
| `enterprise.url` | string | same | [E: packages/core/src/config.ts:51] |
| `username` | string | same | [E: packages/core/src/config.ts:57] |
| `permissions` | V2 permission ruleset | from V1 `permission/tools` | [E: packages/core/src/config.ts:60][E: packages/core/src/v1/config/migrate.ts:45] |
| `agents` | record of V2 agent config | from V1 `agent/mode` | [E: packages/core/src/config.ts:63][E: packages/core/src/v1/config/migrate.ts:46] |
| `snapshots` | boolean | from V1 `snapshot` | [E: packages/core/src/config.ts:66][E: packages/core/src/v1/config/migrate.ts:47] |
| `watcher` | watcher config | same concept | [E: packages/core/src/config.ts:69] |
| `formatter` | formatter config | same concept | [E: packages/core/src/config.ts:72] |
| `lsp` | LSP config | same concept | [E: packages/core/src/config.ts:75] |
| `attachments` | attachment config | from V1 `attachment` | [E: packages/core/src/config.ts:78][E: packages/core/src/v1/config/migrate.ts:51] |
| `tool_output` | tool output thresholds | same concept | [E: packages/core/src/config.ts:81] |
| `mcp` | V2 MCP object with global `timeout` and named `servers` | from V1 `mcp` map plus `experimental.mcp_timeout` | [E: packages/core/src/config.ts:84][E: packages/core/src/config/mcp.ts:46][E: packages/core/src/config/mcp.ts:47][E: packages/core/src/v1/config/migrate.ts:127][E: packages/core/src/v1/config/migrate.ts:135] |
| `compaction` | compaction config | reshaped from V1 | [E: packages/core/src/config.ts:87][E: packages/core/src/v1/config/migrate.ts:54] |
| `skills` | string array | from V1 `skills.paths + skills.urls` | [E: packages/core/src/config.ts:90][E: packages/core/src/v1/config/migrate.ts:62] |
| `commands` | command record | from V1 `command` | [E: packages/core/src/config.ts:93][E: packages/core/src/v1/config/migrate.ts:63] |
| `instructions` | string array | same | [E: packages/core/src/config.ts:96] |
| `references` | named local/git references | from V1 `references` or deprecated `reference` | [E: packages/core/src/config.ts:99][E: packages/core/src/v1/config/migrate.ts:65] |
| `plugins` | plugin list | from V1 `plugin` | [E: packages/core/src/config.ts:102][E: packages/core/src/v1/config/migrate.ts:66] |
| `experimental` | V2 experimental object | currently carries migrated policies | [E: packages/core/src/config.ts:105][E: packages/core/src/v1/config/migrate.ts:69] |
| `providers` | provider config map | from V1 `provider` | [E: packages/core/src/config.ts:106][E: packages/core/src/v1/config/migrate.ts:70] |

### V2 nested catalog

| Object | Fields | Evidence |
|---|---|---|
| `agents.<name>` | `model`, `variant`, `request`, `system`, `description`, `mode`, `hidden`, `color`, `steps`, `disabled`, `permissions` | [E: packages/core/src/config/agent.ts:14][E: packages/core/src/config/agent.ts:15][E: packages/core/src/config/agent.ts:16][E: packages/core/src/config/agent.ts:17][E: packages/core/src/config/agent.ts:18][E: packages/core/src/config/agent.ts:19][E: packages/core/src/config/agent.ts:20][E: packages/core/src/config/agent.ts:21][E: packages/core/src/config/agent.ts:22][E: packages/core/src/config/agent.ts:23][E: packages/core/src/config/agent.ts:24] |
| `attachments` | `image.auto_resize`, `image.max_width`, `image.max_height`, `image.max_base64_bytes` | [E: packages/core/src/config/attachments.ts:6][E: packages/core/src/config/attachments.ts:7][E: packages/core/src/config/attachments.ts:8][E: packages/core/src/config/attachments.ts:9][E: packages/core/src/config/attachments.ts:10][E: packages/core/src/config/attachments.ts:14] |
| `commands.<name>` | slash command `template`, `description`, `agent`, `model`, `variant`, and `subtask` fields | [E: packages/core/src/config/command.ts:6][E: packages/core/src/config/command.ts:7][E: packages/core/src/config/command.ts:8][E: packages/core/src/config/command.ts:9][E: packages/core/src/config/command.ts:10][E: packages/core/src/config/command.ts:11] |
| `compaction` | `auto`, `prune`, `keep.tokens`, `buffer` | [E: packages/core/src/config/compaction.ts:11][E: packages/core/src/config/compaction.ts:12][E: packages/core/src/config/compaction.ts:13][E: packages/core/src/config/compaction.ts:7][E: packages/core/src/config/compaction.ts:14] |
| `experimental` | public config field is `policies`; each policy embeds a domain `action` validated by `PolicyAction` | [E: packages/core/src/config/experimental.ts:9][E: packages/core/src/config/experimental.ts:13][E: packages/core/src/config/experimental.ts:17] |
| `formatter` | formatter `disabled`, `command`, `environment`, `extensions` fields | [E: packages/core/src/config/formatter.ts:6][E: packages/core/src/config/formatter.ts:7][E: packages/core/src/config/formatter.ts:8][E: packages/core/src/config/formatter.ts:9] |
| `lsp` | LSP server command/env/extensions/initialization fields | [E: packages/core/src/config/lsp.ts:10][E: packages/core/src/config/lsp.ts:11][E: packages/core/src/config/lsp.ts:12][E: packages/core/src/config/lsp.ts:13][E: packages/core/src/config/lsp.ts:14] |
| `mcp` | global timeout plus named local/remote/OAuth server shapes under `servers` | [E: packages/core/src/config/mcp.ts:6][E: packages/core/src/config/mcp.ts:15][E: packages/core/src/config/mcp.ts:26][E: packages/core/src/config/mcp.ts:34][E: packages/core/src/config/mcp.ts:46][E: packages/core/src/config/mcp.ts:47] |
| `plugins` | string package or object spec with options | [E: packages/core/src/config/plugin.ts:6][E: packages/core/src/config/plugin.ts:7][E: packages/core/src/config/plugin.ts:10] |
| `providers.<id>` | `name`, `env`, `api`, `request`, `models` | [E: packages/core/src/config/provider.ts:65][E: packages/core/src/config/provider.ts:66][E: packages/core/src/config/provider.ts:67][E: packages/core/src/config/provider.ts:68][E: packages/core/src/config/provider.ts:69][E: packages/core/src/config/provider.ts:70] |
| `providers.<id>.models.<model>` | `family`, `name`, `api`, `capabilities`, `request`, `variants`, `cost`, `disabled`, `limit` | [E: packages/core/src/config/provider.ts:48][E: packages/core/src/config/provider.ts:49][E: packages/core/src/config/provider.ts:50][E: packages/core/src/config/provider.ts:51][E: packages/core/src/config/provider.ts:52][E: packages/core/src/config/provider.ts:56][E: packages/core/src/config/provider.ts:60][E: packages/core/src/config/provider.ts:61][E: packages/core/src/config/provider.ts:62] |
| `references` | local directory and git repository reference shapes | [E: packages/core/src/config/reference.ts:5][E: packages/core/src/config/reference.ts:12][E: packages/core/src/config/reference.ts:21] |
| `tool_output` | `max_lines`, `max_bytes` | [E: packages/core/src/config/tool-output.ts:7][E: packages/core/src/config/tool-output.ts:8] |
| `watcher` | `ignore` | [E: packages/core/src/config/watcher.ts:6] |

## Migration ledger

| V1 key/input | V2 output | Rule |
|---|---|---|
| `permission.<action>` | `permissions[]` | String rules become `{ action, resource: "*", effect }`; object rules become one rule per resource.[E: packages/core/src/v1/config/migrate.ts:85][E: packages/core/src/v1/config/migrate.ts:88] |
| `tools.write` / `tools.patch` | `permissions[].action = "edit"` | Migration normalizes `write` and `patch` to `edit`.[E: packages/core/src/v1/config/migrate.ts:94] |
| `mode.<name>` | `agents.<name>.mode = "primary"` | Deprecated modes are merged into agents as primary agents.[E: packages/core/src/v1/config/migrate.ts:100] |
| `agent.<name>.temperature/top_p/options` | `agents.<name>.request.body` | Request body is assembled from options plus temperature/top_p.[E: packages/core/src/v1/config/migrate.ts:107][E: packages/core/src/v1/config/migrate.ts:108][E: packages/core/src/v1/config/migrate.ts:109][E: packages/core/src/v1/config/migrate.ts:110][E: packages/core/src/v1/config/migrate.ts:115] |
| `agent.<name>.prompt` | `agents.<name>.system` | Prompt text becomes V2 system prompt.[E: packages/core/src/v1/config/migrate.ts:116] |
| `agent.<name>.disable` | `agents.<name>.disabled` | Field rename.[E: packages/core/src/v1/config/migrate.ts:122] |
| `attachment` | `attachments` | Field rename.[E: packages/core/src/v1/config/migrate.ts:51] |
| `snapshot` | `snapshots` | Field rename.[E: packages/core/src/v1/config/migrate.ts:47] |
| `plugin` | `plugins` | String plugins stay strings; tuple plugins become `{ package, options }`.[E: packages/core/src/v1/config/migrate.ts:66][E: packages/core/src/v1/config/migrate.ts:67] |
| `skills.paths + skills.urls` | `skills` | Both arrays are concatenated.[E: packages/core/src/v1/config/migrate.ts:62] |
| `reference` | `references` | Deprecated singular falls back if plural missing.[E: packages/core/src/v1/config/migrate.ts:65] |

## 设计动机与坑位

- V2 config key names are mostly pluralized for collections: `agents`、`attachments`、`commands`、`plugins`、`providers`、`snapshots`。[E: packages/core/src/config.ts:63][E: packages/core/src/config.ts:78][E: packages/core/src/config.ts:93][E: packages/core/src/config.ts:102][E: packages/core/src/config.ts:106][E: packages/core/src/config.ts:66][I]
- `command` 在 V1 是 singular top-level key，但 V2 schema 当前使用 `commands`；任何只按 `command` 写入 V2 config 的 agent 都会丢失 V2 schema 对齐。[E: packages/core/src/v1/config/config.ts:41][E: packages/core/src/config.ts:93]
- `permission` 是 V1 key，`permissions` 是 V2 key；不要把 V1 `tools` boolean gating 当成 V2 tool registry，迁移代码只把它转成 permission rule。[E: packages/core/src/v1/config/config.ts:126][E: packages/core/src/v1/config/migrate.ts:77][E: packages/core/src/v1/config/migrate.ts:78][E: packages/core/src/v1/config/migrate.ts:80][E: packages/core/src/v1/config/migrate.ts:94]

## Sources

- `packages/core/src/v1/config/config.ts`
- `packages/core/src/v1/config/agent.ts`
- `packages/core/src/v1/config/provider.ts`
- `packages/core/src/v1/config/mcp.ts`
- `packages/core/src/v1/config/lsp.ts`
- `packages/core/src/v1/config/permission.ts`
- `packages/core/src/config.ts`
- `packages/core/src/config/`
- `packages/core/src/v1/config/migrate.ts`

## 相关

- `config.v1-core`
- `config.v1-providers-mcp-lsp`
- `config.v2-schema`
- `config.migration`
- `ref.permission-actions`
