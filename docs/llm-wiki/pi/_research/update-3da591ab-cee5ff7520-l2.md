# Pi Wiki L2 update record: `3da591ab` → `cee5ff7520`

Date: 2026-07-26

Target:

- baseline: `3da591ab74ab9ab407e72ed882600b2c851fae21`
- target: `cee5ff7520d8828bed9955ef00419e995d1f91e0`
- range: 124 commits, 390 changed files, +17,263/-7,353
- target-only final commit: one link removal in `packages/coding-agent/README.md`; no indexed node source or evidence reference matched that file

This record is the independent L2 falsification pass for semantic changes. Mechanical SHA and line migration were not treated as semantic proof.

## Static L2 matrix

| Area | Falsification question | Initial result | Final result |
|---|---|---|---|
| server rename | Does the target retain an orchestrator alias, old env/path, or old class? | FAIL: Wiki still carried orchestrator ids and paths | PASS: nodes, ids, related links, package/bin/class/env/socket and staging names use server facts; historical changelog mentions remain historical |
| server config/Radius | Is the rename version and credential boundary exact? | FAIL: rename version and `AuthStorage` ownership were overstated | PASS: rename is tied to 0.81.0; Radius is documented as calling coding-agent's `readStoredCredential()` |
| server IPC | Can newline framing safely skip empty lines and preserve the first stream command in the handshake chunk? | FAIL: empty-line and same-chunk behavior were omitted | PASS: both are documented as implementation gotchas, with same-chunk retention marked `[I]` |
| harness tool surface | Are all seven coding-agent tools now agent-core built-ins? | PASS: no; the public harness surface is exactly bash/read/edit/write | PASS: a new node separates four optional `ExecutionEnv` factories from the seven-tool coding-agent product registry |
| harness edit/write | Is editing exact-only, byte-preserving, and always keyed by canonical path? | FAIL | PASS: exact-first/fuzzy fallback, LF/BOM/EOL behavior, per-env queue, canonical-or-absolute key, and backend-dependent parent creation are explicit |
| harness bash | Are 2,000-line/50-KB truncation and full-output spill implemented by `bash.ts` alone? | FAIL | PASS: the node follows `shell-output.ts` and `harness/utils/truncate.ts`, including temporary-file creation |
| harness image/path | Can images be recognized only from a filename extension, and do paths have one normalization form? | FAIL | PASS: signature detection, APNG/JXL exclusion, BMP fallback, Unicode/home/`@`/macOS path variants and their helper boundaries are explicit |
| SQLite package | Is SQLite merely an adapter with no public repo/storage behavior? | FAIL: initial node was too narrow | PASS: package/publication, create/open/list/delete/fork, transactional append/rollback, branch materialization, permissive decode, cursor/stats/cleanup, schema and indices are covered |
| eval harness | Is `pi-evals` a published mock harness? | PASS: no | PASS: it is private, builds a real coding-agent session, requires real auth, and deliberately avoids hidden tool/resource injection |
| layered model seam | Is `ModelRegistry` still the canonical `AgentSession` dependency? | FAIL | PASS: `ModelRuntime` is canonical; `ModelRegistry` is an extension compatibility facade |
| agent stream seam | Does the agent always fall back directly to `streamSimple`? | FAIL | PASS: resolution is `streamFn ?? getDefaultStreamFn()`; coding-agent installs a compatibility default, while an unconfigured embedding throws |
| session traversal | Does every session path reach root through a method still named `getPathToRoot`? | FAIL | PASS: the contract is `getPathToRootOrCompaction`; `retainedTail` and `firstKeptEntryId` define the compaction boundary |
| session short ids | Are short entry ids the first eight UUIDv7 characters? | FAIL | PASS: the implementation uses the random eight-character tail, retries collisions 100 times and falls back to the full UUID |
| constrained sampling | Do all providers support grammar and JSON schema equally? | FAIL | PASS: the node records per-API mapping, validation and unsupported/fallback behavior, including Azure/Codex/Google variants |
| retry | Is retry only a coding-agent UI concern? | FAIL | PASS: provider retry, assistant/summarization retry policy, callback lifecycle and call sites are separated |
| provider/env catalog | Do source membership and auth precedence still match the old catalog? | FAIL | PASS: 38 runtime providers, 37 structural model buckets, Anthropic bearer/API-key precedence, Qwen envs, OpenCode Go, Bedrock env propagation and Kimi/OpenRouter OAuth are covered |
| model catalog | Can the Git tree alone enumerate every model? | FAIL | PASS with `[I]`: official 0.82.1 artifact gives 37 buckets/1,109 rows and byte-identical source-map inputs, but has no `gitHead` |
| image catalog | Does the Wiki enumerate and anchor the complete generated image set? | FAIL: five rows were absent and 20 row evidence sets were incomplete | PASS: 40/40 ids and field-level source anchors match `image-models.generated.ts` |
| usage accounting | Is usage stored only on assistant messages? | FAIL | PASS: tool results, compaction/branch results, session entries, UI and aggregate stats are traced |
| compaction/branch | Does `generateBranchSummary()` return a bare union, and is compaction usage single-stage? | FAIL | PASS: `Promise<Result<...>>`, sequential summary stages and merged usage are documented |
| RPC/events | Are the old RPC/event catalogs complete? | FAIL | PASS: 32 RPC commands plus updated state, entry/bash/retry/settled behavior are reconciled |
| package index | Are all workspace packages published, and does `pi-ai build` generate the model catalog? | FAIL | PASS: five-package publish list, private evals, non-pipeline server, SQLite engine/deps, and `generate-models`/`build:offline` behavior are exact |

## Dynamic L2

The dynamic checks targeted behavior where isolated TypeScript modules could run without a built workspace:

- Node 26 type-stripping imported the target `constrained-sampling.ts`, `provider-retry.ts`, and summarization `retry.ts`. Mapping, retry callbacks (`scheduled → attempt_start → finished`), success, exhaustion and abort assertions passed.
- Target TypeScript OAuth modules passed isolated mocked flows:
  - OpenRouter loopback PKCE: S256 challenge, callback 200, token exchange and persistent access-to-api-key credential.
  - Kimi device flow: initial polling delay, pending then success, refresh form, and bearer `toAuth`.
- `findEnvKeys()` / `getEnvApiKey()` passed isolated Anthropic precedence checks: AUTH-only is discoverable but not returned as an API key; OAUTH wins when AUTH/OAUTH/API are all present. Both Qwen provider env injections resolved their own keys.
- The models.dev reasoning-options parser was checked against all three target groups and their target mapping behavior.
- `packages/ai/test/retry.test.ts` plus `packages/coding-agent/test/external-editor.test.ts` passed 21/21 assertions.

Broader harness/usage/output-pad/compaction suites could not be counted as passes in this worktree because workspace packages were not built and one dependency path required unavailable `undici`. RPC integration cases were skipped by their own environment guards. Those areas therefore retain static source-plus-test-code L2 rather than a fabricated dynamic result.

## Generated model artifact check

Official package: `@earendil-works/pi-ai@0.82.1`

- tarball SHA-256: `2f9df9522808b621cd3449876537f03d8a8df8b8d7ec2d5b18c6a910aa85b490`
- manifest schema: 3
- generated timestamp: `2026-07-25T12:44:19.521Z`
- structure hash: `1a3c7cf59ada71c94abe4540976960524ee933034491c75d6418e2abc1b42535`
- static provider buckets: 37
- model rows: 1,109
- source-map `model-catalog.ts` and `models.generated.ts`: byte-identical to target source
- package `gitHead`: absent

See `model-catalog-v0.82.1.md` for reconstruction details. Because the artifact does not identify its source commit, the 1,109 per-model rows remain `[I]`, not commit-local `[E]`.

## Final consistency checks

```bash
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
git diff --check -- docs/llm-wiki/pi pi
git -C pi rev-parse HEAD
git -C pi status --short
```

Additional assertions compare:

- all 186 indexed paths against the node file tree and `llms.txt`;
- index-level and frontmatter `updated` values against `cee5ff7520`;
- all frontmatter sources and `[E:]` paths/line ranges against the target tree;
- runtime provider ids (38), structural model buckets (37), model rows (1,109), image models (40), and RPC commands (32) against their source catalogs;
- staged paths against the authorized `docs/llm-wiki/pi/**` plus root `pi` gitlink boundary.

## Claims intentionally kept below `[E]`

- `[I]`: official npm model artifact attribution to this exact commit, because the package omits `gitHead`.
- `[I]`: architecture/ownership conclusions derived from call boundaries, negative export surfaces, and current absence of aliases.
- `[I]`: the `rpc_stream` same-chunk buffer stall, inferred from listener replacement and retained buffer control flow.
- `[U]`: Kimi OAuth exists in runtime code while the coding-agent subscription-provider documentation still omits it.
- `[U]`: the product meaning of `-1000000` input/output cost on both OpenRouter automatic image models.
- `[U]`: server-side Radius service behavior, cross-process coordination and future compatibility that cannot be proven from this client repository.
