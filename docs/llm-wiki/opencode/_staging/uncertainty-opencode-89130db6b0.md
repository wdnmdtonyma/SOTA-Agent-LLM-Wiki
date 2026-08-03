# uncertainty-opencode-89130db6b0

- `clients.console`: Google usage normalization now includes `thoughtsTokenCount` inside `outputTokens` while generic trial-limiter and Stats presentation paths still add `reasoningTokens` separately. Whether those downstream consumers should change to avoid double-counting Google thoughts is unresolved. [U]
- `clients.console`: `packages/console/app/test/providerUsage.test.ts` still expects Google candidate tokens without thoughts in `outputTokens`, while the target implementation returns candidates plus thoughts. The intended test/contract update is unresolved. [U]
