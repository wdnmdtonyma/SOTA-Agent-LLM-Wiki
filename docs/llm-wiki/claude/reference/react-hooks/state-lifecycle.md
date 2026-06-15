---
id: rhook.state-lifecycle
title: React hooks catalog: state-lifecycle
kind: reference
tier: T3
source: [hooks/useAfterFirstRender.ts, hooks/useAwaySummary.ts, hooks/useSkillImprovementSurvey.ts, hooks/useTimeout.ts]
symbols: [useAfterFirstRender, useAwaySummary, useSkillImprovementSurvey, useTimeout]
related: [subsys.session-state, subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `rhook.state-lifecycle` catalog 收录首渲染、away summary、skill improvement survey 和 timeout lifecycle hooks；这个 category 边界来自 lifecycle/timer/state side-effect 命名的人工归纳 [I]。

## 能回答的问题

- 哪些 hooks 只负责 lifecycle timing 或 after-first-render side effect?
- away summary 和 skill improvement survey 的 hook 入口在哪里?
- `useTimeout` 的签名与返回值是什么?
- state lifecycle 相关 hooks 覆盖哪些 use* 文件?

## Hook catalog

| hook | 文件 | 一句话用途 | 关键签名 |
|---|---|---|---|
| `useAfterFirstRender` | `hooks/useAfterFirstRender.ts` | 在第一次 render 之后执行 effect [I]。 | `useAfterFirstRender(): void` [E: hooks/useAfterFirstRender.ts:4] |
| `useAwaySummary` | `hooks/useAwaySummary.ts` | 管理 terminal away summary 的生成与消息追加 [I]。 | `useAwaySummary(messages, setMessages, isLoading): void` [E: hooks/useAwaySummary.ts:32] |
| `useSkillImprovementSurvey` | `hooks/useSkillImprovementSurvey.ts` | 管理 skill improvement survey 消息与返回状态 [I]。 | `useSkillImprovementSurvey(setMessages)` [E: hooks/useSkillImprovementSurvey.ts:21] |
| `useTimeout` | `hooks/useTimeout.ts` | 在指定 delay 后返回 elapsed boolean 状态 [I]。 | `useTimeout(delay, resetTrigger): boolean` [E: hooks/useTimeout.ts:3] |

## Sources

- `hooks/useAfterFirstRender.ts`
- `hooks/useAwaySummary.ts`
- `hooks/useSkillImprovementSurvey.ts`
- `hooks/useTimeout.ts`

## 相关

- [会话持久化与状态](../../subsystems/session-state.md)
- [UI 组件族](../../subsystems/ui-components.md)
