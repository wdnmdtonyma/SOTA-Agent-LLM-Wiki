---
id: tool.bash
title: Bash/Shell 工具(wire id bash)
kind: tool
tier: T1
v: shared
source: [packages/opencode/src/tool/shell.ts, packages/opencode/src/tool/shell/prompt.ts, packages/core/src/tool/bash.ts]
symbols: [ShellTool, ShellPrompt, BashTool]
related: [execution.shell-v1, execution.shell-v2, ref.bash-arity]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Bash/Shell 工具执行 shell command；V1 文件名是 `shell.ts` 但对外 wire id 与 permission key 都保持 `"bash"`，V2 文件名和 tool name 都是 `bash`。

## 能回答的问题

- 为什么 `packages/opencode/src/tool/shell.ts` 暴露的工具叫 `bash`？
- Bash 输入 schema 的 `command`、`timeout`、`workdir` 在 V1/V2 有什么差异？
- V1 Bash 如何用 tree-sitter 与 `BashArity` 生成 permission patterns？
- V2 Bash 当前有哪些 parity TODO？
- Bash 输出如何截断、何时写 full output 文件？

## V1

### 1 Identity

V1 `ShellTool` 定义在 `packages/opencode/src/tool/shell.ts`，但 `Tool.define` 的 id 是 `ShellID.ToolID`。[E: packages/opencode/src/tool/shell.ts:338][E: packages/opencode/src/tool/shell.ts:339] `ShellID.ToolID` 的值是 `"bash"`，源码注释（id.ts 行 14–15）明确这是为了兼容 existing plugins、users 和 saved permissions。[E: packages/opencode/src/tool/shell/id.ts:16] 因此 V1 的文件名是 `shell.ts`，wire name 与 permission key 都是 `bash`。

### 2 用途定位

V1 Bash 执行用户配置 shell 下的一条命令，并在执行前解析命令 AST：它加载 bash 和 PowerShell tree-sitter WASM parser，`collect()` 扫描 command nodes、路径参数和 command prefix，`ask()` 根据 scan 结果请求 `external_directory` 与 `bash` permission。[E: packages/opencode/src/tool/shell.ts:317][E: packages/opencode/src/tool/shell.ts:328][E: packages/opencode/src/tool/shell.ts:331][E: packages/opencode/src/tool/shell.ts:333][E: packages/opencode/src/tool/shell.ts:378][E: packages/opencode/src/tool/shell.ts:398][E: packages/opencode/src/tool/shell.ts:403][E: packages/opencode/src/tool/shell.ts:408][E: packages/opencode/src/tool/shell.ts:409][E: packages/opencode/src/tool/shell.ts:270][E: packages/opencode/src/tool/shell.ts:283]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `command` | `string` | 是 | 无 | 一条 shell command string | 实际执行内容。[E: packages/opencode/src/tool/shell/prompt.ts:15][E: packages/opencode/src/tool/shell/prompt.ts:17] |
| `timeout` | optional `PositiveInt` | 否 | `flags.bashDefaultTimeoutMs ?? 120000` | 输入 schema 为 `PositiveInt`，已在 schema 层拒绝 0 及负数；shell.ts 的 `< 0` 检查是冗余防御性校验 | timeout milliseconds。[E: packages/opencode/src/tool/shell/prompt.ts:18][E: packages/opencode/src/tool/shell.ts:347][E: packages/opencode/src/tool/shell.ts:615][E: packages/opencode/src/tool/shell.ts:618] |
| `workdir` | optional `string` | 否 | instance directory | 相对路径经 `resolvePath` 解析 | working directory；prompt 要求用这个字段替代 `cd`。[E: packages/opencode/src/tool/shell/prompt.ts:19][E: packages/opencode/src/tool/shell.ts:612][E: packages/opencode/src/tool/shell.ts:613][E: packages/opencode/src/tool/shell.ts:614][E: packages/opencode/src/tool/shell/prompt.ts:112] |

### 4 输出 & 大小/截断限制

V1 Bash 使用 `Truncate.Service.limits()` 取得 `maxLines/maxBytes`，默认值来自 V1 `Truncate` 的 2000 行 / 50KB 或 config override。[E: packages/opencode/src/tool/shell.ts:438][E: packages/opencode/src/tool/truncate.ts:15][E: packages/opencode/src/tool/truncate.ts:16][E: packages/opencode/src/tool/truncate.ts:80][E: packages/opencode/src/tool/truncate.ts:81] 执行时如果 accumulated full output 超过 `limits.maxBytes`，会调用 `trunc.write(full)` 写完整输出并把后续 chunk append 到文件。[E: packages/opencode/src/tool/shell.ts:504][E: packages/opencode/src/tool/shell.ts:505][E: packages/opencode/src/tool/shell.ts:508][E: packages/opencode/src/tool/shell.ts:510] 最终模型输出只保留 tail bounded preview；如果截断且有文件，则前置 `Full output saved to: <file>`。[E: packages/opencode/src/tool/shell.ts:579][E: packages/opencode/src/tool/shell.ts:588][E: packages/opencode/src/tool/shell.ts:589]

metadata 中保存 `output` preview、`exit` code、`truncated` 和可选 `outputPath`。[E: packages/opencode/src/tool/shell.ts:587][E: packages/opencode/src/tool/shell.ts:588][E: packages/opencode/src/tool/shell.ts:589][E: packages/opencode/src/tool/shell.ts:590][E: packages/opencode/src/tool/shell.ts:591] 如果 timeout 或 user abort 发生，V1 Bash 会把原因写入 `<shell_metadata>`。[E: packages/opencode/src/tool/shell.ts:562][E: packages/opencode/src/tool/shell.ts:567][E: packages/opencode/src/tool/shell.ts:582][E: packages/opencode/src/tool/shell.ts:583]

### 5 权限

V1 Bash 的 `ask()` 有两类请求：外部目录请求用 `permission: "external_directory"`，patterns/always 是外部目录 glob；命令请求用 `permission: ShellID.ToolID`，即 `"bash"`，patterns 是 AST 扫描出的 command source，always 是 `BashArity.prefix(tokens).join(" ") + " *"` 形式。[E: packages/opencode/src/tool/shell.ts:270][E: packages/opencode/src/tool/shell.ts:271][E: packages/opencode/src/tool/shell.ts:272][E: packages/opencode/src/tool/shell.ts:273][E: packages/opencode/src/tool/shell.ts:283][E: packages/opencode/src/tool/shell.ts:284][E: packages/opencode/src/tool/shell.ts:285][E: packages/opencode/src/tool/shell.ts:286][E: packages/opencode/src/tool/shell.ts:408][E: packages/opencode/src/tool/shell.ts:409]

### 6 execute() 走读

1. V1 Bash 读取 config shell，选择可接受 shell，渲染 shell-specific prompt 和 parameter schema。[E: packages/opencode/src/tool/shell.ts:599][E: packages/opencode/src/tool/shell.ts:600][E: packages/opencode/src/tool/shell.ts:603][E: packages/opencode/src/tool/shell.ts:607][E: packages/opencode/src/tool/shell.ts:608]
2. execute resolve `workdir`，解析 command tree，调用 `collect()` 扫描 CWD/path args/command patterns；如果 cwd 不在 instance 内，也加入 external directory scan。[E: packages/opencode/src/tool/shell.ts:612][E: packages/opencode/src/tool/shell.ts:622][E: packages/opencode/src/tool/shell.ts:625][E: packages/opencode/src/tool/shell.ts:626]
3. V1 Bash 调 `ask()` 完成 approval 后，用 `shellEnv()` 合并 `process.env` 与 plugin `shell.env` hook 输出。[E: packages/opencode/src/tool/shell.ts:627][E: packages/opencode/src/tool/shell.ts:417][E: packages/opencode/src/tool/shell.ts:418][E: packages/opencode/src/tool/shell.ts:423][E: packages/opencode/src/tool/shell.ts:424]
4. `cmd()` 在 Windows PowerShell 下使用 `-NoLogo -NoProfile -NonInteractive -Command`，其它情况用 shell option 执行 command。[E: packages/opencode/src/tool/shell.ts:295][E: packages/opencode/src/tool/shell.ts:299][E: packages/opencode/src/tool/shell.ts:303][E: packages/opencode/src/tool/shell.ts:308]
5. 执行时同时 race exit、abort、timeout；abort/timeout 都 kill process，timeout 值加 100ms grace。[E: packages/opencode/src/tool/shell.ts:540][E: packages/opencode/src/tool/shell.ts:542][E: packages/opencode/src/tool/shell.ts:548][E: packages/opencode/src/tool/shell.ts:552]

## V2

### 1 Identity

V2 `BashTool` 的 name 常量是 `"bash"`，以 `[name]: Tool.make(...)` 注册到 `Tools.Service`。[E: packages/core/src/tool/bash.ts:18][E: packages/core/src/tool/bash.ts:102][E: packages/core/src/tool/bash.ts:104] V2 permission assert 也用 `action: name`，所以 action 是 `"bash"`。[E: packages/core/src/tool/bash.ts:138][E: packages/core/src/tool/bash.ts:139]

### 2 用途定位

V2 Bash 是 minimal core shell boundary。源码 TODO 块显示 V1 的 tree-sitter approval reduction、`BashArity` reusable prefix approvals、parser-based external-directory detection、Windows shell-specific invocation、plugin `shell.env`、live progress metadata 和 managed-storage streaming 仍是 parity debt；实现入口从 `shellTokens` 开始。[E: packages/core/src/tool/bash.ts:79][I]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `command` | `string` | 是 | 无 | 一条 shell command string | 实际执行内容。[E: packages/core/src/tool/bash.ts:23][E: packages/core/src/tool/bash.ts:24] |
| `workdir` | optional `string` | 否 | active Location | relative path 从 Location resolve | working directory。[E: packages/core/src/tool/bash.ts:25][E: packages/core/src/tool/bash.ts:26][E: packages/core/src/tool/bash.ts:125] |
| `timeout` | optional `PositiveInt <= 600000` | 否 | `120000` | 最大 10 分钟 | timeout milliseconds。[E: packages/core/src/tool/bash.ts:19][E: packages/core/src/tool/bash.ts:20][E: packages/core/src/tool/bash.ts:28][E: packages/core/src/tool/bash.ts:31][E: packages/core/src/tool/bash.ts:161] |

### 4 输出 & 大小/截断限制

V2 Bash 的 `Output` 包含 `output`、`truncated`、optional `exit`、optional `timeout` 和 optional `warnings`；`toStructuredOutput` 只暴露 `truncated` 以及存在时的 `exit`/`timeout`。[E: packages/core/src/tool/bash.ts:35][E: packages/core/src/tool/bash.ts:36][E: packages/core/src/tool/bash.ts:37][E: packages/core/src/tool/bash.ts:38][E: packages/core/src/tool/bash.ts:41][E: packages/core/src/tool/bash.ts:43][E: packages/core/src/tool/bash.ts:44][E: packages/core/src/tool/bash.ts:109][E: packages/core/src/tool/bash.ts:110][E: packages/core/src/tool/bash.ts:111][E: packages/core/src/tool/bash.ts:112] `AppProcess.run` 设置 combined output capture 为 `MAX_CAPTURE_BYTES = 1024 * 1024`，这是一层 producer boundary，不是 V2 registry 的 model-output 50KB 边界。[E: packages/core/src/tool/bash.ts:21][E: packages/core/src/tool/bash.ts:162][E: packages/core/src/tool/bash.ts:164][E: packages/core/src/tool/bash.ts:166][I] 最终 output 仍会经 V2 registry 的 `ToolOutputStore.bound` 做通用 model-facing bounding。[E: packages/core/src/tool/registry.ts:75][E: packages/core/src/tool/registry.ts:76]

### 5 权限

V2 Bash 先 resolve workdir；如果 resolved target 暴露 `externalDirectory`，先 assert `external_directory`；随后 assert `action: "bash"`，resources/save 都是 command string。[E: packages/core/src/tool/bash.ts:125][E: packages/core/src/tool/bash.ts:126][E: packages/core/src/tool/bash.ts:128][E: packages/core/src/tool/bash.ts:129][E: packages/core/src/tool/bash.ts:138][E: packages/core/src/tool/bash.ts:139][E: packages/core/src/tool/bash.ts:140][E: packages/core/src/tool/bash.ts:141] V2 还扫描 command tokens 里的 absolute external path，生成 warnings，但 description 说明这些 command-argument path warnings 是 advisory only，不是 parser-grade approval reduction。[E: packages/core/src/tool/bash.ts:81][E: packages/core/src/tool/bash.ts:85][E: packages/core/src/tool/bash.ts:88][E: packages/core/src/tool/bash.ts:105][E: packages/core/src/tool/bash.ts:134][E: packages/core/src/tool/bash.ts:136]

### 6 execute() 走读

1. V2 Bash 构造 permission source，resolve workdir target，并做 external directory approval。[E: packages/core/src/tool/bash.ts:120][E: packages/core/src/tool/bash.ts:125][E: packages/core/src/tool/bash.ts:126][E: packages/core/src/tool/bash.ts:128]
2. V2 Bash assert `bash` command permission 后，检查 canonical workdir 是 directory。[E: packages/core/src/tool/bash.ts:138][E: packages/core/src/tool/bash.ts:147]
3. V2 Bash 从 config entries 合并 document info，取 `shell` 配置；未配置时 POSIX 用 `/bin/sh`，Windows 用 `COMSPEC ?? "cmd.exe"`。[E: packages/core/src/tool/bash.ts:49][E: packages/core/src/tool/bash.ts:150][E: packages/core/src/tool/bash.ts:151][E: packages/core/src/tool/bash.ts:153]
4. V2 Bash 用 `ChildProcess.make(input.command, [], { shell, cwd, stdin: "ignore", detached, forceKillAfter })` 构造命令并交给 `AppProcess.run`。[E: packages/core/src/tool/bash.ts:154][E: packages/core/src/tool/bash.ts:155][E: packages/core/src/tool/bash.ts:156][E: packages/core/src/tool/bash.ts:157][E: packages/core/src/tool/bash.ts:159][E: packages/core/src/tool/bash.ts:162]
5. timeout 映射为 successful structured output with `timeout: true`；其它 AppProcessError 映射为 ToolFailure。[E: packages/core/src/tool/bash.ts:169][E: packages/core/src/tool/bash.ts:173][E: packages/core/src/tool/bash.ts:175][E: packages/core/src/tool/bash.ts:177][E: packages/core/src/tool/bash.ts:192]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 文件名与 wire id | 文件是 `shell.ts`，tool/permission id 是 `"bash"`。[E: packages/opencode/src/tool/shell.ts:338][E: packages/opencode/src/tool/shell/id.ts:16] | 文件是 `bash.ts`，name/action 都是 `"bash"`。[E: packages/core/src/tool/bash.ts:18][E: packages/core/src/tool/bash.ts:139] |
| 输入字段 | V1 schema 暴露 `command`、`timeout`、`workdir`。[E: packages/opencode/src/tool/shell/prompt.ts:15][E: packages/opencode/src/tool/shell/prompt.ts:17][E: packages/opencode/src/tool/shell/prompt.ts:18][E: packages/opencode/src/tool/shell/prompt.ts:19] | V2 schema 暴露 `command`、`workdir`、`timeout`，且也没有独立 `description` 输入字段。[E: packages/core/src/tool/bash.ts:23][E: packages/core/src/tool/bash.ts:24][E: packages/core/src/tool/bash.ts:25][E: packages/core/src/tool/bash.ts:28] |
| approval reduction | tree-sitter + command/path scan + `BashArity.prefix`。[E: packages/opencode/src/tool/shell.ts:257][E: packages/opencode/src/tool/shell.ts:398][E: packages/opencode/src/tool/shell.ts:409] | command permission 是整条 command；absolute path token 只生成 warnings。[E: packages/core/src/tool/bash.ts:138][E: packages/core/src/tool/bash.ts:134] |
| plugin env | 触发 `shell.env` hook。[E: packages/opencode/src/tool/shell.ts:418][E: packages/opencode/src/tool/shell.ts:424] | `shell.env` 是 TODO；execute 只用 `config.entries()` 合并 shell 配置。[E: packages/core/src/tool/bash.ts:150][E: packages/core/src/tool/bash.ts:153][I] |
| full output retention | V1 shell 自己在超过 byte cap 时写 truncation file，并在 output 里暴露路径。[E: packages/opencode/src/tool/shell.ts:505][E: packages/opencode/src/tool/shell.ts:591] | V2 Bash 目前只做 1MB combined in-memory capture；stream-to-managed-storage 是 TODO。[E: packages/core/src/tool/bash.ts:21][E: packages/core/src/tool/bash.ts:166][I] |

## 设计动机·edge·历史

`ShellID.ToolID` 注释（id.ts 行 14–15）是这个节点的命名陷阱权威证据：V1 为兼容 saved permissions 和插件，工具名继续叫 `bash`，即使实现文件和内部服务名叫 shell。[E: packages/opencode/src/tool/shell/id.ts:16] V2 选择 minimal core boundary，并在 TODO 块中显式列出不立即搬迁 V1 shell runtime 的债务，说明 V2 当前优先确保 core shell boundary 能运行，而不是一次复制全部 V1 shell 智能审批。[I]

## Sources

- packages/opencode/src/tool/shell.ts
- packages/opencode/src/tool/shell/prompt.ts
- packages/opencode/src/tool/shell/id.ts
- packages/opencode/src/tool/truncate.ts
- packages/core/src/tool/bash.ts
- packages/core/src/tool/registry.ts

## 相关

- [V1 shell 执行](../../subsystems/execution/shell-v1.md)
- [V2 bash 工具](../../subsystems/execution/shell-v2.md)
- [Bash 命令 arity 表](../../reference/bash-arity.md)
