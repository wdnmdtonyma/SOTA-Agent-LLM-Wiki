---
id: surface.trust.model
title: 项目信任模型
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/project-trust.ts
  - packages/coding-agent/src/core/trust-manager.ts
  - packages/coding-agent/docs/security.md
symbols:
  - resolveProjectTrusted
  - ProjectTrustStore
  - emitProjectTrustEvent
related:
  - subsys.coding-agent.trust-manager
  - surface.extensions.api
  - surface.misc.security
evidence: explicit
status: verified
updated: 5a073885
---

> 项目信任模型是 pi-coding-agent 在启动或重载资源时使用的输入加载门禁: 它决定当前 cwd 的 project-local settings、resources、packages 和 extensions 是否能进入本次 runtime,但它不是 sandbox,也不限制会话开始后模型可以请求工具做什么。

## 能回答的问题

- 什么项目内容会触发 project trust?
- explicit override、extension `project_trust`、saved decision 和 `defaultProjectTrust` 的优先级是什么?
- 信任或拒绝信任分别会影响 `.pi/settings.json`、`.pi` resources、project packages、project extensions 和 context files 吗?
- startup prompt 会把 decision 保存到哪里, parent folder trust 是什么粒度?
- 非交互模式为什么不会弹 trust prompt,默认怎样处理 project resources?
- project trust 为什么不能当作安全沙箱?

## 触发条件

pi 只在当前 cwd 有需要 gate 的 project-local resources 时解析 project trust;没有这些资源时 `resolveProjectTrusted()` 直接返回 trusted [E: packages/coding-agent/src/core/project-trust.ts:50] [E: packages/coding-agent/src/core/project-trust.ts:51]。用户文档列出的触发项是 `.pi/settings.json`,`.pi/extensions`、`.pi/skills`、`.pi/prompts`、`.pi/themes`,`.pi/SYSTEM.md`、`.pi/APPEND_SYSTEM.md`,以及当前目录或 ancestor 目录里的 project `.agents/skills`;空的 `.pi` 目录不算触发项 [E: packages/coding-agent/docs/security.md:9] [E: packages/coding-agent/docs/security.md:11] [E: packages/coding-agent/docs/security.md:16]。

实现上,`.pi` 触发项来自 `TRUST_REQUIRING_PROJECT_CONFIG_RESOURCES`,包含 `settings.json`、`extensions`、`skills`、`prompts`、`themes`、`SYSTEM.md` 和 `APPEND_SYSTEM.md` [E: packages/coding-agent/src/core/trust-manager.ts:29] [E: packages/coding-agent/src/core/trust-manager.ts:36]。`.pi` 只检查当前 cwd 下的 `.pi`,而 `.agents/skills` 会沿 ancestor 上溯,并排除 user/global `~/.agents/skills` [E: packages/coding-agent/src/core/trust-manager.ts:189] [E: packages/coding-agent/src/core/trust-manager.ts:194] [E: packages/coding-agent/src/core/trust-manager.ts:196]。

## 决策顺序

`resolveProjectTrusted()` 的第一优先级是本次运行的 explicit override: 只要 `trustOverride !== undefined`,函数直接返回该 boolean [E: packages/coding-agent/src/core/project-trust.ts:46] [E: packages/coding-agent/src/core/project-trust.ts:48]。用户文档把 `--approve`/`-a` 和 `--no-approve`/`-na` 描述为单次运行的 project trust override [E: packages/coding-agent/docs/security.md:29]。

没有 override 且存在需要 trust 的资源时,`resolveProjectTrusted()` 会向已加载的 extensions 发出 `{ type: "project_trust", cwd }` 事件;若 extension 返回结果,`trusted === "yes"` 映射为 true,`remember: true` 时会把该 decision 写入 trust store,随后直接返回 [E: packages/coding-agent/src/core/project-trust.ts:54] [E: packages/coding-agent/src/core/project-trust.ts:68]。用户文档把 pre-trust 阶段限定为 context files、user/global extensions 和 CLI `-e` extensions,这些 extensions 可以处理 `project_trust` event;第一个返回 yes/no decision 的 extension 拥有该 decision [E: packages/coding-agent/docs/security.md:27]。

extension 没给 decision 时,`resolveProjectTrusted()` 查询 `ProjectTrustStore.get(cwd)`;只要返回值不是 `null`,就直接使用 saved decision [E: packages/coding-agent/src/core/project-trust.ts:72] [E: packages/coding-agent/src/core/project-trust.ts:74]。再没有 saved decision 时,`defaultProjectTrust ?? "ask"` 控制 fallback:`"always"` 返回 true,`"never"` 返回 false,`"ask"` 进入 UI prompt path [E: packages/coding-agent/src/core/project-trust.ts:77] [E: packages/coding-agent/src/core/project-trust.ts:82]。用户文档说明交互式启动会从 global settings 读取 `defaultProjectTrust`,默认值是 `"ask"` [E: packages/coding-agent/docs/security.md:18]。

## 交互与非交互行为

交互式启动在没有 extension decision 或 saved decision 时会按 `defaultProjectTrust: "ask"` 弹出 project folder trust prompt;用户文档说明 saved decisions 存在 `~/.pi/agent/trust.json`,且当前目录或 parent path 上最近的 saved decision 会先于 global default 生效 [E: packages/coding-agent/docs/security.md:18]。非交互模式包括 `-p`、`--mode json` 和 `--mode rpc`,不会展示 trust prompt;没有可用 saved decision 时,`ask` 和 `never` 都忽略 project resources,`always` 信任这些 resources [E: packages/coding-agent/docs/security.md:29]。

源码里的 fail-closed 分支与文档一致: ask path 如果 `projectTrustContext.hasUI` 为 false,`resolveProjectTrusted()` 直接返回 false [E: packages/coding-agent/src/core/project-trust.ts:86] [E: packages/coding-agent/src/core/project-trust.ts:87]。

## 保存的决策与选项

`ProjectTrustStore` 把 trust store 路径固定为传入 agent dir 下的 `trust.json` [E: packages/coding-agent/src/core/trust-manager.ts:211] [E: packages/coding-agent/src/core/trust-manager.ts:212]。store 查询从 normalized cwd 开始逐级向 parent directory 查找最近的 boolean decision;因此 parent folder decision 会被 child cwd 继承,child cwd 也可以保存自己的 decision 来覆盖 parent decision [E: packages/coding-agent/src/core/trust-manager.ts:43] [E: packages/coding-agent/src/core/trust-manager.ts:48] [E: packages/coding-agent/src/core/trust-manager.ts:52] [I]。

startup prompt 的选项来自 `getProjectTrustOptions(cwd, { includeSessionOnly: true })`,所以除持久化的 Trust / Trust parent folder / Do not trust 外,还会有本 session-only 的 trust 或 do-not-trust 选项 [E: packages/coding-agent/src/core/project-trust.ts:32] [E: packages/coding-agent/src/core/project-trust.ts:35] [E: packages/coding-agent/src/core/trust-manager.ts:82] [E: packages/coding-agent/src/core/trust-manager.ts:92]。session-only 选项的 `updates: []`,而保存 helper 只在 `updates.length > 0` 时写 store,所以它只影响当前 `resolveProjectTrusted()` 返回值 [E: packages/coding-agent/src/core/project-trust.ts:40] [E: packages/coding-agent/src/core/project-trust.ts:42] [I]。

## 信任后的加载范围

信任 project 后,pi 允许加载 `.pi/settings.json`、`.pi` resources、missing project packages、project-local extensions 和 project package-managed extensions [E: packages/coding-agent/docs/security.md:20] [E: packages/coding-agent/docs/security.md:25]。拒绝 trust 时,用户文档说这些 protected resources 会被跳过,但 `AGENTS.md` 和 `CLAUDE.md` context files 除非禁用 context loading,否则仍会加载 [E: packages/coding-agent/docs/security.md:27]。

## 不是安全边界

project trust 是 input-loading guard,不是沙箱:产品安全文档明确说它不限制你进入目录后模型可以请求工具做什么,也不让 untrusted code、untrusted prompts 或 untrusted model output 变安全 [E: packages/coding-agent/docs/security.md:7] [E: packages/coding-agent/docs/security.md:37]。pi 进程本身按启动它的用户账号权限运行,built-in tools 可以读写文件并运行 shell command,extensions 也是同权限 TypeScript modules [E: packages/coding-agent/docs/security.md:3] [E: packages/coding-agent/docs/security.md:33]。因此,处理不可信仓库、无人值守 automation 或不想密切监督的生成代码时,需要用 container、VM、micro-VM、remote sandbox 或 policy-controlled sandbox 承担隔离 [E: packages/coding-agent/docs/security.md:41]。

## 跨节点关系

[subsys.coding-agent.trust-manager](../../subsystems/coding-agent/trust-manager.md) 详写 `ProjectTrustStore`、`getProjectTrustOptions()`、`hasTrustRequiringProjectResources()` 和 `resolveProjectTrusted()` 的内部数据结构与控制流;本节点只面向使用者解释哪些 project inputs 被 gate 以及 decision 的可见效果 [I]。

`surface.extensions.api` 应覆盖 extension API 的注册与事件面;本节点只说明 `project_trust` event 在 trust resolution 里的入口、winner 规则和 result 映射 [E: packages/coding-agent/src/core/project-trust.ts:54] [E: packages/coding-agent/src/core/project-trust.ts:68] [I]。`surface.misc.security` 应覆盖 pi 的总体安全模型;本节点只把 project trust 限定为 input-loading guard,不把它描述成 execution sandbox [E: packages/coding-agent/docs/security.md:31] [E: packages/coding-agent/docs/security.md:37] [I]。

## 未确定边界

`docs/llm-wiki/pi/index.json` 中 `surface.trust.model` 的 source 只列出 `project-trust.ts`、`trust-manager.ts` 和 `docs/security.md`;`/trust` 命令 UI、settings-manager 的 project settings 硬 gate、package-manager 的 project package/resource collection gate、CLI parser 对 override flag 的内部映射、以及 runtime `hasUI` 赋值路径都不在本轮 index source 内,已从本节点显式证据中降级并记录到 staging [U]。

## Sources

- packages/coding-agent/src/core/project-trust.ts
- packages/coding-agent/src/core/trust-manager.ts
- packages/coding-agent/docs/security.md

## 相关

- [subsys.coding-agent.trust-manager](../../subsystems/coding-agent/trust-manager.md): `ProjectTrustStore` 和 `resolveProjectTrusted()` 的内部实现、store 读写、资源探测与 gotcha。
- `surface.extensions.api`: extension API 总览,包含 `project_trust` handler 所属的事件注册面。
- `surface.misc.security`: pi 总体安全模型,包括没有内置 sandbox 和运行不可信工作时的隔离建议。
