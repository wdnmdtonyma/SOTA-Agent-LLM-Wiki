# Update facts — df23b7f948

> Filler / L2 的速查。每条仍须回源码核对行号。路径相对 `opencode/`。事实以 checkout `df23b7f948` 为准。

## 版本 / 依赖

- 发布仍是 **`1.18.30`**（`packages/opencode`、`packages/core`、`packages/cli`）。[E: packages/opencode/package.json:3][E: packages/core/package.json:3][E: packages/cli/package.json:4]
- 根仍是 `bun@1.3.14`；workspace 仍 **36** 个 package。[E: package.json:7][E: package.json:26]
- `@ai-sdk/gateway` **3.0.104 → 3.0.191**（`packages/opencode` 与 `packages/core`）。`@ai-sdk/provider` **3.0.8 → 3.0.16**；core 另把 `@ai-sdk/provider-utils` **4.0.23 → 4.0.51**。不是新 provider family。[E: packages/opencode/package.json:65][E: packages/opencode/package.json:73][E: packages/core/package.json:71][E: packages/core/package.json:79][E: packages/core/package.json:80]

## ACP：restoreSession / default variant / reasoning messageId

- `loadSession` / `resumeSession` / `forkSession` 都调用 `restoreSession(snapshot, backing, messages)`。backing 来自 `sdk.session.get`（fork 用 fork 返回的 session）。[E: packages/opencode/src/acp/service.ts:221][E: packages/opencode/src/acp/service.ts:309][E: packages/opencode/src/acp/service.ts:380][E: packages/opencode/src/acp/service.ts:1089]
- 恢复顺序：durable `Session.model` / `Session.agent`（须仍在 snapshot 里）→ message history → 默认 model / 第一个 variant / `defaultModeID`。[E: packages/opencode/src/acp/service.ts:1120][E: packages/opencode/src/acp/service.ts:1133][E: packages/opencode/src/acp/service.ts:1141]
- `resumeSession` 仍不 `replayMessages`；`loadSession` 与 `forkSession` 才会。[E: packages/opencode/src/acp/service.ts:238][E: packages/opencode/src/acp/service.ts:325][E: packages/opencode/src/acp/service.ts:397]
- `DEFAULT_VARIANT_VALUE = "default"`。`hasVariant` 把 `"default"` 当合法值，即使 variants map 没有这个 key。[E: packages/opencode/src/acp/config-option.ts:3][E: packages/opencode/src/acp/service.ts:930]
- `buildEffortSelectOption`：currentValue 为 `"default"` 时不再 `selectVariant`；options 始终并入 `"default"`。[E: packages/opencode/src/acp/config-option.ts:64][E: packages/opencode/src/acp/config-option.ts:68]
- 换模型：`selectModelVariant` 同模型则保留 current variant；`setSessionConfigOption` 的 model 路径与 `unstable_setSessionModel` 会 `sendConfigOptionUpdate`（`sessionUpdate: "config_option_update"`）。effort / mode 只写 RPC 返回值。[E: packages/opencode/src/acp/service.ts:917][E: packages/opencode/src/acp/service.ts:429][E: packages/opencode/src/acp/service.ts:485][E: packages/opencode/src/acp/service.ts:441]
- reasoning replay 的 `messageId` 是 `part.id`；live `agent_thought_chunk` 是 `props.partID`。普通 text 仍用 message id。[E: packages/opencode/src/acp/event.ts:137][E: packages/opencode/src/acp/event.ts:251][E: packages/opencode/src/acp/event.ts:236]

## Console：批量封禁 / Go billing source

- `Workspace.blockBatch` / `unblockBatch` 走内部 `setBlockedBatch`：去重后每 500 个 ID 一块，先 UPDATE 再 SELECT 收集存在的行。已处于目标 `is_blocked` 的行仍算 applied。[E: packages/console/core/src/workspace.ts:112][E: packages/console/core/src/workspace.ts:147][E: packages/console/core/src/workspace.ts:152][E: packages/console/core/src/workspace.ts:142]
- 没有单条 `Workspace.block` 导出；有单条 `unblock`（`rowsAffected === 0` 抛 `Workspace not found`）。[E: packages/console/core/src/workspace.ts:100]
- Support `POST /api/support/actions/block-workspaces` 与 `unblock-workspaces` 用 `SUPPORT_API_KEY`；body `{ workspaceIDs: wrk_…[] }`；缺 ID 进 `notFound`，不失败整批。[E: packages/console/app/src/routes/api/support/actions/block-workspaces.ts:10][E: packages/console/app/src/routes/api/support/actions/block-workspaces.ts:18][E: packages/console/app/src/routes/api/support/actions/unblock-workspaces.ts:19]
- lite 新 inference 写 `x-zen-billing-source`：`billingSource === "lite"` → `"go"`，否则 `"credit"`。非新 inference 删掉该头。[E: packages/console/app/src/routes/zen/util/handler.ts:255][E: packages/console/app/src/routes/zen/util/handler.ts:266]

## Stats：按周 retention / R2 超时 / deepseek-flash

- `buildRetentionQueries` 对每个 cohort week **单独**一条 query，不再把整窗拼进一次 join。[E: packages/stats/core/src/domain/inference.ts:61]
- `R2_SQL_TIMEOUT_MS = 15 * 60_000`。`timeout: false` 关掉 Bun 默认 5 分钟 idle timer，再用 `AbortSignal.timeout`；失败 message 带耗时。[E: packages/stats/core/src/r2-sql.ts:4][E: packages/stats/core/src/r2-sql.ts:56][E: packages/stats/core/src/r2-sql.ts:70]
- `MODEL_NAME_ALIASES["deepseek-flash"] = "deepseek-v4.1-flash"`。这是 stats 归一名，不是 zen/go live catalog。[E: packages/stats/core/src/domain/model-normalization.ts:20]
- `syncStats` 对每条 usage/retention query 打 complete/fail 日志；开始时打 `stats sync started`。[E: packages/stats/core/src/stat-sync.ts:51][E: packages/stats/core/src/stat-sync.ts:54][E: packages/stats/core/src/stat-sync.ts:91]

## 不变

- SessionV2 不是默认路径。
- Effect HttpApi，不是 Hono。
- 无新/删模型可见 tool。
- 36 workspace packages；`bun@1.3.14`；发布 `1.18.30`。
- zen/go live 模型表来自外部 catalog。web `docs/go.mdx` 与 `go-models.ts` 是营销面。
