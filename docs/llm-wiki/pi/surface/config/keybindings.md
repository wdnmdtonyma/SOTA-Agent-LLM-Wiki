---
id: surface.config.keybindings
title: 键位绑定与自定义
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/keybindings.ts
  - packages/coding-agent/docs/keybindings.md
  - packages/tui/src/keybindings.ts
  - packages/tui/src/keys.ts
  - packages/coding-agent/src/config.ts
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
symbols:
  - KEYBINDINGS
  - KeybindingsManager
  - migrateKeybindingsConfig
  - AppKeybindings
  - TUI_KEYBINDINGS
  - KeyId
related:
  - subsys.coding-agent.keybindings
  - ref.coding-agent.default-keybindings
  - subsys.tui.keybinding-matching
evidence: explicit
status: verified
updated: 5a073885
---

> `keybindings.json` 是 pi-coding-agent 的用户可见键位配置面:用户用 namespaced action id 覆盖默认快捷键,interactive mode 启动和 `/reload` 时把它读入同一个 app keybinding manager。

## 能回答的问题

- pi 的自定义键位文件放在哪里,默认路径和环境变量改写有什么关系?
- `keybindings.json` 的 JSON shape 是什么,单个快捷键和多个快捷键怎样写?
- action id 为什么是 `tui.*` 与 `app.*` 两类,默认键位从哪些源码表合并?
- 修改键位后怎样热加载,`/reload` 具体刷新哪一个 manager?
- legacy 的 `cursorUp`、`expandTools` 这类旧名字会怎样迁移?
- key format 文档、TypeScript `KeyId` 类型和终端支持之间有哪些边界?

## 用户入口

用户文档把所有 keyboard shortcuts 的配置入口写成 `~/.pi/agent/keybindings.json`,并说明每个 action 可以绑定一个或多个 keys [E: packages/coding-agent/docs/keybindings.md:3]。源码里的默认 agent config directory 由 `getAgentDir()` 返回 `homedir() + CONFIG_DIR_NAME + "agent"`,其中 `CONFIG_DIR_NAME` 来自包配置或默认 `.pi`,所以默认路径与用户文档的 `~/.pi/agent` 对齐 [E: packages/coding-agent/src/config.ts:491] [E: packages/coding-agent/src/config.ts:515] [E: packages/coding-agent/src/config.ts:520]。

`getAgentDir()` 先检查 `ENV_AGENT_DIR`,有值时展开 `~` 并直接返回,因此 `keybindings.json` 的实际目录可被 agent-dir 环境变量改写;`ENV_AGENT_DIR` 的名字由 `APP_NAME.toUpperCase()` 拼出,当前源码形态是 product app name 加 `_CODING_AGENT_DIR` [E: packages/coding-agent/src/config.ts:495] [E: packages/coding-agent/src/config.ts:516] [E: packages/coding-agent/src/config.ts:518] [I]。

## 配置语法

`keybindings.json` 是一个 object:键是 namespaced keybinding id,值是一个 key string 或 key string array;用户文档的例子把 `tui.editor.cursorUp` 绑定到 `["up", "ctrl+p"]`,把 `tui.editor.deleteWordBackward` 绑定到 `["ctrl+w", "alt+backspace"]` [E: packages/coding-agent/docs/keybindings.md:156] [E: packages/coding-agent/docs/keybindings.md:160] [E: packages/coding-agent/docs/keybindings.md:162]。文档也明确说 user config overrides defaults [E: packages/coding-agent/docs/keybindings.md:166]。

源码的 sanitizer 与文档 shape 对齐:`toKeybindingsConfig(value)` 只接受 object;每个 entry 的 value 若是 string 就保留为 `KeyId`,若是全 string array 就保留为 `KeyId[]`,其它 value 被忽略 [E: packages/coding-agent/src/core/keybindings.ts:274] [E: packages/coding-agent/src/core/keybindings.ts:275] [E: packages/coding-agent/src/core/keybindings.ts:279] [E: packages/coding-agent/src/core/keybindings.ts:283]。这个过滤只检查 value shape,不校验 action id 是否存在于 `KEYBINDINGS`,未知 action id 能进入 user bindings object,但 pi-tui manager 在 rebuild 时只对 definitions 中存在的 id 建立有效按键映射 [E: packages/coding-agent/src/core/keybindings.ts:278] [E: packages/tui/src/keybindings.ts:172] [E: packages/tui/src/keybindings.ts:173] [E: packages/tui/src/keybindings.ts:187] [I]。

## Action id 与默认表

配置文件使用 pi 内部和 extension API 共同使用的 namespaced keybinding ids [E: packages/coding-agent/docs/keybindings.md:5]。`tui.*` action 来自 pi-tui 的 `TUI_KEYBINDINGS`,覆盖编辑器、输入框和通用选择列表;`app.*` action 来自 pi-coding-agent 的 `AppKeybindings` 与 `KEYBINDINGS` 追加项,覆盖取消、清屏、模型切换、会话树、session 操作和 scoped models selector 等产品动作 [E: packages/tui/src/keybindings.ts:54] [E: packages/tui/src/keybindings.ts:134] [E: packages/coding-agent/src/core/keybindings.ts:13] [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:64]。

`KEYBINDINGS` 是 surface 层默认键位的合并表:它先展开 `TUI_KEYBINDINGS`,再在同一个 object 中声明 `app.interrupt`、`app.clear`、`app.model.cycleForward`、`app.session.togglePath` 等 app actions,最后用 `satisfies KeybindingDefinitions` 做静态约束 [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:65] [E: packages/coding-agent/src/core/keybindings.ts:76] [E: packages/coding-agent/src/core/keybindings.ts:130] [E: packages/coding-agent/src/core/keybindings.ts:202]。

本节点不逐项列出所有默认键位;逐项 catalog 应由 [ref.coding-agent.default-keybindings](../../reference/default-keybindings.md) 覆盖 [I]。当前 `index.json` 计划的 `DEFAULT_APP_KEYBINDINGS` / `DEFAULT_EDITOR_KEYBINDINGS` 不是 `packages/coding-agent/src/core/keybindings.ts` 的当前导出符号;当前可核导出是 `KEYBINDINGS`、`migrateKeybindingsConfig`、`KeybindingsManager` 和类型 re-export [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:290] [E: packages/coding-agent/src/core/keybindings.ts:340] [E: packages/coding-agent/src/core/keybindings.ts:370] [U]。

## Key format

用户文档承诺的 key string 形态是 `modifier+key`;文档列出的 modifier 是 `ctrl`、`shift`、`alt`,可组合成 `ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x` 等 [E: packages/coding-agent/docs/keybindings.md:13] [E: packages/coding-agent/docs/keybindings.md:21]。可写的 base key 包括 `a-z`、`0-9`、一批 special key、`f1`-`f12` 和 symbols [E: packages/coding-agent/docs/keybindings.md:15] [E: packages/coding-agent/docs/keybindings.md:17] [E: packages/coding-agent/docs/keybindings.md:18] [E: packages/coding-agent/docs/keybindings.md:19]。

pi-tui 的 `KeyId` 类型还包含 `super` modifier,并且 `MODIFIERS` 常量也有 `super: 8`;但 `packages/coding-agent/docs/keybindings.md` 的用户文档没有把 `super` 列为支持的 modifier,所以 surface 文档不应把 `super` 当作稳定用户承诺 [E: packages/tui/src/keys.ts:142] [E: packages/tui/src/keys.ts:152] [E: packages/tui/src/keys.ts:292] [E: packages/tui/src/keys.ts:296] [U]。

## 读取、覆盖与冲突

interactive mode 构造时调用 `KeybindingsManager.create()` 并把返回值注入全局 TUI keybindings,随后默认 editor 和其它组件复用同一个 manager [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:411] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:412] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:415]。`KeybindingsManager.create(agentDir = getAgentDir())` 把配置路径拼成 `<agentDir>/keybindings.json`,读取 user bindings 后构造 coding-agent manager [E: packages/coding-agent/src/core/keybindings.ts:348] [E: packages/coding-agent/src/core/keybindings.ts:349] [E: packages/coding-agent/src/core/keybindings.ts:350] [E: packages/coding-agent/src/core/keybindings.ts:351]。

文件读取失败、文件不存在、JSON parse 失败或 parse 后不是 object 时,`loadRawConfig()` 返回 `undefined`,最终 user bindings 变成空 object;这意味着坏的 `keybindings.json` 不会阻止启动,但当前读取函数本身不产生诊断 [E: packages/coding-agent/src/core/keybindings.ts:330] [E: packages/coding-agent/src/core/keybindings.ts:331] [E: packages/coding-agent/src/core/keybindings.ts:333] [E: packages/coding-agent/src/core/keybindings.ts:334] [E: packages/coding-agent/src/core/keybindings.ts:336] [E: packages/coding-agent/src/core/keybindings.ts:365] [I]。

pi-tui manager 的覆盖语义是:每个 definition 若没有 user value 就使用 `definition.defaultKeys`,若有 user value 就使用 user keys;因此在同一 action id 上,用户配置替代默认键,不是与默认键追加合并 [E: packages/tui/src/keybindings.ts:187] [E: packages/tui/src/keybindings.ts:188] [E: packages/tui/src/keybindings.ts:189]。冲突检测只统计 user bindings 中多个已知 action claim 同一个 key 的情况,把它们加入 `conflicts`;当前 surface 节点只确认 manager 能计算冲突,不确认 interactive UI 一定展示这些冲突 [E: packages/tui/src/keybindings.ts:171] [E: packages/tui/src/keybindings.ts:181] [E: packages/tui/src/keybindings.ts:183] [E: packages/tui/src/keybindings.ts:211] [I]。

## Reload 与迁移

用户文档说编辑 `keybindings.json` 后运行 `/reload` 可在不重启 session 的情况下应用变更 [E: packages/coding-agent/docs/keybindings.md:9]。内置 slash command 列表包含 `reload`,说明是 Reload keybindings、extensions、skills、prompts 和 themes [E: packages/coding-agent/src/core/slash-commands.ts:39]。interactive mode 收到文本 `/reload` 时调用 `handleReloadCommand()`,该流程在 session reload 后执行 `this.keybindings.reload()` [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2642] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:2644] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5098] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:5101]。

`KeybindingsManager.reload()` 在有 `configPath` 时重新读取配置文件并调用 `setUserBindings(...)`;`getEffectiveConfig()` 返回 pi-tui manager 的 resolved bindings,extension shortcut 和 UI hint 可以基于这个 effective config 渲染用户实际按键 [E: packages/coding-agent/src/core/keybindings.ts:354] [E: packages/coding-agent/src/core/keybindings.ts:356] [E: packages/coding-agent/src/core/keybindings.ts:359] [E: packages/coding-agent/src/core/keybindings.ts:360] [I]。

旧配置会自动迁移到 namespaced action id:用户文档点名旧的 `cursorUp` 或 `expandTools` 会在启动时迁移 [E: packages/coding-agent/docs/keybindings.md:7]。源码的 `KEYBINDING_NAME_MIGRATIONS` 把旧 editor/select/input names 映射到 `tui.*`,把旧 app names 映射到 `app.*`;`migrateKeybindingsConfig()` 遍历 raw entries,如果发现 legacy name 就替换 key,并在新旧 key 同时存在时跳过旧 value 以保留显式新 key [E: packages/coding-agent/src/core/keybindings.ts:204] [E: packages/coding-agent/src/core/keybindings.ts:226] [E: packages/coding-agent/src/core/keybindings.ts:236] [E: packages/coding-agent/src/core/keybindings.ts:290] [E: packages/coding-agent/src/core/keybindings.ts:297] [E: packages/coding-agent/src/core/keybindings.ts:302] [I]。

当前读取路径只使用 `migrateKeybindingsConfig(rawConfig).config`,没有把迁移后的 JSON 写回磁盘;因此迁移影响运行时读取结果,不等价于自动格式化用户文件 [E: packages/coding-agent/src/core/keybindings.ts:363] [E: packages/coding-agent/src/core/keybindings.ts:366] [I]。

## 跨包关系

[subsys.coding-agent.keybindings](../../subsystems/coding-agent/keybindings.md) 是同一功能的实现节点:它覆盖 `KEYBINDINGS`、legacy migration、config sanitizer、file loader 和 coding-agent `KeybindingsManager` subclass 的 source-level 行为;本 surface 节点覆盖用户如何写 `keybindings.json` 以及 `/reload` 怎样应用 [I]。

[ref.coding-agent.default-keybindings](../../reference/default-keybindings.md) 应逐项列出默认 action id、默认键和描述;本 surface 节点只解释默认表来自 `TUI_KEYBINDINGS` 与 app action definitions 的合并 [E: packages/coding-agent/src/core/keybindings.ts:63] [E: packages/coding-agent/src/core/keybindings.ts:64] [I]。

[subsys.tui.keybinding-matching](../../subsystems/tui/keybinding-matching.md) 应覆盖 `matchesKey(data, keyId)`、Kitty keyboard protocol、legacy terminal sequences 和 resolved bindings 的匹配语义;coding-agent manager 继承 pi-tui manager,所以按键字节流是否命中 action 不是本 surface 节点的权威范围 [E: packages/coding-agent/src/core/keybindings.ts:7] [E: packages/coding-agent/src/core/keybindings.ts:340] [I]。

## Sources

- packages/coding-agent/src/core/keybindings.ts
- packages/coding-agent/docs/keybindings.md
- packages/tui/src/keybindings.ts
- packages/tui/src/keys.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/core/slash-commands.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts

## 相关

- [subsys.coding-agent.keybindings](../../subsystems/coding-agent/keybindings.md): keybinding definitions、config loading、legacy migration 和 coding-agent manager subclass。
- [ref.coding-agent.default-keybindings](../../reference/default-keybindings.md): 默认键位逐项 catalog。
- [subsys.tui.keybinding-matching](../../subsystems/tui/keybinding-matching.md): pi-tui 的 key parsing、matching 和 resolved bindings 语义。
