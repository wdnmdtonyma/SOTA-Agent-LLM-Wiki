---
id: subsys.agent-core.transport-proxy
title: 传输抽象与代理流
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/proxy.ts
  - packages/agent/src/types.ts
symbols:
  - streamProxy
  - StreamFn
  - ProxyAssistantMessageEvent
related:
  - spine.provider-stream
  - subsys.agent-core.turn-control
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.agent-core.transport-proxy` 是 `pi-agent-core` 的 stream transport adapter: `StreamFn` 定义 agent loop 可消费的 assistant stream 边界, `streamProxy()` 把远端 proxy 的瘦事件流重建成同一类 assistant message events。

## 能回答的问题

- `StreamFn` 对 agent loop 的 provider stream 边界提出什么返回值和错误编码要求?
- `streamProxy()` 发送给 proxy server 的 request 包含哪些字段,哪些 options 被保留为可序列化子集?
- `ProxyAssistantMessageEvent` 为什么不携带 `partial`,客户端如何重建 `AssistantMessageEvent`?
- abort signal、HTTP error、JSON/event processing error 如何变成 terminal error event?
- text、thinking、toolcall、done、error 事件各自怎样更新 partial assistant message?
- 本节点与 `spine.provider-stream` 的职责边界是什么?

## 职责边界

`StreamFn` 是 agent 层注入 provider stream 的结构化函数类型: 入参是 `Model<Api>`、`Context` 和可选 `SimpleStreamOptions`, 返回 `AssistantMessageEventStream` 或其 Promise [E: packages/agent/src/types.ts:27] [E: packages/agent/src/types.ts:28] [E: packages/agent/src/types.ts:29] [E: packages/agent/src/types.ts:30] [E: packages/agent/src/types.ts:31]。

`StreamFn` 的类型签名要求调用方最终拿到 `AssistantMessageEventStream`;在本节点可核的 `streamProxy()` 实现中,fetch、HTTP、parse 或 event processing failure 会通过已返回的 stream push `error` event,并在 final assistant message 上写入 `"error"` 或 `"aborted"` stop reason 与 `errorMessage` [E: packages/agent/src/types.ts:27] [E: packages/agent/src/types.ts:31] [E: packages/agent/src/proxy.ts:116] [E: packages/agent/src/proxy.ts:117] [E: packages/agent/src/proxy.ts:214] [E: packages/agent/src/proxy.ts:216] [E: packages/agent/src/proxy.ts:217] [E: packages/agent/src/proxy.ts:218] [E: packages/agent/src/proxy.ts:219] [E: packages/agent/src/proxy.ts:220] [E: packages/agent/src/proxy.ts:232]。

`streamProxy()` 是一个 concrete proxy adapter,它接收 `Model<any>`、`Context` 和 `ProxyStreamOptions`,同步返回 `ProxyMessageEventStream`;调用方要把它接到只提供 `SimpleStreamOptions` 的 `StreamFn` boundary 时,需要在调用点补齐 `authToken` 与 `proxyUrl` [E: packages/agent/src/types.ts:30] [E: packages/agent/src/proxy.ts:73] [E: packages/agent/src/proxy.ts:77] [E: packages/agent/src/proxy.ts:79] [E: packages/agent/src/proxy.ts:116] [E: packages/agent/src/proxy.ts:232]。

本节点只覆盖 agent package 内的 transport proxy 和 `StreamFn` boundary。`pi-ai` 如何从 `Models.stream` / `streamSimple` 进入 provider registry、API lazy module、wire request 与 normalized `AssistantMessageEventStream`,由 [spine.provider-stream](../../spine/provider-stream.md) 说明;本节点只说明 `streamProxy()` 如何在这个 normalized assistant event protocol 之外增加一跳 proxy server transport [E: packages/agent/src/proxy.ts:7] [E: packages/agent/src/proxy.ts:11] [E: packages/agent/src/proxy.ts:13] [E: packages/agent/src/proxy.ts:14] [E: packages/agent/src/proxy.ts:17] [E: packages/agent/src/types.ts:27] [E: packages/agent/src/types.ts:31]。

## 关键文件

- `packages/agent/src/types.ts`: `StreamFn`、`AgentLoopConfig`、`AgentEvent` 等 agent runtime 类型;本节点只权威覆盖 `StreamFn` [E: packages/agent/src/types.ts:27]。
- `packages/agent/src/proxy.ts`: `ProxyMessageEventStream`、`ProxyAssistantMessageEvent`、`ProxyStreamOptions`、`streamProxy()`、`buildProxyRequestOptions()` 和 `processProxyEvent()` 的实现 [E: packages/agent/src/proxy.ts:20] [E: packages/agent/src/proxy.ts:36] [E: packages/agent/src/proxy.ts:73] [E: packages/agent/src/proxy.ts:101] [E: packages/agent/src/proxy.ts:116] [E: packages/agent/src/proxy.ts:238]。

## 数据模型

`ProxyMessageEventStream` 直接继承 `EventStream<AssistantMessageEvent, AssistantMessage>`;它把 `done` 或 `error` 视为 complete event,并把 `done.message` 或 `error.error` 提取成 final result [E: packages/agent/src/proxy.ts:20] [E: packages/agent/src/proxy.ts:23] [E: packages/agent/src/proxy.ts:25] [E: packages/agent/src/proxy.ts:26]。

`ProxyAssistantMessageEvent` 是 proxy server 发回客户端的瘦事件 union:它包含 `start`、text start/delta/end、thinking start/delta/end、toolcall start/delta/end、`done` 和 `error`,但这些事件没有 `partial` 字段 [E: packages/agent/src/proxy.ts:36] [E: packages/agent/src/proxy.ts:37] [E: packages/agent/src/proxy.ts:38] [E: packages/agent/src/proxy.ts:39] [E: packages/agent/src/proxy.ts:40] [E: packages/agent/src/proxy.ts:41] [E: packages/agent/src/proxy.ts:42] [E: packages/agent/src/proxy.ts:43] [E: packages/agent/src/proxy.ts:44] [E: packages/agent/src/proxy.ts:45] [E: packages/agent/src/proxy.ts:46] [E: packages/agent/src/proxy.ts:47] [E: packages/agent/src/proxy.ts:52]。

`ProxyAssistantMessageEvent.done` 只允许 successful stop reason `"stop"`、`"length"`、`"toolUse"` 并携带 usage;`ProxyAssistantMessageEvent.error` 只允许 failure stop reason `"aborted"` 或 `"error"`,可携带 `errorMessage` 和 usage [E: packages/agent/src/proxy.ts:48] [E: packages/agent/src/proxy.ts:49] [E: packages/agent/src/proxy.ts:50] [E: packages/agent/src/proxy.ts:53] [E: packages/agent/src/proxy.ts:54] [E: packages/agent/src/proxy.ts:55] [E: packages/agent/src/proxy.ts:56]。

`ProxyStreamOptions` 扩展 proxy-safe serialized options,并额外要求本地 abort `signal`、proxy auth `authToken` 和 proxy endpoint `proxyUrl`;`signal` 是可选字段,`authToken` 与 `proxyUrl` 是必填字段 [E: packages/agent/src/proxy.ts:73] [E: packages/agent/src/proxy.ts:75] [E: packages/agent/src/proxy.ts:77] [E: packages/agent/src/proxy.ts:79]。

`buildProxyRequestOptions()` 只把 `temperature`、`maxTokens`、`reasoning`、`cacheRetention`、`sessionId`、`headers`、`metadata`、`transport`、`thinkingBudgets`、`maxRetryDelayMs` 放进 request body 的 `options`,不把 `signal`、`authToken`、`proxyUrl` 放进 serialized options [E: packages/agent/src/proxy.ts:59] [E: packages/agent/src/proxy.ts:61] [E: packages/agent/src/proxy.ts:62] [E: packages/agent/src/proxy.ts:63] [E: packages/agent/src/proxy.ts:64] [E: packages/agent/src/proxy.ts:65] [E: packages/agent/src/proxy.ts:66] [E: packages/agent/src/proxy.ts:67] [E: packages/agent/src/proxy.ts:68] [E: packages/agent/src/proxy.ts:69] [E: packages/agent/src/proxy.ts:70] [E: packages/agent/src/proxy.ts:101] [E: packages/agent/src/proxy.ts:102] [E: packages/agent/src/proxy.ts:103] [E: packages/agent/src/proxy.ts:112]。

## 控制流

1. `streamProxy@packages/agent/src/proxy.ts:116` 创建 `ProxyMessageEventStream`,启动一个 async IIFE,初始化本地 `partial: AssistantMessage`,并把 `api`、`provider`、`model` 从传入 model 复制到 partial 上 [E: packages/agent/src/proxy.ts:116] [E: packages/agent/src/proxy.ts:117] [E: packages/agent/src/proxy.ts:119] [E: packages/agent/src/proxy.ts:121] [E: packages/agent/src/proxy.ts:125] [E: packages/agent/src/proxy.ts:126] [E: packages/agent/src/proxy.ts:127]。
2. `streamProxy@packages/agent/src/proxy.ts:116` 将 abort handler 绑定到 `options.signal`;如果 reader 已建立,abort handler 会 cancel reader,同时 fetch 自身也接收同一个 `signal` [E: packages/agent/src/proxy.ts:139] [E: packages/agent/src/proxy.ts:141] [E: packages/agent/src/proxy.ts:142] [E: packages/agent/src/proxy.ts:143] [E: packages/agent/src/proxy.ts:147] [E: packages/agent/src/proxy.ts:148] [E: packages/agent/src/proxy.ts:152] [E: packages/agent/src/proxy.ts:163]。
3. `streamProxy@packages/agent/src/proxy.ts:116` POST 到 `${proxyUrl}/api/stream`,用 `Authorization: Bearer ${authToken}` 传 proxy auth,body 中发送 `model`、`context` 和 `buildProxyRequestOptions(options)` [E: packages/agent/src/proxy.ts:152] [E: packages/agent/src/proxy.ts:153] [E: packages/agent/src/proxy.ts:154] [E: packages/agent/src/proxy.ts:155] [E: packages/agent/src/proxy.ts:156] [E: packages/agent/src/proxy.ts:158] [E: packages/agent/src/proxy.ts:159] [E: packages/agent/src/proxy.ts:160] [E: packages/agent/src/proxy.ts:161]。
4. `streamProxy@packages/agent/src/proxy.ts:116` 对非 2xx response 先构造 `Proxy error: <status> <statusText>`,再尝试读取 JSON body 的 `error` 字段覆盖 message,最后 throw 进入统一 catch path [E: packages/agent/src/proxy.ts:166] [E: packages/agent/src/proxy.ts:167] [E: packages/agent/src/proxy.ts:169] [E: packages/agent/src/proxy.ts:170] [E: packages/agent/src/proxy.ts:171] [E: packages/agent/src/proxy.ts:176]。
5. `streamProxy@packages/agent/src/proxy.ts:116` 从 `response.body!.getReader()` 读取 bytes,用 `TextDecoder` 累积 buffer,按 newline 切行,只处理以 `data: ` 开头且 trim 后非空的行 [E: packages/agent/src/proxy.ts:179] [E: packages/agent/src/proxy.ts:180] [E: packages/agent/src/proxy.ts:181] [E: packages/agent/src/proxy.ts:183] [E: packages/agent/src/proxy.ts:184] [E: packages/agent/src/proxy.ts:191] [E: packages/agent/src/proxy.ts:192] [E: packages/agent/src/proxy.ts:193] [E: packages/agent/src/proxy.ts:195] [E: packages/agent/src/proxy.ts:196] [E: packages/agent/src/proxy.ts:197] [E: packages/agent/src/proxy.ts:198]。
6. 每条 `data:` line 被 `JSON.parse` 为 `ProxyAssistantMessageEvent`,再交给 `processProxyEvent(proxyEvent, partial)` 更新 partial 并生成 normalized `AssistantMessageEvent`;生成的 event 被 `stream.push(event)` 发给 consumer [E: packages/agent/src/proxy.ts:199] [E: packages/agent/src/proxy.ts:200] [E: packages/agent/src/proxy.ts:201] [E: packages/agent/src/proxy.ts:202]。
7. read loop 中和 read loop 结束后都会检查 `options.signal?.aborted`;已 abort 时 throw `"Request aborted by user"`,进入 catch 后 reason 变为 `"aborted"` [E: packages/agent/src/proxy.ts:187] [E: packages/agent/src/proxy.ts:188] [E: packages/agent/src/proxy.ts:209] [E: packages/agent/src/proxy.ts:210] [E: packages/agent/src/proxy.ts:216]。
8. 正常读完 proxy response 时调用 `stream.end()`;任何 fetch、HTTP、parse 或 event processing error 都进入 catch,写入 `partial.stopReason`、`partial.errorMessage`,push `type: "error"` event 后再 `stream.end()` [E: packages/agent/src/proxy.ts:213] [E: packages/agent/src/proxy.ts:214] [E: packages/agent/src/proxy.ts:215] [E: packages/agent/src/proxy.ts:216] [E: packages/agent/src/proxy.ts:217] [E: packages/agent/src/proxy.ts:218] [E: packages/agent/src/proxy.ts:219] [E: packages/agent/src/proxy.ts:220] [E: packages/agent/src/proxy.ts:221] [E: packages/agent/src/proxy.ts:222] [E: packages/agent/src/proxy.ts:224]。
9. `finally` 会在 `options.signal` 存在时移除 abort listener,避免已完成 stream 继续响应后续 abort [E: packages/agent/src/proxy.ts:225] [E: packages/agent/src/proxy.ts:226] [E: packages/agent/src/proxy.ts:227]。

## 事件重建与 typing

`processProxyEvent()` 的 `start` 分支不修改 content,直接返回带当前 `partial` 的 normalized `start` event [E: packages/agent/src/proxy.ts:238] [E: packages/agent/src/proxy.ts:239] [E: packages/agent/src/proxy.ts:240] [E: packages/agent/src/proxy.ts:243] [E: packages/agent/src/proxy.ts:244]。

text 事件在 `text_start` 时把目标 `contentIndex` 初始化为 `{ type: "text", text: "" }`;`text_delta` 只接受当前 block 为 text 的位置,追加 delta 并返回 `text_delta`;`text_end` 写入 `textSignature` 并返回完整 content 字符串 [E: packages/agent/src/proxy.ts:246] [E: packages/agent/src/proxy.ts:247] [E: packages/agent/src/proxy.ts:248] [E: packages/agent/src/proxy.ts:250] [E: packages/agent/src/proxy.ts:251] [E: packages/agent/src/proxy.ts:252] [E: packages/agent/src/proxy.ts:253] [E: packages/agent/src/proxy.ts:255] [E: packages/agent/src/proxy.ts:257] [E: packages/agent/src/proxy.ts:258] [E: packages/agent/src/proxy.ts:264] [E: packages/agent/src/proxy.ts:265] [E: packages/agent/src/proxy.ts:266] [E: packages/agent/src/proxy.ts:267] [E: packages/agent/src/proxy.ts:269] [E: packages/agent/src/proxy.ts:271] [E: packages/agent/src/proxy.ts:272]。

thinking 事件与 text 事件同构: `thinking_start` 初始化 thinking block,`thinking_delta` 追加 delta,`thinking_end` 写入 `thinkingSignature` 并返回完整 thinking content [E: packages/agent/src/proxy.ts:278] [E: packages/agent/src/proxy.ts:279] [E: packages/agent/src/proxy.ts:280] [E: packages/agent/src/proxy.ts:282] [E: packages/agent/src/proxy.ts:283] [E: packages/agent/src/proxy.ts:284] [E: packages/agent/src/proxy.ts:285] [E: packages/agent/src/proxy.ts:287] [E: packages/agent/src/proxy.ts:289] [E: packages/agent/src/proxy.ts:290] [E: packages/agent/src/proxy.ts:296] [E: packages/agent/src/proxy.ts:297] [E: packages/agent/src/proxy.ts:298] [E: packages/agent/src/proxy.ts:299] [E: packages/agent/src/proxy.ts:301] [E: packages/agent/src/proxy.ts:303] [E: packages/agent/src/proxy.ts:304]。

toolcall 事件在 `toolcall_start` 时创建 `ToolCall` block,并临时附加 `partialJson`;`toolcall_delta` 追加 JSON fragment,用 `parseStreamingJson` 尝试更新 `content.arguments`,再替换数组中的 content object 以触发 reactivity;`toolcall_end` 删除临时 `partialJson` 并返回完整 `toolCall` [E: packages/agent/src/proxy.ts:310] [E: packages/agent/src/proxy.ts:311] [E: packages/agent/src/proxy.ts:312] [E: packages/agent/src/proxy.ts:313] [E: packages/agent/src/proxy.ts:314] [E: packages/agent/src/proxy.ts:315] [E: packages/agent/src/proxy.ts:316] [E: packages/agent/src/proxy.ts:318] [E: packages/agent/src/proxy.ts:320] [E: packages/agent/src/proxy.ts:321] [E: packages/agent/src/proxy.ts:322] [E: packages/agent/src/proxy.ts:323] [E: packages/agent/src/proxy.ts:324] [E: packages/agent/src/proxy.ts:325] [E: packages/agent/src/proxy.ts:327] [E: packages/agent/src/proxy.ts:329] [E: packages/agent/src/proxy.ts:330] [E: packages/agent/src/proxy.ts:336] [E: packages/agent/src/proxy.ts:337] [E: packages/agent/src/proxy.ts:338] [E: packages/agent/src/proxy.ts:339] [E: packages/agent/src/proxy.ts:341] [E: packages/agent/src/proxy.ts:343] [E: packages/agent/src/proxy.ts:344]。

如果 text/thinking 的 delta/end 或 toolcall_delta 落在错误的 content block 类型上,`processProxyEvent()` 会 throw;该 throw 会被 `streamProxy()` 外层 catch 捕获并转成 proxy stream 的 `error` event [E: packages/agent/src/proxy.ts:261] [E: packages/agent/src/proxy.ts:275] [E: packages/agent/src/proxy.ts:293] [E: packages/agent/src/proxy.ts:307] [E: packages/agent/src/proxy.ts:333] [E: packages/agent/src/proxy.ts:214] [E: packages/agent/src/proxy.ts:219] [E: packages/agent/src/proxy.ts:220]。

`done` proxy event 把 `partial.stopReason` 与 `partial.usage` 更新成 server 给出的 final values,再返回 normalized `done` event;`error` proxy event 把 `partial.stopReason`、`partial.errorMessage`、`partial.usage` 更新成 server 给出的 final values,再返回 normalized `error` event [E: packages/agent/src/proxy.ts:350] [E: packages/agent/src/proxy.ts:351] [E: packages/agent/src/proxy.ts:352] [E: packages/agent/src/proxy.ts:353] [E: packages/agent/src/proxy.ts:355] [E: packages/agent/src/proxy.ts:356] [E: packages/agent/src/proxy.ts:357] [E: packages/agent/src/proxy.ts:358] [E: packages/agent/src/proxy.ts:359]。

## 设计动机与权衡

`ProxyAssistantMessageEvent` 让 proxy server 不必在每个 delta event 上传完整 `partial`;客户端保持一个本地 `partial` 并在 `processProxyEvent()` 中补回 normalized event 的 `partial` 字段 [E: packages/agent/src/proxy.ts:36] [E: packages/agent/src/proxy.ts:39] [E: packages/agent/src/proxy.ts:42] [E: packages/agent/src/proxy.ts:45] [E: packages/agent/src/proxy.ts:121] [E: packages/agent/src/proxy.ts:199] [E: packages/agent/src/proxy.ts:200] [E: packages/agent/src/proxy.ts:244] [E: packages/agent/src/proxy.ts:248] [E: packages/agent/src/proxy.ts:258]。

`streamProxy()` 在调用时立即返回 stream,实际 network work 在 async IIFE 中进行;这使 fetch/setup failure 也能被编码进已经返回的 stream,而不是让 caller 在创建 stream 时拿不到 `EventStream` object [E: packages/agent/src/proxy.ts:117] [E: packages/agent/src/proxy.ts:119] [E: packages/agent/src/proxy.ts:214] [E: packages/agent/src/proxy.ts:219] [E: packages/agent/src/proxy.ts:224] [E: packages/agent/src/proxy.ts:232]。

proxy request 的 body 只携带可序列化 stream options;本地-only control (`signal`) 与 proxy transport credentials (`authToken`, `proxyUrl`) 留在 client fetch 层,其中 `authToken` 进入 HTTP Authorization header,`proxyUrl` 只用于 URL 拼接 [E: packages/agent/src/proxy.ts:101] [E: packages/agent/src/proxy.ts:102] [E: packages/agent/src/proxy.ts:112] [E: packages/agent/src/proxy.ts:152] [E: packages/agent/src/proxy.ts:155] [E: packages/agent/src/proxy.ts:158] [E: packages/agent/src/proxy.ts:161]。

## Gotcha

- `streamProxy()` 的 public options 比 `StreamFn` 的 third parameter 更窄且更具体: `StreamFn` 接收可选 `SimpleStreamOptions`,而 `streamProxy()` 要求 `ProxyStreamOptions` 中的 `authToken` 和 `proxyUrl`;接入 `StreamFn` boundary 时,调用方必须确保这些字段被补上 [E: packages/agent/src/types.ts:30] [E: packages/agent/src/proxy.ts:73] [E: packages/agent/src/proxy.ts:77] [E: packages/agent/src/proxy.ts:79] [E: packages/agent/src/proxy.ts:116]。
- abort 不是单一路径: abort signal 会传给 fetch,reader 存在时会被 cancel,read loop 内外也都会检查 `signal.aborted`;最终 catch 用当前 `signal.aborted` 决定 terminal reason 是 `"aborted"` 还是 `"error"` [E: packages/agent/src/proxy.ts:141] [E: packages/agent/src/proxy.ts:143] [E: packages/agent/src/proxy.ts:163] [E: packages/agent/src/proxy.ts:187] [E: packages/agent/src/proxy.ts:209] [E: packages/agent/src/proxy.ts:216]。
- `processProxyEvent()` 对未知事件类型只走 exhaustiveness default 并返回 `undefined`;但对类型正确、顺序错误的 text/thinking delta/end 或 toolcall_delta 会 throw,因此 consumer 看到的是 outer stream 的 `error` event,不是一个单独的 unknown-event event [E: packages/agent/src/proxy.ts:261] [E: packages/agent/src/proxy.ts:275] [E: packages/agent/src/proxy.ts:293] [E: packages/agent/src/proxy.ts:307] [E: packages/agent/src/proxy.ts:333] [E: packages/agent/src/proxy.ts:361] [E: packages/agent/src/proxy.ts:362] [E: packages/agent/src/proxy.ts:363] [E: packages/agent/src/proxy.ts:364] [E: packages/agent/src/proxy.ts:214] [E: packages/agent/src/proxy.ts:219]。
- `stream.end()` 本身不携带 final result;final result 来自已经 push 过的 `done` 或 `error` complete event。若 proxy response 正常结束但从未发送 terminal proxy event,`streamProxy()` 仍会调用 `stream.end()` [E: packages/agent/src/proxy.ts:20] [E: packages/agent/src/proxy.ts:23] [E: packages/agent/src/proxy.ts:25] [E: packages/agent/src/proxy.ts:26] [E: packages/agent/src/proxy.ts:213]。

## 跨包边界

[spine.provider-stream](../../spine/provider-stream.md) 是 `pi-ai` provider stream path 的权威节点:它覆盖 model/provider/API dispatch、provider wire request、wire event 到 normalized `AssistantMessageEventStream` 的归一化。本节点覆盖 `pi-agent-core` 的 optional proxy transport,即在 caller 与 provider stream 之间增加 HTTP `/api/stream` 一跳,再把 proxy server 的瘦事件恢复成同一 assistant event protocol [E: packages/agent/src/proxy.ts:152] [E: packages/agent/src/proxy.ts:158] [E: packages/agent/src/proxy.ts:159] [E: packages/agent/src/proxy.ts:160] [E: packages/agent/src/proxy.ts:161] [E: packages/agent/src/proxy.ts:199] [E: packages/agent/src/proxy.ts:200]。

[subsys.agent-core.turn-control](turn-control.md) 应说明 agent loop 在一轮 turn 内如何消费 `StreamFn` 返回的 events、何时转成 `message_update`/`message_end`/`turn_end`;本节点只说明 proxy stream 自身如何生产 `AssistantMessageEvent` [E: packages/agent/src/types.ts:27] [E: packages/agent/src/types.ts:31] [E: packages/agent/src/proxy.ts:200] [E: packages/agent/src/proxy.ts:202]。

## Sources

- packages/agent/src/proxy.ts
- packages/agent/src/types.ts

## 相关

- [spine.provider-stream](../../spine/provider-stream.md): `pi-ai` provider stream 的统一入口、wire dispatch 和 normalized event protocol。
- [subsys.agent-core.turn-control](turn-control.md): agent loop 如何消费 `StreamFn` event stream 并推进 turn lifecycle。
