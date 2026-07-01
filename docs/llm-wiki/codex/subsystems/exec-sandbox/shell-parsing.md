---
id: subsys.exec-sandbox.shell-parsing
title: shell parsing 与 command safety
kind: subsystem
tier: T2
source: [codex-rs/shell-command/src]
symbols: [parse_command, extract_shell_command, try_parse_word_only_commands_sequence, is_known_safe_command, command_might_be_dangerous, extract_powershell_command]
related: [tool.shell-command, subsys.exec-sandbox.execpolicy-dsl, subsys.exec-sandbox.shell-escalation]
evidence: explicit
status: verified
updated: db887d03e1
---

> shell parsing subsystem 是 Codex 对 model-produced argv 的 conservative metadata/safety parser:它能归类 read/search/list-files 的常见命令，也能在复杂或危险形态出现时退回 `Unknown` 或要求 approval。[E: codex-rs/shell-command/src/parse_command.rs:30][E: codex-rs/shell-command/src/parse_command.rs:42][E: codex-rs/shell-command/src/parse_command.rs:44]

## 能回答的问题

- `parse_command` 如何把 argv 转成 `ParsedCommand::Read/Search/ListFiles/Unknown`？
- bash/zsh/sh `-c/-lc` 的 plain command subset 是怎样定义的？
- PowerShell command extraction 与 Windows safety parser 接受哪些 flags？
- 哪些命令会被认为 known safe？
- 哪些命令或 Windows GUI/URL launch 会被认为 dangerous？

## 职责边界

shell parsing 节点覆盖 `codex_shell_command` crate 的 metadata parsing 与 safety heuristics。它不执行命令、不做 OS sandbox，也不直接请求用户 approval；调用方会把 parse/safety/evaluation 结果接入 tool runtime 或 execpolicy。[I]

`lib.rs` 只公开 `bash`、`parse_command`、`powershell` 三个模块和 `is_dangerous_command`、`is_safe_command` 两个 safety function。[E: codex-rs/shell-command/src/lib.rs:5][E: codex-rs/shell-command/src/lib.rs:7][E: codex-rs/shell-command/src/lib.rs:8][E: codex-rs/shell-command/src/lib.rs:10][E: codex-rs/shell-command/src/lib.rs:11]

## 关键 crate/文件

- `codex-rs/shell-command/src/parse_command.rs`: public `parse_command`、shell command extraction、normalization、connector split、summaries。[E: codex-rs/shell-command/src/parse_command.rs:10][E: codex-rs/shell-command/src/parse_command.rs:16][E: codex-rs/shell-command/src/parse_command.rs:1275][E: codex-rs/shell-command/src/parse_command.rs:2074]
- `codex-rs/shell-command/src/bash.rs`: tree-sitter-bash parser、plain word-only command subset、bash/sh/zsh command extraction。[E: codex-rs/shell-command/src/bash.rs:13][E: codex-rs/shell-command/src/bash.rs:29][E: codex-rs/shell-command/src/bash.rs:98]
- `codex-rs/shell-command/src/powershell.rs`: PowerShell executable detection、`-Command/-c` script extraction、UTF-8 output prefix helper。[E: codex-rs/shell-command/src/powershell.rs:9][E: codex-rs/shell-command/src/powershell.rs:13][E: codex-rs/shell-command/src/powershell.rs:43]
- `codex-rs/shell-command/src/command_safety/is_safe_command.rs`: Unix/common known-safe command allowlist 与 bash plain-command composite check。[E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:10][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:47]
- `codex-rs/shell-command/src/command_safety/is_dangerous_command.rs`: dangerous command detection for Unix/common commands and bash plain-command sequences。[E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:7][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:155]
- `codex-rs/shell-command/src/command_safety/windows_safe_commands.rs` 与 `windows_dangerous_commands.rs`: Windows PowerShell/CMD/GUI safety and danger heuristics。[E: codex-rs/shell-command/src/command_safety/windows_safe_commands.rs:8][E: codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs:8]

## 数据模型

- `ShellType`: shell detection 支持 `Zsh`、`Bash`、`PowerShell`、`Sh`、`Cmd`。[E: codex-rs/shell-command/src/shell_detect.rs:5][E: codex-rs/shell-command/src/shell_detect.rs:6][E: codex-rs/shell-command/src/shell_detect.rs:7][E: codex-rs/shell-command/src/shell_detect.rs:8][E: codex-rs/shell-command/src/shell_detect.rs:9][E: codex-rs/shell-command/src/shell_detect.rs:10]
- `ParsedCommand` 由 `codex_protocol` 提供，shell parser 根据 command shape 构造 `Read`、`Search`、`ListFiles` 或 `Unknown`；unknown 一旦出现在 deduped list 中，public `parse_command` 会 collapse 为单个 `Unknown`。[E: codex-rs/shell-command/src/parse_command.rs:40][E: codex-rs/shell-command/src/parse_command.rs:44][E: codex-rs/shell-command/src/parse_command.rs:2074]
- `PowershellParseOutcome`: Windows PowerShell safety parser 的 AST child process 返回 `Commands(Vec<Vec<String>>)`、`Unsupported` 或 `Failed`。[E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:37][E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:39][E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:40][E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:41]

## parsing 控制流

1. `parse_command` 先调用 `parse_command_impl`，去掉连续重复 command summary；如果任何 summary 是 `Unknown`，返回一个覆盖原始 command 的 `Unknown`。[E: codex-rs/shell-command/src/parse_command.rs:30][E: codex-rs/shell-command/src/parse_command.rs:33][E: codex-rs/shell-command/src/parse_command.rs:40][E: codex-rs/shell-command/src/parse_command.rs:44]
2. `parse_command_impl` 优先尝试 `parse_shell_lc_commands`；如果是 PowerShell invocation，则直接把 script body 作为 `Unknown` 返回。[E: codex-rs/shell-command/src/parse_command.rs:1275][E: codex-rs/shell-command/src/parse_command.rs:1276][E: codex-rs/shell-command/src/parse_command.rs:1280][E: codex-rs/shell-command/src/parse_command.rs:1281]
3. 非 shell wrapper command 会 normalize tokens，按 connector split，然后逐段 `summarize_main_tokens`；遇到 `cd` 会更新 effective cwd 并影响后续 Read path。[E: codex-rs/shell-command/src/parse_command.rs:1286][E: codex-rs/shell-command/src/parse_command.rs:1288][E: codex-rs/shell-command/src/parse_command.rs:1300][E: codex-rs/shell-command/src/parse_command.rs:1312]
4. `parse_shell_lc_commands` 对 bash/zsh/sh script 使用 tree-sitter parse，再要求所有命令都属于 word-only safe subset；formatting helpers 会被 drop，剩余 command 再被 summary。[E: codex-rs/shell-command/src/parse_command.rs:1822][E: codex-rs/shell-command/src/parse_command.rs:1825][E: codex-rs/shell-command/src/parse_command.rs:1832][E: codex-rs/shell-command/src/parse_command.rs:1853]
5. `try_parse_word_only_commands_sequence` 拒绝 tree-sitter parse error，只允许 `program/list/pipeline/command/command_name/word/string/raw_string/number/concatenation` 等 named node，并只允许 `&&`、`||`、`;`、`|`、quote tokens。[E: codex-rs/shell-command/src/bash.rs:30][E: codex-rs/shell-command/src/bash.rs:36][E: codex-rs/shell-command/src/bash.rs:52][E: codex-rs/shell-command/src/bash.rs:61][E: codex-rs/shell-command/src/bash.rs:69]
6. `extract_bash_command` 只接受三段 argv `[shell, flag, script]`，flag 必须是 `-lc` 或 `-c`，shell type 必须是 zsh/bash/sh。[E: codex-rs/shell-command/src/bash.rs:98][E: codex-rs/shell-command/src/bash.rs:101][E: codex-rs/shell-command/src/bash.rs:103][E: codex-rs/shell-command/src/bash.rs:109]
7. `extract_powershell_command` 要求首 arg 是 PowerShell executable，后续 flags 只能来自 `POWERSHELL_FLAGS`，遇到 `-Command` 或 `-c` 后返回紧随其后的 script。[E: codex-rs/shell-command/src/powershell.rs:43][E: codex-rs/shell-command/src/powershell.rs:48][E: codex-rs/shell-command/src/powershell.rs:59][E: codex-rs/shell-command/src/powershell.rs:62]

## summary 分类

- list-files: `ls/eza/exa`、`tree`、`du`、`rg --files`、`git ls-files`、`fd` without query、`find` without query、python walk patterns 都会被映射到 `ParsedCommand::ListFiles`。[E: codex-rs/shell-command/src/parse_command.rs:2076][E: codex-rs/shell-command/src/parse_command.rs:2104][E: codex-rs/shell-command/src/parse_command.rs:2115][E: codex-rs/shell-command/src/parse_command.rs:2159][E: codex-rs/shell-command/src/parse_command.rs:2177][E: codex-rs/shell-command/src/parse_command.rs:2201][E: codex-rs/shell-command/src/parse_command.rs:2217][E: codex-rs/shell-command/src/parse_command.rs:2483]
- search: `rg/rga/ripgrep-all` without `--files`、`git grep`、`fd` with query、`find` with query、grep-like tools、`ag/ack/pt` 会被映射到 `ParsedCommand::Search`。[E: codex-rs/shell-command/src/parse_command.rs:2166][E: codex-rs/shell-command/src/parse_command.rs:2176][E: codex-rs/shell-command/src/parse_command.rs:2192][E: codex-rs/shell-command/src/parse_command.rs:2210][E: codex-rs/shell-command/src/parse_command.rs:2223][E: codex-rs/shell-command/src/parse_command.rs:2226]
- read: `cat`、`bat/batcat`、`less`、`more`、`head`、`tail`、`awk` with data file、`nl` with file、`sed -n` with file 会被映射到 `ParsedCommand::Read`。[E: codex-rs/shell-command/src/parse_command.rs:2251][E: codex-rs/shell-command/src/parse_command.rs:2265][E: codex-rs/shell-command/src/parse_command.rs:2290][E: codex-rs/shell-command/src/parse_command.rs:2319][E: codex-rs/shell-command/src/parse_command.rs:2333][E: codex-rs/shell-command/src/parse_command.rs:2383][E: codex-rs/shell-command/src/parse_command.rs:2437][E: codex-rs/shell-command/src/parse_command.rs:2451][E: codex-rs/shell-command/src/parse_command.rs:2468]

## safety 控制流

- `is_known_safe_command` 先把 `zsh` command name normalized 为 `bash`，再检查 Windows safe parser、direct safe allowlist、最后检查 bash plain-command composite 中每个 command 都 safe。[E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:10][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:14][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:22][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:26][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:36]
- Unix/common safe allowlist 包含 `cat/cd/cut/echo/grep/head/ls/pwd/stat/tail/wc/which/whoami` 等命令；`base64` 带 output options、`find` 带 exec/delete/write options、`rg` 带 `--pre`/`--hostname-bin`/zip search 会被排除。[E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:57][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:84][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:94][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:115][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:121][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:128]
- `git` safe path 只允许 `status/log/diff/show/branch` 等 read-only subcommands，并拒绝能影响 config/repo/helper lookup 的 global options。[E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:136][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:141][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:145][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:212]
- `command_might_be_dangerous` 在 Windows 先跑 Windows dangerous parser，再检查 direct dangerous exec；direct dangerous 目前识别 `rm -f` 和 `rm -rf`，`sudo` 会递归检查后续 command。[E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:7][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:10][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:15][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:157][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:160]
- Windows safe parser 只接受 PowerShell invocation；它把 script 解析成 command sequences，并要求每段都在 read-only safelist 中。[E: codex-rs/shell-command/src/command_safety/windows_safe_commands.rs:8][E: codex-rs/shell-command/src/command_safety/windows_safe_commands.rs:9][E: codex-rs/shell-command/src/command_safety/windows_safe_commands.rs:145]
- Windows dangerous parser 会识别 PowerShell/CMD/direct GUI launch 中的 URL-bearing ShellExecute/browser/explorer/mshta/rundll32 形态，也识别 force delete 和 recursive quiet directory removal。[E: codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs:8][E: codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs:44][E: codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs:74][E: codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs:139][E: codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs:144][E: codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs:150]

## 设计动机与权衡

- public `parse_command` 只要发现一个 `Unknown` 就 collapse 为单个 `Unknown`，避免把半解析 pipeline 表现成过度自信的多条 summary。[E: codex-rs/shell-command/src/parse_command.rs:40][E: codex-rs/shell-command/src/parse_command.rs:44]
- bash parser 只接受 plain word-only command subset，拒绝 redirections、subshell、expansion 等复杂 shell 语义；这是为了让 metadata/safety parser 不假装理解完整 shell。[E: codex-rs/shell-command/src/bash.rs:61][E: codex-rs/shell-command/src/bash.rs:69][E: codex-rs/shell-command/src/bash.rs:88]
- Windows PowerShell safety parser 使用长期运行的 parser process，并通过 request id 检测 stdout protocol desync；这比纯字符串 split 更保守，但失败时会返回 `Failed/Unsupported`。[E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:27][E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:52][E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:161][E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:163]

## gotcha

- `extract_powershell_command` 只提取受限 flag list 中的 `-Command/-c`，而 Windows safety parser 另有更完整的 PowerShell AST 子进程；不要把两个 parser 混为同一层。[E: codex-rs/shell-command/src/powershell.rs:9][E: codex-rs/shell-command/src/powershell.rs:59][E: codex-rs/shell-command/src/command_safety/powershell_parser.rs:27]
- `find_git_subcommand` 会跳过 `-C`、`-c`、`--config-env`、`--git-dir` 等 global options 以定位 subcommand；`is_safe_git_command` 随后仍会把 `-C`、`-c`、`--config-env`、`--git-dir` 等 unsafe global options 判为非 auto-approve。[E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:46][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:68][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:97][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:101][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:132][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:175][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:182][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:183][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:237][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:255]
- `sed -n` 的 safe/read special case 只接受数字 range script，例如 `1,5p` 这种形态。[E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:168][E: codex-rs/shell-command/src/command_safety/is_safe_command.rs:245]

## Sources

- `codex-rs/shell-command/src/parse_command.rs`
- `codex-rs/shell-command/src/bash.rs`
- `codex-rs/shell-command/src/powershell.rs`
- `codex-rs/shell-command/src/shell_detect.rs`
- `codex-rs/shell-command/src/command_safety`

## 相关

- `tool.shell-command`
- `subsys.exec-sandbox.execpolicy-dsl`
- `subsys.exec-sandbox.shell-escalation`
