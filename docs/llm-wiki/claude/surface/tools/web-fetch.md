---
id: tool.web-fetch
path: surface/tools/web-fetch.md
title: WebFetch
kind: tool
tier: T1
status: verified
source: [tools/WebFetchTool/WebFetchTool.ts, tools/WebFetchTool/prompt.ts, tools/WebFetchTool/UI.tsx, tools/WebFetchTool/utils.ts, tools/WebFetchTool/preapproved.ts, tools.ts]
symbols: [WebFetchTool]
related: []
updated: 2026-06-14
evidence: explicit
---

`WebFetch` 是 URL 内容获取与二级模型摘要工具: 工具定义负责 schema、权限、render 和 `call()`, `utils.ts` 负责 URL 校验、HTTPS upgrade、domain preflight、redirect 策略、缓存、HTML 转 markdown、binary persistence 与 Haiku 摘要。[E: tools/WebFetchTool/WebFetchTool.ts:66][E: tools/WebFetchTool/WebFetchTool.ts:214][E: tools/WebFetchTool/utils.ts:347][E: tools/WebFetchTool/utils.ts:484]

## 能回答的问题

- `WebFetch` 的输入字段、输出字段和 `maxResultSizeChars` 是什么?
- `WebFetch` 如何按 domain 做权限规则和 preapproved host 放行?
- `WebFetch` 如何处理 HTTP to HTTPS、redirect、cache、large markdown 和 binary content?
- `WebFetch` 为什么不是 authenticated/private URL 的首选工具?

## 1 Identity

- Tool name: `WebFetch`, 来自 `WEB_FETCH_TOOL_NAME` 常量。[E: tools/WebFetchTool/prompt.ts:1][E: tools/WebFetchTool/WebFetchTool.ts:67]
- `WebFetchTool` 在 `getAllBaseTools()` 的 base tool array 中注册。[E: tools.ts:207]
- `searchHint`: `fetch and extract content from a URL`。[E: tools/WebFetchTool/WebFetchTool.ts:68]
- `userFacingName()`: `Fetch`。[E: tools/WebFetchTool/WebFetchTool.ts:81]
- `maxResultSizeChars`: `100_000`。[E: tools/WebFetchTool/WebFetchTool.ts:70]
- `shouldDefer`: `true`, 说明该工具可走 deferred tool / ToolSearch 路径。[E: tools/WebFetchTool/WebFetchTool.ts:71][E: Tool.ts:442]

## 2 用途定位

`WebFetch` 的 prompt 描述它会 fetch URL、把 HTML 转成 markdown、用 small fast model 处理 prompt 并返回对页面内容的响应。[E: tools/WebFetchTool/prompt.ts:4][E: tools/WebFetchTool/prompt.ts:6][E: tools/WebFetchTool/prompt.ts:7][E: tools/WebFetchTool/prompt.ts:8] `WebFetchTool.prompt()` 还固定前置 authenticated/private URL warning, 要求在 Google Docs、Confluence、Jira、GitHub 等 authenticated service 上优先寻找 specialized MCP tool。[E: tools/WebFetchTool/WebFetchTool.ts:188]

`WebFetch` 是普通本地工具: `call()` 先通过 `getURLMarkdownContent(url, abortController)` 发起 HTTP 获取; preapproved 且短 markdown 内容直接返回, 其它内容才调用 `applyPromptToMarkdown(...)` 并进入 Haiku 摘要路径。这不同于 `WebSearch` 的 server-managed web search extra tool schema。[E: tools/WebFetchTool/WebFetchTool.ts:214][E: tools/WebFetchTool/WebFetchTool.ts:261][E: tools/WebFetchTool/WebFetchTool.ts:265][E: tools/WebFetchTool/WebFetchTool.ts:269][E: tools/WebFetchTool/WebFetchTool.ts:271][E: tools/WebFetchTool/utils.ts:503]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `url` | `string.url()` | 是 | 无 | 要获取内容的 URL。[E: tools/WebFetchTool/WebFetchTool.ts:26] | `validateInput()` 会再次 `new URL(url)`, 失败返回 `invalid_url`。[E: tools/WebFetchTool/WebFetchTool.ts:191][E: tools/WebFetchTool/WebFetchTool.ts:194][E: tools/WebFetchTool/WebFetchTool.ts:198] |
| `prompt` | `string` | 是 | 无 | 对 fetched content 运行的 prompt。[E: tools/WebFetchTool/WebFetchTool.ts:27] | schema 要求存在; 二级模型 prompt 由 `makeSecondaryModelPrompt(markdownContent, prompt, isPreapprovedDomain)` 组合。[E: tools/WebFetchTool/prompt.ts:23][E: tools/WebFetchTool/utils.ts:498] |

## 4 输出 & maxResultSizeChars

输出 object 包含 `bytes`、`code`、`codeText`、`result`、`durationMs` 和 `url`。[E: tools/WebFetchTool/WebFetchTool.ts:32] `call()` 在 redirect branch 和正常 branch 都构造同一 shape 的 `Output`。[E: tools/WebFetchTool/WebFetchTool.ts:237][E: tools/WebFetchTool/WebFetchTool.ts:287] `mapToolResultToToolResultBlockParam()` 只把 `result` 字符串放进 `tool_result.content`。[E: tools/WebFetchTool/WebFetchTool.ts:300]

`maxResultSizeChars=100_000` 是工具结果持久化阈值; URL markdown 本身还会被 `MAX_MARKDOWN_LENGTH=100_000` 限制, 超长内容在进入 Haiku 前截断并追加 truncation marker。[E: tools/WebFetchTool/WebFetchTool.ts:70][E: tools/WebFetchTool/utils.ts:128][E: tools/WebFetchTool/utils.ts:492][E: tools/WebFetchTool/utils.ts:493]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly()` | `true` | 源码直接返回 `true`; prompt 也声明不修改 files。[E: tools/WebFetchTool/WebFetchTool.ts:98][E: tools/WebFetchTool/prompt.ts:16] |
| `isConcurrencySafe()` | `true` | 源码直接返回 `true`。[E: tools/WebFetchTool/WebFetchTool.ts:95] |
| `isDestructive` | 默认 `false` | `WebFetchTool` 未声明 `isDestructive`; `buildTool` 默认 `isDestructive` 为 false。[E: tools/WebFetchTool/WebFetchTool.ts:66][E: Tool.ts:761] |
| `shouldDefer` | `true` | 工具定义显式设置 `shouldDefer: true`。[E: tools/WebFetchTool/WebFetchTool.ts:71] |
| `toAutoClassifierInput(input)` | `${url}: ${prompt}` 或 `url` | prompt 存在时拼接 URL 和 prompt, 否则仅返回 URL。[E: tools/WebFetchTool/WebFetchTool.ts:101] |

## 6 权限

`WebFetch` 的 permission rule content 按 hostname 生成 `domain:<hostname>`; schema 解析失败时退化为 `input:<input.toString()>`。[E: tools/WebFetchTool/WebFetchTool.ts:54][E: tools/WebFetchTool/WebFetchTool.ts:59][E: tools/WebFetchTool/WebFetchTool.ts:60] `checkPermissions()` 先检查 `isPreapprovedHost(parsedUrl.hostname, parsedUrl.pathname)`, 命中则直接 allow 并标记 `Preapproved host`。[E: tools/WebFetchTool/WebFetchTool.ts:104][E: tools/WebFetchTool/WebFetchTool.ts:112][E: tools/WebFetchTool/WebFetchTool.ts:114][E: tools/WebFetchTool/WebFetchTool.ts:116]

未 preapproved 时, `checkPermissions()` 依次查 deny、ask、allow 三类规则; deny 返回 `behavior: 'deny'`, ask 返回 `behavior: 'ask'` 和 addRules suggestion, allow 返回 `behavior: 'allow'`, 没命中规则时默认 ask。[E: tools/WebFetchTool/WebFetchTool.ts:126][E: tools/WebFetchTool/WebFetchTool.ts:133][E: tools/WebFetchTool/WebFetchTool.ts:142][E: tools/WebFetchTool/WebFetchTool.ts:149][E: tools/WebFetchTool/WebFetchTool.ts:159][E: tools/WebFetchTool/WebFetchTool.ts:166][E: tools/WebFetchTool/WebFetchTool.ts:175]

`preapproved.ts` 把 code-related host 拆成 hostname-only set 和 path-prefix map; `github.com/anthropics` 这类 path-scoped entry 只有 exact path 或 path segment boundary 下的子路径会命中。[E: tools/WebFetchTool/preapproved.ts:14][E: tools/WebFetchTool/preapproved.ts:139][E: tools/WebFetchTool/preapproved.ts:154][E: tools/WebFetchTool/preapproved.ts:155][E: tools/WebFetchTool/preapproved.ts:162]

## 7 call() 走读

`call()` 记录 start time, 调用 `getURLMarkdownContent(url, abortController)`。[E: tools/WebFetchTool/WebFetchTool.ts:212][E: tools/WebFetchTool/WebFetchTool.ts:214] `getURLMarkdownContent()` 首先用 `validateURL()` 拒绝过长 URL、无法 parse 的 URL、带 username/password 的 URL 和 hostname 少于两个 segment 的 URL。[E: tools/WebFetchTool/utils.ts:139][E: tools/WebFetchTool/utils.ts:140][E: tools/WebFetchTool/utils.ts:146][E: tools/WebFetchTool/utils.ts:156][E: tools/WebFetchTool/utils.ts:164]

`getURLMarkdownContent()` 命中 URL cache 时直接返回 cached entry; 未命中时会把 `http:` URL 升级为 `https:`。[E: tools/WebFetchTool/utils.ts:356][E: tools/WebFetchTool/utils.ts:358][E: tools/WebFetchTool/utils.ts:376][E: tools/WebFetchTool/utils.ts:378] 如果 settings 没有 `skipWebFetchPreflight`, 它调用 `checkDomainBlocklist(hostname)`, `blocked` 抛 `DomainBlockedError`, `check_failed` 抛 `DomainCheckFailedError`。[E: tools/WebFetchTool/utils.ts:386][E: tools/WebFetchTool/utils.ts:388][E: tools/WebFetchTool/utils.ts:393][E: tools/WebFetchTool/utils.ts:395]

HTTP fetch 使用 `getWithPermittedRedirects(...)`; 允许 redirect checker 通过的 redirect 递归 follow, 不允许的 redirect 返回 `{ type: 'redirect', originalUrl, redirectUrl, statusCode }` 给 `WebFetchTool.call()`。[E: tools/WebFetchTool/utils.ts:262][E: tools/WebFetchTool/utils.ts:297][E: tools/WebFetchTool/utils.ts:299][E: tools/WebFetchTool/utils.ts:307] `WebFetchTool.call()` 收到跨 host redirect 时返回说明文本, 要求模型用 redirected URL 再调用一次 `WebFetch`。[E: tools/WebFetchTool/WebFetchTool.ts:217][E: tools/WebFetchTool/WebFetchTool.ts:227][E: tools/WebFetchTool/WebFetchTool.ts:233]

正常响应会把 raw bytes 转成 buffer, binary content 先 `persistBinaryContent(...)` 保存 raw bytes 并记录 `persistedPath`, HTML content 用 Turndown 转 markdown, 非 HTML content 直接用 UTF-8 decoded string。[E: tools/WebFetchTool/utils.ts:428][E: tools/WebFetchTool/utils.ts:442][E: tools/WebFetchTool/utils.ts:444][E: tools/WebFetchTool/utils.ts:456][E: tools/WebFetchTool/utils.ts:457][E: tools/WebFetchTool/utils.ts:464] fetched entry 按原始 URL 写入 LRU cache, size 用 markdown byte length 或 raw bytes clamped 到至少 1。[E: tools/WebFetchTool/utils.ts:470][E: tools/WebFetchTool/utils.ts:480]

`WebFetchTool.call()` 对 preapproved markdown 且短于 `MAX_MARKDOWN_LENGTH` 的内容直接返回 markdown; 其它情况调用 `applyPromptToMarkdown(...)` 用 Haiku 生成结果。[E: tools/WebFetchTool/WebFetchTool.ts:261][E: tools/WebFetchTool/WebFetchTool.ts:265][E: tools/WebFetchTool/WebFetchTool.ts:269][E: tools/WebFetchTool/WebFetchTool.ts:271] 如果 binary content 被保存, `call()` 会把 file path 和 MIME/size 附加到 result 末尾。[E: tools/WebFetchTool/WebFetchTool.ts:283][E: tools/WebFetchTool/WebFetchTool.ts:284]

## 8 渲染

`renderToolUseMessage()` 在 verbose 模式显示 `url` 和 `prompt`, 非 verbose 仅显示 URL。[E: tools/WebFetchTool/UI.tsx:24][E: tools/WebFetchTool/UI.tsx:27] progress UI 固定显示 `Fetching…`。[E: tools/WebFetchTool/UI.tsx:29][E: tools/WebFetchTool/UI.tsx:31] result UI 会显示 received size、HTTP code 和 code text; verbose 模式再展开 `result` 文本。[E: tools/WebFetchTool/UI.tsx:44][E: tools/WebFetchTool/UI.tsx:49][E: tools/WebFetchTool/UI.tsx:53][E: tools/WebFetchTool/UI.tsx:57]

## 9 设计动机·edge·历史

- `prompt.ts` 明确建议有 MCP-provided web fetch tool 时优先用该 MCP tool, 因为可能限制更少; 这是用户可见 tool prompt, 不是 runtime enforcement。[E: tools/WebFetchTool/prompt.ts:12][I]
- `preapproved.ts` 的 allowlist 只用于 `WebFetch` GET 请求; sandbox network restrictions 没有继承该 allowlist。[I]
- `getURLMarkdownContent()` 把 cache key 保持为原始 URL, 即使请求时发生了 HTTPS upgrade 或 permitted redirect。[E: tools/WebFetchTool/utils.ts:470][I]

## Sources

- `tools/WebFetchTool/WebFetchTool.ts`
- `tools/WebFetchTool/prompt.ts`
- `tools/WebFetchTool/UI.tsx`
- `tools/WebFetchTool/utils.ts`
- `tools/WebFetchTool/preapproved.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `tool.web-search`
