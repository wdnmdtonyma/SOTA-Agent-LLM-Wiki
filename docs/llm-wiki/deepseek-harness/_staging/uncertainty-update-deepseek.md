# uncertainty-update-deepseek

- **默认 catalog 与 ACP/SDK/搜索默认模型不一致。** `DEFAULT_MODELS` 只有 `deepseek-flash` + `deepseek-v4-pro`。ACP 插件行、TS SDK 构造、Python SDK dataclass、`dsh-web-search-deepseek` 的 `DEEPSEEK_DEFAULT_MODEL` 仍硬编码 `deepseek-v4-flash`。未列出的 id 仍可请求（按文本）。wiki 两边都写；是否会把客户端默认改成 `deepseek-flash` 待产品决策。
- **账号 `resolveToken` 认 origin。** 默认 `inferenceOrigin` 是 `https://api.deepseek.com`，Messages `PUBLIC_BASE_URL` 是 `https://api.deepseek.com/anthropic`，同源所以 shipped 能交出 token。自定义 `DEEPSEEK_BASE_URL` 换 origin 时账号路由会一直 `ACCOUNT_SIGN_IN_REQUIRED`，直到 Platform `inferenceOrigin` 对齐。本仓没有「换 origin 仍能用账号」的产品测试。
- **无 Loader entry 时 directory `settingsNs`。** 单元测试直接 `ctx.plugin(ApiKey)` 时 `settingsNs` 是 plugin `name` `llm-deepseek-api-key`，shipped yml `id` 是 `llm-deepseek`。wiki 两边都写。
