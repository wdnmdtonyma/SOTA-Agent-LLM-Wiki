# uncertainty-verify-console

- node: `clients.console`
- SHA: `e207624c48`

## Google thoughts double-count

- claim: Google normalizer already folds `thoughtsTokenCount` into `outputTokens`, but trial limiter and Stats `buildTokenCost` still add `outputTokens + reasoningTokens`.
- status: still `[U]`
- inspected:
  - `packages/console/app/src/routes/zen/util/provider/google.ts:68` `outputTokens: outputTokens + reasoningTokens`
  - `packages/console/app/src/routes/zen/util/trialLimiter.ts:31-34` sums `outputTokens + (reasoningTokens ?? 0)`
  - `packages/stats/core/src/domain/home.ts:743` `item.outputTokens + item.reasoningTokens`
- unresolved: whether that double-count is intended contract.

## providerUsage test vs implementation

- claim: test expects Google `candidates=3, thoughts=2` → `outputTokens=3`; implementation returns 5.
- status: **closed @ e207624c48** — 测试现期待 `outputTokens=5`，与 `google.ts:68` 一致。[E: packages/console/app/test/providerUsage.test.ts:29]
