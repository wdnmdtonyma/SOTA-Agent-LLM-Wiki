# Extra architecture facts — d347e70390 (`0.1.3-alpha.1`)

Filler 辅助。冲突时以源码为准，不要把本页当 `[E]`。

## Session format

- `SESSION_FORMAT_VERSION = 2` in `packages/core/session/src/types.ts`.
- Adjacent migrations: `packages/session/session-format-v0-to-v1`, `packages/session/session-format-v1-to-v2`.
- Planner: `packages/session/session-format` (`createSessionFormatChain`, adjacent `from+1` only).
- Installed catalog: `packages/session/session-format-catalog` (`currentVersion: 2`).
- JSONL backend imports the catalog (`packages/session/session-persistence-jsonl/src/index.ts`).
- Newer-than-current still refused. Old "no migration / version 0" claims are false.

## Persistence seam

- Definition: `packages/session/session-persistence/src/index.ts` — `SessionHandle` from `create`/`open` (`handle.ts`).
- Contract helpers: `storage-contract.ts`, errors in `errors.ts` (`sessionFormatVersionRefusal` moved here).
- Deleted: `coordinator.ts`, `preparations.ts`, `write-behind.ts`.
- JSONL provider: `packages/session/session-persistence-jsonl/src/{index,storage,lease,format,generation}.ts`. Lease = cross-process write ownership.
- `dsh-base` still inserts `id: session-persistence-jsonl` at `packages/bundle/base/cordis.patch.yml` (~line 110).
- `packages/session/session-persistence-sqlite` **gone** (empty `node_modules` husk only).
- Still live SQLite: `packages/session-query/session-query-sqlite` (base, `openAt: never`, `:memory:`), `packages/storage/storage-sqlite`.

## Report tool

- `packages/subagent/tool-subagent-report` deleted. No shipped bundle row.
- Keep wiki id `surface.tools.report` as a retirement page.

## Subagent descriptor

- `descriptor-seed.ts` → `descriptor.ts` (`subagent/descriptor` session event, log-only, no `surfaceOp`).
- `activation-setup-registry.ts` deleted.

## PTC / Python

- `presets/ptc/agent.cordis.yml`: `tool-workflow` `disabled: true`; comment says keep engine for `ralph`.
- Python runtime: `packages/experimental/code-runtime-python`, name `@deepseek-ai/dsh-experimental-code-runtime-python`.
- It **extends** `CodeRuntime` and spawns `python3` (fd-3 JSON-lines). Old "protocol-only, no provider" page is wrong.

## New web-app rows

- `session-turn-outline` → fold into projection node. Do not create a new wiki node.
- `file-upload` / `@deepseek-ai/dsh-client-file-upload` → new node `subsys.client.file-upload`.

## http-proxy

- Library `@deepseek-ai/dsh-http-proxy` (`packages/util/http-proxy`).
- Installed from `apps/cli/src/profile-boot.ts` via `installProxyFromEnvironment`.
- Not a Cordis plugin; process-wide undici dispatcher.

## Unchanged composition

- Profiles: `web` live; `headless` / `sdk` / `sdk-minimal` / `acp` startup. `sdk-minimal` does not stack base.
- Presets: `minimal` / `standard` / `ptc` / `cordis`.
- Bundles: `dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app`.
- Default model: `deepseek-official` / `deepseek-v4-flash` on `dsh-base` `agent-default-model` row.

## Inventory

- Product version: `0.1.3-alpha.1`.
- Leaf `packages/**/package.json`: count at fill time (was 251, now ~265).
- Remaining `src/invariant.ts`: 39 files. Missing ones must be dropped from wiki `source:`.
- Deleted demo: `packages/examples/agent-spine-demo`.
