---
id: subsys.coding-agent.model-resolver
title: 模型解析(初始模型选择)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/model-resolver.ts
  - packages/coding-agent/src/core/model-runtime.ts
  - packages/coding-agent/src/modes/interactive/model-search.ts
symbols:
  - findInitialModel
  - getModelSearchText
related:
  - subsys.coding-agent.model-registry
evidence: explicit
status: verified
updated: cee5ff7520
---

> 模型解析子系统把 CLI/model scope/settings/session fallback 等输入解析成 `Model<Api>` 与 `ThinkingLevel`, 并给交互式 model selector 提供可搜索文本。

## 能回答的问题

- `--model provider/id`、`--provider p --model x`、`--model pattern:high` 分别如何解析?
- `--models` 或 settings 中的 enabled models 如何变成 Ctrl+P cycling scope?
- 初始模型 initial model 的优先级是什么, 何时跳过 scoped models?
- 为什么 OpenRouter-style model id 里的 `/` 或 `:exacto` 不一定被当成 provider/thinking 分隔符?
- 交互式 `/model` selector 与 scoped model selector 的 search text 为什么不同?
- 模型解析和 API key/auth 检查的边界在哪里?

## 职责边界

`packages/coding-agent/src/core/model-resolver.ts` 负责 model reference matching、model pattern parsing、model scope resolution、CLI model resolution、initial model fallback 和 session model restore helper；它导入 `ModelRuntime` 作为模型清单与 auth 状态来源，自己不加载 `models.json` 或解析 API key [E: packages/coding-agent/src/core/model-resolver.ts:11] [E: packages/coding-agent/src/core/model-runtime.ts:301] [E: packages/coding-agent/src/core/model-runtime.ts:305] [E: packages/coding-agent/src/core/model-runtime.ts:313] [E: packages/coding-agent/src/core/model-runtime.ts:370]。

本节点的 index authority symbols 是 `findInitialModel` 与 `getModelSearchText`; 正文仍会说明同文件里的 `resolveCliModel`、`resolveModelScopeWithDiagnostics`、`resolveModelScope`、`parseModelPattern` 和 `restoreModelFromSession`, 因为它们是 `findInitialModel` 的前置/相邻控制流, 但这些 helper 未被 index 标为本节点权威 symbol [E: packages/coding-agent/src/core/model-resolver.ts:195] [E: packages/coding-agent/src/core/model-resolver.ts:273] [E: packages/coding-agent/src/core/model-resolver.ts:355] [E: packages/coding-agent/src/core/model-resolver.ts:385] [E: packages/coding-agent/src/core/model-resolver.ts:572] [E: packages/coding-agent/src/core/model-resolver.ts:657] [I]。

`packages/coding-agent/src/modes/interactive/model-search.ts` 只负责 selector fuzzy search 的 searchable string; 真正的 model list、scope toggle、selection UI 在 interactive components 内完成 [E: packages/coding-agent/src/modes/interactive/model-search.ts:7] [E: packages/coding-agent/src/modes/interactive/model-search.ts:17] [E: packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts:91] [E: packages/coding-agent/src/modes/interactive/components/model-selector.ts:235]。

## 关键文件

- `packages/coding-agent/src/core/model-resolver.ts`: 默认模型表 `defaultModelPerProvider`、exact/reference match、pattern/thinking parser、scope resolver with diagnostics、CLI resolver、initial model selection、session restore fallback [E: packages/coding-agent/src/core/model-resolver.ts:14] [E: packages/coding-agent/src/core/model-resolver.ts:79] [E: packages/coding-agent/src/core/model-resolver.ts:195] [E: packages/coding-agent/src/core/model-resolver.ts:273] [E: packages/coding-agent/src/core/model-resolver.ts:355] [E: packages/coding-agent/src/core/model-resolver.ts:385] [E: packages/coding-agent/src/core/model-resolver.ts:572] [E: packages/coding-agent/src/core/model-resolver.ts:657]。
- `packages/coding-agent/src/modes/interactive/model-search.ts`: `getModelSearchText()` 将 `id provider provider/id provider id name` 拼成 scope selector 搜索文本, `getModelSelectorSearchText()` 将 provider 放在领先位置以改善 `/model` 排序 [E: packages/coding-agent/src/modes/interactive/model-search.ts:7] [E: packages/coding-agent/src/modes/interactive/model-search.ts:10] [E: packages/coding-agent/src/modes/interactive/model-search.ts:17] [E: packages/coding-agent/src/modes/interactive/model-search.ts:20]。
- `packages/coding-agent/src/main.ts`: startup runtime 在创建 session 前解析 `parsed.models ?? settingsManager.getEnabledModels()` 为 `scopedModels`, 并在 `buildSessionOptions()` 中把 CLI model、scoped model、thinking level 写入 `CreateAgentSessionOptions` [E: packages/coding-agent/src/main.ts:376] [E: packages/coding-agent/src/main.ts:393] [E: packages/coding-agent/src/main.ts:689] [E: packages/coding-agent/src/main.ts:691] [E: packages/coding-agent/src/main.ts:399] [E: packages/coding-agent/src/main.ts:429]。
- `packages/coding-agent/src/core/sdk.ts`: SDK session 在没有显式 `options.model` 且无法从已有 session restore model 时调用 `findInitialModel()` [E: packages/coding-agent/src/core/sdk.ts:192] [E: packages/coding-agent/src/core/sdk.ts:196] [E: packages/coding-agent/src/core/sdk.ts:208]。
- `packages/coding-agent/test/model-resolver.test.ts`: 行为测试覆盖 colon model id、provider/model ambiguity、custom fallback model id、`:thinking` suffix 和默认模型表 [E: packages/coding-agent/test/model-resolver.test.ts:138] [E: packages/coding-agent/test/model-resolver.test.ts:456] [E: packages/coding-agent/test/model-resolver.test.ts:546] [E: packages/coding-agent/test/model-resolver.test.ts:580] [E: packages/coding-agent/test/model-resolver.test.ts:640]。

## 数据模型与匹配规则

`ScopedModel` 是 model scope 的最小数据结构: 一个 `Model<Api>` 加一个可选 `thinkingLevel`; undefined 表示该 pattern 没有显式指定 thinking level, 后续 cycling 时可继承当前 session thinking level [E: packages/coding-agent/src/core/model-resolver.ts:55] [E: packages/coding-agent/src/core/model-resolver.ts:58] [E: packages/coding-agent/src/main.ts:430] [E: packages/coding-agent/src/main.ts:432]。

`findExactModelReferenceMatch()` 先匹配 canonical `provider/modelId`, 再匹配 slash split 后的 provider/id, 最后才用裸 model id; 裸 id 只有唯一匹配才返回, 多 provider 重名会返回 undefined [E: packages/coding-agent/src/core/model-resolver.ts:79] [E: packages/coding-agent/src/core/model-resolver.ts:90] [E: packages/coding-agent/src/core/model-resolver.ts:100] [E: packages/coding-agent/src/core/model-resolver.ts:119] [E: packages/coding-agent/src/core/model-resolver.ts:120]。

`tryMatchModel()` 在 exact reference 失败后做 partial matching: `model.id` 或 `model.name` 包含 pattern 即为候选; 候选里优先 alias-like id, 多个 alias 按 id 降序取第一个, 没有 alias 时对 dated versions 按 id 降序取第一个 [E: packages/coding-agent/src/core/model-resolver.ts:127] [E: packages/coding-agent/src/core/model-resolver.ts:134] [E: packages/coding-agent/src/core/model-resolver.ts:145] [E: packages/coding-agent/src/core/model-resolver.ts:150] [E: packages/coding-agent/src/core/model-resolver.ts:154]。

`parseModelPattern()` 的 colon 策略是先把完整 pattern 当 model 匹配; 匹配失败后才按最后一个 colon 拆 suffix, suffix 是 valid thinking level 时递归解析 prefix 并返回该 level, suffix 无效时默认 scope mode 会递归 prefix 并给 warning [E: packages/coding-agent/src/core/model-resolver.ts:201] [E: packages/coding-agent/src/core/model-resolver.ts:207] [E: packages/coding-agent/src/core/model-resolver.ts:216] [E: packages/coding-agent/src/core/model-resolver.ts:218] [E: packages/coding-agent/src/core/model-resolver.ts:230] [E: packages/coding-agent/src/core/model-resolver.ts:238] [E: packages/coding-agent/src/core/model-resolver.ts:243]。

CLI resolver 使用 strict colon fallback: `resolveCliModel()` 调 `parseModelPattern(pattern, candidates, { allowInvalidThinkingLevelFallback: false })`, 因此 `--model` 中的 invalid `:suffix` 不会被静默剥成 thinking level; 测试覆盖 `gpt-4o:extended` 与 custom `:banana` 作为 raw model id 的行为 [E: packages/coding-agent/src/core/model-resolver.ts:465] [E: packages/coding-agent/src/core/model-resolver.ts:466] [E: packages/coding-agent/test/model-resolver.test.ts:384] [E: packages/coding-agent/test/model-resolver.test.ts:597]。

## 控制流

1. CLI parser 把 `--provider`、`--model`、`--thinking` 和 `--models` 写进 `Args`; `--models` 是 comma-separated patterns, `--thinking` 只接受 `off|minimal|low|medium|high|xhigh|max` [E: packages/coding-agent/src/cli/args.ts:57] [E: packages/coding-agent/src/cli/args.ts:87] [E: packages/coding-agent/src/cli/args.ts:89] [E: packages/coding-agent/src/cli/args.ts:115] [E: packages/coding-agent/src/cli/args.ts:130] [E: packages/coding-agent/src/cli/args.ts:132]。
2. `main()` 取 `parsed.models ?? settingsManager.getEnabledModels()`，有 patterns 时调用 `resolveModelScope(patterns, modelRuntime)`；结果传入 `buildSessionOptions()` [E: packages/coding-agent/src/main.ts:689] [E: packages/coding-agent/src/main.ts:691] [E: packages/coding-agent/src/main.ts:696]。
3. `resolveModelScope()` 调用 `resolveModelScopeWithDiagnostics()` 并打印 diagnostics；真正 scope 解析只在 `modelRuntime.getAvailable()` 返回的 auth-configured models 内进行，因此 Ctrl+P cycling scope 不会包含当前无 auth 的模型 [E: packages/coding-agent/src/core/model-resolver.ts:273] [E: packages/coding-agent/src/core/model-resolver.ts:275] [E: packages/coding-agent/src/core/model-resolver.ts:277] [E: packages/coding-agent/src/core/model-resolver.ts:355] [E: packages/coding-agent/src/core/model-resolver.ts:356] [E: packages/coding-agent/src/core/model-runtime.ts:313] [E: packages/coding-agent/src/core/model-runtime.ts:326] [E: packages/coding-agent/src/core/model-runtime.ts:327]。
4. Scope pattern 含 `*`、`?` 或 `[` 时走 glob branch: 可从 suffix 解析 thinking level, 并用 `minimatch()` 同时匹配 `provider/modelId` 与裸 `model.id`; 无匹配时记录 diagnostic 后 continue, 最终由 `resolveModelScope()` wrapper 打印 warning [E: packages/coding-agent/src/core/model-resolver.ts:283] [E: packages/coding-agent/src/core/model-resolver.ts:289] [E: packages/coding-agent/src/core/model-resolver.ts:291] [E: packages/coding-agent/src/core/model-resolver.ts:308] [E: packages/coding-agent/src/core/model-resolver.ts:309] [E: packages/coding-agent/src/core/model-resolver.ts:312] [E: packages/coding-agent/src/core/model-resolver.ts:316] [E: packages/coding-agent/src/core/model-resolver.ts:358]。
5. Scope non-glob pattern 走 `parseModelPattern()`; 有 warning 或无 model 时记录 diagnostic, 有 model 时按 `modelsAreEqual()` 去重后 push 到 `scopedModels` [E: packages/coding-agent/src/core/model-resolver.ts:330] [E: packages/coding-agent/src/core/model-resolver.ts:332] [E: packages/coding-agent/src/core/model-resolver.ts:336] [E: packages/coding-agent/src/core/model-resolver.ts:347] [E: packages/coding-agent/src/core/model-resolver.ts:348]。
6. `buildSessionOptions()` 优先解析 CLI `parsed.model`: `resolveCliModel()` 可接收 optional `cliProvider` 与 `cliThinking`, warning/error 被转成 startup diagnostics, 成功时写 `options.model`; `--model pattern:thinking` 只有在没有显式 `--thinking` 时写入 `options.thinkingLevel` [E: packages/coding-agent/src/main.ts:375] [E: packages/coding-agent/src/main.ts:376] [E: packages/coding-agent/src/main.ts:382] [E: packages/coding-agent/src/main.ts:385] [E: packages/coding-agent/src/main.ts:388] [E: packages/coding-agent/src/main.ts:392] [E: packages/coding-agent/src/main.ts:393]。
7. 如果没有 CLI model 且有 scoped models 且 session 没有既有 messages, startup 会优先使用 saved default 中落在 scope 内的 model, 否则使用 scope 的第一个 model; scoped pattern 上的 thinking level 也只在没有 `--thinking` 时生效 [E: packages/coding-agent/src/main.ts:399] [E: packages/coding-agent/src/main.ts:399] [E: packages/coding-agent/src/main.ts:406] [E: packages/coding-agent/src/main.ts:413] [E: packages/coding-agent/src/main.ts:415] [E: packages/coding-agent/src/main.ts:422] [E: packages/coding-agent/src/main.ts:423]。
8. `findInitialModel()` 的 fallback 顺序是: `cliProvider && cliModel` 时解析 CLI 并可 `process.exit(1)`, 非 continuing 时取第一个 scoped model, settings default provider/model, auth-configured available models 中的 known-provider default, 最后 first available 或 undefined [E: packages/coding-agent/src/core/model-resolver.ts:597] [E: packages/coding-agent/src/core/model-resolver.ts:613] [E: packages/coding-agent/src/core/model-resolver.ts:622] [E: packages/coding-agent/src/core/model-resolver.ts:634] [E: packages/coding-agent/src/core/model-resolver.ts:638] [E: packages/coding-agent/src/core/model-resolver.ts:647] [E: packages/coding-agent/src/core/model-resolver.ts:651]。
9. `restoreModelFromSession()` 不是 `findInitialModel()` 内部步骤；它单独用 `modelRuntime.getModel()` 和 `hasConfiguredAuth()` 验证 saved provider/modelId，失败时可回退到 current model 或 available models [E: packages/coding-agent/src/core/model-resolver.ts:657] [E: packages/coding-agent/src/core/model-resolver.ts:662] [E: packages/coding-agent/src/core/model-resolver.ts:664] [E: packages/coding-agent/src/core/model-resolver.ts:667] [E: packages/coding-agent/src/core/model-resolver.ts:669] [E: packages/coding-agent/src/core/model-resolver.ts:684] [E: packages/coding-agent/src/core/model-resolver.ts:695]。

## CLI provider/model 解析细节

`resolveCliModel()` 特意用 `modelRuntime.getModels()` 而不是 `getAvailable()`，因为 CLI 可以配合 `--api-key` 做 first-time setup；代码在读取 all models 后才处理 provider map、provider inference 与 fallback custom model [E: packages/coding-agent/src/core/model-resolver.ts:389] [E: packages/coding-agent/src/core/model-resolver.ts:391] [E: packages/coding-agent/src/core/model-resolver.ts:399] [E: packages/coding-agent/src/core/model-resolver.ts:409] [E: packages/coding-agent/src/core/model-resolver.ts:464]。

无显式 `--provider` 时, `resolveCliModel()` 先尝试把 `--model` 的第一个 slash 前缀当 known provider; 这让 `zai/glm-5` 优先解析为 provider `zai` + model `glm-5`, 而不是 gateway provider 下 id 为 `zai/glm-5` 的 raw model [E: packages/coding-agent/src/core/model-resolver.ts:431] [E: packages/coding-agent/src/core/model-resolver.ts:435] [E: packages/coding-agent/src/core/model-resolver.ts:437] [E: packages/coding-agent/test/model-resolver.test.ts:392] [E: packages/coding-agent/test/model-resolver.test.ts:456] [E: packages/coding-agent/test/model-resolver.test.ts:457]。

如果 slash provider inference 命中了一个 unauthenticated provider/model, 但完整 raw model id 存在且唯一 authenticated, resolver 会偏向 authenticated raw id; 这个例外用于处理 raw id 恰好以 known provider name 开头的模型 [E: packages/coding-agent/src/core/model-resolver.ts:475] [E: packages/coding-agent/src/core/model-resolver.ts:479] [E: packages/coding-agent/src/core/model-resolver.ts:481] [E: packages/coding-agent/test/model-resolver.test.ts:450] [E: packages/coding-agent/test/model-resolver.test.ts:496] [E: packages/coding-agent/test/model-resolver.test.ts:497]。

显式 provider 下找不到注册 model 时, `buildFallbackModel()` 会拿该 provider 的 default model 或第一个 provider model 作 base, 再替换成 requested custom model id/name; 如果 model pattern 带 valid `:thinking` 且没有显式 `--thinking`, fallback path 会剥掉 suffix 并在 requested thinking 不是 `off` 时把 fallback model 标为 `reasoning: true` [E: packages/coding-agent/src/core/model-resolver.ts:166] [E: packages/coding-agent/src/core/model-resolver.ts:170] [E: packages/coding-agent/src/core/model-resolver.ts:175] [E: packages/coding-agent/src/core/model-resolver.ts:537] [E: packages/coding-agent/src/core/model-resolver.ts:539] [E: packages/coding-agent/src/core/model-resolver.ts:541] [E: packages/coding-agent/test/model-resolver.test.ts:539] [E: packages/coding-agent/test/model-resolver.test.ts:546] [E: packages/coding-agent/test/model-resolver.test.ts:547] [E: packages/coding-agent/test/model-resolver.test.ts:548]。

## 搜索文本与交互入口

`getModelSearchText(item)` 返回 `${id} ${provider} ${provider}/${id} ${provider} ${id}${name}`, 所以 scoped model selector 支持先打 model id、provider、provider/id 或 display name; `ScopedModelsSelectorComponent.refresh()` 把这个函数交给 `fuzzyFilter()` [E: packages/coding-agent/src/modes/interactive/model-search.ts:7] [E: packages/coding-agent/src/modes/interactive/model-search.ts:10] [E: packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts:184] [E: packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts:187]。

`getModelSelectorSearchText(item)` 返回 `${provider} ${provider}/${id} ${provider} ${id}${name}`, 刻意不把 bare model id 放在 leading position; 其排序动机来自函数前注释, 代码层面可见 `/model` selector 使用该 searchable text [E: packages/coding-agent/src/modes/interactive/model-search.ts:17] [E: packages/coding-agent/src/modes/interactive/model-search.ts:20] [E: packages/coding-agent/src/modes/interactive/components/model-selector.ts:235] [E: packages/coding-agent/src/modes/interactive/components/model-selector.ts:237] [I]。

交互式 autocomplete 也使用 `getModelSearchText()` 过滤当前 session scope 或 available models, 并把候选 label 展示为 `provider/id`; 这条路径是输入框补全, 不是模型解析本身 [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:559] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:565] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:569] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:264] [I]。

## 设计动机与权衡

Colon parsing 的核心权衡是“完整 model id 优先, thinking suffix 其次”: 这样 `qwen/qwen3-coder:exacto` 与 `openai/gpt-4o:extended` 这类 provider-hosted model id 不会被误切成 invalid thinking, 同时 `sonnet:high` 仍能作为 thinking shorthand; 测试覆盖两类行为 [E: packages/coding-agent/src/core/model-resolver.ts:201] [E: packages/coding-agent/test/model-resolver.test.ts:138] [E: packages/coding-agent/test/model-resolver.test.ts:139] [E: packages/coding-agent/test/model-resolver.test.ts:153] [E: packages/coding-agent/test/model-resolver.test.ts:155] [E: packages/coding-agent/test/model-resolver.test.ts:168] [E: packages/coding-agent/test/model-resolver.test.ts:169] [E: packages/coding-agent/test/model-resolver.test.ts:347] [E: packages/coding-agent/test/model-resolver.test.ts:353] [I]。

Scope resolution 只使用 available models, CLI resolution 使用 all models: 前者服务于当前可 cycling 的运行时模型集合, 后者服务于启动时可配合 `--api-key` 指向尚未持久化 auth 的模型 [E: packages/coding-agent/src/core/model-resolver.ts:276] [E: packages/coding-agent/src/core/model-resolver.ts:399] [I]。

`findInitialModel()` 的 docblock 仍写有“Restored from session”优先级 [I: packages/coding-agent/src/core/model-resolver.ts:520], 但当前函数参数没有 saved session model, 实际 restore helper 是 `restoreModelFromSession()` 且 SDK 里也在调用 `findInitialModel()` 之前单独检查 existing session model; 因此应把 session restore 视为相邻流程而非 `findInitialModel()` 内部步骤 [E: packages/coding-agent/src/core/model-resolver.ts:572] [E: packages/coding-agent/src/core/model-resolver.ts:657] [E: packages/coding-agent/src/core/sdk.ts:196] [E: packages/coding-agent/src/core/sdk.ts:208] [I]。

## Gotcha

- `findInitialModel()` 的 CLI branch 只有 `cliProvider && cliModel` 同时存在才触发; app startup 的无 provider `--model provider/id` 解析由 `main.ts` 里的 `buildSessionOptions()` 直接调用 `resolveCliModel()` 完成 [E: packages/coding-agent/src/core/model-resolver.ts:597] [E: packages/coding-agent/src/main.ts:375] [E: packages/coding-agent/src/main.ts:376]。
- Scope glob pattern 的 invalid `:suffix` 不会 warning 成 invalid thinking level, 而是整个 suffix 留在 globPattern 里参与匹配; non-glob invalid suffix 才由 `parseModelPattern()` 产生 warning [E: packages/coding-agent/src/core/model-resolver.ts:289] [E: packages/coding-agent/src/core/model-resolver.ts:291] [E: packages/coding-agent/src/core/model-resolver.ts:293] [E: packages/coding-agent/src/core/model-resolver.ts:330] [E: packages/coding-agent/src/core/model-resolver.ts:332] [I]。
- `parseModelPattern("")` 会进入 partial matching, 因为空字符串包含于所有 model id; 现有测试命名覆盖“empty pattern matches via partial matching”, 但断言只排除 `null`, 不能证明不会返回 `undefined`, 因此调用方不应把空 pattern 自动理解为 no-op [E: packages/coding-agent/src/core/model-resolver.ts:134] [E: packages/coding-agent/src/core/model-resolver.ts:136] [E: packages/coding-agent/src/core/model-resolver.ts:145] [E: packages/coding-agent/src/core/model-resolver.ts:150] [E: packages/coding-agent/test/model-resolver.test.ts:194] [E: packages/coding-agent/test/model-resolver.test.ts:197] [I]。
- `defaultModelPerProvider` 是 hard-coded map, 测试只抽查若干 provider 当前默认值, 不是从 `models.generated.ts` 动态选择最新模型 [E: packages/coding-agent/src/core/model-resolver.ts:14] [E: packages/coding-agent/test/model-resolver.test.ts:640] [E: packages/coding-agent/test/model-resolver.test.ts:653] [I]。

## 跨包边界

[subsys.coding-agent.model-registry](model-registry.md) 覆盖 canonical `ModelRuntime`：它聚合 built-in/custom models，暴露 `getModels()`、`getAvailable()`、`getModel()` 与 `hasConfiguredAuth()`；model resolver 只消费这些查询结果做 selection，不负责 provider registry ground truth 或 request auth materialization [E: packages/coding-agent/src/core/model-runtime.ts:301] [E: packages/coding-agent/src/core/model-runtime.ts:305] [E: packages/coding-agent/src/core/model-runtime.ts:313] [E: packages/coding-agent/src/core/model-runtime.ts:370] [I]。

`@earendil-works/pi-ai` 提供 `Model<Api>`、`KnownProvider` 与 `modelsAreEqual()` 类型/工具; resolver 依赖这些类型比较和 provider key 集合, 但 provider 集 ground truth 仍属于 `packages/ai/src/providers/all.ts` 及 generated model catalog, 不是本 coding-agent 节点 [E: packages/coding-agent/src/core/model-resolver.ts:6] [I]。

`@earendil-works/pi-agent-core` 提供 `ThinkingLevel`; resolver 只解析/传递 thinking level, 具体 provider 请求如何把 thinking effort 映射到 wire protocol 属于 agent/ai 层后续执行逻辑 [E: packages/coding-agent/src/core/model-resolver.ts:5] [I]。

## Sources

- packages/coding-agent/src/core/model-resolver.ts
- packages/coding-agent/src/modes/interactive/model-search.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/core/model-runtime.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/modes/interactive/components/scoped-models-selector.ts
- packages/coding-agent/src/modes/interactive/components/model-selector.ts
- packages/coding-agent/test/model-resolver.test.ts

## 相关

- [subsys.coding-agent.model-registry](model-registry.md): `ModelRuntime` 的模型清单、custom models、auth configured 检查和请求鉴权；resolver 的可选模型集合来自这里。
