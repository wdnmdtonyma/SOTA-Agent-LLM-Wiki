---
id: ui.mcp
title: UI mcp 组件族
kind: subsystem
tier: T2
source: [components/mcp/, components/MCPServerApprovalDialog.tsx, components/MCPServerDesktopImportDialog.tsx, components/MCPServerDialogCopy.tsx, components/MCPServerMultiselectDialog.tsx]
symbols: [MCPSettings, MCPListPanel, MCPStdioServerMenu, MCPRemoteServerMenu, MCPAgentServerMenu, MCPToolListView, MCPToolDetailView, ElicitationDialog, MCPServerApprovalDialog, MCPServerDesktopImportDialog, MCPServerMultiselectDialog]
related: [subsys.ui-components, subsys.mcp, subsys.permissions, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.mcp` 是 Model Context Protocol servers、tools、approval、import、reconnect 和 elicitation 的 Ink UI 组件族。[I]

## 能回答的问题
- MCP settings UI 怎样从 AppState 构建 server list?
- stdio/remote/agent MCP server menus 和 tool detail 在哪里渲染?
- project `.mcp.json` approval 和 Claude Desktop import 的散 dialog 归哪里?

## 族干什么
`MCPSettings` 从 AppState 读取 `mcp` 和 `agentDefinitions`,从 agents 提取 MCP servers,过滤掉 `ide` client,并把 SSE/HTTP/Claude.ai proxy/stdio clients 规整成 server info。[E: components/mcp/MCPSettings.tsx:26][E: components/mcp/MCPSettings.tsx:27][E: components/mcp/MCPSettings.tsx:49][E: components/mcp/MCPSettings.tsx:58][E: components/mcp/MCPSettings.tsx:390][E: components/mcp/MCPSettings.tsx:92][E: components/mcp/MCPSettings.tsx:100][E: components/mcp/MCPSettings.tsx:108][E: components/mcp/MCPSettings.tsx:115][E: components/mcp/MCPSettings.tsx:125] `MCPSettings` 根据 view state 渲染 list panel、stdio menu、remote menu、tool detail 和 agent menu。[E: components/mcp/MCPSettings.tsx:187][E: components/mcp/MCPSettings.tsx:236][E: components/mcp/MCPSettings.tsx:272][E: components/mcp/MCPSettings.tsx:351][E: components/mcp/MCPSettings.tsx:375]

## 成员清单
| component | 文件 | 渲染什么 |
| --- | --- | --- |
| `MCPSettings` | `components/mcp/MCPSettings.tsx` | MCP settings root,在 list/server/tool/agent views 间切换。[E: components/mcp/MCPSettings.tsx:187][E: components/mcp/MCPSettings.tsx:236][E: components/mcp/MCPSettings.tsx:272][E: components/mcp/MCPSettings.tsx:351][E: components/mcp/MCPSettings.tsx:375] |
| `MCPListPanel` | `components/mcp/MCPListPanel.tsx` | server list,按 regular scopes、Claude.ai、agent 和 dynamic servers 组装 items,并渲染 status text。[E: components/mcp/MCPListPanel.tsx:114][E: components/mcp/MCPListPanel.tsx:124][E: components/mcp/MCPListPanel.tsx:151][E: components/mcp/MCPListPanel.tsx:160][E: components/mcp/MCPListPanel.tsx:166][E: components/mcp/MCPListPanel.tsx:172][E: components/mcp/MCPListPanel.tsx:309][E: components/mcp/MCPListPanel.tsx:313][E: components/mcp/MCPListPanel.tsx:329][E: components/mcp/MCPListPanel.tsx:332][E: components/mcp/MCPListPanel.tsx:337] |
| `MCPStdioServerMenu` | `components/mcp/MCPStdioServerMenu.tsx` | stdio server menu,包含 reconnect、enable/disable、args/config path/capabilities/tools 信息。[E: components/mcp/MCPStdioServerMenu.tsx:72][E: components/mcp/MCPStdioServerMenu.tsx:77][E: components/mcp/MCPStdioServerMenu.tsx:122][E: components/mcp/MCPStdioServerMenu.tsx:128][E: components/mcp/MCPStdioServerMenu.tsx:132][E: components/mcp/MCPStdioServerMenu.tsx:136][E: components/mcp/MCPStdioServerMenu.tsx:147] |
| `MCPRemoteServerMenu` | `components/mcp/MCPRemoteServerMenu.tsx` | remote server menu,props 支持 SSE、HTTP 和 Claude.ai server info。[E: components/mcp/MCPRemoteServerMenu.tsx:32][E: components/mcp/MCPSettings.tsx:272] |
| `MCPAgentServerMenu` | `components/mcp/MCPAgentServerMenu.tsx` | agent-only MCP server menu,源码注释说明 server 定义在 agent frontmatter 且仅在 agent 运行时连接。[E: components/mcp/MCPAgentServerMenu.tsx:25][E: components/mcp/MCPAgentServerMenu.tsx:118][E: components/mcp/MCPAgentServerMenu.tsx:162] |
| `MCPToolListView` | `components/mcp/MCPToolListView.tsx` | 当前 server 的 tool list,按 server filter tools,并把 read-only/destructive/open-world 写入 annotations。[E: components/mcp/MCPToolListView.tsx:43][E: components/mcp/MCPToolListView.tsx:61][E: components/mcp/MCPToolListView.tsx:62][E: components/mcp/MCPToolListView.tsx:63][E: components/mcp/MCPToolListView.tsx:66][E: components/mcp/MCPToolListView.tsx:69][E: components/mcp/MCPToolListView.tsx:72][E: components/mcp/MCPToolListView.tsx:77] |
| `MCPToolDetailView` | `components/mcp/MCPToolDetailView.tsx` | tool detail,展示 display name、full tool name、description 和 input schema parameters。[E: components/mcp/MCPToolDetailView.tsx:27][E: components/mcp/MCPToolDetailView.tsx:124][E: components/mcp/MCPToolDetailView.tsx:158][E: components/mcp/MCPToolDetailView.tsx:166][E: components/mcp/MCPToolDetailView.tsx:174][E: components/mcp/MCPToolDetailView.tsx:178] |
| `CapabilitiesSection` | `components/mcp/CapabilitiesSection.tsx` | MCP server capabilities summary,按 tools/resources/prompts counts 渲染。[E: components/mcp/CapabilitiesSection.tsx:20][E: components/mcp/CapabilitiesSection.tsx:21][E: components/mcp/CapabilitiesSection.tsx:23][E: components/mcp/CapabilitiesSection.tsx:24][E: components/mcp/CapabilitiesSection.tsx:26][E: components/mcp/CapabilitiesSection.tsx:27][E: components/mcp/CapabilitiesSection.tsx:45][E: components/mcp/CapabilitiesSection.tsx:53] |
| reconnect helpers | `components/mcp/utils/reconnectHelpers.tsx` | reconnect result message helper,覆盖 connected、needs-auth 和 failed。[E: components/mcp/utils/reconnectHelpers.tsx:21][E: components/mcp/utils/reconnectHelpers.tsx:26][E: components/mcp/utils/reconnectHelpers.tsx:31] |
| `ElicitationDialog` | `components/mcp/ElicitationDialog.tsx` | MCP elicitation dialog,url mode 渲染 URL dialog,否则渲染 form dialog。[E: components/mcp/ElicitationDialog.tsx:119][E: components/mcp/ElicitationDialog.tsx:122][E: components/mcp/ElicitationDialog.tsx:134] |
| `MCPServerApprovalDialog` | `components/MCPServerApprovalDialog.tsx` | 单个 `.mcp.json` server approval,支持 enable、enable all 和 disable。[E: components/MCPServerApprovalDialog.tsx:32][E: components/MCPServerApprovalDialog.tsx:37][E: components/MCPServerApprovalDialog.tsx:49][E: components/MCPServerApprovalDialog.tsx:82][E: components/MCPServerApprovalDialog.tsx:85][E: components/MCPServerApprovalDialog.tsx:88][E: components/MCPServerApprovalDialog.tsx:97][E: components/MCPServerApprovalDialog.tsx:105] |
| `MCPServerMultiselectDialog` | `components/MCPServerMultiselectDialog.tsx` | 多个 `.mcp.json` server 的批量 enable/disable selector。[E: components/MCPServerMultiselectDialog.tsx:29][E: components/MCPServerMultiselectDialog.tsx:37][E: components/MCPServerMultiselectDialog.tsx:43][E: components/MCPServerMultiselectDialog.tsx:62][E: components/MCPServerMultiselectDialog.tsx:91][E: components/MCPServerMultiselectDialog.tsx:102] |
| `MCPServerDesktopImportDialog` | `components/MCPServerDesktopImportDialog.tsx` | Claude Desktop MCP server import dialog,处理 name collision 的 numbered suffix 并渲染 import selector。[E: components/MCPServerDesktopImportDialog.tsx:78][E: components/MCPServerDesktopImportDialog.tsx:83][E: components/MCPServerDesktopImportDialog.tsx:85][E: components/MCPServerDesktopImportDialog.tsx:135][E: components/MCPServerDesktopImportDialog.tsx:166][E: components/MCPServerDesktopImportDialog.tsx:177] |
| `MCPServerDialogCopy` | `components/MCPServerDialogCopy.tsx` | MCP risk copy,说明 servers 可执行代码或访问 system resources,tool calls 需要 approval。[E: components/MCPServerDialogCopy.tsx:8] |

## 巨型组件深挖
`ElicitationDialog` 是本族最复杂的 interaction component:form path 读取 requested schema、初始化 focused button/form values/validation errors,从 schema required/properties 生成 fields,并维护 expanded accordion state。[E: components/mcp/ElicitationDialog.tsx:157][E: components/mcp/ElicitationDialog.tsx:160][E: components/mcp/ElicitationDialog.tsx:161][E: components/mcp/ElicitationDialog.tsx:174][E: components/mcp/ElicitationDialog.tsx:201][E: components/mcp/ElicitationDialog.tsx:202][E: components/mcp/ElicitationDialog.tsx:222] URL path 会监听 abort;完成时调用 `onWaitingDismiss`,其中 `showCancel` 时传 `retry`,否则传 `dismiss`;accept 时打开 browser 并进入 waiting phase。[E: components/mcp/ElicitationDialog.tsx:1026][E: components/mcp/ElicitationDialog.tsx:1046][E: components/mcp/ElicitationDialog.tsx:1047][E: components/mcp/ElicitationDialog.tsx:1051][E: components/mcp/ElicitationDialog.tsx:1052][E: components/mcp/ElicitationDialog.tsx:1053]

## 与 hooks/AppState 接线
`MCPSettings` 直接读取 AppState 的 `mcp` 和 `agentDefinitions`;`MCPToolListView` 从 AppState 的 MCP tools 过滤当前 server tools。[E: components/mcp/MCPSettings.tsx:26][E: components/mcp/MCPSettings.tsx:27][E: components/mcp/MCPToolListView.tsx:27][E: components/mcp/MCPToolListView.tsx:43] top-level approval dialogs 的 settings writes 落到 `enabledMcpjsonServers`、`enableAllProjectMcpServers` 和 `disabledMcpjsonServers`。[E: components/MCPServerApprovalDialog.tsx:32][E: components/MCPServerApprovalDialog.tsx:37][E: components/MCPServerApprovalDialog.tsx:49][E: components/MCPServerMultiselectDialog.tsx:37][E: components/MCPServerMultiselectDialog.tsx:43] `ElicitationDialog` 用 keybinding/input hooks 处理 cancel/input,accept 或 decline 时通过 `onResponse` 返回结果。[E: components/mcp/ElicitationDialog.tsx:471][E: components/mcp/ElicitationDialog.tsx:478][E: components/mcp/ElicitationDialog.tsx:483][E: components/mcp/ElicitationDialog.tsx:609][E: components/mcp/ElicitationDialog.tsx:628]

## Sources
- components/mcp/MCPSettings.tsx
- components/mcp/MCPListPanel.tsx
- components/mcp/MCPStdioServerMenu.tsx
- components/mcp/MCPRemoteServerMenu.tsx
- components/mcp/MCPAgentServerMenu.tsx
- components/mcp/MCPToolListView.tsx
- components/mcp/MCPToolDetailView.tsx
- components/mcp/CapabilitiesSection.tsx
- components/mcp/MCPReconnect.tsx
- components/mcp/McpParsingWarnings.tsx
- components/mcp/ElicitationDialog.tsx
- components/mcp/utils/reconnectHelpers.tsx
- components/MCPServerApprovalDialog.tsx
- components/MCPServerDesktopImportDialog.tsx
- components/MCPServerDialogCopy.tsx
- components/MCPServerMultiselectDialog.tsx

## 相关
- `subsys.mcp` 说明 MCP runtime/state/tool semantics。
- `subsys.permissions` 说明 MCP tool calls 与 approval 的关系。
- `subsys.session-state` 说明 MCP data 在 AppState 中的形态。
