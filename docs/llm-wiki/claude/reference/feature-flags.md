---
id: ref.feature-flags
title: Feature flag 目录
kind: reference
tier: T3
path: reference/feature-flags.md
source: [utils/betas.ts, constants/]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Feature flag 目录把 `utils/betas.ts` 的 beta header 决策、`constants/betas.ts` 的 header 常量、`constants/` 下的 `feature(...)` build/runtime gate 与 GrowthBook flag/value 名称分开索引。

## 能回答的问题

- Claude Code 会向 Anthropic API 添加哪些 beta headers？
- 哪些 beta headers 会在 Bedrock extra body params 而不是普通 headers 里发送？
- `tengu_tool_pear`、`tengu_amber_json_tools`、`tengu_auto_mode_config` 分别影响什么？
- `KAIROS`、`PROACTIVE`、`TOKEN_BUDGET`、`EXPERIMENTAL_SKILL_SEARCH` 等 `feature(...)` gate 在 constants 层控制什么？
- 哪个 env var 是 experimental betas 的 kill switch？

## API beta header 常量

| header 常量 | beta 字符串/来源 | 含义/使用 | 定义处 |
|---|---|---|---|
| `CLAUDE_CODE_20250219_BETA_HEADER` | `claude-code-20250219` | 非 Haiku 模型默认加入，agentic Haiku query 也会补入。[E: constants/betas.ts:3][E: utils/betas.ts:241][E: utils/betas.ts:407] | `constants/betas.ts` |
| `INTERLEAVED_THINKING_BETA_HEADER` | `interleaved-thinking-2025-05-14` | `DISABLE_INTERLEAVED_THINKING` 未 truthy 且 model 支持 ISP 时加入。[E: constants/betas.ts:4][E: utils/betas.ts:258][E: utils/betas.ts:261] | `constants/betas.ts` |
| `CONTEXT_1M_BETA_HEADER` | `context-1m-2025-08-07` | `has1mContext(model)` 为 true 时加入；也是 SDK betas allowlist 的唯一项。[E: constants/betas.ts:6][E: utils/betas.ts:37][E: utils/betas.ts:254] | `constants/betas.ts` |
| `CONTEXT_MANAGEMENT_BETA_HEADER` | `context-management-2025-06-27` | firstParty/foundry experimental betas 允许且 tool clearing opt-in 或 thinking preservation 支持时加入。[E: constants/betas.ts:7][E: utils/betas.ts:307][E: utils/betas.ts:311] | `constants/betas.ts` |
| `STRUCTURED_OUTPUTS_BETA_HEADER` | `structured-outputs-2025-12-15` | firstParty/foundry、model supports structured outputs 且 `tengu_tool_pear` gate 开启时加入。[E: constants/betas.ts:8][E: utils/betas.ts:319][E: utils/betas.ts:331] | `constants/betas.ts` |
| `WEB_SEARCH_BETA_HEADER` | `web-search-2025-03-05` | Vertex Claude 4+ 或 Foundry provider 加入 web search beta。[E: constants/betas.ts:9][E: utils/betas.ts:346][E: utils/betas.ts:351] | `constants/betas.ts` |
| `TOOL_SEARCH_BETA_HEADER_1P` | `advanced-tool-use-2025-11-20` | Claude API/Foundry provider 的 tool search beta header。[E: constants/betas.ts:13][E: utils/betas.ts:202][E: utils/betas.ts:207] | `constants/betas.ts` |
| `TOOL_SEARCH_BETA_HEADER_3P` | `tool-search-tool-2025-10-19` | Vertex/Bedrock provider 的 tool search beta header。[E: constants/betas.ts:14][E: utils/betas.ts:203][E: utils/betas.ts:205] | `constants/betas.ts` |
| `EFFORT_BETA_HEADER` | `effort-2025-11-24` | constants 层导出 effort beta header；本页所读 `utils/betas.ts` 片段未显示加入逻辑。[E: constants/betas.ts:15][I] | `constants/betas.ts` |
| `TASK_BUDGETS_BETA_HEADER` | `task-budgets-2026-03-13` | constants 层导出 task budgets beta header；本页所读 `utils/betas.ts` 片段未显示加入逻辑。[E: constants/betas.ts:16][I] | `constants/betas.ts` |
| `PROMPT_CACHING_SCOPE_BETA_HEADER` | `prompt-caching-scope-2026-01-05` | firstParty/foundry experimental betas 允许时加入。[E: constants/betas.ts:17][E: utils/betas.ts:355][E: utils/betas.ts:356] | `constants/betas.ts` |
| `FAST_MODE_BETA_HEADER` | `fast-mode-2026-02-01` | constants 层导出 fast mode beta header；本页所读 `utils/betas.ts` 片段未显示加入逻辑。[E: constants/betas.ts:19][I] | `constants/betas.ts` |
| `REDACT_THINKING_BETA_HEADER` | `redact-thinking-2026-02-12` | firstParty-only betas、model supports ISP、interactive session、settings 未要求 showThinkingSummaries 时加入。[E: constants/betas.ts:20][E: utils/betas.ts:270][E: utils/betas.ts:276] | `constants/betas.ts` |
| `TOKEN_EFFICIENT_TOOLS_BETA_HEADER` | `token-efficient-tools-2026-03-28` | ant user、firstParty-only betas、`tengu_amber_json_tools` value 开启且 strict tools 未开时加入。[E: constants/betas.ts:21][E: utils/betas.ts:323][E: utils/betas.ts:338][E: utils/betas.ts:339][E: utils/betas.ts:340][E: utils/betas.ts:342] | `constants/betas.ts` |
| `SUMMARIZE_CONNECTOR_TEXT_BETA_HEADER` | gated by `feature('CONNECTOR_TEXT')` | `CONNECTOR_TEXT` build flag 关闭时为空；ant、firstParty-only、env/GB 条件满足时加入。[E: constants/betas.ts:23][E: utils/betas.ts:290][E: utils/betas.ts:291][E: utils/betas.ts:292][E: utils/betas.ts:297] | `constants/betas.ts` |
| `AFK_MODE_BETA_HEADER` | gated by `feature('TRANSCRIPT_CLASSIFIER')` | `TRANSCRIPT_CLASSIFIER` build flag 关闭时为空；constants 层导出 afk mode header。[E: constants/betas.ts:26] | `constants/betas.ts` |
| `CLI_INTERNAL_BETA_HEADER` | `USER_TYPE === 'ant' ? cli-internal-2026-02-09 : ''` | ant CLI entrypoint 条件下加入，agentic query 也会补齐。[E: constants/betas.ts:29][E: utils/betas.ts:243][E: utils/betas.ts:247][E: utils/betas.ts:411] | `constants/betas.ts` |
| `ADVISOR_BETA_HEADER` | `advisor-tool-2026-03-01` | constants 层导出 advisor beta header；本页所读 `utils/betas.ts` 片段未显示加入逻辑。[E: constants/betas.ts:31][I] | `constants/betas.ts` |
| `OAUTH_BETA_HEADER` | `oauth-2025-04-20` | Claude AI subscriber 时加入 OAuth beta header。[E: constants/oauth.ts:36][E: utils/betas.ts:251][E: utils/betas.ts:252] | `constants/oauth.ts` |

## Provider 与 beta 过滤

| symbol | 签名/规则 | 含义 | 定义处 |
|---|---|---|---|
| `ALLOWED_SDK_BETAS` | `[CONTEXT_1M_BETA_HEADER]` | SDK-provided betas 只允许 1M context header。[E: utils/betas.ts:37] | `utils/betas.ts` |
| `filterAllowedSdkBetas` | `(sdkBetas?: string[]) => string[] | undefined` | 过滤 SDK betas；subscriber 会直接忽略，自定义 beta 只给 API key users。[E: utils/betas.ts:64][E: utils/betas.ts:71][E: utils/betas.ts:86] | `utils/betas.ts` |
| `modelSupportsISP` | provider + model capability | Foundry 全支持 interleaved thinking；firstParty 排除 Claude 3；第三方只允许 Claude Opus/Sonnet 4 family。[E: utils/betas.ts:92][E: utils/betas.ts:103][E: utils/betas.ts:106][E: utils/betas.ts:110] | `utils/betas.ts` |
| `modelSupportsContextManagement` | provider + Claude 4 family | Foundry 支持 context management；firstParty 排除 Claude 3；其他 provider 检查 Opus/Sonnet/Haiku 4 family。[E: utils/betas.ts:125][E: utils/betas.ts:128][E: utils/betas.ts:131][E: utils/betas.ts:135][E: utils/betas.ts:136][E: utils/betas.ts:137] | `utils/betas.ts` |
| `modelSupportsStructuredOutputs` | firstParty/foundry + allowlist | structured outputs 只支持 firstParty/foundry，并按 Claude 4.5/4.6/Opus 4.1/Haiku 4.5 allowlist 判断。[E: utils/betas.ts:142][E: utils/betas.ts:146][E: utils/betas.ts:150][E: utils/betas.ts:151][E: utils/betas.ts:152][E: utils/betas.ts:153][E: utils/betas.ts:154][E: utils/betas.ts:155] | `utils/betas.ts` |
| `modelSupportsAutoMode` | `TRANSCRIPT_CLASSIFIER` + provider/model/GB override | auto mode 需要 `TRANSCRIPT_CLASSIFIER` feature；external users 只允许 firstParty，GB `tengu_auto_mode_config.allowModels` 可 force-enable listed models。[E: utils/betas.ts:160][E: utils/betas.ts:161][E: utils/betas.ts:166][E: utils/betas.ts:175][E: utils/betas.ts:178][E: utils/betas.ts:179] | `utils/betas.ts` |
| `shouldIncludeFirstPartyOnlyBetas` | firstParty/foundry and not disabled | firstParty-only experimental betas 的总开关；`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` truthy 时关闭。[E: utils/betas.ts:215][E: utils/betas.ts:217][E: utils/betas.ts:218] | `utils/betas.ts` |
| `shouldUseGlobalCacheScope` | firstParty and not disabled | global-scope prompt caching 只在 firstParty provider 且 experimental betas 未禁用时启用。[E: utils/betas.ts:227][E: utils/betas.ts:229][E: utils/betas.ts:230] | `utils/betas.ts` |
| `getAllModelBetas` | memoized `(model) => string[]` | 汇总模型/provider/env/GB/SDK-independent beta headers，末尾会合并 `ANTHROPIC_BETAS` 逗号分隔显式 opt-in。[E: utils/betas.ts:234][E: utils/betas.ts:361][E: utils/betas.ts:368] | `utils/betas.ts` |
| `getModelBetas` | Bedrock filters extra body params | Bedrock provider 会过滤掉 `BEDROCK_EXTRA_PARAMS_HEADERS`，普通 provider 直接返回 all betas。[E: utils/betas.ts:371][E: utils/betas.ts:373][E: utils/betas.ts:376] | `utils/betas.ts` |
| `getBedrockExtraBodyParamsBetas` | only Bedrock extra params set | 从 all betas 中选出 Bedrock extra body params headers。[E: utils/betas.ts:379][E: utils/betas.ts:382] | `utils/betas.ts` |
| `getMergedBetas` | base model betas + SDK betas no duplicates | agentic query 会确保 Claude Code 和 ant CLI internal headers 存在，再去重合并 SDK betas。[E: utils/betas.ts:397][E: utils/betas.ts:406][E: utils/betas.ts:408][E: utils/betas.ts:416][E: utils/betas.ts:427] | `utils/betas.ts` |
| `clearBetasCaches` | clears three memoize caches | 清空 getAllModelBetas/getModelBetas/getBedrockExtraBodyParamsBetas caches。[E: utils/betas.ts:430][E: utils/betas.ts:431][E: utils/betas.ts:433] | `utils/betas.ts` |
| `BEDROCK_EXTRA_PARAMS_HEADERS` | set of ISP/context1m/tool-search-3P | Bedrock 这些 beta strings 应放入 extraBodyParams，不放普通 headers。[E: constants/betas.ts:38][E: constants/betas.ts:39][E: constants/betas.ts:40][E: constants/betas.ts:41] | `constants/betas.ts` |
| `VERTEX_COUNT_TOKENS_ALLOWED_BETAS` | set of claude-code/ISP/context-management | Vertex countTokens API 允许的 beta 集合。[E: constants/betas.ts:48][E: constants/betas.ts:49][E: constants/betas.ts:50][E: constants/betas.ts:51] | `constants/betas.ts` |

## Build flag 与 GrowthBook flag catalog

| flag 名称 | 类型 | 直接效果 | 定义处 |
|---|---|---|---|
| `TRANSCRIPT_CLASSIFIER` | `feature(...)` | 允许 permission mode runtime list 加入 `auto`，并启用 `modelSupportsAutoMode` 逻辑。[E: types/permissions.ts:35][E: utils/betas.ts:161] | `types/permissions.ts`, `utils/betas.ts` |
| `CONNECTOR_TEXT` | `feature(...)` | 控制 connector-text summarization beta header 常量是否为空。[E: constants/betas.ts:23] | `constants/betas.ts` |
| `CACHED_MICROCOMPACT` | `feature(...)` | constants prompt 层条件 require cached microcompact config，并控制 Function Result Clearing section 是否可生成。[E: constants/prompts.ts:66][E: constants/prompts.ts:822] | `constants/prompts.ts` |
| `PROACTIVE` | `feature(...)` | 与 `KAIROS` 一起启用 proactive module 和 autonomous work section。[E: constants/prompts.ts:72][E: constants/prompts.ts:861] | `constants/prompts.ts` |
| `KAIROS` | `feature(...)` | 与 proactive/brief/remote-control/Kairos-only flows 绑定；constants prompt 中控制 proactive module、Brief tool prompt、brief section，bridge shutdown path 也以该 gate 保留 single-session remote session。[E: constants/prompts.ts:73][E: constants/prompts.ts:77][E: constants/prompts.ts:552][E: bridge/bridgeMain.ts:1526] | `constants/prompts.ts`, `bridge/bridgeMain.ts` |
| `KAIROS_BRIEF` | `feature(...)` | 允许 Brief tool prompt/section 在 Kairos 主 gate 外启用。[E: constants/prompts.ts:77][E: constants/prompts.ts:83][E: constants/prompts.ts:552] | `constants/prompts.ts` |
| `EXPERIMENTAL_SKILL_SEARCH` | `feature(...)` | 条件 require DiscoverSkillsTool prompt 和 skill search feature check；打开时 system prompt 可提示 DiscoverSkills 使用方式。[E: constants/prompts.ts:86][E: constants/prompts.ts:95][E: constants/prompts.ts:335] | `constants/prompts.ts` |
| `VERIFICATION_AGENT` | `feature(...)` | 与 GB `tengu_hive_evidence` 同时开启时，在 session-specific guidance 中要求非平凡实现后由 verification agent 独立核验。[E: constants/prompts.ts:390][E: constants/prompts.ts:393] | `constants/prompts.ts` |
| `TOKEN_BUDGET` | `feature(...)` | system prompt 动态 sections 中加入 token budget 指令。[E: constants/prompts.ts:538][E: constants/prompts.ts:546] | `constants/prompts.ts` |
| `WORKFLOW_SCRIPTS` | `feature(...)` | agent disallowed tools 集合中禁止 recursive workflow execution。[E: constants/tools.ts:45] | `constants/tools.ts` |
| `AGENT_TRIGGERS` | `feature(...)` | in-process teammate allowed tools 可加入 cron create/delete/list。[E: constants/tools.ts:85][E: constants/tools.ts:86] | `constants/tools.ts` |
| `NATIVE_CLIENT_ATTESTATION` | `feature(...)` | attribution header 中追加 `cch=00000` placeholder，Bun native HTTP stack 后续覆写。[E: constants/system.ts:82] | `constants/system.ts` |
| `VOICE_MODE` | `feature(...)` | prompt footer UI 中条件启用 voice hooks/state/shortcut。[E: components/PromptInput/PromptInputFooterLeftSide.tsx:266][E: components/PromptInput/PromptInputFooterLeftSide.tsx:283] | `components/PromptInput/PromptInputFooterLeftSide.tsx` |
| `tengu_auto_mode_config` | GrowthBook value | `allowModels` 可 force-enable auto mode models。[E: utils/betas.ts:175][E: utils/betas.ts:178][E: utils/betas.ts:179] | `utils/betas.ts` |
| `tengu_slate_prism` | GrowthBook value | connector-text summarization env 未强制时，用该 value 决定是否加入 summarization beta。[E: utils/betas.ts:293][E: utils/betas.ts:295] | `utils/betas.ts` |
| `tengu_tool_pear` | GrowthBook gate | strict tools / structured outputs beta 开关；strict 开启时 token-efficient tools 不启用。[E: utils/betas.ts:320][E: utils/betas.ts:323] | `utils/betas.ts` |
| `tengu_amber_json_tools` | GrowthBook value | token-efficient JSON tool_use beta 的开关，但被 strictToolsEnabled 排斥。[E: utils/betas.ts:323][E: utils/betas.ts:325] | `utils/betas.ts` |
| `tengu_hive_evidence` | GrowthBook value | verification agent guidance 的 ant-only A/B condition。[E: constants/prompts.ts:391][E: constants/prompts.ts:393] | `constants/prompts.ts` |
| `tengu_attribution_header` | GrowthBook value | attribution header 默认 true，可被 GB killswitch 关闭。[E: constants/system.ts:52][E: constants/system.ts:56] | `constants/system.ts` |
| `tengu_hawthorn_window` | GrowthBook value | tool result per-message aggregate budget 可由该 GB flag 覆盖，读取到 finite positive number 时直接返回 override。[E: utils/toolResultStorage.ts:421][E: utils/toolResultStorage.ts:423][E: utils/toolResultStorage.ts:431] | `utils/toolResultStorage.ts` |
| `tengu_amber_flint` | GrowthBook value | external agent swarms 的 killswitch；false 时 external opt-in 也关闭。[E: utils/agentSwarmsEnabled.ts:39][E: utils/agentSwarmsEnabled.ts:40] | `utils/agentSwarmsEnabled.ts` |

## Env kill switches 与 explicit opt-in

| env var | 效果 | 定义处 |
|---|---|---|
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | 关闭 firstParty/foundry experimental betas 和 global cache scope。[E: utils/betas.ts:218][E: utils/betas.ts:230] | `utils/betas.ts` |
| `DISABLE_INTERLEAVED_THINKING` | truthy 时不加入 interleaved thinking beta。[E: utils/betas.ts:258] | `utils/betas.ts` |
| `USE_CONNECTOR_TEXT_SUMMARIZATION` | defined-falsy 时关闭 connector-text summarization；truthy 时强制打开；unset 时交给 `tengu_slate_prism`。[E: utils/betas.ts:293][E: utils/betas.ts:294][E: utils/betas.ts:295] | `utils/betas.ts` |
| `USE_API_CONTEXT_MANAGEMENT` | ant 用户设置 truthy 时开启 API context management tool clearing path。[E: utils/betas.ts:301][E: utils/betas.ts:302] | `utils/betas.ts` |
| `ANTHROPIC_BETAS` | 逗号分隔显式 opt-in，直接 append 到 betaHeaders。[E: utils/betas.ts:361][E: utils/betas.ts:362][E: utils/betas.ts:363] | `utils/betas.ts` |
| `ENABLE_GROWTHBOOK_DEV` | ant 用户选择 dev GrowthBook client key。[E: constants/keys.ts:5][E: constants/keys.ts:7] | `constants/keys.ts` |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | defined-falsy 时关闭 attribution header。[E: constants/system.ts:52][E: constants/system.ts:53] | `constants/system.ts` |

## Sources

- `utils/betas.ts`
- `constants/`
- `types/permissions.ts`
- `utils/agentSwarmsEnabled.ts`
- `utils/toolResultStorage.ts`
- `components/PromptInput/PromptInputFooterLeftSide.tsx`

## 相关

- `ref.env-vars` 只列 `utils/env.ts` 里环境探测变量；本页列 beta/feature 逻辑直接读取的 env kill switch。
