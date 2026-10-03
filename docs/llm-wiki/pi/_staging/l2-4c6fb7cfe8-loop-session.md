# L2 verifier — 4c6fb7cfe8 loop / session / virtual / TUI / classifiers

Independent falsification. Source HEAD `4c6fb7cfe8` (`4c6fb7cfe8c538a668726f6f8b3554098c39faee`). Did **not** edit wiki nodes, `index.json`, `llms.txt`, or `pi/`.

Nodes:

- `docs/llm-wiki/pi/spine/agent-loop.md`
- `docs/llm-wiki/pi/spine/session-state-model.md`
- `docs/llm-wiki/pi/spine/compaction-flow.md`
- `docs/llm-wiki/pi/subsystems/coding-agent/session-manager.md`
- `docs/llm-wiki/pi/subsystems/coding-agent/virtual-models.md`
- `docs/llm-wiki/pi/surface/modes/interactive.md`
- `docs/llm-wiki/pi/subsystems/ai/classifiers.md`

Mechanical `[E:]` scan (lint rule 8/9): **1706** cites, **0** missing files, **0** OOB, **0** blank/comment, **0** pure-bracket. Every cited path exists under `pi/`.

## Verdict

| Node | Result | Special checks | Evidence |
|---|---|---|---|
| `spine.agent-loop` | **PASS** | `finishTurn` current; `shouldStopAfterTurn` absent from `packages/agent/src`; `AgentEvent` **10** variants | nits |
| `spine.session-state-model` | **PASS** | JSONL at first user **or** assistant; `ContextEditEntry` append-only | 2 over-wide `[E:]` |
| `spine.compaction-flow` | **PASS** | product `appendCompaction` / retain-none; durable `CompactionTask` is a separate path | 1 import-block drift |
| `subsys.coding-agent.session-manager` | **PASS** | `_hasConversation()`; `ContextEditEntry`; retain-none `firstKeptEntryId ?? id` | clean on specials |
| `subsys.coding-agent.virtual-models` | **PASS** | `VIRTUAL_MODEL_API = "pi-virtual"`; provider `stream`/`streamSimple` never send virtual | clean on specials |
| `surface.modes.interactive` | **PASS** | `tuiMode` default `"fullscreen"` | several grouped `[E:]` off-by-one / wrong-fn |
| `subsys.ai.classifiers` | **PASS** | `KnownClassifierApi` **3**, includes `llama-cpp-classify` | 1 `/completion` field cite |

No node FAIL. Architecture specials hold. L3 should retarget the evidence misses below; do not rewrite the specials.

## Special checks (attempted falsification)

### `finishTurn`, not `shouldStopAfterTurn` — HOLDS

`packages/agent/src` has **zero** `shouldStopAfterTurn`. Current hooks: `finishTurn` / `prepareRequest` / `prepareNextTurn`.

- `AgentOptions.finishTurn` `packages/agent/src/agent.ts:125`
- `AgentLoopConfig.finishTurn` `packages/agent/src/types.ts:264`
- Normal path: `finishTurn` then `turn_end`, then `decision?.action === "end"` → `agent_end` (`agent-loop.ts:286-291`)
- Hard exit `error`/`aborted`: still calls `finishTurn`, then `turn_end` + `agent_end`, return; decision ignored (`agent-loop.ts:245-255`)
- Removal text: `packages/agent/CHANGELOG.md:30`

Wiki states this as deleted 0.87.0 API with `{ action: "end" }` migration. Not refuted.

### Session file at first user/assistant message — HOLDS

```1166:1169:packages/coding-agent/src/core/session-manager.ts
	private _hasConversation(): boolean {
		return this.fileEntries.some(
			(e) => e.type === "message" && (e.message.role === "user" || e.message.role === "assistant"),
		);
```

`_persist()` returns before `wx` while that is false (`:1175-1176`). Tests: setup-only leaves no file (`file-operations.test.ts:447-452`); first user message creates the file (`:456-462`). Changelog #10000 product sentence is “first user message” (`coding-agent/CHANGELOG.md:207`); wiki gotcha correctly notes assistant-only also flushes.

### `ContextEditEntry` — HOLDS

`type: "context_edit"`, `targetId`, `replacement: { content } | null` (`session-manager.ts:175-179`). `appendContextEdit` does not rewrite the target JSONL row. `projectContextEntry`: `replacement === null` → `[]` (`:523`). `buildSessionProjection` last edit per `targetId` wins (`:551-553`).

### `VIRTUAL_MODEL_API` `pi-virtual` never streamed — HOLDS

`VIRTUAL_MODEL_API = "pi-virtual"` (`virtual-models.ts:29`). `withVirtualModels` binds both `stream` and `streamSimple` to `unroutedStream` when `isVirtualModel(model)` (`:233-236`), which throws `must be routed before streaming` (`:190-192`). `ModelRuntime.stream()` has no virtual branch (`model-runtime.ts:691-704`). `streamSimple` routes with `reason: "direct"` then recurses on the **physical** model (`:717-733`). Agent-loop `prepareRequest` replaces only that request’s model (`agent-session.ts:786-814`); `agent.state.model` stays the virtual selection.

### `tuiMode` default fullscreen — HOLDS

```184:184:packages/coding-agent/src/core/settings-manager.ts
	tuiMode?: TuiMode; // default: "fullscreen"
```

```1348:1349:packages/coding-agent/src/core/settings-manager.ts
	getTuiMode(): TuiMode {
		return this.settings.tuiMode === "regular" ? "regular" : "fullscreen";
```

Interactive: `options.tuiMode ?? getTuiMode()` (`interactive-mode.ts:600`). `createInteractiveTui` builds `TuiAltScreen` iff `"fullscreen"` (`tui-renderer.ts:24-47`). CLI help: `fullscreen (default)` (`args.ts:329`).

### `KnownClassifierApi` 3 including `llama-cpp-classify` — HOLDS

```35:35:packages/ai/src/types.ts
export type KnownClassifierApi = "typesafe-system-one" | "cloudflare-workers-ai-system-one" | "llama-cpp-classify";
```

Third path: `llama-cpp-classify.ts:425-436` does **not** call `classifySystemOne`. llama.cpp is not a `builtinProviders()` shard (`models.generated.ts` has no `llama.cpp`).

### `AgentEvent` 10 variants — HOLDS

`packages/agent/src/types.ts:514-529`: `agent_start`, `agent_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`. No harness arm.

## Per-node notes

### `spine.agent-loop` — PASS

Load-bearing loop walk matches `runLoop`: first assistant skips `prepareNextTurn`; every request including the first hits `prepareRequest`; `thinkingLevel` stamped via `Object.assign(..., { thinkingLevel: config.reasoning ?? "off" })` (`agent-loop.ts:409`); sequential-vs-parallel dispatch (`:516-522`); terminate only if every finalized result has `terminate === true` (`:689-690`). `pi-agent-core` 1.0.1 (`package.json:3`); barrel is `agent.ts` / `agent-loop.ts` / `proxy.ts` / `setDefaultStreamFn` / `types.ts` (`index.ts:1-5`); no `./harness/*` export.

**Refutes (evidence only):**

- `CHANGELOG.md:37` is `finishTurn: async (turn, signal) => {`. The migration early-return and `{ action: "end" }` are `:39-40`.

### `spine.session-state-model` — PASS

Three-layer split is right: product `SessionManager` v3 JSONL, durable `createSession`/`Storage`/`Harness`, in-memory `AgentState.messages`. `createSession()` does not seed `ROOT_CONVERSATION_ID` (`session.ts:49-51`); `Tx.createRootConversation()` writes id `1` (`transaction.ts:285-286`). `ContextEdit` (`omit`/`replace`) ≠ product `ContextEditEntry`. Experimental TUI is `Harness.open(openNodeSqliteStorage(...))` (`experimental/durable/runtime.ts:138-150`), not the default CLI path. `coding-agent` runtime deps include `pi-agent-core` + `pi-ai` and not `pi-durable` (`package.json:51-52`).

**Refutes (evidence only):**

- “只有 committed state 可观察” is the `SessionImpl` comment at `packages/durable/src/session/session.ts:56`, **not** `types.ts:899` / `:901` (those are the `Session` interface / `commit` signature).
- “generation 走 `models.streamSimple()`” is `packages/durable/src/harness/generation.ts:399`. Cited `package.json:102-103` is `"dependencies"` / `chord` only; `pi-ai` is `:104`. Claim is true; `[E:]` does not show `streamSimple`.
- “`pi-agent-core` 只依赖 `pi-ai`” (`package.json:26`): also `typebox` at `:27`. True among Pi packages.

### `spine.compaction-flow` — PASS

Product path is coding-agent `shouldCompact` / `prepareCompaction` / `compact` / `appendCompaction`. Threshold: `contextTokens > contextWindow - reserveTokens` (`compaction.ts:267-269`). `tokensBefore` is `estimateProjectedContextTokens(...).tokens` (`:897`), not raw entry count. Summary LLM is `generateSummaryWithUsage`, not the deleted harness `generateSummaryWithRequest`. Durable `CompactionTask` name `"pi.compaction"` with `select`/`summarize`/`retry` (`durable/src/harness/compaction.ts:102-106`) does not call coding-agent `compact()`. Retain-none: `firstKeptEntryId ?? id` (`session-manager.ts:1278`). Mid-run compact is `_compactBeforeNextAssistantResponse` inside `prepareNextTurnWithContext` (`agent-session.ts:876-877`); virtual selection skipped until `prepareRequest` routes (`:752`, `:810`).

**Refutes (evidence only):**

- Import list cites `agent-session.ts:70,72,76,77,78`. Actual block:

```70:78:packages/coding-agent/src/core/agent-session.ts
	calculateContextTokens,
	collectEntriesForBranchSummary,
	compact,
	estimateContextTokens,
	estimateProjectedContextTokens,
	estimateTokens,
	generateBranchSummary,
	prepareCompaction,
	shouldCompact,
```

`:70` is `calculateContextTokens`, not a named import in the wiki sentence. `estimateProjectedContextTokens` is `:74` (uncited).

- `getMessagesFromProjectedEntryForCompaction` compaction early-return is `:99`; wiki cites `:98` (fn) and `:101` (drop system). Claim true.

### `subsys.coding-agent.session-manager` — PASS

Canonical product store. Delayed `wx` until `_hasConversation()`. `ContextEditEntry` + projection omit/replace. `forkFrom()` writes immediately with `"wx"` (`:1856`); `create()` / `createBranchedSession()` reuse the delay (`:1719`). `sessionEntryToContextMessages` fallthrough `[]` at `:465` covers `custom` / `usage` / `context_edit` / label / session_info. `assertSessionCwdExists` only throws when a session file is set and cwd is non-empty and missing (`session-cwd.ts:18-26,54-57`).

No special-check refute. Field-block `[E:]` samples `987,988,993,994,998` (class / `sessionId` / `flushed` / `fileEntries` / `leafId`) rather than every listed field; sentences still match the class body.

### `subsys.coding-agent.virtual-models` — PASS

Catalog sentinel `api: "pi-virtual"` is not in `KnownApi` (10 chat APIs at `packages/ai/src/types.ts:17-27`). `withVirtualModels` hides same-id physical **chat** models (`virtual-models.ts:218`). `resolveModel` requires a credentialed physical target (`model-runtime.ts:1020-1023`). Public barrel exports `VIRTUAL_MODEL_STATE_ENTRY` / `VirtualModelDefinition` / `ModelRoute*` and not `VIRTUAL_MODEL_API` (`index.ts:398-404`).

No special-check refute.

### `surface.modes.interactive` — PASS

Default fullscreen and `"header"` quiet-startup behavior match source (`shouldShowStartupHeader` is true unless `getQuietStartup() === true`; `"header"` hides details). `IdleStatus` only on regular TUI (`:2300-2306`). `createChatViewport` is the fullscreen layout root; `mountInteractiveTui` calls `setLayoutRoot` only when `TuiLayouts.isViewportTUI(tui)` (`:862-867`); regular keeps the linear `addChild` sequence. `/model` and `/thinking` default `persist: false`; save keybindings pass `true`. Radius share does not fall back to gist after a Radius attempt (`session-share.ts:69` + later `return true` on attempt). `navigateTree` throws while `isCompacting` (includes branch summarization) (`agent-session.ts:1575-1579,3922-3924`).

**Refutes (evidence only):**

- `run()` “version check…” cites `:1083` / `:1084` (`setupKeyHandlers` / `setupEditorSubmitHandler` inside `init()`). Actual async checks: `:1147` / `:1154` / `:1169`. `run()` itself is `:1134-1135`.
- `handleEvent()` cites `:3345` (`this.onInputCallback(text)` in submit). Real start is `:3359-3366`.
- `/share` bag includes `:3177` (`handleThinkingCommand`). Share dispatch is `:3190`.
- `setThinkingLevel` persist cites `agent-session.ts:2552` (`cycleModel` return). Persist write is `:2575-2576`.
- `stop()` cites `:4296` (`this.ui.stop()` in `emergencyTerminalExit`). `stop()` is `:7018-7035`.

Prose for those sentences is still true.

### `subsys.ai.classifiers` — PASS

Three APIs, System One `bool`↔`noul`, Cloudflare Jev vs Clef envelopes, llama.cpp next-token readout all match. TypeSafe / OpenRouter / OpenCode / Vercel share `typesafe-system-one` (no extra KnownClassifierApi). `Models.classify()` never rejects; errors become `ClassifierResult` (`models.ts:966-979`). Unqualified `getModel` is chat-only (`:472` vs `getModelOfType`).

**Refutes (evidence only):**

- `/completion` payload claim lists `n_predict: 1`, `post_sampling_probs: false`, `cache_prompt: true` and cites `:371,:372,:373,:375`. Actual:

```371:375:packages/ai/src/api/llama-cpp-classify.ts
			n_predict: 1,
			n_probs: depth,
			post_sampling_probs: false,
			cache_prompt: true,
			temperature: 0,
```

`cache_prompt: true` is `:374`; `:372` is `n_probs`; `:375` is `temperature: 0`. Claim true.

- “42 shards have no `llama.cpp.models.ts`” cites `models.generated.ts:265` (`zai-coding-cn` key) plus `[I]`. Absence of `llama.cpp` is true (grep empty); `:265` is not that fact.

## L3 (do not change specials)

Retarget only the evidence misses above. Do not reintroduce `shouldStopAfterTurn`, harness session JSONL, `ImagesModels`, or `packages/agent/src/harness/**`.

Upstream runtime tests were not executed (no `node_modules` in this checkout).
