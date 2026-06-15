---
id: subsys.input-vim
path: subsystems/input-vim.md
title: 文本输入与 Vim
kind: subsystem
tier: T2
source: [hooks/useTextInput.ts, vim/]
symbols: [useTextInput, useVimInput, transition, executeOperatorMotion]
related: [subsys.keybindings]
status: verified
evidence: explicit
updated: 2026-06-14
---

> 文本输入子系统由 `useTextInput` 提供 shell-like editing, 再由 `useVimInput` 和 `vim/` 状态机叠加 Vim normal/insert/operator/text-object 行为。[E: hooks/useTextInput.ts:73][E: hooks/useVimInput.ts:46][E: vim/transitions.ts:59]

## 能回答的问题

- Prompt 输入框怎样处理 Enter、Esc、Ctrl-D、history 和 kill/yank?
- Vim mode 是怎样挂在普通 text input 上的?
- operator、motion、text object、`.` repeat 和 undo 分别在哪里实现?
- 哪些按键会被 pass-through 给上层 keybinding?

## 职责边界

`useTextInput` 负责编辑一段 string: 它接收 text、cursor offset、history handlers、submit callback、input filter、ghost text 和 multiline 策略。[E: hooks/useTextInput.ts:38][E: hooks/useTextInput.ts:73] Vim grammar 由 `useVimInput` 在 `inputFilter` 入口外层处理; insert mode 使用 filtered input 并继续委托 `useTextInput`, normal mode 使用 raw input 解释命令。[E: hooks/useVimInput.ts:46][E: hooks/useVimInput.ts:180][E: hooks/useVimInput.ts:181][E: hooks/useVimInput.ts:227]

`useVimInput` 维护 Vim state ref、persistent state、last change、register 和 `onUndo` callback, 并用 `vim/transitions.ts` 解释 normal/operator/text-object 状态迁移。[E: hooks/useVimInput.ts:30][E: hooks/useVimInput.ts:34][E: hooks/useVimInput.ts:38][E: hooks/useVimInput.ts:104][E: hooks/useVimInput.ts:247][E: vim/transitions.ts:59] React component 层的 `VimTextInput` 把 hook 接到 `BaseTextInput`, 并通过 effect 处理 external `initialMode` 同步。[E: components/VimTextInput.tsx:101][E: components/VimTextInput.tsx:110][E: components/VimTextInput.tsx:111][E: components/VimTextInput.tsx:124][E: components/VimTextInput.tsx:127]

## 关键文件

- `hooks/useTextInput.ts`: 普通文本编辑、history navigation、multiline submit、kill/yank、paste normalization 和 ghost text 输出。[E: hooks/useTextInput.ts:180][E: hooks/useTextInput.ts:247][E: hooks/useTextInput.ts:269][E: hooks/useTextInput.ts:400][E: hooks/useTextInput.ts:403][E: hooks/useTextInput.ts:416][E: hooks/useTextInput.ts:506]
- `hooks/useVimInput.ts`: Vim mode bridge, 负责 insert/normal 切换、operator context、`.` repeat、`onUndo` callback 和 Ctrl/Enter 委托判断。[E: hooks/useVimInput.ts:49][E: hooks/useVimInput.ts:82][E: hooks/useVimInput.ts:109][E: hooks/useVimInput.ts:184][E: hooks/useVimInput.ts:204][E: hooks/useVimInput.ts:247]
- `vim/types.ts`: 定义 operator、motion、command state、recorded change、count 上限和工厂函数。[E: vim/types.ts:33][E: vim/types.ts:59][E: vim/types.ts:92][E: vim/types.ts:182]
- `vim/transitions.ts`: normal/operator/text-object 状态机, 接收按键并返回下一 command state 或待执行 effect。[E: vim/transitions.ts:43][E: vim/transitions.ts:51][E: vim/transitions.ts:52][E: vim/transitions.ts:53][E: vim/transitions.ts:59]
- `vim/operators.ts`, `vim/motions.ts`, `vim/textObjects.ts`: 分别执行 delete/change/yank 等 operator, 解析 motion span, 选择 word/quote/bracket text object。[E: vim/operators.ts:42][E: vim/motions.ts:13][E: vim/textObjects.ts:38]

## 数据模型

普通 input 的核心数据是 `text` 与 `offset`; 每次 `mapKey` 返回新的 text/offset, 再通过 `onChange` 写回调用方。[E: hooks/useTextInput.ts:318][E: hooks/useTextInput.ts:477] Vim 层把 transient mode 写成 `VimState`, normal command 写成 `CommandState` union。[E: vim/types.ts:49][E: vim/types.ts:59] persistent state 只保存 `lastChange`、`lastFind`、register 和 linewise register flag。[E: vim/types.ts:81][E: vim/types.ts:82][E: vim/types.ts:83][E: vim/types.ts:84][E: vim/types.ts:85]

`RecordedChange` 覆盖 insert text、operator motion/text-object/find、replace、single-char delete、toggle case、indent、open line 和 join 等可重复动作, `.` repeat 依赖这个结构重放上一次变更。[E: vim/types.ts:92][E: vim/types.ts:93][E: vim/types.ts:95][E: vim/types.ts:101][E: vim/types.ts:108][E: vim/types.ts:114][E: vim/types.ts:115][E: vim/types.ts:116][E: vim/types.ts:117][E: vim/types.ts:118][E: vim/types.ts:119][E: hooks/useVimInput.ts:109]

## 控制流

1. `BaseTextInput` 把 Ink `useInput` 事件交给 hook 输出的 `onInput`, 并只在组件 focus 时启用。[E: components/BaseTextInput.tsx:88]
2. 普通模式下, `useTextInput` 先处理双击 Ctrl-C、双击 Esc、空输入 Ctrl-D, 再进入 `mapKey`。[E: hooks/useTextInput.ts:108][E: hooks/useTextInput.ts:126][E: hooks/useTextInput.ts:155][E: hooks/useTextInput.ts:318]
3. `handleEnter` 支持 backslash+Enter 续行、Meta/Shift Enter 插入换行、Apple Terminal Shift Enter 特例, 否则调用 submit。[E: hooks/useTextInput.ts:249][E: hooks/useTextInput.ts:251][E: hooks/useTextInput.ts:255][E: hooks/useTextInput.ts:258][E: hooks/useTextInput.ts:263][E: hooks/useTextInput.ts:266]
4. Vim 模式下, `inputFilter` 首先在 insert mode 允许转换后的输入继续流向普通 input; normal mode 通过 `transition()` 自己更新 command state 或执行 operator effect。[E: hooks/useVimInput.ts:180][E: hooks/useVimInput.ts:181][E: hooks/useVimInput.ts:273][E: hooks/useVimInput.ts:275][E: hooks/useVimInput.ts:280][E: hooks/useVimInput.ts:282]
5. `transition()` 根据 command state 调用 normal input、operator input、text-object scope 或 find-char 分支, count 会被 `MAX_VIM_COUNT` 限制。[E: vim/transitions.ts:59][E: vim/transitions.ts:272]

## 设计动机与权衡

Vim 层复用普通 text input 的编辑能力, 所以 Ctrl key 和 Enter 会委托给 base text input 处理。[E: hooks/useVimInput.ts:184][E: hooks/useVimInput.ts:185][E: hooks/useVimInput.ts:204][E: hooks/useVimInput.ts:205] 这让 Vim grammar 局限在 line editor 内, 不必重写 paste、history、multiline 和 shell-like kill/yank。[I]

operator 执行与 motion 解析被拆开: `executeOperatorMotion`、`executeOperatorFind` 和 `executeOperatorTextObj` 分别接受不同 target 类型, 而 motion resolver 只返回 span/linewise/inclusive 等位置信息。[E: vim/operators.ts:42][E: vim/operators.ts:59][E: vim/operators.ts:80][E: vim/motions.ts:13] text object 只覆盖 word、quote、bracket 三族, pair 表在 `vim/textObjects.ts` 中显式列出。[E: vim/textObjects.ts:19][E: vim/textObjects.ts:60][E: vim/textObjects.ts:118][E: vim/textObjects.ts:149]

## Gotcha

- `useTextInput` 在 fullscreen 环境下让 PageUp/PageDown no-op, wheel event 也 no-op, 避免输入框吞掉 transcript scroll 行为。[E: hooks/useTextInput.ts:351][E: hooks/useTextInput.ts:352][E: hooks/useTextInput.ts:356][E: hooks/useTextInput.ts:357][E: hooks/useTextInput.ts:360][E: hooks/useTextInput.ts:365][I]
- SSH/coalesced Enter 有专门路径, 当 filtered input 是单个 trailing `\r` 合并事件时会触发 submit。[E: hooks/useTextInput.ts:491][E: hooks/useTextInput.ts:492][E: hooks/useTextInput.ts:493][E: hooks/useTextInput.ts:496][E: hooks/useTextInput.ts:498]
- Normal mode 下 `?` 被特殊处理为把输入文字设成 `?`, 而不是交给通用 command parser。[E: hooks/useVimInput.ts:289][E: hooks/useVimInput.ts:290][E: hooks/useVimInput.ts:291][E: hooks/useVimInput.ts:293]
- `.` repeat 重放的是 `lastChange`; 只读 motion 不会自动变成 repeatable edit。[E: hooks/useVimInput.ts:109][E: vim/types.ts:92][I]

## Sources

- `hooks/useTextInput.ts`
- `hooks/useVimInput.ts`
- `vim/`
- `vim/types.ts`
- `vim/transitions.ts`
- `vim/operators.ts`
- `vim/motions.ts`
- `vim/textObjects.ts`
- `components/VimTextInput.tsx`
- `components/BaseTextInput.tsx`

## 相关

- [Keybindings](keybindings.md)
