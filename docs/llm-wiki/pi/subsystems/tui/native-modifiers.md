---
id: subsys.tui.native-modifiers
title: 原生修饰键检查(macOS / Windows)
kind: subsystem
tier: T2
pkg: tui
source:
  - packages/tui/src/native-modifiers.ts
  - packages/tui/src/native-platform.ts
  - packages/tui/src/native-module-path.ts
  - packages/tui/test/native-module-path.test.ts
  - packages/tui/test/native-platform.test.ts
symbols:
  - isNativeModifierPressed
  - getNativePlatformHelper
  - getNativeClipboard
  - getNativeModuleCandidates
related: [subsys.tui.key-pipeline]
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `native-modifiers.ts` 是 TUI 的 modifier query 薄封装：它调用 `native-platform.ts` 的 `getNativePlatformHelper()`，失败或 helper 无 `isModifierPressed` 时返回 `false`。路径解析仍集中在 `getNativeModuleCandidates()`。

## 能回答的问题

- `isNativeModifierPressed("shift")` 在 helper 不存在或报错时返回什么？
- native `.node` 现在由谁加载，addon 文件名是什么？
- `getNativeModuleCandidates()` 相对旧的三路径扫描多了哪一个候选？
- 这个 helper 支持哪些 modifier key name？
- 非 Darwin / 非 Win32 或非 x64/arm64 环境会不会触发 native require？
- `getNativeClipboard()` 和 modifier helper 是不是同一个 loader？

## 职责边界

`native-modifiers.ts` 只负责把 JavaScript 侧的 modifier key query 转接到可选 native addon。它 re-export `ModifierKey = "shift" | "command" | "control" | "option"`，查询入口是 `isNativeModifierPressed()`。[E: packages/tui/src/native-modifiers.ts:1] [E: packages/tui/src/native-modifiers.ts:3] [E: packages/tui/src/native-modifiers.ts:5]

`native-platform.ts` 是 loader 权威：`getNativePlatformHelper()` 只接受 Darwin/Win32，按 `${platform}-platform.node` 加载；`getNativeClipboard()` 在非 Linux 上复用同一 helper，Linux 则要求 `DISPLAY` 并加载 `linux-platform-x11.node`。[E: packages/tui/src/native-platform.ts:7] [E: packages/tui/src/native-platform.ts:26] [E: packages/tui/src/native-platform.ts:53] [E: packages/tui/src/native-platform.ts:59]

`native-module-path.ts` 是路径解析权威:`getNativeModuleCandidates(nativePath, options?)` 返回去重后的候选绝对路径,供 platform helper 共用 [E: packages/tui/src/native-module-path.ts:14] [E: packages/tui/src/native-platform.ts:38]。

这个节点不覆盖 raw stdin、escape sequence buffering、Kitty keyboard protocol 或 keybinding matching。那些输入管道职责由 [subsys.tui.key-pipeline](key-pipeline.md) 覆盖 [I]。

## 关键文件

- `packages/tui/src/native-modifiers.ts`: `isNativeModifierPressed()` 薄封装。[E: packages/tui/src/native-modifiers.ts:5]
- `packages/tui/src/native-platform.ts`: `ModifierKey`、`NativeClipboard`、`loadNativePlatformHelper()`、`getNativePlatformHelper()`、`getNativeClipboard()`。[E: packages/tui/src/native-platform.ts:7] [E: packages/tui/src/native-platform.ts:9] [E: packages/tui/src/native-platform.ts:26] [E: packages/tui/src/native-platform.ts:53] [E: packages/tui/src/native-platform.ts:59]
- `packages/tui/src/native-module-path.ts`: 按 installed `@earendil-works/pi-tui`、module 相对路径、`process.execPath` 拼候选 [E: packages/tui/src/native-module-path.ts:5] [E: packages/tui/src/native-module-path.ts:14]。
- `packages/tui/test/native-module-path.test.ts`: bundled chunk 优先命中 installed package;`resolvePackage` 失败时保留 standalone fallback。
- `packages/tui/src/index.ts`: 公开导出 `getNativeClipboard` / `NativeClipboard`，不单独导出 modifier loader。[E: packages/tui/src/index.ts:79]

## 数据模型

`ModifierKey` 是 native modifier query 的唯一公开 key 集合: `shift`、`command`、`control`、`option` [E: packages/tui/src/native-platform.ts:7] [E: packages/tui/src/native-modifiers.ts:5]。

`NativeClipboard` 要求 `getText()` / `getImage()`；可选 `setText()`。Linux 用命令行工具保持 clipboard ownership，不走 `setText`。[E: packages/tui/src/native-platform.ts:9] [E: packages/tui/src/native-platform.ts:15]

`NativePlatformHelper` 是 clipboard 方法加上可选 `enableVirtualTerminalInput` 与 `isModifierPressed`。[E: packages/tui/src/native-platform.ts:18]

helper cache 是 `Map<nativePath, helper | undefined>`：缓存的是模块加载结果，不是 display 可用性；断开的 display 可以恢复后再读。[E: packages/tui/src/native-platform.ts:24]

`NativeModuleCandidateOptions` 允许测试注入 `moduleUrl`、`execPath`、`resolvePackage` [E: packages/tui/src/native-module-path.ts:8]。

## 控制流

1. `isNativeModifierPressed@packages/tui/src/native-modifiers.ts:5` 调 `getNativePlatformHelper()`；没有 helper 或没有 `isModifierPressed` 返回 `false` [E: packages/tui/src/native-modifiers.ts:6] [E: packages/tui/src/native-modifiers.ts:3]。
2. native 返回值必须严格 `=== true` 才算 pressed；native 抛错也返回 `false` [E: packages/tui/src/native-modifiers.ts:8] [E: packages/tui/src/native-modifiers.ts:5]。
3. `getNativePlatformHelper@packages/tui/src/native-platform.ts:53` 只接受 `darwin` / `win32`；其它 platform 立即 `undefined` [E: packages/tui/src/native-platform.ts:54] [E: packages/tui/src/native-platform.ts:55]。
4. `loadNativePlatformHelper@packages/tui/src/native-platform.ts:26` 只接受 `x64` / `arm64`；拼 `native/${platform}/prebuilds/${platform}-${arch}/${platform}-platform${suffix}.node` [E: packages/tui/src/native-platform.ts:28] [E: packages/tui/src/native-platform.ts:29]。
5. 同一 `nativePath` 已在 `helpers` map 里则直接返回缓存 [E: packages/tui/src/native-platform.ts:36]。
6. `getNativeModuleCandidates(nativePath)` 依次收集:
   - `require.resolve("@earendil-works/pi-tui")` 成功时:`dirname(packageEntry)/../` + `nativePath`(installed package root) [E: packages/tui/src/native-module-path.ts:19] [E: packages/tui/src/native-module-path.ts:20]
   - `moduleDir/../` + `nativePath` [E: packages/tui/src/native-module-path.ts:26]
   - `moduleDir/` + `nativePath` [E: packages/tui/src/native-module-path.ts:27]
   - `dirname(execPath)/` + `nativePath` [E: packages/tui/src/native-module-path.ts:28]
   最后 `Array.from(new Set(candidates))` 去重 [E: packages/tui/src/native-module-path.ts:30]。
7. installed package resolve 失败(standalone binary)被 swallow,只保留后三个 fallback [E: packages/tui/src/native-module-path.ts:21] [E: packages/tui/test/native-module-path.test.ts:26]。
8. 对每个 candidate，`cjsRequire` 后必须同时有 function 类型的 `getText` 与 `getImage` 才写入 cache；shape 不符或 require 抛错继续下一个 candidate [E: packages/tui/src/native-platform.ts:40] [E: packages/tui/src/native-platform.ts:41] [E: packages/tui/src/native-platform.ts:45]。
9. 全部失败则 cache `undefined` 并返回 [E: packages/tui/src/native-platform.ts:49]。
10. `getNativeClipboard()`：非 Linux 直接 `getNativePlatformHelper()`；Linux 无 `DISPLAY` 返回 `undefined`，否则 `loadNativePlatformHelper("linux", "-x11")` [E: packages/tui/src/native-platform.ts:60] [E: packages/tui/src/native-platform.ts:61] [E: packages/tui/src/native-platform.ts:62]。

bundled coding-agent chunk 的 `import.meta.url` 不再指向 `pi-tui` 包内。测试用虚拟 `node_modules/@earendil-works/pi-tui/dist/index.js` 证明第一个 candidate 是 `packageRoot/native/...`,而不是 chunk 旁的相对路径 [E: packages/tui/test/native-module-path.test.ts:8] [E: packages/tui/test/native-module-path.test.ts:22]。

旧名 `loadNativeModifiersHelper` / `darwin-modifiers.node` / `win32-console-mode.node` 已不存在；现行 addon 是 `*-platform.node`（Linux clipboard 另加 `-x11`）。[E: packages/tui/src/native-platform.ts:34]

## 设计动机与权衡

optional native dependency:非支持平台、架构、addon 缺失、shape 不符、native call 抛错都降级为 `false` / `undefined`,不让 TUI 输入崩溃 [E: packages/tui/src/native-modifiers.ts:3] [E: packages/tui/src/native-modifiers.ts:10] [E: packages/tui/src/native-platform.ts:28] [E: packages/tui/src/native-platform.ts:54] [I]。

优先 resolve installed `@earendil-works/pi-tui`,是为了 coding-agent bundle 把 TUI 打进别的 chunk 目录后,仍能找到 package 自带的 prebuild [E: packages/tui/src/native-module-path.ts:19] [E: packages/tui/test/native-module-path.test.ts:8] [I]。

`isNativeModifierPressed()` 仍是 modifier 的稳定入口。clipboard 走 `getNativeClipboard()`，由 package root 导出；`getNativeModuleCandidates` 供 platform helper 复用 [E: packages/tui/src/native-modifiers.ts:5] [E: packages/tui/src/index.ts:79] [E: packages/tui/src/native-module-path.ts:14]。

## Gotcha

- `false` 不一定表示物理 modifier 没按下;也可能是平台不支持、helper 未打包、shape 不符或 native call 失败 [E: packages/tui/src/native-modifiers.ts:7] [E: packages/tui/src/native-modifiers.ts:10] [I]。
- loader 按 `nativePath` cache；同一路径失败后不会自动重试新出现的 addon [E: packages/tui/src/native-platform.ts:36] [E: packages/tui/src/native-platform.ts:49]。
- clipboard helper 必须同时暴露 `getText` 与 `getImage`，即使调用方只要 modifier 或只要文本 [E: packages/tui/src/native-platform.ts:41]。
- TypeScript 文件只能证明 expected JS shape 和加载路径;`.node` 内部如何读 OS modifier / clipboard 不在这些 source 中 [U]。
- Win32 helper 仍可带 `enableVirtualTerminalInput`；本节点只覆盖 `isModifierPressed` 与 clipboard shape [I]。

## 跨包边界

本节点属于 `packages/tui`。TUI 键盘事件管道如何调用 `isNativeModifierPressed()` 由 [subsys.tui.key-pipeline](key-pipeline.md) 说明 [I]。

## Sources

- packages/tui/src/native-modifiers.ts
- packages/tui/src/native-platform.ts
- packages/tui/src/native-module-path.ts
- packages/tui/test/native-module-path.test.ts
- packages/tui/test/native-platform.test.ts

## 相关

- [subsys.tui.key-pipeline](key-pipeline.md): raw stdin、sequence buffering、keyboard protocol negotiation 和 Apple Terminal / Win32 输入归一化。
