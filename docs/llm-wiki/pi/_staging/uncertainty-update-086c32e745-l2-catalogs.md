# L2 verifier — 086c32e745 catalogs / new nodes

Verifier HEAD: `086c32e745`. Did not touch `index.json` / `llms.txt` / `tools/*`.

## Special checks

- runtime `builtinProviders()` is **40**, not 39 (Radius has no static `MODELS` bucket; generated `MODELS` has 39 keys).
- stdout `message_update` is delta-only: `toJsonEvent()` drops cumulative `message` and `assistantMessageEvent.partial`.
- Mistral wire is native `POST {baseUrl}/v1/chat/completions` SSE; no Mistral SDK client.
- protocol `list` / `ServerSnapshot.sessions` use `SessionMetadata`, not list summaries.
- `tui.altScreen.search*` defaults match `packages/tui/src/keybindings.ts` (`ctrl+shift+f`, `enter`/`ctrl+g`, `shift+enter`/`ctrl+shift+g`, `escape`).
- sqlite one-file-per-session: **N/A** for this 12-node set (no sqlite claims).

## L2 corrections (false or comment-line `[E]`)

- `ref.coding-agent.config-keys`: `deepMergeSettings` citation landed on the doc comment (`settings-manager.ts:165`); retargeted to the recursive assign. `images.autoResize` had `settings.md:182` (`terminal.imageWidthCells`); retargeted to `:184`. Product default `["read","bash","edit","write"]` now cites `agent-session.ts:2602`.
- `ref.coding-agent.env-vars`: `helpers.ts:16` is login abort, not stored-credential resolve; retargeted to `:9`. `providers.md:240` is a bash comment; kept `:237`/`:241`.
- `ref.coding-agent.json-events`: `queue_update` cited `agent-session.ts:599` (`agent_settled` extension emit); replaced with consume-path `:621`.
- `subsys.ai.cloudflare-gateway-binding`: CHANGELOG “inherited” line is `:26`, not `:25`.
- `subsys.tui.latex`: added `:1058` for `\pmod` (was only `\bmod` at `:1055`).

## Remaining `[U]` (not upgraded)

- `subsys.telemetry.contracts`: `AgentHarnessOptions.context` is unused; schema helpers do not prove runtime span emission. `packages/agent/docs/harness.md` §5.8 still disagrees with `HARNESS_TELEMETRY_SCHEMA` sleep parents / `pi.session.write` fields.
- `subsys.ai.cloudflare-gateway-binding`: “pre-authenticated in-account” is module commentary; tests use a fake binding. coding-agent CHANGELOG says inherited, but this checkout has no `createGatewayBindingFetch` wiring.
- `ref.coding-agent.env-vars`: catalog still excludes `packages/server` `PI_SERVER_*` / Radius env and tui-internal debug env. `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` is only in `docs/providers.md`, not an explicit `getProviderEnvValue()` read.
- `ref.coding-agent.config-keys`: no `markdown.latex` Settings key. `terminal.showTerminalProgress` exists in `Settings` but is absent from `docs/settings.md`.
