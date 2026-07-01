---
id: session-v1.llm-runtime
title: LLM 服务与 runtime seam(AI-SDK vs native)
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/session/llm.ts, packages/opencode/src/session/llm/ai-sdk.ts, packages/opencode/src/session/llm/native-runtime.ts, packages/opencode/src/session/llm/native-request.ts, packages/opencode/src/session/llm/request.ts, packages/opencode/src/session/llm/AGENTS.md, packages/opencode/src/effect/runtime-flags.ts]
symbols: [LLM, LLM.stream, LLM.run, LLMRequestPrep.prepare, LLMAISDK.toLLMEvents, LLMNativeRuntime.stream, LLMNative.request]
related: [model-layer.llm-protocol-engine, spine.v1-v2-relationship]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 `LLM.Service` 是每次 provider request 的 runtime seam:默认调用 Vercel AI SDK `streamText`,仅当 `OPENCODE_EXPERIMENTAL_NATIVE_LLM` 打开且当前 provider/model 支持时改走 `@opencode-ai/llm` native runtime。

## 能回答的问题
- V1 模型调用的默认 runtime 是什么?
- `OPENCODE_EXPERIMENTAL_NATIVE_LLM` 打开后 native runtime 如何按请求决定支持或 fallback?
- `LLMRequestPrep.prepare` 怎样合成 system、messages、tools、params、headers?
- AI SDK `fullStream` 怎样归一化成 `LLMEvent`?
- native runtime 是否把工具执行交给 `packages/llm` 接管?

## 职责边界

`LLM.StreamInput` 是 V1 session 层交给模型层的规范化输入:包含 user/sessionID/model/agent/permission/system/messages/tools/retries/toolChoice 等字段。[E: packages/opencode/src/session/llm.ts:36][E: packages/opencode/src/session/llm.ts:37][E: packages/opencode/src/session/llm.ts:39][E: packages/opencode/src/session/llm.ts:40][E: packages/opencode/src/session/llm.ts:41][E: packages/opencode/src/session/llm.ts:42][E: packages/opencode/src/session/llm.ts:43][E: packages/opencode/src/session/llm.ts:45][E: packages/opencode/src/session/llm.ts:46][E: packages/opencode/src/session/llm.ts:47]

`LLM.Service` 的 `stream(input)` 返回 `Stream.Stream<LLMEvent, unknown>`;`SessionProcessor` 把 stream event typed 为 `LLMEvent` 并交给 `handleEvent`,实际 runtime 是 AI SDK 还是 native 由 `LLM.Service` seam 隔离。[E: packages/opencode/src/session/llm.ts:54][E: packages/opencode/src/session/llm.ts:55][E: packages/opencode/src/session/processor.ts:27][E: packages/opencode/src/session/processor.ts:77][E: packages/opencode/src/session/processor.ts:276][E: packages/opencode/src/session/processor.ts:638][E: packages/opencode/src/session/processor.ts:641][I]

`session/llm/AGENTS.md` 把边界写得很明确:`../llm.ts` 拥有 auth/config/model/provider/plugin/permission/telemetry/runtime selection 等 opencode concerns,子目录适配器只负责 AI SDK fullStream 转 event、native request lowering、native runtime gate/tool bridge/LLMClient handoff。[E: packages/opencode/src/session/llm/AGENTS.md:3][E: packages/opencode/src/session/llm/AGENTS.md:7][E: packages/opencode/src/session/llm/AGENTS.md:8][E: packages/opencode/src/session/llm/AGENTS.md:9]

## 数据模型

| 实体 | 字段/职责 | 说明 |
|---|---|---|
| `LLMRequestPrep.Prepared` | `system`, `messages`, `tools`, `params`, `messageTransformOptions`, `headers` | request prep 把 provider/model/agent/plugin/user/runtime flags 的 V1 request 语义合并成两个 runtime 都能使用的中间态。[E: packages/opencode/src/session/llm/request.ts:20][E: packages/opencode/src/session/llm/request.ts:34][E: packages/opencode/src/session/llm/request.ts:39][E: packages/opencode/src/session/llm/request.ts:40][E: packages/opencode/src/session/llm/request.ts:41][E: packages/opencode/src/session/llm/request.ts:42][E: packages/opencode/src/session/llm/request.ts:49][E: packages/opencode/src/session/llm/request.ts:50] |
| `LLMAISDK.adapterState` | step/text/reasoning counters, current block ids, tool name map, Copilot billing accumulator | AI SDK fullStream event id 缺失时,adapter state 会补稳定 text/reasoning ids,并追踪 tool name 与 Copilot billing accumulator。[E: packages/opencode/src/session/llm/ai-sdk.ts:9][E: packages/opencode/src/session/llm/ai-sdk.ts:11][E: packages/opencode/src/session/llm/ai-sdk.ts:12][E: packages/opencode/src/session/llm/ai-sdk.ts:13][E: packages/opencode/src/session/llm/ai-sdk.ts:14][E: packages/opencode/src/session/llm/ai-sdk.ts:15][E: packages/opencode/src/session/llm/ai-sdk.ts:16][E: packages/opencode/src/session/llm/ai-sdk.ts:17][E: packages/opencode/src/session/llm/ai-sdk.ts:66][E: packages/opencode/src/session/llm/ai-sdk.ts:67][E: packages/opencode/src/session/llm/ai-sdk.ts:71][E: packages/opencode/src/session/llm/ai-sdk.ts:72] |
| `LLMNativeRuntime.RuntimeStatus` | `supported` with `apiKey/baseURL` or `unsupported` with `reason` | native runtime 先做 provider/package/OAuth/API-key gate,不支持时返回 reason 让 `llm.ts` fallback 到 AI SDK。[E: packages/opencode/src/session/llm/native-runtime.ts:22][E: packages/opencode/src/session/llm/native-runtime.ts:23][E: packages/opencode/src/session/llm/native-runtime.ts:24][E: packages/opencode/src/session/llm/native-runtime.ts:46][E: packages/opencode/src/session/llm/native-runtime.ts:54][E: packages/opencode/src/session/llm/native-runtime.ts:56][E: packages/opencode/src/session/llm/native-runtime.ts:58][E: packages/opencode/src/session/llm/native-runtime.ts:59][E: packages/opencode/src/session/llm/native-runtime.ts:60][E: packages/opencode/src/session/llm/native-runtime.ts:61][E: packages/opencode/src/session/llm/native-runtime.ts:64][E: packages/opencode/src/session/llm/native-runtime.ts:65][E: packages/opencode/src/session/llm.ts:254][E: packages/opencode/src/session/llm.ts:279] |
| `LLMNative.request` | `LLM.request({ model, system, messages, tools, toolChoice, generation, providerOptions })` | native request adapter 把 AI SDK-shaped V1 session input 转成 `@opencode-ai/llm` canonical request;边界文档要求只有 `native-request.ts` 构造这些 canonical values。[E: packages/opencode/src/session/llm/native-request.ts:181][E: packages/opencode/src/session/llm/native-request.ts:185][E: packages/opencode/src/session/llm/native-request.ts:186][E: packages/opencode/src/session/llm/native-request.ts:187][E: packages/opencode/src/session/llm/native-request.ts:188][E: packages/opencode/src/session/llm/native-request.ts:189][E: packages/opencode/src/session/llm/native-request.ts:190][E: packages/opencode/src/session/llm/native-request.ts:191][E: packages/opencode/src/session/llm/native-request.ts:192][E: packages/opencode/src/session/llm/AGENTS.md:29] |

## 控制流

1. `LLM.run` 先并发读取 language model、config、provider info 和 auth account;随后调用 `LLMRequestPrep.prepare`。[E: packages/opencode/src/session/llm.ts:85][E: packages/opencode/src/session/llm.ts:95][E: packages/opencode/src/session/llm.ts:97][E: packages/opencode/src/session/llm.ts:98][E: packages/opencode/src/session/llm.ts:99][E: packages/opencode/src/session/llm.ts:100][E: packages/opencode/src/session/llm.ts:102][E: packages/opencode/src/session/llm.ts:106]

2. `LLMRequestPrep.prepare` 合成 system:agent prompt 优先,否则使用 provider-family `SystemPrompt.provider(input.model)`,再拼 `input.system` 与 user message 上的 `system`。[E: packages/opencode/src/session/llm/request.ts:56][E: packages/opencode/src/session/llm/request.ts:58][E: packages/opencode/src/session/llm/request.ts:60][E: packages/opencode/src/session/llm/request.ts:61][E: packages/opencode/src/session/llm/request.ts:62]

3. `LLMRequestPrep.prepare` 触发 `experimental.chat.system.transform` hook,然后合并 provider/model/agent/variant options;OpenAI OAuth 会把 system 作为 `options.instructions`,并保持 messages 不加 system role。[E: packages/opencode/src/session/llm/request.ts:70][E: packages/opencode/src/session/llm/request.ts:80][E: packages/opencode/src/session/llm/request.ts:84][E: packages/opencode/src/session/llm/request.ts:91][E: packages/opencode/src/session/llm/request.ts:99][E: packages/opencode/src/session/llm/request.ts:102][E: packages/opencode/src/session/llm/request.ts:103]

4. `chat.params` plugin hook 生成 temperature/topP/topK/maxOutputTokens/options;`chat.headers` hook 生成额外 headers;随后 `resolveTools` 依据 agent/session permission 与 user-level `tools` 开关过滤 tool map。[E: packages/opencode/src/session/llm/request.ts:115][E: packages/opencode/src/session/llm/request.ts:124][E: packages/opencode/src/session/llm/request.ts:127][E: packages/opencode/src/session/llm/request.ts:128][E: packages/opencode/src/session/llm/request.ts:129][E: packages/opencode/src/session/llm/request.ts:130][E: packages/opencode/src/session/llm/request.ts:135][E: packages/opencode/src/session/llm/request.ts:148][E: packages/opencode/src/session/llm/request.ts:208][E: packages/opencode/src/session/llm/request.ts:209][E: packages/opencode/src/session/llm/request.ts:211][E: packages/opencode/src/session/llm/request.ts:213]

5. Prepared headers 对 opencode-managed providers 写 optional `x-opencode-project` 以及 `x-opencode-session/request/client`,对其它 provider 写 `x-session-affinity`、`X-Session-Id`、optional `x-parent-session-id` 和 `User-Agent`。[E: packages/opencode/src/session/llm/request.ts:177][E: packages/opencode/src/session/llm/request.ts:178][E: packages/opencode/src/session/llm/request.ts:187][E: packages/opencode/src/session/llm/request.ts:188][E: packages/opencode/src/session/llm/request.ts:191][E: packages/opencode/src/session/llm/request.ts:192][E: packages/opencode/src/session/llm/request.ts:193][E: packages/opencode/src/session/llm/request.ts:194][E: packages/opencode/src/session/llm/request.ts:197][E: packages/opencode/src/session/llm/request.ts:198][E: packages/opencode/src/session/llm/request.ts:199][E: packages/opencode/src/session/llm/request.ts:200]

6. 如果 `flags.experimentalNativeLlm` 为 true,`LLM.run` 调 `LLMNativeRuntime.stream(...)`;native 返回 supported 时直接返回 native event stream。[E: packages/opencode/src/session/llm.ts:226][E: packages/opencode/src/session/llm.ts:227][E: packages/opencode/src/session/llm.ts:243][E: packages/opencode/src/session/llm.ts:249][E: packages/opencode/src/session/llm.ts:251]

7. native 不支持时,`LLM.run` 记录 `native_unsupported_reason` 并继续走 AI SDK branch;没有打开 flag 时直接走 AI SDK branch。[E: packages/opencode/src/session/llm.ts:254][E: packages/opencode/src/session/llm.ts:258][E: packages/opencode/src/session/llm.ts:260][E: packages/opencode/src/session/llm.ts:271][E: packages/opencode/src/session/llm.ts:279]

8. AI SDK branch 调 `streamText({ ... })`,传入 prepared params、provider options、activeTools、tools、toolChoice、maxOutputTokens、headers、maxRetries、messages 和 wrapped language model。[E: packages/opencode/src/session/llm.ts:280][E: packages/opencode/src/session/llm.ts:313][E: packages/opencode/src/session/llm.ts:314][E: packages/opencode/src/session/llm.ts:315][E: packages/opencode/src/session/llm.ts:316][E: packages/opencode/src/session/llm.ts:317][E: packages/opencode/src/session/llm.ts:318][E: packages/opencode/src/session/llm.ts:319][E: packages/opencode/src/session/llm.ts:320][E: packages/opencode/src/session/llm.ts:322][E: packages/opencode/src/session/llm.ts:323][E: packages/opencode/src/session/llm.ts:324][E: packages/opencode/src/session/llm.ts:325]

9. `LLM.stream` 为每次 request 创建 AbortController;native branch 直接返回 stream,AI SDK branch 使用 `LLMAISDK.adapterState()` 和 `LLMAISDK.toLLMEvents(...)` 把 `result.fullStream` 转成 `LLMEvent` stream。[E: packages/opencode/src/session/llm.ts:357][E: packages/opencode/src/session/llm.ts:362][E: packages/opencode/src/session/llm.ts:366][E: packages/opencode/src/session/llm.ts:368][E: packages/opencode/src/session/llm.ts:372][E: packages/opencode/src/session/llm.ts:373][E: packages/opencode/src/session/llm.ts:376]

## AI SDK adapter

`LLMAISDK.toLLMEvents` 把 AI SDK `start-step`/`finish-step` 映射成 `LLMEvent.stepStart/stepFinish`,并把 `finish` 映射为 `LLMEvent.finish` 后重置 adapter state。[E: packages/opencode/src/session/llm/ai-sdk.ts:84][E: packages/opencode/src/session/llm/ai-sdk.ts:85][E: packages/opencode/src/session/llm/ai-sdk.ts:87][E: packages/opencode/src/session/llm/ai-sdk.ts:102][E: packages/opencode/src/session/llm/ai-sdk.ts:111][E: packages/opencode/src/session/llm/ai-sdk.ts:114][E: packages/opencode/src/session/llm/ai-sdk.ts:122]

text、reasoning、tool-input、tool-call、tool-result、tool-error 都会被转换成对应 `LLMEvent`;AI SDK `error` event 会 `Effect.fail(event.error)`,而 `abort/source/file/tool-output-denied/tool-approval-request` 在 V1 adapter 中被忽略为空 event 列表。[E: packages/opencode/src/session/llm/ai-sdk.ts:126][E: packages/opencode/src/session/llm/ai-sdk.ts:137][E: packages/opencode/src/session/llm/ai-sdk.ts:158][E: packages/opencode/src/session/llm/ai-sdk.ts:169][E: packages/opencode/src/session/llm/ai-sdk.ts:190][E: packages/opencode/src/session/llm/ai-sdk.ts:202][E: packages/opencode/src/session/llm/ai-sdk.ts:220][E: packages/opencode/src/session/llm/ai-sdk.ts:234][E: packages/opencode/src/session/llm/ai-sdk.ts:249][E: packages/opencode/src/session/llm/ai-sdk.ts:264][E: packages/opencode/src/session/llm/ai-sdk.ts:265][E: packages/opencode/src/session/llm/ai-sdk.ts:267][E: packages/opencode/src/session/llm/ai-sdk.ts:268][E: packages/opencode/src/session/llm/ai-sdk.ts:269][E: packages/opencode/src/session/llm/ai-sdk.ts:270][E: packages/opencode/src/session/llm/ai-sdk.ts:271][E: packages/opencode/src/session/llm/ai-sdk.ts:272]

Copilot raw chunks 是 AI SDK path 的特殊账单补丁:`includeRawChunks` 只在 providerID 包含 `github-copilot` 时打开,adapter 从 raw chunk 中提取 `total_nano_aiu`,然后写入 step finish provider metadata。[E: packages/opencode/src/session/llm.ts:295][E: packages/opencode/src/session/llm/ai-sdk.ts:37][E: packages/opencode/src/session/llm/ai-sdk.ts:39][E: packages/opencode/src/session/llm/ai-sdk.ts:91][E: packages/opencode/src/session/llm/ai-sdk.ts:97][E: packages/opencode/src/session/llm/ai-sdk.ts:274][E: packages/opencode/src/session/llm/ai-sdk.ts:275][E: packages/opencode/src/session/llm/ai-sdk.ts:276]

## native runtime seam

`LLMNativeRuntime.statusWithFetch` 只支持 providerID 为 `openai`、`anthropic` 或 `opencode*`,且 npm package 只能是 `@ai-sdk/openai`、`@ai-sdk/openai-compatible` 或 `@ai-sdk/anthropic`;缺 API key、OAuth fetch override 不满足、provider/model package 不匹配都会返回 unsupported reason。[E: packages/opencode/src/session/llm/native-runtime.ts:54][E: packages/opencode/src/session/llm/native-runtime.ts:55][E: packages/opencode/src/session/llm/native-runtime.ts:56][E: packages/opencode/src/session/llm/native-runtime.ts:58][E: packages/opencode/src/session/llm/native-runtime.ts:59][E: packages/opencode/src/session/llm/native-runtime.ts:60][E: packages/opencode/src/session/llm/native-runtime.ts:61][E: packages/opencode/src/session/llm/native-runtime.ts:64][E: packages/opencode/src/session/llm/native-runtime.ts:65]

native runtime 不是把工具执行交给 provider 外部系统;`nativeTools` 把 AI SDK `Tool.execute` 适配成 `@opencode-ai/llm` `NativeTool.make`,执行时仍调用原始 `item.execute(args, { toolCallId, messages, abortSignal })`。[E: packages/opencode/src/session/llm/native-runtime.ts:169][E: packages/opencode/src/session/llm/native-runtime.ts:175][E: packages/opencode/src/session/llm/native-runtime.ts:178][E: packages/opencode/src/session/llm/native-runtime.ts:182][E: packages/opencode/src/session/llm/native-runtime.ts:183][E: packages/opencode/src/session/llm/native-runtime.ts:184][E: packages/opencode/src/session/llm/native-runtime.ts:185]

native streaming path 取 `input.llmClient`,调用 `.stream(LLMRequest.update(request, { tools: [...request.tools, ...toDefinitions(tools)] }))`;当 provider event 是非 provider-executed `tool-call` 时,它同时把事件传下去并用 `ToolRuntime.dispatch` 执行本地工具,settlement events 进入 queue 后与 provider stream concat。[E: packages/opencode/src/session/llm/native-runtime.ts:103][E: packages/opencode/src/session/llm/native-runtime.ts:108][E: packages/opencode/src/session/llm/native-runtime.ts:109][E: packages/opencode/src/session/llm/native-runtime.ts:110][E: packages/opencode/src/session/llm/native-runtime.ts:111][E: packages/opencode/src/session/llm/native-runtime.ts:115][E: packages/opencode/src/session/llm/native-runtime.ts:116][E: packages/opencode/src/session/llm/native-runtime.ts:118][E: packages/opencode/src/session/llm/native-runtime.ts:119][E: packages/opencode/src/session/llm/native-runtime.ts:121][E: packages/opencode/src/session/llm/native-runtime.ts:122][E: packages/opencode/src/session/llm/native-runtime.ts:137]

## 设计动机与权衡

- V1 `LLM.Service` 是 per-request seam:同一 session 的不同 provider requests 可以因 flag、provider/auth/package/API-key gate 不同而选择 native 或 fallback AI SDK,边界文档也写明 gate 是 per-request。[E: packages/opencode/src/session/llm/AGENTS.md:36][E: packages/opencode/src/session/llm.ts:226][E: packages/opencode/src/session/llm.ts:254][E: packages/opencode/src/session/llm/native-runtime.ts:54][E: packages/opencode/src/session/llm/native-runtime.ts:56][E: packages/opencode/src/session/llm/native-runtime.ts:58][E: packages/opencode/src/session/llm/native-runtime.ts:59][E: packages/opencode/src/session/llm/native-runtime.ts:60][E: packages/opencode/src/session/llm/native-runtime.ts:61][E: packages/opencode/src/session/llm/native-runtime.ts:64][E: packages/opencode/src/session/llm/native-runtime.ts:65]
- `LLM.node` 通过 `LayerNode.make` 把 `llmClient` 列为依赖,native runtime 调 `llmClient.stream(...)`;AI SDK branch 则在 `llm.ts` 内部调用 `streamText(...)` 并适配 fullStream。[E: packages/opencode/src/session/llm.ts:280][E: packages/opencode/src/session/llm.ts:389][E: packages/opencode/src/session/llm.ts:399][E: packages/opencode/src/session/llm/native-runtime.ts:109]
- V1 此处把 `@opencode-ai/llm` 作为 native adapter/LLMEvent seam 使用,并保留 AI SDK 为默认 runtime;更广义的 V2 provider protocol engine 迁移目标不由本文件单独证明。[E: packages/opencode/src/session/llm/AGENTS.md:7][E: packages/opencode/src/session/llm/AGENTS.md:9][E: packages/opencode/src/session/llm.ts:279][I]

## gotcha

- `session/llm/AGENTS.md` 的 safety boundary 写到 `OPENCODE_EXPERIMENTAL=true` 也会 opt in native,但当前 `RuntimeFlags.experimentalNativeLlm` 源码只读取 `OPENCODE_EXPERIMENTAL_NATIVE_LLM`,没有使用 `enabledByExperimental(...)`;本节点按源码当前行为标注 native gate。[E: packages/opencode/src/session/llm/AGENTS.md:88][E: packages/opencode/src/effect/runtime-flags.ts:53][I]
- AI SDK branch 的 `experimental_repairToolCall` 会先尝试把 toolName 小写修复到已存在 tool;否则把 malformed call 转成 `toolName: "invalid"` 且 input 里带原 tool 与 error JSON。[E: packages/opencode/src/session/llm.ts:296][E: packages/opencode/src/session/llm.ts:297][E: packages/opencode/src/session/llm.ts:298][E: packages/opencode/src/session/llm.ts:304][E: packages/opencode/src/session/llm.ts:310]
- OpenAI OAuth 是 native status 的例外:OAuth-specific gate 只有在 provider id 是 `openai` 且 provider options 提供 fetch override 时才通过;之后仍需通过 provider/package/API-key gates,否则 native unsupported 会在 `llm.ts` fallback 到 AI SDK。[E: packages/opencode/src/session/llm/native-runtime.ts:54][E: packages/opencode/src/session/llm/native-runtime.ts:58][E: packages/opencode/src/session/llm/native-runtime.ts:60][E: packages/opencode/src/session/llm/native-runtime.ts:64][E: packages/opencode/src/session/llm/native-runtime.ts:65][E: packages/opencode/src/session/llm/native-runtime.ts:148][E: packages/opencode/src/session/llm/native-runtime.ts:149][E: packages/opencode/src/session/llm/native-runtime.ts:150][E: packages/opencode/src/session/llm/native-runtime.ts:151][E: packages/opencode/src/session/llm.ts:254][E: packages/opencode/src/session/llm.ts:279]

## Sources
- packages/opencode/src/session/llm.ts
- packages/opencode/src/session/llm/ai-sdk.ts
- packages/opencode/src/session/llm/native-runtime.ts
- packages/opencode/src/session/llm/native-request.ts
- packages/opencode/src/session/llm/request.ts
- packages/opencode/src/session/llm/AGENTS.md
- packages/opencode/src/session/processor.ts
- packages/opencode/src/effect/runtime-flags.ts

## 相关
- [model-layer.llm-protocol-engine](../model-layer/llm-protocol-engine.md)
- [spine.v1-v2-relationship](../../spine/v1-v2-relationship.md)
