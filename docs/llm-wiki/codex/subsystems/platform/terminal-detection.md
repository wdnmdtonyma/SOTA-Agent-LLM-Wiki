---
id: subsys.platform.terminal-detection
title: 终端探测
kind: subsystem
tier: T2
source: [codex-rs/terminal-detection/src/lib.rs, codex-rs/terminal-detection/src/terminal_tests.rs]
symbols: [TerminalInfo, TerminalName, Multiplexer, terminal_info, user_agent, detect_terminal_info_from_env, detect_multiplexer]
related: [cli.global-flags, subsys.tui.architecture]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex_terminal_detection` 从 process environment 和 tmux client term metadata 推导 terminal name/version/TERM/multiplexer，并把结果格式化为 sanitized User-Agent token；源码注释说明该 metadata 同时服务 OpenTelemetry user-agent logging 与 TUI terminal-specific configuration choices。[E: codex-rs/terminal-detection/src/lib.rs:3][E: codex-rs/terminal-detection/src/lib.rs:4][E: codex-rs/terminal-detection/src/lib.rs:10][E: codex-rs/terminal-detection/src/lib.rs:205][E: codex-rs/terminal-detection/src/lib.rs:264][E: codex-rs/terminal-detection/src/lib.rs:289][E: codex-rs/terminal-detection/src/lib.rs:291][E: codex-rs/terminal-detection/src/lib.rs:462][E: codex-rs/terminal-detection/src/lib.rs:463][E: codex-rs/terminal-detection/src/lib.rs:468]

## 能回答的问题

- `TerminalInfo`、`TerminalName`、`Multiplexer` 和 tmux client helper 的真实字段是什么？
- detection order 如何处理 `TERM_PROGRAM=tmux`、普通 `TERM_PROGRAM`、terminal-specific env vars、`TERM` fallback 和 unknown？
- tmux 与 zellij multiplexer 分别由哪些 env vars 识别？
- User-Agent token 怎样从 terminal info 生成并 sanitize？
- terminal detection tests 如何用 fake env 覆盖 priority 与具体 terminal cases？

## 数据模型

`TerminalInfo` 字段只有 name、term_program、version、term 和 multiplexer；tmux client termtype/termname 不存进 `TerminalInfo`，只作为 detection 阶段的输入。[E: codex-rs/terminal-detection/src/lib.rs:10][E: codex-rs/terminal-detection/src/lib.rs:12][E: codex-rs/terminal-detection/src/lib.rs:14][E: codex-rs/terminal-detection/src/lib.rs:16][E: codex-rs/terminal-detection/src/lib.rs:18][E: codex-rs/terminal-detection/src/lib.rs:20][E: codex-rs/terminal-detection/src/lib.rs:81][E: codex-rs/terminal-detection/src/lib.rs:82][E: codex-rs/terminal-detection/src/lib.rs:83]

`TerminalName` 覆盖 AppleTerminal、Ghostty、Iterm2、WarpTerminal、VsCode、WezTerm、Kitty、Alacritty、Konsole、GnomeTerminal、Vte、WindowsTerminal、Dumb 和 Unknown。[E: codex-rs/terminal-detection/src/lib.rs:25][E: codex-rs/terminal-detection/src/lib.rs:27][E: codex-rs/terminal-detection/src/lib.rs:29][E: codex-rs/terminal-detection/src/lib.rs:31][E: codex-rs/terminal-detection/src/lib.rs:33][E: codex-rs/terminal-detection/src/lib.rs:35][E: codex-rs/terminal-detection/src/lib.rs:37][E: codex-rs/terminal-detection/src/lib.rs:39][E: codex-rs/terminal-detection/src/lib.rs:41][E: codex-rs/terminal-detection/src/lib.rs:43][E: codex-rs/terminal-detection/src/lib.rs:45][E: codex-rs/terminal-detection/src/lib.rs:47][E: codex-rs/terminal-detection/src/lib.rs:49][E: codex-rs/terminal-detection/src/lib.rs:51][E: codex-rs/terminal-detection/src/lib.rs:53] `Multiplexer` variants 是 `Tmux { version }` 和 `Zellij {}`，tmux version 来自 `TERM_PROGRAM_VERSION` 但只在 `TERM_PROGRAM=tmux` 时读取。[E: codex-rs/terminal-detection/src/lib.rs:58][E: codex-rs/terminal-detection/src/lib.rs:60][E: codex-rs/terminal-detection/src/lib.rs:64][E: codex-rs/terminal-detection/src/lib.rs:67][E: codex-rs/terminal-detection/src/lib.rs:422][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:424][E: codex-rs/terminal-detection/src/lib.rs:428]

`terminal_info()` 使用 `OnceLock<TerminalInfo>` cache 当前 process 的 detected result；`user_agent()` 直接调用 cached `terminal_info().user_agent_token()`。[E: codex-rs/terminal-detection/src/lib.rs:214][E: codex-rs/terminal-detection/src/lib.rs:263][E: codex-rs/terminal-detection/src/lib.rs:264][E: codex-rs/terminal-detection/src/lib.rs:268][E: codex-rs/terminal-detection/src/lib.rs:269][E: codex-rs/terminal-detection/src/lib.rs:270]

## Detection flow

`detect_terminal_info_from_env` 先调用 `detect_multiplexer`，所以后续 terminal 分支都会携带 tmux/zellij metadata。[E: codex-rs/terminal-detection/src/lib.rs:288][E: codex-rs/terminal-detection/src/lib.rs:289] 如果存在非空 `TERM_PROGRAM`，只有 `TERM_PROGRAM=tmux`、multiplexer 是 tmux、且 tmux client info 能生成 terminal 时，才返回 tmux client terminal；否则普通非空 `TERM_PROGRAM` 分支直接返回并会 mask 后续 probes。[E: codex-rs/terminal-detection/src/lib.rs:291][E: codex-rs/terminal-detection/src/lib.rs:292][E: codex-rs/terminal-detection/src/lib.rs:293][E: codex-rs/terminal-detection/src/lib.rs:294][E: codex-rs/terminal-detection/src/lib.rs:295][E: codex-rs/terminal-detection/src/lib.rs:297][E: codex-rs/terminal-detection/src/lib.rs:300][E: codex-rs/terminal-detection/src/lib.rs:301][E: codex-rs/terminal-detection/src/lib.rs:302]

普通非空 `TERM_PROGRAM` 不存在时，detection 按 WEZTERM_VERSION、ITERM_SESSION_ID/ITERM_PROFILE/ITERM_PROFILE_NAME、TERM_SESSION_ID、KITTY_WINDOW_ID 或含 kitty 的 TERM、ALACRITTY_SOCKET 或 TERM=alacritty、KONSOLE_VERSION、GNOME_TERMINAL_SCREEN、VTE_VERSION、WT_SESSION、TERM fallback、unknown 的顺序返回。[E: codex-rs/terminal-detection/src/lib.rs:305][E: codex-rs/terminal-detection/src/lib.rs:310][E: codex-rs/terminal-detection/src/lib.rs:314][E: codex-rs/terminal-detection/src/lib.rs:322][E: codex-rs/terminal-detection/src/lib.rs:324][E: codex-rs/terminal-detection/src/lib.rs:331][E: codex-rs/terminal-detection/src/lib.rs:333][E: codex-rs/terminal-detection/src/lib.rs:344][E: codex-rs/terminal-detection/src/lib.rs:349][E: codex-rs/terminal-detection/src/lib.rs:357][E: codex-rs/terminal-detection/src/lib.rs:362][E: codex-rs/terminal-detection/src/lib.rs:370][E: codex-rs/terminal-detection/src/lib.rs:374]

`detect_multiplexer` 通过非空 `TMUX` 或 `TMUX_PANE` 识别 tmux，通过非空 `ZELLIJ`、`ZELLIJ_SESSION_NAME` 或 `ZELLIJ_VERSION` 识别 zellij；都没有时返回 `None`。[E: codex-rs/terminal-detection/src/lib.rs:377][E: codex-rs/terminal-detection/src/lib.rs:378][E: codex-rs/terminal-detection/src/lib.rs:379][E: codex-rs/terminal-detection/src/lib.rs:384][E: codex-rs/terminal-detection/src/lib.rs:385][E: codex-rs/terminal-detection/src/lib.rs:386][E: codex-rs/terminal-detection/src/lib.rs:388][E: codex-rs/terminal-detection/src/lib.rs:391]

tmux client helper 只执行 `tmux display-message -p #{client_termtype}` 和 `tmux display-message -p #{client_termname}`；`terminal_from_tmux_client_info` 优先把 termtype split 成 program/version，并把 termname 作为 TERM capability string，termtype 缺失时才只用 termname fallback。[E: codex-rs/terminal-detection/src/lib.rs:398][E: codex-rs/terminal-detection/src/lib.rs:402][E: codex-rs/terminal-detection/src/lib.rs:403][E: codex-rs/terminal-detection/src/lib.rs:405][E: codex-rs/terminal-detection/src/lib.rs:406][E: codex-rs/terminal-detection/src/lib.rs:409][E: codex-rs/terminal-detection/src/lib.rs:410][E: codex-rs/terminal-detection/src/lib.rs:411][E: codex-rs/terminal-detection/src/lib.rs:412][E: codex-rs/terminal-detection/src/lib.rs:413][E: codex-rs/terminal-detection/src/lib.rs:417][E: codex-rs/terminal-detection/src/lib.rs:419][E: codex-rs/terminal-detection/src/lib.rs:431][E: codex-rs/terminal-detection/src/lib.rs:432][E: codex-rs/terminal-detection/src/lib.rs:433][E: codex-rs/terminal-detection/src/lib.rs:434][E: codex-rs/terminal-detection/src/lib.rs:435][E: codex-rs/terminal-detection/src/lib.rs:438][E: codex-rs/terminal-detection/src/lib.rs:439][E: codex-rs/terminal-detection/src/lib.rs:440][E: codex-rs/terminal-detection/src/lib.rs:445][E: codex-rs/terminal-detection/src/lib.rs:446][E: codex-rs/terminal-detection/src/lib.rs:447]

## User-Agent formatting

`TerminalInfo::user_agent_token` 优先使用 `term_program[/version]`，没有 term_program 时使用非空 `term`，再 fallback 到 `TerminalName`-specific token；最后统一调用 `sanitize_header_value`。[E: codex-rs/terminal-detection/src/lib.rs:174][E: codex-rs/terminal-detection/src/lib.rs:175][E: codex-rs/terminal-detection/src/lib.rs:177][E: codex-rs/terminal-detection/src/lib.rs:180][E: codex-rs/terminal-detection/src/lib.rs:183][E: codex-rs/terminal-detection/src/lib.rs:205] `sanitize_header_value` 把不属于 ASCII alphanumeric、`-`、`_`、`.`、`/` 的字符替换为 `_`。[E: codex-rs/terminal-detection/src/lib.rs:462][E: codex-rs/terminal-detection/src/lib.rs:463][E: codex-rs/terminal-detection/src/lib.rs:467][E: codex-rs/terminal-detection/src/lib.rs:468]

`terminal_name_from_term_program` 会 trim、删除空格/连字符/下划线/点号并转小写后匹配 known terminal names；`format_terminal_version` 才是 name/version formatting helper。[E: codex-rs/terminal-detection/src/lib.rs:471][E: codex-rs/terminal-detection/src/lib.rs:473][E: codex-rs/terminal-detection/src/lib.rs:475][E: codex-rs/terminal-detection/src/lib.rs:476][E: codex-rs/terminal-detection/src/lib.rs:480][E: codex-rs/terminal-detection/src/lib.rs:481][E: codex-rs/terminal-detection/src/lib.rs:482][E: codex-rs/terminal-detection/src/lib.rs:483][E: codex-rs/terminal-detection/src/lib.rs:484][E: codex-rs/terminal-detection/src/lib.rs:485][E: codex-rs/terminal-detection/src/lib.rs:486][E: codex-rs/terminal-detection/src/lib.rs:487][E: codex-rs/terminal-detection/src/lib.rs:488][E: codex-rs/terminal-detection/src/lib.rs:489][E: codex-rs/terminal-detection/src/lib.rs:490][E: codex-rs/terminal-detection/src/lib.rs:491][E: codex-rs/terminal-detection/src/lib.rs:492][E: codex-rs/terminal-detection/src/lib.rs:497][E: codex-rs/terminal-detection/src/lib.rs:499][E: codex-rs/terminal-detection/src/lib.rs:500]

## Tests

`terminal_tests.rs` 的 `FakeEnvironment` 保存 vars 和 `TmuxClientInfo`，并提供 `with_tmux_client_info` 注入 termtype/termname。[E: codex-rs/terminal-detection/src/terminal_tests.rs:5][E: codex-rs/terminal-detection/src/terminal_tests.rs:6][E: codex-rs/terminal-detection/src/terminal_tests.rs:7][E: codex-rs/terminal-detection/src/terminal_tests.rs:23][E: codex-rs/terminal-detection/src/terminal_tests.rs:24][E: codex-rs/terminal-detection/src/terminal_tests.rs:25][E: codex-rs/terminal-detection/src/terminal_tests.rs:26]

tests 覆盖 `TERM_PROGRAM` 优先级、tmux client terminal、zellij multiplexer、Apple Terminal、Ghostty 和 VSCode 等 cases；例如 `TERM_PROGRAM=iTerm.app` 会盖过 `WEZTERM_VERSION`，zellij case 断言 `multiplexer: Some(Multiplexer::Zellij {})`。[E: codex-rs/terminal-detection/src/terminal_tests.rs:61][E: codex-rs/terminal-detection/src/terminal_tests.rs:63][E: codex-rs/terminal-detection/src/terminal_tests.rs:103][E: codex-rs/terminal-detection/src/terminal_tests.rs:105][E: codex-rs/terminal-detection/src/terminal_tests.rs:110][E: codex-rs/terminal-detection/src/terminal_tests.rs:116][E: codex-rs/terminal-detection/src/terminal_tests.rs:170][E: codex-rs/terminal-detection/src/terminal_tests.rs:175][E: codex-rs/terminal-detection/src/terminal_tests.rs:189][E: codex-rs/terminal-detection/src/terminal_tests.rs:194][E: codex-rs/terminal-detection/src/terminal_tests.rs:211][E: codex-rs/terminal-detection/src/terminal_tests.rs:216][E: codex-rs/terminal-detection/src/terminal_tests.rs:234][E: codex-rs/terminal-detection/src/terminal_tests.rs:240][E: codex-rs/terminal-detection/src/terminal_tests.rs:242][E: codex-rs/terminal-detection/src/terminal_tests.rs:283][E: codex-rs/terminal-detection/src/terminal_tests.rs:284][E: codex-rs/terminal-detection/src/terminal_tests.rs:289][E: codex-rs/terminal-detection/src/terminal_tests.rs:290][E: codex-rs/terminal-detection/src/terminal_tests.rs:291][E: codex-rs/terminal-detection/src/terminal_tests.rs:292][E: codex-rs/terminal-detection/src/terminal_tests.rs:293][E: codex-rs/terminal-detection/src/terminal_tests.rs:306][E: codex-rs/terminal-detection/src/terminal_tests.rs:315]

## 设计动机与权衡

terminal detection 优先使用非空 `TERM_PROGRAM` 和显式 vendor env vars，再 fallback 到 generic `TERM`，是为了在现代 terminal 中得到更具体的 product token，同时保留未知环境的可用性。[I] 该结论由 detection order 注释与 `detect_terminal_info_from_env` 分支顺序共同支撑。[E: codex-rs/terminal-detection/src/lib.rs:276][E: codex-rs/terminal-detection/src/lib.rs:280][E: codex-rs/terminal-detection/src/lib.rs:282][E: codex-rs/terminal-detection/src/lib.rs:283][E: codex-rs/terminal-detection/src/lib.rs:291][E: codex-rs/terminal-detection/src/lib.rs:305][E: codex-rs/terminal-detection/src/lib.rs:370]

tmux client term metadata 只在非空 `TERM_PROGRAM=tmux` 且 tmux multiplexer active 时覆盖 terminal identity，说明实现想把 tmux session 归因到 underlying terminal，但避免在普通 shell 或非 tmux `TERM_PROGRAM` 下执行 tmux-specific interpretation。[I] 该结论由 `TERM_PROGRAM=tmux` guard 和 tmux client info branch 支撑。[E: codex-rs/terminal-detection/src/lib.rs:291][E: codex-rs/terminal-detection/src/lib.rs:292][E: codex-rs/terminal-detection/src/lib.rs:293][E: codex-rs/terminal-detection/src/lib.rs:294][E: codex-rs/terminal-detection/src/lib.rs:295][E: codex-rs/terminal-detection/src/lib.rs:297]

## Gotchas

- 非空 `TERM_PROGRAM` 会 mask WEZTERM、WT_SESSION 等后续 probes，除非 `TERM_PROGRAM=tmux` 且 tmux client info 可用。[E: codex-rs/terminal-detection/src/lib.rs:291][E: codex-rs/terminal-detection/src/lib.rs:292][E: codex-rs/terminal-detection/src/lib.rs:293][E: codex-rs/terminal-detection/src/lib.rs:294][E: codex-rs/terminal-detection/src/lib.rs:295][E: codex-rs/terminal-detection/src/lib.rs:297][E: codex-rs/terminal-detection/src/lib.rs:300][E: codex-rs/terminal-detection/src/lib.rs:302]
- `TerminalName::Unknown` 不等于没有 terminal metadata；`TERM` fallback 会产生 `TerminalInfo::from_term(term, multiplexer)`，tmux termtype 也可能映射成 Unknown name 但保留 term_program/term。[E: codex-rs/terminal-detection/src/lib.rs:370][E: codex-rs/terminal-detection/src/lib.rs:371][E: codex-rs/terminal-detection/src/lib.rs:407][E: codex-rs/terminal-detection/src/lib.rs:409][E: codex-rs/terminal-detection/src/lib.rs:410][E: codex-rs/terminal-detection/src/lib.rs:411][E: codex-rs/terminal-detection/src/lib.rs:412]
- public `terminal_info()` 使用 `OnceLock` cache；同一 process 里修改 env 后不会刷新 cached result。[I] 该结论由 one-time `get_or_init` cache 语义支撑。[E: codex-rs/terminal-detection/src/lib.rs:214][E: codex-rs/terminal-detection/src/lib.rs:268][E: codex-rs/terminal-detection/src/lib.rs:269][E: codex-rs/terminal-detection/src/lib.rs:270]

## Sources

- `codex-rs/terminal-detection/src/lib.rs`
- `codex-rs/terminal-detection/src/terminal_tests.rs`

## 相关

- `cli.global-flags`: CLI 运行环境与 user agent/terminal metadata 的入口。
- `subsys.tui.architecture`: TUI 运行在 detected terminal 环境中。
