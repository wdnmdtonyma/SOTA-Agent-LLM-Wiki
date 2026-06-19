---
id: sdk.py-overview
title: Python SDK 总览
kind: sdk
tier: T1
source: [sdk/python/src/openai_codex/api.py, sdk/python/src/openai_codex/client.py, sdk/python/src/openai_codex/async_client.py, sdk/python/src/openai_codex/_run.py, sdk/python/src/openai_codex/__init__.py, sdk/python/pyproject.toml, sdk/python/src/openai_codex/_approval_mode.py, sdk/python/src/openai_codex/_sandbox.py, sdk/python/src/openai_codex/_initialize_metadata.py]
symbols: [Codex, AsyncCodex, Thread, AsyncThread, TurnHandle, AsyncTurnHandle, CodexClient, AsyncCodexClient, CodexConfig, TurnResult, ApprovalMode, Sandbox]
related: [sdk.py-inputs-errors, sdk.sdk-architecture, rpc.overview, rpc.thread-methods, rpc.turn-methods]
evidence: explicit
status: verified
updated: 5670360009
---

> Python SDK package is now `openai_codex`: the high-level `Codex` / `AsyncCodex` APIs wrap a typed app-server JSON-RPC client (`CodexClient` / `AsyncCodexClient`) that starts `codex app-server --listen stdio://`, initializes metadata, exposes account/thread/turn helpers, and collects turn notifications into `TurnResult`.[E: sdk/python/pyproject.toml:6][E: sdk/python/src/openai_codex/api.py:75][E: sdk/python/src/openai_codex/api.py:82][E: sdk/python/src/openai_codex/client.py:212][E: sdk/python/src/openai_codex/client.py:238][E: sdk/python/src/openai_codex/client.py:252][E: sdk/python/src/openai_codex/async_client.py:52][E: sdk/python/src/openai_codex/_run.py:21]

## 能回答的问题

- Python SDK 当前包名、runtime dependency 和 public exports 是什么？
- `Codex` / `AsyncCodex` 如何启动、initialize 和关闭 app-server？
- `CodexClient` 如何发送 JSON-RPC、路由 responses / notifications / server requests？
- thread / turn / login / account / model helpers 覆盖哪些 public 操作？
- `TurnResult` 如何从 turn-scoped notifications 中收集 final response、items 和 usage？

## Package 与 exports

`pyproject.toml` 声明 package name 是 `openai-codex`，版本是 `0.0.0-dev`，runtime dependency 包含 `pydantic>=2.12` 和 pinned `openai-codex-cli-bin==0.137.0a4`。[E: sdk/python/pyproject.toml:5][E: sdk/python/pyproject.toml:6][E: sdk/python/pyproject.toml:7][E: sdk/python/pyproject.toml:19]

`openai_codex.__init__` 的 public surface re-export `Codex`、`AsyncCodex`、thread/turn handle、`TurnResult`、input types、`CodexConfig`、approval/sandbox enums、login handles、retry helper 和 typed error classes；it does not re-export generated app-server v2 aliases as public names.[E: sdk/python/src/openai_codex/__init__.py:15][E: sdk/python/src/openai_codex/__init__.py:16][E: sdk/python/src/openai_codex/__init__.py:19][E: sdk/python/src/openai_codex/__init__.py:24][E: sdk/python/src/openai_codex/__init__.py:32][E: sdk/python/src/openai_codex/__init__.py:37][E: sdk/python/src/openai_codex/__init__.py:39][E: sdk/python/src/openai_codex/__init__.py:40][E: sdk/python/src/openai_codex/__init__.py:54][E: sdk/python/src/openai_codex/__init__.py:56][E: sdk/python/src/openai_codex/__init__.py:59][E: sdk/python/src/openai_codex/__init__.py:80][E: sdk/python/src/openai_codex/__init__.py:91]

## Client lifecycle

`Codex` constructor creates `CodexClient`, calls `start()`, calls `initialize()`, validates initialize metadata, and closes the client before re-raising initialization failures.[E: sdk/python/src/openai_codex/api.py:75][E: sdk/python/src/openai_codex/api.py:82][E: sdk/python/src/openai_codex/api.py:83][E: sdk/python/src/openai_codex/api.py:85][E: sdk/python/src/openai_codex/api.py:86][E: sdk/python/src/openai_codex/api.py:88][E: sdk/python/src/openai_codex/api.py:101][E: sdk/python/src/openai_codex/api.py:102]

`CodexConfig` fields are `codex_bin`, `launch_args_override`, `config_overrides`, `cwd`, `env`, `client_name`, `client_title`, `client_version`, and `experimental_api`; default binary resolution uses the pinned `openai-codex-cli-bin` package unless `codex_bin` or `launch_args_override` overrides it.[E: sdk/python/src/openai_codex/client.py:67][E: sdk/python/src/openai_codex/client.py:111][E: sdk/python/src/openai_codex/client.py:113][E: sdk/python/src/openai_codex/client.py:121][E: sdk/python/src/openai_codex/client.py:176][E: sdk/python/src/openai_codex/client.py:193][E: sdk/python/src/openai_codex/client.py:201][E: sdk/python/src/openai_codex/client.py:202][E: sdk/python/src/openai_codex/client.py:209]

`CodexClient.start()` builds `[codex_bin, --config ..., app-server, --listen, stdio://]` when no launch override is provided, merges caller env/cwd, prepends bundled path dirs, opens text stdin/stdout/stderr pipes, and starts one stderr drain thread plus one stdout reader thread.[E: sdk/python/src/openai_codex/client.py:238][E: sdk/python/src/openai_codex/client.py:242][E: sdk/python/src/openai_codex/client.py:246][E: sdk/python/src/openai_codex/client.py:250][E: sdk/python/src/openai_codex/client.py:252][E: sdk/python/src/openai_codex/client.py:254][E: sdk/python/src/openai_codex/client.py:257][E: sdk/python/src/openai_codex/client.py:259][E: sdk/python/src/openai_codex/client.py:264][E: sdk/python/src/openai_codex/client.py:266][E: sdk/python/src/openai_codex/client.py:271][E: sdk/python/src/openai_codex/client.py:272]

`initialize()` sends the `initialize` request with clientInfo and `experimentalApi` capability, then sends the `initialized` notification; metadata validation fills missing `serverInfo` from `userAgent` when possible and errors if user agent, server name, or server version are missing.[E: sdk/python/src/openai_codex/client.py:293][E: sdk/python/src/openai_codex/client.py:295][E: sdk/python/src/openai_codex/client.py:297][E: sdk/python/src/openai_codex/client.py:302][E: sdk/python/src/openai_codex/client.py:308][E: sdk/python/src/openai_codex/client.py:309][E: sdk/python/src/openai_codex/_initialize_metadata.py:19][E: sdk/python/src/openai_codex/_initialize_metadata.py:30][E: sdk/python/src/openai_codex/_initialize_metadata.py:39][E: sdk/python/src/openai_codex/_initialize_metadata.py:45]

## Public sync surface

`Codex` exposes account helpers for API-key login, browser ChatGPT login, device-code ChatGPT login, account read, and logout.[E: sdk/python/src/openai_codex/api.py:104][E: sdk/python/src/openai_codex/api.py:106][E: sdk/python/src/openai_codex/api.py:115][E: sdk/python/src/openai_codex/api.py:119][E: sdk/python/src/openai_codex/api.py:123][E: sdk/python/src/openai_codex/api.py:127]

Generated flat methods on `Codex` wrap thread lifecycle: `thread_start`, `thread_list`, `thread_resume`, `thread_fork`, `thread_archive`, and `thread_unarchive`; `models()` is an adjacent public helper. start/resume/fork map public `ApprovalMode` and `Sandbox` to generated app-server params.[E: sdk/python/src/openai_codex/api.py:132][E: sdk/python/src/openai_codex/api.py:151][E: sdk/python/src/openai_codex/api.py:163][E: sdk/python/src/openai_codex/api.py:169][E: sdk/python/src/openai_codex/api.py:172][E: sdk/python/src/openai_codex/api.py:201][E: sdk/python/src/openai_codex/api.py:217][E: sdk/python/src/openai_codex/api.py:229][E: sdk/python/src/openai_codex/api.py:235][E: sdk/python/src/openai_codex/api.py:252][E: sdk/python/src/openai_codex/api.py:264][E: sdk/python/src/openai_codex/api.py:271][E: sdk/python/src/openai_codex/api.py:275][E: sdk/python/src/openai_codex/api.py:282]

`Thread.run()` starts a turn via `Thread.turn()`, consumes the returned `TurnHandle.stream()`, and closes the generator; `Thread.turn()` normalizes public input to wire input, constructs `TurnStartParams`, calls `CodexClient.turn_start`, and returns `TurnHandle`.[E: sdk/python/src/openai_codex/api.py:533][E: sdk/python/src/openai_codex/api.py:540][E: sdk/python/src/openai_codex/api.py:567][E: sdk/python/src/openai_codex/api.py:569][E: sdk/python/src/openai_codex/api.py:574][E: sdk/python/src/openai_codex/api.py:589][E: sdk/python/src/openai_codex/api.py:591][E: sdk/python/src/openai_codex/api.py:599][E: sdk/python/src/openai_codex/api.py:601][E: sdk/python/src/openai_codex/api.py:605][E: sdk/python/src/openai_codex/api.py:606]

`TurnHandle` exposes `steer()`, `interrupt()`, `stream()`, and `run()`; `stream()` registers turn notification routing, yields notifications until the matching `turn/completed`, and unregisters routing in finally.[E: sdk/python/src/openai_codex/api.py:717][E: sdk/python/src/openai_codex/api.py:725][E: sdk/python/src/openai_codex/api.py:733][E: sdk/python/src/openai_codex/api.py:737][E: sdk/python/src/openai_codex/api.py:739][E: sdk/python/src/openai_codex/api.py:742][E: sdk/python/src/openai_codex/api.py:745][E: sdk/python/src/openai_codex/api.py:747][E: sdk/python/src/openai_codex/api.py:751][E: sdk/python/src/openai_codex/api.py:753]

## Async surface

`AsyncCodex` wraps `AsyncCodexClient`, initializes lazily on context entry or first awaited API use, protects initialization with `asyncio.Lock`, and mirrors login/account/thread/model helpers after `_ensure_initialized()`.[E: sdk/python/src/openai_codex/api.py:287][E: sdk/python/src/openai_codex/api.py:295][E: sdk/python/src/openai_codex/api.py:296][E: sdk/python/src/openai_codex/api.py:299][E: sdk/python/src/openai_codex/api.py:301][E: sdk/python/src/openai_codex/api.py:308][E: sdk/python/src/openai_codex/api.py:311][E: sdk/python/src/openai_codex/api.py:315][E: sdk/python/src/openai_codex/api.py:317][E: sdk/python/src/openai_codex/api.py:339][E: sdk/python/src/openai_codex/api.py:371][E: sdk/python/src/openai_codex/api.py:391]

`AsyncCodexClient` is a thin async wrapper around `CodexClient`: it owns one sync client and calls blocking sync operations through `asyncio.to_thread()`.[E: sdk/python/src/openai_codex/async_client.py:52][E: sdk/python/src/openai_codex/async_client.py:55][E: sdk/python/src/openai_codex/async_client.py:57][E: sdk/python/src/openai_codex/async_client.py:68][E: sdk/python/src/openai_codex/async_client.py:75][E: sdk/python/src/openai_codex/async_client.py:76][E: sdk/python/src/openai_codex/async_client.py:88][E: sdk/python/src/openai_codex/async_client.py:96]

`AsyncThread` mirrors sync turn/run/read/name/compact methods and returns `AsyncTurnHandle`; async turn streaming registers the same turn route, awaits `next_turn_notification`, and stops on matching `turn/completed`.[E: sdk/python/src/openai_codex/api.py:621][E: sdk/python/src/openai_codex/api.py:628][E: sdk/python/src/openai_codex/api.py:657][E: sdk/python/src/openai_codex/api.py:662][E: sdk/python/src/openai_codex/api.py:675][E: sdk/python/src/openai_codex/api.py:694][E: sdk/python/src/openai_codex/api.py:703][E: sdk/python/src/openai_codex/api.py:762][E: sdk/python/src/openai_codex/api.py:784][E: sdk/python/src/openai_codex/api.py:787][E: sdk/python/src/openai_codex/api.py:790][E: sdk/python/src/openai_codex/api.py:793][E: sdk/python/src/openai_codex/api.py:799]

## Result collection

`TurnResult` records id, status, error, start/completion timestamps, duration, final_response, completed items, and token usage.[E: sdk/python/src/openai_codex/_run.py:21][E: sdk/python/src/openai_codex/_run.py:25][E: sdk/python/src/openai_codex/_run.py:26][E: sdk/python/src/openai_codex/_run.py:27][E: sdk/python/src/openai_codex/_run.py:28][E: sdk/python/src/openai_codex/_run.py:31][E: sdk/python/src/openai_codex/_run.py:32][E: sdk/python/src/openai_codex/_run.py:33]

The sync and async collectors gather matching `ItemCompletedNotification`, `ThreadTokenUsageUpdatedNotification`, and `TurnCompletedNotification`; missing completion raises, failed turns raise the server turn error message when present, and final response is the latest final-answer agent message or the last unknown-phase agent message.[E: sdk/python/src/openai_codex/_run.py:45][E: sdk/python/src/openai_codex/_run.py:48][E: sdk/python/src/openai_codex/_run.py:52][E: sdk/python/src/openai_codex/_run.py:54][E: sdk/python/src/openai_codex/_run.py:60][E: sdk/python/src/openai_codex/_run.py:63][E: sdk/python/src/openai_codex/_run.py:68][E: sdk/python/src/openai_codex/_run.py:75][E: sdk/python/src/openai_codex/_run.py:78][E: sdk/python/src/openai_codex/_run.py:81][E: sdk/python/src/openai_codex/_run.py:84][E: sdk/python/src/openai_codex/_run.py:87][E: sdk/python/src/openai_codex/_run.py:96][E: sdk/python/src/openai_codex/_run.py:102][E: sdk/python/src/openai_codex/_run.py:111][E: sdk/python/src/openai_codex/_run.py:114][E: sdk/python/src/openai_codex/_run.py:117][E: sdk/python/src/openai_codex/_run.py:132]

## Approval and sandbox presets

`ApprovalMode` exposes `deny_all` and `auto_review`; `auto_review` maps to `AskForApprovalValue.on_request` plus `ApprovalsReviewer.auto_review`, while `deny_all` maps to `AskForApprovalValue.never` and no reviewer.[E: sdk/python/src/openai_codex/_approval_mode.py:13][E: sdk/python/src/openai_codex/_approval_mode.py:16][E: sdk/python/src/openai_codex/_approval_mode.py:17][E: sdk/python/src/openai_codex/_approval_mode.py:20][E: sdk/python/src/openai_codex/_approval_mode.py:28][E: sdk/python/src/openai_codex/_approval_mode.py:31][E: sdk/python/src/openai_codex/_approval_mode.py:32][E: sdk/python/src/openai_codex/_approval_mode.py:34][E: sdk/python/src/openai_codex/_approval_mode.py:35]

`Sandbox` exposes `read_only`, `workspace_write`, and `full_access`; thread lifecycle uses `_sandbox_mode`, while per-turn overrides use `_sandbox_policy` with generated readOnly/workspaceWrite/dangerFullAccess policy roots.[E: sdk/python/src/openai_codex/_sandbox.py:15][E: sdk/python/src/openai_codex/_sandbox.py:24][E: sdk/python/src/openai_codex/_sandbox.py:25][E: sdk/python/src/openai_codex/_sandbox.py:26][E: sdk/python/src/openai_codex/_sandbox.py:36][E: sdk/python/src/openai_codex/_sandbox.py:43][E: sdk/python/src/openai_codex/_sandbox.py:46][E: sdk/python/src/openai_codex/_sandbox.py:48][E: sdk/python/src/openai_codex/_sandbox.py:53][E: sdk/python/src/openai_codex/_sandbox.py:61][E: sdk/python/src/openai_codex/_sandbox.py:65][E: sdk/python/src/openai_codex/_sandbox.py:69]

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

## 相关

- `sdk.py-inputs-errors` -> [Python inputs/errors](py-inputs-errors.md)
- `sdk.sdk-architecture` -> [SDK 架构对照](sdk-architecture.md)
