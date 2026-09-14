---
id: subsys.ai.event-stream
title: 流事件归一
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/utils/event-stream.ts
symbols:
  - EventStream
  - AssistantMessageEventStream
  - createAssistantMessageEventStream
related:
  - spine.provider-stream
  - ref.ai.core-types
evidence: explicit
status: verified
updated: 71dca871bc
---

> `subsys.ai.event-stream` 描述 `EventStream` 如何把 producer push 的事件变成 `AsyncIterable`，以及 `AssistantMessageEventStream` 如何把 assistant `done` / `error` 终端事件收敛成最终 `AssistantMessage`。未消费事件与等待中的 iterator resolver 都走双栈 `FifoQueue`，不再对数组 `shift()`。[E: packages/ai/src/utils/event-stream.ts:3][E: packages/ai/src/utils/event-stream.ts:11][E: packages/ai/src/utils/event-stream.ts:12][E: packages/ai/src/utils/event-stream.ts:15][E: packages/ai/src/utils/event-stream.ts:21][E: packages/ai/src/utils/event-stream.ts:27][E: packages/ai/src/utils/event-stream.ts:28]

## 能回答的问题

- `EventStream.push(event)` 在有等待 consumer 和没有等待 consumer 时分别做什么?
- `EventStream.end(result?)` 如何关闭 async iterator,以及什么时候会 resolve `.result()`?
- `AssistantMessageEventStream` 为什么把 `done` 和 `error` 都视为终端事件?
- provider wire stream 和 `EventStream` 的职责边界在哪里?
- extension 侧如何构造一个 `AssistantMessageEventStream`?

## 职责边界

`EventStream<T, R = T>` 是 `pi-ai` 的通用异步事件容器:它持有事件队列、等待中的 iterator resolver、关闭标记、最终结果 promise,以及构造函数注入的 `isComplete` / `extractResult` 两个终端判定函数。[E: packages/ai/src/utils/event-stream.ts:26][E: packages/ai/src/utils/event-stream.ts:27][E: packages/ai/src/utils/event-stream.ts:28][E: packages/ai/src/utils/event-stream.ts:29][E: packages/ai/src/utils/event-stream.ts:30][E: packages/ai/src/utils/event-stream.ts:32][E: packages/ai/src/utils/event-stream.ts:33][E: packages/ai/src/utils/event-stream.ts:35][E: packages/ai/src/utils/event-stream.ts:36][E: packages/ai/src/utils/event-stream.ts:37]

`AssistantMessageEventStream` 是 `EventStream<AssistantMessageEvent, AssistantMessage>` 的 specialization:它把 `event.type === "done"` 或 `event.type === "error"` 判为 complete event,并分别从 `event.message` 或 `event.error` 提取 `.result()` 的最终 assistant message。[E: packages/ai/src/utils/event-stream.ts:91][E: packages/ai/src/utils/event-stream.ts:94][E: packages/ai/src/utils/event-stream.ts:96][E: packages/ai/src/utils/event-stream.ts:97][E: packages/ai/src/utils/event-stream.ts:99]

`EventStream` 不解析 provider wire protocol,不决定哪些 normalized assistant event 应该出现,也不做 auth、model dispatch 或 request payload 转换;这些属于 `spine.provider-stream` 的 provider streaming path,本节点只描述 normalized event 被发送、订阅、关闭和收敛 final result 后的容器语义。[I]

## 关键文件

- `packages/ai/src/utils/event-stream.ts` 定义私有 `FifoQueue`、`EventStream`、`AssistantMessageEventStream` 和 `createAssistantMessageEventStream`。[E: packages/ai/src/utils/event-stream.ts:3][E: packages/ai/src/utils/event-stream.ts:26][E: packages/ai/src/utils/event-stream.ts:91][E: packages/ai/src/utils/event-stream.ts:108]

## 数据模型

`FifoQueue<T>` 用 `incoming` / `outgoing` 两个栈实现 FIFO: `enqueue` 只 `push` 到 `incoming`;`dequeue` 在 `outgoing` 空时把 `incoming` 逐个 `pop` 翻到 `outgoing`,再 `pop` outgoing。`length` 是两栈长度之和。文件里没有 `Array.shift`。[E: packages/ai/src/utils/event-stream.ts:3][E: packages/ai/src/utils/event-stream.ts:4][E: packages/ai/src/utils/event-stream.ts:5][E: packages/ai/src/utils/event-stream.ts:7][E: packages/ai/src/utils/event-stream.ts:8][E: packages/ai/src/utils/event-stream.ts:11][E: packages/ai/src/utils/event-stream.ts:12][E: packages/ai/src/utils/event-stream.ts:15][E: packages/ai/src/utils/event-stream.ts:18][E: packages/ai/src/utils/event-stream.ts:21]

`EventStream` 的 `queue` 与 `waiting` 都是 `FifoQueue`:前者缓存尚未被 consumer 拉取的事件,后者保存正在等待下一条 iterator result 的 resolver;`done` 阻止后续 push 并让 iterator 在队列清空后结束;`finalResultPromise` 是 `.result()` 返回给 caller 的最终结果 promise。[E: packages/ai/src/utils/event-stream.ts:27][E: packages/ai/src/utils/event-stream.ts:28][E: packages/ai/src/utils/event-stream.ts:29][E: packages/ai/src/utils/event-stream.ts:30][E: packages/ai/src/utils/event-stream.ts:43][E: packages/ai/src/utils/event-stream.ts:44][E: packages/ai/src/utils/event-stream.ts:56][E: packages/ai/src/utils/event-stream.ts:74][E: packages/ai/src/utils/event-stream.ts:76][E: packages/ai/src/utils/event-stream.ts:87]

构造函数要求 caller 传入 `isComplete(event)` 和 `extractResult(event)`:前者决定哪些事件会关闭 stream,后者把终端事件转换成最终结果 `R`。[E: packages/ai/src/utils/event-stream.ts:35][E: packages/ai/src/utils/event-stream.ts:36][E: packages/ai/src/utils/event-stream.ts:37]

`createAssistantMessageEventStream()` 是 factory,它只返回一个新的 `AssistantMessageEventStream`,不额外包裹或修改事件语义。[E: packages/ai/src/utils/event-stream.ts:108][E: packages/ai/src/utils/event-stream.ts:109]

## 控制流

1. producer 调用 `push(event)` 后,如果 stream 已经 `done`,该事件会被静默忽略。[E: packages/ai/src/utils/event-stream.ts:43][E: packages/ai/src/utils/event-stream.ts:44]
2. `push(event)` 遇到 complete event 时先设置 `done = true`,再用 `extractResult(event)` resolve final result promise;这个 terminal event 随后仍会被交给等待中的 consumer 或进入 queue。[E: packages/ai/src/utils/event-stream.ts:46][E: packages/ai/src/utils/event-stream.ts:47][E: packages/ai/src/utils/event-stream.ts:48][E: packages/ai/src/utils/event-stream.ts:52][E: packages/ai/src/utils/event-stream.ts:54][E: packages/ai/src/utils/event-stream.ts:56]
3. `push(event)` 先 `waiting.dequeue()`。有 waiter 时直接 resolve 为 `{ value: event, done: false }`;没有 waiter 时 `queue.enqueue(event)`。因此等待者按 FIFO 被唤醒,事件也按 FIFO 入队。[E: packages/ai/src/utils/event-stream.ts:52][E: packages/ai/src/utils/event-stream.ts:53][E: packages/ai/src/utils/event-stream.ts:54][E: packages/ai/src/utils/event-stream.ts:56]
4. async iterator 优先 `queue.dequeue()`,然后在 `done` 时 return;既无 queued event 又未 done 时,iterator 把 resolver `waiting.enqueue`,等待下一次 push 或 end 唤醒。[E: packages/ai/src/utils/event-stream.ts:73][E: packages/ai/src/utils/event-stream.ts:74][E: packages/ai/src/utils/event-stream.ts:75][E: packages/ai/src/utils/event-stream.ts:76][E: packages/ai/src/utils/event-stream.ts:79][E: packages/ai/src/utils/event-stream.ts:80][E: packages/ai/src/utils/event-stream.ts:81]
5. `end(result?)` 直接设置 `done = true`;只有传入非 `undefined` result 时才 resolve final result promise,随后 `while (this.waiting.length > 0)` 把所有 waiter `dequeue` 并 resolve `{ done: true }`。[E: packages/ai/src/utils/event-stream.ts:60][E: packages/ai/src/utils/event-stream.ts:61][E: packages/ai/src/utils/event-stream.ts:62][E: packages/ai/src/utils/event-stream.ts:63][E: packages/ai/src/utils/event-stream.ts:66][E: packages/ai/src/utils/event-stream.ts:67][E: packages/ai/src/utils/event-stream.ts:68]
6. `.result()` 返回 `finalResultPromise`;对 `AssistantMessageEventStream` 来说,正常 `done` 和错误 `error` 都通过 terminal event resolve 为一个 `AssistantMessage`;`EventStream` 的 promise 构造和完成路径只保存并调用 resolve callback,没有定义 reject callback。[E: packages/ai/src/utils/event-stream.ts:38][E: packages/ai/src/utils/event-stream.ts:39][E: packages/ai/src/utils/event-stream.ts:48][E: packages/ai/src/utils/event-stream.ts:86][E: packages/ai/src/utils/event-stream.ts:87][E: packages/ai/src/utils/event-stream.ts:94][E: packages/ai/src/utils/event-stream.ts:96][E: packages/ai/src/utils/event-stream.ts:97][E: packages/ai/src/utils/event-stream.ts:99]

## 设计动机与权衡

`FifoQueue` 把 drain 从数组头 `shift` 改成两栈翻转:`enqueue`/`dequeue` 摊还 O(1),避免长 stream 反复 `shift` 的 O(n²)。`EventStream` 把 producer 和 consumer 解耦:producer 可以在 consumer 尚未开始迭代时先 push event,这些 event 会保存在 `queue`;consumer 也可以先等待,等待者会在下一次 push 时被唤醒。[E: packages/ai/src/utils/event-stream.ts:11][E: packages/ai/src/utils/event-stream.ts:12][E: packages/ai/src/utils/event-stream.ts:15][E: packages/ai/src/utils/event-stream.ts:21][E: packages/ai/src/utils/event-stream.ts:52][E: packages/ai/src/utils/event-stream.ts:56][E: packages/ai/src/utils/event-stream.ts:79]

`push` 遇到 terminal event 会同时完成 final result 和保留该 terminal event 给 iterator 消费,因此 stream consumer 可以用 `for await` 看见 `done` / `error`,也可以用 `.result()` 拿最终 assistant message。[E: packages/ai/src/utils/event-stream.ts:46][E: packages/ai/src/utils/event-stream.ts:48][E: packages/ai/src/utils/event-stream.ts:52][E: packages/ai/src/utils/event-stream.ts:54][E: packages/ai/src/utils/event-stream.ts:56][E: packages/ai/src/utils/event-stream.ts:86]

## gotcha

`end()` 如果没有传入 result,且此前也没有通过 complete event resolve final result promise,`.result()` 会保持未完成;provider-facing assistant streams 通常应先 push `done` / `error`,或在 `end(result)` 中显式给出 final result。[E: packages/ai/src/utils/event-stream.ts:38][E: packages/ai/src/utils/event-stream.ts:39][E: packages/ai/src/utils/event-stream.ts:46][E: packages/ai/src/utils/event-stream.ts:48][E: packages/ai/src/utils/event-stream.ts:60][E: packages/ai/src/utils/event-stream.ts:62][E: packages/ai/src/utils/event-stream.ts:63][E: packages/ai/src/utils/event-stream.ts:86][E: packages/ai/src/utils/event-stream.ts:87][I]

`push` 在 `done` 后不会抛错,而是直接 return;如果 producer 在 terminal event 或 `end()` 之后继续发送事件,这些事件不会进入 iterator 或 final result path。[E: packages/ai/src/utils/event-stream.ts:43][E: packages/ai/src/utils/event-stream.ts:44]

`AssistantMessageEventStream` 的 complete 判定只接受 `done` 和 `error`,对应的 `extractResult` 分支也只从这两类事件取值;`extractResult` 末尾仍保留 `"Unexpected event type for final result"` throw guard。[E: packages/ai/src/utils/event-stream.ts:94][E: packages/ai/src/utils/event-stream.ts:96][E: packages/ai/src/utils/event-stream.ts:97][E: packages/ai/src/utils/event-stream.ts:99][E: packages/ai/src/utils/event-stream.ts:101]

`FifoQueue` 不是导出符号;外部只看见 `EventStream` / `AssistantMessageEventStream` / `createAssistantMessageEventStream`。[E: packages/ai/src/utils/event-stream.ts:3][E: packages/ai/src/utils/event-stream.ts:26][E: packages/ai/src/utils/event-stream.ts:91][E: packages/ai/src/utils/event-stream.ts:108][I]

## 跨包边界

- `spine.provider-stream` 描述 `Models.stream` / `ProviderStreams` / wire API 如何生产 normalized assistant events;`subsys.ai.event-stream` 只覆盖这些 events 进入 `AssistantMessageEventStream` 后的 queue、iterator、terminal result 语义。[I]
- `ref.ai.core-types` 应覆盖 `AssistantMessage`、`AssistantMessageEvent`、`StopReason` 等字段级类型;`subsys.ai.event-stream` 只解释这些类型在 stream container 中的完成和错误收敛方式。[I]

## Sources

- packages/ai/src/utils/event-stream.ts

## 相关

- [spine.provider-stream](../../spine/provider-stream.md) - provider 流式调用从统一入口到 wire API 再到 normalized assistant event 的端到端路径。
- [ref.ai.core-types](../../reference/core-types.md) - `AssistantMessage`、`AssistantMessageEvent`、`Usage` 等核心类型清单。
