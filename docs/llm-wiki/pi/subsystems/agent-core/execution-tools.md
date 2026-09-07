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
  - packages/agent/src/harness/utils/truncate.ts
  - packages/agent/src/harness/agent-harness.ts
  - packages/agent/src/harness/runtime/harness.ts
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
updated: 9767ba275f
---

> `packages/agent` 提供一组可复用的 harness execution tools：`bash`、`read`、`edit`、`write`。它们依赖抽象 `ExecutionEnv`，不等同于 coding-agent 产品层的八个内置工具(`read`/`bash`/`powershell`/`edit`/`write`/`grep`/`find`/`ls`)。

## 公共边界

当前 `AgentHarness` 存的是 `AgentHarnessTool`（`AgentTool` 换掉 `execute` 签名，加上 `toolContext` / `invocation` / harness `Context`）。`toolContext` 出现在 `AgentHarnessOptions` 上，并写入 `Harness` 的 `Config`，drive 执行工具时再解析。[E: packages/agent/src/harness/types.ts:108] [E: packages/agent/src/harness/agent-harness.ts:525] [E: packages/agent/src/harness/runtime/harness.ts:61] [E: packages/agent/src/harness/runtime/harness.ts:69]

内置 execution tools 的最小 context 是 `{ env: ExecutionEnv }`；package index 公开四个 factory 及其输入/详情类型，并从顶层 `src/index.ts` 重导出。[E: packages/agent/src/harness/tools/tool-context.ts:4] [E: packages/agent/src/harness/tools/index.ts:1] [E: packages/agent/src/harness/tools/index.ts:23] [E: packages/agent/src/index.ts:106]

`setTools` 会 `validateToolNames` 后写进 config，并 emit `config_update` / `property: "tools"`。[E: packages/agent/src/harness/runtime/harness.ts:225] [E: packages/agent/src/harness/runtime/harness.ts:227]

## 四个工具

- `createBashTool()` 支持 command prefix、执行前 `prepare` hook、秒级 timeout、2s 间隔的 checkpoint 更新，以及 2,000 行/50KB 尾部裁剪；发生截断时，完整输出写到环境提供的 spill 路径。`execute` 走 `env.exec` 的 `capture` / `onUpdate`，不再自己节流 100ms。[E: packages/agent/src/harness/tools/bash.ts:9] [E: packages/agent/src/harness/tools/bash.ts:51] [E: packages/agent/src/harness/tools/bash.ts:82] [E: packages/agent/src/harness/tools/bash.ts:99] [E: packages/agent/src/harness/utils/truncate.ts:11] [E: packages/agent/src/harness/utils/truncate.ts:12]
- `createReadTool()` 读取文本或受支持图片；文本从 1-based offset 开始并做 head truncation。图片按 bytes signature 识别 JPEG/PNG/GIF/WebP/BMP，排除 JPEG XL 与 animated PNG；图片可交给注入的 processor，未注入时 BMP 会被明确省略。[E: packages/agent/src/harness/tools/read.ts:47] [E: packages/agent/src/harness/tools/read.ts:58] [E: packages/agent/src/harness/tools/read.ts:82] [E: packages/agent/src/harness/tools/read.ts:121] [E: packages/agent/src/harness/tools/image.ts:4] [E: packages/agent/src/harness/tools/image.ts:5] [E: packages/agent/src/harness/tools/image.ts:6] [E: packages/agent/src/harness/tools/image.ts:7] [E: packages/agent/src/harness/tools/image.ts:8]

read path resolution 先把 Unicode spaces 归一为空格并移除开头 `@`，再尝试原 absolute path、macOS AM/PM narrow-space、NFD 和 smart-apostrophe variants；找不到 variant 时仍把原 resolved path 交给 backend，让其返回权威错误。[E: packages/agent/src/harness/tools/path-utils.ts:9] [E: packages/agent/src/harness/tools/path-utils.ts:18] [E: packages/agent/src/harness/tools/path-utils.ts:19] [E: packages/agent/src/harness/tools/path-utils.ts:28] [E: packages/agent/src/harness/tools/path-utils.ts:30]
- `createEditTool()` 对原文件执行 exact-first、normalized fuzzy fallback 的 replacement：fuzzy view 做 NFKC、行尾空白、智能引号、横线与特殊空格归一，再要求每个目标唯一且 edits 不重叠；写回前把内容归一到 LF 视图，保留未触及行的内容，再恢复 BOM 与检测到的单一换行风格。edit 在 per-`ExecutionEnv` mutation queue 中串行化：能解析 canonical path 时用 canonical key，`not_found` / `not_supported` 时回退 absolute path。[E: packages/agent/src/harness/tools/edit-diff.ts:30] [E: packages/agent/src/harness/tools/edit-diff.ts:203] [E: packages/agent/src/harness/tools/edit-diff.ts:217] [E: packages/agent/src/harness/tools/edit-diff.ts:301] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:22] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:26] [E: packages/agent/src/harness/tools/file-mutation-queue.ts:30] [E: packages/agent/src/harness/tools/edit.ts:90] [E: packages/agent/src/harness/tools/edit.ts:105]
- `createWriteTool()` 在同一个 per-env mutation queue 中覆盖写入；实际文件创建或覆盖委托给 `ExecutionEnv.writeFile()` backend。[E: packages/agent/src/harness/tools/write.ts:15] [E: packages/agent/src/harness/tools/write.ts:28] [E: packages/agent/src/harness/tools/write.ts:33] [E: packages/agent/src/harness/types.ts:280] [E: packages/agent/src/harness/types.ts:391]

## L2 证伪与边界

- `harness/tools/index.ts` 只导出四个 factory；`grep`、`find`、`ls`、`powershell` 仍只属于 coding-agent 的产品工具目录，因此不能把这里称为八工具全集。[E: packages/agent/src/harness/tools/index.ts:1] [E: packages/agent/src/harness/tools/index.ts:23] [E: packages/coding-agent/src/core/tools/index.ts:95]
- factory 只是可选构件：`AgentHarness.create` 从调用方传入的 `options.tools` 建表，源码没有自动安装四个工具。[E: packages/agent/src/harness/runtime/harness.ts:61] [E: packages/agent/src/harness/agent-harness.ts:524]
- 这些工具只依赖 `ExecutionEnv`，不携带 coding-agent 的 settings、session env、extension wrapper 或 TUI renderer；两套工具实现应分别阅读。[I]
- harness tool `execute` 的参数顺序是 `(toolCallId, params, onUpdate, toolContext, invocation, context)`，与低层 `AgentTool.execute` 不同。[E: packages/agent/src/harness/types.ts:114]

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
- packages/agent/src/harness/utils/truncate.ts
- packages/agent/src/harness/agent-harness.ts
- packages/agent/src/harness/runtime/harness.ts
- packages/agent/src/harness/types.ts
- packages/agent/src/index.ts
- packages/coding-agent/src/core/tools/index.ts

## 相关

- [subsys.agent-core.exec-env](exec-env.md): `ExecutionEnv` 的进程、文件系统与截断基础设施。
- [subsys.agent-core.tool-invocation](tool-invocation.md): `AgentTool` 在 agent loop 中的验证与执行。
- [ref.tools-catalog](../../reference/tools-catalog.md): coding-agent 八工具 registry 与 harness 四工具边界。
