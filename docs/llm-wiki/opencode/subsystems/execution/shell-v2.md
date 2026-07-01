---
id: execution.shell-v2
title: V2 bash 工具(精简移植+欠债)
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/tool/bash.ts
  - packages/core/src/tool/builtins.ts
  - packages/core/src/tool/tools.ts
  - packages/core/src/location-mutation.ts
  - packages/core/src/permission.ts
  - specs/v2/session.md
symbols:
  - BashTool
  - BashTool.Input
  - BashTool.Output
  - externalCommandDirectories
related:
  - execution.shell-v1
  - tool.bash
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 bash 工具是 `packages/core/src/tool/bash.ts` 中的精简 core built-in：它用 V2 `Tools.register` 注册 `"bash"`，按 `LocationMutation` 解析 workdir，按 `PermissionV2.assert` 审批 command，但把 V1 tree-sitter、BashArity、streaming spill、background 等能力显式列为 TODO。

## 能回答的问题

- V2 bash 的 input/output schema 与 V1 shell 有哪些差异？
- V2 bash 是否继承 V1 tree-sitter parser approval？
- V2 bash 的 `external_directory` 是强制审批还是 advisory warning？
- V2 bash 如何处理 timeout、stdout/stderr 截断和 shell 选择？
- V2 builtins 是否已经包含 `bash`？

## 职责边界

V2 `BashTool.name` 是 `"bash"`，默认 timeout 是 120,000ms，最大 timeout 是 600,000ms，combined output capture 上限是 1MiB [E: packages/core/src/tool/bash.ts:18] [E: packages/core/src/tool/bash.ts:19] [E: packages/core/src/tool/bash.ts:20] [E: packages/core/src/tool/bash.ts:21]。`BuiltInTools.node` 把 `BashTool.node` 合并进 shipped Location-scoped built-ins [E: packages/core/src/tool/builtins.ts:31] [E: packages/core/src/tool/builtins.ts:36]。V2 `Tools.Service` 只是窄注册能力，接口只有 `register(record)` [E: packages/core/src/tool/tools.ts:6] [E: packages/core/src/tool/tools.ts:9]。

## 输入与输出 schema

| 字段 | 类型 | 必填 | 默认/限制 | 说明 | 证据 |
|---|---|---:|---|---|---|
| `command` | string | 是 | 无 | 要执行的 shell command string | [E: packages/core/src/tool/bash.ts:23] [E: packages/core/src/tool/bash.ts:24] |
| `workdir` | string | 否 | active Location | 相对路径从 Location 解析；外部目录需要 approval | [E: packages/core/src/tool/bash.ts:25] [E: packages/core/src/tool/bash.ts:125] [E: packages/core/src/tool/bash.ts:128] |
| `timeout` | positive int | 否 | 默认 120000，最大 600000 | `PositiveInt` 且小于等于 `MAX_TIMEOUT_MS` | [E: packages/core/src/tool/bash.ts:28] [E: packages/core/src/tool/bash.ts:31] |
| `Output.exit` | number | 否 | timeout 时 absent | 进程退出码 | [E: packages/core/src/tool/bash.ts:35] [E: packages/core/src/tool/bash.ts:36] |
| `Output.truncated` | boolean | 是 | 无 | combined output capture 是否截断 | [E: packages/core/src/tool/bash.ts:37] |
| `Output.timeout` | boolean | 否 | timeout 时 true | 超时标记 | [E: packages/core/src/tool/bash.ts:38] |
| `Output.output` | string | 是 | empty 变 `(no output)` | combined output 文本 | [E: packages/core/src/tool/bash.ts:41] [E: packages/core/src/tool/bash.ts:43] [E: packages/core/src/tool/bash.ts:182] |
| `Output.warnings` | string[] | 否 | 无 | 外部 absolute command args 的 advisory warnings | [E: packages/core/src/tool/bash.ts:44] |

## 控制流

1. `BashTool.layer` 取得 `Tools.Service`、`LocationMutation.Service`、`FSUtil.Service`、`AppProcess.Service`、`Config.Service`、`PermissionV2.Service` [E: packages/core/src/tool/bash.ts:93] [E: packages/core/src/tool/bash.ts:95] [E: packages/core/src/tool/bash.ts:96] [E: packages/core/src/tool/bash.ts:97] [E: packages/core/src/tool/bash.ts:98] [E: packages/core/src/tool/bash.ts:99] [E: packages/core/src/tool/bash.ts:100]。
2. 注册名 `"bash"` 的 `Tool.make`，description 明确说命令以 host user 的 filesystem/process/network authority 执行，active Location 是默认 cwd [E: packages/core/src/tool/bash.ts:103] [E: packages/core/src/tool/bash.ts:105]。
3. `execute` 构造 tool source `{ type: "tool", messageID, callID }`，用于 permission request 绑定 assistant/tool call identity [E: packages/core/src/tool/bash.ts:118] [E: packages/core/src/tool/bash.ts:120] [E: packages/core/src/tool/bash.ts:123]。
4. `mutation.resolve({ path: input.workdir ?? ".", kind: "directory" })` 解析 cwd；如果 target 有 `externalDirectory`，先 assert `external_directory` [E: packages/core/src/tool/bash.ts:125] [E: packages/core/src/tool/bash.ts:126] [E: packages/core/src/tool/bash.ts:128] [E: packages/core/src/tool/bash.ts:129]。
5. `externalCommandDirectories(input.command, target.canonical)` 用正则 token 扫绝对路径；这些只生成 warnings，不触发 `external_directory` approval [E: packages/core/src/tool/bash.ts:81] [E: packages/core/src/tool/bash.ts:134] [I]。
6. command 本身通过 `PermissionV2.assert({ action: "bash", resources: [input.command], save: [input.command] })` 审批 [E: packages/core/src/tool/bash.ts:138] [E: packages/core/src/tool/bash.ts:139] [E: packages/core/src/tool/bash.ts:140] [E: packages/core/src/tool/bash.ts:141]。
7. 运行前用 `fs.stat(target.canonical)` 验证 cwd 是 Directory [E: packages/core/src/tool/bash.ts:147]。
8. shell 来自 config entries 合并后的 `.shell`，未配置时 POSIX 用 `/bin/sh`、Windows 用 `COMSPEC ?? "cmd.exe"` [E: packages/core/src/tool/bash.ts:49] [E: packages/core/src/tool/bash.ts:150] [E: packages/core/src/tool/bash.ts:153]。
9. 进程通过 `ChildProcess.make(input.command, [], { cwd, shell, stdin: "ignore", detached, forceKillAfter: 3s })` 交给 `AppProcess.run`，并设置 timeout 与 combined output byte limit [E: packages/core/src/tool/bash.ts:154] [E: packages/core/src/tool/bash.ts:159] [E: packages/core/src/tool/bash.ts:162] [E: packages/core/src/tool/bash.ts:166]。
10. `AppProcessError` 中 message 为 `"Timed out"` 的错误被转成 `undefined` result；timeout 返回 `timeout: true` 和可重试提示 [E: packages/core/src/tool/bash.ts:59] [E: packages/core/src/tool/bash.ts:169] [E: packages/core/src/tool/bash.ts:170] [E: packages/core/src/tool/bash.ts:173] [E: packages/core/src/tool/bash.ts:177]。
11. 成功 result 把 combined output UTF-8 decode，若 capture 截断则追加 notice 并设置 `truncated` [E: packages/core/src/tool/bash.ts:182] [E: packages/core/src/tool/bash.ts:183] [E: packages/core/src/tool/bash.ts:188] [E: packages/core/src/tool/bash.ts:189]。
12. 任意非 `ToolFailure` 错误最终被包装成 `ToolFailure({ message: "Unable to execute command: ..." })` [E: packages/core/src/tool/bash.ts:192]。

## 与 V1 shell 的差异

V2 bash 当前实现只用 `shellTokens` 正则拆分 command token，并把绝对路径 token 归约成 advisory external-directory warning；它没有调用 V1 的 tree-sitter parser、`BashArity.prefix`、plugin `shell.env` hook 或 truncation file service [E: packages/core/src/tool/bash.ts:79] [E: packages/core/src/tool/bash.ts:81] [I]。因此不能把 V1 的 AST 审批精度、streaming spill 或 plugin env 视为 V2 当前行为。

V2 session spec 对 bash 当前语义有明确约束：V2 `bash` 使用 configured agent rules 加 saved project approvals，no rule match 默认 ask；bash 不 sandbox，spawned shell 以 host user's filesystem/process/network authority 运行；外部 `workdir` 是 enforced `external_directory` check；绝对 command arguments 的扫描只是 advisory warnings [E: specs/v2/session.md:204]。

## 设计动机与权衡

V2 的精简实现把 command execution 放进 core tool contract：tool layer 直接依赖 `LocationMutation.Service`、`AppProcess.Service`、`PermissionV2.Service`，并把 shell call 交给 `AppProcess.run` [E: packages/core/src/tool/bash.ts:96] [E: packages/core/src/tool/bash.ts:98] [E: packages/core/src/tool/bash.ts:100] [E: packages/core/src/tool/bash.ts:162]。这牺牲了 V1 的审批智能与 UI streaming，但减少了 V2 core 对 V1 tree-sitter runtime、plugin hook 和 truncation service 的耦合 [I]。

## Gotcha

- V2 bash 的 external command path scan 是 warning，不是 approval；只有外部 `workdir` 通过 `LocationMutation.externalDirectoryPermission` 强制 assert。
- V2 bash 没有 V1 的 `BashArity.prefix` always pattern，当前 saved resource 是完整 `input.command`。
- V2 `bash` input 里没有 `description` 字段；V1 当前 shell prompt schema 也只暴露 `command`、`timeout`、`workdir`。
- V2 `ToolFailure` 包装会吞掉底层具体错误细节，model 看到的是 `Unable to execute command: <command>`。

## Sources

- packages/core/src/tool/bash.ts
- packages/core/src/tool/builtins.ts
- packages/core/src/tool/tools.ts
- packages/core/src/location-mutation.ts
- packages/core/src/permission.ts
- specs/v2/session.md

## 相关

- [V1 shell 执行](shell-v1.md)
- [Bash/Shell 工具](../../surface/tools/bash.md)
