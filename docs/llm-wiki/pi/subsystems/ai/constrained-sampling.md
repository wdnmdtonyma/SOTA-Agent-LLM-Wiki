---
id: subsys.ai.constrained-sampling
title: 工具约束采样
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/constrained-sampling.ts
  - packages/ai/src/types.ts
  - packages/ai/src/api/openai-responses.ts
  - packages/ai/src/api/openai-responses-shared.ts
  - packages/ai/src/api/azure-openai-responses.ts
  - packages/ai/src/api/openai-codex-responses.ts
  - packages/ai/src/api/openai-completions.ts
  - packages/ai/src/api/anthropic-messages.ts
  - packages/ai/src/api/google-generative-ai.ts
  - packages/ai/src/api/google-shared.ts
  - packages/ai/src/api/google-vertex.ts
  - packages/ai/src/api/mistral-conversations.ts
  - packages/ai/src/api/bedrock-converse-stream.ts
  - packages/ai/src/utils/validation.ts
  - packages/ai/test/validation.test.ts
  - packages/ai/test/constrained-sampling.test.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/coding-agent/src/core/experimental.ts
  - packages/coding-agent/src/core/tools/read.ts
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/src/core/tools/edit.ts
  - packages/coding-agent/src/core/tools/write.ts
  - packages/coding-agent/src/server/create-harness.ts
  - packages/coding-agent/test/experimental-tool-strict-mode.test.ts
symbols:
  - resolveJsonSchemaStrictSampling
  - resolveGrammarConstrainedSampling
  - appendGrammarToolInputJsonDelta
  - makeStrictJsonSchema
  - getExperimentalToolSampling
related:
  - subsys.ai.openai-responses
  - subsys.ai.openai-completions
  - subsys.ai.anthropic-messages
  - spine.tool-call-anatomy
  - subsys.coding-agent.tool-wrapper
evidence: explicit
status: verified
updated: 086c32e745
---

> 约束采样把工具声明中的 JSON Schema strict 或 grammar 配置翻译成 provider wire 能力，并维护 grammar tool call 的增量 JSON 参数。`PI_EXPERIMENTAL=1` 时，coding-agent 默认 `read`/`bash`/`edit`/`write` 会带上 prefer-strict JSON schema。

## 两种约束

`resolveJsonSchemaStrictSampling()` 只处理 `type: "json_schema"`：provider 支持 strict 时先 `makeStrictJsonSchema()` 探活，成功返回 `true`；schema 无法改成 strict 子集且策略不是 `require` 时返回 `undefined`（`prefer` 降级为普通 schema）；`require` 则抛错。不支持且策略为 `require` 时也抛错。[E: packages/ai/src/api/constrained-sampling.ts:208] [E: packages/ai/src/api/constrained-sampling.ts:212] [E: packages/ai/src/api/constrained-sampling.ts:214] [E: packages/ai/src/api/constrained-sampling.ts:218] [E: packages/ai/src/api/constrained-sampling.ts:222] [E: packages/ai/src/api/constrained-sampling.ts:227]

`makeStrictJsonSchema()` 把 object schema 改成 OpenAI-style strict 子集：每个 property required、`additionalProperties: false`、不支持的组合（`$ref`/`oneOf`/tuple/`true` additionalProperties 等）抛 `UnsupportedStrictJsonSchemaError`；可选且本身不容 null 的 property 被包成 `anyOf: [原 schema, {type:"null"}]`。`getJsonSchemaToolParameters(tool, true)` 才走这条转换。[E: packages/ai/src/api/constrained-sampling.ts:112] [E: packages/ai/src/api/constrained-sampling.ts:113] [E: packages/ai/src/api/constrained-sampling.ts:117] [E: packages/ai/src/api/constrained-sampling.ts:129] [E: packages/ai/src/api/constrained-sampling.ts:130]

`resolveGrammarConstrainedSampling()` 只在 provider 宣告 OpenAI grammar-tool 支持时生效，优先选择非空 Lark，后退到 regex。grammar 工具必须是 object schema，且恰好有一个 required string property。[E: packages/ai/src/api/constrained-sampling.ts:189] [E: packages/ai/src/api/constrained-sampling.ts:194] [E: packages/ai/src/api/constrained-sampling.ts:202] [E: packages/ai/src/api/constrained-sampling.ts:230] [E: packages/ai/src/api/constrained-sampling.ts:239] [E: packages/ai/src/api/constrained-sampling.ts:243] [E: packages/ai/src/api/constrained-sampling.ts:253]

配置从公共 `Tool.constrainedSampling` 进入 provider context [E: packages/ai/src/types.ts:492] [E: packages/ai/src/types.ts:506]。coding-agent extension `ToolDefinition` 暴露同一字段，正反 wrapper 都原样保留它，因此 extension tool 与 plain `AgentTool` 不会在 registry 适配时丢失约束 [E: packages/coding-agent/src/core/extensions/types.ts:463] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:14] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:42]。

## 实验门控的默认工具

`PI_EXPERIMENTAL=1` 时，`getExperimentalToolSampling()` 返回 `{ type: "json_schema", strict: "prefer" }`，否则返回 `undefined`。[E: packages/coding-agent/src/core/experimental.ts:1] [E: packages/coding-agent/src/core/experimental.ts:3] [E: packages/coding-agent/src/core/experimental.ts:7] [E: packages/coding-agent/src/core/experimental.ts:8] 默认 `read` / `bash` / `edit` / `write` 的 `createXToolDefinition()` 把该值写进 `constrainedSampling`；schema 本身不变，只多了 prefer-strict 标记。测试锁定：关实验门时这四个 tool 的 `constrainedSampling` 为 `undefined`。[E: packages/coding-agent/src/core/tools/read.ts:222] [E: packages/coding-agent/src/core/tools/bash.ts:337] [E: packages/coding-agent/src/core/tools/edit.ts:311] [E: packages/coding-agent/src/core/tools/write.ts:200] [E: packages/coding-agent/test/experimental-tool-strict-mode.test.ts:26] [E: packages/coding-agent/test/experimental-tool-strict-mode.test.ts:33] [E: packages/coding-agent/test/experimental-tool-strict-mode.test.ts:34] [E: packages/coding-agent/test/experimental-tool-strict-mode.test.ts:35] 远程 session harness factory 在包装默认工具时再次套同一 helper，因此 server 侧默认工具也受同一 env gate。[E: packages/coding-agent/src/server/create-harness.ts:34] `prefer` 意味着：provider 支持且 schema 能改成 strict 子集时 wire 写 `strict: true` 并发送 `makeStrictJsonSchema()` 产物；否则降级为普通 function schema，不在请求构造期失败。[E: packages/ai/src/api/constrained-sampling.ts:212] [E: packages/ai/src/api/constrained-sampling.ts:218] [E: packages/ai/src/api/openai-responses-shared.ts:380] [E: packages/ai/src/api/openai-responses-shared.ts:388]

## Provider / wire 映射

grammar 当前只映射到 OpenAI-family wire：Responses adapter 在 capability `supportsOpenAIGrammarTools` 为 true 时生成 `type: "custom"` + grammar format，Completions adapter 生成 custom grammar tool；两者都优先 Lark、再选 regex。[E: packages/ai/src/api/openai-responses-shared.ts:359] [E: packages/ai/src/api/openai-responses-shared.ts:362] [E: packages/ai/src/api/openai-responses-shared.ts:365] [E: packages/ai/src/api/openai-responses-shared.ts:368] [E: packages/ai/src/api/openai-responses-shared.ts:372] [E: packages/ai/src/api/openai-completions.ts:1338] [E: packages/ai/src/api/openai-completions.ts:1343] [E: packages/ai/src/api/openai-completions.ts:1346] [E: packages/ai/src/api/openai-completions.ts:1351] 当 capability 为 false 时 resolver 返回 `undefined`，两个 adapter 会把同一 tool 降级为普通 function tool，而不是本地执行 grammar；测试锁定了 function fallback 且不写 strict 字段的 Responses 形态。[E: packages/ai/src/api/constrained-sampling.ts:239] [E: packages/ai/src/api/constrained-sampling.ts:240] [E: packages/ai/src/api/openai-responses-shared.ts:380] [E: packages/ai/src/api/openai-responses-shared.ts:385] [E: packages/ai/src/api/openai-completions.ts:1361] [E: packages/ai/src/api/openai-completions.ts:1363] [E: packages/ai/test/constrained-sampling.test.ts:109] [E: packages/ai/test/constrained-sampling.test.ts:113] [E: packages/ai/test/constrained-sampling.test.ts:114]。

Azure Responses 与 OpenAI Codex Responses 是独立 adapter，但也把 `supportsOpenAIGrammarTools` 传入 grammar property map 与共享 Responses tool conversion；两者同时把自身 `supportsStrictMode` capability 传给工具转换，所以不是只由标准 OpenAI Responses 入口消费约束配置。[E: packages/ai/src/api/azure-openai-responses.ts:104] [E: packages/ai/src/api/azure-openai-responses.ts:106] [E: packages/ai/src/api/azure-openai-responses.ts:275] [E: packages/ai/src/api/azure-openai-responses.ts:277] [E: packages/ai/src/api/azure-openai-responses.ts:301] [E: packages/ai/src/api/azure-openai-responses.ts:303] [E: packages/ai/src/api/openai-codex-responses.ts:263] [E: packages/ai/src/api/openai-codex-responses.ts:265] [E: packages/ai/src/api/openai-codex-responses.ts:521] [E: packages/ai/src/api/openai-codex-responses.ts:527] [E: packages/ai/src/api/openai-codex-responses.ts:534] [E: packages/ai/src/api/openai-codex-responses.ts:542]

JSON-schema strict 的 wire 支持分散在多类 adapter：

- OpenAI Responses / Completions 把 compat 的 strict capability 传给 resolver；支持时写 `strict`,不支持时 `prefer` 走普通 function schema、`require` 在构造请求时抛错。[E: packages/ai/src/api/openai-responses-shared.ts:360] [E: packages/ai/src/api/openai-responses-shared.ts:361] [E: packages/ai/src/api/openai-responses-shared.ts:380] [E: packages/ai/src/api/openai-responses-shared.ts:391] [E: packages/ai/src/api/openai-completions.ts:1361] [E: packages/ai/src/api/openai-completions.ts:1369]
- Anthropic 只在 `model.compat.supportsStrictTools` 打开时保留完整 schema 并写 `strict: true`;默认 capability 为 false。[E: packages/ai/src/api/anthropic-messages.ts:184] [E: packages/ai/src/api/anthropic-messages.ts:1316] [E: packages/ai/src/api/anthropic-messages.ts:1325] [E: packages/ai/src/api/anthropic-messages.ts:1336]
- Google Generative AI / Vertex 只把 Gemini major version 3+ 判为 strict-capable，并将有 strict tool 的自动 function-calling mode 提升到 `VALIDATED`。[E: packages/ai/src/api/google-shared.ts:309] [E: packages/ai/src/api/google-shared.ts:311] [E: packages/ai/src/api/google-shared.ts:333] [E: packages/ai/src/api/google-shared.ts:337] [E: packages/ai/src/api/google-shared.ts:338] [E: packages/ai/src/api/google-generative-ai.ts:371] [E: packages/ai/src/api/google-generative-ai.ts:371] [E: packages/ai/src/api/google-vertex.ts:470] [E: packages/ai/src/api/google-vertex.ts:470]
- Mistral 固定以 supported=true 解析 strict，并写到 function tool；Bedrock 则由 `model.compat.supportsStrictMode ?? false` 决定是否在 `toolSpec` 写 strict。[E: packages/ai/src/api/mistral-conversations.ts:495] [E: packages/ai/src/api/mistral-conversations.ts:750] [E: packages/ai/src/api/mistral-conversations.ts:757] [E: packages/ai/src/api/bedrock-converse-stream.ts:242] [E: packages/ai/src/api/bedrock-converse-stream.ts:1000] [E: packages/ai/src/api/bedrock-converse-stream.ts:1006] [E: packages/ai/src/api/bedrock-converse-stream.ts:1012]

## 增量参数

grammar provider 可能发送逐步增长的原始字符串。`appendGrammarToolInputJsonDelta()` 把它包装为单属性 JSON delta，并拒绝非单调变化或关闭后的修改；`getGrammarToolInput()` 在完成时验证目标属性确为 string。[E: packages/ai/src/api/constrained-sampling.ts:145] [E: packages/ai/src/api/constrained-sampling.ts:157] [E: packages/ai/src/api/constrained-sampling.ts:163] [E: packages/ai/src/api/constrained-sampling.ts:167] [E: packages/ai/src/api/constrained-sampling.ts:174] [E: packages/ai/src/api/constrained-sampling.ts:182]

## L2 证伪与边界

- grammar 配置存在并不保证生效：provider capability 为 false 时函数直接返回 `undefined`，而不是本地执行 grammar validator。[E: packages/ai/src/api/constrained-sampling.ts:230] [E: packages/ai/src/api/constrained-sampling.ts:239]
- 缺少 grammar 变体或 schema 不满足单一 string 输入时会在请求构造阶段失败；这不是模型返回后的 validation。[E: packages/ai/src/api/constrained-sampling.ts:247] [E: packages/ai/src/api/constrained-sampling.ts:259]
- grammar 与 JSON strict 不是全 provider 通用能力：grammar 只在 OpenAI-family compat 开关打开时成为 custom grammar tool；JSON strict 也分别受 OpenAI/Anthropic/Google/Bedrock capability 或 Mistral adapter 行为约束。[I]

本节点的 request-side constrained sampling 与 response-side tool argument validation 是两个边界。`validateToolArguments()` 会 clone arguments、执行 TypeBox conversion，再按 schema validate；对 `anyOf`/`oneOf` union，coercion 现在先检查原值是否已匹配任一 arm，只有完全不匹配才逐 arm 尝试转换，避免 nullable union 中的 `null` 被错误强转为 primitive。[E: packages/ai/src/utils/validation.ts:175] [E: packages/ai/src/utils/validation.ts:179] [E: packages/ai/src/utils/validation.ts:183] [E: packages/ai/src/utils/validation.ts:191] [E: packages/ai/src/utils/validation.ts:317] [E: packages/ai/src/utils/validation.ts:324]

## Sources

- packages/ai/src/api/constrained-sampling.ts
- packages/ai/src/types.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/azure-openai-responses.ts
- packages/ai/src/api/openai-codex-responses.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/google-generative-ai.ts
- packages/ai/src/api/google-shared.ts
- packages/ai/src/api/google-vertex.ts
- packages/ai/src/api/mistral-conversations.ts
- packages/ai/src/api/bedrock-converse-stream.ts
- packages/ai/src/utils/validation.ts
- packages/ai/test/validation.test.ts
- packages/ai/test/constrained-sampling.test.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/experimental.ts
- packages/coding-agent/src/core/tools/read.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/tools/edit.ts
- packages/coding-agent/src/core/tools/write.ts
- packages/coding-agent/src/server/create-harness.ts
- packages/coding-agent/test/experimental-tool-strict-mode.test.ts

## 相关

- [subsys.ai.openai-responses](openai-responses.md): OpenAI Responses 的 strict/grammar wire 映射。
- [subsys.ai.openai-completions](openai-completions.md): OpenAI-compatible completions 映射。
- [subsys.ai.anthropic-messages](anthropic-messages.md): Anthropic tool schema 能力边界。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md): 约束配置随 tool definition 进入执行链的位置。
- [subsys.coding-agent.tool-wrapper](../coding-agent/tool-wrapper.md): extension definition 与 core tool 的双向适配。
