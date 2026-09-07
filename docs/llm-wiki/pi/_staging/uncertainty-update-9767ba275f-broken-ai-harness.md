# uncertainty · broken-ai-harness · 9767ba275f

- `subsys.ai.cloudflare-gateway-binding`: 模块注释写 binding 调用 “pre-authenticated in-account”，本仓库测试只用 fake `binding.fetch()`，没有 Cloudflare Workers runtime 证明。
- `subsys.ai.cloudflare-gateway-binding`: `pi-coding-agent` 源码没有引用 `createAiBindingFetch`。CHANGELOG 仍写旧名 `createGatewayBindingFetch` “inherited”，看不到 coding-agent 再导出或自动装配。
