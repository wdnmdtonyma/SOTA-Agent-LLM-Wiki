# L2 verification — 4c6fb7cfe8 MCP / Codemode

Independent falsification. Source-only. Did **not** edit wiki nodes.

- target: `4c6fb7cfe8` (`4c6fb7cfe8c538a668726f6f8b3554098c39faee`)
- product: 1.0.1 + Unreleased
- method: extract every `[E: path:line]` (1109), classify L1 (empty/comment/bracket/OOB/missing), then re-read load-bearing source for the five assigned checks and the surrounding claims
- runtime tests: not run (no `pi/node_modules`) `[U]`

## Assigned checks

| Check | Result | Evidence |
|---|---|---|
| `/mcp` not in `BUILTIN_SLASH_COMMANDS` | **PASS** | Array is 24 items `settings`…`quit` (`slash-commands.ts:19-44`). `rg mcp` on that file is empty. `/mcp` is `pi.registerCommand("mcp")` at `extensions/mcp/index.ts:1141`. |
| replaceable builtins `mcp` / `codemode` / `tool-search` | **PASS** | `builtInExtensions`: `codemode` / `tool-search` / `mcp` have `replaceable: true, builtin: true` (`extensions/index.ts:11-13`). `llama.cpp` is `builtin: true` without `replaceable` (`:8`). `omitReplacedExtensions` only drops replaceable when a **non-replaceable** extension already took the same tool/command/flag name (`resource-loader.ts:120-149`). |
| `MAX_OUTPUT_CHARS` 16 Mi | **PASS** | `export const MAX_OUTPUT_CHARS = 16 * 1024 * 1024` (`packages/codemode/src/runtime/prelude-source.ts:36`); re-exported from `packages/codemode/src/index.ts:15`. Separate from coding-agent `DEFAULT_MAX_OUTPUT_TOKENS = 10_000` (`execute.ts:233`) and MCP `DEFAULT_MAX_MESSAGE_BYTES` (also 16 Mi, transport layer). |
| default MCP exposure `codemode` | **PASS** | `getMcpToolExposure` / `exposureOf` use `config.exposure ?? "codemode"` (`mcp-servers.ts:214`, `extensions/mcp/index.ts:132`). Alias `"codemode-deferred"` → `"codemode"` (`mcp-servers.ts:22`, `resolveExposureAliases` `:189`). `pi mcp list` reports `"codemode"` when omitted (`cli.ts:450`). `toToolExposure("codemode")` maps to tool-level `"deferred"` (`tools.ts:45-46`). |
| first prompt does not wait for non-direct MCP | **PASS** | `before_agent_start` → `waitForDirectServers` (`index.ts:1062-1063`). Only `isEnabled && hasDirectTools && server.ready` (`:1040-1045`). `hasDirectTools` is `configuredExposures.has("direct")` (`:140-142`). `startupWaitMs` default `10_000` (`:93`, applied `:294`). Non-direct wait is `tool_call` for scripts/search/resource tools (`:1073-1088`). Test: hanging **codemode** server does not block first prompt (`agent-session-mcp.test.ts:617-626`); hanging **direct** waits up to `startupWaitMs` (`:760-768`). |

## Per-node

| Node | `[E:]` | L1 line hits | Node |
|---|---:|---|---|
| `subsys.mcp.client` | 230 | 230 ok / 0 empty / 0 comment / 0 bracket / 0 OOB / 0 missing | **PASS** |
| `surface.mcp.overview` | 209 | 209 ok | **PASS** (citation nits) |
| `subsys.coding-agent.mcp` | 196 | 196 ok | **PASS** |
| `subsys.codemode.runtime` | 160 | 160 ok | **PASS** |
| `surface.codemode.overview` | 164 | 164 ok | **PASS** (citation nits) |
| `subsys.coding-agent.codemode` | 150 | 150 ok | **PASS** |

No load-bearing claim in these six nodes was falsified.

## Refutes (none overturn a node)

Load-bearing architecture claims were **not** overturned. These are `[E:]` precision misses: the cited line is real code, but it does not uniquely carry the adjacent clause. L3 may retarget; do not treat as false facts.

1. **`surface.mcp.overview` Identity** (`§1`) cites `extensions/mcp/index.ts:1141` for “默认 `exposure` 为 `codemode`” / `mcp__<server>__<tool>`. `:1141` is `pi.registerCommand("mcp", {`. Default exposure is `mcp-servers.ts:214` / `index.ts:132` (cited later on the same page). Tool naming is `tools.ts:93` (also cited on that sentence). `:1141` is the correct hit for `/mcp` in `§2`.
2. **`subsys.mcp.client` 关键文件** cites `auth-provider.ts:13` for `AuthProvider` / `McpFetch`. `:13` is `export interface AuthProvider {`; `McpFetch` is `:1`.
3. **`surface.codemode.overview` `store()`** cites `execute.ts:407` (`const { set, delete: deleted } = result.storeWrites`). The `appendEntry(...)` call is `:409`. Success-gated write is still true (`if (result.ok)` at `:406`). `subsys.coding-agent.codemode` already cites `:409`.
4. **`surface.mcp.overview` resource tools** cites `resources.ts:34-35` for three wire names. `:34`/` :35` are `list_mcp_resources` / `list_mcp_resource_templates`; `read_mcp_resource` is re-exported at `:36`. Ranking `direct > codemode > deferred` is `index.ts:447` (cited).
5. File-overview bullets often pin the **first** symbol’s line and list siblings that live later (e.g. `McpClient` `:153` plus `connect`/`listTools`/`callTool`/`close`; `CallToolResult` `:65` plus `toLlmContent` `:111`). Not false; not unique anchors.

Wording nit (still true for the assigned check): `hasDirectTools` is “configured exposures include `direct`” (server `exposure` **or** any `toolExposure` value), not an inspection of connected tools. A server with `exposure: "direct"` and every tool overridden to `hidden` would still be waited on. Default / `codemode` / `deferred` servers are not waited on.

## Spot-checked facts (hold)

- `McpClient` one-shot `idle` connect; failure `close()` → `closed`; `McpAbortError.name === "AbortError"` (`jsonrpc.ts:77`).
- `LATEST_PROTOCOL_VERSION = "2025-11-25"`; supported adds `2025-06-18` / `2025-03-26` / `2024-11-05`.
- `pi-mcp` runtime dep only `cross-spawn@7.0.6`; `pi-codemode` only `quickjs-wasi@3.6.2`; coding-agent depends on both `^1.0.1`.
- Root build inserts `codemode` then `mcp` after telemetry (`package.json:15`).
- `InMemoryTransport` / pair exported from `./testing`, not root barrel.
- HTTP JSON **array** is receive-side split (`streamable-http.ts:245`); client `send` is one `JsonRpcMessage`.
- `pi mcp` CLI: `add`/`remove`/`list`/`login`/`logout` only; no CLI `reconnect` (`cli.ts:256` default).
- Project override keys only `enabled` / `exposure` / `toolExposure` (`config.ts:74-78`).
- CIMD id is 9-byte sha256 base64url (`oauth.ts:231`) = 12 chars; both node wordings match.
- `codemode` / `tool_search` are `model-only`, `defaultActive: false`; not in `ToolName` (8 filesystem tools).
- `createCodemodeDescription` drops `deferred` (`tool.ts:242`); MCP default maps to that, so default MCP tools are absent from the description.
- Worker: `bun-binary` relative `./src/extensions/codemode/worker.ts` (`config.ts:503`); `unbundled` → `undefined` → `defaultWorkerUrl()`.
- Sandbox default timeout `300_000`; coding-agent overrides with `Infinity` unless `// @options:`.

## Remaining `[U]`

- Upstream vitest for `packages/mcp`, `packages/codemode`, `mcp-extension` / `mcp-command` / `agent-session-mcp` / `agent-session-codemode` not executed here.
- Windows worker paths other than bun-binary (`#10204`) still only have that one regression, as already marked `[U]` on `subsys.coding-agent.codemode`.

## Verdict

**PASS** all six nodes. Assigned checks hold. `[E:]` line numbers are in-file and on code (L1-clean). Citation nits above are retargets, not fact failures. No wiki files changed.
