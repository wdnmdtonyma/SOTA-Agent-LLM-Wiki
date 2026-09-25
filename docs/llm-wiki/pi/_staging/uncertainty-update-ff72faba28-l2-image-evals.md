# uncertainty-update-ff72faba28-l2-image-evals

L2 节点：`subsys.ai.classifiers`、`subsys.ai.image-generation`、`ref.ai.image-models`、`surface.misc.images`、`subsys.ai.model-discovery`、`subsys.evals.pi-harness`、`subsys.evals.comparative-harness`

updated: ff72faba28
status: no-new-U

本轮七个节点正文没有新增 `[U]`。下列点保持节点内已有 `[I]`，不能升 `[E]`。

## 已核、不进 uncertainty

- `ImagesModels` / `packages/ai/src/images-models.ts` / `image-models.generated.ts` / `providers/openrouter-images.ts` 在 `ff72faba28` 树中不存在。现存 shipped 源是 `api/openrouter-images.ts`、`providers/images/register-builtins.ts`、`models.generated.ts` 的 `IMAGE_MODELS`，以及 deprecated 的 `image-models.ts` 静态读取。
- `ImageModel.type` 必为 `"image"`；未限定 type 的 `getModel` / `getBuiltinModels` / `provider.getModels()` 仍 chat-only。
- `KnownClassifierApi = "typesafe-system-one" | "cloudflare-workers-ai-system-one"`。公开 `bool` 在 `wireRequest` 写成 wire `noul`，`parseAnswers` 映回 `ClassifierBoolAnswer`。
- `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 三个 generated object，各 42 个 bucket（含 `meta` / `typesafe` / `radius`）。
- evals：`evals/` 扁平用例 + `src/{cli,docker,plan,report,harness}.ts`；`eval:host` vs `eval:docs`。已删 `packages/evals/src/pi-harness.ts` 与 `src/vitest-evals/`。`excludePiDocumentation` 仍在 `harness.ts`，剥的是 `\n<docs>\n`…`\n</docs>` XML 段，不是旧纯文本切片。
- OpenRouter 图像 / 分类器的逐 id 清单只在 gitignored `providers/data/*.json`。节点已标 `[I]`，本 checkout 不能枚举全量 id。

## 历史 staging（非本七节点，reconcile 时勿当现行证据）

`_staging/uncertainty-ai-image-models.md` 仍用已删除的 `image-models.generated.ts` 行号谈 `openrouter/auto` 负成本。那不是本轮节点 `[U]`，也不是 `ff72faba28` shipped 源。
