---
id: ui.managed-settings-security-dialog
title: UI ManagedSettingsSecurityDialog 组件族
kind: subsystem
tier: T2
source: [components/ManagedSettingsSecurityDialog/]
symbols: [ManagedSettingsSecurityDialog, extractDangerousSettings, hasDangerousSettings, hasDangerousSettingsChanged, formatDangerousSettingsList]
related: [subsys.ui-components, subsys.config-settings, subsys.permissions]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.managed-settings-security-dialog` 是 managed settings 里的 dangerous settings 确认 UI,覆盖 shell、env 和 hooks 三类风险。[I]

## 能回答的问题
- managed settings 哪些字段会被视为 dangerous?
- security dialog 的 accept/reject 分别触发什么 callback?
- changed detection 怎样判断新配置引入了危险项?

## 族干什么
`ManagedSettingsSecurityDialog` 从 props 接收 `settings`、`onAccept` 和 `onReject`,用 `extractDangerousSettings` 与 `formatDangerousSettingsList` 生成展示列表。[E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:17][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:18][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:19][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:20][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:22][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:23] `confirm:no` 绑定 `onReject`;select 选择 `exit` 调用 `onReject`,否则调用 `onAccept`。[E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:34][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:38][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:39][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:42]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `ManagedSettingsSecurityDialog` | `components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx` | dangerous managed settings warning、settings list、accept/exit select 和 `PermissionDialog` shell。[E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:61][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:70][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:75][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:96][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:99][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:108][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:51][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:137] |
| inline list helper | `components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx` | `settingsList.map(_temp)` 渲染单条 dangerous setting。[E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:75][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:146][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:147] |
| `extractDangerousSettings` | `components/ManagedSettingsSecurityDialog/utils.ts` | 从 settings 提取 dangerous shell settings、非 safe env vars 和 hooks,并返回 `DangerousSettings` 字段。[E: components/ManagedSettingsSecurityDialog/utils.ts:24][E: components/ManagedSettingsSecurityDialog/utils.ts:37][E: components/ManagedSettingsSecurityDialog/utils.ts:40][E: components/ManagedSettingsSecurityDialog/utils.ts:46][E: components/ManagedSettingsSecurityDialog/utils.ts:50][E: components/ManagedSettingsSecurityDialog/utils.ts:51][E: components/ManagedSettingsSecurityDialog/utils.ts:58][E: components/ManagedSettingsSecurityDialog/utils.ts:62][E: components/ManagedSettingsSecurityDialog/utils.ts:64][E: components/ManagedSettingsSecurityDialog/utils.ts:65][E: components/ManagedSettingsSecurityDialog/utils.ts:66][E: components/ManagedSettingsSecurityDialog/utils.ts:67][E: components/ManagedSettingsSecurityDialog/utils.ts:68] |
| `hasDangerousSettings` | `components/ManagedSettingsSecurityDialog/utils.ts` | 判断 shell/env/hooks 任一类是否非空。[E: components/ManagedSettingsSecurityDialog/utils.ts:77][E: components/ManagedSettingsSecurityDialog/utils.ts:78][E: components/ManagedSettingsSecurityDialog/utils.ts:79] |
| `hasDangerousSettingsChanged` | `components/ManagedSettingsSecurityDialog/utils.ts` | 新 dangerous settings 为空则 false,旧为空新不为空则 true,否则比较 dangerous settings JSON。[E: components/ManagedSettingsSecurityDialog/utils.ts:95][E: components/ManagedSettingsSecurityDialog/utils.ts:96][E: components/ManagedSettingsSecurityDialog/utils.ts:100][E: components/ManagedSettingsSecurityDialog/utils.ts:101][E: components/ManagedSettingsSecurityDialog/utils.ts:105][E: components/ManagedSettingsSecurityDialog/utils.ts:106][E: components/ManagedSettingsSecurityDialog/utils.ts:107][E: components/ManagedSettingsSecurityDialog/utils.ts:108][E: components/ManagedSettingsSecurityDialog/utils.ts:110][E: components/ManagedSettingsSecurityDialog/utils.ts:111][E: components/ManagedSettingsSecurityDialog/utils.ts:112][E: components/ManagedSettingsSecurityDialog/utils.ts:113][E: components/ManagedSettingsSecurityDialog/utils.ts:116] |
| `formatDangerousSettingsList` | `components/ManagedSettingsSecurityDialog/utils.ts` | 把 shell/env/hooks 转成供 UI 展示的字符串列表。[E: components/ManagedSettingsSecurityDialog/utils.ts:129][E: components/ManagedSettingsSecurityDialog/utils.ts:130][E: components/ManagedSettingsSecurityDialog/utils.ts:134][E: components/ManagedSettingsSecurityDialog/utils.ts:135][E: components/ManagedSettingsSecurityDialog/utils.ts:139][E: components/ManagedSettingsSecurityDialog/utils.ts:140][E: components/ManagedSettingsSecurityDialog/utils.ts:143] |

## 巨型组件深挖
复杂度集中在 `utils.ts`:它定义 `DangerousSettings` 结构,分别扫描 shell/env/hooks 三类 settings,再返回同一结构。[E: components/ManagedSettingsSecurityDialog/utils.ts:10][E: components/ManagedSettingsSecurityDialog/utils.ts:11][E: components/ManagedSettingsSecurityDialog/utils.ts:12][E: components/ManagedSettingsSecurityDialog/utils.ts:13][E: components/ManagedSettingsSecurityDialog/utils.ts:37][E: components/ManagedSettingsSecurityDialog/utils.ts:40][E: components/ManagedSettingsSecurityDialog/utils.ts:46][E: components/ManagedSettingsSecurityDialog/utils.ts:51][E: components/ManagedSettingsSecurityDialog/utils.ts:58][E: components/ManagedSettingsSecurityDialog/utils.ts:64][E: components/ManagedSettingsSecurityDialog/utils.ts:65][E: components/ManagedSettingsSecurityDialog/utils.ts:66][E: components/ManagedSettingsSecurityDialog/utils.ts:67][E: components/ManagedSettingsSecurityDialog/utils.ts:68] `ManagedSettingsSecurityDialog` 自身是薄确认层,主要负责 warning copy、select options 和 callbacks。[E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:61][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:95][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:96][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:99][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:100][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:108][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:37][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:38][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:39][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:42][I]

## 与 hooks/AppState 接线
该族未直接展示 AppState 读写;它通过 `onAccept`/`onReject` callback props 暴露 accept/reject 分支,并使用 `confirm:no` keybinding 调用 `onReject`。[I][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:12][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:13][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:37][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:38][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:39][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:42][E: components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx:34] dangerous shell/env 常量来自 `../../utils/managedEnvConstants.js`,其中列出 `DANGEROUS_SHELL_SETTINGS` 和 `SAFE_ENV_VARS`。[E: components/ManagedSettingsSecurityDialog/utils.ts:2][E: components/ManagedSettingsSecurityDialog/utils.ts:3][E: components/ManagedSettingsSecurityDialog/utils.ts:4][E: utils/managedEnvConstants.ts:75][E: utils/managedEnvConstants.ts:108]

## Sources
- components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx
- components/ManagedSettingsSecurityDialog/utils.ts
- utils/managedEnvConstants.ts

## 相关
- `subsys.config-settings` 说明 managed settings 的 schema 和来源。
- `subsys.permissions` 说明 shell/hook 风险与 permission policy 的关系。
