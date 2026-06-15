---
id: subsys.ui-components
path: subsystems/ui-components.md
title: UI 组件族
kind: subsystem
tier: T2
source: [components/, screens/]
symbols: [REPL, PromptInput, Messages, VirtualMessageList, Config]
related: [group.ui-families]
status: verified
evidence: explicit
updated: 2026-06-14
---

> UI 组件族是 Claude Code 的 Ink/React application layer: `screens/REPL.tsx` 编排主循环界面, `components/` 提供 prompt、message transcript、settings、permissions、stats、MCP、design-system 等 UI 家族。[E: screens/REPL.tsx:4548][E: screens/REPL.tsx:4570][E: screens/REPL.tsx:4903][E: components/PromptInput/PromptInput.tsx:194][E: components/Messages.tsx:207]

## 能回答的问题

- 主 REPL 屏幕由哪些大型组件组成?
- PromptInput 为什么是巨型组件, 它聚合了哪些输入能力?
- transcript 如何在普通 render 与 virtualized render 之间切换?
- settings、permissions、stats 等 UI 家族各自承担什么职责?

## 职责边界

`screens/REPL.tsx` 是 top-level screen, 它把 messages、prompt input、permission request、elicitation dialog、message selector、keybinding setup、alternate screen 和 scroll handler 汇合到一个 terminal application shell。[E: screens/REPL.tsx:4519][E: screens/REPL.tsx:4548][E: screens/REPL.tsx:4561][E: screens/REPL.tsx:4570][E: screens/REPL.tsx:4721][E: screens/REPL.tsx:4903][E: screens/REPL.tsx:4911][E: screens/REPL.tsx:5000] `components/` 的职责是把这些区域拆成可复用 family, 但很多 family 仍然包含深业务逻辑, 不是纯 presentational widgets。[I]

本页按族和巨型组件讲解, 不逐个枚举所有 component 文件; 组件目录数量很大, 权威枚举应由后续 `group.ui-families` 承接。[I]

## 关键文件

- `screens/REPL.tsx`: 主屏幕, 连接 messages、prompt、cost hook、global keybindings、alternate screen 和 dialogs。[E: screens/REPL.tsx:3823][E: screens/REPL.tsx:4550][E: screens/REPL.tsx:4570][E: screens/REPL.tsx:4903][E: screens/REPL.tsx:5000]
- `components/PromptInput/PromptInput.tsx`: prompt line editor facade, 聚合 keybindings、text input/Vim input、image paste、suggestions、history、external editor、model picker 和 footer 状态。[E: components/PromptInput/PromptInput.tsx:357][E: components/PromptInput/PromptInput.tsx:405][E: components/PromptInput/PromptInput.tsx:406][E: components/PromptInput/PromptInput.tsx:514][E: components/PromptInput/PromptInput.tsx:1151][E: components/PromptInput/PromptInput.tsx:1660][E: components/PromptInput/PromptInput.tsx:1742][E: components/PromptInput/PromptInput.tsx:2064][E: components/PromptInput/PromptInput.tsx:2243]
- `components/Messages.tsx` 与 `components/VirtualMessageList.tsx`: transcript 数据转换、message grouping、render row 和 virtualization。[E: components/Messages.tsx:461][E: components/Messages.tsx:481][E: components/VirtualMessageList.tsx:325]
- `components/Settings/Config.tsx`: terminal settings surface, 聚合 global config、settings files、AppState、per-source snapshots、search、save/revert 和 keybindings。[E: components/Settings/Config.tsx:99][E: components/Settings/Config.tsx:101][E: components/Settings/Config.tsx:137][E: components/Settings/Config.tsx:1253]
- `components/permissions/PermissionRequest.tsx` 与 `components/permissions/rules/PermissionRuleList.tsx`: tool permission prompt 与 rule management UI。[E: components/permissions/PermissionRequest.tsx:47][E: components/permissions/rules/PermissionRuleList.tsx:473]
- `components/design-system/Tabs.tsx`, `components/CustomSelect/select.tsx`, `components/Stats.tsx`: design-system controls、select/picker control 和 usage stats screen。[E: components/design-system/Tabs.tsx:66][E: components/CustomSelect/select.tsx:192][E: components/Stats.tsx:82]

## 数据模型

UI 层的数据模型不是单个 store; 它由 screen props、AppState hook、config/settings snapshots、message arrays、scroll handles、keybinding contexts 和 local component state 共同组成。[I] `REPL` 把 `PromptInput`、message actions 和 full-screen alternate screen wrapping 放在同一个 render tree 中。[E: screens/REPL.tsx:4903][E: screens/REPL.tsx:4908][E: screens/REPL.tsx:5000]

transcript 侧先在 `Messages` 中计算 normalized messages、thinking visibility、streaming tool state、compact-aware ordering 和 render slice; 是否进入 `VirtualMessageList` 由 `scrollRef` 存在且未禁用 virtual scroll 决定。[E: components/Messages.tsx:379][E: components/Messages.tsx:382][E: components/Messages.tsx:445][E: components/Messages.tsx:466][E: components/Messages.tsx:540][E: components/Messages.tsx:699] virtual list 以 message keys 和 terminal columns 调用 `useVirtualScroll`, 并向外暴露 jump/search handle。[E: components/VirtualMessageList.tsx:312][E: components/VirtualMessageList.tsx:325][E: components/VirtualMessageList.tsx:340]

## 控制流

1. `REPL` 接收用户输入时进入 `onSubmit`, 先做 scroll repin 和 immediate command 分支, 再把正常 prompt 送入聊天流程。[E: screens/REPL.tsx:3142][E: screens/REPL.tsx:3151][E: screens/REPL.tsx:3161]
2. `PromptInput` 内部先做 token/slash/member/image 等 highlight 与 suggestion pipeline, 再在 submit 时处理 footer selection、image attachment、direct teammate message、empty input 和 suggestion dropdown。[E: components/PromptInput/PromptInput.tsx:514][E: components/PromptInput/PromptInput.tsx:519][E: components/PromptInput/PromptInput.tsx:526][E: components/PromptInput/PromptInput.tsx:534][E: components/PromptInput/PromptInput.tsx:541][E: components/PromptInput/PromptInput.tsx:581][E: components/PromptInput/PromptInput.tsx:601][E: components/PromptInput/PromptInput.tsx:993][E: components/PromptInput/PromptInput.tsx:1000][E: components/PromptInput/PromptInput.tsx:1005][E: components/PromptInput/PromptInput.tsx:1042][E: components/PromptInput/PromptInput.tsx:1067][E: components/PromptInput/PromptInput.tsx:1074]
3. image paste 通过 `onImagePaste` 记录 analytics、创建 `PastedContent`、写入缓存/内容集合, 然后把 `[Image #N]` 插入 prompt text。[E: components/PromptInput/PromptInput.tsx:1151][E: components/PromptInput/PromptInput.tsx:1155][E: components/PromptInput/PromptInput.tsx:1167][E: components/PromptInput/PromptInput.tsx:1173][E: components/PromptInput/PromptInput.tsx:1181]
4. text paste 会 strip ANSI、normalize CR/tab, 并把长 paste 变成 collapsed reference, 防止 prompt line 直接承载大块内容。[E: components/PromptInput/PromptInput.tsx:1201][E: components/PromptInput/PromptInput.tsx:1204][E: components/PromptInput/PromptInput.tsx:1224][E: components/PromptInput/PromptInput.tsx:1235]
5. full-screen 模式下, `REPL` 把整个 main return 包进 `AlternateScreen`, 使 UI 进入 terminal alternate buffer。[E: screens/REPL.tsx:4999]

## 设计动机与权衡

巨型组件的主要原因是 terminal UI 的输入、快捷键、滚动、弹层和业务状态强耦合在同一 frame loop 内。[I] `PromptInput` 同时注册 `chat:submit` keybinding、局部 chat handlers、footer keybindings 和 raw `useInput` escape handling, 说明 prompt 区域既是文本编辑器也是 command router。[E: components/PromptInput/PromptInput.tsx:1646][E: components/PromptInput/PromptInput.tsx:1660][E: components/PromptInput/PromptInput.tsx:1670][E: components/PromptInput/PromptInput.tsx:1742][E: components/PromptInput/PromptInput.tsx:1865]

transcript 的 virtualized render 由 runtime gate 选择, 进入 virtual path 后 `useVirtualScroll` 控制 visible window、search jump 和 selected index keep-visible。[E: components/Messages.tsx:466][E: components/Messages.tsx:699][E: components/VirtualMessageList.tsx:325][E: components/VirtualMessageList.tsx:406][E: components/VirtualMessageList.tsx:609]

## Gotcha

- 不要把 `components/design-system` 理解成全 UI 的唯一抽象层; settings、prompt、messages、permissions 都有大量业务逻辑在各自 family 内。[E: components/Settings/Config.tsx:264][E: components/PromptInput/PromptInput.tsx:993][E: components/PromptInput/PromptInput.tsx:1005][E: components/PromptInput/PromptInput.tsx:1042][E: components/Messages.tsx:496][E: components/Messages.tsx:514][E: components/Messages.tsx:520][E: components/permissions/PermissionRequest.tsx:47][E: components/permissions/PermissionRequest.tsx:193][I]
- `Messages` 与 `VirtualMessageList` 的边界主要是 render strategy 边界; message row 语义仍在 `Messages`/`MessageRow` 管线中形成。[E: components/Messages.tsx:699][E: components/Messages.tsx:700][E: components/Messages.tsx:701][E: components/MessageRow.tsx:93][I]
- `REPL` 的 full-screen wrapping 在 render tail, 所以检查 alternate screen 行为时要看 screen 层, 不能只看 `PromptInput` 或 transcript 子组件。[E: screens/REPL.tsx:4999][E: screens/REPL.tsx:5000]

## Sources

- `components/`
- `screens/`
- `screens/REPL.tsx`
- `components/PromptInput/PromptInput.tsx`
- `components/Messages.tsx`
- `components/VirtualMessageList.tsx`
- `components/MessageRow.tsx`
- `components/Settings/Config.tsx`
- `components/permissions/PermissionRequest.tsx`
- `components/permissions/rules/PermissionRuleList.tsx`
- `components/design-system/Tabs.tsx`
- `components/CustomSelect/select.tsx`
- `components/Stats.tsx`

## 相关

- group.ui-families
