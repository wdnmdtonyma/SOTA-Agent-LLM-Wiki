# Uncertainty log — spine/trace-edit-permission.md (r3t4)

本文件汇总 trace-edit-permission.md 中标 `[U]` 的存疑项(无法在源码核实的流程细节)。

## [U] 项

(无。本 trace 全程落在真实源码上,无 `[U]` 项。)

## [I] 项(仅记录,不属 [U];已在节点内就近标注)

- streaming(`StreamingToolExecutor`)vs 非 streaming(`runTools`)哪条路径在运行时被选中:两条都存在且都汇入 `runToolUse`,具体选择属调度层,见 tool-call-anatomy.md。
- 交互式 `useCanUseTool` 闭包 vs headless `hasPermissionsToUseTool` 直用作 `canUseTool`:按运行模式分流(交互/headless/swarm),节点据 callsite 标 [I]。
- `validateInput` 的 `behavior:'ask'` 是校验失败消息(返回 is_error tool_result),与权限引擎的 `ask`(弹框)是不同机制——据 toolExecution.ts:687 的 `result === false` 短路推断。

## L2 独立证伪结果(148 条 [E] 全核)

- 1 处 DRIFT 已修:`[E: services/tools/toolExecution.ts:1397]`(指向注释 `// Run PostToolUse hooks`)→ 改为 **1483**(真实 `runPostToolUseHooks(` 调用行)。
- 其余 147 条 [E] 行号精确,落在被断言的代码行本身。
