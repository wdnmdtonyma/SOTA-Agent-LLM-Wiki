---
id: surface.sdk.python
title: Python SDK
kind: surface
tier: T1
pkg: integration
source:
  - python/sdk/src/deepseek_harness/client.py
  - python/sdk/src/deepseek_harness/__init__.py
  - python/sdk/src/deepseek_harness/api.py
  - python/sdk/src/deepseek_harness/errors.py
  - python/sdk/src/deepseek_harness/models.py
  - python/sdk/pyproject.toml
  - python/sdk/tests/test_client.py
  - python/sdk/tests/test_bundled_runtime.py
  - python/sdk-runtime/src/deepseek_harness_runtime/__init__.py
  - python/sdk-runtime/pyproject.toml
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/client/src/client.ts
  - packages/sdk/server/src/server.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/web-app/package.json
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/presets/minimal/preset.yml
  - packages/preset/agent-presets/presets/standard/preset.yml
  - packages/preset/agent-presets/presets/ptc/preset.yml
  - packages/preset/agent-presets/presets/cordis/preset.yml
symbols:
  - DeepSeekHarness
  - HarnessClient
  - Session
related:
  - surface.sdk.typescript
  - surface.acp.server
  - subsys.integration.sdk-protocol
  - subsys.integration.sdk-server
  - subsys.integration.sdk-client
evidence: explicit
status: verified
updated: 0a53fb55be
---

> PyPI 包 `deepseek-harness-sdk`（import `deepseek_harness`）是跑在 harness **进程外** 的同步 JSON-RPC 客户端：`HarnessClient` 用 `subprocess.Popen` 拉起 bundled `dsh` CLI（发行名 `deepseek-harness-runtime-bin`），在 NDJSON stdio 上讲与 TypeScript 相同的三请求 / 四通知。默认 argv 是 bundled exe（或 `DSH_RUNTIME_MODE=node` 时的 `node` + `bin.js`）再加 `--profile <profile>` 与可选 `--patch`。它不是 Cordis 插件，也不进 `dsh web` / shipped agent preset。

## 能回答的问题

- Python SDK 和 TS SDK 是不是同一份代码？默认 `Popen` 的 argv 是什么？
- 包根 `__all__` 导出哪些符号？高层 session 句柄叫 `Session` 还是 `HarnessSession`？
- 客户端发出哪三个 JSON-RPC 方法？等哪四条通知？`notify` / `next_request` / `respond` 算不算协议方法？
- `Session.run` 何时结算？`RunResult.events` 含不含子 agent？`finish_reason` 从哪来？
- 孩子如何选 profile / `DSH_HOME` / `--patch`？还注不注入 `DSH_CORDIS_CONFIG`？
- `dsh web` / shipped preset 会不会装这个包？默认 profile 与 `sdk-minimal` 有何差别？

## 是什么

DSH 是 Cordis **组合运行时**（`profile → bundle → agent preset`）。`PROFILE_TEMPLATES` 有五个 shipped 名：`acp`、`web`（唯一 `live`）、`headless`、`sdk`、`sdk-minimal`；没有 TUI 模板。[E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:150] [E: packages/boot/app-boot/src/profile.ts:154] 四个 shipped agent preset 目录是 `minimal` / `standard` / `ptc` / `cordis`，挂在 `SHIPPED_PRESET_ROOT`（`../presets/`）。[E: packages/preset/agent-presets/src/discovery.ts:60] [E: packages/preset/agent-presets/presets/minimal/preset.yml:1] [E: packages/preset/agent-presets/presets/standard/preset.yml:1] [E: packages/preset/agent-presets/presets/ptc/preset.yml:1] [E: packages/preset/agent-presets/presets/cordis/preset.yml:1]

本包是那条树 **外面** 的 Python Consumer。发行名 `deepseek-harness-sdk`，Python ≥ 3.10，依赖 `pydantic>=2.12,<3` 与同版本钉死的 `deepseek-harness-runtime-bin`。[E: python/sdk/pyproject.toml:6] [E: python/sdk/pyproject.toml:10] [E: python/sdk/pyproject.toml:14] [E: python/sdk/pyproject.toml:15] 包根 `__all__` 才是公共导出面：`DeepSeekHarness` / `DeepSeekHarnessConfig` / `Session` / `RunResult` / `HarnessClient` / `HarnessConfig` / `SdkProtocolError` / `IncomingRequest` / `InitializeResponse` / `JsonObject` / `Notification` / `ServerInfo`。[E: python/sdk/src/deepseek_harness/__init__.py:6] [E: python/sdk/src/deepseek_harness/__init__.py:11] 没有 `HarnessSession`。`TransportClosedError` / `JsonRpcError` / `HarnessError` 活在 `deepseek_harness.errors`，不进 `__all__`。[E: python/sdk/src/deepseek_harness/errors.py:4] [E: python/sdk/src/deepseek_harness/errors.py:8] [E: python/sdk/src/deepseek_harness/errors.py:16] [E: python/sdk/src/deepseek_harness/__init__.py:3]

**同一份 wire，两套实现。** 方法表是 `@deepseek-ai/dsh-sdk-protocol` 的 `HarnessSdkRequestMap`（`initialize` / `session/prompt` / `shutdown`）与 `HarnessSdkNotificationMap`（`session.event` / `session.status` / `subagent.started` / `subagent.finished`）。[E: packages/sdk/protocol/src/types.ts:116] [E: packages/sdk/protocol/src/types.ts:117] [E: packages/sdk/protocol/src/types.ts:118] [E: packages/sdk/protocol/src/types.ts:118] [E: packages/sdk/protocol/src/types.ts:108] [E: packages/sdk/protocol/src/types.ts:109] [E: packages/sdk/protocol/src/types.ts:110] [E: packages/sdk/protocol/src/types.ts:111] Python 自己在 `client.py` 读写一行一个 JSON-RPC 2.0 对象，不 import 那份 TS transport。拉起孩子用 `subprocess.Popen`；TS `HarnessClient.start` 用 `child_process.spawn`。[E: python/sdk/src/deepseek_harness/client.py:80] [E: packages/sdk/client/src/client.ts:214]

**孩子是谁。** `python/sdk-runtime` 的发行名是 `deepseek-harness-runtime-bin`。[E: python/sdk-runtime/pyproject.toml:6] 它定位/随轮子附带 exe（或 dev-only node 闭包），自己不是完整 argv：客户端把 bundled 路径接到 `--profile` 与 `--patch`。[E: python/sdk/src/deepseek_harness/client.py:486] `HarnessClient._default_launch_args` 的优先级：`dsh_bin` 显式路径，否则 `from deepseek_harness_runtime import resolve_bundled_launch_args`。[E: python/sdk/src/deepseek_harness/client.py:459] [E: python/sdk/src/deepseek_harness/client.py:461] [E: python/sdk/src/deepseek_harness/client.py:467] 缺省 mode（参数与 `DSH_RUNTIME_MODE` 都空，或值为 `exe`）返回 `(bundled_runtime_path(),)`，路径是 `runtime/deepseek-harness-sdk-runtime-<plat>-<arch>`（linux/macos/win 与 arch 标签）。[E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:67] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:106] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:107] `DSH_RUNTIME_MODE=node` 才走 `_node_launch_args`：系统 `node` + `runtime/node/node_modules/@deepseek-ai/dsh/lib/bin.js`。[E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:108] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:140] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:156] 自动解析只找 production exe，不会静默落到 node。[E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:98] 缺 runtime 包时 `start()` 抛 `FileNotFoundError`，文案要求安装 `deepseek-harness-runtime-bin`。[E: python/sdk/src/deepseek_harness/client.py:465] [E: python/sdk/tests/test_client.py:1072]

**不是 ACP，不是 `dsh web`。** 协议没有 `authenticate` / `newSession` / `cancel`。Web 工作台走 host HTTP，不讲这套 stdio JSON-RPC。宿主入口除 `dsh web` 外还有 `dsh --profile sdk|sdk-minimal|acp|headless`。[E: packages/bundle/sdk-app/src/index.ts:40] 本仓没有 shipped TUI。

## 入口

| 入口 | 行为 |
|---|---|
| `from deepseek_harness import DeepSeekHarness` 再 `with DeepSeekHarness(...) as harness` | `__enter__` 调 `start()`（懒 `Popen` + 一次 `initialize`），`__exit__` 调 `close()`。[E: python/sdk/src/deepseek_harness/api.py:93] [E: python/sdk/src/deepseek_harness/api.py:97] |
| `harness.run(input, session_id=…)` | `start_session(session_id).run(...)`。[E: python/sdk/src/deepseek_harness/api.py:131] |
| `harness.start_session(id?)` | 先 `start()`，再铸本地 `Session`。省略 id 则 `session-{uuid4.hex}`。[E: python/sdk/src/deepseek_harness/api.py:121] [E: python/sdk/src/deepseek_harness/api.py:122] 第一次 `session/prompt` 才在 **server** 侧 `getOrCreateSession` 懒创建 agent+session。[E: packages/sdk/server/src/server.ts:178] [E: packages/sdk/server/src/server.ts:259] |
| `HarnessClient(HarnessConfig(...))` | 低层：自己管 `Popen` / 三请求 / 订阅。也可当 context manager。[E: python/sdk/src/deepseek_harness/client.py:42] [E: python/sdk/src/deepseek_harness/client.py:64] |
| 默认 bundled launch | 无 `_launch_args` 时 `_default_launch_args`：bundled 或 `dsh_bin`，再 `--profile` 与每个 patch 一对 `--patch`。[E: python/sdk/src/deepseek_harness/client.py:79] [E: python/sdk/src/deepseek_harness/client.py:486] |
| `dsh_bin` / `patches` / `profile` | 测试与自定义二进制入口。高层 `DeepSeekHarnessConfig` 与 `HarnessConfig` 都有这三项以及 `dsh_home`；已删除 `runtime_bin` / `bridge_bin` / `launch_args_override` / `cordis` / `session_root`。[E: python/sdk/src/deepseek_harness/api.py:28] [E: python/sdk/src/deepseek_harness/client.py:28] [E: python/sdk/tests/test_client.py:876] |
| `DSH_RUNTIME_MODE` | 只被 `resolve_bundled_launch_args` 读取；`client.py` 调用时不传 `mode`。[E: python/sdk/src/deepseek_harness/client.py:467] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:105] |

`dsh web` / `dsh --profile web` / `dsh --profile headless` **不会** import 本包。`@deepseek-ai/dsh-web-app` 声明 `dsh.bundle.patch`。[E: packages/bundle/web-app/package.json:2] [E: packages/bundle/web-app/package.json:43] 本 Python 包默认 `profile="sdk"`，对应 `dsh-base` + `dsh-sdk-app`。[E: python/sdk/src/deepseek_harness/client.py:29] [E: packages/boot/app-boot/src/profile.ts:150] `sdk-minimal` 是唯一不叠 `dsh-base` 的 shipped bundle。[E: packages/boot/app-boot/src/profile.ts:155] [E: packages/bundle/sdk-minimal/package.json:2] [E: packages/bundle/sdk-minimal/package.json:38] 对 `packages/bundle` 全文检索 `deepseek-harness-sdk` 包名不会作为 Cordis 行插入；四个 shipped preset 也不装本包。[I]

## 关键字段

### `DeepSeekHarnessConfig`

构造要么传一份 config，要么传关键字，不能两份一起给。[E: python/sdk/src/deepseek_harness/api.py:65]

| 字段 | 默认 | 含义 |
|---|---|---|
| `provider` | `"deepseek-official"` | 写入 `initialize`。[E: python/sdk/src/deepseek_harness/api.py:22] |
| `model` | `"deepseek-v4-flash"` | 写入 `initialize`。[E: python/sdk/src/deepseek_harness/api.py:23] |
| `reasoning_effort` | `None` | 有值才往 wire 写 camelCase `reasoningEffort`。[E: python/sdk/src/deepseek_harness/api.py:24] [E: python/sdk/src/deepseek_harness/client.py:148] |
| `max_tokens` | `None` | 有值才写 `maxTokens`。本客户端不校验正整数；非法值由 server 拒 `initialize maxTokens must be a positive safe integer`。[E: python/sdk/src/deepseek_harness/client.py:150] [E: packages/sdk/server/src/server.ts:142] |
| `cwd` | `Path.cwd()` | 先 `resolve` 成绝对路径，只进 `initialize.cwd`（不再写 `DSH_CWD`）。[E: python/sdk/src/deepseek_harness/api.py:67] [E: python/sdk/src/deepseek_harness/api.py:108] [E: python/sdk/tests/test_client.py:116] |
| `runtime_cwd` | 与 `cwd` 相同 | **子进程** `Popen(..., cwd=)`。相对值在本进程先 `resolve`。[E: python/sdk/src/deepseek_harness/api.py:68] [E: python/sdk/src/deepseek_harness/client.py:87] [E: python/sdk/tests/test_client.py:227] |
| `dsh_bin` | `None` | 覆盖 bundled exe；仍会追加 `--profile` / `--patch`。[E: python/sdk/src/deepseek_harness/client.py:469] |
| `profile` | `"sdk"` | 接到 argv `--profile`。[E: python/sdk/src/deepseek_harness/api.py:29] [E: python/sdk/src/deepseek_harness/client.py:486] |
| `patches` | `()` | 每个路径变成 `--patch <abs>`。[E: python/sdk/src/deepseek_harness/client.py:484] |
| `dsh_home` | `None` | 写入孩子 `DSH_HOME`。必须显式 `dsh_home` 或非空 `DSH_HOME`；从不隐式用 `~/.dsh`。[E: python/sdk/src/deepseek_harness/client.py:474] [E: python/sdk/src/deepseek_harness/client.py:477] [E: python/sdk/tests/test_client.py:1064] |
| `base_url` / `api_key` | `None` | 写入 `DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY`。[E: python/sdk/src/deepseek_harness/api.py:72] [E: python/sdk/src/deepseek_harness/api.py:74] |
| `env` | `{}` | 叠在 `os.environ.copy()` 上。[E: python/sdk/src/deepseek_harness/client.py:76] [E: python/sdk/src/deepseek_harness/client.py:78] |
| `initialize_timeout_seconds` | `30.0` | 只约束 `initialize`；超时 `close()` 并在消息里带所选 profile。[E: python/sdk/src/deepseek_harness/api.py:33] [E: python/sdk/src/deepseek_harness/client.py:156] [E: python/sdk/src/deepseek_harness/client.py:160] |
| `request_timeout_seconds` | `None` | `None` = 无限等。到期抛内置 `TimeoutError`（没有 TS 那种 `RequestTimeoutError` 类型）。[E: python/sdk/src/deepseek_harness/client.py:292] [E: python/sdk/src/deepseek_harness/client.py:308] |
| `shutdown_timeout_seconds` | `1.0` | `shutdown` 等待与 `terminate` 后再 `kill` 共用这一档。[E: python/sdk/src/deepseek_harness/api.py:35] [E: python/sdk/src/deepseek_harness/client.py:101] [E: python/sdk/src/deepseek_harness/client.py:122] |

公开签名故意没有 `system_prompt` / `client_name`；`profile` 不出现在 `initialize` / `session_prompt` / `run` 的参数表（它是 launch 配置）。[E: python/sdk/tests/test_client.py:855] [E: python/sdk/tests/test_client.py:856] [E: python/sdk/tests/test_client.py:859]

### 三请求 / 四通知

| JSON-RPC | Python API | 要点 |
|---|---|---|
| `initialize` | `HarnessClient.initialize(*, cwd, provider, model, reasoning_effort=None, max_tokens=None)` | 方法签名是 `def initialize(`。[E: python/sdk/src/deepseek_harness/client.py:133] `cwd` 再 `Path.resolve`。超时或任何 `BaseException` 先 `close()` 再抛。[E: python/sdk/src/deepseek_harness/client.py:143] [E: python/sdk/src/deepseek_harness/client.py:159] [E: python/sdk/src/deepseek_harness/client.py:162] |
| `session/prompt` | `HarnessClient.session_prompt`（**不叫** `prompt`） | params `{ sessionId, contentBlocks }`，Pydantic 取 `messageId`。[E: python/sdk/src/deepseek_harness/client.py:172] [E: python/sdk/src/deepseek_harness/client.py:180] [E: python/sdk/src/deepseek_harness/client.py:189] |
| `shutdown` | `close()` 里 `request("shutdown", None)` | `params is None` 时 **省略** `params` 键（TS 客户端缺省发 `{}`）。[E: python/sdk/src/deepseek_harness/client.py:101] [E: python/sdk/src/deepseek_harness/client.py:283] |
| `session.event` | `Notification.method` | `Session.run` 只把 **根** `sessionId == self.id` 的 event 放进 `RunResult.events`。[E: python/sdk/src/deepseek_harness/api.py:154] [E: python/sdk/src/deepseek_harness/api.py:159] |
| `session.status` | `Notification.method` | 根 session `status == "idle"` 才结束 `run`。[E: python/sdk/src/deepseek_harness/api.py:177] [E: python/sdk/src/deepseek_harness/api.py:180] |
| `subagent.started` | 客户端 parent map | 写入 `_session_parents[child]=parent`；空边 / 自环不写。[E: python/sdk/src/deepseek_harness/client.py:493] [E: python/sdk/src/deepseek_harness/client.py:504] |
| `subagent.finished` | 树过滤 | 与 `subagent.started` 一样看 `parentSessionId` 是否为根的后代，或 `childSessionId == root`。[E: python/sdk/src/deepseek_harness/client.py:509] |

`models.Notification` / `IncomingRequest` 是无类型约束的 `{method, payload}`，**没有**把四条通知收成 TypedDict。[E: python/sdk/src/deepseek_harness/models.py:14] [E: python/sdk/src/deepseek_harness/models.py:20] `InitializeResponse.serverInfo` 与 `ServerInfo.name` / `version` 都可以是 `None`；本客户端不钉死 `deepseek-harness-sdk-runtime`。那个字面量由 server 写入。[E: python/sdk/src/deepseek_harness/models.py:27] [E: python/sdk/src/deepseek_harness/models.py:32] [E: packages/sdk/server/src/server.ts:168] 真 runtime 冒烟测断言 `name == "deepseek-harness-sdk-runtime"`，且 bundled `sdk` profile 的 bundles 为 `dsh-base` + `dsh-sdk-app`。[E: python/sdk/tests/test_bundled_runtime.py:56] [E: python/sdk/tests/test_bundled_runtime.py:58]

`notify` / `next_request` / `respond` / `respond_error` 是通用 JSON-RPC 能力，**不是** `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` 的键。[E: python/sdk/src/deepseek_harness/client.py:214] [E: python/sdk/src/deepseek_harness/client.py:240] [E: python/sdk/src/deepseek_harness/client.py:246] [E: python/sdk/src/deepseek_harness/client.py:249] 入站带 `id`+`method` 的帧进 `_requests` 队列。[E: python/sdk/src/deepseek_harness/client.py:384] shipped `sdk-jsonrpc-server` 对客户端 `transport.notify` 那四条。[E: packages/sdk/server/src/server.ts:99] [E: packages/sdk/server/src/server.ts:100] [E: packages/sdk/server/src/server.ts:109] [E: packages/sdk/server/src/server.ts:126]

写出帧：`json.dumps(..., separators=(",", ":")) + "\n"`。[E: python/sdk/src/deepseek_harness/client.py:337] 非 JSON stdout 行丢弃。[E: python/sdk/src/deepseek_harness/client.py:363] stderr 最多留 400 行，拼进 `TransportClosedError`。[E: python/sdk/src/deepseek_harness/client.py:60]

### `RunResult` 与 `Session.run`

字符串输入收成 `[{"type": "text", "text": …}]`。[E: python/sdk/src/deepseek_harness/api.py:206] [E: python/sdk/src/deepseek_harness/api.py:207] `run` 先 `subscribe_session_notifications`，再 `session_prompt`，在看到本 session 上 `agent/inbox/spliced.inserted[].id == messageId` 之前丢掉通知；回执之后收集，直到根 `session.status == "idle"`。[E: python/sdk/src/deepseek_harness/api.py:161] [E: python/sdk/src/deepseek_harness/api.py:172] [E: python/sdk/src/deepseek_harness/api.py:200]

| 字段 | 含义 |
|---|---|
| `final_response` | 从后往前找最后一条根 `assistant/message`，拼接 `type=="text"` 块；没有则 `""`。[E: python/sdk/src/deepseek_harness/api.py:211] [E: python/sdk/src/deepseek_harness/api.py:228] |
| `finish_reason` | 最后一条根 `turn/end` 的 `data.reason.kind`；没有 `turn/end` 则 `None`；有 `turn/end` 但 kind 不是 `str` 则 `SdkProtocolError`。[E: python/sdk/src/deepseek_harness/api.py:240] [E: python/sdk/src/deepseek_harness/api.py:246] |
| `events` | 仅根 session 的 `session.event` payload。[E: python/sdk/src/deepseek_harness/api.py:154] 子 session 的 assistant 文本不会覆盖根 `final_response`。[E: python/sdk/tests/test_client.py:326] |
| `notifications` | 整棵已发现 session 树，按 wire 顺序。[E: python/sdk/src/deepseek_harness/api.py:150] |

冒烟测试里一次 `turn/end` 的 `finish_reason` 是 `"max-tokens"`。[E: python/sdk/tests/test_client.py:111] `RunResult` **没有** `session_root`。[E: python/sdk/tests/test_client.py:880]

## 装配与门控

**不是 Cordis 插件，不进 shipped agent-preset 树。** 本库不 `apply` / 不 `inject` / 不登记 `ctx.*`。孩子进程走 CLI profile：默认 `sdk` 叠 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-sdk-app`，overlay 插入 `sdk-app-startup` 与 `sdk-jsonrpc-server`。[E: packages/bundle/sdk-app/package.json:2] [E: packages/bundle/sdk-app/cordis.patch.yml:12] [E: packages/bundle/sdk-app/cordis.patch.yml:17] 调用方可把 `profile` 改成 `sdk-minimal`（独立完整 insert，不叠 base）。[E: packages/boot/app-boot/src/profile.ts:155] 这 **不是** shipped `minimal` / `standard` / `ptc` / `cordis` preset，也没有 Python 侧注入 `id: agent-presets`。

**不再注入 bundled `cordis.yml`。** 旧字段 `cordis` / `session_root` / `runtime_bin` / `bridge_bin` / `launch_args_override` 已从两个 Config 删掉；孩子 env 测例里 `DSH_CORDIS_CONFIG` 为 `None`。[E: python/sdk/tests/test_client.py:876] [E: python/sdk/tests/test_client.py:1035] 组合来自 `dsh --profile` 的 bundle + 用户 `$DSH_HOME/profiles/<name>/`。

门控（调用方会直接撞上）：

1. 缺 `deepseek-harness-runtime-bin` 且没给 `dsh_bin` / `_launch_args` → `FileNotFoundError`。[E: python/sdk/tests/test_client.py:1072]
2. 未设 `dsh_home` 且 `DSH_HOME` 为空 → `ValueError`。[E: python/sdk/src/deepseek_harness/client.py:476]
3. `initialize` 失败（含 JSON-RPC error）会 `close()` 已启动的 `_proc`。[E: python/sdk/src/deepseek_harness/client.py:162] [E: python/sdk/tests/test_client.py:848]
4. 协议 **没有** `session/cancel`。超时只扔掉本侧 pending；要停就 `close()` 整棵孩子。[E: python/sdk/src/deepseek_harness/client.py:308]
5. `close()`：尽力 `shutdown` → 关 stdin → 可选 `wait` → `terminate` → 等 `shutdown_timeout_seconds` → `kill`，然后 `_proc = None`。[E: python/sdk/src/deepseek_harness/client.py:101] [E: python/sdk/src/deepseek_harness/client.py:107] [E: python/sdk/src/deepseek_harness/client.py:117] [E: python/sdk/src/deepseek_harness/client.py:124] [E: python/sdk/src/deepseek_harness/client.py:126] 之后 `start()` 可以再 `Popen`（`DeepSeekHarness.close` 同时把 `_initialized=False`）。[E: python/sdk/src/deepseek_harness/api.py:118] [E: python/sdk/src/deepseek_harness/client.py:72] TS `HarnessClient.start` 在 `closeTask` 已设时抛 `TransportClosedError`，不会再 spawn。[E: packages/sdk/client/src/client.ts:212]
6. 订阅 filter 抛错只 fail 那一条订阅，兄弟订阅和 reader 继续。[E: python/sdk/tests/test_client.py:621]
7. parent map 挂在 **client 实例** 上，跨 `subscribe_session_notifications` 存活；`start()` 在新 `Popen` 前 `clear()`。[E: python/sdk/src/deepseek_harness/client.py:75] [E: python/sdk/tests/test_client.py:503]

`messageId` 只是入队回执。完成态看后续 `session.status` 的 `idle`，正文看 `session.event`。

## 跨包关系

- [`surface.sdk.typescript`](typescript.md)（`surface.sdk.typescript`）：同方法表的 TS 可见面；孩子用 `spawn`，高层句柄叫 `HarnessSession` / `session()`，`close` 后不能再 start。
- [`surface.acp.server`](../acp/server.md)（`surface.acp.server`）：另一条 automation JSON-RPC（ACP 的 `newSession` / `prompt` / `cancel`），不是本协议。
- [`subsys.integration.sdk-protocol`](../../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三请求 / 四通知的 wire 形状与 NDJSON transport。本页只消费方法名，不写 `JsonRpcLineTransport`。
- [`subsys.integration.sdk-server`](../../subsystems/integration/sdk-server.md)（`subsys.integration.sdk-server`）：孩子进程里的 `sdk-jsonrpc-server`；未知 `sessionId` 在那边懒创建。
- [`subsys.integration.sdk-client`](../../subsystems/integration/sdk-client.md)（`subsys.integration.sdk-client`）：TS `HarnessClient` 的 spawn / 拆卸阶梯。本页不复述 EOF→SIGTERM→SIGKILL。

## Sources

- python/sdk/src/deepseek_harness/client.py
- python/sdk/src/deepseek_harness/__init__.py
- python/sdk/src/deepseek_harness/api.py
- python/sdk/src/deepseek_harness/errors.py
- python/sdk/src/deepseek_harness/models.py
- python/sdk/pyproject.toml
- python/sdk/tests/test_client.py
- python/sdk/tests/test_bundled_runtime.py
- python/sdk-runtime/src/deepseek_harness_runtime/__init__.py
- python/sdk-runtime/pyproject.toml
- packages/sdk/protocol/src/types.ts
- packages/sdk/client/src/client.ts
- packages/sdk/server/src/server.ts
- packages/boot/app-boot/src/profile.ts
- packages/bundle/sdk-app/package.json
- packages/bundle/sdk-app/src/index.ts
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-minimal/package.json
- packages/bundle/web-app/package.json
- packages/preset/agent-presets/src/discovery.ts
- packages/preset/agent-presets/presets/minimal/preset.yml
- packages/preset/agent-presets/presets/standard/preset.yml
- packages/preset/agent-presets/presets/ptc/preset.yml
- packages/preset/agent-presets/presets/cordis/preset.yml

## 相关

- [surface.sdk.typescript](typescript.md)（`surface.sdk.typescript`）：同协议的 TS SDK 可见面。
- [surface.acp.server](../acp/server.md)（`surface.acp.server`）：ACP JSON-RPC server，方法表不同。
- [subsys.integration.sdk-protocol](../../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三请求 / 四通知合同。
- [subsys.integration.sdk-server](../../subsystems/integration/sdk-server.md)（`subsys.integration.sdk-server`）：孩子侧 JSON-RPC server。
- [subsys.integration.sdk-client](../../subsystems/integration/sdk-client.md)（`subsys.integration.sdk-client`）：TS 客户端 spawn / close。
