---
id: ui.logo-v2
title: UI LogoV2 组件族
kind: subsystem
tier: T2
source: [components/LogoV2/LogoV2.tsx, components/LogoV2/CondensedLogo.tsx, components/LogoV2/WelcomeV2.tsx, components/LogoV2/AnimatedClawd.tsx, components/LogoV2/Clawd.tsx, components/LogoV2/Feed.tsx, components/LogoV2/FeedColumn.tsx, components/LogoV2/ChannelsNotice.tsx, components/LogoV2/GuestPassesUpsell.tsx, components/LogoV2/OverageCreditUpsell.tsx, components/LogoV2/VoiceModeNotice.tsx, components/LogoV2/feedConfigs.tsx]
symbols: [LogoV2, CondensedLogo, WelcomeV2, AnimatedClawd, Clawd, Feed, ChannelsNotice, GuestPassesUpsell, OverageCreditUpsell]
related: [subsys.ui-components, subsys.telemetry-flags, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.logo-v2` 是启动/顶部品牌区、welcome art、activity feed、渠道 notice 和 upsell notice 的 UI 族。[I]

## 能回答的问题
- `LogoV2` 读取哪些 AppState 字段?
- Channels notice 为什么是 feature-gated require?
- Welcome/Clawd/Feed 分别负责什么?
- guest passes 与 overage credit upsell 怎样接入 Logo feed?

## 族干什么
`LogoV2` 是主入口,读取 terminal size、agent、effortValue,并使用 project onboarding、guest passes、overage credit 等 feed/notice 条件。[E: components/LogoV2/LogoV2.tsx:47][E: components/LogoV2/LogoV2.tsx:53][E: components/LogoV2/LogoV2.tsx:56][E: components/LogoV2/LogoV2.tsx:70][E: components/LogoV2/LogoV2.tsx:71][E: components/LogoV2/LogoV2.tsx:72][E: components/LogoV2/LogoV2.tsx:73] `ChannelsNoticeModule` 通过 `feature('KAIROS') || feature('KAIROS_CHANNELS')` 进行条件 require。[E: components/LogoV2/LogoV2.tsx:36]

## 成员清单
- `LogoV2` 是完整 logo/feed 入口。[E: components/LogoV2/LogoV2.tsx:47]
- `CondensedLogo` 是窄宽度 logo,也读取 terminal size、agent、effortValue。[E: components/LogoV2/CondensedLogo.tsx:19][E: components/LogoV2/CondensedLogo.tsx:23][E: components/LogoV2/CondensedLogo.tsx:24][E: components/LogoV2/CondensedLogo.tsx:25]
- `WelcomeV2` 渲染 welcome art。[E: components/LogoV2/WelcomeV2.tsx:12]
- `AnimatedClawd` 和 `Clawd` 负责 mascot pose/animation。[E: components/LogoV2/AnimatedClawd.tsx:63][E: components/LogoV2/AnimatedClawd.tsx:66][E: components/LogoV2/AnimatedClawd.tsx:74][E: components/LogoV2/Clawd.tsx:86][E: components/LogoV2/Clawd.tsx:90]
- `Feed`、`FeedColumn`、`feedConfigs.tsx` 负责 activity / whats-new / project onboarding / guest passes feed 配置。[E: components/LogoV2/Feed.tsx:51][E: components/LogoV2/FeedColumn.tsx:11][E: components/LogoV2/feedConfigs.tsx:11][E: components/LogoV2/feedConfigs.tsx:27][E: components/LogoV2/feedConfigs.tsx:50][E: components/LogoV2/feedConfigs.tsx:74]
- `ChannelsNotice`、`GuestPassesUpsell`、`OverageCreditUpsell`、`VoiceModeNotice` 是 logo 区 notice/upsell 子件。[E: components/LogoV2/ChannelsNotice.tsx:18][E: components/LogoV2/GuestPassesUpsell.tsx:58][E: components/LogoV2/OverageCreditUpsell.tsx:85][E: components/LogoV2/VoiceModeNotice.tsx:12]

## 巨型组件深挖
`LogoV2` 在 module scope 处理 feature-gated module require,`ChannelsNoticeModule = require('./ChannelsNotice.js')` 只在 `KAIROS` 或 `KAIROS_CHANNELS` feature flag 分支内赋值。[E: components/LogoV2/LogoV2.tsx:36] `LogoV2` 内部同时处理 onboarding seen count、announcement state、guest/overage upsell seen count,因此它是品牌区与 growth/notice 状态的汇合点。[E: components/LogoV2/LogoV2.tsx:100][E: components/LogoV2/LogoV2.tsx:81][E: components/LogoV2/LogoV2.tsx:129][E: components/LogoV2/LogoV2.tsx:146]

## 与 hooks/AppState 接线
`LogoV2` 和 `CondensedLogo` 都通过 `useAppState` 读取当前 agent 与 effortValue,并通过 `useTerminalSize` 选择布局。[E: components/LogoV2/LogoV2.tsx:53][E: components/LogoV2/LogoV2.tsx:72][E: components/LogoV2/LogoV2.tsx:73][E: components/LogoV2/CondensedLogo.tsx:23][E: components/LogoV2/CondensedLogo.tsx:24][E: components/LogoV2/CondensedLogo.tsx:25]

## Sources
- components/LogoV2/LogoV2.tsx
- components/LogoV2/CondensedLogo.tsx
- components/LogoV2/WelcomeV2.tsx
- components/LogoV2/AnimatedClawd.tsx
- components/LogoV2/Clawd.tsx
- components/LogoV2/Feed.tsx
- components/LogoV2/FeedColumn.tsx
- components/LogoV2/ChannelsNotice.tsx
- components/LogoV2/GuestPassesUpsell.tsx
- components/LogoV2/OverageCreditUpsell.tsx
- components/LogoV2/VoiceModeNotice.tsx
- components/LogoV2/feedConfigs.tsx

## 相关
- `subsys.telemetry-flags` 说明 feature flag 与 growth notice 的运行背景。
