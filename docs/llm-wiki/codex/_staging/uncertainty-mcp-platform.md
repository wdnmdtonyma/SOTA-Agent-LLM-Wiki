# Uncertainty — mcp-platform @ 9ded177ce7

- [U] MCP prewarm 是 bounded best-effort 启动优化；step path 的 refresh/capture 才是正确性屏障，不能把 prewarm 完成当成 binding 已冻结。(`subsys.mcp.client`)
- [U] system proxy 支持受 feature/platform 与 application-resolved policy 控制；存在代码路径不代表所有构建默认启用。(`subsys.providers.http-client`)
