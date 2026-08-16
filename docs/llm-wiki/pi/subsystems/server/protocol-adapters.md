---
id: subsys.server.protocol-adapters
title: pi-ai 到 protocol DTO adapters
kind: subsystem
tier: T2
pkg: server
source:
  - packages/server/src/protocol.ts
  - packages/server/test/protocol.test.ts
symbols:
  - toProtocolJsonValue
  - sanitizeProtocolDetails
  - toProtocolUsage
  - toProtocolModelMetadata
  - toProtocolUserMessage
  - toProtocolAssistantMessage
  - toProtocolToolResultMessage
related:
  - subsys.server.session-server
  - subsys.server.live-sessions
  - subsys.protocol.wire-protocol
evidence: explicit
status: verified
updated: 086c32e745
---

> `packages/server/src/protocol.ts` 是 `pi-ai` domain objects 与 `pi-protocol` wire DTO 的显式 anti-corruption layer：它验证 identifiers/timestamps/JSON inputs，lossy-sanitize diagnostics，并把 model/message lifecycle 映射成 protocol schemas。[E: packages/server/src/protocol.ts:1][E: packages/server/src/protocol.ts:14][E: packages/server/src/protocol.ts:130][E: packages/server/src/protocol.ts:135][E: packages/server/src/protocol.ts:142][E: packages/server/src/protocol.ts:166]

## 能回答的问题

- 为什么 protocol package 不直接复用 `pi-ai` types？
- 哪些 model/usage fields 被传到 wire，哪些刻意只留 server-side？
- assistant stopReason 如何映射 streaming/terminal status？
- tool result 为什么必须带 original `ToolCall`？
- execution input 与 diagnostic details 为什么使用两种 JSON conversion policy？

## Compile-time drift guards

adapter 以 `ExactKeys` manifests 枚举当前 `pi-ai` text/thinking/image/tool/usage/model/message fields；`pi-ai` union 新增字段会让 type assertions 失败，迫使 adapter 显式评审 mapped/omitted field。[E: packages/server/src/protocol.ts:24][E: packages/server/src/protocol.ts:25][E: packages/server/src/protocol.ts:38][E: packages/server/src/protocol.ts:38][E: packages/server/src/protocol.ts:45][E: packages/server/src/protocol.ts:46][E: packages/server/src/protocol.ts:49][E: packages/server/src/protocol.ts:58][E: packages/server/src/protocol.ts:80][E: packages/server/src/protocol.ts:81][E: packages/server/src/protocol.ts:101]

注释列出 intentionally server-side 的 provider replay metadata、diagnostics、cache retention splits、model transport settings、pricing tiers 与 deferred-tool availability；这些字段不是 wire snapshot 的隐含 contract。[E: packages/server/src/protocol.ts:38][E: packages/server/src/protocol.ts:38][E: packages/server/src/protocol.ts:38][E: packages/server/src/protocol.ts:38]

## JSON 边界

`toProtocolJsonValue()` 用于 execution-semantic input：只接受 JSON-compatible finite values/plain objects，拒绝 undefined/function/symbol/bigint、non-plain objects 与 cycles；array 会逐 entry 递归并保留输入意义。[E: packages/server/src/protocol.ts:142][E: packages/server/src/protocol.ts:142][E: packages/server/src/protocol.ts:143][E: packages/server/src/protocol.ts:144][E: packages/server/src/protocol.ts:145][E: packages/server/src/protocol.ts:148][E: packages/server/src/protocol.ts:149][E: packages/server/src/protocol.ts:151][E: packages/server/src/protocol.ts:152][E: packages/server/src/protocol.ts:156]

`sanitizeProtocolDetails()` 只处理 diagnostics：non-finite number/bigint/Date 转 string，unsupported values 被省略，cycle 变为 `"[Circular]"`，array 中无法表示的 entry 变 null。[E: packages/server/src/protocol.ts:166][E: packages/server/src/protocol.ts:166][E: packages/server/src/protocol.ts:168][E: packages/server/src/protocol.ts:169][E: packages/server/src/protocol.ts:170][E: packages/server/src/protocol.ts:171][E: packages/server/src/protocol.ts:173][E: packages/server/src/protocol.ts:176][E: packages/server/src/protocol.ts:179][E: packages/server/src/protocol.ts:180]

## Model 与 usage

`toProtocolUsage()` 把 token counts floor/clamp 为 non-negative integers，把 costs clamp 为 finite non-negative numbers，并保留 optional reasoning tokens。[E: packages/server/src/protocol.ts:121][E: packages/server/src/protocol.ts:122][E: packages/server/src/protocol.ts:123][E: packages/server/src/protocol.ts:126][E: packages/server/src/protocol.ts:188][E: packages/server/src/protocol.ts:190][E: packages/server/src/protocol.ts:192][E: packages/server/src/protocol.ts:196][E: packages/server/src/protocol.ts:197][E: packages/server/src/protocol.ts:199][E: packages/server/src/protocol.ts:203]

`toProtocolModelMetadata()` 输出 provider/id/name/api、reasoning/input、context/max tokens、base cost、supported thinking levels 与 caller-supplied authenticated flag；baseUrl、headers、compat 与 pricing tiers 不进入 DTO。[E: packages/server/src/protocol.ts:209][E: packages/server/src/protocol.ts:211][E: packages/server/src/protocol.ts:214][E: packages/server/src/protocol.ts:215][E: packages/server/src/protocol.ts:216][E: packages/server/src/protocol.ts:217][E: packages/server/src/protocol.ts:218][E: packages/server/src/protocol.ts:219][E: packages/server/src/protocol.ts:225][E: packages/server/src/protocol.ts:226]

## Transcript mapping

user content 保留 text/image；assistant content exhaustive 映射 text/thinking/toolCall，tool call arguments 必须通过 strict JSON converter。[E: packages/server/src/protocol.ts:231][E: packages/server/src/protocol.ts:232][E: packages/server/src/protocol.ts:233][E: packages/server/src/protocol.ts:234][E: packages/server/src/protocol.ts:237][E: packages/server/src/protocol.ts:257][E: packages/server/src/protocol.ts:259][E: packages/server/src/protocol.ts:262][E: packages/server/src/protocol.ts:268][E: packages/server/src/protocol.ts:273]

assistant `pending` 映射 `status:"streaming"`；`stop|length|toolUse` 映射 complete；`error`/`aborted` 映射同名 terminal status，并验证 error message 约束。[E: packages/server/src/protocol.ts:302][E: packages/server/src/protocol.ts:303][E: packages/server/src/protocol.ts:304][E: packages/server/src/protocol.ts:305][E: packages/server/src/protocol.ts:307][E: packages/server/src/protocol.ts:310][E: packages/server/src/protocol.ts:315][E: packages/server/src/protocol.ts:316][E: packages/server/src/protocol.ts:321][E: packages/server/src/protocol.ts:325][E: packages/server/src/protocol.ts:328]

`toProtocolToolResultMessage()` 必须拿 original `ToolCall`，验证 result call id/name association，并从 original call arguments 生成 input；message details 走 lossy sanitizer，execution input 走 strict converter。[E: packages/server/src/protocol.ts:354][E: packages/server/src/protocol.ts:356][E: packages/server/src/protocol.ts:358][E: packages/server/src/protocol.ts:360][E: packages/server/src/protocol.ts:361][E: packages/server/src/protocol.ts:363][E: packages/server/src/protocol.ts:364][E: packages/server/src/protocol.ts:366][E: packages/server/src/protocol.ts:373][E: packages/server/src/protocol.ts:375]

## Gotcha

- 对 finite numeric model `contextWindow`/`maxTokens`，adapter 会 floor 后最小化为 1；这里没有拒绝 `NaN`/`Infinity`，所以不能把相同保证推广到 non-finite input。invalid identifiers/timestamps 则直接 throw，不做替代值。[E: packages/server/src/protocol.ts:130][E: packages/server/src/protocol.ts:131][E: packages/server/src/protocol.ts:135][E: packages/server/src/protocol.ts:136][E: packages/server/src/protocol.ts:137][E: packages/server/src/protocol.ts:217][E: packages/server/src/protocol.ts:218]
- tool input conversion 是 correctness boundary，不能改用 `sanitizeProtocolDetails()`，否则 function/cycle/bigint 等 execution data 会被静默改写。[I]
- transcript item id 不是从 `pi-ai` message 取；caller 必须通过 options 提供 non-empty id。[E: packages/server/src/protocol.ts:108][E: packages/server/src/protocol.ts:112][E: packages/server/src/protocol.ts:116][E: packages/server/src/protocol.ts:249][E: packages/server/src/protocol.ts:289][E: packages/server/src/protocol.ts:369]

## Sources

- packages/server/src/protocol.ts
- packages/server/test/protocol.test.ts

## 相关

- [subsys.protocol.wire-protocol](../protocol/wire-protocol.md) - wire lifecycle schema 与 DTO fields。
- [subsys.server.session-server](session-server.md) - adapter 所属的 server boundary。
- [subsys.server.live-sessions](live-sessions.md) - backend/runtime 如何生产 authoritative snapshots。
