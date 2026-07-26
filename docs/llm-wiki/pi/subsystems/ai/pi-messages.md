---
id: subsys.ai.pi-messages
title: Pi Messages 协议
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/pi-messages.ts
  - packages/ai/src/api/pi-messages.lazy.ts
  - packages/ai/src/providers/radius.ts
  - packages/ai/src/providers/radius-config.ts
  - packages/ai/src/types.ts
symbols:
  - stream
  - streamSimple
  - PiMessagesEvent
  - PiMessagesResponseError
related:
  - subsys.ai.wire-protocol-dispatch
  - subsys.ai.provider-registry
  - ref.ai.wire-protocol-catalog
evidence: explicit
status: verified
updated: cee5ff7520
---

> `subsys.ai.pi-messages` 描述 Pi 自有的 HTTP/SSE wire protocol：client 向 `<baseUrl>/messages` POST 统一的 model/context/options，再把服务端序列化事件还原为标准 `AssistantMessageEventStream`。Radius gateway 和 `models.json` custom provider 都能使用它。

## 能回答的问题

- `pi-messages` 的 request、SSE event 和 terminal contract 是什么?
- Radius 怎样把动态 gateway catalog 绑定到该协议?
- 服务端 rewrite、HTTP failure、abort 和缺失 terminal event 怎样回到 Pi diagnostics?
- `streamSimple` 怎样适配 reasoning、tool choice 和 debug options?

## 协议边界

`KnownApi` 在目标提交加入 `"pi-messages"`，lazy wrapper 通过 `lazyApi()` 首次调用时导入 implementation [E: packages/ai/src/types.ts:16] [E: packages/ai/src/types.ts:26] [E: packages/ai/src/api/pi-messages.lazy.ts:1] [E: packages/ai/src/api/pi-messages.lazy.ts:4]。Radius 直接绑定该 API；因为它已进入 `KnownApi`，`models.json` custom provider 也可选择该 wire key [E: packages/ai/src/providers/radius.ts:20] [E: packages/ai/src/providers/radius.ts:26] [I]。

## Request

`stream()` 要求 API key，把 URL 规范成 `<model.baseUrl>/messages`；debug option 添加 `?debug=1` [E: packages/ai/src/api/pi-messages.ts:345] [E: packages/ai/src/api/pi-messages.ts:355] [E: packages/ai/src/api/pi-messages.ts:360] [E: packages/ai/src/api/pi-messages.ts:361]。POST body 是 `{ model, context, options }`，options 只投影 temperature、maxTokens、reasoning、cacheRetention、sessionId 与 toolChoice，并允许 `onPayload` 替换完整 payload [E: packages/ai/src/api/pi-messages.ts:365] [E: packages/ai/src/api/pi-messages.ts:374] [E: packages/ai/src/api/pi-messages.ts:377]。

请求使用 bearer auth、SSE accept、JSON content type 和 provider headers，透传 abort signal；`onResponse` 在 HTTP status 检查前收到 status/headers [E: packages/ai/src/api/pi-messages.ts:382] [E: packages/ai/src/api/pi-messages.ts:391] [E: packages/ai/src/api/pi-messages.ts:394]。未显式给 cache retention 时只把 legacy `PI_CACHE_RETENTION=long` 映射为 `long`，其它情况交给 backend default [E: packages/ai/src/api/pi-messages.ts:337] [E: packages/ai/src/api/pi-messages.ts:342]。

## SSE 与事件还原

client 按空行切分 SSE frame，读取 `data:` 行，忽略 `[DONE]` [E: packages/ai/src/api/pi-messages.ts:266] [E: packages/ai/src/api/pi-messages.ts:277] [E: packages/ai/src/api/pi-messages.ts:303] [E: packages/ai/src/api/pi-messages.ts:310]。`PiMessagesEvent` 覆盖 text、thinking、tool-call start/delta/end，以及 terminal `done`/`error`；terminal event 可携带 usage、response id 和 server rewrite impact [E: packages/ai/src/api/pi-messages.ts:52] [E: packages/ai/src/api/pi-messages.ts:70] [E: packages/ai/src/api/pi-messages.ts:77] [E: packages/ai/src/api/pi-messages.ts:82]。

converter 按 `contentIndex` 累积 text/thinking/tool JSON；tool delta 通过 streaming JSON parser 形成 partial arguments，terminal event 更新 stop reason/usage 并附加 rewrite diagnostic [E: packages/ai/src/api/pi-messages.ts:176] [E: packages/ai/src/api/pi-messages.ts:189] [E: packages/ai/src/api/pi-messages.ts:197] [E: packages/ai/src/api/pi-messages.ts:206] [E: packages/ai/src/api/pi-messages.ts:235] [E: packages/ai/src/api/pi-messages.ts:248]。

## 错误语义

非 2xx response 会读取 structured error body，生成带 provider/model/url/status/body metadata 的 `PiMessagesResponseError` [E: packages/ai/src/api/pi-messages.ts:133] [E: packages/ai/src/api/pi-messages.ts:141] [E: packages/ai/src/api/pi-messages.ts:396] [E: packages/ai/src/api/pi-messages.ts:398]。这类失败会附加 `pi_messages_response_failure` diagnostic；abort 则使用 `aborted` reason，不附加 response-failure diagnostic [E: packages/ai/src/api/pi-messages.ts:313] [E: packages/ai/src/api/pi-messages.ts:327] [E: packages/ai/src/api/pi-messages.ts:330]。

流必须以 `done` 或 `error` 结束；SSE EOF 没有 terminal event 会转成 error event [E: packages/ai/src/api/pi-messages.ts:404] [E: packages/ai/src/api/pi-messages.ts:407] [E: packages/ai/src/api/pi-messages.ts:412] [E: packages/ai/src/api/pi-messages.ts:414]。`streamSimple()` 复用 `stream()`，保留 reasoning，并从扩展 options 透传 toolChoice/debug [E: packages/ai/src/api/pi-messages.ts:421] [E: packages/ai/src/api/pi-messages.ts:426] [E: packages/ai/src/api/pi-messages.ts:427] [E: packages/ai/src/api/pi-messages.ts:431]。

## Radius binding

`radiusProvider()` 是 `Provider<"pi-messages">`：provider id 默认 `radius`，auth 同时支持 `RADIUS_API_KEY` 和 lazy Radius OAuth [E: packages/ai/src/providers/radius.ts:20] [E: packages/ai/src/providers/radius.ts:21] [E: packages/ai/src/providers/radius.ts:31] [E: packages/ai/src/providers/radius.ts:33]。refresh 先恢复 provider-scoped store，必要时迁移旧 OAuth credential 中的 catalog；允许 network 时再取 gateway `/v1/config`，持久化新的 models [E: packages/ai/src/providers/radius.ts:36] [E: packages/ai/src/providers/radius.ts:39] [E: packages/ai/src/providers/radius.ts:43] [E: packages/ai/src/providers/radius.ts:47] [E: packages/ai/src/providers/radius.ts:51] [E: packages/ai/src/providers/radius.ts:54] [E: packages/ai/src/providers/radius.ts:57]。

gateway config 把每个 model 固定成 `api: "pi-messages"` 并注入 provider id 与 config base URL [E: packages/ai/src/providers/radius-config.ts:61] [E: packages/ai/src/providers/radius-config.ts:64] [E: packages/ai/src/providers/radius-config.ts:66]。这也是 Radius 不出现在 structural model shards、但仍属于 runtime built-in provider 的原因。[I]

## Gotcha

- `pi-messages` 是 Pi client/backend 之间的协议，不等于 session JSONL 或 RPC stdin/stdout protocol。[I]
- bearer key 是必需的；即使后端不检查 secret，provider auth 也必须向 request path 提供非空 key [E: packages/ai/src/api/pi-messages.ts:355] [E: packages/ai/src/api/pi-messages.ts:357]。
- rewrite metadata 只作为 diagnostic 附加，不会重写 client 侧已经还原的 transcript content [E: packages/ai/src/api/pi-messages.ts:165] [E: packages/ai/src/api/pi-messages.ts:172] [I]。

## Sources

- packages/ai/src/api/pi-messages.ts
- packages/ai/src/api/pi-messages.lazy.ts
- packages/ai/src/providers/radius.ts
- packages/ai/src/providers/radius-config.ts
- packages/ai/src/types.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md): `model.api` 到 lazy `ProviderStreams` 的统一 dispatch。
- [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md): 10 个 chat/text wire key 的逐实例目录。
- [subsys.ai.provider-registry](provider-registry.md): Radius 的 runtime built-in registration。
