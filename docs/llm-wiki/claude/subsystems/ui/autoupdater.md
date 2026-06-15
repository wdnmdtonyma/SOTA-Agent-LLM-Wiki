---
id: ui.autoupdater
title: UI Autoupdater 组件族
kind: subsystem
tier: T2
source: [components/AutoUpdaterWrapper.tsx, components/AutoUpdater.tsx, components/NativeAutoUpdater.tsx, components/PackageManagerAutoUpdater.tsx, components/ChannelDowngradeDialog.tsx, components/DevChannelsDialog.tsx]
symbols: [AutoUpdaterWrapper, AutoUpdater, NativeAutoUpdater, PackageManagerAutoUpdater, ChannelDowngradeDialog, DevChannelsDialog]
related: [subsys.ui-components, subsys.config-settings, subsys.telemetry-flags]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.autoupdater` 是 auto update 检测、安装状态提示、package-manager 提示、channel 切换确认的 UI 族。[I]

## 能回答的问题
- `AutoUpdaterWrapper` 怎样选择 native、global install、package-manager updater?
- auto update UI 何时渲染成功、失败或更新中状态?
- package-manager 安装为什么只给命令提示?
- dev channel / channel downgrade 对话框在哪里?

## 族干什么
`AutoUpdaterWrapper` 是入口,它先保存 `useNativeInstaller` 和 `isPackageManager` 两个安装类型 state,再异步调用 `getCurrentInstallationType()` 并写回这两个 state。[E: components/AutoUpdaterWrapper.tsx:29][E: components/AutoUpdaterWrapper.tsx:30][E: components/AutoUpdaterWrapper.tsx:40][E: components/AutoUpdaterWrapper.tsx:42][E: components/AutoUpdaterWrapper.tsx:43] 当检测到 package-manager 安装时它渲染 `PackageManagerAutoUpdater`,否则按 `useNativeInstaller ? NativeAutoUpdater : AutoUpdater` 选择 updater component。[E: components/AutoUpdaterWrapper.tsx:61][E: components/AutoUpdaterWrapper.tsx:74][E: components/AutoUpdaterWrapper.tsx:77]

## 成员清单
- `AutoUpdaterWrapper` 负责安装类型探测和分派。[E: components/AutoUpdaterWrapper.tsx:19][E: components/AutoUpdaterWrapper.tsx:45]
- `AutoUpdater` 负责非 native/global install 的更新检测、安装结果回调和 30 分钟 interval。[E: components/AutoUpdater.tsx:23][E: components/AutoUpdater.tsx:151][E: components/AutoUpdater.tsx:169]
- `NativeAutoUpdater` 负责 native installer 更新检测,记录 start/success/up-to-date/fail analytics,并按 `shouldRender` 控制 UI 是否出现。[E: components/NativeAutoUpdater.tsx:51][E: components/NativeAutoUpdater.tsx:88][E: components/NativeAutoUpdater.tsx:114][E: components/NativeAutoUpdater.tsx:123][E: components/NativeAutoUpdater.tsx:132][E: components/NativeAutoUpdater.tsx:169]
- `PackageManagerAutoUpdater` 在发现更新时构造 package-manager 命令提示,不直接安装。[E: components/PackageManagerAutoUpdater.tsx:20][E: components/PackageManagerAutoUpdater.tsx:73][E: components/PackageManagerAutoUpdater.tsx:76][E: components/PackageManagerAutoUpdater.tsx:87]
- `ChannelDowngradeDialog` 与 `DevChannelsDialog` 是 channel 相关确认 UI。[E: components/ChannelDowngradeDialog.tsx:16][E: components/DevChannelsDialog.tsx:12]

## 巨型组件深挖
`AutoUpdater` 和 `NativeAutoUpdater` 都用 `isUpdatingRef.current` 防止已有更新流程重入,并在 initial check 之后用 `useInterval(checkForUpdates, 30 * 60 * 1000)` 定期检查。[E: components/AutoUpdater.tsx:46][E: components/AutoUpdater.tsx:49][E: components/AutoUpdater.tsx:165][E: components/AutoUpdater.tsx:169][E: components/NativeAutoUpdater.tsx:71][E: components/NativeAutoUpdater.tsx:74][E: components/NativeAutoUpdater.tsx:158][E: components/NativeAutoUpdater.tsx:162]

## 与 hooks/AppState 接线
该族不直接读 `AppState`;接线集中在 React state/effect/ref、`useInterval`、feature flag、config helper 与 analytics 上。[E: components/AutoUpdaterWrapper.tsx:29][E: components/AutoUpdaterWrapper.tsx:36][E: components/AutoUpdater.tsx:37][E: components/AutoUpdater.tsx:134][E: components/NativeAutoUpdater.tsx:157][E: components/PackageManagerAutoUpdater.tsx:71] update 结果通过 `onAutoUpdaterResult` prop 回传给父级,而不是写全局状态。[E: components/AutoUpdater.tsx:18][E: components/NativeAutoUpdater.tsx:46][E: components/PackageManagerAutoUpdater.tsx:15]

## Sources
- components/AutoUpdaterWrapper.tsx
- components/AutoUpdater.tsx
- components/NativeAutoUpdater.tsx
- components/PackageManagerAutoUpdater.tsx
- components/ChannelDowngradeDialog.tsx
- components/DevChannelsDialog.tsx

## 相关
- `subsys.config-settings` 说明 auto updater disabled 与 channel 配置的上下文。

