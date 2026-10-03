# L3 fixer — 4c6fb7cfe8

Independent retarget against `pi/` HEAD `4c6fb7cfe8` (`4c6fb7cfe8c538a668726f6f8b3554098c39faee`). Edited only the five assigned wiki nodes. Did not edit `index.json`. Frontmatter `status: verified`, `updated: 4c6fb7cfe8` unchanged.

After each edit, `read_file` confirmed the new `[E:]` line contains the claimed symbol/fact.

## spine/overview.md

1. **CHANGELOG empty `[Unreleased]` / `[1.0.1]`**
   - old: `packages/coding-agent/CHANGELOG.md:9` ×2 (Nix flake bullet)
   - new: `packages/coding-agent/CHANGELOG.md:3` (`## [Unreleased]`, next heading at :5 so the section is empty) → `packages/coding-agent/CHANGELOG.md:5` (`## [1.0.1] - 2026-10-03`)
   - l2_fixes_hold: **true**

2. **`createAgentSessionRuntime()` / `AgentSessionRuntime` class**
   - old: `packages/coding-agent/src/core/agent-session-runtime.ts:75` (`private rebindSession?`)
   - new: `packages/coding-agent/src/core/agent-session-runtime.ts:74` (`export class AgentSessionRuntime`) plus existing factory `…:420` (`export async function createAgentSessionRuntime`)
   - l2_fixes_hold: **true**

## spine/layered-architecture.md

3. **durable `createSession` export**
   - old: `packages/durable/src/index.ts:97` (`export type { ConversationView }`)
   - new: `packages/durable/src/index.ts:98` (`export { createSession } from "./session/session.ts"`)
   - l2_fixes_hold: **true**

4. **codemode `CodemodeSandbox` export**
   - old: `packages/codemode/src/index.ts:12` (`export { toCodemodeIdentifier }`)
   - new: `packages/codemode/src/index.ts:13` (`export { CodemodeSandbox } from "./runtime/host.ts"`)
   - l2_fixes_hold: **true**

5. **mcp `StdioTransport` / `StreamableHttpTransport` exports**
   - old: `packages/mcp/src/index.ts:57` (close of protocol types) / `:62` (`McpSessionExpiredError`)
   - new: `packages/mcp/src/index.ts:58` (`export { StdioTransport, type StdioTransportOptions }`) / `:63` (`StreamableHttpTransport,`)
   - l2_fixes_hold: **true**

## reference/package-index.md

6. **root `check` pipeline**
   - old: `package.json:21` (`check:browser-smoke`)
   - new: `package.json:20` (`"check": "biome check … && tsc --noEmit && npm run check:browser-smoke"`)
   - l2_fixes_hold: **true**

7. **`pi-tui` `types` field**
   - old claim: `main` / `types` 指向 `dist/index.js` (`packages/tui/package.json:6` + `:53`)
   - new claim: `main` → `dist/index.js` (`:6`); `types` → `./dist/index.d.ts` (`:53`)
   - l2_fixes_hold: **true**

## subsystems/durable/runtime.md

8. **`documentState` membership**
   - old: `DocumentObserver`（`documentState` / `watchDoc`）`types.ts:899` + `:867`
   - new: `documentState` on `Session` (`types.ts:938`); `DocumentObserver` is `watchDoc` (`types.ts:867` interface, `:868` first overload); `Session extends DocumentObserver` still `:899`
   - l2_fixes_hold: **true**

9. **Session methods do not all take `Context`**
   - old: 「Session 方法全部带 Chord `Context`」`types.ts:1` + `:901` (`commit`)
   - new: `commit` `:901` / `close` `:903` / `snapshot` `:909` / `documentState` `:940` take `Context`; `subscribeClose` has none (`:907`); `subscribeCommits` listener receives `Context` (`:905`)
   - l2_fixes_hold: **true**

## subsystems/durable/harness.md

10. **`Harness.open(openNodeSqliteStorage(...))` uniqueness**
    - old: experimental session worker 才打开 (`session-worker.ts:15` / `:784` / `:785`)
    - new: three experimental openers — worker `:784`/`:785`, durable TUI `experimental/durable/runtime.ts:138`/`:139`, vacation `experimental/vacation/runtime.ts:135`/`:136`
    - l2_fixes_hold: **true**

11. **`PI_EXPERIMENTAL=1` coupling**
    - old: cited on worker import/open lines (those lines do not mention the env)
    - new: gate is `areExperimentalFeaturesEnabled()` `packages/coding-agent/src/core/experimental.ts:2` (`process.env.PI_EXPERIMENTAL === "1"`), used by `runExperimentalCommand` `experimental/commands.ts:86` (`pi server`/`pi client` only). Worker open lines no longer carry the env claim.
    - l2_fixes_hold: **true**

12. **100 ms generation partials**
    - old: `README.md:5` + `scheduler.ts:244` (neither contains 100 ms)
    - new: `packages/durable/src/harness/generation.ts:108` (`const PARTIAL_THROTTLE_MS = 100`); `README.md:5` kept for commit-before-show / crash resume; `scheduler.ts:244` kept for running→pending
    - l2_fixes_hold: **true**

13. **`close()` → `join()`**
    - old: `harness.ts:321` (`override close` only)
    - new: `harness.ts:321` close override, `:323` `return super.close(context)`, `:327` `beforeClose()`, `:328` `return this.#tasks.join()`; invocation-bound reject is `binding.check()` `:380`
    - l2_fixes_hold: **true**

14. **`requireEnv()` / missing `HarnessOptions.env`**
    - old: `env/index.ts:174` + `env/node.ts:437`/`:439` + `package.json:21` (ExecutionEnv / NodeExecutionEnv / `./env/node`, not `requireEnv`)
    - new: `harness.ts:226` (`if (build === undefined) return undefined`) + `tools/env.ts:5` (`export function requireEnv`) + `:6` (`api.env === undefined` → `"No execution environment is configured"`); Node binding cites kept
    - l2_fixes_hold: **true**

## Summary

| item | l2_fixes_hold |
|---|---|
| overview CHANGELOG Unreleased/1.0.1 | true |
| overview AgentSessionRuntime class/factory | true |
| layered createSession export | true |
| layered CodemodeSandbox export | true |
| layered StdioTransport / StreamableHttpTransport | true |
| package-index check pipeline | true |
| package-index pi-tui types | true |
| runtime documentState vs DocumentObserver | true |
| runtime Session Context narrowing | true |
| harness Harness.open uniqueness | true |
| harness PI_EXPERIMENTAL gate | true |
| harness 100 ms | true |
| harness close→join | true |
| harness requireEnv | true |

All 14 assigned L2 refutes hold after re-read of source at `4c6fb7cfe8`.
