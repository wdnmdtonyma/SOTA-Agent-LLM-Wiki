# uncertainty-ai-image-models

- [U] `openrouter/auto` 在 generated catalog 中声明 `cost.input=-1000000` 和 `cost.output=-1000000`,但本轮只从指定 source 核到数值本身,没有核到负数成本的产品语义或上游约定。证据: [E: packages/ai/src/image-models.generated.ts:272] [E: packages/ai/src/image-models.generated.ts:273]
