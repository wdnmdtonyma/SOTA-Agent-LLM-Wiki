# uncertainty · surface.tools.write

- 本轮未留下需要合并进 `reference/uncertainty.md` 的 `[U]` 项。
- 已降级为 `[I]` 的推断: `path` 和 `content` 在 TypeBox object 中是必填字段。源码给出 `Type.Object({ path: Type.String(...), content: Type.String(...) })`,但本页没有额外引用 TypeBox 默认 required 语义的库文档。
- 已降级为 `[I]` 的推断: `write` 没有 tool-result-level `truncation` 或 `fullOutputPath`。源码可核到 `ToolDefinition<typeof writeSchema, undefined>` 与返回 `details: undefined`,但“不存在这些字段”是对该工具返回路径的结构性归纳。
- 已降级为 `[I]` 的推断: `write` 的执行路径没有 patch、search/replace 或局部编辑分支。源码可核到执行路径创建父目录并调用 `ops.writeFile(absolutePath, content)`,但“未出现某类分支”是对函数体的整体审读。
- 已降级为 `[I]` 的推断: `write` 默认可进入 parallel batch execution。源码可核到 `write` 未显式设置 `executionMode`,agent-core 省略时使用默认模式,且 `Agent` 默认 `toolExecution` 为 `"parallel"`;这是跨文件装配归纳,不是单行声明。
- 已降级为 `[I]` 的推断: file mutation queue 的 `finally` 删除保护避免旧调用清掉后来注册的 queue entry。源码可核到只在当前 map entry 仍等于本次 `chainedQueue` 时删除 key,但“避免旧调用清掉后来注册项”是对该保护条件的设计解释。
