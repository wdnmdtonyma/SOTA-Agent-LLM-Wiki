---
id: tool.remote-trigger
path: surface/tools/remote-trigger.md
title: RemoteTrigger
kind: tool
tier: T1
status: verified
source: [tools/RemoteTriggerTool/RemoteTriggerTool.ts]
symbols: [RemoteTriggerTool]
related: [subsys.bridge-remote]
updated: 2026-06-14
evidence: explicit
---

`RemoteTrigger` 是通过 claude.ai CCR API 管理 scheduled remote Claude Code agent triggers 的 deferred 工具, 支持 list/get/create/update/run 五种 action。[E: tools/RemoteTriggerTool/prompt.ts:1][E: tools/RemoteTriggerTool/prompt.ts:3][E: tools/RemoteTriggerTool/prompt.ts:9][E: tools/RemoteTriggerTool/prompt.ts:13][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:50]

## 能回答的问题

- `RemoteTrigger` 各 action 对 trigger_id/body 的要求是什么?
- `RemoteTrigger` 如何拿 OAuth token 和 organization UUID?
- 哪些 action 被视为 read-only?

## 1 Identity

- Tool name: `RemoteTrigger`。[E: tools/RemoteTriggerTool/prompt.ts:1][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:47]
- `tools.ts` 仅在 `feature('AGENT_TRIGGERS_REMOTE')` 时 lazy require `RemoteTriggerTool`。[E: tools.ts:36][E: tools.ts:37]
- `tools.ts` 仅当 `RemoteTriggerTool` truthy 时放入 base tools。[E: tools.ts:236]
- `searchHint`: `manage scheduled remote agent triggers`。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:48]
- `maxResultSizeChars`: `100_000`。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:49]

## 2 用途定位

`RemoteTrigger` prompt 要求用该工具调用 claude.ai remote-trigger API 而不是 curl, 因为 OAuth token 在进程内自动加入且不会暴露到 shell。[E: tools/RemoteTriggerTool/prompt.ts:6] API path 覆盖 `GET /v1/code/triggers`、`GET/POST /v1/code/triggers/{trigger_id}`、`POST /v1/code/triggers` 和 `POST /v1/code/triggers/{trigger_id}/run`。[E: tools/RemoteTriggerTool/prompt.ts:8][E: tools/RemoteTriggerTool/prompt.ts:13]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `action` | `list | get | create | update | run` | 是 | 无 | 决定 HTTP method/path。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:18][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:20] |
| `trigger_id` | `/^[\w-]+$/` string | 对 get/update/run 必需 | `undefined` | get/update/run 分支缺失会 throw。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:22][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:23][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:110][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:121][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:128] |
| `body` | `Record<string, unknown>` | 对 create/update 必需 | `undefined` | create/update 分支缺失会 throw。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:26][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:29][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:115][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:122] |

## 4 输出 & maxResultSizeChars

输出 schema 包含 HTTP `status` number 和 JSON string。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:37][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:38] `call()` 把 `res.status` 和 `jsonStringify(res.data)` 放入 data; `mapToolResultToToolResultBlockParam()` 返回 `HTTP ${status}\n${json}`。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:147][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:148][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:156]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:50] |
| `isEnabled()` | GB gate + policy | 需要 `tengu_surreal_dali` 为真且 policy `allow_remote_sessions` 允许。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:59][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:60] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:63][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:64] |
| `isReadOnly(input)` | `list/get` 为 true, 其他 false | 源码只把 `list` 和 `get` 判定为 read-only。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:67] |
| `checkPermissions()` | 默认 allow | 工具未声明该方法, `buildTool` 默认 allow。[I][E: Tool.ts:762][E: Tool.ts:766] |

## 6 权限

`RemoteTrigger` 没有自定义 `validateInput()` 或 `checkPermissions()`; schema 负责 action/trigger_id regex/body shape, 分支代码对缺少必需字段抛错, permission 使用 `buildTool` 默认 allow。[I][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:20][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:23][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:27][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:110][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:122][E: Tool.ts:762]

## 7 call() 走读

`call()` 先 `checkAndRefreshOAuthTokenIfNeeded()`, 再读取 Claude.ai OAuth access token; 没有 token 时要求 `/login`。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:79][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:80][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:83] 随后读取 organization UUID, 组合 base URL `${BASE_API_URL}/v1/code/triggers`, 并设置 bearer token、anthropic version、beta header 和 org UUID header。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:86][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:91][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:93][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:95][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:96][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:97]

action switch 将 list/get 映射为 GET, create/update/run 映射为 POST; run 使用 `{}` 作为 data。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:106][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:111][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:116][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:123][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:129][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:131] axios request 使用 20s timeout, 传入 `context.abortController.signal`, 且 `validateStatus` 总是 true, 所以非 2xx 也作为 data 返回。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:135][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:140][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:141][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:142]

## 8 渲染

工具定义挂载从 `UI.js` 导入的 `renderToolUseMessage` 和 `renderToolResultMessage`。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:16][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:159][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:160] 模型侧 result 是 raw status/json text。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:156]

## 9 设计动机·edge·历史

- `TRIGGERS_BETA` 固定为 `ccr-triggers-2026-01-30`, 并作为 `anthropic-beta` header 发出。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:44][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:96]
- read-only 判定只覆盖 `list/get`; `create/update/run` 都被视为非 read-only。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:67]
- `validateStatus: () => true` 让 API error response 也进入 tool output, 便于模型读取 raw JSON。[E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:142][E: tools/RemoteTriggerTool/RemoteTriggerTool.ts:149]

## Sources

- `tools/RemoteTriggerTool/RemoteTriggerTool.ts`
- `tools/RemoteTriggerTool/prompt.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `subsys.bridge-remote`
