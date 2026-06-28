# uncertainty: subsys.ai.image-generation

- [U] 当前节点按任务指定 source 只核了 `packages/ai/src/images-models.ts`、`packages/ai/src/images.ts`、`packages/ai/src/providers/openrouter-images.ts`。从这些文件能确认 `openrouterImagesProvider()` 这个内置 image provider binding,但未在本节点内核完整 builtin registration 是否只包含 OpenRouter;若 L2 需要断言“唯一内置 image provider”,应追加核 `packages/ai/src/providers/images/register-builtins.ts` 与相关 registry 文件。
