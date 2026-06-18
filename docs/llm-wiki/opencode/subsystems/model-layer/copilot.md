---
id: model-layer.copilot
title: GitHub Copilot Provider
kind: subsystem
tier: T2
v: shared
source: [packages/core/src/github-copilot/, packages/llm/src/providers/github-copilot.ts]
symbols: [createOpenaiCompatible, OpenAICompatibleChatLanguageModel, OpenAIResponsesLanguageModel, GithubCopilotPlugin, GithubCopilotNativeProvider]
related: [ref.copilot-tool-catalog]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> GitHub Copilot 在 opencode 里有双适配:core 目录提供 AI SDK `LanguageModelV3` compatible provider,同时 `packages/llm/src/providers/github-copilot.ts` 提供 native route configure helper。GPT-5 class model 默认走 Responses,但 `gpt-5-mini` 仍走 Chat。

## 能回答的问题
- Copilot 的 AI SDK provider 如何同时暴露 `chat` 与 `responses`?
- GPT-5 / GPT-5 mini 的 route 选择规则在哪里?
- Copilot Responses 支持哪些 hosted provider tools?
- V1 registry 与 V2 plugin 如何加载 Copilot provider?
- native `packages/llm` Copilot provider 和 core Copilot provider 有什么差别?

## V1

V1 provider registry 把 `@ai-sdk/github-copilot` 映射到 core 的 `@opencode-ai/core/github-copilot/copilot-provider`,创建 AI SDK compatible provider。[E: packages/opencode/src/provider/provider.ts:131][E: packages/opencode/src/provider/provider.ts:132]

V1 custom loader 对 Copilot model 选择路由:SDK 如果没有 `responses/chat` 就退回 `languageModel`;否则 GPT major >= 5 且不是 `gpt-5-mini` 时走 `sdk.responses(modelID)`,其他走 `sdk.chat(modelID)`。[E: packages/opencode/src/provider/provider.ts:222][E: packages/opencode/src/provider/provider.ts:224][E: packages/opencode/src/provider/provider.ts:225]

V1 provider transform 对 `@ai-sdk/github-copilot` 默认设置 `store=false`,GPT-5 class 还会默认设置 `reasoningSummary=auto`。[E: packages/opencode/src/provider/transform.ts:1063][E: packages/opencode/src/provider/transform.ts:1066][E: packages/opencode/src/provider/transform.ts:1152][E: packages/opencode/src/provider/transform.ts:1158][E: packages/opencode/src/provider/transform.ts:1161]

## V2

V2 `GithubCopilotPlugin` 提供三个 hooks:`aisdk.sdk`、`aisdk.language`、`catalog.transform`。[E: packages/core/src/plugin/provider/github-copilot.ts:18][E: packages/core/src/plugin/provider/github-copilot.ts:23][E: packages/core/src/plugin/provider/github-copilot.ts:33]

`aisdk.sdk` hook 只匹配 `@ai-sdk/github-copilot`,动态 import core copilot-provider,并把 `evt.sdk` 设置成 `createOpenaiCompatible(evt.options)` 的结果。[E: packages/core/src/plugin/provider/github-copilot.ts:19][E: packages/core/src/plugin/provider/github-copilot.ts:20][E: packages/core/src/plugin/provider/github-copilot.ts:21]

`aisdk.language` hook 只处理 `ProviderV2.ID.githubCopilot`;当 SDK 没有 responses/chat 时退回 `languageModel`,否则复用同一 GPT-5 rule 在 responses/chat 之间选择。[E: packages/core/src/plugin/provider/github-copilot.ts:24][E: packages/core/src/plugin/provider/github-copilot.ts:25][E: packages/core/src/plugin/provider/github-copilot.ts:26][E: packages/core/src/plugin/provider/github-copilot.ts:29][E: packages/core/src/plugin/provider/github-copilot.ts:30]

`catalog.transform` 会隐藏 Copilot 下的 `gpt-5-chat-latest`;实现只在 Copilot provider record 中把该 model 的 `enabled` 设为 false。[E: packages/core/src/plugin/provider/github-copilot.ts:34][E: packages/core/src/plugin/provider/github-copilot.ts:35][E: packages/core/src/plugin/provider/github-copilot.ts:36][E: packages/core/src/plugin/provider/github-copilot.ts:39]

## Core AI SDK Provider

`createOpenaiCompatible` 接受 apiKey/baseURL/name/headers/fetch,默认 baseURL 是 `https://api.openai.com/v1`,headers 会合并 bearer Authorization 与 caller headers。[E: packages/core/src/github-copilot/copilot-provider.ts:15][E: packages/core/src/github-copilot/copilot-provider.ts:20][E: packages/core/src/github-copilot/copilot-provider.ts:25][E: packages/core/src/github-copilot/copilot-provider.ts:30][E: packages/core/src/github-copilot/copilot-provider.ts:35][E: packages/core/src/github-copilot/copilot-provider.ts:53][E: packages/core/src/github-copilot/copilot-provider.ts:62][E: packages/core/src/github-copilot/copilot-provider.ts:63]

provider interface 同时是 callable function,也暴露 `chat(modelId)`、`responses(modelId)`、`languageModel(modelId)`。[E: packages/core/src/github-copilot/copilot-provider.ts:39][E: packages/core/src/github-copilot/copilot-provider.ts:42] 默认 callable 与 `languageModel` 都创建 Chat model,显式 `responses` 创建 Responses model。[E: packages/core/src/github-copilot/copilot-provider.ts:86][E: packages/core/src/github-copilot/copilot-provider.ts:89][E: packages/core/src/github-copilot/copilot-provider.ts:92][E: packages/core/src/github-copilot/copilot-provider.ts:94]

Chat adapter 是 AI SDK `LanguageModelV3`,`specificationVersion = "v3"`,`doGenerate` POST `/chat/completions`,并把 reasoning opaque/text/provider metadata 映射进 AI SDK content。[E: packages/core/src/github-copilot/chat/openai-compatible-chat-language-model.ts:53][E: packages/core/src/github-copilot/chat/openai-compatible-chat-language-model.ts:54][E: packages/core/src/github-copilot/chat/openai-compatible-chat-language-model.ts:203][E: packages/core/src/github-copilot/chat/openai-compatible-chat-language-model.ts:223][E: packages/core/src/github-copilot/chat/openai-compatible-chat-language-model.ts:230][E: packages/core/src/github-copilot/chat/openai-compatible-chat-language-model.ts:236]

Responses adapter 也是 AI SDK `LanguageModelV3`,支持 image/pdf URL,解析 Copilot provider options;`openaiOptions.logprobs` 会自动 include logprobs,web search/code interpreter hosted tools 会自动 include sources/outputs。[E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:131][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:144][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:145][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:196][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:226][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:233][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:240][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:245][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:249][E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:250]

## Hosted Tools

Responses prepare-tools 支持 6 个 provider-hosted tools: `openai.file_search`、`openai.local_shell`、`openai.web_search_preview`、`openai.web_search`、`openai.code_interpreter`、`openai.image_generation`。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:55][E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:73][E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:79][E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:88][E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:98][E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:111]

`toolChoice` 对 hosted tools 会返回 `{ type: toolName }`,否则普通 function tool 返回 `{ type: "function", name }`。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:157][E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:163]

## Native packages/llm Provider

`packages/llm/src/providers/github-copilot.ts` 是 native route helper。它导出 provider id `github-copilot`,routes 是 OpenAI Responses route 与 OpenAI Chat route,`configure` 根据 `shouldUseResponsesApi` 返回 responses 或 chat model。[E: packages/llm/src/providers/github-copilot.ts:8][E: packages/llm/src/providers/github-copilot.ts:25][E: packages/llm/src/providers/github-copilot.ts:47][E: packages/llm/src/providers/github-copilot.ts:56] 它不是 AI SDK provider。[I]

native helper 的 `ModelOptions` 要求 `baseURL: string`,configure 阶段把该 baseURL patch 到 chat/responses route endpoint。[E: packages/llm/src/providers/github-copilot.ts:14][E: packages/llm/src/providers/github-copilot.ts:37][E: packages/llm/src/providers/github-copilot.ts:43]

## 易错点

- `@ai-sdk/github-copilot` 在 V1/V2 AI SDK path 里由 core provider 实现;`packages/llm/src/providers/github-copilot.ts` 是 native engine helper。[E: packages/opencode/src/provider/provider.ts:131][E: packages/core/src/plugin/provider/github-copilot.ts:19][E: packages/llm/src/providers/github-copilot.ts:55] 二者同名但接口不同。[I]
- GPT-5 mini 是显式排除项,不能简单写成所有 GPT-5 都走 Responses。[E: packages/core/src/plugin/provider/github-copilot.ts:6][E: packages/core/src/plugin/provider/github-copilot.ts:11]
- local_shell 是 provider-hosted OpenAI Responses tool id。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:73][E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:75] 它不等同于 opencode 本地 shell tool registry。[I]

## Sources
- packages/core/src/github-copilot/
- packages/core/src/plugin/provider/github-copilot.ts
- packages/opencode/src/provider/provider.ts
- packages/opencode/src/provider/transform.ts
- packages/llm/src/providers/github-copilot.ts

## Related
- ref.copilot-tool-catalog
