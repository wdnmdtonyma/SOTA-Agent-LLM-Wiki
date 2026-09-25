# Pi wiki 增量刷新令（71dca871bc → ff72faba28）

给 filler 读。规范仍以 `../conventions.md` 与 `../RUN.md` 为准。本文件只补充**这一轮**的路径、架构事实和文件纪律。

本轮 **不跑逐节点独立 L2**（lead 填完后再统一证伪）。filler 自己核 `[E:]`（每页至少抽 3 条 `read_file` 对行），写完将 `status: verified`。过宽结论宁可降 `[I]/[U]`。

## 冻结点

- **base**（上一轮 verified）: `71dca871bc`（`71dca871bc80b6bc97be37f0ca3189399d651fff`）
- **target**（必须对照的源码 HEAD）: `ff72faba28`（全 SHA `ff72faba28d10c86611863d0aaa5d3122f2d8cb0`；官方 `origin/main`；产品 **0.87.1** + `[Unreleased]`）
- 源码根: `pi/`（相对本 wiki `../../../pi/`）
- 节点 `updated:` 一律写成 `ff72faba28`
- 未安装上游 `node_modules`，不要宣称 runtime tests 通过。
- **不要**把 `packages/durable/docs/pico*`、`packages/agent/docs/pico*`、`packages/agent/docs/work-packages/**` 当 shipped 源。那是内部设计手稿，最多 `[I]`，**不要新建 pico 节点**。
- durable **源码** `packages/durable/src/**` 是 shipped，必须写进新节点。

## 路径增补（frontmatter `source:` 与 `[E:]`）

### 删除，禁止再 cite

| 旧路径 | 处理 |
|---|---|
| `packages/ai/src/utils/deferred-tools.ts` | 删除。Fireworks/Anthropic deferred tools 现走 catalog `compat` + Anthropic native `defer_loading` / OpenAI `supportsToolSearch`。 |
| `packages/ai/src/images-models.ts` | 删除。图像生成并入 `Models.generateImages()`。 |
| `packages/ai/src/image-models.generated.ts` | 删除。用 `IMAGE_MODELS` in `models.generated.ts`。 |
| `packages/ai/src/providers/openrouter-images.ts` | 删除。实现在 `packages/ai/src/api/openrouter-images.ts` + `providers/images/register-builtins.ts`。 |
| `packages/ai/scripts/generate-image-models.ts` | 删除。 |
| `packages/evals/src/pi-harness.ts` 及旧 `src/*.eval.ts`、`src/vitest-evals/**`、`scripts/run-evals.mjs`、`vitest.config.ts` | 删除。新结构见下。 |
| `packages/coding-agent/docs/development.md` | 删除。 |
| `packages/coding-agent/examples/extensions/kimi-deferred-tools.ts` | 删除。 |
| `shouldStopAfterTurn` | 符号删除。改 `finishTurn`。 |

### 必须新增的 source

| 节点 | 必须加入 `source:` |
|---|---|
| `subsys.evals.pi-harness` | `packages/evals/src/harness.ts`、`packages/evals/src/cli.ts`、`packages/evals/src/docker.ts`、`packages/evals/src/plan.ts`、`packages/evals/evals/smoke.eval.ts`、`packages/evals/README.md` |
| `subsys.evals.comparative-harness` | `packages/evals/src/report.ts`、`packages/evals/src/plan.ts`、`packages/evals/evals/*.docs.eval.ts`、`packages/evals/docker/Dockerfile` |
| `subsys.ai.image-generation` | `packages/ai/src/images.ts`、`packages/ai/src/images-api-registry.ts`、`packages/ai/src/image-models.ts`、`packages/ai/src/models.ts`、`packages/ai/src/api/openrouter-images.ts`、`packages/ai/src/providers/images/register-builtins.ts` |
| `ref.ai.image-models` | `packages/ai/src/models.generated.ts`、`packages/ai/src/types.ts`、`packages/ai/src/api/openrouter-images.ts` |
| `subsys.ai.classifiers`（新） | `packages/ai/src/types.ts`、`packages/ai/src/models.ts`、`packages/ai/src/api/typesafe-system-one.ts`、`packages/ai/src/api/cloudflare-workers-ai-system-one.ts`、`packages/ai/src/providers/typesafe.ts`、`packages/ai/src/providers/typesafe.models.ts` |
| `subsys.durable.runtime`（新） | `packages/durable/src/index.ts`、`packages/durable/src/types.ts`、`packages/durable/src/session/session.ts`、`packages/durable/src/documents.ts`、`packages/durable/README.md`、`packages/durable/package.json` |
| `subsys.durable.storage`（新） | `packages/durable/src/storage/memory.ts`、`packages/durable/src/storage/jsonl/storage.ts`、`packages/durable/src/storage/jsonl/node.ts`、`packages/durable/src/storage/sqlite/storage.ts`、`packages/durable/src/storage/sqlite/node.ts`、`packages/durable/src/testing/index.ts` |
| `subsys.coding-agent.cache-warming`（新） | `packages/coding-agent/src/core/cache-warmer.ts`（若路径不同，以 glob 为准）、settings / extension event 定义 |
| `ref.ai.provider-catalog` | 补 `packages/ai/src/providers/meta.ts`、`typesafe.ts` |
| `ref.ai.model-catalog` | 42 个 `*.models.ts`；Radius **现在有**静态 shard |
| `ref.coding-agent.slash-commands` | 现有即可；必须含 `/bug` |
| `spine.layered-architecture` / `ref.package-index` | 补 `packages/durable/package.json` |
| `subsys.ai.anthropic-messages` 等 | 从 `source:` 去掉 `deferred-tools.ts` |

rename：`packages/evals/src/smoke.eval.ts` → `packages/evals/evals/smoke.eval.ts`。

## 必须写进正文的架构事实（先读源再写，不要照抄本表当 [E]）

1. **产品版本 `0.87.1`**，wiki target SHA `ff72faba28`。changelog 含 0.86.0–0.87.1 与 Unreleased。
2. **11 个一阶源码包**：原 10 个 + `packages/durable`。根 build 顺序 **chord → tui → telemetry → ai → durable → agent → session-backends/sqlite-node → protocol → client → server → coding-agent**。公开包版本 **0.87.1**。
3. **`@earendil-works/pi-durable`**：runtime-neutral 根导出 `createSession` / `MemoryStorage` / `ROOT_CONVERSATION_ID` / document tokens。Node 子路径 `storage/jsonl/node`、`storage/sqlite/node`。JSONL `fsync` 默认 false。SQLite WAL + `synchronous = NORMAL`。不要把 durable 写成 coding-agent session JSONL 的替代；`pi-session-backend-sqlite-node` 仍在。
4. **Image 统一**：删除 `ImagesModels` / `createImagesModels` / `ImagesProvider` / `builtinImagesModels`。`ImageModel` 必有 `type: "image"`，与 chat 共享 `BaseModel`。`Models.generateImages()` 走 provider auth。OpenRouter 图像模型列在 `openrouter` provider 下，credential 共用。未限定 type 的读取仍是 chat-only。
5. **Classifier**：`Models.classify()`，JEV 风格 `choice`/`score`/`bool`。`KnownClassifierApi` = `typesafe-system-one` | `cloudflare-workers-ai-system-one`。TypeSafe 把 public `bool` 译成 `noul`。OpenRouter `typesafe/jev-1.13` 与 Cloudflare Workers AI `typesafe/jev`。
6. **Catalog v6**：generated 同时有 `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS`。每个 structural shard 三个 export。同一 upstream ID 可按 type 分行。
7. **Providers 42**：`builtinProviders()` 含 `metaProvider()` 与 `typesafeProvider()`。Radius 现有 `radius.models.ts` 静态 shard（上一轮「Radius 不在 MODELS object」已过时）。
8. **`TranscriptContext`**：provider `stream`/`complete` 输入不再是旧 `Context`。system prompt 与 tools 在 transcript system messages 里，用 `getCurrentSystemPrompt()` / `getCurrentTools()`。
9. **`finishTurn`**：删除 `shouldStopAfterTurn`。`finishTurn` 在 assistant+tools finalize 之后、`turn_end` 之前跑；决策在 `turn_end` 之后应用。`{ action: "end" }` 结束正常 run；error/aborted 仍是 hard exit。新增 `prepareRequest`（每次 provider 请求前，含第一次）。
10. **`ContextEditEntry`**：append-only 改未来 provider context，不改 raw history。`session.agent.state.messages` 赋值不再替换未来 request history。`SessionManager` 是 canonical。
11. **Extension 40 个 `on()` 事件**（从 `project_trust` 到 `input`）：新增 `context_with_system`、`cache_warming_decision`、`provider_stream_event`、`agent_before_settle`。`turn_end` / `agent_before_settle` 可返回 `{ entries, continue }`。`context` handler 不再看见 system messages。
12. **Evals**：`evals/` 扁平用例；`src/` runner（cli/docker/plan/report/harness）。`eval:host` vs `eval:docs`（Docker `without_docs`/`with_docs` lift）。`--runs-per-variant` / `PI_EVAL_RUNS_PER_VARIANT`。产物 `.eval/<timestamp>_<id>/`。不要再写 `excludePiDocumentation` 旧切片或 `models.eval.ts`/`providers.eval.ts` 旧路径。
13. **Session persist**：`_hasConversation()` 在出现 user 或 assistant message 后才创建文件（#10000）。
14. **RPC**：成功 `prompt`/`steer`/`follow_up` 带 per-input disposition；`RpcClient.prompt()` 接受 `streamingBehavior`。命令数仍 33。
15. **Slash 24**：`BUILTIN_SLASH_COMMANDS` 含 `bug`。
16. **不要**把 pico 手稿写成 shipped 运行时。
17. **tools 仍 8**；`createCodingToolDefinitions` / `createReadOnlyToolDefinitions` **仍不含** powershell。

## 本轮新节点

4 个，见 `_UPDATE-SCOPE.md` §3。套 `conventions.md` 子系统模板。`pkg: durable` 或 `ai` 或 `coding-agent`。`related` 必须指向已有 id（spine.layered-architecture / ref.package-index / 相邻节点）。

## 不要退役的节点

全部保留。image-generation / image-models / evals 两页 **rewrite**，不要删文件。

## filler 纪律

只写两类文件：

1. 自己批次里的节点 `docs/llm-wiki/pi/<path>`
2. 可选 `_staging/uncertainty-update-ff72faba28-<slug>.md`

禁止改：`index.json`、`llms.txt`、`reference/uncertainty.md`、`README.md`、`conventions.md`、`RUN.md`、`tools/*`、别人批次的节点、`pi/` 源码。

步骤：

1. 读本文件 + `conventions.md` 对应模板 + `_staging/update-facts-ff72faba28.md`。
2. 读现有节点 `.md`（remap 不要写成空模板；rewrite 保留仍成立的问题列表）。
3. 用 `read_file` / `grep` 读 **target** 源码。`source:` 先按上表增补/删除。
4. 每个 load-bearing 论断的 `[E: path:line]` 必须落在被断言的那一行代码上（不是空行/注释/纯括号）。
5. `status: verified`（自己核过至少 3 条 `[E:]`）或 `draft`（核不完），`updated: ff72faba28`，`evidence: explicit`。
6. 跑 lint 时只处理带自己 `node:<path>` 的报错。

### 按批次深度

- **create**：新节点，套模板从源码写满。
- **rewrite**：重写 load-bearing 段与 source/symbols，页结构可留。
- **refresh**：对照变更过的 source 修假话、重落行号、补新行为，不扩写无关段。

质量：不要为过 lint 写空话；不要把官方 `docs/**` 或 pico 手稿当 `[E]`（用户文档可作动机旁证，事实跟代码）；冲突时跟代码。
