---
id: ui.structured-diff
path: subsystems/ui/structured-diff.md
title: StructuredDiff 组件族
kind: subsystem
tier: T2
source: [components/StructuredDiff.tsx, components/StructuredDiffList.tsx, components/StructuredDiff/Fallback.tsx, components/StructuredDiff/colorDiff.ts]
symbols: [StructuredDiff, StructuredDiffList, StructuredDiffFallback, expectColorDiff]
related: [subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> StructuredDiff 组件族负责把 parsed diff hunk 渲染成带 gutter、syntax highlight、word diff fallback 的终端行级 diff；它优先调用 color-diff runtime，失败或被禁用时回退到 TypeScript fallback renderer。[E: components/StructuredDiff.tsx:50][E: components/StructuredDiff.tsx:114][E: components/StructuredDiff.tsx:129][E: components/StructuredDiff/Fallback.tsx:81]

## 能回答的问题

- StructuredDiff 何时使用 color-diff，何时 fallback？[E: components/StructuredDiff.tsx:51][E: components/StructuredDiff.tsx:52][E: components/StructuredDiff.tsx:114][E: components/StructuredDiff.tsx:129]
- gutter、内容列和 cache 是怎样组织的？[E: components/StructuredDiff.tsx:46][E: components/StructuredDiff.tsx:71][E: components/StructuredDiff.tsx:77][E: components/StructuredDiff.tsx:91]
- fallback renderer 如何做行级 add/remove/nochange 与 word diff？[E: components/StructuredDiff/Fallback.tsx:125][E: components/StructuredDiff/Fallback.tsx:153][E: components/StructuredDiff/Fallback.tsx:227][E: components/StructuredDiff/Fallback.tsx:378]
- Diff family 如何批量渲染多个 hunk？[E: components/StructuredDiffList.tsx:16][E: components/StructuredDiffList.tsx:24]

## 族干什么

StructuredDiff family 是 diff rendering engine。`StructuredDiff` 接收 `StructuredPatchHunk`、文件路径、原文件内容、首行号、宽度和 dim 状态；它读取 theme 与 settings 后决定是否跳过 syntax highlighting。[E: components/StructuredDiff.tsx:11][E: components/StructuredDiff.tsx:95][E: components/StructuredDiff.tsx:107][E: components/StructuredDiff.tsx:108][E: components/StructuredDiff.tsx:109] 如果 color-diff runtime 可用，它会创建 `ColorDiff` 并把结果拆成 gutter/content 缓存；否则渲染 `StructuredDiffFallback`。[E: components/StructuredDiff.tsx:65][E: components/StructuredDiff.tsx:71][E: components/StructuredDiff.tsx:77][E: components/StructuredDiff.tsx:129]

`StructuredDiffList` 是薄封装：它把 hunks map 成多个 `StructuredDiff`，并用 `"..."` 分隔 hunk。[E: components/StructuredDiffList.tsx:16][E: components/StructuredDiffList.tsx:24] 因此 diff dialog、file edit update、rejected update 都可以复用同一批行级 renderer。[E: components/diff/DiffDetailView.tsx:242][E: components/FileEditToolUpdatedMessage.tsx:88][E: components/FileEditToolUseRejectedMessage.tsx:146]

## 成员清单

- `StructuredDiff` — `components/StructuredDiff.tsx` — 渲染单个 hunk，管理 color-diff 调用、cache、gutter split 和 fallback 选择。[E: components/StructuredDiff.tsx:95][E: components/StructuredDiff.tsx:50][E: components/StructuredDiff.tsx:71][E: components/StructuredDiff.tsx:129]
- `StructuredDiffList` — `components/StructuredDiffList.tsx` — 渲染多个 hunks，并在 hunk 之间插入 dimmed ellipsis separator。[E: components/StructuredDiffList.tsx:16][E: components/StructuredDiffList.tsx:24]
- `StructuredDiffFallback` — `components/StructuredDiff/Fallback.tsx` — 在没有 color-diff 或禁用 highlighting 时执行 TypeScript diff formatting、line numbering 和 word diff。[E: components/StructuredDiff/Fallback.tsx:81][E: components/StructuredDiff/Fallback.tsx:349][E: components/StructuredDiff/Fallback.tsx:378]
- `colorDiff` bridge — `components/StructuredDiff/colorDiff.ts` — 懒加载 color-diff 相关 runtime，并提供 `expectColorDiff` / `expectColorFile` / `getSyntaxTheme` 包装。[E: components/StructuredDiff/colorDiff.ts:1][E: components/StructuredDiff/colorDiff.ts:25][E: components/StructuredDiff/colorDiff.ts:29][E: components/StructuredDiff/colorDiff.ts:33]

## 巨型组件深挖

`StructuredDiff` 的关键路径是 `renderColorDiff`。它先确认 `expectColorDiff()` 是否返回可用 runtime，再用 hunk、filePath、fileContent、firstLine 构造 `ColorDiff` 并 render。[E: components/StructuredDiff.tsx:51][E: components/StructuredDiff.tsx:65] render 结果按 gutter width 分成两个 ANSI 列，存入 `WeakMap<StructuredPatchHunk, Map<string, CachedRender>>`，cache key 包含 filePath、firstLine、theme、width、dim 和 splitGutter。[E: components/StructuredDiff.tsx:41][E: components/StructuredDiff.tsx:61][E: components/StructuredDiff.tsx:71][E: components/StructuredDiff.tsx:77] 每个 hunk 的 cache map 达到 4 个条目时会 clear，避免同一 hunk 在多个宽度和主题下无限增长。[E: components/StructuredDiff.tsx:91]

fallback 逻辑更偏算法层。它把 diff text 转成 add/remove/nochange objects，然后把相邻 remove/add 分组成候选 line pair，并为配对行设置 `wordDiff=true` 和 `matchedLine`。[E: components/StructuredDiff/Fallback.tsx:125][E: components/StructuredDiff/Fallback.tsx:153][E: components/StructuredDiff/Fallback.tsx:193][E: components/StructuredDiff/Fallback.tsx:197][E: components/StructuredDiff/Fallback.tsx:200] 之后 `calculateWordDiffs` 使用 `diffWordsWithSpace`，`generateWordDiffElements` 用 change ratio 和 `CHANGE_THRESHOLD` 决定是否渲染 word-level highlight，否则回到 line-level renderer。[E: components/StructuredDiff/Fallback.tsx:227][E: components/StructuredDiff/Fallback.tsx:245][E: components/StructuredDiff/Fallback.tsx:252][E: components/StructuredDiff/Fallback.tsx:256][E: components/StructuredDiff/Fallback.tsx:378][E: components/StructuredDiff/Fallback.tsx:391]

## 与 hooks/keybindings/AppState 接线

StructuredDiff 不注册 keybindings，也不写 AppState；它只读取 `useTheme`、`useSettings` 和 fullscreen 状态，并通过 props 接收宽度、文件内容与 hunk。[E: components/StructuredDiff.tsx:107][E: components/StructuredDiff.tsx:108][E: components/StructuredDiff.tsx:113][E: components/StructuredDiff.tsx:11] [I] 这让它成为纯渲染 family，交互和数据选择由 Diff family 或 tool message family 提供。

## Sources

- `components/StructuredDiff.tsx`
- `components/StructuredDiffList.tsx`
- `components/StructuredDiff/Fallback.tsx`
- `components/StructuredDiff/colorDiff.ts`

## 相关

- `subsys.ui-components`
