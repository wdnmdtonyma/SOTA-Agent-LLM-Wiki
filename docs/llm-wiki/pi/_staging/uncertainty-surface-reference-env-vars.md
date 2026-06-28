# Uncertainty staging: surface reference env vars

Node: `ref.coding-agent.env-vars`

Batch: `surface`

## Items

- [U] 本节点刻意限定为 coding-agent 产品层和它直接调用的 `pi-ai` provider/env 通道;`packages/orchestrator` 的 Radius / orchestrator env 和纯 `packages/tui` 内部 debug env 没有并入 `ref.coding-agent.env-vars`。如果后续要做全仓库 env catalog,需要新增 cross/package-specific catalog 或扩大本节点范围。
- [U] `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` 在用户文档中作为 Bedrock proxy env 出现,但当前核查到的 source set 没有显式 `getProviderEnvValue()` / `process.env` 读取;行为可能由 AWS SDK 默认 env 机制承接。
- [U] `OPENROUTER_API_KEY` 在 `env-api-keys.ts` 覆盖 text provider `openrouter`;OpenRouter image provider 也使用同名 env,但本节点没有把 image provider catalog 作为逐实例权威来源展开。
