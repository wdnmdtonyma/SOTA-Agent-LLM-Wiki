---
id: tui.prompt
title: TUI Prompt 输入组件
kind: subsystem
tier: T2
v: na
source: [packages/tui/src/component/prompt/index.tsx]
symbols: [Prompt, PromptRef, Autocomplete, PromptHistoryProvider, PromptStashProvider]
related: [tui.session-screen, tui.home-screen, tui.keybindings]
evidence: explicit
status: verified
updated: 89130db6b0
---

> Prompt 是 TUI 的高密度输入 surface：它把 OpenTUI textarea、prompt parts/extmarks、autocomplete、history/stash、shell mode、editor context、session create 和 SDK prompt/command/shell calls 绑在一起。

## 能回答的问题

- `PromptProps` 与 `PromptRef` 向外暴露哪些能力？
- file/agent/pasted text parts 如何用 extmarks 保持位置？
- `/command`、shell mode、普通 prompt 分别调用哪个 SDK endpoint？
- Autocomplete 的 `@` 与 `/` 数据源是什么？
- prompt history/stash 存在哪里，保留多少条？

## Public props/ref

`PromptProps` 支持 `sessionID`、`visible`、`disabled`、`onSubmit`、`ref`、`hint`、`right`、`showPlaceholder`、normal/shell placeholders。[E: packages/tui/src/component/prompt/index.tsx:63] [E: packages/tui/src/component/prompt/index.tsx:64] [E: packages/tui/src/component/prompt/index.tsx:65] [E: packages/tui/src/component/prompt/index.tsx:66] [E: packages/tui/src/component/prompt/index.tsx:67] [E: packages/tui/src/component/prompt/index.tsx:68] [E: packages/tui/src/component/prompt/index.tsx:69] [E: packages/tui/src/component/prompt/index.tsx:70] [E: packages/tui/src/component/prompt/index.tsx:71] [E: packages/tui/src/component/prompt/index.tsx:72] [E: packages/tui/src/component/prompt/index.tsx:73] [E: packages/tui/src/component/prompt/index.tsx:74] `PromptRef` 暴露 `focused`、`current`、`set()`、`reset()`、`blur()`、`focus()`、`submit()`。[E: packages/tui/src/component/prompt/index.tsx:90] [E: packages/tui/src/component/prompt/index.tsx:91] [E: packages/tui/src/component/prompt/index.tsx:92] [E: packages/tui/src/component/prompt/index.tsx:93] [E: packages/tui/src/component/prompt/index.tsx:94] [E: packages/tui/src/component/prompt/index.tsx:95] [E: packages/tui/src/component/prompt/index.tsx:96] ref 实现直接操作 `TextareaRenderable`，例如 `set()` 会 `input.setText()`、更新 store、restore extmarks、goto buffer end。[E: packages/tui/src/component/prompt/index.tsx:581] [E: packages/tui/src/component/prompt/index.tsx:595] [E: packages/tui/src/component/prompt/index.tsx:597]

Prompt local store 包含 `prompt: { input, parts }`、`mode: "normal" | "shell"`、`extmarkToPartIndex`、`interrupt`、`placeholder`。[E: packages/tui/src/component/prompt/index.tsx:283] [E: packages/tui/src/component/prompt/index.tsx:284] [E: packages/tui/src/component/prompt/index.tsx:285] [E: packages/tui/src/component/prompt/index.tsx:286] [E: packages/tui/src/component/prompt/index.tsx:287] [E: packages/tui/src/component/prompt/index.tsx:288] [E: packages/tui/src/component/prompt/index.tsx:290] [E: packages/tui/src/component/prompt/index.tsx:291] [E: packages/tui/src/component/prompt/index.tsx:293] [E: packages/tui/src/component/prompt/index.tsx:295] [E: packages/tui/src/component/prompt/index.tsx:296] [E: packages/tui/src/component/prompt/index.tsx:297]

## Parts 与 extmarks

`PromptInfo.parts` 可以包含 file part、agent part、text part；text part 可带 `source.text.start/end/value` 以追踪被 summary placeholder 替换的 pasted content。[E: packages/tui/src/prompt/history.tsx:9] [E: packages/tui/src/prompt/history.tsx:24] `restoreExtmarksFromParts(parts)` 会按 part type 重建 virtual extmark：file 用 file style，agent 用 agent style，text 用 paste style，并更新 `extmarkToPartIndex`。[E: packages/tui/src/component/prompt/index.tsx:657] [E: packages/tui/src/component/prompt/index.tsx:667] [E: packages/tui/src/component/prompt/index.tsx:671] [E: packages/tui/src/component/prompt/index.tsx:672] [E: packages/tui/src/component/prompt/index.tsx:676] [E: packages/tui/src/component/prompt/index.tsx:677] [E: packages/tui/src/component/prompt/index.tsx:681] [E: packages/tui/src/component/prompt/index.tsx:692]

`syncExtmarksWithPromptParts()` 从 textarea extmark positions 回写 part source start/end，并丢弃已经没有 extmark 的 parts；这个函数在 content change 时执行，提交控制流里只在 IME plainText 与 store 不一致的分支执行。[E: packages/tui/src/component/prompt/index.tsx:701] [E: packages/tui/src/component/prompt/index.tsx:708] [E: packages/tui/src/component/prompt/index.tsx:714] [E: packages/tui/src/component/prompt/index.tsx:717] [E: packages/tui/src/component/prompt/index.tsx:720] [E: packages/tui/src/component/prompt/index.tsx:730] [E: packages/tui/src/component/prompt/index.tsx:1380] [E: packages/tui/src/component/prompt/index.tsx:954]

## Focus 与 mode

Prompt 在 `props.visible === false` 或 dialog stack 非空时 blur，否则 reclaim focus；slot/plugin remount 期间保持 dialog focus 的动机来自该 blur/reclaim 实现语境。[E: packages/tui/src/component/prompt/index.tsx:634] [E: packages/tui/src/component/prompt/index.tsx:636] [E: packages/tui/src/component/prompt/index.tsx:637] [E: packages/tui/src/component/prompt/index.tsx:643] [I]

输入 traits 由 `computePromptTraits({ mode, autocompleteVisible })` 合成；`!` 在 cursor visual offset 0 且 normal mode 时进入 shell mode，shell mode 下 `escape` 或 cursor 起点处 `backspace` 退出 shell mode。[E: packages/tui/src/component/prompt/index.tsx:646] [E: packages/tui/src/component/prompt/index.tsx:650] [E: packages/tui/src/component/prompt/index.tsx:815] [E: packages/tui/src/component/prompt/index.tsx:830] [E: packages/tui/src/component/prompt/index.tsx:845] [E: packages/tui/src/component/prompt/index.tsx:857]

## Submit 控制流

1. `submit()` 用 `submitting` guard 防止重入；double Enter/phantom empty prompt 是从 guard 位置和清空流程推断出的 race 动机。[E: packages/tui/src/component/prompt/index.tsx:929] [E: packages/tui/src/component/prompt/index.tsx:938] [E: packages/tui/src/component/prompt/index.tsx:938] [I]
2. `submitInner()` 开头清 workspace notice，IME 场景下从 `input.plainText` 同步最后组成字符到 store，再执行 disabled/workspace/move/autocomplete/empty/agent/model checks。[E: packages/tui/src/component/prompt/index.tsx:947] [E: packages/tui/src/component/prompt/index.tsx:952] [E: packages/tui/src/component/prompt/index.tsx:953] [E: packages/tui/src/component/prompt/index.tsx:954] [E: packages/tui/src/component/prompt/index.tsx:956] [E: packages/tui/src/component/prompt/index.tsx:957] [E: packages/tui/src/component/prompt/index.tsx:958] [E: packages/tui/src/component/prompt/index.tsx:959] [E: packages/tui/src/component/prompt/index.tsx:961] [E: packages/tui/src/component/prompt/index.tsx:967]
3. `exit`、`quit`、`:q` 会调用 global exit，而不是发送给 LLM。[E: packages/tui/src/component/prompt/index.tsx:962] [E: packages/tui/src/component/prompt/index.tsx:964]
4. 如果当前 session workspace 不 connected，会打开 `DialogWorkspaceUnavailable` 并拒绝提交。[E: packages/tui/src/component/prompt/index.tsx:973] [E: packages/tui/src/component/prompt/index.tsx:976] [E: packages/tui/src/component/prompt/index.tsx:976]
5. Home prompt 没有 `sessionID` 时，会先调用 `sdk.client.session.create({ directory, workspace, agent, model })`，成功后使用返回的 id。[E: packages/tui/src/component/prompt/index.tsx:989] [E: packages/tui/src/component/prompt/index.tsx:999] [E: packages/tui/src/component/prompt/index.tsx:1000] [E: packages/tui/src/component/prompt/index.tsx:1001] [E: packages/tui/src/component/prompt/index.tsx:1002] [E: packages/tui/src/component/prompt/index.tsx:1003] [E: packages/tui/src/component/prompt/index.tsx:1004] [E: packages/tui/src/component/prompt/index.tsx:1005] [E: packages/tui/src/component/prompt/index.tsx:1006] [E: packages/tui/src/component/prompt/index.tsx:1022]
6. submit 前把 tracked pasted text placeholder 展开成真实 text，并过滤掉 text parts，只保留 file/agent 等 non-text parts。[E: packages/tui/src/component/prompt/index.tsx:1025] [E: packages/tui/src/component/prompt/index.tsx:1036]
7. shell mode 调 `sdk.client.session.shell({ sessionID, agent, model, command })`；server slash command 调 `sdk.client.session.command({ command, arguments, agent, model, variant, parts })`；普通 prompt 调 `sdk.client.session.prompt({ parts: editorParts + text + nonTextParts })`。[E: packages/tui/src/component/prompt/index.tsx:1058] [E: packages/tui/src/component/prompt/index.tsx:1060] [E: packages/tui/src/component/prompt/index.tsx:1071] [E: packages/tui/src/component/prompt/index.tsx:1082] [E: packages/tui/src/component/prompt/index.tsx:1093] [E: packages/tui/src/component/prompt/index.tsx:1099]
8. 成功提交后 append history，清 extmarks/store，调用 `props.onSubmit`；新 session 场景下 50ms 后 navigate 到 session route。[E: packages/tui/src/component/prompt/index.tsx:1121] [E: packages/tui/src/component/prompt/index.tsx:1125] [E: packages/tui/src/component/prompt/index.tsx:1131] [E: packages/tui/src/component/prompt/index.tsx:1136] [E: packages/tui/src/component/prompt/index.tsx:1137]

## Paste、history、stash

Clipboard command `prompt.paste` 读取 clipboard；image MIME 直接 `pasteAttachment()`，text/plain 走 `pasteInputText()`。[E: packages/tui/src/component/prompt/index.tsx:370] [E: packages/tui/src/component/prompt/index.tsx:377] [E: packages/tui/src/component/prompt/index.tsx:378] [E: packages/tui/src/component/prompt/index.tsx:386] Bracketed paste 会 normalize CRLF/CR，空 paste 会 dispatch `prompt.paste`；Windows Terminal image-only workaround 是从相邻注释和空 paste fallback 推断出的动机。[E: packages/tui/src/component/prompt/index.tsx:1395] [E: packages/tui/src/component/prompt/index.tsx:1404] [E: packages/tui/src/component/prompt/index.tsx:1410] [E: packages/tui/src/component/prompt/index.tsx:1410] [I]

`pasteInputText()` 会把 local text attachment 变成 `[SVG: filename]` text part，把 binary attachment 交给 `pasteAttachment()`；`pasteAttachment()` 生成 `data:${mime};base64,...` file part URL。长文本或多行文本在 paste summary enabled 时用 `[Pasted ~N lines]` placeholder 保存真实内容。[E: packages/tui/src/component/prompt/index.tsx:1182] [E: packages/tui/src/component/prompt/index.tsx:1188] [E: packages/tui/src/component/prompt/index.tsx:1191] [E: packages/tui/src/component/prompt/index.tsx:1194] [E: packages/tui/src/component/prompt/index.tsx:1195] [E: packages/tui/src/component/prompt/index.tsx:1246] [E: packages/tui/src/component/prompt/index.tsx:1250] [E: packages/tui/src/component/prompt/index.tsx:1205] [E: packages/tui/src/component/prompt/index.tsx:1210]

Prompt history 存在 `state/prompt-history.jsonl`，最多 50 条，onMount 会读取并重写有效 retained entries；append 会去重连续重复项，并在超限时重写文件。[E: packages/tui/src/prompt/history.tsx:27] [E: packages/tui/src/prompt/history.tsx:53] [E: packages/tui/src/prompt/history.tsx:55] [E: packages/tui/src/prompt/history.tsx:59] [E: packages/tui/src/prompt/history.tsx:60] [E: packages/tui/src/prompt/history.tsx:85] [E: packages/tui/src/prompt/history.tsx:87] [E: packages/tui/src/prompt/history.tsx:103] [E: packages/tui/src/prompt/history.tsx:104]

Prompt stash 存在 `state/prompt-stash.jsonl`，最多 50 条，push 添加 timestamp，pop/remove 会重写文件。[E: packages/tui/src/prompt/stash.tsx:15] [E: packages/tui/src/prompt/stash.tsx:36] [E: packages/tui/src/prompt/stash.tsx:51] [E: packages/tui/src/prompt/stash.tsx:57] [E: packages/tui/src/prompt/stash.tsx:69] [E: packages/tui/src/prompt/stash.tsx:73] [E: packages/tui/src/prompt/stash.tsx:79] [E: packages/tui/src/prompt/stash.tsx:82] [E: packages/tui/src/prompt/stash.tsx:85]

## Autocomplete

Autocomplete ref 暴露 `onInput(value)` 和 `visible: false | "@" | "/"`。[E: packages/tui/src/component/prompt/autocomplete.tsx:60] [E: packages/tui/src/component/prompt/autocomplete.tsx:61] `@` 数据源包括 SDK `find.files`、MCP resources、non-primary V2 agents、V2 references；`/` 数据源包括 keymap slash commands 与 non-skill server commands。[E: packages/tui/src/component/prompt/autocomplete.tsx:316] [E: packages/tui/src/component/prompt/autocomplete.tsx:324] [E: packages/tui/src/component/prompt/autocomplete.tsx:366] [E: packages/tui/src/component/prompt/autocomplete.tsx:402] [E: packages/tui/src/component/prompt/autocomplete.tsx:423] [E: packages/tui/src/keymap.tsx:260] [E: packages/tui/src/keymap.tsx:264] [E: packages/tui/src/keymap.tsx:276] [E: packages/tui/src/keymap.tsx:283] [E: packages/tui/src/component/prompt/autocomplete.tsx:447] [E: packages/tui/src/component/prompt/autocomplete.tsx:450]

Visible autocomplete pushes `autocomplete` mode；options 让 file options 保持 SDK `fff` 返回顺序，non-file options 走 fuzzysort，且只有带 `path` 的 non-file option 会用 frecency 增强 score。[E: packages/tui/src/component/prompt/autocomplete.tsx:109] [E: packages/tui/src/component/prompt/autocomplete.tsx:490] [E: packages/tui/src/component/prompt/autocomplete.tsx:502] [E: packages/tui/src/component/prompt/autocomplete.tsx:518] [E: packages/tui/src/component/prompt/autocomplete.tsx:524] [I] Autocomplete bindings 来自 `prompt.autocomplete.*` command group。[E: packages/tui/src/component/prompt/autocomplete.tsx:581] [E: packages/tui/src/component/prompt/autocomplete.tsx:634]

## 设计动机与权衡

Prompt 选择把 text input、structured parts 和 SDK turn submission 放在同一组件，是因为 extmark 位置、textarea plainText、autocomplete selection、history entry 和 final SDK parts 必须在一次 submit 中保持一致。[E: packages/tui/src/component/prompt/index.tsx:701] [E: packages/tui/src/component/prompt/index.tsx:1025] [E: packages/tui/src/component/prompt/index.tsx:1099] [I] 它只通过 generated SDK client 操作 session，不 import V1/V2 backend session implementation。[E: packages/tui/src/component/prompt/index.tsx:23] [E: packages/tui/src/component/prompt/index.tsx:1060] [E: packages/tui/src/component/prompt/index.tsx:1082] [E: packages/tui/src/component/prompt/index.tsx:1093]

## Gotcha

- Text pasted as summary is not sent as a `TextPart`; submit 前会把 tracked text 展开进 inputText，并过滤 text parts。[E: packages/tui/src/component/prompt/index.tsx:1025] [E: packages/tui/src/component/prompt/index.tsx:1036]
- Prompt component imports `Flag` from `@opencode-ai/core`，所以 `packages/tui` 当前仍未完全达到 spec 中“no core imports”的理想边界。[E: packages/tui/src/component/prompt/index.tsx:17] [E: specs/tui-package.md:474] [E: specs/tui-package.md:475] [I]

## Sources

- `packages/tui/src/component/prompt/index.tsx`
- `packages/tui/src/component/prompt/autocomplete.tsx`
- `packages/tui/src/prompt/history.tsx`
- `packages/tui/src/prompt/stash.tsx`
- `packages/tui/src/keymap.tsx`
- `specs/tui-package.md`

## 相关

- `tui.session-screen`：session route 如何把 Prompt 放进 `session_prompt` slot。
- `tui.home-screen`：home route 如何 seed/auto-submit prompt。
- `tui.keybindings`：prompt/input/autocomplete keybind group。
