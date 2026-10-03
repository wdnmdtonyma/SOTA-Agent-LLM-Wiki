---
id: ref.agent.thinking-levels
title: 推理级别目录
kind: reference
tier: T3
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/agent.ts
symbols:
  - ThinkingLevel
related:
  - subsys.agent-core.turn-control
  - spine.agent-loop
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.agent.thinking-levels` 是 agent-core `ThinkingLevel` literal union 的逐实例目录:覆盖 `"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` 七个值,以及这些值如何进入 `AgentState`、`prepareRequest` / `prepareNextTurn` 更新,并被 `streamAssistantResponse` 写到最终 assistant message 上。

## 能回答的问题

- agent-core `ThinkingLevel` 当前有哪些 literal 值?
- `"off"` 与其它 reasoning effort 值在 loop 的 `config.reasoning` 映射上有什么不同?
- assistant message 上的 `thinkingLevel` 是谁写入的?
- `ThinkingLevel` 被哪些 agent-core public 类型字段持有或更新?
- `AgentLoopConfig`、`AgentLoopTurnUpdate`、`AgentState` 各自在哪个边界接触 thinking-level options?
- 哪些 provider/model 支持细节不由本节点 source 单独证明?

## ThinkingLevel 值

| 值 | 类型实例 | agent-core 字段边界 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `"off"` | `ThinkingLevel` union member;表示关闭 requested reasoning。[E: packages/agent/src/types.ts:349] | `AgentState.thinkingLevel` 默认可为 `"off"`;`AgentLoopTurnUpdate.thinkingLevel?` 也可把下一轮更新为 `"off"`。[E: packages/agent/src/types.ts:393] [E: packages/agent/src/types.ts:169] [E: packages/agent/src/agent.ts:93] | `"off"` 在 `Agent.createLoopConfig` / `prepareNextTurn` / `prepareRequest` 中映射成 `config.reasoning = undefined`,再在 assistant message 上被写回 `"off"`。[E: packages/agent/src/agent.ts:471] [E: packages/agent/src/agent-loop.ts:196] [E: packages/agent/src/agent-loop.ts:235] [E: packages/agent/src/agent-loop.ts:409] | `packages/agent/src/types.ts:349` |
| `"minimal"` | `ThinkingLevel` union member;最小 reasoning effort 请求值。[E: packages/agent/src/types.ts:349] | 可作为 `AgentState.thinkingLevel`,也可作为 `prepareNextTurn()` / `prepareRequest()` 返回的 `thinkingLevel`。[E: packages/agent/src/types.ts:393] [E: packages/agent/src/types.ts:169] [E: packages/agent/src/types.ts:176] | 非 `"off"` 值原样写入 `config.reasoning`,并原样盖到最终 assistant message。[E: packages/agent/src/agent.ts:471] [E: packages/agent/src/agent-loop.ts:198] [E: packages/agent/src/agent-loop.ts:237] [E: packages/agent/src/agent-loop.ts:409] 具体模型是否支持该值由 `@earendil-works/pi-ai` metadata 决定。[I] | `packages/agent/src/types.ts:349` |
| `"low"` | `ThinkingLevel` union member;低 reasoning effort 请求值。[E: packages/agent/src/types.ts:349] | 可保存在 `AgentState.thinkingLevel`,并可经 `AgentLoopTurnUpdate.thinkingLevel?` 影响下一轮 provider request。[E: packages/agent/src/types.ts:393] [E: packages/agent/src/types.ts:161] [E: packages/agent/src/types.ts:169] | 与 `"minimal"` 相同:非 `"off"` 则成为 `config.reasoning`。provider wire value / token budget 不在本 source。[I] | `packages/agent/src/types.ts:349` |
| `"medium"` | `ThinkingLevel` union member;中等 reasoning effort 请求值。[E: packages/agent/src/types.ts:349] | public state 层通过 `AgentState.thinkingLevel` 暴露当前/未来 turn 的 requested reasoning level。[E: packages/agent/src/types.ts:382] [E: packages/agent/src/types.ts:393] | 类型允许值不是每个 `Model<any>` 都支持该值的保证。[I] | `packages/agent/src/types.ts:349` |
| `"high"` | `ThinkingLevel` union member;高 reasoning effort 请求值。[E: packages/agent/src/types.ts:349] | `AgentState.thinkingLevel` 与 `AgentLoopTurnUpdate.thinkingLevel?` 在类型层都允许 `"high"`。[E: packages/agent/src/types.ts:393] [E: packages/agent/src/types.ts:169] | `AgentLoopConfig` 继承 imported `SimpleStreamOptions`;`reasoning` 字段类型来自 `@earendil-works/pi-ai`,不是 `types.ts` 自己声明。[E: packages/agent/src/types.ts:10] [E: packages/agent/src/types.ts:193] [I] | `packages/agent/src/types.ts:349` |
| `"xhigh"` | `ThinkingLevel` union member;extra-high reasoning effort 请求值。[E: packages/agent/src/types.ts:349] | `AgentState.thinkingLevel` 与 `AgentLoopTurnUpdate.thinkingLevel?` 在类型层都允许 `"xhigh"`。[E: packages/agent/src/types.ts:393] [E: packages/agent/src/types.ts:169] | `"xhigh"` 是否只对部分模型族有效、是否需要 model-specific 映射或 clamp,不由 union 自身强制。[I] | `packages/agent/src/types.ts:349` |
| `"max"` | `ThinkingLevel` union member;最高 reasoning effort 请求值。[E: packages/agent/src/types.ts:349] | `AgentState.thinkingLevel` 与 `AgentLoopTurnUpdate.thinkingLevel?` 在类型层都允许 `"max"`。[E: packages/agent/src/types.ts:393] [E: packages/agent/src/types.ts:169] | provider/model 是否原生支持 `"max"`、是否映射或 clamp,由 model metadata/provider adapter 决定。[I] | `packages/agent/src/types.ts:349` |

## 字段与使用边界

`ThinkingLevel` 在 `packages/agent/src/types.ts` 中的本地定义是一个 exported literal union。[E: packages/agent/src/types.ts:349] 在本节点的 source 范围内,没有 numeric order、mapping table 或 runtime clamp 函数;因此本节点把七个 literal 值当作完整实例集合,但不把 `"minimal"` 到 `"max"` 解释成可比较的强度枚举算法。[I]

`AgentLoopTurnUpdate.thinkingLevel?` 是 turn update payload 的可选字段;`prepareNextTurn()` 可以返回 `AgentLoopTurnUpdate | undefined`,所以 thinking level 更新是下一轮 turn state 的一部分,不是每次 turn 必填的 config 字段。[E: packages/agent/src/types.ts:161] [E: packages/agent/src/types.ts:169] [E: packages/agent/src/types.ts:278]

`PrepareRequestContext.thinkingLevel` 是即将发出的请求级,由 loop 填成 `config.reasoning ?? "off"`。[E: packages/agent/src/types.ts:176] [E: packages/agent/src/agent-loop.ts:223] `AgentRequestUpdate` 可以替换它,但不能追加 messages。[E: packages/agent/src/types.ts:180]

`AgentLoopConfig extends SimpleStreamOptions` 只能证明 agent loop config 继承 imported simple stream options shape;`packages/agent/src/types.ts` 不重新声明 `SimpleStreamOptions.reasoning` 字段,所以 `SimpleStreamOptions` 的 field-level 目录归 `ref.ai.core-types`。[E: packages/agent/src/types.ts:10] [E: packages/agent/src/types.ts:193] [I]

`AgentState.thinkingLevel` 是 public agent state 的 requested reasoning level 字段,与 `AgentState.model` 同处 public state。`Agent` 构造默认 `"off"`。[E: packages/agent/src/types.ts:382] [E: packages/agent/src/types.ts:391] [E: packages/agent/src/types.ts:393] [E: packages/agent/src/agent.ts:93]

## assistant message 上的 thinkingLevel

`streamAssistantResponse` 在读取 `response.result()` 时执行 `Object.assign(..., { thinkingLevel: config.reasoning ?? "off" })`,把本轮请求级盖到最终 assistant message,不依赖具体 `streamFn` 是否自己带回该字段。[E: packages/agent/src/agent-loop.ts:409] 因此 transcript 里每条完成的 assistant message 都带有当时生效的 `ThinkingLevel`,关闭态记录为 `"off"` 而不是缺字段。

`prepareNextTurn` / `prepareRequest` 返回 `thinkingLevel: "off"` 会把后续 `config.reasoning` 设成 `undefined`;其它值原样成为 `config.reasoning`。下一轮 stamp 再用 `?? "off"` 写回 message。[E: packages/agent/src/agent-loop.ts:193] [E: packages/agent/src/agent-loop.ts:196] [E: packages/agent/src/agent-loop.ts:197] [E: packages/agent/src/agent-loop.ts:232] [E: packages/agent/src/agent-loop.ts:235] [E: packages/agent/src/agent-loop.ts:237] [E: packages/agent/src/agent-loop.ts:409]

`Agent.createLoopConfig` 的初始映射与此一致:`state.thinkingLevel === "off"` 编成 `reasoning: undefined`。[E: packages/agent/src/agent.ts:471]

这个字段是 **requested** thinking level,不是 proxy 可选复制的 `providerThinkingLevel`。后者由 `streamProxy` 的 `done`/`error` 事件写入 partial,类型是 `string`,不属于本 union。[I]

## Sources

- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/agent.ts

## 相关

- [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md): agent loop 如何把 turn update、`prepareRequest` 和下一轮 provider request 串起来,并 stamp assistant message。
- [spine.agent-loop](../spine/agent-loop.md): 一次 turn 里 `thinkingLevel` 写入点的端到端位置。
- [ref.ai.core-types](core-types.md): `@earendil-works/pi-ai` 的 `SimpleStreamOptions`、model thinking metadata 和 provider-facing reasoning 类型边界。
