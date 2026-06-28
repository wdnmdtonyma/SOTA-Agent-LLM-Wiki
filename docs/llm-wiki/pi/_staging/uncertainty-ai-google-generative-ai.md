# uncertainty-ai-google-generative-ai

- none: L2 核验后没有留下需要上卷到 `reference/uncertainty.md` 的 `[U]`。本轮把 `subsys.ai.google-generative-ai` 中几处过度概括收紧为可由源码逐行核验的表述: `streamSimple` 的 thinking-level 分支明确为 Gemini 3 Pro、Gemini 3 Flash/Lite 和 Gemma 4;Vertex client 对比拆成 ADC client 与 API-key client;`transformMessages` 相关描述不再声称未引用源码的跨 provider replay normalization;禁用 thinking 的 fallback 改为“未命中特殊分支的模型回退到 budget 0”。
