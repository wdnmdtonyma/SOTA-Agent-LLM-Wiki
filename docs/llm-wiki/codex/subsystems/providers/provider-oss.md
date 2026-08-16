---
id: subsys.providers.provider-oss
title: OSS providers
kind: subsystem
tier: T2
source: [codex-rs/model-provider-info/src/lib.rs, codex-rs/ollama/src/client.rs, codex-rs/ollama/src/lib.rs, codex-rs/ollama/src/url.rs, codex-rs/ollama/src/parser.rs, codex-rs/ollama/src/pull.rs, codex-rs/lmstudio/src/client.rs, codex-rs/utils/oss/src/lib.rs]
symbols: [create_oss_provider, OLLAMA_OSS_PROVIDER_ID, LMSTUDIO_OSS_PROVIDER_ID, OllamaClient, LMStudioClient, ensure_oss_ready, ensure_responses_supported, base_url_to_host_root, PullEvent]
related: [subsys.providers.overview, subsys.providers.responses-api, subsys.providers.model-catalog, subsys.providers.http-client]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> OSS providers 是本地 OpenAI-compatible provider defaults：Ollama 默认 `http://localhost:11434/v1`，LM Studio 默认 `http://localhost:1234/v1`，auth 为空、wire API 为 Responses、websocket 不支持；Ollama model management 使用 native `/api/*` endpoints，LM Studio probe/fetch/load 使用 OpenAI-compatible paths，download 走 `lms get` CLI。[E: codex-rs/model-provider-info/src/lib.rs:453][E: codex-rs/model-provider-info/src/lib.rs:454][E: codex-rs/model-provider-info/src/lib.rs:457][E: codex-rs/model-provider-info/src/lib.rs:458][E: codex-rs/model-provider-info/src/lib.rs:513][E: codex-rs/model-provider-info/src/lib.rs:515][E: codex-rs/model-provider-info/src/lib.rs:519][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:525][E: codex-rs/model-provider-info/src/lib.rs:533][E: codex-rs/model-provider-info/src/lib.rs:538][E: codex-rs/model-provider-info/src/lib.rs:546][E: codex-rs/model-provider-info/src/lib.rs:547][E: codex-rs/ollama/src/client.rs:100][E: codex-rs/ollama/src/client.rs:133][E: codex-rs/ollama/src/client.rs:189][E: codex-rs/lmstudio/src/client.rs:52][E: codex-rs/lmstudio/src/client.rs:101][E: codex-rs/lmstudio/src/client.rs:71][E: codex-rs/lmstudio/src/client.rs:177]

## 能回答的问题

- Ollama/LM Studio built-in provider 的默认 base URL 如何生成？
- `CODEX_OSS_PORT` 和 `CODEX_OSS_BASE_URL` 如何覆盖 OSS base URL？
- 推理 API 与本地模型管理 API 为什么不是同一组路径？
- Ollama pull stream 怎样解码进度和错误？
- LM Studio client 如何找到 `lms` CLI 并下载模型？

## 职责边界

`model-provider-info` 定义 OSS provider 的 OpenAI-compatible Responses endpoint；`ollama` 和 `lmstudio` crates 是本地 server/model management helpers，负责 probe、fetch model list、pull/download/load model，不是 Responses request runtime。[E: codex-rs/model-provider-info/src/lib.rs:508][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:526][E: codex-rs/model-provider-info/src/lib.rs:538][E: codex-rs/model-provider-info/src/lib.rs:546][E: codex-rs/ollama/src/client.rs:43][E: codex-rs/lmstudio/src/client.rs:19][I]

## 关键 crate/文件

- `codex-rs/model-provider-info/src/lib.rs`: OSS provider id、default ports、base URL env overrides、provider info shape。[E: codex-rs/model-provider-info/src/lib.rs:431][E: codex-rs/model-provider-info/src/lib.rs:432][E: codex-rs/model-provider-info/src/lib.rs:433][E: codex-rs/model-provider-info/src/lib.rs:433][E: codex-rs/model-provider-info/src/lib.rs:508][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:526][E: codex-rs/model-provider-info/src/lib.rs:547]
- `codex-rs/ollama/src/client.rs`: Ollama server probe、model list、version、pull stream。[E: codex-rs/ollama/src/client.rs:43][E: codex-rs/ollama/src/client.rs:98][E: codex-rs/ollama/src/client.rs:132][E: codex-rs/ollama/src/client.rs:158][E: codex-rs/ollama/src/client.rs:159][E: codex-rs/ollama/src/client.rs:185]
- `codex-rs/ollama/src/url.rs`: OpenAI-compatible `/v1` URL detection 和 host root conversion。[E: codex-rs/ollama/src/url.rs:2][E: codex-rs/ollama/src/url.rs:8]
- `codex-rs/lmstudio/src/client.rs`: LM Studio probe/fetch/load/download model 和 `lms` lookup。[E: codex-rs/lmstudio/src/client.rs:19][E: codex-rs/lmstudio/src/client.rs:51][E: codex-rs/lmstudio/src/client.rs:70][E: codex-rs/lmstudio/src/client.rs:100][E: codex-rs/lmstudio/src/client.rs:101][E: codex-rs/lmstudio/src/client.rs:113][E: codex-rs/lmstudio/src/client.rs:132][E: codex-rs/lmstudio/src/client.rs:173][E: codex-rs/lmstudio/src/client.rs:177]

## 数据模型

- `OLLAMA_OSS_PROVIDER_ID` 是 `ollama`，`LMSTUDIO_OSS_PROVIDER_ID` 是 `lmstudio`；default ports 分别是 11434 和 1234。[E: codex-rs/model-provider-info/src/lib.rs:431][E: codex-rs/model-provider-info/src/lib.rs:432][E: codex-rs/model-provider-info/src/lib.rs:433][E: codex-rs/model-provider-info/src/lib.rs:433]
- `create_oss_provider_with_base_url` 创建 name `gpt-oss`、base_url、无 env_key/auth/aws/query/header/retry override、`requires_openai_auth = false`、`supports_websockets = false`。[E: codex-rs/model-provider-info/src/lib.rs:526][E: codex-rs/model-provider-info/src/lib.rs:530][E: codex-rs/model-provider-info/src/lib.rs:530][E: codex-rs/model-provider-info/src/lib.rs:533][E: codex-rs/model-provider-info/src/lib.rs:536][E: codex-rs/model-provider-info/src/lib.rs:536][E: codex-rs/model-provider-info/src/lib.rs:537][E: codex-rs/model-provider-info/src/lib.rs:539][E: codex-rs/model-provider-info/src/lib.rs:540][E: codex-rs/model-provider-info/src/lib.rs:541][E: codex-rs/model-provider-info/src/lib.rs:542][E: codex-rs/model-provider-info/src/lib.rs:542][E: codex-rs/model-provider-info/src/lib.rs:542][E: codex-rs/model-provider-info/src/lib.rs:545][E: codex-rs/model-provider-info/src/lib.rs:546][E: codex-rs/model-provider-info/src/lib.rs:547]
- `OllamaClient` 保存 shared `RouteAwareClientPool`、host_root、uses_openai_compat；pool 由 config 的 `HttpClientFactory` 构造，route class 为 `Other`、connect timeout 为 5 秒，并显式保留 legacy custom-CA fallback。[E: codex-rs/ollama/src/client.rs:30][E: codex-rs/ollama/src/client.rs:33][E: codex-rs/ollama/src/client.rs:34][E: codex-rs/ollama/src/client.rs:57][E: codex-rs/ollama/src/client.rs:82][E: codex-rs/ollama/src/client.rs:87]
- `PullEvent` 包含 Status、ChunkProgress、Success、Error，表示 Ollama pull stream 的事件语义。[E: codex-rs/ollama/src/pull.rs:7][E: codex-rs/ollama/src/pull.rs:9][E: codex-rs/ollama/src/pull.rs:11][E: codex-rs/ollama/src/pull.rs:17][E: codex-rs/ollama/src/pull.rs:20]
- `LMStudioClient` 同样保存 route-aware pool 与 base_url；它从 config factory 构造 `ClientRouteClass::Other`、5 秒 connect timeout 的 pool。connection error 文案提示安装 LM Studio 并运行 `lms server start`。[E: codex-rs/lmstudio/src/client.rs:10][E: codex-rs/lmstudio/src/client.rs:11][E: codex-rs/lmstudio/src/client.rs:15][E: codex-rs/lmstudio/src/client.rs:36][E: codex-rs/lmstudio/src/client.rs:39]

## 控制流

1. built-in registry 插入 `ollama` 和 `lmstudio` provider，二者都通过 `create_oss_provider(default_port, WireApi::Responses)` 构造。[E: codex-rs/model-provider-info/src/lib.rs:437][E: codex-rs/model-provider-info/src/lib.rs:453][E: codex-rs/model-provider-info/src/lib.rs:454][E: codex-rs/model-provider-info/src/lib.rs:457][E: codex-rs/model-provider-info/src/lib.rs:458]
2. `create_oss_provider` 默认 URL 是 `http://localhost:{CODEX_OSS_PORT 或 default_port}/v1`，非空 `CODEX_OSS_BASE_URL` 会覆盖整个 base URL。[E: codex-rs/model-provider-info/src/lib.rs:508][E: codex-rs/model-provider-info/src/lib.rs:513][E: codex-rs/model-provider-info/src/lib.rs:515][E: codex-rs/model-provider-info/src/lib.rs:519][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:526]
3. `OllamaClient::try_from_oss_provider` 从 config 的 `model_providers` 查 `ollama` provider，并把同一 config 的 `HttpClientFactory` 传给 `try_from_provider`。[E: codex-rs/ollama/src/client.rs:43][E: codex-rs/ollama/src/client.rs:47][E: codex-rs/ollama/src/client.rs:57]
4. Ollama probe 对 OpenAI-compatible base URL 请求 `/v1/models`，否则请求 `/api/tags`；非 success 或连接失败返回安装/启动提示错误。[E: codex-rs/ollama/src/client.rs:100][E: codex-rs/ollama/src/client.rs:102][E: codex-rs/ollama/src/client.rs:87][E: codex-rs/ollama/src/client.rs:116][E: codex-rs/ollama/src/client.rs:119][E: codex-rs/ollama/src/client.rs:127]
5. `OllamaClient::fetch_models` 请求 native `/api/tags` 并从 JSON `models[].name` 提取 model names。[E: codex-rs/ollama/src/client.rs:133][E: codex-rs/ollama/src/client.rs:143][E: codex-rs/ollama/src/client.rs:145][E: codex-rs/ollama/src/client.rs:146][E: codex-rs/ollama/src/client.rs:149][E: codex-rs/ollama/src/client.rs:150]
6. OSS bootstrap 只构造一次 `OllamaClient`，再用它完成 Responses-version check、model listing 与缺失模型 pull；`ensure_responses_supported` 对缺失/不可解析 version 宽松通过，对低于最低版本则返回错误。[E: codex-rs/utils/oss/src/lib.rs:28][E: codex-rs/utils/oss/src/lib.rs:29][E: codex-rs/utils/oss/src/lib.rs:30][E: codex-rs/ollama/src/lib.rs:22][E: codex-rs/ollama/src/lib.rs:57]
7. `pull_model_stream` POST `/api/pull`，body 为 `{model, stream:true}`，逐行解析 JSON，发现 `error` yield Error，发现 status `success` yield Success 并结束。[E: codex-rs/ollama/src/client.rs:189][E: codex-rs/ollama/src/client.rs:192][E: codex-rs/ollama/src/client.rs:193][E: codex-rs/ollama/src/client.rs:219][E: codex-rs/ollama/src/client.rs:222]
8. `pull_events_from_value` 把 JSON `status` 转成 Status，status `success` 额外产生 Success；`total`/`completed` 产生 ChunkProgress。[E: codex-rs/ollama/src/parser.rs:8][E: codex-rs/ollama/src/parser.rs:9][E: codex-rs/ollama/src/parser.rs:10][E: codex-rs/ollama/src/parser.rs:11][E: codex-rs/ollama/src/parser.rs:19][E: codex-rs/ollama/src/parser.rs:20][E: codex-rs/ollama/src/parser.rs:22]
9. LM Studio client 从 config 查 `lmstudio` provider，probe `GET {base_url}/models`，fetch models 从 response JSON `data[].id` 提取 ids；这些 HTTP 调用也经过 route-aware pool。[E: codex-rs/lmstudio/src/client.rs:19][E: codex-rs/lmstudio/src/client.rs:36][E: codex-rs/lmstudio/src/client.rs:52][E: codex-rs/lmstudio/src/client.rs:53][E: codex-rs/lmstudio/src/client.rs:100][E: codex-rs/lmstudio/src/client.rs:103][E: codex-rs/lmstudio/src/client.rs:113]
10. LM Studio `load_model` POST `{base_url}/responses`，发送 model、empty input、`max_output_tokens: 1` 以触发模型加载。[E: codex-rs/lmstudio/src/client.rs:71][E: codex-rs/lmstudio/src/client.rs:73][E: codex-rs/lmstudio/src/client.rs:76][E: codex-rs/lmstudio/src/client.rs:79]
11. LM Studio `download_model` 先找 `lms`，再执行 `lms get --yes <model>`，非零退出码返回 error。[E: codex-rs/lmstudio/src/client.rs:174][E: codex-rs/lmstudio/src/client.rs:177][E: codex-rs/lmstudio/src/client.rs:178][E: codex-rs/lmstudio/src/client.rs:186]

## 设计动机与权衡

- OSS provider 使用 OpenAI-compatible `/v1` 作为推理 base URL；Ollama 本地管理会把 `http://localhost:11434/v1` 转成 host root 后请求 `/api/tags` 和 `/api/pull`，LM Studio 下载模型依赖本机 `lms` CLI。[E: codex-rs/ollama/src/url.rs:8][E: codex-rs/ollama/src/url.rs:8][E: codex-rs/ollama/src/url.rs:12][E: codex-rs/ollama/src/client.rs:133][E: codex-rs/ollama/src/client.rs:189][E: codex-rs/lmstudio/src/client.rs:174][E: codex-rs/lmstudio/src/client.rs:177][I]
- `pull_with_reporter` 不能只看 HTTP status，因为 Ollama 可能在 200 OK stream 中返回 error event；源码在 Error event 上返回 `Pull failed`。[E: codex-rs/ollama/src/client.rs:255][E: codex-rs/ollama/src/client.rs:263][E: codex-rs/ollama/src/client.rs:263]
- LM Studio CLI fallback 查找 `lms`、`~/.lmstudio/bin/lms` 或 Windows `lms.exe`，说明下载模型依赖本机 LM Studio CLI 而不是 HTTP server endpoint。[E: codex-rs/lmstudio/src/client.rs:138][E: codex-rs/lmstudio/src/client.rs:158][E: codex-rs/lmstudio/src/client.rs:161][E: codex-rs/lmstudio/src/client.rs:174][E: codex-rs/lmstudio/src/client.rs:177][E: codex-rs/lmstudio/src/client.rs:178]

## gotcha

- `CODEX_OSS_BASE_URL` 是全局 env override；同一进程里会影响 built-in Ollama 和 LM Studio 的 `create_oss_provider` 调用。[E: codex-rs/model-provider-info/src/lib.rs:454][E: codex-rs/model-provider-info/src/lib.rs:458][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:526][I]
- Ollama `fetch_models` 即使 probe 用 `/v1/models`，fetch list 仍请求 native `/api/tags`。[E: codex-rs/ollama/src/client.rs:100][E: codex-rs/ollama/src/client.rs:133]
- LM Studio fetch models 要求 response 有 `data` array；缺失时返回 invalid data error，而不是 empty list。[E: codex-rs/lmstudio/src/client.rs:113][E: codex-rs/lmstudio/src/client.rs:114][E: codex-rs/lmstudio/src/client.rs:116]

## Sources

- codex-rs/model-provider-info/src/lib.rs
- codex-rs/ollama/src/client.rs
- codex-rs/ollama/src/lib.rs
- codex-rs/ollama/src/url.rs
- codex-rs/ollama/src/parser.rs
- codex-rs/ollama/src/pull.rs
- codex-rs/lmstudio/src/client.rs
- codex-rs/utils/oss/src/lib.rs

## 相关

- `subsys.providers.overview`
- `subsys.providers.responses-api`
- `subsys.providers.model-catalog`
