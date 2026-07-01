---
id: persistence.installation
title: 安装与升级(version/channel/method)
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/installation/index.ts
  - packages/core/src/installation/version.ts
  - packages/core/src/database/database.ts
symbols:
  - Installation.Service
  - InstallationVersion
  - InstallationChannel
  - InstallationLocal
related:
  - infra.native-binary-release
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> 安装与升级节点覆盖 shared version/channel constants 和 V1 host 的 `@opencode/Installation` service；当前源码中升级检测与执行主要在 `packages/opencode/src/installation/index.ts`。

## 能回答的问题

- `InstallationVersion`、`InstallationChannel`、`InstallationLocal` 从哪里来。
- CLI user-agent 如何编码 channel/version/client。
- installation method 检测如何区分 curl、npm、bun、brew、scoop、choco。
- latest version 对不同 installer 查询哪些外部 API。
- upgrade 对每种 installer 执行哪些 command。

## 职责边界

`persistence.installation` 解释 version/channel/method/latest/upgrade。发布产物、installer script、native binary build 和 package managers 的发行流程属于 `subsystems/infra/native-binary-release`。

## Shared version constants

`packages/core/src/installation/version.ts` 声明 global compile-time constants `OPENCODE_VERSION` 与 `OPENCODE_CHANNEL`。[E: packages/core/src/installation/version.ts:1][E: packages/core/src/installation/version.ts:2][E: packages/core/src/installation/version.ts:3] `InstallationVersion` 和 `InstallationChannel` 在 runtime global 为 string 时取 global，否则 fallback 到 `"local"`；`InstallationLocal` 是 `InstallationChannel === "local"`。[E: packages/core/src/installation/version.ts:6][E: packages/core/src/installation/version.ts:7][E: packages/core/src/installation/version.ts:8]

这些 constants 被 core database path selection 使用：`InstallationChannel` 参与选择 `opencode.db` 或 channel-specific database 文件。[E: packages/core/src/database/database.ts:10][E: packages/core/src/database/database.ts:48][E: packages/core/src/database/database.ts:49][E: packages/core/src/database/database.ts:50][E: packages/core/src/database/database.ts:53][E: packages/core/src/database/database.ts:54]

## V1 Installation service

### 数据模型

| 实体 | 字段/行为 | 证据 |
| --- | --- | --- |
| `Method` | union 包含 `curl/npm/yarn/pnpm/bun/brew/scoop/choco/unknown`。 | [E: packages/opencode/src/installation/index.ts:18] |
| `ReleaseType` | union 是 `patch/minor/major`。 | [E: packages/opencode/src/installation/index.ts:20] |
| `Event` | Event definitions come from shared `InstallationEvent` schema and are re-exported as `Installation.Event`。 | [E: packages/opencode/src/installation/index.ts:16][E: packages/opencode/src/installation/index.ts:22] |
| `Info` | install info schema 包含 `version` 和 `latest`。 | [E: packages/opencode/src/installation/index.ts:35][E: packages/opencode/src/installation/index.ts:36][E: packages/opencode/src/installation/index.ts:37] |
| `Service` | service tag 是 `@opencode/Installation`，接口包括 `info/method/latest/upgrade`。 | [E: packages/opencode/src/installation/index.ts:75][E: packages/opencode/src/installation/index.ts:76][E: packages/opencode/src/installation/index.ts:77][E: packages/opencode/src/installation/index.ts:78][E: packages/opencode/src/installation/index.ts:79][E: packages/opencode/src/installation/index.ts:82] |
| `UpgradeFailedError` | tagged error `UpgradeFailedError`，携带 stderr，并把 `message` 映射到 stderr。 | [E: packages/opencode/src/installation/index.ts:55][E: packages/opencode/src/installation/index.ts:56][E: packages/opencode/src/installation/index.ts:58][E: packages/opencode/src/installation/index.ts:59] |

### Helper semantics

`getReleaseType(current, latest)` 比较 semver major/minor；major 增大返回 `"major"`，minor 增大返回 `"minor"`，否则返回 `"patch"`。[E: packages/opencode/src/installation/index.ts:24][E: packages/opencode/src/installation/index.ts:25][E: packages/opencode/src/installation/index.ts:26][E: packages/opencode/src/installation/index.ts:27][E: packages/opencode/src/installation/index.ts:28][E: packages/opencode/src/installation/index.ts:30][E: packages/opencode/src/installation/index.ts:31][E: packages/opencode/src/installation/index.ts:32] `userAgent(client = "cli")` 返回 `opencode/<channel>/<version>/<client>`；`USER_AGENT` 是默认 cli user-agent。[E: packages/opencode/src/installation/index.ts:41][E: packages/opencode/src/installation/index.ts:42][E: packages/opencode/src/installation/index.ts:45] `isPreview()` 是 channel 非 `latest`，`isLocal()` 是 channel 为 `local`。[E: packages/opencode/src/installation/index.ts:47][E: packages/opencode/src/installation/index.ts:48][E: packages/opencode/src/installation/index.ts:51][E: packages/opencode/src/installation/index.ts:52]

### Method detection 控制流

1. `method()` 如果 `process.execPath` 包含 `.opencode/bin` 或 `.local/bin`，直接判断为 `curl` install。[E: packages/opencode/src/installation/index.ts:174][E: packages/opencode/src/installation/index.ts:175][E: packages/opencode/src/installation/index.ts:176]
2. 其他情况取 lowercase `process.execPath`，构造 npm/yarn/pnpm/bun/brew/scoop/choco 检测 commands。[E: packages/opencode/src/installation/index.ts:177][E: packages/opencode/src/installation/index.ts:179][E: packages/opencode/src/installation/index.ts:180][E: packages/opencode/src/installation/index.ts:181][E: packages/opencode/src/installation/index.ts:182][E: packages/opencode/src/installation/index.ts:183][E: packages/opencode/src/installation/index.ts:184][E: packages/opencode/src/installation/index.ts:185][E: packages/opencode/src/installation/index.ts:186]
3. 检测列表按 exec path 是否包含 method name 排序，让当前执行路径命中的 package manager 先检查。[E: packages/opencode/src/installation/index.ts:189][E: packages/opencode/src/installation/index.ts:190][E: packages/opencode/src/installation/index.ts:191][E: packages/opencode/src/installation/index.ts:192][E: packages/opencode/src/installation/index.ts:193]
4. 每个 check command 输出包含 installed package name 时返回该 method；brew/choco/scoop 查 `opencode`，npm/yarn/pnpm/bun 查 `opencode-ai`。[E: packages/opencode/src/installation/index.ts:197][E: packages/opencode/src/installation/index.ts:198][E: packages/opencode/src/installation/index.ts:199][E: packages/opencode/src/installation/index.ts:200][E: packages/opencode/src/installation/index.ts:201][E: packages/opencode/src/installation/index.ts:202]
5. 没有命中时返回 `unknown`。[E: packages/opencode/src/installation/index.ts:206]

### Latest version 控制流

1. `info()` 返回当前 `InstallationVersion` 和 `latest()`。[E: packages/opencode/src/installation/index.ts:168][E: packages/opencode/src/installation/index.ts:170][E: packages/opencode/src/installation/index.ts:171]
2. `latest(method?)` 先使用传入 method，否则调用 `result.method()` 检测。[E: packages/opencode/src/installation/index.ts:208][E: packages/opencode/src/installation/index.ts:209]
3. brew latest：先判断 tap formula；tap formula 用 `brew info --json=v2`，core formula 用 `https://formulae.brew.sh/api/formula/opencode.json`。[E: packages/opencode/src/installation/index.ts:125][E: packages/opencode/src/installation/index.ts:126][E: packages/opencode/src/installation/index.ts:127][E: packages/opencode/src/installation/index.ts:128][E: packages/opencode/src/installation/index.ts:211][E: packages/opencode/src/installation/index.ts:212][E: packages/opencode/src/installation/index.ts:213][E: packages/opencode/src/installation/index.ts:214][E: packages/opencode/src/installation/index.ts:218][E: packages/opencode/src/installation/index.ts:219][E: packages/opencode/src/installation/index.ts:223][E: packages/opencode/src/installation/index.ts:224]
4. npm/bun/pnpm latest：请求 `${NpmConfig.registry(process.cwd())}/opencode-ai/${InstallationChannel}`，读取 package `version`。[E: packages/opencode/src/installation/index.ts:227][E: packages/opencode/src/installation/index.ts:228][E: packages/opencode/src/installation/index.ts:230][E: packages/opencode/src/installation/index.ts:233][E: packages/opencode/src/installation/index.ts:234]
5. choco latest：请求 Chocolatey OData package query，读取 `data.d.results[0].Version`。[E: packages/opencode/src/installation/index.ts:237][E: packages/opencode/src/installation/index.ts:238][E: packages/opencode/src/installation/index.ts:240][E: packages/opencode/src/installation/index.ts:243][E: packages/opencode/src/installation/index.ts:244]
6. scoop latest：读取 Scoop Main bucket `opencode.json`，返回 manifest `version`。[E: packages/opencode/src/installation/index.ts:247][E: packages/opencode/src/installation/index.ts:248][E: packages/opencode/src/installation/index.ts:250][E: packages/opencode/src/installation/index.ts:253][E: packages/opencode/src/installation/index.ts:254]
7. fallback latest：请求 GitHub latest release API，返回 `tag_name` 去掉前导 `v`。[E: packages/opencode/src/installation/index.ts:257][E: packages/opencode/src/installation/index.ts:258][E: packages/opencode/src/installation/index.ts:262][E: packages/opencode/src/installation/index.ts:263]

### Upgrade 控制流

1. `upgrade(m, target)` 根据 method switch 设置 `upgradeResult`。[E: packages/opencode/src/installation/index.ts:265][E: packages/opencode/src/installation/index.ts:267]
2. curl upgrade 下载 `https://opencode.ai/install`，选择 bash 或 sh，把 install script body 作为 stdin，并设置 env `VERSION: target`。[E: packages/opencode/src/installation/index.ts:145][E: packages/opencode/src/installation/index.ts:147][E: packages/opencode/src/installation/index.ts:148][E: packages/opencode/src/installation/index.ts:149][E: packages/opencode/src/installation/index.ts:150][E: packages/opencode/src/installation/index.ts:151][E: packages/opencode/src/installation/index.ts:153][E: packages/opencode/src/installation/index.ts:154]
3. npm/pnpm/bun 分别执行 global install `opencode-ai@<target>`。[E: packages/opencode/src/installation/index.ts:271][E: packages/opencode/src/installation/index.ts:272][E: packages/opencode/src/installation/index.ts:274][E: packages/opencode/src/installation/index.ts:275][E: packages/opencode/src/installation/index.ts:277][E: packages/opencode/src/installation/index.ts:278]
4. brew upgrade 先找 formula；tap formula 时 `brew tap anomalyco/tap`，再对 tap repo `git pull --ff-only`，最后 `brew upgrade <formula>`，并设置 `HOMEBREW_NO_AUTO_UPDATE=1`。[E: packages/opencode/src/installation/index.ts:280][E: packages/opencode/src/installation/index.ts:281][E: packages/opencode/src/installation/index.ts:282][E: packages/opencode/src/installation/index.ts:284][E: packages/opencode/src/installation/index.ts:289][E: packages/opencode/src/installation/index.ts:292][E: packages/opencode/src/installation/index.ts:299]
5. choco 执行 `choco upgrade opencode --version=<target> -y`。[E: packages/opencode/src/installation/index.ts:302][E: packages/opencode/src/installation/index.ts:303]
6. scoop 执行 `scoop install opencode@<target>`。[E: packages/opencode/src/installation/index.ts:305][E: packages/opencode/src/installation/index.ts:306]
7. unknown method 返回 `UpgradeFailedError("Unknown installation method: ...")`。[E: packages/opencode/src/installation/index.ts:308][E: packages/opencode/src/installation/index.ts:309]
8. result 缺失或 exit code 非 0 时返回 `UpgradeFailedError`；成功后 log，并运行当前 executable `--version`。[E: packages/opencode/src/installation/index.ts:311][E: packages/opencode/src/installation/index.ts:312][E: packages/opencode/src/installation/index.ts:314][E: packages/opencode/src/installation/index.ts:320]

## V1 / V2 对照

| 维度 | V1 host service | V2/shared core |
| --- | --- | --- |
| Version source | V1 `Installation` service imports version/channel constants and exposes `info/method/latest/upgrade`。[E: packages/opencode/src/installation/index.ts:14][E: packages/opencode/src/installation/index.ts:75][E: packages/opencode/src/installation/index.ts:76][E: packages/opencode/src/installation/index.ts:77][E: packages/opencode/src/installation/index.ts:78][E: packages/opencode/src/installation/index.ts:79] | core `installation/version.ts` defines compile-time/fallback constants。[E: packages/core/src/installation/version.ts:1][E: packages/core/src/installation/version.ts:6][E: packages/core/src/installation/version.ts:7][E: packages/core/src/installation/version.ts:8] |
| Events | V1 service imports shared `InstallationEvent` schema and exposes it as `Event`。[E: packages/opencode/src/installation/index.ts:16][E: packages/opencode/src/installation/index.ts:22] | `packages/core/src/installation/version.ts` is only the version constants file, not the upgrade service implementation。[E: packages/core/src/installation/version.ts:6][E: packages/core/src/installation/version.ts:7][I] |
| Upgrade execution | V1 service executes package manager commands through `AppProcess.Service` and `ChildProcess.make`。[E: packages/opencode/src/installation/index.ts:91][E: packages/opencode/src/installation/index.ts:95][E: packages/opencode/src/installation/index.ts:96][E: packages/opencode/src/installation/index.ts:109][E: packages/opencode/src/installation/index.ts:110] | No separate V2 upgrade service is defined in the checked `installation/version.ts` file。[E: packages/core/src/installation/version.ts:6][I] |

## 设计动机与 gotchas

- `InstallationChannel` also feeds database file selection: `latest/beta/prod` share `opencode.db`; channels outside that set get channel-specific DB files unless channel DB separation is disabled。[E: packages/core/src/database/database.ts:49][E: packages/core/src/database/database.ts:50][E: packages/core/src/database/database.ts:51][E: packages/core/src/database/database.ts:53][E: packages/core/src/database/database.ts:54]
- choco failure message is specialized: `upgradeFailure("choco")` returns “not running from an elevated command shell”，让 CLI 可以给 Windows admin shell 提示。[E: packages/opencode/src/installation/index.ts:133][E: packages/opencode/src/installation/index.ts:134][I]
- `Method` union includes `yarn` for detection, and method detection runs `yarn global list`; `upgrade()` switch has no explicit yarn case, so explicitly passing `"yarn"` reaches the default unknown-method failure。[E: packages/opencode/src/installation/index.ts:18][E: packages/opencode/src/installation/index.ts:181][E: packages/opencode/src/installation/index.ts:308][E: packages/opencode/src/installation/index.ts:309][I]

## Sources

- `packages/opencode/src/installation/index.ts`
- `packages/core/src/installation/version.ts`
- `packages/core/src/database/database.ts`

## 相关

- [原生二进制与发布](../infra/native-binary-release.md)
- [构建与 monorepo](../infra/build-monorepo.md)
