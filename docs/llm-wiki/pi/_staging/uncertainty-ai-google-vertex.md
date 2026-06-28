# Uncertainty staging: ai/google-vertex

本轮 L2 将以下原 `[E]` 降级为 `[U]`,因为本节点 source 只包含 `packages/ai/src/api/google-vertex.ts` 与 `packages/ai/src/api/google-shared.ts`,未包含对应的 sibling/env 文件:

- `[U]` `google-generative-ai.ts` 的 API-key-only 行为、non-Vertex client construction、`streamSimple` 必需 API key、以及 Gemma 4 thinking-level 特例需要在 `subsys.ai.google-generative-ai` 或该文件 source 中单独核验。
- `[U]` `env-api-keys.ts` 中 `GOOGLE_CLOUD_API_KEY` 的 provider env 映射、ADC readiness 检测、以及 `"<authenticated>"` marker 返回条件需要在 `subsys.ai.env-api-keys` 或该文件 source 中单独核验。
