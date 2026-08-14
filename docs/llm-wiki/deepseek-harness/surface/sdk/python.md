---
id: surface.sdk.python
title: Python SDK
kind: surface
tier: T1
pkg: integration
source:
  - python/sdk/src/deepseek_harness/client.py
  - python/sdk/src/deepseek_harness/__init__.py
  - python/sdk/README.md
  - python/sdk/src/deepseek_harness/api.py
  - python/sdk/src/deepseek_harness/errors.py
  - python/sdk/src/deepseek_harness/models.py
  - python/sdk/pyproject.toml
  - python/sdk/tests/test_client.py
  - python/sdk/tests/test_bundled_runtime.py
  - python/sdk-runtime/src/deepseek_harness_runtime/__init__.py
  - python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml
  - python/sdk-runtime/pyproject.toml
  - packages/sdk/protocol/src/types.ts
  - packages/sdk/client/src/client.ts
  - packages/sdk/server/src/server.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
symbols:
  - DeepSeekHarness
  - HarnessClient
  - Session
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> PyPI 包 `deepseek-harness-sdk`（import `deepseek_harness`）是跑在 harness **进程外** 的同步 JSON-RPC 客户端：`HarnessClient` 用 `subprocess.Popen` 拉起一份完整 runtime，在 NDJSON stdio 上讲与 TypeScript 相同的三请求 / 四通知。两端实现不共享。默认孩子不是硬编码的 `dsh-jsonrpc-agent` 字符串，而是 `python/sdk-runtime`（发行名 `deepseek-harness-runtime-bin`）解析出的单文件 exe `dsh-jsonrpc-agent-pkg-<plat>-<arch>`。它不是 Cordis 插件，也不进默认产品 `dsh web`。

## 能回答的问题

- Python SDK 和 TS SDK 是不是同一份代码？默认 `Popen` 的 argv 是什么？
- 包根 `__all__` 导出哪些符号？高层 session 句柄叫 `Session` 还是 `HarnessSession`？
- 客户端发出哪三个 JSON-RPC 方法？等哪四条通知？`notify` / `next_request` / `respond` 算不算协议方法？
- `Session.run` 何时结算？`RunResult.events` 含不含子 agent？`finish_reason` 从哪来？
- 什么时候注入 bundled `DSH_CORDIS_CONFIG`？改 `runtime_bin` / `launch_args_override` 还会不会注入？
- `dsh web` / shipped preset 会不会装这个包？

## 是什么

DSH 是 Cordis **组合运行时**（`profile → bundle → agent preset`）。默认产品路径是本地 Web GUI：`PROFILE_TEMPLATES` 只有 `web`（`dsh-base` + `dsh-web-app`）和 `headless`（`dsh-base` + `dsh-headless`），没有 shipped TUI。[E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116]

本包是那条树 **外面** 的 Python Consumer。发行名 `deepseek-harness-sdk`，Python ≥ 3.10，依赖 `pydantic>=2.12,<3` 与同版本钉死的 `deepseek-harness-runtime-bin`。[E: python/sdk/pyproject.toml:6] [E: python/sdk/pyproject.toml:10] [E: python/sdk/pyproject.toml:14] [E: python/sdk/pyproject.toml:15] 包根 `__all__` 才是公共导出面：`DeepSeekHarness` / `DeepSeekHarnessConfig` / `Session` / `RunResult` / `HarnessClient` / `HarnessConfig` / `SdkProtocolError` / `IncomingRequest` / `InitializeResponse` / `JsonObject` / `Notification` / `ServerInfo`。[E: python/sdk/src/deepseek_harness/__init__.py:6] [E: python/sdk/src/deepseek_harness/__init__.py:7] [E: python/sdk/src/deepseek_harness/__init__.py:9] [E: python/sdk/src/deepseek_harness/__init__.py:11] 没有 `HarnessSession`。`TransportClosedError` / `JsonRpcError` / `HarnessError` 活在 `deepseek_harness.errors`，不进 `__all__`。[E: python/sdk/src/deepseek_harness/errors.py:4] [E: python/sdk/src/deepseek_harness/errors.py:8] [E: python/sdk/src/deepseek_harness/errors.py:16] [E: python/sdk/src/deepseek_harness/__init__.py:3]

**同一份 wire，两套实现。** 方法表是 `@deepseek-ai/dsh-sdk-protocol` 的 `HarnessSdkRequestMap`（`initialize` / `session/prompt` / `shutdown`）与 `HarnessSdkNotificationMap`（`session.event` / `session.status` / `subagent.started` / `subagent.finished`）。[E: packages/sdk/protocol/src/types.ts:101] [E: packages/sdk/protocol/src/types.ts:102] [E: packages/sdk/protocol/src/types.ts:103] [E: packages/sdk/protocol/src/types.ts:104] [E: packages/sdk/protocol/src/types.ts:93] [E: packages/sdk/protocol/src/types.ts:94] [E: packages/sdk/protocol/src/types.ts:95] [E: packages/sdk/protocol/src/types.ts:96] [E: packages/sdk/protocol/src/types.ts:97] Python 自己在 `client.py` 读写一行一个 JSON-RPC 2.0 对象，不 import 那份 TS transport。拉起孩子用 `subprocess.Popen`；TS `HarnessClient.start` 用 `child_process.spawn`。[E: python/sdk/src/deepseek_harness/client.py:73] [E: packages/sdk/client/src/client.ts:206]

**孩子是谁。** `python/sdk-runtime` 的发行名是 `deepseek-harness-runtime-bin`。[E: python/sdk-runtime/pyproject.toml:6] 它定位/随轮子附带 exe 与默认 `cordis.yml`，自己不是 argv：客户端默认 argv 来自 `resolve_bundled_launch_args`。[E: python/sdk/src/deepseek_harness/client.py:436] `HarnessClient._default_launch_args` 的优先级：`runtime_bin` → `bridge_bin` → `from deepseek_harness_runtime import resolve_bundled_launch_args`。[E: python/sdk/src/deepseek_harness/client.py:425] [E: python/sdk/src/deepseek_harness/client.py:427] [E: python/sdk/src/deepseek_harness/client.py:430] [E: python/sdk/src/deepseek_harness/client.py:436] 缺省 mode（参数与 `DSH_RUNTIME_MODE` 都空，或值为 `exe`）返回 `(bundled_runtime_path(),)`，路径是 `runtime/dsh-jsonrpc-agent-pkg-<plat>-<arch>`（`plat` ∈ linux/macos，`arch` ∈ x64/arm64）。[E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:80] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:109] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:110] `DSH_RUNTIME_MODE=node` 才走 `_node_launch_args`：系统 `node` + `dsh-sdk-jsonrpc-demo/lib/packaged-bin.js`。[E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:111] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:137] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:139] 不会自动回落到 exe。[I] 缺 runtime 包时 `start()` 抛 `FileNotFoundError`，文案要求安装 `deepseek-harness-runtime-bin` 或设 `runtime_bin`。[E: python/sdk/src/deepseek_harness/client.py:433] [E: python/sdk/tests/test_client.py:1000]

官方 `python/sdk/README.md` 把默认孩子简写成 `dsh-jsonrpc-agent`；`client.py` 默认 argv 没有这个字面量。[U]

**不是 ACP，不是 `dsh web`。** 协议没有 `authenticate` / `newSession` / `cancel`。Web 工作台走 host HTTP，不讲这套 stdio JSON-RPC。本仓没有 shipped TUI。

## 入口

| 入口 | 行为 |
|---|---|
| `from deepseek_harness import DeepSeekHarness` 再 `with DeepSeekHarness(...) as harness` | `__enter__` 调 `start()`（懒 `Popen` + 一次 `initialize`），`__exit__` 调 `close()`。[E: python/sdk/src/deepseek_harness/api.py:87] [E: python/sdk/src/deepseek_harness/api.py:91] |
| `harness.run(input, session_id=…)` | `start_session(session_id).run(...)`。[E: python/sdk/src/deepseek_harness/api.py:124] |
| `harness.start_session(id?)` | 先 `start()`，再铸本地 `Session`。省略 id 则 `session-{uuid4.hex}`。[E: python/sdk/src/deepseek_harness/api.py:114] [E: python/sdk/src/deepseek_harness/api.py:115] 第一次 `session/prompt` 才在 **server** 侧 `getOrCreateSession` 懒创建 agent+session。[E: packages/sdk/server/src/server.ts:133] [E: packages/sdk/server/src/server.ts:203] |
| `HarnessClient(HarnessConfig(...))` | 低层：自己管 `Popen` / 三请求 / 订阅。也可当 context manager。[E: python/sdk/src/deepseek_harness/client.py:40] [E: python/sdk/src/deepseek_harness/client.py:56] |
| 默认 bundled launch | 无 `runtime_bin` / `bridge_bin` / `launch_args_override` 时 `resolve_bundled_launch_args()`，并可能注入默认 `DSH_CORDIS_CONFIG`。[E: python/sdk/src/deepseek_harness/client.py:436] [E: python/sdk/src/deepseek_harness/client.py:454] |
| `launch_args_override` / `runtime_bin` | 测试与自定义二进制入口。高层 `DeepSeekHarnessConfig` 有这两项，**没有** `bridge_bin`（那只在 `HarnessConfig`）。[E: python/sdk/src/deepseek_harness/api.py:30] [E: python/sdk/src/deepseek_harness/api.py:31] [E: python/sdk/src/deepseek_harness/client.py:29] |
| `DSH_RUNTIME_MODE` | 只被 `resolve_bundled_launch_args` 读取；`client.py` 调用时不传 `mode`。[E: python/sdk/src/deepseek_harness/client.py:436] [E: python/sdk-runtime/src/deepseek_harness_runtime/__init__.py:108] |

`dsh web` / `dsh --profile web` / `dsh --profile headless` **不会** import 本包。`@deepseek-ai/dsh-web-app` / `@deepseek-ai/dsh-headless` 声明各自的 `dsh.bundle.patch`。[E: packages/bundle/web-app/package.json:2] [E: packages/bundle/web-app/package.json:43] [E: packages/bundle/headless/package.json:2] [E: packages/bundle/headless/package.json:43] 对 `packages/bundle` 与 `apps/cli` 全文检索 `deepseek-harness-sdk` / `python/sdk` 为零命中；四个 shipped `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 也没有本包行。[I]

## 关键字段

### `DeepSeekHarnessConfig`

构造要么传一份 config，要么传关键字，不能两份一起给。[E: python/sdk/src/deepseek_harness/api.py:57] [E: python/sdk/src/deepseek_harness/api.py:58]

| 字段 | 默认 | 含义 |
|---|---|---|
| `provider` | `"deepseek-official"` | 写入 `initialize`。[E: python/sdk/src/deepseek_harness/api.py:22] |
| `model` | `"deepseek-v4-flash"` | 写入 `initialize`。[E: python/sdk/src/deepseek_harness/api.py:23] |
| `max_tokens` | `None` | 有值才往 wire 写 camelCase `maxTokens`。本客户端不校验正整数；非法值由 server 拒 `initialize maxTokens must be a positive safe integer`。[E: python/sdk/src/deepseek_harness/client.py:130] [E: python/sdk/src/deepseek_harness/client.py:131] [E: packages/sdk/server/src/server.ts:114] |
| `cwd` | `Path.cwd()` | 先 `resolve` 成绝对路径：进 `DSH_CWD`、进 `initialize.cwd`。[E: python/sdk/src/deepseek_harness/api.py:60] [E: python/sdk/src/deepseek_harness/api.py:68] [E: python/sdk/src/deepseek_harness/api.py:102] |
| `runtime_cwd` | 与 `cwd` 相同 | **子进程** `Popen(..., cwd=)`。相对值在本进程先 `resolve`，避免孩子再解析一次。[E: python/sdk/src/deepseek_harness/api.py:61] [E: python/sdk/src/deepseek_harness/client.py:80] [E: python/sdk/tests/test_client.py:233] |
| `session_root` / `cordis` | `None` | 写入孩子 env `DSH_SESSION_ROOT` / `DSH_CORDIS_CONFIG`。[E: python/sdk/src/deepseek_harness/api.py:65] [E: python/sdk/src/deepseek_harness/api.py:67] |
| `base_url` / `api_key` | `None` | 写入 `DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY`，覆盖继承来的父环境。[E: python/sdk/src/deepseek_harness/api.py:70] [E: python/sdk/src/deepseek_harness/api.py:72] |
| `env` | `{}` | 叠在 `os.environ.copy()` 上。[E: python/sdk/src/deepseek_harness/client.py:69] [E: python/sdk/src/deepseek_harness/client.py:71] |
| `request_timeout_seconds` | `None` | `None` = 无限等。到期抛内置 `TimeoutError`（没有 TS 那种 `RequestTimeoutError` 类型）。[E: python/sdk/src/deepseek_harness/client.py:258] [E: python/sdk/src/deepseek_harness/client.py:274] |
| `shutdown_timeout_seconds` | `1.0` | `shutdown` 等待与 `terminate` 后再 `kill` 共用这一档。[E: python/sdk/src/deepseek_harness/api.py:33] [E: python/sdk/src/deepseek_harness/client.py:92] [E: python/sdk/src/deepseek_harness/client.py:106] |

公开签名故意没有 `system_prompt` / `profile` / `client_name`。[E: python/sdk/tests/test_client.py:818] [E: python/sdk/tests/test_client.py:820] [E: python/sdk/tests/test_client.py:825]

### 三请求 / 四通知

| JSON-RPC | Python API | 要点 |
|---|---|---|
| `initialize` | `HarnessClient.initialize(*, cwd, provider, model, max_tokens=None)` | 方法签名是 `def initialize(`。[E: python/sdk/src/deepseek_harness/client.py:117] 参数列表里的 `*` 使调用必须关键字传入。[I] `cwd` 再 `Path.resolve`。任何 `BaseException` 先 `close()` 再抛。[E: python/sdk/src/deepseek_harness/client.py:126] [E: python/sdk/src/deepseek_harness/client.py:135] |
| `session/prompt` | `HarnessClient.session_prompt`（**不叫** `prompt`） | params `{ sessionId, contentBlocks }`，Pydantic 取 `messageId`。[E: python/sdk/src/deepseek_harness/client.py:146] [E: python/sdk/src/deepseek_harness/client.py:155] [E: python/sdk/src/deepseek_harness/client.py:549] |
| `shutdown` | `close()` 里 `request("shutdown", None)` | `params is None` 时 **省略** `params` 键（TS 客户端缺省发 `{}`）。[E: python/sdk/src/deepseek_harness/client.py:92] [E: python/sdk/src/deepseek_harness/client.py:249] |
| `session.event` | `Notification.method` | `Session.run` 只把 **根** `sessionId == self.id` 的 event 放进 `RunResult.events`。[E: python/sdk/src/deepseek_harness/api.py:147] [E: python/sdk/src/deepseek_harness/api.py:152] |
| `session.status` | `Notification.method` | 根 session `status == "idle"` 才结束 `run`。[E: python/sdk/src/deepseek_harness/api.py:170] [E: python/sdk/src/deepseek_harness/api.py:172] |
| `subagent.started` | 客户端 parent map | 写入 `_session_parents[child]=parent`；空边 / 自环不写。[E: python/sdk/src/deepseek_harness/client.py:461] [E: python/sdk/src/deepseek_harness/client.py:470] |
| `subagent.finished` | 树过滤 | 与 `subagent.started` 一样看 `parentSessionId` 是否为根的后代，或 `childSessionId == root`。[E: python/sdk/src/deepseek_harness/client.py:477] |

`models.Notification` / `IncomingRequest` 是无类型约束的 `{method, payload}`，**没有**把四条通知收成 TypedDict。[E: python/sdk/src/deepseek_harness/models.py:14] [E: python/sdk/src/deepseek_harness/models.py:20] `InitializeResponse.serverInfo` 与 `ServerInfo.name` / `version` 都可以是 `None`；本客户端不钉死 `deepseek-harness-sdk-runtime`。那个字面量由 server 写入。[E: python/sdk/src/deepseek_harness/models.py:27] [E: python/sdk/src/deepseek_harness/models.py:32] [E: packages/sdk/server/src/server.ts:124] 真 runtime 冒烟测断言 `name == "deepseek-harness-sdk-runtime"`。[E: python/sdk/tests/test_bundled_runtime.py:82]

`notify` / `next_request` / `respond` / `respond_error` 是通用 JSON-RPC 能力，**不是** `HarnessSdkRequestMap` / `HarnessSdkNotificationMap` 的键。[E: python/sdk/src/deepseek_harness/client.py:180] [E: python/sdk/src/deepseek_harness/client.py:206] [E: python/sdk/src/deepseek_harness/client.py:212] [E: python/sdk/src/deepseek_harness/client.py:215] 入站带 `id`+`method` 的帧进 `_requests` 队列。[E: python/sdk/src/deepseek_harness/client.py:348] shipped `sdk-jsonrpc-server` 对客户端只 `transport.notify` 那四条。[E: packages/sdk/server/src/server.ts:73] [I]

写出帧：`json.dumps(..., separators=(",", ":")) + "\n"`。[E: python/sdk/src/deepseek_harness/client.py:303] 非 JSON stdout 行丢弃。[E: python/sdk/src/deepseek_harness/client.py:328] stderr 最多留 400 行，拼进 `TransportClosedError`。[E: python/sdk/src/deepseek_harness/client.py:52]

### `RunResult` 与 `Session.run`

字符串输入收成 `[{"type": "text", "text": …}]`。[E: python/sdk/src/deepseek_harness/api.py:200] [E: python/sdk/src/deepseek_harness/api.py:201] `run` 先 `subscribe_session_notifications`，再 `session_prompt`，在看到本 session 上 `agent/inbox/spliced.inserted[].id == messageId` 之前丢掉通知；回执之后收集，直到根 `session.status == "idle"`。[E: python/sdk/src/deepseek_harness/api.py:154] [E: python/sdk/src/deepseek_harness/api.py:165] [E: python/sdk/src/deepseek_harness/api.py:190]

| 字段 | 含义 |
|---|---|
| `final_response` | 从后往前找最后一条根 `assistant/message`，拼接 `type=="text"` 块；没有则 `""`。[E: python/sdk/src/deepseek_harness/api.py:207] [E: python/sdk/src/deepseek_harness/api.py:222] |
| `finish_reason` | 最后一条根 `turn/end` 的 `data.reason.kind`；没有 `turn/end` 则 `None`；有 `turn/end` 但 kind 不是 `str` 则 `SdkProtocolError`。[E: python/sdk/src/deepseek_harness/api.py:234] [E: python/sdk/src/deepseek_harness/api.py:240] |
| `events` | 仅根 session 的 `session.event` payload。[E: python/sdk/src/deepseek_harness/api.py:147] 子 session 的 assistant 文本不会覆盖根 `final_response`。[E: python/sdk/tests/test_client.py:325] |
| `notifications` | 整棵已发现 session 树，按 wire 顺序。[E: python/sdk/src/deepseek_harness/api.py:143] |
| `session_root` | 回显 `DeepSeekHarnessConfig.session_root`，不是 runtime 探测值。[E: python/sdk/src/deepseek_harness/api.py:182] |

两次 `turn/end` 时 `finish_reason` 取最后一条（测试里是 `"max-tokens"`）。[E: python/sdk/tests/test_client.py:111]

## 装配与门控

**不是 Cordis 插件，不进 shipped 树。** 本库不 `apply` / 不 `inject` / 不登记 `ctx.*`。孩子进程自己的 host 树才挂 `sdk-jsonrpc-server`。bundled 默认配置是 `python/sdk-runtime/.../runtime/cordis.yml`：`id: sdk-jsonrpc-server` → `@deepseek-ai/dsh-sdk-jsonrpc-server`，再加 `agent-spine-demo`、`dsh-llm-deepseek`、JSONL + checkpoint、`subprocess-local` / `bash-local` / `fs-local`。[E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:6] [E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:7] [E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:11] [E: python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml:21] 它 **不是** shipped `minimal` / `standard` / `code` / `cordis` preset，也没有 `id: agent-presets`。

**何时注入这份 yml。** 仅当 launch 走 bundled（`launch_args_override` / `runtime_bin` / `bridge_bin` 全是 `None`）且 env 里 `DSH_CORDIS_CONFIG` 为假值（未设或 `""`）时，写入 `bundled_default_config_path()`。[E: python/sdk/src/deepseek_harness/client.py:445] [E: python/sdk/src/deepseek_harness/client.py:449] [E: python/sdk/src/deepseek_harness/client.py:454] 未设或空 `DSH_CORDIS_CONFIG` 且走 bundled 时会注入默认 yml。[E: python/sdk/tests/test_client.py:978] 高层 `cordis=` 先写入 env，`_inject_default_config` 见到已有 `DSH_CORDIS_CONFIG` 或非 bundled launch 就 return。[E: python/sdk/src/deepseek_harness/api.py:66] [E: python/sdk/src/deepseek_harness/client.py:449] 测试钉非空 `DSH_CORDIS_CONFIG` 不被覆盖。[E: python/sdk/tests/test_client.py:993]

门控（调用方会直接撞上）：

1. 缺 `deepseek-harness-runtime-bin` 且没给 `runtime_bin` / override → `FileNotFoundError`。[E: python/sdk/tests/test_client.py:1000]
2. `initialize` 失败（含 JSON-RPC error）会 `close()` 已启动的 `_proc`。[E: python/sdk/src/deepseek_harness/client.py:135] [E: python/sdk/tests/test_client.py:807]
3. 协议 **没有** `session/cancel`。超时只扔掉本侧 pending；要停就 `close()` 整棵孩子。[E: python/sdk/src/deepseek_harness/client.py:274]
4. `close()`：尽力 `shutdown` → 关 stdin → `terminate` → 等 `shutdown_timeout_seconds` → `kill`，然后 `_proc = None`。[E: python/sdk/src/deepseek_harness/client.py:92] [E: python/sdk/src/deepseek_harness/client.py:102] [E: python/sdk/src/deepseek_harness/client.py:108] [E: python/sdk/src/deepseek_harness/client.py:110] 之后 `start()` 可以再 `Popen`（`DeepSeekHarness.close` 同时把 `_initialized=False`）。[E: python/sdk/src/deepseek_harness/api.py:111] [E: python/sdk/src/deepseek_harness/client.py:64] TS `HarnessClient.close` 是终端态，不会再 spawn。
5. 订阅 filter 抛错只 fail 那一条订阅，兄弟订阅和 reader 继续。[E: python/sdk/tests/test_client.py:622]
6. parent map 挂在 **client 实例** 上，跨 `subscribe_session_notifications` 存活；`start()` 在新 `Popen` 前 `clear()`。[E: python/sdk/src/deepseek_harness/client.py:67] [E: python/sdk/tests/test_client.py:514]

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
- python/sdk/README.md
- python/sdk/src/deepseek_harness/api.py
- python/sdk/src/deepseek_harness/errors.py
- python/sdk/src/deepseek_harness/models.py
- python/sdk/pyproject.toml
- python/sdk/tests/test_client.py
- python/sdk/tests/test_bundled_runtime.py
- python/sdk-runtime/src/deepseek_harness_runtime/__init__.py
- python/sdk-runtime/src/deepseek_harness_runtime/runtime/cordis.yml
- python/sdk-runtime/pyproject.toml
- packages/sdk/protocol/src/types.ts
- packages/sdk/client/src/client.ts
- packages/sdk/server/src/server.ts
- packages/boot/app-boot/src/profile.ts
- packages/bundle/web-app/package.json
- packages/bundle/headless/package.json

## 相关

- [surface.sdk.typescript](typescript.md)（`surface.sdk.typescript`）：同协议的 TS SDK 可见面。
- [surface.acp.server](../acp/server.md)（`surface.acp.server`）：ACP JSON-RPC server，方法表不同。
- [subsys.integration.sdk-protocol](../../subsystems/integration/sdk-protocol.md)（`subsys.integration.sdk-protocol`）：三请求 / 四通知合同。
