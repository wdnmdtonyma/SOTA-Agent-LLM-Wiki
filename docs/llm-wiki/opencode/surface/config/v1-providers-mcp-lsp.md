---
id: config.v1-providers-mcp-lsp
title: V1 Providers MCP LSP Config
status: verified
owner: surface-config-cli
v: v1
kind: surface
tier: T1
schema: grouped-catalog
source:
  - packages/core/src/v1/config/config.ts
  - packages/core/src/v1/config/provider.ts
  - packages/core/src/v1/config/mcp.ts
  - packages/core/src/v1/config/lsp.ts
  - packages/core/src/v1/config/formatter.ts
updated: 92c70c9c3
evidence: explicit
---

> `config.v1-providers-mcp-lsp` 描述 V1 provider/model overrides、MCP server config、formatter config 和 LSP config。这些字段仍属于 V1 `ConfigV1.Info`，不是 V2 provider catalog。

## 能回答的问题

- V1 顶层 `provider`、`mcp`、`formatter`、`lsp` 字段如何嵌套。
- provider model override 能写哪些字段。
- MCP local/remote/OAuth 字段如何命名。
- LSP custom server 为什么必须写 `extensions`。

## 顶层 Integrations Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `disabled_providers` | optional string array；schema default omitted | 禁用自动加载的 providers。[E: packages/core/src/v1/config/config.ts:68] | V2 不保留；设计改用 `experimental.policies` 的 provider policy。[E: specs/v2/config.md:174] |
| `enabled_providers` | optional string array；schema default omitted | 只启用这些 providers。[E: packages/core/src/v1/config/config.ts:71] | V2 不保留；设计改用 allow/deny policy statements。[E: specs/v2/config.md:175] |
| `provider` | optional record provider info | custom provider configurations 和 model overrides。[E: packages/core/src/v1/config/config.ts:107] | V2 改名为 `providers`。[E: packages/core/src/config.ts:105] |
| `mcp` | optional record of MCP info or `{ enabled }` | MCP server configurations。[E: packages/core/src/v1/config/config.ts:110] | V2 改成 `mcp.timeout` + `mcp.servers`。[E: packages/core/src/config/mcp.ts:33] |
| `formatter` | optional boolean or record | formatter built-ins/overrides。[E: packages/core/src/v1/config/config.ts:113] | V2 仍保留 singular `formatter`。[E: packages/core/src/config.ts:71] |
| `lsp` | optional boolean or record | LSP built-ins/overrides。[E: packages/core/src/v1/config/config.ts:117] | V2 仍保留 singular `lsp`。[E: packages/core/src/config.ts:74] |

## Provider Catalog

| provider key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `provider.<name>.api` | optional string | provider API URL 或 upstream endpoint。[E: packages/core/src/v1/config/provider.ts:77] | 仅当 V1 `provider.<name>.npm` 存在时迁移为 V2 `providers.<name>.api.url`；没有 `npm` 时 current migration 不保留该字段。[E: packages/core/src/v1/config/migrate.ts:170] |
| `provider.<name>.name` | optional string | display name。[E: packages/core/src/v1/config/provider.ts:78] | V2 `providers.<name>.name`。[E: packages/core/src/config/provider.ts:66] |
| `provider.<name>.env` | optional string array | credential env var names。[E: packages/core/src/v1/config/provider.ts:79] | V2 `providers.<name>.env`。[E: packages/core/src/config/provider.ts:67] |
| `provider.<name>.id` | optional string | provider id override。[E: packages/core/src/v1/config/provider.ts:80] | V2 schema 没有 top-level provider `id`；migration 不输出 provider `id`。[E: packages/core/src/v1/config/migrate.ts:167] |
| `provider.<name>.npm` | optional string | AI SDK provider package name。[E: packages/core/src/v1/config/provider.ts:81] | V2 provider `api` can be AISDK package metadata。[E: packages/core/src/config/provider.ts:68] |
| `provider.<name>.whitelist` | optional string array | provider model allowlist。[E: packages/core/src/v1/config/provider.ts:82] | V2 不保留 whitelist；设计改用 policies 或 explicit configured models。[E: specs/v2/config.md:216] |
| `provider.<name>.blacklist` | optional string array | provider model denylist。[E: packages/core/src/v1/config/provider.ts:83] | V2 不保留 blacklist；设计改用 policies 或 explicit configured models。[E: specs/v2/config.md:216] |
| `provider.<name>.options.apiKey` | optional string | provider API key option。[E: packages/core/src/v1/config/provider.ts:87] | V2 provider `request`/`api.settings` 由 lowerer 输出。[E: packages/core/src/v1/config/migrate.ts:165] |
| `provider.<name>.options.baseURL` | optional string | provider base URL option。[E: packages/core/src/v1/config/provider.ts:88] | V2 provider `api.url` 或 request lowering 输出。[E: packages/core/src/v1/config/migrate.ts:174] |
| `provider.<name>.options.enterpriseUrl` | optional string | GitHub Enterprise URL for copilot auth。[E: packages/core/src/v1/config/provider.ts:89] | V2 通过 lowerer 转入 provider request/settings。[I] |
| `provider.<name>.options.setCacheKey` | optional boolean | enable prompt cache key。[E: packages/core/src/v1/config/provider.ts:92] | V2 通过 request body/options 表达。[I] |
| `provider.<name>.options.timeout` | optional positive int or false | full request timeout。[E: packages/core/src/v1/config/provider.ts:95] | V2 通过 request body/options 表达。[I] |
| `provider.<name>.options.headerTimeout` | optional positive int or false | response header timeout。[E: packages/core/src/v1/config/provider.ts:102] | V2 通过 request body/options 表达。[I] |
| `provider.<name>.options.chunkTimeout` | optional positive int | streamed SSE chunk timeout。[E: packages/core/src/v1/config/provider.ts:111] | V2 通过 request body/options 表达。[I] |
| `provider.<name>.options.<unknown>` | rest record any | provider-specific AI SDK options。[E: packages/core/src/v1/config/provider.ts:116] | V2 `ConfigProvider.Request.body` 是 unknown record。[E: packages/core/src/config/provider.ts:9] |
| `provider.<name>.models` | optional record model | provider-local model overrides。[E: packages/core/src/v1/config/provider.ts:119] | V2 `providers.<name>.models`。[E: packages/core/src/config/provider.ts:70] |

## Provider Model Catalog

| model key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `id` | optional string | upstream model id。[E: packages/core/src/v1/config/provider.ts:9] | V2 nests as model `api.id` when present。[E: packages/core/src/v1/config/migrate.ts:217] |
| `name` | optional string | display name。[E: packages/core/src/v1/config/provider.ts:10] | V2 `models.<name>.name`。[E: packages/core/src/config/provider.ts:49] |
| `family` | optional string | model family metadata。[E: packages/core/src/v1/config/provider.ts:11] | V2 `family`。[E: packages/core/src/config/provider.ts:48] |
| `release_date` | optional string | release metadata。[E: packages/core/src/v1/config/provider.ts:12] | V2 设计不 port `release_date`。[E: specs/v2/config.md:216] |
| `attachment` | optional boolean | legacy model attachment capability flag。[E: packages/core/src/v1/config/provider.ts:13] | V2 capabilities use structured `input`/`output` modalities。[E: packages/core/src/config/provider.ts:51] |
| `reasoning` | optional boolean | legacy reasoning capability flag。[E: packages/core/src/v1/config/provider.ts:14] | V2 设计不 port first-class `reasoning`。[E: specs/v2/config.md:216] |
| `temperature` | optional boolean | whether model supports temperature。[E: packages/core/src/v1/config/provider.ts:15] | V2 设计不 port first-class `temperature`。[E: specs/v2/config.md:216] |
| `tool_call` | optional boolean | tool-call support flag。[E: packages/core/src/v1/config/provider.ts:16] | V2 migration maps into `capabilities.tools`。[E: packages/core/src/v1/config/migrate.ts:210] |
| `interleaved` | optional true or field object | interleaved reasoning field configuration。[E: packages/core/src/v1/config/provider.ts:17] | V2 设计不 port first-class `interleaved`。[E: specs/v2/config.md:216] |
| `cost.input` | finite | input token price。[E: packages/core/src/v1/config/provider.ts:27] | V2 `cost.input`。[E: packages/core/src/config/provider.ts:22] |
| `cost.output` | finite | output token price。[E: packages/core/src/v1/config/provider.ts:28] | V2 `cost.output`。[E: packages/core/src/config/provider.ts:23] |
| `cost.cache_read` | optional finite | cache read price。[E: packages/core/src/v1/config/provider.ts:29] | V2 `cost.cache.read`。[E: packages/core/src/v1/config/migrate.ts:197] |
| `cost.cache_write` | optional finite | cache write price。[E: packages/core/src/v1/config/provider.ts:30] | V2 `cost.cache.write`。[E: packages/core/src/v1/config/migrate.ts:197] |
| `cost.context_over_200k` | optional cost object | >200k context tier price。[E: packages/core/src/v1/config/provider.ts:31] | V2 migration creates tier `{ type: "context", size: 200000 }`。[E: packages/core/src/v1/config/migrate.ts:202] |
| `limit.context` | finite | context window.[E: packages/core/src/v1/config/provider.ts:43] | V2 `limit.context` int optional。[E: packages/core/src/config/provider.ts:28] |
| `limit.input` | optional finite | input limit。[E: packages/core/src/v1/config/provider.ts:44] | V2 `limit.input` int optional。[E: packages/core/src/config/provider.ts:29] |
| `limit.output` | finite | output limit。[E: packages/core/src/v1/config/provider.ts:45] | V2 `limit.output` int optional。[E: packages/core/src/config/provider.ts:30] |
| `modalities.input` | optional array of text/audio/image/video/pdf | input modalities。[E: packages/core/src/v1/config/provider.ts:50] | V2 migration maps to `capabilities.input`。[E: packages/core/src/v1/config/migrate.ts:212] |
| `modalities.output` | optional array of text/audio/image/video/pdf | output modalities。[E: packages/core/src/v1/config/provider.ts:51] | V2 migration maps to `capabilities.output`。[E: packages/core/src/v1/config/migrate.ts:212] |
| `experimental` | optional boolean | legacy experimental marker。[E: packages/core/src/v1/config/provider.ts:56] | V2 设计不 port model `experimental`。[E: specs/v2/config.md:216] |
| `status` | optional `alpha`/`beta`/`deprecated`/`active` | model status。[E: packages/core/src/v1/config/provider.ts:57] | V2 migration only maps `deprecated` to `disabled: true`。[E: packages/core/src/v1/config/migrate.ts:240] |
| `provider.npm` | optional string | model-specific provider package override。[E: packages/core/src/v1/config/provider.ts:58] | V2 model `api` can carry AISDK package.[E: packages/core/src/config/provider.ts:33] |
| `provider.api` | optional string | model-specific API URL override。[E: packages/core/src/v1/config/provider.ts:59] | 仅当 model-level `provider.npm` 存在时迁移为 V2 model `api.url`；没有 `provider.npm` 时 non-AISDK branch 只能输出 `{ id }`。[E: packages/core/src/v1/config/migrate.ts:217] |
| `options` | optional record any | model request options。[E: packages/core/src/v1/config/provider.ts:61] | V2 model `request.body` via migration。[E: packages/core/src/v1/config/migrate.ts:229] |
| `headers` | optional record string | model request headers。[E: packages/core/src/v1/config/provider.ts:62] | V2 model `request.headers`。[E: packages/core/src/v1/config/migrate.ts:230] |
| `variants.<id>.disabled` | optional boolean | disable this variant。[E: packages/core/src/v1/config/provider.ts:68] | V2 variants have no first-class disabled flag；current migration may pass the field through inside `variants[].body` because it lowers the whole variant options object。[E: packages/core/src/v1/config/migrate.ts:233] |
| `variants.<id>.<unknown>` | rest record any | variant-specific options。[E: packages/core/src/v1/config/provider.ts:70] | V2 migration lowers variant body。[E: packages/core/src/v1/config/migrate.ts:235] |

## MCP Catalog

| mcp key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `mcp.<name>.type` | `local` or `remote` | MCP server connection kind。[E: packages/core/src/v1/config/mcp.ts:7] | V2 keeps explicit tagged local/remote under `mcp.servers`。[E: packages/core/src/config/mcp.ts:31] |
| `mcp.<name>.command` | string array | local server command/args。[E: packages/core/src/v1/config/mcp.ts:8] | V2 `mcp.servers.<name>.command`。[E: packages/core/src/config/mcp.ts:8] |
| `mcp.<name>.environment` | optional record string | local server env vars。[E: packages/core/src/v1/config/mcp.ts:11] | V2 `environment`。[E: packages/core/src/config/mcp.ts:9] |
| `mcp.<name>.enabled` | optional boolean | enable/disable server on startup。[E: packages/core/src/v1/config/mcp.ts:14] | V2 renamed/inverted to `disabled`; migration writes `!enabled` when present。[E: packages/core/src/v1/config/migrate.ts:140] |
| `mcp.<name>.timeout` | optional positive int；description says default 5000 | request timeout in ms。[E: packages/core/src/v1/config/mcp.ts:17] | V2 keeps per-server timeout and adds top-level `mcp.timeout`。[E: packages/core/src/config/mcp.ts:34] |
| `mcp.<name>.url` | string | remote MCP URL。[E: packages/core/src/v1/config/mcp.ts:43] | V2 `url`。[E: packages/core/src/config/mcp.ts:24] |
| `mcp.<name>.headers` | optional record string | remote headers。[E: packages/core/src/v1/config/mcp.ts:47] | V2 `headers`。[E: packages/core/src/config/mcp.ts:25] |
| `mcp.<name>.oauth` | optional OAuth object or false | OAuth config or opt-out。[E: packages/core/src/v1/config/mcp.ts:50] | V2 keeps object-or-false but snake_cases fields。[E: packages/core/src/config/mcp.ts:26] |
| `oauth.clientId` | optional string | OAuth client ID。[E: packages/core/src/v1/config/mcp.ts:24] | V2 `client_id`。[E: packages/core/src/config/mcp.ts:15] |
| `oauth.clientSecret` | optional string | OAuth client secret。[E: packages/core/src/v1/config/mcp.ts:27] | V2 `client_secret`。[E: packages/core/src/config/mcp.ts:16] |
| `oauth.scope` | optional string | OAuth scopes。[E: packages/core/src/v1/config/mcp.ts:30] | V2 `scope`。[E: packages/core/src/config/mcp.ts:17] |
| `oauth.callbackPort` | optional int 1-65535 | local OAuth callback port。[E: packages/core/src/v1/config/mcp.ts:31] | V2 `callback_port`。[E: packages/core/src/config/mcp.ts:18] |
| `oauth.redirectUri` | optional string | OAuth redirect URI。[E: packages/core/src/v1/config/mcp.ts:35] | V2 `redirect_uri`。[E: packages/core/src/config/mcp.ts:19] |

## Formatter 和 LSP Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `formatter` | boolean or record | false disables, true enables built-ins, object enables overrides。[E: packages/core/src/v1/config/formatter.ts:12] | V2 same shape。[E: packages/core/src/config/formatter.ts:12] |
| `formatter.<name>.disabled` | optional boolean | disable formatter entry。[E: packages/core/src/v1/config/formatter.ts:6] | V2 same field。[E: packages/core/src/config/formatter.ts:6] |
| `formatter.<name>.command` | optional string array | formatter command。[E: packages/core/src/v1/config/formatter.ts:7] | V2 same field。[E: packages/core/src/config/formatter.ts:7] |
| `formatter.<name>.environment` | optional record string | formatter env vars。[E: packages/core/src/v1/config/formatter.ts:8] | V2 same field。[E: packages/core/src/config/formatter.ts:8] |
| `formatter.<name>.extensions` | optional string array | formatter file extensions。[E: packages/core/src/v1/config/formatter.ts:9] | V2 same field。[E: packages/core/src/config/formatter.ts:9] |
| `lsp` | boolean or record | false disables, true enables built-ins, object configures overrides。[E: packages/core/src/v1/config/lsp.ts:76] | V2 same broad shape。[E: packages/core/src/config/lsp.ts:18] |
| `lsp.<id>.disabled` | literal true entry or optional boolean server field | disabled entry or server disable flag。[E: packages/core/src/v1/config/lsp.ts:5] | V2 keeps disabled entry and server field。[E: packages/core/src/config/lsp.ts:5] |
| `lsp.<id>.command` | string array | language server command。[E: packages/core/src/v1/config/lsp.ts:12] | V2 same field。[E: packages/core/src/config/lsp.ts:10] |
| `lsp.<id>.extensions` | optional string array | file extensions for server。[E: packages/core/src/v1/config/lsp.ts:13] | V2 same field。[E: packages/core/src/config/lsp.ts:11] |
| `lsp.<id>.env` | optional record string | language server env vars。[E: packages/core/src/v1/config/lsp.ts:15] | V2 same field。[E: packages/core/src/config/lsp.ts:13] |
| `lsp.<id>.initialization` | optional record unknown | LSP initialization options。[E: packages/core/src/v1/config/lsp.ts:16] | V2 same field。[E: packages/core/src/config/lsp.ts:14] |
| custom LSP `extensions` requirement | validation rule | non-disabled custom servers must declare extensions because runtime cannot infer them；disabled entries are exempt。[E: packages/core/src/v1/config/lsp.ts:63] [E: packages/core/src/v1/config/lsp.ts:68] | V2 aggregate schema currently does not include this validation filter; design note says validation belongs with eventual V2 LSP integration.[E: specs/v2/config.md:123] |

## Sources

- `packages/core/src/v1/config/config.ts`
- `packages/core/src/v1/config/provider.ts`
- `packages/core/src/v1/config/mcp.ts`
- `packages/core/src/v1/config/lsp.ts`
- `packages/core/src/v1/config/formatter.ts`
- `packages/core/src/v1/config/migrate.ts`
- `packages/core/src/config/provider.ts`
- `packages/core/src/config/mcp.ts`
- `packages/core/src/config/lsp.ts`
- `packages/core/src/config/formatter.ts`
- `specs/v2/config.md`

## 相关

- `provider.resolution`
- `mcp.config`
- `lsp.integration`
- `config.migration`
