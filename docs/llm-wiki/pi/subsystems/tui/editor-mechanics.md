---
id: subsys.tui.editor-mechanics
title: 编辑器文本操作(kill-ring/undo/word-nav)
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/kill-ring.ts
  - packages/tui/src/undo-stack.ts
  - packages/tui/src/word-navigation.ts
symbols:
  - KillRing
  - UndoStack
  - findWordBackward
related:
  - subsys.tui.editor-component
evidence: explicit
status: verified
updated: 8c943640
---

> `editor-mechanics` 是 TUI editor/input 的文本编辑 primitives: `KillRing` 保存 kill/yank 文本, `UndoStack` 保存 state snapshot, `word-navigation` 用 word segmentation 计算 word movement 边界。

## 能回答的问题

- `KillRing.push()` 如何区分新 kill entry 与连续 kill accumulate?
- backward delete 和 forward delete 为什么分别需要 prepend / append?
- `Ctrl+Y` 风格的 yank-pop cycling 在 `KillRing.rotate()` 里如何实现?
- `UndoStack<S>` 为什么 push 时 clone, pop 时直接返回 snapshot?
- `findWordBackward(text, cursor)` 如何跳过 trailing whitespace、word-like segment、punctuation run 和 atomic segment?
- word navigation 的 default `Intl.Segmenter` 与 caller-provided segmenter 边界在哪里?

## 职责边界

本节点只覆盖三个低层 mechanics 文件: `packages/tui/src/kill-ring.ts` 的 `KillRing`, `packages/tui/src/undo-stack.ts` 的 `UndoStack<S>`, 以及 `packages/tui/src/word-navigation.ts` 的 word-boundary pure functions [E: packages/tui/src/kill-ring.ts:8] [E: packages/tui/src/undo-stack.ts:7] [E: packages/tui/src/word-navigation.ts:22] [E: packages/tui/src/word-navigation.ts:78]。这些文件不渲染 terminal、不处理 keybinding, 也不持有 editor cursor state; 它们提供可被 editor component 调用的 data-structure / cursor-boundary primitive [I]。

`KillRing` 的状态只有 private `ring: string[]`; empty text 会被忽略, 非空 text 要么追加为新 entry, 要么与最新 entry merge [E: packages/tui/src/kill-ring.ts:9] [E: packages/tui/src/kill-ring.ts:19] [E: packages/tui/src/kill-ring.ts:20] [E: packages/tui/src/kill-ring.ts:22] [E: packages/tui/src/kill-ring.ts:24] [E: packages/tui/src/kill-ring.ts:26]。

`UndoStack<S>` 是 generic snapshot stack; 它在 `push(state)` 时使用 `structuredClone(state)`, `pop()` 直接返回栈顶 snapshot, `clear()` 通过把 length 设为 0 清空历史 [E: packages/tui/src/undo-stack.ts:7] [E: packages/tui/src/undo-stack.ts:11] [E: packages/tui/src/undo-stack.ts:12] [E: packages/tui/src/undo-stack.ts:16] [E: packages/tui/src/undo-stack.ts:17] [E: packages/tui/src/undo-stack.ts:21] [E: packages/tui/src/undo-stack.ts:22]。

`word-navigation` 暴露 pure cursor math: caller 传入 `text` 与 `cursor`, 函数返回新的 cursor number, 不接收或修改 editor state [E: packages/tui/src/word-navigation.ts:22] [E: packages/tui/src/word-navigation.ts:29] [E: packages/tui/src/word-navigation.ts:69] [E: packages/tui/src/word-navigation.ts:78] [E: packages/tui/src/word-navigation.ts:87] [E: packages/tui/src/word-navigation.ts:116]。

## 关键文件

- `packages/tui/src/kill-ring.ts`: ring buffer for kill/yank; 权威定义 `KillRing.push()`、`peek()`、`rotate()` 和 `length` [E: packages/tui/src/kill-ring.ts:8] [E: packages/tui/src/kill-ring.ts:19] [E: packages/tui/src/kill-ring.ts:31] [E: packages/tui/src/kill-ring.ts:36] [E: packages/tui/src/kill-ring.ts:43]。
- `packages/tui/src/undo-stack.ts`: generic undo snapshot stack; 权威定义 clone-on-push、pop、clear 和 length [E: packages/tui/src/undo-stack.ts:7] [E: packages/tui/src/undo-stack.ts:11] [E: packages/tui/src/undo-stack.ts:16] [E: packages/tui/src/undo-stack.ts:21] [E: packages/tui/src/undo-stack.ts:25]。
- `packages/tui/src/word-navigation.ts`: word movement cursor calculation; 导入 shared word segmenter、whitespace predicate 和 punctuation regex, 并定义 `WordNavigationOptions`、`findWordBackward()`、`findWordForward()` [E: packages/tui/src/word-navigation.ts:1] [E: packages/tui/src/word-navigation.ts:3] [E: packages/tui/src/word-navigation.ts:9] [E: packages/tui/src/word-navigation.ts:22] [E: packages/tui/src/word-navigation.ts:78]。

## 数据模型

`KillRing` 的 newest entry 位于 array 尾部: `peek()` 返回 `this.ring[this.ring.length - 1]`, `push()` 在新 entry path 调用 `this.ring.push(text)`, `rotate()` 则把尾部 entry `pop()` 后 `unshift()` 到头部 [E: packages/tui/src/kill-ring.ts:26] [E: packages/tui/src/kill-ring.ts:31] [E: packages/tui/src/kill-ring.ts:32] [E: packages/tui/src/kill-ring.ts:38] [E: packages/tui/src/kill-ring.ts:39]。因此 `peek()` 总是看当前 newest/yank candidate, 而 `rotate()` 会改变后续 `peek()` 看到的 candidate [E: packages/tui/src/kill-ring.ts:32] [E: packages/tui/src/kill-ring.ts:39] [I]。

`KillRing.push(text, { prepend, accumulate })` 在 `accumulate` 且 ring 非空时先取出 last entry, 再按 direction merge: `prepend=true` 形成 `text + last`, `prepend=false` 形成 `last + text` [E: packages/tui/src/kill-ring.ts:19] [E: packages/tui/src/kill-ring.ts:22] [E: packages/tui/src/kill-ring.ts:23] [E: packages/tui/src/kill-ring.ts:24]。这对应 backward deletion 把新删掉的文本放在已有 kill entry 前面, forward deletion 把新删掉的文本放在已有 kill entry 后面 [I]。

`UndoStack<S>` 的 stack 是 `S[]`, 但 `push()` 不保存 caller 传入对象本身, 而保存 `structuredClone(state)` 的 deep copy [E: packages/tui/src/undo-stack.ts:8] [E: packages/tui/src/undo-stack.ts:11] [E: packages/tui/src/undo-stack.ts:12]。这让后续 editor state mutation 不会 retroactively 改写已经入栈的 undo snapshot [I]。

`WordNavigationOptions` 有两个 extension hooks: `segment?: (text) => Iterable<Intl.SegmentData>` 允许 caller 替换 default `Intl.Segmenter` path, `isAtomicSegment?: (segment) => boolean` 允许 caller 把某些 segment 视作不可拆的 atomic segment [E: packages/tui/src/word-navigation.ts:9] [E: packages/tui/src/word-navigation.ts:11] [E: packages/tui/src/word-navigation.ts:13]。未提供 custom segmenter 时, backward path 使用 module-level `wordSegmenter.segment(textBeforeCursor)`, forward path 使用同一个 `wordSegmenter.segment(textAfterCursor)` [E: packages/tui/src/word-navigation.ts:3] [E: packages/tui/src/word-navigation.ts:28] [E: packages/tui/src/word-navigation.ts:84]。

## 控制流

1. `KillRing.push@packages/tui/src/kill-ring.ts:19` 先把 empty text 作为 no-op 返回; 这防止空删除制造空 kill entry [E: packages/tui/src/kill-ring.ts:19] [E: packages/tui/src/kill-ring.ts:20]。
2. 如果 `opts.accumulate` 且 ring 已有 entry, `push()` pop 最新 entry 并按 `opts.prepend` 决定字符串拼接顺序; 否则直接 push 新 text [E: packages/tui/src/kill-ring.ts:22] [E: packages/tui/src/kill-ring.ts:23] [E: packages/tui/src/kill-ring.ts:24] [E: packages/tui/src/kill-ring.ts:26]。
3. `KillRing.rotate@packages/tui/src/kill-ring.ts:36` 只在 `ring.length > 1` 时工作, 把 newest entry 移到 array front; 长度 0 或 1 时 rotate 是 no-op [E: packages/tui/src/kill-ring.ts:36] [E: packages/tui/src/kill-ring.ts:37] [E: packages/tui/src/kill-ring.ts:38] [E: packages/tui/src/kill-ring.ts:39]。
4. `UndoStack.push@packages/tui/src/undo-stack.ts:11` 保存 `structuredClone(state)`; `pop()` 返回 `this.stack.pop()`, empty stack 时由 JS array pop 语义返回 `undefined` [E: packages/tui/src/undo-stack.ts:11] [E: packages/tui/src/undo-stack.ts:12] [E: packages/tui/src/undo-stack.ts:16] [E: packages/tui/src/undo-stack.ts:17]。
5. `findWordBackward@packages/tui/src/word-navigation.ts:22` 对 `cursor <= 0` 直接返回 0, 然后只分析 `text.slice(0, cursor)` 的前缀 segment [E: packages/tui/src/word-navigation.ts:22] [E: packages/tui/src/word-navigation.ts:23] [E: packages/tui/src/word-navigation.ts:25]。
6. Backward path 先从末尾跳过 non-atomic trailing whitespace: while 条件排除 atomic segment, 再用 `isWhitespaceChar()` 判定 whitespace, 每 pop 一个 segment 就从 `newCursor` 减去该 segment length [E: packages/tui/src/word-navigation.ts:32] [E: packages/tui/src/word-navigation.ts:32] [E: packages/tui/src/word-navigation.ts:34] [E: packages/tui/src/word-navigation.ts:35] [E: packages/tui/src/word-navigation.ts:37]。
7. 如果剩余 last segment 是 atomic, backward path 一次性减去整个 atomic segment length; 如果 last segment 是 word-like, 它再扫描 `PUNCTUATION_REGEX` 来保留 ASCII punctuation boundary [E: packages/tui/src/word-navigation.ts:42] [E: packages/tui/src/word-navigation.ts:44] [E: packages/tui/src/word-navigation.ts:46] [E: packages/tui/src/word-navigation.ts:47] [E: packages/tui/src/word-navigation.ts:50] [E: packages/tui/src/word-navigation.ts:55]。
8. 如果 backward last segment 既不是 word-like 也不是 whitespace, 函数进入 punctuation run loop: 连续弹出 non-atomic、non-word-like、non-whitespace segment, 并持续向左移动 cursor [E: packages/tui/src/word-navigation.ts:57] [E: packages/tui/src/word-navigation.ts:59] [E: packages/tui/src/word-navigation.ts:61] [E: packages/tui/src/word-navigation.ts:62] [E: packages/tui/src/word-navigation.ts:63] [E: packages/tui/src/word-navigation.ts:65]。
9. `findWordForward@packages/tui/src/word-navigation.ts:78` 是 forward companion: 它从 `text.slice(cursor)` 开始, 跳过 leading whitespace, 再处理 atomic segment、word-like segment 或 punctuation run [E: packages/tui/src/word-navigation.ts:78] [E: packages/tui/src/word-navigation.ts:79] [E: packages/tui/src/word-navigation.ts:81] [E: packages/tui/src/word-navigation.ts:90] [E: packages/tui/src/word-navigation.ts:97] [E: packages/tui/src/word-navigation.ts:100] [E: packages/tui/src/word-navigation.ts:105]。

## 设计动机与权衡

Kill ring 的 accumulation 是 direction-aware, 因为连续 backward delete 与连续 forward delete 在用户可见文本顺序上相反: backward delete 新删掉的 text 位于旧 entry 之前, forward delete 新删掉的 text 位于旧 entry 之后 [E: packages/tui/src/kill-ring.ts:19] [E: packages/tui/src/kill-ring.ts:24] [I]。

`KillRing.rotate()` 把 newest entry 移到 front, 而不是维护单独 index cursor; 这让 `peek()` 仍然只需要读取 array 尾部, 但 rotate 本身会 mutate ring order [E: packages/tui/src/kill-ring.ts:32] [E: packages/tui/src/kill-ring.ts:38] [E: packages/tui/src/kill-ring.ts:39] [I]。

`UndoStack` 在 push 边界 clone snapshot, 而 pop 边界不 re-clone; 代码层面唯一 clone 点是 `structuredClone(state)` in `push()`, `pop()` 直接返回 `this.stack.pop()` [E: packages/tui/src/undo-stack.ts:12] [E: packages/tui/src/undo-stack.ts:17]。这是一种把 isolation cost 放在 capture time 的设计: 存入历史的状态先 detached, 恢复时无需再次复制 [I]。

Word navigation 使用 `Intl.SegmentData.isWordLike` 作为 word-like 判断, 又额外用 `PUNCTUATION_REGEX` 在 word-like segment 内保留 ASCII punctuation boundary [E: packages/tui/src/word-navigation.ts:47] [E: packages/tui/src/word-navigation.ts:50] [E: packages/tui/src/word-navigation.ts:55] [E: packages/tui/src/word-navigation.ts:100] [E: packages/tui/src/word-navigation.ts:102]。这说明它不是纯粹的 Unicode word segmentation pass-through; punctuation boundary 是 TUI editing behavior 的额外约束 [I]。

`isAtomicSegment` 同时影响 whitespace skipping、atomic movement 和 punctuation-run scanning; atomic segment 不会被 trailing/leading whitespace loop 当作 whitespace 跳过, 而会在后续分支作为单个 unit 移动 [E: packages/tui/src/word-navigation.ts:34] [E: packages/tui/src/word-navigation.ts:44] [E: packages/tui/src/word-navigation.ts:46] [E: packages/tui/src/word-navigation.ts:61] [E: packages/tui/src/word-navigation.ts:90] [E: packages/tui/src/word-navigation.ts:97] [E: packages/tui/src/word-navigation.ts:99] [E: packages/tui/src/word-navigation.ts:107]。

## Gotcha

- `KillRing` 没有 max size 或 de-duplication; 源码只维护一个 unbounded `string[]` 并暴露 length getter [E: packages/tui/src/kill-ring.ts:9] [E: packages/tui/src/kill-ring.ts:43] [E: packages/tui/src/kill-ring.ts:44] [I]。
- `UndoStack.clear()` 不逐个 pop snapshot, 只是把 underlying array length 设为 0; 对外效果是 length 归零 [E: packages/tui/src/undo-stack.ts:21] [E: packages/tui/src/undo-stack.ts:22] [E: packages/tui/src/undo-stack.ts:25] [E: packages/tui/src/undo-stack.ts:26]。
- `findWordBackward()` 的 cursor arithmetic 使用 JavaScript string `segment.length`, 不是 terminal display width; 它返回的是 string index 风格 cursor, 不是 visual column [E: packages/tui/src/word-navigation.ts:37] [E: packages/tui/src/word-navigation.ts:46] [E: packages/tui/src/word-navigation.ts:52] [E: packages/tui/src/word-navigation.ts:55] [I]。
- `PUNCTUATION_REGEX.exec()` 在 forward path 直接复用 imported regex object; 如果 regex 带 global state, 这里可能受 `lastIndex` 影响, 但从本文件无法确认 `PUNCTUATION_REGEX` 的 flags [E: packages/tui/src/word-navigation.ts:1] [E: packages/tui/src/word-navigation.ts:102] [U]。

## 跨包边界

本节点属于 `pkg: tui`, 不跨 `ai`、`agent`、`coding-agent` 或 `orchestrator` 包。`subsys.tui.editor-component` 是相关节点: 它应解释多行 editor component 如何把 key events、cursor state、rendering 和这些 mechanics 组合成用户可见编辑行为; 本节点只定义 mechanics primitive 本身 [I]。

## Sources

- `packages/tui/src/kill-ring.ts`
- `packages/tui/src/undo-stack.ts`
- `packages/tui/src/word-navigation.ts`

## 相关

- [subsys.tui.editor-component](editor-component.md): 多行编辑器组件如何消费 kill ring、undo snapshot 和 word navigation primitives。
