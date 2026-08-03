# UPDATE SCOPE — Pi Wiki follow-up（a8ee03b815 → c1019d9202）

> 本文件记录 2026-08-03 的 Pi-only follow-up 增量更新。
> **旧父仓 gitlink / Wiki 基线**：`a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe`
> **目标（官方 `origin/main` remote HEAD）**：`c1019d9202b648143d123b7e6fb76543a6b82de6`
> **跨度**：2 commits · 36 files changed · +502 / -38 · 2026-08-03

复现：

```bash
git -C pi fetch origin main
git -C pi symbolic-ref refs/remotes/origin/HEAD
git -C pi rev-list --count a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe..c1019d9202b648143d123b7e6fb76543a6b82de6
git -C pi diff --shortstat a8ee03b8156c2232d67ad2cdb79683b4a5c8fdbe..c1019d9202b648143d123b7e6fb76543a6b82de6
```

上游提交：

1. `a24fb9e96a3fbc7be2a87e81aa1aa5c0ddf95d35` — `fix(coding-agent): preserve auth header deletion markers (#7539)`
2. `c1019d9202b648143d123b7e6fb76543a6b82de6` — `feat(ai): add Baseten provider`

## 1. 既有节点影响分类

以基线 202 个节点为总体，把每个节点的 frontmatter `source` 与真实 36-file diff 求交：

| 分类 | 节点数 | 判定 |
|---|---:|---|
| A-BROKEN | 0 | diff 无删除/移动文件，既有 source 路径全部保留 |
| B-HEAVY | 0 | 无既有节点达到结构重写判定 |
| C-DRIFT | 30 | 至少一个已有 source 位于真实 diff，均已重锚并重新做语义核验 |
| D-CLEAN | 172 | source content 未变；仍统一刷新并核验目标 SHA |
| 合计 | 202 | 本轮无新增或退役节点 |

30 个 C-DRIFT 节点按面归类：

- spine / lifecycle：`spine.overview`、`spine.process-lifecycle`、`spine.provider-stream`；
- provider surface：`surface.cli.overview`、`surface.modes.print`、`surface.providers.overview`、`surface.providers.auth`、`surface.providers.custom-provider`、`surface.misc.images`、`surface.misc.security`；
- AI subsystem：`subsys.ai.provider-registry`、`subsys.ai.wire-protocol-dispatch`、`subsys.ai.openai-completions`、`subsys.ai.env-api-keys`、`subsys.ai.model-discovery`、`subsys.ai.image-generation`、`subsys.ai.model-catalog-publication`、`subsys.ai.pi-messages`、`subsys.ai.constrained-sampling`、`subsys.ai.provider-retry`；
- coding-agent subsystem：`subsys.coding-agent.model-registry`、`subsys.coding-agent.model-resolver`、`subsys.coding-agent.file-mutation-queue`；
- reference：`ref.ai.provider-catalog`、`ref.ai.model-catalog`、`ref.ai.wire-protocol-catalog`、`ref.ai.core-types`、`ref.coding-agent.env-vars`、`ref.coding-agent.cli-flags`、`ref.coding-agent.json-events`。

`tools/rebase-evidence.mjs --safe-only` 在目标 checkout 上扫描 25 个含受影响 anchors 的文件、33,113 条 citations：33,112 exact、1 contextual、0 fuzzy、0 unresolved；改变 964 个行号。唯一 contextual anchor 位于 `model-registry.ts`，已结合新类型、实现和回归测试人工重写核验。

## 2. 新增与退役判定

- **Wiki 节点**：新增 0，退役 0；节点总数保持 202，T0/T1/T2/T3 为 12/34/121/35，全部 verified，planned 0。
- **源码 surface**：新增 `basetenProvider()`、`BASETEN_MODELS` shard wrapper、`KnownProvider` / `models.generated.ts` / env-key / default-model 注册项和 Baseten reasoning compatibility；这些都属于现有 provider/catalog/model-resolution 节点的扩展面，不需要拆出新 Wiki 节点。
- **source 删除/移动**：0；新增的 `packages/ai/src/providers/baseten.ts` 与 `baseten.models.ts` 已加入相关节点 source。

## 3. 真实增量影响

- **provider registry/catalog**：新增 `baseten`，以 `https://inference.baseten.co/v1` 走 `openai-completions`，读取 `BASETEN_API_KEY`；runtime built-in provider 从 38 增至 39，静态 model bucket 从 37 增至 38。Radius 继续是 runtime-only provider。[E: packages/ai/src/providers/baseten.ts:6] [E: packages/ai/src/providers/baseten.ts:8] [E: packages/ai/src/providers/baseten.ts:10] [E: packages/ai/src/providers/baseten.ts:11] [E: packages/ai/src/providers/baseten.ts:13] [E: packages/ai/src/providers/all.ts:88] [E: packages/ai/src/providers/all.ts:94] [E: packages/ai/src/providers/all.ts:119] [E: packages/ai/src/providers/all.ts:128] [E: packages/ai/src/models.generated.ts:43] [E: packages/ai/src/models.generated.ts:48] [E: packages/ai/src/models.generated.ts:81] [E: packages/ai/src/models.generated.ts:87]
- **model catalog**：target generator 从 models.dev 的 Baseten catalog 排除 `status=deprecated` rows，并为保留模型生成 OpenAI Completions、reasoning toggle/effort、thinking-level map 与成本/窗口元数据。[E: packages/ai/scripts/generate-models.ts:1094] [E: packages/ai/scripts/generate-models.ts:1107] [E: packages/ai/scripts/generate-models.ts:1112] [E: packages/ai/scripts/generate-models.ts:1122] [E: packages/ai/scripts/generate-models.ts:1142] [E: packages/ai/scripts/generate-models.ts:1143] [E: packages/ai/scripts/generate-models.ts:1145] [E: packages/ai/scripts/generate-models.ts:1148] [E: packages/ai/scripts/generate-models.ts:1150] [E: packages/ai/scripts/generate-models.ts:1158] [E: packages/ai/scripts/generate-models.ts:1164] [E: packages/ai/scripts/generate-models.ts:1173] [E: packages/ai/scripts/generate-models.ts:1179] [E: packages/ai/scripts/generate-models.ts:1180] [E: packages/ai/scripts/generate-models.ts:1181]
- **catalog snapshot**：目标 Git tree 不保存 ignored `data/baseten.json`，因此以 2026-08-03T13:10:07Z 获取的 `https://models.dev/api.json`（SHA-256 `b3a52ba98bb4b58714734f8bb98c9bc7ffeff3558f915bcc3211cfe5f276728d`）复核：Baseten 18 rows，其中 16 active、2 deprecated；按 target filter 得到 16，叠加官方 0.83.0 artifact 的 1,153，当前目录为 1,169。[I]
- **model resolver**：Baseten 默认模型新增为 `zai-org/GLM-5.2`。[E: packages/coding-agent/src/core/model-resolver.ts:42]
- **compat schema/API**：`OpenAICompletionsCompat.thinkingFormat` 增加 `baseten`，`chatTemplateArgs` 支持由 `thinking.enabled` 等变量驱动的模板参数；OpenAI Completions request 只在计算后值非 `undefined` 时写入 `chat_template_args`。[E: packages/ai/src/types.ts:547] [E: packages/ai/src/types.ts:557] [E: packages/coding-agent/src/core/model-config.ts:82] [E: packages/coding-agent/src/core/model-config.ts:87] [E: packages/coding-agent/src/core/model-config.ts:98] [E: packages/ai/src/api/openai-completions.ts:774] [E: packages/ai/src/api/openai-completions.ts:779] [E: packages/ai/src/api/openai-completions.ts:781] [E: packages/ai/src/api/openai-completions.ts:861] [E: packages/ai/src/api/openai-completions.ts:875]
- **auth header deletion**：`ProviderHeaders` 允许 `string | null`；case-insensitive merge 保留 `null`，`ModelRegistry.getApiKeyAndHeaders()` 不再过滤 markers，extension 原样传给 provider adapter 后由 API SDK 作为 default-header suppression marker。[E: packages/ai/src/types.ts:108] [E: packages/coding-agent/src/core/model-runtime.ts:81] [E: packages/coding-agent/src/core/model-runtime.ts:92] [E: packages/coding-agent/src/core/model-registry.ts:15] [E: packages/coding-agent/src/core/model-registry.ts:61] [E: packages/coding-agent/src/core/model-registry.ts:74] [E: packages/ai/src/api/openai-completions.ts:662] [E: packages/ai/src/api/openai-completions.ts:672] [E: packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts:91] [E: packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts:99] [E: packages/coding-agent/test/model-runtime-cloudflare-compat.test.ts:100]

## 4. 独立 L2 证伪

按 `RUN.md` 对两条增量分别使用独立只读 verifier：一条证伪 Baseten provider/model/env/reasoning/catalog 结论；另一条证伪 auth deletion/model-registry/model-resolver/custom-provider 结论。初次反例包括 provider title 仍为 38、旧 37-bucket 断言、generator/output 与 env source anchors 漂移、source/Sources 漏项、ambient auth 误述、null-marker 链路时序不准和默认模型选择过度概括；逐项修复后两路 verifier 均最终 PASS，且各自重跑 lint 为 0 error / 0 warning。完整记录见 `_research/update-a8ee03b815-c1019d9202-l2.md`。

## 5. 验证与残余风险

收尾验证命令：

```bash
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
node docs/llm-wiki/pi/tools/reconcile.mjs
node docs/llm-wiki/pi/tools/lint.mjs
git diff --check -- docs/llm-wiki/pi pi
```

最终断言：

- `index.json.updated`、202 个 index node 与所有 node frontmatter 都是 `c1019d9202`；
- index/file tree/`llms.txt` 是同一 202-node 集，0 planned；
- provider catalog 39 rows、静态 model summary 38 rows且总和 1,169、env catalog 94 rows；
- 所有 `[E:path:line]` 路径、范围和代码行有效，lint 为 0 error / 0 warning；
- root gitlink 与 submodule HEAD 都是目标 full SHA，Pi submodule clean；
- root 只 stage `docs/llm-wiki/pi/**` 与 `pi`，不改其他产品 Wiki/submodule。

残余风险：1,169 的精确模型实例数包含远程 models.dev snapshot 推断，因 target Git tree 不保存 `data/baseten.json` 而保持 `[I]`；Pi submodule 未安装依赖，本轮验证以目标源码、上游测试实现和 Wiki reconcile/lint/一致性审计为主，不宣称 Pi runtime test pass。
