# uncertainty · surface.misc.images

- [U] `surface.misc.images` 没有逐项枚举 text/chat model catalog 中哪些模型可消费 user `ImageContent`;该清单应由 `ref.ai.model-catalog` 或一个专门的 vision-model slice 从 `packages/ai/src/models.generated.ts` 机械派生。
- [U] 当前节点只按 `packages/ai/src/providers/all.ts` 核到 built-in image-generation provider 为 OpenRouter;没有追 `createImagesModels()` 的外部调用方是否会注册第三方 image provider。
