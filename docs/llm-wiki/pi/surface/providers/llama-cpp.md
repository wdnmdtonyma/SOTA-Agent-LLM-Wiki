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
updated: 853a80d26c
---

> `surface.providers.llama-cpp` 描述 coding-agent 新增的内置、隐藏扩展：它注册动态 `llama.cpp` provider 和交互式 `/llama` 命令，把 llama.cpp router 的模型目录、装载状态与 Hugging Face GGUF 搜索/下载接入 Pi。

## 能回答的问题

- 这项能力为什么是内置 extension，而不是 `pi-ai` 的静态 provider?
- 怎样配置 llama.cpp router，哪些环境变量会参与认证和 Hugging Face token 查找?
- `/llama` 怎样搜索、下载、加载和卸载模型?
- 哪些模型会进入 `/model`，下载或切换模型时会不会静默删除/卸载?
- `sleeping` router 模型和 `--no-models-autoload` 下的 unloaded preset 会不会出现在 `/model`?

## 装配与入口

`extensions/index.ts` 把 `llamaExtension` 登记为名为 `llama.cpp` 的 hidden built-in extension [E: packages/coding-agent/src/extensions/index.ts:2] [E: packages/coding-agent/src/extensions/index.ts:4]。`main()` 在用户 extension factories 之前展开 `builtInExtensions`，所以它不需要用户写 extension 配置即可装载 [E: packages/coding-agent/src/main.ts:64] [E: packages/coding-agent/src/main.ts:563]。

扩展启动时调用 `createLlamaProvider()` 并以 `pi.registerProvider()` 注册 provider，再注册 `/llama` 命令 [E: packages/coding-agent/src/extensions/llama/index.ts:42] [E: packages/coding-agent/src/extensions/llama/index.ts:44] [E: packages/coding-agent/src/extensions/llama/index.ts:183]。该命令只在 TUI 模式运行；其它模式会提示它仅在 interactive mode 可用 [E: packages/coding-agent/src/extensions/llama/index.ts:185] [E: packages/coding-agent/src/extensions/llama/index.ts:186] [E: packages/coding-agent/src/extensions/llama/index.ts:187]。

## 配置与动态 provider

官方文档要求使用带 router mode 的 llama-server，并通过 `/login llama.cpp` 配置 server URL；也可以使用 `LLAMA_BASE_URL`，可选 API key 来自 `LLAMA_API_KEY` [E: packages/coding-agent/docs/llama-cpp.md:9] [E: packages/coding-agent/docs/llama-cpp.md:48] [E: packages/coding-agent/docs/llama-cpp.md:58] [E: packages/coding-agent/docs/llama-cpp.md:61] [E: packages/coding-agent/docs/llama-cpp.md:62]。

provider id 是 `llama.cpp`，默认 server 是 `http://127.0.0.1:8080`；登录流程验证 `/models` 可访问，并把规范化 URL 存进 credential env [E: packages/coding-agent/src/extensions/llama/provider.ts:13] [E: packages/coding-agent/src/extensions/llama/provider.ts:14] [E: packages/coding-agent/src/extensions/llama/provider.ts:99] [E: packages/coding-agent/src/extensions/llama/provider.ts:114] [E: packages/coding-agent/src/extensions/llama/provider.ts:115] [E: packages/coding-agent/src/extensions/llama/provider.ts:118]。request auth 先解析 stored credential 或 `LLAMA_BASE_URL`，再取 credential key、`LLAMA_API_KEY` 或本地占位 key [E: packages/coding-agent/src/extensions/llama/provider.ts:121] [E: packages/coding-agent/src/extensions/llama/provider.ts:127] [E: packages/coding-agent/src/extensions/llama/provider.ts:130]。

这个 provider 的 catalog 是动态的：`modelIsSelectable()` 接受 `loaded`、idle-slept `sleeping`(请求会自动 wake)、以及 router autoload 打开时未失败的 unloaded `preset`。[E: packages/coding-agent/src/extensions/llama/provider.ts:28] [E: packages/coding-agent/src/extensions/llama/provider.ts:29] [E: packages/coding-agent/src/extensions/llama/provider.ts:31] [E: packages/coding-agent/src/extensions/llama/provider.ts:33] `setCatalog()` / `refreshModels()` 用同一过滤器把这些模型转成 Pi model；它们使用 `openai-completions`、router 的 `/v1` inference URL、零成本元数据和 llama.cpp 报告的 context window [E: packages/coding-agent/src/extensions/llama/provider.ts:82] [E: packages/coding-agent/src/extensions/llama/provider.ts:88] [E: packages/coding-agent/src/extensions/llama/provider.ts:55] [E: packages/coding-agent/src/extensions/llama/provider.ts:57] [E: packages/coding-agent/src/extensions/llama/provider.ts:165] [E: packages/coding-agent/src/extensions/llama/provider.ts:166]。`refreshModels()` 只在 catalog 里已有 unloaded preset 时才打 `/props` 读 `models_autoload`。[E: packages/coding-agent/src/extensions/llama/provider.ts:41] [E: packages/coding-agent/src/extensions/llama/provider.ts:43] [E: packages/coding-agent/src/extensions/llama/client.ts:196] [E: packages/coding-agent/src/extensions/llama/client.ts:200] 扩展每次同步目录后调用 model registry refresh, 并显式 `allowNetwork: true`, 避免 `PI_OFFLINE` 把刚从 `/llama` 读到的目录丢掉。[E: packages/coding-agent/src/extensions/llama/index.ts:46] [E: packages/coding-agent/src/extensions/llama/index.ts:54] [E: packages/coding-agent/src/extensions/llama/index.ts:57] 文档说明 router 以 `--no-models-autoload` 启动时, `/login llama.cpp` 只存连接, 必须先 `/llama` 加载模型再 `/model`。[E: packages/coding-agent/docs/llama-cpp.md:56]

## `/llama` 模型管理

`LlamaClient` 对 router 暴露 `/models`、`/models/load`、`/models/unload`、`/models/sse` 和下载用的 `POST /models` [E: packages/coding-agent/src/extensions/llama/client.ts:186] [E: packages/coding-agent/src/extensions/llama/client.ts:203] [E: packages/coding-agent/src/extensions/llama/client.ts:207] [E: packages/coding-agent/src/extensions/llama/client.ts:220] [E: packages/coding-agent/src/extensions/llama/client.ts:224]。load/download 等待路径同时消费 SSE progress 并轮询 catalog；abort 会停止等待和 watcher [E: packages/coding-agent/src/extensions/llama/client.ts:258] [E: packages/coding-agent/src/extensions/llama/client.ts:267] [E: packages/coding-agent/src/extensions/llama/client.ts:281] [E: packages/coding-agent/src/extensions/llama/client.ts:299] [E: packages/coding-agent/src/extensions/llama/client.ts:310] [E: packages/coding-agent/src/extensions/llama/client.ts:326]。

当已有别的模型 loaded/sleeping 时，加载新模型前 UI 明确询问“全部卸载”“保留已加载模型”或取消；替换过程取消/失败时会尝试恢复先前模型 [E: packages/coding-agent/src/extensions/llama/index.ts:73] [E: packages/coding-agent/src/extensions/llama/index.ts:76] [E: packages/coding-agent/src/extensions/llama/index.ts:82] [E: packages/coding-agent/src/extensions/llama/index.ts:85] [E: packages/coding-agent/src/extensions/llama/index.ts:105] [E: packages/coding-agent/src/extensions/llama/index.ts:114]。卸载也需要显式确认 [E: packages/coding-agent/src/extensions/llama/index.ts:131]。

## Hugging Face 搜索与下载

Hugging Face token 的优先级是 `HF_TOKEN`，然后 `HF_TOKEN_PATH`、`HF_HOME/token`、`XDG_CACHE_HOME/huggingface/token` 和默认 `~/.cache/huggingface/token` [E: packages/coding-agent/src/extensions/llama/huggingface.ts:46] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:47] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:50] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:54]。搜索 API 固定过滤 `gguf`、按 downloads 降序并取 20 个结果 [E: packages/coding-agent/src/extensions/llama/huggingface.ts:100] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:101] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:108]。

details 请求只从 `.gguf` siblings 汇总 quantization，排除 `mmproj`，并把 `Q4_K_M` 排在首位 [E: packages/coding-agent/src/extensions/llama/huggingface.ts:118] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:126] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:130] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:132] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:142] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:145]。gated model 会显示访问要求，实际下载仍由 llama.cpp router 完成 [E: packages/coding-agent/src/extensions/llama/index.ts:143] [E: packages/coding-agent/src/extensions/llama/index.ts:144] [E: packages/coding-agent/src/extensions/llama/index.ts:147] [E: packages/coding-agent/src/extensions/llama/index.ts:169] [E: packages/coding-agent/src/extensions/llama/index.ts:175]。

## Gotcha

- 这不是 `packages/ai/src/providers/all.ts` 的静态 built-in provider 之一；它由 coding-agent 内置 extension 在运行时注册。`/model` 现在含 `loaded`、`sleeping` 和(autoload 打开时) unloaded preset, 不只是 `loaded`。[E: packages/coding-agent/src/extensions/llama/provider.ts:28] [E: packages/coding-agent/src/extensions/llama/provider.ts:33]
- `/llama` 的“下载”把 repository/quantization 交给 router；Pi 不直接把 GGUF 写入本地 cache，也没有 silent delete 路径 [E: packages/coding-agent/src/extensions/llama/index.ts:168] [E: packages/coding-agent/src/extensions/llama/index.ts:175] [I]。
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
