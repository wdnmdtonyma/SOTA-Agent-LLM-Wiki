---
id: subsys.model-api
path: subsystems/model-api.md
title: 模型与 API 层
kind: subsystem
tier: T2
status: verified
source: [services/api/, utils/model/]
symbols: [queryModel, queryModelWithStreaming, queryModelWithoutStreaming, getAnthropicClient, withRetry, getAPIProvider, getMainLoopModel, parseUserSpecifiedModel, refreshModelCapabilities]
related: [spine.agent-loop]
evidence: explicit
updated: 2026-06-14
---

> 模型与 API 层把 agent loop 的 messages、system prompt、thinking config、tools、model setting 和 provider auth 转换成 Anthropic SDK request, 并负责 retry、stream parsing、cache/beta headers 与 API error 映射。

## 能回答的问题

- `queryModelWithStreaming()` 和 `queryModelWithoutStreaming()` 最终如何进入同一个 generator?
- ToolSearch/deferred tools、system prompt cache、cache edits、fast/auto/advisor betas 在哪里拼入 request?
- first-party、Bedrock、Vertex、Foundry 的 client 选择在哪个函数完成?
- retry 层如何处理 auth refresh、fast mode fallback、persistent retry 和 max tokens overflow?
- model alias、默认模型、`[1m]` suffix 和 model capabilities cache 在哪里解析?

## 职责边界

模型与 API 层负责构造 API request 和解释 API stream; 它不决定 agent loop 是否继续下一轮, 也不执行 tool calls。下一轮状态由 [Agent loop](../spine/agent-loop.md) 控制, tool schema 的源头来自 [工具系统机制](tool-system.md), compaction cache edits 来自 [压缩家族](compaction.md)。[E: services/api/claude.ts:1017][E: services/api/claude.ts:1235][E: services/api/claude.ts:1778][I]

`services/api/claude.ts` 是 query-to-API adapter, `services/api/client.ts` 是 provider client factory, `services/api/withRetry.ts` 是 retry engine, `utils/model/` 是 model/provider selection 和 capabilities cache。[E: services/api/claude.ts:676][E: services/api/client.ts:88][E: services/api/withRetry.ts:170][E: utils/model/providers.ts:6][E: utils/model/model.ts:92]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `services/api/claude.ts` | 构造 model request、tool schemas、system prompt、betas、cache control、stream parser 和 API usage/update messages。[E: services/api/claude.ts:272][E: services/api/claude.ts:333][E: services/api/claude.ts:676][E: services/api/claude.ts:1017][E: services/api/claude.ts:1538][E: services/api/claude.ts:1940] |
| `services/api/client.ts` | 根据 provider/env/auth 构造 Anthropic/Bedrock/Foundry/Vertex client, 注入 default headers、API key/OAuth、custom headers 和 fetch wrapper。[E: services/api/client.ts:88][E: services/api/client.ts:105][E: services/api/client.ts:153][E: services/api/client.ts:191][E: services/api/client.ts:221][E: services/api/client.ts:301][E: services/api/client.ts:318][E: services/api/client.ts:358] |
| `services/api/withRetry.ts` | 手写 retry loop, 处理 auth/stale client refresh、fast mode fallback、context overflow、persistent retry heartbeat 和 retryability。[E: services/api/withRetry.ts:170][E: services/api/withRetry.ts:250][E: services/api/withRetry.ts:271][E: services/api/withRetry.ts:431][E: services/api/withRetry.ts:489][E: services/api/withRetry.ts:696] |
| `services/api/errors.ts` | 把 timeout、rate limit、auth、tool use mismatch、prompt too long、provider error 等异常映射成 assistant/system error category。[E: services/api/errors.ts:425][E: services/api/errors.ts:467][E: services/api/errors.ts:965][E: services/api/errors.ts:1163] |
| `utils/model/providers.ts` | 根据 env 选择 `firstParty`、`bedrock`、`vertex`、`foundry`, 并识别 first-party Anthropic base URL。[E: utils/model/providers.ts:4][E: utils/model/providers.ts:6][E: utils/model/providers.ts:25] |
| `utils/model/model.ts` | 解析 user model setting、默认模型、plan-mode runtime model、alias、legacy remap、marketing name 和 API normalization。[E: utils/model/model.ts:61][E: utils/model/model.ts:92][E: utils/model/model.ts:145][E: utils/model/model.ts:178][E: utils/model/model.ts:445][E: utils/model/model.ts:616] |
| `utils/model/modelCapabilities.ts` | first-party ant 环境下缓存 `/models` capabilities, 为 context/max token 能力查询提供本地 cache。[E: utils/model/modelCapabilities.ts:19][E: utils/model/modelCapabilities.ts:46][E: utils/model/modelCapabilities.ts:75][E: utils/model/modelCapabilities.ts:85] |

## 数据模型

`Options` 是 query API adapter 的会话级配置: model、tool choice、non-interactive 标志、extra tool schemas、fallback model、query source、agents、prompt caching、temperature/effort、MCP tools、pending MCP servers、query tracking、agent id、output format、fast/advisor model、task budget 等都在这里传入。[E: services/api/claude.ts:676][E: services/api/claude.ts:679][E: services/api/claude.ts:681][E: services/api/claude.ts:683][E: services/api/claude.ts:685][E: services/api/claude.ts:690][E: services/api/claude.ts:693][E: services/api/claude.ts:694][E: services/api/claude.ts:695][E: services/api/claude.ts:696][E: services/api/claude.ts:697][E: services/api/claude.ts:698][E: services/api/claude.ts:699][E: services/api/claude.ts:700][E: services/api/claude.ts:706]

`APIProvider` 是四值 union; `getAPIProvider()` 按 Bedrock、Vertex、Foundry env flags 优先级选择 provider, 否则回到 firstParty。[E: utils/model/providers.ts:4][E: utils/model/providers.ts:6][E: utils/model/providers.ts:7]

model setting 优先级是 session override、startup flag/env/settings、默认值; `getMainLoopModel()` 会把 user setting 经 `parseUserSpecifiedModel()` 解析成实际 model name。[E: utils/model/model.ts:61][E: utils/model/model.ts:64][E: utils/model/model.ts:69][E: utils/model/model.ts:92][E: utils/model/model.ts:95]

`ModelCapability` cache 文件只在 ant + firstParty + first-party base URL 下启用, `refreshModelCapabilities()` 用 `anthropic.models.list()` 拉取并写入本地 cache。[E: utils/model/modelCapabilities.ts:19][E: utils/model/modelCapabilities.ts:46][E: utils/model/modelCapabilities.ts:85][E: utils/model/modelCapabilities.ts:90][E: utils/model/modelCapabilities.ts:93][E: utils/model/modelCapabilities.ts:106]

## 控制流

1. `queryModelWithoutStreaming()` 和 `queryModelWithStreaming()` 都通过 `withStreamingVCR()` 调用同一个 `queryModel()` generator; 非 streaming wrapper 只是消费 generator 后返回最后的 assistant message。[E: services/api/claude.ts:709][E: services/api/claude.ts:727][E: services/api/claude.ts:752][E: services/api/claude.ts:770]
2. `queryModel()` 首先处理非订阅 Opus off-switch、从 messages 中提取 previous request id、把 Bedrock inference profile resolve 到 backing model, 并计算 agentic query beta headers。[E: services/api/claude.ts:1017][E: services/api/claude.ts:1032][E: services/api/claude.ts:1033][E: services/api/claude.ts:1055][E: services/api/claude.ts:1057][E: services/api/claude.ts:1065][E: services/api/claude.ts:1071]
3. ToolSearch path 调用 `isToolSearchEnabled()`, 预计算 deferred tool names; 如果没有 deferred tools 且没有 pending MCP server, 会关闭 ToolSearch; 打开时只把已 discover 的 deferred tools 加入 `filteredTools`。[E: services/api/claude.ts:1120][E: services/api/claude.ts:1129][E: services/api/claude.ts:1131][E: services/api/claude.ts:1141][E: services/api/claude.ts:1142][E: services/api/claude.ts:1147][E: services/api/claude.ts:1158][E: services/api/claude.ts:1160]
4. tool schemas 由 `toolToAPISchema()` 并行构建, 入参仍带完整 `tools` 列表, 以便 ToolSearch prompt 能描述全部可用 deferred/MCP tools; `deferLoading` 由 `willDefer(tool)` 决定。[E: services/api/claude.ts:1235][E: services/api/claude.ts:1237][E: services/api/claude.ts:1239][E: services/api/claude.ts:1243]
5. messages 先经 `normalizeMessagesForAPI()`, 不支持 ToolSearch 时再 strip `tool_reference` 和 `caller`, 随后修复 tool_use/tool_result pairing 并裁剪超量 media items。[E: services/api/claude.ts:1266][E: services/api/claude.ts:1283][E: services/api/claude.ts:1288][E: services/api/claude.ts:1291][E: services/api/claude.ts:1301][E: services/api/claude.ts:1312]
6. request system prompt 包含 attribution fingerprint、CLI system prefix、原 system prompt、可选 advisor/chrome instructions, 再由 `buildSystemPromptBlocks()` 结合 prompt caching 设置生成 API `system` blocks。[E: services/api/claude.ts:1325][E: services/api/claude.ts:1358][E: services/api/claude.ts:1360][E: services/api/claude.ts:1361][E: services/api/claude.ts:1365][E: services/api/claude.ts:1366][E: services/api/claude.ts:1367][E: services/api/claude.ts:1374][E: services/api/claude.ts:1376]
7. beta/cache related latches 包括 auto/AFK、fast mode、cache editing、thinking clear; prompt cache break detection 会排除 `defer_loading` tools 后记录实际发送的 cache key 组成。[E: services/api/claude.ts:1412][E: services/api/claude.ts:1425][E: services/api/claude.ts:1431][E: services/api/claude.ts:1446][E: services/api/claude.ts:1465][E: services/api/claude.ts:1471]
8. `paramsFromContext()` 每次 retry 都重建 params: 合并 betas/Bedrock extra body、effort、task budget、structured output、max output tokens、thinking、context management、prompt caching、fast speed、AFK/cache-editing headers、temperature, 最后返回 model/messages/system/tools/tool_choice/metadata/max_tokens/thinking/output_config/speed。[E: services/api/claude.ts:1538][E: services/api/claude.ts:1557][E: services/api/claude.ts:1563][E: services/api/claude.ts:1571][E: services/api/claude.ts:1579][E: services/api/claude.ts:1591][E: services/api/claude.ts:1604][E: services/api/claude.ts:1633][E: services/api/claude.ts:1640][E: services/api/claude.ts:1652][E: services/api/claude.ts:1668][E: services/api/claude.ts:1685][E: services/api/claude.ts:1700][E: services/api/claude.ts:1711][E: services/api/claude.ts:1715][E: services/api/claude.ts:1725][E: services/api/claude.ts:1727]
9. `getAnthropicClient()` 先构建 default headers 和 auth, 再按 Bedrock、Foundry、Vertex、first-party 分支返回 SDK client; first-party 分支用 OAuth token 或 API key, provider 分支各自处理云认证。[E: services/api/client.ts:88][E: services/api/client.ts:105][E: services/api/client.ts:131][E: services/api/client.ts:135][E: services/api/client.ts:153][E: services/api/client.ts:191][E: services/api/client.ts:221][E: services/api/client.ts:301][E: services/api/client.ts:315]
10. `withRetry()` 在每次 attempt 前检查 abort, 必要时刷新 client/auth 或关闭 stale keep-alive; fast mode 遇到 429/529 会根据 retry-after 短重试或切 cooldown, persistent mode 会把长 sleep 拆成 heartbeat yields。[E: services/api/withRetry.ts:170][E: services/api/withRetry.ts:189][E: services/api/withRetry.ts:190][E: services/api/withRetry.ts:250][E: services/api/withRetry.ts:271][E: services/api/withRetry.ts:284][E: services/api/withRetry.ts:431][E: services/api/withRetry.ts:489][E: services/api/withRetry.ts:493]
11. streaming request 通过 `anthropic.beta.messages.create({...params, stream:true}).withResponse()` 发出; 返回 raw stream 后, parser 用 watchdog 检测 idle, 按 message/content block delta 累积 content, 在 `content_block_stop` yield assistant message, 在 `message_delta` 回填 usage/stop reason。[E: services/api/claude.ts:1778][E: services/api/claude.ts:1822][E: services/api/claude.ts:1832][E: services/api/claude.ts:1874][E: services/api/claude.ts:1911][E: services/api/claude.ts:1940][E: services/api/claude.ts:1979][E: services/api/claude.ts:1995][E: services/api/claude.ts:2053][E: services/api/claude.ts:2171][E: services/api/claude.ts:2213]
12. model parser 处理 aliases、`[1m]` suffix、legacy Opus first-party remap、ant model override 和 API normalization; `normalizeModelStringForAPI()` 会去掉 `[1m]`/`[2m]` suffix 后发给 API。[E: utils/model/model.ts:445][E: utils/model/model.ts:451][E: utils/model/model.ts:456][E: utils/model/model.ts:479][E: utils/model/model.ts:482][E: utils/model/model.ts:485][E: utils/model/model.ts:502][E: utils/model/model.ts:616]

## 设计动机与权衡

`paramsFromContext()` 在 retry 时重算 max tokens、model、fast mode 和 cache/body params, 因为 retry context 可能因 context overflow、fallback model 或 fast mode cooldown 改变; 同时 pending cache edits 在函数定义前 consume 一次, 避免日志/重试多次调用 params builder 时重复消费。[E: services/api/claude.ts:1531][E: services/api/claude.ts:1538][E: services/api/claude.ts:1591][I]

ToolSearch 的过滤发生在 schema build 前, 但 `toolToAPISchema()` 仍拿完整 tools 列表, 这是为了让 ToolSearch 自己能列出全部候选工具, 而 API 实际只收到当前已 discover 或非 deferred 的 schemas。[E: services/api/claude.ts:1160][E: services/api/claude.ts:1235][E: services/api/claude.ts:1239][I]

model alias parser 保留 custom model 的原始大小写, 只在识别到 suffix 时做有限 normalization; 这对 Foundry deployment ID 这类用户自定义模型名有意义。[E: utils/model/model.ts:502][E: utils/model/model.ts:505][I]

## Gotcha

- `getExtraBodyParams()` 会浅拷贝 env JSON object; 这是为了避免复用解析结果时被后续 mutation 污染。[E: services/api/claude.ts:286][I]
- prompt caching 可被全局禁用, 也可按 Haiku/Sonnet/Opus 默认模型禁用; 不能只看 API provider 判断 cache 是否启用。[E: services/api/claude.ts:333][E: services/api/claude.ts:335][E: services/api/claude.ts:338][E: services/api/claude.ts:344][E: services/api/claude.ts:350]
- `shouldRetry()` 对 subscriber 429 默认不重试, Enterprise 例外; persistent mode 对 429/529 另走 always retry path。[E: services/api/withRetry.ts:704][E: services/api/withRetry.ts:767]

## Sources

- `services/api/claude.ts`
- `services/api/client.ts`
- `services/api/withRetry.ts`
- `services/api/errors.ts`
- `utils/model/providers.ts`
- `utils/model/model.ts`
- `utils/model/modelCapabilities.ts`

## 相关

- [Agent loop](../spine/agent-loop.md)
- [工具系统机制](tool-system.md)
- [压缩家族](compaction.md)
