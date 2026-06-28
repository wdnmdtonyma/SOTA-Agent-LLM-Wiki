# Uncertainty staging: ai env-api-keys

Node: `subsys.ai.env-api-keys`
Status: L2 verified; no unresolved unknown-evidence claims left in the node.

Notes for later catalog work:

- `getApiKeyEnvVars` is private but requested as the covered symbol for this node; the public consumers are `findEnvKeys` and `getEnvApiKey`.
- `getApiKeyEnvVars` should not be treated as the sole auth mapping for newer provider auth implementations; custom `ApiKeyAuth` definitions may carry their own env var lists.
- L2 downgraded cross-module/wire-protocol statements to `[I]` boundary notes where the supplied source files do not directly evidence them.
