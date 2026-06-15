---
id: cmd.account-auth
path: surface/commands/account-auth.md
title: Account and auth slash commands
kind: command
tier: T1
source: [commands.ts, commands/login/index.ts, commands/login/login.tsx, commands/logout/index.ts, commands/logout/logout.tsx, commands/memory/index.ts, commands/memory/memory.tsx, commands/privacy-settings/index.ts, commands/privacy-settings/privacy-settings.tsx]
symbols: [login, logout, memory, privacy-settings]
related: [subsys.command-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Account and auth 命令 catalog 覆盖 `/login`、`/logout`、`/memory`、`/privacy-settings` 这四个与账号、OAuth、长期记忆和隐私控制相关的 slash commands。

## 能回答的问题

- `/login` 和 `/logout` 分别改动哪些 auth state 与 cache?
- `/memory` 打开哪个 memory file 流程,是否会创建空文件?
- `/privacy-settings` 在什么资格条件下显示 Grove privacy UI?
- 这些命令在 `COMMANDS` 注册表里的来源和可用性是什么?

## 简介

`commands.ts` 把 `memory` 作为普通 built-in command 放进 `COMMANDS`,把 `privacySettings` 放在 plan/hook/export 一组附近,并且只在非 third-party service 环境追加 `logout` 与 `login()`。[E: commands.ts:288][E: commands.ts:333][E: commands.ts:337] `login()` 是工厂函数,会根据当前 auth source 动态生成 description,而 `logout`、`memory`、`privacy-settings` 是静态 command object。[E: commands/login/index.ts:5][E: commands/logout/index.ts:4][E: commands/memory/index.ts:3][E: commands/privacy-settings/index.ts:4]

## 命令清单

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
| --- | --- | --- | --- | --- | --- |
| `/login` | - | `local-jsx` | `COMMANDS` 只在 `!isUsing3PServices()` 时追加 `login()`; command 自身受 `DISABLE_LOGIN_COMMAND` 关闭。[E: commands.ts:337][E: commands/login/index.ts:7][E: commands/login/index.ts:12] | 无显式 `argumentHint`; `call()` 不读取 args。[E: commands/login/login.tsx:19] | 渲染 `ConsoleOAuthFlow`;`onDone` 回调先调用 `onChangeAPIKey()` 并清理签名块,成功时再刷新 remote managed settings、policy limits、GrowthBook/user cache、trusted device 和 permission gate state,最后把 `authVersion` 加一。[E: commands/login/login.tsx:83][E: commands/login/login.tsx:20][E: commands/login/login.tsx:21][E: commands/login/login.tsx:24][E: commands/login/login.tsx:25][E: commands/login/login.tsx:28][E: commands/login/login.tsx:30][E: commands/login/login.tsx:32][E: commands/login/login.tsx:34][E: commands/login/login.tsx:36][E: commands/login/login.tsx:40][E: commands/login/login.tsx:42][E: commands/login/login.tsx:44][E: commands/login/login.tsx:52][E: commands/login/login.tsx:54] |
| `/logout` | - | `local-jsx` | `COMMANDS` 与 `/login` 同样只在 `!isUsing3PServices()` 时追加; command 自身受 `DISABLE_LOGOUT_COMMAND` 关闭。[E: commands.ts:337][E: commands/logout/index.ts:5][E: commands/logout/index.ts:8] | 无显式 `argumentHint`; `call()` 不读取 args。[E: commands/logout/logout.tsx:72] | `performLogout()` flush telemetry、移除 API key、删除 secure storage、清理 auth 相关 cache、重置 onboarding/global auth state,随后显示成功文本并触发 graceful shutdown。[E: commands/logout/logout.tsx:23][E: commands/logout/logout.tsx:24][E: commands/logout/logout.tsx:28][E: commands/logout/logout.tsx:29][E: commands/logout/logout.tsx:30][E: commands/logout/logout.tsx:34][E: commands/logout/logout.tsx:35][E: commands/logout/logout.tsx:36][E: commands/logout/logout.tsx:37][E: commands/logout/logout.tsx:41][E: commands/logout/logout.tsx:45][E: commands/logout/logout.tsx:73][E: commands/logout/logout.tsx:74][E: commands/logout/logout.tsx:76][E: commands/logout/logout.tsx:78] |
| `/memory` | - | `local-jsx` | `COMMANDS` 直接包含 `memory`; command object 没有额外 `availability` 或 `isEnabled` gate。[E: commands.ts:288][E: commands/memory/index.ts:4][E: commands/memory/index.ts:5][E: commands/memory/index.ts:7] | 无显式 `argumentHint`; UI 中由 `MemoryFileSelector` 选择 memory file。[E: commands/memory/memory.tsx:72] | 打开前清理并预热 memory file cache;选择文件后必要时创建 Claude config 目录、用 `flag: 'wx'` 创建不存在的空文件,再调用外部编辑器打开。[E: commands/memory/memory.tsx:86][E: commands/memory/memory.tsx:87][E: commands/memory/memory.tsx:25][E: commands/memory/memory.tsx:33][E: commands/memory/memory.tsx:35][E: commands/memory/memory.tsx:42] |
| `/privacy-settings` | - | `local-jsx` | `COMMANDS` 直接包含 `privacySettings`; command 仅当 `isConsumerSubscriber()` 为真时启用。[E: commands.ts:333][E: commands/privacy-settings/index.ts:5][E: commands/privacy-settings/index.ts:6][E: commands/privacy-settings/index.ts:9] | 无显式 `argumentHint`; `call()` 不读取 args。[E: commands/privacy-settings/privacy-settings.tsx:7] | 先检查 `isQualifiedForGrove()`,失败或 settings API 失败时输出 privacy controls URL;成功时按 `grove_enabled` 是否已存在选择 `PrivacySettingsDialog` 或 `GroveDialog`。[E: commands/privacy-settings/privacy-settings.tsx:8][E: commands/privacy-settings/privacy-settings.tsx:10][E: commands/privacy-settings/privacy-settings.tsx:13][E: commands/privacy-settings/privacy-settings.tsx:16][E: commands/privacy-settings/privacy-settings.tsx:51][E: commands/privacy-settings/privacy-settings.tsx:52][E: commands/privacy-settings/privacy-settings.tsx:56] |

## 复杂命令深挖

### `/login`

`/login` 的核心不是只打开 OAuth UI;成功路径会同时刷新账号相关 runtime state。源码在 `success` 分支内重置 cost state、刷新远程托管 settings 和 policy limits、清理 user cache、刷新 GrowthBook、清理 trusted device token 并重新 enroll trusted device。[E: commands/login/login.tsx:25][E: commands/login/login.tsx:28][E: commands/login/login.tsx:30][E: commands/login/login.tsx:32][E: commands/login/login.tsx:34][E: commands/login/login.tsx:36][E: commands/login/login.tsx:40][E: commands/login/login.tsx:42] `TRANSCRIPT_CLASSIFIER` feature gate 打开时还会重置 auto mode gate 并按新账号重跑 auto mode killswitch 检查。[E: commands/login/login.tsx:47][E: commands/login/login.tsx:48][E: commands/login/login.tsx:49]

### `/logout`

`/logout` 先在 `performLogout()` 中 flush telemetry,再删除 API key 与 secure storage,随后清理 OAuth token cache、trusted device cache、betas cache、tool schema cache、user cache、Grove cache、remote managed settings cache 和 policy limits cache。[E: commands/logout/logout.tsx:23][E: commands/logout/logout.tsx:24][E: commands/logout/logout.tsx:28][E: commands/logout/logout.tsx:53][E: commands/logout/logout.tsx:54][E: commands/logout/logout.tsx:55][E: commands/logout/logout.tsx:56][E: commands/logout/logout.tsx:59][E: commands/logout/logout.tsx:63][E: commands/logout/logout.tsx:64][E: commands/logout/logout.tsx:67][E: commands/logout/logout.tsx:70] `clearOnboarding` 为真时会把 onboarding、subscription notice 和 custom API key approval 状态一并重置。[E: commands/logout/logout.tsx:34][E: commands/logout/logout.tsx:35][E: commands/logout/logout.tsx:36][E: commands/logout/logout.tsx:37][E: commands/logout/logout.tsx:41]

### `/memory`

`/memory` 在渲染 `MemoryCommand` 之前先执行 `clearMemoryFileCaches()` 与 `getMemoryFiles()`,这让初次打开 memory selector 时 cache 已被预热。[E: commands/memory/memory.tsx:83][E: commands/memory/memory.tsx:86][E: commands/memory/memory.tsx:87] 当用户选择 home memory path 时,命令会递归创建 Claude config home dir;写空文件使用 `wx`,因此文件已存在时不会覆盖原内容。[E: commands/memory/memory.tsx:24][E: commands/memory/memory.tsx:25][E: commands/memory/memory.tsx:33][E: commands/memory/memory.tsx:35][E: commands/memory/memory.tsx:38]

### `/privacy-settings`

`/privacy-settings` 不是本地 settings editor;它通过 Grove API 路径获取资格、settings 和 notice config,并在 settings 变更后重新读取 Grove settings 来回报 `"Help improve Claude"` 的新状态。[E: commands/privacy-settings/privacy-settings.tsx:8][E: commands/privacy-settings/privacy-settings.tsx:13][E: commands/privacy-settings/privacy-settings.tsx:31][E: commands/privacy-settings/privacy-settings.tsx:39][E: commands/privacy-settings/privacy-settings.tsx:40] 如果旧值非 null 且新旧 `grove_enabled` 不同,命令记录 `tengu_grove_policy_toggled` telemetry。[E: commands/privacy-settings/privacy-settings.tsx:41][E: commands/privacy-settings/privacy-settings.tsx:42]

## Sources

- `commands.ts`
- `commands/login/index.ts`
- `commands/login/login.tsx`
- `commands/logout/index.ts`
- `commands/logout/logout.tsx`
- `commands/memory/index.ts`
- `commands/memory/memory.tsx`
- `commands/privacy-settings/index.ts`
- `commands/privacy-settings/privacy-settings.tsx`

## 相关

- [命令系统机制](../../subsystems/command-system.md)
