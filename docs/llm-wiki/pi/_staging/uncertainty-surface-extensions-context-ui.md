# Uncertainty: surface.extensions.context-ui

- [U] `surface.extensions.api` 的文件现在存在,但自身仍是 draft,且 `docs/llm-wiki/pi/index.json` 里的 entry 仍标为 planned。本节点只把它作为 companion 边界链接,未复核其完整 API 内容或同步 index 状态。
- [U] `index.json` 中 `surface.extensions.context-ui` 的 planned source 只列出 `packages/coding-agent/src/core/extensions/types.ts` 和 `.pi/extensions/prompt-url-widget.ts`;本节点正文还需要 `runner.ts`、`interactive-mode.ts`、`extensions.md`、`rpc.md` 以及两个 examples 文件才能说明真实注入链路、mode behavior 和 dogfood 示例。用户限制本轮只写本节点和本 staging 文件,所以没有同步修改 `index.json`。
- L2 核验后节点已置 `status: verified`。本轮修正了 no-op UI constructor/默认返回值锚点、`resetExtensionUI()` 的 reload/session invalidate 调用点和清理项锚点、prompt URL pattern 锚点,并把 `custom-footer.ts` 的示例描述收窄为源码实际调用的 `footerData.getGitBranch()`。
