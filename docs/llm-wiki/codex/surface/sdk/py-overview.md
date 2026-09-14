---
id: sdk.py-overview
title: Python SDK 总览
kind: sdk
tier: T1
source: [sdk/python/src/openai_codex/api.py, sdk/python/src/openai_codex/client.py, sdk/python/src/openai_codex/async_client.py, sdk/python/src/openai_codex/_run.py, sdk/python/src/openai_codex/__init__.py, sdk/python/pyproject.toml, sdk/python/src/openai_codex/_approval_mode.py, sdk/python/src/openai_codex/_sandbox.py, sdk/python/src/openai_codex/_initialize_metadata.py, sdk/python/src/openai_codex/generated/v2_all.py, sdk/python/scripts/update_sdk_artifacts.py, sdk/python/tests/test_client_rpc_methods.py]
symbols: [python::Codex, AsyncCodex, python::Thread, AsyncThread, TurnHandle, AsyncTurnHandle, CodexClient, AsyncCodexClient, CodexConfig, TurnResult, ApprovalMode, Sandbox, python::PlanType]
related: [sdk.py-inputs-errors, sdk.sdk-architecture, rpc.overview, rpc.thread-methods, rpc.turn-methods]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> Python SDK package is now `openai_codex`: the high-level `Codex` / `AsyncCodex` APIs wrap a typed app-server JSON-RPC client (`CodexClient` / `AsyncCodexClient`) that starts `codex app-server --listen stdio://`, initializes metadata, exposes account/thread/turn helpers, and collects turn notifications into `TurnResult`.[E: sdk/python/pyproject.toml:6][E: sdk/python/src/openai_codex/api.py:88][E: sdk/python/src/openai_codex/api.py:91][E: sdk/python/src/openai_codex/client.py:214][E: sdk/python/src/openai_codex/client.py:246][E: sdk/python/src/openai_codex/client.py:256][E: sdk/python/src/openai_codex/async_client.py:62][E: sdk/python/src/openai_codex/_run.py:22]

## 能回答的问题

- Python SDK 当前包名、runtime dependency 和 public exports 是什么？
- `Codex` / `AsyncCodex` 如何启动、initialize 和关闭 app-server？
- `CodexClient` 如何发送 JSON-RPC、路由 responses / notifications / server requests？
- thread / turn / login / account / model helpers 覆盖哪些 public 操作？
- `TurnResult` 如何从 turn-scoped notifications 中收集 final response、items 和 usage？

## Package 与 exports

`pyproject.toml` 声明 package name 是 `openai-codex`，版本是 `0.0.0-dev`，classifier 已标记 Production/Stable，runtime dependency 包含 `pydantic>=2.12`、`packaging>=26.2` 和 pinned `openai-codex-cli-bin==0.153.4`。[E: sdk/python/pyproject.toml:5][E: sdk/python/pyproject.toml:6][E: sdk/python/pyproject.toml:15][E: sdk/python/pyproject.toml:19]

`openai_codex.__init__` 的 public surface re-export `Codex`、`AsyncCodex`、thread/turn handle、`TurnResult`、input types、`CodexConfig`、approval/sandbox enums、login handles、retry helper 和 typed error classes；it does not re-export generated app-server v2 aliases as public names.[E: sdk/python/src/openai_codex/__init__.py:15][E: sdk/python/src/openai_codex/__init__.py:16][E: sdk/python/src/openai_codex/__init__.py:19][E: sdk/python/src/openai_codex/__init__.py:24][E: sdk/python/src/openai_codex/__init__.py:33][E: sdk/python/src/openai_codex/__init__.py:38][E: sdk/python/src/openai_codex/__init__.py:38][E: sdk/python/src/openai_codex/__init__.py:41][E: sdk/python/src/openai_codex/__init__.py:53][E: sdk/python/src/openai_codex/__init__.py:55][E: sdk/python/src/openai_codex/__init__.py:60][E: sdk/python/src/openai_codex/__init__.py:82][E: sdk/python/src/openai_codex/__init__.py:93]

## Client lifecycle

`Codex` constructor creates `CodexClient`, calls `start()`, calls `initialize()`, validates initialize metadata, and closes the client before re-raising initialization failures.[E: sdk/python/src/openai_codex/api.py:85][E: sdk/python/src/openai_codex/api.py:89][E: sdk/python/src/openai_codex/api.py:88][E: sdk/python/src/openai_codex/api.py:89][E: sdk/python/src/openai_codex/api.py:90][E: sdk/python/src/openai_codex/api.py:91]

`CodexConfig` fields are `codex_bin`, `launch_args_override`, `config_overrides`, `cwd`, `env`, `client_name`, `client_title`, `client_version`, and `experimental_api`; default binary resolution uses the pinned `openai-codex-cli-bin` package unless `codex_bin` or `launch_args_override` overrides it.[E: sdk/python/src/openai_codex/client.py:203][E: sdk/python/src/openai_codex/client.py:204][E: sdk/python/src/openai_codex/client.py:211][E: sdk/python/src/openai_codex/client.py:113][E: sdk/python/src/openai_codex/client.py:178][E: sdk/python/src/openai_codex/client.py:247]

`CodexClient.start()` builds `[codex_bin, --config ..., app-server, --listen, stdio://]` when no launch override is provided, merges caller env/cwd, prepends bundled path dirs, opens text stdin/stdout/stderr pipes, and starts one stderr drain thread plus one stdout reader thread.[E: sdk/python/src/openai_codex/client.py:242][E: sdk/python/src/openai_codex/client.py:247][E: sdk/python/src/openai_codex/client.py:254][E: sdk/python/src/openai_codex/client.py:256][E: sdk/python/src/openai_codex/client.py:258][E: sdk/python/src/openai_codex/client.py:261][E: sdk/python/src/openai_codex/client.py:268][E: sdk/python/src/openai_codex/client.py:280][E: sdk/python/src/openai_codex/client.py:281]

`initialize()` sends the `initialize` request with clientInfo and `experimentalApi` capability, then sends the `initialized` notification; it also records `serverInfo.version` for later runtime-capability checks. Metadata validation fills missing `serverInfo` from `userAgent` when possible and errors if user agent, server name, or server version are missing.[E: sdk/python/src/openai_codex/client.py:304][E: sdk/python/src/openai_codex/client.py:314][E: sdk/python/src/openai_codex/client.py:320][E: sdk/python/src/openai_codex/client.py:323][E: sdk/python/src/openai_codex/client.py:324][E: sdk/python/src/openai_codex/_initialize_metadata.py:19][E: sdk/python/src/openai_codex/_initialize_metadata.py:30][E: sdk/python/src/openai_codex/_initialize_metadata.py:39][E: sdk/python/src/openai_codex/_initialize_metadata.py:45]

## Public sync surface

`Codex` exposes account helpers for API-key login, browser ChatGPT login, device-code ChatGPT login, account read, and logout.[E: sdk/python/src/openai_codex/api.py:107][E: sdk/python/src/openai_codex/api.py:118][E: sdk/python/src/openai_codex/api.py:122][E: sdk/python/src/openai_codex/api.py:126][E: sdk/python/src/openai_codex/api.py:130]

Generated flat methods on `Codex` wrap thread lifecycle: `thread_start`, `thread_list`, `thread_resume`, `thread_fork`, `thread_archive`, and `thread_unarchive`; `models()` is an adjacent public helper. start/resume/fork map public `ApprovalMode` and `Sandbox` to generated app-server params. These helpers do not wrap `thread/attachment/*` or `memory/status`.[E: sdk/python/src/openai_codex/api.py:135][E: sdk/python/src/openai_codex/api.py:175][E: sdk/python/src/openai_codex/api.py:206][E: sdk/python/src/openai_codex/api.py:246][E: sdk/python/src/openai_codex/api.py:288][E: sdk/python/src/openai_codex/api.py:292][E: sdk/python/src/openai_codex/api.py:299]

`Thread.run()` starts a turn via `Thread.turn()`, consumes the returned `TurnHandle.stream()`, and closes the generator; `Thread.turn()` normalizes public input to wire input, constructs `TurnStartParams`, calls `CodexClient._start_turn(..., for_handle=True)`, and returns `TurnHandle` with the attached subscription.[E: sdk/python/src/openai_codex/api.py:572][E: sdk/python/src/openai_codex/api.py:593][E: sdk/python/src/openai_codex/api.py:609][E: sdk/python/src/openai_codex/api.py:635][E: sdk/python/src/openai_codex/api.py:652][E: sdk/python/src/openai_codex/api.py:655]

`TurnHandle` exposes `steer()`, `interrupt()`, `stream()`, and `run()`; `stream()` reads the subscription attached at `turn/start` and yields until the matching `turn/completed`, then closes the subscription in finally. A handle constructed without a subscription falls back to `_subscribe_turn_notifications`.[E: sdk/python/src/openai_codex/api.py:801][E: sdk/python/src/openai_codex/api.py:809][E: sdk/python/src/openai_codex/api.py:813][E: sdk/python/src/openai_codex/api.py:817][E: sdk/python/src/openai_codex/api.py:820][E: sdk/python/src/openai_codex/api.py:826][E: sdk/python/src/openai_codex/api.py:793][E: sdk/python/src/openai_codex/client.py:677]

## Async surface

`AsyncCodex` wraps `AsyncCodexClient`, initializes lazily on context entry or first awaited API use, protects initialization with `asyncio.Lock`, and mirrors login/account/thread/model helpers after `_ensure_initialized()`.[E: sdk/python/src/openai_codex/api.py:312][E: sdk/python/src/openai_codex/api.py:318][E: sdk/python/src/openai_codex/api.py:325][E: sdk/python/src/openai_codex/api.py:328][E: sdk/python/src/openai_codex/api.py:356][E: sdk/python/src/openai_codex/api.py:389][E: sdk/python/src/openai_codex/api.py:559]

`AsyncCodexClient` is a thin async wrapper around `CodexClient`: it owns one sync client and calls blocking sync operations through `asyncio.to_thread()`. `_start_turn` uses a dedicated executor so a cancelled waiter can still close the attached subscription.[E: sdk/python/src/openai_codex/async_client.py:57][E: sdk/python/src/openai_codex/async_client.py:60][E: sdk/python/src/openai_codex/async_client.py:73][E: sdk/python/src/openai_codex/async_client.py:81][E: sdk/python/src/openai_codex/async_client.py:301][E: sdk/python/src/openai_codex/async_client.py:323]

`AsyncThread` mirrors sync turn/run/read/name/compact methods and returns `AsyncTurnHandle`; async turn start also attaches the subscription at `_start_turn`, and `stream()` awaits `_subscription.next` until matching `turn/completed`.[E: sdk/python/src/openai_codex/api.py:678][E: sdk/python/src/openai_codex/api.py:715][E: sdk/python/src/openai_codex/api.py:759][E: sdk/python/src/openai_codex/api.py:837][E: sdk/python/src/openai_codex/api.py:771][E: sdk/python/src/openai_codex/api.py:775][E: sdk/python/src/openai_codex/api.py:870][E: sdk/python/src/openai_codex/api.py:875][E: sdk/python/src/openai_codex/api.py:878]

## Result collection

`TurnResult` records id, status, error, start/completion timestamps, duration, final_response, completed items, and token usage.[E: sdk/python/src/openai_codex/_run.py:22][E: sdk/python/src/openai_codex/_run.py:25][E: sdk/python/src/openai_codex/_run.py:26][E: sdk/python/src/openai_codex/_run.py:27][E: sdk/python/src/openai_codex/_run.py:28][E: sdk/python/src/openai_codex/_run.py:31][E: sdk/python/src/openai_codex/_run.py:32][E: sdk/python/src/openai_codex/_run.py:33]

The sync and async collectors gather matching `ItemCompletedNotification`, `ThreadTokenUsageUpdatedNotification`, and `TurnCompletedNotification`; missing completion raises, failed turns raise the server turn error message when present, and final response is the latest final-answer agent message or the last unknown-phase agent message.[E: sdk/python/src/openai_codex/_run.py:45][E: sdk/python/src/openai_codex/_run.py:52][E: sdk/python/src/openai_codex/_run.py:60][E: sdk/python/src/openai_codex/_run.py:68][E: sdk/python/src/openai_codex/_run.py:75][E: sdk/python/src/openai_codex/_run.py:81][E: sdk/python/src/openai_codex/_run.py:84][E: sdk/python/src/openai_codex/_run.py:87][E: sdk/python/src/openai_codex/_run.py:102][E: sdk/python/src/openai_codex/_run.py:111][E: sdk/python/src/openai_codex/_run.py:117][E: sdk/python/src/openai_codex/_run.py:132]

## Approval and sandbox presets

`ApprovalMode` exposes `deny_all` and `auto_review`; `auto_review` maps to `AskForApprovalValue.on_request` plus `ApprovalsReviewer.auto_review`, while `deny_all` maps to `AskForApprovalValue.never` and no reviewer.[E: sdk/python/src/openai_codex/_approval_mode.py:13][E: sdk/python/src/openai_codex/_approval_mode.py:16][E: sdk/python/src/openai_codex/_approval_mode.py:17][E: sdk/python/src/openai_codex/_approval_mode.py:20][E: sdk/python/src/openai_codex/_approval_mode.py:28][E: sdk/python/src/openai_codex/_approval_mode.py:31][E: sdk/python/src/openai_codex/_approval_mode.py:32][E: sdk/python/src/openai_codex/_approval_mode.py:34][E: sdk/python/src/openai_codex/_approval_mode.py:35]

`Sandbox` exposes `read_only`, `workspace_write`, and `full_access`; thread lifecycle uses `_sandbox_mode`, while per-turn overrides use `_sandbox_policy` with generated readOnly/workspaceWrite/dangerFullAccess policy roots.[E: sdk/python/src/openai_codex/_sandbox.py:15][E: sdk/python/src/openai_codex/_sandbox.py:24][E: sdk/python/src/openai_codex/_sandbox.py:25][E: sdk/python/src/openai_codex/_sandbox.py:26][E: sdk/python/src/openai_codex/_sandbox.py:36][E: sdk/python/src/openai_codex/_sandbox.py:43][E: sdk/python/src/openai_codex/_sandbox.py:46][E: sdk/python/src/openai_codex/_sandbox.py:48][E: sdk/python/src/openai_codex/_sandbox.py:53][E: sdk/python/src/openai_codex/_sandbox.py:61][E: sdk/python/src/openai_codex/_sandbox.py:65][E: sdk/python/src/openai_codex/_sandbox.py:69]

## Generated protocol compatibility

Python generator 会把 generated `PlanType` 固定改写为 `str, Enum`，并通过 `_missing_` 为任意非空、尚未知的 runtime plan string 创建动态 enum member。这样使用较新 `codex_bin` 时，account payload 的新 plan value 仍保持 typed，而不是因 SDK catalog 滞后而 validation 失败。[E: sdk/python/scripts/update_sdk_artifacts.py:657][E: sdk/python/scripts/update_sdk_artifacts.py:670][E: sdk/python/scripts/update_sdk_artifacts.py:676][E: sdk/python/src/openai_codex/generated/v2_all.py:3046][E: sdk/python/src/openai_codex/generated/v2_all.py:3065]

这是 generated protocol 的前向兼容修复，不是高层 `Codex`/`Thread` API 新增。`self_serve_business_prolite` 现已是静态 enum member；回归仍用该值做 account payload round-trip，未知非空 string 继续走 `_missing_`。[E: sdk/python/src/openai_codex/generated/v2_all.py:3053][E: sdk/python/src/openai_codex/generated/v2_all.py:3066][E: sdk/python/tests/test_client_rpc_methods.py:235][E: sdk/python/tests/test_client_rpc_methods.py:237][E: sdk/python/tests/test_client_rpc_methods.py:257]

## 设计动机

Python SDK keeps the rich app-server protocol path, not the TypeScript `codex exec` path, so it can expose login/account/thread/turn control and routed notifications through typed generated models.[I] The async layer deliberately reuses the sync stdio transport through thread offloading, keeping one message router and one stdout reader as the single source of transport ordering.[I]

## Sources

- `sdk/python/src/openai_codex/api.py`
- `sdk/python/src/openai_codex/client.py`
- `sdk/python/src/openai_codex/async_client.py`
- `sdk/python/src/openai_codex/_run.py`
- `sdk/python/src/openai_codex/__init__.py`
- `sdk/python/pyproject.toml`
- `sdk/python/src/openai_codex/_approval_mode.py`
- `sdk/python/src/openai_codex/_sandbox.py`
- `sdk/python/src/openai_codex/_initialize_metadata.py`
- `sdk/python/src/openai_codex/generated/v2_all.py`
- `sdk/python/scripts/update_sdk_artifacts.py`
- `sdk/python/tests/test_client_rpc_methods.py`

## 相关

- `sdk.py-inputs-errors` -> [Python inputs/errors](py-inputs-errors.md)
- `sdk.sdk-architecture` -> [SDK 架构对照](sdk-architecture.md)
