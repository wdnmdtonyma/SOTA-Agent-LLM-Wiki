# uncertainty: subsys.agent-core.prompt-templates

- L2 verifier 已逐条核对 `subsystems/agent-core/prompt-templates.md` 中 `[E]` 的可核性、行号精度和过度推断风险;未发现需要降级为 `[U]` 的断言,节点已置为 `status: verified`。
- 本轮仅收紧两处边界措辞: `loadSourcedPromptTemplates()` 的 source/mapper 行为改成 wrapper 层代码事实,`surface.prompt-templates.system` 的产品层覆盖范围标为边界推断 `[I]`。
