---
id: tool.webfetch
title: WebFetch 工具
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/webfetch.ts, packages/opencode/src/tool/webfetch.txt, packages/opencode/src/tool/registry.ts, packages/opencode/src/session/tools.ts, packages/core/src/tool/webfetch.ts, packages/core/src/tool/builtins.ts, packages/core/src/tool/tool.ts, packages/core/src/tool/registry.ts]
symbols: [WebFetchTool]
related: [ref.tool-catalog]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> WebFetch 工具把 HTTP/HTTPS URL 取回为 `markdown`、`text` 或 `html`；V1 当前活跑路径允许图片以 attachment 返回，V2 core 工具只接受 textual content。

## 能回答的问题

- `webfetch` 的 URL、format、timeout 字段在 V1/V2 中有什么约束？
- V1 WebFetch 何时把 HTML 转成 Markdown 或纯文本？
- V2 WebFetch 为什么拒绝图片和非文本 MIME？
- WebFetch 的 5MB 响应限制在哪里实现？
- V1 prompt 中“HTTP 自动升级 HTTPS”的说法与源码是否一致？

## V1

### 1 Identity

V1 `WebFetchTool` 通过 `Tool.define("webfetch", ...)` 注册，`ToolRegistry` 初始化 `webfetch` 并把它作为 `tool.fetch` 加入 builtin 列表。[E: packages/opencode/src/tool/webfetch.ts:24][E: packages/opencode/src/tool/webfetch.ts:25][E: packages/opencode/src/tool/registry.ts:99][E: packages/opencode/src/tool/registry.ts:207][E: packages/opencode/src/tool/registry.ts:229]

### 2 用途定位

V1 WebFetch 是 read-only URL fetcher，prompt 描述它会取 URL、按指定 format 转换，并提醒如果有更有针对性的 web fetching tool 应优先使用那个工具。[E: packages/opencode/src/tool/webfetch.txt:1][E: packages/opencode/src/tool/webfetch.txt:3][E: packages/opencode/src/tool/webfetch.txt:8][E: packages/opencode/src/tool/webfetch.txt:12]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `url` | `string` | 是 | 无 | execute 要求以 `http://` 或 `https://` 开头 | 需要 fetch 的 URL。[E: packages/opencode/src/tool/webfetch.ts:13][E: packages/opencode/src/tool/webfetch.ts:14][E: packages/opencode/src/tool/webfetch.ts:35][E: packages/opencode/src/tool/webfetch.ts:36] |
| `format` | `"text" | "markdown" | "html"` | 否 | `"markdown"` | Effect schema 用 decoding default 填入 markdown | 返回格式。[E: packages/opencode/src/tool/webfetch.ts:15][E: packages/opencode/src/tool/webfetch.ts:17][E: packages/opencode/src/tool/webfetch.ts:20] |
| `timeout` | optional `number` | 否 | `30` seconds | execute clamp 到 120 seconds | 请求 timeout 秒数。[E: packages/opencode/src/tool/webfetch.ts:10][E: packages/opencode/src/tool/webfetch.ts:11][E: packages/opencode/src/tool/webfetch.ts:21][E: packages/opencode/src/tool/webfetch.ts:50] |

### 4 输出 & 大小/截断限制

V1 先用 `content-length` 拒绝超过 5MB 的响应，再在读取 body 后用 `arrayBuffer.byteLength` 二次检查 5MB。[E: packages/opencode/src/tool/webfetch.ts:9][E: packages/opencode/src/tool/webfetch.ts:96][E: packages/opencode/src/tool/webfetch.ts:97][E: packages/opencode/src/tool/webfetch.ts:101][E: packages/opencode/src/tool/webfetch.ts:102] text/html 在 `format: "markdown"` 下用 Turndown 转 Markdown，在 `format: "text"` 下用 htmlparser2 抽文本，在 `format: "html"` 下直接返回原始 HTML。[E: packages/opencode/src/tool/webfetch.ts:129][E: packages/opencode/src/tool/webfetch.ts:132][E: packages/opencode/src/tool/webfetch.ts:141][E: packages/opencode/src/tool/webfetch.ts:143][E: packages/opencode/src/tool/webfetch.ts:147][E: packages/opencode/src/tool/webfetch.ts:148][E: packages/opencode/src/tool/webfetch.ts:162][E: packages/opencode/src/tool/webfetch.ts:183][E: packages/opencode/src/tool/webfetch.ts:191]

V1 对图片 MIME 走 attachment：输出固定为 `Image fetched successfully`，attachment URL 是 base64 data URL。[E: packages/opencode/src/tool/webfetch.ts:110][E: packages/opencode/src/tool/webfetch.ts:111][E: packages/opencode/src/tool/webfetch.ts:114][E: packages/opencode/src/tool/webfetch.ts:116][E: packages/opencode/src/tool/webfetch.ts:120]

### 5 权限

V1 WebFetch 通过 `ctx.ask` 请求 `permission: "webfetch"`，`patterns` 是 URL，`always` 是 `["*"]`，metadata 记录 url/format/timeout。[E: packages/opencode/src/tool/webfetch.ts:39][E: packages/opencode/src/tool/webfetch.ts:40][E: packages/opencode/src/tool/webfetch.ts:41][E: packages/opencode/src/tool/webfetch.ts:42][E: packages/opencode/src/tool/webfetch.ts:44][E: packages/opencode/src/tool/webfetch.ts:45][E: packages/opencode/src/tool/webfetch.ts:46]

### 6 execute() 走读

1. V1 WebFetch 校验 URL scheme，只接受 `http://` 和 `https://`。[E: packages/opencode/src/tool/webfetch.ts:35][E: packages/opencode/src/tool/webfetch.ts:36]
2. 根据 `format` 构造 Accept header，并带 browser-like User-Agent 与 `Accept-Language`。[E: packages/opencode/src/tool/webfetch.ts:54][E: packages/opencode/src/tool/webfetch.ts:56][E: packages/opencode/src/tool/webfetch.ts:69][E: packages/opencode/src/tool/webfetch.ts:70][E: packages/opencode/src/tool/webfetch.ts:73]
3. 如果 Cloudflare 403 challenge 命中，V1 会用 `User-Agent: opencode` 重试一次。[E: packages/opencode/src/tool/webfetch.ts:79][E: packages/opencode/src/tool/webfetch.ts:83][E: packages/opencode/src/tool/webfetch.ts:84][E: packages/opencode/src/tool/webfetch.ts:87][E: packages/opencode/src/tool/webfetch.ts:88]
4. timeout 通过 `Effect.timeoutOrElse` 把超时变成 defect error `Request timed out`。[E: packages/opencode/src/tool/webfetch.ts:92]
5. body decode 后按 format 和 content-type 选择 Markdown/text/html 输出路径。[E: packages/opencode/src/tool/webfetch.ts:126][E: packages/opencode/src/tool/webfetch.ts:129]

## V2

### 1 Identity

V2 `WebFetchTool` 的 name 常量是 `"webfetch"`，并以 `[name]: Tool.make(...)` 注册进 `Tools.Service`；`BuiltInTools.locationLayer` 把 `WebFetchTool.layer` 放进 V2 内建工具层。[E: packages/core/src/tool/webfetch.ts:12][E: packages/core/src/tool/webfetch.ts:134][E: packages/core/src/tool/webfetch.ts:135][E: packages/core/src/tool/builtins.ts:41]

### 2 用途定位

V2 description 写明 WebFetch fetch HTTP/HTTPS URL，默认 Markdown，read-only，并提示大型文本结果可能被 managed storage 保留完整输出、只把 preview 发给模型。[E: packages/core/src/tool/webfetch.ts:17][E: packages/core/src/tool/webfetch.ts:19] 这符合 V2 tools spec：tool 返回完整 validated domain output，registry 在 projection 后统一 bounding provider-facing content。[E: specs/v2/tools.md:155][E: specs/v2/tools.md:157]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `url` | `string` | 是 | 无 | `new URL()` 后 protocol 必须是 `http:` 或 `https:` | 需要 fetch 的 URL。[E: packages/core/src/tool/webfetch.ts:23][E: packages/core/src/tool/webfetch.ts:24][E: packages/core/src/tool/webfetch.ts:81][E: packages/core/src/tool/webfetch.ts:82][E: packages/core/src/tool/webfetch.ts:143] |
| `format` | `"text" | "markdown" | "html"` | 否 | `"markdown"` | decoding default 填入 markdown | 输出格式。[E: packages/core/src/tool/webfetch.ts:25][E: packages/core/src/tool/webfetch.ts:27] |
| `timeout` | optional `number` | 否 | `30` seconds | `> 0` 且 `<= 120` | 请求 timeout 秒数。[E: packages/core/src/tool/webfetch.ts:14][E: packages/core/src/tool/webfetch.ts:15][E: packages/core/src/tool/webfetch.ts:21][E: packages/core/src/tool/webfetch.ts:28][E: packages/core/src/tool/webfetch.ts:170] |

### 4 输出 & 大小/截断限制

V2 output schema 是 `{ url, contentType, format, output }`，`toModelOutput` 只把 `output.output` 作为 text content 返回模型。[E: packages/core/src/tool/webfetch.ts:33][E: packages/core/src/tool/webfetch.ts:34][E: packages/core/src/tool/webfetch.ts:35][E: packages/core/src/tool/webfetch.ts:36][E: packages/core/src/tool/webfetch.ts:37][E: packages/core/src/tool/webfetch.ts:139] V2 也有 5MB producer boundary：`content-length` 超限失败，stream collection 累计超过 `MAX_RESPONSE_BYTES` 也失败。[E: packages/core/src/tool/webfetch.ts:13][E: packages/core/src/tool/webfetch.ts:90][E: packages/core/src/tool/webfetch.ts:91][E: packages/core/src/tool/webfetch.ts:96][E: packages/core/src/tool/webfetch.ts:99]

V2 与 V1 的显著差异是 fetched image 被视为 unsupported：`isImageAttachment(mime)` 命中时返回 `Unsupported fetched image content type`，非 textual MIME 返回 `Unsupported fetched file content type`。[E: packages/core/src/tool/webfetch.ts:109][E: packages/core/src/tool/webfetch.ts:163][E: packages/core/src/tool/webfetch.ts:164][E: packages/core/src/tool/webfetch.ts:165][E: packages/core/src/tool/webfetch.ts:166]

### 5 权限

V2 WebFetch 使用 `PermissionV2.Service.assert`，`action` 是 `"webfetch"`，`resources` 是 URL，`save` 是 `["*"]`，`source` 携带 assistant message id 与 tool call id。[E: packages/core/src/tool/webfetch.ts:147][E: packages/core/src/tool/webfetch.ts:148][E: packages/core/src/tool/webfetch.ts:149][E: packages/core/src/tool/webfetch.ts:150][E: packages/core/src/tool/webfetch.ts:154]

### 6 execute() 走读

1. V2 先用 `new URL(input.url)` 与 `assertHttpUrl()` 做 URL 校验。[E: packages/core/src/tool/webfetch.ts:142][E: packages/core/src/tool/webfetch.ts:143]
2. V2 permission assert 通过后执行 HTTP request；Cloudflare challenge 仍会用 `User-Agent: opencode` 重试。[E: packages/core/src/tool/webfetch.ts:147][E: packages/core/src/tool/webfetch.ts:158][E: packages/core/src/tool/webfetch.ts:159]
3. V2 在 timeout scope 内读取 body、检查 MIME、拒绝 image/非 textual，然后返回 buffer 和 contentType。[E: packages/core/src/tool/webfetch.ts:157][E: packages/core/src/tool/webfetch.ts:161][E: packages/core/src/tool/webfetch.ts:163][E: packages/core/src/tool/webfetch.ts:165][E: packages/core/src/tool/webfetch.ts:166][E: packages/core/src/tool/webfetch.ts:167][E: packages/core/src/tool/webfetch.ts:169]
4. HTML 转换规则与 V1 同形：Markdown 用 Turndown，text 用 htmlparser2 抽取，html 原样返回。[E: packages/core/src/tool/webfetch.ts:120][E: packages/core/src/tool/webfetch.ts:122][E: packages/core/src/tool/webfetch.ts:123][E: packages/core/src/tool/webfetch.ts:124][E: packages/core/src/tool/webfetch.ts:191][E: packages/core/src/tool/webfetch.ts:207][E: packages/core/src/tool/webfetch.ts:216]
5. V2 当前把任何 execute error 映射成 model-visible `ToolFailure({ message: "Unable to fetch <url>" })`。[E: packages/core/src/tool/webfetch.ts:181]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 活跑状态 | V1 registry tools 在 `SessionTools.resolve` 中被桥接为 AI SDK `tool(...)`。[E: packages/opencode/src/session/tools.ts:74][E: packages/opencode/src/session/tools.ts:80] | V2 core built-in，经 `Tools.Service.register` 注册。[E: packages/core/src/tool/webfetch.ts:134][E: packages/core/src/tool/webfetch.ts:135] |
| 图片 | 支持 image attachment。[E: packages/opencode/src/tool/webfetch.ts:110][E: packages/opencode/src/tool/webfetch.ts:116] | 拒绝 fetched image MIME。[E: packages/core/src/tool/webfetch.ts:163][E: packages/core/src/tool/webfetch.ts:164] |
| 错误呈现 | execute pipe `Effect.orDie`，很多错误成为 defect。[E: packages/opencode/src/tool/webfetch.ts:153] | 映射为 `ToolFailure`，registry 会把 `ToolFailure` 转成 error result，消息统一为 `Unable to fetch <url>`。[E: packages/core/src/tool/webfetch.ts:181][E: packages/core/src/tool/registry.ts:68][E: packages/core/src/tool/registry.ts:69] |
| 输出 bounding | V1 通用 `Tool.define` wrapper 处理文本截断。[E: packages/opencode/src/tool/tool.ts:135][E: packages/opencode/src/tool/tool.ts:141] | V2 `ToolRegistry.settle` 调 `ToolOutputStore.bound()` 做 generic model-output bounding。[E: packages/core/src/tool/registry.ts:73][E: packages/core/src/tool/registry.ts:74] |

## 设计动机·edge·历史

V1 prompt 写着 “HTTP URLs will be automatically upgraded to HTTPS”，但 V1 execute 只检查 URL 以 `http://` 或 `https://` 开头，然后直接 `HttpClientRequest.get(params.url)`；源码没有执行 upgrade。[E: packages/opencode/src/tool/webfetch.txt:10][E: packages/opencode/src/tool/webfetch.ts:35][E: packages/opencode/src/tool/webfetch.ts:76][I] V2 也没有 upgrade：它只检查 protocol 是否是 `http:` 或 `https:`。[E: packages/core/src/tool/webfetch.ts:81][E: packages/core/src/tool/webfetch.ts:82][I]

## Sources

- packages/opencode/src/tool/webfetch.ts
- packages/opencode/src/tool/webfetch.txt
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/session/tools.ts
- packages/core/src/tool/webfetch.ts
- packages/core/src/tool/builtins.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/registry.ts
- specs/v2/tools.md

## 相关

- [全工具字段 catalog](../../reference/tool-catalog.md)
