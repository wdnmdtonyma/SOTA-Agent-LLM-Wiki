# uncertainty-update-console

- SHA: `b3f1a96c6d`
- node: `clients.console`

## 仍 [U]

Google normalizer 已把 `thoughtsTokenCount` 加进 `outputTokens`，但 trial limiter / Stats `buildTokenCost` 仍做 `outputTokens + reasoningTokens`。对 Google 行可能二次计入 thoughts；是否应改契约未确认。详见 `uncertainty-batch-hosted`。[E: packages/stats/core/src/domain/home.ts:743]

## 已关闭

- `providerUsage.test.ts` 现期待 `candidates=3, thoughts=2` → `outputTokens=5`，与 `google.ts:68` 一致；上一轮“测试期待 3 / 实现返回 5”张力已消失。[E: packages/console/app/test/providerUsage.test.ts:29]
- `proxyInference` 只覆盖 full catalog / 不覆盖 Go-lite：已否。handler 在 truthy `model` 时即调用；paths 含 `/zen/go/v1/*` 与 models/usage GET。
