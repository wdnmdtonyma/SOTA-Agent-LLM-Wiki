# uncertainty · user-questions

- **官方 README 把 permission plugin 写成调用方，shipped 源码没有这条边。** `packages/interaction/user-questions/README.md` 开篇写：`ctx.userQuestions` 是「model-facing tool or permission plugin」在需要问人时用的服务。本仓 `packages/interaction/permission-presets/` 与其它 permission 包不 `import` / 不 `ctx.get('userQuestions')`。生产 Consumer 是 `@deepseek-ai/dsh-tool-ask-user`（`ask_user_question`）和 `@deepseek-ai/dsh-plan-mode`（`exit_plan_mode` 里 `ctx.get('userQuestions')`）。wiki 跟代码，页内标 `[U]`。
