---
id: subsys.coding-agent.telemetry
title: 遥测与实验性开关
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/telemetry.ts
  - packages/coding-agent/src/core/experimental.ts
  - packages/coding-agent/src/core/timings.ts
  - packages/coding-agent/src/core/provider-attribution.ts
symbols:
  - isInstallTelemetryEnabled
  - areExperimentalFeaturesEnabled
  - printTimings
related:
  - ref.coding-agent.env-vars
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.coding-agent.telemetry` 描述 `pi-coding-agent` 里三类轻量开关: install telemetry / provider attribution headers、experimental feature gates、startup timing instrumentation。

## 能回答的问题

- `PI_TELEMETRY` 和 `enableInstallTelemetry` 谁优先,哪些字符串算开启?
- provider attribution headers 会给哪些 provider 或 gateway 注入什么 header?
- `x-opencode-session` 与普通 install telemetry 开关是什么关系?
- `PI_EXPERIMENTAL=1` 当前 gate 了哪些 coding-agent UI 行为?
- `PI_TIMING=1` 如何收集并打印 startup timing?
- 这个节点和环境变量目录 `ref.coding-agent.env-vars` 的边界在哪里?

## 职责边界

这个子系统不是通用 analytics pipeline; source 中没有事件队列、采样器或持久化 telemetry sink,只有 env/settings gate、若干 provider request attribution headers、startup timing stderr 输出和 experimental UI feature gate。[E: packages/coding-agent/src/core/telemetry.ts:8][E: packages/coding-agent/src/core/provider-attribution.ts:91][E: packages/coding-agent/src/core/timings.ts:45][E: packages/coding-agent/src/core/experimental.ts:1][I]

`isInstallTelemetryEnabled(settingsManager, telemetryEnv)` 是 install telemetry 与默认 provider attribution headers 的共享布尔门:interactive install telemetry 上报和默认 provider attribution headers 都调用它。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:942][E: packages/coding-agent/src/core/provider-attribution.ts:45] 显式 `PI_TELEMETRY` 存在时使用 env 解析结果,否则回落到 `settingsManager.getEnableInstallTelemetry()`。[E: packages/coding-agent/src/core/telemetry.ts:8][E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/telemetry.ts:12] 配置默认值是 `true`,并通过 `SettingsManager.getEnableInstallTelemetry()` 读取 `settings.enableInstallTelemetry ?? true`。[E: packages/coding-agent/src/core/settings-manager.ts:100][E: packages/coding-agent/src/core/settings-manager.ts:924][E: packages/coding-agent/src/core/settings-manager.ts:925]

`areExperimentalFeaturesEnabled()` 是单一 env gate:只有 `process.env.PI_EXPERIMENTAL === "1"` 时返回 true。[E: packages/coding-agent/src/core/experimental.ts:1][E: packages/coding-agent/src/core/experimental.ts:2] `printTimings()` 属于 startup profiling:模块加载时把 `PI_TIMING === "1"` 固定成 `ENABLED`,未开启时 `resetTimings()`、`time()`、`printTimings()` 都直接返回。[E: packages/coding-agent/src/core/timings.ts:6][E: packages/coding-agent/src/core/timings.ts:16][E: packages/coding-agent/src/core/timings.ts:17][E: packages/coding-agent/src/core/timings.ts:21][E: packages/coding-agent/src/core/timings.ts:22][E: packages/coding-agent/src/core/timings.ts:45][E: packages/coding-agent/src/core/timings.ts:46]

## 关键文件

- `packages/coding-agent/src/core/telemetry.ts`:定义 `isTruthyEnvFlag()` 和 `isInstallTelemetryEnabled()`;truthy env 值仅接受 `"1"`、`"true"`、`"yes"`,其中文字值大小写不敏感。[E: packages/coding-agent/src/core/telemetry.ts:3][E: packages/coding-agent/src/core/telemetry.ts:4][E: packages/coding-agent/src/core/telemetry.ts:5][E: packages/coding-agent/src/core/telemetry.ts:8]
- `packages/coding-agent/src/core/experimental.ts`:定义 `areExperimentalFeaturesEnabled()`;它不读取 settings,只读 `PI_EXPERIMENTAL`。[E: packages/coding-agent/src/core/experimental.ts:1][E: packages/coding-agent/src/core/experimental.ts:2]
- `packages/coding-agent/src/core/timings.ts`:维护按 namespace 分组的 timing map,支持 `"main"` 与 `"extensions"` 两个 `TimingLabel`。[E: packages/coding-agent/src/core/timings.ts:7][E: packages/coding-agent/src/core/timings.ts:12][E: packages/coding-agent/src/core/timings.ts:14]
- `packages/coding-agent/src/core/provider-attribution.ts`:根据 model provider/baseUrl 注入默认 attribution headers,并把 session headers、默认 headers、调用者传入的 header sources 合并成最终 `ProviderHeaders`。[E: packages/coding-agent/src/core/provider-attribution.ts:20][E: packages/coding-agent/src/core/provider-attribution.ts:24][E: packages/coding-agent/src/core/provider-attribution.ts:28][E: packages/coding-agent/src/core/provider-attribution.ts:37][E: packages/coding-agent/src/core/provider-attribution.ts:91][E: packages/coding-agent/src/core/provider-attribution.ts:97][E: packages/coding-agent/src/core/provider-attribution.ts:102][E: packages/coding-agent/src/core/provider-attribution.ts:108]

## 数据模型与开关

`PI_TELEMETRY` 是 override,不是单纯 enable flag:只要 env 参数不是 `undefined`,`isInstallTelemetryEnabled()` 就忽略 settings 并调用 `isTruthyEnvFlag()`。[E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/telemetry.ts:12] 因为 `isTruthyEnvFlag()` 对 `"0"`、`"false"`、`"no"` 没有 truthy 分支,这些值会返回 false;未知非空字符串也返回 false。[E: packages/coding-agent/src/core/telemetry.ts:3][E: packages/coding-agent/src/core/telemetry.ts:5][I] 用户文档把 `PI_TELEMETRY` 描述为 install/update telemetry 和 provider attribution headers 的 override,并明确它不关闭 update checks。[E: packages/coding-agent/docs/usage.md:298]

`enableInstallTelemetry` 配置项只控制匿名 install/update version ping,默认 `true`;文档说明 opting out 不会关闭 version update checks。[E: packages/coding-agent/docs/settings.md:58][E: packages/coding-agent/docs/settings.md:75][E: packages/coding-agent/docs/settings.md:77] `PI_OFFLINE` 是更宽的 startup network gate:interactive install telemetry 上报函数在发现 `process.env.PI_OFFLINE` 时直接返回。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:937][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:938][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:939]

`PI_EXPERIMENTAL` 当前至少 gate 两个 UI 表面:first-time setup 必须通过 official distribution、`PI_EXPERIMENTAL=1`、未覆盖 agent dir、settings 不存在等条件才会运行;interactive footer 在 experimental 开启时追加 `"xp"` 标记。[E: packages/coding-agent/src/cli/startup-ui.ts:115][E: packages/coding-agent/src/cli/startup-ui.ts:117][E: packages/coding-agent/src/cli/startup-ui.ts:125][E: packages/coding-agent/src/cli/startup-ui.ts:128][E: packages/coding-agent/src/cli/startup-ui.ts:131][E: packages/coding-agent/src/modes/interactive/components/footer.ts:163][E: packages/coding-agent/src/modes/interactive/components/footer.ts:164]

`PI_TIMING` 在 `timings.ts` 模块初始化时读取一次;如果运行中再修改 env,已经计算出的 `ENABLED` 不会自动变化。[E: packages/coding-agent/src/core/timings.ts:6][I] timing entry 的 shape 是 `{ label: string; ms: number }`,每次 `time(label, namespace)` 记录当前时间与 namespace `lastTime` 的差值并更新 `lastTime`。[E: packages/coding-agent/src/core/timings.ts:7][E: packages/coding-agent/src/core/timings.ts:8][E: packages/coding-agent/src/core/timings.ts:9][E: packages/coding-agent/src/core/timings.ts:23][E: packages/coding-agent/src/core/timings.ts:30][E: packages/coding-agent/src/core/timings.ts:31]

## 控制流

1. `isInstallTelemetryEnabled@telemetry.ts` 接收 `SettingsManager` 和可注入的 `telemetryEnv`;默认 env 参数来自 `process.env.PI_TELEMETRY`。[E: packages/coding-agent/src/core/telemetry.ts:8][E: packages/coding-agent/src/core/telemetry.ts:10]
2. `reportInstallTelemetry@interactive-mode.ts` 先检查 `PI_OFFLINE`,再调用 `isInstallTelemetryEnabled()`;通过后才 fire-and-forget 请求 `https://pi.dev/api/report-install?version=...`,带 `User-Agent` 且 5 秒 timeout,失败被吞掉。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:937][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:938][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:942][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:946][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:948][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:950][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:953]
3. `mergeProviderAttributionHeaders@provider-attribution.ts` 先合并 opencode session headers 和默认 attribution headers,再按传入顺序 `Object.assign()` 覆盖/追加 caller headers;空对象会被折叠成 `undefined`。[E: packages/coding-agent/src/core/provider-attribution.ts:91][E: packages/coding-agent/src/core/provider-attribution.ts:97][E: packages/coding-agent/src/core/provider-attribution.ts:98][E: packages/coding-agent/src/core/provider-attribution.ts:99][E: packages/coding-agent/src/core/provider-attribution.ts:102][E: packages/coding-agent/src/core/provider-attribution.ts:104][E: packages/coding-agent/src/core/provider-attribution.ts:108]
4. `createSdkRuntime@core/sdk.ts` 在 `streamSimple()` request options 中调用 `mergeProviderAttributionHeaders(model, settingsManager, options?.sessionId, auth.headers, options?.headers)`,所以 auth headers 和 explicit request headers 可以覆盖默认 attribution headers。[E: packages/coding-agent/src/core/sdk.ts:315][E: packages/coding-agent/src/core/sdk.ts:323][E: packages/coding-agent/src/core/sdk.ts:324][E: packages/coding-agent/src/core/sdk.ts:325][E: packages/coding-agent/src/core/sdk.ts:326][E: packages/coding-agent/src/core/sdk.ts:327][E: packages/coding-agent/src/core/sdk.ts:328]
5. `main@main.ts` 在入口调用 `resetTimings()`,若启用 timing 则后续用 `time()` 标记 parse args、runtime 创建、stdin、initial message、theme、model scope、session 创建等阶段,并在进入 rpc/interactive/print mode 前调用 `printTimings()`。[E: packages/coding-agent/src/main.ts:468][E: packages/coding-agent/src/main.ts:469][E: packages/coding-agent/src/main.ts:513][E: packages/coding-agent/src/main.ts:735][E: packages/coding-agent/src/main.ts:741][E: packages/coding-agent/src/main.ts:769][E: packages/coding-agent/src/main.ts:776][E: packages/coding-agent/src/main.ts:778][E: packages/coding-agent/src/main.ts:785][E: packages/coding-agent/src/main.ts:793][E: packages/coding-agent/src/main.ts:806][E: packages/coding-agent/src/main.ts:807][E: packages/coding-agent/src/main.ts:837][E: packages/coding-agent/src/main.ts:840]
6. Extension timing 使用 `"extensions"` namespace:resource reload 重置该 namespace,extension loader 在模块 import 和 factory 执行后记录 label。[E: packages/coding-agent/src/core/resource-loader.ts:341][E: packages/coding-agent/src/core/resource-loader.ts:342][E: packages/coding-agent/src/core/extensions/loader.ts:434][E: packages/coding-agent/src/core/extensions/loader.ts:435][E: packages/coding-agent/src/core/extensions/loader.ts:442][E: packages/coding-agent/src/core/extensions/loader.ts:443][E: packages/coding-agent/src/core/extensions/loader.ts:465][E: packages/coding-agent/src/core/extensions/loader.ts:466]

## Provider Attribution Headers

默认 provider attribution 只有在 `isInstallTelemetryEnabled(settingsManager)` 为 true 时才会注入;关闭时 `getDefaultAttributionHeaders()` 返回 `undefined`。[E: packages/coding-agent/src/core/provider-attribution.ts:41][E: packages/coding-agent/src/core/provider-attribution.ts:45][E: packages/coding-agent/src/core/provider-attribution.ts:46]

| provider / gateway 匹配 | 默认 headers | 证据 |
|---|---|---|
| OpenRouter: `model.provider === "openrouter"` 或 `baseUrl` 包含 `openrouter.ai` | `HTTP-Referer: https://pi.dev`, `X-OpenRouter-Title: pi`, `X-OpenRouter-Categories: cli-agent` | [E: packages/coding-agent/src/core/provider-attribution.ts:20][E: packages/coding-agent/src/core/provider-attribution.ts:21][E: packages/coding-agent/src/core/provider-attribution.ts:49][E: packages/coding-agent/src/core/provider-attribution.ts:51][E: packages/coding-agent/src/core/provider-attribution.ts:52][E: packages/coding-agent/src/core/provider-attribution.ts:53] |
| NVIDIA NIM: `provider === "nvidia"` 或 host `integrate.api.nvidia.com` | `X-BILLING-INVOKE-ORIGIN: Pi` | [E: packages/coding-agent/src/core/provider-attribution.ts:24][E: packages/coding-agent/src/core/provider-attribution.ts:25][E: packages/coding-agent/src/core/provider-attribution.ts:57][E: packages/coding-agent/src/core/provider-attribution.ts:59] |
| Cloudflare Workers AI / AI Gateway: provider id 或 host 匹配 Cloudflare API/gateway | `User-Agent: pi-coding-agent` | [E: packages/coding-agent/src/core/provider-attribution.ts:28][E: packages/coding-agent/src/core/provider-attribution.ts:30][E: packages/coding-agent/src/core/provider-attribution.ts:31][E: packages/coding-agent/src/core/provider-attribution.ts:32][E: packages/coding-agent/src/core/provider-attribution.ts:33][E: packages/coding-agent/src/core/provider-attribution.ts:63][E: packages/coding-agent/src/core/provider-attribution.ts:65] |
| Vercel AI Gateway: `provider === "vercel-ai-gateway"` 或 host `ai-gateway.vercel.sh` | `http-referer: https://pi.dev`, `x-title: pi` | [E: packages/coding-agent/src/core/provider-attribution.ts:37][E: packages/coding-agent/src/core/provider-attribution.ts:38][E: packages/coding-agent/src/core/provider-attribution.ts:69][E: packages/coding-agent/src/core/provider-attribution.ts:71][E: packages/coding-agent/src/core/provider-attribution.ts:72] |

Opencode session headers 独立于 install telemetry gate:只要传入 `sessionId` 且 model provider/baseUrl 属于 `opencode`、`opencode-go` 或 `opencode.ai`,`getSessionHeaders()` 返回 `x-opencode-session` 与 `x-opencode-client: pi`。[E: packages/coding-agent/src/core/provider-attribution.ts:79][E: packages/coding-agent/src/core/provider-attribution.ts:80][E: packages/coding-agent/src/core/provider-attribution.ts:81][E: packages/coding-agent/src/core/provider-attribution.ts:82][E: packages/coding-agent/src/core/provider-attribution.ts:83][E: packages/coding-agent/src/core/provider-attribution.ts:84][E: packages/coding-agent/src/core/provider-attribution.ts:88] 因为 `mergeProviderAttributionHeaders()` 无条件展开 `getSessionHeaders()` 再展开默认 attribution headers,关闭 install telemetry 只会移除默认 attribution headers,不会移除 opencode session headers。[E: packages/coding-agent/src/core/provider-attribution.ts:97][E: packages/coding-agent/src/core/provider-attribution.ts:98][E: packages/coding-agent/src/core/provider-attribution.ts:99][I]

## 设计动机与权衡

telemetry gate 的设计把 env override 放在 settings 之前,适合 CI、packaged binary、临时调试等不想改配置文件的场景。[E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/telemetry.ts:12][I] `PI_TELEMETRY` 文档把 `1`/`true`/`yes` 和 `0`/`false`/`no` 都列为 override,但实现实际上采用 allowlist truthy parser,因此其他非空字符串会等价于 false。[E: packages/coding-agent/docs/usage.md:298][E: packages/coding-agent/src/core/telemetry.ts:5][I]

provider attribution header 合并顺序让默认归因成为低优先级 baseline,后续 `auth.headers` 与 `options.headers` 可以覆盖它;这降低了 provider auth resolution 或 extension/request hooks 需要知道默认 attribution 细节的耦合。[E: packages/coding-agent/src/core/provider-attribution.ts:97][E: packages/coding-agent/src/core/provider-attribution.ts:102][E: packages/coding-agent/src/core/provider-attribution.ts:104][E: packages/coding-agent/src/core/sdk.ts:323][E: packages/coding-agent/src/core/sdk.ts:327][E: packages/coding-agent/src/core/sdk.ts:328][I]

startup timing 使用 stderr 而不是 session/event stream:打印函数用 `console.error()` 输出标题、每条 label ms 和 TOTAL,并过滤掉负数 timing。[E: packages/coding-agent/src/core/timings.ts:34][E: packages/coding-agent/src/core/timings.ts:35][E: packages/coding-agent/src/core/timings.ts:37][E: packages/coding-agent/src/core/timings.ts:39][E: packages/coding-agent/src/core/timings.ts:41] 这使它更像本地 profiling aid,而不是用户可见产品 telemetry。[I]

## Gotcha

- `PI_TIMING` 是 module-level constant;要可靠启用 timing,应在加载 `timings.ts` 之前设置 env,通常就是启动 `pi` 进程前设置。[E: packages/coding-agent/src/core/timings.ts:6][I]
- `PI_TELEMETRY=0` 不会关闭 update check;文档明确 update check 需要用 `PI_SKIP_VERSION_CHECK=1` 或更宽的 `PI_OFFLINE=1`/`--offline` 控制。[E: packages/coding-agent/docs/usage.md:296][E: packages/coding-agent/docs/usage.md:297][E: packages/coding-agent/docs/usage.md:298][E: packages/coding-agent/docs/settings.md:77][E: packages/coding-agent/docs/settings.md:79]
- `getDefaultAttributionHeaders()` 使用 `model.baseUrl.includes("openrouter.ai")` 判断 OpenRouter,而其他 host 判断走 `new URL(baseUrl).hostname === expectedHost`;OpenRouter 因此不是严格 hostname equality。[E: packages/coding-agent/src/core/provider-attribution.ts:12][E: packages/coding-agent/src/core/provider-attribution.ts:14][E: packages/coding-agent/src/core/provider-attribution.ts:20][E: packages/coding-agent/src/core/provider-attribution.ts:21][I]
- unknown provider 或未命中 gateway 的 model 不会得到默认 attribution headers;`getDefaultAttributionHeaders()` 末尾返回 `undefined`。[E: packages/coding-agent/src/core/provider-attribution.ts:76]

## 跨包关系

`pi-coding-agent` 在 `core/sdk.ts` 装配 provider request headers,实际 request streaming 由 `pi-ai` 的 `streamSimple()` 执行;因此本节点只解释 coding-agent 侧 header attribution policy,不解释 ai package 的 provider wire protocol。[E: packages/coding-agent/src/core/sdk.ts:315][E: packages/coding-agent/src/core/sdk.ts:323][I]

[ref.coding-agent.env-vars](../../reference/env-vars.md) 是环境变量 catalog,应逐项列出 `PI_TELEMETRY`、`PI_EXPERIMENTAL`、`PI_TIMING`、`PI_OFFLINE`、`PI_SKIP_VERSION_CHECK` 等变量;本节点是这些变量在 telemetry / experimental / timing 子系统内的行为说明。[E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/experimental.ts:2][E: packages/coding-agent/src/core/timings.ts:6][E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:938][E: packages/coding-agent/docs/usage.md:297][I]

## Sources

- packages/coding-agent/src/core/telemetry.ts
- packages/coding-agent/src/core/experimental.ts
- packages/coding-agent/src/core/timings.ts
- packages/coding-agent/src/core/provider-attribution.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/resource-loader.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/cli/startup-ui.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/modes/interactive/components/footer.ts
- packages/coding-agent/docs/settings.md
- packages/coding-agent/docs/usage.md

## 相关

- [ref.coding-agent.env-vars](../../reference/env-vars.md): environment variable catalog for `PI_*` runtime/config flags and provider credential variables.
