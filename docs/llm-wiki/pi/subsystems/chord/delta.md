---
id: subsys.chord.delta
title: Chord replicated state and delta tracking
kind: subsystem
tier: T2
pkg: chord
source:
  - packages/chord/package.json
  - packages/chord/README.md
  - packages/chord/src/delta/README.md
  - packages/chord/src/delta/index.ts
  - packages/chord/src/api.ts
  - packages/chord/src/types.ts
  - packages/chord/src/json.ts
  - packages/chord/src/facets/host.ts
  - packages/chord/src/services/state.ts
  - packages/chord/src/services/state-codec.ts
  - packages/chord/src/services/state-internals.ts
  - packages/chord/src/services/provider.ts
  - packages/chord/src/services/wire.ts
  - packages/chord/test/delta.test.ts
  - packages/chord/test/services.test.ts
  - packages/chord/test/json.test.ts
  - packages/client/src/client.ts
symbols:
  - replicatedState
  - MutableReplicatedState
  - ReplicatedState
  - track
  - apply
  - applyImmutable
  - encoder
  - decoder
  - Op
  - WireOp
  - assertValidOp
  - assertValidWireOp
  - RESERVED_SEGMENTS
  - UnsafePathError
  - createServiceStateEncoder
  - createServiceStateDecoder
  - isBase
  - isJsonValue
related:
  - subsys.chord.runtime
  - subsys.client.remote-session-client
evidence: explicit
status: verified
updated: 9767ba275f
---

> `@earendil-works/chord/delta` 在 flush 时从 tracked 的 plain JSON 导出紧凑 `Op[]`；`replicatedState()` 用同一套 tracker，生产者改 `state` 代理再 `publish(context)`，消费者拿到不可变完整值。跨越边界的值必须是 strict JSON；`apply()` / `decoder()` 把 op 当 untrusted 输入校验路径与动词。[E: packages/chord/src/api.ts:88][E: packages/chord/src/services/state.ts:40][E: packages/chord/src/delta/index.ts:435][E: packages/chord/src/delta/index.ts:785][E: packages/chord/src/delta/index.ts:764]

## 能回答的问题

- `replicatedState(initial)` 的 `state` / `value` / `publish` / `subscribe` 分别是谁的权威？
- `track().flush()` 第一次为什么总是 `["r", …]`，之后怎样变成 path op？
- `r` / `s` / `d` / `a` / `t` / `p` 各改什么，`WireOp` 多了哪些压缩？
- 为什么 `__proto__` 路径会被拒绝，而 JSON 值里的 `__proto__` 键可以留下？
- `createServiceStateEncoder()` 为什么必须一对一绑定每个 instance/member 流？
- replica 在 disconnect / sequence gap 之后为什么变成 unready？

## 职责边界

Delta 是独立子路径 `@earendil-works/chord/delta`，只依赖 `JsonValue`，不依赖 facet host。[E: packages/chord/package.json:19][E: packages/chord/src/delta/index.ts:1] README 把 replicated state 与 delta tracking 分成两块：host 暴露权威 state；delta 在 flush 时推导 compact ops，并在 apply 时校验 untrusted 操作。[E: packages/chord/README.md:34][E: packages/chord/README.md:41]

`replicatedState()` 从根入口导出，实现是 `MutableReplicatedStateImpl`：内部 `track(initial)`，构造时立刻 `flush()` 出 opening base，再用 `applyImmutable` 得到第一份 published value。[E: packages/chord/src/api.ts:88][E: packages/chord/src/services/state.ts:14][E: packages/chord/src/services/state.ts:15] Facet 侧 `env.replicatedState()` 同样 `new MutableReplicatedStateImpl(initial)`，不另走一套算法。[E: packages/chord/src/facets/host.ts:588]

本节点不覆盖 `defineFacet` / `createFacetHost` / remote transport；那些在 [subsys.chord.runtime](runtime.md)。本节点覆盖 tracker、op 词汇、replicated publish、replica hydrate/update、以及远程订阅上的 per-stream path codec。

## 关键文件

- `packages/chord/src/delta/index.ts`：`Op` / `WireOp`、`track()`、`apply()` / `applyImmutable()`、`encoder()` / `decoder()`、`assertValidOp` / `RESERVED_SEGMENTS`。[E: packages/chord/src/delta/index.ts:30][E: packages/chord/src/delta/index.ts:435][E: packages/chord/src/delta/index.ts:764][E: packages/chord/src/delta/index.ts:938]
- `packages/chord/src/delta/README.md`：mutation、array、ownership、consumer-ownership 规则。[E: packages/chord/src/delta/README.md:3][E: packages/chord/src/delta/README.md:244]
- `packages/chord/src/services/state.ts`：`MutableReplicatedStateImpl` 与 `ReplicatedStateReplica`。[E: packages/chord/src/services/state.ts:6][E: packages/chord/src/services/state.ts:60]
- `packages/chord/src/services/state-codec.ts`：每个订阅里每个 state member 一份 encoder/decoder。[E: packages/chord/src/services/state-codec.ts:60][E: packages/chord/src/services/state-codec.ts:90]
- `packages/chord/src/services/state-internals.ts`：`WeakMap` 把 replicated object 登记成可远程暴露的 state member。[E: packages/chord/src/services/state-internals.ts:13][E: packages/chord/src/services/state-internals.ts:17]
- `packages/chord/src/json.ts`：`isJsonValue()` 给 adapter 边界用。[E: packages/chord/src/json.ts:4]

## 数据模型

### 公开 replicated 接口

`ReplicatedState<T>`：`value` 是不可变快照或 hydration 前的 `undefined`；`subscribe(listener)` 收到 `(value, context, delivery)`，`delivery.kind` 是 `"hydrate" | "update"`。[E: packages/chord/src/types.ts:43][E: packages/chord/src/types.ts:38][E: packages/chord/src/types.ts:45] 后续 update 不 mutate 先前返回的对象：`applyImmutable` 只 copy 变化路径上的 container。[E: packages/chord/src/delta/index.ts:1014][E: packages/chord/src/delta/index.ts:1022]

`MutableReplicatedState<T extends object>` 加上：`value` 必有（构造即 hydrate）、可变 `state` 代理、`publish(context)`。[E: packages/chord/src/types.ts:50][E: packages/chord/src/types.ts:53][E: packages/chord/src/types.ts:55] 所有写入必须走 `state` 代理。[E: packages/chord/src/types.ts:53][E: packages/chord/src/services/state.ts:36]

### Decoded `Op`

`Op` 是 tuple，内存 / 本地 apply / 磁盘 durable batch 用同一形状。[E: packages/chord/src/delta/index.ts:30]

| Tuple | 含义 |
|---|---|
| `["r", value]` | 整值替换。唯一能换 root 的动词 |
| `["s", path, value]` | 设非空 path 上的属性/元素 |
| `["d", path]` | 删非空 path |
| `["a", path, string]` | 字符串尾部追加 |
| `["t", path, count]` | 从字符串前端丢掉 `count` 个 UTF-16 code unit |
| `["p", path, index, remove, items]` | splice；path 可为空（root 是数组时） |

[E: packages/chord/src/delta/index.ts:30][E: packages/chord/src/delta/README.md:82] `s`/`d`/`a`/`t` 的 path 类型是 `NonEmptyPath`，不能打 root。[E: packages/chord/src/delta/index.ts:32][E: packages/chord/src/delta/index.ts:33] `isBase(ops)` 当且仅当 `ops[0]` 是 `r`；flush 保证 `r` 只出现在 index 0 或不出现。[E: packages/chord/src/delta/index.ts:70]

### Wire `WireOp`

跨边界时 encoder 另加两种压缩，**不**改变 decoded 语义：[E: packages/chord/src/delta/index.ts:48]

- `["#", id, path]`：某 path 第二次使用时定义 id
- 数字 `PathRef`：引用已定义 id
- 省略 path 的短 tuple（`["s", value]`、`["d"]`、`["a", text]`、`["t", count]`、`["p", i, r, items]`）：复用**本 batch** 上一条 op 的 path

[E: packages/chord/src/delta/index.ts:48][E: packages/chord/src/delta/index.ts:60] `["r", value]` 原样编码，所以 `isBase` 对 `Op` 和 `WireOp` 都成立。[E: packages/chord/src/delta/index.ts:49][E: packages/chord/src/delta/index.ts:64][E: packages/chord/src/delta/index.ts:70]

`apply()` 只收 decoded `Op`。`WireOp[]` 必须先 `decoder().decode()`。[E: packages/chord/src/delta/index.ts:938][E: packages/chord/src/delta/README.md:55]

### Tracker

`track(root)` 返回 `{ state, target, flush, rebase, discard, dirty }`。[E: packages/chord/src/delta/index.ts:112] `state` 是 Proxy；插进去的对象被 adopt，之后只能经该 Proxy 再写。[E: packages/chord/src/delta/index.ts:118][E: packages/chord/src/delta/index.ts:693] `target` 是未跟踪的当前值，直接改它会绕过 tracking。[E: packages/chord/src/delta/index.ts:120] `rebase()` 让下一次 flush 再出完整 base，不改当前值。[E: packages/chord/src/delta/index.ts:123][E: packages/chord/src/delta/index.ts:714]

## 控制流

### track / flush

1. `track@packages/chord/src/delta/index.ts:435` 设 `forceBase = true`，用 Proxy 包 root。[E: packages/chord/src/delta/index.ts:440][E: packages/chord/src/delta/index.ts:693]
2. 第一次 `flush()` 克隆 root，写出 `[["r", value]]`，建立 baseline，清 pending。[E: packages/chord/src/delta/index.ts:726][E: packages/chord/src/delta/index.ts:731]
3. 之后的写入按路径记 dirty。字符串：纯 append → `a`；rolling window（旧后缀 = 新前缀）→ `t` 再可选 `a`；否则 `s`。[E: packages/chord/src/delta/index.ts:216][E: packages/chord/src/delta/index.ts:225][E: packages/chord/src/delta/index.ts:222] `overlap()` 在重复文本上放弃并退回 `s`，避免错误压缩。[E: packages/chord/src/delta/index.ts:81][E: packages/chord/src/delta/index.ts:97]
4. 数组：`push` / 尾部 `splice` / 增大 `length` 记 append；`unshift` / `shift` / 中间 splice / `sort` 等记 diff；整段换成空或 `length = 0` 可记 replace。[E: packages/chord/src/delta/index.ts:542][E: packages/chord/src/delta/index.ts:549][E: packages/chord/src/delta/index.ts:572]
5. 无 pending 则 `flush()` 返回 `[]`。[E: packages/chord/src/delta/index.ts:733] 有 dirty 则 `walkDirty` 对 baseline 出 ops，再尽量 `syncBaseline` 共享 cheap 引用（scalar / string / 纯 append）；不能 cheap sync 时用 `apply` replay 推进 baseline。[E: packages/chord/src/delta/index.ts:735][E: packages/chord/src/delta/index.ts:742]

`undefined` 赋给 object 属性等于 delete（出 `d`）；赋给 array 元素 throw，因为会造出 JSON 无法往返的 hole。[E: packages/chord/src/delta/index.ts:642][E: packages/chord/src/delta/index.ts:644][E: packages/chord/src/delta/README.md:239]

### replicatedState.publish

1. `replicatedState@packages/chord/src/api.ts:88` → `MutableReplicatedStateImpl`。构造：`track(initial)`，`flush()` 出 base，`applyImmutable(undefined, ops)` 得到 `#publishedValue`，并把 internals 登记进 WeakMap 供远程 provider 订阅 op 流。[E: packages/chord/src/services/state.ts:14][E: packages/chord/src/services/state.ts:15][E: packages/chord/src/services/state.ts:17]
2. `state` getter 返回 tracker proxy；`value` getter 返回上一份 published 不可变值。[E: packages/chord/src/services/state.ts:32][E: packages/chord/src/services/state.ts:36]
3. `publish(context)@packages/chord/src/services/state.ts:40` 调 `flush()`；`ops.length === 0` 则直接 return，不 bump sequence。[E: packages/chord/src/services/state.ts:41][E: packages/chord/src/services/state.ts:42]
4. 否则 `#sequence += 1`，`applyImmutable` 算出新 `#publishedValue`，先通知 source listeners（`ops, sequence, context`），再通知 value listeners，`delivery.kind = "update"`。[E: packages/chord/src/services/state.ts:43][E: packages/chord/src/services/state.ts:45][E: packages/chord/src/services/state.ts:46]
5. `subscribe` 先 `publish(serviceDeliveryContext())` 冲掉 pending，再把 listener 加进去，立刻用 `{ kind: "hydrate", sequence }` 送当前 value。[E: packages/chord/src/services/state.ts:51][E: packages/chord/src/services/state.ts:54] 因此新订阅者看不到未 publish 的脏写，但会先 flush 一次已有 mutation。[E: packages/chord/test/services.test.ts:114]
6. 测试锁：`value` 与 `initial` 不是同一引用；hydrate 拿到的旧对象在后续 `publish` 后仍保持旧内容。[E: packages/chord/test/services.test.ts:98][E: packages/chord/test/services.test.ts:109]

Chord 每次 `publish` 只 flush **一个** decoded batch；每个远程 client/state pairing 自己编码，互不共享 path 字典。[E: packages/chord/README.md:37][E: packages/chord/src/services/state-codec.ts:60][E: packages/chord/src/services/state-codec.ts:90]

### Replica hydrate / update

`ReplicatedStateReplica` 冷启动 `value === undefined`。[E: packages/chord/src/services/state.ts:60][E: packages/chord/src/services/state.ts:70]

1. `hydrate(sequence, ops, context)` 要求 `isBase(ops)`，否则 throw `snapshot is not a base operation batch`；然后 `applyImmutable(undefined, ops)`。[E: packages/chord/src/services/state.ts:86][E: packages/chord/src/services/state.ts:87]
2. `update` 在未 hydrate 时 throw；`sequence !== #sequence + 1` 则 `clear()` 再 throw `update sequence has a gap`。[E: packages/chord/src/services/state.ts:94][E: packages/chord/src/services/state.ts:97][E: packages/chord/src/services/state.ts:99]
3. `clear()` 把 value/sequence 置回 undefined（unready），直到下一次 base hydrate。[E: packages/chord/src/services/state.ts:107] disconnect / replacement 走这条路径，与 README “Replicas become unready on disconnect or replacement until they are rehydrated” 一致。[E: packages/chord/README.md:38]

Listener throw 被吞掉并 `reportError`，不阻断其它 listener。[E: packages/chord/src/services/state.ts:123]

### 远程订阅上的 path codec

`createServiceStateEncoder()` / `createServiceStateDecoder()` 各持一个 `StateCodecRegistry`：key 是 `[instance.key, generation, member]`。[E: packages/chord/src/services/state-codec.ts:60][E: packages/chord/src/services/state-codec.ts:148]

| 事件 | codec 行为 |
|---|---|
| encode/decode snapshot | `reset()`，每个 state member `add()` 新 encoder/decoder |
| `state` update | `get(instance, member)` 续用同一对 |
| `replaced` / `unavailable` | `reset()` |
| `spawned` | 为新 instance 的 state members `add()` |
| `closed` | `removeInstance` |

[E: packages/chord/src/services/state-codec.ts:64][E: packages/chord/src/services/state-codec.ts:73][E: packages/chord/src/services/state-codec.ts:75][E: packages/chord/src/services/state-codec.ts:80][E: packages/chord/src/services/state-codec.ts:83]

Provider snapshot 里的 state member 始终带 `[["r", currentValue]]`，让新订阅者从 base 开始。[E: packages/chord/src/services/provider.ts:453][E: packages/chord/src/services/provider.ts:457] Encoder 遇到 `r` 会清空 path id 字典，因为 base 是 recovery point。[E: packages/chord/src/delta/index.ts:1120][E: packages/chord/src/delta/index.ts:1126]

`pi-client` 的 `createClientServiceTransport` 为每个 service subscription 建自己的 `ServiceStateDecoder`，解码 wire snapshot/update 后再交给 Chord binding。[E: packages/client/src/client.ts:54][E: packages/client/src/client.ts:448]

### encoder / decoder

1. `encoder()@packages/chord/src/delta/index.ts:1105`：path 第一次 inline；第二次先发 `#` 再引用 id。短形式只看**本 batch** 的 `previous`，不跨 batch。[E: packages/chord/src/delta/index.ts:1105][E: packages/chord/src/delta/index.ts:1117][E: packages/chord/src/delta/index.ts:1136]
2. `decoder()@packages/chord/src/delta/index.ts:1198` 对每条 `WireOp` 先 `assertValidWireOp`。[E: packages/chord/src/delta/index.ts:1206] 短形式在 `previous === undefined` 时 `PathError`；未知 id 也是 `PathError`。[E: packages/chord/src/delta/index.ts:1227][E: packages/chord/src/delta/index.ts:1233]
3. 一对 encoder/decoder 只服务一条有序流。共享一条 transport 连接不等于共享一个字典。[E: packages/chord/src/services/state-codec.ts:148][E: packages/chord/src/delta/README.md:65]

## Untrusted op 校验

Ops 可来自 facet、plugin compartment、或回显了模型输出的 tool details，因此全部当 untrusted。[E: packages/chord/src/delta/index.ts:785][E: packages/chord/src/delta/index.ts:764]

`RESERVED_SEGMENTS` = `__proto__`、`constructor`、`prototype`。[E: packages/chord/src/delta/index.ts:764] `JSON.parse` 本身会把 `__proto__` 做成 own property；危险的是赋值写 path。`apply` 用 `Object.defineProperty` 写，并拒绝 reserved segment。[E: packages/chord/src/delta/index.ts:983][E: packages/chord/src/delta/index.ts:894]

`assertSafePath`：string segment 不得在 reserved 集；number 必须是 `>= 0` 的 integer。[E: packages/chord/src/delta/index.ts:891][E: packages/chord/src/delta/index.ts:894] Tracker 写入同样 `guard()`；读到 reserved own key 时给 child 标 `blockedSegment`，再往下走 throw `UnsafePathError`。[E: packages/chord/src/delta/index.ts:506][E: packages/chord/src/delta/index.ts:600]

`assertValidOp` 校验 decoded 动词、arity、path 非空（`s`/`d`/`a`/`t`）、`t`/`p` 的整数约束；未知动词 throw，不静默跳过。[E: packages/chord/src/delta/index.ts:785][E: packages/chord/src/delta/index.ts:817] `assertValidWireOp` 另允许 id 与短形式；string 不能当 path（否则 `"a".slice(0,-1)` 会变成打 root）。[E: packages/chord/src/delta/index.ts:828][E: packages/chord/src/delta/index.ts:838]

`apply()` 每条 op 先 `assertValidOp`。[E: packages/chord/src/delta/index.ts:946] 写用 `Object.defineProperty`，避免 inherited setter 执行。[E: packages/chord/src/delta/index.ts:983] 走 path 只用 own property。[E: packages/chord/src/delta/index.ts:1073] 数组下标只允许现有元素或**恰好** `length`（append one）；再大会 `UnsafePathError`，堵住 `["s", ["xs", 4294967290], 1]` 这种分配式 DoS。[E: packages/chord/src/delta/index.ts:916][E: packages/chord/src/delta/index.ts:917][E: packages/chord/test/delta.test.ts:765][E: packages/chord/test/delta.test.ts:768]

测试锁：

- `apply({}, [["s", ["constructor","prototype","gadget"], true]])` throw，且 `({}).gadget` 仍是 undefined。[E: packages/chord/test/delta.test.ts:710][E: packages/chord/test/delta.test.ts:711]
- interned `["#", 0, ["__proto__", "w"]]` 在 `decode` 即 throw。[E: packages/chord/test/delta.test.ts:714][E: packages/chord/test/delta.test.ts:719]
- 作为 **value** 的 `{"__proto__":{"z":1}}` 可以 `s` 进去，且不污染 `Object.prototype`。[E: packages/chord/test/delta.test.ts:736][E: packages/chord/test/delta.test.ts:739]

`apply` 对 `r` **adopt 不 copy** 入参。同一 batch fan-out 给多个 in-process consumer 会让 replica alias；跨真实边界时序列化已经产出新对象。[E: packages/chord/src/delta/index.ts:955] `applyImmutable` 只 copy 变化路径上的 container，未改子树共享引用。[E: packages/chord/src/delta/index.ts:1014][E: packages/chord/src/delta/index.ts:1022]

Wire parsers 在 adapter 交出 JSON 之后再跑：`parseServiceSubscriptionSnapshot` 用 `assertValidOp`，`parseWireServiceSubscriptionSnapshot` 用 `assertValidWireOp`。[E: packages/chord/src/services/wire.ts:113][E: packages/chord/src/services/wire.ts:118] `parseServiceCall` 检查 `serviceId` / `member` / `args` 形状，不深拷贝 `args`。[E: packages/chord/src/services/wire.ts:89][E: packages/chord/src/types.ts:167]

## JSON-only wire 值

远程方法参数/结果与 replicated state value 的 JSON 约束首先是类型层 `RemoteServiceContract`。[E: packages/chord/src/types.ts:92][E: packages/chord/src/types.ts:110] 运行时 `defineService` 不扫这个约束。[E: packages/chord/test/services.test.ts:65]

跨越 `RemoteServiceTransport` 的 arguments / results / snapshots / updates / catalogues 必须是 finite strict JSON。[E: packages/chord/README.md:49][E: packages/chord/src/types.ts:185] `isJsonValue()` 拒绝 `undefined`、非 finite number、typed array、循环、非 `Object.prototype`/`null` prototype。[E: packages/chord/src/json.ts:4][E: packages/chord/test/json.test.ts:7][E: packages/chord/test/json.test.ts:8][E: packages/chord/test/json.test.ts:9][E: packages/chord/test/json.test.ts:12]

Chord **不**在 `provider.invoke` 里对业务 args/result 再跑一遍 `isJsonValue`；它把 `call.args` 原样交给 method，并把返回值断言成 `JsonValue | undefined`。[E: packages/chord/src/services/provider.ts:233][E: packages/chord/src/services/provider.ts:234] 深度 JSON 检查留给 adapter / serializer。[I]

`JsonValue` 没有 `undefined`。可选 object 字段用缺席（`d`），数组位置要用 `null`。[E: packages/chord/src/types.ts:21][E: packages/chord/src/delta/README.md:239][E: packages/chord/src/delta/README.md:241]

## 设计动机与权衡

Flush-time diff 而不是 mutation log：不保留历史，但能从当前 vs baseline 还原 append / front-truncate / tail splice。[E: packages/chord/README.md:41][E: packages/chord/src/delta/index.ts:435] 字符串比较用 `slice ===` 而不是 `startsWith`，避免 V8 在 cons string 上逐字符走。[E: packages/chord/src/delta/index.ts:216]

Producer 改 proxy、consumer 看 immutable 完整值：UI / 远程 replica 不必理解 dirty tree。[E: packages/chord/src/delta/README.md:27] `applyImmutable` 让旧 revision 继续被持有。[E: packages/chord/src/delta/index.ts:1014][E: packages/chord/test/services.test.ts:109]

Path 字典 per stream：encoder 在第二次使用才 intern（第一次 intern 会亏），且 `r` 清空字典，让读者可以从最近一个 base 用新 decoder 恢复。[E: packages/chord/src/delta/index.ts:1161][E: packages/chord/src/delta/index.ts:1126]

Reserved path 与 `defineProperty` 写入把 prototype pollution 和 inherited accessor 挡在 applier 外；这是安全边界，不是风格偏好。[E: packages/chord/src/delta/index.ts:764][E: packages/chord/src/delta/index.ts:983]

## Gotcha

- 插入 `state` 的对象归 tracker。保留只读引用可以，在 Proxy 外再 mutate 会让 replica 对不齐。[E: packages/chord/src/delta/README.md:246][E: packages/chord/README.md:120]
- `fill()` / `copyWithin()` 保持 JS 引用语义；不要把同一个可变对象放到多个 live path。[E: packages/chord/src/delta/README.md:223]
- 结构移动（`shift`）再改“新下标”上的元素，同一 flush 可能按保留下标对齐，op 会比意图宽。能控制 batch 时，先 flush 结构变化。[E: packages/chord/src/delta/README.md:207][E: packages/chord/src/delta/index.ts:304]
- 对象 key 若是 reserved segment，`diffObject` 整节点退成 `s`，避免把 reserved 名字写进 path。[E: packages/chord/src/delta/index.ts:261]
- `apply` adopt `r` 的 value。进程内把同一 `ops` 数组分给多个 replica 会共享可变对象；fan-out 点要 copy batch，或让每个 consumer 自己 decode。[E: packages/chord/src/delta/index.ts:955]
- replica sequence gap 会 `clear()` 再 throw：之后 `value` 是 `undefined`，必须等新的 base snapshot。[E: packages/chord/src/services/state.ts:97][E: packages/chord/src/services/state.ts:107]
- `publish` 空 flush 是 no-op，sequence 不变；不要用“调用了 publish”推断一定有 update delivery。[E: packages/chord/src/services/state.ts:42]

## 跨包边界

[subsys.chord.runtime](runtime.md) 拥有 facet host、service token、remote transport。本节点的 `replicatedState` 是可挂到远程 service member 上的 state 原语；host 用 loopback binding 把本地远程服务接到同一套 snapshot/update。[E: packages/chord/src/facets/host.ts:588][E: packages/chord/src/services/provider.ts:357]

[subsys.client.remote-session-client](../client/remote-session-client.md) 用 `createServiceStateDecoder()` 解码每个订阅的 wire snapshot/update。Chord delta 不依赖 `pi-client`；箭头是 client → chord。[E: packages/client/src/client.ts:3][E: packages/client/src/client.ts:54]

## Sources

- packages/chord/package.json
- packages/chord/README.md
- packages/chord/src/delta/README.md
- packages/chord/src/delta/index.ts
- packages/chord/src/api.ts
- packages/chord/src/types.ts
- packages/chord/src/json.ts
- packages/chord/src/facets/host.ts
- packages/chord/src/services/state.ts
- packages/chord/src/services/state-codec.ts
- packages/chord/src/services/state-internals.ts
- packages/chord/src/services/provider.ts
- packages/chord/src/services/wire.ts
- packages/chord/test/delta.test.ts
- packages/chord/test/services.test.ts
- packages/chord/test/json.test.ts
- packages/client/src/client.ts

## 相关

- [subsys.chord.runtime](runtime.md): `defineFacet` / `defineService` / `createFacetHost` / loaders / remote transport。`env.replicatedState()` 的挂载点。
- [subsys.client.remote-session-client](../client/remote-session-client.md): `Client` 上每个 service subscription 的独立 `ServiceStateDecoder`。
