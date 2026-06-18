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
updated: 355a0bcf5
---

> Prompt 是 TUI 的高密度输入 surface：它把 OpenTUI textarea、prompt parts/extmarks、autocomplete、history/stash、shell mode、editor context、session create 和 SDK prompt/command/shell calls 绑在一起。

## 能回答的问题

- `PromptProps` 与 `PromptRef` 向外暴露哪些能力？
- file/agent/pasted text parts 如何用 extmarks 保持位置？
- `/command`、shell mode、普通 prompt 分别调用哪个 SDK endpoint？
- Autocomplete 的 `@` 与 `/` 数据源是什么？
- prompt history/stash 存在哪里，保留多少条？

## Public props/ref

`PromptProps` 支持 `sessionID`、`visible`、`disabled`、`onSubmit`、`ref`、`hint`、`right`、`showPlaceholder`、normal/shell placeholders。[E: packages/tui/src/component/prompt/index.tsx:60] [E: packages/tui/src/component/prompt/index.tsx:61] [E: packages/tui/src/component/prompt/index.tsx:62] [E: packages/tui/src/component/prompt/index.tsx:63] [E: packages/tui/src/component/prompt/index.tsx:64] [E: packages/tui/src/component/prompt/index.tsx:65] [E: packages/tui/src/component/prompt/index.tsx:66] [E: packages/tui/src/component/prompt/index.tsx:67] [E: packages/tui/src/component/prompt/index.tsx:68] [E: packages/tui/src/component/prompt/index.tsx:69] [E: packages/tui/src/component/prompt/index.tsx:70] [E: packages/tui/src/component/prompt/index.tsx:71] `PromptRef` 暴露 `focused`、`current`、`set()`、`reset()`、`blur()`、`focus()`、`submit()`。[E: packages/tui/src/component/prompt/index.tsx:87] [E: packages/tui/src/component/prompt/index.tsx:88] [E: packages/tui/src/component/prompt/index.tsx:89] [E: packages/tui/src/component/prompt/index.tsx:90] [E: packages/tui/src/component/prompt/index.tsx:91] [E: packages/tui/src/component/prompt/index.tsx:92] [E: packages/tui/src/component/prompt/index.tsx:93] ref 实现直接操作 `TextareaRenderable`，例如 `set()` 会 `input.setText()`、更新 store、restore extmarks、goto buffer end。[E: packages/tui/src/component/prompt/index.tsx:576] [E: packages/tui/src/component/prompt/index.tsx:590] [E: packages/tui/src/component/prompt/index.tsx:592]

Prompt local store 包含 `prompt: { input, parts }`、`mode: "normal" | "shell"`、`extmarkToPartIndex`、`interrupt`、`placeholder`。[E: packages/tui/src/component/prompt/index.tsx:279] [E: packages/tui/src/component/prompt/index.tsx:280] [E: packages/tui/src/component/prompt/index.tsx:281] [E: packages/tui/src/component/prompt/index.tsx:282] [E: packages/tui/src/component/prompt/index.tsx:283] [E: packages/tui/src/component/prompt/index.tsx:284] [E: packages/tui/src/component/prompt/index.tsx:286] [E: packages/tui/src/component/prompt/index.tsx:287] [E: packages/tui/src/component/prompt/index.tsx:289] [E: packages/tui/src/component/prompt/index.tsx:291] [E: packages/tui/src/component/prompt/index.tsx:292] [E: packages/tui/src/component/prompt/index.tsx:293]

## Parts 与 extmarks

`PromptInfo.parts` 可以包含 file part、agent part、text part；text part 可带 `source.text.start/end/value` 以追踪被 summary placeholder 替换的 pasted content。[E: packages/tui/src/prompt/history.tsx:9] [E: packages/tui/src/prompt/history.tsx:24] `restoreExtmarksFromParts(parts)` 会按 part type 重建 virtual extmark：file 用 file style，agent 用 agent style，text 用 paste style，并更新 `extmarkToPartIndex`。[E: packages/tui/src/component/prompt/index.tsx:652] [E: packages/tui/src/component/prompt/index.tsx:662] [E: packages/tui/src/component/prompt/index.tsx:667] [E: packages/tui/src/component/prompt/index.tsx:672] [E: packages/tui/src/component/prompt/index.tsx:680] [E: packages/tui/src/component/prompt/index.tsx:687]

`syncExtmarksWithPromptParts()` 从 textarea extmark positions 回写 part source start/end，并丢弃已经没有 extmark 的 parts；这个函数在 content change 时执行，提交控制流里只在 IME plainText 与 store 不一致的分支执行。[E: packages/tui/src/component/prompt/index.tsx:696] [E: packages/tui/src/component/prompt/index.tsx:703] [E: packages/tui/src/component/prompt/index.tsx:711] [E: packages/tui/src/component/prompt/index.tsx:724] [E: packages/tui/src/component/prompt/index.tsx:1371] [E: packages/tui/src/component/prompt/index.tsx:1375] [E: packages/tui/src/component/prompt/index.tsx:947] [E: packages/tui/src/component/prompt/index.tsx:949]

## Focus 与 mode

Prompt 在 `props.visible === false` 或 dialog stack 非空时 blur，否则 reclaim focus；slot/plugin remount 期间保持 dialog focus 的动机来自该 blur/reclaim 实现语境。[E: packages/tui/src/component/prompt/index.tsx:629] [E: packages/tui/src/component/prompt/index.tsx:631] [E: packages/tui/src/component/prompt/index.tsx:632] [E: packages/tui/src/component/prompt/index.tsx:638] [I]

输入 traits 由 `computePromptTraits({ mode, autocompleteVisible })` 合成；`!` 在 cursor visual offset 0 且 normal mode 时进入 shell mode，shell mode 下 `escape` 或 cursor 起点处 `backspace` 退出 shell mode。[E: packages/tui/src/component/prompt/index.tsx:641] [E: packages/tui/src/component/prompt/index.tsx:645] [E: packages/tui/src/component/prompt/index.tsx:810] [E: packages/tui/src/component/prompt/index.tsx:825] [E: packages/tui/src/component/prompt/index.tsx:840] [E: packages/tui/src/component/prompt/index.tsx:852]

## Submit 控制流

1. `submit()` 用 `submitting` guard 防止重入；double Enter/phantom empty prompt 是从 guard 位置和清空流程推断出的 race 动机。[E: packages/tui/src/component/prompt/index.tsx:924] [E: packages/tui/src/component/prompt/index.tsx:932] [E: packages/tui/src/component/prompt/index.tsx:933] [I]
2. `submitInner()` 开头清 workspace notice，IME 场景下从 `input.plainText` 同步最后组成字符到 store，再执行 disabled/workspace/move/autocomplete/empty/agent/model checks。[E: packages/tui/src/component/prompt/index.tsx:942] [E: packages/tui/src/component/prompt/index.tsx:947] [E: packages/tui/src/component/prompt/index.tsx:948] [E: packages/tui/src/component/prompt/index.tsx:949] [E: packages/tui/src/component/prompt/index.tsx:951] [E: packages/tui/src/component/prompt/index.tsx:952] [E: packages/tui/src/component/prompt/index.tsx:953] [E: packages/tui/src/component/prompt/index.tsx:954] [E: packages/tui/src/component/prompt/index.tsx:956] [E: packages/tui/src/component/prompt/index.tsx:963]
3. `exit`、`quit`、`:q` 会调用 global exit，而不是发送给 LLM。[E: packages/tui/src/component/prompt/index.tsx:957] [E: packages/tui/src/component/prompt/index.tsx:959]
4. 如果当前 session workspace 不 connected，会打开 `DialogWorkspaceUnavailable` 并拒绝提交。[E: packages/tui/src/component/prompt/index.tsx:968] [E: packages/tui/src/component/prompt/index.tsx:971] [E: packages/tui/src/component/prompt/index.tsx:972]
5. Home prompt 没有 `sessionID` 时，会先调用 `sdk.client.session.create({ directory, workspace, agent, model })`，成功后使用返回的 id。[E: packages/tui/src/component/prompt/index.tsx:984] [E: packages/tui/src/component/prompt/index.tsx:994] [E: packages/tui/src/component/prompt/index.tsx:995] [E: packages/tui/src/component/prompt/index.tsx:996] [E: packages/tui/src/component/prompt/index.tsx:997] [E: packages/tui/src/component/prompt/index.tsx:998] [E: packages/tui/src/component/prompt/index.tsx:999] [E: packages/tui/src/component/prompt/index.tsx:1000] [E: packages/tui/src/component/prompt/index.tsx:1001] [E: packages/tui/src/component/prompt/index.tsx:1017]
6. submit 前把 tracked pasted text placeholder 展开成真实 text，并过滤掉 text parts，只保留 file/agent 等 non-text parts。[E: packages/tui/src/component/prompt/index.tsx:1020] [E: packages/tui/src/component/prompt/index.tsx:1031]
7. shell mode 调 `sdk.client.session.shell({ sessionID, agent, model, command })`；server slash command 调 `sdk.client.session.command({ command, arguments, agent, model, variant, parts })`；普通 prompt 调 `sdk.client.session.prompt({ parts: editorParts + text + nonTextParts })`。[E: packages/tui/src/component/prompt/index.tsx:1053] [E: packages/tui/src/component/prompt/index.tsx:1055] [E: packages/tui/src/component/prompt/index.tsx:1066] [E: packages/tui/src/component/prompt/index.tsx:1077] [E: packages/tui/src/component/prompt/index.tsx:1088] [E: packages/tui/src/component/prompt/index.tsx:1095]
8. 成功提交后 append history，清 extmarks/store，调用 `props.onSubmit`；新 session 场景下 50ms 后 navigate 到 session route。[E: packages/tui/src/component/prompt/index.tsx:1116] [E: packages/tui/src/component/prompt/index.tsx:1120] [E: packages/tui/src/component/prompt/index.tsx:1126] [E: packages/tui/src/component/prompt/index.tsx:1131] [E: packages/tui/src/component/prompt/index.tsx:1136]

## Paste、history、stash

Clipboard command `prompt.paste` 读取 clipboard；image MIME 直接 `pasteAttachment()`，text/plain 走 `pasteInputText()`。[E: packages/tui/src/component/prompt/index.tsx:366] [E: packages/tui/src/component/prompt/index.tsx:373] [E: packages/tui/src/component/prompt/index.tsx:374] [E: packages/tui/src/component/prompt/index.tsx:382] Bracketed paste 会 normalize CRLF/CR，空 paste 会 dispatch `prompt.paste`；Windows Terminal image-only workaround 是从相邻注释和空 paste fallback 推断出的动机。[E: packages/tui/src/component/prompt/index.tsx:1390] [E: packages/tui/src/component/prompt/index.tsx:1399] [E: packages/tui/src/component/prompt/index.tsx:1404] [E: packages/tui/src/component/prompt/index.tsx:1405] [I]

`pasteInputText()` 会把 local text attachment 变成 `[SVG: filename]` text part，把 binary attachment 交给 `pasteAttachment()`；`pasteAttachment()` 生成 `data:${mime};base64,...` file part URL。长文本或多行文本在 paste summary enabled 时用 `[Pasted ~N lines]` placeholder 保存真实内容。[E: packages/tui/src/component/prompt/index.tsx:1177] [E: packages/tui/src/component/prompt/index.tsx:1183] [E: packages/tui/src/component/prompt/index.tsx:1185] [E: packages/tui/src/component/prompt/index.tsx:1186] [E: packages/tui/src/component/prompt/index.tsx:1189] [E: packages/tui/src/component/prompt/index.tsx:1190] [E: packages/tui/src/component/prompt/index.tsx:1241] [E: packages/tui/src/component/prompt/index.tsx:1245] [E: packages/tui/src/component/prompt/index.tsx:1200] [E: packages/tui/src/component/prompt/index.tsx:1205]

Prompt history 存在 `state/prompt-history.jsonl`，最多 50 条，onMount 会读取并重写有效 retained entries；append 会去重连续重复项，并在超限时重写文件。[E: packages/tui/src/prompt/history.tsx:27] [E: packages/tui/src/prompt/history.tsx:53] [E: packages/tui/src/prompt/history.tsx:55] [E: packages/tui/src/prompt/history.tsx:59] [E: packages/tui/src/prompt/history.tsx:60] [E: packages/tui/src/prompt/history.tsx:85] [E: packages/tui/src/prompt/history.tsx:87] [E: packages/tui/src/prompt/history.tsx:103] [E: packages/tui/src/prompt/history.tsx:104]

Prompt stash 存在 `state/prompt-stash.jsonl`，最多 50 条，push 添加 timestamp，pop/remove 会重写文件。[E: packages/tui/src/prompt/stash.tsx:15] [E: packages/tui/src/prompt/stash.tsx:36] [E: packages/tui/src/prompt/stash.tsx:51] [E: packages/tui/src/prompt/stash.tsx:57] [E: packages/tui/src/prompt/stash.tsx:69] [E: packages/tui/src/prompt/stash.tsx:73] [E: packages/tui/src/prompt/stash.tsx:79] [E: packages/tui/src/prompt/stash.tsx:82] [E: packages/tui/src/prompt/stash.tsx:85]

## Autocomplete

Autocomplete ref 暴露 `onInput(value)` 和 `visible: false | "@" | "/"`。[E: packages/tui/src/component/prompt/autocomplete.tsx:58] [E: packages/tui/src/component/prompt/autocomplete.tsx:59] `@` 数据源包括 SDK `find.files`、MCP resources、non-primary V2 agents、V2 references；`/` 数据源包括 keymap slash commands 与 non-skill server commands。[E: packages/tui/src/component/prompt/autocomplete.tsx:312] [E: packages/tui/src/component/prompt/autocomplete.tsx:320] [E: packages/tui/src/component/prompt/autocomplete.tsx:355] [E: packages/tui/src/component/prompt/autocomplete.tsx:392] [E: packages/tui/src/component/prompt/autocomplete.tsx:413] [E: packages/tui/src/keymap.tsx:260] [E: packages/tui/src/keymap.tsx:264] [E: packages/tui/src/keymap.tsx:276] [E: packages/tui/src/keymap.tsx:283] [E: packages/tui/src/component/prompt/autocomplete.tsx:437] [E: packages/tui/src/component/prompt/autocomplete.tsx:440]

Visible autocomplete pushes `autocomplete` mode；options 让 file options 保持 SDK `fff` 返回顺序，non-file options 走 fuzzysort，且只有带 `path` 的 non-file option 会用 frecency 增强 score。[E: packages/tui/src/component/prompt/autocomplete.tsx:106] [E: packages/tui/src/component/prompt/autocomplete.tsx:480] [E: packages/tui/src/component/prompt/autocomplete.tsx:492] [E: packages/tui/src/component/prompt/autocomplete.tsx:507] [E: packages/tui/src/component/prompt/autocomplete.tsx:513] [I] Autocomplete bindings 来自 `prompt.autocomplete.*` command group。[E: packages/tui/src/component/prompt/autocomplete.tsx:570] [E: packages/tui/src/component/prompt/autocomplete.tsx:623]

## 设计动机与权衡

Prompt 选择把 text input、structured parts 和 SDK turn submission 放在同一组件，是因为 extmark 位置、textarea plainText、autocomplete selection、history entry 和 final SDK parts 必须在一次 submit 中保持一致。[E: packages/tui/src/component/prompt/index.tsx:696] [E: packages/tui/src/component/prompt/index.tsx:1020] [E: packages/tui/src/component/prompt/index.tsx:1095] [I] 它只通过 generated SDK client 操作 session，不 import V1/V2 backend session implementation。[E: packages/tui/src/component/prompt/index.tsx:23] [E: packages/tui/src/component/prompt/index.tsx:1055] [E: packages/tui/src/component/prompt/index.tsx:1077] [E: packages/tui/src/component/prompt/index.tsx:1088]

## Gotcha

- Text pasted as summary is not sent as a `TextPart`; submit 前会把 tracked text 展开进 inputText，并过滤 text parts。[E: packages/tui/src/component/prompt/index.tsx:1020] [E: packages/tui/src/component/prompt/index.tsx:1031]
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
