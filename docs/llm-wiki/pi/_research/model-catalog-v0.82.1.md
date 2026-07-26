# Pi AI v0.82.1 模型目录制品核验

- 目标源码：`cee5ff7520d8828bed9955ef00419e995d1f91e0`
- npm 包：`@earendil-works/pi-ai@0.82.1`
- npm tarball SHA-256：`2f9df9522808b621cd3449876537f03d8a8df8b8d7ec2d5b18c6a910aa85b490`
- model-data manifest：schema 3，generated at `2026-07-25T12:44:19.521Z`
- structure hash：`1a3c7cf59ada71c94abe4540976960524ee933034491c75d6418e2abc1b42535`
- 结果：37 个静态 provider bucket，1,109 个模型。

## 为什么需要制品

目标 commit 中的 `*.models.ts` 只 import 被 `.gitignore` 排除的 `src/providers/data/*.json`，然后通过 `ModelCatalog` / `flattenModelCatalog()` 暴露类型化目录。Git tree 可以显式证明 37 个 provider bucket、生成协议和运行时装配，但不能逐条证明 JSON 中的 model id/api/value。因此 `ref.ai.model-catalog` 的逐模型行标为 `[I]`，不伪装为 commit 内 `[E]`。

## 关联核验

1. `npm pack @earendil-works/pi-ai@0.82.1` 下载官方包并计算 tarball SHA-256。
2. 包内 `dist/model-catalog.js.map` 的 `sourcesContent` 与目标 commit 的 `packages/ai/src/model-catalog.ts` 字节等价。
3. 包内 `dist/models.generated.js.map` 的 `sourcesContent` 与目标 commit 的 `packages/ai/src/models.generated.ts` 字节等价。
4. manifest 的每个 provider JSON SHA-256 与包内文件内容一致；provider 文件集合与目标 `MODELS` 的 37 个 bucket 一致。
5. 遍历每个 JSON 的 API group，验证每个 model object 的 `id`、`provider`、`api` 与所在 key/group 一致后生成 Wiki 表。

这组检查支持“该 v0.82.1 制品与目标源码的生成结构一致”的推断，但 npm metadata 没有嵌入 `gitHead`，因此不能把 1,109 行降级项提升为 commit 内显式证据。

## Provider 计数

| provider | models |
|---|---:|
| amazon-bedrock | 114 |
| ant-ling | 3 |
| anthropic | 15 |
| azure-openai-responses | 38 |
| cerebras | 3 |
| cloudflare-ai-gateway | 42 |
| cloudflare-workers-ai | 13 |
| deepseek | 2 |
| fireworks | 16 |
| github-copilot | 29 |
| google-vertex | 12 |
| google | 24 |
| groq | 7 |
| huggingface | 50 |
| kimi-coding | 4 |
| minimax-cn | 3 |
| minimax | 3 |
| mistral | 30 |
| moonshotai-cn | 10 |
| moonshotai | 10 |
| nvidia | 18 |
| openai-codex | 7 |
| openai | 38 |
| opencode-go | 16 |
| opencode | 58 |
| openrouter | 276 |
| qwen-token-plan-cn | 15 |
| qwen-token-plan | 15 |
| together | 16 |
| vercel-ai-gateway | 192 |
| xai | 3 |
| xiaomi-token-plan-ams | 3 |
| xiaomi-token-plan-cn | 3 |
| xiaomi-token-plan-sgp | 3 |
| xiaomi | 6 |
| zai-coding-cn | 6 |
| zai | 6 |

## API 计数

| api | models |
|---|---:|
| anthropic-messages | 276 |
| azure-openai-responses | 38 |
| bedrock-converse-stream | 114 |
| google-generative-ai | 29 |
| google-vertex | 12 |
| mistral-conversations | 30 |
| openai-codex-responses | 7 |
| openai-completions | 512 |
| openai-responses | 91 |
