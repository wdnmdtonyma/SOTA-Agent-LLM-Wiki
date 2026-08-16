# uncertainty-update-086c32e745-provider-env-mistral

Nodes: `ref.ai.provider-catalog`, `ref.ai.model-catalog`, `subsys.ai.provider-registry`, `subsys.ai.env-api-keys`, `ref.coding-agent.env-vars`, `surface.providers.overview`, `subsys.ai.mistral-conversations`

- [U] `tools/generate-model-catalog.mjs` 仍按旧的逐模型 `Model<"api"> & { id; provider }` shard 形态解析。`086c32e745` 的 `*.models.ts` 已是 `flattenModelCatalog(provider, values)` wrapper，JSON 被 gitignore；生成器对本 commit 抛 `No model shapes found`。本轮未改该脚本。因此 `ref.ai.model-catalog` 只能核 39 个 structural bucket，不能从 checkout 给出完整逐 id/`Model.api` 表。
- [U] `QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS` 的 7 个 id 是 `generate-models.ts` 的 allowlist，不是 gitignored `data/qwen-token-plan-individual.json` 的 membership 证明。生成时若远端 catalog 缺行，JSON 可能少于 7。
- [U] `ref.coding-agent.env-vars` 仍限定 coding-agent 产品层与它直接消费的 `pi-ai` provider/env 通道。`packages/tui` 内部 debug/build env（`PI_TUI_WRITE_LOG`、`PI_TUI_DEBUG`、`PI_DEBUG_REDRAW`、`PI_TUI_WIN32_TOOLCHAIN`）和测试门 `PI_NO_LOCAL_LLM` 未并入逐实例表。本轮只新增用户可见的 `PI_TUI_ESC_TIMEOUT`。
- [U] `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` 仍只出现在 `packages/coding-agent/docs/providers.md`；本节点 source set 没有显式 `getProviderEnvValue()` / `process.env` 读取，行为可能由 AWS SDK 默认 env 承接。
