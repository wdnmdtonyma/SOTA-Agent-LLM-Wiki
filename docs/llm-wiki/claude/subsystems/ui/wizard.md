---
id: ui.wizard
title: UI wizard 组件族
kind: subsystem
tier: T2
source: [components/wizard/]
symbols: [WizardProvider, WizardDialogLayout, WizardNavigationFooter, useWizard]
related: [subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.wizard` 是多步骤 flow 的 shared wizard framework,由 provider、layout、footer 和 hook 组成。[I]

## 能回答的问题
- wizard step index、data 和 completion state 存在哪里?
- step layout 怎样显示 title、subtitle 和 step counter?
- wizard hook 在 provider 外调用会怎样失败?

## 族干什么
`WizardProvider` 持有 `currentStepIndex`、`wizardData` 和 `isCompleted`,并把 current step、data、navigation 和 cancel API 放进 context value。[E: components/wizard/WizardProvider.tsx:30][E: components/wizard/WizardProvider.tsx:31][E: components/wizard/WizardProvider.tsx:32][E: components/wizard/WizardProvider.tsx:154][E: components/wizard/WizardProvider.tsx:156][E: components/wizard/WizardProvider.tsx:159][E: components/wizard/WizardProvider.tsx:160][E: components/wizard/WizardProvider.tsx:161][E: components/wizard/WizardProvider.tsx:162] `WizardProvider` 渲染 children 或 current step component,再包进 `WizardContext.Provider`。[E: components/wizard/WizardProvider.tsx:180][E: components/wizard/WizardProvider.tsx:186][E: components/wizard/WizardProvider.tsx:195]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `WizardProvider` | `components/wizard/WizardProvider.tsx` | wizard state/context provider 和 current step renderer。[E: components/wizard/WizardProvider.tsx:30][E: components/wizard/WizardProvider.tsx:154][E: components/wizard/WizardProvider.tsx:186][E: components/wizard/WizardProvider.tsx:195] |
| `WizardDialogLayout` | `components/wizard/WizardDialogLayout.tsx` | 读取 wizard context,构造 title/step suffix,渲染 `Dialog` 和 navigation footer。[E: components/wizard/WizardDialogLayout.tsx:30][E: components/wizard/WizardDialogLayout.tsx:31][E: components/wizard/WizardDialogLayout.tsx:32][E: components/wizard/WizardDialogLayout.tsx:33][E: components/wizard/WizardDialogLayout.tsx:36][E: components/wizard/WizardDialogLayout.tsx:48] |
| `WizardNavigationFooter` | `components/wizard/WizardNavigationFooter.tsx` | 默认 footer shortcuts,并在 pending exit 时显示 exit key 文案。[E: components/wizard/WizardNavigationFooter.tsx:11][E: components/wizard/WizardNavigationFooter.tsx:12][E: components/wizard/WizardNavigationFooter.tsx:13][E: components/wizard/WizardNavigationFooter.tsx:14][E: components/wizard/WizardNavigationFooter.tsx:20] |
| `useWizard` | `components/wizard/useWizard.ts` | 读取 `WizardContext`,在 provider 外抛错。[E: components/wizard/useWizard.ts:8][E: components/wizard/useWizard.ts:9][E: components/wizard/useWizard.ts:10][E: components/wizard/useWizard.ts:12] |
| `index.ts` | `components/wizard/index.ts` | wizard public exports。[E: components/wizard/index.ts:2][E: components/wizard/index.ts:3][E: components/wizard/index.ts:4][E: components/wizard/index.ts:6][E: components/wizard/index.ts:7][E: components/wizard/index.ts:8][E: components/wizard/index.ts:9] |

## 巨型组件深挖
本族没有单个巨型 UI;复杂度集中在 `WizardProvider` 的 state transitions。[I] `goNext` 在最后一步设置 completed,`goBack` 可从 navigation history 恢复上一步,`goToStep` 校验 index range,`cancel` 清 history 并调用 `onCancel`,`updateWizardData` 合并 updates。[E: components/wizard/WizardProvider.tsx:65][E: components/wizard/WizardProvider.tsx:70][E: components/wizard/WizardProvider.tsx:71][E: components/wizard/WizardProvider.tsx:85][E: components/wizard/WizardProvider.tsx:86][E: components/wizard/WizardProvider.tsx:89][E: components/wizard/WizardProvider.tsx:112][E: components/wizard/WizardProvider.tsx:127][E: components/wizard/WizardProvider.tsx:129][E: components/wizard/WizardProvider.tsx:141][E: components/wizard/WizardProvider.tsx:142][E: components/wizard/WizardProvider.tsx:143] completed effect 会清 history 并调用 `onComplete(wizardData)`。[E: components/wizard/WizardProvider.tsx:61][E: components/wizard/WizardProvider.tsx:46][E: components/wizard/WizardProvider.tsx:47][E: components/wizard/WizardProvider.tsx:48]

## 与 hooks/AppState 接线
`WizardProvider` 使用 `useExitOnCtrlCDWithKeybindings`。[E: components/wizard/WizardProvider.tsx:41] 本族状态看起来是 context-local wizard state,而不是 AppState 写入路径。[I] `WizardDialogLayout` 通过 `useWizard` 取得 `goBack`,并把它传给 `Dialog.onCancel`。[E: components/wizard/WizardDialogLayout.tsx:29][E: components/wizard/WizardDialogLayout.tsx:30][E: components/wizard/WizardDialogLayout.tsx:36]

## Sources
- components/wizard/WizardProvider.tsx
- components/wizard/WizardDialogLayout.tsx
- components/wizard/WizardNavigationFooter.tsx
- components/wizard/useWizard.ts
- components/wizard/index.ts

## 相关
- `subsys.ui-components` 说明 wizard 复用的 Dialog/keyboard primitives。
