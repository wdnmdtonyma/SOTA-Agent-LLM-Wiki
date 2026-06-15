---
id: ui.agents
title: UI Agents 组件族
kind: subsystem
tier: T2
source: [components/agents/AgentsMenu.tsx, components/agents/AgentsList.tsx, components/agents/AgentEditor.tsx, components/agents/ToolSelector.tsx, components/agents/new-agent-creation/CreateAgentWizard.tsx, components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx, components/agents/agentFileUtils.ts, components/agents/generateAgent.ts, components/agents/validateAgent.ts]
symbols: [AgentsMenu, AgentsList, AgentEditor, ToolSelector, CreateAgentWizard, ConfirmStepWrapper, formatAgentAsMarkdown, generateAgent, validateAgent]
related: [subsys.ui-components, subsys.swarm, subsys.session-state]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `ui.agents` 是 `/agents` 类 UI 的 agent definition 浏览、创建、编辑、删除入口,把文件化 agent 配置和 `AppState.agentDefinitions` 接到 Ink dialog 工作流。[I]

## 能回答的问题
- `AgentsMenu` 从哪里读取 agent 列表和 MCP tools?
- 新建 agent wizard 有哪些步骤?
- agent 保存后怎样刷新 `AppState.agentDefinitions`?
- `ToolSelector` 与 agent 可用工具列表怎样接线?

## 族干什么
`AgentsMenu` 是该族总入口,读取 `agentDefinitions`、`mcp.tools`、`toolPermissionContext`,再用 `useSetAppState` 写回删除或新增后的 active/all agents。[E: components/agents/AgentsMenu.tsx:48][E: components/agents/AgentsMenu.tsx:49][E: components/agents/AgentsMenu.tsx:50][E: components/agents/AgentsMenu.tsx:51] `AgentsMenu` 还把 agent 按 built-in、user/project/policy/local/flag/plugin/all 来源分桶,供列表和菜单模式使用。[E: components/agents/AgentsMenu.tsx:125][E: components/agents/AgentsMenu.tsx:126][E: components/agents/AgentsMenu.tsx:127][E: components/agents/AgentsMenu.tsx:128][E: components/agents/AgentsMenu.tsx:129][E: components/agents/AgentsMenu.tsx:130][E: components/agents/AgentsMenu.tsx:131][E: components/agents/AgentsMenu.tsx:132] 删除 agent 时,`AgentsMenu` 调用 `deleteAgentFromFile`,再把 `state.agentDefinitions.allAgents` 过滤并用 `getActiveAgentsFromList` 重算 active agents。[E: components/agents/AgentsMenu.tsx:166][E: components/agents/AgentsMenu.tsx:168][E: components/agents/AgentsMenu.tsx:174]

## 成员清单
- `AgentsMenu` 是模式机入口,在 list、view、edit、delete、create wizard 之间切换。[E: components/agents/AgentsMenu.tsx:195][E: components/agents/AgentsMenu.tsx:282][E: components/agents/AgentsMenu.tsx:305][E: components/agents/AgentsMenu.tsx:486][E: components/agents/AgentsMenu.tsx:571][E: components/agents/AgentsMenu.tsx:681]
- `AgentsList` 排序和渲染 agent 列表,支持 Create new agent、source group、built-in agent 展示。[E: components/agents/AgentsList.tsx:36][E: components/agents/AgentsList.tsx:46][E: components/agents/AgentsList.tsx:327][E: components/agents/AgentsList.tsx:328]
- `AgentEditor` 保存编辑后的 agent 属性,并持有 `useSetAppState` 写入能力。[E: components/agents/AgentEditor.tsx:36][E: components/agents/AgentEditor.tsx:69][E: components/agents/AgentEditor.tsx:73][E: components/agents/AgentEditor.tsx:76][E: components/agents/AgentEditor.tsx:77][E: components/agents/AgentEditor.tsx:78]
- `ToolSelector` 给 agent 配置工具集合,会过滤可选工具、维护 selected tools,并在完成时传回最终工具集合。[E: components/agents/ToolSelector.tsx:107][E: components/agents/ToolSelector.tsx:108][E: components/agents/ToolSelector.tsx:174][E: components/agents/ToolSelector.tsx:203][E: components/agents/ToolSelector.tsx:204]
- `CreateAgentWizard` 串起 Location、Method、Generate、Type、Prompt、Description、Tools、Model、Color、Memory、Confirm 等步骤。[E: components/agents/new-agent-creation/CreateAgentWizard.tsx:36][E: components/agents/new-agent-creation/CreateAgentWizard.tsx:44][E: components/agents/new-agent-creation/CreateAgentWizard.tsx:52][E: components/agents/new-agent-creation/CreateAgentWizard.tsx:59][E: components/agents/new-agent-creation/CreateAgentWizard.tsx:69]
- `ConfirmStepWrapper` 负责把最终 agent 写成文件、刷新 `AppState.agentDefinitions`、记录 `tengu_agent_created` analytics。[E: components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx:31][E: components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx:32][E: components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx:51]
- `agentFileUtils.ts` 提供 markdown 序列化与 agent 文件路径工具。[E: components/agents/agentFileUtils.ts:20][E: components/agents/agentFileUtils.ts:92][E: components/agents/agentFileUtils.ts:104]
- `generateAgent.ts` 定义 agent 生成用 system prompt,用于把自然语言需求变成 agent JSON。[E: components/agents/generateAgent.ts:26]
- `validateAgent.ts` 暴露 agent type 和 agent definition 校验函数。[E: components/agents/validateAgent.ts:15][E: components/agents/validateAgent.ts:35]

## 巨型组件深挖
`AgentsMenu` 是本族最大控制面之一:它先从 `AppState` 取 agent/mcp/permission 数据,再用 `useMergedTools` 合并 local tools 与 MCP tools,最后按 `modeState.mode` 返回不同 dialog 子树。[E: components/agents/AgentsMenu.tsx:48][E: components/agents/AgentsMenu.tsx:64][E: components/agents/AgentsMenu.tsx:195][E: components/agents/AgentsMenu.tsx:282][E: components/agents/AgentsMenu.tsx:305][E: components/agents/AgentsMenu.tsx:486][E: components/agents/AgentsMenu.tsx:571][E: components/agents/AgentsMenu.tsx:681] `AgentsList` 的键盘流在同一个 component 内处理 Enter、up/down,并把 built-in agent 与可编辑 agent 区分渲染。[E: components/agents/AgentsList.tsx:124][E: components/agents/AgentsList.tsx:135][E: components/agents/AgentsList.tsx:138][E: components/agents/AgentsList.tsx:328]

## 与 hooks/AppState 接线
该族直接依赖 `useAppState`/`useSetAppState` 管理 `agentDefinitions`、MCP tools、permission context。[E: components/agents/AgentsMenu.tsx:48][E: components/agents/AgentsMenu.tsx:49][E: components/agents/AgentsMenu.tsx:50][E: components/agents/AgentsMenu.tsx:51] 新建 wizard 的最终确认页通过 `useWizard` 读取 `wizardData`,通过 `useSetAppState` 把新 agent concat 到 `state.agentDefinitions.allAgents`。[E: components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx:24][E: components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx:25][E: components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx:27][E: components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx:34]

## Sources
- components/agents/AgentsMenu.tsx
- components/agents/AgentsList.tsx
- components/agents/AgentEditor.tsx
- components/agents/ToolSelector.tsx
- components/agents/new-agent-creation/CreateAgentWizard.tsx
- components/agents/new-agent-creation/wizard-steps/ConfirmStepWrapper.tsx
- components/agents/agentFileUtils.ts
- components/agents/generateAgent.ts
- components/agents/validateAgent.ts

## 相关
- `subsys.ui-components` 说明整体 UI component 分层。
- `subsys.swarm` 说明 agent/team/task 后端语义。
- `subsys.session-state` 说明 `AppState` store 的持久状态边界。
