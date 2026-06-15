# Uncertainty staging 5

本文件只收集本批 14 个注册级薄页中的 `[U]`; 按任务约束, 不写入 `reference/uncertainty.md`。

- `tool.web-browser`: `tools.ts` 未暴露 `WebBrowserTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数和 `WEB_BROWSER_TOOL` gate 动机。
- `tool.monitor`: `tools.ts` 未暴露 `MonitorTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、monitor task 行为和 `MONITOR_TOOL` gate 动机。
- `tool.workflow`: `tools.ts` 未暴露 `WorkflowTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、workflow `call()` 控制流、render 函数、bundled workflow 初始化副作用内容和 `WORKFLOW_SCRIPTS` gate 动机。
- `tool.snip`: `tools.ts` 未暴露 `SnipTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、历史片段选择算法和 `HISTORY_SNIP` gate 动机。
- `tool.list-peers`: `tools.ts` 未暴露 `ListPeersTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、peer 来源、地址格式和 `UDS_INBOX` gate 动机。
- `tool.tungsten`: `tools.ts` 未暴露 `TungstenTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、系统自省行为和 ant-only gate 动机。
- `tool.ctx-inspect`: `tools.ts` 未暴露 `CtxInspectTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、上下文检查内容和 `CONTEXT_COLLAPSE` gate 动机。
- `tool.overflow-test`: `tools.ts` 未暴露 `OverflowTestTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、overflow 测试场景和 `OVERFLOW_TEST_TOOL` gate 动机。
- `tool.verify-plan-execution`: `tools.ts` 未暴露 `VerifyPlanExecutionTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、plan verification 算法和 `CLAUDE_CODE_VERIFY_PLAN` env gate 动机。
- `tool.push-notification`: `tools.ts` 未暴露 `PushNotificationTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、notification payload/channel 和 push notification gates 动机。
- `tool.send-user-file`: `tools.ts` 未暴露 `SendUserFileTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、文件来源、大小限制、传输通道和 `KAIROS` gate 动机。
- `tool.subscribe-pr`: `tools.ts` 未暴露 `SubscribePRTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、PR subscription 对象、鉴权、回调语义和 `KAIROS_GITHUB_WEBHOOKS` gate 动机。
- `tool.suggest-background-pr`: `tools.ts` 未暴露 `SuggestBackgroundPRTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、PR suggestion 触发条件、GitHub 行为和 ant-only gate 动机。
- `tool.terminal-capture`: `tools.ts` 未暴露 `TerminalCaptureTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、terminal capture 范围、数据格式、安全约束和 `TERMINAL_PANEL` gate 动机。
