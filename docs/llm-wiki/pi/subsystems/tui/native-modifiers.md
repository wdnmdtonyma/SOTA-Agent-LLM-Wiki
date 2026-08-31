---
id: subsys.tui.native-modifiers
title: 原生修饰键检查(macOS / Windows)
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/native-modifiers.ts
  - packages/tui/src/native-module-path.ts
  - packages/tui/test/native-module-path.test.ts
symbols:
  - isNativeModifierPressed
  - loadNativeModifiersHelper
  - getNativeModuleCandidates
related: [subsys.tui.key-pipeline]
evidence: explicit
status: verified
updated: 853a80d26c
---

> `native-modifiers.ts` 是 TUI 的 native modifier bridge:它按需加载 Darwin 或 Win32 预编译 `.node` helper,路径解析集中在 `getNativeModuleCandidates()`,并给上层提供一个失败即返回 `false` 的 `isNativeModifierPressed()` 查询入口。

## 能回答的问题

- `isNativeModifierPressed("shift")` 在 helper 不存在或报错时返回什么？
- `loadNativeModifiersHelper` 什么时候会尝试加载 native `.node` 模块？
- `getNativeModuleCandidates()` 相对旧的三路径扫描多了哪一个候选？
- 这个 helper 支持哪些 modifier key name？
- 非 Darwin / 非 Win32 或非 x64/arm64 环境会不会触发 native require？

## 职责边界

`native-modifiers.ts` 只负责把 JavaScript/TypeScript 侧的 modifier key query 转接到可选 native addon。它定义 `ModifierKey = "shift" | "command" | "control" | "option"`,也定义 native helper 必须暴露 `isModifierPressed(name)` function [E: packages/tui/src/native-modifiers.ts:7] [E: packages/tui/src/native-modifiers.ts:9] [E: packages/tui/src/native-modifiers.ts:10]。

`native-module-path.ts` 是路径解析权威:`getNativeModuleCandidates(nativePath, options?)` 返回去重后的候选绝对路径,供 Darwin modifiers 与 Win32 console-mode helper 共用 [E: packages/tui/src/native-module-path.ts:14] [E: packages/tui/src/native-modifiers.ts:36]。

这个节点不覆盖 raw stdin、escape sequence buffering、Kitty keyboard protocol 或 keybinding matching。那些输入管道职责由 [subsys.tui.key-pipeline](key-pipeline.md) 覆盖 [I]。

## 关键文件

- `packages/tui/src/native-modifiers.ts`: `createRequire(import.meta.url)` 加载 native addon,shape guard、lazy loader 和 `isNativeModifierPressed()` [E: packages/tui/src/native-modifiers.ts:1] [E: packages/tui/src/native-modifiers.ts:15] [E: packages/tui/src/native-modifiers.ts:21] [E: packages/tui/src/native-modifiers.ts:51]。
- `packages/tui/src/native-module-path.ts`: 按 installed `@earendil-works/pi-tui`、module 相对路径、`process.execPath` 拼候选 [E: packages/tui/src/native-module-path.ts:5] [E: packages/tui/src/native-module-path.ts:14]。
- `packages/tui/test/native-module-path.test.ts`: bundled chunk 优先命中 installed package;`resolvePackage` 失败时保留 standalone fallback。

## 数据模型

`ModifierKey` 是 native modifier query 的唯一公开 key 集合: `shift`、`command`、`control`、`option` [E: packages/tui/src/native-modifiers.ts:7] [E: packages/tui/src/native-modifiers.ts:51]。

`NativeModifiersHelper` 只要求 `isModifierPressed: (name: ModifierKey) => boolean` [E: packages/tui/src/native-modifiers.ts:9]。`isNativeModifiersHelper()` 拒绝非对象、`null`、或没有 function 类型 `isModifierPressed` 的值 [E: packages/tui/src/native-modifiers.ts:15]。

`nativeModifiersHelper` 是模块级 cache,类型是 `NativeModifiersHelper | null | undefined` [E: packages/tui/src/native-modifiers.ts:13]。`undefined` 表示还没尝试加载,`null` 表示已经尝试但当前进程不可用,helper object 表示加载成功 [I]。

`NativeModuleCandidateOptions` 允许测试注入 `moduleUrl`、`execPath`、`resolvePackage` [E: packages/tui/src/native-module-path.ts:8]。

## 控制流

1. `isNativeModifierPressed@packages/tui/src/native-modifiers.ts:51` 先调用内部 `loadNativeModifiersHelper()` [E: packages/tui/src/native-modifiers.ts:52]。
2. `loadNativeModifiersHelper@packages/tui/src/native-modifiers.ts:21` 若 cache 已不是 `undefined`,直接返回缓存 helper,或在 cache 为 `null` 时返回 `undefined` [E: packages/tui/src/native-modifiers.ts:22]。
3. 第一次尝试把 cache 设为 `null`,使后续失败路径不再重扫 [E: packages/tui/src/native-modifiers.ts:23]。
4. loader 只接受 `process.arch` 为 `x64` 或 `arm64`;其它架构立即返回 [E: packages/tui/src/native-modifiers.ts:24] [E: packages/tui/src/native-modifiers.ts:25]。
5. Darwin 拼 `native/darwin/prebuilds/darwin-${arch}/darwin-modifiers.node`;Win32 拼 `native/win32/prebuilds/win32-${arch}/win32-console-mode.node`;其它 platform 返回 [E: packages/tui/src/native-modifiers.ts:28] [E: packages/tui/src/native-modifiers.ts:30] [E: packages/tui/src/native-modifiers.ts:33]。
6. `getNativeModuleCandidates(nativePath)` 依次收集:
   - `require.resolve("@earendil-works/pi-tui")` 成功时:`dirname(packageEntry)/../` + `nativePath`(installed package root) [E: packages/tui/src/native-module-path.ts:19] [E: packages/tui/src/native-module-path.ts:20]
   - `moduleDir/../` + `nativePath` [E: packages/tui/src/native-module-path.ts:26]
   - `moduleDir/` + `nativePath` [E: packages/tui/src/native-module-path.ts:27]
   - `dirname(execPath)/` + `nativePath` [E: packages/tui/src/native-module-path.ts:28]
   最后 `Array.from(new Set(candidates))` 去重 [E: packages/tui/src/native-module-path.ts:30]。
7. installed package resolve 失败(standalone binary)被 swallow,只保留后三个 fallback [E: packages/tui/src/native-module-path.ts:21] [E: packages/tui/test/native-module-path.test.ts:26]。
8. 对每个 candidate,`cjsRequire(modulePath)` 后用 `isNativeModifiersHelper()` 验 shape;通过则写入 cache 并返回 [E: packages/tui/src/native-modifiers.ts:38] [E: packages/tui/src/native-modifiers.ts:39]。
9. require 抛错或 shape 不符不抛给调用方,继续下一个 candidate [E: packages/tui/src/native-modifiers.ts:43]。
10. `isNativeModifierPressed()` 没拿到 helper 返回 `false`;native 返回值必须严格 `=== true` 才算 pressed,native 抛错也返回 `false` [E: packages/tui/src/native-modifiers.ts:53] [E: packages/tui/src/native-modifiers.ts:55] [E: packages/tui/src/native-modifiers.ts:57]。

bundled coding-agent chunk 的 `import.meta.url` 不再指向 `pi-tui` 包内。测试用虚拟 `node_modules/@earendil-works/pi-tui/dist/index.js` 证明第一个 candidate 是 `packageRoot/native/...`,而不是 chunk 旁的相对路径 [E: packages/tui/test/native-module-path.test.ts:8] [E: packages/tui/test/native-module-path.test.ts:22]。

## 设计动机与权衡

optional native dependency:非支持平台、架构、addon 缺失、shape 不符、native call 抛错都降级为 `false`,不让 TUI 输入崩溃 [E: packages/tui/src/native-modifiers.ts:25] [E: packages/tui/src/native-modifiers.ts:33] [E: packages/tui/src/native-modifiers.ts:43] [E: packages/tui/src/native-modifiers.ts:57] [I]。

优先 resolve installed `@earendil-works/pi-tui`,是为了 coding-agent bundle 把 TUI 打进别的 chunk 目录后,仍能找到 package 自带的 prebuild [E: packages/tui/src/native-module-path.ts:19] [E: packages/tui/test/native-module-path.test.ts:8] [I]。

`loadNativeModifiersHelper` 没有 `export`;对外稳定入口仍是 `isNativeModifierPressed()`。`getNativeModuleCandidates` 是 exported,供 `ProcessTerminal.enableWindowsVTInput()` 等其它 native helper 复用 [E: packages/tui/src/native-module-path.ts:14] [I]。

## Gotcha

- `false` 不一定表示物理 modifier 没按下;也可能是平台不支持、helper 未打包、shape 不符或 native call 失败 [E: packages/tui/src/native-modifiers.ts:25] [E: packages/tui/src/native-modifiers.ts:53] [E: packages/tui/src/native-modifiers.ts:57] [I]。
- loader 第一次进入就把 cache 置为 `null`,同一进程不会自动重试新出现的 addon [E: packages/tui/src/native-modifiers.ts:22] [E: packages/tui/src/native-modifiers.ts:23]。
- TypeScript 文件只能证明 expected JS shape 和加载路径;`.node` 内部如何读 OS modifier state 不在这些 source 中 [U]。
- Win32 的 `win32-console-mode.node` 同时服务 modifier query 与 VT input enable;本节点只覆盖 `isModifierPressed` shape,不展开 `enableVirtualTerminalInput` [I]。

## 跨包边界

本节点属于 `packages/tui`。TUI 键盘事件管道如何调用 `isNativeModifierPressed()` 由 [subsys.tui.key-pipeline](key-pipeline.md) 说明 [I]。

## Sources

- packages/tui/src/native-modifiers.ts
- packages/tui/src/native-module-path.ts
- packages/tui/test/native-module-path.test.ts

## 相关

- [subsys.tui.key-pipeline](key-pipeline.md): raw stdin、sequence buffering、keyboard protocol negotiation 和 Apple Terminal / Win32 输入归一化。
