---
id: subsys.exec-sandbox.execpolicy-dsl
title: execpolicy DSL
kind: subsystem
tier: T2
source: [codex-rs/execpolicy/src/policy.rs, codex-rs/execpolicy/src/parser.rs, codex-rs/execpolicy/src/decision.rs, codex-rs/execpolicy/src/rule.rs, codex-rs/execpolicy-legacy/src, docs/execpolicy.md]
symbols: [PolicyParser, Policy, PrefixRule, NetworkRule, Decision, Evaluation, MatchOptions, get_default_policy]
related: [subsys.core.approval-policy, subsys.exec-sandbox.shell-parsing, subsys.exec-sandbox.shell-escalation]
evidence: explicit
status: verified
updated: 5670360009
---

> execpolicy DSL 是 Codex 用 Starlark-like 文件描述 command prefix rules、network rules 和 host executable allowlists 的 policy layer；evaluation 结果是 `Allow`、`Prompt`、`Forbidden` 中优先级最高的 `Decision`。[E: codex-rs/execpolicy/src/parser.rs:57][E: codex-rs/execpolicy/src/decision.rs:9][E: codex-rs/execpolicy/src/policy.rs:365]

## 能回答的问题

- `prefix_rule`、`network_rule`、`host_executable` 的语法字段是什么？
- `Decision::Allow`、`Decision::Prompt`、`Decision::Forbidden` 怎样解析和排序？
- rule matching 如何处理 command prefix、alternatives、host executable resolution？
- unmatched command fallback 与 heuristics match 在 `Evaluation` 中怎样体现？
- legacy execpolicy 与当前 execpolicy crate 的结构差异是什么？

## 职责边界

execpolicy DSL 节点覆盖 `codex-rs/execpolicy` parser/evaluator 和 `codex-rs/execpolicy-legacy` default policy parser。它不覆盖 approval prompt UI，也不覆盖 shell escalation 的 socket protocol；approval prompt 和 execve interception 只消费 `Decision` 与 `Evaluation` 的结果。[I]

`Decision` 只有三个值：`Allow`、`Prompt`、`Forbidden`。字符串解析接受 `"allow"`、`"prompt"`、`"forbidden"`；network rule 的 parser 还把 `"deny"` 作为 `Forbidden` 的别名。[E: codex-rs/execpolicy/src/decision.rs:9][E: codex-rs/execpolicy/src/decision.rs:13][E: codex-rs/execpolicy/src/decision.rs:15][E: codex-rs/execpolicy/src/decision.rs:19][E: codex-rs/execpolicy/src/decision.rs:22][E: codex-rs/execpolicy/src/decision.rs:25][E: codex-rs/execpolicy/src/parser.rs:253]

## 关键 crate/文件

- `codex-rs/execpolicy/src/parser.rs`: Starlark Extended dialect parser、builtins、example validation 和 policy builder。[E: codex-rs/execpolicy/src/parser.rs:57][E: codex-rs/execpolicy/src/parser.rs:75][E: codex-rs/execpolicy/src/parser.rs:133]
- `codex-rs/execpolicy/src/policy.rs`: rule storage、overlay merge、network domain compilation、command evaluation。[E: codex-rs/execpolicy/src/policy.rs:28][E: codex-rs/execpolicy/src/policy.rs:141][E: codex-rs/execpolicy/src/policy.rs:167][E: codex-rs/execpolicy/src/policy.rs:188]
- `codex-rs/execpolicy/src/rule.rs`: prefix pattern、network protocol/host normalization、rule match shape 和 examples validation。[E: codex-rs/execpolicy/src/rule.rs:40][E: codex-rs/execpolicy/src/rule.rs:118][E: codex-rs/execpolicy/src/rule.rs:156][E: codex-rs/execpolicy/src/rule.rs:246]
- `codex-rs/execpolicy-legacy/src`: legacy default policy loader 和旧 `define_program` DSL。[E: codex-rs/execpolicy-legacy/src/lib.rs:40][E: codex-rs/execpolicy-legacy/src/policy_parser.rs:123]

## DSL 语法

`PolicyParser::parse` 用 `ExtendedDialect` 解析 policy 文本，并向 Starlark module 注入 `policy_builtins()`。[E: codex-rs/execpolicy/src/parser.rs:57][E: codex-rs/execpolicy/src/parser.rs:64][E: codex-rs/execpolicy/src/parser.rs:75] parser 在执行 policy 后会遍历 pending validations，把 `match` examples 要求为 match，把 `not_match` examples 要求为 non-match。[E: codex-rs/execpolicy/src/parser.rs:133][E: codex-rs/execpolicy/src/parser.rs:140][E: codex-rs/execpolicy/src/parser.rs:146]

- `prefix_rule(pattern, decision=None, match=None, not_match=None, justification=None)`: `pattern` 可以是 string token 列表，也可以包含 list alternatives；`decision` 为空时默认 `Allow`；`justification` 为空字符串会报错；如果第一 token 有 alternatives，parser 会展开成多个 `PrefixRule`。[E: codex-rs/execpolicy/src/parser.rs:348][E: codex-rs/execpolicy/src/parser.rs:356][E: codex-rs/execpolicy/src/parser.rs:362][E: codex-rs/execpolicy/src/parser.rs:390][E: codex-rs/execpolicy/src/parser.rs:405]
- `network_rule(host, protocol, decision, justification=None)`: `protocol` 解析为 `NetworkRuleProtocol`，`decision` 解析为 `Decision` 或 `deny` alias，`host` 经过 normalization 后存入 rule。[E: codex-rs/execpolicy/src/parser.rs:410][E: codex-rs/execpolicy/src/parser.rs:416][E: codex-rs/execpolicy/src/parser.rs:417][E: codex-rs/execpolicy/src/parser.rs:427]
- `host_executable(name, paths)`: `name` 必须是 bare executable name；`paths` 必须是 absolute path，basename 必须匹配 `name`；parser 会 dedupe paths 并按 lookup key 保存。[E: codex-rs/execpolicy/src/parser.rs:437][E: codex-rs/execpolicy/src/parser.rs:441][E: codex-rs/execpolicy/src/parser.rs:451][E: codex-rs/execpolicy/src/parser.rs:452][E: codex-rs/execpolicy/src/parser.rs:464][E: codex-rs/execpolicy/src/parser.rs:470]

`parse_pattern` 对 string value 直接保存为单个 pattern token；对 list alternatives 递归解析并拒绝空 alternatives。examples 可以从 string 通过 `shlex::split` 解析，也可以直接写 list。[E: codex-rs/execpolicy/src/parser.rs:171][E: codex-rs/execpolicy/src/parser.rs:186][E: codex-rs/execpolicy/src/parser.rs:194][E: codex-rs/execpolicy/src/parser.rs:216][E: codex-rs/execpolicy/src/parser.rs:284][E: codex-rs/execpolicy/src/parser.rs:314]

## 数据模型

- `Policy`: 保存 `rules_by_program`、`network_rules`、`host_executables` 三类表。[E: codex-rs/execpolicy/src/policy.rs:27][E: codex-rs/execpolicy/src/policy.rs:28][E: codex-rs/execpolicy/src/policy.rs:29][E: codex-rs/execpolicy/src/policy.rs:30]
- `PrefixPattern`: `first` 是首 token，`rest` 是后续 tokens，`matches_prefix` 要求 command 长度足够、首 token 匹配、后续 tokens 逐个匹配。[E: codex-rs/execpolicy/src/rule.rs:37][E: codex-rs/execpolicy/src/rule.rs:39][E: codex-rs/execpolicy/src/rule.rs:40][E: codex-rs/execpolicy/src/rule.rs:45][E: codex-rs/execpolicy/src/rule.rs:55]
- `PatternToken`: `Single(String)` 或 `Alts(Vec<String>)`，matching 时 `Single` 做字符串相等，`Alts` 用 alternatives membership。[E: codex-rs/execpolicy/src/rule.rs:14][E: codex-rs/execpolicy/src/rule.rs:15][E: codex-rs/execpolicy/src/rule.rs:16][E: codex-rs/execpolicy/src/rule.rs:24][E: codex-rs/execpolicy/src/rule.rs:29]
- `RuleMatch`: `PrefixRuleMatch` 记录 matched prefix、decision、resolved program、justification；`HeuristicsRuleMatch` 记录 fallback command 和 fallback decision。[E: codex-rs/execpolicy/src/rule.rs:64][E: codex-rs/execpolicy/src/rule.rs:67][E: codex-rs/execpolicy/src/rule.rs:70][E: codex-rs/execpolicy/src/rule.rs:76][E: codex-rs/execpolicy/src/rule.rs:78]
- `Evaluation`: 保存最终 `decision` 与 `matched_rules`。[E: codex-rs/execpolicy/src/policy.rs:349][E: codex-rs/execpolicy/src/policy.rs:350][E: codex-rs/execpolicy/src/policy.rs:351]

## 控制流

1. `PolicyParser::parse` 解析 policy 文本，执行 builtins，把规则写入 `PolicyBuilder`，再运行 examples validation。[E: codex-rs/execpolicy/src/parser.rs:57][E: codex-rs/execpolicy/src/parser.rs:87][E: codex-rs/execpolicy/src/parser.rs:133]
2. `Policy::add_prefix_rule` 把 `PrefixRule` 按首 token(`first_token`)作为 key 插入 `rules_by_program` map；`add_network_rule` 按 protocol/host/decision 保存 network rule。[E: codex-rs/execpolicy/src/policy.rs:91][E: codex-rs/execpolicy/src/policy.rs:109][E: codex-rs/execpolicy/src/policy.rs:113][E: codex-rs/execpolicy/src/policy.rs:129]
3. `Policy::merge_overlay` 把 overlay 的 prefix rules、network rules 和 host executable paths 追加或覆盖进 base policy。[E: codex-rs/execpolicy/src/policy.rs:141][E: codex-rs/execpolicy/src/policy.rs:147][E: codex-rs/execpolicy/src/policy.rs:154][E: codex-rs/execpolicy/src/policy.rs:160]
4. `Policy::check_multiple_with_options` 对候选 command 逐个调用 `matches`，收集所有 matches 后交给 `Evaluation::from_matches`。[E: codex-rs/execpolicy/src/policy.rs:232][E: codex-rs/execpolicy/src/policy.rs:240][E: codex-rs/execpolicy/src/policy.rs:250]
5. `matches` 先尝试 exact rules，再可选解析 host executable；都没有匹配时调用 fallback 生成 heuristics match。[E: codex-rs/execpolicy/src/policy.rs:268][E: codex-rs/execpolicy/src/policy.rs:278][E: codex-rs/execpolicy/src/policy.rs:282][E: codex-rs/execpolicy/src/policy.rs:290]
6. host executable matching 要求 argv[0] 是 absolute path，按 basename lookup host executable rule，allowlist 不为空时要求 exact path 命中，然后把 command[0] 改写为 basename 参与 prefix rule match。[E: codex-rs/execpolicy/src/policy.rs:307][E: codex-rs/execpolicy/src/policy.rs:314][E: codex-rs/execpolicy/src/policy.rs:319][E: codex-rs/execpolicy/src/policy.rs:326][E: codex-rs/execpolicy/src/policy.rs:331]
7. `Evaluation::from_matches` 取所有 matched rules 中最大的 `Decision` 作为最终 decision；由于 enum 派生 `Ord` 且顺序为 Allow、Prompt、Forbidden，Forbidden 优先级最高。[E: codex-rs/execpolicy/src/policy.rs:365][E: codex-rs/execpolicy/src/policy.rs:371][E: codex-rs/execpolicy/src/decision.rs:9][E: codex-rs/execpolicy/src/decision.rs:15]
8. `compiled_network_domains` 对 network rules 做 allow/deny 域集合编译；`Allow` 会移除 denied 并插入 allowed，`Forbidden` 会移除 allowed 并插入 denied，`Prompt` 被忽略。[E: codex-rs/execpolicy/src/policy.rs:167][E: codex-rs/execpolicy/src/policy.rs:172][E: codex-rs/execpolicy/src/policy.rs:177][E: codex-rs/execpolicy/src/policy.rs:182]

## legacy execpolicy

legacy crate 通过 `include_str!("default.policy")` 嵌入 default policy，并由 `get_default_policy` 调用 legacy parser。[E: codex-rs/execpolicy-legacy/src/lib.rs:40][E: codex-rs/execpolicy-legacy/src/lib.rs:43] legacy parser 的 builtins 包括 `define_program`、`forbid_substrings`、`forbid_program_regex`、`opt`、`flag`。[E: codex-rs/execpolicy-legacy/src/policy_parser.rs:123][E: codex-rs/execpolicy-legacy/src/policy_parser.rs:184][E: codex-rs/execpolicy-legacy/src/policy_parser.rs:198][E: codex-rs/execpolicy-legacy/src/policy_parser.rs:215][E: codex-rs/execpolicy-legacy/src/policy_parser.rs:221]

legacy `Policy::check` 先检查 forbidden program regex，再检查 forbidden substrings，最后尝试 program specs；命中 negative/positive examples 由 legacy policy 的 example checkers 验证。[E: codex-rs/execpolicy-legacy/src/policy.rs:44][E: codex-rs/execpolicy-legacy/src/policy.rs:58][E: codex-rs/execpolicy-legacy/src/policy.rs:72][E: codex-rs/execpolicy-legacy/src/policy.rs:88][E: codex-rs/execpolicy-legacy/src/policy.rs:96]

## 设计动机与权衡

- 当前 execpolicy 使用 prefix rules 而不是完整 shell AST，这让 policy evaluation 可以在 direct argv、host executable 和 intercepted exec 场景复用同一套 `Vec<String>` command matching。[I]
- `Decision` 用 enum order 决定优先级，减少了多条规则命中时的额外 resolver；代价是所有 rule source 都共享同一个 Allow < Prompt < Forbidden lattice。[E: codex-rs/execpolicy/src/decision.rs:9][E: codex-rs/execpolicy/src/policy.rs:371]
- host executable resolution 只在 argv[0] 是 absolute path 时生效，可以把 `/usr/bin/git` 这样的绝对路径映射到 `git` prefix rules，同时避免对相对路径做 PATH 搜索推断。[E: codex-rs/execpolicy/src/policy.rs:307][E: codex-rs/execpolicy/src/policy.rs:331]

## gotcha

- `Evaluation::is_match` 对只有 `HeuristicsRuleMatch` 的 evaluation 返回 false；heuristics fallback 可以提供 decision，但不算 policy rule match。[E: codex-rs/execpolicy/src/policy.rs:357][E: codex-rs/execpolicy/src/policy.rs:361]
- network rule host normalization 会拒绝 scheme、path、query、fragment、wildcards 和 whitespace，并会去掉 bracket/port/trailing dot 后 lower-case。[E: codex-rs/execpolicy/src/rule.rs:156][E: codex-rs/execpolicy/src/rule.rs:166][E: codex-rs/execpolicy/src/rule.rs:173][E: codex-rs/execpolicy/src/rule.rs:181][E: codex-rs/execpolicy/src/rule.rs:194][E: codex-rs/execpolicy/src/rule.rs:207]
- `prefix_rule` 的 default decision 是 `Allow`；没有显式写 `decision` 并不代表 Prompt。[E: codex-rs/execpolicy/src/parser.rs:356][E: codex-rs/execpolicy/src/parser.rs:359]

## Sources

- `codex-rs/execpolicy/src/parser.rs`
- `codex-rs/execpolicy/src/policy.rs`
- `codex-rs/execpolicy/src/decision.rs`
- `codex-rs/execpolicy/src/rule.rs`
- `codex-rs/execpolicy-legacy/src`
- `docs/execpolicy.md`

## 相关

- `subsys.core.approval-policy`
- `subsys.exec-sandbox.shell-parsing`
- `subsys.exec-sandbox.shell-escalation`
