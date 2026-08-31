---
id: subsys.execution.code-runtime-python
title: Python code-runtime provider
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/code-runtime/code-runtime-python/src/index.ts
  - packages/code-runtime/code-runtime-python/src/protocol.ts
  - packages/code-runtime/code-runtime-python/src/invariant.ts
  - packages/code-runtime/code-runtime-python/py/protocol.py
  - packages/code-runtime/code-runtime-python/package.json
  - packages/code-runtime/code-runtime-python/tests/protocol.spec.ts
  - packages/code-runtime/code-runtime-python/tests/protocol-mirror.e2e.ts
  - packages/code-runtime/code-runtime/src/index.ts
  - packages/core/tools/src/ptc.ts
  - packages/core/tools/src/py-types.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/tests/ptc.spec.ts
symbols:
  - PROTOCOL_FD
  - validateChildFrame
  - encodeJsonPlain
  - checkDoneValue
  - hasUnsafeIntegerToken
  - hasNonLosslessNumber
  - logTruncationMarker
  - WIRE_FRAME_FIELDS
  - BootMessage
  - ChildToHost
  - CodeSdkLanguage
  - renderToolsSdkPy
  - jsonSchemaToPy
related:
  - subsys.execution.code-runtime
  - subsys.core.code-mode
  - surface.tools.run-code
  - spine.capability-seams
  - spine.trace-code-mode
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-code-runtime-python` 是 PTC **Python flavor 的协议层**，不是第二条 shipped `CodeRuntime` Provider：它不 `extends CodeRuntime`、不占 `ctx.codeRuntime`、不 spawn `python3`（除镜像 e2e）。真正会 `run()` 的仍是 [subsys.execution.code-runtime](code-runtime.md) 上的 worker-thread。PTC Consumer（`dsh-tools`）已经为 `language === 'python'` 准备 `run_code` schema 与 `renderToolsSdkPy`；装上一个上报 `'python'` 的 runtime 就会切 flavor。

## 能回答的问题

- `dsh-code-runtime-python` 导出什么？它会不会占 `ctx.codeRuntime`？
- fd-3 上 host ↔ CPython 说哪几种帧？`PROTOCOL_FD` 为什么必须两边钉死？
- `validateChildFrame` 对伪造帧做什么？`done` 同时带 `value` 和 `error` 时谁优先？
- PTC 的 `CodeSdkLanguage` 与 `SDK_RENDERERS.python` 怎样跟 runtime.language 对齐？
- shipped bundle / profile 会不会把本包插成 `id: code-runtime`？
- 为什么 Definition 的 `RESERVED_BINDING_GLOBALS` 已经预留 `__dsh_main__` / `__builtins__`，却还没有 Python `run()`？

## 职责边界

本页覆盖 **Python 后端的 wire 词汇 + PTC 侧 Python 呈现**。合同包 `CodeRuntime`、键 `ctx.codeRuntime`、默认 Provider `WorkerThreadCodeRuntime`、`RESERVED_BINDING_GLOBALS` / `RESERVED_ERROR_MEMBERS` / `PORTABLE_RESERVED_WORDS` 的权威写在 [subsys.execution.code-runtime](code-runtime.md)（`subsys.execution.code-runtime`）。本页只引用它们：Python 预留槽存在于那份跨后端集合，不在本包里再声明一份。

本包拥有：

- fd 3 JSON-lines 编解码与敌意帧重建（`src/protocol.ts`）。
- Python 侧 `TypedDict` 镜像（`py/protocol.py`）与 `PROTOCOL_FD` / `log_truncation_marker` 常量对齐。
- PTC 的 `'python'` schema flavor（`PYTHON_FLAVOR`，未导出）与 `CodeSdkLanguage` 联合。
- `renderToolsSdkPy` / `jsonSchemaToPy`：模型在 `runtime.language === 'python'` 时看到的 SDK 文本。

明确不拥有：

- `ctx.codeRuntime` 的 `provide`、`run()` 预算、worker 生命周期：[subsys.execution.code-runtime](code-runtime.md)。
- `run_code` JSON 字段表与卡片：[surface.tools.run-code](../../surface/tools/run-code.md)。
- 子调用 `TOOL_RUNTIME_SCHEDULER`、`createRunCodeTool` 执行桥：[subsys.core.code-mode](../core/code-mode.md)（权威源 `packages/core/tools/src/ptc.ts`）。

**没有 Cordis service。** `src/index.ts` 只 re-export protocol 符号，没有 `apply` / `Service`。[E: packages/code-runtime/code-runtime-python/src/index.ts:11] companion `code-runtime-python-invariant` 的 installer 是空函数。[E: packages/code-runtime/code-runtime-python/src/invariant.ts:22] `package.json` 的 `peerDependencies` 只有 cordis 与 invariants，**没有** `@deepseek-ai/dsh-code-runtime`。[E: packages/code-runtime/code-runtime-python/package.json:34]

**不 shipped。** 对 `packages/bundle/**/cordis.patch.yml` 全文检索无 `code-runtime-python` / `@deepseek-ai/dsh-code-runtime-python`。[I] `dsh-web-app` / `dsh-headless` 的 `id: code-runtime` 仍指向 worker-thread（见 code-runtime 节点）。五个 profile（`web` live；`headless` / `sdk` / `sdk-minimal` / `acp` startup）都不因本包而出现 Python runtime。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/code-runtime/code-runtime-python/src/index.ts` | 包入口：re-export codec / validators |
| `packages/code-runtime/code-runtime-python/src/protocol.ts` | `PROTOCOL_FD`、帧形状、`validateChildFrame`、无损 JSON |
| `packages/code-runtime/code-runtime-python/py/protocol.py` | 子进程侧 `TypedDict` 与 `PROTOCOL_FD = 3` |
| `packages/code-runtime/code-runtime-python/tests/protocol.spec.ts` | 纯 TS：重建、截断标记、计量 |
| `packages/code-runtime/code-runtime-python/tests/protocol-mirror.e2e.ts` | 真 `python3 -I -B` 对照字段集 |
| `packages/core/tools/src/ptc.ts` | `CodeSdkLanguage`、`PYTHON_FLAVOR`、`resolveFlavor` |
| `packages/core/tools/src/py-types.ts` | `renderToolsSdkPy` |
| `packages/core/tools/src/index.ts` | `SDK_RENDERERS.python`、`requireCodeRuntime` 语言门 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `PROTOCOL_FD` | 子进程视角的 framed-JSON fd，值为 `3`。host spawn 时 `stdio` 第四根 pipe；Python 从同名常量读。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:18] [E: packages/code-runtime/code-runtime-python/py/protocol.py:22] |
| `BootMessage` | host → child 第一帧：`cpuSeconds`、`addressSpaceBytes`、`maxLogBytes`、`maxValueBytes`、`namespaces`。与 `run` 分开，让 run 只带模型程序。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:46] |
| `RunMessage` | `type: 'run'` + `program`。在 `boot-ack` 之后发。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:64] |
| `ChildToHost` | `boot-ack` \| `call` \| `log` \| `done`。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:135] |
| `ReplyMessage` | 对每次 `call` 的 `ok: true`/`false`。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:154] |
| `done.error.kind` | 仅 `'exception'` \| `'invalid-output'` \| `'output-limit'`。wall / CPU / abort / 子进程死由 **host 侧**观察，不走帧。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:109] |
| `logTruncationMarker` | 共享文案 ``[dsh-code-runtime-python] log capture truncated at ${maxBytes} bytes``。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:267] |
| `WIRE_FRAME_FIELDS` | 每帧 required/optional 键，给镜像测试对照 `TypedDict`。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:247] |
| `CodeSdkLanguage` | `'typescript' \| 'python'`。与 `RUN_CODE_FLAVORS`、`SDK_RENDERERS` 用 `satisfies Record<CodeSdkLanguage, …>` 互锁。[E: packages/core/tools/src/ptc.ts:79] [E: packages/core/tools/src/ptc.ts:85] [E: packages/core/tools/src/index.ts:55] |
| `PYTHON_FLAVOR` | 模型可见描述：程序是 async **Python** 函数体，`await tools.name(args)`，`print` / `return`。[E: packages/core/tools/src/ptc.ts:59] |

`Namespace.global` 在 Python 是关键字，故 `py/protocol.py` 用 functional `TypedDict` 才能发出 JSON 键 `"global"`。[E: packages/code-runtime/code-runtime-python/py/protocol.py:35]

## 控制流

1. 本包 **不** 在 boot 树挂 Provider。未来 CPython backend 应 `extends CodeRuntime` 并 `super(ctx, 'codeRuntime')`（键名权威在 Definition 包）。同 realm 第二份 service 仍会抛——换 Python 必须换 `id: code-runtime` 行，不能叠在 worker-thread 上。见 [subsys.execution.code-runtime](code-runtime.md)。
2. 计划中的 spawn 形状：子进程视角 `PROTOCOL_FD === 3`（host `stdio` 第四根 pipe）；镜像 e2e 用 `python3 -I -B` 只读常量，不是 `CodeRuntime.run`。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:18] [E: packages/code-runtime/code-runtime-python/tests/protocol-mirror.e2e.ts:25] [E: packages/code-runtime/code-runtime-python/tests/protocol-mirror.e2e.ts:51] 冻结树里 **没有** spawn / `run()` 实现。
3. 协议握手（一旦有 backend）：host 先发 `boot`（预算 + namespaces），child 回 `boot-ack`，host 再发 `run`。程序里的 binding 变成 `call` 帧；host 用 `reply` 回答；日志是独立 `log` 帧。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:46] [E: packages/code-runtime/code-runtime-python/src/protocol.ts:71] [E: packages/code-runtime/code-runtime-python/src/protocol.ts:64] [E: packages/code-runtime/code-runtime-python/src/protocol.ts:91]
4. 入站一律敌意：`validateChildFrame` 按字段 **重建**；junk 返回 `undefined`，避免 host message handler throw 炸进程。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:604] `call.id` 必须是有限数且不是 `-0`，否则 reply 无法严格 JSON 或会撞上 id `0`。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:623] 缺 `args` 键整帧丢弃，避免把 `undefined` 交给 binding。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:629] `log.truncated` 只有字面 `true` 才带上，其它 truthy 伪造不会让 host 提前停捕获。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:615]
5. `done` 可同时带 `value` 与 `error`（伪造帧）。重建两者都保留（`value` 与 `error` 一并返回）。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:649] [E: packages/code-runtime/code-runtime-python/src/protocol.ts:651]
6. 无损 JSON：`hasUnsafeIntegerToken` 在 `JSON.parse` **之前**扫源文本，因为 parse 会先把 `9007199254740993` 圆掉。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:497] `encodeJsonPlain` 迭代编码，避免深对象把 `JSON.stringify` 栈打爆；超安全整数用 `BigInt` 位数而不是 rounded double。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:286] [E: packages/code-runtime/code-runtime-python/src/protocol.ts:333] `checkDoneValue` 在预算内计量 completion，over-budget 优先于 non-lossless。[E: packages/code-runtime/code-runtime-python/src/protocol.ts:417]
7. PTC 呈现：`resolveFlavor` 读 `peekRuntime().language`；无 runtime 时（文档 catalog 的 `schemas()`，不喂模型）回落到 TypeScript flavor。[E: packages/core/tools/src/ptc.ts:112] [E: packages/core/tools/src/ptc.ts:119] 已挂 runtime 但语言不在表里则抛，known 列出 `"typescript", "python"`。[E: packages/core/tools/src/ptc.ts:126] 装配路径 `requireCodeRuntime` 同样用 `SDK_RENDERERS` 的 own-property 检查；错误文案举例仍写加载 worker-thread，不点名本包。[E: packages/core/tools/src/index.ts:1010] [E: packages/core/tools/src/index.ts:1013] [E: packages/core/tools/src/index.ts:1016]
8. Python SDK：`SDK_RENDERERS.python === renderToolsSdkPy`。[E: packages/core/tools/src/index.ts:55] 输出含 `class ToolCallError(Exception)`、`class Tools(Protocol)`、`tools: Tools`，包在 python 围栏里。[E: packages/core/tools/src/py-types.ts:815] [E: packages/core/tools/src/py-types.ts:816] [E: packages/core/tools/src/py-types.ts:817] 单测用 stub `{ language: 'python' }` 即可切 system prompt，不需要本协议包。[E: packages/core/tools/tests/ptc.spec.ts:384]
9. Definition 的 `language` 是不受约束的 `string`；well-known 值含 `'python'`，但冻结树里 published backend 仍是 TypeScript worker。[E: packages/code-runtime/code-runtime/src/index.ts:111] 与本包「只有协议、没有 `run()`」一致。

## 设计动机

- **协议先于 backend。** 先钉 fd-3 词汇和跨语言镜像，避免将来 CPython bootstrap 与 host 各写一套帧。
- **单向信任。** 模型能写 fd 3，host 必须重建；host 不是模型控的，Python 侧信任 `reply`。
- **呈现与执行解耦。** `dsh-tools` 已经能按 `language` 换 schema / SDK；缺 Python `CodeRuntime` 时 shipped 产品仍走 TypeScript worker。换 backend = 换 host 的 `id: code-runtime` 行，不改 `createRunCodeTool`。
- **stdout 留给程序。** 控制面独占 fd 3，避免 `print` 与协议抢同一个流。

## Gotcha

- **本包不是 Provider。** `package.json` description 写 “CPython subprocess implementation”，源码与 README 写清：不含执行路径。不要把它填进 bundle 的 `id: code-runtime` 指望占键。
- **同 realm 不能两份 runtime。** Python 与 worker-thread 互斥，不是按 language 路由的双挂。
- **`language` 不门控 `run()`。** Definition 不因 `'python'` 拒跑。门在 Consumer：`SDK_RENDERERS` / `RUN_CODE_FLAVORS`。未知语言（测试用 `ruby`）装配即抛。[E: packages/core/tools/tests/ptc.spec.ts:451]
- **装配与执行两次读 runtime。** `requireCodeRuntime` 在装配 / 执行时各 `this.ctx.get('codeRuntime')` 一次；语言不绑在单次 request 上。[E: packages/core/tools/src/index.ts:1010] [E: packages/core/tools/src/index.ts:1011]
- **Unicode 表 skew。** `isBareIdentifier` 用 **Node 引擎** 的 `\p{XID_*}`；更老的 CPython 可能拒掉引擎认为合法的标识符。上报 `language: 'python'` 的 backend 尚未存在。[E: packages/core/tools/src/py-types.ts:99]
- **镜像 e2e 无 python3 会 skip。** `describe.skipIf(!python3Available)`；纯 TS `protocol.spec.ts` 无条件覆盖 codec。[E: packages/code-runtime/code-runtime-python/tests/protocol-mirror.e2e.ts:38]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-code-runtime` 的 `CodeRuntime`（**不在本页权威**） | `ctx.codeRuntime`。见 [subsys.execution.code-runtime](code-runtime.md) |
| **Provider（shipped）** | `WorkerThreadCodeRuntime`，`language: 'typescript'` | host：`dsh-web-app` / `dsh-headless` 的 `id: code-runtime`。**不是本包** |
| **Provider（本包现状）** | **无。** 本包是 fd-3 codec + `py/protocol.py` | 无 bundle 行、无 `apply`、不 `provide` |
| **未来 Python Provider** | 应消费本包协议、`isolation` 预期 `'process'`、`language: 'python'` | 换同一 `id: code-runtime` 行；尚未进 shipped overlay |
| **Consumer（呈现）** | `dsh-agent-tool-presentation` 的 `presentAs('ptc'\|'both')` | 等 `codeRuntime`；语言由已挂 runtime 决定 |
| **Consumer（flavor / SDK）** | `dsh-tools`：`resolveFlavor`、`SDK_RENDERERS.python`、`renderToolsSdkPy` | 不静态 inject。未知 language 抛 |
| **Consumer（执行）** | `createRunCodeTool` → `runtime.run({ program, bindings, signal })` | 请求形状与语言无关；Python 程序能否跑取决于挂上的 Provider |

换 Python backend ≠ 加载本 npm 包当 plugin。本包给那个尚未 shipped 的 plugin 提供词汇。

## Sources

- packages/code-runtime/code-runtime-python/src/index.ts
- packages/code-runtime/code-runtime-python/src/protocol.ts
- packages/code-runtime/code-runtime-python/src/invariant.ts
- packages/code-runtime/code-runtime-python/py/protocol.py
- packages/code-runtime/code-runtime-python/package.json
- packages/code-runtime/code-runtime-python/tests/protocol.spec.ts
- packages/code-runtime/code-runtime-python/tests/protocol-mirror.e2e.ts
- packages/code-runtime/code-runtime/src/index.ts
- packages/core/tools/src/ptc.ts
- packages/core/tools/src/py-types.ts
- packages/core/tools/src/index.ts
- packages/core/tools/tests/ptc.spec.ts

## 相关

- [subsys.execution.code-runtime](code-runtime.md)（`subsys.execution.code-runtime`）：`ctx.codeRuntime` Definition 与 TypeScript worker Provider。
- [subsys.core.code-mode](../core/code-mode.md)（`subsys.core.code-mode`）：PTC `run_code` 桥与子调度。
- [surface.tools.run-code](../../surface/tools/run-code.md)（`surface.tools.run-code`）：模型可见字段。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer。
- [spine.trace-code-mode](../../spine/trace-code-mode.md)（`spine.trace-code-mode`）：一轮 PTC 走到 `runtime.run`。
