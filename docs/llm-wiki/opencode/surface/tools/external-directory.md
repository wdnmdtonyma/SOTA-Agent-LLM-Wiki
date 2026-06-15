---
id: tool.external-directory
title: External-directory 守卫(共享审批 helper)
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/external-directory.ts, packages/core/src/location-mutation.ts]
symbols: [assertExternalDirectoryEffect, assertExternalDirectory, LocationMutation.externalDirectoryPermission]
related: [execution.permissions-v1, ref.permission-actions]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> External-directory 不是一个普通 model-facing tool；它是文件/搜索/shell 工具在访问当前 project/worktree 或 Location 外部路径前触发的额外 approval guard。

## 能回答的问题

- V1 `external_directory` permission 是怎样从目标路径生成 glob 的？
- 哪些 V1 工具调用 `assertExternalDirectoryEffect`？
- V2 external directory guard 由哪个模块承担？
- V1/V2 external approval 的 action/resources/save 分别是什么？
- `bypassCwdCheck` 只影响哪个 V1 工具路径？

## V1

### 1 Identity

V1 external-directory guard 定义在 `packages/opencode/src/tool/external-directory.ts`，导出 `assertExternalDirectoryEffect` 和 Promise wrapper `assertExternalDirectory`。[E: packages/opencode/src/tool/external-directory.ts:15][E: packages/opencode/src/tool/external-directory.ts:47] 该文件呈现为 helper 而不是 `Tool.define(...)` leaf tool [I]；它通过其它工具的 `ctx.ask` 触发 `permission: "external_directory"`。[E: packages/opencode/src/tool/external-directory.ts:35][E: packages/opencode/src/tool/external-directory.ts:36]

### 2 用途定位

V1 guard 的职责是：给定 target path，判断该 path 是否落在当前 `InstanceState.context` 表示的 project/worktree 范围内；如果不在，就要求用户批准其 parent directory glob。[E: packages/opencode/src/tool/external-directory.ts:24][E: packages/opencode/src/tool/external-directory.ts:25][E: packages/opencode/src/tool/external-directory.ts:26][E: packages/opencode/src/tool/external-directory.ts:28][E: packages/opencode/src/tool/external-directory.ts:30]

### 3 输入 schema 表

`external-directory` V1 helper 没有模型输入 schema；它是 TypeScript helper，调用签名是 `assertExternalDirectoryEffect(ctx, target?, options?)`。[E: packages/opencode/src/tool/external-directory.ts:15][E: packages/opencode/src/tool/external-directory.ts:16][E: packages/opencode/src/tool/external-directory.ts:17][E: packages/opencode/src/tool/external-directory.ts:18]

| 参数 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `ctx` | `Tool.Context` | 是 | 无 | 必须提供 `ask` | 发起 approval 请求。[E: packages/opencode/src/tool/external-directory.ts:16][E: packages/opencode/src/tool/tool.ts:45] |
| `target` | `string | undefined` | 否 | 无 | falsy 时直接返回 `false` | 目标文件或目录。[E: packages/opencode/src/tool/external-directory.ts:17][E: packages/opencode/src/tool/external-directory.ts:20] |
| `options.bypass` | `boolean` | 否 | `false` | true 时不请求 approval | 跳过 cwd check。[E: packages/opencode/src/tool/external-directory.ts:10][E: packages/opencode/src/tool/external-directory.ts:22] |
| `options.kind` | `"file" | "directory"` | 否 | `"file"` | directory 时 target 本身作为 directory boundary；file 时取 dirname | 选择 glob boundary。[E: packages/opencode/src/tool/external-directory.ts:8][E: packages/opencode/src/tool/external-directory.ts:28][E: packages/opencode/src/tool/external-directory.ts:29] |

### 4 输出 & 大小/截断限制

V1 helper 返回 boolean：`false` 表示未发起 external approval，`true` 表示发起过 approval。[E: packages/opencode/src/tool/external-directory.ts:20][E: packages/opencode/src/tool/external-directory.ts:22][E: packages/opencode/src/tool/external-directory.ts:44] 它不产生模型输出，因此不经过 tool output truncation。

### 5 权限

V1 external approval 请求 `permission: "external_directory"`，`patterns` 和 `always` 都是 parent directory glob；metadata 包含 `filepath` 和 `parentDir`。[E: packages/opencode/src/tool/external-directory.ts:35][E: packages/opencode/src/tool/external-directory.ts:36][E: packages/opencode/src/tool/external-directory.ts:37][E: packages/opencode/src/tool/external-directory.ts:38][E: packages/opencode/src/tool/external-directory.ts:40][E: packages/opencode/src/tool/external-directory.ts:41] Windows 下 glob 通过 `FSUtil.normalizePathPattern` normalize，非 Windows 下用 `path.join(dir, "*").replaceAll("\\", "/")`。[E: packages/opencode/src/tool/external-directory.ts:30][E: packages/opencode/src/tool/external-directory.ts:32][E: packages/opencode/src/tool/external-directory.ts:33]

### 6 execute() 走读

1. 如果没有 target 或 `options.bypass` 为真，V1 helper 返回 `false`。[E: packages/opencode/src/tool/external-directory.ts:20][E: packages/opencode/src/tool/external-directory.ts:22]
2. V1 helper 读取 `InstanceState.context`，Windows normalize target。[E: packages/opencode/src/tool/external-directory.ts:24][E: packages/opencode/src/tool/external-directory.ts:25]
3. 如果 `containsPath(full, ins)` 为真，说明 target 在当前 instance 内，返回 `false`。[E: packages/opencode/src/tool/external-directory.ts:26]
4. 否则根据 kind 算出 directory boundary 和 glob，调用 `ctx.ask` 请求 external approval，最后返回 `true`。[E: packages/opencode/src/tool/external-directory.ts:28][E: packages/opencode/src/tool/external-directory.ts:29][E: packages/opencode/src/tool/external-directory.ts:30][E: packages/opencode/src/tool/external-directory.ts:35][E: packages/opencode/src/tool/external-directory.ts:44]

### 7 V1 调用点

V1 `read` 在 read permission 前调用 external-directory guard，并允许 `ctx.extra?.bypassCwdCheck` 绕过。[E: packages/opencode/src/tool/read.ts:250][E: packages/opencode/src/tool/read.ts:251] V1 `edit`、`write`、`glob`、`grep`、`apply_patch` 都调用这个 helper；`apply_patch` 对 move target 也调用。[E: packages/opencode/src/tool/edit.ts:83][E: packages/opencode/src/tool/write.ts:44][E: packages/opencode/src/tool/glob.ts:44][E: packages/opencode/src/tool/grep.ts:55][E: packages/opencode/src/tool/apply_patch.ts:74][E: packages/opencode/src/tool/apply_patch.ts:143]

## V2

### 1 Identity

V2 的 external directory guard 由 `LocationMutation` resolve 结果中的 `externalDirectory` 与 `LocationMutation.externalDirectoryPermission(...)` 表示。[E: packages/core/src/location-mutation.ts:28][E: packages/core/src/location-mutation.ts:37][E: packages/core/src/location-mutation.ts:48]

### 2 用途定位

`LocationMutation.resolve` 的注释（location-mutation.ts 行 11–14）说明：mutation paths 不接受 project references；relative path 必须留在 active Location 内；absolute path 在 Location 外部时需要单独 `external_directory` approval；`ResolveInput` 从第 16 行定义。[E: packages/core/src/location-mutation.ts:16][E: packages/core/src/location-mutation.ts:17]

### 3 输入/输出表

V2 guard 的输入是 `LocationMutation.resolve({ path, kind })`，调用方传入该 helper 而不是把它作为独立模型 tool input [I]。[E: packages/core/src/location-mutation.ts:16][E: packages/core/src/location-mutation.ts:19][E: packages/core/src/location-mutation.ts:57][E: packages/core/src/location-mutation.ts:119] resolve 输出 `Target`，包含 canonical path、permission resource、optional `externalDirectory`。[E: packages/core/src/location-mutation.ts:43][E: packages/core/src/location-mutation.ts:45][E: packages/core/src/location-mutation.ts:47][E: packages/core/src/location-mutation.ts:48]

| 结构 | 字段 | 类型 | 说明 |
|---|---|---|---|
| `ResolveInput` | `path` | `string` | 待解析路径。[E: packages/core/src/location-mutation.ts:17] |
| `ResolveInput` | `kind` | optional `"file" | "directory"` | 只选择 external approval boundary，不验证 target type（注释见 location-mutation.ts 行 18）。[E: packages/core/src/location-mutation.ts:19] |
| `ExternalDirectoryAuthorization` | `action` | `"external_directory"` | V2 external permission action。[E: packages/core/src/location-mutation.ts:28][E: packages/core/src/location-mutation.ts:29] |
| `ExternalDirectoryAuthorization` | `resource` / `save` | `string` | parent directory glob resource 与 save pattern。[E: packages/core/src/location-mutation.ts:33][E: packages/core/src/location-mutation.ts:34] |

### 4 权限

V2 `externalDirectoryPermission` 返回 `{ action, resources: [resource], save: [save] }`。[E: packages/core/src/location-mutation.ts:37][E: packages/core/src/location-mutation.ts:38][E: packages/core/src/location-mutation.ts:39][E: packages/core/src/location-mutation.ts:40] V2 `write`、`edit`、`bash`、`apply_patch` 在看到 `externalDirectory` 后都会先调用 `permission.assert`，再请求各自的 edit/bash permission。[E: packages/core/src/tool/write.ts:70][E: packages/core/src/tool/write.ts:71][E: packages/core/src/tool/write.ts:77][E: packages/core/src/tool/write.ts:80][E: packages/core/src/tool/edit.ts:138][E: packages/core/src/tool/edit.ts:140][E: packages/core/src/tool/edit.ts:150][E: packages/core/src/tool/edit.ts:154][E: packages/core/src/tool/bash.ts:131][E: packages/core/src/tool/bash.ts:133][E: packages/core/src/tool/bash.ts:143][E: packages/core/src/tool/bash.ts:146][E: packages/core/src/tool/apply-patch.ts:95][E: packages/core/src/tool/apply-patch.ts:96][E: packages/core/src/tool/apply-patch.ts:103][E: packages/core/src/tool/apply-patch.ts:106]

### 5 resolve() 走读

1. V2 resolve 计算 input 是否 relative、absolute path、lexical containment；relative path 如果逃出 Location，返回 `relative_escape`。[E: packages/core/src/location-mutation.ts:119][E: packages/core/src/location-mutation.ts:120][E: packages/core/src/location-mutation.ts:121][E: packages/core/src/location-mutation.ts:122][E: packages/core/src/location-mutation.ts:123]
2. V2 resolve 对 existing path 用 realpath/stat；对 missing path 向上找到 existing ancestor directory。[E: packages/core/src/location-mutation.ts:89][E: packages/core/src/location-mutation.ts:90][E: packages/core/src/location-mutation.ts:92][E: packages/core/src/location-mutation.ts:100][E: packages/core/src/location-mutation.ts:103][E: packages/core/src/location-mutation.ts:104][E: packages/core/src/location-mutation.ts:113][E: packages/core/src/location-mutation.ts:114]
3. 如果 lexical internal 但 realpath canonical 不在 location root 内，返回 `location_escape`。[E: packages/core/src/location-mutation.ts:125][E: packages/core/src/location-mutation.ts:126][E: packages/core/src/location-mutation.ts:127]
4. external 时，resource 是 canonical slash path；internal 时，resource 是 location-root relative path；external directory glob 是 `path.join(externalDirectory, "*")`。[E: packages/core/src/location-mutation.ts:130][E: packages/core/src/location-mutation.ts:132][E: packages/core/src/location-mutation.ts:133][E: packages/core/src/location-mutation.ts:136]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 形态 | standalone helper `assertExternalDirectoryEffect(ctx, target, options)`。[E: packages/opencode/src/tool/external-directory.ts:15] | `LocationMutation.resolve` 产出 optional authorization，调用方 assert。[E: packages/core/src/location-mutation.ts:48][E: packages/core/src/tool/edit.ts:140][E: packages/core/src/tool/edit.ts:142] |
| resource | parent directory glob，同一 glob 放在 patterns/always。[E: packages/opencode/src/tool/external-directory.ts:30][E: packages/opencode/src/tool/external-directory.ts:37][E: packages/opencode/src/tool/external-directory.ts:38] | `externalDirectoryPermission` 生成 resources/save arrays。[E: packages/core/src/location-mutation.ts:38][E: packages/core/src/location-mutation.ts:39][E: packages/core/src/location-mutation.ts:40] |
| containment | `containsPath(full, ins)` 判定是否在 V1 instance 内。[E: packages/opencode/src/tool/external-directory.ts:26] | lexical + realpath 双重检查 active Location。[E: packages/core/src/location-mutation.ts:122][E: packages/core/src/location-mutation.ts:126] |
| read/search | V1 read/glob/grep 都显式调用 helper。[E: packages/opencode/src/tool/read.ts:250][E: packages/opencode/src/tool/glob.ts:44][E: packages/opencode/src/tool/grep.ts:55] | V2 write/edit/bash/apply_patch 使用 `LocationMutation`；V2 read/grep/glob 使用各自 Location/root 逻辑。[E: packages/core/src/tool/write.ts:68][E: packages/core/src/tool/edit.ts:137][E: packages/core/src/tool/bash.ts:130][E: packages/core/src/tool/apply-patch.ts:89][E: packages/core/src/tool/read.ts:56][E: packages/core/src/tool/grep.ts:93][E: packages/core/src/tool/glob.ts:73][I] |

## 设计动机·edge·历史

External-directory 是权限系统的边界保护，不是普通功能工具。V2 把这个边界并入 `LocationMutation`，使 mutation tool 先统一解析 canonical target/resource，再由每个 trusted tool 自己 formulate permission request；这与 V2 tools spec 中”trusted tools formulate and sequence permission requests，registry does not inject assertPermission helper”的设计一致。[E: specs/v2/tools.md:131][E: packages/core/src/location-mutation.ts:57][E: packages/core/src/location-mutation.ts:119][I]

## Sources

- packages/opencode/src/tool/external-directory.ts
- packages/opencode/src/tool/tool.ts
- packages/opencode/src/tool/read.ts
- packages/opencode/src/tool/edit.ts
- packages/opencode/src/tool/write.ts
- packages/opencode/src/tool/glob.ts
- packages/opencode/src/tool/grep.ts
- packages/opencode/src/tool/apply_patch.ts
- packages/core/src/location-mutation.ts
- packages/core/src/tool/write.ts
- packages/core/src/tool/edit.ts
- packages/core/src/tool/bash.ts
- packages/core/src/tool/apply-patch.ts
- packages/core/src/tool/read.ts
- packages/core/src/tool/glob.ts
- packages/core/src/tool/grep.ts
- specs/v2/tools.md

## 相关

- [V1 权限模型](../../subsystems/execution/permissions-v1.md)
- [权限 action catalog](../../reference/permission-actions.md)
