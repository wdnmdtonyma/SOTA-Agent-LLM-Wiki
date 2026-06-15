---
id: ref.copilot-tool-catalog
title: GitHub Copilot Hosted Tool Catalog
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/github-copilot/responses/tool/
  - packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts
  - packages/core/src/github-copilot/responses/openai-responses-language-model.ts
  - packages/core/src/github-copilot/responses/convert-to-openai-responses-input.ts
  - packages/opencode/src/provider/provider.ts
status: verified
updated: 92c70c9c3
evidence: explicit
symbols:
  - codeInterpreter
  - fileSearch
  - imageGeneration
  - localShell
  - webSearch
  - webSearchPreview
related:
  - model-layer.copilot
---

# GitHub Copilot Hosted Tool Catalog

本节点描述 `packages/core/src/github-copilot/responses/tool` 下的 6 个 provider-hosted Responses tools。它们不是 opencode 本地 `ToolRegistry` built-ins；它们通过 AI SDK provider tool factories 进入 OpenAI Responses-compatible request body，并在 response mapping 中以 `providerExecuted: true` 或 special local-shell round-trip 表达。

## V1

V1 provider map 的 `@ai-sdk/github-copilot` bundled loader 实际 import `@opencode-ai/core/github-copilot/copilot-provider` 的 `createOpenaiCompatible`，而不是外部 `@ai-sdk/github-copilot` factory。[E: packages/opencode/src/provider/provider.ts:131] V1 `github-copilot` custom loader 对 GPT major >= 5 且非 `gpt-5-mini` 的 model 选择 Responses API，否则走 chat。[E: packages/opencode/src/provider/provider.ts:218] [E: packages/opencode/src/provider/provider.ts:225]

## V2

这些 tool factories 位于 `packages/core`，供 core GitHub Copilot Responses-compatible provider 使用；它们使用 `createProviderToolFactory` 或 `createProviderToolFactoryWithOutputSchema` 声明 provider tool ID、input schema、output schema。[E: packages/core/src/github-copilot/responses/tool/code-interpreter.ts:40] [E: packages/core/src/github-copilot/responses/tool/web-search.ts:24]

## Tool Factory Catalog

| Provider tool ID | Source | Args schema | Provider input schema | Output schema |
| --- | --- | --- | --- | --- |
| `openai.code_interpreter` | `code-interpreter.ts` | `container?: string \| { fileIds?: string[] }`。[E: packages/core/src/github-copilot/responses/tool/code-interpreter.ts:20] [E: packages/core/src/github-copilot/responses/tool/code-interpreter.ts:20] | provider emits `code?: string \| null`, `containerId: string`。[E: packages/core/src/github-copilot/responses/tool/code-interpreter.ts:4] [E: packages/core/src/github-copilot/responses/tool/code-interpreter.ts:4] | `outputs?: Array<{type:"logs",logs} \| {type:"image",url}> \| null`。[E: packages/core/src/github-copilot/responses/tool/code-interpreter.ts:9] [E: packages/core/src/github-copilot/responses/tool/code-interpreter.ts:17] |
| `openai.file_search` | `file-search.ts` | `vectorStoreIds`, `maxNumResults?`, `ranking?`, `filters?`。[E: packages/core/src/github-copilot/responses/tool/file-search.ts:19] [E: packages/core/src/github-copilot/responses/tool/file-search.ts:19] | provider tool input schema is `{}` because search query is generated provider-side。[E: packages/core/src/github-copilot/responses/tool/file-search.ts:123] [E: packages/core/src/github-copilot/responses/tool/file-search.ts:125] | `queries: string[]`, `results: file result[] \| null`，result 含 attributes/fileId/filename/score/text。[E: packages/core/src/github-copilot/responses/tool/file-search.ts:31] [E: packages/core/src/github-copilot/responses/tool/file-search.ts:43] |
| `openai.image_generation` | `image-generation.ts` | strict object；background/inputFidelity/inputImageMask/model/moderation/outputCompression/outputFormat/partialImages/quality/size。[E: packages/core/src/github-copilot/responses/tool/image-generation.ts:4] [E: packages/core/src/github-copilot/responses/tool/image-generation.ts:22] | provider tool input schema is `{}`。[E: packages/core/src/github-copilot/responses/tool/image-generation.ts:105] [E: packages/core/src/github-copilot/responses/tool/image-generation.ts:106] | `result: string` base64 generated image。[E: packages/core/src/github-copilot/responses/tool/image-generation.ts:24] [E: packages/core/src/github-copilot/responses/tool/image-generation.ts:25] |
| `openai.local_shell` | `local-shell.ts` | no args type parameter `{}`。[E: packages/core/src/github-copilot/responses/tool/local-shell.ts:19] [E: packages/core/src/github-copilot/responses/tool/local-shell.ts:19] | `action.type="exec"`, `command: string[]`, optional `timeoutMs/user/workingDirectory/env`。[E: packages/core/src/github-copilot/responses/tool/local-shell.ts:4] [E: packages/core/src/github-copilot/responses/tool/local-shell.ts:5] | `output: string`。[E: packages/core/src/github-copilot/responses/tool/local-shell.ts:15] [E: packages/core/src/github-copilot/responses/tool/local-shell.ts:16] |
| `openai.web_search_preview` | `web-search-preview.ts` | `searchContextSize?: low\|medium\|high`, `userLocation?` approximate country/city/region/timezone。[E: packages/core/src/github-copilot/responses/tool/web-search-preview.ts:5] [E: packages/core/src/github-copilot/responses/tool/web-search-preview.ts:40] | provider action union: `search(query?)`, `open_page(url)`, `find(url, pattern)`。[E: packages/core/src/github-copilot/responses/tool/web-search-preview.ts:83] [E: packages/core/src/github-copilot/responses/tool/web-search-preview.ts:101] | no explicit output schema; provider response maps status/tool sources through language model mapper。[E: packages/core/src/github-copilot/responses/tool/web-search-preview.ts:43] |
| `openai.web_search` | `web-search.ts` | `filters.allowedDomains?`, `searchContextSize?`, `userLocation?`。[E: packages/core/src/github-copilot/responses/tool/web-search.ts:4] [E: packages/core/src/github-copilot/responses/tool/web-search.ts:21] | provider action union: `search(query?)`, `open_page(url)`, `find(url, pattern)`。[E: packages/core/src/github-copilot/responses/tool/web-search.ts:76] [E: packages/core/src/github-copilot/responses/tool/web-search.ts:78] | no explicit output schema; function returns provider tool factory with inputSchema only。[E: packages/core/src/github-copilot/responses/tool/web-search.ts:24] [E: packages/core/src/github-copilot/responses/tool/web-search.ts:98] |

## Request Body Lowering

`prepareResponsesTools` converts AI SDK provider tool IDs into OpenAI Responses tool body entries. It maps `openai.file_search` to `type:"file_search"` with `vector_store_ids/max_num_results/ranking_options/filters`。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:55] [E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:55] `openai.local_shell` maps to `{ type:"local_shell" }`。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:73] [E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:73] web search tools map to `web_search_preview` or `web_search` with snake_case args。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:79] [E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:88] code interpreter maps `container` to string or `{ type:"auto", file_ids }`。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:98] [E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:107] image generation maps camelCase args to snake_case body fields。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:111] [E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:129]

Tool choice lowering recognizes built-in hosted tool names `code_interpreter/file_search/image_generation/web_search_preview/web_search`; other named tools become function tool choice。[E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:153] [E: packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts:163]

## Response Mapping

When a web search provider tool is present, the language model adds `web_search_call.action.sources` to `include`; when code interpreter is present, it adds `code_interpreter_call.outputs`。[E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:244] [E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:250]

| Provider output item | Mapped content |
| --- | --- |
| `image_generation_call` | Emits a `providerExecuted: true` tool-call, followed by a tool-result with toolName `image_generation` and result `{ result }`。[E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:538] [E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:553] |
| `web_search_call` | Emits a `providerExecuted: true` tool-call, followed by a tool-result with toolName from provider tool name or `web_search` and result status。[E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:633] [E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:642] |
| `file_search_call` | Emits a `providerExecuted: true` tool-call, followed by a tool-result with queries and mapped result fields。[E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:673] [E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:696] |
| `code_interpreter_call` | Emits a `providerExecuted: true` tool-call, followed by a tool-result with code/containerId input and outputs result。[E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:701] [E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:719] |
| `local_shell_call` | Emits a tool-call with `local_shell` input and provider metadata itemId; it is not marked `providerExecuted` in this mapping because local execution is round-tripped back through call output。[E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:559] [E: packages/core/src/github-copilot/responses/openai-responses-language-model.ts:561] |

`convert-to-openai-responses-input.ts` round-trips assistant `local_shell` tool-call parts into `local_shell_call` request items, and local shell JSON results into `local_shell_call_output` items。[E: packages/core/src/github-copilot/responses/convert-to-openai-responses-input.ts:141] [E: packages/core/src/github-copilot/responses/convert-to-openai-responses-input.ts:143] [E: packages/core/src/github-copilot/responses/convert-to-openai-responses-input.ts:285]

## Sources

- packages/core/src/github-copilot/responses/tool/
- packages/core/src/github-copilot/responses/openai-responses-prepare-tools.ts
- packages/core/src/github-copilot/responses/openai-responses-language-model.ts
- packages/core/src/github-copilot/responses/convert-to-openai-responses-input.ts
- packages/opencode/src/provider/provider.ts

## Related

- model-layer.copilot
