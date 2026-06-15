---
id: ui.ui
path: subsystems/ui/ui.md
title: components/ui 基础组件族
kind: subsystem
tier: T2
source: [components/ui/OrderedList.tsx, components/ui/OrderedListItem.tsx, components/ui/TreeSelect.tsx]
symbols: [OrderedList, OrderedListItem, TreeSelect]
related: [subsys.ui-components]
evidence: explicit
status: verified
updated: 2026-06-14
---

> components/ui 基础组件族收纳通用 terminal UI primitives：当前包含 ordered list compound component 与 tree select wrapper，供更高层 screen/dialog 复用。[E: components/ui/OrderedList.tsx:11][E: components/ui/OrderedList.tsx:68][E: components/ui/TreeSelect.tsx:110]

## 能回答的问题

- OrderedList 如何给嵌套 item 生成稳定编号 marker？[E: components/ui/OrderedList.tsx:16][E: components/ui/OrderedList.tsx:19][E: components/ui/OrderedList.tsx:35][E: components/ui/OrderedList.tsx:37]
- OrderedListItem 如何消费 marker context 并渲染 child content？[E: components/ui/OrderedListItem.tsx:15][E: components/ui/OrderedListItem.tsx:19][E: components/ui/OrderedListItem.tsx:27]
- TreeSelect 如何把 tree flatten 成 Select options？[E: components/ui/TreeSelect.tsx:160][E: components/ui/TreeSelect.tsx:163][E: components/ui/TreeSelect.tsx:170][E: components/ui/TreeSelect.tsx:212][E: components/ui/TreeSelect.tsx:365]
- TreeSelect 如何处理 expand/collapse keyboard 操作？[E: components/ui/TreeSelect.tsx:287][E: components/ui/TreeSelect.tsx:291]

## 族干什么

这个 family 不承载具体业务，而是提供可复用 UI primitives。`OrderedList` 通过 context 传递 parent marker 和当前 item marker，计算 child count 和 marker width 后逐项渲染；`OrderedListItem` 读取 item marker 并把 children 放到右侧 column。[E: components/ui/OrderedList.tsx:5][E: components/ui/OrderedList.tsx:16][E: components/ui/OrderedList.tsx:19][E: components/ui/OrderedList.tsx:35][E: components/ui/OrderedListItem.tsx:15][E: components/ui/OrderedListItem.tsx:27] `TreeSelect` 则把 nested nodes 递归压入 flattened list，再映射成 option list，并用 `Select` 完成终端选择 UI。[E: components/ui/TreeSelect.tsx:160][E: components/ui/TreeSelect.tsx:163][E: components/ui/TreeSelect.tsx:170][E: components/ui/TreeSelect.tsx:212][E: components/ui/TreeSelect.tsx:365]

## 成员清单

- `OrderedList` — `components/ui/OrderedList.tsx` — 渲染 ordered list container，计算 marker width，给每个 `OrderedListItem` 注入编号 context。[E: components/ui/OrderedList.tsx:11][E: components/ui/OrderedList.tsx:26][E: components/ui/OrderedList.tsx:37][E: components/ui/OrderedList.tsx:57]
- `OrderedList.Item` / `OrderedListItem` — `components/ui/OrderedListItem.tsx` — 渲染 list item marker 与内容列；compound export 在 `OrderedListComponent.Item` 上挂载。[E: components/ui/OrderedList.tsx:68][E: components/ui/OrderedListItem.tsx:10][E: components/ui/OrderedListItem.tsx:19][E: components/ui/OrderedListItem.tsx:34]
- `TreeSelect` — `components/ui/TreeSelect.tsx` — 渲染 tree-shaped select，支持 controlled/uncontrolled expansion、focus callbacks、自定义 prefix、disabled、layout 和 keyboard expand/collapse。[E: components/ui/TreeSelect.tsx:41][E: components/ui/TreeSelect.tsx:56][E: components/ui/TreeSelect.tsx:61][E: components/ui/TreeSelect.tsx:72][E: components/ui/TreeSelect.tsx:89][E: components/ui/TreeSelect.tsx:96][E: components/ui/TreeSelect.tsx:139][E: components/ui/TreeSelect.tsx:145][E: components/ui/TreeSelect.tsx:146][E: components/ui/TreeSelect.tsx:148][E: components/ui/TreeSelect.tsx:188][E: components/ui/TreeSelect.tsx:189][E: components/ui/TreeSelect.tsx:195][E: components/ui/TreeSelect.tsx:198][E: components/ui/TreeSelect.tsx:201][E: components/ui/TreeSelect.tsx:253][E: components/ui/TreeSelect.tsx:255][E: components/ui/TreeSelect.tsx:259][E: components/ui/TreeSelect.tsx:261][E: components/ui/TreeSelect.tsx:263][E: components/ui/TreeSelect.tsx:287][E: components/ui/TreeSelect.tsx:289][E: components/ui/TreeSelect.tsx:291][E: components/ui/TreeSelect.tsx:294][E: components/ui/TreeSelect.tsx:299][E: components/ui/TreeSelect.tsx:352][E: components/ui/TreeSelect.tsx:365][E: components/ui/TreeSelect.tsx:382]

## 巨型组件深挖

`TreeSelect` 是本族最大组件。它支持 controlled expansion：如果调用方传入 `isNodeExpanded`，`isExpanded` 走该函数；否则读取 internal expanded id set。[E: components/ui/TreeSelect.tsx:139][E: components/ui/TreeSelect.tsx:145][E: components/ui/TreeSelect.tsx:146][E: components/ui/TreeSelect.tsx:148] flatten 过程通过递归 `traverse` 完成，每个 flattened node 记录 depth、isExpanded、hasChildren 和 parentId；只有节点有 children 且展开时才继续遍历子节点。[E: components/ui/TreeSelect.tsx:17][E: components/ui/TreeSelect.tsx:18][E: components/ui/TreeSelect.tsx:19][E: components/ui/TreeSelect.tsx:20][E: components/ui/TreeSelect.tsx:160][E: components/ui/TreeSelect.tsx:163][E: components/ui/TreeSelect.tsx:165][E: components/ui/TreeSelect.tsx:166][E: components/ui/TreeSelect.tsx:167][E: components/ui/TreeSelect.tsx:168][E: components/ui/TreeSelect.tsx:170][E: components/ui/TreeSelect.tsx:171][E: components/ui/TreeSelect.tsx:172] label 构建阶段会根据 parent/child prefix function 加前缀，再映射成 `Select` option。[E: components/ui/TreeSelect.tsx:188][E: components/ui/TreeSelect.tsx:189][E: components/ui/TreeSelect.tsx:195][E: components/ui/TreeSelect.tsx:198][E: components/ui/TreeSelect.tsx:201][E: components/ui/TreeSelect.tsx:212][E: components/ui/TreeSelect.tsx:213][E: components/ui/TreeSelect.tsx:214][E: components/ui/TreeSelect.tsx:215][E: components/ui/TreeSelect.tsx:216][E: components/ui/TreeSelect.tsx:224]

交互阶段，`toggleExpand` 会优先调用外部 `onExpand`/`onCollapse`，否则更新 internal expanded set。[E: components/ui/TreeSelect.tsx:253][E: components/ui/TreeSelect.tsx:255][E: components/ui/TreeSelect.tsx:259][E: components/ui/TreeSelect.tsx:261][E: components/ui/TreeSelect.tsx:263] wrapper 的 `onKeyDown` 处理右键展开、左键折叠或跳到 parent，并把最终选择通过 `handleChange` 转回 tree node。[E: components/ui/TreeSelect.tsx:287][E: components/ui/TreeSelect.tsx:289][E: components/ui/TreeSelect.tsx:291][E: components/ui/TreeSelect.tsx:294][E: components/ui/TreeSelect.tsx:299][E: components/ui/TreeSelect.tsx:323][E: components/ui/TreeSelect.tsx:329][E: components/ui/TreeSelect.tsx:382]

## 与 hooks/keybindings/AppState 接线

TreeSelect 的接线发生在 props/callback 层：expand/collapse 调用 `onExpand` / `onCollapse`，选择调用 `onSelect`，focus 调用 `onFocus`，`Select` 接收 change/focus handlers，外层 focusable Box 绑定 `onKeyDown`。[E: components/ui/TreeSelect.tsx:253][E: components/ui/TreeSelect.tsx:259][E: components/ui/TreeSelect.tsx:329][E: components/ui/TreeSelect.tsx:352][E: components/ui/TreeSelect.tsx:365][E: components/ui/TreeSelect.tsx:382] [I] 因此，本族是 low-level UI toolkit；与 hooks/keybindings/AppState 的连接由使用它的 dialog 或 screen 决定。

## Sources

- `components/ui/OrderedList.tsx`
- `components/ui/OrderedListItem.tsx`
- `components/ui/TreeSelect.tsx`

## 相关

- `subsys.ui-components`
