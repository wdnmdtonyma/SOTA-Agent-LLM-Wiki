# L2 verifier — ff72faba28 catalogs / events / cache-warming / RPC

Verifier HEAD: `ff72faba28`. Did not touch `index.json` / `llms.txt` / `tools/*` / `reference/uncertainty.md`.

## Special checks

- `ExtensionAPI.on()` from `project_trust` to `input` is **40**. New names exist: `context_with_system`, `cache_warming_decision`, `provider_stream_event`, `agent_before_settle`.
- `turn_end` result is `TurnEndEventResult = BoundaryResult`. `context` handlers see `role !== "system"` only; Pi `restoreSystemMessages()` afterwards.
- cache warming modes are `"off" | "streaming" | "idle"`; `emitCacheWarmingDecision()` last returned `action` wins.
- `builtinProviders()` is **42** (includes `metaProvider()` and `typesafeProvider()`). Radius has static `radius.models.ts` / `RADIUS_MODELS`.
- DeepSeek generator hardcodes `deepseek-flash` + `deepseek-v4-pro` only; no `deepseek-v4-flash-vision-exp` hardcoded row.
- slash `BUILTIN_SLASH_COMMANDS` is **24** including `bug`. RPC `RpcCommand` is **33**. `prompt` has `streamingBehavior?: "steer" | "followUp"`. Disposition: `PromptDisposition = "handled" | "queued" | "started"`; queued input `"handled" | "queued"`.
- `PI_EVAL_RUNS_PER_VARIANT` is **not** a product env-catalog row.

## L2 corrections (false `[E:]` or false catalog membership)

- `ref.coding-agent.extension-events`: `session_compact` `on()` cited `types.ts:1388` (previous overload close); retargeted to `:1389`.
- `surface.extensions.events` / `subsys.coding-agent.extension-runner`: `canContinue` gate is `agent-session.ts:1548`, not `:1547`. `getCurrentSystemMessage()` rebuild is `runner.ts:288`, not `:287`.
- `subsys.coding-agent.cache-warming`: `kind: "cache_warm"` is `cache-warmer.ts:343`, not `session-manager.appendUsage` signature `:1244`.
- `ref.ai.model-catalog`: `input: ["text", "image"]` is `generate-models.ts:2964`, not thinkingLevelMap `:2963`. IMAGE/CLASSIFIER key cites retargeted off aggregator starts `:135`/`:223`.
- `ref.coding-agent.slash-commands`: `/thinking` dispatch `:3089` was `/scoped-models`; `/compact` dispatch `:3175` was `/login`. Persist cites retargeted to `:5004`/`:5027`.
- `ref.coding-agent.config-keys`: `markdown.codeBlockIndent` default is two spaces (`getCodeBlockIndent()` `"  "`), not one. Product `defaultTools` array is `agent-session.ts:3283`.
- `ref.coding-agent.env-vars`: dropped ungrounded `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` (absent from source and `docs/providers.md`). Added missing `PI_RADIUS_GATEWAY` (`core/radius.ts`). Catalog count remains **105**. Many 源/`[E:]` lines that pointed at the wrong env after `typesafe`/`meta` insertion were retargeted.

## Remaining `[U]` (not upgraded)

- `interactive-mode.ts` still handles `/debug`、`/arminsayshi`、`/dementedelves` outside `BUILTIN_SLASH_COMMANDS` (already `[U]` on slash catalog). Not counted in 24.
- `docs/rpc.md` `get_commands` example still uses `location`/`path`; wire is `sourceInfo` (already `[U]` on rpc-methods).
- `emitToolCall()` has no try/catch; whether fail-closed is intentional is still `[U]` on extension-runner.
- TUI LaTeX is not a `Settings` key (already `[U]` on config-keys).
- `packages/server` `PI_SERVER_*` and evals `PI_EVAL_RUNS_PER_VARIANT` stay out of the product env catalog.
- `packages/ai/src/providers/all.ts` still has a stale comment that Radius has no static catalog; runtime `BuiltinProvider = keyof typeof MODELS` includes `radius`. Wiki follows the type, not the comment.
