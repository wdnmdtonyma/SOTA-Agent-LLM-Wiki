---
id: tool.execute
title: Execute / Code Mode 工具(V1 experimental)
kind: tool
tier: T1
v: v1
source:
  - packages/opencode/src/tool/code-mode.ts
  - packages/opencode/src/tool/registry.ts
  - packages/opencode/src/session/tools.ts
  - packages/opencode/src/effect/runtime-flags.ts
  - packages/opencode/src/permission/index.ts
  - packages/codemode/src/codemode.ts
  - packages/codemode/src/interpreter/runtime.ts
  - packages/codemode/src/tool-runtime.ts
symbols: [CodeModeTool, CODE_MODE_TOOL, describeCatalog]
related: [subsys.tools.codemode, subsys.tools.v1, integrations.mcp-client, ref.tool-catalog]
evidence: explicit
status: verified
updated: 7534d23551
---

> Execute 是 V1 的 experimental Code Mode 工具：模型提交一段受限 JavaScript orchestration code，运行时只把当前 permission 可见的 MCP tools 暴露给程序。

## 能回答的问题

- `execute` 由哪个 env flag 开启，何时不会出现在模型工具列表中？
- Code Mode 程序能调用哪些工具，为什么不是任意 opencode builtin？
- child MCP call 如何继续经过 permission 与 plugin hooks？
- `execute` 的输入、输出、attachments 与取消语义是什么？
- 打开 Code Mode 后，直接 MCP tool injection 会发生什么变化？

## 1 Identity

V1 adapter 把 wire id 固定为 `execute`，description 是“Run a confined orchestration script with access to connected MCP tools.”，并用 `Tool.define(CODE_MODE_TOOL, ...)` 构造 `CodeModeTool`。[E: packages/opencode/src/tool/code-mode.ts:12][E: packages/opencode/src/tool/code-mode.ts:14][E: packages/opencode/src/tool/code-mode.ts:188][E: packages/opencode/src/tool/code-mode.ts:189]

`ToolRegistry` 只有在 `RuntimeFlags.experimentalCodeMode` 为 true 时才动态 import adapter；flag 为 false 时连 module 与工具实例都不创建。[E: packages/opencode/src/tool/registry.ts:113][E: packages/opencode/src/tool/registry.ts:114] `experimentalCodeMode` 由 `enabledByExperimental("OPENCODE_EXPERIMENTAL_CODE_MODE")` 解析，所以专用 env 未设置时可继承 `OPENCODE_EXPERIMENTAL`，显式设置专用 env 时由专用值决定。[E: packages/opencode/src/effect/runtime-flags.ts:10][E: packages/opencode/src/effect/runtime-flags.ts:11][E: packages/opencode/src/effect/runtime-flags.ts:13][E: packages/opencode/src/effect/runtime-flags.ts:48]

## 2 用途定位

Execute 用一段程序在单次 model tool call 内编排多个 MCP 调用、分支、循环、转换与并行调用；它不是通用 Node/Bun `eval`。adapter 把 `MCP.Service.tools()` 转成 schema-described `SandboxTool` tree，工具路径按 MCP server 分 namespace。[E: packages/opencode/src/tool/code-mode.ts:39][E: packages/opencode/src/tool/code-mode.ts:42][E: packages/opencode/src/tool/code-mode.ts:47][E: packages/opencode/src/tool/code-mode.ts:120][E: packages/opencode/src/tool/code-mode.ts:124]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `code` | `string` | 是 | 无 | `Schema.String`；package runtime 还会拒绝 trim 后为空的程序 | 在 confined interpreter 中执行的 script body。[E: packages/opencode/src/tool/code-mode.ts:16][E: packages/opencode/src/tool/code-mode.ts:17][E: packages/opencode/src/tool/code-mode.ts:18][E: packages/codemode/src/interpreter/runtime.ts:3358][E: packages/codemode/src/interpreter/runtime.ts:3361] |

模型看到的 tool description 不只是一句静态文本：registry 会从 permission 可见的 MCP tools 构造 budgeted Code Mode catalog；没有任何可见 MCP tool 时，`execute` 会从本回合的 `visible` tools 中移除。[E: packages/opencode/src/tool/registry.ts:275][E: packages/opencode/src/tool/registry.ts:280][E: packages/opencode/src/tool/registry.ts:281][E: packages/opencode/src/tool/registry.ts:282][E: packages/opencode/src/tool/registry.ts:300][E: packages/opencode/src/tool/registry.ts:303][E: packages/opencode/src/tool/registry.ts:323]

## 4 输出 & 大小/截断限制

成功时 string result 原样作为 text；其它 JSON-safe result 用两空格 JSON stringify。runtime logs 若存在会附加到 `Logs:` 段，metadata 记录每个 child tool 的 `running/completed/error` 状态；MCP image/audio/blob resource 会转换成 V1 attachments。[E: packages/opencode/src/tool/code-mode.ts:75][E: packages/opencode/src/tool/code-mode.ts:84][E: packages/opencode/src/tool/code-mode.ts:89][E: packages/opencode/src/tool/code-mode.ts:93][E: packages/opencode/src/tool/code-mode.ts:109][E: packages/opencode/src/tool/code-mode.ts:274][E: packages/opencode/src/tool/code-mode.ts:295][E: packages/opencode/src/tool/code-mode.ts:300][E: packages/opencode/src/tool/code-mode.ts:304]

Code Mode adapter 没有给 package runtime 配 `ExecutionLimits`，因此 package 自身的 timeout/tool-call/output limit 在这个 host adapter 中保持 unset。[E: packages/opencode/src/tool/code-mode.ts:239][E: packages/opencode/src/tool/code-mode.ts:240][E: packages/opencode/src/tool/code-mode.ts:241][E: packages/opencode/src/tool/code-mode.ts:254][E: packages/codemode/src/codemode.ts:10][E: packages/codemode/src/codemode.ts:16][I] `Tool.define` 的 V1 通用 wrapper 仍会对最终 string output 走常规 truncation；child MCP attachments 不作为 string 拼入 output。[I]

## 5 权限

Code Mode 不把全部 MCP tools 交给模型。生成 catalog 与实际 execute 都先合并 agent permission 与 session permission，再用 `Permission.visibleTools()` 删除顶层 deny 的 MCP tools。[E: packages/opencode/src/tool/registry.ts:280][E: packages/opencode/src/tool/registry.ts:281][E: packages/opencode/src/tool/code-mode.ts:207][E: packages/opencode/src/tool/code-mode.ts:209][E: packages/opencode/src/tool/code-mode.ts:210][E: packages/opencode/src/permission/index.ts:204][E: packages/opencode/src/permission/index.ts:216]

每个 child MCP call 仍会触发 `tool.execute.before`，随后以真实 MCP key 调 `ctx.ask({ permission: key, patterns: ["*"] })`，transport 完成后再触发 `tool.execute.after`；Code Mode 不是绕过 MCP permission/plugin lifecycle 的旁路。[E: packages/opencode/src/tool/code-mode.ts:141][E: packages/opencode/src/tool/code-mode.ts:147][E: packages/opencode/src/tool/code-mode.ts:149][E: packages/opencode/src/tool/code-mode.ts:180][E: packages/opencode/src/tool/code-mode.ts:185]

## 6 execute() 走读

1. `CodeModeTool` 读取 MCP、Agent、Session、Plugin services；调用开始时若 abort signal 已触发，直接返回 cancelled result。[E: packages/opencode/src/tool/code-mode.ts:190][E: packages/opencode/src/tool/code-mode.ts:194][E: packages/opencode/src/tool/code-mode.ts:199][E: packages/opencode/src/tool/code-mode.ts:200]
2. adapter 合并 agent/session permission，取当前可见 MCP tools，并按已连接 MCP clients 的 sanitized server names 建 catalog。[E: packages/opencode/src/tool/code-mode.ts:207][E: packages/opencode/src/tool/code-mode.ts:212]
3. 每个 catalog entry 被包装成 `SandboxTool.make`；调用时走 `invokeChildTool`，把 MCP result 投影为 plain data 或 attachments。[E: packages/opencode/src/tool/code-mode.ts:120][E: packages/opencode/src/tool/code-mode.ts:124][E: packages/opencode/src/tool/code-mode.ts:223][E: packages/opencode/src/tool/code-mode.ts:230]
4. `CodeMode.make` 创建 confined runtime，并用 start/end hooks 持续更新 parent tool metadata。[E: packages/opencode/src/tool/code-mode.ts:239][E: packages/opencode/src/tool/code-mode.ts:241][E: packages/opencode/src/tool/code-mode.ts:254]
5. adapter 用 `Effect.raceFirst` 在 runtime execution 与 abort callback 之间竞速；abort 不会变成未处理 Effect error，而是稳定的 cancelled result。[E: packages/opencode/src/tool/code-mode.ts:262][E: packages/opencode/src/tool/code-mode.ts:268][E: packages/opencode/src/tool/code-mode.ts:274]
6. program diagnostic 会转成 tool failure text；成功 result 转成 output，附带 logs、child-call metadata 与 attachments。[E: packages/opencode/src/tool/code-mode.ts:281][E: packages/opencode/src/tool/code-mode.ts:289][E: packages/opencode/src/tool/code-mode.ts:295][E: packages/opencode/src/tool/code-mode.ts:300]

## 7 V1 vs V2 差异

| 维度 | V1 | V2 |
|---|---|---|
| product wiring | `ToolRegistry` 在 experimental flag 下注册 `execute`。[E: packages/opencode/src/tool/registry.ts:113][E: packages/opencode/src/tool/registry.ts:221][E: packages/opencode/src/tool/registry.ts:241] | V2 `BuiltInTools` 当前没有 Code Mode leaf；该结论来自 V2 builtin 静态列表未注册 codemode。[I] |
| tool source | 只把 permission 可见的 MCP tools 放进 confined tree。[E: packages/opencode/src/tool/code-mode.ts:209][E: packages/opencode/src/tool/code-mode.ts:239] | 无对应 product adapter。[I] |
| direct MCP tools | flag 开启时 `SessionTools.resolve` 在 resource tools 后提前返回，不再逐个把 MCP callable tools 注入 AI SDK tools；MCP resource list/read tools仍已在 return 前装配。[E: packages/opencode/src/session/tools.ts:136][E: packages/opencode/src/session/tools.ts:388][E: packages/opencode/src/session/tools.ts:390] | 无对应 V2 分支。[I] |

## 8 设计动机·edge

- Code Mode 的 authority 是 explicit tool tree，不是 ambient filesystem/process/network。解释器只 seed `tools` 与选定标准库 globals；generated instructions 还明确声明 modules/imports、timers、fetch、eval、prototype access 不可用。[E: packages/codemode/src/interpreter/runtime.ts:622][E: packages/codemode/src/interpreter/runtime.ts:629][E: packages/codemode/src/interpreter/runtime.ts:651][E: packages/codemode/src/tool-runtime.ts:604][E: packages/codemode/src/tool-runtime.ts:609]
- MCP `resource_link` 被当作普通 text reference，不会由 adapter 自动 fetch；image/audio/blob resource 才进入 attachment channel。[E: packages/opencode/src/tool/code-mode.ts:84][E: packages/opencode/src/tool/code-mode.ts:104]
- failed MCP result 的 host error 会转成 model-safe `ToolError`；interrupt-only Cause 保持 interrupt，不伪装成普通 tool failure。[E: packages/opencode/src/tool/code-mode.ts:231][E: packages/opencode/src/tool/code-mode.ts:233][E: packages/opencode/src/tool/code-mode.ts:235]

## Sources

- packages/opencode/src/tool/code-mode.ts
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/session/tools.ts
- packages/opencode/src/effect/runtime-flags.ts
- packages/opencode/src/permission/index.ts
- packages/codemode/src/codemode.ts
- packages/codemode/src/interpreter/runtime.ts
- packages/codemode/src/tool-runtime.ts

## 相关

- [Code Mode 子系统](../../subsystems/tools/codemode.md)
- [V1 工具系统](../../subsystems/tools/v1.md)
- [MCP 客户端](../../subsystems/integrations/mcp-client.md)
- [全工具字段 catalog](../../reference/tool-catalog.md)
