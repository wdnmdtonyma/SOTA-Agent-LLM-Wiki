---
id: setting.mcp-and-env
title: Settings MCP and environment catalog
kind: setting
tier: T1
source: [utils/settings/types.ts, utils/settings/schemaOutput.ts, utils/settings/constants.ts]
symbols: [SettingsSchema, EnvironmentVariablesSchema, AllowedMcpServerEntrySchema, DeniedMcpServerEntrySchema]
related: [subsys.config-settings]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `setting.mcp-and-env` catalog 汇总 `settings.json` 中 auth helper、environment variables、MCP server policy、remote/channel 与 SSH environment 的配置键。

## 能回答的问题

- `env` 的 value 类型如何被 schema coercion?
- AWS/GCP/API key helper 设置在哪些 key?
- MCP server allowlist/denylist entry 支持哪些 matcher?
- `allowManagedMcpServersOnly` 的 managed settings 语义是什么?
- channel notification、remote default environment 与 SSH configs 如何配置?

## 范围与证据

`EnvironmentVariablesSchema` 是 `z.record(z.string(), z.coerce.string())`,因此 settings env values 会被 coerce 为 string。[E: utils/settings/types.ts:36] `AllowedMcpServerEntrySchema` 与 `DeniedMcpServerEntrySchema` 都要求 `serverName`、`serverCommand`、`serverUrl` 三者恰好一个存在。[E: utils/settings/types.ts:151] [E: utils/settings/types.ts:200] JSON Schema 输出来自 `SettingsSchema`。[E: utils/settings/schemaOutput.ts:6] settings source catalog 列出 user/project/local/flag/policy sources。[E: utils/settings/constants.ts:9] [E: utils/settings/constants.ts:12] [E: utils/settings/constants.ts:15] [E: utils/settings/constants.ts:18] [E: utils/settings/constants.ts:21]

scope 标签: `schema-wide` 表示该 key 是 `SettingsSchema` 接受的顶层 key;`managed/policy intended` 表示 description 明确提到 managed settings 或 enterprise administrators;`feature/env-gated` 表示该 key 由 env 或 feature 条件 spread 进 schema。

| key | 类型 | 默认 | 含义 | scope |
|---|---|---|---|---|
| `apiKeyHelper` | string [E: utils/settings/types.ts:263] | 未设置; `.optional()` [E: utils/settings/types.ts:264] | 输出 authentication values 的 script path。[E: utils/settings/types.ts:265] | schema-wide |
| `awsCredentialExport` | string [E: utils/settings/types.ts:267] | 未设置; `.optional()` [E: utils/settings/types.ts:268] | Export AWS credentials 的 script path。[E: utils/settings/types.ts:269] | schema-wide |
| `awsAuthRefresh` | string [E: utils/settings/types.ts:271] | 未设置; `.optional()` [E: utils/settings/types.ts:272] | Refresh AWS authentication 的 script path。[E: utils/settings/types.ts:273] | schema-wide |
| `gcpAuthRefresh` | string [E: utils/settings/types.ts:275] | 未设置; `.optional()` [E: utils/settings/types.ts:276] | Refresh GCP authentication 的 command。[E: utils/settings/types.ts:278] | schema-wide |
| `xaaIdp` | object `{ issuer, clientId, callbackPort? }` [E: utils/settings/types.ts:287] [E: utils/settings/types.ts:288] [E: utils/settings/types.ts:292] [E: utils/settings/types.ts:295] | 未设置; `.optional()` [E: utils/settings/types.ts:305] | XAA IdP connection; XAA-enabled MCP servers reuse this configuration。[E: utils/settings/types.ts:307] | feature/env-gated by `CLAUDE_CODE_ENABLE_XAA` [E: utils/settings/types.ts:284] |
| `env` | `Record<string,string>` with coercion [E: utils/settings/types.ts:36] | 未设置; `.optional()` [E: utils/settings/types.ts:334] | Environment variables to set for Claude Code sessions。[E: utils/settings/types.ts:335] | schema-wide |
| `otelHeadersHelper` | string [E: utils/settings/types.ts:636] | 未设置; `.optional()` [E: utils/settings/types.ts:637] | 输出 OpenTelemetry headers 的 script path。[E: utils/settings/types.ts:638] | schema-wide |
| `forceLoginMethod` | enum `"claudeai"`/`"console"` [E: utils/settings/types.ts:625] | 未设置; `.optional()` [E: utils/settings/types.ts:626] | Force a specific login method for Claude Pro/Max or Console billing。[E: utils/settings/types.ts:628] | schema-wide |
| `forceLoginOrgUUID` | string [E: utils/settings/types.ts:632] | 未设置; `.optional()` [E: utils/settings/types.ts:633] | OAuth login 使用的 organization UUID。[E: utils/settings/types.ts:634] | schema-wide |
| `enableAllProjectMcpServers` | boolean [E: utils/settings/types.ts:401] | 未设置; `.optional()` [E: utils/settings/types.ts:402] | 自动 approve project 中所有 MCP servers。[E: utils/settings/types.ts:404] | schema-wide |
| `enabledMcpjsonServers` | `string[]` [E: utils/settings/types.ts:408] | 未设置; `.optional()` [E: utils/settings/types.ts:409] | `.mcp.json` 中 approved MCP servers 的列表。[E: utils/settings/types.ts:410] | schema-wide |
| `disabledMcpjsonServers` | `string[]` [E: utils/settings/types.ts:413] | 未设置; `.optional()` [E: utils/settings/types.ts:414] | `.mcp.json` 中 rejected MCP servers 的列表。[E: utils/settings/types.ts:415] | schema-wide |
| `allowedMcpServers` | `AllowedMcpServerEntrySchema[]` [E: utils/settings/types.ts:418] | undefined 时 all servers allowed; empty array 时 no servers allowed [E: utils/settings/types.ts:423] | Enterprise MCP server allowlist,适用于包括 enterprise servers 在内的 all scopes。[E: utils/settings/types.ts:421] [E: utils/settings/types.ts:422] | managed/policy intended |
| `allowedMcpServers[].serverName` | string matching `/^[a-zA-Z0-9_-]+$/` [E: utils/settings/types.ts:119] [E: utils/settings/types.ts:120] [E: utils/settings/types.ts:122] | matcher field optional; entry must choose exactly one matcher [E: utils/settings/types.ts:124] [E: utils/settings/types.ts:151] | 按 MCP server name allow。[E: utils/settings/types.ts:125] | managed/policy intended |
| `allowedMcpServers[].serverCommand` | nonempty `string[]` [E: utils/settings/types.ts:127] [E: utils/settings/types.ts:128] | matcher field optional; entry must choose exactly one matcher [E: utils/settings/types.ts:129] [E: utils/settings/types.ts:151] | 精确匹配 stdio servers 的 `[command, ...args]`。[E: utils/settings/types.ts:131] | managed/policy intended |
| `allowedMcpServers[].serverUrl` | string URL pattern [E: utils/settings/types.ts:134] [E: utils/settings/types.ts:137] | matcher field optional; entry must choose exactly one matcher [E: utils/settings/types.ts:135] [E: utils/settings/types.ts:151] | 用 wildcard URL pattern allow remote MCP servers。[E: utils/settings/types.ts:137] | managed/policy intended |
| `deniedMcpServers` | `DeniedMcpServerEntrySchema[]` [E: utils/settings/types.ts:428] | 未设置; `.optional()` [E: utils/settings/types.ts:429] | Enterprise MCP server denylist; denylist precedence over allowlist。[E: utils/settings/types.ts:431] [E: utils/settings/types.ts:433] | managed/policy intended |
| `deniedMcpServers[].serverName` | string matching `/^[a-zA-Z0-9_-]+$/` [E: utils/settings/types.ts:168] [E: utils/settings/types.ts:169] [E: utils/settings/types.ts:171] | matcher field optional; entry must choose exactly one matcher [E: utils/settings/types.ts:173] [E: utils/settings/types.ts:200] | 按 MCP server name block。[E: utils/settings/types.ts:174] | managed/policy intended |
| `deniedMcpServers[].serverCommand` | nonempty `string[]` [E: utils/settings/types.ts:176] [E: utils/settings/types.ts:177] | matcher field optional; entry must choose exactly one matcher [E: utils/settings/types.ts:178] [E: utils/settings/types.ts:200] | 精确匹配 blocked stdio server command array。[E: utils/settings/types.ts:180] | managed/policy intended |
| `deniedMcpServers[].serverUrl` | string URL pattern [E: utils/settings/types.ts:183] [E: utils/settings/types.ts:186] | matcher field optional; entry must choose exactly one matcher [E: utils/settings/types.ts:184] [E: utils/settings/types.ts:200] | 用 wildcard URL pattern block remote MCP servers。[E: utils/settings/types.ts:186] | managed/policy intended |
| `allowManagedMcpServersOnly` | boolean [E: utils/settings/types.ts:510] | 未设置; `.optional()` [E: utils/settings/types.ts:511] | true 且在 managed settings 中设置时,`allowedMcpServers` 只从 managed settings 读取。[E: utils/settings/types.ts:513] | managed/policy intended |
| `channelsEnabled` | boolean [E: utils/settings/types.ts:897] | default off [E: utils/settings/types.ts:901] | Teams/Enterprise opt-in for channel notifications from MCP servers with `claude/channel` capability。[E: utils/settings/types.ts:900] [E: utils/settings/types.ts:901] | managed/policy intended |
| `allowedChannelPlugins` | array of `{ marketplace, plugin }` [E: utils/settings/types.ts:909] [E: utils/settings/types.ts:911] [E: utils/settings/types.ts:912] | undefined falls back to default allowlist [E: utils/settings/types.ts:919] | Teams/Enterprise allowlist of channel plugins; requires `channelsEnabled: true`。[E: utils/settings/types.ts:917] [E: utils/settings/types.ts:920] | managed/policy intended |
| `pluginConfigs` | record keyed by plugin ID [E: utils/settings/types.ts:755] [E: utils/settings/types.ts:793] | 未设置; `.optional()` [E: utils/settings/types.ts:791] | Per-plugin configuration,including MCP server user configs。[E: utils/settings/types.ts:793] | schema-wide |
| `pluginConfigs.*.mcpServers` | nested record keyed by server name with string/number/boolean/string-array values [E: utils/settings/types.ts:759] [E: utils/settings/types.ts:760] [E: utils/settings/types.ts:763] [E: utils/settings/types.ts:764] [E: utils/settings/types.ts:765] [E: utils/settings/types.ts:766] [E: utils/settings/types.ts:767] | 未设置; `.optional()` [E: utils/settings/types.ts:771] | MCP server user configuration values keyed by server name。[E: utils/settings/types.ts:773] | schema-wide |
| `pluginConfigs.*.options` | record of string/number/boolean/string-array values [E: utils/settings/types.ts:776] [E: utils/settings/types.ts:777] [E: utils/settings/types.ts:779] [E: utils/settings/types.ts:780] [E: utils/settings/types.ts:781] [E: utils/settings/types.ts:782] | 未设置; `.optional()` [E: utils/settings/types.ts:785] | Non-sensitive plugin manifest `userConfig` option values; sensitive values go to secure storage。[E: utils/settings/types.ts:787] | schema-wide |
| `remote` | object [E: utils/settings/types.ts:796] | 未设置; `.optional()` [E: utils/settings/types.ts:802] | Remote session configuration。[E: utils/settings/types.ts:803] | schema-wide |
| `remote.defaultEnvironmentId` | string [E: utils/settings/types.ts:798] | 未设置; `.optional()` [E: utils/settings/types.ts:799] | Remote sessions 使用的 default environment ID。[E: utils/settings/types.ts:800] | schema-wide |
| `sshConfigs` | array of SSH config objects [E: utils/settings/types.ts:1014] [E: utils/settings/types.ts:1015] | 未设置; `.optional()` [E: utils/settings/types.ts:1047] | Remote environments 的 SSH connection configurations。[E: utils/settings/types.ts:1049] | managed/policy intended [E: utils/settings/types.ts:1050] |
| `sshConfigs[].id` | string [E: utils/settings/types.ts:1017] | required within entry [I] | Match configs across settings sources 的 unique identifier。[E: utils/settings/types.ts:1019] | schema-wide |
| `sshConfigs[].name` | string [E: utils/settings/types.ts:1021] | required within entry [I] | SSH connection display name。[E: utils/settings/types.ts:1021] | schema-wide |
| `sshConfigs[].sshHost` | string [E: utils/settings/types.ts:1023] | required within entry [I] | SSH host,格式可为 `user@hostname`、`hostname` 或 `~/.ssh/config` host alias。[E: utils/settings/types.ts:1025] | schema-wide |
| `sshConfigs[].sshPort` | integer number [E: utils/settings/types.ts:1028] [E: utils/settings/types.ts:1029] | default 22 [E: utils/settings/types.ts:1031] | SSH port。[E: utils/settings/types.ts:1031] | schema-wide |
| `sshConfigs[].sshIdentityFile` | string [E: utils/settings/types.ts:1033] | 未设置; `.optional()` [E: utils/settings/types.ts:1034] | SSH private key path。[E: utils/settings/types.ts:1035] | schema-wide |
| `sshConfigs[].startDirectory` | string [E: utils/settings/types.ts:1037] | 未指定时 defaults to remote user home directory [E: utils/settings/types.ts:1042] | Remote host 默认 working directory,支持 tilde expansion,可被 `claude ssh <config> [dir]` 覆盖。[E: utils/settings/types.ts:1040] [E: utils/settings/types.ts:1041] [E: utils/settings/types.ts:1043] | schema-wide |

## Sources

- `utils/settings/types.ts`
- `utils/settings/schemaOutput.ts`
- `utils/settings/constants.ts`

## 相关

- [配置与设置子系统](../../subsystems/config-settings.md)
