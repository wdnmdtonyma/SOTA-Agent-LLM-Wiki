---
id: subsys.tui.onboarding
title: TUI Onboarding
kind: subsystem
tier: T2
source: [codex-rs/tui/src/onboarding/onboarding_screen.rs, codex-rs/tui/src/onboarding/auth.rs, codex-rs/tui/src/onboarding/trust_directory.rs, codex-rs/tui/src/onboarding/directory_trust.rs, codex-rs/tui/src/lib.rs, codex-rs/tui/src/app/resume_config.rs, codex-rs/tui/src/startup_orchestration.rs, codex-rs/tui/src/startup_preflight.rs, codex-rs/tui/src/startup_draft.rs]
symbols: [OnboardingScreen, OnboardingScreenArgs, OnboardingResult, run_onboarding_app, check_directory_trust, AuthModeWidget, TrustDirectoryWidget, should_delay_startup_composer_for_first_login]
related: [subsys.config-auth.auth-flows, subsys.config-auth.config-loading, subsys.tui.architecture, spine.process-lifecycle]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> Onboarding 是 TUI 启动前/启动中的一个独立 screen loop：它接收 `OnboardingScreenArgs`、可选 app-server session、和现有 `Tui`，返回是否持久化 trust 以及用户是否选择退出。first-login 时 `StartupDraft` 会把初始 surface 设为 `Onboarding`，先不画 composer。创建或 resume TUI task 还会在 picker 解析 destination 之后再跑 `check_directory_trust`，不是只在首次 onboarding 问一次。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:99][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:514][E: codex-rs/tui/src/startup_draft.rs:272][E: codex-rs/tui/src/startup_orchestration.rs:182][E: codex-rs/tui/src/lib.rs:1707][E: codex-rs/tui/src/onboarding/directory_trust.rs:33]

## 能回答的问题

- onboarding loop 如何读取 TUI events 并重绘？
- 首次登录为什么会延迟 composer？
- 创建或 resume TUI task 时 folder consent 在什么时候跑？
- trust directory 的选择何时写回 app-server/config？
- auth widget 如何处理 browser/device-code/API-key 路径？
- ChatGPT login success 为什么会做一次 terminal clear？

## Screen Loop

`OnboardingScreen` 保存 frame requester、steps、done/exit 状态；args 决定是否显示 trust/login screen、登录状态、app-server request handle 和 config。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:87][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:95][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:97][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:101]

`run_onboarding_app` 创建 screen 后交给 `run_onboarding_screen`：先 draw，再 `discard_pending_input_before_interactive_screen`，然后 pin `tui.event_stream()`；select loop 处理 key、paste、draw/resume/resize，key 分支后尝试持久化 trust。trust step 刚激活时也会先渲染再丢掉上一屏残留按键。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:520][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:535][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:539][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:540][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:550][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:626]

ChatGPT success message 后有一次 guard：检测 auth step 的 `SignInState::ChatGptSuccessMessage`，重置 SGR attributes/colors 并 clear terminal，避免成功消息残留样式污染后续 screen。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:567][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:571][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:594][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:595]

## First-login 延迟 composer

`startup_orchestration` 把 `StartupDraftInitialScreen` 设为 `Onboarding` 的条件是：没有 resume/fork/`agents_overview` picker、没有 OSS/remote endpoint、可复用 implicit local daemon 或 search-only override、没有 packaged defaults，且 `should_delay_startup_composer_for_first_login` 为真。`StartupDraft::show_initial_screen` 因此不会先画 composer；onboarding 结束后 `StartupDraftPump::show` 才揭示可编辑 composer。[E: codex-rs/tui/src/startup_orchestration.rs:171][E: codex-rs/tui/src/startup_orchestration.rs:173][E: codex-rs/tui/src/startup_orchestration.rs:175][E: codex-rs/tui/src/startup_orchestration.rs:174][E: codex-rs/tui/src/startup_orchestration.rs:175][E: codex-rs/tui/src/startup_orchestration.rs:182][E: codex-rs/tui/src/startup_draft.rs:272][E: codex-rs/tui/src/startup_draft.rs:280]

`should_delay_startup_composer_for_first_login` 只在默认文件账户尚未能认证时返回 true：环境 token、系统 config、`codex_home` 状态文件、daemon socket 或 managed configuration 任一存在，都会立即显示 composer。[E: codex-rs/tui/src/startup_preflight.rs:22][E: codex-rs/tui/src/startup_preflight.rs:28][E: codex-rs/tui/src/startup_preflight.rs:48][E: codex-rs/tui/src/startup_preflight.rs:69]

## Folder Consent

创建或 resume TUI task 之前，`tui/src/lib.rs` 在 picker 已经解析 `session_selection` 并经 `resolve_startup_resume_or_fork_cwd` / config reload 得到 destination 之后调用 `check_directory_trust`。[E: codex-rs/tui/src/lib.rs:1548][E: codex-rs/tui/src/lib.rs:1596][E: codex-rs/tui/src/lib.rs:1707]

`check_directory_trust` 对当前 cwd（以及 local daemon resume 时 thread 已保存但与当前不同的 cwd）逐个查 trust；未信任则弹出 `TrustDirectoryWidget`。[E: codex-rs/tui/src/onboarding/directory_trust.rs:33][E: codex-rs/tui/src/onboarding/directory_trust.rs:45][E: codex-rs/tui/src/onboarding/directory_trust.rs:105]

Local daemon resume 在用户同意后会 `ThreadRead` 再取最新 thread cwd 并入队重查，因为 consent 期间另一个 client 可能把该 task 开到别的 folder。[E: codex-rs/tui/src/onboarding/directory_trust.rs:138][E: codex-rs/tui/src/onboarding/directory_trust.rs:143][E: codex-rs/tui/src/onboarding/directory_trust.rs:155]

命令中心 / in-app resume 走同一函数：`resume_config_for_target` 先解析 resume cwd，再 `confirm_directory_trust` → `check_directory_trust`。[E: codex-rs/tui/src/app/resume_config.rs:132][E: codex-rs/tui/src/app/resume_config.rs:145][E: codex-rs/tui/src/app/resume_config.rs:163]

## Trust Directory

`TrustDirectoryWidget` 保存 cwd、trust target、Windows sandbox hint、quit flag、selection、highlighted option 和 error；selection 只有 `Trust`/`Quit`。[E: codex-rs/tui/src/onboarding/trust_directory.rs:26][E: codex-rs/tui/src/onboarding/trust_directory.rs:46]

confirm key 调用 `handle_trust` 或 `handle_quit`；trust 会写 selection 并清 error，quit 会设置 `should_quit`。[E: codex-rs/tui/src/onboarding/trust_directory.rs:205][E: codex-rs/tui/src/onboarding/trust_directory.rs:211]

持久化 trust 不是 widget 自己写文件；`persist_selected_trust` 在 screen steps 里找到 `TrustDirectorySelection::Trust`，再通过 app-server request handle 调用 `write_trusted_project`（或 remote `config/batchWrite`），失败时写入 widget error 并 log。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:660][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:670][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:707][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:710]

## Auth Widget

`AuthModeWidget` 保存 frame requester、highlighted sign-in option、error、sign-in state、login status、app-server request handle、auth config 和 animation flags。[E: codex-rs/tui/src/onboarding/auth.rs:253]

API key path 的 save 会发送 `ClientRequest::LoginAccount { LoginAccountParams::ApiKey }`。[E: codex-rs/tui/src/onboarding/auth.rs:880]

browser login 现在显式请求非 streamlined 的本地完成页：`app_brand=None`、`codex_streamlined_login=false`、`use_hosted_login_success_page=false`。account 更新也会把 protocol 的 `ApiAuthMode::Headers` 映射为 TUI `AuthMode::Headers`，因此已有的外部 header auth 可以被 onboarding 正确认出；它不是新增的可选登录按钮。[E: codex-rs/tui/src/onboarding/auth.rs:942][E: codex-rs/tui/src/onboarding/auth.rs:943][E: codex-rs/tui/src/onboarding/auth.rs:944][E: codex-rs/tui/src/onboarding/auth.rs:945][E: codex-rs/tui/src/onboarding/auth.rs:1021]

## Gotchas

- onboarding loop 复用同一个 `Tui` 和 `TuiEventStream`，不是 main app loop 的一个 `AppEvent` 分支。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:514][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:540]
- folder consent 会在每次 create/resume destination 解析后再跑；不要把它写成只在 first-login onboarding 出现一次。[E: codex-rs/tui/src/lib.rs:1707][E: codex-rs/tui/src/app/resume_config.rs:163]
- trust 写入依赖 app-server request handle；没有 handle 时会返回 app server unavailable 错误并留在 widget error path。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:710]
- first-login 延迟 composer 是 conservative check；任何既有 auth/config/daemon 痕迹都会让 composer 立刻出现。[E: codex-rs/tui/src/startup_preflight.rs:22][E: codex-rs/tui/src/startup_preflight.rs:69]

## Sources

- `codex-rs/tui/src/onboarding/onboarding_screen.rs`
- `codex-rs/tui/src/onboarding/auth.rs`
- `codex-rs/tui/src/onboarding/trust_directory.rs`
- `codex-rs/tui/src/onboarding/directory_trust.rs`
- `codex-rs/tui/src/lib.rs`
- `codex-rs/tui/src/app/resume_config.rs`
- `codex-rs/tui/src/startup_orchestration.rs`
- `codex-rs/tui/src/startup_preflight.rs`
- `codex-rs/tui/src/startup_draft.rs`

## 相关

- `subsys.config-auth.auth-flows`: app-server/account auth 的非 TUI 侧。
- `subsys.config-auth.config-loading`: trusted project/config 持久化背景。
- `subsys.tui.architecture`: startup draft 与 `App::run` 的衔接。
- `spine.process-lifecycle`: TUI create/resume 在 spawn thread 之前的 folder consent 门。
