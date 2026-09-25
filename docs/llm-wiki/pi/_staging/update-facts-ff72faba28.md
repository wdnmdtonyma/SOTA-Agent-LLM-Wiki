# 本轮硬事实（ff72faba28）— filler 读，勿当 [E] 照抄

对照源码写。SHA `ff72faba28`。产品 0.87.1 + Unreleased。

- 新包 `@earendil-works/pi-durable` 0.87.1。build：chord → tui → telemetry → ai → **durable** → agent → sqlite-node → protocol → client → server → coding-agent。一阶包 **11**。
- Image：`Models.generateImages()`；删除 `ImagesModels` / `images-models.ts` / `image-models.generated.ts` / `providers/openrouter-images.ts`。`KnownImageApi = "openrouter-images"`。实现 `api/openrouter-images.ts`。
- Classifier：`Models.classify()`；`KnownClassifierApi` = `typesafe-system-one` | `cloudflare-workers-ai-system-one`。providers **42**（+meta +typesafe）。buckets **42**（+meta +typesafe +radius shard）。
- `MODELS` / `IMAGE_MODELS` / `CLASSIFIER_MODELS` 三个 generated object。
- `TranscriptContext`；`getCurrentSystemPrompt()` / `getCurrentTools()`。
- 删除 `shouldStopAfterTurn`；用 `finishTurn` + `prepareRequest`。
- `ContextEditEntry`；SessionManager canonical。
- Extension `on()` **40**：+`context_with_system` +`cache_warming_decision` +`provider_stream_event` +`agent_before_settle`。
- Evals：`packages/evals/{src,evals,docker}/`。host vs docs Docker lift。旧 `pi-harness.ts` / `vitest-evals/` 已删。
- Session 文件在第一条 user 或 assistant message 时创建（`_hasConversation`）。
- Slash **24**（+`/bug`）。RPC **33**（prompt 增 `streamingBehavior` + disposition）。tools **8**。
- DeepSeek 硬编码仍是 `deepseek-flash` + `deepseek-v4-pro`（无 `deepseek-v4-flash-vision-exp`）。
- 删除 `packages/ai/src/utils/deferred-tools.ts`。
- 不要写 pico。durable docs/pico* 不是 shipped 运行时证据。
