---
id: subsys.shell-parsing
path: subsystems/shell-parsing.md
title: Shell 与命令解析
kind: subsystem
tier: T2
status: verified
source: [utils/bash/, utils/shell/]
symbols: [parseForSecurity, checkSemantics, ParsedCommand, createCommandPrefixExtractor, buildPrefix, validateFlags, ShellProvider]
related: [tool.bash, subsys.permissions]
evidence: explicit
updated: 2026-06-14
---

> Shell parsing 子系统把 shell command 从字符串转换成安全可审查的 argv、redirects、prefix 和 read-only flag 判断, 并为 Bash/PowerShell 权限系统提供 fail-closed 输入。

## 能回答的问题

- tree-sitter bash 解析失败、超时或 parser 不可用时走哪条安全路径?
- `parseForSecurity()` 如何把 shell 结构拆成 `SimpleCommand[]`?
- prefix extractor 为什么既有 deterministic spec path 又有小模型 fallback?
- read-only command validation 如何处理 flag、`--`、xargs、UNC path 等边界?
- Bash provider 与 PowerShell provider 在执行命令时如何包装 cwd/env?

## 职责边界

Shell parsing 子系统只负责“理解命令”和“提供安全分类输入”: 它产出 parsed command、semantic safety result、prefix、read-only validation 和 shell execution wrapper; 最终 allow/ask/deny 由 [权限系统](permissions.md) 和具体 shell tool 的 `checkPermissions()` 汇总。[E: utils/bash/ast.ts:381][E: utils/bash/ast.ts:2213][E: utils/shell/prefix.ts:92][E: utils/shell/readOnlyCommandValidation.ts:1684][E: utils/shell/shellProvider.ts:14][I]

解析层默认 fail closed: 无法可靠 tokenization、遇到高风险 shell semantic 或 flag parser differential 时返回 too-complex/false, 让上层转为 ask 或 deny, 而不是自动允许。[E: utils/bash/ast.ts:408][E: utils/bash/ast.ts:444][E: utils/bash/ast.ts:2255][E: utils/shell/readOnlyCommandValidation.ts:1823][I]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `utils/bash/parser.ts` | tree-sitter raw parser, 区分 parser unavailable 的 `null` 与 parser abort 的 `PARSE_ABORTED`。[E: utils/bash/parser.ts:93][E: utils/bash/parser.ts:104][E: utils/bash/parser.ts:112][E: utils/bash/parser.ts:124][E: utils/bash/parser.ts:135] |
| `utils/bash/ast.ts` | 安全 AST walker, 产出 `SimpleCommand[]` 或 too-complex, 并做 post-argv semantic checks。[E: utils/bash/ast.ts:31][E: utils/bash/ast.ts:42][E: utils/bash/ast.ts:381][E: utils/bash/ast.ts:2213] |
| `utils/bash/ParsedCommand.ts` | 面向 legacy callers 的 parsed command facade: tree-sitter 可用则构造 `TreeSitterParsedCommand`, 否则 fallback regex parser, 并缓存最后一次 parse。[E: utils/bash/ParsedCommand.ts:270][E: utils/bash/ParsedCommand.ts:273][E: utils/bash/ParsedCommand.ts:281][E: utils/bash/ParsedCommand.ts:289][E: utils/bash/ParsedCommand.ts:311] |
| `utils/shell/prefix.ts` | 基于 pre-check、小模型和 LRU cache 的 command prefix extraction; compound command 会并行提取 subcommands 前缀。[E: utils/shell/prefix.ts:92][E: utils/shell/prefix.ts:95][E: utils/shell/prefix.ts:187][E: utils/shell/prefix.ts:220][E: utils/shell/prefix.ts:341] |
| `utils/shell/specPrefix.ts` | 基于 command spec 的 deterministic prefix builder 和 depth rules。[E: utils/shell/specPrefix.ts:21][E: utils/shell/specPrefix.ts:88][E: utils/shell/specPrefix.ts:139] |
| `utils/shell/readOnlyCommandValidation.ts` | read-only allowlist 与 flag walker, 处理 git/docker、UNC path、flag args、xargs、bundled short flags 等。[E: utils/shell/readOnlyCommandValidation.ts:107][E: utils/shell/readOnlyCommandValidation.ts:1539][E: utils/shell/readOnlyCommandValidation.ts:1562][E: utils/shell/readOnlyCommandValidation.ts:1684] |
| `utils/shell/shellProvider.ts` | Bash/PowerShell execution provider contract, 包含 command wrapper、spawn args 和 env overrides。[E: utils/shell/shellProvider.ts:1][E: utils/shell/shellProvider.ts:5][E: utils/shell/shellProvider.ts:14][E: utils/shell/shellProvider.ts:26][E: utils/shell/shellProvider.ts:32] |

## 数据模型

`SimpleCommand` 是 parser 给权限层的最小安全模型: `argv`、leading env vars、redirects 和原始或重建后的 command text; `ParseForSecurityResult` 只有 simple、too-complex、parse-unavailable 三类结果。[E: utils/bash/ast.ts:25][E: utils/bash/ast.ts:33][E: utils/bash/ast.ts:35][E: utils/bash/ast.ts:37][E: utils/bash/ast.ts:39][E: utils/bash/ast.ts:43][E: utils/bash/ast.ts:44][E: utils/bash/ast.ts:45]

`parseForSecurity(cmd)` 先调用 `parseCommandRaw()`, raw parser 返回 `null` 时输出 `parse-unavailable`, 返回 AST 时进入 `parseForSecurityFromAst()`; 空字符串直接返回空 command 列表。[E: utils/bash/ast.ts:381][E: utils/bash/ast.ts:387][E: utils/bash/ast.ts:388][E: utils/bash/ast.ts:389]

`PrefixExtractorConfig` 把 tool name、policy spec、analytics event、querySource 和可选 `preCheck` 交给 prefix extractor; extractor 返回 `CommandPrefixResult` 或带 subcommand map 的扩展结果。[E: utils/shell/prefix.ts:49][E: utils/shell/prefix.ts:57][E: utils/shell/prefix.ts:66][E: utils/shell/prefix.ts:69][E: utils/shell/prefix.ts:71][E: utils/shell/prefix.ts:74][E: utils/shell/prefix.ts:77]

`ShellProvider` 抽象了 shell kind、shell path、detached 标志、`buildExecCommand()`、`getSpawnArgs()` 和 `getEnvironmentOverrides()`; Bash provider detached 为 true, PowerShell provider detached 为 false。[E: utils/shell/shellProvider.ts:5][E: utils/shell/bashProvider.ts:73][E: utils/shell/bashProvider.ts:75][E: utils/shell/powershellProvider.ts:31][E: utils/shell/powershellProvider.ts:33]

## 控制流

1. `parseCommandRaw()` 对空命令或超过最大长度返回 `null`; tree-sitter gate 打开时初始化 parser, module 缺失返回 `null`, parse 返回 `null` 或 catch 异常返回 `PARSE_ABORTED`。[E: utils/bash/parser.ts:107][E: utils/bash/parser.ts:108][E: utils/bash/parser.ts:112][E: utils/bash/parser.ts:114][E: utils/bash/parser.ts:124][E: utils/bash/parser.ts:132]
2. `parseForSecurityFromAst()` 先做 raw string pre-check: control chars、Unicode whitespace、backslash escaped whitespace、zsh 特殊展开、brace quote obfuscation 都直接 too-complex; `PARSE_ABORTED` 也转 too-complex。[E: utils/bash/ast.ts:409][E: utils/bash/ast.ts:412][E: utils/bash/ast.ts:416][E: utils/bash/ast.ts:422][E: utils/bash/ast.ts:428][E: utils/bash/ast.ts:434][E: utils/bash/ast.ts:452]
3. AST walker 从 structural nodes 收集 leaf `command`; `command_substitution` 的内层命令会追加到 accumulator, structural separators 会按 scope 规则处理变量可见性。[E: utils/bash/ast.ts:462][E: utils/bash/ast.ts:487][E: utils/bash/ast.ts:504][E: utils/bash/ast.ts:1389][E: utils/bash/ast.ts:1600]
4. `walkCommand()` 对 variable assignments、command name、普通 arguments、simple expansion、redirects、herestring 分别处理; 遇到未支持 child type 直接 too-complex。[E: utils/bash/ast.ts:1247][E: utils/bash/ast.ts:1251][E: utils/bash/ast.ts:1261][E: utils/bash/ast.ts:1271][E: utils/bash/ast.ts:1289][E: utils/bash/ast.ts:1298][E: utils/bash/ast.ts:1304][E: utils/bash/ast.ts:1311]
5. 当 raw command text 含 `$VAR` 或 newline 时, walker 用 argv 重建 `text`, 让后续 prefix/rule matching 基于解析后的 argv 而不是可能混淆的原始 span。[E: utils/bash/ast.ts:1350][E: utils/bash/ast.ts:1351][E: utils/bash/ast.ts:1358][I]
6. `checkSemantics()` 在 argv 后处理安全 wrapper、危险 builtin、subscript eval、reserved shell keyword 等语义风险; `timeout`/`env`/`nice` 这类 wrapper 只有可静态定位被包装命令时才继续, 未知 flag 或不可分析 duration 会返回 not ok。[E: utils/bash/ast.ts:2213][E: utils/bash/ast.ts:2220][E: utils/bash/ast.ts:2255][E: utils/bash/ast.ts:2291][E: utils/bash/ast.ts:2317][E: utils/bash/ast.ts:2428][E: utils/bash/ast.ts:2504][E: utils/bash/ast.ts:2547][E: utils/bash/ast.ts:2619][E: utils/bash/ast.ts:2626]
7. Prefix extraction 先跑 optional `preCheck`; 小模型结果若是 API error、`command_injection_detected`、bare `git` 或 dangerous shell prefix, 会转成 null 或 no-prefix, 避免生成过宽 permission prefix。[E: utils/shell/prefix.ts:187][E: utils/shell/prefix.ts:256][E: utils/shell/prefix.ts:264][E: utils/shell/prefix.ts:276][E: utils/shell/prefix.ts:287]
8. `buildPrefix()` 先用 `calculateDepth()` 算深度, `DEPTH_RULES` 为 rg、pre-commit、gcloud、aws、kubectl、docker、git push 等命令定制 prefix depth; `shouldStopAtArg()` 遇到 flag、文件路径或 URL 边界可停止继续扩展。[E: utils/shell/specPrefix.ts:21][E: utils/shell/specPrefix.ts:88][E: utils/shell/specPrefix.ts:93][E: utils/shell/specPrefix.ts:139][E: utils/shell/specPrefix.ts:216][E: utils/shell/specPrefix.ts:224][E: utils/shell/specPrefix.ts:225]
9. `validateFlags()` 按 command config walking tokens, 特判 xargs target、`--` 是否被工具尊重、`--flag=value`、git numeric shorthand、grep/rg attached numeric args、bundled short flags 和 required flag argument。[E: utils/shell/readOnlyCommandValidation.ts:1684][E: utils/shell/readOnlyCommandValidation.ts:1705][E: utils/shell/readOnlyCommandValidation.ts:1706][E: utils/shell/readOnlyCommandValidation.ts:1707][E: utils/shell/readOnlyCommandValidation.ts:1719][E: utils/shell/readOnlyCommandValidation.ts:1752][E: utils/shell/readOnlyCommandValidation.ts:1760][E: utils/shell/readOnlyCommandValidation.ts:1764][E: utils/shell/readOnlyCommandValidation.ts:1781][E: utils/shell/readOnlyCommandValidation.ts:1812][E: utils/shell/readOnlyCommandValidation.ts:1845]
10. Bash provider 构造命令时可 source snapshot、session env、disable extglob、`eval` 包装原命令并写 cwd tracking file; PowerShell provider 追加 `$LASTEXITCODE`/cwd tracking, sandbox 场景用 `-EncodedCommand` 包装。[E: utils/shell/bashProvider.ts:161][E: utils/shell/bashProvider.ts:170][E: utils/shell/bashProvider.ts:176][E: utils/shell/bashProvider.ts:184][E: utils/shell/bashProvider.ts:186][E: utils/shell/powershellProvider.ts:65][E: utils/shell/powershellProvider.ts:86][E: utils/shell/powershellProvider.ts:99]

## 设计动机与权衡

parser 把 `null` 和 `PARSE_ABORTED` 分开, 让“parser 没加载”和“parser 被输入触发 timeout/resource abort”走不同风险等级; 安全 AST path 对 abort 选择 too-complex, 是为了避免 adversarial input 退回弱 legacy parser 后被自动允许。[E: utils/bash/parser.ts:112][E: utils/bash/parser.ts:124][E: utils/bash/parser.ts:135][E: utils/bash/ast.ts:444][E: utils/bash/ast.ts:452][I]

prefix extraction 同时存在 deterministic spec path 和小模型 path: spec path 快且可预测, 小模型 path 覆盖未知 CLI 形态, LRU cache 和 rejection eviction 降低重复 API 成本与 aborted promise 污染。[E: utils/shell/specPrefix.ts:88][E: utils/shell/prefix.ts:92][E: utils/shell/prefix.ts:114][E: utils/shell/prefix.ts:122][E: utils/shell/prefix.ts:220][I]

read-only validation 倾向保守, 例如 bundled short flag 只允许所有单字母 flag 都是 no-arg, 这样会拒绝部分合法简写, 但避免 GNU getopt 与 validator 解析不一致导致目标命令漂移。[E: utils/shell/readOnlyCommandValidation.ts:1812][E: utils/shell/readOnlyCommandValidation.ts:1822][I]

## Gotcha

- `ParsedCommand.parse()` 仍有 regex fallback; 需要安全判断时优先看 `parseForSecurity()` 和 `checkSemantics()`, 不要把 legacy parse 成功等同于安全可自动允许。[E: utils/bash/ParsedCommand.ts:289][E: utils/bash/ast.ts:381][E: utils/bash/ast.ts:2213]
- `containsVulnerableUncPath()` 只在 Windows platform 返回真实检测结果, 非 Windows 直接 false; cross-platform 逻辑不能把它当成通用 URL/path detector。[E: utils/shell/readOnlyCommandValidation.ts:1562][E: utils/shell/readOnlyCommandValidation.ts:1564]
- `resolveDefaultShell()` 默认 shell 是 bash, 不会因为 Windows 自动切到 PowerShell; 调用者需要显式读取 settings/default shell 的结果。[E: utils/shell/resolveDefaultShell.ts:12][E: utils/shell/resolveDefaultShell.ts:13]

## Sources

- `utils/bash/parser.ts`
- `utils/bash/ast.ts`
- `utils/bash/ParsedCommand.ts`
- `utils/shell/prefix.ts`
- `utils/shell/specPrefix.ts`
- `utils/shell/readOnlyCommandValidation.ts`
- `utils/shell/shellProvider.ts`
- `utils/shell/bashProvider.ts`
- `utils/shell/powershellProvider.ts`
- `utils/shell/resolveDefaultShell.ts`

## 相关

- [权限系统](permissions.md)
- [工具系统机制](tool-system.md)
- [Tool call anatomy](../spine/tool-call-anatomy.md)
