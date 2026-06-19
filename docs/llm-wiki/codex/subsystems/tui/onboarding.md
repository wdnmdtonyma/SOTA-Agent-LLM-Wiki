---
id: subsys.tui.onboarding
title: TUI Onboarding
kind: subsystem
tier: T2
source: [codex-rs/tui/src/onboarding/onboarding_screen.rs, codex-rs/tui/src/onboarding/auth.rs, codex-rs/tui/src/onboarding/trust_directory.rs]
symbols: [OnboardingScreen, OnboardingScreenArgs, OnboardingResult, run_onboarding_app, AuthModeWidget, TrustDirectoryWidget]
related: [subsys.config-auth.auth-flows, subsys.config-auth.config-loading, subsys.tui.architecture]
evidence: explicit
status: verified
updated: 5670360009
---

> Onboarding 是 TUI 启动前/启动中的一个独立 screen loop：它接收 `OnboardingScreenArgs`、可选 app-server session、和现有 `Tui`，返回是否持久化 trust 以及用户是否选择退出。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:83][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:91][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:474][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:476][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:477][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:571]

## 能回答的问题

- onboarding loop 如何读取 TUI events 并重绘？
- trust directory 的选择何时写回 app-server/config？
- auth widget 如何处理 browser/device-code/API-key 路径？
- ChatGPT login success 为什么会做一次 terminal clear？

## Screen Loop

`OnboardingScreen` 保存 frame requester、steps、done/exit 状态；args 决定是否显示 trust/login screen、登录状态、app-server request handle 和 config。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:76][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:77][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:78][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:79][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:80][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:83][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:84][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:85][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:86][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:87]

`run_onboarding_app` 创建 screen 后先 draw，再 pin `tui.event_stream()`；select loop 处理 key、paste、draw/resize，key 分支后尝试持久化 trust，draw/resize 分支重绘 screen。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:481][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:482][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:487][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:491][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:494][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:495][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:499][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:500][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:501][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:509][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:512][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:543]

ChatGPT success message 后有一次 guard：检测 auth step 的 `SignInState::ChatGptSuccessMessage`，重置 SGR attributes/colors 并 clear terminal，避免成功消息残留样式污染后续 screen。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:513][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:516][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:517][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:524][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:525][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:533][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:540][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:541]

## Trust Directory

`TrustDirectoryWidget` 保存 cwd、trust target、Windows sandbox hint、quit flag、selection、highlighted option 和 error；selection 只有 `Trust`/`Quit`。[E: codex-rs/tui/src/onboarding/trust_directory.rs:25][E: codex-rs/tui/src/onboarding/trust_directory.rs:26][E: codex-rs/tui/src/onboarding/trust_directory.rs:27][E: codex-rs/tui/src/onboarding/trust_directory.rs:28][E: codex-rs/tui/src/onboarding/trust_directory.rs:29][E: codex-rs/tui/src/onboarding/trust_directory.rs:30][E: codex-rs/tui/src/onboarding/trust_directory.rs:31][E: codex-rs/tui/src/onboarding/trust_directory.rs:35]

confirm key 调用 `handle_trust` 或 `handle_quit`；trust 会写 selection 并清 error，quit 会设置 `should_quit`。StepState 在 selection 或 quit 后变 complete。[E: codex-rs/tui/src/onboarding/trust_directory.rs:145][E: codex-rs/tui/src/onboarding/trust_directory.rs:147][E: codex-rs/tui/src/onboarding/trust_directory.rs:148][E: codex-rs/tui/src/onboarding/trust_directory.rs:154][E: codex-rs/tui/src/onboarding/trust_directory.rs:156][E: codex-rs/tui/src/onboarding/trust_directory.rs:164][E: codex-rs/tui/src/onboarding/trust_directory.rs:168][E: codex-rs/tui/src/onboarding/trust_directory.rs:171][E: codex-rs/tui/src/onboarding/trust_directory.rs:173]

持久化 trust 不是 widget 自己写文件；`persist_selected_trust` 在 screen steps 里找到 `TrustDirectorySelection::Trust`，再通过 app-server request handle 调用 `write_trusted_project`，失败时写入 widget error 并 log。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:577][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:581][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:586][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:587][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:597][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:598][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:604][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:607]

## Auth Widget

`AuthModeWidget` 保存 frame requester、highlighted sign-in option、error、sign-in state、login status、app-server request handle、forced login method 和 animation flags。[E: codex-rs/tui/src/onboarding/auth.rs:225][E: codex-rs/tui/src/onboarding/auth.rs:227][E: codex-rs/tui/src/onboarding/auth.rs:228][E: codex-rs/tui/src/onboarding/auth.rs:229][E: codex-rs/tui/src/onboarding/auth.rs:230][E: codex-rs/tui/src/onboarding/auth.rs:231][E: codex-rs/tui/src/onboarding/auth.rs:232][E: codex-rs/tui/src/onboarding/auth.rs:233][E: codex-rs/tui/src/onboarding/auth.rs:234][E: codex-rs/tui/src/onboarding/auth.rs:235]

browser/device-code state 会 suppress animations；取消 active browser login 会通过 app-server handle 异步 `cancel_login_attempt`。[E: codex-rs/tui/src/onboarding/auth.rs:244][E: codex-rs/tui/src/onboarding/auth.rs:245][E: codex-rs/tui/src/onboarding/auth.rs:247][E: codex-rs/tui/src/onboarding/auth.rs:251][E: codex-rs/tui/src/onboarding/auth.rs:254][E: codex-rs/tui/src/onboarding/auth.rs:255][E: codex-rs/tui/src/onboarding/auth.rs:257][E: codex-rs/tui/src/onboarding/auth.rs:258]

API key path 有三段：paste/edit 会填充或追加 `ApiKeyEntry` state，start entry 会从 env 预填，save 会发送 `ClientRequest::LoginAccount { LoginAccountParams::ApiKey }` 并在成功后把 state 设为 configured。[E: codex-rs/tui/src/onboarding/auth.rs:748][E: codex-rs/tui/src/onboarding/auth.rs:752][E: codex-rs/tui/src/onboarding/auth.rs:753][E: codex-rs/tui/src/onboarding/auth.rs:755][E: codex-rs/tui/src/onboarding/auth.rs:770][E: codex-rs/tui/src/onboarding/auth.rs:776][E: codex-rs/tui/src/onboarding/auth.rs:790][E: codex-rs/tui/src/onboarding/auth.rs:800][E: codex-rs/tui/src/onboarding/auth.rs:812][E: codex-rs/tui/src/onboarding/auth.rs:814][E: codex-rs/tui/src/onboarding/auth.rs:822]

## Gotchas

- onboarding loop 复用同一个 `Tui` 和 `TuiEventStream`，不是 main app loop 的一个 `AppEvent` 分支。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:474][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:491]
- trust 写入依赖 app-server request handle；没有 handle 时会返回 app server unavailable 错误并留在 widget error path。[E: codex-rs/tui/src/onboarding/onboarding_screen.rs:597][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:601][E: codex-rs/tui/src/onboarding/onboarding_screen.rs:607]

## Sources

- `codex-rs/tui/src/onboarding/onboarding_screen.rs`
- `codex-rs/tui/src/onboarding/auth.rs`
- `codex-rs/tui/src/onboarding/trust_directory.rs`

## 相关

- `subsys.config-auth.auth-flows`: app-server/account auth 的非 TUI 侧。
- `subsys.config-auth.config-loading`: trusted project/config 持久化背景。
