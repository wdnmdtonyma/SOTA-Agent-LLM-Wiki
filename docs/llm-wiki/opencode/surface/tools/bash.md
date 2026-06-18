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
updated: 355a0bcf5
---

> Bash/Shell 工具执行 shell command；V1 文件名是 `shell.ts` 但对外 wire id 与 permission key 都保持 `"bash"`，V2 文件名和 tool name 都是 `bash`。

## 能回答的问题

- 为什么 `packages/opencode/src/tool/shell.ts` 暴露的工具叫 `bash`？
- Bash 输入 schema 的 `command`、`timeout`、`workdir`、`description` 在 V1/V2 有什么差异？
- V1 Bash 如何用 tree-sitter 与 `BashArity` 生成 permission patterns？
- V2 Bash 当前有哪些 parity TODO？
- Bash 输出如何截断、何时写 full output 文件？

## V1

### 1 Identity

V1 `ShellTool` 定义在 `packages/opencode/src/tool/shell.ts`，但 `Tool.define` 的 id 是 `ShellID.ToolID`。[E: packages/opencode/src/tool/shell.ts:344][E: packages/opencode/src/tool/shell.ts:345] `ShellID.ToolID` 的值是 `"bash"`，源码注释（id.ts 行 14–15）明确这是为了兼容 existing plugins、users 和 saved permissions。[E: packages/opencode/src/tool/shell/id.ts:16] 因此 V1 的文件名是 `shell.ts`，wire name 与 permission key 都是 `bash`。

### 2 用途定位

V1 Bash 执行用户配置 shell 下的一条命令，并在执行前解析命令 AST：它加载 bash 和 PowerShell tree-sitter WASM parser，`collect()` 扫描 command nodes、路径参数和 command prefix，`ask()` 根据 scan 结果请求 `external_directory` 与 `bash` permission。[E: packages/opencode/src/tool/shell.ts:317][E: packages/opencode/src/tool/shell.ts:328][E: packages/opencode/src/tool/shell.ts:331][E: packages/opencode/src/tool/shell.ts:336][E: packages/opencode/src/tool/shell.ts:384][E: packages/opencode/src/tool/shell.ts:403][E: packages/opencode/src/tool/shell.ts:413][E: packages/opencode/src/tool/shell.ts:274][E: packages/opencode/src/tool/shell.ts:288]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `command` | `string` | 是 | 无 | 一条 shell command string | 实际执行内容。[E: packages/opencode/src/tool/shell/prompt.ts:22][E: packages/opencode/src/tool/shell/prompt.ts:24] |
| `timeout` | optional `PositiveInt` | 否 | `flags.bashDefaultTimeoutMs ?? 120000` | 输入 schema 为 `PositiveInt`，已在 schema 层拒绝 0 及负数；shell.ts 行 626 的 `< 0` 检查是冗余防御性校验 | timeout milliseconds。[E: packages/opencode/src/tool/shell/prompt.ts:25][E: packages/opencode/src/tool/shell.ts:353][E: packages/opencode/src/tool/shell.ts:626][E: packages/opencode/src/tool/shell.ts:629] |
| `workdir` | optional `string` | 否 | instance directory | 相对路径经 `resolvePath` 解析 | working directory；prompt 要求用这个字段替代 `cd`。[E: packages/opencode/src/tool/shell/prompt.ts:26][E: packages/opencode/src/tool/shell.ts:624][E: packages/opencode/src/tool/shell.ts:625][E: packages/opencode/src/tool/shell/prompt.ts:121] |
| `description` | `string` | 是 | 无 | prompt 要求 5-10 words | UI title 与 metadata description。[E: packages/opencode/src/tool/shell/prompt.ts:29][E: packages/opencode/src/tool/shell.ts:596][E: packages/opencode/src/tool/shell.ts:600] |

### 4 输出 & 大小/截断限制

V1 Bash 使用 `Truncate.Service.limits()` 取得 `maxLines/maxBytes`，默认值来自 V1 `Truncate` 的 2000 行 / 50KB 或 config override。[E: packages/opencode/src/tool/shell.ts:445][E: packages/opencode/src/tool/truncate.ts:15][E: packages/opencode/src/tool/truncate.ts:16][E: packages/opencode/src/tool/truncate.ts:80][E: packages/opencode/src/tool/truncate.ts:81] 执行时如果 accumulated full output 超过 `limits.maxBytes`，会调用 `trunc.write(full)` 写完整输出并把后续 chunk append 到文件。[E: packages/opencode/src/tool/shell.ts:512][E: packages/opencode/src/tool/shell.ts:513][E: packages/opencode/src/tool/shell.ts:516][E: packages/opencode/src/tool/shell.ts:518] 最终模型输出只保留 tail bounded preview；如果截断且有文件，则前置 `Full output saved to: <file>`。[E: packages/opencode/src/tool/shell.ts:579][E: packages/opencode/src/tool/shell.ts:588][E: packages/opencode/src/tool/shell.ts:589]

metadata 中保存 `output` preview、`exit` code、`description`、`truncated` 和可选 `outputPath`。[E: packages/opencode/src/tool/shell.ts:598][E: packages/opencode/src/tool/shell.ts:599][E: packages/opencode/src/tool/shell.ts:600][E: packages/opencode/src/tool/shell.ts:601][E: packages/opencode/src/tool/shell.ts:602] 如果 timeout 或 user abort 发生，V1 Bash 会把原因写入 `<shell_metadata>`。[E: packages/opencode/src/tool/shell.ts:571][E: packages/opencode/src/tool/shell.ts:574][E: packages/opencode/src/tool/shell.ts:577][E: packages/opencode/src/tool/shell.ts:593]

### 5 权限

V1 Bash 的 `ask()` 有两类请求：外部目录请求用 `permission: "external_directory"`，patterns/always 是外部目录 glob；命令请求用 `permission: ShellID.ToolID`，即 `"bash"`，patterns 是 AST 扫描出的 command source，always 是 `BashArity.prefix(tokens).join(" ") + " *"` 形式。[E: packages/opencode/src/tool/shell.ts:274][E: packages/opencode/src/tool/shell.ts:276][E: packages/opencode/src/tool/shell.ts:277][E: packages/opencode/src/tool/shell.ts:288][E: packages/opencode/src/tool/shell.ts:290][E: packages/opencode/src/tool/shell.ts:291][E: packages/opencode/src/tool/shell.ts:414][E: packages/opencode/src/tool/shell.ts:415]

### 6 execute() 走读

1. V1 Bash 读取 config shell，选择可接受 shell，渲染 shell-specific prompt 和 parameter schema。[E: packages/opencode/src/tool/shell.ts:610][E: packages/opencode/src/tool/shell.ts:611][E: packages/opencode/src/tool/shell.ts:614][E: packages/opencode/src/tool/shell.ts:617]
2. execute resolve `workdir`，解析 command tree，调用 `collect()` 扫描 CWD/path args/command patterns；如果 cwd 不在 instance 内，也加入 external directory scan。[E: packages/opencode/src/tool/shell.ts:622][E: packages/opencode/src/tool/shell.ts:633][E: packages/opencode/src/tool/shell.ts:636][E: packages/opencode/src/tool/shell.ts:637]
3. V1 Bash 调 `ask()` 完成 approval 后，用 `shellEnv()` 合并 `process.env` 与 plugin `shell.env` hook 输出。[E: packages/opencode/src/tool/shell.ts:638][E: packages/opencode/src/tool/shell.ts:422][E: packages/opencode/src/tool/shell.ts:423][E: packages/opencode/src/tool/shell.ts:429]
4. `cmd()` 在 Windows PowerShell 下使用 `-NoLogo -NoProfile -NonInteractive -Command`，其它情况用 shell option 执行 command。[E: packages/opencode/src/tool/shell.ts:299][E: packages/opencode/src/tool/shell.ts:301][E: packages/opencode/src/tool/shell.ts:309]
5. 执行时同时 race exit、abort、timeout；abort/timeout 都 kill process，timeout 值加 100ms grace。[E: packages/opencode/src/tool/shell.ts:550][E: packages/opencode/src/tool/shell.ts:552][E: packages/opencode/src/tool/shell.ts:558][E: packages/opencode/src/tool/shell.ts:562]

## V2

### 1 Identity

V2 `BashTool` 的 name 常量是 `"bash"`，以 `[name]: Tool.make(...)` 注册到 `Tools.Service`。[E: packages/core/src/tool/bash.ts:16][E: packages/core/src/tool/bash.ts:116][E: packages/core/src/tool/bash.ts:118] V2 permission assert 也用 `action: name`，所以 action 是 `"bash"`。[E: packages/core/src/tool/bash.ts:143][E: packages/core/src/tool/bash.ts:144]

### 2 用途定位

V2 Bash 是 minimal core shell boundary。文件 76–91 行的 TODO 块明确保留 V1 parity debt：tree-sitter bash/PowerShell approval reduction、`BashArity` reusable prefix approvals、parser-based external-directory detection、Windows shell-specific invocation、plugin `shell.env`、live progress metadata 和 managed-storage streaming 都还没移植；实现入口从 `shellTokens` 开始。[E: packages/core/src/tool/bash.ts:93][E: packages/core/src/tool/bash.ts:107]

### 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `command` | `string` | 是 | 无 | 一条 shell command string | 实际执行内容。[E: packages/core/src/tool/bash.ts:21][E: packages/core/src/tool/bash.ts:22] |
| `workdir` | optional `string` | 否 | active Location | relative path 从 Location resolve | working directory。[E: packages/core/src/tool/bash.ts:23][E: packages/core/src/tool/bash.ts:24][E: packages/core/src/tool/bash.ts:130] |
| `timeout` | optional `PositiveInt <= 600000` | 否 | `120000` | 最大 10 分钟 | timeout milliseconds。[E: packages/core/src/tool/bash.ts:17][E: packages/core/src/tool/bash.ts:18][E: packages/core/src/tool/bash.ts:26][E: packages/core/src/tool/bash.ts:166] |
| `description` | optional `string` | 否 | 无 | 仅描述用途 | V2 中不是必填；V1 是必填。[E: packages/core/src/tool/bash.ts:31][E: packages/core/src/tool/bash.ts:32] |

### 4 输出 & 大小/截断限制

V2 Bash 的 `Output` 包含 `command`、`cwd`、optional `exitCode`、`output`、`truncated`、optional stdout/stderr truncation flags、optional `timedOut` 和 optional `warnings`。[E: packages/core/src/tool/bash.ts:37][E: packages/core/src/tool/bash.ts:46] `AppProcess.run` 设置 stdout/stderr capture 各 `MAX_CAPTURE_BYTES = 1024 * 1024`，这是一层 producer boundary，不是 V2 registry 的 model-output 50KB 边界。[E: packages/core/src/tool/bash.ts:19][E: packages/core/src/tool/bash.ts:167][E: packages/core/src/tool/bash.ts:170][E: packages/core/src/tool/bash.ts:171][I] 最终 output 仍会经 V2 registry 的 `ToolOutputStore.bound` 做通用 model-facing bounding。[E: packages/core/src/tool/registry.ts:73][E: packages/core/src/tool/registry.ts:74]

### 5 权限

V2 Bash 先 resolve workdir；如果 resolved target 暴露 `externalDirectory`，先 assert `external_directory`；随后 assert `action: "bash"`，resources/save 都是 command string。[E: packages/core/src/tool/bash.ts:130][E: packages/core/src/tool/bash.ts:131][E: packages/core/src/tool/bash.ts:133][E: packages/core/src/tool/bash.ts:137][E: packages/core/src/tool/bash.ts:143][E: packages/core/src/tool/bash.ts:145][E: packages/core/src/tool/bash.ts:146] V2 还扫描 command tokens 里的 absolute external path，生成 warnings，但注释/描述说明这些 command-argument path warnings 是 advisory only，不是 parser-grade approval reduction。[E: packages/core/src/tool/bash.ts:99][E: packages/core/src/tool/bash.ts:102][E: packages/core/src/tool/bash.ts:139][E: packages/core/src/tool/bash.ts:141]

### 6 execute() 走读

1. V2 Bash 构造 permission source，resolve workdir target，并做 external directory approval。[E: packages/core/src/tool/bash.ts:125][E: packages/core/src/tool/bash.ts:130][E: packages/core/src/tool/bash.ts:133][E: packages/core/src/tool/bash.ts:137]
2. V2 Bash assert `bash` command permission 后，检查 canonical workdir 是 directory。[E: packages/core/src/tool/bash.ts:143][E: packages/core/src/tool/bash.ts:152]
3. V2 Bash 从 config entries 合并 document info，取 `shell` 配置；未配置时 POSIX 用 `/bin/sh`，Windows 用 `COMSPEC ?? "cmd.exe"`。[E: packages/core/src/tool/bash.ts:51][E: packages/core/src/tool/bash.ts:155][E: packages/core/src/tool/bash.ts:158]
4. V2 Bash 用 `ChildProcess.make(input.command, [], { shell, cwd, stdin: "ignore", detached, forceKillAfter })` 构造命令并交给 `AppProcess.run`。[E: packages/core/src/tool/bash.ts:159][E: packages/core/src/tool/bash.ts:160][E: packages/core/src/tool/bash.ts:163][E: packages/core/src/tool/bash.ts:164][E: packages/core/src/tool/bash.ts:167]
5. timeout 映射为 successful structured output with `timedOut: true`；其它 AppProcessError 映射为 ToolFailure。[E: packages/core/src/tool/bash.ts:174][E: packages/core/src/tool/bash.ts:178][E: packages/core/src/tool/bash.ts:184][E: packages/core/src/tool/bash.ts:201]

## V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| 文件名与 wire id | 文件是 `shell.ts`，tool/permission id 是 `"bash"`。[E: packages/opencode/src/tool/shell.ts:344][E: packages/opencode/src/tool/shell/id.ts:16] | 文件是 `bash.ts`，name/action 都是 `"bash"`。[E: packages/core/src/tool/bash.ts:16][E: packages/core/src/tool/bash.ts:144] |
| description 字段 | required。[E: packages/opencode/src/tool/shell/prompt.ts:29] | optional。[E: packages/core/src/tool/bash.ts:31] |
| approval reduction | tree-sitter + command/path scan + `BashArity.prefix`。[E: packages/opencode/src/tool/shell.ts:257][E: packages/opencode/src/tool/shell.ts:398][E: packages/opencode/src/tool/shell.ts:415] | command permission 是整条 command；absolute path token 只生成 warnings。[E: packages/core/src/tool/bash.ts:143][E: packages/core/src/tool/bash.ts:139] |
| plugin env | 触发 `shell.env` hook。[E: packages/opencode/src/tool/shell.ts:423][E: packages/opencode/src/tool/shell.ts:430] | `shell.env` 是 TODO（bash.ts 行 84）；execute 只用 `config.entries()` 合并 shell 配置。[E: packages/core/src/tool/bash.ts:155][E: packages/core/src/tool/bash.ts:158] |
| full output retention | V1 shell 自己在超过 byte cap 时写 truncation file，并在 output 里暴露路径。[E: packages/opencode/src/tool/shell.ts:512][E: packages/opencode/src/tool/shell.ts:589] | V2 Bash 目前只做 1MB stdout/stderr in-memory capture；stream-to-managed-storage 是 TODO（bash.ts 行 91）。[E: packages/core/src/tool/bash.ts:19][E: packages/core/src/tool/bash.ts:170] |

## 设计动机·edge·历史

`ShellID.ToolID` 注释（id.ts 行 14–15）是这个节点的命名陷阱权威证据：V1 为兼容 saved permissions 和插件，工具名继续叫 `bash`，即使实现文件和内部服务名叫 shell。[E: packages/opencode/src/tool/shell/id.ts:16] V2 选择 minimal core boundary，并在 76–91 行的 TODO 块中显式列出不立即搬迁 V1 shell runtime 的债务，说明 V2 当前优先确保 core shell seam 能运行，而不是一次复制全部 V1 shell 智能审批。[E: packages/core/src/tool/bash.ts:93][E: packages/core/src/tool/bash.ts:107][I]

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
