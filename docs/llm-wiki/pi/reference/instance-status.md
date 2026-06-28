---
id: ref.orchestrator.instance-status
title: 实例状态与记录
kind: reference
tier: T3
pkg: orchestrator
source:
  - packages/orchestrator/src/types.ts
  - packages/orchestrator/src/config.ts
symbols:
  - InstanceStatus
  - InstanceRecord
related:
  - subsys.orchestrator.storage
evidence: explicit
status: verified
updated: 5a073885
---

> `ref.orchestrator.instance-status` 是 orchestrator instance metadata 的窄口径引用节点:只枚举 `InstanceStatus`、`InstanceRecord` 以及 `config.ts` 中可直接核验的本地路径 helper。

## 能回答的问题

- `InstanceStatus` 当前允许哪些字符串值?
- `InstanceRecord` 当前声明了哪些 required 与 optional 字段?
- `instances.json`、`auth.json`、`machine.json`、`orchestrator.sock` 的路径 helper 如何派生文件名?
- orchestrator directory 当前优先读哪个环境变量,没有时回退到哪里?

## InstanceStatus union

`InstanceStatus` 是一个 TypeScript string union,当前只包含 `"starting"`、`"online"`、`"stopping"`、`"stopped"`、`"error"` 五个字面量值。[E: packages/orchestrator/src/types.ts:1]

| 状态值 | 类型含义 | 源码证据 |
| --- | --- | --- |
| `starting` | `InstanceStatus` 的合法字符串字面量之一。 | [E: packages/orchestrator/src/types.ts:1] |
| `online` | `InstanceStatus` 的合法字符串字面量之一。 | [E: packages/orchestrator/src/types.ts:1] |
| `stopping` | `InstanceStatus` 的合法字符串字面量之一。 | [E: packages/orchestrator/src/types.ts:1] |
| `stopped` | `InstanceStatus` 的合法字符串字面量之一。 | [E: packages/orchestrator/src/types.ts:1] |
| `error` | `InstanceStatus` 的合法字符串字面量之一。 | [E: packages/orchestrator/src/types.ts:1] |

## InstanceRecord 字段目录

`InstanceRecord` 是一个 interface,包含四个 required 字段和五个 optional 字段;其中 `status` 字段引用 `InstanceStatus` union。[E: packages/orchestrator/src/types.ts:15][E: packages/orchestrator/src/types.ts:17]

| 字段 | TypeScript 声明 | 必填性 | 类型含义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `id` | `id: string` | required | instance record 的字符串标识字段。 | [E: packages/orchestrator/src/types.ts:16] |
| `status` | `status: InstanceStatus` | required | instance record 的状态字段,取值受 `InstanceStatus` 限定。 | [E: packages/orchestrator/src/types.ts:17] |
| `cwd` | `cwd: string` | required | instance record 的工作目录字符串字段。 | [E: packages/orchestrator/src/types.ts:18] |
| `createdAt` | `createdAt: string` | required | instance record 的创建时间字符串字段。 | [E: packages/orchestrator/src/types.ts:19] |
| `lastSeenAt` | `lastSeenAt?: string` | optional | instance record 的最近可见时间字符串字段。 | [E: packages/orchestrator/src/types.ts:20] |
| `label` | `label?: string` | optional | instance record 的可选标签字符串字段。 | [E: packages/orchestrator/src/types.ts:21] |
| `sessionId` | `sessionId?: string` | optional | instance record 的可选 session id 字符串字段。 | [E: packages/orchestrator/src/types.ts:22] |
| `sessionFile` | `sessionFile?: string` | optional | instance record 的可选 session file 字符串字段。 | [E: packages/orchestrator/src/types.ts:23] |
| `radiusPiId` | `radiusPiId?: string` | optional | instance record 的可选 Radius Pi id 字符串字段。 | [E: packages/orchestrator/src/types.ts:24] |

## Config 路径 helper

`getOrchestratorDir()` 先读取 `process.env[ENV_ORCHESTRATOR_DIR]`,而 `ENV_ORCHESTRATOR_DIR` 的字符串值是 `"PI_ORCHESTRATOR_DIR"`;当该环境变量存在时,函数直接返回环境变量值。[E: packages/orchestrator/src/config.ts:7][E: packages/orchestrator/src/config.ts:45][E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:47][E: packages/orchestrator/src/config.ts:48]

当 `PI_ORCHESTRATOR_DIR` 不存在时,`getOrchestratorDir()` 使用 `process.env.PI_CONFIG_DIR || join(homedir(), CONFIG_DIR_NAME)` 得到 pi config root,再返回 `join(piDir, "orchestrator")`;`CONFIG_DIR_NAME` 当前是 `".pi"`。[E: packages/orchestrator/src/config.ts:6][E: packages/orchestrator/src/config.ts:51][E: packages/orchestrator/src/config.ts:52]

| helper | 返回表达式 | 类型含义 | 源码证据 |
| --- | --- | --- | --- |
| `getAuthPath()` | `join(getOrchestratorDir(), "auth.json")` | orchestrator auth JSON 文件路径。 | [E: packages/orchestrator/src/config.ts:55][E: packages/orchestrator/src/config.ts:56] |
| `getMachinePath()` | `join(getOrchestratorDir(), "machine.json")` | orchestrator machine JSON 文件路径。 | [E: packages/orchestrator/src/config.ts:59][E: packages/orchestrator/src/config.ts:60] |
| `getInstancesPath()` | `join(getOrchestratorDir(), "instances.json")` | orchestrator instances JSON 文件路径。 | [E: packages/orchestrator/src/config.ts:63][E: packages/orchestrator/src/config.ts:64] |
| `getSocketPath()` | `join(getOrchestratorDir(), "orchestrator.sock")` | orchestrator Unix socket 文件路径。 | [E: packages/orchestrator/src/config.ts:67][E: packages/orchestrator/src/config.ts:68] |

## 边界

本节点不逐条证明状态写入点、状态迁移、JSON 读写、restart recovery 或 supervisor lifecycle;这些属于 [subsys.orchestrator.storage](../subsystems/orchestrator/storage.md) 与 supervisor 相关节点的行为范围。[I]

`InstanceRecord` 字段名与 `getInstancesPath()` 文件名之间的关系可作为检索背景理解,但 `types.ts` 与 `config.ts` 本身只证明 interface shape 和路径 helper,不单独证明 `instances.json` 的完整 runtime schema、migration 或 locking 语义。[I]

## Sources

- `packages/orchestrator/src/types.ts`
- `packages/orchestrator/src/config.ts`

## 相关

- [subsys.orchestrator.storage](../subsystems/orchestrator/storage.md): `instances.json` 的读写、upsert/remove 与 instance record 持久化行为。
