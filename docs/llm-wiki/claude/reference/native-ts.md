---
id: ref.native-ts
path: reference/native-ts.md
title: native-ts 移植算法模块(Yoga / color-diff / file-index)
kind: reference
tier: T3
status: verified
source: [native-ts/yoga-layout/index.ts, native-ts/yoga-layout/enums.ts, native-ts/color-diff/index.ts, native-ts/file-index/index.ts]
symbols: [loadYoga, Node, getYogaCounters, ColorDiff, ColorFile, getSyntaxTheme, getNativeModule, FileIndex, yieldToEventLoop, CHUNK_MS]
related: [subsys.ink-runtime]
updated: 2026-06-14
evidence: explicit
---

> `native-ts/` 是三个**把原生依赖(C++ / Rust NAPI)重写成纯 TypeScript 的移植模块**:`yoga-layout`(Meta 的 flexbox 布局引擎)、`color-diff`(语法高亮 + word-diff 渲染)、`file-index`(nucleo 风格的模糊文件搜索)。每个模块都声明"API 与上游 / vendor 对齐,调用方无需改动",目的是去掉 native binary 依赖。

## 能回答的问题

- `native-ts/` 下三个模块各是什么、各自移植自哪个原生库?
- Ink 布局引擎(flexbox)的 Yoga 实现在哪、入口导出是什么?
- Claude Code 的 diff / 文件高亮渲染(`ColorDiff` / `ColorFile`)实现在哪?
- `@` 文件补全的模糊搜索索引(`FileIndex`)在哪、谁消费它?
- 这些是 vendored / ported 第三方算法吗,有没有 license / port 出处注释?
- `yoga-layout` 被 Ink 的哪些文件 import?

## 三模块速览

每个模块文件头都带显式 "Pure-TypeScript port of …" 注释,标明上游来源与移植动机(去 native 依赖)。

| 模块 | 路径 | 干什么 | 关键导出 | 消费方 |
|---|---|---|---|---|
| **yoga-layout** | `native-ts/yoga-layout/index.ts`(2578 LOC)+ `enums.ts`(134 LOC) | Meta **Yoga flexbox 布局引擎**的 TS 移植:单遍 flexbox(flex-direction / grow / shrink / basis、align、justify、margin/padding/border/gap、position、measure 函数等)[E: native-ts/yoga-layout/index.ts:1] | `loadYoga()` [E: native-ts/yoga-layout/index.ts:2574]、`class Node` [E: native-ts/yoga-layout/index.ts:403]、`getYogaCounters()` [E: native-ts/yoga-layout/index.ts:1044]、默认导出 `YOGA_INSTANCE` [E: native-ts/yoga-layout/index.ts:2578];布局枚举 `Align`/`FlexDirection`/`Justify`/… 来自 `enums.ts` [E: native-ts/yoga-layout/enums.ts:7] | Ink:`ink/layout/yoga.ts:14`、`ink/ink.tsx:10`、`ink/reconciler.ts:5` |
| **color-diff** | `native-ts/color-diff/index.ts`(999 LOC) | 颜色化 **diff / 文件渲染**:语法高亮(highlight.js 替代 Rust 的 syntect+bat)+ word-diff(`diff` 包的 `diffArrays` 替代 similar crate),产出带行号/标记/背景/词级 diff 的 ANSI 行 [E: native-ts/color-diff/index.ts:1] | `class ColorDiff`(渲染一个 hunk)[E: native-ts/color-diff/index.ts:842]、`class ColorFile`(渲染整文件)[E: native-ts/color-diff/index.ts:935]、`getSyntaxTheme()` [E: native-ts/color-diff/index.ts:970]、`getNativeModule()` [E: native-ts/color-diff/index.ts:982] | `components/StructuredDiff/colorDiff.ts:1`(经别名 `color-diff-napi`)[I] |
| **file-index** | `native-ts/file-index/index.ts`(370 LOC) | **模糊文件搜索**索引:重写 Rust NAPI 模块(包装 nucleo),纯 TS 实现相同 API 与打分;bitmap 预筛 + top-k + 时间分片异步构建 [E: native-ts/file-index/index.ts:1] | `class FileIndex`(`.loadFromFileList` / `.search`)[E: native-ts/file-index/index.ts:43]、`yieldToEventLoop()` [E: native-ts/file-index/index.ts:325]、`CHUNK_MS` [E: native-ts/file-index/index.ts:38] | `hooks/fileSuggestions.ts:13` |

## 模块说明

### yoga-layout —— Yoga flexbox 的 TS 移植

文件头明确:这是 Meta Yoga(flexbox engine)的纯 TS 移植,匹配 `yoga-layout/load` 的 API 面,只覆盖 Ink 实际用到的 flexbox 子集 [E: native-ts/yoga-layout/index.ts:1];上游标注为 `https://github.com/facebook/yoga` [E: native-ts/yoga-layout/index.ts:38]。

入口/装配:`loadYoga()` 返回 `Promise<Yoga>`,`Yoga` 是带 `Config.create/destroy` 与 `Node.create/createDefault/createWithConfig/destroy` 的工厂对象 [E: native-ts/yoga-layout/index.ts:2548];模块默认导出同一个 `YOGA_INSTANCE` 单例 [E: native-ts/yoga-layout/index.ts:2561]。布局主体是 `class Node`,持有 `style`/`layout`/`children`,通过 `calculateLayout(...)` 触发布局、`getComputedLayout()` 取结果 [E: native-ts/yoga-layout/index.ts:403]。`getYogaCounters()` 暴露 `visited`/`measured`/`cacheHits`/`live` 性能计数器供 Ink 调试 [E: native-ts/yoga-layout/index.ts:1044]。所有枚举(`Align`/`Display`/`Edge`/`FlexDirection`/`Justify`/`MeasureMode`/`Unit`/`Wrap` 等)在 `enums.ts` 里以 `const` 对象实现,数值与上游 `YGEnums.ts` 完全对齐以免调用方改动 [E: native-ts/yoga-layout/enums.ts:1]。

消费方(均为 Ink 运行时):`ink/layout/yoga.ts` 默认 import `Yoga` 及枚举并适配成 Ink 自己的 layout 抽象 [E: ink/layout/yoga.ts:14];`ink/ink.tsx` 与 `ink/reconciler.ts` 只 import `getYogaCounters` 用于性能/调试输出 [E: ink/ink.tsx:10] [E: ink/reconciler.ts:5]。

### color-diff —— 语法高亮 + word-diff 渲染

文件头说明:这是 `vendor/color-diff-src`(Rust)的纯 TS 移植;Rust 版用 syntect+bat 做高亮、similar crate 做 word diff,本移植改用 highlight.js(经 cli-highlight 已是依赖)与 `diff` 包的 `diffArrays`,并声明 "API matches vendor/color-diff-src/index.d.ts exactly so callers don't change" [E: native-ts/color-diff/index.ts:1]。`hljs()` 用 lazy `require('highlight.js')` 延迟到首次渲染,以免在 module-eval 时就注册 190+ 语言语法(~50MB)[E: native-ts/color-diff/index.ts:38]。

两个渲染类:`ColorDiff` 接收一个 `Hunk` + 文件路径,`render(themeName, width, dim)` 输出 ANSI 行数组(渲染单个 diff hunk)[E: native-ts/color-diff/index.ts:842];`ColorFile` 接收整段代码 + 路径,`render(...)` 高亮整文件 [E: native-ts/color-diff/index.ts:935]。`getSyntaxTheme()` 在本移植里是 stub —— highlight.js 没有 bat theme,故 `BAT_THEME`/`CLAUDE_CODE_SYNTAX_HIGHLIGHT` 仅做诊断回显,始终返回该 Claude theme 的默认值 [E: native-ts/color-diff/index.ts:970]。`getNativeModule()` 是 lazy loader,返回 `{ ColorDiff, ColorFile, getSyntaxTheme }`,匹配 vendor 的 API 形态 [E: native-ts/color-diff/index.ts:982]。

消费方:`components/StructuredDiff/colorDiff.ts` import `ColorDiff` / `ColorFile` / `getSyntaxTheme` / `SyntaxTheme`,但走的是裸别名 `color-diff-napi` 而非 `native-ts/color-diff` 路径 [E: components/StructuredDiff/colorDiff.ts:1]。该别名到本移植文件的解析在 dump 内的 `tsconfig`/`package.json` 中查不到,故"colorDiff.ts 消费的就是本移植"仅由文件头声明 + 导出符号名完全一致推断 `[I]`(详见 `## 相关` 后注)。

### file-index —— nucleo 风格模糊文件搜索

文件头说明:这是 `vendor/file-index-src`(Rust NAPI 模块,内部包装 nucleo 做高性能模糊文件搜索)的纯 TS 移植,在无 native 依赖下重实现相同 API 与打分;打分语义"越低越好",最佳匹配 = 0.0,含 "test" 的路径有 1.05× 惩罚 [E: native-ts/file-index/index.ts:1]。

入口是 `class FileIndex` [E: native-ts/file-index/index.ts:43]:`loadFromFileList(fileList)` 去重并建索引 [E: native-ts/file-index/index.ts:58];`loadFromFileListAsync(...)` 是异步变体,按时间分片(`CHUNK_MS` ≈ 4ms,慢机器自动用更小 chunk)`yield` 给事件循环,返回 `{ queryable, done }` 以便首块就绪即可部分搜索 [E: native-ts/file-index/index.ts:83];`search(query, limit)` 用 a–z bitmap O(1) 预筛 + 融合 `indexOf` 扫描 + top-k 维护,返回按分数排序的结果 [E: native-ts/file-index/index.ts:173]。辅助导出 `yieldToEventLoop()`(`setImmediate` 让步)[E: native-ts/file-index/index.ts:325] 与常量 `CHUNK_MS` [E: native-ts/file-index/index.ts:329];默认导出 `FileIndex` [E: native-ts/file-index/index.ts:369]。

消费方:`hooks/fileSuggestions.ts` import `{ CHUNK_MS, FileIndex, yieldToEventLoop }` 自 `../native-ts/file-index/index.js`,为 `@` 文件补全建索引 [E: hooks/fileSuggestions.ts:13]。

## 是否 vendored / ported 第三方算法

三者**都是 ported(重写),不是 vendored(原样搬运)**:每个文件头都自述是某原生库的"Pure-TypeScript port",并标注上游与替代实现——

- yoga-layout:port of Meta Yoga(C++),上游 `github.com/facebook/yoga`,只覆盖 Ink 用到的 flexbox 子集 [E: native-ts/yoga-layout/index.ts:1];`enums.ts` 数值刻意对齐上游 `YGEnums.ts` [E: native-ts/yoga-layout/enums.ts:1]。
- color-diff:port of `vendor/color-diff-src`(Rust,syntect+bat+similar),改用 highlight.js + `diff` 包 [E: native-ts/color-diff/index.ts:1]。
- file-index:port of `vendor/file-index-src`(Rust NAPI,包装 nucleo)[E: native-ts/file-index/index.ts:1]。

文件头注释里**只给上游/vendor 出处,未见显式开源 license 文本**;具体 license 归属不在这些文件内,故不在此断言 `[U]`(见 `_staging/uncertainty-r3t3.md`)。

## Sources

- native-ts/yoga-layout/index.ts
- native-ts/yoga-layout/enums.ts
- native-ts/color-diff/index.ts
- native-ts/file-index/index.ts
- ink/layout/yoga.ts
- ink/ink.tsx
- ink/reconciler.ts
- components/StructuredDiff/colorDiff.ts
- hooks/fileSuggestions.ts

## 相关

- [subsys.ink-runtime](../subsystems/ink-runtime.md) —— Ink 运行时;`yoga-layout` 是其 flexbox 布局后端,由 `ink/layout/yoga.ts` / `ink/reconciler.ts` / `ink/ink.tsx` 消费。

> 注(color-diff 消费链 `[I]`):`components/StructuredDiff/colorDiff.ts:1` 经裸别名 `color-diff-napi` import `ColorDiff`/`ColorFile`/`getSyntaxTheme`/`SyntaxTheme`;dump 内无 `tsconfig`/`package.json` 把该别名映射到 `native-ts/color-diff/index.ts`,也无同名包目录。判定"消费的就是本移植"依据:① 本移植文件头自述 "API matches vendor/color-diff-src/index.d.ts exactly so callers don't change" [E: native-ts/color-diff/index.ts:1];② 导出符号名与 consumer import 完全一致。构建期别名解析不可从 dump 证实,记 `[U]` 于 `_staging/uncertainty-r3t3.md`。
