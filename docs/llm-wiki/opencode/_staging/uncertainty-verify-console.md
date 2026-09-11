# uncertainty-verify-console

- batch: `L2-console-sst`
- nodes: `clients.console`, `infra.sst`
- SHA: `b3f1a96c6d`

## Still [U]: Google thoughts double-count

- claim: Google normalizer already folds `thoughtsTokenCount` into `outputTokens`, but trial limiter and Stats `buildTokenCost` still add `outputTokens + reasoningTokens`.
- status: still `[U]`
- inspected:
  - `packages/console/app/src/routes/zen/util/provider/google.ts:68` `outputTokens: outputTokens + reasoningTokens`
  - `packages/console/app/src/routes/zen/util/trialLimiter.ts:31-34` sums `outputTokens + (reasoningTokens ?? 0)`
  - `packages/stats/core/src/domain/home.ts:743` `item.outputTokens + item.reasoningTokens`
- unresolved: whether that double-count is intended contract.

## L2-console-sst @ b3f1a96c6d

Must-confirm items held after source read:

- handler `if (model)` → `proxyInference` before validate/rate-limit/auth; BYOK provider/native model only when `modelList === "full"`.
- `paths` includes Go POST + `GET /zen/v1/models` + `GET /zen/go/v1/{models,usage}`.
- `/zen/go/` sets `go=true` so ProviderTable join is `sql\`false\``.
- `generation` optional; GET is `new Request(destination, request)`.
- `inferenceUnavailable` 503 message is exact: `Inference routing is unavailable. Please retry later.`
- `proxyModels()` gone from tree.
- `GET /oauth/opencode/client.json`: `client_id = origin + PATH`, `native`, loopback no port, `token_endpoint_auth_method: none`.
- `go-models.ts` is UI allowance table, not live zen catalog; `deepseek-flash` / DeepSeek V4.1 Flash / `bonus: 4`; no Omen Alpha.
- `ZEN_LITE_PRICE` dev hardcodes `prod_U1tUscpmwtV2bG` / `price_1T3phhE7fOCwHSD4zS6w2NPy`; other stages use `zenLiteProduct.id` / `zenLitePrice.id`.
- `infra/console.ts` migration URLs still at 226/228/230/231 after the preview-branch comment.

Fixed in `clients.console` (wording / [E] only): GET Request init, Google BYOK `/models/${model}` path, `inferenceUnavailable` cite 114, google normalize cite 62, go models proxy cite 11.
