# uncertainty-ai-openai-responses

- `subsys.ai.openai-responses`: service tier cost multiplier 在 `packages/ai/src/api/openai-responses.ts` 中硬编码为 flex `0.5`、priority `2` / `2.5`,但本轮未核 OpenAI 外部价格表或项目设计文档,因此只能证明代码行为,不能证明价格策略仍与上游计费一致。[U]
