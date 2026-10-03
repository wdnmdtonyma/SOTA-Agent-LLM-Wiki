# L2 verification — 4c6fb7cfe8 layered / overview / package-index

Independent falsification. Source of truth: `/Users/makii/Project/SOTA-Agent-LLM-Wiki/pi` at `4c6fb7cfe8`. Wiki nodes were not edited.

Nodes:

- `docs/llm-wiki/pi/spine/overview.md`
- `docs/llm-wiki/pi/spine/layered-architecture.md`
- `docs/llm-wiki/pi/reference/package-index.md`

Method: extract every `[E: path:line]`; open that line; try to refute the adjacent claim. Also re-check the required architecture facts against `packages/*`, root `package.json`, and `packages/agent/src/index.ts`.

Mechanical census: **654** `[E:]` citations (overview 246 / layered 213 / package-index 195). Unique `(path, line)`: 204 / 161 / 175. **0** missing files, **0** out-of-range, **0** empty/comment/pure-bracket landings. Failures below are semantic: the line exists but does not support the claim.

## Required architecture facts

These HOLD against source. They are **not** a reason to PASS the nodes, because several `[E:]` anchors still miss.

| Check | Result | Actual |
|---|---|---|
| 13 first-order `packages/*` | HOLD | `agent`, `ai`, `chord`, `client`, `codemode`, `coding-agent`, `durable`, `evals`, `mcp`, `protocol`, `server`, `telemetry`, `tui` |
| `packages/session-backends` gone | HOLD | directory absent; `rg` over `pi/` finds no `session-backends` / `pi-session-backend` |
| Root `build` order | HOLD | `chord → tui → telemetry → codemode → mcp → ai → durable → agent → protocol → client → server → coding-agent` (`package.json:15`). `evals` not in that script |
| `pi-agent-core` public index | HOLD | only `export *` `agent.ts` / `agent-loop.ts` / `proxy.ts` / `types.ts` plus named `setDefaultStreamFn` (`packages/agent/src/index.ts:1-5`). `exports` are `.` and `./package.json` only |
| Versions 1.0.1 | HOLD | all 13 first-order `package.json` `version` fields are `1.0.1`. Nested `pi-example-plugin` is `1.0.0` as the wiki says. Root monorepo `version` is `0.0.3` |

Also HOLD (used by these nodes, re-checked):

- Workspaces = `packages/*` + five extension examples; no `packages/session-backends/*`
- Public packages lockstep `1.0.1`; `pi-evals` `private: true`; `getPublicWorkspacePackages()` filters `private !== true`
- coding-agent runtime deps: chord / agent-core / ai / **codemode** / **mcp** / tui; **not** `pi-durable`
- agent-core runtime deps: `pi-ai` + `typebox` only
- durable runtime deps: chord + `pi-ai` (no agent-core)
- SQLite lives at durable `./storage/sqlite` + `./storage/sqlite/node` (`openNodeSqliteStorage`)
- Built-in tools still 8; `createCodingToolDefinitions` / `createReadOnlyToolDefinitions` still omit `powershell`
- `CURRENT_SESSION_VERSION = 3`; `PROTOCOL_VERSION = 8`
- `BUILTIN_SLASH_COMMANDS` is 24 including `/bug`; `/mcp` is not in the array
- Default MCP exposure `"codemode"`; `"codemode-deferred"` alias
- `files` excludes `dist/client`, `dist/experimental`, `dist/cli/experimental`

## Verdict per node

| Node | Verdict | Why |
|---|---|---|
| `spine.overview` | **FAIL** | Architecture prose holds. Two load-bearing `[E:]` land on the wrong statement (`CHANGELOG.md:9`, `agent-session-runtime.ts:75`); evals name/version cites do not prove “not in root build”. |
| `spine.layered-architecture` | **FAIL** | Layering / 13-package / harness-in-durable story holds. Four export-table `[E:]` are off-by-one and name the wrong symbol. |
| `ref.package-index` | **FAIL** | Catalog, build order, 12 public packages, source-only `./client` hold. One factual error (`pi-tui` `types` → `dist/index.js`) plus the root `check` pipeline cite. |

L3 should retarget the misses below. Do not rewrite the 13-package / build-order / agent-core-export / session-backends / 1.0.1 story unless a later SHA moves it.

---

## spine.overview — FAIL

### Refutes (claim vs cited line)

1. **Claim:** coding-agent changelog 同时有空的 `[Unreleased]` 与 `[1.0.1]`.
   **Cite:** `[E: packages/coding-agent/CHANGELOG.md:9]` (duplicated twice in the same sentence)
   **Actual L9:** `- **Nix flake** — \`nix run github:earendil-works/pi/stable\` runs the latest release, and \`nix profile add github:earendil-works/pi/stable\` installs it. See [Ins`
   **Expected:** `## [Unreleased]` at **L3** (empty section) and `## [1.0.1] - 2026-10-03` at **L5**.
   **Fact:** true. **Evidence:** wrong line.

2. **Claim:** `createAgentSessionRuntime()` 用 factory 构造 `AgentSessionRuntime`；`switchSession` / `newSession` / `fork` / `importFromJsonl` 经保存的 `createRuntime` 重建 runtime.
   **Cite:** `[E: packages/coding-agent/src/core/agent-session-runtime.ts:75]` (bundled with :196/:226/:262/:359/:420)
   **Actual L75:** `private rebindSession?: (session: AgentSession) => Promise<void>;`
   **Expected:** class at **L74** (`export class AgentSessionRuntime`); factory at **L420** (`export async function createAgentSessionRuntime`). `:196/:226/:262/:359` correctly name the methods; those methods do call `this.createRuntime` (L214/247/301+/393).

3. **Claim:** `evals` 不在根 `build` 脚本里.
   **Cites:** `[E: packages/evals/package.json:2]` `[E: packages/evals/package.json:3]` (alongside the valid `[E: package.json:15]`)
   **Actual L2:** `"name": "@earendil-works/pi-evals",`
   **Actual L3:** `"version": "1.0.1",`
   **Expected:** absence is shown by root `package.json:15` (no `evals` in the `cd` chain). Name/version do not support “not in build”.

### Citation line-number misses (overview)

| Cite | Lands on | Should be |
|---|---|---|
| `packages/coding-agent/CHANGELOG.md:9` ×2 | Nix flake bullet | L3 `[Unreleased]`, L5 `[1.0.1]` |
| `packages/coding-agent/src/core/agent-session-runtime.ts:75` | `rebindSession` field | L74 class or L420 factory |
| `packages/evals/package.json:2` | package name | drop, or keep only as inventory |
| `packages/evals/package.json:3` | version 1.0.1 | drop for the “not in build” clause |
| `packages/coding-agent/src/core/sdk.ts:311` (weak) | `modelRuntime,` argument | `new CacheWarmer(` at L310 |
| `packages/codemode/src/runtime/host.ts:285` in 包边界 for `CodemodeSandbox.execute()` (weak) | class declaration | `execute()` at L339 |

### Overview claims that survived

- README definition + All Packages 7-row table vs 13 workspace dirs
- Workspaces + five extension examples; no session-backends
- Build chain including codemode/mcp; flake `Pi coding agent`; installer `curl … pi.dev/install.sh`; `cleanupManagedInstall()`
- chord 1.0.1, deps only `esbuild`; exports `defineFacet` / `defineService` / `replicatedState` / `createFacetHost`
- codemode / mcp independent packages; `CodemodeSandbox` at `src/index.ts:13`; `McpClient` at `client.ts:153`
- durable exports `createSession` (L98), `Harness` (L38), `defineTool` (L24), `MemoryStorage` (L99), `defineTask` (L100), `ROOT_CONVERSATION_ID` (L181)
- agent-core index 5 lines; changelog 1.0.0 breaking at L11
- `main()` auth/package/config then `args[0]==="mcp"` via `loadMcpCommand`; `resolveAppMode`; `createSessionManager`; runtime factory → `createAgentSessionServices` → `createAgentSessionFromServices`
- `Agent.prompt` → `runPromptMessages` → `runAgentLoop`; `continue` assistant+queue → `runPromptMessages`, else `runContinuation` → `runAgentLoopContinue`
- `runAgentLoop` `streamFn ?? getDefaultStreamFn()`; SDK `setDefaultStreamFn(streamSimple)` from `pi-ai/compat`; product `streamFn` calls `modelRuntime.streamSimple`
- Tool sequential if `toolExecution==="sequential"` or any tool `executionMode==="sequential"`
- Mode dispatch rpc / interactive / print
- 8 tools; coding/read-only presets omit powershell; strict sampling on read/bash/powershell/edit/write (powershell inherits `createShellToolDefinition` L260)
- `./client` source-only re-export; server class `Server`; RPC ≠ remote stack

---

## spine.layered-architecture — FAIL

### Refutes (claim vs cited line)

1. **Claim:** durable 根入口导出 `createSession`（among `Harness` / `MemoryStorage` / `defineTask` / `defineTool` / `createRegistry` / `ROOT_CONVERSATION_ID`).
   **Cite:** `[E: packages/durable/src/index.ts:97]`
   **Actual L97:** `export type { ConversationView } from "./harness/view.ts";`
   **Expected:** `export { createSession } from "./session/session.ts";` at **L98**.
   Other cites in that sentence (`:24` defineTool, `:38` Harness, `:41` createRegistry, `:99` MemoryStorage, `:100` defineTask, `:181` ROOT_CONVERSATION_ID) hold.

2. **Claim:** codemode 公开入口导出 `CodemodeSandbox`.
   **Cite:** `[E: packages/codemode/src/index.ts:12]`
   **Actual L12:** `export { toCodemodeIdentifier } from "./identifier.ts";`
   **Expected:** `export { CodemodeSandbox } from "./runtime/host.ts";` at **L13**.
   `:15` / `:16` correctly name `MAX_OUTPUT_CHARS` / `MAX_OUTPUT_ITEMS`.

3. **Claim:** mcp 根入口导出 `StdioTransport`.
   **Cite:** `[E: packages/mcp/src/index.ts:57]`
   **Actual L57:** `} from "./protocol/types.ts";`
   **Expected:** `export { StdioTransport, type StdioTransportOptions } from "./transports/stdio.ts";` at **L58**.
   `:2` correctly names `McpClient`.

4. **Claim:** mcp 根入口导出 `StreamableHttpTransport`.
   **Cite:** `[E: packages/mcp/src/index.ts:62]`
   **Actual L62:** `McpSessionExpiredError,`
   **Expected:** `StreamableHttpTransport,` at **L63**.

### Citation line-number misses (layered)

| Cite | Lands on | Should be |
|---|---|---|
| `packages/durable/src/index.ts:97` | `ConversationView` type export | L98 `createSession` |
| `packages/codemode/src/index.ts:12` | `toCodemodeIdentifier` | L13 `CodemodeSandbox` |
| `packages/mcp/src/index.ts:57` | close of protocol types export | L58 `StdioTransport` |
| `packages/mcp/src/index.ts:62` | `McpSessionExpiredError` | L63 `StreamableHttpTransport` |

### Layered claims that survived

- 13-dir table, versions 1.0.1, no session-backends, evals private and off the build chain
- chord / tui / telemetry / codemode / mcp have no Pi workspace runtime deps
- `pi-ai` `Models` at `models.ts:244`; telemetry dep at `ai/package.json:72`; agent-core no telemetry
- `Harness.open(storage, options, context)` at `harness.ts:409`; `createSession(storage)` at `session.ts:49`
- `createRegistry()` empty of extensions still holds `BUILTIN_TASKS = [GenerationTask, ToolTask, CompactionTask]` (`registry.ts:10` + L112 factory)
- SQLite facade methods return `Promise`; Node entry `openNodeSqliteStorage`
- agent-core `exports` only `.` + `./package.json`
- coding-agent bin `pi` → `dist/bundle/cli.js`; `cli.ts:6` calls `main()`; experimental `session-worker.ts:15-16` is the only coding-agent import of durable `Harness` / sqlite
- `./client` source-only; protocol / client / server are `devDependencies`
- MCP default exposure `"codemode"`; alias at `mcp-servers.ts:22`
- `AgentSession` owns `Agent` + `SessionManager`; JSONL created on first user/assistant (`_hasConversation`)
- `_buildRuntime` → `createAllToolDefinitions` or override; default active `read/bash/edit/write`; `_refreshToolRegistry` → `_setActiveTools` → `_applyToolLoadout` writes `agent.state.tools`

---

## ref.package-index — FAIL

### Refutes (claim vs cited line)

1. **Claim:** `pi-tui` `package.json` 没有 `exports` map，用 `main` / `types` 指向 `dist/index.js`.
   **Cites:** `[E: packages/tui/package.json:6]` `[E: packages/tui/package.json:53]`
   **Actual L6:** `"main": "dist/index.js",` — supports `main`.
   **Actual L53:** `"types": "./dist/index.d.ts",`
   **Expected for the `types` half:** `./dist/index.d.ts`, **not** `dist/index.js`.
   Absence of `exports` is true (full file has no `exports` key). **This is a factual error**, not only a drift.

2. **Claim:** check pipeline 覆盖 Biome、pinned deps、runtime deps、TypeScript import、entry graphs、install lock、`tsc --noEmit` 与 browser smoke.
   **Cite:** `[E: package.json:21]`
   **Actual L21:** `"check:browser-smoke": "node scripts/check-browser-smoke.mjs",`
   **Expected:** the `check` script at **L20**: `"check": "biome check --write --error-on-warnings . && npm run check:pinned-deps && … && tsc --noEmit && npm run check:browser-smoke"`.
   **Fact:** true. **Evidence:** off-by-one onto the smoke helper.

### Citation line-number misses (package-index)

| Cite | Lands on | Should be |
|---|---|---|
| `package.json:21` | `check:browser-smoke` helper | L20 `check` pipeline |
| `packages/ai/package.json:51` | `"bin": {` | L52 `"pi-ai": "dist/cli.js"` |
| `packages/mcp/package.json:53` | `"dependencies": {` | L54 `"cross-spawn": "7.0.6"` |
| `packages/codemode/package.json:57` | `"dependencies": {` | L58 `"quickjs-wasi": "3.6.2"` |
| `packages/codemode/src/index.ts:13` for four symbols | `CodemodeSandbox` only | also L6 `renderDeclarations`, L25 `parseCodemodeSource`, L41 `loadQuickJSWasm` |
| `scripts/publish.mjs:6` (weak) | import of `getPublicWorkspacePackages` | L8 `const packages = getPublicWorkspacePackages()` |

Extension-example `private: true` cites for anthropic / gitlab-duo / sandbox / gondolin hit L3, which **is** `"private": true` (version is L4). with-deps cites L2/L3/L4 correctly. Not a fail.

### Package-index claims that survived

- 13 dirs; 12 public in `local-release.mjs:10-21` (chord, telemetry, **codemode**, **mcp**, ai, durable, tui, agent, protocol, client, server, coding-agent)
- `findPackageDirectories` recursive under `packages/` + `private !== true`
- Nested private: `install-lock` `@earendil-works/pi-coding-agent-install` 1.0.1; plugin `1.0.0`
- Per-package exports maps (chord `./context|delta|bundler|node`, durable storage subpaths, server `.`/`./testing`/`./unix`, coding-agent source-only `./client` and `./experimental/plugin`)
- Root `engines.node` `>=22.19.0`; `typescript` 7.0.2; root version `0.0.3`
- README short table omits codemode/mcp/protocol/client/server/evals
- Bundle `entryPoints` include `cli-runtime`, `index`, `rpc-entry`

---

## What L3 should change

Minimum retargets (do not expand scope):

1. overview: `CHANGELOG.md:9` → `:3` and `:5`; drop the duplicate; `agent-session-runtime.ts:75` → `:74` or `:420`; drop evals `:2/:3` from the “not in build” sentence (keep `package.json:15`).
2. layered: durable index `:97` → `:98`; codemode index `:12` → `:13`; mcp index `:57` → `:58`; `:62` → `:63`.
3. package-index: `package.json:21` → `:20`; rewrite tui `types` to `./dist/index.d.ts`; optionally slide ai `:51` → `:52`, mcp `:53` → `:54`, codemode `:57` → `:58`.

Do **not** restore `session-backends`, sqlite-node as a package, agent-core harness, or a 12-package inventory. Do **not** put `pi-durable` on the default `pi` CLI path.

## Not executed

- Upstream `node_modules` is not installed; no `npm test` / `test.sh`.
- Did not re-lint wiki nodes (`tools/lint.mjs`).
- Did not verify unrelated wiki nodes.
