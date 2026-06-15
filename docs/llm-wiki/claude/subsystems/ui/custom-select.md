---
id: ui.custom-select
title: UI CustomSelect 组件族
kind: subsystem
tier: T2
source: [components/CustomSelect/select.tsx, components/CustomSelect/SelectMulti.tsx, components/CustomSelect/select-input-option.tsx, components/CustomSelect/use-select-state.ts, components/CustomSelect/use-select-input.ts, components/CustomSelect/use-select-navigation.ts, components/CustomSelect/use-multi-select-state.ts, components/CustomSelect/option-map.ts, components/CustomSelect/select-option.tsx]
symbols: [Select, SelectMulti, SelectInputOption, SelectOption, useSelectState, useSelectInput, useSelectNavigation, useMultiSelectState]
related: [subsys.ui-components, subsys.ink-runtime]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.custom-select` 是 terminal select / multi-select 的 keyboard navigation、overlay、inline input、option rendering 组件族。[I]

## 能回答的问题
- `Select` 的 state 与 keyboard input 怎样拆分?
- `SelectMulti` 怎样复用 multi-select hook?
- select overlay 是在哪里注册的?
- inline input option 支持哪些 keybinding?

## 族干什么
`Select` 是单选入口,本地维护 image selection 和 input values,然后组合 `useSelectState` 与 `useSelectInput`。[E: components/CustomSelect/select.tsx:192][E: components/CustomSelect/select.tsx:222][E: components/CustomSelect/select.tsx:240][E: components/CustomSelect/select.tsx:301][E: components/CustomSelect/select.tsx:348] `SelectMulti` 是多选入口,通过 `useMultiSelectState` 管理 selected values、submit focus 和 input values。[E: components/CustomSelect/SelectMulti.tsx:58][E: components/CustomSelect/SelectMulti.tsx:128]

## 成员清单
- `Select` 渲染单选列表与 input mode。[E: components/CustomSelect/select.tsx:192]
- `SelectMulti` 渲染多选列表。[E: components/CustomSelect/SelectMulti.tsx:58]
- `SelectInputOption` 是可编辑 option,接 `useKeybinding`、`useKeybindings`、`useInput`。[E: components/CustomSelect/select-input-option.tsx:78][E: components/CustomSelect/select-input-option.tsx:173][E: components/CustomSelect/select-input-option.tsx:312][E: components/CustomSelect/select-input-option.tsx:336]
- `SelectOption` 是普通 option row。[E: components/CustomSelect/select-option.tsx:41]
- `OptionMap` 继承 `Map`,为 option navigation 维护 first/last 与 previous/next 链接。[E: components/CustomSelect/option-map.ts:13][E: components/CustomSelect/option-map.ts:24][E: components/CustomSelect/option-map.ts:34][E: components/CustomSelect/option-map.ts:35][E: components/CustomSelect/option-map.ts:47][E: components/CustomSelect/option-map.ts:48]
- `useSelectState`、`useSelectInput`、`useSelectNavigation` 拆出 value、keyboard handler、focus reducer。[E: components/CustomSelect/use-select-state.ts:127][E: components/CustomSelect/use-select-input.ts:86][E: components/CustomSelect/use-select-navigation.ts:505]
- `useMultiSelectState` 复用 `useSelectNavigation` 并注册 `multi-select` overlay。[E: components/CustomSelect/use-multi-select-state.ts:153][E: components/CustomSelect/use-multi-select-state.ts:203][E: components/CustomSelect/use-multi-select-state.ts:215]

## 巨型组件深挖
`use-select-navigation.ts` 是本族最复杂的状态核心:它用 reducer 初始化 state,缓存 last options,用 memo 派生 visible options、validated focused value、input focus,并用 effects 处理 options / focus 漂移。[E: components/CustomSelect/use-select-navigation.ts:512][E: components/CustomSelect/use-select-navigation.ts:526][E: components/CustomSelect/use-select-navigation.ts:579][E: components/CustomSelect/use-select-navigation.ts:592][E: components/CustomSelect/use-select-navigation.ts:604][E: components/CustomSelect/use-select-navigation.ts:614]

## 与 hooks/AppState 接线
该族没有直接读取 `AppState`;它通过 overlay、Ink `useInput`、keybinding hooks 与父级 dialog 接线。[E: components/CustomSelect/use-select-input.ts:101][E: components/CustomSelect/use-select-input.ts:166][E: components/CustomSelect/use-select-input.ts:173] 多选状态也注册 overlay 并用 `useInput` 处理数字/space/page 等输入。[E: components/CustomSelect/use-multi-select-state.ts:215][E: components/CustomSelect/use-multi-select-state.ts:247]

## Sources
- components/CustomSelect/select.tsx
- components/CustomSelect/SelectMulti.tsx
- components/CustomSelect/select-input-option.tsx
- components/CustomSelect/use-select-state.ts
- components/CustomSelect/use-select-input.ts
- components/CustomSelect/use-select-navigation.ts
- components/CustomSelect/use-multi-select-state.ts
- components/CustomSelect/option-map.ts
- components/CustomSelect/select-option.tsx

## 相关
- `subsys.ink-runtime` 说明 Ink input 与 terminal rendering 背景。
