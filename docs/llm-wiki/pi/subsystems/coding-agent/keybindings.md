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
related:
  - surface.config.keybindings
  - ref.coding-agent.default-keybindings
  - subsys.tui.keybinding-matching
evidence: explicit
status: verified
updated: 5a073885
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

`packages/coding-agent/src/core/keybindings.ts` 只负责 coding-agent 层的 keybinding definitions、config loading、legacy migration 和 manager subclass; 它导入 pi-tui 的 `TUI_KEYBINDINGS` 与 `KeybindingsManager` 并复用底层匹配实现 [E: packages/coding-agent/src/core/keybindings.ts:6] [E: packages/coding-agent/src/core/keybindings.ts:7] [E: packages/coding-agent/src/core/keybindings.ts:8]。`KEYBINDINGS` 先展开 `TUI_KEYBINDINGS`, 再追加 `app.*` product actions, 因而 coding-agent 的默认键位表是 TUI defaults + app defaults 的组合 [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:64] [E: packages/coding-agent/src/core/keybindings.ts:202]。

本节点不逐项枚举全部默认键位;逐项 catalog 应由 [ref.coding-agent.default-keybindings](../../reference/default-keybindings.md) 覆盖 [I]。本节点也不定义 key press matching semantics;`KeybindingsManager` 继承自 pi-tui manager, matching 语义属于 [subsys.tui.keybinding-matching](../tui/keybinding-matching.md) [E: packages/coding-agent/src/core/keybindings.ts:340] [I]。

当前 `5a073885` 源码没有导出 index 里计划的 `DEFAULT_APP_KEYBINDINGS` 或 `DEFAULT_EDITOR_KEYBINDINGS`;可核导出是 `KEYBINDINGS`、`migrateKeybindingsConfig`、`KeybindingsManager` 以及若干类型 re-export [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:290] [E: packages/coding-agent/src/core/keybindings.ts:340] [E: packages/coding-agent/src/core/keybindings.ts:370] [U]。

## 关键文件

- `packages/coding-agent/src/core/keybindings.ts`: 本节点唯一 source;定义 `AppKeybindings` action namespace、合并后的 `KEYBINDINGS`、legacy migration map、config sanitizer、file loader 和 coding-agent `KeybindingsManager` subclass [E: packages/coding-agent/src/core/keybindings.ts:13] [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:204] [E: packages/coding-agent/src/core/keybindings.ts:274] [E: packages/coding-agent/src/core/keybindings.ts:330] [E: packages/coding-agent/src/core/keybindings.ts:340]。

## 数据模型

`AppKeybindings` 是 coding-agent action id 的 TypeScript map, 每个 key 都是一个 `app.*` action, value 固定为 `true` 以参与接口合并 [E: packages/coding-agent/src/core/keybindings.ts:13] [E: packages/coding-agent/src/core/keybindings.ts:54]。`AppKeybinding` 是这些 action id 的 union type [E: packages/coding-agent/src/core/keybindings.ts:57]。模块通过 `declare module "@earendil-works/pi-tui"` 把 `AppKeybindings` 并入 pi-tui 的 `Keybindings` interface, 让 product actions 成为 TUI keybinding type system 可见的 action id [E: packages/coding-agent/src/core/keybindings.ts:59] [E: packages/coding-agent/src/core/keybindings.ts:60]。

`KEYBINDINGS` 是 `KeybindingDefinitions`;每个 action definition 至少包含 `defaultKeys` 和 `description`, 并通过 `as const satisfies KeybindingDefinitions` 做静态约束 [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:65] [E: packages/coding-agent/src/core/keybindings.ts:202]。默认键可以是 string、string array 或空 array;例如 `app.tree.foldOrUp` 使用两个默认组合键, `app.session.new` 默认无快捷键 [E: packages/coding-agent/src/core/keybindings.ts:110] [E: packages/coding-agent/src/core/keybindings.ts:114] [E: packages/coding-agent/src/core/keybindings.ts:115]。

少数默认键按 platform 分支: `app.suspend` 在 Windows 上默认禁用, 非 Windows 使用 `ctrl+z`;`app.clipboard.pasteImage` 在 Windows 上用 `alt+v`, 其他平台用 `ctrl+v` [E: packages/coding-agent/src/core/keybindings.ts:68] [E: packages/coding-agent/src/core/keybindings.ts:69] [E: packages/coding-agent/src/core/keybindings.ts:106] [E: packages/coding-agent/src/core/keybindings.ts:107]。

`KEYBINDING_NAME_MIGRATIONS` 是旧 action name 到新 namespaced action id 的迁移表, 覆盖旧 editor/select/input names 与旧 app names [E: packages/coding-agent/src/core/keybindings.ts:204] [E: packages/coding-agent/src/core/keybindings.ts:226] [E: packages/coding-agent/src/core/keybindings.ts:236] [E: packages/coding-agent/src/core/keybindings.ts:263]。这个表只迁移 key 名, 不解析或规范化 key chord 字符串本身 [E: packages/coding-agent/src/core/keybindings.ts:297] [E: packages/coding-agent/src/core/keybindings.ts:306] [I]。

`toKeybindingsConfig(value)` 是 user config sanitizer: 非对象输入返回 `{}`, string binding 被保留为 `KeyId`, 全 string array 被保留为 `KeyId[]`, 其他值被忽略 [E: packages/coding-agent/src/core/keybindings.ts:274] [E: packages/coding-agent/src/core/keybindings.ts:275] [E: packages/coding-agent/src/core/keybindings.ts:279] [E: packages/coding-agent/src/core/keybindings.ts:280] [E: packages/coding-agent/src/core/keybindings.ts:283] [E: packages/coding-agent/src/core/keybindings.ts:284]。

## 控制流

1. `KeybindingsManager.create(agentDir = getAgentDir())` 计算配置路径为 `<agentDir>/keybindings.json`, 读取 user bindings, 再构造 coding-agent manager [E: packages/coding-agent/src/core/keybindings.ts:348] [E: packages/coding-agent/src/core/keybindings.ts:349] [E: packages/coding-agent/src/core/keybindings.ts:350] [E: packages/coding-agent/src/core/keybindings.ts:351]。
2. `loadFromFile(path)` 调 `loadRawConfig(path)`;文件不存在、JSON parse 失败或 parse 结果不是 object 时返回空 user bindings [E: packages/coding-agent/src/core/keybindings.ts:330] [E: packages/coding-agent/src/core/keybindings.ts:331] [E: packages/coding-agent/src/core/keybindings.ts:333] [E: packages/coding-agent/src/core/keybindings.ts:334] [E: packages/coding-agent/src/core/keybindings.ts:335] [E: packages/coding-agent/src/core/keybindings.ts:363] [E: packages/coding-agent/src/core/keybindings.ts:365]。
3. 有 raw config 时, `loadFromFile` 先执行 `migrateKeybindingsConfig(rawConfig)`, 再把迁移后的 `config` 交给 `toKeybindingsConfig()` 做 value 级过滤 [E: packages/coding-agent/src/core/keybindings.ts:363] [E: packages/coding-agent/src/core/keybindings.ts:364] [E: packages/coding-agent/src/core/keybindings.ts:366]。
4. `migrateKeybindingsConfig(rawConfig)` 遍历原始 entries;如果 key 是 legacy name, 就替换为 `KEYBINDING_NAME_MIGRATIONS[key]`, 并把 `migrated` 标为 true [E: packages/coding-agent/src/core/keybindings.ts:290] [E: packages/coding-agent/src/core/keybindings.ts:297] [E: packages/coding-agent/src/core/keybindings.ts:298] [E: packages/coding-agent/src/core/keybindings.ts:299] [E: packages/coding-agent/src/core/keybindings.ts:300]。
5. 当 legacy key 和新 key 同时存在时, 迁移函数跳过 legacy value, 让显式的新 key 保持优先 [E: packages/coding-agent/src/core/keybindings.ts:302] [E: packages/coding-agent/src/core/keybindings.ts:303] [E: packages/coding-agent/src/core/keybindings.ts:304] [I]。
6. `orderKeybindingsConfig(config)` 先按 `Object.keys(KEYBINDINGS)` 的定义顺序输出已知 key, 再把未知 extra keys 排序追加, 因而迁移结果更稳定, 同时没有丢弃未知 keys [E: packages/coding-agent/src/core/keybindings.ts:312] [E: packages/coding-agent/src/core/keybindings.ts:314] [E: packages/coding-agent/src/core/keybindings.ts:320] [E: packages/coding-agent/src/core/keybindings.ts:321] [E: packages/coding-agent/src/core/keybindings.ts:322] [E: packages/coding-agent/src/core/keybindings.ts:323] [E: packages/coding-agent/src/core/keybindings.ts:324]。
7. `KeybindingsManager` constructor 调 `super(KEYBINDINGS, userBindings)` 把 merged definitions 和 user overrides 交给 pi-tui manager, 并记住 `configPath` 供 reload 使用 [E: packages/coding-agent/src/core/keybindings.ts:343] [E: packages/coding-agent/src/core/keybindings.ts:344] [E: packages/coding-agent/src/core/keybindings.ts:345]。
8. `reload()` 在存在 `configPath` 时重新读取文件并调用 `setUserBindings(...)`;`getEffectiveConfig()` 返回 pi-tui manager 的 `getResolvedBindings()` 结果 [E: packages/coding-agent/src/core/keybindings.ts:354] [E: packages/coding-agent/src/core/keybindings.ts:355] [E: packages/coding-agent/src/core/keybindings.ts:356] [E: packages/coding-agent/src/core/keybindings.ts:359] [E: packages/coding-agent/src/core/keybindings.ts:360]。

## 设计动机与权衡

keybinding action id 采用 namespaced strings, 如 `tui.editor.cursorUp`、`tui.input.submit`、`app.session.fork`, 这让 TUI 基础动作和 coding-agent 产品动作可以在同一个 manager 中并存 [E: packages/coding-agent/src/core/keybindings.ts:204] [E: packages/coding-agent/src/core/keybindings.ts:205] [E: packages/coding-agent/src/core/keybindings.ts:226] [E: packages/coding-agent/src/core/keybindings.ts:236] [I]。

迁移策略偏向 non-destructive compatibility: legacy key 会改名, 但如果用户已经写了新 key, 旧 key 不覆盖新 key;未知 keys 在排序后仍保留, 但后续 `toKeybindingsConfig()` 只接受 string 或 string array values [E: packages/coding-agent/src/core/keybindings.ts:302] [E: packages/coding-agent/src/core/keybindings.ts:306] [E: packages/coding-agent/src/core/keybindings.ts:320] [E: packages/coding-agent/src/core/keybindings.ts:324] [E: packages/coding-agent/src/core/keybindings.ts:279] [E: packages/coding-agent/src/core/keybindings.ts:283]。

读取配置时吞掉 JSON parse error 并返回空配置, 让坏的 `keybindings.json` 不阻止应用启动;代价是这个文件本身没有在此处产生诊断或错误提示 [E: packages/coding-agent/src/core/keybindings.ts:332] [E: packages/coding-agent/src/core/keybindings.ts:335] [E: packages/coding-agent/src/core/keybindings.ts:336] [I]。

## Gotcha

- `KEYBINDINGS` 内部允许相同默认 chord 出现在不同 action 上, 例如 `ctrl+p` 同时给 `app.model.cycleForward`、`app.session.togglePath` 和 `app.models.toggleProvider`;是否冲突取决于当前 UI context 与 pi-tui matching/dispatch 规则, 不是这个文件直接判定 [E: packages/coding-agent/src/core/keybindings.ts:76] [E: packages/coding-agent/src/core/keybindings.ts:77] [E: packages/coding-agent/src/core/keybindings.ts:130] [E: packages/coding-agent/src/core/keybindings.ts:131] [E: packages/coding-agent/src/core/keybindings.ts:162] [E: packages/coding-agent/src/core/keybindings.ts:163] [I]。
- `migrateKeybindingsConfig()` 返回 `migrated`, 但 `loadFromFile()` 只使用 `.config`, 因而当前读取路径不会自动把迁移后的 JSON 写回磁盘 [E: packages/coding-agent/src/core/keybindings.ts:290] [E: packages/coding-agent/src/core/keybindings.ts:292] [E: packages/coding-agent/src/core/keybindings.ts:366] [I]。
- `toKeybindingsConfig()` 只做 shape filtering, 不校验 action id 是否存在于 `KEYBINDINGS`;未知 action key 可以进入 user bindings object, 但是否有效取决于 pi-tui manager 的解析规则 [E: packages/coding-agent/src/core/keybindings.ts:278] [E: packages/coding-agent/src/core/keybindings.ts:280] [E: packages/coding-agent/src/core/keybindings.ts:284] [I]。
- index.json 的 planned symbols 与当前源码不一致: `DEFAULT_APP_KEYBINDINGS` / `DEFAULT_EDITOR_KEYBINDINGS` 未在 source 中出现 [U]。

## 跨包边界

[surface.config.keybindings](../../surface/config/keybindings.md) 应覆盖用户可见配置入口、文档语法和自定义体验;本节点只覆盖 source-level loading/migration/manager behavior [I]。

[ref.coding-agent.default-keybindings](../../reference/default-keybindings.md) 应逐项列出默认 keybinding catalog;本节点只解释 catalog 的生成来源是 `KEYBINDINGS = {...TUI_KEYBINDINGS, app defaults}` [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:64]。

[subsys.tui.keybinding-matching](../tui/keybinding-matching.md) 是 pi-tui 的 matching 子系统;coding-agent 的 manager subclass 继承 `TuiKeybindingsManager`, 所以具体 key press 是否命中 action 由 TUI 层实现 [E: packages/coding-agent/src/core/keybindings.ts:7] [E: packages/coding-agent/src/core/keybindings.ts:340] [I]。

## Sources

- packages/coding-agent/src/core/keybindings.ts

## 相关

- [surface.config.keybindings](../../surface/config/keybindings.md): 用户可见的 keybindings 配置入口、文档语法和自定义说明。
- [ref.coding-agent.default-keybindings](../../reference/default-keybindings.md): 默认键位逐项 catalog, 包括 TUI defaults 与 coding-agent app defaults。
- [subsys.tui.keybinding-matching](../tui/keybinding-matching.md): pi-tui 的 key parsing、matching 和 resolved bindings 语义。
