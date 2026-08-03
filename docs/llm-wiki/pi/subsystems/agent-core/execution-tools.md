---
id: subsys.agent-core.execution-tools
title: Harness 执行工具
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/tools/index.ts
  - packages/agent/src/harness/tools/bash.ts
  - packages/agent/src/harness/tools/read.ts
  - packages/agent/src/harness/tools/edit.ts
  - packages/agent/src/harness/tools/edit-diff.ts
  - packages/agent/src/harness/tools/file-mutation-queue.ts
  - packages/agent/src/harness/tools/image.ts
  - packages/agent/src/harness/tools/path-utils.ts
  - packages/agent/src/harness/tools/write.ts
  - packages/agent/src/harness/tools/tool-context.ts
  - packages/agent/src/harness/utils/shell-output.ts
  - packages/agent/src/harness/utils/truncate.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/types.ts
  - packages/agent/src/index.ts
symbols:
  - AgentHarnessTool
  - ExecutionToolContext
  - createBashTool
  - createReadTool
  - createEditTool
  - createWriteTool
related:
  - subsys.agent-core.exec-env
  - subsys.agent-core.tool-invocation
  - ref.tools-catalog
evidence: explicit
status: verified
updated: a8ee03b815
---

> `packages/agent` 现在提供一组可复用的 harness execution tools：`bash`、`read`、`edit`、`write`。它们依赖抽象 `ExecutionEnv`，不等同于 coding-agent 产品层的七个内置工具。

## 公共边界

`AgentHarnessTool<TContext>` 在标准 `AgentTool` 上增加第五个 `context` 参数；`AgentHarness` 每个 turn 解析一次静态或异步 `toolContext`，只把当前 active tools 绑定成 loop 可执行的 `AgentTool`。[E: packages/agent/src/harness/types.ts:99] [E: packages/agent/src/harness/types.ts:105] [E: packages/agent/src/harness/types.ts:115] [E: packages/agent/src/harness/agent-harness.ts:381] [E: packages/agent/src/harness/agent-harness.ts:388] [E: packages/agent/src/harness/agent-harness.ts:395] [E: packages/agent/src/harness/agent-harness.ts:438]

内置 execution tools 的最小 context 是 `{ env: ExecutionEnv }`；package index 公开四个 factory 及其输入/详情类型，并从顶层 `src/index.ts` 重导出。[E: packages/agent/src/harness/tools/tool-context.ts:1] [E: packages/agent/src/harness/tools/tool-context.ts:4] [E: packages/agent/src/harness/tools/index.ts:1] [E: packages/agent/src/harness/tools/index.ts:23] [E: packages/agent/src/index.ts:57]

## 四个工具

- `createBashTool()` 支持 command prefix、执行前 `prepare` hook、秒级 timeout、100ms 节流的流式更新，以及 2,000 行/50KB 尾部裁剪；发生截断时，完整输出写到环境提供的临时文件路径。[E: packages/agent/src/harness/tools/bash.ts:8] [E: packages/agent/src/harness/tools/bash.ts:36] [E: packages/agent/src/harness/tools/bash.ts:51] [E: packages/agent/src/harness/tools/bash.ts:92] [E: packages/agent/src/harness/tools/bash.ts:109] [E: packages/agent/src/harness/tools/bash.ts:130] [E: packages/agent/src/harness/utils/shell-output.ts:51] [E: packages/agent/src/harness/utils/shell-output.ts:52] [E: packages/agent/src/harness/utils/shell-output.ts:57] [E: packages/agent/src/harness/utils/shell-output.ts:64] [E: packages/agent/src/harness/utils/shell-output.ts:80] [E: packages/agent/src/harness/utils/shell-output.ts:85] [E: packages/agent/src/harness/utils/shell-output.ts:87] [E: packages/agent/src/harness/utils/shell-output.ts:88] [E: packages/agent/src/harness/utils/shell-output.ts:94] [E: packages/agent/src/harness/utils/shell-output.ts:96] [E: packages/agent/src/harness/utils/shell-output.ts:107] [E: packages/agent/src/harness/utils/shell-output.ts:109] [E: packages/agent/src/harness/utils/shell-output.ts:114] [E: packages/agent/src/harness/utils/shell-output.ts:132] [E: packages/agent/src/harness/utils/shell-output.ts:134] [E: packages/agent/src/harness/utils/shell-output.ts:135] [E: packages/agent/src/harness/utils/shell-output.ts:139] [E: packages/agent/src/harness/utils/shell-output.ts:147] [E: packages/agent/src/harness/utils/shell-output.ts:151] [E: packages/agent/src/harness/utils/shell-output.ts:158] [E: packages/agent/src/harness/utils/truncate.ts:11] [E: packages/agent/src/harness/utils/truncate.ts:12]
- `createReadTool()` 读取文本或受支持图片；文本从 1-based offset 开始并做 head truncation。图片按 bytes signature 识别 JPEG/PNG/GIF/WebP/BMP，排除 JPEG XL 与 animated PNG；图片可交给注入的 processor，未注入时 BMP 会被明确省略。[E: packages/agent/src/harness/tools/read.ts:16] [E: packages/agent/src/harness/tools/read.ts:38] [E: packages/agent/src/harness/tools/read.ts:45] [E: packages/agent/src/harness/tools/read.ts:53] [E: packages/agent/src/harness/tools/read.ts:55] [E: packages/agent/src/harness/tools/read.ts:56] [E: packages/agent/src/harness/tools/read.ts:77] [E: packages/agent/src/harness/tools/read.ts:91] [E: packages/agent/src/harness/tools/read.ts:116] [E: packages/agent/src/harness/tools/image.ts:3] [E: packages/agent/src/harness/tools/image.ts:4] [E: packages/agent/src/harness/tools/image.ts:5] [E: packages/agent/src/harness/tools/image.ts:6] [E: packages/agent/src/harness/tools/image.ts:7] [E: packages/agent/src/harness/tools/image.ts:8] [E: packages/agent/src/harness/tools/image.ts:33] [E: packages/agent/src/harness/tools/image.ts:38] [E: packages/agent/src/harness/tools/image.ts:39]

read path resolution 先把 Unicode spaces 归一为空格并移除开头 `@`，再尝试原 absolute path、macOS AM/PM narrow-space、NFD 和 smart-apostrophe variants；找不到 variant 时仍把原 resolved path 交给 backend，让其返回权威错误。[E: packages/agent/src/harness/tools/path-utils.ts:4] [E: packages/agent/src/harness/tools/path-utils.ts:7] [E: packages/agent/src/harness/tools/path-utils.ts:8] [E: packages/agent/src/harness/tools/path-utils.ts:9] [E: packages/agent/src/harness/tools/path-utils.ts:12] [E: packages/agent/src/harness/tools/path-utils.ts:13] [E: packages/agent/src/harness/tools/path-utils.ts:16] [E: packages/agent/src/harness/tools/path-utils.ts:17] [E: packages/agent/src/harness/tools/path-utils.ts:18] [E: packages/agent/src/harness/tools/path-utils.ts:20] [E: packages/agent/src/harness/tools/path-utils.ts:21] [E: packages/agent/src/harness/tools/path-utils.ts:22] [E: packages/agent/src/harness/tools/path-utils.ts:23] [E: packages/agent/src/harness/tools/path-utils.ts:26] [E: packages/agent/src/harness/tools/path-utils.ts:27] [E: packages/agent/src/harness/tools/path-utils.ts:29]
- `createEditTool()` 对原文件执行 exact-first、normalized fuzzy fallback 的 replacement：fuzzy view 做 NFKC、行尾空白、智能引号、横线与特殊空格归一，再要求每个目标唯一且 edits 不重叠；写回前把内容归一到 LF 视图，保留未触及行的内容，再恢复 BOM 与检测到的单一换行风格。edit 在 per-`ExecutionEnv` mutation queue 中串行化：能解析 canonical path 时用 canonical key，`not_found` / `not_supported` 时回退 absolute path。[E: packages/agent/src/harness/tools/edit-diff.ts:30] [E: packages/agent/src/harness/tools/edit-diff.ts:33] [E: packages/agent/src/harness/tools/edit-diff.ts:36] [E: packages/agent/src/harness/tools/edit-diff.ts:39] [E: packages/agent/src/harness/tools/edit-diff.ts:45] [E: packages/agent/src/harness/tools/edit-diff.ts:49] [E: packages/agent/src/harness/tools/edit-diff.ts:203] [E: packages/agent/src/harness/tools/edit-diff.ts:205] [E: packages/agent/src/harness/tools/edit-diff.ts:217] [E: packages/agent/src/harness/tools/edit-diff.ts:319] [E: packages/agent/src/harness/tools/edit-diff.ts:329] [E: packages/agent/src/harness/tools/edit-diff.ts:346] [E: packages/agent/src/harness/tools/edit-diff.ts:354] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:9] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:12] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:14] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:15] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:20] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:21] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:22] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:23] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:24] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:25] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:29] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:32] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:49] [E: packages/agent/src/harness/tools/edit.ts:92] [E: packages/agent/src/harness/tools/edit.ts:104] [E: packages/agent/src/harness/tools/edit.ts:105] [E: packages/agent/src/harness/tools/edit.ts:106] [E: packages/agent/src/harness/tools/edit.ts:107] [E: packages/agent/src/harness/tools/edit.ts:110] [E: packages/agent/src/harness/tools/edit.ts:115]
- `createWriteTool()` 在同一个 per-env mutation queue 中覆盖写入；实际文件创建或覆盖委托给 `ExecutionEnv.writeFile()` backend。[E: packages/agent/src/harness/tools/write.ts:15] [E: packages/agent/src/harness/tools/write.ts:26] [E: packages/agent/src/harness/tools/write.ts:28] [E: packages/agent/src/harness/tools/write.ts:30] [E: packages/agent/src/harness/types.ts:309]

## L2 证伪与边界

- `harness/tools/index.ts` 只导出四个 factory；`grep`、`find`、`ls` 仍只属于 coding-agent 的产品工具目录，因此不能把这里称为七工具全集。[E: packages/agent/src/harness/tools/index.ts:1] [E: packages/agent/src/harness/tools/index.ts:23]
- factory 只是可选构件：`AgentHarness` 从调用方传入的 `options.tools` 建表，源码没有自动安装四个工具。[E: packages/agent/src/harness/agent-harness.ts:211] [E: packages/agent/src/harness/agent-harness.ts:215] [E: packages/agent/src/harness/agent-harness.ts:220]
- 这些工具只依赖 `ExecutionEnv`，不携带 coding-agent 的 settings、session env、extension wrapper 或 TUI renderer；两套工具实现应分别阅读。[I]

## Sources

- packages/agent/src/harness/tools/index.ts
- packages/agent/src/harness/tools/bash.ts
- packages/agent/src/harness/tools/read.ts
- packages/agent/src/harness/tools/edit.ts
- packages/agent/src/harness/tools/edit-diff.ts
- packages/agent/src/harness/tools/file-mutation-queue.ts
- packages/agent/src/harness/tools/image.ts
- packages/agent/src/harness/tools/path-utils.ts
- packages/agent/src/harness/tools/write.ts
- packages/agent/src/harness/tools/tool-context.ts
- packages/agent/src/harness/utils/shell-output.ts
- packages/agent/src/harness/utils/truncate.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/types.ts
- packages/agent/src/index.ts

## 相关

- [subsys.agent-core.exec-env](exec-env.md): `ExecutionEnv` 的进程、文件系统与截断基础设施。
- [subsys.agent-core.tool-invocation](tool-invocation.md): `AgentTool` 在 agent loop 中的验证与执行。
- [ref.tools-catalog](../../reference/tools-catalog.md): coding-agent 七工具 registry 与 harness 四工具边界。
