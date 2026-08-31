---
id: subsys.coding-agent.keybindings
title: 键位加载与冲突检测
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/keybindings.ts
symbols:
  - KEYBINDINGS
  - KeybindingsManager
  - migrateKeybindingsConfig
  - AppKeybindings
  - useWindowsKeybindings
related:
  - surface.config.keybindings
  - ref.coding-agent.default-keybindings
  - subsys.tui.keybinding-matching
evidence: explicit
status: verified
updated: 853a80d26c
---

> `keybindings.ts` 是 pi-coding-agent 的 product-level keybinding layer: 它把 pi-tui 的默认键位表扩展为 app actions, 从 `keybindings.json` 读取 user bindings, 迁移 legacy action names, 再交给 pi-tui 的 `KeybindingsManager` 做匹配与解析。

## 能回答的问题

- coding-agent 自己新增了哪些 `app.*` action, 它们和 pi-tui 的 editor/select/input action 怎样合并?
- 用户的 `keybindings.json` 什么时候读取, reload 后怎样更新 effective config?
- legacy keybinding names 怎样迁移到新的 namespaced action id?
- 无效 JSON、非对象配置、非 string/array binding 会怎样处理?
- `KeybindingsManager` 的职责到哪里结束, 真实 key matching 在哪个包里?
- index 里提到的 `DEFAULT_APP_KEYBINDINGS` / `DEFAULT_EDITOR_KEYBINDINGS` 是否仍是当前源码符号?

## 职责边界

`packages/coding-agent/src/core/keybindings.ts` 只负责 coding-agent 层的 keybinding definitions、config loading、legacy migration 和 manager subclass; 它导入 pi-tui 的 `TUI_KEYBINDINGS` 与 `KeybindingsManager` 并复用底层匹配实现 [E: packages/coding-agent/src/core/keybindings.ts:6] [E: packages/coding-agent/src/core/keybindings.ts:7] [E: packages/coding-agent/src/core/keybindings.ts:8]。`KEYBINDINGS` 先展开 `TUI_KEYBINDINGS`, 再覆盖 `tui.editor.undo` 与三条 `tui.altScreen.*` 默认键, 然后追加 `app.*` product actions, 因而 coding-agent 的默认键位表是 TUI defaults + 平台覆盖 + app defaults 的组合 [E: packages/coding-agent/src/core/keybindings.ts:74] [E: packages/coding-agent/src/core/keybindings.ts:75] [E: packages/coding-agent/src/core/keybindings.ts:76] [E: packages/coding-agent/src/core/keybindings.ts:90] [E: packages/coding-agent/src/core/keybindings.ts:233]。

本节点不逐项枚举全部默认键位;逐项 catalog 应由 [ref.coding-agent.default-keybindings](../../reference/default-keybindings.md) 覆盖 [I]。本节点也不定义 key press matching semantics;`KeybindingsManager` 继承自 pi-tui manager, matching 语义属于 [subsys.tui.keybinding-matching](../tui/keybinding-matching.md) [E: packages/coding-agent/src/core/keybindings.ts:366] [I]。

当前源码与 index 已统一到 `KEYBINDINGS`、`migrateKeybindingsConfig`、`KeybindingsManager`、`AppKeybindings` 和 `useWindowsKeybindings`;旧名 `DEFAULT_APP_KEYBINDINGS` / `DEFAULT_EDITOR_KEYBINDINGS` 已不再作为权威符号 [E: packages/coding-agent/src/core/keybindings.ts:14] [E: packages/coding-agent/src/core/keybindings.ts:61] [E: packages/coding-agent/src/core/keybindings.ts:74] [E: packages/coding-agent/src/core/keybindings.ts:315] [E: packages/coding-agent/src/core/keybindings.ts:366]。

## 关键文件

- `packages/coding-agent/src/core/keybindings.ts`: 本节点唯一 source;定义 `AppKeybindings` action namespace、合并后的 `KEYBINDINGS`、legacy migration map、config sanitizer、file loader 和 coding-agent `KeybindingsManager` subclass [E: packages/coding-agent/src/core/keybindings.ts:14] [E: packages/coding-agent/src/core/keybindings.ts:74] [E: packages/coding-agent/src/core/keybindings.ts:235] [E: packages/coding-agent/src/core/keybindings.ts:301] [E: packages/coding-agent/src/core/keybindings.ts:355] [E: packages/coding-agent/src/core/keybindings.ts:366]。

## 数据模型

`AppKeybindings` 是 coding-agent action id 的 TypeScript map, 每个 key 都是一个 `app.*` action, value 固定为 `true` 以参与接口合并 [E: packages/coding-agent/src/core/keybindings.ts:14] [E: packages/coding-agent/src/core/keybindings.ts:56]。`AppKeybinding` 是这些 action id 的 union type [E: packages/coding-agent/src/core/keybindings.ts:59]。模块通过 `declare module "@earendil-works/pi-tui"` 把 `AppKeybindings` 并入 pi-tui 的 `Keybindings` interface, 让 product actions 成为 TUI keybinding type system 可见的 action id [E: packages/coding-agent/src/core/keybindings.ts:68] [E: packages/coding-agent/src/core/keybindings.ts:69]。

`KEYBINDINGS` 是 `KeybindingDefinitions`;每个 action definition 至少包含 `defaultKeys` 和 `description`, 并通过 `as const satisfies KeybindingDefinitions` 做静态约束 [E: packages/coding-agent/src/core/keybindings.ts:74] [E: packages/coding-agent/src/core/keybindings.ts:92] [E: packages/coding-agent/src/core/keybindings.ts:233]。默认键可以是 string、string array 或空 array;例如 `app.tree.foldOrUp` 使用两个默认组合键, `app.session.new` 默认无快捷键 [E: packages/coding-agent/src/core/keybindings.ts:141] [E: packages/coding-agent/src/core/keybindings.ts:145] [E: packages/coding-agent/src/core/keybindings.ts:141]。

`useWindowsKeybindings()` 在 `win32` 或 WSL(`linux` + `WSL_DISTRO_NAME`/`WSL_INTEROP`)时为真 [E: packages/coding-agent/src/core/keybindings.ts:61] [E: packages/coding-agent/src/core/keybindings.ts:65]。少数默认键按它避让: `tui.editor.undo` 在 win32 用 `ctrl+z`、WSL 用 `alt+z`;alt-screen previous/next/search 在 Windows/WSL 去掉 `ctrl+shift` 组合;`app.model.cycleBackward` / `followUp` / `dequeue` / `pasteImage` 走 Windows/WSL 专用 chord [E: packages/coding-agent/src/core/keybindings.ts:78] [E: packages/coding-agent/src/core/keybindings.ts:82] [E: packages/coding-agent/src/core/keybindings.ts:86] [E: packages/coding-agent/src/core/keybindings.ts:90] [E: packages/coding-agent/src/core/keybindings.ts:108] [E: packages/coding-agent/src/core/keybindings.ts:130] [E: packages/coding-agent/src/core/keybindings.ts:134] [E: packages/coding-agent/src/core/keybindings.ts:138]。`app.suspend` 仍只在 native `win32` 默认禁用,WSL 保留 `ctrl+z` [E: packages/coding-agent/src/core/keybindings.ts:95] [E: packages/coding-agent/src/core/keybindings.ts:96]。

`KEYBINDING_NAME_MIGRATIONS` 是旧 action name 到新 namespaced action id 的迁移表, 覆盖旧 editor/select/input names 与旧 app names [E: packages/coding-agent/src/core/keybindings.ts:235] [E: packages/coding-agent/src/core/keybindings.ts:257] [E: packages/coding-agent/src/core/keybindings.ts:267] [E: packages/coding-agent/src/core/keybindings.ts:294]。这个表只迁移 key 名, 不解析或规范化 key chord 字符串本身 [E: packages/coding-agent/src/core/keybindings.ts:322] [E: packages/coding-agent/src/core/keybindings.ts:331] [I]。

`toKeybindingsConfig(value)` 接收 `Record<string, unknown>`: string binding 被保留为 `KeyId`, 全 string array 被保留为 `KeyId[]`, 其他 value 被忽略;它从不对非对象输入返回 `{}` [E: packages/coding-agent/src/core/keybindings.ts:301] [E: packages/coding-agent/src/core/keybindings.ts:303] [E: packages/coding-agent/src/core/keybindings.ts:304] [E: packages/coding-agent/src/core/keybindings.ts:308] [E: packages/coding-agent/src/core/keybindings.ts:309]。非对象 JSON 在 `loadRawConfig()` 被丢弃(`undefined`),随后 `loadFromFile()` 才返回 `{}` [E: packages/coding-agent/src/core/keybindings.ts:355] [E: packages/coding-agent/src/core/keybindings.ts:359] [E: packages/coding-agent/src/core/keybindings.ts:389] [E: packages/coding-agent/src/core/keybindings.ts:390] [E: packages/coding-agent/src/core/keybindings.ts:391]。

## 控制流

1. `KeybindingsManager.create(agentDir = getAgentDir())` 计算配置路径为 `<agentDir>/keybindings.json`, 读取 user bindings, 再构造 coding-agent manager [E: packages/coding-agent/src/core/keybindings.ts:374] [E: packages/coding-agent/src/core/keybindings.ts:375] [E: packages/coding-agent/src/core/keybindings.ts:376] [E: packages/coding-agent/src/core/keybindings.ts:377]。
2. `loadFromFile(path)` 调 `loadRawConfig(path)`;文件不存在、JSON parse 失败或 parse 结果不是 object 时返回空 user bindings [E: packages/coding-agent/src/core/keybindings.ts:355] [E: packages/coding-agent/src/core/keybindings.ts:356] [E: packages/coding-agent/src/core/keybindings.ts:358] [E: packages/coding-agent/src/core/keybindings.ts:360] [E: packages/coding-agent/src/core/keybindings.ts:361] [E: packages/coding-agent/src/core/keybindings.ts:389] [E: packages/coding-agent/src/core/keybindings.ts:391]。
3. 有 raw config 时, `loadFromFile` 先执行 `migrateKeybindingsConfig(rawConfig)`, 再把迁移后的 `config` 交给 `toKeybindingsConfig()` 做 value 级过滤 [E: packages/coding-agent/src/core/keybindings.ts:389] [E: packages/coding-agent/src/core/keybindings.ts:390] [E: packages/coding-agent/src/core/keybindings.ts:392]。
4. `migrateKeybindingsConfig(rawConfig)` 遍历原始 entries;如果 key 是 legacy name, 就替换为 `KEYBINDING_NAME_MIGRATIONS[key]`, 并把 `migrated` 标为 true [E: packages/coding-agent/src/core/keybindings.ts:315] [E: packages/coding-agent/src/core/keybindings.ts:322] [E: packages/coding-agent/src/core/keybindings.ts:323] [E: packages/coding-agent/src/core/keybindings.ts:324] [E: packages/coding-agent/src/core/keybindings.ts:325]。
5. 当 legacy key 和新 key 同时存在时, 迁移函数跳过 legacy value, 让显式的新 key 保持优先 [E: packages/coding-agent/src/core/keybindings.ts:327] [E: packages/coding-agent/src/core/keybindings.ts:328] [E: packages/coding-agent/src/core/keybindings.ts:329] [I]。
6. `orderKeybindingsConfig(config)` 先按 `Object.keys(KEYBINDINGS)` 的定义顺序输出已知 key, 再把未知 extra keys 排序追加, 因而迁移结果更稳定, 同时没有丢弃未知 keys [E: packages/coding-agent/src/core/keybindings.ts:337] [E: packages/coding-agent/src/core/keybindings.ts:339] [E: packages/coding-agent/src/core/keybindings.ts:345] [E: packages/coding-agent/src/core/keybindings.ts:346] [E: packages/coding-agent/src/core/keybindings.ts:347] [E: packages/coding-agent/src/core/keybindings.ts:348] [E: packages/coding-agent/src/core/keybindings.ts:349]。
7. `KeybindingsManager` constructor 调 `super(KEYBINDINGS, userBindings)` 把 merged definitions 和 user overrides 交给 pi-tui manager, 并记住 `configPath` 供 reload 使用 [E: packages/coding-agent/src/core/keybindings.ts:369] [E: packages/coding-agent/src/core/keybindings.ts:370] [E: packages/coding-agent/src/core/keybindings.ts:371]。
8. `reload()` 在存在 `configPath` 时重新读取文件并调用 `setUserBindings(...)`;`getEffectiveConfig()` 返回 pi-tui manager 的 `getResolvedBindings()` 结果 [E: packages/coding-agent/src/core/keybindings.ts:380] [E: packages/coding-agent/src/core/keybindings.ts:381] [E: packages/coding-agent/src/core/keybindings.ts:382] [E: packages/coding-agent/src/core/keybindings.ts:385] [E: packages/coding-agent/src/core/keybindings.ts:386]。

## 设计动机与权衡

keybinding action id 采用 namespaced strings, 如 `tui.editor.cursorUp`、`tui.input.submit`、`app.session.fork`, 这让 TUI 基础动作和 coding-agent 产品动作可以在同一个 manager 中并存 [E: packages/coding-agent/src/core/keybindings.ts:235] [E: packages/coding-agent/src/core/keybindings.ts:236] [E: packages/coding-agent/src/core/keybindings.ts:257] [E: packages/coding-agent/src/core/keybindings.ts:267] [I]。

迁移策略偏向 non-destructive compatibility: legacy key 会改名, 但如果用户已经写了新 key, 旧 key 不覆盖新 key;未知 keys 在排序后仍保留, 但后续 `toKeybindingsConfig()` 只接受 string 或 string array values [E: packages/coding-agent/src/core/keybindings.ts:327] [E: packages/coding-agent/src/core/keybindings.ts:331] [E: packages/coding-agent/src/core/keybindings.ts:345] [E: packages/coding-agent/src/core/keybindings.ts:349] [E: packages/coding-agent/src/core/keybindings.ts:304] [E: packages/coding-agent/src/core/keybindings.ts:308]。

读取配置时吞掉 JSON parse error 并返回空配置, 让坏的 `keybindings.json` 不阻止应用启动;代价是这个文件本身没有在此处产生诊断或错误提示 [E: packages/coding-agent/src/core/keybindings.ts:357] [E: packages/coding-agent/src/core/keybindings.ts:361] [E: packages/coding-agent/src/core/keybindings.ts:362] [I]。

## Gotcha

- `KEYBINDINGS` 内部允许相同默认 chord 出现在不同 action 上, 例如 `ctrl+p` 同时给 `app.model.cycleForward`、`app.session.togglePath` 和 `app.models.toggleProvider`;是否冲突取决于当前 UI context 与 pi-tui matching/dispatch 规则, 不是这个文件直接判定 [E: packages/coding-agent/src/core/keybindings.ts:103] [E: packages/coding-agent/src/core/keybindings.ts:104] [E: packages/coding-agent/src/core/keybindings.ts:161] [E: packages/coding-agent/src/core/keybindings.ts:162] [E: packages/coding-agent/src/core/keybindings.ts:193] [E: packages/coding-agent/src/core/keybindings.ts:194] [I]。
- `migrateKeybindingsConfig()` 返回 `migrated`, 但 `loadFromFile()` 只使用 `.config`, 因而当前读取路径不会自动把迁移后的 JSON 写回磁盘 [E: packages/coding-agent/src/core/keybindings.ts:315] [E: packages/coding-agent/src/core/keybindings.ts:317] [E: packages/coding-agent/src/core/keybindings.ts:392] [I]。
- `toKeybindingsConfig()` 只做 shape filtering, 不校验 action id 是否存在于 `KEYBINDINGS`;未知 action key 可以进入 user bindings object, 但是否有效取决于 pi-tui manager 的解析规则 [E: packages/coding-agent/src/core/keybindings.ts:303] [E: packages/coding-agent/src/core/keybindings.ts:305] [E: packages/coding-agent/src/core/keybindings.ts:309] [I]。
- `DEFAULT_APP_KEYBINDINGS` / `DEFAULT_EDITOR_KEYBINDINGS` 是旧 catalog 名称；当前默认表以 `KEYBINDINGS` 统一承载 TUI 与 app actions [E: packages/coding-agent/src/core/keybindings.ts:74] [I]。

## 跨包边界

[surface.config.keybindings](../../surface/config/keybindings.md) 应覆盖用户可见配置入口、文档语法和自定义体验;本节点只覆盖 source-level loading/migration/manager behavior [I]。

[ref.coding-agent.default-keybindings](../../reference/default-keybindings.md) 应逐项列出默认 keybinding catalog;本节点只解释 catalog 的生成来源是 `KEYBINDINGS = {...TUI_KEYBINDINGS, app defaults}` [E: packages/coding-agent/src/core/keybindings.ts:74] [E: packages/coding-agent/src/core/keybindings.ts:75]。

[subsys.tui.keybinding-matching](../tui/keybinding-matching.md) 是 pi-tui 的 matching 子系统;coding-agent 的 manager subclass 继承 `TuiKeybindingsManager`, 所以具体 key press 是否命中 action 由 TUI 层实现 [E: packages/coding-agent/src/core/keybindings.ts:7] [E: packages/coding-agent/src/core/keybindings.ts:366] [I]。

## Sources

- packages/coding-agent/src/core/keybindings.ts

## 相关

- [surface.config.keybindings](../../surface/config/keybindings.md): 用户可见的 keybindings 配置入口、文档语法和自定义说明。
- [ref.coding-agent.default-keybindings](../../reference/default-keybindings.md): 默认键位逐项 catalog, 包括 TUI defaults 与 coding-agent app defaults。
- [subsys.tui.keybinding-matching](../tui/keybinding-matching.md): pi-tui 的 key parsing、matching 和 resolved bindings 语义。
