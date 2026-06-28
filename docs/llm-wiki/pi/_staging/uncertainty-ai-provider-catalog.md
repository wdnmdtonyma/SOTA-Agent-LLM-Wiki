# uncertainty-ai-provider-catalog

- L2 provider-catalog 核验结论: `reference/provider-catalog.md` 已按 `packages/ai/src/providers/all.ts` 的 `builtinProviders()` return array 覆盖 35 个文本 provider factory call, 表格顺序对应 `all.ts:72-106`, 节点正文不再保留旧 `~38` / `38` 数量口径。
- 外部 index 漂移仍未在本批次修改: `docs/llm-wiki/pi/index.json` 里 `ref.ai.provider-catalog` 标题仍是 `provider 完整目录(~38)`, `group.providers.instance_count` 仍是 `38`; 当前任务限定只改 provider-catalog 节点与本 staging 文件。
