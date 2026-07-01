---
id: subsys.tui.native-modifiers
title: 原生修饰键检查(macOS)
kind: subsystem
tier: T2
pkg: tui
source: [packages/tui/src/native-modifiers.ts]
symbols: [isNativeModifierPressed, loadNativeModifiersHelper]
related: [subsys.tui.key-pipeline]
evidence: explicit
status: verified
updated: 8c943640
---

> `native-modifiers.ts` 是 TUI 的 macOS native modifier bridge: 它按需加载 Darwin 预编译 `.node` helper, 并给上层提供一个失败即返回 `false` 的 `isNativeModifierPressed()` 查询入口。

## 能回答的问题

- `isNativeModifierPressed("shift")` 在 helper 不存在或报错时返回什么？
- `loadNativeModifiersHelper` 什么时候会尝试加载 native `.node` 模块？
- 这个 helper 支持哪些 modifier key name？
- native helper 的加载路径为什么有多个候选位置？
- 非 macOS 或非 x64/arm64 环境会不会触发 native require？

## 职责边界

`native-modifiers.ts` 只负责把 JavaScript/TypeScript 侧的 modifier key query 转接到可选 native addon。它定义 `ModifierKey = "shift" | "command" | "control" | "option"`, 也定义 native helper 必须暴露 `isModifierPressed(name)` function [E: packages/tui/src/native-modifiers.ts:7][E: packages/tui/src/native-modifiers.ts:9][E: packages/tui/src/native-modifiers.ts:10]。

这个节点不覆盖 raw stdin、escape sequence buffering、Kitty keyboard protocol 或 keybinding matching。那些输入管道职责由 [subsys.tui.key-pipeline](key-pipeline.md) 覆盖；本节点只解释 native modifier helper 如何被加载、缓存和调用 [I]。

## 关键文件

- `packages/tui/src/native-modifiers.ts`: 通过 `createRequire(import.meta.url)` 在 ESM 文件内加载 CommonJS/native addon, 定义 helper shape guard、lazy loader 和 public query function [E: packages/tui/src/native-modifiers.ts:1][E: packages/tui/src/native-modifiers.ts:5][E: packages/tui/src/native-modifiers.ts:15][E: packages/tui/src/native-modifiers.ts:21][E: packages/tui/src/native-modifiers.ts:38][E: packages/tui/src/native-modifiers.ts:51]。

## 数据模型

`ModifierKey` 是 native modifier query 的唯一公开 key 集合: `shift`、`command`、`control`、`option` [E: packages/tui/src/native-modifiers.ts:7][E: packages/tui/src/native-modifiers.ts:51]。TypeScript 侧没有公开任意字符串入口, 因此调用方在编译期会被限制到这四个 English key name [I]。

`NativeModifiersHelper` 是内部结构类型, 只要求对象上存在 `isModifierPressed: (name: ModifierKey) => boolean` [E: packages/tui/src/native-modifiers.ts:9][E: packages/tui/src/native-modifiers.ts:10]。`isNativeModifiersHelper()` 是 runtime shape guard: 非对象、`null`、或没有 function 类型 `isModifierPressed` 的值都会被拒绝 [E: packages/tui/src/native-modifiers.ts:15][E: packages/tui/src/native-modifiers.ts:16][E: packages/tui/src/native-modifiers.ts:17][E: packages/tui/src/native-modifiers.ts:18]。

`nativeModifiersHelper` 是模块级 cache, 类型是 `NativeModifiersHelper | null | undefined` [E: packages/tui/src/native-modifiers.ts:13]。`undefined` 表示还没尝试加载, `null` 表示已经尝试但当前进程不可用或未找到 helper, helper object 表示加载成功 [E: packages/tui/src/native-modifiers.ts:22][E: packages/tui/src/native-modifiers.ts:23][E: packages/tui/src/native-modifiers.ts:40][I]。

## 控制流

1. `isNativeModifierPressed@packages/tui/src/native-modifiers.ts:51` 接收一个 `ModifierKey`, 先调用内部 `loadNativeModifiersHelper()` [E: packages/tui/src/native-modifiers.ts:51][E: packages/tui/src/native-modifiers.ts:52]。
2. `loadNativeModifiersHelper@packages/tui/src/native-modifiers.ts:21` 如果发现 module-level cache 已经不是 `undefined`, 会直接返回缓存 helper, 或在缓存为 `null` 时返回 `undefined` [E: packages/tui/src/native-modifiers.ts:21][E: packages/tui/src/native-modifiers.ts:22]。
3. 第一次尝试加载时, loader 先把 cache 设为 `null`, 使后续失败路径不会重复扫描所有候选 native module path [E: packages/tui/src/native-modifiers.ts:23][I]。
4. loader 只在 `process.platform === "darwin"` 时继续, 并且只接受 `process.arch` 为 `x64` 或 `arm64` [E: packages/tui/src/native-modifiers.ts:24][E: packages/tui/src/native-modifiers.ts:25][E: packages/tui/src/native-modifiers.ts:26]。
5. loader 从当前 module URL 推出 `moduleDir`, 拼出 `native/darwin/prebuilds/darwin-${arch}/darwin-modifiers.node` 这个相对 native addon path [E: packages/tui/src/native-modifiers.ts:28][E: packages/tui/src/native-modifiers.ts:29]。
6. loader 依次尝试三个 packaging location: `moduleDir/../native/...`, `moduleDir/native/...`, 以及 `dirname(process.execPath)/native/...` [E: packages/tui/src/native-modifiers.ts:30][E: packages/tui/src/native-modifiers.ts:31][E: packages/tui/src/native-modifiers.ts:32][E: packages/tui/src/native-modifiers.ts:33]。
7. 对每个 candidate path, loader 用 `cjsRequire(modulePath)` 加载 native addon, 再用 `isNativeModifiersHelper()` 验证 shape; 验证通过就写入 cache 并返回 helper [E: packages/tui/src/native-modifiers.ts:36][E: packages/tui/src/native-modifiers.ts:38][E: packages/tui/src/native-modifiers.ts:39][E: packages/tui/src/native-modifiers.ts:40][E: packages/tui/src/native-modifiers.ts:41]。
8. candidate require 抛错不会抛给调用方; shape guard 不通过时不会写入 cache 或返回 helper, 循环会继续尝试下一个 candidate [E: packages/tui/src/native-modifiers.ts:36][E: packages/tui/src/native-modifiers.ts:39][E: packages/tui/src/native-modifiers.ts:40][E: packages/tui/src/native-modifiers.ts:41][E: packages/tui/src/native-modifiers.ts:43]。
9. 所有 candidate 都失败时, loader 返回 `undefined`; cache 已保持为 `null`, 所以后续调用会快速返回不可用 [E: packages/tui/src/native-modifiers.ts:23][E: packages/tui/src/native-modifiers.ts:48][E: packages/tui/src/native-modifiers.ts:22]。
10. `isNativeModifierPressed()` 没拿到 helper 时直接返回 `false`; 拿到 helper 后只把 native 返回值严格等于 `true` 的情况视为 pressed, native 调用抛错也返回 `false` [E: packages/tui/src/native-modifiers.ts:52][E: packages/tui/src/native-modifiers.ts:53][E: packages/tui/src/native-modifiers.ts:54][E: packages/tui/src/native-modifiers.ts:55][E: packages/tui/src/native-modifiers.ts:56][E: packages/tui/src/native-modifiers.ts:57]。

## 设计动机与权衡

这个 helper 是 optional native dependency 风格: 非 Darwin、非支持架构、native addon 缺失、native addon shape 不符、或 native call 抛错, 都会降级为 `false` 而不是让 TUI 输入处理崩溃 [E: packages/tui/src/native-modifiers.ts:24][E: packages/tui/src/native-modifiers.ts:26][E: packages/tui/src/native-modifiers.ts:39][E: packages/tui/src/native-modifiers.ts:43][E: packages/tui/src/native-modifiers.ts:48][E: packages/tui/src/native-modifiers.ts:53][E: packages/tui/src/native-modifiers.ts:57][I]。

多个 candidate path 说明代码需要兼容至少三种打包布局: 编译输出目录旁的上一层 `native/`, 当前 module directory 下的 `native/`, 以及 executable 所在目录下的 `native/` [E: packages/tui/src/native-modifiers.ts:30][E: packages/tui/src/native-modifiers.ts:31][E: packages/tui/src/native-modifiers.ts:32][E: packages/tui/src/native-modifiers.ts:33][I]。

`loadNativeModifiersHelper` 没有 `export`, 但它被列为本节点 symbol 是因为它承载 native addon lazy loading 和 cache 策略; 对外稳定入口仍然是 exported `isNativeModifierPressed()` [E: packages/tui/src/native-modifiers.ts:21][E: packages/tui/src/native-modifiers.ts:51][I]。

## Gotcha

- `false` 不一定表示物理 modifier key 没被按下; 它也可能表示当前平台不是 macOS、架构不支持、helper 未打包、helper shape 不符或 native call 失败 [E: packages/tui/src/native-modifiers.ts:24][E: packages/tui/src/native-modifiers.ts:26][E: packages/tui/src/native-modifiers.ts:39][E: packages/tui/src/native-modifiers.ts:43][E: packages/tui/src/native-modifiers.ts:53][E: packages/tui/src/native-modifiers.ts:57][I]。
- loader 第一次进入就把 cache 置为 `null`, 因此一次失败后不会在同一进程内自动重试加载新出现的 native addon [E: packages/tui/src/native-modifiers.ts:22][E: packages/tui/src/native-modifiers.ts:23][E: packages/tui/src/native-modifiers.ts:48][I]。
- TypeScript 文件只能证明 native addon 的 expected JS shape 和加载路径; `.node` 内部如何读取 macOS modifier state 不在这个 source file 中 [U]。

## 跨包边界

本节点属于 `packages/tui`。从本 source 的显式 import 可见, 它导入 Node 内置 `module`、`path`、`url`, 并使用 `process` runtime 信息加载 native addon [E: packages/tui/src/native-modifiers.ts:1][E: packages/tui/src/native-modifiers.ts:2][E: packages/tui/src/native-modifiers.ts:3][E: packages/tui/src/native-modifiers.ts:24][E: packages/tui/src/native-modifiers.ts:25][E: packages/tui/src/native-modifiers.ts:33]。TUI 键盘事件管道如何调用这个 helper 由 [subsys.tui.key-pipeline](key-pipeline.md) 说明 [I]。

## Sources

- packages/tui/src/native-modifiers.ts

## 相关

- [subsys.tui.key-pipeline](key-pipeline.md): 解释 raw stdin、sequence buffering、keyboard protocol negotiation 和 Apple Terminal 输入归一化如何串成 TUI key event pipeline。
