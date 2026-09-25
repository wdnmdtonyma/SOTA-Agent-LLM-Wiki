---
id: subsys.tui.autocomplete
title: 自动完成
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/autocomplete.ts, packages/tui/test/autocomplete.test.ts, packages/tui/test/autocomplete-skill-slash.test.ts]
symbols: [AutocompleteProvider, CombinedAutocompleteProvider]
related: [subsys.tui.fuzzy-match, subsys.tui.editor-component]
evidence: explicit
status: verified
updated: ff72faba28
---

> 自动完成 subsystem 是 `pi-tui` 的 provider contract 与默认 `CombinedAutocompleteProvider`: 它把 slash commands、slash command arguments、普通 file path completion、`@file` fuzzy attachment completion 统一成 editor 可消费的 suggestions 和 applyCompletion 结果。

## 能回答的问题

- `AutocompleteProvider` 需要向 editor 暴露哪些方法和数据?
- `CombinedAutocompleteProvider` 如何区分 slash command、command argument、`@` attachment 和普通 path completion?
- `@` fuzzy 结果同分时为什么浅层 path 排在深层 path 前面(#8669)?
- 为什么 `@` 补全依赖 `fd`, 而普通 path completion 直接读目录?
- completion 被应用时如何改写当前行和 cursor position?
- 引号、空格、`~/`、absolute path、directory slash 在补全里如何处理?
- `/skill` 前缀为什么还能列出 `skill:*` 命令(#9944)?
- 括号、反引号、CJK 标点后的 path / `@` 补全怎样切 token?

## 职责边界

`AutocompleteProvider` 是 TUI editor 与补全实现之间的 interface: provider 可以声明 `triggerCharacters`, 必须实现 async `getSuggestions(...)`, 必须实现 `applyCompletion(...)`, 并可选实现 `shouldTriggerFileCompletion(...)` 供 explicit Tab completion 判断是否触发文件补全 [E: packages/tui/src/autocomplete.ts:271] [E: packages/tui/src/autocomplete.ts:277] [E: packages/tui/src/autocomplete.ts:286] [E: packages/tui/src/autocomplete.ts:299]。

`CombinedAutocompleteProvider` 是默认组合实现, constructor 接收 command list、`basePath` 和可选 `fdPath`, 并把它们保存为实例状态 [E: packages/tui/src/autocomplete.ts:303] [E: packages/tui/src/autocomplete.ts:308] [E: packages/tui/src/autocomplete.ts:309] [E: packages/tui/src/autocomplete.ts:311]。它不负责渲染 dropdown、处理按键或 debounce;这些属于 [subsys.tui.editor-component](editor-component.md) 的 editor 组件职责 [I]。

## 关键文件

`packages/tui/src/autocomplete.ts` 同时定义 `AutocompleteItem`、`SlashCommand`、`AutocompleteSuggestions`、`AutocompleteProvider` 和 `CombinedAutocompleteProvider`, 因此本节点覆盖的是补全数据模型与 provider 算法, 不是 UI list rendering [E: packages/tui/src/autocomplete.ts:249] [E: packages/tui/src/autocomplete.ts:257] [E: packages/tui/src/autocomplete.ts:266] [E: packages/tui/src/autocomplete.ts:271] [E: packages/tui/src/autocomplete.ts:303]。

## 数据模型

`AutocompleteItem` 包含 `value`、`label` 和可选 `description` 字段 [E: packages/tui/src/autocomplete.ts:249] [E: packages/tui/src/autocomplete.ts:250] [E: packages/tui/src/autocomplete.ts:251] [E: packages/tui/src/autocomplete.ts:252]。`AutocompleteSuggestions` 把 `items` 与 `prefix` 绑在一起;`prefix` 的源码注释标为当前匹配文本片段, `applyCompletion()` 会用它回算 `beforePrefix` [E: packages/tui/src/autocomplete.ts:266] [E: packages/tui/src/autocomplete.ts:267] [E: packages/tui/src/autocomplete.ts:268] [E: packages/tui/src/autocomplete.ts:422]。

`SlashCommand` 支持 `name`、可选 `description`、可选 `argumentHint`, 并允许每个命令提供 async 或 sync `getArgumentCompletions(argumentPrefix)`;返回 `null` 表示没有 argument completion [E: packages/tui/src/autocomplete.ts:255] [E: packages/tui/src/autocomplete.ts:257] [E: packages/tui/src/autocomplete.ts:259] [E: packages/tui/src/autocomplete.ts:260] [E: packages/tui/src/autocomplete.ts:263]。`CombinedAutocompleteProvider` 的 command list 类型允许混合 `SlashCommand` 与普通 `AutocompleteItem`, 所以调用方可以只给简单 command item, 也可以给带 argument completer 的 command object [E: packages/tui/src/autocomplete.ts:304] [E: packages/tui/src/autocomplete.ts:308]。

path completion 的输入 token 由 delimiter 切分;delimiter set 包含空格、tab、双引号、单引号和 `=` [E: packages/tui/src/autocomplete.ts:8]。`findLastDelimiter()` 还会把 `autocompleteSeparatorRegex`（含 CJK 标点）当分隔符 [E: packages/tui/src/autocomplete.ts:49] [E: packages/tui/src/autocomplete.ts:54]。开括号/反引号等 opening wrapper 由 `PATH_WRAPPERS` 映射到 closer：`(`→`)`、`[`→`]`、`{`→`}`、`<`→`>`、backtick→backtick [E: packages/tui/src/autocomplete.ts:11]。`stripLeadingWrappers()` 剥掉 token 前导 wrapper，但若 token 内部已有对应 closer（例如 `app/[slug]/pa`）则保留 [E: packages/tui/src/autocomplete.ts:63] [E: packages/tui/src/autocomplete.ts:67]。双引号 token 有专门处理: `findUnclosedQuoteStart()` 追踪未闭合双引号, `extractQuotedPrefix()` 会返回普通 quoted token 或带前导 `@` 的 quoted attachment token；quoted 起点前面的 wrapper 也会被 `isTokenStart()` 跳过 [E: packages/tui/src/autocomplete.ts:75] [E: packages/tui/src/autocomplete.ts:91] [E: packages/tui/src/autocomplete.ts:99] [E: packages/tui/src/autocomplete.ts:105] [E: packages/tui/src/autocomplete.ts:109] [E: packages/tui/src/autocomplete.ts:116]。

## 控制流

1. `CombinedAutocompleteProvider.getSuggestions()` 先读取当前行和 cursor 前文本, 然后优先尝试 `extractAtPrefix(textBeforeCursor)` [E: packages/tui/src/autocomplete.ts:320] [E: packages/tui/src/autocomplete.ts:321] [E: packages/tui/src/autocomplete.ts:323]。如果存在 `@` prefix, provider 会通过 `parsePathPrefix()` 去掉 `@` 或 `@"` 外壳, 调用 `getFuzzyFileSuggestions(rawPrefix, { signal })`, 并把原始 `@` prefix 作为替换范围返回 [E: packages/tui/src/autocomplete.ts:120] [E: packages/tui/src/autocomplete.ts:121] [E: packages/tui/src/autocomplete.ts:126] [E: packages/tui/src/autocomplete.ts:127] [E: packages/tui/src/autocomplete.ts:325] [E: packages/tui/src/autocomplete.ts:326] [E: packages/tui/src/autocomplete.ts:332] [E: packages/tui/src/autocomplete.ts:334]。

2. 如果不是 forced completion 且 cursor 前文本以 `/` 开头, provider 进入 slash command 分支 [E: packages/tui/src/autocomplete.ts:338]。没有空格时, 它把 command list 标准化成 `{ name, label, description }`, 把 `argumentHint` 拼进 description, 再分两路 `fuzzyFilter`：先按 bare name 过滤，`skill:` 命令只用冒号后的名字匹配，这样 `/skill` 和 `/idea` 都能命中 `skill:research-idea`；未进 bare 集合的 `skill:*` 再按全名 `skill:...` 过滤一次，结果 bare 命中在前、全名-only 命中在后 [E: packages/tui/src/autocomplete.ts:341] [E: packages/tui/src/autocomplete.ts:343] [E: packages/tui/src/autocomplete.ts:355] [E: packages/tui/src/autocomplete.ts:359] [E: packages/tui/src/autocomplete.ts:364]。测试锁：`/skill` 列出全部 `skill:*`（#9944）；`/idea` 把 `skill:research-idea` 排在 `skill:deep-research` 前面；显式 `/skill:side` 仍匹配全名 [E: packages/tui/test/autocomplete-skill-slash.test.ts:41] [E: packages/tui/test/autocomplete-skill-slash.test.ts:24] [E: packages/tui/test/autocomplete-skill-slash.test.ts:35]。这个 fuzzy 匹配算法的权威节点是 [subsys.tui.fuzzy-match](fuzzy-match.md) [I]。

3. slash command 后已经有空格时, provider 把 `/name ` 后面的文本视为 `argumentText`, 精确查找同名 command, 只在该 command 实现 `getArgumentCompletions` 时返回 argument suggestions [E: packages/tui/src/autocomplete.ts:378] [E: packages/tui/src/autocomplete.ts:379] [E: packages/tui/src/autocomplete.ts:381] [E: packages/tui/src/autocomplete.ts:383] [E: packages/tui/src/autocomplete.ts:385] [E: packages/tui/src/autocomplete.ts:389] [E: packages/tui/src/autocomplete.ts:394]。

4. 其余情况进入普通 path completion: `extractPathPrefix(textBeforeCursor, force)` 决定是否有 path-like prefix, `getFileSuggestions(pathMatch)` 同步读取目录并返回候选 [E: packages/tui/src/autocomplete.ts:400] [E: packages/tui/src/autocomplete.ts:405] [E: packages/tui/src/autocomplete.ts:408]。`extractAtPrefix` / `extractPathPrefix` 都先处理 quoted token，再 `findLastDelimiter` + `stripLeadingWrappers`，因此 `(@REA`、`` `src/ma ``、`see (~/Dev` 的补全 prefix 不含开括号/反引号 [E: packages/tui/src/autocomplete.ts:508] [E: packages/tui/src/autocomplete.ts:525] [E: packages/tui/src/autocomplete.ts:63]。测试锁：`(` `[` `` ` `` `<` `{` 以及 `see (` 后的 `@REA` 都能补全，且 apply 后 wrapper 留在原位；`foo(@REA` 这种字母后紧跟 `(` 不当 attachment [E: packages/tui/test/autocomplete.test.ts:170] [E: packages/tui/test/autocomplete.test.ts:179] [E: packages/tui/test/autocomplete.test.ts:181]。非 forced 情况下, path prefix 必须看起来像路径, 即包含 `/`、以 `.` 开头、以 `~/` 开头, 或者是在空白/CJK 标点之后的空 token [E: packages/tui/src/autocomplete.ts:535] [E: packages/tui/src/autocomplete.ts:541]。

5. `applyCompletion()` 用 provider 返回的 `prefix` 计算 `beforePrefix` 与 `afterCursor`, 然后按 slash command、`@` attachment、slash command argument、普通 file path 四类改写当前行 [E: packages/tui/src/autocomplete.ts:421] [E: packages/tui/src/autocomplete.ts:422] [E: packages/tui/src/autocomplete.ts:432] [E: packages/tui/src/autocomplete.ts:447] [E: packages/tui/src/autocomplete.ts:468] [E: packages/tui/src/autocomplete.ts:486]。slash command name completion 会自动插入前导 `/` 和尾随空格, 并把 cursor 放到 command name 后的空格之后 [E: packages/tui/src/autocomplete.ts:435] [E: packages/tui/src/autocomplete.ts:442]。

## 文件补全算法

普通 path completion 使用 `readdirSync(searchDir, { withFileTypes: true })` 枚举当前目录, 仅保留 name 以 search prefix 开头的 entry, 对 symlink 会额外 `statSync()` 判断是否指向目录 [E: packages/tui/src/autocomplete.ts:648] [E: packages/tui/src/autocomplete.ts:651] [E: packages/tui/src/autocomplete.ts:652] [E: packages/tui/src/autocomplete.ts:658] [E: packages/tui/src/autocomplete.ts:661]。候选 value 会保留 `~/`、absolute path、`./` 等 display shape, directory 追加 `/`, 然后通过 `buildCompletionValue()` 决定是否加 `@` 和 quote [E: packages/tui/src/autocomplete.ts:676] [E: packages/tui/src/autocomplete.ts:680] [E: packages/tui/src/autocomplete.ts:691] [E: packages/tui/src/autocomplete.ts:705] [E: packages/tui/src/autocomplete.ts:706]。

`buildCompletionValue()` 的 quote 规则很窄: 原 prefix 已经是 quoted prefix, 或 path 自身包含空格时才加双引号;`@` prefix 会被保留在 quote 外侧 [E: packages/tui/src/autocomplete.ts:137] [E: packages/tui/src/autocomplete.ts:139] [E: packages/tui/src/autocomplete.ts:143] [E: packages/tui/src/autocomplete.ts:145]。普通 path completion 的排序是 directories first, 然后按 label alphabetic order [E: packages/tui/src/autocomplete.ts:719] [E: packages/tui/src/autocomplete.ts:722] [E: packages/tui/src/autocomplete.ts:724]。

`@` fuzzy attachment completion 只在 `fdPath` 存在且 abort signal 未取消时运行;没有 `fdPath` 或 signal 已 abort 会直接返回空列表 [E: packages/tui/src/autocomplete.ts:775] [E: packages/tui/src/autocomplete.ts:776]。`walkDirectoryWithFd()` 调用 `fd` 时设置 base directory、max results、file/directory type、follow symlinks、hidden files, 并排除 `.git` [E: packages/tui/src/autocomplete.ts:158] [E: packages/tui/src/autocomplete.ts:160] [E: packages/tui/src/autocomplete.ts:162] [E: packages/tui/src/autocomplete.ts:164] [E: packages/tui/src/autocomplete.ts:166] [E: packages/tui/src/autocomplete.ts:167] [E: packages/tui/src/autocomplete.ts:168] [E: packages/tui/src/autocomplete.ts:169]。如果 query 含 `/`, `fd` 会使用 `--full-path`, 并通过 `buildFdPathQuery()` 把 display slash 转成可匹配 `/` 或 `\` 的 regex path query [E: packages/tui/src/autocomplete.ts:180] [E: packages/tui/src/autocomplete.ts:181] [E: packages/tui/src/autocomplete.ts:22] [E: packages/tui/src/autocomplete.ts:33] [E: packages/tui/src/autocomplete.ts:42]。

fuzzy attachment 结果会被 `scoreEntry()` 评分: exact filename match 100, filename prefix 80, filename substring 50, full path substring 30, directory 命中再加 10 [E: packages/tui/src/autocomplete.ts:744] [E: packages/tui/src/autocomplete.ts:746] [E: packages/tui/src/autocomplete.ts:748] [E: packages/tui/src/autocomplete.ts:750] [E: packages/tui/src/autocomplete.ts:753]。

同分后的 nested ranking(#8669):`getFuzzyFileSuggestions()` 先按 score 降序,再按 display path 的 `/` 段数升序(浅层先于深层),再按 path 长度升序,最后 `localeCompare` [E: packages/tui/src/autocomplete.ts:805] [E: packages/tui/src/autocomplete.ts:809] [E: packages/tui/src/autocomplete.ts:811] [E: packages/tui/src/autocomplete.ts:814] [E: packages/tui/src/autocomplete.ts:817]。只取前 20 个 entry [E: packages/tui/src/autocomplete.ts:819]。测试:`@scope/pro` 时 `@scope/projects/` 排在更深的 `.../profile/` 前面 [E: packages/tui/test/autocomplete.test.ts:355] [E: packages/tui/test/autocomplete.test.ts:365]。

为避免 recursive `fd` 把 max-results 灌满深层噪声,`getBaseDirSuggestions()` 另跑一遍 `walkDirectoryWithFd(..., maxDepth: 1)`,先收 scoped 目录的直接 children,再与 recursive 结果去重合并 [E: packages/tui/src/autocomplete.ts:767] [E: packages/tui/src/autocomplete.ts:783] [E: packages/tui/src/autocomplete.ts:785] [E: packages/tui/test/autocomplete.test.ts:369]。

## 设计动机与权衡

普通 path completion 是 local directory prefix completion, 因此它使用同步 `readdirSync()` 并只做 startsWith 过滤;`@` attachment completion 默认从 `basePath` 交给外部 `fd` 搜索, 有 abort signal、限制 top entries, 并把结果描述显示为 path [E: packages/tui/src/autocomplete.ts:648] [E: packages/tui/src/autocomplete.ts:652] [E: packages/tui/src/autocomplete.ts:781] [E: packages/tui/src/autocomplete.ts:784] [E: packages/tui/src/autocomplete.ts:794] [E: packages/tui/src/autocomplete.ts:819] [E: packages/tui/src/autocomplete.ts:838]。这种设计把高频局部 path completion 保持简单, 把潜在昂贵的 fuzzy walk 放到可取消的 async 分支 [I]。

forced completion 主要服务 Tab: `extractPathPrefix(..., true)` 会总是返回当前 token, 但 `shouldTriggerFileCompletion()` 明确阻止在行首 slash command name 场景下触发文件补全 [E: packages/tui/src/autocomplete.ts:529] [E: packages/tui/src/autocomplete.ts:530] [E: packages/tui/src/autocomplete.ts:849] [E: packages/tui/src/autocomplete.ts:854] [E: packages/tui/src/autocomplete.ts:855]。这避免 Tab 在 `/set` 这类 command name 输入中误弹 file completion [I]。

## Gotchas

- `getSuggestions()` 在 slash command 分支外才做普通 path completion;因此未 forced 且以 `/` 开头的文本优先被解释为 slash command, 不是 absolute path [E: packages/tui/src/autocomplete.ts:338] [E: packages/tui/src/autocomplete.ts:400]。
- `applyCompletion()` 通过 `prefix.startsWith("/") && beforePrefix.trim() === "" && !prefix.slice(1).includes("/")` 判断 command name completion;带路径 separator 的 prefix 不会走 slash command insertion 规则 [E: packages/tui/src/autocomplete.ts:432]。
- quoted completion 会避免重复消费 cursor 后已有的 closing quote: 当 prefix 是 quoted、item value 以 quote 结束、afterCursor 也以 quote 开头时, `adjustedAfterCursor` 会去掉后方第一个 quote [E: packages/tui/src/autocomplete.ts:424] [E: packages/tui/src/autocomplete.ts:425] [E: packages/tui/src/autocomplete.ts:426] [E: packages/tui/src/autocomplete.ts:427] [E: packages/tui/src/autocomplete.ts:428]。
- directory attachment completion 不追加空格, 以便用户继续深入补全;file attachment completion 会追加空格 [E: packages/tui/src/autocomplete.ts:450] [E: packages/tui/src/autocomplete.ts:451]。
- slash command 的 `skill:` 前缀修复只改 name matching，不改 apply：选中后仍插入 `/skill:name ` [E: packages/tui/src/autocomplete.ts:355] [E: packages/tui/src/autocomplete.ts:435]。
- wrapper 剥层只作用于当前 token；`app/[slug]/pa` 因为 token 内已有 `]` 不会剥 `[` [E: packages/tui/src/autocomplete.ts:67]。

## 跨包边界

[subsys.tui.editor-component](editor-component.md) 是消费 `AutocompleteProvider` 的 editor 组件节点: 本节点只说明 provider contract 与默认 provider 算法, editor 组件负责触发 provider、展示 SelectList、处理 keyboard input、debounce、abort 和 cursor sync [I]。

[subsys.tui.fuzzy-match](fuzzy-match.md) 是 `fuzzyFilter` 的权威节点: 本节点只记录 slash command completion 对 bare name 与 `skill:` 全名各调用一次 `fuzzyFilter`, 不展开 fuzzy scoring 细节 [E: packages/tui/src/autocomplete.ts:5] [E: packages/tui/src/autocomplete.ts:355] [E: packages/tui/src/autocomplete.ts:359]。

## Sources

- packages/tui/src/autocomplete.ts
- packages/tui/test/autocomplete.test.ts
- packages/tui/test/autocomplete-skill-slash.test.ts

## 相关

- [subsys.tui.fuzzy-match](fuzzy-match.md): slash command name completion 使用的 fuzzy filtering helper。
- [subsys.tui.editor-component](editor-component.md): editor 侧触发、渲染、选择和取消 autocomplete 的 UI component。
