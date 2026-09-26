---
id: subsys.execution.code-runtime-python
title: Python ptc-runtime provider（experimental）
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/experimental/ptc-runtime-python/src/index.ts
  - packages/experimental/ptc-runtime-python/src/protocol.ts
  - packages/experimental/ptc-runtime-python/py/protocol.py
  - packages/experimental/ptc-runtime-python/package.json
  - packages/experimental/ptc-runtime-python/tests/protocol.spec.ts
  - packages/experimental/ptc-runtime-python/tests/protocol-mirror.e2e.ts
  - packages/ptc-runtime/ptc-runtime/src/index.ts
  - packages/core/tools/src/ptc.ts
  - packages/core/tools/src/py-types.ts
  - packages/core/tools/src/index.ts
symbols:
  - PythonPtcRuntime
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
updated: 477b4f4205
---

> `@deepseek-ai/dsh-experimental-ptc-runtime-python` 是 **真正的 `PtcRuntime` Provider**：`PythonPtcRuntime extends PtcRuntime`，每次 `run()` spawn 新鲜 `python3`，控制面走 **fd-3 JSON-lines**。包在 `packages/experimental/ptc-runtime-python`。它**不是** shipped `id: ptc-runtime` 行；默认仍是 `dsh-ptc-runtime-node`。旧路径 `packages/experimental/code-runtime-python` 与 `packages/code-runtime/code-runtime-python` 已退役。

## 能回答的问题

- 本包还在 `packages/code-runtime/code-runtime-python` 或 `packages/experimental/code-runtime-python` 吗？npm 名是什么？
- `PythonPtcRuntime` 会不会 `extends PtcRuntime`？`language` / `isolation` 报什么？占不占 `ctx.ptcRuntime`？
- spawn 参数是什么？`PROTOCOL_FD` 为什么必须钉 3？
- shipped web / headless / `dsh-base` 会不会把本包插成 `id: ptc-runtime`？
- Windows 上能不能 register？

## 职责边界

本页覆盖 **experimental CPython Provider + 它拥有的 fd-3 协议**。`ctx.ptcRuntime` 合同、`RESERVED_*`、默认 `NodePtcRuntime` 的权威在 [subsys.execution.code-runtime](code-runtime.md)。PTC `run_code` 桥在 [subsys.core.code-mode](../core/code-mode.md)。

本包拥有：`PythonPtcRuntime`、`py/bootstrap.py`、host/Python 协议镜像。

明确不拥有：shipped bundle 行；`createRunCodeTool` 字段表。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/experimental/ptc-runtime-python/src/index.ts` | `PythonPtcRuntime`、spawn、预算 Config |
| `packages/experimental/ptc-runtime-python/src/protocol.ts` | `PROTOCOL_FD`、帧校验 |
| `packages/experimental/ptc-runtime-python/py/protocol.py` | 子进程 `PROTOCOL_FD = 3` |
| `packages/experimental/ptc-runtime-python/package.json` | `@deepseek-ai/dsh-experimental-ptc-runtime-python` |

## 数据模型

| 符号 | 要点 |
|---|---|
| npm | `@deepseek-ai/dsh-experimental-ptc-runtime-python`。 [E: packages/experimental/ptc-runtime-python/package.json:2] |
| `PythonPtcRuntime` | `extends PtcRuntime`。 [E: packages/experimental/ptc-runtime-python/src/index.ts:804] |
| `language` / `isolation` | `'python'` / `'process'`。 [E: packages/experimental/ptc-runtime-python/src/index.ts:815] [E: packages/experimental/ptc-runtime-python/src/index.ts:816] |
| Config 默认 | `cpuSeconds: 60`、`maxWallMs: 600_000`、`addressSpaceMb: 512`、`pythonBin: 'python3'`。 [E: packages/experimental/ptc-runtime-python/src/index.ts:806] [E: packages/experimental/ptc-runtime-python/src/index.ts:812] |
| `PROTOCOL_FD` | `3`（host `stdio` 第四根 pipe）。 [E: packages/experimental/ptc-runtime-python/src/protocol.ts:18] [E: packages/experimental/ptc-runtime-python/py/protocol.py:22] |
| `BootMessage` / `RunMessage` | host 先 `boot` 再 `run`。 [E: packages/experimental/ptc-runtime-python/src/protocol.ts:46] [E: packages/experimental/ptc-runtime-python/src/protocol.ts:64] |

## 控制流

1. **构造占同一把 `ctx.ptcRuntime`。** `constructor` `super(ctx)` 继承 Definition 键。 [E: packages/experimental/ptc-runtime-python/src/index.ts:830] Windows 立即 throw，避免装配成功、第一次 run 才炸。 [E: packages/experimental/ptc-runtime-python/src/index.ts:837]
2. **每次 run spawn。** `spawn(this.pythonBin, ['-u', '-I', bootstrapPath], { env: pythonEnvironment(), detached: true, stdio: ['pipe','pipe','pipe','pipe'] })`。 [E: packages/experimental/ptc-runtime-python/src/index.ts:1196]
3. **握手。** fd-3 先 `boot`（预算 + namespaces），child `boot-ack`，再 `run` 只带 `program`。程序 `await tools.name` 变成 `call` 帧。
4. **入站敌意。** `validateChildFrame` 重建字段；junk → `undefined`。协议层仍在本包 re-export。 [E: packages/experimental/ptc-runtime-python/src/index.ts:38] [E: packages/experimental/ptc-runtime-python/src/protocol.ts:661]
5. **PTC 呈现。** `PtcSdkLanguage` 含 `'python'`；`SDK_RENDERERS.python` 在 `dsh-tools`。换上本 Provider 后 `runtime.language === 'python'` 才切 Python flavor。 [E: packages/core/tools/src/ptc.ts:89] [E: packages/core/tools/src/index.ts:63]
6. **不 shipped。** `packages/bundle/**/cordis.patch.yml` 无本包 id。`dsh-base` 的 `id: ptc-runtime` 仍是 `dsh-ptc-runtime-node`（见 code-runtime 节点）。同 realm 不能两份 runtime。

## 设计动机

- **containment 不是 sandbox。** 空 env / RLIMIT / 进程组 SIGTERM→SIGKILL；模型代码仍是 bash 级信任。
- **stdout 留给程序。** 控制面独占 fd 3。
- **experimental。** 换 shipped backend = 换 host `id: ptc-runtime` 行，不是叠第二份。

## Gotcha

- **旧路径 `packages/code-runtime/code-runtime-python` 与 `packages/experimental/code-runtime-python` 已退役。** 现为 `packages/experimental/ptc-runtime-python`。
- Darwin 上 `RLIMIT_AS` 可能跳过（dyld cache）；CPU / wall 仍生效。
- 镜像 e2e 无 `python3` 会 skip。
- `language` 不由 Definition 拒跑；Consumer `SDK_RENDERERS` 认不认才是门。
- `resolve()` 拒绝**任何**显式 `sandboxPolicy` 与**任何** per-call `timeoutMs`（不是「非默认才拒」）；随后把 `timeoutMs` 填成 `maxWallMs`。`run()` 再断言 `timeoutMs === maxWallMs` 且没有 sandboxPolicy。本 backend 不走 `ctx.sandbox.confine`。 [E: packages/experimental/ptc-runtime-python/src/index.ts:1038] [E: packages/experimental/ptc-runtime-python/src/index.ts:1039] [E: packages/experimental/ptc-runtime-python/src/index.ts:1051]

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `@deepseek-ai/dsh-ptc-runtime` `PtcRuntime`（权威不在本页） |
| **Provider（本包）** | `PythonPtcRuntime`；**无** shipped bundle 行 |
| **Provider（产品默认）** | `NodePtcRuntime`，`language: 'typescript'` |
| **Consumer** | `createRunCodeTool` / `requirePtcRuntime` |

## Sources

- packages/experimental/ptc-runtime-python/src/index.ts
- packages/experimental/ptc-runtime-python/src/protocol.ts
- packages/experimental/ptc-runtime-python/py/protocol.py
- packages/experimental/ptc-runtime-python/package.json
- packages/experimental/ptc-runtime-python/tests/protocol.spec.ts
- packages/experimental/ptc-runtime-python/tests/protocol-mirror.e2e.ts
- packages/ptc-runtime/ptc-runtime/src/index.ts
- packages/core/tools/src/ptc.ts
- packages/core/tools/src/py-types.ts
- packages/core/tools/src/index.ts

## 相关

- [subsys.execution.code-runtime](code-runtime.md) — Definition 与 shipped TypeScript Node process。
- [subsys.core.code-mode](../core/code-mode.md) — PTC 桥。
- [surface.tools.run-code](../../surface/tools/run-code.md) — 模型字段。
- [spine.capability-seams](../../spine/capability-seams.md)
- [spine.trace-code-mode](../../spine/trace-code-mode.md)
