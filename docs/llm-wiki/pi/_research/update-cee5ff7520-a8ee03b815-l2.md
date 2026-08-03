# L2 verification — cee5ff7520 → a8ee03b815

## Scope facts

- official default branch: `origin/main`
- base: `cee5ff7520d8828bed9955ef00419e995d1f91e0`
- target: `a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe`
- upstream span: 254 commits; 406 files; +36,495 / -3,895
- prior-node impact: A-BROKEN 14 / B-HEAVY 0 / C-DRIFT 117 / D-CLEAN 55
- result: 202 verified nodes; 16 added; 0 retired; 0 planned

## Independent verifier matrix

| Area | Counterexamples found and corrected | Final source-backed boundary |
|---|---|---|
| agent/session/storage/evals | stale SessionStorage methods; missing retry events/usage/tail; cache-repair overclaim; chmod overclaim | new read contract, 22 own events, bounded canonical traversal exception, create-time mode requests |
| AI/catalog | wrong Responses event/status handling; stale OAuth rule; Azure stop vs pending; auth resolver model parameter | provisional final-answer stop, terminal/error separation, validity window, provider-scoped auth |
| coding-agent | 25 vs 26 entries; missing entry renderer, provider overload/refresh, Kimi env, tool usage | 26 contribution/action rows, 93 env vars, 76 config keys, 62 active CLI, 33 events, 32 RPC methods |
| TUI | concrete TUI construction; 31 action claim; old renderImage return/fallback | renderer selection, 37 TUI actions, columns/rows, Kitty placement/crop, iTerm2 fullscreen fallback |
| protocol/client/server | revision monotonicity; id uniqueness/order; decoder omissions; strict/symbol overclaims | non-negative revision schema, correlation-only id, malformed input close, structured DTO/enumerable symbol scope |

## Catalog audit

Official 0.83.0 artifact: 38 runtime providers, 37 static buckets, 10 chat/text wire keys, 1,153 models. Registry gitHead is a target ancestor; release→target generator diff changes two Fireworks Kimi K3 wire assignments but not membership. See `model-catalog-v0.83.0.md`.

## Validation

Wiki validation is run serially after all fillers: reconcile, lint, reconcile again, lint again, `git diff --check`, SHA/index/file/link consistency, gitlink/submodule-head equality, submodule cleanliness, and explicit staged-scope inspection.

Upstream runtime tests were not executed successfully because the detached Pi checkout has no installed `node_modules`; verifier attempts failed before test collection with missing Vitest/runtime dependencies. No dependencies were installed and no upstream source was modified.
