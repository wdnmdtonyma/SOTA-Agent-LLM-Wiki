---
id: ui.skills
title: UI Skills 组件族
kind: subsystem
tier: T2
source: [components/skills/SkillsMenu.tsx, components/SkillImprovementSurvey.tsx]
symbols: [SkillsMenu, SkillImprovementSurvey]
related: [subsys.ui-components, subsys.skills]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.skills` 是 skills 浏览菜单与 skill improvement survey 的 UI 族。[I]

## 能回答的问题
- `SkillsMenu` 如何组织 skill commands?
- skill source title/subtitle 在哪里生成?
- `SkillImprovementSurvey` 怎样处理输入?
- skills UI 与 skills subsystem 的边界在哪里?

## 族干什么
`SkillsMenu` 定义 `SkillCommand` 为 `CommandBase & PromptCommand`,并把 source 建模为 settings/plugin/mcp 来源。[E: components/skills/SkillsMenu.tsx:16][E: components/skills/SkillsMenu.tsx:17] `SkillsMenu` 入口是 `SkillsMenu` 组件,内部过滤 skill commands、按来源分组并排序。[E: components/skills/SkillsMenu.tsx:47][E: components/skills/SkillsMenu.tsx:55][E: components/skills/SkillsMenu.tsx:64][E: components/skills/SkillsMenu.tsx:73][E: components/skills/SkillsMenu.tsx:80]

## 成员清单
- `SkillsMenu` 是 skill catalog/menu UI。[E: components/skills/SkillsMenu.tsx:47]
- `getSourceTitle` 与 `getSourceSubtitle` 为 skill source 分组提供展示文案。[E: components/skills/SkillsMenu.tsx:24][E: components/skills/SkillsMenu.tsx:33]
- `SkillImprovementSurvey` 是 skill feedback survey 入口。[E: components/SkillImprovementSurvey.tsx:17]

## 巨型组件深挖
`SkillsMenu` 的核心复杂度在 source 分组与 command 列表排序:源码将 `SkillSource` 扩展到 settings、plugin、mcp,再通过 title/subtitle helper 呈现并对每组 commands 排序。[E: components/skills/SkillsMenu.tsx:17][E: components/skills/SkillsMenu.tsx:24][E: components/skills/SkillsMenu.tsx:33][E: components/skills/SkillsMenu.tsx:80] `SkillImprovementSurvey` 内部还有 `SkillImprovementSurveyView`,并用 valid input `'0' | '1'` 限制快捷选择。[E: components/SkillImprovementSurvey.tsx:56][E: components/SkillImprovementSurvey.tsx:60]

## 与 hooks/AppState 接线
`SkillsMenu` 本身不直接读 `AppState`;它接收上游提供的 skill commands 并用 React memo/render 组织 UI。[I] `SkillImprovementSurvey` 用 React effect/ref 处理输入初始值与提交节奏。[E: components/SkillImprovementSurvey.tsx:69][E: components/SkillImprovementSurvey.tsx:92]

## Sources
- components/skills/SkillsMenu.tsx
- components/SkillImprovementSurvey.tsx

## 相关
- `subsys.skills` 说明 skill discovery、loading 与 command creation。
