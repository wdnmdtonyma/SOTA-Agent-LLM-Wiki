---
id: surface.tools.write
title: write 文件写入工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/write.ts
  - packages/coding-agent/src/core/tools/file-mutation-queue.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
  - packages/agent/src/agent.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/types.ts
  - packages/coding-agent/test/tools.test.ts
  - packages/coding-agent/test/file-mutation-queue.test.ts
symbols:
  - createWriteTool
  - createWriteToolDefinition
  - WriteToolInput
  - WriteOperations
  - WriteToolOptions
related:
  - subsys.coding-agent.file-mutation-queue
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 8c943640
---

> `write` 是 pi-coding-agent 内置的完整文件写入工具:模型给出 `path` 和 `content`,工具把路径解析到当前 `cwd`,创建父目录,覆盖写入文件,并用同文件 file mutation queue 避免并发写互相踩踏。

## 能回答的问题

- `write` 暴露给模型的 wire name、schema、prompt guideline 是什么?
- `write` 成功时返回什么,有没有 `details`、`truncation` 或 `fullOutputPath`?
- `write` 的 executionMode 是 sequential 还是 parallel,同一文件并发写怎样保护?
- `WriteOperations` 怎样把本地文件系统替换成远程写入实现?
- `write` 在 `createAllToolDefinitions` 和 `AgentSession._buildRuntime` 里怎样注册和激活?

## 1 Identity

`createWriteToolDefinition(cwd, options?)` 产出 coding-agent 的 `ToolDefinition<typeof writeSchema, undefined>`;它的 provider-visible `name` 和 UI `label` 都是 `"write"` [E: packages/coding-agent/src/core/tools/write.ts:181] [E: packages/coding-agent/src/core/tools/write.ts:184] [E: packages/coding-agent/src/core/tools/write.ts:187] [E: packages/coding-agent/src/core/tools/write.ts:188]. `createWriteTool(cwd, options?)` 再通过 `wrapToolDefinition(createWriteToolDefinition(...))` 把这个产品层定义包成 agent-core 的 `AgentTool` [E: packages/coding-agent/src/core/tools/write.ts:265] [E: packages/coding-agent/src/core/tools/write.ts:266].

`write` 属于 `pi-coding-agent` 的 built-in tools 集合,实际 tool batch 调度由 `pi-agent-core` 执行 [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84] [E: packages/agent/src/agent-loop.ts:373] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:387]. `wrapToolDefinition` 复制 `name`、`label`、`description`、`parameters`、`prepareArguments`、`executionMode`,并把 `ToolDefinition.execute` 适配成 `AgentTool.execute` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:10] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:11] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:12] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:13] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:14] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:15] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:17].

## 2 用途定位

`write` 的 description 明确表示它写入文件内容:不存在则创建,存在则覆盖,并自动创建父目录 [E: packages/coding-agent/src/core/tools/write.ts:189] [E: packages/coding-agent/src/core/tools/write.ts:190]. 它给系统提示的 `promptSnippet` 是 "Create or overwrite files",并给模型的 `promptGuidelines` 是只把 `write` 用于新文件或完整重写 [E: packages/coding-agent/src/core/tools/write.ts:191] [E: packages/coding-agent/src/core/tools/write.ts:192].

`write` 的执行路径创建父目录并调用 `ops.writeFile(absolutePath, content)` 写入完整内容;源码未出现 patch、search/replace 或局部编辑分支 [E: packages/coding-agent/src/core/tools/write.ts:214] [E: packages/coding-agent/src/core/tools/write.ts:218] [I]. 对同一个文件的局部变更语义属于 `edit`,而 `write` 的用途是 "new files or complete rewrites" [E: packages/coding-agent/src/core/tools/write.ts:192] [I].

## 3 输入 schema 表

`writeSchema` 是一个 TypeBox `Type.Object`，包含 `path` 和 `content` 两个 string 字段 [E: packages/coding-agent/src/core/tools/write.ts:14] [E: packages/coding-agent/src/core/tools/write.ts:15] [E: packages/coding-agent/src/core/tools/write.ts:16]. `WriteToolInput` 直接由 `Static<typeof writeSchema>` 派生,所以 TypeScript 输入类型跟运行时 schema 同源 [E: packages/coding-agent/src/core/tools/write.ts:19].

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `path` | `string` | 是 [I] | 无 | 可传 relative 或 absolute path | 要写入的文件路径;schema description 写的是 "Path to the file to write (relative or absolute)" [E: packages/coding-agent/src/core/tools/write.ts:15]. |
| `content` | `string` | 是 [I] | 无 | 完整文件内容 | 要写入文件的完整内容;schema description 写的是 "Content to write to the file" [E: packages/coding-agent/src/core/tools/write.ts:16]. |

`execute` 接收的解构参数也是 `{ path, content }: { path: string; content: string }`,这和 schema 的两个字段一致 [E: packages/coding-agent/src/core/tools/write.ts:194] [E: packages/coding-agent/src/core/tools/write.ts:196].

## 4 输出 & 截断

成功路径的模型可见输出是一个 text content: `Successfully wrote ${content.length} bytes to ${path}`;`details` 明确返回 `undefined` [E: packages/coding-agent/src/core/tools/write.ts:221] [E: packages/coding-agent/src/core/tools/write.ts:222] [E: packages/coding-agent/src/core/tools/write.ts:223]. 测试也断言 `writeTool.execute(...)` 的 text 包含 "Successfully wrote" 且 `result.details` 是 `undefined` [E: packages/coding-agent/test/tools.test.ts:245] [E: packages/coding-agent/test/tools.test.ts:247] [E: packages/coding-agent/test/tools.test.ts:249].

`write` 没有 `WriteToolDetails` 类型,`createWriteToolDefinition` 的 `ToolDefinition` 第二个泛型是 `undefined`,因此没有 structured details、`truncation` 或 `fullOutputPath` 可供下游读取 [E: packages/coding-agent/src/core/tools/write.ts:181] [E: packages/coding-agent/src/core/tools/write.ts:184] [I]. 这和 `read`/`bash` 这类可能携带截断详情的工具不同;`write` 的模型结果只报告写入字节数和路径 [I].

交互界面的 call preview 另有折叠逻辑:当 `context.expanded` 为 false 时最多显示 10 行 content preview,并追加 remaining/total line count 与 expand key hint [E: packages/coding-agent/src/core/tools/write.ts:151] [E: packages/coding-agent/src/core/tools/write.ts:152] [E: packages/coding-agent/src/core/tools/write.ts:153] [E: packages/coding-agent/src/core/tools/write.ts:156] [E: packages/coding-agent/src/core/tools/write.ts:157]. 这个 UI preview 不是 tool result truncation;它由 `renderCall`/`formatWriteCall` 渲染,不是 `execute` 返回的 `details` [E: packages/coding-agent/src/core/tools/write.ts:131] [E: packages/coding-agent/src/core/tools/write.ts:227] [I].

错误输出只在 render 层特殊处理:如果 result `isError` 为真,`formatWriteResult` 把 text content 取出并用 error 颜色显示;非错误 result render 为清空的 `Container` [E: packages/coding-agent/src/core/tools/write.ts:164] [E: packages/coding-agent/src/core/tools/write.ts:168] [E: packages/coding-agent/src/core/tools/write.ts:171] [E: packages/coding-agent/src/core/tools/write.ts:178] [E: packages/coding-agent/src/core/tools/write.ts:251] [E: packages/coding-agent/src/core/tools/write.ts:253] [E: packages/coding-agent/src/core/tools/write.ts:254] [E: packages/coding-agent/src/core/tools/write.ts:255].

## 5 执行模式 executionMode

`write` 的 definition 对象设置了 `name`、`label`、`description`、`promptSnippet`、`promptGuidelines`、`parameters` 和 `execute`;该对象源码片段中没有显式设置 `executionMode` 字段 [E: packages/coding-agent/src/core/tools/write.ts:186] [E: packages/coding-agent/src/core/tools/write.ts:187] [E: packages/coding-agent/src/core/tools/write.ts:188] [E: packages/coding-agent/src/core/tools/write.ts:189] [E: packages/coding-agent/src/core/tools/write.ts:190] [E: packages/coding-agent/src/core/tools/write.ts:191] [E: packages/coding-agent/src/core/tools/write.ts:192] [E: packages/coding-agent/src/core/tools/write.ts:193] [E: packages/coding-agent/src/core/tools/write.ts:194] [I]. 在 agent-core 合约里,per-tool `executionMode` 是 optional field,而 `Agent` 构造器默认 `toolExecution` 是 `"parallel"` [E: packages/agent/src/types.ts:393] [E: packages/agent/src/agent.ts:228].

因此 `write` 不是全局 sequential tool;默认 batch 调度下,如果没有全局 sequential 配置且 batch 中没有工具显式 `executionMode === "sequential"`,agent-core 会走 parallel tool execution [E: packages/agent/src/agent-loop.ts:381] [E: packages/agent/src/agent-loop.ts:384] [E: packages/agent/src/agent-loop.ts:387] [I]. `write` 的并发安全不靠 per-tool sequential,而靠 `withFileMutationQueue(absolutePath, ...)` 只串行化同一目标文件的 mutation [E: packages/coding-agent/src/core/tools/write.ts:201] [E: packages/coding-agent/src/core/tools/write.ts:203].

## 6 注册与装配

`packages/coding-agent/src/core/tools/index.ts` 是 built-in tools ground truth:`ToolName` 包含 `"write"`,`allToolNames` 也包含 `"write"` [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84]. 这个文件从 `write.ts` re-export `createWriteTool`、`createWriteToolDefinition`、`WriteOperations`、`WriteToolInput` 和 `WriteToolOptions` [E: packages/coding-agent/src/core/tools/index.ts:64] [E: packages/coding-agent/src/core/tools/index.ts:65] [E: packages/coding-agent/src/core/tools/index.ts:66] [E: packages/coding-agent/src/core/tools/index.ts:67] [E: packages/coding-agent/src/core/tools/index.ts:68].

按单名创建时,`createToolDefinition("write", cwd, options)` 调用 `createWriteToolDefinition(cwd, options?.write)`,而 `createTool("write", cwd, options)` 调用 `createWriteTool(cwd, options?.write)` [E: packages/coding-agent/src/core/tools/index.ts:96] [E: packages/coding-agent/src/core/tools/index.ts:104] [E: packages/coding-agent/src/core/tools/index.ts:105] [E: packages/coding-agent/src/core/tools/index.ts:117] [E: packages/coding-agent/src/core/tools/index.ts:125] [E: packages/coding-agent/src/core/tools/index.ts:126].

按 preset 创建时,`createCodingToolDefinitions` 把 `write` 放进 write-capable coding tools (`read`,`bash`,`edit`,`write`),`createAllToolDefinitions` 把 `write` 放进七个 built-ins 的 record [E: packages/coding-agent/src/core/tools/index.ts:138] [E: packages/coding-agent/src/core/tools/index.ts:139] [E: packages/coding-agent/src/core/tools/index.ts:143] [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:157] [E: packages/coding-agent/src/core/tools/index.ts:161].

`AgentSession._buildRuntime` 在没有 `baseToolsOverride` 时调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: { commandPrefix, shellPath } })`;这个调用没有给 `write` 传 custom `WriteToolOptions`,所以默认 session 装配使用 `write.ts` 内的本地 filesystem operations [E: packages/coding-agent/src/core/agent-session.ts:2434] [E: packages/coding-agent/src/core/agent-session.ts:2441] [E: packages/coding-agent/src/core/agent-session.ts:2442] [E: packages/coding-agent/src/core/agent-session.ts:2443] [E: packages/coding-agent/src/core/tools/write.ts:185] [I].

`AgentSession._refreshToolRegistry` 把 base tool definitions 和 extension/custom definitions 组成 definition registry,给 built-ins 标 synthetic source `<builtin:${name}>`,再经 runner wrapping 得到 `_toolRegistry` [E: packages/coding-agent/src/core/agent-session.ts:2341] [E: packages/coding-agent/src/core/agent-session.ts:2348] [E: packages/coding-agent/src/core/agent-session.ts:2349] [E: packages/coding-agent/src/core/agent-session.ts:2356] [E: packages/coding-agent/src/core/agent-session.ts:2384] [E: packages/coding-agent/src/core/agent-session.ts:2385] [E: packages/coding-agent/src/core/agent-session.ts:2395] [E: packages/coding-agent/src/core/agent-session.ts:2399]. 默认 active built-in tool names 是 `["read", "bash", "edit", "write"]`,除非 caller 提供 `baseToolsOverride` 或 `activeToolNames` [E: packages/coding-agent/src/core/agent-session.ts:2470] [E: packages/coding-agent/src/core/agent-session.ts:2472] [E: packages/coding-agent/src/core/agent-session.ts:2473].

## 7 execute() 走读

1. `execute` 先用 `resolveToCwd(path, cwd)` 把输入路径解析成 `absolutePath`,再用 `dirname(absolutePath)` 得到父目录 [E: packages/coding-agent/src/core/tools/write.ts:201] [E: packages/coding-agent/src/core/tools/write.ts:202].
2. 真实 mutation 包在 `withFileMutationQueue(absolutePath, async () => { ... })` 中,所以同一路径 key 的多个 mutation 会排队 [E: packages/coding-agent/src/core/tools/write.ts:203] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:32] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:34] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:35] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:41] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:42] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:51] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:52].
3. `write` 的队列 callback 内定义 `throwIfAborted`,并在每个 awaited filesystem operation 之后再次检查 abort signal;源码没有在这个 callback 内注册 abort event listener [E: packages/coding-agent/src/core/tools/write.ts:208] [E: packages/coding-agent/src/core/tools/write.ts:209] [E: packages/coding-agent/src/core/tools/write.ts:214] [E: packages/coding-agent/src/core/tools/write.ts:215] [E: packages/coding-agent/src/core/tools/write.ts:218] [E: packages/coding-agent/src/core/tools/write.ts:219] [I].
4. 操作顺序是 abort check -> `ops.mkdir(dir)` -> abort check -> `ops.writeFile(absolutePath, content)` -> abort check -> success result [E: packages/coding-agent/src/core/tools/write.ts:212] [E: packages/coding-agent/src/core/tools/write.ts:214] [E: packages/coding-agent/src/core/tools/write.ts:215] [E: packages/coding-agent/src/core/tools/write.ts:218] [E: packages/coding-agent/src/core/tools/write.ts:219] [E: packages/coding-agent/src/core/tools/write.ts:221].

`WriteOperations` 是可插拔 I/O boundary:接口要求 `writeFile(absolutePath, content)` 和 `mkdir(dir)` 两个 async 方法,`WriteToolOptions.operations` 可覆盖这些操作 [E: packages/coding-agent/src/core/tools/write.ts:25] [E: packages/coding-agent/src/core/tools/write.ts:27] [E: packages/coding-agent/src/core/tools/write.ts:29] [E: packages/coding-agent/src/core/tools/write.ts:37] [E: packages/coding-agent/src/core/tools/write.ts:39]. 默认实现使用 Node `fs/promises.writeFile(path, content, "utf-8")` 和 recursive `mkdir` [E: packages/coding-agent/src/core/tools/write.ts:32] [E: packages/coding-agent/src/core/tools/write.ts:34]. `createWriteToolDefinition` 会选 `options?.operations ?? defaultWriteOperations` [E: packages/coding-agent/src/core/tools/write.ts:185].

## 8 设计动机与 edge

### File mutation queue 关系

`withFileMutationQueue` 以 resolved/real path 作为 queue key:存在路径会走 `realpath(resolve(filePath))`,missing path 的 `ENOENT`/`ENOTDIR` 则退回 resolved path [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:12] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:16] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:17] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:19] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:21] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:22]. 这让 symlink alias 在目标已存在时共享同一队列;测试覆盖 target path 与 symlink path 的顺序为 target start/end 后 alias start/end [E: packages/coding-agent/test/file-mutation-queue.test.ts:77] [E: packages/coding-agent/test/file-mutation-queue.test.ts:82] [E: packages/coding-agent/test/file-mutation-queue.test.ts:86] [E: packages/coding-agent/test/file-mutation-queue.test.ts:91] [E: packages/coding-agent/test/file-mutation-queue.test.ts:97].

队列只串行同一文件,不同文件仍可并行;实现按 queue key 保存 `fileMutationQueues`,而测试断言不同 path 的 start 可以在彼此 end 之前发生 [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:4] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:34] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:42] [E: packages/coding-agent/test/file-mutation-queue.test.ts:56] [E: packages/coding-agent/test/file-mutation-queue.test.ts:60] [E: packages/coding-agent/test/file-mutation-queue.test.ts:65] [E: packages/coding-agent/test/file-mutation-queue.test.ts:74].

release 发生在 `finally`,并且只有当前 map entry 仍是本次 `chainedQueue` 时才删除 key;这避免旧调用清掉后来注册的 queue entry [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:55] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:56] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:57] [E: packages/coding-agent/src/core/tools/file-mutation-queue.ts:58] [I]. abort edge 的测试创建一个卡住的 first write,abort 后启动 second write,并断言 second 不会在 first settled 前开始;最终文件内容是 second write [E: packages/coding-agent/test/file-mutation-queue.test.ts:176] [E: packages/coding-agent/test/file-mutation-queue.test.ts:184] [E: packages/coding-agent/test/file-mutation-queue.test.ts:190] [E: packages/coding-agent/test/file-mutation-queue.test.ts:197] [E: packages/coding-agent/test/file-mutation-queue.test.ts:206] [E: packages/coding-agent/test/file-mutation-queue.test.ts:210] [E: packages/coding-agent/test/file-mutation-queue.test.ts:211] [E: packages/coding-agent/test/file-mutation-queue.test.ts:217] [E: packages/coding-agent/test/file-mutation-queue.test.ts:218].

### Render preview 与增量高亮

`renderCall` 使用 `WriteCallRenderComponent` 保存 `WriteHighlightCache`,在 partial args 未完成时尝试增量更新 cache,在 args 完成时重建完整 cache [E: packages/coding-agent/src/core/tools/write.ts:50] [E: packages/coding-agent/src/core/tools/write.ts:51] [E: packages/coding-agent/src/core/tools/write.ts:227] [E: packages/coding-agent/src/core/tools/write.ts:231] [E: packages/coding-agent/src/core/tools/write.ts:234] [E: packages/coding-agent/src/core/tools/write.ts:235] [E: packages/coding-agent/src/core/tools/write.ts:236]. 增量路径只接受新 content 以旧 raw content 为前缀;否则回退完整 rebuild [E: packages/coding-agent/src/core/tools/write.ts:97] [E: packages/coding-agent/src/core/tools/write.ts:99] [E: packages/coding-agent/src/core/tools/write.ts:102].

language highlighting 由 `getLanguageFromPath(rawPath)` 决定;没有语言时,preview 退回普通 `normalizeDisplayText(...).split("\n")` [E: packages/coding-agent/src/core/tools/write.ts:76] [E: packages/coding-agent/src/core/tools/write.ts:77] [E: packages/coding-agent/src/core/tools/write.ts:78] [E: packages/coding-agent/src/core/tools/write.ts:146] [E: packages/coding-agent/src/core/tools/write.ts:149].

## 跨包关系

[ref.tools-catalog](../../reference/tools-catalog.md) 是 built-in tool 名称与 registry 的 catalog;本页只展开 `write` 的行为和 edges,但用 `packages/coding-agent/src/core/tools/index.ts` 校验它确实在七个内置工具里 [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84].

[subsys.coding-agent.file-mutation-queue](../../subsystems/coding-agent/file-mutation-queue.md) 是 `withFileMutationQueue` 的 subsystem 节点;本页只解释 `write` 怎样调用它以及这对并发写入意味着什么 [E: packages/coding-agent/src/core/tools/write.ts:9] [E: packages/coding-agent/src/core/tools/write.ts:203].

## Sources

- packages/coding-agent/src/core/tools/write.ts
- packages/coding-agent/src/core/tools/file-mutation-queue.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts
- packages/coding-agent/test/tools.test.ts
- packages/coding-agent/test/file-mutation-queue.test.ts

## 相关

- [subsys.coding-agent.file-mutation-queue](../../subsystems/coding-agent/file-mutation-queue.md)
- [ref.tools-catalog](../../reference/tools-catalog.md)
