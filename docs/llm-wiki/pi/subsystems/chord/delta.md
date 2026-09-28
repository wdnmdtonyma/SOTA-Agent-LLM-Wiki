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
  - packages/chord/src/delta/tracker.ts
  - packages/chord/src/delta/apply-immutable-trusted.ts
  - packages/chord/src/delta/diff.ts
  - packages/chord/src/delta/draft.ts
  - packages/chord/src/delta/revision-validator.ts
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
  - track
  - Tracker
  - Change
  - Prepared
  - Draft
  - apply
  - applyImmutable
  - applyImmutableBatches
  - applyImmutableTrusted
  - encoder
  - decoder
  - Op
  - WireOp
  - assertValidOp
  - assertValidWireOp
  - RESERVED_SEGMENTS
  - UnsafePathError
  - JsonRevisionValidator
  - replicatedState
  - MutableReplicatedState
  - ReplicatedState
  - createServiceStateEncoder
  - createServiceStateDecoder
  - isBase
  - isJsonValue
related:
  - subsys.chord.runtime
  - subsys.client.remote-session-client
evidence: explicit
status: verified
updated: 6f7551516b
---

> `@earendil-works/chord/delta` 的权威路径是 **immutable revision tracker**：`track(initial)` 拿走 alias-free strict-JSON root；`beginChange()` 打开 overlay draft；`prepare()` 物化候选值和精确 `Op[]`；`adopt()` 交换根指针。`applyImmutable()` / `applyImmutableBatches()` 是 in-process 首选 replay。`replicatedState()` 用同一套 tracker，生产者走 `change(context, callback)` / `replace(context, value)`，消费者拿不可变完整值。跨越边界的值必须是 strict JSON；`apply()` / `decoder()` 把 op 当 untrusted 输入校验路径与动词。[E: packages/chord/src/delta/tracker.ts:321][E: packages/chord/src/delta/tracker.ts:235][E: packages/chord/src/delta/index.ts:409][E: packages/chord/src/delta/index.ts:419][E: packages/chord/src/services/state.ts:123][E: packages/chord/src/delta/index.ts:152]

## 能回答的问题

- `track()` 现在返回什么？`beginChange` / `prepare` / `adopt` / `prepareReplace` 各自改不改 authority？
- `replicatedState(initial)` 的 `value` / `change` / `replace` / `subscribe` 分别是谁的权威？
- `r` / `s` / `d` / `a` / `t` / `p` / `m` 各改什么，`WireOp` 多了哪些压缩？
- `applyImmutableBatches()` 与逐次 `applyImmutable()` 差在哪？trusted 物化为什么走 `applyImmutableTrusted`？
- 为什么 `__proto__` 路径会被拒绝，而 JSON 值里的 `__proto__` 键可以留下？
- `createServiceStateEncoder()` 为什么必须一对一绑定每个 instance/member 流？
- replica 在 disconnect / sequence gap 之后为什么变成 unready？

## 职责边界

Delta 是独立子路径 `@earendil-works/chord/delta`，只依赖 `JsonValue`，不依赖 facet host。[E: packages/chord/package.json:19][E: packages/chord/src/delta/index.ts:1] 实现拆在 `index.ts`（op 词汇 / untrusted apply / codec）、`tracker.ts`（canonical immutable tracker）、`apply-immutable-trusted.ts`（self-produced 物化）、`diff.ts`（overlay emit）、`draft.ts`（`Draft<T>`）、`revision-validator.ts`（replica 校验）。README 把 replicated state 与 delta tracking 分成两块：host 暴露权威 state；delta 在 prepare 时推导 exact ops，并在 apply 时校验 untrusted 操作。[E: packages/chord/README.md:34][E: packages/chord/README.md:42]

`replicatedState()` 从根入口导出。入参是普通 JSON root 时实现是 `MutableReplicatedStateImpl`：内部 `track(initial)`，对外没有可变 `state` 代理，也没有 `publish()`；写入必须走 `change()` 或 `replace()`。[E: packages/chord/src/api.ts:99][E: packages/chord/src/services/state.ts:105][E: packages/chord/src/types.ts:53] Facet 侧 `env.replicatedState()` 同样 `new MutableReplicatedStateImpl(initial)`。[E: packages/chord/src/facets/host.ts:586] 入参实现 `attach()` 时走 `AttachedReplicatedState`，把外部 source frame 接到同一套 publisher。[E: packages/chord/src/api.ts:91][E: packages/chord/src/api.ts:104]

本节点不覆盖 `defineFacet` / `createFacetHost` / remote transport；那些在 [subsys.chord.runtime](runtime.md)。本节点覆盖 tracker、op 词汇、replicated publish、replica hydrate/update、以及远程订阅上的 per-stream path codec。`packages/durable/docs/pico*` 与 `packages/agent/docs/pico*` 不是 shipped 运行时证据，本节点不引用。

## 关键文件

- `packages/chord/src/delta/index.ts`：`Op` / `WireOp`、`apply()` / `applyImmutable()` / `applyImmutableBatches()`、`encoder()` / `decoder()`、`assertValidOp` / `RESERVED_SEGMENTS`。[E: packages/chord/src/delta/index.ts:32][E: packages/chord/src/delta/index.ts:326][E: packages/chord/src/delta/index.ts:409][E: packages/chord/src/delta/index.ts:523]
- `packages/chord/src/delta/tracker.ts`：canonical `track()` / `Tracker` / `Change` / `Prepared`。[E: packages/chord/src/delta/tracker.ts:135][E: packages/chord/src/delta/tracker.ts:321]
- `packages/chord/src/delta/apply-immutable-trusted.ts`：self-produced batch 的 copy-on-write 物化，跳过 untrusted 校验。[E: packages/chord/src/delta/apply-immutable-trusted.ts:15]
- `packages/chord/src/delta/diff.ts`：overlay dirty tree 发出 `Op[]`，含 `MAX_DELTA_OPERATIONS = 4096`。[E: packages/chord/src/delta/diff.ts:5]
- `packages/chord/src/delta/README.md`：ownership、lifecycle、op 表、replica 合同。[E: packages/chord/src/delta/README.md:28][E: packages/chord/src/delta/README.md:124]
- `packages/chord/src/services/state.ts`：`MutableReplicatedStateImpl` 与 `ReplicatedStateReplica`。[E: packages/chord/src/services/state.ts:105][E: packages/chord/src/services/state.ts:265]
- `packages/chord/src/services/state-codec.ts`：每个订阅里每个 state member 一份 encoder/decoder。[E: packages/chord/src/services/state-codec.ts:60][E: packages/chord/src/services/state-codec.ts:90]
- `packages/chord/src/delta/revision-validator.ts`：replica 对每个 resulting revision 做 JSON 校验，已见过的 container 跳过。[E: packages/chord/src/delta/revision-validator.ts:8]
- `packages/chord/src/json.ts`：`isJsonValue()` 给 adapter 边界用。[E: packages/chord/src/json.ts:74]

## 数据模型

### 公开 replicated 接口

`ReplicatedState<T>`：`value` 是不可变快照或 hydration 前的 `undefined`；`subscribe(listener)` 收到 `(value, context, delivery)`，`delivery.kind` 是 `"hydrate" | "update"`。[E: packages/chord/src/types.ts:43][E: packages/chord/src/types.ts:38][E: packages/chord/src/types.ts:48] 后续 update 不 mutate 先前返回的对象：`applyImmutable` 只 copy 变化路径上的 container。[E: packages/chord/src/delta/index.ts:409][E: packages/chord/src/types.ts:48]

`MutableReplicatedState<T extends object>` 加上：`value` 必有（构造即 hydrate）、`change(context, mutate)`、`replace(context, value)`。没有可变 `state` getter，也没有 `publish()`。[E: packages/chord/src/types.ts:53][E: packages/chord/src/types.ts:59][E: packages/chord/src/types.ts:64] `change` 回调必须同步；draft handle 在回调返回后不可用；赋 `undefined` 给 object 属性等于 delete。[E: packages/chord/src/types.ts:59][E: packages/chord/src/services/state.ts:131]

### Tracker / Change / Prepared

`track(root)` 返回 `Tracker<T>`：`value` 是最新 adopted revision，`revision` 是单调计数，`beginChange()` 打开 overlay，`prepareReplace(value)` 整根替换，`adopt(prepared)` 交换指针。[E: packages/chord/src/delta/tracker.ts:135][E: packages/chord/src/delta/tracker.ts:321] 构造把 `initial` 当 immutable 所有权拿走，O(1) 不 walk 树。[E: packages/chord/src/delta/tracker.ts:222][E: packages/chord/src/delta/README.md:98]

`Change.state` 是 `Draft<T>` proxy，只在 change 仍 open 时可写。`prepare()` 把 status 设为 `"prepared"`，发出 ops 并 materialize；失败则 abort 并 throw。`abort()` 使 draft 不可用。[E: packages/chord/src/delta/tracker.ts:175][E: packages/chord/src/delta/tracker.ts:181][E: packages/chord/src/delta/tracker.ts:202]

`Prepared` 暴露 `base` / `value` / `ops` / `baseRevision`。`adopt()` 要求 prepared 属于本 tracker、status 是 `"prepared"`、`baseRevision` 匹配、`prepared.base === tracker.value`；然后 `this.#value = prepared.value`，`#revision += 1`，其它 open/prepared change 变 stale。[E: packages/chord/src/delta/tracker.ts:121][E: packages/chord/src/delta/tracker.ts:254][E: packages/chord/src/delta/tracker.ts:273]

### Decoded `Op`

`Op` 是 tuple，内存 / 本地 apply / 磁盘 durable batch 用同一形状。[E: packages/chord/src/delta/index.ts:32]

| Tuple | 含义 |
|---|---|
| `["r", value]` | 整值替换。唯一能换 root 的动词 |
| `["s", path, value]` | 设非空 path 上的属性/元素 |
| `["d", path]` | 删非空 path |
| `["a", path, string]` | 字符串尾部追加 |
| `["t", path, count]` | 从字符串前端丢掉 `count` 个 UTF-16 code unit |
| `["p", path, index, remove, items]` | splice；path 可为空（root 是数组时） |
| `["m", path, permutation]` | 原地重排数组：`new[i] = old[permutation[i]]` |

[E: packages/chord/src/delta/index.ts:32][E: packages/chord/src/delta/README.md:157] `s`/`d`/`a`/`t` 的 path 类型是 `NonEmptyPath`，不能打 root。[E: packages/chord/src/delta/index.ts:34] `p` 和 `m` 可以打 root，因为 tracked 值本身可以是数组。[E: packages/chord/src/delta/index.ts:40] `isBase(ops)` 当且仅当 `ops[0]` 是 `r`。[E: packages/chord/src/delta/index.ts:76] 批次 exact 但不 canonical：同一 change 可用不同 tuple，大编辑可折成 region splice、祖先 `s` 或 `r`。[E: packages/chord/src/delta/README.md:167]

### Wire `WireOp`

跨边界时 encoder 另加两种压缩，**不**改变 decoded 语义：[E: packages/chord/src/delta/index.ts:52]

- `["#", id, path]`：某 path 第二次使用时定义 id
- 数字 `PathRef`：引用已定义 id
- 省略 path 的短 tuple（含 `["m", permutation]`）：复用**本 batch** 上一条 op 的 path

[E: packages/chord/src/delta/index.ts:52][E: packages/chord/src/delta/index.ts:64] `["r", value]` 原样编码，所以 `isBase` 对 `Op` 和 `WireOp` 都成立。[E: packages/chord/src/delta/index.ts:76][E: packages/chord/src/delta/index.ts:76]

`apply()` 只收 decoded `Op`。`WireOp[]` 必须先 `decoder().decode()`。[E: packages/chord/src/delta/index.ts:326][E: packages/chord/src/delta/README.md:178]

## 控制流

### track / prepare / adopt

1. `track@packages/chord/src/delta/tracker.ts:321` 构造 `TrackerImpl`，把 root 存成 `#value`，`#revision = 0`。[E: packages/chord/src/delta/tracker.ts:219][E: packages/chord/src/delta/tracker.ts:222][E: packages/chord/src/delta/tracker.ts:321]
2. `beginChange()` 为当前 revision 建 overlay context，draft 不修改 `#value`。[E: packages/chord/src/delta/tracker.ts:235][E: packages/chord/src/delta/README.md:126]
3. `prepare()` 在 dirty 为空时 `ops = []`；否则 `emitOperations`。物化：空 ops 复用 base；简单 object 走 `cloneNode`；含 `p`/`m` 的 batch 走 `applyImmutable`；其余走 `applyImmutableTrusted`。[E: packages/chord/src/delta/tracker.ts:187][E: packages/chord/src/delta/tracker.ts:331][E: packages/chord/src/delta/tracker.ts:343]
4. `adopt()` 是 infallible pointer swap：authority 在 adopt 前不变，storage 失败可以丢掉 candidate。[E: packages/chord/src/delta/tracker.ts:273] 采纳一个 change 会 stale 所有竞争 draft。[E: packages/chord/src/delta/tracker.ts:305][E: packages/chord/src/delta/README.md:131]
5. `prepareReplace(value)` 是整根操作不是 diff。deep-equal 则 `ops` 为空并保留当前 root；否则 `ops` 是 `[["r", value]]` 且 `prepared.value === value`。[E: packages/chord/src/delta/README.md:145][E: packages/chord/src/delta/tracker.ts:241]

空 `ops` 表示 `prepared.value === prepared.base`。采纳 no-op 仍推进 `tracker.revision` 并 stale 竞争者；replicated state **不** publish no-op。[E: packages/chord/src/delta/README.md:138][E: packages/chord/src/services/state.ts:145]

Placement（属性写、`push`/`splice`/`fill`/`copyWithin` 等）会 clone 并校验 strict JSON；非法值在 draft 改变前 throw。[E: packages/chord/src/delta/README.md:105] `undefined` 赋给 object 属性等于 delete；赋给 array 元素 throw。[E: packages/chord/src/delta/README.md:117] 数组保持 dense：越过下一 index 或删元素 throw；增大 `length` 插入 `null`。[E: packages/chord/src/delta/README.md:121]

### applyImmutable / applyImmutableBatches / trusted

`applyImmutable(target, ops)` 委托 `applyImmutableBatches(target, [ops])`。[E: packages/chord/src/delta/index.ts:409] `applyImmutableBatches` 在一次 copy-on-write scope 里顺序 replay 多个 batch：被更早 batch copy 过的 container 可在后续 batch 里继续 mutate，因此**不暴露中间 revision**。[E: packages/chord/src/delta/index.ts:419][E: packages/chord/src/delta/README.md:53] 需要保留每一帧时必须分开调用 `applyImmutable()`。[E: packages/chord/src/delta/README.md:64]

`applyImmutableTrusted` 假定 ops 是 tracker 自己产出的：不跑 `assertValidOp`，每条 touched path 只 shallow-copy 一次，splice 用 `copyWithin` 而不是 spread。[E: packages/chord/src/delta/apply-immutable-trusted.ts:15][E: packages/chord/src/delta/apply-immutable-trusted.ts:107] `materializeOperations` 遇到 `p`/`m` 退回通用 `applyImmutable`，因为 native splice/permutation 对大结构 batch 更快。[E: packages/chord/src/delta/tracker.ts:346]

可变 `apply()` 仍是 untrusted 路径：adopt `r` 的 value 不 copy；同一 in-memory batch fan-out 给多个 mutable replica 会 alias。[E: packages/chord/src/delta/index.ts:343][E: packages/chord/src/delta/README.md:67]

### replicatedState.change / replace

1. `replicatedState@packages/chord/src/api.ts:99` → `MutableReplicatedStateImpl`。构造：`track(initial)`，publisher 的初始 value 是 `tracker.value`，并把 internals 登记进 WeakMap 供远程 provider 订阅 op 流。[E: packages/chord/src/services/state.ts:110][E: packages/chord/src/services/state.ts:113]
2. `value` getter 返回 `tracker.value`（已 adopted 的不可变值）。[E: packages/chord/src/services/state.ts:119]
3. `change(context, mutate)@packages/chord/src/services/state.ts:123` 禁止 reentrant；`beginChange()` 后同步跑 callback，promise-like 返回值 throw `must be synchronous`；失败 `abort()`。[E: packages/chord/src/services/state.ts:124][E: packages/chord/src/services/state.ts:131][E: packages/chord/src/services/state.ts:137]
4. `adopt(prepared)` 之后若 `ops.length === 0` 直接 return，不 bump sequence。[E: packages/chord/src/services/state.ts:144][E: packages/chord/src/services/state.ts:145] 否则 publisher `publish(value, ops, context)`：`#sequence += 1`，先 source listeners 再 value listeners，`delivery.kind = "update"`。[E: packages/chord/src/services/state.ts:67][E: packages/chord/src/services/state.ts:88]
5. `replace(context, value)` 走 `prepareReplace` + `adopt`，同样跳过空 ops。[E: packages/chord/src/services/state.ts:152]
6. `subscribe` 立刻用 `{ kind: "hydrate", sequence }` 送当前 value；listener throw 在 subscribe 路径会删掉该 listener 再抛出，publish 路径则收集后 `AggregateError`。[E: packages/chord/src/services/state.ts:49][E: packages/chord/src/services/state.ts:54][E: packages/chord/src/services/state.ts:146]

Chord 每次成功 `change()` 只 publish **一个** decoded batch；每个远程 client/state pairing 自己编码，互不共享 path 字典。[E: packages/chord/README.md:39][E: packages/chord/src/services/state-codec.ts:60][E: packages/chord/src/services/state-codec.ts:90]

### Replica hydrate / update

`ReplicatedStateReplica` 冷启动 `value === undefined`。[E: packages/chord/src/services/state.ts:265][E: packages/chord/src/services/state.ts:276]

1. `hydrate(sequence, ops, context)` 要求 `isBase(ops)`，否则 throw `snapshot is not a base operation batch`；然后 `JsonRevisionValidator.validate(applyImmutable(undefined, ops))`。[E: packages/chord/src/services/state.ts:294][E: packages/chord/src/services/state.ts:295]
2. `update` 在未 hydrate 时 throw；`sequence !== #sequence + 1` 则 `clear()` 再 throw `update sequence has a gap`。[E: packages/chord/src/services/state.ts:306][E: packages/chord/src/services/state.ts:309]
3. apply 失败同样 `clear()` 再 throw。[E: packages/chord/src/services/state.ts:316] `clear()` 把 value/sequence 置回 undefined（unready），直到下一次 base hydrate。[E: packages/chord/src/services/state.ts:325] disconnect / replacement 走这条路径，与 README “Replicas become unready on disconnect or replacement until they are rehydrated” 一致。[E: packages/chord/README.md:40]

Listener throw 被吞掉并 `reportError`，不阻断其它 listener。[E: packages/chord/src/services/state.ts:339]

### 远程订阅上的 path codec

`createServiceStateEncoder()` / `createServiceStateDecoder()` 各持一个 `StateCodecRegistry`：key 是 `[instance.key, generation, member]`。[E: packages/chord/src/services/state-codec.ts:60][E: packages/chord/src/services/state-codec.ts:90]

| 事件 | codec 行为 |
|---|---|
| encode/decode snapshot | `reset()`，每个 state member `add()` 新 encoder/decoder |
| `state` update | `get(instance, member)` 续用同一对 |
| `replaced` / `unavailable` | `reset()` |
| `spawned` | 为新 instance 的 state members `add()` |
| `closed` | `removeInstance` |

[E: packages/chord/src/services/state-codec.ts:64][E: packages/chord/src/services/state-codec.ts:73][E: packages/chord/src/services/state-codec.ts:75][E: packages/chord/src/services/state-codec.ts:80][E: packages/chord/src/services/state-codec.ts:83]

Encoder 遇到 `r` 会清空 path id 字典，因为 base 是 recovery point。[E: packages/chord/src/delta/index.ts:544]

`pi-client` 的 `createClientServiceTransport` 为每个 service subscription 建自己的 `ServiceStateDecoder`，解码 wire snapshot/update 后再交给 Chord binding。[E: packages/client/src/client.ts:183][E: packages/client/src/client.ts:448]

### encoder / decoder

1. `encoder()@packages/chord/src/delta/index.ts:523`：path 第一次 inline；第二次先发 `#` 再引用 id。短形式只看**本 batch** 的 `previous`，不跨 batch。`m` 同样可省略 path。[E: packages/chord/src/delta/index.ts:535][E: packages/chord/src/delta/index.ts:554][E: packages/chord/src/delta/index.ts:571]
2. `decoder()@packages/chord/src/delta/index.ts:622` 对每条 `WireOp` 先 `assertValidWireOp`。[E: packages/chord/src/delta/index.ts:630] 短形式在 `previous === undefined` 时 `PathError`；未知 id 也是 `PathError`。[E: packages/chord/src/delta/index.ts:651][E: packages/chord/src/delta/index.ts:657]
3. 一对 encoder/decoder 只服务一条有序流。共享一条 transport 连接不等于共享一个字典。[E: packages/chord/src/delta/index.ts:523][E: packages/chord/src/delta/README.md:179]

## Untrusted op 校验

Ops 可来自 facet、plugin compartment、或回显了模型输出的 tool details，因此全部当 untrusted。[E: packages/chord/src/delta/index.ts:131]

`RESERVED_SEGMENTS` = `__proto__`、`constructor`、`prototype`。[E: packages/chord/src/delta/index.ts:131] `JSON.parse` 本身会把 `__proto__` 做成 own property；危险的是赋值写 path。`apply` 用 `Object.defineProperty` 写，并拒绝 reserved segment。[E: packages/chord/src/delta/index.ts:378][E: packages/chord/src/delta/index.ts:282] Tracker 在 reserved 键上的 mutation 折成最近安全祖先的 `s`，或 root 的 `r`。[E: packages/chord/src/delta/README.md:170]

`assertSafePath`：string segment 不得在 reserved 集；number 必须是 `>= 0` 的 integer。[E: packages/chord/src/delta/index.ts:279] `assertValidOp` 校验 decoded 动词、arity、path 非空（`s`/`d`/`a`/`t`）、`t`/`p` 的整数约束、`m` 的 permutation 必须是 bijection；未知动词 throw，不静默跳过。[E: packages/chord/src/delta/index.ts:152][E: packages/chord/src/delta/index.ts:182][E: packages/chord/src/delta/index.ts:189] `assertValidWireOp` 另允许 id 与短形式；string 不能当 path（否则 `"a".slice(0,-1)` 会变成打 root）。[E: packages/chord/src/delta/index.ts:211][E: packages/chord/src/delta/index.ts:221]

`apply()` 每条 op 先 `assertValidOp`。[E: packages/chord/src/delta/index.ts:334] 写用 `Object.defineProperty`，避免 inherited setter 执行。[E: packages/chord/src/delta/index.ts:378] 走 path 只用 own property。[E: packages/chord/src/delta/index.ts:491] 数组下标只允许现有元素或**恰好** `length`（append one）；再大会 `UnsafePathError`，堵住 `["s", ["xs", 4294967290], 1]` 这种分配式 DoS。[E: packages/chord/src/delta/index.ts:304][E: packages/chord/src/delta/index.ts:305] `p` 的 insert 按 10000 项分块 splice，避免 spread 上限。[E: packages/chord/src/delta/index.ts:354]

Appliers 检查 op 形状和 path 安全，不检查 payload strictness。Chord 的 replicated-state replica 用 `JsonRevisionValidator` 校验每个 resulting revision。[E: packages/chord/src/delta/README.md:175][E: packages/chord/src/services/state.ts:295]

Wire parsers 在 adapter 交出 JSON 之后再跑：`parseServiceSubscriptionSnapshot` 用 `assertValidOp`，`parseWireServiceSubscriptionSnapshot` 用 `assertValidWireOp`。[E: packages/chord/src/services/wire.ts:113]

## JSON-only wire 值

远程方法参数/结果与 replicated state value 的 JSON 约束首先是类型层 `RemoteServiceContract`。[E: packages/chord/src/types.ts:167] 运行时 `defineService` 不扫这个约束。[E: packages/chord/test/services.test.ts:69]

跨越 `RemoteServiceTransport` 的 arguments / results / snapshots / updates / catalogues 必须是 finite strict JSON。[E: packages/chord/README.md:50] `isJsonValue()` 拒绝 `undefined`、非 finite number、typed array、循环、非 `Object.prototype`/`null` prototype。[E: packages/chord/src/json.ts:74]

Chord **不**在 `provider.invoke` 里对业务 args/result 再跑一遍 `isJsonValue`；深度 JSON 检查留给 adapter / serializer。[I]

`JsonValue` 没有 `undefined`。可选 object 字段用缺席（`d`），数组位置要用 `null`。[E: packages/chord/src/types.ts:21][E: packages/chord/src/delta/README.md:117]

## 设计动机与权衡

Canonical tracker 是 prepare-time overlay，不是 mutation log：不保留历史，但从 draft vs base 还原 append / front-truncate / splice / permutation。[E: packages/chord/README.md:42][E: packages/chord/src/delta/tracker.ts:321] Immutability 是 ownership 合同，不是 `Object.freeze`：非法 mutation 静默腐蚀状态。[E: packages/chord/src/delta/README.md:6]

`applyImmutableBatches` 让 backlog 只取最终结果时共享一次 COW scope，避免中间 revision 被持有。[E: packages/chord/src/delta/index.ts:419] Trusted 物化跳过 untrusted 校验，因为 ops 刚从同一 overlay emit。[E: packages/chord/src/delta/apply-immutable-trusted.ts:15]

Producer 改 draft、consumer 看 immutable 完整值：UI / 远程 replica 不必理解 dirty tree。[E: packages/chord/README.md:35] Path 字典 per stream：encoder 在第二次使用才 intern，且 `r` 清空字典，让读者可以从最近一个 base 用新 decoder 恢复。[E: packages/chord/src/delta/index.ts:523][E: packages/chord/src/delta/index.ts:544]

Reserved path 与 `defineProperty` 写入把 prototype pollution 和 inherited accessor 挡在 applier 外；这是安全边界，不是风格偏好。[E: packages/chord/src/delta/index.ts:131][E: packages/chord/src/delta/index.ts:378]

## Gotcha

- 传给 `track()` / `prepareReplace()` / `replicatedState()` / `replace()` 的 root 所有权已转移。调用方再 mutate 是合同违规，进程内 loopback consumer 可能和 provider 共享 container。[E: packages/chord/src/delta/README.md:32][E: packages/chord/README.md:117]
- 不要保留 draft handle 过期。`prepare()` / `abort()` / 竞争 `adopt()` 之后每次使用 throw。写入已从 draft 删除的元素会被忽略。[E: packages/chord/src/delta/README.md:33]
- 不要从 op 形状推断语义。只有 resulting value 是合同。[E: packages/chord/src/delta/README.md:94]
- `apply` adopt `r` 的 value。进程内把同一 `ops` 数组分给多个 mutable replica 会共享可变对象；fan-out 点要 copy batch，或让每个 consumer 自己 decode。[E: packages/chord/src/delta/index.ts:343]
- replica sequence gap 会 `clear()` 再 throw：之后 `value` 是 `undefined`，必须等新的 base snapshot。[E: packages/chord/src/services/state.ts:309][E: packages/chord/src/services/state.ts:325]
- `change()` 空 ops 是 no-op，sequence 不变；不要用“调用了 change”推断一定有 update delivery。[E: packages/chord/src/services/state.ts:145]
- overlay emit 超过 4096 条 op 会 overflow，后续 emit 被丢弃（批次不再精确）。[E: packages/chord/src/delta/diff.ts:5][E: packages/chord/src/delta/diff.ts:10]

## 跨包边界

[subsys.chord.runtime](runtime.md) 拥有 facet host、service token、remote transport。本节点的 `replicatedState` 是可挂到远程 service member 上的 state 原语；host 用 loopback binding 把本地远程服务接到同一套 snapshot/update。[E: packages/chord/src/facets/host.ts:586]

[subsys.client.remote-session-client](../client/remote-session-client.md) 用 `createServiceStateDecoder()` 解码每个订阅的 wire snapshot/update。Chord delta 不依赖 `pi-client`；箭头是 client → chord。[E: packages/client/src/client.ts:183][E: packages/client/src/client.ts:448]

## Sources

- packages/chord/package.json
- packages/chord/README.md
- packages/chord/src/delta/README.md
- packages/chord/src/delta/index.ts
- packages/chord/src/delta/tracker.ts
- packages/chord/src/delta/apply-immutable-trusted.ts
- packages/chord/src/delta/diff.ts
- packages/chord/src/delta/draft.ts
- packages/chord/src/delta/revision-validator.ts
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
