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
updated: 02a8f038b8
---

> `codex_terminal_detection` 从 process environment 和 tmux client term metadata 推导 terminal name/version/TERM/multiplexer，并把结果格式化为 sanitized User-Agent token；源码注释说明该 metadata 同时服务 OpenTelemetry user-agent logging 与 TUI terminal-specific configuration choices。[E: codex-rs/terminal-detection/src/lib.rs:11][E: codex-rs/terminal-detection/src/lib.rs:253][E: codex-rs/terminal-detection/src/lib.rs:254][E: codex-rs/terminal-detection/src/lib.rs:260][E: codex-rs/terminal-detection/src/lib.rs:360][E: codex-rs/terminal-detection/src/lib.rs:418][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:375][E: codex-rs/terminal-detection/src/lib.rs:375][E: codex-rs/terminal-detection/src/lib.rs:380][I]

## 能回答的问题

- `TerminalInfo`、`TerminalName`、`Multiplexer` 和 tmux client helper 的真实字段是什么？
- detection order 如何处理 `TERM_PROGRAM=tmux`、普通 `TERM_PROGRAM`、terminal-specific env vars、`TERM` fallback 和 unknown？
- tmux 与 zellij multiplexer 分别由哪些 env vars 识别？
- User-Agent token 怎样从 terminal info 生成并 sanitize？
- terminal detection tests 如何用 fake env 覆盖 priority 与具体 terminal cases？

## 数据模型

`TerminalInfo` 字段只有 name、term_program、version、term 和 multiplexer；tmux client termtype/termname 不存进 `TerminalInfo`，只作为 detection 阶段的输入。[E: codex-rs/terminal-detection/src/lib.rs:11][E: codex-rs/terminal-detection/src/lib.rs:13][E: codex-rs/terminal-detection/src/lib.rs:15][E: codex-rs/terminal-detection/src/lib.rs:17][E: codex-rs/terminal-detection/src/lib.rs:19][E: codex-rs/terminal-detection/src/lib.rs:21][E: codex-rs/terminal-detection/src/lib.rs:84][E: codex-rs/terminal-detection/src/lib.rs:83]

`TerminalName` 覆盖 AppleTerminal、Ghostty、Iterm2、WarpTerminal、VsCode、WezTerm、Kitty、Alacritty、Konsole、GnomeTerminal、Vte、WindowsTerminal、Dumb 和 Unknown。[E: codex-rs/terminal-detection/src/lib.rs:26][E: codex-rs/terminal-detection/src/lib.rs:28][E: codex-rs/terminal-detection/src/lib.rs:30][E: codex-rs/terminal-detection/src/lib.rs:32][E: codex-rs/terminal-detection/src/lib.rs:34][E: codex-rs/terminal-detection/src/lib.rs:36][E: codex-rs/terminal-detection/src/lib.rs:38][E: codex-rs/terminal-detection/src/lib.rs:40][E: codex-rs/terminal-detection/src/lib.rs:42][E: codex-rs/terminal-detection/src/lib.rs:44][E: codex-rs/terminal-detection/src/lib.rs:46][E: codex-rs/terminal-detection/src/lib.rs:48][E: codex-rs/terminal-detection/src/lib.rs:50][E: codex-rs/terminal-detection/src/lib.rs:52][E: codex-rs/terminal-detection/src/lib.rs:54] `Multiplexer` variants 是 `Tmux { version: Option<String> }` 和 `Zellij { version: Option<String> }`；tmux version 来自 `TERM_PROGRAM_VERSION`，process zellij version 优先来自 `ZELLIJ_VERSION`，再 best-effort fallback 到 `zellij --version` 并 parse output。[E: codex-rs/terminal-detection/src/lib.rs:59][E: codex-rs/terminal-detection/src/lib.rs:61][E: codex-rs/terminal-detection/src/lib.rs:65][E: codex-rs/terminal-detection/src/lib.rs:68][E: codex-rs/terminal-detection/src/lib.rs:70][E: codex-rs/terminal-detection/src/lib.rs:268][E: codex-rs/terminal-detection/src/lib.rs:270][E: codex-rs/terminal-detection/src/lib.rs:270][E: codex-rs/terminal-detection/src/lib.rs:337][E: codex-rs/terminal-detection/src/lib.rs:341][E: codex-rs/terminal-detection/src/lib.rs:342][E: codex-rs/terminal-detection/src/lib.rs:343][E: codex-rs/terminal-detection/src/lib.rs:347][E: codex-rs/terminal-detection/src/lib.rs:349][E: codex-rs/terminal-detection/src/lib.rs:351][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423]

`terminal_info()` 使用 `OnceLock<TerminalInfo>` cache 当前 process 的 detected result；`user_agent()` 直接调用 cached `terminal_info().user_agent_token()`。[E: codex-rs/terminal-detection/src/lib.rs:188][E: codex-rs/terminal-detection/src/lib.rs:234][E: codex-rs/terminal-detection/src/lib.rs:234][E: codex-rs/terminal-detection/src/lib.rs:239][E: codex-rs/terminal-detection/src/lib.rs:239][E: codex-rs/terminal-detection/src/lib.rs:240]

## Detection flow

`detect_terminal_info_from_env` 先调用 `detect_multiplexer`，所以后续 terminal 分支都会携带 tmux/zellij metadata。[E: codex-rs/terminal-detection/src/lib.rs:253][E: codex-rs/terminal-detection/src/lib.rs:254] 如果存在非空 `TERM_PROGRAM`，只有 `TERM_PROGRAM=tmux`、multiplexer 是 tmux、且 tmux client info 能生成 terminal 时，才返回 tmux client terminal；否则普通非空 `TERM_PROGRAM` 分支直接返回并会 mask 后续 probes。[E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:312]

普通非空 `TERM_PROGRAM` 不存在时，detection 按 WEZTERM_VERSION、ITERM_SESSION_ID/ITERM_PROFILE/ITERM_PROFILE_NAME、TERM_SESSION_ID、KITTY_WINDOW_ID 或含 kitty 的 TERM、ALACRITTY_SOCKET 或 TERM=alacritty、KONSOLE_VERSION、GNOME_TERMINAL_SCREEN、VTE_VERSION、WT_SESSION、TERM fallback、unknown 的顺序返回。[E: codex-rs/terminal-detection/src/lib.rs:261][E: codex-rs/terminal-detection/src/lib.rs:270][E: codex-rs/terminal-detection/src/lib.rs:274][E: codex-rs/terminal-detection/src/lib.rs:281][E: codex-rs/terminal-detection/src/lib.rs:291][E: codex-rs/terminal-detection/src/lib.rs:303][E: codex-rs/terminal-detection/src/lib.rs:309][E: codex-rs/terminal-detection/src/lib.rs:316][E: codex-rs/terminal-detection/src/lib.rs:322][E: codex-rs/terminal-detection/src/lib.rs:329][E: codex-rs/terminal-detection/src/lib.rs:334]

`detect_multiplexer` 通过非空 `TMUX` 或 `TMUX_PANE` 识别 tmux，通过非空 `ZELLIJ`、`ZELLIJ_SESSION_NAME` 或 `ZELLIJ_VERSION` 识别 zellij；tmux/zellij version 都写入各自 optional version 字段，process env path 的 zellij version 会在 env var 缺失时调用 command fallback，都没有 multiplexer env 时返回 `None`。[E: codex-rs/terminal-detection/src/lib.rs:337][E: codex-rs/terminal-detection/src/lib.rs:341][E: codex-rs/terminal-detection/src/lib.rs:342][E: codex-rs/terminal-detection/src/lib.rs:343][E: codex-rs/terminal-detection/src/lib.rs:347][E: codex-rs/terminal-detection/src/lib.rs:348][E: codex-rs/terminal-detection/src/lib.rs:349][E: codex-rs/terminal-detection/src/lib.rs:351][E: codex-rs/terminal-detection/src/lib.rs:268][E: codex-rs/terminal-detection/src/lib.rs:270][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423]

tmux client helper executes `tmux display-message -p #{client_termtype}` and `tmux display-message -p #{client_termname}`; `terminal_from_tmux_client_info` prioritizes splitting termtype into program/version and uses termname as the TERM capability string, falling back to termname-only terminal info only when termtype is absent.[E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:360][E: codex-rs/terminal-detection/src/lib.rs:417][E: codex-rs/terminal-detection/src/lib.rs:418][E: codex-rs/terminal-detection/src/lib.rs:418][E: codex-rs/terminal-detection/src/lib.rs:421][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:117][E: codex-rs/terminal-detection/src/lib.rs:119][E: codex-rs/terminal-detection/src/lib.rs:423]

## User-Agent formatting

`TerminalInfo::user_agent_token` 优先使用 `term_program[/version]`，没有 term_program 时使用非空 `term`，再 fallback 到 `TerminalName`-specific token；最后统一调用 `sanitize_header_value`。[E: codex-rs/terminal-detection/src/lib.rs:152] `sanitize_header_value` 把不属于 ASCII alphanumeric、`-`、`_`、`.`、`/` 的字符替换为 `_`。[E: codex-rs/terminal-detection/src/lib.rs:375]

`terminal_name_from_term_program` 会 trim、删除空格/连字符/下划线/点号并转小写后匹配 known terminal names；`format_terminal_version` 才是 name/version formatting helper。[E: codex-rs/terminal-detection/src/lib.rs:381][E: codex-rs/terminal-detection/src/lib.rs:384][E: codex-rs/terminal-detection/src/lib.rs:385][E: codex-rs/terminal-detection/src/lib.rs:386][E: codex-rs/terminal-detection/src/lib.rs:387][E: codex-rs/terminal-detection/src/lib.rs:388][E: codex-rs/terminal-detection/src/lib.rs:390][E: codex-rs/terminal-detection/src/lib.rs:392][E: codex-rs/terminal-detection/src/lib.rs:394][E: codex-rs/terminal-detection/src/lib.rs:396][E: codex-rs/terminal-detection/src/lib.rs:398][E: codex-rs/terminal-detection/src/lib.rs:400][E: codex-rs/terminal-detection/src/lib.rs:404][E: codex-rs/terminal-detection/src/lib.rs:406][E: codex-rs/terminal-detection/src/lib.rs:410][E: codex-rs/terminal-detection/src/lib.rs:411][E: codex-rs/terminal-detection/src/lib.rs:412]

## Tests

`terminal_tests.rs` 的 `FakeEnvironment` 保存 vars 和 `TmuxClientInfo`，并提供 `with_tmux_client_info` 注入 termtype/termname。[E: codex-rs/terminal-detection/src/terminal_tests.rs:5][E: codex-rs/terminal-detection/src/terminal_tests.rs:6][E: codex-rs/terminal-detection/src/terminal_tests.rs:6][E: codex-rs/terminal-detection/src/terminal_tests.rs:24][E: codex-rs/terminal-detection/src/terminal_tests.rs:28][E: codex-rs/terminal-detection/src/terminal_tests.rs:28][E: codex-rs/terminal-detection/src/terminal_tests.rs:28]

tests 覆盖 `TERM_PROGRAM` 优先级、tmux client terminal、zellij multiplexer/version、Apple Terminal、Ghostty 和 VSCode 等 cases；例如 `TERM_PROGRAM=iTerm.app` 会盖过 `WEZTERM_VERSION`，zellij base case 断言 `version: None`，`ZELLIJ_VERSION=0.43.1` case 断言 env-derived version，`with_zellij_version("0.44.1")` case 断言 command fallback-derived version。[E: codex-rs/terminal-detection/src/terminal_tests.rs:89][E: codex-rs/terminal-detection/src/terminal_tests.rs:90][E: codex-rs/terminal-detection/src/terminal_tests.rs:91][E: codex-rs/terminal-detection/src/terminal_tests.rs:102][E: codex-rs/terminal-detection/src/terminal_tests.rs:155][E: codex-rs/terminal-detection/src/terminal_tests.rs:156][E: codex-rs/terminal-detection/src/terminal_tests.rs:167][E: codex-rs/terminal-detection/src/terminal_tests.rs:196][E: codex-rs/terminal-detection/src/terminal_tests.rs:197][E: codex-rs/terminal-detection/src/terminal_tests.rs:212][E: codex-rs/terminal-detection/src/terminal_tests.rs:218][E: codex-rs/terminal-detection/src/terminal_tests.rs:220][E: codex-rs/terminal-detection/src/terminal_tests.rs:236][E: codex-rs/terminal-detection/src/terminal_tests.rs:266][E: codex-rs/terminal-detection/src/terminal_tests.rs:270][E: codex-rs/terminal-detection/src/terminal_tests.rs:279][E: codex-rs/terminal-detection/src/terminal_tests.rs:286][E: codex-rs/terminal-detection/src/terminal_tests.rs:291][E: codex-rs/terminal-detection/src/terminal_tests.rs:292][E: codex-rs/terminal-detection/src/terminal_tests.rs:302][E: codex-rs/terminal-detection/src/terminal_tests.rs:307][E: codex-rs/terminal-detection/src/terminal_tests.rs:311][E: codex-rs/terminal-detection/src/terminal_tests.rs:321][E: codex-rs/terminal-detection/src/terminal_tests.rs:329][E: codex-rs/terminal-detection/src/terminal_tests.rs:331][E: codex-rs/terminal-detection/src/terminal_tests.rs:340]

## 设计动机与权衡

terminal detection 优先使用非空 `TERM_PROGRAM` 和显式 vendor env vars，再 fallback 到 generic `TERM`，是为了在现代 terminal 中得到更具体的 product token，同时保留未知环境的可用性。[I] 该结论由 `detect_terminal_info_from_env` 分支顺序共同支撑。[E: codex-rs/terminal-detection/src/lib.rs:253][E: codex-rs/terminal-detection/src/lib.rs:254][E: codex-rs/terminal-detection/src/lib.rs:261][E: codex-rs/terminal-detection/src/lib.rs:270][E: codex-rs/terminal-detection/src/lib.rs:281][E: codex-rs/terminal-detection/src/lib.rs:329][E: codex-rs/terminal-detection/src/lib.rs:334]

tmux client term metadata 只在非空 `TERM_PROGRAM=tmux` 且 tmux multiplexer active 时覆盖 terminal identity，说明实现想把 tmux session 归因到 underlying terminal，但避免在普通 shell 或非 tmux `TERM_PROGRAM` 下执行 tmux-specific interpretation。[I] 该结论由 `TERM_PROGRAM=tmux` guard 和 tmux client info branch 支撑。[E: codex-rs/terminal-detection/src/lib.rs:254][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:312]

## Gotchas

- 非空 `TERM_PROGRAM` 会 mask WEZTERM、WT_SESSION 等后续 probes，除非 `TERM_PROGRAM=tmux` 且 tmux client info 可用。[E: codex-rs/terminal-detection/src/lib.rs:254][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:307][E: codex-rs/terminal-detection/src/lib.rs:312][E: codex-rs/terminal-detection/src/lib.rs:259]
- `TerminalName::Unknown` 不等于没有 terminal metadata；`TERM` fallback 会产生 `TerminalInfo::from_term(term, multiplexer)`，tmux termtype 也可能映射成 Unknown name 但保留 term_program/term。[E: codex-rs/terminal-detection/src/lib.rs:329][E: codex-rs/terminal-detection/src/lib.rs:333][E: codex-rs/terminal-detection/src/lib.rs:418][E: codex-rs/terminal-detection/src/lib.rs:422][E: codex-rs/terminal-detection/src/lib.rs:423][E: codex-rs/terminal-detection/src/lib.rs:119][E: codex-rs/terminal-detection/src/lib.rs:423]
- public `terminal_info()` 使用 `OnceLock` cache；同一 process 里修改 env 后不会刷新 cached result。[I] 该结论由 one-time `get_or_init` cache 语义支撑。[E: codex-rs/terminal-detection/src/lib.rs:188][E: codex-rs/terminal-detection/src/lib.rs:239][E: codex-rs/terminal-detection/src/lib.rs:239][E: codex-rs/terminal-detection/src/lib.rs:240]

## Sources

- `codex-rs/terminal-detection/src/lib.rs`
- `codex-rs/terminal-detection/src/terminal_tests.rs`

## 相关

- `cli.global-flags`: CLI 运行环境与 user agent/terminal metadata 的入口。
- `subsys.tui.architecture`: TUI 运行在 detected terminal 环境中。
