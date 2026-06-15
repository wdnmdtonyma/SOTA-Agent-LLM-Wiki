---
id: ui.memory
title: UI memory 组件族
kind: subsystem
tier: T2
source: [components/memory/, components/MemoryUsageIndicator.tsx]
symbols: [MemoryFileSelector, MemoryUpdateNotification, MemoryUsageIndicator]
related: [subsys.ui-components, subsys.memory, subsys.config-settings, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.memory` 是 memory file picker、memory update notification 和 heap usage indicator 的 Ink UI 组件族。[I]

## 能回答的问题
- `/memory` selector 怎样列出 user/project/nested/team/agent memory?
- auto-memory 和 auto-dream toggles 写哪里?
- memory notification 和 memory usage indicator 分别何时显示?

## 族干什么
`MemoryFileSelector` 读取 existing memory files,补齐 user/project `CLAUDE.md` stubs,并把 memory files 映射成 display options。[E: components/memory/MemoryFileSelector.tsx:50][E: components/memory/MemoryFileSelector.tsx:51][E: components/memory/MemoryFileSelector.tsx:52][E: components/memory/MemoryFileSelector.tsx:55][E: components/memory/MemoryFileSelector.tsx:61][E: components/memory/MemoryFileSelector.tsx:67] auto-memory 开启时会加入 auto-memory folder,team memory 开启时加入 team folder,active agents 有 memory 时加入 agent memory folder。[E: components/memory/MemoryFileSelector.tsx:114][E: components/memory/MemoryFileSelector.tsx:118][E: components/memory/MemoryFileSelector.tsx:127][E: components/memory/MemoryFileSelector.tsx:131][E: components/memory/MemoryFileSelector.tsx:141][E: components/memory/MemoryFileSelector.tsx:145]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `MemoryFileSelector` | `components/memory/MemoryFileSelector.tsx` | memory file/folder selector,包含 auto-memory/auto-dream rows、folder opening flow 和 final `Select`。[E: components/memory/MemoryFileSelector.tsx:327][E: components/memory/MemoryFileSelector.tsx:344][E: components/memory/MemoryFileSelector.tsx:366][E: components/memory/MemoryFileSelector.tsx:370][E: components/memory/MemoryFileSelector.tsx:374][E: components/memory/MemoryFileSelector.tsx:391][E: components/memory/MemoryFileSelector.tsx:404] |
| `MemoryUpdateNotification` | `components/memory/MemoryUpdateNotification.tsx` | memory update toast,把 memory path 转为 display path 并显示 `/memory to edit` hint。[E: components/memory/MemoryUpdateNotification.tsx:28][E: components/memory/MemoryUpdateNotification.tsx:34][E: components/memory/MemoryUpdateNotification.tsx:37] |
| `MemoryUsageIndicator` | `components/MemoryUsageIndicator.tsx` | high memory usage indicator,external build gate 下返回 null,非 normal status 时显示 `/heapdump` hint。[E: components/MemoryUsageIndicator.tsx:10][E: components/MemoryUsageIndicator.tsx:11][E: components/MemoryUsageIndicator.tsx:16][E: components/MemoryUsageIndicator.tsx:26][E: components/MemoryUsageIndicator.tsx:29][E: components/MemoryUsageIndicator.tsx:31][E: components/MemoryUsageIndicator.tsx:33] |

## 巨型组件深挖
`MemoryFileSelector` 是本族巨型组件:它同时管理 file options、folder options、auto-memory toggle、auto-dream toggle、dream status、keyboard/select interaction 和 filesystem opening flow。[E: components/memory/MemoryFileSelector.tsx:67][E: components/memory/MemoryFileSelector.tsx:112][E: components/memory/MemoryFileSelector.tsx:118][E: components/memory/MemoryFileSelector.tsx:126][E: components/memory/MemoryFileSelector.tsx:162][E: components/memory/MemoryFileSelector.tsx:163][E: components/memory/MemoryFileSelector.tsx:192][E: components/memory/MemoryFileSelector.tsx:205][E: components/memory/MemoryFileSelector.tsx:223][E: components/memory/MemoryFileSelector.tsx:249][E: components/memory/MemoryFileSelector.tsx:279][E: components/memory/MemoryFileSelector.tsx:301][E: components/memory/MemoryFileSelector.tsx:322][E: components/memory/MemoryFileSelector.tsx:365][E: components/memory/MemoryFileSelector.tsx:366][E: components/memory/MemoryFileSelector.tsx:367][E: components/memory/MemoryFileSelector.tsx:368][E: components/memory/MemoryFileSelector.tsx:370][E: components/memory/MemoryFileSelector.tsx:391][I]

## 与 hooks/AppState 接线
`MemoryFileSelector` 从 AppState 读取 `agentDefinitions` 和 `isDreamRunning`,并用 active agents 生成 agent memory folders。[E: components/memory/MemoryFileSelector.tsx:113][E: components/memory/MemoryFileSelector.tsx:141][E: components/memory/MemoryFileSelector.tsx:143][E: components/memory/MemoryFileSelector.tsx:165] auto-memory 与 auto-dream toggles 通过 `updateSettingsForSource("userSettings", ...)` 写入 user settings。[E: components/memory/MemoryFileSelector.tsx:207][E: components/memory/MemoryFileSelector.tsx:208][E: components/memory/MemoryFileSelector.tsx:225][E: components/memory/MemoryFileSelector.tsx:226] `MemoryUsageIndicator` 使用 `useMemoryUsage` hook 读取 heap/status,并按 status 选择 warning/error color。[E: components/MemoryUsageIndicator.tsx:16][E: components/MemoryUsageIndicator.tsx:21][E: components/MemoryUsageIndicator.tsx:22][E: components/MemoryUsageIndicator.tsx:30]

## Sources
- components/memory/MemoryFileSelector.tsx
- components/memory/MemoryUpdateNotification.tsx
- components/MemoryUsageIndicator.tsx

## 相关
- `subsys.memory` 说明 memory files、auto-memory 和 dream flows。
- `subsys.config-settings` 说明 auto-memory settings。
- `subsys.session-state` 说明 agent/dream 状态怎样进入 UI。
