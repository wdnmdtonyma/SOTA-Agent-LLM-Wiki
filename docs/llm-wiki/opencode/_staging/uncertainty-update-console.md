# uncertainty-update-console

- Google usage normalizer 把 `thoughtsTokenCount` 加进 `outputTokens`，但 trial limiter / Stats `buildTokenCost` 仍做 `outputTokens + reasoningTokens`。对 Google 行可能二次计入 thoughts；是否应改契约未确认。[E: packages/console/app/src/routes/zen/util/provider/google.ts:68][E: packages/console/app/src/routes/zen/util/trialLimiter.ts:31][E: packages/stats/core/src/domain/home.ts:735][U]
- `providerUsage.test.ts` 仍期待 `candidates=3, thoughts=2` → `outputTokens=3`，实现返回 5。源码/测试张力，不是已验证通过行为。[E: packages/console/app/test/providerUsage.test.ts:27][E: packages/console/app/src/routes/zen/util/provider/google.ts:68][U]
