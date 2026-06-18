---
id: infra.nix
title: Nix flake 与可复现构建
kind: subsystem
tier: T2
v: na
source:
  - flake.nix
  - nix/opencode.nix
  - nix/desktop.nix
  - nix/node_modules.nix
  - nix/hashes.json
  - nix/scripts/canonicalize-node-modules.ts
  - nix/scripts/normalize-bun-binaries.ts
  - .github/workflows/nix-eval.yml
  - .github/workflows/nix-hashes.yml
symbols:
  - packages.opencode
  - packages.opencode-desktop
  - node_modules_updater
  - hashes.json
related:
  - infra.build-monorepo
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Nix flake 节点描述 opencode 如何用 `flake.nix`、fixed-output `node_modules` derivation、CLI derivation、Desktop derivation 与 CI hash refresh 流水线提供可复现的 Linux/Darwin 构建入口。

## 能回答的问题

- flake 支持哪些 systems, 输出哪些 packages/devShells?
- `nix/node_modules.nix` 怎样把 Bun install 固定为 hashable output?
- Nix CLI package 如何复用 `packages/opencode/script/build.ts --single --skip-install`?
- Desktop derivation 怎样使用 Electron 和 Nix wrapper?
- `nix-hashes.yml` 如何刷新 `nix/hashes.json`?

## 职责边界

Nix 层是 reproducible build packaging, 不实现 terminal agent runtime。`flake.nix` 描述为 `OpenCode development flake`, 输入 nixpkgs unstable, systems 包含 `aarch64-linux`, `x86_64-linux`, `aarch64-darwin`, `x86_64-darwin` [E: flake.nix:2] [E: flake.nix:5] [E: flake.nix:11] [E: flake.nix:12] [E: flake.nix:13] [E: flake.nix:14] [E: flake.nix:15]。

V1/V2 关系: Nix package `opencode` 构建的是 `packages/opencode` CLI binary, 因此承载当前 V1 package 入口; 如果 `packages/opencode` import V2 code, Nix 会随源码一起构建, 但 Nix derivation 不改变默认 session execution [E: nix/opencode.nix:48] [E: nix/opencode.nix:49] [I]。

## 技术栈

- Nix flake outputs: devShells, overlay, packages.default/opencode/opencode-desktop/node_modules_updater [E: flake.nix:21] [E: flake.nix:33] [E: flake.nix:51] [E: flake.nix:59] [E: flake.nix:60] [E: flake.nix:63] [E: flake.nix:67]。
- Bun inside Nix: node_modules derivation uses Bun install with `--frozen-lockfile`, `--ignore-scripts`, platform-specific `--cpu/--os`, then canonicalization scripts [E: nix/node_modules.nix:48] [E: nix/node_modules.nix:51] [E: nix/node_modules.nix:52] [E: nix/node_modules.nix:53] [E: nix/node_modules.nix:58] [E: nix/node_modules.nix:59] [E: nix/node_modules.nix:61] [E: nix/node_modules.nix:62]。
- CI integration: `nix-eval.yml` evaluates flake outputs, `nix-hashes.yml` computes fixed-output hashes and commits updates [E: .github/workflows/nix-eval.yml:28] [E: .github/workflows/nix-hashes.yml:49] [E: .github/workflows/nix-hashes.yml:120] [E: .github/workflows/nix-hashes.yml:155]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `flake.nix` | Flake entry。定义 four-system map, devShell packages, overlay outputs, package outputs, fakeHash updater derivation [E: flake.nix:11] [E: flake.nix:12] [E: flake.nix:13] [E: flake.nix:14] [E: flake.nix:15] [E: flake.nix:17] [E: flake.nix:21] [E: flake.nix:33] [E: flake.nix:51] [E: flake.nix:67]。 |
| `nix/node_modules.nix` | Fixed-output dependency closure。读取 per-system hash, 从 repo fileset 构建 source, 用 Bun install filtered packages, 输出所有 node_modules directories [E: nix/node_modules.nix:6] [E: nix/node_modules.nix:25] [E: nix/node_modules.nix:51] [E: nix/node_modules.nix:54] [E: nix/node_modules.nix:69] [E: nix/node_modules.nix:75]。 |
| `nix/opencode.nix` | CLI derivation。复制 fixed node_modules, patch shebangs, 设置 model/version/channel env, 运行 `script/build.ts --single --skip-install`, 安装 binary/schema/completions [E: nix/opencode.nix:30] [E: nix/opencode.nix:40] [E: nix/opencode.nix:49] [E: nix/opencode.nix:50] [E: nix/opencode.nix:58] [E: nix/opencode.nix:77]。 |
| `nix/desktop.nix` | Desktop derivation。复用 opencode source/node_modules/env, 使用 Electron 41, Linux 走 autoPatchelf, Darwin 走 ad-hoc signing hook, build `packages/desktop` 并用 electron-builder `--dir` package [E: nix/desktop.nix:14] [E: nix/desktop.nix:18] [E: nix/desktop.nix:30] [E: nix/desktop.nix:32] [E: nix/desktop.nix:65] [E: nix/desktop.nix:71]。 |
| `nix/hashes.json` | per-system fixed-output hashes。四个 supported systems 都有 `nodeModules` hash [E: nix/hashes.json:2] [E: nix/hashes.json:3] [E: nix/hashes.json:4] [E: nix/hashes.json:5] [E: nix/hashes.json:6]。 |
| `nix/scripts/canonicalize-node-modules.ts` | Bun symlink canonicalization。扫描 `node_modules/.bun`, 选每个 package 的 highest semver entry, 重建 `.bun/node_modules` symlinks [E: nix/scripts/canonicalize-node-modules.ts:21] [E: nix/scripts/canonicalize-node-modules.ts:25] [E: nix/scripts/canonicalize-node-modules.ts:43] [E: nix/scripts/canonicalize-node-modules.ts:45] [E: nix/scripts/canonicalize-node-modules.ts:46] [E: nix/scripts/canonicalize-node-modules.ts:47] [E: nix/scripts/canonicalize-node-modules.ts:56] [E: nix/scripts/canonicalize-node-modules.ts:77]。 |
| `nix/scripts/normalize-bun-binaries.ts` | Bun `.bin` normalization。为每个 `.bun/<entry>/node_modules` 重建 `.bin` 目录, 读取 package manifest 的 `bin`, 用 symlink 指向实际脚本 [E: nix/scripts/normalize-bun-binaries.ts:14] [E: nix/scripts/normalize-bun-binaries.ts:19] [E: nix/scripts/normalize-bun-binaries.ts:23] [E: nix/scripts/normalize-bun-binaries.ts:29] [E: nix/scripts/normalize-bun-binaries.ts:85] [E: nix/scripts/normalize-bun-binaries.ts:102]。 |

## 数据模型

`node_modules` derivation 的 version 由 `packages/opencode/package.json` 版本加 git rev 构成, source fileset 只包含 `packages`, `bun.lock`, root `package.json`, `patches`, `install`, `.github/TEAM_MEMBERS` [E: nix/node_modules.nix:13] [E: nix/node_modules.nix:23] [E: nix/node_modules.nix:25] [E: nix/node_modules.nix:29] [E: nix/node_modules.nix:30] [E: nix/node_modules.nix:31] [E: nix/node_modules.nix:32] [E: nix/node_modules.nix:33] [E: nix/node_modules.nix:34]。这个 subset 说明 Nix dependency closure 不把整个 repo 任意文件放入 fixed-output source [I]。

`nix/opencode.nix` 的 runtime wrapper 把 `ripgrep` 加到 PATH, Darwin 还附带 `sysctl`, 因为 Bun 会用 sysctl 检测 Rosetta 2 [E: nix/opencode.nix:61] [E: nix/opencode.nix:65] [E: nix/opencode.nix:67] [E: nix/opencode.nix:68]。`passthru` 暴露 jsonschema path 和 env, 让下游 Nix consumers 读取 package metadata [E: nix/opencode.nix:90] [E: nix/opencode.nix:91] [E: nix/opencode.nix:92]。

Desktop derivation 在 Linux install phase 把 resources/LICENSE 复制到 `$out/opt/opencode-desktop`, 再用 Electron binary wrapper 启动 `resources/app.asar`; Darwin install phase 把 `.app` 放进 `$out/Applications` 并生成 `opencode-desktop` wrapper [E: nix/desktop.nix:83] [E: nix/desktop.nix:85] [E: nix/desktop.nix:86] [E: nix/desktop.nix:88] [E: nix/desktop.nix:90] [E: nix/desktop.nix:91] [E: nix/desktop.nix:94]。

## 控制流

1. `flake.nix` 为每个 supported system 创建 devShell, 默认包含 Bun、Node.js 20、pkg-config、OpenSSL、git [E: flake.nix:21] [E: flake.nix:24] [E: flake.nix:25] [E: flake.nix:26] [E: flake.nix:27] [E: flake.nix:28]。
2. `packages.opencode` 调 `nix/opencode.nix`, 并传入同一个 `node_modules` derivation [E: flake.nix:60] [E: flake.nix:61]。
3. `nix/opencode.nix` build phase 进入 `packages/opencode`, 运行 `bun --bun ./script/build.ts --single --skip-install`, 再生成 `schema.json` [E: nix/opencode.nix:48] [E: nix/opencode.nix:49] [E: nix/opencode.nix:50]。
4. `packages.opencode-desktop` 调 `nix/desktop.nix`, build phase 进入 `packages/desktop`, `bun run build`, 然后 `npx electron-builder --dir` [E: flake.nix:63] [E: nix/desktop.nix:68] [E: nix/desktop.nix:70] [E: nix/desktop.nix:71]。
5. `node_modules_updater` 使用 `node_modules.override { hash = pkgs.lib.fakeHash; }`; CI 通过 fakeHash build 诱发 hash mismatch, 从 build log 提取 `got: sha256-...` [E: flake.nix:67] [E: flake.nix:68] [E: .github/workflows/nix-hashes.yml:63] [E: .github/workflows/nix-hashes.yml:65]。
6. `nix-hashes.yml` 收集四个 hash artifacts 后, 用 `jq` 写入 `nix/hashes.json`, 有变更时提交 `chore: update nix node_modules hashes` [E: .github/workflows/nix-hashes.yml:120] [E: .github/workflows/nix-hashes.yml:128] [E: .github/workflows/nix-hashes.yml:133] [E: .github/workflows/nix-hashes.yml:155] [E: .github/workflows/nix-hashes.yml:156]。

## 设计动机与权衡

Nix `node_modules` derivation 选择 fixed-output hash, 代价是 Bun dependency closure 变化后必须更新 `nix/hashes.json`; 好处是 package builds 可以复制已固定的 node_modules, 避免在 CLI/Desktop derivation 内联网安装依赖 [E: nix/node_modules.nix:75] [E: nix/node_modules.nix:77] [E: nix/opencode.nix:33] [E: nix/desktop.nix:60] [I]。canonicalization scripts 重建 Bun 的 symlink layout 和 `.bin`, 这是为了让 fixed-output hash 不受 Bun 生成链接顺序或 duplicate package entry 影响 [E: nix/scripts/canonicalize-node-modules.ts:61] [E: nix/scripts/normalize-bun-binaries.ts:40] [I]。

## Gotcha

- `nix/opencode.nix` 默认参数里写的是 `./node-modules.nix`, 但 flake 调用时显式传入 `node_modules`; 当前 flake path 的权威依赖闭包来自 `./nix/node_modules.nix` [E: nix/opencode.nix:14] [E: flake.nix:54] [I]。
- `nix-eval.yml` 把 desktop 放在 optional packages, 注释说明暂不把 `desktop` 放入 PACKAGES [E: .github/workflows/nix-eval.yml:41] [E: .github/workflows/nix-eval.yml:42] [E: .github/workflows/nix-eval.yml:43]。
- Nix Desktop package 是 `opencode-desktop`, main program 也是 `opencode-desktop`, 不等同于 CLI `opencode` [E: nix/desktop.nix:17] [E: nix/desktop.nix:107]。

## Sources

- `flake.nix`
- `nix/opencode.nix`
- `nix/desktop.nix`
- `nix/node_modules.nix`
- `nix/hashes.json`
- `nix/scripts/canonicalize-node-modules.ts`
- `nix/scripts/normalize-bun-binaries.ts`
- `.github/workflows/nix-eval.yml`
- `.github/workflows/nix-hashes.yml`

## 相关

- [构建与 monorepo](build-monorepo.md)
