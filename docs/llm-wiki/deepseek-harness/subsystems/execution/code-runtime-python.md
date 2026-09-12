---
id: subsys.execution.code-runtime-python
title: Python code-runtime provider（experimental）
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/experimental/code-runtime-python/src/index.ts
  - packages/experimental/code-runtime-python/src/protocol.ts
  - packages/experimental/code-runtime-python/py/protocol.py
  - packages/experimental/code-runtime-python/package.json
  - packages/experimental/code-runtime-python/tests/protocol.spec.ts
  - packages/experimental/code-runtime-python/tests/protocol-mirror.e2e.ts
  - packages/code-runtime/code-runtime/src/index.ts
  - packages/core/tools/src/ptc.ts
  - packages/core/tools/src/py-types.ts
  - packages/core/tools/src/index.ts
symbols:
  - PythonCodeRuntime
  - PROTOCOL_FD
  - validateChildFrame
  - encodeJsonPlain
  - checkDoneValue
related:
  - subsys.execution.code-runtime
  - subsys.core.code-mode
  - surface.tools.run-code
  - spine.capability-seams
  - spine.trace-code-mode
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-experimental-code-runtime-python` 是 **真正的 `CodeRuntime` Provider**：`PythonCodeRuntime extends CodeRuntime`，每次 `run()` spawn 新鲜 `python3`，控制面走 **fd-3 JSON-lines**。包在 `packages/experimental/code-runtime-python`。它**不是** shipped `id: code-runtime` 行；默认仍是 worker-thread。旧说法「只 re-export protocol、不占缝」已过时。

## 能回答的问题

- 本包还在 `packages/code-runtime/code-runtime-python` 吗？npm 名是什么？
- `PythonCodeRuntime` 会不会 `extends CodeRuntime`？`language` / `isolation` 报什么？
- spawn 参数是什么？`PROTOCOL_FD` 为什么必须钉 3？
- shipped web / headless 会不会把本包插成 `id: code-runtime`？
- Windows 上能不能 register？

## 职责边界

本页覆盖 **experimental CPython Provider + 它拥有的 fd-3 协议**。`ctx.codeRuntime` 合同、`RESERVED_*`、默认 `WorkerThreadCodeRuntime` 的权威在 [subsys.execution.code-runtime](code-runtime.md)。PTC `run_code` 桥在 [subsys.core.code-mode](../core/code-mode.md)。

本包拥有：`PythonCodeRuntime`、`py/bootstrap.py`、host/Python 协议镜像。

明确不拥有：shipped bundle 行；`createRunCodeTool` 字段表。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/experimental/code-runtime-python/src/index.ts` | `PythonCodeRuntime`、spawn、预算 Config |
| `packages/experimental/code-runtime-python/src/protocol.ts` | `PROTOCOL_FD`、帧校验 |
| `packages/experimental/code-runtime-python/py/protocol.py` | 子进程 `PROTOCOL_FD = 3` |
| `packages/experimental/code-runtime-python/package.json` | `@deepseek-ai/dsh-experimental-code-runtime-python` |

## 数据模型

| 符号 | 要点 |
|---|---|
| npm | `@deepseek-ai/dsh-experimental-code-runtime-python`。 [E: packages/experimental/code-runtime-python/package.json:2] |
| `PythonCodeRuntime` | `extends CodeRuntime`。 [E: packages/experimental/code-runtime-python/src/index.ts:805] |
| `language` / `isolation` | `'python'` / `'process'`。 [E: packages/experimental/code-runtime-python/src/index.ts:816] [E: packages/experimental/code-runtime-python/src/index.ts:817] |
| Config 默认 | `cpuSeconds: 60`、`maxWallMs: 600_000`、`addressSpaceMb: 512`、`pythonBin: 'python3'`。 [E: packages/experimental/code-runtime-python/src/index.ts:807] [E: packages/experimental/code-runtime-python/src/index.ts:813] |
| `PROTOCOL_FD` | `3`（host `stdio` 第四根 pipe）。 [E: packages/experimental/code-runtime-python/src/protocol.ts:18] [E: packages/experimental/code-runtime-python/py/protocol.py:22] |
| `BootMessage` / `RunMessage` | host 先 `boot` 再 `run`。 [E: packages/experimental/code-runtime-python/src/protocol.ts:46] [E: packages/experimental/code-runtime-python/src/protocol.ts:64] |

## 控制流

1. **构造占同一把 `ctx.codeRuntime`。** `constructor` `super(ctx)` 继承 Definition 键。 [E: packages/experimental/code-runtime-python/src/index.ts:831] Windows 立即 throw，避免装配成功、第一次 run 才炸。 [E: packages/experimental/code-runtime-python/src/index.ts:838]
2. **每次 run spawn。** `spawn(this.pythonBin, ['-u', '-I', bootstrapPath], { env: pythonEnvironment(), detached: true, stdio: ['pipe','pipe','pipe','pipe'] })`。 [E: packages/experimental/code-runtime-python/src/index.ts:1184]
3. **握手。** fd-3 先 `boot`（预算 + namespaces），child `boot-ack`，再 `run` 只带 `program`。程序 `await tools.name` 变成 `call` 帧。
4. **入站敌意。** `validateChildFrame` 重建字段；junk → `undefined`。协议层仍在本包 re-export。 [E: packages/experimental/code-runtime-python/src/index.ts:32]
5. **PTC 呈现。** `CodeSdkLanguage` 含 `'python'`；`SDK_RENDERERS.python` 在 `dsh-tools`。换上本 Provider 后 `runtime.language === 'python'` 才切 Python flavor。 [E: packages/core/tools/src/ptc.ts:79] [E: packages/core/tools/src/index.ts:55]
6. **不 shipped。** `packages/bundle/**/cordis.patch.yml` 无本包 id。web/headless 的 `id: code-runtime` 仍是 worker-thread（见 code-runtime 节点）。同 realm 不能两份 runtime。

## 设计动机

- **containment 不是 sandbox。** 空 env / RLIMIT / 进程组 SIGTERM→SIGKILL；模型代码仍是 bash 级信任。
- **stdout 留给程序。** 控制面独占 fd 3。
- **experimental。** 换 shipped backend = 换 host `id: code-runtime` 行，不是叠第二份。

## Gotcha

- **旧路径 `packages/code-runtime/code-runtime-python` 已退役。**
- Darwin 上 `RLIMIT_AS` 可能跳过（dyld cache）；CPU / wall 仍生效。
- 镜像 e2e 无 `python3` 会 skip。
- `language` 不由 Definition 拒跑；Consumer `SDK_RENDERERS` 认不认才是门。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `@deepseek-ai/dsh-code-runtime` `CodeRuntime`（权威不在本页） |
| **Provider（本包）** | `PythonCodeRuntime`；**无** shipped bundle 行 |
| **Provider（产品默认）** | `WorkerThreadCodeRuntime`，`language: 'typescript'` |
| **Consumer** | `createRunCodeTool` / `requireCodeRuntime` |

## Sources

- packages/experimental/code-runtime-python/src/index.ts
- packages/experimental/code-runtime-python/src/protocol.ts
- packages/experimental/code-runtime-python/py/protocol.py
- packages/experimental/code-runtime-python/package.json
- packages/experimental/code-runtime-python/tests/protocol.spec.ts
- packages/experimental/code-runtime-python/tests/protocol-mirror.e2e.ts
- packages/code-runtime/code-runtime/src/index.ts
- packages/core/tools/src/ptc.ts
- packages/core/tools/src/py-types.ts
- packages/core/tools/src/index.ts

## 相关

- [subsys.execution.code-runtime](code-runtime.md) — Definition 与 shipped TypeScript worker。
- [subsys.core.code-mode](../core/code-mode.md) — PTC 桥。
- [surface.tools.run-code](../../surface/tools/run-code.md) — 模型字段。
- [spine.capability-seams](../../spine/capability-seams.md)
- [spine.trace-code-mode](../../spine/trace-code-mode.md)
