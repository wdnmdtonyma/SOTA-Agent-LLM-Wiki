---
id: ui.feedback-survey
title: UI FeedbackSurvey 组件族
kind: subsystem
tier: T2
source: [components/FeedbackSurvey/FeedbackSurvey.tsx, components/FeedbackSurvey/FeedbackSurveyView.tsx, components/FeedbackSurvey/TranscriptSharePrompt.tsx, components/FeedbackSurvey/useFeedbackSurvey.tsx, components/FeedbackSurvey/useSurveyState.tsx, components/FeedbackSurvey/useDebouncedDigitInput.ts, components/FeedbackSurvey/useMemorySurvey.tsx, components/FeedbackSurvey/usePostCompactSurvey.tsx, components/FeedbackSurvey/submitTranscriptShare.ts]
symbols: [FeedbackSurvey, FeedbackSurveyView, TranscriptSharePrompt, useFeedbackSurvey, useSurveyState, useMemorySurvey, usePostCompactSurvey]
related: [subsys.ui-components, subsys.telemetry-flags, subsys.compaction]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.feedback-survey` 是 session/memory/post-compact feedback survey、thanks、transcript share prompt 的 UI 与 hook 族。[I]

## 能回答的问题
- survey UI 支持哪些数字输入?
- `useSurveyState` 状态机有哪些状态?
- session feedback、memory survey、post compact survey 分别在哪里触发?
- transcript share prompt 如何接入?

## 族干什么
`FeedbackSurvey` 入口渲染 survey 并记录 `tengu_feedback_survey_event`,使用 `useDebouncedDigitInput` 处理数字输入。[E: components/FeedbackSurvey/FeedbackSurvey.tsx:20][E: components/FeedbackSurvey/FeedbackSurvey.tsx:124][E: components/FeedbackSurvey/FeedbackSurvey.tsx:154] `FeedbackSurveyView` 定义 `RESPONSE_INPUTS = ['0','1','2','3']` 并用 `useDebouncedDigitInput`。[E: components/FeedbackSurvey/FeedbackSurveyView.tsx:12][E: components/FeedbackSurvey/FeedbackSurveyView.tsx:22][E: components/FeedbackSurvey/FeedbackSurveyView.tsx:54] `TranscriptSharePrompt` 定义 yes/no/dont_ask_again 三种响应。[E: components/FeedbackSurvey/TranscriptSharePrompt.tsx:6][E: components/FeedbackSurvey/TranscriptSharePrompt.tsx:20]

## 成员清单
- UI components: `FeedbackSurvey`、`FeedbackSurveyView`、`TranscriptSharePrompt`。[E: components/FeedbackSurvey/FeedbackSurvey.tsx:20][E: components/FeedbackSurvey/FeedbackSurveyView.tsx:22][E: components/FeedbackSurvey/TranscriptSharePrompt.tsx:20]
- State/input hooks: `useSurveyState`、`useDebouncedDigitInput`。[E: components/FeedbackSurvey/useSurveyState.tsx:14][E: components/FeedbackSurvey/useDebouncedDigitInput.ts:18]
- Trigger hooks: `useFeedbackSurvey`、`useMemorySurvey`、`usePostCompactSurvey`。[E: components/FeedbackSurvey/useFeedbackSurvey.tsx:43][E: components/FeedbackSurvey/useMemorySurvey.tsx:47][E: components/FeedbackSurvey/usePostCompactSurvey.tsx:32]
- Transcript submission helper: `submitTranscriptShare.ts` exposes `TranscriptShareTrigger`.[E: components/FeedbackSurvey/submitTranscriptShare.ts:23]

## 巨型组件深挖
`useFeedbackSurvey` 是 session survey 的控制核心:它记录 open/select/transcript prompt/transcript select analytics,接 `useSurveyState`,用 memo 判断 model eligibility 和 should open。[E: components/FeedbackSurvey/useFeedbackSurvey.tsx:94][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:108][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:144][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:159][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:191][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:200][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:209]

## 与 hooks/AppState 接线
该族不直接读 `AppState`;它由父级传入 `messages`、`isLoading`、`submitCount` 等数据,内部用 React state/ref/effect、analytics、survey state hook 控制显示。[E: components/FeedbackSurvey/useFeedbackSurvey.tsx:43][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:51][E: components/FeedbackSurvey/useFeedbackSurvey.tsx:284] post-compact survey 额外以 compact boundary 和 gate state 驱动。[E: components/FeedbackSurvey/usePostCompactSurvey.tsx:47][E: components/FeedbackSurvey/usePostCompactSurvey.tsx:93][E: components/FeedbackSurvey/usePostCompactSurvey.tsx:155]

## Sources
- components/FeedbackSurvey/FeedbackSurvey.tsx
- components/FeedbackSurvey/FeedbackSurveyView.tsx
- components/FeedbackSurvey/TranscriptSharePrompt.tsx
- components/FeedbackSurvey/useFeedbackSurvey.tsx
- components/FeedbackSurvey/useSurveyState.tsx
- components/FeedbackSurvey/useDebouncedDigitInput.ts
- components/FeedbackSurvey/useMemorySurvey.tsx
- components/FeedbackSurvey/usePostCompactSurvey.tsx
- components/FeedbackSurvey/submitTranscriptShare.ts

## 相关
- `subsys.compaction` 说明 post-compact survey 的触发上下文。
