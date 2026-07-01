---
id: execution.shell-v1
title: V1 shell 执行(tree-sitter 审批+流式)
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/tool/shell.ts
  - packages/core/src/shell.ts
  - packages/opencode/src/permission/arity.ts
  - packages/opencode/src/tool/shell/prompt.ts
  - packages/opencode/src/tool/shell/id.ts
  - packages/opencode/src/tool/registry.ts
symbols:
  - ShellTool
  - Shell
  - BashArity.prefix
  - ShellPrompt.render
related:
  - tool.bash
  - execution.shell-v2
  - execution.core-shell-v2
  - ref.bash-arity
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V1 shell 执行是活跑 `bash` tool：先用 tree-sitter bash/PowerShell AST 扫描命令和路径，触发 `external_directory` 与 `bash` 权限，再用 Effect child process 执行并持续更新 metadata、截断或 spill 完整输出。

## 能回答的问题

- V1 shell 为什么能按命令 AST 派生审批 pattern？
- `BashArity.prefix` 如何生成 `always` reusable command-prefix approval？
- `workdir` 和命令参数里的外部目录分别怎么审批？
- shell 输出何时写入 truncation file，返回给模型的尾部如何裁剪？
- timeout、abort 后如何杀进程？

## 职责边界

`ShellTool` 的 tool id 和 permission key 兼容保留为 `"bash"`，`ShellID.ToolID` 常量就是 model-facing wire id [E: packages/opencode/src/tool/shell/id.ts:16]。V1 registry 把 `ShellTool` 初始化成 builtin tool，并在 tool list 中始终包含 `tool.shell` [E: packages/opencode/src/tool/registry.ts:199] [E: packages/opencode/src/tool/registry.ts:221]。

输入 schema 由 `ShellPrompt.parameterSchema` 生成：`command` 必填，`timeout` 可选正整数毫秒，`workdir` 可选 [E: packages/opencode/src/tool/shell/prompt.ts:15] [E: packages/opencode/src/tool/shell/prompt.ts:17] [E: packages/opencode/src/tool/shell/prompt.ts:18] [E: packages/opencode/src/tool/shell/prompt.ts:19]。tool runtime 使用 configured shell：`Shell.acceptable(cfg.shell)` 会拒绝不合适 shell 并选择 fallback；`Shell` helper 现在从 `@opencode-ai/core/shell` import。[E: packages/opencode/src/tool/shell.ts:15] [E: packages/opencode/src/tool/shell.ts:600] [E: packages/core/src/shell.ts:214] [E: packages/core/src/shell.ts:215] [E: packages/core/src/shell.ts:114] [E: packages/core/src/shell.ts:115] [E: packages/core/src/shell.ts:120]。

## 数据模型

| 实体 | 字段 | 作用 | 证据 |
|---|---|---|---|
| `Scan` | `dirs`, `patterns`, `always` | AST 扫描后得到外部目录、需要审批的命令文本、可保存的 command-prefix pattern | [E: packages/opencode/src/tool/shell.ts:73] [E: packages/opencode/src/tool/shell.ts:74] [E: packages/opencode/src/tool/shell.ts:75] [E: packages/opencode/src/tool/shell.ts:76] |
| `Parameters` | `command`, `timeout?`, `workdir?` | model-facing shell 参数 | [E: packages/opencode/src/tool/shell/prompt.ts:15] [E: packages/opencode/src/tool/shell/prompt.ts:17] [E: packages/opencode/src/tool/shell/prompt.ts:18] [E: packages/opencode/src/tool/shell/prompt.ts:19] |
| `Chunk` | `text`, `size` | 流式输出缓冲里的单块文本和 UTF-8 byte size | [E: packages/opencode/src/tool/shell.ts:79] [E: packages/opencode/src/tool/shell.ts:80] [E: packages/opencode/src/tool/shell.ts:81] |

## AST 扫描与权限

V1 使用 `web-tree-sitter`，懒加载 `tree-sitter-bash` 与 `tree-sitter-powershell` wasm，并构造两个 Parser [E: packages/opencode/src/tool/shell.ts:312] [E: packages/opencode/src/tool/shell.ts:322] [E: packages/opencode/src/tool/shell.ts:325] [E: packages/opencode/src/tool/shell.ts:331] [E: packages/opencode/src/tool/shell.ts:333]。每次执行前，`parse(params.command, ps)` 会选 bash 或 PowerShell parser 解析命令 [E: packages/opencode/src/tool/shell.ts:257] [E: packages/opencode/src/tool/shell.ts:258]。

`collect` 遍历 AST 中的 `command` node，取出命令 tokens；对 `rm/cp/mv/mkdir/touch/chmod/chown/cat`、PowerShell file cmdlets 和 cmd.exe file commands，它解析 path args，resolve 到实际路径，并把 instance 外部目录加入 `scan.dirs` [E: packages/opencode/src/tool/shell.ts:392] [E: packages/opencode/src/tool/shell.ts:398] [E: packages/opencode/src/tool/shell.ts:403]。非 `cd`/`pushd` 等目录切换命令会把原始 command source 加入 `scan.patterns`，并把 `BashArity.prefix(tokens).join(" ") + " *"` 加入 `scan.always` [E: packages/opencode/src/tool/shell.ts:407] [E: packages/opencode/src/tool/shell.ts:408] [E: packages/opencode/src/tool/shell.ts:409]。

`ask` 先对 `scan.dirs` 生成 `external_directory` permission，patterns 和 always 都是目录 glob；再对 `scan.patterns` 生成 `"bash"` permission，patterns 是具体 command source，always 是 arity prefix pattern [E: packages/opencode/src/tool/shell.ts:270] [E: packages/opencode/src/tool/shell.ts:271] [E: packages/opencode/src/tool/shell.ts:273] [E: packages/opencode/src/tool/shell.ts:283] [E: packages/opencode/src/tool/shell.ts:284] [E: packages/opencode/src/tool/shell.ts:286]。`BashArity.prefix` 的算法是从最长 token prefix 向短 prefix查 `ARITY`，命中后返回指定长度，否则返回第一个 token [E: packages/opencode/src/permission/arity.ts:2] [E: packages/opencode/src/permission/arity.ts:4] [E: packages/opencode/src/permission/arity.ts:5] [E: packages/opencode/src/permission/arity.ts:7] [E: packages/opencode/src/permission/arity.ts:8]。

## 执行控制流

1. `execute` 读取 instance context，并把 `params.workdir` resolve 到 instance directory 或配置的 shell 语义下的绝对路径 [E: packages/opencode/src/tool/shell.ts:611] [E: packages/opencode/src/tool/shell.ts:612] [E: packages/opencode/src/tool/shell.ts:613] [E: packages/opencode/src/tool/shell.ts:614]。
2. 负数 timeout 被拒绝；未传 timeout 使用 runtime flag `bashDefaultTimeoutMs` 或默认 `2 * 60 * 1000` [E: packages/opencode/src/tool/shell.ts:347] [E: packages/opencode/src/tool/shell.ts:615] [E: packages/opencode/src/tool/shell.ts:618]。
3. `execute` acquire/release tree-sitter parse tree，调用 `collect`，若 `cwd` 不在 instance 内则把 `cwd` 加入 external dirs，然后调用 `ask` [E: packages/opencode/src/tool/shell.ts:622] [E: packages/opencode/src/tool/shell.ts:625] [E: packages/opencode/src/tool/shell.ts:626] [E: packages/opencode/src/tool/shell.ts:627]。
4. `shellEnv` 触发 plugin hook `"shell.env"`，把 plugin env 覆盖到 `process.env` 后传给 child process [E: packages/opencode/src/tool/shell.ts:416] [E: packages/opencode/src/tool/shell.ts:418] [E: packages/opencode/src/tool/shell.ts:423] [E: packages/opencode/src/tool/shell.ts:424]。
5. `run` 用 `ChildProcessSpawner.spawn(cmd(...))` 启动进程；Windows PowerShell 走 `shell -NoLogo -NoProfile -NonInteractive -Command command`，其它平台把 command 作为 shell command 执行 [E: packages/opencode/src/tool/shell.ts:293] [E: packages/opencode/src/tool/shell.ts:295] [E: packages/opencode/src/tool/shell.ts:303] [E: packages/opencode/src/tool/shell.ts:484]。
6. 输出通过 `Stream.decodeText(handle.all)` 持续读取，每个 chunk 都更新 metadata output preview [E: packages/opencode/src/tool/shell.ts:487] [E: packages/opencode/src/tool/shell.ts:525]。
7. 当 `full` 超过 truncation `maxBytes`，V1 调用 `trunc.write(full)` 建文件，后续 chunk 写入 `createWriteStream(next)`，metadata 里保留 `outputPath` [E: packages/opencode/src/tool/shell.ts:504] [E: packages/opencode/src/tool/shell.ts:505] [E: packages/opencode/src/tool/shell.ts:510] [E: packages/opencode/src/tool/shell.ts:591]。
8. 退出条件是 `handle.exitCode`、abort signal、timeout 三者 race；abort 和 timeout 都调用 `handle.kill({ forceKillAfter: "3 seconds" })` [E: packages/opencode/src/tool/shell.ts:542] [E: packages/opencode/src/tool/shell.ts:548] [E: packages/opencode/src/tool/shell.ts:550] [E: packages/opencode/src/tool/shell.ts:552] [E: packages/opencode/src/tool/shell.ts:554]。
9. 返回值 metadata 包含 `output` preview、`exit`、`truncated` 和可选 `outputPath`；model output 是尾部裁剪后的文本，超限时前缀说明完整输出保存路径 [E: packages/opencode/src/tool/shell.ts:587] [E: packages/opencode/src/tool/shell.ts:588] [E: packages/opencode/src/tool/shell.ts:590] [E: packages/opencode/src/tool/shell.ts:578]。

## 输出与截断

V1 shell 有两层输出控制。第一层是 live metadata preview：`preview` 最多保留尾部 30,000 字符，避免 UI metadata 过大 [E: packages/opencode/src/tool/shell.ts:27] [E: packages/opencode/src/tool/shell.ts:220]。第二层是 model-facing output：`tail(raw, limits.maxLines, limits.maxBytes)` 从尾部按行和 UTF-8 bytes 保留，必要时写 truncation file [E: packages/opencode/src/tool/shell.ts:225] [E: packages/opencode/src/tool/shell.ts:579]。

## 设计动机与权衡

V1 shell 的审批不是 shell sandbox。它通过 AST 尽量减少用户要批准的 command pattern，并用 `external_directory` 捕获明显越界的 file command/path argument；真正执行仍是 host shell 和 host user 权限 [I]。V2 spec 对 bash 明确说 shell runs with host user's filesystem/process/network authority，这个 caveat 同样适合理解 V1 执行层 [E: specs/v2/session.md:204]。

## Gotcha

- V1 `bash` 的 command approval pattern 来自 AST `source(node)`，不是简单正则 token。
- `always` pattern 是 `BashArity.prefix(tokens) + " *"`，例如 `git checkout main` 可能保存成 `git checkout *`，不是完整命令。
- `external_directory` 是目录 glob approval，不是 chroot/sandbox。
- `Shell.args()` 在 `packages/core/src/shell.ts` 中存在，但本工具实际执行使用 `tool/shell.ts` 的 `cmd()` helper；不要把两个路径混成一个控制流 [E: packages/core/src/shell.ts:166] [E: packages/opencode/src/tool/shell.ts:293]。

## Sources

- packages/opencode/src/tool/shell.ts
- packages/core/src/shell.ts
- packages/opencode/src/permission/arity.ts
- packages/opencode/src/tool/shell/prompt.ts
- packages/opencode/src/tool/shell/id.ts
- packages/opencode/src/tool/registry.ts
- specs/v2/session.md

## 相关

- [Bash/Shell 工具](../../surface/tools/bash.md)
- [V2 bash 工具](shell-v2.md)
- [V2 Core Shell Helper](core-shell-v2.md)
- [Bash arity 表](../../reference/bash-arity.md)
