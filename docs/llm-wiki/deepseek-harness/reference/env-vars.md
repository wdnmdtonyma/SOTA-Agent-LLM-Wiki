---
id: ref.env-vars
title: 环境变量目录
kind: catalog
tier: T3
pkg: cross
source:
  - packages/util/home-paths/src/index.ts
  - packages/llm/llm-deepseek/src/adapter.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/web/web-search-deepseek/src/provider.ts
  - AGENTS.md
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/session/session-telemetry-otel/src/index.ts
  - packages/boot/app-boot/src/index.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/profile-boot.ts
  - packages/e2b/e2b/src/index.ts
  - packages/web/web/src/index.ts
  - packages/web/web-search-exa/src/index.ts
  - packages/web/web-search-perplexity/src/index.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/host/directory-picker-auto/src/index.ts
  - packages/host/directory-picker-auto/src/resolve.ts
  - packages/host/directory-picker-native/src/win32-dialog-worker.ts
  - packages/host/apiproxy/src/native-path-opener.ts
  - packages/shell/pwsh-local/src/resolve.ts
  - packages/util/launch-environment/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - vendor/loader/src/index.ts
  - packages/client/runtime/src/client/contract/store.ts
  - packages/workflow/workflow-worker-thread/src/host.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - packages/identity/anonymous-user-id/src/index.ts
  - packages/examples/jsonrpc-demo/src/runner.ts
  - packages/sdk/client/src/client.ts
  - packages/llm/llm-deepseek/tests/adapter.spec.ts
  - packages/web/web-search-deepseek/tests/deepseek.spec.ts
  - packages/util/home-paths/tests/home-paths.spec.ts
symbols:
  - DSH_HOME
  - DEEPSEEK_API_KEY
  - DEEPSEEK_BASE_URL
  - DEEPSEEK_SEARCH_BASE_URL
related:
  - subsys.util.home-paths
  - surface.misc.home
  - subsys.llm.deepseek
  - subsys.integration.web-search
  - subsys.composition.app-boot
  - subsys.persistence.credentials
  - subsys.persistence.telemetry
evidence: explicit
status: verified
updated: 47f943859b
---

> 本页枚举 DSH **进程级**环境变量：产品运行时每个被读取的名字一行，测试 / CI / fixture 另表。这是 Cordis 组合运行时（`profile → bundle → agent preset`）的 host 面输入，不是 agent-preset 的 tools / persona / isolate 配置。默认安装路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI 包。

## 能回答的问题

- `$DSH_HOME` 空或不设时产品主目录是什么？能不能写进项目 `.env`？
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_SEARCH_BASE_URL` 各喂哪条 seam？search 会不会回退到 chat 的 BASE_URL？
- `dsh` 启动怎样分层冻结环境？哪些名字只允许 launching process 提供？
- `DSH_TELEMETRY_*`、`DSH_PERMISSION_MODE`、`DSH_TOOLS_MODE` 是谁在 yml 里插值的？
- Exa / Perplexity / E2B 各读哪把钥匙？`llm-pi-ai` 有没有写死的 env 名？
- `DSH_TEST_*` / `MOCK_*` / `LSP_FAKE_*` / `DSH_SNAPSHOT*` 是不是产品合同？

## 范围与 ground truth

Ground truth 是 `packages/**/src`、`apps/**/src`、`vendor/**/src` 以及 shipped 组合里对 `process.env` / `launchEnvironmentOf(ctx).get` 的读取。官方 md / README / `AGENTS.md` 只当查漏，不当 `[E]`。

`apps/cli/src/bin.ts` 自己不点名读 env；它调用 `loadLayeredEnv('dsh')`，把 inherited `process.env` 与发现到的 `.env` 冻成 `LaunchEnvironmentSnapshot`。 [E: apps/cli/src/bin.ts:33] [E: packages/boot/app-boot/src/index.ts:182]

分层：inherited process 层最可信，再叠 invoking-directory `.env`，再叠 `$DSH_HOME/.env`；文件层不能覆盖已继承的名字。 [E: packages/boot/app-boot/src/index.ts:190] `DEEPSEEK_BASE_URL` 与 `DEEPSEEK_SEARCH_BASE_URL` 都在 bootstrap-only 名单里，项目 / home `.env` 写它们会抛错。 [E: packages/boot/app-boot/src/index.ts:109] 前缀 `DSH_` 同样 bootstrap-only，所以 `$DSH_HOME` 只能从 launching process 进来，不能靠 `.env` 改。 [E: packages/boot/app-boot/src/index.ts:117]

`@deepseek-ai/dsh-session-telemetry-otel` 的 `src` 不读 `process.env`：`mode` / `exporter.url` 由 `dsh-base` 的 `!!js` 插值写进 Config。 [E: packages/bundle/base/cordis.patch.yml:151] [E: packages/bundle/base/cordis.patch.yml:154]

`@deepseek-ai/dsh-llm-pi-ai` 的 `src` 没有写死的 env 名：`resolveApiKey` 读的是 profile 上的 `apiKeyEnv` credential-ref。 [E: packages/llm/llm-pi-ai/src/index.ts:190]

`packages/sandbox/**/src` 不读 landlock 专用 env。子进程默认环境走 `scrubbedParentEnv()`：剥掉形似凭据的名字和所有 ambient `DSH_*`，不是再读一张名单。 [E: packages/subprocess/subprocess/src/index.ts:62]

T1 [`surface.misc.home`](../surface/misc/home.md) 写产品路径文案；T2 [`subsys.util.home-paths`](../subsystems/util/home-paths.md) / [`subsys.llm.deepseek`](../subsystems/llm/deepseek.md) / [`subsys.integration.web-search`](../subsystems/integration/web-search.md) 写控制流。本页只做名字目录与 BASE_URL 分家。

## 实例表 · 产品运行时

列：名 · 类型/签名 · 默认 · 含义 · 为什么 · 源 path。分组不删实例。

### 路径与主目录

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `DSH_HOME` | `string`；`resolveDshHome(configured?, env = process.env)` | 非空且 `trim()` 后仍有字符才用，否则 `join(homedir(), '.dsh')` | 唯一产品主目录覆盖。空白或只含空白当未设置。 [E: packages/util/home-paths/src/index.ts:88] [E: packages/util/home-paths/src/index.ts:89] | 所有用户数据共用一根；空白值不能把根解析成 cwd。`DSH_` 前缀使它进不了 `.env`。 | `packages/util/home-paths/src/index.ts` |
| `DSH_AGENTS_HOME` | `string` | `join(homedir(), '.agents')` | `skill-filesystem` 的 Claude 兼容 skills 根。 [E: packages/skill/skill-filesystem/src/index.ts:164] | 与 `$DSH_HOME` 并列，不是第二套产品主目录。 | `packages/skill/skill-filesystem/src/index.ts` |
| `DSH_BUNDLED_SKILL_DIR` | `string` | 未设则没有 bundled 根 | 仅 `includeDefaultRoots` 为真时当作默认 bundled skills 目录。 [E: packages/skill/skill-filesystem/src/index.ts:172] | 隔离 provider 不得偷偷再扫 app 自带 skills。 | `packages/skill/skill-filesystem/src/index.ts` |
| `DSH_CWD` | `string`；minimal preset `!!js` | `process.cwd()` | `fs-local` 的 `cwd`。只出现在 shipped `minimal` 的 `agent.cordis.yml`。 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:57] | 给测试 / 嵌入钉死工作目录；`standard` / `code` / `cordis` 没有这一行。 | `apps/cli/config/agent-presets/minimal/agent.cordis.yml` |

### DeepSeek LLM（`ctx.llm` · `deepseek-official`）

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `DEEPSEEK_API_KEY` | credential-ref；`Config.apiKeyEnv` 默认 | 无字面 key；缺 key 是请求期 `MISSING_CREDENTIAL`，不是 load 失败 | `llm-deepseek` 默认名 `DEFAULT_API_KEY_ENV = 'DEEPSEEK_API_KEY'`，`web-search-deepseek` 同样声明该默认名。`resolveAdapterOptions` 把 `config.apiKeyEnv ?? DEFAULT_API_KEY_ENV` 收成 credential-ref。请求期：有 `ctx.credentials` 走 `credentials.resolve(ref)`；否则 `launchEnvironmentOf(ctx).get(ref)`。 [E: packages/llm/llm-deepseek/src/index.ts:45] [E: packages/web/web-search-deepseek/src/index.ts:43] [E: packages/llm/llm-deepseek/src/index.ts:184] [E: packages/llm/llm-deepseek/src/index.ts:231] [E: packages/llm/llm-deepseek/src/index.ts:236] | 配置只带引用，不带密钥。search 复用这把钥匙，不复用 chat 的 BASE_URL。 | `packages/llm/llm-deepseek/src/index.ts` |
| `DEEPSEEK_BASE_URL` | `string`；`environment.get('DEEPSEEK_BASE_URL')` | `https://api.deepseek.com`（`PUBLIC_BASE_URL`） | **只**给 chat-completions adapter。链：`config.baseURL` ?? 启动环境该名 ?? 公共 API。 [E: packages/llm/llm-deepseek/src/index.ts:107] [E: packages/llm/llm-deepseek/src/index.ts:186] | 内部 / 代理网关改 chat 端点。bootstrap-only：不能写进 `.env`。 | `packages/llm/llm-deepseek/src/index.ts` |

单测钉死：省略 `baseURL` 时 LLM 走 `DEEPSEEK_BASE_URL`。 [E: packages/llm/llm-deepseek/tests/adapter.spec.ts:966]

### DeepSeek search 与其它 web provider

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `DEEPSEEK_SEARCH_BASE_URL` | `string`；`launchEnvironmentOf(ctx).get('DEEPSEEK_SEARCH_BASE_URL')` | `https://api.deepseek.com/anthropic/v1` | **只**给 search provider。链：`config.baseURL` ?? 该名 ?? `DEEPSEEK_DEFAULT_BASE_URL`。链上没有 `DEEPSEEK_BASE_URL`。 [E: packages/web/web-search-deepseek/src/index.ts:82] [E: packages/web/web-search-deepseek/src/index.ts:111] | Anthropic Messages + `web_search_20250305`，与 chat-completions 不是同一个 base。 | `packages/web/web-search-deepseek/src/index.ts` |
| `DSH_WEB_SEARCH_PROVIDER` | `string` | 无；shipped yml 已写 `searchProvider: deepseek-official` | 填 `WebRuntime.searchProviderId`，仅当 Config 省略该字段。 [E: packages/web/web/src/index.ts:92] | overlay 第二家 search 时的进程级钉死；赢不了 `dsh-base` 已写的 pin。 | `packages/web/web/src/index.ts` |
| `DSH_WEB_FETCH_PROVIDER` | `string` | 无 | 对称地填 `fetchProviderId`。 [E: packages/web/web/src/index.ts:93] | fetch 半边独立选路。 | `packages/web/web/src/index.ts` |
| `EXA_API_KEY` | `string` | `''`（空则 Exa unavailable） | `web-search-exa`：`config.apiKey` ?? `launchEnvironmentOf(ctx).get('EXA_API_KEY')`。 [E: packages/web/web-search-exa/src/index.ts:64] | 仓库有、**不进** shipped `dsh-base`。 | `packages/web/web-search-exa/src/index.ts` |
| `PERPLEXITY_API_KEY` | `string` | `''` | `web-search-perplexity` 同样只读这一把钥匙，不读 `DEEPSEEK_*`。 [E: packages/web/web-search-perplexity/src/index.ts:58] | 仓库有、**不进** shipped `dsh-base`。 | `packages/web/web-search-perplexity/src/index.ts` |

### 遥测 · 权限 · tools mode

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `DSH_TELEMETRY_DISABLED` | `string`；launcher 读 | 未设或空串 = 不打补丁 | 非空（含 `'0'` / `'false'`）且树上有 `session-telemetry-otel` 行时，打 `{ id, disabled: true }`。 [E: apps/cli/src/profile-boot.ts:168] [E: apps/cli/src/profile-boot.ts:81] | 隐私开关偏 off-by-mistake。这是 launcher 补丁，不是 otel 包读 env。 | `apps/cli/src/profile-boot.ts` |
| `DSH_TELEMETRY_MODE` | `FULL` / `FEEDBACK_ONLY` / `DISABLED`；yml `!!js` | `'DISABLED'` | 写进 otel Config.`mode`。 [E: packages/bundle/base/cordis.patch.yml:151] | host 面默认不上报。 | `packages/bundle/base/cordis.patch.yml` |
| `DSH_TELEMETRY_OTLP_URL` | URL 字符串；yml `!!js` | `https://harness-telemetry.deepseeksvc.com/v1/logs` | 写进 `exporter.url`。`DISABLED` 时 otel 构造函数不读 url。 [E: packages/bundle/base/cordis.patch.yml:154] | 换 collector 不必改包。 | `packages/bundle/base/cordis.patch.yml` |
| `DSH_PERMISSION_MODE` | sandbox mode 字符串；yml `!!js` | `'workspace-write'` | `sandbox-policy.mode`；`'danger-full-access'` 时 approval `policy` 变成 `'never'`。 [E: packages/bundle/base/cordis.patch.yml:175] [E: packages/bundle/base/cordis.patch.yml:191] | 部署级沙箱档位，不是 preset 成员资格。 | `packages/bundle/base/cordis.patch.yml` |
| `DSH_TOOLS_MODE` | `native` / `code` / `both`；yml `!!js` | 未设则交给 `tools` schema 默认（native） | `dsh-web-app` 与 `dsh-headless` 的 `id: tools` Config.`mode`。 [E: packages/bundle/web-app/cordis.patch.yml:41] [E: packages/bundle/headless/cordis.patch.yml:20] | 进程级 Code Mode 临时候选；不是 per-session 选择。 | `packages/bundle/web-app/cordis.patch.yml` |

### Host / 平台 / vendor

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `E2B_API_KEY` | `string` | `''` | E2B sandbox owner：`config.apiKey ?? process.env.E2B_API_KEY`。 [E: packages/e2b/e2b/src/index.ts:94] | overlay 远程执行世界；不进 shipped `dsh-base`。 | `packages/e2b/e2b/src/index.ts` |
| `DSH_DIALOG_TITLE` | `string` | `''` | Win32 目录选择 worker 的窗口标题。 [E: packages/host/directory-picker-native/src/win32-dialog-worker.ts:24] | 父进程用同名键把 title 传进子进程。 | `packages/host/directory-picker-native/src/win32-dialog-worker.ts` |
| `PATH` | `string` | 空则 Linux chooser / pwsh PATH 扫描为空 | directory-picker 探 zenity/kdialog；Windows `pwsh` 还按 `;` 拆 PATH 找 `pwsh.exe`。 [E: packages/host/directory-picker-auto/src/index.ts:67] [E: packages/shell/pwsh-local/src/resolve.ts:29] | 宿主能力探测，不是产品配置键。 | `packages/host/directory-picker-auto/src/index.ts` |
| `SSH_CONNECTION` | `string` | 未设 / 空 = 不视为 SSH | 与 `SSH_TTY` 任一非空则 directory-picker 选 `browse`。 [E: packages/host/directory-picker-auto/src/resolve.ts:49] | SSH 下 native chooser 会弹在无人看的服务器上。 | `packages/host/directory-picker-auto/src/resolve.ts` |
| `SSH_TTY` | `string` | 未设 / 空 | 与 `SSH_CONNECTION` 任一非空则 directory-picker 选 `browse`。 [E: packages/host/directory-picker-auto/src/resolve.ts:49] | SSH 下 native chooser 会弹在无人看的服务器上。 | `packages/host/directory-picker-auto/src/resolve.ts` |
| `DISPLAY` | `string` | 未设 / 空 | Linux 上 directory-picker 要 display 才选 `native`；path opener 用来判断有没有桌面。 [E: packages/host/directory-picker-auto/src/resolve.ts:52] [E: packages/host/apiproxy/src/native-path-opener.ts:171] | 无显示会话就不要弹 OS chooser / `xdg-open`。 | `packages/host/directory-picker-auto/src/resolve.ts` |
| `WAYLAND_DISPLAY` | `string` | 未设 / 空 | 与 `DISPLAY` 并列：任一非空才允许 Linux native chooser / 桌面 opener。 [E: packages/host/directory-picker-auto/src/resolve.ts:52] | Wayland 会话往往没有 `DISPLAY`。 | `packages/host/directory-picker-auto/src/resolve.ts` |
| `BROWSER` | `string` | 未设 / 空则 Linux 不走浏览器分支 | Linux 上用它打开 html/svg 文档。 [E: packages/host/apiproxy/src/native-path-opener.ts:70] | 可移植约定，本包不解析 desktop-entry。 | `packages/host/apiproxy/src/native-path-opener.ts` |
| `WSL_DISTRO_NAME` | `string` | 未设 / 空 | 与 `WSL_INTEROP` 任一非空则按 WSL 处理路径（交给 Windows 桌面）。 [E: packages/host/apiproxy/src/native-path-opener.ts:96] | WSL 没有 Linux GUI 也能开路径。 | `packages/host/apiproxy/src/native-path-opener.ts` |
| `WSL_INTEROP` | `string` | 未设 / 空 | 与 `WSL_DISTRO_NAME` 任一非空则按 WSL 处理路径。 [E: packages/host/apiproxy/src/native-path-opener.ts:96] | WSL 没有 Linux GUI 也能开路径。 | `packages/host/apiproxy/src/native-path-opener.ts` |
| `ProgramFiles` | `string` | `'C:\\Program Files'` | Windows 上 `pwsh` 候选路径的 Program Files 根。 [E: packages/shell/pwsh-local/src/resolve.ts:22] | 纯函数解析，可注入假 env。 | `packages/shell/pwsh-local/src/resolve.ts` |
| `SystemRoot` | `string` | `'C:\\Windows'` | Windows PowerShell 5.1 回落路径。 [E: packages/shell/pwsh-local/src/resolve.ts:23] | 老主机没有 pwsh 7 时仍能 spawn。 | `packages/shell/pwsh-local/src/resolve.ts` |
| `CORDIS_SHARED` | JSON 字符串 | 未设则 `{ startTime: Date.now() }` | vendored Loader 的跨进程共享袋。 [E: vendor/loader/src/index.ts:68] | Cordis 多进程 loader 合同，不是 DSH 产品旋钮。 | `vendor/loader/src/index.ts` |
| `NODE_ENV` | `string` | 非 `'production'` 则 dev-freeze store | 浏览器 store 在 production 跳过 `deepFreeze`。 [E: packages/client/runtime/src/client/contract/store.ts:151] | 打包后的 client 面，不是 CLI 配置。 | `packages/client/runtime/src/client/contract/store.ts` |
| `TSX_TSCONFIG_PATH` | `string` | 未设则 worker 环境不带该键 | 未构建的 workflow worker 把宿主的 tsx pin 转给子线程。 [E: packages/workflow/workflow-worker-thread/src/host.ts:87] | 构建后的 worker 不看宿主 pin。 | `packages/workflow/workflow-worker-thread/src/host.ts` |
| `DSH_CORDIS_CONFIG` | 路径字符串 | 无；空当缺 | `jsonrpc-demo` runner：env 压过 argv，缺则 usage 退出。 [E: packages/examples/jsonrpc-demo/src/runner.ts:25] | 示例 / SDK 演示进程选 composition，不是 `dsh` launcher。 | `packages/examples/jsonrpc-demo/src/runner.ts` |

`packages/sdk/client/src/client.ts` 把整个 `process.env` 当默认 child env 传下去，不点名读某一个产品键。`credentials-local` 按 credential-ref 查 snapshot，默认 DeepSeek 引用仍是 `DEEPSEEK_API_KEY`。

## `DEEPSEEK_SEARCH_BASE_URL` 与 `DEEPSEEK_BASE_URL` 分家

这两条变量是 **两条独立的网络根**，不是别名，也没有回退链。

**LLM chat（`@deepseek-ai/dsh-llm-deepseek`）** 拥有 `BASE_URL_ENV = 'DEEPSEEK_BASE_URL'`。 [E: packages/llm/llm-deepseek/src/index.ts:107] `resolveAdapterOptions` 的 endpoint 是 `config.baseURL ?? environment?.get(BASE_URL_ENV)?.value ?? PUBLIC_BASE_URL`，公共默认 `https://api.deepseek.com`。 [E: packages/llm/llm-deepseek/src/index.ts:185] [E: packages/llm/llm-deepseek/src/index.ts:186] [E: packages/llm/llm-deepseek/src/index.ts:187] [E: packages/llm/llm-deepseek/src/index.ts:104] 请求走 chat-completions（`/chat/completions` 由 adapter 拼接）。

**Search（`@deepseek-ai/dsh-web-search-deepseek`）** 拥有 `SEARCH_BASE_URL_ENV = 'DEEPSEEK_SEARCH_BASE_URL'`。 [E: packages/web/web-search-deepseek/src/index.ts:82] `resolveOptions` 的 endpoint 是 `config.baseURL ?? launchEnvironmentOf(ctx).get(SEARCH_BASE_URL_ENV)?.value ?? DEEPSEEK_DEFAULT_BASE_URL`。 [E: packages/web/web-search-deepseek/src/index.ts:110] [E: packages/web/web-search-deepseek/src/index.ts:111] [E: packages/web/web-search-deepseek/src/index.ts:112] 默认常量是 `https://api.deepseek.com/anthropic/v1`。 [E: packages/web/web-search-deepseek/src/provider.ts:35] 实际请求拼 `${options.baseURL}/messages`。 [E: packages/web/web-search-deepseek/src/provider.ts:204]

Search 的三元链 **没有** `DEEPSEEK_BASE_URL`，也没有 `environment.get('DEEPSEEK_BASE_URL')`。只设 `DEEPSEEK_BASE_URL`、不设 `DEEPSEEK_SEARCH_BASE_URL`、不设 search Config.`baseURL` 时，search 落到 Anthropic 默认基址，不会去 chat 的 `https://api.deepseek.com`。省略 search config 的单测打到 `https://api.deepseek.com/anthropic/v1/messages`。 [E: packages/web/web-search-deepseek/tests/deepseek.spec.ts:473]

两名都在 `loadLayeredEnv` 的 bootstrap-only 集合里，彼此分开列出。 [E: packages/boot/app-boot/src/index.ts:109] 密钥可以共用 `DEEPSEEK_API_KEY`；改 chat 网关 **带不走** search。

## 实例表 · 测试 / CI / fixture

这些名字不是 shipped `dsh web` / `dsh --profile headless` 的产品合同。列：名 · 源 path。

### `DSH_TEST_*`

| 名 | 源 path |
|---|---|
| `DSH_TEST_AMBIENT_SECRET_KEY` | `packages/subagent/subagent-dsh-sdk/tests/subagent-dsh-sdk.spec.ts` |
| `DSH_TEST_API_KEY` | `packages/subprocess/subprocess-local/tests/spawn.spec.ts` |
| `DSH_TEST_TOKEN` | `packages/subprocess/subprocess-local/tests/spawn.spec.ts` |
| `DSH_TEST_PLAIN` | `packages/subprocess/subprocess-local/tests/spawn.spec.ts` |
| `DSH_TEST_SECRET` | `packages/terminal/terminal-bash/tests/local.spec.ts` |
| `DSH_TEST_CHILD_COMMAND` | `examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml` |
| `DSH_TEST_CHILD_ARGS` | `examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml` |
| `DSH_TEST_CHILD_ENV` | `examples/jsonrpc-agent/tests/fixtures/subagent/subagent-dsh-sdk/cordis.yml` |
| `DSH_TEST_MOCK_ACP_SERVER` | `examples/acp-agent/tests/fixtures/subagent/subagent-acp/cordis.yml` |
| `DSH_TEST_SHUTDOWN_ARM_FILE` | `apps/cli/tests/fixtures/never-dispose.mjs` |
| `DSH_TEST_FORBIDDEN_GIT_CONFIG_KEY` | `scripts/install-lefthook.spec.ts` |
| `DSH_TEST_LEFTHOOK_DELAY_MS` | `scripts/install-lefthook.spec.ts` |
| `DSH_TEST_LEFTHOOK_FAIL` | `scripts/install-lefthook.spec.ts` |
| `DSH_TEST_LEFTHOOK_BREAK_WORKTREE_CONFIG` | `scripts/install-lefthook.spec.ts` |
| `DSH_TEST_LEFTHOOK_LOCK_WRITE_DELAY_MS` | `scripts/install-lefthook.mjs` |

### `MOCK_*`（ACP mock server）

| 名 | 源 path |
|---|---|
| `MOCK_ECHO_ENV` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_TEXT` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_ECHO_CWD` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_STOP` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_HANG` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_PERMISSION` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_NO_ALLOW` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_THOUGHT` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_CRASH_ON_CANCEL` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_CRASH_ON_PROMPT` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_IGNORE_CANCEL` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_READY_FILE` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_FLUSH_ON_EOF` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_NEWSESSION_READY` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_NEWSESSION_GO` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_MISSING_SESSION_ID` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_SESSION_ID` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_TRAP_SIGTERM` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_FLUSH_DELAY_MS` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_IGNORE_EOF` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |
| `MOCK_SIGTERM_FILE` | `packages/subagent/subagent-acp/tests/mock-acp-server.ts` |

### `LSP_FAKE_*`

| 名 | 源 path |
|---|---|
| `LSP_FAKE_ENCODING` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_SYNC` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_CAPS` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_HANG` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_CRASH_ON_OPEN` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_EXIT_AFTER_REPLY` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_REPLY_DELAY_MS` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_OPEN_MARKER` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_INITIALIZED_MARKER` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_PAUSE_STDIN_AFTER_INITIALIZED` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_EXIT_DELAY_MS` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_EXIT_MARKER` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_NO_SHUTDOWN` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_ON_OPEN` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_ERROR` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_GARBAGE` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_ECHO_ENV` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_DEF` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_REFS` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_IMPL` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |
| `LSP_FAKE_HOVER` | `packages/lsp/lsp-stdio/tests/fixture-server.ts` |

### Snapshot / gate / 其它 fixture

| 名 | 源 path |
|---|---|
| `DSH_SNAPSHOT` | `vitest.snapshot.config.ts` |
| `DSH_SNAPSHOT_FILE` | `packages/test-support/llm-replay/src/index.ts` |
| `DSH_SNAPSHOT_OVERRIDE` | `packages/test-support/llm-replay/src/index.ts` |
| `DSH_SNAPSHOT_CHILD_FILES` | `packages/test-support/llm-replay/src/index.ts` |
| `DSH_SNAPSHOT_SESSIONS_ROOT` | `examples/acp-agent/cordis.yml` |
| `DSH_SNAPSHOT_SPILL_ROOT` | `examples/acp-agent/fs.cordis.yml` |
| `DSH_SNAPSHOT_BASE_URL` | `examples/headless-agent/tests/fixtures/deepseek-defaults.cordis.yml` |
| `DSH_EXAMPLE_MODE` | `packages/test-support/loader-smoke/src/index.ts` |
| `DSH_GATE_CONCURRENCY` | `scripts/run-gates.ts` |
| `DSH_GATE_VERBOSE` | `scripts/run-gates.ts` |
| `DSH_REQUIRE_BUILT_CLI_SMOKE` | `apps/cli/tests/lazy-search-startup.compat.spec.ts` |
| `DSH_CLI_MOCK_FAILURE` | `examples/headless-agent/tests/fixtures/cli-mock-llm.ts` |
| `DSH_WEB_STRESS_HEADFUL` | `apps/web/stress-tests/reasoning-chunks.stress.ts` |
| `NALR_REQUIRE_LANDLOCK` | `native/landlock-run/test/launcher.test.js` |
| `DSH_PLAYWRIGHT_EXECUTABLE_PATH` | `apps/web/tests/access-confirmation.e2e.ts` |
| `DSH_TELEMETRY_E2E_MODE` | `examples/headless-agent/tests/fixtures/session-telemetry-otel.cordis.yml` |
| `DSH_TELEMETRY_E2E_URL` | `examples/headless-agent/tests/fixtures/session-telemetry-otel.cordis.yml` |
| `DSH_LISTEN_PROBE_MARKER` | `apps/web/tests/support/listen-probe.mjs` |
| `DSH_SUBAGENT_PUBLISHED_FAILURE` | `examples/acp-agent/tests/fixtures/subagent-durability-failure.ts` |
| `DSH_DOC_TYPECHECK_USE_BUILD_OUTPUT` | `scripts/doc-typecheck.ts` |
| `DSH_ARCHIVE_BASE_REF` | `scripts/verify-archived-agent-notes.ts` |
| `DSH_OXLINT_THREADS` | `scripts/run-gates.ts` |
| `DSH_APP_BOOT_SPEC_VAR` | `packages/boot/app-boot/tests/app-boot.spec.ts` |
| `DSH_APP_BOOT_SPEC_DEFAULTS` | `packages/boot/app-boot/tests/app-boot.spec.ts` |
| `DSH_APP_BOOT_USER_SPEC` | `packages/boot/app-boot/tests/user-patches.spec.ts` |
| `DSH_DUMP_SPEC` | `packages/boot/app-boot/tests/config-dump.spec.ts` |
| `DSH_SPEC_MODEL` | `packages/boot/app-boot/tests/user-patches.spec.ts` |
| `DSH_ORDER_FILE` | `packages/shell/bash-sandbox/tests/sandbox.spec.ts` |
| `DSH_SCRUB_PROBE` | `packages/subprocess/subprocess/tests/service.spec.ts` |
| `DSH_STALE` | `packages/subprocess/subprocess-local/tests/spawn.spec.ts` |
| `DSH_PI_AI_OPENAI_BASE_URL` | `packages/llm/llm-pi-ai/tests/provider-apis.e2e.ts` |
| `DSH_PI_AI_OPENAI_MODEL` | `packages/llm/llm-pi-ai/tests/provider-apis.e2e.ts` |
| `DSH_PI_AI_ANTHROPIC_BASE_URL` | `packages/llm/llm-pi-ai/tests/provider-apis.e2e.ts` |
| `DSH_PI_AI_ANTHROPIC_MODEL` | `packages/llm/llm-pi-ai/tests/provider-apis.e2e.ts` |
| `DSH_SESSION_ROOT` | `examples/jsonrpc-agent/cordis.yml` |
| `DSH_MODEL` | `examples/jsonrpc-agent/minimal.cordis.yml` |
| `DSH_CONTEXT_WINDOW` | `examples/jsonrpc-agent/minimal.cordis.yml` |
| `DSH_SYSTEM_PROMPT` | `examples/jsonrpc-agent/cordis.yml` |
| `DSH_MAX_TOKENS_AS_SUCCESS` | `examples/jsonrpc-agent/cordis.yml` |
| `RAW_READY_FILE` | `apps/cli/tests/built-bin.e2e.ts` |
| `RAW_INTERRUPT_FILE` | `apps/cli/tests/built-bin.e2e.ts` |
| `RAW_SETTLED_FILE` | `apps/cli/tests/built-bin.e2e.ts` |
| `RAW_DISPOSED_FILE` | `apps/cli/tests/built-bin.e2e.ts` |
| `CI` | `vitest.config.ts` |
| `GITHUB_ACTIONS` | `scripts/install-lefthook.mjs` |
| `GITHUB_REF` | `native/landlock-run/scripts/verify-release.mjs` |
| `GITHUB_SHA` | `scripts/project-doc-site.ts` |
| `RELEASE_PUBLISH` | `native/landlock-run/scripts/verify-release.mjs` |
| `PACKAGE_NAME` | `scripts/package-invariants.spec.ts` |

`packages/examples/acp-demo/src/bin.ts` 读 `DSH_SNAPSHOT` 选 snapshot 模式，归本表，不进产品表。

## Sources

- packages/util/home-paths/src/index.ts
- packages/llm/llm-deepseek/src/adapter.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/web/web-search-deepseek/src/index.ts
- packages/web/web-search-deepseek/src/provider.ts
- AGENTS.md
- packages/llm/llm-pi-ai/src/index.ts
- packages/session/session-telemetry-otel/src/index.ts
- packages/boot/app-boot/src/index.ts
- apps/cli/src/bin.ts
- apps/cli/src/profile-boot.ts
- packages/e2b/e2b/src/index.ts
- packages/web/web/src/index.ts
- packages/web/web-search-exa/src/index.ts
- packages/web/web-search-perplexity/src/index.ts
- packages/skill/skill-filesystem/src/index.ts
- packages/host/directory-picker-auto/src/index.ts
- packages/host/directory-picker-auto/src/resolve.ts
- packages/host/directory-picker-native/src/win32-dialog-worker.ts
- packages/host/apiproxy/src/native-path-opener.ts
- packages/shell/pwsh-local/src/resolve.ts
- packages/util/launch-environment/src/index.ts
- packages/credentials/credentials-local/src/index.ts
- vendor/loader/src/index.ts
- packages/client/runtime/src/client/contract/store.ts
- packages/workflow/workflow-worker-thread/src/host.ts
- packages/subprocess/subprocess/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- packages/identity/anonymous-user-id/src/index.ts
- packages/examples/jsonrpc-demo/src/runner.ts
- packages/sdk/client/src/client.ts
- packages/llm/llm-deepseek/tests/adapter.spec.ts
- packages/web/web-search-deepseek/tests/deepseek.spec.ts
- packages/util/home-paths/tests/home-paths.spec.ts

## 相关

- [subsys.util.home-paths](../subsystems/util/home-paths.md)（`subsys.util.home-paths`）：`resolveDshHome` / `DSH_HOME_ENV` / `~/.dsh` 的权威实现。
- [surface.misc.home](../surface/misc/home.md)（`surface.misc.home`）：T1 产品面路径入口。
- [subsys.llm.deepseek](../subsystems/llm/deepseek.md)（`subsys.llm.deepseek`）：`deepseek-official` chat adapter 与 `DEEPSEEK_BASE_URL`。
- [subsys.integration.web-search](../subsystems/integration/web-search.md)（`subsys.integration.web-search`）：search seam 与 `DEEPSEEK_SEARCH_BASE_URL`。
- [subsys.composition.app-boot](../subsystems/composition/app-boot.md)（`subsys.composition.app-boot`）：`loadLayeredEnv` 与 bootstrap-only 名单。
- [subsys.persistence.credentials](../subsystems/persistence/credentials.md)（`subsys.persistence.credentials`）：`DEEPSEEK_API_KEY` 的文件层与 inherited 层。
- [subsys.persistence.telemetry](../subsystems/persistence/telemetry.md)（`subsys.persistence.telemetry`）：`DSH_TELEMETRY_DISABLED` 与 otel mode。
