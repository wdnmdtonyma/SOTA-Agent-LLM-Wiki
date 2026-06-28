---
id: subsys.coding-agent.http-dispatcher
title: HTTP/代理调度
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/http-dispatcher.ts
symbols:
  - configureHttpDispatcher
related:
  - surface.sdk.embedding
  - subsys.ai.wire-protocol-dispatch
evidence: explicit
status: verified
updated: 5a073885
---

> `http-dispatcher.ts` 是 pi-coding-agent 的 HTTP dispatcher bootstrap:它把 `undici` 全局 dispatcher 配成 env-proxy aware,并在安全条件下把 `globalThis.fetch` 也切到同一份 npm `undici` implementation。

## 能回答的问题

- `configureHttpDispatcher()` 默认的 HTTP idle timeout 是多少,非法 timeout 会怎样处理?
- `HTTP_IDLE_TIMEOUT_CHOICES` 和 `parseHttpIdleTimeoutMs()` 支持哪些配置值?
- `applyHttpProxySettings()` 会覆盖已经存在的 `HTTP_PROXY` / `HTTPS_PROXY` 吗?
- 全局 dispatcher 为什么使用 `undici.EnvHttpProxyAgent`,并禁用 HTTP/2?
- 什么时候会调用 `undici.install()` 替换 global fetch,什么时候会保留 caller 自己替换过的 fetch?
- 这个 coding-agent 层的 HTTP bootstrap 和 `pi-ai` wire protocol dispatch 是什么关系?

## 职责边界

`packages/coding-agent/src/core/http-dispatcher.ts` owns process-level HTTP transport defaults for coding-agent:它导入 npm `undici`,定义 timeout helpers,把 proxy 字符串写入 Node process env,并通过 `undici.setGlobalDispatcher()` 安装一个 `EnvHttpProxyAgent` [E: packages/coding-agent/src/core/http-dispatcher.ts:1] [E: packages/coding-agent/src/core/http-dispatcher.ts:16] [E: packages/coding-agent/src/core/http-dispatcher.ts:34] [E: packages/coding-agent/src/core/http-dispatcher.ts:42] [E: packages/coding-agent/src/core/http-dispatcher.ts:49] [E: packages/coding-agent/src/core/http-dispatcher.ts:54]。

这个文件不选择 provider、不构造 model request payload,也不处理 streaming event;这些属于 `subsys.ai.wire-protocol-dispatch` 所在的 `pi-ai` wire protocol 层 [I]。本节点只说明 coding-agent 在发起 provider HTTP 请求前设置的 process/global transport environment [I]。

索引只把 `configureHttpDispatcher` 标成该节点的权威 symbol;同一 source file 还导出 `DEFAULT_HTTP_IDLE_TIMEOUT_MS`、`HTTP_IDLE_TIMEOUT_CHOICES`、`parseHttpIdleTimeoutMs()`、`formatHttpIdleTimeoutMs()` 和 `applyHttpProxySettings()` 作为 dispatcher 配置 helper [E: packages/coding-agent/src/core/http-dispatcher.ts:3] [E: packages/coding-agent/src/core/http-dispatcher.ts:5] [E: packages/coding-agent/src/core/http-dispatcher.ts:16] [E: packages/coding-agent/src/core/http-dispatcher.ts:34] [E: packages/coding-agent/src/core/http-dispatcher.ts:42] [E: packages/coding-agent/src/core/http-dispatcher.ts:49]。

## 关键文件

- `packages/coding-agent/src/core/http-dispatcher.ts`:定义 idle timeout constants,parser/formatter,proxy env application,global dispatcher installation,以及 conditional `undici.install()` fetch alignment [E: packages/coding-agent/src/core/http-dispatcher.ts:3] [E: packages/coding-agent/src/core/http-dispatcher.ts:16] [E: packages/coding-agent/src/core/http-dispatcher.ts:42] [E: packages/coding-agent/src/core/http-dispatcher.ts:49] [E: packages/coding-agent/src/core/http-dispatcher.ts:54] [E: packages/coding-agent/src/core/http-dispatcher.ts:65] [E: packages/coding-agent/src/core/http-dispatcher.ts:70]。

## 数据模型

`DEFAULT_HTTP_IDLE_TIMEOUT_MS` 是 `300_000`,也就是默认 5 分钟 idle timeout [E: packages/coding-agent/src/core/http-dispatcher.ts:3]。`HTTP_IDLE_TIMEOUT_CHOICES` 导出的固定选项是 30 秒、1 分钟、2 分钟、5 分钟和 disabled;disabled 对应 `timeoutMs: 0` [E: packages/coding-agent/src/core/http-dispatcher.ts:5] [E: packages/coding-agent/src/core/http-dispatcher.ts:6] [E: packages/coding-agent/src/core/http-dispatcher.ts:7] [E: packages/coding-agent/src/core/http-dispatcher.ts:8] [E: packages/coding-agent/src/core/http-dispatcher.ts:9] [E: packages/coding-agent/src/core/http-dispatcher.ts:10]。

`parseHttpIdleTimeoutMs(value)` 接受 string 或 number。string 会先 `trim()`,大小写无关的 `"disabled"` 解析为 `0`,空 string 解析为 `undefined`,其它 string 转成 `Number(trimmed)` 后递归走 number 分支 [E: packages/coding-agent/src/core/http-dispatcher.ts:16] [E: packages/coding-agent/src/core/http-dispatcher.ts:18] [E: packages/coding-agent/src/core/http-dispatcher.ts:19] [E: packages/coding-agent/src/core/http-dispatcher.ts:20] [E: packages/coding-agent/src/core/http-dispatcher.ts:22] [E: packages/coding-agent/src/core/http-dispatcher.ts:23] [E: packages/coding-agent/src/core/http-dispatcher.ts:25]。

number 分支只接受 finite 且非负的 number,否则返回 `undefined`;有效 number 会被 `Math.floor()` 下取整,所以 `1200.9` 这类输入会变成 `1200` milliseconds [E: packages/coding-agent/src/core/http-dispatcher.ts:28] [E: packages/coding-agent/src/core/http-dispatcher.ts:29] [E: packages/coding-agent/src/core/http-dispatcher.ts:31]。

`formatHttpIdleTimeoutMs(timeoutMs)` 优先把精确命中 `HTTP_IDLE_TIMEOUT_CHOICES.timeoutMs` 的值格式化为预设 label;没有命中时返回 ``${timeoutMs / 1000} sec`` [E: packages/coding-agent/src/core/http-dispatcher.ts:34] [E: packages/coding-agent/src/core/http-dispatcher.ts:35] [E: packages/coding-agent/src/core/http-dispatcher.ts:37] [E: packages/coding-agent/src/core/http-dispatcher.ts:39]。

`originalGlobalFetch` 在模块加载时捕获当前 `globalThis.fetch`,而 `installedGlobalFetch` 是本模块在 install 分支执行后记录的当前 fetch;这两个 module-scope 变量是后续判断是否能安全覆盖 global fetch 的状态 [E: packages/coding-agent/src/core/http-dispatcher.ts:13] [E: packages/coding-agent/src/core/http-dispatcher.ts:14] [E: packages/coding-agent/src/core/http-dispatcher.ts:65] [E: packages/coding-agent/src/core/http-dispatcher.ts:71]。

## 控制流

1. `applyHttpProxySettings@packages/coding-agent/src/core/http-dispatcher.ts:42` 先 trim `httpProxy`;空值直接返回,非空值只在 `HTTP_PROXY` / `HTTPS_PROXY` 还没有值时写入,不会覆盖用户或外层进程已经设置的 proxy env [E: packages/coding-agent/src/core/http-dispatcher.ts:42] [E: packages/coding-agent/src/core/http-dispatcher.ts:43] [E: packages/coding-agent/src/core/http-dispatcher.ts:44] [E: packages/coding-agent/src/core/http-dispatcher.ts:45] [E: packages/coding-agent/src/core/http-dispatcher.ts:46]。
2. `configureHttpDispatcher@packages/coding-agent/src/core/http-dispatcher.ts:49` 默认使用 `DEFAULT_HTTP_IDLE_TIMEOUT_MS`;函数入口先调用 `parseHttpIdleTimeoutMs(timeoutMs)` 归一化 timeout [E: packages/coding-agent/src/core/http-dispatcher.ts:49] [E: packages/coding-agent/src/core/http-dispatcher.ts:50]。
3. 如果 normalized timeout 是 `undefined`,`configureHttpDispatcher()` 抛出 `Invalid HTTP idle timeout: ...`,而不是静默回退到默认值 [E: packages/coding-agent/src/core/http-dispatcher.ts:51] [E: packages/coding-agent/src/core/http-dispatcher.ts:52]。
4. 合法 timeout 会被传给 `undici.EnvHttpProxyAgent`,同时设置为 `bodyTimeout` 和 `headersTimeout`;agent 还固定 `allowH2: false`,然后被 `undici.setGlobalDispatcher()` 安装为全局 dispatcher [E: packages/coding-agent/src/core/http-dispatcher.ts:54] [E: packages/coding-agent/src/core/http-dispatcher.ts:55] [E: packages/coding-agent/src/core/http-dispatcher.ts:56] [E: packages/coding-agent/src/core/http-dispatcher.ts:57] [E: packages/coding-agent/src/core/http-dispatcher.ts:58]。
5. 当 `installedGlobalFetch` 仍是 `undefined` 时,`shouldInstallGlobals` 的条件是 `globalThis.fetch === originalGlobalFetch`;如果 caller 在模块加载后已经替换了 `globalThis.fetch`,这一路径不会覆盖这个 deliberate override [E: packages/coding-agent/src/core/http-dispatcher.ts:65] [E: packages/coding-agent/src/core/http-dispatcher.ts:66] [E: packages/coding-agent/src/core/http-dispatcher.ts:67]。
6. 一旦本模块已经记录过 `installedGlobalFetch`,后续只有当当前 `globalThis.fetch` 仍等于本模块上次安装记录的 `installedGlobalFetch` 时才会再次安装;如果外部后来替换了 fetch,本模块也会停止覆盖 [E: packages/coding-agent/src/core/http-dispatcher.ts:65] [E: packages/coding-agent/src/core/http-dispatcher.ts:66] [E: packages/coding-agent/src/core/http-dispatcher.ts:68]。
7. 当 `shouldInstallGlobals` 为 true 时,代码调用 optional chaining 形式的 `undici.install?.()`,随后把当前 `globalThis.fetch` 记录到 `installedGlobalFetch` [E: packages/coding-agent/src/core/http-dispatcher.ts:69] [E: packages/coding-agent/src/core/http-dispatcher.ts:70] [E: packages/coding-agent/src/core/http-dispatcher.ts:71]。

## 设计动机与权衡

`EnvHttpProxyAgent` 表示 dispatcher 会从 process environment 读取 proxy 相关配置;`applyHttpProxySettings()` 把一个 coding-agent config 值桥接到 `HTTP_PROXY` / `HTTPS_PROXY`,因此这两个 helper 组合起来形成产品配置到 undici dispatcher 的路径 [E: packages/coding-agent/src/core/http-dispatcher.ts:42] [E: packages/coding-agent/src/core/http-dispatcher.ts:45] [E: packages/coding-agent/src/core/http-dispatcher.ts:46] [E: packages/coding-agent/src/core/http-dispatcher.ts:55] [I]。

`configureHttpDispatcher()` 同时设置 dispatcher 和 fetch implementation;可执行代码证明它会先计算 `shouldInstallGlobals`,并在条件允许时调用 `undici.install?.()`、记录 `installedGlobalFetch` [E: packages/coding-agent/src/core/http-dispatcher.ts:65] [E: packages/coding-agent/src/core/http-dispatcher.ts:69] [E: packages/coding-agent/src/core/http-dispatcher.ts:70] [E: packages/coding-agent/src/core/http-dispatcher.ts:71]。让 provider 请求路径中的 `fetch` 与 `undici` dispatcher 来自同一份 npm `undici`,以及规避 Node bundled fetch 与 npm undici dispatcher 的 compressed response 兼容性问题,属于源码注释给出的动机而非可执行语义,因此只作为设计意图推断保留 [I]。

timeout parser 对空 string 和非法值返回 `undefined`,但 `configureHttpDispatcher()` 对 `undefined` 抛错;这让配置层可以先用 parser 做宽松解析,而 bootstrap 层把非法 dispatcher timeout 作为启动错误处理 [E: packages/coding-agent/src/core/http-dispatcher.ts:22] [E: packages/coding-agent/src/core/http-dispatcher.ts:28] [E: packages/coding-agent/src/core/http-dispatcher.ts:51] [I]。

## Gotcha

- `parseHttpIdleTimeoutMs("disabled")` 返回 `0`;`configureHttpDispatcher(0)` 会把 `bodyTimeout` 和 `headersTimeout` 都设为 `0`,这里的 disabled 语义依赖 `undici` 对 timeout `0` 的解释,本 source file 没有进一步封装 [E: packages/coding-agent/src/core/http-dispatcher.ts:19] [E: packages/coding-agent/src/core/http-dispatcher.ts:20] [E: packages/coding-agent/src/core/http-dispatcher.ts:57] [E: packages/coding-agent/src/core/http-dispatcher.ts:58] [I]。
- `formatHttpIdleTimeoutMs()` 对非预设值只做除以 1000 并拼接 `sec`,不会四舍五入或保证整数秒 display [E: packages/coding-agent/src/core/http-dispatcher.ts:39]。
- `applyHttpProxySettings()` 使用 `??=`,所以空 string 这种已经存在但 falsy 的 env value 不会被新 proxy 替换;这是 JavaScript nullish assignment 的直接效果 [E: packages/coding-agent/src/core/http-dispatcher.ts:45] [E: packages/coding-agent/src/core/http-dispatcher.ts:46]。
- `undici.install?.()` 使用 optional chaining,所以当前 npm `undici` 如果没有 `install` export,这段不会抛出缺失方法错误;但 dispatcher 仍已在前一步通过 `setGlobalDispatcher()` 设置 [E: packages/coding-agent/src/core/http-dispatcher.ts:54] [E: packages/coding-agent/src/core/http-dispatcher.ts:70]。

## 跨包边界

`surface.sdk.embedding` 是 coding-agent 的 SDK 嵌入 surface,索引显示它的 related 包含本节点;嵌入式 caller 如果复用 coding-agent session,会受到这个 process/global HTTP bootstrap 的影响 [I]。该 related 节点当前在 index 中仍是 planned,所以这里保留 id 而不创建 markdown 链接。

[subsys.ai.wire-protocol-dispatch](../ai/wire-protocol-dispatch.md) 描述 `pi-ai` 如何把 `Model.api` 分派到 provider-specific `stream` / `streamSimple`;本节点提供的是更低层的 process HTTP dispatcher/fetch setup,二者通过运行时 HTTP 请求路径相邻,但 source file 没有直接 import `pi-ai` [I]。

## Sources

- packages/coding-agent/src/core/http-dispatcher.ts

## 相关

- `surface.sdk.embedding`: SDK 嵌入 surface;该节点当前未落盘,所以保留 index id。
- [subsys.ai.wire-protocol-dispatch](../ai/wire-protocol-dispatch.md): `pi-ai` 的 provider wire protocol dispatch,负责选择 provider streaming implementation。
