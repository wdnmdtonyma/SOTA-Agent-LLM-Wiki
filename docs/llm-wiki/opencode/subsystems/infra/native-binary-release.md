---
id: infra.native-binary-release
title: 原生二进制与发布(Bun.build + npm/Docker/Homebrew/AUR)
kind: subsystem
tier: T2
v: na
source:
  - packages/opencode/script/build.ts
  - packages/opencode/script/publish.ts
  - packages/opencode/package.json
  - install
  - .github/workflows/publish.yml
symbols:
  - allTargets
  - createEmbeddedWebUIBundle
  - publish
  - install.sh
related:
  - persistence.installation
  - infra.ci-workflows
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> 原生二进制与发布节点描述 V1 CLI package `packages/opencode` 怎样通过 `Bun.build({ compile })` 产出跨平台 `opencode` 可执行文件, 再发布到 npm optional dependencies、GitHub Releases、Docker、Homebrew 和 AUR。

## 能回答的问题

- `packages/opencode/script/build.ts` 产出哪些平台 target?
- CLI 二进制怎样把 Web UI bundle 嵌进可执行文件?
- npm wrapper `opencode-ai` 如何通过 optional dependencies 分发平台包?
- `install` 脚本怎样选择 glibc/musl 与 AVX2 baseline binary?
- GitHub Actions 发布流水线如何衔接 CLI、Desktop 和 package registry?

## 职责边界

`packages/opencode/package.json` 声明 npm 包名 `opencode`, manifest version 字段, 以及 `bin.opencode` 指向 `./bin/opencode` [E: packages/opencode/package.json:4] [E: packages/opencode/package.json:3] [E: packages/opencode/package.json:19]。`build` script 运行 `bun run script/build.ts`, 这是 CLI native binary build 的入口 [E: packages/opencode/package.json:14]。

V1/V2 关系: 这个发布链路打包的是 V1 CLI package `packages/opencode`。V2 `@opencode/v2` 代码如果被 V1 package import, 会随 bundle 进入产物; 但 release script 本身不决定 session kernel 的默认执行路径 [I]。

## 技术栈

- Bun compile: `script/build.ts` 对每个 target 调用 `Bun.build`, 并在 `compile.target` 和 `compile.outfile` 指定 Bun native target 与 `dist/<name>/bin/opencode` [E: packages/opencode/script/build.ts:168] [E: packages/opencode/script/build.ts:177] [E: packages/opencode/script/build.ts:182] [E: packages/opencode/script/build.ts:183]。
- Solid/OpenTUI build plugin: build script 创建 `createSolidTransformPlugin()` 并作为 Bun plugin 传入 build [E: packages/opencode/script/build.ts:24] [E: packages/opencode/script/build.ts:171]。
- GitHub CLI/npm/docker/git: publish script 使用 `npm view`, `bun pm pack`, `npm publish`, `docker buildx build`, AUR git clone/push, Homebrew tap git clone/push [E: packages/opencode/script/publish.ts:11] [E: packages/opencode/script/publish.ts:22] [E: packages/opencode/script/publish.ts:23] [E: packages/opencode/script/publish.ts:88] [E: packages/opencode/script/publish.ts:131] [E: packages/opencode/script/publish.ts:138] [E: packages/opencode/script/publish.ts:206] [E: packages/opencode/script/publish.ts:210] [E: packages/opencode/script/publish.ts:211]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/opencode/script/build.ts` | native binary builder。构造 embedded Web UI, 枚举 targets, 安装跨平台 native deps, 调用 `Bun.build({ compile })`, smoke test 当前平台, 写每个平台 package manifest [E: packages/opencode/script/build.ts:27] [E: packages/opencode/script/build.ts:53] [E: packages/opencode/script/build.ts:140] [E: packages/opencode/script/build.ts:168] [E: packages/opencode/script/build.ts:202] [E: packages/opencode/script/build.ts:214]。 |
| `packages/opencode/script/publish.ts` | release publisher。发布平台 binary packages 与 wrapper package, 推 Docker image, 生成 AUR PKGBUILD, 更新 Homebrew formula [E: packages/opencode/script/publish.ts:75] [E: packages/opencode/script/publish.ts:79] [E: packages/opencode/script/publish.ts:88] [E: packages/opencode/script/publish.ts:98] [E: packages/opencode/script/publish.ts:147]。 |
| `install` | curl installer。解析版本/本地 binary 参数, 检测 OS/arch/musl/AVX2, 下载 GitHub release asset, 解压到 `$HOME/.opencode/bin`, 可写 shell profile [E: install:39] [E: install:48] [E: install:79] [E: install:117] [E: install:130] [E: install:332] [E: install:334] [E: install:337] [E: install:340] [E: install:343] [E: install:403] [E: install:416] [E: install:421] [E: install:424]。 |
| `.github/workflows/publish.yml` | release CI orchestrator。version job 产出版本, build-cli 构建 CLI 与新 `packages/cli`, sign-cli-windows 签 Windows CLI, build-electron 构建 Desktop, publish job 上传 release assets 并运行 `./script/publish.ts` [E: .github/workflows/publish.yml:35] [E: .github/workflows/publish.yml:66] [E: .github/workflows/publish.yml:92] [E: .github/workflows/publish.yml:93] [E: .github/workflows/publish.yml:155] [E: .github/workflows/publish.yml:175] [E: .github/workflows/publish.yml:313] [E: .github/workflows/publish.yml:325] [E: .github/workflows/publish.yml:338] [E: .github/workflows/publish.yml:498] [E: .github/workflows/publish.yml:509] [E: .github/workflows/publish.yml:511]。 |

## 数据模型

`allTargets` 是 build matrix。当前枚举 12 个 CLI target: linux arm64/x64/x64-baseline, linux arm64-musl/x64-musl/x64-baseline-musl, darwin arm64/x64/x64-baseline, windows arm64/x64/x64-baseline [E: packages/opencode/script/build.ts:60] [E: packages/opencode/script/build.ts:64] [E: packages/opencode/script/build.ts:68] [E: packages/opencode/script/build.ts:73] [E: packages/opencode/script/build.ts:78] [E: packages/opencode/script/build.ts:83] [E: packages/opencode/script/build.ts:89] [E: packages/opencode/script/build.ts:93] [E: packages/opencode/script/build.ts:97] [E: packages/opencode/script/build.ts:102] [E: packages/opencode/script/build.ts:106] [E: packages/opencode/script/build.ts:110]。

每个平台 package manifest 包含 `name`, `version`, `preferUnplugged`, `os`, `cpu`, optional `libc`, 并以 `binaries[name] = Script.version` 记录给 publish script 使用 [E: packages/opencode/script/build.ts:218] [E: packages/opencode/script/build.ts:219] [E: packages/opencode/script/build.ts:220] [E: packages/opencode/script/build.ts:221] [E: packages/opencode/script/build.ts:222] [E: packages/opencode/script/build.ts:223] [E: packages/opencode/script/build.ts:229]。

wrapper npm package 在 `publish.ts` 写成 `${pkg.name}-ai`, `bin.opencode` 指向 `./bin/opencode.exe`, `postinstall` 运行 `node ./postinstall.mjs`, `optionalDependencies` 填入平台 binary package map [E: packages/opencode/script/publish.ts:57] [E: packages/opencode/script/publish.ts:59] [E: packages/opencode/script/publish.ts:62] [E: packages/opencode/script/publish.ts:68]。

## 控制流

1. build script 解析 `--single`, `--baseline`, `--skip-install`, `--sourcemaps`, `--skip-embed-web-ui` flags [E: packages/opencode/script/build.ts:20] [E: packages/opencode/script/build.ts:21] [E: packages/opencode/script/build.ts:22] [E: packages/opencode/script/build.ts:23] [E: packages/opencode/script/build.ts:25]。
2. 默认构建 Web UI embed map: 进入 `packages/app`, 用 `OPENCODE_CHANNEL=${Script.channel}` 跑 build, 扫描 `dist`, 为每个文件生成 `with { type: "file" }` import 和 export map [E: packages/opencode/script/build.ts:29] [E: packages/opencode/script/build.ts:31] [E: packages/opencode/script/build.ts:32] [E: packages/opencode/script/build.ts:38] [E: packages/opencode/script/build.ts:45]。
3. 非 `--single` 时构建所有 `allTargets`; `--single` 时只保留当前 `process.platform/process.arch`, 默认跳过 baseline 与 abi-specific target [E: packages/opencode/script/build.ts:116] [E: packages/opencode/script/build.ts:118] [E: packages/opencode/script/build.ts:124] [E: packages/opencode/script/build.ts:129]。
4. build script 为跨平台 native deps 运行 `bun install --os="*" --cpu="*"` 安装 OpenTUI、Parcel watcher、FFF Bun 包 [E: packages/opencode/script/build.ts:141] [E: packages/opencode/script/build.ts:142] [E: packages/opencode/script/build.ts:143]。
5. 每个 target 的 Bun compile 定义 `FFF_LIBC`, `OPENCODE_VERSION`, `OPENCODE_MODELS_DEV`, OpenTUI worker path, opencode worker path, channel, Linux libc [E: packages/opencode/script/build.ts:190] [E: packages/opencode/script/build.ts:191] [E: packages/opencode/script/build.ts:192] [E: packages/opencode/script/build.ts:193] [E: packages/opencode/script/build.ts:194] [E: packages/opencode/script/build.ts:195] [E: packages/opencode/script/build.ts:196]。
6. 当前平台 binary 会执行 `opencode --version` smoke test, failure 直接 exit 1 [E: packages/opencode/script/build.ts:202] [E: packages/opencode/script/build.ts:206] [E: packages/opencode/script/build.ts:210]。
7. release 模式下 build script 对 Linux target 产出 `.tar.gz`, 其它 target 产出 `.zip`, 并通过 `gh release upload` 推到 GitHub release [E: packages/opencode/script/build.ts:232] [E: packages/opencode/script/build.ts:235] [E: packages/opencode/script/build.ts:237] [E: packages/opencode/script/build.ts:240]。
8. publish script 先 publish 每个平台 package, 再 publish wrapper `opencode-ai`, 然后非 preview 时推 Docker image、AUR、Homebrew [E: packages/opencode/script/publish.ts:75] [E: packages/opencode/script/publish.ts:79] [E: packages/opencode/script/publish.ts:87] [E: packages/opencode/script/publish.ts:127] [E: packages/opencode/script/publish.ts:199]。

## Installer 流程

`install` 默认安装到 `$HOME/.opencode/bin` [E: install:68]。没有 `--binary` 时, installer 把 Darwin/Linux/Windows shell OS 标准化成 `darwin/linux/windows`, 把 `aarch64` 转 `arm64`, 把 `x86_64` 转 `x64`, 并在 Rosetta 下把 macOS x64 改成 arm64 [E: install:79] [E: install:82] [E: install:83] [E: install:84] [E: install:87] [E: install:88] [E: install:91] [E: install:95] [E: install:98]。

Linux 会检测 Alpine 与 `ldd --version` 中的 musl [E: install:117] [E: install:119] [E: install:124]。x64 会检测 AVX2, Linux 读 `/proc/cpuinfo`, macOS 读 `hw.optional.avx2_0`, Windows 调 PowerShell `IsProcessorFeaturePresent(40)` [E: install:130] [E: install:133] [E: install:139] [E: install:146]。最终 target 会按 `baseline` 和 `musl` 后缀拼接 filename [E: install:160] [E: install:162] [E: install:165] [E: install:168]。

## 设计动机与权衡

build script 把 Web UI 静态文件转成 Bun file imports 并传入 `Bun.build.files`, 这让 single native binary 能内嵌 Web UI, 同时保留 `--skip-embed-web-ui` 给 Desktop/Nix 等不需要 embedded UI 的场景 [E: packages/opencode/script/build.ts:25] [E: packages/opencode/script/build.ts:51] [E: packages/opencode/script/build.ts:187]。`baseline` targets 为没有 AVX2 的 x64 CPU 保留兼容 binary, installer 的 AVX2 探测负责把用户导向 baseline asset [E: packages/opencode/script/build.ts:70] [E: install:130] [I]。

## Gotcha

- `packages/cli` 是独立的新 CLI host, publish workflow 同时跑 `./packages/opencode/script/build.ts` 和 `./packages/cli/script/build.ts`; 本节点覆盖的是 `packages/opencode` native binary 发行链路 [E: .github/workflows/publish.yml:92] [E: .github/workflows/publish.yml:93]。
- Windows CLI release asset 会在单独 job 中签名并重新 zip, build job 产出的 windows artifact 不是最终 release zip [E: .github/workflows/publish.yml:155] [E: .github/workflows/publish.yml:191] [E: .github/workflows/publish.yml:205]。
- `install` 支持本地 `--binary`, 这条路径会跳过下载和平台检测, 直接复制到 install dir [E: install:72] [E: install:348] [E: install:350]。

## Sources

- `packages/opencode/script/build.ts`
- `packages/opencode/script/publish.ts`
- `packages/opencode/package.json`
- `install`
- `.github/workflows/publish.yml`

## 相关

- [安装与升级](../persistence/installation.md)
- [CI/CD workflows](ci-workflows.md)
