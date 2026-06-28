---
id: surface.misc.containerization
title: 容器化与隔离
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/docs/containerization.md
  - .pi/extensions/redraws.ts
symbols: []
related:
  - surface.misc.security
  - surface.extensions.api
evidence: explicit
status: verified
updated: 5a073885
---

> `surface.misc.containerization` 描述 pi-coding-agent 文档中公开的隔离运行形态:Pi 默认以 full permissions 运行;需要更强边界时,要把整个 `pi` 进程放进隔离环境,或让宿主机上的 `pi` 把工具执行路由到隔离环境。

## 能回答的问题

- pi 的容器化文档把隔离分成哪两类?
- Gondolin、Plain Docker、OpenShell 三种模式分别隔离什么?
- Plain Docker 示例会把哪些目录和凭证放进容器?
- Gondolin 示例的 `/workspace` 写入是否会回写宿主机?
- OpenShell remote gateway 的文件写入语义是什么?
- index source 中的 `.pi/extensions/redraws.ts` 是否真的属于容器化证据?

## 默认权限与两类隔离

containerization 文档开头说明 Pi 默认以 all permissions 运行;如果用户想控制 Pi 能写哪些目录、拥有哪些访问权,需要额外隔离或控制 [E: packages/coding-agent/docs/containerization.md:3]。该文档把隔离形态分成两类:一类是把整个 `pi` process 放进 isolated environment,另一类是在 host 上运行 `pi`,但把 tool execution 路由进 isolated environment [E: packages/coding-agent/docs/containerization.md:5] [E: packages/coding-agent/docs/containerization.md:6] [E: packages/coding-agent/docs/containerization.md:7]。

这两类决定了扩展的运行边界:文档明确说 extensions run wherever the `pi` process runs;如果 host `pi` 只使用 tool-routing extension,其它 custom extension tools 仍在 host 上运行,除非它们也主动 delegate operations [E: packages/coding-agent/docs/containerization.md:17]。因此,“工具路由进 sandbox”不能自动推出“所有 extension code 都在 sandbox 内” [I]。

## 三种官方模式

containerization 文档的 choose table 列出三种模式:Gondolin extension 隔离 built-in tools 和 `!` commands,适合在 host 保留 `pi` 与 provider auth 的本地 micro-VM 隔离;Plain Docker 把 whole `pi` process 放进 local container,并注明 provider API keys enter the container;OpenShell 把 whole `pi` process 放进 policy-controlled sandbox,且要求 OpenShell gateway [E: packages/coding-agent/docs/containerization.md:13] [E: packages/coding-agent/docs/containerization.md:14] [E: packages/coding-agent/docs/containerization.md:15]。

这个表只描述 pi 文档推荐的部署形态,不证明 Gondolin、Docker 或 OpenShell 的真实隔离强度;外部 runtime 的实现和策略不在本节点的 index source 中 [U]。

## Gondolin:host pi 加 micro-VM 工具路由

Gondolin 段把 Gondolin 定义为 local Linux micro-VM,并建议在想让 `pi` 留在 host、同时把所有 built-in tools route into VM 时使用 example extension [E: packages/coding-agent/docs/containerization.md:21] [E: packages/coding-agent/docs/containerization.md:22]。运行方式是把 example extension 复制到 `~/.pi/agent/extensions/gondolin`,安装依赖,再从要挂载的项目目录用 `pi -e ~/.pi/agent/extensions/gondolin` 启动 [E: packages/coding-agent/docs/containerization.md:27] [E: packages/coding-agent/docs/containerization.md:28] [E: packages/coding-agent/docs/containerization.md:29] [E: packages/coding-agent/docs/containerization.md:35] [E: packages/coding-agent/docs/containerization.md:36]。

该扩展在文档中声明会把 host cwd 挂到 VM 内 `/workspace`,覆盖 `read`、`write`、`edit`、`bash`、`grep`、`find`、`ls`,并把用户 `!` commands 也路由进 VM [E: packages/coding-agent/docs/containerization.md:39] [E: packages/coding-agent/docs/containerization.md:40]。`/workspace` 下的文件变化会 write through to the host,所以 Gondolin example 是工具执行隔离与 VM 运行边界,不是自动 copy-in/copy-out 的文件隔离 [E: packages/coding-agent/docs/containerization.md:41] [I]。

本节点没有把 Gondolin example extension 源码列为 `[E]`,因为 `docs/llm-wiki/pi/index.json` 没有把 `packages/coding-agent/examples/extensions/gondolin` 放入本节点 source [U]。

## Plain Docker:整个 pi 进程在本地容器中

Plain Docker 段建议在需要最简单 local container boundary 时,把 whole `pi` process 放进 Docker [E: packages/coding-agent/docs/containerization.md:47]。示例 `Dockerfile.pi` 基于 `node:24-bookworm-slim`,安装 `bash`、`ca-certificates`、`git`、`ripgrep`,全局安装 `@earendil-works/pi-coding-agent`,工作目录设为 `/workspace`,entrypoint 设为 `pi` [E: packages/coding-agent/docs/containerization.md:52] [E: packages/coding-agent/docs/containerization.md:55] [E: packages/coding-agent/docs/containerization.md:57] [E: packages/coding-agent/docs/containerization.md:59] [E: packages/coding-agent/docs/containerization.md:60]。

运行示例把 `ANTHROPIC_API_KEY` 传入容器,把宿主当前目录 bind mount 到 `/workspace`,并用 named volume `pi-agent-home` 挂载容器内 `/root/.pi/agent` [E: packages/coding-agent/docs/containerization.md:68] [E: packages/coding-agent/docs/containerization.md:69] [E: packages/coding-agent/docs/containerization.md:70] [E: packages/coding-agent/docs/containerization.md:71]。文档明确说 `-v "$PWD:/workspace"` 会让 Docker 内 `/workspace` 的读写直接影响 host files,类似 Gondolin example [E: packages/coding-agent/docs/containerization.md:75]。

对于 agent home,文档建议如果需要 container-local settings and sessions,就为 `/root/.pi/agent` 使用 named volume;如果挂载 host `~/.pi/agent`,容器会接触 host auth and session files [E: packages/coding-agent/docs/containerization.md:77]。因此 Plain Docker 的隔离强度取决于传入的环境变量、bind mount、volume 和容器 runtime 策略;pi 文档只给出示例和注意事项,不是完整 Docker hardening guide [I]。

## OpenShell:整个 pi 进程在 policy-controlled sandbox 中

OpenShell 段建议在需要 filesystem、process、network、credential 和 inference controls 的 policy-controlled sandbox 时使用 NVIDIA OpenShell [E: packages/coding-agent/docs/containerization.md:81]。OpenShell 可以通过 Docker、Podman、VM runtime backed local gateway 运行 sandbox,也可以通过 remote Kubernetes gateway 运行;每个 sandbox 都要求 active gateway [E: packages/coding-agent/docs/containerization.md:82] [E: packages/coding-agent/docs/containerization.md:84]。

示例先注册并选择 gateway,再用 `openshell sandbox create --name pi-sandbox --from pi -- pi` 在 OpenShell sandbox 内启动 `pi` [E: packages/coding-agent/docs/containerization.md:88] [E: packages/coding-agent/docs/containerization.md:89] [E: packages/coding-agent/docs/containerization.md:95]。在这种模式中,文档明确说 whole `pi` process runs inside the sandbox,built-in tools、`!` commands 和 extension tools 都在 OpenShell boundary 内执行 [E: packages/coding-agent/docs/containerization.md:98] [E: packages/coding-agent/docs/containerization.md:99]。

remote gateway 的文件语义不同:如果 gateway 是 remote,project files 不从 host bind-mounted,所以 sandbox 中写入不会反映到本机;文档建议在 sandbox 内 clone repository,或使用 OpenShell upload/download 命令在 host 与 sandbox 之间传文件 [E: packages/coding-agent/docs/containerization.md:101] [E: packages/coding-agent/docs/containerization.md:102] [E: packages/coding-agent/docs/containerization.md:105] [E: packages/coding-agent/docs/containerization.md:106]。OpenShell providers 还可以把 raw model API keys 留在 sandbox 外;配置 inference routing 后,sandbox 内代码可以调用 `https://inference.local`,由 gateway 注入 configured provider credentials upstream,而 Pi 需要配置对应 OpenAI-compatible 或 Anthropic-compatible endpoint 才会走这条 route [E: packages/coding-agent/docs/containerization.md:109] [E: packages/coding-agent/docs/containerization.md:110] [E: packages/coding-agent/docs/containerization.md:111]。

本节点只把这些 OpenShell 说法作为 pi 用户文档中的公开使用模式;OpenShell gateway 的 policy enforcement、credential injection 和 inference routing 实现没有在本节点 index source 中复核 [U]。

## index source 中的 redraws extension

`docs/llm-wiki/pi/index.json` 把 `.pi/extensions/redraws.ts` 列为本节点 source,但该文件的内容只是注册 `/tui` command,在有 UI 时读取 `tui.fullRedraws`,再通过 `ctx.ui.notify()` 展示 TUI full redraw stats [E: .pi/extensions/redraws.ts:10] [E: .pi/extensions/redraws.ts:11] [E: .pi/extensions/redraws.ts:16] [E: .pi/extensions/redraws.ts:17] [E: .pi/extensions/redraws.ts:21]。

该 source 没有出现 Docker、Gondolin、OpenShell、sandbox、permission boundary 或 containerization 逻辑;它更像 index source 误配,而不是容器化主题的证据来源 [U]。

## 未核边界

本节点按 index source 只核 `packages/coding-agent/docs/containerization.md` 和 `.pi/extensions/redraws.ts`。原草稿中来自 `README.md`、`packages/coding-agent/docs/security.md`、`packages/coding-agent/examples/extensions/sandbox/index.ts`、`packages/coding-agent/src/core/tools/bash.ts`、`packages/coding-agent/docs/extensions.md` 和 `package.json` 的 `[E]` 断言没有继续作为本节点显式证据保留;这些内容应由各自 source 覆盖的 sibling 节点或后续 index reconcile 处理 [U]。

## 跨包关系

`surface.misc.security` 应覆盖 project trust、默认本地权限、无内置 sandbox 和不可信工作负载建议。本节点只覆盖 containerization 文档中直接列出的运行模式和 mount/provider 注意事项 [I]。

[surface.extensions.api](../extensions/api.md) 应覆盖 extension API 的通用注册、事件和工具替换机制。本节点只引用 containerization 文档里对 Gondolin extension 的用户面描述,不从扩展 API 源码证明它如何实现覆盖 [I]。

## Sources

- packages/coding-agent/docs/containerization.md
- .pi/extensions/redraws.ts

## 相关

- [surface.misc.security](security.md): 安全模型 sibling,应解释默认本地权限、project trust 与无内置 sandbox 的整体边界。
- [surface.extensions.api](../extensions/api.md): extension API sibling,应解释 extension 如何注册工具、命令、事件和运行时贡献点。
