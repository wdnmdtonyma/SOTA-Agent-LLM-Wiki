---
id: config.model-provider
title: 模型与 provider 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/core/src/config/mod.rs, codex-rs/config/src/profile_toml.rs, codex-rs/model-provider-info/src/lib.rs, docs/config.md]
symbols: [ConfigToml, ConfigProfile, ModelProviderInfo, built_in_model_providers, merge_configured_model_providers, validate_model_providers, resolve_oss_provider]
related: [cli.global-flags, command.model-mode, config.skills-plugins-features, config.auth-account]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> 模型与 provider 设置 catalog 覆盖 `ConfigToml` 中决定 model slug、provider catalog、reasoning 参数、personality、service tier 和 provider base URL 的顶层键。

## 能回答的问题

- `config.toml` 里哪些键控制默认 model、review model 和 provider?
- `model_providers` 如何扩展 built-in providers，哪些 built-in provider ID 不能覆盖?
- `model_reasoning_effort`、`plan_mode_reasoning_effort`、`model_reasoning_summary`、`model_verbosity` 的有效优先级是什么?
- `openai_base_url` 和 `chatgpt_base_url` 分别影响哪类请求?
- `oss_provider` 与 `--oss`/`--local-provider` 的 provider 选择关系是什么?

## Catalog

本 catalog 的每一行都是 `ConfigToml` 顶层字段；`ConfigProfile` 也定义 model、provider、reasoning、tools、web_search、features 和 `oss_provider` 等 profile-scoped 字段。[E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:29][E: codex-rs/config/src/profile_toml.rs:33][E: codex-rs/config/src/profile_toml.rs:59][E: codex-rs/config/src/profile_toml.rs:60][E: codex-rs/config/src/profile_toml.rs:68][E: codex-rs/config/src/profile_toml.rs:69]

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `model` | `Option<String>` | unset | `None`，CLI override、profile、global 三层按顺序选择。[E: codex-rs/core/src/config/mod.rs:1974] | 指定 agent 使用的 model slug；把 model slug 独立成顶层键，使 CLI `--model`、profile 和全局配置可以共享同一个选择点。[I] | `codex-rs/config/src/config_toml.rs:72` |
| `review_model` | `Option<String>` | unset | `None`，override 优先于 global。[E: codex-rs/core/src/config/mod.rs:2068] | `/review` 功能使用的 review model override；源码注释把该字段限定给 `/review` feature。[E: codex-rs/config/src/config_toml.rs:73] | `codex-rs/config/src/config_toml.rs:74` |
| `model_provider` | `Option<String>` | unset | `"openai"`，除非 CLI override、profile 或 global 指定其他 provider id。[E: codex-rs/core/src/config/mod.rs:1867][E: codex-rs/core/src/config/mod.rs:1868][E: codex-rs/core/src/config/mod.rs:1869][E: codex-rs/core/src/config/mod.rs:1870] | 从 `model_providers` map 中选择 provider；provider id 不存在会产生 `NotFound` 错误。[E: codex-rs/core/src/config/mod.rs:1872][E: codex-rs/core/src/config/mod.rs:1877][E: codex-rs/core/src/config/mod.rs:1879] | `codex-rs/config/src/config_toml.rs:77` |
| `model_context_window` | `Option<i64>` | unset | 直接写入 `Config.model_context_window`。[E: codex-rs/core/src/config/mod.rs:2210] | 指定 model context window token 数。[E: codex-rs/config/src/config_toml.rs:79] | `codex-rs/config/src/config_toml.rs:80` |
| `model_auto_compact_token_limit` | `Option<i64>` | unset | 直接写入 `Config.model_auto_compact_token_limit`。[E: codex-rs/core/src/config/mod.rs:2211] | 指定 conversation history 自动 compaction 的 token threshold。[E: codex-rs/config/src/config_toml.rs:82] | `codex-rs/config/src/config_toml.rs:83` |
| `model_providers` | `HashMap<String, ModelProviderInfo>` | `{}` | built-in providers 与用户 provider 合并。[E: codex-rs/core/src/config/mod.rs:1863][E: codex-rs/core/src/config/mod.rs:1864] | 扩展 provider catalog；built-in 默认包含 `openai`、`amazon-bedrock`、`ollama`、`lmstudio`。[E: codex-rs/model-provider-info/src/lib.rs:36][E: codex-rs/model-provider-info/src/lib.rs:38][E: codex-rs/model-provider-info/src/lib.rs:397][E: codex-rs/model-provider-info/src/lib.rs:398][E: codex-rs/model-provider-info/src/lib.rs:413][E: codex-rs/model-provider-info/src/lib.rs:414][E: codex-rs/model-provider-info/src/lib.rs:416][E: codex-rs/model-provider-info/src/lib.rs:420] | `codex-rs/config/src/config_toml.rs:196` |
| `model_reasoning_effort` | `Option<ReasoningEffort>` | unset | profile 覆盖 global；没有 CLI 同名顶层 config override 时保持 `None`。[E: codex-rs/core/src/config/mod.rs:2296][E: codex-rs/core/src/config/mod.rs:2298] | 设置 reasoning effort 默认值；profile 里也有同名字段。[E: codex-rs/config/src/profile_toml.rs:33] | `codex-rs/config/src/config_toml.rs:254` |
| `plan_mode_reasoning_effort` | `Option<ReasoningEffort>` | unset | profile 覆盖 global。[E: codex-rs/core/src/config/mod.rs:2299][E: codex-rs/core/src/config/mod.rs:2301] | 设置 Plan mode 专用 reasoning effort；官方 docs 说明 unset 时 Plan mode 使用内置 Plan preset 默认值，显式 `none` 表示无 reasoning。[E: docs/config.md:98][E: docs/config.md:99][E: docs/config.md:100][E: docs/config.md:101] | `codex-rs/config/src/config_toml.rs:255` |
| `model_reasoning_summary` | `Option<ReasoningSummary>` | unset | profile 覆盖 global。[E: codex-rs/core/src/config/mod.rs:2302][E: codex-rs/core/src/config/mod.rs:2304] | 设置 reasoning summary 行为；profile 也有同名字段用于 profile-scoped 默认值。[E: codex-rs/config/src/profile_toml.rs:35] | `codex-rs/config/src/config_toml.rs:256` |
| `model_verbosity` | `Option<Verbosity>` | unset | profile 覆盖 global。[E: codex-rs/core/src/config/mod.rs:2307] | 控制 GPT-5 Responses API `text.verbosity`。[E: codex-rs/config/src/config_toml.rs:257] | `codex-rs/config/src/config_toml.rs:258` |
| `model_supports_reasoning_summaries` | `Option<bool>` | unset | 直接写入 `Config.model_supports_reasoning_summaries`。[E: codex-rs/core/src/config/mod.rs:2305] | 为当前 configured model 强制启用 reasoning summaries support；字段注释明确是 override。[E: codex-rs/config/src/config_toml.rs:260] | `codex-rs/config/src/config_toml.rs:261` |
| `model_catalog_json` | `Option<AbsolutePathBuf>` | unset | profile 覆盖 global，并在 config load 时读取 catalog。[E: codex-rs/core/src/config/mod.rs:2071][E: codex-rs/core/src/config/mod.rs:2072][E: codex-rs/core/src/config/mod.rs:2075] | 指定 JSON model catalog 路径；字段注释说明该路径只在 startup 应用，per-thread override 是 no-op。[E: codex-rs/config/src/config_toml.rs:263][E: codex-rs/config/src/config_toml.rs:264] | `codex-rs/config/src/config_toml.rs:265` |
| `personality` | `Option<Personality>` | unset | override、profile、global、`Feature::Personality` 默认 `Pragmatic` 依次选择。[E: codex-rs/core/src/config/mod.rs:2030][E: codex-rs/core/src/config/mod.rs:2031][E: codex-rs/core/src/config/mod.rs:2032][E: codex-rs/core/src/config/mod.rs:2035][E: codex-rs/core/src/config/mod.rs:2036] | 指定 model personality；把 personality 与 model slug 分开，允许同一 model 在不同 profile 下用不同交互风格。[I] | `codex-rs/config/src/config_toml.rs:268` |
| `service_tier` | `Option<ServiceTier>` | unset | override、profile、global 后仅保留 `fast` 或 `flex`；`fast` 需要 `Feature::FastMode` enabled，`flex` 直接保留。[E: codex-rs/core/src/config/mod.rs:1975][E: codex-rs/core/src/config/mod.rs:1976][E: codex-rs/core/src/config/mod.rs:1978][E: codex-rs/core/src/config/mod.rs:1981][E: codex-rs/core/src/config/mod.rs:1982] | 为 new turns 指定 service tier；源码注释把该字段描述为 explicit service tier preference。[E: codex-rs/config/src/config_toml.rs:270] | `codex-rs/config/src/config_toml.rs:271` |
| `chatgpt_base_url` | `Option<String>` | unset | profile 覆盖 global；默认 `"https://chatgpt.com/backend-api/"`。[E: codex-rs/core/src/config/mod.rs:2308][E: codex-rs/core/src/config/mod.rs:2309][E: codex-rs/core/src/config/mod.rs:2310][E: codex-rs/core/src/config/mod.rs:2311] | 覆盖 ChatGPT backend API base URL，字段注释把它与 OpenAI API provider URL 区分开。[E: codex-rs/config/src/config_toml.rs:273] | `codex-rs/config/src/config_toml.rs:274` |
| `openai_base_url` | `Option<String>` | unset | 空字符串被过滤；非空值传给 built-in `openai` provider catalog 构造。[E: codex-rs/core/src/config/mod.rs:1858][E: codex-rs/core/src/config/mod.rs:1861][E: codex-rs/core/src/config/mod.rs:1864] | 覆盖 built-in `openai` model provider 的 base URL。[E: codex-rs/config/src/config_toml.rs:276] | `codex-rs/config/src/config_toml.rs:277` |
| `oss_provider` | `Option<String>` | unset | explicit `--local-provider` 优先，然后 profile，再 global；未配置时返回 `None`。[E: codex-rs/core/src/config/mod.rs:1402][E: codex-rs/core/src/config/mod.rs:1409][E: codex-rs/core/src/config/mod.rs:1411][E: codex-rs/core/src/config/mod.rs:1417][E: codex-rs/core/src/config/mod.rs:1422][E: codex-rs/core/src/config/mod.rs:1425] | 指定 local OSS provider，例如 `lmstudio` 或 `ollama`；validator 只接受这两个 provider id，旧 `ollama-chat` 会报 removed error。[E: codex-rs/config/src/config_toml.rs:400][E: codex-rs/config/src/config_toml.rs:841][E: codex-rs/config/src/config_toml.rs:842][E: codex-rs/model-provider-info/src/lib.rs:41] | `codex-rs/config/src/config_toml.rs:401` |

## Provider 结构与校验

`ModelProviderInfo` 的 schema 包含 display name、base URL、API key env var、bearer token、command auth、AWS auth、wire API、query/header overrides、retry/timeout 参数，以及 auth/websocket capability flags。[E: codex-rs/model-provider-info/src/lib.rs:80][E: codex-rs/model-provider-info/src/lib.rs:82][E: codex-rs/model-provider-info/src/lib.rs:84][E: codex-rs/model-provider-info/src/lib.rs:86][E: codex-rs/model-provider-info/src/lib.rs:94][E: codex-rs/model-provider-info/src/lib.rs:96][E: codex-rs/model-provider-info/src/lib.rs:98][E: codex-rs/model-provider-info/src/lib.rs:101][E: codex-rs/model-provider-info/src/lib.rs:103][E: codex-rs/model-provider-info/src/lib.rs:106][E: codex-rs/model-provider-info/src/lib.rs:111][E: codex-rs/model-provider-info/src/lib.rs:113][E: codex-rs/model-provider-info/src/lib.rs:115][E: codex-rs/model-provider-info/src/lib.rs:118][E: codex-rs/model-provider-info/src/lib.rs:121][E: codex-rs/model-provider-info/src/lib.rs:127][E: codex-rs/model-provider-info/src/lib.rs:130]

用户 `model_providers` 会先拒绝 reserved built-in IDs，Amazon Bedrock 例外仅允许覆盖 `aws.profile` 和 `aws.region`。[E: codex-rs/config/src/config_toml.rs:806][E: codex-rs/config/src/config_toml.rs:787][E: codex-rs/model-provider-info/src/lib.rs:429][E: codex-rs/model-provider-info/src/lib.rs:433][E: codex-rs/model-provider-info/src/lib.rs:440][E: codex-rs/model-provider-info/src/lib.rs:444][E: codex-rs/model-provider-info/src/lib.rs:452][E: codex-rs/model-provider-info/src/lib.rs:455] 非 Amazon Bedrock provider 如果 `name` 为空会失败，`aws` 字段也只支持 Amazon Bedrock provider id。[E: codex-rs/config/src/config_toml.rs:811][E: codex-rs/config/src/config_toml.rs:813][E: codex-rs/config/src/config_toml.rs:816][E: codex-rs/config/src/config_toml.rs:823]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/model-provider-info/src/lib.rs`
- `docs/config.md`

## 相关

- [CLI 全局 flag](../cli/global-flags.md) — 覆盖 `--model`、`--oss`、`--local-provider` 与 config key 的入口关系。
- [模型与模式 slash command](../slash-commands/model-mode.md) — 覆盖 `/model`、`/fast`、`/plan` 等 TUI 命令入口。
- [skills/plugins/features 设置](skills-plugins-features.md) — 覆盖 `Feature::FastMode`、legacy feature aliases 和 feature table。
