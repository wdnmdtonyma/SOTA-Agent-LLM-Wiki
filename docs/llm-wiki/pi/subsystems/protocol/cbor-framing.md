---
id: subsys.protocol.cbor-framing
title: CBOR codec 与 length framing
kind: subsystem
tier: T2
pkg: protocol
source:
  - packages/protocol/src/cbor/options.ts
  - packages/protocol/src/cbor/encoder.ts
  - packages/protocol/src/cbor/decoder.ts
  - packages/protocol/src/framing.ts
  - packages/protocol/src/codec.ts
symbols:
  - encodeCbor
  - decodeCbor
  - encodeFrame
  - FrameDecoder
  - ClientMessageDecoder
  - ServerMessageDecoder
related:
  - subsys.protocol.wire-protocol
  - subsys.client.unix-transport
  - subsys.server.unix-transport
evidence: explicit
status: verified
updated: a8ee03b815
---

> `subsys.protocol.cbor-framing` 覆盖远程 session protocol 的 byte contract：一个 4-byte unsigned big-endian payload length，后接一个 definite-length CBOR item；schema validation 位于 CBOR/framing 之上。[E: packages/protocol/src/framing.ts:28][E: packages/protocol/src/framing.ts:28][E: packages/protocol/src/framing.ts:31][E: packages/protocol/src/framing.ts:33][E: packages/protocol/src/framing.ts:34][E: packages/protocol/src/framing.ts:35][E: packages/protocol/src/framing.ts:36][E: packages/protocol/src/framing.ts:37]

## 能回答的问题

- frame header 的 endian、长度与默认上限是什么？
- decoder 如何处理 fragmentation、coalescing、truncation 与 oversized header？
- protocol CBOR 支持/拒绝哪些 JavaScript value？
- CBOR limit、frame limit 与 transport pending-byte limit 有什么区别？
- validation/codec failure 后 decoder 是否还能继续使用？

## Limit 模型

默认 CBOR byte limit 是 16 MiB，container limit 是 1,000,000 entries，depth 是 64；caller 可以分别覆盖 `maxByteLength`、`maxContainerLength`、`maxDepth`。[E: packages/protocol/src/cbor/options.ts:6][E: packages/protocol/src/cbor/options.ts:6][E: packages/protocol/src/cbor/options.ts:7][E: packages/protocol/src/cbor/options.ts:8][E: packages/protocol/src/cbor/options.ts:10][E: packages/protocol/src/cbor/options.ts:12][E: packages/protocol/src/cbor/options.ts:14][E: packages/protocol/src/cbor/options.ts:16] frame 默认最大 payload 同样是 16 MiB，但 `FrameDecoderOptions` 只有独立 `maxFrameLength`。[E: packages/protocol/src/framing.ts:6][E: packages/protocol/src/framing.ts:6][E: packages/protocol/src/framing.ts:8][E: packages/protocol/src/framing.ts:9]

`encodeProtocolMessage()` 先 runtime-validate message，再用 frame limit 同时约束 CBOR encoding 与完整 frame validation；因此 caller 配置的 protocol frame limit 同时约束 outbound CBOR payload。[E: packages/protocol/src/codec.ts:60][E: packages/protocol/src/codec.ts:66][E: packages/protocol/src/codec.ts:68][E: packages/protocol/src/codec.ts:69][E: packages/protocol/src/codec.ts:70]

## Framing 控制流

1. `encodeFrame(payload)` 拒绝非 `Uint8Array` 与超过 uint32 的 payload，分配 `4 + payload.byteLength` bytes，写入 big-endian header 后复制 payload。[E: packages/protocol/src/framing.ts:28][E: packages/protocol/src/framing.ts:29][E: packages/protocol/src/framing.ts:30][E: packages/protocol/src/framing.ts:31][E: packages/protocol/src/framing.ts:33][E: packages/protocol/src/framing.ts:37]
2. `FrameDecoder.push(chunk)` 先累积 4-byte header；header 完整后立即比较 declared length 与 `maxFrameLength`，不必先缓存 oversized payload。[E: packages/protocol/src/framing.ts:73][E: packages/protocol/src/framing.ts:81][E: packages/protocol/src/framing.ts:82][E: packages/protocol/src/framing.ts:83][E: packages/protocol/src/framing.ts:88][E: packages/protocol/src/framing.ts:91][E: packages/protocol/src/framing.ts:92]
3. payload 以 64 KiB internal blocks 累积；一个 `push()` 可返回多个按顺序完成的 frames。[E: packages/protocol/src/framing.ts:3][E: packages/protocol/src/framing.ts:78][E: packages/protocol/src/framing.ts:105][E: packages/protocol/src/framing.ts:124][E: packages/protocol/src/framing.ts:126][E: packages/protocol/src/framing.ts:134][E: packages/protocol/src/framing.ts:143]
4. byte stream 关闭时必须调用 `end()`；残留 partial header/payload 会把 decoder 置为 failed 并抛 `Truncated frame at end of stream`。[E: packages/protocol/src/framing.ts:146][E: packages/protocol/src/framing.ts:149][E: packages/protocol/src/framing.ts:150][E: packages/protocol/src/framing.ts:155][E: packages/protocol/src/framing.ts:156]

## CBOR subset

encoder/decoder 支持 `null`、boolean、finite safe-range number、UTF-8 string、`Uint8Array` byte string、definite-length array，以及 string-keyed plain-object map。[E: packages/protocol/src/cbor/encoder.ts:129][E: packages/protocol/src/cbor/encoder.ts:133][E: packages/protocol/src/cbor/encoder.ts:137][E: packages/protocol/src/cbor/encoder.ts:148][E: packages/protocol/src/cbor/encoder.ts:152][E: packages/protocol/src/cbor/encoder.ts:160][E: packages/protocol/src/cbor/encoder.ts:179] object property 为 `undefined` 时被省略；array 中 `undefined`、sparse array、cycle、enumerable symbol key、non-finite/unsafe number 与 non-plain object 被拒绝；non-enumerable symbol 不进入枚举。[E: packages/protocol/src/cbor/encoder.ts:138][E: packages/protocol/src/cbor/encoder.ts:140][E: packages/protocol/src/cbor/encoder.ts:161][E: packages/protocol/src/cbor/encoder.ts:169][E: packages/protocol/src/cbor/encoder.ts:170][E: packages/protocol/src/cbor/encoder.ts:180][E: packages/protocol/src/cbor/encoder.ts:181][E: packages/protocol/src/cbor/encoder.ts:183][E: packages/protocol/src/cbor/encoder.ts:189][E: packages/protocol/src/cbor/encoder.ts:207][I]

decoder 只接受 definite lengths；遇到 tags、indefinite-length item、非法 UTF-8、trailing bytes 或超限 container/depth 会抛 `CborError`。[E: packages/protocol/src/cbor/decoder.ts:20][E: packages/protocol/src/cbor/decoder.ts:22][E: packages/protocol/src/cbor/decoder.ts:27][E: packages/protocol/src/cbor/decoder.ts:47][E: packages/protocol/src/cbor/decoder.ts:52][E: packages/protocol/src/cbor/decoder.ts:56][E: packages/protocol/src/cbor/decoder.ts:62][E: packages/protocol/src/cbor/decoder.ts:79][E: packages/protocol/src/cbor/decoder.ts:80][E: packages/protocol/src/cbor/decoder.ts:112][E: packages/protocol/src/cbor/decoder.ts:113][E: packages/protocol/src/cbor/decoder.ts:115]

## Validated decoder

`ValidatedMessageDecoder` 对每个完成 frame 做 `decodeCbor()` 和 schema parse；任何 frame/CBOR/schema failure 都把实例标为 failed，之后 `push()`/`end()` 继续调用会直接拒绝。[E: packages/protocol/src/codec.ts:88][E: packages/protocol/src/codec.ts:102][E: packages/protocol/src/codec.ts:103][E: packages/protocol/src/codec.ts:106][E: packages/protocol/src/codec.ts:107][E: packages/protocol/src/codec.ts:110][E: packages/protocol/src/codec.ts:111][E: packages/protocol/src/codec.ts:117][E: packages/protocol/src/codec.ts:118]

`ClientMessageDecoder` 与 `ServerMessageDecoder` 只是分别绑定 client/server schema 的小型 wrapper；factory helpers 返回新 decoder 实例。[E: packages/protocol/src/codec.ts:129][E: packages/protocol/src/codec.ts:129][E: packages/protocol/src/codec.ts:146][E: packages/protocol/src/codec.ts:146][E: packages/protocol/src/codec.ts:162][E: packages/protocol/src/codec.ts:166]

## Gotcha

- zero-length frame 在 framing 层合法，但不是合法 protocol CBOR message，会在 validated decoder 的 CBOR/schema 层失败。[E: packages/protocol/src/framing.ts:94][E: packages/protocol/src/framing.ts:95][I]
- frame limit 只约束单 frame；transport 还需要独立 outbound queue bound。client/server Unix implementations 用 `maxPendingBytes` 提供这层限制。[I]
- `ProtocolValidationError` 故意不保留 rejected payload；constructor 的第二参数没有存为字段。[E: packages/protocol/src/codec.ts:18][E: packages/protocol/src/codec.ts:19][E: packages/protocol/src/codec.ts:20][E: packages/protocol/src/codec.ts:21]

## Sources

- packages/protocol/src/cbor/options.ts
- packages/protocol/src/cbor/encoder.ts
- packages/protocol/src/cbor/decoder.ts
- packages/protocol/src/framing.ts
- packages/protocol/src/codec.ts

## 相关

- [subsys.protocol.wire-protocol](wire-protocol.md) - schema、command/event 与 snapshot contract。
- [subsys.client.unix-transport](../client/unix-transport.md) - Node/Bun client byte transport 的 queue/backpressure。
- [subsys.server.unix-transport](../server/unix-transport.md) - listener、socket ownership 与 graceful close。
