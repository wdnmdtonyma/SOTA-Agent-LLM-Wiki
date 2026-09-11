---
id: subsys.exec-sandbox.shell-parsing
title: shell parsing 与 command safety
kind: subsystem
tier: T2
source: [codex-rs/shell-command/src, codex-rs/core/src/exec_policy.rs]
symbols: [parse_command, extract_shell_command, try_parse_word_only_commands_sequence, parse_shell_lc_literal_commands, dangerous_command_match, DangerousCommandMatch, extract_powershell_command]
related: [tool.exec-command, tool.shell-command, subsys.exec-sandbox.execpolicy-dsl, subsys.exec-sandbox.shell-escalation]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> shell parsing subsystem 是 Codex 对 model-produced argv 的 conservative metadata/safety parser：它能归类 read/search/list-files 的常见命令，也能在复杂或危险形态出现时退回 `Unknown` 或要求 approval。crate 已删除 `is_known_safe_command` / `windows_safe_commands`；公开 safety 入口只剩 `is_dangerous_command`。[E: codex-rs/shell-command/src/parse_command.rs:54][E: codex-rs/shell-command/src/lib.rs:11]

## 能回答的问题

- `parse_command` 如何把 argv 转成 `ParsedCommand::Read/Search/ListFiles/Unknown`？
- bash/zsh/sh `-c/-lc` 的 plain command subset 是怎样定义的？
- PowerShell command extraction 接受哪些 flags？`Get-Content` 何时会被映射为 Read？
- 哪些命令或 Windows GUI/URL launch 会被认为 dangerous？
- 为什么不再存在 known-safe allowlist？

## 职责边界

shell parsing 节点覆盖 `codex_shell_command` crate 的 metadata parsing 与 danger heuristics。它不执行命令、不做 OS sandbox，也不直接请求用户 approval；调用方会把 parse/danger/evaluation 结果接入 tool runtime 或 execpolicy。[I]

`lib.rs` 公开 `shell_detect`、`bash`、`parse_command`、`powershell` 四个 command parser 模块，另有 `shell_snapshot`（workspace snapshot，不是 argv classifier），并把 `is_dangerous_command` 模块重导出到 crate root。危险检测的主入口是 `dangerous_command_match`。[E: codex-rs/shell-command/src/lib.rs:3][E: codex-rs/shell-command/src/lib.rs:4][E: codex-rs/shell-command/src/lib.rs:11][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:37]

PowerShell **subprocess** AST parser（`powershell_parser`）只在 test cfg 下编译，不当作 production classification。生产路径另有 in-process `powershell_tree_sitter`：它只做 literal lowering，fail-closed，不判定 safe/dangerous；`parse_powershell_command_into_plain_commands` 把它接到 execpolicy 的 Windows-platform command split，不进入 `parse_command` metadata 分类。[E: codex-rs/shell-command/src/command_safety/mod.rs:3][E: codex-rs/shell-command/src/command_safety/mod.rs:5][E: codex-rs/shell-command/src/command_safety/mod.rs:6][E: codex-rs/shell-command/src/command_safety/powershell_tree_sitter.rs:13][E: codex-rs/shell-command/src/powershell.rs:77][E: codex-rs/core/src/exec_policy.rs:889]

## 关键 crate/文件

- `codex-rs/shell-command/src/parse_command.rs`: public `parse_command`、shell command extraction、normalization、connector split、summaries。[E: codex-rs/shell-command/src/parse_command.rs:54][E: codex-rs/shell-command/src/parse_command.rs:1423]
- `codex-rs/shell-command/src/bash.rs`: tree-sitter-bash parser、plain word-only command subset、bash/sh/zsh command extraction。[E: codex-rs/shell-command/src/bash.rs:29][E: codex-rs/shell-command/src/bash.rs:106]
- `codex-rs/shell-command/src/powershell.rs`: PowerShell executable detection、`-Command/-c` script extraction、UTF-8 output prefix helper。[E: codex-rs/shell-command/src/powershell.rs:9][E: codex-rs/shell-command/src/powershell.rs:43]
- `codex-rs/shell-command/src/command_safety/is_dangerous_command.rs`: typed dangerous-command match、wrapper recursion 与 shell literal-command scanning。[E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:37]
- `codex-rs/shell-command/src/command_safety/windows_dangerous_commands.rs`: Windows PowerShell/CMD/GUI danger heuristics。该模块经 `#[path]` 始终编译，不是 `cfg(windows)`；只在 `DangerousCommandPlatform::Windows` 时被调用（含非 Windows host 上评估远程 Windows 命令）。[E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:2][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:74]

## 数据模型

- `ShellType`: shell detection 支持 `Zsh`、`Bash`、`PowerShell`、`Sh`、`Cmd`。[E: codex-rs/shell-command/src/shell_detect.rs:7]
- `ParsedCommand` 由 `codex_protocol` 提供，shell parser 根据 command shape 构造 `Read`、`Search`、`ListFiles` 或 `Unknown`；unknown 一旦出现在 deduped list 中，public `parse_command` 会 collapse 为单个 `Unknown`。[E: codex-rs/shell-command/src/parse_command.rs:64]
- `DangerousCommandMatch` 区分强制删除 `ForcedRm` 和其它危险规则 `Other`；`dangerous_command_match` 返回 `Option<DangerousCommandMatch>`。[E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:27][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:37]

## parsing 控制流

1. `parse_command` 先调用 `parse_command_impl`，去掉连续重复 command summary；如果任何 summary 是 `Unknown`，返回一个覆盖原始 command 的 `Unknown`。[E: codex-rs/shell-command/src/parse_command.rs:56][E: codex-rs/shell-command/src/parse_command.rs:64]
2. `parse_command_impl` 优先尝试 `parse_shell_lc_commands`。如果是 PowerShell invocation，则先把 script tokenize；当首 token 是 `Get-Content` 且递归 parse 得到单条 `Read` 时，把整段 script 映射为 `Read`，否则返回 `Unknown`。[E: codex-rs/shell-command/src/parse_command.rs:1424][E: codex-rs/shell-command/src/parse_command.rs:1442][E: codex-rs/shell-command/src/parse_command.rs:1451]
3. 非 shell wrapper command 会 normalize tokens，按 connector split，然后逐段 `summarize_main_tokens`。[E: codex-rs/shell-command/src/parse_command.rs:1456][E: codex-rs/shell-command/src/parse_command.rs:2290]
4. `try_parse_word_only_commands_sequence` 拒绝 tree-sitter parse error，只允许 `program/list/pipeline/command/command_name/word/string/string_content/raw_string/number/concatenation` 这些 named node，并只允许 `&&`、`||`、`;`、`|`、quote tokens。[E: codex-rs/shell-command/src/bash.rs:29][E: codex-rs/shell-command/src/bash.rs:36]
5. `parse_shell_lc_literal_commands` 另走一条只用于 dangerous detection 的路径：它允许复杂但语法正确的 shell tree，收集每个 command node 的静态 literal words；源码明确禁止用这个结果证明命令 safe。[E: codex-rs/shell-command/src/bash.rs:136]
6. `extract_bash_command` 只接受三段 argv `[shell, flag, script]`，flag 必须是 `-lc` 或 `-c`，shell type 必须是 zsh/bash/sh。[E: codex-rs/shell-command/src/bash.rs:106]
7. `extract_powershell_command` 要求首 arg 是 PowerShell executable，后续 flags 只能来自 `POWERSHELL_FLAGS`，遇到 `-Command` 或 `-c` 后返回紧随其后的 script。[E: codex-rs/shell-command/src/powershell.rs:43][E: codex-rs/shell-command/src/powershell.rs:9]

## summary 分类

- list-files: `ls/eza/exa`、`tree`、`du` 会被映射到 `ParsedCommand::ListFiles`。[E: codex-rs/shell-command/src/parse_command.rs:2292][E: codex-rs/shell-command/src/parse_command.rs:2320][E: codex-rs/shell-command/src/parse_command.rs:2331]
- search: `rg/rga/ripgrep-all` without `--files` 会被映射到 `ParsedCommand::Search`；带 `--files` 则是 ListFiles。[E: codex-rs/shell-command/src/parse_command.rs:2349][E: codex-rs/shell-command/src/parse_command.rs:2375]
- read: `cat` 与大小写不敏感的 `Get-Content` 会被映射到 `ParsedCommand::Read`。[E: codex-rs/shell-command/src/parse_command.rs:2467]

## safety 控制流

- crate **不再**提供 `is_known_safe_command` 或 Windows safe allowlist。`lib.rs` 只重导出 `is_dangerous_command`。[E: codex-rs/shell-command/src/lib.rs:11]
- execpolicy unmatched fallback 也不再因 known-safe 放行；它只看 dangerous heuristic、Windows legacy managed-fs、以及 sandbox kind。[E: codex-rs/core/src/exec_policy.rs:759][E: codex-rs/core/src/exec_policy.rs:799]
- `dangerous_command_match` 先检查 direct exec，再对 complex shell 脚本中收集到的 literal command 递归检查，最后在 Windows 调用 Windows-specific danger parser；wrapper recursion 最深 8 层。[E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:34][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:37][E: codex-rs/shell-command/src/command_safety/is_dangerous_command.rs:54]
- 这是非对称的保守策略：可以从复杂 AST 提取静态 literal 来找危险证据，但不能用未解析的 dynamic 部分证明安全。[E: codex-rs/shell-command/src/bash.rs:136]

## 设计动机与权衡

- public `parse_command` 只要发现一个 `Unknown` 就 collapse 为单个 `Unknown`，避免把半解析 pipeline 表现成过度自信的多条 summary。[E: codex-rs/shell-command/src/parse_command.rs:64]
- PowerShell `Get-Content` 是有意的例外：只有 tokenize 后能被当成单条 Read 时才升级 metadata，其它 PowerShell script 仍是 Unknown。[E: codex-rs/shell-command/src/parse_command.rs:1442]
- PowerShell **subprocess** AST parser 留作 test oracle。生产只使用 in-process tree-sitter lowerer（`try_parse_powershell_commands`），而且只用于 execpolicy 在 Windows platform 上拆 argv，不用于 `parse_command` metadata，也不单独证明 safe。[E: codex-rs/shell-command/src/command_safety/mod.rs:5][E: codex-rs/shell-command/src/powershell.rs:77][E: codex-rs/core/src/exec_policy.rs:889]

## gotcha

- `extract_powershell_command` 只提取受限 flag list 中的 `-Command/-c`；不要把它和生产已移除的 Windows safe parser 混为一层。[E: codex-rs/shell-command/src/powershell.rs:9][E: codex-rs/shell-command/src/powershell.rs:61]
- `sed -n` 的 **metadata** special case 只接受数字 range script（例如 `1,5p`），这只影响 `ParsedCommand` 分类，不再构成 known-safe allow。[E: codex-rs/shell-command/src/parse_command.rs:1567]
- tokenize helper 会把 `get-content` / `gc` / `type` 归一成 `Get-Content`，但若 POSIX shlex 改写了 Windows path 则放弃 tokenize。[E: codex-rs/shell-command/src/parse_command.rs:16][E: codex-rs/shell-command/src/parse_command.rs:23][E: codex-rs/shell-command/src/parse_command.rs:33]

## Sources

- `codex-rs/shell-command/src/parse_command.rs`
- `codex-rs/shell-command/src/bash.rs`
- `codex-rs/shell-command/src/powershell.rs`
- `codex-rs/shell-command/src/shell_detect.rs`
- `codex-rs/shell-command/src/command_safety`
- `codex-rs/shell-command/src/command_safety/powershell_tree_sitter.rs`
- `codex-rs/core/src/exec_policy.rs`

## 相关

- `tool.exec-command`
- `tool.shell-command`
- `subsys.exec-sandbox.execpolicy-dsl`
- `subsys.exec-sandbox.shell-escalation`
