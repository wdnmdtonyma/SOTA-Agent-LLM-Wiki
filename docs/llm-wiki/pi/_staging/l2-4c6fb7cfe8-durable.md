# L2 verification — durable @ 4c6fb7cfe8

Independent falsification. Wiki nodes were not edited. Source: `pi/` at `4c6fb7cfe8` (`4c6fb7cfe8c538a668726f6f8b3554098c39faee`). Detached checkout; `node_modules` absent; durable vitest / `bench:storage` not run.

Nodes:

- `docs/llm-wiki/pi/subsystems/durable/runtime.md`
- `docs/llm-wiki/pi/subsystems/durable/storage.md`
- `docs/llm-wiki/pi/subsystems/durable/harness.md`

## Verdict

| Node | Result | Why |
|---|---|---|
| `subsys.durable.runtime` | **FAIL** | Load-bearing API shape is wrong: `documentState` is not on `DocumentObserver`; Session methods do not all take `Context`. |
| `subsys.durable.storage` | **PASS** | Async SQLite, `fsync` default `false`, WAL + `NORMAL`, JSONL/SQLite ≠ SessionManager JSONL all hold. Remaining items are citation tightness, not false facts. |
| `subsys.durable.harness` | **FAIL** | `Harness.open(openNodeSqliteStorage(...))` is not exclusive to the experimental session worker; several load-bearing `[E:]` do not contain the asserted fact. |

## Assigned checks

These were checked first against source. All six architecture facts hold; they do not rescue the FAIL nodes.

| Check | Result | Anchor |
|---|---|---|
| `createSession` | **PASS** | `packages/durable/src/session/session.ts:49-50` returns `new SessionImpl(storage)`. Does **not** insert `ROOT_CONVERSATION_ID`. Root is `createRootConversation()` / Harness `root()`. |
| async SQLite | **PASS** | `SqliteExecutor` / `SqliteDatabase` methods return `Promise` (`database.ts:11-37`). Node adapter `await callback(...)` (`node.ts:145`). |
| `fsync` default | **PASS** | `this.fsync = options.fsync ?? false` (`jsonl/storage.ts:256`). Type comment: defaults to false (`:78`). |
| WAL | **PASS** | Node open: `PRAGMA journal_mode = WAL` then `synchronous = NORMAL` (`sqlite/node.ts:190-191`). Close: `wal_checkpoint(TRUNCATE)` (`:167`). |
| `Harness.open` | **PASS** (existence) | `Harness.open(storage, options, context)` (`harness.ts:407-413`). Registry must contain `BUILTIN_TASKS` (`:416-419`). |
| `BUILTIN_TASKS` | **PASS** | `[GenerationTask, ToolTask, CompactionTask]` (`registry.ts:10`). |
| `./tools` `CodingTools` = read/write/edit/bash | **PASS** | `tools: [createReadTool(), createWriteTool(), createEditTool(), createBashTool()]` (`tools/index.ts:21`). `image.ts` is `detectSupportedImageMimeType`, not a tool (`:3`). |
| not a replacement for SessionManager JSONL | **PASS** | `CURRENT_SESSION_VERSION = 3` (`session-manager.ts:41`). coding-agent `dependencies` has no `pi-durable` (`package.json:49-73`). |
| no `packages/agent/src/harness` as current source | **PASS** | Directory does not exist. Wiki only says **do not** cite it. Frontmatter `source:` lists `packages/agent/src/index.ts` / `package.json` / `CHANGELOG.md`, not `harness/**`. |

## Citation mechanical pass

All `[E: path:line]` on the three nodes:

| Node | `[E]` | `[I]` | `[U]` |
|---|---:|---:|---:|
| runtime.md | 145 | 2 | 0 |
| storage.md | 140 | 1 | 0 |
| harness.md | 172 | 0 | 1 |
| **total** | **457** | **3** | **1** |

- 0 missing files, 0 out-of-range lines, 0 blank / comment-only / pure-brace anchors.
- Every cited path exists under `pi/` at this SHA.
- That is L1-clean. L2 failures below are semantic: the line exists but does not support the claim, or the claim is false.

---

## Refute list

Severity: **FALSE** = wiki sentence is wrong; **E-MISMATCH** = fact is true elsewhere but the cited line does not support it; **OVERNARROW** = exclusivity / completeness wrong.

### `subsys.durable.runtime` — FAIL

1. **FALSE — `DocumentObserver` does not include `documentState`.**
   - Wiki W122: `Session` 扩展 `DocumentObserver`（`documentState` / `watchDoc`）。 `[E: types.ts:899]` `[E: types.ts:867]`
   - `types.ts:867` `DocumentObserver` only declares `watchDoc` overloads.
   - `documentState` is on `Session` itself (`types.ts:938-968`, impl `session.ts:181-212`).
   - `Session extends DocumentObserver` is true (`:899`). Parenthetical membership is false.
   - L3: list `documentState` as a Session method; leave `watchDoc` on `DocumentObserver`.

2. **FALSE — Session methods do not all take Chord `Context`.**
   - Wiki W159: `Session 方法全部带 Chord Context`。 `[E: types.ts:1]` `[E: types.ts:901]`
   - `:901` is `commit(..., context: Context)`.
   - `subscribeClose(listener: () => void)` has no `Context` (`types.ts:907`).
   - `subscribeCommits` takes no `Context` argument; the listener receives one (`:905`).
   - W178 is the accurate subset (`commit` / `snapshot` / `close` / every `Storage` method). L3: drop `全部` or enumerate.

3. **E-MISMATCH — `createSession()` 不播种 root，cited factory signature only.**
   - Wiki W101 / W170: `[E: session.ts:49]`
   - `:49` is `export function createSession(storage: Storage): Session`.
   - Body `:50` is `return new SessionImpl(storage);` — that is the negative proof. Constructor (`:69-83`) also does not commit.
   - Claim is true. Move `[E]` to `:50` or cite `:49-50`.

4. **E-MISMATCH — poison-on-adopt cited at the `adopt` call / `#assertHealthy` check, not the assignment.**
   - Wiki W138: 其它 Storage 错误或 `tx.adopt(seq)` 失败会 `#poison`。 `[E: session.ts:431]` `[E: :436]` `[E: :544]`
   - `:431` supports “non-`StorageRejected` poisons”.
   - `:436` is `documents = tx.adopt(seq);` — poison is in the `catch` at `:439`.
   - `:544` is `if (this.#poison !== undefined)` inside `#assertHealthy`. Reopen text is `:545` (already cited on W173).

5. **E-MISMATCH — root export `.` cited at `package.json:8`.**
   - Wiki W73: 根 export `.` 指向 `src/index.ts`。 `[E: package.json:8]`
   - `:8` is `"exports": {`. `"."` is `:9`; `"source": "./src/index.ts"` is `:10`.
   - The `index.ts` symbol cites (`:1`, `:11`, `:98`, `:99`, `:181`) do support the export list.

6. **E-MISMATCH — `diff` / `typebox` listed but not cited.**
   - Wiki W75: 运行依赖 chord、pi-ai、`diff`、`typebox`。 `[E: package.json:102-104]`
   - `:103-104` are chord and pi-ai. `diff` is `:105`, `typebox` is `:106`. Claim is true.

7. **E-MISMATCH — “listeners 必须不 throw / 不阻塞 / 不调 Session API”. **
   - Wiki W124 cites `types.ts:735` (type), `:905` (signature), `session.ts:465` (sync loop).
   - The contract is JSDoc on `types.ts:904` and `session.ts:383`. Sync delivery is `:465`. True, but `:735` / `:905` / `:384` do not state the must-not rules.

8. **NIT — coding-agent `dependencies` “列出 pi-agent-core / pi-ai”.**
   - `[E: coding-agent/package.json:51-52]` are those two entries.
   - `:50` is also `pi-chord`. Load-bearing “**没有** `pi-durable`” is true across `:49-73` and `devDependencies`.

### `subsys.durable.storage` — PASS (nits only)

No false architecture claim found. L3 may tighten these; they are not FAIL.

1. **E-MISMATCH — reclaim/flush cited on `if (this.fsync)` not `flushFile`.**
   - Wiki W116: reclaim 前 `flushFile(mainPath)`，临时 sidecar rename 前 flush。 `[E: jsonl/storage.ts:509]` `[E: :527]`
   - `:509` / `:527` are `if (this.fsync)`. Actual `flushFile(this.mainPath)` is `:510`; temp sidecar flush is `:528`.

2. **E-MISMATCH — SQLite `close()` drain cited on wrappers.**
   - Wiki W155: 等 admitted reads 排空再关 db。 `[E: sqlite/storage.ts:506]` `[E: :514]`
   - `:506` `close()`, `:514` `closeDatabase()`. Wait is `:515-520`.

3. **E-MISMATCH — `mintId` = `nextId++` cited at function start.**
   - Wiki W168: `[E: memory.ts:410]` `[E: sqlite/storage.ts:187]`
   - Increment is `memory.ts:413` / `sqlite/storage.ts:190`.

4. **E-MISMATCH — `wal_autocheckpoint` `0` disables auto-checkpoint.**
   - Wiki W140 cites `node.ts:11` (optional field). “0 disables” is the comment on `:10`. Default `1_000` is `:16`; pragma is `:192`.

5. **NIT — `testing/index.ts:15` is the closing of the benchmark re-export** (`} from "./storage-benchmark.ts"`), not a named export line. Named exports are `:4-12`.

6. **NIT — README.md:527** is reused for both “no cross-process lock” and “Bun / Cloudflare Durable Object”. The line does contain both.

### `subsys.durable.harness` — FAIL

1. **FALSE / OVERNARROW — `Harness.open(openNodeSqliteStorage(...))` is not unique to the experimental session worker.**
   - Wiki W192: experimental session worker（`PI_EXPERIMENTAL=1`）**才** `Harness.open(openNodeSqliteStorage(...))`。 `[E: session-worker.ts:15]` `[E: :784]` `[E: :785]`
   - Those lines do open Harness on Node SQLite. They do **not** mention `PI_EXPERIMENTAL`.
   - Gating is `areExperimentalFeaturesEnabled()` → `process.env.PI_EXPERIMENTAL === "1"` (`experimental.ts:1-2`) used by `runExperimentalCommand` (`commands.ts:86`).
   - Same `Harness.open(await openNodeSqliteStorage(...))` also exists at:
     - `packages/coding-agent/src/experimental/durable/runtime.ts:138-139` (durable TUI; `durable/main.ts` is a shebang entry, not the PI_EXPERIMENTAL server/client parser)
     - `packages/coding-agent/src/experimental/vacation/runtime.ts:135-136`
   - Wiki 跨包边界 already names “session worker / vacation planner”. The gotcha `才` contradicts that.
   - Default `pi` CLI still is **not** Harness (bin `dist/bundle/cli.js`, `files` excludes `dist/experimental`). That half stands. Drop `才` or list all three experimental openers.

2. **E-MISMATCH — generation 偏 “最多每 100 ms”.**
   - Wiki W182: `[E: README.md:5]` `[E: scheduler.ts:244]`
   - README `:5` is “committed to storage before anything is shown”.
   - `scheduler.ts:244` is `if (record.state.status === "running")` (crash reconcile to `pending`).
   - 100 ms is `README.md:287`, `generation.ts:359`, `output.ts:214`. Claim is true; cited lines do not contain it.

3. **E-MISMATCH — `close()` 先 `TaskScheduler.join()`.**
   - Wiki W161: `[E: harness.ts:321]`
   - `:321-323` is `this.#closed = true; return super.close(context);`
   - `join()` is `beforeClose()` at `:327-328`. `Session.close` runs `beforeClose` then `storage.close` (`session.ts:350-360`).
   - Invocation-bound handle rejection is the comment at `harness.ts:367-369`, not `:321`.
   - Claim is true via the hook. Cite `:327-328`.

4. **E-MISMATCH — `PI_EXPERIMENTAL=1` not on the session-worker cites.**
   - Same W192. Worker entry only checks internal role `session-worker` (`session-worker.ts:836-837`). Env gate is not in this file.

5. **E-MISMATCH — `requireEnv()` / `api.env === undefined`.**
   - Wiki W178: 无 `HarnessOptions.env` 时 `api.env` 为 `undefined`，内置工具 `requireEnv()` 失败。 `[E: env/index.ts:174]` `[E: env/node.ts:437]` `[E: :439]` `[E: package.json:21]`
   - Those lines are `ExecutionEnv` / `NodeExecutionEnv` / `id = "node:local"` / `./env/node` export.
   - Actual: `HarnessImpl.buildEnv` returns `undefined` without `options.env` (`harness.ts:223-226`); `requireEnv` throws `"No execution environment is configured"` (`tools/env.ts:5-6`). True, wrong `[E]`.

6. **E-MISMATCH — `pi.tool` `call` 校验 cited at `defineTask`.**
   - Wiki W158: `[E: tool.ts:50]` `[E: :88]` `[E: :98]`
   - `:50` is `export const ToolTask = defineTask(...)`.
   - `call` starts at `:55` (validate / `beforeTool` / intent). `:88` intent `replay ?? "unsafe"`. `:98` recovery only if both `safe`.
   - Behavior is true. Cite `:55` (or `:45-48` JSDoc is a comment — L1-illegal).

7. **E-MISMATCH — `write` / `edit` / `bash` extra semantics cited on `name:`.**
   - `write.ts:18` is `name: "write"`; `withFileMutationQueue` is `:26`.
   - `edit.ts:92` is `name: "edit"`; `prepareArguments` is `:96` (OK); JSON-string / legacy `oldText` is `prepareEditArguments` at `:49-68`.
   - `bash.ts:49` is `name: "bash"`; `outputLimits.retain: "tail"` is `:52` (OK); `env.exec` is `:64`.
   - `file-mutation-queue.ts:33` is the function signature; “不锁 bash / 其他进程” is JSDoc `:29-31`.

8. **E-MISMATCH — `watchEvents` ≠ agent-core 10-variant `AgentEvent`.**
   - Wiki W163 / W200 cite only `events.ts:56` (durable union). Comparison to `packages/agent/src/types.ts:514-529` (exactly 10 variants: `agent_start/end`, `turn_*`, `message_*`, `tool_execution_*`) is uncited.
   - Durable JSDoc `:55` says “shaped like the coding agent's session events”, not agent-core loop events. Inequality is true.

9. **NIT — “现行 `index.ts` 只有这五条 re-export”.**
   - Wiki W94 cites `agent/src/index.ts:1,2,3,5`. Skips `:4` `export { setDefaultStreamFn } from "./stream-fn.ts"`.
   - There **are** five export statements. Changelog “only Agent, loop, proxy stream, and types” (`CHANGELOG.md:11`) omits `setDefaultStreamFn`. Count is right; inventory is incomplete.

10. **NIT — `tool.ts:50` / `generation.ts:156` / `generation.ts:554` / `compaction.ts:238` are symbol-start / `if` / `const` lines.**
    - Blocking threshold body is `:156-163`; background threshold is `:170-171`; `thresholdCompaction` cut test is `:320`.
    - Sequential round is `:554-559`.
    - Compaction `ownership` assignment continues `:238-239`; `background` is `:240`.
    - Facts checked true (overflow does not retry: `:477-478`; `createCompaction` owner → task-owned, else conversation-owned + `background` unless `manual`).

---

## What holds (do not “fix” away)

### Session kernel (`runtime`)

- Package `@earendil-works/pi-durable` **1.0.1**, Experimental README.
- Root barrel exports `defineDoc` / `defineDocFamily`, `createSession`, `MemoryStorage`, `ROOT_CONVERSATION_ID`, errors; also Harness symbols (runtime node scopes itself to the kernel — incomplete, not false).
- Root value-import graph excludes `src/env/`, `storage/jsonl/`, `storage/sqlite/` (`storage-runtime-boundary.test.ts:26-30`).
- `ROOT_CONVERSATION_ID = 1`. Memory `nextId = 2`. Conformance first case: `mintId() === 2` then commit `{ id: 1 }`.
- `createRootConversation()` is on `Transaction`, **not** public `Tx` (`transaction.ts:285-286`; `Tx` in `types.ts:744-839` has no such method).
- `ReadAfterWrite` on table read after first table write (`transaction.ts:922`).
- `snapshotAsOf` TypeError on non-conversation (`session.ts:320-321`); history uses cutoff `commitSeq` (`:340`).
- Commit publication is synchronous (`session.ts:465`), not `queueMicrotask`.
- Poison after storage admission: reopen (`session.ts:545`).
- No `session/publications.ts`. Session dir is `session.ts` / `transaction.ts` / `forks.ts` / `observation.ts`.
- `pi-coding-agent` published deps do not include `pi-durable`. Product JSONL remains `SessionManager` v3.
- Durable is in root `build` after `ai` and before `agent` (`package.json:15`).
- `packages/durable/docs/pico*` correctly excluded from `[E]`.

### Storage (`storage`)

- Three shipped backends; JSONL/SQLite are explicit subpaths.
- JSONL wraps `MemoryStorage`; `prepareCommit` then append sidecars / marker then `apply()`.
- `openNodeJsonlStorage(directory, context, options?)` — **second** arg is Chord `Context`.
- `openNodeSqliteStorage(path, options?)` — **no** `Context`.
- Portable SQLite facade is async; Node adapter `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`; nested `database.transaction()` / `close()` from inside the callback does not settle (`database.ts:26-28`, `SerialOperationQueue`).
- `CURRENT_SQLITE_SCHEMA_VERSION` from last migration; initial `next_id = '2'`.
- `mintId` is per-instance `nextId++`. No cross-process ID protocol. `busyTimeoutMs` default `5_000` is a lock wait, not allocation.
- Closed errors: `MemoryStorage is closed` / `JsonlStorage is closed` / `SqliteStorage is closed`.
- JSONL poison type `JsonlStoragePoisonedError`.
- Conformance / bench export surface matches `testing/index.ts` and the three `registerStorageConformance` tests.

### Harness (`harness`)

- 1.0 reusable harness lives in `pi-durable`. `pi-agent-core` 1.0.0 deleted `AgentHarness` (`CHANGELOG.md:11`). `packages/agent/src/harness/**` is gone. `packages/agent/src/index.ts` re-exports agent / loop / proxy / `setDefaultStreamFn` / types. `package.json` exports only `.` and `./package.json`.
- `pi-durable` does not import `pi-agent-core` (deps: chord, pi-ai, diff, typebox).
- `HarnessImpl extends SessionImpl`. `Harness.open` requires `BUILTIN_TASKS`.
- `createRegistry()` preloads only built-in tasks; they are not an uninstallable extension.
- `CodingTools` is four tools, not coding-agent’s eight (no grep / find / ls / powershell). Not auto-installed (`tools/index.ts:18-21`).
- Image magic on `read` returns diagnostic `unsupported_image` (`read.ts:44`).
- Generation uses `models.streamSimple()`, not `runAgentLoop` (`generation.ts:399`).
- Scheduler defaults `#enabled = false` (`scheduler.ts:209`). `submit` / `compact` / `abort` / `wait*` call `resume()`.
- Crash: surviving `running` rewritten to `pending` keeping checkpoint (`scheduler.ts:244-245`).
- `pi.live.run` kinds = `{ "pi.generation" }` (`live.ts:79`).
- Overflow compaction does not retry (`generation.ts:477-478`).
- Default settings: `toolExecution: "parallel"`, steering/follow-up `one-at-a-time`, retry 3 / 2000 / 60000, compaction 16384 / 20000 / 32768 (`agent.ts:18-56`).
- Product CLI: `bin.pi = dist/bundle/cli.js`; `files` has `!dist/experimental`. Existing `[U]` on “默认 CLI 会不会切到 Harness” stays.

---

## L3 fix list (minimum)

**runtime.md**

- W122: `documentState` on `Session`, not `DocumentObserver`.
- W159: do not say every Session method takes `Context`.
- Move `createSession` no-seed `[E]` to `session.ts:50`.
- Poison-on-adopt `[E]` to `session.ts:439`.
- Root `.` export `[E]` to `package.json:9` or `:10`.
- Add `package.json:105-106` if listing `diff` / `typebox`.

**storage.md** (optional tightness; node may stay verified)

- Flush cites → `:510` / `:528`.
- Close drain → `:515`.
- `mintId++` → `:413` / `:190`.
- `0` disables wal autocheckpoint → comment is `:10`; do not hang that clause on `:11`.

**harness.md**

- Replace “session worker 才 `Harness.open(openNodeSqliteStorage)`” with the three experimental openers, and cite `experimental.ts:2` for `PI_EXPERIMENTAL=1`.
- 100 ms → `README.md:287` or `generation.ts:359`.
- `close`/`join` → `harness.ts:327-328`.
- `requireEnv` / missing env → `harness.ts:223-226` and `tools/env.ts:5-6`.
- `ToolTask.call` → `tool.ts:55`.
- Optionally cite `agent/src/index.ts:4` and `agent/src/types.ts:514` for the AgentEvent inequality.

Do not reintroduce `packages/agent/src/harness/**`, `packages/session-backends/**`, `session/publications.ts`, or `AgentHarness` as current API. Do not call durable JSONL/SQLite a `SessionManager` replacement.

## Not verified

- Memory / JSONL / SQLite conformance and `bench:storage` greenness at this SHA (no `node_modules`).
- Two-process ID collision / SQLite busy failure modes (source forbids sharing; tests not run).
- Whether published coding-agent can resolve `@earendil-works/pi-durable` for experimental files: experimental sources import it, but it is in neither `dependencies` nor `devDependencies`. Wiki’s “published deps 未列出” is still true.
