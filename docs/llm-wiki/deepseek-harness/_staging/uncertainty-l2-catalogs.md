# uncertainty · L2 catalogs @ 477b4f4205

- **ctx-keys 未穷尽全部 `interface Context` merge。** 抽核对照源码约 125 个声明键。本轮就地补了 shipped 漏键 `pluginManager` / `profileContext` / `schedule`，删了不存在的 `ctx.agent`。仍未占行的包括：`configEditor`、`browserUse` / `computerUse`、`jobController` / `terminalController` / `directoryPickerController`、`mcpResources`、`officeToPdf`、`productTelemetry`、`sessionFeedback` / `sessionSkillCatalog` / `workspaceChanges`、`deepseekAccount`、`pluginPackages`、`speechToText` / `speechController`，以及若干 client 键（`shortcuts` / `feedbackUi` / `pluginNavigation` / `webTerminals` 等）。本页范围仍是产品默认树 + 已点名的 opt-in；完整枚举标 [U]。
- **capability-seams 同样不是全键表。** `pluginManager` 已补进 core spine；`schedule` / experimental 缝仍以 ctx-keys 为准。
- **官方 `docs/capability-seams.md` 仍画 `ctx.e2b`。** 冻结树无 `packages/e2b`、无 `dsh-fs-e2b` / `dsh-subprocess-e2b`、无 Context 键。wiki 跟代码；官方漂移不改源码。
