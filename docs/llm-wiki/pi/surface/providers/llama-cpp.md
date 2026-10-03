---
id: surface.providers.llama-cpp
title: llama.cpp Router、Hugging Face 模型管理与分类器
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
 - packages/coding-agent/src/core/extensions/types.ts
 - packages/ai/src/api/llama-cpp-classify.ts
 - packages/ai/src/api/llama-cpp-classify.lazy.ts
 - packages/ai/src/types.ts
 - packages/coding-agent/test/llama-extension.test.ts
symbols:
 - llamaExtension
 - builtInExtensions
 - LlamaClient
 - HuggingFaceClient
 - createLlamaProvider
 - llamaCppClassifyApi
related:
 - surface.providers.auth
 - surface.slash-commands.overview
 - surface.extensions.contribution-points
 - subsys.coding-agent.model-registry
 - subsys.ai.classifiers
 - ref.ai.wire-protocol-catalog
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `surface.providers.llama-cpp` 描述 coding-agent 的内置 `llama.cpp` 扩展：它注册动态 `llama.cpp` provider 和交互式 `/llama` 命令，把 llama.cpp router 的模型目录、装载状态与 Hugging Face GGUF 搜索/下载接入 Pi。每个 selectable chat 模型同时合成一条同 id 的 `llama-cpp-classify` classifier。

## 能回答的问题

- 这项能力为什么是内置 extension，而不是 `pi-ai` 的静态 provider?
- 怎样配置 llama.cpp router，哪些环境变量会参与认证和 Hugging Face token 查找?
- `/llama` 怎样搜索、下载、加载和卸载模型?
- 哪些模型会进入 `/model`，下载或切换模型时会不会静默删除/卸载?
- `sleeping` router 模型和 `--no-models-autoload` 下的 unloaded preset 会不会出现在 `/model`?
- 每个 chat 模型怎样变成 `llama-cpp-classify` classifier，chat 与 classifier 的 `baseUrl` 有何不同?

## 装配与入口

`extensions/index.ts` 把 `llamaExtension` 登记为名为 `llama.cpp` 的 builtin extension（`builtin: true`，不是 replaceable）。`builtin` 使它以 `builtin:llama.cpp` 资源加载，并从 startup Extensions 列表隐藏 [E: packages/coding-agent/src/extensions/index.ts:7] [E: packages/coding-agent/src/extensions/index.ts:8] [E: packages/coding-agent/src/core/extensions/types.ts:2033]。`main()` 在用户 extension factories 之前展开 `builtInExtensions`，所以它不需要用户写 extension 配置即可装载 [E: packages/coding-agent/src/main.ts:64] [E: packages/coding-agent/src/main.ts:575]。

扩展启动时调用 `createLlamaProvider()` 并以 `pi.registerProvider()` 注册 provider，再注册 `/llama` 命令 [E: packages/coding-agent/src/extensions/llama/index.ts:42] [E: packages/coding-agent/src/extensions/llama/index.ts:44] [E: packages/coding-agent/src/extensions/llama/index.ts:183]。该命令只在 TUI 模式运行；其它模式会提示它仅在 interactive mode 可用 [E: packages/coding-agent/src/extensions/llama/index.ts:185] [E: packages/coding-agent/src/extensions/llama/index.ts:186] [E: packages/coding-agent/src/extensions/llama/index.ts:187]。

## 配置与动态 provider

官方文档要求使用带 router mode 的 llama-server，并通过 `/login llama.cpp` 配置 server URL；也可以使用 `LLAMA_BASE_URL`，可选 API key 来自 `LLAMA_API_KEY` [E: packages/coding-agent/docs/llama-cpp.md:9] [E: packages/coding-agent/docs/llama-cpp.md:48] [E: packages/coding-agent/docs/llama-cpp.md:58] [E: packages/coding-agent/docs/llama-cpp.md:61] [E: packages/coding-agent/docs/llama-cpp.md:62]。

provider id 是 `llama.cpp`，默认 server 是 `http://127.0.0.1:8080`；登录流程验证 `/models` 可访问，并把规范化 URL 存进 credential env [E: packages/coding-agent/src/extensions/llama/provider.ts:22] [E: packages/coding-agent/src/extensions/llama/provider.ts:23] [E: packages/coding-agent/src/extensions/llama/provider.ts:159] [E: packages/coding-agent/src/extensions/llama/provider.ts:174] [E: packages/coding-agent/src/extensions/llama/provider.ts:175] [E: packages/coding-agent/src/extensions/llama/provider.ts:178]。request auth 先解析 stored credential 或 `LLAMA_BASE_URL`，再取 credential key、`LLAMA_API_KEY` 或本地占位 key [E: packages/coding-agent/src/extensions/llama/provider.ts:181] [E: packages/coding-agent/src/extensions/llama/provider.ts:187] [E: packages/coding-agent/src/extensions/llama/provider.ts:190]。

这个 provider 的 catalog 是动态的：`modelIsSelectable()` 接受 `loaded`、idle-slept `sleeping`(请求会自动 wake)、以及 router autoload 打开时未失败的 unloaded `preset`。[E: packages/coding-agent/src/extensions/llama/provider.ts:37] [E: packages/coding-agent/src/extensions/llama/provider.ts:38] [E: packages/coding-agent/src/extensions/llama/provider.ts:40] [E: packages/coding-agent/src/extensions/llama/provider.ts:42] `setCatalog()` / `refreshModels()` 用同一过滤器把这些模型转成 Pi model；它们使用 `openai-completions`、router 的 `/v1` inference URL、零成本元数据和 llama.cpp 报告的 context window [E: packages/coding-agent/src/extensions/llama/provider.ts:142] [E: packages/coding-agent/src/extensions/llama/provider.ts:99] [E: packages/coding-agent/src/extensions/llama/provider.ts:109] [E: packages/coding-agent/src/extensions/llama/provider.ts:111] [E: packages/coding-agent/src/extensions/llama/provider.ts:228] [E: packages/coding-agent/src/extensions/llama/provider.ts:178]。`refreshModels()` 只在 catalog 里已有 unloaded preset 时才打 `/props` 读 `models_autoload`。[E: packages/coding-agent/src/extensions/llama/provider.ts:50] [E: packages/coding-agent/src/extensions/llama/provider.ts:52] [E: packages/coding-agent/src/extensions/llama/client.ts:197] [E: packages/coding-agent/src/extensions/llama/client.ts:200] 扩展每次同步目录后调用 model registry refresh, 并显式 `allowNetwork: true`, 避免 `PI_OFFLINE` 把刚从 `/llama` 读到的目录丢掉。[E: packages/coding-agent/src/extensions/llama/index.ts:46] [E: packages/coding-agent/src/extensions/llama/index.ts:54] [E: packages/coding-agent/src/extensions/llama/index.ts:57] 文档说明 router 以 `--no-models-autoload` 启动时, `/login llama.cpp` 只存连接, 必须先 `/llama` 加载模型再 `/model`。[E: packages/coding-agent/docs/llama-cpp.md:56]

## `/llama` 模型管理

`LlamaClient` 对 router 暴露 `/models`、`/models/load`、`/models/unload`、`/models/sse` 和下载用的 `POST /models` [E: packages/coding-agent/src/extensions/llama/client.ts:187] [E: packages/coding-agent/src/extensions/llama/client.ts:208] [E: packages/coding-agent/src/extensions/llama/client.ts:212] [E: packages/coding-agent/src/extensions/llama/client.ts:225] [E: packages/coding-agent/src/extensions/llama/client.ts:229]。load/download 等待路径同时消费 SSE progress 并轮询 catalog；abort 会停止等待和 watcher [E: packages/coding-agent/src/extensions/llama/client.ts:263] [E: packages/coding-agent/src/extensions/llama/client.ts:272] [E: packages/coding-agent/src/extensions/llama/client.ts:286] [E: packages/coding-agent/src/extensions/llama/client.ts:304] [E: packages/coding-agent/src/extensions/llama/client.ts:315] [E: packages/coding-agent/src/extensions/llama/client.ts:331]。

当已有别的模型 loaded/sleeping 时，加载新模型前 UI 明确询问“全部卸载”“保留已加载模型”或取消；替换过程取消/失败时会尝试恢复先前模型 [E: packages/coding-agent/src/extensions/llama/index.ts:73] [E: packages/coding-agent/src/extensions/llama/index.ts:76] [E: packages/coding-agent/src/extensions/llama/index.ts:82] [E: packages/coding-agent/src/extensions/llama/index.ts:85] [E: packages/coding-agent/src/extensions/llama/index.ts:105] [E: packages/coding-agent/src/extensions/llama/index.ts:114]。卸载也需要显式确认 [E: packages/coding-agent/src/extensions/llama/index.ts:131]。

## Hugging Face 搜索与下载

Hugging Face token 的优先级是 `HF_TOKEN`，然后 `HF_TOKEN_PATH`、`HF_HOME/token`、`XDG_CACHE_HOME/huggingface/token` 和默认 `~/.cache/huggingface/token` [E: packages/coding-agent/src/extensions/llama/huggingface.ts:46] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:47] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:50] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:54]。搜索 API 固定过滤 `gguf`、按 downloads 降序并取 20 个结果 [E: packages/coding-agent/src/extensions/llama/huggingface.ts:100] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:101] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:108]。

details 请求只从 `.gguf` siblings 汇总 quantization，排除 `mmproj`，并把 `Q4_K_M` 排在首位 [E: packages/coding-agent/src/extensions/llama/huggingface.ts:118] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:126] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:130] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:132] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:142] [E: packages/coding-agent/src/extensions/llama/huggingface.ts:145]。gated model 会显示访问要求，实际下载仍由 llama.cpp router 完成 [E: packages/coding-agent/src/extensions/llama/index.ts:143] [E: packages/coding-agent/src/extensions/llama/index.ts:144] [E: packages/coding-agent/src/extensions/llama/index.ts:147] [E: packages/coding-agent/src/extensions/llama/index.ts:169] [E: packages/coding-agent/src/extensions/llama/index.ts:175]。

## Classification

每个进入 catalog 的 selectable chat 模型同时合成一条同 id 的 classifier：`type: "classifier"`、`api: "llama-cpp-classify"`、`provider: "llama.cpp"`、零成本、`input: ["text"]` [E: packages/coding-agent/src/extensions/llama/provider.ts:80] [E: packages/coding-agent/src/extensions/llama/provider.ts:86] [E: packages/coding-agent/src/extensions/llama/provider.ts:89] [E: packages/coding-agent/src/extensions/llama/provider.ts:90] [E: packages/coding-agent/src/extensions/llama/provider.ts:93]。`setCatalog()` / `refreshModels()` 用与 chat 相同的 `modelIsSelectable()` 过滤器生成 `classifiers` 数组；`getModels()` 只返回 chat，`getAllModels()` 返回 `[...models, ...classifiers]` [E: packages/coding-agent/src/extensions/llama/provider.ts:147] [E: packages/coding-agent/src/extensions/llama/provider.ts:149] [E: packages/coding-agent/src/extensions/llama/provider.ts:199] [E: packages/coding-agent/src/extensions/llama/provider.ts:200]。

chat 行的 `baseUrl` 是 `llamaInferenceUrl(serverUrl)`（规范化 server + `/v1`，给 OpenAI Completions）；classifier 行的 `baseUrl` 是 server root（给 `/tokenize`、`/apply-template`、`/completion`）[E: packages/coding-agent/src/extensions/llama/provider.ts:91] [E: packages/coding-agent/src/extensions/llama/provider.ts:111] [E: packages/coding-agent/src/extensions/llama/client.ts:157]。持久化 catalog 同时写下 chat 与 classifier 两行；离线 restore 按 `api === "llama-cpp-classify"` 把 classifier 滤回来 [E: packages/coding-agent/src/extensions/llama/provider.ts:209] [E: packages/coding-agent/src/extensions/llama/provider.ts:211] [E: packages/coding-agent/src/extensions/llama/provider.ts:253] [E: packages/coding-agent/test/llama-extension.test.ts:180] [E: packages/coding-agent/test/llama-extension.test.ts:183] [E: packages/coding-agent/test/llama-extension.test.ts:199]。

`provider.classify` 委托 `llamaCppClassifyApi()`：模型不生成文本答案，而是把每题渲染成带单 token 标签的 prompt，读 next-token log-prob 再 softmax。`choice` 用字母标签（最多 62）、`bool` 用 `Yes`/`No`、`score` 用数字（最多 10 级）。协议细节在 [subsys.ai.classifiers](../../subsystems/ai/classifiers.md)；`llama-cpp-classify` 是 `KnownClassifierApi` 的第三个 key，不进入 42 个 generated shard [E: packages/coding-agent/src/extensions/llama/provider.ts:12] [E: packages/coding-agent/src/extensions/llama/provider.ts:140] [E: packages/coding-agent/src/extensions/llama/provider.ts:262] [E: packages/ai/src/api/llama-cpp-classify.ts:425] [E: packages/ai/src/api/llama-cpp-classify.ts:436] [E: packages/ai/src/types.ts:35] [E: packages/coding-agent/docs/llama-cpp.md:91]。

产品入口：codemode 脚本的 `models.classify()` 与扩展的 `ctx.modelRegistry.classify()`；`/model` 仍只列 chat，classifier 必须 `getModelOfType("classifier", "llama.cpp", id)` [E: packages/coding-agent/docs/llama-cpp.md:91] [I]。

## Gotcha

- 这不是 `packages/ai/src/providers/all.ts` 的静态 built-in provider 之一；它由 coding-agent 内置 extension 在运行时注册。`/model` 现在含 `loaded`、`sleeping` 和(autoload 打开时) unloaded preset, 不只是 `loaded`。[E: packages/coding-agent/src/extensions/llama/provider.ts:37] [E: packages/coding-agent/src/extensions/llama/provider.ts:42]
- `/llama` 的“下载”把 repository/quantization 交给 router；Pi 不直接把 GGUF 写入本地 cache，也没有 silent delete 路径 [E: packages/coding-agent/src/extensions/llama/index.ts:168] [E: packages/coding-agent/src/extensions/llama/index.ts:175] [I]。
- 普通 Hugging Face inference provider 与本节点不同：前者是 `pi-ai` 静态 provider，后者搜索 Hugging Face GGUF 并控制本地 llama.cpp router。[I]
- classifier 行不进 `/model`（chat-only picker）。同一 id 的 chat 与 classifier 是两条 catalog 条目，`baseUrl` 也不同（`/v1` vs server root）[E: packages/coding-agent/src/extensions/llama/provider.ts:91] [E: packages/coding-agent/src/extensions/llama/provider.ts:111] [E: packages/coding-agent/src/extensions/llama/provider.ts:199]。
- `llama-cpp-classify` 不走 System One / `noul`。bool 答案是 `Yes` 标签的 next-token 概率 [E: packages/ai/src/api/llama-cpp-classify.ts:201] [E: packages/ai/src/api/llama-cpp-classify.ts:202]。

## Sources

- packages/coding-agent/docs/llama-cpp.md
- packages/coding-agent/src/extensions/index.ts
- packages/coding-agent/src/extensions/llama/index.ts
- packages/coding-agent/src/extensions/llama/client.ts
- packages/coding-agent/src/extensions/llama/huggingface.ts
- packages/coding-agent/src/extensions/llama/provider.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/ai/src/api/llama-cpp-classify.ts
- packages/ai/src/api/llama-cpp-classify.lazy.ts
- packages/ai/src/types.ts
- packages/coding-agent/test/llama-extension.test.ts

## 相关

- [surface.providers.auth](auth.md): `/login` 与 credential resolution。
- [surface.slash-commands.overview](../commands/overview.md): built-in、extension、prompt、skill 命令的分发边界。
- [surface.extensions.contribution-points](../extensions/contribution-points.md): provider/command contribution points。
- [subsys.coding-agent.model-registry](../../subsystems/coding-agent/model-registry.md): 产品层 `ModelRuntime.classify()` 包装。
- [subsys.ai.classifiers](../../subsystems/ai/classifiers.md): `llama-cpp-classify` 标签读出协议与三个 `KnownClassifierApi`。
- [ref.ai.wire-protocol-catalog](../../reference/wire-protocol-catalog.md): 10 chat + 1 image + 3 classifier API key。
