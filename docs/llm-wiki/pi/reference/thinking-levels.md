---
id: ref.agent.thinking-levels
title: 推理级别目录
kind: reference
tier: T3
pkg: agent
batch: agent-core
source:
  - packages/agent/src/types.ts
symbols:
  - ThinkingLevel
related:
  - subsys.agent-core.turn-control
evidence: explicit
status: verified
updated: 8c943640
---

> `ref.agent.thinking-levels` 是 agent-core `ThinkingLevel` literal union 的逐实例目录:覆盖 `"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"` 六个值,以及这些值在 `packages/agent/src/types.ts` 内暴露到 turn update 和 public state 的字段边界;`AgentLoopConfig` 在本文件中只证明继承 `SimpleStreamOptions` 的 options shape。

## 能回答的问题

- agent-core `ThinkingLevel` 当前有哪些 literal 值?
- `"off"` 与其它 reasoning effort 值在类型层有什么不同?
- `ThinkingLevel` 被哪些 agent-core public 类型字段持有或更新?
- `AgentLoopConfig`、`AgentLoopTurnUpdate`、`AgentState` 各自在哪个边界接触或间接承载 thinking-level options?
- 哪些 provider/model 支持细节不由 `packages/agent/src/types.ts` 单独证明?

## ThinkingLevel 值

| 值 | 类型实例 | agent-core 字段边界 | 使用边界 | 源码证据 |
| --- | --- | --- | --- | --- |
| `"off"` | `ThinkingLevel` union member;表示 agent-core 可以保存关闭态。[E: packages/agent/src/types.ts:289] | `AgentState.thinkingLevel` 可持有 `"off"`;`AgentLoopTurnUpdate.thinkingLevel?` 也可把下一轮更新为 `"off"`。[E: packages/agent/src/types.ts:328][E: packages/agent/src/types.ts:135] | `"off"` 是否会在 provider request 中被省略或转成 provider-specific disabled state,不由 `packages/agent/src/types.ts` 单独证明;该运行时转换属于 `subsys.agent-core.turn-control` / provider simple-stream adapter 边界。[I] | `packages/agent/src/types.ts:289` |
| `"minimal"` | `ThinkingLevel` union member;表示最小 reasoning effort 请求值。[E: packages/agent/src/types.ts:289] | 可作为 public `AgentState.thinkingLevel` 的值,也可作为 `prepareNextTurn()` 返回的 `AgentLoopTurnUpdate.thinkingLevel`。[E: packages/agent/src/types.ts:328][E: packages/agent/src/types.ts:220][E: packages/agent/src/types.ts:222][E: packages/agent/src/types.ts:135] | `minimal` 是否被具体模型支持、降级或映射,不由 agent-core 类型文件单独证明;模型 thinking-level metadata 在 `@earendil-works/pi-ai` 层。[I] | `packages/agent/src/types.ts:289` |
| `"low"` | `ThinkingLevel` union member;表示低 reasoning effort 请求值。[E: packages/agent/src/types.ts:289] | 可保存在 `AgentState.thinkingLevel`,并可经 `AgentLoopTurnUpdate.thinkingLevel?` 影响下一轮 provider request 的请求状态。[E: packages/agent/src/types.ts:328][E: packages/agent/src/types.ts:129][E: packages/agent/src/types.ts:135] | `low` 的 provider wire value、token budget 或兼容字段不是本 source 的字段;这些实现边界属于 ai provider adapter。[I] | `packages/agent/src/types.ts:289` |
| `"medium"` | `ThinkingLevel` union member;表示中等 reasoning effort 请求值。[E: packages/agent/src/types.ts:289] | public state 层通过 `AgentState.thinkingLevel` 暴露当前/未来 turn 的 requested reasoning level。[E: packages/agent/src/types.ts:322][E: packages/agent/src/types.ts:328] | `medium` 是类型允许值,不是保证每个 `Model<any>` 都支持该值;模型支持性需要结合 model metadata 或 runtime adapter 判断。[I] | `packages/agent/src/types.ts:289` |
| `"high"` | `ThinkingLevel` union member;表示高 reasoning effort 请求值。[E: packages/agent/src/types.ts:289] | `AgentState.thinkingLevel` 与 `AgentLoopTurnUpdate.thinkingLevel?` 在类型层都允许 `"high"`。[E: packages/agent/src/types.ts:328][E: packages/agent/src/types.ts:135] | `AgentLoopConfig` 只在本文件里 import 并继承 `SimpleStreamOptions`;`SimpleStreamOptions.reasoning` 的具体字段类型来自 `@earendil-works/pi-ai`,不是 `packages/agent/src/types.ts` 自己声明。[E: packages/agent/src/types.ts:10][E: packages/agent/src/types.ts:140][I] | `packages/agent/src/types.ts:289` |
| `"xhigh"` | `ThinkingLevel` union member;表示 extra-high reasoning effort 请求值。[E: packages/agent/src/types.ts:289] | `AgentState.thinkingLevel` 与 `AgentLoopTurnUpdate.thinkingLevel?` 在类型层都允许 `"xhigh"`。[E: packages/agent/src/types.ts:328][E: packages/agent/src/types.ts:135] | `"xhigh"` 是否只对部分模型族有效、是否需要 model-specific 映射或是否被 clamp,都不由 `ThinkingLevel` union 自身强制;这些属于 model metadata/provider adapter 行为。[I] | `packages/agent/src/types.ts:289` |

## 字段与使用边界

`ThinkingLevel` 在 `packages/agent/src/types.ts` 中的本地定义是一个 exported literal union。[E: packages/agent/src/types.ts:289] 在本节点的 source 范围内,没有可直接证明 numeric order、默认值、mapping table 或 runtime clamp 函数的代码;因此本节点把六个 literal 值当作完整实例集合,但不把 `"minimal"` 到 `"xhigh"` 解释成可比较的强度枚举算法。[I]

`AgentLoopTurnUpdate.thinkingLevel?` 是 turn update payload 的可选字段;`prepareNextTurn()` 可以返回 `AgentLoopTurnUpdate | undefined`,所以 thinking level 更新是下一轮 turn state 的一部分,不是每次 turn 必填的 config 字段。[E: packages/agent/src/types.ts:129][E: packages/agent/src/types.ts:135][E: packages/agent/src/types.ts:220][E: packages/agent/src/types.ts:222]

`AgentLoopConfig extends SimpleStreamOptions` 只能证明 agent loop config 继承 imported simple stream options shape;`packages/agent/src/types.ts` 不重新声明 `SimpleStreamOptions.reasoning` 字段,所以 `SimpleStreamOptions` 的 field-level 目录归 `ref.ai.core-types`。[E: packages/agent/src/types.ts:10][E: packages/agent/src/types.ts:140][I]

`AgentState.thinkingLevel` 是 public agent state 的 requested reasoning level 字段,与 `AgentState.model` 同处 public state;具体模型是否支持当前 requested level,不是 `AgentState` 字段本身能验证的约束。[E: packages/agent/src/types.ts:322][E: packages/agent/src/types.ts:326][E: packages/agent/src/types.ts:328][I]

## Sources

- `packages/agent/src/types.ts`

## 相关

- [subsys.agent-core.turn-control](../subsystems/agent-core/turn-control.md) - agent loop 如何把 turn update、stop hooks、queued messages 和下一轮 provider request 串起来。
- [ref.ai.core-types](core-types.md) - `@earendil-works/pi-ai` 的 `SimpleStreamOptions`、model thinking metadata 和 provider-facing reasoning 类型边界。
