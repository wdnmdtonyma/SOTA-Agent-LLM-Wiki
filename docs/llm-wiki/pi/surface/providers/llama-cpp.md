---
id: surface.providers.llama-cpp
title: llama.cpp Router 与 Hugging Face 模型管理
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/docs/llama-cpp.md
  - packages/coding-agent/src/extensions/index.ts
  - packages/coding-agent/src/extensions/llama/index.ts
  - packages/coding-agent/src/extensions/llama/client.ts
  - packages/coding-agent/src/extensions/llama/huggingface.ts
  - packages/coding-agent/src/extensions/llama/provider.ts
  - packages/coding-agent/src/main.ts
symbols:
  - llamaExtension
  - builtInExtensions
  - LlamaClient
  - HuggingFaceClient
  - createLlamaProvider
related:
  - surface.providers.auth
  - surface.slash-commands.overview
  - surface.extensions.contribution-points
  - subsys.coding-agent.model-registry
evidence: explicit
status: verified
updated: c1019d9202
---

> `surface.providers.llama-cpp` 描述 coding-agent 新增的内置、隐藏扩展：它注册动态 `llama.cpp` provider 和交互式 `/llama` 命令，把 llama.cpp router 的模型目录、装载状态与 Hugging Face GGUF 搜索/下载接入 Pi。

## 能回答的问题

- 这项能力为什么是内置 extension，而不是 `pi-ai` 的静态 provider?
- 怎样配置 llama.cpp router，哪些环境变量会参与认证和 Hugging Face token 查找?
- `/llama` 怎样搜索、下载、加载和卸载模型?
- 哪些模型会进入 `/model`，下载或切换模型时会不会静默删除/卸载?

## 装配与入口

`extensions/index.ts` 把 `llamaExtension` 登记为名为 `llama.cpp` 的 hidden built-in extension [E: packages/coding-agent/src/extensions/index.ts:2] [E: packages/coding-agent/src/extensions/index.ts:4]。`main()` 在用户 extension factories 之前展开 `builtInExtensions`，所以它不需要用户写 extension 配置即可装载 [E: packages/coding-agent/src/main.ts:53] [E: packages/coding-agent/src/main.ts:523]。

扩展启动时调用 `createLlamaProvider()` 并以 `pi.registerProvider()` 注册 provider，再注册 `/llama` 命令 [E: packages/coding-agent/src/extensions/llama/index.ts:42] [E: packages/coding-agent/src/extensions/llama/index.ts:44] [E: packages/coding-agent/src/extensions/llama/index.ts:174]。该命令只在 TUI 模式运行；其它模式会提示它仅在 interactive mode 可用 [E: packages/coding-agent/src/extensions/llama/index.ts:176] [E: packages/coding-agent/src/extensions/llama/index.ts:177] [E: packages/coding-agent/src/extensions/llama/index.ts:178]。

## 配置与动态 provider

官方文档要求使用带 router mode 的 llama-server，并通过 `/login llama.cpp` 配置 server URL；也可以使用 `LLAMA_BASE_URL`，可选 API key 来自 `LLAMA_API_KEY` [E: packages/coding-agent/docs/llama-cpp.md:9] [E: packages/coding-agent/docs/llama-cpp.md:48] [E: packages/coding-agent/docs/llama-cpp.md:56] [E: packages/coding-agent/docs/llama-cpp.md:59] [E: packages/coding-agent/docs/llama-cpp.md:60]。

provider id 是 `llama.cpp`，默认 server 是 `http://127.0.0.1:8080`；登录流程验证 `/models` 可访问，并把规范化 URL 存进 credential env [E: packages/coding-agent/src/extensions/llama/provider.ts:13] [E: packages/coding-agent/src/extensions/llama/provider.ts:14] [E: packages/coding-agent/src/extensions/llama/provider.ts:72] [E: packages/coding-agent/src/extensions/llama/provider.ts:87] [E: packages/coding-agent/src/extensions/llama/provider.ts:88] [E: packages/coding-agent/src/extensions/llama/provider.ts:91]。request auth 先解析 stored credential 或 `LLAMA_BASE_URL`，再取 credential key、`LLAMA_API_KEY` 或本地占位 key [E: packages/coding-agent/src/extensions/llama/provider.ts:94] [E: packages/coding-agent/src/extensions/llama/provider.ts:100] [E: packages/coding-agent/src/extensions/llama/provider.ts:103]。

这个 provider 的 catalog 是动态的：`setCatalog()` 只把 status 为 `loaded` 的 router 模型转换为 Pi model；它们使用 `openai-completions`、router 的 `/v1` inference URL、零成本元数据和 llama.cpp 报告的 context window [E: packages/coding-agent/src/extensions/llama/provider.ts:28] [E: packages/coding-agent/src/extensions/llama/provider.ts:34] [E: packages/coding-agent/src/extensions/llama/provider.ts:36] [E: packages/coding-agent/src/extensions/llama/provider.ts:39] [E: packages/coding-agent/src/extensions/llama/provider.ts:61] [E: packages/coding-agent/src/extensions/llama/provider.ts:62]。扩展每次同步目录后调用 model registry refresh，因此只有已加载模型出现在 Pi 的模型选择面 [E: packages/coding-agent/src/extensions/llama/index.ts:46] [E: packages/coding-agent/src/extensions/llama/index.ts:52] [E: packages/coding-agent/src/extensions/llama/index.ts:53]。

## `/llama` 模型管理

`LlamaClient` 对 router 暴露 `/models`、`/models/load`、`/models/unload`、`/models/sse` 和下载用的 `POST /models` [E: packages/coding-agent/src/extensions/llama/client.ts:182] [E: packages/coding-agent/src/extensions/llama/client.ts:192] [E: packages/coding-agent/src/extensions/llama/client.ts:196] [E: packages/coding-agent/src/extensions/llama/client.ts:209] [E: packages/coding-agent/src/extensions/llama/client.ts:213]。load/download 等待路径同时消费 SSE progress 并轮询 catalog；abort 会停止等待和 watcher [E: packages/coding-agent/src/extensions/llama/client.ts:247] [E: packages/coding-agent/src/extensions/llama/client.ts:256] [E: packages/coding-agent/src/extensions/llama/client.ts:270] [E: packages/coding-agent/src/extensions/llama/client.ts:288] [E: packages/coding-agent/src/extensions/llama/client.ts:299] [E: packages/coding-agent/src/extensions/llama/client.ts:315]。

当已有别的模型 loaded/sleeping 时，加载新模型前 UI 明确询问“全部卸载”“保留已加载模型”或取消；替换过程取消/失败时会尝试恢复先前模型 [E: packages/coding-agent/src/extensions/llama/index.ts:64] [E: packages/coding-agent/src/extensions/llama/index.ts:67] [E: packages/coding-agent/src/extensions/llama/index.ts:73] [E: packages/coding-agent/src/extensions/llama/index.ts:76] [E: packages/coding-agent/src/extensions/llama/index.ts:96] [E: packages/coding-agent/src/extensions/llama/index.ts:105]。卸载也需要显式确认 [E: packages/coding-agent/src/extensions/llama/index.ts:122]。

## Hugging Face 搜索与下载

Hugging Face token 的优先级是 `HF_TOKEN`，然后 `HF_TOKEN_PATH`、`HF_HOME/token`、`XDG_CACHE_HOME/huggingface/token` 和默认 `~/.cache/huggingface/token` [E: packages/coding-agent/src/extensions/llama/huggingface.ts:46] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:47] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:50] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:54]。搜索 API 固定过滤 `gguf`、按 downloads 降序并取 20 个结果 [E: packages/coding-agent/src/extensions/llama/huggingface.ts:100] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:101] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:108]。

details 请求只从 `.gguf` siblings 汇总 quantization，排除 `mmproj`，并把 `Q4_K_M` 排在首位 [E: packages/coding-agent/src/extensions/llama/huggingface.ts:118] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:126] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:130] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:132] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:142] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:145]。gated model 会显示访问要求，实际下载仍由 llama.cpp router 完成 [E: packages/coding-agent/src/extensions/llama/index.ts:134] [E: packages/coding-agent/src/extensions/llama/index.ts:135] [E: packages/coding-agent/src/extensions/llama/index.ts:138] [E: packages/coding-agent/src/extensions/llama/index.ts:160] [E: packages/coding-agent/src/extensions/llama/index.ts:166]。

## Gotcha

- 这不是 `packages/ai/src/providers/all.ts` 的 38 个静态 built-in provider 之一；它由 coding-agent 内置 extension 在运行时注册，model list 也取决于 router 当前 loaded 状态。[I]
- `/llama` 的“下载”把 repository/quantization 交给 router；Pi 不直接把 GGUF 写入本地 cache，也没有 silent delete 路径 [E: packages/coding-agent/src/extensions/llama/index.ts:159] [E: packages/coding-agent/src/extensions/llama/index.ts:166] [I]。
- 普通 Hugging Face inference provider 与本节点不同：前者是 `pi-ai` 静态 provider，后者搜索 Hugging Face GGUF 并控制本地 llama.cpp router。[I]

## Sources

- packages/coding-agent/docs/llama-cpp.md
- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/extensions/llama/index.ts
- packages/coding-agent/src/extensions/llama/client.ts
- packages/coding-agent/src/extensions/llama/huggingface.ts
- packages/coding-agent/src/extensions/llama/provider.ts
- packages/coding-agent/src/main.ts

## 相关

- [surface.providers.auth](auth.md): `/login` 与 credential resolution。
- [surface.commands.overview](../commands/overview.md): built-in、extension、prompt、skill 命令的分发边界。
- [surface.extensions.contribution-points](../extensions/contribution-points.md): provider/command contribution points。
