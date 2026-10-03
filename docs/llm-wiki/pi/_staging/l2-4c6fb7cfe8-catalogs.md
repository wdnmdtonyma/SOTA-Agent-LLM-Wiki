# L2 verifier — 4c6fb7cfe8 catalogs

Independent recount of catalog **COUNTS** plus a 5-row `[E:]` sample per node. Source HEAD: `4c6fb7cfe8` (`4c6fb7cfe8c538a668726f6f8b3554098c39faee`). Did **not** edit catalog nodes, `index.json`, `llms.txt`, or `tools/*`.

Ground-truth symbols as assigned: `builtinProviders()`, `*.models.ts`, `ExtensionAPI.on("…")`, `BUILTIN_SLASH_COMMANDS`, `RpcCommand` `type:` literals, `ToolName` / `allToolNames`, `KnownApi` / `KnownImageApi` / `KnownClassifierApi`, `Settings` keys (feasible). Env / CLI / wire catalogs use each node's stated membership口径 against the same checkout.

## Verdict

| catalog | wiki claim | source recount | result |
|---|---|---|---|
| `ref.ai.provider-catalog` | 42 | `builtinProviders()` return array **42**; `KnownProvider` **42**; `MODELS` type/value **42** | **PASS** |
| `ref.ai.model-catalog` | 42 buckets | `packages/ai/src/providers/*.models.ts` **42**; `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` each **42** keys | **PASS** |
| `ref.coding-agent.extension-events` | 41 | `ExtensionAPI.on(event: "…")` overloads **41** (`project_trust` … `input`, includes `mcp_servers_change`) | **PASS** |
| `ref.coding-agent.config-keys` | 93 | `Settings` top-level **55** + nested leaves **31** (retry.provider object not counted; 3 provider leaves are) + `PackageSource` object **6** + `compat.allowedFallbackModels` **1** = **93** | **PASS** |
| `ref.coding-agent.env-vars` | 110 | wiki table **110** unique names; each sampled name exists in cited source; in-scope `PI_*` not missing; evals/server/session-worker env stay excluded | **PASS** |
| `ref.coding-agent.slash-commands` | 24 | `BUILTIN_SLASH_COMMANDS` **24** (`settings` … `quit`, includes `bug`/`tree`; excludes `/mcp` `/llama`) | **PASS** |
| `ref.coding-agent.rpc-methods` | 33 | `RpcCommand` distinct `type:` literals **33**; `handleCommand` `case` arms **33** | **PASS** |
| `ref.coding-agent.cli-flags` | 62 | `parseArgs`/`printHelp` canonical longs **41** (incl `--`) + subcommand-only **21** = **62** | **PASS** |
| `ref.tools-catalog` | 8 | `ToolName` **8**; `allToolNames` **8**; `createAllToolDefinitions` **8**; coding/read-only presets still omit `powershell` | **PASS** |
| `ref.ai.wire-protocol-catalog` | 10 + 1 + 3 | `KnownApi` **10**; `KnownImageApi` **1**; `KnownClassifierApi` **3** | **PASS** |

No catalog **FAIL** on count. No membership mismatch vs the node's口径.

## Source recounts

### `builtinProviders()` / `*.models.ts` / APIs

`packages/ai/src/providers/all.ts:136-180` returns 42 factory calls, order `#1` `amazonBedrockProvider` … `#42` `zaiCodingCnProvider`. Positions cited by the wiki (`:154` meta, `:169` radius, `:171` typesafe, `:179` zai-coding-cn) match.

42 `*.models.ts` shards under `packages/ai/src/providers/`. `models.generated.ts` `MODELS` type keys `:48-:89`, value keys `:91-:132`; `IMAGE_MODELS` starts `:135`; `CLASSIFIER_MODELS` starts `:223`; last classifier key `zai-coding-cn` type `:265` / value `:308`.

`packages/ai/src/types.ts`:

- `KnownApi` `:17-:27` — 10: `openai-completions`, `mistral-conversations`, `openai-responses`, `azure-openai-responses`, `openai-codex-responses`, `anthropic-messages`, `bedrock-converse-stream`, `google-generative-ai`, `google-vertex`, `pi-messages`
- `KnownImageApi` `:31` — `openrouter-images`
- `KnownClassifierApi` `:35` — `typesafe-system-one` \| `cloudflare-workers-ai-system-one` \| `llama-cpp-classify`
- `KnownProvider` `:39-:81` — 42 (first `amazon-bedrock`, last `xiaomi-token-plan-sgp`; includes `meta`/`radius`/`typesafe`; no llama.cpp)

`defaultModelPerProvider` has **41** keys (no `typesafe`). All 42 provider-catalog default-model cells match the resolver, including NVIDIA `nvidia/nemotron-3-ultra-550b-a55b` and Individual `qwen3.8-max`.

Hardcoded model ids still match `generate-models.ts`: Individual allowlist 9 ids `:322-:331`; excluded `qwen3.8-max-preview` `:313`; DeepSeek `deepseek-flash` + `deepseek-v4-pro` `:3103`/`:3123` (no `deepseek-v4-flash-vision-exp`); Together toggle `deepseek-ai/DeepSeek-V4-Pro-0813` `:201`; Clef/Jev classifier rows `:2715`/`:2744`/`:2756`/`:2766`.

### Events / slash / RPC / tools

`ExtensionAPI.on` 41 names in declaration order: `project_trust`, `resources_discover`, `session_start`, `session_info_changed`, `session_before_switch`, `session_before_fork`, `session_before_compact`, `session_compact`, `session_compact_failed`, `session_shutdown`, **`mcp_servers_change`**, `session_before_tree`, `session_tree`, `context`, `context_with_system`, `cache_warming_decision`, `before_provider_request`, `before_provider_headers`, `after_provider_response`, `provider_stream_event`, `before_agent_start`, `agent_start`, `agent_end`, `agent_before_settle`, `agent_settled`, `ui_prompt_start`, `ui_prompt_end`, `turn_start`, `turn_end`, `message_start`, `message_update`, `message_end`, `tool_execution_start`, `tool_execution_update`, `tool_execution_end`, `model_select`, `thinking_level_select`, `tool_call`, `tool_result`, `user_bash`, `input`. `mcp_servers_change` is in `ExtensionEvent` (`types.ts:1367`) and **not** a `SessionEvent` member (`:839`).

`BUILTIN_SLASH_COMMANDS` `:19-:43` — 24 names. Interactive dispatch for those 24 still at the cited `/settings` `:3158` … `/quit` `:3293`. `/debug` `:3273`, `/arminsayshi` `:3278`, `/dementedelves` `:3283` remain outside the array.

`RpcCommand` `:20-:74` — 33 types. `rpc-mode.ts` has 33 `case` arms plus `default`. `extension_ui_response` is still intercepted in `handleInputLine` (`:771`), not a `RpcCommand`.

`ToolName` / `allToolNames` `:95-:105` — `read`, `bash`, `powershell`, `edit`, `write`, `grep`, `find`, `ls`. `createCodingToolDefinitions` `:164-:170` is read/bash/edit/write. `createReadOnlyToolDefinitions` `:173-:179` is read/grep/find/ls. `createAllToolDefinitions` `:182-:192` is all eight.

### Settings / env / CLI

`Settings` `:133-:189` — 55 top-level fields (`lastChangelogVersion` … `fullscreenWheelScrollLines`). Nested leaf口径 **31** as the node states (compaction 4, branchSummary 2, retry 4, retry.provider 3, terminal 7, images 2, thinkingBudgets 4, markdown 2, warnings 1, codemode 2). `PackageSource` object 6. `model-config.ts:170` `allowedFallbackModels`. `retry.provider` **object** exists as a 5th `RetrySettings` field and is correctly **not** given its own catalog row.

Env table is 110 unique names. Product `PI_*` in `ai` / `coding-agent` / `tui` that the node claims are present. Correctly **out** of this catalog: `PI_EVAL_*` (`packages/evals`), `PI_SERVER_DIR`/`PI_SERVER_ID` (`experimental/server.ts`), `PI_SESSION_WORKER_*` (`experimental/session-worker.ts`). Host/terminal ambient names (`TMUX`, `COLUMNS`, `WT_SESSION`, …) are also out of口径.

CLI: `parseArgs` known longs **41** including `--`. Subcommand-only (not already global): `--local`, `--self`, `--extensions`, `--all`, `--force`, `--min-expiry`, `--json`, `--credentials`, `--no-refresh`, `--url`, `--env`, `--cwd`, `--header`, `--bearer-token-env-var`, `--oauth-client-id`, `--oauth-client-secret`, `--oauth-callback-port`, `--oauth-client-name`, `--exposure`, `--description`, `--timeout` = **21**. `--models`/`--extension`/`--help`/`--approve`/`--no-approve` counted once.

## Spot-check: 5 `[E:]` per file (table rows)

Each sample is the first `[E:]` on a table row, spread across the file. `ok` = cited path exists, line in range, and the line is the claimed entity (or the start of that overload/object).

### `reference/provider-catalog.md`

| wiki row | cite | source line | |
|---|---|---|---|
| #1 amazon-bedrock | `amazon-bedrock.ts:11` | `const bedrockAuth: ApiKeyAuth = {` | ok |
| #11 github-copilot | `github-copilot.ts:13` | `baseUrl: "https://api.individual.githubcopilot.com"` | ok |
| #22 moonshotai-cn | `moonshotai-cn.ts:10` | `baseUrl: "https://api.moonshot.cn/v1"` | ok |
| #32 radius | `radius.ts:26` | `const baselineModels: Model<"pi-messages">[] =` | ok |
| #42 zai-coding-cn | `zai-coding-cn.ts:10` | `baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4"` | ok |

Extra: factory cites `all.ts:138/:154/:169/:171/:179` and defaults `model-resolver.ts:21/:24/:26/:28/:35` match.

### `reference/model-catalog.md`

| wiki row | cite | source line | |
|---|---|---|---|
| amazon-bedrock bucket | `models.generated.ts:91` | `"amazon-bedrock": AMAZON_BEDROCK_MODELS,` | ok |
| groq bucket | `models.generated.ts:104` | `"groq": GROQ_MODELS,` | ok |
| openrouter bucket | `models.generated.ts:118` | `"openrouter": OPENROUTER_MODELS,` | ok |
| zai bucket | `models.generated.ts:131` | `"zai": ZAI_MODELS,` | ok |
| `typesafe/jev` | `generate-models.ts:2766` | `id: "typesafe/jev"` | ok |

Also ok: Individual `:322-:331`, DeepSeek flash/pro `:3103`/`:3123`, Clef id `:2744`, Clef Flash **id** `:2756` (row also cites `:2754` which is that object's `type: "classifier"`).

### `reference/extension-events.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `project_trust` (meaning col) | `docs/extensions.md:50` | reload + `project_trust` before project extensions | ok |
| `session_shutdown` | `types.ts:801` | `export interface SessionShutdownEvent` | ok |
| `ui_prompt_start` | `types.ts:1003` | `export interface UIPromptStartEvent` | ok |
| `after_provider_response` | `types.ts:894` | `export interface AfterProviderResponseEvent` | ok |
| `input` | `types.ts:1130` | `export interface InputEvent` | ok |

Also ok: `on("project_trust")` `:1556`, `on("mcp_servers_change")` `:1578`, `on("input")` `:1623`, emit/unhandled `runner.ts:458/:753`.

### `reference/config-keys.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `lastChangelogVersion` | `settings-manager.ts:134` | field | ok |
| `trackingId` | `settings-manager.ts:157` | field | ok |
| `httpProxy` | `settings-manager.ts:180` | field | ok |
| `terminal.imageWidthCells` | `settings-manager.ts:59` | field | ok |
| `compat.allowedFallbackModels` | `model-config.ts:170` | `allowedFallbackModels: Type.Optional(` | ok |

Also ok: `DEFAULT_TOOL_NAMES` `:215`, `deviceId` `:158` + test `:114`, `fullscreenWheelScrollLines` `:188`, `CodemodeSettings` `:103`.

### `reference/env-vars.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `ANTHROPIC_AUTH_TOKEN` | `env-api-keys.ts:29` | `ANTHROPIC_AUTH_TOKEN_ENV = "ANTHROPIC_AUTH_TOKEN"` | ok |
| `FIREWORKS_API_KEY` | `env-api-keys.ts:110` | `fireworks: "FIREWORKS_API_KEY"` | ok |
| `XDG_CACHE_HOME` | `huggingface.ts:53` | `env.XDG_CACHE_HOME ? join(...)` | ok |
| `PI_OFFLINE` | `main.ts:107` | `isTruthyEnvFlag` helper (env read is `:576`) | ok as pair |
| `$ENV_VAR` | `resolve-config-value.ts:11` | `ENV_VAR_NAME_RE` | ok |

Also ok: `PI_TUI_ESC_TIMEOUT` `terminal.ts:124`, `PI_RADIUS_GATEWAY` still a product row (excluded `PI_EVAL_*` / `PI_SERVER_*`).

### `reference/slash-commands.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `/settings` | `slash-commands.ts:20` | `name: "settings"` | ok |
| `/import` | `slash-commands.ts:26` | `name: "import"` | ok |
| `/changelog` | `slash-commands.ts:32` | `name: "changelog"` | ok |
| `/logout` | `slash-commands.ts:38` | `name: "logout"` | ok |
| `/quit` | `slash-commands.ts:43` | `name: "quit"` | ok |

Also ok: dispatch `/settings` `:3158`, `/model` `:3168`, `/thinking` `:3174`, `/export` `:3180`, handlers `showSettingsSelector` `:4834`, `handleThinkingCommand` `:5079`, `handleModelCommand` `:5128`, `handleExportCommand` `:6448`.

### `reference/rpc-methods.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `prompt` | `rpc-types.ts:22` | `type: "prompt"` + `streamingBehavior` | ok |
| `cycle_model` | `rpc-types.ts:34` | `type: "cycle_model"` | ok |
| `set_auto_compaction` | `rpc-types.ts:48` | `type: "set_auto_compaction"` | ok |
| `fork` | `rpc-types.ts:62` | `type: "fork"` | ok |
| `get_commands` | `rpc-types.ts:74` | `type: "get_commands"` | ok |

Also ok: `RpcCommandType` `:303`, `case "prompt"` `:394`, unknown `default` `:713`.

### `reference/cli-flags.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `--` | `args.ts:82` | `if (arg === "--")` | ok |
| `--models` | `args.ts:31` | `models?: string[]` | ok |
| `--no-context-files` | `args.ts:47` | `noContextFiles?: boolean` | ok |
| `--env` (mcp add) | `mcp/cli.ts:56` | `--env <KEY=VALUE>` | ok |
| positional `<message>` | `args.ts:256` | `else if (!arg.startsWith("-"))` | ok (non-count row) |

Also ok: `parseArgs` `:71`, `printHelp` `:264`, Options header `:291`, `--version` help `:335`, `main.ts` auth/package/config/mcp short-circuit `:582/:597/:610/:614` then `parseArgs` `:620`.

### `reference/tools-catalog.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `read` factory | `tools/index.ts:121` | `createReadToolDefinition` | ok |
| `edit` factory | `tools/index.ts:127` | `createEditToolDefinition` | ok |
| `ls` factory | `tools/index.ts:135` | `createLsToolDefinition` | ok |
| `createAllToolDefinitions` | `tools/index.ts:182` | function | ok |
| `createAllTools` | `tools/index.ts:213` | function | ok |

Also ok: `ToolName` `:95`, `allToolNames` third `"powershell"` `:99`, `constrainedSampling` `read.ts:80` / `bash.ts:260`, default active `agent-session.ts:3604`.

### `reference/wire-protocol-catalog.md`

| wiki row | cite | source line | |
|---|---|---|---|
| `openai-completions` | `types.ts:18` | `"openai-completions"` | ok |
| `azure-openai-responses` | `types.ts:21` | `"azure-openai-responses"` | ok |
| `google-generative-ai` | `types.ts:25` | `"google-generative-ai"` | ok |
| `openrouter-images` | `types.ts:31` | `KnownImageApi = "openrouter-images"` | ok |
| `KnownClassifierApi` | `types.ts:35` | three classifier keys | ok |

Also ok: `ProviderStreams` `:286-:288`, `lazyApi` `:73/:75`, `piMessagesApi` `pi-messages.lazy.ts:4`, `stream`/`streamSimple` `pi-messages.ts:355/:432`, image/classifier lazy wrappers `:3`.

## Line-accuracy notes (counts still PASS)

These are retarget nits, not membership errors:

1. **`ref.ai.model-catalog`**: prose `ClassifierModel` 强制 `type: "classifier"` cites `types.ts:1153` **and** `:1154`. `:1153` is `type: "classifier"`; `:1154` is `contextWindow: number`. Interface name is `:1152`.
2. **`ref.ai.provider-catalog`**: “IMAGE/CLASSIFIER also 42 keys” cites `models.generated.ts:210` / `:257` / `:300` (interior `radius` / `typesafe` keys). Aggregator starts are `:135` / `:223`. The keys exist; the line numbers are not the object heads.
3. **`ref.coding-agent.env-vars`**: `PI_OFFLINE` leading cite `main.ts:107` is `isTruthyEnvFlag`; the env read is `:576` (also cited).
4. **`ref.ai.model-catalog`**: Clef Flash row leading cite `generate-models.ts:2754` is `type: "classifier"`; the id string is `:2756` (also cited).

No table-row sample landed on a missing file, OOB line, blank line, or wrong identifier.

## Remaining `[U]` (already on the nodes; not upgraded)

- Slash catalog: `/debug` / `/arminsayshi` / `/dementedelves` handled in interactive mode but not in `BUILTIN_SLASH_COMMANDS`.
- Env catalog: `packages/server` / experimental `PI_SERVER_*` / `PI_SESSION_WORKER_*` / evals `PI_EVAL_*` stay out of the product 110.
- `all.ts` still comments that Radius has no static catalog; runtime `BuiltinProvider = keyof typeof MODELS` includes `radius`. Wiki follows the type.

## Summary

All 10 catalogs **PASS** count vs `4c6fb7cfe8`. 50 table-row `[E:]` samples resolved to the claimed source lines. Four retarget nits listed above; none change membership.
