# uncertainty-update-4c6fb7cfe8-surface-mcp

节点: `surface.mcp.overview`

- [I] `pi mcp add` 的 known options 没有 `clientRegistration` / `authServerMetadataUrl` / `auth.provider`。断言“只能写进 JSON”来自 CLI parser 的选项白名单,不是反面测试。
- [I] 关掉内置 MCP 的用户面写法 `"extensions": ["-builtin:mcp"]` / `pi config` Built-in 未在本节点 source 的 settings-manager 里逐行核到;resource-loader 只证明 command 名冲突会 omit replaceable builtin。
- 未安装上游 `node_modules`,未跑 `mcp-command.test.ts` / `mcp-extension.test.ts`。
