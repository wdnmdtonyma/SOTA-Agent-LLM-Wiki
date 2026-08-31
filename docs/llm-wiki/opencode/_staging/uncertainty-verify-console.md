# uncertainty-verify-console

- node: `clients.console`
- SHA: `9f69463f1d`

## Google thoughts double-count

- claim: Google normalizer already folds `thoughtsTokenCount` into `outputTokens`, but trial limiter and Stats `buildTokenCost` still add `outputTokens + reasoningTokens`.
- status: still `[U]`
- inspected:
  - `packages/console/app/src/routes/zen/util/provider/google.ts:68` `outputTokens: outputTokens + reasoningTokens`
  - `packages/console/app/src/routes/zen/util/trialLimiter.ts:31-34` sums `outputTokens + (reasoningTokens ?? 0)`
  - `packages/stats/core/src/domain/home.ts:735` `item.outputTokens + item.reasoningTokens`
- unresolved: whether that double-count is intended contract.

## providerUsage test vs implementation

- claim: test expects Google `candidates=3, thoughts=2` → `outputTokens=3`; implementation returns 5.
- status: still `[U]`
- inspected:
  - `packages/console/app/test/providerUsage.test.ts:27-29`
  - `packages/console/app/src/routes/zen/util/provider/google.ts:68`
- unresolved: source/test tension, not verified passing behavior.
