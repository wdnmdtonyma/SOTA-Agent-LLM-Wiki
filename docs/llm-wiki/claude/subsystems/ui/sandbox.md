---
id: ui.sandbox
title: UI sandbox 组件族
kind: subsystem
tier: T2
source: [components/sandbox/, components/SandboxViolationExpandedView.tsx, components/PromptInput/SandboxPromptFooterHint.tsx]
symbols: [SandboxSettings, SandboxConfigTab, SandboxDependenciesTab, SandboxDoctorSection, SandboxOverridesTab, SandboxViolationExpandedView, SandboxPromptFooterHint]
related: [subsys.ui-components, subsys.config-settings, subsys.permissions, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.sandbox` 是 sandbox mode 设置、依赖诊断、override 策略和 violation feedback 的 Ink UI 组件族。[I]

## 能回答的问题
- Sandbox settings UI 有哪些 tabs?
- auto-allow、regular、disabled 三种 mode 写入哪些 setting?
- sandbox violation 在 expanded view 和 prompt footer 里怎样展示?

## 族干什么
`SandboxSettings` 从 `SandboxManager` 读取 enabled/auto-allow 状态,根据它们返回 `disabled`、`auto-allow` 或 `regular` mode,并构造三种 select options。[E: components/sandbox/SandboxSettings.tsx:29][E: components/sandbox/SandboxSettings.tsx:30][E: components/sandbox/SandboxSettings.tsx:44][E: components/sandbox/SandboxSettings.tsx:47][E: components/sandbox/SandboxSettings.tsx:49][E: components/sandbox/SandboxSettings.tsx:66][E: components/sandbox/SandboxSettings.tsx:78][E: components/sandbox/SandboxSettings.tsx:90] auto-allow、regular、disabled 三个选择分别写 `enabled/autoAllowBashIfSandboxed` 的不同组合。[E: components/sandbox/SandboxSettings.tsx:115][E: components/sandbox/SandboxSettings.tsx:116][E: components/sandbox/SandboxSettings.tsx:117][E: components/sandbox/SandboxSettings.tsx:124][E: components/sandbox/SandboxSettings.tsx:125][E: components/sandbox/SandboxSettings.tsx:126][E: components/sandbox/SandboxSettings.tsx:133][E: components/sandbox/SandboxSettings.tsx:134][E: components/sandbox/SandboxSettings.tsx:135]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `SandboxSettings` | `components/sandbox/SandboxSettings.tsx` | sandbox settings shell,构造 Mode、Overrides、Config、Dependencies tabs 并渲染 Pane/Tabs。[E: components/sandbox/SandboxSettings.tsx:171][E: components/sandbox/SandboxSettings.tsx:183][E: components/sandbox/SandboxSettings.tsx:192][E: components/sandbox/SandboxSettings.tsx:201][E: components/sandbox/SandboxSettings.tsx:214] |
| `SandboxModeTab` | `components/sandbox/SandboxSettings.tsx` | mode tab,渲染 socket warning、mode `Select` 和 auto-allow 说明。[E: components/sandbox/SandboxSettings.tsx:236][E: components/sandbox/SandboxSettings.tsx:261][E: components/sandbox/SandboxSettings.tsx:273][E: components/sandbox/SandboxSettings.tsx:287] |
| `SandboxConfigTab` | `components/sandbox/SandboxConfigTab.tsx` | sandbox config summary,读取 fs/network/unix sockets/excluded/glob warning configs 后渲染 summary。[E: components/sandbox/SandboxConfigTab.tsx:29][E: components/sandbox/SandboxConfigTab.tsx:30][E: components/sandbox/SandboxConfigTab.tsx:31][E: components/sandbox/SandboxConfigTab.tsx:32][E: components/sandbox/SandboxConfigTab.tsx:33][E: components/sandbox/SandboxConfigTab.tsx:34][E: components/sandbox/SandboxConfigTab.tsx:35] |
| `SandboxDependenciesTab` | `components/sandbox/SandboxDependenciesTab.tsx` | dependency diagnostics,计算 platform、rg/bwrap/socat/seccomp 状态并渲染安装提示。[E: components/sandbox/SandboxDependenciesTab.tsx:16][E: components/sandbox/SandboxDependenciesTab.tsx:22][E: components/sandbox/SandboxDependenciesTab.tsx:25][E: components/sandbox/SandboxDependenciesTab.tsx:31][E: components/sandbox/SandboxDependenciesTab.tsx:40][E: components/sandbox/SandboxDependenciesTab.tsx:49][E: components/sandbox/SandboxDependenciesTab.tsx:50][E: components/sandbox/SandboxDependenciesTab.tsx:65][E: components/sandbox/SandboxDependenciesTab.tsx:85][E: components/sandbox/SandboxDependenciesTab.tsx:117][E: components/sandbox/SandboxDependenciesTab.tsx:118] |
| `SandboxDoctorSection` | `components/sandbox/SandboxDoctorSection.tsx` | doctor/status section,unsupported platform、settings disabled 或无 errors/warnings 时不显示;否则渲染 status。[E: components/sandbox/SandboxDoctorSection.tsx:7][E: components/sandbox/SandboxDoctorSection.tsx:8][E: components/sandbox/SandboxDoctorSection.tsx:10][E: components/sandbox/SandboxDoctorSection.tsx:11][E: components/sandbox/SandboxDoctorSection.tsx:19][E: components/sandbox/SandboxDoctorSection.tsx:20][E: components/sandbox/SandboxDoctorSection.tsx:21][E: components/sandbox/SandboxDoctorSection.tsx:22][E: components/sandbox/SandboxDoctorSection.tsx:27] |
| `SandboxOverridesTab` | `components/sandbox/SandboxOverridesTab.tsx` | override 策略 tab,支持 disabled message、policy lock message、open/closed select 和 setting write。[E: components/sandbox/SandboxOverridesTab.tsx:19][E: components/sandbox/SandboxOverridesTab.tsx:20][E: components/sandbox/SandboxOverridesTab.tsx:25][E: components/sandbox/SandboxOverridesTab.tsx:35][E: components/sandbox/SandboxOverridesTab.tsx:51][E: components/sandbox/SandboxOverridesTab.tsx:88][E: components/sandbox/SandboxOverridesTab.tsx:100][E: components/sandbox/SandboxOverridesTab.tsx:122][E: components/sandbox/SandboxOverridesTab.tsx:152] |
| `SandboxViolationExpandedView` | `components/SandboxViolationExpandedView.tsx` | recent sandbox violations expanded view,订阅 store、保留最近 10 条、显示 total count 和 last-N summary。[E: components/SandboxViolationExpandedView.tsx:35][E: components/SandboxViolationExpandedView.tsx:36][E: components/SandboxViolationExpandedView.tsx:37][E: components/SandboxViolationExpandedView.tsx:38][E: components/SandboxViolationExpandedView.tsx:59][E: components/SandboxViolationExpandedView.tsx:68][E: components/SandboxViolationExpandedView.tsx:77] |
| `SandboxPromptFooterHint` | `components/PromptInput/SandboxPromptFooterHint.tsx` | prompt footer 的短暂 sandbox violation 提示,包含 details shortcut 和 `/sandbox` hint。[E: components/PromptInput/SandboxPromptFooterHint.tsx:11][E: components/PromptInput/SandboxPromptFooterHint.tsx:19][E: components/PromptInput/SandboxPromptFooterHint.tsx:21][E: components/PromptInput/SandboxPromptFooterHint.tsx:25][E: components/PromptInput/SandboxPromptFooterHint.tsx:30][E: components/PromptInput/SandboxPromptFooterHint.tsx:48][E: components/PromptInput/SandboxPromptFooterHint.tsx:54] |

## 巨型组件深挖
本族没有单个超大组件,但 `SandboxSettings` 是 coordination hub:它把 persisted settings、dependency warnings、mode mutation 和 tab selection 放在一个 settings surface。[E: components/sandbox/SandboxSettings.tsx:34][E: components/sandbox/SandboxSettings.tsx:40][E: components/sandbox/SandboxSettings.tsx:41][E: components/sandbox/SandboxSettings.tsx:115][E: components/sandbox/SandboxSettings.tsx:116][E: components/sandbox/SandboxSettings.tsx:117][E: components/sandbox/SandboxSettings.tsx:124][E: components/sandbox/SandboxSettings.tsx:125][E: components/sandbox/SandboxSettings.tsx:126][E: components/sandbox/SandboxSettings.tsx:133][E: components/sandbox/SandboxSettings.tsx:134][E: components/sandbox/SandboxSettings.tsx:135][E: components/sandbox/SandboxSettings.tsx:201][E: components/sandbox/SandboxSettings.tsx:214][I] violation feedback 分成 expanded view 和 prompt footer,二者都从 `SandboxViolationStore` subscription 获得运行态事件。[E: components/SandboxViolationExpandedView.tsx:35][E: components/SandboxViolationExpandedView.tsx:36][E: components/PromptInput/SandboxPromptFooterHint.tsx:19][E: components/PromptInput/SandboxPromptFooterHint.tsx:21]

## 与 hooks/AppState 接线
`SandboxSettings` 使用 `useKeybindings` 处理 Settings context 的 `confirm:no`,设置变更通过 `SandboxManager.setSandboxSettings` 完成。[E: components/sandbox/SandboxSettings.tsx:150][E: components/sandbox/SandboxSettings.tsx:162][E: components/sandbox/SandboxSettings.tsx:168][E: components/sandbox/SandboxSettings.tsx:115][E: components/sandbox/SandboxSettings.tsx:116][E: components/sandbox/SandboxSettings.tsx:117][E: components/sandbox/SandboxSettings.tsx:124][E: components/sandbox/SandboxSettings.tsx:125][E: components/sandbox/SandboxSettings.tsx:126][E: components/sandbox/SandboxSettings.tsx:133][E: components/sandbox/SandboxSettings.tsx:134][E: components/sandbox/SandboxSettings.tsx:135] violation UI 通过 store subscription 接运行态 sandbox events,不是从 AppState 读取。[E: components/SandboxViolationExpandedView.tsx:35][E: components/SandboxViolationExpandedView.tsx:36][E: components/PromptInput/SandboxPromptFooterHint.tsx:19][E: components/PromptInput/SandboxPromptFooterHint.tsx:21][I]

## Sources
- components/sandbox/SandboxSettings.tsx
- components/sandbox/SandboxConfigTab.tsx
- components/sandbox/SandboxDependenciesTab.tsx
- components/sandbox/SandboxDoctorSection.tsx
- components/sandbox/SandboxOverridesTab.tsx
- components/SandboxViolationExpandedView.tsx
- components/PromptInput/SandboxPromptFooterHint.tsx

## 相关
- `subsys.permissions` 说明 sandbox 与 shell permission 的关系。
- `subsys.config-settings` 说明 sandbox settings 的持久化位置。
- `subsys.session-state` 说明 runtime UI feedback 如何进入运行态。
