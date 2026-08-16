---
id: subsys.tui.onboarding
title: TUI Onboarding
kind: subsystem
tier: T2
source: [codex-rs/tui/src/onboarding/onboarding_screen.rs, codex-rs/tui/src/onboarding/auth.rs, codex-rs/tui/src/onboarding/trust_directory.rs, codex-rs/tui/src/startup_orchestration.rs, codex-rs/tui/src/startup_preflight.rs, codex-rs/tui/src/startup_draft.rs]
symbols: [OnboardingScreen, OnboardingScreenArgs, OnboardingResult, run_onboarding_app, AuthModeWidget, TrustDirectoryWidget, should_delay_startup_composer_for_first_login]
related: [subsys.config-auth.auth-flows, subsys.config-auth.config-loading, subsys.tui.architecture]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Onboarding 是 TUI 启动前/启动中的一个独立 screen loop：它接收 `OnboardingScreenArgs`、可选 app-server session、和现有 `Tui`，返回是否持久化 trust 以及用户是否选择退出。first-login 时 `StartupDraft` 会把初始 surface 设为 `Onboarding`，先不画 composer。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:83][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:484][E: codex-rs/tui/src/startup_draft.rs:54][E: codex-rs/tui/src/startup_orchestration.rs:164]

## 能回答的问题

- onboarding loop 如何读取 TUI events 并重绘？
- 首次登录为什么会延迟 composer？
- trust directory 的选择何时写回 app-server/config？
- auth widget 如何处理 browser/device-code/API-key 路径？
- ChatGPT login success 为什么会做一次 terminal clear？

## Screen Loop

`OnboardingScreen` 保存 frame requester、steps、done/exit 状态；args 决定是否显示 trust/login screen、登录状态、app-server request handle 和 config。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:76][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:83][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:84][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:85]

`run_onboarding_app` 创建 screen 后先 draw，再 `discard_pending_input_before_interactive_screen`，然后 pin `tui.event_stream()`；select loop 处理 key、paste、draw/resume/resize，key 分支后尝试持久化 trust。trust step 刚激活时也会先渲染再丢掉上一屏残留按键。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:492][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:497][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:501][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:506][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:512][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:605]

ChatGPT success message 后有一次 guard：检测 auth step 的 `SignInState::ChatGptSuccessMessage`，重置 SGR attributes/colors 并 clear terminal，避免成功消息残留样式污染后续 screen。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:526][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:530][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:553][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:554]

## First-login 延迟 composer

`startup_orchestration` 在没有 resume/fork picker、没有 OSS/remote endpoint、且 `should_delay_startup_composer_for_first_login` 为真时，把 `StartupDraftInitialScreen` 设为 `Onboarding`。`StartupDraft::show_initial_screen` 因此不会先画 composer；onboarding 结束后 `StartupDraftPump::show` 才揭示可编辑 composer。[E: codex-rs/tui/src/startup_orchestration.rs:151][E: codex-rs/tui/src/startup_orchestration.rs:157][E: codex-rs/tui/src/startup_orchestration.rs:164][E: codex-rs/tui/src/startup_draft.rs:269][E: codex-rs/tui/src/startup_draft.rs:277]

`should_delay_startup_composer_for_first_login` 只在默认文件账户尚未能认证时返回 true：环境 token、系统 config、`codex_home` 状态文件、daemon socket 或 managed configuration 任一存在，都会立即显示 composer。[E: codex-rs/tui/src/startup_preflight.rs:22][E: codex-rs/tui/src/startup_preflight.rs:28][E: codex-rs/tui/src/startup_preflight.rs:48][E: codex-rs/tui/src/startup_preflight.rs:69]

## Trust Directory

`TrustDirectoryWidget` 保存 cwd、trust target、Windows sandbox hint、quit flag、selection、highlighted option 和 error；selection 只有 `Trust`/`Quit`。[E: codex-rs/tui/src/onboarding/trust_directory.rs:25][E: codex-rs/tui/src/onboarding/trust_directory.rs:35]

confirm key 调用 `handle_trust` 或 `handle_quit`；trust 会写 selection 并清 error，quit 会设置 `should_quit`。StepState 在 selection 或 quit 后变 complete。[E: codex-rs/tui/src/onboarding/trust_directory.rs:146][E: codex-rs/tui/src/onboarding/trust_directory.rs:148][E: codex-rs/tui/src/onboarding/trust_directory.rs:156][E: codex-rs/tui/src/onboarding/trust_directory.rs:165][E: codex-rs/tui/src/onboarding/trust_directory.rs:171]

持久化 trust 不是 widget 自己写文件；`persist_selected_trust` 在 screen steps 里找到 `TrustDirectorySelection::Trust`，再通过 app-server request handle 调用 `write_trusted_project`，失败时写入 widget error 并 log。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:618][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:628][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:638][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:642]

## Auth Widget

`AuthModeWidget` 保存 frame requester、highlighted sign-in option、error、sign-in state、login status、app-server request handle、auth config 和 animation flags。[E: codex-rs/tui/src/onboarding/auth.rs:231][E: codex-rs/tui/src/onboarding/auth.rs:233][E: codex-rs/tui/src/onboarding/auth.rs:235][E: codex-rs/tui/src/onboarding/auth.rs:237]

browser/device-code state 会 suppress animations；取消 active browser login 会通过 app-server handle 异步 `cancel_login_attempt`。[E: codex-rs/tui/src/onboarding/auth.rs:248][E: codex-rs/tui/src/onboarding/auth.rs:255]

API key path 有三段：paste/edit 会填充或追加 `ApiKeyEntry` state，start entry 会从 env 预填，save 会发送 `ClientRequest::LoginAccount { LoginAccountParams::ApiKey }`。[E: codex-rs/tui/src/onboarding/auth.rs:753][E: codex-rs/tui/src/onboarding/auth.rs:761][E: codex-rs/tui/src/onboarding/auth.rs:777][E: codex-rs/tui/src/onboarding/auth.rs:783]

browser login 现在显式请求非 streamlined 的本地完成页：`app_brand=None`、`codex_streamlined_login=false`、`use_hosted_login_success_page=false`。account 更新也会把 protocol 的 `ApiAuthMode::Headers` 映射为 TUI `AuthMode::Headers`，因此已有的外部 header auth 可以被 onboarding 正确认出；它不是新增的可选登录按钮。[E: codex-rs/tui/src/onboarding/auth.rs:883][E: codex-rs/tui/src/onboarding/auth.rs:884][E: codex-rs/tui/src/onboarding/auth.rs:885][E: codex-rs/tui/src/onboarding/auth.rs:886][E: codex-rs/tui/src/onboarding/auth.rs:962]

## Gotchas

- onboarding loop 复用同一个 `Tui` 和 `TuiEventStream`，不是 main app loop 的一个 `AppEvent` 分支。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:484][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:502]
- trust 写入依赖 app-server request handle；没有 handle 时会返回 app server unavailable 错误并留在 widget error path。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:638][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:642]
- first-login 延迟 composer 是 conservative check；任何既有 auth/config/daemon 痕迹都会让 composer 立刻出现。[E: codex-rs/tui/src/startup_preflight.rs:22][E: codex-rs/tui/src/startup_preflight.rs:69]

## Sources

- `codex-rs/tui/src/onboarding/onboarding_screen.rs`
- `codex-rs/tui/src/onboarding/auth.rs`
- `codex-rs/tui/src/onboarding/trust_directory.rs`
- `codex-rs/tui/src/startup_orchestration.rs`
- `codex-rs/tui/src/startup_preflight.rs`
- `codex-rs/tui/src/startup_draft.rs`

## 相关

- `subsys.config-auth.auth-flows`: app-server/account auth 的非 TUI 侧。
- `subsys.config-auth.config-loading`: trusted project/config 持久化背景。
- `subsys.tui.architecture`: startup draft 与 `App::run` 的衔接。
