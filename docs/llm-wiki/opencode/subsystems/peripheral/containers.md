---
id: peripheral.containers
title: Containers(CI Dockerfiles)
kind: subsystem
tier: T2
v: na
source:
  - packages/containers/
  - .github/workflows/containers.yml
  - package.json
symbols: [build]
related: [infra.ci-workflows]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `packages/containers` 定义 CI 预构建 Docker images，用来把 Linux GitHub Actions 中安装慢的大型依赖烘进 `job.container` 可复用镜像。

## 能回答的问题

- 这个包有哪些 CI image，各自包含什么？
- `bun ./packages/containers/script/build.ts --push` 如何构建多架构镜像？
- build script 如何从根 packageManager 获取 Bun 版本？
- containers workflow 什么时候触发？
- 哪些场景不适合这些 Linux containers？

## 职责边界

`packages/containers/README.md` 明确说明这些 images 用于加速 GitHub Actions，把 large, slow-to-install dependencies 预装进去，并面向能使用 `job.container` 的 Linux jobs [E: packages/containers/README.md:3] [E: packages/containers/README.md:4] [E: packages/containers/README.md:5]。它不是 opencode runtime image，也不包含 session/tool/server 代码；它是 CI 基础设施资产 [I]。

根 `package.json` 的 `packageManager` 是 `bun@1.3.14`，build script 会读取这个字段并把 Bun 版本传入 `bun-node` image build arg [E: package.json:7] [E: packages/containers/script/build.ts:15] [E: packages/containers/script/build.ts:16] [E: packages/containers/script/build.ts:17] [E: packages/containers/script/build.ts:54] [E: packages/containers/script/build.ts:58]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/containers/base/Dockerfile` | Ubuntu 24.04 + common build tools。 |
| `packages/containers/bun-node/Dockerfile` | 基于 `base`，安装 Node.js 24.4.0 与 Bun。 |
| `packages/containers/rust/Dockerfile` | 基于 `bun-node`，安装 Rust stable minimal profile。 |
| `packages/containers/tauri-linux/Dockerfile` | 基于 `rust`，安装 Tauri Linux GUI build deps。 |
| `packages/containers/publish/Dockerfile` | 基于 `bun-node`，安装 Docker CLI 与 AUR tooling。 |
| `packages/containers/script/build.ts` | 顺序构建/推送五个 images。 |
| `.github/workflows/containers.yml` | 变更触发和 GHCR publish workflow。 |

## Image catalog

| Image | Base | 关键内容 |
|---|---|---|
| `base` | `ubuntu:24.04` | `build-essential`、`ca-certificates`、`curl`、`git`、`jq`、`openssh-client`、`pkg-config`、`python3`、`unzip`、`xz-utils`、`zip` [E: packages/containers/base/Dockerfile:1] [E: packages/containers/base/Dockerfile:7] [E: packages/containers/base/Dockerfile:8] [E: packages/containers/base/Dockerfile:9] [E: packages/containers/base/Dockerfile:10] [E: packages/containers/base/Dockerfile:11] [E: packages/containers/base/Dockerfile:12] [E: packages/containers/base/Dockerfile:13] [E: packages/containers/base/Dockerfile:14] [E: packages/containers/base/Dockerfile:15] [E: packages/containers/base/Dockerfile:16] [E: packages/containers/base/Dockerfile:17]。 |
| `bun-node` | `${REGISTRY}/build/base:24.04` | `NODE_VERSION=24.4.0`、`BUN_VERSION=1.3.14` defaults，安装 Node tarball 并运行 Bun install script [E: packages/containers/bun-node/Dockerfile:2] [E: packages/containers/bun-node/Dockerfile:6] [E: packages/containers/bun-node/Dockerfile:7] [E: packages/containers/bun-node/Dockerfile:16] [E: packages/containers/bun-node/Dockerfile:21]。 |
| `rust` | `${REGISTRY}/build/bun-node:24.04` | `rustup` stable minimal profile，设置 `CARGO_HOME` 和 `RUSTUP_HOME` [E: packages/containers/rust/Dockerfile:2] [E: packages/containers/rust/Dockerfile:4] [E: packages/containers/rust/Dockerfile:6] [E: packages/containers/rust/Dockerfile:7] [E: packages/containers/rust/Dockerfile:11]。 |
| `tauri-linux` | `${REGISTRY}/build/rust:24.04` | `libappindicator3-dev`、`libwebkit2gtk-4.1-dev`、`librsvg2-dev`、`patchelf` [E: packages/containers/tauri-linux/Dockerfile:2] [E: packages/containers/tauri-linux/Dockerfile:8] [E: packages/containers/tauri-linux/Dockerfile:9] [E: packages/containers/tauri-linux/Dockerfile:10] [E: packages/containers/tauri-linux/Dockerfile:11]。 |
| `publish` | `${REGISTRY}/build/bun-node:24.04` | `docker.io` 与 `pacman-package-manager`，服务发布/AUR 工作流 [E: packages/containers/publish/Dockerfile:2] [E: packages/containers/publish/Dockerfile:8] [E: packages/containers/publish/Dockerfile:9]。 |

README 的 image list 包含 `base`、`bun-node`、`rust`、`tauri-linux`、`publish` 五个镜像 [E: packages/containers/README.md:9] [E: packages/containers/README.md:10] [E: packages/containers/README.md:11] [E: packages/containers/README.md:12] [E: packages/containers/README.md:13]。

## Build script 控制流

1. `script/build.ts` 是 Bun shebang script，先定位 repo root 并 `process.chdir(rootDir)` [E: packages/containers/script/build.ts:1] [E: packages/containers/script/build.ts:7] [E: packages/containers/script/build.ts:8]。
2. `REGISTRY` 默认 `ghcr.io/anomalyco`，`TAG` 默认 `24.04`，`push` 来自 `--push` 或 `PUSH=1` [E: packages/containers/script/build.ts:10] [E: packages/containers/script/build.ts:11] [E: packages/containers/script/build.ts:12]。
3. script 读取根 `package.json`，要求 `packageManager` 以 `bun@` 开头，并提取 Bun version；缺失会 throw [E: packages/containers/script/build.ts:15] [E: packages/containers/script/build.ts:16] [E: packages/containers/script/build.ts:17] [E: packages/containers/script/build.ts:18]。
4. image 顺序固定为 `base`、`bun-node`、`rust`、`tauri-linux`、`publish`，这使 child image 的 base 先被构建或推送 [E: packages/containers/script/build.ts:20] [I]。
5. `--push` 时 script 确保 Docker Buildx builder `opencode` 存在并启用；已有 builder 时直接 `docker buildx use opencode` [E: packages/containers/script/build.ts:23] [E: packages/containers/script/build.ts:25] [E: packages/containers/script/build.ts:26] [E: packages/containers/script/build.ts:29]。
6. push mode 使用 `linux/amd64,linux/arm64` platform；local mode 使用普通 `docker build` [E: packages/containers/script/build.ts:34] [E: packages/containers/script/build.ts:42] [E: packages/containers/script/build.ts:45] [E: packages/containers/script/build.ts:46]。
7. `bun-node` build 特别传 `--build-arg BUN_VERSION=${bun}`，其他非 base images 只传 `REGISTRY` [E: packages/containers/script/build.ts:54] [E: packages/containers/script/build.ts:58] [E: packages/containers/script/build.ts:66] [E: packages/containers/script/build.ts:70]。

## CI workflow

`.github/workflows/containers.yml` 在 push 到 `dev` 且 paths 命中 `packages/containers/**`、workflow 自身或根 `package.json` 时触发，也支持手动 `workflow_dispatch` [E: .github/workflows/containers.yml:3] [E: .github/workflows/containers.yml:4] [E: .github/workflows/containers.yml:6] [E: .github/workflows/containers.yml:8] [E: .github/workflows/containers.yml:9] [E: .github/workflows/containers.yml:10] [E: .github/workflows/containers.yml:11]。workflow 使用 `packages: write` 权限、GHCR login、QEMU、Buildx，然后运行 `bun ./packages/containers/script/build.ts --push`，并传入 `REGISTRY` 与 `TAG` [E: .github/workflows/containers.yml:13] [E: .github/workflows/containers.yml:15] [E: .github/workflows/containers.yml:28] [E: .github/workflows/containers.yml:31] [E: .github/workflows/containers.yml:34] [E: .github/workflows/containers.yml:42] [E: .github/workflows/containers.yml:44] [E: .github/workflows/containers.yml:45]。

## 设计动机与权衡

README 的 example `job.container.image` 指向 `ghcr.io/anomalyco/build/bun-node:24.04`，说明这些 image 的 primary consumer 是 GitHub Actions job container [E: packages/containers/README.md:24] [E: packages/containers/README.md:29]。README 也记录这些 images 只帮助 Linux jobs，macOS 和 Windows jobs 不能跑在 Linux containers 内 [E: packages/containers/README.md:34] [E: packages/containers/README.md:35]。

`--push` 选择 multi-arch amd64+arm64 Buildx；local build 不构建 multi-arch manifest，这让本地快速验证和 CI publish 走不同路径 [E: packages/containers/README.md:36] [E: packages/containers/script/build.ts:34] [E: packages/containers/script/build.ts:42] [E: packages/containers/script/build.ts:46] [I]。

## Gotcha

- `publish` image 安装 Docker CLI，但 README 提醒如果 job 使用 Docker Buildx，container 需要访问 host Docker daemon 或 DinD privileged mode [E: packages/containers/publish/Dockerfile:8] [E: packages/containers/README.md:37] [E: packages/containers/README.md:38]。
- `bun-node/Dockerfile` 默认 `BUN_VERSION=1.3.14`，但 build script 会用根 `packageManager` 覆盖；如果手动 `docker build` 不传 build arg，可能和根 lockstep 版本偏离 [E: packages/containers/bun-node/Dockerfile:7] [E: packages/containers/script/build.ts:54] [I]。
- Workflow 的 `TAG` 固定为 `24.04`，所以 Ubuntu base tag 和 published image tag 一起表达 OS generation；这不是 opencode app version 是从当前 tag 命名得出的结论 [E: .github/workflows/containers.yml:22] [E: packages/containers/base/Dockerfile:1] [E: packages/containers/README.md:18] [I]。

## Sources

- `packages/containers/README.md`
- `packages/containers/base/Dockerfile`
- `packages/containers/bun-node/Dockerfile`
- `packages/containers/rust/Dockerfile`
- `packages/containers/tauri-linux/Dockerfile`
- `packages/containers/publish/Dockerfile`
- `packages/containers/script/build.ts`
- `.github/workflows/containers.yml`
- `package.json`

## 相关

- `infra.ci-workflows`：containers workflow 是 CI/CD 的一条专门发布线；本节点覆盖 image 内容与 build script。
