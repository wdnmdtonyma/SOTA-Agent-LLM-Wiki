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
symbols:
  - resolveJsonSchemaStrictSampling
  - resolveGrammarConstrainedSampling
  - appendGrammarToolInputJsonDelta
related:
  - subsys.ai.openai-responses
  - subsys.ai.openai-completions
  - subsys.ai.anthropic-messages
  - spine.tool-call-anatomy
  - subsys.coding-agent.tool-wrapper
evidence: explicit
status: verified
updated: c1019d9202
---

> 约束采样把工具声明中的 JSON Schema strict 或 grammar 配置翻译成 provider wire 能力，并维护 grammar tool call 的增量 JSON 参数。

## 两种约束

`resolveJsonSchemaStrictSampling()` 只处理 `type: "json_schema"`：provider 支持 strict 时返回 `true`；不支持且策略为 `require` 时抛错；`prefer` 则降级为普通 schema。[E: packages/ai/src/api/constrained-sampling.ts:84] [E: packages/ai/src/api/constrained-sampling.ts:90] [E: packages/ai/src/api/constrained-sampling.ts:93] [E: packages/ai/src/api/constrained-sampling.ts:98]

`resolveGrammarConstrainedSampling()` 只在 provider 宣告 OpenAI grammar-tool 支持时生效，优先选择非空 Lark，后退到 regex。grammar 工具必须是 object schema，且恰好有一个 required string property。[E: packages/ai/src/api/constrained-sampling.ts:65] [E: packages/ai/src/api/constrained-sampling.ts:70] [E: packages/ai/src/api/constrained-sampling.ts:78] [E: packages/ai/src/api/constrained-sampling.ts:101] [E: packages/ai/src/api/constrained-sampling.ts:110] [E: packages/ai/src/api/constrained-sampling.ts:114] [E: packages/ai/src/api/constrained-sampling.ts:124]

配置从公共 `Tool.constrainedSampling` 进入 provider context [E: packages/ai/src/types.ts:460] [E: packages/ai/src/types.ts:485]。coding-agent extension `ToolDefinition` 暴露同一字段，正反 wrapper 都原样保留它，因此 extension tool 与 plain `AgentTool` 不会在 registry 适配时丢失约束 [E: packages/coding-agent/src/core/extensions/types.ts:459] [E: packages/coding-agent/src/core/extensions/types.ts:463] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:14] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:42]。

## Provider / wire 映射

grammar 当前只映射到 OpenAI-family wire：Responses adapter 在 capability `supportsOpenAIGrammarTools` 为 true 时生成 `type: "custom"` + grammar format，Completions adapter 生成 custom grammar tool；两者都优先 Lark、再选 regex。[E: packages/ai/src/api/openai-responses-shared.ts:344] [E: packages/ai/src/api/openai-responses-shared.ts:347] [E: packages/ai/src/api/openai-responses-shared.ts:350] [E: packages/ai/src/api/openai-responses-shared.ts:353] [E: packages/ai/src/api/openai-responses-shared.ts:357] [E: packages/ai/src/api/openai-completions.ts:1306] [E: packages/ai/src/api/openai-completions.ts:1311] [E: packages/ai/src/api/openai-completions.ts:1314] [E: packages/ai/src/api/openai-completions.ts:1319] 当 capability 为 false 时 resolver 返回 `undefined`，两个 adapter 会把同一 tool 降级为普通 function tool，而不是本地执行 grammar；测试锁定了 function fallback 且不写 strict 字段的 Responses 形态。[E: packages/ai/src/api/constrained-sampling.ts:110] [E: packages/ai/src/api/constrained-sampling.ts:111] [E: packages/ai/src/api/openai-responses-shared.ts:365] [E: packages/ai/src/api/openai-responses-shared.ts:369] [E: packages/ai/src/api/openai-completions.ts:1329] [E: packages/ai/src/api/openai-completions.ts:1331] [E: packages/ai/test/constrained-sampling.test.ts:105] [E: packages/ai/test/constrained-sampling.test.ts:109] [E: packages/ai/test/constrained-sampling.test.ts:110]。

Azure Responses 与 OpenAI Codex Responses 是独立 adapter，但也把 `supportsOpenAIGrammarTools` 传入 grammar property map 与共享 Responses tool conversion；两者同时把自身 `supportsStrictMode` capability 传给工具转换，所以不是只由标准 OpenAI Responses 入口消费约束配置。[E: packages/ai/src/api/azure-openai-responses.ts:104] [E: packages/ai/src/api/azure-openai-responses.ts:106] [E: packages/ai/src/api/azure-openai-responses.ts:275] [E: packages/ai/src/api/azure-openai-responses.ts:277] [E: packages/ai/src/api/azure-openai-responses.ts:301] [E: packages/ai/src/api/azure-openai-responses.ts:303] [E: packages/ai/src/api/openai-codex-responses.ts:277] [E: packages/ai/src/api/openai-codex-responses.ts:279] [E: packages/ai/src/api/openai-codex-responses.ts:535] [E: packages/ai/src/api/openai-codex-responses.ts:541] [E: packages/ai/src/api/openai-codex-responses.ts:543] [E: packages/ai/src/api/openai-codex-responses.ts:550]

JSON-schema strict 的 wire 支持分散在多类 adapter：

- OpenAI Responses / Completions 把 compat 的 strict capability 传给 resolver；支持时写 `strict`,不支持时 `prefer` 走普通 function schema、`require` 在构造请求时抛错。[E: packages/ai/src/api/openai-responses-shared.ts:345] [E: packages/ai/src/api/openai-responses-shared.ts:346] [E: packages/ai/src/api/openai-responses-shared.ts:365] [E: packages/ai/src/api/openai-responses-shared.ts:375] [E: packages/ai/src/api/openai-completions.ts:1329] [E: packages/ai/src/api/openai-completions.ts:1337]
- Anthropic 只在 `model.compat.supportsStrictTools` 打开时保留完整 schema 并写 `strict: true`;默认 capability 为 false。[E: packages/ai/src/api/anthropic-messages.ts:183] [E: packages/ai/src/api/anthropic-messages.ts:1298] [E: packages/ai/src/api/anthropic-messages.ts:1306] [E: packages/ai/src/api/anthropic-messages.ts:1317]
- Google Generative AI / Vertex 只把 Gemini major version 3+ 判为 strict-capable，并将有 strict tool 的自动 function-calling mode 提升到 `VALIDATED`。[E: packages/ai/src/api/google-shared.ts:304] [E: packages/ai/src/api/google-shared.ts:306] [E: packages/ai/src/api/google-shared.ts:328] [E: packages/ai/src/api/google-shared.ts:332] [E: packages/ai/src/api/google-shared.ts:333] [E: packages/ai/src/api/google-generative-ai.ts:370] [E: packages/ai/src/api/google-generative-ai.ts:371] [E: packages/ai/src/api/google-vertex.ts:469] [E: packages/ai/src/api/google-vertex.ts:470]
- Mistral 固定以 supported=true 解析 strict，并写到 function tool；Bedrock 则由 `model.compat.supportsStrictMode ?? false` 决定是否在 `toolSpec` 写 strict。[E: packages/ai/src/api/mistral-conversations.ts:495] [E: packages/ai/src/api/mistral-conversations.ts:497] [E: packages/ai/src/api/mistral-conversations.ts:504] [E: packages/ai/src/api/bedrock-converse-stream.ts:243] [E: packages/ai/src/api/bedrock-converse-stream.ts:985] [E: packages/ai/src/api/bedrock-converse-stream.ts:991] [E: packages/ai/src/api/bedrock-converse-stream.ts:997]

## 增量参数

grammar provider 可能发送逐步增长的原始字符串。`appendGrammarToolInputJsonDelta()` 把它包装为单属性 JSON delta，并拒绝非单调变化或关闭后的修改；`getGrammarToolInput()` 在完成时验证目标属性确为 string。[E: packages/ai/src/api/constrained-sampling.ts:21] [E: packages/ai/src/api/constrained-sampling.ts:33] [E: packages/ai/src/api/constrained-sampling.ts:39] [E: packages/ai/src/api/constrained-sampling.ts:43] [E: packages/ai/src/api/constrained-sampling.ts:50] [E: packages/ai/src/api/constrained-sampling.ts:58]

## L2 证伪与边界

- grammar 配置存在并不保证生效：provider capability 为 false 时函数直接返回 `undefined`，而不是本地执行 grammar validator。[E: packages/ai/src/api/constrained-sampling.ts:101] [E: packages/ai/src/api/constrained-sampling.ts:110]
- 缺少 grammar 变体或 schema 不满足单一 string 输入时会在请求构造阶段失败；这不是模型返回后的 validation。[E: packages/ai/src/api/constrained-sampling.ts:118] [E: packages/ai/src/api/constrained-sampling.ts:130]
- grammar 与 JSON strict 不是全 provider 通用能力：grammar 只在 OpenAI-family compat 开关打开时成为 custom grammar tool；JSON strict 也分别受 OpenAI/Anthropic/Google/Bedrock capability 或 Mistral adapter 行为约束。[I]

本节点的 request-side constrained sampling 与 response-side tool argument validation 是两个边界。`validateToolArguments()` 会 clone arguments、执行 TypeBox conversion，再按 schema validate；对 `anyOf`/`oneOf` union，coercion 现在先检查原值是否已匹配任一 arm，只有完全不匹配才逐 arm 尝试转换，避免 nullable union 中的 `null` 被错误强转为 primitive。[E: packages/ai/src/utils/validation.ts:174] [E: packages/ai/src/utils/validation.ts:178] [E: packages/ai/src/utils/validation.ts:182] [E: packages/ai/src/utils/validation.ts:190] [E: packages/ai/src/utils/validation.ts:285] [E: packages/ai/src/utils/validation.ts:291]

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

## 相关

- [subsys.ai.openai-responses](openai-responses.md): OpenAI Responses 的 strict/grammar wire 映射。
- [subsys.ai.openai-completions](openai-completions.md): OpenAI-compatible completions 映射。
- [subsys.ai.anthropic-messages](anthropic-messages.md): Anthropic tool schema 能力边界。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md): 约束配置随 tool definition 进入执行链的位置。
- [subsys.coding-agent.tool-wrapper](../coding-agent/tool-wrapper.md): extension definition 与 core tool 的双向适配。
