---
id: ui.ide-remote
title: UI IDE Remote 组件族
kind: subsystem
tier: T2
source: [components/BridgeDialog.tsx, components/IdeStatusIndicator.tsx, components/ShowInIDEPrompt.tsx, components/RemoteCallout.tsx, components/RemoteEnvironmentDialog.tsx]
symbols: [BridgeDialog, IdeStatusIndicator, ShowInIDEPrompt, RemoteCallout, shouldShowRemoteCallout, RemoteEnvironmentDialog]
related: [subsys.ui-components, subsys.bridge-remote, subsys.session-state, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.ide-remote` 是 IDE bridge、remote control callout、remote environment picker 与 IDE selection status 的 UI 族。[I]

## 能回答的问题
- `BridgeDialog` 读取哪些 AppState 字段?
- remote callout 怎样记住已经展示?
- remote environment dialog 如何维护加载、选择和错误 state?
- IDE selection status 和 show-in-IDE prompt 分别负责什么?

## 族干什么
`BridgeDialog` 是 bridge/remote dialog 入口,注册 overlay,读取 connected、sessionActive、reconnecting、connectUrl、sessionUrl、error、explicit、environmentId、sessionId、verbose 等 AppState selector,并取得 `setAppState`。[E: components/BridgeDialog.tsx:20][E: components/BridgeDialog.tsx:25][E: components/BridgeDialog.tsx:26][E: components/BridgeDialog.tsx:27][E: components/BridgeDialog.tsx:28][E: components/BridgeDialog.tsx:29][E: components/BridgeDialog.tsx:30][E: components/BridgeDialog.tsx:31][E: components/BridgeDialog.tsx:32][E: components/BridgeDialog.tsx:33][E: components/BridgeDialog.tsx:34][E: components/BridgeDialog.tsx:35][E: components/BridgeDialog.tsx:36]

## 成员清单
- `BridgeDialog` 维护 QR text、branchName 等 local state,并接 keybindings/input。[E: components/BridgeDialog.tsx:37][E: components/BridgeDialog.tsx:38][E: components/BridgeDialog.tsx:39][E: components/BridgeDialog.tsx:116][E: components/BridgeDialog.tsx:135]
- `IdeStatusIndicator` 在 IDE connected 且存在 selection/filePath 时展示 selection indicator。[E: components/IdeStatusIndicator.tsx:12][E: components/IdeStatusIndicator.tsx:21][E: components/IdeStatusIndicator.tsx:29][E: components/IdeStatusIndicator.tsx:49]
- `ShowInIDEPrompt` 展示 opened-in-IDE 文案,并在 symlink target 场景提示外部工作目录风险。[E: components/ShowInIDEPrompt.tsx:25][E: components/ShowInIDEPrompt.tsx:44][E: components/ShowInIDEPrompt.tsx:52]
- `RemoteCallout` 在 mount effect 中把 `remoteDialogSeen` 写入 config,`shouldShowRemoteCallout` 则根据该 flag 返回是否展示。[E: components/RemoteCallout.tsx:13][E: components/RemoteCallout.tsx:23][E: components/RemoteCallout.tsx:25][E: components/RemoteCallout.tsx:28][E: components/RemoteCallout.tsx:68][E: components/RemoteCallout.tsx:70]
- `RemoteEnvironmentDialog` 维护 loadingState、environments、selectedEnvironment、selectedEnvironmentSource 和 error state。[E: components/RemoteEnvironmentDialog.tsx:26][E: components/RemoteEnvironmentDialog.tsx:31][E: components/RemoteEnvironmentDialog.tsx:39][E: components/RemoteEnvironmentDialog.tsx:40][E: components/RemoteEnvironmentDialog.tsx:41][E: components/RemoteEnvironmentDialog.tsx:42]

## 巨型组件深挖
`BridgeDialog` 是该族的最大接线点:它既订阅多组 bridge AppState,又在 explicit/onDone 分支里调用 `setAppState`,并用 `useInput` 和 `useKeybindings` 接用户输入。[E: components/BridgeDialog.tsx:26][E: components/BridgeDialog.tsx:36][E: components/BridgeDialog.tsx:116][E: components/BridgeDialog.tsx:124][E: components/BridgeDialog.tsx:135] `disableRemoteControlAtStartup` 通过 `remoteControlAtStartup` config flag 处理 remote control 启动行为。[E: components/BridgeDialog.tsx:359][E: components/BridgeDialog.tsx:364]

## 与 hooks/AppState 接线
该族有两条接线:bridge dialog 直接读写 `AppState`,remote callout/environment dialog 更多依赖 config、effect 与本地 state。[E: components/BridgeDialog.tsx:26][E: components/BridgeDialog.tsx:36][E: components/RemoteCallout.tsx:23][E: components/RemoteEnvironmentDialog.tsx:82] IDE status indicator 则根据传入的 `ideSelection` 与 hook 得到的 status 渲染,不写全局状态。[E: components/IdeStatusIndicator.tsx:19][E: components/IdeStatusIndicator.tsx:21]

## Sources
- components/BridgeDialog.tsx
- components/IdeStatusIndicator.tsx
- components/ShowInIDEPrompt.tsx
- components/RemoteCallout.tsx
- components/RemoteEnvironmentDialog.tsx

## 相关
- `subsys.bridge-remote` 说明 bridge/remote 的非 UI 后端。

