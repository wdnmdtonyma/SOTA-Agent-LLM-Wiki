---
id: subsys.keybindings
path: subsystems/keybindings.md
title: Keybindings
kind: subsystem
tier: T2
source: [keybindings/]
symbols: [DEFAULT_BINDINGS, loadKeybindings, resolveKeyWithChordState, useKeybinding]
related: []
status: verified
evidence: explicit
updated: 2026-06-14
---

> Keybindings 子系统把用户配置中的 chord 字符串解析为 binding, 把 raw Ink key event 构造成 keystroke, 再按 active context 解析为 action、command 或 unbound result。[E: keybindings/parser.ts:80][E: keybindings/resolver.ts:82][E: keybindings/resolver.ts:166]

## 能回答的问题

- 默认快捷键、用户 `keybindings.json` 和 feature flag 如何合并?
- chord state、active context 和 Global context 如何共同决定 action?
- 哪些快捷键不能被用户重绑?
- React 组件如何注册 keybinding handler?

## 职责边界

`keybindings/schema.ts` 定义用户文件 schema 的 contexts 与 actions, 用户文件只能把 context 内的 key chord 映射到 enum action、`command:` 字符串或 `null` unbind。[E: keybindings/schema.ts:12][E: keybindings/schema.ts:64][E: keybindings/schema.ts:191][E: keybindings/schema.ts:192][E: keybindings/schema.ts:195][E: keybindings/schema.ts:199][E: keybindings/schema.ts:202] 默认绑定由 `DEFAULT_BINDINGS` 提供, 覆盖 Global、Chat、Settings、Confirmation、Transcript、HistorySearch、Task 和 Scroll 等运行上下文; default runtime block 不一定等同于用户 schema 白名单。[E: keybindings/defaultBindings.ts:32][E: keybindings/defaultBindings.ts:63][E: keybindings/defaultBindings.ts:108][E: keybindings/defaultBindings.ts:196][I]

运行时解析发生在 provider 与 hook 两层: 顶层 `ChordInterceptor` 负责全局 chord state 和 active contexts, 局部组件也可以用 `useKeybinding` 在指定 context 内处理 action。[E: keybindings/KeybindingProviderSetup.tsx:205][E: keybindings/useKeybinding.ts:33]

## 关键文件

- `keybindings/defaultBindings.ts`: 平台差异和内置 context/action/chord 映射。[E: keybindings/defaultBindings.ts:15][E: keybindings/defaultBindings.ts:21][E: keybindings/defaultBindings.ts:32]
- `keybindings/loadUserBindings.ts`: feature flag gate、读取 `~/.claude/keybindings.json`、wrapper/type validation、parse/merge 和 file watcher。[E: keybindings/loadUserBindings.ts:42][E: keybindings/loadUserBindings.ts:115][E: keybindings/loadUserBindings.ts:149][E: keybindings/loadUserBindings.ts:170][E: keybindings/loadUserBindings.ts:191][E: keybindings/loadUserBindings.ts:197][E: keybindings/loadUserBindings.ts:353]
- `keybindings/parser.ts`: modifier alias、chord parser、display string 和 platform normalization。[E: keybindings/parser.ts:13][E: keybindings/parser.ts:80][E: keybindings/parser.ts:157]
- `keybindings/resolver.ts`: keystroke build、binding match、chord prefix/exact resolution、last matching binding wins。[E: keybindings/resolver.ts:82][E: keybindings/resolver.ts:123][E: keybindings/resolver.ts:166][E: keybindings/resolver.ts:227]
- `keybindings/KeybindingContext.tsx`: context registry、active context、handler registry 和 imperative `invokeAction`。[E: keybindings/KeybindingContext.tsx:13][E: keybindings/KeybindingContext.tsx:82][E: keybindings/KeybindingContext.tsx:109]

## 数据模型

schema 的 `KEYBINDING_CONTEXTS` 是 context 白名单, `KEYBINDING_ACTIONS` 是 action 白名单; 每个 block 由 `context` 与 `bindings` record 组成。[E: keybindings/schema.ts:12][E: keybindings/schema.ts:64][E: keybindings/schema.ts:180][E: keybindings/schema.ts:181][E: keybindings/schema.ts:185][E: keybindings/schema.ts:186] `parseBindings` 把人写的 chord 字符串转换成 `ParsedBinding`, resolver 再用 `buildKeystroke` 从 Ink event 构造当前 key。[E: keybindings/parser.ts:191][E: keybindings/resolver.ts:82]

reserved shortcuts 分成 non-rebindable、terminal reserved 和 macOS reserved 三类; `getReservedShortcuts` 按 platform 拼出最终集合。[E: keybindings/reservedShortcuts.ts:16][E: keybindings/reservedShortcuts.ts:43][E: keybindings/reservedShortcuts.ts:59][E: keybindings/reservedShortcuts.ts:73] template 生成会过滤 non-rebindable 默认绑定, 避免示例文件鼓励用户改这些键。[E: keybindings/template.ts:19][E: keybindings/template.ts:27]

## 控制流

1. 启动时 `KeybindingProviderSetup` 同步加载 defaults/user bindings, 并把 bindings 与 warnings 存入 state。[E: keybindings/KeybindingProviderSetup.tsx:126][E: keybindings/KeybindingProviderSetup.tsx:127][E: keybindings/KeybindingProviderSetup.tsx:130]
2. 若用户 customization gate 关闭, loader 直接返回 defaults; gate 使用 GrowthBook key `tengu_keybinding_customization_release`。[E: keybindings/loadUserBindings.ts:42][E: keybindings/loadUserBindings.ts:43][E: keybindings/loadUserBindings.ts:137][E: keybindings/loadUserBindings.ts:138]
3. 用户文件缺失时返回 defaults; 存在时会验证 wrapper `bindings` 字段, 解析 block, 再把 user bindings merge 在 defaults 之后。[E: keybindings/loadUserBindings.ts:149][E: keybindings/loadUserBindings.ts:191][E: keybindings/loadUserBindings.ts:197][E: keybindings/loadUserBindings.ts:218][E: keybindings/loadUserBindings.ts:219]
4. 输入事件到达 `ChordInterceptor`, 它跳过 mouse wheel, 收集 registered contexts、active context 和 Global context, 再调用 `resolveKeyWithChordState`。[E: keybindings/KeybindingProviderSetup.tsx:238][E: keybindings/KeybindingProviderSetup.tsx:250][E: keybindings/KeybindingProviderSetup.tsx:252]
5. resolver 返回 `chord_started` 时设置 pending chord timeout; 返回 `match` 且当前处于 pending chord 时, `ChordInterceptor` 才按 contexts 顺序寻找 handler 并执行; 返回 cancelled/unbound 时清 pending chord 并停止传播。[E: keybindings/KeybindingProviderSetup.tsx:251][E: keybindings/KeybindingProviderSetup.tsx:256][E: keybindings/KeybindingProviderSetup.tsx:263][E: keybindings/KeybindingProviderSetup.tsx:268][E: keybindings/KeybindingProviderSetup.tsx:270][E: keybindings/KeybindingProviderSetup.tsx:282][E: keybindings/KeybindingProviderSetup.tsx:288]

## 设计动机与权衡

用户绑定 merge 在 defaults 后面, resolver 又采用 last matching binding wins, 所以用户可以覆盖默认行为, 也可以用 `null` 显式 unbind。[E: keybindings/loadUserBindings.ts:197][E: keybindings/resolver.ts:227][E: keybindings/schema.ts:199] chord timeout 固定为 1000ms, 多键 chord 的等待窗口是固定时长。[E: keybindings/KeybindingProviderSetup.tsx:30][E: keybindings/KeybindingProviderSetup.tsx:176][E: keybindings/KeybindingProviderSetup.tsx:180]

`useShortcutDisplay` 和 `shortcutFormat` 让 UI 既能使用 provider 中的 live bindings, 也能在非 React 路径同步加载 fallback display。[E: keybindings/useShortcutDisplay.ts:34][E: keybindings/useShortcutDisplay.ts:35][E: keybindings/useShortcutDisplay.ts:58][E: keybindings/shortcutFormat.ts:43][E: keybindings/shortcutFormat.ts:60] 这说明 keybinding 子系统同时承担执行语义和显示语义。[I]

## Gotcha

- 单独按 Escape 会取消 pending chord, 不是普通 action match。[E: keybindings/resolver.ts:174][E: keybindings/resolver.ts:175]
- `useKeybinding` 的局部 hook 会把 active context、传入 context 和 Global 都纳入 resolution, 因此同一个 key 可能被 active pane 覆盖。[E: keybindings/useKeybinding.ts:54][E: keybindings/useKeybinding.ts:55][E: keybindings/useKeybinding.ts:56][E: keybindings/useKeybinding.ts:57]
- `loadUserBindings` 有 async 和 sync 两条路径, 非 React display 或早期启动代码可能走 sync path。[E: keybindings/loadUserBindings.ts:259][E: keybindings/shortcutFormat.ts:38]
- file watcher 只在 user keybinding file 变化时 reload 并通知 subscribers; 删除文件会 reset defaults。[E: keybindings/loadUserBindings.ts:398][E: keybindings/loadUserBindings.ts:399][E: keybindings/loadUserBindings.ts:400][E: keybindings/loadUserBindings.ts:428][E: keybindings/loadUserBindings.ts:433][E: keybindings/loadUserBindings.ts:443][E: keybindings/loadUserBindings.ts:447]

## Sources

- `keybindings/`
- `keybindings/schema.ts`
- `keybindings/defaultBindings.ts`
- `keybindings/loadUserBindings.ts`
- `keybindings/parser.ts`
- `keybindings/resolver.ts`
- `keybindings/match.ts`
- `keybindings/reservedShortcuts.ts`
- `keybindings/template.ts`
- `keybindings/KeybindingContext.tsx`
- `keybindings/KeybindingProviderSetup.tsx`
- `keybindings/useKeybinding.ts`
- `keybindings/useShortcutDisplay.ts`
- `keybindings/shortcutFormat.ts`

## 相关

- 无
