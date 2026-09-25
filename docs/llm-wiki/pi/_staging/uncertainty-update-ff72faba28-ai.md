# uncertainty-update-ff72faba28-ai

batch: ff72faba28 ai adapters / providers / catalog
nodes: subsys.ai.anthropic-messages, subsys.ai.openai-responses, subsys.ai.openai-codex-responses, spine.provider-stream, subsys.ai.wire-protocol-dispatch, surface.providers.custom-provider, surface.providers.overview, surface.providers.auth, subsys.ai.model-catalog-publication, subsys.ai.openai-completions, subsys.ai.mistral-conversations
updated: ff72faba28
status: draft

本轮只改自己批次的 11 个节点。下列点不能升成 `[E]`。

## [U] Codex `samplingParams` 不写入 body

- 节点: `subsys.ai.openai-codex-responses`
- 本轮指令写「同上」(supportsToolSearch / TranscriptContext / samplingParams 在 direct stream/complete 生效)。
- `OpenAICodexResponsesOptions` 继承 `StreamOptions.samplingParams`,`streamSimple` 也经 `buildBaseOptions` 拷贝该字段,但 `buildRequestBody()` 没有 `Object.assign(body, model.samplingParams, options?.samplingParams)`。
- OpenAI Responses / Completions / Azure Responses 会 merge;Codex 不会。未宣称 Codex wire JSON 含 samplingParams。

## [U] `all.ts` 注释仍说 Radius 无 static catalog

- 节点: `surface.providers.overview`
- `BuiltinProvider = keyof typeof MODELS` 上方注释仍写 KnownProvider additionally includes purely dynamic providers (e.g. `"radius"`) that have no static catalog entry。
- 事实: `MODELS` 有 `"radius"` key,`radius.models.ts` 导出 `RADIUS_MODELS`。以 generated catalog 为准,注释当过时。

## [U] checkout 无法给出 flattened model 总数

- 节点: `subsys.ai.model-catalog-publication`
- `src/providers/data/*.json` 仍 gitignored。可核 42 个 structural bucket 与 `models.all.json` array/`type` 合同,不能从本 SHA checkout 给出 flattened chat/image/classifier 行数。

## [U] OpenAI Responses service-tier 乘数不是远端价表

- 节点: `subsys.ai.openai-responses`
- `flex` ×0.5、`priority` 对 `gpt-5.5` ×2.5、其它 priority ×2 是本地硬编码。价格表变化是否要同步更新,这两个源码文件不能证明。

## [U] 扩展 register/unregister 后当前模型视图

- 节点: `surface.providers.custom-provider`
- `ExtensionRuntimeState` 能确认 bind 前排队、bind 后调 `ModelRegistry`。index source 不能确认 AgentSession 是否在注册/注销后刷新当前已选模型。

## 本轮已核、不进 uncertainty

- 删除 `packages/ai/src/utils/deferred-tools.ts`;Anthropic 走 native `defer_loading` + catalog `supportsMidConvoToolChanges`;Fireworks Messages 仍 `anthropic-messages`;OpenAI/Codex prefix deferral 走 `supportsToolSearch` → `tool_search_*` + `defer_loading`。
- `Models.stream`/`streamSimple` 对 `Context` 做 `normalizeContext()`;provider/`api/*.ts` 只收 `TranscriptContext`;自定义 stream 必须 `getCurrentSystemPrompt`/`getCurrentTools`。
- `onProviderStreamEvent` 在归一化之前观察 parsed provider events。
- `samplingParams` 在 OpenAI Responses / Completions 的 `buildParams` 末尾 merge,因此 direct stream/complete 生效。
- `builtinProviders()` 与 generated `MODELS` 都是 42(+meta +typesafe +radius shard)。
- Meta Muse OAuth + `META_API_KEY`;TypeSafe 仅 `TYPESAFE_API_KEY`。
- 本地 model-data schema **v6**(`hydrate:model-data`);published catalog protocol 仍 **v1**;`models.all.json` 是 array,`types` 为 chat/image/classifier。
- Completions 空 text part 不发给 multimodal;unknown OpenAI-compat 默认 `supportsStrictMode: false`。
- Mistral 忽略 empty content deltas;`zai-glm-5-2` 走 `reasoning_effort`。
- 未改 `index.json` / `llms.txt` / `tools/` / `pi` 源码 / 别人批次节点。
