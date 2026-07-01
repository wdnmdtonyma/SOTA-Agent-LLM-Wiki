---
id: subsys.coding-agent.session-services
title: cwd 绑定运行服务
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/agent-session-services.ts
symbols:
  - AgentSessionServices
  - createAgentSessionServices
  - createAgentSessionFromServices
related:
  - subsys.coding-agent.session-runtime
  - subsys.coding-agent.model-registry
  - subsys.coding-agent.resource-loader
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.coding-agent.session-services` 描述 pi-coding-agent 的 cwd-bound runtime services: `createAgentSessionServices()` 先把 cwd、agentDir、auth、settings、model registry、resource loader 和 setup diagnostics 绑定成一个 coherent bundle, `createAgentSessionFromServices()` 再用这个 bundle 构造 `AgentSession`。

## 能回答的问题

- `AgentSessionServices` 里有哪些 cwd-bound services?
- `createAgentSessionServices()` 什么时候解析 cwd 和 agentDir?
- extension provider registration 和 extension flag values 在 services 创建阶段怎样进入 diagnostics?
- `createAgentSessionFromServices()` 为什么不重新创建 settings/model/resource loader?
- 这个节点和 `subsys.coding-agent.session-runtime`、`subsys.coding-agent.model-registry`、`subsys.coding-agent.resource-loader` 的边界是什么?

## 职责边界

`packages/coding-agent/src/core/agent-session-services.ts` 是 cwd-bound service bundle 的装配层: 它定义 setup diagnostic、services 创建入参、从 services 创建 session 的入参、`AgentSessionServices` bundle, 以及两个 public factory [E: packages/coding-agent/src/core/agent-session-services.ts:26] [E: packages/coding-agent/src/core/agent-session-services.ts:38] [E: packages/coding-agent/src/core/agent-session-services.ts:55] [E: packages/coding-agent/src/core/agent-session-services.ts:74] [E: packages/coding-agent/src/core/agent-session-services.ts:137] [E: packages/coding-agent/src/core/agent-session-services.ts:187]。

本节点不权威解释 `AgentSession` 内部 loop、tool 注册、prompt/message 生命周期或 session switching; `createAgentSessionFromServices()` 只是把已创建 services 和已解析 session options 转交给 `createAgentSession()` [E: packages/coding-agent/src/core/agent-session-services.ts:190] [E: packages/coding-agent/src/core/agent-session-services.ts:197] [E: packages/coding-agent/src/core/agent-session-services.ts:205] [I]。

## 关键文件

- `packages/coding-agent/src/core/agent-session-services.ts`: 本节点唯一权威源文件, 覆盖 `AgentSessionRuntimeDiagnostic`、`CreateAgentSessionServicesOptions`、`CreateAgentSessionFromServicesOptions`、`AgentSessionServices`、`applyExtensionFlagValues()`、`createAgentSessionServices()` 和 `createAgentSessionFromServices()` [E: packages/coding-agent/src/core/agent-session-services.ts:26] [E: packages/coding-agent/src/core/agent-session-services.ts:38] [E: packages/coding-agent/src/core/agent-session-services.ts:55] [E: packages/coding-agent/src/core/agent-session-services.ts:74] [E: packages/coding-agent/src/core/agent-session-services.ts:84] [E: packages/coding-agent/src/core/agent-session-services.ts:137] [E: packages/coding-agent/src/core/agent-session-services.ts:187]。

## 数据模型

`AgentSessionRuntimeDiagnostic` 是 services/session diagnostics 的统一形状: `type` 只能是 `"info" | "warning" | "error"`, `message` 是展示给上层的字符串 [E: packages/coding-agent/src/core/agent-session-services.ts:26] [E: packages/coding-agent/src/core/agent-session-services.ts:27] [E: packages/coding-agent/src/core/agent-session-services.ts:28]。

`CreateAgentSessionServicesOptions` 要求 `cwd`, 允许调用方注入 `agentDir`、`AuthStorage`、`SettingsManager`、`ModelRegistry`、extension flag values、`DefaultResourceLoaderOptions` 的 cwd/agentDir/settingsManager 以外字段, 以及 `ResourceLoaderReloadOptions` [E: packages/coding-agent/src/core/agent-session-services.ts:38] [E: packages/coding-agent/src/core/agent-session-services.ts:39] [E: packages/coding-agent/src/core/agent-session-services.ts:40] [E: packages/coding-agent/src/core/agent-session-services.ts:41] [E: packages/coding-agent/src/core/agent-session-services.ts:42] [E: packages/coding-agent/src/core/agent-session-services.ts:43] [E: packages/coding-agent/src/core/agent-session-services.ts:44] [E: packages/coding-agent/src/core/agent-session-services.ts:45] [E: packages/coding-agent/src/core/agent-session-services.ts:46]。

`AgentSessionServices` 是 services bundle: 它保存 resolved `cwd`、resolved `agentDir`、`authStorage`、`settingsManager`、`modelRegistry`、`resourceLoader` 和创建阶段 diagnostics [E: packages/coding-agent/src/core/agent-session-services.ts:74] [E: packages/coding-agent/src/core/agent-session-services.ts:75] [E: packages/coding-agent/src/core/agent-session-services.ts:76] [E: packages/coding-agent/src/core/agent-session-services.ts:77] [E: packages/coding-agent/src/core/agent-session-services.ts:78] [E: packages/coding-agent/src/core/agent-session-services.ts:79] [E: packages/coding-agent/src/core/agent-session-services.ts:80] [E: packages/coding-agent/src/core/agent-session-services.ts:81]。

`CreateAgentSessionFromServicesOptions` 把 services 与 session-specific inputs 分开: `services` 和 `sessionManager` 必填, model/thinking/scoped models/tool allowlist-denylist/noTools/customTools/sessionStartEvent 可选 [E: packages/coding-agent/src/core/agent-session-services.ts:55] [E: packages/coding-agent/src/core/agent-session-services.ts:56] [E: packages/coding-agent/src/core/agent-session-services.ts:57] [E: packages/coding-agent/src/core/agent-session-services.ts:58] [E: packages/coding-agent/src/core/agent-session-services.ts:59] [E: packages/coding-agent/src/core/agent-session-services.ts:60] [E: packages/coding-agent/src/core/agent-session-services.ts:61] [E: packages/coding-agent/src/core/agent-session-services.ts:62] [E: packages/coding-agent/src/core/agent-session-services.ts:63] [E: packages/coding-agent/src/core/agent-session-services.ts:64] [E: packages/coding-agent/src/core/agent-session-services.ts:65]。

## 控制流

1. `createAgentSessionServices@packages/coding-agent/src/core/agent-session-services.ts:137` 先用 `resolvePath(options.cwd)` 得到 effective cwd; `agentDir` 有显式传入时也走 `resolvePath`, 否则走 `getAgentDir()` [E: packages/coding-agent/src/core/agent-session-services.ts:140] [E: packages/coding-agent/src/core/agent-session-services.ts:141]。
2. `createAgentSessionServices@packages/coding-agent/src/core/agent-session-services.ts:137` 复用调用方传入的 `authStorage`、`settingsManager`、`modelRegistry`, 缺省时分别创建 `AuthStorage.create(join(agentDir, "auth.json"))`、`SettingsManager.create(cwd, agentDir)`、`ModelRegistry.create(authStorage, join(agentDir, "models.json"))` [E: packages/coding-agent/src/core/agent-session-services.ts:142] [E: packages/coding-agent/src/core/agent-session-services.ts:143] [E: packages/coding-agent/src/core/agent-session-services.ts:144]。
3. `createAgentSessionServices@packages/coding-agent/src/core/agent-session-services.ts:137` 创建 `DefaultResourceLoader`, 把 caller-provided `resourceLoaderOptions` 展开后强制写入 resolved `cwd`、resolved `agentDir` 和本次使用的 `settingsManager`; 这使 resource discovery 与 settings 读取共享同一个 cwd/agentDir 绑定 [E: packages/coding-agent/src/core/agent-session-services.ts:145] [E: packages/coding-agent/src/core/agent-session-services.ts:146] [E: packages/coding-agent/src/core/agent-session-services.ts:147] [E: packages/coding-agent/src/core/agent-session-services.ts:148] [E: packages/coding-agent/src/core/agent-session-services.ts:149] [I]。
4. `resourceLoader.reload@packages/coding-agent/src/core/agent-session-services.ts:151` 在 provider registration 和 flag application 之前执行, 因此后续 `getExtensions()` 读取的是已 reload 后的 extension result [E: packages/coding-agent/src/core/agent-session-services.ts:151] [E: packages/coding-agent/src/core/agent-session-services.ts:154]。
5. `createAgentSessionServices@packages/coding-agent/src/core/agent-session-services.ts:137` 遍历 `extensionsResult.runtime.pendingProviderRegistrations`, 逐个调用 `modelRegistry.registerProvider(name, config)`; 注册抛错时捕获为 `type: "error"` diagnostic, message 前缀包含 extension path [E: packages/coding-agent/src/core/agent-session-services.ts:155] [E: packages/coding-agent/src/core/agent-session-services.ts:157] [E: packages/coding-agent/src/core/agent-session-services.ts:160] [E: packages/coding-agent/src/core/agent-session-services.ts:161] [E: packages/coding-agent/src/core/agent-session-services.ts:162]。
6. provider registration 处理完成后, `pendingProviderRegistrations` 被清空, 然后把 `applyExtensionFlagValues(resourceLoader, options.extensionFlagValues)` 的结果追加进 diagnostics [E: packages/coding-agent/src/core/agent-session-services.ts:166] [E: packages/coding-agent/src/core/agent-session-services.ts:167]。
7. `applyExtensionFlagValues@packages/coding-agent/src/core/agent-session-services.ts:84` 没有 `extensionFlagValues` 时返回空 diagnostics; 有 flag values 时先从 loaded extensions 的 `extension.flags` 建 registered flag map [E: packages/coding-agent/src/core/agent-session-services.ts:88] [E: packages/coding-agent/src/core/agent-session-services.ts:89] [E: packages/coding-agent/src/core/agent-session-services.ts:93] [E: packages/coding-agent/src/core/agent-session-services.ts:95] [E: packages/coding-agent/src/core/agent-session-services.ts:96] [E: packages/coding-agent/src/core/agent-session-services.ts:97]。
8. `applyExtensionFlagValues@packages/coding-agent/src/core/agent-session-services.ts:84` 对 boolean flag 总是写入 `true`; string flag 只有在 CLI value 是 string 时写入, 否则产生 `"requires a value"` error diagnostic [E: packages/coding-agent/src/core/agent-session-services.ts:108] [E: packages/coding-agent/src/core/agent-session-services.ts:109] [E: packages/coding-agent/src/core/agent-session-services.ts:112] [E: packages/coding-agent/src/core/agent-session-services.ts:113] [E: packages/coding-agent/src/core/agent-session-services.ts:116] [E: packages/coding-agent/src/core/agent-session-services.ts:118]。
9. `applyExtensionFlagValues@packages/coding-agent/src/core/agent-session-services.ts:84` 收集 unknown flag names, 最后用 `"Unknown option(s): --name"` 形式产生 error diagnostic [E: packages/coding-agent/src/core/agent-session-services.ts:101] [E: packages/coding-agent/src/core/agent-session-services.ts:104] [E: packages/coding-agent/src/core/agent-session-services.ts:105] [E: packages/coding-agent/src/core/agent-session-services.ts:122] [E: packages/coding-agent/src/core/agent-session-services.ts:124] [E: packages/coding-agent/src/core/agent-session-services.ts:125]。
10. `createAgentSessionServices@packages/coding-agent/src/core/agent-session-services.ts:137` 返回 `AgentSessionServices` object literal, 把 resolved paths、service instances 和 accumulated diagnostics 一起交给 caller [E: packages/coding-agent/src/core/agent-session-services.ts:169] [E: packages/coding-agent/src/core/agent-session-services.ts:170] [E: packages/coding-agent/src/core/agent-session-services.ts:171] [E: packages/coding-agent/src/core/agent-session-services.ts:172] [E: packages/coding-agent/src/core/agent-session-services.ts:173] [E: packages/coding-agent/src/core/agent-session-services.ts:174] [E: packages/coding-agent/src/core/agent-session-services.ts:175] [E: packages/coding-agent/src/core/agent-session-services.ts:176]。
11. `createAgentSessionFromServices@packages/coding-agent/src/core/agent-session-services.ts:187` 调 `createAgentSession()` 时, cwd/agentDir/auth/settings/model/resource loader 全部来自 `options.services`, 而 sessionManager、model、thinking、tools、customTools 和 sessionStartEvent 来自本次 session options [E: packages/coding-agent/src/core/agent-session-services.ts:190] [E: packages/coding-agent/src/core/agent-session-services.ts:191] [E: packages/coding-agent/src/core/agent-session-services.ts:192] [E: packages/coding-agent/src/core/agent-session-services.ts:193] [E: packages/coding-agent/src/core/agent-session-services.ts:194] [E: packages/coding-agent/src/core/agent-session-services.ts:195] [E: packages/coding-agent/src/core/agent-session-services.ts:196] [E: packages/coding-agent/src/core/agent-session-services.ts:197] [E: packages/coding-agent/src/core/agent-session-services.ts:198] [E: packages/coding-agent/src/core/agent-session-services.ts:199] [E: packages/coding-agent/src/core/agent-session-services.ts:200] [E: packages/coding-agent/src/core/agent-session-services.ts:201] [E: packages/coding-agent/src/core/agent-session-services.ts:202] [E: packages/coding-agent/src/core/agent-session-services.ts:203] [E: packages/coding-agent/src/core/agent-session-services.ts:204] [E: packages/coding-agent/src/core/agent-session-services.ts:205]。

## 设计动机与权衡

services creation 与 session creation 被拆成两个 factory: `createAgentSessionServices()` 只创建 cwd-bound infrastructure, `createAgentSessionFromServices()` 只把 services 和 session-specific options 送进 `createAgentSession()` [E: packages/coding-agent/src/core/agent-session-services.ts:137] [E: packages/coding-agent/src/core/agent-session-services.ts:187] [I]。从 options 形状和转交参数看, caller 可以把 `services` 与 model/thinking/tools/customTools/sessionStartEvent 等 session inputs 分开准备, 再构造 `AgentSession` [E: packages/coding-agent/src/core/agent-session-services.ts:55] [E: packages/coding-agent/src/core/agent-session-services.ts:56] [E: packages/coding-agent/src/core/agent-session-services.ts:58] [E: packages/coding-agent/src/core/agent-session-services.ts:59] [E: packages/coding-agent/src/core/agent-session-services.ts:60] [E: packages/coding-agent/src/core/agent-session-services.ts:61] [E: packages/coding-agent/src/core/agent-session-services.ts:62] [E: packages/coding-agent/src/core/agent-session-services.ts:65] [E: packages/coding-agent/src/core/agent-session-services.ts:190] [E: packages/coding-agent/src/core/agent-session-services.ts:205] [I]。

diagnostics 被收集到数组并随 services 返回: provider registration failure、extension flag missing value 和 unknown option 都进入 `AgentSessionRuntimeDiagnostic[]`, 最终作为 `diagnostics` 字段返回给 caller [E: packages/coding-agent/src/core/agent-session-services.ts:153] [E: packages/coding-agent/src/core/agent-session-services.ts:160] [E: packages/coding-agent/src/core/agent-session-services.ts:116] [E: packages/coding-agent/src/core/agent-session-services.ts:122] [E: packages/coding-agent/src/core/agent-session-services.ts:176] [I]。

`DefaultResourceLoader` 的 cwd/agentDir/settingsManager 在 services 层强制覆盖, 即使 caller 通过 `resourceLoaderOptions` 传了其它 loader 配置也不能替换这三项; 这保护了 service bundle 内部的一致性, 代价是 caller 若要完全自定义 `ResourceLoader` 不能通过本 factory 直接注入 [E: packages/coding-agent/src/core/agent-session-services.ts:45] [E: packages/coding-agent/src/core/agent-session-services.ts:145] [E: packages/coding-agent/src/core/agent-session-services.ts:147] [E: packages/coding-agent/src/core/agent-session-services.ts:148] [E: packages/coding-agent/src/core/agent-session-services.ts:149] [I]。

## Gotcha

- `CreateAgentSessionServicesOptions.resourceLoaderOptions` 显式 omit `cwd`、`agentDir`、`settingsManager`; 这三个字段由 services factory 填入, 不是 caller 传入的可覆盖项 [E: packages/coding-agent/src/core/agent-session-services.ts:45] [E: packages/coding-agent/src/core/agent-session-services.ts:147] [E: packages/coding-agent/src/core/agent-session-services.ts:148] [E: packages/coding-agent/src/core/agent-session-services.ts:149]。
- boolean extension flag value 被忽略为具体值并写成 `true`; string flag 才使用传入字符串, 因此 `Map<string, boolean | string>` 里的 boolean 只表达 presence [E: packages/coding-agent/src/core/agent-session-services.ts:102] [E: packages/coding-agent/src/core/agent-session-services.ts:108] [E: packages/coding-agent/src/core/agent-session-services.ts:109] [E: packages/coding-agent/src/core/agent-session-services.ts:112] [E: packages/coding-agent/src/core/agent-session-services.ts:113] [I]。
- `createAgentSessionFromServices()` 不追加或返回 services diagnostics; diagnostics 保存在 `services.diagnostics`, 该 helper 的返回值直接来自 `createAgentSession()` [E: packages/coding-agent/src/core/agent-session-services.ts:81] [E: packages/coding-agent/src/core/agent-session-services.ts:187] [E: packages/coding-agent/src/core/agent-session-services.ts:190] [I]。
- `pendingProviderRegistrations` 在尝试注册后被置为空数组; 后续重用同一个 `extensionsResult.runtime` 时不能再从该字段读到待注册 providers [E: packages/coding-agent/src/core/agent-session-services.ts:155] [E: packages/coding-agent/src/core/agent-session-services.ts:166] [I]。

## 跨包边界

[subsys.coding-agent.session-runtime](session-runtime.md) 是会话运行时与 lifecycle 节点: 它负责持有当前 `AgentSession` 和 `AgentSessionServices`, 并在 cwd/session 切换时重新创建 runtime; 本节点只解释 services bundle 怎样被创建以及怎样传给 session factory [E: packages/coding-agent/src/core/agent-session-services.ts:74] [E: packages/coding-agent/src/core/agent-session-services.ts:137] [E: packages/coding-agent/src/core/agent-session-services.ts:187] [I]。

[subsys.coding-agent.model-registry](model-registry.md) 是模型注册与 API key 解析节点: 本节点只说明 services factory 如何创建或接收 `ModelRegistry`, 以及 extension provider registration 如何调用 `modelRegistry.registerProvider()` [E: packages/coding-agent/src/core/agent-session-services.ts:43] [E: packages/coding-agent/src/core/agent-session-services.ts:144] [E: packages/coding-agent/src/core/agent-session-services.ts:157]。

[subsys.coding-agent.resource-loader](resource-loader.md) 是 resources discovery 节点: 本节点只说明 services factory 如何创建 `DefaultResourceLoader`、调用 `reload()`、读取 loaded extensions 并应用 extension flags [E: packages/coding-agent/src/core/agent-session-services.ts:45] [E: packages/coding-agent/src/core/agent-session-services.ts:145] [E: packages/coding-agent/src/core/agent-session-services.ts:151] [E: packages/coding-agent/src/core/agent-session-services.ts:154] [E: packages/coding-agent/src/core/agent-session-services.ts:167]。

`@earendil-works/pi-agent-core` 只在本文件以 `ThinkingLevel` type import 出现; services bundle 本身属于 pi-coding-agent 产品层, 并在 `createAgentSessionFromServices()` 把 `thinkingLevel` 透传给 coding-agent 的 `createAgentSession()` [E: packages/coding-agent/src/core/agent-session-services.ts:2] [E: packages/coding-agent/src/core/agent-session-services.ts:60] [E: packages/coding-agent/src/core/agent-session-services.ts:199] [I]。

## Sources

- packages/coding-agent/src/core/agent-session-services.ts

## 相关

- [subsys.coding-agent.session-runtime](session-runtime.md): 运行时对象如何持有 services/session, 以及 cwd/session switching 如何触发新 runtime。
- [subsys.coding-agent.model-registry](model-registry.md): `ModelRegistry` 的 provider registration、模型查找和 auth/API key 解析。
- [subsys.coding-agent.resource-loader](resource-loader.md): `DefaultResourceLoader` 如何发现 extensions/skills/prompts/themes/context files 并产出 extension runtime。
