---
id: peripheral.http-recorder
title: http-recorder(Effect HTTP 录放)
kind: subsystem
tier: T2
v: na
source:
  - packages/http-recorder/
  - packages/core/test/session-runner-recorded.test.ts
  - packages/llm/test/recorded-test.ts
  - packages/opencode/test/session/llm-native-recorded.test.ts
symbols: [HttpRecorder, http, socket, recordingLayer, Service]
related: [model-layer.llm-protocol-engine]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `@opencode-ai/http-recorder` 是给 Effect HTTP/WebSocket client 测试用的 cassette recorder：本地缺 cassette 时录制，已有 cassette 或 CI 中 replay，以确定性 JSON fixtures 测 provider 协议。

## 能回答的问题

- `HttpRecorder.http(name, options?)` 和 `HttpRecorder.socket(name, options?)` 实际提供什么 Layer？
- cassette JSON schema 长什么样？
- auto/record/replay/passthrough mode 如何决定？
- strict sequential matching 如何处理重试、polling 和并发？
- redaction 如何防止 credential 泄漏？
- opencode 哪些测试使用它？

## 职责边界

Public API 只有 `HttpRecorder.http` 和 `HttpRecorder.socket`：root `src/index.ts` 从 `effect.ts` 和 `socket.ts` 导入两个函数，并导出 `HttpRecorder = { http, socket }` [E: packages/http-recorder/src/index.ts:1] [E: packages/http-recorder/src/index.ts:2] [E: packages/http-recorder/src/index.ts:5]。README 也把这两个函数列为 complete public API，并说明 `http` 提供 fetch-backed recorded `HttpClient`，`socket` 装饰下层标准 Effect `Socket.Socket` [E: packages/http-recorder/README.md:84] [E: packages/http-recorder/README.md:85] [E: packages/http-recorder/README.md:88]。

该包是 Node.js/Bun 测试工具，不面向 browser、workers、Deno；README 明确写 Node.js 22+ and Bun，并说不 intended for browsers/workers/Deno [E: packages/http-recorder/README.md:16]。`package.json` 的 peer dependency 固定 `effect: 4.0.0-beta.83`，dependency 包含 `@effect/platform-node` 和 `@effect/platform-node-shared` [E: packages/http-recorder/package.json:54] [E: packages/http-recorder/package.json:55] [E: packages/http-recorder/package.json:58]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/http-recorder/src/index.ts` | Public namespace 与 exported types。 |
| `packages/http-recorder/src/effect.ts` | Public `http()` Layer，组合 cassette filesystem、FetchHttpClient、NodeFileSystem。 |
| `packages/http-recorder/src/internal-effect.ts` | HTTP record/replay implementation。 |
| `packages/http-recorder/src/socket.ts` | WebSocket record/replay implementation。 |
| `packages/http-recorder/src/cassette.ts` | Cassette service、filesystem/memory backends、path guard、unsafe secret scan。 |
| `packages/http-recorder/src/schema.ts` | Cassette JSON schema。 |
| `packages/http-recorder/src/matching.ts` | Canonical request matching 与 diff。 |
| `packages/http-recorder/src/redactor.ts` | Header/query/body redaction policy。 |
| `packages/http-recorder/test/record-replay.test.ts` | 行为测试，覆盖 redaction、WebSocket order、missing cassette、binary/no-content 等。 |

## Cassette schema

HTTP request snapshot 是 `{ method, url, headers, body }`，response snapshot 是 `{ status, headers, body, bodyEncoding? }`，`bodyEncoding` 可选 `text` 或 `base64` [E: packages/http-recorder/src/schema.ts:21] [E: packages/http-recorder/src/schema.ts:22] [E: packages/http-recorder/src/schema.ts:23] [E: packages/http-recorder/src/schema.ts:24] [E: packages/http-recorder/src/schema.ts:28] [E: packages/http-recorder/src/schema.ts:29] [E: packages/http-recorder/src/schema.ts:30] [E: packages/http-recorder/src/schema.ts:31]。HTTP interaction 带 `transport: "http"`、`request`、`response` [E: packages/http-recorder/src/schema.ts:36] [E: packages/http-recorder/src/schema.ts:37]。

WebSocket event 是 direction `client|server` 加 text/binary body；binary body 用 base64 标记 [E: packages/http-recorder/src/schema.ts:44] [E: packages/http-recorder/src/schema.ts:45] [E: packages/http-recorder/src/schema.ts:46] [E: packages/http-recorder/src/schema.ts:48] [E: packages/http-recorder/src/schema.ts:49] [E: packages/http-recorder/src/schema.ts:52]。WebSocket interaction 带 `transport: "websocket"`、`open: { url, headers }` 和 ordered `events` [E: packages/http-recorder/src/schema.ts:57] [E: packages/http-recorder/src/schema.ts:59] [E: packages/http-recorder/src/schema.ts:60] [E: packages/http-recorder/src/schema.ts:62]。

Cassette 顶层 schema 固定 `version: 1`，可选 `metadata`，以及 `interactions` array [E: packages/http-recorder/src/schema.ts:80] [E: packages/http-recorder/src/schema.ts:81] [E: packages/http-recorder/src/schema.ts:82]。`buildCassette` 写入同样的 version 1，并把 `recordedAt` 和用户 metadata 合并进 metadata [E: packages/http-recorder/src/cassette.ts:55] [E: packages/http-recorder/src/cassette.ts:60] [E: packages/http-recorder/src/cassette.ts:61]。

## Mode 与 cassette storage

`resolveAutoMode` 在 `CI` truthy 时强制 replay；非 CI 时，存在 cassette 就 replay，不存在就 record [E: packages/http-recorder/src/recorder.ts:6] [E: packages/http-recorder/src/recorder.ts:8] [E: packages/http-recorder/src/recorder.ts:16] [E: packages/http-recorder/src/recorder.ts:17]。README 用同样语义解释：第一次本地运行调用真实 API 并记录，后续 replay；`CI=true` 时缺 cassette 会 fail 而不是 record [E: packages/http-recorder/README.md:59] [E: packages/http-recorder/README.md:69]。

filesystem cassette 默认目录是 `<cwd>/test/fixtures/recordings` [E: packages/http-recorder/src/cassette.ts:7]。`cassettePath` 拒绝空名、absolute path、包含 `..` 的 path，并验证 resolved target 仍在 root 内 [E: packages/http-recorder/src/cassette.ts:41] [E: packages/http-recorder/src/cassette.ts:42] [E: packages/http-recorder/src/cassette.ts:47] [E: packages/http-recorder/src/cassette.ts:48]。测试覆盖 `../outside` 与 Windows absolute path 会 throw `Invalid cassette name` [E: packages/http-recorder/test/record-replay.test.ts:847] [E: packages/http-recorder/test/record-replay.test.ts:848]。

`fileSystem.append` 用 semaphore 串行追加，同步累积 interaction、扫描 secret findings、写临时文件再 rename 到 target，最后更新 in-memory recorded map [E: packages/http-recorder/src/cassette.ts:81] [E: packages/http-recorder/src/cassette.ts:105] [E: packages/http-recorder/src/cassette.ts:108] [E: packages/http-recorder/src/cassette.ts:109] [E: packages/http-recorder/src/cassette.ts:116] [E: packages/http-recorder/src/cassette.ts:117] [E: packages/http-recorder/src/cassette.ts:121]。

## HTTP 控制流

1. `HttpRecorder.http(name, options)` 调用 `recordingLayer`，提供 metadata、redactor 和 matcher，然后 provide cassette filesystem、FetchHttpClient、NodeFileSystem [E: packages/http-recorder/src/effect.ts:16] [E: packages/http-recorder/src/effect.ts:18] [E: packages/http-recorder/src/effect.ts:19] [E: packages/http-recorder/src/effect.ts:20] [E: packages/http-recorder/src/effect.ts:22] [E: packages/http-recorder/src/effect.ts:23] [E: packages/http-recorder/src/effect.ts:24]。
2. `recordingLayer` 读取 upstream `HttpClient` 和 cassette service，选择 redactor、match function、requested mode，并把 `auto` resolve 成 concrete mode [E: packages/http-recorder/src/internal-effect.ts:100] [E: packages/http-recorder/src/internal-effect.ts:101] [E: packages/http-recorder/src/internal-effect.ts:102] [E: packages/http-recorder/src/internal-effect.ts:103] [E: packages/http-recorder/src/internal-effect.ts:104] [E: packages/http-recorder/src/internal-effect.ts:105]。
3. `passthrough` mode 直接返回 upstream，不做 snapshot [E: packages/http-recorder/src/internal-effect.ts:118]。
4. record mode 把 `HttpClientRequest` 转为 web request，snapshot method/url/headers/body 并 redactor 处理 [E: packages/http-recorder/src/internal-effect.ts:107] [E: packages/http-recorder/src/internal-effect.ts:109] [E: packages/http-recorder/src/internal-effect.ts:110] [E: packages/http-recorder/src/internal-effect.ts:114]。
5. record mode 执行 upstream request，buffer response body；文本 content-type 保留 text，非文本转 base64 [E: packages/http-recorder/src/internal-effect.ts:130] [E: packages/http-recorder/src/internal-effect.ts:131] [E: packages/http-recorder/src/internal-effect.ts:55] [E: packages/http-recorder/src/internal-effect.ts:59] [E: packages/http-recorder/src/internal-effect.ts:60]。
6. record mode 构造 `HttpInteraction`，用 tail `Deferred` 保证 cassette append 按 request start 顺序串行，即使 response 完成顺序不同 [E: packages/http-recorder/src/internal-effect.ts:121] [E: packages/http-recorder/src/internal-effect.ts:127] [E: packages/http-recorder/src/internal-effect.ts:137] [E: packages/http-recorder/src/internal-effect.ts:142] [E: packages/http-recorder/src/internal-effect.ts:144]。
7. replay mode 通过 `makeReplayState(..., httpInteractions)` 只投影 HTTP interactions，并对每个 incoming request 调 `selectSequential` 匹配当前位置 [E: packages/http-recorder/src/internal-effect.ts:156] [E: packages/http-recorder/src/internal-effect.ts:160] [E: packages/http-recorder/src/internal-effect.ts:162]。
8. replay missing cassette 会转成 redacted transport error，提示本地运行录制且 `CI=true` forces replay [E: packages/http-recorder/src/internal-effect.ts:78] [E: packages/http-recorder/src/internal-effect.ts:90] [E: packages/http-recorder/src/internal-effect.ts:169] [E: packages/http-recorder/src/internal-effect.ts:173]。

## Matching 与 replay 验证

默认 matcher 比较 `canonicalSnapshot(incoming) === canonicalSnapshot(recorded)`；canonical snapshot 会排序 JSON object keys，并把 JSON body parse 后 canonicalize [E: packages/http-recorder/src/matching.ts:15] [E: packages/http-recorder/src/matching.ts:16] [E: packages/http-recorder/src/matching.ts:17] [E: packages/http-recorder/src/matching.ts:25] [E: packages/http-recorder/src/matching.ts:30] [E: packages/http-recorder/src/matching.ts:36] [E: packages/http-recorder/src/matching.ts:37]。`selectSequential` 只看当前 index 的 recorded interaction，缺失时报 `interaction N of M not recorded`，不匹配时返回 request diff [E: packages/http-recorder/src/matching.ts:95] [E: packages/http-recorder/src/matching.ts:102] [E: packages/http-recorder/src/matching.ts:104]。

`makeReplayState` 在 scope finalizer 中检查是否有未消费 recorded interactions；如果 used 小于 interactions length，会 die `Unused recorded interactions...` [E: packages/http-recorder/src/recorder.ts:35] [E: packages/http-recorder/src/recorder.ts:40] [E: packages/http-recorder/src/recorder.ts:42]。这让 cassette replay 同时校验“请求不能少”和“请求不能多” [I]。

## Redaction

默认 request headers 只保留 `content-type`、`accept`、`openai-beta`，默认 response headers 只保留 `content-type` [E: packages/http-recorder/src/redactor.ts:8] [E: packages/http-recorder/src/redactor.ts:9]。默认 JSON field redaction 覆盖 `access_token`、`api_key`、`apikey`、`client_secret`、`password`、`refresh_token`、`secret`、`token`，字段名会去除非字母数字并 lower-case 后比较 [E: packages/http-recorder/src/redactor.ts:72] [E: packages/http-recorder/src/redactor.ts:80] [E: packages/http-recorder/src/redactor.ts:83]。

`make(options)` 会把用户自定义 headers、allowRequestHeaders、allowResponseHeaders、queryParameters、jsonFields、url/body transform 叠加到默认 redactor [E: packages/http-recorder/src/redactor.ts:104] [E: packages/http-recorder/src/redactor.ts:105] [E: packages/http-recorder/src/redactor.ts:108] [E: packages/http-recorder/src/redactor.ts:112] [E: packages/http-recorder/src/redactor.ts:115] [E: packages/http-recorder/src/redactor.ts:119]。写 cassette 前会扫描 interaction 和 metadata 中的 secret-looking values，发现后返回 `UnsafeCassetteError` 而不是覆盖文件 [E: packages/http-recorder/src/cassette.ts:69] [E: packages/http-recorder/src/cassette.ts:109] [E: packages/http-recorder/src/cassette.ts:111] [E: packages/http-recorder/src/cassette.ts:112] [E: packages/http-recorder/README.md:168]。

## WebSocket 控制流

`socket()` 是 public decorator：它要求普通 URL-bound `Socket.Socket` layer 已经在下层提供，recorder 配置不重复 URL，默认 `compareClientMessagesAsJson: true` [E: packages/http-recorder/src/socket.ts:308] [E: packages/http-recorder/src/socket.ts:309]。recording socket 把 client/server frames 编成 ordered events，text 保留 body，binary base64；成功打开且成功退出才 append cassette [E: packages/http-recorder/src/socket.ts:34] [E: packages/http-recorder/src/socket.ts:37] [E: packages/http-recorder/src/socket.ts:147] [E: packages/http-recorder/src/socket.ts:165] [E: packages/http-recorder/src/socket.ts:166] [E: packages/http-recorder/src/socket.ts:172] [E: packages/http-recorder/src/socket.ts:193]。

WebSocket replay 会按 recorded chronology 推进：server event 立即交给 handler，client event 则等待 app writer 写出匹配 frame 后继续 [E: packages/http-recorder/src/socket.ts:86] [E: packages/http-recorder/src/socket.ts:97] [E: packages/http-recorder/src/socket.ts:102] [E: packages/http-recorder/src/socket.ts:105]。writer 会把 actual client frame 与当前位置 expected event 比较，成功后推进 position 并唤醒 driver [E: packages/http-recorder/src/socket.ts:262] [E: packages/http-recorder/src/socket.ts:263] [E: packages/http-recorder/src/socket.ts:269] [E: packages/http-recorder/src/socket.ts:273]。

## 与主仓测试的关系

V2 session runner recorded test 用 `HttpRecorder.http("session-runner/openai-chat-streams-text")` 或 internal record mode cassette layer 包住 LLM `RequestExecutor` [E: packages/core/test/session-runner-recorded.test.ts:39] [E: packages/core/test/session-runner-recorded.test.ts:41] [E: packages/core/test/session-runner-recorded.test.ts:43] [E: packages/core/test/session-runner-recorded.test.ts:45] [E: packages/core/test/session-runner-recorded.test.ts:48]。`packages/llm` 的 recorded test helper 把 HTTP `recordingLayer` 和 WebSocket cassette layer 合并，给 native LLM protocol tests 提供 replayable `LLMClient` [E: packages/llm/test/recorded-test.ts:75] [E: packages/llm/test/recorded-test.ts:80] [E: packages/llm/test/recorded-test.ts:90] [E: packages/llm/test/recorded-test.ts:92]。V1 native LLM recorded tests 只记录 HTTP client，`RequestExecutor` 和 opencode LLM stack 保持真实 [E: packages/opencode/test/session/llm-native-recorded.test.ts:285] [E: packages/opencode/test/session/llm-native-recorded.test.ts:292] [E: packages/opencode/test/session/llm-native-recorded.test.ts:293]。

## Gotcha

- README 明确当前 limits：record/replay 会 buffer response，不适合断言 streaming timing、cancellation、backpressure [E: packages/http-recorder/README.md:206] [E: packages/http-recorder/README.md:208]。
- WebSocket V1 cassette 不保留 terminal close code/reason/transport failure，failed/interrupted live runs 不记录 [E: packages/http-recorder/README.md:210]。
- 没有 public overwrite mode；刷新 cassette 要删除指定 recording 再重跑测试 [E: packages/http-recorder/README.md:132] [E: packages/http-recorder/README.md:135] [E: packages/http-recorder/README.md:136] [E: packages/http-recorder/README.md:139]。

## Sources

- `packages/http-recorder/README.md`
- `packages/http-recorder/package.json`
- `packages/http-recorder/src/index.ts`
- `packages/http-recorder/src/effect.ts`
- `packages/http-recorder/src/internal-effect.ts`
- `packages/http-recorder/src/socket.ts`
- `packages/http-recorder/src/cassette.ts`
- `packages/http-recorder/src/schema.ts`
- `packages/http-recorder/src/matching.ts`
- `packages/http-recorder/src/redactor.ts`
- `packages/http-recorder/src/recorder.ts`
- `packages/http-recorder/test/record-replay.test.ts`
- `packages/core/test/session-runner-recorded.test.ts`
- `packages/llm/test/recorded-test.ts`
- `packages/opencode/test/session/llm-native-recorded.test.ts`

## 相关

- `model-layer.llm-protocol-engine`：native LLM 协议测试大量依赖 http-recorder 的 HTTP/WebSocket cassette replay。
