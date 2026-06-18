---
id: infra.ci-workflows
title: CI/CD workflows(~26 GH Actions)
kind: subsystem
tier: T2
v: na
source:
  - .github/workflows/
  - .github/workflows/test.yml
  - .github/workflows/typecheck.yml
  - .github/workflows/publish.yml
  - .github/workflows/deploy.yml
  - .github/workflows/storybook.yml
  - .github/workflows/containers.yml
  - .github/workflows/beta.yml
  - .github/workflows/nix-eval.yml
  - .github/workflows/nix-hashes.yml
symbols:
  - test
  - typecheck
  - publish
  - deploy
  - nix-eval
  - nix-hashes
related:
  - infra.native-binary-release
evidence: explicit
status: verified
updated: 355a0bcf5
---

> CI/CD workflows 节点描述 `.github/workflows` 中约 26 个 GitHub Actions workflow 的主要交付路径: tests/typecheck, SST deploy, CLI/Desktop publish, Storybook build, container image build, beta branch sync, Nix evaluation and hash refresh。

## 能回答的问题

- PR 与 dev branch 上跑哪些测试和类型检查?
- publish workflow 怎样构建 CLI、签 Windows binary、构建 Desktop 并发布?
- `bun sst deploy` 在哪个 workflow 中运行?
- Storybook、containers、beta、Nix 的 workflow 边界是什么?
- Nix hash workflow 为什么用 native runners?

## 职责边界

CI/CD 层只编排 GitHub-hosted 或 Blacksmith runners 上的构建、验证和发布, 不实现 opencode runtime。`.github/workflows/` 当前包含 26 个 `.yml` workflow 文件 [E: .github/workflows/]。本节点覆盖影响构建和发布的主路径; issue/PR triage、docs locale sync、review bots 等 workflow 属于仓库运营自动化 [I]。

V1/V2 关系: CI 跑的是整个 monorepo 的 tests/typecheck/build/publish。它会覆盖 V1 `packages/opencode`、V2 `packages/core`、clients 和 infra 的 package-level commands, 但 CI workflow 自身不决定 V1/V2 默认执行路径 [I]。

## 技术栈

- GitHub Actions YAML: workflows 使用 `actions/checkout`, repo-local `.github/actions/setup-bun`, `actions/setup-node`, `actions/cache`, Docker buildx/QEMU, Azure signing, AWS OIDC credentials, Nix installer actions [E: .github/workflows/test.yml:39] [E: .github/workflows/test.yml:49] [E: .github/workflows/deploy.yml:26] [E: .github/workflows/test.yml:57] [E: .github/workflows/publish.yml:427] [E: .github/workflows/publish.yml:148] [E: .github/workflows/deploy.yml:30] [E: .github/workflows/nix-eval.yml:25]。
- Bun command surface: test/typecheck/deploy/storybook/containers/publish workflows all enter repo scripts through Bun [E: .github/workflows/test.yml:68] [E: .github/workflows/typecheck.yml:21] [E: .github/workflows/deploy.yml:36] [E: .github/workflows/storybook.yml:38] [E: .github/workflows/containers.yml:42] [E: .github/workflows/publish.yml:510]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `.github/workflows/test.yml` | PR/dev test gate。unit job 在 Linux 和 Windows 跑 `bun turbo test`; Linux 额外在 `packages/opencode` 跑 `bun run test:httpapi`; e2e job 在 Linux/Windows 跑 `bun --cwd packages/app test:e2e:local` 并上传 Playwright artifacts [E: .github/workflows/test.yml:24] [E: .github/workflows/test.yml:30] [E: .github/workflows/test.yml:66] [E: .github/workflows/test.yml:72] [E: .github/workflows/test.yml:77] [E: .github/workflows/test.yml:130] [E: .github/workflows/test.yml:136]。 |
| `.github/workflows/typecheck.yml` | PR/dev typecheck gate。push/pull_request 都限制 dev branch, command 是 `bun typecheck` [E: .github/workflows/typecheck.yml:3] [E: .github/workflows/typecheck.yml:5] [E: .github/workflows/typecheck.yml:6] [E: .github/workflows/typecheck.yml:21]。 |
| `.github/workflows/publish.yml` | release orchestration。version job 生成 version/release/tag/repo outputs; build-cli 构建 `packages/opencode` 和 `packages/cli`; sign-cli-windows 做 Azure signing; build-electron matrix 构建 Desktop; publish job 上传 Desktop release assets 并运行 `./script/publish.ts` [E: .github/workflows/publish.yml:35] [E: .github/workflows/publish.yml:65] [E: .github/workflows/publish.yml:89] [E: .github/workflows/publish.yml:120] [E: .github/workflows/publish.yml:220] [E: .github/workflows/publish.yml:497] [E: .github/workflows/publish.yml:510]。 |
| `.github/workflows/deploy.yml` | hosted infra deploy。dev/production branch push 或 manual dispatch 触发, job 条件限制仓库和 ref, 通过 AWS OIDC 配置 credentials, 运行 `bun sst deploy --stage=${{ github.ref_name }}` [E: .github/workflows/deploy.yml:3] [E: .github/workflows/deploy.yml:5] [E: .github/workflows/deploy.yml:7] [E: .github/workflows/deploy.yml:18] [E: .github/workflows/deploy.yml:30] [E: .github/workflows/deploy.yml:36]。 |
| `.github/workflows/storybook.yml` | UI documentation build gate。只在 Storybook/UI/root dependency 相关 paths 变化时触发, command 是 `bun --cwd packages/storybook build` [E: .github/workflows/storybook.yml:6] [E: .github/workflows/storybook.yml:10] [E: .github/workflows/storybook.yml:11] [E: .github/workflows/storybook.yml:37]。 |
| `.github/workflows/containers.yml` | container image build。dev branch 上 containers 相关 paths 触发, 登录 GHCR, 运行 `packages/containers/script/build.ts --push` [E: .github/workflows/containers.yml:4] [E: .github/workflows/containers.yml:8] [E: .github/workflows/containers.yml:34] [E: .github/workflows/containers.yml:42]。 |
| `.github/workflows/beta.yml` | beta sync automation。hourly cron 或 manual dispatch, 安装 `opencode-ai`, 然后运行 `bun script/beta.ts` [E: .github/workflows/beta.yml:4] [E: .github/workflows/beta.yml:6] [E: .github/workflows/beta.yml:30] [E: .github/workflows/beta.yml:37]。 |
| `.github/workflows/nix-eval.yml` / `.github/workflows/nix-hashes.yml` | Nix validation and hash refresh。nix-eval 评估 packages/devShells; nix-hashes 用四个 native runner 计算 node_modules fixed-output hash 并提交 `nix/hashes.json` [E: .github/workflows/nix-eval.yml:28] [E: .github/workflows/nix-eval.yml:40] [E: .github/workflows/nix-eval.yml:81] [E: .github/workflows/nix-hashes.yml:25] [E: .github/workflows/nix-hashes.yml:32] [E: .github/workflows/nix-hashes.yml:120]。 |

## 数据模型

test workflow 的 unit matrix 有 Linux 和 Windows 两个 host, e2e matrix 也有 Linux 和 Windows 两个 host [E: .github/workflows/test.yml:29] [E: .github/workflows/test.yml:31] [E: .github/workflows/test.yml:32] [E: .github/workflows/test.yml:82] [E: .github/workflows/test.yml:84] [E: .github/workflows/test.yml:85]。publish workflow 的 Desktop matrix 覆盖 macOS x64/arm64、Windows arm64/x64、Linux x64/arm64 六个 host-target rows [E: .github/workflows/publish.yml:235] [E: .github/workflows/publish.yml:237] [E: .github/workflows/publish.yml:241] [E: .github/workflows/publish.yml:246] [E: .github/workflows/publish.yml:249] [E: .github/workflows/publish.yml:252] [E: .github/workflows/publish.yml:255]。

Nix hash workflow 的 matrix 覆盖 `x86_64-linux`, `aarch64-linux`, `x86_64-darwin`, `aarch64-darwin`; workflow 注释指出 native runners 是必需的, 因为 Bun install cross-compilation flags 不会产生 byte-identical `node_modules` [E: .github/workflows/nix-hashes.yml:25] [E: .github/workflows/nix-hashes.yml:32] [E: .github/workflows/nix-hashes.yml:34] [E: .github/workflows/nix-hashes.yml:36] [E: .github/workflows/nix-hashes.yml:38]。

## 控制流

1. PR/dev validation 先通过 test workflow: checkout, setup Node 24, setup Bun, cache Turbo, run unit tests, Linux 再跑 HttpApi exerciser gates [E: .github/workflows/test.yml:44] [E: .github/workflows/test.yml:49] [E: .github/workflows/test.yml:57] [E: .github/workflows/test.yml:66] [E: .github/workflows/test.yml:72]。
2. App e2e job 读取 catalog 里的 Playwright version, 缓存 browser, Linux 安装 system deps, 然后跑 local e2e [E: .github/workflows/test.yml:107] [E: .github/workflows/test.yml:113] [E: .github/workflows/test.yml:120] [E: .github/workflows/test.yml:130]。
3. publish flow 的 version job 可安装当前 release `opencode-ai`, 运行 `./script/version.ts`, 输出 version/release/tag/repo [E: .github/workflows/publish.yml:52] [E: .github/workflows/publish.yml:56] [E: .github/workflows/publish.yml:65]。
4. build-cli job 运行 `./packages/opencode/script/build.ts` 和 `./packages/cli/script/build.ts`, 上传 Linux/macOS CLI、Windows CLI、新 CLI preview artifacts [E: .github/workflows/publish.yml:92] [E: .github/workflows/publish.yml:93] [E: .github/workflows/publish.yml:100] [E: .github/workflows/publish.yml:107] [E: .github/workflows/publish.yml:112]。
5. sign-cli-windows job 对三个 Windows CLI exe 调 Azure artifact signing, 验证 Authenticode signature, 重新打 zip, release 时上传 Windows CLI assets [E: .github/workflows/publish.yml:155] [E: .github/workflows/publish.yml:175] [E: .github/workflows/publish.yml:191] [E: .github/workflows/publish.yml:199]。
6. build-electron job 先在 `packages/desktop` 运行 `scripts/prepare.ts`, 再 `bun run build`, release 时用 electron-builder package, 最后上传 Desktop artifacts [E: .github/workflows/publish.yml:313] [E: .github/workflows/publish.yml:324] [E: .github/workflows/publish.yml:337] [E: .github/workflows/publish.yml:396]。
7. publish job 下载 CLI/Desktop artifacts, 上传 Desktop release assets, 然后执行 root `./script/publish.ts`; npm/Docker/Homebrew/AUR 等后续发布面由 release 脚本体系继续展开 [E: .github/workflows/publish.yml:438] [E: .github/workflows/publish.yml:464] [E: .github/workflows/publish.yml:497] [E: .github/workflows/publish.yml:510] [I]。

## 设计动机与权衡

test workflow 的 concurrency 对 dev branch 使用 run id, 对 PR/其它 branch 使用 PR number/ref 并 cancel stale runs, 这是为了不让默认分支历史被 cancelled checks 污染, 同时让 PR 快速收敛到最新 run [E: .github/workflows/test.yml:10] [E: .github/workflows/test.yml:13] [E: .github/workflows/test.yml:14] [I]。Nix hashes workflow 通过 fakeHash build 提取正确 hash, 再由 update-hashes job 提交 `nix/hashes.json`, 这让 fixed-output derivation 的 hash 更新可自动化 [E: .github/workflows/nix-hashes.yml:63] [E: .github/workflows/nix-hashes.yml:65] [E: .github/workflows/nix-hashes.yml:120] [E: .github/workflows/nix-hashes.yml:155]。

## Gotcha

- publish workflow 同时构建 legacy/current CLI `packages/opencode` 和独立新 CLI host `packages/cli`; 看到 `opencode-preview-cli` artifact 不应误判为 V1 package 输出 [E: .github/workflows/publish.yml:92] [E: .github/workflows/publish.yml:115]。
- `deploy.yml` 只在 `anomalyco/opencode` 且 ref 为 dev 或 production 时真正部署 [E: .github/workflows/deploy.yml:18]。
- `storybook.yml` 是 path-filtered build gate, 不是全 repo UI test runner [E: .github/workflows/storybook.yml:6] [E: .github/workflows/storybook.yml:14]。

## Sources

- `.github/workflows/`
- `.github/workflows/test.yml`
- `.github/workflows/typecheck.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/storybook.yml`
- `.github/workflows/containers.yml`
- `.github/workflows/beta.yml`
- `.github/workflows/nix-eval.yml`
- `.github/workflows/nix-hashes.yml`

## 相关

- [原生二进制与发布](native-binary-release.md)
