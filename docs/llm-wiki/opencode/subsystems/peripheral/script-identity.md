---
id: peripheral.script-identity
title: script + identity(发布版本逻辑 + 品牌资源)
kind: subsystem
tier: T2
v: na
source:
  - packages/script/
  - packages/identity/
  - package.json
  - .github/TEAM_MEMBERS
symbols: [Script]
related: [infra.native-binary-release]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> `packages/script` 提供发布脚本共享的 channel/version/team identity，`packages/identity` 保存 opencode mark 的 SVG/PNG 品牌资源。

## 能回答的问题

- `Script.version`、`Script.channel`、`Script.preview`、`Script.release` 如何计算？
- 发布脚本如何校验 Bun 版本？
- 哪些 build/publish scripts 消费 `@opencode-ai/script`？
- `TEAM_MEMBERS` 如何进入 release 脚本上下文？
- `packages/identity` 里有哪些品牌资源，是否被源码直接 import？

## 职责边界

`@opencode-ai/script` 是一个很小的 workspace utility package，只 export `./src/index.ts`，依赖 `semver` [E: packages/script/package.json:3] [E: packages/script/package.json:6] [E: packages/script/package.json:12] [E: packages/script/package.json:13]。它的 `package.json` 未声明 `bin`，没有 CLI entrypoint 是从 package manifest 得出的结论 [I]；消费者通过 import `Script` 获取 channel、version、preview、release、team 等发布元数据 [E: packages/script/src/index.ts:60] [E: packages/script/src/index.ts:61] [E: packages/script/src/index.ts:64] [E: packages/script/src/index.ts:67] [E: packages/script/src/index.ts:70] [E: packages/script/src/index.ts:73]。

`packages/identity` 没有 `package.json`，目录中是 mark SVG/PNG files；本节点把它作为品牌资源目录记录，而不是可 import 的 npm package [I]。`mark.svg` 和 `mark-light.svg` 都是 512x512 viewBox 的 SVG mark，暗色版背景为 `#131010` 且主 path 为 white，亮色版背景为 `#FDFCFC` 且主 path 为 `#17181C` [E: packages/identity/mark.svg:1] [E: packages/identity/mark.svg:2] [E: packages/identity/mark.svg:4] [E: packages/identity/mark-light.svg:1] [E: packages/identity/mark-light.svg:2] [E: packages/identity/mark-light.svg:4]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/script/src/index.ts` | Bun version guard、channel/version derivation、team list assembly、`Script` export。 |
| `packages/script/package.json` | Package export 和 semver dependency。 |
| `.github/TEAM_MEMBERS` | Human team list，`Script.team` 会追加 bot identities。 |
| `packages/identity/mark.svg` | Dark mark SVG。 |
| `packages/identity/mark-light.svg` | Light mark SVG。 |
| `packages/opencode/script/build.ts` | Legacy opencode binary build consumer。 |
| `packages/opencode/script/publish.ts` | npm/Docker/AUR/Homebrew release consumer。 |
| `packages/cli/script/build.ts` | 新 lildax CLI host build consumer。 |

## Script 数据模型

`packages/script/src/index.ts` 先读取根 `package.json` 的 `packageManager`，取 `bun@...` 中的版本；缺失时抛 `packageManager field not found` [E: packages/script/src/index.ts:5] [E: packages/script/src/index.ts:6] [E: packages/script/src/index.ts:7] [E: packages/script/src/index.ts:10]。它把版本要求放宽成 caret range `^${expectedBunVersion}`，再用 `semver.satisfies(process.versions.bun, expectedBunVersionRange)` 校验当前 Bun 版本，不满足则 throw [E: packages/script/src/index.ts:14] [E: packages/script/src/index.ts:16] [E: packages/script/src/index.ts:17]。根 repo 当前 `packageManager` 是 `bun@1.3.14` [E: package.json:7]。

`env` 只读取四个变量：`OPENCODE_CHANNEL`、`OPENCODE_BUMP`、`OPENCODE_VERSION`、`OPENCODE_RELEASE` [E: packages/script/src/index.ts:21] [E: packages/script/src/index.ts:22] [E: packages/script/src/index.ts:23] [E: packages/script/src/index.ts:24]。`CHANNEL` 优先使用 `OPENCODE_CHANNEL`；如果设置了 `OPENCODE_BUMP`，channel 是 `latest`；如果设置了非 preview `OPENCODE_VERSION`，channel 也是 `latest`；否则取当前 git branch [E: packages/script/src/index.ts:27] [E: packages/script/src/index.ts:28] [E: packages/script/src/index.ts:29] [E: packages/script/src/index.ts:30]。`IS_PREVIEW` 是 `CHANNEL !== "latest"` [E: packages/script/src/index.ts:32]。

`VERSION` 优先使用 `OPENCODE_VERSION`；preview channel 生成 `0.0.0-${CHANNEL}-${timestamp}`；latest channel 会 fetch `https://registry.npmjs.org/opencode-ai/latest`，再按 `OPENCODE_BUMP=major|minor|否则 patch` 计算下一个 semver [E: packages/script/src/index.ts:35] [E: packages/script/src/index.ts:36] [E: packages/script/src/index.ts:37] [E: packages/script/src/index.ts:44] [E: packages/script/src/index.ts:45] [E: packages/script/src/index.ts:46] [E: packages/script/src/index.ts:47]。

`Script` export 是 getter object：`channel`、`version`、`preview`、`release`、`team` 分别返回已计算常量；`release` 是 `!!env.OPENCODE_RELEASE` [E: packages/script/src/index.ts:60] [E: packages/script/src/index.ts:61] [E: packages/script/src/index.ts:62] [E: packages/script/src/index.ts:64] [E: packages/script/src/index.ts:65] [E: packages/script/src/index.ts:67] [E: packages/script/src/index.ts:68] [E: packages/script/src/index.ts:70] [E: packages/script/src/index.ts:71] [E: packages/script/src/index.ts:73] [E: packages/script/src/index.ts:74]。

## Team identity

`Script.team` 从 `.github/TEAM_MEMBERS` 读取非空、非注释行，再追加 `actions-user`、`opencode`、`opencode-agent[bot]` 三个 bot id [E: packages/script/src/index.ts:50] [E: packages/script/src/index.ts:51] [E: packages/script/src/index.ts:53] [E: packages/script/src/index.ts:56] [E: packages/script/src/index.ts:57]。`.github/TEAM_MEMBERS` 当前列出 `adamdotdevin`、`Brendonovich`、`fwang`、`starptech` 等 username entries [E: .github/TEAM_MEMBERS:1] [E: .github/TEAM_MEMBERS:2] [E: .github/TEAM_MEMBERS:3] [E: .github/TEAM_MEMBERS:17]。

## 被主仓使用的位置

Legacy `packages/opencode/script/build.ts` import `Script`，用 `Script.channel` 构建 embedded Web UI，用 `Script.version` 写 Bun compile user-agent 和 `OPENCODE_VERSION` define，用 `Script.channel` 写 `OPENCODE_CHANNEL` define，并把每个 binary package version 设为 `Script.version` [E: packages/opencode/script/build.ts:17] [E: packages/opencode/script/build.ts:31] [E: packages/opencode/script/build.ts:184] [E: packages/opencode/script/build.ts:191] [E: packages/opencode/script/build.ts:195] [E: packages/opencode/script/build.ts:219]。

`packages/opencode/script/build.ts` 还在 `Script.release` 为真时打包 zip/tar.gz，并上传 GitHub release assets 到 `v${Script.version}` [E: packages/opencode/script/build.ts:232] [E: packages/opencode/script/build.ts:235] [E: packages/opencode/script/build.ts:237] [E: packages/opencode/script/build.ts:240]。`packages/opencode/script/publish.ts` 用 `Script.channel` 作为 npm dist-tag，用 `Script.preview` 决定是否跳过 Docker/AUR/Homebrew 发布；Docker tags 使用 dist binary package 的 `version` 和 `Script.channel`，AUR/Homebrew metadata 使用 `Script.version` 生成 release URL 与 formula version [E: packages/opencode/script/publish.ts:23] [E: packages/opencode/script/publish.ts:28] [E: packages/opencode/script/publish.ts:32] [E: packages/opencode/script/publish.ts:83] [E: packages/opencode/script/publish.ts:87] [E: packages/opencode/script/publish.ts:95] [E: packages/opencode/script/publish.ts:115] [E: packages/opencode/script/publish.ts:118] [E: packages/opencode/script/publish.ts:155] [E: packages/opencode/script/publish.ts:161] [E: packages/opencode/script/publish.ts:169] [E: packages/opencode/script/publish.ts:180] [E: packages/opencode/script/publish.ts:187]。

新 CLI host `packages/cli/script/build.ts` 同样 import `Script`，把 compile user-agent 设为 `lildax/${Script.version}`，并 define `OPENCODE_VERSION`、`OPENCODE_CHANNEL`、`OPENCODE_LIBC`，输出 package version 也是 `Script.version` [E: packages/cli/script/build.ts:7] [E: packages/cli/script/build.ts:13] [E: packages/cli/script/build.ts:86] [E: packages/cli/script/build.ts:90] [E: packages/cli/script/build.ts:93] [E: packages/cli/script/build.ts:94] [E: packages/cli/script/build.ts:115]。

## Identity resources

`packages/identity/mark.svg` 是暗色背景 mark；文件内嵌 nested SVG 和 style，主画布宽高均为 512 [E: packages/identity/mark.svg:1] [E: packages/identity/mark.svg:2] [E: packages/identity/mark.svg:5]。`packages/identity/mark-light.svg` 是亮色背景 mark，源码结构包含 rect background、center path、outer path [E: packages/identity/mark-light.svg:1] [E: packages/identity/mark-light.svg:2] [E: packages/identity/mark-light.svg:3] [E: packages/identity/mark-light.svg:4]。

源码搜索没有发现 `@opencode-ai/identity` package import，也没有发现 `packages/identity` 路径被 app/console/web 直接引用；这些 assets 更像发布/品牌素材源，而不是 runtime dependency [I]。

## 设计动机与权衡

`Script` 把 release identity 集中到一个 workspace package，避免 legacy opencode build、新 lildax CLI build、plugin/sdk publish、desktop prepare 各自重复计算 channel/version [I]。从源码看，legacy opencode build、opencode publish、lildax build 都直接 import `@opencode-ai/script` [E: packages/opencode/script/build.ts:17] [E: packages/opencode/script/publish.ts:4] [E: packages/cli/script/build.ts:7]。

`CHANNEL` fallback 到 git branch，使非 latest branch 自动进入 preview version `0.0.0-${branch}-${timestamp}`，这让 preview publish 不需要手动写 semver [E: packages/script/src/index.ts:30] [E: packages/script/src/index.ts:36]。当未显式设置 `OPENCODE_VERSION` 且 channel 是 latest 时，`VERSION` 计算依赖 npm registry 当前 `opencode-ai/latest` 版本，再 bump major/minor/patch；这意味着该路径需要网络访问 npm registry [E: packages/script/src/index.ts:35] [E: packages/script/src/index.ts:37] [E: packages/script/src/index.ts:42] [I]。

## Gotcha

- `Script` module 顶层可能 run `git branch --show-current` 或 fetch npm registry；这些路径受 env 分支影响，import 本身可能执行 I/O，不适合 hot path [E: packages/script/src/index.ts:26] [E: packages/script/src/index.ts:30] [E: packages/script/src/index.ts:34] [E: packages/script/src/index.ts:37] [I]。
- `release` 只看 `OPENCODE_RELEASE` 是否 truthy，不校验值内容；`OPENCODE_RELEASE=0` 也会让 `Script.release` 为 true [E: packages/script/src/index.ts:24] [E: packages/script/src/index.ts:71] [I]。
- `packages/identity` 的 PNG 文件尺寸来自文件 metadata，不在文本源码中；本节点只用 SVG 源码给出可核的结构事实 [I]。

## Sources

- `packages/script/src/index.ts`
- `packages/script/package.json`
- `package.json`
- `.github/TEAM_MEMBERS`
- `packages/opencode/script/build.ts`
- `packages/opencode/script/publish.ts`
- `packages/cli/script/build.ts`
- `packages/identity/mark.svg`
- `packages/identity/mark-light.svg`
- `packages/identity/`

## 相关

- `infra.native-binary-release`：binary build/publish 流程消费 `Script` 的 version/channel；本节点覆盖共享 identity helper 和品牌资源目录。
