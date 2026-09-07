# uncertainty-batch-hosted

- `clients.console`: Google usage normalization 把 `thoughtsTokenCount` 加进 `outputTokens`，同时仍单独保留 `reasoningTokens`。generic trial limiter 把 `outputTokens + reasoningTokens` 再相加，Stats `buildTokenCost` 也用 `outputTokens + reasoningTokens` 做 output cost-per-million。对 Google usage 是否二次计算 thoughts、下游契约应否改，当前源码无法判定。[U]
  - [E: packages/console/app/src/routes/zen/util/provider/google.ts:68]
  - [E: packages/console/app/src/routes/zen/util/trialLimiter.ts:31]
  - [E: packages/console/app/src/routes/zen/util/trialLimiter.ts:33]
  - [E: packages/console/app/src/routes/zen/util/trialLimiter.ts:34]
  - [E: packages/stats/core/src/domain/home.ts:743]
