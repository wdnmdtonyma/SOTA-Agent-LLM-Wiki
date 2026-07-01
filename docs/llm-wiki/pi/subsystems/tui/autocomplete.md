---
id: subsys.tui.autocomplete
title: 自动完成
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/autocomplete.ts]
symbols: [AutocompleteProvider, CombinedAutocompleteProvider]
related: [subsys.tui.fuzzy-match, subsys.tui.editor-component]
evidence: explicit
status: verified
updated: 8c943640
---

> 自动完成 subsystem 是 `pi-tui` 的 provider contract 与默认 `CombinedAutocompleteProvider`: 它把 slash commands、slash command arguments、普通 file path completion、`@file` fuzzy attachment completion 统一成 editor 可消费的 suggestions 和 applyCompletion 结果。

## 能回答的问题

- `AutocompleteProvider` 需要向 editor 暴露哪些方法和数据?
- `CombinedAutocompleteProvider` 如何区分 slash command、command argument、`@` attachment 和普通 path completion?
- 为什么 `@` 补全依赖 `fd`, 而普通 path completion 直接读目录?
- completion 被应用时如何改写当前行和 cursor position?
- 引号、空格、`~/`、absolute path、directory slash 在补全里如何处理?

## 职责边界

`AutocompleteProvider` 是 TUI editor 与补全实现之间的 interface: provider 可以声明 `triggerCharacters`, 必须实现 async `getSuggestions(...)`, 必须实现 `applyCompletion(...)`, 并可选实现 `shouldTriggerFileCompletion(...)` 供 explicit Tab completion 判断是否触发文件补全 [E: packages/tui/src/autocomplete.ts:241] [E: packages/tui/src/autocomplete.ts:247] [E: packages/tui/src/autocomplete.ts:256] [E: packages/tui/src/autocomplete.ts:269]。

`CombinedAutocompleteProvider` 是默认组合实现, constructor 接收 command list、`basePath` 和可选 `fdPath`, 并把它们保存为实例状态 [E: packages/tui/src/autocomplete.ts:273] [E: packages/tui/src/autocomplete.ts:278] [E: packages/tui/src/autocomplete.ts:279] [E: packages/tui/src/autocomplete.ts:281]。它不负责渲染 dropdown、处理按键或 debounce;这些属于 [subsys.tui.editor-component](editor-component.md) 的 editor 组件职责 [I]。

## 关键文件

`packages/tui/src/autocomplete.ts` 同时定义 `AutocompleteItem`、`SlashCommand`、`AutocompleteSuggestions`、`AutocompleteProvider` 和 `CombinedAutocompleteProvider`, 因此本节点覆盖的是补全数据模型与 provider 算法, 不是 UI list rendering [E: packages/tui/src/autocomplete.ts:219] [E: packages/tui/src/autocomplete.ts:227] [E: packages/tui/src/autocomplete.ts:236] [E: packages/tui/src/autocomplete.ts:241] [E: packages/tui/src/autocomplete.ts:273]。

## 数据模型

`AutocompleteItem` 包含 `value`、`label` 和可选 `description` 字段 [E: packages/tui/src/autocomplete.ts:219] [E: packages/tui/src/autocomplete.ts:220] [E: packages/tui/src/autocomplete.ts:221] [E: packages/tui/src/autocomplete.ts:222]。`AutocompleteSuggestions` 把 `items` 与 `prefix` 绑在一起;`prefix` 的源码注释标为当前匹配文本片段, `applyCompletion()` 会用它回算 `beforePrefix` [E: packages/tui/src/autocomplete.ts:236] [E: packages/tui/src/autocomplete.ts:237] [E: packages/tui/src/autocomplete.ts:238] [E: packages/tui/src/autocomplete.ts:383]。

`SlashCommand` 支持 `name`、可选 `description`、可选 `argumentHint`, 并允许每个命令提供 async 或 sync `getArgumentCompletions(argumentPrefix)`;返回 `null` 表示没有 argument completion [E: packages/tui/src/autocomplete.ts:225] [E: packages/tui/src/autocomplete.ts:227] [E: packages/tui/src/autocomplete.ts:229] [E: packages/tui/src/autocomplete.ts:230] [E: packages/tui/src/autocomplete.ts:233]。`CombinedAutocompleteProvider` 的 command list 类型允许混合 `SlashCommand` 与普通 `AutocompleteItem`, 所以调用方可以只给简单 command item, 也可以给带 argument completer 的 command object [E: packages/tui/src/autocomplete.ts:274] [E: packages/tui/src/autocomplete.ts:278]。

path completion 的输入 token 由 delimiter 切分;delimiter set 包含空格、tab、双引号、单引号和 `=` [E: packages/tui/src/autocomplete.ts:7]。双引号 token 有专门处理: `findUnclosedQuoteStart()` 追踪未闭合双引号, `extractQuotedPrefix()` 会返回普通 quoted token 或带前导 `@` 的 quoted attachment token [E: packages/tui/src/autocomplete.ts:54] [E: packages/tui/src/autocomplete.ts:67] [E: packages/tui/src/autocomplete.ts:74] [E: packages/tui/src/autocomplete.ts:80] [E: packages/tui/src/autocomplete.ts:84] [E: packages/tui/src/autocomplete.ts:91]。

## 控制流

1. `CombinedAutocompleteProvider.getSuggestions()` 先读取当前行和 cursor 前文本, 然后优先尝试 `extractAtPrefix(textBeforeCursor)` [E: packages/tui/src/autocomplete.ts:290] [E: packages/tui/src/autocomplete.ts:291] [E: packages/tui/src/autocomplete.ts:293]。如果存在 `@` prefix, provider 会通过 `parsePathPrefix()` 去掉 `@` 或 `@"` 外壳, 调用 `getFuzzyFileSuggestions(rawPrefix, { signal })`, 并把原始 `@` prefix 作为替换范围返回 [E: packages/tui/src/autocomplete.ts:95] [E: packages/tui/src/autocomplete.ts:96] [E: packages/tui/src/autocomplete.ts:101] [E: packages/tui/src/autocomplete.ts:102] [E: packages/tui/src/autocomplete.ts:295] [E: packages/tui/src/autocomplete.ts:296] [E: packages/tui/src/autocomplete.ts:302] [E: packages/tui/src/autocomplete.ts:304]。

2. 如果不是 forced completion 且 cursor 前文本以 `/` 开头, provider 进入 slash command 分支 [E: packages/tui/src/autocomplete.ts:308]。没有空格时, 它把 command list 标准化成 `{ name, label, description }`, 把 `argumentHint` 拼进 description, 再用 `fuzzyFilter` 按 command name 过滤 [E: packages/tui/src/autocomplete.ts:311] [E: packages/tui/src/autocomplete.ts:313] [E: packages/tui/src/autocomplete.ts:317] [E: packages/tui/src/autocomplete.ts:325]。这个 fuzzy 匹配算法的权威节点是 [subsys.tui.fuzzy-match](fuzzy-match.md) [I]。

3. slash command 后已经有空格时, provider 把 `/name ` 后面的文本视为 `argumentText`, 精确查找同名 command, 只在该 command 实现 `getArgumentCompletions` 时返回 argument suggestions [E: packages/tui/src/autocomplete.ts:339] [E: packages/tui/src/autocomplete.ts:340] [E: packages/tui/src/autocomplete.ts:342] [E: packages/tui/src/autocomplete.ts:344] [E: packages/tui/src/autocomplete.ts:346] [E: packages/tui/src/autocomplete.ts:350] [E: packages/tui/src/autocomplete.ts:355]。

4. 其余情况进入普通 path completion: `extractPathPrefix(textBeforeCursor, force)` 决定是否有 path-like prefix, `getFileSuggestions(pathMatch)` 同步读取目录并返回候选 [E: packages/tui/src/autocomplete.ts:361] [E: packages/tui/src/autocomplete.ts:366] [E: packages/tui/src/autocomplete.ts:369]。非 forced 情况下, path prefix 必须看起来像路径, 即包含 `/`、以 `.` 开头、以 `~/` 开头, 或者是在空格之后的空 token [E: packages/tui/src/autocomplete.ts:496] [E: packages/tui/src/autocomplete.ts:496] [E: packages/tui/src/autocomplete.ts:502]。

5. `applyCompletion()` 用 provider 返回的 `prefix` 计算 `beforePrefix` 与 `afterCursor`, 然后按 slash command、`@` attachment、slash command argument、普通 file path 四类改写当前行 [E: packages/tui/src/autocomplete.ts:382] [E: packages/tui/src/autocomplete.ts:383] [E: packages/tui/src/autocomplete.ts:393] [E: packages/tui/src/autocomplete.ts:408] [E: packages/tui/src/autocomplete.ts:429] [E: packages/tui/src/autocomplete.ts:447]。slash command name completion 会自动插入前导 `/` 和尾随空格, 并把 cursor 放到 command name 后的空格之后 [E: packages/tui/src/autocomplete.ts:396] [E: packages/tui/src/autocomplete.ts:403]。

## 文件补全算法

普通 path completion 使用 `readdirSync(searchDir, { withFileTypes: true })` 枚举当前目录, 仅保留 name 以 search prefix 开头的 entry, 对 symlink 会额外 `statSync()` 判断是否指向目录 [E: packages/tui/src/autocomplete.ts:609] [E: packages/tui/src/autocomplete.ts:612] [E: packages/tui/src/autocomplete.ts:613] [E: packages/tui/src/autocomplete.ts:619] [E: packages/tui/src/autocomplete.ts:622]。候选 value 会保留 `~/`、absolute path、`./` 等 display shape, directory 追加 `/`, 然后通过 `buildCompletionValue()` 决定是否加 `@` 和 quote [E: packages/tui/src/autocomplete.ts:637] [E: packages/tui/src/autocomplete.ts:641] [E: packages/tui/src/autocomplete.ts:652] [E: packages/tui/src/autocomplete.ts:666] [E: packages/tui/src/autocomplete.ts:667]。

`buildCompletionValue()` 的 quote 规则很窄: 原 prefix 已经是 quoted prefix, 或 path 自身包含空格时才加双引号;`@` prefix 会被保留在 quote 外侧 [E: packages/tui/src/autocomplete.ts:111] [E: packages/tui/src/autocomplete.ts:112] [E: packages/tui/src/autocomplete.ts:114] [E: packages/tui/src/autocomplete.ts:118] [E: packages/tui/src/autocomplete.ts:120]。普通 path completion 的排序是 directories first, 然后按 label alphabetic order [E: packages/tui/src/autocomplete.ts:680] [E: packages/tui/src/autocomplete.ts:683] [E: packages/tui/src/autocomplete.ts:685]。

`@` fuzzy attachment completion 只在 `fdPath` 存在且 abort signal 未取消时运行;没有 `fdPath` 或 signal 已 abort 会直接返回空列表 [E: packages/tui/src/autocomplete.ts:724] [E: packages/tui/src/autocomplete.ts:725]。`walkDirectoryWithFd()` 调用 `fd` 时设置 base directory、max results、file/directory type、follow symlinks、hidden files, 并排除 `.git` [E: packages/tui/src/autocomplete.ts:132] [E: packages/tui/src/autocomplete.ts:134] [E: packages/tui/src/autocomplete.ts:136] [E: packages/tui/src/autocomplete.ts:138] [E: packages/tui/src/autocomplete.ts:140] [E: packages/tui/src/autocomplete.ts:141] [E: packages/tui/src/autocomplete.ts:142] [E: packages/tui/src/autocomplete.ts:143]。如果 query 含 `/`, `fd` 会使用 `--full-path`, 并通过 `buildFdPathQuery()` 把 display slash 转成可匹配 `/` 或 `\` 的 regex path query [E: packages/tui/src/autocomplete.ts:150] [E: packages/tui/src/autocomplete.ts:151] [E: packages/tui/src/autocomplete.ts:18] [E: packages/tui/src/autocomplete.ts:29] [E: packages/tui/src/autocomplete.ts:38]。

fuzzy attachment 结果会被 `scoreEntry()` 评分: exact filename match 100, filename prefix 80, filename substring 50, full path substring 30, directory 命中再加 10 [E: packages/tui/src/autocomplete.ts:705] [E: packages/tui/src/autocomplete.ts:707] [E: packages/tui/src/autocomplete.ts:709] [E: packages/tui/src/autocomplete.ts:711] [E: packages/tui/src/autocomplete.ts:714]。之后按 score 降序排序, 只取前 20 个 entry 作为 suggestions [E: packages/tui/src/autocomplete.ts:744] [E: packages/tui/src/autocomplete.ts:745]。

## 设计动机与权衡

普通 path completion 是 local directory prefix completion, 因此它使用同步 `readdirSync()` 并只做 startsWith 过滤;`@` attachment completion 默认从 `basePath` 交给外部 `fd` 搜索, 有 abort signal、限制 top entries, 并把结果描述显示为 path [E: packages/tui/src/autocomplete.ts:609] [E: packages/tui/src/autocomplete.ts:613] [E: packages/tui/src/autocomplete.ts:730] [E: packages/tui/src/autocomplete.ts:732] [E: packages/tui/src/autocomplete.ts:733] [E: packages/tui/src/autocomplete.ts:745] [E: packages/tui/src/autocomplete.ts:764]。这种设计把高频局部 path completion 保持简单, 把潜在昂贵的 fuzzy walk 放到可取消的 async 分支 [I]。

forced completion 主要服务 Tab: `extractPathPrefix(..., true)` 会总是返回当前 token, 但 `shouldTriggerFileCompletion()` 明确阻止在行首 slash command name 场景下触发文件补全 [E: packages/tui/src/autocomplete.ts:490] [E: packages/tui/src/autocomplete.ts:491] [E: packages/tui/src/autocomplete.ts:775] [E: packages/tui/src/autocomplete.ts:780] [E: packages/tui/src/autocomplete.ts:781]。这避免 Tab 在 `/set` 这类 command name 输入中误弹 file completion [I]。

## Gotchas

- `getSuggestions()` 在 slash command 分支外才做普通 path completion;因此未 forced 且以 `/` 开头的文本优先被解释为 slash command, 不是 absolute path [E: packages/tui/src/autocomplete.ts:308] [E: packages/tui/src/autocomplete.ts:361]。
- `applyCompletion()` 通过 `prefix.startsWith("/") && beforePrefix.trim() === "" && !prefix.slice(1).includes("/")` 判断 command name completion;带路径 separator 的 prefix 不会走 slash command insertion 规则 [E: packages/tui/src/autocomplete.ts:393]。
- quoted completion 会避免重复消费 cursor 后已有的 closing quote: 当 prefix 是 quoted、item value 以 quote 结束、afterCursor 也以 quote 开头时, `adjustedAfterCursor` 会去掉后方第一个 quote [E: packages/tui/src/autocomplete.ts:385] [E: packages/tui/src/autocomplete.ts:386] [E: packages/tui/src/autocomplete.ts:387] [E: packages/tui/src/autocomplete.ts:388] [E: packages/tui/src/autocomplete.ts:389]。
- directory attachment completion 不追加空格, 以便用户继续深入补全;file attachment completion 会追加空格 [E: packages/tui/src/autocomplete.ts:411] [E: packages/tui/src/autocomplete.ts:412]。

## 跨包边界

[subsys.tui.editor-component](editor-component.md) 是消费 `AutocompleteProvider` 的 editor 组件节点: 本节点只说明 provider contract 与默认 provider 算法, editor 组件负责触发 provider、展示 SelectList、处理 keyboard input、debounce、abort 和 cursor sync [I]。

[subsys.tui.fuzzy-match](fuzzy-match.md) 是 `fuzzyFilter` 的权威节点: 本节点只记录 slash command completion 调用了 `fuzzyFilter(commandItems, prefix, item => item.name)`, 不展开 fuzzy scoring 细节 [E: packages/tui/src/autocomplete.ts:5] [E: packages/tui/src/autocomplete.ts:325]。

## Sources

- packages/tui/src/autocomplete.ts

## 相关

- [subsys.tui.fuzzy-match](fuzzy-match.md): slash command name completion 使用的 fuzzy filtering helper。
- [subsys.tui.editor-component](editor-component.md): editor 侧触发、渲染、选择和取消 autocomplete 的 UI component。
