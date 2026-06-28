---
id: subsys.tui.fuzzy-match
title: 模糊匹配
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/fuzzy.ts
symbols:
  - fuzzyMatch
  - fuzzyFilter
related:
  - subsys.tui.autocomplete
evidence: explicit
status: verified
updated: 5a073885
---

> TUI fuzzy match 是一个 lightweight search utility: `fuzzyMatch(query, text)` 判断 query 字符是否按顺序出现在 text 中并给出 score, `fuzzyFilter(items, query, getText)` 用这些 score 过滤和排序任意 item 列表。

## 能回答的问题

- `fuzzyMatch()` 的匹配条件是什么, 为什么 query 字符不要求连续?
- `score` 越小还是越大越好, 连续命中、word boundary、exact match 怎样影响排序?
- `codex52` 为什么可以匹配 `gpt-5.2-codex` 这类 alpha-numeric 反序文本?
- `fuzzyFilter()` 怎样把一个 query 拆成多个 token, 多个 token 之间是 AND 还是 OR?
- 调用方传入 `getText` 后, 原始 item 对象怎样被保留并按匹配质量返回?
- `subsys.tui.autocomplete` 如何复用这个 fuzzy filtering 语义?

## 职责边界

`packages/tui/src/fuzzy.ts` 的可见职责集中在 case-insensitive fuzzy matching、score 计算、multi-token filtering 和按 score 升序排序: `fuzzyMatch()` 先 lower-case query/text, `fuzzyFilter()` 拆 token 后汇总 score 并排序 [E: packages/tui/src/fuzzy.ts:13] [E: packages/tui/src/fuzzy.ts:14] [E: packages/tui/src/fuzzy.ts:104] [E: packages/tui/src/fuzzy.ts:123] [E: packages/tui/src/fuzzy.ts:135]。源码没有 UI focus、keyboard input、terminal rendering 或 autocomplete popup lifecycle 相关逻辑 [I]。`FuzzyMatch` 结果对象由 `matches` 和 `score` 组成, `fuzzyFilter()` 排序后返回原始 item 数组 [E: packages/tui/src/fuzzy.ts:7] [E: packages/tui/src/fuzzy.ts:8] [E: packages/tui/src/fuzzy.ts:9] [E: packages/tui/src/fuzzy.ts:136]。

本节点只覆盖 `fuzzyMatch` 和 `fuzzyFilter` 的 matching semantics。使用这些函数构建 command/model/settings completion UI 的行为属于调用方节点, 其中 `subsys.tui.autocomplete` 应描述 autocomplete 如何把 prefix、candidate list 和 popup selection 接到 `fuzzyFilter()` 上 [I]。

## 关键文件

- `packages/tui/src/fuzzy.ts`: 定义 `FuzzyMatch` interface、`fuzzyMatch()`、内部 `matchQuery()` scoring loop、alpha-numeric swap fallback、`fuzzyFilter()` tokenization/filter/sort pipeline [E: packages/tui/src/fuzzy.ts:7] [E: packages/tui/src/fuzzy.ts:12] [E: packages/tui/src/fuzzy.ts:16] [E: packages/tui/src/fuzzy.ts:30] [E: packages/tui/src/fuzzy.ts:75] [E: packages/tui/src/fuzzy.ts:77] [E: packages/tui/src/fuzzy.ts:99] [E: packages/tui/src/fuzzy.ts:104] [E: packages/tui/src/fuzzy.ts:135]。

## 数据模型

`FuzzyMatch` 是最小结果对象: `matches` 表示 query 是否命中 text, `score` 表示匹配质量;文件注释与 `fuzzyFilter()` 的升序排序实现共同表明 lower score = better match [E: packages/tui/src/fuzzy.ts:7] [E: packages/tui/src/fuzzy.ts:7] [E: packages/tui/src/fuzzy.ts:8] [E: packages/tui/src/fuzzy.ts:9] [E: packages/tui/src/fuzzy.ts:135]。

`fuzzyMatch(query, text)` 在入口把两边都转换为 lower-case, 因此匹配是 case-insensitive 的 [E: packages/tui/src/fuzzy.ts:13] [E: packages/tui/src/fuzzy.ts:14]。空 query 直接匹配任意 text 且 score 为 `0`;如果 normalized query 长度大于 text 长度, 直接返回不匹配 [E: packages/tui/src/fuzzy.ts:17] [E: packages/tui/src/fuzzy.ts:18] [E: packages/tui/src/fuzzy.ts:21] [E: packages/tui/src/fuzzy.ts:22]。

`fuzzyFilter<T>(items, query, getText)` 保留泛型 item 本身, 只用 `getText(item)` 生成可匹配文本;命中的 item 先以 `{ item, totalScore }` 暂存, 排序后再 map 回原始 item [E: packages/tui/src/fuzzy.ts:99] [E: packages/tui/src/fuzzy.ts:113] [E: packages/tui/src/fuzzy.ts:116] [E: packages/tui/src/fuzzy.ts:131] [E: packages/tui/src/fuzzy.ts:136]。

## 控制流

1. `fuzzyMatch(query, text)` 先构造 `queryLower` 和 `textLower`, 再通过内部 `matchQuery(normalizedQuery)` 执行 primary match [E: packages/tui/src/fuzzy.ts:13] [E: packages/tui/src/fuzzy.ts:14] [E: packages/tui/src/fuzzy.ts:16] [E: packages/tui/src/fuzzy.ts:70]。
2. `matchQuery()` 用 `queryIndex` 扫描 normalized query, 用 `for` loop 从左到右扫描 `textLower`;只有 `textLower[i] === normalizedQuery[queryIndex]` 时才推进 query, 因而 query 字符必须按顺序出现, 但中间可以有 gap [E: packages/tui/src/fuzzy.ts:25] [E: packages/tui/src/fuzzy.ts:30] [E: packages/tui/src/fuzzy.ts:31] [E: packages/tui/src/fuzzy.ts:55]。
3. 每次命中字符时, matcher 先判断该位置是否在 word boundary: index `0` 或前一个字符匹配 whitespace、hyphen、underscore、dot、slash、colon [E: packages/tui/src/fuzzy.ts:32]。
4. 如果当前命中紧接上一次命中, `consecutiveMatches` 递增并把 `score` 减去 `consecutiveMatches * 5`;如果不是连续命中且不是第一次命中, gap 长度会以每个字符 `2` 分加入 penalty [E: packages/tui/src/fuzzy.ts:35] [E: packages/tui/src/fuzzy.ts:36] [E: packages/tui/src/fuzzy.ts:37] [E: packages/tui/src/fuzzy.ts:41] [E: packages/tui/src/fuzzy.ts:42]。
5. word boundary 命中会额外减 `10`, 较晚位置命中会加 `i * 0.1`;结合按 score 升序排序, 这些规则会影响边界、较早位置、连续匹配的相对排名 [E: packages/tui/src/fuzzy.ts:47] [E: packages/tui/src/fuzzy.ts:48] [E: packages/tui/src/fuzzy.ts:52] [E: packages/tui/src/fuzzy.ts:135] [I]。
6. loop 结束后, 如果 `queryIndex` 还没走完 normalized query, `matchQuery()` 返回不匹配;如果 normalized query 与 `textLower` 完全相同, score 再减 `100` 来优先 exact match [E: packages/tui/src/fuzzy.ts:59] [E: packages/tui/src/fuzzy.ts:60] [E: packages/tui/src/fuzzy.ts:63] [E: packages/tui/src/fuzzy.ts:64]。
7. primary match 成功时 `fuzzyMatch()` 直接返回;primary match 失败时, 它尝试识别纯 letters+digits 或 digits+letters query, 生成互换顺序的 `swappedQuery` [E: packages/tui/src/fuzzy.ts:70] [E: packages/tui/src/fuzzy.ts:71] [E: packages/tui/src/fuzzy.ts:72] [E: packages/tui/src/fuzzy.ts:75] [E: packages/tui/src/fuzzy.ts:76] [E: packages/tui/src/fuzzy.ts:77]。
8. 没有可互换 query 时返回 primary failure;有 `swappedQuery` 时再次 `matchQuery(swappedQuery)`, 成功则返回 `{ matches: true, score: swappedMatch.score + 5 }`, 这让 alpha-numeric reorder 可以命中但带有小 penalty [E: packages/tui/src/fuzzy.ts:83] [E: packages/tui/src/fuzzy.ts:84] [E: packages/tui/src/fuzzy.ts:87] [E: packages/tui/src/fuzzy.ts:88] [E: packages/tui/src/fuzzy.ts:92]。

## Filtering 语义

`fuzzyFilter()` 对 blank query 直接返回原 `items` array, 不复制、不排序;`query.trim()` 为空时即走这个 fast path [E: packages/tui/src/fuzzy.ts:100] [E: packages/tui/src/fuzzy.ts:101]。非空 query 会先 `trim()`, 再用 `/[\s/]+/` 按 whitespace 和 slash 拆 token, 并过滤空 token [E: packages/tui/src/fuzzy.ts:104] [E: packages/tui/src/fuzzy.ts:105] [E: packages/tui/src/fuzzy.ts:106] [E: packages/tui/src/fuzzy.ts:107]。

多个 token 是 AND 关系: 每个 item 对每个 token 调用 `fuzzyMatch(token, text)`, 任一 token 不匹配就把 `allMatch` 置为 false 并 `break`;只有全部 token 都匹配的 item 才进入 `results` [E: packages/tui/src/fuzzy.ts:120] [E: packages/tui/src/fuzzy.ts:121] [E: packages/tui/src/fuzzy.ts:122] [E: packages/tui/src/fuzzy.ts:125] [E: packages/tui/src/fuzzy.ts:126] [E: packages/tui/src/fuzzy.ts:130] [E: packages/tui/src/fuzzy.ts:131]。

每个 token 的 score 会加到 `totalScore`, 最后 `results.sort((a, b) => a.totalScore - b.totalScore)` 按总分升序排列, 即 lower total score first [E: packages/tui/src/fuzzy.ts:117] [E: packages/tui/src/fuzzy.ts:123] [E: packages/tui/src/fuzzy.ts:135]。因为 `getText(item)` 对每个 item 只调用一次, 同一个 item 的所有 token 都匹配同一段 text, 不会为不同 token 生成不同 searchable fields [E: packages/tui/src/fuzzy.ts:116] [E: packages/tui/src/fuzzy.ts:120] [I]。

## 设计动机与权衡

- 该算法是 subsequence matcher, 不是 edit-distance、prefix-only 或 full-text scorer: 它只要求 query 字符按顺序出现, 并通过 gap penalty、boundary bonus 和 exact-match bonus 调整排序 [E: packages/tui/src/fuzzy.ts:30] [E: packages/tui/src/fuzzy.ts:42] [E: packages/tui/src/fuzzy.ts:48] [E: packages/tui/src/fuzzy.ts:64] [I]。
- score 使用负向 bonus 和正向 penalty 混合, 因此调用方不能把 `score > 0` 当作匹配条件;唯一可靠匹配布尔值是 `matches` [E: packages/tui/src/fuzzy.ts:8] [E: packages/tui/src/fuzzy.ts:9] [E: packages/tui/src/fuzzy.ts:60] [E: packages/tui/src/fuzzy.ts:67] [I]。
- alpha-numeric swap fallback 只支持整体 query 形如 letters+digits 或 digits+letters;包含 hyphen、dot、slash 或多段混合的 query 不会进入 swap fallback, 但仍可能通过 normal subsequence 或 `fuzzyFilter()` tokenization 命中 [E: packages/tui/src/fuzzy.ts:75] [E: packages/tui/src/fuzzy.ts:76] [E: packages/tui/src/fuzzy.ts:83] [E: packages/tui/src/fuzzy.ts:106] [I]。

## Gotchas

- word boundary 字符集合固定为 whitespace、`-`、`_`、`.`、`/`、`:`, 不包括 camelCase transition;例如 `fooBar` 的 `B` 不会因为前一位是 lowercase letter 而被当作 boundary [E: packages/tui/src/fuzzy.ts:32] [I]。
- `fuzzyFilter()` 用 slash 拆 token, 所以 `provider/model` 查询会变成两个必须同时命中的 token;这适合 model/provider 这类 compound search, 但调用方如果希望 slash 作为普通字符参与 fuzzy subsequence, 需要直接调用 `fuzzyMatch()` 或调整 query/text 设计 [E: packages/tui/src/fuzzy.ts:106] [E: packages/tui/src/fuzzy.ts:120] [I]。
- `Array.prototype.sort()` 只按 `totalScore` 比较;源码没有显式 secondary tie-breaker, 因而本模块本身没有定义同分 item 的额外排序规则 [E: packages/tui/src/fuzzy.ts:135] [I]。
- blank query 返回传入的同一个 `items` 引用;调用方如果随后原地修改返回数组, 等同于修改原数组 [E: packages/tui/src/fuzzy.ts:100] [E: packages/tui/src/fuzzy.ts:101] [I]。

## 跨包边界

`subsys.tui.autocomplete` 是 TUI autocomplete UI 的计划节点: 它应负责解释候选项、prefix extraction、selection state 和 popup rendering;本节点只定义 autocomplete 可复用的 candidate filtering/scoring primitive [I]。

`fuzzyFilter()` 的泛型签名允许调用方保留任意 item 结构, 但 scorer 本身只通过 `getText(item)` 看到字符串;模型、会话、设置项或命令等业务结构不进入本文件的 matching 逻辑 [E: packages/tui/src/fuzzy.ts:99] [E: packages/tui/src/fuzzy.ts:116] [I]。

## Sources

- `packages/tui/src/fuzzy.ts`

## 相关

- [subsys.tui.autocomplete](autocomplete.md): TUI autocomplete 候选过滤、prefix 匹配和弹出选择 UI 的计划节点。
