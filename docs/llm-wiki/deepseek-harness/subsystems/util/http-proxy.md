---
id: subsys.util.http-proxy
title: http-proxy 进程级出站代理库
kind: subsystem
tier: T2
pkg: util
source:
  - packages/util/http-proxy/package.json
  - packages/util/http-proxy/src/index.ts
  - packages/util/http-proxy/src/install.ts
  - packages/util/http-proxy/src/policy.ts
  - apps/cli/src/profile-boot.ts
symbols:
  - installProxyFromEnvironment
  - proxyRouteFor
  - proxyEnvironmentForChild
  - clearedProxyEnv
  - LOOPBACK_NO_PROXY
  - PROXY_ENV_NAMES
related:
  - spine.composition-boot
  - surface.cli.overview
  - subsys.util.home-paths
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-http-proxy` 是 **进程级出站代理库**，不是 Cordis 插件：launcher 在第一行插件 mount 之前调用 `installProxyFromEnvironment`，把策略装成 undici 全局 dispatcher。Node 自带 `fetch` 忽略 `HTTP_PROXY`，没有这一步则 LLM / search / MCP HTTP / telemetry 全直连。

## 能回答的问题

- 这是不是 `cordis.patch.yml` 里的一行？`ctx.httpProxy` 存在吗？
- 谁在什么时机调用 `installProxyFromEnvironment`？
- 支持哪些 scheme？SOCKS 会不会静默丢掉？
- `NO_PROXY` 为什么总带 loopback？
- 子进程怎样继承 / 清除代理环境？

## 职责边界

本包拥有：从 launch `EnvLookup` 解析 `ProxyPolicy`、安装 / 恢复 undici dispatcher、给 child 拼 overlay、`clearedProxyEnv`。

本包**不**拥有：profile 发现（[subsys.composition.app-boot](../composition/app-boot.md)）；各 Consumer 自己的 HTTP 客户端实现。

**不是 service。** 没有 `ctx` 键，没有 isolate。 [E: packages/util/http-proxy/src/index.ts:17]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/util/http-proxy/src/index.ts` | 四个导出 |
| `packages/util/http-proxy/src/policy.ts` | 纯解析；可在无 Node transport 的 worker 里 load |
| `packages/util/http-proxy/src/install.ts` | undici `setGlobalDispatcher` |
| `apps/cli/src/profile-boot.ts` | `runProfile` 最先安装 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `POLICY_ENV_NAMES` | `http_proxy`/`HTTP_PROXY`、`https_proxy`/`HTTPS_PROXY`、`no_proxy`/`NO_PROXY`。 [E: packages/util/http-proxy/src/policy.ts:39] |
| `PROXY_ENV_NAMES` | 上表再加 `all_proxy` / `ALL_PROXY`（解析但不写回）。 [E: packages/util/http-proxy/src/policy.ts:50] |
| `LOOPBACK_NO_PROXY` | `localhost`、`127.0.0.1`、`::1`、`[::1]`。 [E: packages/util/http-proxy/src/policy.ts:33] |
| `ProxyPolicy` | `httpProxy?` / `httpsProxy?` / `noProxy` / `source: 'env' \| 'none'`。只接受 `http:`/`https:` 代理 URL。 [E: packages/util/http-proxy/src/policy.ts:67] |
| `installProxyFromEnvironment` | resolve + report + install；返回 disposer。 [E: packages/util/http-proxy/src/install.ts:296] |

## 控制流

1. **`runProfile` 在 `composeProfile` 之前**调用 `installProxyFromEnvironment(options.environment, …)`。读 launcher snapshot，不是事后的 `process.env`。 [E: apps/cli/src/profile-boot.ts:211] [E: apps/cli/src/profile-boot.ts:226]
2. 不能用的值 **report 后跳过**，不 throw，以免挡住 boot。 [E: packages/util/http-proxy/src/install.ts:296]
3. 有政策时 `setGlobalDispatcher(agent)`；shutdown 路径 `await disposeProxy()`。 [E: packages/util/http-proxy/src/install.ts:213] [E: apps/cli/src/profile-boot.ts:226]
4. 无政策时仍可能换成 direct `Agent`，避免下层 install 残留。 [E: packages/util/http-proxy/src/install.ts:197]

## 设计动机

- 一个进程一个答案：composition 没有可 scope 的代理缝。
- policy 模块不 import undici，web-fetch worker 仍能问 `proxyRouteFor`。
- loopback 强制 bypass，避免 Web UI / 本地测试绕进自己。

## Gotcha

- **不要写成 Cordis 行。** 在 bundle yml 里搜不到 `http-proxy` 是预期。
- SOCKS scheme 会诊断，不会当 HTTP 代理用。
- `NODE_USE_ENV_PROXY` 在进程启动时采样环境，**看不到 `.env` 层**；本库故意读 launcher snapshot。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | 无 `ctx` 键；库 API |
| **Provider** | CLI `runProfile` 安装全局 dispatcher |
| **Consumer** | 一切走 Node `fetch` / undici 的 host 出站 |

## Sources

- packages/util/http-proxy/package.json
- packages/util/http-proxy/src/index.ts
- packages/util/http-proxy/src/install.ts
- packages/util/http-proxy/src/policy.ts
- apps/cli/src/profile-boot.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md) — profile boot 叠层；本库在插件树之前。
- [surface.cli.overview](../../surface/cli/overview.md) — CLI 入口。
- [subsys.util.home-paths](home-paths.md) — 另一份非 service 的进程级工具。
