---
id: subsys.tui.onboarding
title: Onboarding
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/onboarding
symbols:
  - OnboardingScreen
  - OnboardingScreenArgs
  - OnboardingResult
  - AuthModeWidget
  - TrustDirectorySelection
related:
  - subsys.tui.architecture
  - subsys.app-server.session-management
  - subsys.tui.bottom-pane
evidence: explicit
status: verified
updated: 37aadeaa13
---

Onboarding 是 TUI 的 welcome/auth/trust wizard；`OnboardingScreen` 保存 frame requester、step list、`is_done` 和 `should_exit`，`run_onboarding_app` 在 `tokio::select!` 中同时消费 terminal event stream 与可选 app-server event stream [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:61][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:62][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:63][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:64][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:65][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:473][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:474][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:523]。

## 能回答的问题

- onboarding 什么时候显示 auth step、trust directory step 和 welcome step。
- ChatGPT browser login、device code login、API key login 如何进入同一 UI。
- trust directory 为什么使用 git root，而不是总是 cwd。
- onboarding 如何在 auth 成功时清屏并恢复 terminal SGR。

## 职责边界

- onboarding 只把 directory trust decision 与 should-exit decision 作为 `OnboardingResult` 返回；主会话 turn、streaming、bottom pane 不属于 onboarding 返回面 [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:76][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:77][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:78][I]。
- auth step 通过 app-server account login request 进行登录；`AuthModeWidget` 保存 `app_server_request_handle`，并在 browser/device/API key flow 中发送不同 `LoginAccountParams` [E: codex-rs/tui/src/onboarding/auth.rs:237][E: codex-rs/tui/src/onboarding/auth.rs:826][E: codex-rs/tui/src/onboarding/auth/headless_chatgpt_login.rs:36][E: codex-rs/tui/src/onboarding/auth.rs:763]。
- trust step 写入 project trust level；`TrustDirectoryWidget::handle_trust` 调用 `set_project_trust_level(... Trusted)`，随后记录 `TrustDirectorySelection::Trust` [E: codex-rs/tui/src/onboarding/trust_directory.rs:168][E: codex-rs/tui/src/onboarding/trust_directory.rs:173]。

## 关键 crate/文件

- `codex-rs/tui/src/onboarding/onboarding_screen.rs`: step orchestration and event loop。
- `codex-rs/tui/src/onboarding/auth.rs`: browser/device/API key auth UI。
- `codex-rs/tui/src/onboarding/auth/headless_chatgpt_login.rs`: device code login request/response handling。
- `codex-rs/tui/src/onboarding/trust_directory.rs`: trust prompt。
- `codex-rs/tui/src/onboarding/welcome.rs`: welcome animation。

## 数据模型

- `Step` 包含 `Welcome`, `Auth`, `TrustDirectory` 三种 onboarding step [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:38][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:40][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:41][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:42]。
- `StepState` 用 `InProgress`, `Complete`, `Hidden` 表示 step 生命周期 [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:50][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:52][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:53][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:54]。
- `OnboardingScreenArgs` 包含 `show_trust_screen`、`show_login_screen`、`login_status`、可选 `app_server_request_handle` 和 `config`；cwd、forced login method、frame requester 是 `OnboardingScreen::new` 从 `config` 或 `tui` 派生的运行时值 [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:68][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:69][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:70][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:71][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:72][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:73][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:90][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:92][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:96][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:106][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:143]。
- `SignInState` 区分 pick mode、browser flow、device code flow、success message、success、API key entry 和 API key configured [E: codex-rs/tui/src/onboarding/auth.rs:86][E: codex-rs/tui/src/onboarding/auth.rs:87][E: codex-rs/tui/src/onboarding/auth.rs:89][E: codex-rs/tui/src/onboarding/auth.rs:90][E: codex-rs/tui/src/onboarding/auth.rs:91][E: codex-rs/tui/src/onboarding/auth.rs:92][E: codex-rs/tui/src/onboarding/auth.rs:93]。

## 控制流

1. `OnboardingScreen::new` 总是加入 welcome step，然后按 `show_login_screen` 和 `show_trust_screen` 条件加入 auth/trust step；auth step 还要求 `app_server_request_handle` 存在 [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:94][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:99][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:104][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:126]。
2. trust target 优先使用 `resolve_root_git_project_for_trust`，失败时 fallback 到 cwd [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:127][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:130]。
3. key handling 对 Ctrl-D/Ctrl-C/q 计算 `should_quit`；当 `should_quit` 为 true 时，auth in progress 会触发 cancel 并设置 `should_exit`，随后无论是否 auth in progress 都把 `is_done` 置 true [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:270][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:291][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:292][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:295][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:297]。
4. active step 处理完 key 后，如果 trust step 要求 quit，就把 `should_exit` 置 true 并标记 done [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:306][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:309][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:316][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:317]。
5. `run_onboarding_app` event loop 同时消费 `tui_events.next()` 与 `app_server.next_event()`；auth 成功 message 出现后会 reset SGR、clear terminal，并继续根据 app-server notification 更新 screen [E: codex-rs/tui/src/onboarding/onboarding_screen.rs:473][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:474][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:523][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:495][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:511][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:529][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:530]。
6. auth browser flow 调用 `LoginAccountParams::Chatgpt` 并尝试打开 browser；device code flow 发送 `LoginAccountParams::ChatgptDeviceCode`；API key flow 发送 `LoginAccountParams::ApiKey` [E: codex-rs/tui/src/onboarding/auth.rs:826][E: codex-rs/tui/src/onboarding/auth.rs:831][E: codex-rs/tui/src/onboarding/auth.rs:944][E: codex-rs/tui/src/onboarding/auth.rs:945][E: codex-rs/tui/src/onboarding/auth.rs:949][E: codex-rs/tui/src/onboarding/auth/headless_chatgpt_login.rs:36][E: codex-rs/tui/src/onboarding/auth.rs:763]。

## 设计动机与权衡

- welcome animation 会在 terminal 太小、animations disabled 或 auth copyable state 时隐藏/抑制，避免动效干扰复制 auth URL/device code [E: codex-rs/tui/src/onboarding/welcome.rs:82][E: codex-rs/tui/src/onboarding/welcome.rs:84][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:180][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:183][I]。
- forced login method 会禁用不允许的 sign-in option；forced ChatGPT 时 API key 被禁用，forced API key 时 ChatGPT 被禁用 [E: codex-rs/tui/src/onboarding/auth.rs:289][E: codex-rs/tui/src/onboarding/auth.rs:290][E: codex-rs/tui/src/onboarding/auth.rs:293][E: codex-rs/tui/src/onboarding/auth.rs:294]。
- trust directory prompt 明确提示 trust 会启用 project-local config、hooks 和 exec policies；因此 trust 是权限/配置边界，不只是 UI 记忆 [E: codex-rs/tui/src/onboarding/trust_directory.rs:73][E: codex-rs/tui/src/onboarding/trust_directory.rs:75][I]。

## gotcha

- `AuthModeWidget::cancel_active_attempt` 对 browser/device code 会发送 cancel request，并把状态重置到 pick mode；Esc handler 调用同一个 cancel path [E: codex-rs/tui/src/onboarding/auth.rs:216][E: codex-rs/tui/src/onboarding/auth.rs:218][E: codex-rs/tui/src/onboarding/auth.rs:255][E: codex-rs/tui/src/onboarding/auth.rs:261][E: codex-rs/tui/src/onboarding/auth.rs:268][E: codex-rs/tui/src/onboarding/auth.rs:275]。
- `mark_url_hyperlink` 会去掉 ESC/BEL 后再标 hyperlink，避免 terminal escape 注入到 auth URL display [E: codex-rs/tui/src/onboarding/auth.rs:52][E: codex-rs/tui/src/onboarding/auth.rs:56][E: codex-rs/tui/src/onboarding/auth.rs:58][E: codex-rs/tui/src/onboarding/auth.rs:75]。
- API key entry 会预填 `read_openai_api_key_from_env()` 返回的值；排查“输入框已有内容”时看 `start_api_key_entry` [E: codex-rs/tui/src/onboarding/auth.rs:725][E: codex-rs/tui/src/onboarding/auth.rs:731][E: codex-rs/tui/src/onboarding/auth.rs:739][E: codex-rs/tui/src/onboarding/auth.rs:740]。

## Sources

- `codex-rs/tui/src/onboarding`

## 相关

- `subsys.tui.architecture`
- `subsys.app-server.session-management`
- `subsys.tui.bottom-pane`
